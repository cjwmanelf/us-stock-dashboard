# Main Quest evaluation tools

Canonical integrated tools for the briefing-v1 API. Node 20+; no runtime dependencies or package installation. Run from this folder:

```sh
node --test
node smoke.mjs
node src/cli.mjs collect --version briefing-v1
```

Tests and smoke are offline, using fabricated responses and mocked fetch. The collector defaults to dry-run (zero requests). Nine SHA-256-frozen synthetic cases cover six development and three held-out inputs; these are not actual market observations or product-quality results.

See [Korean runbook](../../docs/quest/evaluation-runbook.md) for exact configuration, private capture schema, local token isolation, joining, replay, and deployment checklist. See [Main Quest report](../../REPORT.md) and [validation](../../docs/quest/validation.md) for evidence and blockers. UPSTREAM-REPORT.md is an archived pre-integration record; its gap descriptions are historical, not the current app contract.

## Commands

- `collect`: requires explicit `--live` for network. Cookie/endpoint come from BRIEFING_EVAL_COOKIE / BRIEFING_EVAL_ENDPOINT. `--local-eval --allow-local-http` adds the secret BRIEFING_EVAL_REQUEST_TOKEN header only to loopback HTTP, with a cookie; token is never an argument or snapshot field. Other endpoints reject local-eval.
- `snapshot --input private/import.json --out private/baseline`: imports an explicitly observed or synthetic envelope to SHA-256-addressed write-once files; reads verify integrity.
- `join --input private/raw --evidence ../../.briefing-eval --out private/frozen`: joins independently captured pre-generation inputs by UUID, matching request/asOf/origin/version. Failure records remain in the original run and must not disappear from reported denominators.
- `report --input private/frozen`: exports counts and hashed trace references, not raw answers or credentials. Operational auth/rate/transport errors remain separately counted and cannot become model-quality candidates. Malformed successful responses remain contract issues.
- `compare --baseline private/baseline --candidate private/candidate`: pairs identical request/evidence/asOf/caseId/split, requires confirmed distinct versions, valid matching frozen dates, and unique observed trace/conversation IDs. It checks metadata; manual semantic review is required.

Missing independent evidence stays pending. Source fidelity means exact supplied title/URL/kind and source IDs; date fidelity includes null values and frozen asOf; ticker fidelity requires original per-source attribution. Contract checks require UUID trace IDs and parsed credential-free HTTPS source URLs. No-data behavior and declared fresh version are checked separately. A cited source does not establish that every claim follows from it.

Raw snapshots retain sensitive content and must stay under ignored private/. The app sink uses its separately ignored .briefing-eval folder. Do not substitute redacted telemetry for raw provider input. Do not classify fixture mutations or review regression tests as observed product failures. Live calls can incur provider costs and were not run in this task.

### Local frozen replay

The complete local runner is `node replay.mjs --baseline <local-service.ts> --candidate <different-local-service.ts> --cases <frozen-cases.json> --limit 3`. Without `--live` it only validates the supplied sources and inputs. See [the Q606 runbook](../../docs/quest/evaluation-runbook.md#q606-local-frozen-replay-runner-2026-11-09) for private artifact preparation, explicit live invocation, call limits and failure handling. It invokes the actual service hook and needs the root project's installed TypeScript dependency. No production replay endpoint or authentication bypass is introduced.
