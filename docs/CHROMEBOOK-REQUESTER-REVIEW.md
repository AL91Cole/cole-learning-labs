# Chromebook lab and requester review

Source release `20261020-requester26`, version `2.26.0`, October 20, 2026. This records the current visual and phase 4 requester source, local verification, and separately deployed Worker. PR #26's frontend preview/merge and successful live-reply verification remain pending; school approval is not established.

## Reading and equipment changes

The visual refresh uses a 17px default page type size, warmer public pages, consistent colored pathway illustrations, and clearer cards. Dark teal and navy workspaces retain visible focus, labeled controls, larger-text support, and keyboard/touch alternatives. Grade-band wording changes the amount of language support without changing the task or its checks: grades 7–8 use plain English and define terms; grades 9–10 introduce technical terms with short explanations; grades 11–12 emphasize precise evidence, predictions, and limitations.

The complete PC and monitor now have the workbench's full available width, with equivalent controls below the picture rather than a narrow inspector beside it. The default fitted view keeps the whole schematic visible at a bounded height. **Expand picture** uses the available width for a larger image; **Fit picture** or Escape restores the fitted view. Expansion changes presentation only. It does not modify equipment, records, tests, or progress, and does not invoke browser fullscreen or trap scrolling.

The Power symbol button uses the existing startup and shutdown actions. Turning it on checks startup; it does not repair a fault or award completion. Internal work still requires switching off and disconnecting virtual AC. Static text readouts and large component/cable controls remain available. Short windows can require normal vertical page scrolling: the design does not promise that every picture, instruction, and control fits on one screen.

The three investigation pages retain unfinished questions, notes, code, settings, and equipment while students move within the same investigation. Browser Back/Forward and numbered navigation preserve the mounted workbench. Leaving the workbench pauses its activity; explicit reset and clear controls retain their existing behavior.

## Local conversation and the topic-only boundary

All 29 investigations have distinct authored fictional requester profiles with a role, voice, interests, preferences, and case focus. The expanded offline library combines 112 authored topic cards, 29 profiles, and five reply styles: 16,240 possible compositions and 15,680 distinct measured replies, each at most 300 characters without clipping. These are composed possibilities, not individually written answers or model generations. The new library measured about 10.4 KB gzipped. Bounded small talk, 36 definitions, arithmetic, short-term context, and honest unknown replies remain local. It is finite, not an unrestricted AI model. Canonical case facts and supported current observations remain local and take priority over casual conversation.

Fast character works immediately without a provider, app installation, or AI model download. Extra conversation stays in an eight-pair page-memory history and is excluded from saved work, exported reports, and inquiry credit. Accepted authored case questions continue through the existing record and privacy controls. Private-looking input and requests for hidden instructions are refused, but filtering cannot reliably detect every identifying detail.

The optional remote transport now contains exactly two authored identifiers: `{scenarioId, topic}`. There are **161 allowed topics: 13 original character topics, 36 definitions, and 112 authored library cards**. A recognized question is mapped locally to a topic ID; the learner's typed words never become that remote request or model input. Notes, conversation history, records, current equipment state, and client-supplied prompts are also excluded. Unknown questions, calculations, case questions, and current-state observations remain offline.

After explicit browser consent and opt-in, generated variation can express an allowed topic in the selected fictional character's voice and grade band. Its deployed Worker is runtime-enabled, while frontend release and live-reply acceptance remain pending. It cannot supply canonical case clues, alter equipment, earn evidence, verify a repair, award completion, or enter saved work and reports. Generated text can still be incorrect and needs human judgment.

## Guarded service and activation limits

The reviewed `worker-requester/worker.js` bundle is deployed as a standalone topic responder on the existing Paid account. It rebuilds prompts from fixed authored instructions and fictional profiles; case briefs, clues, goals, repairs, rubrics, and learner work are absent. All 4,669 lab/topic combinations passed the 2,500-byte UTF-8 prompt guard. One fixed `@cf/meta/llama-3.1-8b-instruct-fp8-fast` call uses at most 140 output tokens; returned ungraded JSON text is bounded to 600 characters and screened for obvious private details, HTML, code blocks, and links. No retries, Gateway credits, alternate models, or caller-selected parameters are used.

A D1 aggregate ledger atomically reserves 25 units in BOTH today's and tomorrow's UTC buckets, each capped at 6,000. There are no refunds for cancellation, errors, timeout, or unknown commits. Missing, malformed, broken, exhausted, or stale-day reservations fail closed before inference. The database stores only UTC dates and aggregate reservation totals, not user content, topics, or identifiers. Keep this ledger across deploys and disable inference before any restore/reset.

An empty two-day window permits at most 240 starts. With prior-day carryover, sustained availability is ordinarily about 120 per day; it is not an unconditional 240 daily reset. The two-day reserve covers one near-midnight rollover conservatively, not all possible provider attribution. A 25-unit reservation is an engineering margin under fixed model/prompt/output assumptions, not actual metered usage or a provider-certified bound. The 4,000-unit gap below the included 10,000 daily neurons is headroom. Other account AI usage, Paid infrastructure, D1, requests, and overages remain outside this feature's cutoff; there is no absolute $5 account-total guarantee.

The reviewed guarded Worker is deployed as reviewed bundle deployment `acfd4943`, with `AI`/`REQUESTER_BUDGET` bindings and D1 schema configured. Actual Cloudflare SQL verified a 25-unit reservation in both UTC-day rows without AI. Dashboard runtime `REQUESTER_ENABLED` and `REQUESTER_BILLING_REVIEWED` settings are both true; fresh-deployment source defaults remain false. No new OAuth access, API key, or account was needed. PR #26's v2.26.0 frontend still awaits preview verification and merge, and no successful live model reply has yet been verified. `src/requester-config.js` points directly to `https://cole-learning-labs-requester.alan91cole.workers.dev/api/requester`; the main CSP adds only that exact origin, reports retain no connections, and the teacher route remains self-only. The legacy Pages requester source lock and classroom privacy gate remain false.

Worker deployment and visible runtime enablement do not establish end-to-end acceptance. Frontend checks must still verify live replies, ledger behavior, exact origins, opt-in, and fallback; applicable provider/school requirements and billing assumptions remain separate reviews. Environment assertions do not detect a plan or cap account charges. CORS is not authentication. Selected authored topics and ordinary connection metadata still reach Cloudflare. Every failure retains offline conversation; HTTP 429 switches optional AI off. A timed-out provider call may continue, so its concurrency slot stays occupied and its budget reservation is not returned. See [Worker operations](../worker-requester/README.md) and [deployment requirements](DEPLOYMENT.md).

## Verification and remaining device checks

Current local Windows verification:

| Check | Result |
| --- | --- |
| Full `npm test` | 931 tests: 929 passed, 0 failed, 2 Windows file-link checks skipped |
| `npm run check` | 51 application and server modules syntax checked |
| `npm run build` | 65 reviewed public files prepared |
| Provider integration tests | Fake bindings only; successful live-reply verification pending |
| Cloudflare deployment | Reviewed Worker reviewed bundle deployment `acfd4943`; both runtime enablement flags true; AI/D1 bindings configured |

Tests cover retained learner work, authored facts, power behavior, fitted/expanded picture controls, privacy/source locks, all allowed topics, rejected raw questions and extra fields, fixed inference parameters, bounded output, grade-band instructions, error/quota fallback, and cancellation. Passing mocked tests does not verify an actual provider deployment, model accuracy, account plan, or spending boundary.

Current Chrome browser observations used fictional data:

| Browser viewport | Observed result |
| --- | --- |
| 1366 × 600 | Fitted SVG measured 742.9 × 488.9 CSS pixels; expanded SVG measured 1273.4 × 838.1; Escape restored the fitted view |
| 960 × 600 | Library had no horizontal document overflow; default page type measured 17px |

These are **browser viewport checks**, not tests on a physical 10–11-inch or 4 GB Chromebook. The expanded picture is intentionally taller than a short viewport and uses ordinary page scrolling. Physical screen size does not determine usable browser space, zoom, or school policy. Recheck current keyboard, touch, zoom, larger text, screen-reader behavior, downloads, and the actual managed device and network before classroom use. No universal browser compatibility, accessibility certification, or school approval is established by these results.
