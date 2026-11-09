const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),path=require('path');
function compile(file,requireImpl,extra={}){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(path.resolve(file)).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{console,process,Buffer,URL,...extra})(requireImpl,m,m.exports);return m.exports;}
(async()=>{
  const output=[];let calls=0;
  const bridge=compile('src/lib/briefing/observability.ts',n=>n==='server-only'?{}:{recordBriefingTrace:async()=>{calls++;return {status:'disabled'};},recordBriefingFeedback:async()=>({status:'disabled'})},{process:{env:{},stdout:{write:(s,cb)=>{output.push(JSON.parse(s));cb();}}}});
  const traceId='00000000-0000-4000-8000-000000000001';
  const event={traceId,version:'briefing-v3-evidence-contract',promptVersion:'briefing-prompt-v3-contract',status:'insufficient_evidence',durationMs:5,evidenceCount:2,model:'claude-test',usage:{input_tokens:2,output_tokens:3,total_tokens:5,secret:'SENSITIVE'},stageTimings:[{name:'generation',status:'ok',startedAt:'2026-11-09T00:00:00.000Z',endedAt:'2026-11-09T00:00:00.005Z',answer:'SENSITIVE'}],input:{question:'SENSITIVE'},output:{answer:'SENSITIVE'},evidence:[{url:'https://SENSITIVE.test'}],userId:'SENSITIVE',cookie:'SENSITIVE',key:'SENSITIVE'};
  assert.equal((await bridge.recordBriefingTrace(event)).status,'disabled');assert.equal(calls,1);assert.equal(output[0].status,'insufficient_evidence');assert.equal(output[0].usage.total_tokens,5);assert(!JSON.stringify(output).includes('SENSITIVE'));
  assert.deepEqual(Object.keys(output[0]).sort(),['event','traceId','contractVersion','promptVersion','status','stages','evidenceCount','durationMs','model','usage'].sort());
  assert.equal((await bridge.recordBriefingFeedback({traceId,version:event.version,vote:'down',verifiedOwnership:true,scoreId:'testscore00000000',cookie:'SENSITIVE'})).status,'stdout_written_unverified');
  assert.deepEqual(output[1],{event:'briefing_feedback',traceId,version:event.version,score:0});
  await bridge.recordBriefingFeedback({traceId,version:event.version,vote:'up',verifiedOwnership:false});assert.equal(output.length,2);
  const adapter=compile('src/lib/briefing/telemetry/adapter.ts',require);
  const safe=adapter.payload(event,{appVersion:'test',promptVersion:'test',captureContent:false});assert.equal(safe.metadata.status,'insufficient_evidence');
  const {evaluate,report}=await import('../tools/quest-evaluation/src/evaluate.mjs');
  const source={id:'new-only',title:'synthetic',url:null,publishedAt:null,kind:'news',ticker:'OTHER'};
  const record={provenance:'observed',freshConversation:true,expectedVersion:event.version,request:{ticker:'AAPL'},asOf:'2026-11-09T00:00:00Z',evidence:[source],evidenceOrigin:'independent-input',response:{answer:'Cannot confirm from metadata',sources:[source],traceId,version:event.version,asOf:'2026-11-09T00:00:00Z',status:'insufficient_evidence',limitations:[]}};
  const e=evaluate(record);assert.equal(e.checks.contract,'pass');assert.equal(e.checks.no_data,'pending');assert.equal(e.checks.ticker_fidelity,'pending');assert(e.manual.includes('abstention_appropriateness'));
  const r=report([record]);assert.equal(r.operational.total,0);assert.equal(r.abstentions.total,1);assert.equal(r.abstentions.quality,'pending-manual-review');
  const saved=[];let fakeGitChecks=0;
  const {replay}=compile('tools/quest-evaluation/src/replay.mjs',name=>{
    if(name==='node:fs/promises')return {mkdir:async()=>{},realpath:async p=>p,readdir:async()=>[]};
    if(name==='node:child_process')return {execFileSync:()=>{fakeGitChecks++;}};
    if(name==='./store.mjs')return {saveSnapshot:async(_,row)=>saved.push(row)};
    if(name==='./evaluate.mjs')return {digest:JSON.stringify,compare:()=>({status:'metadata-comparison-only'})};
    if(name==='./service-loader.mjs')return {loadService:p=>({version:p,implementationHash:p,generate:async(_,id,evidence,asOf)=>({result:{...record.response,version:p,traceId:id,sources:evidence,asOf},trace:{usage:{total_tokens:5}}})})};
    return require(name);
  },{fetch:()=>{throw Error('No network');}});
  const result=await replay({baseline:'mock-version-a',candidate:'mock-version-b',cases:[{id:'new-integration-only',split:'development',inputOrigin:'synthetic',request:{ticker:'AAPL',question:''},asOf:record.asOf,evidence:[source]}],directory:path.resolve('tools/quest-evaluation/private/mock-integration-never-written'),mock:true,env:{BRIEFING_LLM_API_KEY:'mock-only',BRIEFING_LLM_MODEL:'mock'}});
  assert.equal(fakeGitChecks,1);assert.equal(saved.length,2);assert(saved.every(row=>row.errorCode===null));assert.equal(result.failed,0);assert.equal(result.abstentions,2);assert.equal(result.abstentionQuality,'pending-manual-review');
  console.log('PASS: stdout allowlist/no-content/disabled-sink and feedback semantics, abstention telemetry/evaluation pending, replay operational classification guard');
})().catch(e=>{console.error(e);process.exitCode=1;});
