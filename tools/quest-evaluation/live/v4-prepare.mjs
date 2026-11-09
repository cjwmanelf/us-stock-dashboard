import{readFileSync,writeFileSync,mkdirSync,cpSync,existsSync}from'node:fs';
import{parseEnv}from'node:util';
const root='tools/quest-evaluation/private/q610-v4-pilot/';mkdirSync(root,{recursive:true});
if(!existsSync(root+'v3-before-edit'))cpSync('src/lib/briefing',root+'v3-before-edit',{recursive:true});
for(const id of ['04','06','07','08','09','11','16']){
 const r=JSON.parse(readFileSync(`tools/quest-evaluation/private/q604-v3-evaluation/dev-v3-q610-${id}.json`));
 console.log(JSON.stringify({caseId:id,keys:Object.keys(r),text:r.generated?.result?.answer,stopReason:r.stopReason??r.stop_reason}));
 // Only final text/stop reason are inspected; no reasoning or signatures are emitted.
 const body=r.rawProviderBody?JSON.parse(r.rawProviderBody):null;
 if(body)console.log(JSON.stringify({caseId:id,stopReason:body.stop_reason,text:body.content?.filter(b=>b.type==='text').map(b=>b.text).join('')}));
}
const key=parseEnv(readFileSync('.env.anthropic.local','utf8').replace(/^\uFEFF/, '')).ANTHROPIC_API_KEY;
const res=await fetch('https://api.anthropic.com/v1/models/claude-haiku-5-5',{headers:{'x-api-key':key,'anthropic-version':'2023-06-01'},signal:AbortSignal.timeout(15000)});
const data=await res.json();if(!res.ok)throw Error(`Capabilities HTTP${res.status}; stop`);
const safe={checkedAt:new Date().toISOString(),httpStatus:res.status,id:data.id,capabilities:data.capabilities};
writeFileSync(root+'capabilities.json',JSON.stringify(safe,null,2));console.log(JSON.stringify(safe));
