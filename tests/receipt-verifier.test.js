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
test('filtered or blocked responses give guidance instead of parser text or a misleading batch error',async()=>{
  const codes=['example'],blockPage=()=>new Response('<!doctype html><title>Blocked</title>',{status:200});
  await assert.rejects(verifyCodeBatch(codes,{tokenProvider,fetcher:async()=>blockPage()}),/verifier is unavailable/u);
  await assert.rejects(verifyCodeBatch(codes,{tokenProvider,fetcher:protectedFetch(async()=>blockPage())}),/unexpected response/u);
  await assert.rejects(verifyCodeBatch(codes,{tokenProvider,fetcher:protectedFetch(async()=>new Response('',{status:403}))}),/security check was not accepted/u);
  await assert.rejects(verifyCodeBatch(codes,{tokenProvider,fetcher:protectedFetch(async()=>new Response('',{status:400}))}),/Review the batch/u);
  const aborted=Object.assign(new Error('stopped'),{name:'AbortError'});
  await assert.rejects(verifyCodeBatch(codes,{tokenProvider,fetcher:async()=>({ok:true,status:200,headers:new Headers(),json:async()=>{throw aborted;}})}),error=>error===aborted);
});
test('batch errors say how many codes were found and which line is too long',()=>{
  assert.throws(()=>parseCodeBatch('a\n'.repeat(231)),/has 231 codes/u);
  assert.throws(()=>parseCodeBatch('ok\n'+'x'.repeat(129)),/Code 2 is longer/u);
  assert.throws(()=>parseCodeBatch(' \n '),/at least one/u);
});
test('an invalid batch is flagged on the field, and clearing or a restored page leaves no counts behind',async t=>{
  const document=page(),attributes=new Map(),input=document.querySelector('#completion-codes');let focused=0;
  input.setAttribute=(name,value)=>attributes.set(name,value);input.removeAttribute=name=>attributes.delete(name);input.focus=()=>{focused++;};
  document.defaultView={listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn);},removeEventListener(name){this.listeners.delete(name);}};
  const cleanup=mountReceiptVerifier(document,{tokenProvider,fetcher:protectedFetch(async()=>Response.json({results:[{code:'example',valid:false,reason:'Invalid format',isDuplicate:false}]}))});
  const submit=document.querySelector('#verify-form').listeners.get('submit'),summary=document.querySelector('#verify-summary'),status=document.querySelector('#verify-status');
  input.value='';await submit({preventDefault(){}});
  assert.equal(attributes.get('aria-invalid'),'true');assert.equal(focused,1);assert.match(status.textContent,/at least one/u);
  input.value='example';await submit({preventDefault(){}});
  assert.equal(attributes.has('aria-invalid'),false);assert.match(summary.textContent,/^1 checked/u);
  const restored=document.defaultView.listeners.get('pageshow');
  restored({persisted:false});assert.match(summary.textContent,/^1 checked/u);
  restored({persisted:true});
  assert.equal(summary.textContent,'');assert.equal(input.value,'');assert.equal(document.querySelector('#verify-results').hidden,true);
  assert.match(status.textContent,/cleared when this page was left/u);
  input.value='example';await submit({preventDefault(){}});document.querySelector('#verify-clear').listeners.get('click')();
  assert.equal(summary.textContent,'');assert.match(status.textContent,/^Cleared/u);
  cleanup();assert.equal(document.defaultView.listeners.has('pageshow'),false);
});
