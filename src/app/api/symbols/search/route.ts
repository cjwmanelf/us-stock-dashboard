import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchSymbols, warmSymbolIndex } from "@/lib/symbols";

/**
 * 티커 자동완성용 심볼 검색.
 * 클라이언트가 입력하는 대로 디바운스로 호출한다.
 * ?warm=1 이면 서버 메모리 목록만 데우고 빈 배열 반환(페이지 로드 시 프리페치용).
 * 인증 필수 — 열린 Finnhub 프록시가 되지 않도록 로그인한 사용자만 허용한다.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json([], { status: 401 });
  }

  if (request.nextUrl.searchParams.get("warm") === "1") {
    await warmSymbolIndex();
    return NextResponse.json([]);
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);

  const hits = await searchSymbols(q);
  return NextResponse.json(hits);
}
