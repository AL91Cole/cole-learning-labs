/**
 * Same-origin gateway to the optional real-machine terminal service.
 *
 * The site keeps a strict Content-Security-Policy (connect-src 'self'), so the
 * browser talks to https://<site>/terminal/* and this function relays those
 * requests, WebSocket upgrades included, to the controller behind
 * TERMINAL_ORIGIN (a Cloudflare Tunnel hostname such as
 * https://terminal.colelearninglabs.com). With TERMINAL_ORIGIN unset or invalid
 * every request answers 503, which the site reads as "no real machines", so the
 * guided labs keep their simulated desktop.
 *
 * Only the controller's public routes are reachable: the session and screen
 * WebSockets, the health and lab listings, and the terminal and screen client
 * assets. Cookies and Cloudflare headers are
 * never forwarded; only the request headers the controller needs are.
 */
const PATHS = /^\/(ws|desktop|api\/health|api\/labs|vendor\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*)$/;
const FORWARDED = ['accept', 'accept-encoding', 'origin', 'upgrade', 'connection', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-protocol', 'sec-websocket-extensions', 'if-none-match'];
const RESPONSE_HEADERS = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified', 'vary'];

const unavailable = (status, error) => new Response(JSON.stringify({ error }), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Cross-Origin-Resource-Policy': 'same-origin'
  }
});

/** The controller origin from the environment, or null when unset or not a bare https origin. */
export function terminalOrigin(env) {
  const value = typeof env?.TERMINAL_ORIGIN === 'string' ? env.TERMINAL_ORIGIN.trim() : '';
  if (!value || value.length > 253 + 8) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/' || url.origin !== value.replace(/\/$/, '')) return null;
  return url.origin;
}

/** Relays one request under /terminal/ to the controller. Exported for tests; `fetch` is injectable. */
export async function proxyTerminal(request, env, { fetch: fetchImpl = globalThis.fetch } = {}) {
  const origin = terminalOrigin(env);
  if (!origin) return unavailable(503, 'terminal_unavailable');
  if (request.method !== 'GET' && request.method !== 'HEAD') return unavailable(405, 'method_not_allowed');
  let url;
  try { url = new URL(request.url); } catch { return unavailable(400, 'invalid_url'); }
  if (url.search) return unavailable(400, 'query_not_allowed');
  if (!url.pathname.startsWith('/terminal/')) return unavailable(404, 'not_found');
  const path = url.pathname.slice('/terminal'.length);
  if (!PATHS.test(path)) return unavailable(404, 'not_found');
  const headers = new Headers();
  for (const name of FORWARDED) { const value = request.headers.get(name); if (value !== null) headers.set(name, value); }
  const websocket = (request.headers.get('upgrade') || '').toLowerCase() === 'websocket';
  const socketPath = path === '/ws' || path === '/desktop';
  if (websocket && !socketPath) return unavailable(400, 'upgrade_not_allowed');
  if (socketPath && !websocket) return unavailable(426, 'upgrade_required');
  let upstream;
  try {
    upstream = await fetchImpl(origin + path, { method: request.method, headers, redirect: 'manual' });
  } catch {
    return unavailable(502, 'terminal_unreachable');
  }
  // A completed upgrade carries the socket; it must go back to the browser untouched.
  if (websocket) return upstream.status === 101 ? upstream : unavailable(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502, 'upgrade_failed');
  const responseHeaders = new Headers({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin' });
  for (const name of RESPONSE_HEADERS) { const value = upstream.headers.get(name); if (value !== null) responseHeaders.set(name, value); }
  if (!responseHeaders.has('cache-control')) responseHeaders.set('Cache-Control', path.startsWith('/vendor/') ? 'public, max-age=86400' : 'no-store, private');
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const onRequest = context => proxyTerminal(context.request, context.env);
