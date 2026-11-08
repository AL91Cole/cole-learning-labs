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

## The lab environment: a simulated desktop (`src/lab-desktop.js`, `src/lab-shell.js`)

The right pane is a Lubuntu-style desktop that runs entirely in the browser:
a panel with an application menu, quick launchers, task buttons, a system tray
and clock; Computer, Home, Lab Folder, Terminal, Text Editor, Lab Console and
Trash icons; and windows that drag, resize, minimise, maximise and close.
Learners do the work themselves, the way they would on a real machine, while
every result still comes from the lab's own simulation engines. Completed guide
steps appear as desktop notifications. Nothing runs real software, touches real
files or reaches a network.

- **Terminal.** A practice shell with a coloured `student@lab-pc:~/lab$` prompt,
  Tab completion of commands and file names, command history, Ctrl+L and
  Ctrl+C, and `exit`. It understands `ls` (with `-l` and `-a` in GNU format),
  `cd`, `pwd`, `cat`, `head`, `tail`, `grep`, `wc`, `nano`, `touch`, `mkdir`,
  `rm`, `cp`, `mv`, `echo > file`, `whoami`, `id`, `hostname`, `uname`, `date`,
  `uptime`, `ps`, `df`, `free`, `env`, `which`, `man`, `history`, `clear`,
  `console` and `files`, plus each lab's own practice tools verbatim (for
  example `ipconfig`, `ping 10.24.8.1`, `inspect sender`, `show queue`). Coding
  labs add `python3 program.py <input>`, `node program.js <input>` and
  `./check` (every fixture at once). NET-201 also accepts `ip addr`,
  `ip addr add <address>/<prefix> dev eth0`, `ip route add default via
  <gateway>` and `resolvectl dns eth0 <server>`, which save the same settings
  as the Lab Console. Unknown commands get `command not found` with a pointer
  to `help`; real-network and package commands are refused with an explanation.
- **A home folder of their own.** `/home/student` has `Desktop`, `Documents`,
  `Downloads` and `lab`. Learners can create, copy, move and remove their own
  files there for the session (bounded to 40 files of 4,000 characters); lab
  files are read-only except the program file, and `/etc/os-release` and
  `/etc/hostname` describe the simulated system.
- **Files.** A file manager with a Places sidebar (Home, Desktop, Documents,
  Downloads, Lab Folder, Computer, Trash), breadcrumbs, up and home buttons,
  and a folder grid. The lab folder holds `README.txt`, a `resources/` folder
  with every resource card as a text file, and either `program.py`/`program.js`,
  `fixtures.txt` and `check` (coding) or `settings.txt` and `tools.txt`.
- **Text Editor.** A menu bar (Save, Run all fixtures, Close file), line
  numbers, a status bar with the cursor position and language, Ctrl+S and Tab
  indentation. The program file saves to the lab state (the same `save-code`
  action as before); learners' own files save to their session home folder.
- **Lab Console.** The lab's existing settings and test workbench, opened as a
  window instead of a fixed form. Changing a setting there or in the terminal
  updates the same state.

Windows open from desktop icons, the application menu, the quick launchers or
the task buttons; on phones they fill the desktop. Guide steps watch what the
learner does: running any terminal command, running a lab tool, running the
program and editing or saving the file each complete a step.
Those activity markers are stored as acknowledged ids (`used-terminal`,
`used-tool`, `ran-program`) in the record's `manual` list.

### Pluggable environments (`src/lab-environment.js`)

The guide mounts whatever provider `preferredLabEnvironment()` returns. The
simulated desktop registers itself as `simulated-desktop`. A provider is
`{id, label, render(scenario, record), mount(root, context)}` where `mount`
returns `{refresh, dispose, open, hasUnsavedDraft}` and `context` carries
`scenario`, `record`, `getState`, `action`, `renderConsole`, `onActivity` and
`showNotice`. To use another environment, register it and set
`window.COLE_LAB_ENVIRONMENT` (or `data-lab-environment` on `<html>`) to its id.

This is the seam for the optional Docker terminal service in
`terminal-sandbox/`: a `remote-terminal` provider would render the xterm pane,
stream the real shell, and report activity through `onActivity`, with no change
to the guide or the records. Hosting it costs real money per running
container-second (Docker's platform lists Micro at about $0.07 an hour and Small
at about $0.14), so it stays an opt-in for paid labs; the simulated desktop is
the default and costs nothing to host.

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
  record completion rules, application routing) and `tests/lab-shell.test.js`
  (lab folder and tools for every guided lab, navigation and reading, coding
  runs and checks, NET-201 network commands, input bounds).
- Browser check (Chromium, 1440 wide and 390 wide): CODE-501 runs end to end on
  the desktop — `ls`, `cat fixtures.txt`, `nano program.js`, edit and Save in
  the Text Editor, `node program.js 2`, `./check` all PASS — then the notebook,
  verification and analysis answers; NET-201 completes Section 1 with
  `ipconfig`, `ip addr add`, `ip route add`, `resolvectl dns` and Test
  connection in the Lab Console; no console errors; INC-101 still opens the
  ticket flow; the phone layout stacks the guide, then the desktop.
- Bundle budgets: the runtime module graph guard moved from 1,665,000 to
  1,750,000 bytes, the compiled public application guard from 1,000,000 to
  1,100,000 and the open delivery guard from 1,300,000 to 1,400,000.
