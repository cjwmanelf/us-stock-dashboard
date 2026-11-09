// Server-only adapter bridge. Runtime implementation is vendored in ./telemetry.
// Callers may ignore the returned state, but must never label it a successful ingestion.
import 'server-only';
import type { BriefingTrace } from './types';
import { recordBriefingTrace as record } from './telemetry/index';
export { recordBriefingFeedback, getAdapter } from './telemetry/index';
export type { BriefingEvent, TelemetryState, FeedbackRepository } from './telemetry/index';

export async function recordBriefingTrace(event: BriefingTrace) {
  return record({ traceId: event.traceId, version: event.version, status: event.status, durationMs: event.durationMs, evidenceCount: event.evidenceCount,
    startedAt: event.startedAt, promptVersion: event.promptVersion, stages: event.stageTimings,
    measuredStageDurations: event.stages ? { retrieval: event.stages.retrievalMs, input_assembly: event.stages.inputAssemblyMs, generation: event.stages.generationMs } : undefined,
    model: event.model, usage: event.usage ? { input: event.usage.prompt_tokens, output: event.usage.completion_tokens, total: event.usage.total_tokens, cache_creation_input_tokens: event.usage.cache_creation_input_tokens, cache_read_input_tokens: event.usage.cache_read_input_tokens } : undefined,
    ...(event.contentLogging && event.contentClass === 'synthetic-public-eval' && event.input && event.output ? { content: { classification: 'synthetic_public_eval' as const, ...event.input, answer: event.output.answer, evidence: event.evidence ?? [] } } : {})
  });
}

