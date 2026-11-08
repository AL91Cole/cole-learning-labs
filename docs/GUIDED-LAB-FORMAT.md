# Guided lab format

Networking, cybersecurity, AI and coding investigations (`#lab/<id>`) open as
guided labs in the style of published virtual labs (JBLearning Cloud Labs,
CompTIA CertMaster Labs): a **lab guide** on the left and the **simulated
environment** on the right. Hardware cases (INC-101 to INC-108) keep the
original ticket-style flow: request and clues, requester conversation, first
idea, workbench and test, check and explain. `src/lab-format.js` decides which
format a scenario uses; nothing else about a scenario changes.

## The lab guide (`src/lab-guide.js`, `src/lab-guide.css`)

The guide is an accordion with a progress bar. Only one section is open at a
time; the open section is reflected in the lab URL (`request`, `workbench`,
`explain`) so links and browser history keep working.

- **Introduction.** The scenario in narrative form, who requested it, the goal,
  learning objectives, the simulated tools, the deliverables, and the **lab
  resources**: the former clue cards, opened in place. There is no requester
  conversation and nothing to ask. Opening every resource card completes the
  introduction.
- **Section 1: Hands-On Demonstration.** Numbered steps that say exactly what to
  do in the environment. Coding labs quote the starter line to change in the
  selected practice language and why (CODE-501 to CODE-506, JavaScript and
  Python; tests prove each demonstrated fix passes every fixture). Network, AI
  and security labs use the workspace's live mission hint, which names the
  setting to change and the value to enter. Steps are checked off from the
  live workspace: edited, run, every check or input card passing.
- **Section 2: Applied Learning.** The experiment notebook with less direction:
  write a prediction and the resource that supports it, start the test, run the
  real test, describe the change, result and learning, save the attempt. The
  existing `workbenchProgress` rule decides when the section is complete.
- **Section 3: Challenge and Analysis.** Check the original task, answer two
  analysis questions (what changed and what the test showed; why the evidence
  shows the task works), an optional unguided challenge (coding: the same task
  in the other practice language, tracked per language in `state.solutions`;
  hardware transfer cases link their alternate ticket; other labs pose an
  analysis prompt), then **Finish lab** to open the report.

Read-only steps have a **Mark step done** button; those ids are the record's
`manual` list, accepted by the classroom save schema. Everything else is
derived from the record and the current workspace by `labGuideFacts`.

## Records and reports

- A guided lab counts as finished only when both analysis answers are written
  (`normalizeLabRecord`). The ticket-only rules (saved first idea, clarified
  request) do not apply to it.
- The report for a guided lab is a `LAB REPORT` with a `LAB GUIDE` section
  listing section progress and the challenge state. Hardware reports keep the
  `INVESTIGATION REPORT` wording.

## Verification

- `npm test`: the full suite passes, including `tests/lab-guide.test.js` (format
  split, guide structure for all 34 guided labs, coding demonstrations in both
  languages, fact derivation, page rendering without any interview controls,
  record completion rules, application routing).
- Browser check (Chromium, 1366 wide and 390 wide): CODE-501 runs end to end
  through the guide — resources, demonstration, notebook, verification,
  analysis answers, finish and report — with no console errors; NET-201 and
  SEC-401 show live demonstration steps; INC-101 still opens the ticket flow;
  the phone layout stacks the guide above the environment.
- Bundle budgets: the runtime module graph guard moved from 1,665,000 to
  1,750,000 bytes, the compiled public application guard from 1,000,000 to
  1,050,000 and the open delivery guard from 1,300,000 to 1,350,000.
