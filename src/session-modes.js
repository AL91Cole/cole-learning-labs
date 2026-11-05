// Classroom link modes, chosen by the page address a teacher shares:
//   /?mode=student   hides portfolio pages and turns off links to other websites.
//   /?cart=true      shared-device session: nothing is read from or written to
//                    device storage, and the page clears after a period without activity.
// Both modes only restrict this page. They never unlock an activity, confer
// membership, send a request or store anything, and they end when the site is
// opened without them. They are a classroom convenience, not a content filter
// or a device policy: district filtering and managed-device settings stay in charge.
export const CART_IDLE_MS = 40 * 60 * 1000;
export const CART_WARNING_MS = 2 * 60 * 1000;
const CART_OFF = new Set(['false', '0', 'off', 'no']);
const STUDENT_HIDDEN_PAGES = new Set(['projects', 'about', 'connect', 'educators', 'signin', 'membership']);
// Same-site pages a learner may still need: the AI-use notice, the data-practices page
// linked beside optional sharing choices, and the local report tool.
const STUDENT_SITE_PAGES = new Set(['/ai-use-notice', '/ai-use-notice.html', '/compliance', '/compliance.html', '/secure-reports', '/secure-reports.html']);
const STANDALONE_CONTROL = '.button,.text-link,.lab-tool,.pathway-card,#site-nav a,.footer-links a';
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'input', 'scroll'];

/** Read the modes from `location.search`. A mistyped shared-device value still protects. */
export function sessionModes(search) {
  let params;
  try { params = new URLSearchParams(String(search ?? '')); } catch { params = new URLSearchParams(); }
  const student = params.getAll('mode').some(value => value.trim().toLowerCase() === 'student');
  const cartValues = params.getAll('cart');
  const cart = cartValues.length > 0 && !cartValues.every(value => CART_OFF.has(value.trim().toLowerCase()));
  return Object.freeze({student, cart});
}

export const studentHidesPage = page => STUDENT_HIDDEN_PAGES.has(page);

/** Decide what student mode does with one link: 'keep', 'hide' (a hidden page) or 'off' (leaves the labs). */
export function studentLinkAction(href, base) {
  let url, home;
  try { home = new URL(base); url = new URL(href, home); } catch { return 'off'; }
  if (url.protocol === 'blob:') return 'keep'; // a report the learner chose to download
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'off';
  if (url.origin !== home.origin) return 'off';
  if (url.pathname === home.pathname) return studentHidesPage(url.hash.replace(/^#/, '').split(/[/?]/)[0]) ? 'hide' : 'keep';
  return STUDENT_SITE_PAGES.has(url.pathname.replace(/\/$/, '')) ? 'keep' : 'hide';
}

/**
 * Inactivity bookkeeping with no timers or DOM, so it can be tested with a fake clock.
 * `check()` runs on a timer and when the page becomes visible; `activity()` runs on input.
 * Activity that arrives after the limit clears first, so a device woken by the next
 * class never keeps the previous class's work.
 */
export function createIdleWatch({now = () => Date.now(), idleMs = CART_IDLE_MS, warningMs = CART_WARNING_MS, onWarn, onResume, onExpire} = {}) {
  let last = now(), warned = false;
  const resume = () => { if (warned) { warned = false; onResume?.(); } };
  function check() {
    const idle = now() - last;
    if (idle >= idleMs) { warned = false; last = now(); onExpire?.(); return 'expired'; }
    if (idle >= idleMs - warningMs) { warned = true; onWarn?.(idleMs - idle); return 'warning'; }
    resume();
    return 'active';
  }
  function activity() {
    if (now() - last >= idleMs) return check();
    last = now(); resume();
    return 'active';
  }
  return {check, activity, get warned() { return warned; }};
}

function applyStudentLink(anchor, base) {
  const href = anchor.getAttribute('href');
  if (href === null) return;
  const action = studentLinkAction(href, base);
  if (action === 'keep') return;
  // A button or menu entry with nowhere to go is removed rather than left as dead text.
  if (anchor.matches(STANDALONE_CONTROL)) { anchor.hidden = true; return; }
  // Inside a sentence the words stay readable; only the way out is removed.
  anchor.removeAttribute('href'); anchor.removeAttribute('target');
  anchor.setAttribute('role', 'link'); anchor.setAttribute('aria-disabled', 'true');
  anchor.classList.add('student-link-off');
  anchor.title = 'This link is turned off in student mode.';
}

const element = (doc, tag, className, text) => { const node = doc.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; };

/**
 * Show the mode strip and start the chosen modes. `onClear(reason)` must empty this
 * page's work and return to the home page; reason is 'idle' or 'manual'.
 * Returns a disposer.
 */
export function mountSessionModes({modes, onClear, document: doc = globalThis.document, window: win = globalThis.window, now = () => Date.now(), idleMs = CART_IDLE_MS, warningMs = CART_WARNING_MS, checkEveryMs = 10000} = {}) {
  if (!modes?.student && !modes?.cart) return () => {};
  const cleanups = [];
  const listen = (target, type, handler, options) => { target.addEventListener(type, handler, options); cleanups.push(() => target.removeEventListener(type, handler, options)); };
  const root = doc.documentElement;
  root.classList.toggle('student-mode', modes.student); root.classList.toggle('cart-mode', modes.cart);
  const strip = element(doc, 'aside', 'session-strip'); strip.setAttribute('aria-label', 'Classroom link mode');
  const text = element(doc, 'p', 'session-strip-text');
  if (modes.student) text.append(element(doc, 'strong', '', 'Student mode.'), ' Links to other websites are off. ');
  if (modes.cart) text.append(element(doc, 'strong', '', 'Shared-device mode.'), ` Nothing is saved on this device. This page clears after ${Math.round(idleMs / 60000)} minutes without activity.`);
  strip.append(text);

  if (modes.student) {
    const base = win.location.href.split('#')[0];
    const sweep = node => { if (node.nodeType !== 1) return; if (node.matches('a[href]')) applyStudentLink(node, base); node.querySelectorAll('a[href]').forEach(anchor => applyStudentLink(anchor, base)); };
    sweep(doc.body);
    // Labs re-render often; new links are handled before the browser paints them.
    const observer = new win.MutationObserver(records => { for (const record of records) { if (record.type === 'attributes') sweep(record.target); else record.addedNodes.forEach(sweep); } });
    observer.observe(doc.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['href']});
    cleanups.push(() => observer.disconnect());
    // Backstop for a link activated before the observer has run.
    const guard = event => { const anchor = event.target.closest?.('a[href]'); if (anchor && studentLinkAction(anchor.getAttribute('href'), base) !== 'keep') { event.preventDefault(); event.stopPropagation(); applyStudentLink(anchor, base); } };
    listen(doc, 'click', guard, true); listen(doc, 'auxclick', guard, true);
  }

  if (modes.cart) {
    const status = element(doc, 'p', 'session-strip-status'); status.setAttribute('role', 'status');
    const clear = element(doc, 'button', 'session-strip-button', 'Clear this page now'); clear.type = 'button';
    const confirm = element(doc, 'span', 'session-strip-confirm'); confirm.hidden = true;
    const yes = element(doc, 'button', 'session-strip-button', 'Yes, clear it'), no = element(doc, 'button', 'session-strip-button', 'Cancel'); yes.type = no.type = 'button';
    confirm.append(element(doc, 'span', '', 'Clear all work on this page? Download a report first if you need one. '), yes, no);
    const warning = element(doc, 'div', 'session-strip-warning'); warning.setAttribute('role', 'alert'); warning.hidden = true;
    const warningText = element(doc, 'span'), keep = element(doc, 'button', 'session-strip-button', 'Keep working'); keep.type = 'button';
    warning.append(warningText, keep);
    strip.append(clear, confirm, warning, status);
    const clockTime = () => { try { return new Date(now()).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}); } catch { return ''; } };
    const clearPage = reason => {
      warning.hidden = true; confirm.hidden = true; clear.hidden = false;
      onClear?.(reason);
      const at = clockTime();
      status.textContent = (reason === 'idle' ? `This page was cleared after ${Math.round(idleMs / 60000)} minutes without activity` : 'This page’s work was cleared') + (at ? ` at ${at}.` : '.') + ' Downloaded files are separate.';
    };
    const watch = createIdleWatch({now, idleMs, warningMs,
      onWarn: remaining => { warningText.textContent = `Still working? This page clears in about ${Math.max(1, Math.ceil(remaining / 60000))} minute${remaining > 60000 ? 's' : ''}. `; warning.hidden = false; },
      onResume: () => { warning.hidden = true; },
      onExpire: () => clearPage('idle')});
    listen(clear, 'click', () => { confirm.hidden = false; clear.hidden = true; yes.focus({preventScroll: true}); });
    listen(no, 'click', () => { confirm.hidden = true; clear.hidden = false; clear.focus({preventScroll: true}); });
    listen(yes, 'click', () => { clearPage('manual'); clear.focus({preventScroll: true}); });
    listen(keep, 'click', () => watch.activity());
    const active = () => watch.activity();
    for (const type of ACTIVITY_EVENTS) listen(win, type, active, {capture: true, passive: true});
    const wake = () => { if (doc.visibilityState !== 'hidden') watch.check(); };
    listen(doc, 'visibilitychange', wake); listen(win, 'pageshow', wake); listen(win, 'focus', wake);
    const timer = win.setInterval(() => watch.check(), checkEveryMs);
    cleanups.push(() => win.clearInterval(timer));
  }

  (doc.querySelector('main') || doc.body.firstChild).before(strip);
  cleanups.push(() => { strip.remove(); root.classList.remove('student-mode', 'cart-mode'); });
  return () => { while (cleanups.length) cleanups.pop()(); };
}
