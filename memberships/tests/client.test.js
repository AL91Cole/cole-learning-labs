import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMembership, reviewedDestination, MEMBERSHIP_CLIENT_RELEASE_APPROVED,
  MEMBERSHIP_TERMS_VERSION } from '../public/membership.js';
import { MEMBERSHIP_SOURCE_RELEASE_APPROVED } from '../worker.js';

const ORIGIN = 'https://members.colelearninglabs.com';
const GOOGLE = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=fictional&state=fictional';
const CHECKOUT = 'https://checkout.stripe.com/c/pay/cs_test_fictional#fidkdWxOYHwnPyd1blpxYHZxWjA0';
const PORTAL = 'https://billing.stripe.com/p/session/test_fictional';
const signedIn = (active = false) => ({ signedIn: true, csrfToken: 'A'.repeat(43), membership: { active } });

class Control {
  checked = false; disabled = false; value = ''; textContent = ''; dataset = {};
  listeners = new Map();
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  async emit(type) {
    await Promise.all([...this.listeners.get(type) || []].map(listener => listener({ target: this, currentTarget: this })));
  }
}

function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function drain() { for (let index = 0; index < 16; index++) await Promise.resolve(); await new Promise(setImmediate); }
function fixture(t, options = {}) {
  const controls = Object.fromEntries(['adult', 'renewal', 'sign-in', 'checkout', 'portal', 'sign-out', 'status', 'plan'].map(name => [name, new Control()]));
  controls.plan.value = 'teacher-annual';
  const root = { dataset: {}, querySelector(selector) { return controls[selector.slice(6, -1)]; } };
  const calls = [], navigation = [], routes = new Map([
    ['/api/member/session', () => Response.json(options.session ?? { signedIn: false })],
    ['/api/auth/sign-in/social', () => Response.json({ url: GOOGLE, redirect: false })],
    ['/api/member/checkout', () => Response.json({ url: CHECKOUT })],
    ['/api/member/portal', () => Response.json({ url: PORTAL })],
    ['/api/auth/sign-out', () => Response.json({ success: true })]
  ]);
  const fetcher = async (path, init) => {
    calls.push({ path, init });
    assert.ok(routes.has(path), 'Unreviewed request path: ' + path);
    return routes.get(path)(init);
  };
  const mounted = mountMembership(root, { origin: ORIGIN, fetcher, navigate: value => navigation.push(value),
    planSelector: controls.plan, ...options.mount });
  t.after(() => mounted.dispose());
  return { controls, root, calls, navigation, routes, mounted,
    async ready() { if (mounted.ready) await mounted.ready; else await drain(); },
    posts() { return calls.filter(call => call.init.method === 'POST'); } };
}

test('both release gates stay false and every default-preview control remains unable to fetch or navigate', async t => {
  assert.equal(MEMBERSHIP_CLIENT_RELEASE_APPROVED, false);
  assert.equal(MEMBERSHIP_SOURCE_RELEASE_APPROVED, false);
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: {
    origin: ORIGIN, search: '?enabled=true&membership=true&reviewApproved=true&pricingApproved=true',
    hash: '#enable-memberships' } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { assert.fail('Membership preview read local storage.'); } });
  t.after(() => {
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation); else delete globalThis.location;
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else delete globalThis.localStorage;
  });
  const h = fixture(t, { mount: { pricingApproved: true } });
  h.root.dataset = { enabled: 'true', approved: 'true' };
  h.controls.adult.checked = true; h.controls.renewal.checked = true;
  await h.ready();
  for (const type of ['change', 'click']) for (const control of Object.values(h.controls)) await control.emit(type);
  assert.equal(h.calls.length, 0); assert.deepEqual(h.navigation, []);
  assert.match(h.controls.status.textContent, /Preview only/u);
  for (const name of ['sign-in', 'checkout', 'portal', 'sign-out', 'renewal', 'plan']) assert.equal(h.controls[name].disabled, true, name);
});

test('review fixtures require an actual boolean release approval and the exact isolated membership origin', async t => {
  for (const mount of [{ enabled: 'true' }, { enabled: 1 }, ...[
    'https://www.colelearninglabs.com', 'https://colelearninglabs.com', 'http://members.colelearninglabs.com',
    'https://members.colelearninglabs.com:8443', ORIGIN + '/', ORIGIN + '.evil.example.test'
  ].map(origin => ({ enabled: true, origin }))]) {
    const h = fixture(t, { mount: { pricingApproved: true, ...mount } });
    h.controls.adult.checked = h.controls.renewal.checked = true;
    for (const control of Object.values(h.controls)) await control.emit('click');
    assert.equal(h.calls.length, 0, JSON.stringify(mount)); assert.deepEqual(h.navigation, []);
  }
  const approved = fixture(t, { mount: { enabled: true } }); await approved.ready();
  assert.deepEqual(approved.calls.map(call => call.path), ['/api/member/session']);
});

test('sign-in requires explicit adult confirmation and sends only the auth module’s fixed Google contract', async t => {
  const h = fixture(t, { mount: { enabled: true } }); await h.ready();
  for (const checked of [false, 'true', 1]) { h.controls.adult.checked = checked; await h.controls['sign-in'].emit('click'); }
  assert.equal(h.posts().length, 0);
  h.root.dataset = { provider: 'github', callbackURL: 'https://evil.example.test', idToken: 'forged' };
  Object.assign(h.controls['sign-in'], { value: 'github', dataset: { scopes: 'drive', redirect: 'https://evil.example.test' } });
  h.controls.adult.checked = true; await h.controls.adult.emit('change');
  assert.equal(h.controls['sign-in'].disabled, false);
  await h.controls['sign-in'].emit('click');
  const call = h.posts()[0]; assert.equal(call.path, '/api/auth/sign-in/social');
  assert.deepEqual(JSON.parse(call.init.body), { provider: 'google', adultConfirmed: true });
  assert.equal(call.init.credentials, 'same-origin'); assert.equal(call.init.referrerPolicy, 'no-referrer');
  assert.equal(call.init.cache, 'no-store'); assert.equal(call.init.redirect, 'error');
  assert.deepEqual(call.init.headers, { 'Content-Type': 'application/json' });
  assert.deepEqual(h.navigation, [GOOGLE]);
});

test('only reviewed Google, hosted checkout and billing destinations become navigation instructions', () => {
  assert.equal(reviewedDestination(GOOGLE, 'signin'), GOOGLE);
  assert.equal(reviewedDestination('https://accounts.google.com/o/oauth2/auth?state=fictional', 'signin'), 'https://accounts.google.com/o/oauth2/auth?state=fictional');
  assert.equal(reviewedDestination(CHECKOUT, 'checkout'), CHECKOUT, 'Stripe’s opaque checkout fragment must survive.');
  assert.equal(reviewedDestination(PORTAL, 'portal'), PORTAL);
  for (const kind of ['signin', 'checkout', 'portal']) for (const url of [null, {}, '', '/relative', 'javascript:alert(1)',
    'data:text/html,fictional', 'http://checkout.stripe.com/c/pay/cs_test_fictional', 'https://evil.example.test/',
    'https://accounts.google.com.evil.example.test/o/oauth2/v2/auth', 'https://checkout.stripe.com.evil.example.test/c/pay/fictional',
    'https://billing.stripe.com.evil.example.test/p/session/fictional', 'https://fictional:password@checkout.stripe.com/c/pay/fictional',
    'https://checkout.stripe.com:8443/c/pay/fictional', 'https://checkout.stripe.com/c/pay/../../evil', 'https://example.test/' + 'x'.repeat(8192)]) {
    assert.equal(reviewedDestination(url, kind), null, String(url));
  }
  for (const [url, kind] of [['https://accounts.google.com/o/oauth2/v2/auth#fragment', 'signin'],
    ['https://accounts.google.com/other', 'signin'], [CHECKOUT, 'portal'], [PORTAL, 'checkout'],
    [PORTAL + '#fragment', 'portal'], ['https://checkout.stripe.com/other', 'checkout']]) assert.equal(reviewedDestination(url, kind), null);
});

test('an untrusted auth response cannot navigate or render its supplied URL as markup', async t => {
  const h = fixture(t, { mount: { enabled: true } }); await h.ready();
  h.routes.set('/api/auth/sign-in/social', () => Response.json({ url: 'javascript:alert("PRIVATE_MARKUP")' }));
  h.controls.adult.checked = true; await h.controls['sign-in'].emit('click');
  assert.deepEqual(h.navigation, []); assert.match(h.controls.status.textContent, /Sign-in is unavailable/u);
  assert.doesNotMatch(h.controls.status.textContent, /PRIVATE_MARKUP|javascript/u);
});

test('billing cancellation stays accessible for signed-in unpaid and active purchasers while pricing is closed', async t => {
  for (const active of [false, true]) {
    const h = fixture(t, { session: signedIn(active), mount: { enabled: true } }); await h.ready();
    assert.equal(h.controls.portal.disabled, false); assert.equal(h.controls.checkout.disabled, true);
    h.controls.adult.checked = h.controls.renewal.checked = true;
    await h.controls.checkout.emit('click'); assert.equal(h.posts().length, 0);
    await h.controls.portal.emit('click');
    const call = h.posts()[0]; assert.equal(call.path, '/api/member/portal');
    assert.deepEqual(JSON.parse(call.init.body), {}); assert.equal(call.init.headers['X-Membership-CSRF'], 'A'.repeat(43));
    assert.deepEqual(h.navigation, [PORTAL]);
  }
});

test('checkout requires a valid current session, approved pricing, exact plan and separately checked renewal consent', async t => {
  const h = fixture(t, { session: signedIn(), mount: { enabled: true, pricingApproved: true } }); await h.ready();
  assert.equal(h.controls.renewal.checked, false); assert.equal(h.controls.checkout.disabled, true);
  for (const [adult, renewal] of [[false, false], [true, false], [false, true], ['true', true], [true, 'true']]) {
    h.controls.adult.checked = adult; h.controls.renewal.checked = renewal; await h.controls.checkout.emit('click');
  }
  h.controls.adult.checked = h.controls.renewal.checked = true;
  h.controls.plan.value = 'price_attacker_controlled'; await h.controls.checkout.emit('click');
  assert.equal(h.posts().length, 0);
  h.controls.plan.value = 'teacher-monthly'; await h.controls.renewal.emit('change');
  assert.equal(h.controls.checkout.disabled, false);
  await h.controls.checkout.emit('click');
  const call = h.posts()[0]; assert.equal(call.path, '/api/member/checkout');
  assert.deepEqual(JSON.parse(call.init.body), { plan: 'teacher-monthly', adult: true,
    renewalConsent: true, termsVersion: MEMBERSHIP_TERMS_VERSION });
  assert.equal(call.init.headers['X-Membership-CSRF'], 'A'.repeat(43));
  assert.deepEqual(h.navigation, [CHECKOUT]);
  await h.controls.checkout.emit('click');
  assert.equal(h.posts().length, 1, 'A completed navigation must not replay checkout using the previous renewal consent.');
});

test('repeated clicks cannot replay an in-flight checkout and disposal suppresses a late navigation', async t => {
  const h = fixture(t, { session: signedIn(), mount: { enabled: true, pricingApproved: true } }); await h.ready();
  const response = deferred(); h.routes.set('/api/member/checkout', () => response.promise);
  h.controls.adult.checked = h.controls.renewal.checked = true;
  const click = h.controls.checkout.emit('click'); await h.controls.checkout.emit('click');
  assert.equal(h.posts().length, 1); assert.equal(h.controls.checkout.disabled, true);
  const signal = h.posts()[0].init.signal; h.mounted.dispose(); assert.equal(signal.aborted, true);
  response.resolve(Response.json({ url: CHECKOUT })); await click;
  assert.deepEqual(h.navigation, []);
  for (const control of Object.values(h.controls)) await control.emit('click');
  assert.equal(h.posts().length, 1);
});

test('sign-out confirms server success before clearing account state and renewal consent', async t => {
  const h = fixture(t, { session: signedIn(), mount: { enabled: true, pricingApproved: true } }); await h.ready();
  h.controls.adult.checked = h.controls.renewal.checked = true;
  h.routes.set('/api/auth/sign-out', () => Response.json({ success: false }));
  await h.controls['sign-out'].emit('click'); assert.equal(h.controls.portal.disabled, false);
  assert.match(h.controls.status.textContent, /could not be confirmed/u);
  h.routes.set('/api/auth/sign-out', () => Response.json({ success: true }));
  await h.controls['sign-out'].emit('click');
  assert.equal(h.controls.adult.checked, false); assert.equal(h.controls.renewal.checked, false);
  assert.equal(h.controls.portal.disabled, true); assert.equal(h.controls.checkout.disabled, true);
  assert.deepEqual(JSON.parse(h.posts().at(-1).init.body), {});
  assert.deepEqual(h.navigation, []);
});

test('a malformed or oversized session response never enables billing or navigation', async t => {
  for (const session of [{ signedIn: true, csrfToken: 'A'.repeat(42), membership: { active: false } },
    { signedIn: true, csrfToken: 'A'.repeat(43), membership: { active: 'false' } },
    { signedIn: 'true', csrfToken: 'A'.repeat(43), membership: { active: false } },
    { ...signedIn(), extra: 'x'.repeat(8192) }]) {
    const h = fixture(t, { session, mount: { enabled: true, pricingApproved: true } }); await h.ready();
    assert.equal(h.controls.portal.disabled, true); assert.equal(h.controls.checkout.disabled, true);
    h.controls.adult.checked = h.controls.renewal.checked = true;
    await h.controls.checkout.emit('click'); await h.controls.portal.emit('click');
    assert.equal(h.posts().length, 0); assert.deepEqual(h.navigation, []);
  }
});

test('invalid media types, metadata, UTF-8 and JSON fail closed without exposing response content', async t => {
  const h = fixture(t, { mount: { enabled: true } }); await h.ready(); h.controls.adult.checked = true;
  const headers = { 'Content-Type': 'application/json' };
  for (const response of [new Response('PRIVATE_PROVIDER_ERROR', { status: 503, headers }),
    new Response('<script>PRIVATE_MARKUP</script>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('<SCRIPT>PRIVATE_UPPERCASE_MARKUP</SCRIPT>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('{}', { headers: { ...headers, 'Content-Length': 'invalid' } }),
    new Response('{}', { headers: { ...headers, 'Content-Length': '8193' } }),
    new Response('PRIVATE_INVALID_JSON', { headers }),
    new Response(new Uint8Array([0xff, 0xff]), { headers })]) {
    h.routes.set('/api/auth/sign-in/social', () => response);
    await h.controls['sign-in'].emit('click');
    assert.deepEqual(h.navigation, []);
    assert.equal(h.controls.status.textContent, 'Sign-in is unavailable. Please try again later.');
  }
});

test('the reply byte ceiling counts streamed bytes despite a false small Content-Length and cancels overflow', async t => {
  const h = fixture(t, { mount: { enabled: true } }); await h.ready(); h.controls.adult.checked = true;
  let cancelled = false;
  h.routes.set('/api/auth/sign-in/social', () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('x'.repeat(8193))); },
    cancel() { cancelled = true; }
  }), { headers: { 'Content-Type': 'application/json', 'Content-Length': '1' } }));
  await h.controls['sign-in'].emit('click');
  assert.equal(cancelled, true); assert.deepEqual(h.navigation, []);
  assert.match(h.controls.status.textContent, /unavailable/u);
});

test('a stalled body reaches a real deadline, cancels its reader and leaves the interface retryable', async t => {
  const h = fixture(t, { mount: { enabled: true } }); await h.ready(); h.controls.adult.checked = true;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cancelled = false, completed = false;
  h.routes.set('/api/auth/sign-in/social', () => new Response(new ReadableStream({ cancel() { cancelled = true; } }),
    { headers: { 'Content-Type': 'application/json' } }));
  const click = h.controls['sign-in'].emit('click').then(() => { completed = true; }); await drain();
  assert.equal(completed, false); const signal = h.posts()[0].init.signal;
  t.mock.timers.tick(12001); await drain();
  assert.equal(signal.aborted, true); assert.equal(cancelled, true);
  assert.equal(completed, true, 'The reader deadline must settle even when a response body ignores the fetch abort signal.');
  await click; assert.deepEqual(h.navigation, []); assert.equal(h.controls['sign-in'].disabled, false);
  assert.match(h.controls.status.textContent, /unavailable/u);
});

test('the deadline also settles a fetch promise that ignores cancellation and blocks its late reply', async t => {
  const h = fixture(t, { mount: { enabled: true } }); await h.ready(); h.controls.adult.checked = true;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const reply = deferred(); let completed = false;
  h.routes.set('/api/auth/sign-in/social', () => reply.promise);
  const click = h.controls['sign-in'].emit('click').then(() => { completed = true; }); await drain();
  const signal = h.posts()[0].init.signal; t.mock.timers.tick(12001); await drain();
  assert.equal(signal.aborted, true); assert.equal(completed, true);
  reply.resolve(Response.json({ url: GOOGLE })); await click; await drain();
  assert.deepEqual(h.navigation, []); assert.equal(h.controls['sign-in'].disabled, false);
});

test('disposing a stalled reader cancels it immediately and settles the interaction without navigation', async t => {
  const h = fixture(t, { mount: { enabled: true } }); await h.ready(); h.controls.adult.checked = true;
  let cancelled = false, completed = false;
  h.routes.set('/api/auth/sign-in/social', () => new Response(new ReadableStream({ cancel() { cancelled = true; } }),
    { headers: { 'Content-Type': 'application/json' } }));
  const click = h.controls['sign-in'].emit('click').then(() => { completed = true; }); await drain();
  h.mounted.dispose(); await drain();
  assert.equal(cancelled, true); assert.equal(completed, true); await click;
  assert.deepEqual(h.navigation, []);
});
