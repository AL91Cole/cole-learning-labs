import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ARCADE_CATALOG} from '../src/arcade-catalog.js';
import {ARCADE_LEVELS,HARDWARE_SLOTS} from '../src/arcade-levels.js';
import {arcadeLevel,initialArcadeState,arcadeAction,evaluateArcade,ROVER_COMMANDS} from '../src/arcade-model.js';
import {renderArcadeGame,renderArcadeCatalogue} from '../src/arcade.js';
import {learningRoute} from '../src/learning-tools.js';
import {routeAccess} from '../src/access-policy.js';
const act=(id,state,action,value)=>arcadeAction(id,state,action,value).state;
const programs={
  'garden-rover':['E','E','E','E','S','S','S','S'],
  'loop-lagoon':['E2','S2','S2','E2'],
  'branch-bridge':['E','IF','IF','E'],
  'delivery-drone':['S','E','S','S','S','E','E','N','N','N','E','S','S','S'],
  'bug-trail':['E','E','E','E','S','S']
};
function solve(id){
  const level=arcadeLevel(id);let s=initialArcadeState(id);
  if(level.kind==='network')for(let i=0;i<16;i++)if(!level.blocked.includes(i))while(s.rotations[i])s=act(id,s,'rotate',i);
  if(level.kind==='hardware'){
    const parts={cpu:'eco',ram:level.ram===16?'ram16':'ram8',drive:'archive',cooler:level.maxNoise===1?'tower':'fan',psu:level.dedicated?'psu350':'psu150',gpu:level.dedicated?'graphics':'integrated'};
    for(const [slot,part]of Object.entries(parts)){s=act(id,s,'select-part',part);s=act(id,s,'fit',slot);}s=act(id,s,'plug');s=act(id,s,'power');
  }
  if(level.kind==='security')for(const gate of ['identity','scope','override'])s=act(id,s,'gate',gate);
  if(level.kind==='ai')for(const card of level.cards){s=act(id,s,'select-card',card.id);s=act(id,s,'basket',card.bin);}
  if(level.kind==='coding'){s=act(id,s,'clear');for(const command of programs[id])s=act(id,s,'append',command);}
  return s;
}
test('25 separately authored games add five activities to each category with unique routes and objectives',()=>{
  assert.equal(ARCADE_CATALOG.length,25);assert.equal(new Set(ARCADE_CATALOG.map(game=>game.id)).size,25);
  for(const category of ['network','hardware','security','ai','coding'])assert.equal(ARCADE_CATALOG.filter(game=>game.track===category).length,5);
  for(const game of ARCADE_CATALOG){assert.ok(arcadeLevel(game.id));assert.ok(Object.isFrozen(game));assert.ok(Object.isFrozen(ARCADE_LEVELS[game.id]));assert.equal(routeAccess(learningRoute('#arcade/'+game.id)),game.access==='free'?'public':'member');}
  assert.equal((renderArcadeCatalogue().match(/class="ga-game-card"/g)||[]).length,25);
  for(const bad of ['#arcade/not-a-game','#arcade/packet-post/extra','#arcade/__proto__','#arcade/SEC-403','#arcade/packet%2Dpost'])assert.equal(routeAccess(learningRoute(bad)),'unknown',bad);
});
for(const game of ARCADE_CATALOG)test(game.title+' has a real failed start, a playable solution and fresh reset',()=>{
  const initial=initialArcadeState(game.id);assert.equal(initial.result,null);assert.equal(evaluateArcade(game.id,initial).ok,false);
  const solved=solve(game.id);assert.equal(solved.result,null,'Changing the board alone awards nothing');
  const checked=act(game.id,solved,'run');assert.equal(checked.result.ok,true,JSON.stringify(checked.result));
  assert.deepEqual(act(game.id,checked,'reset'),initial);
  const html=renderArcadeGame(game.id);assert.match(html,/data-arcade-status role="status"/);assert.match(html,/data-ga="run"/);assert.doesNotMatch(html,/<input\b|<form\b|<iframe\b|<script\b|onclick=/i);
});
test('routing checks a real connected path, isolation, gateway and hop allowance',()=>{
  const id='packet-post';let s=solve(id);s.rotations[0]=1;assert.equal(evaluateArcade(id,s).ok,false,'Disconnected entry is not a delivery');
  const long=solve('hop-count-hike');assert.equal(evaluateArcade('hop-count-hike',long).hops,6);
  const isolated=solve('vlan-village');assert.equal(evaluateArcade('vlan-village',isolated).reached.includes(6),false);
  const gateway=solve('gateway-garden');assert.ok(evaluateArcade('gateway-garden',gateway).path.includes(6));
});
test('hardware edits obey virtual power interlocks; compatibility, original files and power are independent',()=>{
  let s=solve('archive-rover');const before=structuredClone(s);
  s=act('archive-rover',s,'select-part','blank');const denied=arcadeAction('archive-rover',s,'fit','drive');assert.equal(denied.changed,false);assert.deepEqual(denied.state.slots,before.slots);
  s=act('archive-rover',s,'power');s=act('archive-rover',s,'plug');s=act('archive-rover',s,'fit','drive');assert.equal(s.result,null);assert.equal(evaluateArcade('archive-rover',s).ok,false);
  const wrongRam=solve('memory-match');wrongRam.slots.ram='ram5';assert.equal(evaluateArcade('memory-match',wrongRam).ok,false);
  const underpowered=solve('pixel-stage');underpowered.slots.psu='psu150';assert.equal(evaluateArcade('pixel-stage',underpowered).ok,false);
  const missing=solve('budget-bot');missing.slots.cpu=null;assert.equal(evaluateArcade('budget-bot',missing).ok,false);
  assert.equal(HARDWARE_SLOTS.length,6);
});
test('security goals reject both blocking every useful request and admitting every request',()=>{
  for(const {id,track}of ARCADE_CATALOG.filter(game=>game.track==='security')){
    const s=solve(id);s.rules.service=false;assert.equal(evaluateArcade(id,s).ok,false,id+' cannot win by denying everything');
    s.rules.service=true;s.rules.override=true;assert.equal(evaluateArcade(id,s).ok,false,id+' cannot win through an all-access bypass');
    s.rules.override=false;s.rules.scope=false;assert.equal(evaluateArcade(id,s).ok,false,id+' still needs minimum scope');
    assert.equal(track,'security');
  }
});
test('AI sorting requires all cards and uses the supplied evidence, including missing and conflicting facts',()=>{
  for(const {id}of ARCADE_CATALOG.filter(game=>game.track==='ai')){
    let s=solve(id);delete s.assignments[arcadeLevel(id).cards[0].id];assert.equal(evaluateArcade(id,s).ok,false);
    s=solve(id);s.assignments[arcadeLevel(id).cards[0].id]='not-a-basket';assert.equal(evaluateArcade(id,s).ok,false);
  }
});
test('rover programs compute all fixtures, cargo, walls, energy and instruction limits without general code',()=>{
  const branch=solve('branch-bridge'),result=evaluateArcade('branch-bridge',branch);assert.equal(result.runs.length,2);assert.ok(result.runs.every(run=>run.ok));
  branch.program=['E','E','S','E'];assert.equal(evaluateArcade('branch-bridge',branch).ok,false);
  const loop=solve('loop-lagoon');loop.program=['E','E','S','S','S','S','E','E'];assert.equal(evaluateArcade('loop-lagoon',loop).ok,false,'A correct physical path still exceeds the block budget');
  const drone=solve('delivery-drone');drone.program=['E2','E2','S2','S2'];assert.equal(evaluateArcade('delivery-drone',drone).ok,false,'Reaching home without the cargo cannot pass');
  for(const value of ['eval','fetch','while(true)','__proto__','constructor',{},null]){const s=initialArcadeState('garden-rover');assert.equal(arcadeAction('garden-rover',s,'append',value).changed,false);}
  assert.ok(Object.isFrozen(ROVER_COMMANDS));
});
test('unknown IDs, actions, outside values and late input cannot create progress or unbounded work',async()=>{
  assert.equal(arcadeLevel('__proto__'),null);assert.equal(initialArcadeState('missing'),null);
  for(const game of ARCADE_CATALOG){let s=initialArcadeState(game.id);for(const action of ['complete','save','grade','member','eval','__proto__'])assert.equal(arcadeAction(game.id,s,action,'https://real.example').changed,false);s.turns=120;assert.equal(arcadeAction(game.id,s,'run').changed,false);assert.equal(act(game.id,s,'reset').turns,0);}
  for(const filename of ['arcade.js','arcade-model.js','arcade-levels.js']){const source=await readFile(new URL('../src/'+filename,import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:eval|Function|fetch|XMLHttpRequest|WebSocket|setInterval)\s*\(|\b(?:localStorage|sessionStorage|document\.cookie)\b/);}
});
