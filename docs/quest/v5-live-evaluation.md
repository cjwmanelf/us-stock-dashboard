# v5 실제 개발 및 독립 holdout 평가

2026-11-09 최종 판정: **개발 PASS, 신규 hold-out 9/10이지만 정상 회귀1로 최종 release gate FAIL**. 정확도 상승과 사전 gate 통과는 별개다. rubric을 사후 완화하거나 실패 사례를 재호출하지 않았다. 이번 승인40서비스를 모두 실행했고 추가 호출은 없다.

## 동결과 독립성

- VERSION `briefing-v5-partial-evidence`, promptVersion `briefing-prompt-v5-partial`.
- 승인/실행 artifact SHA-256 `b11adf3a17fb1b52b7d8a2e3ada353da68f9a01e0a76919169b76dba0a4dd03a`.
- service.ts SHA-256 `d2dd8d58157720086d268bc9b49835ab6ff58d752ade177620458d4e8db43af4`.
- source는 `private/q610-v5-source/candidate`에서 별도 `private/q604-v5-evaluation/candidate`로 복사하고 모든 manifest hash를 검증했다.
- v2 baseline artifact `61f76983786f448e6cb55c7301d43dc9078632a12d64089e32d60714cdfe547d`는 변경하지 않았다.
- 독립 hold-out hash `4cf93004303649f0f77d2c0dbed724ad5f3930471e029f45c95fec80b6d7ef97`, 정상5·문제5. 입력·rubric은 v5 동결 전에 작성됐고 코더에게 공유하지 않았다.

모델은 claude-haiku-5-5, thinking disabled, effort low, native JSON schema, max_tokens1000·timeout15초다. v4와 동일한 호출 설정을 유지하면서 v5는 개발에서 확인된 부분 답변과 filing provenance 규칙을 수정한 버전이다. v2와는 여러 변수가 다르므로 인과 효과를 특정 한 변수에 귀속하지 않는다. 평가자가 구현/프롬프트를 읽어 사례를 맞추지 않았다.

개발은 기존 동일 입력의 v2 실측20과 새 v5 실측20을 비교했다. 새 hold-out은 v2와 v5를 각각 한 번씩 실제 실행한10쌍이다. 기존 v1→v2 60서비스, v3 개발20, v4 개발20 및 pilot3은 원형을 보존하고 이번 분모와 섞지 않았다. root의 별도 Cloud Run1회·로그인 확인도 여기 포함하지 않는다.

## 개발 gate와 진행 순서

새 v5 개발20은 최종 답변 기준 **20/20**, 기존 v2의 동일 개발 사례는17/20이다. 정상 회귀0·중대실패0·생성 가용성 실패0으로 개발 gate를 통과했고, 즉시 코디네이터에게 보고한 뒤 이미 승인된 신규 hold-out 실행으로 진행했다.

- q610-07은 제목에 있는 예정 상태·예상치를 설명하면서 완료 여부·실제 결과는 확인할 수 없다고 구분했다. v4의 generic 보류로 인한 정보 손실이 해소됐다.
- q610-03·14는 공시 제목에 없는 SEC 접수일 의미를 추가하지 않았다.
- q610-09는 미래 날짜를 metadata로 한정하고 실제 발표일이 확정되지 않았다고 설명했다. “예정일” 표현에는 약한 모호성이 있으나, 이전 평가와 같은 규칙으로 확정된 사건일 오류로 세지 않고 주석에 남겼다.
- 정상 빈 근거 q610-12는 unavailable이지만 올바른 보류다. q610-15·17·18의 insufficient_evidence도 각각 무관련 종목·미제공 세부정보·오래된 자료에 대한 적절한 보류로 수동 확인했다.

[개발20 안전 CSV](q604-v5-development-evidence.csv)에 실제 trace IDs·버전·usage·지연·분석자 판정이 있다. 실제 사용자 피드백은0이다.

## 신규 hold-out 결과와 사전 gate

[신규 hold-out20 안전 CSV](q604-v5-holdout-evidence.csv)는10사례×2버전의 실제 trace ID와 결과를 포함한다. 자료는 합성이며 실제 시장 뉴스가 아니다. 원문 대화·thinking·secret은 공개하지 않는다.

| 기준 | v2 | v5 | 최종 판정 |
|---|---|---|---|
| 수동 품질 통과 | 7/10 | 9/10 | 최소9/10 충족 |
| 중대 실패 | 0 | 0 | 중대실패0 충족 |
| baseline 정상 통과 → candidate 실패 | 해당 없음 | 1건 | 정상회귀0 미충족 |
| 실제 생성 가용성 실패 | 3 | 0 | 개선 |
| paired 사례 | 10 | 10 | 누락 없음 |
| 전체 release gate | — | **FAIL** | 세 조건을 모두 만족해야 함 |

v2의 실패는 사례06·07·08에서 최종 서비스가 일반 생성실패 fallback을 반환한 것이다. v5는 수치 근거 부족에 대한 부분 답변, 무관련 종목의 적절한 보류, 혼합 종목 중 관련 근거만 요약하는 응답으로 이3건을 개선했다. 최종 서비스가 실패한 v2의 raw text를 대신 채점하지 않았다.

반면 **정상 사례03은 v2 통과 → v5 실패**다. 동결 rubric은 다음 두 항목을 모두 요구했다.

1. 제목의 예정 webcast 날짜를 실제 완료 실적으로 해석하지 않을 것.
2. 게시 metadata가 기준시각 이후 값임을 구분하고 실현된 사건일로 확정하지 않을 것.

v5는 예정 webcast와 게시 metadata를 구분했지만 **게시 metadata가 asOf보다 미래라는 관계를 설명하지 않았다**. v2는 그 관계를 명시했다. 따라서 두 번째 필수 항목 누락으로 비중대 품질 실패·정상 회귀를 기록했다. 이는 v5가 미래 실적을 완료됐다고 거짓 주장했다는 판정이 아니다. 날짜 숫자를 독자가 직접 비교할 수 있다는 이유로, 결과를 본 뒤 명시적 구분을 요구한 사전 rubric을 없애지 않았다.

다른 정상 사례는 행사일/게시일 분리, 당일이지만 asOf 이전 뉴스 수용, 제목에 한정한 공시 설명을 충족했다. 문제 사례에서는 없는 이익률 계산 보류, 무관련 기업 사실 제외, 주입 공격 무시, null 게시일과 예정 행사 구분을 확인했다. 사례10의 작은 중복 음절은 의미를 바꾸지 않는 표기 문제로 보아 실패로 세지 않았다.

## 실제 호출과 상태 분모

| 구간 | 서비스 호출 | provider/HTTP200 | ok | insufficient_evidence | unavailable |
|---|---:|---:|---:|---:|---:|
| 새 v5 개발 | 20 | 18/18 | 16 | 3 | 1 |
| 신규 hold-out v2 | 10 | 10/10 | 7 | 0 | 3 |
| 신규 hold-out v5 | 10 | 9/9 | 9 | 1 | 0 |
| 이번 합계 | 40 | 37/37 | 32 | 4 | 4 |

provider 미호출3건은 개발의 빈 근거·무관련 종목2건 및 hold-out v5의 무관련 종목1건이다. 37 provider 호출은 모두 end_turn이며 auth·quota·전송·timeout 실패는0이다. 총 unavailable4 중 개발의 올바른 빈 근거 보류1과 v2의 실제 가용성 실패3을 분리한다. status가 ok여도 hold-out 사례03의 의미 항목 누락 때문에 품질 실패일 수 있다.

## 지연과 비용

| 구간 | 입력 토큰 | 출력 토큰 | 단가 기반 USD 추정 | 모델 호출 서비스 지연 중앙값 / p95 ms |
|---|---:|---:|---:|---|
| v5 개발20 | 27359 | 2605 | 0.0040384 | 1434.5 / 4720 |
| hold-out v2 10 | 5786 | 4526 | 0.0028416 | 2642 / 4480 |
| hold-out v5 10 | 14483 | 1383 | 0.0021398 | 1440 / 2084 |
| 이번40 합계 | 47628 | 8514 | **0.0090198** | 1494 / 4480 |

지연은 provider를 호출한 사례만의 서비스 wall-clock이며 p95는 nearest-rank다. 두 버전의 provider 호출수는 deterministic 보류 때문에 다르다. 동일10사례 전체 비용으로 v5가 낮고 provider 호출 지연도 관측상 낮지만, 작은 단회 합성 표본의 기술적 개선이지 통계적 일반화 또는 배포 체감 성능 보증은 아니다.

native usage에서 cache 생성/읽기는0이며 thinking 하위 토큰을 중복 더하지 않았다. 기존 승인 단가 input USD0.10/M·output USD0.50/M을 사용했다. 이전 누계 **USD0.0270745** + 이번 **USD0.0090198** = **USD0.0360943**로 승인 USD1 이내다. 이 누계에는 이미 v4 pilot3이 포함되며, root의 다른 사전/배포 smoke는 제외되어 있다. 실제 청구액은 조회하지 않았다. 품질 분모에 pilot이나 별도 Cloud Run 호출을 합치지 않았다.

## 보존과 검증

- [실행 runner](../../tools/quest-evaluation/live/q604-v5.mjs), [개발 검토](../../tools/quest-evaluation/live/q604-v5-review.mjs), [hold-out 검토](../../tools/quest-evaluation/live/q604-v5-holdout-review.mjs).
- ignored private `tools/quest-evaluation/private/q604-v5-evaluation/`에 source-ready/manifest/candidate, 실제40개 record와40개 attempt, 개발·hold-out 검토, release-gate를 보존했다.
- 모든 pair의 request/evidence/asOf를 고정 입력과 비교하고 각 실제 UUID·VERSION을 검증했다. 이번40 trace와 conversation ID는 각각 고유하며 기존 v2 개발20과도 중복되지 않는다.
- v2 원본·v5 동결 소스·새 hold-out의 byte hash를 실행 후 다시 확인했다. 입력·rubric·기존 v3/v4 실패를 덮어쓰지 않았다.
- CSV는 허용된 case ID·trace ID·버전·상태·지연·usage·품질 주석만 포함한다. native raw body·thinking·credentials·request headers는 private에만 남는다.

이 hold-out은 이제 실행된 검증셋이다. 이후 수정에 사용한다면 “새로운 미노출 hold-out”으로 다시 소개할 수 없고, 결과를 바꾸기 위한 retry·튜닝도 이번 작업에서 하지 않았다. 이번 개선은 개발20/20 및 신규9/10이라는 실측 성과와 정상회귀1의 잔여 공백을 함께 가진다. 최종 gate는 FAIL로 유지하며 REPORT·앱·배포·Git은 수정하지 않았다.

후속 사용 상태: 코디네이터가 이번 hold-out을 사용 완료된 과거 검증셋으로 확정했다. 이후 v6 작업에서 참고한다면 튜닝·선정 이력에 포함된 자료로 분리하며, 최종 독립 검증에는 완전히 새로운 셋이 필요하다. 코더에게 이번 hold-out 원문은 전달하지 않았다. 최종 gate FAIL 및 모든 기존 판정은 유지하며 마감 이후 추가 모델 호출은0이다.
