import "server-only";
import { timingSafeEqual } from "node:crypto";
const trusted = Symbol("trusted-local-evaluation");
export type EvaluationContext = { readonly authorization: typeof trusted };
export function isEvaluationContext(context?: EvaluationContext): boolean {
  return context?.authorization === trusted && process.env.BRIEFING_EVAL_MODE === "true" && !process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.K_SERVICE && !process.env.K_REVISION;
}
export function authorizeEvaluationRequest(request: Request, userId: string): EvaluationContext | undefined {
  if (process.env.BRIEFING_EVAL_MODE !== "true" || process.env.VERCEL || process.env.VERCEL_ENV || process.env.K_SERVICE || process.env.K_REVISION) return;
  const url = new URL(request.url);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return;
  const expected = process.env.BRIEFING_EVAL_REQUEST_TOKEN;
  if (!expected || expected.length < 32 || !process.env.BRIEFING_EVAL_USER_ID || userId !== process.env.BRIEFING_EVAL_USER_ID) return;
  const actual = request.headers.get("x-briefing-eval-token") ?? "";
  const a = Buffer.from(actual), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return;
  return { authorization: trusted };
}
