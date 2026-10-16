# Teaching with Cole Learning Labs

Cole Learning Labs provides 15 browser-based investigations for grades 7–12. Use it for demonstrations, guided investigation, independent practice, and discussion on school devices.

Created by Mx. Cole, the project supports a future goal of teaching Computer Technology through CTE; it does not represent completed CTE certification. Review each activity against your objectives, students’ needs, school policies, and available devices before assigning it.

## Choose a starting point

| Band | Suggested emphasis | Useful support |
| --- | --- | --- |
| Grades 7–8 | Recognize symptoms, make observations, protect personal information, and explain one decision | Model an example, define vocabulary, allow paired work, and use short written or spoken explanations |
| Grades 9–10 | Compare causes, connect settings with results, and justify a conclusion using evidence | Ask learners to predict a result before acting and explain the next test |
| Grades 11–12 | Investigate alternatives, audit code or access rules, verify a repair, and communicate limitations | Require an evidence trail, a retest, and a clear handoff or security report |

Grade filters suggest a starting challenge; they do not establish readiness or prevent a teacher from selecting another activity with support.

## Four pathways

- **Hardware & ServiceDesk — six investigations.** Trace display and power faults, reseat compatible memory, reconnect storage, preserve the original classroom drive, and assemble a virtual PC. Use the virtual safe-power sequence for internal changes. A repaired component, a working desktop, and delivery of the original lesson file are separate checkpoints.
- **Network & Operating Systems — three investigations.** Repair IPv4/DNS settings, reach a share using the correct network and least privilege, and recover startup and update services without erasing classroom work. Test the saved settings and explain the output.
- **AI Literacy & Audit — three investigations.** Improve a privacy-aware prompt, compare claims with a source, check equal treatment of equivalent tickets, and review safer secret/query/authorization patterns. These are authored examples and local checks, not a live AI assistant or code runner.
- **Ethical Hacking & Penetration Testing — three investigations.** Inspect a fictional phishing message, correlate synthetic logs, and reproduce then patch an access-control defect in two supplied fictional records. Authorization and scope are part of the task.

## Mission checkpoints and optional coach

Each lab shows the current mission and a suggested next action. The progress is tied to simulation state and test results. A check is not passed by opening a clue or marking a box; after a setting changes, learners need a current test before verification. Hardware checkpoints also require reaching the original classroom desktop and opening `Lesson_Practice_File.docx`.

Optional coaching progresses from an idea, to relevant evidence, to a more specific next step. A learner can reveal only the support they need. Opening non-hardware coaching disclosures preserves text that has not yet been applied to a form. Hints do not perform repairs, complete the ticket, or award a grade.

Set expectations for hint use before the lesson. For example, ask a learner to predict a result first, try one test, then use a clue if needed. In the debrief, ask what the clue helped them notice and why the action worked. Judge the explanation rather than the number of hints opened.

## A sample 40-minute lesson

1. **Introduce the problem — 5 minutes.** State the objective, original task, submission route, and vocabulary. Demonstrate the difference between a symptom and an explanation.
2. **Model the process — 5 minutes.** Inspect a clue and predict one test. Show the mission coach without completing the assigned repair.
3. **Investigate — 20 minutes.** Learners work independently or in pairs. Ask “What did you observe?”, “What does that suggest?”, and “How will you check?”
4. **Explain and verify — 5 minutes.** Require a conclusion, supporting evidence, and a current verification of the original task.
5. **Export or submit and debrief — 5 minutes.** Use a local report and the chosen classroom process. If a real connected class has separately been approved and activated, learners can also submit a fixed version for teacher review.

Adjust timing for reading needs and complexity. One well-explained investigation is a useful lesson outcome.

## Assess reasoning and outcome

Every lab includes a Teacher Rubric panel. Adapt its criteria to your lesson; the simulation’s success indicator is not an automatic grade.

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

Independent labs require no classroom account. Progress remains in the current browser profile and origin. Students can copy or download a `.txt` report and submit it manually through Google Classroom, Microsoft Teams, or the school’s chosen process. There is no automatic LMS connection. If copying is blocked, use download; retain the export until receipt is confirmed.

Use the canonical HTTPS `www.colelearninglabs.com` address consistently. Preview, `pages.dev`, apex, and `www` addresses have separate storage. Changing devices/profiles, clearing site data, or blocking storage can remove access to local work. A cache refresh is different from deleting saved site data. Export before troubleshooting or leaving a shared profile, then reset the needed work before the next learner uses that profile. Local storage is not a long-term gradebook.

## Explore the fictional classroom demo

Open [Classroom options](../classroom.html) or [Teacher classroom](../teacher/index.html) and choose **Explore classroom demo**. The persistent banner identifies all aliases, progress, and sample reports as fictional.

The demo lets an educator inspect a draft and submitted report, review evidence and reflection, enter sample feedback and a manual grade, return work for revision, and try class controls. Changes remain in page memory only. Reloading or reopening the demo restores its sample data. No real membership, uploaded work, or official grade is created. Do not enter real student details into the demo.

## Optional real classrooms: prepared, not activated

**Real enrollment and classroom record storage are disabled for this release.** No first teacher login email has been chosen. No D1 database or Cloudflare Access application has been provisioned. The portal shows unavailable/access-required states instead of a pretend teacher login or shared PIN.

An approved operator must configure all of the following before enabling the service: `CLASSROOM_ENABLED=true`, migrated `CLASSROOM_DB` binding, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and an explicit `TEACHER_EMAILS` allowlist. The server checks the signed teacher identity and class ownership. A district review and the acceptance checks in [Classroom setup](CLASSROOM-SETUP.md) must precede collection of real records.

When an approved classroom is enabled:

1. The verified teacher creates a class and selects assignments from the 15 supported labs. Distribute its code and teacher-assigned aliases through the classroom process.
2. A learner explicitly joins. An alias is a display label, not verified identity or a recovery credential. A browser has one class session; a lost or logged-out session cannot be recovered using the alias or code. Use separate assigned profiles and export important work.
3. Assigned drafts can then be shared from the lab. A visible connection explains the classroom and save state. Classroom work uses a separate local namespace from independent practice; independent records are not silently imported. The portal’s independent-labs choice turns off the active sharing flag while preserving saved work.
4. The teacher reviews class progress and opens work details. The roster refreshes about every 15 seconds only while the real, authorized teacher view is open and visible. Pause/resume is available. Polling updates summaries and rows while preserving typed grading feedback; work details refresh on request.
5. A learner submission captures a fixed snapshot of the saved version. Later draft changes do not overwrite it or its teacher grade. The teacher reviews evidence, enters a grade/feedback manually, and can return the version for revision. Version checks reject stale changes rather than silently replacing another view’s work.
6. A teacher can lock the class, pausing new joins, saves, and submissions. Existing learners can still read/export work and feedback; teacher review remains available. Deleting the class requires explicit confirmation and removes its application records. Follow the approved record-export and retention process first.

The roster shows in-lab drafts and submission status, not webcams, microphone audio, screens, other tabs, browsing history, or activity in other applications. It is neither proctoring nor proof of attendance, attention, independent work, or mastery.

Prepared classes expire 90 days after creation. Access is denied after expiry; application cleanup occurs on a subsequent authorized teacher request, not a guaranteed scheduled physical-erasure deadline. Provider backups and recovery periods are separate. See [Classroom setup](CLASSROOM-SETUP.md) for exact limits, retention, and operational responsibilities.

## Device, accessibility, and school IT preparation

The responsive lab includes a PC close-up view, labeled component selector, section shortcuts, keyboard alternatives, larger text, and controls sized for touch. Inputs use at least 16px text. Use these supports alongside vocabulary help, paired discussion, extra time, or an oral explanation.

Earlier Chrome layout checks at 1366 × 768, 1024 × 768, and 768 × 1024 found no page-level horizontal overflow. The current mission/classroom release passed 104 automated checks without skips and all 15 Chrome lab entry checks at 1366 × 768. A complete hardware repair, reload/resume, network feedback, optional hints preserving an unsaved setting, and the HTTPS fictional teacher review were exercised. The teacher review at 768 × 1024 had no page-level horizontal overflow and a 16px feedback field. **Microsoft Edge has not been tested in an actual connected Edge browser session.** Do not treat shared browser technology as an Edge test or a guarantee that a school-managed Chromebook behaves the same way.

Before a lesson:

- Complete a representative assignment on the actual managed device and student network. Check keyboard/touch interactions, focus, zoom, reading comfort, local resume, report copy/download, and any separately enabled sign-in.
- Review school policies that affect JavaScript, storage, cookies, downloads, clipboard, or Cloudflare challenges. A connected classroom should open as a full browser page, not an embedded sign-in frame.
- Share [School IT review](../school-it.html) with the district. It documents educational purpose, data destinations, browser requirements, canonical hostnames, and authorized GoGuardian category or allow-rule review. The school controls filtering; no site metadata or category request guarantees access.
- Give younger learners context before opening professional/project links. External services and school-managed extensions have their own interfaces and data practices.
- Review accommodations and barriers directly. The project has not been formally certified for accessibility or declared school approved.

Cloudflare Pages serves the site and processes normal request/security metadata, potentially including IP address, request path, browser, and traffic information. Independent labs do not upload lab records; explicitly joined enabled classrooms do send assigned work and aliases to the class service. HTTPS, an alias, or a login does not establish blanket FERPA/COPPA or district compliance. Do not describe the platform as collecting or sharing no information.

Use fictional scenario information. Do not enter real names, passwords, health information, private student records, or confidential incidents in aliases, prompts, notes, demo feedback, or public issues. School authorization, notices, data terms, retention, export/correction, and incident handling need review before connected mode is used.

## Boundaries for cybersecurity and AI

Security activity is limited to the supplied fictional systems and actions. Completing a lab does not authorize testing a person, school network, website, device, or account. Any separate real-world exercise requires its own explicit authorization and scope.

Ask learners to describe the defensive lesson, explain the fix, retest both intended and denied behavior, and communicate uncertainty. For the authorization lab, a hidden link alone is not a permission check; the owner must retain access while another learner’s record is denied.

AI activities use authored artifacts and visible local checks. No live AI model is contacted. The prompt checker has bounded rules and cannot assess every privacy or accuracy risk. Students remain responsible for comparing claims with sources and explaining their decisions.
