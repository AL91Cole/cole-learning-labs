import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCodeBatch,formatActiveTime,verifyCodeBatch,mountReceiptVerifier} from '../src/receipt-verifier.js';
const capability=()=>Response.json({enabled:true},{headers:{'X-CLL-Turnstile-Sitekey':'0xAAAAAAAAAAAA'}});
const protectedFetch=post=>async(url,options)=>options.method==='GET'?capability():post(url,options);
const tokenProvider=async()=> 'test-proof';

test('teacher batch keeps row order and duplicates and rejects excess input without truncation',()=>{
  assert.deepEqual(parseCodeBatch('  CLL1-FIRST\r\n\ncll1-second\nCLL1-FIRST '),['CLL1-FIRST','cll1-second','CLL1-FIRST']);
  for(const value of ['', 'a\n'.repeat(201), 'x'.repeat(129), 'x'.repeat(26001)]) assert.throws(()=>parseCodeBatch(value));
  assert.equal(formatActiveTime(720),'12m 00s');
  assert.equal(formatActiveTime(NaN),'—');
});

test('verification sends codes without credentials and presents unavailable and malformed responses as errors',async()=>{
  const codes=['example'];let request;
  const invalid={code:'example',valid:false,reason:'Invalid format',isDuplicate:false};
  assert.deepEqual(await verifyCodeBatch(codes,{tokenProvider,fetcher:protectedFetch(async(url,options)=>{request={url,...options};return Response.json({results:[invalid]});})}),[invalid]);
  assert.equal(request.url,'/api/verify');assert.equal(request.credentials,'omit');assert.equal(request.cache,'no-store');
  assert.deepEqual(JSON.parse(request.body),{codes});
  assert.equal(request.headers['X-CLL-Turnstile'],'test-proof');
  await assert.rejects(verifyCodeBatch(codes,{fetcher:async()=>new Response('',{status:503})}),/not enabled/u);
  for(const results of [[],[{...invalid,valid:true}], [{...invalid,isDuplicate:undefined}]]) await assert.rejects(verifyCodeBatch(codes,{tokenProvider,fetcher:protectedFetch(async()=>Response.json({results}))}),/unexpected/u);
  let submitted=false;
  await assert.rejects(verifyCodeBatch(codes,{tokenProvider:async()=>null,fetcher:protectedFetch(async()=>{submitted=true;})}),/security check/u);
  assert.equal(submitted,false);
});

function page(){
  const nodes=new Map();
  const node=()=>({children:[],dataset:{},hidden:true,disabled:true,value:'',textContent:'',listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn);},removeEventListener(name){this.listeners.delete(name);},replaceChildren(){this.children=[];},append(child){this.children.push(child);},focus(){}});
  for(const id of ['verify-form','completion-codes','verify-submit','verify-clear','verify-status','verify-results','verify-rows','verify-summary'])nodes.set('#'+id,node());
  return {nodes,querySelector:id=>nodes.get(id),createElement:node};
}
test('clearing an in-flight batch prevents stale results from repopulating it',async t=>{
  const document=page();let finish;
  const cleanup=mountReceiptVerifier(document,{tokenProvider,fetcher:protectedFetch(()=>new Promise(resolve=>{finish=resolve;}))});t.after(cleanup);
  const input=document.querySelector('#completion-codes');input.value='example';
  const pending=document.querySelector('#verify-form').listeners.get('submit')({preventDefault(){}});
  await new Promise(setImmediate);
  document.querySelector('#verify-clear').listeners.get('click')();
  finish(Response.json({results:[{code:'example',valid:false,isDuplicate:false}]}));await pending;
  assert.equal(input.value,'');assert.equal(document.querySelector('#verify-results').hidden,true);assert.equal(document.querySelector('#verify-rows').children.length,0);
  assert.match(document.querySelector('#verify-status').textContent,/Cleared/u);
});
test('untrusted result strings are rendered as text and never interpreted as HTML',async t=>{
  const document=page();
  const code='<img src=x onerror=alert(1)>';
  const cleanup=mountReceiptVerifier(document,{tokenProvider,fetcher:protectedFetch(async()=>Response.json({results:[{code,valid:false,reason:'<script>bad</script>',isDuplicate:false}]}))});t.after(cleanup);
  document.querySelector('#completion-codes').value=code;
  await document.querySelector('#verify-form').listeners.get('submit')({preventDefault(){}});
  const row=document.querySelector('#verify-rows').children[0];assert.equal(row.children[1].textContent,code);assert.equal(row.children[1].innerHTML,undefined);
});
