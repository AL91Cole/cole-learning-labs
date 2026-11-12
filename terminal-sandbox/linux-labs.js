// Linux basics: five beginner labs on how to use a Linux computer. Each lab
// ships its own small folder of fictional files, a README with the steps, and a
// progress checker (.lab-check.sh, see buildSeedScript) so steps done in the
// Files window count as well as typed commands. Typing practice is checked from
// the terminal's command history. Everything is plain ASCII text.
import { generatedLabs } from "./generated-labs.js";

const PROGRESS = "/home/learner/.lab-progress";
const TRACK = "Linux Basics";
const GRADE = "Grades 7\u201312";

// A step is done only when every part of it is. A typed step names the command
// it teaches; a step with several parts lists them as stages, each stage's
// commands typed after the stage before (see typedInOrder in server.js). A
// `done` step is awarded by the lab's progress checker, plus any typed stages.
const typed = (id, title, description, hint, ...stages) => ({ id, title, description, hint, checkType: "history_regex", ...(stages.length === 1 && stages[0] instanceof RegExp ? { pattern: stages[0] } : { typed: stages }) });
const done = (id, title, description, hint, ...stages) => ({ id, title, description, hint, checkType: "file_contains", filePath: PROGRESS, expectedSubstring: "[" + id + "]", ...(stages.length ? { typed: stages } : {}) });
// A long listing: ls with -l among its options (ls -l tools, ls -la, ls tools -l).
const LONG_LIST = /^\s*ls\s+(\S+\s+)*-\w*l/;
const text = (lines) => lines.join("\n") + "\n";
const plain = (value) => value.replace(/`/g, "");

// The small line editor the other real-machine labs ship, for machines without a desktop.
const EDIT_PY = Object.values(generatedLabs()).flatMap((lab) => lab.files || []).find((file) => file.path === "edit.py")?.content;

/** README.txt for the lab folder, written from the same steps the checks use. */
function readme(lab) {
  const lines = [lab.id + " - " + lab.title, "=".repeat(lab.id.length + 3 + lab.title.length), "", ...lab.intro, "", "The two windows", "---------------", "Files     shows folders and files. Double-click to open one.", "Terminal  is where you type commands. Press Enter after each one.", "If you close a window, open it again from the menu in the bottom-left corner.", "", "Steps", "-----"];
  lab.milestones.forEach((step, index) => {
    lines.push(index + 1 + ". " + step.title, "   " + plain(step.description), "   Hint: " + plain(step.hint), "");
  });
  lines.push("The lab page checks your work by itself every few seconds.", "Everything here is practice. Nothing on this computer is real or private.");
  return text(lines);
}

function markdown(lab) {
  return ["# " + lab.id + " · " + lab.title, "", ...lab.intro, "", ...lab.milestones.flatMap((step, index) => ["### Step " + (index + 1) + ": " + step.title, step.description, ""])].join("\n");
}

function lab(definition) {
  const { intro, check, files, ...rest } = definition;
  const shipped = [...files, { path: ".lab-check.sh", content: text(["#!/bin/sh", "# Prints one [token] for each finished step of " + definition.id + ".", ...check, "exit 0"]) }];
  return { ...rest, track: TRACK, grade: GRADE, markdown: markdown(definition), files: [{ path: "README.txt", content: readme(definition) }, ...shipped] };
}

// ---------------------------------------------------------------- LNX-101
const LNX101 = lab({
  id: "LNX-101",
  title: "Find Your Way Around",
  minutes: 15,
  summary: "Meet the Linux desktop. Use the Files window and the terminal to look inside folders and read a file.",
  intro: ["Welcome to Linux. A computer keeps its files in folders, and folders can sit inside other folders.", "Your job: the storage room needs its code word. It is written on a key card somewhere under the school folder. Find it and write it in answer.txt."],
  milestones: [
    typed("where-am-i", "See where you are", "Click the Terminal window. Type `pwd` and press Enter. Linux prints the folder you are in.", "pwd means print working directory. You should see /home/learner/lab.", /^\s*pwd\b/),
    typed("list-folder", "List what is in the folder", "Type `ls` and press Enter. You see the same names the Files window shows.", "ls means list. Try `ls school` to list a folder without going into it.", /^\s*ls\b/),
    typed("read-file", "Read a file", "Type `cat school/office/schedule.txt` to print the schedule. It says where the key card is kept.", "cat prints a whole file. The words between the slashes are folders: school, then office.", /^\s*(cat|less|more|head|tail)\s+(\S+\s+)*\S*schedule\.txt\b/),
    typed("change-folder", "Move into a folder", "Type `cd school/lab/storage` and then `ls`. Read the key card with `cat key-card.txt`.", "cd means change directory. This step is done when you have moved into storage, listed it and read the card. `cd ~/lab` always returns to the lab folder.", /^\s*cd\s+\S*storage\b/, [/^\s*ls\b/, /^\s*(cat|less|more|head|tail)\s+(\S+\s+)*\S*key-card\.txt\b/]),
    done("code-word", "Write down the code word", "Click lab in the bar at the bottom of the screen to bring the Files window to the front. Double-click answer.txt, type the code word after the colon and save with Ctrl+S.", "No Files window? Type `echo \"code word: THE-WORD\" > ~/lab/answer.txt` using the real code word."),
  ],
  check: ["grep -qi 'BLUE-HERON-27' answer.txt 2>/dev/null && echo '[code-word]'"],
  files: [
    { path: "answer.txt", content: text(["Write the code word after the colon, then save this file.", "code word: "]) },
    { path: "school/office/schedule.txt", content: text(["Office schedule", "---------------", "08:00  Doors open", "08:15  Laptop cart goes to Room 21", "15:30  Laptop cart returns", "", "Key card: kept in the computer lab storage folder.", "Path:     school/lab/storage"]) },
    { path: "school/office/staff-notes.txt", content: text(["Staff notes", "The printer in the library needs paper on Mondays.", "Ask the lab technician before moving any computer."]) },
    { path: "school/library/books.txt", content: text(["Linux for Beginners", "How Networks Work", "The Friendly Guide to Files and Folders"]) },
    { path: "school/library/returns/note.txt", content: text(["Two books came back today. Nothing else is stored here."]) },
    { path: "school/lab/pc-list.txt", content: text(["LAB-PC-01  ready", "LAB-PC-02  ready", "LAB-PC-03  needs a keyboard", "LAB-PC-04  ready"]) },
    { path: "school/lab/storage/key-card.txt", content: text(["Storage room key card", "Code word: BLUE-HERON-27", "Return this card to the lab storage folder."]) },
  ],
});

// ---------------------------------------------------------------- LNX-102
const LNX102 = lab({
  id: "LNX-102",
  title: "Make, Copy, Move and Delete",
  minutes: 20,
  summary: "Tidy a messy folder: make a folder, copy and rename files, and delete what is not needed.",
  intro: ["The inbox folder is a mess. The science fair team wants one tidy folder named project.", "You can do every step by typing a command in the Terminal, or with the mouse in the Files window (right-click for the menu). Both ways count."],
  milestones: [
    done("project-folder", "Make a folder", "Make a folder named project inside the lab folder. Type `mkdir project`.", "mkdir means make directory. In the Files window: right-click an empty space, then Create New, then Folder."),
    done("plan-copied", "Copy a file", "Copy the plan into the new folder and leave the first one where it is. Type `cp inbox/plan.txt project/`.", "cp means copy. It takes two things: the file to copy, then where the copy goes."),
    done("notes-moved", "Move and rename a file", "Move the notes into project and give them a better name. Type `mv inbox/notes-old.txt project/notes.txt`.", "mv means move. Moving a file to a new name is how you rename it."),
    done("todo-made", "Make a new empty file", "Make an empty file for the to-do list. Type `touch project/todo.txt`.", "touch makes an empty file if the name is not used yet. Check with `ls project`."),
    done("tmp-removed", "Delete what is not needed", "Delete the two files in inbox that end in .tmp. Type `rm inbox/junk.tmp inbox/draft-copy.tmp`. Keep the other files.", "rm means remove. There is no undo in the terminal, so read the names before you press Enter."),
  ],
  check: [
    "[ -d project ] && echo '[project-folder]'",
    "[ -f inbox/plan.txt ] && [ -f project/plan.txt ] && cmp -s inbox/plan.txt project/plan.txt && echo '[plan-copied]'",
    "[ ! -e inbox/notes-old.txt ] && grep -q 'NOTES-K3' project/notes.txt 2>/dev/null && echo '[notes-moved]'",
    "[ -f project/todo.txt ] && echo '[todo-made]'",
    "[ -d inbox ] && [ ! -e inbox/junk.tmp ] && [ ! -e inbox/draft-copy.tmp ] && [ -f inbox/photo-list.txt ] && echo '[tmp-removed]'",
  ],
  files: [
    { path: "inbox/plan.txt", content: text(["Science fair plan (PLAN-A7)", "1. Pick a question", "2. Build the model", "3. Test it three times", "4. Make the poster"]) },
    { path: "inbox/notes-old.txt", content: text(["Team notes (NOTES-K3)", "Maya brings the cardboard.", "Dev brings the batteries.", "Meet in Room 21 on Thursday."]) },
    { path: "inbox/photo-list.txt", content: text(["Photos to take", "- the model from the front", "- the team at the table"]) },
    { path: "inbox/junk.tmp", content: text(["temporary scratch data", "0000 0000 0000"]) },
    { path: "inbox/draft-copy.tmp", content: text(["an old draft nobody needs"]) },
  ],
});

// ---------------------------------------------------------------- LNX-103
const visitors = Array.from({ length: 40 }, (_, index) => {
  const minute = 8 * 60 + index * 9;
  const rooms = ["Media Lab", "Library", "Room 21", "Office"];
  return String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0") + "  visitor " + String(index + 1).padStart(2, "0") + "  " + rooms[index % rooms.length];
});
const LNX103 = lab({
  id: "LNX-103",
  title: "Read and Edit Text Files",
  minutes: 20,
  summary: "Peek at a long file, fix a sign in a text editor, and write new files from the terminal.",
  intro: ["Most settings and notes on Linux are plain text files. If you can read and edit text, you can change almost anything.", "Your job: the Media Lab welcome sign has two mistakes, and the door needs a new notice."],
  milestones: [
    typed("peek", "Peek at a long file", "The visitor log has 40 lines. Type `head log/visitors.txt` to see the first ten, then `tail -n 3 log/visitors.txt` to see the last three.", "head shows the start of a file and tail shows the end. The number after -n is how many lines you want. Use both to finish this step.", [/^\s*head\b.*visitors/, /^\s*tail\b.*visitors/]),
    typed("count-lines", "Count the lines", "Type `wc -l log/visitors.txt`. The number is how many lines the file has.", "wc means word count. The -l part asks for lines only.", /^\s*wc\b/),
    done("sign-fixed", "Fix the sign in a text editor", "In the Files window, open the sign folder and double-click welcome.txt. Change Welcom to Welcome and change Room: 12 to Room: 21. Save with Ctrl+S.", "No Files window? Type `python3 edit.py sign/welcome.txt` and follow its menu. Check your work with `cat sign/welcome.txt`."),
    done("notice-made", "Write a new file from the terminal", "Type `echo \"Closed Friday\" > sign/notice.txt`. The > sends the words into a file.", "Careful: > replaces everything that was in the file. Read it back with `cat sign/notice.txt`."),
    done("notice-appended", "Add a line without erasing", "Type `echo \"Bring your badge\" >> sign/notice.txt`. Two arrows add to the end of the file.", "The notice should now have two lines: Closed Friday, then Bring your badge. If the first line is gone, write it again with one arrow."),
  ],
  check: [
    "grep -q '^Welcome to the Media Lab' sign/welcome.txt 2>/dev/null && grep -Eq '^Room: *21 *$' sign/welcome.txt && ! grep -q 'Room: *12' sign/welcome.txt && echo '[sign-fixed]'",
    "grep -qi 'closed friday' sign/notice.txt 2>/dev/null && echo '[notice-made]'",
    "grep -qi 'closed friday' sign/notice.txt 2>/dev/null && grep -qi 'bring your badge' sign/notice.txt && echo '[notice-appended]'",
  ],
  files: [
    { path: "sign/welcome.txt", content: text(["Welcom to the Media Lab", "Room: 12", "Open: 8:00 to 3:30", "Please sign the visitor log."]) },
    { path: "log/visitors.txt", content: text(visitors) },
    ...(EDIT_PY ? [{ path: "edit.py", content: EDIT_PY }] : []),
  ],
});

// ---------------------------------------------------------------- LNX-104
const LNX104 = lab({
  id: "LNX-104",
  title: "Who May Read, Write and Run",
  minutes: 20,
  summary: "Read the permission letters on a file, let a script run, and make a private file private.",
  intro: ["Every file on Linux has an owner and a set of permissions: r to read, w to write and x to run.", "The letters come in three groups: first the owner, then the owner's group, then everyone else.", "Your job: the report script will not run, and the diary can be read by everyone. Fix both."],
  milestones: [
    typed("who-am-i", "Find out who you are", "Type `whoami`. Linux prints the name of the account you are using.", "Files you make belong to this account. `id` shows the account and its groups.", /^\s*(whoami|id)\b/),
    typed("long-list", "Read the permission letters", "Type `ls -l tools`. The letters at the start of the line are the permissions. There is no x yet, so the script cannot run.", "-rw-r--r-- means: the owner may read and write, the group may read, everyone else may read.", LONG_LIST),
    done("script-runs", "Let the script run", "Type `chmod +x tools/make-report.sh`, then `ls -l tools` again. Look for the new x letters.", "chmod means change mode. +x adds permission to run the file as a program.", /^\s*chmod\s+(\S+\s+)*\S*make-report\.sh\b/, LONG_LIST),
    done("report-made", "Run the script", "Type `./tools/make-report.sh`. It writes a report. Read it with `cat tools/report.txt`.", "The ./ at the start means: run the file at this path. Without the x permission you would see Permission denied.", /^\s*((sh|bash)\s+)?\S*make-report\.sh\b/, /^\s*(cat|less|more|head|tail)\s+(\S+\s+)*\S*report\.txt\b/),
    done("diary-private", "Make the diary private", "Type `chmod 600 private/diary.txt`, then `ls -l private`. Only the owner should have letters now.", "600 means the owner may read and write (6), the group nothing (0), everyone else nothing (0). `chmod go-rwx` does the same thing.", /^\s*chmod\s+(\S+\s+)*\S*diary\.txt\b/, LONG_LIST),
  ],
  check: [
    "[ -x tools/make-report.sh ] && echo '[script-runs]'",
    "grep -q 'REPORT_READY' tools/report.txt 2>/dev/null && echo '[report-made]'",
    "case \"$(ls -l private/diary.txt 2>/dev/null | cut -c2-10)\" in r??------) echo '[diary-private]' ;; esac",
  ],
  files: [
    { path: "tools/make-report.sh", content: text(["#!/bin/sh", "# Writes a short report about this lab folder.", "cd \"$(dirname \"$0\")/..\" || exit 1", "{", "  echo \"REPORT_READY\"", "  echo \"Made by: $(whoami)\"", "  echo \"Files in shared: $(ls shared | wc -l)\"", "} > tools/report.txt", "echo \"Report written to tools/report.txt\""]) },
    { path: "private/diary.txt", content: text(["Practice diary (fictional)", "Monday: I learned what rwx means.", "This file should be readable only by its owner."]) },
    { path: "shared/notice.txt", content: text(["Shared notice", "Everyone may read this file. That is what the last r in -rw-r--r-- means."]) },
    { path: "shared/menu.txt", content: text(["Lunch menu", "Monday: vegetable noodles", "Tuesday: rice and beans"]) },
  ],
});

// ---------------------------------------------------------------- LNX-105
const PRINT_LOG = (() => {
  const errors = new Map([[3, "LIB-PRINT-2 ERROR paper jam"], [7, "LIB-PRINT-2 ERROR paper jam"], [12, "LAB-PRINT-3 ERROR out of paper"], [16, "LIB-PRINT-2 ERROR paper jam"], [21, "LIB-PRINT-1 ERROR cover open"], [25, "LIB-PRINT-2 ERROR paper jam"], [30, "LIB-PRINT-2 ERROR tray empty"], [36, "LAB-PRINT-3 ERROR out of paper"], [41, "LIB-PRINT-2 ERROR paper jam"]]);
  const printers = ["LIB-PRINT-1", "LIB-PRINT-2", "LAB-PRINT-3"];
  return Array.from({ length: 48 }, (_, index) => {
    const minute = 8 * 60 + index * 7;
    const stamp = String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
    return stamp + " " + (errors.get(index) || printers[index % 3] + " OK job " + (100 + index) + " printed");
  });
})();
const LNX105 = lab({
  id: "LNX-105",
  title: "Search, Filter and Get Help",
  minutes: 25,
  summary: "Search inside files, count results with a pipe, find a file by name, and ask a command for help.",
  intro: ["Reading every line of a long file is slow. Linux has tools that search for you.", "Your job: one printer keeps failing. Use the print log to find out how many errors there were and which printer has the most. Write what you find in answer.txt."],
  milestones: [
    typed("search", "Search inside a file", "Type `grep ERROR logs/print.log`. Only the lines that contain ERROR are printed.", "grep prints the lines that match. Capital letters matter: ERROR and error are different. Add -i to ignore that.", /^\s*grep\b/),
    typed("pipe-count", "Count with a pipe", "Type `grep ERROR logs/print.log | wc -l`. The | sends the results of grep into wc, which counts the lines.", "The | key is usually above Enter (hold Shift and press the backslash key). `grep -c ERROR logs/print.log` also counts.", /grep\b[^|]*\|\s*(wc|grep)\b|^\s*grep\s+(\S+\s+)*-\w*c/),
    done("log-answers", "Write down the errors and the printer", "Open answer.txt. After errors: write the number of ERROR lines. After printer: write the printer with the most errors. Save with Ctrl+S.", "To count one printer: `grep ERROR logs/print.log | grep -c LIB-PRINT-1`. Try each printer name."),
    done("toner-answer", "Search a whole folder", "Type `grep -r toner docs`. The -r searches every file in the folder. Write the file name after toner file: in answer.txt and save.", "grep -r prints the file name, a colon, then the matching line. Write only the file name, like paper.txt.", /^\s*grep\b(?=.*\s(-[a-z]*r[a-z]*|--recursive)(\s|$))(?=.*\btoner\b)/i),
    typed("find-name", "Find a file by its name", "Type `find . -name \"*.cfg\"`. The dot means start here, and the star matches any name that ends in .cfg.", "find looks through every folder below the starting place. Read the file it finds with cat.", /^\s*find\b/),
    typed("ask-help", "Ask a command for help", "Type `grep --help | head`. Most commands explain themselves when you add --help.", "Many Linux computers also have manual pages: `man grep`. Press q to leave a manual page.", /--help\b|^\s*man\s+\S/),
  ],
  check: [
    "grep -Eiq '^ *errors *: *9 *$' answer.txt 2>/dev/null && grep -Eiq '^ *printer *: *LIB-PRINT-2 *$' answer.txt && echo '[log-answers]'",
    "grep -Eiq '^ *toner file *: *(docs/)?supplies\\.txt *$' answer.txt 2>/dev/null && echo '[toner-answer]'",
  ],
  files: [
    { path: "answer.txt", content: text(["Fill in each line, then save this file.", "errors: ", "printer: ", "toner file: "]) },
    { path: "logs/print.log", content: text(PRINT_LOG) },
    { path: "docs/paper.txt", content: text(["Paper", "Each printer holds 250 sheets.", "Spare paper is in the library cupboard."]) },
    { path: "docs/supplies.txt", content: text(["Supplies", "Spare toner is on shelf 3 in the office.", "Order more when two boxes are left."]) },
    { path: "docs/hours.txt", content: text(["Printing hours", "Library: 8:00 to 3:30", "Computer lab: 8:00 to 4:00"]) },
    { path: "settings/printers/lib-print-2.cfg", content: text(["name=LIB-PRINT-2", "room=Library", "tray=A4", "note=Check the paper path when jams repeat."]) },
  ],
});

/** The Linux basics labs, in course order. */
export const linuxLabs = () => [LNX101, LNX102, LNX103, LNX104, LNX105];
