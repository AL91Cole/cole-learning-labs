import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCompletionCode,verifyCompletionCode,signPayload,validReceiptSecret} from '../utils/receiptCrypto.js';
import {receiptLabId,RECEIPT_LABS,validateReceiptEvent} from '../src/receipt-schema.js';
import {ARCADE_CATALOG} from '../src/arcade-catalog.js';
import {CODE_QUESTS} from '../src/code-quest-catalog.js';
import {ELEMENTARY_LABS} from '../src/elementary-labs.js';
const secret='Receipt test secret with at least thirty-two bytes';
test('server-issued receipts round trip and bind every field including the version',async()=>{
  const code=await generateCompletionCode({labId:'NET-201',score:95,activeSeconds:720},secret);
  assert.match(code,/^CLL1-NET201-95-0720-\d{6}-[A-F0-9]{16}-[A-F0-9]{32}$/u);
  const result=await verifyCompletionCode(' '+code.toLowerCase()+' ',secret);
  assert.equal(result.valid,true);assert.equal(result.score,95);assert.equal(result.activeSeconds,720);assert.equal(result.code,code);
  assert.equal((await verifyCompletionCode(code,secret+'changed')).valid,false);
  const parts=code.split('-');
  for(const [index,replacement] of [[0,'CLL2'],[1,'INC101'],[2,'100'],[3,'0800'],[4,'260101'],[5,'0000000000000000'],[6,'0'.repeat(32)]]){
    const altered=[...parts];altered[index]=replacement;assert.equal((await verifyCompletionCode(altered.join('-'),secret)).valid,false);
  }
  assert.notEqual(await generateCompletionCode({labId:'NET-201',score:95,activeSeconds:720},secret),code);
});
test('even correctly signed noncanonical, unknown or impossible fields fail validation',async()=>{
  for(const core of ['CLL1-UNKNOWN-95-0720-261104-0123456789ABCDEF','CLL1-NET201-101-0720-261104-0123456789ABCDEF','CLL1-NET201-95-00720-261104-0123456789ABCDEF','CLL1-NET201-95-86401-261104-0123456789ABCDEF','CLL1-NET201-95-0720-260230-0123456789ABCDEF']){
    assert.equal((await verifyCompletionCode(core+'-'+await signPayload(core,secret),secret)).valid,false);
  }
  assert.equal((await verifyCompletionCode('CLL-NET201-95-0720-261104-4F9A-8C2E1B4A',secret)).valid,false);
  await assert.rejects(()=>generateCompletionCode({labId:'NET-201',score:100,activeSeconds:0},'short'));
  for(const fields of [{labId:'unknown',score:100,activeSeconds:0},{labId:'NET-201',score:NaN,activeSeconds:0},{labId:'NET-201',score:100,activeSeconds:Infinity}])await assert.rejects(()=>generateCompletionCode(fields,secret));
});
test('every currently shipped public activity has a unique stable known identifier',()=>{
  assert.equal(new Set(RECEIPT_LABS.map(lab=>lab.labId)).size,RECEIPT_LABS.length);
  for(const lab of [...ARCADE_CATALOG,...CODE_QUESTS,...ELEMENTARY_LABS])assert.ok(receiptLabId(lab.id));
  for(const id of ['lab/INC-101','learn/network','explore/EX-CODE-1','arcade/packet-post','quests/python','play/inbox-defender'])assert.ok(receiptLabId(id));
  for(const id of ['UNKNOWN','net-201','name@example.com',null,{}])assert.equal(receiptLabId(id),null);
});
test('telemetry validation rejects unapproved fields, coercion, nonfinite values and score on starts',()=>{
  const event={labId:'NET-201',eventType:'complete',activeSeconds:720,stepReached:3,score:95};
  assert.equal(validateReceiptEvent(event).collectTelemetry,false);
  for(const change of [{name:'student'},{activeSeconds:'720'},{activeSeconds:NaN},{score:Infinity},{score:101},{stepReached:1.5},{collectTelemetry:'true'}])assert.equal(validateReceiptEvent({...event,...change}),null);
  assert.equal(validateReceiptEvent({...event,eventType:'start'}),null);
  assert.equal(validateReceiptEvent({labId:'NET-201',eventType:'start',activeSeconds:0,stepReached:1}).labId,'NET201');
});
test('look-alike characters are rejected before case folding and five-digit times round trip',async()=>{
  const long=await generateCompletionCode({labId:'INC-101',score:100,activeSeconds:36000},secret);
  assert.match(long,/^CLL1-INC101-100-36000-/u);assert.equal((await verifyCompletionCode(long,secret)).activeSeconds,36000);
  assert.equal((await verifyCompletionCode(await generateCompletionCode({labId:'INC-101',score:0,activeSeconds:86400},secret),secret)).valid,true);
  // U+0131 (dotless i) and U+017F (long s) upper-case into ASCII I and S.
  assert.equal((await verifyCompletionCode(long.toLowerCase().replace('inc','ınc'),secret)).valid,false);
  const code=await generateCompletionCode({labId:'SEC-400',score:100,activeSeconds:5},secret);
  assert.equal((await verifyCompletionCode(code.replace('SEC','ſEC'),secret)).valid,false);
  assert.equal((await verifyCompletionCode(code.replace('-100-','-1​00-'),secret)).valid,false);
  // Ordinary paste padding (no-break space, byte-order mark) is still trimmed.
  assert.equal((await verifyCompletionCode(' '+code+'﻿',secret)).valid,true);
});
test('placeholder and repeated-character secrets cannot enable signing or verification',async()=>{
  const code=await generateCompletionCode({labId:'NET-201',score:100,activeSeconds:0},secret);
  for(const weak of ['a'.repeat(32),' '.repeat(40),'ab'.repeat(20),'abcdefg'.repeat(6)]){
    assert.equal(validReceiptSecret(weak),false,weak);
    await assert.rejects(()=>generateCompletionCode({labId:'NET-201',score:100,activeSeconds:0},weak));
    await assert.rejects(()=>verifyCompletionCode(code,weak));
  }
  const base='abcdefgh';
  assert.equal(validReceiptSecret(base.repeat(4)),true);assert.equal(validReceiptSecret(base.repeat(32)),true);
  assert.equal(validReceiptSecret(base.repeat(4).slice(1)),false);assert.equal(validReceiptSecret(base.repeat(32)+'a'),false);
  for(const value of [null,undefined,42,{},[]])assert.equal(validReceiptSecret(value),false);
  // The cached key is bound to the exact secret: a different secret never reuses it.
  assert.equal((await verifyCompletionCode(code,secret)).valid,true);
  assert.equal((await verifyCompletionCode(code,base.repeat(5))).valid,false);
  assert.equal((await verifyCompletionCode(code,secret)).valid,true);
});
