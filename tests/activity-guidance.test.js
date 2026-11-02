import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_GUIDES,renderLearningBrief,renderNextChallenge,investigationNextStep,mountLearningGuides} from '../src/activity-guidance.js';
import {ARCADE_CATALOG} from '../src/arcade-catalog.js';
import {arcadeGamesFor} from '../src/arcade.js';
import {courseAction,initialCourse,courseChip} from '../src/code-course-model.js';
import {CODE_QUESTS} from '../src/code-quest-catalog.js';
import {renderArcadeGame} from '../src/arcade.js';
import {renderCodeQuest} from '../src/code-quests.js';
import {ELEMENTARY_LABS,renderElementaryLab} from '../src/elementary-labs.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';
import {renderFoundationLab} from '../src/foundation-labs.js';
import {renderInboxDefender} from '../src/inbox-defender.js';

test('every game has a concrete first move and age filters combine with topics',()=>{
  for(const game of ARCADE_CATALOG){
    const guide=GAME_GUIDES[game.track];assert.ok(guide.first.length>20);assert.equal(guide.steps.length,3);
    assert.match(renderLearningBrief({...guide,target:'arcade-'+game.track}),/data-guide-target="arcade-/u);
  }
  const younger=arcadeGamesFor('all','elementary'),older=arcadeGamesFor('all','secondary');
  assert.equal(younger.length+older.length,25);assert.ok(younger.length>5&&older.length>5);
  for(const track of ['hardware','network','ai','security','coding']){
    assert.ok(arcadeGamesFor(track,'elementary').every(game=>game.track===track&&younger.includes(game)));
    assert.ok(arcadeGamesFor(track,'secondary').every(game=>game.track===track&&older.includes(game)));
  }
  assert.deepEqual(arcadeGamesFor('all','forged'),[]);
});

test('every game, language path, elementary activity, beginner course and inbox mission includes actionable instructions',()=>{
  const pages=[...ARCADE_CATALOG.map(game=>renderArcadeGame(game.id)),...CODE_QUESTS.map(course=>renderCodeQuest(course.id)),...ELEMENTARY_LABS.map(lab=>renderElementaryLab(lab.id)),...FOUNDATION_LABS.map(lab=>renderFoundationLab(lab)),renderInboxDefender()];
  assert.equal(pages.length,58);
  for(const html of pages){assert.match(html,/aria-label="Activity instructions"/u);assert.match(html,/data-guide-target="[a-z-]+"/u);assert.match(html,/<summary>How this works<\/summary>/u);}
});

test('guidance moves focus to an available authored control without clicking, submitting or earning progress',()=>{
  let focus=0,scroll=0;const handlers=new Map();
  const target={disabled:false,closest:()=>null,getClientRects:()=>[{}],focus(){focus++;},scrollIntoView(){scroll++;},click(){assert.fail('Guidance performed the task.');}};
  const hidden={...target,getClientRects:()=>[]},button={dataset:{guideTarget:'lab-question'},closest(){return this;}};
  const root={contains:node=>node===button,querySelectorAll:selector=>{assert.equal(selector,'#student-question');return [hidden,target];},addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:type=>handlers.delete(type)};
  const dispose=mountLearningGuides(root),click=handlers.get('click');click({target:button});assert.equal(focus,1);assert.equal(scroll,1);
  button.dataset.guideTarget='__proto__';click({target:button});assert.equal(focus,1);
  button.dataset.guideTarget='lab-question';dispose();dispose();click({target:button});assert.equal(focus,1);assert.equal(handlers.size,0);
});

test('investigation coaching follows real intake, notebook, freshness and explanation requirements',()=>{
  const initial=Object.freeze({section:1,asked:false,clarified:false,clues:0,symptoms:false,hypothesis:false,saved:false});
  assert.equal(investigationNextStep(initial).target,'lab-question');
  let state={...initial,asked:true,clarified:true};assert.equal(investigationNextStep(state).target,'lab-clue');
  state={...state,clues:2};assert.equal(investigationNextStep(state).target,'lab-symptoms');
  state={...state,symptoms:true};assert.equal(investigationNextStep(state).target,'lab-plan');
  state={...state,hypothesis:true};assert.equal(investigationNextStep(state).target,'lab-save');
  assert.equal(investigationNextStep({...state,saved:true}).target,'lab-next');
  assert.equal(investigationNextStep({section:2,passed:true,answered:false}).target,'lab-notebook');
  assert.equal(investigationNextStep({section:2,passed:true,answered:true,current:false}).target,'lab-test');
  assert.equal(investigationNextStep({section:2,ready:true}).target,'lab-explain');
  assert.equal(investigationNextStep({section:3}).target,'lab-verify');
  assert.equal(investigationNextStep({section:3,verified:true}).target,'lab-notes');
  assert.equal(investigationNextStep({section:3,verified:true,notes:true}).target,'lab-reflection');
  assert.equal(investigationNextStep({section:3,verified:true,notes:true,reflection:true}).target,'lab-finish');
  assert.equal(initial.asked,false);
});

test('instruction text is escaped and next links cannot become external requests or scripts',()=>{
  const html=renderLearningBrief({first:'<img src=x onerror=alert(1)>',steps:['<script>private</script>'],target:'__proto__'});
  assert.doesNotMatch(html,/<img|<script|data-guide-target/u);assert.match(html,/&lt;img/u);
  for(const href of ['https://external.invalid','javascript:alert(1)','#<script>'])assert.equal(renderNextChallenge({href,title:'Try this'}),'');
  assert.match(renderNextChallenge({href:'#explore/EX-HW-1',title:'<safe>'}),/&lt;safe&gt;/u);
  const source=readFileSync(new URL('../src/activity-guidance.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/^import\b|\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|sendBeacon)\b/mu);
});

test('all language paths give useful feedback and lesson replay requires a new successful check',()=>{
  for(const quest of CODE_QUESTS){
    let state=initialCourse(quest.id);state=courseAction(state,'check');assert.match(state.feedback,/Choose a code chip/u);
    state=courseAction(state,'choose','bye');state=courseAction(state,'check');assert.equal(state.passed,false);assert.match(state.feedback,/Compare/u);
    state=courseAction(state,'choose','hello');state=courseAction(state,'check');assert.equal(state.passed,true);assert.match(state.feedback,/You made/u);
    state=courseAction(state,'retry');assert.equal(state.lesson,0);assert.equal(state.passed,false);assert.equal(state.output,null);
    assert.equal(courseAction(state,'next'),state);assert.equal(state.choice,null);
    state=courseAction(state,'choose','hello');state=courseAction(state,'check');state=courseAction(state,'next');
    assert.equal(state.lesson,1);assert.equal(courseChip(quest.id,'six'),'6');
  }
});
