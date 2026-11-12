import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker-requester/worker.js';
import {PRIVATE_REQUESTER_URL} from '../worker-requester/contract.js';
import {SCENARIOS} from '../src/scenarios.js';
import {isFreeLab,FREE_LAB_IDS} from '../src/access-policy.js';

const request=body=>new Request(PRIVATE_REQUESTER_URL,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
});

test('the production private requester independently denies every member-only lab before AI or budget access',async()=>{
  let reads=0;
  const env={REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true',
    get AI(){reads++;assert.fail('A member-only request accessed AI.');},
    get REQUESTER_BUDGET(){reads++;assert.fail('A member-only request accessed budget storage.');}};
  const restricted=SCENARIOS.filter(scenario=>!isFreeLab(scenario.id));
  assert.ok(restricted.length>0);
  for(const scenario of restricted){
    const response=await worker.fetch(request({scenarioId:scenario.id,topic:'breakfast'}),env);
    assert.equal(response.status,403,scenario.id);
    assert.deepEqual(await response.json(),{enabled:false,error:'reply_unavailable',fallback:true,accepted:false});
  }
  assert.equal(reads,0);
});

test('caller membership claims cannot grant a paid requester scenario',async()=>{
  const env={REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true',
    get AI(){assert.fail('A caller claim reached AI.');},
    get REQUESTER_BUDGET(){assert.fail('A caller claim reached storage.');}};
  for(const field of ['member','memberId','tier','authorized','privacyApproved']){
    const response=await worker.fetch(request({scenarioId:'INC-103',topic:'breakfast',[field]:true}),env);
    assert.equal(response.status,400,field);
  }
});

test('all public free-lab identifiers still pass the production catalog check',async()=>{
  // Missing bindings produce 503 only after the input/catalog checks; these
  // tests never invoke an AI service, provision storage, or collect records.
  for(const scenarioId of FREE_LAB_IDS){
    const response=await worker.fetch(request({scenarioId,topic:'breakfast'}),{
      REQUESTER_ENABLED:'true',REQUESTER_BILLING_REVIEWED:'true'
    });
    assert.equal(response.status,503,scenarioId);
    assert.equal((await response.json()).error,'requester_not_configured');
  }
});
