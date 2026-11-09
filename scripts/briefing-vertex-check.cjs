const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
let tokenCalls = 0, failAuth = false;
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const file = resolve(__dirname, '../src/lib/briefing', name + '.ts');
  const loadedModule = { exports: {} }; cache.set(name, loadedModule.exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(id => {
    if (id === 'server-only') return {};
    if (id === 'google-auth-library') return { GoogleAuth: class { async getAccessToken() { tokenCalls++; if (failAuth) throw Error('private auth failure'); return 'refreshed-' + tokenCalls; } } };
    if (id === '@/lib/feed') return {};
    return id.startsWith('./') ? load(id.slice(2)) : require(id);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
(async () => {
  // Exercise the installed library's expiry path without contacting Google.
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client();
  let refreshes = 0;
  client.setCredentials({access_token:'cached-test',refresh_token:'refresh-test',expiry_date:Date.now()+3600000});
  client.refreshTokenNoCache = async () => {
    refreshes++;
    return {tokens:{access_token:'renewed-test',expiry_date:Date.now()+3600000},res:null};
  };
  assert.equal((await client.getAccessToken()).token,'cached-test');
  assert.equal(refreshes,0);
  client.credentials.expiry_date=Date.now()-1;
  assert.equal((await client.getAccessToken()).token,'renewed-test');
  assert.equal(refreshes,1);
  const { briefingProviderConfig: config } = load('provider-config');
  const env = { BRIEFING_LLM_PROVIDER: 'vertex', BRIEFING_VERTEX_PROJECT_ID: 'test-project', BRIEFING_VERTEX_LOCATION: 'global', BRIEFING_LLM_MODEL: 'google/gemini-test' };
  for (const field of ['BRIEFING_VERTEX_PROJECT_ID','BRIEFING_VERTEX_LOCATION','BRIEFING_LLM_MODEL']) assert.equal(config({...env,[field]:''}), undefined);
  for (const value of ['evil/path','project?leak','test-project.evil','../test',' test-project']) assert.equal(config({...env,BRIEFING_VERTEX_PROJECT_ID:value}),undefined);
  for (const value of ['https://evil.test','https://aiplatform.googleapis.com','https://aiplatform.googleapis.com@evil.test']) assert.equal(config({...env,BRIEFING_LLM_BASE_URL:value}),undefined);
  assert.equal(config({...env,BRIEFING_LLM_API_KEY:'direct'}),undefined);
  const provider = config(env);
  assert.equal(tokenCalls,0);
  assert.equal(provider.endpoint,'https://aiplatform.googleapis.com/v1/projects/test-project/locations/global/endpoints/openapi/chat/completions');
  assert(Object.isFrozen(provider));
  assert.equal(await provider.getKey(),'refreshed-1');
  assert.equal(await provider.getKey(),'refreshed-2');
  for (const cloud of ['K_SERVICE','K_REVISION','VERCEL','VERCEL_ENV']) await assert.rejects(config({...env,BRIEFING_VERTEX_AUTH:'local-token',BRIEFING_VERTEX_ACCESS_TOKEN:'private-token',[cloud]:'cloud'}).getKey());
  await assert.rejects(config({...env,BRIEFING_VERTEX_ACCESS_TOKEN:'private-token'}).getKey());
  assert.equal(await config({...env,BRIEFING_VERTEX_AUTH:'local-token',BRIEFING_VERTEX_ACCESS_TOKEN:'private-token'}).getKey(),'private-token');
  const names = [...Object.keys(env),'BRIEFING_EVAL_MODE','BRIEFING_EVAL_USER_ID','BRIEFING_EVAL_REQUEST_TOKEN','K_SERVICE','K_REVISION','VERCEL','VERCEL_ENV','BRIEFING_LLM_API_KEY','BRIEFING_LLM_BASE_URL','BRIEFING_VERTEX_ACCESS_TOKEN','BRIEFING_VERTEX_AUTH'];
  const saved = Object.fromEntries(names.map(k=>[k,process.env[k]]));
  const originalFetch = global.fetch;
  try {
    for (const k of names) delete process.env[k];
    Object.assign(process.env,env,{BRIEFING_EVAL_MODE:'true',BRIEFING_EVAL_USER_ID:'owner',BRIEFING_EVAL_REQUEST_TOKEN:'local-test-token-'.repeat(3)});
    const evaluation = load('evaluation-auth');
    const req = new Request('http://localhost/api/briefing',{headers:{'x-briefing-eval-token':process.env.BRIEFING_EVAL_REQUEST_TOKEN}});
    const context = evaluation.authorizeEvaluationRequest(req,'owner');
    assert(evaluation.isEvaluationContext(context));
    for (const cloud of ['K_SERVICE','K_REVISION']) {
      process.env[cloud]='cloud';
      assert.equal(evaluation.authorizeEvaluationRequest(req,'owner'),undefined);
      assert.equal(evaluation.isEvaluationContext(context),false);
      delete process.env[cloud];
    }
    const { generateBriefingFromEvidence: generate } = load('service');
    const callsBeforeEmpty = tokenCalls;
    await generate({ticker:'AAPL'},'empty',[],'2026-11-09T00:00:00Z');
    assert.equal(tokenCalls,callsBeforeEmpty);
    let fetchCalls = 0;
    global.fetch = async (url,options) => {
      fetchCalls++;
      assert.equal(url,provider.endpoint); assert.equal(options.redirect,'error');
      assert.match(options.headers.Authorization,/^Bearer refreshed-/);
      return new Response(JSON.stringify({usage:{prompt_tokens:4,completion_tokens:5,total_tokens:9},choices:[{message:{content:JSON.stringify({answer:'Evidence [s1]',sourceIds:['s1']})}}]}));
    };
    const evidence=[{id:'s1',title:'Public headline',url:null,publishedAt:null,kind:'news'}];
    let out=await generate({ticker:'AAPL'},'test',evidence,'2026-11-09T00:00:00Z');
    assert.equal(out.result.status,'ok'); assert.equal(out.trace.usage.total_tokens,9);
    failAuth=true;
    out=await generate({ticker:'AAPL'},'test',evidence,'2026-11-09T00:00:00Z');
    assert.equal(fetchCalls,1); assert.equal(out.trace.errorCode,'GENERATION_UNAVAILABLE');
    assert.equal(out.trace.stageTimings.at(-1).status,'error');
    assert(!JSON.stringify(out).includes('private auth failure'));
    failAuth=false;
    global.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'Invented [unknown]',sourceIds:['unknown']})}}]}));
    out=await generate({ticker:'AAPL'},'invalid',evidence,'2026-11-09T00:00:00Z');
    assert.equal(out.trace.errorCode,'GENERATION_UNAVAILABLE');
  } finally {
    global.fetch=originalFetch;
    for (const k of names) { if (saved[k] === undefined) delete process.env[k]; else process.env[k]=saved[k]; }
  }
  const { loadService } = await import('../tools/quest-evaluation/src/service-loader.mjs');
  const offline=loadService(resolve(__dirname,'../src/lib/briefing/service.ts'),{env});
  const out=await offline.generate({ticker:'AAPL'},'offline',[{id:'s1',title:'Public',url:null,publishedAt:null,kind:'news'}],'2026-11-09T00:00:00Z');
  assert.equal(out.trace.errorCode,'GENERATION_UNAVAILABLE');
  const { replay } = await import('../tools/quest-evaluation/src/replay.mjs');
  for (const cloud of ['K_SERVICE','K_REVISION']) await assert.rejects(replay({env:{[cloud]:'cloud'}}),/Local only/);
  console.log('PASS: Vertex destination validation, explicit config, fresh token lookup, local token restrictions, auth error spans, usage, cloud capture/replay denial, offline ADC denial');
})().catch(e=>{ console.error(e); process.exitCode=1; });
