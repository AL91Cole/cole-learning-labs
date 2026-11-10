// Real-machine lab environment: a terminal to a real Linux container served by
// the optional terminal service (terminal-sandbox/). It registers as the
// 'remote-terminal' provider. The guide's Section 1 steps come from the
// service's own lab milestones, which the service verifies by reading files in
// the learner's container. Nothing is sent but the lab id, keystrokes, terminal
// sizes and verify requests. If the service's xterm.js cannot load, a plain
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

export function renderLabRemote(scenario) {
  const labId = remoteLabFor(scenario), config = remoteConfig();
  return '<div class="lab-remote" data-lab-remote><div class="remote-chrome"><span class="remote-dot" data-remote-dot aria-hidden="true"></span><span class="remote-title">Real Linux machine · ' + esc(labId || scenario.id) + '</span><span class="remote-status" data-remote-status role="status">Not started</span><span class="remote-actions"><button type="button" class="lab-tool remote-checks-toggle" data-remote-checks-toggle aria-expanded="true" aria-controls="remote-checks">Lab checks</button><button type="button" class="lab-tool" data-remote-start>Start machine</button><button type="button" class="lab-tool" data-remote-verify disabled>Check my work</button><button type="button" class="lab-tool" data-remote-stop disabled>Stop</button></span></div><div class="remote-body"><div class="remote-terminal" data-remote-terminal tabindex="0" aria-label="Linux machine screen"><div class="remote-welcome" data-remote-welcome><h3>Your own Linux machine for this lab</h3><p>Start machine opens a real, isolated Linux machine on the lab server (' + esc(config.base) + ') with this lab’s files in the <b>lab</b> folder. Only the lab id and what you type or click are sent. The machine has no internet access and is erased when you leave.</p><p class="panel-help">It takes about half a minute to start. Click inside the screen to use the keyboard and mouse.</p></div></div><aside class="remote-milestones" id="remote-checks" aria-label="Lab checks"><h3>Lab checks</h3><ol data-remote-milestones><li class="remote-milestone-empty">The machine reports its checks once it starts.</li></ol><p class="panel-help" data-remote-limits></p></aside></div></div>';
}

export function mountLabRemote(root, {scenario, record, getState, action, onActivity = () => {}, showNotice = () => {}}) {
  const controller = new AbortController(), signal = controller.signal, $ = selector => root.querySelector(selector);
  const listen = (node, event, handler) => node?.addEventListener(event, handler, {signal});
  const doc = root.ownerDocument || document, config = remoteConfig(), labId = remoteLabFor(scenario);
  const host = $('[data-remote-terminal]'), statusNode = $('[data-remote-status]'), dot = $('[data-remote-dot]');
  let session = null, term = null, fit = null, fallback = null, resizeObserver = null, milestones = [], complete = false, verified = false, typed = false, phase = 'idle';
  let rfb = null, desktopInfo = null, verifyTimer = null, pendingOutput = '', view = 'none';
  const setStatus = (next, message) => {phase = next; statusNode.textContent = message; dot.dataset.phase = next; $('[data-remote-start]').disabled = ['connecting', 'authenticating', 'starting', 'ready'].includes(next); $('[data-remote-verify]').disabled = next !== 'ready'; $('[data-remote-stop]').disabled = !['connecting', 'authenticating', 'starting', 'ready'].includes(next); onActivity({type:'remote', phase:next});};
  const renderMilestones = () => {
    const list = $('[data-remote-milestones]');
    list.innerHTML = milestones.length ? milestones.map((item, index) => '<li class="' + (item.completed ? 'is-done' : '') + '"><span aria-hidden="true">' + (item.completed ? '✓' : index + 1) + '</span><div><b>' + esc(item.title) + '</b>' + (item.hint ? '<details><summary>Hint</summary><p>' + esc(item.hint) + '</p></details>' : '') + '</div></li>').join('') : '<li class="remote-milestone-empty">The machine reports its checks once it starts.</li>';
  };
  function write(data) {
    if (term) {term.write(data); return;}
    if (!fallback) {pendingOutput = (pendingOutput + data).slice(-20000); return;}
    fallback.output.textContent = (fallback.output.textContent + data.replace(ansi, '').replace(/\r\n?/g, '\n')).slice(-20000);
    fallback.output.scrollTop = fallback.output.scrollHeight;
  }
  function mountFallback() {
    host.innerHTML = '<pre class="remote-fallback-output" data-remote-fallback-output aria-live="polite"></pre><form class="remote-fallback-form" data-remote-fallback-form><label class="sr-only" for="remote-fallback-input">Command</label><span aria-hidden="true">$</span><input id="remote-fallback-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="1000"></form>';
    fallback = {output:$('[data-remote-fallback-output]'), input:$('#remote-fallback-input')};
    if (pendingOutput) {const early = pendingOutput; pendingOutput = ''; write(early);}
    listen($('[data-remote-fallback-form]'), 'submit', event => {event.preventDefault(); const line = fallback.input.value; fallback.input.value = ''; if (session) {session.input(line + '\r'); typed = true; onActivity({type:'remote', typed:true});}});
    fallback.input.focus({preventScroll:true});
  }
  async function mountTerminal() {
    const ok = await loadXterm(config.base, doc).catch(() => false);
    if (!ok || !globalThis.Terminal) {mountFallback(); return;}
    host.innerHTML = '';
    term = new globalThis.Terminal({cursorBlink:true, fontFamily:'"Ubuntu Mono","DejaVu Sans Mono",ui-monospace,Menlo,Consolas,monospace', fontSize:14, theme:{background:'#300a24', foreground:'#eeeeec', cursor:'#eeeeec'}});
    const Fit = globalThis.FitAddon?.FitAddon || globalThis.FitAddon;
    if (typeof Fit === 'function') {fit = new Fit(); term.loadAddon(fit);}
    term.open(host);
    if (pendingOutput) {term.write(pendingOutput); pendingOutput = '';}
    term.onData(data => {if (session) {session.input(data); if (!typed) {typed = true; onActivity({type:'remote', typed:true});}}});
    const resize = () => {try {fit?.fit(); if (session && term) session.resize(term.cols, term.rows);} catch {}};
    resize();
    if (typeof ResizeObserver === 'function') {resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);}
    term.focus();
  }
  // Desktop machines: the screen is drawn by noVNC, loaded from the lab service
  // as same-origin modules, over a second socket admitted by this session's ticket.
  function closeDesktop() {clearInterval(verifyTimer); verifyTimer = null; try {rfb?.disconnect();} catch {} rfb = null;}
  async function mountDesktop(info) {
    desktopInfo = info; view = 'desktop';
    host.classList.add('is-desktop');
    host.innerHTML = '<div class="remote-screen" data-remote-screen></div><p class="remote-screen-note" data-remote-screen-note>Loading the screen…</p>';
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
      rfb.scaleViewport = true; rfb.resizeSession = false; rfb.focusOnClick = true; rfb.background = '#101418';
      rfb.addEventListener('connect', () => {note.hidden = true; if (phase === 'ready') statusNode.textContent = 'Connected. This is a real Linux desktop on an isolated machine.';});
      rfb.addEventListener('credentialsrequired', () => {try {rfb.sendCredentials({password:info.password});} catch {}});
      rfb.addEventListener('disconnect', () => {if (!session || signal.aborted || desktopInfo !== info) return; note.hidden = false; note.innerHTML = 'The screen disconnected. <button type="button" class="lab-tool" data-remote-reconnect>Reconnect the screen</button>'; listen($('[data-remote-reconnect]'), 'click', () => {note.textContent = 'Reconnecting…'; connect();});});
    };
    connect();
    listen(screen, 'keydown', () => {if (!typed) {typed = true; onActivity({type:'remote', typed:true});}});
    listen(screen, 'pointerdown', () => {if (!typed) {typed = true; onActivity({type:'remote', typed:true});}});
    // The machine cannot tell the page when a file changes, so ask for the checks regularly.
    clearInterval(verifyTimer);
    verifyTimer = setInterval(() => {if (session && phase === 'ready' && !doc.hidden) session.verify();}, 15000);
  }
  function start() {
    if (!labId) {setStatus('unavailable', 'This lab is not hosted on the terminal service.'); return;}
    let url;
    try {url = remoteSocketUrl(config.base, doc.defaultView?.location);} catch (error) {setStatus('error', error.message); return;}
    try {
      // Tell the service how large the lab area is, so a desktop machine is created to fit it.
      const area = host.getBoundingClientRect();
      session = createRemoteSession({url, labId, screen:{width:Math.round(area.width), height:Math.round(area.height)},
        onStatus:(next, message) => setStatus(next, message),
        onOutput:data => write(data),
        onReady:state => {$('[data-remote-limits]').textContent = state.limits ? 'Machine limits: ' + state.limits.memory + ' memory · ' + state.limits.cpus + ' CPU · ' + Math.round(state.limits.inactivityTimeoutSeconds / 60) + ' min idle timeout.' : ''; onActivity({type:'remote', ready:true}); if (state.desktop) void mountDesktop(state.desktop); else {view = 'terminal'; void mountTerminal().then(() => {if (term && session) session.resize(term.cols, term.rows);});}},
        onMilestones:(list, allDone) => {milestones = list; complete = allDone; renderMilestones(); if (body.classList.contains('checks-hidden')) showChecks(false); if (allDone && phase === 'ready') statusNode.textContent = 'Every lab check passed on the machine.'; onActivity({type:'remote', milestones:list.length, complete:allDone});},
        onError:(message, code) => {showNotice(message); if (code === 'sandbox_unavailable' || code === 'capacity_reached') setStatus('error', message);},
        onClose:() => {session = null; closeDesktop(); if (phase !== 'ended') setStatus('closed', 'Disconnected from the lab machine.');}
      });
    } catch (error) {setStatus('error', error.message); return;}
    setStatus('connecting', 'Connecting to the lab machine…');
    closeDesktop(); term?.dispose?.(); term = null; fallback = null; pendingOutput = ''; view = 'none'; desktopInfo = null;
    host.classList.remove('is-desktop');
    host.innerHTML = '<div class="remote-welcome"><h3>Starting your Linux machine…</h3><p>A fresh machine is being prepared with this lab’s files. This takes about half a minute.</p></div>';
  }
  // On a small screen the checks panel folds away so the machine gets the whole width.
  const body = $('.remote-body'), toggle = $('[data-remote-checks-toggle]');
  const showChecks = show => {body.classList.toggle('checks-hidden', !show); toggle.setAttribute('aria-expanded', String(show)); toggle.textContent = show ? 'Hide checks' : 'Lab checks' + (milestones.length ? ' ' + milestones.filter(item => item.completed).length + '/' + milestones.length : '');};
  showChecks(root.getBoundingClientRect().width >= 980);
  listen(toggle, 'click', () => showChecks(body.classList.contains('checks-hidden')));
  listen($('[data-remote-start]'), 'click', start);
  listen($('[data-remote-verify]'), 'click', () => {if (session?.verify()) {verified = true; onActivity({type:'remote', verified:true}); setStatus('ready', 'Checking your work on the machine…'); setTimeout(() => {if (phase === 'ready') setStatus('ready', complete ? 'Every lab check passed on the machine.' : 'Checks updated. Finish the remaining steps, then check again.');}, 400);}});
  listen($('[data-remote-stop]'), 'click', () => {session?.close(); session = null; closeDesktop(); setStatus('closed', 'Machine stopped. Start machine opens a fresh one.');});
  listen(host, 'click', () => {term?.focus(); fallback?.input.focus({preventScroll:true}); try {rfb?.focus();} catch {}});
  return {
    refresh() {},
    refreshLog() {},
    open() {$('[data-remote-start]')?.focus();},
    notify() {},
    hasUnsavedDraft:() => false,
    remoteState:() => ({active:true, labId, phase, typed, verified, complete, view, milestones:milestones.map(item => ({...item}))}),
    dispose() {controller.abort(); resizeObserver?.disconnect(); closeDesktop(); session?.close(); term?.dispose?.(); term = null; session = null;}
  };
}

registerLabEnvironment({
  id:'remote-terminal', label:'Real Linux machine · lab server',
  supports:scenario => remoteLabFor(scenario) !== null && remoteServiceAvailable() && remoteServiceHosts(remoteLabFor(scenario)),
  render:(scenario) => renderLabRemote(scenario),
  mount:(root, context) => mountLabRemote(root, context)
});

// In a browser, ask the service early so the first lab page already knows; a
// same-origin GET of the health route sends nothing about the learner.
if (globalThis.document && typeof globalThis.fetch === 'function' && /^https?:$/.test(globalThis.location?.protocol || '')) probeRemoteService().catch(() => {});
