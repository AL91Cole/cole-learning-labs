import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {SCENARIOS} from '../src/scenarios.js';

const source=(await readFile(new URL('../src/classroom-portal.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/u,'');

for(const teacher of [false,true])test(`the ${teacher?'teacher':'student'} portal starts and stays offline even with stale live state`,async()=>{
  const main={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null},status={textContent:''};
  let requests=0;
  const poison=new Proxy({},{get(){assert.fail('Closed portal inspected private request fields or storage.');}});
  const context=vm.createContext({SCENARIOS,Date,URL,
    document:{body:{dataset:{portal:teacher?'teacher':'student'}},activeElement:null,hidden:false,
      querySelector:selector=>selector==='#portal-main'?main:selector==='#portal-service-status'?status:null,
      querySelectorAll:()=>[],addEventListener(){}},
    window:{addEventListener(){}},localStorage:poison,
    fetch(){requests++;assert.fail('The closed portal made a network request.');},
    setTimeout(){assert.fail('The closed portal scheduled network work.');},clearTimeout(){},poison});
  await vm.runInContext(source,context);
  assert.equal(requests,0);assert.match(main.innerHTML,/Live classroom tools are unavailable/u);
  assert.match(status.textContent,/unavailable.*Independent labs.*demo/su);
  await assert.rejects(vm.runInContext('api(poison,"PUT",poison,poison)',context),error=>error.status===503);
  await vm.runInContext('model.mode="live";model.session={role:"teacher"};model.selectedClass="stale";model.detail={};syncPolling();refresh();',context);
  assert.equal(requests,0);
  vm.runInContext('startDemo();',context);
  assert.match(main.innerHTML,/FICTIONAL|DEMO/u);assert.equal(requests,0);
});
