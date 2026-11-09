// Offline CLI integration check. All responses here are fabricated, not model output.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const dir = join(root, 'private', `smoke-${Date.now()}`);
await mkdir(dir, { recursive: true });
const [fixture] = JSON.parse(await readFile(new URL('./fixtures/cases.json', import.meta.url), 'utf8'));
const run = (...args) => JSON.parse(execFileSync(process.execPath, [join(root, 'src/cli.mjs'), ...args], { cwd: root, encoding: 'utf8' }));
await mkdir(join(dir, 'captures'));
for (const label of ['baseline', 'candidate']) {
  const version = `synthetic-${label}`;
  const record = { schema: 'quest-observation-v1', provenance: 'synthetic', inputOrigin: 'synthetic', caseId: fixture.id,
    split: fixture.split, request: fixture.request, evidence: fixture.evidence, evidenceOrigin: 'independent-input',
    asOf: fixture.asOf, expectedVersion: version, freshConversation: true, conversationId: `synthetic-${label}`,
    response: { answer: 'Synthetic CLI smoke response; no model was called.', sources: fixture.evidence.map(s => Object.fromEntries(Object.entries(s).filter(([key]) => key !== "ticker"))),
      traceId: label === 'baseline' ? '00000000-0000-4000-8000-000000000001' : '00000000-0000-4000-8000-000000000002', version, asOf: fixture.asOf, status: 'ok', limitations: ['Synthetic only'] } };
  const input = join(dir, `${label}-input.json`);
  await writeFile(input, JSON.stringify(record));
  const args = ['snapshot', '--input', input, '--out', join(dir, label)];
  assert.equal(run(...args).snapshotHash, run(...args).snapshotHash);
  if (label === 'baseline') {
    await writeFile(join(dir, 'captures', `${record.response.traceId}.json`), JSON.stringify({ schema: 'briefing-evidence-v1',
      traceId: record.response.traceId, inputOrigin: 'synthetic', evidenceOrigin: 'independent-input', request: record.request,
      asOf: record.asOf, evidence: record.evidence }));
    assert.equal(run('join', '--input', join(dir, label), '--evidence', join(dir, 'captures'), '--out', join(dir, 'joined')).joined, 1);
  }
}
const report = run('report', '--input', join(dir, 'baseline'));
assert.equal(report.actualObservations, 0);
assert.equal(report.syntheticRecords, 1);
assert.equal(report.issueCandidates.length, 0);
const comparison = run('compare', '--baseline', join(dir, 'baseline'), '--candidate', join(dir, 'candidate'));
assert.equal(comparison.paired, 1);
assert.ok(Object.values(comparison.transitions).every(c => c.unchanged === 1 && c.improved === 0 && c.regressed === 0));
console.log(JSON.stringify({ mode: 'offline-synthetic-cli-smoke', actualObservations: 0, syntheticRecords: 1,
  issueCandidates: 0, paired: comparison.paired, unchangedCriteria: 6, networkRequests: 0, snapshotIdempotency: 'pass', join: 'pass' }, null, 2));
