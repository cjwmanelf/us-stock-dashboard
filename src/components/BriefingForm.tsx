"use client";
import { useState, type FormEvent } from "react";
import type { BriefingResult } from "@/lib/briefing/types";
import { BriefingCitations, sourceHref } from "./BriefingCitations";
type Result = BriefingResult & { feedbackToken?: string };
export function BriefingForm() {
  const [busy, setBusy] = useState(false); const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(""); const [feedback, setFeedback] = useState(""); const [rating, setRating] = useState(false);
  const [ratedTrace, setRatedTrace] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(""); setResult(null); setFeedback("");
    try { const response = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: form.get("ticker"), question: form.get("question") }), signal: AbortSignal.timeout(45000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "브리핑 요청에 실패했습니다."); setResult(data); }
    catch (e) { setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."); } finally { setBusy(false); }
  }
  async function rate(vote: "up" | "down") {
    if (!result || rating || ratedTrace === result.traceId) return; setRating(true);
    try { const response = await fetch("/api/briefing/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ traceId: result.traceId, token: result.feedbackToken, feedback: vote }), signal: AbortSignal.timeout(15000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "피드백을 접수하지 못했습니다."); if (data.accepted !== true || !["stdout_written_unverified", "flush_completed_unverified"].includes(data.delivery)) throw new Error("피드백 접수 상태를 확인하지 못했습니다."); setRatedTrace(result.traceId); setFeedback("피드백을 접수했습니다."); } catch (e) { setFeedback(e instanceof Error && e.name !== "TimeoutError" ? e.message : "피드백 접수 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."); } finally { setRating(false); }
  }
  return <div className="space-y-6">
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <label className="block text-sm font-medium">미국 주식 종목 코드<input name="ticker" required maxLength={12} pattern="[A-Za-z][A-Za-z0-9.\-]{0,11}" placeholder="AAPL" className="mt-2 block w-full rounded-lg border border-line bg-surface p-3" /></label>
      <label className="block text-sm font-medium">궁금한 점<textarea name="question" maxLength={500} rows={3} defaultValue="최근 공개 소식을 근거와 함께 요약해 주세요." className="mt-2 block w-full rounded-lg border border-line bg-surface p-3" /></label>
      <button disabled={busy} className="rounded-lg bg-brand px-5 py-3 font-medium text-white disabled:opacity-50">{busy ? "공개 근거를 확인하고 있습니다…" : "브리핑 만들기"}</button>
      <p className="text-xs text-muted">1분에 최대 5회 · 제목과 공개 메타데이터 기반 · 기사 본문 미열람</p>
    </form>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <div aria-live="polite" aria-busy={busy}>{result && <article className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold">{result.status === "ok" ? "AI 브리핑" : result.status === "insufficient_evidence" ? "근거 부족 · 확인 보류" : "브리핑 생성 불가"}</h2>
      <p className="text-xs text-muted">기준 시각 {result.asOf} · {result.version}</p>
      <BriefingCitations key={result.traceId} answer={result.answer} sources={result.sources} />
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{result.limitations.map(item => <li key={item}>{item}</li>)}</ul>
      <h3 className="font-semibold">제공된 공개 근거 ({result.sources.length})</h3>
      <ul className="space-y-3">{result.sources.map(source => <li key={source.id} className="break-words border-t border-line pt-3 text-sm [overflow-wrap:anywhere]"><p>{sourceHref(source.url) ? <a href={sourceHref(source.url)!} target="_blank" rel="noopener noreferrer" className="text-brand underline">{source.title}</a> : source.title}</p><p className="mt-1 text-xs text-muted">{source.publishedAt ?? "날짜 확인 불가"}{!sourceHref(source.url) && " · 원문 URL 없음"}</p><details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">원본 ID 보기</summary><p className="break-all">{source.id}</p></details></li>)}</ul>
      {result.feedbackToken && <div className="flex gap-3"><button disabled={rating || ratedTrace === result.traceId} onClick={() => rate("up")} className="rounded border border-line p-2">도움이 됐어요</button><button disabled={rating || ratedTrace === result.traceId} onClick={() => rate("down")} className="rounded border border-line p-2">아쉬워요</button></div>}
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
      <p className="break-all text-xs text-muted">요청 ID: {result.traceId}</p>
    </article>}</div>
  </div>;
}
