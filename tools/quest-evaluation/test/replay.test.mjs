import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { replay } from '../src/replay.mjs';
import { readSnapshots } from '../src/store.mjs';
import { compare } from '../src/evaluate.mjs';
const root=fileURLToPath(new URL('../private/',import.meta.url));
const app=fileURLToPath(new URL('../../../src/lib/briefing/',import.meta.url));
const cases=JSON.parse(await readFile(new URL('../fixtures/cases.json',import.meta.url)));
const env={BRIEFING_LLM_API_KEY:'mock-secret-key-123456',BRIEFING_LLM_MODEL:'mock-model'};
async function setup(t) {
  await mkdir(root,{recursive:true}); const dir=await mkdtemp(join(root,'replay-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await cp(app,join(dir,'a'),{recursive:true}); await cp(app,join(dir,'b'),{recursive:true});
  // Test-only prompt variant: real service executes both prompts; not a product candidate.
  const service=join(dir,'b','service.ts'), types=join(dir,'b','types.ts');
  await writeFile(service,(await readFile(service,'utf8')).replace('{ role: "system", content: "','{ role: "system", content: "짧게 답하세요. '));
  await writeFile(types,(await readFile(types,'utf8')).replace(/export const VERSION = "[^"]+";/,'export const VERSION = "mock-prompt-v2";'));
  return {baseline:join(dir,'a','service.ts'),candidate:service,directory:join(dir,'run'),cases:[cases[0]],env};
}
function provider(seen, answer) { return async (_,init)=>{
  const body=JSON.parse(init.body); seen.push(body);
  assert.equal(init.headers.Authorization,`Bearer ${env.BRIEFING_LLM_API_KEY}`);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({answer:answer ?? '공개 제목입니다. [synthetic-news-1]',sourceIds:['synthetic-news-1']})}}],usage:{total_tokens:20}}));
}; }
test('dry-run loads genuine distinct versions without keys or calls',async t=>{
  const o=await setup(t); const r=await replay({...o,env:{},fetchImpl:()=>{throw Error('network');}});
  assert.equal(r.mode,'dry-run'); assert.equal(r.maxCalls,2); assert.equal(r.versions[1].version,'mock-prompt-v2');
});
test('real service mocked provider produces comparable private snapshots and exact frozen input',async t=>{
  const o=await setup(t), seen=[]; const r=await replay({...o,mock:true,fetchImpl:provider(seen)});
  assert.equal(r.calls,2); assert.equal(r.comparison.paired,1);
  assert.deepEqual(JSON.parse(seen[0].messages[1].content),JSON.parse(seen[1].messages[1].content));
  assert.notEqual(seen[0].messages[0].content,seen[1].messages[0].content);
  const a=await readSnapshots(join(o.directory,'baseline')),b=await readSnapshots(join(o.directory,'candidate'));
  assert.equal(a[0].provenance,'synthetic'); assert.notEqual(a[0].response.traceId,b[0].response.traceId);
  assert.notEqual(a[0].conversationId,b[0].conversationId); assert.equal(compare(a,b).paired,1);
  assert.ok(!JSON.stringify([a,b]).includes(env.BRIEFING_LLM_API_KEY));
  await assert.rejects(replay({...o,mock:true,fetchImpl:provider([])}));
});
test('missing key, same version, label-only change and invalid frozen input fail before calls',async t=>{
  const o=await setup(t); let calls=0; const fetchImpl=async()=>{calls++;throw Error();};
  await assert.rejects(replay({...o,mock:true,env:{},fetchImpl}));
  await assert.rejects(replay({...o,candidate:o.baseline,fetchImpl}));
  await writeFile(o.candidate,await readFile(o.baseline));
  await assert.rejects(replay({...o,fetchImpl}));
  assert.equal(calls,0);
  await assert.rejects(replay({...o,cases:[{...cases[0],asOf:'bad'}]}));
});
test('failed provider stops immediately and keeps failure without error secrets',async t=>{
  const o=await setup(t); const r=await replay({...o,mock:true,fetchImpl:async()=>{throw Error(env.BRIEFING_LLM_API_KEY);}});
  assert.equal(r.failed,1); assert.equal(r.calls,1);
  const a=await readSnapshots(join(o.directory,'baseline'));
  assert.equal(a[0].errorCode,'generation_failed'); assert.ok(!JSON.stringify(a).includes(env.BRIEFING_LLM_API_KEY));
  assert.throws(()=>compare(a,a));
});
test('provider secret echo is excluded rather than written',async t=>{
  const o=await setup(t); const r=await replay({...o,mock:true,fetchImpl:provider([],env.BRIEFING_LLM_API_KEY+' [synthetic-news-1]')});
  assert.equal(r.failed,1);const a=await readSnapshots(join(o.directory,'baseline'));
  assert.equal(a[0].response,null); assert.equal(a[0].errorCode,'secret_excluded');
});
test('live orchestration with mocked transport validates versions without relabeling output',async t=>{
  const o=await setup(t),seen=[];
  const r=await replay({...o,live:true,fetchImpl:provider(seen)});
  assert.equal(r.mode,'live'); assert.equal(r.calls,2);
  const a=await readSnapshots(join(o.directory,'baseline')),b=await readSnapshots(join(o.directory,'candidate'));
  // Observed flag tests live plumbing only: these temporary mocked records are deleted.
  assert.equal(a[0].provenance,'observed'); assert.equal(compare(a,b).paired,1);
});
test('CLI dry-run loads supplied artifacts and excludes credentials',async t=>{
  const o=await setup(t);
  const {spawnSync}=await import('node:child_process');
  const cli=fileURLToPath(new URL('../replay.mjs',import.meta.url));
  const r=spawnSync(process.execPath,[cli,'--baseline',o.baseline,'--candidate',o.candidate,'--limit','1'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr); assert.equal(JSON.parse(r.stdout).mode,'dry-run');
  assert.ok(!r.stdout.includes(env.BRIEFING_LLM_API_KEY));
});

test('Anthropic replay preserves native usage and uses fixed Messages endpoint',async t=>{
  const o=await setup(t);
  const anthropic={BRIEFING_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'mock-anthropic-replay-secret',BRIEFING_LLM_MODEL:'claude-test-model'};
  let calls=0;
  const fetchImpl=async(url,init)=>{
    calls++;assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(init.headers['x-api-key'],anthropic.ANTHROPIC_API_KEY);
    const body=JSON.parse(init.body);assert.equal(body.messages.length,1);assert(body.system);
    return new Response(JSON.stringify({type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({answer:'Public headline [synthetic-news-1]',sourceIds:['synthetic-news-1']})}],usage:{input_tokens:10,output_tokens:5,cache_read_input_tokens:2}}));
  };
  await replay({...o,env:anthropic,fetchImpl});assert.equal(calls,0);
  await assert.rejects(replay({...o,mock:true,env:{...anthropic,ANTHROPIC_API_KEY:''},fetchImpl}),/Provider key and model/);assert.equal(calls,0);
  const r=await replay({...o,mock:true,env:anthropic,fetchImpl});assert.equal(r.calls,2);assert.equal(r.comparison.paired,1);
  const rows=await readSnapshots(join(o.directory,'baseline'));assert.equal(rows[0].usage.cache_read_input_tokens,2);assert.equal(rows[0].usage.total_tokens,17);
  assert(!JSON.stringify(rows).includes(anthropic.ANTHROPIC_API_KEY));assert.equal(rows[0].provenance,'synthetic');
});
