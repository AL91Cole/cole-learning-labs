#!/usr/bin/env node
// Generates the real-machine version of every networking, security and coding
// lab from the site's own lab models, so the machine a learner gets always
// matches the lab they opened. Output: terminal-sandbox/generated-labs.js.
//
//   node terminal-sandbox/scripts/generate-labs.mjs          write the file
//   node terminal-sandbox/scripts/generate-labs.mjs --check  fail if it is stale
//
// Each lab gets its own small folder in the learner's home (~/lab):
//   settings labs: README.txt, case/brief.txt, settings.conf, inspect.sh, test.sh
//   coding labs:   README.txt, code/program.py, code/fixtures.txt, code/check.sh
//   every lab:     edit.py, a small line editor (the base image has no nano)
// The device readouts and requirement results for every combination of
// settings are computed here from the simulation and shipped as a compressed
// lookup table keyed by a hash, so the machine shows the same evidence as the
// simulated lab without containing the answers in readable form.
import crypto from "node:crypto";
import zlib from "node:zlib";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SCENARIOS } from "../../src/scenarios.js";
import { supportsExpandedLab, expandedLabSpec, expandedChecks, initialExpandedState, expandedDiagnostic } from "../../src/expanded-labs.js";
import { codingDefinition, codingStarter, supportsCodingLab } from "../../src/coding-lab.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(HERE, "..", "generated-labs.js");
const TRACKS = { network: "Networking & Operating Systems", security: "Ethical Cybersecurity", coding: "Coding" };
/** Labs with a hand-written real-machine version in server.js; left as they are. */
export const HAND_WRITTEN = Object.freeze(["NET-201", "SEC-402", "CODE-501"]);
const SAFE_VALUE = /^[A-Za-z0-9._\/:+,-]+$/;
const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
const sh = (text) => "'" + String(text).replaceAll("'", "'\\''") + "'";
const hash16 = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
/** Lab files are plain ASCII so they read the same in any terminal or editor, whatever its locale. */
const ASCII = { "\u00b7": "-", "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u2192": "->", "\u2190": "<-", "\u00d7": "x", "\u2264": "<=", "\u2265": ">=", "\u00a0": " ", "\u2022": "-", "\u2713": "OK", "\u00b0": " deg" };
export const ascii = (text) => String(text).replace(/[^\x00-\x7f]/g, (character) => ASCII[character] ?? "?");
const wrap = (text, width = 78) => String(text).split("\n").map((line) => {
  const words = line.split(/\s+/), lines = [];
  let current = "";
  for (const word of words) {
    if (current && (current + " " + word).length > width) { lines.push(current); current = word; }
    else current = current ? current + " " + word : word;
  }
  return [...lines, current].join("\n");
}).join("\n");

/** A tiny line editor so learners can change a file without knowing vi. */
export const EDIT_PY = `#!/usr/bin/env python3
"""edit.py: a small line editor for the lab files.

    python3 ~/lab/edit.py FILE

It shows the file with line numbers. Type a line number to change that line,
a to add a line at the end, d NUMBER to delete a line, s to save and quit,
or q to quit without saving."""
import sys

try:
    import readline
except ImportError:  # the editor still works without line recall
    readline = None


def ask(prompt, prefill=""):
    if readline and prefill:
        readline.set_startup_hook(lambda: readline.insert_text(prefill))
    try:
        return input(prompt)
    finally:
        if readline:
            readline.set_startup_hook(None)


def show(lines):
    print()
    for number, line in enumerate(lines, 1):
        print(f"{number:3} | {line}")
    print()


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    name = sys.argv[1]
    try:
        with open(name, encoding="utf-8") as handle:
            lines = handle.read().split("\\n")
        if lines and lines[-1] == "":
            lines.pop()
    except FileNotFoundError:
        lines = []
    changed = False
    show(lines)
    while True:
        try:
            command = input("line number, a = add, d N = delete, s = save, q = quit: ").strip()
        except EOFError:
            command = "q"
        if command == "q":
            if changed and input("Quit without saving? (y/n): ").strip().lower() != "y":
                continue
            return 0
        if command == "s":
            with open(name, "w", encoding="utf-8") as handle:
                handle.write("\\n".join(lines) + "\\n")
            print(f"Saved {name}.")
            return 0
        if command == "a":
            lines.append(ask("new line: "))
            changed = True
            show(lines)
            continue
        if command.startswith("d ") and command[2:].strip().isdigit():
            number = int(command[2:])
            if 1 <= number <= len(lines):
                del lines[number - 1]
                changed = True
                show(lines)
            else:
                print("There is no line with that number.")
            continue
        if command.isdigit() and 1 <= int(command) <= len(lines):
            number = int(command)
            old = lines[number - 1]
            new = ask(f"{number:3} | ", old)
            if not readline and new and not new[0].isspace():
                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation
            lines[number - 1] = new
            changed = True
            show(lines)
            continue
        print("Type a line number from the list, a, d NUMBER, s or q.")


if __name__ == "__main__":
    sys.exit(main())
`;

// ---------------------------------------------------------------------------
// Settings labs: one description per lab, from the simulation or written here.
// ---------------------------------------------------------------------------
const field = (name, label, initial, options) => ({ name, label, initial, options: options.map(([value, text]) => ({ value, label: text })) });

/** The four hand-built simulations, described in the same shape as the expanded labs. */
const ORIGINAL_SPECS = {
  "NET-202": {
    device: "FILE SHARE ACCESS · PROJECT MATERIALS",
    concept: "A share needs the right network path and the least access that does the job.",
    commands: ["show network", "show share", "test teacher access"],
    fields: [
      field("network", "Connected network", "school-guest", [["school-guest", "School-Guest"], ["staff-lab", "Staff-Lab"]]),
      field("folder", "Folder to share", "project-materials", [["all-folders", "All folders"], ["project-materials", "Project Materials"], ["no-folders", "No folders"]]),
      field("permission", "What the teacher can do", "read", [["full-control", "Full control"], ["modify", "Modify"], ["read", "Read"], ["none", "None"]]),
    ],
    checks: (s) => [
      ["Internal share is reachable on Staff-Lab", s.network === "staff-lab"],
      ["Only Project Materials is shared", s.folder === "project-materials"],
      ["Teacher can read without edit or administrator rights", s.network === "staff-lab" && s.folder === "project-materials" && s.permission === "read"],
    ],
    readout: (s, command) => ({
      "show network": `NETWORK\nConnected: ${s.network === "staff-lab" ? "Staff-Lab (internal shares reachable)" : "School-Guest (isolated from internal file shares)"}\nIdentity: teacher-training (verified)`,
      "show share": `SHARE SETTINGS\nShared: ${{ "all-folders": "All folders", "project-materials": "Project Materials", "no-folders": "No folders" }[s.folder]}\nTeacher access: ${{ "full-control": "Full control", modify: "Modify", read: "Read", none: "None" }[s.permission]}\nRequest: read the project handout only.`,
      "test teacher access": s.network !== "staff-lab" ? "ACCESS TEST\nDENY  Guest clients cannot reach internal shares." : s.folder !== "project-materials" ? "ACCESS TEST\nREVIEW  The shared folders do not match the request." : s.permission === "read" ? "ACCESS TEST\nALLOW  Handout opens read-only for teacher-training." : s.permission === "none" ? "ACCESS TEST\nDENY  The teacher has no access to the folder." : "ACCESS TEST\nREVIEW  Handout opens, but the teacher has more access than the request needs.",
    })[command],
  },
  "NET-203": {
    device: "RECOVERY CONSOLE · STUDIO-PC-04",
    concept: "Recover to the last known good state without erasing data, then make sure the service keeps running.",
    commands: ["show boot", "show files", "show service"],
    fields: [
      field("recovery", "Update recovery action", "keep", [["keep", "Keep current update"], ["rollback", "Roll back KB-LAB-17"], ["reset", "Reset and erase files"]]),
      field("status", "School Update service", "stopped", [["stopped", "Stopped"], ["running", "Running"]]),
      field("startup", "How the service starts after a restart", "disabled", [["disabled", "Disabled"], ["manual", "Manual"], ["automatic", "Automatic"]]),
    ],
    checks: (s) => [
      ["OS boots from the last known good update state", s.recovery === "rollback"],
      ["Classroom documents preserved", s.recovery !== "reset"],
      ["Update service is running and starts automatically", s.status === "running" && s.startup === "automatic"],
    ],
    readout: (s, command) => ({
      "show boot": s.recovery === "rollback" ? "BOOT      Classroom desktop loaded after rollback\nSnapshot  Last known good state available" : s.recovery === "reset" ? "BOOT      Fresh desktop loaded after reset\nSnapshot  Last known good state available" : "BOOT-31   Startup blocked after KB-LAB-17\nSnapshot  Last known good state available",
      "show files": s.recovery === "reset" ? "Files     Classroom documents erased" : "Files     Classroom documents intact",
      "show service": `Service   School Update: ${s.status === "running" ? "Running" : "Stopped"} / ${{ disabled: "Disabled", manual: "Manual", automatic: "Automatic" }[s.startup]}`,
    })[command],
  },
  "SEC-401": {
    device: "TRAINING INBOX · 2 MESSAGES",
    concept: "Check the sender, the destination and the pressure in a message before trusting it, and give helpers only the access they need.",
    commands: ["open urgent message", "open routine message", "show checklist access"],
    fields: [
      field("verdict", "Your decision about the urgent message", "unreviewed", [["unreviewed", "Not reviewed yet"], ["safe", "Safe to provide credentials"], ["phishing", "Phishing: report through the approved process"]]),
      field("flag_sender", "Sender domain does not match school IT", "no", [["no", "Not documented"], ["yes", "Documented"]]),
      field("flag_destination", "Destination differs from the school portal", "no", [["no", "Not documented"], ["yes", "Documented"]]),
      field("flag_urgency", "Threatening time limit creates pressure", "no", [["no", "Not documented"], ["yes", "Documented"]]),
      field("permission", "Student helper access to checklist", "administrator", [["administrator", "Administrator"], ["edit-all", "Edit all folders"], ["read-only", "Read only"], ["no-access", "No access"]]),
    ],
    checks: (s) => [
      ["Urgent verification message is reported as phishing", s.verdict === "phishing"],
      ["Sender and destination mismatch are both documented", s.flag_sender === "yes" && s.flag_destination === "yes"],
      ["Urgency is recognized as pressure, not proof", s.flag_urgency === "yes"],
      ["Checklist access is read-only", s.permission === "read-only"],
    ],
    readout: (s, command) => ({
      "open urgent message": "URGENT: verify your account\nFrom: verify@school-account-check.test\nYour access will be deleted in 10 minutes. Verify your school password immediately using the button below.\nButton destination (text only): school-account-check.test/verify\nSchool portal on record: portal.school.test",
      "open routine message": "Tomorrow's lab checklist\nFrom: helpdesk@school.test\nThe troubleshooting checklist is ready. Open it from the class portal using the bookmark provided by your teacher.",
      "show checklist access": `CHECKLIST ACCESS\nStudent helper: ${{ administrator: "Administrator", "edit-all": "Edit all folders", "read-only": "Read only", "no-access": "No access" }[s.permission]}\nTask: the helper only needs to read tomorrow's checklist.`,
    })[command],
  },
  "SEC-403": {
    device: "LEARNDESK · FICTIONAL APP · SESSION learner-101",
    concept: "Permission comes before testing. Show the defect only in the supplied fictional records, then prove the patch allows the owner and denies another learner.",
    commands: ["request record 101", "request record 102", "show access rule"],
    fields: [
      field("scope", "Authorized training scope", "not-acknowledged", [["not-acknowledged", "Not acknowledged"], ["acknowledged", "I will stay within this fictional sandbox"]]),
      field("defect", "Original defect (record 102 opens for learner-101)", "not-reproduced", [["not-reproduced", "Not reproduced yet"], ["reproduced", "Reproduced before patching and recorded"]]),
      field("patch", "Rule for who can read a record", "none", [["none", "Original: signed-in users can access all records"], ["hidden", "Hide other record links in the interface"], ["owner", "Server: require record.owner_id == user.id"]]),
    ],
    checks: (s) => [
      ["Testing stayed within the acknowledged simulation scope", s.scope === "acknowledged"],
      ["Original access-control defect reproduced before patching", s.scope === "acknowledged" && s.defect === "reproduced"],
      ["Record 101 → 200 (own record)", s.patch === "owner"],
      ["Record 102 → 403 (other learner's record)", s.patch === "owner"],
    ],
    readout: (s, command) => s.scope !== "acknowledged" && command !== "show access rule" ? "REQUEST BLOCKED\nAcknowledge the authorized training scope in settings.conf before making a request." : ({
      "request record 101": "GET /records/101   session learner-101\nHTTP 200\n{\"id\":101,\"owner\":\"learner-101\",\"note\":\"Fictional practice record\"}",
      "request record 102": s.patch === "owner" ? "GET /records/102   session learner-101\nHTTP 403\n{\"error\":\"Access denied\"}" : "GET /records/102   session learner-101\nHTTP 200\n{\"id\":102,\"owner\":\"learner-102\",\"note\":\"Another learner's fictional record\"}" + (s.patch === "hidden" ? "\n(The link is hidden in the page, but the server still answers.)" : ""),
      "show access rule": `ACCESS RULE\n${{ none: "Any signed-in user can receive any record.", hidden: "The page hides other record links; the server makes no ownership check.", owner: "Server checks record.owner_id == user.id before answering." }[s.patch]}`,
    })[command],
  },
};

function settingsSpec(scenario) {
  if (ORIGINAL_SPECS[scenario.id]) {
    const spec = ORIGINAL_SPECS[scenario.id];
    return { ...spec, checks: (state) => spec.checks(state).map(([label, ok]) => ({ label, ok: Boolean(ok) })) };
  }
  if (!supportsExpandedLab(scenario.id)) return null;
  const spec = expandedLabSpec(scenario.id), base = initialExpandedState(scenario.id);
  // Some network labs start with cables unplugged on the bench. On the machine
  // that is one more setting: the cables are either still unplugged or reseated.
  const unplugged = base.networkBench?.disconnected ?? [];
  const fields = unplugged.length ? [field("cables", `Network cables on the bench (${unplugged.length} unplugged at the start)`, "unplugged", [["unplugged", "Leave as found"], ["reseated", "Reseat every unplugged cable"]]), ...spec.fields] : spec.fields;
  const full = ({ cables, ...state }) => ({ ...base, ...state, ...(unplugged.length ? { networkBench: { ...base.networkBench, disconnected: cables === "reseated" ? [] : unplugged } } : {}) });
  return {
    ...spec,
    fields,
    checks: (state) => expandedChecks(scenario.id, { ...full(state), tested: true }),
    readout: (state, command) => String(expandedDiagnostic(scenario.id, full(state), command)),
  };
}

function combinations(fields) {
  let states = [{}];
  for (const item of fields) states = states.flatMap((state) => item.options.map((option) => ({ ...state, [item.name]: option.value })));
  return states;
}
const canonical = (fields, state) => fields.map((item) => `${item.name}=${state[item.name]};`).join("");

function caseBrief(scenario) {
  const lines = [`${scenario.id} · ${scenario.title}`, "", `Requested by: ${scenario.requester}`, "", "THE REQUEST", wrap(scenario.brief), "", "GOAL", wrap(scenario.goal), ""];
  if (Array.isArray(scenario.clues) && scenario.clues.length) {
    lines.push("WHAT IS KNOWN");
    for (const clue of scenario.clues) lines.push(wrap(`- ${clue.label}: ${clue.text}`));
    lines.push("");
  }
  if (Array.isArray(scenario.questions) && scenario.questions.length) {
    lines.push("QUESTIONS ALREADY ANSWERED");
    for (const item of scenario.questions) lines.push(wrap(`- ${item.label} ${item.answer}`));
    lines.push("");
  }
  lines.push("Everything in this lab is fictional practice data on an isolated machine.", "");
  return lines.join("\n");
}

const SCRIPT_HEAD = (fields) => `cd "$(dirname "$0")" || exit 1
FIELDS=${sh(fields.map((item) => item.name).join(" "))}
value() { grep -E "^$1=" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }
state=""
for name in $FIELDS; do state="$state$name=$(value "$name");"; done
key() { printf '%s' "$1" | sha256sum | cut -c1-16; }
lookup() { zcat .lab-data.gz | awk -F'\\t' -v k="$(key "$1")" '$1 == k { print $2 }'; }
unknown() {
  echo "settings.conf has a value that is not one of the allowed values."
  echo "Each setting lists its allowed values in the comment above it. Current values:"
  for name in $FIELDS; do echo "  $name=$(value "$name")"; done
}
`;

function settingsLab(scenario) {
  const spec = settingsSpec(scenario);
  if (!spec) return null;
  const { fields, commands } = spec;
  for (const item of fields) {
    if (!SAFE_NAME.test(item.name)) throw new Error(`${scenario.id}: unsafe setting name ${item.name}`);
    for (const option of item.options) if (!SAFE_VALUE.test(option.value)) throw new Error(`${scenario.id}: unsafe value ${option.value}`);
    if (!item.options.some((option) => option.value === item.initial)) throw new Error(`${scenario.id}: ${item.name} starts outside its options`);
  }
  const all = combinations(fields);
  const solved = all.filter((state) => spec.checks(state).every((row) => row.ok));
  if (solved.length !== 1) throw new Error(`${scenario.id}: expected exactly one solving combination, found ${solved.length}`);
  const initial = Object.fromEntries(fields.map((item) => [item.name, item.initial]));
  const labels = spec.checks(initial).map((row) => row.label);
  if (spec.checks(initial).every((row) => row.ok)) throw new Error(`${scenario.id}: the starting state already passes`);

  const rows = new Map();
  for (const state of all) {
    const text = canonical(fields, state);
    rows.set(hash16("T|" + text), spec.checks(state).map((row) => (row.ok ? "1" : "0")).join(" "));
    commands.forEach((command, index) => {
      const readout = ascii(spec.readout(state, command) ?? "No readout is available.").replaceAll("\\", "\\\\").replaceAll("\t", " ").replaceAll("\r", "").replaceAll("\n", "\\n");
      rows.set(hash16(`R|${index + 1}|${text}`), readout);
    });
  }
  if (rows.size !== all.length * (commands.length + 1)) throw new Error(`${scenario.id}: lookup keys collide`);
  const table = [...rows].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, value]) => `${key}\t${value}`).join("\n") + "\n";
  const data = zlib.gzipSync(Buffer.from(table, "utf8"), { level: 9, mtime: 0 });

  const settings = [`# ${spec.device}`, "#", "# Change the value after the = sign on a setting line. The comment above each", "# setting lists the values it accepts. Lines that start with # are notes.", "#", "#   python3 edit.py settings.conf     change a line", "#   sh inspect.sh                    list the device readouts", "#   sh test.sh                       check every requirement", ""];
  for (const item of fields) {
    settings.push(`# ${item.label}`);
    for (const option of item.options) settings.push(`#    ${option.value.padEnd(Math.max(...item.options.map((o) => o.value.length)))}   ${option.label}`);
    settings.push(`${item.name}=${item.initial}`, "");
  }

  const inspect = `#!/bin/sh
# Shows a device readout for the settings saved in settings.conf right now.
${SCRIPT_HEAD(fields)}case "$*" in
${commands.map((command, index) => `  ${index + 1}|${sh(command)}) n=${index + 1} ;;`).join("\n")}
  *)
    echo "Device readouts for this lab (they follow settings.conf):"
${commands.map((command, index) => `    echo ${sh(`  sh inspect.sh ${index + 1}    ${command}`)}`).join("\n")}
    exit 0 ;;
esac
text=$(lookup "R|$n|$state")
if [ -n "$text" ]; then printf '%b\\n' "$text"; else unknown; fi
`;

  const test = `#!/bin/sh
# Checks settings.conf against every requirement of this lab and records the
# result in results.txt. Run it again after each change.
${SCRIPT_HEAD(fields)}: > results.txt
flags=$(lookup "T|$state")
if [ -z "$flags" ]; then unknown | tee -a results.txt; exit 1; fi
i=0; pass=0; total=0
while IFS= read -r label; do
  i=$((i + 1)); total=$((total + 1))
  if [ "$(echo "$flags" | cut -d' ' -f$i)" = 1 ]; then line="PASS   $label"; pass=$((pass + 1)); else line="CHECK  $label"; fi
  echo "$line"; echo "$line" >> results.txt
done <<'LAB_REQUIREMENTS'
${labels.join("\n")}
LAB_REQUIREMENTS
if [ "$pass" = "$total" ]; then line="ALL_CHECKS_PASS"; else line="$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again."; fi
echo "$line"; echo "$line" >> results.txt
`;

  const readme = [`${scenario.id} · ${scenario.title}`, "", wrap(scenario.goal), "", "This is a real Linux machine with no network. The device in this lab is", "described by the file settings.conf; the readouts and the test follow it.", "", "FILES", "  case/brief.txt   the request, what is known, and answered questions", "  settings.conf    the settings you can change", "  inspect.sh       device readouts for the saved settings", "  test.sh          checks every requirement and writes results.txt", "  edit.py          a small editor:  python3 edit.py settings.conf", "", "WHAT TO DO", "  1. cat case/brief.txt", "  2. cat settings.conf        then    sh inspect.sh", "  3. Change a setting, inspect again, and run   sh test.sh", "  4. Repeat until test.sh prints ALL_CHECKS_PASS.", ""].join("\n");

  const solution = solved[0];
  const markdown = [`# ${scenario.id} · ${scenario.title}`, "", `> **Lab Brief:** *${scenario.brief.replaceAll("*", "")}*`, "", "## Your machine", "", "A real Linux machine with no network. The lab files are in `~/lab`.", "", "## Step-by-Step Instructions", "", "### Step 1: Read the case", "```sh", "cd ~/lab && cat README.txt case/brief.txt", "```", "", "### Step 2: Inspect the settings and the device readouts", "```sh", "cat settings.conf", "sh inspect.sh", "```", "", "### Step 3: Change a setting and test", "```sh", "python3 edit.py settings.conf", "sh test.sh", "```", "", "Repeat until `sh test.sh` prints `ALL_CHECKS_PASS`.", ""].join("\n");
  return {
    id: scenario.id,
    title: `${scenario.title} (real machine)`,
    track: TRACKS[scenario.track],
    grade: `Grades ${scenario.grade}`,
    minutes: scenario.minutes,
    summary: scenario.summary,
    markdown,
    milestones: [
      { id: "m1-read-case", title: "Read the case", description: "Open the request and what is known before changing anything.", hint: "Run: `cat ~/lab/case/brief.txt`", checkType: "history_regex", patternSource: "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)" },
      { id: "m2-inspect", title: "Inspect the settings and a device readout", description: "Read settings.conf and run at least one readout.", hint: "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`", checkType: "history_regex", patternSource: "sh\\s+.*inspect\\.sh\\s+\\S" },
      { id: "m3-settings", title: "Every setting meets the request", description: "Change settings.conf so each requirement in the case is met.", hint: "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.", checkType: "file_contains_all", filePath: "/home/learner/lab/settings.conf", expectedSubstrings: fields.map((item) => `${item.name}=${solution[item.name]}`) },
      { id: "m4-test", title: "The full test passes", description: "Run the test after your last change until every requirement passes.", hint: "Run: `cd ~/lab && sh test.sh`", checkType: "file_contains", filePath: "/home/learner/lab/results.txt", expectedSubstring: "ALL_CHECKS_PASS" },
    ],
    files: [
      { path: "README.txt", content: readme },
      { path: "case/brief.txt", content: caseBrief(scenario) },
      { path: "settings.conf", content: settings.join("\n") },
      { path: "inspect.sh", mode: 0o755, content: inspect },
      { path: "test.sh", mode: 0o755, content: test },
      { path: "edit.py", mode: 0o755, content: EDIT_PY },
      { path: ".lab-data.gz", encoding: "base64", content: data.toString("base64") },
    ],
  };
}

// ---------------------------------------------------------------------------
// Coding labs: the same starter program and fixtures as the site, in real Python.
// ---------------------------------------------------------------------------
function codingLab(scenario) {
  if (!supportsCodingLab(scenario.id)) return null;
  const definition = codingDefinition(scenario.id), starter = codingStarter(scenario.id, "python");
  if (!SAFE_NAME.test(definition.input)) throw new Error(`${scenario.id}: unsafe input name`);
  const cases = definition.values.map((value) => ({ value, expected: definition.expected(value).map(String) }));
  const program = `import sys\n\n# ${scenario.id}: ${scenario.goal}\n# The input arrives as the first command-line argument.\n${definition.input} = int(sys.argv[1]) if len(sys.argv) > 1 else ${cases[0].value}\n\n${starter.trimEnd()}\n`;
  const fixtures = [`Input variable: ${definition.input} (first command-line argument)`, ...cases.map((item) => `${definition.input} = ${item.value}  ->  expected: ${item.expected.join(" | ")}`), ""].join("\n");
  const check = `#!/bin/sh
# Runs program.py against every fixture and records the result in results.txt.
cd "$(dirname "$0")" || exit 1
pass=0; total=0; : > results.txt
while IFS='|' read -r input want; do
  total=$((total + 1))
  got=$(python3 program.py "$input" 2>&1 | tr '\\n' ';')
  if [ "$got" = "$want" ]; then line="PASS ${definition.input}=$input"; pass=$((pass + 1)); else line="FAIL ${definition.input}=$input -> got: $got expected: $want"; fi
  echo "$line"; echo "$line" >> results.txt
done <<'LAB_FIXTURES'
${cases.map((item) => `${item.value}|${item.expected.map((line) => line + ";").join("")}`).join("\n")}
LAB_FIXTURES
if [ "$pass" = "$total" ]; then line="ALL_FIXTURES_PASS"; else line="$pass of $total fixtures pass"; fi
echo "$line"; echo "$line" >> results.txt
`;
  const readme = [`${scenario.id} · ${scenario.title}`, "", wrap(scenario.goal), "", "This is a real Linux machine with Python 3 and no network.", "", "FILES", "  code/program.py     the starter program (it has a defect)", "  code/fixtures.txt   each input and the output it must produce", "  code/check.sh       runs every fixture and writes code/results.txt", "  edit.py             a small editor:  python3 ~/lab/edit.py program.py", "", "WHAT TO DO", "  1. cd ~/lab/code && cat program.py fixtures.txt", `  2. python3 program.py ${cases[0].value}`, "  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)", "  4. sh check.sh    until it prints ALL_FIXTURES_PASS", ""].join("\n");
  const markdown = [`# ${scenario.id} · ${scenario.title}`, "", `> **Lab Brief:** *${scenario.brief.replaceAll("*", "")}*`, "", "## Your machine", "", "A real Linux machine with Python 3 and no network. The lab files are in `~/lab/code`.", "", "## Step-by-Step Instructions", "", "### Step 1: Read the program and its fixtures", "```sh", "cd ~/lab/code && cat program.py fixtures.txt", "```", "", "### Step 2: Run it with one input", "```sh", `python3 program.py ${cases[0].value}`, "```", "", "### Step 3: Fix the program and run every fixture", "```sh", "python3 ~/lab/edit.py program.py", "sh check.sh", "```", ""].join("\n");
  return {
    id: scenario.id,
    title: `${scenario.title} (real Python)`,
    track: TRACKS[scenario.track],
    grade: `Grades ${scenario.grade}`,
    minutes: scenario.minutes,
    summary: scenario.summary,
    markdown,
    milestones: [
      { id: "m1-read-program", title: "Read program.py", description: "Open the program before changing it.", hint: "Run: `cat ~/lab/code/program.py`", checkType: "history_regex", patternSource: "(?:cat|less|head|more)\\s+.*program\\.py|edit\\.py\\s+.*program\\.py" },
      { id: "m2-run-program", title: "Run program.py with one input", description: "Run the program with python3 and one input value.", hint: `Run: \`python3 ~/lab/code/program.py ${cases[0].value}\``, checkType: "history_regex", patternSource: "python3?\\s+(?!.*edit\\.py).*program\\.py" },
      { id: "m3-fixtures-pass", title: "Every fixture passes (check.sh)", description: "Fix the program so check.sh writes ALL_FIXTURES_PASS to ~/lab/code/results.txt.", hint: "Compare fixtures.txt with what the program prints, change one line with `python3 ~/lab/edit.py program.py`, then run `sh check.sh` in ~/lab/code.", checkType: "file_contains", filePath: "/home/learner/lab/code/results.txt", expectedSubstring: "ALL_FIXTURES_PASS" },
    ],
    files: [
      { path: "README.txt", content: readme },
      { path: "code/program.py", content: program },
      { path: "code/fixtures.txt", content: fixtures },
      { path: "code/check.sh", mode: 0o755, content: check },
      { path: "edit.py", mode: 0o755, content: EDIT_PY },
    ],
  };
}

export function generateLabs() {
  const labs = {};
  for (const scenario of SCENARIOS) {
    if (!TRACKS[scenario.track] || HAND_WRITTEN.includes(scenario.id)) continue;
    const lab = scenario.track === "coding" ? codingLab(scenario) : settingsLab(scenario);
    if (!lab) throw new Error(`${scenario.id}: no real-machine version could be generated`);
    lab.files = lab.files.map((file) => (file.encoding === "base64" ? file : { ...file, content: ascii(file.content) }));
    labs[lab.id] = lab;
  }
  return labs;
}

export function renderModule(labs) {
  return `// GENERATED FILE. Do not edit by hand.
// Source: terminal-sandbox/scripts/generate-labs.mjs, from the site's lab models.
// Regenerate with: node terminal-sandbox/scripts/generate-labs.mjs
const DATA = ${JSON.stringify(labs, null, 1)};

/** Real-machine lab definitions keyed by lab id, with RegExp patterns restored. */
export function generatedLabs() {
  return Object.fromEntries(Object.entries(DATA).map(([id, lab]) => [id, {
    ...lab,
    milestones: lab.milestones.map(({ patternSource, ...item }) => (patternSource ? { ...item, pattern: new RegExp(patternSource, "i") } : item)),
    files: lab.files.map((file) => ({ ...file })),
  }]));
}
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = renderModule(generateLabs());
  if (process.argv.includes("--check")) {
    const current = (() => { try { return readFileSync(OUTPUT, "utf8"); } catch { return ""; } })();
    if (current !== source) { console.error("generated-labs.js is stale. Run: node terminal-sandbox/scripts/generate-labs.mjs"); process.exit(1); }
    console.log("generated-labs.js is up to date.");
  } else {
    writeFileSync(OUTPUT, source);
    console.log(`Wrote ${Object.keys(generateLabs()).length} real-machine labs to ${path.relative(process.cwd(), OUTPUT)} (${source.length} bytes).`);
  }
}
