import { configuration, createAdapter, type BriefingEvent, type TelemetryState } from './adapter';
export * from './adapter';
let singleton: Promise<ReturnType<typeof createAdapter>> | undefined;
export function getAdapter() {
  return singleton ??= (async () => {
    const config = configuration(process.env);
    if ('status' in config) return createAdapter(config);
    try { const { createSdkDriver } = await import('./sdk'); return createAdapter(config, createSdkDriver(config)); }
    catch { return createAdapter({ status: 'failed', reason: 'initialization' }); }
  })();
}
export async function recordBriefingTrace(event: BriefingEvent): Promise<TelemetryState> { return (await getAdapter()).record(event); }
export async function recordBriefingFeedback(event: { traceId: string; vote: 'up' | 'down'; version: string; verifiedOwnership: true; scoreId: string }): Promise<TelemetryState> { return (await getAdapter()).verifiedFeedback(event); }

