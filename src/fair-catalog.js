// Public metadata for the grades 7–12 Networking pathway ("the school tech fair").
// Titles, crew jobs, skills and times only: the mission models, readings and feedback
// are delivered separately with the investigation routes (src/fair-missions.js).
// A fair mission is its own activity with its own id and record. `legacy` names the
// original investigation it grew from; that investigation keeps its id, URL and saved work.
const mission = (id, slug, legacy, band, order, title, crew, skill, strand) => Object.freeze({id, slug, legacy, band, order, title, crew, skill, minutes:40, strand});

export const FAIR_BANDS = Object.freeze([
  Object.freeze({id:'7-8', grade:'7–8', title:'Get the gym connected', summary:'Wire a booth, follow a photo, fix a frozen camera and pass a note in the pit.', owns:'The robot camera'}),
  Object.freeze({id:'9-10', grade:'9–10', title:'Run the fair services', summary:'Bring back a lost name, find room for 50 teams, share the scores safely and follow a camera into the hall.', owns:'Guest scores'}),
  Object.freeze({id:'11-12', grade:'11–12', title:'Keep the show on air', summary:'Pick the alert that matters, save the commentary, connect a remote judge and design next year’s venue.', owns:'All four stations and the rollback decision'})
]);

export const FAIR_CATALOG = Object.freeze([
  mission('FAIR-208', 'sticker-booth', 'NET-208', '7-8', 1, 'Wire the sticker booth', 'Give two artists their own connection to the booth.', 'Tell a separate cable from a shared one', 'ISSC231'),
  mission('FAIR-215', 'winning-photo', 'NET-215', '7-8', 2, 'Follow the winning photo', 'Trace one photo from the booth to the photo wall.', 'Spot which addresses change at a hop', 'ISSC231'),
  mission('FAIR-204', 'frozen-robot-cam', 'NET-204', '7-8', 3, 'The frozen robot cam', 'Get the robot’s camera feed past the blue line.', 'Read three counters before deciding', 'ISSC343'),
  mission('FAIR-217', 'pit-note', null, '7-8', 4, 'Pass a note in the pit', 'Send the lineup to a teammate and to the scoreboard.', 'Compare a direct link with an access point', 'ISSC343'),
  mission('FAIR-201', 'scoreboard-name', 'NET-201', '9-10', 1, 'The scoreboard lost its name', 'Get a kiosk to find the scoreboard by name again.', 'Separate a name lookup from a service', 'ISSC231'),
  mission('FAIR-209', 'fifty-teams', 'NET-209', '9-10', 2, 'Find room for 50 teams', 'Pick an address block that fits every team.', 'Count usable addresses in a block', 'ISSC231'),
  mission('FAIR-210', 'crowd-scores', 'NET-210', '9-10', 3, 'Give the crowd the scores', 'Let visitors see scores and nothing else.', 'Test an allowed path and a blocked path', 'ISSC421'),
  mission('FAIR-218', 'hall-camera', null, '9-10', 4, 'Follow the camera into the hall', 'Keep the camera connected through the doorway.', 'Compare placements with packet counts', 'ISSC343'),
  mission('FAIR-216', 'alert-crew', 'NET-216', '11-12', 1, 'Pick the alert that needs a crew', 'Decide which alert is worth sending a crew to.', 'Turn two counter readings into a rate', 'ISSC231'),
  mission('FAIR-213', 'live-commentary', 'NET-213', '11-12', 2, 'Save the live commentary', 'Stop the commentary audio from breaking up.', 'Test two fixes separately, then together', 'ISSC231'),
  mission('FAIR-211', 'remote-judge', 'NET-211', '11-12', 3, 'Connect the remote judge', 'Let one approved judge score from home.', 'Tell a tunnel, a firewall rule and a role apart', 'ISSC421'),
  mission('FAIR-214', 'next-venue', 'NET-214', '11-12', 4, 'Design next year’s venue', 'Size the network for a bigger venue and plan the way back.', 'Check capacity, paths and a rollback', 'ISSC231')
]);

export const FAIR_CAPSTONE = Object.freeze({id:'FAIR-600', slug:'opening-day', title:'Opening day at the tech fair', minutes:40, crew:'Open each station only when its evidence is ready.', skill:'Decide open, hold or revise for each station'});

export const FAIR_IDS = Object.freeze(FAIR_CATALOG.map(item => item.id));
/** The sample mission that stays playable in the restricted preview. Every other mission is member content there. */
export const FREE_FAIR_IDS = Object.freeze(['FAIR-204']);
export const fairMeta = id => FAIR_CATALOG.find(item => item.id === id) || null;
export const fairBand = id => FAIR_BANDS.find(band => band.id === id) || null;
export const fairBandMissions = band => FAIR_CATALOG.filter(item => item.band === band).sort((a, b) => a.order - b.order);
/** Record-bearing activities in this pathway: twelve missions and the shared capstone. */
export const FAIR_RECORDS = Object.freeze([...FAIR_CATALOG.map(item => Object.freeze({id:item.id, title:item.title, track:'network', grade:fairBand(item.band).grade, minutes:item.minutes, fair:true})), Object.freeze({id:FAIR_CAPSTONE.id, title:FAIR_CAPSTONE.title, track:'network', grade:'7–12', minutes:FAIR_CAPSTONE.minutes, fair:true, capstone:true})]);
export const isFairId = id => typeof id === 'string' && FAIR_RECORDS.some(item => item.id === id);
/** Short addresses a teacher can assign: /networking/<slug> forwards to the mission. */
export const FAIR_SLUGS = Object.freeze(Object.fromEntries([...FAIR_CATALOG.map(item => [item.slug, '#lab/' + item.id + '/request']), [FAIR_CAPSTONE.slug, '#networking/opening-day']]));

// Where each mission points next. Original investigations and games keep their own ids and routes.
export const FAIR_FOLLOW_UPS = Object.freeze({
  'FAIR-208':[['#arcade/gateway-garden', 'Gateway Garden', 'game']],
  'FAIR-215':[['#lab/NET-207', 'NET-207 · Follow a Classroom Message', 'investigation'], ['#networking/trace', 'Trace a packet', 'practice'], ['#arcade/hop-count-hike', 'Hop Count Hike', 'game']],
  'FAIR-204':[['#practice/NET-204', 'Wireless practice workbench', 'practice']],
  'FAIR-217':[['#studio/network', 'Network Studio', 'studio']],
  'FAIR-201':[['#practice/NET-201', 'Addressing practice workbench', 'practice']],
  'FAIR-209':[['#arcade/gateway-garden', 'Gateway Garden', 'game'], ['#studio/network', 'Network Studio', 'studio']],
  'FAIR-210':[['#arcade/vlan-village', 'VLAN Village', 'game']],
  'FAIR-218':[['#practice/NET-204', 'Wireless practice workbench', 'practice']],
  'FAIR-216':[['#lab/NET-212', 'NET-212 · Find the Broken WAN Path', 'investigation'], ['#arcade/resilient-ring', 'Resilient Ring', 'game']],
  'FAIR-213':[['#practice/NET-213', 'Call-quality practice workbench', 'practice']],
  'FAIR-211':[['#arcade/vlan-village', 'VLAN Village', 'game']],
  'FAIR-214':[['#studio/network', 'Network Studio', 'studio'], ['#arcade/resilient-ring', 'Resilient Ring', 'game']]
});
/** The Packet Simulator starter that matches a mission. Practice there never changes the mission's record. */
export const FAIR_SIM_STARTERS = Object.freeze({'FAIR-208':'booth', 'FAIR-215':'booth-router', 'FAIR-210':'guest'});
/** Operating-system and support investigations that sit beside the fair, not inside it. */
export const SYSTEMS_SUPPORT = Object.freeze([
  ['NET-202', 'The Share That Will Not Open'], ['NET-203', 'Startup Crash & Broken Update Service'],
  ['NET-205', 'The Stalled Print Queue'], ['NET-206', 'Backup Restore & File Integrity']
]);
