import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadService} from '../src/service-loader.mjs';
const base=resolve('tools/quest-evaluation/private/q610-anthropic'),root=resolve('tools/quest-evaluation/private/q610-candidate');
const hash=x=>createHash('sha256').update(x).digest('hex');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const save=(n,v)=>writeFileSync(join(root,n),JSON.stringify(v,null,2),{flag:'wx'});
mkdirSync(root,{recursive:true});
const mode=process.argv[2];
if(mode==='freeze'){
 assert(!existsSync(join(root,'candidate')));cpSync('src/lib/briefing',join(root,'candidate'),{recursive:true});
 const files=walk(join(root,'candidate')).sort().map(p=>({path:relative(root,p).replaceAll('\\','/'),sha256:hash(readFileSync(p))}));
 save('manifest.json',{capturedAt:new Date().toISOString(),files,artifactHash:hash(JSON.stringify(files))});console.log(JSON.stringify({artifactHash:hash(JSON.stringify(files))}));
}else{
 const manifest=JSON.parse(readFileSync(join(root,'manifest.json'))),bm=JSON.parse(readFileSync(join(base,'manifest.json')));
 for(const [dir,m] of [[root,manifest],[base,bm]])for(const f of m.files)assert.equal(hash(readFileSync(join(dir,f.path))),f.sha256);
 const env={BRIEFING_LLM_PROVIDER:'anthropic',BRIEFING_LLM_MODEL:'claude-haiku-5-5',ANTHROPIC_API_KEY:mode==='offline'?'offline-secret':parseEnv(readFileSync('.env.anthropic.local','utf8')).ANTHROPIC_API_KEY};
 if(mode==='offline'){
 const results=[];
 for(let i=1;i<=20;i++){
 const r=JSON.parse(readFileSync(join(base,`q610-${String(i).padStart(2,'0')}.json`)));if(!r.rawProviderBody)continue;
 const svc=loadService(join(root,'candidate/service.ts'),{env,fetchImpl:async()=>new Response(r.rawProviderBody)});
 const out=await svc.generate(r.request,randomUUID(),r.evidence,r.asOf);results.push({caseId:r.id,status:out.result.status});
 assert.equal(out.result.status,['q610-10','q610-15'].includes(r.id)?'unavailable':'ok');
 }save('offline-replay.json',{mode:'captured-body-replay-not-live',results});console.log('PASS offline19:17ok,2unchanged downstream failures');
 }else{
 assert(['dev','heldout'].includes(mode));if(mode==='heldout')assert(existsSync(join(root,'development-gate.json'))&&JSON.parse(readFileSync(join(root,'development-gate.json'))).proceed===true);
 const cases=JSON.parse(readFileSync(join(base,mode==='dev'?'development.json':'held-out.json')));
 for(const c of cases)for(const label of mode==='dev'?['candidate']:['baseline','candidate']){
 const name=`${label}-${c.id}.json`;assert(!existsSync(join(root,name)));
 const prior=readdirSync(root).filter(n=>/^(candidate|baseline)-q610-\d+\.json$/.test(n));assert(prior.length<40);
 let spent=0.0052899;for(const n of prior){const r=JSON.parse(readFileSync(join(root,n)));if(r.rawProviderBody){const u=JSON.parse(r.rawProviderBody).usage;spent+=(u?.input_tokens??0)*.1/1e6+(u?.output_tokens??0)*.5/1e6;}}
 assert(spent+.003<1);
 const row={...c,provenance:'observed',traceId:randomUUID(),conversationId:randomUUID(),label,startedAt:new Date().toISOString(),artifactHash:(label==='candidate'?manifest:bm).artifactHash};let stop=false;
 const fetchImpl=async(url,opt)=>{
 assert.equal(url,'https://api.anthropic.com/v1/messages');const body=JSON.parse(opt.body);assert.equal(body.max_tokens,1000);assert.equal(body.model,env.BRIEFING_LLM_MODEL);assert(Buffer.byteLength(opt.body)<24000);
 row.providerRequest=body;row.providerStartedAt=new Date().toISOString();
 // Persist an attempt marker before transport, with no headers/credentials; never retry it automatically.
 save(name+'.attempt',{caseId:c.id,label,traceId:row.traceId,startedAt:row.startedAt});
 try{const response=await fetch(url,opt);row.httpStatus=response.status;row.requestId=response.headers.get('request-id');row.rawProviderBody=await response.clone().text();row.providerEndedAt=new Date().toISOString();if(!response.ok)stop=true;return response;}catch(e){row.transportError=e.name;stop=true;throw e;}
 };
 const svc=loadService(join(label==='candidate'?root:base,label==='candidate'?'candidate/service.ts':'baseline/service.ts'),{env,fetchImpl});row.expectedVersion=svc.version;row.implementationHash=svc.implementationHash;
 try{row.generated=await svc.generate(structuredClone(c.request),row.traceId,structuredClone(c.evidence),c.asOf);}catch(e){row.errorName=e.name;stop=true;}
 row.endedAt=new Date().toISOString();assert(!JSON.stringify(row).includes(env.ANTHROPIC_API_KEY));save(name,row);
 console.log(JSON.stringify({caseId:c.id,label,http:row.httpStatus??null,status:row.generated?.result.status,usage:row.generated?.trace.usage??null}));
 if(stop)throw Error('Operational failure recorded; all collection stopped');
 } }
}
