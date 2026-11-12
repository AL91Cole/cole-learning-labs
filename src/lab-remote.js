// Real-machine lab environment: a terminal to a real Linux container served by
// the optional terminal service (terminal-sandbox/). It registers as the
// 'remote-terminal' provider. The guide's Section 1 steps come from the
// service's own lab milestones, which the service verifies by reading files in
// the learner's container. Remote input, display traffic, session messages and
// work-check requests leave the browser; see the pre-start privacy notice. If the service's xterm.js cannot load, a plain
// text terminal takes its place so the lab still works.
import {registerLabEnvironment} from './lab-environment.js?release=20261107-tech-team';
import {LAB_ENVIRONMENT_CONFIG} from './lab-environment-config.js?release=20261107-tech-team';
import {createRemoteSession, remoteSocketUrl, remoteDesktopUrl, remoteAssetUrl} from './lab-remote-client.js?release=20261107-tech-team';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const ansi = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007|\u001b[()][A-Z0-9]/g;
export const remoteConfig = () => {const override = globalThis.COLE_LAB_REMOTE; const base = override && typeof override === 'object' ? override : LAB_ENVIRONMENT_CONFIG.remote; return {base:typeof base.base === 'string' ? base.base : '/terminal', labs:base.labs && typeof base.labs === 'object' ? base.labs : {}};};
export const remoteLabFor = scenario => {const labs = remoteConfig().labs; const id = scenario?.id; return typeof id === 'string' && Object.hasOwn(labs, id) && typeof labs[id] === 'string' ? labs[id] : null;};

// The real machines are used only once the service has answered its health
// check (status "enabled"). Until then, and whenever the service is missing or
// disabled, the guided labs keep the simulated desktop, so the configuration can
// name the service before it is deployed and nothing breaks for learners.
let serviceState = 'unknown', servicePromise = null, hostedLabs = null;
/** True when the service has not published a lab list yet, or the list includes this lab. */
export const remoteServiceHosts = labId => hostedLabs === null || hostedLabs.has(labId);
export function setRemoteHostedLabs(ids) {hostedLabs = Array.isArray(ids) ? new Set(ids.filter(id => typeof id === 'string')) : null; return hostedLabs;}
export const remoteServiceState = () => serviceState;
export const remoteServiceAvailable = () => serviceState === 'enabled';
export function setRemoteServiceState(state) {serviceState = ['unknown', 'enabled', 'unavailable'].includes(state) ? state : 'unavailable'; return serviceState;}
/** Asks the service once whether it is enabled. Resolves to the state; safe to call repeatedly. */
export function probeRemoteService({base = remoteConfig().base, fetch: fetchImpl = globalThis.fetch, timeoutMs = 5000, force = false} = {}) {
  if (servicePromise && !force) return servicePromise;
  if (typeof fetchImpl !== 'function') return Promise.resolve(setRemoteServiceState('unavailable'));
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  servicePromise = fetchImpl(remoteAssetUrl(base, 'api/health'), {method:'GET', credentials:'omit', cache:'no-store', signal:controller?.signal})
    .then(response => response.ok ? response.json() : null)
    .then(async body => {
      if (!body || body.status !== 'enabled') return setRemoteServiceState('unavailable');
      // Ask which labs this service really hosts, so a lab the site lists but the
      // server does not have yet keeps the simulated desktop instead of failing.
      try {
        const listed = await fetchImpl(remoteAssetUrl(base, 'api/labs'), {method:'GET', credentials:'omit', cache:'no-store', signal:controller?.signal});
        const labs = listed.ok ? (await listed.json())?.labs : null;
        setRemoteHostedLabs(Array.isArray(labs) ? labs.map(lab => lab?.id) : null);
      } catch {setRemoteHostedLabs(null);}
      return setRemoteServiceState('enabled');
    })
    .catch(() => setRemoteServiceState('unavailable'))
    .finally(() => clearTimeout(timer));
  return servicePromise;
}

let xtermLoading = null;
function loadXterm(base, doc) {
  if (globalThis.Terminal && globalThis.FitAddon) return Promise.resolve(true);
  if (xtermLoading) return xtermLoading;
  xtermLoading = new Promise(resolve => {
    const done = () => resolve(Boolean(globalThis.Terminal));
    const timer = setTimeout(() => resolve(false), 8000);
    const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = remoteAssetUrl(base, 'vendor/xterm/xterm.css'); doc.head.appendChild(link);
    const script = doc.createElement('script'); script.src = remoteAssetUrl(base, 'vendor/xterm/xterm.js'); script.defer = true;
    script.onload = () => {const addon = doc.createElement('script'); addon.src = remoteAssetUrl(base, 'vendor/xterm/addon-fit.js'); addon.onload = () => {clearTimeout(timer); done();}; addon.onerror = () => {clearTimeout(timer); done();}; doc.head.appendChild(addon);};
    script.onerror = () => {clearTimeout(timer); resolve(false);};
    doc.head.appendChild(script);
  }).then(ok => {if (!ok) xtermLoading = null; return ok;});
  return xtermLoading;
}

// Keys a browser or the learner's own computer keeps for itself, sent to the
// machine from the Keys menu instead. Each entry is [label, [keysym, code]...].
export const REMOTE_KEY_COMBOS = Object.freeze([
  ['Windows key (menu)', [[0xffeb, 'MetaLeft']]],
  ['Ctrl+Alt+Delete', [[0xffe3, 'ControlLeft'], [0xffe9, 'AltLeft'], [0xffff, 'Delete']]],
  ['Alt+Tab (switch window)', [[0xffe9, 'AltLeft'], [0xff09, 'Tab']]],
  ['Alt+F4 (close window)', [[0xffe9, 'AltLeft'], [0xffc1, 'F4']]],
  ['Ctrl+Alt+T (new terminal)', [[0xffe3, 'ControlLeft'], [0xffe9, 'AltLeft'], [0x74, 'KeyT']]],
  ['Ctrl+W', [[0xffe3, 'ControlLeft'], [0x77, 'KeyW']]],
  ['Ctrl+N', [[0xffe3, 'ControlLeft'], [0x6e, 'KeyN']]],
  ['Ctrl+Shift+Esc (task manager)', [[0xffe3, 'ControlLeft'], [0xffe1, 'ShiftLeft'], [0xff1b, 'Escape']]],
  ['Print Screen (screenshot)', [[0xff61, 'PrintScreen']]],
  ['Escape', [[0xff1b, 'Escape']]],
  ['F11', [[0xffc8, 'F11']]]
].map(([label, keys]) => Object.freeze([label, Object.freeze(keys.map(key => Object.freeze(key)))])));

/** Presses the keys of a combination in order and releases them in reverse. */
export function sendKeyCombo(rfb, keys) {
  if (!rfb || typeof rfb.sendKey !== 'function' || !Array.isArray(keys) || !keys.length) return false;
  for (const [keysym, code] of keys) rfb.sendKey(keysym, code, true);
  for (const [keysym, code] of [...keys].reverse()) rfb.sendKey(keysym, code, false);
  return true;
}

/** The X11 keysym and key code that type one character, or null when it cannot be typed. */
export function keyForCharacter(character) {
  if (character === '\n' || character === '\r') return [0xff0d, 'Enter'];
  if (character === '\t') return [0xff09, 'Tab'];
  const point = character.codePointAt(0);
  if (point >= 0x20 && point <= 0x7e) return [point, ''];
  if (point >= 0xa0 && point <= 0xff) return [point, ''];
  if (point > 0xff && point <= 0x10ffff) return [0x01000000 + point, ''];
  return null;
}

/** Is this key press a paste shortcut (Ctrl+V, Ctrl+Shift+V or Shift+Insert)? */
export const isPasteShortcut = event => Boolean(event && !event.altKey && !event.metaKey && ((event.ctrlKey && (event.code === 'KeyV' || String(event.key).toLowerCase() === 'v')) || (event.shiftKey && !event.ctrlKey && event.code === 'Insert')));

export function renderLabRemote(scenario) {
  const labId = remoteLabFor(scenario), config = remoteConfig();
  const keys = REMOTE_KEY_COMBOS.map(([label], index) => '<button type="button" role="menuitem" data-remote-key="' + index + '">' + esc(label) + '</button>').join('');
  return '<div class="lab-remote" data-lab-remote><div class="remote-chrome"><span class="remote-dot" data-remote-dot aria-hidden="true"></span><span class="remote-title">Real Linux machine · ' + esc(labId || scenario.id) + '</span><span class="remote-status" data-remote-status role="status">Not started</span>'
    + '<span class="remote-desktop-tools" data-remote-desktop-tools role="toolbar" aria-label="Machine controls" hidden>'
    + '<button type="button" class="lab-tool remote-view-toggle" data-remote-view="text" aria-pressed="false" title="A text terminal on the same machine that screen readers can read">Text terminal</button>'
    + '<button type="button" class="lab-tool" data-remote-clipboard-toggle aria-expanded="false" aria-controls="remote-clipboard">Clipboard</button>'
    + '<span class="remote-keys"><button type="button" class="lab-tool" data-remote-keys-toggle aria-haspopup="menu" aria-expanded="false">Keys</button><span class="remote-keys-menu" data-remote-keys-menu role="menu" aria-label="Send keys to the machine" hidden>' + keys + '</span></span>'
    + '<button type="button" class="lab-tool" data-remote-fullscreen aria-pressed="false">Full screen</button>'
    + '</span>'
    + '<span class="remote-actions"><button type="button" class="lab-tool remote-checks-toggle" data-remote-checks-toggle aria-expanded="true" aria-controls="remote-checks">Lab checks</button><button type="button" class="lab-tool" data-remote-start>Start machine</button><button type="button" class="lab-tool" data-remote-verify disabled>Check my work</button><button type="button" class="lab-tool" data-remote-stop disabled>Stop</button></span></div>'
    + '<div class="remote-clipboard" id="remote-clipboard" data-remote-clipboard hidden><label for="remote-clipboard-text">Clipboard <span class="panel-help">Copy and paste work between your computer and the machine with the usual keys. Text copied on the machine appears here; text written here can be sent to the machine.</span></label><textarea id="remote-clipboard-text" data-remote-clipboard-text rows="3" maxlength="20000" spellcheck="false"></textarea><span class="remote-clipboard-actions"><button type="button" class="lab-tool" data-remote-clipboard-send>Send to the machine’s clipboard</button><button type="button" class="lab-tool" data-remote-clipboard-type title="Types the text as key presses, for windows that do not accept a paste">Type it</button><button type="button" class="lab-tool" data-remote-clipboard-copy>Copy to my computer</button></span><span class="panel-help" data-remote-clipboard-note role="status"></span></div>'
    + '<div class="remote-body"><div class="remote-terminal" data-remote-terminal tabindex="0" aria-label="Linux machine screen"><div class="remote-welcome" data-remote-welcome><h3>Your own Linux machine for this lab</h3><p>Start machine opens a real, isolated Linux machine on the lab server (' + esc(config.base) + ') with this lab’s files in the <b>lab</b> folder. Cloudflare relays the connection to a DigitalOcean controller and a Docker-hosted machine. Your keyboard and mouse input, text you copy or paste, time zone, screen size, files and command history are processed remotely. Use fictional details only; never enter student records, passwords or private keys. The machine has no internet access unless this lab lists sites it can reach. The service requests deletion on Stop, disconnect or timeout; provider cleanup and retention can differ. Read the <a href="/#privacy">privacy information</a> before starting.</p><p class="panel-help">It takes about half a minute to start. Click inside the screen to use the keyboard and mouse; press Ctrl+Alt+Shift together to move the keyboard back out. Text terminal opens a screen-reader-friendly shell on the same machine.</p></div></div><aside class="remote-milestones" id="remote-checks" aria-label="Lab checks"><h3>Lab checks</h3><ol data-remote-milestones><li class="remote-milestone-empty">The machine reports its checks once it starts.</li></ol><p class="panel-help" data-remote-limits></p></aside></div></div>';
}

export function mountLabRemote(root, {scenario, record, getState, action, onActivity = () => {}, showNotice = () => {}, checksOpen, verifyEveryMs = 15000}) {
  const controller = new AbortController(), signal = controller.signal, $ = selector => root.querySelector(selector);
  const listen = (node, event, handler, options = {}) => node?.addEventListener(event, handler, {signal, ...options});
  const doc = root.ownerDocument || document, win = doc.defaultView || globalThis, config = remoteConfig(), labId = remoteLabFor(scenario);
  const host = $('[data-remote-terminal]'), statusNode = $('[data-remote-status]'), dot = $('[data-remote-dot]'), tools = $('[data-remote-desktop-tools]');
  let session = null, term = null, fit = null, fallback = null, resizeObserver = null, milestones = [], complete = false, verified = false, typed = false, phase = 'idle';
  let rfb = null, desktopInfo = null, verifyTimer = null, pendingOutput = '', view = 'none', textMode = false, shellState = 'none', machineClipboard = '', modifierChord = false;
  const setStatus = (next, message) => {phase = next; statusNode.textContent = message; dot.dataset.phase = next; $('[data-remote-start]').disabled = ['connecting', 'authenticating', 'starting', 'ready'].includes(next); $('[data-remote-verify]').disabled = next !== 'ready'; $('[data-remote-stop]').disabled = !['connecting', 'authenticating', 'starting', 'ready'].includes(next); onActivity({type:'remote', phase:next});};
  const markTyped = () => {if (!typed) {typed = true; onActivity({type:'remote', typed:true});}};
  // Redraw only when a check changed, keeping open hints and focus (checks arrive every few seconds).
  let drawnMilestones = '';
  const renderMilestones = () => {
    const list = $('[data-remote-milestones]');
    const signature = JSON.stringify(milestones);
    if (signature === drawnMilestones) return;
    drawnMilestones = signature;
    const open = new Set([...list.querySelectorAll('details[open]')].map(d => d.closest('li').dataset.milestone));
    const focused = list.contains(doc.activeElement) ? doc.activeElement.closest?.('li')?.dataset.milestone : undefined;
    list.innerHTML = milestones.length ? milestones.map((item, index) => '<li data-milestone="' + esc(item.id) + '" class="' + (item.completed ? 'is-done' : '') + '"><span aria-hidden="true">' + (item.completed ? '✓' : index + 1) + '</span><div><b>' + esc(item.title) + '</b>' + (item.hint ? '<details' + (open.has(item.id) ? ' open' : '') + '><summary>Hint</summary><p>' + esc(item.hint) + '</p></details>' : '') + '</div></li>').join('') : '<li class="remote-milestone-empty">The machine reports its checks once it starts.</li>';
    if (focused) [...list.children].find(li => li.dataset.milestone === focused)?.querySelector('summary')?.focus({preventScroll:true});
  };
  function write(data) {
    if (term) {term.write(data); return;}
    if (!fallback) {pendingOutput = (pendingOutput + data).slice(-20000); return;}
    fallback.output.textContent = (fallback.output.textContent + data.replace(ansi, '').replace(/\r\n?/g, '\n')).slice(-20000);
    fallback.output.scrollTop = fallback.output.scrollHeight;
  }
  function mountFallback(container = host) {
    container.innerHTML = '<pre class="remote-fallback-output" data-remote-fallback-output aria-live="polite"></pre><form class="remote-fallback-form" data-remote-fallback-form><label class="sr-only" for="remote-fallback-input">Command</label><span aria-hidden="true">$</span><input id="remote-fallback-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="1000"></form>';
    fallback = {output:container.querySelector('[data-remote-fallback-output]'), input:container.querySelector('#remote-fallback-input')};
    if (pendingOutput) {const early = pendingOutput; pendingOutput = ''; write(early);}
    listen(container.querySelector('[data-remote-fallback-form]'), 'submit', event => {event.preventDefault(); const line = fallback.input.value; fallback.input.value = ''; if (session) {session.input(line + '\r'); markTyped();}});
    fallback.input.focus({preventScroll:true});
  }
  async function mountTerminal(container = host, {screenReader = false} = {}) {
    const ok = await loadXterm(config.base, doc).catch(() => false);
    if (signal.aborted) return;
    if (!ok || !globalThis.Terminal) {mountFallback(container); return;}
    container.innerHTML = '';
    term = new globalThis.Terminal({cursorBlink:true, screenReaderMode:screenReader, fontFamily:'"Ubuntu Mono","DejaVu Sans Mono",ui-monospace,Menlo,Consolas,monospace', fontSize:14, theme:{background:'#300a24', foreground:'#eeeeec', cursor:'#eeeeec'}});
    const Fit = globalThis.FitAddon?.FitAddon || globalThis.FitAddon;
    if (typeof Fit === 'function') {fit = new Fit(); term.loadAddon(fit);}
    term.open(container);
    if (pendingOutput) {term.write(pendingOutput); pendingOutput = '';}
    term.onData(data => {if (session) {session.input(data); markTyped();}});
    const resize = () => {try {if (!container.offsetParent && container.getClientRects?.().length === 0) return; fit?.fit(); if (session && term) session.resize(term.cols, term.rows);} catch {}};
    resize();
    if (typeof ResizeObserver === 'function') {resizeObserver?.disconnect(); resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);}
    term.focus();
  }

  // ---- Desktop machines -------------------------------------------------
  // The screen is drawn by noVNC, loaded from the lab service as same-origin
  // modules, over a second socket admitted by this session's ticket.
  const clipboardNote = message => {const note = $('[data-remote-clipboard-note]'); if (note) note.textContent = message;};
  const clipboardText = $('[data-remote-clipboard-text]');
  listen(win, 'blur', () => {held.ctrl = false; held.shift = false;});
  function closeDesktop() {clearInterval(verifyTimer); verifyTimer = null; try {rfb?.disconnect();} catch {} rfb = null;}
  function showDesktopTools(show) {
    tools.hidden = !show;
    if (!show) {$('[data-remote-clipboard]').hidden = true; $('[data-remote-keys-menu]').hidden = true; setTextMode(false);}
  }
  function setTextMode(on) {
    textMode = Boolean(on) && view === 'desktop';
    const button = $('[data-remote-view]'), screen = $('[data-remote-screen]'), text = $('[data-remote-text]');
    if (button) {button.setAttribute('aria-pressed', String(textMode)); button.textContent = textMode ? 'Desktop' : 'Text terminal'; button.title = textMode ? 'Back to the graphical desktop' : 'A text terminal on the same machine that screen readers can read';}
    if (screen) screen.hidden = textMode;
    if (text) text.hidden = !textMode;
    if (!textMode) {try {rfb?.focus({preventScroll:true});} catch {} return;}
    if (shellState === 'none' || shellState === 'closed') {
      shellState = 'opening';
      text.innerHTML = '<p class="remote-text-note">Opening a text terminal on the machine…</p>';
      if (!session?.openShell()) {shellState = 'none'; text.innerHTML = '<p class="remote-text-note">The machine is not connected.</p>';}
    } else term?.focus();
  }
  function onShell(state) {
    const text = $('[data-remote-text]');
    if (state === 'open') {
      shellState = 'open';
      if (text && !term) void mountTerminal(text, {screenReader:true}).then(() => {if (term && session) session.resize(term.cols, term.rows);});
    } else if (state === 'closed') {
      shellState = 'closed';
      term?.dispose?.(); term = null; fit = null;
      if (text) text.innerHTML = '<p class="remote-text-note">The text terminal closed. <button type="button" class="lab-tool" data-remote-shell-again>Open it again</button></p>';
      listen($('[data-remote-shell-again]'), 'click', () => setTextMode(true));
    }
  }
  // Text copied on the machine: keep it for the panel and put it on this computer's clipboard.
  function receiveMachineClipboard(text) {
    machineClipboard = String(text ?? '').slice(0, 262144);
    if (clipboardText && doc.activeElement !== clipboardText) clipboardText.value = machineClipboard.slice(0, 20000);
    const clipboard = win.navigator?.clipboard;
    if (machineClipboard && typeof clipboard?.writeText === 'function') clipboard.writeText(machineClipboard).then(() => clipboardNote('Copied from the machine to your computer’s clipboard.'), () => clipboardNote('Copied on the machine. Use Copy to my computer to bring it over.'));
  }
  function sendToMachineClipboard(text) {
    if (!rfb || typeof text !== 'string') return false;
    try {rfb.clipboardPasteFrom(text.slice(0, 262144)); return true;} catch {return false;}
  }
  function typeText(text) {
    if (!rfb) return 0;
    let count = 0;
    for (const character of String(text).slice(0, 4000)) {const key = keyForCharacter(character); if (!key) continue; rfb.sendKey(key[0], key[1] || null); count++;}
    return count;
  }
  // Ctrl+V on the screen: bring this computer's clipboard over first, then let the
  // machine paste it, as if the two shared one clipboard. Without permission to
  // read the clipboard the key still reaches the machine, which pastes its own.
  // Modifiers held now: the paste must arrive as Ctrl+V even if released while the clipboard is read.
  const held = {ctrl:false, shift:false};
  const trackModifiers = event => {held.ctrl = Boolean(event.ctrlKey); held.shift = Boolean(event.shiftKey);};
  function interceptPaste(event) {
    if (!rfb || !isPasteShortcut(event) || event.repeat) return;
    const clipboard = win.navigator?.clipboard;
    if (typeof clipboard?.readText !== 'function') return;
    event.preventDefault(); event.stopImmediatePropagation();
    const insert = event.code === 'Insert', key = insert ? [0xff63, 'Insert'] : [event.shiftKey ? 0x56 : 0x76, 'KeyV'];
    const modifiers = insert ? [[0xffe1, 'ShiftLeft', 'shift']] : [[0xffe3, 'ControlLeft', 'ctrl'], ...(event.shiftKey ? [[0xffe1, 'ShiftLeft', 'shift']] : [])];
    const deliver = () => {
      if (!rfb) return;
      try {
        const pressed = modifiers.filter(([, , name]) => !held[name]);
        for (const [keysym, code] of pressed) rfb.sendKey(keysym, code, true);
        rfb.sendKey(key[0], key[1], true); rfb.sendKey(key[0], key[1], false);
        for (const [keysym, code] of pressed.reverse()) rfb.sendKey(keysym, code, false);
      } catch {}
    };
    clipboard.readText().then(text => {if (typeof text === 'string' && text && text !== machineClipboard) sendToMachineClipboard(text); setTimeout(deliver, 40);}, () => deliver());
  }
  // Ctrl+Alt+Shift moves the keyboard out of the screen, which otherwise keeps every key.
  function watchFocusChord(event) {
    if (event.type === 'keydown') {modifierChord = event.ctrlKey && event.altKey && event.shiftKey && ['Control', 'Alt', 'Shift'].includes(event.key) ? true : (modifierChord && ['Control', 'Alt', 'Shift'].includes(event.key));}
    else if (modifierChord && !event.ctrlKey && !event.altKey && !event.shiftKey) {modifierChord = false; setTimeout(() => {try {doc.activeElement?.blur?.();} catch {} ($('[data-remote-view]') || $('[data-remote-stop]'))?.focus?.({preventScroll:true}); statusNode.textContent = 'The keyboard left the machine’s screen. Click the screen or press Tab back to it to continue.';}, 0);}
  }
  // A short lab area on a high-density (or zoomed) display gets a desktop up to 640 px tall, scaled to fit, so windows fit on it.
  const desktopScale = area => area.height >= 640 ? 1 : Math.min(640 / area.height, Math.max(1, doc.defaultView?.devicePixelRatio || 1));
  /** Smallest lab area the desktop follows; below it the desktop is scaled to fit. */
  const fitsDesktop = () => {const area = $('[data-remote-screen]')?.getBoundingClientRect?.(); return Boolean(area) && area.width >= 800 && area.height >= 480 && desktopScale(area) === 1;};
  async function mountDesktop(info) {
    desktopInfo = info; view = 'desktop';
    host.classList.add('is-desktop');
    host.innerHTML = '<div class="remote-screen" data-remote-screen></div><div class="remote-text" data-remote-text role="region" aria-label="Text terminal on the machine" hidden></div><p class="remote-screen-note" data-remote-screen-note>Loading the screen…</p><p class="sr-only">This is a graphical Linux desktop, which a screen reader cannot read. Choose Text terminal above for a shell on the same machine that it can read.</p>';
    showDesktopTools(true);
    const note = $('[data-remote-screen-note]'), screen = $('[data-remote-screen]');
    let RFB;
    try {RFB = (await import(new URL(remoteAssetUrl(config.base, 'vendor/novnc/core/rfb.js'), doc.baseURI).href)).default;} catch {RFB = null;}
    if (signal.aborted || !session || desktopInfo !== info) return;
    if (typeof RFB !== 'function') {note.textContent = 'The screen viewer could not load. Stop the machine and start it again, or reload the page.'; setStatus('error', 'The screen viewer could not load.'); return;}
    let url;
    try {url = remoteDesktopUrl(config.base, doc.defaultView?.location);} catch (error) {note.textContent = error.message; return;}
    const connect = () => {
      try {rfb?.disconnect();} catch {}
      rfb = new RFB(screen, url, {credentials:{password:info.password}, wsProtocols:['cll-desktop', 'ticket.' + info.ticket], shared:true});
      // The desktop follows the size of this area (machines that cannot resize are scaled to fit).
      rfb.scaleViewport = true; rfb.resizeSession = fitsDesktop(); rfb.focusOnClick = true; rfb.background = '#101418'; rfb.showDotCursor = true;
      rfb.addEventListener('connect', () => {note.hidden = true; if (phase === 'ready') statusNode.textContent = 'Connected. This is a real Linux desktop on an isolated machine.';});
      rfb.addEventListener('credentialsrequired', () => {try {rfb.sendCredentials({password:info.password});} catch {}});
      rfb.addEventListener('clipboard', event => receiveMachineClipboard(event.detail?.text));
      rfb.addEventListener('disconnect', () => {if (!session || signal.aborted || desktopInfo !== info) return; note.hidden = false; note.innerHTML = 'The screen disconnected. <button type="button" class="lab-tool" data-remote-reconnect>Reconnect the screen</button>'; listen($('[data-remote-reconnect]'), 'click', () => {note.textContent = 'Reconnecting…'; connect();});});
    };
    connect();
    // Follow the size of the lab area only while a desktop still fits in it; on
    // a phone the machine keeps a usable desktop size and is scaled down instead.
    if (typeof ResizeObserver === 'function') {const watch = new ResizeObserver(() => {if (rfb) rfb.resizeSession = fitsDesktop();}); watch.observe(screen); signal.addEventListener('abort', () => watch.disconnect());}
    listen(screen, 'keydown', trackModifiers, {capture:true});
    listen(screen, 'keyup', trackModifiers, {capture:true});
    listen(screen, 'keydown', interceptPaste, {capture:true});
    listen(screen, 'keydown', watchFocusChord, {capture:true});
    listen(screen, 'keyup', watchFocusChord, {capture:true});
    listen(screen, 'keydown', markTyped);
    listen(screen, 'pointerdown', markTyped);
    // The machine cannot tell the page when a file changes, so ask for the checks regularly.
    clearInterval(verifyTimer);
    verifyTimer = setInterval(() => {if (session && phase === 'ready' && !doc.hidden) session.verify();}, Math.max(4000, Number(verifyEveryMs) || 15000));
  }

  // Desktop toolbar
  listen($('[data-remote-view]'), 'click', () => setTextMode(!textMode));
  listen($('[data-remote-clipboard-toggle]'), 'click', event => {const panel = $('[data-remote-clipboard]'); panel.hidden = !panel.hidden; event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) {clipboardText.value = machineClipboard.slice(0, 20000); clipboardText.focus({preventScroll:true});}});
  listen($('[data-remote-clipboard-send]'), 'click', () => clipboardNote(sendToMachineClipboard(clipboardText.value) ? 'Sent. Paste it on the machine with Ctrl+V (Ctrl+Shift+V in a terminal).' : 'Start the machine first.'));
  listen($('[data-remote-clipboard-type]'), 'click', () => {try {rfb?.focus({preventScroll:true});} catch {} const typedCount = typeText(clipboardText.value); clipboardNote(typedCount ? 'Typed ' + typedCount + ' characters into the window that has the focus on the machine.' : 'Start the machine first.');});
  listen($('[data-remote-clipboard-copy]'), 'click', () => {const text = clipboardText.value; const clipboard = win.navigator?.clipboard; if (typeof clipboard?.writeText !== 'function') {clipboardText.select(); clipboardNote('Select the text and copy it with Ctrl+C.'); return;} clipboard.writeText(text).then(() => clipboardNote('Copied to your computer’s clipboard.'), () => {clipboardText.select(); clipboardNote('Your browser blocked the copy. The text is selected: press Ctrl+C.');});});
  const keysToggle = $('[data-remote-keys-toggle]'), keysMenu = $('[data-remote-keys-menu]');
  const closeKeys = (focusToggle = false) => {keysMenu.hidden = true; keysToggle.setAttribute('aria-expanded', 'false'); if (focusToggle) keysToggle.focus({preventScroll:true});};
  listen(keysToggle, 'click', () => {const open = keysMenu.hidden; keysMenu.hidden = !open; keysToggle.setAttribute('aria-expanded', String(open)); if (open) keysMenu.querySelector('button')?.focus({preventScroll:true});});
  listen(keysMenu, 'keydown', event => {
    const items = [...keysMenu.querySelectorAll('button')], index = items.indexOf(doc.activeElement);
    if (event.key === 'Escape') {event.preventDefault(); closeKeys(true);}
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {event.preventDefault(); items[(index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();}
  });
  listen(keysMenu, 'click', event => {const button = event.target.closest?.('[data-remote-key]'); if (!button) return; const combo = REMOTE_KEY_COMBOS[Number(button.dataset.remoteKey)]; closeKeys(); try {rfb?.focus({preventScroll:true});} catch {} if (combo && sendKeyCombo(rfb, combo[1])) statusNode.textContent = 'Sent ' + combo[0] + ' to the machine.';});
  listen(doc, 'click', event => {if (!keysMenu.hidden && !event.target.closest?.('.remote-keys')) closeKeys();});
  // Full screen: the machine fills the display, and where the browser allows it
  // the keyboard is locked to the page so shortcuts like Ctrl+W reach the machine.
  const fullscreenButton = $('[data-remote-fullscreen]');
  const fullscreenTarget = () => root.querySelector('.lab-remote') || root;
  const isFullscreen = () => Boolean(doc.fullscreenElement) && doc.fullscreenElement === fullscreenTarget();
  listen(fullscreenButton, 'click', async () => {
    if (isFullscreen()) {try {await doc.exitFullscreen();} catch {} return;}
    try {await fullscreenTarget().requestFullscreen({navigationUI:'hide'});} catch {statusNode.textContent = 'This browser did not allow full screen.'; return;}
    try {await win.navigator?.keyboard?.lock?.();} catch {}
    try {rfb?.focus({preventScroll:true});} catch {}
  });
  listen(doc, 'fullscreenchange', () => {
    const on = isFullscreen();
    fullscreenButton?.setAttribute('aria-pressed', String(on));
    if (fullscreenButton) fullscreenButton.textContent = on ? 'Leave full screen' : 'Full screen';
    if (on) statusNode.textContent = win.navigator?.keyboard?.lock ? 'Full screen. Hold Esc to leave.' : 'Full screen. Press Esc to leave.';
    else {try {win.navigator?.keyboard?.unlock?.();} catch {}}
  });

  function start() {
    if (!labId) {setStatus('unavailable', 'This lab is not hosted on the terminal service.'); return;}
    let url;
    try {url = remoteSocketUrl(config.base, doc.defaultView?.location);} catch (error) {setStatus('error', error.message); return;}
    try {
      // Tell the service how large the lab area is, so a desktop machine is created to fit it.
      const area = host.getBoundingClientRect(), scale = desktopScale(area);
      session = createRemoteSession({url, labId, screen:{width:Math.round(area.width * scale), height:Math.round(area.height * scale)},
        onStatus:(next, message) => setStatus(next, message),
        onOutput:data => write(data),
        onShell,
        onReady:state => {$('[data-remote-limits]').textContent = state.limits ? 'Machine limits: ' + state.limits.memory + ' memory · ' + state.limits.cpus + ' CPU · ' + Math.round(state.limits.inactivityTimeoutSeconds / 60) + ' min idle timeout.' : ''; onActivity({type:'remote', ready:true}); if (state.desktop) void mountDesktop(state.desktop); else {view = 'terminal'; void mountTerminal().then(() => {if (term && session) session.resize(term.cols, term.rows);});}},
        onMilestones:(list, allDone) => {milestones = list; complete = allDone; renderMilestones(); if (body.classList.contains('checks-hidden')) showChecks(false); if (allDone && phase === 'ready') statusNode.textContent = 'Every lab check passed on the machine.'; onActivity({type:'remote', milestones:list.length, complete:allDone});},
        onError:(message, code) => {if (code === 'shell_unavailable') {onShell('closed'); showNotice('The text terminal could not open on this machine.'); return;} showNotice(message); if (code === 'sandbox_unavailable' || code === 'capacity_reached') setStatus('error', message);},
        onClose:() => {session = null; closeDesktop(); showDesktopTools(false); if (phase !== 'ended') setStatus('closed', 'Disconnected from the lab machine.');}
      });
    } catch (error) {setStatus('error', error.message); return;}
    setStatus('connecting', 'Connecting to the lab machine…');
    closeDesktop(); term?.dispose?.(); term = null; fallback = null; pendingOutput = ''; view = 'none'; desktopInfo = null; shellState = 'none'; machineClipboard = '';
    showDesktopTools(false);
    host.classList.remove('is-desktop');
    host.innerHTML = '<div class="remote-welcome"><h3>Starting your Linux machine…</h3><p>A fresh machine is being prepared with this lab’s files. This takes about half a minute.</p></div>';
  }
  // On a small screen the checks panel folds away so the machine gets the whole width.
  const body = $('.remote-body'), toggle = $('[data-remote-checks-toggle]');
  const showChecks = show => {body.classList.toggle('checks-hidden', !show); toggle.setAttribute('aria-expanded', String(show)); toggle.textContent = show ? 'Hide checks' : 'Lab checks' + (milestones.length ? ' ' + milestones.filter(item => item.completed).length + '/' + milestones.length : '');};
  showChecks(typeof checksOpen === 'boolean' ? checksOpen : root.getBoundingClientRect().width >= 980);
  listen(toggle, 'click', () => showChecks(body.classList.contains('checks-hidden')));
  listen($('[data-remote-start]'), 'click', start);
  listen($('[data-remote-verify]'), 'click', () => {if (session?.verify()) {verified = true; onActivity({type:'remote', verified:true}); setStatus('ready', 'Checking your work on the machine…'); setTimeout(() => {if (phase === 'ready') setStatus('ready', complete ? 'Every lab check passed on the machine.' : 'Checks updated. Finish the remaining steps, then check again.');}, 400);}});
  listen($('[data-remote-stop]'), 'click', () => {if (isFullscreen()) doc.exitFullscreen?.().catch?.(() => {}); session?.close(); session = null; closeDesktop(); showDesktopTools(false); setStatus('closed', 'Machine stopped. Start machine opens a fresh one.');});
  listen(host, 'click', event => {if (event.target.closest?.('button, a, input, textarea')) return; if (textMode || view === 'terminal') {term?.focus(); fallback?.input.focus({preventScroll:true});} else try {rfb?.focus({preventScroll:true});} catch {}});
  return {
    refresh() {},
    refreshLog() {},
    open() {$('[data-remote-start]')?.focus();},
    notify() {},
    hasUnsavedDraft:() => false,
    remoteState:() => ({active:true, labId, phase, typed, verified, complete, view, milestones:milestones.map(item => ({...item}))}),
    dispose() {controller.abort(); resizeObserver?.disconnect(); closeDesktop(); session?.close(); term?.dispose?.(); term = null; session = null; try {if (isFullscreen()) doc.exitFullscreen?.();} catch {}}
  };
}

registerLabEnvironment({
  id:'remote-terminal', label:'Real Linux machine · lab server',
  supports:scenario => remoteLabFor(scenario) !== null && remoteServiceAvailable() && remoteServiceHosts(remoteLabFor(scenario)),
  render:(scenario) => renderLabRemote(scenario),
  mount:(root, context) => mountLabRemote(root, context)
});

// In a browser, ask the service early so the first lab page already knows; a
// same-origin GET has no work attached; delivery still exposes request metadata.
if (globalThis.document && typeof globalThis.fetch === 'function' && /^https?:$/.test(globalThis.location?.protocol || '')) probeRemoteService().catch(() => {});
