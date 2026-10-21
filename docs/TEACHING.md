# Teaching with Cole Learning Labs

Cole Learning Labs provides 29 browser-based investigations across five pathways for grades 7–12. Use it for demonstrations, guided investigation, independent practice, and discussion on school devices.

If a learner leaves a coding lab through the site menu or browser history, the current editor text is preserved as an untested program in that lab’s work. They must rerun fixtures before finishing. This does not enable device saving; private work still needs an export before closing the page.

Created by Mx. Cole, the project supports a future goal of teaching Computer Technology through CTE; it does not represent completed CTE certification. Review each activity against your objectives, students’ needs, school policies, and available devices before assigning it.

## Choose a starting point

| Band | Suggested emphasis | Useful support |
| --- | --- | --- |
| Grades 7–8 | Recognize symptoms, make observations, protect personal information, and explain one decision | Model an example, define vocabulary, allow paired work, and use short written or spoken explanations |
| Grades 9–10 | Compare causes, connect settings with results, and justify a conclusion using evidence | Ask learners to predict a result before acting and explain the next test |
| Grades 11–12 | Investigate alternatives, audit code or access rules, verify a repair, and communicate limitations | Require an evidence trail, a retest, and a clear handoff or security report |

Grade filters suggest a starting challenge; they do not establish readiness or prevent a teacher from selecting another activity with support.

The interface also adjusts its wording to the suggested band. Grades 7–8 use short prompts and define terms such as hypothesis and evidence; grades 9–10 pair technical terms with brief explanations; grades 11–12 ask for technical reasoning, predictions, and limitations. The task checks and the three page names remain the same.

## One investigation, three focused pages

Each investigation has separate Request & clues, Workbench & test, and Check & Explain pages. Exactly one step is visible at a time, on desktop and smaller screens. Numbered navigation and Back/Next controls move between step URLs without rebuilding the investigation. Browser Back and Forward work between steps. Questions, notes, equipment state, and unapplied settings remain in place during navigation within the same investigation. Hardware interactions pause while the workbench page is hidden. Basic instructions appear with the relevant controls.

1. **Request & clues.** Read the original task, ask the fictional requester a question, inspect clues, and write a hypothesis. Students may type their own question or choose a starter. Fast offline mode answers supported case questions from authored facts and current simulation observations. It also offers bounded fictional small talk, definitions, and simple calculations. Follow-ups such as “Why?”, “Explain that more simply”, and “What should I check next?” can refer to the recent supported topic. Unknown details receive an honest fallback. Use the supplied clues and actual test results as evidence, rather than treating casual conversation as a new case fact.
2. **Workbench & test.** Inspect, make one change, save edited software settings, and observe what happens. Quick inspection buttons make tools available without command memorization. Use the equipment's power/startup controls where needed, then run the hypothesis test. The test checks the current simulated setup; it does not judge the wording of the hypothesis or establish its causal explanation. The learner must decide what the evidence supports.
3. **Check & explain.** Verify the original task, explain the change and test evidence, reflect on the hypothesis, and review the report. Simulation success is not an automatic grade or an automatic submission.

Supported case questions and their authored replies can join the bounded action log and report under the existing private-session or optional device-saving choice. Casual conversation and generated replies stay in current page memory and are excluded from saved lab work and reports. They do not earn clues, clarification credit, verification, or completion. Every chat box still needs the fictional-information rule: avoid real names, email addresses, student IDs, passwords, or confidential incidents.

The fast offline conversation recognizes authored everyday paraphrases across all 29 cases, common equipment-word misspellings, short references to a recent question, and two-part questions. Fictional requester personalities make supported casual replies feel more natural without claiming to be real people. Ambiguous references offer optional clarification questions; unsupported details stay unknown. General definitions, calculations, and fictional small talk are separate from the canonical case evidence. Previous answer text never becomes a source of facts. The five incomplete-ticket requesters use first-person wording, while earlier saved replies retain credit. An earned contextual case answer retains its concrete question within the existing 100-event and snapshot-byte limits. Fast mode contacts no AI provider, downloads no model, and has finite language coverage.

**Offline character** is the default. The expanded library composes 112 authored topic cards with 29 fictional profiles and five reply styles: 16,240 possible compositions, with 15,680 distinct measured replies, all within 300 characters without clipping. These are possible composed replies, not thousands of individually authored answers or live model generations. Short-term context stays in page memory. Unknown facts remain unknown, and canonical case observations still take priority.

**Optional AI replies** uses a standalone Worker in the existing Paid account. It accepts only a lab ID and one of 161 fixed authored topic IDs: the earlier 49 character/definition topics plus 112 library cards. The learner's typed words, notes, conversation history, records, and current equipment are never sent in that AI request. Known topics may receive variation in the fictional character's voice and grade band; arithmetic, case/current-state answers, and unmatched questions remain local. No app, model download, or student API key is needed. Generated replies remain extra conversation, not evidence or assessment.

The reviewed guarded Worker is deployed and its two runtime enablement flags are true, with AI/D1 bindings and the aggregate counter configured. Source defaults stay false for fresh deployments. The v2.26.0 frontend in PR #26 still awaits preview verification and merge; a successful live model reply has not yet been verified. The browser offers **Check AI availability** and explicit opt-in. Missing or broken budget storage, full reservation buckets, timeout, quota, or provider failure retains the immediate offline reply; HTTP 429 also turns optional AI off. This does not unlock classroom enrollment, records, grades, or teacher identity.

A shared D1 ledger reserves 25 units in both today's and tomorrow's UTC buckets, each capped at 6,000, before an AI call. Failures and cancellations receive no refund. An empty window can admit 240 starts, but prior-day carryover means sustained availability is ordinarily around 120 per day and can be lower. These are conservative feature reservations, not actual metered usage or an account billing guarantee. Other applications and Paid hosting/request/D1 charges are not capped by this feature, and no absolute $5 total is promised. See [deployment notes](DEPLOYMENT.md) and [Worker operations](../worker-requester/README.md). Selected topic IDs and ordinary connection metadata still reach Cloudflare; provider and school privacy review remains necessary.

Model the three pages once before independent work: ask one question on Request & clues, show where its reply appears, open Workbench & test to demonstrate a labeled inspection tool, then open Check & Explain to show the report controls. Use Back/Next, numbered navigation, and browser Back to demonstrate returning to the request without losing work. Teacher rubrics and answer keys remain outside the public student lab.

## Detailed and incomplete support requests

Eight incident/network tickets model a detailed request: useful symptoms, context, attempted fixes and a clear goal. Questions remain optional. Five tickets start incomplete: INC-101, INC-103 and INC-108 need recent-work history, NET-201 needs the scope of affected devices, and NET-205 needs printing history. Learners can type a relevant question or use a starter. One relevant fact is enough; repeated or unrelated questions do not satisfy the clarification step. The matching history clue becomes available after the requester supplies it.

Keep equipment inspection and testing available while learners investigate. A learner can discover a physical fault before asking, but should clarify the missing context before finishing the report. This models communication alongside troubleshooting. These browser-only progress checks are instructional, not secure grading or a way to hide answers from someone inspecting public source.

## Equipment and software tools

The hardware bench provides individual fit targets for twelve assembly components and cables, plus separate PC and monitor display-cable ends. Drag from a part’s grip to a compatible socket, or tap a part and then a socket. The card body remains scrollable on touch screens. Large socket controls provide keyboard and touch alternatives; Escape cancels a held item. Wrong targets do not change equipment. The power, display, startup/POST, and drive instruments show the current modeled state. Inspecting a readout does not repair a component or earn completion. Internal changes still require the virtual safe-power sequence; learners never open or unplug their real Chromebook or tablet.

The software consoles accept only the displayed fixed practice commands and targets. A learner can choose a quick button or type a supported command such as `ipconfig`, `ping 10.24.8.1`, or `nslookup learn.school.test` in the network case. Responses follow saved simulation settings; save edited values before inspecting again. These tools do not execute commands, contact a network, or change the learner's device. A successful local ping does not prove that every required field is correct, that DNS works, or that the original task is delivered.

Other workspaces provide shared-folder read/write previews, recovery and service status, scripted AI-response and source previews, simulated code-request results, message sender/destination/header inspection, and defensive gateway probes. Keep inspection separate from the full test: reading a result does not mark the workspace tested, reproduce the scoped authorization defect, or submit work. Software inspections preserve unapplied form entries. After a meaningful change, learners need a fresh test and an explanation.

## Five pathways

- **Hardware & ServiceDesk — eight investigations.** Trace display and power faults, reseat compatible memory, reconnect storage, preserve the original classroom drive, and assemble a virtual PC. Use the virtual safe-power sequence for internal changes. A repaired component, a working desktop, and delivery of the original lesson file are separate checkpoints.
- **Network & Operating Systems — six investigations.** Repair IPv4/DNS settings, reach a share using the correct network and least privilege, recover startup and update services, survey wireless coverage, restore a print queue, and recover a verified backup without overwriting evidence. Test the saved settings and explain the output.
- **AI Literacy & Audit — six investigations.** Improve a privacy-aware prompt, compare claims with a source, check equal treatment of equivalent tickets, review generated code, minimize data, reject source injection, and evaluate thresholds with human oversight. These activities use authored examples and local checks. Optional requester conversation does not replace their source cards, tests, or teacher review.
- **Ethical Hacking & Penetration Testing — six investigations.** Inspect phishing, correlate logs, patch an access-control defect, practice MFA recovery, contain a fictional incident, and verify a software package. Authorization and scope are part of every task.
- **Coding Sandbox — three investigations.** Edit variables and arithmetic, repair conditional boundaries, and correct a readiness loop. The small teaching language supports only the documented constructs. Programs run through a local bounded interpreter, not full JavaScript, Python, an operating-system shell or a real device.

### New assignments and discussion prompts

| Lab | Practice and debrief |
| --- | --- |
| `NET-204` Wireless Survey & Classroom Coverage | Compare placement, signal, channel and width. Ask why a strong signal alone does not establish a suitable radio plan. |
| `NET-205` The Stalled Print Queue | Restore the service, queue and destination while preserving the original handout. Ask why clearing all jobs fails the request. |
| `NET-206` Backup Restore & File Integrity | Restore a verified version separately and compare it with the manifest. Ask why the newest file or a successful copy alone is insufficient. |
| `AI-304` Minimum Data, Meaningful Permission | Choose invented input, no identifiers, a local route and an equivalent alternative. Discuss why a checkbox does not replace school review. |
| `AI-305` Prompt Injection in a Source Card | Treat source text as evidence and reject its unrelated instruction. Ask learners to separate a cited fact from an attempted task override. |
| `AI-306` Classifier Thresholds & Human Review | Inspect missed urgent cases, false alarms and both fictional groups. Require the four-example limitation and a human review decision. |
| `SEC-404` MFA Recovery Without Sharing Secrets | Verify identity through the approved route, revoke the lost factor and retain an audit record. Never ask students to supply real passwords or recovery codes. |
| `SEC-405` Ransomware Response & Evidence | Isolate the affected fictional endpoint, preserve evidence and stage a verified backup separately. Discuss the order of containment and recovery. |
| `SEC-406` Software Supply Chain Verification | Compare publisher, signature and integrity before a limited standard-user pilot. Ask what HTTPS alone can and cannot establish. |
| `CODE-501` The Supply Calculator | Use changing quantities to distinguish an expression from a hardcoded answer; include zero in the discussion. |
| `CODE-502` The Classroom Thermostat | Predict output below, at and above each boundary, then test it. Discuss why both boundary values belong to the middle range. |
| `CODE-503` The Workstation Readiness Loop | Trace the counter and compare the number of lines with the supplied station count. Ask learners to explain the off-by-one correction. |

The coding editor preserves its draft while learners focus the request or open Check & explain. Apply the edited code before testing, inspect fixture output and errors, then test again after a change. The interpreter limits source length, nesting, loop counts, total execution steps and output. It cannot access browser objects, network services, files, device controls or arbitrary JavaScript. Reports include saved source and recorded output, so learners should review code as well as written notes before exporting. Technical fixture checks do not establish authorship or replace teacher review.

## Mission checkpoints and optional coach

Each lab shows the current mission and a suggested next action. The progress is tied to simulation state and test results. A check is not passed by opening a clue or marking a box; after a setting changes, learners need a current test before verification. Hardware checkpoints also require reaching the original classroom desktop and opening `Lesson_Practice_File.docx`.

Optional coaching progresses from an idea, to relevant evidence, to a more specific next step. A learner can reveal only the support they need. Opening non-hardware coaching disclosures preserves text that has not yet been applied to a form. Hints do not perform repairs, complete the ticket, or award a grade.

Set expectations for hint use before the lesson. For example, ask a learner to predict a result first, try one test, then use a clue if needed. In the debrief, ask what the clue helped them notice and why the action worked. Judge the explanation rather than the number of hints opened.

## A sample 40-minute lesson

1. **Introduce the problem — 5 minutes.** State the objective, original task, submission route, and vocabulary. Demonstrate the difference between a symptom and an explanation.
2. **Model the process — 5 minutes.** Inspect a clue and predict one test. Show the mission coach without completing the assigned repair.
3. **Investigate — 20 minutes.** Learners work independently or in pairs. Ask “What did you observe?”, “What does that suggest?”, and “How will you check?”
4. **Explain and verify — 5 minutes.** Require a conclusion, supporting evidence, and a current verification of the original task.
5. **Export or submit and debrief — 5 minutes.** Use a local report and the chosen classroom process. The prepared connected workflow could submit a fixed version only after a future privacy-approved source release; that service is blocked in production now.

Adjust timing for reading needs and complexity. One well-explained investigation is a useful lesson outcome.

## Assess reasoning and outcome

Student labs do not include a Teacher Rubric panel or bundled grading criteria. Keep your rubrics and answer keys in your school’s authenticated teacher resources, and distribute them only to authorized educators. Previously published criteria may remain in public repository history and must not be treated as confidential. The simulation’s success indicator is not an automatic grade. See [Teacher rubric storage](TEACHER-RUBRICS.md).

| Criterion | Evidence to look for |
| --- | --- |
| Observation | Relevant symptoms, clear facts, and a distinction between observation and assumption |
| Investigation | A reasonable test and an explanation of what its result could reveal |
| Decision | A solution connected to evidence and consideration of alternatives |
| Verification | A current check of the original task and any remaining uncertainty |
| Communication | A clear handoff, useful reflection, and appropriate technical vocabulary |

One suggested four-level scale is **independent and well supported**, **mostly supported**, **developing with prompts**, and **not yet demonstrated**. Discuss an example first. Use an oral follow-up, a prediction before an action, or a comparison with another approach to assess understanding.

The roster and reports contain learner-reported work. Browser-local state and shared JSON can be changed by a learner; an apparent completion or a server-held snapshot does not prove independent authorship. Teacher review of the evidence and reasoning remains necessary.

## Use independent reports now

For optional paper or offline notes, use the revised [student workbook PDF](../assets/cole-learning-labs-student-workbook.pdf) (6 pages) or [unmarked practice quizzes PDF](../assets/cole-learning-labs-pop-quizzes.pdf) (8 pages). These reviewed public companions contain prompts without completed solutions. The workbook follows **Request & clues**, **Workbench & test**, and **Check & explain**; learners can record their own requester questions, hypothesis, experiment, and reflection. These files do not submit work or create a student account.

The PDFs have selectable text, but the workbook lacks structural accessibility tags. Keep the on-site HTML Student Guide and in-lab instructions as the primary route. Choose an accessible alternative suited to the learner, and check reading and printing behavior on the school's actual device. The PDF companions are not certified accessible.

Keep original workbook files, teacher slide decks and notes, guides, scripts, answer keys, worked reports, and archives outside the public checkout and in the school's approved private teacher resources. All three original slide decks contain solution guidance in visible slides or notes. The optional input-event HTML is an offline teacher diagnostic, not a public lab download. The public teacher demo and a folder name do not authorize access or protect confidential files. Review [Curriculum publishing policy](CURRICULUM-PUBLISHING.md) before sharing or adding curriculum.

Independent labs require no classroom account. Work starts in the current page's memory; saving and resuming an unencrypted copy on the device require an explicit choice. Students can review and copy or download a `.txt` report, or use the optional school-approved teacher-key encrypted report process, and submit manually through Google Classroom, Microsoft Teams, or the school’s chosen system. There is no automatic LMS connection. The report presents Download .txt report before the optional encryption tools. Every plaintext save, share, copy and manual-selection action requires explicit review approval. On supported tablets, Save or share .txt opens the native chooser for the prepared file; a chosen app or cloud folder can receive it. Copy and Select report text remain alternatives when allowed. Check the actual file in Downloads or Files before leaving and retain the export until receipt is confirmed. See [Device checks](DEVICE-CHECKS.md) for the tested scope and school-device acceptance steps. Authored case questions and replies may appear in reports, so review them along with notes before export; casual and generated chat are excluded.

Use the canonical HTTPS `www.colelearninglabs.com` address consistently. Preview, `pages.dev`, apex, and `www` addresses have separate storage. Changing devices/profiles, clearing site data, or blocking storage can remove access to local work. A cache refresh is different from deleting saved site data. Export before troubleshooting or leaving a shared profile, then reset the needed work before the next learner uses that profile. Local storage is not a long-term gradebook.

## Explore the fictional classroom demo

Open [Classroom options](../classroom.html) or [Teacher classroom](../teacher/index.html) and choose **Explore classroom demo**. The persistent banner identifies all aliases, progress, and sample reports as fictional.

The demo lets an educator inspect a draft and submitted report, review evidence and reflection, enter sample feedback and a manual grade, return work for revision, and try class controls. Changes remain in page memory only. Reloading or reopening the demo restores its sample data. No real membership, uploaded work, or official grade is created. Do not enter real student details into the demo.

## Optional real classrooms: blocked pending privacy release review

**The production classroom API is hardcoded closed for this release.** Its actual Cloudflare entry returns HTTP 503 `classroom_privacy_review_required` before reading service settings, D1, or identity keys. No first teacher email, D1 database, or Access application has been provisioned. Independent labs, manual report exports, and the fictional demo remain available.

A teacher email or environment setting cannot unlock it. The [Privacy release requirements](PRIVACY-RELEASE-GATE.md) require evidence of applicable legal and district review, school agreements, necessary data purposes, provider restrictions, notices/authority, rights processes, security operations, and verified retention/deletion. A reviewed source-code release is also required before that gate can change. COPPA, New York §2-d/Part 121, FERPA, or worldwide compliance has not been certified or declared complete.

The separate prepared implementation uses `CLASSROOM_ENABLED=true`, a migrated `CLASSROOM_DB`, Access configuration, and an explicit `TEACHER_EMAILS` allowlist. These are technical prerequisites for that implementation, not permission to collect records. Its integration tests call the prepared handler explicitly. See [Classroom setup](CLASSROOM-SETUP.md) for development details.

The following describes the prepared workflow for a possible future reviewed release, not a current enrollment option:

1. The verified teacher creates a class and selects assignments from the 29 supported labs. Distribute its code through the approved classroom process.
2. A learner explicitly joins using only that code. The prepared server generates a random neutral alias; a learner does not supply a name, email, school ID, or chosen alias. An alias is a display label, not verified identity or a recovery credential. A browser has one class session; a lost or logged-out session cannot be recovered using the alias or code. Use separate assigned profiles and export important work.
3. Assigned drafts can then be shared from the lab. A visible connection explains the classroom and save state. Classroom work uses a separate local namespace from independent practice; independent records are not silently imported. The portal’s independent-labs choice turns off the active sharing flag while preserving saved work.
4. The teacher reviews class progress and opens work details. The roster refreshes about every 15 seconds only while the real, authorized teacher view is open and visible. Pause/resume is available. Polling updates summaries and rows while preserving typed grading feedback; work details refresh on request.
5. A learner submission captures a fixed snapshot of the saved version. Later draft changes do not overwrite it or its teacher grade. The teacher reviews evidence, enters a grade/feedback manually, and can return the version for revision. Version checks reject stale changes rather than silently replacing another view’s work.
6. A teacher can lock the class, pausing new joins, saves, and submissions. Existing learners can still read/export work and feedback; teacher review remains available. Deleting the class requires explicit confirmation and removes its application records. Follow the approved record-export and retention process first.

The roster shows in-lab drafts and submission status, not webcams, microphone audio, screens, other tabs, browsing history, or activity in other applications. It is neither proctoring nor proof of attendance, attention, independent work, or mastery.

The prepared code’s 90-day class expiry is a development default, not an approved or demonstrated necessary retention period. It denies expired access and attempts later-request cleanup; it does not provide verified scheduled destruction. Purpose/contract-specific deadlines, scheduled purging, early return/deletion, backup expiry, and deletion evidence remain blocking work. Provider backups and recovery periods are separate. Keep production closed until the gaps in [Privacy release requirements](PRIVACY-RELEASE-GATE.md) are resolved.

## Device, accessibility, and school IT preparation

The visual refresh uses a 17px default type size, larger reading text, warm background colors, consistent pathway illustrations, and clearer cards while preserving the professional portfolio. Hardware keeps the complete monitor and PC in one larger picture. **Expand picture** uses the available width; **Fit picture** or Escape returns to the fitted view. This changes presentation only. The labeled component selector and large keyboard/touch alternatives remain available below the picture. Normal page scrolling may still be needed on a short Chromebook window; no physical screen-size claim means every control will fit at once. Use these supports alongside vocabulary help, paired discussion, extra time, or an oral explanation.

Historical Chrome checks covered 1366 × 768, 1024 × 768, and 768 × 1024 without page-level horizontal overflow. Later PR #22 acceptance also recorded [actual Windows Microsoft Edge workflows](PR22-EDGE-TESTING.md). Those results apply to the revisions and devices recorded there; they do not verify this visual refresh on every browser or establish managed-Chromebook compatibility. Recheck the current release at narrow widths, short heights, larger text, and zoom, then complete the actual school-device and network checks before teaching.

Before a lesson:

- Complete a representative assignment on the actual managed device and student network. Check keyboard/touch section navigation, focus, zoom, reading comfort, local resume, report copy/download, and any separately enabled sign-in. Confirm that unapplied form entries, questions, and equipment state survive switching sections. Try both a supported question and an unknown one, and compare an inspection with the full hypothesis test.
- Review school policies that affect JavaScript, storage, cookies, downloads, clipboard, or Cloudflare challenges. A connected classroom should open as a full browser page, not an embedded sign-in frame.
- Share [School IT review](../school-it.html) with the district. It documents educational purpose, data destinations, browser requirements, canonical hostnames, and authorized GoGuardian category or allow-rule review. The school controls filtering; no site metadata or category request guarantees access.
- Give younger learners context before opening professional/project links. External services and school-managed extensions have their own interfaces and data practices.
- Review accommodations and barriers directly. The project has not been formally certified for accessibility or declared school approved.

Cloudflare Pages serves the site and processes normal request/security metadata, potentially including IP address, request path, browser, and traffic information. Independent labs do not upload lab records; explicitly joined enabled classrooms do send assigned work and aliases to the class service. HTTPS, an alias, or a login does not establish blanket FERPA/COPPA or district compliance. Do not describe the platform as collecting or sharing no information.

Use fictional scenario information. Do not enter real names, passwords, health information, private student records, or confidential incidents in aliases, prompts, notes, demo feedback, or public issues. School authorization, notices, data terms, retention, export/correction, and incident handling require evidence and review before a future source release could permit connected records. Student and educator information is restricted to documented, necessary educational/security purposes; sale, rental, advertising use, behavioral profiling, AI-model training, and unrelated secondary uses are prohibited.

## Boundaries for cybersecurity and AI

Security activity is limited to the supplied fictional systems and actions. Completing a lab does not authorize testing a person, school network, website, device, or account. Any separate real-world exercise requires its own explicit authorization and scope.

Ask learners to describe the defensive lesson, explain the fix, retest both intended and denied behavior, and communicate uncertainty. For the authorization lab, a hidden link alone is not a permission check; the owner must retain access while another learner’s record is denied.

AI literacy activities use authored artifacts and visible local checks. Their checks do not need a live model. Optional requester conversation is separate: its Worker is deployed and runtime-enabled, while PR #26's frontend and live-reply acceptance remain pending. Ordinary offline conversation still contacts no AI provider. Neither fluent conversation nor an enabled service establishes school approval, model accuracy, or evidence credit. The prompt checker has bounded rules and cannot assess every privacy or accuracy risk. Students remain responsible for comparing claims with sources and explaining their decisions.



## Learning toolkit in release 2.9

Open **For educators** (#educators) to select any of the 29 labs, a 20-/40-/60-minute plan, guided/independent/challenge support and individual/pair work. The chosen plan provides subject-specific goals, prerequisites, a modeled reasoning example, vocabulary, a timed sequence, discussion and an exit question. Print the selected plan, or copy its canonical public assignment link. Links carry only lab identity and support mode; never add learner details, access codes, keys or work to URLs.

In each lab, use the practice-mode selector without replacing the equipment or discarding unfinished questions/settings/code. Guided mode opens model support and question starters; independent/challenge modes begin with those supports collapsed and add a decision or alternative-explanation task. Safety, instructions, vocabulary and hints remain available in every mode. Modes do not authenticate a learner or secure an exam. INC-101, INC-107 and INC-108 form a transfer sequence: the same no-picture symptom has different modeled causes (rear output, display input and monitor-end cable). The challenge launcher explicitly shows the actual assigned case and its goals. Other pathways use their own alternative-explanation and exit prompts.

The **experiment record** in Workbench & test saves a prediction, change, observation and explanation with Before/After observations and a current simulation check. Start before changing equipment. Capture runs the current test, including the coding editor's current draft, and a later setup change requires a fresh capture. Keep unsuccessful attempts. Eight complete attempts and the current draft are retained inside the existing 100-event bound, alongside earned inquiry evidence. These are learner-reported learning records, not grades or independent-authorship proof. They follow the same private-memory/default, explicit-device-save/resume/clear and reviewed manual encrypted/plain export choices as the rest of the lab.

The **Classroom opening day** capstone (#capstone) connects INC-106, NET-201, SEC-401, AI-302 and CODE-503. Plan two or three lessons, about 120–150 minutes, including a team handoff explaining what works, the supporting tests, connections between pathways and remaining uncertainty. The hub reads current local checks and links back from each work order. Existing work can contribute; teachers request a fresh attempt when needed. Handoff text shares the coding work order's local event record. The summary can be reviewed and exported using the same teacher-key encryption option. Export the five detailed investigation reports when needed; the summary does not replace their evidence.

**Teacher AI preparation** builds a copyable fictional drafting prompt from reviewed lesson metadata and bounded choices. It does not generate AI output or contact a provider. A teacher may use it with a school-approved service to draft requester wording, differentiated hints, misconceptions or synthetic test questions. Compare every generated assumption with the actual equipment, controls and case evidence before use; an AI draft cannot add capabilities to the simulation. Keep human grading. This follows the testing approach in the [official OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices). A live student AI coach remains a separate reviewed future service under the existing privacy gate and [under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance).

Browser checks on responsive layouts do not establish formal accessibility certification, actual managed-Chromebook compatibility, or school approval. Complete keyboard, screen-reader, zoom, touch, Edge and actual school-network checks before classroom rollout. Do not claim these device-specific checks have occurred without recorded evidence.
