const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const cache = new Map();
function load(name) {
  const file = resolve(__dirname, '../src/lib/briefing', name + '.ts');
  if (cache.has(file)) return cache.get(file);
  const loadedModule = { exports: {} }; cache.set(file, loadedModule.exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const fn = vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file });
  fn(id => id === 'server-only' ? {} : id.startsWith('./') ? load(id.slice(2)) : require(id), loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
(async () => {
  const { briefingProviderConfig: config } = load('provider-config');
  const oidc = { VERCEL_OIDC_TOKEN: 'test-oidc', BRIEFING_LLM_MODEL: 'openai/gpt-4o-mini' };
  const gateway = 'https://ai-gateway.vercel.sh/v1';
  assert.equal(config({ ...oidc, BRIEFING_LLM_BASE_URL: gateway }).key, 'test-oidc');
  for (const base of [undefined, 'https://example.com/v1', 'http://ai-gateway.vercel.sh/v1', gateway + '/', gateway + '?x=1', gateway + '#x', 'https://ai-gateway.vercel.sh.evil.test/v1', 'https://user@ai-gateway.vercel.sh/v1', 'https://ai-gateway.vercel.sh:443/v1', 'https://ai-gateway.vercel.sh/v2', 'not a url']) {
    assert.equal(config({ ...oidc, BRIEFING_LLM_BASE_URL: base }), undefined);
  }
  assert.equal(config({ ...oidc, BRIEFING_LLM_BASE_URL: gateway, BRIEFING_LLM_MODEL: '' }), undefined);
  assert.equal(config({ ...oidc, BRIEFING_LLM_BASE_URL: gateway, BRIEFING_LLM_MODEL: ' ' }), undefined);
  assert.equal(config({ ...oidc, BRIEFING_LLM_BASE_URL: gateway, BRIEFING_LLM_API_KEY: 'test-direct' }).key, 'test-direct');
  assert.equal(config({ BRIEFING_LLM_API_KEY: 'test-direct', BRIEFING_LLM_MODEL: 'explicit' }).endpoint, 'https://api.openai.com/v1/chat/completions');
  assert.equal(config({ BRIEFING_LLM_API_KEY: 'test-direct', BRIEFING_LLM_MODEL: 'explicit', BRIEFING_LLM_BASE_URL: 'http://example.com/v1' }), undefined);
  assert.match(readFileSync(resolve(__dirname, '../src/lib/briefing/service.ts'), 'utf8'), /redirect: "error"/);
  console.log('PASS: OIDC exact destination allowlist, explicit model, direct-key precedence, HTTPS and redirect safety');
  const guards = load('guards'); const feedback = load('feedback');
  assert.equal(guards.parseInput({ ticker: ' aapl ' }).ticker, 'AAPL');
  for (const input of [{ ticker: 'AAPL', userId: 'other' }, { ticker: '../secret' }, { ticker: 'AAPL', question: 'a'.repeat(501) }, null]) assert.throws(() => guards.parseInput(input));
  const original = process.env.BRIEFING_FEEDBACK_SECRET;
  process.env.BRIEFING_FEEDBACK_SECRET = 'local-test-only-not-a-real-secret-12345';
  try {
    const id = '00000000-0000-4000-8000-000000000001'; const token = feedback.feedbackToken(id, 'owner', 'briefing-test-old');
    feedback.verifyFeedback(token, id, 'owner');
    assert.throws(() => feedback.verifyFeedback(token, id, 'other-user'));
    assert.throws(() => feedback.verifyFeedback(token, '00000000-0000-4000-8000-000000000002', 'owner'));
    assert.throws(() => feedback.verifyFeedback(token + 'x', id, 'owner'));
    assert.equal(feedback.feedbackScoreId(id, 'owner'), feedback.feedbackScoreId(id, 'owner'));
    assert.notEqual(feedback.feedbackScoreId(id, 'owner'), feedback.feedbackScoreId(id, 'other-user'));
    assert(!token.includes('owner'));
    const realNow = Date.now; Date.now = () => realNow() + 3600001;
    try { assert.throws(() => feedback.verifyFeedback(token, id, 'owner')); } finally { Date.now = realNow; }
  } finally { if (original === undefined) delete process.env.BRIEFING_FEEDBACK_SECRET; else process.env.BRIEFING_FEEDBACK_SECRET = original; }
  await assert.rejects(guards.readJson(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(4097) })), e => e.status === 413);
  const release1 = guards.acquire('first'); const release2 = guards.acquire('second');
  assert.throws(() => guards.acquire('third'), e => e.status === 429); release1(); release2();
  for (let n = 0; n < 4; n++) guards.acquire('first')();
  assert.throws(() => guards.acquire('first'), e => e.status === 429);
  const evaluation = load('evaluation-auth');
  const names = ['BRIEFING_EVAL_MODE','BRIEFING_EVAL_USER_ID','BRIEFING_EVAL_REQUEST_TOKEN','VERCEL','VERCEL_ENV'];
  const saved = Object.fromEntries(names.map(k => [k, process.env[k]]));
  try {
    process.env.BRIEFING_EVAL_MODE='true'; process.env.BRIEFING_EVAL_USER_ID='eval-owner'; process.env.BRIEFING_EVAL_REQUEST_TOKEN='local-evaluation-test-only-token-12345'; delete process.env.VERCEL; delete process.env.VERCEL_ENV;
    const normal = new Request('http://localhost/api/briefing');
    assert.equal(evaluation.authorizeEvaluationRequest(normal,'eval-owner'), undefined);
    const authorized = new Request('http://localhost/api/briefing',{headers:{'x-briefing-eval-token':process.env.BRIEFING_EVAL_REQUEST_TOKEN}});
    assert.equal(evaluation.authorizeEvaluationRequest(authorized,'other-owner'), undefined);
    const context = evaluation.authorizeEvaluationRequest(authorized,'eval-owner'); assert(evaluation.isEvaluationContext(context));
    assert.equal(evaluation.isEvaluationContext(), false);
    process.env.VERCEL_ENV='production'; assert.equal(evaluation.authorizeEvaluationRequest(authorized,'eval-owner'),undefined); assert.equal(evaluation.isEvaluationContext(context),false);
    process.env.VERCEL_ENV='preview'; assert.equal(evaluation.authorizeEvaluationRequest(authorized,'eval-owner'),undefined);
  } finally { for (const k of names) { if(saved[k] === undefined) delete process.env[k]; else process.env[k]=saved[k]; } }
  console.log('PASS: ordinary traffic cannot capture; eval owner/token binding; production and preview capture blocked');
  console.log('PASS: input bounds, streamed body limit, HMAC owner/trace/tampering/expiry, stable scores, rate/concurrency limits');
})().catch(e => { console.error(e); process.exitCode = 1; });
