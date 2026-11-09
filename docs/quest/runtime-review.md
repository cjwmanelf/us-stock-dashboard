# Runtime and process-local rate review

Read-only audit on 2026-11-09T05:20:48.753Z. Current policy, confirmed by the coordinator: **authenticated, per-process best-effort abuse protection; no hard global request or billing guarantee**. No new infrastructure, resource increase or limit change is justified by the measured memory/startup data. A shared atomic limit is required only if that policy changes to a hard cross-instance/cross-revision guarantee; it must not be deferred merely because configured maxScale is1.

## Scope and live configuration

Project vast-incline-499901-j3, service modu-rich-quest06, region asia-northeast3; revision **modu-rich-quest06-v6-ui-20261109**, image digest sha256:13567eff66569a7da6a5d3198b222e8a6243b726fdbcf650877893688240512b. Service and revision maxScale explicitly1; minScale omitted/default0; CPU1, memory512Mi, concurrency8, timeout300 seconds, request-based CPU throttling and startup CPU boost enabled. These settings were read, not modified.

This observation concerns the deployed **Next 16.2.10** image. Checkout currently contains Next 16.4.5 during the separate dependency remediation; those fixes have not been deployed by this audit. Do not treat these measurements as the memory/startup certification of the later reviewed build. The current guards.ts byte hash matches the deployed UI archive.

[Sanitized numerical evidence](evidence/runtime-review.json) preserves query intervals, series/point counts, aggregation results, configuration, hashed instance references and offline checks. Raw metric/descriptor/startup-log responses remain operator-private under logical ID quest06-runtime-review-20261109. No secrets were read, tokens printed, inference/feedback/load requests generated, browser opened or deployment changed. Monitoring/Logging read permission succeeded; no permission grant is needed. No health GET was necessary.

## Existing Monitoring observations

Query interval **2026-11-09T03:33:00Z through 2026-11-09T05:17:15.960Z**, filtered to the exact revision. No cross-revision pooling, alignment or reducer was requested; raw DELTA distributions were combined by count-weighted mean and summed matching histograms. Pagination was absent. Point counts include zero-count intervals; observation counts below are distribution count sums, not HTTP request counts unless the metric is request latency. Missing/empty telemetry intervals are not zero memory or zero startup latency. Percentile values are bucket bounds, not exact quantiles. Protobuf-omitted numeric means were treated as their zero default, not missing samples.

| Metric | Returned points / nonzero points / observations | Result |
| --- | --- | --- |
| Memory utilization | 80 / 75 / 79 | Weighted mean 27.694%; highest interval-distribution mean 31.833%; highest occupied bucket31–32% |
| Container startup latency | 80 / 2 / 3 | Weighted mean 1073.265ms; p50 and p95 bucket1173.909–1291.299ms (only3 starts) |
| All request latency | 365 across8 series / 27 / 162 | Weighted mean 88.802ms; p50 bucket12.100–13.310ms; p95 bucket309.127–340.039ms |
| HTTP200 latency |79 /14 /135 | Weighted mean104.167ms; p95 bucket662.641–728.905ms |

Memory's raw fraction metric is converted to percent by multiplying100. At512Mi, the weighted mean corresponds to approximately 141.793Mi and the highest interval mean to 162.984Mi. These are utilization-derived estimates, not RSS measurements. The highest observed sample bucket corresponds to158.72–163.84Mi; this is not an exact maximum and cannot rule out unsampled peaks. No memory-limit/OOM message matched the scoped startup/error text query. No pressure requiring1Gi is demonstrated here.

The project metric descriptor states run.googleapis.com/request_latencies measures request time at the running container and **excludes startup**. The route label is empty, and requests mix static pages, authentication, security probes and user traffic; this is not model latency, a browser benchmark, an end-to-end cold-start SLA or a controlled load test. There were135 HTTP200 observations,4 HTTP302,1 HTTP304,9 HTTP307,5 HTTP401,4 HTTP403,3 HTTP404 and1 HTTP405; no returned5xx series. Highest occupied request bucket was4052.651–4457.916ms, not a precise maximum.

## Existing startup logs and instance overlap

Nine matching log records yielded3 instance-start/probe pairs grouped by hashed instance identity:

| Start UTC | Reason | Start-log → successful TCP probe |
| --- | --- | --- |
| 2026-11-09T04:49:33.578123Z | AUTOSCALING | 1100ms |
| 2026-11-09T04:49:30.558143Z | AUTOSCALING | 1454ms |
| 2026-11-09T03:33:39.826113Z | DEPLOYMENT_ROLLOUT | 1453ms |

The deployment-start pair and two later AUTOSCALING starts are real platform observations, not starts induced by this audit. Log-to-probe durations measure a different interval from the platform startup metric; do not merge them or subtract them to infer application timing. The framework also logged Ready in0ms, which is not a valid end-to-end cold-start measurement. Autoscaling reasons mention possible absence of capacity or scaling factors, so this audit does not assert that each was a scale-from-zero user cold request.

**Configured max1 was not an observed strict ceiling.** Across158 active/idle gauge points at79 distinct timestamps, the state-summed instance count reached2 at04:51,04:52,04:53,04:54 and04:55 UTC. At04:51 both were active; at the next four samples both were idle. Counts are sampled, so exact overlap duration is unknown. This is consistent with Cloud Run documented temporary maximum-instance overruns, not a configuration mutation or proof of simultaneous inference. It matters already in the current deployment, not only after planned scale-out.

## Limiter behavior and verified bounds

The module-level Map and active counter in guards.ts enforce, within one loaded module instance: at most2 admitted in-flight guarded operations,5 admitted acquisitions per authenticated user in a fixed60-second window starting with their first accepted acquisition, and10000 stored user windows. Expired entries are cleaned on a subsequent acquire. The capacity check rejects when the Map reaches10000, including existing users until expiry cleanup.

Both briefing and feedback routes authenticate before acquiring and release once in finally. Thus rejected auth traffic still consumes auth work and Cloud Run request concurrency; malformed authenticated requests admitted before parsing consume rate slots. Feedback and generation can compete for slots if they share the same loaded module. Next bundling/module placement is not a distributed coordination contract; only a single-module limit was proven offline. Cloud Run concurrency8 is an HTTP container setting, not proof of8 model calls or a hard global2 cap.

Existing scripts/briefing-check.cjs already covers two active requests and the sixth per-user rejection. Additional offline VM checks against the actual current guards.ts passed six scenarios: third concurrent rejection, capacity after release, independent users with five-request cap, reset exactly at60s, fresh-module history reset, and10000-entry saturation/expiry recovery. No network was used. Repo node_modules was temporarily unavailable during Q612 work, so the test compiler came from the retained isolated build tree (TypeScript5.9.3); no install or checkout change was made. Source identity matched deployed guards.

Restarts, scale-to-zero, new revisions, module reloads and multiple instances reset or partition memory. Separate users also have separate request windows; the counter is not a provider token ledger or aggregate spend ceiling. A failed request can already have incurred provider tokens, and source-level limits do not bound historical total spend. Provider-side spend caps are **not verified** by this audit.

## Decision and precise follow-ups

- Keep current memory/min/max/concurrency configuration for the current best-effort policy: sampled memory has substantial headroom;3 startups cannot establish a robust cold-start percentile; no new service or speculative shared limiter was added. No demonstrated implementation defect requires a limiter code change for that explicitly soft policy.
- Document transient parallel instances/restarts now. If the product later needs a hard global/per-user quota, implement an authenticated atomic shared counter/lease with TTL and cross-instance/revision tests, and separately configure/verify provider spending limits. Changing maxScale alone cannot deliver that guarantee. This is a policy-dependent design change, not unfinished current deployment work.
- Recheck actual memory/startup and limiter regressions after the root deploys the final Q612-reviewed image. These observations cannot quantify dependency upgrade impact or claim an improvement without a comparable before/after workload.
- Optional dependencies have runtime implications but no isolated causal measurement here. Langfuse SDK import is deferred until enabled/configured; disabled mode skips SDK initialization. google-auth-library remains reachable through the statically imported Vertex provider even when Anthropic is selected. Image inclusion and Node heap costs cannot be inferred solely from package.json or attributed from these mixed-traffic metrics.

## Exact documentation reconciliation for the root

Read-only search found **no explicit claim that max1 is a hard global2 or spending ceiling**. docs/quest/cloud-run.md:25 already correctly says maximum instances is not a hard spending cap; preserve it. deployment-verification.md configuration statements describe configured values, not guarantees, and can link this measured review. No guard source comment promised a distributed bound.

Two wording updates are needed outside this worker's ownership:

1. BRIEFING.md:9 currently conditions shared limiting on horizontal rollout. Replace the final policy sentence with: ?Authenticated limits are per-process/module best-effort guards and reset on restart; even maxScale1 may temporarily run multiple instances. Current policy does not promise a hard global request or cost ceiling. A hard cross-instance/revision guarantee requires an atomic shared limiter and separately verified provider spend controls.? Keep the existing input/concurrency numbers scoped locally.
2. docs/quest/review-reconciliation.md:49 currently says the record contains configuration rather than actual runtime memory measurements and treats the concern only as a future scale-out check. Link this report and record79 memory observations/3 startup samples and observed instance_count2; retain the small-sample/no-hard-global/no-provider-cap qualifications. REPORT/final-review changes remain root-owned and were not made here.

## Primary references

- [Cloud Run metric catalog](https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z): interpreted alongside the actual project metric descriptors saved privately; units and sampling/visibility differ across metrics.
- [Cloud Run maximum-instance limits](https://docs.cloud.google.com/run/docs/configuring/max-instances-limits): documents temporary overruns and revision overlap, so configured maxima are not exact global quota enforcement.
