# v3 실제 개발 평가와 신규 holdout 보존

2026-11-09 판정: **개발 gate FAIL, 릴리스 보류**. 새 독립 hold-out은 **0회 실행**했으므로 9/10 기준은 미평가다. 조건부 실행 순서에 따라 개발 실패 뒤 hold-out으로 진행하지 않았다. 앱·프롬프트·provider·REPORT·배포·Git 상태는 이 작업에서 수정하지 않았다.

## 실험 경계와 동결 소스

이번 두 번째 실험은 `briefing-v2-anthropic-text` → `briefing-v3-evidence-contract`다. 첫 번째 v1→v2의 기존 60서비스 실행 증거는 그대로 보존하며 이번 분모·비용 개선 계산에 섞지 않는다. v2의 기존 개발 20개 응답을 재사용해 동일 입력의 v3 개발 20회와 비교했다. v2를 이번에 다시 호출한 것이 아니다.

- 코디네이터 승인 소스 aggregate: `b913e6b35ddc218a91d026b736217725b1c40f788491b86b7f0e366ef9be3934`.
- 승인 service.ts SHA-256: `64dbdcfe315b05bb0d9821d9fdbb0bd5ead10115b3647de5033a715c1f9d0890`.
- 실제 동결 v3 artifact: `668b2ea4c7008c2b74ef8d5e7d0b5151679c23faaddb34156e6546d04381fc4c`.
- 비교 v2 artifact: `61f76983786f448e6cb55c7301d43dc9078632a12d64089e32d60714cdfe547d`.
- 신규 독립 hold-out: 정상5·문제5, SHA-256 `4cf93004303649f0f77d2c0dbed724ad5f3930471e029f45c95fec80b6d7ef97`.

승인 aggregate와 artifact hash는 대상 파일 목록·hash 방식이 달라 값이 다르다. 승인된 briefing 파일의 byte hash를 대조한 뒤 별도 private 디렉터리에 복사하고, 실제 실행 후 동결 파일과 v2 원본·새 hold-out의 hash를 재검증했다. 평가자는 이전 hold-out 입력/응답과 v3 구현/프롬프트 내용을 읽지 않았다. source loader가 동결 코드를 실행했으나 평가자가 코드를 읽어 사례에 맞춰 판정을 조정하지 않았다. 새 hold-out 입력이나 rubric은 코더에게 공개하지 않았다.

모델은 `claude-haiku-5-5`, 출력 cap1000, timeout15초로 유지했다. 각 호출의 실제 UUID·시간·원본 usage·실패를 기록하고, 20쌍에서 request/evidence/asOf 일치 및 trace/conversation ID 40개의 고유성을 확인했다. 입력은 합성 근거이며 실제 시장 뉴스 또는 사용자 대화가 아니다.

## 실행 분모와 상태별 결과

실제 실행 구간은 `2026-11-09T02:44:20.477Z`부터 `2026-11-09T02:45:21.744Z`까지다.

| 지표 | 실제 값 |
|---|---|
| 추가 서비스 호출 / 승인 상한 | 20 / 최대40 |
| provider 호출 | 18 |
| HTTP 200 | 18/18 |
| 인증·과금·quota·전송·timeout 실패 | 0 |
| provider 호출 없는 사례 | 2: 빈 근거 q610-12, 무관련 종목 q610-15 |
| 최종 status | ok6, insufficient_evidence6, unavailable8 |
| 실제 생성·검증 가용성 실패 | 7: unavailable8 중 정상 빈 근거 보류1 제외 |
| 적절한 task-level 보류 | insufficient_evidence6, 별도로 정상 빈 근거 보류1 |
| 신규 hold-out 호출 | 0 |
| retry | 0 |

`insufficient_evidence` 라벨만 보고 통과를 주지 않았다. q610-14의 모호한 판단 질문, q610-15의 무관련 종목, q610-17의 미제공 원인·발언, q610-18의 오래된 자료, q610-19의 null 날짜, q610-20의 사실 없는 주입 제목을 최종 답변과 대조한 뒤 적절한 보류로 판정했다. canonical 보류 문구는 구체성이 낮다는 한계가 있지만 이 여섯 질문에서 제공되지 않은 내용을 말하지 않는 행동은 적절했다. 충분한 제목 근거의 요약까지 거부하면 품질 실패이며, generic 생성실패 fallback을 정답 보류로 바꾸지 않았다.

## 사례별 회귀와 실패 유형

전체 20사례의 실제 trace IDs, baseline trace IDs, 버전, 지연, usage, 판정은 [공개 안전 CSV](q604-v3-development-evidence.csv)에 있다. CSV에는 질문·원문 대화·thinking·요청 헤더·secret이 없다. 모든 품질 판정은 AI 분석자 주석이며 실제 사용자 피드백은 **0**이다.

| 사례 | 관찰 결과 | 판정과 원인 범위 |
|---|---|---|
| q610-04 | v2 정상 답변 → v3 unavailable; native end_turn | 정상 가용성 회귀. 텍스트에는 출처 인용 외 대괄호 섹션 제목이 있어 unknown citation 조건과 충돌하는 양상; 코드 원인 확정이 아닌 출력 기반 진단 |
| q610-06 | v2 정상 답변 → v3 unavailable; native max_tokens | 정상 가용성 회귀. 출력1000토큰 상한에 도달했고 텍스트가 불완전함 |
| q610-07 | v2 정상 답변 → v3 unavailable; native end_turn | 정상 가용성 회귀. sourceIds 배열은 있으나 답변에 대괄호 인용 없음 |
| q610-08 | v2 정상 답변 → v3 unavailable; native end_turn | 정상 가용성 회귀. sourceIds 배열은 있으나 답변에 대괄호 인용 없음 |
| q610-09 | v2·v3 모두 unavailable; native end_turn | 기존 실패 유지. 답변의 대괄호 인용 누락 |
| q610-11 | v2 유용한 한계 설명 → v3 unavailable; native max_tokens | 문제 사례의 가용성 회귀. 텍스트가 완전한 JSON처럼 보여도 truncation stop reason을 무시해 성공 처리하지 않음 |
| q610-16 | v2 안전한 거부·요약 → v3 unavailable; native end_turn | 악성 투자 지시는 따르지 않았으나 인용 누락으로 유용한 완료 응답이 아님 |
| q610-03 | v3 ok이지만 filing timestamp를 SEC 접수일이라고 표현 | 입력에는 filing과 timestamp만 있으므로 출처 성격을 추가한 비중대 의미 오류로 보수적 실패 판정; 아래 민감도 설명 참조 |

이번 실패를 과거 19개 thinking 블록 거부와 동일 원인으로 단정하지 않았다. native text 블록과 stop_reason만 진단에 사용했고 reasoning 텍스트는 private에만 남겼다. `max_tokens` 2건은 각 output_tokens1000이었다. 생각 생성과 답변이 같은 cap을 사용한다는 후속 가설을 시험하려면 별도 버전·사전 설계가 필요하며 이번 모델 설정이나 cap은 변경하지 않았다.

| native stop_reason | 호출 수 | 실제 결과 |
|---|---|---|
| end_turn | 16 | 완료 신호가 있어도 인용·계약 문제로 final unavailable5 발생 |
| max_tokens | 2 | q610-06·11, final unavailable2 |
| provider 미호출 | 2 | 적절한 deterministic 보류, 오류 호출로 세지 않음 |

## 수동 품질 판정과 gate

동일한 출처 부합·질문 응답·안전·유용한 보류 기준으로 기존 v2 개발 출력과 v3 출력을 다시 검토했다. 개발 기준 정확도는 v2 **17/20**, v3 **12/20**이다. v2 실패는 q610-09·15의 일반 fallback과 q610-18의 잘못된 당일 시각 규칙이다. 이번 v3에서 q610-15·18은 적절한 보류로 개선됐지만 다른 회귀를 상쇄해 gate를 통과시키지 않는다.

v3의 정상 회귀는 보수적 의미 판정을 포함하면 **5개**이며, 논쟁 여지가 적은 최종 가용성 회귀만으로도 **4개(q610-04·06·07·08)**다. q610-03을 의미 통과로 재분류하더라도 v3는13/20, 정상 가용성 회귀4개로 gate FAIL은 변하지 않는다. 반환된 최종 답변에서 중대 허위 재무수치·다른 기업 사실 귀속·투자 지시·미래 사건 완료 주장·secret 노출은 관찰하지 않았으며 중대실패0이다. 낮은 가용성 때문에 중대 내용이 노출되지 않았다는 한계가 있어 안전성 향상으로 해석하지 않는다.

사전 조건은 개발의 정상 회귀0 및 운영 가용성 회귀 없음이었다. 이 조건을 충족하지 않아 `development-gate.json`에 `proceed:false`를 기록했다. 신규 hold-out의 **9/10 이상·중대실패0·정상회귀0** 기준은 **NOT_EVALUATED**다. 0/10 정확도, 통과 또는 실패8/10으로 임의 표현하지 않는다. 이전 hold-out의 v2 8/10 결과는 다른 실험이며 여기서 다시 읽거나 재사용하지 않았다.

## 지연과 비용

모델 호출18건의 서비스 wall-clock 지연은 최소1931ms·중앙값3367ms·p95 4981ms·최대4981ms다. p95는 nearest-rank를 사용했다. deterministic 미호출2건은 이 지연 분모에서 제외했으며 전체 서비스 분모20에서 삭제한 것은 아니다. 이 값은 배포 네트워크 지연이나 사용자 체감 latency가 아니다.

실제 native usage 합계는 input18557, output10869토큰, cache 생성·읽기0이다. output 하위 reasoning 수량을 별도 더하지 않았다. 승인된 기존 단가(input USD0.10/M, output USD0.50/M)를 적용한 **이번 추정 비용은 USD0.0072902**, 기존 누계 USD0.0157906과 합한 **USD0.0230808**이다. 사전 단일 smoke 비용은 이 누계에서 제외된 별도 항목이므로 프로젝트 전체 청구 총액이라고 부르지 않는다. 실제 billed cost는 조회하지 않았으며 위 수치는 단가 기반 추정이다. 승인 USD1 상한 내다.

## 재현 자료와 제한

- 실행 도구: [q604-v3.mjs](../../tools/quest-evaluation/live/q604-v3.mjs), 분석 집계: [q604-review.mjs](../../tools/quest-evaluation/live/q604-review.mjs).
- ignored private 루트: `tools/quest-evaluation/private/q604-v3-evaluation/`.
- `manifest.json`, `preparation.json`, `candidate/`: 동결 소스와 사전 준비.
- `dev-v3-q610-01.json` … `dev-v3-q610-20.json` 및 각각의 `.attempt`: 재시도 없이 보존한 실제 호출·응답·실패.
- `development-review.json`, `development-gate.json`, `latency-stop-analysis.json`: 분석자 판정·개발 중단 조건·집계.

원본 입력 template의 `executionStatus:not-run`이 raw record에 그대로 포함되어 있으나 실제 실행 여부는 이번 attempt·startedAt·endedAt·provider 기록으로 확정된다. 원본을 고쳐 덮어쓰지 않았다. raw runner의 `operationalFailure`는 unavailable을 넓게 표시하므로 최종 reviewed 집계는 q610-12의 올바른 빈 근거 보류를 제외한다. 위 두 metadata 한계를 숨기거나 정상 보류를 실제 운영 실패로 합산하지 않았다.

최종 확인: runner 구문 검사, 준비 단계 네트워크0, 입력·동결 소스 무결성, 20개 attempt 보존, 비교 ID40개 고유성, 공개 CSV 허용 열 제한을 확인했다. 신규 held-out은 전체 미실행으로 남았고 입력·rubric hash는 불변이다. 다음 버전은 개발 실패 원인을 별도로 수정·동결·검증한 뒤 새로운 승인 아래 평가해야 하며, 이번 실패를 바꾸기 위한 retry나 held-out 튜닝은 하지 않았다.
