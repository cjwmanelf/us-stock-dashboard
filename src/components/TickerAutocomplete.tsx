"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SymbolHit } from "@/lib/symbols";

// 쿼리별 결과를 브라우저 메모리에 캐시 (컴포넌트 리마운트에도 유지) → 재입력·백스페이스 시 즉시
const resultCache = new Map<string, SymbolHit[]>();

/**
 * 티커 입력 자동완성 콤보박스.
 * 입력하는 대로 미국 종목을 검색해 드롭다운으로 보여주고, 고르면 심볼이 입력된다.
 * 검색 결과가 없거나 API 키가 없어도 일반 입력칸으로 그대로 동작한다(graceful).
 * 폼 제출은 name="ticker" 값으로 이뤄지며, 서버측 parseTicker 가 최종 검증한다.
 */
export function TickerAutocomplete({
  inputCls,
  className = "",
  endpoint = "/api/symbols/search",
}: {
  inputCls: string;
  className?: string;
  endpoint?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SymbolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const listboxId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 선택 직후 그 값으로 다시 검색하지 않도록 무시할 쿼리
  const skipQuery = useRef<string | null>(null);

  // 디바운스 검색
  useEffect(() => {
    const q = query.trim();
    if (skipQuery.current === q) {
      skipQuery.current = null;
      return;
    }
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    // 캐시 히트: 네트워크 없이 즉시 표시
    const cached = resultCache.get(q);
    if (cached) {
      setSuggestions(cached);
      setActiveIndex(-1);
      setOpen(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const hits: SymbolHit[] = await res.json();
        resultCache.set(q, hits);
        setSuggestions(hits);
        setActiveIndex(-1);
        setOpen(true); // 결과 없으면 "결과 없음" 안내를 띄운다
      } catch {
        // 취소(AbortError)·네트워크 오류: 조용히 무시하고 일반 입력칸처럼 동작
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, endpoint]);

  // 마운트 시 서버 목록을 미리 데워둔다(첫 검색이 빠르도록). 실패는 무시.
  useEffect(() => {
    fetch(`${endpoint}?warm=1`).catch(() => {});
  }, [endpoint]);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  function select(hit: SymbolHit) {
    skipQuery.current = hit.symbol; // 이 값으로는 재검색 안 함
    setQuery(hit.symbol);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault(); // 항목 선택 중일 때만 제출 막기
        select(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        name="ticker"
        required
        placeholder="AAPL"
        autoComplete="off"
        maxLength={10}
        value={query}
        onChange={(e) => setQuery(e.target.value.toUpperCase())}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // 드롭다운 클릭이 먼저 등록되도록 잠깐 지연
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
        }
        className={`w-full uppercase ${inputCls}`}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="themed absolute left-0 top-full z-20 mt-1 max-h-64 w-72 overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          {suggestions.map((hit, i) => (
            <li
              key={`${hit.symbol}-${i}`}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // onMouseDown: blur 보다 먼저 발생시켜 선택이 확실히 등록되게
              onMouseDown={(e) => {
                e.preventDefault();
                select(hit);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-sm ${
                i === activeIndex ? "bg-surface-2" : ""
              }`}
            >
              <span className="font-semibold tabular-nums">{hit.symbol}</span>
              <span className="truncate text-xs text-muted">
                {hit.description}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim().length >= 1 && suggestions.length === 0 && (
        <div className="themed absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted shadow-lg">
          검색 결과가 없습니다. 티커를 직접 입력해도 됩니다.
        </div>
      )}
    </div>
  );
}
