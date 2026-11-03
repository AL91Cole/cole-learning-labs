import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest as requester} from '../functions/api/requester.js';
import {onRequest as reach} from '../functions/api/reach.js';
import {turnstileEnv,turnstileReply} from './turnstile-fixture.js';
function context(api,token='untrusted-token',env={}){
  const origin='https://www.colelearninglabs.com';
  const request=new Request(origin+'/api/'+api,{method:'POST',headers:{Origin:origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json','User-Agent':'Mozilla/5.0',...(token?{'X-CLL-Turnstile':token}:{})},body:JSON.stringify(api==='requester'?{scenarioId:'INC-101',topic:'breakfast'}:{version:1,activity:'arcade/garden-rover',metric:'start'})});
  Object.defineProperty(request,'cf',{value:{country:'US'}});
  return {request,env:{...turnstileEnv,REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true',REACH_ENABLED:'true',REACH_RETENTION_VERIFIED:'true',
    get REQUESTER_SERVICE(){assert.fail('Rejected token reached AI binding.');},get LAB_REACH(){assert.fail('Rejected token reached counter database.');},...env}};
}
test('both production POST entry points reject missing proof and provider failures before AI or count access',async t=>{
  let calls=0;const provider=t.mock.method(globalThis,'fetch',async()=>{calls++;return turnstileReply('requester',{success:false,'error-codes':['timeout-or-duplicate']});});
  for(const [api,handler] of [['requester',requester],['reach',reach]]){
    assert.equal((await handler(context(api,null))).status,403);assert.equal(calls,0);
  }
  for(const [api,handler] of [['requester',requester],['reach',reach]]){
    assert.equal((await handler(context(api))).status,403);
  }
  assert.equal(calls,2);provider.mock.restore();
});
test('wrong-purpose, foreign-host and expired tokens cannot consume AI or write counts',async t=>{
  let value; t.mock.method(globalThis,'fetch',async()=>turnstileReply(value.action,value));
  for(const [api,handler] of [['requester',requester],['reach',reach]]){
    for(const extra of [{action:api==='reach'?'requester':'reach'},{hostname:'other.example'},{challenge_ts:new Date(Date.now()-301000).toISOString()}]){
      value={action:api,...extra};assert.equal((await handler(context(api))).status,403);
    }
  }
});
