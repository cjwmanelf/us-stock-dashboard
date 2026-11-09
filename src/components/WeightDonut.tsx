import type { HoldingRow } from "@/lib/portfolio";
import { formatUSD } from "@/lib/format";

// 검증된 카테고리 팔레트(고정 순서, CVD 안전). 9번째부터는 "기타"로 묶는다.
const SLOTS = 8;

type Slice = {
  label: string;
  amount: number;
  pct: number;
  colorVar: string;
};

export function WeightDonut({ rows }: { rows: HoldingRow[] }) {
  // 티커별로 평가금액(없으면 매수금액) 합산
  const byTicker = new Map<string, number>();
  for (const r of rows) {
    const amount = r.value ?? r.cost;
    byTicker.set(r.holding.ticker, (byTicker.get(r.holding.ticker) ?? 0) + amount);
  }

  const sorted = [...byTicker.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const total = sorted.reduce((s, x) => s + x.amount, 0);
  if (total <= 0) return null;

  // 상위 8개 + 나머지는 "기타"
  const top = sorted.slice(0, SLOTS);
  const rest = sorted.slice(SLOTS);
  const restAmount = rest.reduce((s, x) => s + x.amount, 0);

  const slices: Slice[] = top.map((x, i) => ({
    label: x.label,
    amount: x.amount,
    pct: (x.amount / total) * 100,
    colorVar: `var(--s${i + 1})`,
  }));
  if (restAmount > 0) {
    slices.push({
      label: "기타",
      amount: restAmount,
      pct: (restAmount / total) * 100,
      colorVar: "var(--s-other)",
    });
  }

  // 도넛 기하
  const r = 64;
  const C = 2 * Math.PI * r;
  const gap = 2; // 조각 사이 간격(px)
  const arcs = slices.map((s, index) => {
    const precedingAmount = slices.slice(0, index).reduce((sum, slice) => sum + slice.amount, 0);
    const full = (s.amount / total) * C;
    const visible = Math.max(full - gap, 0.75);
    const arc = {
      ...s,
      dasharray: `${visible} ${C - visible}`,
      offset: -(precedingAmount / total) * C,
    };
    return arc;
  });

  return (
    <div className="viz-donut themed rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <style>{`
        .viz-donut{--s1:#2a78d6;--s2:#1baf7a;--s3:#eda100;--s4:#008300;--s5:#4a3aa7;--s6:#e34948;--s7:#e87ba4;--s8:#eb6834;--s-other:#898781;}
        [data-theme="dark"] .viz-donut{--s1:#3987e5;--s2:#199e70;--s3:#c98500;--s4:#008300;--s5:#9085e9;--s6:#e66767;--s7:#d55181;--s8:#d95926;--s-other:#898781;}
      `}</style>

      <h2 className="mb-3 text-sm font-medium text-muted">종목 비중</h2>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        {/* 도넛 */}
        <svg
          viewBox="0 0 180 180"
          className="h-40 w-40 shrink-0"
          role="img"
          aria-label="종목별 비중 도넛 차트"
        >
          <g transform="rotate(-90 90 90)">
            {arcs.map((a) => (
              <circle
                key={a.label}
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke={a.colorVar}
                strokeWidth="26"
                strokeDasharray={a.dasharray}
                strokeDashoffset={a.offset}
              />
            ))}
          </g>
          <text
            x="90"
            y="84"
            textAnchor="middle"
            className="fill-current text-[10px] opacity-60"
          >
            총 평가금액
          </text>
          <text
            x="90"
            y="102"
            textAnchor="middle"
            className="fill-current text-[15px] font-bold tabular-nums"
          >
            {formatUSD(total)}
          </text>
        </svg>

        {/* 범례 겸 표 (색상만으로 식별하지 않도록 텍스트 병기) */}
        <ul className="w-full space-y-1 text-sm">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: s.colorVar }}
                aria-hidden
              />
              <span className="font-medium">{s.label}</span>
              <span className="ml-auto tabular-nums text-muted">
                {s.pct.toFixed(1)}%
              </span>
              <span className="w-24 text-right tabular-nums text-muted/70">
                {formatUSD(s.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
