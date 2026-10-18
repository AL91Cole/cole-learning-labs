/** Optional server terminal. No Linux emulation, identity storage or device capture. */
const LABS = new Set(["NET-201", "SEC-402", "INC-104"]);
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const text = (value, max = 200) =>
  typeof value === "string" ? value.slice(0, max) : "";
const classCode = (value) =>
  typeof value === "string" && /^[A-Za-z0-9-]{4,48}$/.test(value) ? value : "";
const jpeg = (value) =>
  typeof value === "string" &&
  value.length <= 150000 &&
  /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
    ? value
    : null;

/** Intentionally small Markdown subset: authored text is always escaped first. */
export function renderMarkdown(markdownText) {
  const html = [],
    lines = String(markdownText || "")
      .slice(0, 60000)
      .split(/\r?\n/);
  let code = null;
  const inline = (value) =>
    escapeHtml(value)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  const block = () => {
    const command = code.join("\n");
    html.push(
      `<div class="code-block-wrapper"><pre><code>${escapeHtml(command)}</code></pre>${command.length <= 2000 ? `<button type="button" class="btn" data-run-command="${escapeHtml(command)}" disabled>Run in terminal</button>` : ""}</div>`,
    );
  };
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (code) {
        block();
        code = null;
      } else code = [];
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) continue;
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    html.push(
      heading
        ? `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`
        : line.startsWith("> ")
          ? `<blockquote>${inline(line.slice(2))}</blockquote>`
          : `<p>${inline(line)}</p>`,
    );
  }
  if (code) block();
  return html.join("\n");
}

/** Same-origin endpoint, without credentials, class codes or session IDs in URLs. */
export function resolveWebSocketUrl(location = globalThis.location) {
  if (!location)
    throw new Error("Open the terminal through its configured HTTPS service.");
  const secure = location.protocol === "https:",
    local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (!secure && !(location.protocol === "http:" && local))
    throw new Error("HTTPS is required outside local development.");
  return `${secure ? "wss:" : "ws:"}//${location.host}/ws`;
}

/** Render text already in this lab's xterm viewport; never another app or tab. */
export function captureCompressedTerminalSnapshot({
  canvas,
  terminal,
  alias,
  labId,
}) {
  const buffer = terminal?.buffer?.active,
    ctx = canvas?.getContext?.("2d");
  if (!buffer?.getLine || !ctx) return null;
  canvas.width = 640;
  canvas.height = 360;
  ctx.fillStyle = "#09131f";
  ctx.fillRect(0, 0, 640, 360);
  ctx.fillStyle = "#65e1ca";
  ctx.font = "bold 12px monospace";
  ctx.fillText(
    `${text(alias, 40)} · ${text(labId, 12)} · LAB TERMINAL ONLY`,
    10,
    20,
  );
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "12px monospace";
  const start = Math.max(0, Number(buffer.viewportY) || 0),
    count = Math.min(18, Number(terminal.rows) || 18);
  for (let i = 0; i < count; i++)
    ctx.fillText(
      String(buffer.getLine(start + i)?.translateToString(true) || "").slice(
        0,
        78,
      ),
      10,
      48 + i * 16,
    );
  return jpeg(canvas.toDataURL("image/jpeg", 0.1));
}

export function createTerminalSandboxClient({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  WebSocket: Socket = win?.WebSocket,
  Terminal: TerminalClass = win?.Terminal,
  FitAddon: FitClass = win?.FitAddon?.FitAddon,
  now = () => Date.now(),
} = {}) {
  if (!doc || !win || !doc.getElementById("terminal-container")) return null;
  const ids = [
    "lab-selector",
    "lab-track-badge",
    "milestone-progress",
    "milestone-count-text",
    "milestone-list",
    "verify-milestones-btn",
    "markdown-instructions",
    "ws-status-dot",
    "ws-status-text",
    "container-badge",
    "learner-alias-badge",
    "inactivity-timer-badge",
    "pause-banner",
    "instructor-pause-banner",
    "terminal-container",
    "terminal-keyboard-controls",
    "snapshot-canvas",
    "snapshot-controls",
    "snapshot-opt-in",
    "snapshot-sharing-status",
    "mode-self-paced",
    "mode-instructor",
    "classroom-join-form",
    "classroom-code-input",
    "connect-btn",
    "disconnect-btn",
    "teacher-signin-form",
    "teacher-key-input",
    "teacher-dashboard",
    "teacher-student-grid",
    "teacher-meta-status",
    "teacher-create-class",
    "teacher-class-code",
    "teacher-pause-all",
    "teacher-resume-all",
    "teacher-override-form",
    "teacher-override-input",
  ];
  const el = Object.fromEntries(ids.map((id) => [id, doc.getElementById(id)])),
    disposers = [],
    students = new Map();
  const state = {
    ws: null,
    socketCleanup: null,
    role: null,
    requestedRole: null,
    sessionReady: false,
    runtimeVerified: false,
    mode: "self-paced",
    selectionMode: "self-paced",
    classroomCode: "",
    joined: false,
    paused: false,
    alias: "",
    labId: "NET-201",
    consent: false,
    consentRequested: false,
    snapshotTimer: null,
    lastSnapshotAt: -Infinity,
    authTimer: null,
    disposed: false,
  };
  let terminal = null,
    fit = null,
    resizeObserver = null,
    resizeFrame = 0;
  function listen(target, name, fn) {
    target?.addEventListener(name, fn);
    disposers.push(() => target?.removeEventListener(name, fn));
  }
  function status(kind, message) {
    el["ws-status-dot"].className = `status-dot ${kind}`;
    el["ws-status-text"].textContent = message;
  }
  function open() {
    return !!state.ws && state.ws.readyState === Socket.OPEN;
  }
  function send(payload) {
    if (state.disposed || !open()) return false;
    state.ws.send(JSON.stringify(payload));
    return true;
  }
  function eligible() {
    return (
      state.role === "student" &&
      state.sessionReady &&
      state.runtimeVerified &&
      state.mode === "instructor-led" &&
      state.joined &&
      !!state.classroomCode
    );
  }
  function input(data) {
    if (
      state.role !== "student" ||
      !state.sessionReady ||
      state.paused ||
      !state.runtimeVerified
    )
      return false;
    return (
      typeof data === "string" &&
      data.length <= 4096 &&
      send({ type: "terminal:input", data })
    );
  }
  function syncControls() {
    const busy = !!state.ws && state.ws.readyState < Socket.CLOSING,
      teacher = state.role === "teacher",
      ready = state.role === "student" && state.sessionReady;
    el["connect-btn"].disabled = !terminal || busy;
    el["connect-btn"].hidden = state.selectionMode === "instructor-led";
    el["disconnect-btn"].disabled = !busy;
    el["teacher-signin-form"].querySelector("button").disabled =
      !terminal || busy;
    el["classroom-join-form"].querySelector("button").disabled =
      !terminal || busy;
    el["mode-self-paced"].disabled = busy;
    el["mode-instructor"].disabled = busy;
    el["lab-selector"].disabled = teacher || (busy && !ready);
    el["verify-milestones-btn"].disabled = !ready || state.paused;
    el["markdown-instructions"]
      .querySelectorAll("[data-run-command]")
      .forEach((button) => {
        button.disabled = !ready || state.paused;
      });
    el["teacher-dashboard"].hidden = !teacher;
    el["terminal-container"].hidden = teacher;
    el["terminal-keyboard-controls"].hidden = teacher;
    el["terminal-keyboard-controls"]
      .querySelectorAll("button")
      .forEach((button) => {
        button.disabled = !ready || state.paused;
      });
    el["snapshot-controls"].hidden = !eligible();
    el["snapshot-opt-in"].disabled = !eligible();
    el["instructor-pause-banner"].hidden = !state.paused;
    for (const id of ["teacher-pause-all", "teacher-resume-all"])
      el[id].disabled = !teacher || !state.classroomCode;
    el["teacher-override-form"].querySelector("button").disabled =
      !teacher || !state.classroomCode;
    if (terminal?.options)
      terminal.options.disableStdin = !ready || state.paused;
  }
  function stopSnapshotTimer() {
    if (state.snapshotTimer !== null) win.clearInterval(state.snapshotTimer);
    state.snapshotTimer = null;
  }
  function revokeConsent(notify = true) {
    stopSnapshotTimer();
    state.consent = false;
    state.consentRequested = false;
    state.lastSnapshotAt = -Infinity;
    el["snapshot-opt-in"].checked = false;
    el["snapshot-sharing-status"].textContent =
      "Off. No terminal snapshots are being shared.";
    if (notify && open() && state.role === "student")
      send({ type: "screen:consent", enabled: false });
  }
  function snapshot() {
    if (
      !eligible() ||
      !state.consent ||
      !state.consentRequested ||
      !el["snapshot-opt-in"].checked ||
      doc.hidden ||
      !open() ||
      state.ws.bufferedAmount > 65536 ||
      now() - state.lastSnapshotAt < 5000
    )
      return;
    const dataUrl = captureCompressedTerminalSnapshot({
      canvas: el["snapshot-canvas"],
      terminal,
      alias: state.alias,
      labId: state.labId,
    });
    if (dataUrl && send({ type: "screen:snapshot", dataUrl })) {
      state.lastSnapshotAt = now();
    }
  }
  function startSnapshotTimer() {
    stopSnapshotTimer();
    snapshot();
    state.snapshotTimer = win.setInterval(() => snapshot(), 5000);
  }
  function clearSession() {
    revokeConsent(false);
    state.role = null;
    state.requestedRole = null;
    state.sessionReady = false;
    state.runtimeVerified = false;
    state.joined = false;
    state.classroomCode = "";
    state.paused = false;
    state.alias = "";
    students.clear();
    el["teacher-student-grid"].replaceChildren();
    el["teacher-class-code"].value = "";
    el["container-badge"].textContent = "No Linux session";
    el["learner-alias-badge"].textContent = "Alias assigned on connection";
    el["inactivity-timer-badge"].textContent = "";
    el["milestone-list"].replaceChildren();
    el["milestone-count-text"].textContent = "No session started";
    el["milestone-progress"].value = 0;
    terminal?.reset?.();
    syncControls();
  }
  function disconnect() {
    revokeConsent();
    const ws = state.ws;
    state.ws = null;
    state.socketCleanup?.();
    state.socketCleanup = null;
    if (state.authTimer !== null) win.clearTimeout(state.authTimer);
    state.authTimer = null;
    ws?.close();
    clearSession();
    status("disconnected", "Not connected · no Linux session");
  }
  function fitTerminal() {
    if (
      state.disposed ||
      doc.hidden ||
      el["terminal-container"].hidden ||
      !terminal
    )
      return;
    try {
      fit?.fit();
    } catch {
      return;
    }
    if (state.role === "student" && state.sessionReady)
      send({
        type: "terminal:resize",
        cols: terminal.cols,
        rows: terminal.rows,
      });
  }
  function queueFit() {
    if (!resizeFrame)
      resizeFrame = win.requestAnimationFrame(() => {
        resizeFrame = 0;
        fitTerminal();
      });
  }
  function milestones(value) {
    const rows = Array.isArray(value) ? value.slice(0, 32) : [],
      count = rows.filter((row) => row?.completed === true).length;
    el["milestone-progress"].max = rows.length || 1;
    el["milestone-progress"].value = count;
    el["milestone-count-text"].textContent =
      `${count} / ${rows.length} server-verified`;
    el["milestone-list"].innerHTML = rows
      .map(
        (row, index) =>
          `<li class="milestone-item"><strong>${index + 1}. ${escapeHtml(text(row?.title, 200))} · ${row?.completed === true ? "Verified" : "Pending"}</strong><p>${escapeHtml(text(row?.description, 600))}</p>${typeof row?.hint === "string" ? `<details class="milestone-hint"><summary>Hint</summary><p>${escapeHtml(text(row.hint, 600))}</p></details>` : ""}</li>`,
      )
      .join("");
  }
  function lab(value) {
    if (!value || typeof value !== "object") return;
    el["lab-track-badge"].textContent =
      `${text(value.track, 30)} · ${text(value.grade, 30)}`;
    el["markdown-instructions"].innerHTML = renderMarkdown(value.markdown);
  }
  function renderStudents() {
    el["teacher-student-grid"].replaceChildren();
    if (!students.size) {
      const p = doc.createElement("p");
      p.textContent = "No students have joined this class.";
      el["teacher-student-grid"].appendChild(p);
      return;
    }
    for (const student of students.values()) {
      const card = doc.createElement("article");
      card.className = "student-snapshot-card";
      const title = doc.createElement("h3");
      title.textContent = text(student.alias, 64) || "Learner";
      card.appendChild(title);
      const info = doc.createElement("p"),
        checks = Array.isArray(student.milestones) ? student.milestones : [];
      info.textContent = `${text(student.labId, 20)} · ${checks.filter((item) => item?.completed === true).length}/${checks.length} checks`;
      card.appendChild(info);
      const image =
        student.snapshotConsented === true
          ? jpeg(student.snapshotDataUrl)
          : null;
      if (image) {
        const img = doc.createElement("img");
        img.src = image;
        img.alt = `Shared text snapshot of ${text(student.alias, 64) || "learner"}’s lab terminal`;
        card.appendChild(img);
      } else {
        const p = doc.createElement("p");
        p.className = "snapshot-placeholder";
        p.textContent = "No shared terminal snapshot.";
        card.appendChild(p);
      }
      el["teacher-student-grid"].appendChild(card);
    }
  }
  function rememberStudent(student) {
    if (
      !student ||
      typeof student.sessionId !== "string" ||
      student.sessionId.length > 128 ||
      (students.size >= 100 && !students.has(student.sessionId))
    )
      return;
    students.set(student.sessionId, student);
  }
  function control(action, extra = {}) {
    if (state.role !== "teacher" || !state.classroomCode) return false;
    return send({
      type: "classroom:control",
      classroomCode: state.classroomCode,
      action,
      ...extra,
    });
  }
  function receive(message) {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "ping") {
      send({ type: "pong" });
      return;
    }
    if (message.type === "auth:ok") {
      if (
        !["student", "teacher"].includes(message.role) ||
        message.role !== state.requestedRole
      ) {
        disconnect();
        return;
      }
      if (state.authTimer !== null) win.clearTimeout(state.authTimer);
      state.authTimer = null;
      state.role = message.role;
      state.alias = text(message.alias, 64);
      el["learner-alias-badge"].textContent = state.alias || "Teacher";
      if (state.role === "student")
        send({
          type: "session:start",
          labId: state.labId,
          mode: state.selectionMode,
          ...(state.selectionMode === "instructor-led"
            ? { classroomCode: state.classroomCode }
            : {}),
        });
      else {
        status("connected", "Teacher authenticated");
        el["teacher-meta-status"].textContent =
          "Create a class to receive its student join code.";
      }
      syncControls();
      return;
    }
    if (message.type === "error" || message.type === "auth:error") {
      const denial =
        text(message.message) || "The server rejected this request.";
      if (message.type === "auth:error" || !state.role) disconnect();
      status("disconnected", denial);
      return;
    }
    if (!state.role) return;
    switch (message.type) {
      case "session:ready":
      case "lab:switched": {
        if (state.role !== "student") return;
        if (message.runtimeMode !== "docker-pty") {
          disconnect();
          status(
            "disconnected",
            "No real Linux runtime was confirmed. Ask the instructor to configure the service.",
          );
          return;
        }
        state.runtimeVerified = true;
        state.sessionReady = true;
        state.labId = LABS.has(message.labId) ? message.labId : state.labId;
        state.alias = text(message.alias, 64) || state.alias;
        state.mode =
          message.mode === "instructor-led"
            ? "instructor-led"
            : state.selectionMode;
        if (typeof message.paused === "boolean") state.paused = message.paused;
        el["learner-alias-badge"].textContent = state.alias;
        el["container-badge"].textContent =
          "Server Linux container · isolated practice";
        const idle = message.limits?.inactivityTimeoutSeconds;
        el["inactivity-timer-badge"].textContent = Number.isFinite(idle)
          ? `Idle cleanup: ${Math.round(idle / 60)} min`
          : "";
        lab(message.lab);
        milestones(message.milestones);
        status("connected", "Connected to server Linux sandbox");
        syncControls();
        queueFit();
        break;
      }
      case "terminal:output":
        if (
          state.role === "student" &&
          state.runtimeVerified &&
          typeof message.data === "string"
        ) {
          terminal?.write(message.data.slice(0, 65536));
        }
        break;
      case "milestone:status":
        if (state.role === "student") milestones(message.milestones);
        break;
      case "classroom:joined":
        if (state.role === "student") {
          revokeConsent(false);
          state.classroomCode = classCode(message.classroomCode);
          state.joined =
            !!state.classroomCode && message.mode === "instructor-led";
          state.mode = state.joined ? "instructor-led" : "self-paced";
          syncControls();
        }
        break;
      case "screen:consent-state": {
        if (state.role !== "student") return;
        state.consent =
          message.enabled === true &&
          state.consentRequested &&
          el["snapshot-opt-in"].checked &&
          eligible();
        if (state.consent) {
          el["snapshot-sharing-status"].textContent =
            "On. Sharing this lab terminal’s text with the authenticated class teacher, at most every five seconds.";
          startSnapshotTimer();
        } else {
          stopSnapshotTimer();
          el["snapshot-opt-in"].checked = false;
          state.consentRequested = false;
          el["snapshot-sharing-status"].textContent =
            "Off. No terminal snapshots are being shared.";
          if (message.enabled === true)
            send({ type: "screen:consent", enabled: false });
        }
        break;
      }
      case "teacher:request-snapshot":
        snapshot();
        break;
      case "teacher:pause-state":
        if (state.role === "student") {
          state.paused = message.paused === true;
          syncControls();
        }
        break;
      case "teacher:override-executed":
        if (state.role === "student" && state.runtimeVerified) {
          terminal?.write("\r\n[Teacher sent a practice command]\r\n");
        }
        break;
      case "classroom:created":
        if (state.role === "teacher") {
          const code = classCode(message.classroomCode);
          if (code) {
            state.classroomCode = code;
            el["teacher-class-code"].value = code;
            el["teacher-meta-status"].textContent =
              "Share this student join code through your approved classroom channel.";
            send({ type: "classroom:subscribe", classroomCode: code });
            syncControls();
          }
        }
        break;
      case "classroom:status":
        if (
          state.role === "teacher" &&
          message.classroomCode === state.classroomCode
        ) {
          students.clear();
          (Array.isArray(message.students) ? message.students : [])
            .slice(0, 100)
            .forEach(rememberStudent);
          renderStudents();
        }
        break;
      case "classroom:snapshot":
        if (
          state.role === "teacher" &&
          message.classroomCode === state.classroomCode
        ) {
          rememberStudent(message.student);
          renderStudents();
        }
        break;
      case "classroom:student-left":
        if (
          state.role === "teacher" &&
          message.classroomCode === state.classroomCode
        ) {
          students.delete(message.sessionId);
          renderStudents();
        }
        break;
      case "session:terminated":
        if (message.reason === "lab_changed" && state.role === "student") {
          revokeConsent(false);
          state.sessionReady = false;
          state.runtimeVerified = false;
          terminal?.reset?.();
          status("connecting", "Starting a clean practice container…");
          syncControls();
        } else {
          disconnect();
          status(
            "disconnected",
            `Session ended: ${text(message.reason, 100) || "server cleanup"}`,
          );
        }
        break;
    }
  }
  function connect(role, teacherKey = "") {
    if (
      state.disposed ||
      !terminal ||
      (state.ws && state.ws.readyState < Socket.CLOSING)
    )
      return false;
    if (
      role === "student" &&
      state.selectionMode === "instructor-led" &&
      !classCode(el["classroom-code-input"].value.trim())
    ) {
      status(
        "disconnected",
        "Enter the student class code supplied by your teacher.",
      );
      return false;
    }
    let endpoint;
    try {
      endpoint = resolveWebSocketUrl(win.location);
    } catch (error) {
      status("disconnected", error.message);
      return false;
    }
    state.requestedRole = role;
    state.classroomCode =
      role === "student" && state.selectionMode === "instructor-led"
        ? classCode(el["classroom-code-input"].value.trim())
        : "";
    state.labId = LABS.has(el["lab-selector"].value)
      ? el["lab-selector"].value
      : "NET-201";
    const pending = { teacherKey };
    let ws;
    try {
      ws = new Socket(endpoint);
    } catch {
      status(
        "disconnected",
        "Connection unavailable. No Linux session is running here.",
      );
      return false;
    }
    state.ws = ws;
    status("connecting", "Connecting to the configured server…");
    syncControls();
    const active = () => !state.disposed && state.ws === ws,
      owned = [];
    let failureMessage = "";
    const on = (name, handler) => {
      ws.addEventListener(name, handler);
      owned.push(() => ws.removeEventListener(name, handler));
    };
    state.socketCleanup = () => {
      pending.teacherKey = "";
      for (const remove of owned) remove();
    };
    on("open", () => {
      if (!active()) return;
      const auth = { type: "auth", role };
      if (role === "teacher") auth.teacherKey = pending.teacherKey;
      pending.teacherKey = "";
      send(auth);
      status("connecting", "Authenticating with the server…");
    });
    on("message", (event) => {
      if (
        !active() ||
        typeof event.data !== "string" ||
        event.data.length > 300000
      )
        return;
      try {
        receive(JSON.parse(event.data));
      } catch {
        status("disconnected", "The server sent an unreadable response.");
      }
    });
    on("error", () => {
      pending.teacherKey = "";
      failureMessage =
        "Connection unavailable. No Linux session is running here.";
      if (active()) status("disconnected", failureMessage);
    });
    on("close", () => {
      pending.teacherKey = "";
      if (!active()) return;
      state.ws = null;
      state.socketCleanup?.();
      state.socketCleanup = null;
      if (state.authTimer !== null) win.clearTimeout(state.authTimer);
      state.authTimer = null;
      clearSession();
      status(
        "disconnected",
        failureMessage || "Disconnected · no Linux session",
      );
    });
    state.authTimer = win.setTimeout(() => {
      if (active() && !state.role) {
        disconnect();
        status(
          "disconnected",
          "Server authentication timed out. No Linux session was started.",
        );
      }
    }, 11000);
    return true;
  }
  function chooseMode(mode) {
    if (state.ws && state.ws.readyState < Socket.CLOSING) return;
    state.selectionMode = mode;
    el["classroom-join-form"].hidden = mode !== "instructor-led";
    el["mode-self-paced"].setAttribute(
      "aria-pressed",
      String(mode === "self-paced"),
    );
    el["mode-instructor"].setAttribute(
      "aria-pressed",
      String(mode === "instructor-led"),
    );
    el["mode-self-paced"].classList.toggle("active", mode === "self-paced");
    el["mode-instructor"].classList.toggle("active", mode === "instructor-led");
    syncControls();
  }
  try {
    if (typeof TerminalClass !== "function")
      throw new Error("missing terminal");
    terminal = new TerminalClass({
      cursorBlink: false,
      fontSize: 15,
      fontFamily: 'Consolas,"Cascadia Code",monospace',
      scrollback: 500,
      screenReaderMode: true,
      minimumContrastRatio: 4.5,
      disableStdin: true,
      allowProposedApi: false,
      linkHandler: { activate() {} },
      theme: {
        background: "#09131f",
        foreground: "#e2e8f0",
        cursor: "#65e1ca",
      },
    });
    if (typeof FitClass === "function") {
      fit = new FitClass();
      terminal.loadAddon(fit);
    }
    terminal.open(el["terminal-container"]);
    disposers.push(terminal.onData(input));
    disposers.push(
      terminal.onResize((size) => {
        if (state.role === "student" && state.sessionReady)
          send({ type: "terminal:resize", cols: size.cols, rows: size.rows });
      }),
    );
    if (typeof win.ResizeObserver === "function") {
      resizeObserver = new win.ResizeObserver(queueFit);
      resizeObserver.observe(el["terminal-container"]);
    } else listen(win, "resize", queueFit);
    queueFit();
  } catch {
    terminal?.dispose?.();
    terminal = null;
    const notice = doc.createElement("p");
    notice.className = "terminal-unavailable";
    notice.textContent =
      "The terminal component could not load. Ask the lab administrator to restore the local terminal assets. No Linux session is running here.";
    el["terminal-container"].replaceChildren(notice);
  }
  listen(el["connect-btn"], "click", () => connect("student"));
  listen(el["disconnect-btn"], "click", disconnect);
  listen(el["mode-self-paced"], "click", () => chooseMode("self-paced"));
  listen(el["mode-instructor"], "click", () => chooseMode("instructor-led"));
  listen(el["classroom-join-form"], "submit", (event) => {
    event.preventDefault();
    connect("student");
  });
  listen(el["teacher-signin-form"], "submit", (event) => {
    event.preventDefault();
    const key = el["teacher-key-input"].value;
    el["teacher-key-input"].value = "";
    if (!key) {
      status(
        "disconnected",
        "Enter the administrator-provisioned teacher access key.",
      );
      return;
    }
    connect("teacher", key);
  });
  listen(el["lab-selector"], "change", () => {
    if (
      state.role !== "student" ||
      !state.sessionReady ||
      !LABS.has(el["lab-selector"].value)
    )
      return;
    revokeConsent();
    state.sessionReady = false;
    state.runtimeVerified = false;
    terminal?.reset?.();
    send({ type: "lab:switch", labId: el["lab-selector"].value });
    status("connecting", "Starting a clean practice container…");
    syncControls();
  });
  listen(el["verify-milestones-btn"], "click", () => {
    if (state.role === "student" && state.sessionReady && !state.paused)
      send({ type: "milestone:verify" });
  });
  listen(el["markdown-instructions"], "click", (event) => {
    const button = event.target.closest?.("[data-run-command]");
    if (
      button &&
      !button.disabled &&
      el["markdown-instructions"].contains(button)
    ) {
      const command = button.getAttribute("data-run-command");
      if (
        typeof command === "string" &&
        command.length <= 2000 &&
        input(command.replace(/\r?\n/g, "\r") + "\r")
      )
        terminal?.focus();
    }
  });
  listen(el["terminal-keyboard-controls"], "click", (event) => {
    const button = event.target.closest?.("[data-terminal-key]");
    if (!button || button.disabled) return;
    const key = button.dataset.terminalKey;
    if (key === "focus") {
      terminal?.focus();
      return;
    }
    const data = {
      escape: "\x1b",
      tab: "\t",
      interrupt: "\x03",
      up: "\x1b[A",
      down: "\x1b[B",
    }[key];
    if (data && input(data)) terminal?.focus();
  });
  listen(el["snapshot-opt-in"], "change", () => {
    if (!eligible() || !el["snapshot-opt-in"].checked) {
      revokeConsent();
      return;
    }
    state.consentRequested = true;
    state.consent = false;
    el["snapshot-sharing-status"].textContent =
      "Requesting permission to share this lab terminal only…";
    send({ type: "screen:consent", enabled: true });
  });
  listen(el["teacher-create-class"], "click", () => {
    if (state.role === "teacher") send({ type: "classroom:create" });
  });
  listen(el["teacher-pause-all"], "click", () => control("pause"));
  listen(el["teacher-resume-all"], "click", () => control("resume"));
  listen(el["teacher-override-form"], "submit", (event) => {
    event.preventDefault();
    const command = el["teacher-override-input"].value.trim();
    if (
      command &&
      command.length <= 200 &&
      control("override-command", { command })
    )
      el["teacher-override-input"].value = "";
  });
  listen(doc, "visibilitychange", () => {
    if (doc.hidden) revokeConsent();
    else queueFit();
  });
  syncControls();
  status(
    "disconnected",
    terminal
      ? "Not connected · choose Start server lab when ready"
      : "Terminal unavailable · no Linux session",
  );
  function dispose() {
    if (state.disposed) return;
    disconnect();
    state.disposed = true;
    for (const item of disposers)
      typeof item === "function" ? item() : item?.dispose?.();
    resizeObserver?.disconnect();
    if (resizeFrame) win.cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
    terminal?.dispose();
    terminal = null;
  }
  listen(win, "pagehide", dispose);
  return { dispose };
}

if (typeof window !== "undefined" && typeof document !== "undefined")
  createTerminalSandboxClient();
