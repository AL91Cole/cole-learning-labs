import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { readFileSync } from "node:fs";
import WebSocket from "ws";
import {
  configuration,
  validateCloudflareUpgrade,
  buildDockerRunArgs,
  spawnSandboxContainer,
  verifyGoogleWorkspaceToken,
  createSandboxOrchestrator,
  validSnapshot,
} from "../server.js";

const ORIGIN = "http://127.0.0.1:8080",
  KEY = "test-only-" + "a".repeat(48);
const jpeg =
  "data:image/jpeg;base64," +
  Buffer.from("ffd8ffc00011080168028003011100021100031100ffd9", "hex").toString(
    "base64",
  );
async function fixture(t, overrides = {}, factory) {
  let clock = 100000;
  const runtimes = [];
  const fake = async () => {
    const sandbox = {
      mode: "docker-pty",
      writes: [],
      sizes: [],
      files: new Map(),
      destroyed: 0,
      onData(fn) {
        this.output = fn;
      },
      onExit(fn) {
        this.exit = fn;
      },
      write(data) {
        this.writes.push(data);
      },
      resize(cols, rows) {
        this.sizes.push([cols, rows]);
      },
      readFile: async (file) => sandbox.files.get(file) || null,
      destroy: async () => {
        sandbox.destroyed++;
      },
    };
    runtimes.push(sandbox);
    return sandbox;
  };
  const service = createSandboxOrchestrator(
    {
      enabled: true,
      teacherKey: KEY,
      allowInsecureLocalhost: true,
      allowedOrigins: new Set([ORIGIN]),
      authTimeoutMs: 1000,
      ...overrides,
    },
    { sandboxFactory: factory || fake, now: () => clock },
  );
  await new Promise((resolve) =>
    service.server.listen(0, "127.0.0.1", resolve),
  );
  const address = "ws://127.0.0.1:" + service.server.address().port + "/ws";
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.ws.terminate();
    await service.close();
  });
  async function client(
    auth = { role: "student" },
    origin = ORIGIN,
    suffix = "",
  ) {
    const ws = new WebSocket(address + suffix, {
        headers: origin ? { Origin: origin } : {},
      }),
      messages = [];
    let read = 0;
    ws.on("error", () => {});
    ws.on("message", (raw) => {
      messages.push(JSON.parse(raw));
    });
    const opened = new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    const item = {
      ws,
      messages,
      send: (value) => ws.send(JSON.stringify(value)),
      async next(predicate) {
        for (let i = 0; i < 200; i++) {
          const match = messages.slice(read).findIndex(predicate);
          if (match >= 0) {
            const result = messages[read + match];
            read += match + 1;
            return result;
          }
          await delay(5);
        }
        throw Error("Expected WS message absent: " + JSON.stringify(messages));
      },
    };
    clients.push(item);
    await opened;
    if (auth) {
      item.send({ type: "auth", ...auth });
      await item.next((m) => m.type === "auth:ok" || m.type === "error");
    }
    return item;
  }
  async function teacher() {
    return client({ role: "teacher", teacherKey: KEY });
  }
  async function room(owner) {
    owner.send({ type: "classroom:create" });
    return (await owner.next((m) => m.type === "classroom:created"))
      .classroomCode;
  }
  async function start(student, classroomCode = "") {
    student.send({
      type: "session:start",
      labId: "NET-201",
      mode: classroomCode ? "instructor-led" : "self-paced",
      classroomCode,
    });
    return student.next(
      (m) => m.type === "session:ready" || m.type === "error",
    );
  }
  return {
    service,
    runtimes,
    client,
    teacher,
    room,
    start,
    advance(ms) {
      clock += ms;
    },
    get clock() {
      return clock;
    },
  };
}

test("configuration is disabled by default and OAuth never trusts decoded or unavailable verification", async () => {
  assert.equal(configuration({}).enabled, false);
  assert.equal(configuration({}).authTimeoutMs, 5000);
  assert.equal(configuration({}).teacherKey, "");
  for (const token of [
    "",
    "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6InRlYWNoZXJAYXR0YWNrZXIudGVzdCIsImhkIjoic2Nob29sLnRlc3QifQ.",
  ]) {
    const response = await verifyGoogleWorkspaceToken(token);
    assert.equal(response.ok, false);
    assert.equal(response.error, "oauth_not_configured");
    assert.equal("role" in response, false);
  }
});

test("Origin is mandatory, exact, and HTTPS headers count only from the explicitly trusted peer", () => {
  const cfg = {
    ...configuration({}),
    allowedOrigins: new Set(["https://terminal.colelearninglabs.com"]),
    trustedProxyAddresses: new Set(["127.0.0.1"]),
  };
  const request = {
    headers: {
      origin: "https://terminal.colelearninglabs.com",
      "x-forwarded-proto": "https",
      "cf-ray": "forged",
    },
    socket: { remoteAddress: "203.0.113.4" },
  };
  assert.equal(validateCloudflareUpgrade(request, cfg).ok, false);
  assert.equal(
    validateCloudflareUpgrade(
      { ...request, socket: { remoteAddress: "127.0.0.1" } },
      cfg,
    ).ok,
    true,
  );
  for (const origin of [
    undefined,
    "null",
    "https://terminal.colelearninglabs.com.evil.test",
    "https://evil.test/?terminal.colelearninglabs.com",
    "https://terminal.colelearninglabs.com/",
  ])
    assert.equal(
      validateCloudflareUpgrade(
        {
          ...request,
          headers: { ...request.headers, origin },
          socket: { encrypted: true },
        },
        cfg,
      ).ok,
      false,
    );
  assert.equal(
    validateCloudflareUpgrade(
      {
        ...request,
        headers: { ...request.headers, "x-forwarded-proto": "https,http" },
        socket: { remoteAddress: "127.0.0.1" },
      },
      cfg,
    ).ok,
    false,
  );
});

test("Docker arguments have fixed isolation, quotas, TTL, no host mounts/network and no client-selected command", () => {
  const args = buildDockerRunArgs("cll-sandbox-" + "a".repeat(32));
  for (const value of [
    "--pull=never",
    "--memory=512m",
    "--memory-swap=512m",
    "--cpus=0.5",
    "--pids-limit=64",
    "--cap-drop=ALL",
    "no-new-privileges:true",
    "--read-only",
    "1000:1000",
    "none",
    "--signal=KILL",
  ])
    assert.ok(args.includes(value), value);
  assert.ok(
    args.some((value) =>
      value.includes("/home/learner:rw,noexec,nosuid,nodev,size=64m,uid=1000"),
    ),
  );
  assert.ok(!args.includes("--privileged"));
  assert.ok(!args.includes("--volume"));
  assert.throws(() => buildDockerRunArgs("untrusted;command"));
  assert.throws(() =>
    buildDockerRunArgs("cll-sandbox-" + "a".repeat(32), "--privileged"),
  );
});

test("private review containers receive only a validated instance label and keep their isolation", () => {
  const name = "cll-sandbox-" + "a".repeat(32),
    image = "cole-learning-labs/sandbox:alpine";
  const args = buildDockerRunArgs(name, image, {
    ...configuration({}),
    reviewInstanceId: "b".repeat(32),
  });
  assert.ok(args.includes("io.colelearninglabs.review=" + "b".repeat(32)));
  assert.ok(args.includes("--memory=512m"));
  assert.ok(args.includes("--read-only"));
  assert.equal(
    buildDockerRunArgs(name).some((value) =>
      value.startsWith("io.colelearninglabs.review="),
    ),
    false,
  );
  for (const reviewInstanceId of [
    "",
    "../other",
    "b".repeat(32) + " --privileged",
    {},
    null,
  ]) {
    assert.throws(
      () =>
        buildDockerRunArgs(name, image, {
          ...configuration({}),
          reviewInstanceId,
        }),
      /invalid_container_configuration/,
    );
  }
});

test("actual PTY adapter executes only docker, strips host credentials and cleans a failed PTY start without fallback", async () => {
  const calls = [],
    run = async (command, args) => {
      calls.push([command, args]);
      if (args[0] === "info") return { stdout: "linux\n" };
      if (args[0] === "run") return { stdout: "a".repeat(64) };
      return { stdout: "" };
    };
  let environment;
  await assert.rejects(
    spawnSandboxContainer({}, configuration({}), {
      exec: run,
      pty: {
        spawn(command, args, options) {
          assert.equal(command, "docker");
          assert.deepEqual(args.slice(0, 3), ["exec", "-it", "--user"]);
          environment = options.env;
          throw Error("PTY unavailable");
        },
      },
    }),
    /docker_pty_unavailable/,
  );
  assert.ok(calls.every(([command]) => command === "docker"));
  assert.ok(calls.some(([, args]) => args[0] === "rm" && args[1] === "-f"));
  assert.deepEqual(Object.keys(environment).sort(), ["HOME", "PATH", "TERM"]);
  const only = [];
  await assert.rejects(
    spawnSandboxContainer({}, configuration({}), {
      exec: async (command, args) => {
        only.push(command);
        throw Error("Daemon offline");
      },
      pty: {
        spawn() {
          assert.fail("No process may spawn when Docker is offline.");
        },
      },
    }),
    /docker_pty_unavailable/,
  );
  assert.deepEqual(only, ["docker"]);
});

test("disabled service and absent/bad Origins reject WS before a container or authentication route exists", async (t) => {
  const f = await fixture(t, { enabled: false });
  await assert.rejects(f.client(null), /503/);
  assert.equal(f.runtimes.length, 0);
  const health = await fetch(
    "http://127.0.0.1:" + f.service.server.address().port + "/api/health",
  );
  assert.equal((await health.json()).status, "disabled");
  const oldAuth = await fetch(
    "http://127.0.0.1:" + f.service.server.address().port + "/api/auth/session",
    { method: "POST", body: JSON.stringify({ role: "teacher" }) },
  );
  assert.notEqual(oldAuth.status, 200);
});

test("teacher privilege cannot be self-granted, query credentials are rejected, and unauthenticated sockets time out", async (t) => {
  const f = await fixture(t, { authTimeoutMs: 35 });
  const wrong = await f.client(null);
  wrong.send({ type: "auth", role: "teacher", teacherKey: "guessed" });
  assert.equal(
    (await wrong.next((m) => m.type === "error")).code,
    "teacher_authentication_failed",
  );
  await assert.rejects(f.client(null, ORIGIN, "?token=secret"), /400/);
  await assert.rejects(f.client(null, ""), /403/);
  const pending = await f.client(null);
  await delay(80);
  assert.equal(pending.ws.readyState, WebSocket.CLOSED);
  assert.equal(f.runtimes.length, 0);
});

test("a proxy-shared upgrade budget accommodates a class and reconnects while remaining bounded", async (t) => {
  const f = await fixture(t, { maxUpgradesPerPeerMinute: 32 });
  for (let i = 0; i < 32; i++) {
    const client = await f.client();
    const closed = new Promise((resolve) => client.ws.once("close", resolve));
    client.ws.close();
    await closed;
  }
  await assert.rejects(f.client(), /429/);
  assert.equal(f.runtimes.length, 0);
});

test("teacher/class ownership protects roster, snapshots and overrides from students and another authenticated teacher", async (t) => {
  const f = await fixture(t),
    a = await f.teacher(),
    b = await f.teacher(),
    code = await f.room(a),
    student = await f.client();
  assert.match(code, /^CLL-[A-F0-9]{24}$/);
  const ready = await f.start(student, code);
  assert.equal(ready.runtimeMode, "docker-pty");
  assert.equal(ready.lab.id, "NET-201");
  const roster = await a.next(
    (m) => m.type === "classroom:snapshot" && m.student.milestones.length === 4,
  );
  assert.equal(
    roster.student.milestones.every((m) => m.completed === false),
    true,
  );
  b.send({ type: "classroom:subscribe", classroomCode: code });
  assert.equal(
    (await b.next((m) => m.type === "error")).code,
    "classroom_denied",
  );
  student.send({
    type: "classroom:control",
    classroomCode: code,
    action: "override-command",
    command: "id",
  });
  assert.equal(
    (await student.next((m) => m.type === "error")).code,
    "student_action_denied",
  );
  b.send({
    type: "classroom:control",
    classroomCode: code,
    action: "override-command",
    command: "id",
  });
  assert.equal(
    (await b.next((m) => m.type === "error")).code,
    "classroom_denied",
  );
  assert.deepEqual(f.runtimes[0].writes, []);
  const response = await fetch(
    "http://127.0.0.1:" +
      f.service.server.address().port +
      "/api/classrooms/" +
      code +
      "/snapshots",
  );
  assert.equal(response.status, 404);
});

test("snapshot sharing requires separate consent, stays in the joined class and is deleted on revoke/leave/disconnect", async (t) => {
  const f = await fixture(t),
    teacher = await f.teacher(),
    code = await f.room(teacher),
    student = await f.client();
  const ready = await f.start(student, code);
  assert.equal(validSnapshot(jpeg), true);
  assert.equal(validSnapshot("data:image/png;base64,AAAA"), false);
  student.send({ type: "screen:snapshot", dataUrl: jpeg });
  assert.equal(
    (await student.next((m) => m.type === "error")).code,
    "snapshot_not_authorized",
  );
  student.send({ type: "screen:consent", enabled: true });
  assert.equal(
    (await student.next((m) => m.type === "screen:consent-state")).enabled,
    true,
  );
  student.send({ type: "screen:snapshot", dataUrl: jpeg });
  await student.next((m) => m.type === "screen:snapshot-ack");
  const image = await teacher.next(
    (m) => m.type === "classroom:snapshot" && m.student.snapshotDataUrl,
  );
  assert.equal(image.student.sessionId, ready.sessionId);
  assert.equal(image.student.snapshotDataUrl, jpeg);
  student.send({ type: "screen:consent", enabled: false });
  await student.next((m) => m.type === "screen:consent-state");
  const revoked = await teacher.next(
    (m) => m.type === "classroom:snapshot" && !m.student.snapshotConsented,
  );
  assert.equal(revoked.student.snapshotDataUrl, null);
  student.send({ type: "screen:consent", enabled: true });
  await student.next((m) => m.type === "screen:consent-state");
  student.send({ type: "screen:snapshot", dataUrl: jpeg });
  assert.equal(
    (await student.next((m) => m.type === "error")).code,
    "snapshot_rate_limit",
    "Revoking consent must not bypass snapshot rate limits.",
  );
  student.send({ type: "classroom:join", classroomCode: "" });
  await student.next((m) => m.type === "classroom:joined");
  assert.equal(
    (await teacher.next((m) => m.type === "classroom:student-left")).sessionId,
    ready.sessionId,
  );
  assert.equal(f.service.sessions.get(ready.sessionId).snapshot, null);
  student.send({ type: "classroom:join", classroomCode: code });
  await student.next((m) => m.type === "classroom:joined");
  student.ws.close();
  await teacher.next((m) => m.type === "classroom:student-left");
  await delay(10);
  assert.equal(f.service.sessions.size, 0);
  assert.equal(f.runtimes[0].destroyed, 1);
});

test("pause cannot be escaped by rejoining, teacher commands are scoped and not student command-history credit", async (t) => {
  const f = await fixture(t),
    teacher = await f.teacher(),
    code = await f.room(teacher),
    student = await f.client();
  await f.start(student, code);
  teacher.send({
    type: "classroom:control",
    classroomCode: code,
    action: "pause",
  });
  await teacher.next((m) => m.type === "classroom:control-ack");
  student.send({ type: "classroom:join", classroomCode: "" });
  await student.next((m) => m.type === "classroom:joined");
  student.send({ type: "classroom:join", classroomCode: code });
  await student.next((m) => m.type === "classroom:joined");
  student.send({ type: "terminal:input", data: "id\r" });
  assert.equal(
    (await student.next((m) => m.type === "error")).code,
    "input_paused",
  );
  teacher.send({
    type: "classroom:control",
    classroomCode: code,
    action: "override-command",
    command: "cat ~/lab/network-sheet.txt",
  });
  await teacher.next((m) => m.type === "classroom:control-ack");
  assert.deepEqual(f.runtimes[0].writes, ["cat ~/lab/network-sheet.txt\r"]);
  assert.deepEqual([...f.service.sessions.values()][0].commandHistory, []);
});

test("global pending reservations prevent over-allocation and disconnect during spawn destroys the returned runtime", async (t) => {
  let resolve;
  const deferred = new Promise((done) => {
    resolve = done;
  });
  const runtime = {
    destroyed: 0,
    destroy: async () => {
      runtime.destroyed++;
    },
  };
  const f = await fixture(t, { maxSessions: 1 }, () => deferred),
    a = await f.client(),
    b = await f.client();
  a.send({ type: "session:start", labId: "NET-201" });
  await delay(10);
  assert.equal((await f.start(b)).code, "capacity_reached");
  a.ws.close();
  await delay(10);
  resolve(runtime);
  await delay(20);
  assert.equal(runtime.destroyed, 1);
  assert.equal(f.service.sessions.size, 0);
});

test("per-class pending reservations bound a concurrent join before Docker starts", async (t) => {
  let resolve;
  const deferred = new Promise((done) => {
    resolve = done;
  });
  const runtime = {
    destroy: async () => {},
    onData() {},
    onExit() {},
    readFile: async () => null,
  };
  const f = await fixture(t, { maxStudentsPerClass: 1 }, () => deferred),
    teacher = await f.teacher(),
    code = await f.room(teacher),
    a = await f.client(),
    b = await f.client();
  a.send({
    type: "session:start",
    labId: "NET-201",
    mode: "instructor-led",
    classroomCode: code,
  });
  await delay(10);
  assert.equal((await f.start(b, code)).code, "classroom_unavailable");
  resolve(runtime);
  await a.next((m) => m.type === "session:ready");
  assert.equal(f.service.sessions.size, 1);
});

test("an existing session cannot take a class slot reserved for a pending container", async (t) => {
  let resolve;
  const deferred = new Promise((done) => {
    resolve = done;
  });
  let starts = 0;
  const runtime = () => ({
    destroy: async () => {},
    onData() {},
    onExit() {},
    readFile: async () => null,
  });
  const f = await fixture(t, { maxStudentsPerClass: 1 }, async () =>
      ++starts === 1 ? runtime() : deferred,
    ),
    teacher = await f.teacher(),
    code = await f.room(teacher),
    existing = await f.client(),
    pending = await f.client();
  await f.start(existing);
  pending.send({
    type: "session:start",
    labId: "NET-201",
    mode: "instructor-led",
    classroomCode: code,
  });
  await delay(10);
  existing.send({ type: "classroom:join", classroomCode: code });
  assert.equal(
    (await existing.next((m) => m.type === "error")).code,
    "classroom_unavailable",
  );
  resolve(runtime());
  await pending.next((m) => m.type === "session:ready");
  assert.equal(
    [...f.service.sessions.values()].filter(
      (session) => session.classroomCode === code,
    ).length,
    1,
  );
});

test("PTY failure, resize limits, message limits, and output floods fail closed", async (t) => {
  const bad = await fixture(t, {}, async () => {
      throw Error("No Docker");
    }),
    student = await bad.client();
  assert.equal((await bad.start(student)).code, "sandbox_unavailable");
  assert.equal(bad.service.sessions.size, 0);
  const f = await fixture(t, { maxOutputBytesPerSecond: 20 }),
    a = await f.client();
  await f.start(a);
  a.send({ type: "terminal:resize", cols: 100000, rows: 24 });
  assert.equal(
    (await a.next((m) => m.type === "error")).code,
    "invalid_dimensions",
  );
  assert.deepEqual(f.runtimes[0].sizes, []);
  f.runtimes[0].output("x".repeat(100));
  await a.next((m) => m.type === "session:terminated");
  assert.equal(f.runtimes[0].destroyed, 1);
  assert.equal(f.service.sessions.size, 0);
});

test("heartbeats and snapshots do not defeat inactivity cleanup, and absolute age bounds active work", async (t) => {
  const f = await fixture(t, {
      inactivityTimeoutMs: 1000,
      maxLifetimeMs: 3000,
    }),
    a = await f.client();
  await f.start(a);
  f.advance(1100);
  a.send({ type: "ping" });
  await a.next((m) => m.type === "pong");
  await f.service.reap();
  await a.next((m) => m.type === "session:terminated");
  assert.equal(f.runtimes[0].destroyed, 1);
  const b = await f.client();
  await f.start(b);
  f.advance(1000);
  b.send({ type: "terminal:input", data: "x" });
  await delay(10);
  f.advance(1000);
  b.send({ type: "terminal:input", data: "y" });
  await delay(10);
  f.advance(1001);
  await f.service.reap();
  assert.equal(f.service.sessions.size, 0);
});

test("only allowlisted static assets are served under restrictive no-store headers", async (t) => {
  const f = await fixture(t);
  const base = "http://127.0.0.1:" + f.service.server.address().port;
  for (const target of [
    "/server.js",
    "/package.json",
    "/.env",
    "/api/classrooms/X/control",
    "/vendor/../../server.js",
  ])
    assert.equal((await fetch(base + target)).status, 404, target);
  const response = await fetch(base + "/api/labs");
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-security-policy"),
    /script-src 'self'/,
  );
  assert.match(
    response.headers.get("content-security-policy"),
    /style-src-elem 'self' 'unsafe-inline'/,
    "xterm needs its runtime CSS elements without permitting inline scripts",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).labs.length, 3);
  for (const [target, type] of [
    ["/vendor/xterm/xterm.js", "javascript"],
    ["/vendor/xterm/addon-fit.js", "javascript"],
    ["/vendor/xterm/xterm.css", "css"],
  ]) {
    const asset = await fetch(base + target);
    assert.equal(asset.status, 200, target);
    assert.match(asset.headers.get("content-type"), new RegExp(type));
    assert.ok((await asset.text()).length > 1000, target);
  }
  const source = readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /FallbackAlpineSandbox|FORCE_FALLBACK|createSessionToken|decode.*JWT|spawn\(['"](?:sh|bash|powershell|cmd)/i,
  );
});
