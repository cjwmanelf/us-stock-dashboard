import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='tools/quest-evaluation/private/q610-anthropic/';
const rows=readdirSync(root).filter(n=>/^q610-\d+\.json$/.test(n)).sort().map(n=>JSON.parse(readFileSync(root+n)));
const notes={
 'q610-04':'No failure assigned: event date absent from title; publishedAt is not guaranteed event date.',
 'q610-06':'Minor metadata wording: calls publishedAt announcement time, then explicitly qualifies it as metadata.',
 'q610-09':'Correctly refuses to infer actual event date from publishedAt.',
 'q610-10':'Latent format defect: fenced JSON is rejected by unchanged JSON.parse after block extraction.',
 'q610-12':'Expected deterministic empty-evidence abstention; zero provider calls, not model failure.',
 'q610-13':'Latent semantic candidate: identifies publishedAt as announcement date despite title containing no date; still correctly refuses confirmed results.',
 'q610-15':'Latent citation/schema conflict: correct irrelevant-ticker abstention but empty sourceIds and no bracket citation; existing validator would reject.',
 'q610-18':'Latent semantic candidate: says news must be published after asOf to qualify as today; same-day news before asOf can qualify.',
};
const reviewed=rows.map(r=>{
 let raw=r.rawProviderBody?JSON.parse(r.rawProviderBody):null;
 const text=raw?.content?.filter(b=>b.type==='text').map(b=>b.text).join('');
 let format='none',parsed=null;
 if(text){try{parsed=JSON.parse(text);format='json'}catch{format='fenced-json'}}
 return {caseId:r.id,feedbackOrigin:'assistant-analyst',endUserFeedback:null,firstBadStage:raw?'generation/provider-response-extraction':null,firstFailure:raw?'recognized-thinking-block-rejected':null,format,citationSchemaWouldPass:parsed?Array.isArray(parsed.sourceIds)&&parsed.sourceIds.length>0&&parsed.sourceIds.every(id=>r.evidence.some(s=>s.id===id)&&parsed.answer.includes(`[${id}]`)):null,manualAssessment:notes[r.id]??'Text claims supported by supplied synthetic metadata; no independent material semantic failure observed.',rawAnswerReviewed:true};
});
assert.equal(rows.length,20);assert.equal(new Set(rows.map(r=>r.traceId)).size,20);assert.equal(new Set(rows.map(r=>r.conversationId)).size,20);
for(const r of rows){assert.match(r.traceId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.equal(r.generated.result.traceId,r.traceId);assert.equal(r.generated.trace.traceId,r.traceId);assert.equal(r.generated.result.asOf,r.asOf);assert.deepEqual(r.generated.result.sources,r.evidence);assert.equal(r.generated.result.version,r.expectedVersion);}
const manifest=JSON.parse(readFileSync(root+'manifest.json'));
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(root+f.path)).digest('hex'),f.sha256);
const durations=rows.filter(r=>r.providerRequest).map(r=>r.generated.trace.durationMs).sort((a,b)=>a-b);
writeFileSync(root+'analyst-review.json',JSON.stringify({reviewedAt:new Date().toISOString(),reviewer:'assistant analyst, not real end user',records:reviewed,endUserVotes:0,serviceGenerationMs:{min:durations[0],median:durations[9],max:durations.at(-1)},verified:'20 unique matching UUIDs, frozen sources/evidence/asOf/version; heldout not executed'},null,2));
console.log(JSON.stringify({verified:20,strictJson:reviewed.filter(r=>r.format==='json').length,fencedJson:reviewed.filter(r=>r.format==='fenced-json').length,citationPassAfterTextExtraction:reviewed.filter(r=>r.citationSchemaWouldPass===true).length,minMs:durations[0],medianMs:durations[9],maxMs:durations.at(-1)}));
