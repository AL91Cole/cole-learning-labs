import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { reportFilename, createTextReport, canShareTextReport, shareTextReport, createReportURLs } from '../src/report-downloads.js';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function openReport(s,r,customContent){');
const end = source.indexOf('\nfunction educators(', start);
assert.ok(start >= 0 && end > start, 'The report dialog entry must be available for lifecycle testing.');
// Exercise the real production handler, replacing only its module-loading boundary.
const dialogCode = source.slice(start, end).replace(/import\('\.\/report-crypto\.js\?release=[^']+'\)/g, 'cryptoLoader()');
const escCode = source.match(/^const esc = .*$/m)?.[0];
assert.ok(escCode);

function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
class Element {
  constructor(attributes = '', document = null) {
    this.document = document;
    this.attributes = new Map(); this.listeners = new Map(); this.textContent = ''; this.isConnected = true;
    this.hidden = /\bhidden\b/.test(attributes); this.disabled = /\bdisabled\b/.test(attributes); this.checked = false; this.files = []; this.open = false;
  }
  set disabled(value) { this._disabled = value; if (value && this.document?.activeElement === this) this.document.activeElement = this.document.body; }
  get disabled() { return this._disabled; }
  set href(value) { this.attributes.set('href', value); }
  get href() { return this.attributes.get('href'); }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  removeAttribute(key) { this.attributes.delete(key); }
  addEventListener(name, listener) { const callbacks = this.listeners.get(name) || []; callbacks.push(listener); this.listeners.set(name, callbacks); }
  removeEventListener(name, listener) { this.listeners.set(name, (this.listeners.get(name) || []).filter(value => value !== listener)); }
  async fire(name, event = {}) { await Promise.all([...(this.listeners.get(name) || [])].map(listener => listener(event))); }
  showModal() { this.open = true; }
  async close() { this.open = false; await this.fire('close'); }
  replaceChildren() { this.markup = ''; }
  focus() { if (!this.disabled) { this.focused = true; if (this.document) this.document.activeElement = this; } }
  select() { this.selected = true; }
}
function harness({ inspect, encrypt, content = 'Synthetic fictional evidence.', copyError, shareHandler, canShare = true, urlError = false } = {}) {
  const elements = new Map(), created = [], revoked = [], clipboard = [], notices = [], shared = [], timers = [];
  const gestureEvents=[],document = {dispatchEvent(event){gestureEvents.push(event.type);}};
  document.body = new Element('', document); document.activeElement = document.body;
  const panel = new Element('', document), dialog = new Element('', document);
  Object.defineProperty(panel, 'innerHTML', { set(markup) {
    panel.markup = markup;
    for (const match of markup.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) elements.set(match[1], new Element(match[0], document));
  } });
  elements.set('dialog-content', panel); elements.set('lab-dialog', dialog);
  const urlApi = { createObjectURL(blob) { if (urlError) throw new Error('Browser restricted Blob links.'); const url = `blob:synthetic-${created.length + 1}`; created.push({ url, blob }); return url; }, revokeObjectURL(url) { revoked.push(url); } };
  const browser = { clipboard: { async writeText(text) { if (copyError) throw copyError; clipboard.push(text); } } };
  if (shareHandler) { browser.canShare = () => canShare; browser.share = async data => { shared.push(data); return shareHandler(data); }; }
  const context = vm.createContext({
    reportCleanup: null, reportText: () => content,
    cancelHardwareInteraction() {gestureEvents.push('hardware-cancel');},
    cancelCodingWorkbench() {gestureEvents.push('coding-cancel');},
    CustomEvent:class{constructor(type){this.type=type;}},
    reportFilename, createTextReport,
    canShareTextReport: artifact => canShareTextReport(artifact, browser),
    shareTextReport: artifact => shareTextReport(artifact, browser),
    createReportURLs: () => createReportURLs({ api: urlApi, schedule: (callback, delay) => { timers.push({ callback, delay }); } }),
    $: selector => elements.get(selector.slice(1)),
    cryptoLoader: async () => ({ inspectPublicKey: inspect || (async text => ({ fingerprint: text })), encryptReport: encrypt || (async () => 'synthetic encrypted envelope'), generateAlias: () => 'Learner-ABCD-2345' }),
    URL: urlApi, Blob, navigator: browser, document,
    showNotice: text => notices.push(text)
  });
  vm.runInContext(`${escCode}\n${dialogCode}\nglobalThis.openTestReport = openReport;`, context);
  context.openTestReport({ id: 'INC-101', title: 'Synthetic lab' }, {});
  const get = id => elements.get(id);
  const choose = async (text, name = 'synthetic.cllpub') => { get('report-public-key').files = [{ name, size: text.length, text: async () => text }]; await get('report-public-key').fire('change'); };
  const confirm = async () => { get('report-key-confirm').checked = true; await get('report-key-confirm').fire('change'); };
  const approvePlain = async (value = true) => { get('plain-report-confirm').checked = value; await get('plain-report-confirm').fire('change'); };
  return { get, choose, confirm, approvePlain, context, panel, dialog, document, created, revoked, clipboard, notices, shared, timers, gestureEvents };
}

test('opening a report creates no plaintext download or clipboard write, and escapes hostile report text', async () => {
  const content = 'Synthetic </textarea><img src=x onerror=alert(1)> & "quoted" text';
  const h = harness({ content });
  assert.deepEqual(h.gestureEvents,['hardware-cancel','coding-cancel','cole:lab-report-open'],'Opening a report cancels unfinished equipment, block and network gestures before the overlay takes focus.');
  assert.equal(h.created.length, 0); assert.equal(h.clipboard.length, 0);
  assert.equal(h.get('copy-report').disabled, true);
  assert.equal(h.get('select-report').disabled, true); assert.equal(h.get('share-report').hidden, true);
  assert.equal(h.get('download-report').href, undefined);
  assert.equal(h.panel.markup.includes('</textarea><img src=x'), false);
  assert.ok(h.panel.markup.includes('&lt;/textarea&gt;&lt;img src=x onerror=alert(1)&gt;'));
});
test('a real anchor download retains the report through browser handoff without claiming it was saved', async () => {
  const h = harness({ content: 'Questions: café?\nRequester: Δ — yes.\n' });
  await h.approvePlain();
  const link = h.get('download-report'), url = link.href;
  let prevented = false;
  await link.fire('click', { preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'The browser must receive the native anchor click.');
  assert.match(h.panel.markup, /download="cole-learning-labs-INC-101\.txt"/);
  assert.equal(h.created[0].blob.type, 'text/plain;charset=utf-8');
  assert.equal(await h.created[0].blob.text(), 'Questions: café?\r\nRequester: Δ — yes.\r\n');
  assert.match(h.get('report-plain-status').textContent, /Download requested/);
  assert.match(h.get('report-plain-status').textContent, /cannot confirm/);
  await h.dialog.close();
  assert.equal(h.revoked.includes(url), false, 'Closing the report must not revoke a requested URL before the browser consumes it.');
  assert.equal(h.timers.length, 1); assert.equal(h.timers[0].delay, 60000);
  h.timers[0].callback(); assert.ok(h.revoked.includes(url));
});
test('unchecking export permission disables every plaintext action and releases an unused URL', async () => {
  const h = harness({ shareHandler: async () => undefined });
  await h.approvePlain();
  const url = h.get('download-report').href;
  assert.equal(h.get('share-report').hidden, false);
  await h.approvePlain(false);
  let prevented = false;
  await h.get('download-report').fire('click', { preventDefault() { prevented = true; } });
  await h.get('copy-report').fire('click'); await h.get('share-report').fire('click'); await h.get('select-report').fire('click');
  assert.ok(prevented); assert.ok(h.revoked.includes(url)); assert.equal(h.get('download-report').href, undefined);
  assert.equal(h.clipboard.length, 0); assert.equal(h.shared.length, 0); assert.equal(h.get('report-text').selected, undefined);
  for (const id of ['copy-report', 'share-report', 'select-report']) assert.equal(h.get(id).disabled, true);
});
test('device file sharing starts only from its own approved click and never claims saved after cancellation', async () => {
  const h = harness({ shareHandler: async () => { throw Object.assign(new Error('User cancelled.'), { name: 'AbortError' }); } });
  await h.get('share-report').fire('click'); assert.equal(h.shared.length, 0);
  await h.approvePlain(); assert.equal(h.shared.length, 0);
  await h.get('share-report').fire('click');
  assert.equal(h.shared.length, 1); assert.equal(h.shared[0].files[0].name, 'cole-learning-labs-INC-101.txt');
  assert.equal(await h.shared[0].files[0].text(), 'Synthetic fictional evidence.');
  assert.match(h.get('report-plain-status').textContent, /cancelled or had no destination/);
  assert.match(h.get('report-plain-status').textContent, /Nothing is confirmed saved/);
  assert.equal(h.get('share-report').disabled, false);
});
test('blocked clipboard shows a selected readable report and instructions; closing prevents late messages', async () => {
  const h = harness({ copyError: new Error('Clipboard denied.') });
  await h.approvePlain(); await h.get('copy-report').fire('click');
  assert.equal(h.get('report-text').selected, true); assert.equal(h.get('report-text').focused, true);
  assert.equal(h.get('report-manual-help').hidden, false);
  assert.match(h.panel.markup, /Ctrl\+C/); assert.match(h.panel.markup, /touch and hold/);
  assert.equal(h.clipboard.length, 0);
  const pending = deferred();
  const sharing = harness({ shareHandler: () => pending.promise });
  await sharing.approvePlain(); const request = sharing.get('share-report').fire('click');
  await sharing.dialog.close(); pending.resolve(); await request;
  assert.equal(sharing.panel.markup, ''); assert.equal(sharing.context.reportCleanup, null);
});
test('blocked Blob creation leaves copy and manual selection available without an empty download link', async () => {
  const h = harness({ urlError: true });
  await h.approvePlain();
  assert.equal(h.get('download-report').href, undefined); assert.equal(h.get('copy-report').disabled, false);
  assert.match(h.get('report-plain-status').textContent, /could not prepare a download/);
  await h.get('select-report').fire('click'); assert.equal(h.get('report-text').selected, true);
  await h.get('copy-report').fire('click'); assert.equal(h.clipboard.length, 1);
});
test('a pending share cannot overwrite fresh approval or leave the new share button disabled', async () => {
  const pending = deferred();
  const h = harness({ shareHandler: () => pending.promise });
  await h.approvePlain();
  const sharing = h.get('share-report').fire('click');
  await h.get('share-report').fire('click'); assert.equal(h.shared.length, 1);
  await h.approvePlain(false); await h.approvePlain();
  const ready = h.get('report-plain-status').textContent;
  assert.equal(h.get('share-report').disabled, true);
  pending.resolve(); await sharing;
  assert.equal(h.get('share-report').disabled, false);
  assert.equal(h.get('report-plain-status').textContent, ready);
});
test('plaintext export occurs only after explicit confirmation, and close revokes its URL', async () => {
  const h = harness();
  let prevented = false;
  await h.get('download-report').fire('click', { preventDefault() { prevented = true; } });
  await h.get('copy-report').fire('click');
  assert.equal(prevented, true); assert.equal(h.created.length, 0); assert.equal(h.clipboard.length, 0);
  h.get('plain-report-confirm').checked = true; await h.get('plain-report-confirm').fire('change');
  assert.equal(await h.created[0].blob.text(), 'Synthetic fictional evidence.');
  await h.get('copy-report').fire('click'); assert.deepEqual(h.clipboard, ['Synthetic fictional evidence.']);
  const url = h.get('download-report').href;
  await h.dialog.close();
  assert.ok(h.revoked.includes(url)); assert.equal(h.panel.markup, ''); assert.equal(h.context.reportCleanup, null);
});
test('late public-key inspection cannot replace the fingerprint or key selected afterward', async () => {
  const first = deferred(), used = [];
  const h = harness({ inspect: async text => ({ fingerprint: text }), encrypt: async (key, value) => { used.push({ key, value }); return 'synthetic ciphertext'; } });
  h.get('report-public-key').files = [{ name: 'first.cllpub', size: 20, text: () => first.promise }];
  const pending = h.get('report-public-key').fire('change');
  await h.choose('synthetic-public-second');
  first.resolve('synthetic-public-first'); await pending;
  assert.equal(h.get('report-fingerprint').textContent, 'synthetic-public-second');
  await h.confirm(); await h.get('encrypt-report').fire('click');
  assert.equal(used.length, 1); assert.equal(used[0].key, 'synthetic-public-second');
  assert.equal(used[0].value.alias, 'Learner-ABCD-2345');
});
test('closing during encryption prevents late ciphertext links and revokes every earlier download', async () => {
  const encrypted = deferred(), started = deferred();
  const h = harness({ encrypt: async () => { started.resolve(); return encrypted.promise; } });
  h.get('plain-report-confirm').checked = true; await h.get('plain-report-confirm').fire('change');
  const plainUrl = h.get('download-report').href;
  await h.choose('synthetic-public'); await h.confirm();
  const pending = h.get('encrypt-report').fire('click'); await started.promise;
  assert.equal(h.get('report-public-key').disabled, true);
  await h.dialog.close(); encrypted.resolve('synthetic encrypted envelope'); await pending;
  assert.equal(h.created.length, 1); assert.ok(h.revoked.includes(plainUrl));
  assert.equal(h.get('encrypted-report-download').hidden, true); assert.equal(h.panel.markup, '');
});
test('switching public keys removes earlier download links and requires a fresh fingerprint confirmation', async () => {
  const h = harness();
  await h.choose('synthetic-public-one'); await h.confirm(); await h.get('encrypt-report').fire('click');
  const url = h.get('encrypted-report-download').href;
  assert.equal(h.get('encrypted-report-download').hidden, false);
  await h.choose('synthetic-public-two');
  assert.ok(h.revoked.includes(url)); assert.equal(h.get('encrypted-report-download').hidden, true);
  assert.equal(h.get('encrypted-report-download').href, undefined); assert.equal(h.get('report-key-confirm').checked, false);
  assert.equal(h.get('encrypt-report').disabled, true);
});
test('invalid key files leave encryption unavailable without creating any download', async () => {
  const h = harness();
  await h.choose('synthetic-key', 'wrong-extension.txt');
  assert.equal(h.get('report-key-confirm').disabled, true); assert.equal(h.get('encrypt-report').disabled, true);
  assert.equal(h.created.length, 0); assert.equal(h.clipboard.length, 0);
  assert.equal(h.get('report-public-key').getAttribute('aria-invalid'), 'true');
  await h.choose('synthetic-valid-public-key');
  assert.equal(h.get('report-public-key').getAttribute('aria-invalid'), null);
});

test('encryption returns lost keyboard focus to its available result or retry action', async () => {
  const h = harness();
  await h.choose('synthetic-public'); await h.confirm(); h.get('encrypt-report').focus();
  await h.get('encrypt-report').fire('click');
  assert.equal(h.document.activeElement, h.get('encrypted-report-download'));
  const failed = harness({ encrypt: async () => { throw new Error('Synthetic encryption failure.'); } });
  await failed.choose('synthetic-public'); await failed.confirm(); failed.get('encrypt-report').focus();
  await failed.get('encrypt-report').fire('click');
  assert.equal(failed.document.activeElement, failed.get('encrypt-report'));
  assert.equal(failed.get('encrypt-report').disabled, false);
});

test('encryption does not take focus from a deliberate move or after the report closes', async () => {
  for (const close of [false, true]) {
    const pending = deferred(), started = deferred();
    const h = harness({ encrypt: async () => { started.resolve(); return pending.promise; } });
    await h.choose('synthetic-public'); await h.confirm(); h.get('encrypt-report').focus();
    const operation = h.get('encrypt-report').fire('click'); await started.promise;
    h.get('report-text').focus();
    if (close) await h.dialog.close();
    const chosenFocus = h.document.activeElement;
    pending.resolve('synthetic ciphertext'); await operation;
    assert.equal(h.document.activeElement, chosenFocus);
  }
});

test('cancelled device sharing restores its keyboard action without overriding a deliberate move', async () => {
  for (const move of [false, true]) {
    const pending = deferred(), h = harness({ shareHandler: () => pending.promise });
    await h.approvePlain(); h.get('share-report').focus();
    const operation = h.get('share-report').fire('click');
    assert.equal(h.document.activeElement, h.document.body);
    if (move) h.get('report-text').focus();
    pending.resolve(); await operation;
    assert.equal(h.document.activeElement, h.get(move ? 'report-text' : 'share-report'));
  }
});
