/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness loads TS without adding dependencies. */
// No extra test dependency: compile the application TS through the installed TypeScript.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const original = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  return original.call(this, name.startsWith('@/') ? path.resolve(__dirname, '../src', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
}).outputText, file);
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const { withGameAuth, gameOptions, originAllowed, consumeRate } = require('../src/lib/game-api.ts');
const { aggregateHistory } = require('../src/lib/history.ts');
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
const request = (token, origin) => new Request('http://localhost/api/game/test', { headers: {
  ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {})
}});
test('CORS restricts exact hosts and handles preflight without cookies', () => {
  for (const origin of [null, 'http://localhost:5544', 'http://127.0.0.1:1234', 'https://farmtwin-web.vercel.app']) assert.equal(originAllowed(origin), true);
  for (const origin of ['null', 'https://evil.test', 'http://localhost.evil:33', 'http://localhost:3/path', 'https://localhost:3']) assert.equal(originAllowed(origin), false);
  const response = gameOptions(request(null, 'http://localhost:3333'));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3333');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.equal(gameOptions(request(null, 'https://evil.test')).status, 403);
});
test('environment allowlist replaces defaults', () => {
  process.env.GAME_API_ALLOWED_ORIGINS = 'https://only.test';
  assert.equal(originAllowed('https://only.test'), true);
  assert.equal(originAllowed('http://localhost:4'), false);
  delete process.env.GAME_API_ALLOWED_ORIGINS;
});
test('missing and fake tokens return 401 and never reach data handler', async () => {
  let reached = false;
  const handler = withGameAuth(async () => { reached = true; }, () => ({ auth: { getUser: async () => ({ data: { user: null }, error: {} }) } }));
  for (const token of [null, 'fake-token']) {
    const response = await handler(request(token));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
  }
  assert.equal(reached, false);
});
test('validated user token propagates to PostgREST; users cannot select another user', async () => {
  const calls = [];
  const factory = (url, key, token) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
    headers: { Authorization: `Bearer ${token}` },
    fetch: async (input, init) => {
      const url = new URL(String(input));
      const bearer = new Headers(init.headers).get('Authorization');
      calls.push({ path: url.pathname, bearer });
      const user = bearer === 'Bearer token-a' ? 'user-a' : 'user-b';
      if (url.pathname.endsWith('/user')) return Response.json({ id: user, aud: 'authenticated', email: 'test@example.invalid' });
      // Fake PostgREST models RLS: authenticated user AND explicit filter must match.
      const selected = url.searchParams.get('user_id');
      return Response.json(selected === `eq.${user}` ? [{ user_id: user, ticker: user === 'user-a' ? 'AAPL' : 'MSFT' }] : []);
    }
  }});
  const handler = withGameAuth(async (req, { db, userId }) => {
    const { data } = await db.from('holdings').select('*').eq('user_id', new URL(req.url).searchParams.get('user_id') ?? userId);
    return { data };
  }, factory);
  assert.equal((await (await handler(request('token-a'))).json()).data[0].ticker, 'AAPL');
  assert.equal((await (await handler(request('token-b'))).json()).data[0].ticker, 'MSFT');
  assert.deepEqual((await (await handler(new Request('http://localhost/api/game/test?user_id=user-b', { headers: { Authorization: 'Bearer token-a' } }))).json()).data, []);
  assert.equal(calls.filter(c => c.path.endsWith('/user')).length, 3);
  assert.equal(calls.every(c => ['Bearer token-a', 'Bearer token-b'].includes(c.bearer)), true);
});
test('rate limit is per-user and resets; errors do not leak details', async () => {
  process.env.GAME_API_RATE_LIMIT_PER_MINUTE = '2';
  assert.equal(consumeRate('rate-a', 100), 0);
  assert.equal(consumeRate('rate-a', 100), 0);
  assert.equal(consumeRate('rate-a', 100), 60);
  assert.equal(consumeRate('rate-b', 100), 0);
  assert.equal(consumeRate('rate-a', 60100), 0);
  delete process.env.GAME_API_RATE_LIMIT_PER_MINUTE;
  const handler = withGameAuth(async () => { throw new Error('SECRET'); }, () => ({ auth: { getUser: async () => ({ data: { user: { id: 'error-user' } } }) } }));
  const response = await handler(request('secret-token'));
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes('SECRET'), false);
});
test('history uses Monday UTC buckets and last actual balance', () => {
  const points = [{ date: '2026-10-18', krw: 1 }, { date: '2026-10-19', krw: 2 }, { date: '2026-10-20', krw: 3 }];
  assert.deepEqual(aggregateHistory(points, 'week'), [points[0], points[2]]);
  assert.deepEqual(aggregateHistory(points, 'month'), [points[2]]);
  assert.deepEqual(aggregateHistory([], 'year'), []);
});
test('all route handlers scope database reads; summary partials, history and feed contracts', async () => {
  const api = require('../src/lib/game-api.ts');
  const originalAuth = api.withGameAuth;
  const originals = [];
  const stub = (file, exports) => {
    const resolved = require.resolve(file);
    originals.push([resolved, require.cache[resolved]]);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
  };
  const calls = [];
  let quoted = true;
  const rows = {
    holdings: [{ ticker: 'AAPL', quantity: 1, avg_price: 90, buy_fx_rate: 1300 }],
    watchlist: [{ ticker: 'MSFT' }],
    portfolio_snapshots: [{ snapshot_date: '2026-10-20', total_usd: 100, total_krw: 140000, fx_rate: 1400 }]
  };
  const db = { from(table) {
    const chain = {
      select() { return chain; },
      eq(column, user) { calls.push({ table, column, user }); return chain; },
      order() { return chain; }, range() { return chain; },
      then(resolve) { return Promise.resolve({ data: rows[table], error: null }).then(resolve); }
    };
    return chain;
  }};
  api.withGameAuth = handler => req => handler(req, { db, userId: 'route-user' });
  stub('../src/lib/quotes.ts', { getQuotes: async () => quoted ? { AAPL: { ticker: 'AAPL', price: 100, prevClose: 98, asOf: null } } : {} });
  stub('../src/lib/fx.ts', { getUsdKrwRate: async () => ({ rate: 1400, date: '2026-10-20' }) });
  const item = { id: 'n1', ticker: 'MSFT', type: 'news', title: 'headline', url: null, source: 'test', timestamp: 1000, dateLabel: '1970-01-01' };
  stub('../src/lib/feed.ts', {
    getFeed: async tickers => { assert.deepEqual(tickers, ['AAPL', 'MSFT']); return [item]; },
    getMarketHeadlines: async () => [{ source: 'test', label: 'test', items: [item] }]
  });
  try {
    const summary = require('../src/app/api/game/summary/route.ts').GET;
    assert.equal((await summary(request('x'))).totals.totalUsd, 100);
    quoted = false;
    const partial = await summary(request('x'));
    assert.equal(partial.totals.totalUsd, null);
    assert.equal(partial.holdings[0].weightPct, null);
    const history = require('../src/app/api/game/history/route.ts').GET;
    assert.equal((await history(new Request('http://local?range=month'))).points[0].usd, 100);
    assert.equal((await history(new Request('http://local?range=invalid'))).status, 400);
    const feed = require('../src/app/api/game/feed/route.ts').GET;
    assert.equal((await feed(new Request('http://local?tab=watchlist'))).items[0].publishedAt, '1970-01-01T00:00:01.000Z');
    assert.equal((await feed(new Request('http://local?tab=market'))).groups.length, 1);
    assert.equal((await feed(new Request('http://local?tab=invalid'))).status, 400);
    assert.equal(calls.every(c => c.column === 'user_id' && c.user === 'route-user'), true);
  } finally {
    api.withGameAuth = originalAuth;
    for (const [resolved, old] of originals) { if (old) require.cache[resolved] = old; else delete require.cache[resolved]; }
  }
});
test('authenticated over-limit returns 429 Retry-After and missing config returns 503', async () => {
  process.env.GAME_API_RATE_LIMIT_PER_MINUTE = '1';
  const handler = withGameAuth(async () => ({ ok: true }), () => ({ auth: { getUser: async () => ({ data: { user: { id: 'limited-route' } } }) } }));
  assert.equal((await handler(request('valid'))).status, 200);
  const limited = await handler(request('valid'));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  delete process.env.GAME_API_RATE_LIMIT_PER_MINUTE;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  try { assert.equal((await handler(request('valid'))).status, 503); }
  finally { process.env.NEXT_PUBLIC_SUPABASE_URL = url; }
});
