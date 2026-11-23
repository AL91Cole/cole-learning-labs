// Packet Simulator engine. It reads a Network Studio layout (the devices a student placed, their
// cables and power) plus a few settings, and works out what one packet would do, step by step.
// Nothing here is scripted per starter: the route and every event come from the current build.
//   A switch or access point forwards inside one network.
//   A router connects different networks, rewrites the frame and takes one from the hop allowance.
//   A name lookup, the delivery itself and a gateway policy are three separate things that can stop a packet.
// Local arithmetic on fictional devices. No real packet, address or network is touched.
import {NETWORK_DEVICE_TYPES, applyNetworkStudioAction, normalizeNetworkStudioState} from './network-studio-model.js?release=20261107-tech-team';
import {TRACE_GOALS} from './packet-trace-model.js?release=20261107-tech-team';

const TYPES = new Map(NETWORK_DEVICE_TYPES.map(type => [type.id, type]));
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const number = id => Number(String(id).slice(1));
const hex = value => (value % 256).toString(16).padStart(2, '0');
const isHost = device => ['pc', 'server', 'printer'].includes(device.type);
const isBridge = device => ['switch', 'access-point'].includes(device.type);
const isNameServer = device => device.type === 'server' && /name server|dns/iu.test(device.label);
export const simServerName = device => device.label.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '') + '.fair.example';
export const SIM_POLICIES = Object.freeze([['allow-all', 'Allow guests to everything'], ['scores-only', 'Allow the scoreboard; block staff files'], ['block-all', 'Block guests from everything']]);
export const SIM_TESTS = Object.freeze([['address', 'By address'], ['name', 'By name']]);
export const SIM_PREFIXES = Object.freeze([24, 26, 27]);

export function parseIp(text) {
  const match = typeof text === 'string' ? text.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u) : null;
  if (!match || match.slice(1).some(part => Number(part) > 255)) return null;
  return match.slice(1).reduce((sum, part) => sum * 256 + Number(part), 0);
}
const sameSubnet = (a, b, prefix) => {const x = parseIp(a), y = parseIp(b), size = 2 ** (32 - prefix); return x !== null && y !== null && Math.floor(x / size) === Math.floor(y / size);};

export function initialSimNet() {return {hosts:{}, wifi:{}, leases:{}, policy:'allow-all', test:'address', ttl:64};}
/** Settings are data: unknown devices, malformed addresses and unlisted choices are dropped. */
export function normalizeSimNet(saved, layoutState) {
  const layout = normalizeNetworkStudioState(layoutState), devices = new Map(layout.devices.map(device => [device.id, device])), net = initialSimNet();
  if (!plain(saved)) return syncLeases(layout, net);
  if (plain(saved.hosts)) for (const [id, raw] of Object.entries(saved.hosts)) {
    if (!devices.has(id) || !isHost(devices.get(id)) || !plain(raw)) continue;
    const entry = {};
    for (const key of ['ip', 'gateway', 'dns']) if (typeof raw[key] === 'string' && parseIp(raw[key]) !== null) entry[key] = raw[key].trim();
    if (SIM_PREFIXES.includes(raw.prefix)) entry.prefix = raw.prefix;
    if (Object.keys(entry).length) net.hosts[id] = entry;
  }
  if (plain(saved.wifi)) for (const [id, ap] of Object.entries(saved.wifi)) if (devices.get(id)?.type === 'pc' && devices.get(ap)?.type === 'access-point') net.wifi[id] = ap;
  if (plain(saved.leases)) for (const [id, raw] of Object.entries(saved.leases)) {
    const fine = value => Number.isSafeInteger(value) && value >= 1 && value <= 999999;
    if (!devices.has(id) || !plain(raw)) continue;
    if (devices.get(id).type === 'router' && Array.isArray(raw.segments)) net.leases[id] = {segments:[...new Set(raw.segments.filter(fine))].slice(0, 4)};
    else if (isHost(devices.get(id)) && fine(raw.segment)) net.leases[id] = {segment:raw.segment};
  }
  if (SIM_POLICIES.some(([value]) => value === saved.policy)) net.policy = saved.policy;
  if (SIM_TESTS.some(([value]) => value === saved.test)) net.test = saved.test;
  if ([1, 64].includes(saved.ttl)) net.ttl = saved.ttl;
  return syncLeases(layout, net);
}

/** Every link that exists right now: cables, and one wireless link for each computer that has joined an access point. */
function allLinks(layout, net) {
  const wireless = Object.entries(net.wifi).map(([id, ap]) => ({id:'w' + number(id), from:id, fromPort:null, to:ap, toPort:null, wireless:true}));
  return [...layout.links.map(link => ({...link, wireless:false})), ...wireless];
}
/** Networks: groups of devices joined without crossing a router. Each is named by its lowest device number. */
function segments(layout, net) {
  const devices = new Map(layout.devices.map(device => [device.id, device])), parent = new Map(layout.devices.filter(device => device.type !== 'router').map(device => [device.id, device.id]));
  const find = id => {while (parent.get(id) !== id) {parent.set(id, parent.get(parent.get(id))); id = parent.get(id);} return id;};
  const links = allLinks(layout, net);
  for (const link of links) if (parent.has(link.from) && parent.has(link.to)) parent.set(find(link.from), find(link.to));
  const members = new Map();
  for (const id of parent.keys()) {const root = find(id); if (!members.has(root)) members.set(root, []); members.get(root).push(id);}
  const of = new Map(), list = [];
  // A network is named after its lowest-numbered switch or access point, so a computer joining or leaving does not rename it.
  for (const ids of members.values()) {const bridges = ids.filter(id => isBridge(devices.get(id))), key = Math.min(...(bridges.length ? bridges : ids).map(number)); list.push({key, ids}); for (const id of ids) of.set(id, key);}
  // A router joins the network of whatever each of its ports is cabled to. Two routers cabled together share a small network of their own.
  const routerNets = new Map(layout.devices.filter(device => device.type === 'router').map(device => [device.id, new Set()]));
  for (const link of links) {
    const a = devices.get(link.from), b = devices.get(link.to);
    if (a.type === 'router' && b.type === 'router') {const key = 5000 + Math.min(number(a.id), number(b.id)) * 20 + Math.max(number(a.id), number(b.id)) % 20; routerNets.get(a.id).add(key); routerNets.get(b.id).add(key);}
    else if (a.type === 'router') routerNets.get(a.id).add(of.get(b.id));
    else if (b.type === 'router') routerNets.get(b.id).add(of.get(a.id));
  }
  return {of, routerNets};
}
/** A device keeps the automatic address of the last network it was connected to, so unplugging it does not rename it. */
function syncLeases(layout, net) {
  const {of, routerNets} = segments(layout, net), connected = new Set(allLinks(layout, net).flatMap(link => [link.from, link.to]));
  for (const device of layout.devices) if (isHost(device) && connected.has(device.id) && of.has(device.id)) net.leases[device.id] = {segment:of.get(device.id)};
  for (const id of Object.keys(net.leases)) if (!layout.devices.some(device => device.id === id)) delete net.leases[id];
  // A router keeps the interfaces it has been given, so pulling its cable leaves a dead link, not a missing address.
  // It gives one up when another router is now the one cabled to that network.
  const inUse = new Set([...of.values(), ...Object.values(net.leases).map(lease => lease.segment).filter(Boolean)]);
  for (const [id, now] of routerNets) {const kept = (net.leases[id]?.segments || []).filter(key => inUse.has(key) && !now.has(key) && ![...routerNets].some(([other, live]) => other !== id && live.has(key))); net.leases[id] = {segments:[...now, ...kept].slice(0, 4)};}
  return net;
}
const subnetOf = key => '10.40.' + (((key - 1) % 250) + 1);
const hostIp = (key, id) => subnetOf(key) + '.' + (((number(id) - 1) % 200) + 10);

/** Addresses and interfaces for the present layout: what each device would be set to. */
export function simAddressing(layoutState, netState) {
  const layout = normalizeNetworkStudioState(layoutState), net = normalizeSimNet(netState, layout), {of, routerNets} = segments(layout, net), table = new Map();
  const routers = layout.devices.filter(device => device.type === 'router').sort((a, b) => number(a.id) - number(b.id));
  const routerIp = (router, key) => subnetOf(key) + '.' + (routers.filter(other => net.leases[other.id].segments.includes(key)).findIndex(other => other.id === router.id) + 1);
  for (const router of routers) table.set(router.id, {device:router, interfaces:[...net.leases[router.id].segments].sort((a, b) => a - b).map(key => ({segment:key, ip:routerIp(router, key), prefix:24, mac:'02:00:00:' + hex(key >> 8) + ':' + hex(key) + ':' + hex(number(router.id))}))});
  const nameServer = layout.devices.find(isNameServer);
  for (const device of layout.devices.filter(isHost)) {
    const key = net.leases[device.id]?.segment, manual = net.hosts[device.id] || {}, gatewayRouter = key ? routers.find(router => net.leases[router.id].segments.includes(key)) : null;
    const auto = {ip:key ? hostIp(key, device.id) : '', prefix:24, gateway:gatewayRouter ? routerIp(gatewayRouter, key) : '', dns:''};
    table.set(device.id, {device, segment:of.get(device.id) ?? null, auto, ip:manual.ip || auto.ip, prefix:manual.prefix || auto.prefix, gateway:manual.gateway ?? auto.gateway, dns:manual.dns ?? '', mac:'02:00:00:00:' + hex(key || 0) + ':' + hex(number(device.id))});
  }
  // The automatic name server setting is the address of the layout's name server, once that has one.
  if (nameServer) for (const entry of table.values()) if (entry.auto) {entry.auto.dns = table.get(nameServer.id).ip; if (net.hosts[entry.device.id]?.dns === undefined) entry.dns = entry.auto.dns;}
  return {layout, net, table, nameServer, names:layout.devices.filter(device => device.type === 'server' && !isNameServer(device)).map(device => ({name:simServerName(device), id:device.id}))};
}

const portText = (link, id) => {const port = link.from === id ? link.fromPort : link.toPort; return port === null ? 'its radio' : 'port ' + (port + 1);};
/** One packet through the current build. Returns numbered events and one outcome. */
export function simulatePacket(layoutState, netState) {
  // A destination that has never been plugged in is assumed to belong on the sender's network, so the trace can show the missing link.
  const first = simAddressing(layoutState, netState), unset = first.layout.target && !first.net.leases[first.layout.target] && first.net.leases[first.layout.source]?.segment;
  const {layout, net, table, nameServer} = unset ? simAddressing(first.layout, {...first.net, leases:{...first.net.leases, [first.layout.target]:{segment:unset}}}) : first, devices = new Map(layout.devices.map(device => [device.id, device]));
  const links = allLinks(layout, net), live = links.filter(link => devices.get(link.from).powered && devices.get(link.to).powered), events = [];
  const source = devices.get(layout.source), target = devices.get(layout.target);
  const facts = {delivered:false, kind:'', test:net.test, policy:net.policy, crossedRouter:false, wireless:false, sourceId:source?.id || '', targetId:target?.id || '', targetLabel:target?.label || '', path:[]};
  const add = (device, title, text, extra = {}) => {events.push({n:events.length + 1, device:device.id, label:device.label, title, text, phase:'send', frame:null, ip:null, changed:[], linkId:null, stop:false, ...extra}); if (!facts.path.includes(device.id)) facts.path.push(device.id);};
  const done = (kind, reason, question, goal = '', attention = null) => {facts.kind = kind; facts.delivered = kind === 'delivered'; events.at(-1).stop = true; return {events, outcome:{kind, delivered:facts.delivered, reason, question, goal, attention, stoppedAt:events.at(-1).device}, facts};};
  const fail = (device, title, text, kind, question, goal, attention, extra) => {add(device, title, text, extra); return done(kind, text, question, goal, attention);};
  if (!source || !target || source.id === target.id) return {events, outcome:{kind:'endpoints', delivered:false, reason:'Choose a sender and a different destination.', question:'Which two devices should this packet travel between?', goal:'', attention:null, stoppedAt:null}, facts:{...facts, kind:'endpoints'}};
  const neighbours = id => live.filter(link => link.from === id || link.to === id).map(link => ({link, id:link.from === id ? link.to : link.from}));
  // Within one network: the way from one device to another through powered switches and access points only.
  function walk(fromId, toId) {
    const queue = [fromId], parents = new Map(), seen = new Set([fromId]);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor];
      if (id === toId) {const path = []; for (let at = toId; at !== fromId; at = parents.get(at).id) path.unshift({id:at, link:parents.get(at).link}); return {path, seen};}
      if (id !== fromId && !isBridge(devices.get(id))) continue;
      for (const next of neighbours(id)) if (!seen.has(next.id)) {seen.add(next.id); parents.set(next.id, {id, link:next.link}); queue.push(next.id);}
    }
    const reached = [...seen].filter(id => id === fromId || isBridge(devices.get(id))), depth = id => {let count = 0; for (let at = id; at !== fromId; at = parents.get(at).id) count++; return count;};
    const last = reached.sort((a, b) => depth(b) - depth(a) || number(a) - number(b))[0], trail = []; for (let at = last; at !== fromId; at = parents.get(at).id) trail.unshift({id:at, link:parents.get(at).link});
    return {path:null, seen, last, trail};
  }
  const ownerOf = ip => {for (const entry of table.values()) {if (entry.interfaces) {const match = entry.interfaces.find(item => item.ip === ip); if (match) return {device:entry.device, mac:match.mac, iface:match};} else if (entry.ip === ip && ip) return {device:entry.device, mac:entry.mac, iface:null};} return null;};
  const linkFailure = (from, goal, wanted) => {
    const result = walk(from.id, wanted.id), stop = devices.get(result.last), cable = links.some(link => link.from === wanted.id || link.to === wanted.id);
    const why = !wanted.powered ? wanted.label + ' is powered off.' : !cable ? (wanted.type === 'pc' && layout.devices.some(device => device.type === 'access-point') && !layout.links.some(link => link.from === wanted.id || link.to === wanted.id) ? wanted.label + ' has no cable and has not joined the Wi-Fi.' : wanted.label + ' has no cable plugged in.') : 'No working link joins ' + stop.label + ' to ' + wanted.label + '.';
    return {result, stop, why, attention:{from:stop.id, to:wanted.id}, question:!wanted.powered ? 'What changes if ' + wanted.label + ' is switched on?' : 'Which link between ' + stop.label + ' and ' + wanted.label + ' needs attention?'};
  };
  if (!source.powered) return fail(source, source.label + ' is switched off', source.label + ' is powered off, so it cannot send anything.', 'link', 'What changes if ' + source.label + ' is switched on?', 'no-link', {from:source.id, to:source.id});
  if (!neighbours(source.id).length) {
    const wifi = source.type === 'pc' && !layout.links.some(link => link.from === source.id || link.to === source.id) && layout.devices.some(device => device.type === 'access-point');
    const asleep = links.map(link => link.from === source.id ? devices.get(link.to) : link.to === source.id ? devices.get(link.from) : null).find(device => device && !device.powered);
    if (asleep) return fail(source, asleep.label + ' is switched off', asleep.label + ' is powered off, so ' + source.label + '’s cable leads nowhere.', 'link', 'What changes if ' + asleep.label + ' is switched on?', 'no-link', {from:source.id, to:asleep.id});
    return fail(source, source.label + ' has no link', wifi ? source.label + ' has not joined the Wi-Fi and has no cable, so the packet has nowhere to go.' : source.label + ' has no working cable, so the packet has nowhere to go.', 'link', wifi ? 'What happens if ' + source.label + ' joins the Wi-Fi?' : 'Which port should ' + source.label + '’s cable go to?', 'no-link', {from:source.id, to:source.id});
  }
  const from = table.get(source.id), to = table.get(target.id);
  if (!from?.ip) return fail(source, source.label + ' has no address', source.label + ' has no address yet, so it cannot be the sender of a packet.', 'address', 'What gives ' + source.label + ' an address?', '', null);
  if (!to?.ip) return fail(source, target.label + ' has no address', target.label + ' ' + (target.type === 'router' || isBridge(target) ? 'passes packets along; choose a computer, server or printer as the destination.' : 'has never been connected, so it has no address to send to.'), 'address', 'Which device should receive this packet?', '', null);

  // Carry one packet from the sender toward an address. Used for the delivery itself and, quietly, for the name lookup.
  function carry(dstIp, {quiet = false} = {}) {
    let here = source, iface = {ip:from.ip, prefix:from.prefix, mac:from.mac}, ttl = net.ttl, frame = null, crossed = false, wireless = false;
    const say = quiet ? () => {} : add, ip = () => ({src:from.ip, dst:dstIp, ttl});
    for (let hop = 0; hop < 8; hop++) {
      const local = sameSubnet(iface.ip, dstIp, iface.prefix), host = isHost(here);
      let nextIp = dstIp, viaGateway = false;
      if (!local && host) {
        nextIp = from.gateway; viaGateway = true;
        if (!nextIp) return {ok:false, stop:['address', here, here.label + ' has no way out', dstIp + ' is on another network, and ' + here.label + ' has no gateway to send it to.', 'What device would connect ' + here.label + '’s network to another one?', 'no-gateway', null]};
      } else if (!local) {
        const entry = table.get(here.id), out = entry.interfaces.find(item => sameSubnet(item.ip, dstIp, item.prefix));
        if (out) iface = out;
        else {
          const other = [...table.values()].find(item => item.interfaces && item.device.id !== here.id && item.interfaces.some(side => sameSubnet(side.ip, dstIp, side.prefix)) && item.interfaces.some(side => entry.interfaces.some(mine => mine.segment === side.segment)));
          if (!other) return {ok:false, stop:['address', here, here.label + ' has no network for that address', here.label + ' is not connected to a network that contains ' + dstIp + ', so it has nowhere to send the packet.', 'Which network is ' + dstIp + ' on, and is ' + here.label + ' joined to it?', '', null]};
          const shared = other.interfaces.find(side => entry.interfaces.some(mine => mine.segment === side.segment)); iface = entry.interfaces.find(mine => mine.segment === shared.segment); nextIp = shared.ip;
        }
      }
      const owner = ownerOf(nextIp);
      if (!owner) return {ok:false, stop:['address', here, viaGateway ? here.label + ' cannot find its gateway' : 'Nobody has that address', here.label + ' asks “who has ' + nextIp + '?” and nobody answers' + (viaGateway ? ', so it cannot reach its gateway.' : '.'), viaGateway ? 'Which address belongs to the router on ' + here.label + '’s network?' : 'Which device should have ' + nextIp + '?', viaGateway ? 'no-gateway' : '', null, {ip:ip()}]};
      const next = owner.device, route = walk(here.id, next.id), newFrame = {src:iface.mac, dst:owner.mac};
      if (!route.path) {
        const problem = linkFailure(here, '', next);
        say(here, here.label + ' sends the frame', (local ? '' : dstIp + ' is on another network. ') + here.label + ' addresses the frame to ' + (local ? '' : 'its gateway, ') + next.label + ' and sends it.', {frame:newFrame, ip:ip(), changed:frame ? ['frame'] : []});
        for (const step of problem.result.trail.filter(item => item.id !== problem.stop.id)) say(devices.get(step.id), devices.get(step.id).label + ' passes it on', devices.get(step.id).label + ' receives the frame and looks for the port that leads to ' + next.label + '.', {frame:newFrame, ip:ip(), linkId:step.link.id});
        return {ok:false, stop:['link', problem.stop, 'The frame stops at ' + problem.stop.label, problem.why + ' The frame stops at ' + problem.stop.label + '.', problem.question, problem.stop.id === source.id ? 'no-link' : '', problem.attention, {frame:newFrame, ip:ip()}]};
      }
      say(here, !frame ? (local ? 'Same network: straight there' : 'Another network: send it to the gateway') : here.label + ' builds a new frame', !frame ? (local ? dstIp + ' is on ' + here.label + '’s own network. ' + here.label + ' addresses the frame to ' + next.label + '.' : dstIp + ' is on another network, so ' + here.label + ' addresses the frame to its gateway, ' + next.label + '. The packet inside is still addressed to ' + dstIp + '.') : here.label + ' wraps the same packet in a new frame for the next network, addressed to ' + next.label + '. The IP addresses have not changed.', {frame:newFrame, ip:ip(), changed:frame ? ['frame'] : []});
      frame = newFrame;
      for (const [index, step] of route.path.entries()) {
        const device = devices.get(step.id); if (step.link.wireless) wireless = true;
        if (step.id === next.id) break;
        const onward = route.path[index + 1];
        say(device, device.label + ' forwards the frame', device.type === 'switch' ? device.label + ' sends this piece out ' + portText(onward.link, device.id) + ', which is connected to ' + devices.get(onward.id).label + '. It changes nothing.' : device.label + ' passes the frame between ' + (step.link.wireless ? 'the air and its cable' : 'its cable and the air') + ' toward ' + devices.get(onward.id).label + '. It changes nothing.', {frame, ip:ip(), linkId:step.link.id});
      }
      const arriving = route.path.at(-1).link;
      if (next.type !== 'router') {
        if (owner.iface === null && table.get(next.id).ip !== dstIp) return {ok:false, stop:['address', next, 'Wrong device', next.label + ' receives a frame that is not for it and ignores it.', 'Which device has the address ' + dstIp + '?', '', null, {frame, ip:ip()}]};
        return {ok:true, device:next, frame, ip:ip(), crossed, wireless, linkId:arriving.id};
      }
      // A router: check the gateway policy, take one from the hop allowance, then choose the next network.
      if (isHost(source) && source.type === 'pc') {
        const destination = [...table.values()].find(entry => !entry.interfaces && entry.ip === dstIp)?.device;
        const blocked = net.policy === 'block-all' || (net.policy === 'scores-only' && destination && /staff/iu.test(destination.label));
        if (blocked && !quiet) return {ok:false, stop:['policy', next, next.label + '’s policy blocks it', next.label + ' opens the frame, reads the destination ' + dstIp + ' and checks its guest policy (“' + SIM_POLICIES.find(([value]) => value === net.policy)[1] + '”). The packet is dropped here. The cables are fine: this is a permission decision.', net.policy === 'block-all' ? 'Which policy lets guests see the scoreboard and still keeps staff files closed?' : 'What does the same guest get when the destination is the scoreboard?', 'blocked', null, {frame, ip:ip(), linkId:arriving.id}]};
      }
      if (ttl <= 1) {ttl = 0; return {ok:false, stop:['expired', next, 'Out of hops', next.label + ' takes one from the hop allowance. It reaches zero, so ' + next.label + ' drops the packet.', 'What starting hop allowance would get past one router?', 'expired', null, {frame, ip:ip(), changed:['ttl'], linkId:arriving.id}]};}
      ttl -= 1; crossed = true;
      say(next, next.label + ' opens the frame', 'The frame was addressed to ' + next.label + ', so it takes the packet out and reads the destination ' + dstIp + '. A router connects different networks. It takes one from the hop allowance: ' + (ttl + 1) + ' becomes ' + ttl + '.', {frame, ip:ip(), changed:['ttl'], linkId:arriving.id});
      here = next; iface = table.get(next.id).interfaces.find(item => sameSubnet(item.ip, dstIp, item.prefix)) || owner.iface;
    }
    return {ok:false, stop:['address', here, 'Too many networks', 'The packet crossed more networks than this model follows.', 'Is there a shorter way?', '', null]};
  }
  const stopped = result => {const [kind, device, title, text, question, goal, attention, extra] = result.stop; return fail(device, title, text, kind, question, goal, attention, extra);};

  let destinationIp = to.ip, named = false;
  if (net.test === 'name') {
    if (target.type !== 'server' || isNameServer(target)) return fail(source, 'Only a service has a name here', 'In this model only servers have names. Choose a server as the destination for a test by name.', 'lookup', 'Which server is this packet for?', '', null, {phase:'lookup'});
    const name = simServerName(target);
    add(source, source.label + ' needs an address first', 'A packet cannot be addressed to a name. ' + source.label + ' asks its name server' + (from.dns ? ', ' + from.dns + ',' : '') + ' for the address of ' + name + '.', {phase:'lookup'});
    const server = from.dns ? ownerOf(from.dns)?.device : null;
    if (!from.dns) return done('lookup', source.label + ' has no name server set, so the name was never looked up. No packet was sent to ' + target.label + '.', 'Which address is the name server at?', '', null);
    if (!server || !isNameServer(server)) return fail(source, 'The name lookup gets no answer', 'Nothing at ' + from.dns + ' answers name questions. The name was never turned into an address, so no packet was sent to ' + target.label + '. The cables to ' + target.label + ' were not tested.', 'lookup', 'Does the same destination work by address? What does that tell you about the cables?', '', null, {phase:'lookup'});
    const question = carry(from.dns, {quiet:true});
    if (!question.ok) return fail(source, 'The name question cannot reach ' + server.label, 'The question for ' + name + ' never reaches ' + server.label + ', so no address comes back and no packet is sent to ' + target.label + '.', 'lookup', 'Can ' + source.label + ' reach ' + server.label + ' by address?', '', null, {phase:'lookup'});
    add(server, server.label + ' answers', name + ' is ' + to.ip + '. Now ' + source.label + ' can address the packet.', {phase:'lookup'});
    named = true; if (question.wireless) facts.wireless = true;
  }
  const result = carry(destinationIp);
  if (!result.ok) return stopped(result);
  facts.crossedRouter = result.crossed; facts.wireless = facts.wireless || result.wireless;
  add(result.device, 'Delivered to ' + result.device.label, result.device.label + ' sees its own address on the frame and in the packet, and accepts it.' + (result.crossed ? ' Compare this frame with the first one: the frame addresses changed at the router, and the IP addresses did not.' : ' The frame addresses never changed, because no router was crossed.'), {frame:result.frame, ip:result.ip, linkId:result.linkId});
  const back = [...facts.path].reverse().map(id => devices.get(id).label);
  events.push({n:events.length + 1, device:source.id, label:source.label, title:'Reply returns to ' + source.label, text:result.device.label + ' answers. The reply travels back the same way: ' + back.join(' → ') + '.', phase:'reply', frame:null, ip:null, changed:[], linkId:null, stop:false});
  return done('delivered', 'Delivered: ' + source.label + ' → ' + result.device.label + (result.crossed ? ', across a router.' : ', on one network.'), 'What one change would stop this packet, and where would it stop?', named ? 'name' : result.crossed ? 'routed' : 'local', null);
}

/** What must be the same for an old run to still count as current evidence. */
export function simSignature(layoutState, netState) {
  const {layout, net} = simAddressing(layoutState, netState);
  return JSON.stringify([layout.devices.map(device => [device.id, device.type, device.powered]), layout.links.map(link => [link.from, link.fromPort, link.to, link.toPort]), layout.source, layout.target, net.hosts, net.wifi, net.policy, net.test, net.ttl]);
}

const device = (id, type, label, x, y) => ({id, type, label, x, y, powered:true});
const cable = (id, from, fromPort, to, toPort) => ({id, from, fromPort, to, toPort});
const layoutOf = (devices, links, source, target) => ({version:1, template:'blank', devices, links, source, target, nextDeviceId:devices.length + 1, nextLinkId:links.length + 1, runs:0});
/** Editable starting layouts. Each is an ordinary Network Studio layout plus a few settings; none carries a scripted result. */
export const SIM_STARTERS = Object.freeze({
  blank:{title:'Blank layout', band:'', summary:'An empty board. Add two devices and a switch to begin.', layout:() => layoutOf([], [], '', ''), net:{}, show:{}},
  booth:{title:'The photo booth', band:'7-8', summary:'A crew laptop, a booth switch and a photo kiosk. One cable is missing.', layout:() => layoutOf([device('d1', 'pc', 'Crew laptop', 12, 50), device('d2', 'switch', 'Booth switch', 50, 50), device('d3', 'pc', 'Photo kiosk', 88, 50)], [cable('l1', 'd1', 0, 'd2', 0)], 'd1', 'd3'), net:{}, show:{},
    checks:[['first', 'Deliver the first photo packet to the kiosk.'], ['unplugged', 'Unplug the kiosk and send again: the trace stops.'], ['repaired', 'Reconnect the kiosk and deliver on a fresh run.']]},
  'booth-router':{title:'Booth, router and scoreboard', band:'7-8', summary:'The booth joined to a router, with the scoreboard server beyond it.', layout:() => layoutOf([device('d1', 'pc', 'Crew laptop', 12, 18), device('d2', 'switch', 'Booth switch', 37, 50), device('d3', 'pc', 'Photo kiosk', 12, 82), device('d4', 'router', 'Fair router', 63, 50), device('d5', 'server', 'Scoreboard', 88, 50)], [cable('l1', 'd1', 0, 'd2', 0), cable('l2', 'd3', 0, 'd2', 1), cable('l3', 'd2', 2, 'd4', 0), cable('l4', 'd4', 1, 'd5', 0)], 'd1', 'd5'), net:{}, show:{},
    checks:[['beyond', 'Reach the scoreboard beyond the router.'], ['local-holds', 'Unplug the switch from the router: the kiosk on the same switch still receives a packet.'], ['beyond-lost', 'With that cable out, the scoreboard beyond the router is unreachable.']]},
  wifi:{title:'Camera tablet on the fair Wi-Fi', band:'9-10', summary:'A camera tablet, the fair access point, a scoreboard and a name server. The tablet has not joined yet.', layout:() => layoutOf([device('d1', 'pc', 'Camera tablet', 12, 50), device('d2', 'access-point', 'Fair access point', 37, 50), device('d3', 'switch', 'Fair switch', 63, 50), device('d4', 'server', 'Scoreboard', 88, 18), device('d5', 'server', 'Name server', 88, 82)], [cable('l1', 'd2', 0, 'd3', 0), cable('l2', 'd3', 1, 'd4', 0), cable('l3', 'd3', 2, 'd5', 0)], 'd1', 'd4'), net:{}, show:{addresses:true, test:true},
    checks:[['left', 'With the tablet off the Wi-Fi, wireless delivery stops.'], ['address-ok', 'Joined, with the wrong name server: the test by address still works.'], ['name-fails', 'Joined, with the wrong name server: the test by name stops at the lookup.'], ['name-ok', 'With the working name server restored, the test by name passes.']]},
  guest:{title:'Guest booth and scoring service', band:'11-12', summary:'A guest booth and the scoring service on two networks, joined by a gateway with a guest policy.', layout:() => layoutOf([device('d1', 'pc', 'Guest laptop', 12, 50), device('d2', 'switch', 'Guest switch', 37, 50), device('d3', 'router', 'Gateway', 63, 50), device('d4', 'switch', 'Fair switch', 88, 50), device('d5', 'server', 'Scoreboard', 63, 18), device('d6', 'server', 'Staff files', 63, 82)], [cable('l1', 'd1', 0, 'd2', 0), cable('l2', 'd2', 1, 'd3', 0), cable('l3', 'd3', 1, 'd4', 0), cable('l4', 'd4', 1, 'd5', 0), cable('l5', 'd4', 2, 'd6', 0)], 'd1', 'd5'), net:{}, show:{addresses:true, policy:true, details:true},
    checks:[['scores-open', 'With “allow the scoreboard; block staff files”, the scoreboard opens.'], ['staff-blocked', 'As the same guest, with the same policy, staff files are blocked.'], ['block-both', 'Blocking everything also blocks the scoreboard, which fails the brief.'], ['inspected', 'On the allowed path, open the packet details at the gateway: the frame changes, the destination IP does not, and the hop allowance drops by one.']]}
});
export const simStarter = id => Object.hasOwn(SIM_STARTERS, id) ? SIM_STARTERS[id] : null;
export const SIM_GUIDE_PREDICTIONS = Object.freeze([['switch', 'The booth switch'], ['kiosk', 'The photo kiosk'], ['nobody', 'Nobody: it stays in the laptop']]);

/** Evidence for a starter's practice checklist, read from the runs the learner actually made. */
export function simChecks(starterId, log, extras = {}) {
  const starter = simStarter(starterId), runs = Array.isArray(log) ? log : [], kiosk = run => /kiosk/iu.test(run.targetLabel), score = run => /score/iu.test(run.targetLabel), staff = run => /staff/iu.test(run.targetLabel);
  const firstFail = runs.findIndex(run => !run.delivered && run.kind === 'link' && kiosk(run));
  const rules = {
    first:() => runs.some(run => run.delivered && kiosk(run)), unplugged:() => firstFail >= 0, repaired:() => firstFail >= 0 && runs.slice(firstFail + 1).some(run => run.delivered && kiosk(run)),
    beyond:() => runs.some(run => run.delivered && run.crossedRouter), 'local-holds':() => runs.some(run => run.delivered && !run.crossedRouter && run.routerCut), 'beyond-lost':() => runs.some(run => !run.delivered && run.routerCut && run.targetType === 'server'),
    left:() => runs.some(run => !run.delivered && run.kind === 'link' && run.sourceOffline), 'address-ok':() => runs.some(run => run.delivered && run.wireless && run.test === 'address' && !run.dnsWorks), 'name-fails':() => runs.some(run => run.kind === 'lookup' && run.sourceOnline && !run.dnsWorks), 'name-ok':() => runs.some(run => run.delivered && run.test === 'name' && run.dnsWorks),
    'scores-open':() => runs.some(run => run.delivered && run.policy === 'scores-only' && score(run)), 'staff-blocked':() => runs.some(run => run.kind === 'policy' && run.policy === 'scores-only' && staff(run) && runs.some(other => other.delivered && other.policy === 'scores-only' && score(other) && other.sourceId === run.sourceId)), 'block-both':() => runs.some(run => run.kind === 'policy' && run.policy === 'block-all' && score(run)), inspected:() => extras.inspected === true
  };
  return (starter?.checks || []).map(([id, label]) => ({id, label, done:rules[id]()}));
}

export const SIM_GOALS = TRACE_GOALS;
export function initialPacketSim({start = 'build', starter = '', from = ''} = {}) {
  const chosen = simStarter(start === 'guide' ? 'booth' : starter), id = start === 'guide' ? 'booth' : chosen ? starter : '';
  return {start:start === 'guide' ? 'guide' : 'build', starter:id, from, net:{...initialSimNet(), ...(chosen?.net || {})}, show:{addresses:false, details:false, policy:false, test:false, ...(chosen?.show || {})}, selected:'', run:null, previous:null, step:0, predict:'', hints:0, log:[], goals:[], inspected:false, runs:0};
}
const result = (layout, sim, message, kind = 'info') => ({layout, sim, message, kind});
/** One learner action on the simulator: build, set, send or step. Practice only: this never touches a mission record. */
export function applyPacketSimAction(layoutState, simState, action, value) {
  let layout = normalizeNetworkStudioState(layoutState); const sim = {...simState, net:normalizeSimNet(simState.net, layout), show:{...simState.show}, log:[...simState.log], goals:[...simState.goals]};
  const edit = (name, payload) => {const change = applyNetworkStudioAction(layout, name, payload); layout = change.state; sim.net = normalizeSimNet(sim.net, layout); return change;};
  const settle = message => {const stale = sim.run && sim.run.signature !== simSignature(layout, sim.net); return result(layout, sim, message + (stale ? ' Your last run is now previous evidence. Send a fresh packet.' : ''));};
  if (action === 'starter') {const next = initialPacketSim({start:'build', starter:value, from:sim.from}), starter = simStarter(value); if (!starter) return result(layout, sim, 'Choose a listed starter.', 'warning'); layout = normalizeNetworkStudioState(starter.layout()); next.net = normalizeSimNet(next.net, layout); return result(layout, next, starter.title + ' opened. Every part of it can be changed.');}
  if (['add-device', 'remove-device', 'move-device', 'connect', 'disconnect', 'power-device', 'select-source', 'select-target'].includes(action)) {const change = edit(action, value); if (action === 'add-device' && change.changed) sim.selected = layout.devices.at(-1).id; return settle(change.message);}
  if (action === 'select') {if (layout.devices.some(item => item.id === value)) sim.selected = value; return result(layout, sim, 'Selected ' + (layout.devices.find(item => item.id === value)?.label || 'nothing') + '.');}
  if (action === 'wifi') {
    const pc = layout.devices.find(item => item.id === value?.id && item.type === 'pc'), ap = layout.devices.find(item => item.id === value?.ap && item.type === 'access-point');
    if (!pc) return result(layout, sim, 'Choose a computer or tablet.', 'warning');
    if (ap) sim.net.wifi = {...sim.net.wifi, [pc.id]:ap.id}; else {const {[pc.id]:gone, ...rest} = sim.net.wifi; sim.net.wifi = rest;}
    sim.net = normalizeSimNet(sim.net, layout);
    return settle(ap ? pc.label + ' joined ' + ap.label + '. That is a wireless link.' : pc.label + ' left the Wi-Fi. Its wireless link is gone.');
  }
  if (action === 'host') {
    const host = layout.devices.find(item => item.id === value?.id), field = value?.field;
    if (!host || !['ip', 'prefix', 'gateway', 'dns'].includes(field)) return result(layout, sim, 'Choose a device and a setting.', 'warning');
    const entry = {...(sim.net.hosts[host.id] || {})}, text = String(value.value ?? '').trim();
    if (text === '' || text === 'auto') delete entry[field];
    else if (field === 'prefix') {if (!SIM_PREFIXES.includes(Number(text))) return result(layout, sim, 'Choose a listed prefix.', 'warning'); entry.prefix = Number(text);}
    else if (parseIp(text) === null) return result(layout, sim, 'An address is four numbers from 0 to 255 with dots between them, such as 10.40.2.11.', 'warning');
    else entry[field] = text;
    sim.net = normalizeSimNet({...sim.net, hosts:{...sim.net.hosts, [host.id]:entry}}, layout);
    return settle(host.label + ': ' + {ip:'address', prefix:'prefix', gateway:'gateway', dns:'name server'}[field] + ' ' + (text === '' || text === 'auto' ? 'set back to automatic.' : 'set to ' + (field === 'prefix' ? '/' : '') + text + '.'));
  }
  if (action === 'policy' || action === 'test' || action === 'ttl') {const next = normalizeSimNet({...sim.net, [action]:action === 'ttl' ? Number(value) : value}, layout); if (next[action] === sim.net[action]) return result(layout, sim, 'That is already the setting.'); sim.net = next; return settle({policy:'Gateway policy changed.', test:'Test changed: ' + (next.test === 'name' ? 'by name.' : 'by address.'), ttl:'Starting hop allowance set to ' + next.ttl + '.'}[action]);}
  if (action === 'show') {if (['addresses', 'details', 'policy', 'test'].includes(value?.name)) sim.show[value.name] = value.on === true; if (sim.show.details && sim.run?.events[sim.step]?.changed.includes('frame') && sim.run.outcome.delivered) sim.inspected = true; return result(layout, sim, value?.on ? 'Shown.' : 'Hidden.');}
  if (action === 'predict') {if (!SIM_GUIDE_PREDICTIONS.some(([id]) => id === value)) return result(layout, sim, 'Choose a listed prediction.', 'warning'); sim.predict = value; return result(layout, sim, 'Prediction noted. Now send the packet.');}
  if (action === 'hint') {sim.hints += 1; return result(layout, sim, 'Hint shown. Hints and retries carry no penalty.');}
  if (action === 'send') {
    const run = simulatePacket(layout, sim.net), table = simAddressing(layout, sim.net), devices = new Map(layout.devices.map(item => [item.id, item])), src = devices.get(layout.source);
    if (!run.events.length) return result(layout, sim, run.outcome.reason, 'warning');
    const reach = id => {const seen = new Set([id]), queue = [id]; for (const at of queue) for (const link of [...layout.links, ...Object.entries(sim.net.wifi).map(([from, to]) => ({from, to}))]) {const next = link.from === at ? link.to : link.to === at ? link.from : null; if (next && !seen.has(next) && devices.get(next).powered && devices.get(at).powered) {seen.add(next); if (isBridge(devices.get(next))) queue.push(next);}} return seen;};
    const near = src ? reach(src.id) : new Set(), hasRouter = layout.devices.some(item => item.type === 'router'), online = near.size > 1;
    if (sim.run && sim.run.signature !== simSignature(layout, sim.net)) sim.previous = sim.run;
    sim.runs += 1; sim.run = {n:sim.runs, signature:simSignature(layout, sim.net), events:run.events, outcome:run.outcome}; sim.step = 0;
    sim.log = [...sim.log, {...run.facts, n:sim.runs, targetType:devices.get(layout.target)?.type || '', routerCut:hasRouter && ![...near].some(id => devices.get(id).type === 'router'), sourceOnline:online, sourceOffline:!online, dnsWorks:!!table.nameServer && table.table.get(layout.source)?.dns === table.table.get(table.nameServer.id)?.ip}].slice(-60);
    if (run.outcome.goal && !sim.goals.includes(run.outcome.goal)) sim.goals = SIM_GOALS.map(goal => goal.id).filter(id => id === run.outcome.goal || sim.goals.includes(id));
    return result(layout, sim, 'Packet ' + sim.runs + ' sent. Step 1 of ' + run.events.length + ': ' + run.events[0].title + '.', 'info');
  }
  if (!sim.run) return result(layout, sim, 'Send a packet first.', 'warning');
  const last = sim.run.events.length - 1;
  if (action === 'next') sim.step = Math.min(sim.step + 1, last);
  else if (action === 'back') sim.step = Math.max(sim.step - 1, 0);
  else if (action === 'end') sim.step = last;
  else if (action === 'replay') sim.step = 0;
  else if (action === 'goto') sim.step = Math.min(Math.max(Number.isSafeInteger(value) ? value : 0, 0), last);
  else if (action === 'restart') {sim.run = null; sim.previous = null; sim.step = 0; return result(layout, sim, 'Trace cleared. Your layout is unchanged.');}
  else return result(layout, sim, 'Choose a displayed control.');
  const event = sim.run.events[sim.step];
  if (sim.show.details && event.changed.includes('frame') && sim.run.outcome.delivered) sim.inspected = true;
  const atEnd = sim.step === last;
  return result(layout, sim, 'Step ' + (sim.step + 1) + ' of ' + sim.run.events.length + ': ' + event.title + '.' + (atEnd ? ' ' + sim.run.outcome.reason : ''), atEnd ? (sim.run.outcome.delivered ? 'success' : 'warning') : 'info');
}
/** Whether the run on screen still matches the build. A changed build keeps the run as previous evidence. */
export const simRunIsCurrent = (layout, sim) => !!sim.run && sim.run.signature === simSignature(layout, sim.net);
export const packetSimHasWork = sim => !!sim && (sim.runs > 0 || (Array.isArray(sim.goals) && sim.goals.length > 0));
