// Reviewed component pictures for the hardware labs. Each entry points at a
// published file under assets/ and carries human-written alternative text.
// Pictures are generated with scripts/generate-component-art.mjs, reviewed by
// the owner, and only then added here; the build publishes exactly this list.
const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

/** Alternative text describes what the picture shows, not what the learner should conclude. */
export const PART_ART_ALT=Object.freeze({
  panel:'Desktop computer case seen from the side: the flat silver side panel is fitted and held by screws along its edges, with a vent near the bottom.',
  psu:'Desktop power supply: a sealed metal box with a fan grille on one face and a bundle of cables leaving the other.',
  board:'Motherboard: a large circuit board with a square processor socket, four long memory slots and horizontal expansion slots.',
  cpu:'Processor: a small square part with a flat brushed-metal top and a thin green circuit-board edge, lying flat on its own.',
  paste:'Thermal paste: a small syringe of grey paste beside a thin spread of paste on a processor lid.',
  cooler:'Processor cooler: a block of metal fins with a fan on top and a thin fan cable with a small plug.',
  ram:'DDR4 memory module: a long thin circuit board with black memory chips and a notched gold edge connector.',
  gpu:'Graphics card: a circuit board in a plastic shroud with two fans and a metal bracket with video ports.',
  ssd:'Solid-state drive: a flat rectangular grey metal case with a row of gold contacts in a socket on one short edge.',
  cables:'Three computer leads side by side: a thin red SATA data cable, a black SATA power lead and a white 24-pin motherboard power plug with a bundle of coloured wires.',
  monitor:'Desktop monitor on a stand with a plain black bezel, the screen switched off and a small video socket on its lower edge.'
});
// PART_ART_START (managed by scripts/generate-component-art.mjs --finalize)
export const PART_ART=Object.freeze({
  board:'assets/part-board.webp',
  cables:'assets/part-cables.webp',
  cooler:'assets/part-cooler.webp',
  cpu:'assets/part-cpu.webp',
  gpu:'assets/part-gpu.webp',
  monitor:'assets/part-monitor.webp',
  panel:'assets/part-panel.webp',
  paste:'assets/part-paste.webp',
  psu:'assets/part-psu.webp',
  ram:'assets/part-ram.webp',
  ssd:'assets/part-ssd.webp'
});
// PART_ART_END
export const PART_ART_IDS=Object.freeze(Object.keys(PART_ART_ALT));

/** The picture for a part, or an empty string when none has been reviewed. */
export function partArtHTML(id,{caption=true}={}){
  if(typeof id!=='string'||!Object.hasOwn(PART_ART,id)||!Object.hasOwn(PART_ART_ALT,id))return '';
  const file=PART_ART[id];
  if(typeof file!=='string'||!/^assets\/part-[a-z-]+\.(?:webp|png)$/u.test(file))return '';
  return '<figure class="part-art"><img src="'+esc(file)+'" width="512" height="512" loading="lazy" decoding="async" alt="'+esc(PART_ART_ALT[id])+'">'+(caption?'<figcaption>What a real one looks like. The lab picture is a simplified drawing.</figcaption>':'')+'</figure>';
}
