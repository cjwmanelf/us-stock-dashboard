import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const root='tools/quest-evaluation/private/q610-anthropic/';
const rows=readdirSync(root).filter(n=>/^q610-\d+\.json$/.test(n)).sort().map(n=>JSON.parse(readFileSync(root+n)));
let input=0,output=0,thinking=0;
for(const r of rows){
 const raw=r.rawProviderBody?JSON.parse(r.rawProviderBody):null;
 const text=raw?.content?.filter(b=>b.type==='text').map(b=>b.text).join('')??null;
 let parsed=null,format='no-model-call';
 if(text!==null){try{parsed=JSON.parse(text);format='json'}catch{format='invalid-json';try{parsed=JSON.parse(text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));format='fenced-json'}catch{}}}
 input+=raw?.usage?.input_tokens??0;output+=raw?.usage?.output_tokens??0;thinking+=raw?.usage?.output_tokens_details?.thinking_tokens??0;
 const view={caseId:r.id,question:r.request.question,evidence:r.evidence,serviceStatus:r.generated?.result.status,http:r.httpStatus??null,stopReason:raw?.stop_reason??null,blockTypes:raw?.content?.map(b=>b.type)??[],format,text,parsed};
 console.log(JSON.stringify(view));
}
const stats={attempts:rows.length,modelCalls:rows.filter(r=>r.providerRequest).length,ok:rows.filter(r=>r.generated?.result.status==='ok').length,inputTokens:input,outputTokensIncludingThinking:output,thinkingTokensSubset:thinking,tokenPricedEstimateUSD:input*0.1/1e6+output*0.5/1e6,billedCostUSD:null};
writeFileSync(root+'aggregate.json',JSON.stringify(stats,null,2));console.log(JSON.stringify(stats));
