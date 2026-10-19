/** Separate, disabled-by-default Docker terminal service. No host-shell or simulated fallback. */
import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { WebSocketServer } from "ws";

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
const labFor = (id) =>
  typeof id === "string" && Object.hasOwn(SELF_PACED_LABS, id)
    ? SELF_PACED_LABS[id]
    : null;

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
    destroyed = false;
  const docker = (args, timeout = 5000, maxBuffer = 65536) =>
    run("docker", args, {
      timeout,
      maxBuffer,
      windowsHide: true,
      encoding: "utf8",
    });
  const destroy = async () => {
    if (destroyed) return;
    destroyed = true;
    try {
      processPty?.kill();
    } catch {}
    if (created) {
      await docker(["rm", "-f", name]).catch(() => {});
    }
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
      Object.values(SELF_PACED_LABS).flatMap((lab) =>
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
    await destroy();
    throw failure("docker_pty_unavailable");
  }
}

export async function verifySessionMilestones(session) {
  const lab = labFor(session.labId);
  if (!lab || !session.sandbox) return [];
  const results = [];
  for (const item of lab.milestones) {
    let completed = false;
    if (item.checkType === "history_regex")
      completed = session.commandHistory.some((line) =>
        item.pattern.test(line),
      );
    else {
      let content = null;
      try {
        content = await session.sandbox.readFile(item.filePath);
      } catch {}
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

export function createSandboxOrchestrator(overrides = {}, deps = {}) {
  const cfg = { ...CONFIG, ...overrides },
    sessions = new Map(),
    classrooms = new Map(),
    connections = new Set(),
    upgradeRates = new Map();
  const sandboxFactory = deps.sandboxFactory || spawnSandboxContainer,
    now = deps.now || Date.now;
  let stopping = false,
    pendingStarts = 0;
  const wsServer = new WebSocketServer({
    noServer: true,
    maxPayload: cfg.maxMessageBytes,
    perMessageDeflate: false,
    maxFragments: 128,
    maxBufferedChunks: 128,
    closeTimeout: 1000,
  });
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
      return json(res, 200, {
        status: cfg.enabled ? "enabled" : "disabled",
        runtime: "docker-pty",
        productionApproved: false,
      });
    if (url.pathname === "/api/labs")
      return json(res, 200, {
        labs: Object.values(SELF_PACED_LABS).map(publicLab),
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
    try {
      await s.sandbox?.destroy();
    } catch {
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
        runtimeMode: "docker-pty",
        limits: {
          memory: "512m",
          cpus: "0.5",
          inactivityTimeoutSeconds: cfg.inactivityTimeoutMs / 1000,
        },
        lab: publicLab(lab),
        milestones: s.milestones,
      });
    } catch {
      sessions.delete(s.id);
      if (c.session === s) c.session = null;
      s.destroyed = true;
      if (s.sandbox) await s.sandbox.destroy().catch(() => {});
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
    if (url.pathname !== "/ws" || url.search) return reject(400);
    if (!cfg.enabled || stopping) return reject(503);
    const validation = validateCloudflareUpgrade(req, cfg);
    if (!validation.ok) return reject(validation.status);
    if (connections.size >= cfg.maxConnections) return reject(503);
    const address = req.socket.remoteAddress || "";
    const previous = upgradeRates.get(address);
    if (!previous || now() - previous.at >= 60000) {
      if (upgradeRates.size >= 1024) upgradeRates.clear();
      upgradeRates.set(address, { at: now(), count: 1 });
    } else if (++previous.count > cfg.maxUpgradesPerPeerMinute)
      return reject(429);
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
    for (const s of [...sessions.values()])
      if (
        now() - s.lastActivity >= cfg.inactivityTimeoutMs ||
        now() - s.created >= cfg.maxLifetimeMs
      )
        await destroySession(s, "session_expired");
    for (const c of connections)
      if (
        now() - c.created >= cfg.maxLifetimeMs ||
        (c.role === "teacher" &&
          now() - c.lastActivity >= cfg.inactivityTimeoutMs)
      )
        c.ws.close(1000, "Session expired");
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
  const service = createSandboxOrchestrator();
  service.server.listen(CONFIG.port, CONFIG.host, () => {
    console.log(
      "Terminal service listening; " +
        (CONFIG.enabled ? "explicitly enabled" : "DISABLED"),
    );
  });
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () => {
      void service.close();
    });
}
