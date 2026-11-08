// Simulated desktop: the default lab environment. A small Linux-style desktop
// with a Terminal, a Files window, a Text Editor and the Lab Console (the lab's
// own settings and test). Learners do the work themselves — type commands, open
// files, edit the program, apply settings — and every result comes from the
// existing simulation engines through the callbacks the guide passes in.
// Windows are plain DOM panels; nothing here runs real software.
import {createLabShell, labFiles, SHELL_USER, SHELL_HOST} from './lab-shell.js?release=20261107-tech-team';
import {supportsCodingLab} from './coding-lab.js?release=20261107-tech-team';
import {registerLabEnvironment} from './lab-environment.js?release=20261107-tech-team';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const DESKTOP_APPS = Object.freeze([
  Object.freeze({id:'terminal', title:'Terminal', hint:'Type commands', icon:'<rect x="4" y="7" width="32" height="26" rx="3" fill="#0b1c2a" stroke="#8febd8" stroke-width="2"/><path d="M10 15l6 5-6 5M18 25h10" stroke="#8febd8" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'}),
  Object.freeze({id:'files', title:'Files', hint:'Lab folder', icon:'<path d="M4 11a3 3 0 0 1 3-3h9l3 3h14a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#f3ce85"/><path d="M4 16h32v15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#e0b25d"/>'}),
  Object.freeze({id:'editor', title:'Text Editor', hint:'Edit files', icon:'<rect x="7" y="4" width="26" height="32" rx="3" fill="#f6f7f3" stroke="#60778a" stroke-width="2"/><path d="M12 12h16M12 18h16M12 24h10" stroke="#3c5668" stroke-width="2.4" stroke-linecap="round"/>'}),
  Object.freeze({id:'console', title:'Lab Console', hint:'Settings & test', icon:'<rect x="4" y="6" width="32" height="22" rx="3" fill="#143442" stroke="#67e0c9" stroke-width="2"/><path d="M14 33h12M20 28v5" stroke="#67e0c9" stroke-width="2.4" stroke-linecap="round"/><path d="M10 13h8M10 18h14M10 23h11" stroke="#8febd8" stroke-width="2" stroke-linecap="round"/>'})
]);
const icon = app => '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">' + app.icon + '</svg>';

export function renderLabDesktop(scenario) {
  return '<div class="lab-desktop" data-lab-desktop><div class="desktop-surface" data-desktop-surface><div class="desktop-icons" role="group" aria-label="Desktop applications">' + DESKTOP_APPS.map(app => '<button type="button" class="desktop-icon" data-desktop-open="' + app.id + '" title="' + esc(app.hint) + '">' + icon(app) + '<span>' + esc(app.title) + '</span></button>').join('') + '</div><div class="desktop-windows" data-desktop-windows></div><p class="desktop-brand" aria-hidden="true">lab‑pc <b>practice</b></p></div><div class="desktop-taskbar"><button type="button" class="taskbar-menu" data-desktop-menu aria-expanded="false" aria-controls="desktop-menu">☰ <span>Menu</span></button><div id="desktop-menu" class="desktop-menu" hidden>' + DESKTOP_APPS.map(app => '<button type="button" data-desktop-open="' + app.id + '">' + icon(app) + esc(app.title) + '<small>' + esc(app.hint) + '</small></button>').join('') + '</div><div class="taskbar-tasks" data-desktop-tasks role="group" aria-label="Open windows"></div><span class="taskbar-status"><span data-desktop-user>' + esc(SHELL_USER) + '@' + esc(SHELL_HOST) + '</span><time data-desktop-clock></time></span></div></div>';
}

export function mountLabDesktop(root, {scenario, record, getState, action, renderConsole, onActivity = () => {}, showNotice = () => {}}) {
  const controller = new AbortController(), signal = controller.signal, $ = selector => root.querySelector(selector);
  const listen = (node, event, handler, options = {}) => node?.addEventListener(event, handler, {...options, signal});
  const surface = $('[data-desktop-surface]'), windowsHost = $('[data-desktop-windows]'), tasks = $('[data-desktop-tasks]');
  const coding = supportsCodingLab(scenario.id);
  const shell = createLabShell(scenario, {getState, action});
  const windows = new Map();
  let zIndex = 10, cascade = 0, editorPath = null, editorDirty = false, consoleRoot = null;
  const clock = () => {const node = $('[data-desktop-clock]'); if (node) node.textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});};
  clock(); const ticker = setInterval(clock, 30000);

  // Keep a window inside the desktop surface whatever its default size.
  function clamp(node) {const host = windowsHost.getBoundingClientRect(); if (!host.width) return; const width = node.offsetWidth || 0; node.style.left = Math.max(8, Math.min(parseFloat(node.style.left) || 0, host.width - width - 8)) + 'px'; node.style.top = Math.max(0, Math.min(parseFloat(node.style.top) || 0, Math.max(0, host.height - 120))) + 'px';}
  function focusWindow(win) {for (const other of windows.values()) other.node.classList.toggle('is-active', other === win); win.node.style.zIndex = String(++zIndex); updateTasks();}
  function updateTasks() {
    tasks.innerHTML = [...windows.values()].map(win => '<button type="button" data-desktop-task="' + win.app.id + '" aria-pressed="' + (win.node.classList.contains('is-active') && !win.node.hidden) + '">' + icon(win.app) + '<span>' + esc(win.app.title) + '</span></button>').join('');
  }
  function createWindow(app) {
    const node = document.createElement('section');
    node.className = 'desk-window'; node.dataset.app = app.id; node.setAttribute('role', 'region'); node.setAttribute('aria-label', app.title + ' window'); node.tabIndex = -1;
    const offset = (cascade++ % 5) * 28;
    node.style.left = (124 + offset) + 'px'; node.style.top = (12 + offset) + 'px';
    node.innerHTML = '<header class="desk-titlebar" data-desk-drag><span class="desk-title">' + icon(app) + esc(app.title) + '</span><span class="desk-controls"><button type="button" data-desk-minimize aria-label="Minimize ' + esc(app.title) + '">–</button><button type="button" data-desk-close aria-label="Close ' + esc(app.title) + '">×</button></span></header><div class="desk-body" data-desk-body></div>';
    windowsHost.appendChild(node);
    const win = {app, node, body:node.querySelector('[data-desk-body]')};
    windows.set(app.id, win);
    fill(win);
    clamp(node);
    return win;
  }
  function fill(win) {
    const body = win.body;
    if (win.app.id === 'terminal') {
      body.innerHTML = '<div class="term-output" data-term-output role="log" aria-live="polite" aria-label="Terminal output" tabindex="0"><div class="term-line term-info">Practice terminal on ' + esc(SHELL_HOST) + '. Type <b>help</b> to list commands. No real system is connected.</div></div><form class="term-form" data-term-form><label class="sr-only" for="desk-term-input">Terminal command</label><span class="term-prompt" data-term-prompt>' + esc(shell.prompt()) + '</span><input id="desk-term-input" data-term-input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="240" aria-describedby="desk-term-help"><span id="desk-term-help" class="sr-only">Press Enter to run. Up and Down arrows recall earlier commands.</span></form>';
      let recall = 0;
      const output = body.querySelector('[data-term-output]'), input = body.querySelector('[data-term-input]');
      const print = (text, kind = 'info') => {if (!text) return; const line = document.createElement('pre'); line.className = 'term-line term-' + kind; line.textContent = text; output.appendChild(line); while (output.children.length > 400) output.firstChild.remove(); output.scrollTop = output.scrollHeight;};
      listen(body.querySelector('[data-term-form]'), 'submit', event => {
        event.preventDefault();
        const line = input.value; input.value = ''; recall = shell.history().length + 1;
        const echo = document.createElement('div'); echo.className = 'term-line term-command'; echo.textContent = shell.prompt() + ' ' + line; output.appendChild(echo);
        const result = shell.run(line);
        if (result.clear) {output.replaceChildren();} else print(result.output, result.kind);
        body.querySelector('[data-term-prompt]').textContent = shell.prompt();
        if (result.open) open(result.open.app, result.open);
        onActivity({type:'terminal', command:line, tool:result.tool === true});
        output.scrollTop = output.scrollHeight;
      });
      listen(input, 'keydown', event => {
        const history = shell.history(); if (!history.length) return;
        if (event.key === 'ArrowUp') {event.preventDefault(); recall = Math.max(0, Math.min(recall, history.length) - 1); input.value = history[recall] ?? '';}
        if (event.key === 'ArrowDown') {event.preventDefault(); recall = Math.min(history.length, recall + 1); input.value = history[recall] ?? '';}
      });
      win.focusTarget = input;
    } else if (win.app.id === 'files') {
      renderFiles(win);
      win.focusTarget = body.querySelector('button');
    } else if (win.app.id === 'editor') {
      body.innerHTML = '<div class="editor-bar"><span class="editor-file" data-editor-file>No file open</span><span class="editor-actions"><button type="button" class="lab-tool" data-editor-save disabled>Save</button>' + (coding ? '<button type="button" class="lab-tool" data-editor-run disabled>Run all fixtures</button>' : '') + '</span></div><label class="sr-only" for="desk-editor-text">File contents</label><textarea id="desk-editor-text" class="editor-text" data-editor-text spellcheck="false" autocapitalize="off" autocomplete="off" maxlength="4000" readonly placeholder="Open a file from Files, or type nano program.py in the Terminal."></textarea><p class="editor-status" data-editor-status role="status">Open a file to begin.</p>';
      const text = body.querySelector('[data-editor-text]');
      listen(text, 'input', () => {if (!editorPath) return; editorDirty = true; body.querySelector('[data-editor-status]').textContent = 'Unsaved changes. Save to update ' + editorPath.slice(editorPath.lastIndexOf('/') + 1) + '.'; onActivity({type:'editor-input'});});
      listen(body.querySelector('[data-editor-save]'), 'click', () => saveEditor(win));
      listen(body.querySelector('[data-editor-run]'), 'click', () => {if (editorDirty && !saveEditor(win)) return; const result = action('run-check'); body.querySelector('[data-editor-status]').textContent = result.message; onActivity({type:'run'});});
      if (editorPath) loadEditor(win, editorPath);
      win.focusTarget = text;
    } else if (win.app.id === 'console') {
      body.innerHTML = '<div id="workspace" class="workspace desk-console" data-desk-console></div>';
      consoleRoot = body.querySelector('[data-desk-console]');
      renderConsole(consoleRoot);
      win.focusTarget = consoleRoot.querySelector('button, select, textarea, input') || consoleRoot;
    }
  }
  function renderFiles(win) {
    const files = [...shell.files().values()], groups = [['Lab folder', files.filter(file => !file.path.includes('/resources/'))], ['resources', files.filter(file => file.path.includes('/resources/'))]];
    win.body.innerHTML = '<p class="files-path">/home/student/lab</p>' + groups.map(([title, items]) => items.length ? '<h3>' + esc(title) + '</h3><ul class="files-list">' + items.map(file => '<li><button type="button" data-file-open="' + esc(file.path) + '"><span class="file-icon ' + (file.writable ? 'is-editable' : '') + '" aria-hidden="true"></span><span>' + esc(file.name) + '</span><small>' + (file.writable ? 'editable' : 'read-only') + '</small></button></li>').join('') + '</ul>' : '').join('') + '<p class="panel-help">Open a file to read it in the Text Editor. ' + (coding ? 'The program file is the one you edit and run.' : 'Settings change in the Lab Console; the terminal shows the lab tools.') + '</p>';
  }
  function loadEditor(win, path) {
    const file = shell.files().get(path);
    if (!file) return;
    editorPath = path; editorDirty = false;
    const text = win.body.querySelector('[data-editor-text]');
    text.value = file.content; text.readOnly = !file.writable;
    win.body.querySelector('[data-editor-file]').textContent = file.name + (file.writable ? '' : ' (read-only)');
    win.body.querySelector('[data-editor-save]').disabled = !file.writable;
    const run = win.body.querySelector('[data-editor-run]'); if (run) run.disabled = !file.writable;
    win.body.querySelector('[data-editor-status]').textContent = file.writable ? 'Edit the program, then Save. Run all fixtures tests the saved program with every input.' : 'Read-only lab file.';
  }
  function saveEditor(win) {
    const file = editorPath ? shell.files().get(editorPath) : null;
    if (!file?.writable) return false;
    const result = action('save-code', {code:win.body.querySelector('[data-editor-text]').value});
    win.body.querySelector('[data-editor-status]').textContent = result.message;
    if (result.kind === 'warning') return false;
    editorDirty = false; onActivity({type:'save'});
    return true;
  }
  function open(appId, options = {}) {
    const app = DESKTOP_APPS.find(item => item.id === appId); if (!app) return null;
    const win = windows.get(appId) || createWindow(app);
    win.node.hidden = false;
    if (appId === 'editor' && options.path) loadEditor(win, options.path);
    if (appId === 'files') renderFiles(win);
    focusWindow(win);
    (win.focusTarget || win.node).focus?.({preventScroll:true});
    $('#desktop-menu').hidden = true; $('[data-desktop-menu]').setAttribute('aria-expanded', 'false');
    return win;
  }
  function close(appId) {const win = windows.get(appId); if (!win) return; if (appId === 'console' && consoleRoot) {consoleRoot = null;} win.node.remove(); windows.delete(appId); updateTasks();}
  function refresh() {
    if (consoleRoot && windows.get('console') && !windows.get('console').node.hidden) renderConsole(consoleRoot);
    const files = windows.get('files'); if (files && !files.node.hidden) renderFiles(files);
    const editor = windows.get('editor');
    if (editor && editorPath && !editorDirty) {const file = shell.files().get(editorPath); const text = editor.body.querySelector('[data-editor-text]'); if (file && text && text.value !== file.content) text.value = file.content; if (!file) {editorPath = null; text.value = ''; editor.body.querySelector('[data-editor-file]').textContent = 'No file open';}}
    const terminal = windows.get('terminal'); if (terminal) terminal.body.querySelector('[data-term-prompt]').textContent = shell.prompt();
  }
  // Pointer events: open from icons, menu and taskbar; window controls; drag by the title bar.
  listen(root, 'click', event => {
    const opener = event.target.closest?.('[data-desktop-open]'); if (opener) {open(opener.dataset.desktopOpen); return;}
    const task = event.target.closest?.('[data-desktop-task]'); if (task) {const win = windows.get(task.dataset.desktopTask); if (!win) return; if (win.node.hidden || !win.node.classList.contains('is-active')) {win.node.hidden = false; focusWindow(win);} else {win.node.hidden = true; updateTasks();} return;}
    const menu = event.target.closest?.('[data-desktop-menu]'); if (menu) {const panel = $('#desktop-menu'); panel.hidden = !panel.hidden; menu.setAttribute('aria-expanded', String(!panel.hidden)); return;}
    const fileButton = event.target.closest?.('[data-file-open]'); if (fileButton) {open('editor', {path:fileButton.dataset.fileOpen}); return;}
    const win = event.target.closest?.('.desk-window');
    if (win) {const entry = windows.get(win.dataset.app); if (event.target.closest('[data-desk-close]')) close(win.dataset.app); else if (event.target.closest('[data-desk-minimize]')) {win.hidden = true; updateTasks();} else if (entry) focusWindow(entry); return;}
    if (!event.target.closest?.('#desktop-menu')) {$('#desktop-menu').hidden = true; $('[data-desktop-menu]').setAttribute('aria-expanded', 'false');}
  });
  listen(root, 'keydown', event => {if (event.key === 'Escape') {const panel = $('#desktop-menu'); if (panel && !panel.hidden) {panel.hidden = true; $('[data-desktop-menu]').setAttribute('aria-expanded', 'false');}}});
  let drag = null;
  listen(root, 'pointerdown', event => {
    const bar = event.target.closest?.('[data-desk-drag]'); if (!bar || event.target.closest('button') || window.matchMedia?.('(max-width: 760px)').matches) return;
    const win = bar.closest('.desk-window'), rect = win.getBoundingClientRect(), host = windowsHost.getBoundingClientRect();
    drag = {win, dx:event.clientX - rect.left, dy:event.clientY - rect.top, host};
    win.setPointerCapture?.(event.pointerId); event.preventDefault();
  });
  listen(root, 'pointermove', event => {if (!drag) return; const x = Math.max(0, Math.min(drag.host.width - 120, event.clientX - drag.host.left - drag.dx)), y = Math.max(0, Math.min(drag.host.height - 40, event.clientY - drag.host.top - drag.dy)); drag.win.style.left = x + 'px'; drag.win.style.top = y + 'px';});
  listen(root, 'pointerup', () => {drag = null;}); listen(root, 'pointercancel', () => {drag = null;});
  return {refresh, open, close, dispose() {controller.abort(); clearInterval(ticker); windows.clear();}, hasUnsavedDraft:() => editorDirty, shell};
}

registerLabEnvironment({
  id:'simulated-desktop', label:'Simulated desktop · runs in your browser',
  render:(scenario) => renderLabDesktop(scenario),
  mount:(root, context) => mountLabDesktop(root, context)
});
