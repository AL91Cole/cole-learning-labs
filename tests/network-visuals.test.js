import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NETWORK_CONFIG,NETWORK_SCENARIOS} from '../src/network-labs.js';
import {getNetworkDiagram} from '../src/network-diagrams.js';
import {renderNetworkVisual,mountNetworkVisual} from '../src/network-visuals.js';

const choices={
 'NET-207':{layerMap:'matched',fileTransport:'tcp',callTransport:'udp',addressPair:'matched'},
 'NET-208':{topology:'star',localDevice:'switch',boundary:'router',media:'matched'},
 'NET-209':{subnet:'/26',host:'10.40.8.70',gateway:'10.40.8.65',edge:'school-edge'},
 'NET-210':{access:'30',trunk:'10,30',guestPolicy:'approved',redundancy:'spanning-tree'},
 'NET-211':{authentication:'individual',firewall:'https-classroom',detection:'separate',evidence:'full'},
 'NET-212':{link:'up',gateway:'10.50.0.1',route:'approved',diagnostic:'all'},
 'NET-213':{media:'matched',voiceQueue:'rtp-priority',congestion:'reschedule',record:'fcaps'},
 'NET-214':{capacity:'48-gigabit',wireless:'managed',segments:'approved',changePlan:'reviewable'},
 'NET-215':{interface:'ethernet',nextHop:'gateway',headers:'routed',interpretation:'link-path'},
 'NET-216':{target:'uplink',protection:'authpriv',threshold:'rate',receiver:'approved'}
};

for(const {id} of NETWORK_SCENARIOS){
 test(`${id}: a keyboard accessible visual shows the saved devices and connection evidence`,()=>{
  const graph=getNetworkDiagram(id,{}),before=structuredClone(graph),html=renderNetworkVisual(id,{});
  assert.equal((html.match(/data-net-node=/g)??[]).length,graph.nodes.length);
  assert.equal((html.match(/aria-pressed="true"/g)??[]).length,1);
  assert.match(html,/class="net-viewport" tabindex="0" role="region" aria-label="Network diagram/);
  assert.match(html,/<svg class="net-connections"[^>]*aria-hidden="true"/);
  assert.match(html,/Saved network plan/);assert.match(html,/Apply my choices updates this picture/);
  assert.match(html,/Run a fresh test to check the plan/);
  assert.match(html,/<details class="net-link-details">/);
  for(const node of graph.nodes)assert.ok(html.includes(`data-net-node="${node.id}"`));
  for(const link of graph.links)assert.ok(html.includes(link.status.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));
  assert.deepEqual(getNetworkDiagram(id,{}),before);
  assert.notEqual(renderNetworkVisual(id,choices[id]),html,'saved choices change the visible network');
  const selected=graph.nodes.at(-1),selectedHtml=renderNetworkVisual(id,{},selected.id);
  assert.ok(selectedHtml.includes(`data-net-node="${selected.id}" aria-pressed="true"`));
  for(const field of NETWORK_CONFIG[id.replace('-','')].fields.filter(field=>selected.fields.includes(field.name)))assert.ok(selectedHtml.includes(field.label));
 });
 test(`${id}: imported markup cannot become network HTML or executable attributes`,()=>{
  const saved=Object.fromEntries(NETWORK_CONFIG[id.replace('-','')].fields.map(field=>[field.name,'<img src=x onerror="alert(1)"><script>bad()</script>']));
  saved.extra='url(javascript:alert(1))';
  const before=structuredClone(saved),html=renderNetworkVisual(id,saved,'"><script>selection()</script>');
  assert.doesNotMatch(html,/<script|<img|onerror|javascript:|selection\(\)|bad\(\)/);
  assert.deepEqual(saved,before);
 });
}

function mountedMap(id,saved){
 const diagram=getNetworkDiagram(id,saved);
 const panel={innerHTML:'initial inspector',querySelector(selector){return selector==='[data-network-settings]'?this.settings:null;},settings:{onclick:null}};
 const buttons=diagram.nodes.map(node=>({dataset:{netNode:node.id},attributes:{'aria-pressed':String(node===diagram.nodes[0])},listeners:{},setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,handler){this.listeners[name]=handler;},removeEventListener(name,handler){if(this.listeners[name]===handler)delete this.listeners[name];}}));
 const visual={querySelectorAll(selector){assert.equal(selector,'[data-net-node]');return buttons;},querySelector(selector){assert.equal(selector,'[data-network-inspector]');return panel;}};
 const formDraft={value:'not yet applied',focused:false};
 const root={querySelector(selector){if(selector==='[data-network-visual]')return visual;throw Error('Selecting a device must not touch the form');}};
 Object.defineProperty(root,'innerHTML',{set(){throw Error('Selecting a device must not rerender the lab');}});
 return {diagram,panel,buttons,root,formDraft};
}

test('device inspection preserves drafts and saved test records; settings navigation is explicit',()=>{
 const saved={...choices['NET-210'],tested:true,results:[{label:'existing test',ok:true}],testSignature:'saved-signature'},before=structuredClone(saved);
 const {diagram,panel,buttons,root,formDraft}=mountedMap('NET-210',saved),selected=[],settings=[];
 const cleanup=mountNetworkVisual(root,'NET-210',saved,{onSelect:id=>selected.push(id),onSettings:fields=>settings.push(fields)});
 buttons.at(-1).listeners.click();
 const last=diagram.nodes.at(-1);
 assert.deepEqual(selected,[last.id]);assert.deepEqual(settings,[],'inspection never changes or applies settings');
 assert.equal(buttons.at(-1).attributes['aria-pressed'],'true');assert.equal(buttons[0].attributes['aria-pressed'],'false');
 assert.match(panel.innerHTML,/Selected device/);assert.ok(panel.innerHTML.includes(last.label));
 assert.equal(formDraft.value,'not yet applied');assert.equal(formDraft.focused,false);assert.deepEqual(saved,before);
 panel.settings.onclick();
 assert.deepEqual(settings,[last.fields]);assert.deepEqual(saved,before);assert.equal(formDraft.value,'not yet applied');
 cleanup();assert.equal(buttons.at(-1).listeners.click,undefined);assert.equal(panel.settings.onclick,null);
});

test('unsupported labs and lightweight existing roots fail closed without mounting',()=>{
 for(const id of ['NET-999','AI-305','NET-204',undefined]){
  assert.equal(renderNetworkVisual(id,{}),'');
  assert.equal(typeof mountNetworkVisual({},id,{}),'function');
 }
 assert.equal(typeof mountNetworkVisual({querySelector(){return {setAttribute(){}};}},'NET-208',{}),'function');
});

test('network canvas contains its horizontal scroll and visible states have distinct line patterns',async()=>{
 const css=await readFile(new URL('../src/network-visuals.css',import.meta.url),'utf8');
 assert.match(css,/\.net-viewport\{[^}]*overflow-x:auto;overflow-y:hidden/);
 assert.match(css,/\.net-canvas\{[^}]*min-width:760px[^}]*height:480px/);
 assert.match(css,/\.network-visual \.net-node\{[^}]*min-height:98px/);
 assert.match(css,/\.net-wire\.net-blocked path\{[^}]*stroke-dasharray/);
 assert.match(css,/\.net-wire\.net-warning path\{[^}]*stroke-dasharray/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/animation:[^n]/);
});
