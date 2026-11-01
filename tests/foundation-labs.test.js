import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {FOUNDATION_LABS,getFoundation,createFoundationRecord,applyFoundationAction,foundationSummary} from '../src/foundation-model.js';

const source=readFileSync(new URL('../src/foundation-labs.js',import.meta.url),'utf8');
const modelAction=(id,record,action)=>applyFoundationAction(id,record,structuredClone(action));
const moduleText=source.replace(/^import[^\n]+\n/gm,'').replaceAll('export function ','function ')+';({renderFoundationLab,mountFoundationLab})';
const renderVisual=()=>'<div aria-label="Fictional learning equipment"></div>';
const render=vm.runInNewContext(moduleText,{OWNER_PREVIEW:false,getFoundation,createFoundationRecord,applyFoundationAction:modelAction,foundationSummary,renderFoundationVisual:renderVisual,mountFoundationScene(){assert.fail('Rendering alone must not mount graphics.');}}).renderFoundationLab;

// A DOM boundary exercises the actual controller and model. Scene geometry,
// native touch, computed layout and school-device acceptance have separate QA.
function fixture(id='hardware',record=createFoundationRecord(id),{ownerPreview=false,actionModel=modelAction}={}) {
  const lab=getFoundation(id),fields=new Map(),listeners=new Map(),dynamic=new Map(),staticButtons=[],markers=[];
  const calls={changed:0,reports:0,mounts:0,updates:0,focus:[],camera:[],mode:[],visible:[],order:[],disposed:0};
  const doc={activeElement:null};let current=record,sceneOptions;
  const datasetName=name=>name.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  function element(dataset={}) {
    return {dataset,value:'',textContent:'',attrs:{},hidden:false,tabIndex:0,scrolled:[],listeners:new Map(),
      setAttribute(name,value){this.attrs[name]=String(value);},getAttribute(name){return this.attrs[name]??null;},removeAttribute(name){delete this.attrs[name];},
      focus(){doc.activeElement=this;},scrollIntoView(options){this.scrolled.push({block:options.block,behavior:options.behavior});},
      matches(selector){return selector.split(',').some(part=>{const match=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(part.trim());return !!match&&Object.hasOwn(this.dataset,datasetName(match[1]))&&(match[2]===undefined||this.dataset[datasetName(match[1])]===match[2]);});},
      closest(selector){return selector.split(',').some(part=>part.trim()==='button'?this.tagName==='BUTTON':this.matches(part.trim()))?this:null;},
      addEventListener(name,handler){this.listeners.set(name,handler);},removeEventListener(name,handler){if(this.listeners.get(name)===handler)this.listeners.delete(name);}
    };
  }
  function buttons(html){return [...html.matchAll(/<(button|a)\b([^>]*)>(.*?)<\/\1>/gs)].map(([,tag,attrs,text])=>{
    const data=Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)(?:="([^"]*)")?/g)].map(([,name,value])=>[datasetName(name),value??'']));
    const node=element(data);node.tagName=tag.toUpperCase();node.textContent=text;node.disabled=/\bdisabled(?:\s|=|$)/.test(attrs);for(const [,name,value]of attrs.matchAll(/([a-z-]+)="([^"]*)"/g))node.attrs[name]=value;return node;
  });}
  const markup=render(lab,current);staticButtons.push(...buttons(markup));
  const shell=element(),visual=element(),dialog=element();dialog.close=()=>calls.order.push('dialog close');
  fields.set('.foundation-lab',shell);fields.set('[data-foundation-visual]',visual);fields.set('#lab-dialog',dialog);
  const close=element();close.tagName='BUTTON';fields.set('#dialog-close',close);
  for(const name of ['explore','practice','check','stage','item-title','looks','role','feedback','code-workspace','code-results','progress','step-status','explanation-status','notes','reflection'])fields.set(`[data-foundation-${name}]`,element());
  for(const name of ['explore','practice','check'])Object.defineProperty(fields.get(`[data-foundation-${name}]`),'innerHTML',{get(){return this.markup||'';},set(html){this.markup=html;dynamic.set(name,buttons(html));}});
  Object.defineProperty(fields.get('[data-foundation-code-results]'),'innerHTML',{get(){return this.markup||'';},set(html){this.markup=html;}});
  const editor=element({foundationCode:''});editor.value=current.code;fields.set('[data-foundation-code]',editor);
  for(const name of ['notes','reflection']){const field=fields.get(`[data-foundation-${name}]`);field.dataset[datasetName('foundation-'+name)]='';field.value=current[name]||'';}
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
  const functions=vm.runInNewContext(moduleText,{OWNER_PREVIEW:ownerPreview,getFoundation,createFoundationRecord,applyFoundationAction:actionModel,foundationSummary,renderFoundationVisual:renderVisual,mountFoundationScene(host,options){calls.mounts++;assert.equal(host,visual);sceneOptions=options;return scene;}});
  const controller=functions.mountFoundationLab(root,{lab,record:current,onChange(record){current=record;calls.changed++;},onReport(record){calls.reports++;calls.report=record;calls.order.push('report');}});
  function click(field,value='') {
    const target=allButtons().find(button=>Object.hasOwn(button.dataset,field)&&(value===undefined||button.dataset[field]===value));assert.ok(target,`Missing ${field}=${value}`);
    if(!target.disabled){target.focus();listeners.get('click')({target});}return target;
  }
  return {lab,controller,calls,fields,panels,doc,listeners,markup,click,get record(){return current;},get sceneOptions(){return sceneOptions;},
    button(field,value=''){return allButtons().find(button=>Object.hasOwn(button.dataset,field)&&button.dataset[field]===value);},
    dispatch(field,value=''){const target=this.button(field,value);assert.ok(target,`Missing ${field}=${value}`);const event={target,preventDefault(){this.prevented=true;}};listeners.get('click')(event);return event;},
    tab(name){return click('foundationSection',name);},
    key(name,key){const target=allButtons().find(button=>button.dataset.foundationSection===name);const event={target,key,preventDefault(){this.prevented=true;}};listeners.get('keydown')(event);return event;},
    input(value,name='code'){const target=fields.get(`[data-foundation-${name}]`);target.value=value;listeners.get('input')({target});},
    prompt(name='practice'){return fields.get(`[data-foundation-${name}]`).innerHTML;}
  };
}
function exploreAll(view){for(const item of view.lab.items)view.click('foundationInspect',item.id);}
function prepare(view){exploreAll(view);view.tab('practice');for(const check of view.lab.checks){view.click('foundationAnswer',check.answer);view.click('foundationNextQuestion');}}

const visible = view => view.panels.map(panel=>!panel.hidden);
function completePractice(view){
  prepare(view);
  if(view.lab.track==='coding'){view.input('let price = 3;\nprint(quantity * price);');view.click('foundationRun');}
  else for(const job of view.lab.jobs)view.click('foundationJob');
  assert.equal(foundationSummary(view.lab.id,view.record).practiceComplete,true);
}
function writeExplanation(view){
  view.input('I completed the mini-job and checked the result shown on this page.','notes');
  view.input('The result matches the task because each required step and check worked.','reflection');
}

test('five beginner labs render the same three ordered steps with handoff controls only in Check and explain',()=>{
  assert.equal(FOUNDATION_LABS.length,5);
  for(const lab of FOUNDATION_LABS){
    const html=render(lab,createFoundationRecord(lab.id));
    assert.equal((html.match(/role="tab"/g)||[]).length,3);assert.equal((html.match(/role="tabpanel"/g)||[]).length,3);
    for(const [index,name] of ['explore','practice','check'].entries()){
      const panel=html.match(new RegExp('<section id="foundation-panel-'+name+'"[^>]*>'))?.[0];assert.ok(panel);assert.equal(/\bhidden\b/.test(panel),index>0);
      assert.match(panel,new RegExp('tabindex="'+(index===0?'0':'-1')+'"'),'The initial instruction panel is a keyboard stop.');
      assert.match(html,new RegExp('id="foundation-tab-'+name+'"[^>]*aria-controls="foundation-panel-'+name+'"'));
    }
    for(const label of ['Explore &amp; learn','Practice &amp; test','Check &amp; explain'])assert.ok(html.includes(label),label);
    assert.match(html,/foundation-flow/);assert.doesNotMatch(html,/foundation-split/);
    const checkStart=html.indexOf('id="foundation-panel-check"'),checkEnd=html.indexOf('</section>',checkStart);
    assert.ok(html.indexOf('data-foundation-report')>checkStart&&html.indexOf('data-foundation-report')<checkEnd);
    assert.ok(html.indexOf('data-foundation-ticket')>checkStart&&html.indexOf('data-foundation-ticket')<checkEnd);
    assert.doesNotMatch(html.match(/<a\b[^>]*data-foundation-ticket[^>]*>/)?.[0]||'',/\bhref=/,'The next ticket is locked in fresh markup.');
    assert.doesNotMatch(html,/foundation-help|foundation-split|Request &amp; clues/,'Beginner pages keep their own short ordered instructions.');
    for(const id of ['lab-dialog','dialog-content','dialog-close'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
    assert.doesNotMatch(html,/<input[^>]*type="(?:email|password)"/);
  }
});

test('rendering and mounting never award visits, answers or completion',()=>{
  for(const lab of FOUNDATION_LABS){
    const view=fixture(lab.id);assert.equal(view.calls.changed,0);assert.equal(view.record.explored.length,0);assert.equal(foundationSummary(lab.id,view.record).complete,false);
    assert.deepEqual(visible(view),[true,false,false]);assert.equal(view.calls.mounts,1);assert.equal(view.fields.get('[data-foundation-stage]').hidden,false);
    assert.ok(view.prompt('explore').includes(view.lab.items[0].label));view.controller.dispose();
  }
});

test('every distinct item is required before step 2 and tab, keyboard and forward controls cannot skip it',()=>{
  for(const lab of FOUNDATION_LABS){
    const view=fixture(lab.id);
    assert.equal(view.button('foundationSection','practice').disabled,true);assert.equal(view.button('foundationSection','check').disabled,true);assert.equal(view.button('foundationNext').disabled,true);
    view.dispatch('foundationSection','practice');view.dispatch('foundationSection','check');view.dispatch('foundationNext');view.key('explore','End');
    assert.deepEqual(visible(view),[true,false,false],lab.id);
    const first=lab.items[0];view.click('foundationInspect',first.id);view.click('foundationInspect',first.id);
    assert.deepEqual(view.record.explored,[first.id]);assert.equal(view.button('foundationSection','practice').disabled,true);
    assert.match(view.fields.get('[data-foundation-step-status]').textContent,new RegExp(`^1 of ${lab.items.length} items explored\\.`),'Repeated inspections do not inflate the visible progress.');
    assert.match(view.prompt('explore'),new RegExp(`<progress max="${lab.items.length}" value="1" aria-label="Items explored">`));
    for(const item of lab.items.slice(1,-1))view.click('foundationInspect',item.id);
    assert.equal(view.button('foundationNext').disabled,true);view.click('foundationInspect',lab.items.at(-1).id);
    assert.equal(view.button('foundationSection','practice').disabled,false);assert.equal(view.button('foundationSection','check').disabled,true);assert.equal(view.button('foundationNext').disabled,false);
    view.click('foundationNext');assert.deepEqual(visible(view),[false,true,false]);assert.equal(view.button('foundationNext').disabled,true);view.controller.dispose();
  }
});

test('native and scene inspections share one learning record and preserve the selected caption across steps',()=>{
  const view=fixture(),first=view.lab.items[0],second=view.lab.items[1],visual=view.fields.get('[data-foundation-visual]');
  view.click('foundationInspect',first.id);assert.deepEqual(view.record.explored,[first.id]);assert.deepEqual(view.calls.focus,[first.id]);
  assert.equal(view.fields.get('[data-foundation-looks]').textContent,'Look for: '+first.looks);assert.equal(view.fields.get('[data-foundation-role]').textContent,'Its job: '+first.role);
  view.sceneOptions.onInspect(second.id);assert.deepEqual(view.record.explored,[first.id,second.id]);assert.deepEqual(view.calls.focus,[first.id]);
  for(const item of view.lab.items.filter(item=>!view.record.explored.includes(item.id)))view.click('foundationInspect',item.id);
  const title=view.fields.get('[data-foundation-item-title]').textContent,before=structuredClone(view.record),changes=view.calls.changed;
  view.tab('practice');view.click('foundationBack');assert.deepEqual(visible(view),[true,false,false]);
  assert.equal(view.fields.get('[data-foundation-visual]'),visual);assert.equal(view.fields.get('[data-foundation-item-title]').textContent,title);assert.equal(view.calls.mounts,1);assert.equal(view.calls.changed,changes);assert.deepEqual(view.record,before);view.controller.dispose();
});

test('practice shows one role question, keeps a wrong answer, and requires reading feedback before the mini-job',()=>{
  const view=fixture('network');exploreAll(view);view.tab('practice');const first=view.lab.checks[0],wrong=first.options.find(option=>option.id!==first.answer);
  assert.ok(view.prompt().includes(first.prompt));assert.ok(!view.prompt().includes(view.lab.checks[1].prompt));assert.equal(view.button('foundationJob'),undefined);
  view.click('foundationAnswer',wrong.id);assert.equal(view.record.answers[first.id],wrong.id);assert.equal(foundationSummary('network',view.record).checked,0);assert.ok(view.prompt().includes(first.prompt));assert.equal(view.button('foundationNextQuestion'),undefined);
  view.click('foundationAnswer',first.answer);assert.ok(view.prompt().includes(first.explanation));assert.ok(!view.prompt().includes(view.lab.checks[1].prompt));assert.equal(view.button('foundationSection','check').disabled,true);
  view.click('foundationNextQuestion');assert.ok(view.prompt().includes(view.lab.checks[1].prompt));assert.equal(view.doc.activeElement?.dataset?.foundationAnswer,view.lab.checks[1].options[0].id);view.controller.dispose();
});

test('actual non-coding mini-jobs unlock Check, which hides the existing equipment and requires two saved explanations',()=>{
  for(const lab of FOUNDATION_LABS.filter(lab=>lab.track!=='coding')){
    const view=fixture(lab.id);prepare(view);const visual=view.fields.get('[data-foundation-visual]');
    view.dispatch('foundationSection','check');view.key('practice','End');assert.deepEqual(visible(view),[false,true,false]);
    for(const [index,job]of lab.jobs.entries()){
      assert.ok(view.prompt().includes(job.prompt),lab.id+' current job');assert.equal(view.button('foundationSection','check').disabled,true);
      view.click('foundationJob');assert.equal(view.record.practice.length,index+1,lab.id);
      if(index===lab.jobs.length-1)assert.equal(view.doc.activeElement,view.button('foundationNext'),'The removed final job button hands keyboard focus to the unlocked Next button.');
    }
    assert.equal(foundationSummary(lab.id,view.record).practiceComplete,true);assert.equal(foundationSummary(lab.id,view.record).complete,false);
    view.click('foundationNext');assert.deepEqual(visible(view),[false,false,true]);assert.equal(view.fields.get('[data-foundation-stage]').hidden,true);assert.equal(view.calls.visible.at(-1),false);assert.equal(view.fields.get('[data-foundation-visual]'),visual);assert.equal(view.calls.mounts,1);
    view.dispatch('foundationReport');assert.equal(view.calls.reports,0);assert.equal(view.dispatch('foundationTicket').prevented,true);
    view.input('           ','notes');view.input('A short note','reflection');view.dispatch('foundationReport');assert.equal(view.calls.reports,0);assert.equal(foundationSummary(lab.id,view.record).complete,false);
    view.input('I completed the task and checked its actual result.','notes');view.input('   ','reflection');view.dispatch('foundationReport');assert.equal(view.calls.reports,0);assert.equal(view.doc.activeElement,view.fields.get('[data-foundation-reflection]'),'Each explanation needs its own answer.');
    writeExplanation(view);assert.equal(view.record.explanationSaved,false);assert.equal(foundationSummary(lab.id,view.record).complete,false);
    view.calls.order.length=0;view.click('foundationReport');assert.equal(view.calls.reports,1);assert.equal(view.calls.report,view.record);assert.equal(foundationSummary(lab.id,view.record).complete,true);assert.equal(view.record.explanationSaved,true);
    assert.equal(view.button('foundationTicket').getAttribute('href'),'#lab/'+lab.nextLab);assert.ok(view.calls.order.indexOf('cancel')<view.calls.order.indexOf('report'));
    if(lab.track==='hardware'){assert.equal(view.record.hardware.ramSeated,true);assert.equal(view.record.hardware.assembly.ramClipsOpen,false);assert.deepEqual(view.record.hardware.assembly.panelScrews,[true,true]);assert.equal(view.record.hardware.documentOpened,true);}
    const saved=structuredClone(view.record),changes=view.calls.changed;view.click('foundationBack');view.click('foundationBack');view.click('foundationNext');view.click('foundationNext');
    assert.deepEqual(visible(view),[false,false,true]);assert.deepEqual(view.record,saved);assert.equal(view.calls.changed,changes);assert.equal(view.calls.mounts,1);assert.equal(view.fields.get('[data-foundation-notes]').value,saved.notes);assert.equal(view.fields.get('[data-foundation-reflection]').value,saved.reflection);
    view.input('Changed but not yet saved explanation of the result.','notes');assert.equal(view.record.explanationSaved,false);assert.equal(foundationSummary(lab.id,view.record).complete,false);assert.equal(view.button('foundationTicket').getAttribute('href'),null);assert.equal(view.dispatch('foundationTicket').prevented,true);view.controller.dispose();
  }
});

test('restored successful practice keeps real results and explanation drafts without replaying the jobs',()=>{
  const original=fixture('coding');completePractice(original);original.tab('check');writeExplanation(original);const draft=original.record;original.controller.dispose();
  const restored=fixture('coding',draft);assert.equal(restored.calls.changed,0);assert.equal(restored.record,draft);assert.equal(restored.calls.mounts,1);assert.equal(restored.button('foundationSection','check').disabled,false);
  restored.tab('check');assert.deepEqual(visible(restored),[false,false,true]);assert.equal(restored.fields.get('[data-foundation-stage]').hidden,true);assert.equal(restored.fields.get('[data-foundation-notes]').value,draft.notes);assert.equal(restored.fields.get('[data-foundation-reflection]').value,draft.reflection);assert.equal(restored.record.runCount,1);assert.equal(restored.record.explanationSaved,false);
  restored.click('foundationReport');assert.equal(restored.calls.reports,1);assert.equal(foundationSummary('coding',restored.record).complete,true);restored.controller.dispose();
});

test('out-of-order scene actions cannot bypass the current guided hardware job',()=>{
  const view=fixture();prepare(view);const before=structuredClone(view.record.hardware);
  const result=view.sceneOptions.onAction('asm-tighten-panel-0');assert.equal(result.kind,'warning');assert.deepEqual(view.record.hardware,before);assert.deepEqual(view.record.practice,[]);assert.match(view.fields.get('[data-foundation-feedback]').textContent,/Fit the memory|memory clips/i);assert.equal(view.button('foundationSection','check').disabled,true);view.controller.dispose();
});

test('coding keeps the same editor and draft while navigation cannot substitute for a fresh successful run',()=>{
  const view=fixture('coding');prepare(view);const editor=view.fields.get('[data-foundation-code]'),visual=view.fields.get('[data-foundation-visual]');
  assert.equal(view.fields.get('[data-foundation-code-workspace]').hidden,false,'The editor becomes visible immediately after the last role question.');
  const code='let price = 3;\nprint(quantity * price);';view.input(code);const changed=view.calls.changed;
  view.tab('explore');assert.equal(view.fields.get('[data-foundation-code-workspace]').hidden,true);view.dispatch('foundationSection','check');assert.deepEqual(visible(view),[true,false,false]);view.tab('practice');assert.equal(view.fields.get('[data-foundation-code-workspace]').hidden,false);
  assert.equal(view.fields.get('[data-foundation-code]'),editor);assert.equal(editor.value,code);assert.equal(view.record.code,code);assert.equal(view.calls.changed,changed);assert.equal(view.record.runCount,0);assert.equal(view.record.practice.length,0);
  view.click('foundationRun');assert.equal(view.record.runCount,1);assert.equal(view.record.results.length,3);assert.ok(view.record.results.every(result=>result.passed));assert.equal(foundationSummary('coding',view.record).practiceComplete,true);
  view.tab('check');writeExplanation(view);view.click('foundationReport');assert.equal(foundationSummary('coding',view.record).complete,true);assert.equal(view.calls.reports,1);
  view.input('print(6);');assert.equal(view.record.results.length,0);assert.equal(foundationSummary('coding',view.record).practiceComplete,false);assert.equal(foundationSummary('coding',view.record).complete,false);assert.deepEqual(visible(view),[false,true,false]);assert.equal(view.button('foundationSection','check').disabled,true);assert.equal(view.fields.get('[data-foundation-stage]').hidden,false);
  view.dispatch('foundationReport');view.dispatch('foundationSection','check');assert.equal(view.calls.reports,1);assert.deepEqual(visible(view),[false,true,false]);
  view.click('foundationRun');assert.ok(view.record.results.some(result=>!result.passed));assert.equal(view.button('foundationSection','check').disabled,true);
  view.input(code);view.click('foundationRun');assert.equal(foundationSummary('coding',view.record).practiceComplete,true);assert.equal(foundationSummary('coding',view.record).complete,false,'New code needs a newly saved explanation.');
  assert.equal(view.fields.get('[data-foundation-code]'),editor);assert.equal(view.fields.get('[data-foundation-visual]'),visual);assert.equal(view.calls.mounts,1);assert.equal(editor.value,code);view.controller.dispose();
});

test('early report dispatch cannot open export and the beginner view has no loading or camera controls',()=>{
  const view=fixture(),before=structuredClone(view.record);
  assert.doesNotMatch(view.markup,/foundation-camera|data-foundation-camera|\b3D\b|graphics loading|loading workstation|<canvas/i);assert.deepEqual(view.calls.camera,[]);assert.deepEqual(view.record,before);assert.equal(view.calls.changed,0);
  view.dispatch('foundationReport');assert.equal(view.calls.reports,0);view.controller.dispose();
});

test('section keys respect completion gates and cleanup stops late scene actions and input listeners',()=>{
  const view=fixture();assert.equal(view.key('explore','ArrowRight').prevented,true);assert.deepEqual(visible(view),[true,false,false]);
  exploreAll(view);view.key('explore','ArrowRight');assert.deepEqual(visible(view),[false,true,false]);assert.equal(view.doc.activeElement?.dataset?.foundationSection,'practice');
  view.key('practice','End');assert.deepEqual(visible(view),[false,true,false]);view.key('practice','Home');assert.deepEqual(visible(view),[true,false,false]);
  const changed=view.calls.changed;view.controller.dispose();view.controller.dispose();assert.equal(view.listeners.size,0);assert.equal(view.calls.disposed,1);
  view.sceneOptions.onAction('asm-fit-ram');view.sceneOptions.onStatus({kind:'ready',message:'Late status'});assert.equal(view.calls.changed,changed);
});

test('practice code and explanation drafts are escaped and cannot become page markup',()=>{
  const record=createFoundationRecord('coding');record.code='</textarea><img src=x onerror=alert(1)>';record.notes='</textarea><img src=x>';record.reflection='<script>alert(1)</script>';
  const html=render('coding',record);assert.match(html,/&lt;\/textarea&gt;&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img src=x|<script>alert/);assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('live boards show current network, AI and security outcomes without a duplicate equipment wall',()=>{
  for(const id of ['network','ai','security']){
    const view=fixture(id);assert.doesNotMatch(view.prompt(),/foundation-live-board/i);
    exploreAll(view);view.tab('practice');assert.doesNotMatch(view.prompt(),/foundation-live-board/i);view.controller.dispose();
    const ready=fixture(id);prepare(ready);assert.match(ready.prompt(),/foundation-live-board/i);assert.equal(ready.fields.get('[data-foundation-stage]').hidden,true);
    for(const job of ready.lab.jobs)ready.click('foundationJob');
    if(id==='network'){assert.match(ready.prompt(),/192\.0\.2\.20/);assert.match(ready.prompt(),/Page open/);assert.match(ready.prompt(),/foundation-packet/i);}
    if(id==='ai'){assert.match(ready.prompt(),/AI reply · corrected/);assert.match(ready.prompt(),/A person checked accuracy and fairness/);}
    if(id==='security'){assert.match(ready.prompt(),/Password \+ practice authenticator/);assert.match(ready.prompt(),/Learner · open the lesson/);assert.doesNotMatch(ready.prompt(),/Administrator ·/);}
    assert.equal(ready.button('foundationNext').disabled,false);assert.equal(ready.record.explanationSaved,false);ready.controller.dispose();
  }
});

test('trying a tempting wrong choice gives useful feedback and cannot change the board or award progress',()=>{
  for(const id of ['network','ai','security']){
    const view=fixture(id);prepare(view);
    for(const [index,choice]of view.lab.choices.entries()){
      const before=structuredClone(view.record.simulation);view.click('foundationChoice',choice.action);
      assert.deepEqual(view.record.simulation,before);assert.equal(view.record.practice.length,index);assert.match(view.fields.get('[data-foundation-feedback]').textContent,new RegExp(choice.feedback.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')));assert.equal(view.button('foundationSection','check').disabled,true);
      view.click('foundationJob');
    }
    view.controller.dispose();
  }
});

test('coding operator controls edit without running and clear old bars until the changed program is tested',()=>{
  const view=fixture('coding');prepare(view);view.click('foundationRun');assert.match(view.fields.get('[data-foundation-code-results]').innerHTML,/<meter\b/i);assert.ok(view.record.results.some(result=>!result.passed));
  const runs=view.record.runCount;view.click('foundationOperator','*');assert.match(view.record.code,/quantity \* price/);assert.equal(view.record.runCount,runs);assert.equal(view.record.results.length,0);assert.doesNotMatch(view.fields.get('[data-foundation-code-results]').innerHTML,/<meter\b/i);
  view.click('foundationRun');assert.ok(view.record.results.every(result=>result.passed));assert.equal((view.fields.get('[data-foundation-code-results]').innerHTML.match(/data-foundation-result="pass"/g)||[]).length,3);assert.match(view.fields.get('[data-foundation-code-results]').innerHTML,/Target 15 · Your result 15/);
  view.click('foundationOperator','+');assert.equal(view.record.results.length,0);assert.equal(view.button('foundationSection','check').disabled,true);view.controller.dispose();
});

test('owner beginner previews unlock sections, questions and tools without filling answers or completing the course',async()=>{
  const modelUrl=new URL('../src/foundation-model.js',import.meta.url);
  const ownerSource=readFileSync(modelUrl,'utf8')
    .replace(/^import[^\n]*\bOWNER_PREVIEW\b[^\n]*\r?\n/mu,'const OWNER_PREVIEW=true;\n')
    .replace(/from (['"])(\.\/[^'"]+)\1/gu,(_match,quote,specifier)=>'from '+quote+new URL(specifier,modelUrl).href+quote);
  const ownerModel=await import('data:text/javascript;base64,'+Buffer.from(ownerSource).toString('base64'));
  const ownerAction=(id,record,action)=>ownerModel.applyFoundationAction(id,record,structuredClone(action));
  for(const lab of FOUNDATION_LABS){
    const view=fixture(lab.id,createFoundationRecord(lab.id),{ownerPreview:true,actionModel:ownerAction});
    const before=structuredClone(view.record),changed=view.calls.changed;
    view.tab('check');assert.deepEqual(visible(view),[false,false,true]);
    assert.doesNotMatch(view.prompt('check'),/Your task works|Practice finished/);
    assert.equal(view.button('foundationTicket').attrs.href,'#lab/'+lab.nextLab);
    view.tab('explore');view.click('foundationNext');assert.deepEqual(visible(view),[false,true,false]);
    view.click('foundationNextQuestion');assert.match(view.prompt(),/Question 2 OF/);
    view.click('foundationOpenTools');assert.doesNotMatch(view.prompt(),/Question \d OF/);
    if(lab.track==='coding')assert.equal(view.fields.get('[data-foundation-code-workspace]').hidden,false);
    view.click('foundationReviewQuestions');assert.match(view.prompt(),/Question 1 OF/);
    view.key('practice','End');assert.deepEqual(visible(view),[false,false,true]);
    assert.deepEqual(view.record,before,lab.id+' navigation cannot manufacture course work');assert.equal(view.calls.changed,changed);
    view.click('foundationReport');assert.equal(view.calls.reports,0);assert.equal(view.record.explanationSaved,false);
    assert.equal(foundationSummary(lab.id,view.record).complete,false);
    view.controller.dispose();
  }
  const security=fixture('security',createFoundationRecord('security'),{ownerPreview:true,actionModel:ownerAction});
  security.tab('practice');security.click('foundationOpenTools');
  security.sceneOptions.onAction('enable-mfa');
  assert.equal(security.record.simulation.scopeConfirmed,false);assert.equal(security.record.simulation.mfaEnabled,false);assert.deepEqual(security.record.practice,[],'Scope still precedes a security action.');
  security.click('foundationJob');assert.equal(security.record.simulation.scopeConfirmed,true);security.controller.dispose();
  const hardware=fixture('hardware',createFoundationRecord('hardware'),{ownerPreview:true,actionModel:ownerAction});
  const equipment=structuredClone(hardware.record.hardware);hardware.sceneOptions.onAction('boot');
  assert.deepEqual(hardware.record.hardware,equipment);assert.deepEqual(hardware.record.practice,[],'Unsafe/out-of-order power actions remain blocked.');hardware.controller.dispose();
  const coding=fixture('coding',createFoundationRecord('coding'),{ownerPreview:true,actionModel:ownerAction});
  coding.tab('practice');coding.click('foundationOpenTools');coding.input('print(quantity * 3);');coding.click('foundationRun');
  assert.equal(coding.record.results.length,3);assert.ok(coding.record.results.every(result=>result.passed),'Tests still execute against the actual program.');
  assert.deepEqual(coding.record.answers,{});assert.deepEqual(coding.record.explored,[]);assert.equal(foundationSummary('coding',coding.record).complete,false);coding.controller.dispose();
});
