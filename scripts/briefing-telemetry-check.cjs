// Offline integration: real service -> bridge -> adapter -> SDK, memory exporter only.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
const root = resolve(__dirname, '../src/lib/briefing');
const cache = new Map();
const spans = [];
let driver;
let feed = [{ id: 'n-AAPL-1', ticker: 'AAPL', title: 'Public headline', url: 'https://example.test/news', timestamp: 1700000000000, type: 'news' }];
let feedStarted, feedEnded, providerStarted, providerEnded, calls = 0, providerMode = 'ok';
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
function load(file) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = { exports: {} }; cache.set(file, loaded);
  const nativeRequire = createRequire(file);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = id => {
    if (id === 'server-only') return {};
    if (id === '@/lib/feed') return { getFeed: async () => { feedStarted = Date.now(); await pause(); feedEnded = Date.now(); return feed; } };
    if (id.startsWith('./')) return load(resolve(dirname(file), id + '.ts'));
    return nativeRequire(id);
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(localRequire, loaded, loaded.exports);
  if (file === resolve(root, 'telemetry/sdk.ts')) {
    const original = loaded.exports.createSdkDriver;
    loaded.exports.createSdkDriver = config => {
      driver = original(config, { export: (batch, done) => { spans.push(...batch); done({ code: 0 }); }, shutdown: async () => {} });
      return driver;
    };
  }
  return loaded.exports;
}
const config = {
  LANGFUSE_ENABLED: 'true', LANGFUSE_PUBLIC_KEY: 'pk-offline-test', LANGFUSE_SECRET_KEY: 'sk-offline-test',
  LANGFUSE_BASE_URL: 'https://example.test', OBSERVABILITY_USER_HASH_KEY: 'offline-hash-key-12345678901234567890',
  APP_VERSION: 'test-v1', BRIEFING_PROMPT_VERSION: 'test-p1', LANGFUSE_CAPTURE_CONTENT: 'false',
  BRIEFING_EVAL_MODE: 'false', BRIEFING_TRACE_CONTENT: 'false', BRIEFING_LLM_API_KEY: 'offline-provider-key',
  BRIEFING_LLM_MODEL: 'offline-model', BRIEFING_LLM_BASE_URL: 'https://provider.example.test/v1',
};
const saved = Object.fromEntries(Object.keys(config).map(k => [k, process.env[k]]));
const originalFetch = global.fetch;
Object.assign(process.env, config);
global.fetch = async (url, options) => {
  assert.equal(url, 'https://provider.example.test/v1/chat/completions', 'Unexpected network destination');
  assert.equal(options.method, 'POST'); calls++; providerStarted = Date.now(); await pause(); providerEnded = Date.now();
  return new Response(JSON.stringify({ choices: [{ message: { content: providerMode === 'ok' ? JSON.stringify({ answer: 'Public headline [n-AAPL-1]', sourceIds: ['n-AAPL-1'] }) : 'invalid-json' } }], usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 } }));
};
const millis = time => time[0] * 1000 + time[1] / 1e6;
async function verify(trace) {
  const before = spans.length;
  const delivery = await load(resolve(root, 'observability.ts')).recordBriefingTrace(trace);
  assert.equal(delivery.status, 'flush_completed_unverified');
  const batch = spans.slice(before);
  const parent = batch.find(s => s.name === 'quest.briefing');
  assert(parent);
  assert.equal(batch.length, trace.stageTimings.length + 1);
  assert.equal(new Set(batch.map(s => s.spanContext().traceId)).size, 1);
  assert.equal(parent.spanContext().traceId, trace.traceId.replaceAll('-', ''));
  for (const stage of trace.stageTimings) {
    const child = batch.find(s => s.name === 'quest.' + stage.name);
    assert(child, stage.name + ' missing from actual app trace');
    assert.equal(Math.round(millis(child.startTime)), Date.parse(stage.startedAt));
    assert.equal(Math.round(millis(child.endTime)), Date.parse(stage.endedAt));
    assert.equal(child.parentSpanContext.spanId, parent.spanContext().spanId);
    if (stage.name === 'generation') {
      assert.equal(child.attributes['langfuse.observation.type'], 'generation');
      assert.equal(child.attributes['langfuse.observation.model.name'], 'offline-model');
      assert.deepEqual(JSON.parse(child.attributes['langfuse.observation.usage_details']), { input: 12, output: 3, total: 15 });
      assert.equal(child.attributes['langfuse.observation.level'], stage.status === 'error' ? 'ERROR' : 'DEFAULT');
    }
  }
  assert(!JSON.stringify(batch.map(s => s.attributes)).includes('offline-provider-key'));
  assert(!JSON.stringify(batch.map(s => s.attributes)).includes('private test question'));
}
(async () => {
  // OTel batch timers are unref'ed; keep this standalone test alive while flushing.
  const deadline = setTimeout(() => { console.error('FAIL: telemetry integration timed out'); process.exit(1); }, 30000);
  try {
    const service = load(resolve(root, 'service.ts'));
    const input = { ticker: 'AAPL', question: 'private test question' };
    const first = await service.generateBriefing(input, '550e8400-e29b-41d4-a716-446655440001');
    assert.equal(first.result.status, 'ok');
    assert.deepEqual(first.trace.stageTimings.map(s => s.name), ['retrieval', 'input_assembly', 'generation']);
    const [retrieval, assembly, generation] = first.trace.stageTimings;
    assert(Date.parse(retrieval.startedAt) <= feedStarted && Date.parse(retrieval.endedAt) >= feedEnded);
    assert(Date.parse(assembly.startedAt) >= Date.parse(retrieval.endedAt));
    assert(Date.parse(generation.startedAt) <= providerStarted && Date.parse(generation.endedAt) >= providerEnded);
    await verify(first.trace);
    providerMode = 'bad';
    const failed = await service.generateBriefing(input, '550e8400-e29b-41d4-a716-446655440002');
    assert.equal(failed.result.status, 'unavailable');
    assert.equal(failed.trace.stageTimings.at(-1).status, 'error');
    await verify(failed.trace); // Actual usage survives output validation failure.
    const count = calls;
    delete process.env.BRIEFING_LLM_API_KEY;
    const unconfigured = await service.generateBriefing(input, '550e8400-e29b-41d4-a716-446655440003');
    assert(!unconfigured.trace.stageTimings.some(s => s.name === 'generation'));
    await verify(unconfigured.trace);
    feed = [];
    const empty = await service.generateBriefing(input, '550e8400-e29b-41d4-a716-446655440004');
    assert(!empty.trace.stageTimings.some(s => s.name === 'generation'));
    await verify(empty.trace);
    assert.equal(calls, count, 'Skipped generation must not call provider');
    const frozenAsOf = '2026-01-01T00:00:00.000Z';
    const replay = await service.generateBriefingFromEvidence(input, '550e8400-e29b-41d4-a716-446655440005', [], frozenAsOf);
    assert.equal(replay.result.asOf, frozenAsOf);
    assert.deepEqual(replay.trace.stageTimings.map(s => s.name), ['input_assembly']);
    await verify(replay.trace);
    console.log('PASS: actual service -> bridge -> SDK memory spans; measured boundaries/parentage; generation model/usage/error; skipped generation and replay; no content or network');
  } finally {
    try { await driver?.shutdown(); } finally {
      clearTimeout(deadline); global.fetch = originalFetch;
      for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
