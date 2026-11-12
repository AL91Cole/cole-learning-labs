// Desktop machines that behave like an ordinary Linux computer: the host-container
// desktop backend, the screen relay through `docker exec`, the text terminal on a
// desktop machine, the learner's time zone, and the desktop image's start contract.
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";
import { configuration, createSandboxOrchestrator, runtimeDescription, labFor, buildDockerDesktopRunArgs, openContainerScreen, spawnDesktopContainer, DESKTOP_LIMITS } from "../server.js";
import { cloudConfiguration, buildCloudSandboxRequest, buildSeedScript, seedFromLabFiles, spawnCloudSandbox, validTimeZone } from "../cloud-sandboxes.js";

const ORIGIN = "http://127.0.0.1:8080";
const NAME = "cll-sandbox-" + "a".repeat(32);
const DESKTOP = { vncPassword: "Abcd1234", userPassword: "Abcdefgh12345678", resolution: "1280x720", timeZone: "America/New_York" };
const value = (args, flag) => args[args.indexOf(flag) + 1];

test("time zones from the browser are accepted only as plain zone names", () => {
  for (const zone of ["America/New_York", "Europe/London", "UTC", "Etc/GMT+5", "America/Argentina/Buenos_Aires", "America/Port-au-Prince"]) assert.equal(validTimeZone(zone), zone);
  for (const zone of ["", "../../etc/passwd", "America/New_York; rm -rf /", "A/B/C/D", "$(id)", "x".repeat(65), 42, null]) assert.equal(validTimeZone(zone), "", String(zone));
  const cloud = cloudConfiguration({ SANDBOX_BACKEND: "cloud", DOCKER_ID: "id", DOCKER_PAT: "pat" });
  const withZone = buildCloudSandboxRequest({ id: "s", labId: "LNX-101" }, cloud, { desktop: { ...DESKTOP } });
  assert.match(withZone.startupExecution.rawImage.start.argv[2], / TZ=America\/New_York; exec \/startup\.sh$/, "the cloud desktop starts on the learner's local time");
  const bad = buildCloudSandboxRequest({ id: "s", labId: "LNX-101" }, cloud, { desktop: { ...DESKTOP, timeZone: "x; reboot" } });
  assert.doesNotMatch(bad.startupExecution.rawImage.start.argv[2], /TZ=|reboot/, "an unsafe zone is dropped, never passed to the shell");
});

test("a host-container desktop has no network, no administrator rights and bounded resources", () => {
  const args = buildDockerDesktopRunArgs(NAME, "cole-learning-labs/desktop:noble", configuration({}), DESKTOP);
  assert.equal(value(args, "--network"), "none");
  assert.ok(args.includes("--cap-drop=ALL"));
  const caps = args.flatMap((arg, index) => (arg === "--cap-add" ? [args[index + 1]] : [])).sort();
  assert.deepEqual(caps, ["AUDIT_WRITE", "CHOWN", "DAC_OVERRIDE", "FOWNER", "KILL", "SETGID", "SETUID"], "only what creating the account and starting the desktop as the learner need");
  assert.ok(!caps.some((cap) => /SYS_ADMIN|NET_|SYS_PTRACE|MKNOD/.test(cap)));
  assert.equal(value(args, "--security-opt"), "no-new-privileges:true", "sudo can never raise the learner's privileges");
  assert.ok(args.includes("--memory=" + DESKTOP_LIMITS.memory) && args.includes("--pids-limit=" + DESKTOP_LIMITS.pids) && args.includes("--cpus=" + DESKTOP_LIMITS.cpus));
  assert.ok(!args.includes("--privileged") && !args.some((arg) => /docker\.sock/.test(arg)));
  const env = args.flatMap((arg, index) => (arg === "--env" ? [args[index + 1]] : []));
  assert.deepEqual(env, ["USER=learner", "PASSWORD=Abcdefgh12345678", "VNC_PASSWORD=Abcd1234", "RESOLUTION=1280x720", "TZ=America/New_York"]);
  assert.deepEqual(args.slice(-4), ["/usr/bin/timeout", "--signal=KILL", "3600", "/startup.sh"], "the machine is killed at the maximum lifetime");
  assert.equal(args.at(-5), "cole-learning-labs/desktop:noble");
  for (const desktop of [{ ...DESKTOP, vncPassword: "a b; rm" }, { ...DESKTOP, userPassword: "short" }, { ...DESKTOP, resolution: "1x1; rm" }, { ...DESKTOP, timeZone: "x;y" }])
    assert.throws(() => buildDockerDesktopRunArgs(NAME, "img", configuration({}), desktop), /invalid_container_configuration/);
  assert.throws(() => buildDockerDesktopRunArgs("other-name", "img", configuration({}), DESKTOP), /invalid_container_configuration/);
  assert.throws(() => buildDockerDesktopRunArgs(NAME, "Bad Image", configuration({}), DESKTOP), /invalid_container_configuration/);
  assert.deepEqual(runtimeDescription(configuration({ SANDBOX_VIEW: "desktop" })), { runtime: "docker-desktop", limits: { memory: "2048m", cpus: "1.5" } });
  assert.equal(runtimeDescription(configuration({})).runtime, "docker-pty", "the host backend still defaults to the shell");
  assert.equal(configuration({ DESKTOP_IMAGE: "registry.example/desktop:1" }).desktopImage, "registry.example/desktop:1");
});

test("the screen of a host-container desktop travels through docker exec, never a network port", async () => {
  const spawned = [];
  const spawn = (command, args) => {
    const child = new EventEmitter();
    child.stdin = Object.assign(new EventEmitter(), { written: [], write(data) { this.written.push(Buffer.from(data)); } });
    child.stdout = new EventEmitter();
    child.kill = () => { child.killed = true; child.emit("exit", null); };
    spawned.push({ command, args, child });
    setImmediate(() => child.emit("spawn"));
    return child;
  };
  const screen = openContainerScreen(NAME, { spawn });
  assert.deepEqual([spawned[0].command, ...spawned[0].args], ["docker", "exec", "-i", "--user", "65534:65534", NAME, "/usr/local/bin/cll-vnc-relay"], "an unprivileged relay inside the machine");
  const events = [];
  screen.on("open", () => events.push("open"));
  screen.on("message", (data) => events.push(String(data)));
  screen.on("close", () => events.push("close"));
  screen.send(Buffer.from("too early"));
  await delay(5);
  assert.equal(screen.readyState, 1);
  spawned[0].child.stdout.emit("data", Buffer.from("RFB 003.008\n"));
  screen.send(Buffer.from("input"));
  assert.deepEqual(spawned[0].child.stdin.written.map(String), ["input"], "nothing is written before the relay starts");
  screen.terminate();
  screen.terminate();
  assert.deepEqual(events, ["open", "RFB 003.008\n", "close"], "close is reported once");
  assert.equal(spawned[0].child.killed, true);
});

function fakeDocker() {
  const calls = [];
  const exec = async (command, args) => {
    calls.push(args);
    if (args[0] === "info") return { stdout: "linux\n" };
    if (args[0] === "run") return { stdout: "b".repeat(64) };
    if (args[0] === "exec" && args.includes("/usr/bin/head")) {
      const file = args.at(-1);
      if (file === "/home/learner/.lab-history") return { stdout: "pwd\nls\n\n" };
      if (file === "/home/learner/.lab-progress") return { stdout: "[code-word]\n" };
      return { stdout: "" };
    }
    return { stdout: "" };
  };
  const ptys = [];
  const pty = {
    spawn: (command, args) => {
      const handlers = {};
      const proc = { command, args, written: [], resized: [], onData: (fn) => (handlers.data = fn), onExit: (fn) => (handlers.exit = fn), write(data) { this.written.push(data); }, resize(cols, rows) { this.resized.push([cols, rows]); }, kill() { this.killed = true; }, emit: (name, payload) => handlers[name]?.(payload) };
      ptys.push(proc);
      return proc;
    },
  };
  return { calls, exec, pty, ptys };
}

test("a host-container desktop seeds the lab as root, reads checks safely and offers a text terminal", async () => {
  const docker = fakeDocker();
  const opened = [];
  const sandbox = await spawnDesktopContainer({ labId: "LNX-101", screen: { width: 956, height: 470 }, timeZone: "Europe/Paris" }, configuration({ SANDBOX_VIEW: "desktop" }), { exec: docker.exec, pty: docker.pty, openScreen: (name) => { opened.push(name); return new EventEmitter(); } });
  const run = docker.calls.find((args) => args[0] === "run");
  const name = value(run, "--name");
  assert.match(name, /^cll-sandbox-[a-f0-9]{32}$/);
  assert.ok(run.includes("RESOLUTION=952x480"), "the desktop is created at the size of the learner's lab area");
  assert.ok(run.includes("TZ=Europe/Paris"));
  const seed = docker.calls.find((args) => args[0] === "exec" && args.includes("/bin/sh"));
  assert.deepEqual(seed.slice(0, 4), ["exec", "--user", "0:0", name], "the lab is seeded as root, like the cloud desktop");
  assert.match(seed.at(-1), /until id -u learner/);
  assert.match(seed.at(-1), /cll-open-lab/);
  assert.match(seed.at(-1), /key-card\.txt/, "the lab's own files are written");
  assert.equal(sandbox.mode, "docker-desktop");
  assert.deepEqual(Object.keys(sandbox.desktop).sort(), ["connect", "height", "password", "width"]);
  assert.match(sandbox.desktop.password, /^[A-Za-z0-9]{8}$/);
  sandbox.desktop.connect();
  assert.deepEqual(opened, [name]);
  assert.deepEqual(await sandbox.history(), ["pwd", "ls"]);
  assert.equal(await sandbox.readFile("/home/learner/.lab-progress"), "[code-word]\n", "a file a lab check names can be read");
  assert.equal(await sandbox.readFile("/etc/shadow"), null, "nothing else can be read");
  const reads = docker.calls.filter((args) => args.includes("/usr/bin/head"));
  assert.ok(reads.every((args) => args[1] === "--user" && args[2] === "1000:1000" && args.includes("-c")), "files are read as the learner with a size limit");

  const output = [];
  sandbox.onData((data) => output.push(data));
  sandbox.write("ignored before the shell opens");
  let closedWith = null;
  await sandbox.openShell((code) => (closedWith = code));
  await sandbox.openShell(() => {});
  assert.equal(docker.ptys.length, 1, "one text terminal at a time");
  const shell = docker.ptys[0];
  assert.deepEqual(shell.args.slice(0, 5), ["exec", "-it", "--user", "1000:1000", "--workdir"]);
  assert.equal(shell.args[5], "/home/learner/lab");
  assert.deepEqual(shell.args.slice(-3), [name, "/bin/bash", "-l"]);
  assert.ok(shell.args.includes("DISPLAY=:1"), "programs started from the text terminal open on the desktop");
  sandbox.write("whoami\r");
  sandbox.resize(100, 30);
  shell.emit("data", "learner\r\n");
  assert.deepEqual(shell.written, ["whoami\r"]);
  assert.deepEqual(shell.resized, [[100, 30]]);
  assert.deepEqual(output, ["learner\r\n"]);
  shell.emit("exit", { exitCode: 0 });
  assert.equal(closedWith, 0);
  await sandbox.openShell(() => {});
  assert.equal(docker.ptys.length, 2, "a closed text terminal can be opened again");
  await sandbox.destroy();
  assert.equal(docker.ptys[1].killed, true);
  assert.deepEqual(docker.calls.at(-1), ["rm", "-f", name]);
  await assert.rejects(sandbox.openShell(() => {}), /shell_unavailable/);
});

test("a host-container desktop that fails to start is removed", async () => {
  const docker = fakeDocker();
  const failing = async (command, args) => {
    if (args[0] === "exec" && args.includes("/bin/sh")) throw Object.assign(new Error("seed failed"), { stderr: "x" });
    return docker.exec(command, args);
  };
  await assert.rejects(spawnDesktopContainer({ labId: "LNX-102" }, configuration({ SANDBOX_VIEW: "desktop" }), { exec: failing, pty: docker.pty }), /desktop_unavailable/);
  const name = value(docker.calls.find((args) => args[0] === "run"), "--name");
  assert.deepEqual(docker.calls.at(-1), ["rm", "-f", name]);
});

test("the controller opens the text terminal on desktop machines only and reports when it closes", async (t) => {
  const shells = [];
  let factorySession = null;
  const service = createSandboxOrchestrator(
    { enabled: true, allowInsecureLocalhost: true, allowedOrigins: new Set([ORIGIN]), authTimeoutMs: 1000 },
    {
      sandboxFactory: async (session) => {
        factorySession = session;
        const listeners = [];
        const desktop = session.labId === "LNX-101";
        return {
          mode: desktop ? "docker-desktop" : "docker-pty",
          ...(desktop ? { desktop: { connect: () => new EventEmitter(), password: "Abcd1234", width: 1280, height: 800 }, openShell: async (onClosed) => { shells.push(onClosed); } } : {}),
          onData: (fn) => listeners.push(fn), onExit() {}, write: (data) => listeners.forEach((fn) => fn("echo:" + data)), resize() {},
          history: async () => [], readFile: async () => null, destroy: async () => {},
        };
      },
    },
  );
  await new Promise((resolve) => service.server.listen(0, "127.0.0.1", resolve));
  t.after(() => service.close());
  const learner = async (labId, extra = {}) => {
    const ws = new WebSocket("ws://127.0.0.1:" + service.server.address().port + "/ws", { headers: { Origin: ORIGIN } });
    const messages = [];
    ws.on("message", (raw) => messages.push(JSON.parse(raw)));
    await new Promise((resolve) => ws.once("open", resolve));
    const next = async (type, from = 0) => { for (let i = 0; i < 300; i++) { const found = messages.slice(from).find((m) => m.type === type); if (found) return found; await delay(5); } throw new Error("missing " + type + " in " + JSON.stringify(messages)); };
    ws.send(JSON.stringify({ type: "auth", role: "student" }));
    await next("auth:ok");
    ws.send(JSON.stringify({ type: "session:start", labId, mode: "self-paced", ...extra }));
    await next("session:ready");
    return { ws, messages, next, send: (msg) => ws.send(JSON.stringify(msg)) };
  };
  const student = await learner("LNX-101", { timeZone: "Asia/Tokyo" });
  assert.equal(factorySession.timeZone, "Asia/Tokyo", "the learner's time zone reaches the machine");
  student.send({ type: "terminal:open" });
  await student.next("terminal:opened");
  student.send({ type: "terminal:open" });
  await delay(30);
  assert.equal(shells.length, 1, "opening twice keeps one shell");
  student.send({ type: "terminal:input", data: "whoami\r" });
  assert.equal((await student.next("terminal:output")).data, "echo:whoami\r");
  shells[0](0);
  assert.equal((await student.next("terminal:closed")).exitCode, 0);
  student.send({ type: "terminal:open" });
  await delay(30);
  assert.equal(shells.length, 2, "it can be opened again after it closed");
  student.ws.close();

  const shellOnly = await learner("NET-201", { timeZone: "not a zone; rm" });
  assert.equal(factorySession.timeZone, "", "an unsafe time zone is dropped");
  shellOnly.send({ type: "terminal:open" });
  assert.equal((await shellOnly.next("error")).code, "shell_unavailable");
  shellOnly.ws.close();
});

test("the desktop seed script is valid shell, opens the lab with the image's helper and titles the terminal", () => {
  const script = buildSeedScript(seedFromLabFiles(labFor("LNX-101").files), { desktop: true });
  const dir = mkdtempSync(path.join(tmpdir(), "cll-seed-"));
  writeFileSync(path.join(dir, "seed.sh"), script);
  execFileSync("sh", ["-n", path.join(dir, "seed.sh")]);
  assert.match(script, /if \[ -x \/usr\/local\/bin\/cll-open-lab \]; then .*cll-open-lab \/home\/learner\/lab.*; else\n.*pcmanfm[^\n]*\n.*lxterminal[^\n]*\nfi\n/s, "earlier desktop images still get the same two windows");
  assert.match(script, /\\e\]0;learner@lab-pc: \\w\\a/, "the prompt names the terminal window, as Ubuntu's prompt does");
});

test("a cloud desktop opens a login shell for the text terminal through the endpoint", async () => {
  const calls = [], sockets = [];
  class FakeWebSocket extends EventEmitter {
    constructor(url) { super(); this.url = url; this.sent = []; this.readyState = 0; sockets.push(this); setImmediate(() => { this.readyState = 1; this.emit("open"); }); }
    send(data) { this.sent.push(JSON.parse(data)); }
    terminate() { this.readyState = 3; }
    close() { this.readyState = 3; }
  }
  const respond = (status, body) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body), body: new Response(typeof body === "string" ? body : JSON.stringify(body)).body });
  let lookups = 0;
  const fetch = async (url, init = {}) => {
    const method = init.method || "GET", body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, url, body });
    if (url.endsWith("/v2/auth/token")) return respond(200, { access_token: "h." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".s" });
    const p = url.replace("https://connect.docker.com/sandboxes/v1", "");
    if (method === "POST" && p === "/sandboxes") return respond(201, { name: "sandboxes/sbx-1", core: { status: "running", etag: '"v1"', endpoint: { uri: "https://sbx-1.endpoint.example", capabilities: ["createProcess", "readFile", "interact"] } } });
    if (p === "/sandboxes/sbx-1/endpoint-credentials") return respond(200, { token: "scoped", expireTime: new Date(Date.now() + 300000).toISOString() });
    if (p === "/sandboxes/sbx-1/ports") return respond(201, { url: "https://6081-sbx-1.example" });
    if (method === "GET" && p === "/sandboxes/sbx-1") return respond(200, { core: { status: "running", etag: '"v2"' } });
    if (method === "DELETE") return respond(204, {});
    if (method === "POST" && url === "https://sbx-1.endpoint.example/v1/processes") return respond(200, { name: body.session === "setup" ? "processes/setup" : "processes/shell-1", state: "running" });
    if (url === "https://sbx-1.endpoint.example/v1/processes/setup") return respond(200, { state: ++lookups < 2 ? "running" : "exited", exitCode: 0 });
    return respond(404, {});
  };
  const cfg = configuration({ SANDBOX_BACKEND: "cloud", DOCKER_ID: "id", DOCKER_PAT: "pat" });
  const sandbox = await spawnCloudSandbox({ id: "s", labId: "LNX-101", timeZone: "America/Denver" }, cfg, { fetch, WebSocket: FakeWebSocket, sleep: async () => {}, pollIntervalMs: 0, labFiles: labFor("LNX-101").files });
  assert.match(calls.find((c) => c.method === "POST" && c.url.endsWith("/sandboxes")).body.startupExecution.rawImage.start.argv[2], /TZ=America\/Denver;/);
  assert.equal(sockets.length, 0, "no shell is opened until the learner asks for it");
  const output = [];
  sandbox.onData((data) => output.push(data));
  let closed = null;
  await sandbox.openShell((code) => (closed = code));
  const create = calls.filter((c) => c.method === "POST" && c.url.endsWith("/v1/processes")).at(-1).body;
  assert.deepEqual(create.cmd, ["/bin/bash", "-l"]);
  assert.equal(create.user, "learner");
  assert.equal(create.workingDir, "/home/learner/lab");
  assert.equal(create.env.DISPLAY, ":1");
  assert.ok(create.pty);
  assert.match(sockets[0].url, /^wss:\/\/sbx-1\.endpoint\.example\/v1\/processes\/shell-1\/interact$/);
  sandbox.write("ls\r");
  assert.deepEqual(sockets[0].sent.at(-1), { stdin: Buffer.from("ls\r").toString("base64") });
  sockets[0].emit("message", Buffer.from(JSON.stringify({ chunk: { data: Buffer.from("README.txt\r\n").toString("base64") } })), false);
  assert.deepEqual(output, ["README.txt\r\n"]);
  sockets[0].emit("message", Buffer.from(JSON.stringify({ exited: { exitCode: 0 } })), false);
  assert.equal(closed, 0);
  await sandbox.destroy();
});

test("the desktop image keeps the start contract and the learner is never an administrator", () => {
  const dir = new URL("../desktop/", import.meta.url);
  const dockerfile = readFileSync(new URL("Dockerfile", dir), "utf8");
  const startup = readFileSync(new URL("rootfs/startup.sh", dir), "utf8");
  const session = readFileSync(new URL("rootfs/usr/local/bin/cll-session", dir), "utf8");
  assert.match(dockerfile, /^FROM ubuntu:24\.04@sha256:[a-f0-9]{64}$/m, "a maintained LTS base pinned by digest");
  for (const tool of ["man-db", "manpages", "bash-completion", "less", "nano", "vim", "git", "tree", "htop", "iputils-ping", "dnsutils", "python3", "gcc", "make", "xfce4-session", "thunar", "xfce4-terminal", "mousepad", "tigervnc-standalone-server", "websockify"])
    assert.match(dockerfile, new RegExp("[ \\\\n]" + tool.replace(/[+]/g, "\\+") + "[ ;\\\\\\n]"), tool);
  assert.match(dockerfile, /rm -f \/etc\/dpkg\/dpkg\.cfg\.d\/excludes/, "manual pages are kept");
  assert.match(dockerfile, /userdel -r ubuntu/, "the base image's uid 1000 account is removed so the learner gets uid 1000");
  assert.match(dockerfile, /rm -f \/etc\/apt\/apt\.conf\.d\/00build-proxy/, "build proxy settings never stay in the image");
  for (const name of ["USER", "PASSWORD", "VNC_PASSWORD", "RESOLUTION", "TZ"]) assert.match(startup, new RegExp("\\$\\{" + name + ":"), name);
  assert.match(startup, /for group in sudo adm; do gpasswd -d/, "no administrator groups");
  assert.ok(!/usermod -aG|--groups/.test(startup));
  assert.match(startup, /unset PASSWORD VNC_PASSWORD/);
  assert.match(session, /-rfbport 5900 -localhost/, "raw VNC listens on the machine's loopback only");
  assert.match(session, /websockify --heartbeat 30 6081 127\.0\.0\.1:5900/, "the cloud screen bridge stays on port 6081");
  assert.match(session, /-AcceptSetDesktopSize/, "the browser can resize the desktop");
  assert.match(session, /runuser -u "\$user" -- \/usr\/bin\/Xvnc/, "the screen server runs as the learner, not root");
});
