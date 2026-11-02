// Public metadata only. Each entry is a separately authored, playable challenge.
export const ARCADE_CATALOG=Object.freeze([
  ['packet-post','Packet Post','network','4–6','Rotate paths and deliver a packet to the library.'],
  ['gateway-garden','Gateway Garden','network','7–8','Carry a packet through a gateway to another network.'],
  ['vlan-village','VLAN Village','network','7–8','Reach the guest library without entering the staff zone.'],
  ['resilient-ring','Resilient Ring','network','9–12','Build a working detour around a failed link.'],
  ['hop-count-hike','Hop Count Hike','network','7–8','Deliver before the packet uses its hop allowance.'],
  ['budget-bot','Budget Bot','hardware','4–6','Build a working pretend PC within a token budget.'],
  ['quiet-cube','Quiet Cube','hardware','7–8','Balance cooling, noise and cost.'],
  ['memory-match','Memory Match','hardware','7–8','Choose enough compatible memory for a creative workstation.'],
  ['pixel-stage','Pixel Stage','hardware','9–12','Power a dedicated graphics card and the matching display output.'],
  ['archive-rover','Archive Rover','hardware','7–8','Keep the original files while building a working machine.'],
  ['permission-park','Permission Park','security','4–6','Let authorized readers in while stopping unnecessary access.'],
  ['firewall-fort','Firewall Fort','security','7–8','Keep the class portal open while stopping legacy traffic.'],
  ['factor-watch','Factor Watch','security','7–8','Admit verified requests without accepting a password alone.'],
  ['backup-bunker','Backup Bunker','security','9–12','Protect a clean backup and preserve authorized recovery.'],
  ['update-harbor','Update Harbor','security','9–12','Admit reviewed packages to a small pilot.'],
  ['shape-sprouts','Shape Sprouts','ai','K–3','Sort by shape rather than a distracting color.'],
  ['evidence-orbit','Evidence Orbit','ai','4–6','Bring claims to the evidence station they belong in.'],
  ['privacy-picnic','Privacy Picnic','ai','4–6','Pack a practice activity without private information.'],
  ['prompt-reef','Prompt Reef','ai','7–8','Rescue useful facts from instructions hidden in source cards.'],
  ['fairness-fair','Fairness Fair','ai','9–12','Apply the same fictional rule to matching cases.'],
  ['garden-rover','Garden Rover','coding','K–3','Program a rover to collect seeds and reach home.'],
  ['loop-lagoon','Loop Lagoon','coding','4–6','Use repeat blocks to fit the route into four instructions.'],
  ['branch-bridge','Branch Bridge','coding','7–8','Use one conditional program in two different rooms.'],
  ['delivery-drone','Delivery Drone','coding','7–8','Collect every parcel within an energy allowance.'],
  ['bug-trail','Bug Trail','coding','4–6','Repair a broken route and test the new program.']
].map(([id,title,track,grade,summary],index)=>Object.freeze({id,title,track,grade,summary,minutes:10,access:index%5===0?'free':'member'})));
export const FREE_ARCADE_IDS=Object.freeze(['packet-post','budget-bot','permission-park','shape-sprouts','garden-rover']);
export const arcadeMeta=id=>typeof id==='string'?ARCADE_CATALOG.find(game=>game.id===id)||null:null;
