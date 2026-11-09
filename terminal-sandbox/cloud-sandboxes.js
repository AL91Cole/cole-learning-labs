// Docker Cloud Sandboxes backend for the terminal controller.
//
// Instead of `docker run` on a host the controller manages, this module starts
// one Docker Cloud Sandbox per learner through Docker's Sandboxes API, opens a
// shell inside it over the sandbox endpoint's PTY WebSocket, reads the files a
// lab's checks name through the endpoint's file API, and deletes the sandbox
// when the session ends. It returns the same object `spawnSandboxContainer`
// in server.js returns, so the rest of the controller does not know which
// backend is in use.
//
// Credentials: a Docker personal access token with "Allow Cloud Sandboxes
// access" is exchanged for a short-lived access token (what Docker's own SDK
// does). Neither token is ever logged or sent to a browser.
import crypto from "node:crypto";
import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { WebSocket as NodeWebSocket } from "ws";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export const CLOUD_DEFAULTS = Object.freeze({
  apiBase: "https://connect.docker.com/sandboxes/v1",
  exchangeUrl: "https://hub.docker.com/v2/auth/token",
  startTimeoutMs: 90000,
  pollIntervalMs: 1000,
  requestTimeoutMs: 15000,
  credentialTtlSeconds: 300,
  maxFileBytes: 16384,
  // A public image with a POSIX shell and python3; the controller seeds the
  // learner's home itself, so no custom image has to be pushed anywhere.
  imageRef: "docker.io/library/python:3.13-alpine",
  seedDir: path.join(MODULE_DIR, "sandbox-seed"),
  maxSeedBytes: 512 * 1024,
  setupTimeoutMs: 45000,
  shellUser: "1000:1000",
});

/** Docker's published sandbox sizes. */
export const CLOUD_SIZES = Object.freeze({
  micro: Object.freeze({ cpus: 1, memoryMib: 2048 }),
  small: Object.freeze({ cpus: 2, memoryMib: 4096 }),
  medium: Object.freeze({ cpus: 4, memoryMib: 8192 }),
  large: Object.freeze({ cpus: 8, memoryMib: 16384 }),
  xl: Object.freeze({ cpus: 16, memoryMib: 32768 }),
});

/**
 * The sandbox's main process. An image's own command is usually an interactive
 * shell, which would exit at once without a terminal, so the machine runs a
 * sleep loop; the learner's shell is a separate PTY process. Override with
 * SANDBOX_START_COMMAND as a JSON array when the image needs its entrypoint.
 */
export const DEFAULT_START_COMMAND = Object.freeze([
  "/bin/sh",
  "-c",
  'trap "exit 0" TERM INT; while :; do sleep 60; done',
]);
export function parseStartCommand(value) {
  if (typeof value !== "string" || !value.trim()) return [...DEFAULT_START_COMMAND];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length && parsed.every((x) => typeof x === "string" && x))
      return parsed;
  } catch {}
  return null;
}

/** Removes trailing slashes without a regular expression (linear on any input). */
export function trimTrailingSlashes(value) {
  let end = String(value).length;
  while (end > 0 && value[end - 1] === "/") end--;
  return String(value).slice(0, end);
}

const failure = (code, detail) =>
  Object.assign(new Error(detail ? code + ": " + detail : code), { code });
const IMAGE_REF = /^[a-z0-9][a-z0-9._/@:-]{1,300}$/;

/** Read the cloud backend's settings from the environment. */
export function cloudConfiguration(env = process.env) {
  const size = (env.SANDBOX_SIZE || "micro").trim().toLowerCase();
  return {
    backend: env.SANDBOX_BACKEND === "cloud" ? "cloud" : "docker",
    dockerId: (env.DOCKER_ID || "").trim(),
    dockerPat: env.DOCKER_PAT || "",
    imageRef: (env.SANDBOX_IMAGE_REF || CLOUD_DEFAULTS.imageRef).trim(),
    // Directories whose trees are copied into /home/learner/lab at start; the
    // public sample seed by default, the private repository's seed added with ':'.
    seedDirs:
      env.SANDBOX_SEED_DIRS === undefined
        ? [CLOUD_DEFAULTS.seedDir]
        : env.SANDBOX_SEED_DIRS.split(":").map((x) => x.trim()).filter(Boolean),
    shellUser: (env.SANDBOX_SHELL_USER || CLOUD_DEFAULTS.shellUser).trim(),
    size: CLOUD_SIZES[size] ? size : "micro",
    startCommand: parseStartCommand(env.SANDBOX_START_COMMAND),
    apiBase: trimTrailingSlashes(env.SANDBOX_API_BASE || CLOUD_DEFAULTS.apiBase),
    exchangeUrl: env.DOCKER_TOKEN_EXCHANGE_URL || CLOUD_DEFAULTS.exchangeUrl,
    startTimeoutMs: CLOUD_DEFAULTS.startTimeoutMs,
  };
}

/** The reasons a cloud deployment cannot start, or an empty list. */
export function cloudConfigurationProblems(cloud) {
  const problems = [];
  if (!cloud.dockerId) problems.push("DOCKER_ID is not set");
  if (!cloud.dockerPat) problems.push("DOCKER_PAT is not set");
  if (!cloud.imageRef || !IMAGE_REF.test(cloud.imageRef)) problems.push("SANDBOX_IMAGE_REF is not a valid image reference");
  if (!/^[a-z_][a-z0-9_-]{0,31}(:[a-z0-9_-]{1,32})?$|^\d{1,6}(:\d{1,6})?$/i.test(cloud.shellUser || "")) problems.push("SANDBOX_SHELL_USER must be a user name or uid, optionally with a group");
  if (!cloud.startCommand) problems.push("SANDBOX_START_COMMAND must be a JSON array of non-empty strings");
  return problems;
}

const decodeJwtExpiry = (token) => {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

/**
 * Exchanges the personal access token for a management token and caches it
 * until shortly before it expires. One source is shared by every session.
 */
export function createTokenSource({ dockerId, dockerPat, exchangeUrl = CLOUD_DEFAULTS.exchangeUrl, fetch = globalThis.fetch, now = Date.now }) {
  let cached = null,
    pending = null;
  async function exchange() {
    const response = await fetch(exchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ identifier: dockerId, secret: dockerPat }),
      redirect: "error",
      signal: AbortSignal.timeout(CLOUD_DEFAULTS.requestTimeoutMs),
    });
    if (!response.ok) throw failure("cloud_auth_failed", "HTTP " + response.status);
    const body = await response.json().catch(() => ({}));
    if (typeof body.access_token !== "string" || !body.access_token) throw failure("cloud_auth_failed", "no access token");
    const expiry = decodeJwtExpiry(body.access_token) || now() + 10 * 60000;
    return { token: body.access_token, refreshAt: expiry - 60000 };
  }
  return {
    async token() {
      if (cached && now() < cached.refreshAt) return cached.token;
      if (!pending)
        pending = exchange()
          .then((entry) => {
            cached = entry;
            return entry.token;
          })
          .finally(() => {
            pending = null;
          });
      return pending;
    },
    forget() {
      cached = null;
    },
  };
}

const sources = new WeakMap();
function tokenSourceFor(cloud, deps) {
  if (deps.tokenSource) return deps.tokenSource;
  let source = sources.get(cloud);
  if (!source) {
    source = createTokenSource({ dockerId: cloud.dockerId, dockerPat: cloud.dockerPat, exchangeUrl: cloud.exchangeUrl, fetch: deps.fetch, now: deps.now });
    sources.set(cloud, source);
  }
  return source;
}

async function readError(response) {
  const text = await response.text().catch(() => "");
  try {
    const body = JSON.parse(text);
    return body?.message || body?.code || text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

const SEED_PATH = /^[A-Za-z0-9._][A-Za-z0-9._-]*$/;
const validSeedPart = (part) => SEED_PATH.test(part) && part !== "." && part !== "..";
/**
 * Reads the seed directories: every regular file becomes {path, mode, content}
 * relative to /home/learner/lab, every directory is created. Later directories
 * override earlier ones. Missing directories are skipped.
 */
export async function loadSeedFiles(dirs, maxBytes = CLOUD_DEFAULTS.maxSeedBytes) {
  const files = new Map(),
    directories = new Set();
  let total = 0;
  for (const dir of dirs || []) {
    let info;
    try {
      info = await stat(dir);
    } catch {
      continue;
    }
    if (!info.isDirectory()) continue;
    const walk = async (relative) => {
      const entries = await readdir(path.join(dir, relative), { withFileTypes: true });
      for (const entry of entries) {
        if (!validSeedPart(entry.name)) throw failure("sandbox_seed_invalid", entry.name);
        const rel = relative ? relative + "/" + entry.name : entry.name;
        if (entry.isDirectory()) {
          directories.add(rel);
          await walk(rel);
        } else if (entry.isFile() && entry.name !== ".keep") {
          const content = await readFile(path.join(dir, rel));
          const mode = (await stat(path.join(dir, rel))).mode & 0o777;
          if (files.has(rel)) total -= files.get(rel).content.length;
          total += content.length;
          if (total > maxBytes) throw failure("sandbox_seed_too_large");
          files.set(rel, { path: rel, mode, content });
        }
      }
    };
    await walk("");
  }
  return { directories: [...directories].sort(), files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
}

/**
 * The root setup script run once in a fresh machine: creates the learner user
 * (uid 1000) if the image lacks one, writes the seed tree under
 * /home/learner/lab and hands the home to the learner. Paths are validated and
 * contents are base64, so nothing in a seed file is interpreted by the shell.
 */
export function buildSeedScript(seed) {
  const lines = [
    "set -e",
    "if ! id -u learner >/dev/null 2>&1; then adduser -D -u 1000 -h /home/learner -s /bin/sh learner 2>/dev/null || useradd -m -u 1000 -d /home/learner -s /bin/sh learner; fi",
    "mkdir -p /home/learner/lab",
  ];
  for (const dir of seed.directories || []) {
    if (!dir.split("/").every(validSeedPart)) throw failure("sandbox_seed_invalid", dir);
    lines.push(`mkdir -p '/home/learner/lab/${dir}'`);
  }
  for (const file of seed.files || []) {
    if (!file.path.split("/").every(validSeedPart)) throw failure("sandbox_seed_invalid", file.path);
    const target = `'/home/learner/lab/${file.path}'`;
    lines.push(`printf '%s' '${Buffer.from(file.content).toString("base64")}' | base64 -d > ${target}`);
    lines.push(`chmod ${((file.mode ?? 0o644) & 0o777).toString(8).padStart(3, "0")} ${target}`);
  }
  lines.push("chown -R 1000:1000 /home/learner", "chmod 700 /home/learner", "echo SEED_OK");
  return lines.join("\n") + "\n";
}

const seedScripts = new WeakMap();
async function seedScriptFor(cloud, deps) {
  if (deps.seedScript !== undefined) return deps.seedScript;
  if (!seedScripts.has(cloud)) seedScripts.set(cloud, loadSeedFiles(cloud.seedDirs).then(buildSeedScript));
  return seedScripts.get(cloud);
}

/** Builds the sandbox request: a lab machine with no network, labelled for clean-up. */
export function buildCloudSandboxRequest(session, cloud, extra = {}) {
  if (!IMAGE_REF.test(cloud.imageRef || "")) throw failure("invalid_container_configuration");
  const size = CLOUD_SIZES[cloud.size] || CLOUD_SIZES.micro;
  return {
    displayNamePrefix: "cll-",
    imageRef: cloud.imageRef,
    resources: { cpus: size.cpus, memoryMib: size.memoryMib },
    // Docker composes inline policies with the account's default "allow **"
    // layer; only an explicit deny of every network blocks egress (verified
    // live: a bare denyAll left HTTP and DNS open, denyNetworks ["**"] blocked
    // HTTP, DNS and direct IP connections).
    networkPolicies: [{ mode: "denyAll", denyNetworks: ["**"] }],
    startupExecution: { rawImage: { start: { argv: [...(cloud.startCommand || DEFAULT_START_COMMAND)] } } },
    environment: { TERM: "xterm-256color", HOME: "/home/learner", USER: "learner" },
    labels: {
      "io.colelearninglabs.terminal": "1",
      "io.colelearninglabs.lab": String(session.labId || ""),
      "io.colelearninglabs.session": String(session.id || ""),
      ...(extra.labels || {}),
    },
  };
}

/** The `processes/{id}` resource name from a Process report, whatever prefix the endpoint adds. */
export function processResourceName(proc) {
  if (typeof proc?.name === "string" && proc.name) {
    const marker = proc.name.lastIndexOf("processes/");
    if (marker >= 0) {
      const id = proc.name.slice(marker + "processes/".length);
      if (id && !id.includes("/")) return "processes/" + id;
    }
  }
  return typeof proc?.uid === "string" && proc.uid ? "processes/" + proc.uid : "";
}

const sleep = (ms, sleeper) => (sleeper ? sleeper(ms) : new Promise((resolve) => setTimeout(resolve, ms)));

/**
 * Starts a Docker Cloud Sandbox for one learner. Same contract as
 * spawnSandboxContainer: { mode, onData, onExit, write, resize, readFile, destroy }.
 */
export async function spawnCloudSandbox(session, cfg, deps = {}) {
  const cloud = cfg.cloud;
  if (!cloud) throw failure("cloud_not_configured");
  const problems = cloudConfigurationProblems(cloud);
  if (problems.length) throw failure("cloud_not_configured", problems.join("; "));
  const fetchImpl = deps.fetch || globalThis.fetch,
    WebSocketImpl = deps.WebSocket || NodeWebSocket,
    now = deps.now || Date.now,
    tokens = tokenSourceFor(cloud, deps),
    allowedFiles = new Set((deps.allowedFiles || []).filter((x) => typeof x === "string")),
    startTimeoutMs = cloud.startTimeoutMs || CLOUD_DEFAULTS.startTimeoutMs,
    pollIntervalMs = deps.pollIntervalMs ?? CLOUD_DEFAULTS.pollIntervalMs;
  let sandboxName = "",
    etag = "",
    endpoint = null,
    socket = null,
    destroyed = false,
    exited = false;
  const dataListeners = [],
    exitListeners = [];
  const scoped = { token: "", expiresAt: 0 };

  async function api(method, path, { body, headers = {}, timeout = CLOUD_DEFAULTS.requestTimeoutMs, retryAuth = true } = {}) {
    const token = await tokens.token();
    const response = await fetchImpl(cloud.apiBase + path, {
      method,
      headers: { Authorization: "Bearer " + token, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(timeout),
    });
    if (response.status === 401 && retryAuth) {
      tokens.forget();
      return api(method, path, { body, headers, timeout, retryAuth: false });
    }
    return response;
  }

  const rememberEtag = (sandbox, response) => {
    const header = response?.headers?.get?.("etag");
    etag = sandbox?.core?.etag || header || etag;
  };

  async function fetchSandbox() {
    const response = await api("GET", "/sandboxes/" + encodeURIComponent(sandboxName));
    if (!response.ok) throw failure("cloud_sandbox_lookup_failed", "HTTP " + response.status);
    const sandbox = await response.json();
    rememberEtag(sandbox, response);
    return sandbox;
  }

  async function scopedToken(permissions) {
    if (scoped.token && now() < scoped.expiresAt - 30000) return scoped.token;
    const response = await api("POST", "/sandboxes/" + encodeURIComponent(sandboxName) + "/endpoint-credentials", {
      body: { permissions, ttl: CLOUD_DEFAULTS.credentialTtlSeconds + "s" },
    });
    if (!response.ok) throw failure("cloud_credential_failed", "HTTP " + response.status);
    const body = await response.json();
    if (typeof body.token !== "string" || !body.token) throw failure("cloud_credential_failed", "no token");
    const expiry = Date.parse(body.expireTime || "");
    scoped.token = body.token;
    scoped.expiresAt = Number.isFinite(expiry) ? expiry : now() + CLOUD_DEFAULTS.credentialTtlSeconds * 1000;
    return scoped.token;
  }

  const endpointUrl = (path) => trimTrailingSlashes(endpoint.uri) + path;

  async function endpointRequest(method, path, { body, timeout = CLOUD_DEFAULTS.requestTimeoutMs, accept = "application/json" } = {}) {
    const token = await scopedToken(["sandboxesExec", "sandboxesFilesRead"]);
    return fetchImpl(endpointUrl(path), {
      method,
      headers: { Authorization: "Bearer " + token, Accept: accept, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(timeout),
    });
  }

  const emitExit = (code) => {
    if (exited) return;
    exited = true;
    for (const fn of exitListeners) {
      try {
        fn({ exitCode: code });
      } catch {}
    }
  };

  const destroy = async () => {
    if (destroyed) return;
    destroyed = true;
    try {
      socket?.terminate?.();
      socket?.close?.();
    } catch {}
    socket = null;
    if (!sandboxName) return;
    // The API needs the version it should delete; refresh it once if ours is stale.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (!etag) await fetchSandbox();
        const response = await api("DELETE", "/sandboxes/" + encodeURIComponent(sandboxName), { headers: etag ? { "If-Match": etag } : {} });
        if (response.ok || response.status === 404) return;
        if (response.status === 412 || response.status === 428 || response.status === 409) {
          etag = "";
          continue;
        }
        return;
      } catch {
        if (attempt === 2) return;
        await sleep(500, deps.sleep);
      }
    }
  };

  try {
    // 1. Create the sandbox and wait until it runs and has an endpoint.
    const created = await api("POST", "/sandboxes", { body: buildCloudSandboxRequest(session, cloud, { labels: cfg.reviewInstanceId ? { "io.colelearninglabs.review": cfg.reviewInstanceId } : {} }), timeout: 30000 });
    if (created.status === 429 || created.status === 403) throw failure("capacity_reached", await readError(created));
    if (!created.ok) throw failure("container_start_failed", "HTTP " + created.status + " " + (await readError(created)));
    let sandbox = await created.json();
    if (typeof sandbox.name !== "string" || !sandbox.name) throw failure("container_start_failed", "no sandbox name");
    sandboxName = sandbox.name.replace(/^sandboxes\//, "");
    rememberEtag(sandbox, created);
    const deadline = now() + startTimeoutMs;
    for (;;) {
      const status = sandbox.core?.status;
      endpoint = sandbox.core?.endpoint || null;
      if (status === "running" && endpoint?.uri) break;
      if (status === "failed" || status === "stopped" || status === "stopping" || status === "deleting")
        throw failure("container_start_failed", "sandbox " + status + (sandbox.failure?.message ? ": " + sandbox.failure.message : ""));
      if (now() >= deadline) throw failure("container_start_failed", "timed out waiting for the sandbox");
      await sleep(pollIntervalMs, deps.sleep);
      sandbox = await fetchSandbox();
    }
    if (Array.isArray(endpoint.capabilities)) {
      for (const needed of ["createProcess", "interact", "readFile"])
        if (!endpoint.capabilities.includes(needed)) throw failure("cloud_endpoint_unsupported", needed);
    }

    // 2. Seed the machine as root: learner user, lab files, home ownership.
    const script = await seedScriptFor(cloud, deps);
    const setup = await endpointRequest("POST", "/v1/processes", {
      body: { cmd: ["/bin/sh", "-c", script], session: "setup", label: "cll-setup-" + crypto.randomBytes(4).toString("hex") },
      timeout: 30000,
    });
    if (!setup.ok) throw failure("sandbox_seed_failed", "HTTP " + setup.status + " " + (await readError(setup)));
    const setupName = processResourceName(await setup.json());
    if (!/^processes\/[^/]+$/.test(setupName)) throw failure("sandbox_seed_failed", "no process name");
    const setupDeadline = now() + CLOUD_DEFAULTS.setupTimeoutMs;
    for (;;) {
      const lookup = await endpointRequest("GET", "/v1/" + setupName);
      if (!lookup.ok) throw failure("sandbox_seed_failed", "HTTP " + lookup.status);
      const report = await lookup.json();
      if (report.state === "exited") {
        if (report.exitCode !== 0) throw failure("sandbox_seed_failed", "exit code " + report.exitCode);
        break;
      }
      if (now() >= setupDeadline) throw failure("sandbox_seed_failed", "timed out");
      await sleep(Math.min(pollIntervalMs, 500), deps.sleep);
    }

    // 3. Start the learner's shell with a PTY, as the learner.
    const createdProcess = await endpointRequest("POST", "/v1/processes", {
      body: {
        cmd: ["/bin/sh", "-i"],
        env: { TERM: "xterm-256color", HOME: "/home/learner", USER: "learner", HISTFILE: "/home/learner/.sh_history" },
        workingDir: "/home/learner",
        user: cloud.shellUser,
        pty: { initialSize: { rows: 24, cols: 80 } },
        session: "learner-shell",
        label: "learner-shell-" + crypto.randomBytes(4).toString("hex"),
      },
    });
    if (!createdProcess.ok) throw failure("docker_pty_unavailable", "HTTP " + createdProcess.status + " " + (await readError(createdProcess)));
    const proc = await createdProcess.json();
    const processName = processResourceName(proc);
    if (!/^processes\/[^/]+$/.test(processName)) throw failure("docker_pty_unavailable", "no process name");

    // 4. Attach to the shell over the endpoint's WebSocket.
    const token = await scopedToken(["sandboxesExec", "sandboxesFilesRead"]);
    const wsUrl = endpointUrl("/v1/" + processName + "/interact").replace(/^http/, "ws");
    socket = new WebSocketImpl(wsUrl, ["sandboxes.v1"], {
      headers: { Authorization: "Bearer " + token },
      followRedirects: false,
      maxPayload: 1 << 20,
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(failure("docker_pty_unavailable", "attach timed out")), CLOUD_DEFAULTS.requestTimeoutMs);
      socket.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("error", (error) => {
        clearTimeout(timer);
        reject(failure("docker_pty_unavailable", error?.message));
      });
    });
    socket.send(JSON.stringify({ attach: { name: processName, resumeFrom: "0" } }));
    socket.on("message", (raw, isBinary) => {
      if (isBinary || destroyed) return;
      let frame;
      try {
        frame = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (frame.chunk && typeof frame.chunk.data === "string") {
        const text = Buffer.from(frame.chunk.data, "base64").toString("utf8");
        for (const fn of dataListeners) {
          try {
            fn(text);
          } catch {}
        }
      } else if (frame.exited) emitExit(Number.isInteger(frame.exited.exitCode) ? frame.exited.exitCode : 0);
      else if (frame.code && !frame.chunk && !frame.heartbeat) emitExit(1); // terminal error frame
    });
    socket.on("close", () => emitExit(0));
    socket.on("error", () => emitExit(1));

    return {
      mode: "docker-cloud-sandbox",
      name: sandboxName,
      containerId: sandboxName.slice(0, 12),
      onData: (fn) => dataListeners.push(fn),
      onExit: (fn) => exitListeners.push(fn),
      write: (data) => {
        if (destroyed || !socket || socket.readyState !== 1) return;
        socket.send(JSON.stringify({ stdin: Buffer.from(String(data), "utf8").toString("base64") }));
      },
      resize: (cols, rows) => {
        if (destroyed || !socket || socket.readyState !== 1) return;
        socket.send(JSON.stringify({ resize: { rows, cols } }));
      },
      readFile: async (file) => {
        if (destroyed || !allowedFiles.has(file)) return null;
        try {
          const response = await endpointRequest("GET", "/v1/files/content?path=" + encodeURIComponent(file), { timeout: 5000, accept: "application/octet-stream" });
          if (!response.ok) return null;
          const length = Number(response.headers.get("content-length"));
          if (Number.isFinite(length) && length > CLOUD_DEFAULTS.maxFileBytes) return null;
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length > CLOUD_DEFAULTS.maxFileBytes) return null;
          return bytes.toString("utf8");
        } catch {
          return null;
        }
      },
      destroy,
    };
  } catch (error) {
    await destroy();
    throw error?.code ? error : failure("container_start_failed", error?.message);
  }
}
