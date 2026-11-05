import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderFoundationVisual, mountFoundationScene, BOARD_MAP } from '../src/foundation-scene.js';
import { PART_ART, PART_ART_ALT } from '../src/part-art.js';
import { FOUNDATION_LABS, getFoundation, createFoundationRecord, applyFoundationAction } from '../src/foundation-model.js';

const source=readFileSync(new URL('../src/foundation-scene.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/foundations.css',import.meta.url),'utf8');

// Native markup/event boundary; model behavior is real. Computed responsive
// layout, native touch and school-device acceptance remain browser QA.
function fixture(track='hardware',{hidden=false,documentHidden=false,record}={}){
  const lab=getFoundation(track),listeners=new Map(),docListeners=new Map(),attrs={},calls={inspections:[],actions:[],statuses:[]};
  let current=record||createFoundationRecord(track),markup='',nodes=[],roleNodes=[];
  const doc={hidden:documentHidden,activeElement:null,addEventListener:(name,fn)=>docListeners.set(name,fn),removeEventListener:(name,fn)=>{if(docListeners.get(name)===fn)docListeners.delete(name);}},portrait={innerHTML:''},statusDetails={open:false};
  const host={ownerDocument:doc,setAttribute:(name,value)=>{attrs[name]=value;},closest:()=>hidden?{}:null,contains:node=>nodes.includes(node),querySelector:selector=>selector==='[data-foundation-part-portrait]'?portrait:selector==='.foundation-pc-status'?statusDetails:null,querySelectorAll:selector=>selector==='[data-foundation-item]'?nodes:selector==='[data-foundation-card-role]'?roleNodes:[],addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
  Object.defineProperty(host,'innerHTML',{get:()=>markup,set(value){markup=value;statusDetails.open=false;roleNodes=[...value.matchAll(/<span\b[^>]*data-foundation-card-role="([^"]+)"([^>]*)>/g)].map(([,id,attrs])=>({dataset:{foundationCardRole:id},hidden:/\bhidden\b/.test(attrs)}));nodes=[...value.matchAll(/<(button|g)\b([^>]*data-foundation-item="([^"]+)")[^>]*>/g)].map(([,tag,,id])=>({tagName:tag==='button'?'BUTTON':'g',dataset:{foundationItem:id},attrs:{'aria-pressed':'false'},closest(selector){return selector==='[data-foundation-item]'?this:null;},setAttribute(name,value){this.attrs[name]=value;},focus(){doc.activeElement=this;}}));}});
  host.innerHTML=renderFoundationVisual(lab,current);
  const controller=mountFoundationScene(host,{lab,record:current,onInspect:id=>calls.inspections.push(id),onAction:action=>calls.actions.push(action),onStatus:status=>calls.statuses.push(status)});
  function target(id){const node=nodes.find(node=>node.dataset.foundationItem===id);assert.ok(node,`missing item ${id}`);return node;}
  return {lab,doc,host,portrait,statusDetails,listeners,docListeners,attrs,calls,controller,get record(){return current;},set record(value){current=value;controller.update(value);},get nodes(){return nodes;},get roleNodes(){return roleNodes;},click(id){const node=target(id);node.focus();listeners.get('click')?.({target:node});},key(id,key){const event={target:target(id),key,preventDefault(){this.prevented=true;}};listeners.get('keydown')?.(event);return event;},show(){hidden=false;controller.setVisible(true);}};
}

function prepared(){const lab=getFoundation('hardware');let state=createFoundationRecord(lab.id);for(const item of lab.items)state=applyFoundationAction(lab.id,state,{type:'inspect',item:item.id}).state;for(const check of lab.checks)state=applyFoundationAction(lab.id,state,{type:'answer',check:check.id,value:check.answer}).state;return state;}

test('hardware shows all nine selectable parts in a lightweight PR6-style PC cutaway',()=>{
  const f=fixture(),html=f.host.innerHTML;
  assert.equal(f.nodes.length,9);assert.ok(html.includes('viewBox="0 0 900 620"'));assert.ok(html.includes('SCHEMATIC CUTAWAY'));assert.ok(html.includes('foundation-board'));assert.ok(html.includes('DDR4 SLOT EMPTY'));assert.ok(html.includes('AC DISCONNECTED'));
  for(const item of f.lab.items){assert.ok(html.includes(`data-foundation-item="${item.id}"`));assert.match(html,new RegExp(`data-foundation-item="${item.id}" role="button" tabindex="0"`));}
  assert.doesNotMatch(html,/<canvas|\b3D\b|WebGL|GPU loading|camera|graphics unavailable/i);assert.equal(f.calls.statuses[0].kind,'ready');assert.deepEqual(f.calls.actions,[]);f.controller.dispose();
});

test('four other pathways retain native named picture buttons for every curriculum item',()=>{
  for(const lab of FOUNDATION_LABS.filter(lab=>lab.id!=='hardware')){
    const f=fixture(lab.id),html=f.host.innerHTML;assert.equal(f.nodes.length,lab.items.length);
    for(const item of lab.items){assert.ok(html.includes(`data-foundation-item="${item.id}"`));assert.ok(html.includes(item.label));assert.ok(html.includes(item.looks));}
    assert.equal((html.match(/type="button"/g)||[]).length,lab.items.length);assert.equal((html.match(/<svg /g)||[]).length,lab.items.length);assert.ok(f.nodes.every(node=>node.tagName==='BUTTON'));f.controller.dispose();
  }
});

test('a fitted beginner side panel covers internal parts and removes their picture targets',()=>{
  const f=fixture(),original=structuredClone(f.record);
  f.record={...original,hardware:{...original.hardware,assembly:{...original.hardware.assembly,panelInstalled:true}}};
  assert.match(f.host.innerHTML,/assets\/favicon\.svg/);
  const cover=/<g data-foundation-panel-cover>([\s\S]*?)<\/g><\/g>/.exec(f.host.innerHTML)?.[1];
  assert.ok(cover);assert.match(cover,/class="foundation-panel-vents"/);assert.match(cover,/<image[^>]*width="64" height="64"/);
  assert.doesNotMatch(cover,/<text\b|logo-dark\.png|KEEP CLEAR/);
  assert.ok(f.nodes.some(node=>node.dataset.foundationItem==='panel'));
  for(const id of ['board','cpu','cooler','ram','gpu','psu','ssd'])assert.ok(!f.nodes.some(node=>node.dataset.foundationItem===id),id);
  assert.doesNotMatch(f.host.innerHTML,/data-pc-fan=/);
  f.record=original;
  for(const id of ['board','cpu','cooler','ram','gpu','psu','ssd'])assert.ok(f.nodes.some(node=>node.dataset.foundationItem===id),id);
  f.controller.dispose();
});

test('selected picture cards show their job beside the picture and retain it through updates',()=>{
  for(const lab of FOUNDATION_LABS.filter(lab=>lab.id!=='hardware')){
    const f=fixture(lab.id),first=lab.items[0],next=lab.items[1];
    assert.equal(f.roleNodes.length,lab.items.length);assert.ok(f.roleNodes.every(node=>node.hidden));
    f.click(first.id);
    assert.deepEqual(f.roleNodes.filter(node=>!node.hidden).map(node=>node.dataset.foundationCardRole),[first.id]);
    assert.ok(f.host.innerHTML.includes(escapeRole(first.role)));
    const inspected=[...f.calls.inspections];f.controller.focus(next.id);f.record={...f.record};
    assert.deepEqual(f.roleNodes.filter(node=>!node.hidden).map(node=>node.dataset.foundationCardRole),[next.id]);
    assert.deepEqual(f.calls.inspections,inspected,'Showing a role does not award another inspection.');
    assert.deepEqual(f.calls.actions,[]);assert.doesNotMatch(f.host.innerHTML,/foundation-item-role[^>]*aria-live/);
    f.controller.dispose();
  }
});

function escapeRole(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

test('all nine part portraits remain recognizable without changing the physical model or granting practice',()=>{
  const f=fixture(),before=JSON.stringify(f.record),pictures=new Set();
  for(const item of f.lab.items){f.controller.focus(item.id);assert.ok(f.portrait.innerHTML.includes('<svg '));assert.ok(f.portrait.innerHTML.includes(item.label));assert.ok(f.portrait.innerHTML.includes(item.looks));assert.ok(f.portrait.innerHTML.includes(escapeRole(item.role)));pictures.add(f.portrait.innerHTML.split('</svg>')[0]);}
  assert.equal(pictures.size,9);assert.equal(JSON.stringify(f.record),before);assert.deepEqual(f.calls.actions,[]);assert.deepEqual(f.calls.inspections,[]);f.controller.dispose();
});

test('part clicks inspect only authored items and programmatic selection never echoes an inspection',()=>{
  const f=fixture();f.click('ram');assert.deepEqual(f.calls.inspections,['ram']);assert.equal(f.nodes.find(node=>node.dataset.foundationItem==='ram').attrs['aria-pressed'],'true');f.controller.focus('cpu');f.controller.focus('made-up-part');assert.deepEqual(f.calls.inspections,['ram']);assert.deepEqual(f.calls.actions,[]);
  const foreign={dataset:{foundationItem:'ssd'},closest(){return this;}};f.listeners.get('click')({target:foreign});assert.deepEqual(f.calls.inspections,['ram']);f.controller.dispose();
});

test('Enter and Space inspect SVG components while native buttons retain their browser keyboard behavior',()=>{
  const f=fixture();assert.equal(f.key('ram','Enter').prevented,true);assert.equal(f.key('cpu',' ').prevented,true);assert.equal(f.key('psu','ArrowDown').prevented,undefined);assert.deepEqual(f.calls.inspections,['ram','cpu']);f.controller.dispose();
  const cards=fixture('ai');assert.equal(cards.key('prompt','Enter').prevented,undefined);assert.deepEqual(cards.calls.inspections,[]);cards.click('prompt');assert.deepEqual(cards.calls.inspections,['prompt']);cards.controller.dispose();
});

test('diagram progress reflects the actual guarded nine-step hardware job and truthful lesson completion',()=>{
  const f=fixture('hardware',{record:prepared()});assert.ok(f.host.innerHTML.includes('DDR4 SLOT EMPTY'));
  for(const job of f.lab.jobs){const result=applyFoundationAction(f.lab.id,f.record,{type:'practice',action:job.action});assert.notEqual(result.kind,'warning',result.message);f.record=result.state;}
  assert.ok(f.host.innerHTML.includes('Memory (RAM) fitted'));assert.ok(f.host.innerHTML.includes('Memory clips closed'));assert.ok(f.host.innerHTML.includes('Panel screws 2/2'));assert.ok(f.host.innerHTML.includes('PANEL FITTED'));assert.ok(f.host.innerHTML.includes('Power cable connected'));assert.ok(f.host.innerHTML.includes('LESSON FILE OPEN'));assert.deepEqual(f.calls.actions,[]);assert.deepEqual(f.calls.inspections,[]);f.controller.dispose();
});

test('updates preserve selection and the currently focused picture without moving focus from outside controls',()=>{
  const f=fixture();f.click('ram');const old=f.doc.activeElement;f.record={...f.record,hardware:{...f.record.hardware,ramSeated:true}};assert.notEqual(f.doc.activeElement,old);assert.equal(f.doc.activeElement.dataset.foundationItem,'ram');assert.equal(f.doc.activeElement.attrs['aria-pressed'],'true');
  const outside={closest:()=>null};f.doc.activeElement=outside;f.record={...f.record};assert.equal(f.doc.activeElement,outside);assert.deepEqual(f.calls.inspections,['ram']);f.controller.dispose();
});

test('diagram readouts update non-hardware state without awarding any action credit',()=>{
  const f=fixture('network');f.record={...f.record,simulation:{wired:true,ipAssigned:true,dnsReady:false,serviceReachable:false}};assert.ok(f.host.innerHTML.includes('data-foundation-state="done">✓ Network cable connected'));assert.ok(f.host.innerHTML.includes('data-foundation-state="waiting">○ Name lookup (DNS) done'));assert.deepEqual(f.calls.actions,[]);f.controller.dispose();
});

test('hidden, background and disposed views ignore stale selections and disposal removes both listeners',()=>{
  const f=fixture('hardware',{hidden:true});f.click('ram');assert.deepEqual(f.calls.inspections,[]);f.show();f.click('ram');assert.deepEqual(f.calls.inspections,['ram']);f.doc.hidden=true;f.click('cpu');assert.deepEqual(f.calls.inspections,['ram']);f.doc.hidden=false;f.controller.setVisible(false);f.click('cpu');assert.deepEqual(f.calls.inspections,['ram']);f.controller.dispose();f.controller.dispose();assert.equal(f.listeners.size,0);const before=f.host.innerHTML;f.controller.update({});f.controller.focus('cpu');assert.equal(f.host.innerHTML,before);
});

test('authored labels, portrait descriptions, and program output are escaped',()=>{
  const lab={track:'ai',title:'<img src=x>',items:[{id:'prompt" autofocus="x',label:'<script>bad()</script>',looks:'<svg onload=bad()>',role:'<img src=x onerror=bad()>'}]},html=renderFoundationVisual(lab,{});assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('prompt&quot; autofocus=&quot;x'));assert.ok(html.includes('&lt;img src=x onerror=bad()&gt;'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));
  const output=renderFoundationVisual(getFoundation('coding'),{results:[{output:['<iframe src=x>','&private']}]});assert.ok(output.includes('&lt;iframe src=x&gt; · &amp;private'));assert.ok(!output.includes('<iframe'));
  const hardware=renderFoundationVisual({track:'hardware',items:[{id:'cpu',label:'CPU',looks:'<img src=x>'}]},{});assert.ok(hardware.includes('&lt;img src=x&gt;'));
});

test('foundation visuals contain no engine, dynamic import, animation loop, network or persistence APIs',()=>{
  assert.doesNotMatch(source,/\bimport\s*(?:\(|\*)|babylon|three\.module|assembly-scene|WebGL|requestAnimationFrame|setInterval|https?:\/\/|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|\beval\s*\(|new\s+Function\s*\(/i);assert.doesNotMatch(css,/foundation-camera|hardware-scene|canvas|scene-placeholder/);assert.match(css,/min-height:48px/);assert.match(css,/foundation-diagram-part:focus-visible/);
});

test('beginner fan blades use current main power, stop on shutdown and never turn SSDs into moving disks',()=>{
  const f=fixture('hardware',{record:prepared()}),before=structuredClone(f.record);
  assert.match(f.host.innerHTML,/data-pc-fan="cpu" data-running="false"/);
  f.record={...f.record,hardware:{...f.record.hardware,pcOn:true,acConnected:true,videoPort:'gpu',pcVideoConnected:true,signalConnected:true,monitorInput:'hdmi'}};
  for(const fan of ['cpu','gpu','psu'])assert.ok(f.host.innerHTML.includes('data-pc-fan="'+fan+'" data-running="true"'));
  assert.match(f.host.innerHTML,/NO SIGNAL/);
  assert.doesNotMatch(f.host.innerHTML,/MEMORY NOT DETECTED|CLASSROOM UEFI/);
  assert.doesNotMatch(f.host.innerHTML,/CLASSROOM DESKTOP|LESSON FILE OPEN/);
  assert.match(f.host.innerHTML,/solid-state storage/);
  f.record={...f.record,hardware:{...f.record.hardware,pcOn:false}};
  assert.match(f.host.innerHTML,/data-pc-fan="cpu" data-running="false"/);
  assert.equal(f.record.practice.length,before.practice.length);assert.deepEqual(f.calls.actions,[]);
  f.controller.dispose();
});

test('beginner fan motion pauses while hidden, backgrounded or disposed and honors reduced motion',()=>{
  const f=fixture();assert.equal(f.attrs['data-pc-motion'],'running');
  f.controller.setVisible(false);assert.equal(f.attrs['data-pc-motion'],'paused');
  f.controller.setVisible(true);f.doc.hidden=true;f.docListeners.get('visibilitychange')();assert.equal(f.attrs['data-pc-motion'],'paused');
  f.doc.hidden=false;f.docListeners.get('visibilitychange')();assert.equal(f.attrs['data-pc-motion'],'running');
  f.controller.dispose();assert.equal(f.attrs['data-pc-motion'],'paused');assert.equal(f.docListeners.size,0);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*foundation-pc-fan[\s\S]*animation:none/);
});

test('beginner monitor captions stay short and an explicitly opened activity explanation stays open',()=>{
  const f=fixture();
  const subtitles=[...f.host.innerHTML.matchAll(/<text x="195" y="(?:190|207)"[^>]*>([^<]*)<\/text>/g)].map(match=>match[1]);
  assert.equal(subtitles.length,2);assert.ok(subtitles.every(line=>line.length<=48));
  f.statusDetails.open=true;f.record={...f.record};assert.equal(f.statusDetails.open,true);
  assert.match(f.host.innerHTML,/Check the monitor input and cable path/);f.controller.dispose();
});

test('the hardware course lays accessible labels over the reviewed motherboard drawing',()=>{
  const lab=getFoundation('hardware'),html=renderFoundationVisual(lab,createFoundationRecord('hardware'));
  if(!Object.hasOwn(PART_ART,'scene-board-map')){assert.doesNotMatch(html,/foundation-board-map/);return;}
  assert.match(html,/<section class="foundation-board-map" aria-labelledby="foundation-board-map-title"><h3 id="foundation-board-map-title">Motherboard map<\/h3>/);
  assert.match(html,new RegExp('<img class="scene-art foundation-board-map-art" src="'+PART_ART['scene-board-map']+'" loading="lazy" decoding="async" alt="'+PART_ART_ALT['scene-board-map'].slice(0,30)));
  assert.equal(BOARD_MAP.length,(html.match(/data-foundation-map="/g)||[]).length,'Every map spot renders one label');
  for(const spot of BOARD_MAP){
    assert.ok(spot.x>0&&spot.x<100&&spot.y>0&&spot.y<100,spot.id+': labels sit inside the picture');assert.ok(spot.note.length>30,spot.id);
    const label=new RegExp('<li style="left:'+spot.x+'%;top:'+spot.y+'%"><button type="button" data-foundation-map="'+spot.id+'"'+(spot.item?' data-foundation-map-item="'+spot.item+'"':'')+' aria-pressed="false">'+spot.label+'</button></li>');
    assert.match(html,label,spot.id);
    if(spot.item)assert.ok(lab.items.some(item=>item.id===spot.item),spot.id+': a labelled item is a lesson item');
  }
  assert.doesNotMatch(html,/data-foundation-item="(?:cpu-socket|memory-slots|chipset|rear-ports)"/,'Map labels are not counted as picture targets');
  assert.ok(html.includes('<p class="foundation-board-map-note" data-foundation-map-note aria-live="polite">Choose a label to read what sits there.</p>'));
  assert.match(css,/\.foundation-board-map-labels button\[aria-pressed="true"\]/);assert.match(css,/@media\(max-width:600px\)\{\.foundation-board-map-labels\{position:static/);
});

test('choosing a map label explains the spot and opens the matching lesson part',()=>{
  const lab=getFoundation('hardware');if(!Object.hasOwn(PART_ART,'scene-board-map'))return;
  const inspections=[],labels=BOARD_MAP.map(spot=>({dataset:{foundationMap:spot.id,foundationMapItem:spot.item||undefined},attrs:{},closest(selector){return selector==='[data-foundation-map]'?this:null;},setAttribute(name,value){this.attrs[name]=value;}}));
  const note={textContent:''},portrait={innerHTML:''},parts=lab.items.map(item=>({dataset:{foundationItem:item.id},attrs:{},setAttribute(name,value){this.attrs[name]=value;},closest(){return null;}}));
  const doc={hidden:false,activeElement:null,addEventListener(){},removeEventListener(){}};
  const host={ownerDocument:doc,innerHTML:'',setAttribute(){},closest:()=>null,contains:node=>labels.includes(node)||parts.includes(node),querySelector:selector=>selector==='[data-foundation-map-note]'?note:selector==='[data-foundation-part-portrait]'?portrait:null,querySelectorAll:selector=>selector==='[data-foundation-map]'?labels:selector==='[data-foundation-item]'?parts:[],addEventListener(name,fn){this['on'+name]=fn;},removeEventListener(){}};
  const controller=mountFoundationScene(host,{lab,record:createFoundationRecord('hardware'),onInspect:id=>inspections.push(id)});
  const socket=labels.find(node=>node.dataset.foundationMap==='cpu-socket'),chipset=labels.find(node=>node.dataset.foundationMap==='chipset');
  host.onclick({target:socket});
  assert.equal(socket.attrs['aria-pressed'],'true');assert.equal(chipset.attrs['aria-pressed'],'false');
  assert.match(note.textContent,/^Processor socket\. The processor drops into this square socket/);
  assert.deepEqual(inspections,['cpu'],'A label for a lesson part counts as inspecting that part');
  assert.equal(parts.find(node=>node.dataset.foundationItem==='cpu').attrs['aria-pressed'],'true');assert.match(portrait.innerHTML,/Processor \(CPU\)/);
  host.onclick({target:chipset});
  assert.equal(chipset.attrs['aria-pressed'],'true');assert.equal(socket.attrs['aria-pressed'],'false');assert.match(note.textContent,/^Chipset\. This chip/);
  assert.deepEqual(inspections,['cpu'],'Spots without a lesson part only explain themselves');
  controller.update(createFoundationRecord('hardware'));
  assert.equal(chipset.attrs['aria-pressed'],'true','The chosen label survives a record update');assert.match(note.textContent,/^Chipset\./);
  host.onclick({target:{closest:()=>null}});assert.deepEqual(inspections,['cpu']);
  controller.dispose();
});
