import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";
import {
  configuration,
  spawnSandboxContainer,
  verifySessionMilestones,
  createSandboxOrchestrator,
} from "../server.js";
const run = promisify(execFile);

test(
  "real Docker PTY enforces isolation, seeds writable tmpfs, verifies actual files and removes its container",
  { skip: process.env.RUN_DOCKER_TESTS !== "1", timeout: 60000 },
  async () => {
    const cfg = {
      ...configuration(),
      sandboxImage:
        process.env.SANDBOX_IMAGE || "cole-learning-labs/sandbox:alpine",
    };
    const session = { labId: "NET-201", commandHistory: [] };
    const sandbox = await spawnSandboxContainer(session, cfg);
    session.sandbox = sandbox;
    let output = "";
    sandbox.onData((chunk) => {
      output += chunk;
    });
    try {
      assert.equal(sandbox.mode, "docker-pty");
      sandbox.resize(100, 30);
      sandbox.write(
        "id -u; stty size; test -t 0 && echo REAL_PTY; test ! -e /var/run/docker.sock && echo NO_DOCKER_SOCKET; touch /root/escape 2>/dev/null || echo READONLY_ROOT; echo 'nameserver 10.24.8.53' > ~/lab/resolv.conf; echo DNS_VERIFIED_10.24.8.53 > ~/lab/verified.txt; printf 'COMPLETED_%s\\n' CHECK\r",
      );
      for (
        let i = 0;
        i < 100 && !/[\r\n]COMPLETED_CHECK[\r\n]/.test(output);
        i++
      )
        await delay(50);
      assert.match(output, /[\r\n]1000[\r\n]/);
      assert.match(output, /[\r\n]30 100[\r\n]/);
      assert.match(output, /[\r\n]REAL_PTY[\r\n]/);
      assert.match(output, /[\r\n]NO_DOCKER_SOCKET[\r\n]/);
      assert.match(output, /[\r\n]READONLY_ROOT[\r\n]/);
      const inspected = JSON.parse(
        (await run("docker", ["inspect", sandbox.containerId])).stdout,
      )[0];
      assert.equal(inspected.Config.User, "1000:1000");
      assert.equal(inspected.HostConfig.NetworkMode, "none");
      assert.equal(inspected.HostConfig.ReadonlyRootfs, true);
      assert.deepEqual(inspected.HostConfig.CapDrop, ["ALL"]);
      assert.equal(inspected.HostConfig.Memory, 536870912);
      assert.equal(inspected.HostConfig.NanoCpus, 500000000);
      assert.equal(inspected.HostConfig.PidsLimit, 64);
      assert.equal(
        inspected.Mounts.some((mount) => mount.Type === "bind"),
        false,
      );
      const milestones = await verifySessionMilestones(session);
      assert.equal(
        milestones.find((m) => m.id === "m3-fix-dns").completed,
        true,
      );
      assert.equal(
        milestones.find((m) => m.id === "m4-verify-log").completed,
        true,
      );
      assert.equal(
        await sandbox.readFile("/etc/passwd"),
        null,
        "Only authored milestone files can be read by the controller.",
      );
    } finally {
      await sandbox.destroy();
    }
    await assert.rejects(run("docker", ["inspect", sandbox.containerId]));
  },
);

test(
  "real Docker service completes a lab over its authenticated WebSocket and removes the container on disconnect",
  { skip: process.env.RUN_DOCKER_TESTS !== "1", timeout: 60000 },
  async (t) => {
    const origin = "http://127.0.0.1:8080";
    const service = createSandboxOrchestrator({
      enabled: true,
      allowInsecureLocalhost: true,
      allowedOrigins: new Set([origin]),
      sandboxImage:
        process.env.SANDBOX_IMAGE || "cole-learning-labs/sandbox:alpine",
    });
    let client;
    t.after(async () => {
      client?.terminate();
      await service.close();
    });
    await new Promise((resolve) =>
      service.server.listen(0, "127.0.0.1", resolve),
    );
    client = new WebSocket(
      "ws://127.0.0.1:" + service.server.address().port + "/ws",
      { headers: { Origin: origin } },
    );
    const messages = [];
    let output = "";
    client.on("message", (raw) => {
      const message = JSON.parse(raw);
      messages.push(message);
      if (message.type === "terminal:output") output += message.data;
    });
    const send = (value) => client.send(JSON.stringify(value));
    const waitFor = async (predicate) => {
      for (let i = 0; i < 600; i++) {
        const value = predicate();
        if (value) return value;
        await delay(25);
      }
      throw new Error(
        "Expected real service response absent: " + JSON.stringify(messages),
      );
    };
    await new Promise((resolve, reject) => {
      client.once("open", resolve);
      client.once("error", reject);
    });
    send({ type: "auth", role: "student" });
    await waitFor(() => messages.find((message) => message.type === "auth:ok"));
    send({ type: "session:start", labId: "NET-201", mode: "self-paced" });
    const ready = await waitFor(() =>
      messages.find(
        (message) =>
          message.type === "session:ready" || message.type === "error",
      ),
    );
    assert.equal(ready.type, "session:ready", ready.code);
    assert.equal(ready.runtimeMode, "docker-pty");
    const containerId = service.sessions.get(ready.sessionId).sandbox
      .containerId;
    send({ type: "terminal:resize", cols: 100, rows: 30 });
    send({
      type: "terminal:input",
      data: "cat ~/lab/network-sheet.txt; cat ~/lab/resolv.conf; printf 'nameserver 10.24.8.53\\nsearch school.test\\n' > ~/lab/resolv.conf; printf 'DNS_VERIFIED_10.24.8.53\\n' > ~/lab/verified.txt; test -t 0 && printf 'SERVICE_%s\\n' PTY; printf 'SERVICE_%s\\n' DONE\r",
    });
    await waitFor(() => /[\r\n]SERVICE_DONE[\r\n]/.test(output));
    assert.match(output, /[\r\n]SERVICE_PTY[\r\n]/);
    assert.match(output, /WORKSTATION CONFIGURATION SHEET/);
    await delay(600);
    send({ type: "milestone:verify" });
    const completed = await waitFor(() =>
      messages.find(
        (message) =>
          message.type === "milestone:status" &&
          message.milestones.length === 4 &&
          message.milestones.every((milestone) => milestone.completed),
      ),
    );
    assert.equal(completed.labId, "NET-201");
    const removed = new Promise((resolve) => client.once("close", resolve));
    client.close();
    await removed;
    await waitFor(() => service.sessions.size === 0);
    let exists = true;
    for (let i = 0; i < 100 && exists; i++) {
      try {
        await run("docker", ["inspect", containerId]);
        await delay(25);
      } catch {
        exists = false;
      }
    }
    assert.equal(
      exists,
      false,
      "Disconnect must remove the actual Docker container.",
    );
  },
);
