// Header category menus. CSS alone opens a category on hover or keyboard focus. This module adds what CSS cannot:
// Escape, putting a category away once it is dismissed, tap-to-open inside a stacked small-screen menu, and a
// truthful aria-expanded. It reads nothing, stores nothing and makes no requests.
export function bindNavGroups(nav, {document: doc = globalThis.document, stacked = () => false} = {}) {
  const groups = [...(nav?.querySelectorAll?.('.nav-group') || [])];
  const nameOf = group => group.querySelector('.nav-group-name');
  const shown = group => stacked() ? group.classList.contains('expanded') : !group.classList.contains('dismissed') && group.matches(':hover,:focus-within');
  const sync = group => nameOf(group)?.setAttribute('aria-expanded', String(shown(group)));
  const close = group => { group.classList.remove('expanded'); if (!stacked()) group.classList.add('dismissed'); sync(group); };
  const restore = group => { group.classList.remove('dismissed'); sync(group); };
  for (const group of groups) {
    const name = nameOf(group); let wasShown = false;
    sync(group);
    group.addEventListener('pointerenter', () => sync(group));
    // A mouse press leaves focus on the name; without this the category would stay open after the pointer moves away.
    group.addEventListener('pointerleave', event => { if (event.pointerType !== 'mouse') return; if (doc.activeElement === name) name.blur(); restore(group); });
    group.addEventListener('focusin', () => sync(group));
    group.addEventListener('focusout', event => { if (!group.contains(event.relatedTarget) && !group.matches(':hover')) group.classList.remove('dismissed'); setTimeout(() => sync(group), 0); });
    name.addEventListener('pointerdown', () => { wasShown = doc.activeElement === name && shown(group); });
    name.addEventListener('click', event => {
      if (stacked()) { const open = !group.classList.contains('expanded'); groups.forEach(other => { other.classList.remove('expanded', 'dismissed'); }); group.classList.toggle('expanded', open); groups.forEach(sync); return; }
      // Keyboard: Enter or Space opens and closes. Pointer: hover already opened it, so only a second press closes.
      const shut = event.detail === 0 ? shown(group) : wasShown; wasShown = false;
      if (shut) close(group); else { name.focus({preventScroll: true}); restore(group); }
    });
  }
  // Escape puts away whichever category is showing, whether hover or focus opened it and wherever the focus is.
  // The pointer does not have to move. Focus inside the category returns to its name.
  doc?.addEventListener?.('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const group = groups.find(shown);
    if (!group) return;
    event.preventDefault();
    if (group.contains(doc.activeElement)) nameOf(group)?.focus({preventScroll: true});
    close(group);
  });
  return {groupOf: target => { const group = target?.closest?.('.nav-group'); return group && nav.contains(group) ? group : null; }, shown, close};
}
// Pages that are plain documents load this file on its own. The home page application binds its own header.
if (typeof document !== 'undefined') { const nav = document.querySelector('.school-header nav'); if (nav) bindNavGroups(nav); }
