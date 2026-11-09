const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),crypto=require('crypto');
const secret='mock-feedback-secret-only-12345678901234567890';
class BriefingError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const guards={BriefingError,acquire:()=>()=>{},readJson:request=>request.json()};
function load(file,dependencies={},extra={}){const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext('(function(require,module,exports){'+js+'\n})',{Buffer,Date,console,process:{env:{BRIEFING_FEEDBACK_SECRET:secret}},...extra})(n=>n==='server-only'?{}:dependencies[n]??require(n),m,m.exports);return m.exports;}
(async()=>{
  const f=load('src/lib/briefing/feedback.ts',{'./guards':guards});
  const id='00000000-0000-4000-8000-000000000001';
  const token=f.feedbackToken(id,'owner','briefing-v2-issued');assert.equal(f.verifyFeedback(token,id,'owner').version,'briefing-v2-issued');
  const parts=token.split('.');parts[3]=Buffer.from('briefing-v3-forged').toString('base64url');assert.throws(()=>f.verifyFeedback(parts.join('.'),id,'owner'));
  assert.throws(()=>f.verifyFeedback(token,id,'other'));assert.throws(()=>f.verifyFeedback(token,'00000000-0000-4000-8000-000000000002','owner'));
  const sign=s=>crypto.createHmac('sha256',secret).update(s).digest('base64url');const oldBody=id+'.'+(Date.now()+3600000)+'.'+sign('owner');assert.throws(()=>f.verifyFeedback(oldBody+'.'+sign(oldBody),id,'owner'),e=>e.code==='TRACE_NOT_FOUND');
  const logs=[];let stdoutMode='ok',sink='disabled';
  const bridge=load('src/lib/briefing/observability.ts',{'./telemetry/index':{recordBriefingFeedback:async()=>{if(sink==='throw')throw Error('private');return {status:sink};}}},{process:{env:{},stdout:{write:(s,cb)=>{if(stdoutMode==='throw')throw Error('write failed');if(stdoutMode==='callback-error')return cb(Error('write failed'));logs.push(JSON.parse(s));cb();}}}});
  const event={traceId:id,version:'briefing-v2-issued',verifiedOwnership:true,scoreId:f.feedbackScoreId(id,'owner'),vote:'up'};
  assert.equal((await bridge.recordBriefingFeedback(event)).status,'stdout_written_unverified');
  stdoutMode='callback-error';assert.equal((await bridge.recordBriefingFeedback(event)).status,'failed');stdoutMode='throw';sink='throw';assert.equal((await bridge.recordBriefingFeedback(event)).status,'failed');
  sink='flush_completed_unverified';assert.equal((await bridge.recordBriefingFeedback(event)).status,'flush_completed_unverified');
  stdoutMode='ok';sink='throw';assert.equal((await bridge.recordBriefingFeedback(event)).status,'stdout_written_unverified');
  const before=logs.length;assert.equal((await bridge.recordBriefingFeedback({...event,verifiedOwnership:false})).status,'failed');assert.equal(logs.length,before);
  let received;
  const route=load('src/app/api/briefing/feedback/route.ts',{'@/lib/briefing/guards':guards,'@/lib/briefing/feedback':f,'@/lib/briefing/observability':{recordBriefingFeedback:async e=>{received=e;return bridge.recordBriefingFeedback(e);}},'@/lib/briefing/http':{authenticate:async()=> 'owner',json:(body,status)=>new Response(JSON.stringify(body),{status}),failure:e=>new Response(JSON.stringify({code:e.code}),{status:e.status??500})}});
  const request=(t=token)=>new Request('http://localhost',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({traceId:id,token:t,feedback:'down',version:'briefing-untrusted-current'})});
  sink='disabled';const response=await route.POST(request());assert.equal(response.status,202);assert.equal((await response.json()).delivery,'stdout_written_unverified');assert.equal(received.version,'briefing-v2-issued');
  stdoutMode='callback-error';assert.equal((await route.POST(request())).status,503);assert.equal((await route.POST(request(oldBody+'.'+sign(oldBody)))).status,404);
  assert(logs.every(row=>Object.keys(row).sort().join(',')==='event,score,traceId,version'));assert(!JSON.stringify(logs).includes('owner'));assert(!JSON.stringify(logs).includes(secret));
  console.log('PASS: signed issuing version, legacy/tamper/owner denial, stdout/flush/failure delivery matrix, route202/503/404 and no client version trust; no actual vote or network');
})().catch(e=>{console.error(e);process.exitCode=1;});
