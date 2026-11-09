import { randomBytes } from 'node:crypto';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseClient } from '@langfuse/client';
import { startObservation } from '@langfuse/tracing';
import type { Config, Driver } from './adapter';

/** Call once per Node process, before requests; do not register a second global OTel provider. */
export function createSdkDriver(config: Config, exporter?: NonNullable<ConstructorParameters<typeof LangfuseSpanProcessor>[0]>['exporter']): Driver & { shutdown(): Promise<void> } {
  const processor = new LangfuseSpanProcessor({ publicKey: config.publicKey, secretKey: config.secretKey, baseUrl: config.baseUrl, mediaUploadEnabled: false,
    exporter,
    shouldExportSpan: ({ otelSpan }) => otelSpan.attributes['langfuse.observation.metadata.questAdapter'] === 'true',
  });
  const sdk = new NodeSDK({ spanProcessors: [processor], instrumentations: [], metricReaders: [], logRecordProcessors: [] });
  sdk.start();
  const client = new LangfuseClient({ publicKey: config.publicKey, secretKey: config.secretKey, baseUrl: config.baseUrl });
  return {
    shutdown: () => sdk.shutdown(),
    async record(event, safe) {
      const end = new Date();
      const start = event.startedAt ? new Date(event.startedAt) : new Date(end.getTime() - safe.metadata.durationMs);
      if (!Number.isFinite(start.getTime()) || start > end) throw Error('invalid_time');
      const root = startObservation('quest.briefing', { metadata: { ...safe.metadata, questAdapter: true, model: safe.model, usage: safe.usage, costUsd: safe.costUsd }, version: safe.metadata.appVersion,
        ...(safe.content ? { input: { ticker: safe.content.ticker, question: safe.content.question }, output: { answer: safe.content.answer, evidence: safe.content.evidence } } : {}),
      }, { startTime: start, parentSpanContext: { traceId: safe.traceId, spanId: randomBytes(8).toString('hex'), traceFlags: 1, isRemote: true } });
      if (!root.otelSpan.isRecording()) { root.end(); throw Error('tracer_not_recording'); }
      try {
        for (const stage of event.stages ?? []) {
          if (!['retrieval','input_assembly','generation'].includes(stage.name)) continue;
          const a = new Date(stage.startedAt), b = new Date(stage.endedAt);
          if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || b < a || a < start || b > end) continue;
          const attrs = { metadata: { questAdapter: true, promptVersion: safe.metadata.promptVersion }, level: stage.status === 'error' ? 'ERROR' as const : 'DEFAULT' as const };
          const child = stage.name === 'generation'
            ? startObservation('quest.generation', { ...attrs, model: safe.model, usageDetails: safe.usage, costDetails: safe.costUsd }, { asType: 'generation', startTime: a, parentSpanContext: root.otelSpan.spanContext() })
            : startObservation(`quest.${stage.name}`, attrs, { startTime: a, parentSpanContext: root.otelSpan.spanContext() });
          child.end(b);
        }
      } finally { root.end(end); }
      await processor.forceFlush();
      // forceFlush resolves SDK buffers, not an end-to-end ingestion receipt.
    },
    async score(id, traceId, value) {
      client.score.create({ id, traceId, name: 'briefing_helpfulness', value, dataType: 'BOOLEAN' });
      await client.score.flush();
    }
  };
}

