import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialNetworkStudioState, normalizeNetworkStudioState, networkDeviceLabel} from '../src/network-studio-model.js';
import {SIM_STARTERS, SIM_GOALS, applyPacketSimAction, initialPacketSim, normalizeSimNet, parseIp, simAddressing, simChecks, simRunIsCurrent, simServerName, simulatePacket} from '../src/packet-sim-model.js';
import {renderPacketSim, guideStage, simLink, simReturn} from '../src/packet-sim.js';
import {TRACE_GOALS} from '../src/packet-trace-model.js';
import {learningRoute} from '../src/learning-routes.js';
import {routeAccess} from '../src/access-policy.js';
import {FAIR_SIM_STARTERS} from '../src/fair-catalog.js';
import {renderFairMissionPage} from '../src/fair-mission-page.js';
import {FAIR_RECORDS} from '../src/fair-catalog.js';
import {normalizeLabRecord} from '../src/records.js';
import {renderNetworkingPathway} from '../src/networking-pathway.js';
import {bundleTier} from '../scripts/tier-bundles.mjs';
import {NETWORKING_REDIRECTS} from '../scripts/build.mjs';

/** A crew at the simulator: every action goes through the same reducer the page uses. */
function bench(options) {
  let sim = initialPacketSim(options), layout = normalizeNetworkStudioState(SIM_STARTERS[sim.starter || 'blank'].layout()), last = null;
  const api = {
    do(action, value) {last = applyPacketSimAction(layout, sim, action, value); layout = last.layout; sim = last.sim; return last;},
    send() {api.do('send'); return sim.run;},
    cable(a, pa, b, pb) {return api.do('connect', {from:a, fromPort:pa, to:b, toPort:pb});},
    unplug(a, b) {const link = layout.links.find(item => [item.from, item.to].includes(a) && [item.from, item.to].includes(b)); return api.do('disconnect', {id:link.id});},
    get sim() {return sim;}, get layout() {return layout;}, get last() {return last;},
    labels() {return sim.run.events.map(event => event.label);}, checks() {return simChecks(sim.starter, sim.log, {inspected:sim.inspected}).map(item => item.done);},
    html(extra) {return renderPacketSim(layout, sim, extra);}
  };
  return api;
}

test('from an empty board: connect a computer and a kiosk to a switch, deliver, unplug, see both traces stop, reconnect and deliver on a fresh run', () => {
  const b = bench({start:'build', starter:'blank'});
  assert.equal(b.layout.devices.length, 0);
  b.do('add-device', {type:'pc'}); b.do('add-device', {type:'pc'}); b.do('add-device', {type:'switch'});
  assert.deepEqual(b.layout.devices.map(device => device.label), ['PC 1', 'PC 2', 'Switch 3']);
  assert.equal(b.send().outcome.kind, 'link', 'no cables yet: the first packet has nowhere to go');
  b.cable('d1', 0, 'd3', 0); b.cable('d2', 0, 'd3', 1);
  const delivered = b.send();
  assert.equal(delivered.outcome.delivered, true);
  assert.deepEqual(b.labels(), ['PC 1', 'Switch 3', 'PC 2', 'PC 1'], 'the devices in the trace are the ones the student placed');
  assert.match(delivered.events[1].text, /Switch 3 sends this piece out port 2, which is connected to PC 2/u);
  assert.equal(delivered.events.at(-1).phase, 'reply'); assert.match(delivered.events.at(-1).text, /The reply travels back the same way: PC 2 → Switch 3 → PC 1/u);
  // Remove the kiosk cable: the old run becomes previous evidence, and a fresh run stops in both the picture and the words.
  assert.match(b.unplug('d2', 'd3').message, /previous evidence/u);
  assert.equal(simRunIsCurrent(b.layout, b.sim), false); assert.match(b.html(), /Previous evidence\./u);
  const stopped = b.send();
  assert.deepEqual([stopped.outcome.kind, stopped.outcome.delivered, stopped.outcome.stoppedAt], ['link', false, 'd3']);
  assert.deepEqual(stopped.outcome.attention, {from:'d3', to:'d2'}); assert.match(stopped.outcome.question, /Which link between Switch 3 and PC 2 needs attention\?/u);
  assert.deepEqual(b.labels(), ['PC 1', 'Switch 3']);
  b.do('end'); b.do('next');
  const page = b.html();
  assert.match(page, /class="sim-node is-stopped[^"]*"><rect[^>]*\/><text[^>]*>Switch 3<\/text><text[^>]*>packet stopped here<\/text>/u, 'the visible trace stops at the switch');
  assert.match(page, /Switch 3 \(switch\) — the packet stopped here/u, 'the text view says the same');
  assert.match(page, /class="sim-link is-missing"/u); assert.match(page, /Stopped: a link needs attention/u); assert.equal((page.match(/data-sim-goto="/gu) || []).length, 2, 'the written trace has the same two events');
  assert.equal(b.sim.previous.outcome.delivered, true, 'the delivery is kept for comparison');
  b.cable('d2', 0, 'd3', 1);
  const again = b.send();
  assert.equal(again.outcome.delivered, true); assert.equal(again.n, 4, 'a fresh run, not the old one'); assert.equal(simRunIsCurrent(b.layout, b.sim), true);
});

test('grades 7–8: the first photo packet, then a router with the scoreboard beyond it', () => {
  const booth = bench({start:'guide'});
  assert.deepEqual(booth.layout.devices.map(device => device.label), ['Crew laptop', 'Booth switch', 'Photo kiosk']);
  assert.equal(guideStage(booth.layout, booth.sim), 'connect');
  booth.cable('d3', 0, 'd2', 1); assert.equal(guideStage(booth.layout, booth.sim), 'predict');
  booth.do('predict', 'kiosk'); assert.equal(guideStage(booth.layout, booth.sim), 'send');
  assert.equal(booth.send().outcome.delivered, true); assert.equal(guideStage(booth.layout, booth.sim), 'unplug');
  assert.match(booth.html(), /The booth switch had it next\./u, 'a mistaken prediction gets a specific answer');
  booth.unplug('d3', 'd2'); assert.equal(guideStage(booth.layout, booth.sim), 'send-broken');
  assert.equal(booth.send().outcome.kind, 'link'); assert.equal(guideStage(booth.layout, booth.sim), 'repair');
  assert.match(booth.sim.run.outcome.reason, /Photo kiosk has no cable plugged in\. The frame stops at Booth switch\./u);
  booth.do('hint'); assert.match(booth.html(), /Which two ports did you join the first time\?/u);
  booth.cable('d3', 0, 'd2', 1); assert.equal(guideStage(booth.layout, booth.sim), 'send-fixed');
  booth.send(); assert.equal(guideStage(booth.layout, booth.sim), 'done'); assert.deepEqual(booth.checks(), [true, true, true]);

  const fair = bench({start:'build', starter:'booth-router'});
  const routed = fair.send();
  assert.equal(routed.outcome.delivered, true); assert.deepEqual(fair.labels(), ['Crew laptop', 'Booth switch', 'Fair router', 'Fair router', 'Scoreboard', 'Crew laptop']);
  fair.unplug('d2', 'd4');
  const lost = fair.send();
  assert.deepEqual([lost.outcome.kind, lost.outcome.stoppedAt], ['link', 'd2'], 'beyond the router is unreachable, and the last successful step is the switch');
  assert.match(lost.outcome.reason, /No working link joins Booth switch to Fair router/u);
  fair.do('select-target', {id:'d3'});
  const local = fair.send();
  assert.equal(local.outcome.delivered, true, 'the kiosk on the same switch still receives a packet'); assert.equal(local.events.some(event => event.label === 'Fair router'), false);
  assert.deepEqual(fair.checks(), [true, true, true]);
});

test('grades 9–10: join the fair Wi-Fi, then compare a test by address with a test by name after changing the name server', () => {
  const b = bench({start:'build', starter:'wifi'});
  const off = b.send();
  assert.equal(off.outcome.kind, 'link'); assert.match(off.outcome.reason, /has not joined the Wi-Fi/u); assert.equal(off.events.length, 1);
  assert.match(b.do('wifi', {id:'d1', ap:'d2'}).message, /joined Fair access point\. That is a wireless link\./u);
  const scoreboard = simAddressing(b.layout, b.sim.net).table.get('d4').ip;
  assert.equal(b.send().outcome.delivered, true); assert.deepEqual(b.labels().slice(0, 4), ['Camera tablet', 'Fair access point', 'Fair switch', 'Scoreboard']);
  assert.equal(simAddressing(b.layout, b.sim.net).table.get('d4').ip, scoreboard, 'joining Wi-Fi does not renumber the servers');
  b.do('host', {id:'d1', field:'dns', value:'10.40.2.99'});
  assert.equal(b.send().outcome.delivered, true, 'with the wrong name server, the address test still works');
  b.do('test', 'name');
  const failed = b.send();
  assert.equal(failed.outcome.kind, 'lookup'); assert.ok(failed.events.every(event => event.phase === 'lookup'), 'no packet was sent to the scoreboard');
  assert.match(failed.outcome.reason, /Nothing at 10\.40\.2\.99 answers name questions.*The cables to Scoreboard were not tested\./u);
  b.do('host', {id:'d1', field:'dns', value:''});
  const named = b.send();
  assert.equal(named.outcome.delivered, true); assert.deepEqual(named.events.slice(0, 2).map(event => [event.phase, event.label]), [['lookup', 'Camera tablet'], ['lookup', 'Name server']]);
  assert.match(named.events[1].text, new RegExp(simServerName({label:'Scoreboard'}) + ' is ' + scoreboard.replaceAll('.', '\\.')));
  b.do('wifi', {id:'d1', ap:''});
  assert.equal(b.send().outcome.kind, 'link', 'leaving Wi-Fi removes the wireless link'); assert.deepEqual(b.checks(), [true, true, true, true]);
});

test('grades 11–12: two subnets, a gateway policy tested as the same guest, and the routed packet inspected', () => {
  const b = bench({start:'build', starter:'guest'});
  const table = simAddressing(b.layout, b.sim.net).table;
  assert.notEqual(table.get('d1').ip.split('.')[2], table.get('d5').ip.split('.')[2], 'the guest booth and the scoring service are on different subnets');
  assert.equal(b.send().outcome.delivered, true); b.do('select-target', {id:'d6'}); assert.equal(b.send().outcome.delivered, true, 'with everything allowed, staff files open too');
  b.do('policy', 'scores-only');
  const staff = b.send();
  assert.deepEqual([staff.outcome.kind, staff.outcome.stoppedAt], ['policy', 'd3']); assert.match(staff.outcome.reason, /The cables are fine: this is a permission decision\./u);
  b.do('select-target', {id:'d5'});
  const scores = b.send();
  assert.equal(scores.outcome.delivered, true);
  const opened = scores.events.find(event => event.changed.includes('ttl')), rebuilt = scores.events.find(event => event.changed.includes('frame')), first = scores.events[0];
  assert.deepEqual([opened.label, rebuilt.label], ['Gateway', 'Gateway']);
  assert.notDeepEqual(rebuilt.frame, first.frame, 'frame addresses change at the router'); assert.equal(rebuilt.ip.dst, first.ip.dst, 'the destination IP stays the same'); assert.equal(rebuilt.ip.src, first.ip.src);
  assert.deepEqual(scores.events.filter(event => event.ip).map(event => event.ip.ttl), [64, 64, 63, 63, 63, 63], 'TTL drops only when the router forwards');
  b.do('policy', 'block-all');
  assert.equal(b.send().outcome.kind, 'policy', 'blocking both fails the brief');
  assert.deepEqual(b.checks(), [true, true, true, false]);
  b.do('policy', 'scores-only'); b.send(); b.do('show', {name:'details', on:true}); b.do('goto', 3);
  assert.equal(b.sim.inspected, true); assert.deepEqual(b.checks(), [true, true, true, true]);
  assert.match(b.html(), /Frame destination \(hardware address\)<\/th><td>[^<]+<\/td><td class="fair-now">[^<]+ <em>\(changed at this step\)<\/em>/u);
});

test('a relevant change makes the old run previous evidence; stepping back, replay and restart never send a new packet', () => {
  const b = bench({start:'build', starter:'booth-router'});
  b.send(); const runs = b.sim.runs, log = b.sim.log.length;
  b.do('next'); b.do('next'); b.do('back'); assert.equal(b.sim.step, 1);
  b.do('replay'); assert.equal(b.sim.step, 0); b.do('goto', 99); assert.equal(b.sim.step, b.sim.run.events.length - 1);
  assert.deepEqual([b.sim.runs, b.sim.log.length], [runs, log], 'reviewing a run is not a new test');
  b.do('move-device', {id:'d1', x:12, y:30}); assert.equal(simRunIsCurrent(b.layout, b.sim), true, 'moving a device changes nothing about the network');
  for (const [action, value] of [['power-device', {id:'d4', powered:false}], ['select-target', {id:'d3'}], ['ttl', '1'], ['host', {id:'d1', field:'gateway', value:'10.40.2.99'}]]) {
    const fresh = bench({start:'build', starter:'booth-router'}); fresh.send();
    assert.match(fresh.do(action, value).message, /previous evidence/u, action); assert.equal(simRunIsCurrent(fresh.layout, fresh.sim), false, action);
    fresh.send(); assert.equal(fresh.sim.previous.n, 1, action + ': the earlier run is kept beside the fresh one');
  }
  const devices = b.layout.devices.length, cables = b.layout.links.length;
  assert.match(b.do('restart').message, /Your layout is unchanged/u); assert.equal(b.sim.run, null); assert.deepEqual([b.layout.devices.length, b.layout.links.length], [devices, cables]);
  assert.equal(b.do('next').kind, 'warning');
});

test('the result follows the build: power, a second router, a wrong gateway, hop allowance and unknown addresses', () => {
  const off = bench({start:'build', starter:'booth-router'}); off.do('power-device', {id:'d2', powered:false});
  assert.match(off.send().outcome.reason, /Booth switch is powered off/u);
  const expired = bench({start:'build', starter:'booth-router'}); expired.do('ttl', '1');
  assert.deepEqual([expired.send().outcome.kind, expired.sim.run.events.at(-1).ip.ttl], ['expired', 0]);
  const gateway = bench({start:'build', starter:'booth-router'}); gateway.do('host', {id:'d1', field:'gateway', value:'10.40.2.200'});
  assert.match(gateway.send().outcome.reason, /who has 10\.40\.2\.200\?.*cannot reach its gateway/u); assert.equal(gateway.sim.run.outcome.goal, 'no-gateway');
  assert.equal(gateway.do('host', {id:'d1', field:'gateway', value:'not an address'}).kind, 'warning');
  // Two routers in a row: built by hand, and the hop allowance drops once at each.
  const two = bench({start:'build', starter:'booth-router'});
  two.unplug('d4', 'd5'); two.do('add-device', {type:'router'}); two.cable('d4', 1, 'd6', 0); two.cable('d6', 1, 'd5', 0);
  const far = two.send();
  assert.equal(far.outcome.delivered, true); assert.deepEqual(far.events.filter(event => event.changed.includes('ttl')).map(event => [event.label, event.ip.ttl]), [['Fair router', 63], ['Router 6', 62]]);
  // A router is not a destination, and a switch does not join two networks.
  const wrong = bench({start:'build', starter:'booth-router'}); wrong.do('select-target', {id:'d4'});
  assert.equal(wrong.send().outcome.kind, 'address');
  assert.deepEqual(SIM_GOALS, TRACE_GOALS, 'the tracer’s practice goals are kept');
  const goals = bench({start:'build', starter:'booth-router'}); goals.send(); goals.do('select-target', {id:'d3'}); goals.send(); goals.unplug('d1', 'd2'); goals.send();
  assert.deepEqual(goals.sim.goals, ['local', 'routed', 'no-link']);
});

test('settings and layouts are data: junk, unknown devices and unsafe names are dropped', () => {
  const layout = SIM_STARTERS.wifi.layout();
  assert.deepEqual(normalizeSimNet({hosts:{d1:{ip:'999.1.1.1', dns:'10.40.2.99', prefix:99}, d99:{ip:'10.0.0.1'}, d2:{ip:'10.0.0.2'}}, wifi:{d1:'d3', d4:'d2'}, policy:'open-sesame', test:'guess', ttl:7}, layout).hosts, {d1:{dns:'10.40.2.99'}});
  const net = normalizeSimNet({wifi:{d1:'d3', d4:'d2'}, policy:'x', test:'y', ttl:7}, layout);
  assert.deepEqual([net.wifi, net.policy, net.test, net.ttl], [{}, 'allow-all', 'address', 64], 'only a computer can join, and only an access point can be joined');
  for (const junk of [null, 5, 'x', []]) assert.deepEqual(normalizeSimNet(junk, layout).hosts, {});
  assert.deepEqual([parseIp('10.40.2.11') !== null, parseIp('10.40.2'), parseIp('10.40.2.256'), parseIp('a.b.c.d')], [true, null, null, null]);
  assert.equal(networkDeviceLabel('Photo kiosk', 'pc', 'd3'), 'Photo kiosk');
  for (const bad of ['<img src=x>', '', 'x'.repeat(40), 7, 'a"b']) assert.equal(networkDeviceLabel(bad, 'pc', 'd3'), 'PC 3');
  assert.equal(normalizeNetworkStudioState({...layout, devices:layout.devices.map(device => ({...device, label:'<b>' + device.label}))}).devices[0].label, 'PC 1');
  assert.deepEqual(normalizeNetworkStudioState(initialNetworkStudioState()).devices.map(device => device.label), ['PC 1', 'Switch 2', 'Router 3', 'Server 4', 'Printer 5'], 'Network Studio’s own starter is unchanged');
  for (const [id, starter] of Object.entries(SIM_STARTERS)) {const built = normalizeNetworkStudioState(starter.layout()); assert.equal(built.devices.length, starter.layout().devices.length, id + ' keeps every device'); assert.equal(built.links.length, starter.layout().links.length, id);}
});

test('the page: two ways in, native controls, labeled ports, a text view, and no auto-play under reduced motion', () => {
  const build = bench({start:'build', starter:'booth'}), html = build.html();
  for (const label of ['+ Computer', '+ Switch', '+ Router', '+ Access point', '+ Server', '+ Printer']) assert.ok(html.includes(label), label);
  assert.match(html, /<option value="d3:0">Photo kiosk · port 1<\/option>/u, 'ports are chosen by name');
  for (const control of ['sim-send', 'sim-back', 'sim-next', 'sim-play', 'sim-replay', 'sim-restart', 'sim-show-details', 'sim-source', 'sim-target', 'sim-power', 'sim-move-up']) assert.ok(html.includes('data-key="' + control + '"'), control);
  assert.match(html, /role="img" aria-label="Your network\./u); assert.match(html, /Text view of the map/u); assert.doesNotMatch(html, /draggable|pointerdown|Cisco/u);
  assert.match(html, /a practice run never completes a mission/u);
  assert.equal(build.html({reduced:true}).includes('data-key="sim-play"'), false); assert.match(build.html({reduced:true}), /Reduced motion is on, so the packet moves only when you step\./u);
  assert.equal(html.includes('data-key="sim-host-ip"'), false, 'beginners are not shown address settings');
  assert.ok(bench({start:'build', starter:'wifi'}).html().includes('data-key="sim-host-dns"'), 'a challenge that uses them reveals them');
  const guide = bench({start:'guide'}).html();
  assert.match(guide, /The winning team just took a photo\. It travels in small pieces called packets\. Can you get the first packet to the kiosk\?/u);
  assert.match(guide, /one of you builds and the other predicts\. Swap jobs for the repair\./u); assert.equal(guide.includes('data-key="sim-add-pc"'), false, 'the guide keeps to cables and sending');
  assert.equal(simLink({start:'guide'}), '#networking/simulator?start=guide'); assert.equal(simLink({start:'build', starter:'wifi', from:'FAIR-210.explain'}), '#networking/simulator?start=build&starter=wifi&from=FAIR-210.explain');
});

test('routes, links and missions: both starting choices are shareable, old links still work, and a mission links its starter with a way back', () => {
  const guide = learningRoute('#networking/simulator?start=guide'), build = learningRoute('#networking/simulator?start=build&starter=guest&from=FAIR-210.explain.challenge');
  assert.deepEqual([guide.page, guide.id, guide.start, guide.starter], ['networking', 'simulator', 'guide', undefined]);
  assert.deepEqual([build.start, build.starter, build.from], ['build', 'guest', 'FAIR-210.explain.challenge']);
  assert.equal(learningRoute('#networking/simulator?starter=../x&from=javascript:1').starter, undefined); assert.equal(learningRoute('#networking/simulator?from=NET-204.request').from, undefined);
  for (const hash of ['#networking/simulator', '#networking/trace', '#networking']) assert.equal(routeAccess(learningRoute(hash)), 'public', hash);
  assert.equal(routeAccess(learningRoute('#studio/network')), 'member', 'Network Studio keeps its own access rule');
  const redirects = new Map(NETWORKING_REDIRECTS);
  assert.equal(redirects.get('/networking/first-packet'), '/networking#networking/simulator?start=guide'); assert.equal(redirects.get('/networking/build'), '/networking#networking/simulator?start=build'); assert.equal(redirects.get('/networking/trace'), '/networking#networking/trace');
  assert.deepEqual(simReturn('FAIR-208.workbench.independent'), {id:'FAIR-208', step:'workbench', href:'#lab/FAIR-208/workbench?mode=independent'}); assert.equal(simReturn('NET-208.workbench'), null);
  assert.deepEqual(FAIR_SIM_STARTERS, {'FAIR-208':'booth', 'FAIR-215':'booth-router', 'FAIR-210':'guest'});
  for (const [id, starter] of Object.entries(FAIR_SIM_STARTERS)) {
    const scenario = FAIR_RECORDS.find(item => item.id === id), record = normalizeLabRecord(scenario, undefined);
    assert.equal(renderFairMissionPage(scenario, record).includes('data-fair-body'), true);
    const from = id + '.explain.guided', opened = bench({start:'build', starter, from});
    assert.match(opened.html(), new RegExp('href="#lab/' + id + '/explain\\?mode=guided" data-sim-return'), id + ' has a way back to the same step');
    // Practice leaves the mission record exactly as it was.
    opened.send(); assert.deepEqual(normalizeLabRecord(scenario, record), record, id);
  }
  const hub = renderNetworkingPathway({band:'7-8', origin:'https://example.test'});
  assert.match(hub, /href="#networking\/simulator\?start=guide" data-sim-start="guide">Guide my first packet/u); assert.match(hub, /href="#networking\/simulator\?start=build" data-sim-start="build">Build my own network/u);
  assert.ok(hub.includes('value="https://example.test/networking/first-packet"') && hub.includes('value="https://example.test/networking/build"'));
});

test('practice isolation and release modes: the simulator keeps no record and works in both builds', async () => {
  for (const file of ['../src/packet-sim-model.js', '../src/packet-sim.js']) assert.doesNotMatch(await readFile(new URL(file, import.meta.url), 'utf8'), /fair-missions|records\.js|local-work|localStorage|fetch\(/u, file + ' has no path to saved work or the network');
  assert.match(await readFile(new URL('../src/app.js', import.meta.url), 'utf8'), /route\.starter==='current'\?'':route\.starter\|\|'blank'/u, '“Build my own network” opens an empty board unless the link asks for the Studio layout');
  const fresh = bench({start:'build', starter:'booth'}).last;
  assert.equal(fresh, null);
  for (const options of [{member:true, localOnly:true, publicLabsOpen:true, split:true}, {member:false, split:true}]) {
    const built = await bundleTier(options), chunk = built.chunks.find(item => /lazy-tracer-/u.test(item.filename)), text = Buffer.from(chunk.javascript).toString('utf8'), entry = Buffer.from(built.javascript).toString('utf8');
    for (const marker of ['Guide my first packet', 'Photo kiosk', 'sends this piece out', 'this is a permission decision']) assert.ok(text.includes(marker), marker + (options.member ? ' (open)' : ' (preview)'));
    assert.equal(entry.includes('sends this piece out'), false, 'the engine downloads with the simulator, not with the home page');
    assert.ok(entry.includes('Cable connected.') || built.chunks.some(item => Buffer.from(item.javascript).toString('utf8').includes('Cable connected.')), 'the layout model is real in this build, so free practice can edit a network');
  }
});
