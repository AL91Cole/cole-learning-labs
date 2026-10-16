import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSROOM_ACTIVE_KEY,classroomStorageKey,classroomSelection,progressSnapshot,attachClassroomLab} from '../src/classroom-client.js';
import {normalizeLabRecord} from '../src/records.js';
import {SCENARIOS} from '../src/scenarios.js';
import {setImmediate as nextTurn} from 'node:timers/promises';

function storage(value, check) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {getItem(key) { assert.equal(key, CLASSROOM_ACTIVE_KEY); return value; }} });
  try { check(); } finally { if(descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; }
}
test('independent practice never checks a classroom API or accesses the DOM', () => {
  const old = globalThis.fetch; let calls = 0;
  globalThis.fetch = () => { calls++; throw Error('Unexpected network access'); };
  try { storage(null, () => { const connection = attachClassroomLab({scenarioId:'INC-101'}); connection.schedule(); connection.dispose(); assert.equal(classroomStorageKey(),'cole-learning-labs:v2'); }); assert.equal(calls, 0); }
  finally { globalThis.fetch = old; }
});
test('classroom storage is isolated by class and anonymous student, with malformed flags rejected', () => {
  const studentId = '12345678-1234-4321-9876-123456789012';
  const classId = '12345678-1234-4321-9876-123456789013';
  storage(JSON.stringify({studentId,classId}), () => assert.equal(classroomStorageKey(),`cole-learning-labs:v2:classroom:${classId}:${studentId}`));
  for(const value of ['{', 'null', JSON.stringify({studentId:[studentId],classId}), JSON.stringify({studentId:'../other',classId}), JSON.stringify({studentId,classId:'constructor'})]) storage(value, () => assert.equal(classroomSelection(), null));
});
test('record load rejects malformed shapes and unrecognized evidence without trusting completion strings', () => {
  const scenario = SCENARIOS.find(s => s.id === 'INC-101');
  const record = normalizeLabRecord(scenario,{state:{pcOn:'false',evidence:{length:'<img onerror=alert(1)>'}},events:[null,{message:'A test',kind:'<script>',time:44}],evidence:[scenario.clues[0].id,'made-up',scenario.clues[0].id],questions:[0,'0',-1,999],plan:{x:'html'},notes:['x'],reflection:4,verified:'true',closed:'true'});
  assert.equal(record.verified,false); assert.equal(record.closed,false); assert.equal(record.plan,''); assert.equal(record.notes,'');
  assert.deepEqual(record.evidence,[scenario.clues[0].id]); assert.deepEqual(record.questions,[0]); assert.equal(record.events[0].kind,'info');
  assert.ok(Array.isArray(record.state.evidence)); assert.equal(typeof record.state.pcOn,'boolean');
});
test('sharing includes only work fields and does not mutate local progress or invent a grade', () => {
  const record = normalizeLabRecord(SCENARIOS[0],{notes:'A learner explanation',events:[{message:'Inspected cable',kind:'info'}]});
  const source = JSON.stringify(record);
  const snapshot = progressSnapshot({...record,grade:100,teacherEmail:'private@example.test',classCode:'DO-NOT-SEND'});
  assert.equal(JSON.stringify(record),source); assert.equal(snapshot.notes,record.notes); assert.equal('grade' in snapshot,false); assert.equal('teacherEmail' in snapshot,false); assert.equal('classCode' in snapshot,false);
});
test('large histories are bounded for upload without discarding learner explanations or local events', () => {
  const record = normalizeLabRecord(SCENARIOS[0],{notes:'Keep this explanation.',events:Array.from({length:100},()=>({message:'🙂'.repeat(300),kind:'info'}))});
  const before = JSON.stringify(record); const snapshot = progressSnapshot(record);
  assert.ok(new TextEncoder().encode(JSON.stringify(snapshot)).length <= 60000); assert.equal(snapshot.notes,record.notes); assert.equal(JSON.stringify(record),before); assert.ok(snapshot.events.length < record.events.length);
});
test('oversized learner text requires an export rather than silently truncating the upload', () => assert.throws(()=>progressSnapshot({notes:'🙂'.repeat(20000)}),/too large/));

class FakeNode {
  constructor(tag='div', text='') { this.tagName=tag;this.textContent=text;this.children=[];this.listeners=new Map();this.hidden=false;this.disabled=false; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children=[...children]; }
  setAttribute(name,value) { this[name]=String(value); }
  addEventListener(type,callback,options) { const entries=this.listeners.get(type)||[];entries.push({callback,once:options?.once});this.listeners.set(type,entries); }
  removeEventListener(type,callback) { this.listeners.set(type,(this.listeners.get(type)||[]).filter(entry=>entry.callback!==callback)); }
  async emit(type,event={}) {
    for(const entry of [...(this.listeners.get(type)||[])]) {
      if(entry.once)this.removeEventListener(type,entry.callback);
      await entry.callback(event);
    }
  }
  async click() { if(!this.disabled)await this.emit('click',{target:this}); }
  find(predicate) { if(predicate(this))return this;for(const child of this.children){const found=child.find(predicate);if(found)return found;}return null; }
}

const STUDENT_A='12345678-1234-4321-9876-123456789012';
const STUDENT_B='12345678-1234-4321-9876-123456789014';
const CLASS_A='12345678-1234-4321-9876-123456789013';
const CLASS_B='12345678-1234-4321-9876-123456789015';
const ASSIGNMENT='12345678-1234-4321-9876-123456789016';

async function connectedFixture(t,options={}) {
  const names=['localStorage','document','window','fetch','setTimeout','clearTimeout'];
  const descriptors=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const values=new Map([[CLASSROOM_ACTIVE_KEY,JSON.stringify({studentId:STUDENT_A,classId:CLASS_A})]]);
  const host=new FakeNode(),windowTarget=new FakeNode(),timers=new Map(),requests=[];
  let timerId=0,connection,restored=0;
  const fixture={
    requests,host,window:windowTarget,onPut:null,
    record:normalizeLabRecord(SCENARIOS[0],{notes:'This belongs to learner A.',closed:true}),
    setSelection(studentId=STUDENT_B,classId=CLASS_A) { values.set(CLASSROOM_ACTIVE_KEY,JSON.stringify({studentId,classId})); },
    removeSelection() { values.delete(CLASSROOM_ACTIVE_KEY); },
    button(label) { const found=host.find(node=>node.tagName==='button' && node.textContent===label);assert.ok(found,`Missing button: ${label}`);return found; },
    status() { return host.find(node=>node.className==='classroom-sync-status').textContent; },
    get restored() { return restored; },
    async flush() { for(let i=0;i<3;i++)await nextTurn(); },
    async runTimers() { const queued=[...timers.values()];timers.clear();for(const timer of queued)await timer();await fixture.flush(); }
  };
  const define=(name,value)=>Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
  define('localStorage',{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)});
  define('document',{querySelector:selector=>selector==='#classroom-status'?host:null,createElement:tag=>new FakeNode(tag)});
  define('window',windowTarget);
  define('setTimeout',callback=>{timers.set(++timerId,callback);return timerId;});
  define('clearTimeout',id=>timers.delete(id));
  define('fetch',async(path,init={})=>{
    const request={path,method:init.method||'GET',headers:new Headers(init.headers),redirect:init.redirect,body:init.body?JSON.parse(init.body):null};
    requests.push(request);
    let data;
    if(path==='/api/session')data={enabled:true,role:'student',student:{id:STUDENT_A,classId:CLASS_A,alias:'Learner-A'},classroom:{id:CLASS_A,name:'Class A',locked:false},assignments:[{id:ASSIGNMENT,labId:'INC-101'}]};
    else if(path===`/api/student/work/${ASSIGNMENT}` && request.method==='GET')data={draft:{version:options.remoteDraft?1:0,work:options.remoteDraft||null},submissions:options.submissions||[]};
    else if(path===`/api/student/work/${ASSIGNMENT}` && request.method==='PUT'){
      if(fixture.onPut)await fixture.onPut(request);
      data={draft:{version:request.body.expectedVersion+1,work:request.body.work}};
    } else if(path==='/api/student/submit' && request.method==='POST')data={submission:{id:'submitted-1',status:'submitted',feedback:'Teacher feedback'}};
    else if(path==='/api/student/logout')data={loggedOut:true};
    else throw Error(`Unexpected request: ${request.method} ${path}`);
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  });
  t.after(()=>{
    connection?.dispose();
    for(const name of names){const descriptor=descriptors.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
  });
  connection=attachClassroomLab({scenarioId:'INC-101',record:fixture.record,onRestore:()=>{restored++;},...(options.storageKey?{storageKey:options.storageKey}:{})});
  fixture.connection=connection;
  await fixture.flush();
  return fixture;
}

test('classroom reads and both write payloads bind to the selected learner identity',async t=>{
  const f=await connectedFixture(t);
  await f.button('Submit for teacher review').click();await f.flush();
  const writes=f.requests.filter(request=>request.method!=='GET');
  assert.deepEqual(writes.map(request=>request.method),['PUT','POST']);
  for(const request of f.requests){assert.equal(request.headers.get('X-Classroom-Student'),STUDENT_A);assert.equal(request.redirect,'error');}
  for(const request of writes)assert.equal(request.body.expectedStudentId,STUDENT_A);
  assert.equal(writes[0].body.work.notes,'This belongs to learner A.');
  assert.equal(writes[1].body.assignmentId,ASSIGNMENT);
  assert.equal(writes[1].body.expectedVersion,1);
});

test('a different learner in the same class blocks manual saves even before a storage event arrives',async t=>{
  const f=await connectedFixture(t);
  f.setSelection(STUDENT_B,CLASS_A);
  await f.button('Save classroom draft').click();await f.flush();
  assert.equal(f.requests.some(request=>request.method==='PUT'),false);
  assert.match(f.status(),/paused|session/i);
  assert.equal(f.button('Save classroom draft').disabled,true);
});

test('a scheduled autosave cannot upload old-tab work after the selected class changes',async t=>{
  const f=await connectedFixture(t);
  f.connection.schedule();
  f.setSelection(STUDENT_B,CLASS_B);
  await f.runTimers();
  assert.equal(f.requests.some(request=>request.method==='PUT'),false);
  assert.equal(f.button('Submit for teacher review').disabled,true);
});

test('removing the classroom selection stops sharing and clears previously displayed feedback',async t=>{
  const f=await connectedFixture(t,{submissions:[{status:'graded',grade:92,feedback:'Private feedback for learner A.'}]});
  const feedback=f.host.find(node=>node.className==='classroom-feedback');
  assert.match(feedback.textContent,/Private feedback/);
  f.removeSelection();
  await f.window.emit('storage',{key:CLASSROOM_ACTIVE_KEY});
  assert.equal(feedback.textContent,'');
  assert.equal(f.button('Save classroom draft').disabled,true);
  f.connection.schedule();await f.runTimers();
  assert.equal(f.requests.some(request=>request.method!=='GET'),false);
});

test('a selection change during the save response prevents the following submission',async t=>{
  const f=await connectedFixture(t);
  f.onPut=()=>f.setSelection(STUDENT_B,CLASS_A);
  await f.button('Submit for teacher review').click();await f.flush();
  assert.equal(f.requests.filter(request=>request.method==='PUT').length,1);
  assert.equal(f.requests.some(request=>request.path==='/api/student/submit'),false);
  assert.match(f.status(),/paused|session/i);
});

test('a remote draft is not restored into a tab after its learner selection changes',async t=>{
  const f=await connectedFixture(t,{remoteDraft:{notes:'A remote learner draft'}});
  assert.equal(f.button('Resume classroom draft').hidden,false);
  f.setSelection(STUDENT_B,CLASS_A);
  await f.button('Resume classroom draft').click();await f.flush();
  assert.equal(f.restored,0);
  assert.equal(f.requests.some(request=>request.method!=='GET'),false);
});

test('a paused connection cannot silently resume when another tab selects the old identity again',async t=>{
  const f=await connectedFixture(t);
  f.setSelection(STUDENT_B,CLASS_A);
  await f.window.emit('storage',{key:CLASSROOM_ACTIVE_KEY});
  f.setSelection(STUDENT_A,CLASS_A);
  f.connection.schedule();await f.runTimers();
  assert.equal(f.requests.some(request=>request.method==='PUT'),false);
  assert.equal(f.button('Save classroom draft').disabled,true);
});

for(const [label,storageKey] of [
  ['independent browser work','cole-learning-labs:v2'],
  ['another learner’s saved work',`cole-learning-labs:v2:classroom:${CLASS_A}:${STUDENT_B}`]
]) {
  test(`opening a new classroom selection cannot upload ${label} already loaded by the tab`,async t=>{
    const f=await connectedFixture(t,{storageKey});
    const before=JSON.stringify(f.record);
    f.connection.schedule();await f.runTimers();
    assert.equal(f.requests.length,0,'A mismatched loaded storage origin must not even connect to the API');
    assert.equal(JSON.stringify(f.record),before);
    assert.ok(f.host.find(node=>/Sharing is paused/.test(node.textContent)));
  });
}
