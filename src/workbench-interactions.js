/** Internal pointer/tap controls. A gesture requests a model action; it never edits equipment state. */
const FITS = Object.freeze({
  board: ['board-mount', 'install-board'], cpu: ['cpu-socket', 'install-cpu'],
  cooler: ['cooler-mount', 'install-cooler'], ram: ['dimm-a2', 'install-ram'],
  gpu: ['pcie-x16', 'install-gpu'], storage: ['sata-bay', 'install-drive'],
  atx: ['atx-24', 'connect-atx'], eps: ['eps-8', 'connect-cpu-power'],
  'gpu-power': ['gpu-6', 'connect-gpu-power'], sata: ['sata-data', 'connect-sata'],
  'sata-power': ['sata-power', 'connect-sata-power'], front: ['front-panel', 'connect-front-panel']
});
export const DRAG_THRESHOLD = 9;
// Re-rendering after a drop must not turn the browser's following pointer click into another action.
const dragClickGuards = new WeakMap();

export function workbenchDrop(source, socket) {
  if (source === 'nvme') return { ok:false, message:'This M.2 NVMe module does not fit this board’s SATA connectors. Nothing was changed. Compare the interface and preserve the original classroom drive.' };
  if (source === 'hdmi-pc' && ['video-board','video-gpu'].includes(socket)) return { ok:true, action:socket };
  if (source === 'hdmi-monitor' && socket === 'monitor-hdmi') return { ok:true, action:'connect-signal' };
  if (Object.hasOwn(FITS, source) && FITS[source][0] === socket) return { ok:true, action:FITS[source][1] };
  return { ok:false, message:'That connector does not match the selected part. Nothing was changed. Compare the part label with the socket label, or cancel and inspect it.' };
}

const validSource = id => Object.hasOwn(FITS, id) || ['hdmi-pc','hdmi-monitor','nvme'].includes(id);
const owned = (root, node, selector) => {
  const match = node?.closest?.(selector);
  return match && root.contains(match) ? match : null;
};

/** Returns an idempotent disposer. Sources and destinations come only from authored DOM controls. */
export function mountWorkbenchInteractions(root, { onAction, onMessage } = {}) {
  if (!root?.addEventListener || !root.ownerDocument?.addEventListener) return () => {};
  const doc = root.ownerDocument, view = doc.defaultView;
  let selected = null, pointer = null, ghost = null, disposed = false, suppressClick = false;
  const listeners = [];
  const listen = (target, type, fn, options) => { target?.addEventListener?.(type, fn, options); listeners.push(() => target?.removeEventListener?.(type, fn, options)); };
  const sources = () => [...root.querySelectorAll('[data-hw-pick]')];
  const sockets = () => [...root.querySelectorAll('[data-hw-socket]')];
  function say(message, kind = 'info') {
    const status = root.querySelector('[data-hw-manipulation-status]');
    if (status) { status.textContent = message; status.dataset.kind = kind; }
    onMessage?.(message, kind);
  }
  function paint() {
    for (const source of sources()) {
      const picked = source === selected;
      source.setAttribute('aria-pressed', String(picked));
      source.classList.toggle('hw-picked', picked);
    }
    for (const socket of sockets()) socket.classList.toggle('hw-socket-compatible', !!selected && workbenchDrop(selected.dataset.hwPick, socket.dataset.hwSocket).ok);
    const cancel = root.querySelector('[data-hw-cancel-pick]');
    if (cancel) cancel.hidden = !selected;
    root.classList?.toggle('hw-holding-part', !!selected);
  }
  function releasePointer() {
    const previous = pointer;
    pointer = null;
    if (previous?.captured) {
      try { if (previous.source.hasPointerCapture?.(previous.id)) previous.source.releasePointerCapture(previous.id); } catch { /* A removed element may already have released capture. */ }
    }
    ghost?.remove(); ghost = null;
    for (const socket of sockets()) socket.classList.remove('hw-socket-hover');
    root.classList?.remove('hw-dragging-part');
  }
  function cancel(message = 'Part returned to the tray. Nothing was changed.') {
    releasePointer(); selected = null; paint(); say(message);
  }
  function pick(source) {
    if (source.disabled || source.getAttribute('aria-disabled') === 'true' || !validSource(source.dataset.hwPick)) return;
    selected = source; paint();
    const alternatives = root.querySelector('[data-hw-target-list]');
    if (alternatives) alternatives.open = true;
    say(`${source.dataset.hwPickLabel || 'Part'} selected. Drag it to a matching labeled socket, or tap a socket. Keyboard: Tab to a socket and press Enter or Space; Escape cancels.`);
  }
  function socketAt(x, y) {
    const elements = doc.elementsFromPoint?.(x, y) || [doc.elementFromPoint?.(x, y)];
    for (const element of elements) {
      const socket = owned(root, element, '[data-hw-socket]');
      if (socket) return socket;
    }
    return null;
  }
  function complete(socket) {
    if (!selected || !socket) return;
    const sourceId = selected.dataset.hwPick, sourceLabel = selected.dataset.hwPickLabel || 'Part';
    const decision = workbenchDrop(sourceId, socket.dataset.hwSocket);
    releasePointer();
    if (!decision.ok) { paint(); say(decision.message, 'warning'); return; }
    selected = null; paint();
    // onAction applies the existing safety/fit-order checks and may synchronously re-render this root.
    const result = onAction?.(decision.action);
    say(result?.message || `${sourceLabel}: connection requested. Read the equipment result before testing.`, result?.kind || 'info');
  }
  function down(event) {
    if (disposed) return;
    if (pointer && (event.pointerId !== pointer.id || event.isPrimary === false)) { cancel('Gesture cancelled. Use one pointer at a time; nothing was changed.'); return; }
    if (event.isPrimary === false || event.button !== 0 || pointer) return;
    suppressClick = false; dragClickGuards.delete(root);
    const source = owned(root, event.target, '[data-hw-pick]');
    if (!source || source.disabled || !validSource(source.dataset.hwPick)) return;
    // The rest of a touch card is a normal vertical scrolling surface. Tap still picks it up.
    if (['touch','pen'].includes(event.pointerType) && !event.target?.closest?.('[data-hw-drag-handle]')) return;
    pointer = { id:event.pointerId, source, x:event.clientX, y:event.clientY, moved:false, captured:false };
  }
  function move(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!pointer.moved && Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y) < DRAG_THRESHOLD) return;
    if (!pointer.moved) {
      pointer.moved = true; pick(pointer.source); root.classList?.add('hw-dragging-part');
      try { pointer.source.setPointerCapture?.(pointer.id); pointer.captured = true; } catch { /* Document listeners also complete a drag without capture. */ }
      ghost = doc.createElement('div'); ghost.className = 'hw-drag-ghost'; ghost.setAttribute('aria-hidden','true');
      ghost.textContent = pointer.source.dataset.hwPickLabel || 'Virtual part'; root.appendChild(ghost);
    }
    if (event.cancelable) event.preventDefault();
    ghost.style.left = `${event.clientX + 14}px`; ghost.style.top = `${event.clientY + 14}px`;
    const over = socketAt(event.clientX,event.clientY);
    for (const socket of sockets()) socket.classList.toggle('hw-socket-hover',socket === over);
  }
  function up(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const moved = pointer.moved;
    const socket = moved ? socketAt(event.clientX,event.clientY) : null;
    releasePointer();
    if (!moved) return; // The native click below performs tap-to-pick.
    if (event.cancelable) event.preventDefault();
    suppressClick = true;
    if (socket) complete(socket);
    else cancel('Drop cancelled outside a socket. The part is back in the tray; nothing was changed.');
    dragClickGuards.set(root,Date.now());
  }
  function click(event) {
    const lastDrag = dragClickGuards.get(root);
    if ((suppressClick || (lastDrag && Date.now()-lastDrag<750)) && event.detail !== 0) { suppressClick = false; dragClickGuards.delete(root); event.preventDefault(); event.stopImmediatePropagation(); return; }
    const cancelControl = owned(root,event.target,'[data-hw-cancel-pick]');
    if (cancelControl) { event.preventDefault(); event.stopImmediatePropagation(); cancel(); return; }
    const source = owned(root,event.target,'[data-hw-pick]');
    if (source) { event.preventDefault(); event.stopImmediatePropagation(); if (selected === source) cancel(); else pick(source); return; }
    const socket = owned(root,event.target,'[data-hw-socket]');
    if (socket && selected) { event.preventDefault(); event.stopImmediatePropagation(); complete(socket); }
  }
  function key(event) {
    if (event.key === 'Escape' && (pointer || selected)) { event.preventDefault(); event.stopImmediatePropagation(); cancel(); return; }
    if (!['Enter',' '].includes(event.key)) return;
    const source = owned(root,event.target,'[data-hw-pick]');
    const socket = owned(root,event.target,'[data-hw-socket]');
    if (source) { event.preventDefault(); event.stopImmediatePropagation(); if (selected === source) cancel(); else pick(source); }
    else if (socket && selected) { event.preventDefault(); event.stopImmediatePropagation(); complete(socket); }
  }
  const interrupted = event => { if (pointer && (event.pointerId === undefined || event.pointerId === pointer.id)) cancel('Gesture cancelled. Nothing was changed.'); };
  listen(root,'pointerdown',down,true);
  listen(doc,'pointermove',move,{capture:true,passive:false});
  listen(doc,'pointerup',up,true);
  listen(doc,'pointercancel',interrupted,true);
  listen(root,'lostpointercapture',interrupted,true);
  listen(root,'click',click,true);
  listen(root,'keydown',key,true);
  listen(view,'blur',() => { if (pointer || selected) cancel(); });
  // Ignore dragged text, images, files and external/native HTML drag payloads.
  listen(root,'dragstart',event => { if (owned(root,event.target,'[data-hw-pick]')) event.preventDefault(); },true);
  paint();
  const dispose = () => {
    if (disposed) return;
    disposed = true; releasePointer(); selected = null; paint();
    for (const remove of listeners) remove();
  };
  dispose.cancel = () => { if (!disposed && (pointer || selected)) cancel(); };
  return dispose;
}
