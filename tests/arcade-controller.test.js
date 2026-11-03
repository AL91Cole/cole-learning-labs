import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {renderArcadeGame,mountArcade,renderArcadeCatalogue,mountArcadeCatalogue} from '../src/arcade.js';
import {arcadeMeta,ARCADE_CATALOG} from '../src/arcade-catalog.js';
import {arcadeLevel} from '../src/arcade-model.js';
import {learningRoute} from '../src/learning-tools.js';
import {routeAccess} from '../src/access-policy.js';
function fixture(id){
  const listeners=new Map(),status={textContent:''};let buttons=[],html='';
  const host={set innerHTML(value){html=value;buttons=[...value.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>{const node={dataset:{ga:attrs.match(/data-ga="([^"]+)"/)?.[1],value:attrs.match(/data-value="([^"]+)"/)?.[1]},disabled:/ disabled/.test(attrs),focus(){},setAttribute(){}};node.closest=()=>node;return node;});},get innerHTML(){return html;},replaceChildren(){html='';buttons=[];}};
  host.innerHTML=renderArcadeGame(id);
  const picture={innerHTML:'',attrs:{},hasAttribute:name=>name==='data-rover-picture',setAttribute(name,value){this.attrs[name]=value;}},frame={textContent:''};
  const root={contains:node=>buttons.includes(node),querySelector:selector=>selector==='[data-arcade-board]'?host:selector==='[data-arcade-status]'?status:selector==='[data-rover-picture]'?(arcadeLevel(id).kind==='coding'?picture:null):selector==='[data-rover-frame]'?frame:selector==='[data-ga="play-trace"]'?buttons.find(button=>button.dataset.ga==='play-trace'):buttons.find(button=>button.dataset.ga==='run'),querySelectorAll:()=>buttons,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);}};
  return {root,host,status,listeners,picture,frame,button:(action,value)=>buttons.find(b=>b.dataset.ga===action&&b.dataset.value===(value===undefined?undefined:String(value))),click:button=>listeners.get('click')?.({target:button})};
}

test('game completion signal requires the actual successful modeled run',()=>{
  const f=fixture('garden-rover');let completed=0;const cleanup=mountArcade(f.root,{id:'garden-rover',animate:false,onComplete:()=>completed++});
  f.click(f.button('run'));assert.equal(completed,0);
  for(const command of ['E','E','E','E','S','S','S','S'])f.click(f.button('append',command));
  assert.equal(completed,0);f.click(f.button('run'));assert.equal(completed,1);cleanup();
});

test('rover playback follows the computed trace without replacing focused controls and cancels stale frames',()=>{
  const f=fixture('garden-rover'),tasks=new Map();let id=0;
  const cleanup=mountArcade(f.root,{id:'garden-rover',animate:true,schedule:fn=>{tasks.set(++id,fn);return id;},cancel:key=>tasks.delete(key)});
  for(const command of ['E','E','S'])f.click(f.button('append',command));
  f.click(f.button('run'));assert.equal(tasks.size,1);assert.match(f.picture.attrs['aria-label'],/row 1, column 1/u);
  const run=f.button('run'),tick=()=>{const [key,fn]=tasks.entries().next().value;tasks.delete(key);fn();};
  tick();assert.match(f.picture.attrs['aria-label'],/row 1, column 2/u);assert.equal(f.button('run'),run,'Playback must retain native controls and their focus.');
  const late=[...tasks.values()][0];f.click(f.button('play-trace'));assert.equal(tasks.size,0);
  const paused=f.picture.innerHTML;late();assert.equal(f.picture.innerHTML,paused);
  f.click(f.button('play-trace'));assert.equal(tasks.size,1);assert.match(f.picture.attrs['aria-label'],/row 1, column 1/u);
  f.click(f.button('append','S'));assert.equal(tasks.size,0);assert.doesNotMatch(f.host.innerHTML,/Mission complete/u);
  f.click(f.button('run'));assert.equal(tasks.size,1);const afterDispose=[...tasks.values()][0];cleanup();cleanup();assert.equal(tasks.size,0);afterDispose();assert.equal(f.host.innerHTML,'');
});

test('reduced-motion rover runs show their actual final position without scheduling animation',()=>{
  const f=fixture('garden-rover'),cleanup=mountArcade(f.root,{id:'garden-rover',animate:false,schedule(){assert.fail('Reduced motion scheduled playback.');}});
  f.click(f.button('append','E'));f.click(f.button('run'));
  assert.match(f.picture.attrs['aria-label'],/row 1, column 2/u);assert.match(f.status.textContent,/without animation/u);assert.doesNotMatch(f.host.innerHTML,/Mission complete/u);cleanup();
});
test('every network tile announces its four-column location and current ports after rotation',()=>{
  const labels=html=>[...html.matchAll(/data-ga="rotate" data-value="(\d+)"[^>]*aria-label="([^"]+)"/gu)];
  for(const game of ARCADE_CATALOG.filter(item=>item.track==='network')){
    const html=renderArcadeGame(game.id),tiles=labels(html);
    assert.equal(tiles.length,16);
    for(const [,raw,label] of tiles){
      const cell=Number(raw);
      assert.ok(label.includes(`grid row ${Math.floor(cell/4)+1}, column ${cell%4+1}`),label);
      assert.match(label,/unavailable|connects (?:top|right|bottom|left)(?: and (?:top|right|bottom|left))* · rotate clockwise/u);
    }
  }
  const f=fixture('packet-post'),cleanup=mountArcade(f.root,{id:'packet-post'});
  assert.match(labels(f.host.innerHTML)[0][2],/connects top and bottom/u);
  f.click(f.button('rotate',0));
  assert.match(labels(f.host.innerHTML)[0][2],/connects right and left/u);
  assert.match(labels(f.host.innerHTML)[4][2],/grid row 2, column 1/u);
  cleanup();
});

test('all rover rooms retain accurate five-column cargo and wall text maps',()=>{
  const location=cell=>`row ${Math.floor(cell/5)+1}, column ${cell%5+1}`;
  for(const game of ARCADE_CATALOG.filter(item=>item.track==='coding')){
    const f=fixture(game.id),cleanup=mountArcade(f.root,{id:game.id});
    for(const [index,room]of arcadeLevel(game.id).fixtures.entries()){
      if(index)f.click(f.button('room',index));
      assert.doesNotMatch(f.host.innerHTML,/Infinity|NaN/u,game.id);
      assert.ok(f.host.innerHTML.includes('Cargo: '+room.stars.map(location).join('; ')+'.'),game.id+': cargo');
      assert.ok(f.host.innerHTML.includes('Walls: '+(room.blocks.map(location).join('; ')||'none')+'.'),game.id+': walls');
    }
    cleanup();
  }
});
test('delegated game controls update actual boards, reject detached/outside events and dispose cleanly',()=>{
  const f=fixture('packet-post'),cleanup=mountArcade(f.root,{id:'packet-post'}),old=f.button('rotate',0);
  f.click(old);assert.match(f.status.textContent,/Setup changed/);const changed=f.host.innerHTML;f.click(old);assert.equal(f.host.innerHTML,changed);
  const outside={dataset:{ga:'run'},closest(){return this;}};f.click(outside);assert.equal(f.host.innerHTML,changed);
  f.click(f.button('run'));assert.match(f.host.innerHTML,/Try another plan/);
  const stale=f.button('run');cleanup();cleanup();assert.equal(f.listeners.size,0);assert.equal(f.host.innerHTML,'');f.click(stale);assert.equal(f.host.innerHTML,'');
});
test('selecting an AI card and a basket moves that card; selection alone never completes the game',()=>{
  const f=fixture('shape-sprouts'),cleanup=mountArcade(f.root,{id:'shape-sprouts'});
  f.click(f.button('select-card','s1'));assert.match(f.status.textContent,/Card selected/);assert.doesNotMatch(f.host.innerHTML,/Mission complete/);
  f.click(f.button('basket','round'));assert.match(f.host.innerHTML,/1 \/ 6 cards placed/);f.click(f.button('run'));assert.match(f.host.innerHTML,/Try another plan/);cleanup();
});
test('the actual router opens all 25 game routes without records, AI, collection or ticket workflows',()=>{
  const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),calls={mounted:[],disposed:[],gates:0},nodes=new Map();
  const node=()=>({innerHTML:'',classList:{add(){},remove(){}},setAttribute(){}}),$=selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);};
  const forbidden=()=>assert.fail('Arcade route reached records, collection, reporting, AI or ticket controls.');
  const context=vm.createContext({OWNER_PREVIEW:false,MEMBER_CONTENT:true,routeAccess,learningRoute,arcadeMeta,renderArcadeGame,renderArcadeCatalogue,
    location:{hash:'#arcade'},document:{body:node(),title:''},window:{scrollTo(){}},$,$$:()=>[],labNavigation:null,currentLab:null,routeCleanup:null,reportCleanup:null,classroomConnection:null,
    disposeHardware(){},preserveCodeDraft(){},mountArcadeCatalogue(){return ()=>{};},mountArcade(_root,{id}){calls.mounted.push(id);return ()=>calls.disposed.push(id);},renderSignIn:()=>'<h1>Sign in</h1>',membershipGate(){calls.gates++;return '<h1>Unavailable</h1>';},
    recordFor:forbidden,save:forbidden,bindWorkPrivacy:forbidden,mountWorkControls:forbidden,mountRequesterChat:forbidden,mountLabImprovements:forbidden,attachClassroomLab:forbidden,openReport:forbidden,fetch:forbidden,XMLHttpRequest:forbidden
  });
  vm.runInContext(source.slice(source.indexOf('function activityNotFound('),source.indexOf('\nfunction membershipGate(')),context);
  const start=source.indexOf('function renderRoute('),end=source.indexOf('\nfunction setSiteMenuOpen(',start);vm.runInContext(source.slice(start,end),context);
  context.renderRoute();assert.match(nodes.get('#main').innerHTML,/25 original game labs/);
  for(const game of ARCADE_CATALOG){context.location.hash='#arcade/'+game.id;context.renderRoute();assert.equal(calls.mounted.at(-1),game.id);assert.doesNotMatch(nodes.get('#main').innerHTML,/lab-improvement-summary|work-privacy|lab-shell/);}
  context.location.hash='#signin';context.renderRoute();assert.deepEqual(calls.disposed,ARCADE_CATALOG.map(g=>g.id));
  context.location.hash='#arcade/packet-post/extra';context.renderRoute();assert.equal(calls.gates,0);assert.match(nodes.get('#main').innerHTML,/Activity not found/u);assert.equal(calls.mounted.length,25);
  assert.equal(typeof mountArcadeCatalogue,'function');
});
