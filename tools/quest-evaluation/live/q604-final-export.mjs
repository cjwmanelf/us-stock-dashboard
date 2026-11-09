// Offline allowlisted submission export. Never loads credentials or calls a model.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='docs/quest/evidence',priv='tools/quest-evaluation/private';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const pick=(x,keys)=>Object.fromEntries(keys.filter(k=>x[k]!==undefined).map(k=>[k,x[k]]));
const forbidden=new Set(['rawProviderBody','providerRequest','content','thinking','signature','headers','requestHeaders','authorization','cookie','userId','feedbackToken','apiKey','access_token','refresh_token']);
function safeJson(x){if(Array.isArray(x))x.forEach(safeJson);else if(x&&typeof x==='object')for(const [k,v]of Object.entries(x)){assert(!forbidden.has(k),'Forbidden export field: '+k);safeJson(v);}}
function secretScan(bytes){const s=bytes.toString('utf8');assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}|\bAIza[0-9A-Za-z_-]{30,}|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(s),'Credential value pattern');}
function put(path,bytes){secretScan(bytes);mkdirSync(resolve(path,'..'),{recursive:true});if(existsSync(path))assert(readFileSync(path).equals(bytes),'Existing public artifact differs: '+path);else writeFileSync(path,bytes,{flag:'wx'});return sha(bytes);}
const exportFiles={};
function json(name,value){safeJson(value);const path=join(out,name);exportFiles[path]=put(path,Buffer.from(JSON.stringify(value,null,2)+'\n'));}
const sourceFields=['id','ticker','title','url','publishedAt','kind'];
const source=e=>pick(e,sourceFields);
const result=r=>({...pick(r,['answer','traceId','version','asOf','status','limitations']),sources:r.sources.map(source)});
function validatePublic(){
 const m=read(join(out,'final-export-manifest.json'));
 for(const [file,h]of Object.entries(m.files)){const b=readFileSync(file);assert.equal(sha(b),h);secretScan(b);if(file.endsWith('.json'))safeJson(JSON.parse(b));}
 const cs=read(join(out,'final-q606-cases.json')).cases,rs=read(join(out,'final-v6-responses.json')).records;
 assert.equal(cs.length,10);assert.equal(rs.length,20);assert.equal(new Set(rs.map(r=>r.traceId)).size,20);
 const review=read(join(out,'final-blind-review.json'));
 for(const r of rs){assert(cs.some(c=>c.id===r.caseId));assert.equal(r.generatedResult.traceId,r.traceId);assert.equal(r.generatedResult.version,r.version);assert.equal(r.generatedResult.asOf,cs.find(c=>c.id===r.caseId).asOf);assert(review.records.some(j=>j.caseId===r.caseId&&j.traceId===r.traceId&&j.label===r.label));}
 for(const v of ['v1','v2']){const sm=read('tools/quest-evaluation/versions/'+v+'/manifest.json');assert.equal(sm.files.length,14);for(const f of sm.files)assert.equal(sha(readFileSync('tools/quest-evaluation/versions/'+v+'/'+f.path)),f.sha256);}
 const src=read(join(out,'final-source-manifests.json'));assert.equal(sha(readFileSync('src/lib/briefing/service.ts')),src.v6.serviceSha256);
 for(const f of ['.gcloudignore','.dockerignore']){const lines=readFileSync(f,'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#'));assert.equal(lines[0],'**');assert(!lines.some(s=>/^!\/?(?:tools|docs)(?:\/|$)/.test(s)));}
 console.log(JSON.stringify({mode:'offline-public-verification',publicFileCount:Object.keys(m.files).length,cases:10,responses:20,sourceFiles:28,hashes:'pass',credentialPatternScan:'pass',forbiddenFields:'pass',deploymentToolsExcluded:true,modelCalls:0}));
}
if(process.argv.includes('--verify-public')||process.argv.includes('--smoke-public')){
 validatePublic();
 if(process.argv.includes('--smoke-public')){
  const {loadService}=await import('../src/service-loader.mjs');
  const c=read(join(out,'final-q606-cases.json')).cases[0];let mocks=0;
  for(const [path,version]of [['tools/quest-evaluation/versions/v1/service.ts','briefing-v1'],['tools/quest-evaluation/versions/v2/service.ts','briefing-v2-anthropic-text'],['src/lib/briefing/service.ts','briefing-v6-temporal-notice']]){
   const svc=loadService(resolve(path),{env:{BRIEFING_LLM_PROVIDER:'anthropic',BRIEFING_LLM_MODEL:'claude-haiku-5-5',ANTHROPIC_API_KEY:'offline-placeholder-not-a-credential'},fetchImpl:async url=>{
    assert.equal(url,'https://api.anthropic.com/v1/messages');mocks++;
    return new Response(JSON.stringify({type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({answer:'Offline synthetic test ['+c.evidence[0].id+']',sourceIds:[c.evidence[0].id]})}],usage:{input_tokens:1,output_tokens:1}}));
   }});
   assert.equal(svc.version,version);
   const generated=await svc.generate(structuredClone(c.request),'00000000-0000-4000-8000-000000000123',structuredClone(c.evidence),c.asOf);
   assert.equal(generated.result.version,version);assert.equal(generated.result.asOf,c.asOf);assert.equal(generated.result.status,'ok');
  }
  console.log(JSON.stringify({mode:'offline-public-source-smoke',sourceVersions:3,mockedFetches:mocks,actualNetworkRequests:0,actualModelCalls:0,productQualityEvidence:false}));
 }
}else{
 const originalHashes={};
 for(const [dir,prefix]of [['q606-holdout-v6','final-q606'],['q604-holdout-v3','final-consumed-q604']]){
  const base=join(priv,dir),m=read(join(base,'manifest.json'));originalHashes[dir]={manifestSha256:sha(readFileSync(join(base,'manifest.json'))),files:m.files};
  for(const [name,h]of Object.entries(m.files))assert.equal(sha(readFileSync(join(base,name))),h);
  const cases=read(join(base,'cases.json')).map(c=>({...pick(c,['id','split','inputOrigin','classification','group','asOf']),request:pick(c.request,['ticker','question']),evidence:c.evidence.map(source)}));
  assert(cases.every(c=>c.inputOrigin==='synthetic'));json(prefix+'-cases.json',{schema:'public-synthetic-cases-v1',warning:'Synthetic evaluation facts, not real market news; consumed evaluation dataset, not new unseen holdout.',cases});
  // Entire known authored rubric/protocol documents are approved, but unknown top-level keys fail closed.
  for(const name of ['rubrics','protocol']){
   const doc=read(join(base,name+'.json'));
   const allowed=dir==='q606-holdout-v6'?(name==='rubrics'?['schema','inputOrigin','frozenAt','scoring','cases']:['schema','frozenAt','inputOrigin','owner','isolation','dataset','execution','gate','reporting']):['schema','createdAt','provenance','design','count','normal','problem','providerCallsAtFreeze','serviceCallsAtFreeze','access','pairing','releaseGate','evaluation','attempts','authorization','asOf','immutability','statusInterpretation','freezeNote'];
   if(!Array.isArray(doc))assert(Object.keys(doc).every(k=>allowed.includes(k)));
   else assert(doc.every(r=>Object.keys(r).every(k=>['caseId','group','required','criticalExamples','common','passRule','review'].includes(k))));
   if(dir==='q604-holdout-v3'&&name==='protocol'){
    // This authored sentence is permission history, never an HTTP Authorization value.
    doc.executionPermissionNote=doc.authorization;delete doc.authorization;
   }
   json(prefix+'-'+name+'.json',doc);
  }
 }
 const base=join(priv,'q604-v6-evaluation'),r=read(join(base,'holdout-review.json'));
 const responses=r.rows.map(row=>{const raw=read(join(base,'heldout-'+row.label+'-'+row.caseId+'.json'));const final=result(raw.generated.result);assert.deepEqual(final,raw.generated.result,'Final service result must be lossless');return {
  ...pick(row,['caseId','group','label','traceId','version','status','httpStatus','providerAttempted','durationMs','inputTokens','outputTokens','estimatedUsd','pass','critical','operationalFailure','reviewOrigin','note']),
  provenance:'observed',inputOrigin:'synthetic',artifactHash:raw.artifactHash,startedAt:raw.startedAt,endedAt:raw.endedAt,
  generatedResult:final};});
 json('final-v6-responses.json',{schema:'public-final-service-results-v1',scope:'Q60610 cases x v2/v6 =20 results; not20 per version; excludes development and previous Q61030 inputs.',warning:'Final service responses only; numeric usage is model accounting, never credential tokens; AI analyst scores are not user feedback.',records:responses});
 const blind=read(join(base,'blind-judgments.json')),mapping=read(join(base,'blind-map.json'));
 json('final-blind-review.json',{schema:'public-blind-review-v1',gradedAt:blind.gradedAt,labelsOpenedAtGrading:blind.labelsOpened,originalJudgmentsSha256:sha(readFileSync(join(base,'blind-judgments.json'))),reviewer:blind.reviewer,
  records:blind.rows.map(j=>{const map=mapping[j.blindId],raw=read(join(base,map.file));return {...pick(j,['blindId','caseId','pass','critical','note']),label:map.label,traceId:raw.traceId,version:raw.expectedVersion};})});
 json('final-gate.json',pick(r.summary,['reviewedAt','reviewer','paired','baselinePass','candidatePass','denominator','criticalFailures','normalRegressions','thresholds','gate','reason','limitations','retries','authQuotaTransportTimeoutFailures']));
 const sources={};
 for(const [v,folder,sub]of [['v1','q610-anthropic','baseline'],['v2','q610-candidate','candidate']]){
  const m=read(join(priv,folder,'manifest.json'));assert.equal(m.files.length,14);const files=[];
  for(const f of m.files){assert(f.path.startsWith(sub+'/')&&f.path.endsWith('.ts')&&!f.path.includes('..'));const relative=f.path.slice(sub.length+1);const b=readFileSync(join(priv,folder,f.path));assert.equal(sha(b),f.sha256);const dest='tools/quest-evaluation/versions/'+v+'/'+relative;exportFiles[dest]=put(dest,b);files.push({path:relative,sha256:f.sha256});}
  const publicManifest={schema:'offline-legacy-source-v1',version:v,originalArtifactHash:m.artifactHash,originalCapturedAt:m.capturedAt,role:'Historical offline evaluation artifact, not current production',files};
  const target='tools/quest-evaluation/versions/'+v+'/manifest.json';safeJson(publicManifest);exportFiles[target]=put(target,Buffer.from(JSON.stringify(publicManifest,null,2)+'\n'));sources[v]=publicManifest;
 }
 const vm=read(join(base,'manifest.json'));sources.v6={version:vm.version,artifactHash:vm.artifactHash,servicePath:'src/lib/briefing/service.ts',serviceSha256:vm.files.find(f=>f.path==='service.ts').sha256,note:'Current app service matches evaluated source; UI/feedback changes are separate. v1/v2 code is offline legacy evidence only.'};
 json('final-source-manifests.json',sources);
 json('final-original-hashes.json',originalHashes);
 json('final-export-manifest.json',{schema:'allowlisted-public-export-v1',originalEvaluationAt:r.summary.reviewedAt,modelCallsForExport:0,files:exportFiles});
 validatePublic();
}
