import { withGameAuth, gameOptions } from "@/lib/game-api";
import { getQuotes } from "@/lib/quotes";
import { getUsdKrwRate } from "@/lib/fx";
import { computePortfolio } from "@/lib/portfolio";
import type { Holding } from "@/lib/types";
export const OPTIONS = gameOptions;
export const GET = withGameAuth(async (_request, { db, userId }) => {
  const { data, error } = await db.from("holdings").select("*").eq("user_id", userId).order("created_at");
  if (error) throw new Error("Holdings unavailable");
  const holdings = (data ?? []) as Holding[];
  const [quotes, fx] = await Promise.all([getQuotes(holdings.map(h => h.ticker)), getUsdKrwRate()]);
  const t = computePortfolio(holdings, quotes, fx?.rate);
  const times = Object.values(quotes).map(q => q.asOf).filter((s): s is string => !!s).sort();
  return {
    asOf: new Date().toISOString(), quoteAsOf: holdings.every(h => !!quotes[h.ticker]?.asOf) ? times[0] ?? null : null,
    quoteCacheSeconds: 900, delayed: true, fx,
    totals: {
      totalUsd: t.valuedAll ? t.totalValue : null,
      totalKrw: t.valuedAll && fx ? t.totalValue * fx.rate : null,
      costUsd: t.totalCost, gainUsd: t.valuedAll ? t.totalGain : null, gainPct: t.valuedAll ? t.totalGainPct : null,
      dayChangeUsd: t.dayChangeAvailable ? t.dayChange : null, dayChangePct: t.dayChangeAvailable ? t.dayChangePct : null,
      stockGainKrw: t.fxBreakdownAvailable ? t.totalStockGainKrw : null,
      fxGainKrw: t.fxBreakdownAvailable ? t.totalFxGainKrw : null,
      gainKrw: t.fxBreakdownAvailable ? t.totalGainKrw : null,
      valuedAll: t.valuedAll, dayChangeAvailable: t.dayChangeAvailable, fxBreakdownAvailable: t.fxBreakdownAvailable,
    },
    holdings: t.rows.map(r => ({ ticker: r.holding.ticker, quantity: r.holding.quantity,
      avgPrice: r.holding.avg_price, price: r.price, valueUsd: r.value, gainUsd: r.gain, gainPct: r.gainPct,
      weightPct: t.valuedAll && t.totalValue > 0 && r.value !== null ? r.value / t.totalValue * 100 : null,
      quoteAsOf: quotes[r.holding.ticker]?.asOf ?? null,
    })),
  };
});
