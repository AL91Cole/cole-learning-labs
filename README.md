# Cole Learning Labs

A professional portfolio and browser-based technology learning platform created by Alan “Al” Cole / Mx. Cole, with 5 beginner labs and 32 troubleshooting investigations across five pathways for grades 7–12. Six investigations focus on coding; the complete catalog has 37 activities including the beginner labs.

The v2.27.0 coding studio adds three playful investigations, local JavaScript/Python subsets, custom input practice, and language-aware reports, alongside an open messenger conversation and default-on guarded cloud extras. See [Chat and coding studio review](docs/CODING-STUDIO-REVIEW.md) for verification and runtime boundaries.

The v2.27.1 accessibility follow-up targets WCAG 2.2 AA. It preserves keyboard focus and opened help through workbench updates, retains editor selection and scroll position, identifies writing/code errors at their fields, improves report/teacher controls, and adds structured HTML workbook and quiz alternatives. The earlier focus, contrast, reduced-motion, forced-colors, and named-control safeguards remain. See [Accessibility review and pending assistive-technology acceptance](docs/ACCESSIBILITY-REVIEW.md); hands-on ChromeVox/NVDA testing and qualified independent review are pending. This is not ADA certification or a completed conformance audit.

The learning-studio refresh adds a 17px default type size, warmer colors, consistent pathway illustrations, refreshed cards, grade-aware wording, and 32 distinct fictional requester profiles. The full PC picture uses more of the workbench; **Expand picture** offers a larger view, and **Fit picture** or Escape returns it to the fitted view. The physical-style Power button and equivalent keyboard/touch controls remain available. A short screen may still require normal page scrolling; this is not a promise that every control fits on screen at once.

Offline character works immediately. Its expanded library combines 112 authored topic cards, 32 fictional profiles, and five reply styles: 17,920 possible compositions, with 17,360 distinct measured replies, all at most 300 characters without clipping. These are deterministic composed possibilities, not 17,360 individually written answers or model generations. The new library measured about 10.4 KB when gzipped. Short-term conversational context stays in the page; unknown facts remain unknown.

Optional AI uses exactly an authored `{scenarioId, topic}` pair. The 161 reviewed topic IDs comprise the earlier 49 character/definition choices plus 112 library cards. Typed words, notes, history, and work never enter that request. Known authored topics can receive variation in the fictional character's voice; case evidence, current equipment observations, arithmetic, and unmatched questions stay offline. No app or AI model installation is needed. See [Worker setup and limits](worker-requester/README.md) and [requester review](docs/CHROMEBOOK-REQUESTER-REVIEW.md).

The reviewed 32-case requester Worker is deployed on the existing Paid account at `https://cole-learning-labs-requester.alan91cole.workers.dev/api/requester`; Cloudflare reported Active `47e0fa28`. Runtime `REQUESTER_ENABLED` and `REQUESTER_BILLING_REVIEWED` are true, with AI/D1 bindings preserved. Fresh-deployment source defaults remain false. The legacy Pages requester source lock and independent classroom gate also remain false. Only the exact Worker origin is added to main-page connections; reports forbid connections and the teacher route remains self-only.

At recorded source checkpoint `45d83d086763ea15cd97ca826c705ddffc64167c`, [PR #27](https://github.com/AL91Cole/cole-learning-labs/pull/27) was open, cleanly mergeable, and all six GitHub checks passed. Linux ran 1,002/1,002 tests with no skips; Windows passed 1,000 with two platform-specific skips and no failures. The [branch preview](https://codex-chat-and-safe-coding.cole-learning-labs.pages.dev/) is verified. These results apply to the recorded source revision. Production frontend publication still requires PR #27 merge.

On the preview, cloud availability started automatically without a checkbox. In CODE-504, Noel's favorite-color question produced the genuine cloud reply, “I am Noel. My favorite color is apricot orange.” D1 reservation totals for UTC October 21 and 22 each increased from 50 to 75, matching one 25-unit reservation in each bucket; the ledger was not reset. Turning cloud off worked immediately and stayed off after navigation to CODE-505. This is a live request and preference-persistence check, not a general model-quality, billing, or live-exhaustion guarantee. Earlier bundle `acfd4943` and v2.26.0 live-reply evidence are historical.

A shared D1 admission ledger reserves 25 units in both today's and tomorrow's UTC buckets before each model call, with a 6,000-unit cap in either bucket and no refunds. This deliberately cuts off the feature early and falls back offline when exhausted or unavailable. The reservation is a conservative engineering allowance, not metered provider usage or a provider billing guarantee. Other account AI usage, hosting/D1/request charges, and overages are outside this feature's cutoff; it does not guarantee an absolute $5 account total. Worker enablement does not establish frontend release acceptance or model quality.

**Start with the basics:** each pathway has a separate introductory lab with **Explore**, **Practice**, and **Check** tabs. Students identify pictured equipment or concepts, match their roles, and complete one short guided job before following a link to a troubleshooting ticket. Hardware uses a labeled 2D PC diagram and the current guarded assembly actions; the other topics use lightweight illustrated controls and local simulations. Beginner work stays only in page memory, survives ordinary site navigation, and clears when the page closes. Save a reviewed report before leaving. See [Beginner labs](docs/FOUNDATIONS.md).

Coding drafts also survive normal site navigation and browser back/forward within this page. Leaving the editor preserves its current program as untested lab work; device persistence still requires the learner’s saving choice. Explicit resume, reset, and clear actions do not revive the previous editor draft.

The six coding investigations offer JavaScript and Python subsets: the supply calculator, classroom thermostat, workstation loop, **Pixel Pet Snack Time** (grades 7–8), **Arcade Prize Patrol** (9–10), and **Rover Energy Planner** (11–12). Students use ordinary assignment, arithmetic, conditionals, and counting-loop syntax, compare changing fixtures, and explain a repair. The interpreter stays local and bounded; it has no imports, files, network, browser objects, or general language runtime. Legacy teaching-source programs remain supported. Pixel-pet tokens, arcade prizes, and rover missions are simulation contexts.

PC investigations keep the full PC X-ray visible throughout the repair, including when selecting tools, cables, or saved work. The monitor remains part of the same picture; its startup transcript is available below the equipment. There are no cropped monitor/rear/inside views.

PR #22 has also been checked in the actual Windows Microsoft Edge application, including its private Linux terminal and teacher controls. See [Edge acceptance results](docs/PR22-EDGE-TESTING.md) for the verified workflows and remaining school-device/network testing.

The site combines a warm, light professional portfolio with colorful pathway accents, dark teal and navy learning workspaces, and labeled 2D equipment diagrams inside hardware investigations. Learners read a ticket, repair the simulated equipment or settings, test the result, and explain whether the original task works. The home page and lab catalog use direct links and filters without a 3D classroom hub, animated rewards, or streaks.

Each investigation has three separate pages: **1. Request & clues**, **2. Workbench & test**, and **3. Check & Explain**. Only the selected page is visible. Use the numbered navigation or Back/Next controls to move between them; each step has its own lab URL, and browser Back/Forward restores the selected step. Moving between steps in the same investigation preserves questions, notes, equipment, and unfinished workspace drafts without requiring device saving. The workbench fills its own page and pauses when another step is open. The conversation stays open. Clues & evidence, My first idea, and Test my idea start expanded and can be closed; their state is retained across steps. Starter questions, Help & practice options, vocabulary/examples, and the action log start closed. The five beginner labs also keep their equipment visible beside their learning steps, including Check.

Mx. Cole is developing the project toward a future goal of teaching Computer Technology through CTE. The project does not represent completed CTE certification. Public professional learning includes the Google Cybersecurity Professional Certificate and the **Professional Certificate in Computer Systems and Networks — American Public University**.

## Learning pathways

| Pathway | Assignments | Practice focus |
| --- | ---: | --- |
| Hardware & ServiceDesk | 8 | Trace faults, handle virtual power safely, match components, restore the classroom desktop, and open the original lesson file |
| Network & Operating Systems | 6 | Repair addressing, sharing and startup; survey wireless coverage; restore printing; recover a verified backup |
| AI Literacy & Audit | 6 | Review prompts, claims, bias and generated code; minimize data; reject source injection; evaluate thresholds and human review |
| Ethical Hacking & Penetration Testing | 6 | Investigate phishing, logs and authorization; practice MFA recovery, incident containment and package verification |
| Coding Sandbox | 6 | Repair supply/pixel-pet expressions, thermostat/prize boundaries, and readiness/rover loops; compare changing fixtures in JavaScript or Python |

The 7–8, 9–10, and 11–12 grade bands are starting points for teacher selection and support. They do not establish an individual learner’s readiness.

All 32 investigations include mission checkpoints, feedback tied to the current simulation state, and optional progressive coaching clues. Hints move from an idea to evidence and then a more specific next step; they do not perform the action, pass a test, close a ticket, or earn a grade. Hardware checkpoints distinguish the repair, a working classroom desktop, and delivery of the requested lesson file. Other workspaces count passing checks only after a current test; changing settings or a program requires testing again.

AI activities use authored examples and local rule checks, with no live AI API. Security work stays inside fixed fictional simulations. The coding sandbox accepts bounded subsets of ordinary JavaScript and Python syntax, using its own local interpreter with source, loop, step and output limits. It is not a full language runtime and cannot use imports, browser, network, file, shell or device capabilities. Earlier teaching-language programs remain supported. No lab scans real systems or executes operating-system commands or uploaded programs.

## Investigate, try, and explain

Support requests have two starting points: eight **detailed requests** model symptoms, context and attempted fixes; five **incomplete requests** (INC-101, INC-103, INC-108, NET-201 and NET-205) require a relevant question about missing context. Their interview-only history clue is available after that fact is supplied. Physical inspections, safety instructions and the workbench remain available. Completion checks the relevant recorded fact, not a question quota; greetings, unrelated replies and privacy refusals do not count. This is a teaching workflow, not an authorization or tamper-proof assessment boundary. Earned requester facts remain in the existing bounded 100-event log.

Resuming an older completed record without the newly required clarification reopens that investigation while preserving its technical result, notes and evidence. Earlier supported starter replies still count when their transcript is present.

In **Request & clues**, learners can type their own question or use a starter. An offline, authored responder matches supported wording to fictional case facts and selected simulation observations. Short follow-ups such as “Why?”, “Explain that more simply”, and “What should I check next?” use the recent case topic and current equipment state. Saved answer text is not treated as a source of facts. It does not contact an AI service or invent a fact when a question is outside its coverage; an honest fallback suggests using the supplied clues or another question. Accepted case questions and replies can enter the bounded action log and report under the existing saving choice. Casual and generated chat remain in page memory and are excluded from saved work, reports, and evidence credit. Keep personal information out of questions as well as notes.

The on-device conversation understands authored everyday paraphrases across all 32 cases, common equipment-word misspellings, short references to a recent question, and two-part questions. Ambiguous references offer optional clarification questions; unsupported details stay unknown. Case replies come from supplied case facts or recognized current simulation state. Casual replies use explicitly invented character preferences, bounded definitions, and simple calculations. Previous answer text never becomes a source of facts. The five incomplete-ticket requesters use first-person wording, while earlier saved replies retain credit. An earned contextual answer retains the concrete question it refers to within the same 100-event and snapshot-byte limits. Offline mode contacts no AI provider and has finite language coverage.

AI replies start on for eligible extra conversation in a fresh page. Availability is checked automatically while that page-memory preference is on; GET carries no question and performs no inference. Only a newly submitted question that maps to one of the 161 fixed authored topic IDs can request a model reply. One **AI on/off** button works during the check, and **Reply privacy** opens the service information. Turning AI off, or an automatic error/quota fallback, stays in effect across ordinary lab navigation in this page; it is not saved in browser storage. Turning AI back on performs a fresh availability check without sending or replaying an earlier question. Every inference must still pass the backend's shared budget guard. Raw typed words stay local. Case evidence and all completion checks remain authored. Errors retain the immediate local reply and switch cloud off; changing the control does not open classroom records, change billing, or turn extra chat into evidence.

The conversation is always open, with messages above the composer and speaker/source labels. **Clues & evidence**, **My first idea**, and **Test my idea** start expanded, remain closable, and retain their open state while moving between steps. Starter questions, **Help & practice options** (including vocabulary and worked examples), and the action log start closed. Requesters introduce their role and case naturally without repeated self-disclaimers; direct identity questions, unknown facts, and hypothetical stories retain honest boundaries.

In **Workbench & test**, learners inspect the virtual equipment or software, save one change, and compare the observed result with their hypothesis. Hardware offers a two-step video-cable interaction, keyboard/touch alternatives, and power, display, startup, and drive readouts tied to current equipment state. Software labs offer fixed local tools: network diagnostics, shared-handout access, recovery/service checks, scripted AI previews, message inspection, and defensive policy probes. Quick buttons provide an alternative to typing. No tool runs an operating-system command, real network probe, database query, or uploaded code.

The optional **Record a hypothesis test** panel checks the current modeled setup beside a written prediction. For software labs it runs the workspace checks; for hardware it verifies the current startup and original-task evidence after the learner has used the bench controls. Coding runs compare the saved program with the supplied fixtures; reports include the saved source and recorded output. A changed program needs another run. The test does not grade the wording of a hypothesis or automatically decide whether the learner's causal explanation is correct. Individual inspection tools do not award completion, and software inspections preserve unapplied form entries. In **Check & explain**, learners verify the original task, explain what changed and what the evidence supports, and review their report for the approved submission process. Missing required evidence or a repair idea opens the relevant note drawers. Teacher rubrics and answer keys remain outside the public lab and demo.

## Downloadable curriculum companions

The reviewed public downloads are the revised [student workbook PDF](assets/cole-learning-labs-student-workbook.pdf) (6 pages) and [unmarked practice quizzes PDF](assets/cole-learning-labs-pop-quizzes.pdf) (8 pages). They contain student prompts without completed solutions or answer keys. Use them for optional paper or offline notes alongside the on-page lab sections. They do not upload work or replace the report-export process.

The [HTML student workbook](student-workbook.html) preserves all six sections with headings, a reference table, and labeled response fields. The [HTML practice quizzes](practice-quizzes.html) preserve all eight forms, 40 questions, and 160 choices in their original order, using native labeled radio groups. Both have keyboard instructions and print styles, contain no scripts or submission feature, and do not save answers; review/copy work before leaving. Their response fields remain subject to browser and extension settings. Long workbook answers may require expanding a field or copying into an approved document before printing.

The original PDFs remain available for optional printing with unchanged reviewed hashes. The workbook is untagged and lacks document language; quiz heading/choice structure and reading order have not been verified. Use the structured HTML alternatives for browser-based access. Neither the PDFs nor the alternatives have completed an independent accessibility conformance review.

Original curriculum archives, workbook originals, teacher guides, speaking scripts, slide decks, answer keys, completed reports, and private teacher resources stay entirely outside this public checkout. The original slide decks expose solution guidance in visible slides and speaker notes. The optional input-event HTML remains an offline teacher tool. The public `teacher/index.html` demo does not secure files placed beside it. See [Curriculum publishing policy](docs/CURRICULUM-PUBLISHING.md) before adding any resource.

## Equipment interaction and report saving

Hardware graphics return to the PR #6 visual style: a still, labeled 2D equipment diagram in the dark teal/navy workbench. There is no 3D engine, camera, graphics download or WebGL requirement. The public build excludes the old Babylon and Three.js runtimes, scenes and vendor assets. Network/OS, AI, security and coding keep their current functional workspaces without decorative 3D station previews.

Opening a hardware ticket's **Workbench & test** section still adopts the current detailed assembly model once. It preserves the original fault, existing progress and newer investigations; returning to the section reuses the equipment. The diagram and native controls request the same guarded model actions. Each ticket begins with a short context instruction and only its relevant tools, parts, screws, cables and full-picture targets. Display-transfer cases share one control set, so the interface does not reveal which display fault applies. A closed **All workbench tools (optional)** section provides an explicit **Show complete controls** choice for broader practice and unusual saved repairs; it changes only the view. Part, tool and help disclosures keep equivalent controls reachable below the picture. The three investigation pages, beginner labs, conversation improvements, experiments, reports and security/privacy boundaries are retained.

Detailed assembly retains eight removable parts, 18 screws, retention mechanisms, leads and thermal-paste preparation. Choose a labeled part and use its large controls. Screwdriver, paste and cleaning controls retain power, mounting and cooler cross-pattern checks. Inspecting, selecting a tool or canceling an unfinished move does not change equipment. Escape, report opening, section changes and leaving the route cancel pending interactions. These are authored teaching checks, not physical collision, screw torque, measured paste spread or heat simulation. See [Assembly workbench](docs/3D-ASSEMBLY.md).

Cable controls retain ten ends: AC, separate PC and monitor HDMI ends, ATX, CPU power, GPU power, SATA data, SATA power, front-panel and CPU fan. Matching socket choices use the same safe operations as the diagram. Wrong connectors and canceled gestures change no equipment. Internal work requires PC off, AC disconnected and the case panel removed. Each HDMI end remains independent, with both ends and the monitor source reflected in reports and experiment observations.

Modeled main power drives the CPU, graphics and PSU fan blades and component status. AC standby alone does not spin fans. Missing memory or storage can leave fitted fans running while startup fails; both HDMI ends, the monitor source and validated startup determine the picture. The original SSD is solid-state with no moving disk. Static text explains activity with reduced motion, and fan animation pauses while the workbench is hidden, the page is backgrounded or the route is disposed. These are authored indicators, not measurements of voltage, temperature or real fan speed.

My report presents an approved local UTF-8 `.txt` download with a fictional case-only filename, optional feature-detected device file sharing, and copy/manual-selection alternatives. Saving does not submit work, and a chosen native app or cloud destination can receive the file. Requested download URLs receive a short handoff interval before cleanup. [Device checks](docs/DEVICE-CHECKS.md) distinguishes actual browser evidence from physical-device checks still required by a school.

## Lab and submission workflows

| Workflow | Available behavior | Where work goes |
| --- | --- | --- |
| Independent practice | Public labs start in page memory; explicit optional device save/resume/clear; ordinary report copy and `.txt` export | No account or upload; optional saved progress and ordinary exports are unencrypted |
| Manual encrypted reports | Optional browser-only teacher key creation and local `.cllreport` encryption/decryption at `secure-reports.html` | The learner manually submits an encrypted file through the school's approved assignment system; this site does not upload reports or keys |
| Fictional classroom demo | Inspect sample aliases, progress, notes, a submitted report, and try manual feedback | Demo changes stay in page memory and disappear on reload; no real class or grade is created |
| Optional connected classroom | Prepared implementation; production is locked pending privacy release review | No production classroom-record processing in this release; a future reviewed release would require explicit enrollment |

**Real classroom-record processing is blocked by a hardcoded production privacy release gate.** The Cloudflare `onRequest` entry returns HTTP 503 with `classroom_privacy_review_required` before configuration, database access, or identity-key retrieval. No first approved teacher email has been chosen, and no D1 database or Cloudflare Access application has been provisioned. Independent labs, local exports, and the memory-only fictional demo remain available.

A teacher email, environment variable, database binding, or user checkbox **cannot unlock the production gate**. A future classroom release requires documented privacy/legal review, applicable school agreements, provider restrictions, rights and incident processes, necessary retention, verified operational controls, and a reviewed source-code release. Review [Privacy release requirements](docs/PRIVACY-RELEASE-GATE.md) first; applicable COPPA, New York §2-d/Part 121, FERPA, and jurisdiction-specific obligations have not been declared satisfied. No global legal approval or certification is claimed.

The separate prepared handler also requires `CLASSROOM_ENABLED=true`, migrated `CLASSROOM_DB`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and the explicit `TEACHER_EMAILS` allowlist. Those technical settings support development and testing; they are not privacy approval. [Classroom setup](docs/CLASSROOM-SETUP.md) documents that implementation.

## Pages and entry points

Portfolio and lab pages use hash navigation and can be served statically.

| Address or route | Destination |
| --- | --- |
| `#home` | Professional introduction and learning entry points |
| `#projects` | Selected work and project links |
| `#about` | Background, education, and professional direction |
| `#labs` | Five beginner labs, plus 32 investigations with grade/pathway filters |
| `#learn/hardware` | Beginner hardware lab; also `network`, `ai`, `security`, and `coding` |
| `#lab/INC-101` | An individual investigation |
| `#educators` | Lesson guidance and assessment |
| `#guide` | Student instructions |
| `#connect` | Professional connection links |
| `#privacy` | Privacy and accessibility information |
| `classroom.html` | Independent/classroom choice, student entry, and fictional demo |
| `teacher/index.html` | Server-authorized teacher classroom or fictional demo |
| `school-it.html` | School IT review, hosting/data practices, and filter-review information; readable without JavaScript |
| `secure-reports.html` | Optional local encrypted-file exchange; no roster, Google OAuth, automatic upload, or central storage |

A static host supports independent practice and the demo. A future reviewed classroom release would also need the configured Cloudflare Pages Functions service; the ordinary local preview server does not emulate D1 or Access. Production classroom requests remain blocked even if those settings are supplied.

## Progress, sharing, and teacher review

Independent practice starts in the current page's memory. It does not automatically read or resume old saved work, and saving is not assumed from a previous visit. A learner may explicitly choose to save progress on the device or resume a saved copy. Device saving uses unencrypted `localStorage`, scoped to the browser profile and website origin. Anyone with access to that profile may be able to read it. Stopping future saving does not erase an earlier saved copy; use the clear-local-work control before sharing a device. Resetting one ticket, clearing saved work, deleting downloads, and removing an assignment submission are separate actions.

Export needed work before changing devices, profiles, or addresses, clearing site data, or leaving a shared profile. A preview address, `pages.dev`, apex, and `www` have separate storage origins. Changing hosts while preserving the same scheme, hostname, and port does not itself change that origin. The operator cannot recover local work.

Copy or download an ordinary plaintext report and submit it manually through Google Classroom, Microsoft Teams, or the school's chosen process. A teacher may share only the public lab URL using an ordinary Google Classroom share link. This is not a Classroom API connection: no Google student sign-in, roster import, automated submission, or grade sync is configured. Keep the export until receipt is confirmed; the independent local store is not a gradebook.

For a school-approved encrypted-file process, use [the local report tool](secure-reports.html). The teacher creates a passphrase-encrypted private `.cllkey` file and a public `.cllpub` file in the browser. Students verify the intended public key, encrypt their report and a random neutral learner code locally, then attach only the `.cllreport` file directly in the district's assignment system. The teacher opens the downloaded attachment locally with the matching private key and passphrase. Never upload private keys, passphrases, student reports, rosters, or identity maps to this public repository, a preview, an issue, or a support message.

Encryption protects file contents for holders of the corresponding key and passphrase; it does not prove a teacher role or student authorship. Google and authorized school personnel retain their permitted access to Classroom identities and submission metadata. Decrypted work is visible on the reviewer's endpoint, and compromised endpoints or changed website code can expose information. The school must approve key distribution, verification, authorized key holders, recovery, retention, devices, and the submission process. This tool has not received an independent cryptographic audit or legal certification. See [Student-data design](docs/STUDENT-DATA-DESIGN.md).

The prepared workflow below describes a possible future, privacy-approved source release; it is unavailable in production now:

- A learner explicitly joins with a class code only. The server assigns a cryptographically random `Learner-XXXX-XXXX` alias; client names, emails, school IDs, and chosen aliases are rejected. Only then can assigned drafts be shared. The lab shows a classroom connection and save/submission controls. This prepared connected backend does not implement teacher-held encryption of stored work.
- Classroom work uses a separate browser namespace for the class and membership. It does not silently import independent work. Choosing an independent-labs link on the portal removes the active sharing flag without deleting saved work.
- A browser session is the learner’s credential. A class code or alias cannot recover a lost or logged-out session or transfer it to another device. Export important reports first.
- The teacher roster refreshes about every 15 seconds while the validated teacher view is visible. Updates can be paused. Polling patches progress summaries and roster rows, preserving typed grading feedback; work details refresh on request.
- The roster shows in-lab, learner-reported progress. It does not watch webcams, microphones, screens, browser tabs, or other applications, and it is not proof of attendance, independent authorship, or mastery.
- Submission captures an immutable version of saved work. A later draft does not rewrite that submission or its grade. Teachers inspect evidence and reasoning, enter grades and feedback manually, and may return work for revision.
- A class lock pauses new joins, draft changes, and submissions. Existing learners can read/export work and feedback. The teacher can review or grade; class deletion requires explicit confirmation.

The prepared code’s 90-day class expiry is a development default, not an approved necessary retention period. Later-request cleanup is not verified scheduled purging; necessary deadlines, early return/deletion, backup expiry, and deletion evidence remain blocking work in [Privacy release requirements](docs/PRIVACY-RELEASE-GATE.md).

Use fictional scenario information. Keep real passwords, health information, private student records, and confidential incidents out of free text. An alias does not make classroom records anonymous to the school. [Teaching guidance](docs/TEACHING.md) covers preparation and assessment.

## School devices, accessibility, and review

The responsive workspaces provide a larger full PC picture, Expand picture and Fit picture controls, a labeled component selector, accessible in-page tabs, keyboard alternatives, optional larger text, and touch controls. Default page type is 17px; key controls retain targets of 44–48px where practical. Mission hints use keyboard-accessible disclosures. Changing sections does not reload the page or rebuild the workbench. Normal page scrolling keeps controls reachable on short screens.

Historical Chrome checks covered 1366 × 768, 1024 × 768, and 768 × 1024 without page-level horizontal overflow, along with representative repairs, saved-work controls, and fictional classroom review. [PR #22's later acceptance record](docs/PR22-EDGE-TESTING.md) also covers actual Windows Microsoft Edge workflows. These results apply to their recorded revisions and devices; they do not establish acceptance of every later visual change or a school-managed Chromebook. Recheck this release with narrow/short windows, larger text, keyboard focus, and zoom, then test representative work on the school's actual supported devices and network.

Share [School IT review](school-it.html) with the district for educational-purpose, browser, data, and GoGuardian category/allow-rule review. School filtering policies control access; hosting security, a category suggestion, or this page cannot guarantee that a school will allow the site. No blanket school approval, accessibility certification, FERPA/COPPA compliance, or immunity from security flaws is claimed.

The labs have no advertising, analytics SDK, or remote fonts. Offline character contacts no AI provider; requester AI starts on for supported extra topics through the separately deployed topic-only Worker, with a visible off control. Cloudflare still processes ordinary hosting and security metadata, which can include IP address, request path, browser, and traffic information. External professional links and school-managed software have their own data practices. Do not describe the site as sending no information anywhere.

## Run and verify locally

The static application needs no dependency installation. Use **Node.js 24** for the supported checks, SQL tests, and production build. Cloudflare publishes a reviewed set of public files from `dist`, rather than the source checkout.

```sh
npm run dev
```

Open the printed local HTTP address. ES module imports need a server; opening `index.html` as a `file:` URL is not the supported preview method. Use the supplied preview, which serves only approved public files. If another static server is needed, serve the reviewed `dist` output rather than the checkout root.

```sh
npm run check
npm test
npm run build
```

`npm run check` covers application/server/script syntax and audits tracked repository paths for private curriculum names; source snapshots without a Git index are checked as a source tree. The strict build manifest and local preview allowlist independently limit published and served files. Filename checks and `.gitignore` are safeguards, not document-content review or a guarantee of confidentiality. Tests cover simulation state and verification, mission feedback and hints, saved-work handling, and the prepared classroom handler’s authentication, ownership, versioning, limits, and SQL behavior. Separate production-entry tests verify that the privacy gate blocks configuration, database, and identity access. Integration tests intentionally call the prepared handler; passing them neither activates production nor establishes legal compliance. A static preview returns an unavailable-service view for real classroom operations.

## Source layout

| File | Responsibility |
| --- | --- |
| `index.html`, `src/app.js`, `src/styles.css` | Portfolio, routes, reports, and lab shell |
| `src/scenarios.js` | Combined catalogue of all 32 student assignments; no teacher rubrics or answer keys |
| `src/interview.js`, `src/interview.css` | Bounded conversational case replies and chat presentation; on-device authored facts, no live AI |
| `src/requester-persona.js`, `src/requester-library.js`, `src/requester-topics.js` | Fictional profiles, 112-card composed offline library, and 161 authored remote-topic choices |
| `src/requester-chat.js`, `src/requester-config.js` | Consent-based topic-only AI client and exact standalone Worker endpoint |
| `worker-requester/worker.js`, `worker-requester/wrangler.jsonc` | Deployed, runtime-enabled topic responder on the existing Paid account; source defaults disabled; one real preview reply verified; 32-case preview verified; production frontend awaits PR #27 merge |
| `worker-requester/budget.js`, `worker-requester/budget-schema.sql` | Shared atomic two-day reservation ledger storing only UTC dates and aggregate totals |
| `functions/api/requester.js` | Legacy raw-question prepared handler; immutable production privacy gate remains false |
| `src/hardware.js`, `src/hardware.css` | Virtual hardware bench, checkpoints, and coaching |
| `src/assembly-model.js`, `src/assembly-tools.js`, `src/assembly-cables.js`, `src/assembly-workbench.js`, `src/assembly.css` | Detailed assembly rules, fixed tool/connector mappings, accessible controls and lightweight 2D equipment diagram |
| `src/workspaces.js`, `src/workspaces.css` | Network/OS, AI, and security workspaces and coaching |
| `src/expanded-labs.js`, `src/expanded-labs.css` | Nine additional Network/OS, AI and security scenarios with local models and inspection tools |
| `src/coding-lab.js`, `src/coding-lab.css` | Six coding scenarios, bounded JavaScript/Python subsets and legacy teaching-source compatibility, fixture output and feedback |
| `classroom.html`, `teacher/index.html` | Student and teacher entry points |
| `src/classroom-portal.js`, `src/classroom-portal.css` | Classroom UI and memory-only fictional demo |
| `src/classroom-client.js` | Explicitly joined assignment sharing and separate local storage scope |
| `src/local-work.js`, `src/work-controls.js` | Memory-first practice, explicit device persistence/resume, and clear-work controls |
| `secure-reports.html`, `src/secure-reports.js`, `src/report-crypto.js` | Local key files and manually exchanged encrypted reports; no application upload |
| `functions/api/[[path]].js`, `migrations/0001_classrooms.sql` | Optional classroom API and database structure |
| `school-it.html`, `src/school.css` | School technology review page |
| `scripts/serve.mjs`, `scripts/check.mjs`, `scripts/curriculum-policy.mjs` | Public-file-only preview, syntax verification, and tracked curriculum-path audit |
| `scripts/build.mjs` | Explicit public-file manifest and isolated `dist` output |
| `.github/workflows/security-checks.yml` | Tests, artifact validation, and CodeQL source/workflow scans |
| `SECURITY.md`, `docs/REPOSITORY-SECURITY.md` | Private vulnerability reporting and maintainer security procedures |
| `docs/TEACHING.md` | Lesson preparation, assessment, and classroom workflows |
| `docs/CURRICULUM-PUBLISHING.md` | Reviewed public companion PDFs, private teacher boundaries, and publishing checks |
| `docs/CLASSROOM-SETUP.md` | Prepared backend setup and operational boundaries |
| `docs/PRIVACY-RELEASE-GATE.md` | Blocking privacy evidence, operational gaps, and reviewed-release requirements |
| `docs/STUDENT-DATA-DESIGN.md` | Data inventory, aliases, manual Classroom workflow, key custody, and access limitations |
| `_headers`, `_routes.json` | Cloudflare response policies and API routing |
| `docs/DEPLOYMENT.md` | Hosting, domains, HTTPS, and release verification |
| `docs/3D-ASSEMBLY.md` | Current 2D assembly controls, mechanical rules and school-device checks |

Keep independent-site assets and hash navigation compatible with the supported static preview. The optional classroom API and teacher Access setup target the canonical Cloudflare-hosted site.

## Hosting and release status

[AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs) is the source repository. Native Cloudflare Pages hosts the public site at [www.colelearninglabs.com](https://www.colelearninglabs.com); Squarespace remains the registrar. The apex redirects to canonical `www`. Cloudflare DNS, DNSSEC, HTTPS, and network protection were verified for the existing public deployment. GitHub Pages publishing is disabled.

The new release’s `_headers` declares a Content Security Policy with same-origin scripts and only the exact requester Worker origin added to main-page connections, plus no-referrer policy, MIME-sniffing protection, strict HTTPS policy, disabled unnecessary device permissions, and additional teacher anti-framing/no-store rules. Reports forbid connections and the teacher route stays self-only. Verify those responses after frontend deployment. Provider security controls do not replace application authorization or district review.

The `20261021-chat27` source release (version `2.27.0`) keeps the production classroom gate closed. Routine publishing, teacher identity selection, and environment changes cannot authorize classroom-record processing. The separate topic-only requester Worker is enabled and has passed one real preview reply check; that does not open classroom records or establish school approval. Source changes and automated checks do not establish that this release has reached production or passed testing on physical school devices. Follow [Deployment guidance](docs/DEPLOYMENT.md) for response checks and [Privacy release requirements](docs/PRIVACY-RELEASE-GATE.md) for the evidence needed before any reviewed source release could change that boundary.

## Before classroom use

PR #22 adds a separate, disabled-by-default Docker terminal scaffold and state-derived startup clues for the classic hardware monitor. It does not deploy a remote Linux host, change DNS or open classroom enrollment. Read the [architecture audit](docs/PR22-ARCHITECTURE-AUDIT.md) and [terminal setup](terminal-sandbox/README.md) before testing the optional service. Its dependencies and real Docker tests are isolated from the public-site build.

For private testing on this computer, the PR also includes a [local review profile](terminal-sandbox/LOCAL-TESTING.md) and [teacher/student walkthrough](terminal-sandbox/TEST-PLAN.md). It starts a loopback-only Node controller with actual Docker Linux sessions, a private teacher key, and a resizable guide/terminal workbench. It leaves the public site and production configuration unchanged.

Complete a representative repair and a lab from every other pathway. Check all 32 entry points, filters, keyboard focus, touch controls, zoom, resume/reset, report copy/download, and back/forward navigation. Confirm that home and catalog contain no 3D hub, each lab begins with its ticket, conversation stays open, the three evidence/idea/test panels start expanded, and optional help remains accessible. Verify that initial hardware setup preserves the fault and later section focus changes retain equipment, questions, notes, code and workspace drafts. Try a supported student-written question, a contextual follow-up and an unknown question; confirm offline mode makes no inference request. Verify automatic availability, the default-on and off behavior across navigation, the exact topic-only payload, a successful live reply, and fallback before accepting this refinement. Inspect a tool without changing settings, and compare a real simulation test with the written hypothesis. For coding, test a changed fixture, syntax error, boundary input and bounded loop, then review the saved source/output in the report. Open help without hiding the actual repair or test controls. Review the fictional classroom demo, grade/return flow, and disabled-service behavior. Development verification of the prepared classroom handler should use fictional teacher/student sessions to check ownership, isolation, locking, expiry/deletion, stale versions, and failure recovery. It does not replace the blocking privacy review or permit real enrollment.

For detailed assembly, check a correct and incorrect drop, each tool's large-button alternative, keyboard operation, vertical page scrolling beside the equipment controls, and cancellation while opening a report or switching sections. Confirm that an unfinished drag changes no saved equipment and that unsafe or out-of-order tool attempts receive a reason. Use the native part, screw and socket selectors when small diagram targets are difficult to reach. Confirm that no engine or scene assets are requested in any pathway.

Check each cable's matching socket, the cable-rest disconnect action, and its native selector alternative. Unplug each HDMI end independently and confirm the other remains fitted, the working OS stays loaded, the picture disappears and task delivery becomes unverified. Confirm reports and bounded Before/After observations identify the two ends separately. Test internal-cable safety locks and unfinished-cable cancellation on actual supported school devices.

Check that a fresh page does not read old work, device saving/resume require explicit choices, and clear-local-work removes saved copies without claiming to erase downloads or school submissions. For encrypted reports, use fictional test data to verify intended-key decryption, wrong keys/passphrases, corrupted files, file-size limits, no network or storage writes, and clear-page behavior. Do not create or commit real school keys or test with actual student records.

The labs support guided practice and teacher judgment. Completion is learning evidence to discuss; it is not professional certification or a replacement for required hands-on instruction.



## Learning toolkit in release 2.9

Open **For educators** (#educators) to select any of the 32 labs, a 20-/40-/60-minute plan, guided/independent/challenge support and individual/pair work. The chosen plan provides subject-specific goals, prerequisites, a modeled reasoning example, vocabulary, a timed sequence, discussion and an exit question. Print the selected plan, or copy its canonical public assignment link. Links carry only lab identity and support mode; never add learner details, access codes, keys or work to URLs.

In each lab, use the practice-mode selector without replacing the equipment or discarding unfinished questions/settings/code. Guided mode opens model support and question starters; independent/challenge modes begin with those supports collapsed and add a decision or alternative-explanation task. Safety, instructions, vocabulary and hints remain available in every mode. Modes do not authenticate a learner or secure an exam. INC-101, INC-107 and INC-108 form a transfer sequence: the same no-picture symptom has different modeled causes (rear output, display input and monitor-end cable). The challenge launcher explicitly shows the actual assigned case and its goals. Other pathways use their own alternative-explanation and exit prompts.

The **experiment record** in Workbench & test saves a prediction, change, observation and explanation with Before/After observations and a current simulation check. Start before changing equipment. Capture runs the current test, including the coding editor's current draft, and a later setup change requires a fresh capture. Keep unsuccessful attempts. Eight complete attempts and the current draft are retained inside the existing 100-event bound, alongside earned inquiry evidence. These are learner-reported learning records, not grades or independent-authorship proof. They follow the same private-memory/default, explicit-device-save/resume/clear and reviewed manual encrypted/plain export choices as the rest of the lab.

The **Classroom opening day** capstone (#capstone) connects INC-106, NET-201, SEC-401, AI-302 and CODE-503. Plan two or three lessons, about 120–150 minutes, including a team handoff explaining what works, the supporting tests, connections between pathways and remaining uncertainty. The hub reads current local checks and links back from each work order. Existing work can contribute; teachers request a fresh attempt when needed. Handoff text shares the coding work order's local event record. The summary can be reviewed and exported using the same teacher-key encryption option. Export the five detailed investigation reports when needed; the summary does not replace their evidence.

**Teacher AI preparation** builds a copyable fictional drafting prompt from reviewed lesson metadata and bounded choices. It does not generate AI output or contact a provider. A teacher may use it with a school-approved service to draft requester wording, differentiated hints, misconceptions or synthetic test questions. Compare every generated assumption with the actual equipment, controls and case evidence before use; an AI draft cannot add capabilities to the simulation. Keep human grading. This follows the testing approach in the [official OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices). A live student AI coach remains a separate reviewed future service under the existing privacy gate and [under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance).

Browser checks on responsive layouts do not establish formal accessibility certification, actual managed-Chromebook compatibility, or school approval. Complete keyboard, screen-reader, zoom, touch, Edge and actual school-network checks before classroom rollout. Do not claim these device-specific checks have occurred without recorded evidence.
