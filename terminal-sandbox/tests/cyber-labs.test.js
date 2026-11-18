import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { cyberLabs, literal, SIGNIN_LOG, SIGNIN_FACTS, COUNT_SCRIPT } from "../cyber-labs.js";
import { linuxLabs } from "../linux-labs.js";
import { labFor, validateLabDefinition, verifySessionMilestones } from "../server.js";
import { PROGRESS_CHECK, PROGRESS_FILE } from "../cloud-sandboxes.js";

const labs = cyberLabs();
const byId = Object.fromEntries(labs.map((lab) => [lab.id, lab]));

/** Writes a lab's files the way the seed script does, with the checker moved out of the lab folder. */
function materialize(lab) {
  const home = mkdtempSync(path.join(os.tmpdir(), "cll-cyber-")), root = path.join(home, "lab");
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
async function checks(labId, history, progress = "") {
  const result = await verifySessionMilestones({ labId, commandHistory: [], sandbox: { history: async () => history, readFile: async () => progress } });
  return Object.fromEntries(result.map((item) => [item.id, item.completed]));
}

// The commands each step teaches, typed in order (`history`), and the changes
// the learner makes to the files (`run`, which the progress checker sees).
const SOLUTIONS = {
  "CYB-101": { history: ["id", "ls -l club", "chmod 640 club/roster.txt", "ls -l club"], run: ["chmod 640 club/roster.txt", "wc -l club/roster.txt > club/headcount.txt", "rm club/shared-password.txt"] },
  "CYB-102": { history: ["cat note.txt", "tr 'A-Z' 'T-ZA-S' < note.txt > decoded.txt", "cat decoded.txt", "sha256sum rules/rules-board.txt rules/rules-hall.txt", "echo hello | sha256sum", "echo hellp | sha256sum", "cd rules", "sha256sum -c posted.sha256"], run: ["tr 'A-Z' 'T-ZA-S' < note.txt > decoded.txt", "printf 'key: 7\\nunchanged copy: rules-board.txt\\n' > answer.txt"] },
  "CYB-103": { history: ["head logs/signin.log", "grep FAILED logs/signin.log", "grep -c FAILED logs/signin.log", "grep FAILED logs/signin.log | cut -d' ' -f2 | sort | uniq -c", "grep 'user=adviser ' logs/signin.log"], run: ["printf 'failed: 11\\naccount: adviser\\naddress: 10.20.9.50\\nsuccess time: 13:10\\n' > answer.txt"] },
  "CYB-104": { history: ["cat count_failures.py", "python3 count_failures.py"], run: ["sed -i 's/^account = \"mia\"/account = \"adviser\"/; s/^limit = 20/limit = 5/' count_failures.py", "python3 count_failures.py > report.txt"] },
};

test("four cyber field labs are registered, valid, small and kept apart from Linux basics", () => {
  assert.deepEqual(labs.map((lab) => lab.id), ["CYB-101", "CYB-102", "CYB-103", "CYB-104"]);
  assert.ok(linuxLabs().every((lab) => lab.track === "Linux Basics" && lab.grade === "Grades 7–12"), "the shared builder keeps the Linux basics labels");
  for (const lab of labs) {
    assert.equal(validateLabDefinition(lab), null, lab.id);
    assert.equal(labFor(lab.id)?.title, lab.title);
    assert.equal(lab.track, "Cyber Field Labs");
    assert.equal(lab.grade, "Grades 7–8");
    assert.ok(lab.minutes <= 20, lab.id + " fits inside a 40-minute lesson");
    assert.ok(lab.milestones.length >= 5 && lab.milestones.length <= 6, lab.id);
    assert.ok(lab.files.reduce((sum, file) => sum + file.content.length, 0) < 20000, lab.id + " seeds in one short command");
    assert.ok(lab.files.some((file) => file.path === "README.txt") && lab.files.some((file) => file.path === PROGRESS_CHECK), lab.id);
    for (const file of lab.files) assert.ok(!/[^\x00-\x7f]/.test(file.content), `${lab.id}/${file.path} is plain ASCII`);
    for (const step of lab.milestones) {
      assert.ok(step.title.length <= 60 && step.description.length <= 400 && step.hint.length <= 400, lab.id + "/" + step.id);
      if (step.checkType === "file_contains") assert.equal(step.filePath, PROGRESS_FILE, lab.id + "/" + step.id);
    }
    const all = tokens(lab);
    for (const token of all) assert.equal(all.filter((other) => other.includes(token)).length, 1, lab.id + ": " + token);
    const readme = lab.files.find((file) => file.path === "README.txt").content;
    for (const step of lab.milestones) assert.ok(readme.includes(step.title), lab.id + " README lists " + step.title);
    assert.ok(!readme.includes("`"), lab.id + " README is plain text");
  }
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
    } finally {
      box.done();
    }
  }
});

test("the real tools give the answers the labs and the course handouts quote", () => {
  let box = materialize(byId["CYB-101"]);
  try {
    assert.equal(box.sh("ls -l club/roster.txt").slice(1, 10), "rw-r--r--", "the roster starts readable by everyone");
    assert.equal(box.sh("wc -l < club/roster.txt").trim(), "18");
    box.sh("chmod 600 club/roster.txt; cp club/roster.txt club/headcount.txt; rm -r club/job-list.txt");
    const out = box.progress();
    assert.ok(!out.includes("[roster-locked]"), "the co-chair group still needs to read the roster");
    assert.ok(!out.includes("[head-count]"), "copying the names is not a head count");
    assert.ok(!out.includes("[password-note-gone]"), "deleting other files is not the task");
  } finally { box.done(); }

  box = materialize(byId["CYB-102"]);
  try {
    assert.equal(box.sh("tr 'A-Z' 'T-ZA-S' < note.txt").trim(), "THE HUNT STARTS AT THE GYM DOOR");
    assert.match(box.sh("cd rules && sha256sum -c posted.sha256"), /^rules-board\.txt: OK$/m);
    const [board, hall] = box.sh("sha256sum rules/rules-board.txt rules/rules-hall.txt").trim().split("\n").map((line) => line.split(/\s+/)[0]);
    assert.equal(board, readFileSync(path.join(box.root, "rules/posted.sha256"), "utf8").split(/\s+/)[0]);
    assert.notEqual(board, hall);
    assert.ok([...board].filter((character, index) => character === hall[index]).length < 16, "the two fingerprints share almost nothing");
    box.sh("printf 'key: 7\\nunchanged copy: rules-hall.txt\\n' > answer.txt");
    assert.ok(!box.progress().includes("[answers]"), "the changed copy is not accepted");
  } finally { box.done(); }

  box = materialize(byId["CYB-103"]);
  try {
    assert.equal(box.sh("wc -l < logs/signin.log").trim(), String(SIGNIN_FACTS.lines));
    assert.equal(box.sh("grep -c FAILED logs/signin.log").trim(), "11");
    assert.equal(box.sh("grep FAILED logs/signin.log | cut -d' ' -f2 | sort | uniq -c | sort -n | tail -n 1").trim(), "8 user=adviser");
    const adviser = box.sh("grep 'user=adviser ' logs/signin.log").trim().split("\n");
    const firstOkAfterFailures = adviser.slice(adviser.findIndex((line) => line.includes("FAILED"))).find((line) => line.includes("result=OK"));
    assert.ok(firstOkAfterFailures.startsWith(SIGNIN_FACTS.success) && firstOkAfterFailures.endsWith("from=" + SIGNIN_FACTS.address));
    assert.ok(SIGNIN_LOG.every((line, index) => index === 0 || line.slice(0, 8) > SIGNIN_LOG[index - 1].slice(0, 8)), "the log is in time order");
    assert.ok(SIGNIN_LOG.every((line) => /from=10\.\d+\.\d+\.\d+$/.test(line)), "every address is in a private range");
    box.sh("printf 'failed: 8\\naccount: adviser\\naddress: 10.20.9.50\\nsuccess time: 13:02\\n' > answer.txt");
    assert.equal(box.progress().trim(), "", "one account's failures are not the whole count, and 13:02 came before the burst");
  } finally { box.done(); }

  box = materialize(byId["CYB-104"]);
  try {
    assert.equal(readFileSync(path.join(box.root, "count_failures.py"), "utf8"), COUNT_SCRIPT);
    assert.equal(box.sh("python3 count_failures.py"), "mia failed 1 times\n", "the unchanged script stays quiet");
    box.sh("sed -i 's/^account = \"mia\"/account = \"adviser\"/' count_failures.py && python3 count_failures.py > report.txt");
    let out = box.progress();
    assert.ok(out.includes("[account-set]") && !out.includes("[limit-set]") && !out.includes("[report]"), "no alert below the limit");
    box.sh("sed -i 's/^limit = 20/limit = 5/' count_failures.py && python3 count_failures.py > report.txt");
    assert.equal(readFileSync(path.join(box.root, "report.txt"), "utf8"), "adviser failed 8 times\nALERT: tell the adviser about adviser\n");
    out = box.progress();
    assert.ok(out.includes("[limit-set]") && out.includes("[report]"));
  } finally { box.done(); }
});

test("typed steps do not pass on unrelated commands", () => {
  const stage = (lab, id) => { const step = byId[lab].milestones.find((item) => item.id === id); return step.pattern || step.typed.flat(); };
  assert.ok(stage("CYB-101", "read-letters").test("ls -la club") && !stage("CYB-101", "read-letters").test("ls club"));
  assert.ok(stage("CYB-102", "fingerprints").test("sha256sum rules/rules-hall.txt") && !stage("CYB-102", "fingerprints").test("sha256sum note.txt"));
  const [hello, other] = stage("CYB-102", "one-letter");
  assert.ok(hello.test("echo hello | sha256sum") && !other.test("echo hello | sha256sum") && other.test("echo hellp | sha256sum"));
  assert.ok(stage("CYB-103", "count").test("grep FAILED logs/signin.log | wc -l") && !stage("CYB-103", "count").test("grep FAILED logs/signin.log"));
  assert.ok(stage("CYB-103", "by-account").test("grep FAILED logs/signin.log | cut -d' ' -f2 | sort | uniq -c") && !stage("CYB-103", "by-account").test("sort logs/signin.log"));
  assert.ok(stage("CYB-104", "run").test("python3 count_failures.py") && !stage("CYB-104", "run").test("cat count_failures.py"));
});

test("text placed in a check pattern is fully escaped, the backslash included", () => {
  assert.equal(literal("10.20.9.50"), "10\\.20\\.9\\.50");
  assert.equal(literal("a\\b.c"), "a\\\\b\\.c");
  for (const text of ["count_failures.py", "a\\b", "x+y(z)[1]{2}|^$*?", "rules/posted.sha256"]) {
    const pattern = new RegExp("^" + literal(text) + "$");
    assert.ok(pattern.test(text), text);
    assert.ok(!pattern.test(text.replace(/[.]/, "x")) || !text.includes("."), "a dot matches only a dot: " + text);
  }
  const check = byId["CYB-103"].files.find((file) => file.path === PROGRESS_CHECK).content;
  assert.ok(check.includes("10\\.20\\.9\\.50"), "the address check matches the dots literally");
  const box = materialize(byId["CYB-103"]);
  try {
    box.sh("printf 'failed: 11\\naccount: adviser\\naddress: 10x20y9z50\\nsuccess time: 13:10\\n' > answer.txt");
    assert.ok(!box.progress().includes("[burst]"), "an address with other characters in place of the dots is refused");
  } finally { box.done(); }
});
