import test from 'node:test';
import assert from 'node:assert/strict';
import {FAIR_CATALOG, FAIR_BANDS, FAIR_RECORDS, fairBandMissions} from '../src/fair-catalog.js';
import {FAIR_MISSIONS, DECISIONS, RUN_LIMIT, fairMission, initialFairState, normalizeFairState, applyFairAction, fairView, fairCompletion, normalizeFairRecord, fairReport} from '../src/fair-missions.js';
import {SCENARIOS} from '../src/scenarios.js';
import {normalizeLabRecord} from '../src/records.js';

/** Drive a mission the way the page does: one action at a time, keeping only the returned state. */
function crew(id) {
  let state = initialFairState(id), last = null;
  const api = {
    do(action, value) {last = applyFairAction(id, state, action, value); state = last.state; return last;},
    set(name, value) {return api.do('set', {name, value});},
    run(...tests) {for (const item of tests) api.do('run', item); return last;},
    get state() {return state;}, get view() {return fairView(id, state);}, get last() {return last;},
    row(testId, rowId) {return api.view.tests.find(item => item.id === testId).reading?.rows.find(item => item.id === rowId);},
    values(testId) {return api.view.tests.find(item => item.id === testId).reading.rows.map(item => item.value);},
    pick(ok) {const item = api.view.evidence.find(entry => ok ? entry.ok !== false : entry.ok === false); return api.do('evidence', item.id);}
  };
  return api;
}
// One reviewed route through each mission: [prediction, base setup, base tests, replay setup, replay tests].
const ROUTES = {
  'FAIR-208':['stops', {cableA:'port1'}, ['booth'], {}, ['booth', 'uplink']],
  'FAIR-215':['gateway', {nextHop:'gateway', changed:'frame', stable:'dst-ip'}, ['check'], {}, ['check']],
  'FAIR-204':['b', {location:'b'}, ['lap'], {location:'d'}, ['lap']],
  'FAIR-217':['teammate', {}, ['teammate', 'scoreboard'], {mode:'ap'}, ['teammate', 'scoreboard']],
  'FAIR-201':['dns', {dns:'10.20.0.53'}, ['address', 'lookup', 'service'], {}, ['lookup', 'service']],
  'FAIR-209':['/26', {prefix:'/26', address:'10.40.8.71', gateway:'10.40.8.65'}, ['fit', 'gateway'], {address:'10.40.8.72'}, ['fit', 'gateway']],
  'FAIR-210':['nothing', {vlan:'30', rule:'scores-only'}, ['scores', 'staff'], {vlan:'30'}, ['scores', 'staff']],
  'FAIR-218':['door', {ap:'door'}, ['walk'], {radio:'dual'}, ['walk']],
  'FAIR-216':['uplink', {rate:'1', crew:'uplink', follow:'cable'}, ['compare'], {rate:'0.25', crew:'neither', follow:'watch'}, ['compare']],
  'FAIR-213':['both', {priority:'on', upload:'scheduled'}, ['measure'], {upload:'confirmed'}, ['measure']],
  'FAIR-211':['view', {tunnel:'on', role:'judge'}, ['view', 'submit', 'staff'], {firewall:'permit'}, ['view', 'submit', 'staff']],
  'FAIR-214':['28', {ports:'48', uplink:'1000', rules:'segmented'}, ['size', 'allowed', 'blocked'], {restore:'previous'}, ['size', 'allowed', 'blocked']]
};
function playThrough(id) {
  const [prediction, base, baseTests, after, afterTests] = ROUTES[id], c = crew(id);
  c.do('predict', prediction);
  c.run(fairMission(id).tests[0].id);
  for (const [name, value] of Object.entries(base)) c.set(name, value);
  c.run(...baseTests);
  assert.equal(c.view.met, true, id + ': the reviewed base setup meets the target');
  c.do('replay');
  // Missions with cases to show before the repair.
  if (id === 'FAIR-211') {c.run('view'); c.set('role', 'observer'); c.run('view'); c.set('role', 'judge');}
  for (const [name, value] of Object.entries(after)) c.set(name, value);
  c.run(...afterTests);
  return c;
}

test('the pathway has twelve missions, four per band, each with a distinct stable identity and record', () => {
  assert.equal(FAIR_CATALOG.length, 12); assert.equal(FAIR_MISSIONS.length, 12);
  assert.deepEqual(FAIR_BANDS.map(band => fairBandMissions(band.id).map(item => item.id)), [['FAIR-208', 'FAIR-215', 'FAIR-204', 'FAIR-217'], ['FAIR-201', 'FAIR-209', 'FAIR-210', 'FAIR-218'], ['FAIR-216', 'FAIR-213', 'FAIR-211', 'FAIR-214']]);
  assert.equal(new Set(FAIR_RECORDS.map(item => item.id)).size, 13, 'twelve missions and one capstone record');
  for (const item of FAIR_CATALOG) {
    assert.match(item.id, /^FAIR-\d{3}$/u);
    assert.equal(SCENARIOS.some(scenario => scenario.id === item.id), false, item.id + ' never reuses an investigation id');
    if (item.legacy) assert.ok(SCENARIOS.some(scenario => scenario.id === item.legacy), item.legacy + ' is still an investigation');
    assert.equal(item.minutes, 40); assert.ok(item.crew.length > 10 && item.skill.length > 10);
  }
  assert.deepEqual(FAIR_CATALOG.filter(item => !item.legacy).map(item => item.title), ['Pass a note in the pit', 'Follow the camera into the hall']);
  assert.deepEqual(FAIR_CATALOG.filter(item => item.strand === 'ISSC343').map(item => item.id), ['FAIR-204', 'FAIR-217', 'FAIR-218']);
  assert.deepEqual(FAIR_CATALOG.filter(item => item.strand === 'ISSC421').map(item => item.id), ['FAIR-210', 'FAIR-211']);
});

test('every mission has a brief, a measurable target, a choice prediction, a worked example, labeled controls, a changed condition and a sentence starter', () => {
  for (const mission of FAIR_MISSIONS) {
    for (const field of ['person', 'brief', 'observe', 'success', 'worked', 'starter']) assert.ok(typeof mission[field] === 'string' && mission[field].length > 15, mission.id + ' ' + field);
    assert.ok(mission.predict.options.length >= 3 && mission.predict.prompt.endsWith('?'), mission.id);
    assert.match(mission.starter, /___/u, mission.id + ' starter has blanks to fill');
    assert.ok(mission.controls.length >= 1 && mission.controls.every(item => item.label && item.options.length >= 2 && item.options.every(([value, label]) => value && label)), mission.id);
    assert.ok(mission.tests.length >= 1 && mission.replay.action && mission.replay.text.length > 20, mission.id);
    assert.ok(mission.terms.length >= 2 && mission.terms.every(item => ['brief', 'run', 'replay'].includes(item.when) && item.plain.length > 20), mission.id + ' explains its words when they are needed');
    const view = fairView(mission.id, initialFairState(mission.id));
    assert.equal(view.station, 'offline'); assert.equal(view.met, false);
    assert.ok(view.scene.nodes.length >= 3 && view.scene.nodes.every(([id, label, x, y]) => id && label.length <= 25 && x >= 60 && x <= 540 && y >= 30 && y <= 235), mission.id + ' map fits its frame');
    assert.ok(view.terms.every(item => item.when === 'brief'), mission.id + ' introduces later words only when they are needed');
  }
});

test('the starting setup of every mission misses its target, so opening the page proves nothing', () => {
  for (const mission of FAIR_MISSIONS) {
    const c = crew(mission.id);
    c.run(...mission.tests.map(item => item.id));
    // Two missions start with something that works for now: the shared booth cable and the direct
    // tablet link. Their target is only tested by the changed condition.
    if (!['FAIR-208', 'FAIR-217'].includes(mission.id)) assert.equal(c.view.met, false, mission.id);
    assert.equal(fairCompletion(mission.id, c.state, 'A long enough handoff sentence for the next crew.').ready, false, mission.id);
    assert.equal(c.view.station === 'online', false);
  }
});

test('all twelve missions can be played through to an online station, a consistent decision and a handoff', () => {
  for (const mission of FAIR_MISSIONS) {
    const c = playThrough(mission.id);
    assert.equal(c.view.met, true, mission.id + ' meets its target after the change');
    assert.equal(c.view.demonstrated, true, mission.id);
    assert.equal(fairCompletion(mission.id, c.state, 'Handoff: the fresh test met the target, so open.').ready, false, mission.id + ' still needs evidence and a decision');
    c.pick(true); c.do('decide', 'open');
    assert.equal(c.view.station, 'online', mission.id);
    assert.equal(fairCompletion(mission.id, c.state, '').ready, false, mission.id + ' needs a handoff sentence');
    assert.equal(fairCompletion(mission.id, c.state, mission.starter).ready, false, mission.id + ' needs the starter blanks filled');
    assert.deepEqual(fairCompletion(mission.id, c.state, 'Handoff: the fresh test met the target, so open.'), {ready:true, blockers:[], station:'online', decision:'open'});
    const report = fairReport(mission.id, {state:c.state, notes:'Handoff: the fresh test met the target, so open.', closed:true});
    assert.match(report, new RegExp(mission.id + ' · ' + mission.title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
    assert.match(report, /Status: HANDED OFF · OPEN/u); assert.match(report, /CURRENT/u);
  }
});

test('robot camera: the reviewed readings appear only after a location is chosen and a lap is run', () => {
  const expected = {cabinet:['10 of 10', '4 of 10', '9 of 10'], a:['10 of 10', '6 of 10', '8 of 10'], b:['9 of 10', '10 of 10', '9 of 10'], c:['6 of 10', '7 of 10', '10 of 10']};
  for (const [location, values] of Object.entries(expected)) {
    const c = crew('FAIR-204');
    if (location !== 'cabinet') c.set('location', location);
    assert.equal(c.view.tests[0].reading, null, 'no reading before a lap');
    c.run('lap');
    assert.deepEqual(c.values('lap'), values, location);
    assert.equal(c.view.met, location === 'b');
  }
  assert.deepEqual(fairView('FAIR-204', initialFairState('FAIR-204')).baseline.rows.map(item => item.value), ['10 of 10', '4 of 10', '9 of 10'], 'the baseline is behind the cabinet');
  const finish = crew('FAIR-204'); finish.set('location', 'c'); finish.run('lap');
  assert.match(finish.last.message, /Ten packets reached the finish\. What happened at the pit\?/u);
  assert.equal(fairMission('FAIR-204').starter, 'At the blue line, ___ of ten arrived before and ___ arrived after.');
  assert.equal(finish.set('location', 'd').kind, 'warning', 'the press table is not available before the curtain drops');
  assert.equal(finish.state.config.location, 'c');
});

test('robot camera: center rail passes, the curtain needs a fresh run and holds, and the press table passes', () => {
  const c = crew('FAIR-204');
  c.do('predict', 'c'); c.run('lap'); c.set('location', 'b'); c.run('lap');
  assert.equal(c.view.met, true); assert.equal(c.view.station, 'ready');
  c.do('replay');
  assert.equal(c.view.stale, true, 'lowering the curtain makes the last lap out of date');
  assert.equal(c.view.met, false); assert.deepEqual(c.view.evidence, []);
  assert.match(fairCompletion('FAIR-204', c.state, 'x'.repeat(30)).blockers.join(';'), /run a fresh test/u);
  c.run('lap');
  assert.deepEqual(c.values('lap'), ['9 of 10', '7 of 10', '9 of 10']);
  assert.equal(c.view.station, 'hold');
  assert.deepEqual(c.view.tests[0].prior.rows.map(item => item.value), ['9 of 10', '10 of 10', '9 of 10'], 'the reading from before the curtain is kept for comparison');
  // Open does not fit a miss; hold with the missing reading does.
  c.pick(false); c.do('decide', 'open');
  assert.equal(c.view.consistent, false);
  c.do('decide', 'hold');
  assert.equal(c.view.consistent, true); assert.equal(c.view.station, 'hold');
  assert.equal(fairCompletion('FAIR-204', c.state, 'At the blue line, 10 of ten arrived before and 7 arrived after.').ready, true, 'a justified hold is a complete handoff');
  c.set('location', 'd'); c.run('lap');
  assert.deepEqual(c.values('lap'), ['9 of 10', '9 of 10', '10 of 10']);
  assert.equal(c.view.met, true);
  assert.equal(c.state.predict, 'c', 'the prediction is retained as it was made');
  assert.equal(c.do('predict', 'b').state.predict, 'c');
});

test('editing a tested setup makes its result stale, drops it as evidence and reopens the decision', () => {
  for (const mission of FAIR_MISSIONS) {
    const c = playThrough(mission.id);
    c.pick(true); c.do('decide', 'open');
    assert.equal(c.view.consistent, true, mission.id);
    const control = mission.controls[0], other = control.options.find(([value, , only]) => value !== c.state.config[control.name] && (!only || only === 'replay'))[0];
    const change = c.set(control.name, other);
    assert.match(change.message, /old setup/u, mission.id);
    assert.equal(c.view.stale, true, mission.id); assert.equal(c.view.met, false, mission.id);
    assert.deepEqual(c.state.evidence.filter(id => !c.view.evidence.some(item => item.id === id)), [], mission.id + ' keeps no evidence from a stale reading');
    assert.equal(c.view.station === 'online', false, mission.id);
    assert.equal(fairCompletion(mission.id, c.state, 'Handoff: the fresh test met the target, so open.').ready, false, mission.id);
    assert.ok(c.view.tests.some(item => item.reading && item.stale), mission.id + ' still shows the old reading, marked out of date');
  }
});

test('a mistaken choice gets feedback about that reading', () => {
  const photo = crew('FAIR-215'); photo.run('check');
  assert.match(photo.last.message, /02:00:00:00:01:01.*Whose is it\?/u);
  const alert = crew('FAIR-216'); alert.run('compare');
  assert.match(alert.last.message, /160 is the counter’s total/u);
  alert.set('rate', '60'); alert.run('compare');
  assert.match(alert.last.message, /60 is how many new errors arrived/u);
  const scores = crew('FAIR-210'); scores.set('vlan', '30'); scores.set('rule', 'block-all'); scores.run('scores');
  assert.match(scores.last.message, /Blocking both does not meet the target/u);
  const kiosk = crew('FAIR-209'); kiosk.set('prefix', '/26'); kiosk.set('address', '10.40.8.127'); kiosk.run('gateway');
  assert.match(kiosk.row('gateway', 'address').value, /broadcast/u);
  const judge = crew('FAIR-211'); judge.set('tunnel', 'on'); judge.run('submit');
  assert.match(judge.last.message, /observers can view but cannot submit/u);
});

test('grades 7–8 acceptance: booth cables, photo snapshots and both pit modes', () => {
  const booth = crew('FAIR-208'); booth.run('booth');
  assert.equal(booth.row('booth', 'ana-printer').ok, true, 'sharing works until someone unplugs');
  booth.do('replay'); booth.run('booth');
  assert.equal(booth.row('booth', 'ana-printer').ok, false, 'a shared cable fails when Ben unplugs');
  booth.set('cableA', 'port1'); booth.run('booth', 'uplink');
  assert.equal(booth.row('booth', 'ana-printer').value, 'printed');
  assert.equal(booth.row('uplink', 'ana-printer').value, 'printed', 'the booth service survives losing the uplink');
  assert.match(booth.row('uplink', 'gallery').value, /no path/u, 'a service beyond the booth does not');
  const photo = playThrough('FAIR-215');
  assert.deepEqual(photo.state.config, {nextHop:'gateway', changed:'frame', stable:'dst-ip'});
  assert.equal(photo.view.supplied[0].rows[0][4], photo.view.supplied[0].rows[1][4], 'the destination IP is the same in both snapshots');
  assert.notEqual(photo.view.supplied[0].rows[0][2], photo.view.supplied[0].rows[1][2], 'the frame destination changes');
  assert.equal(photo.view.supplied[0].rows[0][2], '02:00:00:00:01:01');
  const pit = crew('FAIR-217'); pit.run('teammate', 'scoreboard');
  assert.equal(pit.row('teammate', 'teammate').ok, true); assert.match(pit.row('scoreboard', 'scoreboard').value, /no route/u);
  pit.do('replay'); pit.set('mode', 'ap'); pit.run('teammate');
  assert.equal(pit.view.demonstrated, false, 'both destinations must be shown in both modes');
  pit.run('scoreboard');
  assert.equal(pit.row('scoreboard', 'scoreboard').ok, true); assert.equal(pit.view.demonstrated, true); assert.equal(pit.view.met, true);
});

test('grades 9–10 acceptance: name lookup, the /26, guest rules and the hall handoff', () => {
  const kiosk = crew('FAIR-201'); kiosk.run('address', 'lookup', 'service');
  assert.match(kiosk.row('address', 'address').value, /reply from 10\.20\.0\.30/u, 'the server is reachable by address');
  assert.equal(kiosk.row('lookup', 'lookup').ok, false); assert.equal(kiosk.row('service', 'service').ok, false);
  kiosk.set('bookmark', 'address'); kiosk.run('service');
  assert.equal(kiosk.row('service', 'service').ok, true); assert.equal(kiosk.view.met, false, 'the service by address does not prove the name works');
  kiosk.set('bookmark', 'name'); kiosk.set('dns', '10.20.0.53'); kiosk.run('lookup', 'service');
  assert.equal(kiosk.view.met, true);
  assert.deepEqual(kiosk.view.supplied[1].rows.map(cells => cells.slice(1)), [['Application', '5–7'], ['Transport', '4'], ['Internet', '3'], ['Link', '1–2']], 'scoreboard jobs mapped to TCP/IP and OSI');
  const room = crew('FAIR-209'); room.run('fit');
  assert.equal(room.row('fit', 'usable').value, '30'); assert.equal(room.row('fit', 'usable').ok, false);
  room.set('prefix', '/26'); room.run('fit');
  assert.equal(room.row('fit', 'usable').value, '62'); assert.match(room.row('fit', 'range').value, /10\.40\.8\.64 to 10\.40\.8\.127/u);
  for (const [address, reason] of [['10.40.8.64', /network/u], ['10.40.8.127', /broadcast/u], ['10.40.8.65', /gateway/u], ['10.40.8.70', /existing kiosk/u]]) {room.set('address', address); room.run('gateway'); assert.match(room.row('gateway', 'address').value, reason, address);}
  room.set('address', '10.40.8.71'); room.set('gateway', '10.40.8.65'); room.run('fit', 'gateway');
  assert.equal(room.row('gateway', 'reply').value, 'reply from 10.40.8.65'); assert.equal(room.view.met, true);
  const guest = crew('FAIR-210'); guest.set('vlan', '30'); guest.set('rule', 'scores-only'); guest.run('scores', 'staff');
  assert.equal(guest.view.met, true);
  guest.do('replay');
  assert.equal(guest.state.config.vlan, '10', 'the new switch port starts in the staff VLAN');
  guest.run('scores', 'staff');
  assert.equal(guest.row('staff', 'staff').ok, false);
  const hall = crew('FAIR-218'); hall.run('walk');
  assert.deepEqual(hall.values('walk').slice(0, 3), ['10 of 10', '5 of 10', '10 of 10']); assert.match(hall.row('walk', 'handoff').value, /gap/u);
  hall.set('ap', 'door'); hall.run('walk');
  assert.deepEqual(hall.values('walk').slice(0, 3), ['10 of 10', '9 of 10', '10 of 10']); assert.match(hall.row('walk', 'handoff').value, /succeeded/u);
  hall.do('replay'); hall.run('walk');
  assert.match(hall.row('walk', 'handoff').value, /2\.4 GHz camera cannot join a 5 GHz-only radio/u); assert.equal(hall.view.met, false);
  hall.set('radio', 'dual'); hall.run('walk');
  assert.deepEqual(hall.values('walk').slice(0, 3), ['10 of 10', '9 of 10', '9 of 10']); assert.equal(hall.row('walk', 'band').value, '2.4 GHz');
});

test('grades 11–12 acceptance: the alert rate, commentary fixes, the remote judge and the venue design', () => {
  const alert = crew('FAIR-216'); alert.set('rate', '1'); alert.set('crew', 'uplink'); alert.set('follow', 'cable'); alert.run('compare');
  assert.match(alert.row('compare', 'printer').value, /900 − 900.*0 errors\/second/u); assert.equal(alert.view.met, true);
  assert.deepEqual(alert.view.supplied[0].rows[1].slice(1, 3), ['100', '160']);
  const audio = crew('FAIR-213');
  const measure = (priority, upload) => {audio.set('priority', priority); audio.set('upload', upload); audio.run('measure'); return audio.values('measure');};
  audio.run('measure');
  assert.deepEqual(audio.values('measure'), ['7%', '55 ms', '10 Mb/s (unchanged)'], 'baseline');
  assert.deepEqual(measure('on', 'during').slice(0, 2), ['0.8%', '32 ms'], 'priority alone'); assert.equal(audio.view.met, false);
  assert.deepEqual(measure('off', 'scheduled').slice(0, 2), ['2%', '30 ms'], 'rescheduling alone'); assert.equal(audio.view.met, false);
  assert.deepEqual(measure('on', 'scheduled'), ['0.4%', '12 ms', '10 Mb/s (unchanged)'], 'both together; capacity stays fixed'); assert.equal(audio.view.met, true);
  audio.do('replay'); audio.run('measure');
  assert.deepEqual(audio.values('measure').slice(0, 2), ['0.8%', '32 ms'], 'the scheduled time now falls inside the show');
  const judge = crew('FAIR-211'); judge.run('view', 'staff');
  assert.match(judge.row('view', 'view').value, /unreachable/u); assert.equal(judge.row('staff', 'staff').ok, true);
  judge.set('tunnel', 'on'); judge.run('view', 'submit', 'staff');
  assert.equal(judge.row('view', 'view').value, 'app opened'); assert.match(judge.row('submit', 'submit').value, /cannot submit/u); assert.match(judge.row('staff', 'staff').value, /blocked/u);
  judge.set('role', 'judge'); judge.run('view', 'submit', 'staff');
  assert.equal(judge.row('submit', 'submit').value, 'score submitted'); assert.equal(judge.view.met, true);
  judge.do('replay');
  for (const role of ['observer', 'judge']) {judge.set('role', role); judge.run('view'); assert.match(judge.row('view', 'view').value, /blocked by the firewall rule/u, role);}
  assert.equal(judge.view.demonstrated, true);
  const venue = crew('FAIR-214'); venue.run('size');
  assert.match(venue.row('size', 'ports').label, /24 \+ 2 \+ 1 \+ 1 = 28/u); assert.match(venue.row('size', 'uplink').label, /560 × 1\.25 = 700/u); assert.equal(venue.view.tests[0].reading.ok, false);
  venue.set('uplink', '500'); venue.set('ports', '48'); venue.run('size');
  assert.equal(venue.row('size', 'ports').ok, true); assert.equal(venue.row('size', 'uplink').ok, false, '500 Mb/s is under 700');
  venue.set('uplink', '1000'); venue.set('rules', 'segmented'); venue.run('size', 'allowed', 'blocked');
  assert.equal(venue.view.met, true);
  venue.do('replay'); venue.run('size', 'allowed', 'blocked');
  assert.equal(venue.row('allowed', 'allowed').ok, false, 'the failed install leaves nothing running');
  venue.set('restore', 'factory'); venue.run('allowed', 'blocked'); assert.equal(venue.row('blocked', 'blocked').ok, false);
  venue.set('restore', 'previous'); venue.run('size', 'allowed', 'blocked'); assert.equal(venue.view.met, true);
});

test('saved state is replayed through the model: forged readings, flags and stale evidence are not trusted', () => {
  const forged = normalizeFairState('FAIR-204', {predict:'b', condition:'replay', config:{location:'cabinet'}, runs:[{n:1, test:'lap', condition:'replay', config:{location:'cabinet'}, rows:[{id:'stop1', value:'10 of 10', ok:true}], ok:true}], evidence:['1:stop1', '9:stop1', 7], decision:'open'});
  assert.deepEqual(normalizeFairState('FAIR-204', Object.create({predict:'b'})), initialFairState('FAIR-204'), 'inherited fields are not read');
  const view = fairView('FAIR-204', forged);
  assert.deepEqual(view.tests[0].reading.rows.map(item => item.value), ['10 of 10', '3 of 10', '9 of 10'], 'the reading is recomputed');
  assert.equal(view.met, false); assert.equal(view.station === 'online', false);
  assert.deepEqual(forged.evidence, ['1:stop1']);
  assert.deepEqual(normalizeFairState('FAIR-204', {config:{location:'d'}}).config, {location:'cabinet'}, 'an option that is not available yet is refused');
  assert.deepEqual(normalizeFairState('FAIR-204', {runs:[{test:'lap', condition:'replay', config:{location:'b'}}]}).runs, [], 'no run can claim a condition the mission has not reached');
  for (const junk of [null, 5, 'x', [], {runs:'x', evidence:{}, config:[]}]) assert.deepEqual(normalizeFairState('FAIR-204', junk), initialFairState('FAIR-204'));
  const record = normalizeFairRecord({id:'FAIR-204'}, {state:forged, notes:'At the blue line, 4 of ten arrived before and 10 arrived after.', closed:true, verified:true, events:[{message:'<img src=x>', kind:'bogus', time:5}]});
  assert.equal(record.closed, false, 'a saved completion flag cannot outlive evidence that misses the target');
  assert.equal(record.verified, false); assert.deepEqual(record.events, [{time:'', message:'<img src=x>', kind:'info'}]);
  const c = crew('FAIR-204'); for (let index = 0; index < RUN_LIMIT + 5; index++) c.run('lap');
  assert.equal(c.state.runs.length, RUN_LIMIT); assert.deepEqual(c.state.runs.map(run => run.n), Array.from({length:RUN_LIMIT}, (_, index) => index + 1));
});

test('a handed-off mission round-trips through saved work, and an existing assignment keeps its own record', () => {
  const c = playThrough('FAIR-204'); c.pick(true); c.do('decide', 'open');
  const mission = FAIR_RECORDS.find(item => item.id === 'FAIR-204'), saved = JSON.parse(JSON.stringify({state:c.state, notes:'At the blue line, 7 of ten arrived before and 9 arrived after.', closed:true}));
  const record = normalizeLabRecord(mission, saved);
  assert.equal(record.closed, true); assert.equal(record.verified, true); assert.deepEqual(record.state, c.state);
  // The original investigation normalizes its own shape and never sees the mission's state.
  const legacy = SCENARIOS.find(item => item.id === 'NET-204'), before = normalizeLabRecord(legacy, {state:{placement:'ceiling-center', band:'5', channel:'40', width:'20'}, notes:'I moved the access point to the ceiling.', reflection:'The survey reading met the target.'});
  assert.equal(before.state.placement, 'ceiling-center'); assert.equal(Object.hasOwn(before.state, 'runs'), false);
  assert.equal(normalizeLabRecord(legacy, saved).state.placement, legacy && normalizeLabRecord(legacy, undefined).state.placement, 'a mission record is not a valid NET-204 record');
  assert.equal(normalizeLabRecord(mission, before).state.runs.length, 0, 'an investigation record is not mission progress');
  assert.equal(normalizeLabRecord(mission, before).closed, false);
  assert.deepEqual(DECISIONS.map(item => item.id), ['open', 'hold', 'revise']);
});

test('clues carry no penalty and never change the work', () => {
  const c = crew('FAIR-204'); c.run('lap');
  const before = JSON.stringify({...c.state, clues:0}), clue = c.do('clue');
  assert.equal(clue.viewOnly, true); assert.match(clue.message, /What happened at the blue line\?/u);
  assert.equal(JSON.stringify({...c.state, clues:0}), before); assert.equal(c.state.clues, 1);
  assert.match(fairReport('FAIR-204', {state:c.state}), /Clues and retries carry no penalty/u);
});
