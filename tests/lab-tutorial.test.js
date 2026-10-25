import test from 'node:test';
import assert from 'node:assert/strict';
import {createTutorialState,tutorialCanAdvance,tutorialTransition,renderTutorialPanel,renderLabTutorial,mountLabTutorial} from '../src/lab-tutorial.js';

function firstIdea() {
  let state=createTutorialState();
  for(const [action,value] of [['ask'],['clue',0],['clue',1],['next'],['symptom'],['cause',0],['save-idea'],['next']]) state=tutorialTransition(state,action,value);
  return state;
}
function testedState() {
  let state=firstIdea();
  for(const [action,value] of [['cable'],['next'],['prediction',0],['test'],['save-attempt']]) state=tutorialTransition(state,action,value);
  return state;
}

test('tour opens one short task with optional reference and no investigation credit',()=>{
  const html=renderLabTutorial();
  assert.equal((html.match(/class="tour-task"/g)||[]).length,1);
  assert.match(html,/does not earn lab credit or change an investigation/i);
  assert.match(html,/Ask: What happened\?/);
  assert.match(html,/Inspect the browser/);
  assert.match(html,/Inspect the cable/);
  assert.doesNotMatch(html,/<details\s+open\b/i);
  assert.match(html,/at least two clues/);
  assert.match(html,/symptoms and your possible cause separately/);
  assert.match(html,/Save first idea/);
  assert.match(html,/Experiment notebook/);
  assert.match(html,/Downloading a report does not submit it/);
  assert.match(html,/closing or reloading/i);
  assert.match(html,/href="#sandbox"/);
  assert.match(html,/disconnect AC, then remove the side panel/);
  assert.match(html,/monitor <strong>Input<\/strong>/);
  assert.ok(html.replace(/<[^>]*>/g,' ').split(/\s+/).length<650);
  assert.doesNotMatch(html,/<script\b|onclick\s*=|localStorage/i);
});

test('requester question and both distinct clues unlock the first step',()=>{
  let state=createTutorialState();
  assert.equal(tutorialTransition(state,'go',4).step,0);
  assert.equal(tutorialTransition(state,'next').step,0);
  state=tutorialTransition(state,'clue',0);
  state=tutorialTransition(state,'clue',0);
  assert.equal(state.clues.length,1);
  state=tutorialTransition(state,'clue',1);
  assert.equal(tutorialCanAdvance(state),false);
  state=tutorialTransition(state,'ask');
  assert.equal(tutorialCanAdvance(state),true);
  assert.match(renderTutorialPanel(state),/after I moved my laptop/);
  assert.deepEqual(createTutorialState().clues,[]);
});

test('first idea keeps symptom and cause separate and requires an explicit save',()=>{
  let state=createTutorialState();
  for(const [action,value] of [['ask'],['clue',0],['clue',1],['next'],['symptom']]) state=tutorialTransition(state,action,value);
  assert.equal(tutorialCanAdvance(state),false);
  state=tutorialTransition(state,'cause',1);
  assert.equal(tutorialCanAdvance(state),false);
  state=tutorialTransition(state,'save-idea');
  assert.equal(tutorialCanAdvance(state),true);
  assert.match(renderTutorialPanel(state),/Symptom · What happened\?/);
  assert.match(renderTutorialPanel(state),/Possible cause · Your first idea/);
});

test('cable state drives packet success or failure, and edits invalidate saved results',()=>{
  let state=firstIdea();
  state=tutorialTransition(state,'cable');
  state=tutorialTransition(state,'next');
  state=tutorialTransition(state,'cable');
  state=tutorialTransition(state,'prediction',0);
  state=tutorialTransition(state,'test');
  assert.equal(state.test,'error');
  assert.match(renderTutorialPanel(state),/Packet stopped: the cable is unplugged/);
  state=tutorialTransition(state,'save-attempt');
  assert.equal(tutorialCanAdvance(state),false);
  state=tutorialTransition(state,'cable');
  assert.equal(state.test,'');
  assert.equal(state.attemptSaved,false);
  state=tutorialTransition(state,'test');
  assert.equal(state.test,'success');
  assert.equal(tutorialCanAdvance(state),false);
  state=tutorialTransition(state,'save-attempt');
  assert.equal(tutorialCanAdvance(state),true);
  state=tutorialTransition(state,'prediction',1);
  assert.equal(state.test,'');
  assert.equal(tutorialCanAdvance(state),false);
});

test('finishing requires original-task verification and reset removes all tour work',()=>{
  let state=testedState();
  state=tutorialTransition(state,'next');
  assert.equal(state.step,4);
  assert.equal(tutorialTransition(state,'finish').finished,false);
  state=tutorialTransition(state,'verify');
  state=tutorialTransition(state,'finish');
  assert.equal(state.finished,true);
  assert.match(renderTutorialPanel(state),/Your practice report/);
  state=tutorialTransition(state,'go',2);
  state=tutorialTransition(state,'cable');
  assert.equal(state.verified,false);
  assert.equal(state.finished,false);
  assert.deepEqual(tutorialTransition(state,'reset'),createTutorialState());
});

test('unknown actions and invalid step values cannot bypass the tour',()=>{
  const state=createTutorialState();
  for(const [action,value] of [['go',-1],['go',5],['go',NaN],['go','1'],['clue',2],['cause',0],['test'],['verify'],['finish'],['__proto__']]) assert.deepEqual(tutorialTransition(state,action,value),state);
  const changed=tutorialTransition(state,'clue',0);
  assert.deepEqual(state.clues,[]);
  assert.deepEqual(changed.clues,[0]);
});

test('tour delegates scoped controls, announces changes, and removes its listener',()=>{
  const handlers=new Map(),focused=[];
  const panel={innerHTML:'',querySelector:selector=>({disabled:false,focus:()=>focused.push(selector)})};
  const status={textContent:'',focus:()=>focused.push('status')};
  const root={querySelector:selector=>selector==='[data-tour-panel]'?panel:status,contains:control=>control.inside!==false,addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:(type,fn)=>{assert.equal(handlers.get(type),fn);handlers.delete(type);}};
  const dispose=mountLabTutorial(root),click=handlers.get('click');
  const send=(action,value,extra={})=>click({target:{closest:()=>({dataset:{tourAction:action,...(value===undefined?{}:{tourValue:String(value)})},...extra})}});
  send('ask');
  assert.match(status.textContent,/Question asked/);
  send('clue',0);
  assert.match(status.textContent,/1 of 2 clues/);
  const previous=panel.innerHTML;
  send('clue',1,{inside:false});
  send('clue',1,{disabled:true});
  send('__proto__');
  assert.equal(panel.innerHTML,previous);
  send('next');
  assert.match(panel.innerHTML,/TRY IT · STEP 1 OF 5/);
  send('clue',1);
  send('next');
  assert.match(panel.innerHTML,/TRY IT · STEP 2 OF 5/);
  assert.equal(focused.at(-1),'#tutorial-task-title');
  dispose();
  assert.equal(handlers.size,0);
  const disposed=panel.innerHTML;
  send('reset');
  assert.equal(panel.innerHTML,disposed);
  assert.doesNotThrow(()=>mountLabTutorial({querySelector:()=>null})());
});

test('completed actions move keyboard focus to the next required tour control',()=>{
  const focused=[],handlers=new Map();
  const panel={innerHTML:'',querySelector:selector=>({disabled:/^\[data-tour-action="(?:ask|save-idea|save-attempt|verify)"\]$/.test(selector),focus:()=>focused.push(selector)})};
  const status={textContent:'',focus:()=>focused.push('status')};
  const root={querySelector:selector=>selector==='[data-tour-panel]'?panel:status,contains:()=>true,addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:()=>{}};
  const dispose=mountLabTutorial(root);
  const send=(action,value)=>handlers.get('click')({target:{closest:()=>({dataset:{tourAction:action,...(value===undefined?{}:{tourValue:String(value)})}})}});
  send('ask');
  assert.equal(focused.at(-1),'[data-tour-action="clue"][aria-pressed="false"]');
  for(const [action,value] of [['clue',0],['clue',1],['next'],['symptom'],['cause',0],['save-idea']]) send(action,value);
  assert.equal(focused.at(-1),'[data-tour-action="next"]:not([disabled])');
  for(const [action,value] of [['next'],['cable'],['next'],['prediction',0],['test'],['save-attempt']]) send(action,value);
  assert.equal(focused.at(-1),'[data-tour-action="next"]:not([disabled])');
  send('cable');send('test');send('save-attempt');
  assert.equal(focused.at(-1),'[data-tour-action="cable"]');
  send('cable');send('test');send('save-attempt');send('next');send('verify');
  assert.equal(focused.at(-1),'[data-tour-action="finish"]:not([disabled])');
  assert.equal(focused.includes('status'),false);
  dispose();
});
