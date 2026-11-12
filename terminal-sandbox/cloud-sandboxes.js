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
  // Desktop view: a public image with a Lubuntu-style LXDE desktop, a VNC
  // server and a WebSocket bridge on port 6081. Verified to start with all
  // egress denied; the screen reaches the learner only through the controller.
  desktopImageRef: "docker.io/dorowu/ubuntu-desktop-lxde-vnc:focal",
  desktopSize: "small",
  desktopPort: 6081,
  desktopResolution: "1024x768",
  desktopSetupTimeoutMs: 90000,
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
const SECRET = /^[A-Za-z0-9]{8,32}$/;
export const randomSecret = (length) => crypto.randomBytes(24).toString("base64").replace(/[^A-Za-z0-9]/g, "").padEnd(length, "x").slice(0, length);
const secureServiceUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
};

/**
 * A time zone name the learner's browser reported (for example
 * "America/New_York"), or "" when it is missing or not a plain zone name. The
 * machine's start script also checks that the zone exists before using it.
 */
export function validTimeZone(value) {
  return typeof value === "string" && value.length <= 64 && /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/.test(value) ? value : "";
}

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
    // "desktop": a graphical Linux desktop streamed to the browser (default).
    // "terminal": a shell only, on the smaller terminal image.
    view: env.SANDBOX_VIEW === "terminal" ? "terminal" : "desktop",
    desktopImageRef: (env.DESKTOP_IMAGE_REF || CLOUD_DEFAULTS.desktopImageRef).trim(),
    desktopSize: CLOUD_SIZES[(env.DESKTOP_SIZE || "").trim().toLowerCase()] ? env.DESKTOP_SIZE.trim().toLowerCase() : CLOUD_DEFAULTS.desktopSize,
    desktopResolution: /^\d{3,4}x\d{3,4}$/.test(env.DESKTOP_RESOLUTION || "") ? env.DESKTOP_RESOLUTION : CLOUD_DEFAULTS.desktopResolution,
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
  if (!secureServiceUrl(cloud.apiBase)) problems.push("SANDBOX_API_BASE must be an HTTPS URL without credentials, query or fragment");
  if (!secureServiceUrl(cloud.exchangeUrl)) problems.push("DOCKER_TOKEN_EXCHANGE_URL must be an HTTPS URL without credentials, query or fragment");
  if (!cloud.imageRef || !IMAGE_REF.test(cloud.imageRef)) problems.push("SANDBOX_IMAGE_REF is not a valid image reference");
  if (!/^[a-z_][a-z0-9_-]{0,31}(:[a-z0-9_-]{1,32})?$|^\d{1,6}(:\d{1,6})?$/i.test(cloud.shellUser || "")) problems.push("SANDBOX_SHELL_USER must be a user name or uid, optionally with a group");
  if (!cloud.startCommand) problems.push("SANDBOX_START_COMMAND must be a JSON array of non-empty strings");
  if (cloud.view === "desktop" && !IMAGE_REF.test(cloud.desktopImageRef || "")) problems.push("DESKTOP_IMAGE_REF is not a valid image reference");
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

/** Bound streamed file reads even when a learner omits or falsifies Content-Length. */
export async function readBoundedFileResponse(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  let finished = false;
  try {
    const advertised = Number(response.headers.get("content-length"));
    if (Number.isFinite(advertised) && advertised > limit) return null;
    const chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        finished = true;
        return Buffer.concat(chunks, size).toString("utf8");
      }
      size += value.byteLength;
      if (size > limit) return null;
      chunks.push(Buffer.from(value));
    }
  } finally {
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
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
 * The desktop size for one session: the size of the learner's lab area when the
 * browser reported one (so text is shown at full size on any device, from an
 * 11-inch Chromebook to a large monitor), otherwise the configured default.
 */
export function desktopResolutionFor(screen, fallback = CLOUD_DEFAULTS.desktopResolution) {
  const width = Number(screen?.width), height = Number(screen?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 320 || height < 200) return fallback;
  const fit = (value, min, max) => Math.min(max, Math.max(min, Math.floor(value / 8) * 8));
  return fit(width, 800, 1600) + "x" + fit(height, 480, 1000);
}

/** Turns a lab definition's `files` list into a seed: {directories, files}. */
export function seedFromLabFiles(files) {
  const directories = new Set(),
    out = [];
  let total = 0;
  for (const file of files || []) {
    if (!file || typeof file.path !== "string" || !file.path.split("/").every(validSeedPart)) throw failure("sandbox_seed_invalid", String(file?.path));
    const content = Buffer.from(String(file.content ?? ""), file.encoding === "base64" ? "base64" : "utf8");
    total += content.length;
    if (total > 96 * 1024) throw failure("sandbox_seed_too_large");
    const parts = file.path.split("/");
    for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join("/"));
    out.push({ path: file.path, mode: file.mode === 0o755 ? 0o755 : 0o644, content });
  }
  return { directories: [...directories].sort(), files: out };
}

/** A lab file with this name is the lab's own progress checker; see buildSeedScript. */
export const PROGRESS_CHECK = ".lab-check.sh";
/** Where the checker's output is kept for the lab checks to read. */
export const PROGRESS_FILE = "/home/learner/.lab-progress";
const PROGRESS_WATCH = [
  "#!/bin/sh",
  "# Keeps a short progress note for the lab checks. It only looks at the lab folder.",
  "while :; do",
  "  ( cd /home/learner/lab 2>/dev/null && sh /home/learner/.lab-check.sh ) > /home/learner/.lab-progress.new 2>/dev/null",
  "  mv -f /home/learner/.lab-progress.new /home/learner/.lab-progress 2>/dev/null",
  "  sleep 2",
  "done",
  "",
].join("\n");

/**
 * The root setup script run once in a fresh machine: makes sure the learner
 * user exists, writes the seed tree under /home/learner/lab and hands it to
 * the learner. Paths are validated and contents are base64, so nothing in a
 * seed file is interpreted by the shell.
 *
 * With `desktop`, the image creates the learner account itself as the desktop
 * starts, so the script waits for it, removes its administrator rights, records
 * terminal commands for the lab checks, waits for the screen bridge, and opens
 * the lab folder and a terminal on the desktop.
 */
export function buildSeedScript(seed, { desktop = false, desktopPort = CLOUD_DEFAULTS.desktopPort, fresh = false } = {}) {
  const lines = ["set -e"];
  // `fresh` replaces a lab folder the image already filled (the host-container image seeds the shared tree itself).
  if (fresh) lines.push("rm -rf /home/learner/lab");
  if (desktop) {
    lines.push(
      "n=0; until id -u learner >/dev/null 2>&1 && [ -d /home/learner ]; do n=$((n+1)); if [ $n -gt 120 ]; then echo 'desktop user was not created'; exit 1; fi; sleep 0.5; done",
      "gpasswd -d learner sudo >/dev/null 2>&1 || true; gpasswd -d learner adm >/dev/null 2>&1 || true; passwd -l learner >/dev/null 2>&1 || true",
    );
  } else {
    lines.push("if ! id -u learner >/dev/null 2>&1; then adduser -D -u 1000 -h /home/learner -s /bin/sh learner 2>/dev/null || useradd -m -u 1000 -d /home/learner -s /bin/sh learner; fi");
  }
  lines.push("mkdir -p /home/learner/lab");
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
  // A lab may ship its own progress checker (.lab-check.sh). It leaves the lab
  // folder, and a small loop runs it as the learner every two seconds, so the
  // lab checks can see work done in the file manager as well as typed commands.
  lines.push(
    `if [ -f /home/learner/lab/${PROGRESS_CHECK} ]; then mv -f /home/learner/lab/${PROGRESS_CHECK} /home/learner/${PROGRESS_CHECK}; printf '%s' '${Buffer.from(PROGRESS_WATCH).toString("base64")}' | base64 -d > /home/learner/.lab-watch.sh; : > /home/learner/.lab-progress; fi`,
  );
  const startWatch = "if [ -f /home/learner/.lab-watch.sh ]; then if [ \"$(id -u)\" = 0 ]; then su learner -c 'nohup sh /home/learner/.lab-watch.sh >/dev/null 2>&1 &' || true; else nohup sh /home/learner/.lab-watch.sh >/dev/null 2>&1 & fi; fi";
  if (desktop) {
    lines.push(
      // A readable prompt, UTF-8 output, and a short record of typed commands that the controller may read for the lab checks.
      `printf '%s\\n' '' '# Cole Learning Labs' 'export LANG=C.UTF-8' 'PS1='"'"'\\[\\e]0;learner@lab-pc: \\w\\a\\]\\[\\e[1;32m\\]learner@lab-pc\\[\\e[0m\\]:\\[\\e[1;34m\\]\\w\\[\\e[0m\\]\\$ '"'"'' 'PROMPT_COMMAND='"'"'history -a; tail -n 200 "$HOME/.bash_history" > "$HOME/.lab-history" 2>/dev/null'"'"'' >> /home/learner/.bashrc`,
      ": > /home/learner/.lab-history",
      "chown -R learner:learner /home/learner/lab /home/learner/.bashrc /home/learner/.lab-history",
      "for f in /home/learner/.lab-check.sh /home/learner/.lab-watch.sh /home/learner/.lab-progress; do if [ -e $f ]; then chown learner:learner $f; fi; done",
      startWatch,
      `n=0; until bash -c 'echo > /dev/tcp/127.0.0.1/${Number(desktopPort)}' 2>/dev/null && [ -S /tmp/.X11-unix/X1 ]; do n=$((n+1)); if [ $n -gt 120 ]; then echo 'desktop did not start'; exit 1; fi; sleep 0.5; done`,
      "sleep 1",
      // The project's desktop image opens the lab folder and a terminal with its
      // own helper (cll-open-lab); the earlier LXDE image gets the same two windows.
      "if [ -x /usr/local/bin/cll-open-lab ]; then su learner -c 'cd /home/learner/lab && DISPLAY=:1 nohup /usr/local/bin/cll-open-lab /home/learner/lab >/dev/null 2>&1 &' || true; else",
      "su learner -c 'cd /home/learner/lab && DISPLAY=:1 nohup pcmanfm /home/learner/lab >/dev/null 2>&1 &' || true",
      "su learner -c 'cd /home/learner/lab && DISPLAY=:1 nohup lxterminal --working-directory=/home/learner/lab --geometry=96x24 >/dev/null 2>&1 &' || true",
      "fi",
    );
  } else {
    lines.push("chown -R 1000:1000 /home/learner", "chmod 700 /home/learner", startWatch);
  }
  lines.push("echo SEED_OK");
  return lines.join("\n") + "\n";
}

const seedScripts = new WeakMap();
/** The setup script for one session: the lab's own files, or the shared seed tree. */
export async function seedScriptFor(cloud, deps, options = {}) {
  if (deps.seedScript !== undefined) return deps.seedScript;
  // A lab that ships its own files gets only those; other labs get the shared seed tree.
  if (Array.isArray(deps.labFiles) && deps.labFiles.length) return buildSeedScript(seedFromLabFiles(deps.labFiles), options);
  const key = options.desktop ? "desktop" : "terminal";
  if (!seedScripts.has(cloud)) seedScripts.set(cloud, {});
  const cache = seedScripts.get(cloud);
  if (!cache[key]) cache[key] = loadSeedFiles(cloud.seedDirs).then((seed) => buildSeedScript(seed, options));
  return cache[key];
}

/** Builds the sandbox request: a lab machine with no network, labelled for clean-up. */
export function buildCloudSandboxRequest(session, cloud, extra = {}) {
  const desktop = extra.desktop || null;
  const imageRef = desktop ? cloud.desktopImageRef : cloud.imageRef;
  if (!IMAGE_REF.test(imageRef || "")) throw failure("invalid_container_configuration");
  const resolution = desktop ? desktop.resolution || cloud.desktopResolution : "";
  if (desktop && !(SECRET.test(desktop.vncPassword) && SECRET.test(desktop.userPassword) && /^\d{3,4}x\d{3,4}$/.test(resolution || ""))) throw failure("invalid_container_configuration");
  const size = CLOUD_SIZES[desktop ? cloud.desktopSize : cloud.size] || CLOUD_SIZES[desktop ? CLOUD_DEFAULTS.desktopSize : "micro"];
  // The desktop image reads its settings from the environment of its own start
  // script: the learner account, a random account password nobody is told, a
  // per-session screen password, and the screen size.
  const zone = desktop ? validTimeZone(desktop.timeZone) : "";
  const start = desktop
    ? ["/bin/bash", "-c", `export USER=learner PASSWORD=${desktop.userPassword} VNC_PASSWORD=${desktop.vncPassword} RESOLUTION=${resolution}${zone ? " TZ=" + zone : ""}; exec /startup.sh`]
    : [...(cloud.startCommand || DEFAULT_START_COMMAND)];
  return {
    displayNamePrefix: "cll-",
    imageRef,
    resources: { cpus: size.cpus, memoryMib: size.memoryMib },
    // Docker composes inline policies with the account's default "allow **"
    // layer; only an explicit deny of every network blocks egress (verified
    // live: a bare denyAll left HTTP and DNS open, denyNetworks ["**"] blocked
    // HTTP, DNS and direct IP connections).
    networkPolicies: [{ mode: "denyAll", denyNetworks: ["**"] }],
    startupExecution: { rawImage: { start: { argv: start } } },
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
    pollIntervalMs = deps.pollIntervalMs ?? CLOUD_DEFAULTS.pollIntervalMs,
    desktop = cloud.view === "desktop" ? { vncPassword: randomSecret(8), userPassword: randomSecret(16), resolution: desktopResolutionFor(session.screen, cloud.desktopResolution), timeZone: validTimeZone(session.timeZone) } : null;
  let sandboxName = "",
    etag = "",
    endpoint = null,
    socket = null,
    destroyed = false,
    deletionComplete = false,
    deletionAccepted = false,
    deleting = null,
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
    if (!response.ok) throw Object.assign(failure("cloud_sandbox_lookup_failed", "HTTP " + response.status), { status: response.status });
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
    if (deletionComplete) return;
    if (deleting) return deleting;
    destroyed = true;
    try {
      socket?.terminate?.();
      socket?.close?.();
    } catch {}
    socket = null;
    scoped.token = "";
    if (!sandboxName) { deletionComplete = true; return; }
    deleting = (async () => {
      // A stale version, throttling, or transport failure gets a bounded retry.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (deletionAccepted) {
            const lookup = await api("GET", "/sandboxes/" + encodeURIComponent(sandboxName));
            if (lookup.status === 404) { deletionComplete = true; return; }
            // A 202 DELETE only schedules removal. Keep its allocation reserved
            // until a later lookup confirms the resource no longer exists.
            if (!lookup.ok && lookup.status !== 429 && lookup.status < 500) break;
            if (attempt < 2) await sleep(500, deps.sleep);
            continue;
          }
          if (!etag) await fetchSandbox();
          const response = await api("DELETE", "/sandboxes/" + encodeURIComponent(sandboxName), { headers: etag ? { "If-Match": etag } : {} });
          if ([200, 204, 404].includes(response.status)) { deletionComplete = true; return; }
          if (response.status === 202) {
            deletionAccepted = true;
            if (attempt < 2) await sleep(500, deps.sleep);
            continue;
          }
          if (response.status === 412 || response.status === 428 || response.status === 409) {
            etag = "";
            continue;
          }
          if (response.status !== 429 && response.status < 500) break;
        } catch (error) {
          if (error?.status === 404) { deletionComplete = true; return; }
          // Never include provider messages or tokens in cleanup diagnostics.
        }
        if (attempt < 2) await sleep(500, deps.sleep);
      }
      throw failure("sandbox_cleanup_failed");
    })();
    try { await deleting; } finally { deleting = null; }
  };

  /**
   * Starts a process with a PTY and attaches to it over the endpoint's
   * WebSocket; its output goes to the data listeners. Returns the socket.
   */
  async function startShell({ cmd, env, workingDir, user, onClosed }) {
    const createdProcess = await endpointRequest("POST", "/v1/processes", {
      body: {
        cmd,
        env,
        workingDir,
        user,
        pty: { initialSize: { rows: 24, cols: 80 } },
        session: "learner-shell",
        label: "learner-shell-" + crypto.randomBytes(4).toString("hex"),
      },
    });
    if (!createdProcess.ok) throw failure("docker_pty_unavailable", "HTTP " + createdProcess.status + " " + (await readError(createdProcess)));
    const proc = await createdProcess.json();
    const processName = processResourceName(proc);
    if (!/^processes\/[^/]+$/.test(processName)) throw failure("docker_pty_unavailable", "no process name");

    // Attach to the shell over the endpoint's WebSocket.
    const token = await scopedToken(["sandboxesExec", "sandboxesFilesRead"]);
    const wsUrl = endpointUrl("/v1/" + processName + "/interact").replace(/^http/, "ws");
    const shell = new WebSocketImpl(wsUrl, ["sandboxes.v1"], {
      headers: { Authorization: "Bearer " + token },
      followRedirects: false,
      maxPayload: 1 << 20,
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(failure("docker_pty_unavailable", "attach timed out")), CLOUD_DEFAULTS.requestTimeoutMs);
      shell.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      shell.once("error", (error) => {
        clearTimeout(timer);
        reject(failure("docker_pty_unavailable", error?.message));
      });
    });
    shell.send(JSON.stringify({ attach: { name: processName, resumeFrom: "0" } }));
    let closed = false;
    const close = (code) => {
      if (closed) return;
      closed = true;
      onClosed(code);
    };
    shell.on("message", (raw, isBinary) => {
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
      } else if (frame.exited) close(Number.isInteger(frame.exited.exitCode) ? frame.exited.exitCode : 0);
      else if (frame.code && !frame.chunk && !frame.heartbeat) close(1); // terminal error frame
    });
    shell.on("close", () => close(0));
    shell.on("error", () => close(1));
    return shell;
  }
  const sendToShell = (target, data) => {
    if (destroyed || !target || target.readyState !== 1) return;
    target.send(JSON.stringify({ stdin: Buffer.from(String(data), "utf8").toString("base64") }));
  };
  const resizeShell = (target, cols, rows) => {
    if (destroyed || !target || target.readyState !== 1) return;
    target.send(JSON.stringify({ resize: { rows, cols } }));
  };

  try {
    // 1. Create the sandbox and wait until it runs and has an endpoint.
    const created = await api("POST", "/sandboxes", { body: buildCloudSandboxRequest(session, cloud, { desktop, labels: cfg.reviewInstanceId ? { "io.colelearninglabs.review": cfg.reviewInstanceId } : {} }), timeout: 30000 });
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
    if (!secureServiceUrl(endpoint.uri)) throw failure("cloud_endpoint_unsupported", "endpoint must use HTTPS");
    if (Array.isArray(endpoint.capabilities)) {
      for (const needed of desktop ? ["createProcess", "readFile"] : ["createProcess", "interact", "readFile"])
        if (!endpoint.capabilities.includes(needed)) throw failure("cloud_endpoint_unsupported", needed);
    }

    // 2. Seed the machine as root: learner user, lab files, home ownership.
    const script = await seedScriptFor(cloud, deps, { desktop: Boolean(desktop), desktopPort: CLOUD_DEFAULTS.desktopPort });
    const setup = await endpointRequest("POST", "/v1/processes", {
      body: { cmd: ["/bin/sh", "-c", script], session: "setup", label: "cll-setup-" + crypto.randomBytes(4).toString("hex") },
      timeout: 30000,
    });
    if (!setup.ok) throw failure("sandbox_seed_failed", "HTTP " + setup.status + " " + (await readError(setup)));
    const setupName = processResourceName(await setup.json());
    if (!/^processes\/[^/]+$/.test(setupName)) throw failure("sandbox_seed_failed", "no process name");
    const setupDeadline = now() + (desktop ? CLOUD_DEFAULTS.desktopSetupTimeoutMs : CLOUD_DEFAULTS.setupTimeoutMs);
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

    const readLabFile = async (file, limit = CLOUD_DEFAULTS.maxFileBytes) => {
      try {
        const response = await endpointRequest("GET", "/v1/files/content?path=" + encodeURIComponent(file), { timeout: 5000, accept: "application/octet-stream" });
        if (!response.ok) return null;
        return await readBoundedFileResponse(response, limit);
      } catch {
        return null;
      }
    };

    // 3a. Desktop view: publish the screen bridge and hand its address to the
    // controller. The learner's browser never learns this address; the
    // controller relays the screen and the per-session password protects it.
    if (desktop) {
      const published = await api("POST", "/sandboxes/" + encodeURIComponent(sandboxName) + "/ports", { body: { port: { number: CLOUD_DEFAULTS.desktopPort, protocol: "tcp" } } });
      if (!published.ok) throw failure("desktop_unavailable", "HTTP " + published.status + " " + (await readError(published)));
      const port = await published.json();
      let screen;
      try {
        screen = new URL(port.url);
      } catch {
        throw failure("desktop_unavailable", "no screen address");
      }
      if (screen.protocol !== "https:") throw failure("desktop_unavailable", "screen address is not https");
      etag = ""; // publishing changes the sandbox version; refresh it before deleting
      const [width, height] = desktop.resolution.split("x").map(Number);
      return {
        mode: "docker-cloud-desktop",
        name: sandboxName,
        containerId: sandboxName.slice(0, 12),
        desktop: { url: "wss://" + screen.host + "/", password: desktop.vncPassword, width, height },
        onData: (fn) => dataListeners.push(fn),
        onExit: (fn) => exitListeners.push(fn),
        // The text terminal: a second way into the same machine, a login shell
        // in the lab folder that screen readers and plain keyboards can use.
        write: (data) => sendToShell(socket, data),
        resize: (cols, rows) => resizeShell(socket, cols, rows),
        openShell: async (onClosed = () => {}) => {
          if (destroyed) throw failure("shell_unavailable");
          if (socket && socket.readyState === 1) return;
          if (Array.isArray(endpoint.capabilities) && !endpoint.capabilities.includes("interact")) throw failure("shell_unavailable", "interact");
          const shell = await startShell({
            cmd: ["/bin/bash", "-l"],
            env: { TERM: "xterm-256color", HOME: "/home/learner", USER: "learner", LOGNAME: "learner", SHELL: "/bin/bash", LANG: "C.UTF-8", DISPLAY: ":1" },
            workingDir: "/home/learner/lab",
            user: "learner",
            onClosed: (code) => {
              if (socket === shell) socket = null;
              onClosed(code);
            },
          });
          if (destroyed) {
            try { shell.terminate?.(); } catch {}
            throw failure("shell_unavailable");
          }
          socket = shell;
        },
        /** Recent commands typed in a desktop terminal, newest last. */
        history: async () => {
          if (destroyed) return [];
          const text = await readLabFile("/home/learner/.lab-history", 65536);
          return text ? text.split("\n").map((line) => line.trim()).filter(Boolean).slice(-200) : [];
        },
        readFile: async (file) => (destroyed || !allowedFiles.has(file) ? null : readLabFile(file)),
        destroy,
      };
    }

    // 3. Start the learner's shell with a PTY, as the learner.
    socket = await startShell({
      cmd: ["/bin/sh", "-i"],
      env: { TERM: "xterm-256color", HOME: "/home/learner", USER: "learner", HISTFILE: "/home/learner/.sh_history" },
      workingDir: "/home/learner",
      user: cloud.shellUser,
      onClosed: (code) => emitExit(code),
    });

    return {
      mode: "docker-cloud-sandbox",
      name: sandboxName,
      containerId: sandboxName.slice(0, 12),
      onData: (fn) => dataListeners.push(fn),
      onExit: (fn) => exitListeners.push(fn),
      write: (data) => sendToShell(socket, data),
      resize: (cols, rows) => resizeShell(socket, cols, rows),
      readFile: async (file) => (destroyed || !allowedFiles.has(file) ? null : readLabFile(file)),
      destroy,
    };
  } catch (error) {
    const reported = error?.code ? error : failure("container_start_failed", error?.message);
    try { await destroy(); } catch {
      // The controller retains only this cleanup handle and retries it; startup
      // failures must not lose the only reference to an undeleted machine.
      reported.cleanup = destroy;
    }
    throw reported;
  }
}
