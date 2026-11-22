// Cost and abuse guards: the "Are you still working?" idle warning, real idle
// detection on desktops, the daily machine-time cap and the Turnstile bot check.
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";
import { configuration, createSandboxOrchestrator, verifyHumanToken, HUMAN_CHECK_ACTION } from "../server.js";

const ORIGIN = "http://127.0.0.1:8080";

async function fixture(t, overrides = {}, deps = {}) {
  let clock = Date.UTC(2026, 0, 5, 12);
  const sandboxes = [], upstreams = [], logs = [];
  const service = createSandboxOrchestrator(
    { enabled: true, allowInsecureLocalhost: true, allowedOrigins: new Set([ORIGIN]), authTimeoutMs: 1000, teacherKey: "k".repeat(48), ...overrides },
    {
      now: () => clock,
      log: (...parts) => logs.push(parts.join(" ")),
      sandboxFactory: async () => {
        const sandbox = { destroyed: 0, desktop: { url: "wss://screen.example/", password: "Abcd1234", width: 1280, height: 800 }, onData() {}, onExit() {}, write() {}, resize() {}, history: async () => [], readFile: async () => null, destroy: async () => { sandbox.destroyed++; } };
        sandboxes.push(sandbox);
        return sandbox;
      },
      desktopSocketFactory: () => {
        const upstream = new EventEmitter();
        Object.assign(upstream, { sent: [], readyState: 0, send(data) { upstream.sent.push(Buffer.from(data)); }, terminate() { upstream.readyState = 3; } });
        upstreams.push(upstream);
        setImmediate(() => { upstream.readyState = 1; upstream.emit("open"); });
        return upstream;
      },
      ...deps,
    },
  );
  await new Promise((resolve) => service.server.listen(0, "127.0.0.1", resolve));
  const port = service.server.address().port, sockets = [];
  t.after(async () => { for (const ws of sockets) ws.terminate(); await service.close(); });
  async function learner() {
    const ws = new WebSocket("ws://127.0.0.1:" + port + "/ws", { headers: { Origin: ORIGIN } });
    sockets.push(ws);
    const messages = [];
    let read = 0;
    ws.on("error", () => {});
    ws.on("message", (raw) => messages.push(JSON.parse(raw)));
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    const send = (value) => ws.send(JSON.stringify(value));
    const next = async (...types) => {
      for (let i = 0; i < 300; i++) {
        const at = messages.slice(read).findIndex((m) => types.includes(m.type));
        if (at >= 0) { const found = messages[read + at]; read += at + 1; return found; }
        await delay(5);
      }
      throw new Error("missing " + types + ": " + JSON.stringify(messages));
    };
    send({ type: "auth", role: "student" });
    await next("auth:ok");
    const start = async (extra = {}) => { send({ type: "session:start", labId: "NET-201", mode: "self-paced", ...extra }); return next("session:ready", "error"); };
    return { ws, send, next, start, messages };
  }
  const screen = (ticket) => new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://127.0.0.1:" + port + "/desktop", ["cll-desktop", "ticket." + ticket], { headers: { Origin: ORIGIN } });
    sockets.push(ws);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
  return { service, sandboxes, upstreams, logs, learner, screen, port, advance: (ms) => { clock += ms; } };
}

test("the limits are settings with safe bounds", () => {
  const defaults = configuration({});
  assert.equal(defaults.inactivityTimeoutMs, 10 * 60000);
  assert.equal(defaults.idleWarningMs, 120000);
  assert.equal(defaults.maxLifetimeMs, 60 * 60000);
  assert.equal(defaults.maxSessions, 24);
  assert.equal(defaults.dailyMachineMs, 0, "no daily cap unless one is set");
  assert.equal(defaults.turnstileSecret, "");
  const set = configuration({ IDLE_TIMEOUT_MINUTES: "15", IDLE_WARNING_SECONDS: "60", MAX_SESSION_MINUTES: "45", MAX_SESSIONS: "6", DAILY_MACHINE_HOURS: "20", TURNSTILE_SECRET_KEY: "0x4AAAAAAA" + "b".repeat(24) });
  assert.deepEqual([set.inactivityTimeoutMs, set.idleWarningMs, set.maxLifetimeMs, set.maxSessions, set.dailyMachineMs], [900000, 60000, 2700000, 6, 72000000]);
  assert.ok(set.turnstileSecret);
  const wild = configuration({ IDLE_TIMEOUT_MINUTES: "9999", MAX_SESSIONS: "500", MAX_SESSION_MINUTES: "0", DAILY_MACHINE_HOURS: "-1", TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" });
  assert.deepEqual([wild.inactivityTimeoutMs, wild.maxSessions, wild.maxLifetimeMs, wild.dailyMachineMs], [600000, 24, 3600000, 0], "out-of-range values fall back to the defaults");
  assert.equal(wild.turnstileSecret, "", "Cloudflare's always-pass test secret is refused");
});

test("a quiet learner is asked whether they are still working; answering keeps the machine, silence deletes it", async (t) => {
  const f = await fixture(t, { inactivityTimeoutMs: 600000, idleWarningMs: 120000 });
  const a = await f.learner();
  const ready = await a.start();
  assert.equal(ready.limits.inactivityTimeoutSeconds, 600);
  assert.equal(ready.limits.maxLifetimeSeconds, 3600);
  f.advance(470000);
  await f.service.reap();
  assert.ok(!a.messages.some((m) => m.type === "session:idle-warning"), "no warning before the warning window");
  f.advance(20000);
  // The page's automatic progress checks and heartbeats are not the learner working.
  a.send({ type: "milestone:verify" });
  a.send({ type: "ping" });
  await a.next("pong");
  await f.service.reap();
  assert.deepEqual(await a.next("session:idle-warning"), { type: "session:idle-warning", secondsRemaining: 110 });
  await f.service.reap();
  assert.equal(a.messages.filter((m) => m.type === "session:idle-warning").length, 1, "the warning is sent once");
  a.send({ type: "session:keepalive" });
  await a.next("session:idle-cleared");
  f.advance(470000);
  await f.service.reap();
  assert.equal(f.service.sessions.size, 1, "the answer restarted the idle clock");
  f.advance(20000);
  await f.service.reap();
  await a.next("session:idle-warning");
  a.send({ type: "terminal:input", data: "ls\r" });
  await a.next("session:idle-cleared");
  f.advance(490000);
  await f.service.reap();
  await a.next("session:idle-warning");
  f.advance(110000);
  await f.service.reap();
  assert.equal((await a.next("session:terminated")).reason, "idle_timeout");
  assert.equal(f.sandboxes[0].destroyed, 1);
  assert.equal(f.service.sessions.size, 0);
});

test("an open desktop tab does not keep a machine alive; only keyboard and mouse input do", async (t) => {
  const f = await fixture(t, { inactivityTimeoutMs: 600000, idleWarningMs: 120000 });
  const a = await f.learner();
  const ready = await a.start();
  const view = await f.screen(ready.desktop.ticket);
  await delay(20);
  const session = [...f.service.sessions.values()][0];
  const started = session.lastActivity;
  f.advance(300000);
  view.send(Buffer.from([3, 1, 0, 0, 0, 0, 5, 0, 3, 32])); // FramebufferUpdateRequest, sent by the viewer itself
  view.send(Buffer.from("RFB 003.008\n"));
  await delay(30);
  assert.equal(f.upstreams[0].sent.length, 2, "viewer traffic is still relayed");
  assert.equal(session.lastActivity, started, "screen refreshes are not activity");
  view.send(Buffer.from([5, 0, 0, 10, 0, 10])); // PointerEvent
  await delay(30);
  assert.equal(session.lastActivity, started + 300000, "a mouse move is activity");
  f.advance(500000);
  await f.service.reap();
  await a.next("session:idle-warning");
  view.send(Buffer.from([4, 1, 0, 0, 0, 0, 0, 97])); // KeyEvent
  await a.next("session:idle-cleared");
  f.advance(600000);
  view.send(Buffer.from([3, 1, 0, 0, 0, 0, 5, 0, 3, 32]));
  await delay(30);
  await f.service.reap();
  assert.equal((await a.next("session:terminated")).reason, "idle_timeout");
});

test("the daily machine-time cap stops new machines once the day's hours are used", async (t) => {
  const f = await fixture(t, { dailyMachineMs: 3600000, inactivityTimeoutMs: 3600000, maxLifetimeMs: 7200000 });
  const a = await f.learner(), b = await f.learner();
  assert.equal((await a.start()).type, "session:ready");
  f.advance(1500000);
  assert.equal((await b.start()).type, "session:ready", "25 of 60 minutes used");
  f.advance(1200000); // a: 45 minutes, b: 20 minutes
  const c = await f.learner();
  assert.equal((await c.start()).code, "daily_limit_reached");
  assert.equal(f.sandboxes.length, 2, "no machine was created for the refused start");
  a.ws.close(); b.ws.close();
  await delay(40);
  assert.equal((await c.start()).code, "daily_limit_reached", "time already used by stopped machines still counts");
  assert.equal(f.logs.filter((line) => /Daily machine-time cap reached/.test(line)).length, 1, "the operator log says so once");
  f.advance(12 * 3600000); // the next UTC day
  assert.equal((await c.start()).type, "session:ready");
});

test("with a Turnstile secret, a machine starts only after a verified human check", async (t) => {
  const seen = [];
  const f = await fixture(t, { turnstileSecret: "s".repeat(32) }, { verifyHuman: async (token) => { seen.push(token); return token === "good-token"; } });
  const health = await (await fetch("http://127.0.0.1:" + f.port + "/api/health")).json();
  assert.equal(health.humanCheck, true);
  const a = await f.learner();
  assert.equal((await a.start()).code, "human_check_required");
  assert.equal((await a.start({ humanToken: 7 })).code, "human_check_required");
  assert.deepEqual(seen, [], "a missing token never reaches Cloudflare");
  assert.equal((await a.start({ humanToken: "bad-token" })).code, "human_check_failed");
  assert.equal(f.sandboxes.length, 0, "no machine without a pass");
  assert.equal((await a.start({ humanToken: "good-token" })).type, "session:ready");
  a.send({ type: "lab:switch", labId: "NET-201" });
  await a.next("session:terminated");
  assert.equal((await a.next("session:ready", "error")).type, "session:ready", "one pass covers the connection, so changing labs needs no second check");
  assert.deepEqual(seen, ["bad-token", "good-token"]);
  const bot = await f.learner();
  for (let i = 0; i < 3; i++) assert.equal((await bot.start({ humanToken: "bad-token" })).code, "human_check_failed");
  for (let i = 0; i < 200 && bot.ws.readyState !== WebSocket.CLOSED; i++) await delay(5);
  assert.equal(bot.ws.readyState, WebSocket.CLOSED, "repeated failed checks end the connection");
  const open = await fixture(t);
  assert.equal((await (await fetch("http://127.0.0.1:" + open.port + "/api/health")).json()).humanCheck, false);
  assert.equal((await (await open.learner()).start()).type, "session:ready", "without a secret nothing changes");
});

test("a Turnstile answer counts only when it is a fresh pass for this site and the machine action", async () => {
  const cfg = { turnstileSecret: "s".repeat(32), allowedOrigins: new Set(["https://labs.example.test", "https://www.labs.example.test"]) };
  const at = Date.UTC(2026, 0, 5, 12), calls = [];
  const answer = (body, status = 200) => async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status }); };
  const pass = { success: true, hostname: "labs.example.test", action: HUMAN_CHECK_ACTION, challenge_ts: new Date(at - 20000).toISOString() };
  const check = (body, token = "tok_en-1.x", status) => verifyHumanToken(token, cfg, { fetch: answer(body, status), now: () => at });
  assert.equal(await check(pass), true);
  assert.equal(calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(calls[0].init.body.get("secret"), cfg.turnstileSecret);
  assert.equal(calls[0].init.body.get("response"), "tok_en-1.x");
  assert.equal(await check({ ...pass, hostname: "www.labs.example.test" }), true);
  assert.equal(await check({ ...pass, success: false }), false);
  assert.equal(await check({ ...pass, hostname: "evil.example" }), false, "a pass from another site");
  assert.equal(await check({ ...pass, action: "reach" }), false, "a pass for another purpose");
  assert.equal(await check({ ...pass, challenge_ts: new Date(at - 400000).toISOString() }), false, "an old pass");
  assert.equal(await check(pass, "tok", 500), false);
  calls.length = 0;
  assert.equal(await check(pass, "bad token!"), false);
  assert.equal(await check(pass, "x".repeat(3000)), false);
  assert.equal(await verifyHumanToken("tok", { ...cfg, turnstileSecret: "" }, { fetch: answer(pass), now: () => at }), false);
  assert.equal(calls.length, 0, "malformed tokens and an unset secret never call out");
  assert.equal(await verifyHumanToken("tok", cfg, { fetch: async () => { throw new Error("offline"); }, now: () => at }), false);
});
