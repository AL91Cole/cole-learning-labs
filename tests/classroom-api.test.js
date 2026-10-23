import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleClassroomRequest, onRequest } from '../functions/api/[[path]].js';
import { SCENARIOS } from '../src/scenarios.js';
import { normalizeLabRecord } from '../src/records.js';
import { applyHardwareAction } from '../src/hardware.js';
import { applyWorkspaceAction } from '../src/workspaces.js';

let DatabaseSync;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node 20 has no built-in SQLite. */ }
const sqlTest = (name, fn) => test(name, { skip: !DatabaseSync && 'Requires Node with node:sqlite (Node 22.13+ or 24 recommended).' }, fn);
const migration = await readFile(new URL('../migrations/0001_classrooms.sql', import.meta.url), 'utf8');
const NOW = Date.parse('2026-10-16T12:00:00Z');
const ORIGIN = 'https://www.colelearninglabs.com';
const TEAM = 'classroom-tests.cloudflareaccess.com';
const AUD = 'test_classroom_audience';
const COOKIE_NAME = '__Host-cll_student';
const keyPair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', keyPair.publicKey), kid: 'classroom-test-signing-key', alg: 'RS256', use: 'sig' };
const b64 = bytes => Buffer.from(bytes).toString('base64url');
async function jwt(email = 'teacher@example.edu', claims = {}, header = {}) {
  const start = `${b64(JSON.stringify({ alg: 'RS256', kid: jwk.kid, typ: 'JWT', ...header }))}.${b64(JSON.stringify({ iss: `https://${TEAM}`, aud: [AUD], email, iat: NOW / 1000 - 10, exp: NOW / 1000 + 3600, ...claims }))}`;
  return `${start}.${b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, new TextEncoder().encode(start)))}`;
}

/** D1-shaped adapter executing the real migration and SQL, including transactional batches. */
function database() {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec(migration);
  const db = {
    sqlite,
    reads: [],
    writes: [],
    prepare(sql) {
      let values = [];
      const bound = {
        bind(...args) { values = args; return bound; },
        async first() { const result = sqlite.prepare(sql).get(...values) || null; db.reads.push({ sql, bytes: Buffer.byteLength(JSON.stringify(result)) }); return result; },
        async all() { const results = sqlite.prepare(sql).all(...values); db.reads.push({ sql, bytes: Buffer.byteLength(JSON.stringify(results)) }); return { results }; },
        async run() { db.writes.push(sql); const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; }
      };
      return bound;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  return db;
}
async function fixture(t) {
  const db = database(); t.after(() => db.sqlite.close());
  const env = { CLASSROOM_ENABLED: 'true', CLASSROOM_DB: db, CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD, TEACHER_EMAILS: 'teacher@example.edu,second@example.edu' };
  let time = NOW;
  const fetches = [];
  const runtime = { now: () => time, fetch: async (url, options) => {
    fetches.push({ url, options });
    assert.equal(url, `https://${TEAM}/cdn-cgi/access/certs`);
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'Content-Type': 'application/json' } });
  } };
  const teacher = await jwt(); const otherTeacher = await jwt('second@example.edu');
  const knownSessions = new Map();
  async function request(path, { method = 'GET', body, token, cookie, origin = ORIGIN, headers = {}, selectedEnv = env, dependencies = runtime } = {}) {
    const h = new Headers(headers);
    // Model the client's explicit session binding; tests can override or omit it.
    const expectedStudent = knownSessions.get(cookie);
    if (expectedStudent && ((path.startsWith('/student/work/') && method === 'GET') || path === '/student/logout') && !h.has('X-Classroom-Student')) h.set('X-Classroom-Student', expectedStudent);
    if (expectedStudent && ((path.startsWith('/student/work/') && method === 'PUT') || path === '/student/submit') && body && typeof body === 'object' && !Object.hasOwn(body, 'expectedStudentId')) body = { expectedStudentId: expectedStudent, ...body };
    if (token) h.set('Cf-Access-Jwt-Assertion', token);
    if (cookie) h.set('Cookie', cookie);
    if (method !== 'GET') { if (origin !== null) h.set('Origin', origin); h.set('Content-Type', 'application/json'); }
    const response = await handleClassroomRequest({ request: new Request(`${ORIGIN}/api${path}`, { method, headers: h, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) }), env: selectedEnv }, dependencies);
    const data = await response.json(); const responseCookie = response.headers.get('Set-Cookie')?.split(';')[0] || null;
    if (responseCookie && data.role === 'student') knownSessions.set(responseCookie, data.student.id);
    return { response, status: response.status, data, cookie: responseCookie };
  }
  async function makeClass(name = 'Technology period 2', token = teacher) {
    const result = await request('/teacher/classes', { method: 'POST', body: { name }, token }); assert.equal(result.status, 201, JSON.stringify(result.data)); return result.data.classroom;
  }
  async function assign(classroom, labId = 'INC-101', token = teacher) {
    const result = await request(`/teacher/classes/${classroom.id}/assignments`, { method: 'POST', body: { labId }, token }); assert.equal(result.status, 201, JSON.stringify(result.data)); return result.data.assignment;
  }
  async function join(classroom) {
    const result = await request('/student/join', { method: 'POST', body: { code: classroom.code } }); assert.equal(result.status, 201, JSON.stringify(result.data)); return result;
  }
  return { db, env, runtime, fetches, teacher, otherTeacher, request, makeClass, assign, join, setTime: value => { time = value; } };
}

test('actual production entry stays privacy-locked despite complete configuration or forged approval flags', async () => {
  let databaseCalls = 0;
  const env = {
    CLASSROOM_ENABLED: 'true', CLASSROOM_PRIVACY_REVIEW_APPROVED: 'true', CLASSROOM_PRODUCTION_APPROVED: true,
    CLASSROOM_DB: { prepare() { databaseCalls++; throw new Error('Production must not touch D1.'); }, withSession() { databaseCalls++; throw new Error('Production must not create D1 sessions.'); } },
    CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD, TEACHER_EMAILS: 'teacher@example.edu'
  };
  const token = await jwt();
  for (const [path, method] of [['/session','GET'], ['/teacher/classes','POST'], ['/student/join','POST'], ['/student/work/11111111-1111-1111-1111-111111111111','PUT'], ['/student/submit','POST'], ['/student/logout','POST']]) {
    const response = await onRequest({ request: new Request(`${ORIGIN}/api${path}`, { method, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'Cf-Access-Jwt-Assertion': token }, ...(method !== 'GET' ? { body: '{}' } : {}) }), env, releaseApproved: true }, { releaseApproved: true, fetch: () => { throw new Error('Production must not fetch JWKS.'); } });
    assert.equal(response.status, 503); assert.equal(response.headers.get('Set-Cookie'), null);
    const body = await response.json(); assert.equal(body.enabled, false); assert.equal(body.error, 'classroom_privacy_review_required');
  }
  assert.equal(databaseCalls, 0);
});

test('production privacy lock returns before inspecting context, environment, authentication, or runtime configuration', async () => {
  let touched = 0;
  const trap = new Proxy({}, { get() { touched++; throw new Error('No production context/configuration may be read while locked.'); } });
  const response = await onRequest(trap, trap);
  assert.equal(response.status, 503); assert.equal((await response.json()).error, 'classroom_privacy_review_required');
  assert.equal(touched, 0);
});

test('prepared backend missing or malformed configuration fails closed without touching a database', async () => {
  let touched = false;
  const db = { prepare() { touched = true; throw new Error('must not run'); } };
  for (const env of [{}, { CLASSROOM_DB: db }, { CLASSROOM_ENABLED: 'false', CLASSROOM_DB: db, CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD, TEACHER_EMAILS: 'teacher@example.edu' }, { CLASSROOM_ENABLED: 'true', CLASSROOM_DB: db, CF_ACCESS_TEAM_DOMAIN: 'https://evil.example', CF_ACCESS_AUD: AUD, TEACHER_EMAILS: 'teacher@example.edu' }, { CLASSROOM_ENABLED: 'true', CLASSROOM_DB: db, CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD, TEACHER_EMAILS: '' }, { CLASSROOM_ENABLED: 'true', CLASSROOM_DB: db, CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD, TEACHER_EMAILS: 'teacher@example.edu,garbage' }]) {
    const result = await handleClassroomRequest({ request: new Request(`${ORIGIN}/api/session`), env });
    assert.equal(result.status, 503); assert.equal((await result.json()).enabled, false);
  }
  assert.equal(touched, false);
});

sqlTest('teacher authentication requires verified signature, issuer, audience, time, and explicit email allowlist', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/teacher/classes')).status, 401);
  assert.equal((await f.request('/teacher/classes', { headers: { 'Cf-Access-Authenticated-User-Email': 'teacher@example.edu' } })).status, 401);
  const good = await f.request('/teacher/classes', { token: f.teacher }); assert.equal(good.status, 200);
  const mutated = f.teacher.slice(0, -8) + 'AAAAAAAA';
  for (const token of [mutated, await jwt('teacher@example.edu', { aud: ['wrong_audience'] }), await jwt('teacher@example.edu', { iss: 'https://evil.cloudflareaccess.com' }), await jwt('teacher@example.edu', { exp: NOW / 1000 }), await jwt('teacher@example.edu', { nbf: NOW / 1000 + 3600 }), await jwt('teacher@example.edu', {}, { alg: 'none' }), await jwt('teacher@example.edu', {}, { jku: 'https://evil.example/key' })]) {
    assert.equal((await f.request('/teacher/classes', { token })).status, 401);
  }
  assert.equal((await f.request('/teacher/classes', { token: await jwt('outsider@example.edu') })).status, 403);
  const session = await f.request('/session', { cookie: `CF_Authorization=${f.teacher}` });
  assert.equal(session.data.role, 'teacher'); assert.equal(session.data.teacher.email, 'teacher@example.edu');
  assert.ok(f.fetches.every(x => x.url === `https://${TEAM}/cdn-cgi/access/certs`));
});

sqlTest('same-origin mutations and JSON are required, with private non-CORS responses', async t => {
  const f = await fixture(t);
  for (const origin of [null, 'https://evil.example', 'null']) assert.equal((await f.request('/teacher/classes', { method: 'POST', token: f.teacher, origin, body: { name: 'X' } })).status, 403);
  assert.equal((await f.request('/teacher/classes', { method: 'POST', token: f.teacher, body: { name: 'X' }, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  const response = await handleClassroomRequest({ request: new Request(`${ORIGIN}/api/teacher/classes`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'text/plain', 'Cf-Access-Jwt-Assertion': f.teacher }, body: '{}' }), env: f.env }, f.runtime);
  assert.equal(response.status, 415);
  const get = await f.request('/session');
  assert.equal(get.data.role, 'guest'); assert.equal(get.response.headers.get('Access-Control-Allow-Origin'), null);
  assert.match(get.response.headers.get('Cache-Control'), /no-store/);
  assert.equal(get.response.headers.get('Strict-Transport-Security'), 'max-age=15552000');
  assert.equal(get.response.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), display-capture=(), usb=(), serial=(), hid=(), payment=()');
  assert.equal((await f.request('/session', { method: 'OPTIONS' })).status, 405);
});

sqlTest('expiry maintenance requires a verified teacher and coalesces to one batch per minute', async t => {
  const f = await fixture(t);
  const cleanups = () => f.db.writes.filter(sql => /^DELETE FROM (?:classrooms|student_sessions|join_limits) WHERE expires_at/.test(sql)).length;
  assert.equal((await f.request('/session')).status, 200);
  assert.equal((await f.request('/unknown')).status, 404);
  assert.equal((await f.request('/teacher/classes', { token: f.teacher.slice(0, -8) + 'AAAAAAAA' })).status, 401);
  assert.equal((await f.request('/session', { token: await jwt('outsider@example.edu') })).status, 403);
  assert.equal(cleanups(), 0);
  const results = await Promise.all([f.request('/session', { token: f.teacher }), f.request('/teacher/classes', { token: f.teacher })]);
  assert.ok(results.every(result => result.status === 200));
  assert.equal(cleanups(), 3, 'Concurrent authorized requests share one three-statement maintenance batch.');
  await f.request('/teacher/classes', { token: f.teacher });
  f.setTime(NOW + 59_999); await f.request('/session', { token: f.teacher });
  assert.equal(cleanups(), 3);
  f.setTime(NOW + 60_000); await f.request('/teacher/classes', { token: f.teacher });
  assert.equal(cleanups(), 6);
  f.setTime(NOW + 120_000); await f.request('/session'); await f.request('/unknown');
  assert.equal(cleanups(), 6, 'Anonymous requests do not trigger overdue maintenance.');
});

sqlTest('teacher class ownership, supported assignment IDs, and strict input fields are enforced', async t => {
  const f = await fixture(t); const classroom = await f.makeClass();
  assert.equal((await f.request(`/teacher/classes/${classroom.id}`, { token: f.otherTeacher })).status, 404);
  assert.equal((await f.request(`/teacher/classes/${classroom.id}`, { method: 'DELETE', token: f.otherTeacher, body: {} })).status, 404);
  assert.equal((await f.request(`/teacher/classes/${classroom.id}/assignments`, { method: 'POST', token: f.otherTeacher, body: { labId: 'INC-101' } })).status, 404);
  assert.equal((await f.request(`/teacher/classes/${classroom.id}/assignments`, { method: 'POST', token: f.teacher, body: { labId: '../../secret' } })).status, 400);
  assert.equal((await f.request('/teacher/classes', { method: 'POST', token: f.teacher, body: { name: 'x', teacher_email: 'second@example.edu' } })).status, 400);
  const assignment = await f.assign(classroom);
  assert.equal(assignment.labId, 'INC-101');
  assert.equal((await f.request(`/teacher/classes/${classroom.id}/assignments`, { method: 'POST', token: f.teacher, body: { labId: 'INC-101' } })).status, 409);
  const list = await f.request('/teacher/classes', { token: f.otherTeacher }); assert.deepEqual(list.data.classes, []);
});

sqlTest('student join generates a neutral alias, issues a high-entropy HttpOnly cookie, and stores only its hash', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom);
  const a = await f.join(classroom);
  assert.match(a.cookie, new RegExp(`^${COOKIE_NAME}=[A-Za-z0-9_-]{43}$`));
  assert.match(a.response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(JSON.stringify(a.data).includes(a.cookie.split('=')[1]), false);
  const stored = f.db.sqlite.prepare('SELECT token_hash FROM student_sessions').get().token_hash;
  assert.match(stored, /^[a-f0-9]{64}$/); assert.notEqual(stored, a.cookie.split('=')[1]);
  assert.match(a.data.student.alias, /^Learner-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(a.data.student.classId, classroom.id); assert.equal(a.data.classroom.name, classroom.name);
  assert.equal(a.data.assignments[0].id, assignment.id); assert.equal('code' in a.data.classroom, false);
  const b = await f.join(classroom); assert.notEqual(a.data.student.id, b.data.student.id);
  assert.notEqual(a.data.student.alias, b.data.student.alias);
  const session = await f.request('/session', { cookie: a.cookie }); assert.equal(session.data.student.id, a.data.student.id);
  const logout = await f.request('/student/logout', { method: 'POST', cookie: a.cookie, body: {} }); assert.match(logout.response.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await f.request('/student/work/' + assignment.id, { cookie: a.cookie })).status, 401);
  const rejoin = await f.join(classroom); assert.notEqual(rejoin.data.student.id, a.data.student.id);
});

sqlTest('student enrollment refuses client aliases and identity fields before writing enrollment data', async t => {
  const f = await fixture(t); const classroom = await f.makeClass();
  const writesBefore = f.db.writes.length;
  for (const identity of [{ alias: 'Learner-AB12-CD34' }, { alias: 'Real Student Name' }, { email: 'private@example.edu' }, { name: 'Real Student Name' }, { studentId: 'school-123456' }, { googleId: 'classroom-identity' }, { accessToken: 'private-token' }]) {
    const rejected = await f.request('/student/join', { method: 'POST', body: { code: classroom.code, ...identity } });
    assert.equal(rejected.status, 400); assert.equal(rejected.cookie, null);
    assert.equal(JSON.stringify(rejected.data).includes(Object.values(identity)[0]), false);
  }
  assert.equal(f.db.writes.length, writesBefore);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM students').get().n, 0);
  const admitted = await f.join(classroom);
  const cannotRecover = await f.request('/student/join', { method: 'POST', body: { code: classroom.code, alias: admitted.data.student.alias } });
  assert.equal(cannotRecover.status, 400); assert.equal(cannotRecover.cookie, null);
});

sqlTest('students can access only their own work and assignments in their class', async t => {
  const f = await fixture(t); const aClass = await f.makeClass(); const aAssignment = await f.assign(aClass);
  const bClass = await f.makeClass('Other class', f.otherTeacher); const bAssignment = await f.assign(bClass, 'INC-102', f.otherTeacher);
  const alice = await f.join(aClass); const bob = await f.join(aClass); const outsider = await f.join(bClass);
  const saved = await f.request('/student/work/' + aAssignment.id, { method: 'PUT', cookie: alice.cookie, body: { expectedVersion: 0, work: { notes: 'Alice only' } } }); assert.equal(saved.status, 200);
  assert.equal((await f.request('/student/work/' + bAssignment.id, { cookie: alice.cookie })).status, 404);
  assert.equal((await f.request('/student/work/' + aAssignment.id, { cookie: outsider.cookie })).status, 404);
  assert.equal((await f.request('/student/work/' + aAssignment.id, { cookie: bob.cookie })).data.draft.work, null);
  assert.equal((await f.request('/student/work/' + aAssignment.id, { method: 'PUT', cookie: bob.cookie, body: { expectedVersion: 0, studentId: alice.data.student.id, work: {} } })).status, 400);
  assert.equal((await f.request(`/teacher/classes/${aClass.id}/students/${alice.data.student.id}`, { cookie: alice.cookie })).status, 401);
  assert.equal((await f.request(`/teacher/classes/${bClass.id}/students/${alice.data.student.id}`, { token: f.otherTeacher })).status, 404);
});

sqlTest('draft versions prevent stale overwrite and submitted work stays immutable through save and grading', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  const path = '/student/work/' + assignment.id; const work = { notes: 'Evidence', state: { pcOn: false, bootCount: 0 }, verified: true, closed: true };
  const first = await f.request(path, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work } }); assert.equal(first.data.draft.version, 1);
  const stale = await f.request(path, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work: { notes: 'stale' } } }); assert.equal(stale.status, 409);
  assert.equal((await f.request('/student/submit', { method: 'POST', cookie: student.cookie, body: { assignmentId: assignment.id, expectedVersion: 2 } })).status, 409);
  const submitted = await f.request('/student/submit', { method: 'POST', cookie: student.cookie, body: { assignmentId: assignment.id, expectedVersion: 1 } }); assert.equal(submitted.status, 201);
  assert.equal(submitted.data.submission.grade, null); assert.equal(submitted.data.submission.status, 'submitted');
  const repeated = await f.request('/student/submit', { method: 'POST', cookie: student.cookie, body: { assignmentId: assignment.id, expectedVersion: 1 } }); assert.equal(repeated.data.submission.id, submitted.data.submission.id);
  await f.request(path, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 1, work: { notes: 'Changed later' } } });
  const sid = submitted.data.submission.id; const gradePath = `/teacher/classes/${classroom.id}/submissions/${sid}`;
  assert.equal((await f.request(gradePath, { method: 'PATCH', cookie: student.cookie, body: { expectedRevision: 1, grade: 100, feedback: '', status: 'graded' } })).status, 401);
  const grade = await f.request(gradePath, { method: 'PATCH', token: f.teacher, body: { expectedRevision: 1, grade: 82.5, feedback: 'Explain the safety step.', status: 'returned' } }); assert.equal(grade.status, 200); assert.equal(grade.data.submission.revision, 2);
  assert.deepEqual(grade.data.submission.work, work);
  assert.equal((await f.request(gradePath, { method: 'PATCH', token: f.teacher, body: { expectedRevision: 1, grade: 99, feedback: '', status: 'graded' } })).status, 409);
  const own = await f.request(path, { cookie: student.cookie }); assert.equal(own.data.draft.work.notes, 'Changed later'); assert.equal(own.data.submissions[0].grade, 82.5);
  assert.throws(() => f.db.sqlite.prepare("UPDATE submissions SET work_json='{}' WHERE id=?").run(sid), /submission_snapshot_immutable/);
  const detail = await f.request(`/teacher/classes/${classroom.id}/students/${student.data.student.id}`, { token: f.teacher }); assert.equal(detail.data.work[0].submissions[0].grade, 82.5);
  const summary = await f.request(`/teacher/classes/${classroom.id}`, { token: f.teacher }); assert.equal(summary.data.progress[0].grade, 82.5); assert.equal(summary.data.progress[0].version, 2);
});

sqlTest('every supported normalized simulation record fits its assigned lab schema without losing false or zero values', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const student = await f.join(classroom);
  for (const scenario of SCENARIOS) {
    const assignment = await f.assign(classroom, scenario.id);
    const path = '/student/work/' + assignment.id;
    const work = normalizeLabRecord(scenario, {
      state: {}, evidence: scenario.clues.map(clue => clue.id), questions: scenario.questions.map((_, index) => index),
      events: [{ time: new Date(NOW).toISOString(), message: 'Inspected the fictional investigation.', kind: 'info' }],
      notes: 'Fictional evidence only.', plan: 'Compare the supplied clues.', reflection: 'Explain the test result.', verified: false, closed: false
    });
    const saved = await f.request(path, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work } });
    assert.equal(saved.status, 200, scenario.id + ': ' + JSON.stringify(saved.data));
    assert.deepEqual(saved.data.draft.work, work);
    assert.equal(saved.data.draft.work.verified, false); assert.equal(saved.data.draft.work.closed, false);
    if (scenario.track === 'hardware') {
      work.state = applyHardwareAction(scenario.id, work.state, 'inspect-power').state;
      assert.equal(work.state.bootCount, 0);
    } else {
      assert.equal(work.state.workspaceEdits, 0); assert.equal(work.state.checkRuns, 0);
      if (scenario.id === 'SEC-403') {
        work.state = applyWorkspaceAction(scenario.id, work.state, 'acknowledge-scope', true).state;
        work.state = applyWorkspaceAction(scenario.id, work.state, 'fetch-record', '102').state;
        work.state = applyWorkspaceAction(scenario.id, work.state, 'set-authorization', 'owner').state;
        work.state = applyWorkspaceAction(scenario.id, work.state, 'fetch-record', '102').state;
        assert.equal(work.state.response.status, 403);
      }
      work.state = applyWorkspaceAction(scenario.id, work.state, 'run-check').state;
    }
    const updated = await f.request(path, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 1, work } });
    assert.equal(updated.status, 200, scenario.id + ': ' + JSON.stringify(updated.data));
    assert.deepEqual(updated.data.draft.work, work);
  }
});

sqlTest('unsupported identity and provider fields are refused throughout work before any draft write', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const student = await f.join(classroom);
  const hardware = await f.assign(classroom); const security = await f.assign(classroom, 'SEC-403');
  const sentinel = 'PRIVATE_VALUE_NEVER_ECHOED';
  const forbidden = [
    { email: sentinel }, { name: sentinel }, { studentId: sentinel }, { access_token: sentinel }, { grade: 100 }, { arbitrary: {} },
    { state: { email: sentinel } }, { state: { prompt: sentinel } },
    { state: { results: [{ label: 'Fictional test', ok: true, refreshToken: sentinel }] } },
    { events: [{ time: '', message: 'Fictional event', kind: 'info', googleUserId: sentinel }] },
    { state: { response: { status: 200, id: '101', owner: 'learner-101', body: 'Fictional record', identity: { email: sentinel } } } },
    JSON.parse('{"state":{"__proto__":{"email":"PRIVATE_VALUE_NEVER_ECHOED"}}}')
  ];
  const writesBefore = f.db.writes.length;
  for (const work of forbidden) {
    const assignment = Object.hasOwn(work.state || {}, 'response') || Object.hasOwn(work.state || {}, 'results') ? security : hardware;
    const rejected = await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work } });
    assert.equal(rejected.status, 400); assert.equal(rejected.data.error, 'privacy_violation');
    assert.equal(JSON.stringify(rejected.data).includes(sentinel), false);
  }
  assert.equal(f.db.writes.length, writesBefore);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n, 0);
  assert.equal((await f.request('/student/work/' + hardware.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work: { notes: 'Fictional lab observation.', state: { pcOn: false, bootCount: 0 }, verified: false, closed: false } } })).status, 200);
});

sqlTest('work fields enforce actual record types, list limits, and the assigned scenario', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  const invalid = [
    { notes: 'x'.repeat(4001) }, { plan: 'x'.repeat(2001) }, { reflection: 'x'.repeat(2001) },
    { verified: 1 }, { closed: 'false' }, { questions: ['0'] }, { questions: [99] }, { evidence: ['not-a-clue'] },
    { events: [{ message: 'x'.repeat(601) }] }, { events: [{ kind: 'error' }] },
    { state: { pcOn: 'false' } }, { state: { monitorOn: 'false' } }, { state: { caseId: 'INC-102' } }, { state: { bootCount: -1 } },
    { state: { bootCount: 1.5 } }, { state: { actions: ['not-a-simulation-action'] } },
    { events: Array.from({ length: 101 }, () => ({ message: 'Fictional event' })) }
  ];
  for (const work of invalid) {
    const rejected = await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work } });
    assert.equal(rejected.status, 400); assert.equal(rejected.data.error, 'invalid_work');
  }
  const oversized = { notes: 'n'.repeat(4000), plan: 'p'.repeat(2000), reflection: 'r'.repeat(2000), events: Array.from({ length: 100 }, () => ({ message: 'x'.repeat(600) })) };
  assert.ok(Buffer.byteLength(JSON.stringify(oversized)) > 65_536);
  const rejected = await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work: oversized } });
  assert.equal(rejected.status, 413);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n, 0);
});

sqlTest('monitor power controls round-trip through the typed hardware snapshot without accepting arbitrary actions', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  const path = '/student/work/' + assignment.id;
  const work = { state: { pcOn: false, monitorOn: false, actions: ['monitor-off', 'monitor-on', 'monitor-off'] } };
  const saved = await f.request(path, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work } });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.data.draft.work, work);
  const rejected = await f.request(path, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 1, work: { state: { monitorOn: true, actions: ['monitor-run-script'] } } } });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.data.error, 'invalid_work');
  assert.deepEqual((await f.request(path, { cookie: student.cookie })).data.draft.work, work);
});

sqlTest('cookie changes across tabs cannot read, save, submit, or log out another expected student session', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom);
  const alice = await f.join(classroom); const bob = await f.join(classroom);
  const path = '/student/work/' + assignment.id;
  await f.request(path, { method: 'PUT', cookie: alice.cookie, body: { expectedVersion: 0, work: { notes: 'Alice private draft' } } });
  await f.request(path, { method: 'PUT', cookie: bob.cookie, body: { expectedVersion: 0, work: { notes: 'Bob private draft' } } });
  const mismatched = await f.request(path, { cookie: bob.cookie, headers: { 'X-Classroom-Student': alice.data.student.id } });
  assert.equal(mismatched.status, 409); assert.equal(mismatched.data.error, 'student_session_changed');
  assert.equal(JSON.stringify(mismatched.data).includes('Bob private'), false);
  assert.equal((await f.request(path, { cookie: bob.cookie, headers: { 'X-Classroom-Student': '' } })).status, 409);
  for (const expectedStudentId of [alice.data.student.id, undefined]) {
    assert.equal((await f.request(path, { method: 'PUT', cookie: bob.cookie, body: { expectedStudentId, expectedVersion: 1, work: { notes: 'Wrong session upload' } } })).status, 409);
    assert.equal((await f.request('/student/submit', { method: 'POST', cookie: bob.cookie, body: { expectedStudentId, assignmentId: assignment.id, expectedVersion: 1 } })).status, 409);
  }
  assert.equal((await f.request('/student/logout', { method: 'POST', cookie: bob.cookie, headers: { 'X-Classroom-Student': alice.data.student.id }, body: {} })).status, 409);
  assert.equal((await f.request('/student/logout', { method: 'POST', cookie: bob.cookie, headers: { 'X-Classroom-Student': '' }, body: {} })).status, 409);
  const bobUnchanged = await f.request(path, { cookie: bob.cookie });
  assert.equal(bobUnchanged.data.draft.version, 1); assert.equal(bobUnchanged.data.draft.work.notes, 'Bob private draft'); assert.deepEqual(bobUnchanged.data.submissions, []);
  assert.equal((await f.request('/session', { cookie: bob.cookie })).data.student.id, bob.data.student.id);
  assert.equal((await f.request('/student/logout', { method: 'POST', body: {} })).status, 200);
});

sqlTest('class summaries project small typed indicators without transferring full near-limit drafts', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  const sentinel = 'PRIVATE_DRAFT_CONTENT_';
  const work = { plan: sentinel + 'p'.repeat(1900), notes: 'n'.repeat(4000), reflection: 'r'.repeat(2000), events: Array.from({ length: 85 }, () => ({ time: new Date(NOW).toISOString(), message: 'x'.repeat(600), kind: 'info' })), evidence: ['screen', 'video'], verified: true, closed: false };
  assert.ok(Buffer.byteLength(JSON.stringify(work)) > 63_000);
  assert.equal((await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work } })).status, 200);
  f.db.reads.length = 0;
  const summary = await f.request(`/teacher/classes/${classroom.id}`, { token: f.teacher });
  assert.equal(summary.status, 200);
  assert.deepEqual(summary.data.progress[0].selfReported, { verified: true, closed: false, evidenceCount: 2 });
  assert.equal(JSON.stringify(summary.data).includes(sentinel), false);
  assert.ok(f.db.reads.every(read => read.bytes < 16_000), 'Summary queries must not transfer a full draft from SQL into the worker.');
  assert.equal((await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 1, work: { evidence: 'not-an-array', verified: 1, closed: true } } })).status, 400);
  assert.equal((await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 1, work: { evidence: [], verified: false, closed: true } } })).status, 200);
  const typed = await f.request(`/teacher/classes/${classroom.id}`, { token: f.teacher });
  assert.deepEqual(typed.data.progress[0].selfReported, { verified: false, closed: true, evidenceCount: 0 });
  const detail = await f.request(`/teacher/classes/${classroom.id}/students/${student.data.student.id}`, { token: f.teacher });
  assert.deepEqual(detail.data.work[0].draft.work, { evidence: [], verified: false, closed: true });
});

sqlTest('class locks block joins and student writes while preserving review access', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work: { notes: 'Keep' } } });
  const lock = await f.request(`/teacher/classes/${classroom.id}`, { method: 'PATCH', token: f.teacher, body: { locked: true } }); assert.equal(lock.data.classroom.locked, true);
  assert.equal((await f.request('/student/join', { method: 'POST', body: { code: classroom.code } })).status, 409);
  assert.equal((await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 1, work: {} } })).status, 409);
  assert.equal((await f.request('/student/submit', { method: 'POST', cookie: student.cookie, body: { assignmentId: assignment.id, expectedVersion: 1 } })).status, 409);
  assert.equal((await f.request('/student/work/' + assignment.id, { cookie: student.cookie })).data.draft.work.notes, 'Keep');
  assert.equal((await f.request('/session', { cookie: student.cookie })).data.classroom.locked, true);
});

sqlTest('request, work, metadata, class-count, and membership bounds are enforced', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  const save = work => f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work } });
  assert.equal((await save([])).status, 400);
  assert.equal((await save({ notes: 'x'.repeat(16001) })).status, 400);
  assert.equal((await save(JSON.parse('{"__proto__":{"polluted":true}}'))).status, 400);
  const big = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, 'é'.repeat(4000)])); assert.equal((await save(big)).status, 413);
  assert.equal((await f.request('/student/join', { method: 'POST', body: { code: classroom.code, alias: 'x'.repeat(41) } })).status, 400);
  for (let n = 1; n < 10; n++) await f.makeClass('Class ' + n);
  assert.equal((await f.request('/teacher/classes', { method: 'POST', token: f.teacher, body: { name: 'Eleven' } })).status, 409);
  const insert = f.db.sqlite.prepare('INSERT INTO students(id,class_id,alias,joined_at) VALUES(?,?,?,?)');
  for (let n = 1; n < 100; n++) insert.run(crypto.randomUUID(), classroom.id, 'Alias', NOW);
  assert.equal((await f.request('/student/join', { method: 'POST', body: { code: classroom.code } })).status, 409);
});

sqlTest('classes and sessions expire after ninety days; class deletion cascades through all student work', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: 0, work: { notes: 'private' } } });
  await f.request('/student/submit', { method: 'POST', cookie: student.cookie, body: { assignmentId: assignment.id, expectedVersion: 1 } });
  assert.equal(Date.parse(classroom.expiresAt) - NOW, 90 * 86400000);
  f.setTime(NOW + 90 * 86400000);
  const expired = await f.request('/session', { cookie: student.cookie }); assert.equal(expired.data.role, 'guest');
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM classrooms').get().n, 1, 'Logical expiry does not require an anonymous request to delete records.');
  assert.equal((await f.request('/student/work/' + assignment.id, { cookie: student.cookie })).status, 401);
  const nowSeconds = (NOW + 90 * 86400000) / 1000;
  const maintenanceTeacher = await jwt('teacher@example.edu', { iat: nowSeconds - 10, exp: nowSeconds + 3600 });
  assert.equal((await f.request('/teacher/classes', { token: maintenanceTeacher })).status, 200);
  for (const table of ['classrooms', 'students', 'student_sessions', 'assignments', 'drafts', 'submissions']) assert.equal(f.db.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
  f.setTime(NOW); const second = await f.makeClass('Delete me'); const secondAssignment = await f.assign(second); const secondStudent = await f.join(second);
  await f.request('/student/work/' + secondAssignment.id, { method: 'PUT', cookie: secondStudent.cookie, body: { expectedVersion: 0, work: {} } });
  assert.equal((await f.request(`/teacher/classes/${second.id}`, { method: 'DELETE', token: f.teacher, body: {} })).data.deleted, true);
  assert.equal((await f.request('/session', { cookie: secondStudent.cookie })).data.role, 'guest');
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM drafts').get().n, 0);
});

sqlTest('join throttling and draft snapshot limits are server enforced', async t => {
  const f = await fixture(t); const classroom = await f.makeClass(); const assignment = await f.assign(classroom); const student = await f.join(classroom);
  for (let version = 0; version < 6; version++) {
    assert.equal((await f.request('/student/work/' + assignment.id, { method: 'PUT', cookie: student.cookie, body: { expectedVersion: version, work: { state: { bootCount: version } } } })).status, 200);
    const result = await f.request('/student/submit', { method: 'POST', cookie: student.cookie, body: { assignmentId: assignment.id, expectedVersion: version + 1 } });
    assert.equal(result.status, version < 5 ? 201 : 409);
  }
  const bucket = f.db.sqlite.prepare('SELECT bucket FROM join_limits').get().bucket;
  f.db.sqlite.prepare('UPDATE join_limits SET attempts=600 WHERE bucket=?').run(bucket);
  assert.equal((await f.request('/student/join', { method: 'POST', body: { code: classroom.code } })).status, 429);
});
