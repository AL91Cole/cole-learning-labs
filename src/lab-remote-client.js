// Browser client for the optional real-machine terminal service. It speaks the
// service's existing WebSocket protocol: authenticate as a student, start a
// self-paced session for one lab, relay keystrokes and output, resize, and ask
// the service to verify its milestones. The module has no DOM dependency so it
// can be tested with a fake WebSocket. Only the lab id, keystrokes and sizes
// are sent; no name, email or device detail.
const LIMITS = Object.freeze({input:4096, output:65536, lab:32});

export function remoteSocketUrl(base, location = globalThis.location) {
  const value = typeof base === 'string' && base.trim() ? base.trim() : '/terminal';
  if (/^wss?:\/\//i.test(value)) return value.replace(/\/+$/, '') + (value.endsWith('/ws') ? '' : '/ws');
  if (/^https?:\/\//i.test(value)) return value.replace(/^http/i, 'ws').replace(/\/+$/, '') + '/ws';
  if (!location) throw new Error('A page location is needed to reach a same-origin terminal service.');
  const secure = location.protocol === 'https:', local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!secure && !(location.protocol === 'http:' && local)) throw new Error('HTTPS is required outside local development.');
  return (secure ? 'wss:' : 'ws:') + '//' + location.host + '/' + value.replace(/^\/+|\/+$/g, '') + '/ws';
}

export function remoteAssetUrl(base, path) {
  const value = typeof base === 'string' && base.trim() ? base.trim().replace(/\/+$/, '') : '/terminal';
  const origin = /^wss?:\/\//i.test(value) ? value.replace(/^ws/i, 'http') : value;
  return origin + '/' + String(path).replace(/^\/+/, '');
}

/** One remote session. Handlers are optional; state is readable at any time. */
export function createRemoteSession({url, labId, WebSocket:Socket = globalThis.WebSocket, onOutput = () => {}, onStatus = () => {}, onReady = () => {}, onMilestones = () => {}, onError = () => {}, onClose = () => {}}) {
  if (typeof Socket !== 'function') throw new Error('WebSocket is not available in this browser.');
  if (typeof labId !== 'string' || !/^[A-Z]{2,5}-\d{3}$/.test(labId) || labId.length > LIMITS.lab) throw new Error('Choose a lab the terminal service hosts.');
  const state = {phase:'connecting', labId, alias:'', sessionId:'', lab:null, milestones:[], limits:null, typed:false, verified:false, complete:false, error:''};
  let ws;
  try {ws = new Socket(url);} catch {throw new Error('The terminal service could not be reached.');}
  const send = payload => {if (ws.readyState !== 1) return false; ws.send(JSON.stringify(payload)); return true;};
  const status = (phase, message) => {state.phase = phase; onStatus(phase, message, {...state});};
  const applyMilestones = list => {
    state.milestones = Array.isArray(list) ? list.filter(item => item && typeof item === 'object').map(item => ({id:String(item.id || '').slice(0, 64), title:String(item.title || '').slice(0, 160), description:String(item.description || '').slice(0, 400), hint:String(item.hint || '').slice(0, 400), completed:item.completed === true})) : [];
    state.complete = state.milestones.length > 0 && state.milestones.every(item => item.completed);
    onMilestones(state.milestones.map(item => ({...item})), state.complete);
  };
  ws.addEventListener('open', () => {status('authenticating', 'Connecting to the lab machine…'); send({type:'auth', role:'student'});});
  ws.addEventListener('message', event => {
    let message;
    try {message = JSON.parse(typeof event.data === 'string' ? event.data : '');} catch {return;}
    if (!message || typeof message.type !== 'string') return;
    switch (message.type) {
      case 'auth:ok': state.alias = String(message.alias || '').slice(0, 64); status('starting', 'Starting your Linux machine…'); send({type:'session:start', labId, mode:'self-paced'}); break;
      case 'session:ready': state.sessionId = String(message.sessionId || '').slice(0, 64); state.lab = message.lab && typeof message.lab === 'object' ? {id:String(message.lab.id || ''), title:String(message.lab.title || '').slice(0, 160), minutes:Number(message.lab.minutes) || 0} : null; state.limits = message.limits && typeof message.limits === 'object' ? {memory:String(message.limits.memory || ''), cpus:String(message.limits.cpus || ''), inactivityTimeoutSeconds:Number(message.limits.inactivityTimeoutSeconds) || 0} : null; applyMilestones(message.milestones); status('ready', 'Connected. This is a real Linux shell in an isolated container.'); onReady({...state}); break;
      case 'lab:switched': applyMilestones(message.milestones); status('ready', 'Lab ready.'); break;
      case 'terminal:output': if (typeof message.data === 'string') onOutput(message.data.slice(0, LIMITS.output)); break;
      case 'milestone:status': state.verified = true; applyMilestones(message.milestones); break;
      case 'ping': send({type:'pong'}); break;
      case 'session:terminated': status('ended', 'The machine was stopped (' + String(message.reason || 'session ended').replaceAll('_', ' ') + ').'); break;
      case 'error': state.error = String(message.message || message.code || 'error').slice(0, 200); onError(state.error, String(message.code || '')); break;
      default: break;
    }
  });
  ws.addEventListener('close', () => {if (state.phase !== 'ended') status('closed', 'Disconnected from the lab machine.'); onClose({...state});});
  ws.addEventListener('error', () => {state.error = state.error || 'The terminal service could not be reached.'; onError(state.error, 'connection');});
  return {
    state:() => ({...state, milestones:state.milestones.map(item => ({...item}))}),
    input(data) {if (typeof data !== 'string' || !data) return false; state.typed = true; return send({type:'terminal:input', data:data.slice(0, LIMITS.input)});},
    resize(cols, rows) {if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 20 || rows < 5 || cols > 500 || rows > 200) return false; return send({type:'terminal:resize', cols, rows});},
    verify() {return send({type:'milestone:verify'});},
    close() {try {ws.close(1000, 'Lab closed');} catch {}}
  };
}
