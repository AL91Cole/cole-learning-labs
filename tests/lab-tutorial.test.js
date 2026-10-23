import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLabTutorial,mountLabTutorial} from '../src/lab-tutorial.js';

test('the tutorial explains the complete gated workflow and the separate free-code route',()=>{
  const html=renderLabTutorial();
  assert.match(html,/at least two clues/);
  assert.match(html,/separate box/);
  assert.match(html,/Save first idea/);
  assert.match(html,/Experiment notebook/);
  assert.match(html,/Downloading a report does not submit it/);
  assert.match(html,/closing or reloading/i);
  assert.match(html,/href="#sandbox"/);
  assert.match(html,/No ticket|no ticket/);
  assert.match(html,/AC is disconnected, and the side panel is removed/);
  assert.match(html,/monitor’s small <strong>Input<\/strong> button/);
  assert.doesNotMatch(html,/<script|onclick=|localStorage/);
});

test('tutorial section controls move keyboard focus to an existing heading and dispose cleanly',()=>{
  const html=renderLabTutorial(),targets=[...html.matchAll(/data-tutorial-target="([^"]+)"/g)].map(match=>match[1]);
  const handlers=new Map(),seen=[];
  const root={addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:(type,fn)=>{assert.equal(handlers.get(type),fn);handlers.delete(type);},contains:()=>true,querySelector:selector=>({focus:()=>seen.push(['focus',selector]),scrollIntoView:()=>seen.push(['scroll',selector])})};
  const dispose=mountLabTutorial(root);
  for(const id of targets){
    assert.ok(html.includes(`id="tutorial-${id}" tabindex="-1"`));
    const button={dataset:{tutorialTarget:id}};
    handlers.get('click')({target:{closest:()=>button}});
    assert.deepEqual(seen.splice(0),[['focus','#tutorial-'+id],['scroll','#tutorial-'+id]]);
  }
  handlers.get('click')({target:{closest:()=>({dataset:{tutorialTarget:'__proto__'}})}});
  assert.deepEqual(seen,[]);
  dispose();assert.equal(handlers.size,0);
});
