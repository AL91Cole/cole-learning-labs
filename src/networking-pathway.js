// The Networking pathway hub (#networking, also served at /networking).
// Public catalogue metadata only: band choice, mission cards, assignment links and the
// collections around the fair. Mission models download with the mission itself.
import {FAIR_BANDS, FAIR_CAPSTONE, FAIR_CATALOG, FAIR_FOLLOW_UPS, FREE_FAIR_IDS, SYSTEMS_SUPPORT, fairBand, fairBandMissions} from './fair-catalog.js?release=20261107-tech-team';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const DEFAULT_FAIR_BAND = '7-8';
export const fairBandFrom = value => fairBand(value)?.id || DEFAULT_FAIR_BAND;
/** A station’s line on the fair board, read from the mission’s own saved record. */
export function fairStationStatus(record) {
  if (!record || typeof record !== 'object') return {id:'ready', mark:'○', text:'Ready to start'};
  const decision = record.state?.decision;
  if (record.closed === true) return decision === 'open' ? {id:'online', mark:'●', text:'Station online · handed off'} : {id:'held', mark:'■', text:'Handed off · ' + (decision === 'revise' ? 'sent back to revise' : 'on hold')};
  return Array.isArray(record.state?.runs) && record.state.runs.length ? {id:'progress', mark:'◔', text:'In progress'} : {id:'ready', mark:'○', text:'Ready to start'};
}
/** The band’s first mission that has not been handed off, so Start continues where a crew left off. */
export function fairStartMission(band, labs = {}) {
  const missions = fairBandMissions(fairBandFrom(band));
  return missions.find(item => labs[item.id]?.closed !== true) || missions[0];
}
const assignment = (origin, slug) => (origin || '') + '/networking/' + slug;

export function renderNetworkingPathway({band, labs = {}, open = true, student = false, origin = ''} = {}) {
  const selected = fairBand(fairBandFrom(band)), missions = fairBandMissions(selected.id), playable = item => open || FREE_FAIR_IDS.includes(item.id);
  // In the restricted preview the start button goes to the free sample mission, whichever band is selected.
  const start = open ? fairStartMission(selected.id, labs) : FAIR_CATALOG.find(playable), started = !!labs[start.id];
  const done = missions.filter(item => labs[item.id]?.closed === true).length;
  const card = item => {
    const status = fairStationStatus(labs[item.id]), follow = FAIR_FOLLOW_UPS[item.id] || [];
    return '<li class="fair-card" data-mission="' + item.id + '" data-status="' + status.id + '"><p class="eyebrow">Mission ' + item.order + ' · ' + item.id + (item.legacy ? ' · grew from ' + item.legacy : ' · new') + '</p><h3><a href="#lab/' + item.id + '/request">' + esc(item.title) + '</a></h3><dl class="fair-card-facts"><div><dt>Your crew’s job</dt><dd>' + esc(item.crew) + '</dd></div><div><dt>One skill</dt><dd>' + esc(item.skill) + '</dd></div><div><dt>Time</dt><dd>About ' + item.minutes + ' minutes</dd></div></dl><p class="fair-card-status"><span aria-hidden="true">' + status.mark + '</span> ' + (playable(item) ? esc(status.text) + (open ? '' : ' · free sample') : 'Membership required') + '</p><a class="button button-small" href="#lab/' + item.id + '/request">' + (status.id === 'progress' ? 'Continue mission' : status.id === 'ready' ? 'Open mission' : 'Review mission') + ' <span aria-hidden="true">→</span></a>' +
      (follow.length ? '<p class="fair-card-after">Afterwards: ' + follow.map(([href, label]) => '<a class="text-link" href="' + esc(href) + '">' + esc(label) + '</a>').join(' · ') + '</p>' : '') +
      (student ? '' : '<details class="fair-assign"><summary>Teacher: assignment link</summary><label>Link to this mission<input type="text" readonly value="' + esc(assignment(origin, item.slug)) + '" data-fair-link></label><button type="button" class="lab-tool" data-fair-copy>Copy link</button><p class="panel-help">Opens this mission directly. For a shared cart, where nothing may be saved on the device, use: <code>' + esc((origin || '') + '/networking?cart=true#lab/' + item.id) + '</code></p></details>') + '</li>';
  };
  const capstone = labs[FAIR_CAPSTONE.id];
  return '<section class="lab-library-intro fair-hub-intro"><div class="wrap"><p class="eyebrow">Networking pathway · Grades 7–12</p><h1>Run the school <em>tech fair.</em></h1><p>Your crew runs part of a school tech fair. Make a decision, see what happens, and use the evidence to explain it. Each mission has three steps: get the brief, try it, prove it.</p>' +
    '<div class="fair-band-picker" role="group" aria-label="Choose a grade band">' + FAIR_BANDS.map(item => '<a class="fair-band' + (item.id === selected.id ? ' is-selected' : '') + '" href="#networking?band=' + item.id + '"' + (item.id === selected.id ? ' aria-current="true"' : '') + ' data-fair-band="' + item.id + '"><span class="eyebrow">Grades ' + item.grade + '</span><strong>' + esc(item.title) + '</strong><span>' + esc(item.summary) + '</span></a>').join('') + '</div>' +
    '<div class="button-row"><a class="button" id="fair-start" href="#lab/' + start.id + '/request">' + (started ? 'Continue: ' : open ? 'Start my first mission: ' : 'Try the free mission: ') + esc(start.title) + ' <span aria-hidden="true">→</span></a><a class="button button-outline" href="#learn/NET-200">Meet the network · 12 minutes <span aria-hidden="true">→</span></a></div>' +
    '<p class="panel-help">' + (open ? 'No account is needed. Work stays on this page unless you turn on device saving or export a report.' : 'The frozen robot cam is free to play. The other missions and the capstone need membership in this preview.') + '</p></div></section>' +
    '<section class="wrap fair-hub-section" aria-labelledby="fair-band-title"><h2 id="fair-band-title">Grades ' + selected.grade + ' · ' + esc(selected.title) + '</h2><p>Four 40-minute missions and a 40-minute capstone. ' + done + ' of ' + missions.length + ' missions handed off on this page.</p><ol class="fair-cards">' + missions.map(card).join('') +
    '<li class="fair-card fair-card-capstone" data-mission="' + FAIR_CAPSTONE.id + '"><p class="eyebrow">Capstone · ' + FAIR_CAPSTONE.id + ' · all crews</p><h3><a href="#networking/opening-day?band=' + selected.id + '">' + esc(FAIR_CAPSTONE.title) + '</a></h3><dl class="fair-card-facts"><div><dt>Your crew’s job</dt><dd>' + esc(selected.owns) + '. ' + esc(FAIR_CAPSTONE.crew) + '</dd></div><div><dt>One skill</dt><dd>' + esc(FAIR_CAPSTONE.skill) + '</dd></div><div><dt>Time</dt><dd>About ' + FAIR_CAPSTONE.minutes + ' minutes</dd></div></dl><p class="fair-card-status"><span aria-hidden="true">' + (capstone?.closed ? '●' : '○') + '</span> ' + (open ? (capstone?.closed ? 'Handed off' : capstone ? 'In progress' : 'Ready when your missions are') : 'Membership required') + '</p><a class="button button-small" href="#networking/opening-day?band=' + selected.id + '">Open the capstone <span aria-hidden="true">→</span></a>' + (student ? '' : '<details class="fair-assign"><summary>Teacher: assignment link</summary><label>Link to the capstone<input type="text" readonly value="' + esc(assignment(origin, FAIR_CAPSTONE.slug)) + '" data-fair-link></label><button type="button" class="lab-tool" data-fair-copy>Copy link</button></details>') + '</li></ol></section>' +
    '<section class="wrap fair-hub-section fair-hub-more" aria-labelledby="fair-more-title"><h2 id="fair-more-title">Around the fair</h2><div class="fair-more-grid">' +
    '<article><h3>Practice games</h3><p>Short games that reinforce one idea each. A game is practice: replaying one never completes a mission.</p><ul><li><a class="text-link" href="#arcade/gateway-garden">Gateway Garden</a></li><li><a class="text-link" href="#arcade/hop-count-hike">Hop Count Hike</a></li><li><a class="text-link" href="#arcade/vlan-village">VLAN Village</a></li><li><a class="text-link" href="#arcade/resilient-ring">Resilient Ring</a></li></ul></article>' +
    '<article><h3>Build and tinker</h3><ul><li><a class="text-link" href="#networking/trace">Trace a packet, hop by hop</a> <span class="panel-help">free practice tool</span></li><li><a class="text-link" href="#practice/NET-201">Networking practice workbench</a></li><li><a class="text-link" href="#studio/network">Network Studio</a></li><li><a class="text-link" href="#lab/NET-207">NET-207 · Follow a Classroom Message</a> <span class="panel-help">after the photo</span></li><li><a class="text-link" href="#lab/NET-212">NET-212 · Find the Broken WAN Path</a> <span class="panel-help">after the alert</span></li></ul></article>' +
    '<article id="systems-support"><h3>Systems Support collection</h3><p>Sharing, startup, printing and backups: support work that sits beside the network.</p><ul>' + SYSTEMS_SUPPORT.map(([id, title]) => '<li><a class="text-link" href="#lab/' + id + '">' + id + ' · ' + esc(title) + '</a></li>').join('') + '</ul></article>' +
    '<article><h3>Younger crew?</h3><p>Packet Post is the on-ramp for grades 4–6: turn the paths and deliver one packet.</p><ul><li><a class="text-link" href="#arcade/packet-post">Play Packet Post</a></li>' + (student ? '' : '<li><a class="text-link" href="lessons/packet-post.html">Packet Post lesson</a></li>') + '</ul></article>' +
    '<article><h3>Original investigations</h3><p>Every original networking investigation keeps its own address, saved work and report. A fair mission and the investigation it grew from are separate assignments.</p><ul><li><a class="text-link" href="#labs/network">Networking investigations in the lab library</a></li></ul></article>' +
    (student ? '' : '<article><h3>For teachers</h3><ul><li><a class="text-link" href="lessons/networking-fair.html">Pacing, pair roles and debrief</a></li>' + (open ? '<li><a class="text-link" href="networking-handout.html">Student handout, word guide and evidence cards</a></li>' : '') + '</ul></article>') +
    '</div></section>';
}

/** Copy buttons for the assignment links. Selecting the field is the fallback when copying is blocked. */
export function mountNetworkingPathway(root, {notify = () => {}} = {}) {
  const controller = new AbortController();
  root.addEventListener('click', event => {
    const button = event.target.closest?.('[data-fair-copy]'); if (!button) return;
    const field = button.closest('.fair-assign')?.querySelector('[data-fair-link]'); if (!field) return;
    field.focus(); field.select?.();
    const done = () => notify('Assignment link copied.'), manual = () => notify('Copying is blocked here. The link is selected: press Ctrl+C.');
    try {const copied = globalThis.navigator?.clipboard?.writeText?.(field.value); if (copied?.then) copied.then(done, manual); else manual();} catch {manual();}
  }, {signal:controller.signal});
  return () => controller.abort();
}
