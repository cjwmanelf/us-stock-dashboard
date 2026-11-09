import { randomUUID } from 'node:crypto';
import { mkdir, realpath, readdir } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadService } from './service-loader.mjs';
import { digest, compare } from './evaluate.mjs';
import { saveSnapshot } from './store.mjs';
const privateRoot = fileURLToPath(new URL('../private/', import.meta.url));
const clone = value => JSON.parse(JSON.stringify(value));
export async function replay({ baseline, candidate, cases, directory, limit = 3, live = false, mock = false,
  env = process.env, fetchImpl = fetch }) {
  if (live && mock) throw new Error('Choose live or mock');
  if (env.VERCEL || env.VERCEL_ENV || env.K_SERVICE || env.K_REVISION || process.env.VERCEL || process.env.VERCEL_ENV || process.env.K_SERVICE || process.env.K_REVISION) throw new Error('Local only');
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('Limit 1..10 pairs');
  if (!Array.isArray(cases) || !cases.length) throw new Error('Frozen cases required');
  const selected = clone(cases.slice(0, limit));
  const secrets = Object.entries(env).filter(([k,v]) => /KEY|TOKEN|SECRET|COOKIE|PASSWORD|BEARER/i.test(k) && typeof v === 'string' && v.length >= 8).map(([,v])=>v);
  const clean = value => !secrets.some(secret => JSON.stringify(value).includes(secret));
  const ids = new Set();
  for (const c of selected) {
    if (!c.id || ids.has(c.id) || !['development','held-out'].includes(c.split) || c.inputOrigin !== 'synthetic' ||
      !/^[A-Z][A-Z0-9.-]{0,11}$/.test(c.request?.ticker ?? '') || typeof c.request.question !== 'string' || c.request.question.length > 500 ||
      !/^\d{4}-\d\d-\d\dT/.test(c.asOf) || !Number.isFinite(Date.parse(c.asOf)) || !Array.isArray(c.evidence) || c.evidence.length > 12 || !clean(c)) throw new Error('Invalid frozen fixture');
    ids.add(c.id);
    for (const e of c.evidence) if (!e.id || typeof e.title !== 'string' || !['news','filing','earnings'].includes(e.kind) ||
      !(e.url === null || /^https:\/\//.test(e.url)) || !(e.publishedAt === null || Number.isFinite(Date.parse(e.publishedAt)))) throw new Error('Invalid evidence');
  }
  let calls = 0;
  const providerEnv = live || mock ? Object.fromEntries(['ANTHROPIC_API_KEY','ANTHROPIC_BASE_URL','BRIEFING_LLM_PROVIDER','BRIEFING_LLM_API_KEY','BRIEFING_LLM_MODEL','BRIEFING_LLM_BASE_URL','BRIEFING_VERTEX_PROJECT_ID','BRIEFING_VERTEX_LOCATION','BRIEFING_VERTEX_AUTH','BRIEFING_VERTEX_ACCESS_TOKEN'].filter(k=>env[k]).map(k=>[k,env[k]])) : {};
  const boundedFetch = async (...args) => {
    if (!(live || mock) || ++calls > selected.length * 2) throw new Error('Call budget');
    return fetchImpl(...args);
  };
  const versions = [baseline,candidate].map(path=>loadService(path,{env:providerEnv,allowGoogleAuth:live,fetchImpl:boundedFetch}));
  if (versions[0].version === versions[1].version || versions[0].implementationHash === versions[1].implementationHash) throw new Error('Distinct implementation and VERSION required');
  if (!clean(versions.map(v=>v.version))) throw new Error('Invalid version metadata');
  const summary = { mode: mock ? 'mock' : live ? 'live' : 'dry-run', pairs: selected.length, maxCalls: selected.length*2,
    versions: versions.map(v=>({version:v.version,implementationHash:v.implementationHash})), completed:0, failed:0, abstentions:0, abstentionQuality: 'pending-manual-review' };
  if (!live && !mock) return summary;
  if ((providerEnv.BRIEFING_LLM_PROVIDER === 'anthropic' ? !providerEnv.ANTHROPIC_API_KEY : !providerEnv.BRIEFING_LLM_API_KEY && providerEnv.BRIEFING_LLM_PROVIDER !== 'vertex') || !providerEnv.BRIEFING_LLM_MODEL) throw new Error('Provider key and model required');
  await mkdir(privateRoot,{recursive:true,mode:0o700});
  const root = await realpath(privateRoot), out = resolve(directory);
  if (!relative(root,out) || relative(root,out).startsWith('..') || resolve(out) === root) throw new Error('Use a new private run directory');
  await mkdir(out,{recursive:true,mode:0o700});
  if ((await realpath(out)) !== out || (await readdir(out)).length) throw new Error('Output must be new and not symlinked');
  execFileSync('git',['check-ignore','--quiet',out],{cwd:root,stdio:'ignore'});
  const rows = [[],[]];
  for (const c of selected) for (let i=0;i<2;i++) {
    const traceId=randomUUID(), conversationId=randomUUID(), frozen=clone(c);
    let response=null, errorCode=null, usage=null;
    try {
      const generated=await versions[i].generate(clone(c.request),traceId,clone(c.evidence),c.asOf);
      response=clone(generated.result); usage=clone(generated.trace.usage ?? null);
      if (response.version !== versions[i].version || response.traceId !== traceId || response.asOf !== c.asOf || digest(response.sources)!==digest(c.evidence)) throw new Error('Replay mismatch');
      if (c.evidence.length && !['ok','insufficient_evidence'].includes(response.status)) errorCode='generation_failed';
      if (!clean({response,usage})) { response=null; usage=null; errorCode='secret_excluded'; }
    } catch { response=null; usage=null; errorCode='replay_failed'; }
    const record={schema:'quest-observation-v1',provenance:mock?'synthetic':'observed',inputOrigin:c.inputOrigin,
      caseId:c.id,split:c.split,request:frozen.request,evidence:frozen.evidence,asOf:c.asOf,evidenceOrigin:'independent-input',
      expectedVersion:versions[i].version,implementationHash:versions[i].implementationHash,freshConversation:true,conversationId,
      response,errorCode,usage};
    await saveSnapshot(join(out,i===0?'baseline':'candidate'),record); rows[i].push(record);
    if(response?.status === 'insufficient_evidence') summary.abstentions++;
    if(errorCode) summary.failed++; else summary.completed++;
    if(errorCode) return {...summary,calls,comparison:'pending-failed-call'}; // retain failure, no retries or further spend
  }
  return {...summary,calls,comparison:compare(...rows)};
}
