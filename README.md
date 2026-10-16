# Cole Learning Labs

A professional portfolio and browser-based technology learning platform created by Alan “Al” Cole / Mx. Cole, with 15 investigations for grades 7–12.

The site combines a light professional portfolio with dark teal and navy learning workspaces, a 3D-inspired computer bench, and a guided troubleshooting process. Learners inspect evidence, make changes, test the result, and explain whether the original task works.

Mx. Cole is developing the project toward a future goal of teaching Computer Technology through CTE. The project does not represent completed CTE certification. Public professional learning includes the Google Cybersecurity Professional Certificate and the **Professional Certificate in Computer Systems and Networks — American Public University**.

## Learning pathways

| Pathway | Assignments | Practice focus |
| --- | ---: | --- |
| Hardware & ServiceDesk | 6 | Trace faults, handle virtual power safely, match components, restore the classroom desktop, and open the original lesson file |
| Network & Operating Systems | 3 | Repair IP/DNS settings, apply least-privilege sharing, and recover startup and update services |
| AI Literacy & Audit | 3 | Revise a privacy-aware prompt, compare claims with sources, check a matched ticket pair for bias, and review generated code |
| Ethical Hacking & Penetration Testing | 3 | Triage phishing, correlate synthetic security logs, and patch and retest an authorized fictional record-access flaw |

The 7–8, 9–10, and 11–12 grade bands are starting points for teacher selection and support. They do not establish an individual learner’s readiness.

All 15 labs include mission checkpoints, feedback tied to the current simulation state, and optional progressive coaching clues. Hints move from an idea to evidence and then a more specific next step; they do not perform the action, pass a test, close a ticket, or earn a grade. Hardware checkpoints distinguish the repair, a working classroom desktop, and delivery of the requested lesson file. Other workspaces count passing checks only after a current test; changing settings requires testing again.

AI activities use authored examples and local rule checks, with no live AI API. Security work stays inside fixed fictional simulations. The site does not scan real systems or execute student commands or uploaded code.

## Two classroom workflows

| Workflow | Available behavior | Where work goes |
| --- | --- | --- |
| Independent practice | Public labs, browser resume, copy and `.txt` report export | Lab records remain in that browser unless the user exports or shares them |
| Fictional classroom demo | Inspect sample aliases, progress, notes, a submitted report, and try manual feedback | Demo changes stay in page memory and disappear on reload; no real class or grade is created |
| Optional connected classroom | Prepared code for explicit class enrollment, assigned drafts, submissions, and teacher review | If configured and explicitly joined, assigned work is shared with that class’s server and teacher |

**Real classroom enrollment and server storage are not activated for this release.** No first approved teacher email has been chosen, and no D1 database or Cloudflare Access application has been provisioned. Independent labs and the fictional demo work without those services.

The API rejects requests until all required configuration is valid: `CLASSROOM_ENABLED` must be exactly `true`, `CLASSROOM_DB` must be a migrated D1 binding, and `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and the explicit `TEACHER_EMAILS` allowlist must be set. A binding or a client-side role alone cannot enable or authorize a class. See [Classroom setup](docs/CLASSROOM-SETUP.md) before any activation or collection of real classroom records.

## Pages and entry points

Portfolio and lab pages use hash navigation and can be served statically.

| Address or route | Destination |
| --- | --- |
| `#home` | Professional introduction and learning entry points |
| `#projects` | Selected work and project links |
| `#about` | Background, education, and professional direction |
| `#labs` | All 15 investigations and grade/pathway filters |
| `#lab/INC-101` | An individual investigation |
| `#educators` | Lesson guidance and assessment |
| `#guide` | Student instructions |
| `#connect` | Professional connection links |
| `#privacy` | Privacy and accessibility information |
| `classroom.html` | Independent/classroom choice, student entry, and fictional demo |
| `teacher/index.html` | Server-authorized teacher classroom or fictional demo |
| `school-it.html` | School IT review, hosting/data practices, and filter-review information; readable without JavaScript |

A static host supports independent practice and the demo. A real connected classroom additionally needs the configured Cloudflare Pages Functions service; the ordinary local preview server does not emulate D1 or Access.

## Progress, sharing, and teacher review

Independent work uses `localStorage` scoped to the browser profile and website origin. Export before changing devices, profiles, or addresses, clearing site data, or leaving a shared profile. A preview address, `pages.dev`, apex, and `www` have separate storage origins. Changing hosts while preserving the same scheme, hostname, and port does not itself change that origin.

Copy or download a report and submit it manually through Google Classroom, Microsoft Teams, or the school’s chosen process. There is no automatic LMS connection. Keep the export until receipt is confirmed; the independent local store is not a gradebook.

If connected mode is later activated:

- A learner explicitly joins with a class code and teacher-assigned alias. Only then can assigned drafts be shared. The lab shows a classroom connection and save/submission controls.
- Classroom work uses a separate browser namespace for the class and membership. It does not silently import independent work. Choosing an independent-labs link on the portal removes the active sharing flag without deleting saved work.
- A browser session is the learner’s credential. A class code or alias cannot recover a lost or logged-out session or transfer it to another device. Export important reports first.
- The teacher roster refreshes about every 15 seconds while the validated teacher view is visible. Updates can be paused. Polling patches progress summaries and roster rows, preserving typed grading feedback; work details refresh on request.
- The roster shows in-lab, learner-reported progress. It does not watch webcams, microphones, screens, browser tabs, or other applications, and it is not proof of attendance, independent authorship, or mastery.
- Submission captures an immutable version of saved work. A later draft does not rewrite that submission or its grade. Teachers inspect evidence and reasoning, enter grades and feedback manually, and may return work for revision.
- A class lock pauses new joins, draft changes, and submissions. Existing learners can read/export work and feedback. The teacher can review or grade; class deletion requires explicit confirmation.

Use fictional scenario information. Keep real passwords, health information, private student records, and confidential incidents out of free text. An alias does not make classroom records anonymous to the school. [Teaching guidance](docs/TEACHING.md) covers preparation and assessment.

## School devices, accessibility, and review

The responsive workspaces provide PC close-up and labeled component controls, section shortcuts, keyboard alternatives, optional larger text, and touch controls. Form text is at least 16px; key controls have minimum targets of 44–48px. Mission hints use keyboard-accessible disclosures.

Earlier Chrome viewport checks at 1366 × 768, 1024 × 768, and 768 × 1024 found no page-level horizontal overflow. This classroom/mission release passed 104 automated tests with no skips, all 15 Chrome lab entry checks at 1366 × 768, a complete hardware repair with reload/resume, state-based network feedback, and an HTTPS classroom demo review. The tablet teacher review at 768 × 1024 had no page-level horizontal overflow and used 16px feedback text. The HTTPS preview served the new security policies and rejected real classroom enrollment with HTTP 503. **Actual Microsoft Edge browser testing has not been completed; no Edge browser is connected to the verification session.** Shared browser technology does not substitute for an Edge test. Preview representative work on an actual managed Chromebook and the school’s supported Edge device before teaching.

Share [School IT review](school-it.html) with the district for educational-purpose, browser, data, and GoGuardian category/allow-rule review. School filtering policies control access; hosting security, a category suggestion, or this page cannot guarantee that a school will allow the site. No blanket school approval, accessibility certification, FERPA/COPPA compliance, or immunity from security flaws is claimed.

The labs have no advertising, analytics SDK, remote fonts, or live AI service. Cloudflare still processes ordinary hosting and security metadata, which can include IP address, request path, browser, and traffic information. External professional links and school-managed software have their own data practices. Do not describe the site as sending no information anywhere.

## Run and verify locally

The static application needs no dependency installation or production build. Use **Node.js 22.13.0 or newer**; Node 24 is the currently supported verification environment for the SQL tests using `node:sqlite`.

```sh
npm run dev
```

Open the printed local HTTP address. ES module imports need a server; opening `index.html` as a `file:` URL is not the supported preview method. A Python HTTP server can also preview the static pages, independent labs, and demo.

```sh
npm run check
npm test
```

Syntax checks cover the application, server modules, and scripts. Tests cover simulation state and verification, mission feedback and hints, saved-work handling, and the classroom API’s authentication, ownership, versioning, limits, and SQL behavior. Test results are not a deployment-security certification. A static preview returns an unavailable-service view for real classroom operations; it must not imitate a configured backend.

## Source layout

| File | Responsibility |
| --- | --- |
| `index.html`, `src/app.js`, `src/styles.css` | Portfolio, routes, reports, and lab shell |
| `src/scenarios.js` | All 15 assignments and rubric criteria |
| `src/hardware.js`, `src/hardware.css` | Virtual hardware bench, checkpoints, and coaching |
| `src/workspaces.js`, `src/workspaces.css` | Network/OS, AI, and security workspaces and coaching |
| `classroom.html`, `teacher/index.html` | Student and teacher entry points |
| `src/classroom-portal.js`, `src/classroom-portal.css` | Classroom UI and memory-only fictional demo |
| `src/classroom-client.js` | Explicitly joined assignment sharing and separate local storage scope |
| `functions/api/[[path]].js`, `migrations/0001_classrooms.sql` | Optional classroom API and database structure |
| `school-it.html`, `src/school.css` | School technology review page |
| `scripts/serve.mjs`, `scripts/check.mjs` | Static preview and syntax verification |
| `docs/TEACHING.md` | Lesson preparation, assessment, and classroom workflows |
| `docs/CLASSROOM-SETUP.md` | Default-off backend setup and operational boundaries |
| `_headers`, `_routes.json` | Cloudflare response policies and API routing |
| `docs/DEPLOYMENT.md` | Hosting, domains, HTTPS, and release verification |

Keep independent-site assets and hash navigation compatible with the supported static preview. The optional classroom API and teacher Access setup target the canonical Cloudflare-hosted site.

## Hosting and release status

[AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs) is the source repository. Native Cloudflare Pages hosts the public site at [www.colelearninglabs.com](https://www.colelearninglabs.com); Squarespace remains the registrar. The apex redirects to canonical `www`. Cloudflare DNS, DNSSEC, HTTPS, and network protection were verified for the existing public deployment. GitHub Pages publishing is disabled.

The new release’s `_headers` declares a same-origin Content Security Policy, no-referrer policy, MIME-sniffing protection, strict HTTPS policy, disabled unnecessary device permissions, and additional teacher anti-framing/no-store rules. Verify those responses after deployment. Provider security controls do not replace application authorization or district review.

These source changes prepare mission coaching and optional classroom functionality. They do not provision or activate a classroom service. Follow [Deployment guidance](docs/DEPLOYMENT.md) for current publishing and response checks, and [Classroom setup](docs/CLASSROOM-SETUP.md) for a separately approved activation.

## Before classroom use

Complete a representative repair and a lab from every other pathway. Check all 15 entry points, filters, keyboard focus, touch controls, zoom, resume/reset, report copy/download, and back/forward navigation. Review the fictional classroom demo, grade/return flow, and disabled-service behavior. Before any enabled classroom deployment, use separate fictional teacher/student sessions to verify ownership, isolation, locking, expiry/deletion, stale versions, and failure recovery.

The labs support guided practice and teacher judgment. Completion is learning evidence to discuss; it is not professional certification or a replacement for required hands-on instruction.
