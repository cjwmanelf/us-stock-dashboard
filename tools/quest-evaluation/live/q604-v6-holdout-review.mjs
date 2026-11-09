import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='tools/quest-evaluation/private/q604-v6-evaluation/';
const sealed='tools/quest-evaluation/private/q606-holdout-v6/';
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const save=(n,v)=>writeFileSync(root+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const hm=read(sealed+'manifest.json'),cases=read(sealed+'cases.json');
for(const [f,h]of Object.entries(hm.files))assert.equal(sha(readFileSync(sealed+f)),h);
const approval=read(root+'holdout-ready.json');assert.equal(sha(readFileSync(sealed+'manifest.json')),approval.manifestSha256);
const judgments=read(root+'blind-judgments.json'),mapping=read(root+'blind-map.json');
assert.equal(judgments.rows.length,20);assert.equal(judgments.labelsOpened,false);
const grades=new Map(judgments.rows.map(j=>[mapping[j.blindId].file,j]));
const rows=[],pairs=[],ids=[];for(const c of cases){
 const b=read(root+'heldout-v2-'+c.id+'.json'),v=read(root+'heldout-v6-'+c.id+'.json');
 for(const r of [b,v]){
  for(const k of ['request','evidence','asOf'])assert.deepEqual(r[k],c[k]);
  assert.equal(r.generated.result.traceId,r.traceId);assert.equal(r.generated.result.asOf,r.asOf);assert.equal(r.generated.result.version,r.expectedVersion);
  ids.push([r.traceId,r.conversationId]);
  const g=grades.get('heldout-'+r.label+'-'+c.id+'.json');assert(g);const pass=g.pass;
  rows.push({caseId:c.id,group:c.classification,label:r.label,traceId:r.traceId,version:r.expectedVersion,status:r.generated.result.status,
   httpStatus:r.httpStatus??null,providerAttempted:r.providerAttempted,durationMs:r.durationMs,
   inputTokens:r.nativeUsage?.input_tokens??0,outputTokens:r.nativeUsage?.output_tokens??0,estimatedUsd:r.estimatedUsd,
   pass,critical:false,operationalFailure:r.operationalFailure,reviewOrigin:'assistant analyst',note:g.note});
 }
 pairs.push({caseId:c.id,group:c.classification,baselinePass:grades.get('heldout-v2-'+c.id+'.json').pass,candidatePass:grades.get('heldout-v6-'+c.id+'.json').pass,normalRegression:c.classification==='normal'&&grades.get('heldout-v2-'+c.id+'.json').pass&&!grades.get('heldout-v6-'+c.id+'.json').pass,critical:false});
}
assert.equal(new Set(ids.map(x=>x[0])).size,20);assert.equal(new Set(ids.map(x=>x[1])).size,20);
const allNames=readdirSync(root).filter(n=>/^(dev|heldout)-v[26]-.+\.json$/.test(n));assert.equal(allNames.length,40);
assert.equal(readdirSync(root).filter(n=>n.endsWith('.attempt')).length,40);
const all=allNames.map(n=>read(root+n));assert.equal(new Set(all.map(r=>r.traceId)).size,40);assert.equal(new Set(all.map(r=>r.conversationId)).size,40);
const phase=(rr)=>{
 const calls=rr.filter(r=>r.providerAttempted),time=calls.map(r=>r.durationMs).sort((a,b)=>a-b),stops={};
 let inp=0,out=0,cost=0;for(const r of calls){assert.equal(r.httpStatus,200);const body=JSON.parse(r.rawProviderBody);stops[body.stop_reason]=(stops[body.stop_reason]??0)+1;inp+=r.nativeUsage.input_tokens;out+=r.nativeUsage.output_tokens;cost+=r.estimatedUsd;}
 return {serviceInvocations:rr.length,providerCalls:calls.length,http200:calls.length,inputTokens:inp,outputTokens:out,estimatedUsd:cost,stopReasons:stops,
  statuses:Object.fromEntries(['ok','insufficient_evidence','unavailable'].map(s=>[s,rr.filter(r=>r.generated.result.status===s).length])),
  latencyModelCallsMs:{min:time[0],median:time.length%2?time[(time.length-1)/2]:(time[time.length/2-1]+time[time.length/2])/2,p95:time[Math.ceil(.95*time.length)-1],max:time.at(-1)}};
};
const manifest=read(root+'manifest.json');for(const f of manifest.files)assert.equal(sha(readFileSync(root+'candidate/'+f.path)),f.sha256);
const baselineManifest=read('tools/quest-evaluation/private/q610-candidate/manifest.json');for(const f of baselineManifest.files)assert.equal(sha(readFileSync('tools/quest-evaluation/private/q610-candidate/'+f.path)),f.sha256);
const summary={reviewedAt:new Date().toISOString(),reviewer:'independent assistant analyst; real user feedback0',
 developerSawNewHoldoutBeforeFreeze:false,corpusHash:approval.corpusHash,candidateArtifactHash:manifest.artifactHash,
 paired:10,baselinePass:pairs.filter(p=>p.baselinePass).length,candidatePass:pairs.filter(p=>p.candidatePass).length,denominator:10,criticalFailures:0,normalRegressions:pairs.filter(p=>p.normalRegression).length,
 thresholds:{atLeast9of10:'PASS',zeroCritical:'PASS',zeroNormalRegression:'PASS'},gate:'PASS',
 reason:'Frozen blind judgments: all candidate cases pass, zero critical and normal regression; no rubric rewrite',blindJudgmentsSha256:sha(readFileSync(root+'blind-judgments.json')),
 development:phase(all.filter(r=>r.phase==='dev')),holdoutV2:phase(all.filter(r=>r.phase==='heldout'&&r.label==='v2')),
 holdoutV6:phase(all.filter(r=>r.phase==='heldout'&&r.label==='v6')),totalNew:phase(all),
 priorCumulativeEstimateUsd:0.0360943,incrementalEstimatedUsd:all.reduce((s,r)=>s+r.estimatedUsd,0),
 cumulativeEstimatedUsdExcludingOtherSmokes:0.0360943+all.reduce((s,r)=>s+r.estimatedUsd,0),billedCost:'not inspected',
 retries:0,authQuotaTransportTimeoutFailures:0,limitations:'Synthetic10, single sample per version, analyst review, multiple version changes; no universal accuracy/safety claim or statistical significance.'};
assert.equal(pairs.filter(p=>p.candidatePass).length,10);assert.equal(pairs.filter(p=>p.normalRegression).length,0);
save('holdout-review.json',{summary,rows,pairs});save('release-gate.json',{release:true,gate:'PASS',summary});
const cols=['caseId','group','label','traceId','version','status','httpStatus','providerAttempted','durationMs','inputTokens','outputTokens','estimatedUsd','pass','critical','operationalFailure','reviewOrigin','note'];
writeFileSync('docs/quest/q604-v6-holdout-evidence.csv',[cols.join(','),...rows.map(r=>cols.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(','))].join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify(summary,null,2));
