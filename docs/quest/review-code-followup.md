# Q612 post-review code follow-up

This is new validation evidence collected after the Fable/Astra reviews on 2026-11-09. It does not replace the historical evaluation, review or deployment evidence. Base branch: `feat/main-quest-06-briefing-observability`, starting HEAD `4abf6f3`.

## Changes and behavior

- BriefingCitations explicitly focuses its close button immediately after native `showModal()`. Native modal isolation/Escape, connected-opener focus return, responsive dimensions and external-link behavior are retained. Initial Enter targets close rather than source navigation.
- AddHoldingForm owns successful resets in its async action completion. Each success resets uncontrolled fields and remounts the controlled ticker, including consecutive successes; a returned error does not trigger this explicit reset. `useActionState` still owns pending/error state.
- EditableHoldingRow mounts a separate editor for each edit session, so action errors do not leak into a reopened editor. Successful action completion closes it; failure keeps it open. Cancel is disabled while saving to prevent cancellation/reopening races with an in-flight update.
- ThemeToggle uses `useSyncExternalStore`: null server snapshot preserves icon-free initial hydration, DOM data-theme mutations and system-media changes notify subscribers, and subscription cleanup disconnects both listeners. Cookie persistence remains in the click handler.
- TickerAutocomplete performs immediate clear/cache/loading/index updates in input events. Its effect retains the 180 ms network debounce and abort cleanup; aborted responses cannot replace current suggestions or clear current loading state. Selection cancels pending search without fetching the selected ticker; keyboard selection and endpoint-scoped cache remain supported.
- WeightDonut derives each arc offset from preceding slice amounts without mutating a captured accumulator. Aggregation, sorting, eight-slot grouping and visual gap rules are unchanged.
- Exporter removes only unused `root=process.cwd()`; export/verify/smoke behavior is unchanged. No rule was disabled and no dependency/configuration was changed.

## Validation performed (offline)

| Command | Result |
| --- | --- |
| `npx eslint . --max-warnings 0` | exit 0, zero errors and zero warnings |
| `npx tsc --noEmit --incremental false` | exit 0 |
| `node --test tools/quest-evaluation/test/*.test.mjs` | 25/25 pass |
| `node scripts/review-ui-check.cjs` | exit 0: focus ordering/close/return, consecutive add success resets/error retention, editor failure/success close, SSR theme snapshot/subscription/cookie/cleanup, autocomplete debounce/stale abort/keyboard/clear/cache |
| `node scripts/briefing-feedback-delivery-check.cjs` | exit 0: signed issuing version, tamper/owner denial, delivery statuses, no actual vote/network |
| `node scripts/briefing-v6-check.cjs` | exit 0: temporal guard and unavailable/abstention cases, no inference calls |
| `node scripts/briefing-integration-check.cjs` | exit 0: observability allowlist, feedback/abstention and operational classification |
| `node tools/quest-evaluation/live/q604-final-export.mjs --verify-public` | exit 0: 41 public files, 10 synthetic cases, 20 responses, 28 historical source files; hashes/privacy checks pass |
| `node tools/quest-evaluation/live/q604-final-export.mjs --smoke-public` | exit 0: 3 source versions, 3 mocked fetches, zero actual network/model requests |
| `git diff --check` | exit 0 (Git emits line-ending normalization notices, not ESLint warnings) |

The new UI test is a component-callback/hook double harness, not a browser or React renderer. Native dialog focus trapping/Escape, real hydration and full browser form lifecycle still require the coordinator's browser verification. No full production build or deployment was performed by this worker; rebuilt source/UI hashes must be recorded by the coordinator. No live script, model call, secret read, cloud action, commit or push was performed. Installed Next server/client components and forms documentation and AGENTS.md were read before editing.

## Historical manifest provenance and current byte digests

`docs/quest/evidence/final-validation.json` is retained byte-for-byte as a historical validation snapshot. Its exporter hash `281e490f3890f0e90ed485a13536b86a2a19040bd7a3b91bb777b93f58c258b1` describes the original exporter at HEAD `4abf6f3`, not the revised current tool. The public `final-export-manifest.json` does not hash the exporter and remains untouched; both public verification modes still pass. The table below is the separate post-review current-tool/source digest record, so no historical hashes, timestamps, scores or evaluation sources are rewritten. v1/v2 frozen sources, v6 model inference, synthetic cases, responses and raw results were not edited.

SHA-256 values below are for current working-file bytes (before any future checkout line-ending conversion):

| Changed file | Current SHA-256 |
| --- | --- |
| `src/components/BriefingCitations.tsx` | `908b343d9a888193cdbfb2d7b5b1b8b46021709e9dede6497527d9a45ae294ac` |
| `src/components/AddHoldingForm.tsx` | `6916ba7552b2787f70475b2c66c251c68aa5f1a573ba6d10a8fb2e7dba9ac962` |
| `src/components/EditableHoldingRow.tsx` | `c2de4fed2a7806dfbcb015948875dd46b009dd2a84bb5abb5f05cd2af4998d9c` |
| `src/components/ThemeToggle.tsx` | `a478c5bc5bc5f72884bdf361f327e79b572196b3c78f5923e53d10a25ee0ac95` |
| `src/components/TickerAutocomplete.tsx` | `a19a8afec273df8d31a1144eee4d569d4c9ec6ac2fa6d3dfad697a48e9f1904a` |
| `src/components/WeightDonut.tsx` | `f7041a220ddd167a2c922978b03ade6dbf738c6568fcdc601ad2800edf4c8fb7` |
| `tools/quest-evaluation/live/q604-final-export.mjs` | `5997347519d05555fab284d441652083e1c523c10ba391eace2d1fb6b044a972` |
| `scripts/review-ui-check.cjs` | `79060510ea721a2d63e8a0a3ca96c935ebe12eb02f156818c901a6ab777eb3ec` |

This report itself is the ninth worker-owned changed/new file. Other concurrent coordinator documentation edits are outside this worker's scope.
