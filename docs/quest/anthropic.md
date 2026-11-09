# Anthropic Claude briefing provider

Implemented with native server-side HTTP, no new dependency. Verification is offline only: no key file has been read, no Anthropic/Google inference or model-discovery request has been made, and no cloud state has been changed. Cloud Run remains the deployment target (`vast-incline-499901-j3`); using Anthropic does not require Vertex inference billing.

## Runtime configuration

```dotenv
BRIEFING_LLM_PROVIDER=anthropic
BRIEFING_LLM_MODEL=<exact Claude model id selected from your account's model list>
ANTHROPIC_API_KEY=<secret supplied by the operator>
```

There is no default model. Do not set `BRIEFING_LLM_BASE_URL`, `ANTHROPIC_BASE_URL`, or `BRIEFING_LLM_API_KEY` with this provider: these overrides cause configuration rejection. Existing Vertex/direct branches remain available by explicitly choosing their provider. Neither Google credentials nor Vercel OIDC are used for Anthropic.

The user is saving the key in ignored `.env.anthropic.local`. The application does not automatically read this custom filename. The coordinator must load it privately into the process environment after the user confirms saving, without printing/copying it, and separately supply provider/model configuration. Cloud Run needs the same runtime variables, with the key injected through the deployment's secret mechanism rather than bundled into source or the container. Deployment and real credential loading are outside this worker's task.

## Model discovery and first real check (coordinator only)

Use an authenticated `GET https://api.anthropic.com/v1/models?limit=100` with `x-api-key` from the private process environment and `anthropic-version: 2023-06-01`; reject redirects. Follow `has_more` using the last returned ID as `after_id` while retaining the exact same trusted origin. Select an available low-cost model deliberately and set its exact `data[].id` as `BRIEFING_LLM_MODEL`. The models list establishes availability, not price or successful generation; consult current official pricing before selecting. Do not infer a model ID from a model family name or assume sufficient account credit.

After selection and authorization, run one bounded real service generation on public evidence and inspect actual status/citations, usage, spans and provider failure outcome. Keep the existing prompt unchanged until observed baseline evidence supports an improvement. These steps have NOT been performed by this worker.

## Request and response contract

- Fixed POST destination: `https://api.anthropic.com/v1/messages`; `x-api-key`, `anthropic-version: 2023-06-01`, JSON content type. Redirects are rejected. No bearer header or user-controlled endpoint is used.
- Existing system prompt is moved unchanged into the Messages `system` field; the same serialized question/evidence is the user message. `max_tokens=1000`, `stream=false`; no tools, sampling overrides, automatic retries or prompt changes.
- The existing 15-second signal and 65,536-byte response cap cover request/body reading. Only complete assistant messages ending with `end_turn` and text blocks are accepted; refusal, truncation and unexpected block types fail closed. Text blocks are concatenated and strictly parsed as JSON, then existing answer length, source IDs, citation and URL checks run unchanged. Markdown fences and prose around JSON are not silently repaired.
- Usage preserves native `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` when reported as nonnegative integers. Normalized prompt tokens include uncached input plus cache creation/read; completion tokens use output, and total is their sum. Missing usage is not fabricated as zero. Cache usage reaches the telemetry adapter through a narrow bridge/type allowlist addition; no dollar costs are guessed.
- Authentication/network/HTTP/parsing failures remain sanitized `GENERATION_UNAVAILABLE` with an error generation span. Upstream error text and API keys are not logged. Reported usage is retained even if the subsequent response validation fails.
- Real-service evaluation loader already supports sibling helper modules; replay now whitelists Anthropic configuration and requires its key only for live/mock operation. Dry run makes no requests. Cloud Run and Vercel local evaluation guards remain intact; no public capture or auth bypass is added.

## Offline verification

- `npx tsc --noEmit --incremental false`: pass.
- `node scripts/briefing-check.cjs`: pass.
- `node scripts/briefing-vertex-check.cjs`: pass.
- `node scripts/briefing-anthropic-check.cjs`: pass, real service with mocked native Messages transport, fixed destination/headers, exact prompt equivalence to direct provider, missing/invalid config, usage/cache, split text, truncation/refusal/tool blocks, invalid citations/JSON, oversized response, HTTP errors and timeout.
- `node scripts/briefing-telemetry-check.cjs`: pass, memory spans only.
- `node --test tools/quest-evaluation/test/*.test.mjs`: includes a new Anthropic paired-replay test with synthetic provenance and dry-run/missing-key zero-call checks.

No real model success is claimed and no production build/deployment was performed in this task. Package files and environment files are unchanged by this task.

## Primary references checked 2026-11-09

- [Messages API](https://platform.claude.com/docs/en/api/messages/create)
- [API overview and authentication](https://platform.claude.com/docs/en/api/overview)
- [API versioning](https://platform.claude.com/docs/en/api/versioning)
- [2026-10-21 migration notes](https://platform.claude.com/docs/en/api/migration-2026-10-21)
- [List models](https://platform.claude.com/docs/en/api/models/list)

Changed scope: new `src/lib/briefing/anthropic-provider.ts`, `provider-config.ts`, narrow request/response adaptation in `service.ts`, native/cache usage fields in `types.ts`, `observability.ts` and `telemetry/adapter.ts`, replay environment/key handling, new offline test script, one replay regression test, and this report. Prompt text is unchanged (verified through both request paths).

Coordinator update: root independently reported successful model discovery and a native smoke for `claude-haiku-5-5`; set `BRIEFING_LLM_MODEL=claude-haiku-5-5` explicitly for the upcoming baseline. The adapter pins the still-documented `2023-06-01` API version used by that root smoke, rather than silently upgrading its verified contract to the newly documented 2026-10-21 version. These real calls were performed by root, not this worker; this worker has not read the key or issued inference. All 25 evaluator tests passed.
