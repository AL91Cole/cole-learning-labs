import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function openReport(s,r){');
const end = source.indexOf('\nfunction educators(', start);
assert.ok(start >= 0 && end > start, 'The report dialog entry must be available for lifecycle testing.');
// Exercise the real production handler, replacing only its module-loading boundary.
const dialogCode = source.slice(start, end).replace(/import\('\.\/report-crypto\.js\?release=[^']+'\)/g, 'cryptoLoader()');
const escCode = source.match(/^const esc = .*$/m)?.[0];
assert.ok(escCode);

function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
class Element {
  constructor(attributes = '') {
    this.attributes = new Map(); this.listeners = new Map(); this.textContent = ''; this.isConnected = true;
    this.hidden = /\bhidden\b/.test(attributes); this.disabled = /\bdisabled\b/.test(attributes); this.checked = false; this.files = []; this.open = false;
  }
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
}
function harness({ inspect, encrypt, content = 'Synthetic fictional evidence.' } = {}) {
  const elements = new Map(), created = [], revoked = [], clipboard = [], notices = [];
  const panel = new Element(), dialog = new Element();
  Object.defineProperty(panel, 'innerHTML', { set(markup) {
    panel.markup = markup;
    for (const match of markup.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) elements.set(match[1], new Element(match[0]));
  } });
  elements.set('dialog-content', panel); elements.set('lab-dialog', dialog);
  const context = vm.createContext({
    reportCleanup: null, reportText: () => content,
    $: selector => elements.get(selector.slice(1)),
    cryptoLoader: async () => ({ inspectPublicKey: inspect || (async text => ({ fingerprint: text })), encryptReport: encrypt || (async () => 'synthetic encrypted envelope'), generateAlias: () => 'Learner-ABCD-2345' }),
    URL: { createObjectURL(blob) { const url = `blob:synthetic-${created.length + 1}`; created.push({ url, blob }); return url; }, revokeObjectURL(url) { revoked.push(url); } },
    Blob, navigator: { clipboard: { async writeText(text) { clipboard.push(text); } } },
    showNotice: text => notices.push(text)
  });
  vm.runInContext(`${escCode}\n${dialogCode}\nglobalThis.openTestReport = openReport;`, context);
  context.openTestReport({ id: 'INC-101', title: 'Synthetic lab' }, {});
  const get = id => elements.get(id);
  const choose = async (text, name = 'synthetic.cllpub') => { get('report-public-key').files = [{ name, size: text.length, text: async () => text }]; await get('report-public-key').fire('change'); };
  const confirm = async () => { get('report-key-confirm').checked = true; await get('report-key-confirm').fire('change'); };
  return { get, choose, confirm, context, panel, dialog, created, revoked, clipboard, notices };
}

test('opening a report creates no plaintext download or clipboard write, and escapes hostile report text', async () => {
  const content = 'Synthetic </textarea><img src=x onerror=alert(1)> & "quoted" text';
  const h = harness({ content });
  assert.equal(h.created.length, 0); assert.equal(h.clipboard.length, 0);
  assert.equal(h.get('copy-report').disabled, true);
  assert.equal(h.get('download-report').href, undefined);
  assert.equal(h.panel.markup.includes('</textarea><img src=x'), false);
  assert.ok(h.panel.markup.includes('&lt;/textarea&gt;&lt;img src=x onerror=alert(1)&gt;'));
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
});
