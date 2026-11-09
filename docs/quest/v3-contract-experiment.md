# v3 evidence contract experiment — second experiment

This is a separate second experiment after the v2 Anthropic text-block extraction fix. It does not relabel or expand the initial single-fix experiment. Development evidence only: `docs/quest/live-baseline-analysis.md`, q610-10 (whole JSON fence), q610-15 (appropriate abstention rejected by empty-citation contract), q610-13/18 (timestamp/event-date and same-day boundary overinterpretation). No previous held-out input or response was read. No model call, cloud action, Git command or REPORT edit was performed.

## Frozen contract

- VERSION: `briefing-v3-evidence-contract`.
- Prompt version: `briefing-prompt-v3-contract`.
- v2 thinking/redacted-thinking extraction remains unchanged. Provider, model settings, 15-second timeout, 1,000-token output cap and response-byte cap remain unchanged.
- Parse strict JSON, or a single entire lowercase `json` code fence with opening/closing lines. Trim surrounding whitespace only. Never extract a JSON substring from commentary, multiple fences or malformed content. Require an object before applying the contract.
- Ordinary answers retain answer length, real source IDs, bracket citation and URL checks. Explicitly incompatible ticker metadata cannot support a claimed answer. Missing/blank ticker metadata is not a reason to exclude evidence.
- New model abstention is exactly `{"status":"insufficient_evidence","answer":"","sourceIds":[]}`. Extra fields, free-text assertions and citations in this form are rejected. The server supplies a fixed Korean notice that the requested content cannot be verified from the provided metadata; no model-generated uncited claims are displayed. This validates a conservative output form, not a claim that an independent semantic verifier proved all evidence insufficient. Over-abstention still counts as a potential quality regression.
- If every source has explicit different-ticker metadata, the server issues a fixed, metadata-verified mismatch notice without inference. Evidence/source IDs remain preserved. Missing ticker metadata prevents this shortcut. Empty feed retains its existing unavailable path.
- Accepted abstention uses result/trace status `insufficient_evidence`, no generation error code, and an `ok` generation span when a model was invoked. UI displays `근거 부족 · 확인 보류`. Transport/parser/contract failure stays `unavailable` and retains its error span.

## Timestamp meaning verified from src/lib/feed.ts

Finnhub news uses provider `datetime`, Marketaux news uses `published_at`, SEC filings use `filingDate`, earnings calendar uses schedule `date`, and reported earnings use `period`. Therefore the common `publishedAt` field is not uniformly an event occurrence/publication date. The prompt now distinguishes kinds, disallows inferring an absent event date/completion from this field alone, and explicitly permits same-day news published before `asOf`. It does not reject all future/unknown timestamps or all missing-ticker evidence; normal title-supported summaries stay valid. Temporal entailment remains a model-quality issue requiring subsequent independent evaluation.

## Deterministic verification

`node scripts/briefing-v3-check.cjs` passes fresh synthetic fixtures for raw/fenced JSON, whitespace/CRLF, commentary/multiple-fence/truncation rejection, unknown citations, canonical abstention and malicious empty-citation rejection, explicit ticker mismatch/no-call, mixed-ticker rejection, absent-ticker acceptance, same-day normal answer acceptance, prompt/version markers, and preserved v2 thinking extraction.

Existing `briefing-check.cjs`, `briefing-vertex-check.cjs`, `briefing-anthropic-check.cjs`, and `briefing-telemetry-check.cjs` pass. `npx tsc --noEmit --incremental false` passes. No tests that load prior held-out fixture files were run. No Next build or live quality result is claimed.

## Evaluation handoff and limits

The separate evaluator must create new independent held-out cases after this code freeze. Do not tune this candidate from prior held-out material. Compare the second experiment explicitly against the frozen v2 contract as well as report the original baseline history separately. An accepted abstention is not automatically a correct answer: manually assess whether evidence supported a normal response. Test normal-news coverage, date entailment, ticker alignment, and absence of invented claims; deterministic parser tests do not prove these semantics.

Downstream generic evaluator/telemetry code currently treats only `ok` as successful in some summaries. It is outside this worker's service/UI scope and was not silently modified. Evaluator must distinguish `insufficient_evidence` from operational `unavailable` and manually grade appropriateness; raw service trace retains the distinct status. Otherwise conservative abstentions may be incorrectly counted as infrastructure failures.

Source freeze manifest is `docs/quest/v3-contract-source-hashes.json`; it includes the complete current briefing directory, UI state rendering, and deterministic test. Older baseline/v2 private artifacts were not read or modified. All changes are limited to service.ts, types.ts, BriefingForm.tsx, the new deterministic test and these experiment documents.

## Pre-live v3 integration amendment

Before any v3 live evaluation, the same v3 prompt/contract version received integration corrections. Every ordinary-answer bracket ID must now be both declared in sourceIds and present in a ticker-compatible input source; regression covers a valid declared AAPL citation plus an undeclared foreign-ticker citation, and an undeclared same-ticker citation. The frozen v1/v2 private artifacts remain untouched.

`telemetry/adapter.ts` now preserves insufficient_evidence. Generic evaluator accepts the status without marking abstention quality passed: no_data and ticker interpretation stay pending and manual review explicitly includes abstention_appropriateness. Report has a distinct abstentions count with pending-manual-review. Replay accepts a captured abstention without generation_failed, counts it separately and preserves pending quality; completed means captured operation, not a correct answer. This supersedes the downstream-status limitation above.

The observability bridge emits best-effort single-line JSON to server stdout independently of Langfuse enablement. Fixed event discriminator plus explicit fields only: validated UUID traceId, contractVersion, promptVersion, K_REVISION revision, status, bounded known stage names/status/ISO timestamps, evidenceCount, durationMs, validated known model-family name, numeric usage fields, and recognized errorCode. It does not serialize the event, question, answer, evidence, URL, user ID, headers, credentials, reasoning or token text. Usage means counts only. Unknown model-label formats are omitted rather than logged unchecked.

Verified feedback requests emit only event discriminator, traceId, version and numeric score. This is an attempted verified vote, not storage confirmation. Existing Langfuse delivery state and HTTP behavior remain unchanged (disabled Langfuse still does not claim feedback persistence). Neither successful console.log nor SDK flush proves Cloud Logging or Langfuse storage; deployment operator must retrieve actual version/revision-specific log entries for evidence. No feedback is synthesized during normal trace generation.

`briefing-integration-check.cjs` tests an explicitly mocked disabled telemetry sink, stdout field/content exclusion, real-request-only feedback emission, preserved telemetry status, evaluator pending semantics and the replay flow using an in-memory filesystem/service/child-process stub. Its fake child-process check does not execute Git or access old private fixtures. `briefing-v3-check.cjs` includes both citation-smuggling regressions. Both pass; provider/security checks, memory telemetry checks and nonincremental typecheck pass. No live inference or Cloud action was performed. Final hashes include evaluator/replay and integration test changes in addition to the prior briefing/UI source scope.
