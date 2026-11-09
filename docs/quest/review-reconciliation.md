# Fable·Astra 검토 반영 대조 — Q613

## 최신 리뷰 반영 상태 — 코드·의존성·운영 및 결합 배포·브라우저 검증 완료

[코드 후속](review-code-followup.md)은 전체 lint **0 errors / 0 warnings**, typecheck·평가25/25·UI callback/hook 회귀 통과를 기록한다. 닫기 버튼을 showModal 직후 명시적으로 focus하고, 폼 연속 성공 reset·편집 오류 수명·theme 구독·autocomplete 취소·donut 순수 계산 및 exporter 미사용 변수를 수정했다. 초기 5/0→5/1은 역사적 관측으로 유지한다.

[의존성 후속](dependency-review.md)과 [audit JSON](evidence/dependency-audit.json)은 Next/config **16.4.5**, 호환 transitive 갱신 및 estree에 한정한 minimatch11.0.1 override 후 **full0 / production0**을 확인한다. 원래18개 package-entry 발견과 당시 production6은 보존한다. 오늘 DB로 baseline/current 취약점 객체와 영향20노드가 같음을 확인했으며 과거 당시 알려진 advisory까지 같았다는 뜻은 아니다. scoped major override의 사용 경로 호환 검사는 통과했으나 upstream semver 보장은 아니므로 후속 재검토한다.

[runtime review](runtime-review.md)와 [실측 JSON](evidence/runtime-review.json)은 **기존 Next16.2.10 v6-ui 리비전**의 메모리79관측(가중평균27.694%)·startup3건(평균1073.265ms) 및 maxScale1 설정에서도 instance_count2를 관측했다. 새 수정본의 성능 인증이나 통제 부하 시험이 아니다. 현재 정책은 인증된 사용자에 대한 **process/module별 best-effort**이며 재시작 시 초기화되고 global 요청/비용 상한을 보장하지 않는다. hard global 정책에는 현재 max1에서도 shared atomic limiter와 별도 provider 비용 통제가 필요하다. provider spend cap은 확인하지 않았고 새 인프라·메모리 증설을 실행하거나 필요하다고 단정하지 않는다.

**완료:** 결합 수정본 `modu-rich-quest06-reviewed-20261109`(Next16.4.5)가 Ready·100% traffic으로 배포됐다. Build `773b9b97-2216-4690-9e8f-2267e2b9e41d`, digest `sha256:b4372f6496eb8f68e0d6dcc55c67c18c56c9c5e9550d206b0372b8bd9da4082f`다. 새 AAPL/MSFT/NVDA 실제3호출 모두200/ok·Cloud Logging exact join3/3이며 input9087/output1186·추정USD0.0015017, 알려진 누계USD0.0513667이다. 기존 로컬183서비스/171모델·원격6·UI1은 별도 분모로 보존한다. 새3건은 배포 smoke이며 과거 hold-out 재채점이 아니다. 실제 Orca 클릭 후 닫기 BUTTON 초기 focus, Enter 닫기/외부이동 없음/복귀, 재열기와 Escape 복귀,390px 넘침 없음이 확인됐다. 테마 변경/기본값 복구, 실제 AAPL 자동완성·ArrowDown/Enter·지우기, 빈 수량 유효성 차단, 행 편집/취소/재열기도 확인했고 console0·포트폴리오 DB쓰기0·투표0이다. [배포](review-deployment.md)·[실제 확인](reviewed-live-verification.md)·[안전 증거](evidence/reviewed-smoke.json)를 참조한다. v6 추론14파일은 불변이지만 새 의존성 그래프의 독립 품질 평가나 교차 브라우저/실물 터치 검증은 아니다.

Fable의 최초 발견과 Astra 기록은 보존하며 아래의 예전 미적용·실패·hash는 당시 상태다. 실제 정성 의견1건·운영자 시험vote1건·사람 numeric 평가0건은 그대로다. P3-2는 **계획 구체화 완료**일 뿐 새 사용자 수집·3단계 평가UI·동의/삭제 backend 구현 완료가 아니다.


## 아래는 최초 대조 시점의 역사적 기록

2026-11-09 작성. 이 문서는 기존 독립 발견을 바꾸지 않고 권고별 현재 상태와 남은 조치를 연결한다. REPORT·최종 검토·웹 검토·동결 manifest/실험 결과는 수정하지 않았다. Q612 코드 수정과 후속 배포 결과는 별도 증거가 도착하기 전까지 완료로 판정하지 않는다.

### 최신 전수 대응표 (아래 최초 대조표의 대기 상태를 대체)

| 발견/권고 | 현재 판정 및 연결 |
| --- | --- |
| Fable P1-1 | 코드 해결·lint0/0, historical exporter hash 유지·새 digest 별도: 코드 후속 보고 |
| Fable P1-2, P2-2, P2-3, P2-4 | REPORT 후보/공개 범위/AI 단일차폐/누적 인과 서술 반영 완료 |
| Fable P2-1 | 당시 live 구분 완료; reviewed 리비전 Ready100%·새 smoke3/3 확인 완료 |
| Fable P3-1 | 닫기 focus 구현·오프라인 검증 완료; 새 배포 및 닫기 focus·Enter/Escape·복귀 확인 완료 |
| Fable P3-2 | 구체적 수집 계획 작성 완료만 의미; 신규 사람·평가·삭제 backend 없음 |
| Fable P3-3, P3-4 | 공개 헤드라인 정책·Cloud Run 범위·공개 저장소 표기 반영 완료 |
| Astra eval synthetic 격리, asOf/UUID, 운영오류 분리, URL/UUID 검증 | 아래 코드 위치·회귀 증거로 수정 확인; Q613 갱신 그래프 검사도 통과 |
| Astra stage spans, frozen replay, origin/callback | 아래 실제 경계/loader/40·43검사 증거로 수정 확인; mock 검사를 원격 관측으로 혼동하지 않음 |
| Astra feedback durability/version, citation/ticker/보류 | 서명·delivery matrix·인용 계약 및 보류 의미평가 구분 확인; 운영자 vote는 사용자 만족도 아님 |
| Astra 개인 경로, ignore/one-off/env, 공개 source/fixture | 공개 정리 및41파일/28과거소스 검사 확인; 후속34파일 exact staged 보안검사·배포22해시·역사41해시 일치 확인 완료 |
| Astra tooling/production lint | 5/1 잔존 해소, 현재 전체0/0; 초기 오류 발견 이력 유지 |
| Astra dependency18/inheritance | 오늘 DB의 baseline/current 객체·20노드 동일 확인 후 full0/prod0 로컬 수정 완료; Next16.4.5 결합 배포·실제 smoke3건 완료 |
| Astra process-local/memory/startup | 기존 리비전79메모리/3startup·overlap2 실측 완료; best-effort 정책 명시, hard global/provider spend 보장 없음 |
| Astra 실제 호출/후보/배포/join/PR 부재 | 과거183서비스171모델·원격6+UI1·PR7·독립 검토 증거로 당시 공백 해소; 후속 코드의 새 배포 증거와 분리 |

## 출처와 확인 범위

- **Fable**: [final-review.md](final-review.md) §5의 P1-1/P1-2/P2-1~4/P3-1~4 전부와 §9 교정 기록. 초기 독립 판정은 그대로 보존한다.
- **Astra**: 이번 Main Quest 실행에서 선행 GPT6 Astra 워커들이 수행한 코드·보안·평가·제출 감사의 연속 기록을 뜻한다. 저장소 밖 `.orca-tasks/Q605-review.txt`(원 발견 및 후속 해결), `Q601-reviewed.txt`~`Q610-reviewed.txt` 중 관련 완료 검토, `submission-public-audit.md`, `v6-release-decision.md`와 저장소의 [validation.md](validation.md), [final-validation.md](final-validation.md), [submission-gap-audit.md](submission-gap-audit.md), [publication-verification.md](publication-verification.md)를 대조했다. 단일한 “Astra 최종 검토서”나 각 기록의 API 모델 식별자를 확인했다고 주장하지 않는다. 저장소 루트의 과거 July 2026 `review.md`는 이번 감사 출처가 아니다.
- Orca run `run_65c3aa279146` inbox를 읽기 전용으로 확인하여 telemetry/평가/공개 정리/피드백/최종 검증 완료 기록과 연결했다. 원본 `.orca-tasks`는 운영 기록이며 공개 제출에 복사하지 않는다. 아래 표에 발견과 현재 증거를 요약해 공개 문서만으로도 상태를 이해할 수 있게 했다.
- 직접 수행한 것은 현재 공개 코드·문서 읽기와 아래 오프라인 검사뿐이다. 비밀 파일·native 응답·새 hold-out을 열지 않았고 모델·클라우드 호출, 설치, commit/push, 배포를 하지 않았다. 기존 원격 증거는 기존 검증자의 관찰을 인용한다.

## Fable 권고 전수 대조

모든 ID의 원 출처는 [독립 검토 §5](final-review.md#5-발견-사항과-우선순위별-권고)다. “반영”은 현재 문서/코드 대조 결과이며 Fable의 재승인을 뜻하지 않는다.

| ID | 최초 권고 | 현재 실제 상태 | 필요한 조치 | 증거 |
| --- | --- | --- | --- | --- |
| P1-1 | 최종 lint의 5 errors/0 warnings 서술을 exporter 추가 후 5/1로 정정 | **문서 정정 반영**. final-validation의 초기 5/0과 독립 검토 시점 5/1을 구분한다. 사용자의 전체 반영 요청에 따른 오류5·경고1 코드 해소는 Q612 담당이며 이 표에서는 **검증 대기** | Q612 최종 lint/typecheck와 변경 범위 증거 후 현재 상태를 추가 기록. 기존 5/1 역사 및 frozen hash를 덮어쓰지 않음 | [final-validation 마지막 절](final-validation.md), REPORT §6; exporter 원본 hash와 후속 변경을 구분할 것 |
| P1-2 | 피드백 유래 후보를 REPORT §2에 추가하고 최초 선정 당시 사용자 피드백0을 명시 | **반영**. 다섯 번째 후보에 긴 ID 가독성, 정성1/1, trace, UI 단계, 배포 후 시각이 있다. §3 우선순위도 추가됨 | 없음 | [REPORT §2·3](../../REPORT.md), [feedback summary](evidence/deployed-feedback-summary.json) |
| P2-1 | 현재 100% 리비전 v6-ui를 §6 첫 문단에 명시 | **반영**. v6-ui-20261109와 과거 v6 비교 리비전을 구별 | Q612 후 새 배포가 생기면 root가 새 실제 리비전/검증 시각을 기록. 이 작업은 현재 클라우드를 재조회하지 않음 | REPORT §6, [citation-ui](citation-ui.md), [deployment verification](deployment-verification.md) |
| P2-2 | 후보별 UI 노출 여부와 공개 재현 범위를 명시 | **반영**. 추출 실패와 잠재 오류3종을 표 열에서 구분하고 CSV 주석/최종 text 발췌 범위를 명시 | 없음; 비공개 native 원문을 공개해야 한다는 뜻이 아님 | REPORT §2, [baseline analysis](live-baseline-analysis.md), [comparison CSV](evidence/q610-comparison.csv) |
| P2-3 | 별도 AI 워커 평가·사람 채점0·단일 라벨 차폐의 한계를 한곳에 명시 | **반영**. REPORT §4에 세 조건 및 문체로 버전 추정 가능성을 함께 기록 | 없음 | REPORT §4, [final README](evidence/final-README.md) |
| P2-4 | 원격 v1→v6는 추출 실패 현상 감소 및 v2~v6 누적 효과임을 명시 | **반영**. 3/3→0/3을 단일 수정 효과로 귀속하지 않으며 AAPL 근거 변경도 명시 | 없음 | REPORT §6, [deployed comparison](evidence/deployed-comparison.json) |
| P3-1 | showModal 직후 제목 또는 닫기에 명시적 초기 focus | **Q612 진행·검증 대기**. 기존 실제 UI smoke는 원문 링크 초기 focus를 기록한다. 기존 Escape/focus 복귀 성공은 초기 focus 수정 증거가 아님 | Q612 코드/브라우저 증거와 root 배포 확인 후 별도 후속 결과 기록. 옛 smoke JSON·스크린샷은 보존 | [BriefingCitations](../../src/components/BriefingCitations.tsx), [기존 UI smoke](evidence/deployed-ui-smoke.json) |
| P3-2 | 실제 사용자 수집 항목·동의 위치·보존기간·중복 규칙·3단계 UI·목표 표본을 표로 제안 | **계획 문서 반영**. trace/version/revision, 만족/보통/불만족·코멘트, 입력/제출 전 동의, 30/90일, trace/version별 최신1건, 목표30건을 표로 기록 | 없음. 권고는 계획 구체화이며 신규 사용자/투표를 만들어내거나 지금 동의·삭제 backend를 구현하라는 조건이 아님 | REPORT §7 “다음 실제 사용자 관찰 계획(미실행 제안)” 및 구현 범위 명시 |
| P3-3 | 구조화 export의 제목/URL 제외와 화면의 공개 헤드라인 노출 정책 구분 | **반영**. REPORT §6에 명시; Q613이 원격 검증 문서에도 같은 범위 설명 추가 | 없음 | REPORT §6, [deployed-live-verification](deployed-live-verification.md) |
| P3-4 | 평가 대상 Cloud Run을 Vercel preview와 구분; CLAUDE의 private 표기 선택적 정정 | **반영**. REPORT §6은 Cloud Run 대상 명시. Q613은 CLAUDE의 공개 상태를 Q611 확인일과 함께 정정 | 없음. PR 승인·병합 완료로 확대하지 않음 | REPORT §6, [CLAUDE.md](../../CLAUDE.md), final-review §5 PUBLIC 확인 |

## Astra 발견·남은 권고 대조

외부 운영 원문 경로는 provenance 식별자이며 제출 저장소 안의 링크가 아니다. 초기 “OPEN”은 발견 당시 상태로 보존하고 여기에서만 현재 상태를 판정한다.

| 발견 / 원 출처 | 최초 권고 | 현재 코드·증거 확인 | 필요한 조치 / 판정 |
| --- | --- | --- | --- |
| 일반 사용자 내용을 global eval flag로 synthetic 분류 — Q605-review HIGH | 검증된 사용자·별도 비밀·로컬 context로 capture 격리 | [evaluation-auth.ts](../../src/lib/briefing/evaluation-auth.ts)의 module-private Symbol, verified user, timingSafeEqual, HTTP loopback, Vercel 및 Cloud Run 차단; service의 isEvaluationContext와 private sink 연동. briefing-check 직접 PASS | **수정 확인**. 임의 배포 topology 전체를 검증한 것은 아니며 local eval은 loopback 격리 운영 유지 |
| asOf 누락/응답 시각 불일치 및 trace/conversation 재사용 허용 — Q605-review MEDIUM, Q604-reviewed | 명시적 frozen 시각과 독립 관찰 ID 검증 | [evaluate.mjs](../../tools/quest-evaluation/src/evaluate.mjs) compare에서 유효 asOf=response.asOf, unique UUID trace·conversation, distinct confirmed version 검사. 해당 회귀 테스트 직접 PASS | **수정 확인** |
| 401 등 운영 오류를 모델 품질 후보로 집계 — 같은 출처 MEDIUM | 운영 실패 별도 분모, malformed HTTP200은 품질 후보로 유지 | evaluate.mjs operationalFailure 및 quality filter/operational counts. 회귀 테스트 직접 PASS | **수정 확인** |
| trace 문자열·HTTPS prefix만 검사 — 같은 출처 LOW | UUID 및 credential-free URL parser 사용 | evaluate.mjs uuid/httpsUrl과 contract 검사; 회귀 테스트 직접 PASS | **수정 확인** |
| 실제 service 경로에 stage span 없음 — Q605-review MEDIUM 및 후속 해결 | 실제 시작/종료 경계와 generation usage를 SDK에 전달 | [service.ts](../../src/lib/briefing/service.ts) measuredStage/stageTimings, [observability.ts](../../src/lib/briefing/observability.ts) stages 전달 확인. 실제 service→bridge→SDK memory exporter 회귀 직접 PASS, 실패 generation usage·skip·replay no retrieval 포함 | **수정 확인**. Langfuse 원격 수집 성공으로 바꾸지 않음 |
| frozen evidence/asOf·end-to-end replay 부재 — Q602/Q604/Q606-reviewed | 독립 입력 capture와 실제 service loader/replay 제공 | [replay runner](../../tools/quest-evaluation/replay.mjs), [replay implementation](../../tools/quest-evaluation/src/replay.mjs), [공개 재현 안내](evidence/final-README.md), 실제 v1/v2/v6 source smoke 직접 PASS | **해소 확인**. smoke는 mock이며 실제 품질 재평가가 아님 |
| exact origin / auth callback canonical redirect — Q608-reviewed 및 submission-public-audit | Host/forwarded에 의존하지 않고 Cloud Run missing-origin fail closed; encoded next 거부 | [http.ts](../../src/lib/briefing/http.ts), [redirects.ts](../../src/lib/supabase/redirects.ts) 확인. origin40·callback43 검사 직접 PASS. 두 API는 authenticate/getUser 사용 | **수정 확인**. 기존 deployed 검증은 [deployment-verification](deployment-verification.md)에 별도 존재 |
| 피드백 접수·durability·발급버전 — run inbox 완료 기록, Q603 후속 공백 | 전송 성공과 저장 확정을 구분하고 서명된 version 사용 | feedback HMAC에 version·owner·trace·만료 결합; route가 verified.version 사용. stdout callback 대기, 202 accepted/unverified 또는 양 sink 실패503; delivery matrix 직접 PASS. 기존 Cloud Logging read-back1건은 별도 증거 | **수정 확인**. 운영자 테스트는 실제 사용자 numeric vote가 아님 |
| 선언 인용/타 ticker smuggling·보류 품질 혼동 — run inbox v3 통합보완 기록 | 선언·본문·근거 ticker 상호검증, 보류를 자동 품질 성공으로 세지 않음 | service.ts sourceIds 및 본문 citations가 서로 선언·ticker 검사를 거침. evaluate.mjs insufficient_evidence manual abstention_appropriateness 및 pending 유지 | **현재 소스 확인**. 이 항목의 v3 전용 검사는 Q613에서 재실행하지 않았으며 final-validation의 기존 통과와 구분 |
| 공개 문서 사용자 TEMP 절대경로 — submission-public-audit | 논리 evidence identifier로 치환 | deployment-verification에 quest06-v6-release-verification 등 논리 식별자. [publication-verification](publication-verification.md)의 exact-index 경로 검사 기록 | **정리 반영**. Q613은 비밀 exact-value scan을 재실행하지 않음 |
| private/raw ignore 공백·일회성 배포 scripts·env 예제 stale — 같은 감사 | 전역 private/raw 제외 또는 엄격 allowlist; one-off 제외; Anthropic/origin/안전 flags 예제 | [.gitignore](../../.gitignore)의 nested private/raw 및 4개 one-off 경로 제외, 직접 check-ignore 확인. [.env.briefing.example](../../.env.briefing.example)의 blank key·Anthropic·exact origin·false capture 확인 | **반영 확인**. 새 제출 변경도 root의 exact staged allowlist/content 검사 필요 |
| 공개 재현 source/fixture 부족·이동 source로 historical export 재생 실패 — 같은 감사 및 submission-gap-audit | 과거 frozen source/입력/판정 제공, 실패 이력 보존 | final README와 공개 v1/v2 각14개 소스, 입력10·응답20·rubric/판정. --verify-public 41파일 hash·금지 필드 PASS, --smoke-public 3버전 PASS | **해소 확인**. native 전체 공개·동일 모델 답변 재생은 보장하지 않음 |
| 신규 tooling lint와 기존 production lint — final-validation | 실패를 숨기지 말고 정리 후 검증 | 초기55/8→도구 정리5/0→export 추가5/1의 각 시점이 보존됨. 전체 잔존5+1은 Q612 담당 | **후속 결과 대기**. P1-1과 동일 작업이며 중복 결함으로 합산하지 않음 |
| 18 dependency findings를 모두 inherited로 단정 — Q605 dependency attribution, Q601-reviewed, submission-public-audit | attribution 정정 및 현재 dependency/advisory 검토 | **후속 실제 감사·로컬 수정 완료**: 2026-11-09 current/baseline7ab330a의 전체 취약점 객체 및 영향20노드 버전 일치, 당시 현재 full18·prod6 확인. 승인 후 Next/config16.4.5·호환 transitive 갱신 및 estree 한정 minimatch11.0.1 override, 최종 full0·prod0, clean npm ci/lint0/typecheck/평가25/TS·TSX 호환/보안 검사 PASS | [dependency-review](dependency-review.md)와 [전후 audit JSON](evidence/dependency-audit.json)에 실제 시각·전체 경로·수정 버전·검증 보존. 과거 설치18 기록은 유지하며 오늘 DB 기준 inherited임을 확인한 것. inference14파일 불변이나 runtime dependency 변경이므로 새 build/배포/실측은 root 후속 |
| process-local rate limit·cold start/memory·수평 확장 — Q605 negative findings 및 submission-public-audit | 확장 운영 전 shared/edge limits와 런타임 비용 검증 | [guards.ts](../../src/lib/briefing/guards.ts)는 process-local, BRIEFING은 한계 명시. 배포 기록은 maxScale1·512Mi 설정이지 부하/메모리 실측 결과가 아님 | **운영 후속 한계 유지**. 일반 공개 확장 전 점검 권고이며 이번 소표본 제출 완료 증거로 꾸미지 않음 |
| 당시 실제 호출·후보·배포·remote join·PR 부재 — Q601~Q610 중간 기록, submission-gap-audit | 실제 실행 및 출처별 증빙, 실패 게이트 보존 | REPORT의 로컬183서비스171모델, 원격3+3+UI1, trace joins, v2~v5 FAIL/v6 PASS, PR7와 Q611 독립 검토를 대응 문서에 연결. [release decision](evidence/final-gate.json)과 [publication verification](publication-verification.md) 존재 | **후속 증거로 해소**. 과거 미완료·실패 문장은 당시 기록으로 유지. 클라우드/모델 재실행은 Q613이 하지 않음 |

## Q613 직접 재검증

2026-11-09 UTC 05:11~05:12의 현재 작업 트리에서 아래만 실행했다. Q612가 별도로 작업 중이므로 이 결과를 최종 코드 전체 검증으로 확장하지 않는다.

| 명령 | 관측 결과 |
| --- | --- |
| `node scripts/briefing-check.cjs` | provider 안전·ordinary/eval isolation·입력/body/HMAC/rate 검사 PASS |
| `node scripts/cloud-run/origin-check.cjs` | 40 origin cases PASS |
| `node scripts/cloud-run/auth-redirect-check.cjs` | 43 callback cases PASS; OTP mock |
| `node scripts/briefing-telemetry-check.cjs` | service→bridge→SDK memory spans PASS; content/network 없음 |
| `node scripts/briefing-feedback-delivery-check.cjs` | 발급 version·delivery matrix·route202/503/404 PASS; vote/network 없음 |
| `node --test tools/quest-evaluation/test/review-regressions.test.mjs` | 세 발견 회귀 테스트 3/3 PASS |
| `node tools/quest-evaluation/live/q604-final-export.mjs --verify-public` | 공개41파일·입력10·응답20·과거소스28 hash/금지필드/credential pattern PASS |
| 같은 exporter `--smoke-public` | 3 source versions·3 mocked fetches, actual network/model0, PASS |
| `git check-ignore private/test.json raw/test.json src/private/test.json scripts/cloud-run/deploy-baseline.mjs` | 네 경로 모두 ignored |

전체 lint·전체25테스트·typecheck·빌드·dependency audit·원격 ingress·최신 deployment를 Q613이 재실행했다고 주장하지 않는다. 기존 final-validation과 Q611 결과는 해당 작성자의 시점별 증거다.

## 남은 조치와 사용자 전용 행동

초기 대조 시점의 Q612 검증 대기는 위 표에 보존한다. 후속 dependency 작업은 Q612 완료 통지 후 수행했으며 갱신 의존성에서 전체 lint0·typecheck·review-ui 및 관련 회귀가 통과했다([후속 검증](dependency-review.md)). 남은 것은 root의 **최종 변경 공개 검사·새 build/배포·실측 결과에 맞춘 REPORT/검토 교정표/웹페이지 갱신**이다. dependency/advisory 정밀 검토는 현재 full/prod audit0으로 로컬 조치 완료했으며, 별도 확장 운영 검증은 원 감사의 운영 후속으로 유지한다.

작은 합성 표본, 사람 numeric vote0, 별도 AI 평가, 단일 차폐, Langfuse 미사용은 정직한 방법론적 한계다. 이를 닫기 위해 사용자·투표·호출을 만들어내지 않는다. P3-2 계획 문서 완료에는 새 사용자 행동이 필요하지 않으며 이번 검토 반영을 위해 사용자가 직접 해야만 하는 미완료 조치는 확인되지 않았다. 향후 실제 자발적 동의·평가는 당사자만 제공할 수 있지만 이번 제출의 요구 증거로 소급하지 않는다.


## 운영 실측 후속 — Q614

[runtime-review.md](runtime-review.md)와 [안전한 실측 JSON](evidence/runtime-review.json)에 기존 v6-ui 배포본의 메모리79관측·시작3건·인스턴스2 관측을 기록했다. 평균 메모리27.694%, startup 평균1073.265ms이며 새 의존성/최종 수정본의 성능 인증은 아니다. 현재 정책은 인증된 사용자 대상 process/module별 best-effort 보호이며 strict global 요청/비용 상한은 약속하지 않는다. BRIEFING의 수평 확장 때만 공유 제한이 필요하다는 표현을 정정했다. provider spend cap은 확인하지 않았고, hard global 정책이 필요해지면 현재 max1에서도 shared atomic 제한이 필요하다. 운영 점검 권고 자체는 실측으로 완료했으며 제한의 한계를 숨기지 않는다.
