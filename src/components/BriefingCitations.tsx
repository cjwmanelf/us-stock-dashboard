"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Evidence } from "@/lib/briefing/types";

export function citationParts(answer: string, sources: Evidence[]) {
  const ids = new Set(sources.map(source => source.id));
  return answer.split(/(\[[^\]\r\n]+\])/g).map(text => ({ text, sourceId: text.startsWith("[") && text.endsWith("]") && ids.has(text.slice(1, -1)) ? text.slice(1, -1) : null }));
}
export function sourceHref(value: string | null) {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function BriefingCitations({ answer, sources }: { answer: string; sources: Evidence[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  const selected = sources.find(source => source.id === selectedId);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    else if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  const href = selected ? sourceHref(selected.url) : null;
  return <>
    <p className="whitespace-pre-wrap break-words leading-7 [overflow-wrap:anywhere]">{citationParts(answer, sources).map((part, index) => part.sourceId === null ? part.text : <button
      key={index} type="button" aria-haspopup="dialog" aria-controls={panelId} aria-expanded={selectedId === part.sourceId}
      aria-label={`근거 보기: ${sources.find(source => source.id === part.sourceId)?.title}`}
      className="mx-0.5 inline rounded border border-brand/30 px-1.5 text-sm font-medium text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={event => { opener.current = event.currentTarget; setSelectedId(part.sourceId); }}>[근거]</button>)}</p>
    <dialog ref={dialog} id={panelId} aria-labelledby={`${panelId}-title`}
      className="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-5 text-inherit shadow-xl backdrop:bg-black/40"
      onClose={() => { setSelectedId(null); if (opener.current?.isConnected) opener.current.focus(); }}>
      <div className="space-y-4 break-words [overflow-wrap:anywhere]">
        <h3 id={`${panelId}-title`} className="font-semibold">근거 상세</h3>
        {selected && <><p>{selected.title}</p><p className="text-sm text-muted">날짜 메타데이터: {selected.publishedAt ?? "확인 불가"}</p>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline">원문 보기 (새 탭)</a> : <p className="text-sm text-muted">원문 URL 없음</p>}
          <p className="break-all text-xs text-muted">원본 ID: {selected.id}</p></>}
        <button type="button" autoFocus onClick={() => dialog.current?.close()} className="rounded border border-line px-4 py-2 focus-visible:outline-2">닫기</button>
      </div>
    </dialog>
  </>;
}
