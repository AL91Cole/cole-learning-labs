import test from 'node:test';
import assert from 'node:assert/strict';
import {CODING_SCENARIOS,CODING_LANGUAGES,codingFixtureCount,executeCoding,initialCodingState,normalizeCodingState,applyCodingAction,verifyCoding,renderCoding} from '../src/coding-lab.js';

const python={
  'CODE-501':'total = quantity * 3\nprint(total)',
  'CODE-502':'if temperature < 20:\n    print("Heating")\nelif temperature <= 25:\n    print("Comfortable")\nelse:\n    print("Cooling")',
  'CODE-503':'for station in range(1, stations + 1):\n    print("Ready", station)',
  'CODE-504':'energy = snacks * 4\nprint("Energy", energy)',
  'CODE-505':'if points < 50:\n    print("Try again")\nelif points < 100:\n    print("Sticker")\nelse:\n    print("Badge")',
  'CODE-506':'energy = 0\nfor leg in range(1, steps + 1):\n    energy = energy + leg\nprint(energy)'
};
const select=(id,language,code=initialCodingState(id).code)=>applyCodingAction(id,initialCodingState(id),'set-language',{language,code}).state;
const runPython=id=>applyCodingAction(id,select(id,'python'),'run-check',{code:python[id]}).state;

test('every coding mission has a Python starter with real failing fixtures and a solution that passes every input',()=>{
  assert.deepEqual(CODING_LANGUAGES.map(language=>language.id),['javascript','python']);
  for(const scenario of CODING_SCENARIOS){
    const start=applyCodingAction(scenario.id,select(scenario.id,'python'),'reset-code').state;
    const failing=applyCodingAction(scenario.id,start,'run-check',{code:start.code}).state;
    assert.equal(failing.language,'python');assert.equal(failing.results.length,codingFixtureCount(scenario.id));
    assert.ok(failing.results.some(result=>!result.ok),scenario.id+' starter needs a repair');
    const passing=runPython(scenario.id);assert.equal(passing.languageAtRun,'python');
    assert.ok(passing.results.every(result=>result.ok),scenario.id+': '+JSON.stringify(passing.errors));
    assert.equal(verifyCoding(scenario.id,passing).ok,true);
  }
  assert.equal(codingFixtureCount('CODE-505'),6);assert.equal(codingFixtureCount('missing'),0);
});

test('Python uses indentation, elif, comments, strict text conversion, booleans and normal range boundaries',()=>{
  const result=executeCoding('# This is a local comment\ncount = 2\nif not count == 1 and count < 3:\n    print("Count", str(count), True)\nelif count == 3:\n    print("Three")\nelse:\n    print("Other")\nfor n in range(5, 0, -2):\n    print(n)\nprint(-5 // 2, -5 % 2)',{},'python');
  assert.equal(result.ok,true,JSON.stringify(result.error));assert.deepEqual(result.output,['Count 2 True','5','3','1','-3 1']);
  assert.deepEqual(executeCoding('for n in range(0):\n    print(n)\nprint("Empty trip")',{},'python').output,['Empty trip']);
  assert.equal(executeCoding('print("Energy " + 2)',{},'python').ok,false);
  assert.deepEqual(executeCoding('print("# comment text", "and or not") # actual comment',{},'python').output,['# comment text and or not']);
});

test('Python syntax errors keep original source lines and reject inconsistent or missing indentation',()=>{
  for(const source of ['if True:\nprint(1)','if True\n    print(1)','    print(1)','if True:\n\tprint(1)',
    'if True:\n    print(1)\n  print(2)','if True:','for n "in" range(3):\n    print(n)',
    'for n in "range"(3):\n    print(n)','if True && False:\n    print(1)','print(!True)']){
    assert.equal(executeCoding(source,{},'python').ok,false,source);
  }
  const error=executeCoding('# line one\nvalue = 1\nprint(missing)',{},'python');assert.equal(error.error.line,3);
  assert.match(error.error.message,/Unknown variable/);
});

test('Python cannot import, inspect properties, open files, call host code or modify fixture inputs',()=>{
  for(const source of ['import os','from os import system','open("file.txt")','exec("print(1)")','eval("1")',
    '__import__("os")','print(globals())','print((1).__class__)','x = [1, 2]','x = {"secret": 1}',
    'def go():\n    print(1)','while True:\n    print(1)','fetch("https://example.test")','print.constructor("x")']){
    const result=executeCoding(source,{},'python');assert.equal(result.ok,false,source);assert.deepEqual(result.output,[],source);
  }
  for(const source of ['quantity = 3\nprint(quantity)','for quantity in range(2):\n    print(quantity)']){
    const result=executeCoding(source,{quantity:9},'python');assert.equal(result.ok,false);assert.match(result.error.message,/read-only fixture/);
  }
});

test('JavaScript for uses an isolated counter, else-if and explicit update while all loops remain bounded',()=>{
  const result=executeCoding('let n = 99; for (let n = 1; n <= 3; n++) { console.log(n); } console.log(n); for (let n = 2; n > 0; n = n - 1) { if (n === 2) { print("Two"); } else if (n === 1) { print("One"); } }');
  assert.equal(result.ok,true,JSON.stringify(result.error));assert.deepEqual(result.output,['1','2','3','99','Two','One']);
  for(const source of ['for (;;) {}','for (let n = 0; true; n = n) {}','for (let n = 0; n < 100; n++) {}']){
    const bounded=executeCoding(source);assert.equal(bounded.ok,false);assert.ok(bounded.steps<=1001);
  }
  assert.equal(executeCoding('for (let n = 0; n < 2; other++) {}').ok,false);
  const readonly=executeCoding('for (let quantity = 0; quantity < 2; quantity++) {}',{quantity:5});assert.match(readonly.error.message,/read-only fixture/);
});

test('Python ranges, nesting, output, expressions and repeated text obey shared budgets',()=>{
  for(const source of ['for n in range(51):\n    print(n)','for n in range(1, 3, 0):\n    print(n)',
    'for n in range(0.5):\n    print(n)','for n in range(1000000):\n    print(n)']){
    const result=executeCoding(source,{},'python');assert.equal(result.ok,false);assert.deepEqual(result.output,[]);
  }
  const nested=executeCoding('total = 0\nfor outer in range(50):\n    for inner in range(50):\n        total = total + 1',{},'python');
  assert.equal(nested.ok,false);assert.match(nested.error.message,/1,000-step/);assert.equal(nested.steps,1001);
  const output=executeCoding('for n in range(21):\n    print(n)',{},'python');assert.equal(output.output.length,20);assert.match(output.error.message,/20 lines/);
  assert.equal(executeCoding('text = "'+'x'.repeat(151)+'"\nprint(text + text)',{},'python').ok,false);
  assert.equal(executeCoding(' '.repeat(4001),{},'python').ok,false);
  assert.equal(executeCoding('print(1)',{},'javascript:arbitrary').ok,false);
});

test('language switches preserve drafts but invalidate prior tests; legacy repeat records remain replayable',()=>{
  const passed=runPython('CODE-504'),draft='energy = snacks * 5\nprint("Energy", energy)';
  const changed=applyCodingAction('CODE-504',passed,'set-language',{language:'javascript',code:draft}).state;
  assert.equal(changed.code,draft);assert.equal(changed.language,'javascript');assert.equal(changed.languageAtRun,'');
  assert.equal(changed.tested,false);assert.equal(verifyCoding('CODE-504',changed).ok,false);
  const forged=normalizeCodingState('CODE-504',{...passed,languageAtRun:'javascript'});assert.equal(forged.tested,false);
  const source='let station = 1; repeat(stations) { print("Ready " + station); station = station + 1; }';
  const legacy=normalizeCodingState('CODE-503',{code:source,sourceAtRun:source,tested:true});
  assert.equal(legacy.language,'javascript');assert.equal(legacy.languageAtRun,'javascript');assert.equal(verifyCoding('CODE-503',legacy).ok,true);
  for(const value of ['full-python','javascript:eval',{},null]){
    const rejected=applyCodingAction('CODE-504',passed,'set-language',{language:value,code:'print(1)'});
    assert.equal(rejected.kind,'warning');assert.equal(rejected.state.code,passed.code);
  }
});

function rootFixture(){
  const nodes=new Map();return {innerHTML:'',nodes,querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',listeners:{},addEventListener(name,handler){this.listeners[name]=handler;}});return nodes.get(selector);}};
}
test('extra-input play runs only the current local draft and cannot save, award fixtures or render HTML',()=>{
  const root=rootFixture(),scenario=CODING_SCENARIOS.find(item=>item.id==='CODE-504'),state=select(scenario.id,'python'),before=structuredClone(state),actions=[];
  renderCoding(root,scenario,state,(...args)=>actions.push(args));
  root.querySelector('[name="code"]').value='print("<img src=x onerror=alert(1)>")';
  root.querySelector('[data-code-play-input]').value='2';root.querySelector('[data-code-play]').listeners.click();
  assert.equal(root.querySelector('[data-code-play-output]').textContent,'<img src=x onerror=alert(1)>');
  assert.deepEqual(actions,[]);assert.deepEqual(state,before);
  root.querySelector('[data-code-play-input]').value='';root.querySelector('[data-code-play]').listeners.click();assert.match(root.querySelector('[data-code-play-output]').textContent,/whole number/);
  root.querySelector('[data-code-language]').listeners.change({target:{value:'javascript'}});
  assert.deepEqual(actions.at(-1),['set-language',{language:'javascript',code:'print("<img src=x onerror=alert(1)>")'}]);
  assert.match(root.innerHTML,/aria-describedby="code-language-help"/);assert.match(root.innerHTML,/fictional|made-up/i);
});

test('new playful mission fixtures include zero, exact thresholds and a loop accumulator rather than fixed answers',()=>{
  const pet=runPython('CODE-504');assert.deepEqual(pet.output,['Energy 0']);
  const arcade=runPython('CODE-505');assert.equal(arcade.results.length,6);assert.ok(arcade.results.every(result=>result.ok));
  const rover=runPython('CODE-506');assert.equal(rover.results.length,4);assert.deepEqual(rover.output,['0']);
  for(const id of ['CODE-504','CODE-505','CODE-506']){
    const root=rootFixture();renderCoding(root,CODING_SCENARIOS.find(item=>item.id===id),initialCodingState(id),()=>{});
    assert.match(root.innerHTML,/class="code-story-card"/);assert.match(root.innerHTML,/<svg[^>]*aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(root.innerHTML,/<img|<canvas|<iframe/);
  }
});
