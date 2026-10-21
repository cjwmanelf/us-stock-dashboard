import { withGameAuth, gameOptions, gameError } from "@/lib/game-api";
import { getFeed, getMarketHeadlines, type FeedItem } from "@/lib/feed";
export const OPTIONS = gameOptions;
const serialize = (item: FeedItem) => ({ ...item, publishedAt: new Date(item.timestamp).toISOString() });
export const GET = withGameAuth(async (request, { db, userId }) => {
  const tab = new URL(request.url).searchParams.get("tab") ?? "watchlist";
  if (tab !== "watchlist" && tab !== "market") return gameError(request, 400, "INVALID_QUERY", "Invalid feed tab");
  if (tab === "market") return { asOf: new Date().toISOString(), tab, items: [],
    groups: (await getMarketHeadlines()).map(g => ({ ...g, items: g.items.map(serialize) })) };
  const results = await Promise.all(["holdings", "watchlist"].map(table => db.from(table).select("ticker").eq("user_id", userId)));
  if (results.some(r => r.error)) throw new Error("Watchlist unavailable");
  const tickers = [...new Set(results.flatMap(r => (r.data ?? []).map(h => String(h.ticker))))];
  return { asOf: new Date().toISOString(), tab, items: tickers.length ? (await getFeed(tickers)).map(serialize) : [], groups: [] };
});
