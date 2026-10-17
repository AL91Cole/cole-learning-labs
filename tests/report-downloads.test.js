import test from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_TEXT_TYPE, REPORT_SHARE_TYPE, reportFilename, createTextReport, canShareTextReport, shareTextReport, createReportURLs } from '../src/report-downloads.js';

test('report attachments contain UTF-8 bytes and consistent Windows-compatible line endings', async () => {
  const original = 'INVESTIGATION — café • Δ\nQuestion?\r\nReply.\rReflection: 🧪\n';
  const report = createTextReport(original, 'INC-101');
  const expected = 'INVESTIGATION — café • Δ\r\nQuestion?\r\nReply.\r\nReflection: 🧪\r\n';
  assert.equal(report.text, expected); assert.equal(report.blob.type, REPORT_TEXT_TYPE);
  assert.deepEqual(new Uint8Array(await report.blob.arrayBuffer()), new TextEncoder().encode(expected));
  assert.equal(await report.blob.text(), expected);
  assert.equal(report.file.type, 'text/plain'); assert.equal(report.file.type, REPORT_SHARE_TYPE); assert.equal(report.file.lastModified, 0);
  assert.equal(report.file.name, 'cole-learning-labs-INC-101.txt');
  assert.deepEqual(new Uint8Array(await report.file.arrayBuffer()), new TextEncoder().encode(expected));
  assert.equal(original, 'INVESTIGATION — café • Δ\nQuestion?\r\nReply.\rReflection: 🧪\n', 'Preparing a file cannot edit the source report.');
});

test('filenames include only a fictional lab ID and cannot expose arbitrary titles, aliases or paths', () => {
  for (const id of ['HW-100', 'INC-108', 'NET-206', 'AI-306', 'SEC-406', 'CODE-503', 'CAP-601']) assert.equal(reportFilename(id), `cole-learning-labs-${id}.txt`);
  for (const id of ['Jane Smith', 'student@example.test', 'INC-101-Jane', '../INC-101', 'INC-101\r\nsecret', 'inc-101', null, {}, 'a'.repeat(300)]) assert.equal(reportFilename(id), 'cole-learning-labs.txt');
});

test('plain anchor downloads still work when File or native file sharing is absent', async () => {
  const artifact = createTextReport('A report.', 'NET-201', { FileType: null });
  assert.equal(artifact.file, null); assert.equal(await artifact.blob.text(), 'A report.');
  assert.equal(canShareTextReport(artifact, {}), false);
  assert.equal(await shareTextReport(artifact, {}), 'unavailable');
  const broken = createTextReport('B report.', 'AI-301', { FileType: class { constructor() { throw new Error('Disabled feature.'); } } });
  assert.equal(broken.file, null); assert.equal(await broken.blob.text(), 'B report.');
});

test('file sharing is feature detected with the exact File and calls share synchronously before yielding', async () => {
  const artifact = createTextReport('My fictional notes.', 'CODE-501');
  const checks = [], shares = [];
  const browser = {
    canShare(data) { checks.push(data); return data.files.every(file => file.type === 'text/plain'); },
    share(data) { shares.push(data); return Promise.resolve(); }
  };
  assert.equal(canShareTextReport(artifact, browser), true);
  const pending = shareTextReport(artifact, browser);
  assert.equal(shares.length, 1, 'share must run in the same activation before awaiting a promise.');
  assert.equal(shares[0].files[0], artifact.file); assert.equal(checks[0].files[0], artifact.file);
  assert.deepEqual(Object.keys(shares[0]), ['files'], 'No URL, student identity, page metadata or extra report copies are shared.');
  assert.equal(await pending, 'opened');
});

test('native share MIME uses the exact Chromium text allowlist while download bytes keep UTF-8', async () => {
  const artifact = createTextReport('Évidence — 🧪\n', 'INC-101');
  const browser = { canShare: ({ files }) => files.every(file => file.type === 'text/plain'), share: async () => undefined };
  assert.equal(artifact.blob.type, 'text/plain;charset=utf-8');
  assert.equal(artifact.file.type, 'text/plain');
  assert.equal(canShareTextReport(artifact, browser), true);
  assert.equal(await shareTextReport(artifact, browser), 'opened');
  assert.deepEqual(new Uint8Array(await artifact.file.arrayBuffer()), new Uint8Array(await artifact.blob.arrayBuffer()));
});

test('unsupported, blocked and cancelled share operations return honest outcomes without fallback upload', async () => {
  const artifact = createTextReport('Fictional notes.', 'AI-301');
  for (const browser of [{}, { share() {} }, { share() { assert.fail('Must not share unsupported files.'); }, canShare: () => false }, { share() { assert.fail('Must not share after detection error.'); }, canShare() { throw new Error('Policy block.'); } }]) {
    assert.equal(canShareTextReport(artifact, browser), false); assert.equal(await shareTextReport(artifact, browser), 'unavailable');
  }
  for (const [name, expected] of [['AbortError', 'cancelled'], ['NotAllowedError', 'blocked'], ['DataError', 'blocked'], ['InvalidStateError', 'blocked']]) {
    const browser = { canShare: () => true, share() { throw Object.assign(new Error('Synthetic platform outcome.'), { name }); } };
    assert.equal(await shareTextReport(artifact, browser), expected);
  }
});

test('object URL lifecycle releases unused reports immediately and delays requested browser downloads', () => {
  const created = [], revoked = [], timers = [];
  const urls = createReportURLs({ api: {
    createObjectURL(blob) { const url = `blob:report-${created.length}`; created.push({ blob, url }); return url; },
    revokeObjectURL(url) { revoked.push(url); }
  }, schedule(callback, delay) { timers.push({ callback, delay }); } });
  const unused = urls.create(new Blob(['unused'])), requested = urls.create(new Blob(['requested']));
  urls.requested(requested); urls.requested('blob:unknown');
  urls.clear(); urls.clear(); urls.release(unused); urls.release(requested);
  assert.deepEqual(revoked, [unused]); assert.equal(timers.length, 1); assert.equal(timers[0].delay, 60000);
  timers[0].callback(); assert.deepEqual(revoked, [unused, requested]);
});
