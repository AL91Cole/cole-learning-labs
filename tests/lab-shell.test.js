import test from 'node:test';
import assert from 'node:assert/strict';
import {createLabShell, labFiles, labTools, LAB_DIR} from '../src/lab-shell.js';
import {SCENARIOS} from '../src/scenarios.js';
import {labFormat} from '../src/lab-format.js';
import {initialWorkspaceState, applyWorkspaceAction, workspaceDiagnostic} from '../src/workspaces.js';
import {codingStarter} from '../src/coding-lab.js';

const byId = id => SCENARIOS.find(item => item.id === id);
function session(id) {
  const scenario = byId(id); let state = initialWorkspaceState(id); const actions = [];
  const shell = createLabShell(scenario, {getState:() => state, action:(action, value) => {actions.push(action); const result = applyWorkspaceAction(id, state, action, value); state = result.state; return result;}});
  return {scenario, shell, actions, state:() => state};
}

test('every guided lab exposes its practice tools and a readable lab folder', () => {
  for (const scenario of SCENARIOS.filter(item => labFormat(item).guide)) {
    const files = labFiles(scenario, initialWorkspaceState(scenario.id));
    assert.ok(files.has(LAB_DIR + '/README.txt'), scenario.id);
    for (const clue of scenario.clues) assert.ok(files.has(LAB_DIR + '/resources/' + clue.id + '.txt'), scenario.id + ' ' + clue.id);
    if (scenario.track === 'coding') {assert.ok(files.has(LAB_DIR + '/program.js') && files.has(LAB_DIR + '/fixtures.txt') && files.has(LAB_DIR + '/check'), scenario.id); assert.equal(files.get(LAB_DIR + '/program.js').writable, true);}
    else {assert.ok(labTools(scenario.id).length >= 2, scenario.id + ' has tools'); assert.ok(files.has(LAB_DIR + '/settings.txt') && files.has(LAB_DIR + '/tools.txt'), scenario.id); for (const file of files.values()) assert.equal(file.writable, false);}
    for (const tool of labTools(scenario.id)) assert.ok(!/outside this simulation|not available/.test(workspaceDiagnostic(scenario.id, initialWorkspaceState(scenario.id), tool)), scenario.id + ': ' + tool + ' is a real practice tool');
  }
});

test('basic navigation and reading work like a small Linux machine', () => {
  const {shell} = session('CODE-501');
  assert.equal(shell.prompt(), 'student@lab-pc:~/lab$');
  assert.equal(shell.run('pwd').output, '/home/student/lab');
  assert.equal(shell.run('ls').output, 'README.txt  check  fixtures.txt  program.js  resources/');
  assert.match(shell.run('cat README.txt').output, /CODE-501 · The Supply Calculator[\s\S]*GOAL/);
  assert.match(shell.run('cat resources/price.txt').output, /3 credits/);
  assert.equal(shell.run('cd resources').output, ''); assert.equal(shell.prompt(), 'student@lab-pc:~/lab/resources$');
  assert.equal(shell.run('ls').output, 'fixtures.txt  input.txt  price.txt');
  assert.equal(shell.run('cd ..').output, ''); assert.equal(shell.run('cd').output, ''); assert.equal(shell.run('pwd').output, '/home/student');
  assert.match(shell.run('cat nothing.txt').output, /No such file/);
  assert.match(shell.run('frobnicate').output, /command not found/);
  assert.equal(shell.run('frobnicate').kind, 'warning');
  assert.match(shell.run('ls -l lab').output, /-rw-r--r--.*program\.js/);
  assert.equal(shell.run('whoami').output, 'student'); assert.equal(shell.run('hostname').output, 'lab-pc');
  assert.deepEqual(shell.run('clear'), {output:'', kind:'info', clear:true});
  assert.match(shell.run('history').output, /\d+  pwd/);
  assert.match(shell.run('man cat').output, /Prints a file/);
  assert.match(shell.run('rm program.js').output, /managed for you/);
  assert.match(shell.run('curl example.test').output, /No real network/);
});

test('coding labs run the saved program with one input, run every fixture, and open the editor', () => {
  const {shell, actions, state} = session('CODE-501');
  const starter = codingStarter('CODE-501', 'javascript');
  assert.equal(shell.run('cat program.js').output, starter);
  assert.match(shell.run('cat fixtures.txt').output, /quantity = 2  →  expected: 6/);
  assert.match(shell.run('node program.js 2').output, /^5\n\(expected: 6\)$/);
  assert.match(shell.run('python3 program.py 2').output, /saved program is program\.js/);
  assert.match(shell.run('node program.js many').output, /whole-number input/);
  const checked = shell.run('./check');
  assert.deepEqual(actions, ['run-check']); assert.equal(checked.kind, 'warning'); assert.match(checked.output, /FAIL  quantity = 2/);
  assert.deepEqual(shell.run('nano program.js').open, {app:'editor', path:LAB_DIR + '/program.js'});
  assert.deepEqual(shell.run('console').open, {app:'console'});
  assert.deepEqual(shell.run('open files').open, {app:'files'});
  const fixed = applyWorkspaceAction('CODE-501', state(), 'save-code', {code:'let total = quantity * 3;\nprint(total);'}).state;
  const {shell:passing} = (() => {let current = fixed; return {shell:createLabShell(byId('CODE-501'), {getState:() => current, action:(action, value) => {const result = applyWorkspaceAction('CODE-501', current, action, value); current = result.state; return result;}})};})();
  assert.match(passing.run('node program.js 5').output, /^15\n\(matches the expected output for quantity = 5\)$/);
  const pass = passing.run('make test'); assert.equal(pass.kind, 'success'); assert.match(pass.output, /PASS  quantity = 0/);
  assert.match(shell.run('ip addr').output, /command not found/, 'network commands belong to the network lab');
});

test('network labs run their diagnostic tools verbatim and NET-201 accepts realistic ip and DNS commands', () => {
  const {shell, actions, state} = session('NET-201');
  const tool = shell.run('ipconfig');
  assert.equal(tool.tool, true); assert.deepEqual(actions, ['inspect-command']); assert.match(tool.output, /192\.168\.1\.25/);
  assert.match(shell.run('ping').output, /Try the full tool name: ping 10\.24\.8\.1/);
  assert.match(shell.run('sudo ping 10.24.8.1').output, /./);
  assert.match(shell.run('ip addr').output, /inet 192\.168\.1\.25 netmask 255\.255\.255\.0/);
  const set = shell.run('sudo ip addr add 10.24.8.25/24 dev eth0');
  assert.equal(set.kind, 'info'); assert.equal(state().ip, '10.24.8.25'); assert.equal(state().mask, '255.255.255.0');
  shell.run('ip route add default via 10.24.8.1'); assert.equal(state().gateway, '10.24.8.1');
  shell.run('resolvectl dns eth0 10.24.8.53'); assert.equal(state().dns, '10.24.8.53');
  shell.run('echo nameserver 10.24.8.54 > /etc/resolv.conf'); assert.equal(state().dns, '10.24.8.54');
  assert.match(shell.run('ip addr add 999.1.1.1/24 dev eth0').output, /Invalid IPv4|use ip addr add/);
  assert.match(shell.run('cat settings.txt').output, /ip: 10\.24\.8\.25/);
  assert.match(shell.run('./check').output, /command not found/, 'coding commands belong to the coding labs');
  const {shell:security} = session('SEC-401');
  assert.match(security.run('ip addr').output, /command not found/);
  assert.match(security.run('inspect sender').output, /./); assert.equal(security.run('inspect sender').tool, true);
});

test('input is bounded and history is capped', () => {
  const {shell} = session('CODE-502');
  assert.equal(shell.run(42).kind, 'warning');
  assert.equal(shell.run('   ').output, '');
  for (let index = 0; index < 60; index++) shell.run('pwd');
  assert.equal(shell.history().length, 50);
  assert.ok(shell.run('echo ' + 'x'.repeat(500)).output.length <= 240);
});
