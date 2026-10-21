import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ORIGINS = "https://farmtwin-web.vercel.app,https://farmtwin-web-l7ehs4alsa-uc.a.run.app,http://localhost:*,http://127.0.0.1:*";
export function originAllowed(origin: string | null): boolean {
  if (origin === null) return true;
  const entries = (process.env.GAME_API_ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(",").map(s => s.trim());
  return entries.some(entry => {
    if (entry === origin && !entry.includes("*")) return true;
    if (entry !== "http://localhost:*" && entry !== "http://127.0.0.1:*") return false;
    try {
      const url = new URL(origin);
      return url.origin === origin && url.protocol === "http:" && `${url.protocol}//${url.hostname}:*` === entry;
    } catch { return false; }
  });
}
export function gameResponse(request: Request, body: unknown, status = 200, extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  headers.set("Vary", "Origin");
  const origin = request.headers.get("Origin");
  if (origin && originAllowed(origin)) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return status === 204 ? new Response(null, { status, headers }) : Response.json(body, { status, headers });
}
export function gameError(request: Request, status: number, code: string, message: string, extra?: HeadersInit) {
  return gameResponse(request, { error: { code, message } }, status, extra);
}
export function gameOptions(request: Request) {
  return originAllowed(request.headers.get("Origin")) ? gameResponse(request, null, 204) : gameError(request, 403, "ORIGIN_NOT_ALLOWED", "Origin not allowed");
}
const windows = new Map<string, { count: number; reset: number }>();
export function consumeRate(userId: string, now = Date.now()) {
  const raw = Number(process.env.GAME_API_RATE_LIMIT_PER_MINUTE ?? 30);
  const limit = Number.isSafeInteger(raw) && raw > 0 ? raw : 30;
  for (const [id, window] of windows) if (window.reset <= now) windows.delete(id);
  let window = windows.get(userId);
  if (!window) { window = { count: 0, reset: now + 60000 }; windows.set(userId, window); }
  window.count++;
  return window.count <= limit ? 0 : Math.ceil((window.reset - now) / 1000);
}
type Context = { db: SupabaseClient; userId: string };
export type ClientFactory = (url: string, key: string, token: string) => SupabaseClient;
const defaultFactory: ClientFactory = (url, key, token) => createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
export function withGameAuth(handler: (request: Request, context: Context) => Promise<unknown>, factory = defaultFactory) {
  return async (request: Request) => {
    if (!originAllowed(request.headers.get("Origin"))) return gameError(request, 403, "ORIGIN_NOT_ALLOWED", "Origin not allowed");
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
    if (!token) return gameError(request, 401, "UNAUTHORIZED", "Authentication required");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return gameError(request, 503, "NOT_CONFIGURED", "Service not configured");
    try {
      const db = factory(url, key, token);
      const { data: { user }, error } = await db.auth.getUser(token);
      if (error || !user) return gameError(request, 401, "UNAUTHORIZED", "Authentication required");
      const retry = consumeRate(user.id);
      if (retry) return gameError(request, 429, "RATE_LIMITED", "Too many requests", { "Retry-After": String(retry) });
      const result = await handler(request, { db, userId: user.id });
      return result instanceof Response ? result : gameResponse(request, result);
    } catch {
      return gameError(request, 500, "INTERNAL_ERROR", "Request could not be completed");
    }
  };
}
