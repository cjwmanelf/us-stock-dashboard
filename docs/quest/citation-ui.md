# Briefing citation UI

## 최신 후속 — 검토 수정본 배포 확인

**완료:** 결합 수정본 `modu-rich-quest06-reviewed-20261109`(Next16.4.5)가 Ready·100% traffic으로 배포됐다. Build `773b9b97-2216-4690-9e8f-2267e2b9e41d`, digest `sha256:b4372f6496eb8f68e0d6dcc55c67c18c56c9c5e9550d206b0372b8bd9da4082f`다. 새 AAPL/MSFT/NVDA 실제3호출 모두200/ok·Cloud Logging exact join3/3이며 input9087/output1186·추정USD0.0015017, 알려진 누계USD0.0513667이다. 기존 로컬183서비스/171모델·원격6·UI1은 별도 분모로 보존한다. 새3건은 배포 smoke이며 과거 hold-out 재채점이 아니다. 실제 Orca 클릭 후 닫기 BUTTON 초기 focus, Enter 닫기/외부이동 없음/복귀, 재열기와 Escape 복귀,390px 넘침 없음이 확인됐다. 테마 변경/기본값 복구, 실제 AAPL 자동완성·ArrowDown/Enter·지우기, 빈 수량 유효성 차단, 행 편집/취소/재열기도 확인했고 console0·포트폴리오 DB쓰기0·투표0이다. [배포](review-deployment.md)·[실제 확인](reviewed-live-verification.md)·[안전 증거](evidence/reviewed-smoke.json)를 참조한다. v6 추론14파일은 불변이지만 새 의존성 그래프의 독립 품질 평가나 교차 브라우저/실물 터치 검증은 아니다.

아래 과거 실험·초기 focus·해시·smoke는 당시 증거로 보존하며 최신 상태를 대체하지 않는다.

UI-only change: exact `[id]` matches against current result.sources render as short `[근거]` buttons. Unknown brackets and all surrounding answer text (including prices, dates and server temporal notices) remain unchanged. React text nodes are used; no HTML injection or substring rewriting of the server response. Repeated references work independently.

A native modal dialog presents the selected title, original date metadata, safe credential-free HTTPS source link (when present), and original ID. It has a labelled heading, initial focus on the source link inside the dialog (observed in the final browser smoke), browser-native modal keyboard containment/Escape handling, explicit close button, and focus return to the invoking button. Mobile width, viewport height, scrolling and long-token wrapping are bounded. Selection resolves against current sources and closes if its source disappears. The component is keyed by response traceId and unmounts during a new request, preventing cross-response selection reuse. Existing loading/error/feedback behavior is retained.

The full source list retains titles and dates, while raw IDs are collapsed behind native details/summary. Links are restricted to HTTPS without URL credentials. No backend service/type/provider/prompt, original response or evidence ID changed. This is presentation work, not a new LLM experiment or evidence of model-quality improvement.

Validation: nonincremental TypeScript check and targeted ESLint on both TSX files pass. Offline executable checks passed exact/partial/unknown/missing-source matching, lossless reconstruction of original answer text, repeated citations including date-notice text, rejection of HTTP/javascript/credential-bearing URLs, React HTML escaping, and server rendering of citation buttons without raw IDs. React component/hook/accessibility review completed. The coordinator subsequently verified deployment and the 390px browser flow; see the final smoke below. Cross-browser and physical-touch behavior remain untested.

Frozen UI files:
- src/components/BriefingForm.tsx SHA256: 4a0add509f4c9998bbfbf5b097a1343a25d256fb70b2486ea6c088c5ca84e826
- src/components/BriefingCitations.tsx SHA256: 925dbaf286a8d1915aa5bbdb3cc23dd2fa819d78e3ec2e08346e771f610b62c6
- Unchanged service.ts SHA256: 2215a3872265b4770aa4f3a3812d687643b30b0edaae674d07487af19506a970

No model call, Git operation or Cloud action was performed. Existing model evaluation manifests were not overwritten.

Coordinator-authorized final copy change: feedback success says only that feedback was received; API delivery/failure behavior is unchanged. Acknowledgement alone does not prove durable storage. Root separately reports actual Cloud Logging readback for one operator functional-test vote; that is not user satisfaction feedback. The user's citation-readability request is separate qualitative user feedback.


## Deployment record

Deployed to https://modu-rich-quest06-fyzai5fn7a-du.a.run.app as **modu-rich-quest06-v6-ui-20261109**, Ready 2026-11-09T03:33:42.747564Z, traffic100%. Cloud Build 0b3bf33e-9490-4c5e-b699-2d0a6eeebedb succeeded 2026-11-09T03:33:25.832176Z; immutable digest sha256:13567eff66569a7da6a5d3198b222e8a6243b726fdbcf650877893688240512b. Approved BriefingForm/BriefingCitations hashes and unchanged v6 inference were verified against the actual uploaded archive (SHA-256 304929fdcd4dec551881346748ac26d34e1598299e993b06200ddb05ac885b1c); only those two UI files differ from the previous deployed source. Runtime config and secret references were unchanged.

All15 unauthenticated security HTTP checks passed at 2026-11-09T03:34:32.672Z. Root was notified on Ready; authenticated fresh-AAPL/citation dialog/original-source/mobile smoke is separately owned and is not implied by these server checks. No worker model/browser/feedback request occurred. See [deployment verification](deployment-verification.md#citation-ui-release--current-live-revision) for image/source/rollback evidence.

## Final authenticated browser smoke

[Safe record](evidence/deployed-ui-smoke.json): HTTP200, five short citation buttons, original source/link match, no horizontal overflow, Escape closes and focus returns to the invoking button. Initial focus was the source link inside the dialog, not Close. Interaction used DOM click; no physical-touch claim. This separate actual model call used input2979/output446, server3961ms and estimated USD0.0005209; it is excluded from the paired remote six-call comparison. [Screenshots and context](deployed-live-verification.md#최종-ui-배포와-별도-smoke).
