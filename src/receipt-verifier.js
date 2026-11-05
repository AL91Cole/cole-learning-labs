import {requestTurnstileToken} from './turnstile-client.js?release=20261107-tech-team';
export const MAX_CODES = 200;
export function parseCodeBatch(value) {
  if (typeof value !== 'string' || value.length > 26000) throw new Error('Paste up to 200 completion codes.');
  const codes = value.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  if (!codes.length) throw new Error('Paste at least one completion code, one per line.');
  if (codes.length > MAX_CODES) throw new Error(`This batch has ${codes.length} codes. Paste ${MAX_CODES} or fewer, one per line.`);
  const long = codes.findIndex(code => code.length > 128);
  if (long !== -1) throw new Error(`Code ${long + 1} is longer than 128 characters. Put each code on its own line.`);
  return codes;
}
export function formatActiveTime(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 86400) return '—';
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}
const REQUEST = Object.freeze({credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error'});
// A filter or captive portal can answer with an HTML page. Never surface the parser's own message.
const readJson = async response => { try { return await response.json(); } catch (error) { if (error?.name === 'AbortError') throw error; return null; } };
// The capability request has no body and never carries codes. 'disabled' means the service answered that it is off.
// 'unreachable' means no usable answer arrived: a network error, a block page or an unexpected status.
export async function checkVerifierAvailability({fetcher = globalThis.fetch, signal} = {}) {
  let capability;
  try { capability = await fetcher('/api/verify', {...REQUEST,signal,method:'GET'}); } catch (error) { if (error?.name === 'AbortError') throw error; return {state:'unreachable',sitekey:null,error}; }
  if (capability.status === 503) return {state:'disabled',sitekey:null};
  if (!capability.ok) return {state:'unreachable',sitekey:null};
  const config = await readJson(capability), sitekey = capability.headers.get('X-CLL-Turnstile-Sitekey');
  if (!config) return {state:'unreachable',sitekey:null};
  return config.enabled === true && sitekey ? {state:'enabled',sitekey} : {state:'disabled',sitekey:null};
}
export async function verifyCodeBatch(codes, {fetcher = globalThis.fetch, tokenProvider = requestTurnstileToken, signal} = {}) {
  const options = {...REQUEST,signal};
  const {state, sitekey, error} = await checkVerifierAvailability({fetcher,signal});
  if (error) throw error;
  if (state === 'unreachable') throw new Error('The verifier is unavailable. Wait a moment, then try again.');
  if (state !== 'enabled') throw new Error('Signed code verification is not enabled on this deployment. Keep the lab report for teacher review.');
  const token = await tokenProvider({sitekey,action:'verify',signal});
  if (!token) throw new Error('The security check could not finish. Check that your browser allows the optional Cloudflare security service, then try again.');
  const response = await fetcher('/api/verify', {...options,method:'POST',headers:{'Content-Type':'application/json','X-CLL-Turnstile':token},body:JSON.stringify({codes})});
  if (response.status === 503) throw new Error('Signed code verification is not enabled on this deployment. Keep the lab report for teacher review.');
  if (response.status === 429) throw new Error('The verifier is busy. Wait a moment, then try again.');
  if (response.status === 403) throw new Error('The security check was not accepted. Your codes are still here. Wait a moment and try again. If it keeps failing, update this browser or use the lab reports.');
  if (!response.ok) throw new Error('The codes could not be checked. Review the batch and try again.');
  const data = await readJson(response);
  if (!Array.isArray(data?.results) || data.results.length !== codes.length || data.results.some(row => !row || typeof row.code !== 'string' || typeof row.valid !== 'boolean' || typeof row.isDuplicate !== 'boolean' || (row.valid && (typeof row.labId !== 'string' || !Number.isInteger(row.score) || row.score < 0 || row.score > 100 || formatActiveTime(row.activeSeconds) === '—' || !/^\d{4}-\d{2}-\d{2}$/u.test(row.date))))) throw new Error('The verifier returned an unexpected response. Try again.');
  return data.results;
}

const AVAILABILITY = Object.freeze({
  checking:'Checking whether code verification is available…',
  enabled:'Code verification is available. Paste codes below, then choose Verify lab codes. No codes are sent until you do.',
  disabled:'Code verification is not enabled on this site right now. You do not need to paste codes, and none have been sent. Use the student’s lab report and a conversation with the student instead.',
  unreachable:'Could not check whether code verification is available. This page has not sent any codes. Try again later or on a different network.'
});
export function mountReceiptVerifier(document, dependencies = {}) {
  const form = document.querySelector('#verify-form');
  if (!form) return () => {};
  const input = document.querySelector('#completion-codes'), submit = document.querySelector('#verify-submit'), clear = document.querySelector('#verify-clear');
  const status = document.querySelector('#verify-status'), region = document.querySelector('#verify-results'), rows = document.querySelector('#verify-rows'), summary = document.querySelector('#verify-summary');
  const availability = document.querySelector('#verify-availability');
  let controller, generation = 0, timer, check, blocked = true;
  // Ask without codes whether the service is on, so nobody is asked to paste codes that cannot be checked.
  // The answer goes above the form only; #verify-status keeps reporting the batch.
  // The notice starts hidden and empty in the page, so without JavaScript only the noscript notice shows.
  const showAvailability = state => { blocked = state !== 'enabled'; input.disabled = submit.disabled = blocked; if (availability) { availability.textContent = AVAILABILITY[state]; availability.dataset.state = state; availability.hidden = false; } };
  const checkAvailability = () => {
    check?.abort(); const current = check = new AbortController();
    showAvailability('checking');
    checkVerifierAvailability({fetcher:dependencies.fetcher,signal:current.signal}).then(({state}) => { if (current === check && !current.signal.aborted) showAvailability(state); }, () => {});
  };
  const clearResults = () => { rows.replaceChildren(); summary.textContent = ''; region.hidden = true; input.removeAttribute?.('aria-invalid'); };
  const reset = () => { generation++; controller?.abort(); clearTimeout(timer); submit.disabled = blocked; input.value = ''; clearResults(); status.textContent = 'Cleared. No codes or results remain on this page.'; input.focus(); };
  // A page restored from the back/forward cache must not show the previous person's batch on a shared computer.
  const onShow = event => { if (event?.persisted !== true) return; generation++; controller?.abort(); clearTimeout(timer); input.value = ''; clearResults(); status.textContent = 'For privacy, codes and results were cleared when this page was left.'; checkAvailability(); };
  const onSubmit = async event => {
    event.preventDefault();
    const current = ++generation;
    controller?.abort(); clearTimeout(timer);
    clearResults();
    let codes;
    try { codes = parseCodeBatch(input.value); } catch (error) { submit.disabled = blocked; status.textContent = error.message; input.setAttribute?.('aria-invalid','true'); input.focus?.(); return; }
    controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 20000);
    submit.disabled = true; status.textContent = `Checking ${codes.length} code${codes.length === 1 ? '' : 's'}…`;
    try {
      const results = await verifyCodeBatch(codes, {...dependencies,signal:controller.signal});
      if (current !== generation) return;
      let valid = 0, duplicate = 0;
      for (const result of results) {
        const kind = !result.valid ? 'invalid' : result.isDuplicate ? 'duplicate' : 'valid';
        if (result.valid) valid++; if (result.isDuplicate) duplicate++;
        const tr = document.createElement('tr'); tr.dataset.status = kind;
        const values = [!result.valid ? `Invalid: ${typeof result.reason === 'string' ? result.reason : 'Signature not verified'}` : result.isDuplicate ? 'Valid signature · repeated code' : 'Valid signature', result.code, result.valid ? result.labId : '—', result.valid ? `${result.score}%` : '—', result.valid ? formatActiveTime(result.activeSeconds) : '—', result.valid ? result.date : '—'];
        values.forEach((value,index) => { const td = document.createElement(index === 0 ? 'th' : 'td'); td.textContent = value; if (index === 0) {td.scope = 'row';td.dataset.kind = kind;} if (index === 1) td.className = 'receipt-code'; tr.append(td); });
        rows.append(tr);
      }
      summary.textContent = `${results.length} checked · ${valid} valid signatures · ${results.length-valid} invalid · ${duplicate} entries with repeated codes`;
      region.hidden = false; status.textContent = summary.textContent + '. Scores and time are browser-reported.';
    } catch (error) {
      if (current === generation) status.textContent = error.name === 'AbortError' ? 'The check timed out. Your codes are still here; try again.' : error.name === 'TypeError' ? 'The verifier could not be reached. Your codes are still here; try again later or use your lab report.' : error.message;
    } finally { if (current === generation) {clearTimeout(timer);submit.disabled = blocked;} }
  };
  const view = document.defaultView;
  form.addEventListener('submit',onSubmit);clear.addEventListener('click',reset);view?.addEventListener?.('pageshow',onShow);
  checkAvailability();
  return () => {generation++;controller?.abort();check?.abort();clearTimeout(timer);form.removeEventListener('submit',onSubmit);clear.removeEventListener('click',reset);view?.removeEventListener?.('pageshow',onShow);};
}
if (typeof document !== 'undefined') mountReceiptVerifier(document);
