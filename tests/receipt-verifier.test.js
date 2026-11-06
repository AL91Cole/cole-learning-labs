import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCodeBatch,formatActiveTime,verifyCodeBatch,checkVerifierAvailability,mountReceiptVerifier} from '../src/receipt-verifier.js';
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

const settle=()=>new Promise(setImmediate);
const blockPage=()=>new Response('<!doctype html><title>Blocked</title>',{status:200,headers:{'Content-Type':'text/html'}});
const offline=()=>{throw new TypeError('Failed to fetch');};
test('the availability request carries no body or codes and reports enabled, disabled or unreachable',async()=>{
  const requests=[],asked=reply=>async(url,options)=>{requests.push({url,...options});return reply();};
  assert.deepEqual(await checkVerifierAvailability({fetcher:asked(capability)}),{state:'enabled',sitekey:'0xAAAAAAAAAAAA'});
  assert.equal(requests.length,1);
  const [request]=requests;
  assert.equal(request.url,'/api/verify');assert.equal(request.method,'GET');
  assert.equal(request.credentials,'omit');assert.equal(request.cache,'no-store');assert.equal(request.referrerPolicy,'no-referrer');assert.equal(request.redirect,'error');
  assert.equal('body' in request,false);assert.equal('headers' in request,false);
  for(const reply of [()=>Response.json({enabled:false}),()=>Response.json({enabled:true}),()=>new Response('',{status:503}),()=>Response.json({enabled:true},{status:503,headers:{'X-CLL-Turnstile-Sitekey':'0xAAAAAAAAAAAA'}})])assert.deepEqual(await checkVerifierAvailability({fetcher:asked(reply)}),{state:'disabled',sitekey:null});
  for(const reply of [blockPage,()=>new Response('',{status:403}),()=>new Response('Not found',{status:404}),()=>Response.json(null)])assert.deepEqual(await checkVerifierAvailability({fetcher:asked(reply)}),{state:'unreachable',sitekey:null});
  const failed=await checkVerifierAvailability({fetcher:asked(offline)});
  assert.equal(failed.state,'unreachable');assert.equal(failed.sitekey,null);assert.equal(failed.error.name,'TypeError');
  const aborted=Object.assign(new Error('stopped'),{name:'AbortError'});
  await assert.rejects(checkVerifierAvailability({fetcher:async()=>{throw aborted;}}),error=>error===aborted);
  // The batch check keeps its own wording for the same answers.
  await assert.rejects(verifyCodeBatch(['example'],{tokenProvider,fetcher:async()=>Response.json({enabled:false})}),/not enabled on this deployment/u);
  await assert.rejects(verifyCodeBatch(['example'],{tokenProvider,fetcher:async()=>offline()}),error=>error.name==='TypeError');
});

function availabilityPage(){const document=page();document.nodes.set('#verify-availability',document.createElement());return document;}
test('the page reports availability before any code is pasted and locks the form when checking is not possible',async t=>{
  const code='CLL1-NET201-95-0720-261104-0123456789ABCDEF-0123456789ABCDEF0123456789ABCDEF';
  for(const [reply,state,text] of [
    [capability,'enabled',/^Code verification is available\./u],
    [()=>Response.json({enabled:false}),'disabled',/^Code verification is not enabled on this site right now\. You do not need to paste codes/u],
    [()=>new Response('',{status:503}),'disabled',/lab report and a conversation/u],
    [blockPage,'unreachable',/^Could not check.*has not sent any codes.*different network/u],
    [offline,'unreachable',/^Could not check/u]
  ]){
    const document=availabilityPage(),requests=[],input=document.querySelector('#completion-codes'),submit=document.querySelector('#verify-submit'),clear=document.querySelector('#verify-clear'),notice=document.querySelector('#verify-availability'),status=document.querySelector('#verify-status');
    input.value=code;status.textContent='No codes have been sent.';clear.disabled=false;
    assert.equal(notice.hidden,true,'the notice is hidden until the script reports a state');
    const cleanup=mountReceiptVerifier(document,{tokenProvider,fetcher:async(url,options)=>{requests.push({url,...options});return reply();}});t.after(cleanup);
    assert.match(notice.textContent,/^Checking whether code verification is available/u);assert.equal(notice.dataset.state,'checking');assert.equal(notice.hidden,false);
    assert.equal(input.disabled,true);assert.equal(submit.disabled,true);
    await settle();
    assert.match(notice.textContent,text,state);assert.equal(notice.dataset.state,state);
    assert.equal(input.disabled,state!=='enabled',state);assert.equal(submit.disabled,state!=='enabled',state);
    assert.equal(clear.disabled,false,'the clear control is never locked');
    assert.equal(status.textContent,'No codes have been sent.','availability never replaces the batch status');
    assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/verify');assert.equal(requests[0].method,'GET');
    assert.equal('body' in requests[0],false);assert.equal('headers' in requests[0],false);
    assert.equal(JSON.stringify(requests).includes('CLL1'),false,'pasted text is not part of the availability request');
    // Clearing must not unlock a form whose service is off.
    clear.listeners.get('click')();
    assert.equal(submit.disabled,state!=='enabled',state);assert.match(status.textContent,/^Cleared/u);
    assert.match(notice.textContent,text,'clearing keeps the availability message');
  }
});
test('submitting still checks, proves and posts exactly as before once verification is available',async t=>{
  const document=availabilityPage(),requests=[];
  const cleanup=mountReceiptVerifier(document,{tokenProvider,fetcher:async(url,options)=>{requests.push({url,...options});return options.method==='GET'?capability():Response.json({results:[{code:'example',valid:false,reason:'Invalid format',isDuplicate:false}]});}});t.after(cleanup);
  await settle();
  const input=document.querySelector('#completion-codes'),submit=document.querySelector('#verify-submit');
  input.value='example';await document.querySelector('#verify-form').listeners.get('submit')({preventDefault(){}});
  assert.deepEqual(requests.map(request=>request.method),['GET','GET','POST']);
  assert.deepEqual(JSON.parse(requests[2].body),{codes:['example']});assert.equal(requests[2].headers['X-CLL-Turnstile'],'test-proof');assert.equal(requests[2].credentials,'omit');
  assert.match(document.querySelector('#verify-summary').textContent,/^1 checked · 0 valid signatures · 1 invalid/u);
  assert.match(document.querySelector('#verify-status').textContent,/browser-reported\.$/u);
  assert.equal(submit.disabled,false);assert.equal(input.disabled,false);
  assert.match(document.querySelector('#verify-availability').textContent,/^Code verification is available\./u);
});
test('the availability check stops with the page and starts again only when a saved page is shown',async()=>{
  const document=availabilityPage(),signals=[],replies=[],notice=document.querySelector('#verify-availability');
  document.defaultView={listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn);},removeEventListener(name){this.listeners.delete(name);}};
  const cleanup=mountReceiptVerifier(document,{tokenProvider,fetcher:(url,options)=>new Promise(resolve=>{signals.push(options.signal);replies.push(resolve);})});
  assert.equal(signals.length,1);assert.equal(signals[0].aborted,false);
  document.defaultView.listeners.get('pageshow')({persisted:false});
  assert.equal(signals.length,1,'an ordinary page show does not ask again');
  document.defaultView.listeners.get('pageshow')({persisted:true});
  assert.equal(signals[0].aborted,true);assert.equal(signals.length,2);assert.equal(signals[1].aborted,false);
  replies[0](capability());await settle();
  assert.match(notice.textContent,/^Checking/u,'an answer to the abandoned check is ignored');assert.equal(document.querySelector('#completion-codes').disabled,true);
  cleanup();assert.equal(signals[1].aborted,true);
  replies[1](capability());await settle();
  assert.match(notice.textContent,/^Checking/u);assert.equal(document.querySelector('#verify-submit').disabled,true);
});
test('a stalled availability check ends as unreachable instead of leaving the form on Checking',async t=>{
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const document=availabilityPage(),signals=[],replies=[],notice=document.querySelector('#verify-availability'),input=document.querySelector('#completion-codes'),submit=document.querySelector('#verify-submit'),status=document.querySelector('#verify-status');
  const cleanup=mountReceiptVerifier(document,{tokenProvider,availabilityTimeout:5,fetcher:(url,options)=>new Promise(resolve=>{signals.push(options.signal);replies.push(resolve);})});t.after(cleanup);
  assert.equal(notice.dataset.state,'checking');
  await wait(40);
  assert.equal(notice.dataset.state,'unreachable');assert.match(notice.textContent,/^Could not check/u);
  assert.equal(signals[0].aborted,true,'the stalled request is cancelled');
  assert.equal(input.disabled,true);assert.equal(submit.disabled,true);
  replies[0](capability());await settle();
  assert.equal(notice.dataset.state,'unreachable','a late answer to the cancelled check is ignored');
  document.querySelector('#verify-clear').listeners.get('click')();
  assert.match(status.textContent,/^Cleared/u,'Clear still works after a timeout');

  // An answer that arrives in time is final: the timer never replaces it.
  const quick=availabilityPage(),done=mountReceiptVerifier(quick,{tokenProvider,availabilityTimeout:5,fetcher:async()=>capability()});t.after(done);
  await settle();await wait(40);
  assert.equal(quick.querySelector('#verify-availability').dataset.state,'enabled');assert.equal(quick.querySelector('#completion-codes').disabled,false);
});
test('the verifier page shows availability above the form and explains what a signature can establish',async()=>{
  const html=await readFile(new URL('../verify.html',import.meta.url),'utf8');
  // The notice is empty and hidden in the markup; the script fills it. Without JavaScript only the noscript notice shows.
  const notice=html.indexOf('<p id="verify-availability" class="verifier-availability" role="status" aria-live="polite" hidden></p>'),form=html.indexOf('<form id="verify-form"');
  assert.doesNotMatch(html,/Checking whether code verification is available/u,'the checking message comes from the script, not the markup');
  assert.ok(notice>0&&notice<form,'availability comes before the form');
  assert.match(html.slice(notice,form),/<noscript><p class="verifier-availability">[^<]*needs JavaScript[^<]*not enabled on the public site/u);
  assert.match(html,/<textarea id="completion-codes"[^>]*aria-describedby="verify-availability verifier-privacy verify-status"[^>]* disabled>/u);
  assert.match(html,/<button class="button primary" id="verify-submit" type="submit" disabled>/u);
  assert.match(html,/<p id="verify-status" role="status" aria-live="polite" aria-atomic="true">No codes have been sent\.<\/p>/u);
  const privacy=html.match(/<p id="verifier-privacy"[^>]*>(.*?)<\/p>/u)?.[1];
  assert.match(privacy,/Each time this page opens, it asks this website whether verification is available\. That request carries no codes\./u);
  const callout=html.match(/<div class="guide-callout"><h2 id="verifier-title">What a valid signature tells you<\/h2>(.*?)<\/div>/u)?.[1];
  assert.ok(callout);
  for(const phrase of ['need a separately approved release','off on the public site now','this service issued these exact values and they were not edited afterwards','reported by the student\'s browser','Authorship, attendance, the underlying score and mastery each need separate evidence','the lab report, a demonstration or a conversation','does not establish identity, independent work, elapsed time, or a verified grade','Duplicate flags apply within this pasted batch'])assert.ok(callout.includes(phrase),phrase);
  assert.doesNotMatch(html,/guarantee|certified|compliant|100%|tamper-proof/iu);
  for(const id of ['verify-form','completion-codes','verifier-privacy','verify-submit','verify-clear','verify-status','verify-results','verify-summary','verify-rows','verify-availability'])assert.equal(html.split('id="'+id+'"').length,2,id);
});
