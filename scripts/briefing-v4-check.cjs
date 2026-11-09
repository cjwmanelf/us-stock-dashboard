const assert=require('node:assert/strict');
const{resolve}=require('node:path');
(async()=>{
 const{loadService}=await import('../tools/quest-evaluation/src/service-loader.mjs');
 const evidence=[{id:'s1',ticker:'AAPL',title:'합성 테스트: EPS $1.20',kind:'earnings',publishedAt:null,url:null}];
 const good={status:'ok',answer:'제목상 EPS는 $1.20입니다 [s1].',sourceIds:['s1']};
 async function run(model,payload,provider='anthropic'){
  let body;
  const env=provider==='anthropic'?{BRIEFING_LLM_PROVIDER:provider,ANTHROPIC_API_KEY:'mock-v4',BRIEFING_LLM_MODEL:model}:{BRIEFING_LLM_API_KEY:'mock-v4',BRIEFING_LLM_MODEL:model};
  const r=await loadService(resolve('src/lib/briefing/service.ts'),{env,fetchImpl:async(_,init)=>{
   body=JSON.parse(init.body);return new Response(JSON.stringify(provider==='anthropic'?{type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(payload)}]}:{choices:[{message:{content:JSON.stringify(payload)}}]}));
  }}).generate({ticker:'AAPL',question:'요약'},'test-v4',evidence,'2026-11-09T03:00:00Z');return{r,body};
 }
 const {r,body}=await run('claude-haiku-5-5',good);assert.equal(r.result.status,'ok');assert.equal(body.max_tokens,1000);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.output_config.effort,'low');
 const schema=body.output_config.format.schema;assert.equal(body.output_config.format.type,'json_schema');assert.equal(schema.additionalProperties,false);assert.deepEqual(schema.required,['status','answer','sourceIds']);assert.deepEqual(schema.properties.status.enum,['ok','insufficient_evidence']);
 for(const payload of [{...good,answer:'[제목] EPS $1.20 [s1]'},{...good,answer:'EPS $1.20'},{...good,sourceIds:['fake']},{status:'insufficient_evidence',answer:'invented claim',sourceIds:[]}])assert.equal((await run('claude-haiku-5-5',payload)).r.result.status,'unavailable');
 assert.equal((await run('claude-haiku-5-5',{status:'insufficient_evidence',answer:'',sourceIds:[]})).r.result.status,'insufficient_evidence');
 for(const[model,p]of[['claude-other','anthropic'],['other-model','direct']]){const v=await run(model,good,p);assert.equal(v.r.result.status,'ok');assert.equal(v.body.thinking,undefined);assert.equal(v.body.output_config,undefined);}
 console.log('PASS v4: Haiku-only settings/schema, strict brackets and abstention, other-provider compatibility');
})().catch(e=>{console.error(e);process.exitCode=1});
