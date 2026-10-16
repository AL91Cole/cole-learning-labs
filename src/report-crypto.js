// Browser-only manual exchange. No network, storage, identity, or roster access.
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const ITERATIONS = 600000;
const RSA = 'RSA-OAEP-SHA-256';
const CIPHER = 'AES-256-GCM';
const ERROR = 'Unable to process this file. Check the file, key, and passphrase.';
export const REPORT_LIMITS = Object.freeze({ reportBytes: 131072, fileBytes: 200000, keyFileBytes: 16000, aliasCharacters: 17 });

function reject() { throw new Error(ERROR); }
function api() { if (!globalThis.crypto?.subtle) reject(); return globalThis.crypto; }
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) reject();
}
function parse(text, maximum) {
  if (typeof text !== 'string' || text.length > maximum || encoder.encode(text).length > maximum) reject();
  return JSON.parse(text);
}
function b64(bytes) {
  let result = '';
  for (const value of new Uint8Array(bytes)) result += String.fromCharCode(value);
  return btoa(result);
}
function bytes(value, minimum, maximum = minimum) {
  if (typeof value !== 'string' || value.length > Math.ceil(maximum / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) reject();
  const result = Uint8Array.from(atob(value), character => character.charCodeAt(0));
  if (result.length < minimum || result.length > maximum || b64(result) !== value) reject();
  return result;
}
function random(length) { return api().getRandomValues(new Uint8Array(length)); }
export function generateAlias() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = [...random(8)].map(value => alphabet[value & 31]).join('');
  return `Learner-${code.slice(0, 4)}-${code.slice(4)}`;
}
function aad(domain, metadata) { return encoder.encode(`Cole Learning Labs/${domain}/v1\n${JSON.stringify(metadata)}`); }
function validRsa(key, type) {
  const algorithm = key.algorithm;
  if (key.type !== type || algorithm.name !== 'RSA-OAEP' || ![3072, 4096].includes(algorithm.modulusLength) || algorithm.hash?.name !== 'SHA-256' || b64(algorithm.publicExponent) !== 'AQAB') reject();
  return key;
}
async function fingerprint(spki) { return b64(await api().subtle.digest('SHA-256', spki)); }
function validFingerprint(value) { bytes(value, 32); }
function passphraseBytes(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 16 || passphrase.length > 256) reject();
  const value = encoder.encode(passphrase);
  if (value.length > 1024) reject();
  return value;
}
async function passwordKey(passphrase, salt, usage) {
  const value = passphraseBytes(passphrase);
  try {
    const material = await api().subtle.importKey('raw', value, 'PBKDF2', false, ['deriveKey']);
    return await api().subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
  } finally { value.fill(0); }
}
function publicMetadata(value) { return { type: 'cll-public-key', version: 1, keyAlgorithm: RSA, fingerprint: value.fingerprint, publicKey: value.publicKey }; }
function privateMetadata(value) { return { type: 'cll-private-key', version: 1, keyAlgorithm: RSA, cipher: CIPHER, kdf: 'PBKDF2-SHA-256', iterations: ITERATIONS, fingerprint: value.fingerprint, salt: value.salt, iv: value.iv }; }
function reportMetadata(value) { return { type: 'cll-encrypted-report', version: 1, keyAlgorithm: RSA, cipher: CIPHER, fingerprint: value.fingerprint, iv: value.iv, wrappedKey: value.wrappedKey }; }
async function importPublic(text) {
  const value = parse(text, REPORT_LIMITS.keyFileBytes);
  exact(value, ['type', 'version', 'keyAlgorithm', 'fingerprint', 'publicKey']);
  if (value.type !== 'cll-public-key' || value.version !== 1 || value.keyAlgorithm !== RSA) reject();
  validFingerprint(value.fingerprint);
  const spki = bytes(value.publicKey, 380, 1024);
  if (await fingerprint(spki) !== value.fingerprint) reject();
  const key = validRsa(await api().subtle.importKey('spki', spki, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['wrapKey']), 'public');
  return { value, key };
}

export async function inspectPublicKey(text) {
  try { const { value } = await importPublic(text); return { fingerprint: value.fingerprint }; } catch { reject(); }
}

export async function generateTeacherKeyFiles(passphrase) {
  let privateBytes;
  try {
    const password = passphraseBytes(passphrase); password.fill(0);
    const pair = await api().subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['wrapKey', 'unwrapKey']);
    const publicKey = b64(await api().subtle.exportKey('spki', pair.publicKey));
    const keyFingerprint = await fingerprint(bytes(publicKey, 380, 1024));
    const salt = random(16), iv = random(12);
    const metadata = privateMetadata({ fingerprint: keyFingerprint, salt: b64(salt), iv: b64(iv) });
    const protection = await passwordKey(passphrase, salt, 'encrypt');
    privateBytes = new Uint8Array(await api().subtle.exportKey('pkcs8', pair.privateKey));
    const ciphertext = b64(await api().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad('private-key', metadata), tagLength: 128 }, protection, privateBytes));
    return {
      publicFile: JSON.stringify(publicMetadata({ fingerprint: keyFingerprint, publicKey })),
      privateFile: JSON.stringify({ ...metadata, ciphertext }),
      fingerprint: keyFingerprint
    };
  } catch { reject(); } finally { privateBytes?.fill(0); }
}

export async function encryptReport(publicFile, options = {}) {
  let plaintext;
  try {
    const { report, alias = '' } = options;
    if (typeof report !== 'string' || !report.trim() || report.length > REPORT_LIMITS.reportBytes || encoder.encode(report).length > REPORT_LIMITS.reportBytes || typeof alias !== 'string' || (alias !== '' && !/^Learner-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(alias))) reject();
    const { value, key } = await importPublic(publicFile);
    const reportKey = await api().subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = random(12);
    const wrappedKey = b64(await api().subtle.wrapKey('raw', reportKey, key, { name: 'RSA-OAEP', label: aad('report-key', { fingerprint: value.fingerprint }) }));
    const metadata = reportMetadata({ fingerprint: value.fingerprint, iv: b64(iv), wrappedKey });
    plaintext = encoder.encode(JSON.stringify({ type: 'cll-report-content', version: 1, alias, report }));
    if (plaintext.length > 145000) reject();
    const ciphertext = b64(await api().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad('report', metadata), tagLength: 128 }, reportKey, plaintext));
    const result = JSON.stringify({ ...metadata, ciphertext });
    if (encoder.encode(result).length > REPORT_LIMITS.fileBytes) reject();
    return result;
  } catch { reject(); } finally { plaintext?.fill(0); }
}

export async function decryptReport(privateFile, passphrase, reportFile) {
  let privateBytes, plaintext;
  try {
    const keyFile = parse(privateFile, REPORT_LIMITS.keyFileBytes);
    exact(keyFile, ['type', 'version', 'keyAlgorithm', 'cipher', 'kdf', 'iterations', 'fingerprint', 'salt', 'iv', 'ciphertext']);
    if (keyFile.type !== 'cll-private-key' || keyFile.version !== 1 || keyFile.keyAlgorithm !== RSA || keyFile.cipher !== CIPHER || keyFile.kdf !== 'PBKDF2-SHA-256' || keyFile.iterations !== ITERATIONS) reject();
    validFingerprint(keyFile.fingerprint);
    const salt = bytes(keyFile.salt, 16), keyIv = bytes(keyFile.iv, 12), protectedKey = bytes(keyFile.ciphertext, 1000, 5000);
    const report = parse(reportFile, REPORT_LIMITS.fileBytes);
    exact(report, ['type', 'version', 'keyAlgorithm', 'cipher', 'fingerprint', 'iv', 'wrappedKey', 'ciphertext']);
    if (report.type !== 'cll-encrypted-report' || report.version !== 1 || report.keyAlgorithm !== RSA || report.cipher !== CIPHER || report.fingerprint !== keyFile.fingerprint) reject();
    validFingerprint(report.fingerprint);
    const iv = bytes(report.iv, 12), wrappedKey = bytes(report.wrappedKey, 384, 512), ciphertext = bytes(report.ciphertext, 16, 145016);
    const protection = await passwordKey(passphrase, salt, 'decrypt');
    privateBytes = new Uint8Array(await api().subtle.decrypt({ name: 'AES-GCM', iv: keyIv, additionalData: aad('private-key', privateMetadata(keyFile)), tagLength: 128 }, protection, protectedKey));
    const key = validRsa(await api().subtle.importKey('pkcs8', privateBytes, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['unwrapKey']), 'private');
    if (wrappedKey.length !== key.algorithm.modulusLength / 8) reject();
    const reportKey = await api().subtle.unwrapKey('raw', wrappedKey, key, { name: 'RSA-OAEP', label: aad('report-key', { fingerprint: report.fingerprint }) }, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    // Raw AES import chooses its length from the bytes, not the requested length.
    if (reportKey.algorithm.name !== 'AES-GCM' || reportKey.algorithm.length !== 256) reject();
    plaintext = new Uint8Array(await api().subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad('report', reportMetadata(report)), tagLength: 128 }, reportKey, ciphertext));
    const content = parse(decoder.decode(plaintext), 145000);
    exact(content, ['type', 'version', 'alias', 'report']);
    if (content.type !== 'cll-report-content' || content.version !== 1 || typeof content.report !== 'string' || !content.report.trim() || encoder.encode(content.report).length > REPORT_LIMITS.reportBytes || typeof content.alias !== 'string' || (content.alias !== '' && !/^Learner-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(content.alias))) reject();
    return { alias: content.alias, report: content.report };
  } catch { reject(); } finally { privateBytes?.fill(0); plaintext?.fill(0); }
}
