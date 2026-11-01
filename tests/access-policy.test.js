import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CATALOG} from '../src/lab-catalog.js';
import {FREE_LAB_IDS_BY_TOPIC,FREE_LAB_IDS,isFreeLab,routeAccess,MEMBER_CONTENT} from '../src/access-policy.js';
import {SCENARIOS} from '../src/scenarios.js';
import {FOUNDATION_LABS} from '../src/foundation-model.js';

test('the reviewed catalogue exposes only safe metadata for 42 cases and exactly two free cases per topic',()=>{
  assert.equal(CATALOG.length,42);assert.equal(new Set(CATALOG.map(lab=>lab.id)).size,42);
  assert.equal(CATALOG.filter(lab=>lab.access==='free').length,10);
  assert.equal(CATALOG.filter(lab=>lab.access==='member').length,32);
  assert.deepEqual(FREE_LAB_IDS,['INC-101','INC-102','NET-201','NET-202','AI-301','AI-302','SEC-401','SEC-402','CODE-501','CODE-502']);
  assert.equal(Object.isFrozen(CATALOG),true);assert.equal(Object.isFrozen(FREE_LAB_IDS_BY_TOPIC),true);
  assert.equal(Object.isFrozen(FREE_LAB_IDS),true);
  for(const [topic,ids]of Object.entries(FREE_LAB_IDS_BY_TOPIC)){
    assert.equal(ids.length,2);assert.equal(Object.isFrozen(ids),true);
    assert.deepEqual(CATALOG.filter(lab=>lab.track===topic&&lab.access==='free').map(lab=>lab.id),ids);
  }
  for(const lab of CATALOG){
    assert.equal(Object.isFrozen(lab),true);
    assert.deepEqual(Object.keys(lab).sort(),['access','grade','id','minutes','title','track']);
    const original=SCENARIOS.find(item=>item.id===lab.id);assert.ok(original);
    assert.deepEqual(lab,{id:original.id,title:original.title,track:original.track,grade:original.grade,minutes:original.minutes,access:isFreeLab(original.id)?'free':'member'});
  }
});

test('safe catalogue and policy imports never require authored scenario payloads or protected modules',async()=>{
  const catalogue=await readFile(new URL('../src/lab-catalog.js',import.meta.url),'utf8');
  assert.doesNotMatch(catalogue,/\b(?:import|require)\s*(?:\(|\{|['"])/u);
  const policy=await readFile(new URL('../src/access-policy.js',import.meta.url),'utf8');
  assert.deepEqual([...policy.matchAll(/\bfrom\s+(['"])(.*?)\1/gu)].map(match=>match[2]),['./lab-catalog.js?release=20261025-learning-plans']);
});

test('all beginner courses and their first investigations stay public',()=>{
  assert.equal(FOUNDATION_LABS.length,5);
  for(const foundation of FOUNDATION_LABS){
    assert.equal(routeAccess({page:'learn',id:foundation.id}),'public');
    assert.equal(routeAccess({page:'learn',id:foundation.code}),'public');
    assert.equal(isFreeLab(foundation.nextLab),true);
    assert.equal(routeAccess({page:'lab',id:foundation.nextLab}),'public');
  }
});

test('every direct investigation and supported practice route follows the fixed free allowlist',()=>{
  for(const lab of CATALOG){
    const expected=isFreeLab(lab.id)?'public':'member';
    assert.equal(routeAccess({page:'lab',id:lab.id}),expected);
    assert.equal(routeAccess({page:'lab',id:lab.id,mode:'challenge',sequence:'opening-day',member:true,paid:true}),expected);
    assert.equal(routeAccess({page:'practice',id:lab.id}),['network','ai','security'].includes(lab.track)?expected:'unknown');
  }
});

test('open sandboxes, studios, capstone and educator learning resources are member content',()=>{
  assert.equal(MEMBER_CONTENT,false);
  for(const id of [undefined,'','blank','pixel-pet','arcade','rover','tiles'])assert.equal(routeAccess({page:'sandbox',id}),'member');
  for(const id of ['network','coding'])assert.equal(routeAccess({page:'studio',id}),'member');
  for(const page of ['capstone','educators'])assert.equal(routeAccess({page}),'member');
  for(const page of ['home','projects','about','connect','privacy','guide','labs'])assert.equal(routeAccess({page}),'public');
  for(const id of Object.keys(FREE_LAB_IDS_BY_TOPIC))assert.equal(routeAccess({page:'labs',id}),'public');
});

test('malformed, unknown and case-changed IDs cannot become public content',()=>{
  for(const id of [undefined,null,1,{},'inc-101',' INC-101','INC-101/','INC%2D101','INC-101?member=true','constructor','__proto__']){
    assert.equal(isFreeLab(id),false);
    assert.equal(routeAccess({page:'lab',id}),'unknown');
  }
  for(const route of [null,undefined,[],{},'lab/INC-101',
    {page:'Lab',id:'INC-101'},{page:'unknown'},{page:'learn',id:'coding/extra'},
    {page:'sandbox',id:'unknown'},{page:'studio'},{page:'studio',id:'hardware'},
    {page:'privacy',id:'extra'},{page:'labs',id:'unknown'},
    {page:'capstone',id:'INC-101'},{page:'educators',id:'extra'},{page:'home',id:null}])assert.equal(routeAccess(route),'unknown');
});
