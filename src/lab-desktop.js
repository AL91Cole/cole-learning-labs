// Simulated desktop: the default lab environment. A Lubuntu-style desktop with
// a panel (app menu, quick launchers, open windows, system tray and clock),
// desktop icons, and movable, resizable windows: Terminal, Files, Text Editor
// and the Lab Console (the lab's own settings and test). Learners do the work
// themselves — type commands, browse and edit files, apply settings — and every
// result comes from the existing simulation engines through the callbacks the
// guide passes in. Windows are plain DOM panels; nothing here runs real
// software.
import {createLabShell, SHELL_USER, SHELL_HOST, HOME, LAB_DIR, OS_NAME} from './lab-shell.js?release=20261107-tech-team';
import {supportsCodingLab} from './coding-lab.js?release=20261107-tech-team';
import {registerLabEnvironment} from './lab-environment.js?release=20261107-tech-team';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const ICONS = Object.freeze({
  terminal:'<rect x="4" y="7" width="32" height="26" rx="3" fill="#2b2f36" stroke="#8d96a3" stroke-width="1.5"/><rect x="4" y="7" width="32" height="6" rx="3" fill="#4a515c"/><path d="M10 19l6 5-6 5M18 29h10" stroke="#9ef2b8" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  files:'<path d="M4 11a3 3 0 0 1 3-3h9l3 3h14a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#e8b85c"/><path d="M4 16h32v15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#f3ce85"/>',
  editor:'<rect x="7" y="4" width="26" height="32" rx="3" fill="#f6f7f3" stroke="#60778a" stroke-width="1.5"/><path d="M12 12h16M12 18h16M12 24h10" stroke="#3c5668" stroke-width="2.4" stroke-linecap="round"/><path d="M26 27l6-6 2 2-6 6-3 1z" fill="#2f7fd6"/>',
  console:'<rect x="4" y="6" width="32" height="22" rx="3" fill="#143442" stroke="#67e0c9" stroke-width="1.5"/><path d="M14 34h12M20 28v6" stroke="#67e0c9" stroke-width="2.4" stroke-linecap="round"/><path d="M10 13h8M10 18h14M10 23h11" stroke="#8febd8" stroke-width="2" stroke-linecap="round"/>',
  computer:'<rect x="5" y="6" width="30" height="20" rx="2" fill="#2f7fd6"/><rect x="8" y="9" width="24" height="14" fill="#dbe9fb"/><path d="M14 34h12M20 26v8" stroke="#8d96a3" stroke-width="2.4" stroke-linecap="round"/>',
  home:'<path d="M20 5l16 13h-4v16H8V18H4z" fill="#e3ecf3" stroke="#60778a" stroke-width="1.5" stroke-linejoin="round"/><rect x="16" y="22" width="8" height="12" fill="#2f7fd6"/>',
  trash:'<path d="M9 11h22l-2 24H11z" fill="#9aa5b1"/><rect x="7" y="7" width="26" height="4" rx="1" fill="#6f7a86"/><path d="M15 15v16M20 15v16M25 15v16" stroke="#e3ecf3" stroke-width="2" stroke-linecap="round"/>',
  lab:'<path d="M4 11a3 3 0 0 1 3-3h9l3 3h14a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#2f8a76"/><path d="M4 16h32v15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#58cdb4"/><path d="M14 27h12M20 21v12" stroke="#0b1c2a" stroke-width="2.4" stroke-linecap="round"/>',
  network:'<rect x="6" y="6" width="10" height="8" rx="1.5" fill="#dbe9fb"/><rect x="24" y="6" width="10" height="8" rx="1.5" fill="#dbe9fb"/><rect x="15" y="26" width="10" height="8" rx="1.5" fill="#dbe9fb"/><path d="M11 14v6h18v-6M20 20v6" stroke="#dbe9fb" stroke-width="2" fill="none"/>',
  volume:'<path d="M8 15h6l8-6v22l-8-6H8z" fill="#dbe9fb"/><path d="M26 14a8 8 0 0 1 0 12M30 10a14 14 0 0 1 0 20" stroke="#dbe9fb" stroke-width="2" fill="none" stroke-linecap="round"/>',
  menu:'<circle cx="20" cy="20" r="15" fill="#2f7fd6"/><path d="M12 15h16M12 20h16M12 25h16" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'
});
const icon = (name, className = '') => '<svg class="' + className + '" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
export const DESKTOP_APPS = Object.freeze([
  Object.freeze({id:'terminal', title:'Terminal', hint:'Run commands', icon:'terminal'}),
  Object.freeze({id:'files', title:'Files', hint:'Browse your folders', icon:'files'}),
  Object.freeze({id:'editor', title:'Text Editor', hint:'Edit a file', icon:'editor'}),
  Object.freeze({id:'console', title:'Lab Console', hint:'Lab settings and test', icon:'console'})
]);
const TRASH = HOME + '/.local/share/Trash';
const DESKTOP_ICONS = Object.freeze([
  Object.freeze({id:'computer', title:'Computer', icon:'computer', app:'files', path:'/'}),
  Object.freeze({id:'home', title:'Home', icon:'home', app:'files', path:HOME}),
  Object.freeze({id:'lab', title:'Lab Folder', icon:'lab', app:'files', path:LAB_DIR}),
  Object.freeze({id:'terminal', title:'Terminal', icon:'terminal', app:'terminal'}),
  Object.freeze({id:'editor', title:'Text Editor', icon:'editor', app:'editor'}),
  Object.freeze({id:'console', title:'Lab Console', icon:'console', app:'console'}),
  Object.freeze({id:'trash', title:'Trash', icon:'trash', app:'files', path:TRASH})
]);
const PLACES = Object.freeze([['Home', HOME, 'home'], ['Desktop', HOME + '/Desktop', 'files'], ['Documents', HOME + '/Documents', 'files'], ['Downloads', HOME + '/Downloads', 'files'], ['Lab Folder', LAB_DIR, 'lab'], ['Computer', '/', 'computer'], ['Trash', TRASH, 'trash']]);

export function renderLabDesktop(scenario) {
  const launcher = (app) => '<button type="button" class="panel-launcher" data-desktop-open="' + app.id + '" title="' + esc(app.title) + '" aria-label="Open ' + esc(app.title) + '">' + icon(app.icon) + '</button>';
  return '<div class="lab-desktop" data-lab-desktop><div class="desktop-surface" data-desktop-surface><div class="desktop-icons" role="group" aria-label="Desktop icons">' + DESKTOP_ICONS.map(item => '<button type="button" class="desktop-icon" data-desktop-open="' + item.app + '"' + (item.path ? ' data-desktop-path="' + esc(item.path) + '"' : '') + '>' + icon(item.icon) + '<span>' + esc(item.title) + '</span></button>').join('') + '</div><div class="desktop-windows" data-desktop-windows></div><div class="desktop-toasts" data-desktop-toasts aria-live="polite"></div><p class="desktop-brand" aria-hidden="true">' + esc(OS_NAME.split(' ')[0].toLowerCase()) + '<b>linux</b><small>' + esc(OS_NAME.split(' ').slice(2).join(' ')) + '</small></p></div><div class="desktop-panel"><button type="button" class="panel-menu" data-desktop-menu aria-expanded="false" aria-controls="desktop-menu" aria-label="Application menu">' + icon('menu') + '</button><div id="desktop-menu" class="desktop-menu" hidden><p class="desktop-menu-title">' + esc(SHELL_USER) + ' on ' + esc(SHELL_HOST) + '</p>' + DESKTOP_APPS.map(app => '<button type="button" data-desktop-open="' + app.id + '">' + icon(app.icon) + '<span>' + esc(app.title) + '<small>' + esc(app.hint) + '</small></span></button>').join('') + '<p class="desktop-menu-foot">' + esc(OS_NAME) + ' · simulated</p></div><div class="panel-launchers">' + DESKTOP_APPS.slice(0, 3).map(launcher).join('') + '</div><div class="panel-tasks" data-desktop-tasks role="group" aria-label="Open windows"></div><div class="panel-tray"><span class="tray-item" data-tray-network title="Lab network (simulated)">' + icon('network') + '</span><span class="tray-item" title="Volume (simulated)">' + icon('volume') + '</span><button type="button" class="tray-clock" data-desktop-clock-button title="Calendar"><time data-desktop-clock></time><small data-desktop-date></small></button></div></div></div>';
}

export function mountLabDesktop(root, {scenario, record, getState, action, renderConsole, onActivity = () => {}, showNotice = () => {}}) {
  const controller = new AbortController(), signal = controller.signal, $ = selector => root.querySelector(selector);
  const listen = (node, event, handler, options = {}) => node?.addEventListener(event, handler, {...options, signal});
  const windowsHost = $('[data-desktop-windows]'), tasks = $('[data-desktop-tasks]'), toasts = $('[data-desktop-toasts]');
  const coding = supportsCodingLab(scenario.id);
  const shell = createLabShell(scenario, {getState, action});
  const windows = new Map();
  let zIndex = 10, cascade = 0, editorPath = null, editorDirty = false, consoleRoot = null, filesPath = LAB_DIR;
  const narrow = () => window.matchMedia?.('(max-width: 760px)').matches === true;
  const clock = () => {const now = new Date(), time = $('[data-desktop-clock]'), date = $('[data-desktop-date]'); if (time) time.textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); if (date) date.textContent = now.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'});};
  clock(); const ticker = setInterval(clock, 30000);

  function focusWindow(win) {for (const other of windows.values()) other.node.classList.toggle('is-active', other === win); win.node.style.zIndex = String(++zIndex); updateTasks();}
  function updateTasks() {
    tasks.innerHTML = [...windows.values()].map(win => '<button type="button" data-desktop-task="' + win.app.id + '" aria-pressed="' + (win.node.classList.contains('is-active') && !win.node.hidden) + '"' + (win.node.hidden ? ' class="is-minimized"' : '') + '>' + icon(win.app.icon) + '<span>' + esc(win.title || win.app.title) + '</span></button>').join('');
  }
  function clamp(node) {const host = windowsHost.getBoundingClientRect(); if (!host.width || node.classList.contains('is-maximized')) return; const width = node.offsetWidth || 0; node.style.left = Math.max(8, Math.min(parseFloat(node.style.left) || 0, host.width - width - 8)) + 'px'; node.style.top = Math.max(0, Math.min(parseFloat(node.style.top) || 0, Math.max(0, host.height - 120))) + 'px';}
  function setTitle(win, title) {win.title = title; win.node.querySelector('[data-desk-title]').textContent = title; win.node.setAttribute('aria-label', title + ' window'); updateTasks();}
  function createWindow(app) {
    const node = document.createElement('section');
    node.className = 'desk-window'; node.dataset.app = app.id; node.setAttribute('role', 'region'); node.setAttribute('aria-label', app.title + ' window'); node.tabIndex = -1;
    const offset = (cascade++ % 5) * 28;
    node.style.left = (136 + offset) + 'px'; node.style.top = (12 + offset) + 'px';
    node.innerHTML = '<header class="desk-titlebar" data-desk-drag>' + icon(app.icon, 'desk-title-icon') + '<span class="desk-title" data-desk-title>' + esc(app.title) + '</span><span class="desk-controls"><button type="button" data-desk-minimize aria-label="Minimize ' + esc(app.title) + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 9h8" stroke="currentColor" stroke-width="1.6"/></svg></button><button type="button" data-desk-maximize aria-label="Maximize ' + esc(app.title) + '"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button><button type="button" data-desk-close aria-label="Close ' + esc(app.title) + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.6"/></svg></button></span></header><div class="desk-body" data-desk-body></div><span class="desk-resize" data-desk-resize aria-hidden="true"></span>';
    windowsHost.appendChild(node);
    const win = {app, node, body:node.querySelector('[data-desk-body]'), title:app.title};
    windows.set(app.id, win);
    fill(win);
    clamp(node);
    return win;
  }
  const promptHTML = () => {const text = shell.prompt(), at = text.indexOf(':'); return '<b class="term-user">' + esc(text.slice(0, at)) + '</b>:<b class="term-path">' + esc(text.slice(at + 1, -1)) + '</b>$';};
  function fill(win) {
    const body = win.body;
    if (win.app.id === 'terminal') {
      body.innerHTML = '<div class="term-output" data-term-output role="log" aria-live="polite" aria-label="Terminal output" tabindex="0"><pre class="term-line term-info">Welcome to ' + esc(OS_NAME) + ' (' + esc(SHELL_HOST) + ')\n\n * This is a practice machine. Nothing here is connected to a real system.\n * Type help to list commands. Tab completes names. Ctrl+L clears the screen.\n\nLast login: ' + esc(new Date().toDateString()) + ' on tty1</pre></div><form class="term-form" data-term-form><label class="sr-only" for="desk-term-input">Terminal command</label><span class="term-prompt" data-term-prompt>' + promptHTML() + '</span><input id="desk-term-input" data-term-input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="240" aria-describedby="desk-term-help"><span id="desk-term-help" class="sr-only">Press Enter to run. Up and Down arrows recall earlier commands. Tab completes names.</span></form>';
      let recall = 0;
      const output = body.querySelector('[data-term-output]'), input = body.querySelector('[data-term-input]');
      const print = (text, kind = 'info') => {if (!text) return; const line = document.createElement('pre'); line.className = 'term-line term-' + kind; line.textContent = text; output.appendChild(line); while (output.children.length > 400) output.firstChild.remove(); output.scrollTop = output.scrollHeight;};
      const printListing = entries => {const line = document.createElement('pre'); line.className = 'term-line term-info'; for (const [index, entry] of entries.entries()) {const span = document.createElement('span'); span.textContent = entry + (index < entries.length - 1 ? '  ' : ''); if (entry.endsWith('/')) span.className = 'term-dir'; else if (/^(check|program\.(js|py))$/.test(entry)) span.className = 'term-exec'; line.appendChild(span);} output.appendChild(line); output.scrollTop = output.scrollHeight;};
      const submit = line => {
        recall = shell.history().length + 1;
        const echo = document.createElement('div'); echo.className = 'term-line term-command'; echo.innerHTML = promptHTML() + ' ' + esc(line); output.appendChild(echo);
        const result = shell.run(line);
        if (result.clear) output.replaceChildren(); else if (result.entries && result.kind === 'info') printListing(result.entries); else print(result.output, result.kind);
        body.querySelector('[data-term-prompt]').innerHTML = promptHTML();
        if (result.open) open(result.open.app, result.open);
        if (result.exit) {close('terminal'); return;}
        onActivity({type:'terminal', command:line, tool:result.tool === true});
        output.scrollTop = output.scrollHeight;
      };
      listen(body.querySelector('[data-term-form]'), 'submit', event => {event.preventDefault(); const line = input.value; input.value = ''; submit(line);});
      listen(input, 'keydown', event => {
        if (event.key === 'Tab') {event.preventDefault(); const options = shell.complete(input.value); if (options.length === 1) input.value = options[0] + (options[0].endsWith('/') ? '' : ' '); else if (options.length > 1) {const common = options.reduce((acc, item) => {let index = 0; while (index < acc.length && acc[index] === item[index]) index++; return acc.slice(0, index);}); if (common.length > input.value.length) input.value = common; else print(options.map(option => option.split(' ').at(-1)).join('  '));} return;}
        if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {event.preventDefault(); output.replaceChildren(); return;}
        if (event.ctrlKey && (event.key === 'c' || event.key === 'C')) {event.preventDefault(); const echo = document.createElement('div'); echo.className = 'term-line term-command'; echo.innerHTML = promptHTML() + ' ' + esc(input.value) + '^C'; output.appendChild(echo); input.value = ''; return;}
        const history = shell.history(); if (!history.length) return;
        if (event.key === 'ArrowUp') {event.preventDefault(); recall = Math.max(0, Math.min(recall, history.length) - 1); input.value = history[recall] ?? '';}
        if (event.key === 'ArrowDown') {event.preventDefault(); recall = Math.min(history.length, recall + 1); input.value = history[recall] ?? '';}
      });
      listen(output, 'click', () => input.focus({preventScroll:true}));
      win.focusTarget = input;
    } else if (win.app.id === 'files') {
      renderFiles(win);
    } else if (win.app.id === 'editor') {
      body.innerHTML = '<div class="editor-menubar" role="toolbar" aria-label="Text Editor menu"><button type="button" class="editor-menu-item" data-editor-save disabled>Save</button>' + (coding ? '<button type="button" class="editor-menu-item" data-editor-run disabled>Run all fixtures</button>' : '') + '<button type="button" class="editor-menu-item" data-editor-close>Close file</button><span class="editor-file" data-editor-file>No file open</span></div><div class="editor-area"><pre class="editor-gutter" data-editor-gutter aria-hidden="true">1</pre><label class="sr-only" for="desk-editor-text">File contents</label><textarea id="desk-editor-text" class="editor-text" data-editor-text spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" maxlength="4000" readonly placeholder="Open a file from Files, or type nano program.py in the Terminal."></textarea></div><p class="editor-status" data-editor-status role="status"><span data-editor-message>Open a file to begin.</span><span data-editor-position>Ln 1, Col 1</span></p>';
      const text = body.querySelector('[data-editor-text]'), gutter = body.querySelector('[data-editor-gutter]');
      const position = () => {const before = text.value.slice(0, text.selectionStart ?? 0), lines = before.split('\n'); body.querySelector('[data-editor-position]').textContent = 'Ln ' + lines.length + ', Col ' + (lines.at(-1).length + 1) + (editorPath ? ' · ' + (editorPath.endsWith('.py') ? 'Python' : editorPath.endsWith('.js') ? 'JavaScript' : 'Plain text') : '');};
      const lineNumbers = () => {const count = Math.max(1, text.value.split('\n').length); gutter.textContent = Array.from({length:count}, (_, index) => index + 1).join('\n'); gutter.scrollTop = text.scrollTop;};
      listen(text, 'input', () => {lineNumbers(); position(); if (!editorPath) return; editorDirty = true; body.querySelector('[data-editor-message]').textContent = 'Unsaved changes'; setTitle(win, '*' + editorPath.slice(editorPath.lastIndexOf('/') + 1) + ' — Text Editor'); onActivity({type:'editor-input'});});
      listen(text, 'scroll', () => {gutter.scrollTop = text.scrollTop;});
      listen(text, 'keyup', position); listen(text, 'click', position);
      listen(text, 'keydown', event => {if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {event.preventDefault(); saveEditor(win);} if (event.key === 'Tab' && !text.readOnly) {event.preventDefault(); const start = text.selectionStart, end = text.selectionEnd; text.value = text.value.slice(0, start) + '  ' + text.value.slice(end); text.selectionStart = text.selectionEnd = start + 2; text.dispatchEvent(new Event('input', {bubbles:true}));}});
      listen(body.querySelector('[data-editor-save]'), 'click', () => saveEditor(win));
      listen(body.querySelector('[data-editor-run]'), 'click', () => {if (editorDirty && !saveEditor(win)) return; const result = action('run-check'); body.querySelector('[data-editor-message]').textContent = result.message; onActivity({type:'run'});});
      listen(body.querySelector('[data-editor-close]'), 'click', () => {editorPath = null; editorDirty = false; text.value = ''; text.readOnly = true; body.querySelector('[data-editor-file]').textContent = 'No file open'; body.querySelector('[data-editor-save]').disabled = true; const run = body.querySelector('[data-editor-run]'); if (run) run.disabled = true; body.querySelector('[data-editor-message]').textContent = 'Open a file to begin.'; setTitle(win, 'Text Editor'); lineNumbers(); position();});
      win.lineNumbers = lineNumbers; win.position = position;
      if (editorPath) loadEditor(win, editorPath);
      win.focusTarget = text;
    } else if (win.app.id === 'console') {
      body.innerHTML = '<div id="workspace" class="workspace desk-console" data-desk-console></div>';
      consoleRoot = body.querySelector('[data-desk-console]');
      renderConsole(consoleRoot);
      win.focusTarget = consoleRoot.querySelector('button, select, textarea, input') || consoleRoot;
    }
  }
  function renderFiles(win, path = filesPath) {
    filesPath = shell.isDir(path) || path === TRASH ? path : LAB_DIR;
    const entries = path === TRASH ? [] : shell.children(filesPath), crumbs = filesPath === '/' ? [''] : filesPath.split('/');
    const crumbHTML = crumbs.map((part, index) => {const target = index === 0 ? '/' : crumbs.slice(0, index + 1).join('/'); return '<button type="button" class="files-crumb" data-files-go="' + esc(target) + '"' + (index === crumbs.length - 1 ? ' aria-current="location"' : '') + '>' + esc(index === 0 ? 'Computer' : part) + '</button>';}).join('<span aria-hidden="true">›</span>');
    win.body.innerHTML = '<div class="files-toolbar"><button type="button" class="files-nav" data-files-go="' + esc(filesPath === '/' ? '/' : filesPath.slice(0, filesPath.lastIndexOf('/')) || '/') + '" aria-label="Up one folder">↑</button><button type="button" class="files-nav" data-files-go="' + esc(HOME) + '" aria-label="Home folder">⌂</button><nav class="files-crumbs" aria-label="Location">' + crumbHTML + '</nav></div><div class="files-layout"><aside class="files-places" aria-label="Places">' + PLACES.map(([title, target, name]) => '<button type="button" data-files-go="' + esc(target) + '"' + (target === filesPath ? ' aria-current="location"' : '') + '>' + icon(name) + esc(title) + '</button>').join('') + '</aside><div class="files-grid" role="list">' + (entries.length ? entries.map(entry => entry.dir ? '<button type="button" role="listitem" class="files-item" data-files-go="' + esc((filesPath === '/' ? '' : filesPath) + '/' + entry.name) + '">' + icon(entry.name === 'lab' ? 'lab' : 'files') + '<span>' + esc(entry.name) + '</span><small>folder</small></button>' : '<button type="button" role="listitem" class="files-item" data-file-open="' + esc(entry.file.path) + '"><span class="file-icon ' + (entry.file.writable ? 'is-editable' : '') + (/^(check)$/.test(entry.name) ? ' is-script' : '') + '" aria-hidden="true"></span><span>' + esc(entry.name) + '</span><small>' + (entry.file.user ? 'your file' : entry.file.writable ? 'editable' : 'read-only') + '</small></button>').join('') : '<p class="files-empty">This folder is empty.' + (filesPath === TRASH ? ' Removed files do not keep a copy in this practice session.' : '') + '</p>') + '</div></div><p class="files-status">' + entries.length + ' item' + (entries.length === 1 ? '' : 's') + ' · ' + esc(filesPath) + '</p>';
    setTitle(win, (filesPath === '/' ? 'Computer' : filesPath === HOME ? 'Home' : filesPath === TRASH ? 'Trash' : filesPath.slice(filesPath.lastIndexOf('/') + 1)) + ' — Files');
    win.focusTarget = win.body.querySelector('.files-item') || win.body.querySelector('button');
  }
  function loadEditor(win, path) {
    const file = shell.files().get(path);
    if (!file) return;
    editorPath = path; editorDirty = false;
    const text = win.body.querySelector('[data-editor-text]');
    text.value = file.content; text.readOnly = !file.writable;
    win.body.querySelector('[data-editor-file]').textContent = path + (file.writable ? '' : ' (read-only)');
    win.body.querySelector('[data-editor-save]').disabled = !file.writable;
    const run = win.body.querySelector('[data-editor-run]'); if (run) run.disabled = !(file.writable && /program\.(js|py)$/.test(path));
    win.body.querySelector('[data-editor-message]').textContent = file.writable ? 'Edit, then Save (Ctrl+S).' + (/program\.(js|py)$/.test(path) ? ' Run all fixtures tests the saved program with every input.' : '') : 'Read-only file.';
    setTitle(win, file.name + ' — Text Editor'); win.lineNumbers?.(); win.position?.();
  }
  function saveEditor(win) {
    const file = editorPath ? shell.files().get(editorPath) : null;
    if (!file?.writable) return false;
    const content = win.body.querySelector('[data-editor-text]').value;
    const result = file.user ? (shell.writeFile(editorPath, content).kind === 'warning' ? {message:'Could not save ' + file.name + '.', kind:'warning'} : {message:'Saved ' + file.name + '.', kind:'info'}) : action('save-code', {code:content});
    win.body.querySelector('[data-editor-message]').textContent = result.message;
    if (result.kind === 'warning') return false;
    editorDirty = false; setTitle(win, file.name + ' — Text Editor'); onActivity({type:'save'});
    return true;
  }
  function open(appId, options = {}) {
    const app = DESKTOP_APPS.find(item => item.id === appId); if (!app) return null;
    const win = windows.get(appId) || createWindow(app);
    win.node.hidden = false;
    if (appId === 'editor' && options.path) loadEditor(win, options.path);
    if (appId === 'files') renderFiles(win, options.path || filesPath);
    focusWindow(win);
    (win.focusTarget || win.node).focus?.({preventScroll:true});
    closeMenu();
    return win;
  }
  function close(appId) {const win = windows.get(appId); if (!win) return; if (appId === 'console') consoleRoot = null; win.node.remove(); windows.delete(appId); updateTasks();}
  function closeMenu() {const panel = $('#desktop-menu'); if (panel) panel.hidden = true; $('[data-desktop-menu]')?.setAttribute('aria-expanded', 'false');}
  function toggleMaximize(win) {const maximized = win.node.classList.toggle('is-maximized'); win.node.querySelector('[data-desk-maximize]').setAttribute('aria-label', (maximized ? 'Restore ' : 'Maximize ') + win.app.title); if (!maximized) clamp(win.node);}
  function notify(text, {kind = 'info'} = {}) {
    if (!toasts || !text) return;
    const toast = document.createElement('div'); toast.className = 'desktop-toast is-' + kind; toast.innerHTML = '<strong>Lab Guide</strong><span></span>'; toast.lastChild.textContent = text; toasts.appendChild(toast);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => toast.remove(), 6000);
  }
  function refresh() {
    if (consoleRoot && windows.get('console') && !windows.get('console').node.hidden) renderConsole(consoleRoot);
    const files = windows.get('files'); if (files && !files.node.hidden) renderFiles(files);
    const editor = windows.get('editor');
    if (editor && editorPath && !editorDirty) {const file = shell.files().get(editorPath); const text = editor.body.querySelector('[data-editor-text]'); if (file && text && text.value !== file.content) {text.value = file.content; editor.lineNumbers?.();} if (!file) {editorPath = null; text.value = ''; text.readOnly = true; editor.body.querySelector('[data-editor-file]').textContent = 'No file open'; setTitle(editor, 'Text Editor');}}
    const terminal = windows.get('terminal'); if (terminal) terminal.body.querySelector('[data-term-prompt]').innerHTML = promptHTML();
    const state = getState() || {}, tray = $('[data-tray-network]'); if (tray) tray.classList.toggle('is-ok', state.tested === true && Array.isArray(state.results) && state.results.length > 0 && state.results.every(result => result.ok));
  }
  // Pointer events: open from icons, menu, launchers and tasks; window controls; drag by the title bar; resize by the corner.
  listen(root, 'click', event => {
    const opener = event.target.closest?.('[data-desktop-open]'); if (opener) {open(opener.dataset.desktopOpen, opener.dataset.desktopPath ? {path:opener.dataset.desktopPath} : {}); return;}
    const task = event.target.closest?.('[data-desktop-task]'); if (task) {const win = windows.get(task.dataset.desktopTask); if (!win) return; if (win.node.hidden || !win.node.classList.contains('is-active')) {win.node.hidden = false; focusWindow(win); (win.focusTarget || win.node).focus?.({preventScroll:true});} else {win.node.hidden = true; updateTasks();} return;}
    const menu = event.target.closest?.('[data-desktop-menu]'); if (menu) {const panel = $('#desktop-menu'); panel.hidden = !panel.hidden; menu.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) panel.querySelector('button')?.focus({preventScroll:true}); return;}
    const go = event.target.closest?.('[data-files-go]'); if (go) {const win = windows.get('files'); if (win) {renderFiles(win, go.dataset.filesGo); win.focusTarget?.focus?.({preventScroll:true});} return;}
    const fileButton = event.target.closest?.('[data-file-open]'); if (fileButton) {open('editor', {path:fileButton.dataset.fileOpen}); return;}
    if (event.target.closest?.('[data-desktop-clock-button]')) {notify(new Date().toLocaleDateString([], {weekday:'long', year:'numeric', month:'long', day:'numeric'}) + ' · ' + new Date().toLocaleTimeString()); return;}
    const win = event.target.closest?.('.desk-window');
    if (win) {const entry = windows.get(win.dataset.app); if (event.target.closest('[data-desk-close]')) close(win.dataset.app); else if (event.target.closest('[data-desk-minimize]')) {win.hidden = true; updateTasks();} else if (event.target.closest('[data-desk-maximize]')) {if (entry) toggleMaximize(entry);} else if (entry) focusWindow(entry); return;}
    if (!event.target.closest?.('#desktop-menu')) closeMenu();
  });
  listen(root, 'dblclick', event => {const bar = event.target.closest?.('[data-desk-drag]'); if (!bar || event.target.closest('button')) return; const entry = windows.get(bar.closest('.desk-window').dataset.app); if (entry) toggleMaximize(entry);});
  listen(root, 'keydown', event => {if (event.key === 'Escape') closeMenu();});
  let drag = null;
  listen(root, 'pointerdown', event => {
    const handle = event.target.closest?.('[data-desk-resize]'), bar = event.target.closest?.('[data-desk-drag]');
    if ((!handle && !bar) || event.target.closest('button') || narrow()) return;
    const win = (handle || bar).closest('.desk-window'); if (win.classList.contains('is-maximized')) return;
    const rect = win.getBoundingClientRect(), host = windowsHost.getBoundingClientRect();
    drag = handle ? {win, resize:true, startX:event.clientX, startY:event.clientY, width:rect.width, height:rect.height, host} : {win, dx:event.clientX - rect.left, dy:event.clientY - rect.top, host};
    win.setPointerCapture?.(event.pointerId); event.preventDefault();
  });
  listen(root, 'pointermove', event => {
    if (!drag) return;
    if (drag.resize) {drag.win.style.width = Math.max(320, Math.min(drag.host.width - 16, drag.width + event.clientX - drag.startX)) + 'px'; drag.win.style.height = Math.max(220, Math.min(drag.host.height - 16, drag.height + event.clientY - drag.startY)) + 'px'; return;}
    const x = Math.max(0, Math.min(drag.host.width - 120, event.clientX - drag.host.left - drag.dx)), y = Math.max(0, Math.min(drag.host.height - 40, event.clientY - drag.host.top - drag.dy));
    drag.win.style.left = x + 'px'; drag.win.style.top = y + 'px';
  });
  listen(root, 'pointerup', () => {drag = null;}); listen(root, 'pointercancel', () => {drag = null;});
  refresh();
  return {refresh, open, close, notify, dispose() {controller.abort(); clearInterval(ticker); windows.clear();}, hasUnsavedDraft:() => editorDirty, shell};
}

registerLabEnvironment({
  id:'simulated-desktop', label:'Simulated desktop · runs in your browser',
  render:(scenario) => renderLabDesktop(scenario),
  mount:(root, context) => mountLabDesktop(root, context)
});
