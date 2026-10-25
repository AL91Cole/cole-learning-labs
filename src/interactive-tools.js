// Direct controls use existing fixed workspace actions; nothing executes user code.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const code=id=>typeof id==='string'?id.replaceAll('-','').toUpperCase():'';
const f=(name,label,options)=>({name,label,options:options.map(x=>Array.isArray(x)?x:[x,x])});
const CONFIG={};
const add=(id,title,action,fields)=>{CONFIG[id]={title,action,fields};};
add('NET201','Configure the workstation','save-network',[
f('ip','Workstation address',['192.168.1.25','10.24.8.25','10.24.8.53']),f('mask','Subnet mask',['255.255.255.0','255.255.0.0']),f('gateway','Gateway',['10.24.8.1','192.168.1.1']),f('dns','DNS server',['192.168.1.53','10.24.8.53'])]);
add('NET202','Build the teacher’s access path','save-access',[
f('network','1 · Network',['School-Guest','Staff-Lab']),f('folder','2 · Shared folder',['All folders','Project Materials','No folders']),f('permission','3 · Teacher access',['Full control','Modify','Read','None'])]);
add('NET203','Recover startup and services','save-recovery',[
f('recovery','Startup recovery',['Keep current update','Roll back KB-LAB-17','Reset and erase files']),f('status','Update service',['Stopped','Running']),f('startup','After restart',['Disabled','Manual','Automatic'])]);
add('AI301','Build a practice prompt','save-prompt',[]);
add('AI302','Sort the claims','save-claims',[
...['“Check the display cable first.”','“Reset passwords every 90 days.”','“Their name shows they did not try.”'].map((label,i)=>f(`claim${i}`,label,[['supported','Supported'],['unsupported','Unsupported'],['biased','Unsupported / biased']])),f('ticketA','Alex · powered monitor, disconnected HDMI',['Display / cable','Password reset','User effort']),f('ticketB','Jordan · powered monitor, disconnected HDMI',['Display / cable','Password reset','User effort'])]);
add('AI303','Patch the code preview','save-code',[
f('secret','Key storage',[['hardcoded','Key in source'],['environment','Environment; stop if missing']]),f('query','Database input',[['concatenated','Join input to SQL'],['parameterized','Separate query parameters']]),f('authorization','Record access',[['signed-in','Any signed-in user'],['hidden','Hide record links'],['owner','Check record owner']])]);
add('SEC401','Mark the message evidence','save-triage',[
f('flags','Select the warning signs',[['sender','Sender: school-account-check.test'],['destination','Destination: school-account-check.test/verify'],['urgency','“Deleted in 10 minutes”']]),f('verdict','Urgent message verdict',[['safe','Safe to provide credentials'],['phishing','Report as phishing']]),f('permission','Helper’s checklist access',['Administrator','Edit all folders','Read only','No access'])]);
add('SEC402','Correlate and contain','save-response',[
f('events','Select related events',[['EVT-101','09:10 · .25 · teacher login'],['EVT-102','09:12 · .24 · 18 failed logins'],['EVT-103','09:13 · .24 · login success'],['EVT-104','09:14 · .25 · portal opens']]),f('source','Temporary source block',['10.24.8.25','198.51.100.24']),f('port','Close a listener',[['23','TCP 23 · Telnet'],['443','TCP 443 · HTTPS'],['53','UDP 53 · DNS']]),f('keepHttps','Learning portal',[['true','Keep HTTPS available'],['false','Disable HTTPS']])]);
add('SEC403','Test access, then patch','set-authorization',[
f('patch','Access rule',[['none','Original policy'],['hidden','Hide other record links'],['owner','Require record ownership']])]);
const expanded=(id,title,fields)=>add(id,title,'save-expanded',fields);
expanded('NET204','Place and tune the access point',[
f('placement','Access-point position',[['cupboard','Metal cupboard'],['ceiling-center','Center ceiling'],['hallway','Far hallway']]),f('band','Radio band',[['2.4','2.4 GHz'],['5','5 GHz']]),f('channel','Primary channel',['36','40','44']),f('width','Channel width',[['80','80 MHz'],['20','20 MHz']])]);
expanded('NET205','Release the classroom handout',[
f('spooler','Spooler service',[['stopped','Stop'],['running','Start']]),f('queue','Queue',[['paused','Pause'],['resume','Resume']]),f('port','Printer',[['old','Old printer · offline'],['approved','Classroom printer · online']]),f('job','JOB-041',[['hold','Hold original'],['release','Release original'],['delete','Delete queue']])]);
expanded('NET206','Restore and compare the backup',[
f('snapshot','Snapshot',[['B-16','B-16 · Plan only'],['B-17','B-17 · Plan + test results'],['B-18','B-18 · Empty export']]),f('destination','Restore to',[['overwrite','Current file'],['recovery','Separate recovery folder']]),f('preserve','Damaged copy',[['delete','Delete'],['keep','Preserve']]),f('integrity','After copying',[['skip','Skip verification'],['compare','Compare content + manifest']])]);
expanded('AI304','Choose what travels through the activity',[
f('input','Activity text',[['records','Private reading records'],['fiction','Invented paragraph']]),f('identifiers','Learner identifiers',[['collect','Name + student ID'],['none','No identifiers']]),f('route','Processing',[['external','External service'],['local','Local scripted preview']]),f('participation','Participation',[['required','AI activity required'],['alternative','Equivalent non-AI option']])]);
expanded('AI305','Keep source text inside its boundary',[
f('boundary','Source paragraph',[['follow','Follow its instructions'],['data','Use as untrusted evidence']]),f('injected','Unrelated roster request',[['execute','Carry out request'],['reject','Reject disclosure request']]),f('citation','Network fact citation',[['none','No citation'],['S-12','Cite S-12']]),f('review','Before sharing',[['automatic','Publish automatically'],['human','Human review']])]);
expanded('AI306','Route tickets to human review',[
f('threshold','Review threshold',[['0.80','.80'],['0.50','.50']]),f('decision','Score decision',[['auto','Automatically close'],['human','Human review']]),f('audit','Compare results',[['overall','Overall only'],['both','Groups A and B']]),f('limitation','Evidence limit',[['guarantee','Works for all schools'],['small','Four examples only']])]);
expanded('SEC404','Recover the fictional account',[
f('identity','Check identity',[['chat','Trust urgent chat'],['approved','Approved help-desk route']]),f('factor','Lost authenticator',[['keep','Keep active'],['revoke','Revoke factor']]),f('reset','Recovery method',[['disable','Disable MFA'],['supervised','Supervised single-use reset']]),f('audit','Recovery record',[['none','No record'],['record','Record approved action']])]);
expanded('SEC405','Contain and recover',[
f('containment','LAB-ENDPOINT-07',[['connected','Connected'],['isolate','Isolate endpoint']]),f('evidence','Incident evidence',[['wipe','Wipe endpoint'],['preserve','Preserve evidence']]),f('notify','Response team',[['silent','Handle alone'],['team','Notify response team']]),f('recovery','Backup R-08',[['infected','Affected endpoint'],['clean','Clean recovery environment']])]);
expanded('SEC406','Inspect a package before a pilot',[
f('package','Candidate package',[['B','B · unsigned mirror'],['A','A · approved catalog'],['C','C · digest mismatch']]),f('signature','Publisher signature',[['skip','Skip'],['verify','Verify signature']]),f('digest','Integrity',[['skip','Trust filename'],['verify','Compare trusted digest']]),f('deployment','Deployment',[['all-admin','All devices · admin'],['pilot','Limited standard-user pilot']])]);
const CHIPS=[['fiction','For a fictional learner,'],['task','write a short explanation of computer networks.'],['practice','Include one practice question.'],['verify','Verify the explanation against class notes.']];
const get=(state,name)=>/^claim[012]$/.test(name)?state.claims?.[Number(name.at(-1))]:state[name];
export const interactiveToolFields=id=>(CONFIG[code(id)]?.fields??[]).map(item=>({...item,options:item.options.map(pair=>[...pair])}));
export function interactiveToolAction(id,state,name,value) {
  const config=CONFIG[code(id)];
  if(!config || !state || typeof state!=='object' || Array.isArray(state))return null;
  if(code(id)==='AI301') {
    if(name!=='prompt' || typeof value!=='string' || value.length>3000)return null;
    return {action:'save-prompt',value:{prompt:value}};
  }
  const item=config.fields.find(item=>item.name===name);
  if(!item || !item.options.some(([option])=>option===value))return null;
  if(config.action==='save-expanded')return {action:config.action,value:{[name]:value}};
  if(code(id)==='SEC403')return state.scope===true?{action:'set-authorization',value}:null;
  const payload=Object.fromEntries(config.fields.map(item=>[item.name,get(state,item.name)]));
  if(['flags','events'].includes(name)) {
    const previous=Array.isArray(state[name])?state[name].filter(x=>item.options.some(([option])=>option===x)):[];
    payload[name]=previous.includes(value)?previous.filter(x=>x!==value):[...previous,value];
  } else payload[name]=name==='keepHttps'?value==='true':value;
  return {action:config.action,value:payload};
}
function preview(id,state) {
  if(id==='NET202')return `<div class="it-flow"><span>Teacher</span><i>→</i><span>${esc(state.network)}</span><i>→</i><span>${esc(state.folder)}<small>${esc(state.permission)}</small></span></div>`;
  if(id==='AI304')return `<div class="it-flow"><span>${state.input==='fiction'?'Invented text':'Private records'}</span><i>→</i><span>${state.route==='local'?'Local preview':'External service'}</span><i>→</i><span>${state.participation==='alternative'?'Choice available':'Required'}</span></div>`;
  if(id==='AI305')return `<div class="it-flow"><span>Source S-12</span><i>→</i><span>${state.boundary==='data'?'Evidence boundary':'Instruction accepted'}</span><i>→</i><span>${state.injected==='reject'?'Roster request blocked':'Disclosure selected'}</span></div>`;
  if(id==='SEC402')return `<div class="it-flow"><span>${esc(state.events?.length??0)} selected events</span><i>→</i><span>${esc(state.source||'No source block')}</span><i>→</i><span>HTTPS ${state.keepHttps?'available':'disabled'}</span></div>`;
  return '';
}
function matrix(state) {
  // Fixed examples are the same four scored tickets shown in the original evaluation artifact.
  const low=state.threshold==='0.50';
  return `<div class="it-matrix" aria-label="Saved threshold results"><div><b>${low?2:1}</b><span>Urgent → review</span></div><div><b>${low?0:1}</b><span>Urgent → missed</span></div><div><b>${low?1:0}</b><span>Routine → review</span></div><div><b>${low?1:2}</b><span>Routine → no escalation</span></div></div><p class="it-note">Four fictional tickets. Preview only; run the test to verify your plan.</p>`;
}
export function renderInteractiveTools(scenario,state={}) {
  const id=code(scenario?.id),config=CONFIG[id];
  if(!config)return '';
  const prompt=id==='AI301'?`<div class="it-chips" role="group" aria-label="Add to your prompt">${CHIPS.map(([name,text])=>`<button type="button" data-it-chip="${name}">${esc(text)}</button>`).join('')}<button type="button" data-it-chip="clear">Start a blank prompt</button></div><p class="it-note">Chips edit the prompt below. Review it, then choose Save prompt.</p>`:'';
  const cards=config.fields.map(item=>{
    const multi=['flags','events'].includes(item.name),current=get(state,item.name);
    const choices=item.options.map(([value,label])=>{
      const active=multi?Array.isArray(current)&&current.includes(value):String(current)===value;
      return `<button type="button" data-it-field="${item.name}" data-it-value="${esc(value)}" aria-pressed="${active}"${id==='SEC403'&&!state.scope?' disabled':''}><span aria-hidden="true">${active?'●':'○'}</span>${esc(label)}</button>`;
    }).join('');
    const slider=id==='AI306'&&item.name==='threshold'?`<label class="it-slider">Review threshold: <output>${esc(state.threshold)}</output><input data-it-threshold type="range" min="0" max="1" step="1" value="${state.threshold==='0.50'?0:1}" aria-label="Review threshold" aria-valuetext="${state.threshold==='0.50'?'0.50':'0.80'}"></label>`:'';
    return `<fieldset class="it-card${multi?' it-card-multi':''}"><legend>${esc(item.label)}</legend>${slider}<div class="it-options">${choices}</div></fieldset>`;
  }).join('');
  const test=id==='AI301'?'Check saved prompt':id==='SEC403'?'Test both records':'Run workspace test';
  return `<section class="interactive-tools" aria-label="Interactive practice controls" data-it-tools><div class="it-heading"><div><small>TRY IT ON THE WORKBENCH</small><h3>${esc(config.title)}</h3></div><span>Local simulation</span></div>${preview(id,state)}${prompt}<div class="it-grid">${cards}</div>${id==='AI306'?matrix(state):''}<div class="it-footer"><p>${id==='AI301'?'Save your edited prompt before checking.':'Choose a card to apply one change. Test when you are ready.'}</p><button type="button" data-it-test${id==='SEC403'&&!state.scope?' disabled':''}>${test}</button></div><p class="it-live" data-it-live role="status" aria-live="polite">${state.tested?'Latest test is shown below.':'Changed choices need a fresh test.'}</p></section>`;
}

/** All event values must pass the same fixed choice contract as the rendered controls. */
export function mountInteractiveTools(root,scenario,getSavedState,onAction) {
  const id=code(scenario?.id),config=CONFIG[id];
  if(!config || typeof root?.querySelectorAll!=='function' || typeof onAction!=='function')return;
  const saved=()=>typeof getSavedState==='function'?getSavedState():getSavedState;
  const dispatch=(name,value)=>{
    const next=interactiveToolAction(id,saved(),name,value);
    if(!next)return;
    onAction(next.action,next.value);
    // A saved change may replace the workspace. Keep keyboard focus on that control.
    const replacement=Array.from(root.querySelectorAll('[data-it-field]')).find(button=>button.dataset.itField===name&&button.dataset.itValue===value);
    replacement?.focus?.({preventScroll:true});
  };
  root.querySelectorAll('[data-it-field]').forEach(button=>button.addEventListener('click',()=>dispatch(button.dataset.itField,button.dataset.itValue)));
  root.querySelectorAll('[data-it-test]').forEach(button=>button.addEventListener('click',()=>onAction('run-check')));
  root.querySelectorAll('[data-it-threshold]').forEach(input=>input.addEventListener('change',()=>dispatch('threshold',input.value==='0'?'0.50':'0.80')));
  root.querySelectorAll('[data-it-chip]').forEach(button=>button.addEventListener('click',()=>{
    const area=root.querySelector?.('textarea[name="prompt"]');
    if(!area || typeof area.value!=='string')return;
    const chip=CHIPS.find(([name])=>name===button.dataset.itChip);
    if(button.dataset.itChip==='clear')area.value='';
    else if(chip)area.value=`${area.value.trim()} ${chip[1]}`.trim().slice(0,3000);
    else return;
    area.focus?.();
    const live=root.querySelector?.('[data-it-live]');
    if(live)live.textContent='Prompt draft changed. Review it and choose Save prompt.';
  }));
  // Keep typed settings available; direct cards are the shorter default route.
  // Guard DOM-specific operations so read-only render harnesses remain supported.
  if(id==='AI301')return;
  root.querySelectorAll('form[data-form], form.exp-controls').forEach(form=>{
    if(!form.parentNode?.insertBefore || !form.ownerDocument?.createElement || form.closest?.('.it-advanced'))return;
    const details=form.ownerDocument.createElement('details');details.className='it-advanced';
    const summary=form.ownerDocument.createElement('summary');summary.textContent='More settings and previews';
    details.appendChild(summary);form.parentNode.insertBefore(details,form);details.appendChild(form);
  });
}
