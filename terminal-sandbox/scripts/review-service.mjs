import crypto from "node:crypto";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import {
  REVIEW_URL,
  reviewPaths,
  preparePrivateDirectory,
  readPrivate,
  readState,
  processExists,
  ensureTeacherKey,
  atomicPrivateWrite,
  requestControl,
  checkPrerequisites,
  checkPortAvailable,
  removeOrphanContainers,
} from "./review-common.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

async function lock(paths) {
  const token = crypto.randomBytes(16).toString("hex");
  try {
    await fs.writeFile(
      paths.lock,
      JSON.stringify({ pid: process.pid, token }),
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let existing;
    try {
      existing = JSON.parse(await readPrivate(paths.lock));
    } catch {
      throw new Error(
        "A local start lock requires manual review; nothing was changed.",
      );
    }
    if (
      !Number.isSafeInteger(existing.pid) ||
      existing.pid <= 0 ||
      processExists(existing.pid)
    )
      throw new Error(
        "Another local start is running. Try status in a moment.",
      );
    await fs.unlink(paths.lock);
    return lock(paths);
  }
  return async () => {
    try {
      if (JSON.parse(await readPrivate(paths.lock)).token === token)
        await fs.unlink(paths.lock);
    } catch {}
  };
}

export async function startReview(paths = reviewPaths(ROOT)) {
  await preparePrivateDirectory(paths);
  const release = await lock(paths);
  try {
    const previous = await readState(paths);
    if (previous) {
      try {
        const running = await requestControl(paths, previous, "status");
        return {
          ...running,
          url: REVIEW_URL,
          credentials: paths.credentials,
          alreadyRunning: true,
        };
      } catch {
        if (processExists(previous.pid))
          throw new Error(
            "An earlier review process exists but ownership could not be confirmed. No process was stopped.",
          );
        throw new Error(
          "An earlier local review ended unexpectedly. Run stop to confirm cleanup before restarting.",
        );
      }
    }
    await checkPrerequisites(paths);
    await checkPortAvailable();
    await ensureTeacherKey(paths);
    const state = {
      version: 1,
      instanceId: crypto.randomBytes(16).toString("hex"),
      controlToken: crypto.randomBytes(32).toString("hex"),
      pid: 0,
      createdAt: new Date().toISOString(),
    };
    await atomicPrivateWrite(paths.active, JSON.stringify(state) + "\n");
    const log = await fs.open(paths.log, "a", 0o600);
    let child;
    try {
      child = spawn(
        process.execPath,
        [path.join(paths.base, "scripts", "review-runner.mjs")],
        {
          cwd: paths.base,
          detached: true,
          windowsHide: true,
          stdio: ["pipe", log.fd, log.fd],
        },
      );
      const spawned = new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", () =>
          reject(new Error("Could not start the local Node controller.")),
        );
      });
      await spawned;
      state.pid = child.pid;
      await atomicPrivateWrite(paths.active, JSON.stringify(state) + "\n");
      child.stdin.on("error", () => {});
      child.stdin.end(
        JSON.stringify({
          instanceId: state.instanceId,
          controlToken: state.controlToken,
        }) + "\n",
      );
      child.unref();
    } catch (error) {
      await fs.unlink(paths.active).catch(() => {});
      throw error;
    } finally {
      await log.close();
    }
    for (let i = 0; i < 150; i++) {
      try {
        const running = await requestControl(paths, state, "status", 300);
        return {
          ...running,
          url: REVIEW_URL,
          credentials: paths.credentials,
          alreadyRunning: false,
        };
      } catch {
        if (child.exitCode !== null)
          throw new Error(
            "Local controller did not start. Review the private .review/service.log; no other service was stopped.",
          );
        await delay(100);
      }
    }
    throw new Error(
      "The local controller did not confirm readiness. Run status or stop; no unrelated process was touched.",
    );
  } finally {
    await release();
  }
}

export async function statusReview(paths = reviewPaths(ROOT)) {
  const state = await readState(paths);
  if (!state) return { status: "stopped" };
  try {
    return {
      ...(await requestControl(paths, state, "status")),
      url: REVIEW_URL,
      credentials: paths.credentials,
    };
  } catch {
    return {
      status: "unconfirmed",
      processExists: processExists(state.pid),
      message:
        "This helper could not authenticate its local controller. No process was changed.",
    };
  }
}

export async function stopReview(paths = reviewPaths(ROOT)) {
  await preparePrivateDirectory(paths);
  const release = await lock(paths);
  try {
    const state = await readState(paths);
    if (!state) return { status: "stopped" };
    try {
      await requestControl(paths, state, "stop");
    } catch {
      if (processExists(state.pid))
        throw new Error(
          "Local ownership could not be confirmed. No process was stopped.",
        );
      const removed = await removeOrphanContainers(state);
      const current = await readState(paths);
      if (current?.instanceId !== state.instanceId)
        throw new Error(
          "The local instance changed. Private state was retained.",
        );
      await fs.unlink(paths.active);
      return { status: "stopped", orphanContainersRemoved: removed };
    }
    for (let i = 0; i < 300; i++) {
      const current = await readState(paths);
      if (!current) return { status: "stopped" };
      if (current.instanceId !== state.instanceId)
        throw new Error(
          "The local instance changed during shutdown. No other process was stopped.",
        );
      await delay(100);
    }
    throw new Error(
      "Shutdown is still pending. Run status; no unrelated process was stopped.",
    );
  } finally {
    await release();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const command = process.argv[2];
  try {
    if (
      !["start", "status", "stop"].includes(command) ||
      process.argv.length !== 3
    )
      throw new Error(
        "Use: node terminal-sandbox/scripts/review-service.mjs start|status|stop",
      );
    const result = await {
      start: startReview,
      status: statusReview,
      stop: stopReview,
    }[command]();
    console.log("Local PR #22 review: " + result.status);
    if (result.url) console.log("Open: " + result.url);
    if (result.credentials)
      console.log("Private teacher access file: " + result.credentials);
    if (result.status === "unconfirmed") {
      console.log(result.message);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
