/** Separate, disabled-by-default Docker terminal service. No host-shell or simulated fallback. */
import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readdirSync, statSync } from "node:fs";
import { WebSocketServer, WebSocket as UpstreamWebSocket } from "ws";
import {
  cloudConfiguration,
  cloudConfigurationProblems,
  spawnCloudSandbox,
  buildSeedScript,
  seedFromLabFiles,
  CLOUD_SIZES,
} from "./cloud-sandboxes.js";
import { generatedLabs } from "./generated-labs.js";
import { linuxLabs } from "./linux-labs.js";

const execFileAsync = promisify(execFile),
  ROOT = path.dirname(fileURLToPath(import.meta.url));
const integer = (value, fallback, min, max) =>
  Number.isInteger(Number(value)) &&
  Number(value) >= min &&
  Number(value) <= max
    ? Number(value)
    : fallback;
const loopback = (address) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
export function configuration(env = process.env) {
  return {
    enabled: env.SANDBOX_ENABLED === "true",
    host: env.HOST || "127.0.0.1",
    port: integer(env.PORT, 8080, 1, 65535),
    teacherKey: env.TEACHER_ACCESS_KEY || "",
    sandboxImage: env.SANDBOX_IMAGE || "cole-learning-labs/sandbox:alpine",
    // "docker": containers on this host. "cloud": one Docker Cloud Sandbox per learner.
    sandboxBackend: env.SANDBOX_BACKEND === "cloud" ? "cloud" : "docker",
    cloud: cloudConfiguration(env),
    allowedOrigins: new Set(
      (env.ALLOWED_ORIGINS || "https://terminal.colelearninglabs.com")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
    trustedProxyAddresses: new Set(
      (env.TRUSTED_PROXY_ADDRESSES || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
    allowInsecureLocalhost: env.ALLOW_INSECURE_LOCALHOST === "true",
    memoryLimit: "512m",
    cpuLimit: "0.5",
    pidsLimit: 64,
    inactivityTimeoutMs: 300000,
    maxLifetimeMs: 3600000,
    reaperIntervalMs: 30000,
    wsHeartbeatIntervalMs: 30000,
    authTimeoutMs: 5000,
    maxConnections: 48,
    // This is a shared ingress budget when the peer is a reverse proxy, not
    // a per-student identity. Allow a class start plus bounded reconnects.
    maxUpgradesPerPeerMinute: integer(
      env.MAX_UPGRADES_PER_PEER_MINUTE,
      120,
      30,
      600,
    ),
    maxSessions: 24,
    maxClassrooms: 8,
    maxStudentsPerClass: 24,
    maxSnapshotBytes: 65536,
    snapshotMinIntervalMs: 5000,
    maxMessageBytes: 100000,
    maxBufferedBytes: 262144,
    maxInputBytes: 4096,
    maxFramesPerSecond: 60,
    maxInputBytesPerSecond: 32768,
    maxOutputBytesPerSecond: 262144,
  };
}
export const CONFIG = Object.freeze(configuration());

export const SELF_PACED_LABS = Object.freeze({
  "NET-201": {
    id: "NET-201",
    title: "Workstation Network & DNS Diagnostics",
    track: "Networking & Operating Systems",
    grade: "Grades 7–12",
    minutes: 25,
    summary:
      "Inspect a classroom workstation that cannot reach learn.school.test, verify the VLAN 8 configuration sheet, and repair its DNS resolver.",
    markdown: [
      "# NET-201 · Workstation Network & DNS Diagnostics",
      "",
      '> **Ticket Brief:** *"Workstation 04 in Room 204 can reach the local router, but `learn.school.test` fails to resolve. Please inspect the network configuration and fix the DNS resolver."*',
      "",
      "## Background",
      "On locked-down school networks, every workstation needs a valid **IPv4 address**, **default gateway**, and **DNS nameserver**. When a numerical IP ping succeeds but a hostname fails, DNS resolution is the prime suspect.",
      "",
      "## Step-by-Step Instructions",
      "",
      "### Step 1: Read the VLAN 8 Configuration Sheet",
      "Inspect the configuration sheet in your lab directory to see the assigned school DNS server:",
      "```sh",
      "cat ~/lab/network-sheet.txt",
      "```",
      "",
      "### Step 2: Inspect the Current DNS Resolver File",
      "Check what nameserver is currently configured in `~/lab/resolv.conf`:",
      "```sh",
      "cat ~/lab/resolv.conf",
      "```",
      "Notice that it points to `192.168.1.53` instead of the VLAN 8 school DNS resolver (`10.24.8.53`).",
      "",
      "### Step 3: Repair the DNS Resolver Configuration",
      "Update `~/lab/resolv.conf` so it uses `nameserver 10.24.8.53`:",
      "```sh",
      'printf "nameserver 10.24.8.53\\nsearch school.test\\n" > ~/lab/resolv.conf',
      "```",
      "",
      "### Step 4: Log Your Verification Result",
      "Confirm the updated file contents and write `DNS_VERIFIED_10.24.8.53` to `~/lab/verified.txt`:",
      "```sh",
      'echo "DNS_VERIFIED_10.24.8.53" > ~/lab/verified.txt',
      "```",
    ].join("\n"),
    milestones: [
      {
        id: "m1-sheet",
        title: "Read the VLAN 8 configuration sheet",
        description:
          "Run `cat ~/lab/network-sheet.txt` to inspect the assigned IP, gateway, and DNS server.",
        hint: "Type `cat ~/lab/network-sheet.txt` and press Enter.",
        checkType: "history_regex",
        pattern: /cat\s+.*network-sheet\.txt/i,
      },
      {
        id: "m2-inspect-resolv",
        title: "Inspect the current resolv.conf file",
        description:
          "Check the existing resolver setting in `~/lab/resolv.conf`.",
        hint: "Type `cat ~/lab/resolv.conf` in the terminal.",
        checkType: "history_regex",
        pattern: /cat\s+.*resolv\.conf/i,
      },
      {
        id: "m3-fix-dns",
        title: "Configure nameserver 10.24.8.53 in ~/lab/resolv.conf",
        description:
          "Write `nameserver 10.24.8.53` into `/home/learner/lab/resolv.conf`.",
        hint: 'Run: `echo "nameserver 10.24.8.53" > ~/lab/resolv.conf`',
        checkType: "file_contains",
        filePath: "/home/learner/lab/resolv.conf",
        expectedSubstring: "nameserver 10.24.8.53",
      },
      {
        id: "m4-verify-log",
        title: "Record verification stamp in ~/lab/verified.txt",
        description:
          "Create `/home/learner/lab/verified.txt` containing `DNS_VERIFIED_10.24.8.53`.",
        hint: 'Run: `echo "DNS_VERIFIED_10.24.8.53" > ~/lab/verified.txt`',
        checkType: "file_contains",
        filePath: "/home/learner/lab/verified.txt",
        expectedSubstring: "DNS_VERIFIED_10.24.8.53",
      },
    ],
  },

  "SEC-402": {
    id: "SEC-402",
    title: "Log Correlation & Telnet Port Containment",
    track: "Ethical Cybersecurity",
    grade: "Grades 9–12",
    minutes: 30,
    summary:
      "Correlate repeated failed sign-in events in auth-sim.log, isolate the suspicious IPv4 address, and close legacy Telnet port 23 while keeping HTTPS 443 open.",
    markdown: [
      "# SEC-402 · Log Correlation & Telnet Port Containment",
      "",
      '> **Ticket Brief:** *"Security monitoring flagged unusual login activity on a lab server. Correlate the authentication log, block the offending source IP, and close legacy Telnet (port 23) without disrupting HTTPS (port 443)."*',
      "",
      "## Step-by-Step Instructions",
      "",
      "### Step 1: Inspect the Authentication Log",
      "Read `~/lab/auth-sim.log` to identify which IP address triggered repeated `FAILED` logins followed by a Telnet session:",
      "```sh",
      "cat ~/lab/auth-sim.log",
      "```",
      "",
      "### Step 2: Contain the Suspicious Source IP",
      "Record only the suspicious external IP (`198.51.100.24`) in `~/lab/blocklist.conf`:",
      "```sh",
      'echo "198.51.100.24" > ~/lab/blocklist.conf',
      "```",
      "",
      "### Step 3: Close Legacy Telnet Port 23 & Preserve HTTPS 443",
      "Update `~/lab/firewall.conf` so `PORT_23=CLOSED` while keeping `PORT_443=OPEN`:",
      "```sh",
      'printf "PORT_23=CLOSED\\nPORT_443=OPEN\\n" > ~/lab/firewall.conf',
      "```",
    ].join("\n"),
    milestones: [
      {
        id: "m1-read-log",
        title: "Inspect ~/lab/auth-sim.log",
        description:
          "Examine the authentication log to correlate failed login attempts.",
        hint: "Run: `cat ~/lab/auth-sim.log` or `grep FAILED ~/lab/auth-sim.log`",
        checkType: "history_regex",
        pattern: /(?:cat|grep|less)\s+.*auth-sim\.log/i,
      },
      {
        id: "m2-block-ip",
        title: "Add 198.51.100.24 to ~/lab/blocklist.conf",
        description:
          "Contain the suspicious address without blocking classroom workstations.",
        hint: 'Run: `echo "198.51.100.24" > ~/lab/blocklist.conf`',
        checkType: "file_contains",
        filePath: "/home/learner/lab/blocklist.conf",
        expectedSubstring: "198.51.100.24",
      },
      {
        id: "m3-close-telnet",
        title: "Close Telnet (PORT_23=CLOSED) & keep HTTPS (PORT_443=OPEN)",
        description:
          "Update `/home/learner/lab/firewall.conf` with `PORT_23=CLOSED` and `PORT_443=OPEN`.",
        hint: 'Run: `printf "PORT_23=CLOSED\\nPORT_443=OPEN\\n" > ~/lab/firewall.conf`',
        checkType: "file_contains_all",
        filePath: "/home/learner/lab/firewall.conf",
        expectedSubstrings: ["PORT_23=CLOSED", "PORT_443=OPEN"],
      },
    ],
  },

  "CODE-501": {
    id: "CODE-501",
    title: "The Supply Calculator (real Python)",
    track: "Coding",
    grade: "Grades 7–12",
    minutes: 20,
    summary:
      "Fix a small Python program on a real Linux machine so it prints the kit cost for any quantity, then run the fixture check script until every input passes.",
    markdown: [
      "# CODE-501 · The Supply Calculator",
      "",
      '> **Lab Brief:** *"Each kit costs 3 credits. The supply-desk program adds 3 instead of multiplying. Fix it so every quantity prints the right total."*',
      "",
      "## Step-by-Step Instructions",
      "",
      "### Step 1: Read the program and the fixtures",
      "```sh",
      "cd ~/lab/code && cat program.py && cat fixtures.txt",
      "```",
      "",
      "### Step 2: Run the program with one input",
      "```sh",
      "python3 program.py 2",
      "```",
      "It prints 5; the fixtures expect 6.",
      "",
      "### Step 3: Fix the calculation",
      "Open the file in nano and change `quantity + 3` to `quantity * 3`, then save with Ctrl+O and leave with Ctrl+X:",
      "```sh",
      "nano program.py",
      "```",
      "",
      "### Step 4: Run every fixture",
      "```sh",
      "./check",
      "```",
      "The script writes `~/lab/code/results.txt`; the last line reads `ALL_FIXTURES_PASS` when every input matches.",
    ].join("\n"),
    milestones: [
      {
        id: "m1-read-program",
        title: "Read program.py",
        description: "Open the program before changing it.",
        hint: "Run: `cat ~/lab/code/program.py`",
        checkType: "history_regex",
        pattern: /(?:cat|less|head|nano|vi)\s+.*program\.py/i,
      },
      {
        id: "m2-run-program",
        title: "Run program.py with one input",
        description: "Run the program with python3 and one quantity.",
        hint: "Run: `python3 ~/lab/code/program.py 2`",
        checkType: "history_regex",
        pattern: /python3?\s+.*program\.py/i,
      },
      {
        id: "m3-fixtures-pass",
        title: "Every fixture passes (./check)",
        description:
          "Fix the calculation so ./check writes ALL_FIXTURES_PASS to ~/lab/code/results.txt.",
        hint: "Change `quantity + 3` to `quantity * 3`, save, then run `./check` in ~/lab/code.",
        checkType: "file_contains",
        filePath: "/home/learner/lab/code/results.txt",
        expectedSubstring: "ALL_FIXTURES_PASS",
      },
    ],
  },

  "INC-104": {
    id: "INC-104",
    title: "Storage Mount & Classroom File Recovery",
    track: "Hardware & ServiceDesk",
    grade: "Grades 7–12",
    minutes: 20,
    summary:
      "Inspect backup archives in ~/lab/backups, verify the intact v2 lesson plan, and restore it to the classroom delivery folder.",
    markdown: [
      "# INC-104 · Storage Mount & Classroom File Recovery",
      "",
      '> **Ticket Brief:** *"After reseating the SATA data cable, the teacher needs the verified v2 Lesson Plan restored to `~/lab/delivered/lesson-plan.txt` before class starts."*',
      "",
      "## Step-by-Step Instructions",
      "",
      "### Step 1: List Available Backup Files",
      "Check the files inside `~/lab/backups`:",
      "```sh",
      "ls -la ~/lab/backups",
      "```",
      "",
      "### Step 2: Inspect and Verify the v2 Backup",
      "Read `~/lab/backups/lesson-plan-v2.txt` to confirm it contains the verified lesson plan:",
      "```sh",
      "cat ~/lab/backups/lesson-plan-v2.txt",
      "```",
      "",
      "### Step 3: Restore the Verified File to ~/lab/delivered/lesson-plan.txt",
      "Copy the verified backup into the delivery directory:",
      "```sh",
      "cp ~/lab/backups/lesson-plan-v2.txt ~/lab/delivered/lesson-plan.txt",
      "```",
    ].join("\n"),
    milestones: [
      {
        id: "m1-list-backups",
        title: "List the contents of ~/lab/backups",
        description: "Use `ls` to view the backup directory.",
        hint: "Run: `ls -la ~/lab/backups`",
        checkType: "history_regex",
        pattern: /ls\s+.*backups/i,
      },
      {
        id: "m2-inspect-v2",
        title: "Verify ~/lab/backups/lesson-plan-v2.txt contents",
        description: "Inspect the v2 backup file before restoring it.",
        hint: "Run: `cat ~/lab/backups/lesson-plan-v2.txt`",
        checkType: "history_regex",
        pattern: /(?:cat|sha256sum|head)\s+.*lesson-plan-v2\.txt/i,
      },
      {
        id: "m3-restore-file",
        title: "Restore verified file to ~/lab/delivered/lesson-plan.txt",
        description:
          "Copy `lesson-plan-v2.txt` to `/home/learner/lab/delivered/lesson-plan.txt`.",
        hint: "Run: `cp ~/lab/backups/lesson-plan-v2.txt ~/lab/delivered/lesson-plan.txt`",
        checkType: "file_contains",
        filePath: "/home/learner/lab/delivered/lesson-plan.txt",
        expectedSubstring: "COLE LEARNING LABS - LESSON PLAN v2 (VERIFIED)",
      },
    ],
  },
});

export function generateLearnerAlias() {
  return "Learner-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}
export async function verifyGoogleWorkspaceToken() {
  return {
    ok: false,
    error: "oauth_not_configured",
    message:
      "Verified school identity integration is not configured. No role or session has been granted.",
  };
}
export function validateCloudflareUpgrade(req, cfg = CONFIG) {
  const origin = req.headers?.origin;
  if (typeof origin !== "string" || !cfg.allowedOrigins.has(origin))
    return { ok: false, status: 403, reason: "Origin denied" };
  let url;
  try {
    url = new URL(origin);
    if (url.origin !== origin || url.username || url.password)
      return { ok: false, status: 403, reason: "Origin denied" };
  } catch {
    return { ok: false, status: 403, reason: "Origin denied" };
  }
  const remote = req.socket?.remoteAddress;
  const secure =
    req.socket?.encrypted === true ||
    (cfg.trustedProxyAddresses.has(remote) &&
      req.headers["x-forwarded-proto"] === "https");
  const local =
    cfg.allowInsecureLocalhost &&
    loopback(remote) &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (!secure && !local)
    return { ok: false, status: 426, reason: "HTTPS required" };
  if (!local && (url.protocol !== "https:" || url.port))
    return { ok: false, status: 403, reason: "Origin denied" };
  return { ok: true };
}
const secureEquals = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length <= 512 &&
  b.length >= 32 &&
  crypto.timingSafeEqual(
    crypto.createHash("sha256").update(a).digest(),
    crypto.createHash("sha256").update(b).digest(),
  );
const failure = (code) => Object.assign(new Error(code), { code });
// The lab catalog: the sample labs above plus any content registered at start-up
// from a private content module (LAB_CONTENT_MODULE). Paid lab definitions, their
// seed files and deployment settings live outside this public repository.
const LAB_CATALOG = new Map(Object.entries(SELF_PACED_LABS));
const LAB_ID = /^[A-Z]{2,5}-\d{3}$/;
const CHECK_TYPES = new Set(["history_regex", "file_contains", "file_contains_all"]);
export function validateLabDefinition(lab) {
  if (!lab || typeof lab !== "object") return "lab must be an object";
  if (typeof lab.id !== "string" || !LAB_ID.test(lab.id)) return "lab id must look like ABC-123";
  for (const field of ["title", "track", "grade", "summary", "markdown"])
    if (typeof lab[field] !== "string" || !lab[field].trim() || lab[field].length > (field === "markdown" ? 20000 : 300))
      return lab.id + ": " + field + " must be a bounded non-empty string";
  if (!Number.isInteger(lab.minutes) || lab.minutes < 1 || lab.minutes > 240) return lab.id + ": minutes must be 1-240";
  if (!Array.isArray(lab.milestones) || !lab.milestones.length || lab.milestones.length > 20) return lab.id + ": 1-20 milestones are required";
  const ids = new Set();
  for (const item of lab.milestones) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !/^[a-z0-9-]{1,48}$/.test(item.id) || ids.has(item.id)) return lab.id + ": every milestone needs a unique lowercase id";
    ids.add(item.id);
    for (const field of ["title", "description", "hint"]) if (typeof item[field] !== "string" || item[field].length > 400) return lab.id + "/" + item.id + ": " + field + " must be a string";
    if (!CHECK_TYPES.has(item.checkType)) return lab.id + "/" + item.id + ": unknown checkType";
    if (item.checkType === "history_regex") {
      if (!(item.pattern instanceof RegExp)) return lab.id + "/" + item.id + ": pattern must be a RegExp";
    } else {
      if (typeof item.filePath !== "string" || !item.filePath.startsWith("/home/learner/") || item.filePath.includes("..")) return lab.id + "/" + item.id + ": filePath must be inside /home/learner";
      if (item.checkType === "file_contains" && (typeof item.expectedSubstring !== "string" || !item.expectedSubstring)) return lab.id + "/" + item.id + ": expectedSubstring is required";
      if (item.checkType === "file_contains_all" && (!Array.isArray(item.expectedSubstrings) || !item.expectedSubstrings.length || !item.expectedSubstrings.every((value) => typeof value === "string" && value))) return lab.id + "/" + item.id + ": expectedSubstrings are required";
    }
  }
  if (lab.files !== undefined) {
    if (!Array.isArray(lab.files) || lab.files.length > 40) return lab.id + ": files must be a list of at most 40 entries";
    let total = 0;
    for (const file of lab.files) {
      if (!file || typeof file.path !== "string" || !/^[A-Za-z0-9._][A-Za-z0-9._-]*(?:\/[A-Za-z0-9._][A-Za-z0-9._-]*)*$/.test(file.path) || file.path.split("/").some((part) => part === "." || part === "..")) return lab.id + ": every file needs a safe relative path";
      if (typeof file.content !== "string" || ![undefined, "base64"].includes(file.encoding) || ![undefined, 0o644, 0o755].includes(file.mode)) return lab.id + "/" + file.path + ": invalid file entry";
      total += file.content.length;
    }
    if (total > 96 * 1024) return lab.id + ": files must total under 96 KiB";
  }
  return null;
}
/** Register lab definitions (an array, or an object keyed by id). Invalid content is refused as a whole. */
export function registerLabs(content) {
  const list = Array.isArray(content) ? content : content && typeof content === "object" ? Object.values(content) : null;
  if (!list) throw new Error("Lab content must be an array or an object of labs.");
  for (const lab of list) {
    const problem = validateLabDefinition(lab);
    if (problem) throw new Error("Lab content refused: " + problem);
  }
  for (const lab of list) LAB_CATALOG.set(lab.id, Object.freeze({ ...lab, milestones: lab.milestones.map((m) => Object.freeze({ ...m })), ...(lab.files ? { files: Object.freeze(lab.files.map((file) => Object.freeze({ ...file }))) } : {}) }));
  return list.map((lab) => lab.id);
}
export const labCatalog = () => [...LAB_CATALOG.values()];
// The real-machine version of every other networking, security and coding lab,
// generated from the site's lab models (scripts/generate-labs.mjs).
registerLabs(generatedLabs());
// Beginner labs on using a Linux computer (linux-labs.js).
registerLabs(linuxLabs());
/** Load a private content module (absolute path or file: URL) that exports `labs`. */
export async function loadLabContent(specifier) {
  if (typeof specifier !== "string" || !specifier.trim()) return [];
  const url = /^file:/.test(specifier) ? specifier : "file://" + path.resolve(specifier);
  const module = await import(url);
  return registerLabs(module.labs ?? module.default);
}
export const labFor = (id) =>
  typeof id === "string" && LAB_CATALOG.has(id) ? LAB_CATALOG.get(id) : null;

export function buildDockerRunArgs(
  name,
  image = CONFIG.sandboxImage,
  cfg = CONFIG,
) {
  if (
    !/^cll-sandbox-[a-f0-9]{32}$/.test(name) ||
    !/^[a-z0-9][a-z0-9._/@:-]{1,200}$/.test(image) ||
    (cfg.reviewInstanceId !== undefined &&
      (typeof cfg.reviewInstanceId !== "string" ||
        !/^[a-f0-9]{32}$/.test(cfg.reviewInstanceId)))
  )
    throw failure("invalid_container_configuration");
  return [
    "run",
    "-d",
    "--rm",
    "--pull=never",
    "--name",
    name,
    "--hostname",
    "cole-lab",
    "--label",
    "io.colelearninglabs.terminal=1",
    ...(cfg.reviewInstanceId
      ? ["--label", `io.colelearninglabs.review=${cfg.reviewInstanceId}`]
      : []),
    "--user",
    "1000:1000",
    "--memory=512m",
    "--memory-swap=512m",
    "--cpus=0.5",
    "--pids-limit=64",
    "--network",
    "none",
    "--cap-drop=ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--read-only",
    "--ulimit",
    "nofile=256:256",
    "--log-driver",
    "none",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000,mode=700",
    "--tmpfs",
    "/home/learner:rw,noexec,nosuid,nodev,size=64m,uid=1000,gid=1000,mode=700",
    image,
    "/usr/bin/timeout",
    "--signal=KILL",
    String(Math.ceil(cfg.maxLifetimeMs / 1000)),
    "/bin/sh",
    "-c",
    'trap "exit 0" TERM INT; while :; do sleep 60; done',
  ];
}

/** Only docker is executed on the controller. The interactive shell lives inside its container. */
export async function spawnSandboxContainer(session, cfg = CONFIG, deps = {}) {
  const run = deps.exec || execFileAsync;
  let pty = deps.pty;
  if (!pty) {
    try {
      const imported = await import("node-pty");
      pty = imported.default || imported;
    } catch {
      throw failure("pty_unavailable");
    }
  }
  if (typeof pty.spawn !== "function") throw failure("pty_unavailable");
  const name = "cll-sandbox-" + crypto.randomBytes(16).toString("hex");
  let processPty,
    created = false,
    destroyed = false,
    deletionComplete = false,
    deleting = null;
  const docker = (args, timeout = 5000, maxBuffer = 65536) =>
    run("docker", args, {
      timeout,
      maxBuffer,
      windowsHide: true,
      encoding: "utf8",
    });
  const destroy = async () => {
    if (deletionComplete) return;
    if (deleting) return deleting;
    destroyed = true;
    try {
      processPty?.kill();
    } catch {}
    if (created) {
      deleting = docker(["rm", "-f", name]);
      try {
        await deleting;
      } catch (error) {
        const absent = ["Error response from daemon: No such container: ", "Error: No such container: "]
          .some((prefix) => error?.stderr?.trim() === prefix + name);
        if (!absent) throw failure("sandbox_cleanup_failed");
      } finally {
        deleting = null;
      }
    }
    deletionComplete = true;
  };
  try {
    const info = await docker(["info", "--format", "{{.OSType}}"]);
    if (info.stdout.trim() !== "linux") throw failure("linux_docker_required");
    await docker(["image", "inspect", cfg.sandboxImage]);
    created = true;
    const result = await docker(
      buildDockerRunArgs(name, cfg.sandboxImage, cfg),
      15000,
    );
    if (!/^[a-f0-9]{12,64}$/.test(result.stdout.trim()))
      throw failure("container_start_failed");
    // A lab that ships its own files replaces the shared tree the image seeded.
    const ownFiles = labFor(session.labId)?.files;
    if (ownFiles?.length)
      await docker(["exec", "--user", "1000:1000", name, "/bin/sh", "-c", buildSeedScript(seedFromLabFiles(ownFiles), { fresh: true })], 15000);
    processPty = pty.spawn(
      "docker",
      [
        "exec",
        "-it",
        "--user",
        "1000:1000",
        "--workdir",
        "/home/learner",
        name,
        "/bin/sh",
        "-i",
      ],
      {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: ROOT,
        env: {
          PATH: process.env.PATH || "/usr/bin:/bin",
          HOME: "/tmp",
          TERM: "xterm-256color",
        },
      },
    );
    const allowedFiles = new Set(
      labCatalog().flatMap((lab) =>
        lab.milestones.map((m) => m.filePath).filter(Boolean),
      ),
    );
    return {
      mode: "docker-pty",
      containerId: result.stdout.trim().slice(0, 12),
      onData: (fn) => processPty.onData(fn),
      onExit: (fn) => processPty.onExit(fn),
      write: (data) => {
        if (!destroyed) processPty.write(data);
      },
      resize: (cols, rows) => {
        if (!destroyed) processPty.resize(cols, rows);
      },
      readFile: async (file) => {
        if (destroyed || !allowedFiles.has(file)) return null;
        try {
          return (
            await docker(
              ["exec", "--user", "1000:1000", name, "/bin/cat", "--", file],
              1500,
              16384,
            )
          ).stdout;
        } catch {
          return null;
        }
      },
      destroy,
    };
  } catch {
    const error = failure("docker_pty_unavailable");
    try { await destroy(); } catch { error.cleanup = destroy; }
    throw error;
  }
}

export async function verifySessionMilestones(session) {
  const lab = labFor(session.labId);
  if (!lab || !session.sandbox) return [];
  const results = [];
  // On a desktop the learner types in the machine's own terminal, so the
  // commands come from the short history file the machine keeps for the checks.
  let history = session.commandHistory || [];
  if (typeof session.sandbox.history === "function" && lab.milestones.some((item) => item.checkType === "history_regex")) {
    try {
      history = [...history, ...(await session.sandbox.history())];
    } catch {}
  }
  // Several checks may read the same file (the progress note); read each file once per pass.
  const read = new Map();
  for (const item of lab.milestones) {
    let completed = false;
    if (item.checkType === "history_regex")
      completed = history.some((line) => item.pattern.test(line));
    else {
      let content = null;
      if (read.has(item.filePath)) content = read.get(item.filePath);
      else {
        try {
          content = await session.sandbox.readFile(item.filePath);
        } catch {}
        read.set(item.filePath, content);
      }
      completed =
        typeof content === "string" &&
        (item.checkType === "file_contains_all"
          ? item.expectedSubstrings.every((value) => content.includes(value))
          : content.includes(item.expectedSubstring));
    }
    results.push({
      id: item.id,
      title: item.title,
      description: item.description,
      hint: item.hint,
      completed,
    });
  }
  return results;
}

export function validSnapshot(value, maxBytes = 65536) {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil((maxBytes * 4) / 3) + 32 ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    return false;
  const raw = Buffer.from(value.slice(23), "base64");
  if (
    raw.length > maxBytes ||
    raw.length < 20 ||
    raw.readUInt16BE(0) !== 0xffd8 ||
    raw.readUInt16BE(raw.length - 2) !== 0xffd9
  )
    return false;
  for (let i = 2; i + 8 < raw.length;) {
    if (raw[i] !== 255) return false;
    const marker = raw[i + 1];
    if (marker === 0xda || marker === 0xd9) return false;
    const length = raw.readUInt16BE(i + 2);
    if (length < 2 || i + 2 + length > raw.length) return false;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      const height = raw.readUInt16BE(i + 5),
        width = raw.readUInt16BE(i + 7);
      return width > 0 && height > 0 && width <= 640 && height <= 360;
    }
    i += 2 + length;
  }
  return false;
}

const HEADERS = {
  "Content-Security-Policy":
    // xterm's reviewed renderer creates runtime style elements for cell sizes
    // and its theme. Permit those CSS elements only; scripts remain same-origin.
    "default-src 'self'; script-src 'self'; style-src 'self'; style-src-elem 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), display-capture=(), usb=(), serial=(), hid=()",
};
function json(res, status, value) {
  res.writeHead(status, {
    ...HEADERS,
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(value));
}
const publicLab = (lab) => ({
  id: lab.id,
  title: lab.title,
  track: lab.track,
  grade: lab.grade,
  minutes: lab.minutes,
  summary: lab.summary,
  markdown: lab.markdown,
});
const FILES = new Map([
  ["/", ["public/index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["public/index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["public/app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["public/styles.css", "text/css; charset=utf-8"]],
  [
    "/vendor/xterm/xterm.js",
    [
      "node_modules/@xterm/xterm/lib/xterm.js",
      "text/javascript; charset=utf-8",
    ],
  ],
  [
    "/vendor/xterm/addon-fit.js",
    [
      "node_modules/@xterm/addon-fit/lib/addon-fit.js",
      "text/javascript; charset=utf-8",
    ],
  ],
  [
    "/vendor/xterm/xterm.css",
    ["node_modules/@xterm/xterm/css/xterm.css", "text/css; charset=utf-8"],
  ],
]);

// The browser's screen client (noVNC, MPL-2.0) is served from the installed
// package as ES modules, same-origin, so the site's script policy is unchanged.
(function addScreenClient(dir = "node_modules/@novnc/novnc", prefix = "/vendor/novnc") {
  const walk = (relative) => {
    let entries = [];
    try {
      entries = readdirSync(path.join(ROOT, dir, relative), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = relative ? relative + "/" + entry.name : entry.name;
      if (!/^[A-Za-z0-9._-]+$/.test(entry.name)) continue;
      if (entry.isDirectory()) walk(rel);
      else if (entry.isFile() && entry.name.endsWith(".js") && statSync(path.join(ROOT, dir, rel)).size < 2_000_000) FILES.set(prefix + "/" + rel, [dir + "/" + rel, "text/javascript; charset=utf-8"]);
    }
  };
  walk("core");
  walk("vendor");
})();

/** The files a lab check may read inside a learner's machine; nothing else is readable. */
export const allowedLabFiles = () =>
  labCatalog().flatMap((lab) =>
    lab.milestones.map((m) => m.filePath).filter(Boolean),
  );

/** Human-readable runtime name and limits for the selected backend. */
export function runtimeDescription(cfg = CONFIG) {
  if (cfg.sandboxBackend === "cloud") {
    const desktop = cfg.cloud?.view === "desktop";
    const size = CLOUD_SIZES[desktop ? cfg.cloud?.desktopSize : cfg.cloud?.size] || (desktop ? CLOUD_SIZES.small : CLOUD_SIZES.micro);
    return {
      runtime: desktop ? "docker-cloud-desktop" : "docker-cloud-sandbox",
      limits: { memory: size.memoryMib + "m", cpus: String(size.cpus) },
    };
  }
  return {
    runtime: "docker-pty",
    limits: { memory: cfg.memoryLimit, cpus: cfg.cpuLimit },
  };
}

export function createSandboxOrchestrator(overrides = {}, deps = {}) {
  const cfg = { ...CONFIG, ...overrides },
    sessions = new Map(),
    classrooms = new Map(),
    connections = new Set(),
    upgradeRates = new Map(),
    pendingCleanup = new Set();
  const runtime = runtimeDescription(cfg);
  const sandboxFactory =
      deps.sandboxFactory ||
      (cfg.sandboxBackend === "cloud"
        ? (session, c) =>
            spawnCloudSandbox(session, c, { allowedFiles: allowedLabFiles(), labFiles: labFor(session.labId)?.files })
        : spawnSandboxContainer),
    now = deps.now || Date.now,
    logFailure = deps.log || ((...parts) => console.error(...parts));
  let stopping = false,
    pendingStarts = 0;
  async function cleanMachine(cleanup) {
    // Reserve its allocation until deletion is confirmed, including while the
    // provider request is in flight rather than only after a failed attempt.
    pendingCleanup.add(cleanup);
    try {
      await cleanup();
      pendingCleanup.delete(cleanup);
    } catch {
      pendingCleanup.add(cleanup);
      // Keep student content, provider response bodies, credentials, and machine
      // addresses out of logs. A fixed event code is sufficient for alerting.
      logFailure("sandbox_cleanup_failed");
    }
  }
  const wsServer = new WebSocketServer({
    noServer: true,
    maxPayload: cfg.maxMessageBytes,
    perMessageDeflate: false,
    maxFragments: 128,
    maxBufferedChunks: 128,
    closeTimeout: 1000,
  });
  // The desktop view has a second socket per learner: the screen. It is a plain
  // relay between the browser's screen client and the machine's screen bridge,
  // admitted by a session-scoped capability from session:ready in the subprotocol.
  const desktopServer = new WebSocketServer({
    noServer: true,
    maxPayload: 1 << 20,
    perMessageDeflate: false,
    handleProtocols: (protocols) => (protocols.has("cll-desktop") ? "cll-desktop" : false),
  });
  const desktopLinks = new Set();
  const openScreen =
    deps.desktopSocketFactory ||
    ((address) => new UpstreamWebSocket(address, ["binary"], { perMessageDeflate: false, maxPayload: 16 << 20, followRedirects: false, handshakeTimeout: 10000 }));
  function relayDesktop(client, s) {
    if (s.destroyed || s.paused) { client.terminate(); return; }
    s.desktopLink?.close();
    let upstream, closed = false, windowAt = now(), windowBytes = 0;
    const pending = [];
    const link = {
      close() {
        if (closed) return;
        closed = true;
        desktopLinks.delete(link);
        if (s.desktopLink === link) s.desktopLink = null;
        try { client.terminate(); } catch {}
        try { upstream?.terminate(); } catch {}
      },
    };
    s.desktopLink = link;
    desktopLinks.add(link);
    try {
      upstream = openScreen(s.sandbox.desktop.url);
    } catch {
      return link.close();
    }
    upstream.on("open", () => {
      if (closed || s.destroyed || s.paused) return link.close();
      for (const data of pending.splice(0)) upstream.send(data);
    });
    upstream.on("message", (data) => {
      if (closed || client.readyState !== 1) return;
      if (s.destroyed || s.paused) return link.close();
      if (client.bufferedAmount > 8 << 20) return link.close(); // the browser is not keeping up
      client.send(data, { binary: true });
    });
    upstream.on("close", () => link.close());
    upstream.on("error", () => link.close());
    client.on("message", (data) => {
      if (closed || s.destroyed) return link.close();
      if (now() - windowAt >= 1000) { windowAt = now(); windowBytes = 0; }
      windowBytes += data.length;
      if (windowBytes > 512 * 1024) return link.close(); // far beyond any keyboard and mouse traffic
      // RFB frames can combine protocol and input data. Close paused streams
      // instead of dropping opaque frames and corrupting the protocol state.
      if (s.paused) return link.close();
      s.lastActivity = now();
      if (upstream.readyState === 1) upstream.send(data);
      else if (pending.length < 64) pending.push(data);
    });
    client.on("close", () => link.close());
    client.on("error", () => link.close());
  }
  const server = http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      return json(res, 400, { error: "invalid_url" });
    }
    if (req.method !== "GET" && req.method !== "HEAD")
      return json(res, 405, { error: "method_not_allowed" });
    if (url.search) return json(res, 400, { error: "query_not_allowed" });
    if (url.pathname === "/api/health")
      return json(res, pendingCleanup.size ? 503 : 200, {
        status: pendingCleanup.size ? "cleanup_blocked" : cfg.enabled ? "enabled" : "disabled",
        runtime: runtime.runtime,
        productionApproved: false,
      });
    if (url.pathname === "/api/labs")
      return json(res, 200, {
        labs: labCatalog().map(publicLab),
      });
    const file = FILES.get(url.pathname);
    if (!file) return json(res, 404, { error: "not_found" });
    try {
      const bytes = await readFile(path.join(ROOT, file[0]));
      res.writeHead(200, { ...HEADERS, "Content-Type": file[1] });
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch {
      json(res, 404, { error: "asset_unavailable" });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 5000;
  server.maxHeadersCount = 32;
  function send(c, message) {
    if (c.closed || c.ws.readyState !== 1) return;
    const data = JSON.stringify(message);
    if (c.ws.bufferedAmount + Buffer.byteLength(data) > cfg.maxBufferedBytes) {
      c.ws.terminate();
      return;
    }
    try {
      c.ws.send(data);
    } catch {
      c.ws.terminate();
    }
  }
  function error(c, code) {
    send(c, { type: "error", code, message: code.replaceAll("_", " ") });
  }
  function studentView(s, includeImage = true) {
    return {
      sessionId: s.id,
      alias: s.alias,
      labId: s.labId,
      milestones: s.milestones || [],
      snapshotConsented: s.consent,
      snapshotDataUrl: includeImage && s.consent ? s.snapshot : null,
      snapshotUpdatedAt:
        s.consent && s.snapshotAt ? new Date(s.snapshotAt).toISOString() : null,
    };
  }
  function broadcast(s) {
    const room = classrooms.get(s.classroomCode);
    if (room && room.owner.subscriptions.has(room.code))
      send(room.owner, {
        type: "classroom:snapshot",
        classroomCode: room.code,
        student: studentView(s),
      });
  }
  function revoke(s) {
    s.consent = false;
    s.snapshot = null;
    s.snapshotAt = 0;
    broadcast(s);
  }
  function leaveRoom(s) {
    const room = classrooms.get(s.classroomCode);
    if (room && room.owner.subscriptions.has(room.code))
      send(room.owner, {
        type: "classroom:student-left",
        classroomCode: room.code,
        sessionId: s.id,
      });
    s.classroomCode = "";
  }
  async function destroySession(s, reason) {
    if (!s || s.destroyed) return;
    s.destroyed = true;
    clearTimeout(s.verifyTimer);
    sessions.delete(s.id);
    revoke(s);
    leaveRoom(s);
    s.desktopLink?.close();
    s.commandHistory = [];
    s.line = "";
    s.milestones = [];
    try {
      if (s.sandbox) await cleanMachine(s.sandbox.destroy);
    } finally {
      if (s.owner.session === s) s.owner.session = null;
      send(s.owner, { type: "session:terminated", reason });
    }
  }
  async function disconnect(c) {
    if (c.closed) return;
    c.closed = true;
    clearTimeout(c.authTimer);
    connections.delete(c);
    await destroySession(c.session, "disconnected");
    for (const [code, room] of classrooms)
      if (room.owner === c) {
        classrooms.delete(code);
        await Promise.all(
          [...sessions.values()]
            .filter((s) => s.classroomCode === code)
            .map((s) => destroySession(s, "teacher_disconnected")),
        );
      }
  }
  function owned(c, code) {
    const room = classrooms.get(code);
    if (c.role !== "teacher" || !room || room.owner !== c)
      throw failure("classroom_denied");
    return room;
  }
  function join(s, code, reserved = false) {
    const room = classrooms.get(code);
    if (
      code !== "" &&
      (!room ||
        (code !== s.classroomCode &&
          [...sessions.values()].filter(
            (x) => x !== s && x.classroomCode === code,
          ).length +
            room.pending -
            (reserved ? 1 : 0) >=
            cfg.maxStudentsPerClass))
    )
      throw failure("classroom_unavailable");
    if (code !== s.classroomCode) {
      revoke(s);
      leaveRoom(s);
      s.classroomCode = code;
      s.paused = room?.paused === true;
    }
    s.mode = code ? "instructor-led" : "self-paced";
    send(s.owner, {
      type: "classroom:joined",
      classroomCode: code,
      mode: s.mode,
    });
    send(s.owner, { type: "teacher:pause-state", paused: s.paused });
    broadcast(s);
  }
  async function start(c, msg) {
    if (c.role !== "student" || c.starting || c.session)
      throw failure("session_already_started");
    // An undeleted machine can still contain learner work. Stop new allocation
    // until bounded cleanup retries succeed, preventing an unbounded orphan set.
    if (pendingCleanup.size) throw failure("sandbox_unavailable");
    const lab = labFor(msg.labId);
    if (!lab) throw failure("unknown_lab");
    const code = msg.mode === "instructor-led" ? msg.classroomCode : "";
    if (code && (!classrooms.has(code) || typeof code !== "string"))
      throw failure("classroom_unavailable");
    if (msg.mode === "instructor-led" && !code)
      throw failure("classroom_unavailable");
    const room = code ? classrooms.get(code) : null;
    if (
      room &&
      [...sessions.values()].filter((s) => s.classroomCode === code).length +
        room.pending >=
        cfg.maxStudentsPerClass
    )
      throw failure("classroom_unavailable");
    if (sessions.size + pendingStarts >= cfg.maxSessions)
      throw failure("capacity_reached");
    c.starting = true;
    pendingStarts++;
    if (room) room.pending++;
    const s = {
      id: crypto.randomUUID(),
      alias: c.alias,
      owner: c,
      labId: lab.id,
      classroomCode: "",
      mode: "self-paced",
      commandHistory: [],
      line: "",
      milestones: [],
      consent: false,
      snapshot: null,
      snapshotAt: 0,
      lastSnapshotAt: 0,
      paused: false,
      lastActivity: now(),
      created: now(),
      destroyed: false,
      sandbox: null,
      desktopTicket: crypto.randomBytes(16).toString("hex"),
      // The size of the learner's lab area, used to create a desktop that fits it.
      screen:
        msg.screen && Number.isInteger(msg.screen.width) && Number.isInteger(msg.screen.height) && msg.screen.width >= 320 && msg.screen.width <= 4096 && msg.screen.height >= 200 && msg.screen.height <= 4096
          ? { width: msg.screen.width, height: msg.screen.height }
          : null,
      desktopLink: null,
      outputAt: now(),
      outputBytes: 0,
      verifyAt: 0,
    };
    try {
      s.sandbox = await sandboxFactory(s, cfg);
      if (c.closed || stopping) {
        await s.sandbox.destroy();
        return;
      }
      if (code && !classrooms.has(code)) {
        await s.sandbox.destroy();
        throw failure("classroom_unavailable");
      }
      if (code) join(s, code, true);
      c.session = s;
      sessions.set(s.id, s);
      broadcast(s);
      s.sandbox.onData((chunk) => {
        if (s.destroyed) return;
        const data = String(chunk);
        if (now() - s.outputAt >= 1000) {
          s.outputAt = now();
          s.outputBytes = 0;
        }
        s.outputBytes += Buffer.byteLength(data);
        if (s.outputBytes > cfg.maxOutputBytesPerSecond) {
          void destroySession(s, "output_limit");
          return;
        }
        send(c, { type: "terminal:output", data });
      });
      s.sandbox.onExit?.(() => {
        void destroySession(s, "terminal_exited");
      });
      s.milestones = await verifySessionMilestones(s);
      if (s.destroyed) return;
      broadcast(s);
      send(c, {
        type: "session:ready",
        sessionId: s.id,
        alias: s.alias,
        labId: s.labId,
        mode: s.mode,
        classroomCode: s.classroomCode,
        runtimeMode: runtime.runtime,
        limits: {
          ...runtime.limits,
          inactivityTimeoutSeconds: cfg.inactivityTimeoutMs / 1000,
        },
        lab: publicLab(lab),
        milestones: s.milestones,
        // Desktop view: how the browser opens this machine's screen. The ticket
        // admits the screen socket; the password is this session's own.
        ...(s.sandbox.desktop
          ? { desktop: { ticket: s.desktopTicket, password: s.sandbox.desktop.password, width: s.sandbox.desktop.width, height: s.sandbox.desktop.height } }
          : {}),
      });
    } catch (error) {
      // Provider errors can echo request content or credentials. Log only known
      // fixed codes, never the provider message or arbitrary exception text.
      const safeCodes = new Set([
        "capacity_reached", "cloud_auth_failed", "cloud_credential_failed",
        "cloud_endpoint_unsupported", "cloud_not_configured", "cloud_sandbox_lookup_failed",
        "container_start_failed", "desktop_unavailable", "docker_pty_unavailable",
        "invalid_container_configuration", "sandbox_seed_failed", "sandbox_seed_invalid",
        "sandbox_seed_too_large", "classroom_unavailable", "pty_unavailable",
      ]);
      logFailure(
        "Machine start failed for " + lab.id + ":",
        safeCodes.has(error?.code) ? error.code : "operation_failed",
      );
      sessions.delete(s.id);
      if (c.session === s) c.session = null;
      s.destroyed = true;
      if (s.sandbox) await cleanMachine(s.sandbox.destroy);
      else if (typeof error?.cleanup === "function") await cleanMachine(error.cleanup);
      throw failure("sandbox_unavailable");
    } finally {
      pendingStarts--;
      if (room) room.pending--;
      c.starting = false;
    }
  }
  async function verify(s) {
    if (s.destroyed || s.verifying || now() - s.verifyAt < 500) return;
    s.verifyAt = now();
    s.verifying = true;
    try {
      s.milestones = await verifySessionMilestones(s);
      if (!s.destroyed) {
        send(s.owner, {
          type: "milestone:status",
          labId: s.labId,
          milestones: s.milestones,
        });
        broadcast(s);
      }
    } finally {
      s.verifying = false;
    }
  }
  function scheduleVerification(s) {
    if (s.verifyTimer || s.destroyed) return;
    s.verifyTimer = setTimeout(() => {
      s.verifyTimer = null;
      void verify(s).catch(() => error(s.owner, "verification_unavailable"));
    }, 150);
    s.verifyTimer.unref?.();
  }
  async function message(c, msg) {
    if (c.closed || stopping) return;
    if (!c.role) {
      if (msg.type !== "auth") throw failure("authentication_required");
      if (msg.role === "teacher") {
        if (!secureEquals(msg.teacherKey, cfg.teacherKey)) {
          error(c, "teacher_authentication_failed");
          c.ws.close(1008, "Authentication failed");
          return;
        }
        c.role = "teacher";
      } else if (msg.role === "student") c.role = "student";
      else throw failure("invalid_role");
      clearTimeout(c.authTimer);
      send(c, {
        type: "auth:ok",
        role: c.role,
        sessionId: c.id,
        alias: c.alias,
      });
      return;
    }
    if (msg.type === "auth") throw failure("already_authenticated");
    if (msg.type === "ping") {
      send(c, { type: "pong" });
      return;
    }
    if (c.role === "teacher") {
      if (msg.type === "classroom:create") {
        if (classrooms.size >= cfg.maxClassrooms)
          throw failure("capacity_reached");
        const code =
          "CLL-" + crypto.randomBytes(12).toString("hex").toUpperCase();
        classrooms.set(code, { code, owner: c, pending: 0, paused: false });
        c.subscriptions.add(code);
        send(c, { type: "classroom:created", classroomCode: code });
      } else if (msg.type === "classroom:subscribe") {
        const room = owned(c, msg.classroomCode);
        c.subscriptions.add(room.code);
        send(c, {
          type: "classroom:status",
          classroomCode: room.code,
          students: [...sessions.values()]
            .filter((s) => s.classroomCode === room.code)
            .map((s) => studentView(s, false)),
        });
      } else if (msg.type === "classroom:control") {
        const room = owned(c, msg.classroomCode);
        if (
          ![
            "pause",
            "resume",
            "request-snapshots",
            "override-command",
          ].includes(msg.action)
        )
          throw failure("unknown_control");
        if (
          msg.action === "override-command" &&
          (typeof msg.command !== "string" ||
            msg.command.length > 1024 ||
            /[\r\n\0]/.test(msg.command))
        )
          throw failure("invalid_command");
        if (
          !msg.sessionId &&
          (msg.action === "pause" || msg.action === "resume")
        )
          room.paused = msg.action === "pause";
        const targets = [...sessions.values()].filter(
          (s) =>
            s.classroomCode === room.code &&
            (!msg.sessionId || s.id === msg.sessionId),
        );
        for (const s of targets) {
          if (msg.action === "pause" || msg.action === "resume") {
            s.paused = msg.action === "pause";
            if (s.paused) s.desktopLink?.close();
            send(s.owner, { type: "teacher:pause-state", paused: s.paused });
          }
          if (msg.action === "request-snapshots" && s.consent)
            send(s.owner, { type: "teacher:request-snapshot" });
          if (msg.action === "override-command") {
            s.sandbox.write(msg.command + "\r");
            send(s.owner, {
              type: "teacher:override-executed",
              command: msg.command,
            });
            scheduleVerification(s);
          }
        }
        send(c, {
          type: "classroom:control-ack",
          action: msg.action,
          affected: targets.length,
        });
      } else throw failure("teacher_action_denied");
      c.lastActivity = now();
      return;
    }
    if (msg.type === "session:start") {
      await start(c, msg);
      return;
    }
    const s = c.session;
    if (!s || s.destroyed) throw failure("session_required");
    if (msg.type === "terminal:input") {
      if (s.paused) throw failure("input_paused");
      if (
        typeof msg.data !== "string" ||
        Buffer.byteLength(msg.data) > cfg.maxInputBytes
      )
        throw failure("invalid_input");
      c.inputBytes += Buffer.byteLength(msg.data);
      if (c.inputBytes > cfg.maxInputBytesPerSecond)
        throw failure("input_limit");
      s.sandbox.write(msg.data);
      s.lastActivity = now();
      for (const ch of msg.data) {
        if (ch === "\r" || ch === "\n") {
          if (s.line.trim()) s.commandHistory.push(s.line.trim());
          s.commandHistory = s.commandHistory.slice(-100);
          s.line = "";
        } else if (ch === "\x7f" || ch === "\b") s.line = s.line.slice(0, -1);
        else if (ch >= " ") s.line = (s.line + ch).slice(-4096);
      }
      if (/[\r\n]/.test(msg.data)) scheduleVerification(s);
    } else if (msg.type === "terminal:resize") {
      if (
        !Number.isInteger(msg.cols) ||
        !Number.isInteger(msg.rows) ||
        msg.cols < 20 ||
        msg.cols > 240 ||
        msg.rows < 5 ||
        msg.rows > 80
      )
        throw failure("invalid_dimensions");
      s.sandbox.resize(msg.cols, msg.rows);
    } else if (msg.type === "milestone:verify") {
      s.lastActivity = now();
      await verify(s);
    } else if (msg.type === "lab:switch") {
      if (!labFor(msg.labId)) throw failure("unknown_lab");
      const mode = s.mode,
        code = s.classroomCode;
      await destroySession(s, "lab_changed");
      await start(c, { labId: msg.labId, mode, classroomCode: code });
    } else if (msg.type === "classroom:join") {
      if (
        typeof msg.classroomCode !== "string" ||
        msg.classroomCode.length > 40
      )
        throw failure("classroom_unavailable");
      join(s, msg.classroomCode);
    } else if (msg.type === "screen:consent") {
      if (typeof msg.enabled !== "boolean") throw failure("invalid_consent");
      if (msg.enabled && !classrooms.has(s.classroomCode))
        throw failure("classroom_required");
      if (!msg.enabled) revoke(s);
      else s.consent = true;
      send(c, { type: "screen:consent-state", enabled: s.consent });
    } else if (msg.type === "screen:snapshot") {
      if (!s.consent || !classrooms.has(s.classroomCode))
        throw failure("snapshot_not_authorized");
      if (!validSnapshot(msg.dataUrl, cfg.maxSnapshotBytes))
        throw failure("invalid_snapshot");
      if (now() - s.lastSnapshotAt < cfg.snapshotMinIntervalMs)
        throw failure("snapshot_rate_limit");
      s.snapshot = msg.dataUrl;
      s.snapshotAt = now();
      s.lastSnapshotAt = s.snapshotAt;
      broadcast(s);
      send(c, { type: "screen:snapshot-ack", timestamp: s.snapshotAt });
    } else throw failure("student_action_denied");
  }
  server.on("upgrade", (req, socket, head) => {
    const reject = (status) => {
      socket.write(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      return reject(400);
    }
    if ((url.pathname !== "/ws" && url.pathname !== "/desktop") || url.search) return reject(400);
    if (!cfg.enabled || stopping) return reject(503);
    const validation = validateCloudflareUpgrade(req, cfg);
    if (!validation.ok) return reject(validation.status);
    if (url.pathname === "/ws" && connections.size >= cfg.maxConnections) return reject(503);
    const address = req.socket.remoteAddress || "";
    const previous = upgradeRates.get(address);
    if (!previous || now() - previous.at >= 60000) {
      if (upgradeRates.size >= 1024) upgradeRates.clear();
      upgradeRates.set(address, { at: now(), count: 1 });
    } else if (++previous.count > cfg.maxUpgradesPerPeerMinute)
      return reject(429);
    if (url.pathname === "/desktop") {
      const offered = String(req.headers["sec-websocket-protocol"] || "").split(",").map((item) => item.trim());
      const ticket = offered.find((item) => /^ticket\.[a-f0-9]{32}$/.test(item))?.slice(7);
      const s = ticket && offered.includes("cll-desktop") ? [...sessions.values()].find((item) => !item.destroyed && item.sandbox?.desktop && crypto.timingSafeEqual(Buffer.from(item.desktopTicket), Buffer.from(ticket))) : null;
      if (!s || s.paused) return reject(403);
      if (desktopLinks.size >= cfg.maxSessions + 8) return reject(503);
      return desktopServer.handleUpgrade(req, socket, head, (ws) => relayDesktop(ws, s));
    }
    wsServer.handleUpgrade(req, socket, head, (ws) => {
      const c = {
        id: crypto.randomUUID(),
        alias: generateLearnerAlias(),
        role: null,
        ws,
        closed: false,
        session: null,
        starting: false,
        subscriptions: new Set(),
        lastActivity: now(),
        created: now(),
        frames: 0,
        inputBytes: 0,
        windowAt: now(),
        queued: 0,
        chain: Promise.resolve(),
        alive: true,
      };
      connections.add(c);
      c.authTimer = setTimeout(
        () => ws.close(1008, "Authentication timeout"),
        cfg.authTimeoutMs,
      );
      c.authTimer.unref?.();
      ws.on("pong", () => {
        c.alive = true;
      });
      ws.on("close", () => {
        void disconnect(c);
      });
      ws.on("error", () => {
        void disconnect(c);
      });
      ws.on("message", (raw, binary) => {
        if (now() - c.windowAt >= 1000) {
          c.windowAt = now();
          c.frames = 0;
          c.inputBytes = 0;
        }
        if (binary || ++c.frames > cfg.maxFramesPerSecond || c.queued >= 8) {
          ws.close(1008, "Message limit");
          return;
        }
        let msg;
        try {
          msg = JSON.parse(raw.toString("utf8"));
          if (
            !msg ||
            typeof msg !== "object" ||
            Array.isArray(msg) ||
            typeof msg.type !== "string"
          )
            throw 0;
        } catch {
          error(c, "invalid_message");
          return;
        }
        c.queued++;
        c.chain = c.chain
          .then(() => message(c, msg))
          .catch((e) => {
            error(
              c,
              [
                "authentication_required",
                "invalid_role",
                "already_authenticated",
                "session_already_started",
                "unknown_lab",
                "classroom_unavailable",
                "capacity_reached",
                "sandbox_unavailable",
                "classroom_denied",
                "unknown_control",
                "invalid_command",
                "teacher_action_denied",
                "session_required",
                "input_paused",
                "invalid_input",
                "input_limit",
                "invalid_dimensions",
                "invalid_consent",
                "classroom_required",
                "snapshot_not_authorized",
                "invalid_snapshot",
                "snapshot_rate_limit",
                "student_action_denied",
              ].includes(e.code)
                ? e.code
                : "operation_failed",
            );
          })
          .finally(() => {
            c.queued--;
          });
      });
    });
  });
  async function reap() {
    // Revoke every expired session before waiting on provider deletion. A slow
    // orphan cleanup must not extend another learner's access or data lifetime.
    const retries = [...pendingCleanup];
    const expiring = [...sessions.values()]
      .filter((s) =>
        now() - s.lastActivity >= cfg.inactivityTimeoutMs ||
        now() - s.created >= cfg.maxLifetimeMs
      )
      .map((s) => destroySession(s, "session_expired"));
    for (const c of connections)
      if (
        now() - c.created >= cfg.maxLifetimeMs ||
        (c.role === "teacher" &&
          now() - c.lastActivity >= cfg.inactivityTimeoutMs)
      )
        c.ws.close(1000, "Session expired");
    await Promise.allSettled([...expiring, ...retries.map(cleanMachine)]);
  }
  const reaper = setInterval(() => {
      void reap().catch(() => {});
    }, cfg.reaperIntervalMs),
    heartbeat = setInterval(() => {
      for (const c of connections) {
        if (!c.alive) {
          c.ws.terminate();
          continue;
        }
        c.alive = false;
        try {
          c.ws.ping();
        } catch {
          c.ws.terminate();
        }
      }
    }, cfg.wsHeartbeatIntervalMs);
  reaper.unref();
  heartbeat.unref();
  return {
    server,
    sessions,
    classrooms,
    reap,
    close: async () => {
      stopping = true;
      clearInterval(reaper);
      clearInterval(heartbeat);
      const closing = [...connections];
      for (const c of closing) {
        c.ws.terminate();
        await disconnect(c);
      }
      await Promise.allSettled(closing.map((c) => c.chain));
      await Promise.all(
        [...sessions.values()].map((s) => destroySession(s, "server_shutdown")),
      );
      for (const link of [...desktopLinks]) link.close();
      for (const cleanup of [...pendingCleanup]) await cleanMachine(cleanup);
      desktopServer.close();
      wsServer.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.env.LAB_CONTENT_MODULE) {
    const loaded = await loadLabContent(process.env.LAB_CONTENT_MODULE);
    console.log("Loaded " + loaded.length + " lab definition(s) from LAB_CONTENT_MODULE.");
  }
  if (CONFIG.enabled && CONFIG.sandboxBackend === "cloud") {
    const problems = cloudConfigurationProblems(CONFIG.cloud);
    if (problems.length) {
      console.error(
        "SANDBOX_BACKEND=cloud cannot start: " + problems.join("; "),
      );
      process.exit(1);
    }
  }
  const service = createSandboxOrchestrator();
  service.server.listen(CONFIG.port, CONFIG.host, () => {
    console.log(
      "Terminal service listening; " +
        (CONFIG.enabled ? "explicitly enabled" : "DISABLED") +
        "; backend " +
        runtimeDescription(CONFIG).runtime,
    );
  });
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () => {
      void service.close();
    });
}
