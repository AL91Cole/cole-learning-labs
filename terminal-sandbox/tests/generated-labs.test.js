import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { generatedLabs } from "../generated-labs.js";
import { generateLabs, renderModule, HAND_WRITTEN } from "../scripts/generate-labs.mjs";
import { SCENARIOS } from "../../src/scenarios.js";
import { codingDemonstration } from "../../src/lab-guide.js";

const labs = generatedLabs();
const run = (cwd, command, args) => {
  try {
    return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 });
  } catch (error) {
    return String(error.stdout || "") + String(error.stderr || "");
  }
};
function materialize(lab) {
  const root = mkdtempSync(path.join(os.tmpdir(), "cll-lab-"));
  for (const file of lab.files) {
    const target = path.join(root, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content);
    chmodSync(target, file.mode ?? 0o644);
  }
  return root;
}

test("the generated file is current and covers every networking, security and coding lab", () => {
  assert.equal(readFileSync(new URL("../generated-labs.js", import.meta.url), "utf8"), renderModule(generateLabs()), "run: node terminal-sandbox/scripts/generate-labs.mjs");
  const wanted = SCENARIOS.filter((s) => ["network", "security", "coding"].includes(s.track)).map((s) => s.id);
  assert.deepEqual([...Object.keys(labs), ...HAND_WRITTEN].sort(), [...wanted].sort());
  assert.equal(Object.keys(labs).length, 25);
});

test("every generated lab is small, self-contained and uses only safe relative paths", () => {
  for (const lab of Object.values(labs)) {
    assert.match(lab.id, /^[A-Z]{2,5}-\d{3}$/);
    assert.ok(lab.markdown.length < 20000 && lab.title.length <= 300 && lab.summary.length <= 300, lab.id);
    assert.ok(lab.milestones.length >= 3 && lab.milestones.length <= 20, lab.id);
    for (const item of lab.milestones) {
      if (item.checkType === "history_regex") assert.ok(item.pattern instanceof RegExp, lab.id + "/" + item.id);
      else assert.ok(item.filePath.startsWith("/home/learner/lab/"), lab.id + "/" + item.id);
    }
    const bytes = lab.files.reduce((sum, file) => sum + file.content.length, 0);
    assert.ok(bytes < 60000, `${lab.id}: ${bytes} bytes must fit in one seed command`);
    for (const file of lab.files) {
      assert.match(file.path, /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/, lab.id);
      assert.ok(!file.path.split("/").includes(".."), lab.id);
      assert.ok([undefined, 0o644, 0o755].includes(file.mode), lab.id);
    }
    assert.ok(lab.files.some((file) => file.path === "edit.py"), lab.id + " ships the line editor");
    for (const file of lab.files) if (file.encoding !== "base64") assert.ok(!/[^\x00-\x7f]/.test(file.content), `${lab.id}/${file.path} is plain ASCII, so it reads the same in any terminal`);
  }
});

test("settings labs fail at the start, show live readouts, and pass only with the solving settings", () => {
  for (const lab of Object.values(labs).filter((item) => item.files.some((file) => file.path === "settings.conf"))) {
    const root = materialize(lab);
    try {
      const first = run(root, "sh", ["test.sh"]);
      assert.ok(!first.includes("ALL_CHECKS_PASS"), lab.id + " must not pass as seeded");
      assert.match(first, /CHECK  /, lab.id);
      assert.match(run(root, "sh", ["inspect.sh"]), /sh inspect\.sh 1/, lab.id + " lists its readouts");
      const before = run(root, "sh", ["inspect.sh", "1"]);
      assert.ok(before.trim().length > 10 && !before.includes("not one of the allowed values"), lab.id + " readout 1");

      const settings = path.join(root, "settings.conf");
      const original = readFileSync(settings, "utf8");
      const wanted = lab.milestones.find((item) => item.checkType === "file_contains_all").expectedSubstrings;
      for (const pair of wanted) assert.ok(!original.split("\n").filter((line) => line.startsWith("#")).some((line) => line.includes(pair)), lab.id + ": the answer is not in a comment");
      let solved = original;
      for (const pair of wanted) solved = solved.replace(new RegExp("^" + pair.split("=")[0] + "=.*$", "m"), pair);
      writeFileSync(settings, solved);
      const last = run(root, "sh", ["test.sh"]);
      assert.match(last, /ALL_CHECKS_PASS/, lab.id + " passes with the solving settings:\n" + last);
      assert.ok(!last.includes("CHECK  "), lab.id);
      assert.match(readFileSync(path.join(root, "results.txt"), "utf8"), /ALL_CHECKS_PASS/, lab.id);
      for (const pair of wanted) assert.ok(solved.includes(pair), lab.id);

      writeFileSync(settings, solved.replace(/^([A-Za-z_]+)=.*$/m, "$1=not-a-real-option"));
      assert.match(run(root, "sh", ["test.sh"]), /not one of the allowed values/, lab.id + " explains an unknown value");
      assert.ok(!readFileSync(path.join(root, "results.txt"), "utf8").includes("ALL_CHECKS_PASS"), lab.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("coding labs run real Python, fail with the starter and pass with the documented fix", () => {
  for (const lab of Object.values(labs).filter((item) => item.files.some((file) => file.path === "code/program.py"))) {
    const root = materialize(lab), code = path.join(root, "code");
    try {
      const first = run(code, "sh", ["check.sh"]);
      assert.match(first, /FAIL /, lab.id + " starter must fail a fixture");
      assert.ok(!first.includes("ALL_FIXTURES_PASS"), lab.id);
      const fix = codingDemonstration(lab.id, "python"), program = path.join(code, "program.py");
      const source = readFileSync(program, "utf8");
      assert.ok(source.includes(fix.from), lab.id + " contains the line the guide says to change");
      writeFileSync(program, source.replace(fix.from, fix.to));
      const last = run(code, "sh", ["check.sh"]);
      assert.match(last, /ALL_FIXTURES_PASS/, lab.id + " passes with the documented fix:\n" + last);
      assert.match(readFileSync(path.join(code, "results.txt"), "utf8"), /ALL_FIXTURES_PASS/, lab.id);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("the line editor changes, adds and deletes lines and saves", () => {
  const root = materialize(Object.values(labs)[0]);
  try {
    writeFileSync(path.join(root, "note.txt"), "one\ntwo\nthree\n");
    const out = execFileSync("python3", ["edit.py", "note.txt"], { cwd: root, encoding: "utf8", input: "2\nTWO\nd 3\na\nfour\ns\n" });
    assert.match(out, /Saved note\.txt/);
    assert.equal(readFileSync(path.join(root, "note.txt"), "utf8"), "one\nTWO\nfour\n");
    writeFileSync(path.join(root, "keep.txt"), "same\n");
    execFileSync("python3", ["edit.py", "keep.txt"], { cwd: root, encoding: "utf8", input: "q\n" });
    assert.equal(readFileSync(path.join(root, "keep.txt"), "utf8"), "same\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
