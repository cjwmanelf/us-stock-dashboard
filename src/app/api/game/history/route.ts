import { withGameAuth, gameOptions, gameError } from "@/lib/game-api";
import { aggregateHistory, type HistoryRange } from "@/lib/history";
export const OPTIONS = gameOptions;
export const GET = withGameAuth(async (request, { db, userId }) => {
  const range = new URL(request.url).searchParams.get("range") ?? "day";
  if (!["day", "week", "month", "year"].includes(range)) return gameError(request, 400, "INVALID_QUERY", "Invalid history range");
  // Paginate explicitly: Supabase otherwise silently caps results at 1000.
  const rows: { date: string; usd: number; krw: number; fxRate: number }[] = [];
  let truncated = false;
  for (let offset = 0; offset <= 10000; offset += 1000) {
    const { data, error } = await db.from("portfolio_snapshots").select("snapshot_date,total_usd,total_krw,fx_rate")
      .eq("user_id", userId).order("snapshot_date", { ascending: false }).range(offset, offset + (offset === 10000 ? 0 : 999));
    if (error) throw new Error("History unavailable");
    if (offset === 10000) { truncated = !!data?.length; break; }
    for (const s of data ?? []) rows.push({ date: s.snapshot_date, usd: Number(s.total_usd), krw: Number(s.total_krw), fxRate: Number(s.fx_rate) });
    if (!data || data.length < 1000) break;
  }
  return { asOf: new Date().toISOString(), range, points: aggregateHistory(rows.reverse(), range as HistoryRange), truncated };
});
