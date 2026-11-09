import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, report, compare } from '../src/evaluate.mjs';
function record(n = 1) {
  return { provenance: 'observed', caseId: 'offline-review-reproduction', split: 'development',
    expectedVersion: `v${n}`, freshConversation: true, conversationId: `mock-conversation-${n}`,
    request: { ticker: 'AAPL' }, asOf: '2026-11-09T00:00:00.000Z', evidence: [], evidenceOrigin: 'independent-input',
    httpStatus: 200, errorCode: null, response: { traceId: `00000000-0000-4000-8000-00000000000${n}`,
      version: `v${n}`, asOf: '2026-11-09T00:00:00.000Z', sources: [], answer: 'Mock unavailable', status: 'unavailable', limitations: ['mock'] } };
}
test('review: observed pairing requires frozen date and independently unique run identities', () => {
  assert.equal(compare([record(1)], [record(2)]).paired, 1);
  for (const mutate of [r => delete r.asOf, r => r.asOf = 'invalid', r => r.response.asOf = '2026-01-01T00:00:00.000Z',
    r => delete r.conversationId, r => r.conversationId = 'mock-conversation-1', r => delete r.response.traceId,
    r => r.response.traceId = record(1).response.traceId]) {
    const next = record(2); mutate(next); assert.throws(() => compare([record(1)], [next]));
  }
  const old = record(1), next = record(2); delete old.asOf; delete next.asOf;
  next.conversationId = old.conversationId; next.response.traceId = old.response.traceId;
  assert.throws(() => compare([old], [next]));
});
test('review: operational failures cannot be model quality candidates, malformed HTTP 200 can', () => {
  for (const status of [401,403,429,500]) {
    const r = record(); r.httpStatus = status; r.errorCode = 'http_error'; r.response = { traceId: r.response.traceId };
    const result = report([r]); assert.equal(result.issueCandidates.length, 0);
    assert.equal(result.operational.total, 1); assert.equal(result.modelQualityObservations, 0);
  }
  const transport = record(); transport.httpStatus = null; transport.errorCode = 'transport_or_parse_error';
  assert.equal(report([transport]).issueCandidates.length, 0);
  const malformed = record(); malformed.response.answer = null;
  assert.ok(report([malformed]).issueCandidates.some(c => c.criterion === 'contract'));
});
test('review: UUID and parsed credential-free HTTPS URL are required', () => {
  const valid = record(); assert.equal(evaluate(valid).checks.contract, 'pass');
  valid.response.traceId = 'not-a-uuid'; assert.equal(evaluate(valid).checks.contract, 'fail');
  for (const url of ['https://', 'https://user:secret@example.invalid/a', 'http://example.invalid/a']) {
    const r = record(); r.response.sources = [{ id: 'x', title: 'mock', url, publishedAt: null, kind: 'news' }];
    assert.equal(evaluate(r).checks.contract, 'fail');
  }
});
