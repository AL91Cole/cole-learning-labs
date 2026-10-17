/** Optional, fail-closed classroom service. Public simulations remain independent. */
import { SCENARIOS } from '../../src/scenarios.js';
import { EXPANDED_SCENARIOS, expandedStateFields } from '../../src/expanded-labs.js';
import { CODING_SCENARIOS } from '../../src/coding-lab.js';
// Production release lock. Only a reviewed code release may change this after the
// applicable privacy, legal, district-agreement, and operational requirements are met.
// Environment variables, request values, and runtime options cannot approve a release.
const CLASSROOM_PRIVACY_REVIEW_APPROVED = false;
const DAY = 86_400_000;
const RETENTION = 90 * DAY;
const COOKIE = '__Host-cll_student';
const MAX_WORK = 65_536;
const MAX_BODY = MAX_WORK + 4_096;
const MAX_SUBMISSIONS = 5;
const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const LABS = Object.freeze(Object.fromEntries(SCENARIOS.map(scenario=>[scenario.id,scenario.title])));
const encoder = new TextEncoder();
const keyCache = new Map();
const certificateCache = new Map();
const cleanupState = new WeakMap();

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const iso = value => value == null ? null : new Date(value).toISOString();
const changes = result => Number(result?.meta?.changes || 0);
const stmt = (db, sql, ...values) => db.prepare(sql).bind(...values);
const first = (db, sql, ...values) => stmt(db, sql, ...values).first();
const all = async (db, sql, ...values) => (await stmt(db, sql, ...values).all()).results || [];
const run = (db, sql, ...values) => stmt(db, sql, ...values).run();
const validId = value => typeof value === 'string' && ID.test(value);
const integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min && value <= 1_000_000;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

function config(env) {
  const team = typeof env.CF_ACCESS_TEAM_DOMAIN === 'string' ? env.CF_ACCESS_TEAM_DOMAIN.trim().toLowerCase() : '';
  const aud = typeof env.CF_ACCESS_AUD === 'string' ? env.CF_ACCESS_AUD.trim() : '';
  const entries = typeof env.TEACHER_EMAILS === 'string' ? env.TEACHER_EMAILS.split(',').map(x => x.trim().toLowerCase()) : [];
  const email = /^[^\s@,]{1,64}@[^\s@,]{1,190}\.[^\s@,]{2,63}$/;
  if (env.CLASSROOM_ENABLED !== 'true' || !env.CLASSROOM_DB?.prepare || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(team) ||
      !/^[A-Za-z0-9_-]{8,256}$/.test(aud) || !entries.length || entries.length > 50 || entries.some(x => !email.test(x))) return null;
  return { team, aud, teachers: new Set(entries) };
}

function response(body, status = 200, cookie = null) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=15552000',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), display-capture=(), usb=(), serial=(), hid=(), payment=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Vary': 'Cookie, Cf-Access-Jwt-Assertion'
  });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function cookieValue(request, name) {
  const source = request.headers.get('Cookie') || '';
  if (source.length > 24_000) return null;
  const matches = source.split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}
function studentCookie(token, expires, now) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.floor((expires - now) / 1000))}`;
}
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), x => x.toString(16).padStart(2, '0')).join('');
}
function randomToken(bytes = 32) {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function joinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'CLL-' + Array.from(crypto.getRandomValues(new Uint8Array(12)), x => alphabet[x & 31]).join('');
}
function learnerAlias() {
  // These labels contain no roster identifier and are never access credentials.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)), x => alphabet[x & 31]).join('');
  return `Learner-${random.slice(0, 4)}-${random.slice(4)}`;
}
function normalizeCode(value) {
  if (typeof value !== 'string' || value.length > 40) fail(400, 'invalid_code', 'Enter the class code supplied by your teacher.');
  const code = value.trim().toUpperCase().replaceAll(' ', '');
  if (!/^CLL-[A-HJ-NP-Z2-9]{12}$/.test(code)) fail(400, 'invalid_code', 'Enter the class code supplied by your teacher.');
  return code;
}
function text(value, max, name, optional = false) {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail(400, 'invalid_input', `Check ${name}.`);
  const clean = value.trim();
  if (!optional && !clean) fail(400, 'invalid_input', `Enter ${name}.`);
  return clean;
}
function only(body, allowed) {
  if (!plain(body) || Object.keys(body).some(k => !allowed.includes(k))) fail(400, 'invalid_input', 'The request contains unsupported fields.');
}
const invalidWork = () => fail(400, 'invalid_work', 'Use the supported lab work format and field limits.');
const privateWorkField = () => fail(400, 'privacy_violation', 'Identity, credential, and unsupported fields cannot be saved as lab work. Use fictional information in the supported lab fields.');
const workString = max => value => typeof value === 'string' && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const workBoolean = value => typeof value === 'boolean';
const workCount = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
const workEnum = values => value => values.includes(value);
const workList = (check, max) => value => Array.isArray(value) && value.length <= max && value.every(check);
function workFields(value, schema) {
  if (!plain(value)) invalidWork();
  // Check every record's complete shape before accepting any of its values.
  // This also excludes nested identity mappings and provider credentials; text
  // remains learner-authored and is not claimed to be automatically de-identified.
  if (Object.keys(value).some(key => !Object.hasOwn(schema, key))) privateWorkField();
  for (const [key, field] of Object.entries(value)) if (!schema[key](field)) invalidWork();
  return true;
}
const workRecord = schema => value => workFields(value, schema);
// Assembly saves have a fixed, versioned shape. No identity mappings, arbitrary
// component metadata, or renderer objects belong in a classroom draft.
const assemblyStateFields = {
  version: workEnum([1]),
  ...Object.fromEntries(['panelInstalled', 'psuInstalled', 'retentionOpen', 'ramClipsOpen', 'pcieLatchOpen', 'cpuFanConnected'].map(key => [key, workBoolean])),
  ...Object.fromEntries(Object.entries({ panelScrews: 2, psuScrews: 4, boardScrews: 4, coolerScrews: 4, gpuScrews: 2, ssdScrews: 2 }).map(([key, count]) => [key, value => Array.isArray(value) && value.length === count && Array.from({ length: count }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index))?.value).every(workBoolean)])),
  paste: workEnum(['clean', 'pea', 'excess', 'dry'])
};
const assemblyState = value => {
  if (value === null) return true;
  workFields(value, assemblyStateFields);
  return Object.keys(value).length === Object.keys(assemblyStateFields).length;
};
const assemblyActionIds = [
  ...Object.entries({ panel: 2, psu: 4, board: 4, cooler: 4, gpu: 2, ssd: 2 }).flatMap(([group, count]) => Array.from({ length: count }, (_, index) => [`asm-tighten-${group}-${index}`, `asm-loosen-${group}-${index}`]).flat()),
  ...['panel', 'psu', 'board', 'cpu', 'cooler', 'ram', 'gpu', 'ssd'].flatMap(part => [`asm-fit-${part}`, `asm-remove-${part}`]),
  ...['retention', 'ram-clips', 'pcie-latch'].flatMap(part => [`asm-open-${part}`, `asm-close-${part}`]),
  'asm-clean-paste', 'asm-apply-paste', 'asm-excess-paste',
  ...['atx', 'eps', 'gpu-power', 'sata-data', 'sata-power', 'front-panel', 'cpu-fan', 'display'].flatMap(lead => [`asm-connect-${lead}`, `asm-disconnect-${lead}`])
];
const hardwareParts = ['monitor', 'rear', 'power', 'board', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'sata', 'atx', 'eps', 'gpu-power', 'sata-power', 'front'];
const hardwareActions = [
  'enable-assembly', ...assemblyActionIds,
  'power-off', 'unplug', 'plug-in', 'boot', 'video-gpu', 'video-board', 'input-hdmi', 'input-displayport', 'connect-signal', 'disconnect-signal', 'open-document', 'close-document',
  'seat-ram', 'unseat-ram', 'disconnect-sata', 'install-original', 'choose-nvme',
  'install-board', 'install-cpu', 'install-cooler', 'install-ram', 'install-gpu', 'install-drive',
  'connect-atx', 'connect-cpu-power', 'connect-gpu-power', 'connect-sata', 'connect-sata-power', 'connect-front-panel',
  ...hardwareParts.map(part => `inspect-${part}`)
];
const hardwareStateFields = {
  ...Object.fromEntries(['pcOn', 'acConnected', 'boardInstalled', 'cpuInstalled', 'coolerInstalled', 'ramSeated', 'gpuInstalled', 'atxConnected', 'cpuPowerConnected', 'gpuPowerConnected', 'frontPanelConnected', 'originalDriveInstalled', 'sataDataConnected', 'sataPowerConnected', 'booted', 'documentOpened', 'signalConnected', 'assemblyEnabled'].map(key => [key, workBoolean])),
  assembly: assemblyState,
  monitorInput: workEnum(['hdmi','displayport']), videoPort: workEnum(['board', 'gpu']), selectedDrive: workEnum(['sata', 'nvme']),
  view: workEnum(['bench', 'internals', 'rear', 'display']), selectedPart: workEnum(hardwareParts),
  evidence: workList(workEnum(hardwareParts), hardwareParts.length), actions: workList(workEnum(hardwareActions), 250), bootCount: workCount
};
const workspaceCommonFields = {
  tested: workBoolean, workspaceEdits: workCount, checkRuns: workCount,
  results: workList(workRecord({ label: workString(300), ok: workBoolean }), 10)
};
const expandedWorkspaceFields=Object.fromEntries(EXPANDED_SCENARIOS.map(scenario=>[scenario.id,{testSignature:workString(160),...Object.fromEntries(Object.entries(expandedStateFields(scenario.id)).map(([field,values])=>[field,workEnum(values)]))}]));
const codingWorkspaceFields=Object.fromEntries(CODING_SCENARIOS.map(scenario=>[scenario.id,{code:workString(4000),sourceAtRun:workString(4000),fixtureIndex:value=>Number.isInteger(value)&&value>=0&&value<=(scenario.id==='CODE-502'?3:2),output:workList(workString(300),20),errors:workList(workRecord({line:value=>Number.isInteger(value)&&value>=1&&value<=4001,message:workString(300)}),1)}]));
const workspaceStateFields = {
  ...expandedWorkspaceFields, ...codingWorkspaceFields,
  'NET-201': Object.fromEntries(['ip', 'mask', 'gateway', 'dns'].map(key => [key, workString(64)])),
  'NET-202': { network: workEnum(['School-Guest', 'Staff-Lab']), folder: workEnum(['All folders', 'Project Materials', 'No folders']), permission: workEnum(['Full control', 'Modify', 'Read', 'None', 'Administrator', 'Edit all folders', 'Read only', 'No access']) },
  'NET-203': { recovery: workEnum(['Keep current update', 'Roll back KB-LAB-17', 'Reset and erase files']), status: workEnum(['Stopped', 'Running']), startup: workEnum(['Disabled', 'Manual', 'Automatic']) },
  'AI-301': { prompt: workString(3000), audit: workList(workString(300), 20) },
  'AI-302': { claims: workList(workEnum(['unreviewed', 'supported', 'unsupported', 'biased']), 3), ticketA: workEnum(['unreviewed', 'Display / cable', 'Password reset', 'User effort']), ticketB: workEnum(['unreviewed', 'Display / cable', 'Password reset', 'User effort']) },
  'AI-303': { secret: workEnum(['hardcoded', 'environment']), query: workEnum(['concatenated', 'parameterized']), authorization: workEnum(['signed-in', 'hidden', 'owner']) },
  'SEC-401': { message: workEnum(['urgent', 'routine']), verdict: workEnum(['unreviewed', 'safe', 'phishing']), flags: workList(workEnum(['sender', 'destination', 'urgency']), 3), permission: workEnum(['Full control', 'Modify', 'Read', 'None', 'Administrator', 'Edit all folders', 'Read only', 'No access']) },
  'SEC-402': { events: workList(workEnum(['EVT-101', 'EVT-102', 'EVT-103', 'EVT-104']), 4), source: workString(64), port: workEnum(['', '23', '443', '53']), keepHttps: workBoolean },
  'SEC-403': { scope: workBoolean, patch: workEnum(['none', 'hidden', 'owner']), requested: workEnum(['101', '102']), observed: workBoolean, history: workList(workString(300), 8), response: value => value === null || workFields(value, { status: workEnum([200, 403]), id: workEnum(['101', '102']), owner: workEnum(['learner-101', 'learner-102']), body: workString(2000) }) }
};
function workPayload(value, labId) {
  const scenario = SCENARIOS.find(item => item.id === labId);
  if (!scenario) invalidWork();
  const stateFields = scenario.track === 'hardware' ? { ...hardwareStateFields, caseId: workEnum([labId]) } : { ...workspaceCommonFields, ...workspaceStateFields[labId] };
  workFields(value, {
    state: workRecord(stateFields),
    evidence: workList(workEnum(scenario.clues.map(clue => clue.id)), scenario.clues.length),
    questions: workList(index => Number.isInteger(index) && index >= 0 && index < scenario.questions.length, scenario.questions.length),
    events: workList(workRecord({ time: workString(40), message: workString(600), kind: workEnum(['info', 'warning', 'success']) }), 100),
    plan: workString(2000), notes: workString(4000), reflection: workString(2000), verified: workBoolean, closed: workBoolean
  });
  const json = JSON.stringify(value);
  if (encoder.encode(json).byteLength > MAX_WORK) fail(413, 'work_too_large', 'Work must be 64 KiB or smaller.');
  return json;
}

async function readBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) fail(415, 'json_required', 'Send this request as JSON.');
  const declared = request.headers.get('Content-Length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY)) fail(413, 'request_too_large', 'The request is too large.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'invalid_json', 'A JSON body is required.');
  let size = 0; const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); fail(413, 'request_too_large', 'The request is too large.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!plain(value)) fail(400, 'invalid_json', 'The request must be a JSON object.');
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(400, 'invalid_json', 'The JSON request could not be read.');
  } finally { reader.releaseLock(); }
}

function decodePart(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('Invalid JWT encoding');
  const bytes = Uint8Array.from(atob(part.replaceAll('-', '+').replaceAll('_', '/')), x => x.charCodeAt(0));
  return bytes;
}
async function teacherIdentity(request, cfg, runtime, required = true) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || cookieValue(request, 'CF_Authorization');
  if (!token) { if (!required) return null; fail(401, 'teacher_sign_in_required', 'Sign in through your school-approved teacher access page.'); }
  try {
    if (token.length > 16_000) throw new Error('Oversized JWT');
    const parts = token.split('.'); if (parts.length !== 3) throw new Error('Invalid JWT');
    const header = JSON.parse(new TextDecoder().decode(decodePart(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodePart(parts[1])));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(header.kid) || header.crit || header.jku || header.x5u) throw new Error('Invalid JWT header');
    const nowSeconds = Math.floor(runtime.now() / 1000);
    if (claims.iss !== `https://${cfg.team}` || !(Array.isArray(claims.aud) ? claims.aud.includes(cfg.aud) : claims.aud === cfg.aud) ||
        !Number.isSafeInteger(claims.exp) || claims.exp <= nowSeconds || !Number.isSafeInteger(claims.iat) || claims.iat > nowSeconds + 60 || claims.iat < 0 || claims.exp <= claims.iat ||
        (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > nowSeconds + 60)) ||
        typeof claims.email !== 'string') throw new Error('Invalid JWT claims');
    const cacheKey = `${cfg.team}:${header.kid}`;
    let cached = keyCache.get(cacheKey);
    if (!cached || cached.expires <= runtime.now()) {
      let certificates = certificateCache.get(cfg.team);
      if (!certificates || certificates.expires <= runtime.now()) {
        // Cache the whole fetch (including an unknown kid) to bound signing-key lookups.
        const promise = (async () => {
          const certificateResponse = await runtime.fetch(`https://${cfg.team}/cdn-cgi/access/certs`, { redirect: 'error', signal: AbortSignal.timeout(5000) });
          if (!certificateResponse.ok) throw new Error('Unavailable signing certificates');
          const bytes = await certificateResponse.text();
          if (bytes.length > 100_000) throw new Error('Oversized certificates');
          const jwks = JSON.parse(bytes);
          if (!Array.isArray(jwks.keys) || jwks.keys.length > 30) throw new Error('Invalid signing certificates');
          return jwks.keys;
        })();
        certificates = { promise, expires: runtime.now() + 30_000 };
        if (certificateCache.size > 50) certificateCache.clear();
        certificateCache.set(cfg.team, certificates);
      }
      const keys = await certificates.promise;
      const jwk = keys.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256') && (!k.use || k.use === 'sig'));
      if (!jwk) throw new Error('Unknown signing key');
      cached = { key: await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']), expires: runtime.now() + 300_000 };
      if (keyCache.size > 100) keyCache.clear();
      keyCache.set(cacheKey, cached);
    }
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cached.key, decodePart(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))) throw new Error('Invalid signature');
    const email = claims.email.trim().toLowerCase();
    if (!cfg.teachers.has(email)) fail(403, 'teacher_not_allowed', 'This signed-in account is not an approved teacher for this service.');
    return { email };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(401, 'invalid_teacher_session', 'Teacher authentication could not be verified. Sign in again.');
  }
}

const classPublic = row => ({ id: row.id, name: row.name, locked: !!row.locked, expiresAt: iso(row.expires_at) });
const classTeacher = row => ({ ...classPublic(row), code: row.join_code, createdAt: iso(row.created_at), studentCount: Number(row.student_count || 0), assignmentCount: Number(row.assignment_count || 0) });
const assignmentJSON = row => ({ id: row.id, labId: row.lab_id, title: row.title, createdAt: iso(row.created_at) });
const draftJSON = row => row ? { version: row.version, work: JSON.parse(row.work_json), updatedAt: iso(row.updated_at) } : { version: 0, work: null, updatedAt: null };
const submissionJSON = row => ({ id: row.id, assignmentId: row.assignment_id, studentId: row.student_id, draftVersion: row.draft_version, revision: row.revision, work: JSON.parse(row.work_json), createdAt: iso(row.created_at), status: row.status, grade: row.grade, feedback: row.feedback, gradedAt: iso(row.graded_at) });
async function getStudent(request, db, now, required = true) {
  const token = cookieValue(request, COOKIE);
  const row = token && /^[A-Za-z0-9_-]{43}$/.test(token) ? await first(db, `SELECT s.id AS student_id, s.alias, s.class_id, s.joined_at, c.*
    FROM student_sessions t JOIN students s ON s.id=t.student_id JOIN classrooms c ON c.id=s.class_id
    WHERE t.token_hash=? AND t.expires_at>? AND c.expires_at>?`, await hash(token), now, now) : null;
  if (!row && required) fail(401, 'student_session_required', 'Join a class in this browser to open your own work.');
  return row;
}
function assertExpectedStudent(expected, student) {
  if (!validId(expected) || expected !== student.student_id) fail(409, 'student_session_changed', 'The classroom session changed. Export your local work and reopen the classroom before sharing or leaving a session.');
}
async function ownedClass(db, id, teacher, now) {
  if (!validId(id)) fail(404, 'class_not_found', 'Class not found.');
  const row = await first(db, 'SELECT * FROM classrooms WHERE id=? AND teacher_email=? AND expires_at>?', id, teacher.email, now);
  if (!row) fail(404, 'class_not_found', 'Class not found.');
  return row;
}
async function studentAssignment(db, id, student, now, writable = false) {
  if (!validId(id)) fail(404, 'assignment_not_found', 'Assignment not found.');
  const row = await first(db, `SELECT a.*, c.locked, c.expires_at FROM assignments a JOIN classrooms c ON c.id=a.class_id
    WHERE a.id=? AND a.class_id=? AND c.expires_at>?`, id, student.class_id, now);
  if (!row) fail(404, 'assignment_not_found', 'Assignment not found.');
  if (writable && row.locked) fail(409, 'class_locked', 'This class is locked. You can still review your saved work.');
  return row;
}
async function studentSessionJSON(db, student) {
  return { enabled: true, role: 'student', student: { id: student.student_id, alias: student.alias, classId: student.class_id }, classroom: classPublic(student), assignments: (await all(db, 'SELECT * FROM assignments WHERE class_id=? ORDER BY created_at, id', student.class_id)).map(assignmentJSON) };
}
async function purgeExpired(db, now) {
  await db.batch([
    stmt(db, 'DELETE FROM classrooms WHERE expires_at<=?', now),
    stmt(db, 'DELETE FROM student_sessions WHERE expires_at<=?', now),
    stmt(db, 'DELETE FROM join_limits WHERE expires_at<=?', now)
  ]);
}
async function maintainExpired(db, binding, now) {
  let state = cleanupState.get(binding);
  if (!state) { state = { attemptedAt: null, pending: null }; cleanupState.set(binding, state); }
  if (state.pending) return state.pending;
  if (state.attemptedAt !== null && now >= state.attemptedAt && now - state.attemptedAt < 60_000) return;
  // Only authenticated teachers call this. Coalesce concurrent requests and throttle
  // attempts (including failed attempts) per database binding in this isolate.
  state.attemptedAt = now;
  state.pending = purgeExpired(db, now).finally(() => { state.pending = null; });
  return state.pending;
}

async function handleStudent(request, db, path, body, now) {
  const method = request.method;
  if (path === '/student/join' && method === 'POST') {
    only(body, ['code']);
    const alias = learnerAlias();
    const bucket = await hash(`${Math.floor(now / 600_000)}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`);
    const attempts = await first(db, `INSERT INTO join_limits(bucket, attempts, expires_at) VALUES(?,1,?)
      ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts`, bucket, now + 3_600_000);
    if (attempts.attempts > 600) fail(429, 'join_rate_limited', 'Too many join attempts. Ask your teacher to try again later.');
    const code = normalizeCode(body.code);
    const classroom = await first(db, 'SELECT * FROM classrooms WHERE join_code_hash=? AND expires_at>?', await hash(code), now);
    if (!classroom) fail(404, 'class_unavailable', 'The class code is unavailable. Check it with your teacher.');
    if (classroom.locked) fail(409, 'class_locked', 'This class is locked. Ask your teacher about joining.');
    const existing = await getStudent(request, db, now, false);
    if (existing) {
      if (existing.class_id !== classroom.id) fail(409, 'active_class_session', 'Log out of your current class before joining another. Export any work you need first.');
      return response(await studentSessionJSON(db, existing));
    }
    const id = crypto.randomUUID(); const token = randomToken();
    const results = await db.batch([
      stmt(db, `INSERT INTO students(id,class_id,alias,joined_at) SELECT ?,?,?,? WHERE
        (SELECT COUNT(*) FROM students WHERE class_id=?)<100 AND EXISTS(SELECT 1 FROM classrooms WHERE id=? AND locked=0 AND expires_at>?)`, id, classroom.id, alias, now, classroom.id, classroom.id, now),
      stmt(db, 'INSERT INTO student_sessions(token_hash,student_id,expires_at) SELECT ?,id,? FROM students WHERE id=?', await hash(token), classroom.expires_at, id)
    ]);
    if (!changes(results[0])) fail(409, 'class_join_unavailable', 'This class is full, locked, or no longer available. Ask your teacher.');
    const student = await getStudent(new Request(request.url, { headers: { Cookie: `${COOKIE}=${token}` } }), db, now);
    return response(await studentSessionJSON(db, student), 201, studentCookie(token, classroom.expires_at, now));
  }
  if (path === '/student/logout' && method === 'POST') {
    only(body, []);
    const student = await getStudent(request, db, now, false);
    if (student) assertExpectedStudent(request.headers.get('X-Classroom-Student'), student);
    const token = cookieValue(request, COOKIE);
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await run(db, 'DELETE FROM student_sessions WHERE token_hash=?', await hash(token));
    return response({ loggedOut: true }, 200, clearCookie());
  }
  const student = await getStudent(request, db, now);
  let match = path.match(/^\/student\/work\/([a-f0-9-]+)$/);
  if (match && ['GET', 'PUT'].includes(method)) {
    const assignmentId = match[1];
    if (method === 'GET') assertExpectedStudent(request.headers.get('X-Classroom-Student'), student);
    else {
      only(body, ['expectedStudentId', 'expectedVersion', 'work']);
      assertExpectedStudent(body.expectedStudentId, student);
    }
    const assignment = await studentAssignment(db, assignmentId, student, now, method === 'PUT');
    if (method === 'GET') {
      return response({ assignment: assignmentJSON(assignment), draft: draftJSON(await first(db, 'SELECT * FROM drafts WHERE student_id=? AND assignment_id=?', student.student_id, assignmentId)), submissions: (await all(db, 'SELECT * FROM submissions WHERE student_id=? AND assignment_id=? ORDER BY draft_version DESC', student.student_id, assignmentId)).map(submissionJSON) });
    }
    if (!integer(body.expectedVersion)) fail(400, 'invalid_version', 'A valid expected draft version is required.');
    const json = workPayload(body.work, assignment.lab_id);
    let result;
    if (body.expectedVersion === 0) {
      result = await run(db, `INSERT OR IGNORE INTO drafts(student_id,assignment_id,work_json,version,updated_at)
        SELECT ?,?,?,1,? WHERE EXISTS(SELECT 1 FROM classrooms WHERE id=? AND locked=0 AND expires_at>?)`, student.student_id, assignmentId, json, now, student.class_id, now);
    } else {
      result = await run(db, `UPDATE drafts SET work_json=?,version=version+1,updated_at=? WHERE student_id=? AND assignment_id=? AND version=?
        AND EXISTS(SELECT 1 FROM classrooms WHERE id=? AND locked=0 AND expires_at>?)`, json, now, student.student_id, assignmentId, body.expectedVersion, student.class_id, now);
    }
    if (!changes(result)) fail(409, 'draft_conflict', 'The draft changed or the class is locked. Reload saved work before trying again.');
    return response({ draft: draftJSON(await first(db, 'SELECT * FROM drafts WHERE student_id=? AND assignment_id=?', student.student_id, assignmentId)) });
  }
  if (path === '/student/submit' && method === 'POST') {
    only(body, ['expectedStudentId', 'assignmentId', 'expectedVersion']);
    assertExpectedStudent(body.expectedStudentId, student);
    await studentAssignment(db, body.assignmentId, student, now, true);
    if (!integer(body.expectedVersion, 1)) fail(400, 'invalid_version', 'Save a draft and provide its current version before submitting.');
    const existing = await first(db, 'SELECT * FROM submissions WHERE student_id=? AND assignment_id=? AND draft_version=?', student.student_id, body.assignmentId, body.expectedVersion);
    if (existing) return response({ submission: submissionJSON(existing) });
    const id = crypto.randomUUID();
    const result = await run(db, `INSERT OR IGNORE INTO submissions(id,student_id,assignment_id,draft_version,work_json,created_at)
      SELECT ?,d.student_id,d.assignment_id,d.version,d.work_json,? FROM drafts d
      JOIN assignments a ON a.id=d.assignment_id JOIN classrooms c ON c.id=a.class_id
      WHERE d.student_id=? AND d.assignment_id=? AND d.version=? AND c.locked=0 AND c.expires_at>?
      AND (SELECT COUNT(*) FROM submissions WHERE student_id=? AND assignment_id=?)<?`, id, now, student.student_id, body.assignmentId, body.expectedVersion, now, student.student_id, body.assignmentId, MAX_SUBMISSIONS);
    if (!changes(result)) {
      const duplicate = await first(db, 'SELECT * FROM submissions WHERE student_id=? AND assignment_id=? AND draft_version=?', student.student_id, body.assignmentId, body.expectedVersion);
      if (duplicate) return response({ submission: submissionJSON(duplicate) });
      fail(409, 'submission_conflict', 'Reload your current draft. The class may be locked or the five-submission limit reached.');
    }
    return response({ submission: submissionJSON(await first(db, 'SELECT * FROM submissions WHERE id=?', id)) }, 201);
  }
  fail(404, 'not_found', 'API route not found.');
}

async function handleTeacher(request, db, path, body, teacher, now) {
  const method = request.method;
  if (path === '/teacher/classes' && method === 'GET') {
    return response({ classes: (await all(db, `SELECT c.*,(SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) AS student_count,
      (SELECT COUNT(*) FROM assignments a WHERE a.class_id=c.id) AS assignment_count FROM classrooms c WHERE teacher_email=? AND expires_at>? ORDER BY created_at DESC`, teacher.email, now)).map(classTeacher) });
  }
  if (path === '/teacher/classes' && method === 'POST') {
    only(body, ['name']); const name = text(body.name, 100, 'a class name');
    const id = crypto.randomUUID(); const code = joinCode();
    const result = await run(db, `INSERT INTO classrooms(id,teacher_email,name,join_code,join_code_hash,created_at,expires_at)
      SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM classrooms WHERE teacher_email=? AND expires_at>?)<10`, id, teacher.email, name, code, await hash(code), now, now + RETENTION, teacher.email, now);
    if (!changes(result)) fail(409, 'class_limit', 'Each teacher can maintain up to ten active classes. Delete an old class before adding another.');
    return response({ classroom: classTeacher(await first(db, 'SELECT * FROM classrooms WHERE id=?', id)) }, 201);
  }
  const match = path.match(/^\/teacher\/classes\/([a-f0-9-]+)(.*)$/);
  if (!match) fail(404, 'not_found', 'API route not found.');
  const classroom = await ownedClass(db, match[1], teacher, now); const suffix = match[2];
  if (!suffix && method === 'DELETE') {
    only(body, []);
    await run(db, 'DELETE FROM classrooms WHERE id=? AND teacher_email=?', classroom.id, teacher.email);
    return response({ deleted: true });
  }
  if (!suffix && method === 'PATCH') {
    only(body, ['locked']);
    if (typeof body.locked !== 'boolean') fail(400, 'invalid_input', 'Choose whether this class is locked.');
    await run(db, 'UPDATE classrooms SET locked=? WHERE id=? AND teacher_email=?', body.locked ? 1 : 0, classroom.id, teacher.email);
    return response({ classroom: classTeacher({ ...classroom, locked: body.locked ? 1 : 0 }) });
  }
  if (!suffix && method === 'GET') {
    const students = await all(db, 'SELECT id,alias,joined_at FROM students WHERE class_id=? ORDER BY joined_at,id', classroom.id);
    const assignments = await all(db, 'SELECT * FROM assignments WHERE class_id=? ORDER BY created_at,id', classroom.id);
    const rows = await all(db, `SELECT s.id AS student_id,a.id AS assignment_id,d.version,d.updated_at,
      CASE WHEN json_type(d.work_json,'$.verified')='true' THEN 1 ELSE 0 END AS reported_verified,
      CASE WHEN json_type(d.work_json,'$.closed')='true' THEN 1 ELSE 0 END AS reported_closed,
      CASE WHEN json_type(d.work_json,'$.evidence')='array' THEN json_array_length(d.work_json,'$.evidence') ELSE 0 END AS evidence_count,
      sub.id AS submission_id,sub.status,sub.grade,sub.feedback FROM students s JOIN assignments a ON a.class_id=s.class_id
      LEFT JOIN drafts d ON d.student_id=s.id AND d.assignment_id=a.id
      LEFT JOIN submissions sub ON sub.id=(SELECT z.id FROM submissions z WHERE z.student_id=s.id AND z.assignment_id=a.id ORDER BY z.draft_version DESC LIMIT 1)
      WHERE s.class_id=?`, classroom.id);
    return response({ classroom: classTeacher({ ...classroom, student_count: students.length, assignment_count: assignments.length }), students: students.map(s => ({ id: s.id, alias: s.alias, joinedAt: iso(s.joined_at) })), assignments: assignments.map(assignmentJSON), progress: rows.map(row => ({
      studentId: row.student_id, assignmentId: row.assignment_id, version: row.version || 0, updatedAt: iso(row.updated_at), submissionId: row.submission_id || null, status: row.status || (row.version ? 'draft' : 'not_started'), grade: row.grade ?? null, feedback: row.feedback || '',
      selfReported: { verified: row.reported_verified === 1, closed: row.reported_closed === 1, evidenceCount: Number(row.evidence_count) || 0 }
    })) });
  }
  if (suffix === '/assignments' && method === 'GET') return response({ assignments: (await all(db, 'SELECT * FROM assignments WHERE class_id=? ORDER BY created_at,id', classroom.id)).map(assignmentJSON) });
  if (suffix === '/assignments' && method === 'POST') {
    only(body, ['labId', 'title']);
    if (typeof body.labId !== 'string' || !Object.hasOwn(LABS, body.labId)) fail(400, 'invalid_lab', 'Choose one of the supported lab investigations.');
    const title = body.title == null || body.title === '' ? LABS[body.labId] : text(body.title, 120, 'an assignment title');
    if (await first(db, 'SELECT id FROM assignments WHERE class_id=? AND lab_id=?', classroom.id, body.labId)) fail(409, 'assignment_exists', 'This lab is already assigned to this class.');
    const id = crypto.randomUUID();
    const result = await run(db, 'INSERT OR IGNORE INTO assignments(id,class_id,lab_id,title,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM classrooms WHERE id=? AND teacher_email=? AND expires_at>?)', id, classroom.id, body.labId, title, now, classroom.id, teacher.email, now);
    if (!changes(result)) fail(409, 'assignment_conflict', 'The assignment already exists or the class is no longer available.');
    return response({ assignment: assignmentJSON(await first(db, 'SELECT * FROM assignments WHERE id=?', id)) }, 201);
  }
  const studentMatch = suffix.match(/^\/students\/([a-f0-9-]+)$/);
  if (studentMatch && method === 'GET') {
    if (!validId(studentMatch[1])) fail(404, 'student_not_found', 'Student not found.');
    const student = await first(db, 'SELECT id,alias,joined_at FROM students WHERE id=? AND class_id=?', studentMatch[1], classroom.id);
    if (!student) fail(404, 'student_not_found', 'Student not found.');
    const assignments = await all(db, 'SELECT * FROM assignments WHERE class_id=? ORDER BY created_at,id', classroom.id);
    const drafts = await all(db, 'SELECT * FROM drafts WHERE student_id=?', student.id);
    const submissions = await all(db, 'SELECT * FROM submissions WHERE student_id=? ORDER BY draft_version DESC', student.id);
    return response({ student: { id: student.id, alias: student.alias, joinedAt: iso(student.joined_at) }, work: assignments.map(a => ({ assignmentId: a.id, labId: a.lab_id, draft: draftJSON(drafts.find(d => d.assignment_id === a.id)), submissions: submissions.filter(s => s.assignment_id === a.id).map(submissionJSON) })) });
  }
  const submissionMatch = suffix.match(/^\/submissions\/([a-f0-9-]+)$/);
  if (submissionMatch && method === 'PATCH') {
    only(body, ['expectedRevision', 'grade', 'feedback', 'status']);
    if (!validId(submissionMatch[1])) fail(404, 'submission_not_found', 'Submission not found.');
    if (!integer(body.expectedRevision, 1) || !['graded', 'returned'].includes(body.status) ||
        !(body.grade === null || (typeof body.grade === 'number' && Number.isFinite(body.grade) && body.grade >= 0 && body.grade <= 100)) ||
        (body.status === 'graded' && body.grade === null)) fail(400, 'invalid_grade', 'Provide a valid revision, status, and a grade from zero to one hundred.');
    const feedback = text(body.feedback, 4000, 'feedback', true);
    const submission = await first(db, 'SELECT sub.* FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id WHERE sub.id=? AND a.class_id=?', submissionMatch[1], classroom.id);
    if (!submission) fail(404, 'submission_not_found', 'Submission not found.');
    const result = await run(db, `UPDATE submissions SET grade=?,feedback=?,status=?,revision=revision+1,graded_at=? WHERE id=? AND revision=?
      AND EXISTS(SELECT 1 FROM classrooms WHERE id=? AND teacher_email=? AND expires_at>?)`, body.grade, feedback, body.status, now, submission.id, body.expectedRevision, classroom.id, teacher.email, now);
    if (!changes(result)) fail(409, 'grade_conflict', 'This submission was graded in another view. Reload it before saving.');
    return response({ submission: submissionJSON(await first(db, 'SELECT * FROM submissions WHERE id=?', submission.id)) });
  }
  fail(404, 'not_found', 'API route not found.');
}

/** Prepared backend for explicit integration tests and a future reviewed release. */
export async function handleClassroomRequest(context, dependencies = {}) {
  const { request, env } = context;
  const cfg = config(env || {});
  if (!cfg) return response({ enabled: false, error: 'classroom_unconfigured', message: 'Online classrooms are not configured. Public labs and local report exports remain available.' }, 503);
  const runtime = { now: () => Date.now(), fetch: (...args) => fetch(...args), ...dependencies };
  try {
    const url = new URL(request.url);
    if (url.protocol !== 'https:') fail(400, 'https_required', 'Online classrooms require HTTPS.');
    if (url.search) fail(400, 'invalid_request', 'API requests do not accept query parameters.');
    const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
    if (!url.pathname.startsWith('/api/')) fail(404, 'not_found', 'API route not found.');
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) fail(405, 'method_not_allowed', 'This request method is not supported.');
    let body = null;
    if (request.method !== 'GET') {
      if (request.headers.get('Origin') !== url.origin || (request.headers.get('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site') !== 'same-origin')) fail(403, 'origin_rejected', 'This action must start on this website.');
      body = await readBody(request);
    }
    const db = typeof env.CLASSROOM_DB.withSession === 'function' ? env.CLASSROOM_DB.withSession('first-primary') : env.CLASSROOM_DB;
    const now = runtime.now();
    if (path === '/session' && request.method === 'GET') {
      const student = await getStudent(request, db, now, false);
      if (student) return response(await studentSessionJSON(db, student));
      const teacher = await teacherIdentity(request, cfg, runtime, false);
      if (teacher) await maintainExpired(db, env.CLASSROOM_DB, now);
      return response(teacher ? { enabled: true, role: 'teacher', teacher } : { enabled: true, role: 'guest' });
    }
    if (path.startsWith('/teacher/')) {
      const teacher = await teacherIdentity(request, cfg, runtime);
      await maintainExpired(db, env.CLASSROOM_DB, now);
      return await handleTeacher(request, db, path, body, teacher, now);
    }
    if (path.startsWith('/student/')) return await handleStudent(request, db, path, body, now);
    fail(404, 'not_found', 'API route not found.');
  } catch (error) {
    if (error instanceof ApiError) return response({ error: error.code, message: error.message }, error.status);
    return response({ enabled: false, error: 'classroom_unavailable', message: 'The classroom service is temporarily unavailable. Keep local exports and try again later.' }, 503);
  }
}

export const onRequest = context => {
  if (!CLASSROOM_PRIVACY_REVIEW_APPROVED) return response({
    enabled: false,
    error: 'classroom_privacy_review_required',
    message: 'Connected classrooms are unavailable while privacy, school agreement, and operational requirements await review. Public labs and local report exports remain available.'
  }, 503);
  return handleClassroomRequest(context);
};
