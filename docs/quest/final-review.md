# Main Quest 06 최종 독립 검토 (Q611)

검토일 2026-11-09 (UTC 03:55 이후 수행). 검토 대상은 저장소 `us-stock-dashboard`, 브랜치 `feat/main-quest-06-briefing-observability`, 구현·증거 커밋 `0fcb396b28c435362ed5dc053a48d473f41538bc`, 보고서 링크 갱신 커밋 `a97527ac3638146b5fee398a73b84d71f0e5f56f`(검토 시점 로컬 HEAD = origin 브랜치 head = [PR #7](https://github.com/cjwmanelf/us-stock-dashboard/pull/7) head), 배포 앱 https://modu-rich-quest06-fyzai5fn7a-du.a.run.app/briefing 이다. 같은 내용의 웹 보고서는 [review/index.html](review/index.html)에 있다. 이 문서는 검토자의 **초기 독립 판정**이며, 이후 코디네이터가 적용하는 교정은 §9에 별도로 기록한다.

## 0. 결론

**판정: 제출 가능(submission-ready), 한계 명시.** 사용자 루브릭 5항목과 보고서 7요건이 모두 공개 파일·실측 기록으로 뒷받침된다. 보고서의 핵심 수치(호출 수, 통과 수, 정상 회귀 수, 토큰·비용, 지연, trace ID, 해시, 리비전·이미지·빌드 ID, Cloud Logging 대조)를 검토자가 직접 재계산·재조회한 결과 어긋나는 핵심 수치는 없었다. 발견한 문제는 문서 불일치 2건(경미)과 서술 보강 권고이며 제출 차단 요인이 아니다. 합성 입력, AI 분석자 판정, 소표본, 비이중맹검 등 한계는 보고서가 이미 밝히고 있고 §6에 다시 정리했다.

## 1. 검토 메타데이터와 방법

| 항목 | 내용 |
| --- | --- |
| 요청된 검토자 | Claude Fable 5.1, effort max (코디네이터 브리프 `.orca-tasks/q611-final-independent-review.md`) |
| 관측된 검토자 | 세션 하네스(Claude Code 2.1.319)가 보고한 모델 ID `claude-fable-5-1`, 프로세스 환경변수 `CLAUDE_EFFORT=max`. Orca `worker-show` 출력에는 모델·설정 필드가 없었고, Anthropic API 응답 메타데이터로 교차 확인한 것은 아니다. |
| 검토 대상 상태 | 작업 트리 clean(`git status` 변경 0), 258개 추적 파일, PR #7 OPEN·base `main`(7ab330a)·커밋 2개·변경 184파일(+15667/−177)·mergeable·리뷰 0·코멘트 1(Vercel 봇 preview 알림) |
| 수행한 것 | 공개 문서·증거·소스 정독, SHA-256 재계산, 공개 CSV/JSON 재집계, `q604-final-export.mjs --verify-public`/`--smoke-public` 실행, `npx tsc --noEmit --incremental false`, `npx eslint .`, 비로그인 HTTP 프로브, `gcloud run`/`gcloud builds`/`gcloud logging read` 읽기 전용 조회, `gh pr view`/`gh api` 읽기 전용 조회, 스크린샷 5장 판독 |
| 하지 않은 것 | 모델 호출, 피드백 투표, 배포·트래픽 변경, 의존성 설치, Git 변경, 원격 코멘트, 비공개 `private/`·`.briefing-eval/`·`.env*`·native 원문 열람, 25개 평가 도구 테스트와 12개 검사 스크립트 재실행, replay dry-run, 물리적 터치·교차 브라우저 시험 |

## 2. 루브릭 5항목 판정

판정 기호: **충족** = 공개 증거로 뒷받침되고 재검증에서 어긋남 없음, **부분** = 일부 요소 누락 또는 해석 주의 필요, **미충족** = 증거 없음.

| # | 루브릭 | 판정 | 근거(검토자 확인) | 한계·비고 |
| --- | --- | --- | --- | --- |
| 1 | 트레이스·피드백에서 문제 후보 3개 이상, 증거 trace와 반복 횟수 | **충족**(한계 있음) | [REPORT §2](../../REPORT.md) 후보 4종, 각각 trace ID와 분모 명시(19/19, 1/19, 1/19, 2/19·날짜 사례 2/6). 다섯 trace(`c0587089…`, `830e83ba…`, `236471bb…`, `7176acec…`, `c0a962ef…`)가 [q610-comparison.csv](evidence/q610-comparison.csv)의 q610-01/10/15/13/18 baseline 행에 존재하고, 잠재 후보는 같은 CSV `qualityReason`에 "Latent raw JSON code fence / publishedAt-as-event-date / empty-citation abstention / after-asOf requirement"로 주석됨. 상세는 [live-baseline-analysis.md](live-baseline-analysis.md). | 4종 중 3종은 baseline UI에 노출되지 않은 **잠재** 오류(추출 실패에 가려짐)이며 보고서가 이를 명시한다. 후보 선정 시점의 실사용자 피드백은 0건이어서 후보는 trace·분석자 검토에서만 나왔다. 배포 후 받은 실사용자 정성 의견 1건(긴 출처 ID)은 §6에서 UI 변경으로 처리됐으나 §2 후보 표에는 없다(→ §5 P1-2). |
| 2 | 빈도·영향·수정 비용 비교와 첫 이슈 선택 근거 | **충족** | [REPORT §3](../../REPORT.md) 표(4행: 빈도 근거, 사용자 영향, 수정 비용·선택). 19/19 native 추출 오류를 첫 단일 수정(v2)으로 선택하고 나머지를 후속 실험으로 분리. [live-baseline-analysis.md](live-baseline-analysis.md) "One proposed fix and predeclared criteria"에 선택 전 사전 기준 기록. | 영향·비용은 정성 판단이며 측정값이 아님(보고서 명시). |
| 3 | 문제·정상 사례를 함께 가진 데이터셋으로 전후 비교 | **충족** | 개발 20건 정상 10/문제 10([q610-synthetic-cases.json](evidence/q610-synthetic-cases.json) 재집계), hold-out 3세트 각 정상 5/문제 5(q610 held-out, [final-consumed-q604-cases.json](evidence/final-consumed-q604-cases.json), [final-q606-cases.json](evidence/final-q606-cases.json)). 사전 게이트(≥9/10, 중대 0, 정상 회귀 0, 완전 쌍 10)는 [final-q606-protocol.json](evidence/final-q606-protocol.json) `gate`와 [final-gate.json](evidence/final-gate.json) 임계값이 일치. 실패 실험 v2(8/10)·v3(12/20)·v4(17/20)·v5(9/10, 정상 회귀 1) 보존, v6 개발 20/20·hold-out v2 8/10→v6 10/10·정상 회귀 0을 CSV와 [final-blind-review.json](evidence/final-blind-review.json)에서 재계산해 확인. | 입력은 합성, 판정은 AI 분석자(사람 평가 0), 버전당 1회 실행, 표본 10~20. 맹검은 라벨 차폐만이며 v2의 일반 실패 문구와 v6의 "날짜 안내" 단락으로 버전 추정이 가능해 이중맹검은 아니다(공개 문서도 명시). |
| 4 | 배포 후 버전별 새 대화와 현상 건수 감소 | **충족**(소표본) | `gcloud run revisions list`로 6개 리비전·digest 확인, 현재 100% 트래픽은 `modu-rich-quest06-v6-ui-20261109`. 새 대화 baseline 3건(revision 00004-72l, briefing-v1, 모두 `GENERATION_UNAVAILABLE`)→candidate 3건(revision v6-20261109, 모두 ok). 검토자가 `gcloud logging read`로 briefing_trace 7건(3+3+UI smoke 1)과 briefing_feedback 1건을 직접 조회해 trace ID·revision·status·durationMs가 [deployed-baseline.csv](evidence/deployed-baseline.csv)/[deployed-candidate.csv](evidence/deployed-candidate.csv)/[deployed-ui-smoke.json](evidence/deployed-ui-smoke.json)과 모두 일치함을 확인. | n=3, AAPL 근거 11→12(hash 변경), asOf 상이. baseline 리비전은 v1 코드이므로 3/3→0/3은 v2 추출 수정과 v3~v6 누적 변경의 합산 효과이지 단일 변수 인과가 아니다(보고서 명시). |
| 5 | REPORT.md에 과정과 결과 정리 | **충족** | [REPORT.md](../../REPORT.md) 7개 절 모두 존재, 113개 상대 링크 모두 유효(검토자 스크립트), 공개 증거 링크 41개 해시 일치. | 문서 불일치 2건(§5 P1-1, P2-1). |

## 3. 보고서 7요건 판정

| # | 요건 | 판정 | 근거(검토자 확인) |
| --- | --- | --- | --- |
| 1 | 로그·피드백 건수와 직접 작성 대화 제작 방법 | **충족** | 로컬 서비스 실행 183건/모델 호출 171건(60/58+20/18+3/3+20/18+40/37+40/37 재합산 일치), 서로 다른 입력 50개(30+10+10), 원격 3+3+1건 분리 표기. 질문·근거·asOf 사전 고정, 호출마다 새 UUID. 실사용자 정성 피드백 1건과 운영자 기능 투표 1건 구별([deployed-feedback-summary.json](evidence/deployed-feedback-summary.json)). |
| 2 | 후보별 증상·증거·횟수·최초 분기 단계 | **충족** | REPORT §2 표에 증상·trace·분모·최초 문제 단계 열이 있고 후속 v3/v4 관찰 실패 유형도 분리 기록. 잠재 후보 3종은 "잠재"로 표기. |
| 3 | 선택 이슈와 빈도·영향·비용 표 | **충족** | REPORT §3 표. |
| 4 | 데이터셋 문제/정상 수, 통과 예시, 사전 출시 게이트 | **충족** | 수치는 §2-3 참조. 통과 예시는 [v4-output-experiment.md](v4-output-experiment.md) 실제 출력 발췌, [v5](v5-live-evaluation.md)·[v6](v6-live-evaluation.md) 사례 서술, [final-v6-responses.json](evidence/final-v6-responses.json) 최종 답변 20건 전문. 게이트는 REPORT §4와 protocol JSON. |
| 5 | 수정 내용·실험(실패 포함)·실제 PR 링크 | **충족** | REPORT §5 표에 v1→v2…v5→v6 변경·결과·FAIL/PASS, 6개 동결 artifact 해시, [PR #7](https://github.com/cjwmanelf/us-stock-dashboard/pull/7)과 커밋 `0fcb396…` 명시. PR은 OPEN 상태이며 리뷰 승인·병합은 아님(보고서도 동일하게 서술). |
| 6 | 배포 후 버전별 건수·지연·비용·스크린샷 | **충족** | baseline 서버 9640/5908/5297ms·브라우저 10501.8/6589.3/5602ms·USD 0.0020803, candidate 5137/3554/3464ms·5570.7/3984.2/4197.9ms·USD 0.0015708, UI smoke 3961ms·USD 0.0005209 모두 CSV/JSON 재계산 일치. 스크린샷 5장 유효(PNG 482×758, 481×756, 481×756, 390×844, 390×844)이며 화면의 asOf·버전·근거 수가 기록과 일치. |
| 7 | 회고와 향후 실사용자 로그·피드백 계획 | **충족**(보완 권고) | REPORT §7에 출력 계약·실행 계층 경계·BOM·callback 등 실제 관찰 회고. 향후 계획은 동의·최소 수집·보존기간·접근권한·분리 원칙을 한 문단으로만 서술(→ §5 P3-2). |

## 4. 독립 재검증 결과

### 4.1 해시·소스 정합

| 검사 | 결과 |
| --- | --- |
| [final-export-manifest.json](evidence/final-export-manifest.json) 41개 파일 SHA-256 재계산 | 41/41 일치 |
| `tools/quest-evaluation/versions/v1`, `v2` 각 14개 파일 vs 공개 manifest·[final-source-manifests.json](evidence/final-source-manifests.json) | 28/28 일치 |
| 현재 `src/lib/briefing/service.ts` | `2215a387…` 일치(v6 평가본·배포본과 동일) |
| 현재 `src/components/BriefingForm.tsx` / `BriefingCitations.tsx` | `4a0add50…` / `925dbaf2…` 일치([citation-ui.md](citation-ui.md) 기록과 동일) |
| [q610-export-hashes.json](evidence/q610-export-hashes.json) 4개 | 4/4 일치 |
| v1↔v2 차이 | `types.ts` VERSION 1줄과 `anthropic-provider.ts`의 thinking/redacted_thinking 블록 허용·text 결합 3줄뿐. `service.ts`는 바이트 동일(보고서 "단일 어댑터 수정" 서술과 일치) |
| `node tools/quest-evaluation/live/q604-final-export.mjs --verify-public` | exit 0: publicFileCount 41, cases 10, responses 20, sourceFiles 28, hashes pass, modelCalls 0 |
| `--smoke-public` | exit 0: sourceVersions 3, mockedFetches 3, actualNetworkRequests 0; 실행 후 작업 트리 변경 없음 |

### 4.2 로컬 평가 수치 재집계(공개 CSV/JSON 기준)

| 구간 | 검토자 재집계 | 보고서 |
| --- | --- | --- |
| v1→v2 (q610, 60행) | 개발 baseline 품질 1/20·chosenFailure 19/19, 개발 candidate 17/20(실패 09·15·18), hold-out baseline 0/10, candidate 8/10(실패 29·30), trace/conversation 60개 고유, 토큰 28846/25812(thinking 13429), USD 0.0157906 | 일치 |
| v3 개발 | 12/20, 정상 회귀 5(03·04·06·07·08), 가용성 회귀 4, 상태 ok6/보류6/unavailable8, 토큰 18557/10869, USD 0.0072902, 중앙값 3367ms·p95 4981ms | 일치 |
| v4 개발 | 17/20, 정상 회귀 2(03·07), 실패 03·07·14, ok13/보류6/unavailable1, 토큰 23309/2157, USD 0.0034094, 중앙값 1292ms·p95 2127ms | 일치 |
| v5 개발·hold-out | 개발 20/20·정상 회귀 0; hold-out v2 7/10(06·07·08 unavailable)→v5 9/10, 정상 회귀 1(사례 03), USD 0.0040384+0.0028416+0.0021398=0.0090198 | 일치 |
| v6 개발·hold-out | 개발 20/20·정상 회귀 0; hold-out v2 8/10(p02·p05 unavailable)→v6 10/10, 중대 0, 정상 회귀 0, USD 0.0040244+0.0033403+0.0022340=0.0095987; v6 hold-out 지연 중앙값 1376ms·p95 1656ms(v2 3046/5216) | 일치 |
| 누계 | 183 서비스/171 모델, USD 0.0456930; 원격 6건 0.0036511; UI smoke 0.0005209; 알려진 합 0.0498650 | 일치 |
| 단가 | input USD 0.10/M·output USD 0.50/M(claude-haiku-5-5, 프롬프트 100K 이하)을 모든 행에 적용해 CSV `estimatedUsd` 열과 소수점 7자리까지 일치. 검토자가 보유한 Anthropic 단가표의 Haiku 5.5 행과도 같다 | 일치 |

### 4.3 최종 hold-out 맹검 기록

- [final-q606-rubrics.json](evidence/final-q606-rubrics.json)·protocol `frozenAt` 2026-11-09T03:11:41Z → 20건 실행 03:14:32~03:15:18Z → `gradedAt` 03:16:24Z(`labelsOpenedAtGrading:false`, blindId는 무작위 UUID) → gate `reviewedAt` 03:16:51Z. 순서 정합.
- 20개 판정의 caseId·traceId·label이 [final-v6-responses.json](evidence/final-v6-responses.json) 20건과 모두 결합되고, v2 실패 2건(ind6-p02, ind6-p05)은 모두 일반 생성실패 fallback 답변이다. 정상 사례의 baseline 통과→candidate 실패는 0건.
- v6 답변 중 서버 "날짜 안내" 단락이 붙은 사례는 ind6-p05 1건이며 입력 근거의 publishedAt(03:15:10Z)이 asOf(14:45Z… 2026-11-07)보다 늦은 경계 사례다. 입력 evidence에 URL은 없고 제목은 모두 "합성 평가 자료"로 표기되어 있다.

### 4.4 배포·빌드·런타임(읽기 전용 gcloud)

| 항목 | 검토자 조회 결과 |
| --- | --- |
| 리비전 | 00001-w9c, 00002-jk9(digest 7ec97d1c…), 00003-sfx(462e5549…), 00004-72l(362e80cb…), v6-20261109(ed253c79…), v6-ui-20261109(13567eff…) 모두 존재, digest가 [deployment-verification.md](deployment-verification.md) 기록과 일치 |
| 트래픽 | 100% → `modu-rich-quest06-v6-ui-20261109`, URL 일치 |
| Cloud Build | `405955c5…` SUCCESS 03:14:13Z→digest ed253c79…, `0b3bf33e…` SUCCESS 03:33:25Z→digest 13567eff… (둘 다 asia-northeast3 리전 빌드) |
| 런타임 설정(이름 기준) | provider anthropic, model claude-haiku-5-5, LANGFUSE_ENABLED=false, LANGFUSE_CAPTURE_CONTENT=false, BRIEFING_EVAL_MODE=false, BRIEFING_TRACE_CONTENT=false, ANTHROPIC/STOCK/MARKETAUX/FEEDBACK 4개 secret 참조 버전 1 고정, allowed origin = 정확한 서비스 URL, CPU 1·512Mi·concurrency 8·timeout 300·maxScale 1. 비밀값은 조회하지 않음 |

### 4.5 Cloud Logging 대조(최근 24시간, 읽기 전용)

briefing_trace 7건이 전부였고 그 외 호출 흔적은 없었다.

| revision | traceId | contractVersion | status | durationMs | evidenceCount | 공개 기록 |
| --- | --- | --- | --- | ---: | ---: | --- |
| 00004-72l | 6dad8e19… / 638483c5… / a3f3c5f0… | briefing-v1 | unavailable ×3 | 9640 / 5908 / 5297 | 11 / 12 / 12 | deployed-baseline.csv 일치 |
| v6-20261109 | b7e3c76e… / 13edaad6… / 1c5b8b4b… | briefing-v6-temporal-notice | ok ×3 | 5137 / 3554 / 3464 | 12 ×3 | deployed-candidate.csv 일치 |
| v6-ui-20261109 | 319918ec… | briefing-v6-temporal-notice | ok | 3961 | 12 | deployed-ui-smoke.json 일치 |

briefing_feedback 1건: trace b7e3c76e…, version v6, score 1, 03:25:26.921Z — [deployed-feedback-summary.json](evidence/deployed-feedback-summary.json)의 운영자 기능 테스트 1건과 일치. 사용자 만족도 투표는 로그에 없다(보고서 서술과 일치).

### 4.6 HTTP·UI·스크린샷

- 비로그인: `/`·`/login` 200, `/briefing` 200(폼 대신 "로그인 후 이용" 안내만 렌더, 소스 `src/app/briefing/page.tsx` 확인), `/dashboard`·`/portfolio`·`/feed` 307→`/login`, `POST /api/briefing` 동일 Origin 401·타 Origin 403, `POST /api/briefing/feedback` 401, `GET /api/briefing` 405. 보고서 §6 서술과 일치.
- [citation-compact-mobile.png](evidence/screenshots/citation-compact-mobile.png): `[근거]` 버튼 5개, asOf 2026-11-09T03:35:38.948Z · briefing-v6-temporal-notice, 근거 12 — UI smoke 기록과 일치. [citation-source-dialog-mobile.png](evidence/screenshots/citation-source-dialog-mobile.png): "근거 상세" 모달(제목·날짜 메타데이터·원문 보기·원본 ID·닫기). [baseline-live-unavailable.png](evidence/screenshots/baseline-live-unavailable.png): "브리핑 생성 불가", asOf 03:01:29.580Z · briefing-v1, 근거 11. [candidate-live-ok.png](evidence/screenshots/candidate-live-ok.png): "AI 브리핑", asOf 03:22:26.214Z · v6, 긴 출처 ID와 "날짜 안내" 단락이 보여 사용자 의견의 배경을 보여준다. [baseline-authenticated-form.png](evidence/screenshots/baseline-authenticated-form.png): 로그인 상태 입력 폼. 개인정보는 보이지 않는다.
- `BriefingCitations.tsx`: `<dialog>`+`showModal()`, `onClose`에서 호출 버튼으로 focus 복귀, HTTPS·자격증명 없는 URL만 링크 — 문서 서술과 일치. 닫기 버튼의 React `autoFocus`는 HTML `autofocus` 속성을 만들지 않아 `showModal()`의 초기 focus가 첫 포커스 가능 요소인 원문 링크에 가며, 이는 smoke JSON의 관측("initialFocus: Source link inside dialog")과 일치한다.

### 4.7 코드 품질 검사(검토자 재실행)

- `npx tsc --noEmit --incremental false`: exit 0.
- `npx eslint .`: **오류 5, 경고 1**. 오류 5건은 [final-validation.md](final-validation.md)가 기존 production 오류로 기록한 동일 위치(AddHoldingForm.tsx:19, EditableHoldingRow.tsx:34, ThemeToggle.tsx:25, TickerAutocomplete.tsx:45 `react-hooks/set-state-in-effect`; WeightDonut.tsx:62 `react-hooks/immutability`). 경고 1건은 `tools/quest-evaluation/live/q604-final-export.mjs:6`의 미사용 변수 `root`(`@typescript-eslint/no-unused-vars`)로, final-validation.md의 "5 errors, 0 warnings" 최종 문장과 다르다(→ §5 P1-1).
- 추적 파일 전체 자격증명 패턴(sk-…, AIza…, PRIVATE KEY, JWT) 스캔 0건, 개인 파일시스템 경로 0건, 추적된 env 파일은 `.env.briefing.example`뿐, `private/`·`.briefing-eval/`·`.env*`는 `git check-ignore`로 제외 확인.

### 4.8 시간순 정합

모든 사건이 2026-11-09 UTC 02:21~03:50 사이에 일관된 순서로 기록돼 있다. v6 이미지 빌드 완료(03:14:13Z)는 hold-out 실행(03:14:32Z)과 gate PASS(03:16:51Z)보다 앞서지만, 리비전 생성(03:20:18Z)과 트래픽 전환은 gate PASS 이후다. 즉 빌드는 선행 준비였고 배포는 게이트를 기다렸다. 이후 candidate 새 대화 03:22~03:24Z → 운영자 피드백 03:25Z → 사용자 의견 기록 03:27Z → UI 빌드 03:33Z → UI smoke 03:35Z → 커밋 03:48Z → PR 03:49Z → 문서 커밋 03:50Z.

## 5. 발견 사항과 우선순위별 권고

상태 열은 검토 시점(2026-11-09) 기준 **초기 발견·미적용**이다. 코디네이터가 교정을 적용하면 §9에 날짜와 함께 기록하고 이 표의 초기 판정은 그대로 둔다.

| ID | 우선순위 | 발견 | 근거 | 권고 | 상태 |
| --- | --- | --- | --- | --- | --- |
| P1-1 | 높음(문서 정정) | final-validation.md 최종 문장 "5 errors, 0 warnings"가 현재 트리와 다름. 검토자 실행은 오류 5·경고 1 | `npx eslint .` at a97527a; 경고는 `q604-final-export.mjs:6` 미사용 `root`. 해당 파일은 lint 정리 재실행 뒤(12:37 KST) 수정됨 | final-validation.md에 "최종 공개 export 스크립트 추가 후 경고 1건(미사용 변수) 발생, production 오류 수는 5로 동일"을 추기. 코드 수정 시 [final-validation.json](evidence/final-validation.json) `hashes`의 해당 항목도 갱신해야 하므로 문서 추기를 권함 | 초기 발견·미적용 |
| P1-2 | 높음(루브릭 명시성) | 루브릭 1의 "트레이스 **및 피드백**" 중 피드백 유래 후보가 §2 표에 없음. 실사용자 정성 의견 1건(긴 출처 ID→근거 버튼)은 §6에만 서술 | REPORT §2 표 4행 모두 trace 유래; [deployed-feedback-summary.json](evidence/deployed-feedback-summary.json) `realUserQualitative.count=1` | §2 표에 5번째 행 추가: "출처 ID 가독성 \| 실사용자 의견 1건(03:27:11Z 기록, 관련 trace b7e3c76e…) \| 1/1 \| UI 표시 단계(모델 무관) \| 수정 작음, v6-ui-20261109로 배포". 아울러 "후보 선정 시점 실사용자 피드백 0건"을 §2 서두에 명시 | 초기 발견·미적용 |
| P2-1 | 중간(현재 상태 명시) | REPORT §6 서두는 `v6-20261109` 100% 트래픽을 서술하지만 현재 100%는 `v6-ui-20261109`(digest 13567eff…)이며 하위 절에서만 다룸 | `gcloud run services describe` traffic | §6 첫 문단에 "현재 라이브 리비전: modu-rich-quest06-v6-ui-20261109(UI만 변경, 추론 동일)" 한 줄 추가 | 초기 발견·미적용 |
| P2-2 | 중간(해석 보조) | 후보 4종 중 3종이 미노출 잠재 오류라는 점이 본문에는 있으나 표에는 없음. 잠재 후보의 원문은 비공개라 공개 파일에서는 CSV 주석과 발췌로만 확인 가능 | q610-comparison.csv `qualityReason`, live-baseline-analysis.md "Six actual excerpts" | §2 표에 "노출 여부(사용자 화면 노출/잠재)" 열 추가, 공개 재현 범위(CSV 주석·발췌)를 한 문장으로 명시 | 초기 발견·미적용 |
| P2-3 | 중간(평가자 성격) | "독립 평가자/분석자"가 같은 오케스트레이션 세션의 별도 AI 워커이고 사람 채점이 0건이라는 점, 맹검이 라벨 차폐 수준이라는 점이 REPORT 본문에서는 분산 서술됨 | final-README.md, v6-live-evaluation.md "라벨 차폐 검토" | REPORT §4 한계 문단에 "평가자=별도 AI 워커(이전 hold-out·구현 미열람), 사람 채점 0, 버전 문체로 추정 가능한 단일 차폐"를 한 문장으로 모음 | 초기 발견·미적용 |
| P2-4 | 중간(인과 해석) | 배포 비교의 baseline 리비전은 v1 코드이므로 3/3→0/3은 v2 추출 수정과 v3~v6 누적 효과 | deployment-verification.md "Byte-level proof of baseline isolation" service.ts 9f1352bf… = v1 | §6 비교 문단에 "감소한 현상은 §2 후보 1(native 추출 실패) 범주이며 배포본은 v2~v6 누적 변경" 명시 | 초기 발견·미적용 |
| P3-1 | 낮음(접근성) | 모달 초기 focus가 "원문 보기 (새 탭)" 링크. Enter 입력 시 의도치 않은 새 탭 이동 가능 | BriefingCitations.tsx 38행 `autoFocus`, deployed-ui-smoke.json `initialFocus` | `showModal()` 직후 제목(`h3`, tabindex=-1) 또는 닫기 버튼으로 명시적 focus 이동. UI 전용 변경이며 추론 코드·해시와 무관 | 초기 발견·미적용 |
| P3-2 | 낮음(계획 구체화) | §7 향후 실사용자 로그·피드백 계획이 원칙 수준 | REPORT §7 마지막 문단 | 수집 항목(traceId·version·vote·선택 코멘트), 동의 문구 위치, 보존 일수, (traceId, version) 중복 제거 규칙, 만족/보통/불만족 3단계 UI, 목표 표본 수를 표로 명시 | 초기 발견·미적용 |
| P3-3 | 낮음(공개 정책 일관성) | 공개 CSV/JSON은 제공자 제목·URL을 제외했지만 스크린샷에는 제공자 헤드라인이 보임 | deployed-live-verification.md "제목·URL도 공개 export에서 제외" vs candidate-live-ok.png | "스크린샷의 제공자 헤드라인은 공개 뉴스 제목이며 export 제외 규칙은 구조화 데이터에만 적용"을 한 문장으로 명시 | 초기 발견·미적용 |
| P3-4 | 낮음(제출 맥락) | 저장소가 현재 공개(PUBLIC)이고 CLAUDE.md는 비공개로 기술; PR에 Vercel 봇이 브랜치 preview 배포 알림을 남김 | `gh repo view` visibility PUBLIC; PR 코멘트 1건(vercel) | PR 본문 또는 REPORT에 "평가 대상 배포는 Cloud Run URL이며 Vercel preview는 과제 범위 밖"을 명시. CLAUDE.md 공개 여부 문구 갱신은 과제 범위 밖이므로 선택 | 초기 발견·미적용 |

## 6. 알려진 한계(검토자 확인)

- 로컬 입력 50개는 모두 합성이며 실제 시장 사실이 아니다. 배포 비교의 근거는 실제 제공자 메타데이터이지만 사실성은 독립 검증되지 않았다.
- 모든 품질 판정은 AI 분석자 판정이다. 사람의 숫자 만족도 투표는 0건이며, 운영자 기능 테스트 1건(score 1)은 만족도로 집계되지 않았다.
- 표본은 버전당 개발 20·hold-out 10·배포 3이고 각 1회 실행이라 통계적 유의성은 없다. v2 hold-out 세 세트의 점수(8/10, 7/10, 8/10)가 세트마다 다른 것도 소표본 변동을 보여준다.
- 최종 hold-out의 맹검은 라벨 차폐이며, 출력 문체·서버 안내문으로 버전을 추정할 수 있다.
- native 원문·thinking·요청 헤더는 비공개이므로 공개 파일만으로는 잠재 후보의 원문 재채점이나 원시 전송 재검사가 불가능하다.
- 전체 저장소 lint는 기존 production 오류 5건이 남아 있어 완전 통과가 아니다(보고서 명시). Langfuse 수집은 없다.
- UI smoke는 1회·DOM click·390px이며 물리적 터치와 교차 브라우저는 검증되지 않았다.
- 비용은 토큰 단가 추정치이며 계정 청구액이 아니다.
- 검토자는 25개 평가 도구 테스트와 12개 검사 스크립트를 재실행하지 않았고, 비공개 아카이브 대조("archive 14개 inference 파일 일치")는 이미지 digest·현재 소스 해시로만 간접 확인했다.

## 7. 공개 파일만으로의 재현성 평가

| 재현 항목 | 가능 여부 | 비고 |
| --- | --- | --- |
| 공개 증거 무결성·금지 필드·28개 과거 소스 검증 | 가능(확인) | `--verify-public`, Node 내장 모듈만 사용 |
| v1/v2/v6 서비스 계약 모의 실행 | 가능(확인) | `--smoke-public`, mock fetch 3회, 네트워크 0 |
| 보고서 수치 재집계 | 가능(확인) | CSV/JSON 열이 충분해 통과 수·회귀·토큰·비용·지연을 재계산할 수 있음 |
| 최종 hold-out 20개 답변의 의미 재채점 | 가능 | 입력·rubric·최종 답변·판정 사유가 모두 공개됨. 다만 재채점자는 AI든 사람이든 별도 기록이 필요 |
| 잠재 후보(코드펜스·빈 인용·날짜 과해석) 원문 확인 | 부분 | CSV 주석과 발췌만 공개, native 원문 비공개 |
| 동일 입력의 live 재실행 | 조건부 | API 키·예산·명시 허가 필요, 응답 비결정성 때문에 별도 run으로 기록해야 함(final-README 안내) |
| 배포 리비전·빌드·로그 대조 | 조건부 | GCP 프로젝트 열람 권한 필요(검토자는 보유 계정으로 확인) |

## 8. 검토에서 수행하지 않은 것

모델 호출 0회, 피드백 투표 0회, 배포·트래픽·Git 변경 0회, 원격 코멘트 0회. 비공개 디렉터리와 env 파일, native 원문은 열지 않았다. 25개 테스트·12개 검사 스크립트·replay dry-run은 재실행하지 않았다(구체적 의심 근거가 없었고 typecheck·lint·공개 검증·smoke로 충분하다고 판단).

## 9. 교정 상태 기록(코디네이터 갱신용)

| 날짜 | 대상 ID | 적용 내용 | 적용자 |
| --- | --- | --- | --- |
| 2026-11-09 | 전체 | 초기 독립 검토 작성. 교정 미적용 상태 | 검토 워커 Q611 |

| 2026-11-09 | P1-1 | **반영 완료**: 최종 lint는 기존 오류 5·export 경고 1로 문서 정정. 동결 파일과 해시는 보존. | 코디네이터 |
| 2026-11-09 | P1-2 | **반영 완료**: REPORT §2에 사용자 피드백 유래 후보·관련 trace·1건의 분모·UI 단계 추가; §3 후속 우선순위 추가. | 코디네이터 |
| 2026-11-09 | P2-1~P2-4 | **반영 완료**: 현재 라이브 리비전, 잠재 오류 노출 여부·공개 재현 한계, 별도 AI 평가자·단일 차폐, 배포 누적 효과를 명시. | 코디네이터 |
| 2026-11-09 | P3-2~P3-4 | **반영 완료**: 미실행 수집 계획, 화면의 공개 헤드라인 정책, Cloud Run 평가 범위 추가. | 코디네이터 |
| 2026-11-09 | P3-1 | **선택적 후속**: 현재 모달 focus는 원문 링크 안에 있고 Escape·복귀 검증됨. 명시적 제목/닫기 focus 변경은 이번 배포에서 수행하지 않음. | 코디네이터 |

위 교정은 코디네이터가 적용했으며 Q611이 수정본을 재검토했다고 주장하지 않는다. 초기 독립 발견·판정은 그대로 보존했다. 수정 범위는 문서와 검토 웹페이지이며 모델/추론 소스·배포본·공개 동결 증거를 변경하지 않았다.

### 후속 코드·의존성·운영 반영 — 2026-11-09

[코드 후속](review-code-followup.md)은 전체 lint **0 errors / 0 warnings**, typecheck·평가25/25·UI callback/hook 회귀 통과를 기록한다. 닫기 버튼을 showModal 직후 명시적으로 focus하고, 폼 연속 성공 reset·편집 오류 수명·theme 구독·autocomplete 취소·donut 순수 계산 및 exporter 미사용 변수를 수정했다. 초기 5/0→5/1은 역사적 관측으로 유지한다.

[의존성 후속](dependency-review.md)과 [audit JSON](evidence/dependency-audit.json)은 Next/config **16.4.5**, 호환 transitive 갱신 및 estree에 한정한 minimatch11.0.1 override 후 **full0 / production0**을 확인한다. 원래18개 package-entry 발견과 당시 production6은 보존한다. 오늘 DB로 baseline/current 취약점 객체와 영향20노드가 같음을 확인했으며 과거 당시 알려진 advisory까지 같았다는 뜻은 아니다. scoped major override의 사용 경로 호환 검사는 통과했으나 upstream semver 보장은 아니므로 후속 재검토한다.

[runtime review](runtime-review.md)와 [실측 JSON](evidence/runtime-review.json)은 **기존 Next16.2.10 v6-ui 리비전**의 메모리79관측(가중평균27.694%)·startup3건(평균1073.265ms) 및 maxScale1 설정에서도 instance_count2를 관측했다. 새 수정본의 성능 인증이나 통제 부하 시험이 아니다. 현재 정책은 인증된 사용자에 대한 **process/module별 best-effort**이며 재시작 시 초기화되고 global 요청/비용 상한을 보장하지 않는다. hard global 정책에는 현재 max1에서도 shared atomic limiter와 별도 provider 비용 통제가 필요하다. provider spend cap은 확인하지 않았고 새 인프라·메모리 증설을 실행하거나 필요하다고 단정하지 않는다.

**완료:** 결합 수정본 `modu-rich-quest06-reviewed-20261109`(Next16.4.5)가 Ready·100% traffic으로 배포됐다. Build `773b9b97-2216-4690-9e8f-2267e2b9e41d`, digest `sha256:b4372f6496eb8f68e0d6dcc55c67c18c56c9c5e9550d206b0372b8bd9da4082f`다. 새 AAPL/MSFT/NVDA 실제3호출 모두200/ok·Cloud Logging exact join3/3이며 input9087/output1186·추정USD0.0015017, 알려진 누계USD0.0513667이다. 기존 로컬183서비스/171모델·원격6·UI1은 별도 분모로 보존한다. 새3건은 배포 smoke이며 과거 hold-out 재채점이 아니다. 실제 Orca 클릭 후 닫기 BUTTON 초기 focus, Enter 닫기/외부이동 없음/복귀, 재열기와 Escape 복귀,390px 넘침 없음이 확인됐다. 테마 변경/기본값 복구, 실제 AAPL 자동완성·ArrowDown/Enter·지우기, 빈 수량 유효성 차단, 행 편집/취소/재열기도 확인했고 console0·포트폴리오 DB쓰기0·투표0이다. [배포](review-deployment.md)·[실제 확인](reviewed-live-verification.md)·[안전 증거](evidence/reviewed-smoke.json)를 참조한다. v6 추론14파일은 불변이지만 새 의존성 그래프의 독립 품질 평가나 교차 브라우저/실물 터치 검증은 아니다.

Fable의 최초 발견과 Astra 기록은 보존하며 아래의 예전 미적용·실패·hash는 당시 상태다. 실제 정성 의견1건·운영자 시험vote1건·사람 numeric 평가0건은 그대로다. P3-2는 **계획 구체화 완료**일 뿐 새 사용자 수집·3단계 평가UI·동의/삭제 backend 구현 완료가 아니다.

| ID | 현재 대응 |
| --- | --- |
| P1-1 | 문서 정정 뒤 코드 해결: 전체 lint 0/0; 원본 exporter hash는 historical snapshot으로 보존하고 새 digest는 코드 후속 보고에 별도 기록 |
| P1-2 | REPORT §2·3 피드백 후보/trace/분모/선정 당시0 명시 완료 |
| P2-1 | 당시 v6-ui와 비교 v6 구분 완료; reviewed 리비전 Ready100%·새 smoke3/3 확인 완료 |
| P2-2 | 잠재 오류 노출 여부·공개 재현 범위 명시 완료 |
| P2-3 | 별도 AI 평가·사람 채점0·단일 라벨 차폐 한계 명시 완료 |
| P2-4 | 원격 현상 감소와 누적 변경·근거 차이 명시 완료 |
| P3-1 | 명시적 닫기 focus 구현·오프라인 검증 완료; 실제 닫기 focus·Enter/Escape·복귀 확인 완료 |
| P3-2 | 수집/동의/보존/중복/표본 계획 표 완료; 실제 수집·추가 backend는 미구현 |
| P3-3 | 구조화 export와 화면 공개 헤드라인 정책 구분 완료 |
| P3-4 | Cloud Run 평가 범위와 공개 저장소 표기 반영 완료 |

[Astra 전수 대응 및 최신 상태](review-reconciliation.md)를 함께 참조한다. 이는 후속 구현자/통합자의 기록이며 Fable의 수정본 재승인이나 새 모델 품질 채점을 뜻하지 않는다. §1–8과 §9의 초기 기록은 변경하지 않았다.
