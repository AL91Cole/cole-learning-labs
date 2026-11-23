// The small network map used by the tech fair missions and the packet tracer, with its text view.
// Shared so the public tracer does not pull in the mission engine.
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
/** The fair map: a picture of the present setup. The text view beside it says the same thing. */
export function fairMapHTML(scene, title) {
  const at = Object.fromEntries(scene.nodes.map(([id, , x, y]) => [id, [x, y]]));
  const links = scene.links.filter(([a, b]) => at[a] && at[b]).map(([a, b, label]) => '<line x1="' + at[a][0] + '" y1="' + at[a][1] + '" x2="' + at[b][0] + '" y2="' + at[b][1] + '"/>' + (label ? '<text class="fair-map-link" x="' + (at[a][0] + at[b][0]) / 2 + '" y="' + ((at[a][1] + at[b][1]) / 2 - 8) + '" text-anchor="middle">' + esc(label) + '</text>' : '')).join('');
  const nodes = scene.nodes.map(([, label, x, y, state = '']) => {const shown = label.length > 25 ? label.slice(0, 24) + '…' : label, half = Math.min(88, Math.max(46, shown.length * 3.9 + 12)); return '<g class="fair-map-node' + (state ? ' is-' + state : '') + '"><rect x="' + (x - half) + '" y="' + (y - 20) + '" width="' + half * 2 + '" height="40" rx="8"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">' + esc(shown) + '</text></g>';}).join('');
  return '<svg class="fair-map" viewBox="-30 0 660 260" role="img" aria-label="' + esc(title) + '. The text view below lists the same devices and connections."><g class="fair-map-links">' + links + '</g>' + nodes + '</svg>';
}
export function fairMapText(scene) {
  const name = Object.fromEntries(scene.nodes.map(([id, label]) => [id, label])), state = {on:' (active)', off:' (off or not in use)', warn:' (check this)'};
  return '<ul class="fair-text-map">' + scene.nodes.map(([, label, , , mark = '']) => '<li>' + esc(label + (state[mark] || '')) + '</li>').join('') + scene.links.filter(([a, b]) => name[a] && name[b]).map(([a, b, label]) => '<li>' + esc(name[a] + ' connects to ' + name[b] + (label ? ' (' + label + ')' : '')) + '</li>').join('') + '</ul>';
}

