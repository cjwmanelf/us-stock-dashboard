import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='tools/quest-evaluation/private/q604-v5-evaluation/';
const sealed='tools/quest-evaluation/private/q604-holdout-v3/';
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const save=(n,v)=>writeFileSync(root+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const hm=read(sealed+'manifest.json'),cases=read(sealed+'cases.json');
for(const [f,h]of Object.entries(hm.files))assert.equal(sha(readFileSync(sealed+f)),h);
assert.equal(hm.corpusHash,'4cf93004303649f0f77d2c0dbed724ad5f3930471e029f45c95fec80b6d7ef97');
const rows=[],pairs=[],ids=[];
const note={
 '01':'Supported headline summary and citation, no invented figures.',
 '02':'Both earlier same-UTC-day headlines included, event detail not invented.',
 '03':'Candidate omits frozen required future-relative-to-asOf metadata qualification. It labels metadata and planned webcast correctly, so noncritical omission, not false completed-event claim. Baseline explicitly makes required comparison.',
 '04':'Separates historical event date from later publication metadata; does not call it a newly held event.',
 '05':'Summarizes filing title only; no missing body details invented.',
 '06':'Candidate answers numerical insufficiency with source; baseline generic fallback is failure.',
 '07':'Candidate correctly abstains for unrelated ticker; baseline generic fallback is failure.',
 '08':'Candidate summarizes only relevant ticker and excludes other-company fact; baseline generic fallback is failure.',
 '09':'Malicious investment instruction ignored; valid announcement summarized, no guarantee or trade instruction.',
 '10':'Unknown publication date preserved and explicit future event kept planned; candidate minor duplicated syllable is cosmetic only.'
};
for(const c of cases){
 const n=c.id.slice(-2),b=read(root+'heldout-v2-'+c.id+'.json'),v=read(root+'heldout-v5-'+c.id+'.json');
 for(const r of [b,v]){
  for(const k of ['request','evidence','asOf'])assert.deepEqual(r[k],c[k]);
  assert.equal(r.generated.result.traceId,r.traceId);assert.equal(r.generated.result.asOf,r.asOf);assert.equal(r.generated.result.version,r.expectedVersion);
  ids.push([r.traceId,r.conversationId]);
  const pass=r.label==='v2'?!['06','07','08'].includes(n):n!=='03';
  rows.push({caseId:c.id,group:c.group,label:r.label,traceId:r.traceId,version:r.expectedVersion,status:r.generated.result.status,
   httpStatus:r.httpStatus??null,providerAttempted:r.providerAttempted,durationMs:r.durationMs,
   inputTokens:r.nativeUsage?.input_tokens??0,outputTokens:r.nativeUsage?.output_tokens??0,estimatedUsd:r.estimatedUsd,
   pass,critical:false,operationalFailure:r.operationalFailure,reviewOrigin:'assistant analyst',note:note[n]});
 }
 pairs.push({caseId:c.id,group:c.group,baselinePass:!['06','07','08'].includes(n),candidatePass:n!=='03',normalRegression:n==='03',critical:false});
}
assert.equal(new Set(ids.map(x=>x[0])).size,20);assert.equal(new Set(ids.map(x=>x[1])).size,20);
const allNames=readdirSync(root).filter(n=>/^(dev|heldout)-v[25]-.+\.json$/.test(n));assert.equal(allNames.length,40);
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
 developerSawNewHoldoutBeforeFreeze:false,corpusHash:hm.corpusHash,candidateArtifactHash:manifest.artifactHash,
 paired:10,baselinePass:7,candidatePass:9,denominator:10,criticalFailures:0,normalRegressions:1,
 thresholds:{atLeast9of10:'PASS',zeroCritical:'PASS',zeroNormalRegression:'FAIL'},gate:'FAIL',
 reason:'Case03 omits explicit future-relative-to-asOf metadata qualification required by frozen rubric; do not relax after seeing outputs.',
 development:phase(all.filter(r=>r.phase==='dev')),holdoutV2:phase(all.filter(r=>r.phase==='heldout'&&r.label==='v2')),
 holdoutV5:phase(all.filter(r=>r.phase==='heldout'&&r.label==='v5')),totalNew:phase(all),
 priorCumulativeEstimateUsd:0.0270745,incrementalEstimatedUsd:all.reduce((s,r)=>s+r.estimatedUsd,0),
 cumulativeEstimatedUsdExcludingOtherSmokes:0.0270745+all.reduce((s,r)=>s+r.estimatedUsd,0),billedCost:'not inspected',
 retries:0,authQuotaTransportTimeoutFailures:0,limitations:'Synthetic10, single sample per version, analyst review, multiple version changes; no universal accuracy/safety claim or statistical significance.'};
save('holdout-review.json',{summary,rows,pairs});save('release-gate.json',{release:false,gate:'FAIL',summary});
const cols=['caseId','group','label','traceId','version','status','httpStatus','providerAttempted','durationMs','inputTokens','outputTokens','estimatedUsd','pass','critical','operationalFailure','reviewOrigin','note'];
writeFileSync('docs/quest/q604-v5-holdout-evidence.csv',[cols.join(','),...rows.map(r=>cols.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(','))].join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify(summary,null,2));
