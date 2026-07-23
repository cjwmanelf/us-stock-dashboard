import { cache } from "react";

/**
 * 관심/보유 종목의 소식 피드.
 * - 뉴스: Finnhub company-news (STOCK_API_KEY) + Tiingo news (TIINGO_API_KEY, 선택)
 * - 공시: SEC EDGAR (공식, 키 불필요, User-Agent 필요)
 * - 실적: Finnhub earnings calendar (예정 실적) + stock/earnings (발표된 분기 실적 결과)
 * 서버 전용 모듈.
 */

export type FeedType = "news" | "filing" | "earnings";

export type FeedItem = {
  id: string;
  ticker: string;
  type: FeedType;
  title: string;
  url: string | null;
  source: string;
  timestamp: number; // 정렬용 (ms)
  dateLabel: string; // 표시용 (YYYY-MM-DD)
  sentiment?: number | null; // -1(부정) ~ 1(긍정), 뉴스에만 (Marketaux)
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 표시용 날짜(YYYY-MM-DD)를 한국시간(KST) 기준으로 포맷.
// UTC 로 찍으면 한국 기준 오늘 새벽 뉴스가 어제로 보이므로 표시 라벨은 KST 로 맞춘다.
const ymdSeoul = (ms: number): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(ms),
  );

const secHeaders = () => ({
  "User-Agent":
    process.env.SEC_USER_AGENT ?? "us-stock-dashboard example@example.com",
});

// 소스별 최대 대기 시간(ms). 넘으면 해당 소스는 건너뛰고 받은 것부터 표시.
const FEED_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------
// 뉴스 (Finnhub company-news)
// ---------------------------------------------------------------------
const getNews = cache(async (ticker: string): Promise<FeedItem[]> => {
  const key = process.env.STOCK_API_KEY;
  if (!key) return [];

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
        ticker,
      )}&from=${ymd(from)}&to=${ymd(now)}&token=${key}`,
      {
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      }, // 30분
    );
    if (!res.ok) return [];

    const data: Array<{
      headline?: string;
      source?: string;
      datetime?: number;
      url?: string;
      id?: number;
    }> = await res.json();

    return data
      .filter((a) => a.headline && a.datetime)
      .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0))
      .slice(0, 5)
      .map((a) => ({
        id: `n-${ticker}-${a.id ?? a.datetime}`,
        ticker,
        type: "news" as const,
        title: a.headline!,
        url: a.url ?? null,
        source: a.source ?? "News",
        timestamp: (a.datetime ?? 0) * 1000,
        dateLabel: ymdSeoul((a.datetime ?? 0) * 1000),
      }));
  } catch {
    return [];
  }
});

// ---------------------------------------------------------------------
// 뉴스 (Marketaux) - 선택 소스 (MARKETAUX_API_KEY 있을 때만), 감성점수 포함
// 무료 티어: 100회/일, 요청당 기사 3건.
// ---------------------------------------------------------------------
const getMarketauxNews = cache(async (ticker: string): Promise<FeedItem[]> => {
  const key = process.env.MARKETAUX_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://api.marketaux.com/v1/news/all?symbols=${encodeURIComponent(
        ticker,
      )}&filter_entities=true&language=en&limit=3&api_token=${key}`,
      {
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      }, // 30분
    );
    if (!res.ok) return []; // 401/402(한도)/403 등이면 빈 결과

    const data: {
      data?: Array<{
        uuid?: string;
        title?: string;
        url?: string;
        source?: string;
        published_at?: string;
        entities?: Array<{ symbol?: string; sentiment_score?: number | null }>;
      }>;
    } = await res.json();

    const list = data.data ?? [];
    return list
      .filter((a) => a.title && a.published_at)
      .map((a) => {
        // 이 종목에 해당하는 감성점수 우선, 없으면 첫 엔티티
        const ent =
          a.entities?.find(
            (e) => e.symbol?.toUpperCase() === ticker.toUpperCase(),
          ) ?? a.entities?.[0];
        return {
          id: `mx-${ticker}-${a.uuid ?? a.published_at}`,
          ticker,
          type: "news" as const,
          title: a.title!,
          url: a.url ?? null,
          source: a.source ?? "Marketaux",
          timestamp: Date.parse(a.published_at!),
          dateLabel: ymdSeoul(Date.parse(a.published_at!)),
          sentiment: ent?.sentiment_score ?? null,
        };
      });
  } catch {
    return [];
  }
});

// ---------------------------------------------------------------------
// 공시 (SEC EDGAR)
// ---------------------------------------------------------------------

// ticker -> CIK(10자리) 맵. 하루 1회 갱신.
const getCikMap = cache(async (): Promise<Record<string, string>> => {
  try {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: secHeaders(),
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!res.ok) return {};
    const data: Record<string, { cik_str: number; ticker: string }> =
      await res.json();
    const map: Record<string, string> = {};
    for (const k in data) {
      const e = data[k];
      map[e.ticker.toUpperCase()] = String(e.cik_str).padStart(10, "0");
    }
    return map;
  } catch {
    return {};
  }
});

// 공식 발표에 해당하는 주요 서식만 (내부자거래 Form 4 등 노이즈 제외)
const FILING_LABELS: Record<string, string> = {
  "8-K": "주요사항보고 (8-K)",
  "8-K/A": "주요사항보고 정정 (8-K/A)",
  "10-Q": "분기보고서 (10-Q)",
  "10-K": "연간보고서 (10-K)",
  "6-K": "외국기업 보고 (6-K)",
  "20-F": "연간보고서 (20-F)",
  "40-F": "연간보고서 (40-F)",
  "DEF 14A": "주주총회 안내 (DEF 14A)",
};

const getFilings = cache(async (ticker: string): Promise<FeedItem[]> => {
  const cikMap = await getCikMap();
  const cik = cikMap[ticker.toUpperCase()];
  if (!cik) return [];

  try {
    const res = await fetch(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      {
        headers: secHeaders(),
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      },
    );
    if (!res.ok) return [];

    const data: {
      filings?: {
        recent?: {
          form: string[];
          filingDate: string[];
          accessionNumber: string[];
          primaryDocument: string[];
        };
      };
    } = await res.json();

    const r = data.filings?.recent;
    if (!r) return [];

    const cikInt = String(parseInt(cik, 10));
    const out: FeedItem[] = [];
    for (let i = 0; i < r.form.length && out.length < 5; i++) {
      const form = r.form[i];
      const label = FILING_LABELS[form];
      if (!label) continue; // 주요 서식만

      const accn = r.accessionNumber[i];
      const accnNo = accn.replace(/-/g, "");
      const doc = r.primaryDocument[i];
      const url = doc
        ? `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accnNo}/${doc}`
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`;
      const date = r.filingDate[i];

      out.push({
        id: `f-${accn}`,
        ticker,
        type: "filing",
        title: label,
        url,
        source: "SEC EDGAR",
        timestamp: Date.parse(date),
        dateLabel: date,
      });
    }
    return out;
  } catch {
    return [];
  }
});

// ---------------------------------------------------------------------
// 실적 (Finnhub earnings calendar) - 예정 실적
// ---------------------------------------------------------------------
const getEarnings = cache(async (ticker: string): Promise<FeedItem[]> => {
  const key = process.env.STOCK_API_KEY;
  if (!key) return [];

  const now = new Date();
  const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${ymd(now)}&to=${ymd(
        to,
      )}&symbol=${encodeURIComponent(ticker)}&token=${key}`,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      },
    );
    if (!res.ok) return [];

    const data: {
      earningsCalendar?: Array<{
        date: string;
        quarter?: number;
        year?: number;
        epsEstimate?: number | null;
      }>;
    } = await res.json();

    const list = data.earningsCalendar ?? [];
    return list.slice(0, 2).map((e) => ({
      id: `e-${ticker}-${e.date}`,
      ticker,
      type: "earnings" as const,
      title: `실적 발표 예정 (Q${e.quarter ?? "?"} ${e.year ?? ""}${
        e.epsEstimate != null ? `, EPS 예상 $${e.epsEstimate.toFixed(2)}` : ""
      })`,
      url: null,
      source: "Finnhub",
      timestamp: Date.parse(e.date),
      dateLabel: e.date,
    }));
  } catch {
    return [];
  }
});

// ---------------------------------------------------------------------
// 실적 (Finnhub stock/earnings) - 발표된 분기 실적 결과
// ---------------------------------------------------------------------
const getReportedEarnings = cache(async (ticker: string): Promise<FeedItem[]> => {
  const key = process.env.STOCK_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(
        ticker,
      )}&token=${key}`,
      {
        next: { revalidate: 21600 }, // 6시간
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      },
    );
    if (!res.ok) return [];

    const data: Array<{
      actual?: number | null;
      estimate?: number | null;
      period?: string;
      quarter?: number;
      year?: number;
      surprisePercent?: number | null;
    }> = await res.json();

    if (!Array.isArray(data)) return [];

    return data
      .filter((e) => e.period && e.actual != null)
      .slice(0, 4) // 최근 4개 분기
      .map((e) => {
        const parts: string[] = [`EPS $${e.actual!.toFixed(2)}`];
        if (e.estimate != null) parts.push(`예상 $${e.estimate.toFixed(2)}`);
        if (e.surprisePercent != null) {
          const s = e.surprisePercent;
          parts.push(`서프라이즈 ${s >= 0 ? "+" : ""}${s.toFixed(1)}%`);
        }
        return {
          id: `er-${ticker}-${e.period}`,
          ticker,
          type: "earnings" as const,
          title: `Q${e.quarter ?? "?"} ${e.year ?? ""} 실적 발표: ${parts.join(
            ", ",
          )}`,
          url: null,
          source: "Finnhub",
          timestamp: Date.parse(e.period!),
          dateLabel: e.period!,
        };
      });
  } catch {
    return [];
  }
});

// ---------------------------------------------------------------------
// 통합 피드
// ---------------------------------------------------------------------
export function feedEnabled(): boolean {
  return !!process.env.STOCK_API_KEY; // 뉴스·실적용 (공시는 키 불필요)
}

// ---------------------------------------------------------------------
// 증시 헤드라인 - 매체별 주요/최신 뉴스. 종목과 무관.
//   CNBC · Bloomberg : 공식 Top/Markets RSS (편집국 주요뉴스)
//   Reuters          : 공개 Top 피드가 없어 Finnhub 일반뉴스 최신 5개
// ---------------------------------------------------------------------
export type MarketNewsGroup = { source: string; label: string; items: FeedItem[] };

const HEADLINES_PER_SOURCE = 5;
const RSS_UA = "Mozilla/5.0 (compatible; modu-rich/1.0)";

const CNBC_TOP_RSS = "https://www.cnbc.com/id/100003114/device/rss/rss.html";
const BLOOMBERG_MARKETS_RSS = "https://feeds.bloomberg.com/markets/news.rss";

// RSS 엔티티(&amp; &#39; &#x2019; 등) 디코드
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// 간단 RSS 2.0 파서 (<item> 의 title/link/pubDate 추출)
function parseRss(
  xml: string,
  max: number,
): { title: string; url: string | null; ts: number }[] {
  const blocks = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].map((m) => m[0]);
  const pick = (block: string, tag: string): string => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    if (!m) return "";
    return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  };
  const out: { title: string; url: string | null; ts: number }[] = [];
  for (const block of blocks) {
    const title = decodeEntities(pick(block, "title"));
    if (!title) continue;
    const url = pick(block, "link") || pick(block, "guid") || null;
    const pub = pick(block, "pubDate");
    const ts = pub ? Date.parse(pub) : 0;
    out.push({ title, url: url || null, ts });
    if (out.length >= max) break;
  }
  return out;
}

async function fetchRssHeadlines(url: string, source: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 900 }, // 15분 캐시
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      headers: { "User-Agent": RSS_UA },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, HEADLINES_PER_SOURCE).map((it, i) => ({
      id: `rss-${source}-${it.ts || i}-${i}`,
      ticker: "",
      type: "news" as const,
      title: it.title,
      url: it.url,
      source,
      timestamp: it.ts || 0,
      dateLabel: it.ts ? ymdSeoul(it.ts) : "",
    }));
  } catch {
    return [];
  }
}

// Reuters: 공개 Top 피드가 없어 Finnhub 일반뉴스에서 최신 5개
async function fetchFinnhubHeadlines(source: string): Promise<FeedItem[]> {
  const key = process.env.STOCK_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { next: { revalidate: 900 }, signal: AbortSignal.timeout(FEED_TIMEOUT_MS) },
    );
    if (!res.ok) return [];
    const data: Array<{
      id?: number;
      headline?: string;
      source?: string;
      datetime?: number;
      url?: string;
    }> = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (a) =>
          a.headline &&
          a.datetime &&
          (a.source ?? "").toUpperCase() === source.toUpperCase(),
      )
      .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0))
      .slice(0, HEADLINES_PER_SOURCE)
      .map((a) => ({
        id: `mkt-${source}-${a.id ?? a.datetime}`,
        ticker: "",
        type: "news" as const,
        title: a.headline!,
        url: a.url ?? null,
        source,
        timestamp: (a.datetime ?? 0) * 1000,
        dateLabel: ymdSeoul((a.datetime ?? 0) * 1000),
      }));
  } catch {
    return [];
  }
}

export const getMarketHeadlines = cache(
  async (): Promise<MarketNewsGroup[]> => {
    const [cnbc, reuters, bloomberg] = await Promise.all([
      fetchRssHeadlines(CNBC_TOP_RSS, "CNBC"),
      fetchFinnhubHeadlines("Reuters"),
      fetchRssHeadlines(BLOOMBERG_MARKETS_RSS, "Bloomberg"),
    ]);
    return [
      { source: "CNBC", label: "주요뉴스", items: cnbc },
      { source: "Reuters", label: "최신 뉴스", items: reuters },
      { source: "Bloomberg", label: "주요뉴스", items: bloomberg },
    ].filter((g) => g.items.length > 0);
  },
);

const MAX_TICKERS = 15;

export async function getFeed(
  tickers: string[],
  filter?: FeedType,
): Promise<FeedItem[]> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))].slice(
    0,
    MAX_TICKERS,
  );

  const perTicker = await Promise.all(
    unique.map(async (t) => {
      const [news, marketauxNews, filings, earnings, reportedEarnings] =
        await Promise.all([
          getNews(t),
          getMarketauxNews(t),
          getFilings(t),
          getEarnings(t),
          getReportedEarnings(t),
        ]);
      return [
        ...news,
        ...marketauxNews,
        ...filings,
        ...earnings,
        ...reportedEarnings,
      ];
    }),
  );

  let all = perTicker.flat();

  // 뉴스는 Finnhub·Tiingo가 같은 기사를 줄 수 있어 URL로 중복 제거
  const seenUrls = new Set<string>();
  all = all.filter((i) => {
    if (i.type !== "news" || !i.url) return true;
    const u = i.url.split("?")[0]; // 쿼리스트링 무시
    if (seenUrls.has(u)) return false;
    seenUrls.add(u);
    return true;
  });

  if (filter) all = all.filter((i) => i.type === filter);
  all.sort((a, b) => b.timestamp - a.timestamp);
  return all;
}
