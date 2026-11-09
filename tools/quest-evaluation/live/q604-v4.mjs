// Sealed independent holdout runner; never opens q610's previous held-out cases.
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import { loadService } from '../src/service-loader.mjs';
const root=resolve('tools/quest-evaluation/private/q604-v4-evaluation');
const sealed=resolve('tools/quest-evaluation/private/q604-holdout-v3');
const v2root=resolve('tools/quest-evaluation/private/q610-candidate');
const devroot=resolve('tools/quest-evaluation/private/q610-anthropic');
const expectedCorpus='4cf93004303649f0f77d2c0dbed724ad5f3930471e029f45c95fec80b6d7ef97';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(name,obj)=>writeFileSync(join(root,name),JSON.stringify(obj,null,2)+'\n',{flag:'wx'});
const verify=(base,files)=>files.forEach(f=>assert.equal(sha(readFileSync(join(base,f.path))),f.sha256));
mkdirSync(root,{recursive:true});
const mode=process.argv[2];
function inputs(){
  const m=read(join(sealed,'manifest.json'));
  assert.equal(m.corpusHash,expectedCorpus);
  for(const [name,hash]of Object.entries(m.files))assert.equal(sha(readFileSync(join(sealed,name))),hash);
  assert.equal(sha(Object.keys(m.files).sort().map(k=>k+' '+m.files[k]).join('\n')),expectedCorpus);
  const heldout=read(join(sealed,'cases.json')),dev=read(join(devroot,'development.json'));
  assert.equal(heldout.length,10);assert.equal(dev.length,20);
  assert.equal(heldout.filter(c=>c.group==='normal').length,5);
  assert.equal(heldout.filter(c=>c.group==='problem').length,5);
  assert(dev.every(c=>/^q610-(0[1-9]|1[0-9]|20)$/.test(c.id)));
  assert.equal(new Set([...heldout,...dev].map(c=>c.id)).size,30);
  const v2=read(join(v2root,'manifest.json'));verify(v2root,v2.files);
  return {heldout,dev,v2,developmentHash:sha(readFileSync(join(devroot,'development.json')))};
}
const prepared=inputs();
if(mode==='prepare'){
  save('preparation.json',{createdAt:new Date().toISOString(),corpusHash:expectedCorpus,developmentHash:prepared.developmentHash,
    v2ArtifactHash:prepared.v2.artifactHash,normal:5,problem:5,developmentCount:20,modelCalls:0,sourceReady:false,
    cumulativeStartingEstimateUsd:0.0236651,smokeCostExcluded:true,maxAdditionalServiceInvocations:40,
    restrictions:'No previous held-out opened; do not share sealed case content with coder; no live until coordinator source-ready and freeze.'});
  console.log(JSON.stringify({prepared:true,developmentCount:20,heldoutCount:10,corpusHash:expectedCorpus,modelCalls:0}));
}else if(mode==='freeze'){
  assert.equal(process.argv[3],'--coordinator-source-ready');
  const pilot=resolve('tools/quest-evaluation/private/q610-v4-pilot');
  const approved=read(join(pilot,'manifest.json'));
  assert.equal(approved.artifactHash,'391f992def97b440b1b4514529d3b23f767e8636ccc6fb97b376d3aa768cd054');
  assert.equal(sha(JSON.stringify(approved.files)),approved.artifactHash);
  verify(pilot,approved.files);
  assert(!existsSync(join(root,'candidate')));
  cpSync(join(pilot,'candidate'),join(root,'candidate'),{recursive:true});
  verify(root,approved.files);
  const svc=loadService(join(root,'candidate/service.ts'));
  const old=loadService(join(v2root,'candidate/service.ts'));
  assert.equal(svc.version,'briefing-v4-compact-output');
  assert.notEqual(svc.version,old.version);assert.notEqual(svc.implementationHash,old.implementationHash);
  save('manifest.json',{capturedAt:new Date().toISOString(),files:approved.files.map(f=>({...f,path:f.path.replace(/^candidate\//,'')})),artifactHash:approved.artifactHash,
    version:svc.version,implementationHash:svc.implementationHash,baselineVersion:old.version,
    baselineArtifactHash:prepared.v2.artifactHash,baselineImplementationHash:old.implementationHash,
    corpusHash:expectedCorpus,developmentHash:prepared.developmentHash,sourceReadyConfirmed:true,pilotExcluded:true,
    changes:'thinking disabled, effort low, JSON schema and compact prompt; same model/max_tokens1000/timeout15s'});
  console.log(JSON.stringify({frozen:true,version:svc.version,artifactHash:approved.artifactHash,modelCalls:0}));}else if(['dev','heldout'].includes(mode)){
  assert.equal(process.argv[3],'--live');
  const manifest=read(join(root,'manifest.json'));assert.equal(manifest.sourceReadyConfirmed,true);
  verify(join(root,'candidate'),manifest.files);assert.equal(manifest.corpusHash,expectedCorpus);
  assert.equal(manifest.developmentHash,prepared.developmentHash);
  assert(!existsSync(join(root,'STOP.json')),'Prior failure requires coordinator review, not retry');
  if(mode==='heldout')assert.equal(read(join(root,'development-gate.json')).proceed,true);
  const key=parseEnv(readFileSync('.env.anthropic.local','utf8').replace(/^\uFEFF/,'' )).ANTHROPIC_API_KEY;
  assert(typeof key==='string'&&key.length>10,'Configured key required');
  const env={BRIEFING_LLM_PROVIDER:'anthropic',BRIEFING_LLM_MODEL:'claude-haiku-5-5',ANTHROPIC_API_KEY:key};
  const cases=mode==='dev'?prepared.dev:prepared.heldout;
  for(const c of cases)for(const label of mode==='dev'?['v4']:['v2','v4']){
    const name=`${mode}-${label}-${c.id}.json`;
    assert(!existsSync(join(root,name))&&!existsSync(join(root,name+'.attempt')),'Never rerun an attempt');
    const attemptNames=readdirSync(root).filter(n=>n.endsWith('.json.attempt'));assert(attemptNames.length<40);
    let spent=0.0236651;
    for(const n of readdirSync(root).filter(n=>/^(dev|heldout)-v[24]-.+\.json$/.test(n))){
      const r=read(join(root,n));if(r.providerAttempted){assert(Number.isFinite(r.estimatedUsd),'Unknown prior cost');spent+=r.estimatedUsd;}
    }
    assert(spent+0.003<1,'Cumulative estimate reservation exceeds cap');
    const row={...structuredClone(c),schema:'q604-live-observation-v1',provenance:'observed',inputOrigin:'synthetic',label,phase:mode,executionStatus:'attempted',
      traceId:randomUUID(),conversationId:randomUUID(),startedAt:new Date().toISOString(),providerAttempted:false,
      artifactHash:label==='v4'?manifest.artifactHash:manifest.baselineArtifactHash,model:env.BRIEFING_LLM_MODEL};
    save(name+'.attempt',{caseId:c.id,label,phase:mode,executionStatus:'attempted',traceId:row.traceId,startedAt:row.startedAt,artifactHash:row.artifactHash});
    let stop=false;
    const fetchImpl=async(url,opt)=>{
      assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(row.providerAttempted,false,'No retries');
      const body=JSON.parse(opt.body);assert.equal(body.max_tokens,1000);assert.equal(body.model,env.BRIEFING_LLM_MODEL);
      assert(Buffer.byteLength(opt.body)<24000,'Request budget guard');
      if(label==='v4'){assert.equal(body.thinking?.type,'disabled');assert.equal(body.output_config?.effort,'low');assert.equal(body.output_config?.format?.type,'json_schema');}row.providerAttempted=true;row.providerRequest=body;row.providerStartedAt=new Date().toISOString();
      try{
        const res=await fetch(url,opt);row.httpStatus=res.status;row.requestId=res.headers.get('request-id');
        row.rawProviderBody=await res.clone().text();row.providerEndedAt=new Date().toISOString();
        if(!res.ok)stop=true;
        try{const usage=JSON.parse(row.rawProviderBody).usage;
          if(usage&&Number.isFinite(usage.input_tokens)&&Number.isFinite(usage.output_tokens)){
            row.nativeUsage=usage;row.estimatedUsd=usage.input_tokens*.1/1e6+usage.output_tokens*.5/1e6;
            if((usage.cache_creation_input_tokens??0)!==0||(usage.cache_read_input_tokens??0)!==0){row.costUnverified=true;stop=true;}
          }else{row.costUnverified=true;stop=true;}
        }catch{row.costUnverified=true;stop=true;}
        return res;
      }catch(e){row.transportError=['TimeoutError','AbortError'].includes(e.name)?e.name:'transport_error';stop=true;throw e;}
    };
    const svc=loadService(join(label==='v4'?join(root,'candidate'):join(v2root,'candidate'),'service.ts'),{env,fetchImpl});
    row.expectedVersion=svc.version;row.implementationHash=svc.implementationHash;
    const started=Date.now();
    try{row.generated=await svc.generate(structuredClone(c.request),row.traceId,structuredClone(c.evidence),c.asOf);
      assert.equal(row.generated.result.traceId,row.traceId);assert.equal(row.generated.result.asOf,c.asOf);
      assert.equal(row.generated.result.version,row.expectedVersion);
    }catch{row.serviceError='generation_or_identity_error';stop=true;}
    row.executionStatus='completed';row.durationMs=Date.now()-started;row.endedAt=new Date().toISOString();
    row.operationalFailure=!!row.transportError||!!row.serviceError||(row.httpStatus!=null&&row.httpStatus!==200)||(row.generated?.result.status==='unavailable'&&row.evidence.length>0);
    row.taskAbstention=row.generated?.result.status==='insufficient_evidence';
    if(!row.providerAttempted)row.estimatedUsd=0;
    assert(!JSON.stringify(row).includes(key),'Secret must never enter record');save(name,row);
    console.log(JSON.stringify({caseId:c.id,label,status:row.generated?.result.status,http:row.httpStatus??null,operationalFailure:row.operationalFailure}));
    if(stop){save('STOP.json',{caseId:c.id,label,at:new Date().toISOString(),reason:'Operational or cost integrity stop; no automatic retry'});throw Error('Stopped after retained failure');}
  }
}else throw Error('prepare | freeze --coordinator-source-ready | dev/heldout --live');
