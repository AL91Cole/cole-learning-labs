import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { Readable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import {
  REVIEW_URL,
  reviewPaths,
  validateState,
  controlEndpoint,
  matchingToken,
  preparePrivateDirectory,
  ensureTeacherKey,
  readPrivate,
  readState,
  atomicPrivateWrite,
  checkPrerequisites,
  requestControl,
  checkPortAvailable,
  removeOrphanContainers,
} from "../scripts/review-common.mjs";
import {
  startReview,
  statusReview,
  stopReview,
} from "../scripts/review-service.mjs";
import {
  bootstrapFromPipe,
  createReviewControl,
} from "../scripts/review-runner.mjs";

const state = (overrides = {}) => ({
  version: 1,
  instanceId: "a".repeat(32),
  controlToken: "b".repeat(64),
  pid: process.pid,
  createdAt: "2026-10-18T20:00:00.000Z",
  ...overrides,
});
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "cll-local-review-"));
  t.after(async () => {
    if (path.basename(root).startsWith("cll-local-review-"))
      await fs.rm(root, { recursive: true, force: true });
  });
  await fs.mkdir(path.join(root, "scripts"));
  await fs.copyFile(
    new URL("../scripts/harden-review.ps1", import.meta.url),
    path.join(root, "scripts", "harden-review.ps1"),
  );
  const paths = reviewPaths(root);
  await preparePrivateDirectory(paths);
  return paths;
}

test("private state has exact typed fields and endpoints cannot select a host, port or unrelated pipe", () => {
  assert.equal(validateState(state()).version, 1);
  for (const value of [
    null,
    [],
    state({ extra: true }),
    state({ instanceId: ["a".repeat(32)] }),
    state({ controlToken: "../credential" }),
    state({ pid: -1 }),
    state({ pid: 2.5 }),
    state({ createdAt: "not a date" }),
    state({ createdAt: "2026-10-18" }),
  ])
    assert.throws(() => validateState(value));
  assert.throws(() => reviewPaths("relative"));
  const paths = reviewPaths(path.resolve("test-service"));
  assert.match(
    controlEndpoint(paths, "a".repeat(32), "win32"),
    /^\\\\\.\\pipe\\cll-pr22-[a-f0-9]{16}-[a-f0-9]{32}$/,
  );
  assert.throws(() => controlEndpoint(paths, "..\\foreign"));
  assert.equal(matchingToken("b".repeat(64), "b".repeat(64)), true);
  assert.equal(matchingToken("b".repeat(64), "c".repeat(64)), false);
  assert.equal(matchingToken(["b".repeat(64)], "b".repeat(64)), false);
});

test("teacher credentials are generated privately once, reused, ignored and never stored in owner state", async (t) => {
  const paths = await fixture(t),
    key = await ensureTeacherKey(paths);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(await ensureTeacherKey(paths), key);
  assert.equal(
    await readPrivate(path.join(paths.directory, ".gitignore")),
    "*\n",
  );
  assert.match(await readPrivate(paths.credentials), new RegExp(key));
  assert.equal(await readState(paths), null);
  if (process.platform !== "win32") {
    assert.equal((await fs.stat(paths.directory)).mode & 0o777, 0o700);
    for (const file of [paths.key, paths.credentials])
      assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  }
  await fs.writeFile(paths.key, "TEACHER_ACCESS_KEY=invalid\n");
  await assert.rejects(ensureTeacherKey(paths), /malformed/);
});

test("private paths reject symlink/junction redirection and malformed owner state", async (t) => {
  const paths = await fixture(t);
  await atomicPrivateWrite(paths.active, JSON.stringify(state()));
  assert.equal((await readState(paths)).pid, process.pid);
  await atomicPrivateWrite(
    paths.active,
    JSON.stringify(state({ teacherKey: "must-not-be-trusted" })),
  );
  await assert.rejects(readState(paths), /Invalid private/);
  const malformedSecret = "sensitive-owner-token";
  await atomicPrivateWrite(
    paths.active,
    '{"controlToken":"' + malformedSecret + '",broken}',
  );
  await assert.rejects(readState(paths), (error) => {
    assert.doesNotMatch(error.message, new RegExp(malformedSecret));
    assert.match(error.message, /Invalid private/);
    return true;
  });
  const outside = await fs.mkdtemp(
    path.join(os.tmpdir(), "cll-local-outside-"),
  );
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  const redirected = reviewPaths(path.join(paths.base, "redirected"));
  await fs.mkdir(redirected.base);
  await fs.symlink(
    outside,
    redirected.directory,
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(preparePrivateDirectory(redirected), /links/);
});

test("start fails cleanly for missing dependencies without an active owner, process or generated credential", async (t) => {
  const paths = await fixture(t);
  await assert.rejects(startReview(paths), /dependencies are missing/);
  assert.equal(await readState(paths), null);
  await assert.rejects(fs.access(paths.key));
  await assert.rejects(fs.access(paths.lock));
  assert.deepEqual(await statusReview(paths), { status: "stopped" });
});

test("a live start lock prevents stop from acting on a transient pending owner record", async (t) => {
  const paths = await fixture(t);
  await atomicPrivateWrite(paths.active, JSON.stringify(state({ pid: 0 })));
  await atomicPrivateWrite(
    paths.lock,
    JSON.stringify({ pid: process.pid, token: "pending-start" }),
  );
  await assert.rejects(stopReview(paths), /Another local start/);
  assert.equal((await readState(paths)).pid, 0);
});

test("bootstrap requires bounded pipe data and never obtains its token from an argument or environment", async () => {
  assert.deepEqual(
    await bootstrapFromPipe(
      Readable.from([
        JSON.stringify({
          instanceId: "a".repeat(32),
          controlToken: "b".repeat(64),
        }),
      ]),
    ),
    { instanceId: "a".repeat(32), controlToken: "b".repeat(64) },
  );
  await assert.rejects(
    bootstrapFromPipe(Readable.from(["not-json"])),
    /Invalid bootstrap/,
  );
  await assert.rejects(
    bootstrapFromPipe(Readable.from(["a".repeat(1025)])),
    /Invalid bootstrap/,
  );
});

test("local IPC verifies token and exact instance/PID before trusting status or shutdown", async (t) => {
  const paths = await fixture(t),
    active = state({ instanceId: "c".repeat(32) });
  const server = net.createServer((socket) => {
    let input = "";
    socket.on("data", (chunk) => {
      input += chunk;
      if (!input.includes("\n")) return;
      const message = JSON.parse(input);
      if (!matchingToken(message.controlToken, active.controlToken))
        return socket.end(
          JSON.stringify({ ok: false, error: "denied" }) + "\n",
        );
      socket.end(
        JSON.stringify({
          ok: true,
          instanceId: active.instanceId,
          pid: active.pid,
          status: message.action === "stop" ? "stopping" : "running",
        }) + "\n",
      );
    });
  });
  await new Promise((resolve) =>
    server.listen(controlEndpoint(paths, active.instanceId), resolve),
  );
  t.after(() => new Promise((resolve) => server.close(resolve)));
  assert.equal(
    (await requestControl(paths, active, "status")).status,
    "running",
  );
  assert.equal(
    (await requestControl(paths, active, "stop")).status,
    "stopping",
  );
  await assert.rejects(
    requestControl(paths, { ...active, controlToken: "d".repeat(64) }, "stop"),
    /ownership was not confirmed/,
  );
  await assert.rejects(
    requestControl(paths, { ...active, pid: active.pid + 1 }, "status"),
    /ownership was not confirmed/,
  );
});

test("an occupied loopback port is refused without closing the foreign listener", async (t) => {
  const foreign = net.createServer();
  await new Promise((resolve) => foreign.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => foreign.close(resolve)));
  await assert.rejects(
    checkPortAvailable(foreign.address().port),
    /occupied.*Nothing was stopped/,
  );
  assert.equal(foreign.listening, true);
});

test(
  "malformed IPC cannot crash the controller and an open half cannot hold shutdown indefinitely",
  { timeout: 6000 },
  async (t) => {
    const paths = await fixture(t),
      active = state({ instanceId: "e".repeat(32) });
    let stopped = 0;
    const { control, sockets } = createReviewControl(
      active,
      () => ({ sessions: 2, classrooms: 1 }),
      async () => {
        stopped++;
        for (const socket of sockets) socket.destroy();
      },
    );
    await new Promise((resolve) =>
      control.listen(controlEndpoint(paths, active.instanceId), resolve),
    );
    t.after(() => {
      for (const socket of sockets) socket.destroy();
      return new Promise((resolve) => control.close(resolve));
    });
    for (const malformed of ["null", "42", "true", '"text"', "[]", "{}"])
      await new Promise((resolve, reject) => {
        const socket = net.createConnection(
          controlEndpoint(paths, active.instanceId),
        );
        socket.on("error", reject);
        socket.once("connect", () => socket.end(malformed + "\n"));
        socket.once("close", resolve);
      });
    const healthy = await requestControl(paths, active, "status");
    assert.equal(healthy.sessions, 2);
    assert.equal(stopped, 0);
    const held = net.createConnection({
      path: controlEndpoint(paths, active.instanceId),
      allowHalfOpen: true,
    });
    held.on("error", () => {});
    await new Promise((resolve) => held.once("connect", resolve));
    held.write(
      JSON.stringify({
        instanceId: active.instanceId,
        controlToken: active.controlToken,
        action: "stop",
      }) + "\n",
    );
    held.on("data", () => {});
    for (let i = 0; i < 120 && !stopped; i++) await delay(25);
    assert.equal(
      stopped,
      1,
      "An absolute IPC deadline must release an intentionally open readable half.",
    );
    held.destroy();
  },
);

test("unconfirmed live PID is never killed by stop and ownership state stays intact", async (t) => {
  const paths = await fixture(t);
  await atomicPrivateWrite(paths.active, JSON.stringify(state()));
  await assert.rejects(stopReview(paths), /No process was stopped/);
  assert.equal((await readState(paths)).pid, process.pid);
});

test("orphan cleanup requires absent owner and two exact labels, never prune or global name matching", async () => {
  const calls = [],
    id = "f".repeat(64),
    active = state({ pid: 2147483647 });
  const run = async (command, args) => {
    calls.push([command, args]);
    if (args[0] === "ps") return { stdout: id + "\n" };
    if (args[0] === "inspect")
      return {
        stdout: JSON.stringify([
          {
            Id: id,
            Config: {
              Labels: {
                "io.colelearninglabs.terminal": "1",
                "io.colelearninglabs.review": active.instanceId,
              },
            },
          },
        ]),
      };
    return { stdout: "" };
  };
  assert.equal(await removeOrphanContainers(active, run), 1);
  assert.ok(
    calls[0][1].includes(
      "label=io.colelearninglabs.review=" + active.instanceId,
    ),
  );
  assert.deepEqual(calls.at(-1), ["docker", ["rm", "-f", id]]);
  assert.ok(
    calls.every(
      ([command, args]) => command === "docker" && !args.includes("prune"),
    ),
  );
  await assert.rejects(
    removeOrphanContainers(state(), run),
    /PID still exists/,
  );
  const wrong = [];
  await assert.rejects(
    removeOrphanContainers(active, async (command, args) => {
      wrong.push(args);
      return args[0] === "ps"
        ? { stdout: id }
        : {
            stdout: JSON.stringify([
              {
                Id: id,
                Config: {
                  Labels: {
                    "io.colelearninglabs.terminal": "1",
                    "io.colelearninglabs.review": "0".repeat(32),
                  },
                },
              },
            ]),
          };
    }),
    /verify review container ownership/,
  );
  assert.equal(
    wrong.some((args) => args[0] === "rm"),
    false,
  );
});

test("local runner source keeps fixed loopback and test-only constructor limits without key-bearing argv or host shell", async () => {
  const runner = await fs.readFile(
      new URL("../scripts/review-runner.mjs", import.meta.url),
      "utf8",
    ),
    helper = await fs.readFile(
      new URL("../scripts/review-service.mjs", import.meta.url),
      "utf8",
    );
  assert.match(runner, /configuration\(\{\}\)/);
  for (const [key, value] of [
    ["maxSessions", 4],
    ["maxConnections", 12],
    ["maxClassrooms", 2],
    ["maxStudentsPerClass", 4],
  ])
    assert.match(runner, new RegExp(key + "\\s*:\\s*" + value));
  assert.match(runner, /127\.0\.0\.1/);
  assert.doesNotMatch(runner, /0\.0\.0\.0|localhost/);
  assert.match(helper, /windowsHide:\s*true/);
  assert.doesNotMatch(helper, /process\.kill\([^,]+,\s*['"]SIG/);
  assert.equal(REVIEW_URL, "http://127.0.0.1:8080");
});

test("Windows ACL hardening preserves existing owner and modifies only access rules", async () => {
  const script = await fs.readFile(
    new URL("../scripts/harden-review.ps1", import.meta.url),
    "utf8",
  );
  assert.match(script, /ownerBefore.*GetOwner/);
  assert.match(script, /ownerBefore\.Value -ne \$current\.Value/);
  assert.doesNotMatch(
    script,
    /\.SetOwner\(|takeown|\/setowner|SeTakeOwnershipPrivilege|SeRestorePrivilege/i,
  );
  assert.match(script, /\.SetAccessRuleProtection\(\$true, \$false\)/);
  assert.match(script, /\.SetAccessControl\(\$acl\)/);
  assert.match(script, /Private review ownership changed unexpectedly/);
});
