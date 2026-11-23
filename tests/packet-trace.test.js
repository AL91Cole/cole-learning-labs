import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACE_CONTROLS, TRACE_GOALS, TRACE_DEVICES, tracePacket, initialTraceState, normalizeTraceState, applyTraceAction, traceView} from '../src/packet-trace-model.js';
import {renderPacketTrace, traceHasWork} from '../src/packet-trace.js';
import {learningRoute} from '../src/learning-routes.js';
import {routeAccess} from '../src/access-policy.js';
import {bundleTier} from '../scripts/tier-bundles.mjs';
import {NETWORKING_REDIRECTS} from '../scripts/build.mjs';

const base = initialTraceState().config, trace = change => tracePacket({...base, ...change});
const all = () => TRACE_CONTROLS.reduce((rows, item) => rows.flatMap(row => item.options.map(([value]) => ({...row, [item.name]:value}))), [{}]);

test('a local packet goes straight to the kiosk and its frame never changes', () => {
  const result = trace({destination:'kiosk'});
  assert.equal(result.outcome, 'delivered'); assert.equal(result.goal, 'local');
  assert.deepEqual(result.steps.map(step => step.device), ['laptop', 'boothSwitch', 'kiosk']);
  assert.equal(new Set(result.steps.map(step => step.frame.dst)).size, 1); assert.equal(result.steps[0].frame.dst, TRACE_DEVICES.kiosk.mac);
  assert.ok(result.steps.every(step => step.ip.ttl === 64 && step.changed.length === 0), 'no router, so the hop allowance is untouched');
});

test('a routed packet is addressed to the gateway on the first link, then re-framed; the IP addresses never change', () => {
  const result = trace({destination:'scoreboard'});
  assert.equal(result.outcome, 'delivered'); assert.equal(result.goal, 'routed');
  assert.deepEqual(result.steps.map(step => step.device), ['laptop', 'laptop', 'boothSwitch', 'gatewayNear', 'gatewayFar', 'coreSwitch', 'scoreboard']);
  const framed = result.steps.filter(step => step.frame);
  assert.deepEqual(framed[0].frame, {src:TRACE_DEVICES.laptop.mac, dst:TRACE_DEVICES.gatewayNear.mac}, 'the gateway is the local next hop');
  assert.deepEqual(framed.at(-1).frame, {src:TRACE_DEVICES.gatewayFar.mac, dst:TRACE_DEVICES.scoreboard.mac});
  assert.deepEqual([...new Set(result.steps.map(step => step.ip.src + '>' + step.ip.dst))], ['10.40.8.71>10.20.0.30']);
  assert.deepEqual(result.steps.map(step => step.ip.ttl), [64, 64, 64, 63, 63, 63, 63], 'one router takes one hop');
  assert.deepEqual(result.steps.filter(step => step.changed.length).map(step => [step.device, step.changed]), [['gatewayNear', ['ttl']], ['gatewayFar', ['frame']]]);
});

test('each broken setup stops at the step that explains it', () => {
  const unplugged = trace({cable:'out', destination:'scoreboard'});
  assert.deepEqual([unplugged.outcome, unplugged.goal, unplugged.steps.length], ['laptop', 'no-link', 1]);
  const lost = trace({destination:'scoreboard', gateway:'10.40.8.1'});
  assert.deepEqual([lost.outcome, lost.goal], ['laptop', 'no-gateway']); assert.match(lost.steps.at(-1).text, /who has 10\.40\.8\.1\?.*nobody answers/u);
  assert.equal(trace({destination:'kiosk', gateway:'10.40.8.1'}).delivered, true, 'a wrong gateway does not matter on the same network');
  const expired = trace({destination:'scoreboard', ttl:'1'});
  assert.deepEqual([expired.outcome, expired.goal, expired.steps.at(-1).ip.ttl], ['gateway', 'expired', 0]);
  assert.equal(trace({destination:'kiosk', ttl:'1'}).delivered, true, 'no router, so one hop is enough');
  const blocked = trace({destination:'staff'});
  assert.deepEqual([blocked.outcome, blocked.goal, blocked.steps.at(-1).device], ['gateway', 'blocked', 'gatewayNear']);
  const unnamed = trace({destination:'name', dns:'10.20.0.99'});
  assert.equal(unnamed.outcome, 'laptop'); assert.equal(unnamed.steps.some(step => step.frame), false, 'no packet to the scoreboard was ever built');
  const named = trace({destination:'name'});
  assert.deepEqual([named.outcome, named.goal], ['delivered', 'name']); assert.equal(named.steps[1].device, 'names'); assert.equal(named.steps.at(-1).ip.dst, '10.20.0.30');
  assert.equal(trace({destination:'scoreboard', dns:'10.20.0.99'}).delivered, true, 'an address needs no name server');
});

test('every one of the 64 setups ends on a stop step, and every goal can be reached', () => {
  const setups = all(), goals = new Set();
  assert.equal(setups.length, 64);
  for (const config of setups) {
    const result = tracePacket(config);
    assert.ok(result.steps.length >= 1 && result.steps.at(-1).stop && result.steps.slice(0, -1).every(step => !step.stop), JSON.stringify(config));
    assert.ok(['delivered', 'laptop', 'gateway'].includes(result.outcome) && result.reason.length > 10);
    if (result.goal) goals.add(result.goal);
    for (const step of result.steps) assert.ok(step.title && step.text.length > 20 && traceView({config, sent:true, step:0}).scene.nodes.some(([id]) => id === step.device), step.device);
  }
  assert.deepEqual([...goals].sort(), TRACE_GOALS.map(goal => goal.id).sort());
});

test('stepping, predictions and goals: a packet is followed hop by hop and a changed setup needs a new packet', () => {
  let state = initialTraceState();
  const act = (action, value) => {const result = applyTraceAction(state, action, value); state = result.state; return result;};
  assert.equal(act('next').kind, 'warning', 'nothing to step through before a packet is sent');
  act('set', {name:'destination', value:'scoreboard'}); act('predict', 'gateway');
  assert.match(act('send').message, /^Step 1 of 7/u); assert.equal(traceView(state).result, null, 'no outcome is shown before the last hop');
  act('next'); act('next'); assert.equal(state.step, 2); act('back'); assert.equal(state.step, 1);
  assert.equal(act('predict', 'delivered').state.predict, 'gateway', 'a prediction cannot be changed once the packet is on its way');
  const end = act('end'); assert.equal(end.kind, 'success'); assert.deepEqual(state.done, ['routed']);
  const view = traceView(state);
  assert.deepEqual([view.result.outcome, view.result.predicted.match, view.atEnd], ['delivered', false, true]);
  assert.equal(view.scene.nodes.find(([id]) => id === 'scoreboard')[4], 'on');
  act('set', {name:'ttl', value:'1'});
  assert.deepEqual([state.sent, state.step, state.done], [false, 0, ['routed']], 'the old packet is gone; what was found is kept');
  act('send'); assert.equal(act('end').kind, 'warning'); assert.deepEqual(state.done, ['routed', 'expired']);
  assert.equal(act('set', {name:'ttl', value:'999'}).kind, 'warning'); assert.equal(act('set', {name:'nope', value:'x'}).kind, 'warning');
  for (const junk of [null, 5, [], {config:{destination:'moon'}, step:99, done:['x', 'local'], predict:'yes', sent:'true'}]) {const clean = normalizeTraceState(junk); assert.deepEqual(clean.config, base); assert.equal(clean.sent, false); assert.equal(clean.step, 0);}
  assert.deepEqual(normalizeTraceState({done:['local', 'bogus']}).done, ['local']);
  assert.equal(normalizeTraceState({config:{destination:'kiosk'}, sent:true, step:99}).step, 2, 'a step past the end is clamped');
});

test('the page uses native controls, a map with a text view and a header table, and says it is practice', () => {
  const html = renderPacketTrace(initialTraceState());
  assert.equal((html.match(/type="radio"/gu) || []).length, TRACE_CONTROLS.reduce((sum, item) => sum + item.options.length, 0) + 3);
  for (const item of TRACE_CONTROLS) assert.ok(html.includes('<legend>' + item.label + '</legend>'), item.name);
  for (const action of ['send', 'back', 'next', 'end']) assert.ok(html.includes('data-trace="' + action + '"'), action);
  assert.match(html, /role="img" aria-label="Tech fair network map\./u); assert.match(html, /Text view of the map/u);
  assert.match(html, /does not complete a mission/u); assert.match(html, /nothing is saved/u); assert.doesNotMatch(html, /draggable|Cisco/u);
  let state = initialTraceState(); for (const [action, value] of [['set', {name:'destination', value:'scoreboard'}], ['send'], ['end']]) state = applyTraceAction(state, action, value).state;
  const done = renderPacketTrace(state);
  assert.match(done, /<th scope="col">When it left the laptop<\/th><th scope="col">At this hop<\/th>/u); assert.match(done, /<td class="fair-now">63<\/td>/u); assert.match(done, /data-outcome="delivered"/u);
  assert.equal(traceHasWork(initialTraceState()), false); assert.equal(traceHasWork(state), true);
});

test('the tracer is a public route with its own small chunk in both release modes', async () => {
  assert.deepEqual([learningRoute('#networking/trace').page, learningRoute('#networking/trace').id], ['networking', 'trace']);
  assert.equal(routeAccess(learningRoute('#networking/trace')), 'public'); assert.equal(learningRoute('#networking/trace/extra').page, 'unknown');
  assert.deepEqual(NETWORKING_REDIRECTS.find(([from]) => from === '/networking/trace'), ['/networking/trace', '/networking#networking/trace']);
  for (const options of [{member:true, localOnly:true, publicLabsOpen:true, split:true}, {member:false, split:true}]) {
    const built = await bundleTier(options), entry = Buffer.from(built.javascript).toString('utf8'), chunk = built.chunks.find(item => /lazy-tracer-/u.test(item.filename));
    assert.ok(chunk, 'the tracer downloads when its page is opened'); assert.ok(Buffer.from(chunk.javascript).toString('utf8').includes('Send the packet'));
    assert.equal(entry.includes('The gateway opens the frame'), false, 'the model stays out of the home page bundle');
    assert.ok(chunk.javascript.length < 76_000, 'the tracer and the Packet Simulator share this chunk');
  }
});
