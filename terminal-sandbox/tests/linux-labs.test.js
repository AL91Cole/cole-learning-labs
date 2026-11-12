import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { linuxLabs } from "../linux-labs.js";
import { labFor, validateLabDefinition, allowedLabFiles, verifySessionMilestones, typedInOrder, historyCommands } from "../server.js";
import { buildSeedScript, seedFromLabFiles, PROGRESS_CHECK, PROGRESS_FILE } from "../cloud-sandboxes.js";

const labs = linuxLabs();
const byId = Object.fromEntries(labs.map((lab) => [lab.id, lab]));

/** Writes a lab's files the way the seed script does, with the checker moved out of the lab folder. */
function materialize(lab) {
  const home = mkdtempSync(path.join(os.tmpdir(), "cll-linux-")), root = path.join(home, "lab");
  for (const file of lab.files) {
    const target = file.path === PROGRESS_CHECK ? path.join(home, PROGRESS_CHECK) : path.join(root, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    chmodSync(target, file.mode ?? 0o644);
  }
  const sh = (script) => execFileSync("sh", ["-c", script], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, HOME: home } });
  const progress = () => execFileSync("sh", [path.join(home, PROGRESS_CHECK)], { cwd: root, encoding: "utf8" });
  return { home, root, sh, progress, done: () => rmSync(home, { recursive: true, force: true }) };
}
const tokens = (lab) => lab.milestones.filter((step) => step.checkType === "file_contains").map((step) => step.expectedSubstring);
/** The steps a lab's machine reports for this command history and progress note. */
async function checks(labId, history, progress = "") {
  const result = await verifySessionMilestones({ labId, commandHistory: [], sandbox: { history: async () => history, readFile: async () => progress } });
  return Object.fromEntries(result.map((item) => [item.id, item.completed]));
}

// The commands the steps teach, typed in order (`history`), and the changes the
// learner makes to the files (`run`, which the progress checker sees).
const SOLUTIONS = {
  "LNX-101": { history: ["pwd", "ls", "cat school/office/schedule.txt", "cd school/lab/storage", "ls", "cat key-card.txt"], run: ['printf "code word: blue-heron-27\\n" > answer.txt'] },
  "LNX-102": { history: [], run: ["mkdir project", "cp inbox/plan.txt project/", "mv inbox/notes-old.txt project/notes.txt", "touch project/todo.txt", "rm inbox/junk.tmp inbox/draft-copy.tmp"] },
  "LNX-103": { history: ["head log/visitors.txt", "tail -n 3 log/visitors.txt", "wc -l log/visitors.txt"], run: ["sed -i 's/^Welcom /Welcome /; s/^Room: 12/Room: 21/' sign/welcome.txt", 'echo "Closed Friday" > sign/notice.txt', 'echo "Bring your badge" >> sign/notice.txt'] },
  "LNX-104": { history: ["whoami", "ls -l tools", "chmod +x tools/make-report.sh", "ls -l tools", "./tools/make-report.sh", "cat tools/report.txt", "chmod 600 private/diary.txt", "ls -l private"], run: ["chmod +x tools/make-report.sh", "./tools/make-report.sh", "chmod 600 private/diary.txt"] },
  "LNX-105": { history: ["grep ERROR logs/print.log", "grep ERROR logs/print.log | wc -l", "grep -r toner docs", 'find . -name "*.cfg"', "grep --help | head"], run: ["printf 'errors: 9\\nprinter: lib-print-2\\ntoner file: supplies.txt\\n' > answer.txt"] },
};

test("five Linux basics labs are registered, valid and small", () => {
  assert.deepEqual(labs.map((lab) => lab.id), ["LNX-101", "LNX-102", "LNX-103", "LNX-104", "LNX-105"]);
  for (const lab of labs) {
    assert.equal(validateLabDefinition(lab), null, lab.id);
    assert.equal(labFor(lab.id)?.title, lab.title);
    assert.equal(lab.track, "Linux Basics");
    assert.ok(lab.milestones.length >= 5 && lab.milestones.length <= 6, lab.id);
    assert.ok(lab.files.reduce((sum, file) => sum + file.content.length, 0) < 20000, lab.id + " seeds in one short command");
    assert.ok(lab.files.some((file) => file.path === "README.txt") && lab.files.some((file) => file.path === PROGRESS_CHECK), lab.id);
    for (const file of lab.files) assert.ok(!/[^\x00-\x7f]/.test(file.content), `${lab.id}/${file.path} is plain ASCII`);
    for (const step of lab.milestones) {
      assert.ok(step.title.length <= 60 && step.description.length <= 400 && step.hint.length <= 400, lab.id + "/" + step.id);
      if (step.checkType === "file_contains") assert.equal(step.filePath, PROGRESS_FILE, lab.id + "/" + step.id);
    }
    const all = tokens(lab);
    for (const token of all) assert.equal(all.filter((other) => other.includes(token)).length, 1, lab.id + ": " + token + " is not part of another token");
    const readme = lab.files.find((file) => file.path === "README.txt").content;
    for (const step of lab.milestones) assert.ok(readme.includes(step.title), lab.id + " README lists " + step.title);
    assert.ok(!readme.includes("`"), lab.id + " README is plain text");
  }
  assert.ok(allowedLabFiles().includes(PROGRESS_FILE), "the checks may read the progress note");
});

test("each lab starts with no finished step and finishes with the commands it teaches", async () => {
  for (const lab of labs) {
    const box = materialize(lab), solution = SOLUTIONS[lab.id];
    try {
      assert.equal(box.progress().trim(), "", lab.id + " starts with nothing done");
      assert.ok(Object.values(await checks(lab.id, [], "")).every((completed) => !completed), lab.id + " shows no step done");
      for (const command of solution.run) box.sh(command);
      const after = box.progress();
      for (const token of tokens(lab)) assert.ok(after.includes(token), `${lab.id} awards ${token}:\n${after}`);
      assert.deepEqual(await checks(lab.id, solution.history, after), Object.fromEntries(lab.milestones.map((step) => [step.id, true])), lab.id + " is complete with the taught commands");
      for (const command of solution.history) assert.ok(lab.milestones.some((step) => step.description.includes("`" + command + "`")), `${lab.id} teaches: ${command}`);
      // Where the solution is exactly the taught commands, every one appears in a step.
      if (["LNX-102", "LNX-104"].includes(lab.id))
        for (const command of solution.run) assert.ok(lab.milestones.some((step) => step.description.includes("`" + command + "`")), `${lab.id} teaches: ${command}`);
    } finally {
      box.done();
    }
  }
});

test("typed-command steps do not pass on unrelated commands", () => {
  const step = (lab, id) => byId[lab].milestones.find((item) => item.id === id).pattern;
  assert.ok(!step("LNX-101", "where-am-i").test("echo pwd"));
  assert.ok(!step("LNX-101", "read-file").test("cat") && !step("LNX-101", "read-file").test("cat README.txt") && step("LNX-101", "read-file").test("less ./school/office/schedule.txt"));
  assert.ok(step("LNX-104", "long-list").test("ls -la") && step("LNX-104", "long-list").test("ls tools -l") && !step("LNX-104", "long-list").test("ls tools"));
  assert.ok(step("LNX-105", "pipe-count").test("grep -c ERROR logs/print.log") && !step("LNX-105", "pipe-count").test("grep ERROR logs/print.log"));
  assert.ok(step("LNX-105", "ask-help").test("man grep") && !step("LNX-105", "ask-help").test("grep help logs/print.log"));
});

test("the progress checks notice careless shortcuts", () => {
  let box = materialize(byId["LNX-102"]);
  try {
    box.sh("mkdir project && mv inbox/plan.txt project/ && rm -r inbox");
    const out = box.progress();
    assert.ok(out.includes("[project-folder]"));
    assert.ok(!out.includes("[plan-copied]"), "moving is not copying");
    assert.ok(!out.includes("[tmp-removed]"), "deleting the whole inbox is not tidying it");
  } finally { box.done(); }
  box = materialize(byId["LNX-103"]);
  try {
    box.sh('echo "Closed Friday" > sign/notice.txt; echo "Bring your badge" > sign/notice.txt');
    const out = box.progress();
    assert.ok(!out.includes("[notice-appended]") && !out.includes("[notice-made]"), "one arrow replaced the first line");
    assert.ok(!out.includes("[sign-fixed]"));
  } finally { box.done(); }
  box = materialize(byId["LNX-104"]);
  try {
    box.sh("sh tools/make-report.sh; chmod 644 private/diary.txt");
    const out = box.progress();
    assert.ok(out.includes("[report-made]") && !out.includes("[script-runs]") && !out.includes("[diary-private]"));
    box.sh("chmod go-rwx private/diary.txt");
    assert.ok(box.progress().includes("[diary-private]"));
    assert.match(readFileSync(path.join(box.root, "tools/report.txt"), "utf8"), /REPORT_READY\nMade by: \S+\nFiles in shared: 2\n/);
  } finally { box.done(); }
  box = materialize(byId["LNX-105"]);
  try {
    assert.equal(box.sh("grep -c ERROR logs/print.log").trim(), "9");
    assert.equal(box.sh("grep ERROR logs/print.log | grep -c LIB-PRINT-2").trim(), "6");
    assert.equal(box.sh("grep -rl toner docs").trim(), "docs/supplies.txt");
    assert.equal(box.sh('find . -name "*.cfg"').trim(), "./settings/printers/lib-print-2.cfg");
    box.sh("printf 'errors: 8\\nprinter: LIB-PRINT-2\\ntoner file: docs/supplies.txt\\n' > answer.txt");
    const out = box.progress();
    assert.ok(!out.includes("[log-answers]") && out.includes("[toner-answer]"));
  } finally { box.done(); }
});

test("the seed script moves the checker out of the lab folder and starts the watcher as the learner", () => {
  for (const options of [{ desktop: true }, { fresh: true }, {}]) {
    const script = buildSeedScript(seedFromLabFiles(byId["LNX-102"].files), options);
    assert.match(script, /mv -f \/home\/learner\/lab\/\.lab-check\.sh \/home\/learner\/\.lab-check\.sh/);
    assert.match(script, /su learner -c 'nohup sh \/home\/learner\/\.lab-watch\.sh >\/dev\/null 2>&1 &'/);
    assert.ok(script.indexOf("mv -f /home/learner/lab/.lab-check.sh") < script.indexOf("nohup sh /home/learner/.lab-watch.sh"), "files first, then the watcher");
    const watch = Buffer.from(script.match(/printf '%s' '([A-Za-z0-9+/=]+)' \| base64 -d > \/home\/learner\/\.lab-watch\.sh/)[1], "base64").toString("utf8");
    assert.match(watch, /cd \/home\/learner\/lab 2>\/dev\/null && sh \/home\/learner\/\.lab-check\.sh/);
    assert.match(watch, /mv -f \/home\/learner\/\.lab-progress\.new \/home\/learner\/\.lab-progress/);
    assert.match(watch, /sleep 2/);
  }
  // A lab without a checker gets no watcher: the guard is a file test inside the machine.
  assert.match(buildSeedScript(seedFromLabFiles([{ path: "a.txt", content: "x" }])), /if \[ -f \/home\/learner\/\.lab-watch\.sh \]; then/);
});

test("the checks read the progress note once per pass and combine it with typed commands", async () => {
  const { verifySessionMilestones } = await import("../server.js");
  const reads = [];
  const session = {
    labId: "LNX-104",
    commandHistory: [],
    sandbox: {
      history: async () => ["whoami", "ls -l tools", "chmod +x tools/make-report.sh", "ls -l tools", "./tools/make-report.sh"],
      readFile: async (file) => { reads.push(file); return "[script-runs]\n[report-made]\n"; },
    },
  };
  const result = await verifySessionMilestones(session);
  assert.deepEqual(reads, [PROGRESS_FILE]);
  assert.deepEqual(result.map((item) => [item.id, item.completed]), [["who-am-i", true], ["long-list", true], ["script-runs", true], ["report-made", false], ["diary-private", false]], "the report is made but not read yet");
});

test("the site's course catalog matches the labs the server hosts", async () => {
  const { LINUX_COURSE } = await import("../../src/linux-catalog.js");
  assert.deepEqual(LINUX_COURSE.map(({ id, title, minutes, summary }) => ({ id, title, minutes, summary })), labs.map(({ id, title, minutes, summary }) => ({ id, title, minutes, summary })));
  for (const item of LINUX_COURSE) {
    const lab = byId[item.id], taught = lab.milestones.map((step) => step.description + " " + step.hint).join(" ");
    for (const skill of item.skills) assert.ok(taught.includes(skill), `${item.id} teaches ${skill}`);
  }
});

test("a step shows as done only when every part of it is done", async () => {
  const start = ["pwd", "ls", "cat school/office/schedule.txt"];
  assert.equal((await checks("LNX-101", [...start, "cd school/lab/storage"]))["change-folder"], false, "moving into the folder is only the first part");
  assert.equal((await checks("LNX-101", [...start, "cd school/lab/storage", "ls"]))["change-folder"], false, "listing it is the second");
  assert.equal((await checks("LNX-101", [...start, "cd school/lab/storage", "ls", "cat key-card.txt"]))["change-folder"], true);
  assert.equal((await checks("LNX-101", [...start, "cd school", "cd lab", "cd storage", "cat key-card.txt", "ls -l"]))["change-folder"], true, "one folder at a time, and the last two parts in either order");
  assert.equal((await checks("LNX-101", ["ls", "cat school/lab/storage/key-card.txt", "cd school/lab/storage"]))["change-folder"], false, "reading the card before moving in does not count as this step");
  assert.equal((await checks("LNX-101", ["cat README.txt"]))["read-file"], false, "reading another file is not reading the schedule");
  assert.equal((await checks("LNX-103", ["head log/visitors.txt"])).peek, false, "head without tail");
  assert.equal((await checks("LNX-103", ["tail -n 3 log/visitors.txt", "head log/visitors.txt"])).peek, true, "both, in either order");
  assert.equal((await checks("LNX-103", ["head README.txt", "tail README.txt"])).peek, false, "another file");
  const made = "[script-runs]\n[report-made]\n[diary-private]\n";
  let result = await checks("LNX-104", ["ls -l tools", "chmod +x tools/make-report.sh"], made);
  assert.equal(result["script-runs"], false, "the x was added but not looked at with ls -l again");
  result = await checks("LNX-104", ["ls -l tools", "chmod +x tools/make-report.sh", "ls -l tools"], made);
  assert.equal(result["script-runs"], true);
  assert.equal((await checks("LNX-104", ["cat tools/report.txt", "chmod +x tools/make-report.sh", "ls -l tools/make-report.sh", "./tools/make-report.sh"], made))["report-made"], false, "the report was read before the script wrote it");
  assert.equal((await checks("LNX-104", ["cd tools && ./make-report.sh", "cat report.txt"], made))["report-made"], true);
  assert.equal((await checks("LNX-104", ["sh tools/make-report.sh", "less tools/report.txt"], made))["report-made"], true);
  assert.equal((await checks("LNX-104", ["chmod 600 private/diary.txt"], made))["diary-private"], false);
  assert.equal((await checks("LNX-104", ["chmod go-rwx private/diary.txt", "ls -la private"], made))["diary-private"], true);
  assert.equal((await checks("LNX-104", ["chmod 600 private/diary.txt", "ls -l private"], "[script-runs]\n"))["diary-private"], false, "typed parts never replace the file check");
  assert.equal((await checks("LNX-105", ["grep toner docs/*"], "[toner-answer]\n"))["toner-answer"], false, "the search must be recursive");
  assert.equal((await checks("LNX-105", ["grep -ri TONER docs"], "[toner-answer]\n"))["toner-answer"], true);
  assert.equal((await checks("LNX-105", ["grep -r toner docs"], ""))["toner-answer"], false, "and the answer must be saved");
});

test("ordered command stages: earliest matches, any order inside a stage, and strict validation", () => {
  assert.equal(typedInOrder(["a", "b", "c"], [/a/, [/c/, /b/]]), true);
  assert.equal(typedInOrder(["b", "a", "c"], [/a/, [/b/, /c/]]), false);
  assert.equal(typedInOrder(["a", "b", "a", "c", "b"], [/a/, [/b/, /c/]]), true, "the first a starts the next stage");
  assert.equal(typedInOrder([], [/a/]), false);
  const lab = (typed, pattern) => ({ ...byId["LNX-101"], milestones: [{ id: "m1", title: "T", description: "D", hint: "H", checkType: "history_regex", ...(pattern ? { pattern } : {}), ...(typed === undefined ? {} : { typed }) }] });
  assert.equal(validateLabDefinition(lab([/a/, [/b/, /c/]])), null);
  assert.equal(validateLabDefinition(lab(undefined, /a/)), null);
  for (const bad of [[], [/a/g], [[]], [[/a/, /b/, /c/, /d/, /e/]], Array(7).fill(/a/), ["ls"], [/a/y], "ls"]) assert.match(validateLabDefinition(lab(bad)), /typed must be/, String(bad));
  assert.match(validateLabDefinition(lab(undefined)), /pattern must be a RegExp/);
  for (const item of labs.flatMap((one) => one.milestones)) if (item.typed) assert.ok(item.typed.flat().every((pattern) => !pattern.global && !pattern.sticky), item.id);
});

test("commands joined on one line count, each history record keeps its own order, and long lines are cut", async () => {
  assert.deepEqual(historyCommands(["cd school/lab/storage && ls; cat key-card.txt", "grep ERROR logs/print.log | wc -l", "true || echo 'a; b && c'", "  "]), ["cd school/lab/storage", "ls", "cat key-card.txt", "grep ERROR logs/print.log | wc -l", "true", "echo 'a; b && c'"]);
  assert.equal((await checks("LNX-101", ["pwd", "ls", "cat school/office/schedule.txt", "cd school/lab/storage && ls && cat key-card.txt"]))["change-folder"], true);
  const made = "[script-runs]\n[report-made]\n[diary-private]\n";
  assert.equal((await checks("LNX-104", ["chmod +x tools/make-report.sh && ls -l tools"], made))["script-runs"], true);
  assert.equal((await checks("LNX-104", ["./tools/make-report.sh; cat tools/report.txt"], made))["report-made"], true);
  assert.equal((await checks("LNX-103", ["head log/visitors.txt; tail -n 3 log/visitors.txt"])).peek, true);
  // The Text terminal's keystrokes and the machine's own history hold the same commands; their order is never mixed.
  const both = async (labId, typed, progress) => Object.fromEntries((await verifySessionMilestones({ labId, commandHistory: typed, sandbox: { history: async () => typed, readFile: async () => progress } })).map((item) => [item.id, item.completed]));
  assert.equal((await both("LNX-104", ["ls -l tools", "chmod +x tools/make-report.sh"], made))["script-runs"], false, "ls -l before chmod, recorded twice, is still not chmod then ls -l");
  assert.equal((await both("LNX-101", ["ls", "cat school/lab/storage/key-card.txt", "cd school/lab/storage"], ""))["change-folder"], false);
  assert.equal((await both("LNX-104", ["chmod +x tools/make-report.sh", "ls -l tools"], made))["script-runs"], true);
  // A very long line is cut before matching and does not stall the check.
  const started = Date.now();
  await checks("LNX-104", [";".repeat(65000), "x".repeat(200000) + " make-report.sh"], made);
  assert.ok(Date.now() - started < 500, "a huge history line is checked quickly");
});

test("a single pattern with the g or y flag is refused, as it would make a step flicker", () => {
  const lab = { ...byId["LNX-101"], milestones: [{ id: "m1", title: "T", description: "D", hint: "H", checkType: "history_regex", pattern: /pwd/g }] };
  assert.match(validateLabDefinition(lab), /must not use the g or y flag/);
  assert.match(validateLabDefinition({ ...lab, milestones: [{ ...lab.milestones[0], pattern: /pwd/y }] }), /must not use the g or y flag/);
});
