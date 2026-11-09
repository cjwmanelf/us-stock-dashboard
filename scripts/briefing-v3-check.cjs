const assert=require('node:assert/strict');
const {resolve}=require('node:path');
(async()=>{
  const {loadService}=await import('../tools/quest-evaluation/src/service-loader.mjs');
  const file=resolve(__dirname,'../src/lib/briefing/service.ts');
  const env={BRIEFING_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'mock-v3-only',BRIEFING_LLM_MODEL:'claude-test'};
  const base={id:'fresh-test-source',title:'AAPL announces a public product update',url:null,publishedAt:'2026-11-09T01:00:00Z',kind:'news'};
  const valid={answer:'공개 제품 업데이트 제목입니다. [fresh-test-source]',sourceIds:['fresh-test-source']};
  const abstain={status:'insufficient_evidence',answer:'',sourceIds:[]};
  let calls=0,prompt;
  async function run(text, evidence=[base]) {
    return loadService(file,{env,fetchImpl:async(_,init)=>{
      calls++;prompt=JSON.parse(init.body).system;
      return new Response(JSON.stringify({type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'thinking',thinking:'not exposed'},{type:'text',text}],usage:{input_tokens:10,output_tokens:5}}));
    }}).generate({ticker:'AAPL',question:'공개 근거로 요약해 주세요'},'mock-v3',evidence,'2026-11-09T03:00:00Z');
  }
  for(const text of [JSON.stringify(valid),'```json\n'+JSON.stringify(valid)+'\n```',' \n```json\r\n'+JSON.stringify(valid)+'\r\n```\n ']) {
    const r=await run(text);assert.equal(r.result.status,'ok');assert.equal(r.result.version,'briefing-v6-temporal-notice');assert.equal(r.trace.promptVersion,'briefing-prompt-v5-partial');assert.equal(r.trace.usage.total_tokens,15);
  }
  for(const text of ['prefix '+JSON.stringify(valid),JSON.stringify(valid)+' suffix','```json\n'+JSON.stringify(valid)+'\n```\ntext','```json\n'+JSON.stringify(valid)+'\n```\n```json\n{}\n```','```\n'+JSON.stringify(valid)+'\n```','```json\n'+JSON.stringify(valid),'[]','null',JSON.stringify({answer:'수익 보장',sourceIds:[]}),JSON.stringify({...valid,sourceIds:['unknown']}),JSON.stringify({...valid,answer:'알 수 없는 인용 [unknown]'})]) {
    const r=await run(text);assert.equal(r.result.status,'unavailable');assert.equal(r.trace.errorCode,'GENERATION_UNAVAILABLE');
  }
  const held=await run(JSON.stringify(abstain));assert.equal(held.result.status,'insufficient_evidence');assert.equal(held.trace.stageTimings.at(-1).status,'ok');assert.equal(held.trace.errorCode,undefined);assert(!held.result.answer.includes('not exposed'));
  for(const value of [{...abstain,answer:'수익을 보장합니다'},{...abstain,reason:'임의 사실'},{...abstain,sourceIds:['fresh-test-source']},{answer:'',sourceIds:[]}]) assert.equal((await run(JSON.stringify(value))).result.status,'unavailable');
  const before=calls;
  const mismatch=await run(JSON.stringify(valid),[{...base,ticker:'MSFT'}]);assert.equal(mismatch.result.status,'insufficient_evidence');assert.equal(calls,before);assert(mismatch.result.answer.includes('종목 메타데이터'));
  const mixed=[{...base,ticker:'MSFT'},{...base,id:'other-source',ticker:'AAPL'}];assert.equal((await run(JSON.stringify(valid),mixed)).result.status,'unavailable');
  const smuggled={answer:'Normal [other-source] plus foreign claim [fresh-test-source]',sourceIds:['other-source']};
  assert.equal((await run(JSON.stringify(smuggled),mixed)).result.status,'unavailable');
  assert.equal((await run(JSON.stringify(smuggled),mixed.map(s=>({...s,ticker:'AAPL'})))).result.status,'unavailable');
  assert.equal((await run(JSON.stringify(valid),[{...base,ticker:'aapl'}])).result.status,'ok');
  assert.equal((await run(JSON.stringify(valid),[{...base,ticker:undefined}])).result.status,'ok');
  assert.equal((await run(JSON.stringify(valid),[{...base,ticker:''}])).result.status,'ok');
  assert(prompt.includes('같은 날 그 이전 뉴스도 당일 뉴스'));assert(prompt.includes('kind가 filing이라는 이유만으로 SEC 자료'));assert(prompt.includes('earnings 날짜도 실제 발표일로 단정하지 않는다'));assert(prompt.includes('제목에 없는 사건일'));assert(prompt.includes('ticker가 없으면 제목의 관련성'));
  console.log('PASS v3: whole JSON/fence, no substring recovery, canonical abstention/rejection, explicit mismatch and absent ticker, same-day normal news, prompt/version, v2 thinking extraction preserved; synthetic offline only');
})().catch(e=>{console.error(e);process.exitCode=1;});
