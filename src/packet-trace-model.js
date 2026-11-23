// Trace a packet: a small hop-by-hop model of the tech fair's network.
// A learner picks a destination, changes one setting, sends one packet and steps through every
// device it meets. Each step shows what the device does and what the frame and IP headers hold.
// Everything is fixed and fictional: documentation-style addresses, no real packet, no capture.
// This is practice. It keeps no record and never completes a mission.
const option = (value, label) => Object.freeze([value, label]);
const control = (name, label, options, help) => Object.freeze({name, label, options:Object.freeze(options), help});

export const TRACE_DEVICES = Object.freeze({
  laptop:{label:'Crew laptop', ip:'10.40.8.71', mac:'02:00:00:00:08:71'},
  kiosk:{label:'Booth kiosk', ip:'10.40.8.70', mac:'02:00:00:00:08:70'},
  boothSwitch:{label:'Booth switch'},
  gatewayNear:{label:'Gateway, booth side', ip:'10.40.8.65', mac:'02:00:00:00:08:65'},
  gatewayFar:{label:'Gateway, fair side', ip:'10.20.0.1', mac:'02:00:00:00:20:01'},
  coreSwitch:{label:'Fair switch'},
  scoreboard:{label:'Scoreboard server', ip:'10.20.0.30', mac:'02:00:00:00:20:30'},
  names:{label:'Name server', ip:'10.20.0.53', mac:'02:00:00:00:20:53'},
  staff:{label:'Staff files', ip:'10.20.0.90', mac:'02:00:00:00:20:90'}
});
export const TRACE_CONTROLS = Object.freeze([
  control('destination', 'Send the packet to', [option('kiosk', 'The booth kiosk, 10.40.8.70 (same network)'), option('scoreboard', 'The scoreboard by address, 10.20.0.30'), option('name', 'The scoreboard by name, scores.fair.example'), option('staff', 'The staff files, 10.20.0.90')], 'Where the packet is meant to end up.'),
  control('cable', 'Laptop cable', [option('in', 'Plugged into the booth switch'), option('out', 'Unplugged')], 'The first link the packet has to cross.'),
  control('gateway', 'Laptop gateway setting', [option('10.40.8.65', '10.40.8.65 (the gateway)'), option('10.40.8.1', '10.40.8.1 (nothing has this address)')], 'Where the laptop sends anything that is not on its own network.'),
  control('dns', 'Laptop name server setting', [option('10.20.0.53', '10.20.0.53 (the name server)'), option('10.20.0.99', '10.20.0.99 (nothing has this address)')], 'Who the laptop asks to turn a name into an address.'),
  control('ttl', 'Starting hop allowance (TTL)', [option('64', '64 (normal)'), option('1', '1 (runs out at the first router)')], 'Each router takes one away. At zero the packet is dropped.')
]);
export const TRACE_PREDICTIONS = Object.freeze([option('delivered', 'It is delivered'), option('laptop', 'It never leaves the laptop'), option('gateway', 'The gateway drops it')]);
export const TRACE_GOALS = Object.freeze([
  {id:'local', label:'Deliver a packet where the frame addresses never change.'},
  {id:'routed', label:'Deliver a packet where the frame addresses change but the IP addresses stay the same.'},
  {id:'name', label:'Deliver a packet that needed a name lookup first.'},
  {id:'no-link', label:'Make a packet that never leaves the laptop.'},
  {id:'no-gateway', label:'Make a packet that stops because the laptop cannot find its next hop.'},
  {id:'expired', label:'Make a packet that runs out of hops.'},
  {id:'blocked', label:'Send a packet that a rule blocks.'}
]);

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export function initialTraceState() {return {config:Object.fromEntries(TRACE_CONTROLS.map(item => [item.name, item.options[0][0]])), predict:'', sent:false, step:0, done:[]};}
export function normalizeTraceState(saved) {
  const state = initialTraceState();
  if (!plain(saved)) return state;
  for (const item of TRACE_CONTROLS) if (plain(saved.config) && Object.hasOwn(saved.config, item.name) && item.options.some(([value]) => value === saved.config[item.name])) state.config[item.name] = saved.config[item.name];
  if (TRACE_PREDICTIONS.some(([value]) => value === saved.predict)) state.predict = saved.predict;
  state.sent = saved.sent === true;
  const last = tracePacket(state.config).steps.length - 1;
  if (state.sent && Number.isSafeInteger(saved.step)) state.step = Math.min(Math.max(saved.step, 0), last);
  if (Array.isArray(saved.done)) state.done = TRACE_GOALS.map(goal => goal.id).filter(id => saved.done.includes(id));
  return state;
}

const D = TRACE_DEVICES;
const inBooth = ip => /^10\.40\.8\.(?:6[5-9]|[7-9]\d|1[01]\d|12[0-6])$/u.test(ip);
/** Every hop of one packet for one setup: what each device does and the headers it sees. */
export function tracePacket(config) {
  const steps = [], ttl = Number(config.ttl);
  const add = (device, title, text, {frame = null, ip = null, layer = '', changed = [], stop = false} = {}) => steps.push({device, title, text, frame, ip, layer, changed, stop});
  const finish = (outcome, reason, goal = '') => ({steps, outcome, reason, goal, delivered:outcome === 'delivered'});
  const target = {kiosk:D.kiosk, scoreboard:D.scoreboard, name:D.scoreboard, staff:D.staff}[config.destination];
  if (config.cable === 'out') {
    add('laptop', 'The laptop has no link', 'The cable is unplugged, so there is nowhere to send a frame. Nothing leaves the laptop.', {layer:'Link', stop:true});
    return finish('laptop', 'The laptop’s cable is unplugged.', 'no-link');
  }
  const nextHopKnown = config.gateway === D.gatewayNear.ip;
  if (config.destination === 'name') {
    add('laptop', 'The laptop needs an address', 'A packet cannot be addressed to a name. The laptop first asks its name server, ' + config.dns + ', for the address of scores.fair.example.', {layer:'Application'});
    if (!nextHopKnown) {
      add('laptop', 'The laptop cannot find its next hop', 'The name server is on another network, so the question has to go to the gateway. The laptop asks “who has ' + config.gateway + '?” and nobody answers.', {layer:'Link', stop:true});
      return finish('laptop', 'The gateway setting points at an address nothing has, so even the name lookup cannot leave.', 'no-gateway');
    }
    if (config.dns !== D.names.ip) {
      add('gatewayNear', 'The question goes out and nothing answers', 'The gateway forwards the question toward ' + config.dns + '. No device has that address, so no answer comes back.', {layer:'Internet', stop:true});
      return finish('laptop', 'The name was never turned into an address, so the laptop had nothing to send the packet to.');
    }
    add('names', 'The name server answers', 'scores.fair.example is ' + D.scoreboard.ip + '. Now the laptop can address the packet.', {layer:'Application'});
  }
  const ip = {src:D.laptop.ip, dst:target.ip, ttl};
  if (inBooth(target.ip)) {
    add('laptop', 'Same network: send it straight there', target.ip + ' is on the laptop’s own network, so no gateway is needed. The laptop asks “who has ' + target.ip + '?”, learns the kiosk’s hardware address and puts that on the frame.', {layer:'Link', frame:{src:D.laptop.mac, dst:target.mac}, ip:{...ip}});
    add('boothSwitch', 'The switch forwards the frame', 'The switch reads the frame’s destination hardware address and sends the frame out of the kiosk’s port. It does not look at the IP addresses and changes nothing.', {layer:'Link', frame:{src:D.laptop.mac, dst:target.mac}, ip:{...ip}});
    add('kiosk', 'Delivered', 'The kiosk sees its own hardware address on the frame and its own IP address in the packet, and accepts it. The frame addresses never changed.', {layer:'Internet', frame:{src:D.laptop.mac, dst:target.mac}, ip:{...ip}, stop:true});
    return finish('delivered', 'The destination was on the same network, so the packet went straight there.', 'local');
  }
  add('laptop', 'Another network: find the next hop', target.ip + ' is not on the laptop’s network, so the packet goes to the gateway setting, ' + config.gateway + '. The IP destination is still ' + target.ip + '.', {layer:'Internet', ip:{...ip}});
  if (!nextHopKnown) {
    add('laptop', 'The laptop cannot find its next hop', 'The laptop asks “who has ' + config.gateway + '?” and nobody answers. With no hardware address for the next hop, it cannot build a frame.', {layer:'Link', ip:{...ip}, stop:true});
    return finish('laptop', 'The gateway setting points at an address nothing has.', 'no-gateway');
  }
  const first = {src:D.laptop.mac, dst:D.gatewayNear.mac};
  add('laptop', 'Frame addressed to the gateway', 'The laptop learns the gateway’s hardware address and puts it on the frame. The frame is addressed to the gateway; the packet inside is still addressed to ' + target.ip + '.', {layer:'Link', frame:first, ip:{...ip}});
  add('boothSwitch', 'The switch forwards the frame', 'The switch reads the frame’s destination hardware address and sends the frame out of the gateway’s port. Nothing changes.', {layer:'Link', frame:first, ip:{...ip}});
  if (config.destination === 'staff') {
    add('gatewayNear', 'The gateway’s rule blocks it', 'The gateway opens the frame, reads the IP destination and checks its rules. Booth devices may not reach the staff files, so the packet is dropped here.', {layer:'Internet', frame:first, ip:{...ip}, stop:true});
    return finish('gateway', 'A gateway rule blocks the booth from the staff files.', 'blocked');
  }
  if (ttl <= 1) {
    add('gatewayNear', 'Out of hops', 'The gateway takes one from the hop allowance. It reaches zero, so the gateway drops the packet and tells the laptop “time exceeded”.', {layer:'Internet', frame:first, ip:{...ip, ttl:0}, changed:['ttl'], stop:true});
    return finish('gateway', 'The hop allowance ran out at the first router.', 'expired');
  }
  const second = {src:D.gatewayFar.mac, dst:target.mac}, onward = {...ip, ttl:ttl - 1};
  add('gatewayNear', 'The gateway opens the frame', 'The frame was addressed to the gateway, so it takes the packet out, reads the IP destination and picks the way onward. It takes one from the hop allowance: ' + ttl + ' becomes ' + (ttl - 1) + '.', {layer:'Internet', frame:first, ip:onward, changed:['ttl']});
  add('gatewayFar', 'A new frame for the next link', 'The gateway wraps the same packet in a new frame for the fair’s network: from its own fair-side hardware address to the server’s. The IP addresses have not changed.', {layer:'Link', frame:second, ip:onward, changed:['frame']});
  add('coreSwitch', 'The switch forwards the frame', 'The fair switch reads the new frame’s destination hardware address and sends it out of the server’s port.', {layer:'Link', frame:second, ip:onward});
  add('scoreboard', 'Delivered', 'The server accepts the frame and the packet. Compare the first frame with this one: both hardware addresses changed at the gateway, and both IP addresses stayed the same from end to end.', {layer:'Internet', frame:second, ip:onward, stop:true});
  return finish('delivered', 'The packet crossed the gateway. The frame was rewritten for the second link; the IP addresses were not.', config.destination === 'name' ? 'name' : 'routed');
}

const OUTCOME_TEXT = Object.freeze({delivered:'Delivered', laptop:'Stopped at the laptop', gateway:'Dropped at the gateway'});
export const traceOutcomeText = outcome => OUTCOME_TEXT[outcome] || '';
/** Everything the page shows for the present state. */
export function traceView(saved) {
  const state = normalizeTraceState(saved), trace = tracePacket(state.config), current = state.sent ? trace.steps[state.step] : null, atEnd = state.sent && state.step === trace.steps.length - 1;
  const onPath = new Set(state.sent ? trace.steps.slice(0, state.step + 1).map(step => step.device) : []);
  const node = (id, label, x, y) => [id, label, x, y, current?.device === id ? (current.stop && !trace.delivered ? 'warn' : 'on') : id === 'laptop' && state.config.cable === 'out' ? 'off' : ''];
  const scene = {nodes:[node('laptop', 'Laptop .71', 70, 50), node('kiosk', 'Kiosk .70', 70, 210), node('boothSwitch', 'Booth switch', 195, 130), node('gatewayNear', 'Gateway .65', 320, 75), node('gatewayFar', 'Gateway .1', 320, 190), node('coreSwitch', 'Fair switch', 440, 130), node('scoreboard', 'Scoreboard .30', 560, 45), node('names', 'Names .53', 560, 130), node('staff', 'Staff files .90', 560, 215)],
    links:[...(state.config.cable === 'in' ? [['laptop', 'boothSwitch', '']] : []), ['kiosk', 'boothSwitch', ''], ['boothSwitch', 'gatewayNear', ''], ['gatewayNear', 'gatewayFar', 'one router'], ['gatewayFar', 'coreSwitch', ''], ['coreSwitch', 'scoreboard', ''], ['coreSwitch', 'names', ''], ['coreSwitch', 'staff', '']]};
  return {state, trace, current, atEnd, onPath, scene, steps:trace.steps.length,
    result:atEnd ? {outcome:trace.outcome, text:traceOutcomeText(trace.outcome), reason:trace.reason, predicted:state.predict ? {match:state.predict === trace.outcome, text:TRACE_PREDICTIONS.find(([value]) => value === state.predict)[1]} : null} : null,
    goals:TRACE_GOALS.map(goal => ({...goal, done:state.done.includes(goal.id)}))};
}

const result = (state, message, kind = 'info') => ({state, message, kind});
export function applyTraceAction(previous, action, value) {
  const state = normalizeTraceState(previous);
  if (action === 'set') {
    const item = plain(value) ? TRACE_CONTROLS.find(entry => entry.name === value.name) : null;
    if (!item || !item.options.some(([option]) => option === value.value)) return result(state, 'Choose a listed setting.', 'warning');
    state.config[item.name] = value.value; state.sent = false; state.step = 0;
    return result(state, 'Setup changed. Send a new packet to see what happens.');
  }
  if (action === 'predict') {if (!TRACE_PREDICTIONS.some(([option]) => option === value)) return result(state, 'Choose a listed prediction.', 'warning'); if (state.sent) return result(state, 'This packet is already on its way. Your prediction is kept for it.'); state.predict = value; return result(state, 'Prediction noted.');}
  const trace = tracePacket(state.config), last = trace.steps.length - 1;
  if (action === 'send') {state.sent = true; state.step = 0;}
  else if (!state.sent) return result(state, 'Send a packet first.', 'warning');
  else if (action === 'next') state.step = Math.min(state.step + 1, last);
  else if (action === 'back') state.step = Math.max(state.step - 1, 0);
  else if (action === 'end') state.step = last;
  else return result(state, 'Choose a displayed control.');
  const step = trace.steps[state.step];
  if (state.step === last) {
    if (trace.goal && !state.done.includes(trace.goal)) state.done = TRACE_GOALS.map(goal => goal.id).filter(id => id === trace.goal || state.done.includes(id));
    return result(state, 'Step ' + (state.step + 1) + ' of ' + trace.steps.length + ': ' + step.title + '. ' + traceOutcomeText(trace.outcome) + ': ' + trace.reason, trace.delivered ? 'success' : 'warning');
  }
  return result(state, 'Step ' + (state.step + 1) + ' of ' + trace.steps.length + ': ' + step.title + '.');
}
