# Combined reviewed deployment

Recorded 2026-11-09T05:31:36.004Z. The reviewed UI and dependency fixes are deployed at https://modu-rich-quest06-fyzai5fn7a-du.a.run.app.

- Revision: `modu-rich-quest06-reviewed-20261109`; Ready at 2026-11-09T05:30:17.925591Z; 100% traffic.
- Cloud Build: `773b9b97-2216-4690-9e8f-2267e2b9e41d`, SUCCESS at 2026-11-09T05:29:43.758343Z; clean Docker build with Node 24 and npm ci, Next 16.4.5.
- Image: `asia-northeast3-docker.pkg.dev/vast-incline-499901-j3/quest06/briefing:reviewed-20261109` resolved and deployed immutably as `sha256:b4372f6496eb8f68e0d6dcc55c67c18c56c9c5e9550d206b0372b8bd9da4082f`.
- Rollback preserved: `modu-rich-quest06-v6-ui-20261109`, digest `sha256:13567eff66569a7da6a5d3198b222e8a6243b726fdbcf650877893688240512b`.

## Immutable source verification

Downloaded the exact Cloud Build storage generation and verified all 92 file hashes against the frozen checkout manifest. Archive SHA-256: `e12ad159c949c817468e9c0cfdbe40d1e95bd851f8b14d0bc8a6f2f8cc378fce`. Package-lock SHA-256: `cffb6387e98cbd2f8a37a6e5be382411e8c2ce28aa3aea26d4daa0ab21eeedbd`. The 14 briefing source hashes match both dependency audit snapshots; all six UI hashes match the approved code review. Compared with the prior UI deployment, only those six UI files plus package.json and package-lock.json differ. The checkout remained unchanged through the pre-deploy check.

The upload allowlist excludes env/private/raw/evidence/docs/tools/scripts/node_modules. A source-content scan checked known local private credential values without printing them and rejected private-key formats; no matches occurred. Only BOM-stripped, validated public Supabase HTTPS URL and anon/publishable key were supplied as build arguments. Native cloud records and archive stay in private evidence `quest06-reviewed-20261109`; no secrets or local profile paths are published.

## Runtime and HTTP verification

The deployment changed only the container image: runtime spec and template annotations are equal before/after. Runtime identity and four Secret Manager version-1 references remain unchanged. CPU 1, memory 512Mi, concurrency 8, timeout 300 seconds, minimum 0 and maximum 1 remain in effect. Canonical origin equals the service URL; eval/content capture and Langfuse flags remain false.

All 15 unauthenticated HTTP checks passed at 2026-11-09T05:31:02.300Z: public pages/assets, protected-page login redirects, confirmation redirect sanitization, briefing authentication/origin rejection (including spoofed forwarded headers), and cron authentication. No inference or feedback request was made with an authenticated session. Detailed statuses and safe hashes are in [deployment evidence](evidence/review-deployment.json).

## Verification boundary

The coordinator was notified immediately on Ready and owns new authenticated browser/model smoke for this revision. Prior model-gate results remain associated with unchanged inference sources; they are not a replacement for the new UI smoke. Historical memory/startup measurements in [runtime review](runtime-review.md) belong to the previous image, not this Next 16.4.5 deployment. Process-local rate limits reset on restarts and are not a global billing quota; maximum instances does not eliminate temporary overlap.

Related: [code review followup](review-code-followup.md), [dependency review](dependency-review.md).
