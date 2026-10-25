/** Public lesson starters and a private, page-memory planning workspace. */
import {SCENARIOS} from './scenarios.js?release=20261025-learning-plans';
import {FOUNDATION_LABS} from './foundation-model.js?release=20261025-learning-plans';
import {SANDBOX_STARTERS} from './coding-sandbox.js?release=20261025-learning-plans';
import {createTextReport,createReportURLs} from './report-downloads.js?release=20261025-learning-plans';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const LESSON_GRADES=Object.freeze([7,8,9,10,11,12]);
export const LESSON_CATEGORIES=Object.freeze([{id:'hardware',label:'Hardware'},{id:'network',label:'Networking'},{id:'ai',label:'AI'},{id:'security',label:'Cybersecurity'},{id:'coding',label:'Coding'}].map(Object.freeze));
const gradeSupport=[
 'Model one move. Use labeled pictures and the sentence frame: I noticed __, so I will test __.',
 'Offer a two-column before/after record. Partners rotate the controls and explain each result.',
 'Offer a short checklist and vocabulary cards. Let students choose their first test and explain it.',
 'Offer a comparison table. Pause for a peer to challenge the prediction before each test.',
 'Offer a planning template. Students choose roles and record one limitation in their evidence.',
 'Offer an accessible checklist or oral handoff. Students choose tools and justify their tradeoffs.'
];
// Each row names a different classroom task, observable outcome, and public practice route.
const subjects={
 hardware:[
  ['Follow the picture','Trace a display signal from a computer to its monitor.','Label the virtual output, cable and input. Change one connection and compare the screen.','Explain the difference between monitor power and a usable picture.','#lab/INC-101'],
  ['Where does power stop?','Use observations to trace a virtual power path.','Compare the lights and fans before and after one virtual power change.','Point to evidence that separates missing power from a failed startup.','#lab/INC-102'],
  ['Memory or storage?','Distinguish a startup memory check from stored files.','Read the startup warning. Predict one compatible virtual change, then test it.','Use the startup evidence to explain why the operating system is not the first suspect.','#lab/INC-103'],
  ['Choose compatible storage','Choose a compatible storage action that preserves the original task.','Compare component requirements. Test startup and the requested file separately.','Justify compatibility and show that the original file remains available.','#lab/INC-105'],
  ['Plan a complete build','Plan a virtual build against several classroom requirements.','Choose compatible parts. Check startup, display and file access; record a failed prediction.','Use three separate observations to defend whether the build meets the request.','#lab/INC-106'],
  ['Same symptom, new cause','Evaluate competing explanations for a familiar display symptom.','Investigate the new case independently. Compare two causes before making one change.','Give an evidence-based handoff and a test that would challenge the chosen explanation.','#lab/INC-107?mode=challenge']
 ],
 network:[
  ['Connect a small room','Build a connected workstation, switch and server layout.','Add the three devices in Network Studio. Connect them and run a packet test.','Trace the packet path and explain one disconnected result.','#studio/network'],
  ['Find the broken link','Use a controlled failure to explain network connections.','Build a working layout. Disconnect one cable, predict the failure, reconnect and retest.','Compare the failed and restored paths using the visible test results.','#studio/network'],
  ['Design the classroom LAN','Choose devices and cable media for a room requirement.','Count ports and read distances. Build the proposed layout and check the supplied requirements.','Explain why the chosen cable and device roles fit the room.','#lab/NET-208'],
  ['Allocate addresses and routes','Choose a subnet for 50 hosts and reconcile supplied routing-area evidence.','Compare usable address ranges and the supplied neighbor areas. Test the proposed allocation and routing boundary.','Justify the host capacity and area match, then explain an approved boundary check.','#lab/NET-209'],
  ['Separate groups safely','Test permitted and denied paths between network groups.','Compare VLAN, trunk and routing evidence. Predict both an allowed and a denied result.','Explain why a successful allowed path does not prove group separation.','#lab/NET-210'],
  ['Design a learning space','Defend a network plan against capacity, access and recovery needs.','Record a baseline, plan a controlled pilot, and test guest and staff paths.','Present a capacity decision, access evidence and a rollback plan.','#lab/NET-214']
 ],
 ai:[
  ['Give clear directions','Specify an audience, task and short output for a fictional AI activity.','Change a prompt choice on the activity board and compare the sample result.','Name one instruction that made the result easier to check.','#practice/AI-301'],
  ['Check the claim','Compare an AI claim with supplied evidence.','Mark a claim supported or unsupported, then test the board choices.','Point to the source evidence rather than the confidence of the wording.','#practice/AI-302'],
  ['Keep context private','Select useful fictional context without unnecessary identifiers.','Compare the supplied information choices and test the privacy decision.','Explain what context helps the task and what information should stay out.','#practice/AI-304'],
  ['Sources are not commands','Distinguish source material from instructions to an assistant.','Inspect the supplied source and choose which directions belong to the task. Test the boundary.','Explain how an embedded direction could redirect the task and how to keep the boundary.','#practice/AI-305'],
  ['Compare decision errors','Investigate how a threshold changes classification errors.','Adjust the supplied decision threshold and compare false positives and false negatives.','Defend a choice with two error types and an uncertainty.','#practice/AI-306'],
  ['Review generated code','Audit supplied generated code for access, secrets and query handling.','Compare the supplied code choices. Test the access rule and challenge a plausible unsafe result.','Present the audit evidence, an unresolved limitation and the human review still needed.','#practice/AI-303']
 ],
 security:[
  ['Spot a message clue','Identify evidence in a fictional suspicious message.','Select the message clues, choose a safe response and test your decision.','Explain a clue without opening a real link or contacting the sender.','#practice/SEC-401'],
  ['Give just enough access','Distinguish identity checks from permission to use a resource.','Compare account and access choices. Test an allowed and a denied action.','Explain why a successful sign-in is not permission for every action.','#practice/SEC-403'],
  ['Read the event trail','Use supplied records to compare possible security explanations.','Order the fictional observations and test a claim against more than one record.','State what the records support and what they do not prove.','#practice/SEC-402'],
  ['Contain with care','Choose a scoped response while preserving useful evidence.','Compare containment choices and their effects on the fictional service. Test the plan.','Justify the scope and identify evidence to preserve.','#practice/SEC-405'],
  ['Trust before install','Evaluate a supplied software package using more than one trust signal.','Compare publisher, integrity and permission evidence. Test the installation decision.','Explain why one positive signal cannot establish that software is safe.','#practice/SEC-406'],
  ['Defend account recovery','Evaluate a recovery request without sharing real secrets.','Compare the approved identity checks, recovery routes and audit choices. Test the decision.','Present a bounded identity conclusion, an audit record and a remaining uncertainty.','#practice/SEC-404']
 ],
 coding:[
  ['Make a pixel picture','Use printed numbers to make a small visual pattern.','Open the tiles starter. Change one digit, run it and compare the tiles.','Explain how the changed output digit changed the picture.','#sandbox/tiles'],
  ['Build a score meter','Use input and arithmetic to change a visual output.','Try the arcade starter. Move the input slider, change a calculation and run again.','Predict two outputs and compare them with the actual bars.','#sandbox/arcade'],
  ['Design your own pattern','Use a repeated structure to build a small original picture.','Start from tiles or a blank draft. Build two versions and test their printed output.','Explain a repeated rule and show how one edit changed the result.','#sandbox/tiles'],
  ['Test a decision boundary','Use boundary inputs to investigate a program decision.','Choose a coding starter. Add a decision and test below, at and above its boundary.','Show the three actual outputs and explain whether they match the intended rule.','#sandbox/blank'],
  ['Make a rover model','Use a loop and a running total in a bounded program.','Modify the rover starter. Predict a short run and compare its numeric output.','Explain the total and test a case that challenges the prediction.','#sandbox/rover'],
  ['Build and explain','Develop a small original program against a self-chosen goal.','Start blank or adapt a starter. Record a goal, build it and try normal and boundary inputs.','Demonstrate the visual result, tests, a limitation and the next change you would make.','#sandbox/blank']
 ]
};
export const LESSON_PRACTICE_LINKS=Object.freeze([
 ...FOUNDATION_LABS.map(p=>({link:'#learn/'+p.id,title:'Basics · '+p.title})),
 ...SCENARIOS.map(p=>({link:'#lab/'+p.id,title:'Investigation · '+p.id+' · '+p.title})),
 ...SCENARIOS.filter(p=>['network','ai','security'].includes(p.track)).map(p=>({link:'#practice/'+p.id,title:'Practice · '+p.title})),
 {link:'#lab/INC-107?mode=challenge',title:'Challenge · No Picture After a Presentation'},
 {link:'#studio/network',title:'Network Studio · Build your own network'},{link:'#studio/coding',title:'Coding Studio · Build your own project'},
 ...SANDBOX_STARTERS.map(p=>({link:'#sandbox/'+p.id,title:'Sandbox · '+p.title}))
].map(Object.freeze));
const links=Object.freeze(LESSON_PRACTICE_LINKS.map(p=>p.link));
const own=(value,key)=>{if(!value||typeof value!=='object')return undefined;const field=Object.getOwnPropertyDescriptor(value,key);return field&&'value'in field?field.value:undefined;};
const limits=Object.freeze({title:100,goals:600,sequence:1600,assessment:600,support:600,materials:400});
const durations=Object.freeze([20,30,40,45,50,60,90]);
const choice=(value,values,fallback)=>{if(!['string','number'].includes(typeof value))return fallback;const n=Number(value);return values.includes(n)?n:fallback;};
export function normalizeLessonPlan(input={}){
 const plan={};for(const [key,max]of Object.entries(limits)){const value=own(input,key);plan[key]=typeof value==='string'?value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,max):'';}
 plan.grade=choice(own(input,'grade'),LESSON_GRADES,7);
 plan.category=LESSON_CATEGORIES.some(item=>item.id===own(input,'category'))?own(input,'category'):'hardware';
 plan.duration=choice(own(input,'duration'),durations,40);
 plan.link=links.includes(own(input,'link'))?own(input,'link'):'';return plan;
}
export const READY_LESSON_PLANS=Object.freeze(LESSON_CATEGORIES.flatMap(category=>subjects[category.id].map((row,index)=>{
 const duration=index<2?40:index<4?50:60,work=duration-15;
 return Object.freeze({...normalizeLessonPlan({title:row[0],grade:LESSON_GRADES[index],category:category.id,duration,goals:row[1],sequence:'5 min · Predict: '+row[1]+'\n'+work+' min · Build and test: '+row[2]+'\n5 min · Compare: Explain what changed using the visible result.\n5 min · Share: '+row[3],assessment:row[3],support:gradeSupport[index],materials:'Browser and public virtual lab; paper or a text document for predictions. Use fictional details and virtual controls only.',link:row[4]}),id:'ready-'+category.id+'-'+LESSON_GRADES[index]});
})));
export function filterLessonPlans(input={}){const grade=own(input,'grade')??'all',category=own(input,'category')??'all';return READY_LESSON_PLANS.filter(plan=>(grade==='all'||plan.grade===choice(grade,LESSON_GRADES,0))&&(category==='all'||plan.category===category));}

const saved=new Map();let draft=normalizeLessonPlan(),draftId='',touched=false,nextId=1,dirty=false;
export function hasLessonPlanWork(){return touched||saved.size>0;}
export function clearLessonPlanWork(){saved.clear();draft=normalizeLessonPlan();draftId='';touched=false;dirty=false;nextId=1;}
export function lessonPlanDraft(){return {...draft};}
export function savedLessonPlans(){return [...saved].map(([id,plan])=>({...plan,id}));}
export function startLessonPlan(id=''){
 if(dirty)throw new Error('Save your current draft before starting another plan.');
 const source=READY_LESSON_PLANS.find(plan=>plan.id===id)||saved.get(id);
 if(id&&!source)throw new RangeError('Choose an available lesson plan.');
 draft=normalizeLessonPlan(source);draftId=saved.has(id)?id:'';touched=Boolean(id)||touched;dirty=Boolean(source&&!draftId);return lessonPlanDraft();
}
export function updateLessonPlanDraft(patch={}){const next={...draft};for(const key of Object.keys(draft)){const value=own(patch,key);if(value!==undefined)next[key]=value;}draft=normalizeLessonPlan(next);touched=true;dirty=true;return lessonPlanDraft();}
export function discardLessonPlanDraft(){draft=normalizeLessonPlan();draftId='';dirty=false;touched=false;}
export function saveLessonPlan(){
 for(const key of ['title','goals','sequence','assessment'])if(!draft[key].trim())throw new Error('Add a title, learning goal, lesson sequence and assessment before saving.');
 if(!draftId&&saved.size>=20)throw new Error('This page holds 20 plans. Download or remove one before saving another.');
 draftId=draftId||'custom-'+nextId++;saved.set(draftId,lessonPlanDraft());touched=true;dirty=false;return draftId;
}
export function removeLessonPlan(id){if(!saved.delete(id))return false;if(draftId===id){draftId='';dirty=true;}return true;}
const categoryName=id=>LESSON_CATEGORIES.find(item=>item.id===id)?.label||'Hardware';
export function lessonPlanText(input){const p=normalizeLessonPlan(input);return p.title+'\nGrade '+p.grade+' · '+categoryName(p.category)+' · '+p.duration+' minutes\n\nGoal\n'+p.goals+'\n\nMaterials\n'+p.materials+'\n\nLesson sequence\n'+p.sequence+'\n\nAssessment\n'+p.assessment+'\n\nSupport\n'+p.support+(p.link?'\n\nPublic practice\nhttps://www.colelearninglabs.com/'+p.link:'')+'\n';}
export function lessonPlanPreview(input,label='Lesson preview'){
 const p=normalizeLessonPlan(input);return '<article class="lesson-plan-preview"><p class="eyebrow">'+esc(label)+'</p><h3>'+esc(p.title||'Your lesson title')+'</h3><p class="lesson-plan-meta">Grade '+p.grade+' · '+esc(categoryName(p.category))+' · '+p.duration+' min</p>'+[['goals','Learning goal'],['materials','Materials'],['sequence','Lesson sequence'],['assessment','Evidence of learning'],['support','Support & choice']].map(([key,title])=>'<section><h4>'+title+'</h4><p>'+esc(p[key]||'Add this in your plan.')+'</p></section>').join('')+(p.link?'<a class="button button-outline" href="'+p.link+'">Open student practice →</a>':'')+'</article>';
}

const selectOptions=(values,selected)=>values.map(([value,label])=>'<option value="'+esc(value)+'"'+(String(value)===String(selected)?' selected':'')+'>'+esc(label)+'</option>').join('');
const gradeOptions=LESSON_GRADES.map(grade=>[grade,'Grade '+grade]),categoryOptions=LESSON_CATEGORIES.map(c=>[c.id,c.label]);
function cards(grade,category,selected){const plans=filterLessonPlans({grade,category});return '<p class="lesson-plan-count">'+plans.length+' ready '+(plans.length===1?'plan':'plans')+'</p><div class="lesson-plan-cards">'+plans.map(p=>'<button type="button" data-plan-select="'+p.id+'" aria-pressed="'+(selected===p.id)+'"><span>'+esc(categoryName(p.category))+' · '+p.duration+' min</span><strong>'+esc(p.title)+'</strong><small>Grade '+p.grade+'</small></button>').join('')+'</div>'+(plans.length?'':'<p>No plans match these choices. Try another grade or category.</p>');}
function savedCards(){return savedLessonPlans().map(p=>'<li><button type="button" data-plan-edit="'+p.id+'">'+esc(p.title)+'</button><button type="button" data-plan-remove="'+p.id+'" aria-label="Remove '+esc(p.title)+'">Remove</button></li>').join('')||'<li>Saved plans will appear here.</li>';}
export function renderLessonPlans(){
 const p=lessonPlanDraft(),first=READY_LESSON_PLANS[0],editing=hasLessonPlanWork();
 return '<section class="wrap lesson-plan-bank" aria-labelledby="lesson-bank-title"><header><p class="eyebrow">CHOOSE · ADAPT · TEACH</p><h2 id="lesson-bank-title">Find your next lesson</h2><p>30 ready plans: every grade from 7–12, across all five categories. Adjust for your students’ readiness.</p></header><div class="lesson-plan-filters"><label for="lesson-grade">Grade<select id="lesson-grade" data-plan-filter="grade">'+selectOptions([['all','All grades'],...gradeOptions],7)+'</select></label><label for="lesson-category">Category<select id="lesson-category" data-plan-filter="category">'+selectOptions([['all','All categories'],...categoryOptions],'all')+'</select></label></div><div class="lesson-plan-layout"><div><div data-plan-cards>'+cards(7,'all',first.id)+'</div><button type="button" class="button button-outline" data-plan-clone>Make my version</button><details class="lesson-plan-editor"'+(editing?' open':'')+'><summary>Create or edit my lesson</summary><p class="lesson-plan-memory">Plans stay in this page’s memory. Copy or download before closing or reloading. Use fictional details; this editor does not upload your plan.</p><div class="lesson-plan-editor-actions"><button type="button" data-plan-blank>Start a blank plan</button><button type="button" data-plan-discard>Discard current draft</button></div><form data-plan-form><label for="plan-title">Lesson title<input id="plan-title" type="text" data-plan-field="title" maxlength="100" value="'+esc(p.title)+'" required></label><div class="lesson-plan-filters"><label for="plan-grade">Grade<select id="plan-grade" data-plan-field="grade">'+selectOptions(gradeOptions,p.grade)+'</select></label><label for="plan-category">Category<select id="plan-category" data-plan-field="category">'+selectOptions(categoryOptions,p.category)+'</select></label><label for="plan-duration">Time<select id="plan-duration" data-plan-field="duration">'+selectOptions(durations.map(n=>[n,n+' minutes']),p.duration)+'</select></label></div>'+[['goals','Learning goal',3],['materials','Materials',2],['sequence','Lesson sequence — one activity per line',6],['assessment','How students show learning',3],['support','Support & student choice',3]].map(([key,label,rows])=>'<label for="plan-'+key+'">'+label+'<textarea id="plan-'+key+'" data-plan-field="'+key+'" rows="'+rows+'" maxlength="'+limits[key]+'"'+(['goals','sequence','assessment'].includes(key)?' required':'')+'>'+esc(p[key])+'</textarea></label>').join('')+'<label for="plan-link">Public practice link<select id="plan-link" data-plan-field="link">'+selectOptions([['','No practice link'],...LESSON_PRACTICE_LINKS.map(p=>[p.link,p.title])],p.link)+'</select></label><button type="submit" class="button">Save my plan in this page</button></form><h3>My saved plans <small>(up to 20)</small></h3><ul class="lesson-plan-saved" data-plan-saved>'+savedCards()+'</ul><button type="button" data-plan-clear>Clear my lesson plans</button></details></div><div class="lesson-plan-result"><div data-plan-preview>'+lessonPlanPreview(editing?p:first,editing?'My draft':'Ready lesson')+'</div><div class="lesson-plan-editor-actions"><button type="button" data-plan-copy>Copy shown plan</button><button type="button" data-plan-download>Download shown plan (.txt)</button></div><p data-plan-status role="status" aria-live="polite"></p></div></div></section>';
}

export function mountLessonPlans(root,{notify}={}){
 if(!root?.querySelector||!root.addEventListener)return ()=>{};
 const host=root.querySelector('.lesson-plan-bank');if(!host)return ()=>{};
 const find=selector=>host.querySelector(selector),controller=new AbortController(),urls=createReportURLs();
 let selected=READY_LESSON_PLANS[0].id,shown=hasLessonPlanWork()?lessonPlanDraft():READY_LESSON_PLANS[0];
 const status=message=>{const node=find('[data-plan-status]');if(node)node.textContent=message;notify?.(message);};
 const preview=(plan,label)=>{shown=normalizeLessonPlan(plan);find('[data-plan-preview]').innerHTML=lessonPlanPreview(shown,label);};
 const savedView=()=>{find('[data-plan-saved]').innerHTML=savedCards();};
 const fillDraft=()=>{const plan=lessonPlanDraft();for(const key of Object.keys(plan)){const node=find('[data-plan-field="'+key+'"]');if(node)node.value=String(plan[key]);}find('.lesson-plan-editor').open=true;preview(plan,'My draft');find('[data-plan-field="title"]').focus({preventScroll:true});};
 const changed=event=>{const key=event.target?.getAttribute?.('data-plan-field');if(!key||!Object.hasOwn(lessonPlanDraft(),key))return;updateLessonPlanDraft({[key]:event.target.value});preview(lessonPlanDraft(),'My draft · live preview');};
 const filter=event=>{
  if(!event.target?.hasAttribute?.('data-plan-filter'))return;
  const grade=find('[data-plan-filter="grade"]').value,category=find('[data-plan-filter="category"]').value,plans=filterLessonPlans({grade,category});
  selected=plans[0]?.id||'';find('[data-plan-cards]').innerHTML=cards(grade,category,selected);find('[data-plan-clone]').disabled=!selected;
  if(plans.length)preview(plans[0],'Ready lesson');
 };
 const click=async event=>{
  const button=event.target?.closest?.('button');if(!button||!host.contains(button))return;
  try{
   if(button.hasAttribute('data-plan-select')){selected=button.getAttribute('data-plan-select');const plan=READY_LESSON_PLANS.find(p=>p.id===selected);if(!plan)return;for(const card of host.querySelectorAll('[data-plan-select]'))card.setAttribute('aria-pressed',String(card===button));preview(plan,'Ready lesson');return;}
   if(button.hasAttribute('data-plan-clone')){startLessonPlan(selected);fillDraft();status('Your version is ready to edit. Save it when you are ready.');return;}
   if(button.hasAttribute('data-plan-blank')){startLessonPlan();fillDraft();status('Blank plan ready. Add a goal, activities and evidence of learning.');return;}
   if(button.hasAttribute('data-plan-discard')){discardLessonPlanDraft();fillDraft();status('Current draft discarded. Saved plans are still available.');return;}
   if(button.hasAttribute('data-plan-edit')){startLessonPlan(button.getAttribute('data-plan-edit'));fillDraft();status('Saved plan opened for editing.');return;}
   if(button.hasAttribute('data-plan-remove')){removeLessonPlan(button.getAttribute('data-plan-remove'));savedView();(find('[data-plan-edit]')||find('[data-plan-clear]'))?.focus({preventScroll:true});status('Saved copy removed. Any open draft remains available to edit or download.');return;}
   if(button.hasAttribute('data-plan-clear')){clearLessonPlanWork();fillDraft();savedView();status('Your lesson drafts and saved plans have been cleared from this page.');return;}
   if(button.hasAttribute('data-plan-copy')){const text=lessonPlanText(shown);try{await globalThis.navigator.clipboard.writeText(text);if(!controller.signal.aborted)status('Shown lesson copied.');}catch{if(!controller.signal.aborted)status('Copy is unavailable. Download the text file or select and copy the preview.');}return;}
   if(button.hasAttribute('data-plan-download')){let url;try{const artifact=createTextReport(lessonPlanText(shown));url=urls.create(artifact.blob);const link=root.ownerDocument.createElement('a');link.href=url;link.download='cole-learning-labs-lesson-plan.txt';link.hidden=true;host.append(link);try{urls.requested(url);link.click();}finally{link.remove();}status('Download requested. Check your device’s downloads.');}finally{if(url)urls.release(url);}return;}
  }catch(error){status(error instanceof Error?error.message:'That action is unavailable. Try another plan.');}
 };
 const submit=event=>{if(!event.target?.matches?.('[data-plan-form]'))return;event.preventDefault();try{saveLessonPlan();savedView();preview(lessonPlanDraft(),'My saved plan');status('Plan saved in this page. Copy or download it before closing or reloading.');}catch(error){status(error.message);}};
 host.addEventListener('input',changed,{signal:controller.signal});host.addEventListener('change',changed,{signal:controller.signal});host.addEventListener('change',filter,{signal:controller.signal});host.addEventListener('click',click,{signal:controller.signal});host.addEventListener('submit',submit,{signal:controller.signal});
 return ()=>{controller.abort();urls.clear();};
}
