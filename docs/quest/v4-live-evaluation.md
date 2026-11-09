# v4 실제 개발 평가 결과

2026-11-09 결론: **기술적 가용성은 개선됐지만 개발 품질 gate는 FAIL**이다. 정상 사례의 과도한 보류와 날짜 metadata 해석 문제를 확인했다. 신규 독립 hold-out은 **0회 실행**, 9/10 기준은 **NOT_EVALUATED**다. 코디네이터도 중단 판정을 확인했으며 추가 호출·retry·앱 수정은 하지 않았다.

## 고정 조건과 실험 구분

이번 full development20은 pilot3과 별도로 새 UUID로 실행했다. pilot q610-04/06/07의 결과를 이번 분모에 합치거나 대신 쓰지 않았다. 비교 기준은 보존된 v2 개발20이며, 기존 v1→v2 60서비스 실험과 v3 개발20 실패 기록은 수정하지 않았다. 새 hold-out 입력/응답 또는 기존 hold-out을 읽어 튜닝하지 않았다.

| 항목 | 고정 값 |
|---|---|
| 실제 v4 VERSION | briefing-v4-compact-output |
| promptVersion | briefing-prompt-v4-compact |
| v4 artifact | 391f992def97b440b1b4514529d3b23f767e8636ccc6fb97b376d3aa768cd054 |
| v2 baseline artifact | 61f76983786f448e6cb55c7301d43dc9078632a12d64089e32d60714cdfe547d |
| source 출처 | private/q610-v4-pilot/candidate를 검증 후 private/q604-v4-evaluation/candidate로 복사; 현재 작업트리를 재복사하지 않음 |
| sealed corpus | 4cf93004303649f0f77d2c0dbed724ad5f3930471e029f45c95fec80b6d7ef97, 정상5·문제5, 미실행 |
| 모델·상한 | claude-haiku-5-5, max_tokens1000, timeout15초 |
| v4 변경 변수 | thinking disabled, effort low, native JSON schema, compact prompt |

실제 request body에서 모델·1000cap·thinking disabled·effort low·json_schema를 확인했다. 이는 여러 변수를 함께 바꾼 실험이므로 개선 원인을 특정 변수 하나에 귀속하지 않는다. 입력은 동일한 합성 근거·request·asOf이며 시장 사실이 아니다. 최종 결과는 실제 모델 출력이다. 평가자는 v4 구현이나 프롬프트 내용을 읽지 않고 동결 소스를 loader로 실행했다.

## 실제 호출과 상태

| 지표 | full v4 개발 결과 |
|---|---|
| 추가 서비스 호출 / 승인 최대 | 20 / 40 |
| provider 호출·HTTP200 | 18 / 18 |
| provider 미호출 | 빈 근거 q610-12, 무관련 종목 q610-15, 총2 |
| auth·quota·전송·timeout 실패 | 0 |
| native end_turn | 18/18 |
| max_tokens·thinking content block | 각0 |
| 최종 status | ok13, insufficient_evidence6, unavailable1 |
| 실제 생성 가용성 실패 | 0; unavailable1은 정상 빈 근거 보류 |
| 새 hold-out 호출·retry | 각0 |

`insufficient_evidence`는 오류나 정답으로 자동 분류하지 않았다. 6건 중 q610-13·15·17·18·20은 요청 내용이 근거에 없거나 무관련하여 적절한 보류로 판정했다. q610-07은 근거에 있는 예정 상태를 전달할 수 있는 정상 사례이므로 정보 손실을 별도 실패로 판정했다. q610-12의 빈 근거 보류 또한 운영 실패로 세지 않았다.

## 독립 수동 판정과 gate

[안전한 사례별 CSV](q604-v4-development-evidence.csv)에 full20의 실제 traceID, v2 traceID, 버전, 상태, 지연, usage와 분석자 판정이 있다. 실제 사용자 피드백은 **0**이며 이 평가는 분석자 검토다.

| 주요 사례 | 실제 최종 답변의 행동 | 판정 |
|---|---|---|
| q610-07 정상 질문 | 발표가 이미 있었는지 묻자 일반적인 “제공된 자료만으로 확인할 수 없음”으로 끝남; 제목의 “발표 예정”과 완료를 구분하는 내용·인용이 없음 | 과도한 보류. 실제 완료 여부를 단정할 필요는 없지만 제공된 예정 상태는 알려줄 수 있었음. v2가 설명하던 유용한 구분이 사라져 정상 품질 회귀 |
| q610-03 정상 공시 | generic filing의 publishedAt을 “접수일”로 표현 | 입력에는 접수일 의미가 명시되지 않아 비중대 출처/날짜 해석 오류로 보수적 실패 |
| q610-14 문제 질문 | 투자 판단 불가라는 올바른 한계를 설명하면서 공시 “접수일”도 추가 | 판단 보류는 적절하나 동일한 근거 초과 해석으로 보수적 실패 |
| q610-04 | 실제 실적과 예정 실적을 분리하고 날짜가 확정 실제 발표일은 아니라고 한정 | 통과; 예정일 표현의 약한 모호성은 주석으로 유지하고 중대 오류로 부풀리지 않음 |
| q610-09 | 기준시각과 일정/보고기간일 수 있는 metadata를 구분, 완료 사실로 단정하지 않음 | v2의 generic fallback에서 개선 |
| q610-13 | “내일 확정 실적”을 확인할 수 없다고 보류 | 적절한 보류. 질문은 확정 결과를 요구하므로 선택적인 예상 EPS를 생략한 것을 q610-07과 동일한 과도 보류로 보지 않음 |
| q610-15·18 | 무관련 종목·오래된 자료에 적절히 보류 | v2의 generic 실패 및 당일시각 해석 문제에서 개선 |

동일 입력을 비교한 수동 개발 판정은 **v2 17/20 → v4 17/20**이다. 사례3·7·14를 실패로 판정했고, 정상 회귀는3·7의 **2건**, 관찰된 중대 오류는0건이다. 새 개선3건(9·15·18)이 새 실패3건을 상쇄하더라도 사전 조건인 정상 회귀0은 충족하지 않는다.

날짜 의미의 보수적 판정인3·14를 모두 통과로 바꾸는 민감도 분석에서도 **19/20, 정상 회귀1건(q610-07)**이 남아 gate FAIL은 유지된다. 07은 거짓 사실 생성이 아니라 답변 유용성 손실이라는 점을 명시한다. 단순 기술 성공이나 19/20이라는 숫자만으로 정상 회귀0 조건을 완화하지 않았다.

`development-gate.json`은 `proceed:false`로 저장했다. 따라서 새 독립 hold-out 10개를 v2/v4에 실행할 조건이 충족되지 않았다. 9/10 gate는 미평가이지 통과·0/10 실패가 아니다. 새 hold-out 내용은 계속 코더에게 공개하지 않았다.

## 비용 지연과 개선의 범위

| 관측 지표 | v3 개발20 | v4 새 개발20 |
|---|---|---|
| provider 호출 | 18 | 18 |
| 생성 가용성 실패 | 7 | 0 |
| input tokens | 18557 | 23309 |
| output tokens | 10869 | 2157 |
| 단가 기반 비용 추정 USD | 0.0072902 | 0.0034094 |
| 모델 호출 서비스 지연 중앙값 ms | 3367 | 1292 |
| 모델 호출 서비스 지연 p95 ms | 4981 | 2127 |

v4 지연은 모델 호출18건에서 최소848ms·중앙값1292ms·p95 및 최대2127ms였다. p95는 nearest-rank이며 deterministic2건은 이 지연 분모에 넣지 않았다. 배포 HTTP 왕복시간이 아닌 서비스 wall-clock이다. 순차적인 단일 실행 관측값이며 통계적 유의성이나 단일 변수의 인과 효과를 입증하지 않는다. 동일 개발집합에서 가용성·출력량·지연의 개선이 있어도 정상 의미 회귀를 숨기지 않는다.

cache 생성/읽기0, 실제 native usage 전체를 집계했다. 기존 승인 단가 input USD0.10/M, output USD0.50/M을 적용한 이번 추정은 **USD0.0034094**다. 이전 평가 누계 **USD0.0230808** + 별도 pilot3 **USD0.0005843** + 이번 full20을 합한 추정은 **USD0.0270745**로 승인 USD1 이내다. 다른 사전 smoke는 이 누계에서 제외되어 있고 실제 billed cost는 조회하지 않았다. 출력 하위 reasoning 수량을 중복 더하지 않았다. pilot3은 비용에서 별도 더하지만 품질 분모는 합치지 않았다.

## 보존 자료와 검증

- 실행·검토: [q604-v4.mjs](../../tools/quest-evaluation/live/q604-v4.mjs), [q604-v4-review.mjs](../../tools/quest-evaluation/live/q604-v4-review.mjs).
- 비공개 결과: `tools/quest-evaluation/private/q604-v4-evaluation/`의 `manifest.json`, `candidate/`, 20개 `dev-v4-q610-*.json`과 20개 `.attempt`, `development-review.json`, `development-gate.json`.
- 공개 자료: 이 문서와 허용 열만 내보낸 안전 CSV. raw request/response·thinking·headers·credentials·원문 대화는 공개하지 않았다.

source byte hashes, 원본 v2·sealed corpus 불변, 20쌍의 입력 일치, 비교 trace/conversation40개 고유성, 20개 attempt 보존, 실제 provider 설정·end_turn·thinking block 부재를 검증했다. 이번 runner는 template의 executionStatus를 실제 completed로 기록하고 빈 근거 unavailable을 운영 실패와 구분한다. 이전 v3 원본이나 runner·보고서는 수정하지 않았다.

다음 버전에는 개발 사례에서 확인된 의미 규칙을 별도 수정·동결·평가할 수 있지만 이번 결과를 고치기 위한 retry는 하지 않았다. 신규 hold-out은 아직 미노출·미실행 상태로 보존한다. 보고서 작성은 완료했으나 제품 릴리스 품질 기준을 통과했다는 결론은 내리지 않는다.
