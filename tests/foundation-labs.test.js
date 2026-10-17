import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {FOUNDATION_LABS,getFoundation,createFoundationRecord,applyFoundationAction,foundationSummary} from '../src/foundation-model.js';

const source=readFileSync(new URL('../src/foundation-labs.js',import.meta.url),'utf8');
const modelAction=(id,record,action)=>applyFoundationAction(id,record,structuredClone(action));
const moduleText=source.replace(/^import[^\n]+\n/gm,'').replaceAll('export function ','function ')+';({renderFoundationLab,mountFoundationLab})';
const renderVisual=()=>'<div aria-label="Fictional learning equipment"></div>';
const render=vm.runInNewContext(moduleText,{getFoundation,createFoundationRecord,applyFoundationAction:modelAction,foundationSummary,renderFoundationVisual:renderVisual,mountFoundationScene(){assert.fail('Rendering alone must not mount graphics.');}}).renderFoundationLab;

// A DOM boundary exercises the actual controller and model. Scene geometry,
// native touch, computed layout and school-device acceptance have separate QA.
function fixture(id='hardware') {
  const lab=getFoundation(id),fields=new Map(),listeners=new Map(),dynamic=new Map(),staticButtons=[],markers=[];
  const calls={changed:0,reports:0,updates:0,focus:[],camera:[],mode:[],visible:[],order:[],disposed:0};
  const doc={activeElement:null};let current=createFoundationRecord(id),sceneOptions;
  const datasetName=name=>name.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  function element(dataset={}) {
    return {dataset,value:'',textContent:'',attrs:{},hidden:false,tabIndex:0,scrolled:[],listeners:new Map(),
      setAttribute(name,value){this.attrs[name]=String(value);},getAttribute(name){return this.attrs[name]??null;},
      focus(){doc.activeElement=this;},scrollIntoView(options){this.scrolled.push({block:options.block,behavior:options.behavior});},
      matches(selector){const name=/^\[data-([a-z-]+)\]$/.exec(selector)?.[1];return !!name&&Object.hasOwn(this.dataset,datasetName(name));},
      closest(selector){if(selector==='button')return this.tagName==='BUTTON'?this:null;return this.matches(selector)?this:null;},
      addEventListener(name,handler){this.listeners.set(name,handler);},removeEventListener(name,handler){if(this.listeners.get(name)===handler)this.listeners.delete(name);}
    };
  }
  function buttons(html){return [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs)].map(([,attrs,text])=>{
    const data=Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)(?:="([^"]*)")?/g)].map(([,name,value])=>[datasetName(name),value??'']));
    const node=element(data);node.tagName='BUTTON';node.textContent=text;node.disabled=/\bdisabled(?:\s|=|$)/.test(attrs);return node;
  });}
  const markup=render(lab,current);staticButtons.push(...buttons(markup));
  const shell=element(),visual=element(),dialog=element();dialog.close=()=>calls.order.push('dialog close');
  fields.set('.foundation-lab',shell);fields.set('[data-foundation-visual]',visual);fields.set('#lab-dialog',dialog);
  const close=element();close.tagName='BUTTON';fields.set('#dialog-close',close);
  for(const name of ['explore','practice','check','stage','item-title','looks','role','feedback','code-workspace','code-results'])fields.set(`[data-foundation-${name}]`,element());
  for(const name of ['explore','practice','check'])Object.defineProperty(fields.get(`[data-foundation-${name}]`),'innerHTML',{get(){return this.markup||'';},set(html){this.markup=html;dynamic.set(name,buttons(html));}});
  Object.defineProperty(fields.get('[data-foundation-code-results]'),'innerHTML',{get(){return this.markup||'';},set(html){this.markup=html;}});
  const editor=element({foundationCode:''});editor.value=current.code;fields.set('[data-foundation-code]',editor);
  const panels=['explore','practice','check'].map(name=>{const panel=element({foundationPanel:name});panel.hidden=name!=='explore';return panel;});
  lab.items.forEach(item=>markers.push(element({foundationVisited:item.id})));
  const allButtons=()=>[...staticButtons,...[...dynamic.values()].flat()];
  function matching(selector){
    const match=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector);if(!match)return [];
    const name=datasetName(match[1]);return [...allButtons(),...panels,...markers,...fields.values()].filter(node=>Object.hasOwn(node.dataset,name)&&(match[2]===undefined||node.dataset[name]===match[2]));
  }
  const root={ownerDocument:doc,querySelector(selector){return fields.get(selector)||matching(selector)[0]||null;},querySelectorAll:matching,
    addEventListener(name,handler){listeners.set(name,handler);},removeEventListener(name,handler){if(listeners.get(name)===handler)listeners.delete(name);}};
  shell.contains=target=>allButtons().includes(target)||[...fields.values()].includes(target);
  const scene={update(record){calls.updates++;calls.lastSceneRecord=record;},focus(item){calls.focus.push(item);},camera(action){calls.camera.push(action);},setMode(mode){calls.mode.push(mode);},setVisible(visible){calls.visible.push(visible);},cancelInteraction(){calls.order.push('cancel');},dispose(){calls.disposed++;}};
  const functions=vm.runInNewContext(moduleText,{getFoundation,createFoundationRecord,applyFoundationAction:modelAction,foundationSummary,renderFoundationVisual:renderVisual,mountFoundationScene(host,options){assert.equal(host,visual);sceneOptions=options;return scene;}});
  const controller=functions.mountFoundationLab(root,{lab,record:current,onChange(record){current=record;calls.changed++;},onReport(record){calls.reports++;calls.report=record;calls.order.push('report');}});
  function click(field,value='') {
    const target=allButtons().find(button=>Object.hasOwn(button.dataset,field)&&(value===undefined||button.dataset[field]===value));assert.ok(target,`Missing ${field}=${value}`);
    if(!target.disabled){target.focus();listeners.get('click')({target});}return target;
  }
  return {lab,controller,calls,fields,panels,doc,listeners,markup,click,get record(){return current;},get sceneOptions(){return sceneOptions;},
    tab(name){return click('foundationSection',name);},
    key(name,key){const target=allButtons().find(button=>button.dataset.foundationSection===name);const event={target,key,preventDefault(){this.prevented=true;}};listeners.get('keydown')(event);return event;},
    input(value){editor.value=value;listeners.get('input')({target:editor});},
    prompt(name='practice'){return fields.get(`[data-foundation-${name}]`).innerHTML;}
  };
}
function exploreAll(view){for(const item of view.lab.items)view.click('foundationInspect',item.id);}
function prepare(view){exploreAll(view);view.tab('practice');for(const check of view.lab.checks){view.click('foundationAnswer',check.answer);view.click('foundationNextQuestion');}}

test('five separate beginner labs render one initial panel, named tabs, optional help and the existing report dialog',()=>{
  assert.equal(FOUNDATION_LABS.length,5);
  for(const lab of FOUNDATION_LABS){
    const html=render(lab,createFoundationRecord(lab.id));
    assert.equal((html.match(/role="tab"/g)||[]).length,3);assert.equal((html.match(/role="tabpanel"/g)||[]).length,3);
    for(const [index,name] of ['explore','practice','check'].entries()){
      const panel=html.match(new RegExp('<section id="foundation-panel-'+name+'"[^>]*>'))?.[0];assert.ok(panel);assert.equal(/\bhidden\b/.test(panel),index>0);
      assert.match(html,new RegExp('id="foundation-tab-'+name+'"[^>]*aria-controls="foundation-panel-'+name+'"'));
    }
    assert.match(html,/<details class="foundation-help"><summary>/);assert.doesNotMatch(html,/<details[^>]*\bopen\b/);
    for(const id of ['lab-dialog','dialog-content','dialog-close'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
    assert.match(html,new RegExp('href="#lab/'+lab.nextLab+'"'));assert.doesNotMatch(html,/<input[^>]*type="(?:email|password)"/);
    assert.equal(/class="foundation-item-buttons"[^>]* hidden/.test(html),lab.track!=='hardware','Native illustrated buttons already provide the non-hardware item controls.');
  }
});

test('rendering and mounting teach without awarding visits or modifying a beginner record',()=>{
  for(const lab of FOUNDATION_LABS){const view=fixture(lab.id);assert.equal(view.calls.changed,0);assert.equal(view.record.explored.length,0);assert.equal(foundationSummary(lab.id,view.record).complete,false);assert.match(view.prompt('explore'),new RegExp(view.lab.items[0].label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));view.controller.dispose();}
});

test('native and scene inspections share the same learning state and show short appearance/role captions',()=>{
  const view=fixture(),first=view.lab.items[0],second=view.lab.items[1];
  view.click('foundationInspect',first.id);assert.deepEqual(view.record.explored,[first.id]);assert.deepEqual(view.calls.focus,[first.id]);
  assert.equal(view.fields.get('[data-foundation-looks]').textContent,'Look for: '+first.looks);
  assert.equal(view.fields.get('[data-foundation-role]').textContent,'Its job: '+first.role);
  view.sceneOptions.onInspect(second.id);assert.deepEqual(view.record.explored,[first.id,second.id]);assert.deepEqual(view.calls.focus,[first.id],'A scene inspection must not echo back into another scene inspection');
  assert.equal(view.calls.changed,2);view.controller.dispose();
});

test('practice gives one role question at a time, retains wrong answers and explains a correct answer before advancing',()=>{
  const view=fixture('network');view.tab('practice');assert.match(view.prompt(),/Meet the equipment first/);
  exploreAll(view);view.tab('practice');const first=view.lab.checks[0],wrong=first.options.find(option=>option.id!==first.answer);
  assert.ok(view.prompt().includes(first.prompt));assert.ok(!view.prompt().includes(view.lab.checks[1].prompt));
  view.click('foundationAnswer',wrong.id);assert.equal(view.record.answers[first.id],wrong.id);assert.equal(foundationSummary('network',view.record).checked,0);assert.ok(view.prompt().includes(first.prompt));
  view.click('foundationAnswer',first.answer);assert.ok(view.prompt().includes(first.explanation));assert.ok(view.prompt().includes('Next question'));assert.ok(!view.prompt().includes(view.lab.checks[1].prompt));
  view.click('foundationNextQuestion');assert.ok(view.prompt().includes(view.lab.checks[1].prompt));assert.equal(view.doc.activeElement?.dataset?.foundationAnswer,view.lab.checks[1].options[0].id);view.controller.dispose();
});

test('every non-coding mini-job follows the actual model one step at a time and reaches a truthful completion summary',()=>{
  for(const lab of FOUNDATION_LABS.filter(lab=>lab.track!=='coding')){
    const view=fixture(lab.id);prepare(view);
    for(const [index,job] of lab.jobs.entries()){
      assert.ok(view.prompt().includes(job.prompt),lab.id+' current job');
      view.click('foundationJob');assert.equal(view.record.practice.length,index+1,lab.id);
    }
    assert.equal(foundationSummary(lab.id,view.record).complete,true,lab.id);view.tab('check');assert.match(view.prompt('check'),/beginner lab is complete/);
    assert.equal(view.fields.get('[data-foundation-stage]').hidden,true);assert.equal(view.calls.visible.at(-1),false);
    if(lab.track==='hardware'){assert.equal(view.record.hardware.ramSeated,true);assert.equal(view.record.hardware.assembly.ramClipsOpen,false);assert.deepEqual(view.record.hardware.assembly.panelScrews,[true,true]);assert.equal(view.record.hardware.documentOpened,true);}
    view.controller.dispose();
  }
});

test('an out-of-order equipment action cannot skip the guided hardware step',()=>{
  const view=fixture();prepare(view);const before=structuredClone(view.record.hardware);
  const result=view.sceneOptions.onAction('asm-tighten-panel-0');assert.equal(result.kind,'warning');assert.deepEqual(view.record.hardware,before);assert.deepEqual(view.record.practice,[]);assert.match(view.fields.get('[data-foundation-feedback]').textContent,/Fit the DDR4|memory clips/);view.controller.dispose();
});

test('coding drafts remain on the same editor across tabs and only fresh executed fixtures complete the job',()=>{
  const view=fixture('coding');prepare(view);const editor=view.fields.get('[data-foundation-code]');
  const code='let price = 3;\nprint(quantity * price);';view.input(code);const changed=view.calls.changed;
  view.tab('explore');view.tab('check');view.tab('practice');
  assert.equal(view.fields.get('[data-foundation-code]'),editor);assert.equal(editor.value,code);assert.equal(view.record.code,code);assert.equal(view.calls.changed,changed);assert.equal(view.record.runCount,0);assert.equal(view.record.practice.length,0);
  view.click('foundationRun');assert.equal(view.record.runCount,1);assert.equal(view.record.results.length,3);assert.ok(view.record.results.every(result=>result.passed));assert.equal(foundationSummary('coding',view.record).complete,true);
  view.input('print(6);');assert.equal(view.record.results.length,0);assert.equal(foundationSummary('coding',view.record).complete,false);assert.equal(editor.value,'print(6);');view.controller.dispose();
});

test('the classic beginner view has no camera/loading controls and reports use the existing review flow',()=>{
  const view=fixture();const before=structuredClone(view.record);
  assert.doesNotMatch(view.markup,/foundation-camera|data-foundation-camera|\b3D\b|graphics loading|loading workstation|<canvas/i);assert.deepEqual(view.calls.camera,[]);assert.deepEqual(view.record,before);assert.equal(view.calls.changed,0);
  view.tab('check');view.calls.order.length=0;view.click('foundationReport');assert.deepEqual(view.calls.order,['cancel','report']);assert.equal(view.calls.report,view.record);assert.equal(view.calls.reports,1);view.controller.dispose();
});

test('section keys use roving focus and cleanup stops listeners and late scene actions',()=>{
  const view=fixture();assert.equal(view.key('explore','ArrowRight').prevented,true);assert.deepEqual(view.panels.map(panel=>panel.hidden),[true,false,true]);assert.equal(view.doc.activeElement?.dataset?.foundationSection,'practice');
  view.key('practice','End');assert.deepEqual(view.panels.map(panel=>panel.hidden),[true,true,false]);view.key('check','Home');assert.deepEqual(view.panels.map(panel=>panel.hidden),[false,true,true]);
  const changed=view.calls.changed;view.controller.dispose();view.controller.dispose();assert.equal(view.listeners.size,0);assert.equal(view.calls.disposed,1);
  view.sceneOptions.onAction('asm-fit-ram');view.sceneOptions.onStatus({kind:'ready',message:'Late status'});assert.equal(view.calls.changed,changed);
});

test('practice code is escaped in the page and cannot become markup',()=>{
  const record=createFoundationRecord('coding');record.code='</textarea><img src=x onerror=alert(1)>';
  const html=render('coding',record);assert.match(html,/&lt;\/textarea&gt;&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img src=x/);
});
