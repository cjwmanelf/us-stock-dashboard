# 최종 공개 평가 증거와 오프라인 재현

이 폴더의 `final-*`는 제출 저장소만으로 입력·판정 기준·실제 최종 답변·기준 코드를 확인하기 위한 안전한 공개 자료다. **모든 제목·수치·질문은 합성 평가 입력이며 실제 시장정보가 아니다.** 실제 모델 실행의 최종 서비스 답변을 공개했지만 native 응답·thinking·signature·헤더·인증 token·사용자 ID·키는 공개하지 않았다. `inputTokens`/`outputTokens`는 숫자형 사용량이며 인증 token이 아니다.

## 파일과 분모

| 파일 | 내용 |
|---|---|
| final-q606-cases.json | 최종 Q606 독립 합성10사례, 정상5·문제5 |
| final-q606-rubrics.json / final-q606-protocol.json | 실행 전에 고정된 의미 rubric·gate·작성 독립성·라벨 차폐 절차 |
| final-v6-responses.json | Q60610사례 × v2/v6 각1회 = **총20개** 실제 최종 generated.result와 안전한 사용량·지연·trace 연결 |
| final-blind-review.json | 버전 라벨 공개 전에 저장한20개 판정, 후속 공개 mapping, 원본 판정 hash |
| final-gate.json | v2 8/10 → v6 10/10, 중대0·정상회귀0의 최종 합성 gate PASS |
| final-consumed-q604-cases.json / rubrics.json / protocol.json | v5에서 이미 소비된 이전10사례의 입력·기준만 공개; 최종 Q606셋과 분리 |
| final-original-hashes.json | 두 비공개 원본 manifest 및 입력/rubric/protocol 파일의 원래 byte hash |
| final-source-manifests.json | 과거 v1·v2 코드별 hash와 현재 v6 평가 service hash |
| final-export-manifest.json | 공개 JSON 및 과거 소스 파일들의 byte hash |

이미 공개된 `q610-synthetic-cases.json`의 초기30개와 위 두 셋은 별개다. 기존 데이터, 재사용한 baseline, pilot, 실제 배포 smoke를 한 분모에 중복 합산하지 않는다. 이전 q604셋의 응답/점수 근거는 [v5 hold-out CSV](../q604-v5-holdout-evidence.csv)와 [v5 보고서](../v5-live-evaluation.md)에 있다. 이번 최종 Q606 응답은 [v6 보고서](../v6-live-evaluation.md)의 hold-out 부분이며 개발20 답변은 이20개에 포함되지 않는다.

입력은 `cases[].id`, 응답은 `records[].caseId`와 `label`, 판정은 같은 caseId/label/traceId로 연결한다. 답변 안 source ID는 해당 입력 evidence의 id로 검토한다. blindId는 무작위 검토 식별자이며 개인 사용자 ID가 아니다. 판정은 독립 AI 분석자 주석이지 실제 사용자 feedback이 아니다. 라벨은 채점 후 연결했지만 문체로 버전을 추측할 가능성까지 제거한 이중맹검은 아니다.

## 과거 코드의 정확한 범위

`tools/quest-evaluation/versions/v1/`과 `v2/`에는 해당 원본 manifest가 열거한 `.ts` **각14개**를 정확한 bytes로 복사했다. 공개 manifest의 파일별 SHA-256은 원본과 동일하다. v1은 `briefing-v1`, v2는 `briefing-v2-anthropic-text` 평가 당시 코드다. **현재 production 구현이 아니며 앱이 import하지 않는 오프라인 증거**다. 원래 artifact hash는 원래 경로 접두어까지 포함한 방식으로 계산됐으므로 공개 디렉터리 이름을 바꿔 단순 재계산한 값과 비교하지 말고 파일별 hash로 확인한다.

v6는 현재 `src/lib/briefing/service.ts`가 평가본 hash `2215a3872265b4770aa4f3a3812d687643b30b0edaae674d07487af19506a970`과 일치한다. 이후 UI/feedback 수정과 모델 service 동일성을 구분한다. 버전 라벨만으로 소스 동일성을 판단하지 않는다.

`.gcloudignore`와 `.dockerignore`는 모두 기본 전체제외(`**`) 후 src/public 및 필수 build 입력만 허용한다. tools/docs 허용 예외가 없어 과거 baseline 코드와 본 증거는 배포 build context에 들어가지 않는다. 이번 작업은 ignore 파일을 변경하지 않았다. src/package/Next 설정에 public versions import가 없음을 검색 확인했다.

## 저장소만으로 무료 확인

저장소 루트에서 Node20 이상을 사용한다. 첫 명령은 Node 기본 모듈만 쓰며 private 디렉터리·키·네트워크가 필요 없다.

```powershell
node tools/quest-evaluation/live/q604-final-export.mjs --verify-public
```

실제 과거 코드와 현재 service를 loader에 연결하는 **모의** 오프라인 확인은 다음과 같다. 저장소 dependency가 없다면 먼저 `npm ci`가 필요하다. dependency 설치는 패키지 다운로드이며 모델 호출이 아니다.

```powershell
node tools/quest-evaluation/live/q604-final-export.mjs --smoke-public
```

v1/v2/v6 각1회에 명시적 mock fetch를 제공하여 버전·asOf·최종 계약을 확인한다. 총3 mock fetch, 실제 네트워크0·모델0이다. 합성 mock 결과를 기존 실제20답변의 품질 증거로 세지 않는다.

## 공개 입력으로 replay 계획 확인

기존 replay CLI는 wrapper가 아닌 배열을 받으므로 공개 입력의 cases 배열을 새로운 ignored private 파일로 변환한다. 값은 변경하지 않는다.

```powershell
node -e "const fs=require('node:fs');fs.mkdirSync('tools/quest-evaluation/private/reviewer',{recursive:true});const x=JSON.parse(fs.readFileSync('docs/quest/evidence/final-q606-cases.json','utf8'));fs.writeFileSync('tools/quest-evaluation/private/reviewer/cases.json',JSON.stringify(x.cases),{flag:'wx'});"
node tools/quest-evaluation/replay.mjs --baseline tools/quest-evaluation/versions/v2/service.ts --candidate src/lib/briefing/service.ts --cases tools/quest-evaluation/private/reviewer/cases.json --out tools/quest-evaluation/private/reviewer/new-run --limit 10
```

마지막 명령은 기본 dry-run으로 **모델 호출0**, 최대20호출의 계획과 서로 다른 실제 버전을 확인한다. `wx` 또는 새 디렉터리 제한에 걸리면 기존 결과를 덮지 말고 새 경로를 쓴다. 현재 코드 hash가 바뀌면 원래 평가와 다른 실행이므로 그 사실을 먼저 기록해야 한다.

실제 추가 호출을 원하는 별도 검토자는 서버용 환경 `BRIEFING_LLM_PROVIDER=anthropic`, `BRIEFING_LLM_MODEL=claude-haiku-5-5`, `ANTHROPIC_API_KEY`를 안전한 비밀 환경변수로 주입해야 한다. 키를 CLI 인수나 JSON에 쓰지 않는다. `--live`를 추가하면 비용이 발생하며, 처음에는 `--limit 1` 등 명시한 예산으로 시작한다. **이 제출 마감에서는 live를 실행하지 않았다.** 기존 replay CLI는 generation/계약 실패 시 중단하므로 과거 실패까지 끝까지 보존한 전용 q604 실행과 완료 건수가 다를 수 있다. partial run을 원래20응답과 동일한 분모로 주장하지 않는다.

같은 입력·모델·소스를 재실행해도 모델의 응답은 달라질 수 있다. 원래 관찰을 확인하려면 이 공개 최종응답과 trace·hash를 사용하고, 새 live 실행은 별도의 run으로 기록한다. 자동 메타데이터 검사는 의미 rubric을 대체하지 않는다.

## 원본과 공개 변환

입력/최종응답은 필드 allowlist를 통해 JSON으로 재직렬화했으므로 공개 byte hash는 원본과 다를 수 있다. 원본 hash는 `final-original-hashes.json`, 공개 hash는 `final-export-manifest.json`에 각각 있다. 의미 필드는 그대로이며 과거 q604 protocol의 문서용 `authorization` 문장은 HTTP header와 혼동되지 않도록 **executionPermissionNote로 키만 변경**했다. 문장과 gate는 바꾸지 않았다. protocol의 not-run은 동결 당시 상태이지 지금의 실행 상태가 아니다. 두 hold-out 모두 현재는 사용 완료된 자료다.

기존 private 원형·rubric·점수·판정은 수정하지 않았다. native raw body는 제출물에서 의도적으로 제외되어 이 공개 자료만으로 provider 내부 thinking이나 원시 전송을 재검사할 수는 없다. 대신 최종 서비스 답변의 입력 부합·의미 판정과 과거 코드의 재현을 지원한다. secret 검사는 고위험 credential 패턴 및 구조적 필드 제한이며 모든 가능한 정보 누출의 수학적 증명은 아니다.
