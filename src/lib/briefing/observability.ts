// Server-only adapter bridge. Runtime implementation is vendored in ./telemetry.
// Callers may ignore the returned state, but must never label it a successful ingestion.
import 'server-only';
import type { BriefingTrace } from './types';
import { recordBriefingTrace as record, recordBriefingFeedback as feedback } from './telemetry/index';
export { getAdapter } from './telemetry/index';
export type { BriefingEvent, TelemetryState, FeedbackRepository } from './telemetry/index';

const count = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const label = (v: unknown, pattern: RegExp) => typeof v === 'string' && v.length <= 128 && pattern.test(v) ? v : undefined;
const id = (v: unknown) => label(v, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
function emit(value: object): Promise<boolean> {
  return new Promise(resolve => {
    try { process.stdout.write(JSON.stringify(value) + '\n', error => resolve(!error)); }
    catch { resolve(false); }
  });
}
async function logTrace(event: BriefingTrace) {
  const usage = Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens','input_tokens','output_tokens','cache_creation_input_tokens','cache_read_input_tokens'].flatMap(k => {
    const n = event.usage?.[k as keyof NonNullable<BriefingTrace['usage']>]; return count(n) ? [[k,n]] : [];
  }));
  const stages = (event.stageTimings ?? []).filter(s => ['retrieval','input_assembly','generation'].includes(s.name)).map(s => ({
    name: s.name, status: s.status === 'ok' ? 'ok' : 'error',
    startedAt: label(s.startedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/),
    endedAt: label(s.endedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
  })).slice(0,3);
  await emit({ event: 'briefing_trace', traceId: id(event.traceId),
    contractVersion: label(event.version, /^briefing-[a-zA-Z0-9._-]+$/),
    promptVersion: label(event.promptVersion, /^briefing-prompt-[a-zA-Z0-9._-]+$/),
    revision: label(process.env.K_REVISION, /^[a-z][a-z0-9-]+$/),
    status: ['ok','insufficient_evidence','unavailable'].includes(event.status) ? event.status : 'unavailable',
    stages, evidenceCount: count(event.evidenceCount) ? Math.min(12, Math.floor(event.evidenceCount)) : undefined,
    durationMs: count(event.durationMs) ? event.durationMs : undefined,
    model: label(event.model, /^(?:google\/gemini-|claude-|(?:openai\/)?gpt-)[a-zA-Z0-9._-]+$/), usage,
    errorCode: event.errorCode === 'GENERATION_UNAVAILABLE' ? event.errorCode : undefined });
}

export async function recordBriefingFeedback(event: Parameters<typeof feedback>[0]) {
  const version = label(event.version, /^briefing-[a-zA-Z0-9._-]+$/);
  if (event.verifiedOwnership !== true || !id(event.traceId) || !version || !['up','down'].includes(event.vote) || !/^[a-zA-Z0-9_-]{16,128}$/.test(event.scoreId)) return { status: 'failed' as const, reason: 'export' as const };
  const written = await emit({ event: 'briefing_feedback', traceId: id(event.traceId), version, score: event.vote === 'up' ? 1 : 0 });
  let delivery;
  try { delivery = await feedback(event); } catch { delivery = { status: 'failed' as const, reason: 'export' as const }; }
  if (delivery.status === 'flush_completed_unverified') return delivery;
  if (written) return { status: 'stdout_written_unverified' as const, traceId: event.traceId };
  return { status: 'failed' as const, reason: 'export' as const };
}

export async function recordBriefingTrace(event: BriefingTrace) {
  await logTrace(event);
  return record({ traceId: event.traceId, version: event.version, status: event.status, durationMs: event.durationMs, evidenceCount: event.evidenceCount,
    startedAt: event.startedAt, promptVersion: event.promptVersion, stages: event.stageTimings, errorCode: event.errorCode,
    measuredStageDurations: event.stages ? { retrieval: event.stages.retrievalMs, input_assembly: event.stages.inputAssemblyMs, generation: event.stages.generationMs } : undefined,
    model: event.model, usage: event.usage ? { input: event.usage.prompt_tokens, output: event.usage.completion_tokens, total: event.usage.total_tokens, cache_creation_input_tokens: event.usage.cache_creation_input_tokens, cache_read_input_tokens: event.usage.cache_read_input_tokens } : undefined,
    ...(event.contentLogging && event.contentClass === 'synthetic-public-eval' && event.input && event.output ? { content: { classification: 'synthetic_public_eval' as const, ...event.input, answer: event.output.answer, evidence: event.evidence ?? [] } } : {})
  });
}

