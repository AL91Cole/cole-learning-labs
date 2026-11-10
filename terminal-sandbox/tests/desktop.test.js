import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";
import { configuration, createSandboxOrchestrator, runtimeDescription, verifySessionMilestones, labFor, spawnSandboxContainer } from "../server.js";
import { cloudConfiguration, cloudConfigurationProblems, buildCloudSandboxRequest, buildSeedScript, seedFromLabFiles, spawnCloudSandbox, desktopResolutionFor, CLOUD_SIZES } from "../cloud-sandboxes.js";

const ORIGIN = "http://127.0.0.1:8080";
const ENV = { SANDBOX_BACKEND: "cloud", DOCKER_ID: "al91cole", DOCKER_PAT: "dckr_pat_test" };
const response = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body ?? {})),
  arrayBuffer: async () => Buffer.from(typeof body === "string" ? body : JSON.stringify(body ?? {})),
});

test("the desktop view is the default and uses the desktop image at the small size", () => {
  const cloud = cloudConfiguration({ ...ENV });
  assert.equal(cloud.view, "desktop");
  assert.equal(cloud.desktopImageRef, "docker.io/dorowu/ubuntu-desktop-lxde-vnc:focal");
  assert.equal(cloud.desktopSize, "small");
  assert.equal(cloud.desktopResolution, "1024x768");
  assert.deepEqual(cloudConfigurationProblems(cloud), []);
  assert.equal(cloudConfiguration({ ...ENV, SANDBOX_VIEW: "terminal" }).view, "terminal");
  assert.equal(cloudConfiguration({ ...ENV, DESKTOP_SIZE: "medium", DESKTOP_RESOLUTION: "1024x768" }).desktopSize, "medium");
  assert.equal(cloudConfiguration({ ...ENV, DESKTOP_RESOLUTION: "huge" }).desktopResolution, "1024x768");
  assert.ok(cloudConfigurationProblems(cloudConfiguration({ ...ENV, DESKTOP_IMAGE_REF: "bad image" }))[0].includes("DESKTOP_IMAGE_REF"));
  assert.deepEqual(runtimeDescription(configuration({ ...ENV })), { runtime: "docker-cloud-desktop", limits: { memory: "4096m", cpus: "2" } });

  const request = buildCloudSandboxRequest({ id: "s1", labId: "NET-205" }, cloud, { desktop: { vncPassword: "Abcd1234", userPassword: "Abcdefgh12345678" } });
  assert.equal(request.imageRef, cloud.desktopImageRef);
  assert.deepEqual(request.resources, CLOUD_SIZES.small);
  assert.deepEqual(request.networkPolicies, [{ mode: "denyAll", denyNetworks: ["**"] }], "a desktop has no network either");
  assert.deepEqual(request.startupExecution.rawImage.start.argv, ["/bin/bash", "-c", "export USER=learner PASSWORD=Abcdefgh12345678 VNC_PASSWORD=Abcd1234 RESOLUTION=1024x768; exec /startup.sh"]);
  assert.throws(() => buildCloudSandboxRequest({}, cloud, { desktop: { vncPassword: "a b; rm", userPassword: "Abcdefgh12345678" } }), /invalid_container_configuration/, "passwords can never carry shell syntax");
});

test("the desktop is created at the size of the learner's lab area, within safe bounds", () => {
  assert.equal(desktopResolutionFor({ width: 956, height: 470 }), "952x480", "an 11-inch Chromebook lab area");
  assert.equal(desktopResolutionFor({ width: 1310, height: 612 }), "1304x608");
  assert.equal(desktopResolutionFor({ width: 3000, height: 2000 }), "1600x1000", "large monitors are capped");
  assert.equal(desktopResolutionFor({ width: 500, height: 300 }), "800x480", "tiny areas get a usable minimum and are scaled to fit");
  assert.equal(desktopResolutionFor(null), "1024x768");
  assert.equal(desktopResolutionFor({ width: "wide", height: 400 }), "1024x768");
  assert.equal(desktopResolutionFor({ width: 10, height: 10 }, "1280x800"), "1280x800");
  const cloud = cloudConfiguration({ ...ENV });
  const request = buildCloudSandboxRequest({ id: "s", labId: "NET-205" }, cloud, { desktop: { vncPassword: "Abcd1234", userPassword: "Abcdefgh12345678", resolution: "952x480" } });
  assert.ok(request.startupExecution.rawImage.start.argv[2].includes("RESOLUTION=952x480;"));
  assert.throws(() => buildCloudSandboxRequest({}, cloud, { desktop: { vncPassword: "Abcd1234", userPassword: "Abcdefgh12345678", resolution: "1x1; rm -rf" } }), /invalid_container_configuration/);
});

test("the desktop seed waits for the image's learner, removes admin rights, records commands and opens the lab", () => {
  const lab = labFor("NET-205");
  const script = buildSeedScript(seedFromLabFiles(lab.files), { desktop: true });
  assert.match(script, /until id -u learner/);
  assert.ok(!script.includes("adduser"), "the desktop image creates the account itself");
  assert.match(script, /gpasswd -d learner sudo/);
  assert.match(script, /passwd -l learner/);
  assert.match(script, /mkdir -p '\/home\/learner\/lab\/case'/);
  assert.match(script, /base64 -d > '\/home\/learner\/lab\/settings\.conf'/);
  assert.match(script, /chmod 755 '\/home\/learner\/lab\/test\.sh'/);
  assert.match(script, /PROMPT_COMMAND=.*\.lab-history/);
  assert.match(script, /LANG=C\.UTF-8/);
  assert.match(script, /learner@lab-pc/);
  assert.match(script, /\/dev\/tcp\/127\.0\.0\.1\/6081/);
  assert.match(script, /pcmanfm \/home\/learner\/lab/);
  assert.match(script, /lxterminal --working-directory=\/home\/learner\/lab/);
  assert.ok(script.length < 100000, "the script fits in one command");
  assert.ok(!/[^\x20-\x7e\n]/.test(script), "plain ASCII; file contents stay base64");
  assert.throws(() => seedFromLabFiles([{ path: "../x", content: "" }]), /sandbox_seed_invalid/);
  const terminal = buildSeedScript(seedFromLabFiles(lab.files));
  assert.match(terminal, /adduser -D -u 1000/);
  assert.ok(!terminal.includes("pcmanfm"));
});

test("a desktop session creates the machine, seeds the lab, publishes the screen and reads terminal history", async () => {
  const calls = [];
  let setupLookups = 0;
  const fetch = async (url, init = {}) => {
    const method = init.method || "GET", body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, url, body, headers: init.headers || {} });
    if (url === "https://hub.docker.com/v2/auth/token") return response(200, { access_token: "h." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".s" });
    const path = url.replace("https://connect.docker.com/sandboxes/v1", "");
    if (method === "POST" && path === "/sandboxes") return response(201, { name: "sandboxes/sbx-9", core: { status: "running", etag: '"v1"', endpoint: { uri: "https://sbx-9.endpoint.example", capabilities: ["createProcess", "readFile", "getProcess"] } } });
    if (method === "GET" && path === "/sandboxes/sbx-9") return response(200, { name: "sandboxes/sbx-9", core: { status: "running", etag: '"v2"' } });
    if (method === "POST" && path === "/sandboxes/sbx-9/endpoint-credentials") return response(200, { token: "scoped", expireTime: new Date(Date.now() + 300000).toISOString() });
    if (method === "POST" && path === "/sandboxes/sbx-9/ports") return response(201, { number: body.port.number, url: "https://6081-sbx-9.screens.example" });
    if (method === "DELETE" && path === "/sandboxes/sbx-9") return response(204, {});
    if (method === "POST" && url === "https://sbx-9.endpoint.example/v1/processes") return response(200, { name: "processes/setup", state: "running" });
    if (method === "GET" && url === "https://sbx-9.endpoint.example/v1/processes/setup") return response(200, { state: ++setupLookups < 2 ? "running" : "exited", exitCode: 0 });
    if (method === "GET" && url.startsWith("https://sbx-9.endpoint.example/v1/files/content?path=")) {
      const file = decodeURIComponent(url.split("path=")[1]);
      if (file === "/home/learner/.lab-history") return response(200, "cat case/brief.txt\nsh inspect.sh 1\n\n", { "content-length": "35" });
      if (file === "/home/learner/lab/results.txt") return response(200, "ALL_CHECKS_PASS\n", { "content-length": "16" });
      return response(404, {});
    }
    return response(404, { code: "notFound" });
  };
  const cfg = configuration({ ...ENV });
  const session = { id: "sess-d", labId: "NET-205", commandHistory: [] };
  const sandbox = await spawnCloudSandbox(session, cfg, { fetch, sleep: async () => {}, pollIntervalMs: 0, allowedFiles: ["/home/learner/lab/results.txt", "/home/learner/lab/settings.conf"], labFiles: labFor("NET-205").files });
  assert.equal(sandbox.mode, "docker-cloud-desktop");
  assert.equal(sandbox.desktop.url, "wss://6081-sbx-9.screens.example/");
  assert.match(sandbox.desktop.password, /^[A-Za-z0-9]{8}$/);
  assert.deepEqual([sandbox.desktop.width, sandbox.desktop.height], [1024, 768]);
  const create = calls.find((c) => c.method === "POST" && c.url.endsWith("/sandboxes"));
  assert.equal(create.body.imageRef, "docker.io/dorowu/ubuntu-desktop-lxde-vnc:focal");
  assert.ok(create.body.startupExecution.rawImage.start.argv[2].includes("VNC_PASSWORD=" + sandbox.desktop.password));
  const setup = calls.find((c) => c.method === "POST" && c.url.endsWith("/v1/processes"));
  assert.match(setup.body.cmd[2], /until id -u learner/);
  assert.match(setup.body.cmd[2], /settings\.conf/);
  assert.ok(!calls.some((c) => c.url.includes("/interact")), "no terminal stream is opened for a desktop");
  assert.deepEqual(calls.find((c) => c.url.endsWith("/ports")).body, { port: { number: 6081, protocol: "tcp" } });
  assert.deepEqual(await sandbox.history(), ["cat case/brief.txt", "sh inspect.sh 1"]);
  assert.equal(await sandbox.readFile("/home/learner/lab/results.txt"), "ALL_CHECKS_PASS\n");
  assert.equal(await sandbox.readFile("/home/learner/.lab-history"), null, "history is not a lab file");

  session.sandbox = sandbox;
  const milestones = await verifySessionMilestones(session);
  assert.deepEqual(milestones.map((m) => [m.id, m.completed]), [["m1-read-case", true], ["m2-inspect", true], ["m3-settings", false], ["m4-test", true]], "commands typed in the desktop terminal count for the checks");
  await sandbox.destroy();
  const del = calls.find((c) => c.method === "DELETE");
  assert.equal(del.headers["If-Match"], '"v2"', "the version is refreshed after publishing the port");
});

async function relayFixture(t) {
  const upstreams = [];
  const sandboxes = [];
  const service = createSandboxOrchestrator(
    { enabled: true, allowInsecureLocalhost: true, allowedOrigins: new Set([ORIGIN]), authTimeoutMs: 1000, teacherKey: "k".repeat(48) },
    {
      sandboxFactory: async () => {
        const sandbox = { mode: "docker-cloud-desktop", destroyed: 0, desktop: { url: "wss://screen.example/", password: "Abcd1234", width: 1280, height: 800 }, onData() {}, onExit() {}, write() {}, resize() {}, history: async () => [], readFile: async () => null, destroy: async () => { sandbox.destroyed++; } };
        sandboxes.push(sandbox);
        return sandbox;
      },
      desktopSocketFactory: (address) => {
        const upstream = new EventEmitter();
        Object.assign(upstream, { address, sent: [], readyState: 0, send(data) { upstream.sent.push(Buffer.from(data)); }, terminate() { upstream.readyState = 3; upstream.terminated = true; } });
        upstreams.push(upstream);
        setImmediate(() => { upstream.readyState = 1; upstream.emit("open"); });
        return upstream;
      },
    },
  );
  await new Promise((resolve) => service.server.listen(0, "127.0.0.1", resolve));
  const base = "ws://127.0.0.1:" + service.server.address().port;
  t.after(() => service.close());
  async function learner() {
    const ws = new WebSocket(base + "/ws", { headers: { Origin: ORIGIN } });
    const messages = [];
    ws.on("message", (raw) => messages.push(JSON.parse(raw)));
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    const next = async (type) => { for (let i = 0; i < 300; i++) { const found = messages.find((m) => m.type === type); if (found) return found; await delay(5); } throw new Error("missing " + type + ": " + JSON.stringify(messages)); };
    ws.send(JSON.stringify({ type: "auth", role: "student" }));
    await next("auth:ok");
    ws.send(JSON.stringify({ type: "session:start", labId: "NET-205", mode: "self-paced" }));
    return { ws, ready: await next("session:ready"), next };
  }
  const screen = (protocols) => new Promise((resolve) => {
    const ws = new WebSocket(base + "/desktop", protocols, { headers: { Origin: ORIGIN } });
    ws.once("open", () => resolve({ ws, status: 101 }));
    ws.once("unexpected-response", (request, res) => resolve({ ws, status: res.statusCode }));
    ws.once("error", () => {});
  });
  return { service, upstreams, sandboxes, learner, screen };
}

test("the screen socket needs the session's ticket and relays frames both ways without exposing the machine's address", async (t) => {
  const f = await relayFixture(t);
  const student = await f.learner();
  assert.equal(student.ready.runtimeMode, "docker-pty", "the runtime name follows the configured backend, not the fake");
  assert.deepEqual(Object.keys(student.ready.desktop).sort(), ["height", "password", "ticket", "width"], "the screen address is never sent to the browser");
  assert.match(student.ready.desktop.ticket, /^[a-f0-9]{32}$/);
  assert.ok(!JSON.stringify(student.ready).includes("screen.example"));

  assert.equal((await f.screen(["cll-desktop", "ticket." + "0".repeat(32)])).status, 403, "an unknown ticket is refused");
  assert.equal((await f.screen(["cll-desktop"])).status, 403, "a ticket is required");
  assert.equal((await f.screen(["binary", "ticket." + student.ready.desktop.ticket])).status, 403, "the screen subprotocol is required");
  assert.equal(f.upstreams.length, 0, "refused sockets never reach the machine");

  const opened = await f.screen(["cll-desktop", "ticket." + student.ready.desktop.ticket]);
  assert.equal(opened.status, 101);
  assert.equal(opened.ws.protocol, "cll-desktop");
  await delay(20);
  assert.equal(f.upstreams[0].address, "wss://screen.example/");
  const received = [];
  opened.ws.on("message", (data, isBinary) => received.push([Buffer.from(data).toString("latin1"), isBinary]));
  f.upstreams[0].emit("message", Buffer.from("RFB 003.008\n"));
  opened.ws.send(Buffer.from([1, 2, 3]));
  await delay(40);
  assert.deepEqual(received, [["RFB 003.008\n", true]], "screen data reaches the browser as binary");
  assert.deepEqual(f.upstreams[0].sent.map((b) => [...b]), [[1, 2, 3]], "keyboard and mouse data reaches the machine");

  const second = await f.screen(["cll-desktop", "ticket." + student.ready.desktop.ticket]);
  assert.equal(second.status, 101, "a reconnect replaces the earlier screen socket");
  await delay(30);
  assert.equal(f.upstreams[0].terminated, true);

  student.ws.close();
  await delay(60);
  assert.equal(f.sandboxes[0].destroyed, 1, "ending the lab session destroys the machine");
  assert.equal(f.upstreams[1].terminated, true, "and closes its screen");
  assert.equal((await f.screen(["cll-desktop", "ticket." + student.ready.desktop.ticket])).status, 403, "the ticket dies with the session");
});

test("the host-container backend replaces the shared lab folder with a generated lab's own files", async () => {
  const calls = [];
  const run = async (command, args) => {
    calls.push(args);
    if (args[0] === "info") return { stdout: "linux\n" };
    if (args[0] === "run") return { stdout: "a".repeat(64) };
    return { stdout: "" };
  };
  const pty = { spawn: () => ({ onData() {}, onExit() {}, write() {}, resize() {}, kill() {} }) };
  const generated = await spawnSandboxContainer({ labId: "NET-205" }, configuration({}), { exec: run, pty });
  const seed = calls.find((args) => args[0] === "exec" && args.includes("/bin/sh"));
  assert.ok(seed, "a generated lab is seeded after the container starts");
  assert.deepEqual(seed.slice(0, 3), ["exec", "--user", "1000:1000"]);
  const script = seed.at(-1);
  assert.match(script, /^set -e\nrm -rf \/home\/learner\/lab\n/);
  assert.match(script, /base64 -d > '\/home\/learner\/lab\/settings\.conf'/);
  assert.ok(calls.findIndex((args) => args === seed) > calls.findIndex((args) => args[0] === "run"));
  await generated.destroy();
  calls.length = 0;
  const shared = await spawnSandboxContainer({ labId: "NET-201" }, configuration({}), { exec: run, pty });
  assert.ok(!calls.some((args) => args[0] === "exec" && args.includes("/bin/sh")), "a lab without its own files keeps the image's shared seed");
  await shared.destroy();
});
