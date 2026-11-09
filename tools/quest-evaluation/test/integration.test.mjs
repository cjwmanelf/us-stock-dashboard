import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect } from '../src/collect.mjs';
import { readSnapshots } from '../src/store.mjs';
import { joinCaptured } from '../src/join.mjs';
const token = 'synthetic-evaluation-token-32-characters';
const cases = [{ id: 'mock', inputOrigin: 'synthetic', split: 'development', request: { ticker: 'AAPL' } }];
test('evaluation token requires explicit local mode and never enters stored errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'quest-local-'));
  try {
    const options = { cases, version: 'v1', live: true, directory: dir, endpoint: 'http://localhost:3000/api/briefing',
      cookie: 'synthetic-cookie', evalToken: token, allowHttp: true, delayMs: 0 };
    let calls = 0;
    await collect({ ...options, localEval: true, fetchImpl: async (_, init) => {
      calls++; assert.equal(init.headers['x-briefing-eval-token'], token); throw new Error(token);
    } });
    await collect({ ...options, fetchImpl: async (_, init) => {
      calls++; assert.equal(init.headers['x-briefing-eval-token'], undefined); return new Response('{}', { status: 403 });
    } });
    assert.equal(calls, 2);
    assert.ok(!JSON.stringify(await readSnapshots(dir)).includes(token));
    for (const endpoint of ['https://app.vercel.app/api/briefing', 'http://example.com/api/briefing', 'https://localhost/api/briefing']) {
      await assert.rejects(collect({ ...options, localEval: true, endpoint, fetchImpl: () => { throw new Error('Must not fetch'); } }));
    }
    await assert.rejects(collect({ ...options, localEval: true, cookie: undefined }));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('independent input join rejects trace, request, timestamp, origin and version mismatches', () => {
  const record = { schema: 'quest-observation-v1', inputOrigin: 'synthetic', expectedVersion: 'v1', request: { ticker: 'AAPL' },
    response: { traceId: 'trace', asOf: '2026-11-09T00:00:00.000Z', version: 'v1' } };
  const capture = { schema: 'briefing-evidence-v1', inputOrigin: 'synthetic', evidenceOrigin: 'independent-input',
    traceId: 'trace', request: { ticker: 'AAPL', question: '' }, asOf: record.response.asOf,
    evidence: [{ id: 'input-source', ticker: 'MSFT' }] };
  assert.equal(joinCaptured(record, capture).evidence[0].ticker, 'MSFT');
  assert.equal(record.evidence, undefined);
  for (const patch of [{ traceId: 'different' }, { request: { ticker: 'MSFT', question: '' } },
    { asOf: '2026-11-10T00:00:00.000Z' }, { inputOrigin: 'real' }, { evidenceOrigin: 'output' }]) {
    assert.throws(() => joinCaptured(record, { ...capture, ...patch }));
  }
  assert.throws(() => joinCaptured({ ...record, expectedVersion: 'v2' }, capture));
});
