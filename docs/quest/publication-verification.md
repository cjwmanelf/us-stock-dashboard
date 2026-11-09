# Publication verification

## 최신 리뷰 반영 상태 — 코드·의존성·운영 및 결합 배포·브라우저 검증 완료

[코드 후속](review-code-followup.md)은 전체 lint **0 errors / 0 warnings**, typecheck·평가25/25·UI callback/hook 회귀 통과를 기록한다. 닫기 버튼을 showModal 직후 명시적으로 focus하고, 폼 연속 성공 reset·편집 오류 수명·theme 구독·autocomplete 취소·donut 순수 계산 및 exporter 미사용 변수를 수정했다. 초기 5/0→5/1은 역사적 관측으로 유지한다.

[의존성 후속](dependency-review.md)과 [audit JSON](evidence/dependency-audit.json)은 Next/config **16.4.5**, 호환 transitive 갱신 및 estree에 한정한 minimatch11.0.1 override 후 **full0 / production0**을 확인한다. 원래18개 package-entry 발견과 당시 production6은 보존한다. 오늘 DB로 baseline/current 취약점 객체와 영향20노드가 같음을 확인했으며 과거 당시 알려진 advisory까지 같았다는 뜻은 아니다. scoped major override의 사용 경로 호환 검사는 통과했으나 upstream semver 보장은 아니므로 후속 재검토한다.

[runtime review](runtime-review.md)와 [실측 JSON](evidence/runtime-review.json)은 **기존 Next16.2.10 v6-ui 리비전**의 메모리79관측(가중평균27.694%)·startup3건(평균1073.265ms) 및 maxScale1 설정에서도 instance_count2를 관측했다. 새 수정본의 성능 인증이나 통제 부하 시험이 아니다. 현재 정책은 인증된 사용자에 대한 **process/module별 best-effort**이며 재시작 시 초기화되고 global 요청/비용 상한을 보장하지 않는다. hard global 정책에는 현재 max1에서도 shared atomic limiter와 별도 provider 비용 통제가 필요하다. provider spend cap은 확인하지 않았고 새 인프라·메모리 증설을 실행하거나 필요하다고 단정하지 않는다.

**완료:** 결합 수정본 `modu-rich-quest06-reviewed-20261109`(Next16.4.5)가 Ready·100% traffic으로 배포됐다. Build `773b9b97-2216-4690-9e8f-2267e2b9e41d`, digest `sha256:b4372f6496eb8f68e0d6dcc55c67c18c56c9c5e9550d206b0372b8bd9da4082f`다. 새 AAPL/MSFT/NVDA 실제3호출 모두200/ok·Cloud Logging exact join3/3이며 input9087/output1186·추정USD0.0015017, 알려진 누계USD0.0513667이다. 기존 로컬183서비스/171모델·원격6·UI1은 별도 분모로 보존한다. 새3건은 배포 smoke이며 과거 hold-out 재채점이 아니다. 실제 Orca 클릭 후 닫기 BUTTON 초기 focus, Enter 닫기/외부이동 없음/복귀, 재열기와 Escape 복귀,390px 넘침 없음이 확인됐다. 테마 변경/기본값 복구, 실제 AAPL 자동완성·ArrowDown/Enter·지우기, 빈 수량 유효성 차단, 행 편집/취소/재열기도 확인했고 console0·포트폴리오 DB쓰기0·투표0이다. [배포](review-deployment.md)·[실제 확인](reviewed-live-verification.md)·[안전 증거](evidence/reviewed-smoke.json)를 참조한다. v6 추론14파일은 불변이지만 새 의존성 그래프의 독립 품질 평가나 교차 브라우저/실물 터치 검증은 아니다.

Fable의 최초 발견과 Astra 기록은 보존하며 아래의 예전 미적용·실패·hash는 당시 상태다. 실제 정성 의견1건·운영자 시험vote1건·사람 numeric 평가0건은 그대로다. P3-2는 **계획 구체화 완료**일 뿐 새 사용자 수집·3단계 평가UI·동의/삭제 backend 구현 완료가 아니다.


## Reviewed release publication audit — separate from the original audit

Exact new allowlist: **34 changed files**, including the six reviewed UI components, package/lock, two offline checks, sanitized review/dependency/runtime/deployment evidence and two reviewed screenshots. Three private env files supplied five credential values for in-memory exact comparison; no values were printed. The exact index scan found **zero credential, personal-path, forbidden-data or private/raw-path findings**. npm advisory metadata is public security evidence, not authentication data; there were no forbidden-key exceptions needed.

The index matches **22 reviewed-build file hashes: 14 unchanged inference files, six reviewed UI files, package.json and package-lock.json**. All **41 historical public manifest hashes** also match. Only package.json and package-lock.json needed additional scoped -text attributes to preserve reviewed CRLF bytes; no unrelated files were renormalized. Runtime source bytes were not edited for publication. The two new screenshots were visually inspected and contain public source titles without personal account/portfolio details.

Staged diff whitespace passes with the previously documented CRLF/EOF convention (core.whitespace=cr-at-eol,-blank-at-eof). This publication step did not rerun already-passing lint/tests, model requests or builds. The current code/dependency checks, Ready100% build and actual three-call/browser smoke are linked above. Historical metrics and manifests remain tied to their original dependency graphs; no new holdout score or human vote is claimed. Root will update the existing PR after this branch push. The original 184-file audit below is preserved and is not reused as the count of this new audit.

## Original publication audit — historical

Publication scope: explicit file-by-file allowlist of the reviewed task source, tests, generic deployment tooling, documentation, sanitized evidence, five screenshots, and 28 historical v1/v2 source files plus manifests. Private raw evidence and real environment files remain ignored. No model or build call was made for publication.

The exact Git index is checked against that allowlist before commit. Checks cover local environment secret values (compared only in memory), high-risk credential formats, private-key blocks, personal filesystem paths, forbidden private/raw paths and staged whitespace. Public JSON evidence is separately verified for hash integrity and forbidden fields. Source code references to thinking/signature and synthetic test literals are not native model reasoning. Operational project IDs, service-account identifiers, trace UUIDs and image digests are intentionally public.

Offline public verification passed: 41 manifest-listed public files, 10 final cases, 20 final responses and 28 historical source files; hashes and forbidden-field checks passed, model calls zero. The unchanged v6 service and the two deployed UI source hashes are checked again at publication. This is a scoped pattern and exact-value audit, not proof against arbitrary encoded secrets, a dependency security audit, or a new quality experiment.

Historical independent lint found five production errors and one exporter warning; current Q612/Q613 checks resolve them to 0/0. The 184-file index audit below is the prior publication audit, not an audit of these new review changes; root must audit the exact next staged set. [PR #7](https://github.com/cjwmanelf/us-stock-dashboard/pull/7) is open; the [independent Claude review](final-review.md) is complete with submission-ready findings and separately recorded documentation corrections. Commit and pushed branch are reported through the coordinator; this record does not invent a PR or review approval.

Final index audit: 184 explicitly listed files; three private environment files and five credential values compared in memory, zero matches or credential/path/forbidden-data findings. Exact staged hashes match all 41 public manifest entries and the deployed service/UI files. Git newline normalization initially changed two frozen hashes; scoped `.gitattributes` now preserves source/evidence bytes and the final index matches the originals. No runtime source was changed by this correction.

Whitespace: default diff check reports preserved CRLF bytes and 14 existing EOF blank-line findings. With CRLF recognized as line endings and only blank-at-EOF excluded, the staged diff check passes. Frozen source bytes were intentionally retained rather than silently changing evaluated code. This exception is not a claim that the default check passed.
