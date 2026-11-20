// The school tech fair: twelve playable networking missions for grades 7–12.
// Every model here is local and fictional. A "test" reads a fixed table or a small rule;
// nothing is sent to a network, and no equipment is configured.
//
// A mission has three playable steps:
//   Get the brief  – who needs help, what can be observed, a measurable target, a prediction.
//   Try it         – a worked example, then the learner changes one thing and runs a test.
//   Prove it       – one condition changes; the learner retests, selects evidence and tells
//                    the next crew whether to open, hold or revise.
// Results are never stored: a run keeps only the test, the condition and the setup it used,
// and its reading is recomputed from the model. A reading is current only while the setup
// still matches, so editing a tested setup makes the old result stale.
import {FAIR_CATALOG, fairBand} from './fair-catalog.js?release=20261107-tech-team';

const key = id => typeof id === 'string' ? id.toUpperCase() : '';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const control = (name, label, options, initial, help = '') => ({name, label, options, initial, help});
const test = (id, label, help = '') => ({id, label, help});
/** A reading row. `ok` is true or false for a row that counts toward the target and null for a comparison row. */
const row = (id, label, value, ok = null, target = '') => ({id, label, value, ok, target});
const count = (id, label, got, need = 9) => row(id, label, got + ' of 10', got >= need, 'at least ' + need + ' of 10');
export const DECISIONS = Object.freeze([
  Object.freeze({id:'open', label:'Open', help:'The current evidence meets the target. The next crew can go live.'}),
  Object.freeze({id:'hold', label:'Hold', help:'The current evidence misses the target. Keep the station closed for now.'}),
  Object.freeze({id:'revise', label:'Revise', help:'The plan needs a change before another test. Say what to change.'})
]);
export const RUN_LIMIT = 40;

const LAPS = Object.freeze({
  base:Object.freeze({cabinet:[10, 4, 9], a:[10, 6, 8], b:[9, 10, 9], c:[6, 7, 10]}),
  // After the curtain drops. Center rail and press table are the reviewed acceptance readings;
  // the other spots follow the same pattern (the curtain costs packets at the blue line).
  replay:Object.freeze({cabinet:[10, 3, 9], a:[10, 4, 8], b:[9, 7, 9], c:[6, 5, 10], d:[9, 9, 10]})
});
const LAP_STOPS = Object.freeze(['Pit', 'Blue line', 'Finish']);
function lapClue(values) {
  const low = Math.min(...values), high = Math.max(...values), worst = LAP_STOPS[values.indexOf(low)], best = LAP_STOPS[values.indexOf(high)];
  if (low >= 9) return 'Every checkpoint got at least 9 of 10. Which counter was the closest call?';
  return ({10:'Ten', 9:'Nine', 8:'Eight', 7:'Seven', 6:'Six'}[high] || high) + ' packets reached the ' + best.toLowerCase() + '. What happened at the ' + worst.toLowerCase() + '?';
}

const SUBNETS = Object.freeze({'/27':{first:64, last:95, usable:30}, '/26':{first:64, last:127, usable:62}});

const MISSIONS = Object.freeze({
  'FAIR-208':{
    person:'Two sticker artists, Ana and Ben',
    brief:'Ana and Ben each brought a laptop to the sticker booth. Ana plugged her laptop into Ben’s, so every time Ben unplugs to help a visitor, Ana’s stickers stop printing.',
    observe:'The booth has one small switch with free ports, a sticker printer on that switch, and one cable (the uplink) from the switch to the rest of the fair.',
    success:'Both laptops print a test sticker. When one laptop is unplugged, the other still prints.',
    terms:[{term:'Switch', plain:'A box with several ports. Each device gets its own cable to it.', when:'brief'}, {term:'Uplink', plain:'The one cable that joins the booth’s switch to the rest of the fair.', when:'replay'}],
    predict:{prompt:'If Ben unplugs his laptop right now, what happens to Ana’s stickers?', options:[['stops', 'Ana’s stickers stop too'], ['keeps', 'Ana keeps printing'], ['slower', 'Ana prints, but slower']]},
    controls:[control('cableA', 'Ana’s laptop cable goes to', [['via-b', 'Ben’s laptop (shares Ben’s cable)'], ['port1', 'Switch port 1 (its own cable)'], ['none', 'Nothing (unplugged)']], 'via-b'), control('cableB', 'Ben’s laptop cable goes to', [['port2', 'Switch port 2 (its own cable)'], ['none', 'Nothing (unplugged)']], 'port2')],
    tests:[test('booth', 'Print a test sticker from each laptop'), test('uplink', 'Unplug the shared uplink, then check again', 'Compares the booth’s own printer with a service beyond the booth.')],
    required:{base:['booth'], replay:['booth', 'uplink']},
    replay:{action:'Ben packs up', text:'Ben unplugs his laptop and leaves for lunch.'},
    worked:'Trace one cable at a time. Ana’s cable ends at Ben’s laptop, so her stickers travel through Ben’s laptop before they reach the switch. Print a test sticker from each laptop and read both rows before changing anything.',
    starter:'With Ben unplugged, Ana’s test sticker ___ because her cable goes to ___.',
    model(config, condition, id) {
      const benLinked = condition !== 'replay' && config.cableB === 'port2';
      const anaLinked = config.cableA === 'port1' || (config.cableA === 'via-b' && benLinked);
      const said = (linked, shared) => linked ? 'printed' : shared ? 'did not print (the laptop it shares with is unplugged)' : 'did not print (no cable to the switch)';
      if (id === 'uplink') return {rows:[row('ana-printer', 'Ana → booth printer, uplink unplugged', said(anaLinked, config.cableA === 'via-b'), anaLinked, 'printed'), row('gallery', 'Booth → fair photo gallery, uplink unplugged', 'no path: the uplink is the only way out of the booth')],
        note:anaLinked ? 'The booth printer is on the booth’s own switch, so it still works. The gallery is beyond the booth, and everyone shares the one uplink to reach it.' : 'Ana’s laptop has no working path to the switch, so this comparison cannot show the uplink yet. Fix her cable first.'};
      const rows = [row('ana-printer', 'Ana → booth printer', said(anaLinked, config.cableA === 'via-b'), anaLinked, 'printed')];
      rows.push(condition === 'replay' ? row('ben-printer', 'Ben → booth printer', 'unplugged (Ben packed up)') : row('ben-printer', 'Ben → booth printer', said(benLinked, false), benLinked, 'printed'));
      rows.push(row('gallery', 'Ana → fair photo gallery (beyond the booth)', anaLinked ? 'reached through the shared uplink' : 'not reached', condition === 'replay' ? null : anaLinked, 'reached'));
      return {rows, note:anaLinked ? (config.cableA === 'via-b' ? 'Both print for now, but Ana’s stickers pass through Ben’s laptop. What happens when Ben unplugs?' : 'Each laptop has its own cable to the switch.') : config.cableA === 'via-b' ? 'Ana’s cable ends at Ben’s laptop, and Ben’s laptop is not connected. Where could her cable go instead?' : 'Ana’s laptop has no cable to the switch. Choose a port for it.'};
    },
    scene(config, condition) {return {nodes:[['ana', 'Ana’s laptop', 70, 60], ['ben', 'Ben’s laptop', 70, 190, condition === 'replay' ? 'off' : ''], ['switch', 'Booth switch', 300, 125], ['printer', 'Sticker printer', 300, 230], ['fair', 'Rest of the fair', 520, 125]], links:[...(config.cableA === 'port1' ? [['ana', 'switch', 'port 1']] : config.cableA === 'via-b' ? [['ana', 'ben', 'shared']] : []), ...(config.cableB === 'port2' && condition !== 'replay' ? [['ben', 'switch', 'port 2']] : []), ['switch', 'printer', ''], ['switch', 'fair', 'uplink']]};}
  },
  'FAIR-215':{
    person:'Priya, who runs the photo wall',
    brief:'The winning photo left the camera laptop and showed up on the photo wall. Priya wants to know how it got there, because the wall’s server is not on the booth’s network.',
    observe:'Two frame snapshots of the same photo: one taken before the gateway and one after it. No address translation happens on this hop.',
    success:'Your three marks match both snapshots: the local next hop, what changed at the hop, and what stayed the same.',
    terms:[{term:'Frame', plain:'The wrapper used on one local link. It carries a source and a destination hardware (MAC) address.', when:'brief'}, {term:'Gateway', plain:'The device on your network that passes traffic on to other networks.', when:'brief'}, {term:'Hop', plain:'One step from one device to the next on the way.', when:'run'}],
    predict:{prompt:'The photo is going to a server on another network. Whose hardware address is on the frame as it leaves the laptop?', options:[['server', 'The photo wall server’s'], ['gateway', 'The gateway’s'], ['switch', 'The booth switch’s']]},
    controls:[control('nextHop', 'Local next hop for the laptop', [['server', 'The photo wall server'], ['gateway', 'The gateway'], ['switch', 'The booth switch']], 'server'), control('changed', 'What changed between the two snapshots', [['ip', 'The IP addresses'], ['frame', 'The frame (MAC) addresses'], ['both', 'Both kinds of address'], ['none', 'Nothing']], 'ip'), control('stable', 'What stayed the same', [['dst-mac', 'The destination frame address'], ['dst-ip', 'The destination IP address'], ['src-mac', 'The source frame address']], 'dst-mac')],
    tests:[test('check', 'Check my marks against both snapshots')],
    required:{base:['check'], replay:['check']},
    replay:{action:'Send the runner-up photo', text:'The runner-up photo goes to the backup wall at a different IP address. New snapshots arrive.'},
    worked:'Read snapshot 1 left to right. Find the frame’s destination address, then look it up in the address list to see which device owns it. Do the same for snapshot 2, and put the two rows side by side.',
    starter:'The frame addresses changed from ___ to ___, but the destination IP stayed ___.',
    supplied(condition) {
      const server = condition === 'replay' ? ['198.51.100.77', '02:00:00:00:02:77', 'Backup wall server'] : ['198.51.100.20', '02:00:00:00:02:20', 'Photo wall server'];
      return [{caption:'Frame snapshots of the same photo', headers:['Snapshot', 'Frame source', 'Frame destination', 'IP source', 'IP destination'], rows:[['1 · before the gateway', '02:00:00:00:01:24', '02:00:00:00:01:01', '192.0.2.24', server[0]], ['2 · after the gateway', '02:00:00:00:02:01', server[1], '192.0.2.24', server[0]]]},
        {caption:'Address list', headers:['Device', 'Hardware (MAC) address', 'IP address'], rows:[['Camera laptop', '02:00:00:00:01:24', '192.0.2.24'], ['Gateway, booth side', '02:00:00:00:01:01', '192.0.2.1'], ['Gateway, far side', '02:00:00:00:02:01', '198.51.100.1'], [server[2], server[1], server[0]]]}];
    },
    model(config) {
      const rows = [row('nextHop', 'Local next hop', {server:'the photo wall server', gateway:'the gateway', switch:'the booth switch'}[config.nextHop], config.nextHop === 'gateway', 'matches snapshot 1'), row('changed', 'What changed at the hop', {ip:'the IP addresses', frame:'the frame addresses', both:'both', none:'nothing'}[config.changed], config.changed === 'frame', 'matches both snapshots'), row('stable', 'What stayed the same', {'dst-mac':'the destination frame address', 'dst-ip':'the destination IP address', 'src-mac':'the source frame address'}[config.stable], config.stable === 'dst-ip', 'matches both snapshots')];
      const note = config.nextHop !== 'gateway' ? 'Snapshot 1’s frame is addressed to 02:00:00:00:01:01. Find that address in the address list. Whose is it?' : config.changed !== 'frame' ? 'Compare the two IP columns, then the two frame columns. Which pair is different in snapshot 2?' : config.stable !== 'dst-ip' ? 'Look for a column that reads the same in both snapshots.' : 'All three marks match. The frame is rewritten for each link; the IP addresses name the two ends.';
      return {rows, note};
    },
    scene(config, condition) {return {nodes:[['laptop', 'Camera laptop', 70, 125], ['gateway', 'Gateway', 300, 125], ['wall', condition === 'replay' ? 'Backup wall' : 'Photo wall', 520, 125]], links:[['laptop', 'gateway', 'snapshot 1'], ['gateway', 'wall', 'snapshot 2']]};}
  },
  'FAIR-204':{
    person:'Marcus, the robot team’s driver',
    brief:'Marcus’s robot keeps moving, but its camera feed freezes every lap at the gym’s blue line. The access point that carries the feed is sitting behind a metal cabinet.',
    observe:'Each lap, the camera sends ten packets at three checkpoints: the pit, the blue line and the finish. A counter at each checkpoint shows how many arrived.',
    success:'At least 9 of 10 packets arrive at every checkpoint: pit, blue line and finish.',
    terms:[{term:'Packet', plain:'A small piece of the video. The camera sends ten at each checkpoint.', when:'brief'}, {term:'Access point', plain:'The radio box the camera talks to. Where it sits changes what it can hear.', when:'brief'}, {term:'Packet loss', plain:'Packets that never arrive. If 4 of 10 reach the blue line, 6 were lost there.', when:'run'}],
    predict:{prompt:'Which spot do you predict gets at least 9 of 10 packets to every checkpoint?', options:[['a', 'A · Pit wall'], ['b', 'B · Center rail'], ['c', 'C · Finish wall'], ['none', 'No spot will do it']]},
    controls:[control('location', 'Access point location', [['cabinet', 'Behind the cabinet (where it is now)'], ['a', 'A · Pit wall'], ['b', 'B · Center rail'], ['c', 'C · Finish wall'], ['d', 'D · Press table', 'replay']], 'cabinet', 'The press table is set up when the curtain drops.')],
    tests:[test('lap', 'Run a lap')],
    required:{base:['lap'], replay:['lap']},
    baseline:{test:'lap', config:{location:'cabinet'}, label:'Behind the cabinet'},
    replay:{action:'Lower the curtain', text:'The stage crew lowers the heavy curtain beside the blue line for the afternoon show. The press table is now set up.'},
    worked:'Start with the baseline: behind the cabinet, the counters read 10, 4 and 9. The pit and the finish are fine, so the trouble is at the blue line. Pick one new spot, run one lap, and read all three counters, not just the blue line.',
    starter:'At the blue line, ___ of ten arrived before and ___ arrived after.',
    model(config, condition) {
      const values = (condition === 'replay' ? LAPS.replay : LAPS.base)[config.location];
      if (!values) return {rows:LAP_STOPS.map((stop, index) => row('stop' + index, stop, 'no reading', false, 'at least 9 of 10')), note:'The press table is not set up yet. Choose another spot.'};
      return {rows:values.map((got, index) => count('stop' + index, LAP_STOPS[index], got)), note:lapClue(values)};
    },
    scene(config, condition) {const spots = {cabinet:[90, 40], a:[90, 215], b:[300, 215], c:[510, 215], d:[490, 40]}, at = spots[config.location] || spots.cabinet; return {nodes:[['pit', 'Pit', 90, 125], ['blue', 'Blue line', 300, 125], ['finish', 'Finish', 510, 125], ['ap', 'Access point: ' + ({cabinet:'cabinet', a:'pit wall', b:'center rail', c:'finish wall', d:'press table'}[config.location] || 'cabinet'), at[0], at[1], 'on'], ...(condition === 'replay' ? [['curtain', 'Curtain (down)', 290, 40, 'warn']] : [])], links:[['pit', 'blue', 'track'], ['blue', 'finish', 'track']]};}
  },
  'FAIR-217':{
    person:'Jo, the pit crew lead',
    brief:'Jo needs to send tonight’s lineup from one practice tablet to a teammate’s tablet in the pit. The two tablets can link straight to each other, or both can join the fair’s access point.',
    observe:'Each tablet has two modes: direct-only (tablet to tablet) and fair access-point mode. The scoreboard is on the fair network, not in the pit.',
    success:'The lineup reaches the teammate. When the scoreboard crew asks for it too, the lineup reaches both.',
    terms:[{term:'Direct link', plain:'Two devices talking straight to each other, with nothing in between.', when:'brief'}, {term:'Route', plain:'A known way to reach somewhere. With no route, the message has nowhere to go.', when:'run'}],
    predict:{prompt:'In direct-only mode, where can the lineup go?', options:[['teammate', 'Only to the teammate’s tablet'], ['both', 'To the teammate and the scoreboard'], ['neither', 'Nowhere']]},
    controls:[control('mode', 'Tablet mode', [['direct', 'Direct-only (tablet to tablet)'], ['ap', 'Fair access-point mode']], 'direct')],
    tests:[test('teammate', 'Send the lineup to the teammate’s tablet'), test('scoreboard', 'Send the lineup to the scoreboard')],
    required:{base:['teammate'], replay:['teammate', 'scoreboard']},
    demos:[{id:'direct-teammate', label:'Direct-only → teammate', match:run => run.config.mode === 'direct' && run.test === 'teammate'}, {id:'direct-scoreboard', label:'Direct-only → scoreboard', match:run => run.config.mode === 'direct' && run.test === 'scoreboard'}, {id:'ap-teammate', label:'Access-point mode → teammate', match:run => run.config.mode === 'ap' && run.test === 'teammate'}, {id:'ap-scoreboard', label:'Access-point mode → scoreboard', match:run => run.config.mode === 'ap' && run.test === 'scoreboard'}],
    replay:{action:'The scoreboard crew asks for the lineup', text:'The scoreboard crew wants the lineup on the big screen as well. It now has to reach two places.'},
    worked:'A test has two parts: where it starts and where it should end up. Send the lineup to the teammate first and read the result. Then send it to the scoreboard in the same mode. You are comparing destinations, so change only the destination.',
    starter:'In direct-only mode the lineup reached ___ but not ___, because ___.',
    model(config, condition, id) {
      if (id === 'teammate') return {rows:[row('teammate', 'Lineup → teammate’s tablet', config.mode === 'direct' ? 'received straight from the other tablet' : 'received through the fair access point', true, 'received')], note:config.mode === 'direct' ? 'The two tablets talk to each other with nothing in between.' : 'Both tablets joined the fair access point, and it passed the lineup along.'};
      const reached = config.mode === 'ap';
      return {rows:[row('scoreboard', 'Lineup → scoreboard', reached ? 'received through the fair access point' : 'no route: the scoreboard is not on the direct link', reached, 'received')], note:reached ? 'The access point connects the pit to the fair network, where the scoreboard lives.' : 'The direct link has only two ends, and the scoreboard is not one of them. What would give the tablet a way onto the fair network?'};
    },
    scene(config) {return {nodes:[['jo', 'Jo’s tablet', 70, 190], ['mate', 'Teammate’s tablet', 300, 190], ['ap', 'Fair access point', 185, 60, config.mode === 'ap' ? 'on' : 'off'], ['board', 'Scoreboard', 520, 60]], links:config.mode === 'ap' ? [['jo', 'ap', 'joined'], ['mate', 'ap', 'joined'], ['ap', 'board', 'fair network']] : [['jo', 'mate', 'direct link'], ['ap', 'board', 'fair network']]};}
  },
  'FAIR-201':{
    person:'Devi, who looks after the score kiosks',
    brief:'Kiosk 1 shows “scores.fair.example cannot be found”. Kiosk 2, right next to it, shows the scoreboard. Devi can reach the scoreboard server from kiosk 1 by typing its address.',
    observe:'Both kiosks’ settings, a name lookup, a reach-by-address test and the scoreboard page itself. Each is a separate check.',
    success:'Kiosk 1 looks up scores.fair.example and gets an answer, and the scoreboard page opens.',
    terms:[{term:'Name lookup (DNS)', plain:'Asking a name server which address belongs to a name such as scores.fair.example.', when:'brief'}, {term:'Service', plain:'The program on the server that answers, here the scoreboard page.', when:'run'}],
    predict:{prompt:'Kiosk 1 reaches the server by address but not by name. What do you predict is wrong?', options:[['server', 'The scoreboard server is off'], ['dns', 'Kiosk 1 is asking the wrong name server'], ['cable', 'Kiosk 1’s cable is unplugged']]},
    controls:[control('dns', 'Kiosk 1 name server (DNS) setting', [['10.20.0.99', '10.20.0.99 (kiosk 1’s current setting)'], ['10.20.0.53', '10.20.0.53 (same as kiosk 2)'], ['none', 'No name server']], '10.20.0.99'), control('bookmark', 'Kiosk 1 opens the scoreboard by', [['name', 'Name: scores.fair.example'], ['address', 'Address: 10.20.0.30']], 'name')],
    tests:[test('address', 'Reach the server by address'), test('lookup', 'Look up scores.fair.example'), test('service', 'Open the scoreboard page', 'Checks the scoreboard service separately from the lookup.')],
    required:{base:['lookup', 'service'], replay:['lookup', 'service']},
    replay:{action:'Move the scoreboard to the new server', text:'The score crew moves the scoreboard to a new server at 10.20.0.31 and updates the name record. The old server at 10.20.0.30 is switched off.'},
    worked:'Line up the two kiosks. Their addresses differ by one, which is normal. Now compare the name server line. Then run one test at a time: reaching by address, looking up the name, and opening the page each answer a different question.',
    starter:'The lookup ___ when the name server was ___, and the scoreboard page ___.',
    supplied(condition, config) {
      return [{caption:'Kiosk settings, side by side', headers:['Setting', 'Kiosk 1', 'Kiosk 2 (working)'], rows:[['IP address', '10.20.0.41', '10.20.0.42'], ['Name server (DNS)', config.dns === 'none' ? 'none' : config.dns, '10.20.0.53'], ['Opens the scoreboard by', config.bookmark === 'name' ? 'scores.fair.example' : '10.20.0.30', 'scores.fair.example']]},
        {caption:'Which job happens where (scoreboard example)', headers:['Job on the scoreboard request', 'TCP/IP layer', 'OSI layers'], rows:[['Ask for the scoreboard page; look up its name', 'Application', '5–7'], ['Keep the page’s data complete and in order (TCP)', 'Transport', '4'], ['Get from the kiosk’s address to the server’s address (IP)', 'Internet', '3'], ['Carry the frame over the kiosk’s cable to the switch', 'Link', '1–2']]}];
    },
    model(config, condition, id) {
      const server = condition === 'replay' ? '10.20.0.31' : '10.20.0.30', resolved = config.dns === '10.20.0.53';
      if (id === 'address') {const up = condition !== 'replay'; return {rows:[row('address', 'Reach 10.20.0.30 by address', up ? 'reply from 10.20.0.30' : 'no reply: the old server is switched off', null)], note:up ? 'The server answers by address, so the cable and the server are fine. A name still has to be turned into that address.' : 'An address written down yesterday can go out of date. What still points at the right server?'};}
      if (id === 'lookup') return {rows:[row('lookup', 'Look up scores.fair.example', resolved ? 'scores.fair.example → ' + server : config.dns === 'none' ? 'no name server is set, so nothing was asked' : 'no answer from 10.20.0.99', resolved, 'an address comes back')], note:resolved ? 'The name server answered. The lookup works; the page is a separate check.' : 'Compare kiosk 1’s name server line with kiosk 2’s.'};
      const opens = config.bookmark === 'name' ? resolved : condition !== 'replay';
      return {rows:[row('service', 'Open the scoreboard page', opens ? 'scoreboard page opened from ' + server : config.bookmark === 'name' ? 'name not found, so the kiosk never asked the server' : 'no reply from 10.20.0.30', opens, 'page opens')], note:opens ? (config.bookmark === 'address' ? 'The page opened by address. That skips the lookup, so it does not show the name works.' : 'The name was looked up and the service answered.') : config.bookmark === 'name' ? 'The page never reached the server. Which earlier step failed?' : 'The kiosk is still using the old address. What would follow the scoreboard to its new server?'};
    },
    scene(config, condition) {return {nodes:[['kiosk', 'Kiosk 1', 70, 125], ['dns', 'Name server .53', 300, 40, config.dns === '10.20.0.53' ? 'on' : 'off'], ['old', 'Server 10.20.0.30', 510, 90, condition === 'replay' ? 'off' : 'on'], ...(condition === 'replay' ? [['new', 'Server 10.20.0.31', 510, 200, 'on']] : [])], links:[...(config.dns === '10.20.0.53' ? [['kiosk', 'dns', 'asks']] : []), ['kiosk', condition === 'replay' && config.bookmark === 'name' && config.dns === '10.20.0.53' ? 'new' : 'old', config.bookmark === 'name' ? 'by name' : 'by address']]};}
  },
  'FAIR-209':{
    person:'Sam, who signs teams in',
    brief:'Fifty teams have registered, and each needs an address for its laptop. The fair was given one block of addresses, and Sam has to pick a size that fits everyone and then add one more kiosk.',
    observe:'The allocated block is 10.40.8.64 to 10.40.8.127. The gateway is 10.40.8.65 and an existing kiosk already uses 10.40.8.70.',
    success:'The block has room for 50 teams, the new kiosk has an address nobody else uses, and the gateway answers it.',
    terms:[{term:'Usable address', plain:'An address a device can have. The first address of a block names the network and the last is the broadcast, so neither can be given out.', when:'brief'}, {term:'Prefix', plain:'The /26 or /27 that says how big the block is. A smaller number means a bigger block.', when:'run'}],
    predict:{prompt:'A /27 has 30 usable addresses and a /26 has 62. Which one fits 50 teams?', options:[['/27', '/27'], ['/26', '/26'], ['either', 'Either one']]},
    controls:[control('prefix', 'Block size', [['/27', '/27 · 10.40.8.64 to .95'], ['/26', '/26 · 10.40.8.64 to .127']], '/27'), control('address', 'New kiosk address', [['10.40.8.64', '10.40.8.64'], ['10.40.8.65', '10.40.8.65'], ['10.40.8.70', '10.40.8.70'], ['10.40.8.71', '10.40.8.71'], ['10.40.8.72', '10.40.8.72'], ['10.40.8.127', '10.40.8.127']], '10.40.8.70'), control('gateway', 'New kiosk gateway setting', [['10.40.8.1', '10.40.8.1'], ['10.40.8.65', '10.40.8.65'], ['10.40.8.127', '10.40.8.127']], '10.40.8.1')],
    tests:[test('fit', 'Count the usable addresses'), test('gateway', 'Test the gateway from the new kiosk')],
    required:{base:['fit', 'gateway'], replay:['fit', 'gateway']},
    replay:{action:'The judges take .71', text:'A minute ago the judges’ laptop was given 10.40.8.71. The address plan has one more line.'},
    worked:'Write the block as a list: first address, last address, and everything between. Cross off the first (the network) and the last (the broadcast). Count what is left, then cross off the addresses already in use.',
    starter:'The ___ block has ___ usable addresses, which ___ 50 teams. The kiosk uses ___ because ___.',
    supplied(condition) {return [{caption:'Address plan', headers:['Address', 'Used for'], rows:[['10.40.8.64', 'Network (cannot be given out)'], ['10.40.8.65', 'Gateway'], ['10.40.8.70', 'Existing kiosk'], ...(condition === 'replay' ? [['10.40.8.71', 'Judges’ laptop (new)']] : []), ['10.40.8.127', 'Broadcast for the whole allocation (cannot be given out)']]}];},
    model(config, condition, id) {
      const net = SUBNETS[config.prefix], host = Number(config.address.split('.').at(-1));
      if (id === 'fit') return {rows:[row('usable', 'Usable addresses in the ' + config.prefix, String(net.usable), net.usable >= 50, 'at least 50'), row('range', 'Block', '10.40.8.' + net.first + ' to 10.40.8.' + net.last + ' (inside the allocation)')], note:net.usable >= 50 ? '62 usable addresses leave room for 50 teams, the gateway and the kiosks.' : 'Thirty usable addresses cannot hold 50 teams. How many does the next size up give?'};
      const taken = {64:'the network address', [net.last]:'the broadcast address for this block', 65:'the gateway’s own address', 70:'already used by the existing kiosk', ...(condition === 'replay' ? {71:'just given to the judges’ laptop'} : {})};
      const inside = host > net.first && host < net.last, free = inside && !Object.hasOwn(taken, host), reply = free && config.gateway === '10.40.8.65';
      return {rows:[row('address', 'New kiosk address ' + config.address, free ? 'free and usable' : Object.hasOwn(taken, host) ? 'cannot be used: ' + taken[host] : 'outside this block', free, 'free and usable'), row('reply', 'Gateway test from the kiosk', reply ? 'reply from 10.40.8.65' : !free ? 'not run: fix the kiosk address first' : 'no reply from ' + config.gateway, reply, 'gateway replies')],
        note:!free ? 'Check the address plan. Which addresses are taken, and which two can never be given out?' : !reply ? 'The kiosk’s address is fine. Which address in the plan is the gateway?' : 'The kiosk has its own address and the gateway answered.'};
    },
    scene(config) {return {nodes:[['kiosk', 'New kiosk .' + config.address.split('.').at(-1), 70, 125], ['gw', 'Gateway .65', 300, 125, 'on'], ['fair', 'Rest of the fair', 520, 125]], links:[['kiosk', 'gw', 'gateway set to .' + config.gateway.split('.').at(-1)], ['gw', 'fair', '']]};}
  },
  'FAIR-210':{
    person:'Lena, who runs the visitor booth',
    brief:'Visitors at Lena’s booth should see live scores on their phones. Last year a visitor also found the staff file share. Lena wants scores open and staff files closed.',
    observe:'The booth’s switch port can sit in the staff group (VLAN 10) or the guest group (VLAN 30). The gateway has one rule for guests. You test as the same guest twice.',
    success:'As one guest: the scores open and the staff files are blocked.',
    terms:[{term:'VLAN', plain:'A labelled group on a switch. Devices in different groups cannot reach each other without passing the gateway.', when:'brief'}, {term:'Gateway rule', plain:'A line that says what one group may reach when it crosses the gateway.', when:'run'}],
    predict:{prompt:'If the visitor’s port is in the staff VLAN, what will the guest rule do?', options:[['nothing', 'Nothing: the visitor is already inside the staff group'], ['block', 'It will still block the staff files'], ['all', 'It will block everything']]},
    controls:[control('vlan', 'Visitor port VLAN', [['10', 'VLAN 10 · staff'], ['30', 'VLAN 30 · guest']], '10'), control('rule', 'Gateway rule for guests', [['allow-all', 'Allow guests to everything'], ['scores-only', 'Allow scores; block staff files'], ['block-all', 'Block guests from everything']], 'allow-all')],
    tests:[test('scores', 'As the guest, open the scores'), test('staff', 'As the same guest, try the staff files')],
    required:{base:['scores', 'staff'], replay:['scores', 'staff']},
    replay:{action:'Move the booth to port 14', text:'The booth moves across the aisle and plugs into switch port 14. That port is still set to the staff VLAN.', patch:{vlan:'10'}},
    worked:'One test is not enough here. “Scores open” and “staff files blocked” are two different promises, so run both as the same guest and read the pair. A setup that passes one and fails the other has not met the target.',
    starter:'As the same guest, the scores ___ and the staff files ___, so the booth should ___.',
    model(config, condition, id) {
      const guest = config.vlan === '30';
      if (id === 'scores') {const opens = !guest || config.rule !== 'block-all'; return {rows:[row('scores', 'Guest → live scores', opens ? 'opened' : 'blocked by the guest rule', opens, 'opens')], note:opens ? 'The scores open. Now run the staff-files test as the same guest.' : 'Staff files are safe, and so are the scores: nobody can see them. Blocking both does not meet the target.'};}
      const blocked = guest && config.rule !== 'allow-all';
      return {rows:[row('staff', 'Same guest → staff files', blocked ? 'blocked by the guest rule' : guest ? 'opened: the guest rule allows everything' : 'opened: this port is inside the staff VLAN', blocked, 'blocked')], note:blocked ? 'The staff files are blocked for this guest. Check the scores as well.' : guest ? 'The visitor is in the guest group, but the rule lets guests through to everything.' : 'The visitor’s port is in the staff group, so the guest rule never sees this traffic. Which group should the port be in?'};
    },
    scene(config, condition) {return {nodes:[['guest', 'Visitor’s phone', 70, 125], ['port', condition === 'replay' ? 'Switch port 14' : 'Switch port 8', 240, 125, config.vlan === '30' ? 'on' : 'warn'], ['gw', 'Gateway', 400, 125], ['scores', 'Live scores', 540, 60], ['staff', 'Staff files', 540, 200]], links:[['guest', 'port', ''], ['port', 'gw', 'VLAN ' + config.vlan], ['gw', 'scores', ''], ['gw', 'staff', '']]};}
  },
  'FAIR-218':{
    person:'Noor, who films the awards walk',
    brief:'Noor carries a camera from the gym, through the doorway and down the hall. The picture drops out at the doorway, where the camera should hand off from the gym’s access point to the hall’s.',
    observe:'Packet counts out of ten at the gym, the doorway and the hall, and whether the handoff from one access point to the next left a gap.',
    success:'At least 9 of 10 packets at the gym, the doorway and the hall, and a handoff with no gap.',
    terms:[{term:'Handoff', plain:'The moment a moving device lets go of one access point and joins the next.', when:'brief'}, {term:'Band', plain:'A range of radio frequencies. Some older devices only use 2.4 GHz; newer ones can also use 5 GHz.', when:'replay'}],
    predict:{prompt:'Which hall access-point position do you predict keeps the doorway connected?', options:[['far', 'The far end of the hall'], ['door', 'Near the doorway'], ['same', 'It makes no difference']]},
    controls:[control('ap', 'Hall access-point position', [['far', 'Far end of the hall'], ['door', 'Near the doorway']], 'far'), control('radio', 'Hall radio', [['5', '5 GHz only'], ['dual', 'Approved dual-band option (2.4 and 5 GHz)']], '5')],
    tests:[test('walk', 'Walk the camera from the gym into the hall')],
    required:{base:['walk'], replay:['walk']},
    baseline:{test:'walk', config:{ap:'far', radio:'5'}, label:'Far end of the hall'},
    replay:{action:'Swap in the spare camera', text:'The main camera’s battery dies. The spare camera only has a 2.4 GHz radio.'},
    worked:'Read the three counts in the order Noor walks: gym, doorway, hall. Two are fine and one is not. The low count sits where two access points should overlap, so that is the place to change.',
    starter:'With the hall access point ___, the doorway got ___ of ten and the handoff ___.',
    model(config, condition) {
      const doorway = config.ap === 'door' ? 9 : 5, spare = condition === 'replay', joins = !spare || config.radio === 'dual', hall = !joins ? 0 : spare ? 9 : 10;
      const handoff = joins && doorway >= 9;
      const rows = [count('gym', 'Gym', 10), count('doorway', 'Doorway', doorway), joins ? count('hall', 'Hall', hall) : row('hall', 'Hall', '0 of 10 (the camera cannot join the hall radio)', false, 'at least 9 of 10'), row('handoff', 'Handoff at the doorway', !joins ? 'failed: the 2.4 GHz camera cannot join a 5 GHz-only radio' : handoff ? 'succeeded, no gap' : 'gap: the camera lost the gym before it heard the hall', handoff, 'no gap')];
      if (spare && joins) rows.push(row('band', 'Hall connection recorded on', '2.4 GHz'));
      return {rows, note:!joins ? 'The doorway count is fine, then the hall drops to zero. What can the spare camera’s radio use, and what does the hall radio offer?' : doorway < 9 ? 'Ten in the gym, ten in the hall, five at the doorway. Where do the two access points fail to overlap?' : 'The doorway holds and the handoff has no gap.'};
    },
    scene(config, condition) {return {nodes:[['gymap', 'Gym access point', 90, 50, 'on'], ['gym', 'Gym', 90, 190], ['door', 'Doorway', 300, 190], ['hall', 'Hall', 510, 190], ['hallap', 'Hall AP (' + (config.radio === 'dual' ? '2.4 + 5 GHz' : '5 GHz only') + ')', config.ap === 'door' ? 330 : 510, 50, 'on']], links:[['gym', 'door', condition === 'replay' ? 'spare camera' : 'camera'], ['door', 'hall', '']]};}
  },
  'FAIR-216':{
    person:'Ravi, on the fair’s monitoring desk',
    brief:'Two alerts are flashing on Ravi’s screen: the printer and the stage uplink. He has one crew to send. He wants the alert that is actually getting worse.',
    observe:'Two counter readings, 60 seconds apart, for each device. The alert rule fires above 0.5 errors per second.',
    success:'Your rate is right, you send the crew only where the rate is above the threshold, and you pick a follow-up check that fits.',
    terms:[{term:'Counter', plain:'A number that only goes up. One reading tells you little; two readings tell you how fast it is rising.', when:'brief'}, {term:'Rate', plain:'How much the counter rose, divided by the seconds between the readings.', when:'brief'}, {term:'Threshold', plain:'The line a rate has to cross before the alert matters.', when:'run'}],
    predict:{prompt:'The printer counter reads 900 and the uplink reads 160. Which needs a crew?', options:[['printer', 'The printer, because 900 is bigger'], ['uplink', 'The uplink, because it is rising'], ['both', 'Both']]},
    controls:[control('rate', 'Stage uplink error rate', [['0.25', '0.25 errors/second'], ['0.5', '0.5 errors/second'], ['1', '1 error/second'], ['15', '15 errors/second'], ['60', '60 errors/second'], ['160', '160 errors/second']], '160'), control('crew', 'The alert that needs a crew', [['printer', 'The printer'], ['uplink', 'The stage uplink'], ['both', 'Both'], ['neither', 'Neither right now']], 'both'), control('follow', 'Follow-up check', [['clear', 'Clear the counters'], ['cable', 'Inspect the stage uplink cable and ports, then sample again'], ['printer', 'Restart the printer'], ['watch', 'Keep watching: take another 60-second sample']], 'clear')],
    tests:[test('compare', 'Compare my rate with the threshold')],
    required:{base:['compare'], replay:['compare']},
    replay:{action:'Take the next sample', text:'Sixty seconds later a third reading arrives. The stage uplink now reads 175, up from 160. The printer still reads 900.'},
    worked:'Take the printer first. It read 900, then 900 again: (900 − 900) ÷ 60 seconds = 0 per second. The number is big, but it is not moving. Now do the same sum for the uplink and compare the answer with the threshold.',
    starter:'The uplink rose from ___ to ___ in 60 seconds, which is ___ per second, so the crew should ___.',
    supplied(condition) {return [{caption:'Counter readings', headers:['Device', 'First reading', '60 seconds later', 'Alert rule'], rows:[['Printer', '900', '900', 'more than 0.5 errors/second'], ['Stage uplink', condition === 'replay' ? '160' : '100', condition === 'replay' ? '175' : '160', 'more than 0.5 errors/second']]}];},
    model(config, condition) {
      const replay = condition === 'replay', rate = replay ? '0.25' : '1', crew = replay ? 'neither' : 'uplink', follow = replay ? 'watch' : 'cable', from = replay ? 160 : 100, to = replay ? 175 : 160;
      const rows = [row('printer', 'Printer rate', '(900 − 900) ÷ 60 = 0 errors/second'), row('rate', 'Your stage uplink rate', config.rate + ' errors/second', config.rate === rate, 'matches the two readings'), row('crew', 'Crew sent to', {printer:'the printer', uplink:'the stage uplink', both:'both', neither:'neither right now'}[config.crew], config.crew === crew, 'only where the rate is above 0.5'), row('follow', 'Follow-up check', {clear:'clear the counters', cable:'inspect the uplink cable and ports, then sample again', printer:'restart the printer', watch:'take another 60-second sample'}[config.follow], config.follow === follow, 'fits the evidence')];
      const note = config.rate !== rate ? (config.rate === String(to) ? to + ' is the counter’s total. Subtract the first reading, then divide by the seconds.' : config.rate === String(to - from) ? (to - from) + ' is how many new errors arrived. Divide that by the 60 seconds between readings.' : 'Work it as (' + to + ' − ' + from + ') ÷ 60.') : config.crew !== crew ? (replay ? 'Is 0.25 more than 0.5? If the rate is under the threshold, who needs a crew right now?' : 'The printer’s counter did not move. Which rate is above 0.5?') : config.follow !== follow ? (config.follow === 'clear' ? 'Clearing the counters removes the evidence you just used.' : replay ? 'The rate dropped below the threshold. What would tell you whether it stays down?' : 'The uplink is the one rising. Which check looks at the uplink itself?') : replay ? 'The uplink slowed to 0.25 per second, under the threshold. Another sample will show whether it holds.' : 'The uplink is rising at 1 error per second, above the 0.5 threshold.';
      return {rows, note};
    },
    scene(config, condition) {return {nodes:[['desk', 'Monitoring desk', 70, 125], ['printer', 'Printer · 900', 300, 50], ['uplink', 'Stage uplink · ' + (condition === 'replay' ? 175 : 160), 300, 200, condition === 'replay' ? '' : 'warn'], ['stage', 'Stage', 520, 200]], links:[['desk', 'printer', 'reads'], ['desk', 'uplink', 'reads'], ['uplink', 'stage', 'uplink']]};}
  },
  'FAIR-213':{
    person:'Tess, the commentary producer',
    brief:'The live commentary keeps breaking up. A big video upload is sharing the same 10 Mb/s uplink as Tess’s audio.',
    observe:'Two readings for the commentary audio: how much of it is lost, and how uneven its timing is. The uplink stays at 10 Mb/s whatever you choose.',
    success:'Loss under 1% and jitter at most 20 ms.',
    terms:[{term:'Loss', plain:'The share of the audio that never arrives, as a percentage.', when:'brief'}, {term:'Jitter', plain:'How uneven the timing is, in milliseconds. Audio that arrives in bursts sounds choppy.', when:'run'}, {term:'Priority', plain:'A rule that sends the audio first when the link is busy. It does not make the link any bigger.', when:'run'}],
    predict:{prompt:'Which change do you predict meets both targets?', options:[['priority', 'Audio priority on its own'], ['move', 'Moving the upload on its own'], ['both', 'Both together'], ['bigger', 'Neither: the link has to be bigger']]},
    controls:[control('priority', 'Audio priority', [['off', 'Off'], ['on', 'On']], 'off'), control('upload', 'The upload runs', [['during', 'During the show'], ['scheduled', 'At the show’s scheduled end, 8:00'], ['confirmed', 'When the crew confirms the show has ended']], 'during')],
    tests:[test('measure', 'Measure the commentary audio')],
    required:{base:['measure'], replay:['measure']},
    baseline:{test:'measure', config:{priority:'off', upload:'during'}, label:'No priority, upload during the show'},
    replay:{action:'The show runs long', text:'The final match goes to overtime. The show will now end around 8:20, not 8:00.'},
    worked:'Change one thing and measure, then change it back and try the other. If you change both at once, you cannot tell which one did the work. Write each pair of readings next to the baseline.',
    starter:'With ___, loss was ___% and jitter was ___ ms, so the upload can run ___.',
    model(config, condition) {
      const overlap = config.upload === 'during' || (condition === 'replay' && config.upload === 'scheduled'), priority = config.priority === 'on';
      const [loss, jitter] = overlap ? (priority ? [0.8, 32] : [7, 55]) : (priority ? [0.4, 12] : [2, 30]);
      return {rows:[row('loss', 'Audio lost', loss + '%', loss < 1, 'under 1%'), row('jitter', 'Jitter', jitter + ' ms', jitter <= 20, 'at most 20 ms'), row('capacity', 'Uplink capacity', '10 Mb/s (unchanged)')],
        note:loss < 1 && jitter <= 20 ? 'Both targets are met. The link is still 10 Mb/s; the audio simply is not competing with the upload.' : overlap && priority ? 'Priority brought loss under 1%, but jitter is 32 ms. The upload is still on the link during the show' + (condition === 'replay' && config.upload === 'scheduled' ? ': 8:00 is now inside the show.' : '.') : overlap ? 'The upload and the audio are sharing the link with no rule between them.' : 'The upload is out of the way, but the audio has no priority when other traffic appears. Jitter is still 30 ms.'};
    },
    scene(config, condition) {const overlap = config.upload === 'during' || (condition === 'replay' && config.upload === 'scheduled'); return {nodes:[['mic', 'Commentary audio', 70, 60, config.priority === 'on' ? 'on' : ''], ['upload', 'Video upload', 70, 190, overlap ? 'warn' : 'off'], ['uplink', '10 Mb/s uplink', 300, 125], ['listeners', 'Listeners', 520, 125]], links:[['mic', 'uplink', config.priority === 'on' ? 'priority' : ''], ...(overlap ? [['upload', 'uplink', 'during the show']] : []), ['uplink', 'listeners', '']]};}
  },
  'FAIR-211':{
    person:'Judge Okafor, who is scoring from home',
    brief:'Judge Okafor cannot travel this year. She needs to open the private scoring app from home and submit scores. Nobody outside should reach the staff files.',
    observe:'Three separate things stand between her and a submitted score: a VPN tunnel, a firewall rule for the scoring service, and her role in the scoring app.',
    success:'The approved judge can open the scoring app and submit a score, and the staff files stay blocked.',
    terms:[{term:'VPN tunnel', plain:'A private, protected path from her home into the fair’s network.', when:'brief'}, {term:'Firewall rule', plain:'A line that says which services may be reached through the tunnel.', when:'brief'}, {term:'Role', plain:'What the app lets a signed-in person do. An observer can look; a judge can submit.', when:'run'}],
    predict:{prompt:'With the tunnel on and the scoring service permitted, what can an observer do?', options:[['nothing', 'Nothing at all'], ['view', 'Open the app, but not submit'], ['submit', 'Open the app and submit']]},
    controls:[control('tunnel', 'VPN tunnel', [['off', 'Off'], ['on', 'On']], 'off'), control('firewall', 'Firewall rule for the scoring service', [['permit', 'Permit'], ['block', 'Block']], 'permit'), control('role', 'Scoring-app role', [['observer', 'Observer'], ['judge', 'Approved judge']], 'observer')],
    tests:[test('view', 'Open the scoring app'), test('submit', 'Submit a score'), test('staff', 'Try to open the staff files')],
    required:{base:['view', 'submit', 'staff'], replay:['view', 'submit', 'staff']},
    demos:[{id:'block-observer', label:'Firewall blocking, observer opens the app', match:run => run.condition === 'replay' && run.test === 'view' && run.config.firewall === 'block' && run.config.tunnel === 'on' && run.config.role === 'observer'}, {id:'block-judge', label:'Firewall blocking, judge opens the app', match:run => run.condition === 'replay' && run.test === 'view' && run.config.firewall === 'block' && run.config.tunnel === 'on' && run.config.role === 'judge'}],
    replay:{action:'Someone changes the firewall', text:'Overnight, a tidy-up changed the firewall rule: the scoring service is now blocked. Test what that does to both roles before you fix it.', patch:{firewall:'block'}},
    worked:'Three controls, so change one at a time. Start with everything as it is and open the app: note what the result blames. Turn the tunnel on and open it again. Only then look at the role.',
    starter:'With the tunnel ___ and the firewall ___, the ___ role could ___ but could not ___.',
    model(config, condition, id) {
      const inside = config.tunnel === 'on', reachable = inside && config.firewall === 'permit';
      if (id === 'staff') return {rows:[row('staff', 'Remote → staff files', inside ? 'blocked by the firewall' : 'unreachable: no tunnel', true, 'blocked')], note:'The staff files stay closed in every setup. No rule permits them through the tunnel.'};
      if (id === 'view') return {rows:[row('view', 'Open the scoring app as ' + (config.role === 'judge' ? 'the judge' : 'an observer'), reachable ? 'app opened' : inside ? 'blocked by the firewall rule' : 'unreachable: the private app has no path without the tunnel', reachable, 'app opens')], note:reachable ? 'The tunnel carries her in and the firewall permits the scoring service.' : inside ? 'The tunnel is up, but the firewall blocks the scoring service. That stops every role, not just one.' : 'Nothing reaches the private app from outside. What gives her a path in?'};
      const can = reachable && config.role === 'judge';
      return {rows:[row('submit', 'Submit a score as ' + (config.role === 'judge' ? 'the judge' : 'an observer'), can ? 'score submitted' : reachable ? 'refused: observers can view but cannot submit' : inside ? 'blocked by the firewall rule' : 'unreachable: no tunnel', can, 'score submitted')], note:can ? 'The approved judge role can submit.' : reachable ? 'The app opened, so the tunnel and firewall are fine. What decides who may submit?' : 'She cannot reach the app yet, so the role has not been tested.'};
    },
    scene(config) {return {nodes:[['home', 'Home (' + (config.role === 'judge' ? 'judge' : 'observer') + ' role)', 90, 125], ['fw', 'Firewall', 300, 125, config.firewall === 'permit' ? 'on' : 'warn'], ['app', 'Scoring app', 520, 60], ['staff', 'Staff files', 520, 200, 'off']], links:[...(config.tunnel === 'on' ? [['home', 'fw', 'VPN tunnel']] : []), ...(config.firewall === 'permit' ? [['fw', 'app', 'permitted']] : [])]};}
  },
  'FAIR-214':{
    person:'Ms. Ortiz, who is planning next year’s fair',
    brief:'Next year’s fair moves to a bigger venue. Ms. Ortiz needs a design that has enough ports and uplink for everything, keeps guests out of the staff files, and can be undone if install day goes wrong.',
    observe:'The venue needs 24 computers, two access points, one printer and one uplink. Peak traffic is estimated at 560 Mb/s, and the fair adds 25% headroom.',
    success:'At least 28 ports and 700 Mb/s of uplink, guests reach the scores, guests are blocked from staff files, and you can name the setting to restore if the design fails.',
    terms:[{term:'Headroom', plain:'Extra capacity kept spare on purpose. 25% headroom on 560 Mb/s means planning for 700 Mb/s.', when:'brief'}, {term:'Rollback', plain:'Going back to the last setup that worked.', when:'replay'}],
    predict:{prompt:'24 computers, two access points, one printer and one uplink. How many switch ports is that?', options:[['24', '24'], ['27', '27'], ['28', '28'], ['48', '48']]},
    controls:[control('ports', 'Switch', [['24', '24-port switch'], ['48', '48-port switch']], '24'), control('uplink', 'Uplink', [['100', '100 Mb/s'], ['500', '500 Mb/s'], ['1000', '1 Gb/s (1000 Mb/s)']], '100'), control('rules', 'Guest access', [['flat', 'One open network for everyone'], ['segmented', 'Guests reach scores only; staff files blocked']], 'flat'), control('restore', 'If the design fails, restore', [['none', 'Nothing: start again from scratch'], ['factory', 'The factory default settings'], ['previous', 'The saved previous switch and gateway settings']], 'none')],
    tests:[test('size', 'Check ports and uplink against the venue'), test('allowed', 'Test an allowed path: guest → scores'), test('blocked', 'Test a blocked path: guest → staff files')],
    required:{base:['size', 'allowed', 'blocked'], replay:['size', 'allowed', 'blocked']},
    replay:{action:'Install day goes wrong', text:'On install day the new gateway rules fail to load. Until something is restored, the new design is not running.'},
    worked:'Add the ports as a list: 24 + 2 + 1 + 1. Then the uplink: 560 Mb/s plus a quarter of 560. Compare each total with what you chose. The two path tests come after, and they answer a different question from the sizes.',
    starter:'The design needs ___ ports and ___ Mb/s. If it fails, restore ___ because ___.',
    model(config, condition, id) {
      const ports = Number(config.ports), uplink = Number(config.uplink);
      if (id === 'size') return {rows:[row('ports', 'Ports: 24 + 2 + 1 + 1 = 28 needed', ports + ' chosen', ports >= 28, 'at least 28'), row('uplink', 'Uplink: 560 × 1.25 = 700 Mb/s needed', uplink + ' Mb/s chosen', uplink >= 700, 'at least 700 Mb/s')], note:ports < 28 ? 'A 24-port switch fits the computers and nothing else. Count the access points, the printer and the uplink too.' : uplink < 700 ? uplink + ' Mb/s is under the 700 Mb/s the venue needs with headroom.' : 'Ports and uplink both cover the venue with room to spare.'};
      // After the failed install, what runs is whatever was restored.
      const running = condition !== 'replay' ? config.rules : config.restore === 'previous' ? 'segmented' : config.restore === 'factory' ? 'flat' : 'down';
      if (id === 'allowed') {const ok = running !== 'down'; return {rows:[row('allowed', 'Guest → scores', ok ? 'opened' : 'failed: no working rules are loaded', ok, 'opens')], note:ok ? 'Guests reach the scores.' : 'Nothing was restored, so nothing works. What was saved before install day?'};}
      const blocked = running !== 'flat';
      return {rows:[row('blocked', 'Guest → staff files', running === 'down' ? 'blocked: nothing gets through at all' : blocked ? 'blocked' : 'opened: one open network has no boundary', blocked, 'blocked')], note:running === 'flat' ? (condition === 'replay' ? 'Factory defaults are one open network. Guests can reach the staff files again.' : 'On one open network, guests and staff share everything.') : running === 'down' ? 'Blocked, but only because everything is down. Check the allowed path too.' : 'Guests are kept out of the staff files.'};
    },
    scene(config, condition) {return {nodes:[['pcs', '24 computers', 70, 50], ['aps', '2 access points', 70, 125], ['printer', 'Printer', 70, 200], ['switch', config.ports + '-port switch', 300, 125, condition === 'replay' && config.restore === 'none' ? 'warn' : 'on'], ['up', 'Uplink ' + config.uplink + ' Mb/s', 520, 125]], links:[['pcs', 'switch', '24'], ['aps', 'switch', '2'], ['printer', 'switch', '1'], ['switch', 'up', '1']]};}
  }
});

const definitions = new Map(FAIR_CATALOG.filter(meta => Object.hasOwn(MISSIONS, meta.id)).map(meta => [meta.id, Object.freeze({...meta, grade:fairBand(meta.band).grade, track:'network', fair:true, goal:MISSIONS[meta.id].success, ...MISSIONS[meta.id]})]));
export const FAIR_MISSIONS = Object.freeze([...definitions.values()]);
export const fairMission = id => definitions.get(key(id)) || null;
export const supportsFairMission = id => definitions.has(key(id));

const optionAllowed = (item, value, condition) => item.options.some(([option, , only]) => option === value && (!only || only === condition));
const setupKey = (mission, config) => JSON.stringify(mission.controls.map(item => config[item.name]));
export const fairSetupKey = (id, config) => {const mission = fairMission(id); return mission ? setupKey(mission, config) : '';};

export function initialFairState(id) {
  const mission = fairMission(id);
  return {predict:'', condition:'base', config:mission ? Object.fromEntries(mission.controls.map(item => [item.name, item.initial])) : {}, runs:[], evidence:[], decision:'', worked:false, clues:0, edits:0};
}

/** Strict own-field normalization. Saved readings are never trusted: each run is replayed through the model. */
export function normalizeFairState(id, saved) {
  const mission = fairMission(id), state = initialFairState(id);
  if (!mission || !plain(saved)) return state;
  if (mission.predict.options.some(([value]) => value === saved.predict)) state.predict = saved.predict;
  if (saved.condition === 'replay') state.condition = 'replay';
  const readConfig = (source, condition, fallback) => Object.fromEntries(mission.controls.map(item => [item.name, plain(source) && Object.hasOwn(source, item.name) && optionAllowed(item, source[item.name], condition) ? source[item.name] : fallback[item.name]]));
  state.config = readConfig(saved.config, state.condition, state.config);
  if (Array.isArray(saved.runs)) {
    let n = 0;
    for (const run of saved.runs.slice(-RUN_LIMIT)) {
      if (!plain(run) || !mission.tests.some(item => item.id === run.test) || !['base', 'replay'].includes(run.condition) || !plain(run.config)) continue;
      // A run after the changed condition cannot be followed by one from before it.
      if (state.runs.length && state.runs.at(-1).condition === 'replay' && run.condition === 'base') continue;
      if (run.condition === 'replay' && state.condition !== 'replay') continue;
      const config = readConfig(run.config, run.condition, initialFairState(id).config);
      if (!mission.controls.every(item => plain(run.config) && run.config[item.name] === config[item.name])) continue;
      state.runs.push({n:++n, test:run.test, condition:run.condition, config});
    }
  }
  const readings = currentReadings(mission, state), ids = new Set(readings.flatMap(reading => reading.rows.map(item => reading.run.n + ':' + item.id)));
  if (Array.isArray(saved.evidence)) state.evidence = [...new Set(saved.evidence.filter(item => typeof item === 'string' && ids.has(item)))].slice(0, 12);
  if (DECISIONS.some(item => item.id === saved.decision)) state.decision = saved.decision;
  state.worked = saved.worked === true;
  for (const name of ['clues', 'edits']) if (Number.isSafeInteger(saved[name]) && saved[name] >= 0) state[name] = Math.min(saved[name], 100000);
  return state;
}

function readRun(mission, run) {
  const result = mission.model(run.config, run.condition, run.test), scored = result.rows.filter(item => item.ok !== null);
  return {run, test:mission.tests.find(item => item.id === run.test), rows:result.rows, note:result.note, ok:scored.length > 0 && scored.every(item => item.ok)};
}
const latestRun = (state, id, before = Infinity) => state.runs.findLast(run => run.test === id && run.n < before) || null;
const isCurrent = (mission, state, run) => !!run && run.condition === state.condition && setupKey(mission, run.config) === setupKey(mission, state.config);
/** Latest reading of each test that still matches the present setup and condition. */
function currentReadings(mission, state) {
  return mission.tests.map(item => latestRun(state, item.id)).filter(run => isCurrent(mission, state, run)).map(run => readRun(mission, run));
}

/** Everything the page, the text view, the map and the report show. Derived; nothing here is stored. */
export function fairView(id, saved) {
  const mission = fairMission(id);
  if (!mission) return null;
  const state = normalizeFairState(id, saved), required = mission.required[state.condition];
  const tests = mission.tests.map(item => {
    const run = latestRun(state, item.id), current = isCurrent(mission, state, run), previous = run ? latestRun(state, item.id, run.n) : null;
    return {...item, required:required.includes(item.id), reading:run ? readRun(mission, run) : null, stale:!!run && !current, prior:previous ? readRun(mission, previous) : null};
  });
  const baseline = mission.baseline ? {label:mission.baseline.label, ...readRun(mission, {n:0, test:mission.baseline.test, condition:'base', config:{...initialFairState(id).config, ...mission.baseline.config}})} : null;
  const current = tests.filter(item => item.reading && !item.stale), requiredTests = tests.filter(item => item.required);
  const tested = requiredTests.every(item => item.reading && !item.stale), met = tested && requiredTests.every(item => item.reading.ok);
  // A base setup that met the target at some point: every required test passed with the same setup.
  const baseRuns = state.runs.filter(run => run.condition === 'base');
  const baseMet = baseRuns.some(run => mission.required.base.every(need => baseRuns.some(other => other.test === need && setupKey(mission, other.config) === setupKey(mission, run.config) && readRun(mission, other).ok)));
  const demos = (mission.demos || []).map(item => ({id:item.id, label:item.label, done:state.runs.some(run => item.match(run))}));
  const evidence = current.flatMap(item => item.reading.rows.map(rowItem => ({id:item.reading.run.n + ':' + rowItem.id, test:item.label, label:rowItem.label, value:rowItem.value, ok:rowItem.ok, selected:state.evidence.includes(item.reading.run.n + ':' + rowItem.id)})));
  const chosen = evidence.filter(item => item.selected);
  const replay = state.condition === 'replay', demonstrated = demos.every(item => item.done);
  // A decision has to agree with the evidence in front of the learner right now.
  const expected = met && demonstrated ? ['open'] : ['hold', 'revise'];
  const supports = state.decision === 'open' ? chosen.length > 0 && chosen.every(item => item.ok !== false) : chosen.some(item => item.ok === false) || (!demonstrated && chosen.length > 0);
  const consistent = replay && tested && state.decision !== '' && expected.includes(state.decision) && supports;
  const station = !state.runs.length ? 'offline' : consistent && state.decision === 'open' ? 'online' : replay && tested && !met ? 'hold' : met ? 'ready' : 'testing';
  const blockers = [];
  if (!state.predict) blockers.push('choose a prediction in Get the brief');
  if (!baseRuns.length) blockers.push('run a first test in Try it');
  if (!replay) blockers.push('change the condition in Prove it');
  else if (!tested) blockers.push(tests.some(item => item.required && item.stale) ? 'run a fresh test: the setup changed since the last one' : 'run every listed test after the change');
  if (!demonstrated) blockers.push('show: ' + demos.find(item => !item.done).label);
  if (replay && tested && !chosen.length) blockers.push('select the evidence your decision rests on');
  if (replay && tested && !state.decision) blockers.push('choose open, hold or revise');
  else if (replay && tested && chosen.length && !consistent) blockers.push(state.decision === 'open' ? (met && demonstrated ? 'remove evidence that misses the target, or change the decision' : 'the current evidence misses the target, so open does not fit') : met && demonstrated ? 'the current evidence meets the target, so the station can open' : 'include the reading that misses the target in your evidence');
  return {mission, state, tests, baseline, met, tested, baseMet, demos, demonstrated, evidence, chosen, expected, consistent, station, blockers, replay,
    predicted:state.predict !== '', tried:baseRuns.length > 0, stale:tests.some(item => item.required && item.stale),
    terms:mission.terms.filter(item => item.when === 'brief' || (item.when === 'run' && state.runs.length > 0) || (item.when === 'replay' && replay)),
    supplied:mission.supplied ? mission.supplied(state.condition, state.config) : [], scene:mission.scene(state.config, state.condition),
    clue:tests.find(item => item.reading && !item.stale && !item.reading.ok)?.reading.note || current.at(-1)?.reading.note || 'Run a test first. A clue is about a reading.'};
}

const result = (state, message, kind = 'info', extra = {}) => ({state, message, kind, ...extra});
/** One learner action. Returns the next state and feedback; an action never marks a mission complete. */
export function applyFairAction(id, previous, action, value) {
  const mission = fairMission(id), state = normalizeFairState(id, previous);
  if (!mission) return result(state, 'This mission is not available.', 'warning');
  if (action === 'predict') {
    if (!mission.predict.options.some(([option]) => option === value)) return result(state, 'Choose one of the listed predictions.', 'warning');
    if (state.runs.length && state.predict) return result(state, 'Your prediction is kept as you made it, so you can compare it with what happened.', 'info');
    state.predict = value; return result(state, 'Prediction saved. It stays beside your readings for comparison.', 'info');
  }
  if (action === 'worked') {state.worked = true; return result(state, 'Worked example opened.', 'info', {viewOnly:true});}
  if (action === 'clue') {state.clues = Math.min(state.clues + 1, 100000); return result(state, fairView(id, state).clue, 'info', {viewOnly:true});}
  if (action === 'set') {
    const item = plain(value) ? mission.controls.find(entry => entry.name === value.name) : null;
    if (!item || !optionAllowed(item, value.value, state.condition)) return result(state, item ? 'That choice is not available yet.' : 'Choose a listed control.', 'warning');
    if (state.config[item.name] === value.value) return result(state, 'That is already the setting.', 'info', {viewOnly:true});
    const hadReading = mission.tests.some(entry => isCurrent(mission, state, latestRun(state, entry.id)));
    state.config[item.name] = value.value; state.edits = Math.min(state.edits + 1, 100000);
    const next = normalizeFairState(id, state);
    return result(next, hadReading ? 'Setup changed. The last reading belongs to the old setup; run the test again for a current one.' : 'Setup changed. Run a test to see what it does.', 'info');
  }
  if (action === 'run') {
    if (!mission.tests.some(entry => entry.id === value)) return result(state, 'Choose a listed test.', 'warning');
    state.runs.push({n:(state.runs.at(-1)?.n || 0) + 1, test:value, condition:state.condition, config:{...state.config}});
    // Evidence ids name a run. Renumbering the log would point them at other runs, so it clears them.
    if (state.runs.length > RUN_LIMIT) {state.runs = state.runs.slice(-RUN_LIMIT); state.evidence = [];}
    const next = normalizeFairState(id, state), reading = readRun(mission, next.runs.at(-1));
    return result(next, reading.rows.map(item => item.label + ': ' + item.value).join('. ') + '. ' + reading.note, reading.ok ? 'success' : 'warning');
  }
  if (action === 'replay') {
    if (state.condition === 'replay') return result(state, 'The condition has already changed. Run a fresh test.', 'info', {viewOnly:true});
    if (!state.runs.length) return result(state, 'Run a first test in Try it before the condition changes, so you have a reading to compare.', 'warning');
    state.condition = 'replay'; Object.assign(state.config, mission.replay.patch || {});
    return result(normalizeFairState(id, {...state, evidence:[], decision:''}), mission.replay.text + ' Earlier readings are kept for comparison, but they are no longer current. Run a fresh test.', 'info');
  }
  if (action === 'evidence') {
    const view = fairView(id, state), item = view.evidence.find(entry => entry.id === value);
    if (!item) return result(state, 'That reading is not current. Select evidence from the latest tests.', 'warning');
    state.evidence = item.selected ? state.evidence.filter(entry => entry !== value) : [...state.evidence, value];
    return result(normalizeFairState(id, state), item.selected ? 'Evidence removed.' : 'Evidence selected: ' + item.label + ': ' + item.value + '.', 'info');
  }
  if (action === 'decide') {
    if (!DECISIONS.some(item => item.id === value)) return result(state, 'Choose open, hold or revise.', 'warning');
    state.decision = value;
    const view = fairView(id, state);
    return result(state, view.consistent ? 'Decision recorded: ' + value + '. It agrees with your selected evidence.' : 'Decision recorded: ' + value + '. ' + (view.blockers.at(-1) ? 'Still to do: ' + view.blockers.at(-1) + '.' : ''), view.consistent ? 'success' : 'info');
  }
  return result(state, 'Choose a displayed control.', 'info', {viewOnly:true});
}

export const HANDOFF_MINIMUM = 20;
/** Whether the record may be marked handed off. Visiting pages or replaying a game never satisfies this. */
export function fairCompletion(id, state, handoff) {
  const view = fairView(id, state);
  if (!view) return {ready:false, blockers:['this mission is not available']};
  const blockers = [...view.blockers];
  if (typeof handoff !== 'string' || handoff.trim().length < HANDOFF_MINIMUM || /_{3}/.test(handoff)) blockers.push(/_{3}/.test(String(handoff || '')) ? 'fill in the blanks in your handoff sentence' : 'write your handoff sentence for the next crew');
  return {ready:blockers.length === 0, blockers, station:view.station, decision:view.state.decision};
}

/** Saved work is data, never a trusted flag: completion is recomputed from the current evidence. */
export function normalizeFairRecord(scenario, value) {
  const r = plain(value) ? value : {}, text = (item, max) => typeof item === 'string' ? item.slice(0, max) : '';
  const state = normalizeFairState(scenario.id, r.state), notes = text(r.notes, 2000), completion = fairCompletion(scenario.id, state, notes), view = fairView(scenario.id, state);
  return {
    state, evidence:[], questions:[],
    events:Array.isArray(r.events) ? r.events.slice(-200).filter(event => event && typeof event === 'object' && typeof event.message === 'string').map(event => ({time:text(event.time, 40), message:text(event.message, 600), kind:['info', 'warning', 'success'].includes(event.kind) ? event.kind : 'info'})) : [],
    symptoms:'', notes, plan:text(r.plan, 600), reflection:text(r.reflection, 2000), ideaSaved:false,
    verified:!!view && view.met && view.replay && view.demonstrated, closed:r.closed === true && completion.ready,
    manual:Array.isArray(r.manual) ? [...new Set(r.manual.filter(item => typeof item === 'string' && /^[a-z-]{1,40}$/.test(item)))].slice(0, 40) : []
  };
}

const readingLines = reading => reading.rows.map(item => '  ' + item.label + ': ' + item.value + (item.ok === null ? '' : item.ok ? ' (meets target' + (item.target ? ': ' + item.target : '') + ')' : ' (misses target' + (item.target ? ': ' + item.target : '') + ')')).join('\n');
const setupLine = (mission, config) => mission.controls.map(item => item.label + ': ' + (item.options.find(([value]) => value === config[item.name])?.[1] || config[item.name])).join('; ');
/** Plain-text report. It reads the same view as the workbench, the text view and the fair map. */
export function fairReport(id, record) {
  const view = fairView(id, record?.state), mission = view?.mission;
  if (!mission) return 'This mission is not available.';
  const state = view.state, label = mission.predict.options.find(([value]) => value === state.predict)?.[1];
  const status = record?.closed ? 'HANDED OFF · ' + (state.decision || 'no decision').toUpperCase() : view.station === 'online' ? 'STATION ONLINE — NOT YET HANDED OFF' : 'IN PROGRESS';
  const lines = ['COLE LEARNING LABS — MISSION REPORT', mission.id + ' · ' + mission.title, 'Grades ' + mission.grade + ' · Networking pathway · The school tech fair', 'Status: ' + status, '',
    'GET THE BRIEF', 'Who needs help: ' + mission.person, mission.brief, 'Target: ' + mission.success, 'My prediction: ' + (label || 'Not chosen.') + (record?.plan ? '\nWhy: ' + record.plan : ''), '',
    'TRY IT AND PROVE IT · EVERY TEST I RAN'];
  if (view.baseline) lines.push('Baseline (' + view.baseline.label + ')', readingLines(view.baseline));
  if (!state.runs.length) lines.push('No tests run yet.');
  for (const run of state.runs) {const reading = readRun(mission, run), current = isCurrent(mission, state, run) && latestRun(state, run.test)?.n === run.n; lines.push('Test ' + run.n + ' · ' + reading.test.label + ' · ' + (run.condition === 'replay' ? 'after: ' + mission.replay.action : 'before the change') + (current ? ' · CURRENT' : ' · earlier reading, kept for comparison'), '  Setup: ' + setupLine(mission, run.config), readingLines(reading));}
  lines.push('', 'CHANGED CONDITION', view.replay ? mission.replay.text : 'Not changed yet.');
  if (view.demos.length) lines.push('', 'SHOWN SO FAR', ...view.demos.map(item => (item.done ? '[x] ' : '[ ] ') + item.label));
  lines.push('', 'EVIDENCE I SELECTED', ...(view.chosen.length ? view.chosen.map(item => '- ' + item.label + ': ' + item.value) : ['None selected from the current readings.']),
    '', 'DECISION FOR THE NEXT CREW', state.decision ? state.decision.toUpperCase() + (view.consistent ? ' (agrees with the current evidence)' : ' (does not yet agree with the current evidence)') : 'Not decided.',
    '', 'HANDOFF', record?.notes?.trim() || 'Not written.',
    '', 'STATION', {offline:'Offline: no test yet.', testing:'Testing: the target is not met yet.', ready:'The current evidence meets the target.', hold:'On hold: the current evidence misses the target.', online:'Online: the current evidence meets the target and the crew chose open.'}[view.station],
    '', 'Clues used: ' + state.clues + '. Clues and retries carry no penalty.',
    '', 'This is a simulated learning activity on fictional equipment. Nothing was sent to a real network. Work stays on this page unless you export it or turn on device saving.', '');
  return lines.join('\n');
}
