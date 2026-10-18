import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const REVIEW_URL = "http://127.0.0.1:8080";
export const REVIEW_IMAGE = "cole-learning-labs/sandbox:alpine";
export const runFile = promisify(execFile);
const hex32 = /^[a-f0-9]{32}$/;
const hex64 = /^[a-f0-9]{64}$/;

export function reviewPaths(root) {
  if (typeof root !== "string" || !path.isAbsolute(root))
    throw new Error("Review root must be absolute.");
  const base = path.resolve(root),
    directory = path.join(base, ".review");
  return Object.freeze({
    base,
    directory,
    active: path.join(directory, "active.json"),
    key: path.join(directory, ".env.review"),
    credentials: path.join(directory, "teacher-access.txt"),
    log: path.join(directory, "service.log"),
    lock: path.join(directory, "start.lock"),
  });
}

export function validateState(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !==
      "controlToken,createdAt,instanceId,pid,version" ||
    value.version !== 1 ||
    typeof value.instanceId !== "string" ||
    !hex32.test(value.instanceId) ||
    typeof value.controlToken !== "string" ||
    !hex64.test(value.controlToken) ||
    !Number.isSafeInteger(value.pid) ||
    value.pid < 0 ||
    value.pid > 2147483647 ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    new Date(value.createdAt).toISOString() !== value.createdAt
  )
    throw new Error("Invalid private review state; no process was changed.");
  return { ...value };
}

export function controlEndpoint(
  paths,
  instanceId,
  platform = process.platform,
) {
  if (typeof instanceId !== "string" || !hex32.test(instanceId))
    throw new Error("Invalid review instance.");
  const name =
    "cll-pr22-" +
    crypto.createHash("sha256").update(paths.base).digest("hex").slice(0, 16) +
    "-" +
    instanceId;
  return platform === "win32"
    ? "\\\\.\\pipe\\" + name
    : path.join(os.tmpdir(), name + ".sock");
}

export function matchingToken(actual, expected) {
  return (
    typeof actual === "string" &&
    hex64.test(actual) &&
    typeof expected === "string" &&
    hex64.test(expected) &&
    crypto.timingSafeEqual(
      Buffer.from(actual, "hex"),
      Buffer.from(expected, "hex"),
    )
  );
}

export async function rejectLink(file, allowMissing = false) {
  try {
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink())
      throw new Error("Private review paths must not be links.");
    return stat;
  } catch (error) {
    if (allowMissing && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function preparePrivateDirectory(paths) {
  const base = await fs.realpath(paths.base);
  const existing = await rejectLink(paths.directory, true);
  if (existing && !existing.isDirectory())
    throw new Error("Private review path is not a directory.");
  if (!existing) await fs.mkdir(paths.directory, { mode: 0o700 });
  if (path.dirname(await fs.realpath(paths.directory)) !== base)
    throw new Error("Private review directory is outside this service.");
  if (process.platform === "win32") {
    try {
      await runFile(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "RemoteSigned",
          "-File",
          path.join(paths.base, "scripts", "harden-review.ps1"),
          "-LiteralPath",
          paths.directory,
        ],
        { windowsHide: true, timeout: 10000, maxBuffer: 8192 },
      );
    } catch {
      throw new Error(
        "Could not establish and verify private Windows file permissions. No credential was created.",
      );
    }
  } else await fs.chmod(paths.directory, 0o700);
  const ignored = path.join(paths.directory, ".gitignore");
  await rejectLink(ignored, true);
  await fs.writeFile(ignored, "*\n", { mode: 0o600 });
  for (const file of [
    paths.active,
    paths.key,
    paths.credentials,
    paths.log,
    paths.lock,
  ]) {
    const stat = await rejectLink(file, true);
    if (stat && !stat.isFile())
      throw new Error("A private review file has an unexpected type.");
  }
}

export async function readPrivate(file) {
  const stat = await rejectLink(file);
  if (!stat.isFile() || stat.size > 16384)
    throw new Error("Invalid private review file.");
  if (process.platform !== "win32" && stat.mode & 0o077)
    throw new Error("Private review file permissions are too broad.");
  return fs.readFile(file, "utf8");
}

export async function atomicPrivateWrite(file, text) {
  await rejectLink(file, true);
  const temporary = file + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
  try {
    await fs.writeFile(temporary, text, { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, file);
  } finally {
    await fs.unlink(temporary).catch(() => {});
  }
}

export async function readState(paths) {
  try {
    return validateState(JSON.parse(await readPrivate(paths.active)));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    // JSON syntax errors can quote the malformed input, including its token.
    throw new Error("Invalid private review state; no process was changed.");
  }
}

export function processExists(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

export async function ensureTeacherKey(paths) {
  let key;
  try {
    const text = await readPrivate(paths.key);
    const match = /^TEACHER_ACCESS_KEY=([a-f0-9]{64})\r?\n?$/.exec(text);
    if (!match)
      throw new Error("Private review key is malformed; it was not replaced.");
    key = match[1];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    key = crypto.randomBytes(32).toString("hex");
    await fs.writeFile(paths.key, "TEACHER_ACCESS_KEY=" + key + "\n", {
      flag: "wx",
      mode: 0o600,
    });
  }
  await atomicPrivateWrite(
    paths.credentials,
    "Cole Learning Labs — local PR #22 test only\n\nOpen: " +
      REVIEW_URL +
      "\nChoose Teacher sign-in, then use this private access key:\n\n" +
      key +
      "\n\nDo not share this file, commit it, or enter student information.\nThe key is reused across ordinary local restarts.\n",
  );
  return key;
}

export async function requestControl(paths, state, action, timeoutMs = 2000) {
  validateState(state);
  if (!["status", "stop"].includes(action))
    throw new Error("Invalid local control action.");
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      controlEndpoint(paths, state.instanceId),
    );
    let buffer = "";
    const finish = (error, value) => {
      socket.destroy();
      error ? reject(error) : resolve(value);
    };
    socket.setTimeout(timeoutMs, () =>
      finish(new Error("Local review control did not respond.")),
    );
    socket.on("connect", () =>
      socket.write(
        JSON.stringify({
          instanceId: state.instanceId,
          controlToken: state.controlToken,
          action,
        }) + "\n",
      ),
    );
    socket.on("error", () =>
      finish(new Error("Local review control is unavailable.")),
    );
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (buffer.length > 16384)
        return finish(new Error("Invalid local review response."));
      if (!buffer.includes("\n")) return;
      try {
        const value = JSON.parse(buffer.slice(0, buffer.indexOf("\n")));
        if (
          value.ok !== true ||
          value.instanceId !== state.instanceId ||
          value.pid !== state.pid ||
          !["running", "stopping"].includes(value.status)
        )
          throw new Error();
        finish(null, value);
      } catch {
        finish(new Error("Local review ownership was not confirmed."));
      }
    });
    socket.on("end", () => {
      if (!buffer.includes("\n"))
        finish(new Error("Local review control closed without confirmation."));
    });
  });
}

export async function checkPrerequisites(paths, run = runFile) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error(
      "Node 24 or later is required for the local review helper.",
    );
  for (const relative of [
    "server.js",
    "node_modules/ws/package.json",
    "node_modules/node-pty/package.json",
    "node_modules/@xterm/xterm/lib/xterm.js",
    "node_modules/@xterm/xterm/css/xterm.css",
    "node_modules/@xterm/addon-fit/lib/addon-fit.js",
  ]) {
    try {
      await fs.access(path.join(paths.base, relative));
    } catch {
      throw new Error(
        "Service dependencies are missing. Run npm ci --prefix terminal-sandbox first.",
      );
    }
  }
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(path.join(paths.base, "package.json"));
    const pty = require("node-pty");
    if (typeof pty.spawn !== "function") throw new Error();
  } catch {
    throw new Error(
      "The native PTY dependency is unavailable. Reinstall the pinned service dependencies for this Node version.",
    );
  }
  let info;
  try {
    info = await run("docker", ["info", "--format", "{{.OSType}}"], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 8192,
    });
  } catch {
    throw new Error(
      "Docker is unavailable. Start Docker Desktop with Linux containers and try again.",
    );
  }
  if (info.stdout.trim() !== "linux")
    throw new Error("Docker must use Linux containers.");
  try {
    await run("docker", ["image", "inspect", REVIEW_IMAGE], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 65536,
    });
  } catch {
    throw new Error(
      "The prepared sandbox image is missing. Build it using the local-testing guide first.",
    );
  }
}

export async function checkPortAvailable(port = 8080) {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid loopback test port.");
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () =>
      reject(
        new Error(
          "Port " +
            port +
            " is occupied by another service. Nothing was stopped.",
        ),
      ),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}

export async function removeOrphanContainers(state, run = runFile) {
  validateState(state);
  if (processExists(state.pid))
    throw new Error(
      "A process with the recorded PID still exists. No orphan cleanup was attempted.",
    );
  const label = "io.colelearninglabs.review=" + state.instanceId;
  let listed;
  try {
    listed = await run(
      "docker",
      [
        "ps",
        "-aq",
        "--no-trunc",
        "--filter",
        "label=io.colelearninglabs.terminal=1",
        "--filter",
        "label=" + label,
      ],
      { windowsHide: true, timeout: 5000, maxBuffer: 8192 },
    );
  } catch {
    throw new Error(
      "Docker is unavailable; private ownership state was retained for a later stop attempt.",
    );
  }
  const ids = listed.stdout.trim() ? listed.stdout.trim().split(/\s+/) : [];
  if (ids.length > 8 || ids.some((id) => !/^[a-f0-9]{64}$/.test(id)))
    throw new Error(
      "Unexpected review container listing. No containers were removed.",
    );
  // Inspect every match before removing any: a daemon response or stale file
  // must never broaden cleanup beyond this exact generated instance label.
  for (const id of ids) {
    const result = await run("docker", ["inspect", id], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 65536,
    });
    let item;
    try {
      item = JSON.parse(result.stdout)[0];
    } catch {
      throw new Error("Could not verify review container ownership.");
    }
    if (
      item?.Id !== id ||
      item.Config?.Labels?.["io.colelearninglabs.terminal"] !== "1" ||
      item.Config?.Labels?.["io.colelearninglabs.review"] !== state.instanceId
    )
      throw new Error(
        "Could not verify review container ownership. No containers were removed.",
      );
  }
  for (const id of ids)
    await run("docker", ["rm", "-f", id], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 8192,
    });
  return ids.length;
}
