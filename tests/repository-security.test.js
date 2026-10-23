import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = filename => readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');
const WORKSHEET_ROUTES = ['/student-workbook', '/student-workbook.html', '/practice-quizzes', '/practice-quizzes.html'];

function headerRules(source) {
  const rules = new Map();
  let current;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = new Map();
      assert.ok(!rules.has(line), `duplicate header scope: ${line}`);
      rules.set(line, current);
      continue;
    }
    assert.ok(current, 'header declared before its route scope');
    const delimiter = line.indexOf(':');
    assert.ok(delimiter > 0, 'malformed header rule');
    const name = line.slice(0, delimiter).trim().toLowerCase();
    assert.ok(!current.has(name), `duplicate header: ${name}`);
    current.set(name, line.slice(delimiter + 1).trim());
  }
  return rules;
}

function cspDirectives(value) {
  assert.ok(value, 'a Content Security Policy is required');
  const directives = new Map();
  for (const directive of value.split(';').map(value => value.trim()).filter(Boolean)) {
    const [name, ...sources] = directive.split(/\s+/);
    assert.ok(!directives.has(name), `duplicate CSP directive: ${name}`);
    directives.set(name, sources);
  }
  return directives;
}

test('public browser security limits scripts, connections, forms, and embedded content to the reviewed policy', () => {
  const rules = headerRules(read('_headers'));
  const publicHeaders = rules.get('/*');
  assert.ok(publicHeaders, 'public security headers must cover every static route');
  assert.equal(publicHeaders.get('x-content-type-options'), 'nosniff');
  assert.equal(publicHeaders.get('referrer-policy'), 'no-referrer');
  assert.equal(publicHeaders.get('x-frame-options'), 'DENY', 'all public pages must deny clickjacking frames');
  assert.match(publicHeaders.get('strict-transport-security') || '', /^max-age=(\d+)(?:;|$)/);
  const age = Number(publicHeaders.get('strict-transport-security').match(/max-age=(\d+)/)[1]);
  assert.ok(age >= 15552000, 'HTTPS must remain required for at least 180 days');

  for (const [route, headers] of rules) {
    if (!headers.has('content-security-policy')) continue;
    const csp = cspDirectives(headers.get('content-security-policy'));
    const localReport = ['/secure-reports', '/secure-reports.html'].includes(route);
    const worksheet = WORKSHEET_ROUTES.includes(route);
    const localOnly = localReport || worksheet;
    for (const name of ['default-src', 'script-src', 'font-src']) {
      assert.deepEqual(csp.get(name), [worksheet && name !== 'font-src' ? "'none'" : "'self'"], `${route}: ${name} must stay within the reviewed local policy`);
    }
    const connections=localOnly?["'none'"]:route==='/*'?["'self'",'https://cole-learning-labs-requester.alan91cole.workers.dev']:["'self'"];
    assert.deepEqual(csp.get('connect-src'),connections,`${route}: connections must match the reviewed topic-only requester boundary`);
    assert.deepEqual(csp.get('form-action'),localOnly?["'none'"]:["'self'"],`${route}: forms must match the reviewed local boundary`);
    assert.deepEqual(csp.get('style-src'), localReport ? ["'self'"] : ["'self'", "'unsafe-inline'"], `${route}: unexpected stylesheet policy`);
    for (const name of ['object-src', 'base-uri', 'frame-src', 'frame-ancestors']) {
      assert.deepEqual(csp.get(name), ["'none'"], `${route}: ${name} must remain disabled`);
    }
    assert.deepEqual(csp.get('img-src'), worksheet ? ["'self'"] : ["'self'", 'data:'], `${route}: unexpected image provider`);
    assert.ok(csp.has('upgrade-insecure-requests'), `${route}: insecure resource upgrade is required`);
  }
});

test('HTML worksheets cannot run scripts, connect, submit, be framed, or be retained by a shared cache', () => {
  const rules = headerRules(read('_headers'));
  for (const route of WORKSHEET_ROUTES) {
    const headers = rules.get(route);
    assert.ok(headers, `${route}: both clean and HTML worksheet routes need explicit protection`);
    const csp = cspDirectives(headers.get('content-security-policy'));
    for (const name of ['default-src', 'script-src', 'connect-src', 'form-action', 'frame-ancestors', 'frame-src', 'object-src', 'base-uri']) {
      assert.deepEqual(csp.get(name), ["'none'"], `${route}: ${name} must remain disabled`);
    }
    const cache = new Set((headers.get('cache-control') || '').split(',').map(value => value.trim()));
    for (const name of ['private', 'no-store', 'no-transform']) assert.ok(cache.has(name), `${route}: ${name} is required`);
    assert.ok(!cache.has('public'));
  }
});

test('local report exchange denies network connections, form submissions, framing, caching, and proxy transformation', () => {
  const rules = headerRules(read('_headers'));
  for (const route of ['/secure-reports', '/secure-reports.html']) {
    const headers = rules.get(route);
    assert.ok(headers, `${route}: both clean and HTML report entry points need an explicit privacy boundary`);
    const cache = new Set((headers.get('cache-control') || '').split(',').map(value => value.trim()));
    for (const directive of ['private', 'no-store', 'no-transform']) assert.ok(cache.has(directive), `${route}: ${directive} is required`);
    assert.ok(!cache.has('public'), `${route}: local report exchange cannot be marked publicly cacheable`);
    const csp = cspDirectives(headers.get('content-security-policy'));
    for (const directive of ['connect-src', 'form-action', 'frame-ancestors', 'frame-src', 'object-src']) {
      assert.deepEqual(csp.get(directive), ["'none'"], `${route}: ${directive} must remain disabled`);
    }
    assert.deepEqual(csp.get('script-src'), ["'self'"], `${route}: only reviewed local scripts may run`);
  }
});

test('teacher pages cannot be framed or retained by a shared browser cache', () => {
  const teacherHeaders = headerRules(read('_headers')).get('/teacher/*');
  assert.ok(teacherHeaders, 'teacher pages need their own private cache policy');
  const cache = new Set((teacherHeaders.get('cache-control') || '').split(',').map(value => value.trim()));
  assert.ok(cache.has('private') && cache.has('no-store'), 'teacher pages must use private, no-store');
  assert.ok(!cache.has('public'), 'teacher pages must never be marked publicly cacheable');
  assert.deepEqual(cspDirectives(teacherHeaders.get('content-security-policy')).get('frame-ancestors'), ["'none'"]);
});

test('the browser policy denies surveillance and unnecessary hardware permissions', () => {
  const policy = headerRules(read('_headers')).get('/*').get('permissions-policy') || '';
  const permissions = new Map(policy.split(',').map(value => value.trim().split('=')));
  for (const name of ['camera', 'microphone', 'geolocation', 'display-capture', 'usb', 'serial', 'hid', 'payment']) {
    assert.equal(permissions.get(name), '()', `${name} permission must remain denied`);
  }
});

test('independent public labs bypass server functions and remain free of package dependencies', () => {
  const routes = JSON.parse(read('_routes.json'));
  assert.deepEqual(routes, {version: 1, include: ['/api/*'], exclude: []}, 'only explicit API requests should invoke classroom server functions');
  const pkg = JSON.parse(read('package.json'));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.deepEqual(Object.keys(pkg[field] || {}), [], `${field} require a reviewed supply chain and locked installation workflow before release`);
  }
});
