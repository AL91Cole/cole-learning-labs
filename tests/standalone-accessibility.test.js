import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const reportMarkup = await readFile(new URL('../secure-reports.html', import.meta.url), 'utf8');
const reportSource = (await readFile(new URL('../src/secure-reports.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/, '');
const portalSource = await readFile(new URL('../src/classroom-portal.js', import.meta.url), 'utf8');

// Exercise production handlers with a small DOM boundary. This verifies focus
// and cancellation decisions, not a browser accessibility tree or spoken output.
function element(document, tagName = 'BUTTON', attributes = {}) {
  const attrs = new Map(Object.entries(attributes));
  let disabled = false;
  return {
    tagName, id: attributes.id || '', attributes: attrs, listeners: new Map(),
    value: '', checked: false, files: [], hidden: false, isConnected: true, textContent: '', dataset: {},
    get disabled() { return disabled; },
    set disabled(value) { disabled = value; if (value && document.activeElement === this) document.activeElement = document.body; },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.get(name) ?? null; },
    hasAttribute(name) { return attrs.has(name); },
    removeAttribute(name) { attrs.delete(name); },
    matches() { return ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(tagName) || attrs.has('tabindex'); },
    focus(options) { if (!disabled) { document.activeElement = this; this.focusOptions = options; } },
    scrollIntoView(options) { this.scrollOptions = options; },
    addEventListener(name, listener) { const list = this.listeners.get(name) || []; list.push(listener); this.listeners.set(name, list); },
    async fire(name, event = {}) { for (const listener of this.listeners.get(name) || []) await listener({ preventDefault() {}, currentTarget: this, ...event }); }
  };
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function reportHarness(overrides = {}) {
  const document = {}, elements = new Map();
  document.body = element(document, 'BODY'); document.activeElement = document.body;
  for (const match of reportMarkup.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)) {
    const field = element(document, match[1].toUpperCase(), { id: match[2] });
    field.hidden = /\bhidden\b/.test(match[0]); elements.set(field.id, field);
  }
  const workspace = element(document, 'SECTION');
  const fields = [...elements.values()].filter(field => ['BUTTON', 'INPUT', 'TEXTAREA'].includes(field.tagName));
  document.getElementById = id => elements.get(id);
  document.querySelector = selector => selector === '.workspace' ? workspace : null;
  document.querySelectorAll = selector => {
    if (selector === 'form') return [...elements.values()].filter(field => field.tagName === 'FORM');
    if (selector === '[aria-invalid="true"]') return fields.filter(field => field.getAttribute('aria-invalid') === 'true');
    return fields.filter(field => field.id !== 'clear-all');
  };
  for (const field of elements.values()) if (field.tagName === 'FORM') field.reset = () => fields.forEach(input => { input.value = ''; input.files = []; input.checked = false; });
  const context = vm.createContext({
    document, window: { isSecureContext: true, addEventListener() {} }, crypto: { subtle: {} },
    URL, Blob, TextEncoder, setTimeout() {},
    REPORT_LIMITS: { keyFileBytes: 16384, reportBytes: 131072, fileBytes: 262144 },
    generateAlias: () => 'Learner-TEST-0001',
    generateTeacherKeyFiles: async () => ({ fingerprint: 'fictional fingerprint', privateFile: 'private', publicFile: 'public' }),
    inspectPublicKey: async () => ({ fingerprint: 'fictional fingerprint' }),
    encryptReport: async () => 'fictional encrypted envelope',
    decryptReport: async () => ({ alias: 'Learner-TEST-0001', report: 'Fictional report' }), ...overrides
  });
  vm.runInContext(reportSource, context);
  return { document, get: id => elements.get(id), context };
}

test('mismatched passphrases give an identified field error without generating a key', async () => {
  let calls = 0;
  const h = reportHarness({ generateTeacherKeyFiles: async () => { calls++; } });
  h.get('new-passphrase').value = 'fictional phrase one'; h.get('confirm-passphrase').value = 'fictional phrase two';
  h.get('new-passphrase').focus();
  await h.get('generate-form').fire('submit');
  assert.equal(calls, 0);
  assert.match(h.get('status').textContent, /passphrases did not match/);
  assert.equal(h.get('new-passphrase').getAttribute('aria-invalid'), 'true');
  assert.equal(h.document.activeElement, h.get('new-passphrase'));
  assert.equal(h.get('new-passphrase').value, '');
  assert.equal(h.get('confirm-passphrase').value, '');
});

test('completed key generation restores controls and focuses the first available download', async () => {
  const h = reportHarness();
  h.get('new-passphrase').value = h.get('confirm-passphrase').value = 'fictional matching phrase';
  h.get('confirm-passphrase').focus();
  await h.get('generate-form').fire('submit');
  assert.equal(h.get('key-downloads').hidden, false);
  assert.equal(h.document.activeElement, h.get('download-private'));
  assert.equal(h.get('download-private').disabled, false);
});

test('completion does not steal focus from navigation chosen during cryptography', async () => {
  const pending = deferred(), h = reportHarness({ generateTeacherKeyFiles: () => pending.promise });
  h.get('new-passphrase').value = h.get('confirm-passphrase').value = 'fictional matching phrase';
  h.get('new-passphrase').focus();
  const work = h.get('generate-form').fire('submit');
  const navigation = element(h.document, 'A'); navigation.focus();
  pending.resolve({ fingerprint: 'fictional', privateFile: 'private', publicFile: 'public' });
  await work;
  assert.equal(h.document.activeElement, navigation);
});

test('clearing during cryptography cannot reopen results or restore obsolete focus', async () => {
  const pending = deferred(), h = reportHarness({ generateTeacherKeyFiles: () => pending.promise });
  h.get('new-passphrase').value = h.get('confirm-passphrase').value = 'fictional matching phrase';
  h.get('new-passphrase').focus();
  const work = h.get('generate-form').fire('submit');
  h.get('clear-all').focus(); await h.get('clear-all').fire('click');
  pending.resolve({ fingerprint: 'fictional', privateFile: 'private', publicFile: 'public' }); await work;
  assert.equal(h.get('key-downloads').hidden, true);
  assert.equal(h.get('generated-fingerprint').textContent, '');
  assert.equal(h.document.activeElement, h.get('clear-all'));
});

test('decrypted text remains text and focus moves to the revealed report heading', async () => {
  const h = reportHarness({ decryptReport: async () => ({ alias: 'fictional', report: '<img src=x onerror=bad()>\nFictional text' }) });
  for (const [id, extension] of [['private-key-file', '.cllkey'], ['encrypted-report-file', '.cllreport']]) h.get(id).files = [{ name: `fictional${extension}`, size: 2, text: async () => '{}' }];
  h.get('unlock-passphrase').value = 'fictional matching phrase'; h.get('unlock-passphrase').focus();
  await h.get('decrypt-form').fire('submit');
  assert.equal(h.get('decrypted-result').hidden, false);
  assert.equal(h.get('decrypted-text').textContent, '<img src=x onerror=bad()>\nFictional text');
  assert.equal(h.document.activeElement, h.get('decrypted-title'));
  assert.equal(h.get('unlock-passphrase').value, '');
});

test('invalid selected report identifies its file limit and returns focus to the file control', async () => {
  const h = reportHarness(); h.get('report-file').focus();
  h.get('report-file').files = [{ name: 'fictional.html', size: 10 }];
  await h.get('report-file').fire('change');
  assert.match(h.get('status').textContent, /\.txt file no larger than 128 KiB/);
  assert.equal(h.get('report-file').getAttribute('aria-invalid'), 'true');
  assert.equal(h.document.activeElement, h.get('report-file'));
});

function portalHarness() {
  const document = {}, main = {}, nodes = [];
  document.body = element(document, 'BODY'); document.activeElement = document.body;
  main.contains = node => nodes.includes(node);
  main.querySelectorAll = () => nodes;
  main.querySelector = selector => nodes.find(node => node.tagName === 'H1');
  const context = vm.createContext({ document, main, model: { mode: 'demo' }, teacherEntry: false,
    teacherDashboard: () => '', bind() {}, syncPolling() {} });
  const start = portalSource.indexOf('function portalFocusKey('), end = portalSource.indexOf('\nasync function refresh(', start);
  vm.runInContext(portalSource.slice(start, end), context);
  return { document, main, nodes, context, element: (tag, attributes) => element(document, tag, attributes) };
}

test('portal refresh restores the same learner control among repeated review buttons', () => {
  const h = portalHarness(), old = h.element('BUTTON', { 'data-action': 'student-work', 'data-student': 'learner-b' });
  h.nodes.push(old); old.focus();
  const key = h.context.portalFocusKey(old);
  const wrong = h.element('BUTTON', { 'data-action': 'student-work', 'data-student': 'learner-a' });
  const replacement = h.element('BUTTON', { 'data-action': 'student-work', 'data-student': 'learner-b' });
  h.nodes.splice(0, h.nodes.length, wrong, replacement); h.document.activeElement = h.document.body;
  h.context.restorePortalFocus(key);
  assert.equal(h.document.activeElement, replacement);
  assert.equal(replacement.focusOptions.preventScroll, true);
});

test('removed portal control has a useful heading fallback without adding a tab stop', () => {
  const h = portalHarness(), old = h.element('BUTTON', { 'data-action': 'close-review' });
  h.nodes.push(old); const key = h.context.portalFocusKey(old);
  const heading = h.element('H1'); h.nodes.splice(0, h.nodes.length, heading);
  h.context.restorePortalFocus(key);
  assert.equal(h.document.activeElement, heading);
  assert.equal(heading.getAttribute('tabindex'), '-1');
});

test('portal rerender leaves focus outside the refreshed workspace alone', () => {
  const h = portalHarness(), navigation = h.element('A', { href: '../#labs' }); navigation.focus();
  h.context.render();
  assert.equal(h.document.activeElement, navigation);
});

test('explicit review navigation focuses its heading without forced smooth motion', () => {
  const h = portalHarness(), heading = h.element('H2');
  h.context.focusPortal(heading, true);
  assert.equal(h.document.activeElement, heading);
  assert.equal(heading.getAttribute('tabindex'), '-1');
  assert.equal(heading.scrollOptions.behavior, 'auto');
});

test('portal input errors persist and remain linked once after repeated validation', () => {
  const document = {}, notice = element(document), error = element(document), timers = [];
  document.querySelector = selector => selector === '#portal-error' ? error : notice;
  const context = vm.createContext({ document, setTimeout: callback => { timers.push(callback); }, clearTimeout() {} });
  const start = portalSource.indexOf('function notice('), end = portalSource.indexOf('\nfunction errorMessage(', start);
  vm.runInContext(portalSource.slice(start, end), context);
  const field = element(document, 'INPUT', { 'aria-describedby': 'grade-help' });
  context.portalInputError('Enter a grade.', field); context.portalInputError('Enter a grade.', field);
  context.notice('Enter a grade.', 'error');
  assert.equal(field.getAttribute('aria-describedby'), 'grade-help portal-error');
  assert.equal(error.hidden, false); assert.equal(notice.hidden, true);
  assert.equal(error.textContent, 'Enter a grade.');
  assert.equal(timers.length, 0, 'Errors must not disappear on an eight-second timer.');
});

test('delete confirmation identifies its purpose, focuses an invalid confirmation, and returns to its opener', async () => {
  const h = portalHarness(), opener = h.element('BUTTON', { 'data-action': 'delete-class' });
  opener.focus();
  const dialog = h.element('DIALOG'), input = h.element('INPUT'), error = h.element('P'), confirm = h.element('BUTTON');
  dialog.querySelector = selector => selector === 'input' ? input : selector === '#delete-dialog-error' ? error : confirm;
  dialog.showModal = () => { dialog.open = true; };
  dialog.remove = () => { dialog.isConnected = false; };
  h.document.createElement = () => dialog;
  h.document.body.append = () => {};
  h.context.model = { mode: 'demo', selectedClass: 'fictional-class', detail: { classroom: { name: 'Fictional class' } } };
  h.context.esc = value => String(value);
  h.context.act = async operation => operation();
  const start = portalSource.indexOf('function confirmDelete('), end = portalSource.indexOf('\nfunction bind(', start);
  vm.runInContext(portalSource.slice(start, end), h.context);
  h.context.confirmDelete();
  assert.equal(dialog.getAttribute('aria-labelledby'), 'delete-class-title');
  assert.equal(dialog.getAttribute('aria-describedby'), 'delete-class-description');
  assert.match(dialog.innerHTML, /id="delete-class-title"/);
  assert.match(dialog.innerHTML, /id="delete-class-description"/);
  assert.equal(h.document.activeElement, input);
  await confirm.fire('click');
  assert.equal(error.textContent, 'Type DELETE exactly before confirming.');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(h.document.activeElement, input);
  await dialog.fire('close');
  assert.equal(dialog.isConnected, false);
  assert.equal(h.document.activeElement, opener);
});
