import{readFileSync,writeFileSync,readdirSync,cpSync,existsSync}from'node:fs';
import{resolve,join,relative}from'node:path';
import{createHash,randomUUID}from'node:crypto';
import{parseEnv}from'node:util';
import assert from'node:assert/strict';
import{loadService}from'../src/service-loader.mjs';
const root=resolve('tools/quest-evaluation/private/q610-v4-pilot'),hash=x=>createHash('sha256').update(x).digest('hex');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
assert(!existsSync(join(root,'candidate')),'Never repeat pilot');cpSync('src/lib/briefing',join(root,'candidate'),{recursive:true});
const files=walk(join(root,'candidate')).sort().map(p=>({path:relative(root,p).replaceAll('\\','/'),sha256:hash(readFileSync(p))}));
const manifest={capturedAt:new Date().toISOString(),files,artifactHash:hash(JSON.stringify(files)),version:'briefing-v4-compact-output',promptVersion:'briefing-prompt-v4-compact'};
writeFileSync(join(root,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
const key=parseEnv(readFileSync('.env.anthropic.local','utf8').replace(/^\uFEFF/,'')).ANTHROPIC_API_KEY;
const cases=JSON.parse(readFileSync('tools/quest-evaluation/private/q610-anthropic/development.json')).filter(c=>['q610-04','q610-06','q610-07'].includes(c.id));assert.equal(cases.length,3);
for(const c of cases){
 const r={...c,provenance:'observed',label:'v4-pilot',traceId:randomUUID(),conversationId:randomUUID(),startedAt:new Date().toISOString(),artifactHash:manifest.artifactHash};let stop=false;
 writeFileSync(join(root,c.id+'.attempt.json'),JSON.stringify({id:c.id,traceId:r.traceId,startedAt:r.startedAt}),{flag:'wx'});
 const service=loadService(join(root,'candidate/service.ts'),{env:{ANTHROPIC_API_KEY:key,BRIEFING_LLM_PROVIDER:'anthropic',BRIEFING_LLM_MODEL:'claude-haiku-5-5'},fetchImpl:async(url,opt)=>{
  assert.equal(url,'https://api.anthropic.com/v1/messages');r.providerRequest=JSON.parse(opt.body);assert.equal(r.providerRequest.max_tokens,1000);assert(Buffer.byteLength(opt.body)<20000);
  try{const response=await fetch(url,opt);r.httpStatus=response.status;r.requestId=response.headers.get('request-id');r.rawProviderBody=await response.clone().text();if(!response.ok)stop=true;return response;}catch(e){r.transportError=e.name;stop=true;throw e;}
 }});
 r.expectedVersion=service.version;r.implementationHash=service.implementationHash;
 try{r.generated=await service.generate(c.request,r.traceId,c.evidence,c.asOf);}catch(e){r.errorName=e.name;stop=true;}
 r.endedAt=new Date().toISOString();assert(!JSON.stringify(r).includes(key));writeFileSync(join(root,c.id+'.json'),JSON.stringify(r,null,2),{flag:'wx'});
 const raw=r.rawProviderBody?JSON.parse(r.rawProviderBody):null;
 console.log(JSON.stringify({id:c.id,http:r.httpStatus,status:r.generated?.result.status,stopReason:raw?.stop_reason,usage:raw?.usage,answer:r.generated?.result.answer,version:r.expectedVersion,artifactHash:r.artifactHash}));
 if(stop)throw Error('Operational failure saved; stop all calls');
}
