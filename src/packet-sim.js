// Packet Simulator page (#networking/simulator). Two ways in: "Guide my first packet" and
// "Build my own network". The layout is the Network Studio layout, so a network edited here
// can be opened in Network Studio and one built there can be traced here.
// Native buttons, selects and text fields only: ports are chosen from labeled lists, nothing is
// dragged, and the map, the numbered events and the result are all drawn from the same run.
// Practice: nothing is saved, nothing is sent, and no run here touches a mission record.
import {NETWORK_DEVICE_TYPES, normalizeNetworkStudioState} from './network-studio-model.js?release=20261107-tech-team';
import {SIM_GOALS, SIM_GUIDE_PREDICTIONS, SIM_POLICIES, SIM_PREFIXES, SIM_STARTERS, SIM_TESTS, applyPacketSimAction, initialPacketSim, packetSimHasWork, simAddressing, simChecks, simRunIsCurrent, simServerName, simStarter} from './packet-sim-model.js?release=20261107-tech-team';
export {initialPacketSim, packetSimHasWork};

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const TYPE = new Map(NETWORK_DEVICE_TYPES.map(type => [type.id, type]));
const KIND = Object.freeze({pc:'Computer', switch:'Switch', router:'Router', server:'Server', 'access-point':'Access point', printer:'Printer'});
const OUTCOME = Object.freeze({delivered:['●', 'Delivered'], link:['■', 'Stopped: a link needs attention'], lookup:['◆', 'Stopped: the name lookup failed'], policy:['▲', 'Stopped: a policy decision'], expired:['■', 'Stopped: out of hops'], address:['■', 'Stopped: an address problem']});
/** Where a mission link came from: "FAIR-208.workbench" becomes a way back to that step. */
export function simReturn(from) {
  const match = /^(FAIR-\d{3})\.(request|workbench|explain)(?:\.(guided|independent|challenge))?$/u.exec(String(from || ''));
  return match ? {id:match[1], step:match[2], href:'#lab/' + match[1] + '/' + match[2] + '?mode=' + (match[3] || 'guided')} : null;
}
export const simLink = ({start = 'build', starter = '', from = ''} = {}) => '#networking/simulator?start=' + (start === 'guide' ? 'guide' : 'build') + (starter ? '&starter=' + encodeURIComponent(starter) : '') + (from ? '&from=' + encodeURIComponent(from) : '');

function mapHTML(layout, sim, tables) {
  const event = sim.run?.events[sim.step], attention = sim.run && sim.step === sim.run.events.length - 1 ? sim.run.outcome.attention : null, onPath = new Set((sim.run?.events || []).slice(0, sim.step + 1).map(item => item.device));
  const at = Object.fromEntries(layout.devices.map(device => [device.id, [device.x * 6.4, device.y * 3.6]]));
  const line = (a, b, cls, label) => '<line class="' + cls + '" x1="' + at[a][0] + '" y1="' + at[a][1] + '" x2="' + at[b][0] + '" y2="' + at[b][1] + '"/>' + (label ? '<text class="sim-map-note" x="' + (at[a][0] + at[b][0]) / 2 + '" y="' + ((at[a][1] + at[b][1]) / 2 - 8) + '" text-anchor="middle">' + esc(label) + '</text>' : '');
  const cables = layout.links.map(link => line(link.from, link.to, 'sim-link' + (event?.linkId === link.id ? ' is-live' : ''), '')).join('');
  const radio = Object.entries(sim.net.wifi).filter(([id, ap]) => at[id] && at[ap]).map(([id, ap]) => line(id, ap, 'sim-link is-wireless' + (event?.linkId === 'w' + id.slice(1) ? ' is-live' : ''), 'Wi-Fi')).join('');
  const gap = attention && attention.from !== attention.to && at[attention.from] && at[attention.to] ? line(attention.from, attention.to, 'sim-link is-missing', 'needs attention') : '';
  const nodes = layout.devices.map(device => {const here = event?.device === device.id, stopped = here && event.stop && !sim.run.outcome.delivered, label = device.label.length > 18 ? device.label.slice(0, 17) + '…' : device.label, [x, y] = at[device.id];
    return '<g class="sim-node' + (device.powered ? '' : ' is-off') + (here ? (stopped ? ' is-stopped' : ' is-here') : onPath.has(device.id) ? ' is-visited' : '') + (sim.selected === device.id ? ' is-selected' : '') + '"><rect x="' + (x - 66) + '" y="' + (y - 26) + '" width="132" height="52" rx="8"/><text x="' + x + '" y="' + (y - 4) + '" text-anchor="middle">' + esc(label) + '</text><text class="sim-node-kind" x="' + x + '" y="' + (y + 14) + '" text-anchor="middle">' + esc(here ? (stopped ? 'packet stopped here' : 'packet is here') : KIND[device.type] + (device.powered ? '' : ' · off')) + '</text></g>';}).join('');
  const text = '<ul class="fair-text-map">' + layout.devices.map(device => '<li>' + esc(device.label + ' (' + KIND[device.type].toLowerCase() + (device.powered ? '' : ', powered off') + (tables.table.get(device.id)?.ip ? ', ' + tables.table.get(device.id).ip : '') + ')' + (event?.device === device.id ? (event.stop && !sim.run.outcome.delivered ? ' — the packet stopped here' : ' — the packet is here') : '')) + '</li>').join('') + layout.links.map(link => '<li>' + esc(name(layout, link.from) + ' port ' + (link.fromPort + 1) + ' is cabled to ' + name(layout, link.to) + ' port ' + (link.toPort + 1)) + '</li>').join('') + Object.entries(sim.net.wifi).map(([id, ap]) => '<li>' + esc(name(layout, id) + ' has joined ' + name(layout, ap) + ' by Wi-Fi') + '</li>').join('') + (layout.devices.length ? '' : '<li>The board is empty.</li>') + '</ul>';
  return '<svg class="fair-map sim-map" viewBox="0 0 640 360" role="img" aria-label="Your network. The text view below lists the same devices, cables and where the packet is.">' + cables + radio + gap + nodes + (layout.devices.length ? '' : '<text x="320" y="180" text-anchor="middle" class="sim-map-note">Your network starts here. Add a device.</text>') + '</svg><details class="fair-text-view"><summary>Text view of the map</summary>' + text + '</details>';
}
const name = (layout, id) => layout.devices.find(device => device.id === id)?.label || 'a device';
const select = (attrs, options, value) => '<select ' + attrs + '>' + options.map(([id, label]) => '<option value="' + esc(id) + '"' + (id === value ? ' selected' : '') + '>' + esc(label) + '</option>').join('') + '</select>';
const freePorts = layout => layout.devices.flatMap(device => Array.from({length:TYPE.get(device.type).ports}, (_, port) => port).filter(port => !layout.links.some(link => (link.from === device.id && link.fromPort === port) || (link.to === device.id && link.toPort === port))).map(port => [device.id + ':' + port, device.label + ' · port ' + (port + 1)]));

function buildPanel(layout, sim, tables, guide) {
  const ports = freePorts(layout), chosen = layout.devices.find(device => device.id === sim.selected) || layout.devices[0], aps = layout.devices.filter(device => device.type === 'access-point');
  const palette = guide ? '' : '<h3>Add a device</h3><div class="sim-palette">' + NETWORK_DEVICE_TYPES.map(type => '<button type="button" class="lab-tool" data-sim="add-device" data-value="' + type.id + '" data-key="sim-add-' + type.id + '"' + (layout.devices.length >= 12 ? ' disabled' : '') + '>+ ' + KIND[type.id] + '</button>').join('') + '</div><p class="panel-help">' + layout.devices.length + ' of 12 devices · ' + layout.links.length + ' of 24 cables</p>';
  const connect = '<h3>Connect a cable</h3>' + (ports.length >= 2 ? '<div class="sim-connect"><label>From ' + select('data-sim-port="a" data-key="sim-port-a"', [['', 'Choose a port'], ...ports], '') + '</label><label>To ' + select('data-sim-port="b" data-key="sim-port-b"', [['', 'Choose a port'], ...ports], '') + '</label><button type="button" class="button button-small" data-sim="connect" data-key="sim-connect">Connect cable</button></div>' : '<p class="panel-help">Add another device with a free port to connect a cable.</p>');
  const cables = '<h3>Cables</h3>' + (layout.links.length ? '<ul class="sim-cables">' + layout.links.map(link => '<li><span>' + esc(name(layout, link.from) + ' port ' + (link.fromPort + 1) + ' ↔ ' + name(layout, link.to) + ' port ' + (link.toPort + 1)) + '</span><button type="button" class="lab-tool" data-sim="disconnect" data-value="' + link.id + '" data-key="sim-unplug-' + link.id + '">Unplug<span class="sr-only"> ' + esc(name(layout, link.from) + ' from ' + name(layout, link.to)) + '</span></button></li>').join('') + '</ul>' : '<p class="panel-help">No cables yet.</p>');
  let inspector = '';
  if (chosen && !guide) {
    const entry = tables.table.get(chosen.id), joined = sim.net.wifi[chosen.id], host = entry && !entry.interfaces;
    const field = (key, label, value, auto) => '<label>' + label + '<input type="text" inputmode="decimal" maxlength="15" value="' + esc(value) + '" placeholder="' + esc(auto || 'automatic') + '" data-sim-host="' + key + '" data-key="sim-host-' + key + '" aria-describedby="sim-host-help"></label>';
    inspector = '<h3>Selected device</h3><label class="sim-pick">Device ' + select('data-sim-select data-key="sim-select"', layout.devices.map(device => [device.id, device.label + ' (' + KIND[device.type].toLowerCase() + ')']), chosen.id) + '</label><p class="panel-help">' + esc(TYPE.get(chosen.type).forwards ? (chosen.type === 'router' ? 'A router connects different networks.' : 'Forwards frames inside one network.') : 'An end device: it sends and receives, and does not pass packets along.') + '</p><div class="sim-device-tools"><button type="button" class="lab-tool" data-sim="power-device" data-key="sim-power" aria-pressed="' + chosen.powered + '">Power: ' + (chosen.powered ? 'on' : 'off') + '</button><button type="button" class="lab-tool" data-sim="remove-device" data-key="sim-remove">Remove</button></div>' +
      '<fieldset class="sim-move"><legend>Move ' + esc(chosen.label) + '</legend>' + [['up', '↑'], ['left', '←'], ['down', '↓'], ['right', '→']].map(([direction, arrow]) => '<button type="button" class="lab-tool" data-sim-move="' + direction + '" data-key="sim-move-' + direction + '" aria-label="Move ' + esc(chosen.label) + ' ' + direction + '">' + arrow + '</button>').join('') + '</fieldset>' +
      (chosen.type === 'pc' && aps.length ? '<div class="sim-wifi"><h4>Wi-Fi</h4>' + (joined ? '<p>Joined ' + esc(name(layout, joined)) + '.</p><button type="button" class="button button-small button-outline" data-sim="wifi-leave" data-key="sim-wifi">Leave Wi-Fi</button>' : '<p>Not on Wi-Fi.</p>' + aps.map(ap => '<button type="button" class="button button-small" data-sim="wifi-join" data-value="' + ap.id + '" data-key="sim-wifi">Join ' + esc(ap.label) + '</button>').join('')) + '</div>' : '') +
      (sim.show.addresses ? (host ? '<div class="sim-addresses"><h4>Address settings</h4>' + field('ip', 'IP address', sim.net.hosts[chosen.id]?.ip || '', entry.auto.ip) + '<label>Subnet prefix ' + select('data-sim-host="prefix" data-key="sim-host-prefix"', [['auto', 'Automatic (/24)'], ...SIM_PREFIXES.map(prefix => [String(prefix), '/' + prefix])], sim.net.hosts[chosen.id]?.prefix ? String(sim.net.hosts[chosen.id].prefix) : 'auto') + '</label>' + field('gateway', 'Gateway', sim.net.hosts[chosen.id]?.gateway || '', entry.auto.gateway || 'none on this network') + field('dns', 'Name server (DNS)', sim.net.hosts[chosen.id]?.dns || '', entry.auto.dns || 'none in this layout') + '<p id="sim-host-help" class="panel-help">Leave a box empty to use the automatic value shown in grey. In use now: ' + esc((entry.ip || 'no address') + ' /' + entry.prefix + (entry.gateway ? ', gateway ' + entry.gateway : '') + (entry.dns ? ', name server ' + entry.dns : '')) + '.</p></div>' : entry?.interfaces ? '<div class="sim-addresses"><h4>Router interfaces</h4><ul>' + (entry.interfaces.length ? entry.interfaces.map(item => '<li>' + esc(item.ip + ' /' + item.prefix) + '</li>').join('') : '<li>None yet: cable it to a network.</li>') + '</ul></div>' : '') : '');
  }
  const policy = sim.show.policy && layout.devices.some(device => device.type === 'router') ? '<fieldset class="fair-control"><legend>Gateway policy for guest computers</legend>' + SIM_POLICIES.map(([value, label]) => '<label class="fair-choice' + (sim.net.policy === value ? ' is-selected' : '') + '"><input type="radio" name="sim-policy" value="' + value + '" data-sim-policy data-key="sim-policy-' + value + '"' + (sim.net.policy === value ? ' checked' : '') + '><span>' + esc(label) + '</span></label>').join('') + '<p class="fair-control-help">A policy is a permission decision made at the router. It is separate from whether the cables work.</p></fieldset>' : '';
  const toggles = guide ? '' : '<div class="sim-toggles">' + [['addresses', 'Show address settings'], ['policy', 'Show the gateway policy'], ['test', 'Offer a test by name']].map(([key, label]) => '<label><input type="checkbox" data-sim-show="' + key + '" data-key="sim-show-' + key + '"' + (sim.show[key] ? ' checked' : '') + '> ' + label + '</label>').join('') + '</div>';
  return '<section class="fair-panel sim-build" aria-labelledby="sim-build-title"><h2 id="sim-build-title">' + (guide ? 'Cables' : '1. Build') + '</h2>' + palette + connect + cables + inspector + policy + toggles + (guide ? '' : '<p class="panel-help"><a class="text-link" href="#studio/network">Open this layout in Network Studio</a> to drag devices around. It is the same layout.</p>') + '</section>';
}

function detailsTable(sim) {
  const event = sim.run.events[sim.step], first = sim.run.events.find(item => item.frame), cell = value => value === undefined || value === null ? '—' : esc(value), mark = key => event.changed.includes(key) ? ' <em>(changed at this step)</em>' : '';
  return '<div class="fair-scroll" role="region" aria-label="Packet details, scrolls sideways on a narrow screen" tabindex="0"><table class="fair-readings"><caption>Packet details at step ' + event.n + '</caption><thead><tr><th scope="col">Header field</th><th scope="col">When it left the sender</th><th scope="col">At this step</th></tr></thead><tbody>' + [['Frame source (hardware address)', first?.frame?.src, event.frame?.src, 'frame'], ['Frame destination (hardware address)', first?.frame?.dst, event.frame?.dst, 'frame'], ['IP source', first?.ip?.src, event.ip?.src, ''], ['IP destination', first?.ip?.dst, event.ip?.dst, ''], ['Router hop allowance (TTL)', first?.ip?.ttl, event.ip?.ttl, 'ttl']].map(([label, before, now, key]) => '<tr><th scope="row">' + label + '</th><td>' + cell(before) + '</td><td class="fair-now">' + cell(now) + mark(key) + '</td></tr>').join('') + '</tbody></table></div>';
}

function tracePanel(layout, sim, tables, guide, reduced) {
  const run = sim.run, current = simRunIsCurrent(layout, sim), event = run?.events[sim.step], atEnd = !!run && sim.step === run.events.length - 1, hosts = layout.devices.filter(device => ['pc', 'server', 'printer'].includes(device.type)).map(device => [device.id, device.label]);
  const target = layout.devices.find(device => device.id === layout.target), byName = sim.net.test === 'name' && target?.type === 'server';
  const ends = '<div class="sim-ends"><label>Sender ' + select('data-sim-end="select-source" data-key="sim-source"', [['', 'Choose a device'], ...hosts], layout.source) + '</label><label>Destination ' + select('data-sim-end="select-target" data-key="sim-target"', [['', 'Choose a device'], ...hosts], layout.target) + '</label>' + (sim.show.test ? '<label>Test ' + select('data-sim-test data-key="sim-test"', SIM_TESTS.map(([value, label]) => [value, label]), sim.net.test) + '</label>' : '') + '</div>' + (sim.show.test && target ? '<p class="panel-help">' + esc(byName ? 'By name: ' + simServerName(target) + ' has to be looked up first.' : 'By address: ' + (tables.table.get(target.id)?.ip || 'no address yet') + '.') + '</p>' : '');
  const button = (action, label, off, extra = '') => '<button type="button" class="button' + (action === 'send' ? '' : ' button-outline') + '" data-sim="' + action + '" data-key="sim-' + action + '"' + (off ? ' disabled' : '') + extra + '>' + label + '</button>';
  const stepper = '<div class="fair-tests sim-stepper">' + button('send', (run ? (current ? 'Send packet again' : 'Send a fresh packet') : 'Send packet') + ' <span aria-hidden="true">▸</span>', false) + button('back', '← Step back', !run || sim.step === 0) + button('next', 'Step forward →', !run || atEnd) + (reduced ? '' : button('play', sim.playing ? 'Pause' : 'Play', !run || atEnd, ' aria-pressed="' + (sim.playing === true) + '"')) + button('replay', 'Replay last run', !run) + button('restart', 'Restart trace', !run) + '</div>' + (reduced ? '<p class="panel-help">Reduced motion is on, so the packet moves only when you step.</p>' : '');
  const stale = run && !current ? '<p class="fair-stale" role="note"><strong>Previous evidence.</strong> You changed the network after this run. These events describe the network as it was. Send a fresh packet to test it as it is now.</p>' : '';
  const outcome = run && atEnd ? '<p class="fair-station sim-result" data-outcome="' + run.outcome.kind + '"><span class="fair-station-mark" aria-hidden="true">' + (OUTCOME[run.outcome.kind] || OUTCOME.address)[0] + '</span><strong>' + (OUTCOME[run.outcome.kind] || OUTCOME.address)[1] + '</strong><span>' + esc(run.outcome.reason) + '</span></p><p class="sim-question"><strong>A question to test:</strong> ' + esc(run.outcome.question) + '</p>' : '';
  const now = event ? '<p class="eyebrow">Run ' + run.n + ' · step ' + event.n + ' of ' + run.events.length + ' · ' + esc(event.label) + (event.phase === 'reply' ? ' · Reply' : event.phase === 'lookup' ? ' · Name lookup' : '') + '</p><h3 class="trace-step-title">' + esc(event.title) + '</h3>' + (atEnd && event.text === run.outcome.reason ? '' : '<p>' + esc(event.text) + '</p>') + (sim.show.details ? (event.frame || event.ip ? detailsTable(sim) : '<p class="panel-help">There are no packet details at this step.</p>') : '') : '<p class="panel-help">Choose a sender and a destination, then send a packet. The numbered events will appear here, and you can step through them.</p>';
  const list = run ? '<ol class="sim-events" aria-label="Numbered events for run ' + run.n + '">' + run.events.map((item, index) => '<li' + (index === sim.step ? ' aria-current="step"' : '') + ' class="' + (index > sim.step ? 'is-ahead' : '') + '"><button type="button" class="text-button" data-sim-goto="' + index + '" data-key="sim-goto-' + index + '">' + esc((item.phase === 'reply' ? 'Reply: ' : item.phase === 'lookup' ? 'Lookup: ' : '') + (item.title.includes(item.label) ? item.title : item.label + ': ' + item.title)) + '</button></li>').join('') + '</ol>' : '';
  const previous = sim.previous ? '<details class="fair-log"><summary>Previous run (run ' + sim.previous.n + ') for comparison</summary><p>' + esc((OUTCOME[sim.previous.outcome.kind] || OUTCOME.address)[1] + '. ' + sim.previous.outcome.reason) + '</p><ol>' + sim.previous.events.map(item => '<li>' + esc(item.label + ': ' + item.title) + '</li>').join('') + '</ol></details>' : '';
  return '<section class="fair-panel sim-trace" aria-labelledby="sim-trace-title"><h2 id="sim-trace-title">' + (guide ? 'Your network' : '2. Send and trace') + '</h2>' + mapHTML(layout, sim, tables) + (guide ? '' : ends) + stepper + '<label class="sim-details-toggle"><input type="checkbox" data-sim-show="details" data-key="sim-show-details"' + (sim.show.details ? ' checked' : '') + '> Show packet details (addresses and the router hop allowance)</label>' + stale + '<div class="sim-columns"><div class="trace-now" aria-live="polite">' + outcome + now + '</div><div class="sim-event-list"><h3>Numbered events</h3>' + (list || '<p class="panel-help">No run yet.</p>') + previous + '</div></div></section>';
}

/** The first five minutes: connect, predict, send, break, repair. Each stage is read from what the learner has actually done. */
export function guideStage(layout, sim) {
  const linked = layout.links.some(link => [link.from, link.to].includes('d3') && [link.from, link.to].includes('d2')), kiosk = run => /kiosk/iu.test(run.targetLabel);
  const firstOk = sim.log.findIndex(run => run.delivered && kiosk(run)), fail = sim.log.findIndex((run, index) => index > firstOk && firstOk >= 0 && !run.delivered && run.kind === 'link' && kiosk(run)), fixed = fail >= 0 && sim.log.slice(fail + 1).some(run => run.delivered && kiosk(run));
  if (firstOk < 0) return !linked ? 'connect' : !sim.predict ? 'predict' : 'send';
  if (fail < 0) return linked ? 'unplug' : 'send-broken';
  return fixed ? 'done' : linked ? 'send-fixed' : 'repair';
}
const GUIDE = Object.freeze({
  connect:['Connect the missing cable', 'The winning team just took a photo. It travels in small pieces called packets. Can you get the first packet to the kiosk? The photo kiosk is not plugged in. Under Cables, choose “Photo kiosk · port 1” and a free port on the booth switch, then select Connect cable.', 'A cable has two ends. One end goes in the kiosk. Where does the laptop’s cable already go?'],
  predict:['Predict', 'Before you send it: which device receives the packet next, straight after the crew laptop?', 'Look at the map. What is the laptop’s cable plugged into?'],
  send:['Send the packet', 'Select Send packet, then Step forward. Watch which device has the packet, and read the one sentence about what it does.', 'Send packet is under the map. Step forward moves the packet one device at a time.'],
  unplug:['Now break it', 'It arrived. Swap jobs: the predictor becomes the builder. Under Cables, unplug the photo kiosk. Then send a fresh packet and see where it stops.', 'Find the cable that says Photo kiosk, and select Unplug.'],
  'send-broken':['Send a fresh packet', 'The kiosk is unplugged. Your last run is previous evidence now. Select Send a fresh packet and step through it.', 'The old run describes the network as it was. Only a new packet tests it as it is.'],
  repair:['Repair it', 'The trace names the link that needs attention. Reconnect the photo kiosk to the booth switch, then send again.', 'Which two ports did you join the first time?'],
  'send-fixed':['Send again', 'The cable is back. Send a fresh packet to check the repair.', 'A repair is not proved until a new packet arrives.'],
  done:['First packet delivered, broken and repaired', 'You built a link, predicted the next device, traced a delivery, found a broken link and proved the repair with a fresh run. That is the whole method.', '']
});
function guidePanel(layout, sim) {
  const stage = guideStage(layout, sim), [title, text, hint] = GUIDE[stage], order = ['connect', 'predict', 'send', 'unplug', 'repair', 'done'], position = Math.max(0, order.indexOf({'send-broken':'unplug', 'send-fixed':'repair'}[stage] || stage));
  const firstRun = sim.log.find(run => run.delivered), judged = sim.predict && firstRun ? '<p><strong>Your prediction:</strong> ' + esc(SIM_GUIDE_PREDICTIONS.find(([id]) => id === sim.predict)[1].toLowerCase()) + '. ' + (sim.predict === 'switch' ? 'That is what happened: the switch had it next.' : 'The booth switch had it next. The laptop’s only cable goes to the switch, so everything passes through it.') + '</p>' : '';
  const predict = stage === 'predict' ? '<fieldset class="fair-predict"><legend>Which device receives the packet next?</legend>' + SIM_GUIDE_PREDICTIONS.map(([value, label]) => '<label class="fair-choice"><input type="radio" name="sim-predict" value="' + value + '" data-sim-predict data-key="sim-predict-' + value + '"><span>' + esc(label) + '</span></label>').join('') + '</fieldset>' : '';
  return '<section class="fair-panel sim-guide" aria-labelledby="sim-guide-title" data-guide-stage="' + stage + '"><p class="eyebrow">Guide my first packet · step ' + (position + 1) + ' of ' + order.length + '</p><h2 id="sim-guide-title">' + esc(title) + '</h2><p>' + esc(text) + '</p>' + predict + judged + (hint ? '<div class="fair-clue"><button type="button" class="lab-tool" data-sim="hint" data-key="sim-hint">Give me a hint</button>' + (sim.hints > 0 ? '<p data-sim-hint>' + esc(hint) + '</p>' : '') + '<p class="panel-help">Hints and retries carry no penalty.</p></div>' : '<div class="button-row"><a class="button" href="' + simLink({start:'build', starter:'booth-router', from:sim.from}) + '">Next: add a router and a scoreboard</a><a class="button button-outline" href="' + simLink({start:'build', starter:'blank', from:sim.from}) + '">Build my own network</a></div>') + '<p class="panel-help"><strong>In pairs:</strong> one of you builds and the other predicts. Swap jobs for the repair.</p></section>';
}

function sidePanel(sim) {
  const starter = simStarter(sim.starter), checks = simChecks(sim.starter, sim.log, {inspected:sim.inspected});
  const list = (items, label) => '<ul class="fair-demos">' + items.map(item => '<li class="' + (item.done ? 'is-done' : '') + '"><span aria-hidden="true">' + (item.done ? '✓' : '○') + '</span> ' + esc(item.label) + '<span class="sr-only">' + (item.done ? ' (' + label + ')' : ' (not yet)') + '</span></li>').join('') + '</ul>';
  return '<section class="fair-panel" aria-labelledby="sim-evidence-title"><h2 id="sim-evidence-title">3. Evidence</h2>' + (checks.length ? '<h3>' + esc(starter.title) + '</h3><p class="panel-help">Each line ticks itself when one of your runs shows it. For each run, point to the last step that worked.</p>' + list(checks, 'shown') : '<p class="panel-help">Open a fair starter to get a checklist of evidence to collect, or set your own goal.</p>') + '<h3>Things to try on any network</h3>' + list(SIM_GOALS.map(goal => ({...goal, done:sim.goals.includes(goal.id)})), 'found') + '<label class="sim-ttl">Starting hop allowance ' + select('data-sim-ttl data-key="sim-ttl"', [['64', '64 (normal)'], ['1', '1 (runs out at the first router)']], String(sim.net.ttl)) + '</label></section>' +
    '<section class="fair-panel" aria-labelledby="sim-starters-title"><h2 id="sim-starters-title">Starters</h2><p class="panel-help">Opening a starter replaces the layout on the board. Every part of a starter can be changed.</p><ul class="sim-starters">' + Object.entries(SIM_STARTERS).map(([id, item]) => '<li><button type="button" class="lab-tool" data-sim="starter" data-value="' + id + '" data-key="sim-starter-' + id + '"' + (sim.starter === id ? ' aria-pressed="true"' : '') + '>' + esc(item.title) + '</button><span>' + esc((item.band ? 'Grades ' + item.band.replace('-', '–') + '. ' : '') + item.summary) + '</span></li>').join('') + '</ul></section>';
}

function bodyHTML(layoutState, sim, reduced) {
  const layout = normalizeNetworkStudioState(layoutState), tables = simAddressing(layout, sim.net), guide = sim.start === 'guide';
  return (guide ? guidePanel(layout, sim) : '') + '<div class="sim-layout' + (guide ? ' is-guide' : '') + '">' + tracePanel(layout, sim, tables, guide, reduced) + buildPanel(layout, sim, tables, guide) + (guide ? '' : sidePanel(sim)) + '</div>';
}

export function renderPacketSim(layout, sim, {reduced = false} = {}) {
  const back = simReturn(sim.from);
  return '<section class="lab-library-intro fair-hub-intro"><div class="wrap"><p class="eyebrow">Networking pathway · Practice · Grades 7–12</p><h1>Packet <em>Simulator.</em></h1><p>Build part of the tech fair’s network, send a message through it, and explain why it arrived or where it stopped.</p><p class="panel-help">Practice on made-up equipment. Nothing is saved, nothing is sent, and a practice run never completes a mission.</p><div class="button-row">' + (back ? '<a class="button" href="' + esc(back.href) + '" data-sim-return>← Back to your mission</a>' : '') + '<a class="button button-outline" href="' + simLink({start:'guide', from:sim.from}) + '"' + (sim.start === 'guide' ? ' aria-current="page"' : '') + '>Guide my first packet</a><a class="button button-outline" href="' + simLink({start:'build', from:sim.from}) + '"' + (sim.start === 'build' ? ' aria-current="page"' : '') + '>Build my own network</a><a class="button button-outline" href="#networking">Networking pathway</a></div></div></section>' +
    '<section class="wrap fair-hub-section trace-page sim-page" data-packet-sim><div data-sim-body>' + bodyHTML(layout, sim, reduced) + '</div><p class="trace-feedback" role="status" data-sim-feedback>' + (sim.start === 'guide' ? 'Start with the step above.' : 'Add devices, or open a starter.') + '</p></section>';
}

export function mountPacketSim(root, {getLayout = () => null, getSim = () => null, onChange = () => {}} = {}) {
  const host = root.querySelector('[data-packet-sim]');
  if (!host) return () => {};
  const controller = new AbortController(), signal = controller.signal, body = host.querySelector('[data-sim-body]'), feedback = host.querySelector('[data-sim-feedback]'), view = root.ownerDocument.defaultView;
  const motion = view?.matchMedia?.('(prefers-reduced-motion: reduce)'), reduced = () => motion?.matches === true;
  let timer = 0;
  const stop = () => {if (timer) view.clearInterval(timer); timer = 0;};
  function draw(message, kind) {
    const key = root.ownerDocument.activeElement?.dataset?.key, ports = [...body.querySelectorAll('[data-sim-port]')].map(node => node.value);
    body.innerHTML = bodyHTML(getLayout(), getSim(), reduced());
    body.querySelectorAll('[data-sim-port]').forEach((node, index) => {if ([...node.options].some(option => option.value === ports[index])) node.value = ports[index];});
    const target = key ? body.querySelector('[data-key="' + key.replace(/["\\]/g, '') + '"]') : null;
    if (target && !target.disabled) target.focus({preventScroll:true}); else if (key) body.querySelector('[data-key="sim-send"]')?.focus({preventScroll:true});
    if (message !== undefined) {feedback.textContent = message; feedback.dataset.kind = kind || 'info';}
  }
  function act(action, value) {
    const result = applyPacketSimAction(getLayout(), {...getSim(), playing:timer !== 0}, action, value);
    onChange(result.layout, result.sim); draw(result.message, result.kind); return result;
  }
  const selected = () => {const layout = normalizeNetworkStudioState(getLayout()), sim = getSim(); return layout.devices.find(device => device.id === sim.selected) || layout.devices[0];};
  function play() {
    if (timer) {stop(); onChange(getLayout(), {...getSim(), playing:false}); draw('Paused.'); return;}
    timer = view.setInterval(() => {const sim = getSim(); if (!sim.run || sim.step >= sim.run.events.length - 1) {stop(); onChange(getLayout(), {...getSim(), playing:false}); draw(); return;} act('next');}, 1400);
    onChange(getLayout(), {...getSim(), playing:true}); draw('Playing. The packet moves one step at a time.');
  }
  host.addEventListener('click', event => {
    const move = event.target.closest?.('[data-sim-move]'), go = event.target.closest?.('[data-sim-goto]'), button = event.target.closest?.('[data-sim]');
    if (move) {const device = selected(), delta = {up:[0, -8], down:[0, 8], left:[-8, 0], right:[8, 0]}[move.dataset.simMove]; if (device) act('move-device', {id:device.id, x:device.x + delta[0], y:device.y + delta[1]}); return;}
    if (go) {stop(); act('goto', Number(go.dataset.simGoto)); return;}
    if (!button || button.disabled) return;
    const action = button.dataset.sim, value = button.dataset.value;
    if (action === 'play') {play(); return;}
    if (action !== 'next') stop();
    if (action === 'connect') {const [a, b] = [...body.querySelectorAll('[data-sim-port]')].map(node => node.value.split(':')); if (!a[1] || !b[1]) {draw('Choose a port in both lists, then select Connect cable.', 'warning'); return;} act('connect', {from:a[0], fromPort:Number(a[1]), to:b[0], toPort:Number(b[1])}); return;}
    if (action === 'add-device') {act('add-device', {type:value}); return;}
    if (action === 'disconnect') {act('disconnect', {id:value}); return;}
    if (action === 'power-device') {const device = selected(); if (device) act('power-device', {id:device.id, powered:!device.powered}); return;}
    if (action === 'remove-device') {const device = selected(); if (device) act('remove-device', {id:device.id}); return;}
    if (action === 'wifi-join' || action === 'wifi-leave') {const device = selected(); if (device) act('wifi', {id:device.id, ap:action === 'wifi-join' ? value : ''}); return;}
    act(action, value);
  }, {signal});
  host.addEventListener('change', event => {
    const target = event.target; stop();
    if (target.matches?.('[data-sim-end]')) act(target.dataset.simEnd, {id:target.value});
    else if (target.matches?.('[data-sim-select]')) act('select', target.value);
    else if (target.matches?.('[data-sim-test]')) act('test', target.value);
    else if (target.matches?.('[data-sim-ttl]')) act('ttl', target.value);
    else if (target.matches?.('[data-sim-policy]')) act('policy', target.value);
    else if (target.matches?.('[data-sim-predict]')) act('predict', target.value);
    else if (target.matches?.('[data-sim-show]')) act('show', {name:target.dataset.simShow, on:target.checked});
    else if (target.matches?.('[data-sim-host]')) {const device = selected(); if (device) act('host', {id:device.id, field:target.dataset.simHost, value:target.value});}
  }, {signal});
  const motionChanged = () => {stop(); draw('Motion setting changed.');};
  motion?.addEventListener?.('change', motionChanged, {signal});
  draw();
  return () => {stop(); controller.abort();};
}
