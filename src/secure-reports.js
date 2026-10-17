import { generateTeacherKeyFiles, inspectPublicKey, encryptReport, decryptReport, generateAlias, REPORT_LIMITS } from './report-crypto.js?release=20261017-workbench11';

const byId = id => document.getElementById(id);
const status = byId('status');
const supported = window.isSecureContext && Boolean(globalThis.crypto?.subtle);
let generatedFiles = null, encryptedFile = null, operation = 0, busy = false;
const downloads = new Set();

function say(message, error = false) { status.textContent = message; status.dataset.error = String(error); }
function lock(value) {
  busy = value;
  for (const field of document.querySelectorAll('button:not(#clear-all), form input, form textarea')) field.disabled = value || !supported;
  document.querySelector('.workspace').setAttribute('aria-busy', String(value));
}
async function fileText(input, maximum, extension) {
  const file = input.files?.[0];
  if (!file || !file.name.toLowerCase().endsWith(extension) || file.size < 1 || file.size > maximum) throw new Error('Invalid file');
  const text = await file.text();
  if (new TextEncoder().encode(text).length > maximum) throw new Error('Invalid file');
  return text;
}
function download(content, filename) {
  if (typeof content !== 'string') return;
  const url = URL.createObjectURL(new Blob([content], { type: 'application/octet-stream' }));
  downloads.add(url);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); }, 1000);
}
function invalidateReport() { encryptedFile = null; byId('report-download').hidden = true; }
function clearPage() {
  operation += 1;
  generatedFiles = null; encryptedFile = null;
  for (const url of downloads) URL.revokeObjectURL(url);
  downloads.clear();
  for (const form of document.querySelectorAll('form')) form.reset();
  for (const id of ['generated-fingerprint', 'decrypted-alias', 'decrypted-text']) byId(id).textContent = '';
  byId('selected-fingerprint').textContent = 'No public key selected.';
  for (const id of ['key-downloads', 'report-download', 'decrypted-result']) byId(id).hidden = true;
  lock(false);
  say('Page cleared. Downloaded files remain on your device.');
}
async function task(message, work) {
  if (busy) return;
  const token = ++operation;
  lock(true); say(message);
  try { await work(() => token === operation); }
  catch { if (token === operation) say('Unable to process this file or input. Check the file type, size, teacher key, and passphrase. No report was sent.', true); }
  finally { if (token === operation) lock(false); }
}

byId('generate-form').addEventListener('submit', event => {
  event.preventDefault();
  task('Creating and protecting your key files on this device. This may take a moment…', async current => {
    generatedFiles = null; byId('key-downloads').hidden = true;
    let passphrase = byId('new-passphrase').value;
    const matches = passphrase === byId('confirm-passphrase').value;
    byId('new-passphrase').value = ''; byId('confirm-passphrase').value = '';
    if (!matches) { passphrase = ''; throw new Error('Passphrases do not match'); }
    let result;
    try { result = await generateTeacherKeyFiles(passphrase); } finally { passphrase = ''; }
    if (!current()) return;
    generatedFiles = result;
    byId('generated-fingerprint').textContent = result.fingerprint;
    byId('key-downloads').hidden = false;
    say('Key files ready. Download and protect the private key; share only the public key.');
  });
});
byId('download-private').addEventListener('click', () => download(generatedFiles?.privateFile, 'cole-teacher-private.cllkey'));
byId('download-public').addEventListener('click', () => download(generatedFiles?.publicFile, 'cole-teacher-public.cllpub'));

byId('public-key-file').addEventListener('change', () => {
  invalidateReport(); byId('fingerprint-confirm').checked = false;
  byId('selected-fingerprint').textContent = 'Checking public key…';
  task('Checking the selected public key locally…', async current => {
    try {
      const text = await fileText(byId('public-key-file'), REPORT_LIMITS.keyFileBytes, '.cllpub');
      const result = await inspectPublicKey(text);
      if (!current()) return;
      byId('selected-fingerprint').textContent = result.fingerprint;
      say('Public key opened. Confirm this fingerprint through your teacher’s trusted instructions.');
    } catch (error) { if (current()) byId('selected-fingerprint').textContent = 'No valid public key selected.'; throw error; }
  });
});
byId('report-file').addEventListener('change', () => {
  invalidateReport();
  task('Opening the text report on this device…', async current => {
    const text = await fileText(byId('report-file'), REPORT_LIMITS.reportBytes, '.txt');
    if (!current()) return;
    byId('report-text').value = text;
    say('Text report opened locally. Check that it contains no personal information.');
  });
});
for (const id of ['report-text', 'student-alias', 'fingerprint-confirm']) byId(id).addEventListener('input', invalidateReport);
byId('encrypt-form').addEventListener('submit', event => {
  event.preventDefault();
  task('Encrypting the report on this device…', async current => {
    invalidateReport();
    if (!byId('fingerprint-confirm').checked) throw new Error('Confirm fingerprint');
    const keyText = await fileText(byId('public-key-file'), REPORT_LIMITS.keyFileBytes, '.cllpub');
    const result = await encryptReport(keyText, { report: byId('report-text').value, alias: byId('student-alias').value });
    if (!current()) return;
    encryptedFile = result; byId('report-download').hidden = false;
    say('Encrypted report ready. Download it, then manually submit through your teacher’s approved assignment system.');
  });
});
byId('download-report').addEventListener('click', () => download(encryptedFile, 'cole-lab-report.cllreport'));
byId('new-alias').addEventListener('click', () => { invalidateReport(); byId('student-alias').value = generateAlias(); say('A random learner code is ready. It will be included only inside the encrypted report.'); });
for (const id of ['private-key-file', 'encrypted-report-file', 'unlock-passphrase']) byId(id).addEventListener('input', () => {
  byId('decrypted-result').hidden = true; byId('decrypted-text').textContent = ''; byId('decrypted-alias').textContent = '';
});
byId('decrypt-form').addEventListener('submit', event => {
  event.preventDefault();
  task('Unlocking the report locally…', async current => {
    byId('decrypted-result').hidden = true; byId('decrypted-text').textContent = ''; byId('decrypted-alias').textContent = '';
    let passphrase = byId('unlock-passphrase').value;
    byId('unlock-passphrase').value = '';
    let result;
    try {
      const [keyText, reportText] = await Promise.all([
        fileText(byId('private-key-file'), REPORT_LIMITS.keyFileBytes, '.cllkey'),
        fileText(byId('encrypted-report-file'), REPORT_LIMITS.fileBytes, '.cllreport')
      ]);
      result = await decryptReport(keyText, passphrase, reportText);
    } finally { passphrase = ''; }
    if (!current()) return;
    byId('decrypted-alias').textContent = result.alias ? `Random learner code: ${result.alias}` : 'No learner code was included.';
    byId('decrypted-text').textContent = result.report;
    byId('decrypted-result').hidden = false;
    say('Report decrypted for local review. Clear this page when finished.');
  });
});
byId('clear-all').addEventListener('click', clearPage);
window.addEventListener('pagehide', clearPage);
window.addEventListener('pageshow', event => { if (event.persisted) { clearPage(); say('For privacy, files and entered text were cleared when this page was left. Reopen your saved files to continue.'); } });
if (!supported) {
  byId('compatibility').hidden = false;
  lock(true); say('Local encryption is unavailable in this browser or connection.', true);
} else byId('student-alias').value = generateAlias();
