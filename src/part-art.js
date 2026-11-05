// Reviewed component pictures for the hardware labs. Each entry points at a
// published file under assets/ and carries human-written alternative text.
// Pictures are generated with scripts/generate-component-art.mjs, reviewed by
// the owner, and only then added here; the build publishes exactly this list.
const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

/** Alternative text describes what the picture shows, not what the learner should conclude. */
export const PART_ART_ALT=Object.freeze({
  panel:'Side panel of a desktop computer case: a flat black steel cover with a block of ventilation slots and two thumbscrews on its back edge, shown detached and standing upright.',
  psu:'Desktop power supply: a sealed metal box with a fan grille on one face and a bundle of cables leaving the other.',
  board:'Motherboard: a large circuit board with a square processor socket, four long memory slots and horizontal expansion slots.',
  cpu:'Processor: a small square chip with a flat silver metal lid and a green edge, lying next to its open motherboard socket; the socket holds a grid of tiny pins and a metal retention lever.',
  paste:'Thermal paste: a small syringe of grey paste beside a processor with a pea-sized dot of paste in the centre of its metal lid.',
  cooler:'Processor cooler: a block of metal fins with a fan on top and a thin fan cable with a small plug.',
  ram:'DDR4 memory module: a long thin circuit board with black memory chips and a notched gold edge connector.',
  gpu:'Graphics card: a circuit board in a plastic shroud with two fans and a metal bracket with video ports.',
  ssd:'Solid-state drive: a flat rectangular grey metal case with a narrow data socket and a wider power socket side by side on one short edge.',
  cables:'Three computer leads side by side: a thin flat red SATA data cable with L-shaped plugs, a black SATA power lead with wide flat plugs, and a white 24-pin motherboard power plug with a bundle of yellow, red, orange and black wires.',
  monitor:'Desktop monitor on a stand with a plain black bezel, the screen switched off, turned so a small video socket on the back is visible.',
  'network-device':'A plain black desktop computer tower beside a monitor with a dark screen, a keyboard and a mouse on a desk.',
  'network-cable':'A coiled blue ethernet cable with a clear plastic RJ45 plug and clip at each end.',
  'network-switch':'A small flat network switch with a row of eight sockets along the front, each with a tiny green link light; blue and grey cables are plugged into the first two.',
  'network-router':'A small dark router with two upright antennas, a row of five ethernet sockets and three green status lights on the back.',
  'security-mfa':'A smartphone lying on a desk showing an authenticator-style screen: one entry with six grey dots in place of the code and a circular countdown ring.',
  'security-identity':'A plain white ID badge on a teal lanyard with a grey head-and-shoulders silhouette where the photo would be and blank bars where the name would be.',
  'security-scope':'A clipboard holding a permission form with blank lines, an empty checkbox and a signature in the signature box, with a pen resting on it.',
  'security-phishing':'A browser window showing a look-alike school portal sign-in page titled Cole Learning Labs Portal; the address bar reads http://cole-learning-labs-portal.secure-login-check.net and is marked Not secure.',
  'pathway-hardware':'A school IT workbench with an open desktop computer on an anti-static mat, a memory module and a screwdriver beside it, and a monitor with a dark screen behind.',
  'pathway-network':'A corner of a school network closet: an open rack with a patch panel, a switch with blue and green link lights, bundled blue and yellow cables, and a laptop on a rolling cart.',
  'pathway-ai':'A student desk with a laptop showing a chat-style window of empty speech bubbles, a stack of printed pages with highlighter marks, a magnifying glass and a pencil.',
  'pathway-security':'A desk with a laptop showing a large padlock icon, a smartphone showing six dots and a countdown ring, and a small hardware security key on a lanyard.',
  'pathway-coding':'A student desk with a laptop showing a code editor of colourful blurred lines, a notebook with a hand-drawn flowchart, a pencil and a small toy robot.',
  'scene-board-map':'Flat drawing of a motherboard seen from above with no text: a square processor socket near the top centre, four memory slots on the right, three long expansion slots at the lower left, a tall power plug on the right edge, four small storage sockets at the bottom right and a cluster of ports along the left edge.',
  'scene-network-closet':'A dim school server closet: an open rack with a patch panel, a switch with blue and green link lights and a small backup power unit below it, bundled blue and yellow cables, a metal shelf with boxes, one warm ceiling light and a door standing open.',
  'scene-lab':'A bright school technology lab with nobody in it: a workbench in front holding an open desktop computer, a monitor, a screwdriver and a memory module; a small network rack with a glowing switch on the left; rows of desks with closed laptops behind.'
});
// PART_ART_START (managed by scripts/generate-component-art.mjs --finalize)
export const PART_ART=Object.freeze({
  board:'assets/part-board.webp',
  cables:'assets/part-cables.webp',
  cooler:'assets/part-cooler.webp',
  cpu:'assets/part-cpu.webp',
  gpu:'assets/part-gpu.webp',
  monitor:'assets/part-monitor.webp',
  'network-cable':'assets/part-network-cable.webp',
  'network-device':'assets/part-network-device.webp',
  'network-router':'assets/part-network-router.webp',
  'network-switch':'assets/part-network-switch.webp',
  panel:'assets/part-panel.webp',
  paste:'assets/part-paste.webp',
  'pathway-ai':'assets/part-pathway-ai.webp',
  'pathway-coding':'assets/part-pathway-coding.webp',
  'pathway-hardware':'assets/part-pathway-hardware.webp',
  'pathway-network':'assets/part-pathway-network.webp',
  'pathway-security':'assets/part-pathway-security.webp',
  psu:'assets/part-psu.webp',
  ram:'assets/part-ram.webp',
  'scene-board-map':'assets/part-scene-board-map.webp',
  'scene-lab':'assets/part-scene-lab.webp',
  'scene-network-closet':'assets/part-scene-network-closet.webp',
  'security-identity':'assets/part-security-identity.webp',
  'security-mfa':'assets/part-security-mfa.webp',
  'security-phishing':'assets/part-security-phishing.webp',
  'security-scope':'assets/part-security-scope.webp',
  ssd:'assets/part-ssd.webp'
});
// PART_ART_END
export const PART_ART_IDS=Object.freeze(Object.keys(PART_ART_ALT));

/** A scene or pathway picture as a bare image, or an empty string when none has been reviewed.
 * Decorative pictures sit beside text that already says what they show. */
export function sceneArtHTML(id,{className='',decorative=false}={}){
  if(typeof id!=='string'||!Object.hasOwn(PART_ART,id)||!Object.hasOwn(PART_ART_ALT,id))return '';
  const file=PART_ART[id];
  if(typeof file!=='string'||!/^assets\/part-[a-z-]+\.(?:webp|png)$/u.test(file))return '';
  return '<img class="scene-art'+(className?' '+esc(className):'')+'" src="'+esc(file)+'" loading="lazy" decoding="async" alt="'+(decorative?'':esc(PART_ART_ALT[id]))+'">';
}

/** The picture for a part, or an empty string when none has been reviewed. */
export function partArtHTML(id,{caption=true}={}){
  if(typeof id!=='string'||!Object.hasOwn(PART_ART,id)||!Object.hasOwn(PART_ART_ALT,id))return '';
  const file=PART_ART[id];
  if(typeof file!=='string'||!/^assets\/part-[a-z-]+\.(?:webp|png)$/u.test(file))return '';
  return '<figure class="part-art"><img src="'+esc(file)+'" width="512" height="512" loading="lazy" decoding="async" alt="'+esc(PART_ART_ALT[id])+'">'+(caption?'<figcaption>What a real one looks like. The lab picture is a simplified drawing.</figcaption>':'')+'</figure>';
}
