import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {INBOX_ROUNDS,PICTURE_ROUNDS,initialInboxGame,inboxGameAction,renderInboxDefender,renderInboxDefenderEntry,mountInboxDefender} from '../src/inbox-defender.js';
import {routeAccess} from '../src/access-policy.js';
import {learningRoute} from '../src/learning-tools.js';
import {initialWorkspaceState,verifyWorkspace} from '../src/workspaces.js';
const inspect = state => ['sender','destination','context'].reduce((s,id)=>inboxGameAction(s,'inspect',id),state);
const decide = (state,value) => inboxGameAction(inboxGameAction(state,'decide',value),'check');

test('all five rounds require inspected evidence and the authored response before advancing',()=>{
  let state=initialInboxGame();
  for(const [index,round] of INBOX_ROUNDS.entries()){
    assert.equal(state.round,index);
    assert.equal(inboxGameAction(state,'next'),state,'Cannot skip a message');
    state=decide(state,round.decision);assert.equal(state.resolved,false,'A lucky choice without evidence cannot advance');
    state=inspect(state);
    for(const wrong of ['report','verify','known'].filter(choice=>choice!==round.decision)){
      state=decide(state,wrong);assert.equal(state.resolved,false);assert.equal(state.round,index);assert.ok(state.feedback.length>30);
    }
    state=decide(state,round.decision);assert.equal(state.resolved,true);assert.equal(state.feedback,round.feedback);
    assert.equal(inboxGameAction(state,'check'),state,'Repeat clicks cannot create extra progress');
    assert.equal(inboxGameAction(state,'decide','known'),state,'A resolved decision remains fixed');
    state=inboxGameAction(state,'next');
  }
  assert.equal(state.finished,true);assert.equal(state.round,4);
  assert.equal(inboxGameAction(state,'next'),state);assert.equal(inboxGameAction(state,'inspect','sender'),state);
  assert.deepEqual(inboxGameAction(state,'restart'),initialInboxGame());
});
test('unknown actions, imported markup and arbitrary destinations have no authority',()=>{
  const state=initialInboxGame();
  for(const action of ['run-check','save','fetch','next','__proto__','constructor','approve'])assert.equal(inboxGameAction(state,action,'report'),state);
  for(const value of ['https://real.example/','<img src=x onerror=alert(1)>','__proto__','constructor','sender"]']){
    assert.equal(inboxGameAction(state,'inspect',value),state);assert.equal(inboxGameAction(state,'decide',value),state);
  }
  for(const invalid of [null,{},[],{round:-1,inspected:[]},{round:5,inspected:[]},{round:NaN,inspected:[]}])assert.deepEqual(inboxGameAction(invalid,'next'),initialInboxGame());
  let inspected=inboxGameAction(state,'inspect','sender');
  inspected=inboxGameAction(inspected,'inspect','sender');assert.equal(inspected.inspected.length,1);assert.deepEqual(inspected.opened,[],'Collapsing a clue preserves inspection history');
  assert.ok(Object.isFrozen(INBOX_ROUNDS));assert.ok(Object.isFrozen(INBOX_ROUNDS[0].required));
});
test('clue disclosures can be reopened after a decision without invalidating or duplicating progress',()=>{
  let state=decide(inspect(initialInboxGame()),'report');
  state=inboxGameAction(state,'inspect','sender');assert.equal(state.resolved,true);assert.equal(state.feedback,INBOX_ROUNDS[0].feedback);assert.equal(state.opened.includes('sender'),false);
  state=inboxGameAction(state,'inspect','sender');assert.equal(state.opened.includes('sender'),true);assert.equal(state.inspected.length,3);
  assert.equal(inboxGameAction(state,'next').round,1);
});
test('picture patrol uses its own younger prompts and two responses; switching modes and replay start fresh',()=>{
  let state=inboxGameAction(decide(inspect(initialInboxGame()),'report'),'mode','picture');
  assert.equal(state.mode,'picture');assert.equal(state.round,0);assert.deepEqual(state.inspected,[]);
  for(const round of PICTURE_ROUNDS){
    state=decide(state,round.decision);assert.equal(state.resolved,false,'A picture choice still needs a clue');
    state=inboxGameAction(state,'inspect','context');
    assert.equal(inboxGameAction(state,'decide','verify'),state,'Advanced third response is not a picture control');
    state=decide(state,round.decision==='report'?'known':'report');assert.equal(state.resolved,false);
    state=decide(state,round.decision);assert.equal(state.resolved,true);state=inboxGameAction(state,'next');
  }
  assert.equal(state.finished,true);assert.deepEqual(inboxGameAction(state,'restart'),initialInboxGame('picture'));
  assert.deepEqual(inboxGameAction(state,'mode','older'),initialInboxGame());
  assert.equal(inboxGameAction(state,'mode','__proto__'),state);
});
test('only the exact game route is public and query claims cannot open protected content',()=>{
  assert.equal(routeAccess(learningRoute('#play/inbox-defender')),'public');
  for(const hash of ['#play','#play/SEC-403','#play/inbox-defender/extra','#play/inbox-defender/','#play/INBOX-DEFENDER','#play/inbox%2Ddefender'])assert.equal(routeAccess(learningRoute(hash)),'unknown',hash);
  assert.equal(routeAccess(learningRoute('#lab/SEC-403?gameComplete=true&member=true&owner=true')),'member');
  assert.equal(routeAccess(learningRoute('#play/inbox-defender?round=5&complete=true')),'public');
  assert.match(renderInboxDefender(),/01 \/ 05/,'URL progress is never read');
});
test('public game has inert messages, accessible controls and no workspace completion capability',async()=>{
  const html=renderInboxDefender();
  assert.match(renderInboxDefenderEntry(),/#play\/inbox-defender/);
  assert.match(html,/data-inbox-announcement role="status" aria-live="polite"/);
  assert.match(html,/aria-current="step"/);assert.match(html,/aria-expanded="false" aria-controls="id-clue-sender"/);
  assert.match(html,/<svg viewBox="0 0 540 200" role="img" aria-labelledby="id-scene-title">/);
  assert.match(html,/Picture patrol · K–6/);assert.match(html,/Evidence challenge · 7–12/);
  assert.doesNotMatch(html,/<form\b|<input\b|<iframe\b|<script\b|href="https?:|onclick=/i);
  const source=await readFile(new URL('../src/inbox-defender.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|eval|Function|setInterval|setTimeout)\s*\(|\b(?:localStorage|sessionStorage|document\.cookie)\b/m);
  assert.deepEqual([...source.matchAll(/^import[^\n]+from\s+(['"])([^'"]+)\1;?$/gmu)].map(match=>match[2]),['./activity-guidance.js?release=20261105-receipt-review'],'The only dependency is the reviewed local instruction renderer.');
  const workspace=initialWorkspaceState('SEC-401'),before=structuredClone(workspace);
  let game=initialInboxGame();for(const round of INBOX_ROUNDS)game=inboxGameAction(decide(inspect(game),round.decision),'next');
  assert.equal(game.finished,true);assert.deepEqual(workspace,before);assert.equal(verifyWorkspace('SEC-401',workspace).ok,false);
});

// Exercise the actual delegated controller, including detached buttons and disposal.
function fixture(){
  const listeners=new Map(),announcement={textContent:''};let buttons=[],markup='';
  const host={
    addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);},
    contains:node=>buttons.includes(node),querySelector:()=>({focus(){}}),querySelectorAll:()=>buttons,
    replaceChildren(){markup='';buttons=[];},
    set innerHTML(value){markup=value;buttons=[...value.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>{const node={dataset:{idAction:attrs.match(/data-id-action="([^"]+)"/)?.[1],idValue:attrs.match(/data-id-value="([^"]+)"/)?.[1]},disabled:/ disabled/.test(attrs),focus(){}};node.closest=()=>node;return node;});},
    get innerHTML(){return markup;}
  };
  const root={querySelector:selector=>selector==='[data-inbox-game]'?host:announcement};
  host.innerHTML=renderInboxDefender();
  return {root,host,announcement,listeners,getButton:(action,value)=>buttons.find(node=>node.dataset.idAction===action&&node.dataset.idValue===value),fire:node=>listeners.get('click')?.({target:node})};
}
test('controller reveals clues, announces feedback, keeps retries local and releases handlers',()=>{
  const f=fixture(),cleanup=mountInboxDefender(f.root);
  const detached=f.getButton('inspect','sender');f.fire(detached);assert.match(f.host.innerHTML,/aria-expanded="true"/);
  assert.match(f.announcement.textContent,/verify@school-account-check.invalid/);
  const current=f.host.innerHTML;f.fire(detached);assert.equal(f.host.innerHTML,current,'Detached event cannot be replayed');
  f.fire(f.getButton('inspect','destination'));f.fire(f.getButton('decide','report'));f.fire(f.getButton('check'));
  assert.match(f.host.innerHTML,/Decision supported/);assert.match(f.announcement.textContent,/lookalike/);
  f.fire(f.getButton('next'));assert.match(f.host.innerHTML,/02 \/ 05/);assert.match(f.announcement.textContent,/Message 2/);
  const stale=f.getButton('inspect','sender');cleanup();cleanup();assert.equal(f.listeners.size,0);assert.equal(f.host.innerHTML,'');f.fire(stale);assert.equal(f.host.innerHTML,'');
});
test('picture mode paints a distinct message and the outcome scene changes only after supported decisions',()=>{
  const f=fixture(),cleanup=mountInboxDefender(f.root);
  f.fire(f.getButton('mode','picture'));assert.match(f.host.innerHTML,/A game wants your real name/);assert.match(f.host.innerHTML,/Read and play with a trusted adult/);
  assert.doesNotMatch(f.host.innerHTML,/Verify another way|id-scene id-scene-resolved/);
  f.fire(f.getButton('decide','report'));assert.doesNotMatch(f.host.innerHTML,/id-scene id-scene-resolved/);
  f.fire(f.getButton('check'));assert.match(f.host.innerHTML,/Open “What you already know”/);
  f.fire(f.getButton('inspect','context'));f.fire(f.getButton('check'));assert.match(f.host.innerHTML,/id-scene id-scene-resolved/);assert.match(f.host.innerHTML,/Paused for adult help/);
  f.fire(f.getButton('next'));assert.match(f.host.innerHTML,/Time for the class picture puzzle/);
  f.fire(f.getButton('inspect','context'));f.fire(f.getButton('decide','known'));f.fire(f.getButton('check'));assert.match(f.host.innerHTML,/id-scene-delivered/);
  cleanup();
});
