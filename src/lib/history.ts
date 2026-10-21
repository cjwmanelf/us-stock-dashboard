export type HistoryRange = "day" | "week" | "month" | "year";
export function periodKey(date: string, range: HistoryRange): string {
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


export function aggregateHistory<T extends { date: string }>(points: T[], range: HistoryRange): T[] {
 if (range === "day") return points;
 const buckets = new Map<string, T>();
 for (const point of points) buckets.set(periodKey(point.date, range), point);
 return [...buckets.values()];
}
