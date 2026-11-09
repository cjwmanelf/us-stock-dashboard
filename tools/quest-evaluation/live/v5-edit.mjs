import{readFileSync,writeFileSync}from'node:fs';
let s=readFileSync('src/lib/briefing/service.ts','utf8');
const re=/\{ role: "system", content: ("(?:[^"\\]|\\.)*") \}/;
const p=JSON.parse(s.match(re)[1]);
const next=p.replace('publishedAt은 피드 날짜다(news 발행/filing 접수/earnings 일정 또는 보고기간). 특히 earnings 날짜를 실제 발표일로 단정하지 않는다.', 'publishedAt은 피드의 날짜 메타데이터다. kind가 filing이라는 이유만으로 SEC 자료, 접수일 또는 실제 사건일이라고 이름붙이지 않는다. 제목이나 명시적 provenance가 뒷받침할 때만 그 의미를 말한다. earnings 날짜도 실제 발표일로 단정하지 않는다.').replace('관련 사실을 제시할 근거가 전혀 없으면 다음 JSON 그대로 반환한다:', '요청과 관련된 사실이 제목에 있으면 그 사실을 인용해 부분 답변하고 질문 중 확인 불가한 부분을 구분한다. 미래 행사 예정 제목은 예정이라는 사실을 설명하고 완료 여부와 결과는 확인 불가라고 명시한다. 이런 부분 근거가 있으면 일반 보류로 대체하지 않는다. 관련 사실이 전혀 없거나 근거가 명시적으로 다른 종목에만 해당할 때만 다음 JSON 그대로 반환한다:');
if(next===p||!next.includes('명시적 provenance'))throw Error('Prompt replacement failed');
s=s.replace(re,()=>'{ role: "system", content: '+JSON.stringify(next)+' }').replace('briefing-prompt-v4-compact','briefing-prompt-v5-partial');writeFileSync('src/lib/briefing/service.ts',s);
const f='src/lib/briefing/types.ts';writeFileSync(f,readFileSync(f,'utf8').replace('briefing-v4-compact-output','briefing-v5-partial-evidence'));
const t='scripts/briefing-v3-check.cjs';writeFileSync(t,readFileSync(t,'utf8').replace('briefing-v4-compact-output','briefing-v5-partial-evidence').replace('briefing-prompt-v4-compact','briefing-prompt-v5-partial').replace("assert(prompt.includes('filing 접수'));assert(prompt.includes('earnings 일정 또는 보고기간'));","assert(prompt.includes('kind가 filing이라는 이유만으로 SEC 자료'));assert(prompt.includes('earnings 날짜도 실제 발표일로 단정하지 않는다'));"));
