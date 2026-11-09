import "server-only";
import type { BriefingInput } from "./types";
export class BriefingError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function parseInput(value: unknown): BriefingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BriefingError(400, "INVALID_INPUT", "종목과 질문을 확인해 주세요.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(k => !["ticker", "question"].includes(k)) || typeof v.ticker !== "string" || (v.question !== undefined && typeof v.question !== "string")) throw new BriefingError(400, "INVALID_INPUT", "허용되지 않는 입력입니다.");
  const ticker = v.ticker.trim().toUpperCase();
  const question = typeof v.question === "string" ? v.question.trim() : "최근 공개 소식을 근거와 함께 요약해 주세요.";
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker) || question.length > 500) throw new BriefingError(400, "INVALID_INPUT", "종목은 12자, 질문은 500자 이내로 입력해 주세요.");
  return { ticker, question };
}
export async function readJson(request: Request, max = 4096): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new BriefingError(415, "CONTENT_TYPE", "JSON 요청이 필요합니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new BriefingError(400, "INVALID_INPUT", "요청이 비어 있습니다.");
  let length = 0; const chunks: Uint8Array[] = [];
  const timer = setTimeout(() => void reader.cancel(), 5000);
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > max) { await reader.cancel(); throw new BriefingError(413, "TOO_LARGE", "요청이 너무 큽니다."); } chunks.push(value); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new BriefingError(400, "INVALID_JSON", "JSON 형식을 확인해 주세요."); }
  } finally { clearTimeout(timer); reader.releaseLock(); }
}
const windows = new Map<string, { count: number; until: number }>();
let active = 0;
export function acquire(userId: string): () => void {
  const now = Date.now();
  for (const [key, value] of windows) if (value.until <= now) windows.delete(key);
  const window = windows.get(userId) ?? { count: 0, until: now + 60000 };
  if (window.count >= 5 || active >= 2 || windows.size >= 10000) throw new BriefingError(429, "RATE_LIMITED", "요청이 많습니다. 1분 후 다시 시도해 주세요.");
  window.count++; windows.set(userId, window); active++;
  return () => { active--; };
}
