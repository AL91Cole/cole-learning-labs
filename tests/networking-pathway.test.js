import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {once} from 'node:events';
import os from 'node:os';
import path from 'node:path';
import {FAIR_CATALOG, FAIR_CAPSTONE, FAIR_RECORDS, FAIR_SLUGS, FAIR_FOLLOW_UPS, SYSTEMS_SUPPORT, isFairId} from '../src/fair-catalog.js';
import {learningRoute, labPageHash, learningModes} from '../src/learning-routes.js';
import {routeAccess} from '../src/access-policy.js';
import {CATALOG} from '../src/lab-catalog.js';
import {ARCADE_CATALOG} from '../src/arcade-catalog.js';
import {SCENARIOS} from '../src/scenarios.js';
import {renderNetworkingPathway, fairStartMission, fairStationStatus} from '../src/networking-pathway.js';
import {renderFairMissionPage, renderFairCapstonePage, fairGuide, fairMapHTML, fairMapText, FAIR_STEPS} from '../src/fair-mission-page.js';
import {GUIDE_SECTIONS} from '../src/lab-guide.js';
import {FAIR_MISSIONS, initialFairState, applyFairAction, fairView} from '../src/fair-missions.js';
import {CAPSTONE_STATIONS, ROLLBACK_OPTIONS, capstoneOwned, initialCapstoneState, normalizeCapstoneState, applyCapstoneAction, capstoneView, capstoneCompletion, normalizeCapstoneRecord, capstoneReport} from '../src/fair-capstone.js';
import {normalizeLabRecord} from '../src/records.js';
import {createWorkStorage, normalizeWorkCollection, WORK_PREFIX} from '../src/local-work.js';
import {buildSite, NETWORKING_REDIRECTS, APP_SHELL_PAGES, PUBLIC_LANDING_PAGES, publicFilesFor} from '../scripts/build.mjs';
import {createPreviewServer} from '../scripts/serve.mjs';
import {bundleTier} from '../scripts/tier-bundles.mjs';
import {evidenceGroups, renderNetworkingShell} from '../scripts/networking-pages.mjs';

const HANDOFF = 'Our station is open because the new test met the target.';
function capstone() {
  let state = initialCapstoneState(), last = null;
  const api = {do(action, value) {last = applyCapstoneAction(state, action, value); state = last.state; return last;}, get state() {return state;}, get view() {return capstoneView(state);}, station(id) {return api.view.stations.find(item => item.id === id);}};
  return api;
}

test('routes: the hub, its band, the capstone and each mission parse; anything else stays unknown', () => {
  assert.deepEqual(learningRoute('#networking'), {page:'networking', id:undefined, mode:'guided', sequence:null});
  assert.equal(learningRoute('#networking?band=9-10').band, '9-10');
  assert.equal(learningRoute('#networking?band=k1').band, undefined);
  assert.equal(learningRoute('#networking/opening-day?band=11-12').id, 'opening-day');
  for (const bad of ['#networking/other', '#networking/opening-day/extra', '#networking/FAIR-204']) assert.equal(learningRoute(bad).page, 'unknown', bad);
  for (const item of FAIR_CATALOG) for (const [step, section] of [['request', 1], ['workbench', 2], ['explain', 3]]) {
    const route = learningRoute('#lab/' + item.id + '/' + step + '?mode=challenge');
    assert.deepEqual([route.page, route.id, route.section, route.mode], ['lab', item.id, section, 'challenge']);
    assert.equal(labPageHash(item.id, section, {mode:'challenge'}), '#lab/' + item.id + '/' + step + '?mode=challenge');
  }
  assert.equal(routeAccess(learningRoute('#networking')), 'public');
  assert.equal(routeAccess(learningRoute('#networking/opening-day')), 'member');
  for (const item of FAIR_CATALOG) assert.equal(routeAccess({page:'lab', id:item.id}), 'member', item.id);
  assert.equal(routeAccess({page:'lab', id:FAIR_CAPSTONE.id}), 'unknown', 'the capstone is not a lab route');
  assert.equal(routeAccess({page:'lab', id:'FAIR-999'}), 'unknown');
  assert.equal(routeAccess({page:'practice', id:'FAIR-204'}), 'unknown', 'a mission has no ungraded practice twin');
});

test('legacy: every original NET case keeps its id, deep links and access, beside its fair variant', () => {
  const originals = CATALOG.filter(item => item.id.startsWith('NET-'));
  assert.equal(originals.length, 16); assert.equal(SCENARIOS.length, 42, 'the investigation catalogue is unchanged');
  for (const item of originals) {
    assert.equal(isFairId(item.id), false);
    for (const [step, section] of [['request', 1], ['workbench', 2], ['explain', 3]]) for (const mode of learningModes) {
      const hash = '#lab/' + item.id + '/' + step + '?mode=' + mode.id, route = learningRoute(hash);
      assert.deepEqual([route.page, route.id, route.section, route.mode], ['lab', item.id, section, mode.id], hash);
      assert.equal(labPageHash(item.id, section, {mode:mode.id}), hash);
    }
    assert.equal(routeAccess({page:'lab', id:item.id}), ['NET-201', 'NET-202'].includes(item.id) ? 'public' : 'member');
  }
  assert.equal(learningRoute('#lab/NET-201?sequence=opening-day').sequence, 'opening-day', 'the classroom opening-day sequence is untouched');
  for (const item of FAIR_CATALOG.filter(entry => entry.legacy)) assert.equal(item.id.slice(5), item.legacy.slice(4), item.id + ' pairs with ' + item.legacy);
});

test('saved work keeps an assignment and its fair variant apart, and old saves load unchanged', () => {
  const memory = new Map(), storage = {getItem:key => memory.get(key) ?? null, setItem:(key, value) => memory.set(key, value), removeItem:key => memory.delete(key), key:index => [...memory.keys()][index], get length() {return memory.size;}};
  const scenarios = [...SCENARIOS, ...FAIR_RECORDS], legacy = SCENARIOS.find(item => item.id === 'NET-204');
  const legacyRecord = normalizeLabRecord(legacy, {state:{placement:'ceiling-center', band:'5', channel:'40', width:'20'}, notes:'I moved the access point to the ceiling mount.', reflection:'The desk reading met the target after the move.'});
  // A save made before the pathway existed has no FAIR keys and reads back the same.
  const old = normalizeWorkCollection(scenarios, {version:2, labs:{'NET-204':legacyRecord}});
  assert.deepEqual(Object.keys(old.labs), ['NET-204']); assert.deepEqual(old.labs['NET-204'], legacyRecord);
  let state = initialFairState('FAIR-204');
  for (const [action, value] of [['predict', 'b'], ['run', 'lap']]) state = applyFairAction('FAIR-204', state, action, value).state;
  const manager = createWorkStorage({storage, key:WORK_PREFIX, scenarios});
  assert.equal(manager.save({version:2, labs:{}}), true); assert.equal(memory.size, 0, 'nothing is written until device saving is turned on');
  assert.equal(manager.enable({version:2, labs:{'NET-204':legacyRecord, 'FAIR-204':{state, notes:'', closed:true}}}), true);
  const resumed = createWorkStorage({storage, key:WORK_PREFIX, scenarios}).resume();
  assert.deepEqual(Object.keys(resumed.labs).sort(), ['FAIR-204', 'NET-204']);
  assert.deepEqual(resumed.labs['NET-204'], legacyRecord, 'the investigation reports its own work');
  assert.equal(resumed.labs['FAIR-204'].state.runs.length, 1); assert.equal(resumed.labs['FAIR-204'].closed, false, 'one lap is not a completed mission');
  // A restricted build knows only the investigations, so it never rewrites mission records it cannot read.
  assert.deepEqual(Object.keys(normalizeWorkCollection(SCENARIOS, {version:2, labs:{'FAIR-204':{state}, 'NET-204':legacyRecord}}).labs), ['NET-204']);
});

test('the hub offers three bands, a start for the selected band, the 12-minute introduction and a card per mission', () => {
  const html = renderNetworkingPathway({band:'9-10', labs:{}, open:true, origin:'https://example.test'});
  assert.equal((html.match(/data-fair-band="/gu) || []).length, 3);
  assert.match(html, /data-fair-band="9-10"[^>]*|aria-current="true" data-fair-band="9-10"/u);
  assert.match(html, /id="fair-start" href="#lab\/FAIR-201\/request">Start my first mission: The scoreboard lost its name/u);
  assert.match(html, /href="#learn\/NET-200">Meet the network · 12 minutes/u);
  for (const id of ['FAIR-201', 'FAIR-209', 'FAIR-210', 'FAIR-218']) assert.match(html, new RegExp('data-mission="' + id + '"', 'u'));
  assert.doesNotMatch(html, /data-mission="FAIR-204"/u, 'only the selected band’s missions are listed');
  assert.equal((html.match(/<dt>Your crew’s job<\/dt>/gu) || []).length, 5); assert.equal((html.match(/<dt>One skill<\/dt>/gu) || []).length, 5); assert.equal((html.match(/About 40 minutes/gu) || []).length, 5);
  assert.match(html, /value="https:\/\/example\.test\/networking\/scoreboard-name"/u, 'teachers get a direct assignment link');
  assert.match(html, /href="#networking\/opening-day\?band=9-10"/u);
  for (const href of ['#arcade/gateway-garden', '#arcade/hop-count-hike', '#arcade/vlan-village', '#arcade/resilient-ring', '#arcade/packet-post', '#practice/NET-201', '#studio/network', '#lab/NET-207', '#lab/NET-212', ...SYSTEMS_SUPPORT.map(([id]) => '#lab/' + id)]) assert.ok(html.includes('href="' + href + '"'), href);
  assert.deepEqual(SYSTEMS_SUPPORT.map(([id]) => id), ['NET-202', 'NET-203', 'NET-205', 'NET-206']);
  assert.equal(renderNetworkingPathway({}).includes('id="fair-start" href="#lab/FAIR-208/request"'), true, 'grades 7–8 is the default band');
  const student = renderNetworkingPathway({band:'7-8', student:true});
  assert.doesNotMatch(student, /Teacher: assignment link|lessons\/|networking-handout/u, 'student mode hides the adult links');
  assert.match(renderNetworkingPathway({band:'7-8', open:false}), /Membership required/u);
  assert.equal(fairStartMission('7-8', {'FAIR-208':{closed:true}}).id, 'FAIR-215', 'start continues after a handed-off mission');
  assert.deepEqual([fairStationStatus(undefined).id, fairStationStatus({state:{runs:[{}]}}).id, fairStationStatus({closed:true, state:{decision:'open'}}).id, fairStationStatus({closed:true, state:{decision:'hold'}}).id], ['ready', 'progress', 'online', 'held']);
});

test('follow-ups point at real activities: NET-207 after the photo and NET-212 after the alert', () => {
  assert.deepEqual(FAIR_FOLLOW_UPS['FAIR-215'][0].slice(0, 1), ['#lab/NET-207']); assert.deepEqual(FAIR_FOLLOW_UPS['FAIR-216'][0].slice(0, 1), ['#lab/NET-212']);
  for (const [id, links] of Object.entries(FAIR_FOLLOW_UPS)) for (const [href] of links) {
    const route = learningRoute(href);
    assert.notEqual(routeAccess(route), 'unknown', id + ' → ' + href);
    if (route.page === 'arcade') assert.ok(ARCADE_CATALOG.some(game => game.id === route.id), href);
    if (['lab', 'practice'].includes(route.page)) assert.ok(CATALOG.some(item => item.id === route.id), href);
  }
});

test('the mission page maps three playable steps onto the four guide sections with labeled, drag-free controls', () => {
  assert.deepEqual(GUIDE_SECTIONS.map(section => FAIR_STEPS[section.id]), ['Get the brief', 'Try it · worked example', 'Try it · your test', 'Prove it']);
  for (const mission of FAIR_MISSIONS) {
    const scenario = FAIR_RECORDS.find(item => item.id === mission.id), record = normalizeLabRecord(scenario, undefined), html = renderFairMissionPage(scenario, record, {mode:'independent'});
    for (const section of GUIDE_SECTIONS) assert.ok(html.includes('data-guide-section="' + section.id + '"') && html.includes(section.title), mission.id + ' ' + section.id);
    for (const mode of learningModes) assert.ok(html.includes('data-fair-mode="' + mode.id + '"'), mission.id + ' offers ' + mode.label);
    assert.match(html, /data-fair-mode="independent" aria-current="true"/u);
    for (const item of mission.controls) assert.ok(html.includes('<legend>' + item.label + '</legend>'), mission.id + ' labels ' + item.name);
    assert.equal((html.match(/type="radio"/gu) || []).length, mission.controls.reduce((sum, item) => sum + item.options.length, 0), mission.id + ' uses native radio buttons for every choice');
    assert.equal((html.match(/data-fair-run="/gu) || []).length, mission.tests.length);
    assert.match(html, /role="img" aria-label="[^"]+ map\. The text view below lists the same devices and connections\."/u, mission.id);
    assert.match(html, /<details class="fair-text-view" open><summary>Text view of the map<\/summary><ul class="fair-text-map">/u, mission.id);
    assert.doesNotMatch(html, /draggable|ondrag|pointerdown/u, mission.id);
    assert.match(html, /Station offline/u); assert.match(html, /id="lab-dialog"/u); assert.match(html, /id="work-privacy"/u);
  }
  assert.match(renderFairMissionPage({id:'FAIR-999'}, {}), /not at the fair/u);
});

test('the workbench, the text view, the fair map and the guide agree with one view of the work', () => {
  let state = initialFairState('FAIR-204');
  const act = (action, value) => {state = applyFairAction('FAIR-204', state, action, value).state;};
  const view = () => fairView('FAIR-204', state), guide = () => fairGuide(view(), {notes:'', reflection:'', closed:false});
  assert.deepEqual(guide().sections.map(section => section.complete), [false, false, false, false]); assert.equal(guide().percent, 0);
  act('predict', 'b'); assert.equal(guide().sections[0].complete, true);
  act('run', 'lap'); assert.equal(guide().sections[1].complete, true); assert.equal(guide().sections[2].complete, false);
  act('set', {name:'location', value:'b'}); act('run', 'lap'); assert.equal(guide().sections[2].complete, true);
  act('replay'); act('run', 'lap');
  const held = view();
  assert.match(fairMapText(held.scene), /Access point: center rail \(active\)/u); assert.match(fairMapText(held.scene), /Curtain \(down\) \(check this\)/u);
  assert.match(fairMapHTML(held.scene, 'x'), /Access point: center rail/u);
  assert.equal(held.station, 'hold'); assert.equal(guide().sections[3].steps[0].done, true);
  const page = renderFairMissionPage(FAIR_RECORDS.find(item => item.id === 'FAIR-204'), normalizeLabRecord(FAIR_RECORDS.find(item => item.id === 'FAIR-204'), {state}));
  assert.match(page, /Station on hold/u); assert.match(page, /<td class="fair-now">7 of 10<\/td>/u); assert.match(page, /✗ Misses target/u);
  assert.match(page, /<th scope="col">Baseline: behind the cabinet<\/th><th scope="col">Your reading before<\/th><th scope="col">Your reading now<\/th>/u, 'the modeled result sits beside the baseline and the prior reading');
  assert.match(page, /<td>4 of 10<\/td><td>10 of 10<\/td><td class="fair-now">7 of 10<\/td>/u);
  act('set', {name:'location', value:'d'});
  const stale = renderFairMissionPage(FAIR_RECORDS.find(item => item.id === 'FAIR-204'), normalizeLabRecord(FAIR_RECORDS.find(item => item.id === 'FAIR-204'), {state}));
  assert.match(stale, /Out of date\./u); assert.match(stale, /Last reading \(old setup\)/u); assert.match(stale, /Access point: press table/u);
  assert.equal(fairGuide(view(), {notes:'', closed:false}, 'challenge').sections[3].steps.at(-1).optional, true, 'challenge support adds an optional prompt');
});

test('capstone: rehearsal conditions, repairs and retests match the reviewed opening evidence', () => {
  const c = capstone();
  assert.deepEqual(CAPSTONE_STATIONS.map(item => item.id), ['camera', 'scores', 'commentary', 'judge']);
  assert.deepEqual(c.station('camera').baseline.rows.map(item => item.value), ['10 of 10', '8 of 10', '10 of 10']);
  assert.deepEqual(c.station('scores').baseline.rows.map(item => item.value), ['opened', 'opened']);
  assert.deepEqual(c.station('commentary').baseline.rows.map(item => item.value), ['0.4%', '12 ms']);
  assert.deepEqual(c.station('judge').baseline.rows.map(item => [item.id, item.ok]), [['view', true], ['submit', false], ['staff', true]]);
  assert.ok(c.view.stations.every(item => item.status === 'rehearsal' && item.reading === null), 'nothing is decided by opening the page');
  c.do('set', {station:'camera', value:'center'}); c.do('run', {station:'camera'});
  assert.deepEqual(c.station('camera').reading.rows.map(item => item.value), ['9 of 10', '10 of 10', '9 of 10']); assert.equal(c.station('camera').reading.ok, true);
  c.do('set', {station:'scores', value:'block-all'}); const blocked = c.do('run', {station:'scores'});
  assert.equal(c.station('scores').reading.ok, false); assert.match(blocked.message, /Blocking both fails the target/u);
  c.do('set', {station:'scores', value:'scores-only'});
  assert.equal(c.station('scores').stale, true, 'a changed setup needs a fresh test');
  c.do('run', {station:'scores'}); assert.deepEqual(c.station('scores').reading.rows.map(item => item.value), ['opened', 'blocked']);
  c.do('run', {station:'commentary'}); assert.equal(c.station('commentary').reading.ok, true, 'commentary can open now');
  c.do('set', {station:'commentary', value:'show'}); const moved = c.do('run', {station:'commentary'});
  assert.equal(c.station('commentary').reading.rows[1].value, '32 ms'); assert.match(moved.message, /calls for a new decision/u);
  c.do('run', {station:'judge'}); assert.equal(c.station('judge').reading.ok, false);
  c.do('set', {station:'judge', value:'judge'}); c.do('run', {station:'judge'});
  assert.deepEqual(c.station('judge').reading.rows.map(item => item.value), ['app opened (tunnel up)', 'score submitted', 'blocked']);
});

test('capstone: each band owns its stations, stations open independently, and 11–12 gives a rollback decision', () => {
  assert.deepEqual([capstoneOwned('7-8'), capstoneOwned('9-10'), capstoneOwned('11-12'), capstoneOwned('')], [['camera'], ['scores'], ['camera', 'scores', 'commentary', 'judge'], []]);
  const young = capstone(); young.do('band', '7-8');
  assert.match(capstoneCompletion(young.state, HANDOFF).blockers.join(';'), /Robot camera: run a new test/u);
  young.do('run', {station:'camera'}); young.do('decide', {station:'camera', decision:'open'});
  assert.equal(young.station('camera').consistent, false, 'open does not fit 10/8/10');
  young.do('decide', {station:'camera', decision:'hold'});
  assert.equal(capstoneCompletion(young.state, HANDOFF).ready, true, 'a justified hold is a complete station decision');
  young.do('set', {station:'camera', value:'center'});
  assert.equal(capstoneCompletion(young.state, HANDOFF).ready, false, 'the old lap is stale');
  young.do('run', {station:'camera'}); young.do('decide', {station:'camera', decision:'open'});
  assert.deepEqual(capstoneCompletion(young.state, HANDOFF), {ready:true, blockers:[]});
  assert.equal(capstoneCompletion(young.state, 'short').ready, false);
  const senior = capstone(); senior.do('band', '11-12');
  senior.do('run', {station:'camera'}); senior.do('decide', {station:'camera', decision:'hold'});
  senior.do('set', {station:'scores', value:'scores-only'}); senior.do('run', {station:'scores'}); senior.do('decide', {station:'scores', decision:'open'});
  assert.deepEqual([senior.station('camera').status, senior.station('scores').status, senior.view.open, senior.view.held], ['hold', 'open', 1, 1], 'one station opens while another is on hold');
  senior.do('run', {station:'commentary'}); senior.do('decide', {station:'commentary', decision:'open'});
  senior.do('set', {station:'judge', value:'judge'}); senior.do('run', {station:'judge'}); senior.do('decide', {station:'judge', decision:'open'});
  assert.deepEqual(capstoneCompletion(senior.state, HANDOFF).blockers, ['give a rollback decision']);
  assert.match(senior.do('rollback', 'previous').message, /Only that station steps back/u); assert.equal(ROLLBACK_OPTIONS.length, 3);
  assert.equal(capstoneCompletion(senior.state, HANDOFF).ready, true);
  const report = capstoneReport({state:senior.state, notes:HANDOFF, closed:true});
  assert.match(report, /FAIR-600 · Opening day at the tech fair/u); assert.match(report, /ROBOT CAMERA · YOUR CREW[\s\S]*Decision: HOLD \(agrees with the current reading\)/u); assert.match(report, /ROLLBACK DECISION\nRestore the last settings that passed rehearsal/u); assert.match(report, /Stations open: 3 of 4/u);
  // Saved capstone work is replayed, not trusted.
  const forged = normalizeCapstoneRecord({state:{band:'7-8', stations:{camera:{config:{spot:'rehearsal'}, runs:[{spot:'rehearsal', ok:true}], decision:'open'}}}, notes:HANDOFF, closed:true});
  assert.equal(forged.closed, false); assert.equal(forged.verified, false);
  assert.deepEqual(normalizeCapstoneState({band:'x', rollback:'y', stations:{camera:{config:{spot:'moon'}, runs:'x', decision:'yes'}}}), initialCapstoneState());
  const page = renderFairCapstonePage(normalizeCapstoneRecord({state:senior.state, notes:HANDOFF}));
  assert.match(page, /Opening-day board/u); assert.match(page, /3 of 4 stations open\. A station on hold does not stop the others\./u); assert.equal((page.match(/data-cap-run="/gu) || []).length, 4);
});

test('release modes: the restricted preview keeps the hub and withholds every mission model', async () => {
  const preview = Buffer.from((await bundleTier({member:false})).javascript).toString('utf8');
  assert.ok(preview.includes('Run the school <em>tech fair.</em>'), 'the pathway overview is public');
  assert.ok(preview.includes('The frozen robot cam'), 'mission titles are catalogue teasers');
  for (const marker of ['robot keeps moving, but its camera', 'Run a lap', 'Lower the curtain', 'D · Press table', 'What happened at the', 'Judge Okafor', 'Rehearsal lap: 10, 8 and 10', 'Hand off &amp; open report']) assert.equal(preview.includes(marker), false, marker + ' must not reach the restricted artifact');
  const open = await bundleTier({member:true, localOnly:true, publicLabsOpen:true, split:true});
  const entry = Buffer.from(open.javascript).toString('utf8'), all = entry + open.chunks.map(chunk => Buffer.from(chunk.javascript).toString('utf8')).join('\n');
  for (const marker of ['robot keeps moving, but its camera', 'Run a lap', 'Lower the curtain', 'Judge Okafor', 'Rehearsal lap: 10, 8 and 10']) {assert.ok(all.includes(marker), marker); assert.equal(entry.includes(marker), false, marker + ' downloads with the mission, not with the home page');}
  assert.ok(entry.includes('Run the school <em>tech fair.</em>'));
});

test('build: /networking is the application shell on the pathway route, with short assignment redirects in both modes', async t => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8'), shell = renderNetworkingShell(index);
  assert.match(shell, /<html lang="en" data-start-route="networking">/u); assert.match(shell, /<link rel="canonical" href="https:\/\/www\.colelearninglabs\.com\/networking">/u);
  assert.match(shell, /<title>Networking pathway · Cole Learning Labs<\/title>/u); assert.doesNotMatch(shell, /rel="manifest"/u);
  const entryScripts = page => page.split('\n').filter(line => line.toLowerCase().includes('<script')).join('\n');
  assert.equal(entryScripts(shell), entryScripts(index), 'the same entry script and nothing else');
  assert.equal(entryScripts(shell).split('\n').length, 1);
  assert.throws(() => renderNetworkingShell('<html lang="fr">'), /reviewed markup/u);
  assert.deepEqual(APP_SHELL_PAGES, ['networking.html']); assert.ok(PUBLIC_LANDING_PAGES.includes('lessons/networking-fair.html'));
  assert.equal(NETWORKING_REDIRECTS.length, 13);
  assert.deepEqual(NETWORKING_REDIRECTS.find(([from]) => from === '/networking/frozen-robot-cam'), ['/networking/frozen-robot-cam', '/networking#lab/FAIR-204/request']);
  for (const [, to] of NETWORKING_REDIRECTS) assert.notEqual(routeAccess(learningRoute(to.slice('/networking'.length))), 'unknown', to);
  assert.equal(Object.keys(FAIR_SLUGS).every(slug => /^[a-z0-9-]{3,40}$/u.test(slug)), true);
  for (const access of ['open', 'preview']) {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'cll-networking-'));
    t.after(() => rm(parent, {recursive:true, force:true}));
    const built = await buildSite({publicLabAccess:access, outputRoot:parent}), read = name => readFile(path.join(built.directory, name), 'utf8');
    const page = await read('networking.html'), home = await read('index.html');
    assert.match(page, /data-start-route="networking"/u, access);
    assert.equal(page.match(/src\/app\.js\?release=[A-Za-z0-9_-]+/u)[0], home.match(/src\/app\.js\?release=[A-Za-z0-9_-]+/u)[0], access + ': one entry script per release mode');
    assert.ok(page.match(/src\/app\.js\?release=[A-Za-z0-9_-]+/u)[0].endsWith('-' + access));
    assert.equal(page.match(/<link rel="stylesheet"[^>]*>/gu).join(), home.match(/<link rel="stylesheet"[^>]*>/gu).join());
    const redirects = await read('_redirects');
    assert.match(redirects, /^\/networking\/frozen-robot-cam \/networking#lab\/FAIR-204\/request 302$/mu, access); assert.match(redirects, /^\/networking\/opening-day \/networking#networking\/opening-day 302$/mu);
    assert.equal(/^\/networking-handout \/#membership 302$/mu.test(redirects), access === 'preview', access + ': the handout is withheld only in preview');
    assert.equal(publicFilesFor(access).includes('networking-handout.html'), access === 'open');
    await (access === 'open' ? assert.doesNotReject(read('networking-handout.html')) : assert.rejects(read('networking-handout.html'), {code:'ENOENT'}));
    assert.ok((await read('lessons/networking-fair.html')).includes('Run the school tech fair'));
    for (const raw of ['src/fair-missions.js', 'src/fair-capstone.js', 'src/fair-mission-page.js', 'src/fair-catalog.js', 'scripts/networking-pages.mjs']) await assert.rejects(read(raw), {code:'ENOENT'}, raw + ' is never a raw public file');
    const server = createPreviewServer({sourceRoot:built.directory, publicLabAccess:access, generatedFiles:built.generated});
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = 'http://127.0.0.1:' + server.address().port, get = pathname => fetch(origin + pathname, {redirect:'manual'});
    const direct = await get('/networking'); assert.equal(direct.status, 200); assert.match(await direct.text(), /data-start-route="networking"/u);
    assert.equal((await get('/networking?cart=true')).status, 200, 'a shared-device link reaches the same page');
    const short = await get('/networking/frozen-robot-cam'); assert.equal(short.status, 302); assert.equal(short.headers.get('location'), '/networking#lab/FAIR-204/request');
    assert.equal((await get('/networking/')).headers.get('location'), '/networking'); assert.equal((await get('/networking/not-a-mission')).status, 404);
    const handout = await get('/networking-handout');
    if (access === 'open') {assert.equal(handout.status, 200); const text = await handout.text(); assert.match(text, /Networking word guide/u); assert.match(text, /class="evidence-card"/u); assert.doesNotMatch(text, /Meets target|Misses target|answer key/iu, 'cards show readings, not verdicts');}
    else {assert.equal(handout.status, 302); assert.equal(handout.headers.get('location'), '/#membership');}
  }
});

test('paper route: evidence cards come from the same models as the screen', () => {
  const camera = FAIR_MISSIONS.find(item => item.id === 'FAIR-204');
  const base = evidenceGroups(camera, 'base', 'lap'), after = evidenceGroups(camera, 'replay', 'lap');
  assert.deepEqual(base[0].setups.map(item => [item.setup[0][1], ...item.rows.map(entry => entry.value)]), [['Behind the cabinet (where it is now)', '10 of 10', '4 of 10', '9 of 10'], ['A · Pit wall', '10 of 10', '6 of 10', '8 of 10'], ['B · Center rail', '9 of 10', '10 of 10', '9 of 10'], ['C · Finish wall', '6 of 10', '7 of 10', '10 of 10']]);
  assert.deepEqual(after[0].setups.filter(item => /Center rail|Press table/u.test(item.setup[0][1])).map(item => item.rows.map(entry => entry.value)), [['9 of 10', '7 of 10', '9 of 10'], ['9 of 10', '9 of 10', '10 of 10']]);
  for (const mission of FAIR_MISSIONS) for (const condition of ['base', 'replay']) for (const item of mission.tests) {
    const groups = evidenceGroups(mission, condition, item.id);
    assert.ok(groups.length >= 1 && groups.every(group => group.setups.length >= 1 && group.setups.length <= 40), mission.id + ' ' + item.id);
    // Every printed reading equals what the browser model returns for that setup.
    for (const group of groups) for (const card of group.setups) {
      const config = {...initialFairState(mission.id).config};
      for (const [label, shown] of card.setup) {const control = mission.controls.find(entry => entry.label === label); config[control.name] = control.options.find(([, text]) => text === shown)[0];}
      const rows = mission.model(config, condition, item.id).rows;
      for (const entry of card.rows) assert.equal(rows.find(other => other.id === entry.id)?.value, entry.value, mission.id + ' ' + item.id + ' ' + entry.id);
    }
  }
});

test('teacher notes are public guidance without a grading scheme or mission outcomes', async () => {
  const notes = await readFile(new URL('../lessons/networking-fair.html', import.meta.url), 'utf8');
  for (const phrase of ['(5 min)', '(13 min)', '(10 min)', '(7 min)', 'Pair roles', 'Debrief questions', 'Defining the problem', 'Choosing a test', 'Verifying the result', 'Explaining the decision', 'Clues and retries carry no penalty', 'ISSC231', 'ISSC343', 'ISSC421']) assert.ok(notes.includes(phrase), phrase);
  assert.equal([...notes.matchAll(/<span class="lesson-time">\((\d+) min\)<\/span>/gu)].reduce((sum, match) => sum + Number(match[1]), 0), 40, 'the camera lesson is paced to 40 minutes');
  assert.doesNotMatch(notes, /\b[0-2] points?\b|\/ ?8\b|out of 8|mastery|answer key/iu, 'point scales and pass marks stay in the school’s private system');
  assert.doesNotMatch(notes, /Center rail|Press table|10\.20\.0\.53|scores-only/u, 'the notes do not state any mission’s outcome');
  for (const item of FAIR_CATALOG) assert.ok(notes.includes('https://www.colelearninglabs.com/networking/' + item.slug), item.slug);
});

test('the networking course has an overview, a 40-minute plan for every mission, a capstone lesson and a workbook', async () => {
  const {renderNetworkingCourse, NETWORKING_COURSE_PAGE_FILES, NETWORKING_COURSE_TITLE, networkingLessonNumber} = await import('../scripts/networking-course.mjs');
  const {COURSE_PAGE_FILES} = await import('../scripts/build.mjs');
  const pages = renderNetworkingCourse(), dir = 'courses/networking-tech-fair/';
  assert.equal(NETWORKING_COURSE_PAGE_FILES.length, 15); assert.deepEqual([...pages.keys()], [...NETWORKING_COURSE_PAGE_FILES]);
  assert.ok(NETWORKING_COURSE_PAGE_FILES.every(file => COURSE_PAGE_FILES.includes(file)), 'every page is published with the course catalogue');
  assert.deepEqual([networkingLessonNumber('FAIR-208'), networkingLessonNumber('FAIR-204'), networkingLessonNumber('FAIR-201'), networkingLessonNumber('FAIR-214'), networkingLessonNumber('FAIR-600')], [1, 3, 5, 12, 13]);
  const titles = new Set();
  for (const [file, html] of pages) {
    assert.match(html, /^<!doctype html>/u, file); assert.equal((html.match(/<h1[\s>]/gu) || []).length, 1, file);
    const heading = html.match(/<title>([^<]+)<\/title>/u)[1]; assert.equal(titles.has(heading), false, file); titles.add(heading);
    const description = html.match(/<meta name="description" content="([^"]+)">/u)[1]; assert.ok(description.length >= 70 && description.length <= 180, file + ' description');
    assert.ok(html.includes('<a href="/networking">Networking pathway</a>'), file + ' header links the pathway');
    assert.doesNotMatch(html, /<script\b|Meets target|Misses target|answer key|\b[0-2] points?\b|out of 8|mastery/iu, file + ' carries no script, verdict or point scale');
    // Every site link is a published page, a mission address or an application route.
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gu)) {
      if (href.startsWith('https://classroom.google.com/share?url=')) {assert.ok(decodeURIComponent(href).includes('https://www.colelearninglabs.com/networking/'), href); continue;}
      if (href === '#main') continue;
      assert.ok(href.startsWith('/'), file + ' → ' + href);
      const [pathname, hash] = href.split('#');
      if (pathname === '/' && hash) {assert.notEqual(routeAccess(learningRoute('#' + hash)), 'unknown', file + ' → ' + href); continue;}
      const known = ['/', '/courses', '/teach', '/district-review', '/networking', '/networking-handout', '/lessons/networking-fair', '/lessons/packet-post', ...NETWORKING_REDIRECTS.map(([from]) => from), ...NETWORKING_COURSE_PAGE_FILES.map(name => '/' + name.replace(/\/index\.html$/u, '').replace(/\.html$/u, ''))];
      assert.ok(known.includes(pathname), file + ' → ' + href);
    }
  }
  for (const mission of FAIR_MISSIONS) {
    const html = pages.get(dir + 'lesson-' + String(networkingLessonNumber(mission.id)).padStart(2, '0') + '.html');
    assert.ok(html.includes('id="student-handout"') && html.includes('id="teacher-plan"'), mission.id);
    assert.deepEqual([...html.matchAll(/<strong>(\d+) minutes<\/strong> ·/gu)].map(match => Number(match[1])), [5, 5, 13, 10, 7], mission.id + ' is paced to 40 minutes');
    for (const phrase of ['What to look for', 'Listen for', 'Pair roles', 'Exit ticket', 'Clues and retries carry no penalty', 'href="/networking/' + mission.slug + '"']) assert.ok(html.includes(phrase), mission.id + ' ' + phrase);
    for (const item of mission.tests) assert.ok(html.includes(item.label), mission.id + ' lists ' + item.id);
  }
  const capstone = pages.get(dir + 'lesson-13.html');
  assert.equal([...capstone.matchAll(/<strong>(\d+) minutes<\/strong> ·/gu)].reduce((sum, match) => sum + Number(match[1]), 0), 40);
  for (const item of CAPSTONE_STATIONS) assert.ok(capstone.includes(item.title) && capstone.includes(item.rehearsal), item.id);
  const overview = pages.get(dir + 'index.html');
  assert.ok(overview.includes(NETWORKING_COURSE_TITLE)); assert.equal((overview.match(/href="\/courses\/networking-tech-fair\/lesson-13"/gu) || []).length, 3, 'each band ends with the capstone');
  for (let number = 1; number <= 12; number++) assert.ok(overview.includes('href="/courses/networking-tech-fair/lesson-' + String(number).padStart(2, '0') + '"'), 'lesson ' + number);
  const catalogue = await readFile(new URL('../courses.html', import.meta.url), 'utf8');
  assert.ok(catalogue.includes('href="/courses/networking-tech-fair"') && catalogue.includes(NETWORKING_COURSE_TITLE));
  assert.match(pages.get(dir + 'workbook.html'), /Networking word guide[\s\S]*Mission record sheet/u);
});
