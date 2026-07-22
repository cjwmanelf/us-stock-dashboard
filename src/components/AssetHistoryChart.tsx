"use client";

import { useState } from "react";
import { formatKRW, formatKRWCompact } from "@/lib/format";

type Point = { date: string; krw: number };
type Range = "day" | "week" | "month" | "year";

const RANGES: { key: Range; label: string }[] = [
  { key: "day", label: "일별" },
  { key: "week", label: "주별" },
  { key: "month", label: "월별" },
  { key: "year", label: "연도별" },
];

// 기간 버킷 키. 같은 버킷의 점들은 하나로 묶인다. (타임존 영향 없이 UTC 기준)
function periodKey(date: string, range: Range): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date; // "시작" 등 날짜가 아닌 값은 그대로
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (range === "year") return `${y}`;
  if (range === "month") return `${y}-${mo}`;
  if (range === "week") {
    const dayNum = Math.floor(Date.UTC(y, mo - 1, d) / 86400000);
    return `w${Math.floor((dayNum + 3) / 7)}`; // 월요일 기준 주 버킷
  }
  return date;
}

// x축 라벨 표기. 일/주 = 월/일, 월 = 'YY.M', 연 = 'YYYY'
function fmtLabel(date: string, range: Range): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (range === "year") return `${y}`;
  if (range === "month") return `${String(y).slice(2)}.${mo}`;
  return `${mo}/${d}`;
}

// 기간별 집계: 각 버킷의 '마지막(가장 최근) 스냅샷' 잔액을 대표값으로.
// 입력이 날짜 오름차순이라 나중 값이 뒤에 오므로 Map의 last-wins가 곧 기간말 잔액.
function aggregate(points: Point[], range: Range): Point[] {
  if (range === "day") return points;
  const m = new Map<string, Point>();
  for (const p of points) m.set(periodKey(p.date, range), p);
  return [...m.values()];
}

export function AssetHistoryChart({ points }: { points: Point[] }) {
  const [range, setRange] = useState<Range>("day");

  if (points.length === 0) {
    return (
      <div className="themed rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="mb-2 text-sm font-medium text-muted">자산 추이</h2>
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          아직 기록이 없습니다. 대시보드를 방문하면 그날의 자산이 기록됩니다.
        </p>
      </div>
    );
  }

  // 각 단위가 점 2개 이상 만들 때만 선택 가능하게 (하나면 추이가 안 그려짐)
  const distinctCount = (r: Range) =>
    r === "day" ? points.length : new Set(points.map((p) => periodKey(p.date, r))).size;

  const aggregated = aggregate(points, range);

  // 집계 결과가 하루(1점)뿐이면 0에서 시작하는 점을 앞에 넣어 그래프를 바로 보여준다.
  const synthetic = aggregated.length === 1;
  const chartPoints: Point[] = synthetic
    ? [{ date: "시작", krw: 0 }, aggregated[0]]
    : aggregated;

  const W = 640;
  const H = 220;
  const padL = 12;
  const padR = 12;
  const padT = 16;
  const padB = 46; // 기울인 날짜 라벨이 들어갈 공간
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const krws = chartPoints.map((p) => p.krw);
  const min = Math.min(...krws);
  const max = Math.max(...krws);
  const spread = max - min || 1;
  const yMin = min - spread * 0.1;
  const yMax = max + spread * 0.1;
  const yRange = yMax - yMin || 1;

  const xAt = (i: number) => padL + (i / (chartPoints.length - 1)) * innerW;
  const yAt = (v: number) => padT + (1 - (v - yMin) / yRange) * innerH;

  const line = chartPoints.map((p, i) => `${xAt(i)},${yAt(p.krw)}`).join(" ");
  const area = `${padL},${padT + innerH} ${line} ${padL + innerW},${padT + innerH}`;

  // x축 라벨로 보여줄 점의 인덱스: 항상 양 끝을 포함하고 균등 간격으로 솎는다.
  const n = chartPoints.length;
  const maxLabels = Math.max(2, Math.floor(innerW / 34)); // 기울인 라벨 최소 간격 확보
  const labelIdx = new Set<number>();
  if (n <= maxLabels) {
    for (let i = 0; i < n; i++) labelIdx.add(i);
  } else {
    for (let k = 0; k < maxLabels; k++)
      labelIdx.add(Math.round((k * (n - 1)) / (maxLabels - 1)));
  }

  const first = chartPoints[0];
  const last = chartPoints[chartPoints.length - 1];
  const realLast = points[points.length - 1];
  const up = last.krw >= first.krw;
  const strokeCls = up ? "stroke-up" : "stroke-down";
  const fillCls = up ? "fill-up" : "fill-down";

  return (
    <div className="themed rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-muted">자산 추이 (원화)</h2>
        <span className="text-sm font-bold tabular-nums">
          {formatKRW(realLast.krw)}
        </span>
      </div>

      {/* 기간 단위 전환 */}
      <div className="mb-2 inline-flex gap-1 rounded-xl border border-line p-1">
        {RANGES.map((r) => {
          const active = range === r.key;
          const disabled = r.key !== "day" && distinctCount(r.key) < 2;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              disabled={disabled}
              aria-pressed={active}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-brand/10 text-brand"
                  : disabled
                    ? "cursor-not-allowed text-muted/40"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
              title={disabled ? "기록이 더 쌓이면 볼 수 있어요" : undefined}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        overflow="visible"
        role="img"
        aria-label="자산 총액 추이 그래프"
      >
        <polygon points={area} className={fillCls} opacity="0.1" />
        <polyline
          points={line}
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className={strokeCls}
        />
        {chartPoints.map((p, i) => (
          <circle
            key={`${p.date}-${i}`}
            cx={xAt(i)}
            cy={yAt(p.krw)}
            r="2.5"
            className={fillCls}
          />
        ))}

        {/* y 최대/최소 라벨 */}
        <text x={padL} y={yAt(max) - 4} className="fill-current text-[10px] opacity-50">
          {formatKRWCompact(max)}
        </text>
        <text x={padL} y={yAt(min) + 12} className="fill-current text-[10px] opacity-50">
          {formatKRWCompact(min)}
        </text>

        {/* x축: 각 점의 기록 날짜 (선택한 단위로 표기, 촘촘하면 자동으로 솎아 표시) */}
        {chartPoints.map((p, i) => {
          if (!labelIdx.has(i)) return null;
          const x = xAt(i);
          const y = padT + innerH;
          return (
            <g key={`x-${p.date}-${i}`}>
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={y + 4}
                className="stroke-current opacity-30"
                strokeWidth="1"
              />
              <text
                x={x}
                y={y + 8}
                textAnchor="end"
                transform={`rotate(-45 ${x} ${y + 8})`}
                className="fill-current text-[10px] opacity-50"
              >
                {fmtLabel(p.date, range)}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-xs text-muted/80">
        {synthetic
          ? "※ 첫 기록이라 0에서 시작한 것으로 표시했어요. 방문이 쌓이면 실제 추이로 바뀝니다."
          : "※ 대시보드를 방문한 날의 자산이 기록됩니다. 주/월/연 단위는 각 기간의 마지막 잔액으로 집계합니다."}
      </p>
    </div>
  );
}
