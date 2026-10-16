import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = filename => readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');

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
  assert.match(publicHeaders.get('strict-transport-security') || '', /^max-age=(\d+)(?:;|$)/);
  const age = Number(publicHeaders.get('strict-transport-security').match(/max-age=(\d+)/)[1]);
  assert.ok(age >= 15552000, 'HTTPS must remain required for at least 180 days');

  for (const [route, headers] of rules) {
    if (!headers.has('content-security-policy')) continue;
    const csp = cspDirectives(headers.get('content-security-policy'));
    for (const name of ['default-src', 'script-src', 'font-src', 'connect-src', 'form-action']) {
      assert.deepEqual(csp.get(name), ["'self'"], `${route}: ${name} must stay same-origin`);
    }
    for (const name of ['object-src', 'base-uri', 'frame-src']) {
      assert.deepEqual(csp.get(name), ["'none'"], `${route}: ${name} must remain disabled`);
    }
    assert.deepEqual(csp.get('img-src'), ["'self'", 'data:'], `${route}: unexpected image provider`);
    assert.ok(csp.has('upgrade-insecure-requests'), `${route}: insecure resource upgrade is required`);
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
