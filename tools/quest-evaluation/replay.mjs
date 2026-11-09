import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { replay } from './src/replay.mjs';
try {
  const {values:v}=parseArgs({options:{baseline:{type:'string'},candidate:{type:'string'},cases:{type:'string'},out:{type:'string'},limit:{type:'string',default:'3'},live:{type:'boolean',default:false}}});
  const cases=JSON.parse(await readFile(v.cases ?? new URL('./fixtures/cases.json',import.meta.url),'utf8'));
  const result=await replay({...v,directory:v.out,limit:Number(v.limit),cases});
  console.log(JSON.stringify(result,null,2));
  if(result.failed) process.exitCode=1;
} catch { console.error('Replay failed: verify distinct local service artifacts, frozen cases, private output and provider environment. Sensitive details suppressed.'); process.exitCode=1; }
