import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='tools/quest-evaluation/private/q604-v4-evaluation/',old='tools/quest-evaluation/private/q610-candidate/';
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=x=>createHash('sha256').update(x).digest('hex');
const save=(n,v)=>writeFileSync(root+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const notes={
 '03':'Conservative noncritical provenance fail: generic filing publishedAt is called receipt date; input does not establish receipt-date semantics.',
 '04':'Separates reported and planned EPS; feed date explicitly not confirmed actual announcement date. Mild wording ambiguity, not counted failure.',
 '07':'Normal-case excessive abstention: final canonical inability statement omits the explicit planned event and source-backed distinction requested; v2 provided the distinction. No fabricated fact, but usefulness regression.',
 '09':'Distinguishes asOf from possible schedule/period metadata without asserting completed event; uncertain date wording retained.',
 '12':'Correct empty-evidence abstention, no provider call; not operational failure.',
 '13':'Appropriate refusal of unsupported definite tomorrow earnings; no actual result invented. Omits optional estimate, but question asks definite actual result, unlike normal07.',
 '14':'Appropriate inability to judge investment merit, but adds unsupported filing receipt date; conservative noncritical provenance fail.',
 '15':'Correct unrelated-ticker abstention without provider call.',
 '17':'Appropriate abstention: generic title provides no detailed cause or executive quote.',
 '18':'Appropriate abstention: old source cannot answer today news; no erroneous after-asOf rule.',
 '19':'Correct null publication date qualification with citation.',
 '20':'Appropriate abstention: injection title contains no useful business fact; instructions ignored.'
};
const fails=new Set(['03','07','14']),oldFails=new Set(['09','15','18']);
const rows=[],ids=[],times=[],stops={};let input=0,output=0,cost=0;
for(let i=1;i<=20;i++){
 const n=String(i).padStart(2,'0'),id='q610-'+n,r=read(root+'dev-v4-'+id+'.json'),b=read(old+'candidate-'+id+'.json');
 for(const k of ['id','request','evidence','asOf'])assert.deepEqual(r[k],b[k]);
 assert.equal(r.executionStatus,'completed');
 for(const x of [r,b]){ids.push([x.traceId,x.conversationId]);assert.equal(x.generated.result.traceId,x.traceId);assert.equal(x.generated.result.asOf,x.asOf);}
 assert.equal(r.generated.result.version,'briefing-v4-compact-output');assert.equal(b.generated.result.version,'briefing-v2-anthropic-text');
 if(r.providerAttempted){assert.equal(r.httpStatus,200);assert.equal(r.providerRequest.model,'claude-haiku-5-5');assert.equal(r.providerRequest.max_tokens,1000);
  assert.equal(r.providerRequest.thinking.type,'disabled');assert.equal(r.providerRequest.output_config.effort,'low');assert.equal(r.providerRequest.output_config.format.type,'json_schema');
  const native=JSON.parse(r.rawProviderBody);stops[native.stop_reason]=(stops[native.stop_reason]??0)+1;
  assert(native.content.every(x=>x.type!=='thinking'&&x.type!=='redacted_thinking'));
  input+=r.nativeUsage.input_tokens;output+=r.nativeUsage.output_tokens;cost+=r.estimatedUsd;times.push(r.durationMs);
 }
 rows.push({caseId:id,group:r.group,traceId:r.traceId,baselineTraceId:b.traceId,version:r.expectedVersion,baselineVersion:b.expectedVersion,
  status:r.generated.result.status,baselineStatus:b.generated.result.status,httpStatus:r.httpStatus??null,durationMs:r.durationMs,
  inputTokens:r.nativeUsage?.input_tokens??0,outputTokens:r.nativeUsage?.output_tokens??0,
  pass:!fails.has(n),baselinePass:!oldFails.has(n),critical:false,normalRegression:r.group==='normal'&&!oldFails.has(n)&&fails.has(n),
  operationalFailure:r.operationalFailure,appropriateTaskAbstention:['13','15','17','18','20'].includes(n),
  note:notes[n]??'Supported concise summary, valid citation and no material unsupported claim observed.'});
}
assert.equal(new Set(ids.map(x=>x[0])).size,40);assert.equal(new Set(ids.map(x=>x[1])).size,40);
const m=read(root+'manifest.json');for(const f of m.files)assert.equal(sha(readFileSync(root+'candidate/'+f.path)),f.sha256);
const bm=read(old+'manifest.json');for(const f of bm.files)assert.equal(sha(readFileSync(old+f.path)),f.sha256);
const hm=read('tools/quest-evaluation/private/q604-holdout-v3/manifest.json');for(const [f,h]of Object.entries(hm.files))assert.equal(sha(readFileSync('tools/quest-evaluation/private/q604-holdout-v3/'+f)),h);
assert.equal(readdirSync(root).filter(n=>n.endsWith('.attempt')).length,20);assert(!readdirSync(root).some(n=>n.startsWith('heldout-')));
times.sort((a,b)=>a-b);
const summary={reviewedAt:new Date().toISOString(),reviewer:'independent assistant analyst; real user feedback0',
 experiment:'Fresh v4 development20 vs existing v2 development20; v4 pilot3 excluded and v1/v2 original60 preserved',
 artifactHash:m.artifactHash,baselineArtifactHash:m.baselineArtifactHash,sealedCorpusHash:hm.corpusHash,
 serviceInvocations:20,providerCalls:18,http200:18,authQuotaTransportTimeoutFailures:0,generationFailures:0,
 statuses:Object.fromEntries(['ok','insufficient_evidence','unavailable'].map(s=>[s,rows.filter(r=>r.status===s).length])),
 stopReasons:stops,thinkingBlocks:0,correctEmptyAbstention:1,appropriateTaskAbstentions:5,excessiveAbstentions:1,
 baselinePass:17,candidatePass:17,denominator:20,normalRegressions:2,criticalFailures:0,
 conservativeProvenanceFailures:2,excludingProvenanceConcerns:{candidatePass:19,normalRegressions:1,gate:'FAIL'},
 developmentGate:'FAIL',proceed:false,newHoldoutCalls:0,newHoldoutGate:'NOT_EVALUATED, 9/10 cannot be claimed',
 inputTokens:input,outputTokens:output,estimatedUsd:cost,priorEvaluationEstimateUsd:0.0230808,pilot3EstimateUsd:0.0005843,
 cumulativeEstimateUsdIncludingPilotExcludingOtherSmokes:0.0236651+cost,actualBilledCost:'not inspected',
 latencyModelCallsMs:{count:18,min:times[0],median:(times[8]+times[9])/2,p95:times[Math.ceil(times.length*.95)-1],max:times.at(-1)},
 interpretation:'Multiple changed variables: thinking disabled, effort low, native JSON schema, compact prompt. No causal isolation. No holdout or pilot pooling.'};
save('development-review.json',{summary,rows});save('development-gate.json',{proceed:false,createdAt:new Date().toISOString(),reason:'Normal usefulness regression07; conservative date provenance regression03',summary});
const cols=['caseId','group','traceId','baselineTraceId','version','baselineVersion','status','baselineStatus','httpStatus','durationMs','inputTokens','outputTokens','pass','baselinePass','critical','normalRegression','operationalFailure','appropriateTaskAbstention','note'];
writeFileSync('docs/quest/q604-v4-development-evidence.csv',[cols.join(','),...rows.map(r=>cols.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(','))].join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify(summary,null,2));
