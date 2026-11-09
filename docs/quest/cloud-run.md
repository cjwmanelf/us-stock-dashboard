# Cloud Run container preparation (Q608)

Prepared only: this worker has not pushed an image, created a service, changed IAM, or modified the production environment. The user selected project `vast-incline-499901-j3` (My First Project, number `382627637687`); the coordinator confirmed billing linkage and is provisioning APIs. Planned new service: `modu-rich-quest06`, preferred region `asia-northeast3`; Vertex location `global`. The coordinator owns all cloud provisioning/deployment and must finalize the repository, runtime identity, secret versions and access mode. No parallel remote mutations by this worker.

## Files and execution

Node 24 Debian slim builds Next 16 standalone output, then copies only traced runtime files, static assets and public assets to the runtime stage. The process runs as the image's unprivileged `node` user; `node server.js` listens on `0.0.0.0:$PORT` (8080 locally, Cloud Run supplies PORT). No startup shell or secret build arguments are used. Rebuild with `--pull` for current Node 24 security updates; record the resulting image digest for release evidence. Linux amd64 is explicit.

Copy `scripts/cloud-run/config.example.json` outside the repository, replace every placeholder, and keep only public values and Secret Manager references in it. The anon key must be an anon-role JWT or publishable key, never a service-role/secret key. NEXT_PUBLIC values are baked into browser bundles at build time; changing them requires rebuilding. The same config supplies runtime values. Do not promote an image between different Supabase projects.

From the repository root:

```powershell
# These print commands and make NO external calls.
node scripts/cloud-run/build.mjs C:/approved/cloud-run.json
node scripts/cloud-run/deploy.mjs C:/approved/cloud-run.json

# Only after target approval and Docker daemon availability:
node scripts/cloud-run/build.mjs C:/approved/cloud-run.json --execute
node scripts/cloud-run/deploy.mjs C:/approved/cloud-run.json --execute
```

The build command builds locally only. The deploy command checks the exact project/region for an existing service name and refuses to overwrite it, configures the local Docker registry credential helper, pushes to the explicitly selected existing repository, then deploys an initially fail-closed revision, reads the newly created service status URL, validates its exact HTTPS run.app origin, and updates only BRIEFING_ALLOWED_ORIGINS on that new service. Repeat a failed pre-creation attempt with the same settings; a new release after service creation needs a new service name/tag, followed by separately reviewed cutover. This intentional new-service workflow never updates the Vercel deployment, DNS, Supabase settings, or another Cloud Run service. It does not provision projects, repositories, APIs, secrets, service accounts, or IAM. Cloud Build is not required; do not substitute an unreviewed source deploy.

Defaults: service and revision min 0/max 1, one CPU, 512Mi (optional 1Gi), concurrency 8, request timeout 300s, request-based CPU allocation. The provider currently has its own shorter timeout. Cloud Run maximum-instance settings are not a hard spending cap and transient excess instances can occur; use budgets and billing monitoring separately. An instance filesystem is ephemeral; do not use local capture files as persistence.

## Secrets and identities

`secrets` accepts only these runtime variables with `secret-name:NUMERIC_VERSION` references: SUPABASE_SERVICE_ROLE_KEY, STOCK_API_KEY, MARKETAUX_API_KEY, CRON_SECRET, BRIEFING_FEEDBACK_SECRET, BRIEFING_LLM_API_KEY. No secret values go in config, Docker args, source, logs, or shell arguments. Grant the dedicated runtime service account `roles/secretmanager.secretAccessor` on each required secret individually, not project-wide. Pin versions; rotate by a reviewed new deployment. Use separate credentials/secrets for this service when possible. Only configure service-role/cron keys if the corresponding features are intended.

The deployer needs scoped Cloud Run deployment permissions, Artifact Registry write access to the selected repository, and `iam.serviceAccounts.actAs` on the runtime identity. It does not need to impersonate runtime credentials for the app. Do not grant runtime Owner/Editor, deployment permissions, or broad Secret Manager access. Repository creation and enabling Run/Artifact Registry/Secret Manager/Vertex APIs are approval-dependent prerequisites, not script side effects.

For the Q609 Vertex adapter, public `env` configuration is:

```json
{
  "BRIEFING_LLM_PROVIDER": "vertex",
  "BRIEFING_VERTEX_PROJECT_ID": "approved-project-id",
  "BRIEFING_VERTEX_LOCATION": "global",
  "BRIEFING_VERTEX_AUTH": "adc",
  "BRIEFING_LLM_MODEL": "google/APPROVED-GEMINI-MODEL"
}
```

Choose an actually supported approved model; this example is deliberately not deployable as-is. The attached runtime identity supplies short-lived tokens through ADC/metadata. Do not set GOOGLE_APPLICATION_CREDENTIALS, upload JSON service-account keys, pass a local access token, or configure BRIEFING_LLM_API_KEY/BASE_URL for Vertex. Grant only the required Vertex prediction permissions in the explicitly selected Vertex project (typically the predefined `roles/aiplatform.user`; consider a tested custom role for only required prediction calls). IAM alone does not implement Vertex support: Q609's provider adapter and production dependency must be included in the final image. Model availability, project API enablement/quota and a live authenticated request remain deployment checks.

No Langfuse credentials are known. The script forces LANGFUSE_ENABLED=false, LANGFUSE_CAPTURE_CONTENT=false, BRIEFING_EVAL_MODE=false and BRIEFING_TRACE_CONTENT=false and does not accept evaluation/token/capture or Langfuse secrets. Any future telemetry enablement needs a separate reviewed change. Supabase login, session validation and RLS are unchanged.

## Ingress authentication and isolation

Set `access` explicitly to `private` or `public`. Private keeps the Cloud Run IAM invoker gate: callers need Cloud Run invocation permission and an identity token, which is separate from Supabase login. A normal browser cannot reach the login screen through that gate without an appropriate authenticated proxy. Public allows unauthenticated network access so the browser can load login/assets; application routes still enforce existing Supabase authentication. Do not disable Supabase checks to solve Cloud Run ingress failures. Ingress is all; use private access during initial checks unless public access was explicitly approved.

After approval and deployment, separately review Supabase site/redirect allowlists for the new HTTPS URL, password-reset/auth callback flows, and any game CORS origins. Vercel cron schedules are not transferred by a container deploy; Cloud Scheduler provisioning, invoker auth and CRON_SECRET handling require separate work. Do not change production callback settings or route user traffic until validation passes.

## Artifact exclusions and checks

Both ignore files begin with an allowlist: package manifests, compiler config, `src`, `public` and Docker inputs only. Docs, tests, scripts, raw evidence, private files, `.env*`, `.vercel`, `.briefing-eval`, node_modules, local build output and credential/key files are excluded. Nested private/raw/evidence and common credential filenames are denied again after source allowances. Never put credentials in source code or public assets; filename rules cannot detect arbitrary embedded secrets. The final image never copies the builder's original source tree or development node_modules wholesale.

`gcloud meta list-files-for-upload` is a local-only upload preview; inspect it before any future source upload. Docker builds apply `.dockerignore` independently. The provided workflow pushes only the built image. Public assets and source code intended for compilation still require ordinary secret review.

Before cutover, verify image user is nonroot; bind a non-default PORT; request login and static assets; confirm unauthenticated protected API responses; test a Supabase authenticated briefing; check Vertex runtime identity/quota; ensure no eval snapshots or raw-content telemetry; record image digest and service/revision identity. These are not claims of completed cloud testing.

## References

Read installed Next 16.2.10 documentation at `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md` and `01-app/02-guides/environment-variables.md` before implementing. Official documentation checked 2026-11-09:

- [Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract)
- [Runtime secrets and secret IAM](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity)
- [Deploy container images](https://docs.cloud.google.com/run/docs/deploying)
- [Vertex access control](https://docs.cloud.google.com/vertex-ai/docs/general/access-control)

## Validation record — 2026-11-09

- Node v24.18.0, Next 16.2.10: refreshed final source/package lock (including google-auth-library 11.3.3), isolated TEMP directory, `npm ci`, `next build`: PASS (compiler, TypeScript, 21 static-generation entries, standalone server produced). No production env files copied or loaded; only placeholder public Supabase configuration was used. Initial transient missing-dependency failure was resolved by refreshing after Q609 install.
- Standalone process bound `0.0.0.0` with custom PORT values; `/login` and `/logo.png`: 200. No `.env*`, `.vercel`, `.briefing-eval`, private/raw/evidence paths found in standalone output. Child processes were stopped after testing.
- **Origin compatibility issue fixed in follow-up:** the original request.url/bind-host comparison rejected browser-facing origins in standalone. The shared authentication helper now uses the exact configured origin allowlist described below. Local standalone tests for both APIs now reach 401 for configured origins and reject other origins with 403; live authenticated Cloud Run behavior still requires validation.
- Build/deploy JS syntax and dry runs: PASS. Seven configuration cases passed: ordinary config and Vertex ADC accepted; eval mode, local Vertex token, `latest` secret reference, secret Supabase key and missing project rejected. Windows gcloud launcher verified with local `gcloud version`; local upload preview contained only allowlisted build inputs.
- **Docker limitation:** `docker info` cannot connect to `dockerDesktopLinuxEngine` (named pipe absent). No Docker image build/runtime/nonroot test completed; local Windows standalone success does not prove Linux image build success. Docker was not started globally. Run the actual image build and smoke tests after daemon availability or a separately approved cloud-build workflow.
- **Remaining deployment work:** target project and new service are selected above; runtime identity/repository, secret versions, access mode and approved Vertex model remain coordinator configuration. This worker performed no remote cloud mutations, deployment, IAM changes, image push, production environment edits or Langfuse setup.


## Explicit briefing origins (follow-up fix)

Both `/api/briefing` and `/api/briefing/feedback` use the same `authenticate` helper. Set server-only `BRIEFING_ALLOWED_ORIGINS` to a comma-separated list of exact canonical origins, for example `https://modu-rich-quest06-PROVIDER-ASSIGNED.run.app`. Use the actual URL returned by Cloud Run, never this placeholder or a guessed hostname. Entries must be origins only: no slash/path (including trailing slash), username/password, query, fragment, wildcard, opaque/null origin, or noncanonical port notation. Production entries require HTTPS. HTTP is accepted only for localhost, 127.0.0.1 or [::1] outside Cloud Run, enabling local standalone smoke tests. A malformed entry rejects the entire configuration.

When any Cloud Run provenance variable (K_SERVICE, K_REVISION or K_CONFIGURATION) is present, a missing allowlist rejects all briefing POSTs. An explicitly empty allowlist also rejects all requests. Outside Cloud Run only, absent configuration falls back to the validated request.url origin (HTTPS or local loopback HTTP). Host, Forwarded and X-Forwarded-* never establish trusted origins. A configured origin only passes the CSRF boundary: Supabase getUser still verifies the session and rejects unauthenticated callers.

The deploy script creates the new service without an allowlist, queries that same service with explicit project and region, validates status.url as an exact HTTPS run.app origin, and issues a scoped services update for BRIEFING_ALLOWED_ORIGINS. Until the update succeeds, briefing POSTs stay blocked; login/static assets can load. If the describe/update stage fails, the coordinator should inspect the created service and retry only the origin update after verifying its URL, rather than rerun the new-service deployment or delete resources. The scoped recovery command is:

```powershell
gcloud run services update modu-rich-quest06 --project vast-incline-499901-j3 --region asia-northeast3 --update-env-vars BRIEFING_ALLOWED_ORIGINS=https://EXACT-VERIFIED-SERVICE.run.app
```

This is documentation only and has not been executed. Additional custom-domain origins require an explicit reviewed allowlist update; never derive them from request headers. The application variable must be provided at runtime, not as a public build argument.

Follow-up validation: `node scripts/cloud-run/origin-check.cjs` passed 40 origin cases plus both route wiring and mocked getUser enforcement; `tsc --noEmit --incremental false` passed; refreshed isolated Next standalone build passed. `node scripts/cloud-run/origin-smoke.mjs PATH_TO_STANDALONE` passed 36 real HTTP checks covering configured Cloud Run provenance, missing Cloud Run configuration, local standalone loopback, login/static assets, both API routes, cross-origin/null/missing origin and spoofed Host/forwarded headers. Existing briefing security checks also passed. Docker daemon and live-cloud limitations remain unchanged.


## Public reproduction versus private execution records

Use the public [environment template](../../.env.briefing.example), [config example](../../scripts/cloud-run/config.example.json), [build script](../../scripts/cloud-run/build.mjs) and [deploy script](../../scripts/cloud-run/deploy.mjs). Keep the populated config outside the repository; use only public build values and pinned Secret Manager references. Read UTF-8 env files with the leading BOM stripped before parseEnv, and reject missing/undefined/null or non-HTTPS Supabase URLs before building. Contract and prompt versions come from the frozen source, not a fixed example label; experiments in progress are not approved releases.

From a clean Node24 checkout, after installing the lockfile dependencies, the following commands only preview Docker/gcloud operations:

```powershell
node scripts/cloud-run/build.mjs PATH_TO_PRIVATE_CONFIG.json
node scripts/cloud-run/deploy.mjs PATH_TO_PRIVATE_CONFIG.json
```

Only a separately approved target/release permits adding --execute. A real build also needs Docker, and deploy requires an existing approved repository/runtime identity/secret permissions. The deploy script refuses pre-existing service names and sets the new service canonical origin after creation. It does not load .env.local or transfer secrets into build args.

Current generic deploy.mjs does not yet accept ANTHROPIC_API_KEY in its secret-reference allowlist. Do not claim that passing the Anthropic template alone reproduces a fully configured service. For a separately approved new Anthropic deployment, after the generic flow has created the reviewed service, the operator must make this explicit runtime-only configuration step (placeholders below; not executed by this documentation task):

```powershell
gcloud run services update SERVICE --project PROJECT --region REGION --update-secrets ANTHROPIC_API_KEY=SECRET_NAME:NUMERIC_VERSION --update-env-vars BRIEFING_LLM_PROVIDER=anthropic,BRIEFING_LLM_MODEL=claude-haiku-5-5
```

Use an existing Secret Manager secret/version accessible only to the intended runtime identity. The CLI argument contains a reference, never the key value. Do not reuse this example to modify current baseline traffic without a later deployment instruction. BRIEFING_ALLOWED_ORIGINS must remain the exact verified HTTPS service URL, with no trailing slash; the first trusted origin is also the canonical auth callback origin. Local HTTP examples are limited to loopback and must match the browser address exactly.

The environment template keeps eval/content capture and Langfuse disabled. Sanitized stdout metadata logging is source-controlled and independent of LANGFUSE_ENABLED; there is no invented environment switch for it. Its presence in the checkout is not evidence that a historical deployed image contains it. Optional Langfuse APP_VERSION/prompt labels must be filled from the finally approved source if that integration is enabled later.

The four baseline one-off scripts named in [deployment verification](deployment-verification.md#private-evidence-and-scripts) remain on the operator machine but are excluded by exact .gitignore paths. Their fixed build IDs and private temporary evidence state are historical execution records, not prerequisites for public reproduction. Original private evidence is preserved under logical identifier quest06-baseline-deployment-evidence; public documentation does not expose the user's local account path. Public docs/quest/evidence CSV/JSON hashes and synthetic evaluator fixtures remain eligible for Git inclusion; private/ and raw/ directories at any depth do not.
