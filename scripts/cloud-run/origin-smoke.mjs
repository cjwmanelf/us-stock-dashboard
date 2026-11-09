import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve} from 'node:path';
if (!process.argv[2]) throw new Error('Usage: node scripts/cloud-run/origin-smoke.mjs PATH_TO_STANDALONE');
const directory=resolve(process.argv[2]);
let checks=0;
for (const mode of ['cloud-configured','cloud-missing','local-configured']) {
  const port=19000+Math.floor(Math.random()*10000);
  const address=`http://127.0.0.1:${port}`;
  const trusted=mode==='local-configured'?address:'https://isolated-service.run.app';
  const env={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,NODE_ENV:'production',HOSTNAME:'0.0.0.0',PORT:String(port),NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'https://placeholder.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_placeholder',BRIEFING_EVAL_MODE:'false',LANGFUSE_ENABLED:'false'};
  if(mode.startsWith('cloud'))env.K_SERVICE='isolated-service';
  if(mode!=='cloud-missing')env.BRIEFING_ALLOWED_ORIGINS=trusted;
  const child=spawn(process.execPath,['server.js'],{cwd:directory,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  try {
    await new Promise((resolve,reject)=>{
      let output='';const timer=setTimeout(()=>reject(Error('Standalone startup timed out')),15000);
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.once('exit',()=>{clearTimeout(timer);reject(Error('Standalone exited before startup'));});
      child.stdout.on('data',data=>{output+=data;if(output.includes('Ready')){clearTimeout(timer);resolve();}});
    });
    for(const path of ['/login','/logo.png']){const response=await fetch(address+path);assert.equal(response.status,200,path);await response.arrayBuffer();checks++;}
    for(const path of ['/api/briefing','/api/briefing/feedback']){
      for(const [origin,status,spoof] of [[trusted,mode==='cloud-missing'?403:401,false],['https://evil.example',403,false],['https://evil.example',403,true],['null',403,false],[undefined,403,false]]){
        const response=await fetch(address+path,{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{}),...(spoof?{Host:'evil.example','X-Forwarded-Host':'evil.example','X-Forwarded-Proto':'https',Forwarded:'host=evil.example;proto=https'}:{})},body:'{}',redirect:'manual'});
        const body=await response.json();assert.equal(response.status,status,`${mode} ${path} ${origin}`);assert.equal(body.error?.code,status===401?'UNAUTHORIZED':'ORIGIN_NOT_ALLOWED');checks++;
      }
    }
    console.log(`PASS: ${mode}, login/static and both API origin/auth guards`);
  } finally {if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}child.stdout.destroy();child.stderr.destroy();}
}
console.log(`PASS: ${checks} standalone HTTP checks; no real credentials or external API requests`);
