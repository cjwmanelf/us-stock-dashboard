import{readdirSync,readFileSync}from'node:fs';
const root='tools/quest-evaluation/private/q610-candidate/';
for(const n of readdirSync(root).filter(n=>/^(candidate|baseline)-q610-\d+\.json$/.test(n)).sort()){
 const r=JSON.parse(readFileSync(root+n)),raw=r.rawProviderBody?JSON.parse(r.rawProviderBody):null;
 console.log(JSON.stringify({file:n,question:r.request.question,status:r.generated?.result.status,stop:raw?.stop_reason,text:raw?.content?.filter(b=>b.type==='text').map(b=>b.text).join('')??r.generated?.result.answer}));
}
