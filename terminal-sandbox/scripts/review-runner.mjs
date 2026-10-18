import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REVIEW_IMAGE,
  REVIEW_URL,
  reviewPaths,
  readState,
  readPrivate,
  matchingToken,
  controlEndpoint,
} from "./review-common.mjs";

const paths = reviewPaths(fileURLToPath(new URL("../", import.meta.url)));

export function createReviewControl(state, counts, onStop) {
  const sockets = new Set();
  let stopRequested = false;
  const control = net.createServer((socket) => {
    sockets.add(socket);
    let input = "",
      bytes = 0,
      handled = false;
    const deadline = setTimeout(() => socket.destroy(), 2000);
    deadline.unref();
    socket.on("close", () => {
      clearTimeout(deadline);
      sockets.delete(socket);
    });
    socket.on("error", () => {});
    socket.on("data", (chunk) => {
      if (handled) return socket.destroy();
      bytes += chunk.length;
      if (bytes > 1024) return socket.destroy();
      input += chunk.toString("utf8");
      if (!input.includes("\n")) return;
      handled = true;
      let message;
      try {
        message = JSON.parse(input.slice(0, input.indexOf("\n")));
      } catch {
        return socket.destroy();
      }
      if (
        !message ||
        typeof message !== "object" ||
        Array.isArray(message) ||
        Object.keys(message).sort().join(",") !==
          "action,controlToken,instanceId" ||
        message.instanceId !== state.instanceId ||
        !matchingToken(message.controlToken, state.controlToken) ||
        !["status", "stop"].includes(message.action)
      )
        return socket.destroy();
      const stop = message.action === "stop";
      if (stop) stopRequested = true;
      if (stop)
        socket.once("close", () => {
          void Promise.resolve(onStop()).catch(() => {
            process.exitCode = 1;
          });
        });
      socket.end(
        JSON.stringify({
          ok: true,
          instanceId: state.instanceId,
          pid: process.pid,
          status: stopRequested ? "stopping" : "running",
          ...counts(),
        }) + "\n",
      );
    });
  });
  control.maxConnections = 12;
  return { control, sockets };
}

export async function bootstrapFromPipe(stream = process.stdin) {
  return new Promise((resolve, reject) => {
    let input = "";
    const timer = setTimeout(() => {
      stream.destroy();
      reject(new Error("Bootstrap unavailable."));
    }, 5000);
    stream.on("error", () => {
      clearTimeout(timer);
      reject(new Error("Bootstrap unavailable."));
    });
    stream.on("data", (chunk) => {
      input += chunk.toString("utf8");
      if (input.length > 1024) {
        clearTimeout(timer);
        stream.destroy();
        reject(new Error("Invalid bootstrap."));
      }
    });
    stream.on("end", () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(input));
      } catch {
        reject(new Error("Invalid bootstrap."));
      }
    });
  });
}

export async function runReview(bootstrap) {
  const state = await readState(paths);
  if (
    !state ||
    state.pid !== process.pid ||
    !bootstrap ||
    Object.keys(bootstrap).sort().join(",") !== "controlToken,instanceId" ||
    bootstrap.instanceId !== state.instanceId ||
    !matchingToken(bootstrap.controlToken, state.controlToken)
  )
    throw new Error("Review bootstrap was not authenticated.");
  const text = await readPrivate(paths.key),
    key = /^TEACHER_ACCESS_KEY=([a-f0-9]{64})\r?\n?$/.exec(text)?.[1];
  if (!key) throw new Error("Private teacher credential is unavailable.");
  const { configuration, createSandboxOrchestrator } =
    await import("../server.js");
  const service = createSandboxOrchestrator({
    ...configuration({}),
    enabled: true,
    host: "127.0.0.1",
    port: 8080,
    teacherKey: key,
    sandboxImage: REVIEW_IMAGE,
    allowedOrigins: new Set([REVIEW_URL]),
    trustedProxyAddresses: new Set(),
    allowInsecureLocalhost: true,
    maxSessions: 4,
    maxConnections: 12,
    maxClassrooms: 2,
    maxStudentsPerClass: 4,
    reviewInstanceId: state.instanceId,
  });
  let shuttingDown = false;
  const cleanupState = async () => {
    const current = await readState(paths).catch(() => null);
    if (current?.instanceId === state.instanceId)
      await fs.unlink(paths.active).catch(() => {});
  };
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => control.close(() => resolve()));
    await service.close();
    await cleanupState();
  };
  const { control, sockets } = createReviewControl(
    state,
    () => ({
      sessions: service.sessions.size,
      classrooms: service.classrooms.size,
    }),
    shutdown,
  );
  try {
    await new Promise((resolve, reject) => {
      service.server.once("error", reject);
      service.server.listen(8080, "127.0.0.1", resolve);
    });
    await new Promise((resolve, reject) => {
      control.once("error", reject);
      control.listen(controlEndpoint(paths, state.instanceId), resolve);
    });
    if (process.platform !== "win32")
      await fs.chmod(controlEndpoint(paths, state.instanceId), 0o600);
    console.log("Local PR #22 test controller ready on loopback only.");
    for (const signal of ["SIGTERM", "SIGINT"])
      process.once(signal, () => {
        void shutdown().catch(() => {
          process.exitCode = 1;
        });
      });
    return { service, control, shutdown };
  } catch (error) {
    await shutdown().catch(() => {});
    throw error;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await runReview(await bootstrapFromPipe());
  } catch {
    console.error(
      "The local PR #22 controller could not start. Check prerequisites and the fixed loopback port.",
    );
    process.exitCode = 1;
  }
}
