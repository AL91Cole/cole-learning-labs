import test from 'node:test';
import assert from 'node:assert/strict';
import {CODING_SCENARIOS,supportsCodingLab,executeCoding,initialCodingState,normalizeCodingState,applyCodingAction,verifyCoding,getCodingMission,renderCoding,codingDiagnostic} from '../src/coding-lab.js';

const solutions={
  'CODE-501':'let total = quantity * 3;\nprint(total);',
  'CODE-502':'if (temperature < 20) { print("Heating"); } else { if (temperature <= 25) { print("Comfortable"); } else { print("Cooling"); } }',
  'CODE-503':'let station = 1;\nrepeat(stations) { print("Ready " + station); station = station + 1; }'
};
const run=(id,source)=>applyCodingAction(id,initialCodingState(id),'run-check',{code:source}).state;

test('three coding cases expose changing inputs without student identifiers or teacher rubrics',()=>{
  assert.equal(CODING_SCENARIOS.length,3);
  for(const scenario of CODING_SCENARIOS) {
    assert.equal(scenario.track,'coding');assert.ok(supportsCodingLab(scenario.id));
    assert.equal(scenario.clues.length,3);assert.equal(scenario.questions.length,2);
    assert.ok(scenario.interviewFacts.length>=2);assert.ok(!Object.hasOwn(scenario,'rubric'));
    assert.equal(verifyCoding(scenario.id,initialCodingState(scenario.id)).ok,false);
  }
  assert.equal(supportsCodingLab('CODE-599'),false);
});

for(const id of Object.keys(solutions)) {
  test(id+' starter produces real failing fixture results',()=>{
    const initial=initialCodingState(id),state=run(id,initial.code);
    assert.equal(state.tested,true);assert.ok(state.results.some(result=>!result.ok));
    assert.equal(state.checkRuns,1);assert.equal(verifyCoding(id,state).ok,false);
  });
  test(id+' solution passes every changing fixture and current-task verification',()=>{
    const state=run(id,solutions[id]),mission=getCodingMission(id,state);
    assert.ok(state.results.length>=3);assert.ok(state.results.every(result=>result.ok));
    assert.equal(verifyCoding(id,state).ok,true);assert.equal(mission.complete,true);
    assert.equal(mission.passed,mission.total);assert.equal(mission.stage,'Verified');
  });
  test(id+' hardcoded output cannot pass all fixtures',()=>{
    const fixed=id==='CODE-501'?'print(6);':id==='CODE-502'?'print("Heating");':'print("Ready 1");';
    const state=run(id,fixed);assert.ok(state.results.some(result=>result.ok));assert.equal(verifyCoding(id,state).ok,false);
  });
}

test('arithmetic precedence, parentheses, string concatenation, assignments and console.log work',()=>{
  const result=executeCoding('let score = (2 + 3) * 4; score = score - 1; console.log("Score " + score); print(10 % 3);');
  assert.equal(result.ok,true);assert.deepEqual(result.output,['Score 19','1']);
});
test('decisions, strict equality, short-circuit conditions and bounded repeat use evaluated values',()=>{
  const result=executeCoding('let count = 1; repeat(3) { if (count >= 2 && count != 4) { print(count); } else { print("First"); } count = count + 1; } print("2" == 2); if (false && missing) { print("Never"); }');
  assert.equal(result.ok,true);assert.deepEqual(result.output,['First','2','3','false']);
});
test('comments and allowed string escapes do not expose capabilities',()=>{
  const result=executeCoding('// fetch and while are comments, not capabilities\nprint("fetch\\ttext"); print("\\\"quoted\\\"");');
  assert.equal(result.ok,true);assert.deepEqual(result.output,['fetch\ttext','"quoted"']);
});
test('syntax diagnostics identify source lines and missing statement punctuation',()=>{
  const result=executeCoding('let first = 1;\nprint(first)\n');
  assert.equal(result.ok,false);assert.equal(result.error.line,3);assert.match(result.error.message,/Expected.*;/);
  assert.match(executeCoding('print("unfinished);').error.message,/closing quote/);
  assert.equal(executeCoding('print("bad\\x41");').ok,false);
});
test('quoted tokens cannot masquerade as statements or operators',()=>{
  assert.equal(executeCoding('"print"(2);').ok,false);
  assert.equal(executeCoding('print(1 "+" 2);').ok,false);
});
test('fixture input is read-only and cannot be shadowed or overwritten',()=>{
  for(const code of ['quantity = 2; print(quantity);','let quantity = 2; print(quantity);']) {
    const result=executeCoding(code,{quantity:5});assert.equal(result.ok,false);assert.match(result.error.message,/read-only fixture/);
  }
});
test('undeclared and duplicate variable errors explain how to proceed',()=>{
  assert.match(executeCoding('print(unknown);').error.message,/Unknown variable/);
  assert.match(executeCoding('counter = 1;').error.message,/Declare/);
  assert.match(executeCoding('let n = 1; let n = 2;').error.message,/already declared/);
});
test('device, network, imports, execution APIs and prototype access are unavailable',()=>{
  const attempts=['fetch("https://example.test");','window.location = "x";','document.write("x");','eval("print(1)");','Function("return 1");','import("x");','let x = constructor;','let x = __proto__;','new Worker("x");','process.exit();','localStorage.clear();','console["log"](1);','print((1).constructor);'];
  for(const code of attempts) {const result=executeCoding(code);assert.equal(result.ok,false,code);assert.deepEqual(result.output,[],code);}
});
test('while, for, functions, arrays and objects are explicitly outside the language',()=>{
  for(const code of ['while(true) {}','for (;;) {}','function go() {}','let a = [];','let a = {};']) assert.equal(executeCoding(code).ok,false,code);
});
test('repeat cannot run indefinitely or exceed its explicit count limits',()=>{
  for(const count of [-1,0.5,51]) {const result=executeCoding('repeat('+count+') { print(1); }');assert.equal(result.ok,false);assert.match(result.error.message,/whole-number count/);}
  assert.deepEqual(executeCoding('repeat(0) { print(1); }').output,[]);
  const nested=executeCoding('repeat(50) { repeat(50) { let keep = 1; } }');
  // No unbounded execution: redeclaration or the total-step guard stops the program.
  assert.equal(nested.ok,false);assert.ok(nested.steps<=1001);
  const budget=executeCoding('let n = 0; repeat(50) { repeat(50) { n = n + 1; } }');
  assert.equal(budget.ok,false);assert.match(budget.error.message,/1,000-step limit/);assert.equal(budget.steps,1001);
});
test('source, tokens, nesting, output count, strings and arithmetic have bounds',()=>{
  assert.match(executeCoding(' '.repeat(4001)).error.message,/4,000/);
  assert.match(executeCoding(';'.repeat(1001)).error.message,/tokens/);
  assert.match(executeCoding('print('+'('.repeat(30)+'1'+')'.repeat(30)+');').error.message,/nested too deeply/);
  const output=executeCoding('repeat(21) { print(1); }');assert.equal(output.output.length,20);assert.match(output.error.message,/20 lines/);
  assert.match(executeCoding('print("'+'x'.repeat(301)+'");').error.message,/300 characters/);
  assert.match(executeCoding('let x = "'+'x'.repeat(151)+'"; print(x + x);').error.message,/300 characters/);
  for(const code of ['print(1 / 0);','print(1 % 0);','print(1000000 * 2);','print("2" * 3);','print(-"a");']) assert.equal(executeCoding(code).ok,false,code);
});
test('invalid externally supplied inputs cannot introduce objects or unbounded values',()=>{
  for(const inputs of [{x:{}},{x:Infinity},{x:NaN},{x:1000001},{x:'x'.repeat(301)},JSON.parse('{"__proto__":2}')]) assert.equal(executeCoding('print(1);',inputs).ok,false);
});
test('changing saved source invalidates a prior passing result and ignores spoofed result flags',()=>{
  const passed=run('CODE-501',solutions['CODE-501']);
  const changed=applyCodingAction('CODE-501',passed,'save-code',{code:'print(6);'}).state;
  assert.equal(changed.tested,false);assert.deepEqual(changed.results,[]);assert.equal(verifyCoding('CODE-501',changed).ok,false);
  const forged=normalizeCodingState('CODE-501',{...passed,code:'print(6);',results:[{ok:true,label:'Spoof'}],output:['0'],errors:[]});
  assert.equal(forged.tested,false);assert.deepEqual(forged.results,[]);
  const sameSourceForgery=normalizeCodingState('CODE-501',{...passed,code:'print(6);',sourceAtRun:'print(6);',results:[{ok:true,label:'Spoof'}]});
  assert.equal(verifyCoding('CODE-501',sameSourceForgery).ok,false);assert.ok(sameSourceForgery.results.some(result=>!result.ok));
});
test('normalization bounds untrusted storage and regenerates console evidence',()=>{
  const state=normalizeCodingState('CODE-501',{code:'x'.repeat(5000),sourceAtRun:'x'.repeat(5000),tested:'yes',fixtureIndex:999,workspaceEdits:-1,checkRuns:Infinity,output:['untrusted'],errors:[{line:1,message:'untrusted'}],unexpected:'drop'});
  assert.equal(state.code.length,4000);assert.equal(state.sourceAtRun.length,4000);assert.equal(state.tested,false);assert.equal(state.fixtureIndex,0);assert.equal(state.checkRuns,0);assert.equal(state.workspaceEdits,0);assert.deepEqual(state.output,[]);assert.deepEqual(state.errors,[]);assert.equal(Object.hasOwn(state,'unexpected'),false);
  assert.deepEqual(normalizeCodingState('CODE-501',[]),initialCodingState('CODE-501'));
});
test('fixture inspection changes only the viewed fixture and reset invalidates a solution',()=>{
  const passed=run('CODE-501',solutions['CODE-501']);
  const viewed=applyCodingAction('CODE-501',passed,'inspect-fixture',{index:1}).state;
  assert.deepEqual(viewed.output,['15']);assert.equal(viewed.checkRuns,1);assert.equal(verifyCoding('CODE-501',viewed).ok,true);
  const reset=applyCodingAction('CODE-501',viewed,'reset-code').state;
  assert.equal(reset.code,initialCodingState('CODE-501').code);assert.equal(reset.tested,false);assert.equal(verifyCoding('CODE-501',reset).ok,false);
});
test('an oversized editor action is rejected without executing its truncated prefix',()=>{
  const state=initialCodingState('CODE-501');const result=applyCodingAction('CODE-501',state,'run-check',{code:solutions['CODE-501']+' '.repeat(4000)});
  assert.equal(result.kind,'warning');assert.equal(result.state.checkRuns,0);assert.equal(result.state.code,state.code);assert.equal(result.state.tested,false);
});
test('diagnostics accept only fixed read-only practice commands',()=>{
  const state=run('CODE-501',solutions['CODE-501']),before=JSON.stringify(state);
  assert.match(codingDiagnostic('CODE-501',state,'fixtures'),/quantity: 2, 5, 0/);
  assert.match(codingDiagnostic('CODE-501',state,'status'),/Verified.*3\/3/);
  assert.match(codingDiagnostic('CODE-501',state,'help'),/not a system shell/);
  assert.match(codingDiagnostic('CODE-501',state,'print(6);'),/Unknown practice diagnostic/);
  assert.equal(JSON.stringify(state),before);
});
function fakeRoot() {
  const nodes=new Map();
  return {innerHTML:'',textContent:'',nodes,querySelector(selector){if(!nodes.has(selector)) nodes.set(selector,{value:'',textContent:'',listeners:{},addEventListener(name,handler){this.listeners[name]=handler;}});return nodes.get(selector);}};
}
test('editor actions capture actual typed code and console displays HTML only as text',()=>{
  const root=fakeRoot(),scenario=CODING_SCENARIOS[0],source='print("<img src=x onerror=alert(1)>");',state=run(scenario.id,source),actions=[];
  renderCoding(root,scenario,state,(action,value)=>actions.push({action,value}));
  assert.match(root.innerHTML,/id="coding-editor"/);assert.match(root.innerHTML,/<b>Your code<\/b>/);
  assert.ok(root.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!root.innerHTML.includes('<img src=x'));
  assert.equal(root.querySelector('[data-code-output]').textContent,'<img src=x onerror=alert(1)>');
  const editor=root.querySelector('[name="code"]');editor.value=solutions['CODE-501'];
  root.querySelector('[data-code-run]').listeners.click();
  assert.deepEqual(actions.at(-1),{action:'run-check',value:{code:solutions['CODE-501']}});
  let prevented=false;root.querySelector('[data-code-form]').listeners.submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.deepEqual(actions.at(-1),{action:'save-code',value:{code:solutions['CODE-501']}});
  root.querySelector('[data-code-fixture]').listeners.change({target:{value:'1'}});
  assert.deepEqual(actions.slice(-2),[{action:'save-code',value:{code:solutions['CODE-501']}},{action:'inspect-fixture',value:{index:1}}]);
});
