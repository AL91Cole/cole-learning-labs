// Reports stay in memory until a learner explicitly uses a save/share control.
// This module has no network client or persistent storage.
export const REPORT_TEXT_TYPE = 'text/plain;charset=utf-8';
export const REPORT_SHARE_TYPE = 'text/plain';

export function reportFilename(labId) {
  // Only an existing fictional lab identifier belongs in a download name.
  // Titles, aliases and student notes must never become attachment metadata.
  const id = typeof labId === 'string' && /^(?:INC|NET|AI|SEC|CODE|CAP)-\d{3}$/.test(labId) ? `-${labId}` : '';
  return `cole-learning-labs${id}.txt`;
}

export function createTextReport(content, labId, { BlobType = globalThis.Blob, FileType = globalThis.File } = {}) {
  const text = String(content).replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
  const filename = reportFilename(labId);
  const blob = new BlobType([text], { type: REPORT_TEXT_TYPE });
  let file = null;
  // File sharing is optional; a failed/absent File constructor cannot break downloads.
  // Chromium's native share MIME allowlist requires the exact text/plain value;
  // a charset parameter can reject a share even though its Blob downloads work.
  // Wrapping the Blob changes metadata only, preserving the same UTF-8 bytes.
  try { if (typeof FileType === 'function') file = new FileType([blob], filename, { type: REPORT_SHARE_TYPE, lastModified: 0 }); } catch { /* Use the Blob download and copy options. */ }
  return { text, filename, blob, file };
}

export function canShareTextReport(artifact, browser = globalThis.navigator) {
  if (!artifact?.file || typeof browser?.share !== 'function' || typeof browser?.canShare !== 'function') return false;
  try { return browser.canShare({ files: [artifact.file] }) === true; } catch { return false; }
}

// Called directly by a click handler, with a prebuilt File, so no asynchronous
// preparation consumes the browser's required user activation before share().
export async function shareTextReport(artifact, browser = globalThis.navigator) {
  if (!canShareTextReport(artifact, browser)) return 'unavailable';
  try {
    await browser.share({ files: [artifact.file] });
    // A resolved platform share is not proof that a file was saved or submitted.
    return 'opened';
  } catch (error) {
    return error?.name === 'AbortError' ? 'cancelled' : 'blocked';
  }
}

// A clicked Blob link may be consumed asynchronously by the browser. Drop
// unused links immediately, but give requested downloads a minute to start.
export function createReportURLs({ api = globalThis.URL, schedule = globalThis.setTimeout } = {}) {
  const urls = new Map();
  return {
    create(blob) { const url = api.createObjectURL(blob); urls.set(url, false); return url; },
    requested(url) { if (urls.has(url)) urls.set(url, true); },
    release(url) {
      if (!urls.has(url)) return;
      const requested = urls.get(url); urls.delete(url);
      if (requested) { const timer = schedule(() => api.revokeObjectURL(url), 60000); timer?.unref?.(); }
      else api.revokeObjectURL(url);
    },
    clear() { for (const url of [...urls.keys()]) this.release(url); }
  };
}
