import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountLabImprovements,resetLabImprovements} from '../src/lab-improvements.js';
import {IMPROVEMENT_SHARING_ENABLED,IMPROVEMENT_ENDPOINT} from '../src/improvement-config.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const ack=(data={accepted:true},status=202)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};
class Control{
  value='';checked=false;disabled=false;hidden=false;textContent='';listeners=new Map();
  addEventListener(name,fn){this.listeners.set(name,[...(this.listeners.get(name)||[]),fn]);}
  removeEventListener(name,fn){this.listeners.set(name,(this.listeners.get(name)||[]).filter(item=>item!==fn));}
  emit(name='click'){const event={preventDefault(){},target:this};return (this.listeners.get(name)||[]).map(fn=>fn(event));}
  async fire(name='click'){await Promise.all(this.emit(name));await flush();}
}
function fixture(t,{sharingEnabled,activity='lab/INC-101',provider=async()=>ack(),timeoutMs=8000}={}){
  const nodes=Object.fromEntries(['form','review','clear','preview','summary','consent','send','status','outcome','attempts','issue'].map(name=>[name,new Control()]));
  const calls=[];
  const root={innerHTML:'',replaceChildren(){this.innerHTML='';},querySelector(selector){return nodes[selector.match(/data-improvement-([a-z]+)/u)?.[1]]||null;}};
  const dispose=mountLabImprovements(root,{activity,...(sharingEnabled===undefined?{}:{sharingEnabled}),timeoutMs,fetcher(path,options){calls.push({path,options});return provider(path,options);}});
  t.after(dispose);
  return {root,nodes,calls,dispose,async choices(){nodes.outcome.value='needed_help';nodes.attempts.value='two_or_three';nodes.issue.value='instructions';await nodes.outcome.fire('change');},async review(){await this.choices();await nodes.form.fire('submit');},async consent(){nodes.consent.checked=true;await nodes.consent.fire('change');},async submit(){await this.review();await this.consent();await nodes.send.fire();}};
}

test('production source gate is closed; choices, review and consent never contact a server',async t=>{
  assert.equal(IMPROVEMENT_SHARING_ENABLED,false);
  const h=fixture(t);await h.submit();
  assert.deepEqual(h.calls,[]);assert.equal(h.nodes.send.disabled,true);
  assert.match(h.root.innerHTML,/Online sharing is not enabled pending privacy and school review\. No improvement summary is sent\./u);
  assert.match(h.nodes.summary.textContent,/INC-101.*needed help.*Two or three attempts.*instructions were confusing/u);
  for(const sharingEnabled of ['true',1,null]){
    const other=fixture(t,{sharingEnabled});await other.submit();assert.deepEqual(other.calls,[]);
  }
});

test('no probe or submission happens until all choices, review, consent and a separate send action',async t=>{
  const h=fixture(t,{sharingEnabled:true});await flush();assert.deepEqual(h.calls,[]);
  await h.nodes.send.fire();await h.nodes.form.fire('submit');await h.consent();await h.nodes.send.fire();assert.deepEqual(h.calls,[]);
  await h.review();assert.equal(h.nodes.send.disabled,true);await h.nodes.send.fire();assert.deepEqual(h.calls,[]);
  await h.consent();assert.deepEqual(h.calls,[]);await h.nodes.send.fire();assert.equal(h.calls.length,1);
});

test('transport is exact fixed choices without cookies, referrer, raw work, history or identifiers',async t=>{
  const h=fixture(t,{sharingEnabled:true});await h.submit();
  const [{path,options}]=h.calls;
  assert.equal(path,IMPROVEMENT_ENDPOINT);assert.equal(path,'/api/improvements');
  assert.deepEqual(JSON.parse(options.body),{version:1,activity:'lab/INC-101',outcome:'needed_help',attempts:'two_or_three',issue:'instructions'});
  assert.equal(options.method,'POST');assert.deepEqual(options.headers,{'Content-Type':'application/json'});
  for(const [name,value] of Object.entries({credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error'}))assert.equal(options[name],value);
  assert.ok(options.signal instanceof AbortSignal);
  assert.doesNotMatch(options.body,/notes|learner|session|time|question|history|url|client|release|referrer/iu);
  await h.nodes.send.fire();await h.nodes.form.fire('submit');await h.nodes.clear.fire();await h.nodes.send.fire();
  assert.equal(h.calls.length,1,'An accepted mount cannot silently send a second summary.');
  assert.match(h.nodes.status.textContent,/Counts accepted/u);assert.equal(h.nodes.clear.disabled,true);
});

test('tampered field values and an unknown activity never become network input or markup',async t=>{
  const h=fixture(t,{sharingEnabled:true});await h.review();await h.consent();
  h.nodes.issue.value='PRIVATE RAW STUDENT TEXT <script>bad</script>';
  await h.nodes.send.fire();assert.deepEqual(h.calls,[]);assert.equal(h.nodes.consent.checked,false);
  await h.nodes.form.fire('submit');assert.equal(h.nodes.preview.hidden,true);assert.doesNotMatch(h.nodes.summary.textContent,/PRIVATE RAW/u);
  const unknown=fixture(t,{sharingEnabled:true,activity:'https://private.example/?student=PRIVATE'});
  assert.equal(unknown.root.innerHTML,'');assert.deepEqual(unknown.calls,[]);
});

test('changing a choice invalidates the reviewed summary and explicit consent',async t=>{
  const h=fixture(t,{sharingEnabled:true});await h.review();await h.consent();
  h.nodes.outcome.value='finished';await h.nodes.outcome.fire('change');
  assert.equal(h.nodes.consent.checked,false);assert.equal(h.nodes.preview.hidden,true);assert.equal(h.nodes.send.disabled,true);
  await h.nodes.send.fire();assert.deepEqual(h.calls,[]);
  await h.nodes.form.fire('submit');await h.consent();await h.nodes.send.fire();
  assert.equal(JSON.parse(h.calls[0].options.body).outcome,'finished');
});

test('reset aborts pending work, clears choices and consent, and suppresses late acknowledgements',async t=>{
  const pending=deferred(),h=fixture(t,{sharingEnabled:true,provider:()=>pending.promise});
  await h.review();await h.consent();const tasks=h.nodes.send.emit();await flush();
  assert.equal(h.calls.length,1);resetLabImprovements();
  assert.equal(h.calls[0].options.signal.aborted,true);assert.equal(h.nodes.consent.checked,false);
  for(const name of ['outcome','attempts','issue'])assert.equal(h.nodes[name].value,'');
  pending.resolve(ack());await Promise.all(tasks);await flush();assert.doesNotMatch(h.nodes.status.textContent,/Counts accepted/u);
  await h.nodes.send.fire();assert.equal(h.calls.length,1);
});

test('clearing choices, withdrawing consent and disposal abort requests without late UI changes',async t=>{
  for(const action of ['clear','withdraw','dispose']){
    const pending=deferred(),h=fixture(t,{sharingEnabled:true,provider:()=>pending.promise});
    await h.review();await h.consent();const tasks=h.nodes.send.emit();await flush();
    if(action==='dispose')h.dispose();else if(action==='clear')await h.nodes.clear.fire();else{h.nodes.consent.checked=false;await h.nodes.consent.fire('change');}
    const before=h.nodes.status.textContent;assert.equal(h.calls[0].options.signal.aborted,true);
    pending.resolve(ack());await Promise.all(tasks);await flush();assert.equal(h.nodes.status.textContent,before);
    await h.nodes.send.fire();assert.equal(h.calls.length,1);
  }
});

test('timeouts and service errors fail locally with no automatic retry or exposed error text',async t=>{
  const never=deferred(),timed=fixture(t,{sharingEnabled:true,timeoutMs:5,provider:()=>never.promise});
  await timed.submit();assert.equal(timed.calls.length,1);assert.equal(timed.calls[0].options.signal.aborted,true);
  assert.match(timed.nodes.status.textContent,/not confirmed.*No automatic retry/u);
  for(const provider of [async()=>ack({accepted:false,error:'PRIVATE ERROR'},503),async()=>{throw new Error('PRIVATE ERROR');}]){
    const h=fixture(t,{sharingEnabled:true,provider});await h.submit();await flush();
    assert.equal(h.calls.length,1);assert.doesNotMatch(h.nodes.status.textContent,/PRIVATE ERROR/u);assert.equal(h.nodes.consent.checked,false);assert.equal(h.nodes.send.disabled,true);
  }
});

test('streamed acknowledgement limits cancel oversized or malformed responses',async t=>{
  let cancelled=false;
  const h=fixture(t,{sharingEnabled:true,provider:async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(513));},cancel(){cancelled=true;}}),{status:202,headers:{'Content-Type':'application/json'}})});
  await h.submit();assert.equal(cancelled,true);assert.match(h.nodes.status.textContent,/not confirmed/u);
  for(const response of [ack({accepted:true,identifier:'PRIVATE'}),ack({accepted:'true'}),new Response('{invalid',{status:202,headers:{'Content-Type':'application/json'}}),new Response('€'.repeat(180),{status:202,headers:{'Content-Type':'application/json'}})]){
    const other=fixture(t,{sharingEnabled:true,provider:async()=>response});await other.submit();assert.match(other.nodes.status.textContent,/not confirmed/u);
  }
});

test('the panel uses native required choices and discloses the actual privacy limits',t=>{
  const h=fixture(t);
  assert.equal((h.root.innerHTML.match(/<select\b[^>]*required/gu)||[]).length,3);
  assert.equal((h.root.innerHTML.match(/<label class="lab-field">/gu)||[]).length,3);
  assert.match(h.root.innerHTML,/type="checkbox"/u);assert.match(h.root.innerHTML,/role="status" aria-live="polite"/u);
  assert.match(h.root.innerHTML,/hosting provider handles connection information/u);assert.match(h.root.innerHTML,/cannot be individually retrieved or removed/u);
  assert.match(h.root.innerHTML,/href="#privacy">Read the privacy information/u);assert.doesNotMatch(h.root.innerHTML,/Cloudflare/u);
  assert.match(h.root.innerHTML,/totals do not measure distinct people/u);assert.match(h.root.innerHTML,/not a grade/u);
  const source=readFileSync(new URL('../src/lab-improvements.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|sendBeacon|serviceWorker|console\.|document\.cookie|location\.|navigator\.|reportText|\.events\b/u);
});
