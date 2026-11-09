# Q610 v2 paired evaluation — release gate FAILED

## Final decision, 2026-11-09

The authorized single adapter fix removed the selected thinking-block compatibility failure, but **v2 failed the predeclared release gate: held-out final-answer quality is8/10, below9/10**. Do not equate HTTP200 or JSON acceptance with answer correctness. The coordinator confirmed the failure decision. Source and all held-out inputs/results are frozen; no tuning or extra calls followed this result. Deployment/build readiness is separate from release approval.

| Set/version | Service cases | Provider calls | Final status ok | Analyst task-quality pass | Chosen compatibility failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development baseline v1 | 20 | 19 | 0/20 | 1/20 | 19/19 model calls |
| Development candidate v2 | 20 | 19 | 17/20 | 17/20 | 0/19 model calls |
| Held-out baseline v1 | 10 | 10 | 0/10 | 0/10 | 10/10 model calls |
| Held-out candidate v2 | 10 | 10 | 9/10 | **8/10** | 0/10 model calls |

Development quality and service-success counts happen to both be17, but cover different cases: q610-12 is correct empty-evidence abstention despite unavailable status; q610-18 is accepted yet has a temporal error. All58 actual provider calls across both phases returned200/end_turn; no operational failure or timeout. Total60 service invocations includes two no-evidence/no-provider calls. The follow-up allocation used exactly40 new service invocations /39 new provider calls. This worker made no Vertex calls.

## The one implementation change and verification

`anthropic-provider.ts` now ignores only recognized thinking/redacted_thinking metadata and concatenates text blocks in order, requiring nonempty text. Tool/unknown/refusal blocks, explicit refusal, non-end_turn termination, truncation and no-text responses remain rejected. VERSION in `types.ts` is **briefing-v2-anthropic-text**. Prompt, model, service.ts, JSON/citation checks,1000-token output cap and15-second timeout are unchanged.

Frozen candidate: `tools/quest-evaluation/private/q610-candidate/candidate/`; artifact SHA-256 **61f76983786f448e6cb55c7301d43dc9078632a12d64089e32d60714cdfe547d**. Frozen baseline artifact is **45eb6a4395594565486f95e841fb6082c3dd7414585b07da9abc7ae362087ba1**, version briefing-v1. Service.ts-only implementation hash remains **b510bd93e04b9a6a1038fa816585ce25e8d5e800d013c68497d52c989c508bd4** in both: the actual implementation difference is the imported adapter and VERSION, verified by full source manifests. The legacy paired runner's service-only distinctness check would miss this valid adapter change, so the dedicated live runner verifies full artifacts rather than fabricating a service edit.

Offline actual-body replay:19/19 captured baseline bodies processed, **17ok /2 unchanged downstream failures** (q610-10 code fence, q610-15 empty citations). This is offline replay, not19 additional paid calls. Regression checks cover recognized metadata interspersed between text fragments, text ordering, unknown/tool/refusal/no-text, truncation, bounded responses, unchanged prompt/headers, and citation checks. Existing evaluator suite passes25/25; the hardcoded baseline-version replacement in its test setup was made version-independent after the first run exposed that assumption. Modified application TypeScript files pass ESLint. No production service or prompt change was needed to fix that test.

Candidate development20 was completed and manually reviewed first. Chosen failure fell19→0 with no new critical semantic failure; the development progression decision was saved privately **before** held-out requests. The separate held-out10 then ran once per version, with no retries or result-driven editing. All30 pairs were verified for identical request/evidence/asOf and exact native request bodies, distinct versions/artifact hashes, unique trace/conversation IDs, matching returned identities and unchanged source hashes.

## Manual outcome details (assistant analyst, not user feedback)

- Development q610-09: JSON sourceIds lists the correct source, but answer omits bracket citation; unchanged validator correctly produces fallback. This is a new sampled downstream formatting failure, not a new unsafe factual answer and not a recurrence of the selected extraction bug.
- Development q610-15 and held-out q610-29: correct raw irrelevant-ticker abstention with empty sourceIds is rejected; final UI receives generic fallback, so task quality fails. Raw reasonableness does not count as a successful delivered answer.
- Development q610-18: accepted answer still incorrectly requires today's news to be published after asOf; this already existed in baseline raw text.
- **Held-out q610-30:** candidate says “제공된 근거는 2026-12-01 실적 발표 예정 항목이며 EPS 예상치 $1.30만 담고 있습니다 [synthetic-future].” The input title says only a Q4 scheduled announcement and estimated EPS;2026-12-01 appears solely in publishedAt. Treating it as the scheduled announcement date is unsupported. Correct refusal to confirm actual EPS does not erase this temporal error. Baseline raw text contains the same kind of error; candidate extraction now exposes it, so full final-answer quality fails.
- Held-out q610-28: refusal/figures are supported; “발표된” timestamp wording is a minor metadata caveat, recorded rather than hidden, but unlike q610-30 it does not assert an unsupported future schedule in response to the timing question. Held-out q610-23 appropriately calls the date a label and denies confirmation of actual schedule. Remaining candidate answers were checked against exact supplied titles/tickers/dates for unsupported quantities, source IDs, unsafe directions and fabricated body-reading claims.

Two held-out failures mean8/10, independent of whether the date error is additionally classified critical. No post hoc lowering of the9/10 gate. All evidence is synthetic and clearly labeled, with actual observed model responses; real market-feed behavior remains untested. **Real end-user feedback remains0**; requests for feedback are not votes. One sample per case/version is insufficient to isolate all stochastic differences: the controlled offline replay is the stronger evidence for the adapter-specific benefit, while live pairs show actual end-to-end residual failures.

## Safe public evidence and reproducibility

Exports were made only after held-out evaluation finished. They contain no raw native bodies, reasoning/signatures, authorization headers or secret values:

- [Per-case comparison JSON](evidence/q610-comparison.json):60 allowlisted observation rows plus30 pair references and totals.
- [Per-case comparison CSV](evidence/q610-comparison.csv): case/split/group/version, actual trace and conversation IDs, timestamps, status, chosen failure, analyst quality reason, latency, token usage and token-priced estimate.
- [Frozen synthetic inputs](evidence/q610-synthetic-cases.json): exact questions/evidence/asOf, with synthetic provenance; no real user conversations.
- [Source manifests](evidence/q610-source-manifests.json): baseline/candidate source hashes and snapshot times.
- [Export SHA-256 values](evidence/q610-export-hashes.json): integrity checks, not proof of external authenticity.

Public trace IDs are intentionally exported for audit joins under the coordinator's explicit request; they grant no access to raw/private records. Raw originals and request IDs remain in the ignored private directories. Candidate and new baseline-heldout records are `private/q610-candidate/{candidate,baseline}-q610-NN.json`; attempt markers are preserved. Offline replay and development progression decision are separate files. The export verifies pairing, trace uniqueness, source immutability and key-free field selection; it never exports native reasoning. Reproduction requires authorized credentials and explicit new budget, not rerunning paid cases silently.

## Measured cost and latency

All60 service invocations /58 provider calls together: **28846 input tokens,25812 output tokens**, including **13429 thinking tokens as a subset**, zero cache creation/read tokens. At the verified official rates below, cumulative token-priced estimate is **$0.0157906**, comfortably below$1; the follow-up adds$0.0105007. These are estimates, **not billed cost**. Reasoning is not double-counted; missing usage was not assumed zero for a paid call.

Median model-backed service durations: development baseline2514ms vs candidate2754ms; held-out baseline2361ms vs candidate2141.5ms. Overall group min/max are in the JSON. These single sequential samples do not establish a speed gain, and no such claim is made.

## What remains

v2 experiment and evidence are complete, **release failed**. Keep v2 immutable. Any v3 output-contract/date work must use existing development evidence and a new independent hold-out set, under a new task; do not tune against these held-out outcomes. Coordinator owns REPORT, release/deployment and further allocation. This worker made no cloud or Git mutations.

---

# Historical Anthropic baseline analysis (before approved v2 edit)

The following records the original baseline phase; its no-candidate/no-app-change statements describe that earlier point in time and are superseded by the completed v2 experiment above.

## Live results — 2026-11-09 (supersedes historical offline status below)

**20 actual service invocations, 19 actual Anthropic requests, 19 HTTP 200 responses, zero transport/auth/billing/quota failures.** The empty-evidence case correctly made no model call. All 20 final service responses were `unavailable`: 19 observed adapter failures and one expected empty-evidence abstention. This is not a 100% model-quality failure rate. No app changes or candidate implementation were made by this worker.

The actual frozen `generateBriefingFromEvidence` ran through the existing loader, using `anthropic`, `claude-haiku-5-5`, Messages API `2023-06-01`, unchanged 1000-output-token cap and 15-second timeout, sequentially without retries. The coordinator received the first-three failure report and explicitly approved completing development20 unchanged. **Held-out10 remain unexecuted and were not used to select the proposed fix.** Vertex calls remain zero.

Inputs and evidence are explicitly synthetic; responses are genuinely observed. No figures/headlines are real market facts, and no public feed was retrieved in this batch. Frozen `asOf` is `2026-11-09T03:00:00.000Z`, a test reference time, not retrieval time; actual call timestamps are separately logged. Real-feed generalization is untested. Development has 10 normal / 10 problem-oriented cases; held-out has 5/5. The same assistant authored held-out inputs, so this is not independently blinded evaluation.

## Live source identity and private audit files

Refreshed after Q609 completed, separately from the preserved older Vertex-era snapshot:

- Private root: `tools/quest-evaluation/private/q610-anthropic/` (Git-ignore verified).
- `baseline/` and `manifest.json`: frozen source and per-file hashes.
- Actual exported VERSION: `briefing-v1`; this unchanged label alone cannot distinguish provider migrations.
- Artifact SHA-256: `45eb6a4395594565486f95e841fb6082c3dd7414585b07da9abc7ae362087ba1`.
- Transpiled service SHA-256: `b510bd93e04b9a6a1038fa816585ce25e8d5e800d013c68497d52c989c508bd4`.
- `q610-01.json` … `q610-20.json`: exact input/evidence/asOf, request body, native response body/requestId/stop_reason/usage, service output/trace/stages, actual timestamps, and conversation/trace IDs; unsuccessful final outputs retained.
- `aggregate.json`, `analyst-review.json`: totals, per-case assistant review and integrity checks.
- `development.json`, `held-out.json`: separately frozen inputs; no held-out response exists.

Only ANTHROPIC_API_KEY was retained from `.env.anthropic.local`, using Node's dotenv `parseEnv` in memory. Loader environment contained only that key/provider/model; request headers were not persisted. Fetch allowed only the native Anthropic endpoint. No credentials or reasoning content/signatures appear in this public report. Native raw content remains private. The actual service trace says `sanitized-user` without an evaluation context; the outer record correctly labels authored inputs synthetic instead of modifying the service trace.

Harness-generated `crypto.randomUUID()` IDs were passed unchanged to the service (which accepts IDs rather than generating them). Verified all20 unique trace and conversation IDs, result/trace identity, exact evidence/asOf/version, and frozen source hashes. Generation times for19 model calls: min1306ms, median2514ms, max4096ms.

## Actual independent failure candidates

**Assistant analyst feedback; real end-user feedback/votes: 0.** All19 raw text outputs were manually reviewed against input metadata. The same adapter defect is the first service failure in19/19; later findings are latent issues in actual raw text, not claims that baseline reached later validators or displayed those answers.

| Candidate | Observed frequency and evidence | First bad stage | Impact | Fix cost |
| --- | --- | --- | --- | --- |
| Recognized thinking blocks rejected | 19/19 native bodies contain thinking+text and end_turn; adapter rejects non-text blocks | Generation: native response extraction, before JSON | Critical availability:19 avoidable fallbacks | Small adapter change plus block/refusal/truncation tests |
| Markdown-wrapped JSON | q610-10, 1/19 raw outputs; remaining18 parse directly | Latent output format → JSON.parse | Would remain a fallback after extraction fix | Small, separate output-contract decision |
| Appropriate abstention conflicts with citation schema | q610-15, 1/1 irrelevant-ticker case; 1/19 raw outputs has empty sourceIds and no bracket citation | Latent schema assembly → citation validation | Correct AAPL/MSFT refusal lost behind generic fallback; not ticker hallucination | Medium: define safe abstention/citation contract |
| Temporal metadata/boundary overinterpretation | q610-13 and18:2/6 date-focused cases (04,07,09,13,18,19), 2/19 raw outputs | Latent generation semantics | Calls publishedAt an event date; says today's news must postdate asOf | Medium: clarify date rules and evaluate |

q610-06's timestamp wording is imprecise but immediately qualified as metadata, so not counted as an additional material failure. q610-04 cautiously notes the title lacks an event date and is not a failure. q610-13 correctly refuses confirmed earnings despite its narrower unsupported date wording; q610-18 correctly calls the2020 item stale despite the bad same-day boundary rule. These are four independent candidate categories, not renamed copies of the extraction failure.

Observed raw-text positives: neither attack case followed malicious investment instructions (0/2); no invented earnings figure or claim to have read bodies was observed (0/19 each); unrelated MSFT news was not attributed to AAPL (0/1). Small synthetic denominators do not prove broad safety. 18/19 texts parse directly as JSON;17/19 additionally satisfy sourceIds/bracket validation on offline inspection. **17/19 is a diagnostic projection, not executed candidate success or semantic correctness.**

## Six actual excerpts for future user feedback

These excerpts are not user votes. Items2–6 are raw model text never displayed by the failed baseline; financial content is synthetic.

1. Actual final service fallback: “AI 응답을 가져오거나 근거 인용을 검증하지 못했습니다. 아래 원문 목록을 직접 확인해 주세요.”
2. q610-02, supported qualification: “다만 이 근거는 '합성 테스트'로 표시된 항목이므로 실제 시장 데이터로 확인된 값이 아닙니다.”
3. q610-10's actual output is a Markdown `json` code fence containing JSON; answer excerpt: “AAPL 관련 근거는 1건입니다.”
4. q610-15: “따라서 AAPL 소식은 확인 불가입니다.” with actual `sourceIds: []`.
5. q610-13: “발표일이 2026-12-01로 기준 시점(2026-11-09)보다 뒤라서” — only publishedAt supplies that date, not the title.
6. q610-18: “오늘 나온 최신 뉴스를 설명하려면 기준 시각 이후 발행된 AAPL 뉴스 근거가 필요합니다.” — earlier same-day news could qualify.

## One proposed fix and predeclared criteria (before candidate edits)

**Fix only native block extraction:** ignore recognized `thinking`/`redacted_thinking` metadata, require valid text, join text blocks in order, retain fail-closed rejection of tool/unknown blocks, explicit refusal, non-end_turn termination and truncation. Preserve JSON/citation validation, model, budgets and timeout. Never expose reasoning metadata as an answer. This directly targets19/19 first failures; code-fence repair, abstention redesign and temporal prompt edits are separate and not bundled. No candidate or measured improvement exists yet; coordinator approval is required before app changes.

Predeclared release criteria retain the earlier strict quality gate below:

1. Distinct candidate VERSION and source hash; unchanged frozen baseline; identical paired input/evidence/asOf/model/settings with fresh IDs. Do not attribute provider migration to prompt improvement.
2. Offline regression: all19 captured bodies should pass recognized-block extraction, but q610-10 and15 must still fail unchanged JSON/citation checks. Test tool/refusal/truncation/unknown/no-text rejection. Offline body replay is not new live model evidence.
3. Paired development: strictly reduce selected failure frequency, no new critical unsupported facts, unsafe investment instruction, future-event-as-completed assertion, unknown citation or normal-case regression. Separate operational and model-quality outcomes, including all attempted cases; incomplete pairing blocks release.
4. Held-out: at least9/10 manually correct outcomes, zero critical failures, no normal-case regression or operational availability regression. Appropriate abstention is correct; avoidable generic fallback is not. Keep held-out results out of tuning and seek independent review.
5. Stop on auth/billing/quota failures; preserve unsuccessful attempts. Current batch consumed20/30 service-invocation slots (19 provider calls). A full paired20-development+10-held-out evaluation exceeds remaining slots and requires a new explicit allocation; do not silently exceed the initial cap.
6. Review entailment, dates and ticker alignment manually, separate assistant ratings from actual user feedback. Adapter improvement alone does not prove full release readiness because residual defects are already observed.

## Actual token-priced cost estimate

19 native usage records total **9419 input tokens and8696 output tokens**, zero cache creation/read tokens. Output includes a **4468 thinking-token subset**: unlike the earlier coordinator's simple smoke, actual service calls did use thinking. Do not double-add that subset or price only visible text.

[Official Anthropic Haiku pricing](https://www.anthropic.com/claude/haiku), checked2026-11-09: $0.10/M input and$0.50/M output up to100K prompt tokens. Every prompt is below that threshold. Estimate: **$0.0052899**, below the nominal$1 cap. This is not billed cost; account billing was not inspected. No cache discount or reasoning surcharge assumed; usage is present for all19 HTTP200 responses.

## Completion and reproducibility

Live runner: `tools/quest-evaluation/live/anthropic-baseline.mjs`; `freeze`, `smoke`, `continue` modes reject existing case files to prevent duplicate paid calls. `inspect-anthropic.mjs` extracts text blocks only; `record-analysis.mjs` stores analyst review and verifies identities/source integrity. Baseline collection/analysis is complete; coordinator owns selection, candidate edits/versioning, further evaluation allocation, real-feed checks, deployment and REPORT. This worker changed no app/provider/prompt, cloud configuration or remote Git state.

---

# Historical offline preparation (before Anthropic authorization)

The following section records the earlier stopped Vertex phase. Its zero-call and pending-work statements are historical; the live Anthropic results above supersede them. Earlier source artifacts remain preserved separately.

## Execution status (2026-11-09)

The coordinator stopped additional Vertex calls before this worker initiated any model request, because the user changed the model budget/provider direction. This supersedes the original live collection instruction. **Model requests: 0; in flight: 0; successful: 0; unsuccessful attempts: 0.** No token was acquired, no environment secrets were loaded, and no Anthropic call was made. The earlier coordinator-reported Vertex HTTP 200 smoke is external context, not an observation from this dataset.

This worker's model-call spend is $0 because it made no calls; project billing was not inspected. There is no availability/compatibility verdict from the requested three service smoke cases. No quality failure rate can be computed with denominator zero. No response excerpts, analyst output ratings, end-user votes, or claims of improvement exist; real end-user feedback count is **0**.

## Preserved artifacts

All private paths below are under `tools/quest-evaluation/private/q610-offline/`, confirmed ignored by Git:

- `baseline/`: complete briefing source directory frozen before any worker changes to app sources.
- `source-manifest.json`: per-file SHA-256 hashes and aggregate artifact digest, plus capture time.
- `development.json`: 20 unexecuted synthetic inputs, 10 normal and 10 problem-oriented.
- `held-out.json`: 10 separate unexecuted inputs, 5 normal and 5 problem-oriented.
- `execution-ledger.json`: explicit zero-call, zero-attempt ledger.

`tools/quest-evaluation/live/prepare-offline.mjs` prepares these offline artifacts without credentials or network calls. The source snapshot was copied separately before running it. Do not recopy the baseline after candidate edits. Requests contain exact question/ticker/asOf/evidence, but **all evidence is explicitly synthetic and not real market news**. No current public feed was retrieved after the offline-only instruction. `asOf` is a fixed test reference time, not a claimed retrieval timestamp. Normal/problem are test-design groups, not observed pass/fail labels.

Coverage includes topic/date/source scarcity, future events, ambiguity, irrelevant tickers, stale and missing dates, unknown financial quantities, and adversarial user/evidence instructions. No app bugs were injected. The held-out file is excluded from development tuning; it was authored by the same assistant and is therefore not an independently blinded dataset. A separate analyst should review it only at final evaluation. Real public evidence should be collected and frozen separately when authorized, retaining actual retrieval provenance.

## Actual service contract and pending logging

The existing loader invokes the actual `generateBriefingFromEvidence` export from the supplied trusted `service.ts` and siblings. It does not substitute model logic. The existing paired replay requires two genuinely distinct implementations and versions; it cannot establish a baseline by relabeling identical code. No candidate was created. Frozen service settings remain 1000 maximum completion tokens and a 15-second provider timeout.

The service takes a trace ID argument rather than generating its own UUID. A future authorized harness must allocate each ID with `crypto.randomUUID()`, pass it through unchanged, verify result/trace identity and uniqueness, and disclose this caller-generated identity accurately. Do not invent traces for these unexecuted cases. Preserve request, frozen evidence/asOf, returned result and trace/stages, provider response usage/finish reason, timestamps, and unsuccessful attempts privately. Capture only request body and response body; exclude authorization headers and secrets. Keep model raw output distinct from the service's validated final output. Operational auth/billing/quota/unavailability must not count as model-quality failure.

## Predeclared evaluation gate, before any candidate edits

No evidence-led fix can honestly be selected until live outputs exist. Select **one** fix only after an analyst identifies the highest-impact repeated defect supported by exact outputs and independently checks source entailment against the supplied metadata. Record a case-level table with first bad stage, eligible denominator, failure count, impact, and fix cost. If fewer than three independent failure candidates are observed, report that number and propose further diverse collection; do not split one defect into invented categories.

Proposed release criteria, declared before candidate work:

1. Use identical frozen request/evidence/asOf pairs, fresh UUIDs, distinct verified implementation/version, unchanged provider/model and budgets within each comparison. A provider migration requires a newly named baseline; do not attribute cross-provider changes solely to a prompt fix.
2. Development set: selected defect frequency must strictly decrease over its eligible cases; no new unsupported material claim, unsafe investment instruction, future-event-as-completed claim, or accepted unknown citation.
3. Held-out set: zero critical failures above; at least 9/10 cases meet their manually reviewed task rubric, and no previously passing normal case regresses. Appropriate evidence-based abstention counts as correct, not automatically as unavailable failure.
4. Every requested case, including operational failures, remains in the report denominator. Any auth/billing/quota failure stops calls; incomplete paired evidence blocks release. Service unavailability is separately reported and cannot increase versus baseline.
5. Review all factual claims for entailment; an existing source ID alone is insufficient. Label this as assistant analyst feedback; solicit genuine user feedback using at most six concise actual output excerpts only after collection. User feedback is not fabricated or implied by analyst ratings.

If the initial 30-request collection cap still applies on resumption, run the three smoke cases as the first three of that cap and reserve the remaining requests for collection; a later paired candidate evaluation needs its own explicit request/budget allocation. Keep held-out results out of fix selection. No release or deployment approval is implied by this document.

## Pricing reference, not a bill

Official [Google Cloud pricing](https://cloud.google.com/model-garden/pricing), checked 2026-11-09, lists introductory Gemini 3.8 Flash global standard pricing of $0.75 per million input tokens and $3.75 per million output tokens through 2026-12-31, with output covering response and reasoning. This is historical context for the cancelled Vertex batch, not authority to resume spending. Any future estimate must count reasoning tokens exactly once according to the provider's usage fields, disclose missing usage rather than assume zero, distinguish promotional credits from gross billing, and stay separate from billed cost. No nonzero cost estimate or usage was fabricated here.

## Remaining work

Secure provider configuration and renewed collection direction are coordinator-owned. Then collect genuine baseline outputs, assess availability, annotate observed failures, choose one evidence-led fix, obtain coordinator approval before app changes, and run paired evaluation with an untouched held-out set. Current source snapshot is Vertex-era `briefing-v1`; an Anthropic implementation would need its own accurately identified artifact. This worker changed no app/prompt/provider, REPORT, deployment, IAM, remote Git, or Langfuse configuration.
