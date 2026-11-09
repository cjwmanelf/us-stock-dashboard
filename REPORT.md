# Main Quest AI 브리핑 개선 보고서

2026-11-09 실측 통합본. 한국어 자산 대시보드의 종목 뉴스·공시·실적 메타데이터 브리핑을 개선했다([제품 정의](PRD.md)). 기사 본문·실시간 가격·개인 보유내역 분석은 범위 밖이다. **v2·v3·v4·v5는 게이트 실패, v6는 독립 평가 PASS 후 배포 및 새 대화3건 검증 완료**다. 실제 사용자 정성 피드백1건과 AI 운영자 피드백 저장 테스트1건을 구별한다. 출처 표시 UI 배포·브라우저 검증도 완료했다. 실제 PR 링크와 요청된 독립 Claude 검토는 코디네이터 후속이며 과제 전체 완료를 단정하지 않는다.

## 1. 로그 수와 직접 평가 대화 제작 방법

실제 `generateBriefingFromEvidence`를 동결된 TypeScript 소스에서 호출했다. 질문·근거·asOf를 사전에 고정하고 호출마다 새 trace/conversation UUID를 생성해 결과와 대조했다. 합성 질문과 합성 제목·수치에 대한 **실제 모델 응답**이며 실사용자 대화나 실제 시장 뉴스 수집이라고 부르지 않는다. 입력·원본·usage·종료 이유·시간·실패는 ignored private 저장소에 보존하고 공개에는 안전한 집계와 trace 연결만 제공한다.

| 완료 배치 | 서비스 실행 | 실제 모델 호출 | 토큰 단가 추정 USD |
| --- | ---: | ---: | ---: |
| v1/v2 개발·기존 hold-out 비교 | 60 | 58 | 0.0157906 |
| v3 추가 개발 | 20 | 18 | 0.0072902 |
| 위 두 배치 소계 | **80** | **76** | **0.0230808** |
| v4 선택 개발 파일럿 | 3 | 3 | 0.0005843 |
| v4 전체 개발 | 20 | 18 | 0.0034094 |
| v5 개발 및 독립 hold-out 쌍대 평가 | 40 | 37 | 0.0090198 |
| v6 개발 및 새 독립 hold-out 쌍대 평가 | 40 | 37 | 0.0095987 |
| 현재 확인된 로컬 평가 합계 | **183** | **171** | **0.0456930** |
| 별도: 배포 baseline 새 대화 | **3** | **3** | **0.0020803** |
| 별도: 배포 v6 새 대화 | **3** | **3** | **0.0015708** |
| 별도: 최종 UI smoke | **1** | **1** | **0.0005209** |

초기 provider smoke·Models GET은 위 로컬 합계에 포함하지 않으며 프로젝트 청구 총액이 아니다. 원격6건은 별도 행이며 실시간 제공자 피드로 실행했다. v3 비교의 v2 응답은 재사용했으므로 v2 20회를 다시 더하지 않는다. v4 파일럿3건은 같은 개발 사례의 별도 호출이며 신규 사례가 아니다. 로컬 서로 다른 입력은 **개발20+각기 다른 hold-out10개씩3셋=50개**다. v3/v4의 독립셋 미실행은 당시 상태였고 이후 v5가 소비했다. v6는 또 다른 평가자가 만든 새10개를 사용했으며 이제 그 셋도 미노출 셋이라고 재사용할 수 없다.

[v6 실제 평가](docs/quest/v6-live-evaluation.md)의 개발·hold-out 안전 CSV는 실제 trace/버전/usage/판정을 제공한다. [최종 공개 자료](docs/quest/evidence/final-README.md)에 합성 독립 입력10개·rubric·protocol·실제 최종 응답20개·blind 판정·hash를 제공한다. 과거 v1/v2 원본 소스 각14개도 공개하여 오프라인 검증할 수 있다. native 원문은 비공개이며 새 모델 실행의 동일 답변을 보장하지 않는다.

공개 재현 증거: [입력30개](docs/quest/evidence/q610-synthetic-cases.json), [v1/v2 실제 trace CSV](docs/quest/evidence/q610-comparison.csv), [JSON·쌍 검증](docs/quest/evidence/q610-comparison.json), [v3 trace CSV](docs/quest/q604-v3-development-evidence.csv), [v4 전체 평가 및 CSV 연결](docs/quest/v4-live-evaluation.md). 실행은 [baseline runner](tools/quest-evaluation/live/anthropic-baseline.mjs), [v2 runner](tools/quest-evaluation/live/candidate.mjs), [v3 runner](tools/quest-evaluation/live/q604-v3.mjs)를 사용했다. 사례별 1회가 기본이며 실패를 지우기 위한 임의 retry는 하지 않았다. 최초 30×3=90응답/버전 계획은 실행되지 않았다.

## 2. 독립 실패 후보와 실제 trace·반복·첫 단계

v1의 실제 첫 실패는 추출기 한 종류다. 아래 후속 후보는 원문 최종 text의 잠재 오류이며 baseline UI에서 노출됐다고 주장하지 않는다. [상세 분석](docs/quest/live-baseline-analysis.md)과 CSV에서 아래 trace를 확인할 수 있다.

| 후보 | 사례·실제 trace 예시 | 반복·분모 | 최초 문제 단계 |
| --- | --- | --- | --- |
| 알려진 thinking 블록을 거부 | 01: `c0587089-1a29-484a-8c2f-f05d674d3d3e` | 19/19 모델 응답 | native text 추출, JSON 파싱 전 |
| Markdown 코드펜스 | 10: `830e83ba-164c-497e-ac2b-109d3fd1473c` | 1/19 원문 | 잠재 출력 형식→JSON 파싱 |
| 적절한 타 종목 보류와 빈 인용 계약 충돌 | 15: `236471bb-11f1-4ab5-b254-9fa7c2faa082` | 타 종목1/1, 전체1/19 | 잠재 스키마→인용 검증 |
| 날짜 메타데이터 과해석 | 13: `7176acec-5149-4558-a98b-668c61956ca7`; 18: `c0a962ef-df66-49fd-ba4b-83e06fffc81f` | 날짜 사례2/6, 전체2/19 | 잠재 생성 의미 오류 |

19/19는 서로 다른 입력19개에서 반복된 같은 원인이지 독립 오류19종이나 동일 입력19회 안정성 시험이 아니다. 후속 v3에서는 제목용 대괄호(04), max_tokens(06/11), 인용 배열만 있고 본문 인용이 없음(07/08/09/16)이 관찰됐다. 이것을 과거 thinking 오류로 다시 분류하지 않았다. v4에서는 기술 생성 실패가0이어도 일반 filing 날짜 명명(03/14)과 과도한 보류(07)가 남았다.

## 3. 빈도·영향·수정 비용과 선택

| 후보 | 빈도 근거 | 사용자 영향 | 예상 수정 비용·선택 |
| --- | --- | --- | --- |
| native 추출 | 19/19 | 대부분의 유효 응답을 일반 오류로 바꿈 | 작음; **첫 단일 실험 v2로 선택** |
| 코드펜스 | 1/19 | 형식만 다른 응답이 소실 | 작음; v3의 별도 계약 실험 |
| 빈 인용 보류 | 1/19 | 적절한 불확실성 답변이 오류로 표시 | 중간; 안전한 보류 계약 필요 |
| 날짜·부분근거 의미 | 2/19 및 후속 개발 회귀 | 잘못된 사건일 또는 불필요한 정보 손실 | 중간; 의미 평가·새 hold-out 필요 |

영향과 비용은 정성 판단이며 측정하지 않은 작업시간이나 가중 점수를 만들지 않았다. v2는 알려진 reasoning 메타데이터를 건너뛰고 text만 순서대로 읽는 변경 하나로 한정했다. 이후 v3·v4·v5는 새로운 실험으로 구분했으며 누적 변경 전체를 단일 수정의 효과라고 설명하지 않는다.

## 4. 데이터 분리·통과 조건·사전 출시 게이트

개발20은 정상10/문제10, 기존 hold-out10은 정상5/문제5였다. 같은 분석자가 작성한 기존 hold-out은 완전 독립 맹검이 아니다. v2 실패 후 새 독립 hold-out10을 별도 평가자가 봉인했고 개발 gate가 실패한 v3/v4에서는 실행하지 않았다. 코더는 새 입력·rubric을 보지 않았으며 이전 hold-out을 다음 수정의 튜닝 자료로 사용하지 않았다.

사전 조건은 동일한 frozen request/evidence/asOf, 서로 다른 VERSION와 전체 소스 hash, 새 UUID, 선택 오류 엄격 감소, 정상 사례 회귀0, 중대 오류0, 운영 가용성 회귀 없음, hold-out 수동 품질 **9/10 이상**이었다. 적절한 보류는 질문과 근거를 검토해 판정하며 `insufficient_evidence` 라벨만으로 통과시키지 않는다. auth/billing/quota 등 운영 실패는 별도 분류하고 즉시 중단한다. 누적 추정 USD1 상한과 배치별 호출 상한은 완료량과 구별한다.

최초 계획의 3회 반복·50% 감소·비용/지연20% 증가 이내를 이번 변경된 설계로 검증했다고 주장하지 않는다. v4 파일럿의 선택된 실패3개는 전체 품질 대표 표본이 아니다. [v2 사전 기준과 결과](docs/quest/live-baseline-analysis.md), [v3 조건부 중단](docs/quest/v3-live-evaluation.md), [v4 독립 평가](docs/quest/v4-live-evaluation.md)를 함께 읽어야 한다.

## 5. 바꾼 것·실패 실험·전후 결과·PR

| 버전/실험 | 실제 변경 | 품질 결과와 판정 |
| --- | --- | --- |
| v1→v2 | 알려진 thinking/redacted_thinking 추출만 수정; 기존 JSON/인용 검사 유지 | 개발 품질1/20→17/20, 기존 hold-out0/10→8/10; **FAIL** |
| v2→v3 | 전체 JSON fence 처리, canonical 보류, 명시 타 종목 처리, 날짜 규칙 | 개발17/20→12/20; 정상 가용성04/06/07/08 회귀; **FAIL**, 새 hold-out0 |
| v3→v4 | 짧은 출력 계약+Haiku thinking disabled+effort low+고정 JSON schema | 전체 개발17/20; 기술 생성 실패0이나 정상03/07 회귀, 07만으로도 **FAIL**; 새 hold-out0 |
| v4→v5 | filing만으로 SEC/접수일 단정 금지, 관련 부분근거는 인용해 답하고 미확인 부분 분리 | 개발20/20·정상회귀0 통과; 독립 hold-out v2 7/10→v5 9/10이나 정상회귀1로 **FAIL** |
| v5→v6 | 프롬프트/모델설정 그대로, 관련 미래 timestamp에 별도 서버 날짜 안내 | 개발20/20, 완전히 새 독립 hold-out v2 8/10→v6 10/10·중대0·정상회귀0, **PASS** |

v4의 여러 변수를 함께 변경했으므로 효과를 단일 프롬프트 문구 또는 thinking 설정 하나에 귀속하지 않는다. v2 hold-out은 서비스 status ok9/10이지만 의미 품질8/10이었다. v3는 ok6/보류6/unavailable8로 단순 상태 합산과 품질12/20이 다르다. v4는 ok13/보류6/정상 빈근거1이나 품질17/20이다. 실패 실험도 보존하고 기준을 낮춰 성공으로 바꾸지 않았다.

| 동결 버전 | 실행 artifact SHA-256 |
| --- | --- |
| briefing-v1 | `45eb6a4395594565486f95e841fb6082c3dd7414585b07da9abc7ae362087ba1` |
| briefing-v2-anthropic-text | `61f76983786f448e6cb55c7301d43dc9078632a12d64089e32d60714cdfe547d` |
| briefing-v3-evidence-contract | `668b2ea4c7008c2b74ef8d5e7d0b5151679c23faaddb34156e6546d04381fc4c` |
| briefing-v4-compact-output | `391f992def97b440b1b4514529d3b23f767e8636ccc6fb97b376d3aa768cd054` |
| briefing-v5-partial-evidence | `b11adf3a17fb1b52b7d8a2e3ada353da68f9a01e0a76919169b76dba0a4dd03a` |
| briefing-v6-temporal-notice | `3ace4794db84368aa2350ada962e5d6bad4c4dcd85f21a7bdc8c9a8040742753` |

[v1/v2 manifest](docs/quest/evidence/q610-source-manifests.json), [v3 source hash 정의](docs/quest/v3-contract-source-hashes.json), [v4 실험](docs/quest/v4-output-experiment.md), [v5 실험](docs/quest/v5-partial-evidence-experiment.md). v3 승인 aggregate와 실행 artifact는 파일 목록·알고리즘 범위가 달라 값이 다르다. v1/v2는 service.ts만 같고 imported adapter가 달라 전체 artifact로 구별한다. **PR URL·최종 commit·리뷰 승인은 아직 미제공**이며 로컬 소스·해시를 PR로 대체했다고 하지 않는다.

## 6. 배포 뒤 버전별 새 대화·지연·비용·화면 증빙

v6 Cloud Build `405955c5-572a-415c-b5c9-981da6c5d247` SUCCESS 후 revision **modu-rich-quest06-v6-20261109**가 Ready=True·100% traffic으로 확인됐다. image digest는 `sha256:ed253c7921dcad7b2c8f3845a65c4dd33cb64504669a2f2b07da35a3bd2993cf`이며 실제 archive의14개 inference 파일과 동결 manifest가 일치한다. [최종 검증](docs/quest/final-validation.md)은12개 검사 스크립트·25개 테스트·typecheck 통과, 새 production/tooling lint 오류0을 보고한다. 전체 lint는 확인된 기존 production 오류5개가 남아 완전 통과라고 쓰지 않는다.

후보의 같은 질문3개를 새 시각/UUID로 실행해 **200/ok3건, Cloud Logging exact join3/3**을 확인했다. baseline unavailable3/3→candidate0/3이다. AAPL은 근거11→12 및hash변경, MSFT/NVDA는12→12/hash동일이므로 전체를 통제된 동일근거 인과 비교로 표현하지 않는다. 후보 서버5137/3554/3464ms, 브라우저5570.7/3984.2/4197.9ms, input9113/output1319·추정USD0.0015708이다([원격 전후/피드백 증빙](docs/quest/deployed-live-verification.md)).

![배포 v6 실제 정상 응답](docs/quest/evidence/screenshots/candidate-live-ok.png)

피드백 API 기능 시험은 AI 운영자 up1건으로 HTTP202 뒤 동일 trace의 Cloud Logging score1 read-back까지 확인했다. 실제 사용자 만족도 투표가 아니다. **실제 사용자 정성 의견은1건**으로 긴 출처ID 대신 짧은 [근거] 버튼을 요청했고 numeric vote는 없다. 메시지 알림은 설문 응답으로 세지 않았다. UI 변경·별도 배포/캡처는 완료했고 독립 Claude Fable 검토와 PR URL은 후속이다.

[실제 배포 검증](docs/quest/deployment-verification.md): baseline `briefing-v1`, revision `modu-rich-quest06-00003-sfx`, 수정 build `70159e67-6fe8-4bcc-9908-5bb7bd2589cc`가 확인됐다. [앱](https://modu-rich-quest06-fyzai5fn7a-du.a.run.app) 및 /login은200, 비로그인 보호 경로는 로그인 redirect, 정확한 Origin의 무세션 API는401, 다른 Origin은403이었다. 이는 원래 baseline 복구이며 후보 배포 완료가 아니다.

초기 동적500은 UTF-8 BOM 때문에 Next 공개 build 값이 누락된 운영 문제였다. 원래 archive를 재사용해 복구하여 모델 변경과 섞지 않았다. auth callback의 내부 origin redirect는 로컬43검사 후 계측 baseline의 실제 canonical redirect 검증으로 해결됐다. 계측 baseline과 v6 build·배포 완료는 위 실제 revision/image와 배포 보고로 확인한다.

코디네이터의 인증된 UI 확인 이후 계측 baseline revision `modu-rich-quest06-00004-72l`에서 AAPL/MSFT/NVDA 새 대화3건을 실행했다. 모두 API200/unavailable, 근거11/12/12건이며 실제 response trace와 Cloud Logging이 **3/3 exact join**됐다. [원격 실측 문서](docs/quest/deployed-live-verification.md), [공개 CSV](docs/quest/evidence/deployed-baseline.csv), [단계 JSON](docs/quest/evidence/deployed-baseline.json)에 질문 작성 provenance·버전·revision·usage·시간을 보존했다. 질문은 코디네이터 작성 합성 평가이고 근거는 실제 조회한 제공자 메타데이터로, 독립 사실검증된 시장 정보가 아니다.

![배포 baseline 실제 unavailable 화면](docs/quest/evidence/screenshots/baseline-live-unavailable.png)

![인증된 baseline 입력 폼](docs/quest/evidence/screenshots/baseline-authenticated-form.png)

baseline 원격 browser 경과는10501.8/6589.3/5602ms, server 경과9640/5908/5297ms였다. retrieval/assembly는ok, generation은error이며 코드가 GENERATION_UNAVAILABLE인 것까지만 확인됐다. native stop_reason 미수집으로 thinking 추출이나 truncation이 같은 원인이라고 단정하지 않는다. output1000×3만 관찰됐고 비용은 input5803/output3000에 따른 별도 추정 USD0.0020803이다. 브라우저/서버 절대시각에 약1초 역전이 있어 네트워크 시간으로 해석하지 않았다. 후보 새 대화·대응 로그·화면은 위 최신 절에 별도로 기록했다.

| 로컬 모델 호출 지연 | 중앙값 | 범위/추가 정보 |
| --- | ---: | --- |
| v1 개발 |2514ms|1306–4096ms|
| v2 개발 |2754ms|1556–4684ms|
| v3 개발 |3367ms|p95 4981ms|
| v4 전체 개발 |1292ms|p95 2127ms|

표는 모델을 호출한 로컬 서비스 wall-clock이며 원격 사용자 체감 지연이 아니다. 상태·보류 비율과 출력설정이 달라 순수 속도 개선 인과를 단정하지 않는다. 비용은 usage의 input/output에 검증된 단가를 적용했고 thinking은 output의 하위 항목이므로 중복 가산하지 않았다. 계정 billed cost는 미조회다. Langfuse는 **미사용**이다. Cloud Logging은 baseline3/3·candidate3/3 및 운영자 피드백1건의 저장 후 조회가 확인됐다.


### 최종 UI 배포와 별도 smoke

최종 revision `modu-rich-quest06-v6-ui-20261109`의 배포 및 390px 브라우저 검증을 완료했다([실측 JSON](docs/quest/evidence/deployed-ui-smoke.json), [UI 배포 기록](docs/quest/citation-ui.md)). 별도 실제 모델 호출1건: trace `319918ec-0917-42e2-9987-5eb336148d56`, input2979/output446, server3961ms, 추정 USD0.0005209다. 기존 전후 원격6건의 분모와 수치는 그대로 유지한다. 로컬 평가와 원격6건 및 이1건의 알려진 합은 USD0.0498650이며 초기 smoke·청구 전체는 제외한다.

근거 버튼5개·긴 ID 숨김·출처 연결 일치·가로 넘침 없음·Escape 닫기·호출 버튼으로 focus 복귀를 확인했다. 모달 초기 focus는 닫기 버튼이 아니라 **모달 안 원문 링크**였다. 렌더된 버튼의 DOM click으로 확인했으며 물리적 터치나 전 브라우저 호환성을 검증했다고 주장하지 않는다. 제공자 자료를 독립 검증된 시장 사실로 보증하지 않는다.

![최종 모바일 근거 버튼](docs/quest/evidence/screenshots/citation-compact-mobile.png)

![최종 모바일 출처 모달](docs/quest/evidence/screenshots/citation-source-dialog-mobile.png)

## 7. 관찰한 회고와 다음 실사용자 로그·피드백 계획

이번 구현에서 어려웠던 문제는 모델의 지식보다 출력 계약과 실행 계층의 경계였다. HTTP200 뒤에도 native 블록 추출·JSON·인용·의미 각각에서 실패했다. 추출을 고치자 날짜 의미 오류가 실제 답변으로 드러났고, 계약을 길게 보강한 v3에서는 출력 예산 공유와 대괄호 규칙 때문에 정상 사례가 회귀했다. v4에서 기술 생성 실패를 없애도 과도한 보류와 provenance 추론이 남았다. 따라서 각 단계의 최초 실패와 최종 유용성을 따로 기록하는 것이 필요했다.

배포에서는 빌드 시 고정되는 공개 설정과 runtime 설정을 구별해야 했다. BOM 파싱과 callback의 신뢰 origin 문제는 모델 품질과 분리해 원래 archive로 재현했다. 모델 소스와 관측 도구를 동시에 바꾸면 전후 비교의 정체성이 흐려지므로 동결 artifact·실제 버전·새 trace를 연결했다. 이는 관찰한 기술적 회고이며 사용자의 개인적 느낌이나 직접 수행한 경험을 대신 창작한 것이 아니다.

독립 gate·배포·버전별 새 대화·실제 로그 대조는 완료했다. 실제 사용자 정성 의견1건을 반영한 출처 버튼 UI의 별도 배포·시각 검증도 완료했고 PR/독립 검토 마무리가 남았다. 만족/보통/불만족 numeric 설문 응답은 아직 없으며 운영자 up 테스트를 사용자 만족으로 합산하지 않는다. 앞으로 동의한 실제 질문과 평가를 최소 범위로 수집하고 보존기간/삭제·접근권한을 정하며, 합성 입력·AI 분석자 판정·사용자 의견을 분리한다. 남은 항목은 [제출 공백 감사](docs/quest/submission-gap-audit.md)에 명시한다.
