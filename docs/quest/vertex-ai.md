# Vertex AI briefing provider

Status: implemented and tested offline; project selection, billing, API enablement, IAM and model availability remain unverified. No paid generation or remote configuration is performed by these checks.

Set server-only configuration explicitly:

```dotenv
BRIEFING_LLM_PROVIDER=vertex
BRIEFING_VERTEX_PROJECT_ID=YOUR_SELECTED_PROJECT_ID
BRIEFING_VERTEX_LOCATION=global
BRIEFING_LLM_MODEL=google/YOUR_VERIFIED_GEMINI_MODEL_ID
BRIEFING_VERTEX_AUTH=adc
```

Do not set `BRIEFING_LLM_BASE_URL` or `BRIEFING_LLM_API_KEY` for Vertex. Configuration rejects either override. The endpoint is generated exclusively as `https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/endpoints/openapi/chat/completions`; project and Gemini model identifiers are validated, redirects are rejected, and tokens are never included in traces or returned errors. Only global location is currently supported. Model has no default: the coordinator must verify a low-cost available model in the selected project before an authorized smoke request. The official compatibility and migration examples currently show differing Flash versions, so a sample name is not proof of project access.

Cloud Run uses the attached runtime service account through Application Default Credentials (ADC). `google-auth-library` retains its auth client and retrieves an access token for each generation, refreshing expired credentials automatically. Use service identity/ADC; do not create or deploy service-account JSON key files. The runtime identity needs permission to invoke the selected Vertex model, and the selected project needs working billing, quota and the Vertex API enabled; this implementation neither assumes nor changes these prerequisites.

Local runs can use existing ADC without starting a browser login. Alternatively, an operator may supply an already-authorized short-lived gcloud access token via `BRIEFING_VERTEX_ACCESS_TOKEN` with `BRIEFING_VERTEX_AUTH=local-token`. Never print, persist, commit or paste that token into reports. This mode is rejected on Cloud Run (`K_SERVICE` or `K_REVISION`) and Vercel; it does not refresh and the operator must replace it after expiration. A token without explicit local-token mode is rejected. No token acquisition occurs for missing/invalid config or empty evidence.

Direct OpenAI-compatible configuration remains the default (`BRIEFING_LLM_PROVIDER=direct` is optional). Vercel OIDC is used only for the exact existing gateway base URL; it is never used as a Google credential.

The prompt, output citation validation, response size limit, usage fields and generation error spans are unchanged. Authentication errors are captured as `GENERATION_UNAVAILABLE` inside the generation span without disclosing credential error text.

Content evaluation capture and paired replay reject Cloud Run as well as Vercel. The service loader disables real ADC access by default; paired replay enables it only with explicit live mode. Mock and dry-run checks cannot authenticate through Google. Local replay still requires existing private output and synthetic fixture guards; there is no public replay endpoint or authentication bypass.

Offline checks:

```sh
node scripts/briefing-vertex-check.cjs
node scripts/briefing-check.cjs
npx tsc --noEmit --incremental false
node --test tools/quest-evaluation/test/*.test.mjs
```

Primary documentation consulted 2026-11-09:

- [Google OpenAI compatibility and global endpoint](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/openai)
- [Google OpenAI-compatible examples](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/migrate/openai/examples)
- [Google Auth Library for Node.js](https://docs.cloud.google.com/nodejs/docs/reference/google-auth-library/latest)

No model generation is part of the test script. Real billing/model smoke verification must be recorded separately before claiming a working deployed integration.

## Q609 verification

- `npx tsc --noEmit --incremental false`: pass.
- `node scripts/briefing-check.cjs`: pass (existing OIDC, guards, evaluation security).
- `node scripts/briefing-vertex-check.cjs`: pass (fixed token destination, malformed/missing config, installed OAuth client expiry refresh with mocked refresh transport, per-call token lookup, local/cloud token restrictions, no token retrieval for empty evidence, validated response/usage, auth error span, invalid citations, Cloud Run capture/replay rejection, offline ADC disabled).
- `node --test tools/quest-evaluation/test/*.test.mjs`: 24/24 pass.
- No Next build run by Q609; Q608 owns final standalone build verification.
- `google-auth-library` 11.3.3 installed and lockfile updated. npm installation reported 18 overall dependency audit findings (9 moderate, 8 high, 1 critical); not attributed to the new dependency and not remediated in this narrow task.

Changed scope: `src/lib/briefing/provider-config.ts`, new `vertex-provider.ts`, two narrow lines in `service.ts`, Cloud Run guards in `evaluation-auth.ts`, `package.json`/`package-lock.json`, new `scripts/briefing-vertex-check.cjs`, this document, and coordinator-approved narrow edits in `tools/quest-evaluation/src/service-loader.mjs` and `replay.mjs`. Existing Langfuse/other working-tree edits were preserved. Prompt and model default remain unchanged/unset.
