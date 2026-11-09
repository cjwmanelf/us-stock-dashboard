const assert=require('node:assert/strict');
const {resolve}=require('node:path');
(async()=>{
  const {loadService}=await import('../tools/quest-evaluation/src/service-loader.mjs');
  const path=resolve(__dirname,'../src/lib/briefing/service.ts');
  const env={BRIEFING_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'mock-anthropic-only-secret',BRIEFING_LLM_MODEL:'claude-test-model'};
  const input={ticker:'AAPL',question:'Summarize public evidence'};
  const evidence=[{id:'s1',title:'Public headline',url:null,publishedAt:null,kind:'news'}];
  const good={type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({answer:'Public headline [s1]',sourceIds:['s1']})}],usage:{input_tokens:10,output_tokens:5,cache_creation_input_tokens:3,cache_read_input_tokens:2}};
  const run=async(e,fetchImpl,items=evidence)=>loadService(path,{env:e,fetchImpl}).generate(input,'00000000-0000-4000-8000-000000000001',items,'2026-11-09T00:00:00Z');
  let seen;
  const out=await run(env,async(url,init)=>{
    assert.equal(url,'https://api.anthropic.com/v1/messages');
    assert.equal(init.headers['x-api-key'],env.ANTHROPIC_API_KEY);
    assert.equal(init.headers['anthropic-version'],'2023-06-01');
    assert.equal(init.headers.Authorization,undefined);
    assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert(init.signal);
    seen=JSON.parse(init.body);assert.equal(seen.max_tokens,1000);assert.equal(seen.stream,false);
    assert.equal(seen.messages.length,1);assert.equal(seen.messages[0].role,'user');
    assert.deepEqual(JSON.parse(seen.messages[0].content),{...input,asOf:'2026-11-09T00:00:00Z',evidence});
    assert.equal(seen.response_format,undefined);assert.equal(seen.temperature,undefined);
    return new Response(JSON.stringify(good));
  });
  assert.equal(out.result.status,'ok');assert.equal(out.trace.usage.prompt_tokens,15);assert.equal(out.trace.usage.total_tokens,20);
  assert.equal(out.trace.usage.cache_read_input_tokens,2);assert.equal(out.trace.stageTimings.at(-1).status,'ok');
  let directSystem;
  await run({BRIEFING_LLM_API_KEY:'mock-direct',BRIEFING_LLM_MODEL:'mock'},async(_,init)=>{ directSystem=JSON.parse(init.body).messages[0].content;return new Response('{}'); });
  assert.equal(seen.system,directSystem,'prompt must remain identical');
  for(const overrides of [{ANTHROPIC_API_KEY:''},{BRIEFING_LLM_MODEL:''},{BRIEFING_LLM_MODEL:'../bad'},{BRIEFING_LLM_BASE_URL:'https://evil.test'},{ANTHROPIC_BASE_URL:'https://evil.test'},{BRIEFING_LLM_API_KEY:'wrong-key'},{ANTHROPIC_API_KEY:'bad\nheader'}]){
    const r=await run({...env,...overrides},()=>{throw Error('must not fetch');});
    assert.equal(r.trace.errorCode,undefined);assert.equal(r.result.status,'unavailable');
  }
  await run(env,()=>{throw Error('empty evidence fetched');},[]);
  for(const response of [
    new Response('private upstream detail',{status:401}),new Response('rate limited',{status:429}),
    new Response('redirect',{status:302,headers:{location:'https://evil.test'}}),
    new Response(JSON.stringify({...good,stop_reason:'max_tokens'})),
    new Response(JSON.stringify({...good,stop_details:{type:'refusal'}})),
    new Response(JSON.stringify({...good,content:[{type:'tool_use',text:'{}'}]})),
    new Response(JSON.stringify({...good,content:[{type:'text',text:'```json\n{}\n```'}]})),
    new Response(JSON.stringify({...good,content:[{type:'text',text:JSON.stringify({answer:'Unknown [bad]',sourceIds:['bad']})}]})),
    new Response('x'.repeat(65537)),new Response('not json')
  ]){
    const r=await run(env,async()=>response);assert.equal(r.trace.errorCode,'GENERATION_UNAVAILABLE');assert.equal(r.trace.stageTimings.at(-1).status,'error');
    assert(!JSON.stringify(r).includes('private upstream detail'));assert(!JSON.stringify(r).includes(env.ANTHROPIC_API_KEY));
  }
  const timeout=await run(env,async()=>{throw new DOMException('timeout','TimeoutError');});assert.equal(timeout.trace.errorCode,'GENERATION_UNAVAILABLE');
  const split=structuredClone(good);const txt=split.content[0].text;split.content=[{type:'text',text:txt.slice(0,10)},{type:'text',text:txt.slice(10)}];
  assert.equal((await run(env,async()=>new Response(JSON.stringify(split)))).result.status,'ok');
  split.content.splice(1,0,{type:'thinking',thinking:'must not surface'},{type:'redacted_thinking',data:'opaque'});
  const recognized=await run(env,async()=>new Response(JSON.stringify(split)));
  assert.equal(recognized.result.status,'ok');assert.equal(recognized.result.answer,'Public headline [s1]');
  for(const content of [[{type:'thinking'}],[{type:'redacted_thinking'}],[],[{type:'text',text:''}],
    [...good.content,{type:'unknown'}],[...good.content,{type:'tool_use'}],[...good.content,{type:'refusal'}],[{type:'text',text:42}]]) {
    assert.equal((await run(env,async()=>new Response(JSON.stringify({...good,content})))).result.status,'unavailable');
  }
  console.log('PASS: Anthropic fixed destination/headers, unchanged prompt, explicit config, usage/cache accounting, response limits, citations, truncation/refusal/errors and real-service loader');
})().catch(e=>{console.error(e);process.exitCode=1;});
