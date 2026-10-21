import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';
import {STANDARDS_ALIGNMENTS,STANDARDS_SOURCES,filterStandardsAlignments,standardsAlignmentHTML,mountStandardsAlignment} from '../src/standards.js';

class Element {
  constructor(value='all'){this.value=value;this.hidden=false;this.textContent='';this.listeners=new Map();this.dataset={};}
  addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(listener);}
  removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
  emit(type){for(const listener of this.listeners.get(type)||[])listener({target:this});}
}
function fixture(){
  const controls=Object.fromEntries(['pathway','nys','csta','grade'].map(key=>[key,new Element()]));
  const count=new Element(),empty=new Element(),reset=new Element();
  const rows=STANDARDS_ALIGNMENTS.map(mapping=>{
    const examples=new Element(),grades=new Element();
    return Object.assign(new Element(),{dataset:{standardsRow:mapping.pathway},examples,grades,
      querySelector:selector=>selector==='[data-standards-examples]'?examples:selector==='[data-standards-grades]'?grades:null});
  });
  const nodes=new Map([...Object.entries(controls).map(([key,element])=>['[data-standards-'+key+']',element]),
    ['[data-standards-count]',count],['[data-standards-empty]',empty],['[data-standards-reset]',reset]]);
  return {controls,count,empty,reset,rows,root:{querySelector:selector=>nodes.get(selector)||null,querySelectorAll:selector=>selector==='[data-standards-row]'?rows:[]},
    visible:()=>rows.filter(row=>!row.hidden).map(row=>row.dataset.standardsRow)};
}

test('mapping examples remain real investigations in the declared pathway and grade bands reflect source metadata',()=>{
  assert.deepEqual(STANDARDS_ALIGNMENTS.map(row=>row.pathway),[...new Set(SCENARIOS.map(scenario=>scenario.track))]);
  assert.equal(SCENARIOS.length,29);assert.equal(STANDARDS_ALIGNMENTS.length,5);
  const nys=new Set(['Impacts of Computing','Computational Thinking','Networks and Systems Design','Cybersecurity','Digital Literacy']);
  const csta=new Set(['Algorithms & Design','Programming','Data & Analysis','Systems & Security','Computing & Society']);
  for(const row of STANDARDS_ALIGNMENTS){
    assert.ok(row.nys.length&&row.csta.length);assert.ok(row.nys.every(concept=>nys.has(concept)));assert.ok(row.csta.every(concept=>csta.has(concept)));
    for(const id of row.examples)assert.equal(SCENARIOS.find(scenario=>scenario.id===id)?.track,row.pathway,id);
    assert.deepEqual(row.grades,[...new Set(SCENARIOS.filter(scenario=>scenario.track===row.pathway).map(scenario=>scenario.grade))].sort((a,b)=>parseInt(a)-parseInt(b)));
    assert.ok(Object.isFrozen(row)&&Object.isFrozen(row.nys)&&Object.isFrozen(row.examples));
  }
});

test('framework, pathway and grade filters intersect without mutating the mapping',()=>{
  assert.equal(filterStandardsAlignments().length,5);
  assert.deepEqual(filterStandardsAlignments({nys:'Digital Literacy'}).map(row=>row.pathway),['ai']);
  assert.deepEqual(filterStandardsAlignments({csta:'Programming'}).map(row=>row.pathway),['ai','security','coding']);
  assert.deepEqual(filterStandardsAlignments({nys:'Cybersecurity',csta:'Programming'}).map(row=>row.pathway),['ai','security']);
  assert.deepEqual(filterStandardsAlignments({pathway:'coding',nys:'Cybersecurity'}),[]);
  assert.deepEqual(filterStandardsAlignments({pathway:'coding',csta:'Programming',grade:'7–8'}).map(row=>row.pathway),['coding']);
  for(const query of [{pathway:'__proto__'},{grade:'K–1'},{nys:'Fully certified'},{csta:'2017 code'}])assert.deepEqual(filterStandardsAlignments(query),[]);
  assert.equal(filterStandardsAlignments().length,5);
});

test('rendered table exposes labeled filters, source versions, grade distinctions and informational limits',()=>{
  const html=standardsAlignmentHTML();
  assert.equal((html.match(/data-standards-row=/gu)||[]).length,5);
  for(const key of ['pathway','nys','csta','grade']){
    assert.ok(html.includes(`for="standards-${key}"`));assert.ok(html.includes(`id="standards-${key}" data-standards-${key}`));
  }
  assert.match(html,/<caption>.*29 fictional investigations/u);assert.match(html,/scope="col"/u);assert.match(html,/scope="row"/u);
  assert.match(html,/role="region" tabindex="0"/u);assert.match(html,/role="status" aria-live="polite"/u);
  assert.match(html,/2026 CSTA PK–12/u);assert.match(html,/middle school \(6–8\) and high school \(9–12\)/u);
  assert.match(html,/not an official NYSED or CSTA review/u);assert.match(html,/No individual standard codes are asserted/u);
  assert.ok(html.includes('Algorithms &amp; Design'));assert.ok(!html.includes('Algorithms & Design</li>'));
  for(const key of ['nys','nysGuidance','csta','cstaView'])assert.ok(html.includes(STANDARDS_SOURCES[key]));
});

test('mounted native controls update visible rows and announced counts, and reset recovers from an empty intersection',()=>{
  const h=fixture(),dispose=mountStandardsAlignment(h.root);
  assert.equal(h.visible().length,5);assert.equal(h.count.textContent,'5 pathways shown.');assert.equal(h.empty.hidden,true);
  h.controls.nys.value='Cybersecurity';h.controls.nys.emit('change');
  assert.deepEqual(h.visible(),['network','ai','security']);assert.equal(h.count.textContent,'3 pathways shown.');
  h.controls.csta.value='Programming';h.controls.csta.emit('change');assert.deepEqual(h.visible(),['ai','security']);
  h.controls.pathway.value='ai';h.controls.pathway.emit('change');assert.equal(h.count.textContent,'1 pathway shown.');
  h.controls.grade.value='K–1';h.controls.grade.emit('change');assert.deepEqual(h.visible(),[]);assert.equal(h.empty.hidden,false);
  h.reset.emit('click');assert.equal(h.visible().length,5);assert.equal(h.empty.hidden,true);
  assert.ok(Object.values(h.controls).every(control=>control.value==='all'));dispose();
});

test('route cleanup detaches every standards listener and safely handles a missing mount',()=>{
  const h=fixture(),dispose=mountStandardsAlignment(h.root);dispose();dispose();
  h.controls.nys.value='Digital Literacy';h.controls.nys.emit('change');
  assert.equal(h.visible().length,5);assert.equal(h.count.textContent,'5 pathways shown.');
  for(const control of Object.values(h.controls))assert.equal(control.listeners.get('change').size,0);
  assert.equal(h.reset.listeners.get('click').size,0);
  assert.doesNotThrow(()=>mountStandardsAlignment(null)());
  assert.doesNotThrow(()=>mountStandardsAlignment({querySelector:()=>null,querySelectorAll:()=>[]})());
});

test('selecting a starting grade refreshes actual lab examples even when every pathway offers that band',()=>{
  const h=fixture(),dispose=mountStandardsAlignment(h.root);
  h.controls.grade.value='7–8';h.controls.grade.emit('change');
  assert.equal(h.visible().length,5);assert.equal(h.count.textContent,'5 pathways shown. Examples for grades 7–8.');
  const network=h.rows.find(row=>row.dataset.standardsRow==='network');
  assert.match(network.examples.innerHTML,/NET-204/u);assert.doesNotMatch(network.examples.innerHTML,/NET-201|NET-206/u);
  assert.equal(network.grades.textContent,'Starting grades 7–8');
  h.controls.grade.value='11–12';h.controls.grade.emit('change');assert.match(network.examples.innerHTML,/NET-203/u);assert.match(network.examples.innerHTML,/NET-206/u);
  assert.doesNotMatch(network.examples.innerHTML,/NET-204/u);
  h.reset.emit('click');assert.match(network.examples.innerHTML,/NET-201/u);assert.equal(network.grades.textContent,'Starting grades 7–8, 9–10, 11–12');
  dispose();
});
