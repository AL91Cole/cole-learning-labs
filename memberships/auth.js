import { betterAuth } from 'better-auth';
import { verifyGoogleIdToken } from 'better-auth/social-providers';
import { MembershipError } from './security.js';

export const MEMBERSHIP_ORIGIN = 'https://members.colelearninglabs.com';
export const MEMBERSHIP_AUTH_PATH = '/api/auth';
export const MEMBERSHIP_SESSION_SECONDS = 8 * 60 * 60;
const instances = new WeakMap();
const AUTH_ROUTES = new Map([
  ['/api/auth/sign-in/social', 'POST'],
  ['/api/auth/callback/google', 'GET'],
  ['/api/auth/sign-out', 'POST']
]);
const COOKIE_PREFIX = '__Host-cll-member';
const SESSION_COOKIE = COOKIE_PREFIX + '.session_token';
const sameOrigin = request => request.headers.get('Origin') === MEMBERSHIP_ORIGIN &&
  request.headers.get('Sec-Fetch-Site') === 'same-origin';
const fail = (status = 403) => new Response(JSON.stringify({ error: 'membership_unavailable' }), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' }
});

/** Private operator approval is an exact adult-purchaser allowlist, not a domain
 * wildcard or proof of age. School/age authority still needs human review. */
export function membershipAllowedEmails(value) {
  if (typeof value !== 'string' || !value || value.length > 32_000) return new Set();
  const entries = value.split(/[\n,]/u).map(email => email.trim().toLowerCase());
  if (entries.length > 100 || entries.some(email => !/^[a-z0-9.!#$%&'+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/u.test(email) || email.length > 254)) return new Set();
  return new Set(entries);
}

function eligible(user, allowed) {
  return !!user && user.emailVerified === true && typeof user.email === 'string' &&
    allowed.has(user.email.toLowerCase());
}

/** Pure options builder also used by offline tests. It never creates a Stripe
 * customer. The Worker entry independently controls source/runtime activation. */
export function membershipAuthOptions(env) {
  const allowed = membershipAllowedEmails(env?.MEMBERSHIP_ALLOWED_EMAILS);
  const secret = env?.MEMBERSHIP_AUTH_SECRET;
  const clientId = env?.MEMBERSHIP_GOOGLE_CLIENT_ID;
  const clientSecret = env?.MEMBERSHIP_GOOGLE_CLIENT_SECRET;
  if (!allowed.size || typeof secret !== 'string' || new TextEncoder().encode(secret).byteLength < 32 || secret.length > 256 ||
    typeof clientId !== 'string' || !/^[a-z0-9-]+\.apps\.googleusercontent\.com$/u.test(clientId) ||
    typeof clientSecret !== 'string' || clientSecret.length < 16 || clientSecret.length > 256 ||
    typeof env?.MEMBERSHIP_DB?.prepare !== 'function' || typeof env?.MEMBERSHIP_DB?.batch !== 'function') {
    throw new Error('membership_auth_unconfigured');
  }
  const stripTokens = data => ({ data: { ...data, accessToken: null, refreshToken: null, idToken: null,
    accessTokenExpiresAt: null, refreshTokenExpiresAt: null, scope: null, password: null } });
  return {
    appName: 'Cole Learning Labs teacher membership',
    baseURL: MEMBERSHIP_ORIGIN,
    basePath: MEMBERSHIP_AUTH_PATH,
    trustedOrigins: [MEMBERSHIP_ORIGIN],
    secret,
    database: env.MEMBERSHIP_DB,
    telemetry: { enabled: false },
    logger: { disabled: true },
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId, clientSecret,
        accessType: 'online', includeGrantedScopes: false,
        disableDefaultScope: true, scope: ['openid', 'email'],
        disableIdTokenSignIn: true,
        // The authorization code flow is server-to-server. Also require the
        // maintained provider verifier to validate its identity token before
        // the decoded identity can reach account admission or storage.
        getUserInfo: async tokens => {
          if (typeof tokens.idToken !== 'string') return null;
          const profile = await verifyGoogleIdToken({ token: tokens.idToken, audience: clientId });
          if (!profile || typeof profile.sub !== 'string' || typeof profile.email !== 'string') return null;
          return { user: { id: profile.sub, name: 'Teacher member', image: null,
            email: profile.email, emailVerified: profile.email_verified === true }, data: profile };
        }
      }
    },
    user: {
      modelName: 'membership_auth_user',
      changeEmail: { enabled: false }, deleteUser: { enabled: false },
      validateUserInfo: ({ user, source }) => {
        const profile = source.oauth?.profile;
        if (source.method !== 'oauth' || source.action === 'link-account' || source.oauth?.providerId !== 'google' ||
          profile?.email_verified !== true || typeof profile?.email !== 'string' ||
          profile.email.toLowerCase() !== user.email?.toLowerCase() || typeof profile.sub !== 'string' ||
          !profile.sub || !eligible(user, allowed)) {
          return { error: 'membership_unavailable', errorDescription: 'Membership sign-in is unavailable.' };
        }
      }
    },
    session: {
      modelName: 'membership_auth_session', expiresIn: MEMBERSHIP_SESSION_SECONDS,
      freshAge: 15 * 60, disableSessionRefresh: true, cookieCache: { enabled: false }
    },
    account: {
      modelName: 'membership_auth_account', accountLinking: { enabled: false },
      encryptOAuthTokens: true, storeAccountCookie: false,
      storeStateStrategy: 'database', skipStateCookieCheck: false
    },
    verification: { modelName: 'membership_auth_verification', storeIdentifier: 'hashed' },
    // Requests supplied to the library omit connection headers. Its database
    // limiter therefore uses one shared anonymous bucket per path, not identity
    // tracking. The outer Worker has separate global admission controls.
    rateLimit: {
      enabled: true, storage: 'database', modelName: 'membership_auth_rate_limit', window: 60, max: 60,
      customRules: {
        '/sign-in/social': { window: 60, max: 10 },
        '/callback/google': { window: 60, max: 20 },
        '/sign-out': { window: 60, max: 30 }
      }
    },
    advanced: {
      // Better Auth otherwise prefixes __Secure- before our name. Disable only
      // that automatic name prefix; force the actual Secure attribute below.
      // Genuine __Host- cookies prohibit Domain and require Secure + Path=/.
      useSecureCookies: false,
      cookiePrefix: COOKIE_PREFIX,
      defaultCookieAttributes: { secure: true, httpOnly: true, sameSite: 'lax', path: '/' },
      crossSubDomainCookies: { enabled: false },
      ipAddress: { ipAddressHeaders: [] },
      trustedProxyHeaders: false,
      disableCSRFCheck: false, disableOriginCheck: false
    },
    databaseHooks: {
      user: {
        create: { before: async data => eligible(data, allowed) ? { data: { ...data, name: 'Teacher member', image: null } } : false },
        update: { before: async data => ({ data: { ...data, name: 'Teacher member', image: null } }) }
      },
      account: { create: { before: async data => stripTokens(data) }, update: { before: async data => stripTokens(data) } },
      session: { create: { before: async data => ({ data: { ...data, ipAddress: null, userAgent: null } }) } }
    },
    disabledPaths: [
      '/sign-up/email', '/sign-in/email', '/change-email', '/change-password', '/set-password',
      '/request-password-reset', '/reset-password', '/update-user', '/delete-user', '/link-social',
      '/unlink-account', '/get-access-token', '/refresh-token', '/list-accounts', '/list-sessions',
      '/revoke-session', '/revoke-sessions', '/revoke-other-sessions'
    ]
  };
}

export function createMembershipAuth(env) {
  if (!env || typeof env !== 'object') throw new Error('membership_auth_unconfigured');
  let auth = instances.get(env);
  if (!auth) { auth = betterAuth(membershipAuthOptions(env)); instances.set(env, auth); }
  return auth;
}

function minimalHeaders(request) {
  const headers = new Headers();
  const cookie = request.headers.get('Cookie');
  if (cookie && cookie.length <= 8192) {
    const ownCookies = cookie.split(';').map(value => value.trim()).filter(value => value.startsWith(COOKIE_PREFIX + '.') && value.includes('='));
    if (ownCookies.length) headers.set('Cookie', ownCookies.join('; '));
  }
  for (const name of ['Origin', 'Content-Type', 'Sec-Fetch-Site', 'Sec-Fetch-Mode', 'Sec-Fetch-Dest']) {
    const value = request.headers.get(name); if (value !== null) headers.set(name, value);
  }
  return headers;
}

/** Always validates against server storage; cookie cache, bearer tokens and
 * user-supplied account IDs cannot grant paid access. Allowlist changes revoke
 * access immediately even when an old authenticated session still exists. */
export async function getAdultSession(request, env, { authFactory = createMembershipAuth, now = Date.now } = {}) {
  const url = new URL(request.url);
  if (url.origin !== MEMBERSHIP_ORIGIN || request.headers.has('Authorization')) return null;
  const cookie = request.headers.get('Cookie');
  if (!cookie || cookie.length > 8192) return null;
  const sessionCookies = cookie.split(';').filter(part => part.trim().startsWith(SESSION_COOKIE + '='));
  if (sessionCookies.length !== 1) return null;
  const auth = authFactory(env);
  const result = await auth.api.getSession({ headers: new Headers({ Cookie: sessionCookies[0].trim() }), query: { disableCookieCache: true } });
  if (!eligible(result?.user, membershipAllowedEmails(env.MEMBERSHIP_ALLOWED_EMAILS))) return null;
  const { user, session } = result;
  const created = new Date(session?.createdAt).getTime(), expires = new Date(session?.expiresAt).getTime();
  if (typeof session?.id !== 'string' || !session.id || session.id.length > 200 || typeof user.id !== 'string' || !user.id ||
    !Number.isFinite(created) || !Number.isFinite(expires) || created > now() || expires <= now() ||
    now() - created >= MEMBERSHIP_SESSION_SECONDS * 1000) return null;
  return { user: { id: user.id, email: user.email, emailVerified: true },
    session: { id: session.id, createdAt: new Date(created), expiresAt: new Date(expires) } };
}

/** Owner access is an optional private server configuration, never a session
 * role supplied by a browser. Call only after getAdultSession validates its
 * signed cookie. Re-read the current linked Google account, verified user and
 * session together before each owner grant; no identity or result is cached. */
export async function getOwnerLabAccess(session, env, { now = Date.now } = {}) {
  const emailSetting = env?.MEMBERSHIP_OWNER_EMAIL;
  const subjectSetting = env?.MEMBERSHIP_OWNER_GOOGLE_SUBJECT;
  if (emailSetting === undefined && subjectSetting === undefined) return false;
  const ownerEmails = membershipAllowedEmails(emailSetting);
  if (ownerEmails.size !== 1 || typeof emailSetting !== 'string' || /[,\n]/u.test(emailSetting) ||
    emailSetting !== emailSetting.trim() || typeof subjectSetting !== 'string' ||
    !/^[A-Za-z0-9_-]{1,255}$/u.test(subjectSetting)) throw new MembershipError(503);
  const email = [...ownerEmails][0];
  if (typeof session?.user?.email !== 'string' || session.user.email.toLowerCase() !== email) return false;
  // A configured owner candidate with an invalid binding must fail closed,
  // rather than falling through into customer/payment processing.
  if (session.user.emailVerified !== true || !membershipAllowedEmails(env.MEMBERSHIP_ALLOWED_EMAILS).has(email) ||
    typeof session.user.id !== 'string' || !session.user.id || session.user.id.length > 200 ||
    typeof session.session?.id !== 'string' || !session.session.id || session.session.id.length > 200 ||
    typeof env.MEMBERSHIP_DB?.prepare !== 'function') throw new MembershipError(403);
  const result = await env.MEMBERSHIP_DB.prepare(`SELECT a.accountId, a.providerId, u.email, u.emailVerified,
    s.id AS sessionId, s.createdAt, s.expiresAt
    FROM membership_auth_account AS a
    JOIN membership_auth_user AS u ON u.id = a.userId
    JOIN membership_auth_session AS s ON s.userId = u.id
    WHERE a.userId = ? AND a.providerId = 'google' AND s.id = ? LIMIT 2`)
    .bind(session.user.id, session.session.id).all();
  if (result?.success !== true || !Array.isArray(result.results)) throw new MembershipError(503);
  const identity = result.results[0], selectedNow = now();
  const created = new Date(identity?.createdAt).getTime(), expires = new Date(identity?.expiresAt).getTime();
  if (result.results.length !== 1 || identity.providerId !== 'google' || identity.accountId !== subjectSetting ||
    typeof identity.email !== 'string' || identity.email.toLowerCase() !== email || identity.emailVerified !== 1 ||
    identity.sessionId !== session.session.id || !Number.isFinite(created) || !Number.isFinite(expires) ||
    created > selectedNow || expires <= selectedNow || selectedNow - created >= MEMBERSHIP_SESSION_SECONDS * 1000) {
    throw new MembershipError(403);
  }
  return true;
}

async function boundedAuthJson(request, maxBytes = 512) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(request.headers.get('Content-Type') || '') ||
    request.headers.has('Content-Encoding')) return null;
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > maxBytes)) return null;
  const reader = request.body?.getReader(); if (!reader) return null;
  let timer, size = 0, raw = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 2000); });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]); if (done) break;
      size += value.byteLength; if (size > maxBytes) throw new Error('oversized'); raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode(); const body = JSON.parse(raw);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { void reader.cancel().catch(() => {}); return null; }
  finally { clearTimeout(timer); reader.releaseLock(); }
}

/** Only these three library endpoints are externally reachable. Ordinary login
 * cannot enroll arbitrary identities; the verified OAuth identity must also be
 * independently approved in the operator allowlist before storage or access. */
export async function handleMembershipAuth(request, env, { authFactory = createMembershipAuth } = {}) {
  try {
    const url = new URL(request.url), expected = AUTH_ROUTES.get(url.pathname);
    if (url.origin !== MEMBERSHIP_ORIGIN || !expected || request.method !== expected || url.hash ||
      url.username || url.password || request.headers.has('Authorization') || request.signal.aborted) return fail();
    if (request.method === 'POST' && (url.search || !sameOrigin(request))) return fail();
    if (url.pathname === '/api/auth/callback/google') {
      if (url.search.length > 8192 || !url.searchParams.get('state') ||
        [...url.searchParams.keys()].some(key => !['code', 'state', 'error', 'error_description', 'error_uri', 'scope', 'authuser', 'prompt', 'iss'].includes(key)) ||
        [...new Set(url.searchParams.keys())].some(key => url.searchParams.getAll(key).length !== 1)) return fail();
    }
    let body;
    if (url.pathname === '/api/auth/sign-in/social') {
      const supplied = await boundedAuthJson(request);
      if (!supplied || Object.keys(supplied).sort().join(',') !== 'adultConfirmed,provider' ||
        supplied.provider !== 'google' || supplied.adultConfirmed !== true) return fail(400);
      body = JSON.stringify({ provider: 'google', callbackURL: MEMBERSHIP_ORIGIN + '/',
        newUserCallbackURL: MEMBERSHIP_ORIGIN + '/', errorCallbackURL: MEMBERSHIP_ORIGIN + '/', disableRedirect: true });
    } else if (request.method === 'POST') {
      // Sign-out accepts no caller-controlled settings or redirect destination.
      const supplied = await boundedAuthJson(request, 2);
      if (!supplied || Object.keys(supplied).length) return fail(400);
      body = '{}';
    }
    const headers = minimalHeaders(request);
    if (request.method === 'POST') headers.set('Content-Type', 'application/json');
    const forwarded = new Request(request.url, { method: request.method, headers, signal: request.signal, ...(body ? { body } : {}) });
    const result = await authFactory(env).handler(forwarded);
    if (result.status >= 400) { void result.body?.cancel().catch(() => {}); return fail(result.status === 429 ? 429 : result.status < 500 ? 403 : 503); }
    if (url.pathname === '/api/auth/callback/google' && result.headers.has('Location')) {
      // Neither provider errors nor user-controlled return URLs become public
      // details. Both successful and unsuccessful callbacks return to the one
      // fixed adult portal; the UI learns sign-in status from the session API.
      const resultHeaders = new Headers(result.headers); resultHeaders.set('Location', MEMBERSHIP_ORIGIN + '/');
      return new Response(null, { status: 303, headers: resultHeaders });
    }
    return result;
  } catch { return fail(503); }
}
