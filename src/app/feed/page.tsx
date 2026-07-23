import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WatchlistManager } from "@/components/WatchlistManager";
import { FeedList } from "@/components/FeedList";
import { MarketNewsList } from "@/components/MarketNewsList";
import {
  getFeed,
  getMarketHeadlines,
  feedEnabled,
  type FeedType,
} from "@/lib/feed";

const TABS: { key: FeedType | "all" | "market"; label: string; href: string }[] =
  [
    { key: "all", label: "전체", href: "/feed" },
    { key: "news", label: "뉴스", href: "/feed?type=news" },
    { key: "filing", label: "공시", href: "/feed?type=filing" },
    { key: "earnings", label: "실적", href: "/feed?type=earnings" },
    { key: "market", label: "증시뉴스", href: "/feed?type=market" },
  ];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">관심 &amp; 소식</h1>
      <p className="mt-2 text-sm text-muted">
        보유·관심 종목의 뉴스 · 공시 · 실적 일정을 원문 그대로 모아 보여줍니다.
      </p>
      <div className="mt-6 space-y-5">{children}</div>
    </main>
  );
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configured) {
    return (
      <Shell>
        <p className="text-sm text-muted">Supabase 설정이 필요합니다.</p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Shell>
        <p className="text-sm text-muted">로그인이 필요합니다.</p>
      </Shell>
    );
  }

  const [{ data: holdingsData }, { data: watchData }] = await Promise.all([
    supabase.from("holdings").select("ticker"),
    supabase.from("watchlist").select("ticker"),
  ]);

  const held = [
    ...new Set(
      ((holdingsData ?? []) as { ticker: string }[]).map((h) => h.ticker),
    ),
  ];
  const watch = ((watchData ?? []) as { ticker: string }[]).map((w) => w.ticker);
  const tickers = [...new Set([...held, ...watch])];

  const sp = await searchParams;
  const rawType = sp.type;
  const isMarket = rawType === "market";
  const filter: FeedType | undefined =
    rawType === "news" || rawType === "filing" || rawType === "earnings"
      ? rawType
      : undefined;

  // 증시뉴스 탭은 보유 종목과 무관하게 소스별 헤드라인을 보여준다.
  const marketGroups = isMarket ? await getMarketHeadlines() : [];
  // 소스별 5초 타임아웃(feed.ts) → 느린 소스는 건너뛰고 받은 것부터. 최대 ~5초 내 반환.
  const items =
    !isMarket && tickers.length > 0 ? await getFeed(tickers, filter) : [];

  return (
    <Shell>
      <WatchlistManager held={held} watch={watch} />

      {!feedEnabled() && (
        <p className="text-xs text-amber-600">
          ※ 뉴스·실적은 시세 API 키(STOCK_API_KEY)가 있어야 표시됩니다. 공시는 키
          없이 표시됩니다.
        </p>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-1 border-b border-line text-sm">
        {TABS.map((tab) => {
          const active =
            (tab.key === "all" && !filter && !isMarket) ||
            (tab.key === "market" && isMarket) ||
            tab.key === filter;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`-mb-px border-b-2 px-3 py-2 ${
                active
                  ? "border-brand font-medium text-brand"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {isMarket ? (
        <MarketNewsList groups={marketGroups} />
      ) : tickers.length === 0 ? (
        <div className="themed rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
          보유·관심 종목을 추가하면 소식이 여기에 표시됩니다.
        </div>
      ) : (
        <FeedList items={items} />
      )}
    </Shell>
  );
}
