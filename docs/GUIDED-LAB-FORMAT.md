# Guided lab format

Every investigation (`#lab/<id>`) now reads like a published virtual-lab manual
in the style of JBLearning Cloud Labs and CompTIA CertMaster Labs: an
introduction with objectives, a guided hands-on section with a demonstration
for each step, and a challenge section the learner completes alone. The three
pages keep their URLs (`request`, `workbench`, `explain`), their saved record and
every existing gate; the manual sits above them and tells the learner what to
do next, in order, and checks each step off from the work they actually did.

## The lab manual panel (`src/lab-manual.js`, `src/lab-manual.css`)

- **Section stepper.** Three sections mirror the three pages: *1 Read the lab*,
  *2 Hands-on walkthrough*, *3 Challenge & analysis*. Later sections show as
  locked until the previous one is complete.
- **Introduction, objectives & tools.** The scenario brief, learning objectives
  (the lab goal plus three track objectives), the simulated tools in use, and
  the deliverables that end up in the report. Open by default on Section 1.
- **Numbered steps for the open page.** Each step has an instruction and a
  collapsed **Show me** demonstration. Steps are checked off from facts the
  page already tracks (questions asked, clues read, plan saved, fixtures
  passing, notebook saved, task verified, writing done). Steps that only ask
  the learner to read something have a **Mark step done** button; those
  acknowledgements are stored as short authored ids in the record's `manual`
  list and accepted by the classroom save schema.
- **Challenge.** The last step in Section 3 has no walkthrough text. Coding
  labs ask for the same task in the other practice language; the hardware
  transfer cases link to their alternate ticket in challenge mode; every other
  lab poses an analysis question for the reflection. The challenge is optional
  for finishing and is reported as *complete* or *not attempted*.
- **Report.** `LAB REPORT` adds a `LAB MANUAL` section listing section progress
  and the challenge state. Status reads `TASK VERIFIED — LAB OPEN` instead of
  the former ticket wording.

The manual is pure: `labManual(scenario, facts)` builds it, `renderLabManual`
returns HTML, `labManualReport` returns text. `app.js` assembles the facts in
`labManualFacts` from the record, the current workspace result, the experiment
notebook and the workspace mission hint; nothing new is executed or stored.

## Coding labs are no longer ticket-style

- The first page is an introduction: **Lab scenario**, a **Reference sheet** (the
  former clue cards: input contract, rule, fixture inputs) and **Plan your fix**
  (what the starter gets wrong, what change will fix it). Reading two
  reference cards and saving the plan opens the editor. Asking the lab
  assistant is optional and no longer gates the page.
- Section 2 is an authored walkthrough for each of CODE-501 through CODE-506 in
  both practice languages: choose the language and read the first input card,
  edit the quoted starter line (**Show me** shows the exact line to change and
  why), run all fixtures, make every card match, then record the test in the
  notebook. Tests prove each demonstrated fix passes every fixture.
- Section 3's challenge is the same task in the other language without the
  walkthrough. `coding-lab.js` remembers one passing solution per language in
  `state.solutions` (re-verified on restore, so a pasted record cannot claim
  it) and `codingChallengeComplete` reports when both languages pass.

## Other tracks

Section 1 keeps the requester conversation, two clues and the first idea as
numbered steps with suggested questions and sentence starters. Section 2's
"make the change" step uses an authored demonstration for the eight hardware
cases (which cable, port or part, and in what order) and the live workspace
mission hint for network, AI and security cases. Section 3 is verify, explain,
reflect, finish, plus the analysis challenge.

## Page wording

The pages are **Introduction & setup**, **Guided practice** and **Challenge &
report**. "Read the ticket" became "Lab scenario", "Finish investigation" became
"Finish lab", and workspace, notebook and guidance messages point to the new
page names. Element ids (`close-ticket`, `reset-ticket`, `page-one-next`,
`coding-editor`) are unchanged so saved classroom links and tests keep working.

## Verification

- `npm test`: the full suite passes, including the new `tests/lab-manual.test.js`
  (manual structure for all 42 labs, every coding demonstration passes its
  fixtures in both languages, acknowledgement and challenge rules, page wording
  for every scenario, the first-page gate for coding versus other tracks).
- Bundle budgets: the free application grew by about 24 KB for the manual, so
  the reviewed size guards moved from 1,000,000 to 1,050,000 bytes (compiled
  public app), 1,300,000 to 1,350,000 (open delivery) and 1,665,000 to
  1,700,000 (runtime module graph).
- Browser check (Chromium, 1280 wide): CODE-501 opens on the manual, reading
  two reference cards and saving a plan completes Section 1 without a question,
  the walkthrough ticks off edit, run and match after the demonstrated fix, and
  INC-101 shows the hardware manual. No console errors.
