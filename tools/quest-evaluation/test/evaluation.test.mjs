import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { evaluate, report, compare, digest } from '../src/evaluate.mjs';
import { saveSnapshot, readSnapshots } from '../src/store.mjs';
import { collect } from '../src/collect.mjs';

const cases = JSON.parse(await readFile(new URL('../fixtures/cases.json', import.meta.url)));
test('versioned synthetic fixture corpus has not drifted', async () => {
  const manifest=JSON.parse(await readFile(new URL('../fixtures/manifest.json',import.meta.url)));
  const bytes=await readFile(new URL('../fixtures/cases.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.files['cases.json']);
  assert.equal(cases.filter(c=>c.split==='held-out').length,manifest.heldOutCount);
});
function record(index = 0) {
  const c = structuredClone(cases[index]);
  return { provenance:'synthetic', caseId:c.id, split:c.split, request:c.request, evidence:c.evidence,
    evidenceOrigin:'independent-input', asOf:c.asOf, expectedVersion:'baseline-v1', freshConversation:true,
    response:{ answer:c.evidence.length ? '합성 제목 기반 응답입니다.' : '자료를 확인할 수 없습니다.',
      sources:c.evidence.map(s => Object.fromEntries(Object.entries(s).filter(([key]) => key !== "ticker"))), status:c.evidence.length?'ok':'unavailable',
      traceId:'00000000-0000-4000-8000-000000000001', version:'baseline-v1', asOf:c.asOf, limitations:['제목만 제공되었습니다.'] } };
}
test('normal metadata passes, semantic review remains pending', () => {
  const result = evaluate(record()); assert.ok(Object.values(result.checks).every(v => v === 'pass')); assert.ok(result.manual.length);
});
test('source substitution, date fabrication, ticker mismatch and empty-feed hallucination are detected', () => {
  const a = record(); a.response.sources[0].url = 'https://example.invalid/wrong'; assert.equal(evaluate(a).checks.source_fidelity,'fail');
  const b = record(3); b.response.sources[0].publishedAt = b.asOf; assert.equal(evaluate(b).checks.date_fidelity,'fail');
  assert.equal(evaluate(record(4)).checks.ticker_fidelity,'fail');
  const c = record(1); c.response.status='ok'; assert.equal(evaluate(c).checks.no_data,'fail');
});
test('null date and scheduled future earnings retain exact evidence values', () => {
  assert.equal(evaluate(record(3)).checks.date_fidelity,'pass'); assert.equal(evaluate(record(6)).checks.date_fidelity,'pass');
});
test('missing independent evidence stays pending; output citations are not proof', () => {
  const a=record(); a.evidenceOrigin='not-captured'; assert.equal(evaluate(a).checks.source_fidelity,'pending');
});
test('synthetic failures never become observed issue candidates', () => {
  const a=record(); a.response.sources[0].title='wrong'; const r=report([a]); assert.equal(r.issueCandidates.length,0); assert.equal(r.actualObservations,0);
});
test('observed candidates include failure denominators and hashed trace references, never response text', () => {
  const a=record(); a.provenance='observed'; a.response.sources[0].title='PRIVATE_SECRET';
  const b=record(); b.provenance='observed'; b.response.traceId='second';
  const r=report([a,b]); const issue=r.issueCandidates.find(x=>x.criterion==='source_fidelity');
  assert.equal(issue.denominator,2); assert.equal(issue.failures,1); assert.equal(issue.traceRefs[0],digest(a.response.traceId));
  assert.ok(!JSON.stringify(r).includes('PRIVATE_SECRET')); assert.ok(!JSON.stringify(r).includes('synthetic-test-id'));
});
test('comparison pairs identical evidence and rejects reused version or conversation', () => {
  const a=record(), b=record(); b.expectedVersion=b.response.version='candidate-v2';
  assert.equal(compare([a],[b]).paired,1); b.evidence[0].title='different'; assert.equal(compare([a],[b]).paired,0);
  assert.throws(()=>compare([a],[a])); assert.throws(()=>compare([a,a],[]));
});
test('duplicate observed trace IDs cannot inflate the denominator', () => {
  const a=record(); a.provenance='observed'; assert.throws(()=>report([a,a]));
});
test('snapshot writes are content addressed, repeatable and tamper evident', async () => {
  const dir=await mkdtemp(join(tmpdir(),'quest-eval-'));
  try { const a=record(); const saved=await saveSnapshot(dir,a); assert.deepEqual(await readSnapshots(dir),[a]);
    assert.equal((await saveSnapshot(dir,a)).hash,saved.hash); await writeFile(saved.path,'{}'); await assert.rejects(readSnapshots(dir));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('dry run makes zero requests; invalid limits and unsafe URL are rejected', async () => {
  const fetchImpl=()=>{throw new Error('Network forbidden');};
  assert.equal((await collect({cases,version:'v1',fetchImpl})).mode,'dry-run');
  await assert.rejects(collect({cases,version:'v1',limit:11,fetchImpl}));
  await assert.rejects(collect({cases,version:'v1',live:true,endpoint:'https://example.invalid/?token=secret',fetchImpl}));
});
test('mock collection preserves actual trace, sends only contract inputs and stops on auth failure', async () => {
  const dir=await mkdtemp(join(tmpdir(),'quest-eval-')); let calls=0;
  try {
    const out=await collect({cases,version:'baseline-v1',live:true,endpoint:'https://example.invalid/api/briefing',directory:dir,delayMs:0,
      cookie:'private-auth',fetchImpl:async(url,options)=>{ calls++; assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(),['question','ticker']);
        assert.equal(options.headers.Origin,'https://example.invalid');
        return calls===1 ? new Response(JSON.stringify(record().response)) : new Response(JSON.stringify({traceId:'rejected-request',error:{message:'sensitive'}}),{status:401}); }});
    assert.equal(calls,2); assert.equal(out.completed,1); assert.equal(out.failed,1);
    const rows=await readSnapshots(dir); assert.equal(rows.length,2); assert.ok(rows.every(r=>r.evidence===null));
    assert.ok(!JSON.stringify(rows).includes('private-auth')); assert.ok(!JSON.stringify(rows).includes('sensitive'));
    assert.ok(rows.some(r=>r.response?.traceId==='rejected-request'));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
