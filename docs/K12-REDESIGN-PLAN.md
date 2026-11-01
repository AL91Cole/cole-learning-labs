# Cole Learning Labs: proposed K–12 development plan

Prepared November 1, 2026. This is a design and review sequence, not activation approval, a launch date or a promise of legal compliance. The follow-up review build now includes fifteen K–6 activities across K–1, 2–3 and 4–6, alongside the existing grades 7–12 courses and investigations. The elementary activities use pictures, fixed choices and bounded local models, with no text entry, accounts, storage, reporting, AI or collection. They are initial implementations for educator and accessibility evaluation; the broader redesign and school-release steps below remain separate.

## Decisions carried forward

- Keep all five beginner courses, the practice workbench for free cases and two investigations per topic free. See [the exact access policy](ACCESS-POLICY.md).
- Keep the other 32 investigations, studios, open coding sandboxes, capstone and teaching resources reserved for approved adult subscribers. Prices, purchases and paid delivery remain disabled. Students must not share an adult purchaser's account.
- Keep classroom accounts, roster imports, grade synchronization, improvement sharing and student collection disabled. A membership or a new age-band design cannot approve these independently gated services.
- Develop younger-age prototypes with invented characters and synthetic work. No student accounts, advertising, behavioral analytics, recordings or live AI are needed for the proposed elementary activities.
- Add no paid provider feature, domain, account, subscription or upgrade in this work. Future deployment capacity and costs need a separate review before any resource is created.

The owner has approved including the initial fifteen elementary activities in free access. The older ten-case free allowlist remains unchanged, and students gain no access to adult-only tools or billing accounts. Future elementary activities need their own content/access decision. Initial activities should be evaluated with synthetic work and approved staff before school use; the relevant review steps still apply.

## Phase 1: correct the current experience

The audit follow-up changes the existing student entry without changing its age suitability or learning gates:

| Change | Intended result | Acceptance evidence |
| --- | --- | --- |
| Put beginner courses and topic links before portfolio projects | A new visitor can find an appropriate starting activity immediately | Keyboard, narrow-screen and ordinary-browser walkthrough |
| Label the biography “About Mx. Cole” | Avoid confusing the name with AI | Header and home navigation agree |
| Shorten the first AI disclosure | Explain opt-in, external processing and fictional details in fewer words | Full notice remains linked; cloud replies start off; typed questions are not sent |
| Show items explored and remaining | Make progress understandable without claiming that opening an item proves reading or mastery | Existing exploration/practice/check gates and focus behavior still pass |
| Explain completed investigation counts | Clarify what “finished” measures and which free/member catalogue is delivered | Visible accessible explanation; public count uses ten cases |
| Publish security contact and strengthen static headers | Make reporting discoverable and reduce specific browser/indexing risks | Compiled-artifact, header and delivery tests |

The separate [operations review](OPERATIONS-AUDIT-2026-11-01.md) covers DNS, hosting aliases, school-safe flood controls and GitHub settings. These are not silently changed by a code merge.

## Phase 2: establish the design system and review baseline

Before building a new age band, choose one small learning objective per activity, its prerequisites, a successful demonstration and an accessible alternative. Map each objective to the applicable standard and keep evidence beside the activity. A theme or grade label alone does not establish alignment.

Use New York's published bands for the standards map: K–1, 2–3, 4–6, 7–8 and 9–12. A child-facing navigation scheme can be simpler, but retain an explicit crosswalk rather than presenting the audit's K–2/3–5/6–8 bands as the NYSED structure. Grade choice should remain page-local and optional; request no birth date or school identifier. Sources: [NYSED grade-band documents](https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency), [NYSED FAQ](https://www.nysed.gov/standards-instruction/computer-science-digital-literacy-faq).

Review the [2026 CSTA PK–12 standards](https://csteachers.org/pk12standards/) as a secondary design reference. Record the edition and actual objective used; do not carry forward an older standards label or promise alignment before mapping and review. Existing lab source can provide simulation mechanics, while developmental suitability needs educator review.

Common prototype requirements:

- A clear task, optional hint, visible consequence and restart. Use short sentences, pictured controls with text labels and non-color feedback.
- Equivalent keyboard and single-pointer controls for every drag operation. Provide a selectable alternative to gestures, generous targets, visible focus, zoom support and a logical reading order.
- No countdown as the only way to succeed; timing should be optional and stoppable. No leaderboards, public names, streak pressure or persistent behavioral profiles.
- Reuse bounded simulation rules rather than exposing operating-system commands, uploaded executable code, browser objects or arbitrary network requests.
- Keep draft state in page memory. Any local saving/export must be explicit, understandable and independently clearable. A printable artifact must use no real name, class code or other identifier by default.
- Use teacher/staff walkthroughs and synthetic examples first. Any actual child research or classroom pilot needs a separate approved process; record no identifiable sessions as a shortcut to usability research.

## Phase 3: small elementary prototypes

Build one activity at a time. The proposed durations are design targets to validate, not measured completion times or required school schedules.

| Band and theme | First prototype and target | Safe engine reuse | Evidence of understanding |
| --- | --- | --- | --- |
| K–1: Tech Explorers | Match pictured input/output devices; about 3–5 minutes with adult guidance | Foundation picture cards with a reduced choice set | Select the device that helps an invented character hear, see or choose |
| 2–3: Tech Explorers | Guide a fictional robot using a few arrow steps; about 5–8 minutes | A restricted sequence of move/turn commands, with no typed code or open sandbox | Predict where the robot stops, then revise one step |
| 4–6: Digital Detectives | Spot a suspicious fictional message; about 8–12 minutes | Authored message inspection with inert links and no actual inbox | Choose an observable warning sign and a safe next action |
| 4–6: Digital Detectives | Route an invented parcel through a tiny network; about 8–12 minutes | A deliberately simplified packet model with three or four nodes | Explain why one blocked connection prevents delivery |

Do not reuse the full high-school repair gate, phishing examples or an adult member studio merely by adding a child-friendly skin. Reduce the concept count, language, controls and likely mistakes first. Password activities must use fictional examples rather than asking children to type a real or reused password. Hardware activities must be clearly virtual and should not encourage opening or rewiring a physical powered device.

Each prototype needs a short teacher guide: objective/prerequisites, invented scenario, accessible controls, likely misconceptions, hint sequence, success evidence, stopping point and off-screen alternative. Obtain elementary educator and accessibility review before claiming readiness for the intended band.

## Phase 4: bridge to the current labs

For grades 7–8, adapt the existing free cases with shorter request cards, optional picture vocabulary and smaller chunks of evidence. Preserve the same technical outcomes and safety rules. For grade 6, determine fit within the 4–6 map and validate a separate bridge rather than relabeling every existing 7–8 investigation.

Keep grades 9–12 available at their current complexity. A future certification-objective crosswalk must identify the current exam edition, specific objective and actual task evidence; it must not claim vendor endorsement, exam preparation completeness or certification credit. The optional Linux terminal remains isolated and unavailable until its existing separate approval requirements are met.

## Phase 5: playful features with explicit limits

| Feature | Proposed boundary | Acceptance condition |
| --- | --- | --- |
| Mascot helper | Authored hints and invented character facts; no microphone, remote conversation or child profiling | Cannot solve a task, invent evidence or award mastery |
| Session sticker book / passport | Page-memory achievements; anonymous local print/export only | No name field, server upload, persistent ID or cross-visit tracking |
| Teacher projector mode | Staff controls one public or separately authorized activity; class discussion is offline | No collection of individual votes or student-device identifiers |
| Mystery case | Date-based selection from the currently permitted free catalogue | No tracking and no entitlement bypass |
| Escape sequence | Small authored puzzles; optional timer; fictional team label kept only in memory | Existing adult-only capstone is not exposed to students by this feature |
| Celebrations | Optional modest visual feedback; sound off until chosen | Respect reduced motion and mute; success remains understandable without effects |
| Blocks and text | Small, fixed command palette compiled to the existing bounded teaching language | No arbitrary JavaScript evaluation, imports, HTML output or network capability |
| Contrast and text options | Tested presets plus browser font/zoom support | Maintain contrast, focus, layout and equivalent controls; make no dyslexia-treatment claim |
| Spanish content | Human-reviewed instructions, labels, hints and privacy explanations | Test real reading order and comprehension; avoid automatic translation of private work |

Treat read-aloud as a separate accessibility feature. The Web Speech API can use remote voices. A future local-only implementation must explicitly select a voice with `localService === true`, decline when none is available, never fall back silently to the default/remote voice, and speak only allowlisted authored lesson text. Never read typed chat, reports, names or free text. Provide Stop, cancel on navigation and test target school devices; browser/OS behavior still needs review. Sources: [Web Speech specification](https://webaudio.github.io/web-speech-api/), [localService documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).

## Phase 6: release decision for each feature or band

Advance only when the particular activity has its own evidence:

1. Educators verify developmental suitability, misconceptions, standards mapping and intended lesson use.
2. Keyboard, touch, zoom, reduced motion, screen reader, narrow screen and the actual school-device/browser checks pass. Independent accessibility review remains distinct from automated tests.
3. A synthetic-data network and storage review shows exactly what leaves the page, including hosting/OS/provider metadata. No universal anonymity or PII-detection claim is made.
4. The operator and participating school review applicable COPPA, FERPA, New York Education Law §2-d/Part 121, child-data requirements, contracts, providers, retention, incident handling and school authority. Existing [privacy release requirements](PRIVACY-RELEASE-GATE.md) remain authoritative; a successful prototype is not legal approval.
5. The owner approves the free/content entitlement for the new activity, its actual hosting costs and a separate deployable release. Adult billing, classroom processing, improvement collection and cloud AI each retain their independent approvals.
6. Verify the published artifact and rollback path using fictional work before making the new activity discoverable. Publish an accurate age/access label and known limitations.

Planning order is Phase 1, then one elementary prototype and one teacher projector trial, followed by evidence-based revisions. Later phases can proceed independently when their dependencies are met. No calendar deadline, paid launch or K–12 availability is promised by this plan.
