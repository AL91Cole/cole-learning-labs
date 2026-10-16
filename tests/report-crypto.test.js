import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateTeacherKeyFiles, inspectPublicKey, encryptReport, decryptReport, generateAlias, REPORT_LIMITS } from '../src/report-crypto.js';

// All keys and content in these tests are newly generated synthetic fixtures.
const passphrase = 'Fictional Classroom Key 47!';
const report = 'Synthetic lab evidence: connected the virtual monitor.\n<script>example only</script>\n✓';
const alias = 'Learner-ABCD-2345';
const generic = { message: 'Unable to process this file. Check the file, key, and passphrase.' };
let teacher, otherTeacher, encrypted;
before(async () => {
  [teacher, otherTeacher] = await Promise.all([generateTeacherKeyFiles(passphrase), generateTeacherKeyFiles('Different Fictional Classroom 83!')]);
  encrypted = await encryptReport(teacher.publicFile, { report, alias });
});
function mutate(text, field, change) { const value = JSON.parse(text); value[field] = change(value[field]); return JSON.stringify(value); }
function flip(base64) { const value = Buffer.from(base64, 'base64'); value[0] ^= 1; return value.toString('base64'); }

test('teacher key files have the fixed reviewed algorithms and encrypted private material', async () => {
  const publicKey = JSON.parse(teacher.publicFile), privateKey = JSON.parse(teacher.privateFile);
  assert.equal(publicKey.keyAlgorithm, 'RSA-OAEP-SHA-256');
  assert.equal(privateKey.iterations, 600000);
  assert.equal(privateKey.kdf, 'PBKDF2-SHA-256');
  assert.equal(privateKey.cipher, 'AES-256-GCM');
  assert.equal(Buffer.from(privateKey.salt, 'base64').length, 16);
  assert.equal(Buffer.from(privateKey.iv, 'base64').length, 12);
  assert.deepEqual(await inspectPublicKey(teacher.publicFile), { fingerprint: teacher.fingerprint });
  assert.equal(teacher.privateFile.includes(passphrase), false);
  assert.equal(teacher.privateFile.includes('PRIVATE KEY'), false);
});
test('report and alias round trip only with the matching teacher private key and passphrase', async () => {
  assert.deepEqual(await decryptReport(teacher.privateFile, passphrase, encrypted), { report, alias });
  const envelope = JSON.parse(encrypted);
  assert.deepEqual(Object.keys(envelope).sort(), ['type', 'version', 'keyAlgorithm', 'cipher', 'fingerprint', 'iv', 'wrappedKey', 'ciphertext'].sort());
  assert.equal(encrypted.includes(alias), false);
  assert.equal(encrypted.includes(report), false);
  assert.equal(Buffer.from(envelope.wrappedKey, 'base64').length, 384);
});
test('optional alias is encrypted as empty text and Unicode report text remains intact', async () => {
  const text = await encryptReport(teacher.publicFile, { report: 'Synthetic café report 🧪' });
  assert.deepEqual(await decryptReport(teacher.privateFile, passphrase, text), { report: 'Synthetic café report 🧪', alias: '' });
});
test('each encryption has fresh nonce, wrapped key, and ciphertext', async () => {
  const first = JSON.parse(encrypted), second = JSON.parse(await encryptReport(teacher.publicFile, { report, alias }));
  for (const field of ['iv', 'wrappedKey', 'ciphertext']) assert.notEqual(first[field], second[field]);
  assert.equal(Buffer.from(first.iv, 'base64').length, 12);
});
test('random aliases use neutral code format and do not repeat in a synthetic batch', () => {
  const aliases = new Set(Array.from({ length: 100 }, () => generateAlias()));
  assert.equal(aliases.size, 100);
  for (const value of aliases) assert.match(value, /^Learner-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
});
test('incorrect passphrase and another teacher key both fail with a generic error', async () => {
  await assert.rejects(decryptReport(teacher.privateFile, 'Wrong Fictional Passphrase!', encrypted), generic);
  await assert.rejects(decryptReport(otherTeacher.privateFile, 'Different Fictional Classroom 83!', encrypted), generic);
});
test('report ciphertext tampering and nonce tampering are rejected', async () => {
  for (const field of ['ciphertext', 'iv', 'wrappedKey']) await assert.rejects(decryptReport(teacher.privateFile, passphrase, mutate(encrypted, field, flip)), generic);
});
test('report authenticated algorithm/version/fingerprint metadata cannot be changed', async () => {
  for (const [field, value] of [['type', 'other'], ['version', 2], ['cipher', 'AES-CBC'], ['keyAlgorithm', 'RSA-OAEP-SHA-1'], ['fingerprint', otherTeacher.fingerprint]]) {
    await assert.rejects(decryptReport(teacher.privateFile, passphrase, mutate(encrypted, field, () => value)), generic);
  }
});
test('a valid attacker-created AES-128 or AES-192 payload mislabeled as AES-256 is rejected', async () => {
  const encode = new TextEncoder();
  const publicEnvelope = JSON.parse(teacher.publicFile);
  const rsa = await crypto.subtle.importKey('spki', Buffer.from(publicEnvelope.publicKey, 'base64'), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['wrapKey']);
  for (const length of [128, 192]) {
    const weak = await crypto.subtle.generateKey({ name: 'AES-GCM', length }, true, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const label = encode.encode(`Cole Learning Labs/report-key/v1\n${JSON.stringify({ fingerprint: teacher.fingerprint })}`);
    const wrappedKey = await crypto.subtle.wrapKey('raw', weak, rsa, { name: 'RSA-OAEP', label });
    const metadata = { type: 'cll-encrypted-report', version: 1, keyAlgorithm: 'RSA-OAEP-SHA-256', cipher: 'AES-256-GCM', fingerprint: teacher.fingerprint, iv: Buffer.from(iv).toString('base64'), wrappedKey: Buffer.from(wrappedKey).toString('base64') };
    const plaintext = encode.encode(JSON.stringify({ type: 'cll-report-content', version: 1, alias, report }));
    const additionalData = encode.encode(`Cole Learning Labs/report/v1\n${JSON.stringify(metadata)}`);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, weak, plaintext);
    const forged = JSON.stringify({ ...metadata, ciphertext: Buffer.from(ciphertext).toString('base64') });
    await assert.rejects(decryptReport(teacher.privateFile, passphrase, forged), generic);
  }
});
test('private key ciphertext, salt, and nonce tampering fail authentication', async () => {
  for (const field of ['ciphertext', 'salt', 'iv']) await assert.rejects(decryptReport(mutate(teacher.privateFile, field, flip), passphrase, encrypted), generic);
});
test('KDF downgrade and unexpectedly expensive KDF inputs are rejected before derivation', async () => {
  for (const iterations of [1, 599999, 600001, 2147483647, '600000']) await assert.rejects(decryptReport(mutate(teacher.privateFile, 'iterations', () => iterations), passphrase, encrypted), generic);
  await assert.rejects(decryptReport(mutate(teacher.privateFile, 'kdf', () => 'PBKDF2-SHA-1'), passphrase, encrypted), generic);
});
test('unknown fields, incompatible envelopes, invalid JSON, and noncanonical base64 are rejected', async () => {
  await assert.rejects(inspectPublicKey(JSON.stringify({ ...JSON.parse(teacher.publicFile), identity: 'synthetic' })), generic);
  await assert.rejects(decryptReport(teacher.privateFile, passphrase, teacher.publicFile), generic);
  await assert.rejects(inspectPublicKey('{'), generic);
  await assert.rejects(inspectPublicKey(mutate(teacher.publicFile, 'publicKey', value => ` ${value}`)), generic);
  await assert.rejects(decryptReport(teacher.privateFile, passphrase, JSON.stringify({ ...JSON.parse(encrypted), alias: 'unprotected' })), generic);
});
test('public key fingerprint mismatch and weak RSA modulus are rejected', async () => {
  await assert.rejects(inspectPublicKey(mutate(teacher.publicFile, 'fingerprint', () => otherTeacher.fingerprint)), generic);
  const weak = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['wrapKey', 'unwrapKey']);
  const spki = await crypto.subtle.exportKey('spki', weak.publicKey);
  const publicFile = JSON.stringify({ type: 'cll-public-key', version: 1, keyAlgorithm: 'RSA-OAEP-SHA-256', fingerprint: Buffer.from(await crypto.subtle.digest('SHA-256', spki)).toString('base64'), publicKey: Buffer.from(spki).toString('base64') });
  await assert.rejects(inspectPublicKey(publicFile), generic);
});
test('weak RSA public exponent is rejected even with a 3072-bit modulus and correct fingerprint', async () => {
  const weak = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([3]), hash: 'SHA-256' }, true, ['wrapKey', 'unwrapKey']);
  const spki = await crypto.subtle.exportKey('spki', weak.publicKey);
  const publicFile = JSON.stringify({ type: 'cll-public-key', version: 1, keyAlgorithm: 'RSA-OAEP-SHA-256', fingerprint: Buffer.from(await crypto.subtle.digest('SHA-256', spki)).toString('base64'), publicKey: Buffer.from(spki).toString('base64') });
  await assert.rejects(inspectPublicKey(publicFile), generic);
});
test('passphrase length and malformed payloads are bounded', async () => {
  for (const invalid of ['', 'short', 'x'.repeat(257), null]) await assert.rejects(generateTeacherKeyFiles(invalid), generic);
  for (const invalid of ['', ' ', 'x'.repeat(REPORT_LIMITS.reportBytes + 1), '🧪'.repeat(65536), 12]) await assert.rejects(encryptReport(teacher.publicFile, { report: invalid }), generic);
  await assert.rejects(encryptReport(teacher.publicFile, null), generic);
});
test('public alias syntax accepts only neutral learner codes and the optional report field cannot overflow encoded envelope bounds', async () => {
  for (const invalid of ['Name With Spaces', 'synthetic@example.invalid', '<img>', 'Lab-Otter-07', 'x'.repeat(33), null]) await assert.rejects(encryptReport(teacher.publicFile, { report, alias: invalid }), generic);
  await assert.rejects(encryptReport(teacher.publicFile, { report: '\n'.repeat(REPORT_LIMITS.reportBytes) }), generic);
});
test('oversized file envelopes fail instead of being imported or decrypted', async () => {
  await assert.rejects(inspectPublicKey(' '.repeat(REPORT_LIMITS.keyFileBytes + 1)), generic);
  await assert.rejects(decryptReport(' '.repeat(REPORT_LIMITS.keyFileBytes + 1), passphrase, encrypted), generic);
  await assert.rejects(decryptReport(teacher.privateFile, passphrase, ' '.repeat(REPORT_LIMITS.fileBytes + 1)), generic);
});
test('a near-limit ordinary text report can be encrypted and decrypted', async () => {
  const large = 'a'.repeat(REPORT_LIMITS.reportBytes);
  const result = await encryptReport(teacher.publicFile, { report: large });
  assert.ok(Buffer.byteLength(result) <= REPORT_LIMITS.fileBytes);
  assert.equal((await decryptReport(teacher.privateFile, passphrase, result)).report.length, REPORT_LIMITS.reportBytes);
});
test('manual exchange UI has no network/storage sinks and renders decrypted text without HTML execution', async () => {
  const ui = await readFile(new URL('../src/secure-reports.js', import.meta.url), 'utf8');
  const library = await readFile(new URL('../src/report-crypto.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui + library, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|console)\s*(?:\.|\()/);
  assert.doesNotMatch(ui + library, /innerHTML|outerHTML|insertAdjacentHTML|eval\(/);
  assert.match(ui, /byId\('decrypted-text'\)\.textContent = result\.report/);
  assert.match(ui, /'cole-lab-report\.cllreport'/);
  assert.match(ui, /window\.addEventListener\('pagehide', clearPage\)/);
  assert.match(ui, /operation \+= 1/);
  assert.match(ui, /for \(const url of downloads\) URL\.revokeObjectURL\(url\)/);
});
