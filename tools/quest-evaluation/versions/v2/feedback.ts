import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { BriefingError } from "./guards";
function secret() { const key = process.env.BRIEFING_FEEDBACK_SECRET; return key && key.length >= 32 ? key : null; }
function sign(value: string, key: string) { return createHmac("sha256", key).update(value).digest("base64url"); }
export function feedbackToken(traceId: string, userId: string): string | undefined {
  const key = secret(); if (!key) return undefined;
  const expires = Date.now() + 3600000;
  const body = `${traceId}.${expires}.${sign(userId, key)}`;
  return `${body}.${sign(body, key)}`;
}
export function verifyFeedback(token: string, traceId: string, userId: string) {
  const key = secret(); if (!key) throw new BriefingError(503, "FEEDBACK_NOT_CONFIGURED", "피드백 서버 설정이 필요합니다.");
  const parts = token.split("."); const body = parts.slice(0, 3).join(".");
  const expected = Buffer.from(sign(body, key)); const actual = Buffer.from(parts[3] ?? "");
  if (parts.length !== 4 || expected.length !== actual.length || !timingSafeEqual(expected, actual) || parts[0] !== traceId || parts[2] !== sign(userId, key) || !Number.isSafeInteger(Number(parts[1])) || Number(parts[1]) < Date.now() || Number(parts[1]) > Date.now() + 3600000) throw new BriefingError(404, "TRACE_NOT_FOUND", "피드백 가능한 요청을 찾을 수 없습니다.");
}
export function feedbackScoreId(traceId: string, userId: string): string {
  const key = secret(); if (!key) throw new BriefingError(503, "FEEDBACK_NOT_CONFIGURED", "피드백 서버 설정이 필요합니다.");
  return sign(`score:${traceId}:${userId}`, key);
}
