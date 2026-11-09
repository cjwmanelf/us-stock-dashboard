import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BriefingError } from "./guards";

// Compare canonical origins only. Never derive trusted origins from Host or
// forwarded headers: Cloud Run terminates TLS outside the standalone server.
function exactOrigin(value: string, cloudRun: boolean): string | undefined {
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password || url.hostname.includes("*")) return undefined;
    if (url.protocol === "https:") return value;
    if (!cloudRun && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return value;
  } catch { /* Invalid origins fail closed. */ }
  return undefined;
}

export function isAllowedBriefingOrigin(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const cloudRun = !!(env.K_SERVICE || env.K_REVISION || env.K_CONFIGURATION);
  const origin = request.headers.get("origin");
  if (!origin || !exactOrigin(origin, cloudRun)) return false;
  if (env.BRIEFING_ALLOWED_ORIGINS !== undefined) {
    const configured = env.BRIEFING_ALLOWED_ORIGINS.split(",").map(value => value.trim());
    if (!configured.length || configured.some(value => !exactOrigin(value, cloudRun))) return false;
    return configured.includes(origin);
  }
  // A managed container's bind address is not its browser-facing origin.
  if (cloudRun) return false;
  try {
    const fallback = new URL(request.url).origin;
    return !!exactOrigin(fallback, false) && origin === fallback;
  } catch { return false; }
}

export async function authenticate(request: Request) {
  if (!isAllowedBriefingOrigin(request)) throw new BriefingError(403, "ORIGIN_NOT_ALLOWED", "동일 사이트에서 요청해 주세요.");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new BriefingError(503, "AUTH_NOT_CONFIGURED", "인증 서비스 설정이 필요합니다.");
  const db = await createClient();
  const result = await Promise.race([db.auth.getUser(), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new BriefingError(503, "AUTH_UNAVAILABLE", "인증 서비스 응답이 지연됩니다.")), 5000); timer.unref(); })]);
  if (result.error || !result.data.user) throw new BriefingError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  return result.data.user.id;
}
export function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } }); }
export function failure(error: unknown, traceId: string) {
  return error instanceof BriefingError ? json({ error: { code: error.code, message: error.message }, traceId }, error.status) : json({ error: { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다." }, traceId }, 500);
}
