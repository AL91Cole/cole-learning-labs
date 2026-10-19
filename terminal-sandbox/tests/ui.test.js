import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createTerminalSandboxClient,
  renderMarkdown,
  resolveWebSocketUrl,
} from "../public/app.js";

const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const html = readFileSync(
  new URL("../public/index.html", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../public/styles.css", import.meta.url),
  "utf8",
);
const fakeJpeg = "data:image/jpeg;base64,/9j/AA==";
const decode = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener(name, fn) {
      listeners.get(name)?.delete(fn);
      if (!listeners.get(name)?.size) listeners.delete(name);
    },
    emit(name, event = {}) {
      for (const fn of [...(listeners.get(name) || [])]) fn(event);
    },
  };
}
function fixture({
  terminalAvailable = true,
  protocol = "https:",
  hostname = "terminal.school.test",
  compact = false,
} = {}) {
  const fields = new Map(),
    intervals = new Map(),
    timeouts = new Map(),
    frames = new Map(),
    sockets = [],
    terminals = [],
    images = [],
    uploads = [],
    observers = [];
  let timer = 0,
    time = 0;
  function node(tagName = "DIV") {
    const target = {
      ...eventTarget(),
      tagName,
      dataset: {},
      attrs: {},
      value: "",
      textContent: "",
      hidden: false,
      disabled: false,
      checked: false,
      children: [],
      className: "",
      style: { values: {}, setProperty(name, value) { this.values[name] = value; } },
      pointers: new Set(),
      getBoundingClientRect() { return { left: 100, width: 1000 }; },
      setPointerCapture(id) { this.pointers.add(id); },
      hasPointerCapture(id) { return this.pointers.has(id); },
      releasePointerCapture(id) { this.pointers.delete(id); },
      classList: { toggle() {}, add() {}, remove() {} },
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
      getAttribute(name) {
        return this.attrs[name] ?? null;
      },
      appendChild(child) {
        this.children.push(child);
        child.parent = this;
        return child;
      },
      replaceChildren(...children) {
        this.children = children;
      },
      contains(child) {
        return (
          this.children.includes(child) ||
          this.children.some((item) => item.contains?.(child))
        );
      },
      focus() {
        doc.activeElement = this;
      },
      scrollIntoView(options) { this.scrolledIntoView = options; },
      closest(selector) {
        if (selector === "button")
          return this.tagName === "BUTTON" ? this : null;
        if (selector === "[data-run-command]")
          return Object.hasOwn(this.dataset, "runCommand") ? this : null;
        if (selector === "[data-terminal-key]")
          return this.dataset.terminalKey ? this : null;
        return null;
      },
      querySelector(selector) {
        if (selector === "button")
          return this.submitButton || (this.submitButton = node("BUTTON"));
        return null;
      },
      querySelectorAll(selector) {
        return selector === "button" || selector === "[data-run-command]"
          ? this.children.filter((child) => child.tagName === "BUTTON")
          : [];
      },
    };
    Object.defineProperty(target, "innerHTML", {
      get() {
        return this.markup || "";
      },
      set(value) {
        this.markup = value;
        this.children = [
          ...value.matchAll(/<button[^>]*data-run-command="([^"]*)"[^>]*>/g),
        ].map(([, command]) => {
          const button = node("BUTTON");
          button.dataset.runCommand = decode(command);
          button.attrs["data-run-command"] = decode(command);
          return button;
        });
      },
    });
    return target;
  }
  const doc = {
    ...eventTarget(),
    hidden: false,
    activeElement: null,
    getElementById: (id) => fields.get(id) || null,
    createElement(tag) {
      const element = node(tag.toUpperCase());
      if (tag === "img") images.push(element);
      return element;
    },
  };
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) fields.set(id, node());
  fields.get("lab-selector").value = "NET-201";
  fields.get("teacher-dashboard").hidden = true;
  fields.get("snapshot-controls").hidden = true;
  fields.get("classroom-join-form").hidden = true;
  const canvas = fields.get("snapshot-canvas");
  canvas.getContext = () => ({
    fillRect() {},
    fillText(value) {
      uploads.push({ text: value });
    },
  });
  canvas.toDataURL = (type, quality) => {
    uploads.push({ type, quality });
    return fakeJpeg;
  };
  for (const key of ["focus", "escape", "tab", "interrupt", "up", "down"]) {
    const button = node("BUTTON");
    button.dataset.terminalKey = key;
    fields.get("terminal-keyboard-controls").appendChild(button);
  }
  class FakeSocket {
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor(url) {
      Object.assign(this, eventTarget());
      this.url = url;
      this.readyState = 0;
      this.bufferedAmount = 0;
      this.messages = [];
      sockets.push(this);
    }
    send(value) {
      this.messages.push(JSON.parse(value));
    }
    close() {
      this.readyState = 3;
      this.emit("close");
    }
    open() {
      this.readyState = 1;
      this.emit("open");
    }
    message(message) {
      this.emit("message", { data: JSON.stringify(message) });
    }
  }
  class FakeTerminal {
    constructor(options) {
      this.options = options;
      this.cols = 80;
      this.rows = 24;
      this.lines = ["fictional terminal output"];
      this.writes = [];
      this.disposed = 0;
      this.buffer = {
        active: {
          viewportY: 0,
          getLine: (index) => ({
            translateToString: () => this.lines[index] || "",
          }),
        },
      };
      terminals.push(this);
    }
    loadAddon(addon) {
      this.addon = addon;
    }
    open() {}
    onData(fn) {
      this.data = fn;
      return {
        dispose: () => {
          this.data = null;
        },
      };
    }
    onResize(fn) {
      this.resize = fn;
      return {
        dispose: () => {
          this.resize = null;
        },
      };
    }
    write(value) {
      this.writes.push(value);
      this.lines.push(value);
    }
    reset() {
      this.lines = [];
      this.writes = [];
    }
    focus() {
      this.focused = true;
    }
    dispose() {
      this.disposed++;
    }
  }
  class FakeFit {
    fit() {
      this.fits = (this.fits || 0) + 1;
    }
  }
  const media = { ...eventTarget(), matches: compact };
  const win = {
    ...eventTarget(),
    location: { protocol, hostname, host: hostname },
    matchMedia: () => media,
    setInterval(fn, ms) {
      const id = ++timer;
      intervals.set(id, { fn, ms });
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
    setTimeout(fn, ms) {
      const id = ++timer;
      timeouts.set(id, { fn, at: time + ms });
      return id;
    },
    clearTimeout: (id) => timeouts.delete(id),
    requestAnimationFrame(fn) {
      const id = ++timer;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
  };
  const client = createTerminalSandboxClient({
    document: doc,
    window: win,
    WebSocket: FakeSocket,
    Terminal: terminalAvailable ? FakeTerminal : null,
    FitAddon: FakeFit,
    now: () => time,
  });
  function click(id) {
    const target = fields.get(id);
    if (!target.disabled) target.emit("click", { target });
  }
  function submit(id) {
    const target = fields.get(id);
    if (!target.querySelector("button").disabled)
      target.emit("submit", { target, preventDefault() {} });
  }
  function optIn(value) {
    const field = fields.get("snapshot-opt-in");
    field.checked = value;
    field.emit("change", { target: field });
  }
  return {
    client,
    fields,
    doc,
    win,
    sockets,
    terminals,
    intervals,
    timeouts,
    frames,
    images,
    uploads,
    observers,
    media,
    click,
    submit,
    optIn,
    get ws() {
      return sockets.at(-1);
    },
    get term() {
      return terminals[0];
    },
    flush() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((fn) => fn());
    },
    tick(ms) {
      time += ms;
      for (const [id, item] of [...timeouts])
        if (item.at <= time) {
          timeouts.delete(id);
          item.fn();
        }
      for (const item of [...intervals.values()]) item.fn();
    },
    student({ classroom = false } = {}) {
      if (classroom) {
        click("mode-instructor");
        fields.get("classroom-code-input").value = "CLL-REAL-123";
        submit("classroom-join-form");
      } else click("connect-btn");
      this.ws.open();
      this.ws.message({
        type: "auth:ok",
        role: "student",
        alias: "Learner-ABCD-EFGH",
      });
      this.ws.message({
        type: "session:ready",
        runtimeMode: "docker-pty",
        labId: "NET-201",
        mode: classroom ? "instructor-led" : "self-paced",
        alias: "Learner-ABCD-EFGH",
        limits: { inactivityTimeoutSeconds: 300 },
        lab: {
          track: "network",
          grade: "7–12",
          summary: "Investigate the fictional resolver configuration and restore DNS.",
          markdown: "# Practice\n```sh\ncat ~/lab/network-sheet.txt\n```",
        },
        milestones: [],
      });
      if (classroom)
        this.ws.message({
          type: "classroom:joined",
          classroomCode: "CLL-REAL-123",
          mode: "instructor-led",
        });
    },
    teacher() {
      fields.get("teacher-key-input").value =
        "administrator-provisioned-secret";
      submit("teacher-signin-form");
      this.ws.open();
      this.ws.message({ type: "auth:ok", role: "teacher", alias: "Teacher" });
    },
    dispose() {
      client.dispose();
    },
  };
}

test("the page uses only local terminal assets, split instructions and explicit connection/privacy controls", () => {
  assert.match(html, /href="\/vendor\/xterm\/xterm\.css"/);
  assert.match(html, /src="\/vendor\/xterm\/xterm\.js"/);
  assert.match(html, /src="\/vendor\/xterm\/addon-fit\.js"/);
  assert.doesNotMatch(html, /<(?:script|link)[^>]*(?:https?:|cdn\.)/i);
  assert.match(html, /class="split-layout"/);
  assert.match(html, /id="markdown-instructions"/);
  assert.match(html, /id="terminal-container"/);
  assert.match(html, /Starting sends this lab/);
  assert.doesNotMatch(html, /id="snapshot-opt-in"[^>]*checked/);
  assert.doesNotMatch(
    html,
    /CLL-CLASS-712|100%|super secure|COPPA compliant|Wi-Fi safe/i,
  );
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*719px\)/);
  assert.match(html, /id="ticket-brief"/);
  assert.doesNotMatch(html, /id="show-(?:instructions|workspace)"[^>]*aria-pressed/);
  assert.doesNotMatch(css, /body\s*\{[^}]*overflow:\s*hidden/);
});

test("Markdown escapes raw HTML/attributes and keeps command buttons bounded and initially disabled", () => {
  const result = renderMarkdown(
    '# Practice\n<script>bad()</script>\n```sh\necho "<img src=x>"\n```',
  );
  assert.ok(!result.includes("<script>"));
  assert.ok(result.includes("&lt;script&gt;"));
  assert.match(
    result,
    /data-run-command="echo &quot;&lt;img src=x&gt;&quot;" disabled/,
  );
  assert.ok(
    renderMarkdown("```\n" + "x".repeat(2001) + "\n```").includes("<pre>"),
  );
  assert.doesNotMatch(
    renderMarkdown("```\n" + "x".repeat(2001) + "\n```"),
    /data-run-command/,
  );
  assert.ok(renderMarkdown("```\ncat file").includes("cat file"));
});

test("socket URL is same-origin, credential-free and secure except explicit loopback development", () => {
  assert.equal(
    resolveWebSocketUrl({
      protocol: "https:",
      hostname: "terminal.school.test",
      host: "terminal.school.test",
    }),
    "wss://terminal.school.test/ws",
  );
  assert.equal(
    resolveWebSocketUrl({
      protocol: "http:",
      hostname: "127.0.0.1",
      host: "127.0.0.1:8080",
    }),
    "ws://127.0.0.1:8080/ws",
  );
  assert.throws(
    () =>
      resolveWebSocketUrl({
        protocol: "http:",
        hostname: "school.test",
        host: "school.test",
      }),
    /HTTPS/,
  );
  assert.throws(
    () => resolveWebSocketUrl({ protocol: "file:", hostname: "", host: "" }),
    /HTTPS/,
  );
});

test("loading the page starts no socket, Linux session, snapshot timer or simulated shell", () => {
  const f = fixture();
  assert.equal(f.sockets.length, 0);
  assert.equal(f.intervals.size, 0);
  assert.equal(f.fields.get("container-badge").textContent, "");
  assert.equal(f.term.options.disableStdin, true);
  f.term.data("pwd\r");
  assert.equal(f.sockets.length, 0);
  assert.equal(f.uploads.length, 0);
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  f.dispose();
});

test("student terminal input and control use one socket after server-confirmed Docker runtime", () => {
  const f = fixture();
  f.click("connect-btn");
  assert.equal(f.sockets.length, 1);
  assert.equal(f.ws.url, "wss://terminal.school.test/ws");
  f.ws.open();
  assert.deepEqual(f.ws.messages, [{ type: "auth", role: "student" }]);
  f.term.data("pwd\r");
  assert.equal(f.ws.messages.length, 1);
  f.ws.message({
    type: "auth:ok",
    role: "student",
    alias: "Learner-ABCD-EFGH",
  });
  assert.equal(f.ws.messages.at(-1).type, "session:start");
  assert.equal(f.ws.messages.at(-1).mode, "self-paced");
  f.term.data("pwd\r");
  assert.equal(f.ws.messages.at(-1).type, "session:start");
  f.ws.message({
    type: "session:ready",
    runtimeMode: "docker-pty",
    labId: "NET-201",
    lab: { markdown: "```\npwd\n```" },
    milestones: [],
  });
  f.term.data("pwd\r");
  assert.deepEqual(f.ws.messages.at(-1), {
    type: "terminal:input",
    data: "pwd\r",
  });
  f.click("verify-milestones-btn");
  assert.equal(f.ws.messages.at(-1).type, "milestone:verify");
  assert.equal(f.sockets.length, 1);
  assert.equal(f.term.options.disableStdin, false);
  assert.equal(f.intervals.size, 0);
  f.dispose();
});

test("class codes join only as students and cannot unlock or send teacher controls", () => {
  const f = fixture();
  f.student({ classroom: true });
  const start = f.ws.messages.find(
    (message) => message.type === "session:start",
  );
  assert.equal(start.role, undefined);
  assert.equal(start.classroomCode, "CLL-REAL-123");
  assert.equal(f.ws.messages[0].role, "student");
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  f.click("teacher-create-class");
  f.click("teacher-pause-all");
  assert.ok(
    !f.ws.messages.some(
      (message) =>
        message.type === "classroom:create" ||
        message.type === "classroom:control",
    ),
  );
  f.ws.message({ type: "classroom:created", classroomCode: "FORGED-CLASS" });
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  assert.equal(f.fields.get("teacher-class-code").value, "");
  f.dispose();
});

test("teacher UI requires server auth, clears the access key and sends control/snapshots through the same socket", () => {
  const f = fixture();
  f.fields.get("teacher-key-input").value = "administrator-provisioned-secret";
  f.submit("teacher-signin-form");
  assert.equal(f.fields.get("teacher-key-input").value, "");
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  assert.equal(f.ws.url, "wss://terminal.school.test/ws");
  f.ws.open();
  assert.deepEqual(f.ws.messages[0], {
    type: "auth",
    role: "teacher",
    teacherKey: "administrator-provisioned-secret",
  });
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  f.ws.message({ type: "auth:ok", role: "teacher", alias: "Teacher" });
  assert.equal(f.fields.get("teacher-dashboard").hidden, false);
  assert.ok(!f.ws.messages.some((message) => message.type === "session:start"));
  f.click("teacher-create-class");
  assert.equal(f.ws.messages.at(-1).type, "classroom:create");
  f.ws.message({ type: "classroom:created", classroomCode: "CLL-REAL-123" });
  assert.deepEqual(f.ws.messages.at(-1), {
    type: "classroom:subscribe",
    classroomCode: "CLL-REAL-123",
  });
  f.click("teacher-pause-all");
  assert.deepEqual(f.ws.messages.at(-1), {
    type: "classroom:control",
    classroomCode: "CLL-REAL-123",
    action: "pause",
  });
  assert.equal(f.sockets.length, 1);
  assert.equal(f.intervals.size, 0);
  f.dispose();
});

test("mismatched or missing authentication never grants teacher controls", () => {
  const f = fixture();
  f.click("connect-btn");
  f.ws.open();
  f.ws.message({ type: "auth:ok", role: "teacher" });
  assert.equal(f.ws.readyState, 3);
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  assert.equal(f.fields.get("container-badge").textContent, "No Linux session");
  f.dispose();
});

test("a rejected teacher key fails closed and retains the useful denial after the socket closes", () => {
  const f = fixture();
  f.fields.get("teacher-key-input").value = "incorrect-provisioned-secret";
  f.submit("teacher-signin-form");
  f.ws.open();
  f.ws.message({
    type: "auth:error",
    message: "Teacher access was not authorized.",
  });
  assert.equal(f.ws.readyState, 3);
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  assert.equal(f.fields.get("teacher-key-input").value, "");
  assert.equal(
    f.fields.get("ws-status-text").textContent,
    "Teacher access was not authorized.",
  );
  assert.equal(f.fields.get("connect-btn").disabled, false);
  assert.equal(f.ws.listeners.size, 0);
  f.dispose();
});

test("snapshots require instructor class, explicit opt-in and server consent before terminal-only JPEG quality 0.1 uploads", () => {
  const f = fixture();
  f.student({ classroom: true });
  assert.equal(f.fields.get("snapshot-controls").hidden, false);
  assert.equal(f.intervals.size, 0);
  f.ws.message({ type: "teacher:request-snapshot" });
  assert.equal(f.uploads.length, 0);
  f.optIn(true);
  assert.deepEqual(f.ws.messages.at(-1), {
    type: "screen:consent",
    enabled: true,
  });
  assert.equal(f.uploads.length, 0);
  f.ws.message({ type: "screen:consent-state", enabled: true });
  assert.equal(f.intervals.size, 1);
  assert.equal(f.ws.messages.at(-1).type, "screen:snapshot");
  assert.ok(
    f.uploads.some(
      (item) => item.type === "image/jpeg" && item.quality === 0.1,
    ),
  );
  assert.ok(f.uploads.some((item) => item.text?.includes("LAB TERMINAL ONLY")));
  assert.equal(f.sockets.length, 1);
  const before = f.ws.messages.filter(
    (message) => message.type === "screen:snapshot",
  ).length;
  f.ws.message({ type: "teacher:request-snapshot" });
  f.tick(1000);
  assert.equal(
    f.ws.messages.filter((message) => message.type === "screen:snapshot")
      .length,
    before,
  );
  f.ws.message({ type: "terminal:output", data: "fictional changed output" });
  f.tick(4000);
  assert.equal(
    f.ws.messages.filter((message) => message.type === "screen:snapshot")
      .length,
    before + 1,
  );
  f.tick(5000);
  assert.equal(
    f.ws.messages.filter((message) => message.type === "screen:snapshot")
      .length,
    before + 2,
    "a consented unchanged terminal is sent on the next bounded interval so a newly subscribed teacher receives it",
  );
  f.dispose();
});

test("snapshot revocation, hidden tab, lab switch and session end stop sharing and ignore stale consent acks", () => {
  const f = fixture();
  f.student({ classroom: true });
  f.optIn(true);
  f.ws.message({ type: "screen:consent-state", enabled: true });
  f.optIn(false);
  assert.equal(f.intervals.size, 0);
  assert.deepEqual(f.ws.messages.at(-1), {
    type: "screen:consent",
    enabled: false,
  });
  f.ws.message({ type: "screen:consent-state", enabled: true });
  assert.equal(f.intervals.size, 0);
  f.optIn(true);
  f.ws.message({ type: "screen:consent-state", enabled: true });
  f.doc.hidden = true;
  f.doc.emit("visibilitychange");
  assert.equal(f.intervals.size, 0);
  assert.equal(f.fields.get("snapshot-opt-in").checked, false);
  f.doc.hidden = false;
  f.optIn(true);
  f.ws.message({ type: "screen:consent-state", enabled: true });
  f.fields.get("lab-selector").value = "SEC-402";
  f.fields.get("lab-selector").emit("change");
  assert.equal(f.intervals.size, 0);
  assert.equal(f.term.options.disableStdin, true);
  assert.equal(f.ws.messages.at(-1).type, "lab:switch");
  f.ws.message({ type: "session:terminated", reason: "lab_changed" });
  assert.equal(
    f.ws.readyState,
    1,
    "a clean lab restart keeps the single authenticated socket",
  );
  f.ws.message({
    type: "session:ready",
    runtimeMode: "docker-pty",
    labId: "SEC-402",
    milestones: [],
  });
  assert.equal(f.term.options.disableStdin, false);
  assert.equal(f.intervals.size, 0);
  f.click("disconnect-btn");
  assert.equal(f.intervals.size, 0);
  assert.equal(f.fields.get("container-badge").textContent, "No Linux session");
  f.dispose();
});

test("self-paced and teacher sessions never capture terminal snapshots even if a request arrives", () => {
  for (const role of ["student", "teacher"]) {
    const f = fixture();
    role === "teacher" ? f.teacher() : f.student();
    f.fields.get("snapshot-opt-in").checked = true;
    f.fields.get("snapshot-opt-in").emit("change");
    f.ws.message({ type: "screen:consent-state", enabled: true });
    f.ws.message({ type: "teacher:request-snapshot" });
    f.tick(5000);
    assert.equal(f.uploads.length, 0);
    assert.equal(f.intervals.size, 0);
    assert.equal(f.fields.get("snapshot-controls").hidden, true);
    f.dispose();
  }
});

test("teacher snapshot cards accept only consented JPEG data, safe text aliases and matching owned class", () => {
  const f = fixture();
  f.teacher();
  f.ws.message({ type: "classroom:created", classroomCode: "CLL-REAL-123" });
  f.ws.message({
    type: "classroom:status",
    classroomCode: "OTHER-CLASS",
    students: [
      {
        sessionId: "other",
        alias: "Other",
        snapshotConsented: true,
        snapshotDataUrl: fakeJpeg,
      },
    ],
  });
  assert.equal(f.images.length, 0);
  f.ws.message({
    type: "classroom:status",
    classroomCode: "CLL-REAL-123",
    students: [
      {
        sessionId: "a",
        alias: "<img src=x onerror=bad()>",
        labId: "NET-201",
        snapshotConsented: true,
        snapshotDataUrl: "https://tracker.example/image",
        milestones: [],
      },
    ],
  });
  assert.equal(f.images.length, 0);
  const card = f.fields.get("teacher-student-grid").children[0];
  assert.equal(card.children[0].textContent, "<img src=x onerror=bad()>");
  f.ws.message({
    type: "classroom:snapshot",
    classroomCode: "CLL-REAL-123",
    student: {
      sessionId: "a",
      alias: "Learner-ABCD",
      snapshotConsented: true,
      snapshotDataUrl: fakeJpeg,
    },
  });
  assert.equal(f.images.at(-1).src, fakeJpeg);
  f.ws.message({
    type: "classroom:snapshot",
    classroomCode: "CLL-REAL-123",
    student: {
      sessionId: "a",
      alias: "Learner-ABCD",
      snapshotConsented: false,
      snapshotDataUrl: fakeJpeg,
    },
  });
  assert.ok(
    f.fields
      .get("teacher-student-grid")
      .children[0].children.some(
        (item) => item.textContent === "No shared terminal snapshot.",
      ),
  );
  f.ws.message({
    type: "classroom:student-left",
    classroomCode: "CLL-REAL-123",
    sessionId: "a",
  });
  assert.equal(
    f.fields.get("teacher-student-grid").children[0].textContent,
    "No students have joined this class.",
  );
  f.dispose();
});

test("missing terminal assets and non-Docker runtime never masquerade as backend Linux", () => {
  const unavailable = fixture({ terminalAvailable: false });
  assert.equal(unavailable.sockets.length, 0);
  assert.equal(unavailable.fields.get("connect-btn").disabled, true);
  assert.match(
    unavailable.fields.get("terminal-container").children[0].textContent,
    /No Linux session/,
  );
  assert.equal(unavailable.intervals.size, 0);
  unavailable.dispose();
  const fallback = fixture();
  fallback.click("connect-btn");
  fallback.ws.open();
  fallback.ws.message({ type: "auth:ok", role: "student" });
  fallback.ws.message({
    type: "session:ready",
    runtimeMode: "fallback-posix",
    containerId: "fake-linux",
  });
  assert.equal(fallback.ws.readyState, 3);
  assert.match(
    fallback.fields.get("ws-status-text").textContent,
    /No real Linux runtime/,
  );
  assert.equal(fallback.term.options.disableStdin, true);
  fallback.dispose();
});

test("teacher pause blocks typed input, command buttons and tablet shortcut input", () => {
  const f = fixture();
  f.student();
  f.ws.message({ type: "teacher:pause-state", paused: true });
  const before = f.ws.messages.length;
  f.term.data("pwd\r");
  f.click("verify-milestones-btn");
  const key = f.fields
    .get("terminal-keyboard-controls")
    .children.find((button) => button.dataset.terminalKey === "interrupt");
  f.fields.get("terminal-keyboard-controls").emit("click", { target: key });
  assert.equal(f.ws.messages.length, before);
  assert.equal(f.term.options.disableStdin, true);
  assert.equal(f.fields.get("instructor-pause-banner").hidden, false);
  f.ws.message({ type: "teacher:pause-state", paused: false });
  f.term.data("pwd\r");
  assert.equal(f.ws.messages.at(-1).type, "terminal:input");
  f.dispose();
});

test("dispose closes the socket, stops timers, removes owned listeners and disposes xterm once", () => {
  const f = fixture();
  f.student({ classroom: true });
  f.optIn(true);
  f.ws.message({ type: "screen:consent-state", enabled: true });
  const count = f.ws.messages.length;
  f.dispose();
  f.dispose();
  assert.equal(f.ws.readyState, 3);
  assert.equal(f.intervals.size, 0);
  assert.equal(f.timeouts.size, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.doc.listeners.size, 0);
  assert.equal(f.win.listeners.size, 0);
  assert.equal(f.ws.listeners.size, 0);
  assert.equal(f.term.disposed, 1);
  assert.equal(f.term.data, null);
  f.ws.message({ type: "auth:ok", role: "teacher" });
  assert.equal(f.fields.get("teacher-dashboard").hidden, true);
  assert.equal(
    f.ws.messages.length,
    count + 1,
    "only the consent revocation is sent during disposal",
  );
});

test("all terminal/control/teacher data uses one native socket with no polling, URL secrets, storage or device capture", () => {
  assert.equal((app.match(/new Socket\(/g) || []).length, 1);
  assert.doesNotMatch(
    app,
    /\bfetch\s*\(|XMLHttpRequest|EventSource|socket\.io|localStorage|sessionStorage|indexedDB|getDisplayMedia|getUserMedia|html2canvas|document\.body.*(?:canvas|capture)|URLSearchParams|params\.set\('token'/,
  );
  assert.doesNotMatch(
    app,
    /state\.token|state\.teacherKey|role\s*=\s*['"]teacher['"]/,
  );
  assert.match(app, /screen:consent/);
  assert.match(app, /toDataURL\(\s*['"]image\/jpeg['"]\s*,\s*0\.1\s*\)/);
});

test("the learning guide has keyboard tabs without starting a session or awarding checks", () => {
  const f = fixture();
  assert.equal(f.fields.get("instructions-tab").getAttribute("aria-selected"), "true");
  assert.equal(f.fields.get("checks-panel").hidden, true);
  let prevented = false;
  f.fields.get("instructions-tab").emit("keydown", { key: "ArrowRight", preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.fields.get("checks-tab").tabIndex, 0);
  assert.equal(f.fields.get("instructions-tab").tabIndex, -1);
  assert.equal(f.fields.get("checks-panel").hidden, false);
  assert.equal(f.fields.get("instructions-panel").hidden, true);
  assert.equal(f.doc.activeElement, f.fields.get("checks-tab"));
  f.fields.get("checks-tab").emit("keydown", { key: "Home", preventDefault() {} });
  assert.equal(f.fields.get("instructions-panel").hidden, false);
  assert.equal(f.sockets.length, 0);
  assert.equal(f.fields.get("milestone-progress").value, "");
  f.dispose();
});

test("keyboard resizing stays bounded, announces the split and coalesces xterm fits", () => {
  const f = fixture(), divider = f.fields.get("split-divider");
  f.flush();
  const fits = f.term.addon.fits;
  divider.emit("keydown", { key: "ArrowRight", preventDefault() {} });
  divider.emit("keydown", { key: "ArrowRight", shiftKey: true, preventDefault() {} });
  assert.equal(divider.getAttribute("aria-valuenow"), "50");
  assert.equal(divider.getAttribute("aria-valuetext"), "Instructions 50%, workspace 50%");
  assert.equal(f.fields.get("lab-layout").style.values["--learning-width"], "50%");
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.term.addon.fits, fits + 1);
  divider.emit("keydown", { key: "End", preventDefault() {} });
  divider.emit("keydown", { key: "ArrowRight", preventDefault() {} });
  assert.equal(divider.getAttribute("aria-valuenow"), "55");
  divider.emit("keydown", { key: "Home", preventDefault() {} });
  divider.emit("keydown", { key: "ArrowLeft", preventDefault() {} });
  assert.equal(divider.getAttribute("aria-valuenow"), "28");
  divider.emit("dblclick");
  assert.equal(divider.getAttribute("aria-valuenow"), "38");
  assert.equal(f.sockets.length, 0);
  f.dispose();
});

test("pointer resizing cancels safely without a stuck capture or late layout writes", () => {
  const f = fixture(), divider = f.fields.get("split-divider");
  const down = (id, clientX) => divider.emit("pointerdown", { pointerId: id, clientX, button: 0, preventDefault() {} });
  down(7, 550);
  assert.equal(divider.hasPointerCapture(7), true);
  assert.equal(divider.getAttribute("aria-valuenow"), "45");
  f.win.emit("pointermove", { pointerId: 9, clientX: 1000 });
  assert.equal(divider.getAttribute("aria-valuenow"), "45");
  f.win.emit("pointermove", { pointerId: 7, clientX: 1000 });
  assert.equal(divider.getAttribute("aria-valuenow"), "55");
  f.win.emit("pointercancel", { pointerId: 7 });
  assert.equal(divider.getAttribute("aria-valuenow"), "38");
  assert.equal(divider.hasPointerCapture(7), false);
  down(8, 420);
  divider.emit("keydown", { key: "Escape", preventDefault() {} });
  assert.equal(divider.getAttribute("aria-valuenow"), "38");
  assert.equal(divider.hasPointerCapture(8), false);
  down(10, 500);
  f.win.emit("blur");
  assert.equal(divider.hasPointerCapture(10), false);
  f.win.emit("pointermove", { pointerId: 10, clientX: 1000 });
  assert.equal(divider.getAttribute("aria-valuenow"), "40");
  down(11, 600);
  f.dispose();
  assert.equal(divider.hasPointerCapture(11), false);
  assert.equal(f.media.listeners.size, 0);
  f.win.emit("pointermove", { pointerId: 11, clientX: 1000 });
  assert.equal(divider.getAttribute("aria-valuenow"), "50");
  assert.equal(f.frames.size, 0);
});

test("small screens retain both panes and section jumps preserve the guide tab and terminal", () => {
  const f = fixture({ compact: true });
  assert.equal(f.fields.get("pane-controls").hidden, false);
  assert.equal(f.fields.get("learning-panel").hidden, false);
  assert.equal(f.fields.get("terminal-workspace").hidden, false);
  assert.equal(f.fields.get("split-divider").hidden, true);
  f.flush();
  assert.equal(f.term.addon.fits, 1);
  f.click("checks-tab");
  f.click("show-workspace");
  f.flush();
  assert.equal(f.term.addon.fits, 2);
  assert.equal(f.fields.get("learning-panel").hidden, false);
  assert.equal(f.doc.activeElement, f.fields.get("terminal-workspace"));
  assert.equal(f.fields.get("terminal-workspace").scrolledIntoView.block, "start");
  f.click("show-instructions");
  f.observers[0].callback();
  f.flush();
  assert.equal(f.term.addon.fits, 3, "the still-visible terminal refits without resetting its session");
  assert.equal(f.doc.activeElement, f.fields.get("learning-panel"));
  assert.equal(f.fields.get("checks-panel").hidden, false);
  f.media.matches = false;
  f.media.emit("change", { matches: false });
  f.flush();
  assert.equal(f.fields.get("learning-panel").hidden, false);
  assert.equal(f.fields.get("terminal-workspace").hidden, false);
  assert.equal(f.fields.get("split-divider").hidden, false);
  assert.equal(f.fields.get("pane-controls").hidden, true);
  assert.equal(f.term.addon.fits, 4);
  f.observers[0].callback();
  f.observers[0].callback();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.term.addon.fits, 5);
  assert.equal(f.sockets.length, 0);
  f.dispose();
});

test("the current objective advances only after server verification and does not reset guide tabs", () => {
  const f = fixture();
  f.student();
  const first = { title: "Inspect <fictional> configuration", description: "Read the supplied lab fixture.", completed: false };
  const second = { title: "Verify the result", description: "Record your evidence.", completed: false };
  f.ws.message({ type: "milestone:status", milestones: [first, second] });
  assert.equal(f.fields.get("objective-label").textContent, "STEP 1 OF 2");
  assert.equal(f.fields.get("objective-title").textContent, first.title);
  assert.equal(f.fields.get("checks-tab").textContent, "Your checks (0/2)");
  f.click("checks-tab");
  assert.equal(f.fields.get("ticket-brief").textContent, "Investigate the fictional resolver configuration and restore DNS.");
  assert.equal(f.fields.get("ticket-brief").hidden, false);
  f.click("verify-milestones-btn");
  assert.equal(f.ws.messages.at(-1).type, "milestone:verify");
  assert.equal(f.fields.get("objective-label").textContent, "STEP 1 OF 2");
  f.ws.message({ type: "milestone:status", milestones: [{ ...first, completed: true }, second] });
  assert.equal(f.fields.get("objective-label").textContent, "STEP 2 OF 2");
  assert.equal(f.fields.get("objective-title").textContent, second.title);
  assert.equal(f.fields.get("checks-panel").hidden, false);
  f.ws.message({ type: "milestone:status", milestones: [{ ...first, completed: true }, { ...second, completed: true }] });
  assert.equal(f.fields.get("objective-label").textContent, "ALL CHECKS VERIFIED");
  f.click("disconnect-btn");
  assert.equal(f.fields.get("objective-label").textContent, "GET READY");
  f.dispose();
});

test("authenticated teacher controls open in the workspace on small screens without a Linux session", () => {
  const f = fixture({ compact: true });
  f.teacher();
  assert.equal(f.fields.get("learning-panel").hidden, false);
  assert.equal(f.fields.get("terminal-workspace").hidden, false);
  assert.equal(f.fields.get("teacher-dashboard").hidden, false);
  assert.equal(f.fields.get("terminal-container").hidden, true);
  assert.equal(f.fields.get("container-badge").textContent, "");
  assert.equal(f.fields.get("objective-label").textContent, "TEACHER WORKSPACE");
  assert.equal(f.fields.get("objective-title").textContent, "Create a class, then share its student join code.");
  f.ws.message({ type: "classroom:created", classroomCode: "CLL-REAL-123" });
  assert.equal(f.fields.get("objective-title").textContent, "Your class is ready for learners.");
  assert.ok(!f.ws.messages.some((message) => message.type === "session:start"));
  f.flush();
  assert.equal(f.term.addon.fits || 0, 0);
  f.dispose();
});
