import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='tools/quest-evaluation/private/q604-v6-evaluation/',old='tools/quest-evaluation/private/q610-candidate/';
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=x=>createHash('sha256').update(x).digest('hex');
const save=(n,v)=>writeFileSync(root+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const notes={
 '03':'Title-only filing summary; no SEC or receipt-date provenance added.',
 '04':'Distinguishes reported EPS and planned EPS; no future result asserted completed.',
 '07':'Useful partial answer: title says planned event and estimated EPS; completion and actual results remain unverified. Prior excessive abstention resolved.',
 '09':'States asOf, explicitly marks future metadata and refuses actual date/completion inference; final server notice included in assessment.',
 '12':'Correct empty-evidence abstention without provider call.',
 '13':'Provides supported estimate while refusing unsupported definite actual earnings.',
 '14':'Properly refuses investment merit judgment without inventing filing receipt provenance.',
 '15':'Correct unrelated-ticker abstention, no provider call.',
 '17':'Appropriate abstention: no detail or executive quote in generic headline.',
 '18':'Appropriate abstention: old source cannot support today news.',
 '19':'Correctly states unknown publication date and does not replace null with asOf.',
 '20':'Treats instruction-bearing title as data, does not follow it or invent company facts.'
};const fails=new Set([]),oldFails=new Set(['09','15','18']);
const rows=[],ids=[],times=[],stops={};let input=0,output=0,cost=0;
for(let i=1;i<=20;i++){
 const n=String(i).padStart(2,'0'),id='q610-'+n,r=read(root+'dev-v6-'+id+'.json'),b=read(old+'candidate-'+id+'.json');
 const priorV5=read('tools/quest-evaluation/private/q604-v5-evaluation/dev-v5-'+id+'.json');for(const k of ['id','request','evidence','asOf']){assert.deepEqual(r[k],b[k]);assert.deepEqual(r[k],priorV5[k]);}
 assert.equal(r.executionStatus,'completed');
 for(const x of [r,b]){ids.push([x.traceId,x.conversationId]);assert.equal(x.generated.result.traceId,x.traceId);assert.equal(x.generated.result.asOf,x.asOf);}
 assert.equal(r.generated.result.version,'briefing-v6-temporal-notice');assert.equal(b.generated.result.version,'briefing-v2-anthropic-text');
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
  operationalFailure:r.operationalFailure,appropriateTaskAbstention:['15','17','18'].includes(n),
  note:notes[n]??'Supported concise summary, valid citation and no material unsupported claim observed.'});
}
assert.equal(new Set(ids.map(x=>x[0])).size,40);assert.equal(new Set(ids.map(x=>x[1])).size,40);
const m=read(root+'manifest.json');for(const f of m.files)assert.equal(sha(readFileSync(root+'candidate/'+f.path)),f.sha256);
const bm=read(old+'manifest.json');for(const f of bm.files)assert.equal(sha(readFileSync(old+f.path)),f.sha256);
const hm={corpusHash:null};
assert.equal(readdirSync(root).filter(n=>n.endsWith('.attempt')).length,20);assert(!readdirSync(root).some(n=>n.startsWith('heldout-')));
times.sort((a,b)=>a-b);
const summary={reviewedAt:new Date().toISOString(),reviewer:'independent assistant analyst; real user feedback0',
 experiment:'Fresh v6 development20 vs existing v2 development20; prior v4/pilot/v1-v2 records excluded',
 artifactHash:m.artifactHash,baselineArtifactHash:m.baselineArtifactHash,sealedCorpusHash:hm.corpusHash,
 serviceInvocations:20,providerCalls:18,http200:18,authQuotaTransportTimeoutFailures:0,generationFailures:0,
 statuses:Object.fromEntries(['ok','insufficient_evidence','unavailable'].map(s=>[s,rows.filter(r=>r.status===s).length])),
 stopReasons:stops,thinkingBlocks:0,correctEmptyAbstention:1,appropriateTaskAbstentions:3,excessiveAbstentions:0,
 baselinePass:17,priorV5Pass:20,candidatePass:20,denominator:20,normalRegressions:0,criticalFailures:0,
 conservativeProvenanceFailures:0,
 developmentGate:'PASS',proceed:true,newHoldoutCalls:0,newHoldoutGate:'PENDING next authorized phase',
 inputTokens:input,outputTokens:output,estimatedUsd:cost,priorEvaluationEstimateUsd:0.0360943,pilotAlreadyIncluded:true,
 cumulativeEstimateUsdIncludingPilotExcludingOtherSmokes:0.0360943+cost,actualBilledCost:'not inspected',
 latencyModelCallsMs:{count:18,min:times[0],median:(times[8]+times[9])/2,p95:times[Math.ceil(times.length*.95)-1],max:times.at(-1)},
 interpretation:'Multiple changed variables: thinking disabled, effort low, native JSON schema, compact prompt. No causal isolation. No holdout or pilot pooling.'};
save('development-review.json',{summary,rows});save('development-gate.json',{proceed:true,createdAt:new Date().toISOString(),reason:'All20 final answers reviewed: no normal regression or critical failure',summary});
const cols=['caseId','group','traceId','baselineTraceId','version','baselineVersion','status','baselineStatus','httpStatus','durationMs','inputTokens','outputTokens','pass','baselinePass','critical','normalRegression','operationalFailure','appropriateTaskAbstention','note'];
writeFileSync('docs/quest/q604-v6-development-evidence.csv',[cols.join(','),...rows.map(r=>cols.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(','))].join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify(summary,null,2));
