import test from 'node:test';
import assert from 'node:assert/strict';
import {captureWorkspaceView} from '../src/workspace-accessibility.js';
import {renderWorkspace,initialWorkspaceState,applyWorkspaceAction} from '../src/workspaces.js';
import {renderExpanded,initialExpandedState,applyExpandedAction} from '../src/expanded-labs.js';
import {renderCoding,initialCodingState,applyCodingAction} from '../src/coding-lab.js';
import {SCENARIOS} from '../src/scenarios.js';

// This DOM boundary replaces nodes on every render, as innerHTML does in a browser.
// It verifies focus/state continuity, not native accessibility-tree speech or layout.
function fixture(){
  const doc={activeElement:null},root={ownerDocument:doc},decode=value=>value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  let nodes=[],markup='';
  function matches(node,selector){
    return selector.split(',').some(part=>{
      const pieces=part.trim().split(/\s+/);let current=node;
      for(let i=pieces.length-1;i>=0;i--){
        const one=value=>{
          if(!value?.attrs)return false;
          const tag=/^[\w-]+/.exec(pieces[i])?.[0],id=/#([\w-]+)/.exec(pieces[i])?.[1],className=/\.([\w-]+)/.exec(pieces[i])?.[1];
          return (!tag||value.localName===tag)&&(!id||value.attrs.id===id)&&(!className||value.attrs.class?.split(/\s+/).includes(className))&&[...pieces[i].matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(([,name,val])=>Object.hasOwn(value.attrs,name)&&(val===undefined||value.attrs[name]===val));
        };
        if(i===pieces.length-1){if(!one(current))return false;}else{while(current&&!one(current))current=current.parentElement;if(!current)return false;}
        if(i>0)current=current.parentElement;
      }
      return true;
    });
  }
  function node(tag,attrs={},parent=root){
    return {localName:tag,attrs,parentElement:parent,isConnected:true,open:Object.hasOwn(attrs,'open'),hidden:Object.hasOwn(attrs,'hidden'),disabled:Object.hasOwn(attrs,'disabled'),value:attrs.value||'',textContent:'',scrollTop:0,scrollLeft:0,listeners:new Map(),
      getAttribute:name=>attrs[name]??null,getAttributeNames:()=>Object.keys(attrs),
      setAttribute(name,value){attrs[name]=String(value);},removeAttribute(name){delete attrs[name];},
      matches(selector){return matches(this,selector);},
      closest(selector){for(let current=this;current&&current!==root;current=current.parentElement)if(matches(current,selector))return current;return null;},
      focus(){doc.activeElement=this;},setSelectionRange(start,end,direction){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;},
      addEventListener(name,callback){this.listeners.set(name,callback);},fire(name,extra={}){this.listeners.get(name)?.({target:this,preventDefault(){},...extra});}};
  }
  doc.body=node('body',{},null);doc.activeElement=doc.body;
  root.contains=target=>nodes.includes(target);
  root.querySelectorAll=selector=>nodes.filter(item=>matches(item,selector));root.querySelector=selector=>root.querySelectorAll(selector)[0]||null;
  Object.defineProperty(root,'innerHTML',{get:()=>markup,set(value){
    if(nodes.includes(doc.activeElement))doc.activeElement=doc.body;
    for(const item of nodes)item.isConnected=false;
    nodes=[];markup=value;const stack=[root];
    for(const match of value.matchAll(/<\/?[^>]+>|[^<]+/g)){
      const token=match[0];if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
      if(!token.startsWith('<')){for(const item of stack.slice(1))item.textContent+=decode(token);continue;}
      const tag=/^<([\w-]+)/.exec(token)?.[1];if(!tag)continue;
      const attrs=Object.fromEntries([...token.matchAll(/\s([\w-]+)(?:="([^"]*)")?/g)].map(([,name,val])=>[name,decode(val??'')]));
      const item=node(tag,attrs,stack.at(-1));nodes.push(item);
      if(!['input','br','hr','img','path','circle','rect','line','stop'].includes(tag)&&!token.endsWith('/>'))stack.push(item);
    }
    for(const item of nodes){item.dataset=Object.fromEntries(Object.entries(item.attrs).filter(([key])=>key.startsWith('data-')).map(([key,val])=>[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),val]));if(item.localName==='textarea')item.value=item.textContent;}
  }});
  return {root,doc,node};
}
const scenario=id=>SCENARIOS.find(item=>item.id===id);

test('software testing retains its native button and open help after replacement; inspection retains the command input',()=>{
  const {root,doc}=fixture(),lab=scenario('NET-201');let state=initialWorkspaceState(lab.id);
  const render=()=>renderWorkspace(root,lab,state,(action,value)=>{state=applyWorkspaceAction(lab.id,state,action,value).state;render();});
  render();root.querySelector('details').open=true;root.querySelector('[data-action="run-check"]').focus();root.querySelector('[data-action="run-check"]').fire('click');
  assert.equal(doc.activeElement,root.querySelector('[data-action="run-check"]'));assert.equal(root.querySelector('details').open,true);assert.equal(state.checkRuns,1);
  const command=root.querySelector('[name="command"]');command.value='ipconfig';command.selectionStart=2;command.selectionEnd=6;command.selectionDirection='forward';command.focus();
  root.querySelector('[data-inspect-form]').fire('submit');
  assert.equal(doc.activeElement,root.querySelector('[name="command"]'));assert.equal(doc.activeElement.value,'ipconfig');assert.equal(doc.activeElement.selectionStart,2);assert.equal(doc.activeElement.selectionEnd,6);
  assert.equal(root.querySelector('[data-inspection-output]').getAttribute('tabindex'),'0');
});

test('expanded testing retains its focused control and disclosures without changing saved choices',()=>{
  const {root,doc}=fixture(),lab=scenario('NET-204');let state=initialExpandedState(lab.id);
  const render=()=>renderExpanded(root,lab,state,(action,value)=>{state=applyExpandedAction(lab.id,state,action,value).state;render();});
  render();root.querySelector('details').open=true;const before=state.placement;
  root.querySelector('[data-exp-test]').focus();root.querySelector('[data-exp-test]').fire('click');
  assert.equal(doc.activeElement,root.querySelector('[data-exp-test]'));assert.equal(root.querySelector('details').open,true);assert.equal(state.placement,before);assert.equal(state.checkRuns,1);
  assert.equal(root.querySelector('.exp-console').getAttribute('aria-label'),'Practice inspection output');
});

test('coding keeps editor selection, scroll and opened examples across fixture rendering, and associates syntax errors',()=>{
  const {root,doc}=fixture(),lab=scenario('CODE-504');let state=initialCodingState(lab.id);
  renderCoding(root,lab,state,()=>{});root.querySelectorAll('details').forEach(item=>{item.open=true;});
  const editor=root.querySelector('[name="code"]');editor.selectionStart=4;editor.selectionEnd=10;editor.selectionDirection='backward';editor.scrollTop=72;editor.scrollLeft=21;editor.focus();
  state=applyCodingAction(lab.id,state,'run-check',{code:'console.log(missing);'}).state;
  renderCoding(root,lab,state,()=>{});
  assert.equal(doc.activeElement,root.querySelector('[name="code"]'));assert.equal(doc.activeElement.selectionStart,4);assert.equal(doc.activeElement.selectionEnd,10);assert.equal(doc.activeElement.selectionDirection,'backward');assert.equal(doc.activeElement.scrollTop,72);assert.equal(doc.activeElement.scrollLeft,21);
  assert.ok(root.querySelectorAll('details').every(item=>item.open));assert.equal(doc.activeElement.getAttribute('aria-invalid'),'true');assert.match(doc.activeElement.getAttribute('aria-describedby'),/code-program-error/);assert.match(root.querySelector('#code-program-error').textContent,/Unknown variable/);
  assert.equal(root.querySelector('.code-expected').getAttribute('tabindex'),'0');assert.ok(root.querySelectorAll('.code-reference pre').length>0);assert.ok(root.querySelectorAll('.code-reference pre').every(item=>item.getAttribute('tabindex')==='0'));
  doc.activeElement.value='console.log(1);';doc.activeElement.fire('input');assert.equal(doc.activeElement.getAttribute('aria-invalid'),null,'An edited draft has not yet been validated by the previous run.');
});

test('extra input validation identifies the field and clears invalid state on a valid local retry',()=>{
  const {root}=fixture(),lab=scenario('CODE-504');renderCoding(root,lab,initialCodingState(lab.id),()=>assert.fail('Extra play must not save or award progress.'));
  const field=root.querySelector('[data-code-play-input]'),button=root.querySelector('[data-code-play]');field.value='-1';button.fire('click');assert.equal(field.getAttribute('aria-invalid'),'true');assert.match(field.getAttribute('aria-describedby'),/code-play-result/);assert.match(root.querySelector('#code-play-result').textContent,/whole number/);
  field.value='2';button.fire('click');assert.equal(field.getAttribute('aria-invalid'),null);assert.doesNotMatch(root.querySelector('#code-play-result').textContent,/whole number/);
});

test('restoration never steals outside focus, reveals closed content or reuses another case disclosure state',()=>{
  const {root,doc,node}=fixture();root.innerHTML='<details><summary>Help</summary><button data-test="hidden">Hidden action</button></details>';
  captureWorkspaceView(root,'first')();root.querySelector('summary').focus();let restore=captureWorkspaceView(root,'first');root.innerHTML='<details><summary>Help</summary><button data-test="hidden">Hidden action</button></details>';restore();assert.equal(doc.activeElement,root.querySelector('summary'),'A closed disclosure summary remains a valid Tab target.');
  root.querySelector('[data-test]').focus();restore=captureWorkspaceView(root,'first');root.innerHTML='<details><summary>Help</summary><button data-test="hidden">Hidden action</button></details>';restore();assert.equal(doc.activeElement,doc.body,'An action inside closed content must not receive focus.');
  root.querySelector('summary').focus();restore=captureWorkspaceView(root,'first');root.innerHTML='<details><summary>Help</summary></details>';const outside=node('button',{},doc.body);outside.focus();restore();assert.equal(doc.activeElement,outside);
  root.querySelector('details').open=true;restore=captureWorkspaceView(root,'second');root.innerHTML='<details><summary>Help</summary></details>';restore();assert.equal(root.querySelector('details').open,false);
});

test('fictional inbox selection is programmatic and scrollable consoles have names',()=>{
  const {root}=fixture();renderWorkspace(root,scenario('SEC-401'),initialWorkspaceState('SEC-401'),()=>{});
  assert.equal(root.querySelector('[data-la-choice="message"][data-la-value="urgent"]').getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('[data-la-choice="message"][data-la-value="routine"]').getAttribute('aria-pressed'),'false');
  renderWorkspace(root,scenario('NET-201'),initialWorkspaceState('NET-201'),()=>{});assert.equal(root.querySelector('.ws-terminal').getAttribute('tabindex'),'0');assert.equal(root.querySelector('.ws-terminal').getAttribute('role'),'region');
});
