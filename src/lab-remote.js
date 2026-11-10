// Real-machine lab environment: a terminal to a real Linux container served by
// the optional terminal service (terminal-sandbox/). It registers as the
// 'remote-terminal' provider. The guide's Section 1 steps come from the
// service's own lab milestones, which the service verifies by reading files in
// the learner's container. Nothing is sent but the lab id, keystrokes, terminal
// sizes and verify requests. If the service's xterm.js cannot load, a plain
// text terminal takes its place so the lab still works.
import {registerLabEnvironment} from './lab-environment.js?release=20261107-tech-team';
import {LAB_ENVIRONMENT_CONFIG} from './lab-environment-config.js?release=20261107-tech-team';
import {createRemoteSession, remoteSocketUrl, remoteAssetUrl} from './lab-remote-client.js?release=20261107-tech-team';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const ansi = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007|\u001b[()][A-Z0-9]/g;
export const remoteConfig = () => {const override = globalThis.COLE_LAB_REMOTE; const base = override && typeof override === 'object' ? override : LAB_ENVIRONMENT_CONFIG.remote; return {base:typeof base.base === 'string' ? base.base : '/terminal', labs:base.labs && typeof base.labs === 'object' ? base.labs : {}};};
export const remoteLabFor = scenario => {const labs = remoteConfig().labs; const id = scenario?.id; return typeof id === 'string' && Object.hasOwn(labs, id) && typeof labs[id] === 'string' ? labs[id] : null;};

// The real machines are used only once the service has answered its health
// check (status "enabled"). Until then, and whenever the service is missing or
// disabled, the guided labs keep the simulated desktop, so the configuration can
// name the service before it is deployed and nothing breaks for learners.
let serviceState = 'unknown', servicePromise = null;
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
    .then(body => setRemoteServiceState(body && body.status === 'enabled' ? 'enabled' : 'unavailable'))
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
  return '<div class="lab-remote" data-lab-remote><div class="remote-chrome"><span class="remote-dot" data-remote-dot aria-hidden="true"></span><span class="remote-title">Real Linux machine · ' + esc(labId || scenario.id) + '</span><span class="remote-status" data-remote-status role="status">Not started</span><span class="remote-actions"><button type="button" class="lab-tool" data-remote-start>Start machine</button><button type="button" class="lab-tool" data-remote-verify disabled>Check my work</button><button type="button" class="lab-tool" data-remote-stop disabled>Stop</button></span></div><div class="remote-body"><div class="remote-terminal" data-remote-terminal tabindex="0" aria-label="Linux terminal"><div class="remote-welcome" data-remote-welcome><h3>Your own Linux machine for this lab</h3><p>Start machine opens a real shell in an isolated container on the lab server (' + esc(config.base) + '). Only your keystrokes and the lab id are sent. The machine is reset when you leave.</p><p class="panel-help">Keyboard: type as on any Linux terminal. Tab completes, ↑ recalls history. Ctrl+C stops a command.</p></div></div><aside class="remote-milestones" aria-label="Lab checks"><h3>Lab checks</h3><ol data-remote-milestones><li class="remote-milestone-empty">The machine reports its checks once it starts.</li></ol><p class="panel-help" data-remote-limits></p></aside></div></div>';
}

export function mountLabRemote(root, {scenario, record, getState, action, onActivity = () => {}, showNotice = () => {}}) {
  const controller = new AbortController(), signal = controller.signal, $ = selector => root.querySelector(selector);
  const listen = (node, event, handler) => node?.addEventListener(event, handler, {signal});
  const doc = root.ownerDocument || document, config = remoteConfig(), labId = remoteLabFor(scenario);
  const host = $('[data-remote-terminal]'), statusNode = $('[data-remote-status]'), dot = $('[data-remote-dot]');
  let session = null, term = null, fit = null, fallback = null, resizeObserver = null, milestones = [], complete = false, verified = false, typed = false, phase = 'idle';
  const setStatus = (next, message) => {phase = next; statusNode.textContent = message; dot.dataset.phase = next; $('[data-remote-start]').disabled = ['connecting', 'authenticating', 'starting', 'ready'].includes(next); $('[data-remote-verify]').disabled = next !== 'ready'; $('[data-remote-stop]').disabled = !['connecting', 'authenticating', 'starting', 'ready'].includes(next); onActivity({type:'remote', phase:next});};
  const renderMilestones = () => {
    const list = $('[data-remote-milestones]');
    list.innerHTML = milestones.length ? milestones.map((item, index) => '<li class="' + (item.completed ? 'is-done' : '') + '"><span aria-hidden="true">' + (item.completed ? '✓' : index + 1) + '</span><div><b>' + esc(item.title) + '</b>' + (item.hint ? '<details><summary>Hint</summary><p>' + esc(item.hint) + '</p></details>' : '') + '</div></li>').join('') : '<li class="remote-milestone-empty">The machine reports its checks once it starts.</li>';
  };
  function write(data) {
    if (term) {term.write(data); return;}
    if (!fallback) return;
    fallback.output.textContent = (fallback.output.textContent + data.replace(ansi, '').replace(/\r\n?/g, '\n')).slice(-20000);
    fallback.output.scrollTop = fallback.output.scrollHeight;
  }
  function mountFallback() {
    host.innerHTML = '<pre class="remote-fallback-output" data-remote-fallback-output aria-live="polite"></pre><form class="remote-fallback-form" data-remote-fallback-form><label class="sr-only" for="remote-fallback-input">Command</label><span aria-hidden="true">$</span><input id="remote-fallback-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="1000"></form>';
    fallback = {output:$('[data-remote-fallback-output]'), input:$('#remote-fallback-input')};
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
    term.onData(data => {if (session) {session.input(data); if (!typed) {typed = true; onActivity({type:'remote', typed:true});}}});
    const resize = () => {try {fit?.fit(); if (session && term) session.resize(term.cols, term.rows);} catch {}};
    resize();
    if (typeof ResizeObserver === 'function') {resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);}
    term.focus();
  }
  function start() {
    if (!labId) {setStatus('unavailable', 'This lab is not hosted on the terminal service.'); return;}
    let url;
    try {url = remoteSocketUrl(config.base, doc.defaultView?.location);} catch (error) {setStatus('error', error.message); return;}
    try {
      session = createRemoteSession({url, labId,
        onStatus:(next, message) => setStatus(next, message),
        onOutput:data => write(data),
        onReady:state => {$('[data-remote-limits]').textContent = state.limits ? 'Container limits: ' + state.limits.memory + ' memory · ' + state.limits.cpus + ' CPU · ' + Math.round(state.limits.inactivityTimeoutSeconds / 60) + ' min idle timeout.' : ''; onActivity({type:'remote', ready:true}); if (term) session.resize(term.cols, term.rows);},
        onMilestones:(list, allDone) => {milestones = list; complete = allDone; renderMilestones(); onActivity({type:'remote', milestones:list.length, complete:allDone});},
        onError:(message, code) => {showNotice(message); if (code === 'sandbox_unavailable' || code === 'capacity_reached') setStatus('error', message);},
        onClose:() => {session = null; if (phase !== 'ended') setStatus('closed', 'Disconnected from the lab machine.');}
      });
    } catch (error) {setStatus('error', error.message); return;}
    setStatus('connecting', 'Connecting to the lab machine…');
    $('[data-remote-welcome]')?.remove();
    void mountTerminal();
  }
  listen($('[data-remote-start]'), 'click', start);
  listen($('[data-remote-verify]'), 'click', () => {if (session?.verify()) {verified = true; onActivity({type:'remote', verified:true}); setStatus('ready', 'Checking your work on the machine…'); setTimeout(() => {if (phase === 'ready') setStatus('ready', complete ? 'Every lab check passed on the machine.' : 'Checks updated. Finish the remaining steps, then check again.');}, 400);}});
  listen($('[data-remote-stop]'), 'click', () => {session?.close(); session = null; setStatus('closed', 'Machine stopped. Start machine opens a fresh one.');});
  listen(host, 'click', () => {term?.focus(); fallback?.input.focus({preventScroll:true});});
  return {
    refresh() {},
    refreshLog() {},
    open() {$('[data-remote-start]')?.focus();},
    notify() {},
    hasUnsavedDraft:() => false,
    remoteState:() => ({active:true, labId, phase, typed, verified, complete, milestones:milestones.map(item => ({...item}))}),
    dispose() {controller.abort(); resizeObserver?.disconnect(); session?.close(); term?.dispose?.(); term = null; session = null;}
  };
}

registerLabEnvironment({
  id:'remote-terminal', label:'Real Linux machine · terminal service',
  supports:scenario => remoteLabFor(scenario) !== null && remoteServiceAvailable(),
  render:(scenario) => renderLabRemote(scenario),
  mount:(root, context) => mountLabRemote(root, context)
});

// In a browser, ask the service early so the first lab page already knows; a
// same-origin GET of the health route sends nothing about the learner.
if (globalThis.document && typeof globalThis.fetch === 'function' && /^https?:$/.test(globalThis.location?.protocol || '')) probeRemoteService().catch(() => {});
