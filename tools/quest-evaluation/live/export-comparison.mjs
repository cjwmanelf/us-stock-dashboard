// Explicit allowlist export: no native response bodies, prompts, headers, thinking, or signatures.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const b='tools/quest-evaluation/private/q610-anthropic/',c='tools/quest-evaluation/private/q610-candidate/',out='docs/quest/evidence/';
const read=p=>JSON.parse(readFileSync(p)),hash=x=>createHash('sha256').update(x).digest('hex');
mkdirSync(out,{recursive:true});
const records=[],pairs=[],ids=new Set();
const baselineNotes={'q610-10':'Latent raw JSON code fence','q610-13':'Latent raw publishedAt-as-event-date error','q610-15':'Latent raw empty-citation abstention','q610-18':'Latent raw incorrect after-asOf news requirement','q610-30':'Latent raw publishedAt-as-event-date error'};
const candidateNotes={'q610-09':'Missing bracket citation: valid JSON safely rejected','q610-12':'Expected empty-evidence abstention; no provider call','q610-15':'Empty sourceIds on correct irrelevant-ticker abstention; safely rejected','q610-18':'Accepted answer incorrectly requires today news to be after asOf','q610-28':'Supported refusal and figures; minor publishedAt/announcement wording caveat','q610-29':'Empty sourceIds on correct irrelevant-ticker abstention; safely rejected','q610-30':'Accepted answer asserts Dec1 announcement date from publishedAt; title has no event date'};
function summary(r,label){
 assert(!ids.has(r.traceId));ids.add(r.traceId);assert.equal(r.traceId,r.generated.result.traceId);assert.equal(r.traceId,r.generated.trace.traceId);assert.equal(r.expectedVersion,r.generated.result.version);assert.equal(r.asOf,r.generated.result.asOf);assert.deepEqual(r.evidence,r.generated.result.sources);
 const raw=r.rawProviderBody?JSON.parse(r.rawProviderBody):null,u=raw?.usage,thinking=u?.output_tokens_details?.thinking_tokens??null;
 const chosenFailure=Boolean(label==='baseline'&&raw?.content?.some(x=>x.type==='thinking'||x.type==='redacted_thinking'));
 let qualityPass=label==='candidate'&&!['q610-09','q610-15','q610-18','q610-29','q610-30'].includes(r.id);
 if(r.id==='q610-12')qualityPass=true;
 const reason=label==='candidate'?(candidateNotes[r.id]??'Manually checked: answer supported by supplied synthetic metadata; appropriate uncertainty and citations'):(r.id==='q610-12'?'Expected empty-evidence abstention':'Generic final fallback caused by recognized thinking rejection'+(baselineNotes[r.id]?'; '+baselineNotes[r.id]:''));
 return {caseId:r.id,split:r.split,group:r.group,label,traceId:r.traceId,conversationId:r.conversationId,version:r.expectedVersion,artifactHash:r.artifactHash,serviceImplementationHash:r.implementationHash,actualStartedAt:r.startedAt,actualEndedAt:r.endedAt,asOf:r.asOf,inputEvidenceHash:hash(JSON.stringify({request:r.request,evidence:r.evidence,asOf:r.asOf})),status:r.generated.result.status,httpStatus:r.httpStatus??null,stopReason:raw?.stop_reason??null,chosenFailure,qualityPass,qualityReason:reason,analyst:'assistant analyst; not end-user feedback',latencyMs:r.generated.trace.durationMs,inputTokens:u?.input_tokens??0,outputTokensIncludingThinking:u?.output_tokens??0,thinkingTokensSubset:thinking,cacheCreationTokens:u?.cache_creation_input_tokens??0,cacheReadTokens:u?.cache_read_input_tokens??0,tokenPricedEstimateUSD:u?(u.input_tokens*.1+u.output_tokens*.5)/1e6:0,billedCostUSD:null};
}
for(let i=1;i<=30;i++){
 const id=`q610-${String(i).padStart(2,'0')}`,br=read(i<=20?b+id+'.json':c+'baseline-'+id+'.json'),cr=read(c+'candidate-'+id+'.json');
 for(const field of ['request','evidence','asOf','split'])assert.deepEqual(br[field],cr[field]);
 if(br.providerRequest){assert.deepEqual(br.providerRequest,cr.providerRequest);assert.equal(br.httpStatus,200);assert.equal(cr.httpStatus,200);}
 const bs=summary(br,'baseline'),cs=summary(cr,'candidate');assert.notEqual(bs.version,cs.version);assert.notEqual(bs.artifactHash,cs.artifactHash);records.push(bs,cs);pairs.push({caseId:id,split:br.split,inputEvidenceHash:bs.inputEvidenceHash,baselineTraceId:bs.traceId,candidateTraceId:cs.traceId,baselineStatus:bs.status,candidateStatus:cs.status,baselineQualityPass:bs.qualityPass,candidateQualityPass:cs.qualityPass});
}
const manifests={baseline:read(b+'manifest.json'),candidate:read(c+'manifest.json')};
for(const [label,m]of Object.entries(manifests))for(const f of m.files){assert.equal(hash(readFileSync((label==='baseline'?b:c)+f.path)),f.sha256);if(label==='candidate')assert.equal(hash(readFileSync('src/lib/briefing/'+f.path.replace(/^candidate\//,''))),f.sha256);}
const totals={serviceInvocations:records.length,providerCalls:records.filter(r=>r.httpStatus!==null).length,newServiceInvocations:40,newProviderCalls:records.filter(r=>!(r.label==='baseline'&&r.split==='development')&&r.httpStatus!==null).length,inputTokens:records.reduce((s,r)=>s+r.inputTokens,0),outputTokensIncludingThinking:records.reduce((s,r)=>s+r.outputTokensIncludingThinking,0),thinkingTokensSubset:records.reduce((s,r)=>s+(r.thinkingTokensSubset??0),0),tokenPricedEstimateUSD:records.reduce((s,r)=>s+r.tokenPricedEstimateUSD,0),realUserFeedback:0,releaseGate:'FAIL: heldout quality8/10 below9/10; no tuning',splits:{}};
for(const split of ['development','held-out'])for(const label of ['baseline','candidate']){const rs=records.filter(r=>r.split===split&&r.label===label),lat=rs.filter(r=>r.httpStatus!==null).map(r=>r.latencyMs).sort((a,b)=>a-b);totals.splits[split+'-'+label]={n:rs.length,ok:rs.filter(r=>r.status==='ok').length,qualityPass:rs.filter(r=>r.qualityPass).length,chosenFailure:rs.filter(r=>r.chosenFailure).length,modelCalls:lat.length,medianGenerationMs:(lat[Math.floor((lat.length-1)/2)]+lat[Math.floor(lat.length/2)])/2,minGenerationMs:lat[0],maxGenerationMs:lat.at(-1)};}
const cases=[...read(b+'development.json'),...read(b+'held-out.json')];
const exports={'q610-comparison.json':{schema:'q610-safe-comparison-v1',provenance:'observed model responses on synthetic inputs',pricingSource:'https://www.anthropic.com/claude/haiku',totals,records,pairs},'q610-synthetic-cases.json':{notice:'All inputs/evidence synthetic, not real market facts; heldout exported only after evaluation finished',cases},'q610-source-manifests.json':manifests};
for(const[name,data]of Object.entries(exports))writeFileSync(out+name,JSON.stringify(data,null,2));
const keys=Object.keys(records[0]),csv=x=>'"'+String(x??'').replaceAll('"','""')+'"';writeFileSync(out+'q610-comparison.csv',[keys.map(csv).join(','),...records.map(r=>keys.map(k=>csv(r[k])).join(','))].join('\n')+'\n');
writeFileSync(out+'q610-export-hashes.json',JSON.stringify(Object.fromEntries([...Object.keys(exports),'q610-comparison.csv'].map(n=>[n,hash(readFileSync(out+n))])),null,2));
console.log(JSON.stringify(totals));
