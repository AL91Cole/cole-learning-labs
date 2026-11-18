// Cyber field labs: four short labs for the grades 7-8 course Intro to
// Cybersecurity and Responsible AI. Each one repeats a classroom case with the
// real tools a security analyst uses: file permissions, a cipher and SHA-256
// fingerprints, a sign-in log, and a first Python script. They are built like
// the Linux basics labs (see linux-labs.js): fictional files, a README, typed
// steps checked from the terminal history and a progress checker for the rest.
// Every name, account and address is invented. Addresses are private-range.
import { createHash } from "node:crypto";
import { lab, typed, done, text, LONG_LIST, EDIT_PY } from "./linux-labs.js";

const TRACK = "Cyber Field Labs";
const GRADE = "Grades 7–8";
const course = (definition) => lab({ track: TRACK, grade: GRADE, ...definition });
const editor = EDIT_PY ? [{ path: "edit.py", content: EDIT_PY }] : [];
const READ = /^\s*(cat|less|more|head|tail)\s+(\S+\s+)*\S*/;
const reads = (name) => new RegExp(READ.source + name.replace(/[.]/g, "\\.") + "\\b");

// ---------------------------------------------------------------- CYB-101
const ROSTER = ["Amara", "Ben", "Chidi", "Dana", "Eli", "Farah", "Gus", "Hana", "Ivan", "Jo", "Kai", "Lena", "Mateo", "Nia", "Omar", "Priya", "Quinn", "Rey"];
const CYB101 = course({
  id: "CYB-101",
  title: "Lock Down the Club Roster",
  minutes: 15,
  summary: "Give each person only the access they need: read real file permissions, tighten the roster and share a head count without names.",
  intro: ["The art club roster lists 18 members. Right now everyone on this computer can read it.", "Your job: let the owner and the co-chair group use the roster, shut everyone else out, give the yearbook editor one number, and remove the shared password note."],
  milestones: [
    typed("who", "See which account you are", "Click the Terminal window. Type `id` and press Enter. Linux prints your account and the groups it belongs to.", "Signing in proves who you are. The groups decide what you may do afterwards. `whoami` prints only the account name.", /^\s*(id|whoami)\b/),
    typed("read-letters", "Read the permission letters", "Type `ls -l club`. Look at roster.txt. The letters rw-r--r-- mean the owner may read and write it, and the group and everyone else may read it.", "The letters come in three groups of three: owner, group, everyone else. r is read, w is write.", LONG_LIST),
    done("roster-locked", "Apply least privilege", "Type `chmod 640 club/roster.txt`, then `ls -l club` again. The owner may read and write, the group may read, everyone else gets nothing.", "6 is read and write, 4 is read only, 0 is nothing. The letters should now be rw-r-----.", /^\s*chmod\s+(\S+\s+)*\S*roster\.txt\b/, LONG_LIST),
    done("head-count", "Share a number, not the names", "The yearbook editor needs only a head count. Type `wc -l club/roster.txt > club/headcount.txt`, then `cat club/headcount.txt`.", "wc -l counts lines, one per member. The > sends the answer into a new file. The names stay in the roster."),
    done("password-note-gone", "Remove the shared password note", "Two co-chairs were sharing one password in a text file. Read it with `cat club/shared-password.txt`, then delete it with `rm club/shared-password.txt`.", "A shared password means nobody can tell who signed in. Each person needs an account of their own. Delete only this one file."),
  ],
  check: [
    "case \"$(ls -l club/roster.txt 2>/dev/null | cut -c2-10)\" in rw-r-----) echo '[roster-locked]' ;; esac",
    "[ -f club/roster.txt ] && grep -Eq '(^|[^0-9])18([^0-9]|$)' club/headcount.txt 2>/dev/null && ! grep -Eqi 'amara|quinn|rey' club/headcount.txt && echo '[head-count]'",
    "[ ! -e club/shared-password.txt ] && [ -f club/roster.txt ] && [ -f club/job-list.txt ] && echo '[password-note-gone]'",
  ],
  files: [
    { path: "club/roster.txt", content: text(ROSTER) },
    { path: "club/job-list.txt", content: text(["Jobs for Friday's show", "- door team", "- label table", "- setup crew", "- clean-up crew"]) },
    { path: "club/shared-password.txt", content: text(["Co-chair sign-in (shared by two people)", "password: practice-only-not-real", "This is also the password for a game. That is the problem."]) },
  ],
});

// ---------------------------------------------------------------- CYB-102
const NOTE = "AOL OBUA ZAHYAZ HA AOL NFT KVVY";
const RULE = "START AT NOON\n";
const RULE_HASH = createHash("sha256").update(RULE).digest("hex");
const CYB102 = course({
  id: "CYB-102",
  title: "Real Ciphers, Real Fingerprints",
  minutes: 20,
  summary: "Decode the locker note with a real command, then use SHA-256 fingerprints to catch the copy of the rules that changed.",
  intro: ["In class you cracked the locker note with key 7 and added up a classroom fingerprint.", "Your job: do both the way a security analyst would. Decode the note with tr, then use sha256sum to find the copy of the rule that still matches the adviser's posted fingerprint."],
  milestones: [
    typed("read-note", "Read the scrambled note", "Click the Terminal window. Type `cat note.txt` and press Enter.", "cat prints a whole file. The note is the same one from the lesson handout.", reads("note.txt")),
    done("decoded", "Decode it with tr", "Key 7 means A in the note is really T. Type `tr 'A-Z' 'T-ZA-S' < note.txt > decoded.txt`, then `cat decoded.txt`.", "tr swaps letters. The first list is what the note uses; the second list is the real alphabet shifted back seven places.", /^\s*tr\b/, reads("decoded.txt")),
    typed("fingerprints", "Fingerprint both copies", "Type `sha256sum rules/rules-board.txt rules/rules-hall.txt`. Each long line of letters and numbers is a real fingerprint, called a hash.", "The two files differ by four letters. Compare the two fingerprints: are they nearly the same, or completely different?", /^\s*sha256sum\s+(\S+\s+)*\S*rules-(board|hall)\.txt\b/),
    typed("one-letter", "Change one letter", "Type `echo hello | sha256sum`, then `echo hellp | sha256sum`. One letter changed.", "A good hash changes completely when anything changes, so nobody can sneak in a small edit.", [/echo\s+hello\b.*\|\s*sha256sum/], [/echo\s+(?!hello\b)\S+.*\|\s*sha256sum/]),
    typed("checked", "Check against the posted fingerprint", "The adviser's fingerprint is in rules/posted.sha256. Type `cd rules`, then `sha256sum -c posted.sha256`. OK means that copy is unchanged.", "The -c option reads a saved fingerprint and checks the file named beside it. Type `cd ~/lab` to return to the lab folder.", [/^\s*cd\s+\S*rules\b/], [/^\s*sha256sum\s+(\S+\s+)*(-c|--check)\b/]),
    done("answers", "Report what you found", "Open answer.txt in the Files window. After key: write the key. After unchanged copy: write the file name that passed the check. Save with Ctrl+S.", "No Files window? Type `python3 edit.py answer.txt` from the lab folder. Write only the file name, like rules-x.txt."),
  ],
  check: [
    "grep -q 'GYM DOOR' decoded.txt 2>/dev/null && echo '[decoded]'",
    "grep -Eiq '^ *key *: *7 *$' answer.txt 2>/dev/null && grep -Eiq '^ *unchanged copy *: *(rules/)?rules-board\\.txt *$' answer.txt && echo '[answers]'",
  ],
  files: [
    { path: "note.txt", content: NOTE + "\n" },
    { path: "rules/rules-board.txt", content: RULE },
    { path: "rules/rules-hall.txt", content: "START AT NINE\n" },
    { path: "rules/posted.sha256", content: RULE_HASH + "  rules-board.txt\n" },
    { path: "answer.txt", content: text(["Fill in each line, then save this file.", "key: ", "unchanged copy: "]) },
    ...editor,
  ],
});

// ---------------------------------------------------------------- sign-in log
// One school afternoon of practice sign-ins. The story: eight failed tries on
// the adviser account from one address, then a success from the same address.
const stamp = (minute, second) => "13:" + String(minute).padStart(2, "0") + ":" + String(second).padStart(2, "0");
const entry = (minute, second, user, result, from) => stamp(minute, second) + " user=" + user + " result=" + result + " from=" + from;
const BURST_FROM = "10.20.9.50";
export const SIGNIN_LOG = [
  entry(0, 12, "mia", "OK", "10.20.4.12"), entry(0, 40, "kai", "OK", "10.20.4.18"), entry(1, 5, "rey", "FAILED", "10.20.4.37"),
  entry(1, 19, "rey", "OK", "10.20.4.37"), entry(1, 52, "nia", "OK", "10.20.4.21"), entry(2, 30, "adviser", "OK", "10.20.1.5"),
  entry(3, 8, "omar", "OK", "10.20.4.25"), entry(3, 44, "mia", "FAILED", "10.20.4.12"), entry(3, 58, "mia", "OK", "10.20.4.12"),
  entry(4, 11, "lena", "OK", "10.20.4.30"),
  ...[5, 6, 6, 7, 7, 8, 8, 9].map((minute, index) => entry(minute, 3 + index * 7, "adviser", "FAILED", BURST_FROM)),
  entry(9, 58, "dana", "OK", "10.20.4.14"), entry(10, 2, "adviser", "OK", BURST_FROM), entry(10, 36, "ben", "OK", "10.20.4.11"),
  entry(11, 15, "rey", "FAILED", "10.20.4.37"), entry(11, 29, "rey", "OK", "10.20.4.37"), entry(12, 4, "gus", "OK", "10.20.4.16"),
  entry(12, 50, "hana", "OK", "10.20.4.17"), entry(13, 22, "eli", "OK", "10.20.4.15"), entry(14, 9, "jo", "OK", "10.20.4.19"),
  entry(15, 30, "priya", "OK", "10.20.4.26"), entry(16, 1, "adviser", "OK", "10.20.1.5"), entry(16, 45, "quinn", "OK", "10.20.4.27"),
];
const failures = (user) => SIGNIN_LOG.filter((line) => line.includes("result=FAILED") && (!user || line.includes("user=" + user + " "))).length;
export const SIGNIN_FACTS = Object.freeze({ lines: SIGNIN_LOG.length, failed: failures(), adviser: failures("adviser"), mia: failures("mia"), address: BURST_FROM, success: "13:10" });

const CYB103 = course({
  id: "CYB-103",
  title: "Read the Sign-in Log",
  minutes: 20,
  summary: "Search a real sign-in log, count the failures and find the account and address behind a burst of failed sign-ins.",
  intro: ["The label sheet changed just after 1:12 p.m. The adviser asks what the sign-in log shows for the minutes before that.", "Your job: count the failed sign-ins, find which account they aimed at and where they came from, and report only what the log shows. A log names an account and an address. It does not name a person."],
  milestones: [
    typed("peek", "Peek at the log", "Click the Terminal window. Type `head logs/signin.log`. Each line has a time, an account, a result and the address it came from.", "head shows the first ten lines. `wc -l logs/signin.log` tells you how many lines there are.", /^\s*(head|cat|less|more)\s+(\S+\s+)*\S*signin\.log\b/),
    typed("failed-lines", "Show only the failures", "Type `grep FAILED logs/signin.log`. Only the failed sign-ins are printed.", "grep prints the lines that match. Capital letters matter: FAILED and failed are different.", /^\s*grep\s+(\S+\s+)*["']?FAILED/),
    typed("count", "Count them", "Type `grep -c FAILED logs/signin.log`. The -c option counts the matching lines.", "`grep FAILED logs/signin.log | wc -l` gives the same number.", /^\s*grep\s+(\S+\s+)*-\w*c|grep\b[^|]*\|\s*wc\b/),
    typed("by-account", "Count failures for each account", "Type `grep FAILED logs/signin.log | cut -d' ' -f2 | sort | uniq -c`. The number beside each account is its failures.", "cut keeps the second word of each line, the account. sort puts the same accounts together and uniq -c counts each one.", /sort\b[^|]*\|\s*uniq\b/),
    done("burst", "Report the burst", "Open answer.txt in the Files window. Fill in failed, account and address for the account with the most failures. Save with Ctrl+S.", "To see that account's lines, type `grep user=NAME logs/signin.log` with the real account name. The address is the part after from=."),
    done("success", "Find what happened next", "Type `grep 'user=adviser ' logs/signin.log`. Find the first OK after the failures. Write its hour and minute after success time: in answer.txt and save.", "Read down the times. The failures stop, then one line from the same address says OK. Write the time like 13:05.", /^\s*grep\s+(\S+\s+)*\S*adviser/),
  ],
  check: [
    "grep -Eiq '^ *failed *: *" + SIGNIN_FACTS.failed + " *$' answer.txt 2>/dev/null && grep -Eiq '^ *account *: *adviser *$' answer.txt && grep -Eq '^ *address *: *" + BURST_FROM.replace(/\./g, "\\.") + " *$' answer.txt && echo '[burst]'",
    "grep -Eiq '^ *success time *: *" + SIGNIN_FACTS.success + "(:02)? *$' answer.txt 2>/dev/null && echo '[success]'",
  ],
  files: [
    { path: "logs/signin.log", content: text(SIGNIN_LOG) },
    { path: "answer.txt", content: text(["Fill in each line, then save this file.", "failed: ", "account: ", "address: ", "success time: "]) },
    ...editor,
  ],
});

// ---------------------------------------------------------------- CYB-104
export const COUNT_SCRIPT = text([
  "# Counts failed sign-ins for one account in the practice log.",
  "account = \"mia\"",
  "limit = 20",
  "",
  "failed = 0",
  "log = open(\"logs/signin.log\")",
  "for line in log:",
  "    if \"FAILED\" in line and \"user=\" + account + \" \" in line:",
  "        failed = failed + 1",
  "log.close()",
  "",
  "print(account, \"failed\", failed, \"times\")",
  "if failed >= limit:",
  "    print(\"ALERT: tell the adviser about\", account)",
]);
const CYB104 = course({
  id: "CYB-104",
  title: "Let Python Do the Counting",
  minutes: 20,
  summary: "Run a real Python script on the sign-in log, change two settings and save an alert report.",
  intro: ["Counting failures by hand works for one account. A short Python script can check any account in a blink, the same way every time.", "Your job: run the script, point it at the account from the last lab, set a sensible alert limit and save the report for the adviser. The script only counts. A person still decides what the count means."],
  milestones: [
    typed("read-script", "Read the script", "Click the Terminal window. Type `cat count_failures.py`. Find the two settings at the top, the loop that reads each line and the if that decides.", "Lines that start with # are notes for people. Python skips them.", reads("count_failures.py")),
    typed("run", "Run it", "Type `python3 count_failures.py`. It counts the failed sign-ins for the account named at the top.", "python3 runs the file from its first line to its last. You should see one line about mia.", /^\s*python3?\s+(\S+\s+)*\S*count_failures\.py\b/),
    done("account-set", "Point it at another account", "In the Files window, double-click count_failures.py. Change \"mia\" to \"adviser\" and save with Ctrl+S. Run the script again.", "Keep the quote marks. No Files window? Type `python3 edit.py count_failures.py` and follow its menu."),
    done("limit-set", "Set the alert limit", "The adviser wants an alert at 5 failures. Change limit = 20 to limit = 5, save, and run the script again. An ALERT line should appear.", "The if at the bottom compares failed with limit. With 20 it stayed quiet. Use a number, without quote marks."),
    done("report", "Save the report", "Type `python3 count_failures.py > report.txt`, then `cat report.txt`. The > sends what the script prints into a file.", "The report should name the account, its count and the alert. If it does not, check the two settings and save the script again."),
  ],
  check: [
    "grep -Eq '^account *= *[\"'\"'\"']adviser[\"'\"'\"'] *$' count_failures.py 2>/dev/null && echo '[account-set]'",
    "grep -Eq '^limit *= *5 *$' count_failures.py 2>/dev/null && echo '[limit-set]'",
    "grep -q '^adviser failed " + SIGNIN_FACTS.adviser + " times' report.txt 2>/dev/null && grep -q '^ALERT' report.txt && echo '[report]'",
  ],
  files: [
    { path: "count_failures.py", content: COUNT_SCRIPT },
    { path: "logs/signin.log", content: text(SIGNIN_LOG) },
    ...editor,
  ],
});

/** The cyber field labs, in course order. */
export const cyberLabs = () => [CYB101, CYB102, CYB103, CYB104];
