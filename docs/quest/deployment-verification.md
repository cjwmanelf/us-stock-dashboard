# Cloud Run baseline deployment verification

## Citation UI release ? current live revision

The explicitly requested citation-button/dialog UI is deployed. This supersedes the previous v6 revision in the historical records below; it does not change the model/prompt/inference gate.

- URL: https://modu-rich-quest06-fyzai5fn7a-du.a.run.app
- Revision: **modu-rich-quest06-v6-ui-20261109**, Ready at 2026-11-09T03:33:42.747564Z, 100% traffic observed 2026-11-09T03:33:45.590Z.
- Image: asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing@sha256:13567eff66569a7da6a5d3198b222e8a6243b726fdbcf650877893688240512b
- Tag: asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing:v6-citation-ui-20261109
- Cloud Build: 0b3bf33e-9490-4c5e-b699-2d0a6eeebedb, SUCCESS, finished 2026-11-09T03:33:25.832176Z.
- Source archive: gs://vast-incline-499901-j3-quest06-build/source/1794195089.779182-3780e267dd494e98acddbbac5cda1844.tgz, generation 1794195091475094.
- Archive SHA-256: 304929fdcd4dec551881346748ac26d34e1598299e993b06200ddb05ac885b1c.
- Full source manifest aggregate: b7d36eceed53b8ed412687afffd829e038a4a395398c43bf821e956aebfb4b63 (SHA-256 of JSON.stringify(files) in the private stored manifest's recorded order).
- Rollback preserved: modu-rich-quest06-v6-20261109, sha256:ed253c7921dcad7b2c8f3845a65c4dd33cb64504669a2f2b07da35a3bd2993cf.

Before building, approved UI hashes and the entire frozen v6 inference manifest were checked. Comparison against the actual previous v6 source archive found exactly two changed/added files and no removals; every other uploaded file is byte-identical.

| File | Approved and uploaded SHA-256 |
| --- | --- |
| src/components/BriefingForm.tsx | 4a0add509f4c9998bbfbf5b097a1343a25d256fb70b2486ea6c088c5ca84e826 |
| src/components/BriefingCitations.tsx | 925dbaf286a8d1915aa5bbdb3cc23dd2fa819d78e3ec2e08346e771f610b62c6 |
| src/lib/briefing/service.ts | 2215a3872265b4770aa4f3a3812d687643b30b0edaae674d07487af19506a970 |

The frozen v6 inference artifact remains 3ace4794db84368aa2350ada962e5d6bad4c4dcd85f21a7bdc8c9a8040742753, version briefing-v6-temporal-notice. Existing v6 independent evaluation and production comparison results remain evidence for the unchanged inference implementation; they are not relabeled as new UI-revision measurements.

Both staged source and downloaded upload were checked: all 92 file hashes matched, no forbidden env/private/raw/local dependency paths were included, and private-key patterns/known local secret values were excluded. Only BOM-stripped, validated public Supabase values were supplied as build args using a private config. Existing dedicated build identity/bucket/registry were reused.

Deployment changed only the image and requested revision suffix. The entire runtime template spec excluding image compared equal before/after: runtime identity, secret refs, provider/model, resources, timeout, concurrency and environment preserved. All four existing secret references stayed pinned to version1; eval/content/Langfuse flags remained false; allowed origin remained the exact public HTTPS URL. The old v6 rollback revision/digest still exists.

At 2026-11-09T03:34:32.672Z, **15 unauthenticated security HTTP checks passed**: public home/login/static200; protected pages307; canonical auth callbacks including encoded external-next probes; briefing missing-session401 and cross/missing/spoofed-origin403; cron401. No model, browser or feedback call was made by this worker.

Root was notified immediately on Ready and owns the separately recorded authenticated fresh-AAPL UI smoke, citation/original-source buttons, dialog and mobile checks. Those UI checks are pending root evidence here, not claimed by build/deployment success. Private frozen source, upload audit, configuration equality, build metadata and HTTP results are preserved under logical identifier **quest06-v6-citation-ui-release** outside the public repo. No source/REPORT/Git change was made during this deployment.


## v6 release verification ? current live revision

The root coordinator approved the independent v6 gate (20/20 development and 10/10 new held-out) and initiated deployment. This worker performed read-only verification only: **no redeployment, model/browser/feedback call, source modification, or Git operation**. The historical sections below are superseded by this live-state record.

- Service URL: https://modu-rich-quest06-fyzai5fn7a-du.a.run.app
- Live revision: **modu-rich-quest06-v6-20261109**, Ready=True at 2026-11-09T03:20:26.559563Z; 100% traffic.
- Image: asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing@sha256:ed253c7921dcad7b2c8f3845a65c4dd33cb64504669a2f2b07da35a3bd2993cf
- Cloud Build: 405955c5-572a-415c-b5c9-981da6c5d247, SUCCESS, completed 2026-11-09T03:14:13.034523Z.
- Application version: briefing-v6-temporal-notice; prompt version: briefing-prompt-v5-partial.
- Frozen artifact SHA-256: 3ace4794db84368aa2350ada962e5d6bad4c4dcd85f21a7bdc8c9a8040742753.
- Actual source archive: gs://vast-incline-499901-j3-quest06-build/source/1794193941.843466-4c6cc3a232c14c3e80c815c688a133bc.tgz, generation 1794193943386285.
- Downloaded archive SHA-256: 20ef1f6f95f24e817285c3bb675d12440664f483ba7ca81df99f38e9b62d2588.

All 14 inference files in the actual build archive matched the frozen q610-v6-source manifest, including:

| File | Archive SHA-256 |
| --- | --- |
| src/lib/briefing/anthropic-provider.ts | f5e365ba2e86f6c47aadab062ef64b4064102a45d06ed6c83cdd23bcda4c00ff |
| src/lib/briefing/provider-config.ts | 1814bff2dc8d5d7c22c0a37e027f0992af6b395c167c2049fa346a50539a0fd0 |
| src/lib/briefing/service.ts | 2215a3872265b4770aa4f3a3812d687643b30b0edaae674d07487af19506a970 |
| src/lib/briefing/types.ts | ddb2b02a3590bfae5231a946bbec7ab301152a31222fe6fde3344bfea39abf20 |
| src/lib/briefing/vertex-provider.ts | 30c9f2c71dfdb475485539f634b39a1f6f634e06e024c167d08ee5617d6fd398 |

Downloaded archive verification scanned 91 files: zero forbidden private/raw/env/local-dependency paths, credential artifact paths, known private env secret-value matches or credential-pattern matches. The archive was downloaded/extracted only in operator-private storage; no keys or local account paths are published.

Runtime identity is quest06-runtime in the target project. All four existing secret references remain pinned to version1 (quest06-anthropic, quest06-stock, quest06-marketaux, quest06-feedback), with no secret value reads. Provider/model remain anthropic/claude-haiku-5-5. Eval mode, trace content, Langfuse content and Langfuse enable flags are all false; allowed origin equals the exact HTTPS service URL. CPU1, 512Mi, concurrency8 and timeout300 were verified. Service/revision maxScale are explicitly1; minScale is absent in the returned specification, retaining the platform default0 (not an explicitly stored minScale annotation).

At 2026-11-09T03:22:31.010Z, all **15 unauthenticated HTTP checks passed**: home/login/static200; protected pages307 to login; canonical auth-confirm error redirects including encoded external-next probes; briefing same-origin without session401, cross-origin/missing-origin/spoofed-forwarded-host403; cron endpoints401. To honor the explicit no-feedback instruction, the two historical feedback probes were replaced with missing-origin and forwarded-header briefing rejection probes. No feedback endpoint or authenticated generation request was invoked.

Rollback revision **modu-rich-quest06-00004-72l** still exists with digest **sha256:362e80cb075d867953a42d38a078d7c98b64e7a11cbcc69feada3419eeba4b04**. It was neither deleted nor modified. Actual candidate conversations and trace/usage/stage joins remain root-owned follow-up; this verification does not claim those calls have occurred.

Private proof identifier: **quest06-v6-release-verification**. Retained records include raw build/service metadata, pinned-generation archive, per-file frozen-source comparison, secret-reference/configuration summary, credential scan and HTTP results.


## Baseline-observed deployment ? current as of 2026-11-09T02:57:47.543Z

The live service remains application VERSION **briefing-v1**. It is an instrumentation/auth-only artifact rebuilt from the original baseline source archive, not the current candidate app relabeled as baseline. The root coordinator confirmed the user session separately; this worker made no authenticated/model requests.

- URL: https://modu-rich-quest06-fyzai5fn7a-du.a.run.app
- Active revision: modu-rich-quest06-00004-72l, 100% traffic.
- Image: asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing@sha256:362e80cb075d867953a42d38a078d7c98b64e7a11cbcc69feada3419eeba4b04
- Deployment observed UTC: 2026-11-09T02:57:47.543Z.
- Previous revision preserved: modu-rich-quest06-00003-sfx.
- Previous digest preserved: sha256:462e55493caf9858bb3d0af23b71ad1c9bd6c08a8a23e8e0db45d37516527bd5.
- Runtime environment/secret references/provider/model/origin were compared before/after and are unchanged. Eval/content capture and Langfuse stay disabled; resources remain min0/max1, CPU1, 512Mi, concurrency8, timeout300.

Rollback, only if explicitly required by the operator:
`gcloud run services update-traffic modu-rich-quest06 --project vast-incline-499901-j3 --region asia-northeast3 --to-revisions=modu-rich-quest06-00003-sfx=100`

### Separate build artifacts

- **v4**: Cloud Build 1ab8972d-af1b-4a9c-9008-6e189a8c99ad, SUCCESS, finished 2026-11-09T02:57:02.297311Z; image tag asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing:v4-20261109; digest sha256:047d2d95fb4fedb8b6b95ba17f99d6444453d266e7e354b0318f8ca51b706da6. Source archive gs://vast-incline-499901-j3-quest06-build/source/1794192908.846457-67a2c46fd65e4fe49b9d39ceb2c44958.tgz, generation 1794192910416299; downloaded archive SHA-256 3abe9ac78986c56c4e2e8eaba5104b4b14550f252902294bc49ad48dd2fe8ab7.
- **baseline-observed**: Cloud Build d4a1f2e1-7673-4c78-85c5-95e47623ed80, SUCCESS, finished 2026-11-09T02:57:02.608160Z; image tag asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing:baseline-observed-20261109; digest sha256:362e80cb075d867953a42d38a078d7c98b64e7a11cbcc69feada3419eeba4b04. Source archive gs://vast-incline-499901-j3-quest06-build/source/1794192912.694068-b03cd35815874420a45799bb1a34c079.tgz, generation 1794192914495118; downloaded archive SHA-256 cdc49631e090fdb692e9407b394216d55fdc04b8ab612950599cfe4cfb59500f.

The v4 build was already underway when the coordinator reported its development gate failed. It is preserved as build evidence only: no v4 service revision or traffic switch was performed. Its frozen inference artifact is 391f992def97b440b1b4514529d3b23f767e8636ccc6fb97b376d3aa768cd054, VERSION briefing-v4-compact-output; uploaded inference files matched that manifest before submission. Future v5/current-checkout changes are not included in either frozen build.

Both builds used the existing quest06-build identity, dedicated source staging bucket and registry. Public Supabase build args were read with UTF-8 BOM stripping, URL/anon-role validation and no secret build args. Source scans and downloaded tar member checks excluded env, private/raw evidence, credentials and local dependencies. A private baseline node_modules junction used only for type checking was not uploaded. No IAM broadening or app checkout source edit was needed.

### Byte-level proof of baseline isolation

The original baseline archive is the same original object/generation recorded in the historical section below. Comparing the downloaded baseline-observed upload against that archive found exactly these changed/added files and no removed files:

| File | Original SHA-256 | Observed SHA-256 |
| --- | --- | --- |
| src/app/auth/confirm/route.ts | 2eb2de3d5cbe7e1b2990a5a98f936ce23a7c0fc86859b0b48e90da28b3222802 | fe0d76e7117f9eadb0cb857456d5af68df2150f25a923461df48b3ea9983ad78 |
| src/lib/briefing/observability.ts | 0e58f8c848369b472ff230b9dd9baf52fae508639dbb6b2deba061f4a89de411 | 667f6b4b886e97e59013589b83259c91861b92750f04596da48b5d68c886651b |
| src/lib/supabase/redirects.ts | absent (new helper) | 811970be0302fabe319d896e56948fd3abec82e68b0357460ee3705708c5a584 |

The following inference files are byte-identical to original v1, including the prompt embedded in service.ts; package manifests/lock and every other non-overlay file also remain unchanged:

| File | Unchanged SHA-256 |
| --- | --- |
| src/lib/briefing/service.ts | 9f1352bf4837ae4433494a47f8a691911489dd008176fc47bde0f39487a4771b |
| src/lib/briefing/types.ts | d46ef451183794dcae235936761a9149006ef8b751ca9aae061a7ddee9e309ee |
| src/lib/briefing/anthropic-provider.ts | ce6356af0ef3a55ad703cfbe0e5c4278411ce04f796ce2abe16c2a540745b1b2 |
| src/lib/briefing/provider-config.ts | 1814bff2dc8d5d7c22c0a37e027f0992af6b395c167c2049fa346a50539a0fd0 |
| src/lib/briefing/vertex-provider.ts | 30c9f2c71dfdb475485539f634b39a1f6f634e06e024c167d08ee5617d6fd398 |

No telemetry compatibility change was required: private baseline TypeScript checking passed with the existing baseline interfaces and dependencies. The original v1 feedback route/client contract is retained; the newer candidate feedback delivery acceptance was not overlaid. This artifact adds observation and auth redirect correction, not an LLM or feedback product-behavior improvement.

### Verification and real-measurement boundary

At 2026-11-09T02:58:32.815Z, all **15 unauthenticated HTTP/security checks passed**: home/login/static200; dashboard/portfolio/feed307 to login; auth/confirm and encoded external-next probes307 to the canonical service login error URL; briefing/feedback same-origin401 and cross-origin403; cron routes401. All probes used no user cookie/token and produced zero worker model calls. The callback internal-host defect in the historical section is resolved in this revision.

Offline baseline-overlay testing confirmed contractVersion v1, numeric usage retained on a synthetic generation failure, stage status retained, and content/cookie/unknown fields omitted from stdout. Auth callback regression tests passed 43 cases. These are deterministic tests, not evidence of a real cloud model trace. Original v1 records provider usage before final-text parsing; if transport/parse fails before usage is available, the log must remain empty rather than fabricate tokens. The v1 model field is assigned on success only, so failure records may lack model; runtime configured model can be reported separately with its provenance.

The root can now perform the separately authorized fresh conversation in the existing logged-in browser and read Cloud Logging with resource.type=cloud_run_revision, resource.labels.service_name=modu-rich-quest06, resource.labels.revision_name=modu-rich-quest06-00004-72l and jsonPayload.event=briefing_trace. Match application traceId from the API response to jsonPayload.traceId, then capture contractVersion, promptVersion, revision, stages, durationMs, usage counts and errorCode only. Do not collect response text, evidence, cookies, credentials or reasoning. Actual generation/stage/usage evidence is pending that root-owned call; this worker did not manufacture it.

Private source assemblies, archived upload hashes, build/service metadata, environment comparison, byte-level proof and HTTP results are retained outside the public repo under logical identifier **quest06-baseline-observed-v4-builds**. The operator holds its location mapping privately; no workstation path is published.

The remaining sections are historical baseline/configfix records retained unchanged for provenance; their old current/pending statements are superseded by this section.


## Historical baseline configuration-fix deployment

Baseline `briefing-v1` is deployed and public at:

- App: https://modu-rich-quest06-fyzai5fn7a-du.a.run.app
- User login: https://modu-rich-quest06-fyzai5fn7a-du.a.run.app/login
- Project `vast-incline-499901-j3`, region `asia-northeast3`, service `modu-rich-quest06`.
- Runtime identity: `quest06-runtime@vast-incline-499901-j3.iam.gserviceaccount.com`.
- Active revision: `modu-rich-quest06-00003-sfx`, 100% traffic.
- Digest: `sha256:462e55493caf9858bb3d0af23b71ad1c9bd6c08a8a23e8e0db45d37516527bd5`.
- Image repository: `asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing`.
- Corrected image tag: `baseline-configfix-20261109`.
- Corrected Cloud Build: `70159e67-6fe8-4bcc-9908-5bb7bd2589cc`, SUCCESS, finished `2026-11-09T02:34:49.008267Z`.
- Deployment completion observed `2026-11-09T02:35:54.044Z`; HTTP verification `2026-11-09T02:36:12.729Z`.

Configuration: service/revision min 0 and max 1, CPU 1, memory 512Mi, concurrency 8, timeout 300s, request-based CPU. Cloud Run invoker policy includes allUsers. Supabase authentication remains enforced by the application. Runtime provider is anthropic, model claude-haiku-5-5. BRIEFING_EVAL_MODE, BRIEFING_TRACE_CONTENT, LANGFUSE_CAPTURE_CONTENT and LANGFUSE_ENABLED are false. BRIEFING_ALLOWED_ORIGINS is the exact app URL above.

Existing Secret Manager versions are referenced at runtime, never copied into image/build args: ANTHROPIC_API_KEY → quest06-anthropic:1; STOCK_API_KEY → quest06-stock:1; MARKETAUX_API_KEY → quest06-marketaux:1; BRIEFING_FEEDBACK_SECRET → quest06-feedback:1. Runtime IAM already existed; no broader secret grants were added. Public Supabase values and SEC_USER_AGENT were read with Node parseEnv after stripping the UTF-8 BOM and passed using a temporary private JSON env file, which was removed after deployment. No key values were printed or placed in CLI arguments.

## Initial infrastructure failure and correction

Original Cloud Build `2716e5f2-de6d-4058-ad9e-adbcf0080466` succeeded at `2026-11-09T02:25:27.193809Z`, but its public URL build argument was the literal string `undefined`. The first .env.local key had a UTF-8 BOM, which the earlier build-config parser failed to strip. The anon argument matched the local public key. Runtime public URL was valid and matched local configuration, but Next's compiled public value could not be repaired by runtime env changes.

Failed deployment digest: `sha256:7ec97d1c0cb536c382e6a00311776f1561209fe5772d57e8fcb05dd13c3cedbe`; failed origin-configured revision `modu-rich-quest06-00002-jk9`; deployment observed `2026-11-09T02:29:01.807Z`. Dynamic pages/APIs returned 500 with `Invalid supabaseUrl`; `/logo.png` returned 200. This is an infrastructure/configuration failure, not an LLM-quality result.

The corrected build reused the original source archive, not the changing app checkout:

- Bucket: `vast-incline-499901-j3-quest06-build`.
- Original object: `source/1794191011.785712-062d849c432d4b07948cb5e2b631be46.tgz`, generation `1794191013303787`.
- CLI restaged copy: `source/1794191579.609131-c13d957054934e9f9505b76efa5e834b.tgz`, generation `1794191580895631`.
- Both: 632516 bytes; MD5 `XRn/onbLDPnURw87jqfy4A==`; CRC32C `wBhYTA==`.
- VERSION read directly from archived types.ts: `briefing-v1`.

Only public build args and the output tag changed. Build identity remained quest06-build, logging remained CLOUD_LOGGING_ONLY, and the dedicated existing source bucket/registry were reused. Two submit attempts were rejected before a build was created because gcloud defaulted to a staging bucket unavailable to the build identity; explicitly selecting the existing dedicated staging bucket resolved this without broadening IAM. No candidate model/source improvements were mixed into this baseline correction.

## HTTP results and remaining auth issue

12 of 13 verification cases passed:

| Request | Observed |
| --- | --- |
| GET /, /login, /logo.png | 200 |
| GET /dashboard, /portfolio, /feed without session | 307 to relative /login |
| POST /api/briefing and /api/briefing/feedback, exact app Origin, no session | 401 UNAUTHORIZED |
| Same POSTs, cross-origin | 403 ORIGIN_NOT_ALLOWED |
| GET /api/cron/feed and /api/cron/snapshot, no bearer secret | 401 |
| GET /auth/confirm without token | 307 to https://0.0.0.0:8080/login?error=confirm — FAILED |

The last issue is independent of the restored Supabase build value. The callback route used request.url as an absolute redirect base. Its fix is now implemented locally, **not deployed**: authRedirectOrigin chooses the first explicit BRIEFING_ALLOWED_ORIGINS entry; malformed configuration or absent Cloud Run configuration fails closed with 503. No Host/forwarded header establishes redirect trust. Local fallback allows HTTPS or loopback HTTP only outside Cloud Run. Configured origins must be canonical origin-only URLs with no slash, credentials, wildcard, query or fragment.

safeAuthNext accepts only same-origin relative paths; external/protocol-relative URLs, backslashes, controls, whitespace and residual percent escapes are rejected to /portfolio. The callback uses the canonical /login?error=confirm destination for missing OTP, OTP failure and thrown network/auth errors. It still verifies OTP before a success redirect. A failed canonical configuration does not call OTP verification.

`node scripts/cloud-run/auth-redirect-check.cjs`: 43 checks passed, using actual NextResponse and a mocked OTP provider; includes spoofed Host/forwarded headers, Cloud Run missing config, local development, open-redirect and encoding bypasses, no-token/error/exception and successful OTP paths. `tsc --noEmit --incremental false`: passed. Auth-only changed files: src/app/auth/confirm/route.ts and src/lib/supabase/redirects.ts. No briefing source or REPORT edits were made. Per coordinator, active baseline revision remains unchanged until candidate source is frozen and a subsequent deployment is approved.

## User login and future evidence

The coordinator should open the exact /login URL above. User must enter their existing Supabase account credentials themselves; no password/session is available to this worker. Password login uses the application's normal Supabase sign-in. Successful login and a session-protected page still need live user verification. New email-confirmation/password recovery flows must not be called verified: callback fix remains undeployed and Supabase redirect allowlist settings have not been changed. Do not submit a briefing or trigger a model during this deployment-only phase.

No model call, quality evaluation, user login, Langfuse ingestion or stage trace was performed here. Candidate v2/v3 traffic was not deployed.

For later approved fresh-conversation comparisons, collect a minimal metadata record per response: UTC start/end, request path/status, application traceId/version/status/asOf, Cloud Run service/revision, image digest and build ID. Obtain application metadata from the browser's response after the user authorizes a model request, exclude prompt/answer/evidence content and cookies/tokens, and retain only private sanitized records. Cloud Run request logs can corroborate timestamp, revision, status and total request latency. Cloud Logging trace IDs are not automatically the application's traceId; correlation by timestamp/revision alone is approximate and must be labeled as such. Current response metadata does not expose internal retrieval/input-assembly/generation timings, so do not infer those stages from total latency. Exact stage evidence requires separately approved sanitized server instrumentation or configured telemetry in a future version; neither eval capture nor content logging should be enabled to obtain it.

## Private evidence and scripts

Private evidence identifier: `quest06-baseline-deployment-evidence` (operator-held, outside the public repository/upload). The operator retains the original location mapping privately; the evidence has not been moved or deleted. It contains original/corrected build metadata, service/revision metadata, initial failure logs, source archive equivalence, archived baseline version, and before/after HTTP results. Runtime env JSON was deleted. No private evidence was published.

The four historical one-off scripts under scripts/cloud-run (deploy-baseline.mjs, rebuild-baseline-config.mjs, deploy-configfix.mjs and verify-baseline.mjs) are preserved locally as private execution records and excluded by exact Git paths. They depend on the operator-held evidence mapping and are not a clean-checkout reproduction interface. The public [Cloud Run guide](cloud-run.md#public-reproduction-versus-private-execution-records) describes generic build/deploy commands; [auth callback checks](../../scripts/cloud-run/auth-redirect-check.cjs) remain public offline tests. No command here authorizes redeployment or candidate traffic changes.

Coordinator update: the user login page has been opened by the coordinator, but session verification is still pending. A separate worker owns future sanitized Cloud Run stdout metadata instrumentation (traceId/version/revision/stage/latency/model/usage counts/errorCode only). That code is not part of this worker's changes or the current baseline image; candidate build/deployment remains on hold until final source/hash approval.


## v5 frozen candidate ? build only, not deployed

- Application VERSION: briefing-v5-partial-evidence; prompt version: briefing-prompt-v5-partial.
- Frozen inference artifact: b11adf3a17fb1b52b7d8a2e3ada353da68f9a01e0a76919169b76dba0a4dd03a.
- service.ts SHA-256: d2dd8d58157720086d268bc9b49835ab6ff58d752ade177620458d4e8db43af4.
- Cloud Build: 7ebe10a9-bb75-44c7-bc65-27e2bca3e873, SUCCESS; start 2026-11-09T03:03:56.891874922Z, finish 2026-11-09T03:05:25.500971Z.
- Image tag: asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing:v5-20261109.
- Immutable image digest: sha256:4e348e918b5ce117ff8bb8c298f7292daa89d246621e41b976ccc5270e5f6af0.
- Source object: gs://vast-incline-499901-j3-quest06-build/source/1794193433.771973-50b40bc79ea5410a84a2d518ff8ace39.tgz, generation 1794193435370359.
- Source archive SHA-256: c15edc66d202d448bf47f63cfb11636198c4ce9f85227170c061c92152a909ab.
- Full uploaded-file manifest aggregate: 8e324088edb1f17cc83606fd610e6d928b771466eec58e3c70e40cccf2b4f2cb (SHA-256 of JSON.stringify(files), preserving the path order recorded in the private source manifest; includes app/auth/feedback/logging and compiler/package inputs, distinct from the inference-only artifact).

Every inference manifest entry matched both the frozen q610-v5-source/candidate snapshot and the staged current app before upload. The downloaded source archive was independently extracted: all 91 file hashes matched the staged manifest and zero forbidden paths were present. Private env/credential/raw/evidence/docs/tools/local dependency paths were excluded; known local secret-value and credential-pattern scans passed. UTF-8 BOM stripping plus strict HTTPS Supabase URL and public anon/publishable-key validation preceded generation of the private build config. Only public Supabase values were build args, and none were printed. Existing dedicated quest06-build identity, staging bucket and registry were reused.

Current authentication, feedback and metadata logging files were included in the frozen full app image:

| File | Uploaded SHA-256 |
| --- | --- |
| src/app/auth/confirm/route.ts | fe0d76e7117f9eadb0cb857456d5af68df2150f25a923461df48b3ea9983ad78 |
| src/lib/supabase/redirects.ts | 811970be0302fabe319d896e56948fd3abec82e68b0357460ee3705708c5a584 |
| src/app/api/briefing/feedback/route.ts | a237ed8705f3a88ee2530ac1adeb6b7f19796383b965f5cd8c823a62904ade69 |
| src/lib/briefing/feedback.ts | 853affac974cb6cb1bfe76bcda6ed2f23d1e372826bfdd9de0dbb659d7e2a409 |
| src/lib/briefing/observability.ts | 667f6b4b886e97e59013589b83259c91861b92750f04596da48b5d68c886651b |

**No v5 deployment or traffic change was made.** The observed live revision remained modu-rich-quest06-00004-72l, image asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing@sha256:362e80cb075d867953a42d38a078d7c98b64e7a11cbcc69feada3419eeba4b04, with 100% latest-revision traffic. That is baseline-observed v1, not this candidate. Gate approval and a separate deployment follow-up are required before using the v5 image. Build success is not a quality-gate pass. The coordinator's live baseline user interaction/trace observation is separate evidence; this worker made no API/model calls, user-session changes, app-source changes or Git operations.

Private frozen source, uploaded archive, manifest, build configuration/logs/results and live-baseline confirmation are preserved outside the repository under logical identifier **quest06-v5-build-evidence**. The operator retains the location mapping privately; no local username/path or credentials are published.
