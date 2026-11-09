import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { BriefingError } from "./guards";
function secret() { const key = process.env.BRIEFING_FEEDBACK_SECRET; return key && key.length >= 32 ? key : null; }
function sign(value: string, key: string) { return createHmac("sha256", key).update(value).digest("base64url"); }
export function feedbackToken(traceId: string, userId: string, version: string): string | undefined {
  const key = secret(); if (!key) return undefined;
  if (!/^briefing-[a-zA-Z0-9._-]{1,100}$/.test(version)) return undefined;
  const expires = Date.now() + 3600000;
  const body = `${traceId}.${expires}.${sign(userId, key)}.${Buffer.from(version).toString("base64url")}`;
  return `${body}.${sign(body, key)}`;
}
export function verifyFeedback(token: string, traceId: string, userId: string) {
  const key = secret(); if (!key) throw new BriefingError(503, "FEEDBACK_NOT_CONFIGURED", "피드백 서버 설정이 필요합니다.");
  const parts = token.split("."); const body = parts.slice(0, 4).join(".");
  const expected = Buffer.from(sign(body, key)); const actual = Buffer.from(parts[4] ?? "");
  const version = Buffer.from(parts[3] ?? "", "base64url").toString("utf8");
  if (parts.length !== 5 || expected.length !== actual.length || !timingSafeEqual(expected, actual) || parts[0] !== traceId || parts[2] !== sign(userId, key) || !/^briefing-[a-zA-Z0-9._-]{1,100}$/.test(version) || Buffer.from(version).toString("base64url") !== parts[3] || !Number.isSafeInteger(Number(parts[1])) || Number(parts[1]) < Date.now() || Number(parts[1]) > Date.now() + 3600000) throw new BriefingError(404, "TRACE_NOT_FOUND", "피드백 가능한 요청을 찾을 수 없습니다. 새 브리핑을 요청해 주세요.");
  return { version };
}
export function feedbackScoreId(traceId: string, userId: string): string {
  const key = secret(); if (!key) throw new BriefingError(503, "FEEDBACK_NOT_CONFIGURED", "피드백 서버 설정이 필요합니다.");
  return sign(`score:${traceId}:${userId}`, key);
}
