import "server-only";
import type { BriefingTrace } from "./types";

export const ANTHROPIC_VERSION = "2023-06-01";
export function anthropicProviderConfig(env: NodeJS.ProcessEnv) {
  const key = env.ANTHROPIC_API_KEY;
  const model = env.BRIEFING_LLM_MODEL;
  if (!key?.trim() || /[\r\n]/.test(key) || !model || !/^claude-[a-zA-Z0-9._-]+$/.test(model) ||
      env.BRIEFING_LLM_BASE_URL || env.ANTHROPIC_BASE_URL || env.BRIEFING_LLM_API_KEY) return undefined;
  return Object.freeze({ protocol: "anthropic" as const, model, endpoint: "https://api.anthropic.com/v1/messages", getKey: async () => key });
}

export function anthropicRequest(key: string, model: string, messages: { role: string; content: string }[]) {
  return {
    headers: { "x-api-key": key, "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 1000, stream: false,
      system: messages.filter(m => m.role === "system").map(m => m.content).join("\n"),
      messages: messages.filter(m => m.role !== "system") })
  };
}

export function anthropicUsage(value: unknown): BriefingTrace["usage"] {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const usage: Record<string, number> = {};
  for (const name of ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"]) {
    const n = raw[name];
    if (typeof n === "number" && Number.isSafeInteger(n) && n >= 0) usage[name] = n;
  }
  if (usage.input_tokens !== undefined) usage.prompt_tokens = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
  if (usage.output_tokens !== undefined) usage.completion_tokens = usage.output_tokens;
  if (usage.prompt_tokens !== undefined && usage.completion_tokens !== undefined) usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
  return usage;
}

export function anthropicText(value: unknown): string {
  if (!value || typeof value !== "object") throw new Error("Invalid Anthropic response");
  const data = value as { type?: string; role?: string; stop_reason?: string; content?: { type?: string; text?: string }[]; stop_details?: { type?: string } };
  if (data.type !== "message" || data.role !== "assistant" || data.stop_reason !== "end_turn" || data.stop_details?.type === "refusal" || !Array.isArray(data.content) || !data.content.length ||
      data.content.some(block => !block || block.type !== "text" || typeof block.text !== "string")) throw new Error("Incomplete Anthropic response");
  // Strict JSON parsing and existing citation validation happen in the service.
  return data.content.map(block => block.text).join("");
}
