import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serializeSignedCookie } from 'better-call';
import { runWithEndpointContext } from '@better-auth/core/context';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createMembershipAuth, getAdultSession, handleMembershipAuth, membershipAllowedEmails,
  membershipAuthOptions, MEMBERSHIP_ORIGIN, MEMBERSHIP_SESSION_SECONDS } from '../auth.js';
import { createLocalAuthDatabase, fictionalAuthEnvironment, generateAuthSchema } from '../auth-schema.mjs';

const schema = await readFile(new URL('../auth-schema.sql', import.meta.url), 'utf8');
const origin = MEMBERSHIP_ORIGIN;
const source = { method: 'oauth', oauth: { providerId: 'google', profile: {
  sub: 'fictional-google-subject', email: 'teacher@example.test', email_verified: true
} } };
function fixture(t) {
  const database = createLocalAuthDatabase(); database.sqlite.exec(schema); t.after(() => database.close());
  const env = fictionalAuthEnvironment(database.binding);
  const auth = createMembershipAuth(env);
  const req = (path = '/api/auth/sign-in/social', { method = 'POST', body = { provider: 'google', adultConfirmed: true }, headers = {}, raw = false, ...options } = {}) =>
    new Request(origin + path, { method, headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(method === 'POST' ? { body: raw ? body : JSON.stringify(body) } : {}), ...options });
  async function member() {
    const context = await auth.$context;
    const request = req('/api/auth/callback/google?state=fictional', { method: 'GET', headers: { 'User-Agent': 'PRIVATE_BROWSER', 'X-Forwarded-For': '192.0.2.1' } });
    const { user, session } = await runWithEndpointContext({ context, request, headers: request.headers }, async () => {
      const user = await context.internalAdapter.createUser({ email: 'teacher@example.test', emailVerified: true,
        name: 'Fictional name must not persist', image: 'https://example.test/avatar.png' }, source);
      return { user, session: await context.internalAdapter.createSession(user.id) };
    });
    const cookie = (await serializeSignedCookie(context.authCookies.sessionToken.name, session.token,
      env.MEMBERSHIP_AUTH_SECRET, context.authCookies.sessionToken.attributes)).split(';')[0];
    return { context, user, session, cookie };
  }
  return { database, env, auth, req, member };
}

test('the committed auth schema regenerates from the pinned library without remote resources', async () => {
  assert.equal(schema.replace(/\r\n/gu, '\n'), await generateAuthSchema());
});

test('allowlist is exact, bounded and never grants a wildcard domain', () => {
  assert.deepEqual([...membershipAllowedEmails('Teacher@Example.test\nsecond@example.test')], ['teacher@example.test', 'second@example.test']);
  for (const value of [null, '', '*@example.test', 'example.test', 'teacher@example.test,', 'a@b.test,'.repeat(101), 'x'.repeat(32001)]) {
    assert.equal(membershipAllowedEmails(value).size, 0);
  }
});

test('missing configuration refuses auth initialization before any provider operation', t => {
  const h = fixture(t);
  for (const selected of [ { MEMBERSHIP_ALLOWED_EMAILS: '' }, { MEMBERSHIP_AUTH_SECRET: 'short' },
    { MEMBERSHIP_GOOGLE_CLIENT_ID: 'untrusted.example.test' }, { MEMBERSHIP_GOOGLE_CLIENT_SECRET: '' }, { MEMBERSHIP_DB: {} } ]) {
    assert.throws(() => membershipAuthOptions({ ...h.env, ...selected }), /unconfigured/);
  }
});

test('real library configuration uses browser-enforced host cookies and disables optional identity surfaces', async t => {
  const h = fixture(t), context = await h.auth.$context, options = membershipAuthOptions(h.env);
  for (const cookie of Object.values(context.authCookies)) {
    assert.ok(cookie.name.startsWith('__Host-cll-member.'));
    assert.equal(cookie.attributes.secure, true); assert.equal(cookie.attributes.httpOnly, true);
    assert.equal(cookie.attributes.sameSite, 'lax'); assert.equal(cookie.attributes.path, '/');
    assert.equal(cookie.attributes.domain, undefined);
  }
  assert.equal(options.baseURL, origin); assert.deepEqual(options.trustedOrigins, [origin]);
  assert.equal(options.advanced.disableCSRFCheck, false); assert.equal(options.advanced.disableOriginCheck, false);
  assert.equal(options.account.accountLinking.enabled, false); assert.equal(options.account.skipStateCookieCheck, false);
  assert.equal(options.session.cookieCache.enabled, false); assert.equal(options.session.disableSessionRefresh, true);
  assert.equal(options.telemetry.enabled, false); assert.equal(options.logger.disabled, true);
  assert.equal(options.emailAndPassword.enabled, false);
  assert.deepEqual(options.socialProviders.google.scope, ['openid', 'email']);
  assert.equal(options.socialProviders.google.includeGrantedScopes, false);
  assert.equal(options.socialProviders.google.disableIdTokenSignIn, true);
});

test('verified operator-approved Google identity is required before any user or account is created', async t => {
  const h = fixture(t), context = await h.auth.$context;
  for (const [user, chosenSource] of [
    [{ email: 'unapproved@example.test', emailVerified: true }, { ...source, oauth: { ...source.oauth, profile: { ...source.oauth.profile, email: 'unapproved@example.test' } } }],
    [{ email: 'teacher@example.test', emailVerified: false }, source],
    [{ email: 'teacher@example.test', emailVerified: true }, { method: 'email-password' }],
    [{ email: 'teacher@example.test', emailVerified: true }, { ...source, oauth: { ...source.oauth, providerId: 'github' } }],
    [{ email: 'teacher@example.test', emailVerified: true }, { ...source, oauth: { ...source.oauth, profile: { ...source.oauth.profile, email_verified: false } } }]
  ]) {
    await assert.rejects(runWithEndpointContext({ context, headers: new Headers() }, () =>
      context.internalAdapter.createUser({ ...user, name: 'Rejected', image: null }, chosenSource)));
    assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS count FROM membership_auth_user').get().count, 0);
    assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS count FROM membership_auth_account').get().count, 0);
  }
  for (const action of ['create-user', 'sign-in', 'link-account']) {
    const hookResult = membershipAuthOptions(h.env).user.validateUserInfo({ user: { email: 'teacher@example.test', emailVerified: true }, source: { ...source, action } });
    assert.equal(hookResult === undefined, action !== 'link-account');
  }
});

test('database hooks and SQL constraints discard provider tokens, names, avatars and connection metadata', async t => {
  const h = fixture(t), member = await h.member();
  const account = await member.context.internalAdapter.createAccount({ accountId: 'fictional-google-subject', providerId: 'google',
    userId: member.user.id, accessToken: 'Fictional-provider-token', refreshToken: 'Fictional-refresh-token', idToken: 'Fictional-id-token',
    scope: 'openid email', accessTokenExpiresAt: new Date(Date.now() + 3600_000) });
  assert.equal(account.accessToken, null); assert.equal(account.refreshToken, null); assert.equal(account.idToken, null);
  const user = h.database.sqlite.prepare('SELECT * FROM membership_auth_user').get();
  assert.equal(user.name, 'Teacher member'); assert.equal(user.image, null);
  const stored = h.database.sqlite.prepare('SELECT * FROM membership_auth_session').get();
  assert.equal(stored.ipAddress, null); assert.equal(stored.userAgent, null);
  for (const [table, field, value] of [['membership_auth_user', 'image', 'https://example.test/avatar'],
    ['membership_auth_session', 'ipAddress', '192.0.2.1'], ['membership_auth_session', 'userAgent', 'PRIVATE_BROWSER'],
    ['membership_auth_account', 'accessToken', 'PRIVATE_TOKEN'], ['membership_auth_account', 'providerId', 'github']]) {
    assert.throws(() => h.database.sqlite.prepare(`UPDATE ${table} SET ${field} = ?`).run(value), /CHECK constraint failed/);
  }
});

test('real sign-in emits only a constrained Google authorization URL, one-use hashed state and secure state cookie', async t => {
  const h = fixture(t), originalFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('Starting OAuth must not call an external provider.');
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await handleMembershipAuth(h.req(), h.env); assert.equal(result.status, 200);
  const data = await result.json(); assert.deepEqual(Object.keys(data).sort(), ['redirect', 'url']);
  const url = new URL(data.url); assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('redirect_uri'), origin + '/api/auth/callback/google');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge')); assert.ok(url.searchParams.get('state'));
  assert.deepEqual(url.searchParams.get('scope').split(' ').sort(), ['email', 'openid']);
  assert.equal(url.searchParams.get('access_type'), 'online');
  const cookies = result.headers.getSetCookie(); assert.ok(cookies.length > 0);
  for (const cookie of cookies) {
    assert.match(cookie, /^__Host-cll-member\./); assert.match(cookie, /; Secure/u); assert.match(cookie, /; HttpOnly/u);
    assert.match(cookie, /; SameSite=Lax/u); assert.match(cookie, /; Path=\//u); assert.doesNotMatch(cookie, /; Domain=/iu);
  }
  const states = h.database.sqlite.prepare('SELECT * FROM membership_auth_verification').all();
  assert.equal(states.length, 1); assert.ok(!states[0].identifier.includes(url.searchParams.get('state')));
  const state = JSON.parse(states[0].value);
  assert.equal(state.callbackURL, origin + '/'); assert.equal(state.errorURL, origin + '/');
  assert.ok(state.codeVerifier); assert.doesNotMatch(JSON.stringify(data), new RegExp(state.codeVerifier));
  assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS count FROM membership_auth_user').get().count, 0);
});

test('the auth boundary reconstructs its fixed body and drops all unrelated cookies, IPs and browser headers', async t => {
  const h = fixture(t), calls = [];
  const authFactory = () => ({ async handler(request) { calls.push(request); return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); } });
  const response = await handleMembershipAuth(h.req(undefined, { headers: {
    Cookie: 'student=PRIVATE_STUDENT; __Host-cll-member.state=Fictional-state',
    'User-Agent': 'PRIVATE_BROWSER', 'Cf-Connecting-Ip': '192.0.2.1', 'X-Forwarded-For': '192.0.2.2',
    Referer: 'https://example.test/PRIVATE_PATH', 'X-Unknown': 'PRIVATE_METADATA'
  } }), h.env, { authFactory });
  assert.equal(response.status, 200); assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(await calls[0].text()), { provider: 'google', callbackURL: origin + '/',
    newUserCallbackURL: origin + '/', errorCallbackURL: origin + '/', disableRedirect: true });
  assert.equal(calls[0].headers.get('Cookie'), '__Host-cll-member.state=Fictional-state');
  assert.doesNotMatch(JSON.stringify([...calls[0].headers]), /PRIVATE_|192\.0\.2\./u);
});

test('ID-token shortcuts, account linking, extra scopes and caller redirects are rejected before auth access', async t => {
  const h = fixture(t), poison = () => assert.fail('Invalid auth request accessed the authentication service.');
  for (const body of [null, [], {}, { provider: 'google', adultConfirmed: false },
    { provider: 'github', adultConfirmed: true }, { provider: 'google', adultConfirmed: true, callbackURL: 'https://evil.example.test' },
    { provider: 'google', adultConfirmed: true, idToken: { token: 'Fictional' } },
    { provider: 'google', adultConfirmed: true, scopes: ['https://www.googleapis.com/auth/drive'] },
    { provider: 'google', adultConfirmed: true, additionalData: { student: 'PRIVATE_DATA' } },
    { provider: 'google', adultConfirmed: true, additionalParams: { login_hint: 'PRIVATE_EMAIL' } }]) {
    assert.equal((await handleMembershipAuth(h.req(undefined, { body }), h.env, { authFactory: poison })).status, 400);
  }
  for (const [path, method] of [['/api/auth/sign-up/email', 'POST'], ['/api/auth/link-social', 'POST'],
    ['/api/auth/get-session', 'GET'], ['/api/auth/get-access-token', 'POST'], ['/api/auth/sign-in/social', 'GET']]) {
    assert.equal((await handleMembershipAuth(h.req(path, { method }), h.env, { authFactory: poison })).status, 403);
  }
});

test('origin, fetch metadata, duplicate OAuth query values and oversized raw bodies fail closed', async t => {
  const h = fixture(t), poison = () => assert.fail('Rejected request reached authentication.');
  for (const headers of [{ Origin: 'https://evil.example.test' }, { 'Sec-Fetch-Site': 'same-site' },
    { Authorization: 'Bearer fictional' }, { 'Content-Encoding': 'gzip' }, { 'Content-Length': 'invalid' }]) {
    assert.ok([400, 403].includes((await handleMembershipAuth(h.req(undefined, { headers }), h.env, { authFactory: poison })).status));
  }
  assert.equal((await handleMembershipAuth(h.req(undefined, { raw: true, body: 'x'.repeat(513) }), h.env, { authFactory: poison })).status, 400);
  for (const path of ['/api/auth/callback/google?state=a&state=b&code=x', '/api/auth/callback/google?state=a&redirect_uri=https://evil.example.test',
    '/api/auth/callback/google?code=x', '/api/auth/callback/google?state=' + 'x'.repeat(8193)]) {
    assert.equal((await handleMembershipAuth(h.req(path, { method: 'GET' }), h.env, { authFactory: poison })).status, 403);
  }
});

test('stalled sign-in body is cancelled at the bounded deadline before reading authentication bindings', async t => {
  const h = fixture(t); let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const response = await handleMembershipAuth(h.req(undefined, { raw: true, body, duplex: 'half' }), h.env,
    { authFactory: () => assert.fail('Stalled body accessed auth.') });
  assert.equal(response.status, 400); assert.equal(cancelled, true);
});

test('real signed sessions are server-validated, minimal, non-refreshing and immediately revoked from storage', async t => {
  const h = fixture(t), member = await h.member();
  const request = () => h.req('/api/member/session', { method: 'GET', headers: { Cookie: member.cookie, 'User-Agent': 'PRIVATE_BROWSER' } });
  const result = await getAdultSession(request(), h.env);
  assert.deepEqual(Object.keys(result).sort(), ['session', 'user']);
  assert.deepEqual(Object.keys(result.user).sort(), ['email', 'emailVerified', 'id']);
  assert.deepEqual(Object.keys(result.session).sort(), ['createdAt', 'expiresAt', 'id']);
  assert.equal(result.user.id, member.user.id); assert.equal(result.user.emailVerified, true);
  assert.equal(new Date(result.session.expiresAt).getTime(), new Date(member.session.expiresAt).getTime());
  assert.equal(await getAdultSession(h.req('/api/member/session', { method: 'GET', headers: { Cookie: member.cookie + '; ' + member.cookie } }), h.env), null);
  assert.equal(await getAdultSession(h.req('/api/member/session', { method: 'GET', headers: { Cookie: member.cookie + 'tampered' } }), h.env), null);
  assert.equal(await getAdultSession(h.req('/api/member/session', { method: 'GET', headers: { Cookie: member.cookie, Authorization: 'Bearer forged' } }), h.env), null);
  h.env.MEMBERSHIP_ALLOWED_EMAILS = 'different@example.test';
  assert.equal(await getAdultSession(request(), h.env), null);
  h.env.MEMBERSHIP_ALLOWED_EMAILS = 'teacher@example.test';
  await member.context.internalAdapter.deleteSession(member.session.token);
  assert.equal(await getAdultSession(request(), h.env), null);
});

test('eight-hour absolute session age is enforced independently of a stored future expiration', async t => {
  const h = fixture(t), member = await h.member(), selectedNow = Date.now();
  const req = h.req('/api/member/session', { method: 'GET', headers: { Cookie: member.cookie } });
  const expiry = new Date(selectedNow + 3600_000).toISOString();
  h.database.sqlite.prepare('UPDATE membership_auth_session SET createdAt=?, expiresAt=?').run(
    new Date(selectedNow - MEMBERSHIP_SESSION_SECONDS * 1000 - 1).toISOString(), expiry);
  assert.equal(await getAdultSession(req, h.env, { now: () => selectedNow }), null);
});

test('sign-out requires same-origin POST with an empty object and deletes the actual server session', async t => {
  const h = fixture(t), member = await h.member();
  assert.equal((await handleMembershipAuth(h.req('/api/auth/sign-out', { body: { callbackURL: 'https://evil.example.test' }, headers: { Cookie: member.cookie } }), h.env)).status, 400);
  assert.equal((await handleMembershipAuth(h.req('/api/auth/sign-out', { body: {}, headers: { Cookie: member.cookie, Origin: 'https://evil.example.test' } }), h.env)).status, 403);
  assert.ok(await getAdultSession(h.req('/api/member/session', { method: 'GET', headers: { Cookie: member.cookie } }), h.env));
  const response = await handleMembershipAuth(h.req('/api/auth/sign-out', { body: {}, headers: { Cookie: member.cookie } }), h.env);
  assert.equal(response.status, 200); assert.ok(response.headers.getSetCookie().some(cookie => /session_token=.*Max-Age=0/u.test(cookie)));
  assert.equal(await getAdultSession(h.req('/api/member/session', { method: 'GET', headers: { Cookie: member.cookie } }), h.env), null);
});

test('a forged OAuth callback cannot exchange a code, create a user or leak provider error detail', async t => {
  const h = fixture(t), originalFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('Invalid state reached the provider.'); t.after(() => { globalThis.fetch = originalFetch; });
  const response = await handleMembershipAuth(h.req('/api/auth/callback/google?code=Fictional-code&state=Fictional-invalid-state', { method: 'GET' }), h.env);
  assert.ok([303, 403].includes(response.status));
  if (response.status === 303) assert.equal(response.headers.get('Location'), origin + '/');
  else assert.deepEqual(await response.json(), { error: 'membership_unavailable' });
  assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS count FROM membership_auth_user').get().count, 0);
});

test('an offline signed Google callback exercises real PKCE, JWT verification, admission, minimized storage and one-use state', async t => {
  const h = fixture(t), keys = await generateKeyPair('RS256'), jwk = await exportJWK(keys.publicKey);
  const token = await new SignJWT({ email: 'teacher@example.test', email_verified: true,
    name: 'PRIVATE_PROVIDER_NAME', picture: 'https://example.test/PRIVATE_AVATAR' })
    .setProtectedHeader({ alg: 'RS256', kid: 'fictional-offline-key' }).setIssuer('https://accounts.google.com')
    .setAudience(h.env.MEMBERSHIP_GOOGLE_CLIENT_ID).setSubject('fictional-google-subject')
    .setIssuedAt().setExpirationTime('5m').sign(keys.privateKey);
  const outgoing = [], originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    outgoing.push({ url, init });
    if (url === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({
      token_type: 'Bearer', access_token: 'Fictional-ephemeral-token', refresh_token: 'Fictional-unused-refresh',
      id_token: token, scope: 'openid email', expires_in: 300
    }), { headers: { 'Content-Type': 'application/json' } });
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') return new Response(JSON.stringify({ keys: [{ ...jwk,
      kid: 'fictional-offline-key', alg: 'RS256', use: 'sig' }] }), { headers: { 'Content-Type': 'application/json' } });
    assert.fail('Unexpected OAuth network destination: ' + url);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const start = await handleMembershipAuth(h.req(), h.env), authorization = new URL((await start.json()).url);
  const stateCookie = start.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
  const callbackURL = origin + '/api/auth/callback/google?code=Fictional-authorization-code&state=' + authorization.searchParams.get('state');
  const callback = () => new Request(callbackURL, { headers: { Cookie: stateCookie,
    'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document',
    'Cf-Connecting-Ip': '192.0.2.1', 'User-Agent': 'PRIVATE_BROWSER' } });
  let rawLocation;
  const response = await handleMembershipAuth(callback(), h.env, { authFactory: () => ({ async handler(request) {
    const result = await h.auth.handler(request); rawLocation = result.headers.get('Location'); return result;
  } }) });
  assert.equal(response.status, 303); assert.equal(response.headers.get('Location'), origin + '/');
  assert.equal(rawLocation, origin + '/', 'Callback result; mocked destinations: ' + outgoing.map(call => call.url).join(', '));
  const sessionCookie = response.headers.getSetCookie().find(cookie => cookie.startsWith('__Host-cll-member.session_token=') && !cookie.includes('Max-Age=0'));
  assert.ok(sessionCookie, 'The verified OAuth callback must create a real signed session cookie.');
  const member = await getAdultSession(new Request(origin + '/api/member/session', { headers: { Cookie: sessionCookie.split(';')[0] } }), h.env);
  assert.equal(member.user.email, 'teacher@example.test');
  assert.equal(outgoing.filter(call => call.url.endsWith('/token')).length, 1);
  assert.equal(outgoing.filter(call => call.url.endsWith('/certs')).length, 1, 'The maintained provider verifier must check the signed identity token.');
  const exchange = new URLSearchParams(outgoing.find(call => call.url.endsWith('/token')).init.body);
  assert.equal(exchange.get('redirect_uri'), origin + '/api/auth/callback/google');
  assert.ok(exchange.get('code_verifier')); assert.equal(exchange.get('code'), 'Fictional-authorization-code');
  const account = h.database.sqlite.prepare('SELECT * FROM membership_auth_account').get();
  assert.equal(account.accessToken, null); assert.equal(account.refreshToken, null); assert.equal(account.idToken, null);
  assert.equal(h.database.sqlite.prepare('SELECT name FROM membership_auth_user').get().name, 'Teacher member');
  assert.equal(h.database.sqlite.prepare('SELECT userAgent,ipAddress FROM membership_auth_session').get().userAgent, null);
  assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS count FROM membership_auth_verification').get().count, 0);
  await handleMembershipAuth(callback(), h.env);
  assert.equal(outgoing.filter(call => call.url.endsWith('/token')).length, 1, 'A replayed state must not exchange another code.');
});

test('actual OAuth callbacks reject incorrect JWT identity claims, signatures and unapproved or unverified emails before storage', async t => {
  const keys = await generateKeyPair('RS256'), wrongKeys = await generateKeyPair('RS256');
  const jwk = await exportJWK(keys.publicKey), originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  for (const scenario of ['audience', 'issuer', 'expired', 'signature', 'unverified-email', 'unapproved-email']) {
    const h = fixture(t);
    const token = await new SignJWT({ email: scenario === 'unapproved-email' ? 'unapproved@example.test' : 'teacher@example.test',
      email_verified: scenario !== 'unverified-email' })
      .setProtectedHeader({ alg: 'RS256', kid: 'fictional-offline-key' })
      .setIssuer(scenario === 'issuer' ? 'https://evil.example.test' : 'https://accounts.google.com')
      .setAudience(scenario === 'audience' ? 'wrong-audience' : h.env.MEMBERSHIP_GOOGLE_CLIENT_ID)
      .setSubject('fictional-google-subject').setIssuedAt()
      .setExpirationTime(scenario === 'expired' ? Math.floor(Date.now() / 1000) - 3600 : '5m')
      .sign(scenario === 'signature' ? wrongKeys.privateKey : keys.privateKey);
    globalThis.fetch = async input => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === 'https://oauth2.googleapis.com/token') return Response.json({ token_type: 'Bearer',
        access_token: 'Fictional-unused-access-token', id_token: token, scope: 'openid email', expires_in: 300 });
      if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [{ ...jwk,
        kid: 'fictional-offline-key', alg: 'RS256', use: 'sig' }] });
      assert.fail('Unexpected OAuth network destination: ' + url);
    };
    const start = await handleMembershipAuth(h.req(), h.env), authorization = new URL((await start.json()).url);
    const cookie = start.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const response = await handleMembershipAuth(new Request(origin + '/api/auth/callback/google?code=Fictional-code&state=' +
      authorization.searchParams.get('state'), { headers: { Cookie: cookie, 'Sec-Fetch-Site': 'cross-site' } }), h.env);
    assert.ok([303, 503].includes(response.status), scenario);
    assert.ok(!response.headers.getSetCookie().some(value => value.includes('.session_token=') && !value.includes('Max-Age=0')), scenario);
    for (const table of ['membership_auth_user', 'membership_auth_account', 'membership_auth_session']) {
      assert.equal(h.database.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0, scenario + ': ' + table);
    }
  }
});
