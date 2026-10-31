# Chromebook lab and requester review

Source release `20261021-chat27`, version `2.27.0`, October 21, 2026. This records the 32-case source, local checks, separately deployed Worker, and verified PR #27 preview. Production frontend publication still requires PR #27 merge; school approval is not established. Earlier v2.26.0/`acfd4943` observations below are historical.

## Reading and equipment changes

The current refinement has 32 investigations, including six coding cases, plus five beginner labs: 37 activities in total. The chat log is always open above its composer; Clues & evidence, My first idea, and Test my idea start expanded but can be closed. Starter questions, optional help/vocabulary/examples, and the action log start closed. Open-state choices survive movement between investigation steps. Requesters use natural role/case greetings without repeated self-disclaimers; direct questions about identity and capabilities still get truthful answers, and unknown case details remain unknown.

The coding editor offers documented subsets of ordinary JavaScript and Python syntax through a local bounded interpreter, with compatible legacy teaching-source programs. Pixel Pet Snack Time (7–8), Arcade Prize Patrol (9–10), and Rover Energy Planner (11–12) add expression, boundary, and accumulation tasks. No imports, browser/file/network access, or general language runtime is introduced. The refreshed 32-case Worker and PR #27 preview are now verified; production frontend publication awaits PR #27 merge.

The visual refresh uses a 17px default page type size, warmer public pages, consistent colored pathway illustrations, and clearer cards. Dark teal and navy workspaces retain visible focus, labeled controls, larger-text support, and keyboard/touch alternatives. Grade-band wording changes the amount of language support without changing the task or its checks: grades 7–8 use plain English and define terms; grades 9–10 introduce technical terms with short explanations; grades 11–12 emphasize precise evidence, predictions, and limitations.

The complete PC and monitor now have the workbench's full available width, with equivalent controls below the picture rather than a narrow inspector beside it. The default fitted view keeps the whole schematic visible at a bounded height. **Expand picture** uses the available width for a larger image; **Fit picture** or Escape restores the fitted view. Expansion changes presentation only. It does not modify equipment, records, tests, or progress, and does not invoke browser fullscreen or trap scrolling.

The Power symbol button uses the existing startup and shutdown actions. Turning it on checks startup; it does not repair a fault or award completion. Internal work still requires switching off and disconnecting virtual AC. Static text readouts and large component/cable controls remain available. Short windows can require normal vertical page scrolling: the design does not promise that every picture, instruction, and control fits on one screen.

The three investigation pages retain unfinished questions, notes, code, settings, and equipment while students move within the same investigation. Browser Back/Forward and numbered navigation preserve the mounted workbench. Leaving the workbench pauses its activity; explicit reset and clear controls retain their existing behavior.

## Local conversation and the topic-only boundary

All 32 investigations have distinct authored fictional requester profiles with a role, voice, interests, preferences, and case focus. The expanded offline library combines 112 authored topic cards, 32 profiles, and five reply styles: 17,920 possible compositions and 17,360 distinct measured replies, each at most 300 characters without clipping. These are composed possibilities, not individually written answers or model generations. The new library measured about 10.4 KB gzipped. Bounded small talk, 36 definitions, arithmetic, short-term context, and honest unknown replies remain local. It is finite, not an unrestricted AI model. Canonical case facts and supported current observations remain local and take priority over casual conversation.

Fast character works immediately without a provider, app installation, or AI model download. Extra conversation stays in an eight-pair page-memory history and is excluded from saved work, exported reports, and inquiry credit. Accepted authored case questions continue through the existing record and privacy controls. Private-looking input and requests for hidden instructions are refused, but filtering cannot reliably detect every identifying detail.

The optional remote transport now contains exactly two authored identifiers: `{scenarioId, topic}`. There are **161 allowed topics: 13 original character topics, 36 definitions, and 112 authored library cards**. A recognized question is mapped locally to a topic ID; the learner's typed words never become that remote request or model input. Notes, conversation history, records, current equipment state, and client-supplied prompts are also excluded. Unknown questions, calculations, case questions, and current-state observations remain offline.

In the current source, eligible extra topics use cloud replies by default after an automatic availability check. A visible on/off control replaces the consent checkbox. Generated variation can express an allowed topic in the requester's voice and grade band. The refreshed 32-case Worker and preview have passed the live checks below; production frontend publication awaits PR #27 merge. Generated replies cannot supply canonical case clues, alter equipment, earn evidence, verify a repair, award completion, or enter saved work and reports. They can still be incorrect and need human judgment.

AI replies start off for eligible extra conversation in a fresh page. No cloud request, including an availability GET, is sent until the learner explicitly turns them on beside the Cloudflare processing disclosure. That availability GET carries no question and performs no inference. The choice is held only in page memory and resets off on a fresh page. Only a newly submitted question that maps to one of the 161 fixed authored topic IDs can request a model reply. One **AI on/off** button works during the check, and **Reply privacy** opens the service information. Turning AI off, or an automatic error/quota fallback, stays in effect across ordinary lab navigation in this page; it is not saved in browser storage. Turning AI back on performs a fresh availability check without sending or replaying an earlier question. Every inference must still pass the backend's shared budget guard.

The conversation is always open, with messages above the composer and speaker/source labels. **Clues & evidence**, **My first idea**, and **Test my idea** start expanded, remain closable, and retain their open state while moving between steps. Starter questions, **Help & practice options** (including vocabulary and worked examples), and the action log start closed. Requesters introduce their role and case naturally without repeated self-disclaimers; direct identity questions, unknown facts, and hypothetical stories retain honest boundaries.

## Guarded service and activation limits

The reviewed `worker-requester/worker.js` bundle is deployed as a standalone topic responder on the existing Paid account. It rebuilds prompts from fixed authored instructions and fictional profiles; case briefs, clues, goals, repairs, rubrics, and learner work are absent. All 5,152 lab/topic combinations passed the 2,500-byte UTF-8 prompt guard. One fixed `@cf/meta/llama-3.1-8b-instruct-fp8-fast` call uses at most 140 output tokens; returned ungraded JSON text is bounded to 600 characters and screened for obvious private details, HTML, code blocks, and links. No retries, Gateway credits, alternate models, or caller-selected parameters are used.

A D1 aggregate ledger atomically reserves 25 units in BOTH today's and tomorrow's UTC buckets, each capped at 6,000. There are no refunds for cancellation, errors, timeout, or unknown commits. Missing, malformed, broken, exhausted, or stale-day reservations fail closed before inference. The database stores only UTC dates and aggregate reservation totals, not user content, topics, or identifiers. Keep this ledger across deploys and disable inference before any restore/reset.

An empty two-day window permits at most 240 starts. With prior-day carryover, sustained availability is ordinarily about 120 per day; it is not an unconditional 240 daily reset. The two-day reserve covers one near-midnight rollover conservatively, not all possible provider attribution. A 25-unit reservation is an engineering margin under fixed model/prompt/output assumptions, not actual metered usage or a provider-certified bound. The 4,000-unit gap below the included 10,000 daily neurons is headroom. Other account AI usage, Paid infrastructure, D1, requests, and overages remain outside this feature's cutoff; there is no absolute $5 account-total guarantee.

The reviewed 32-case Worker was deployed through exact editor copy and reported Active `47e0fa28`, with AI/D1 bindings and both true runtime enablement flags preserved. Fresh-deployment source flags remain false. The exact new branch-preview origin was added while preserving the prior three entries, without a wildcard. Main CSP still adds only the exact requester Worker origin; reports keep no connections and teachers remain self-only. The legacy Pages requester source lock and classroom gate remain false. Earlier `acfd4943` deployment evidence is historical.

On the preview, cloud availability started automatically without a checkbox. In CODE-504, Noel's favorite-color question produced the genuine cloud reply, “I am Noel. My favorite color is apricot orange.” D1 reservation totals for UTC October 21 and 22 each increased from 50 to 75, matching one 25-unit reservation in each bucket; the ledger was not reset. Turning cloud off worked immediately and stayed off after navigation to CODE-505. This is a live request and preference-persistence check, not a general model-quality, billing, or live-exhaustion guarantee. Production frontend publication awaits PR #27 merge. Atomic SQLite and mocked provider tests cover the shared cutoff; live budget exhaustion was not attempted. Environment assertions do not detect a plan or cap account charges, and CORS is not authentication. See [Worker operations](../worker-requester/README.md) and [deployment requirements](DEPLOYMENT.md).

## Verification and remaining device checks

Verification recorded at source checkpoint `45d83d086763ea15cd97ca826c705ddffc64167c`:

| Check | Result |
| --- | --- |
| Linux `npm test` | 1,002 passed, 0 failed, 0 skipped |
| Windows `npm test` | 1,000 passed, 0 failed, 2 platform-specific file-link checks skipped |
| `npm run check` | 51 application and server modules syntax checked |
| `npm run build` | 66 reviewed public files prepared |
| Provider integration tests | Fake bindings for automated tests; one real preview reply verified separately |
| Cloudflare deployment | Refreshed 32-case bundle, reported Active `47e0fa28`; true runtime flags and AI/D1 preserved |

Historical v2.26.0 preview evidence at `faed5d18c0759bbc299aa5a2baf1a30b550237b3` included one breakfast reply and a 25-to-50 reservation increment in each of two UTC-day buckets, plus authored case-fact and offline story checks. It describes the earlier consent/opt-in UI, not the current automatic-availability behavior.

At recorded source checkpoint `45d83d086763ea15cd97ca826c705ddffc64167c`, [PR #27](https://github.com/AL91Cole/cole-learning-labs/pull/27) was open, cleanly mergeable, and all six GitHub checks passed. Linux ran 1,002/1,002 tests with no skips; Windows passed 1,000 with two platform-specific skips and no failures. The [branch preview](https://codex-chat-and-safe-coding.cole-learning-labs.pages.dev/) is verified. These results apply to the recorded source revision. Production frontend publication still requires PR #27 merge.

Tests cover retained learner work, authored facts, power behavior, fitted/expanded picture controls, privacy/source locks, all allowed topics, rejected raw questions and extra fields, fixed inference parameters, bounded output, grade-band instructions, error/quota fallback, and cancellation. Passing mocked tests does not verify an actual provider deployment, model accuracy, account plan, or spending boundary.

Browser observations for this refinement used fictional data:

| Browser viewport | Observed result |
| --- | --- |
| Actual public preview: 1536 × 735 | CODE-504 Python repair passed 3/3. The report identified Python subset, correct source/output, and IN PROGRESS for the unfinished activity; casual AI-question text was absent. AI-off remained set through CODE-504 → CODE-505 → CODE-504 |
| Earlier local: 960 × 540 and 320 × 640 | Compact coding/chat layouts were checked. Later viewport-override attempts did not change the actual 1536 × 735 browser; no 1366-width acceptance check is claimed for this release |

These are **browser viewport checks**, not tests on a physical 10–11-inch or 4 GB Chromebook. The expanded picture uses ordinary page scrolling. Casual chat history clears when leaving a case; the in-page AI-off preference persists across that navigation. Physical screen size does not determine usable browser space, zoom, or school policy. Recheck current keyboard, touch, zoom, larger text, screen-reader behavior, downloads, and the actual managed device and network before classroom use. No universal browser compatibility, accessibility certification, or school approval is established by these results.
