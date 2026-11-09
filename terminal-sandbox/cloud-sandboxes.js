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
import { WebSocket as NodeWebSocket } from "ws";

export const CLOUD_DEFAULTS = Object.freeze({
  apiBase: "https://connect.docker.com/sandboxes/v1",
  exchangeUrl: "https://hub.docker.com/v2/auth/token",
  startTimeoutMs: 90000,
  pollIntervalMs: 1000,
  requestTimeoutMs: 15000,
  credentialTtlSeconds: 300,
  maxFileBytes: 16384,
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
 * The sandbox's main process. A lab image's own command is an interactive shell,
 * which would exit at once without a terminal, so the machine runs the image's
 * entrypoint (which seeds the learner's home) followed by a sleep loop; the
 * learner's shell is a separate PTY process. Override with SANDBOX_START_COMMAND
 * as a JSON array when the image uses a different entrypoint.
 */
export const DEFAULT_START_COMMAND = Object.freeze([
  "/usr/local/bin/cll-entrypoint",
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
    imageRef: (env.SANDBOX_IMAGE_REF || "").trim(),
    size: CLOUD_SIZES[size] ? size : "micro",
    startCommand: parseStartCommand(env.SANDBOX_START_COMMAND),
    apiBase: (env.SANDBOX_API_BASE || CLOUD_DEFAULTS.apiBase).replace(/\/+$/, ""),
    exchangeUrl: env.DOCKER_TOKEN_EXCHANGE_URL || CLOUD_DEFAULTS.exchangeUrl,
    startTimeoutMs: CLOUD_DEFAULTS.startTimeoutMs,
  };
}

/** The reasons a cloud deployment cannot start, or an empty list. */
export function cloudConfigurationProblems(cloud) {
  const problems = [];
  if (!cloud.dockerId) problems.push("DOCKER_ID is not set");
  if (!cloud.dockerPat) problems.push("DOCKER_PAT is not set");
  if (!cloud.imageRef) problems.push("SANDBOX_IMAGE_REF is not set (a registry reference such as docker.io/<account>/cll-sandbox:cloud)");
  else if (!IMAGE_REF.test(cloud.imageRef)) problems.push("SANDBOX_IMAGE_REF is not a valid image reference");
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

/** Builds the sandbox request: a lab machine with no network, labelled for clean-up. */
export function buildCloudSandboxRequest(session, cloud, extra = {}) {
  if (!IMAGE_REF.test(cloud.imageRef || "")) throw failure("invalid_container_configuration");
  const size = CLOUD_SIZES[cloud.size] || CLOUD_SIZES.micro;
  return {
    displayNamePrefix: "cll-",
    imageRef: cloud.imageRef,
    resources: { cpus: size.cpus, memoryMib: size.memoryMib },
    networkPolicies: [{ mode: "denyAll" }],
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

  const endpointUrl = (path) => endpoint.uri.replace(/\/+$/, "") + path;

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

    // 2. Start the learner's shell with a PTY.
    const createdProcess = await endpointRequest("POST", "/v1/processes", {
      body: {
        cmd: ["/bin/sh", "-i"],
        env: { TERM: "xterm-256color", HOME: "/home/learner", USER: "learner", HISTFILE: "/home/learner/.sh_history" },
        workingDir: "/home/learner",
        pty: { initialSize: { rows: 24, cols: 80 } },
        session: "learner-shell",
        label: "learner-shell-" + crypto.randomBytes(4).toString("hex"),
      },
    });
    if (!createdProcess.ok) throw failure("docker_pty_unavailable", "HTTP " + createdProcess.status + " " + (await readError(createdProcess)));
    const proc = await createdProcess.json();
    const processName = typeof proc.name === "string" && proc.name ? proc.name.replace(/^.*?(processes\/[^/]+)$/, "$1") : proc.uid ? "processes/" + proc.uid : "";
    if (!/^processes\/[^/]+$/.test(processName)) throw failure("docker_pty_unavailable", "no process name");

    // 3. Attach to the shell over the endpoint's WebSocket.
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
