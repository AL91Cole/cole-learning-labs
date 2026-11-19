// Opening day at the tech fair: one shared capstone with four station decisions.
// Each station starts in its rehearsal condition. A crew repairs it, runs a fresh test and
// decides open, hold or revise. Stations are independent: one can open while another holds.
// Grades 7–8 own the camera, grades 9–10 own guest scores, and grades 11–12 coordinate all
// four and give a rollback decision. Local model on fictional equipment; nothing is sent anywhere.
import {FAIR_BANDS, FAIR_CAPSTONE} from './fair-catalog.js?release=20261107-tech-team';
import {DECISIONS, HANDOFF_MINIMUM} from './fair-missions.js?release=20261107-tech-team';

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const row = (id, label, value, ok = null, target = '') => ({id, label, value, ok, target});
const count = (id, label, got) => row(id, label, got + ' of 10', got >= 9, 'at least 9 of 10');

export const CAPSTONE_STATIONS = Object.freeze([
  Object.freeze({id:'camera', title:'Robot camera', owner:'7-8', test:'Run a new lap', target:'At least 9 of 10 packets at the pit, the blue line and the finish.',
    rehearsal:'Rehearsal lap: 10, 8 and 10 at the three stops.',
    control:{name:'spot', label:'Access point location', options:[['rehearsal', 'Rehearsal spot'], ['center', 'B · Center rail']]},
    model:config => {const values = config.spot === 'center' ? [9, 10, 9] : [10, 8, 10]; return {rows:['Pit', 'Blue line', 'Finish'].map((stop, index) => count('stop' + index, stop, values[index])), note:config.spot === 'center' ? 'Every stop has at least 9 of 10.' : 'Ten at the pit and the finish. What happened at the blue line?'};}}),
  Object.freeze({id:'scores', title:'Guest scores', owner:'9-10', test:'Test as one guest: scores, then staff files', target:'Scores open and staff files are blocked for the same guest.',
    rehearsal:'Rehearsal: the scores open, and so do the staff files.',
    control:{name:'rule', label:'Gateway rule for guests', options:[['allow-all', 'Allow guests to everything (rehearsal)'], ['scores-only', 'Allow scores; block staff files'], ['block-all', 'Block guests from everything']]},
    model:config => ({rows:[row('scores', 'Guest → live scores', config.rule === 'block-all' ? 'blocked' : 'opened', config.rule !== 'block-all', 'opens'), row('staff', 'Same guest → staff files', config.rule === 'allow-all' ? 'opened' : 'blocked', config.rule !== 'allow-all', 'blocked')], note:config.rule === 'block-all' ? 'The staff files are safe, and nobody can see the scores. Blocking both fails the target.' : config.rule === 'allow-all' ? 'The scores open. So do the staff files.' : 'Scores open and staff files are blocked.'})}),
  Object.freeze({id:'commentary', title:'Commentary', owner:'11-12', test:'Measure the commentary audio', target:'Loss under 1% and jitter at most 20 ms.',
    rehearsal:'Rehearsal: 0.4% loss and 12 ms jitter. It can open now.',
    control:{name:'upload', label:'The upload runs', options:[['after', 'After the show (rehearsal plan)'], ['show', 'Rescheduled into show time']]},
    model:config => {const [loss, jitter] = config.upload === 'show' ? [0.8, 32] : [0.4, 12]; return {rows:[row('loss', 'Audio lost', loss + '%', loss < 1, 'under 1%'), row('jitter', 'Jitter', jitter + ' ms', jitter <= 20, 'at most 20 ms')], note:jitter <= 20 ? 'Both targets are met. This station can open now.' : 'With the upload back in show time, jitter is 32 ms. That calls for a new decision.'};}}),
  Object.freeze({id:'judge', title:'Remote judge', owner:'11-12', test:'Submit a score, then try the staff files', target:'The approved role can submit and staff files stay blocked.',
    rehearsal:'Rehearsal: the tunnel is up and the judge can view, but she cannot submit. Staff files are blocked.',
    control:{name:'role', label:'Scoring-app role', options:[['observer', 'Observer (rehearsal)'], ['judge', 'Approved judge']]},
    model:config => ({rows:[row('view', 'Open the scoring app', 'app opened (tunnel up)', true, 'opens'), row('submit', 'Submit a score', config.role === 'judge' ? 'score submitted' : 'refused: observers can view but cannot submit', config.role === 'judge', 'score submitted'), row('staff', 'Try the staff files', 'blocked', true, 'blocked')], note:config.role === 'judge' ? 'The approved role submits, and the staff files stay blocked.' : 'She can view, so the tunnel works. What decides who may submit?'})})
]);
export const ROLLBACK_OPTIONS = Object.freeze([
  ['previous', 'Restore the last settings that passed rehearsal for that station', 'Only that station steps back, to a setup you already have evidence for.'],
  ['reset', 'Factory reset every station', 'That also undoes the stations that are working, and it removes the boundaries you tested.'],
  ['none', 'Leave it and keep changing things live', 'With no way back, each new change is tested on the audience.']
]);
const station = id => CAPSTONE_STATIONS.find(item => item.id === id) || null;
const bands = FAIR_BANDS.map(band => band.id);
/** The stations a band must resolve. Any crew may still play the others. */
export const capstoneOwned = band => band === '11-12' ? CAPSTONE_STATIONS.map(item => item.id) : CAPSTONE_STATIONS.filter(item => item.owner === band).map(item => item.id);

export function initialCapstoneState() {
  return {band:'', rollback:'', stations:Object.fromEntries(CAPSTONE_STATIONS.map(item => [item.id, {config:{[item.control.name]:item.control.options[0][0]}, runs:[], decision:''}]))};
}
export function normalizeCapstoneState(saved) {
  const state = initialCapstoneState();
  if (!plain(saved)) return state;
  if (bands.includes(saved.band)) state.band = saved.band;
  if (ROLLBACK_OPTIONS.some(([value]) => value === saved.rollback)) state.rollback = saved.rollback;
  for (const item of CAPSTONE_STATIONS) {
    const source = plain(saved.stations) && plain(saved.stations[item.id]) ? saved.stations[item.id] : {}, target = state.stations[item.id], name = item.control.name, allowed = value => item.control.options.some(([option]) => option === value);
    if (plain(source.config) && allowed(source.config[name])) target.config[name] = source.config[name];
    // A run keeps only the setup it used. Its reading always comes from the model.
    if (Array.isArray(source.runs)) target.runs = source.runs.slice(-20).filter(run => plain(run) && allowed(run[name])).map((run, index) => ({n:index + 1, [name]:run[name]}));
    if (DECISIONS.some(decision => decision.id === source.decision)) target.decision = source.decision;
  }
  return state;
}

/** One station as the page, the text view and the report show it. */
function stationView(item, state) {
  const own = state.stations[item.id], name = item.control.name, latest = own.runs.at(-1) || null, previous = own.runs.at(-2) || null;
  const read = config => {const reading = item.model(config); return {...reading, ok:reading.rows.filter(entry => entry.ok !== null).every(entry => entry.ok)};};
  const reading = latest ? read(latest) : null, stale = !!latest && latest[name] !== own.config[name], current = !!latest && !stale;
  const consistent = current && own.decision !== '' && (reading.ok ? own.decision === 'open' : own.decision !== 'open');
  return {...item, config:own.config, decision:own.decision, runs:own.runs.length, baseline:read({[name]:item.control.options[0][0]}), reading, prior:previous ? read(previous) : null, stale, current, consistent,
    status:!latest ? 'rehearsal' : stale ? 'stale' : consistent && own.decision === 'open' ? 'open' : consistent ? own.decision : reading.ok ? 'ready' : 'missed'};
}
export function capstoneView(saved) {
  const state = normalizeCapstoneState(saved), stations = CAPSTONE_STATIONS.map(item => stationView(item, state)), owned = capstoneOwned(state.band);
  return {state, stations, owned, coordinator:state.band === '11-12', open:stations.filter(item => item.status === 'open').length, held:stations.filter(item => item.consistent && item.decision !== 'open').length};
}

const result = (state, message, kind = 'info', extra = {}) => ({state, message, kind, ...extra});
export function applyCapstoneAction(previous, action, value) {
  const state = normalizeCapstoneState(previous);
  if (action === 'band') {if (!bands.includes(value)) return result(state, 'Choose a grade band.', 'warning'); state.band = value; return result(state, 'Crew set. Your stations are marked.', 'info');}
  if (action === 'rollback') {const option = ROLLBACK_OPTIONS.find(([id]) => id === value); if (!option) return result(state, 'Choose a listed rollback plan.', 'warning'); state.rollback = value; return result(state, 'Rollback decision recorded. ' + option[2], 'info');}
  const item = plain(value) ? station(value.station) : null;
  if (!item) return result(state, 'Choose a listed station.', 'warning');
  const own = state.stations[item.id], name = item.control.name;
  if (action === 'set') {
    if (!item.control.options.some(([option]) => option === value.value)) return result(state, 'Choose a listed setting.', 'warning');
    if (own.config[name] === value.value) return result(state, 'That is already the setting.', 'info', {viewOnly:true});
    own.config[name] = value.value;
    return result(state, own.runs.length ? item.title + ': setup changed. The last reading is from the old setup; run a fresh test.' : item.title + ': setup changed. Run the test to see what it does.', 'info');
  }
  if (action === 'run') {
    own.runs = [...own.runs, {n:own.runs.length + 1, [name]:own.config[name]}].slice(-20).map((run, index) => ({...run, n:index + 1}));
    const view = stationView(item, state);
    return result(state, item.title + ': ' + view.reading.rows.map(entry => entry.label + ': ' + entry.value).join('. ') + '. ' + view.reading.note, view.reading.ok ? 'success' : 'warning');
  }
  if (action === 'decide') {
    if (!DECISIONS.some(decision => decision.id === value.decision)) return result(state, 'Choose open, hold or revise.', 'warning');
    own.decision = value.decision;
    const view = stationView(item, state);
    return result(state, item.title + ': ' + (view.consistent ? 'decision recorded: ' + value.decision + '. It agrees with the current reading.' : !view.current ? 'decision recorded, but there is no current reading. Run a fresh test first.' : view.reading.ok ? 'the current reading meets the target, so this station can open.' : 'the current reading misses the target, so open does not fit.'), view.consistent ? 'success' : 'warning');
  }
  return result(state, 'Choose a displayed control.', 'info', {viewOnly:true});
}

export function capstoneCompletion(saved, handoff) {
  const view = capstoneView(saved), blockers = [];
  if (!view.state.band) blockers.push('choose your crew’s grade band');
  for (const id of view.owned) {const item = view.stations.find(entry => entry.id === id); if (!item.current) blockers.push(item.title + ': ' + (item.stale ? 'run a fresh test, the setup changed' : 'run a new test')); else if (!item.consistent) blockers.push(item.title + ': ' + (item.decision ? 'make the decision agree with the current reading' : 'choose open, hold or revise'));}
  if (view.coordinator && !view.state.rollback) blockers.push('give a rollback decision');
  if (typeof handoff !== 'string' || handoff.trim().length < HANDOFF_MINIMUM) blockers.push('write the opening-day handoff');
  return {ready:blockers.length === 0, blockers};
}

export function normalizeCapstoneRecord(value) {
  const r = plain(value) ? value : {}, text = (item, max) => typeof item === 'string' ? item.slice(0, max) : '';
  const state = normalizeCapstoneState(r.state), notes = text(r.notes, 2000), view = capstoneView(state);
  return {state, evidence:[], questions:[], events:Array.isArray(r.events) ? r.events.slice(-200).filter(event => event && typeof event === 'object' && typeof event.message === 'string').map(event => ({time:text(event.time, 40), message:text(event.message, 600), kind:['info', 'warning', 'success'].includes(event.kind) ? event.kind : 'info'})) : [],
    symptoms:'', notes, plan:'', reflection:'', ideaSaved:false, verified:view.owned.length > 0 && view.owned.every(id => view.stations.find(item => item.id === id).consistent), closed:r.closed === true && capstoneCompletion(state, notes).ready, manual:[]};
}

const STATUS_TEXT = Object.freeze({rehearsal:'Rehearsal condition: no new test yet', stale:'Setup changed: the reading is out of date', ready:'Current reading meets the target: awaiting a decision', missed:'Current reading misses the target: awaiting a decision', open:'OPEN', hold:'ON HOLD', revise:'REVISE'});
export const capstoneStatusText = status => STATUS_TEXT[status] || '';
export function capstoneReport(record) {
  const view = capstoneView(record?.state), band = FAIR_BANDS.find(item => item.id === view.state.band);
  const lines = ['COLE LEARNING LABS — CAPSTONE REPORT', FAIR_CAPSTONE.id + ' · ' + FAIR_CAPSTONE.title, 'Networking pathway · The school tech fair', 'Crew: ' + (band ? 'Grades ' + band.grade + ' · owns ' + band.owns.toLowerCase() : 'not chosen'), 'Status: ' + (record?.closed ? 'HANDED OFF' : 'IN PROGRESS'), ''];
  for (const item of view.stations) {
    lines.push(item.title.toUpperCase() + (view.owned.includes(item.id) ? ' · YOUR CREW' : ''), 'Target: ' + item.target, item.rehearsal, 'Setup: ' + (item.control.options.find(([value]) => value === item.config[item.control.name])?.[1] || ''));
    lines.push(item.reading ? (item.stale ? 'Last reading (out of date):' : 'Current reading:') + '\n' + item.reading.rows.map(entry => '  ' + entry.label + ': ' + entry.value + (entry.ok ? ' (meets target)' : ' (misses target)')).join('\n') : 'No new test run.');
    lines.push('Decision: ' + (item.decision ? item.decision.toUpperCase() + (item.consistent ? ' (agrees with the current reading)' : ' (does not agree with a current reading)') : 'not decided'), 'Station: ' + capstoneStatusText(item.status), '');
  }
  if (view.coordinator) lines.push('ROLLBACK DECISION', ROLLBACK_OPTIONS.find(([value]) => value === view.state.rollback)?.[1] || 'Not decided.', '');
  lines.push('HANDOFF', record?.notes?.trim() || 'Not written.', '', 'Stations open: ' + view.open + ' of 4. Stations held or sent back for revision: ' + view.held + '.', '', 'This is a simulated learning activity on fictional equipment. Nothing was sent to a real network.', '');
  return lines.join('\n');
}
