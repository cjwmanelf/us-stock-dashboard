# Dependency audit and remediation — 2026-11-09

**Final local result: full audit 0 and production-only audit 0; lint, typecheck and all requested offline regressions pass.** Next and eslint-config-next are now pinned to 16.4.5. Compatible transitive updates and one explicitly approved, narrowly scoped development dependency override resolve the findings. This is not a new deployment, a model-quality rerun, or a guarantee against unknown vulnerabilities.

## Provenance and baseline attribution

The original installation's **18 findings (9 moderate, 8 high, 1 critical)** remain a historical snapshot in the earlier reports. On 2026-11-09 UTC, this task copied the current package files and the original Git baseline `7ab330aa2ad21524f51b94e8136ace9412510598` package files into separate temporary directories and ran:

```text
npm audit --json --package-lock-only --ignore-scripts
npm audit --json --package-lock-only --ignore-scripts --omit=dev
```

Node 24.18.0 / npm 11.16.0. These query the npm registry; they do not install packages, run models, or access cloud resources. The initial baseline/current audits both exited 1 because vulnerabilities were reported, not because the command failed. Their entire `vulnerabilities` objects are equal: advisory IDs/ranges, severity, affected node paths, effects and fix suggestions. All **20 affected lock nodes across 18 package entries** have the same versions in the baseline. No newly introduced vulnerable node was found. This establishes inheritance **under today's advisory database**, not what advisories were available at the earlier installation or that every dependency is safe. Eighteen is npm's package-entry count, not eighteen independent CVEs.

The [sanitized evidence JSON](evidence/dependency-audit.json) contains baseline/current/intermediate/final audit responses, exact UTC audit times, lock hashes, every affected node's direct parents and root dependency paths, registry version/engine/peer metadata, all version changes and check exit codes. It contains no private temp path, credentials, environment values or user data. Its dependency paths are repository-relative `node_modules` identifiers. This new evidence is separate from the frozen experiment manifests.

| Snapshot | Full audit | Production-only audit | Interpretation |
| --- | --- | --- | --- |
| Original baseline re-audited today | 18: moderate9/high8/critical1 | Not separately run | Exact full vulnerability object equals current-before |
| Current before changes | 18: moderate9/high8/critical1 | 6: moderate1/high4/critical1 | Runtime dependencies affected as well as tools |
| Next + compatible transitive updates | 8 moderate; high0/critical0 | 0 | One minimatch advisory propagates through eight dev package entries |
| Scoped override + clean install, final | **0; exit0** | **0; exit0** | Current registry result after remediation |

## Actual paths and applied versions

`prod` means reachable in npm's production dependency graph, not proof that a particular vulnerable function is reachable in the deployed standalone bundle. `dev` findings still matter for lint/build inputs. Full exact parent paths and individual advisory URLs are in the JSON; this table groups shared causal chains rather than counting propagation as independent exploits.

| Package / initial severity | Actual path and scope | Before → after | Remediation |
| --- | --- | --- | --- |
| next / critical | root → next, direct prod | 16.2.10 → **16.4.5** | Same Next major; framework security update |
| sharp / high | next → optional sharp, prod | 0.34.5 → **0.35.5** | New Next-supported range; matching platform binaries/libvips updated |
| postcss / high | next → postcss, prod; @tailwindcss/postcss → postcss, dev | nested8.4.31 and root8.5.19 → shared **8.5.23** | Next's pinned dependency updated; dev range permits same version |
| nanoid / high | both PostCSS paths → nanoid, shared prod/dev | 3.3.16 → **3.3.20** | Same major; patched floor3.3.18 |
| source-map-js / high | PostCSS and @tailwindcss/node → source-map-js, shared prod/dev | 1.2.1 → **1.2.2** | Compatible patch |
| baseline-browser-mapping / moderate | next → mapping, prod; browserslist → mapping, dev | 2.10.43 → **2.11.35** | Compatible minor; patched floor2.11.0 |
| browserslist / high | eslint-config-next → eslint-plugin-react-hooks → @babel/core → @babel/helper-compilation-targets → browserslist, dev | 4.28.6 → **4.29.5** | Compatible minor; patched floor4.28.7 |
| brace-expansion / high | eslint/import-tooling → minimatch3 → brace-expansion1; typescript-estree → minimatch → brace-expansion5, dev | 1.1.16 → **1.1.21**; 5.0.7 → **5.0.12** | Patch updates in each existing major; no global override |
| js-yaml / high | eslint → @eslint/eslintrc → js-yaml, dev | 4.3.0 → **4.3.2** | Compatible patch |
| zod / high | eslint-config-next → eslint-plugin-react-hooks → zod, dev | 4.4.3 → **4.6.7** | Allowed by ^3.25.0 or ^4.0.0; patched floor4.6.6 |
| minimatch / moderate | eslint-config-next → typescript-eslint → @typescript-eslint/typescript-estree → minimatch, dev | 10.2.5 → **11.0.1** | Approved scoped override; compatibility evidence below |
| seven propagated moderate entries | eslint-config-next, typescript-eslint, @typescript-eslint/eslint-plugin, parser, type-utils, typescript-estree, utils; all dev | eslint-config-next16.2.10 → **16.4.5**; TS-eslint family remains8.64.0 | Removed through minimatch remediation; no separate vulnerability fix in each wrapper |

The lock's 65 changed version-node records include required Next/SWC binaries, sharp/libvips platform packages, browserslist data packages and npm optional WASM dependency resolution. The complete before/after list is in `packageVersionChanges`; this is not a claim of only two lock changes. React/react-dom19.2.4, TypeScript, ESLint major and the briefing provider/telemetry direct package versions were retained. No `npm audit fix --force`, framework downgrade, global blanket override, or broad latest upgrade was used.

## Official guidance and compatibility

Installed Next documentation `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` and `01-app/01-getting-started/18-upgrading.md` were read before changes. The [Next16.4.5 official release](https://github.com/vercel/next.js/releases/tag/v16.4.5) includes additional security fixes beyond16.4.1. Registry metadata confirms Node>=20.9 and React19 peer support, compatible with this project's Node24 Docker stages and React19.2.4. No app migration or codemod was applied.

The [official Next SVG advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) identifies sharp>=0.35.5 or patched Next as the remedy for affected image optimization. The [official cache advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) recommends updating even without the specific typed-array cache usage. Source search found Server Actions in login/feed/portfolio and no `next/image`, `next/og`, or `use cache` imports/usages in the searched application files; that limited search is not a proof of non-exploitability, so the framework was updated.

The remaining development advisory [minimatch GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) is fixed in11.0.1. Current upstream typescript-estree8.72.1 still requests ^10.2.2, so simply updating the TS-eslint family would not resolve it. npm suggested downgrading eslint-config-next to15.5.29; that mismatches the framework and was rejected. Root explicitly authorized this single parent-scoped override after the safe updates:

```json
"overrides": {
  "@typescript-eslint/typescript-estree": {
    "minimatch": "11.0.1"
  }
}
```

This crosses a transitive major boundary and is **not upstream-declared semver compatibility**. The [official11.0.1 package](https://raw.githubusercontent.com/isaacs/minimatch/v11.0.1/package.json) supports CommonJS require and Node18/20/>=22; the [official README](https://raw.githubusercontent.com/isaacs/minimatch/v11.0.1/README.md) retains the named minimatch(path, pattern, options) API and dot matching. The installed typescript-estree consumer uses that named function with `{dot:true}`. The added [compatibility regression](../../scripts/dependency-compatibility-check.cjs) resolves minimatch from the actual estree consumer, asserts version11.0.1, exercises dot/brace/path cases, then parses actual synthetic TS, TSX and hidden TS files through the typed project-service default-project path and checks rejection of an excluded nested file. It passed along with full repository lint. This establishes compatibility for the used path and project checks; remove/reassess the override when upstream adopts the patched major. No unavoidable application major migration remains in this remediation.

## Execution and verification

After the read-only comparison, root authorized implementation once Q612 finished. Commands were targeted `npm install --save-exact next@16.4.5 eslint-config-next@16.4.5 --package-lock-only --ignore-scripts --no-audit --no-fund`, compatible transitive `npm update` for the listed vulnerable packages, the scoped override followed by lock resolution, and a final `npm ci --no-audit --no-fund`. Clean install exited0. npm printed existing dependency deprecations and allow-scripts notices for protobufjs/unrs-resolver; no new blanket script approval was granted. No build or deployment was run.

Final checks on the installed updated tree:

- Whole repository ESLint `--max-warnings 0`: exit0, errors0/warnings0.
- Nonincremental TypeScript: exit0.
- Evaluator test suite: **25/25**, exit0.
- New dependency compatibility check and Q612 `review-ui-check.cjs`: PASS.
- Twelve briefing/security/provider/integration/feedback/telemetry/v3–v6/origin/callback scripts: PASS; mocked/in-memory transport only.
- Public exporter `--verify-public` and `--smoke-public`: PASS; no actual model/network requests from the smoke.
- All **14 current briefing TypeScript source hashes** equal their pre-update bytes. The per-file hashes are in the evidence JSON. Frozen inference source/manifests and prior experiment outcomes were not rewritten.

Runtime dependencies **did change**; unchanged inference source does not mean the historical evaluation ran against this new framework/dependency graph. Root must build/deploy the combined Q612 and dependency changes and perform fresh authenticated/API/browser verification. Existing deployed screenshots, old audit18 counts and earlier quality gates remain historical evidence. The current dependency audit recommendation is examined and locally remediated; final runtime rollout remains root-owned.
