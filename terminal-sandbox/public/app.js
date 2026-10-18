/**
 * Cole Learning Labs · Frontend Split-Screen xterm.js & Cloudflare WSS Client
 *
 * Capabilities:
 * - Connects over a single Port 443 WebSocket (wss:// in HTTPS deployments, ws:// locally)
 * - Renders Markdown lab instructions and self-paced milestones in the left sidebar
 * - Instantiates xterm.js (with FitAddon and an offline DOM/Canvas fallback) in the right panel
 * - Emits 10%-compressed JPEG snapshots (canvas.toDataURL('image/jpeg', 0.1)) once every 5s
 *   for the Low-Bandwidth Teacher Dashboard to protect school Wi-Fi
 */

const state = {
  ws: null,
  token: null,
  sessionId: null,
  alias: 'Learner-Init',
  labId: 'NET-201',
  mode: 'self-paced',
  classroomCode: 'CLL-CLASS-712',
  paused: false,
  milestones: [],
  terminalLines: [],
  lastActivityTs: Date.now(),
  inactivityLimitSec: 300,
  teacherViewOpen: false,
  snapshotIntervalId: null,
  teacherPollIntervalId: null
};

const byId = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

const els = {
  labSelector: byId('lab-selector'),
  labTrackBadge: byId('lab-track-badge'),
  milestoneProgress: byId('milestone-progress'),
  milestoneCountText: byId('milestone-count-text'),
  milestoneList: byId('milestone-list'),
  verifyMilestonesBtn: byId('verify-milestones-btn'),
  markdownInstructions: byId('markdown-instructions'),
  wsStatusDot: byId('ws-status-dot'),
  wsStatusText: byId('ws-status-text'),
  containerBadge: byId('container-badge'),
  learnerAliasBadge: byId('learner-alias-badge'),
  inactivityTimerBadge: byId('inactivity-timer-badge'),
  reconnectBtn: byId('reconnect-btn'),
  pauseBanner: byId('instructor-pause-banner'),
  terminalContainer: byId('terminal-container'),
  snapshotCanvas: byId('snapshot-canvas'),
  modeSelfPacedBtn: byId('mode-self-paced'),
  modeInstructorBtn: byId('mode-instructor'),
  classroomJoinForm: byId('classroom-join-form'),
  classroomCodeInput: byId('classroom-code-input'),
  toggleTeacherDashboardBtn: byId('toggle-teacher-dashboard'),
  teacherDashboard: byId('teacher-dashboard'),
  teacherStudentGrid: byId('teacher-student-grid'),
  teacherMetaStatus: byId('teacher-meta-status'),
  teacherPauseAllBtn: byId('teacher-pause-all'),
  teacherResumeAllBtn: byId('teacher-resume-all'),
  teacherOverrideForm: byId('teacher-override-form'),
  teacherOverrideInput: byId('teacher-override-input')
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

// ============================================================================
// 1. SAFE MARKDOWN INSTRUCTION RENDERER (LEFT PANEL)
// ============================================================================
export function renderMarkdown(markdownText) {
  const lines = String(markdownText || '').split(/\r?\n/);
  const html = [];
  let inCodeBlock = false;
  let codeLines = [];

  const formatInline = text =>
    escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        const cmdText = codeLines.join('\n');
        html.push(
          `<div class="code-block-wrapper">` +
            `<pre><code>${escapeHtml(cmdText)}</code></pre>` +
            `<div class="code-block-Wrapper-actions">` +
              `<button type="button" class="btn btn-small" data-run-command="${escapeHtml(cmdText)}">Run in Terminal ↵</button>` +
            `</div>` +
          `</div>`
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) continue;
    if (line.startsWith('# ')) {
      html.push(`<h1>${formatInline(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${formatInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      html.push(`<h3>${formatInline(line.slice(4))}</h3>`);
    } else if (line.startsWith('> ')) {
      html.push(`<blockquote>${formatInline(line.slice(2))}</blockquote>`);
    } else {
      html.push(`<p>${formatInline(line)}</p>`);
    }
  }

  return html.join('\n');
}

function renderMilestones(milestones) {
  state.milestones = Array.isArray(milestones) ? milestones : [];
  const total = state.milestones.length || 1;
  const completedCount = state.milestones.filter(m => m.completed).length;

  els.milestoneProgress.max = total;
  els.milestoneProgress.value = completedCount;
  els.milestoneCountText.textContent = `${completedCount} / ${state.milestones.length} verified`;

  els.milestoneList.innerHTML = state.milestones
    .map(
      (m, idx) => `
      <li class="milestone-item ${m.completed ? 'completed' : ''}" data-milestone-id="${escapeHtml(m.id)}">
        <div class="milestone-title-row">
          <span>${idx + 1}. ${escapeHtml(m.title)}</span>
          <span class="milestone-badge">${m.completed ? '✓ Verified' : 'Pending'}</span>
        </div>
        <p class="milestone-desc">${escapeHtml(m.description)}</p>
        ${
          m.hint
            ? `<details class="milestone-hint"><summary>Need a hint?</summary><p>${escapeHtml(m.hint)}</p></details>`
            : ''
        }
      </li>`
    )
    .join('');
}

// ============================================================================
// 2. XTERM.JS INSTANCE (RIGHT PANEL) + OFFLINE FALLBACK
// ============================================================================
let term = null;
let fitAddon = null;

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function recordTerminalPlainText(chunk) {
  const clean = stripAnsi(chunk);
  const parts = clean.split(/\r?\n/);
  for (let i = 0; i < parts.length; i++) {
    if (i === 0 && state.terminalLines.length > 0) {
      state.terminalLines[state.terminalLines.length - 1] += parts[0];
    } else {
      state.terminalLines.push(parts[i]);
    }
  }
  if (state.terminalLines.length > 22) {
    state.terminalLines = state.terminalLines.slice(-22);
  }
}

function initTerminal() {
  els.terminalContainer.innerHTML = '';

  if (globalThis.Terminal) {
    term = new globalThis.Terminal({
      cursorBlink: true,
      fontSize: 15,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      theme: {
        background: '#09131f',
        foreground: '#e2e8f0',
        cursor: '#24c9b5',
        selectionBackground: 'rgba(36, 201, 181, 0.28)'
      }
    });

    if (globalThis.FitAddon?.FitAddon) {
      fitAddon = new globalThis.FitAddon.FitAddon();
      term.loadAddon(fitAddon);
    }

    term.open(els.terminalContainer);
    fitAddon?.fit();

    term.onData(data => {
      sendWsMessage({ type: 'terminal:input', data });
    });

    window.addEventListener('resize', () => {
      if (fitAddon && term) {
        fitAddon.fit();
        sendWsMessage({ type: 'terminal:resize', cols: term.cols, rows: term.rows });
      }
    });
  } else {
    // Offline fallback terminal element if CDN scripts are blocked
    const fallbackEl = document.createElement('div');
    fallbackEl.className = 'fallback-terminal';
    fallbackEl.tabIndex = 0;
    els.terminalContainer.appendChild(fallbackEl);

    fallbackEl.addEventListener('keydown', event => {
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        sendWsMessage({ type: 'terminal:input', data: event.key });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        sendWsMessage({ type: 'terminal:input', data: '\r' });
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        sendWsMessage({ type: 'terminal:input', data: '\u007f' });
      }
    });

    term = {
      write(data) {
        fallbackEl.textContent += stripAnsi(data);
        fallbackEl.scrollTop = fallbackEl.scrollHeight;
      },
      clear() {
        fallbackEl.textContent = '';
      },
      focus() {
        fallbackEl.focus();
      },
      cols: 80,
      rows: 24
    };
  }
}

// ============================================================================
// 3. LOW-BANDWIDTH 10%-COMPRESSED JPEG SNAPSHOT GENERATOR (EVERY 5 SECONDS)
// ============================================================================
export function captureCompressedTerminalSnapshot() {
  const canvas = els.snapshotCanvas;
  if (!canvas || !canvas.getContext) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Render current terminal buffer onto 640x360 snapshot canvas
  ctx.fillStyle = '#09131f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header bar in snapshot
  ctx.fillStyle = '#102c46';
  ctx.fillRect(0, 0, canvas.width, 28);
  ctx.fillStyle = '#24c9b5';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`${state.alias} · ${state.labId} · ${state.classroomCode || 'Self-Paced'}`, 10, 18);

  // Terminal lines
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px monospace';
  const lines = state.terminalLines.slice(-18);
  lines.forEach((line, idx) => {
    ctx.fillText(String(line).slice(0, 78), 10, 48 + idx * 16);
  });

  // Return static 10%-compressed JPEG (quality = 0.1) to protect school Wi-Fi
  return canvas.toDataURL('image/jpeg', 0.1);
}

function sendTerminalSnapshotIfNeeded() {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  const dataUrl = captureCompressedTerminalSnapshot();
  if (dataUrl) {
    sendWsMessage({ type: 'screen:snapshot', dataUrl, quality: 0.1 });
  }
}

// ============================================================================
// 4. CLOUDFLARE WEBSOCKET CONNECTION (WSS OVER PORT 443)
// ============================================================================
export function resolveWebSocketUrl() {
  const isSecure = window.location.protocol === 'https:';
  const protocol = isSecure ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:8080';
  const params = new URLSearchParams({
    lab: state.labId,
    mode: state.mode
  });
  if (state.token) params.set('token', state.token);
  if (state.mode === 'instructor' && state.classroomCode) {
    params.set('classroom', state.classroomCode);
  }
  return `${protocol}//${host}/ws?${params.toString()}`;
}

function setConnectionUi(status, message) {
  els.wsStatusDot.className = `status-dot ${status}`;
  els.wsStatusText.textContent = message;
}

function sendWsMessage(payload) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(payload));
    if (payload.type === 'terminal:input') {
      state.lastActivityTs = Date.now();
    }
  }
}

async function ensureSessionToken() {
  if (state.token) return;
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student' })
    });
    if (res.ok) {
      const data = await res.json();
      state.token = data.token;
      state.sessionId = data.sessionId;
      state.alias = data.alias;
    }
  } catch {}
}

async function connectWebSocket() {
  if (state.ws) {
    try { state.ws.close(); } catch {}
  }

  await ensureSessionToken();
  const wsUrl = resolveWebSocketUrl();
  setConnectionUi('connecting', 'Connecting WSS (Port 443)…');

  const ws = new WebSocket(wsUrl);
  state.ws = ws;

  ws.addEventListener('open', () => {
    state.lastActivityTs = Date.now();
    const protoLabel = wsUrl.startsWith('wss:') ? 'WSS Port 443 · Cloudflare Tunnel' : 'WS Local Dev Tunnel';
    setConnectionUi('connected', `${protoLabel} Connected`);
    if (term?.cols && term?.rows) {
      sendWsMessage({ type: 'terminal:resize', cols: term.cols, rows: term.rows });
    }
    // Emit initial 10%-compressed JPEG snapshot and schedule every 5 seconds
    sendTerminalSnapshotIfNeeded();
  });

  ws.addEventListener('message', event => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'ping':
        sendWsMessage({ type: 'pong', timestamp: Date.now() });
        break;

      case 'session:ready':
        state.sessionId = msg.sessionId;
        state.alias = msg.alias;
        state.inactivityLimitSec = msg.limits?.inactivityTimeoutSeconds || 300;
        els.learnerAliasBadge.textContent = msg.alias;
        els.containerBadge.textContent = `${msg.runtimeMode === 'docker-pty' ? 'Docker Alpine PTY' : 'Alpine Sandbox'} (${msg.containerId}) · ${msg.limits?.memory || '512m'} RAM`;
        if (msg.lab) {
          els.labTrackBadge.textContent = `${msg.lab.track.toUpperCase()} · ${msg.lab.grade.toUpperCase()}`;
          els.markdownInstructions.innerHTML = renderMarkdown(msg.lab.markdown);
        }
        if (msg.milestones) {
          renderMilestones(msg.milestones);
        }
        sendTerminalSnapshotIfNeeded();
        break;

      case 'terminal:output':
        if (typeof msg.data === 'string') {
          recordTerminalPlainText(msg.data);
          term?.write(msg.data);
        }
        break;

      case 'milestone:status':
        renderMilestones(msg.milestones);
        break;

      case 'lab:switched':
        if (msg.lab) {
          els.labTrackBadge.textContent = `${msg.lab.track.toUpperCase()} · ${msg.lab.grade.toUpperCase()}`;
          els.markdownInstructions.innerHTML = renderMarkdown(msg.lab.markdown);
        }
        renderMilestones(msg.milestones || []);
        break;

      case 'teacher:pause-state':
        state.paused = Boolean(msg.paused);
        els.pauseBanner.hidden = !state.paused;
        break;

      case 'teacher:override-executed':
        term?.write(`\r\n\x1b[1;33m[Instructor Override]: ${msg.command}\x1b[0m\r\n`);
        break;

      case 'teacher:request-snapshot':
        sendTerminalSnapshotIfNeeded();
        break;

      case 'session:terminated':
        setConnectionUi('disconnected', `Session Ended (${msg.reason})`);
        term?.write(`\r\n\x1b[1;31m[Sandbox Terminated: ${msg.reason}]\x1b[0m\r\n`);
        break;
    }
  });

  ws.addEventListener('close', () => {
    setConnectionUi('disconnected', 'Disconnected · Click Reconnect');
  });
}

// ============================================================================
// 5. TEACHER DASHBOARD VIEW (5-SECOND 10% JPEG POLLING & INSTRUCTOR CONTROLS)
// ============================================================================
async function pollTeacherDashboardSnapshots() {
  if (!state.teacherViewOpen) return;
  const code = encodeURIComponent(state.classroomCode || 'CLL-CLASS-712');
  try {
    const res = await fetch(`/api/classrooms/${code}/snapshots`);
    if (!res.ok) return;
    const data = await res.json();
    els.teacherMetaStatus.textContent =
      `Classroom ${data.classroomCode} · ${data.studentCount} active container(s) · ` +
      `10% JPEG snapshots refreshed at ${new Date().toLocaleTimeString()}`;

    if (!data.students.length) {
      els.teacherStudentGrid.innerHTML =
        `<p class="teacher-meta">No students currently joined to <strong>${escapeHtml(data.classroomCode)}</strong>. Switch to Instructor-Led mode and click Join Class.</p>`;
      return;
    }

    els.teacherStudentGrid.innerHTML = data.students
      .map(
        s => `
        <article class="student-snapshot-card">
          <div class="student-card-meta">
            <strong>${escapeHtml(s.alias)}</strong>
            <span>${escapeHtml(s.labId)} · ${s.completedMilestones}/${s.totalMilestones} ✓</span>
          </div>
          ${
            s.snapshotDataUrl
              ? `<img src="${escapeHtml(s.snapshotDataUrl)}" alt="10% JPEG snapshot of ${escapeHtml(s.alias)} terminal">`
              : `<div class="teacher-meta">Awaiting next 5s snapshot…</div>`
          }
          <div class="student-card-meta">
            <span>Container: <code>${escapeHtml(s.containerId || 'n/a')}</code></span>
            <span>${s.paused ? '⏸ Paused' : '▶ Active'}</span>
          </div>
        </article>`
      )
      .join('');
  } catch {}
}

async function sendTeacherClassroomControl(action, extra = {}) {
  const code = encodeURIComponent(state.classroomCode || 'CLL-CLASS-712');
  await fetch(`/api/classrooms/${code}/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra })
  });
  await pollTeacherDashboardSnapshots();
}

// ============================================================================
// 6. UI EVENT BINDINGS & TIMERS
// ============================================================================
function bindEvents() {
  // Switch Self-Paced Labs
  els.labSelector.addEventListener('change', event => {
    state.labId = event.target.value;
    sendWsMessage({ type: 'lab:switch', labId: state.labId });
  });

  // Verify Milestones on demand
  els.verifyMilestonesBtn.addEventListener('click', () => {
    sendWsMessage({ type: 'milestone:verify' });
  });

  // Run command snippet directly from Markdown instructions
  els.markdownInstructions.addEventListener('click', event => {
    const runBtn = event.target.closest('[data-run-command]');
    if (!runBtn) return;
    const cmd = runBtn.getAttribute('data-run-command');
    if (cmd) {
      sendWsMessage({ type: 'terminal:input', data: cmd + '\r' });
      term?.focus();
    }
  });

  // Mode Switch: Self-Paced vs Instructor-Led
  els.modeSelfPacedBtn.addEventListener('click', () => {
    state.mode = 'self-paced';
    els.modeSelfPacedBtn.classList.add('active');
    els.modeSelfPacedBtn.setAttribute('aria-pressed', 'true');
    els.modeInstructorBtn.classList.remove('active');
    els.modeInstructorBtn.setAttribute('aria-pressed', 'false');
    els.classroomJoinForm.hidden = true;
    sendWsMessage({ type: 'classroom:join', classroomCode: '' });
  });

  els.modeInstructorBtn.addEventListener('click', () => {
    state.mode = 'instructor';
    els.modeInstructorBtn.classList.add('active');
    els.modeInstructorBtn.setAttribute('aria-pressed', 'true');
    els.modeSelfPacedBtn.classList.remove('active');
    els.modeSelfPacedBtn.setAttribute('aria-pressed', 'false');
    els.classroomJoinForm.hidden = false;
    state.classroomCode = els.classroomCodeInput.value.trim() || 'CLL-CLASS-712';
    sendWsMessage({ type: 'classroom:join', classroomCode: state.classroomCode });
  });

  els.classroomJoinForm.addEventListener('submit', event => {
    event.preventDefault();
    state.classroomCode = els.classroomCodeInput.value.trim() || 'CLL-CLASS-712';
    sendWsMessage({ type: 'classroom:join', classroomCode: state.classroomCode });
    if (state.teacherViewOpen) pollTeacherDashboardSnapshots();
  });

  // Toggle Low-Bandwidth Teacher Dashboard
  els.toggleTeacherDashboardBtn.addEventListener('click', () => {
    state.teacherViewOpen = !state.teacherViewOpen;
    els.teacherDashboard.hidden = !state.teacherViewOpen;
    els.toggleTeacherDashboardBtn.setAttribute('aria-expanded', String(state.teacherViewOpen));
    if (state.teacherViewOpen) {
      // Ensure current session is also visible in classroom demo if not joined yet
      if (state.mode !== 'instructor') {
        els.modeInstructorBtn.click();
      }
      sendTerminalSnapshotIfNeeded();
      setTimeout(() => pollTeacherDashboardSnapshots(), 200);
    }
  });

  els.teacherPauseAllBtn.addEventListener('click', () => sendTeacherClassroomControl('pause'));
  els.teacherResumeAllBtn.addEventListener('click', () => sendTeacherClassroomControl('resume'));

  els.teacherOverrideForm.addEventListener('submit', async event => {
    event.preventDefault();
    const cmd = els.teacherOverrideInput.value.trim();
    if (!cmd) return;
    await sendTeacherClassroomControl('override-command', { command: cmd });
    els.teacherOverrideInput.value = '';
  });

  els.reconnectBtn.addEventListener('click', () => {
    connectWebSocket();
  });

  // 5-second Low-Bandwidth 10% JPEG snapshot interval
  state.snapshotIntervalId = setInterval(() => {
    sendTerminalSnapshotIfNeeded();
    if (state.teacherViewOpen) {
      pollTeacherDashboardSnapshots();
    }
  }, 5000);

  // 1-second countdown display for the 5-minute container inactivity reaper
  setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - state.lastActivityTs) / 1000);
    const remaining = Math.max(0, state.inactivityLimitSec - elapsedSec);
    const mins = Math.floor(remaining / 60);
    const secs = String(remaining % 60).padStart(2, '0');
    els.inactivityTimerBadge.textContent = `Idle limit: ${mins}:${secs}`;
  }, 1000);
}

// Initialize when loaded in browser
if (typeof window !== 'undefined' && els.terminalContainer) {
  initTerminal();
  bindEvents();
  connectWebSocket();
}
