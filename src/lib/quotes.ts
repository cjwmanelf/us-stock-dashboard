import { cache } from "react";

/**
 * 시세 조회 (Finnhub, 지연 시세).
 * 서버 전용 모듈 — STOCK_API_KEY 는 클라이언트에 노출되지 않는다.
 * 무료 한도 보호를 위해 fetch 에 15분(revalidate: 900) 캐시를 건다.
 */

export type Quote = {
  ticker: string;
  asOf?: string | null;
  price: number; // 현재가 (USD)
  prevClose: number | null; // 전일 종가
};

const FINNHUB_QUOTE = "https://finnhub.io/api/v1/quote";

/** 시세 API 키가 설정되어 있는지 */
export function quotesEnabled(): boolean {
  return !!process.env.STOCK_API_KEY;
}

// 같은 요청 안에서 동일 티커 중복 호출 방지 (React per-request 메모이제이션)
const fetchOne = cache(async (ticker: string): Promise<Quote | null> => {
  const key = process.env.STOCK_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `${FINNHUB_QUOTE}?symbol=${encodeURIComponent(ticker)}&token=${key}`,
      { next: { revalidate: 900 } }, // 15분 캐시 = 지연 시세
    );
    if (!res.ok) return null;

    const data: { c?: number; pc?: number; t?: number } = await res.json();
    // Finnhub 는 잘못된 티커에도 c=0 을 반환한다 → 0 이면 실패로 간주
    if (typeof data.c !== "number" || data.c === 0) return null;

    return {
      ticker,
      asOf: typeof data.t === "number" && data.t > 0 ? new Date(data.t * 1000).toISOString() : null,
      price: data.c,
      prevClose: typeof data.pc === "number" && data.pc > 0 ? data.pc : null,
    };
  } catch {
    return null;
  }
});

/** 여러 티커의 시세를 병렬 조회. 실패한 티커는 결과에서 빠진다. */
export async function getQuotes(
  tickers: string[],
): Promise<Record<string, Quote>> {
  const unique = [...new Set(tickers)];
  const results = await Promise.all(unique.map((t) => fetchOne(t)));

  const map: Record<string, Quote> = {};
  for (const q of results) {
    if (q) map[q.ticker] = q;
  }
  return map;
}
