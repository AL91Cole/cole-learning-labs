# Networking pathway: the school tech fair

Twelve playable missions and one shared capstone for grades 7–12. A crew runs part of a school tech fair, makes a decision, sees what happens and uses the evidence to explain it. Start at `/networking` (the same page as `#networking` inside the application).

The pathway sits beside the existing networking investigations described in [Networking investigations](NETWORKING-SEQUENCE.md). Nothing about those investigations changed: their ids, `#lab/NET-…/request|workbench|explain` links, saved work and reports are as they were.

## Identities and records

A fair mission is a separate activity with its own id and its own saved record.

| Band | Missions (in order) |
| --- | --- |
| Grades 7–8 · Get the gym connected | `FAIR-208` Wire the sticker booth · `FAIR-215` Follow the winning photo · `FAIR-204` The frozen robot cam · `FAIR-217` Pass a note in the pit (new) |
| Grades 9–10 · Run the fair services | `FAIR-201` The scoreboard lost its name · `FAIR-209` Find room for 50 teams · `FAIR-210` Give the crowd the scores · `FAIR-218` Follow the camera into the hall (new) |
| Grades 11–12 · Keep the show on air | `FAIR-216` Pick the alert that needs a crew · `FAIR-213` Save the live commentary · `FAIR-211` Connect the remote judge · `FAIR-214` Design next year’s venue |
| All bands | `FAIR-600` Opening day at the tech fair (capstone) |

`FAIR-2xx` shares its number with the `NET-2xx` investigation it grew from, and nothing else. `NET-204` and `FAIR-204` are two assignments: each has its own record under its own id, and each report covers only its own work. A save made before the pathway existed loads unchanged. The existing `#capstone` (Classroom opening day, `CAP-601`) is a different activity and is untouched.

## Addresses

- `/networking` is the application shell opened on the pathway hub. The build generates `networking.html` from the built home page, so it loads the same entry script and stylesheet in either release mode. `?band=7-8|9-10|11-12` selects a band.
- A mission is `#lab/FAIR-204/request`, `/workbench` or `/explain`, with `?mode=guided|independent|challenge`, exactly like an investigation. A refresh keeps the mission and the step.
- `/networking/<slug>` (for example `/networking/frozen-robot-cam`) is a short assignment link. `_redirects` forwards it to the mission; the local preview server does the same. The hub shows each link under “Teacher: assignment link”, with the shared-device form `/networking?cart=true#lab/FAIR-204`.
- The capstone is `#networking/opening-day` (`/networking/opening-day`).

## Three playable steps on the usual four sections

| Playable step | Guide section | What the learner does |
| --- | --- | --- |
| Get the brief | Introduction | Meets the person who needs help, reads what can be observed and the measurable target, and chooses a prediction (a short “why” is optional). |
| Try it | Section 1: Hands-On Demonstration | Reads the worked example and runs a first test. |
| Try it | Section 2: Applied Learning | Changes a cable, place, setting, rule or plan and runs a test. The reading sits beside the baseline and the reading before it. |
| Prove it | Section 3: Challenge and Analysis | One condition changes. The learner runs a fresh test, selects evidence, chooses open, hold or revise, and writes a handoff. |

Guided opens the worked example; Independent leaves it closed; Challenge adds an optional prompt to name another cause and the reading that would tell the two apart.

Rules the engine enforces (`src/fair-missions.js`):

- A run stores only the test, the condition and the setup. Its reading is recomputed from the model, so a saved or imported record cannot carry a forged result.
- A reading is current only while the setup and the condition still match. Editing a tested setup, or changing the condition, marks it out of date. An out-of-date reading stays visible for comparison and cannot be selected as evidence.
- The prediction is kept as it was made once a test has run.
- Completion needs a prediction, a first test, the changed condition, a fresh run of every required test, any listed cases shown, selected evidence, a decision that agrees with that evidence, and a handoff sentence with no unfilled blanks. Opening a page, or replaying a practice game, completes nothing.
- A justified hold or revise is a complete handoff. The station reads “online” only when the current evidence meets the target and the crew chose open.
- Clues and retries are counted in the report and carry no penalty.

The workbench, the text view of the map, the readings table, the guide progress and the report are all rendered from one derived view (`fairView`), so they cannot disagree.

## Reviewed values

The acceptance values from the redesign brief are in the models and pinned by `tests/fair-missions.test.js` and `tests/networking-pathway.test.js`: the robot-camera laps, the hall camera counts, the /27 and /26, the 1 error/second alert, the commentary loss and jitter, the judge roles and the venue sizes, plus the four capstone stations.

Values the brief did not give were chosen to follow the same pattern and should be reviewed:

- Robot camera after the curtain drops, for spots other than center rail and press table: behind the cabinet 10/3/9, pit wall 10/4/8, finish wall 6/5/10. The press table is offered only after the curtain drops.
- Hall camera: a spare that cannot join reads 0 of 10 in the hall; far end with dual-band reads 10/5/9.
- Commentary: priority alone 0.8% and 32 ms; rescheduling alone 2% and 30 ms.
- The changed condition in each mission where the brief named none: Ben unplugs (booth), a second photo to a backup wall, the scoreboard moves to a new server, the judges take `.71`, a third counter sample (160 → 175), the show runs long, an overnight firewall change, and a failed install.

## Trace a packet

`#networking/trace` (`/networking/trace`) is a small hop-by-hop packet tracer on the fair’s fictional network, written for this site. A learner picks a destination (same network, another network by address or by name, or a blocked one), can change the cable, the gateway setting, the name server setting and the starting hop allowance, predicts the outcome, sends one packet and steps through each device. Every step says what the device does and shows the frame addresses, the IP addresses and the hop allowance beside what left the laptop. Seven “things to try” tick themselves when a packet does them.

It is practice: public in both release modes, loaded as its own route chunk, kept only in the page’s memory, cleared with the session, and never part of a mission’s completion. The model (`src/packet-trace-model.js`) has 64 setups, all covered by `tests/packet-trace.test.js`. It simplifies on purpose: one router, no address translation, the “who has this address?” exchange and the name lookup are each told in a single step, and return traffic is not shown.

## Packet Simulator

`#networking/simulator` is where a learner builds part of the fair network, sends one packet and explains why it arrived or stopped. It is this site’s own design, wording, drawing and code. Two starting choices are on the hub, and each has a refreshable link a teacher can share:

| Start | Hash link | Short link |
| --- | --- | --- |
| Guide my first packet | `#networking/simulator?start=guide` | `/networking/first-packet` |
| Build my own network | `#networking/simulator?start=build` | `/networking/build` |
| A named starter | `#networking/simulator?start=build&starter=<blank\|booth\|booth-router\|wifi\|guest>` | — |
| The layout open in Network Studio | `#networking/simulator?start=build&starter=current` | — |

`/networking/simulator`, `/networking/trace`, `#networking/trace` and `#studio/network` keep working. Network Studio supplies the editable layout (`src/network-studio-model.js`: devices, ports, cables, power); the simulator (`src/packet-sim-model.js`, page `src/packet-sim.js`) adds addresses, Wi-Fi joins, a guest policy and the packet. Both pages edit the same in-memory layout, so a layout changed in the Studio can be traced, and the reverse.

**Several messages at once (Network Studio).** The Studio tests up to four sender and destination pairs at the same time (`tests` in the layout, `evaluateNetworkStudioTests`). Each has its own result and route, each animated packet carries its message number, and one change (a pulled cable, a powered-off router) can be seen to stop one message and not another. Message 1 is the pair the Packet Simulator traces; “Swap with message 1” chooses which.

**The result is derived from the build.** `simulatePacket(layout, net)` returns numbered events and one outcome. The map, the text view, the numbered list and the result all read those same events. A failed run names the device where the packet stopped, the reason, and one question to test next. Outcome kinds are kept apart: `link` (cable, power or Wi-Fi), `lookup` (the name question was not answered, so no packet was sent), `policy` (the gateway dropped it), `expired` (hop allowance), `address`. Changing a cable, power, Wi-Fi join, address setting, policy, endpoint, test or hop allowance marks the last run “previous evidence”; stepping, replaying or moving a device does not send a packet.

Starters and what each band checks (ticked from the learner’s own runs, in `simChecks`):

| Band | Starter | Evidence |
| --- | --- | --- |
| 7–8 | `booth`, `booth-router` | Deliver to the photo kiosk; reach the scoreboard through the router; with the switch–router cable out, the kiosk is still reached and the scoreboard is not, and the trace shows the last successful step. |
| 9–10 | `wifi` | Join and leave the fair Wi-Fi; test the scoreboard by address, then by name; with a wrong name-server address the address test still works and the name test stops at the lookup; restoring it makes the name test pass. |
| 11–12 | `guest` | Two subnets and a gateway policy tested as the same guest: scoreboard opens, staff files are blocked, blocking both fails; with “Show packet details”, frame addresses change at the router, the destination IP does not, and TTL drops only there. |

`FAIR_SIM_STARTERS` links the sticker booth, winning photo and guest scores missions to their starter from each section, with `from=<FAIR id>.<step>.<mode>` so “Back to your mission” returns to the same step.

**Simplifications, stated to learners where they matter.** Addresses are filled in automatically (`10.40.<network>.<device>`, /24) and are shown only when a starter uses them. A network is everything joined without crossing a router. A device keeps the address of the last network it was joined to, so an unplugged cable shows as a link problem. Routers know the networks they and their neighbouring routers touch; there are no routing protocols, VLANs, NAT or ARP caches. The guest policy applies to computers crossing a router. Name lookup needs a server labelled “Name server”.

**Practice, not assessment.** The simulator is public in both release modes, downloads as part of the tracer’s route chunk, keeps its state only in the page’s memory, clears with the session, sends nothing, and never reads or writes a mission record. The mission report therefore reflects only assessed mission work. Controls are native buttons, selects, radios and checkboxes; cables are made by choosing two labeled ports; with reduced motion the Play control is absent and every step is taken by hand.

## Release modes

- **Open** (current `PUBLIC_LAB_ACCESS`): the hub, all twelve missions, the capstone and `networking-handout.html` are published. Mission code downloads with the investigation route, not with the home page.
- **Preview**: the hub, the packet tracer, the Packet Simulator, the teaching notes and one free sample mission stay public: `FAIR-204` The frozen robot cam (`FREE_FAIR_IDS` in `src/fair-catalog.js`). `scripts/tier-bundles.mjs` compiles `fair-missions.js` down to that one mission’s model and replaces `fair-capstone.js` with an empty stub. Every other mission link and the capstone show the membership notice, only the free mission’s record is read or written, the hub’s start button goes to the free mission, and `/networking-handout` and the evidence-cards PDF stay withheld.

Missions register nothing with the reach, receipt or improvement services, so the pathway adds no data flow.

## Saving, shared devices and privacy

Missions use the existing work store and controls: work stays in the page until the learner turns on device saving or exports it, `?cart=true` never reads or writes device storage, and Clear removes mission records with everything else. Classroom sharing is not attached to mission records.

## Access

Every control is a native radio button, checkbox, button or text field. Named endpoints are connected by choosing where a cable goes; nothing is dragged. Every map has an open text view, every reading is a table with a written result, and station status is written in words. Larger text, the Listen and Display tools, high contrast, forced colors and reduced motion apply. Print lays the mission out as one document with every section open. At 980 px and below the guide and the workbench stack into one scrolling page.

## Teaching material and what stays private

- `/courses/networking-tech-fair`: the pathway as a complete course, listed on `/courses`. An overview, a lesson page for each of the twelve missions (student handout plus a 5, 5, 13, 10 and 7 minute teaching plan), a capstone lesson and a student workbook. `scripts/networking-course.mjs` writes the pages from the mission catalogue and models; the launch question, what to listen for, the look-for and the exit ticket are authored there. Lesson pages are published in both release modes and state no reading, outcome or point scale. Fifteen PDFs under `assets/courses/networking-tech-fair/` (the student workbook, all lesson plans in one file, and one per lesson) are printed from those pages by `node scripts/generate-course-downloads.mjs` and pinned in `scripts/course-downloads.json` with their own source digest, so one course can change without reprinting the other.

- `/lessons/networking-fair`: pacing (5, 5, 13, 10 and 7 minutes for the camera lesson), pair roles, debrief questions, look-fors at three levels, and assignment links.
- `/networking-handout` (open release): a plain-language word guide, a mission record sheet and printable evidence cards generated from the same models (`scripts/networking-pages.mjs`). Cards show readings and targets, never a verdict. The same cards, with each mission’s supplied evidence tables, are one download: `assets/networking-evidence-cards.pdf` (open release only, linked from the handout), printed by `node scripts/generate-course-downloads.mjs` and pinned under `cardsSource` and `openFiles` in `scripts/course-downloads.json`. On paper, the two missions where the crew marks supplied evidence (`FAIR-215`, `FAIR-216`) have no automatic check: the teacher or the debrief confirms the marks.

Under [Private teacher assessment materials](TEACHER-RUBRICS.md), public look-fors are not a grading scheme. The point scale and pass mark for this pathway are therefore not in this repository or on the site; keep them in the school’s approved private system.

## Sources

Topics follow the supplied ISSC231 outline (how data, voice and video travel), ISSC343 (wireless placement, direct links and mobility) and ISSC421 (VPNs, firewall boundaries and permissions). The evidence habit (say what you saw, what you tested and what you would still check) is the one practised in the Google Cybersecurity certificate, CompTIA Security+ and CYBR 340. All situations and wording are original; no course material is reproduced and no course equivalence is claimed.

## Verification

`npm run check`, `npm test` and `npm run build`. Browser checks on the built site (Chromium, 1366 × 768 and 390 × 844) are listed in the pull request. Not yet checked: a school-managed Chromebook, a screen reader, or a real class.
