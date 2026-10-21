# Chat and coding studio review - v2.27.0

The initial chat refinement used `20261021-chat27c`, including the lighter, underlined privacy link. The subsequent v2.27.1 accessibility follow-up uses `20261021-accessibility27` uniformly; its fixes and pending human acceptance are in [Accessibility review](ACCESSIBILITY-REVIEW.md). The current Worker build differs from deployed version `47e0fa28` only in five esbuild module-path comment lines; an exact line comparison found no executable-code changes. That reproducible artifact is 151,867 bytes, SHA-256 `9a3fbdb76ad88570b585b9df9df1b263d7d8e4511929e8ae9e4b0a77af7559e7`. The separately recorded 151,822-byte hash below identifies the actual deployed artifact. The prior chat27c artifact was 151,827 bytes, SHA-256 `f1f20ca58c98cf2627e528a50dcb1088aa8e686c3b883e89100114514fab1c69`.

This change adds three investigations to the existing coding pathway: CODE-504 Pixel Pet Snack Time (grades 7-8), CODE-505 Arcade Prize Patrol (grades 9-10), and CODE-506 Rover Energy Planner (grades 11-12). The catalog now contains 32 investigations, including six coding investigations, plus five separate starter modules.

## Practice and safety boundaries

Both syntax choices use a custom local teaching interpreter. It accepts reviewed JavaScript or Python subsets; it does not execute submitted text as native browser JavaScript, a Python runtime, shell commands, or uploaded programs. Imports, packages, browser/device APIs, network access, objects, functions, and unbounded loops are unavailable. Input names are read-only. Source, token, nesting, variable, numeric, execution-step, loop, string, and output limits remain enforced.

Switching syntax retains the draft without translating it and invalidates previous test results. Reset starter explicitly replaces the draft with an example for the selected syntax. A separate made-up input is for ungraded experimentation. It cannot pass official fixtures. Reports identify the practice language. Restored coding records revalidate current code and language before retaining verified/delivered flags, while keeping written work.

## Chat behavior

The latest eight question/reply pairs remain in an open messenger-style conversation above the composer. Extra chat is session-only and excluded from reports/evidence. Clues and evidence, the first-idea panel, and the hypothesis-test panel start open and remain closable. Honest direct identity answers and site simulation/privacy notices remain available without repetitive character labeling.

AI replies start on with a question-free availability GET. Only a newly submitted eligible question can send the reviewed lab-ID/topic pair for inference. Raw words, notes, drafts, history, and equipment state stay local. One AI on/off button works during availability checking, beside a Reply privacy link. Off choices and automatic service/quota fallback persist during ordinary navigation in page memory. Turning AI back on performs a fresh availability check without sending or replaying an earlier question.

The existing shared atomic D1 admission ledger, fixed model, short response, and no-retry policy remain. Its 25-unit two-day reservation and 6,000-unit bucket caps are conservative feature controls, not provider metering or an account-wide $5 billing guarantee.

## Verification recorded on 2026-10-21

- Windows suite: 1,002 tests; 1,000 passed; two platform-specific skips; zero failures. Linux CI: all 1,002 passed with zero skips.
- Syntax/curriculum checks passed; isolated build produced 66 reviewed public files.
- Independent parser review and adversarial probes found no host-capability or loop-limit escape in the tested cases. This is not a formal security audit.
- All six investigations passed authored fixtures in both syntax modes in automated checks. All 5,152 trusted requester prompt pairs fit the prompt boundary.
- Actual Chrome checks: repaired Pixel Pet in Python (3/3), Arcade in JavaScript (6/6), and Rover in Python (4/4). Pixel Pet custom input 7 returned Energy 28 without changing fixture credit. Python import was rejected without executing it; the current result returned to 0/4.
- Python draft/results survived step navigation. The requester chat stayed open, produced a local reply, and displayed open clue/idea/test panels.
- Earlier local checks used compact 960x540 and 320x640 viewports. The final public-preview browser was actually 1536x735; later viewport-override attempts did not change that size. No 1366-width acceptance check is claimed for this release. Normal vertical scrolling remains necessary; this is not physical Chromebook or assistive-technology certification.

Public-preview CODE-504 also passed its Python repair checks (3/3). Its actual report identified `PRACTICE LANGUAGE: Python subset` and the correct source and output. The unfinished activity's report remained `IN PROGRESS`. Casual cloud-question text was absent from the report. Turning AI off persisted from CODE-504 to CODE-505 and back. Casual chat history cleared when leaving the case; cross-case transcript persistence is not claimed.

At recorded source checkpoint `45d83d086763ea15cd97ca826c705ddffc64167c`, [PR #27](https://github.com/AL91Cole/cole-learning-labs/pull/27) was open, cleanly mergeable, and all six GitHub checks passed. Linux ran 1,002/1,002 tests with no skips; Windows passed 1,000 with two platform-specific skips and no failures. The [branch preview](https://codex-chat-and-safe-coding.cole-learning-labs.pages.dev/) is verified. These results apply to the recorded source revision. Production frontend publication still requires PR #27 merge.

The reviewed 32-case Worker bundle was deployed through exact Cloudflare editor copy and reported Active `47e0fa28`, with both runtime flags true and AI/D1 bindings preserved. Its size was 151,822 bytes, SHA-256 `0d6af984d94025aa1ca4363eeb0e45ee5d94a955d633d56d50fe5a7173288ef6`. The exact branch origin was added while preserving the prior three allowed origins, with no wildcard.

On the preview, cloud availability started automatically without a checkbox. In CODE-504, Noel's favorite-color question produced the genuine cloud reply, “I am Noel. My favorite color is apricot orange.” D1 reservation totals for UTC October 21 and 22 each increased from 50 to 75, matching one 25-unit reservation in each bucket; the ledger was not reset. Turning cloud off worked immediately and stayed off after navigation to CODE-505. This is a live request and preference-persistence check, not a general model-quality, billing, or live-exhaustion guarantee.
