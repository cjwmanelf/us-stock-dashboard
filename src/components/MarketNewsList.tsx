import type { MarketNewsGroup } from "@/lib/feed";

// 소스별 색상 뱃지
const SOURCE_META: Record<string, string> = {
  CNBC: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Reuters: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Bloomberg: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};

export function MarketNewsList({ groups }: { groups: MarketNewsGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="themed rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
        표시할 증시 뉴스가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section
          key={g.source}
          className="themed overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                SOURCE_META[g.source] ??
                "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {g.source}
            </span>
            <span className="text-sm font-medium text-muted">{g.label}</span>
          </div>
          <ul className="divide-y divide-line px-4">
            {g.items.map((item) => {
              const content = (
                <div className="py-3">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted/80">
                    {item.dateLabel}
                    {item.url ? " · 원문 보기 →" : ""}
                  </div>
                </div>
              );
              return (
                <li key={item.id}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="-mx-4 block px-4 transition hover:bg-surface-2"
                    >
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
