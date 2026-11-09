const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let userCalls = 0;
let authenticated = false;
class BriefingError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const file = resolve(__dirname, '../../src/lib/briefing/http.ts');
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded = {exports:{}};
vm.runInThisContext('(function(require,module,exports){' + compiled + '\n})', {filename:file})(id => {
  if(id === 'server-only') return {};
  if(id === './guards') return {BriefingError};
  if(id === '@/lib/supabase/server') return {createClient:async()=>({auth:{getUser:async()=>{userCalls++;return {data:{user:authenticated?{id:'verified-user'}:null},error:null};}}})};
  throw Error('Unexpected dependency '+id);
}, loaded, loaded.exports);
const {isAllowedBriefingOrigin: allowed, authenticate} = loaded.exports;
const cloud = {K_SERVICE:'isolated-service',BRIEFING_ALLOWED_ORIGINS:'https://isolated-service.run.app'};
function req(origin, url='http://0.0.0.0:8080/api/briefing', headers={}) {return new Request(url,{method:'POST',headers:{...(origin === undefined?{}:{Origin:origin}),...headers}});}
let count=0;
function check(request,env,expected){assert.equal(allowed(request,env),expected);count++;}
check(req('https://isolated-service.run.app'),cloud,true);
check(req('http://localhost:3000'),{BRIEFING_ALLOWED_ORIGINS:'http://localhost:3000'},true);
check(req('http://127.0.0.1:3000'),{BRIEFING_ALLOWED_ORIGINS:'http://127.0.0.1:3000'},true);
check(req('http://[::1]:3000'),{BRIEFING_ALLOWED_ORIGINS:'http://[::1]:3000'},true);
check(req('https://second.example'),{BRIEFING_ALLOWED_ORIGINS:'https://first.example, https://second.example'},true);
for(const origin of [undefined,'null','not-a-url','https://evil.example','https://isolated-service.run.app.evil.example','https://isolated-service.run.app/path','https://isolated-service.run.app?x=1','https://user@isolated-service.run.app','http://isolated-service.run.app','https://isolated-service.run.app:444']) check(req(origin),cloud,false);
for(const value of ['', 'null','*','https://*.example','https://good.example/','https://user:pass@good.example','https://good.example/path','https://good.example?x=1','https://good.example#x','https://good.example,','http://public.example','https://good.example,not-url']) check(req('https://good.example'),{BRIEFING_ALLOWED_ORIGINS:value},false);
for(const marker of ['K_SERVICE','K_REVISION','K_CONFIGURATION']) {
  check(req('https://good.example','https://good.example/api'),{[marker]:'cloud'},false);
  check(req('http://localhost:3000'),{[marker]:'cloud',BRIEFING_ALLOWED_ORIGINS:'http://localhost:3000'},false);
}
check(req('https://good.example','https://good.example/api'),{},true);
check(req('http://localhost:3000','http://localhost:3000/api'),{},true);
check(req('http://0.0.0.0:8080'),{},false);
check(req('http://public.example','http://public.example/api'),{},false);
for(const env of [cloud,{}, {K_SERVICE:'cloud'}]) check(req('https://evil.example','https://good.example/api',{Host:'evil.example','X-Forwarded-Host':'evil.example','X-Forwarded-Proto':'https',Forwarded:'host=evil.example;proto=https'}),env,false);
for(const route of ['src/app/api/briefing/route.ts','src/app/api/briefing/feedback/route.ts']) assert.match(readFileSync(resolve(__dirname,'../..',route),'utf8'),/await authenticate\(request\)/);
(async()=>{
  const saved={...process.env};
  try {
    Object.assign(process.env,cloud,{NEXT_PUBLIC_SUPABASE_URL:'https://placeholder.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_placeholder'});
    await assert.rejects(authenticate(req('https://evil.example')), e=>e.status===403);assert.equal(userCalls,0);
    await assert.rejects(authenticate(req('https://isolated-service.run.app')), e=>e.status===401);assert.equal(userCalls,1);
    authenticated=true;assert.equal(await authenticate(req('https://isolated-service.run.app')),'verified-user');assert.equal(userCalls,2);
    console.log(`PASS: ${count} origin cases, both route guards, rejected origins skip auth, accepted origins still require getUser`);
  } finally {for(const name of Object.keys(process.env))if(!(name in saved))delete process.env[name];Object.assign(process.env,saved);}
})().catch(error=>{console.error(error);process.exitCode=1;});
