"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/briefing", label: "AI 브리핑" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/portfolio", label: "포트폴리오" },
  { href: "/feed", label: "관심 & 소식" },
];

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-brand/10 text-brand"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
