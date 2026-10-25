import test from 'node:test';
import assert from 'node:assert/strict';
import {CODING_SCENARIOS,initialCodingState,applyCodingAction,renderCoding,verifyCoding} from '../src/coding-lab.js';

function fixture(){
  const nodes=new Map();return {innerHTML:'',nodes,querySelector(selector){
    if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',innerHTML:'',className:'',attrs:{},listeners:{},setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];},addEventListener(name,callback){this.listeners[name]=callback;}});
    return nodes.get(selector);
  }};
}
const scenario=id=>CODING_SCENARIOS.find(item=>item.id===id);
const run=(id,code)=>applyCodingAction(id,initialCodingState(id),'run-check',{code}).state;
const setup=(id,state=initialCodingState(id))=>{const root=fixture(),actions=[];renderCoding(root,scenario(id),state,(action,value)=>actions.push({action,value}));root.querySelector('[name="code"]').value=state.code;return {root,actions};};

test('all six coding challenges have direct input cards, an output comparison and optional references',()=>{
  for(const lab of CODING_SCENARIOS){
    const {root}=setup(lab.id);
    assert.match(root.innerHTML,/Try the input cards/);assert.match(root.innerHTML,/data-code-fixture-card="0"/);
    assert.match(root.innerHTML,/Actual program output/);assert.match(root.innerHTML,/Expected reference/);
    assert.match(root.innerHTML,/What happens if/);assert.match(root.innerHTML,/type="range"/);
    assert.match(root.innerHTML,/<a href="#sandbox">Build your own project/);
    assert.match(root.innerHTML,/<details class="code-reference">/);
    assert.match(root.querySelector('[data-code-visual]').innerHTML,/Run all fixtures/);
    assert.doesNotMatch(root.querySelector('[data-code-comparison]').className,/code-match/);
    assert.ok(lab.brief.split(/\s+/).length<=35,lab.id+' brief stays focused');
  }
});

test('the actual result is derived from the selected fixture, not a decorative correct answer',()=>{
  const failed=run('CODE-501','print(999);'),passed=run('CODE-501','print(quantity * 3);');
  const wrong=setup('CODE-501',failed).root,right=setup('CODE-501',passed).root;
  assert.equal(wrong.querySelector('[data-code-output]').textContent,'999');
  assert.match(wrong.querySelector('[data-code-visual]').innerHTML,/999/);
  assert.doesNotMatch(wrong.querySelector('[data-code-comparison]').className,/code-match/);
  assert.equal(right.querySelector('[data-code-output]').textContent,'6');
  assert.match(right.querySelector('[data-code-comparison]').className,/code-match/);
  assert.match(right.querySelector('[data-code-visual]').innerHTML,/6/);
});

test('editing code immediately clears old passing visuals, progress and card statuses without awarding a run',()=>{
  const passed=run('CODE-501','print(quantity * 3);'),{root,actions}=setup('CODE-501',passed),editor=root.querySelector('[name="code"]');
  editor.value='print(999);';editor.listeners.input();
  assert.match(root.querySelector('[data-code-visual]').innerHTML,/Draft changed/);
  assert.equal(root.querySelector('[data-code-output]').textContent,'Results are out of date.');
  assert.doesNotMatch(root.querySelector('[data-code-comparison]').className,/code-match/);
  assert.equal(root.querySelector('[data-code-progress]').value,0);
  assert.equal(root.querySelector('[data-code-card-status="0"]').textContent,'TRY INPUT');
  assert.doesNotMatch(root.querySelector('[data-code-fixture-card="0"]').className,/code-pass/);
  assert.deepEqual(actions,[]);assert.equal(passed.checkRuns,1);
});

test('input cards inspect saved program results and preserve an edited draft before switching',()=>{
  const {root,actions}=setup('CODE-501',run('CODE-501','print(quantity * 3);'));
  root.querySelector('[data-code-fixture-card="1"]').listeners.click();
  assert.deepEqual(actions,[{action:'inspect-fixture',value:{index:1}}]);
  root.querySelector('[name="code"]').value='print(quantity * 4);';
  root.querySelector('[data-code-fixture-card="2"]').listeners.click();
  assert.deepEqual(actions.slice(-2),[{action:'save-code',value:{code:'print(quantity * 4);'}},{action:'inspect-fixture',value:{index:2}}]);
});

test('practice sliders execute the current draft and never save or award fixture credit',()=>{
  const state=initialCodingState('CODE-504'),snapshot=structuredClone(state),{root,actions}=setup('CODE-504',state);
  root.querySelector('[name="code"]').value='print("Energy " + snacks * 9);';
  const slider=root.querySelector('[data-code-play-slider]');slider.value='3';slider.listeners.input();
  assert.equal(root.querySelector('[data-code-play-input]').value,'3');
  assert.equal(root.querySelector('[data-code-play-output]').textContent,'Energy 27');
  assert.match(root.querySelector('[data-code-play-visual]').innerHTML,/27/);
  assert.deepEqual(actions,[]);assert.deepEqual(state,snapshot);assert.equal(verifyCoding('CODE-504',state).ok,false);
  root.querySelector('[name="code"]').value='print("<img src=x onerror=alert(1)>");';slider.listeners.input();
  assert.equal(root.querySelector('[data-code-play-output]').textContent,'<img src=x onerror=alert(1)>');
  assert.doesNotMatch(root.querySelector('[data-code-play-visual]').innerHTML,/<img\b/i);
  assert.match(root.querySelector('[data-code-play-visual]').innerHTML,/&lt;img/);
});

test('invalid practice input and edited drafts clear the previous extra preview',()=>{
  const {root}=setup('CODE-506'),editor=root.querySelector('[name="code"]'),field=root.querySelector('[data-code-play-input]');
  editor.value='print(4);';field.value='4';root.querySelector('[data-code-play]').listeners.click();
  assert.match(root.querySelector('[data-code-play-visual]').innerHTML,/4/);
  field.value='';root.querySelector('[data-code-play]').listeners.click();
  assert.equal(root.querySelector('[data-code-play-visual]').innerHTML,'');
  assert.equal(field.attrs['aria-invalid'],'true');
  field.value='4';root.querySelector('[data-code-play]').listeners.click();
  editor.value='print(8);';editor.listeners.input();
  assert.equal(root.querySelector('[data-code-play-visual]').innerHTML,'');
  assert.match(root.querySelector('[data-code-play-output]').textContent,/Draft changed/);
});

test('syntax errors cannot produce a matching preview and stay associated with the editor',()=>{
  const {root}=setup('CODE-501',run('CODE-501','print(;'));
  assert.doesNotMatch(root.querySelector('[data-code-comparison]').className,/code-match/);
  assert.match(root.querySelector('[data-code-comparison]').textContent,/Run stopped/);
  assert.match(root.querySelector('[data-code-error]').textContent,/Line/);
  assert.equal(root.querySelector('[name="code"]').attrs['aria-invalid'],'true');
});

test('pet energy bars project only a numeric value that the actual program printed',()=>{
  const actual=setup('CODE-504',run('CODE-504','print("Energy " + snacks * 9);')).root;
  assert.equal(actual.querySelector('[data-code-output]').textContent,'Energy 0');
  assert.match(actual.querySelector('[data-code-visual]').innerHTML,/Energy · from actual program output/);
  const malformed=setup('CODE-504',run('CODE-504','print("Fuel 999");')).root;
  assert.match(malformed.querySelector('[data-code-visual]').innerHTML,/Fuel 999/);
  assert.doesNotMatch(malformed.querySelector('[data-code-visual]').innerHTML,/Energy · from actual/);
});
