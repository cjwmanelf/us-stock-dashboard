import { quotesEnabled } from "@/lib/quotes";

/**
 * 종목 심볼 검색.
 * Finnhub 미국 종목 전체 목록(/stock/symbol)을 서버 메모리에 하루 1회 받아두고,
 * 검색은 메모리에서 필터링한다 → 매 요청마다 Finnhub 를 호출하지 않아 빠르다(~1ms).
 * 서버 전용 모듈 — STOCK_API_KEY 는 클라이언트에 노출되지 않는다.
 */

export type SymbolHit = {
  symbol: string;
  description: string; // 회사명
  type: string; // 예: "Common Stock", "ETP" 등
};

type IndexRow = SymbolHit & {
  su: string; // symbol 대문자 (매칭용)
  du: string; // description 대문자 (매칭용)
};

const FINNHUB_SYMBOLS =
  "https://finnhub.io/api/v1/stock/symbol?exchange=US";
const MAX_HITS = 10;
const TTL_MS = 86_400_000; // 24시간

/** 심볼 검색 API 사용 가능 여부 (시세와 동일한 키 사용) */
export function symbolsEnabled(): boolean {
  return quotesEnabled();
}

type RawSymbol = {
  description?: string;
  displaySymbol?: string;
  symbol?: string;
  type?: string;
};

// 프로세스(서버 인스턴스) 수명 동안 유지되는 워밍 캐시
let INDEX: IndexRow[] | null = null;
let SYMBOL_SET: Set<string> = new Set(); // 존재 확인용 (심볼 대문자)
let loadedAt = 0;
let inflight: Promise<IndexRow[]> | null = null;

async function loadIndex(): Promise<IndexRow[]> {
  const key = process.env.STOCK_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${FINNHUB_SYMBOLS}&token=${key}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows: RawSymbol[] = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => {
        const symbol = (r.symbol ?? r.displaySymbol ?? "").toUpperCase();
        const description = r.description ?? "";
        const type = r.type ?? "";
        return { symbol, description, type, su: symbol, du: description.toUpperCase() };
      })
      .filter((r) => r.symbol && r.type);
  } catch {
    return [];
  }
}

/** 메모리 인덱스를 반환(없거나 만료면 로드). 동시 요청은 한 번의 로드를 공유한다. */
async function getIndex(): Promise<IndexRow[]> {
  if (INDEX && Date.now() - loadedAt < TTL_MS) return INDEX;
  if (inflight) return inflight;
  inflight = loadIndex()
    .then((rows) => {
      if (rows.length) {
        INDEX = rows;
        SYMBOL_SET = new Set(rows.map((r) => r.su));
        loadedAt = Date.now();
      }
      inflight = null;
      return INDEX ?? rows;
    })
    .catch(() => {
      inflight = null;
      return INDEX ?? [];
    });
  return inflight;
}

/** 목록을 미리 데워둔다(페이지 로드 시 호출 → 첫 검색이 빠름). */
export async function warmSymbolIndex(): Promise<void> {
  await getIndex();
}

/**
 * 티커가 미국 종목 목록에 존재하는지.
 * - true: 존재함  - false: 존재하지 않음
 * - null: 목록을 확보하지 못함(키 없음·Finnhub 장애 등) → 호출측이 판단 보류(통과)해야 함
 */
export async function symbolIsKnown(ticker: string): Promise<boolean | null> {
  const index = await getIndex();
  if (index.length === 0) return null; // 목록 미확보 → 존재 여부 판단 불가
  return SYMBOL_SET.has(ticker.trim().toUpperCase());
}

// 정식 보통주를 레버리지 ETP 등보다 우선 노출
function typePriority(type: string): number {
  const t = type.toUpperCase();
  if (t === "COMMON STOCK") return 0;
  if (t.includes("ETF") || t.includes("ETP")) return 2;
  return 1;
}

/** 메모리 인덱스에서 검색어와 일치하는 상위 종목을 반환. */
export async function searchSymbols(query: string): Promise<SymbolHit[]> {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const index = await getIndex();
  if (index.length === 0) return [];

  // 관련도 tier(낮을수록 우선):
  // 0 정확 심볼 · 1 심볼 접두 · 2 회사명이 검색어로 시작 ·
  // 3 회사명 안의 한 단어가 검색어로 시작 · 4 심볼 포함 · 5 회사명 부분 포함
  const matched: { row: IndexRow; tier: number }[] = [];
  for (const row of index) {
    let tier = -1;
    if (row.su === q) tier = 0;
    else if (row.su.startsWith(q)) tier = 1;
    else if (row.du.startsWith(q)) tier = 2;
    else if (row.du.includes(" " + q)) tier = 3;
    else if (row.su.includes(q)) tier = 4;
    else if (row.du.includes(q)) tier = 5;
    if (tier >= 0) matched.push({ row, tier });
  }

  matched.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const tp = typePriority(a.row.type) - typePriority(b.row.type);
    if (tp !== 0) return tp;
    // 유명 종목은 대개 회사명이 가장 짧다 (예: "APPLE INC" < "APPLE ISPORT GROUP INC")
    if (a.row.description.length !== b.row.description.length)
      return a.row.description.length - b.row.description.length;
    if (a.row.symbol.length !== b.row.symbol.length)
      return a.row.symbol.length - b.row.symbol.length;
    return a.row.symbol < b.row.symbol ? -1 : 1;
  });

  return matched
    .slice(0, MAX_HITS)
    .map(({ row }) => ({ symbol: row.symbol, description: row.description, type: row.type }));
}
