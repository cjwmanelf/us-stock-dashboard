# v4 output-contract pilot — 2026-11-09

## Decision and scope

Implemented the authorized output-contract experiment and stopped after exactly **3 actual service pilot requests**, development cases04/06/07. All3 returned HTTP200 and `end_turn`:2 final `ok`,1 canonical `insufficient_evidence`,0 transport or validation failures,0 observed thinking tokens. This is a small diagnostic pilot, **not a release pass or full development/held-out evaluation**. No old or new held-out inputs/results were read during this task. No cloud, Git or REPORT changes were made.

The evidence used to choose changes was restricted to the already-observed v3 development final text and stop reasons:04 generated non-source heading brackets,06/11 ended `max_tokens`, and07/08/09/16 listed sourceIds without inline bracket citations. These were real output-contract failures, not invented application bugs. Reasoning text/signatures were neither inspected for analysis nor published.

## Official verification and independent variables

[Anthropic thinking documentation](https://platform.claude.com/docs/en/build-with-claude/thinking), checked2026-11-09, states that Haiku5.5 defaults to adaptive thinking, accepts `thinking: {type: disabled}` at high effort or below, and shares the max_tokens output budget between reasoning and final text. [Structured-output documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) describes `output_config.format` with type `json_schema`.

A real authenticated **GET /v1/models/claude-haiku-5-5** returned200 and advertised `thinking.types.disabled.supported`, `effort.low.supported` and `structured_outputs.supported` as true. Sanitized capabilities and check time are stored privately; the credential was read with BOM stripping and dotenv parsing in memory and was never printed/persisted. This metadata request is separate from the3 generation requests.

v4 changes multiple explicit variables together, so a pilot improvement cannot be attributed solely to wording or solely to disabling thinking:

1. Compact system prompt:1–3 sentences, exact source brackets after factual claims, no heading brackets, concrete normal/abstention JSON examples; retained topic/date/synthetic-data/investment safety rules.
2. **Only for native model ID `claude-haiku-5-5`:** thinking disabled and `output_config.effort=low`.
3. Same model only: fixed JSON schema requiring `status` (`ok` or `insufficient_evidence`), `answer` string and `sourceIds` string array; no extra properties. The schema is constant across requests, without tools or per-case enums.

Unchanged: model ID, native API version2023-06-01, max_tokens1000,15-second timeout, exact input request/evidence/asOf, strict server source/bracket/ticker validation, canonical abstention rules, refusal/unknown/tool/truncation/no-text rejection and response size cap. v3's existing whole-document JSON-fence handling is retained; no new permissive repair was added. The JSON schema constrains syntax, **not factual truth or inline citation correctness**; server checks remain essential.

Other Anthropic model IDs do not receive these Haiku-specific configuration fields. Direct/Vertex request shapes retain their previous provider-specific handling. The shared prompt is intentionally revised for all providers; deterministic tests check the direct and generic Anthropic paths rather than claiming live cross-provider testing.

## Frozen identities and private artifacts

- Current VERSION: **briefing-v4-compact-output**.
- Prompt version: **briefing-prompt-v4-compact**.
- Frozen artifact SHA-256: **391f992def97b440b1b4514529d3b23f767e8636ccc6fb97b376d3aa768cd054**.
- `tools/quest-evaluation/private/q610-v4-pilot/v3-before-edit/`: source copy made before changing files; original Q604 v3 snapshot also remains intact.
- `.../candidate/` and `manifest.json`: immutable v4 source and per-file hashes.
- `.../capabilities.json`: sanitized Models GET result.
- `.../q610-04.json`, `q610-06.json`, `q610-07.json`: exact inputs, native request/body/usage/requestId, actual timestamps, unique UUIDs, returned result/trace/stages and source identity; attempt markers saved before calls.

No raw native response or thinking/signature is included in this document. Inputs are explicitly **synthetic test evidence**, not actual market news; outputs are genuinely observed model responses. Every pilot uses the same development request/evidence/asOf as before and a new `crypto.randomUUID()` trace and conversation identity. No paid retries or iterations followed pilot observations. Models/schema settings and app sources were fixed before the first pilot.

## Pilot results and assistant analyst review

| Case | Prior observed v3 problem | v4 final status | Stop | Input/output tokens | Thinking subset | Analyst assessment |
| --- | --- | --- | --- | ---: | ---: | --- |
| q610-04 | Unknown heading brackets | ok | end_turn |1394 /199|0|Two sentences correctly separate reported EPS from estimated future EPS, cite both exact IDs, and refuse actual announcement-date confirmation. Claims are title-qualified; no synthetic figures are represented here as real market facts. |
| q610-06 | max_tokens truncation | ok | end_turn |1298 /145|0|Two sentences explicitly call the title synthetic, report only its EPS values, and identify unavailable details; valid citation. |
| q610-07 | sourceIds without inline citation | insufficient_evidence | end_turn |1286 /29|0|Canonical empty-answer/empty-sourceIds model abstention becomes server-authored uncertainty notice. It does not claim the event happened, but loses the useful explanation that the title says scheduled; full evaluation must judge this information loss, not count every non-unavailable status as quality success. |

Actual final UI text excerpts:

- 04: “발표된 실적으로는 Q3 2026 EPS가 $1.20로 예상치 $1.10을 웃돈 것으로 제목에 나와 있습니다 [synthetic-earnings].”
- 06: “합성 테스트 제목상 AAPL의 Q3 2026 실적 발표에서 EPS가 $1.20이고 예상치는 $1.10으로 표기되어 있습니다 [synthetic-earnings].”
- 07: “제공된 제목·공시명·실적 요약만으로는 요청한 내용을 확인할 수 없습니다. 관련 원문이나 추가 근거를 확인해 주세요.”

These are assistant analyst assessments, **not end-user ratings**; no new end-user feedback was collected by this task. The synthetic nature of04's source is clear in the input and title-qualified in its output, but unlike06 its answer does not repeat the word synthetic; preserve that caveat for broader review. No full quality gate is declared from these three selected failure cases.

Total generation usage:3978 input tokens,373 output tokens,0 thinking/cache tokens. At the previously verified Haiku rates($0.10/M input,$0.50/M output), pilot token-priced estimate is **$0.0005843**, not billed cost. The schema adds prompt overhead, so lower thinking tokens do not by themselves prove total cost improvement. This task adds3 generation calls to the coordinator's cumulative budget and does not claim a freshly audited account total.

## Deterministic validation and handoff

- `briefing-v4-check.cjs`: Haiku-specific settings/schema, valid response, exact source-bracket rejection including extra `[제목]`, missing brackets, unknown IDs, canonical/malformed abstention and generic-provider compatibility.
- `briefing-v3-check.cjs`: unchanged parser/abstention/ticker policies, with assertions updated to current version and condensed prompt wording.
- `briefing-anthropic-check.cjs`: metadata extraction, ordering, unknown/tool/refusal/truncation/no-text rejection and fixed endpoint/headers.
- Evaluation test suite25/25 passes; test-only prompt mutation no longer depends on a removed Korean phrase.
- TypeScript `tsc --noEmit --incremental false` and ESLint on modified application files pass.

Source/hash and pilot results were sent immediately to the coordinator for Q604 handoff. Remaining development evaluation and any untouched independent held-out evaluation belong to Q604 under a separate allocation. Do not rerun these3 paid pilots or tune against held-out evidence. Any subsequent v4 source change requires a new frozen identity and invalidates treating this pilot as evidence for that changed artifact.
