import { createHmac } from 'node:crypto';

export type TelemetryState =
  | { status: 'disabled'; reason: 'not_enabled' | 'missing_config' | 'invalid_config' }
  | { status: 'failed'; reason: 'initialization' | 'export' }
  | { status: 'flush_completed_unverified'; traceId: string };
export type Stage = { name: 'retrieval' | 'input_assembly' | 'generation'; startedAt: string; endedAt: string; status: 'ok' | 'error' };
export interface BriefingEvent {
  traceId: string; version: string; status: string; durationMs: number; evidenceCount: number; errorCode?: string;
  startedAt?: string; stages?: Stage[]; promptVersion?: string; model?: string;
  usage?: { input?: number; output?: number; total?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
  costUsd?: { input?: number; output?: number; total?: number };
  measuredStageDurations?: { retrieval?: number; input_assembly?: number; generation?: number };
  // Set only from verified server session, never request JSON.
  authenticatedUserId?: string;
  content?: { classification: 'synthetic_public_eval'; ticker: string; question: string; answer: string; evidence: { title: string; url: string | null }[] };
}
export interface Config { publicKey: string; secretKey: string; baseUrl: string; hashKey: string; appVersion: string; promptVersion: string; captureContent: boolean }
export function configuration(env: NodeJS.ProcessEnv): Config | TelemetryState {
  if (env.LANGFUSE_ENABLED !== 'true') return { status: 'disabled', reason: 'not_enabled' };
  const fields = ['LANGFUSE_PUBLIC_KEY','LANGFUSE_SECRET_KEY','LANGFUSE_BASE_URL','OBSERVABILITY_USER_HASH_KEY','APP_VERSION','BRIEFING_PROMPT_VERSION'] as const;
  if (fields.some(k => !env[k])) return { status: 'disabled', reason: 'missing_config' };
  try {
    const url = new URL(env.LANGFUSE_BASE_URL!);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || fields.some(k => env[k]!.includes('replace-with')) || env.OBSERVABILITY_USER_HASH_KEY!.length < 32) throw Error();
  } catch { return { status: 'disabled', reason: 'invalid_config' }; }
  return { publicKey: env.LANGFUSE_PUBLIC_KEY!, secretKey: env.LANGFUSE_SECRET_KEY!, baseUrl: env.LANGFUSE_BASE_URL!, hashKey: env.OBSERVABILITY_USER_HASH_KEY!, appVersion: env.APP_VERSION!, promptVersion: env.BRIEFING_PROMPT_VERSION!, captureContent: env.LANGFUSE_CAPTURE_CONTENT === 'true' };
}
export function pseudonym(id: string, key: string): string { return createHmac('sha256', key).update('main-quest-user-v1\0' + id).digest('hex'); }
export function traceId(id: string): string {
  const value = id.replaceAll('-', '').toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(value) || /^0+$/.test(value)) throw Error('invalid_trace_id');
  return value;
}
const label = (s: string) => /^[a-zA-Z0-9._:/-]{1,100}$/.test(s) ? s : 'redacted';
const number = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function metrics(value: BriefingEvent['usage']) {
  if (!value) return undefined;
  return Object.fromEntries(['input','output','total','cache_creation_input_tokens','cache_read_input_tokens'].flatMap(k => { const n = value[k as keyof typeof value]; return number(n) ? [[k,n]] : []; }));
}
const clean = (s: string, max: number) => s.slice(0, max).replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]').replace(/\b(?:sk-|pk-|Bearer\s+)\S+/gi, '[credential]').replace(/\b\d{7,}\b/g, '[number]');
export function payload(event: BriefingEvent, config: Config) {
  const metadata = { appVersion: label(config.appVersion), promptVersion: label(event.promptVersion ?? config.promptVersion), contractVersion: label(event.version), status: event.status === 'ok' ? 'ok' : 'unavailable', durationMs: number(event.durationMs) ? event.durationMs : 0, evidenceCount: number(event.evidenceCount) ? Math.min(12, Math.floor(event.evidenceCount)) : 0, ...(event.authenticatedUserId ? { userPseudonym: pseudonym(event.authenticatedUserId, config.hashKey) } : {}) };
  let content;
  if (config.captureContent && event.content?.classification === 'synthetic_public_eval') {
    const c = event.content;
    content = { classification: c.classification, ticker: /^[A-Z0-9.-]{1,12}$/.test(c.ticker) ? c.ticker : 'REDACTED', question: clean(c.question,500), answer: clean(c.answer,6000), evidence: c.evidence.slice(0,12).map(e => ({ title: clean(e.title,200), url: publicUrl(e.url) })) };
  }
  const measuredStageDurations = Object.fromEntries(['retrieval','input_assembly','generation'].flatMap(k => { const n = event.measuredStageDurations?.[k as keyof NonNullable<BriefingEvent['measuredStageDurations']>]; return number(n) ? [[k,n]] : []; }));
  return { traceId: traceId(event.traceId), metadata: {...metadata, measuredStageDurations}, content, model: event.model ? label(event.model) : undefined, usage: metrics(event.usage), costUsd: metrics(event.costUsd) };
}
function publicUrl(value: string | null) { try { const u = new URL(value!); return u.protocol === 'https:' && !u.username && !u.password ? u.origin : null; } catch { return null; } }
export interface Driver { record(event: BriefingEvent, safe: ReturnType<typeof payload>): Promise<void>; score(id: string, trace: string, value: 0 | 1): Promise<void> }
export function createAdapter(config: Config | TelemetryState, driver?: Driver) {
  return {
    async verifiedFeedback(event: { traceId: string; vote: 'up' | 'down'; version: string; verifiedOwnership: true; scoreId: string }): Promise<TelemetryState> {
      if (event.verifiedOwnership !== true || !['up','down'].includes(event.vote) || !/^[a-zA-Z0-9_-]{16,128}$/.test(event.scoreId)) return { status: 'failed', reason: 'export' };
      if ('status' in config) return config;
      try {
        if (!driver) throw Error();
        const id = traceId(event.traceId);
        await driver.score(event.scoreId,id,event.vote === 'up' ? 1 : 0);
        return { status: 'flush_completed_unverified', traceId: id };
      } catch { return { status: 'failed', reason: 'export' }; }
    },
    async record(event: BriefingEvent): Promise<TelemetryState> {
      if ('status' in config) return config;
      if (!driver) return { status: 'failed', reason: 'initialization' };
      try { const safe = payload(event, config); await driver.record(event, safe); return { status: 'flush_completed_unverified', traceId: safe.traceId }; }
      catch { return { status: 'failed', reason: 'export' }; }
    },
    async feedback(user: { id: string } | null, briefingId: string, value: unknown, repository: FeedbackRepository) {
      if (!user?.id) throw Error('unauthorized');
      if (value !== 0 && value !== 1) throw Error('invalid_feedback');
      // Atomic owned-row check + local persistence. A client trace ID is never accepted.
      const saved = await repository.saveOwned({ userId: user.id, briefingId, value });
      if (!saved) throw Error('not_found');
      if ('status' in config) return { saved: true as const, telemetry: config };
      try {
        if (!driver) throw Error();
        await driver.score(saved.feedbackId, traceId(saved.traceId), value);
        return { saved: true as const, telemetry: { status: 'flush_completed_unverified' as const, traceId: traceId(saved.traceId) } };
      } catch { return { saved: true as const, telemetry: { status: 'failed' as const, reason: 'export' as const } }; }
    }
  };
}
export interface FeedbackRepository {
  /** MUST atomically verify authenticated user owns briefing and persist vote; return null for absent/foreign row. */
  saveOwned(input: { userId: string; briefingId: string; value: 0 | 1 }): Promise<{ feedbackId: string; traceId: string } | null>;
}

