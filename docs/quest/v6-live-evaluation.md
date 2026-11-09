# v6 실제 개발 및 새 독립 holdout 평가

2026-11-09 최종 판정: **개발20/20 PASS, Q606 신규 독립 hold-out10/10 PASS**. 신규 hold-out의 baseline v2는8/10, v6는10/10이며 중대실패0·정상회귀0이다. 입력과 rubric을 수정하거나 실패를 재시도하지 않았다. 이는 고정 합성 표본의 사전 gate 통과이며 실제 시장정보 정확성·배포 성공·보편적 안전성의 보증은 아니다.

## 소스와 실험 경계

- 실행 VERSION: `briefing-v6-temporal-notice`; prompt는 v5 유지, provider 설정은 thinking disabled·effort low·native JSON schema·max_tokens1000·timeout15초 유지.
- v6 artifact SHA-256: `3ace4794db84368aa2350ada962e5d6bad4c4dcd85f21a7bdc8c9a8040742753`.
- service.ts SHA-256: `2215a3872265b4770aa4f3a3812d687643b30b0edaae674d07487af19506a970`.
- 승인 source `private/q610-v6-source/candidate`를 검증 후 별도 `private/q604-v6-evaluation/candidate`로 동결했다.
- baseline v2 artifact: `61f76983786f448e6cb55c7301d43dc9078632a12d64089e32d60714cdfe547d`.

개발은 기존 v2·v5와 동일한20개 입력의 새로운 v6 출력이고, hold-out은 v2/v6를 새로 각10회 실행했다. 기존 v1→v2 60서비스, v3·v4·v5 실행과 pilot, root의 Cloud Run 호출은 이번 품질 분모에 포함하지 않는다. v6의 서버가 덧붙인 날짜 안내도 최종 사용자 답변의 일부로 채점했다. 모델 텍스트만 대신 채점하지 않았다.

## 새 hold-out과 라벨 차폐 검토

Q606은 이번 작성 과정에서 이전 hold-out과 현재 v5/v6 구현·프롬프트를 열지 않고 새 정상5·문제5를 작성했다. Q606에게 과거 replay 도구 엔지니어링 문맥이 있었으므로 프로젝트 전반을 전혀 모르는 외부 심사자는 아니다. 그래도 이전에 사용한 q604 hold-out을 복사하거나 재활용한 셋이 아니다.

- 원본 경로: `tools/quest-evaluation/private/q606-holdout-v6/`.
- manifest 파일 SHA-256: `2bb1eb087e07454f83b0321d2b7713a7b74c68b0744406bdbea7de9302935787`.
- 파생 corpus hash: `717620aa99f386cc7d90e0a32d607f06e62ad82615157605d9fae39af2161368` (파일명을 정렬한 `이름 공백 파일hash`를 LF로 연결한 SHA-256).
- 원본 cases/rubrics/protocol/manifest는 변경하지 않았다. cases의 classification 필드를 그대로 사용했으며 질문·근거·asOf 값의 변환은 없었다.

개발 통과 후 root의 새 hold-out source-ready를 받고만 실행했다. 20개 최종 답변을 무작위 순서·새 blind ID로 내보내고 version·trace·status·usage·지연을 숨겼다. **모든20개 판정을 저장한 뒤** mapping을 열어 버전별 점수를 산출했다. 판정 파일 SHA-256은 `083efeaa8e83bc8098f76d524a75f5266b95dec7cebf6a63af4f43659cd849c4`다. 문체나 서버 안내로 버전을 추측할 가능성까지 제거한 이중맹검은 아니다.

## 개발 gate

개발20은 수동20/20, 정상회귀0·중대실패0·실제 생성 가용성 실패0으로 통과했다. 기존 v2 개발17/20과 v5 개발20/20을 비교했고, 각 사례의 request/evidence/asOf가 동일함을 확인했다.

- 예정 사건은 제목에 있는 내용을 소개하면서 완료 여부와 실제 결과를 구분했다.
- 미래 publishedAt에는 최종 서버 날짜 안내가 추가되어 asOf 이후의 metadata를 사건 완료 근거로 오인하지 않도록 했다.
- 공시 제목으로 SEC 접수일을 추가 추정하지 않았다.
- 빈 근거1건과 무관련 종목·미제공 세부·오래된 자료의 적절한 보류3건은 오류로 세지 않았다.

[개발 안전 CSV](q604-v6-development-evidence.csv)에 실제 ID·버전·usage·지연·수동 판정이 있다. 개발 gate를 root에 즉시 보고했고, 그 전에 새 hold-out 호출은0이었다.

## 새 독립 hold-out 결과

| 사전 조건 | 관측 결과 | 판정 |
|---|---|---|
| 완전한 paired 사례10개 | 10/10 | PASS |
| candidate 최소9/10 | v2 8/10 → v6 10/10 | PASS |
| candidate 중대실패0 | 0 | PASS |
| baseline 정상 통과 → candidate 실패0 | 0 | PASS |
| 합성 표본 release gate | 모든 조건 충족 | **PASS** |

[Hold-out 안전 CSV](q604-v6-holdout-evidence.csv)는 양쪽20개 실제 trace IDs·버전·지연·usage·판정과 의미상 이유를 제공한다. 실제 사용자 피드백은0이며 판정은 독립 AI 분석자 검토다.

v2의 실패2개는 무관련 종목에 대한 요청과 UTC/KST 경계의 미래 metadata 사례에서 최종 서비스가 일반 생성실패 fallback을 반환한 것이다. v6는 각각 올바른 종목 근거 부족 보류, 제목의 예정 행사·자료시각·기준시각 이후 metadata라는 관계를 구분한 최종 답변으로 통과했다. v2의 native raw text가 유용해 보여도 실패한 최종 답변을 대신해 통과시키지 않았다.

나머지 사례에서 계약 규모 미공개, 회비 정책 미확인, 예정 설명회와 완료 여부, 재개일과 게재시각의 분리, 공시 본문 부재, 계산 불가능한 이익률, 주입 공격 무시, 오래된 신청 기간의 현재 상태 불확실성을 의미 기준으로 확인했다. 특정 문구·문장 순서를 요구하지 않았다.

정상 예정 설명회 답변은 명시된 미래 일정과 완료 확인 불가를 전달해 동등한 의미로 통과했다. 이전 소비된 hold-out의 “미래 metadata 경고” 누락 판정을 뒤집은 것이 아니다. 이번 Q606 rubric은 행사 일정의 의미 구분과 미래 metadata의 명시적 시각 경고를 서로 구분하며, 실제 미래 metadata 경계 사례에는 후자의 경고가 존재했다.

blind 판정 중 한 baseline 계약 설명의 날짜 연결 문장은 다소 모호했지만 문법상 날짜가 붙은 자료가 발표를 전한다는 표현으로 해석했으며, 계약 실행일을 독립적으로 확정한 명백한 주장으로 판정하지 않았다. 이 판단과 이유도 라벨 공개 전에 기록했다. 유리한 버전만 기준을 완화하거나 사후 재분류하지 않았다.

## 호출 실패와 상태

| 구간 | 서비스 수 | provider·HTTP200 | ok | insufficient_evidence | unavailable |
|---|---:|---:|---:|---:|---:|
| v6 개발 | 20 | 18/18 | 16 | 3 | 1 |
| 새 hold-out v2 | 10 | 10/10 | 8 | 0 | 2 |
| 새 hold-out v6 | 10 | 9/9 | 9 | 1 | 0 |
| 이번 합계 | 40 | 37/37 | 33 | 4 | 3 |

미호출3건은 deterministic 보류다. unavailable3건은 올바른 빈 근거 보류1과 v2의 생성 가용성 실패2로 나눈다. auth·quota·전송·timeout 실패는0이고 retry도0이다. native stop_reason은 end_turn36·max_tokens1이며 max_tokens는 baseline v2의 실패 기록으로 보존했다. v6의27provider 호출은 모두 end_turn이고 thinking content block은 없다. 입력·출력 자료는 합성 근거와 실제 모델 응답이다.

## 지연 비용과 한계

| 구간 | input / output tokens | 추정 USD | provider 호출 서비스 지연 중앙값 / p95 ms |
|---|---|---:|---|
| v6 개발20 | 27359 / 2577 | 0.0040244 | 1385.5 / 5320 |
| hold-out v2 10 | 5383 / 5604 | 0.0033403 | 3046 / 5216 |
| hold-out v6 10 | 14095 / 1649 | 0.0022340 | 1376 / 1656 |
| 이번40 합계 | 46837 / 9830 | **0.0095987** | 1480 / 5216 |

native usage의 전체 output을 사용했고 reasoning 하위 수량을 중복 더하지 않았다. cache 생성/읽기0이며 기존 승인 단가 input USD0.10/M·output USD0.50/M의 추정이다. 지연은 모델을 호출한 서비스 실행의 wall-clock이고 p95는 nearest-rank다. 두 버전의 provider 호출 수가 다르며 배포 네트워크 지연을 측정한 것은 아니다.

이전 로컬 누계 USD0.0360943 + 이번 USD0.0095987 = **로컬 추정 USD0.0456930**이다. root가 별도로 제시한 remote3 추정 USD0.0020803은 이 분모·누계에 섞지 않았다. 두 알려진 비용 묶음만 더하면 USD0.0477733이지만 다른 smoke·계정 청구 전부를 포함한 총액은 아니다. 실제 billed cost는 조회하지 않았으며 승인 USD1 이내다.

고정 합성10사례·각 버전 단회, 모델과 여러 이전 버전 변경, AI 분석자 판단의 한계가 있다. 10/10을 실사용100% 정확도·통계적 유의성·금융 안전성 보증으로 일반화하지 않는다. 이 셋은 이제 사용된 검증셋이며 향후 수정 후 그대로 “미노출 독립 hold-out”이라 다시 부를 수 없다.

## 보존 자료와 범위

실행/검토 도구는 [runner](../../tools/quest-evaluation/live/q604-v6.mjs), [개발검토](../../tools/quest-evaluation/live/q604-v6-review.mjs), [blind export](../../tools/quest-evaluation/live/q604-v6-blind.mjs), [hold-out 집계](../../tools/quest-evaluation/live/q604-v6-holdout-review.mjs)다. ignored private `q604-v6-evaluation/`에 동결 manifest/candidate·source-ready/holdout-ready·40개 원본 및40개 attempt·blind answers/map/judgments·개발/hold-out/release gate를 보존한다. 신규 corpus 원본도 그대로 유지했다.

공개 CSV는 허용된 식별자·상태·지연·usage·수동 요약만 포함하고 원문 대화·thinking·request headers·secret은 포함하지 않는다. 소스·corpus byte hash, 입력 동일성, 새 trace/conversation ID, 40개 attempt와 실패 포함을 검증했다. 앱·REPORT·cloud·Git은 수정하지 않았고 코더에게 평가 전 원문을 전달하지 않았다. 배포·실제 사용자 검증은 코디네이터의 별도 단계다.
