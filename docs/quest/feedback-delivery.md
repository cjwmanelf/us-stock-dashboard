# Feedback delivery: deployment-only amendment

This change is independent of the frozen v3 model evaluation. No service, types, provider, prompt, model, token budget or timeout was changed. No model request, actual user vote, Cloud API, Git command or Langfuse connection setup was performed. User login remains unverified. The original v3 evaluation manifest is not overwritten; the separate `feedback-deployment-source-hashes.json` records this deployment-only change and verifies inference-file hashes against the existing frozen manifest.

## Honest delivery states

The observability emitter awaits the server stdout write callback and reports success/failure; it does not claim Cloud Logging persistence. A verified feedback request returns HTTP 202 with `accepted: true` and one of:

- `stdout_written_unverified`: stdout accepted the structured JSON write, but durable storage/Cloud Logging ingestion has not been verified.
- `flush_completed_unverified`: the existing Langfuse adapter completed its flush path; ingestion/persistence remains unverified.

The Langfuse flush status is preferred when available. If stdout fails and Langfuse is disabled/fails, return HTTP 503. If one sink succeeds, that sink's explicitly unverified delivery is returned; failure of the other sink does not erase the successful write request. Invalid ownership/IDs/version/score/vote fail before emission. The UI says feedback was received and final storage is not confirmed, verifies the response delivery enum, and disables repeat buttons for the accepted trace. Request/timeout failures retain an error/unknown-receipt message and remain retryable.

No synthetic feedback is emitted by trace logging. Feedback stdout includes only the fixed event label, traceId, issuing version and numeric score. No user ID, cookie, signed token, score ID, API key or model content is logged. The regression script uses an in-memory stdout and mocked route authentication/sinks; its votes are not actual production votes.

## Issuing-version binding

Issuance signs traceId, expiry, keyed owner identity and a canonical base64url contract version. The briefing route uses `result.version`, not an independently selected deployment constant. Verification returns that signed version; the feedback route ignores any client-provided version and uses the verified version even after a new deployment. Existing four-part/versionless tokens are rejected with TRACE_NOT_FOUND and a request for a new briefing. Signature mutation, wrong owner, wrong trace, expiration and noncanonical/invalid versions remain rejected. The signing secret and one-hour expiry policy are unchanged.

## Duplicate accounting

stdout is an event log, not a durable unique-vote table. A lost HTTP response or manual retry can produce duplicate events even though the UI disables repeat submissions after confirmed receipt. Do not count raw log lines as distinct user feedback. Group by `(traceId, version)` and retain the latest verified score; do not sum stdout and Langfuse observations as separate users. Langfuse retains its existing stable score ID. Cross-request durable deduplication was not added and is not claimed. Cloud Logging retrieval and authenticated end-to-end user testing remain deployment verification tasks.

## Checks

- `node scripts/briefing-feedback-delivery-check.cjs`: pass; issuing-version preservation across deployments, client-version ignored, legacy/tamper/owner rejection, stdout callback/throw failures, Langfuse failure/success combinations, route 202/503/404, and log field exclusion.
- `node scripts/briefing-check.cjs`: pass, including expiry/trace/owner protections.
- `node scripts/briefing-integration-check.cjs`: pass with async mocked stdout acknowledgement.
- `npx tsc --noEmit --incremental false`: pass.

Changed files are feedback.ts, observability.ts, briefing issuance/feedback routes, feedback UI text/state, related tests and these separate deployment documents. Frozen evaluation manifests and v1/v2 artifacts are untouched.
