import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  cloudConfiguration,
  cloudConfigurationProblems,
  createTokenSource,
  buildCloudSandboxRequest,
  spawnCloudSandbox,
  CLOUD_SIZES,
  DEFAULT_START_COMMAND,
  trimTrailingSlashes,
  processResourceName,
  buildSeedScript,
  loadSeedFiles,
} from "../cloud-sandboxes.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configuration, runtimeDescription, createSandboxOrchestrator } from "../server.js";

const jwt = (expSeconds) =>
  "h." + Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url") + ".s";
const response = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body ?? {})),
  arrayBuffer: async () =>
    Buffer.from(typeof body === "string" ? body : JSON.stringify(body ?? {})),
});

const ENV = {
  SANDBOX_BACKEND: "cloud",
  DOCKER_ID: "al91cole",
  DOCKER_PAT: "dckr_pat_test",
  SANDBOX_IMAGE_REF: "docker.io/al91cole/cll-sandbox:cloud",
  SANDBOX_SIZE: "small",
};

/** A fake of Docker's management API plus one sandbox endpoint. */
function fakeDocker({ pollsBeforeRunning = 1, failCreate = null, deleteStatuses = [200], setupExitCode = 0, setupPolls = 2 } = {}) {
  const calls = [];
  const sockets = [];
  const processes = [];
  let setupLookups = 0;
  let polls = 0,
    exchanges = 0,
    credentials = 0,
    etagVersion = 1;
  const sandboxBody = (status) => ({
    name: "sandboxes/sbx-123",
    uid: "sbx-123",
    core: {
      status,
      etag: `"v${etagVersion}"`,
      endpoint:
        status === "running"
          ? {
              uri: "https://sbx-123.endpoint.example/api",
              capabilities: ["createProcess", "interact", "readFile", "writeFile"],
            }
          : undefined,
    },
  });
  const files = new Map([["/home/learner/lab/code/results.txt", "ALL_FIXTURES_PASS\n"]]);
  const fetch = async (url, init = {}) => {
    const method = init.method || "GET";
    const headers = init.headers || {};
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, url, headers, body });
    if (url === "https://hub.docker.com/v2/auth/token") {
      exchanges++;
      assert.deepEqual(body, { identifier: "al91cole", secret: "dckr_pat_test" });
      return response(200, { access_token: jwt(Math.floor(Date.now() / 1000) + 3600) });
    }
    if (url.startsWith("https://connect.docker.com/sandboxes/v1/")) {
      assert.match(headers.Authorization, /^Bearer h\./);
      const path = url.slice("https://connect.docker.com/sandboxes/v1".length);
      if (method === "POST" && path === "/sandboxes") {
        if (failCreate) return response(failCreate.status, failCreate.body);
        return response(200, sandboxBody("creating"));
      }
      if (method === "GET" && path === "/sandboxes/sbx-123") {
        polls++;
        return response(200, sandboxBody(polls >= pollsBeforeRunning ? "running" : "starting"));
      }
      if (method === "POST" && path === "/sandboxes/sbx-123/endpoint-credentials") {
        credentials++;
        assert.deepEqual(body.permissions, ["sandboxesExec", "sandboxesFilesRead"]);
        assert.equal(body.ttl, "300s");
        return response(200, {
          token: "scoped-" + credentials,
          expireTime: new Date(Date.now() + 300000).toISOString(),
        });
      }
      if (method === "DELETE" && path === "/sandboxes/sbx-123") {
        const status = deleteStatuses.shift() ?? 200;
        if (status === 412) etagVersion++;
        return response(status, status === 200 ? {} : { code: "failedPrecondition" });
      }
      return response(404, { code: "notFound" });
    }
    if (url.startsWith("https://sbx-123.endpoint.example/api/v1/")) {
      assert.match(headers.Authorization, /^Bearer scoped-/);
      const path = url.slice("https://sbx-123.endpoint.example/api".length);
      if (method === "POST" && path === "/v1/processes") {
        processes.push(body);
        if (body.cmd[0] === "/bin/sh" && body.cmd[1] === "-c") {
          assert.equal(body.pty, undefined, "setup runs without a terminal");
          return response(200, { name: "processes/setup-1", uid: "setup-1", state: "running", label: body.label });
        }
        assert.deepEqual(body.cmd, ["/bin/sh", "-i"]);
        assert.equal(body.workingDir, "/home/learner");
        assert.equal(body.user, "1000:1000");
        assert.deepEqual(body.pty, { initialSize: { rows: 24, cols: 80 } });
        return response(200, { name: "processes/p-9", uid: "p-9", state: "running", label: body.label });
      }
      if (method === "GET" && path === "/v1/processes/setup-1") {
        setupLookups++;
        if (setupLookups < setupPolls) return response(200, { name: "processes/setup-1", state: "running" });
        return response(200, { name: "processes/setup-1", state: "exited", exitCode: setupExitCode });
      }
      if (method === "GET" && path.startsWith("/v1/files/content?path=")) {
        const file = decodeURIComponent(path.slice("/v1/files/content?path=".length));
        if (!files.has(file)) return response(404, { code: "notFound" });
        const content = files.get(file);
        return response(200, content, { "content-length": String(Buffer.byteLength(content)) });
      }
    }
    return response(404, { code: "notFound" });
  };
  class FakeWebSocket extends EventEmitter {
    constructor(url, protocols, options) {
      super();
      this.url = url;
      this.protocols = protocols;
      this.options = options;
      this.sent = [];
      this.readyState = 0;
      sockets.push(this);
      setImmediate(() => {
        this.readyState = 1;
        this.emit("open");
      });
    }
    send(data) {
      this.sent.push(JSON.parse(data));
    }
    terminate() {
      this.readyState = 3;
    }
    close() {
      this.readyState = 3;
    }
    serverSays(frame) {
      this.emit("message", Buffer.from(JSON.stringify(frame)), false);
    }
  }
  return {
    fetch,
    WebSocket: FakeWebSocket,
    calls,
    sockets,
    files,
    processes,
    get exchanges() {
      return exchanges;
    },
    get credentials() {
      return credentials;
    },
  };
}

const cfgFor = (env = ENV) => ({ ...configuration({ ...env }), sleep: null });
const deps = (docker, extra = {}) => ({
  fetch: docker.fetch,
  WebSocket: docker.WebSocket,
  sleep: async () => {},
  pollIntervalMs: 0,
  allowedFiles: ["/home/learner/lab/code/results.txt"],
  seedScript: "set -e\necho SEED_OK\n",
  ...extra,
});

test("cloud configuration reads the backend, account, image and size from the environment", () => {
  const cfg = configuration({ ...ENV });
  assert.equal(cfg.sandboxBackend, "cloud");
  assert.equal(cfg.cloud.dockerId, "al91cole");
  assert.equal(cfg.cloud.size, "small");
  assert.equal(cfg.cloud.apiBase, "https://connect.docker.com/sandboxes/v1");
  assert.deepEqual(cloudConfigurationProblems(cfg.cloud), []);
  assert.equal(cfg.cloud.shellUser, "1000:1000");
  assert.ok(cfg.cloud.seedDirs[0].endsWith("sandbox-seed"), "the public sample seed is the default");
  assert.deepEqual(cloudConfiguration({ ...ENV, SANDBOX_SEED_DIRS: "/a/seed:/b/seed" }).seedDirs, ["/a/seed", "/b/seed"]);
  assert.deepEqual(cloudConfiguration({ ...ENV, SANDBOX_SEED_DIRS: "" }).seedDirs, []);
  assert.equal(cloudConfiguration({ ...ENV, SANDBOX_IMAGE_REF: "" }).imageRef, "docker.io/library/python:3.13-alpine");
  assert.ok(cloudConfigurationProblems(cloudConfiguration({ ...ENV, SANDBOX_SHELL_USER: "root; rm" }))[0].includes("SANDBOX_SHELL_USER"));
  assert.equal(configuration({}).sandboxBackend, "docker");
  assert.equal(cloudConfiguration({ SANDBOX_SIZE: "gigantic" }).size, "micro");
  const missing = cloudConfigurationProblems(cloudConfiguration({ SANDBOX_BACKEND: "cloud" }));
  assert.equal(missing.length, 2);
  assert.ok(cloudConfigurationProblems(cloudConfiguration({ ...ENV, SANDBOX_IMAGE_REF: "bad image;rm" }))[0].includes("valid"));
  assert.deepEqual(runtimeDescription(cfg), {
    runtime: "docker-cloud-sandbox",
    limits: { memory: "4096m", cpus: "2" },
  });
  assert.deepEqual(runtimeDescription(configuration({})), {
    runtime: "docker-pty",
    limits: { memory: "512m", cpus: "0.5" },
  });
});

test("helpers trim slashes and extract process names without regular expressions", () => {
  assert.equal(trimTrailingSlashes("https://x.example/api///"), "https://x.example/api");
  assert.equal(trimTrailingSlashes("////"), "");
  assert.equal(trimTrailingSlashes("plain"), "plain");
  assert.equal(processResourceName({ name: "processes/p-9" }), "processes/p-9");
  assert.equal(processResourceName({ name: "sandboxes/s/processes/p-9" }), "processes/p-9");
  assert.equal(processResourceName({ name: "processes/p-9/extra" }), "");
  assert.equal(processResourceName({ uid: "u-1" }), "processes/u-1");
  assert.equal(processResourceName({}), "");
});

test("the seed script creates the learner, writes the sample files safely and the public seed loads", async () => {
  const seed = await loadSeedFiles([path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sandbox-seed")]);
  const paths = seed.files.map((f) => f.path);
  assert.ok(paths.includes("code/program.py") && paths.includes("resolv.conf") && paths.includes("backups/lesson-plan-v2.txt"));
  assert.ok(seed.directories.includes("delivered"), "empty seed folders are created");
  assert.equal(seed.files.find((f) => f.path === "code/check").mode & 0o111, 0o111, "check keeps its executable bit");
  const script = buildSeedScript(seed);
  assert.match(script, /^set -e\n/);
  assert.match(script, /adduser -D -u 1000 .*\|\| useradd/);
  assert.match(script, /mkdir -p '\/home\/learner\/lab\/delivered'/);
  assert.ok(script.includes("printf '%s' '" + Buffer.from(seed.files.find((f) => f.path === "code/program.py").content).toString("base64") + "' | base64 -d > '/home/learner/lab/code/program.py'"));
  assert.match(script, /chmod 755 '\/home\/learner\/lab\/code\/check'/);
  assert.match(script, /chown -R 1000:1000 \/home\/learner\nchmod 700 \/home\/learner\necho SEED_OK\n$/);
  assert.ok(!/[^\x20-\x7e\n]/.test(script), "the script is plain ASCII, file contents stay base64");
  assert.throws(() => buildSeedScript({ directories: [], files: [{ path: "../etc/passwd", content: Buffer.from("x") }] }), /sandbox_seed_invalid/);
  assert.throws(() => buildSeedScript({ directories: ["a'b"], files: [] }), /sandbox_seed_invalid/);
  assert.deepEqual(await loadSeedFiles(["/nonexistent/seed/dir"]), { directories: [], files: [] });
  await assert.rejects(loadSeedFiles([path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sandbox-seed")], 100), /sandbox_seed_too_large/);
});

test("the sandbox request isolates the machine from the network and labels it for clean-up", () => {
  const request = buildCloudSandboxRequest({ id: "s1", labId: "CODE-501" }, cloudConfiguration({ ...ENV }));
  assert.equal(request.imageRef, ENV.SANDBOX_IMAGE_REF);
  assert.deepEqual(request.networkPolicies, [{ mode: "denyAll", denyNetworks: ["**"] }], "a bare denyAll is composed with Docker's default allow-all layer and blocks nothing");
  assert.deepEqual(request.resources, CLOUD_SIZES.small);
  assert.equal(request.labels["io.colelearninglabs.lab"], "CODE-501");
  assert.equal(request.displayNamePrefix, "cll-");
  assert.deepEqual(request.startupExecution.rawImage.start.argv, [...DEFAULT_START_COMMAND]);
  const custom = cloudConfiguration({ ...ENV, SANDBOX_START_COMMAND: '["/bin/sleep","infinity"]' });
  assert.deepEqual(buildCloudSandboxRequest({}, custom).startupExecution.rawImage.start.argv, ["/bin/sleep", "infinity"]);
  assert.equal(cloudConfigurationProblems(cloudConfiguration({ ...ENV, SANDBOX_START_COMMAND: "sleep" }))[0].includes("SANDBOX_START_COMMAND"), true);
  assert.throws(() => buildCloudSandboxRequest({}, cloudConfiguration({ ...ENV, SANDBOX_IMAGE_REF: "bad image" })), /invalid_container_configuration/);
});

test("the token source exchanges the personal access token once and refreshes it before expiry", async () => {
  let clock = 1_700_000_000_000,
    exchanges = 0;
  const source = createTokenSource({
    dockerId: "al91cole",
    dockerPat: "dckr_pat_test",
    now: () => clock,
    fetch: async (url, init) => {
      exchanges++;
      assert.equal(url, "https://hub.docker.com/v2/auth/token");
      assert.equal(JSON.parse(init.body).secret, "dckr_pat_test");
      return response(200, { access_token: jwt(Math.floor(clock / 1000) + 600) });
    },
  });
  const [a, b] = await Promise.all([source.token(), source.token()]);
  assert.equal(a, b);
  assert.equal(exchanges, 1);
  clock += 500_000;
  assert.equal(await source.token(), a);
  clock += 50_000; // inside the one-minute refresh window
  assert.notEqual(await source.token(), a);
  assert.equal(exchanges, 2);
  const rejected = createTokenSource({ dockerId: "x", dockerPat: "y", fetch: async () => response(401, {}) });
  await assert.rejects(rejected.token(), { code: "cloud_auth_failed" });
});

test("a learner session creates a sandbox, attaches a PTY, relays input and output, verifies files and deletes it", async () => {
  const docker = fakeDocker({ pollsBeforeRunning: 2 });
  const session = { id: "sess-1", labId: "CODE-501", commandHistory: [] };
  const sandbox = await spawnCloudSandbox(session, cfgFor(), deps(docker));
  assert.equal(sandbox.mode, "docker-cloud-sandbox");
  assert.equal(sandbox.name, "sbx-123");
  const create = docker.calls.find((c) => c.method === "POST" && c.url.endsWith("/sandboxes"));
  assert.deepEqual(create.body.networkPolicies, [{ mode: "denyAll", denyNetworks: ["**"] }]);
  assert.equal(create.body.labels["io.colelearninglabs.session"], "sess-1");
  assert.equal(docker.exchanges, 1, "one token exchange for the whole start");
  assert.equal(docker.credentials, 1, "the scoped credential is reused while valid");
  assert.equal(docker.processes.length, 2, "a root setup process, then the learner's shell");
  assert.deepEqual(docker.processes[0].cmd, ["/bin/sh", "-c", "set -e\necho SEED_OK\n"]);
  assert.equal(docker.processes[1].user, "1000:1000");

  const socket = docker.sockets[0];
  assert.equal(socket.url, "wss://sbx-123.endpoint.example/api/v1/processes/p-9/interact");
  assert.deepEqual(socket.protocols, ["sandboxes.v1"]);
  assert.equal(socket.options.headers.Authorization, "Bearer scoped-1");
  assert.deepEqual(socket.sent[0], { attach: { name: "processes/p-9", resumeFrom: "0" } });

  const output = [];
  let exit = null;
  sandbox.onData((chunk) => output.push(chunk));
  sandbox.onExit((info) => (exit = info));
  socket.serverSays({ heartbeat: {} });
  socket.serverSays({ chunk: { stream: "pty", data: Buffer.from("$ ").toString("base64"), streamSequence: "1" } });
  assert.deepEqual(output, ["$ "]);

  sandbox.write("ls\r");
  sandbox.resize(120, 40);
  assert.deepEqual(socket.sent[1], { stdin: Buffer.from("ls\r").toString("base64") });
  assert.deepEqual(socket.sent[2], { resize: { rows: 40, cols: 120 } });

  assert.equal(await sandbox.readFile("/home/learner/lab/code/results.txt"), "ALL_FIXTURES_PASS\n");
  assert.equal(await sandbox.readFile("/etc/passwd"), null, "only files named by lab checks are readable");
  docker.files.set("/home/learner/lab/code/results.txt", "x".repeat(20000));
  assert.equal(await sandbox.readFile("/home/learner/lab/code/results.txt"), null, "oversized files are refused");

  socket.serverSays({ exited: { exitCode: 3 } });
  assert.deepEqual(exit, { exitCode: 3 });

  await sandbox.destroy();
  await sandbox.destroy();
  const deletes = docker.calls.filter((c) => c.method === "DELETE");
  assert.equal(deletes.length, 1);
  assert.equal(deletes[0].headers["If-Match"], '"v1"');
  assert.equal(socket.readyState, 3);
  sandbox.write("ignored after destroy");
  assert.equal(socket.sent.length, 3);
});

test("a stale version on delete is refreshed and retried, and a terminal error frame ends the session", async () => {
  const docker = fakeDocker({ deleteStatuses: [412, 200] });
  const sandbox = await spawnCloudSandbox({ id: "s2", labId: "NET-201" }, cfgFor(), deps(docker));
  let exit = null;
  sandbox.onExit((info) => (exit = info));
  docker.sockets[0].serverSays({ code: "unavailable", message: "endpoint restarting" });
  assert.deepEqual(exit, { exitCode: 1 });
  await sandbox.destroy();
  const deletes = docker.calls.filter((c) => c.method === "DELETE");
  assert.equal(deletes.length, 2);
  assert.equal(deletes[1].headers["If-Match"], '"v2"');
});

test("a seed script that fails stops the start and deletes the sandbox", async () => {
  const docker = fakeDocker({ setupExitCode: 1 });
  await assert.rejects(spawnCloudSandbox({ id: "s6", labId: "NET-201" }, cfgFor(), deps(docker)), (error) => {
    assert.equal(error.code, "sandbox_seed_failed");
    assert.match(error.message, /exit code 1/);
    return true;
  });
  assert.equal(docker.sockets.length, 0, "no shell is started");
  assert.equal(docker.calls.filter((c) => c.method === "DELETE").length, 1);
});

test("a refused or failed sandbox start is reported with a controller error code and cleaned up", async () => {
  const quota = fakeDocker({ failCreate: { status: 429, body: { code: "resourceExhausted", message: "quota" } } });
  await assert.rejects(spawnCloudSandbox({ id: "s3", labId: "NET-201" }, cfgFor(), deps(quota)), { code: "capacity_reached" });
  assert.equal(quota.calls.filter((c) => c.method === "DELETE").length, 0);

  const failing = fakeDocker();
  const original = failing.fetch;
  failing.fetch = async (url, init) => {
    if ((init.method || "GET") === "GET" && url.endsWith("/sandboxes/sbx-123"))
      return response(200, { name: "sandboxes/sbx-123", core: { status: "failed", etag: '"v1"' }, failure: { message: "image pull denied" } });
    return original(url, init);
  };
  await assert.rejects(spawnCloudSandbox({ id: "s4", labId: "NET-201" }, cfgFor(), deps(failing)), (error) => {
    assert.equal(error.code, "container_start_failed");
    assert.match(error.message, /image pull denied/);
    return true;
  });
  assert.equal(failing.calls.filter((c) => c.method === "DELETE").length, 1, "the failed sandbox is deleted");

  const unconfigured = { ...configuration({ SANDBOX_BACKEND: "cloud" }) };
  await assert.rejects(spawnCloudSandbox({ id: "s5" }, unconfigured, deps(fakeDocker())), { code: "cloud_not_configured" });
});

test("the controller reports the cloud runtime and its limits when the backend is selected", async () => {
  const service = createSandboxOrchestrator(
    { enabled: true, sandboxBackend: "cloud", cloud: cloudConfiguration({ ...ENV, SANDBOX_SIZE: "micro" }) },
    { sandboxFactory: async () => ({ onData() {}, onExit() {}, write() {}, resize() {}, readFile: async () => null, destroy: async () => {} }) },
  );
  await new Promise((resolve) => service.server.listen(0, "127.0.0.1", resolve));
  try {
    const health = await (await fetch("http://127.0.0.1:" + service.server.address().port + "/api/health")).json();
    assert.equal(health.runtime, "docker-cloud-sandbox");
  } finally {
    await service.close();
  }
});
