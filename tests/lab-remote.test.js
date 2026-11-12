import test from 'node:test';
import assert from 'node:assert/strict';
import {createRemoteSession, remoteSocketUrl, remoteDesktopUrl, remoteAssetUrl} from '../src/lab-remote-client.js';
import {preferredLabEnvironment, listLabEnvironments, DEFAULT_LAB_ENVIRONMENT} from '../src/lab-environment.js?release=20261107-tech-team';
import {LAB_ENVIRONMENT_CONFIG} from '../src/lab-environment-config.js';
import {remoteLabFor, renderLabRemote, probeRemoteService, remoteServiceState, setRemoteServiceState, remoteServiceAvailable, remoteServiceHosts, setRemoteHostedLabs} from '../src/lab-remote.js?release=20261107-tech-team';
import {labGuide, labGuideFacts, renderLabGuidePage} from '../src/lab-guide.js?release=20261107-tech-team';
import {readFileSync} from 'node:fs';
import {normalizeLabRecord, workbenchProgress} from '../src/records.js';
import {SCENARIOS} from '../src/scenarios.js';

const byId = id => SCENARIOS.find(item => item.id === id);

class FakeSocket {
  static instances = [];
  constructor(url) {this.url = url; this.readyState = 0; this.sent = []; this.listeners = new Map(); FakeSocket.instances.push(this);}
  addEventListener(name, handler) {this.listeners.set(name, [...(this.listeners.get(name) || []), handler]);}
  emit(name, event = {}) {for (const handler of this.listeners.get(name) || []) handler(event);}
  open() {this.readyState = 1; this.emit('open');}
  receive(message) {this.emit('message', {data:JSON.stringify(message)});}
  send(data) {this.sent.push(JSON.parse(data));}
  close() {this.readyState = 3; this.emit('close');}
}

test('the configuration names the real machines but labs keep the simulated desktop until the service reports enabled', () => {
  assert.equal(LAB_ENVIRONMENT_CONFIG.environment, 'remote-terminal');
  assert.equal(LAB_ENVIRONMENT_CONFIG.remote.base, '/terminal', 'same-origin through the Pages gateway keeps the Content-Security-Policy as it is');
  const wanted = SCENARIOS.filter(item => ['network', 'security', 'coding'].includes(item.track)).map(item => item.id).sort();
  const listed = Object.keys(LAB_ENVIRONMENT_CONFIG.remote.labs).sort();
  assert.deepEqual(listed.filter(id => !id.startsWith('LNX-')), wanted, 'every networking, security and coding lab is listed');
  assert.deepEqual(listed.filter(id => id.startsWith('LNX-')), ['LNX-101', 'LNX-102', 'LNX-103', 'LNX-104', 'LNX-105'], 'and the Linux basics course');
  assert.equal(wanted.length, 28);
  assert.deepEqual(listLabEnvironments().map(item => item.id).sort(), ['remote-terminal', 'simulated-desktop']);
  assert.equal(remoteServiceState(), 'unknown', 'Node never probes the service on import');
  assert.equal(preferredLabEnvironment(undefined, byId('CODE-501')).id, DEFAULT_LAB_ENVIRONMENT, 'unknown service: simulated desktop');
  setRemoteServiceState('unavailable');
  assert.equal(preferredLabEnvironment(undefined, byId('CODE-501')).id, DEFAULT_LAB_ENVIRONMENT, 'service down: simulated desktop');
  setRemoteServiceState('enabled');
  assert.equal(remoteServiceAvailable(), true);
  assert.equal(preferredLabEnvironment(undefined, byId('CODE-501')).id, 'remote-terminal', 'service enabled: the configured real machine');
  assert.equal(preferredLabEnvironment('remote-terminal', byId('CODE-501')).id, 'remote-terminal', 'a hosted lab can use the real machine');
  assert.equal(preferredLabEnvironment('remote-terminal', byId('INC-101')).id, DEFAULT_LAB_ENVIRONMENT, 'a hardware lab keeps its own format');
  setRemoteHostedLabs(['NET-201', 'SEC-402', 'CODE-501']);
  assert.equal(remoteServiceHosts('CODE-501'), true);
  assert.equal(preferredLabEnvironment(undefined, byId('CODE-502')).id, DEFAULT_LAB_ENVIRONMENT, 'a lab the running service does not list stays simulated');
  assert.equal(preferredLabEnvironment(undefined, byId('CODE-501')).id, 'remote-terminal');
  setRemoteHostedLabs(null);
  assert.equal(preferredLabEnvironment(undefined, byId('CODE-502')).id, 'remote-terminal', 'without a list from the service the configured labs are trusted');
  assert.equal(preferredLabEnvironment(undefined, byId('AI-301')).id, DEFAULT_LAB_ENVIRONMENT, 'labs the service does not host stay simulated');
  assert.equal(remoteLabFor(byId('NET-201')), 'NET-201'); assert.equal(remoteLabFor(byId('AI-301')), null);
  setRemoteServiceState('unknown');
});

test('the health probe enables the real machines only for an enabled service and fails closed otherwise', async () => {
  const calls = [];
  const fetchWith = reply => async (url, init) => {calls.push({url, init}); return reply();};
  const service = async (url, init) => {calls.push({url, init}); return url.endsWith('/api/labs') ? new Response(JSON.stringify({labs:[{id:'NET-201'}, {id:'CODE-501'}]}), {status:200}) : new Response(JSON.stringify({status:'enabled', runtime:'docker-cloud-desktop'}), {status:200});};
  assert.equal(await probeRemoteService({force:true, fetch:service}), 'enabled');
  assert.deepEqual(calls.map(call => call.url), ['/terminal/api/health', '/terminal/api/labs'], 'an enabled service is then asked which labs it hosts');
  assert.equal(calls[0].init.credentials, 'omit'); assert.equal(calls[1].init.credentials, 'omit');
  assert.equal(remoteServiceHosts('CODE-501'), true); assert.equal(remoteServiceHosts('CODE-502'), false, 'a lab the server does not list is not sent to it');
  assert.equal(await probeRemoteService({force:true, fetch:async url => url.endsWith('/api/labs') ? new Response('nope', {status:500}) : new Response('{"status":"enabled"}', {status:200})}), 'enabled');
  assert.equal(remoteServiceHosts('CODE-502'), true, 'when the list cannot be read the configured labs are trusted');
  calls.length = 0; calls.push({});
  assert.equal(await probeRemoteService({force:true, fetch:fetchWith(() => new Response(JSON.stringify({status:'disabled'}), {status:200}))}), 'unavailable', 'a deployed but disabled service keeps the simulated desktop');
  assert.equal(await probeRemoteService({force:true, fetch:fetchWith(() => new Response(JSON.stringify({error:'terminal_unavailable'}), {status:503}))}), 'unavailable', 'the gateway without a controller');
  assert.equal(await probeRemoteService({force:true, fetch:fetchWith(() => {throw new Error('offline');})}), 'unavailable');
  assert.equal(await probeRemoteService({force:true, fetch:fetchWith(() => new Response('<html>', {status:200}))}), 'unavailable', 'a non-JSON answer is not a service');
  const cached = probeRemoteService({fetch:fetchWith(() => new Response('{"status":"enabled"}', {status:200}))});
  assert.equal(await cached, 'unavailable', 'without force the earlier probe result is reused');
  assert.equal(calls.length, 5);
  assert.equal(await probeRemoteService({force:true, fetch:undefined}), 'unavailable', 'no fetch at all fails closed');
  setRemoteServiceState('unknown'); setRemoteHostedLabs(null);
});

test('a desktop machine is announced with a ticket and password, and its screen socket is the /desktop path', () => {
  const location = {protocol:'https:', host:'labs.example.test', hostname:'labs.example.test'};
  assert.equal(remoteDesktopUrl('/terminal', location), 'wss://labs.example.test/terminal/desktop');
  assert.equal(remoteDesktopUrl('https://terminal.example.test', location), 'wss://terminal.example.test/desktop');
  FakeSocket.instances.length = 0;
  const statuses = [];
  const session = createRemoteSession({url:'wss://labs.example.test/terminal/ws', labId:'NET-205', WebSocket:FakeSocket, onStatus:(phase, message) => statuses.push(message)});
  const socket = FakeSocket.instances[0];
  socket.open(); socket.receive({type:'auth:ok', role:'student', alias:'Comet-12'});
  socket.receive({type:'session:ready', sessionId:'abc', lab:{id:'NET-205', title:'The Stalled Print Queue', minutes:20}, limits:{memory:'4096m', cpus:'2', inactivityTimeoutSeconds:300}, milestones:[], desktop:{ticket:'a'.repeat(32), password:'Abcd1234', width:1280, height:800, url:'wss://should-be-ignored.example'}});
  assert.deepEqual(session.state().desktop, {ticket:'a'.repeat(32), password:'Abcd1234', width:1280, height:800}, 'only the expected fields are kept');
  assert.match(statuses.at(-1), /real Linux desktop/);
  FakeSocket.instances.length = 0;
  const bad = createRemoteSession({url:'wss://labs.example.test/terminal/ws', labId:'NET-205', WebSocket:FakeSocket});
  FakeSocket.instances[0].open(); FakeSocket.instances[0].receive({type:'auth:ok'});
  FakeSocket.instances[0].receive({type:'session:ready', milestones:[], desktop:{ticket:'not-a-ticket', password:'x y'}});
  assert.equal(bad.state().desktop, null, 'a malformed desktop announcement is treated as a terminal session');
  const html = renderLabRemote(byId('NET-205'));
  assert.match(html, /aria-label="Linux machine screen"/); assert.match(html, /no internet access/);
  assert.match(html, /Cloudflare.*DigitalOcean.*Docker-hosted machine/u);
  assert.match(html, /files and command history are processed remotely/u);
  assert.match(html, /Use fictional details only/u);
  assert.match(html, /href="\/#privacy"/u);
  assert.match(html, /requests deletion on Stop, disconnect or timeout/u);
  assert.doesNotMatch(html, /erased when you leave|Only the lab id/u);
});

test('service URLs stay same-origin by default and accept a separate origin when configured', () => {
  const location = {protocol:'https:', host:'labs.example.test', hostname:'labs.example.test'};
  assert.equal(remoteSocketUrl('/terminal', location), 'wss://labs.example.test/terminal/ws');
  assert.equal(remoteSocketUrl('https://terminal.example.test', location), 'wss://terminal.example.test/ws');
  assert.equal(remoteSocketUrl('wss://terminal.example.test/ws', location), 'wss://terminal.example.test/ws');
  assert.equal(remoteSocketUrl('/terminal', {protocol:'http:', host:'localhost:4173', hostname:'localhost'}), 'ws://localhost:4173/terminal/ws');
  assert.throws(() => remoteSocketUrl('/terminal', {protocol:'http:', host:'school.example.test', hostname:'school.example.test'}), /HTTPS is required/);
  assert.equal(remoteAssetUrl('/terminal', 'vendor/xterm/xterm.js'), '/terminal/vendor/xterm/xterm.js');
  assert.equal(remoteAssetUrl('wss://terminal.example.test', '/vendor/xterm/xterm.css'), 'https://terminal.example.test/vendor/xterm/xterm.css');
});

test('the client speaks the terminal service protocol and reports milestones without sending anything but lab, keys and sizes', () => {
  FakeSocket.instances.length = 0;
  const events = [];
  const session = createRemoteSession({url:'wss://labs.example.test/terminal/ws', labId:'CODE-501', WebSocket:FakeSocket, onStatus:(phase, message) => events.push(['status', phase]), onOutput:data => events.push(['output', data]), onReady:state => events.push(['ready', state.lab?.id]), onMilestones:(list, complete) => events.push(['milestones', list.map(item => item.completed), complete]), onError:(message, code) => events.push(['error', code])});
  const socket = FakeSocket.instances[0];
  assert.equal(session.input('ls\r'), false, 'nothing is sent before the socket opens');
  socket.open();
  assert.deepEqual(socket.sent, [{type:'auth', role:'student'}]);
  socket.receive({type:'auth:ok', role:'student', alias:'Comet-12'});
  assert.deepEqual(socket.sent[1], {type:'session:start', labId:'CODE-501', mode:'self-paced'});
  socket.receive({type:'session:ready', sessionId:'abc', lab:{id:'CODE-501', title:'The Supply Calculator (real Python)', minutes:20}, limits:{memory:'512m', cpus:'0.5', inactivityTimeoutSeconds:900}, milestones:[{id:'m1', title:'Read', completed:false}, {id:'m3', title:'Pass', completed:false}]});
  assert.equal(session.state().phase, 'ready'); assert.equal(session.state().alias, 'Comet-12'); assert.equal(session.state().limits.memory, '512m');
  socket.receive({type:'terminal:output', data:'learner@lab:~$ '});
  assert.ok(session.input('cat program.py\r')); assert.equal(session.state().typed, true);
  assert.ok(session.resize(100, 30)); assert.equal(session.resize(5, 2), false);
  socket.receive({type:'ping'});
  assert.ok(session.verify());
  socket.receive({type:'milestone:status', milestones:[{id:'m1', title:'Read', completed:true}, {id:'m3', title:'Pass', completed:true}]});
  assert.equal(session.state().verified, true); assert.equal(session.state().complete, true);
  socket.receive({type:'error', code:'capacity_reached', message:'capacity reached'});
  socket.receive({type:'session:terminated', reason:'inactivity_timeout'});
  socket.close();
  assert.deepEqual(socket.sent.map(item => item.type), ['auth', 'session:start', 'terminal:input', 'terminal:resize', 'pong', 'milestone:verify']);
  assert.ok(socket.sent.every(item => !('name' in item) && !('email' in item)));
  assert.deepEqual(events.filter(item => item[0] === 'milestones'), [['milestones', [false, false], false], ['milestones', [true, true], true]]);
  assert.ok(events.some(item => item[0] === 'ready' && item[1] === 'CODE-501'));
  assert.ok(events.some(item => item[0] === 'output' && item[1] === 'learner@lab:~$ '));
  assert.ok(events.some(item => item[0] === 'error' && item[1] === 'capacity_reached'));
  assert.equal(session.state().phase, 'ended');
  assert.throws(() => createRemoteSession({url:'wss://x', labId:'../etc', WebSocket:FakeSocket}), /Choose a lab/);
});

test('a real-machine lab drives the guide from its milestones and stands in for the workspace check', () => {
  const scenario = byId('CODE-501'), record = normalizeLabRecord(scenario, {});
  const remote = {active:true, labId:'CODE-501', phase:'ready', typed:true, verified:true, complete:false, milestones:[{id:'m1', title:'Read program.py', description:'Open the program.', hint:'cat program.py', completed:true}, {id:'m3', title:'Every fixture passes', description:'', hint:'', completed:false}]};
  const facts = labGuideFacts(scenario, record, {remote});
  assert.equal(facts.terminal, true); assert.equal(facts.edited, true); assert.equal(facts.tested, true); assert.equal(facts.works, false);
  const section = labGuide(scenario, facts).sections[1];
  assert.deepEqual(section.steps.map(step => step.id), ['remote-start', 'remote-m1', 'remote-m3', 'remote-check']);
  assert.deepEqual(section.steps.map(step => step.done), [true, true, false, true]);
  assert.equal(section.steps[1].detail, 'Open the program. cat program.py');
  const done = labGuideFacts(scenario, record, {remote:{...remote, complete:true, milestones:remote.milestones.map(item => ({...item, completed:true}))}});
  assert.equal(done.works, true);
  assert.equal(labGuide(scenario, done).sections[1].complete, true);
  const progress = workbenchProgress(scenario, {...record, verified:true}, {ok:true, message:'verified on the machine', remote:true});
  assert.equal(progress.passed, true, 'a remote result replaces the simulated workspace check');
  assert.equal(workbenchProgress(scenario, {...record, verified:true}, {ok:false, message:'not yet', remote:true}).passed, false);
  const html = renderLabRemote(scenario);
  assert.ok(html.includes('data-remote-start') && html.includes('Real Linux machine · CODE-501') && html.includes('/terminal'));
  assert.ok(!html.includes('<script'));
});

test('a lab rendered before the health check answers switches to the real machine once the service reports enabled', () => {
  const scenario = byId('CODE-501'), record = normalizeLabRecord(scenario, {});
  setRemoteServiceState('unknown');
  const before = renderLabGuidePage(scenario, record, {trackName:'Coding'});
  assert.ok(!before.includes('data-lab-remote'), 'unknown service: the simulated desktop renders first');
  assert.match(before, /Open Terminal on the desktop to begin/);
  setRemoteServiceState('enabled');
  const after = renderLabGuidePage(scenario, record, {trackName:'Coding'});
  assert.ok(after.includes('data-lab-remote'), 'the same lab renders the real machine on the next render');
  assert.match(after, /Press Start machine to open your Linux machine/);
  assert.ok(!after.includes('Open Terminal on the desktop to begin'), 'the starting hint matches the environment');
  setRemoteServiceState('unknown');
  const guide = readFileSync(new URL('../src/lab-guide.js', import.meta.url), 'utf8'), app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(guide, /provider\?\.id === DEFAULT_LAB_ENVIRONMENT && remoteLabFor\(s\) !== null && remoteServiceState\(\) === 'unknown'\)\n\s+probeRemoteService\(\)\.then\(state => \{if \(state === 'enabled' && !signal\.aborted && !touched && !desktop\.hasUnsavedDraft\?\.\(\)\) onEnvironmentAvailable\(\);\}\)/, 'the guide asks for a re-render only when the learner has not started on the simulated desktop');
  assert.match(app, /onEnvironmentAvailable:\(\)=>\{if\(currentLab===s\)renderRoute\(false\);\}/, 'the app re-renders the lab that is still open');
});
