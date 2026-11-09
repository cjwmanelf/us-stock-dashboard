const assert=require('node:assert/strict');const{resolve}=require('node:path');
(async()=>{const{loadService}=await import('../tools/quest-evaluation/src/service-loader.mjs');
const asOf='2026-11-09T03:00:00Z',src=(id,date,ticker='AAPL')=>({id,title:'Synthetic scheduled event',publishedAt:date,ticker,kind:'earnings',url:null});
async function run(sources,answer='Provided title [s1].',status='ok',reference=asOf,fail=false){return(await loadService(resolve('src/lib/briefing/service.ts'),{env:{BRIEFING_LLM_PROVIDER:'anthropic',BRIEFING_LLM_MODEL:'claude-haiku-5-5',ANTHROPIC_API_KEY:'mock-v6'},fetchImpl:async()=>new Response(JSON.stringify({type:'message',role:'assistant',stop_reason:fail?'max_tokens':'end_turn',content:[{type:'text',text:JSON.stringify({status,answer:status==='insufficient_evidence'?'':answer,sourceIds:status==='insufficient_evidence'?[]:['s1']})}]}))}).generate({ticker:'AAPL',question:'Scheduled or completed?'},'offline-v6',sources,reference)).result;}
const future=src('s1','2026-11-09T03:00:01Z');const a=await run([future]);assert.equal(a.status,'ok');assert(a.answer.startsWith('Provided title [s1].\n\n'));assert(a.answer.includes('날짜 안내:'));assert(a.answer.includes('단정할 수 없습니다'));assert.equal(a.version,'briefing-v6-temporal-notice');
assert.equal((await run([future],a.answer)).answer,a.answer,'exact notice is not duplicated');
assert((await run([future],'','insufficient_evidence')).answer.includes('날짜 안내:'));
for(const date of [null,'bad','2026-11-09T03:00:00Z','2026-11-09T02:59:59Z','2026-11-09T12:00:00+09:00'])assert(!(await run([src('s1',date)])).answer.includes('날짜 안내:'));
assert((await run([src('s1','2026-11-09T12:00:01+09:00')])).answer.includes('날짜 안내:'));
for(const invalid of ['bad',''])assert(!(await run([future],undefined,'ok',invalid)).answer.includes('날짜 안내:'));
assert(!(await run([future],undefined,'ok',asOf,true)).answer.includes('날짜 안내:'));assert(!(await run([])).answer.includes('날짜 안내:'));
assert(!(await run([src('s1',future.publishedAt,'MSFT')])).answer.includes('날짜 안내:'));
const multi=await run([future,src('s2',future.publishedAt),src('s2',future.publishedAt),src('foreign',future.publishedAt,'MSFT'),src('bad[id]',future.publishedAt)]);
assert(multi.answer.includes('[s1] [s2]'));assert(!multi.answer.includes('[foreign]'));assert(!multi.answer.includes('[bad[id]]'));assert.equal((multi.answer.match(/\[s2\]/g)||[]).length,1);
console.log('PASS v6 future/equal/past/timezone/invalid/null/irrelevant/multiple/dedupe/abstention/unavailable guard; no inference calls');
})().catch(e=>{console.error(e);process.exitCode=1});
