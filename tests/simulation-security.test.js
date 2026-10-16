import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/scenarios.js';
import { initialHardwareState, normalizeHardwareState, applyHardwareAction, renderHardware } from '../src/hardware.js';
import { initialWorkspaceState, normalizeWorkspaceState, applyWorkspaceAction, renderWorkspace, verifyWorkspace } from '../src/workspaces.js';

const markup = '<img src=x onerror="window.__labPayload=1">';
function captureRoot() {
  return { ownerDocument:{activeElement:null}, contains:()=>false, querySelector:()=>null, querySelectorAll:()=>[], innerHTML:'' };
}
function workspaceHtml(id, state) {
  const root = captureRoot();
  renderWorkspace(root, SCENARIOS.find(scenario => scenario.id === id), state, () => {});
  return root.innerHTML;
}

test('malformed saved evidence cannot insert HTML into a hardware workbench', () => {
  const saved = { ...initialHardwareState('INC-103'), evidence:{length:markup}, selectedPart:'constructor', actions:{} };
  const before = structuredClone(saved);
  const root = captureRoot();
  renderHardware(root, 'INC-103', saved, () => {});
  assert.deepEqual(saved, before);
  assert.equal(root.innerHTML.includes(markup), false);
  assert.deepEqual(normalizeHardwareState('INC-103', saved).evidence, []);
  assert.equal(normalizeHardwareState('INC-103', saved).selectedPart, 'ram');
  assert.doesNotThrow(() => applyHardwareAction('INC-103', saved, 'inspect-ram'));
});

test('saved HTTP status is a numeric allowlist and cannot become response markup', () => {
  const state = { ...initialWorkspaceState('SEC-403'), response:{status:markup,id:'102',body:'Example'} };
  assert.equal(normalizeWorkspaceState('SEC-403', state).response, null);
  assert.equal(workspaceHtml('SEC-403', state).includes(markup), false);
});

test('fictional response text and history remain escaped even with HTML-shaped saved values', () => {
  const state = { ...initialWorkspaceState('SEC-403'), response:{status:200,id:'101',body:markup}, history:[markup] };
  const html = workspaceHtml('SEC-403', state);
  assert.equal(html.includes(markup), false);
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('HTTP 200'));
});

test('saved network input and revised prompt cannot break out of their form controls', () => {
  const network = { ...initialWorkspaceState('NET-201'), ip:'" autofocus onfocus="payload()' };
  const networkHtml = workspaceHtml('NET-201', network);
  assert.ok(networkHtml.includes('&quot; autofocus onfocus=&quot;payload()'));
  assert.equal(networkHtml.includes('value="" autofocus'), false);

  const prompt = { ...initialWorkspaceState('AI-301'), prompt:`</textarea>${markup}` };
  const promptHtml = workspaceHtml('AI-301', prompt);
  assert.equal(promptHtml.includes(markup), false);
  assert.ok(promptHtml.includes('&lt;/textarea&gt;'));
});

test('string booleans cannot bypass hardware safety or acknowledge security scope', () => {
  const hardware = normalizeHardwareState('INC-103', { pcOn:'false', acConnected:'false', ramSeated:'true' });
  assert.equal(hardware.pcOn, true);
  assert.equal(hardware.acConnected, true);
  assert.equal(hardware.ramSeated, false);
  assert.equal(applyHardwareAction('INC-103', hardware, 'seat-ram').kind, 'warning');

  const workspace = normalizeWorkspaceState('SEC-403', { scope:'true', tested:'true', observed:'true' });
  assert.equal(workspace.scope, false);
  assert.equal(workspace.tested, false);
  assert.equal(workspace.observed, false);
  assert.equal(applyWorkspaceAction('SEC-403', workspace, 'acknowledge-scope', 'true').state.scope, false);
  assert.equal(applyWorkspaceAction('SEC-403', workspace, 'fetch-record', '102').kind, 'warning');
});

test('unknown and prototype-shaped fields are discarded without changing object prototypes', () => {
  const malicious = JSON.parse('{"__proto__":{"labPolluted":true},"constructor":{"prototype":{"labPolluted":true}},"prototype":{"labPolluted":true},"scope":false,"pcOn":true}');
  for (const state of [normalizeHardwareState('INC-103', malicious), normalizeWorkspaceState('SEC-403', malicious)]) {
    assert.equal(Object.getPrototypeOf(state), Object.prototype);
    assert.equal(Object.hasOwn(state, '__proto__'), false);
    assert.equal(Object.hasOwn(state, 'constructor'), false);
    assert.equal(Object.hasOwn(state, 'prototype'), false);
    assert.equal(state.labPolluted, undefined);
  }
  assert.equal({}.labPolluted, undefined);
  assert.equal(normalizeHardwareState('constructor', malicious).caseId, 'INC-101');
});

test('wrong saved array types recover to safe defaults instead of crashing the workspaces', () => {
  const malformed = [
    ['AI-302', {claims:{length:3},tested:true,results:markup}],
    ['SEC-401', {flags:markup,tested:true}],
    ['SEC-402', {events:{includes:true},tested:true}],
    ['SEC-403', {history:markup,response:[],tested:true}]
  ];
  for (const [id, extra] of malformed) {
    const state = { ...initialWorkspaceState(id), ...extra };
    assert.doesNotThrow(() => workspaceHtml(id, state), id);
    assert.equal(verifyWorkspace(id, state).ok, false, id);
  }
});

test('normalizers bound stored text, histories, counters, and event collections', () => {
  const hardware = normalizeHardwareState('INC-103', { actions:Array(600).fill('inspect-ram'), evidence:['ram','ram',markup], bootCount:Infinity });
  assert.equal(hardware.actions.length, 250);
  assert.deepEqual(hardware.evidence, ['ram']);
  assert.equal(hardware.bootCount, 0);

  const workspace = normalizeWorkspaceState('SEC-403', { history:Array(50).fill('x'.repeat(500)), response:{status:403,id:'102',body:'x'.repeat(5000)}, checkRuns:Infinity, workspaceEdits:9e8 });
  assert.equal(workspace.history.length, 8);
  assert.ok(workspace.history.every(line => line.length <= 300));
  assert.equal(workspace.response.body.length, 2000);
  assert.equal(workspace.checkRuns, 0);
  assert.equal(workspace.workspaceEdits, 1000000);
  assert.equal(normalizeWorkspaceState('AI-301', {prompt:'x'.repeat(5000)}).prompt.length, 3000);
  assert.equal(normalizeWorkspaceState('NET-201', {ip:'x'.repeat(1000)}).ip.length, 64);
});

test('legacy successful settings survive normalization while saved result labels are regenerated', () => {
  const legacy = { ip:'10.24.8.25', mask:'255.255.255.0', gateway:'10.24.8.1', dns:'10.24.8.53', tested:true, results:[{ok:true,label:markup}] };
  const before = structuredClone(legacy);
  const normalized = normalizeWorkspaceState('NET-201', legacy);
  assert.deepEqual(legacy, before);
  assert.equal(verifyWorkspace('NET-201', normalized).ok, true);
  assert.equal(normalized.checkRuns, 0);
  assert.equal(normalized.results.length, 3);
  assert.ok(normalized.results.every(result => result.ok && !result.label.includes(markup)));
});
