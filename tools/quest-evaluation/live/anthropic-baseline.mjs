import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { parseEnv } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadService } from '../src/service-loader.mjs';

const root=resolve('tools/quest-evaluation/private/q610-anthropic');
const hash=x=>createHash('sha256').update(x).digest('hex');
const save=(name,value)=>writeFileSync(join(root,name),JSON.stringify(value,null,2),{flag:'wx'});
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
mkdirSync(root,{recursive:true});
execFileSync('git',['check-ignore','--quiet',root],{stdio:'ignore'});
const mode=process.argv[2];
if(mode==='freeze') {
  if(existsSync(join(root,'baseline'))) throw Error('Baseline already frozen');
  cpSync('src/lib/briefing',join(root,'baseline'),{recursive:true});
  const files=walk(join(root,'baseline')).sort().map(p=>({path:relative(root,p).replaceAll('\\','/'),sha256:hash(readFileSync(p))}));
  save('manifest.json',{capturedAt:new Date().toISOString(),files,artifactHash:hash(JSON.stringify(files)),model:'claude-haiku-5-5',provider:'anthropic'});
  for(const split of ['development','held-out']) cpSync(`tools/quest-evaluation/private/q610-offline/${split}.json`,join(root,`${split}.json`),{errorOnExist:true,force:false});
  console.log('Frozen baseline and separate development/held-out corpus; no calls');
} else if(mode==='smoke'||mode==='continue') {
  const manifest=JSON.parse(readFileSync(join(root,'manifest.json')));
  for(const f of manifest.files) if(hash(readFileSync(join(root,f.path)))!==f.sha256) throw Error('Frozen source changed');
  // Node's built-in dotenv parser; only the one required key enters the loader environment.
  const key=parseEnv(readFileSync('.env.anthropic.local','utf8')).ANTHROPIC_API_KEY;
  if(!key) throw Error('Missing Anthropic key');
  const env={ANTHROPIC_API_KEY:key,BRIEFING_LLM_PROVIDER:'anthropic',BRIEFING_LLM_MODEL:'claude-haiku-5-5'};
  const cases=JSON.parse(readFileSync(join(root,'development.json'))).slice(mode==='smoke'?0:3,mode==='smoke'?3:20);
  let active=null,stop=false;
  const fetchImpl=async(url,options)=>{
    if(url!=='https://api.anthropic.com/v1/messages') throw Error('Provider boundary');
    const body=JSON.parse(options.body);
    if(body.max_tokens!==1000 || body.model!=='claude-haiku-5-5' || Buffer.byteLength(options.body)>24000) throw Error('Request budget');
    active.providerRequest=body; active.providerStartedAt=new Date().toISOString();
    try {
      const response=await fetch(url,options);
      active.httpStatus=response.status; active.requestId=response.headers.get('request-id');
      active.rawProviderBody=await response.clone().text();
      active.providerEndedAt=new Date().toISOString();
      if([401,402,403,429].includes(response.status)) stop=true;
      return response;
    } catch(e) {active.transportError=e.name;active.providerEndedAt=new Date().toISOString();stop=true;throw e;}
  };
  const service=loadService(join(root,'baseline/service.ts'),{env,fetchImpl});
  for(const c of cases) {
    const file=`${c.id}.json`;
    if(existsSync(join(root,file))) throw Error('Never repeat completed attempt');
    if(readdirSync(root).filter(n=>/^q610-\d+\.json$/.test(n)).length>=30) throw Error('Batch cap');
    active={schema:'q610-live-observation-v1',provenance:'observed',...c,executionStatus:'started',traceId:randomUUID(),conversationId:randomUUID(),startedAt:new Date().toISOString(),artifactHash:manifest.artifactHash,implementationHash:service.implementationHash,expectedVersion:service.version};
    try {active.generated=await service.generate(structuredClone(c.request),active.traceId,structuredClone(c.evidence),c.asOf);active.executionStatus='completed';}
    catch(e){active.executionStatus='failed';active.errorName=e.name;stop=true;}
    active.endedAt=new Date().toISOString();
    if(active.generated && (active.generated.result.traceId!==active.traceId || active.generated.trace.traceId!==active.traceId)) throw Error('Trace mismatch');
    if(JSON.stringify(active).includes(key)) throw Error('Secret exclusion');
    save(file,active);
    console.log(JSON.stringify({caseId:c.id,status:active.generated?.result.status,http:active.httpStatus??null,durationMs:active.generated?.trace.durationMs,usage:active.generated?.trace.usage??null}));
    if(stop) {process.exitCode=2;break;}
  }
} else throw Error('Choose freeze, smoke, or continue; live calls require coordinator ready notification');
