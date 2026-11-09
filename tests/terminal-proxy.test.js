import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyTerminal, terminalOrigin, onRequest } from '../functions/terminal/[[path]].js';

const ENV = { TERMINAL_ORIGIN: 'https://terminal.example.test' };
const SITE = 'https://labs.example.test';
const request = (path, { method = 'GET', headers = {} } = {}) => new Request(SITE + path, { method, headers });
function recorder(reply = () => new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain', 'Set-Cookie': 'leak=1', 'Cache-Control': 'public, max-age=60' } })) {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, init }); return reply(url, init); };
  return { calls, fetch };
}

test('the controller origin must be a bare https origin', () => {
  assert.equal(terminalOrigin(ENV), 'https://terminal.example.test');
  assert.equal(terminalOrigin({ TERMINAL_ORIGIN: 'https://terminal.example.test/' }), 'https://terminal.example.test');
  for (const bad of [undefined, '', 'http://terminal.example.test', 'https://user:pw@terminal.example.test', 'https://terminal.example.test:8443', 'https://terminal.example.test/path', 'https://terminal.example.test?x=1', 'terminal.example.test', 'wss://terminal.example.test'])
    assert.equal(terminalOrigin({ TERMINAL_ORIGIN: bad }), null, String(bad));
});

test('without a configured controller every request answers 503 and nothing is fetched', async () => {
  const upstream = recorder();
  for (const path of ['/terminal/api/health', '/terminal/ws', '/terminal/vendor/xterm/xterm.js']) {
    const response = await proxyTerminal(request(path), {}, { fetch: upstream.fetch });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'terminal_unavailable' });
    assert.equal(response.headers.get('Cache-Control'), 'no-store, private');
  }
  assert.equal(upstream.calls.length, 0);
});

test('only the controller public routes are relayed, with a header safelist and no cookies', async () => {
  const upstream = recorder();
  const response = await proxyTerminal(request('/terminal/api/health', { headers: { Cookie: 'session=secret', 'CF-Connecting-IP': '203.0.113.9', Accept: 'application/json', 'X-Forwarded-Proto': 'http' } }), ENV, { fetch: upstream.fetch });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ok');
  assert.equal(upstream.calls.length, 1);
  assert.equal(upstream.calls[0].url, 'https://terminal.example.test/api/health');
  assert.equal(upstream.calls[0].init.redirect, 'manual');
  const sent = upstream.calls[0].init.headers;
  assert.equal(sent.get('accept'), 'application/json');
  assert.equal(sent.get('cookie'), null);
  assert.equal(sent.get('cf-connecting-ip'), null);
  assert.equal(sent.get('x-forwarded-proto'), null);
  assert.equal(response.headers.get('Set-Cookie'), null, 'upstream cookies never reach the browser');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=60');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');

  for (const [path, status] of [['/terminal/api/teacher', 404], ['/terminal/../api/health', 404], ['/terminal/vendor/../server.js', 404], ['/terminal/vendor/xterm/x%2e%2e/y', 404], ['/terminal', 404], ['/terminal/api/health?x=1', 400]]) {
    const refused = await proxyTerminal(new Request(SITE + path), ENV, { fetch: upstream.fetch });
    assert.equal(refused.status, status, path);
  }
  assert.equal((await proxyTerminal(request('/terminal/api/health', { method: 'POST' }), ENV, { fetch: upstream.fetch })).status, 405);
  assert.equal((await proxyTerminal(request('/terminal/ws'), ENV, { fetch: upstream.fetch })).status, 426, 'the socket path needs an upgrade');
  assert.equal(upstream.calls.length, 1, 'refused requests never reach the controller');
});

test('xterm assets get a day of caching when the controller sets none, and HEAD carries no body', async () => {
  const upstream = recorder(() => new Response('js', { status: 200, headers: { 'Content-Type': 'text/javascript' } }));
  const response = await proxyTerminal(request('/terminal/vendor/xterm/xterm.js'), ENV, { fetch: upstream.fetch });
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=86400');
  assert.equal(upstream.calls[0].url, 'https://terminal.example.test/vendor/xterm/xterm.js');
  const head = await proxyTerminal(request('/terminal/vendor/xterm/xterm.js', { method: 'HEAD' }), ENV, { fetch: upstream.fetch });
  assert.equal(head.body, null);
});

test('a WebSocket upgrade is forwarded with the browser origin and the completed upgrade is returned untouched', async () => {
  const socketResponse = { status: 101, headers: new Headers(), webSocket: { marker: true } };
  const upstream = recorder(() => socketResponse);
  const headers = { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Key': 'abc', 'Sec-WebSocket-Version': '13', Origin: SITE, Cookie: 'no' };
  const response = await proxyTerminal(request('/terminal/ws', { headers }), ENV, { fetch: upstream.fetch });
  assert.equal(response, socketResponse, 'the upgrade response object is passed through so the socket survives');
  const sent = upstream.calls[0].init.headers;
  assert.equal(upstream.calls[0].url, 'https://terminal.example.test/ws');
  assert.equal(sent.get('origin'), SITE);
  assert.equal(sent.get('upgrade'), 'websocket');
  assert.equal(sent.get('sec-websocket-key'), 'abc');
  assert.equal(sent.get('cookie'), null);
  assert.equal((await proxyTerminal(request('/terminal/api/health', { headers: { Upgrade: 'websocket' } }), ENV, { fetch: upstream.fetch })).status, 400, 'upgrades go only to the socket path');
  const refusedUpstream = recorder(() => new Response('denied', { status: 403 }));
  const refused = await proxyTerminal(request('/terminal/ws', { headers }), ENV, { fetch: refusedUpstream.fetch });
  assert.equal(refused.status, 403);
  assert.deepEqual(await refused.json(), { error: 'upgrade_failed' });
  const down = recorder(() => { throw new Error('connect failed'); });
  assert.equal((await proxyTerminal(request('/terminal/api/health'), ENV, { fetch: down.fetch })).status, 502);
});

test('the Pages entry point reads the request and environment from its context', async () => {
  const response = await onRequest({ request: request('/terminal/api/health'), env: {} });
  assert.equal(response.status, 503);
});
