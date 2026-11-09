"use client";

import { useSyncExternalStore } from "react";

function systemDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** 현재 적용 중인 테마가 다크인지 (명시 속성 우선, 없으면 시스템) */
function resolveDark() {
  const attr = document.documentElement.dataset.theme;
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return systemDark();
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

const serverTheme = () => null;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, resolveDark, serverTheme);

  function toggle() {
    const next = !resolveDark();
    document.documentElement.dataset.theme = next ? "dark" : "light";
    // 쿠키에 저장 → 다음 로드부터 서버가 곧바로 반영 (1년)
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="테마 전환"
      title={dark ? "라이트 모드로" : "다크 모드로"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:bg-surface-2 hover:text-fg"
    >
      {/* 마운트 전엔 아이콘 없이(SSR 불일치 방지) */}
      {dark === null ? null : dark ? (
        // sun
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
        </svg>
      ) : (
        // moon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
