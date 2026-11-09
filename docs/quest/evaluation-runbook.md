# AI 브리핑 평가 실행 안내

이 문서는 평가 도구의 실행 계약이다. 아래 live 명령은 향후 승인된 실행용 예시이며 이번 작업에서 실행하지 않았다. 모든 명령은 저장소의 `tools/quest-evaluation`에서 실행한다. Node 20 이상이며 npm 설치가 필요 없다.

```powershell
node --test
node smoke.mjs
node src/cli.mjs collect --version briefing-v1
```

마지막 명령은 네트워크 없는 dry-run이다. `smoke.mjs`의 모든 응답은 합성이고 `private/smoke-*` 아래에만 저장된다.

## 최소 설정

1. 앱의 `.env.briefing.example`과 `BRIEFING.md`를 따라 Supabase 인증, 공개 피드, 모델을 서버 환경에 설정한다. 제공자 secret과 모델명은 로그나 명령 인수에 쓰지 않는다. 로컬 앱은 localhost에만 바인딩한다.
2. 별도 공개·합성 평가 입력용 계정만 사용한다. 서버에 `BRIEFING_EVAL_MODE=true`, `BRIEFING_EVAL_USER_ID`(허용 계정), 최소 32문자의 `BRIEFING_EVAL_REQUEST_TOKEN`, 저장소 루트 `.briefing-eval`의 절대경로인 `BRIEFING_EVAL_SNAPSHOT_DIR`를 설정한다. `VERCEL` 및 `VERCEL_ENV`가 있으면 평가 인증은 비활성이다. 전역 플래그만으로 일반 사용자 입력을 합성 자료로 분류하지 않는다.
3. collector 환경에는 완전한 loopback HTTP `/api/briefing` URL인 `BRIEFING_EVAL_ENDPOINT`, 유효한 `BRIEFING_EVAL_COOKIE`, 서버와 같은 `BRIEFING_EVAL_REQUEST_TOKEN`을 비밀 환경변수로 설정한다. cookie 인증은 계속 필요하다. token은 `--local-eval`을 명시한 loopback HTTP에서만 `x-briefing-eval-token`으로 전송된다. 배포·비로컬·HTTPS endpoint에는 이 옵션을 사용하지 않는다.
4. 선택적인 가공 trace에는 `BRIEFING_TRACE_CONTENT=true`와 `LANGFUSE_CAPTURE_CONTENT=true` 및 Langfuse 설정이 필요하다. 원본 sink는 이 가공 trace와 별개다. trace의 제목 축약·URL origin 변환·마스킹 때문에 원본과 동일하다고 간주할 수 없다.
5. 실제 요청 전에 예산·승인·요청 수·version을 확인하고 데이터셋과 기준을 고정한다. 질문에 개인정보·자산 내역을 넣지 않는다. `private/requests.json`은 `{id, split, inputOrigin: "synthetic", request: {ticker, question?}}` 객체 배열이다. 현재 평가 sink의 inputOrigin은 synthetic으로 고정되어 있어 real 입력을 이 경로로 잘못 분류하지 않는다.

## 원본 사전 근거 수집과 결합

```powershell
node src/cli.mjs collect --live --local-eval --allow-local-http --version briefing-v1 --cases private/requests.json --limit 3 --out private/baseline-http
node src/cli.mjs join --input private/baseline-http --evidence ../../.briefing-eval --out private/baseline-frozen
node src/cli.mjs report --input private/baseline-frozen
```

collector는 `{ticker,question?}`만 보내며 fixture evidence를 HTTP 요청에 주입하지 않는다. 매번 새 stateless 요청이고 대화 이력을 보내지 않는다. 최대 3회가 기본, `--limit`은 1–10, 순차 요청 사이 13초, 30초 timeout, 1MiB 응답 상한, redirect·retry 없음, 401/403/429에서 중단한다. 실패 요청도 원본 collector 저장소에 유지한다. join이 실패한 요청을 몰래 제외해 전체 성공률을 부풀리지 않는다. 혼합 실패 run은 먼저 원본 `report`를 보존하고, 분리할 경우 제외 건수와 이유를 보고한다.

서버는 모델 호출 전 다음 내용을 배타적 신규 파일로 저장한다. 1000개·파일당 32KiB 한도이며 저장 실패 시 생성을 중단한다. 이 파일은 아직 완성된 평가 observation이 아니다.

```json
{
  "schema": "briefing-evidence-v1",
  "traceId": "실제 UUID",
  "inputOrigin": "synthetic",
  "evidenceOrigin": "independent-input",
  "request": {"ticker": "AAPL", "question": "실제 평가 질문"},
  "asOf": "실제 생성 전 ISO 시각",
  "evidence": [{"id": "실제 ID", "title": "정확한 모델 입력 제목", "url": null, "publishedAt": null, "kind": "news", "ticker": "원본 피드 종목"}]
}
```

`join`은 무결성 검증된 collector snapshots를 읽고 UUID 파일을 찾는다. traceId, 정규화한 질문, ticker, asOf, inputOrigin, 기대/응답 version 및 오류 여부를 검증한다. 원본을 수정하지 않고 새 내용 주소형 snapshot에 근거를 추가한다. 공개 원문 전체가 아니라 **모델에 실제 전달된 정규화 근거**가 비교 기준이다. 요청 종목을 원본이 불명확한 evidence ticker에 덧씌우면 혼입을 숨기므로 금지한다. ticker가 없으면 pending이다.

다른 신뢰된 내부 harness를 이용하면 다음 envelope를 `snapshot --input private/import.json --out private/baseline-frozen`으로 가져온다. 예시는 설명용이며 관찰 기록이 아니다.

```js
{
  schema: 'quest-observation-v1',
  provenance: 'observed', // 실제 API/모델 응답일 때만; 만들어 낸 응답은 synthetic
  inputOrigin: 'synthetic', // 공개 평가 입력 분류; 응답 실측 여부와 별개
  caseId: '고정 사례 및 반복 ID', split: 'development',
  request: { ticker: 'AAPL', question: '실제 질문' },
  expectedVersion: '실제 기대 서버 버전',
  freshConversation: true, conversationId: '실행마다 다른 ID',
  evidenceOrigin: 'independent-input', evidence: [], // 정확한 사전 근거
  asOf: '실제 고정 ISO 시각',
  response: {} // 수정하지 않은 전체 실제 API JSON
}
```

## 같은 입력으로 전후 비교

`generateBriefingFromEvidence` is a server-only replay hook, with no HTTP replay endpoint. The Q606 local runner below sends identical request/evidence/asOf to two supplied real implementations and allocates fresh trace/conversation IDs. Response versions come from each artifact's `types.ts` VERSION; changing a CLI label or environment value cannot establish a new implementation.

```powershell
node src/cli.mjs snapshot --input private/candidate-import.json --out private/candidate-frozen
node src/cli.mjs compare --baseline private/baseline-frozen --candidate private/candidate-frozen
```

같은 caseId/request/evidence/asOf/split만 pair가 된다. 반복 사례는 caseId를 반복별 고유하게 하고 두 버전에 동일 적용한다. provenance와 독립 근거 요건, 서로 다른 확인된 version이 필요하다. `compare`는 모든 observed record에 유효하고 서로 다른 trace UUID와 conversationId를 요구하고, 명시적 asOf가 응답과 같은지 검사한다. 이 검사는 ID 재사용을 막지만 서버 대화 격리를 독립 증명하지 않으므로 실행자도 세션을 확인한다. fixture의 held-out 3개는 평가기 개발자가 이미 내용을 볼 수 있는 공개 합성 자료이며 실제 제품용 비공개 held-out을 대신하지 않는다.

## 보관과 공개

정확한 질문·응답·원본 traceId는 tools의 `private/` 또는 앱의 `.briefing-eval/`에만 둔다. `git check-ignore`로 실제 저장 위치를 확인한다. 환경 secret·cookie·헤더는 저장하거나 출력하지 않는다. 예상하지 못한 서버 응답에 민감한 값이 포함될 수 있으므로 raw snapshot 자체는 항상 비공개다. SHA-256 무결성은 원본 출처의 진실성을 보증하지 않는다. Windows 접근권한·암호화·보존기간은 호스트에서 관리한다.

`report`의 집계와 해시 trace 참조만 검토 후 공개한다. 실제와 합성 snapshot 디렉터리를 섞지 않는다. 성공/실패/pending·전체 분모·미결합 수·수동 판정·지연/사용량 미측정을 함께 남긴다. 배포 검증은 별도 URL과 배포 ID, 새 인증 세션 및 응답 version을 기록하며 로컬 비밀 토큰은 전송하지 않는다.

## Q606 local frozen replay runner (2026-11-09)

`replay.mjs` now calls the actual supplied `service.ts` export `generateBriefingFromEvidence`. It does not call HTTP, retrieve a feed, create an evaluation authorization context, load cookies, or enable tracing/sinks. Production `server-only` and evaluation authorization remain unchanged. A CLI-only TypeScript loader resolves sibling briefing modules and replaces the unused feed import with a throwing guard. Only trusted local application sources are supported; this loader is not a security sandbox for arbitrary code. Install the application's locked dependencies first (`npm ci` at repository root); the loader uses the existing TypeScript dependency.

Supply two local `service.ts` paths, each beside its original `types.ts`, `evaluation.ts`, `evaluation-auth.ts`, and `guards.ts`. Both exported VERSION values and service implementation hashes must differ. Responses must confirm their exported version, frozen asOf, exact evidence, and newly generated trace identity. A copied version label alone is rejected. Source hashes establish distinct source, not that a useful fix exists: review the diff and select the actual defect from observed logs before preparing a candidate. No candidate product version was fabricated for this task.

To preserve the baseline before editing, from repository root:

```powershell
New-Item -ItemType Directory -Force tools/quest-evaluation/private/versions | Out-Null
Copy-Item -Recurse src/lib/briefing tools/quest-evaluation/private/versions/baseline
```

After a real defect has been selected, implemented and versioned, save its complete briefing directory as `private/versions/candidate` the same way. Alternatively provide paths in already available local version directories. The runner does not create Git checkouts, alter source, or set VERSION. Keep the reviewed source revision/diff with the private artifacts. Sources with new unsupported imports fail closed; update the loader deliberately if a future real implementation needs them.

From `tools/quest-evaluation`:

```powershell
node --test
# No credentials needed; validates both versions and frozen cases, zero provider calls:
node replay.mjs --baseline private/versions/baseline/service.ts --candidate private/versions/candidate/service.ts --cases fixtures/cases.json --limit 3
# Later, explicitly authorized real execution only (NOT executed in Q606):
# Set BRIEFING_LLM_API_KEY and BRIEFING_LLM_MODEL through your private environment.
# Optional BRIEFING_LLM_BASE_URL must satisfy the actual service's HTTPS policy.
node replay.mjs --live --baseline private/versions/baseline/service.ts --candidate private/versions/candidate/service.ts --cases private/frozen-cases.json --limit 3 --out private/replay-001
node src/cli.mjs report --input private/replay-001/baseline
node src/cli.mjs report --input private/replay-001/candidate
node src/cli.mjs compare --baseline private/replay-001/baseline --candidate private/replay-001/candidate
```

Frozen cases use the existing `fixtures/cases.json` shape: unique id, split (`development` or `held-out`), `inputOrigin: synthetic`, request with explicit ticker/question, ISO asOf, and independent evidence (maximum 12). For captured observations, map caseId to id and retain exact request/evidence/asOf/split; never derive evidence from response.sources. Keep custom inputs under private/. Both versions receive identical JSON clones; each invocation has a distinct UUID trace and conversation identity, and no dialogue history. Evidence mismatch fails rather than silently truncating or normalizing input.

Default limit is 3 pairs (at most 6 provider calls); maximum is 10 pairs (20 calls). Execution is sequential, with no retries, and stops on the first failed generation, mismatch, or secret echo. The current real service caps each request at 1000 completion tokens, 15 seconds and 64 KiB. An empty-evidence case makes no provider call. Failure snapshots remain in the denominator and comparison stays pending; CLI failure exits nonzero. Each run needs a new empty directory inside the git-ignored private directory. Known environment credential values are excluded from persisted responses; error details, environment, headers and cookies are never serialized. Snapshots and usage counts remain private, not committed. OS ACLs, retention and encryption remain the operator's responsibility.

The programmatic `mock` option exists only for integration tests and marks every saved row synthetic; the CLI has no mock flag. Tests execute the actual service with a mocked provider and a temporary test-only prompt variant, then delete artifacts. These tests are not real LLM evidence, a selected product fix, or improvement measurements. Real response collection, meaningful two-version comparison, manual review and rubric evidence remain pending.
