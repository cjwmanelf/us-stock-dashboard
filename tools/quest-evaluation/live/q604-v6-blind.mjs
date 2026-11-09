import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {randomUUID,randomInt,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='tools/quest-evaluation/private/q604-v6-evaluation/';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const files=readdirSync(root).filter(n=>/^heldout-v[26]-.+\.json$/.test(n));assert.equal(files.length,20);
const answers=[],mapping={};
for(const file of files){const row=read(root+file),id=randomUUID();mapping[id]={file,label:row.label};answers.push({blindId:id,caseId:row.id,answer:row.generated.result.answer,sources:row.generated.result.sources});}
for(let i=answers.length-1;i>0;i--){const j=randomInt(i+1);[answers[i],answers[j]]=[answers[j],answers[i]];}
writeFileSync(root+'blind-map.json',JSON.stringify(mapping,null,2),{flag:'wx'});
writeFileSync(root+'blind-answers.json',JSON.stringify(answers,null,2),{flag:'wx'});
const manifest={createdAt:new Date().toISOString(),count:20,policy:'No version, trace, status, timing or usage in blind answers; map stays unopened until all20 judgments frozen.',answersSha256:createHash('sha256').update(readFileSync(root+'blind-answers.json')).digest('hex')};
writeFileSync(root+'blind-manifest.json',JSON.stringify(manifest,null,2),{flag:'wx'});
console.log(JSON.stringify(manifest));
