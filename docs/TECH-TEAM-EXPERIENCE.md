# Tech-team experience (release `20261107-tech-team`)

This release makes the labs easier to start, clearer to finish, easier to teach and easier for a district to review. It is prepared for review only: nothing here has been deployed, merged, sent to a school or tried with a class.

The idea behind every change: **you're the tech team. Follow the clues, try a fix, and show how you know it worked.**

## What changed, by area

### 1. Home page

- The hero keeps "Let's work it out" and the "No signal" preview. It now has one supporting line, a student button (**Play Inbox Defender · 8 minutes**), an educator button (**Teach a lesson**, which opens `/teach`) and a **Browse all labs** link. The header button also says **Browse all labs**.
- **Start here** sits under the at-a-glance strip: one activity per grade band, with a time estimate and plain guidance about adult help.

  | Band | Activity | Route | Catalog label |
  | --- | --- | --- | --- |
  | K–1 | Keep private things private | `#explore/EX-SEC-1` | K–1, 5 minutes |
  | Grades 2–3 | Inbox Defender: Picture patrol | `#play/inbox-defender?style=picture` | Picture patrol · K–6 |
  | Grades 4–6 | Packet Post | `#arcade/packet-post` | 4–6, 10 minutes |
  | Grades 7–8 | The Blank Monitor | `#lab/INC-101` | 7–8, 15 minutes |
  | Grades 9–12 | Ransomware Response & Evidence | `#lab/SEC-405` | 9–10, 30 minutes |

  The band wording on these cards is readiness guidance for this section only. Catalog grade labels are unchanged. A build without open labs starts older students on the free `SEC-402` instead of the gated `SEC-405`.
- **Everyday Tech** (`/everyday-tech`) is a path for families and adult beginners that reuses the phishing, AI fact-checking and troubleshooting activities with everyday scenarios.
- Personal projects moved from the home page to **About Mx. Cole**. The home page links there once; `#projects` still works and is no longer in the header.
- The Listen and Display tools no longer cover the hero buttons. See "Listen and Display tools" below.
- **Header menus.** The header has five categories: Labs and games, Students and families, Teachers, Schools, About. Each opens on hover or keyboard focus and lists its pages, so the student guide, Everyday Tech, Teach a lesson and the school review pages are reachable from the top of the page. The same menu is on the nine landing pages. The menus open through CSS, so they still work if scripts are blocked. One small shared script, `src/site-menu.js`, adds Escape (it closes whichever category is showing, without moving the pointer and wherever the focus is), and keeps `aria-expanded` accurate. On the home page it also closes a category once a link is chosen. Below 1050 px the home page puts the categories inside the Menu button, where each opens when chosen. A link mode that hides every link in a category hides the category.
- **Footer.** The home page footer groups its 13 links under four headings (Learn, Teachers, Schools, Site) in columns: four across on a wide screen, two across on a narrow one. It measured 290 px tall at 1366 × 768. Links are 34 px tall for a mouse or trackpad and 44 px on any device with a touch screen.

### 2. The Blank Monitor and Inbox Defender

- **One test action.** The workbench **Test my idea** button now tests the idea written in the Experiment notebook (or the first idea when the notebook has none) and records the result in the notebook. The notebook's own button does the same thing and is styled as secondary. Before this change a learner could restore the display and open the lesson file, see "The task works", and still be locked out of page 3 until they found and used the second button.
- **What remains.** The workbench page lists the steps left before **Check & explain** opens, ticking each one as it is done. The explicit **Save this attempt** step stays: a saved explanation and a fresh working setup are both needed.
- **Retry.** After a saved test that did not work, writing the next idea and its evidence is enough: the setup recorded at the last saved test becomes the starting point, so selecting **Start this test** first is no longer a trap. With no idea written, the test still runs and the page says exactly what to write.
- **Repeated clicks.** An unchanged repeat adds no action-log entry, keeps the recorded result and keeps anything the learner already typed about it, from either button and in every pathway. In the settings and coding labs an unchanged, already tested setup is not run again, and running the same setup twice no longer counts as a changed setup. Saving twice cannot create a second attempt.
- **Start this lab again** moved out of page 3, so it is reachable from every page.
- **Report.** The preview and the exported text lead with a four-line **SUMMARY** (Clue, Change, Result, Next step), followed by **FULL RECORD** with every existing section unchanged. The summary is built from what the learner already recorded; no new field is saved, and every export path carries the same text. The privacy review prompt and the export confirmation are unchanged.
- **Sentence helper.** Page 3 offers "Build your first sentence": choose a collected clue and a saved change, and add "I noticed ___, so I tested ___." to the free-text answer. The choice is not stored; only the learner's answer is.
- **Inbox Defender.** Every supported decision now shows the clue or clues that supported it and a one-line rule for when to report, when to verify another way and when to continue through a known bookmark. A retry hint says what the message needs instead of commenting on the wrong choice. `#play/inbox-defender?style=picture` opens the picture style directly; a link can choose the starting style and nothing else.

### 3. Story and replay

- **Classroom Opening Day** (`#capstone`) gives each of its five work orders a reason the classroom needs it, recommends the order 1 to 5, shows rotating **Operator** and **Evidence lead** roles for pairs on each card, and ends with a short careers debrief. The handoff asks what works, what still needs attention and what evidence supports those judgments. The four saved handoff fields are unchanged. The Operator works the equipment and says the prediction aloud; the Evidence lead records the clue, the one change and the test result.
- **Alternate ticket.** `INC-107` "No Picture After a Presentation" is the replay of The Blank Monitor: the same symptom, a different cause, distinct clues and its own valid fix. Its request and library card now describe the symptom only, so the cause is found from the clues. Each ticket keeps its own saved work. A link to it appears at the foot of the original ticket.
- **Noticed in your tests.** The notebook recognises three behaviours from the learner's own saved attempts: changing one part of the setup before a test, writing a new idea after a test that did not work, and checking the requester's original task. It is shown on the page only. Nothing is scored, stored, compared or sent.
- **Design a ticket** (`/lessons/design-a-ticket`) is a printable, teacher-led template for older students. Nothing is uploaded or published.

### 4. Teacher toolkit

Plain pages at ordinary addresses. Their content needs no JavaScript; the only script they load is the header menu helper:

| Address | Purpose |
| --- | --- |
| `/teach` | Teacher hub: three ready-to-run lessons, classroom link modes, how work is collected |
| `/lessons/blank-monitor` | 40-minute lesson, grades 7–8 |
| `/lessons/inbox-defender` | 20-minute lesson, both styles |
| `/lessons/packet-post` | 20-minute lesson, grades 4–6 |
| `/lessons/k-6` | K–6 teacher lane: adult-led sessions, oral and visual responses |
| `/lessons/troubleshooting-pilot` | Proposed eighth-grade pilot pack with a teacher feedback checklist |
| `/lessons/design-a-ticket` | Printable ticket-design template |

Each featured lesson has a direct student link, duration, objective, materials, sequence, expected evidence, reasoning look-fors, an exit question, an unplugged fallback, a share link and a paste-ready description. A student may explain aloud or use the device's own district-approved dictation; the same look-fors apply. The site does not record audio.

Standards codes appear only on these pages, only for codes whose wording was read in the NYSED grade-band documents on 2026-11-05, each with one observable. See [STANDARDS-ALIGNMENT.md](STANDARDS-ALIGNMENT.md). Packet Post lists no code, and says why.

### 5. School pilot and district review

- `/district-review` is a short page for district IT: what stays in page memory, what device saving does, how shared-device work is cleared, what Cloudflare receives, what a report contains, what leaves by the user's choice, the state of each optional service with fields transmitted and retained, a managed Chromebook checklist, contact details and the no-account pilot definition. The pilot uses the existing combined link `/?mode=student&cart=true`; no new launch option was added. See [SCHOOL-PILOT.md](SCHOOL-PILOT.md).
- `/verify` now checks availability when it opens, with a request that carries no codes, and says plainly when verification is not enabled. The form is locked until the service is available.
- `school-it.html`, `compliance.html` and `ai-use-notice.html` describe online requester replies as not offered in the current public build, and present aggregate counts, lab telemetry and signed codes as three separate features.

### 6. Discovery and sharing

All nine pages are in `sitemap.xml`, have their own title, description and canonical address, and their content needs no JavaScript. Each loads one script, `src/site-menu.js` (1,548 bytes built), which only handles the header menu: it reads nothing, stores nothing and makes no requests. Existing hash routes, classroom link modes and redirects are unchanged. Sharing is a link and text; there is no account, roster or grade connection, and the site still cannot be framed.

## Listen and Display tools

The floating tools covered the bottom of the hero buttons at 1366 × 768 (tools at x 16–248, y 708–752; "Choose a lab" at x 48–212, y 676–726).

- On viewports up to 1500 px wide or 860 px tall the tools shrink to two icon buttons. The words stay in each button's accessible name; before this change the phone layout removed them from it.
- The hero text column aligns to the top, so its buttons sit well above the tools.
- Link buttons now get the same scroll clearance as other controls, and the page reserves 96 px at the bottom of any scroll-into-view.
- The workbench page, which hides the footer, reserves space so its last row can scroll clear.

A fixed control always passes over content while a page scrolls. What was fixed is the resting position and where keyboard focus lands.

## Offline cache

- Installed visitors were kept on old files when a release changed only the entry script or the stylesheet, because the worker's cache name comes from the list of addresses, not their contents. This release changes the release token, which changes those addresses. A later release that changes only `src/app.js` or CSS needs a new token for the same reason.
- The worker is now registered after the page's load event, so the 39-file offline download does not start while the first page is still loading. Offline behaviour is otherwise unchanged. Landing pages are not cached and show the existing offline notice when there is no connection.

## Checked in this branch

Automated, on Windows with Node 24:

| Check | Result |
| --- | --- |
| `npm run check` | Passed |
| `npm run build` | Passed |
| `npm test` | 1,929 tests: 1,927 passed, 2 skipped (link tests that need symlink permission on Windows), 0 failed |
| `memberships`: `npm test`, `npm run check` | 100 passed; check passed |

Baseline before the change: 1,888 tests, 1,886 passed, 2 skipped.

Two independent reviews of the diff (lab-flow code; page claims, standards and accessibility) were run and their findings fixed, including repeat tests in the settings and coding labs, older saved attempts, a lesson-page hint at a lab’s cause, and wording about timers and service states.

In a desktop Chromium browser against the local preview (`npm run dev`):

- The Blank Monitor played from the request to the report: one **Test my idea** press recorded the result, three further presses changed nothing and kept typed text, page 3 opened after the answers and **Save this attempt**, the sentence helper added its sentence, and the report opened with the summary.
- Inbox Defender in both styles: a wrong choice gave a retry hint, a right choice named its clue, and the picture link opened the picture style.
- Home page at 1366 × 768, 683 × 384 (a 1366 × 768 screen at 200% zoom) and 375 × 812: no control under the tools at rest, and none of the 48 focusable controls landed under them when brought into view.
- Lab pages 1 and 2 at the same three sizes: no control under the tools at the top of the page or when brought into view. At the very end of page 2 at 1366 × 768, one privacy link overlapped the tools by 2%.
- All nine landing pages, plus `/school-it`, `/compliance` and `/verify`, at 375, 683 and 1366 px wide: no horizontal scrolling and no short buttons.
- Direct load of each landing address returned the page; an unknown lesson address returned 404.

Measured locally, uncompressed, from a cleared cache:

| Page | Scripts | Script bytes | Style bytes | HTML bytes |
| --- | --- | --- | --- | --- |
| Home | 15 | 324,654 | 380,691 | — |
| `/lessons/blank-monitor` | 1 | 1,548 | 193,313 | 19,778 |

The lesson row is the size of the built files after the header menus and footer columns were added. The home row was measured in the browser before them and was not measured again. The home page was 317,820 script bytes and 376,848 style bytes before this release. The hero preview button answered in under 1 ms. These are local figures; no network timing was taken.

## Not checked

- No managed Chromebook, ChromeVox, device read-aloud voice, touch screen or district filter was available. Those checks are listed in [DEVICE-CHECKS.md](DEVICE-CHECKS.md) and on `/district-review`.
- Keyboard order and visible focus were checked by bringing each control into view from a script, not by a person tabbing through. Reduced motion was not re-tested; no animation was added.
- Printing of the pilot pack and ticket template was checked by applying the print rules on screen, not through a print dialog.
- Whether deferring the offline cache shortens a real first load was not measured on a network.
- Nothing was checked on the live site. Statements about which services are off come from this repository's code and configuration.
- The pilot has not been run. No teacher or district has reviewed these pages.

## Known limits and follow-ups

- Each landing page gets its own 188 KB stylesheet bundle because it reuses the main site styles. A small dedicated stylesheet would make these pages lighter.
- The home page still delivers all route styles up front (381 KB).
- The header menus open on hover. Escape closing a hovered category was checked on the home page and a lesson page in desktop Chromium with a real pointer hover and a real key press. It has not been checked by a person with a screen reader or on a touch screen.
- Live route chunks are served with two joined `Cache-Control` values, so their one-year caching may not take effect. Fixing it changes `_headers` rules that tests pin.
- `INC-107` and `SEC-405` open because the public release is built with open lab access. If that changes, the pilot's alternate ticket and the grades 9–12 Start here card need membership; the home page already falls back, and the pilot page tells teachers to check.
- The availability requests to `/api/reach` and `/api/telemetry` still go out in every link mode. The district pages disclose them.
