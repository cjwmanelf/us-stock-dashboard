# v6 deterministic temporal notice — source ready

v5 development passed20/20, but the independent hold-out reached9/10 versus v2's7/10 with one normal-case regression, so the predeclared no-regression gate still failed. The coordinator supplied only the general failure principle: future metadata needs an explicit after-asOf explanation. This implementation did not read old/new held-out inputs, responses or rubrics. Previous v5 snapshots remain unchanged; a completely new independent set is planned.

## Bounded change

VERSION is `briefing-v6-temporal-notice`; promptVersion remains **briefing-prompt-v5-partial**, because no prompt/model/settings change was made. After the existing strict model validation, a deterministic helper compares finite parsed publishedAt and asOf times for relevant evidence. Explicit other-ticker evidence is excluded; source IDs must exist in returned evidence, be nonempty/bounded and contain no bracket/control characters. Known IDs are deduplicated.

For a successful or canonical insufficient-evidence answer only, any strictly later timestamp adds a separated paragraph beginning **날짜 안내:** with the actual source references and the fixed explanation that the date is metadata after the reference time and alone cannot establish event completion or results publication. The generated answer is retained as its original prefix; the notice is visibly separated rather than presented as a model-generated claim. No event date is inferred. Empty/unavailable responses never receive this notice and remain failures/empty-evidence outcomes.

Exact already-present canonical notice text is not duplicated. Approximate semantic matching is intentionally avoided: an answer that mentions a future date but omits the consequence must not suppress the required clarification. This may repeat a similar model explanation; it is a documented presentation tradeoff, not a semantic quality guarantee. Normal and insufficient status labels are unchanged; the helper does not promote results to ok or weaken citation/refusal/truncation checks.

## Verification and frozen handoff

`scripts/briefing-v6-check.cjs` passes future/equal/past timestamps, equivalent and later timezone offsets, missing/null/invalid reference dates, invalid source dates, explicit irrelevant ticker, multiple/duplicate valid IDs, malformed ID exclusion, exact-notice duplication, canonical abstention and unavailable/empty cases. Existing native and v4 strict-setting/citation checks and v3/v5 development contract checks pass. TypeScript no-emit check passes. These are deterministic mocked tests, not new model-quality measurements. No model request was made by this task.

- Artifact root: `tools/quest-evaluation/private/q610-v6-source/` with manifest.json and candidate/.
- Artifact SHA-256: `3ace4794db84368aa2350ada962e5d6bad4c4dcd85f21a7bdc8c9a8040742753`.
- service.ts SHA-256: `2215a3872265b4770aa4f3a3812d687643b30b0edaae674d07487af19506a970`.
- VERSION: `briefing-v6-temporal-notice`.
- Prompt unchanged: `briefing-prompt-v5-partial`.

Frozen handoff was sent to the coordinator before independent evaluation. v5's failed gate is not overwritten. v6 live development/independent hold-out and deployment remain separate work. Feedback/auth/API and cloud/Git state were not modified.
