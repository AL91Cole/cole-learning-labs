// Browser client for the optional real-machine terminal service. It speaks the
// service's existing WebSocket protocol: authenticate as a student, start a
// self-paced session for one lab, relay keystrokes and output, resize, and ask
// the service to verify its milestones. The module has no DOM dependency so it
// can be tested with a fake WebSocket. Session messages, the lab id, keyboard
// input, display sizes and the browser's time zone are sent. Typed input can include personal data;
// connection metadata is handled by the delivery and compute providers.
const LIMITS = Object.freeze({input:4096, output:65536, lab:32, queuedInput:262144, inputBytesPerSecond:24000, inputGapMs:20});

export function remoteSocketUrl(base, location = globalThis.location) {
  const value = typeof base === 'string' && base.trim() ? base.trim() : '/terminal';
  if (/^wss?:\/\//i.test(value)) return value.replace(/\/+$/, '') + (value.endsWith('/ws') ? '' : '/ws');
  if (/^https?:\/\//i.test(value)) return value.replace(/^http/i, 'ws').replace(/\/+$/, '') + '/ws';
  if (!location) throw new Error('A page location is needed to reach a same-origin terminal service.');
  const secure = location.protocol === 'https:', local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!secure && !(location.protocol === 'http:' && local)) throw new Error('HTTPS is required outside local development.');
  return (secure ? 'wss:' : 'ws:') + '//' + location.host + '/' + value.replace(/^\/+|\/+$/g, '') + '/ws';
}

/** What a machine can reach, for its status line: nothing, or the listed sites and perhaps the filtered web. */
export const remoteReach = network => {
  const sites = Array.isArray(network?.sites) ? network.sites.filter(site => typeof site === 'string' && /^[a-z0-9.-]{1,253}$/.test(site)).slice(0, 12) : [];
  if (!sites.length || !['sites', 'filtered'].includes(network.mode)) return ' with no internet.';
  return '. It can reach ' + sites.join(', ') + (network.mode === 'filtered' ? ' and other websites through a family-safe filter.' : ' and no other site.');
};
/** The screen socket of a desktop machine: the same service, path /desktop. */
export function remoteDesktopUrl(base, location = globalThis.location) {
  return remoteSocketUrl(base, location).replace(/\/ws$/, '/desktop');
}

export function remoteAssetUrl(base, path) {
  const value = typeof base === 'string' && base.trim() ? base.trim().replace(/\/+$/, '') : '/terminal';
  const origin = /^wss?:\/\//i.test(value) ? value.replace(/^ws/i, 'http') : value;
  return origin + '/' + String(path).replace(/^\/+/, '');
}

/** The browser's time zone name, so the machine's clock shows the learner's local time. */
export function browserTimeZone(intl = globalThis.Intl) {
  try {
    const zone = intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
    return typeof zone === 'string' && zone.length <= 64 && /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/.test(zone) ? zone : '';
  } catch {return '';}
}

/** One remote session. Handlers are optional; state is readable at any time. */
export function createRemoteSession({url, labId, screen = null, timeZone = browserTimeZone(), WebSocket:Socket = globalThis.WebSocket, onOutput = () => {}, onStatus = () => {}, onReady = () => {}, onMilestones = () => {}, onError = () => {}, onClose = () => {}, onShell = () => {}}) {
  if (typeof Socket !== 'function') throw new Error('WebSocket is not available in this browser.');
  if (typeof labId !== 'string' || !/^[A-Z]{2,5}-\d{3}$/.test(labId) || labId.length > LIMITS.lab) throw new Error('Choose a lab the terminal service hosts.');
  const state = {phase:'connecting', labId, alias:'', sessionId:'', lab:null, milestones:[], limits:null, desktop:null, shell:'none', typed:false, verified:false, complete:false, error:''};
  let ws;
  try {ws = new Socket(url);} catch {throw new Error('The terminal service could not be reached.');}
  const send = payload => {if (ws.readyState !== 1) return false; ws.send(JSON.stringify(payload)); return true;};
  const status = (phase, message) => {state.phase = phase; onStatus(phase, message, {...state});};
  const applyMilestones = list => {
    state.milestones = Array.isArray(list) ? list.filter(item => item && typeof item === 'object').map(item => ({id:String(item.id || '').slice(0, 64), title:String(item.title || '').slice(0, 160), description:String(item.description || '').slice(0, 400), hint:String(item.hint || '').slice(0, 400), completed:item.completed === true})) : [];
    state.complete = state.milestones.length > 0 && state.milestones.every(item => item.completed);
    onMilestones(state.milestones.map(item => ({...item})), state.complete);
  };
  // Typed input waiting to be sent; at most one message per inputGapMs and at
  // most inputBytesPerSecond (the service allows 60 messages and 32 KiB a second).
  let pendingInput = '', inputTimer = null;
  const byteLength = text => typeof TextEncoder === 'function' ? new TextEncoder().encode(text).length : text.length * 3;
  function flushInput() {
    inputTimer = null;
    if (!pendingInput || ws.readyState !== 1) {pendingInput = ''; return;}
    let chunk = pendingInput.slice(0, 1024);
    while (byteLength(chunk) > LIMITS.input) chunk = chunk.slice(0, Math.floor(chunk.length / 2));
    // Never split a surrogate pair between two messages.
    if (chunk.length < pendingInput.length && /[\ud800-\udbff]$/.test(chunk)) chunk = chunk.slice(0, -1);
    pendingInput = pendingInput.slice(chunk.length);
    send({type:'terminal:input', data:chunk});
    inputTimer = setTimeout(flushInput, Math.max(LIMITS.inputGapMs, Math.ceil(byteLength(chunk) / LIMITS.inputBytesPerSecond * 1000)));
  }
  ws.addEventListener('open', () => {status('authenticating', 'Connecting to the lab machine…'); send({type:'auth', role:'student'});});
  ws.addEventListener('message', event => {
    let message;
    try {message = JSON.parse(typeof event.data === 'string' ? event.data : '');} catch {return;}
    if (!message || typeof message.type !== 'string') return;
    switch (message.type) {
      case 'auth:ok': state.alias = String(message.alias || '').slice(0, 64); status('starting', 'Starting your Linux machine. This takes about half a minute…'); send({type:'session:start', labId, mode:'self-paced', ...(screen && Number.isInteger(screen.width) && Number.isInteger(screen.height) ? {screen:{width:screen.width, height:screen.height}} : {}), ...(timeZone ? {timeZone} : {})}); break;
      case 'session:ready': state.sessionId = String(message.sessionId || '').slice(0, 64); state.lab = message.lab && typeof message.lab === 'object' ? {id:String(message.lab.id || ''), title:String(message.lab.title || '').slice(0, 160), minutes:Number(message.lab.minutes) || 0} : null; state.limits = message.limits && typeof message.limits === 'object' ? {memory:String(message.limits.memory || ''), cpus:String(message.limits.cpus || ''), inactivityTimeoutSeconds:Number(message.limits.inactivityTimeoutSeconds) || 0} : null; state.desktop = message.desktop && typeof message.desktop === 'object' && /^[a-f0-9]{32}$/.test(String(message.desktop.ticket)) && /^[A-Za-z0-9]{1,32}$/.test(String(message.desktop.password)) ? {ticket:String(message.desktop.ticket), password:String(message.desktop.password), width:Math.min(4096, Math.max(320, Number(message.desktop.width) || 1280)), height:Math.min(4096, Math.max(240, Number(message.desktop.height) || 800))} : null; state.reach = remoteReach(message.network); applyMilestones(message.milestones); status('ready', state.desktop ? 'Connected. This is a real Linux desktop on an isolated machine' + state.reach : 'Connected. This is a real Linux shell in an isolated container' + state.reach); onReady({...state}); break;
      case 'lab:switched': applyMilestones(message.milestones); status('ready', 'Lab ready.'); break;
      case 'terminal:output': if (typeof message.data === 'string') onOutput(message.data.slice(0, LIMITS.output)); break;
      case 'milestone:status': state.verified = true; applyMilestones(message.milestones); break;
      case 'ping': send({type:'pong'}); break;
      case 'terminal:opened': state.shell = 'open'; onShell('open'); break;
      case 'terminal:closed': state.shell = 'closed'; onShell('closed'); break;
      case 'session:terminated': status('ended', 'The machine was stopped (' + String(message.reason || 'session ended').replaceAll('_', ' ') + ').'); break;
      case 'error': state.error = String(message.message || message.code || 'error').slice(0, 200); onError(state.error, String(message.code || '')); break;
      default: break;
    }
  });
  ws.addEventListener('close', () => {clearTimeout(inputTimer); inputTimer = null; pendingInput = ''; if (state.phase !== 'ended') status('closed', 'Disconnected from the lab machine.'); onClose({...state});});
  ws.addEventListener('error', () => {state.error = state.error || 'The terminal service could not be reached.'; onError(state.error, 'connection');});
  return {
    state:() => ({...state, milestones:state.milestones.map(item => ({...item}))}),
    input(data) {
      if (typeof data !== 'string' || !data || ws.readyState !== 1) return false;
      state.typed = true;
      // Keys typed quickly, a held key or a paste are combined and paced, so the
      // service's message and byte limits (which end the session) are never hit.
      pendingInput = (pendingInput + data).slice(0, LIMITS.queuedInput);
      if (!inputTimer) flushInput();
      return true;
    },
    resize(cols, rows) {if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 20 || rows < 5 || cols > 500 || rows > 200) return false; return send({type:'terminal:resize', cols, rows});},
    verify() {return send({type:'milestone:verify'});},
    /** Desktop machines: open the text terminal (a login shell on the same machine). */
    openShell() {return send({type:'terminal:open'});},
    close() {try {ws.close(1000, 'Lab closed');} catch {}}
  };
}
