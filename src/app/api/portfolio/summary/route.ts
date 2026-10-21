import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotes, quotesEnabled } from "@/lib/quotes";
import { getUsdKrwRate } from "@/lib/fx";
import { computePortfolio } from "@/lib/portfolio";
import type { Holding } from "@/lib/types";

/**
 * 포트폴리오 **읽기 전용** 요약.
 *
 * `/portfolio` 페이지가 화면에 그리는 것과 같은 계산(computePortfolio)을 JSON 으로
 * 내보낸다. 화면을 긁는 대신 같은 함수를 부르므로 숫자가 갈라지지 않는다.
 *
 * ■ 왜 필요한가
 *   2nd village(마을 셸)의 금고 건물이 이 요약을 읽어, 상주 NPC 가 실제 수치로
 *   논평한다. 마을은 iframe 안(교차 오리진)을 들여다볼 수 없으므로 읽을 창구가
 *   하나 필요했다.
 *
 * ■ 질의 변수
 *   `?history=1`   자산추이(portfolio_snapshots)를 함께 준다.
 *   `?snapshot=1`  오늘 자 스냅샷을 기록한다 — `/dashboard` 페이지를 여는 것과
 *                  **같은 동작**이다. 그 페이지는 방문할 때마다 하루 1건을
 *                  upsert 하는데, 마을 금고가 대시보드를 대신 보게 되면서
 *                  원본을 안 열면 추이가 더 이상 쌓이지 않는 문제가 생겼다.
 *                  기본값은 꺼짐이라, 변수를 주지 않으면 이 라우트는 읽기 전용이다.
 *
 * ■ 안전
 *   - 인증 필수. 로그인하지 않으면 401 이고, 응답에 남의 데이터가 섞일 길이 없다
 *     (Supabase RLS + 세션 쿠키 기준으로 자기 행만 읽는다).
 *   - 쓰기는 오늘 자 스냅샷 upsert 하나뿐이고 `?snapshot=1` 일 때만 한다.
 *     보유 종목은 이 라우트로 절대 바뀌지 않는다.
 *   - 종목 단위 원본 행(수량·매수단가)은 내보내지 않는다. 합계와 순위만 준다.
 *
 * 마을은 같은 호스트(127.0.0.1)의 다른 포트에서 부르며, 쿠키는 포트를 구분하지
 * 않으므로 세션이 그대로 실려 온다. 호스트명이 달라지면(localhost) 끊긴다.
 */
export async function GET(request: NextRequest) {
  const wantHistory = request.nextUrl.searchParams.get("history") === "1";
  const wantSnapshot = request.nextUrl.searchParams.get("snapshot") === "1";

  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!configured) {
    return privateJson(
      { authenticated: false, configured: false },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson(
      { authenticated: false, configured: true },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("holdings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return privateJson(
      { authenticated: true, configured: true, error: "Portfolio unavailable" },
      { status: 500 },
    );
  }

  const holdings = (data ?? []) as Holding[];
  const [quotes, fx] = await Promise.all([
    getQuotes(holdings.map((h) => h.ticker)),
    getUsdKrwRate(),
  ]);
  const totals = computePortfolio(holdings, quotes, fx?.rate ?? null);

  // 순위는 시세를 구한 종목만 — 값이 없는 행이 0 으로 섞여 순위를 흐리지 않게 한다
  const valued = totals.rows.filter((r) => r.gainPct !== null);
  const byGain = [...valued].sort((a, b) => (b.gainPct ?? 0) - (a.gainPct ?? 0));

  const positions = byGain.map((r) => ({
    ticker: r.holding.ticker,
    gain: r.gain,
    gainPct: r.gainPct,
    /** 평가금액 비중(%) — 한 종목에 쏠려 있는지 보는 용도 */
    weightPct:
      totals.totalValue > 0 && r.value !== null
        ? (r.value / totals.totalValue) * 100
        : null,
    /** 비중 도넛이 쓰는 절대 금액. 시세가 없으면 매수금액으로 대신한다 */
    value: r.value ?? r.cost,
  }));

  // 추이 기록 — `/dashboard` 와 같은 조건(전 종목 평가 + 환율)일 때만 하루 1건
  const showValue = quotesEnabled() && totals.valuedAll;
  if (wantSnapshot && showValue && fx) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("portfolio_snapshots").upsert(
      {
        user_id: user.id,
        snapshot_date: today,
        total_usd: Math.round(totals.totalValue * 100) / 100,
        total_krw: Math.round(totals.totalValue * fx.rate * 100) / 100,
        fx_rate: fx.rate,
      },
      { onConflict: "user_id,snapshot_date" },
    );
  }

  let history: { date: string; krw: number }[] | undefined;
  if (wantHistory) {
    const { data: snaps } = await supabase
      .from("portfolio_snapshots")
      .select("snapshot_date,total_krw")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true });
    history = ((snaps ?? []) as { snapshot_date: string; total_krw: number }[]).map(
      (s) => ({ date: s.snapshot_date, krw: Number(s.total_krw) }),
    );
  }

  return privateJson({
    authenticated: true,
    configured: true,
    quotesEnabled: quotesEnabled(),
    asOf: new Date().toISOString(),
    fx: fx ? { rate: fx.rate, date: fx.date } : null,
    counts: {
      holdings: holdings.length,
      valued: valued.length,
      /** 시세를 못 구한 종목 수 — NPC 가 "숫자가 덜 찼다"고 말할 근거 */
      unvalued: holdings.length - valued.length,
    },
    totals: {
      cost: totals.totalCost,
      value: totals.totalValue,
      gain: totals.totalGain,
      gainPct: totals.totalGainPct,
      dayChange: totals.dayChange,
      dayChangePct: totals.dayChangePct,
      dayChangeAvailable: totals.dayChangeAvailable,
      valuedAll: totals.valuedAll,
    },
    krw: {
      stockGain: totals.totalStockGainKrw,
      fxGain: totals.totalFxGainKrw,
      totalGain: totals.totalGainKrw,
      breakdownAvailable: totals.fxBreakdownAvailable,
      missingFxTickers: totals.missingFxTickers,
    },
    positions,
    ...(history ? { history } : {}),
  });
}

// Keep the existing cookie/snapshot contract; never cache personal responses.
function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
