// Generated pages for the Networking pathway.
//   networking.html          the application shell opened on the pathway hub, so /networking is a
//                            direct, refreshable address (both release modes).
//   networking-handout.html  student handout, plain-language word guide, a mission record sheet and
//                            printable evidence cards (open release only: it carries mission content).
// Both are built from the reviewed home page and the same mission models the browser uses, so the
// paper route cannot drift from the screen route. Evidence cards show readings and the target only:
// no pass marks, no feedback and no decisions.
import {FAIR_BANDS, FAIR_CAPSTONE, fairBandMissions} from '../src/fair-catalog.js';
import {DECISIONS, FAIR_MISSIONS} from '../src/fair-missions.js';
import {CAPSTONE_STATIONS} from '../src/fair-capstone.js';

export const NETWORKING_SHELL_PAGE = 'networking.html';
export const NETWORKING_HANDOUT_PAGE = 'networking-handout.html';
// The evidence cards as one printable file. Like the handout, it carries mission readings, so it is
// published only in the open release. scripts/generate-course-downloads.mjs prints and pins it.
export const NETWORKING_CARDS_PDF = 'assets/networking-evidence-cards.pdf';
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const SITE = 'https://www.colelearninglabs.com';

/** The home page shell with the pathway as its opening route and its own title and address. */
export function renderNetworkingShell(indexHtml) {
  const replacements = [
    [/<html lang="en">/u, '<html lang="en" data-start-route="networking">'],
    [/<title>[^<]*<\/title>/u, '<title>Networking pathway · Cole Learning Labs</title>'],
    [/<meta name="description" content="[^"]*">/u, '<meta name="description" content="Run part of a school tech fair in twelve networking missions for grades 7–12. Make a decision, see what happens and explain it with evidence. No account.">'],
    [/<meta property="og:title" content="[^"]*">/u, '<meta property="og:title" content="Networking pathway · Cole Learning Labs">'],
    [/<meta property="og:description" content="[^"]*">/u, '<meta property="og:description" content="Twelve playable networking missions for grades 7–12, set at a school tech fair.">'],
    [/<meta property="og:url" content="[^"]*">/u, '<meta property="og:url" content="' + SITE + '/networking">'],
    [/<link rel="canonical" href="[^"]*">/u, '<link rel="canonical" href="' + SITE + '/networking">'],
    // The installable-app manifest belongs to the root page only.
    [/\s*<link rel="manifest" href="[^"]*">/u, '']
  ];
  let html = indexHtml;
  for (const [pattern, value] of replacements) {
    if (!pattern.test(html)) throw new Error('The home page no longer has the reviewed markup the Networking pathway page is built from.');
    html = html.replace(pattern, value);
  }
  return html;
}

const allowed = (item, condition) => item.options.filter(([, , only]) => !only || only === condition);
function product(lists) {return lists.reduce((rows, list) => rows.flatMap(row => list.map(value => [...row, value])), [[]]);}
/** For one test in one condition: which controls each reading depends on, and the reading for each such setup. */
export function evidenceGroups(mission, condition, testId) {
  const controls = mission.controls, initial = Object.fromEntries(controls.map(item => [item.name, allowed(item, condition).some(([value]) => value === item.initial) ? item.initial : allowed(item, condition)[0][0]]));
  const configs = product(controls.map(item => allowed(item, condition).map(([value]) => value))).map(values => Object.fromEntries(controls.map((item, index) => [item.name, values[index]])));
  const read = config => new Map(mission.model(config, condition, testId).rows.map(entry => [entry.id, entry]));
  const readings = configs.map(config => ({config, rows:read(config)})), ids = [...new Set(readings.flatMap(item => [...item.rows.keys()]))];
  const value = (item, id) => item.rows.get(id)?.value ?? null;
  const depends = id => controls.filter(control => readings.some(a => readings.some(b => controls.every(other => other === control ? a.config[other.name] !== b.config[other.name] : a.config[other.name] === b.config[other.name]) && value(a, id) !== value(b, id)))).map(control => control.name);
  const groups = new Map();
  for (const id of ids) {const names = depends(id), key = names.join('|'); if (!groups.has(key)) groups.set(key, {names, ids:[]}); groups.get(key).ids.push(id);}
  return [...groups.values()].map(group => {
    const using = controls.filter(item => group.names.includes(item.name));
    const setups = product(using.map(item => allowed(item, condition))).map(choice => {
      const config = {...initial, ...Object.fromEntries(using.map((item, index) => [item.name, choice[index][0]]))}, rows = read(config);
      return {setup:using.map((item, index) => [item.label, choice[index][1]]), rows:group.ids.filter(id => rows.has(id)).map(id => rows.get(id))};
    }).filter(item => item.rows.length);
    return {controls:using.map(item => item.label), setups};
  }).filter(group => group.setups.length);
}

const CARD_LIMIT = 12;
function evidenceHTML(mission) {
  const parts = [];
  for (const condition of ['base', 'replay']) for (const test of mission.tests) {
    const when = condition === 'replay' ? 'After: ' + mission.replay.action.toLowerCase() : 'Before the change';
    for (const group of evidenceGroups(mission, condition, test.id)) {
      const heading = '<h4>' + esc(test.label) + ' · ' + esc(when) + '</h4>';
      if (group.setups.length > CARD_LIMIT) {
        parts.push(heading + '<div class="school-table-scroll" role="region" aria-label="' + esc(mission.title + ': ' + test.label + ', ' + when) + '" tabindex="0"><table class="school-review-table"><thead><tr>' + group.controls.map(label => '<th scope="col">' + esc(label) + '</th>').join('') + group.setups[0].rows.map(entry => '<th scope="col">' + esc(entry.label.replace(/\s\d[\d.]*$/u, '')) + '</th>').join('') + '</tr></thead><tbody>' + group.setups.map(item => '<tr>' + item.setup.map(([, value]) => '<td>' + esc(value) + '</td>').join('') + item.rows.map(entry => '<td>' + esc(entry.value) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      } else {
        parts.push(heading + '<ul class="evidence-cards">' + group.setups.map(item => '<li class="evidence-card"><p class="evidence-card-head">' + esc(mission.id) + ' · ' + esc(when) + '</p><p class="evidence-card-setup"><strong>If the crew chose:</strong> ' + (item.setup.length ? item.setup.map(([label, value]) => esc(label) + ': ' + esc(value)).join('; ') : 'any setup') + '</p><p class="evidence-card-test"><strong>Test:</strong> ' + esc(test.label) + '</p><ul>' + item.rows.map(entry => '<li>' + esc(entry.label) + ': <strong>' + esc(entry.value) + '</strong></li>').join('') + '</ul></li>').join('') + '</ul>');
      }
    }
  }
  return parts.join('');
}

/** Evidence a mission hands the crew before any test: snapshots, settings and counter readings, before and after the change. */
function suppliedHTML(mission) {
  if (!mission.supplied) return '';
  const config = Object.fromEntries(mission.controls.map(item => [item.name, item.initial])), seen = new Set(), parts = [];
  for (const [condition, when] of [['base', 'Before the change'], ['replay', 'After: ' + mission.replay.action.toLowerCase()]]) for (const table of mission.supplied(condition, config)) {
    const key = JSON.stringify(table); if (seen.has(key)) continue; seen.add(key);
    parts.push('<h4>Supplied evidence · ' + esc(table.caption) + ' · ' + esc(when) + '</h4><div class="school-table-scroll" role="region" aria-label="' + esc(mission.title + ': ' + table.caption + ', ' + when) + '" tabindex="0"><table class="school-review-table"><thead><tr>' + table.headers.map(head => '<th scope="col">' + esc(head) + '</th>').join('') + '</tr></thead><tbody>' + table.rows.map(cells => '<tr>' + cells.map(cell => '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
  }
  return parts.join('');
}

function missionHTML(mission) {
  return '<section class="handout-mission" aria-labelledby="m-' + mission.id + '"><h3 id="m-' + mission.id + '">' + esc(mission.id + ' · ' + mission.title) + '</h3>' +
    '<p><strong>Who needs help:</strong> ' + esc(mission.person) + '. ' + esc(mission.brief) + '</p><p><strong>What you can observe:</strong> ' + esc(mission.observe) + '</p><p><strong>Target:</strong> ' + esc(mission.success) + '</p>' +
    '<p><strong>Predict:</strong> ' + esc(mission.predict.prompt) + '</p><ul class="check-list">' + mission.predict.options.map(([, label]) => '<li>' + esc(label) + '</li>').join('') + '</ul>' +
    '<p><strong>What your crew can change</strong></p><ul>' + mission.controls.map(item => '<li>' + esc(item.label) + ': ' + item.options.map(([, label]) => esc(label)).join(' / ') + '</li>').join('') + '</ul>' +
    '<p><strong>Tests you can run:</strong> ' + mission.tests.map(item => esc(item.label)).join('; ') + '.</p>' +
    '<p><strong>Then one thing changes:</strong> ' + esc(mission.replay.text) + ' Run a fresh test. An old reading is no longer current.</p>' +
    '<p><strong>Sentence starter:</strong> ' + esc(mission.starter) + '</p>' +
    '<p><a href="/networking/' + mission.slug + '">Open this mission on a device</a></p>' +
    '<details class="handout-cards"><summary>Evidence cards for ' + esc(mission.title) + ' (print, cut and keep face down)</summary>' + evidenceHTML(mission) + '</details>' + suppliedHTML(mission) + '</section>';
}

/** Student handout: the same briefs, choices, tests, changed conditions and decisions as the screen route. */
export function renderNetworkingHandout({release, template}) {
  if (!/^[A-Za-z0-9_-]{1,100}$/u.test(String(release))) throw new Error('The handout needs the reviewed stylesheet release.');
  // The header menu and footer come from a reviewed landing page, so every plain page shares one menu.
  const header = String(template ?? '').match(/<header class="site-header school-header">[\s\S]*?<\/header>/u)?.[0], footer = String(template ?? '').match(/<footer class="site-footer">[\s\S]*?<\/footer>/u)?.[0];
  if (!header || !footer) throw new Error('The handout needs the reviewed landing page header and footer.');
  const words = new Map();
  for (const mission of FAIR_MISSIONS) for (const item of mission.terms) if (!words.has(item.term.toLowerCase())) words.set(item.term.toLowerCase(), item);
  const guide = [...words.values()].sort((a, b) => a.term.localeCompare(b.term));
  const sheet = ['Mission', 'Who needs help, and the target', 'My prediction', 'First test: what I chose and what I read', 'What I changed, and the new reading', 'The condition that changed', 'Fresh test after the change', 'Evidence my decision rests on'].map((label, index) => '<label class="lab-field" for="sheet-' + index + '">' + label + '<textarea id="sheet-' + index + '" rows="2"></textarea></label>').join('') +
    '<fieldset class="handout-decision"><legend>Tell the next crew</legend>' + DECISIONS.map(item => '<label><input type="radio" name="sheet-decision" value="' + item.id + '"> <strong>' + item.label + '.</strong> ' + esc(item.help) + '</label>').join('') + '</fieldset><label class="lab-field" for="sheet-handoff">Handoff sentence<textarea id="sheet-handoff" rows="3"></textarea></label>';
  return '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <meta name="theme-color" content="#102c46">\n  <meta name="description" content="Student handout for the Networking pathway: a plain-language word guide, a mission record sheet and printable evidence cards for twelve tech fair missions.">\n  <title>Networking pathway handout · Cole Learning Labs</title>\n  <link rel="canonical" href="' + SITE + '/networking-handout">\n  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">\n' +
    ['styles', 'school', 'landing', 'accessibility'].map(name => '  <link rel="stylesheet" href="/src/' + name + '.css?release=' + release + '">\n').join('') + '</head>\n<body>\n  <a class="skip-link" href="#main">Skip to main content</a>\n  ' + header + '\n  <main id="main" tabindex="-1">\n' +
    '<section class="wrap page-intro"><p class="eyebrow">Student handout · Networking pathway · Grades 7–12</p><h1>The school tech fair</h1><p>Your crew runs part of a school tech fair. In each mission you make a decision, see what happens and use the evidence to explain it. This handout works beside a device, or on paper with the evidence cards.</p><div class="button-row"><a class="button" href="/networking">Open the Networking pathway</a><a class="button button-outline" href="/lessons/networking-fair">Teaching notes</a></div></section>\n' +
    '<section class="wrap prose section landing-wide"><h2 id="how">How every mission works</h2><ol class="lesson-steps"><li><strong>Get the brief.</strong> Meet the person who needs help. Read what you can observe and the target. Predict what will happen.</li><li><strong>Try it.</strong> Read the worked example. Change one thing, run a test and put the reading next to the baseline.</li><li><strong>Prove it.</strong> One condition changes. Run a fresh test, choose your evidence and tell the next crew: open, hold or revise.</li></ol><p>Clues and retries carry no penalty. A reading from before you changed the setup is out of date: test again.</p>' +
    '<h2 id="words">Networking word guide</h2><p>Each word is explained in a mission at the moment you first need it. Here they are in one place.</p><dl class="lesson-facts handout-words">' + guide.map(item => '<div><dt>' + esc(item.term) + '</dt><dd>' + esc(item.plain) + '</dd></div>').join('') + '</dl>' +
    '<h2 id="record">Mission record sheet</h2><p>Use one sheet per mission. What you type here stays on this page and is not saved or sent; print it or copy it into the document your teacher uses.</p><form class="handout-sheet" aria-label="Mission record sheet">' + sheet + '</form>' +
    '<h2 id="paper">Playing on paper</h2><p><a href="/' + NETWORKING_CARDS_PDF + '" download>Download every evidence card as one PDF</a>, or open a mission’s card set below and print this page.</p><p>Work in threes. One person keeps the evidence cards face down. The crew says its setup and its test out loud, and the card keeper turns over the matching card. Read every line on the card before you decide. When the condition changes, put the earlier cards to one side: you may compare with them, but they are no longer current.</p>' +
    FAIR_BANDS.map(band => '<h2 id="band-' + band.id + '">Grades ' + band.grade + ' · ' + esc(band.title) + '</h2>' + fairBandMissions(band.id).map(meta => missionHTML(FAIR_MISSIONS.find(item => item.id === meta.id))).join('')).join('') +
    '<h2 id="capstone">' + esc(FAIR_CAPSTONE.title) + '</h2><p>Four stations rehearsed last night. Repair, retest and decide for each one. A station on hold does not stop the others. Grades 7–8 own the camera, grades 9–10 own guest scores, and grades 11–12 coordinate all four and give a rollback decision.</p><div class="school-table-scroll" role="region" aria-label="Opening-day stations" tabindex="0"><table class="school-review-table"><thead><tr><th scope="col">Station</th><th scope="col">Rehearsal</th><th scope="col">Evidence for opening</th><th scope="col">What the crew can change</th></tr></thead><tbody>' + CAPSTONE_STATIONS.map(item => '<tr><th scope="row">' + esc(item.title) + '</th><td>' + esc(item.rehearsal) + '</td><td>' + esc(item.target) + '</td><td>' + esc(item.control.label + ': ' + item.control.options.map(([, label]) => label).join(' / ')) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<details class="handout-cards"><summary>Evidence cards for the capstone (print, cut and keep face down)</summary><ul class="evidence-cards">' + CAPSTONE_STATIONS.flatMap(item => item.control.options.map(([value, label]) => '<li class="evidence-card"><p class="evidence-card-head">' + esc(FAIR_CAPSTONE.id + ' · ' + item.title) + '</p><p class="evidence-card-setup"><strong>If the crew chose:</strong> ' + esc(item.control.label + ': ' + label) + '</p><p class="evidence-card-test"><strong>Test:</strong> ' + esc(item.test) + '</p><ul>' + item.model({[item.control.name]:value}).rows.map(entry => '<li>' + esc(entry.label) + ': <strong>' + esc(entry.value) + '</strong></li>').join('') + '</ul></li>')).join('') + '</ul></details>' +
    '<p class="landing-note">Every person, device and reading here is made up. The missions are teaching models on fictional equipment; they do not configure or test a real network.</p><p class="quiet-note"><a href="/networking">Back to the Networking pathway</a></p></section>\n' +
    '  </main>\n  ' + footer + '\n<script type="module" src="/src/site-menu.js?release=' + release + '"></script>\n</body>\n</html>\n';
}

const capstoneCards = () => '<ul class="evidence-cards">' + CAPSTONE_STATIONS.flatMap(item => item.control.options.map(([value, label]) => '<li class="evidence-card"><p class="evidence-card-head">' + esc(FAIR_CAPSTONE.id + ' · ' + item.title) + '</p><p class="evidence-card-setup"><strong>If the crew chose:</strong> ' + esc(item.control.label + ': ' + label) + '</p><p class="evidence-card-test"><strong>Test:</strong> ' + esc(item.test) + '</p><ul>' + item.model({[item.control.name]:value}).rows.map(entry => '<li>' + esc(entry.label) + ': <strong>' + esc(entry.value) + '</strong></li>').join('') + '</ul></li>')).join('') + '</ul>';
/** Every evidence card on one printable document: one mission per sheet, cards only, no verdicts. */
export function renderEvidenceCardsPrint({release, template}) {
  if (!/^[A-Za-z0-9_-]{1,100}$/u.test(String(release))) throw new Error('The evidence cards need the reviewed stylesheet release.');
  const header = String(template ?? '').match(/<header class="site-header school-header">[\s\S]*?<\/header>/u)?.[0];
  if (!header) throw new Error('The evidence cards need the reviewed landing page header.');
  const sheet = (id, heading, target, body, first) => '<section class="' + (first ? '' : 'print-new-page') + '" aria-labelledby="cards-' + id + '"><h2 id="cards-' + id + '">' + esc(heading) + '</h2><p><strong>Target:</strong> ' + esc(target) + '</p>' + body + '</section>';
  const missions = FAIR_BANDS.flatMap(band => fairBandMissions(band.id).map(meta => FAIR_MISSIONS.find(item => item.id === meta.id)));
  return '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>Evidence cards · Networking pathway · Cole Learning Labs</title>\n' + ['styles', 'school', 'landing', 'accessibility'].map(name => '  <link rel="stylesheet" href="/src/' + name + '.css?release=' + release + '">\n').join('') + '</head>\n<body>\n  ' + header + '\n  <main id="main" tabindex="-1"><section class="wrap prose section landing-wide"><h1>Evidence cards: the school tech fair</h1><p>Print, cut along the dashed lines and keep each mission’s cards face down. The crew says its setup and its test out loud, and the card keeper turns over the matching card. A card shows a reading. Deciding what it means is the crew’s job.</p><p>When the condition changes, use the cards marked “After”. Earlier cards may be compared, but they are no longer current. Where a mission has many possible setups, its readings are printed as a table for the card keeper instead of as cards.</p>' +
    missions.map((mission, index) => sheet(mission.id, mission.id + ' · ' + mission.title, mission.success, suppliedHTML(mission) + evidenceHTML(mission), index === 0)).join('') + sheet(FAIR_CAPSTONE.id, FAIR_CAPSTONE.id + ' · ' + FAIR_CAPSTONE.title, 'Each station opens on its own evidence.', capstoneCards(), false) +
    '<p class="landing-note">Every person, device and reading here is made up. www.colelearninglabs.com/networking</p></section></main>\n</body>\n</html>\n';
}
