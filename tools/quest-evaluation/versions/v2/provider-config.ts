import "server-only";
import { vertexProviderConfig } from "./vertex-provider";
import { anthropicProviderConfig } from "./anthropic-provider";

// OIDC is a Vercel credential, never a generic OpenAI-compatible API key.
export function briefingProviderConfig(env: NodeJS.ProcessEnv = process.env) {
  if (env.BRIEFING_LLM_PROVIDER === "anthropic") return anthropicProviderConfig(env);
  if (env.BRIEFING_LLM_PROVIDER === "vertex") return vertexProviderConfig(env);
  if (env.BRIEFING_LLM_PROVIDER && env.BRIEFING_LLM_PROVIDER !== "direct") return undefined;
  const baseUrl = env.BRIEFING_LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = env.BRIEFING_LLM_MODEL;
  const key = env.BRIEFING_LLM_API_KEY ||
    (baseUrl === "https://ai-gateway.vercel.sh/v1" ? env.VERCEL_OIDC_TOKEN : undefined);
  if (!key || !model?.trim()) return undefined;
  try {
    const base = new URL(baseUrl);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) return undefined;
    return { key, getKey: async () => key, model, endpoint: `${base.href.replace(/\/$/, "")}/chat/completions` };
  } catch { return undefined; }
}
