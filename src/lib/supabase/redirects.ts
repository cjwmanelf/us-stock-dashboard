import "server-only";

function canonicalOrigin(value: string, cloud: boolean): string | undefined {
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password || url.hostname.includes("*")) return undefined;
    if (url.protocol === "https:") return value;
    if (!cloud && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return value;
  } catch { /* Fail closed on malformed configuration. */ }
  return undefined;
}

// First explicitly configured origin is the canonical callback destination.
// Never use Host or forwarded headers to establish redirect trust.
export function authRedirectOrigin(request: Request, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const cloud = !!(env.K_SERVICE || env.K_REVISION || env.K_CONFIGURATION);
  if (env.BRIEFING_ALLOWED_ORIGINS !== undefined) {
    const values = env.BRIEFING_ALLOWED_ORIGINS.split(",").map(value => value.trim());
    return values.length && values.every(value => canonicalOrigin(value, cloud)) ? values[0] : undefined;
  }
  if (cloud) return undefined;
  try { return canonicalOrigin(new URL(request.url).origin, false); } catch { return undefined; }
}

export function safeAuthNext(next: string | null, origin: string): string {
  // Percent escapes are deliberately unsupported: searchParams already decoded
  // once, and rejecting residual escapes prevents double-decoding bypasses.
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\%\u0000-\u0020\u007f]/.test(next)) return "/portfolio";
  try {
    const url = new URL(next, origin);
    if (url.origin !== origin || url.pathname.startsWith("//")) return "/portfolio";
    return url.pathname + url.search + url.hash;
  } catch { return "/portfolio"; }
}
