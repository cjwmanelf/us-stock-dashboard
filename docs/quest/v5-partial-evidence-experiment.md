# v5 partial-evidence experiment — source ready, no live calls

2026-11-09: coordinator authorized two minimal semantic prompt corrections after independent v4 development failure. Evidence is restricted to development cases03/14 (generic filing metadata assigned SEC/receipt meaning without provenance) and07 (scheduled-event title discarded by a generic abstention). No old or sealed new held-out input/response was read for this change.

## Changes and boundaries

1. publishedAt is feed date metadata. A filing kind alone does not establish SEC origin, receipt date or actual event date; only explicit title/provenance can support those names.
2. If the title supplies relevant partial facts, cite those facts and distinguish the unanswered part. A scheduled future event can be described as scheduled while completion/results remain unknown. Reserve canonical abstention for no relevant fact or explicitly unrelated evidence.

Only service system-prompt text, prompt version and exported VERSION change in the application. Haiku5.5 thinking disabled, low effort, fixed JSON schema, max_tokens1000, timeout15s, strict citations/ticker checks, canonical abstention and unknown/refusal/truncation rejection remain unchanged. No feedback/API/deployment changes were made. This task made **zero model calls**; semantic improvement remains unmeasured.

## Frozen handoff

- Artifact root: `tools/quest-evaluation/private/q610-v5-source/`, containing `candidate/` and `manifest.json`.
- VERSION: `briefing-v5-partial-evidence`.
- Prompt version: `briefing-prompt-v5-partial`.
- Artifact SHA-256: `b11adf3a17fb1b52b7d8a2e3ada353da68f9a01e0a76919169b76dba0a4dd03a`.
- service.ts SHA-256: `d2dd8d58157720086d268bc9b49835ab6ff58d752ade177620458d4e8db43af4`.
- Older v1/v2/v3/v4 private snapshots/manifests remain unchanged.

## Deterministic checks before freezing

`scripts/briefing-v5-check.cjs` exercises two synthetic development regression fixtures through the actual service with mocked transport: neutral filing date phrasing and partial scheduled-event answer. It checks the new prompt rules, exact metadata preservation, returned version, and unchanged generation settings. It proves the intended contract accepts those valid answers, **not that the live model follows the semantic instruction**.

v4 strict citation/settings/schema checks and v3 parser/abstention/ticker checks also pass; version/prompt assertions track the new version. `tsc --noEmit --incremental false` passes. A preliminary stdin edit attempt failed before writing due to shell encoding; the UTF-8 file-based edit then succeeded and all checks were rerun before freezing. No paid retry was involved.

The frozen path/hash/serviceSHA and test results were sent to the coordinator for independent Q604 evaluation. No status label alone establishes quality. Do not tune on sealed hold-out, and do not claim release readiness before the predeclared gate is evaluated. Analyst assessment and real end-user feedback remain distinct.
