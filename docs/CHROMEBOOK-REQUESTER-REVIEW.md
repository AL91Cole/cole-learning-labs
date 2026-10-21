# Chromebook lab and requester review

Source release `20261020-chromebook25`, version `2.25.0`, October 20, 2026. This records the current phase 3 source and local verification; it does not establish a production deployment or school approval.

## Reading and equipment changes

The visual refresh uses a 17px default page type size, warmer public pages, consistent colored pathway illustrations, and clearer cards. Dark teal and navy workspaces retain visible focus, labeled controls, larger-text support, and keyboard/touch alternatives. Grade-band wording changes the amount of language support without changing the task or its checks: grades 7–8 use plain English and define terms; grades 9–10 introduce technical terms with short explanations; grades 11–12 emphasize precise evidence, predictions, and limitations.

The complete PC and monitor now have the workbench's full available width, with equivalent controls below the picture rather than a narrow inspector beside it. The default fitted view keeps the whole schematic visible at a bounded height. **Expand picture** uses the available width for a larger image; **Fit picture** or Escape restores the fitted view. Expansion changes presentation only. It does not modify equipment, records, tests, or progress, and does not invoke browser fullscreen or trap scrolling.

The Power symbol button uses the existing startup and shutdown actions. Turning it on checks startup; it does not repair a fault or award completion. Internal work still requires switching off and disconnecting virtual AC. Static text readouts and large component/cable controls remain available. Short windows can require normal vertical page scrolling: the design does not promise that every picture, instruction, and control fits on one screen.

The three investigation pages retain unfinished questions, notes, code, settings, and equipment while students move within the same investigation. Browser Back/Forward and numbered navigation preserve the mounted workbench. Leaving the workbench pauses its activity; explicit reset and clear controls retain their existing behavior.

## Local conversation and the topic-only boundary

All 29 investigations have distinct authored fictional requester profiles with a role, voice, interests, preferences, and case focus. The offline library supports bounded small talk, 36 technology definitions, simple calculations, and honest unknown replies. It is finite, not an unrestricted AI model. Canonical case facts and supported current observations remain local and take priority over casual conversation.

Fast character works immediately without a provider, app installation, or AI model download. Extra conversation stays in an eight-pair page-memory history and is excluded from saved work, exported reports, and inquiry credit. Accepted authored case questions continue through the existing record and privacy controls. Private-looking input and requests for hidden instructions are refused, but filtering cannot reliably detect every identifying detail.

The optional remote transport now contains exactly two authored identifiers: `{scenarioId, topic}`. There are **49 allowed topics: 13 character topics and 36 technology definitions**. A recognized question is mapped locally to a topic ID; the learner's typed words never become that remote request or model input. Notes, conversation history, records, current equipment state, and client-supplied prompts are also excluded. Unknown questions, calculations, case questions, and current-state observations remain offline.

If separately configured and approved, generated variation could express an allowed topic in the selected fictional character's voice and grade band. It cannot supply canonical case clues, alter equipment, earn evidence, verify a repair, award completion, or enter saved work and reports. Generated text can still be incorrect and needs human judgment.

## Prepared service and activation limits

`worker-requester/worker.js` prepares a separate Workers Free-only service. It validates the exact lab/topic pair and rebuilds its prompt from source-controlled fictional profiles and topic templates. Case briefs, clues, repairs, goals, rubrics, and learner data are absent from its model context. It uses one fixed `@cf/meta/llama-3.1-8b-instruct-fp8-fast` call with a 140-output-token limit and no retries, Gateway credits, alternate provider, or model selected by the caller. Returned JSON contains at most 600 characters of ungraded plain text; output checks reject obvious private details, HTML, code blocks, and links.

The Worker configuration is disabled. No new Free account, Worker deployment, AI activation, or live inference has been approved or completed for this preparation. `src/requester-config.js` still points to the legacy same-origin `/api/requester` route. Its older `functions/api/requester.js` production entry retains the hardcoded false privacy lock; an environment assertion cannot open it. The independent classroom privacy gate remains unchanged and closed.

Strict no-inference-overage operation depends on an independently verified **Workers Free account**, whose provider-enforced allowance currently stops further inference beyond 10,000 neurons per day. Other services in that account share the allowance. Workers Paid can bill beyond its included allowance; neither a subscription's base fee nor this code creates a Paid-account spending ceiling. Environment flags assert an operator's review, not automatic subscription detection. Account selection or creation remains a separate user decision. See [Worker setup](../worker-requester/README.md), [deployment requirements](DEPLOYMENT.md), and [Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

Anonymous backstops allow two unfinished calls, 12 starts per minute, and 500 starts per UTC day **per isolate**. Other isolates and restarts have separate counters, so these are not global quotas or spending caps. A timeout stops waiting but may not cancel provider inference; its concurrency slot stays occupied until the invocation settles. HTTP 429 switches AI mode off automatically and keeps the immediate offline reply. Other network/provider failures also retain that reply. New questions, revoked consent, and route cleanup suppress stale responses.

Any future activation needs account verification, an exact HTTPS origin allowlist, an AI binding, the reviewed Worker URL and matching site connection policy, explicit visitor opt-in, and applicable provider/school review. CORS is not authentication. Only authored topic IDs leave the browser, but Cloudflare would still receive the selected topic, lab ID, and ordinary connection metadata. No live model quality, provider account configuration, or absence of all privacy risk is claimed.

## Verification and remaining device checks

Current local Windows verification:

| Check | Result |
| --- | --- |
| Full `npm test` | 900 tests: 898 passed, 0 failed, 2 Windows-specific checks skipped |
| `npm run check` | 48 application and server modules syntax checked |
| `npm run build` | 63 reviewed public files prepared |
| Provider integration tests | Fake bindings only; zero live inference calls |

Tests cover retained learner work, authored facts, power behavior, fitted/expanded picture controls, privacy/source locks, all allowed topics, rejected raw questions and extra fields, fixed inference parameters, bounded output, grade-band instructions, error/quota fallback, and cancellation. Passing mocked tests does not verify an actual provider deployment, model accuracy, account plan, or spending boundary.

Current Chrome browser observations used fictional data:

| Browser viewport | Observed result |
| --- | --- |
| 1366 × 600 | Fitted SVG measured 742.9 × 488.9 CSS pixels; expanded SVG measured 1273.4 × 838.1; Escape restored the fitted view |
| 960 × 600 | Library had no horizontal document overflow; default page type measured 17px |

These are **browser viewport checks**, not tests on a physical 10–11-inch or 4 GB Chromebook. The expanded picture is intentionally taller than a short viewport and uses ordinary page scrolling. Physical screen size does not determine usable browser space, zoom, or school policy. Recheck current keyboard, touch, zoom, larger text, screen-reader behavior, downloads, and the actual managed device and network before classroom use. No universal browser compatibility, accessibility certification, or school approval is established by these results.
