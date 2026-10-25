import {interactiveToolAction} from './interactive-tools.js?release=20261025-coding-visuals';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const code=id=>typeof id==='string'?id.replaceAll('-','').toUpperCase():'';
const IDS=new Set(['SEC401','SEC402','SEC403','SEC404','SEC405','SEC406']);
export const supportsSecurityActivity=id=>IDS.has(code(id));
export function securityActivityAction(id,state,name,value){
  const key=code(id);
  if(!IDS.has(key)||!state||typeof state!=='object'||Array.isArray(state)||typeof name!=='string')return null;
  if(key==='SEC403'&&name==='scope')return typeof value==='boolean'?{action:'acknowledge-scope',value}:null;
  if(typeof value!=='string')return null;
  if(key==='SEC401'&&name==='message')return ['urgent','routine'].includes(value)?{action:'view-message',value}:null;
  if(key==='SEC403'&&name==='record')return state.scope===true&&['101','102'].includes(value)?{action:'fetch-record',value}:null;
  return interactiveToolAction(key,state,name,value);
}
const button=(name,value,label,active=false,disabled=false,extra='')=>`<button type="button" data-la-choice="${name}" data-la-value="${esc(value)}" aria-pressed="${active}"${disabled?' disabled':''}${extra}>${esc(label)}</button>`;
const group=(legend,content)=>`<fieldset class="sa-choices"><legend>${legend}</legend>${content}</fieldset>`;
const choices=(state,name,legend,options,disabled=false)=>group(legend,options.map(([value,label])=>button(name,value,label,String(state[name])===value,disabled)).join(''));
const panel=(title,content)=>`<section class="sa-panel"><h4>${title}</h4>${content}</section>`;
const status=(ok,yes,no)=>`<span class="sa-status ${ok?'sa-positive':'sa-warning'}">${ok?'✓':'!'} ${ok?yes:no}</span>`;
const intro=(title,instruction)=>`<div class="sa-heading"><h3>${title}</h3><p>${instruction}</p></div>`;
function inbox(s){
  const flags=Array.isArray(s.flags)?s.flags:[],urgent=s.message!=='routine';
  const evidence=(value,text)=>button('flags',value,text,flags.includes(value),false,' class="sa-hotspot"');
  const message=urgent?`<article class="sa-message"><h4>Account suspended in 10 minutes</h4>${evidence('sender','From: verify@school-account-check.test')}${evidence('urgency','Your access will be deleted in 10 minutes. Verify your password now.')}${evidence('destination','Text-only destination: school-account-check.test/verify')}<small>Click a warning sign to mark it. No link opens.</small></article>`:`<article class="sa-message"><h4>Tomorrow’s lab checklist</h4><p>From: helpdesk@school.test</p><p>Open the checklist through your teacher’s class-portal bookmark.</p><code>portal.school.test/checklist</code><small>Routine comparison · text only</small></article>`;
  return intro('Spot the phishing clues','Inspect the message, mark evidence, then choose a report and helper access.')+`<div class="sa-mail-tabs">${button('message','urgent','Urgent message',urgent)}${button('message','routine','Routine comparison',!urgent)}</div><div class="sa-grid">${message}<div>${panel('Marked evidence',`<div class="sa-evidence">${['sender','destination','urgency'].map(v=>status(flags.includes(v),v+' marked',v+' not marked')).join('')}</div>`)}${choices(s,'verdict','Urgent message decision',[['safe','Trust password request'],['phishing','Report phishing']])}${choices(s,'permission','Helper access to checklist',[['Administrator','Administrator'],['Edit all folders','Edit all folders'],['Read only','Read only'],['No access','No access']])}</div></div>`;
}
function gateway(s){
  const events=Array.isArray(s.events)?s.events:[];
  const timeline=[['EVT-101','09:10 · 10.24.8.25 · Teacher login'],['EVT-102','09:12 · 198.51.100.24 · 18 failed logins'],['EVT-103','09:13 · 198.51.100.24 · Login success'],['EVT-104','09:14 · 10.24.8.25 · Portal opens']];
  const denied=s.source==='198.51.100.24',portal=s.keepHttps===true&&s.port!=='443'&&s.source!=='10.24.8.25';
  const path=(label,ok,text,safe=ok)=>`<div data-la-flow class="sa-route ${ok?'sa-route-open':'sa-route-stop'} ${safe?'sa-rule-correct':'sa-rule-risk'}"><b>${label}</b><span class="sa-wire" aria-hidden="true"><i class="la-signal"></i></span><strong>${text}</strong></div>`;
  return intro('Protect the portal','Link the related events. Block the source, close one listener, and keep the class working.')+`<div class="sa-timeline">${timeline.map(([v,label])=>button('events',v,label,events.includes(v))).join('')}</div><div class="sa-grid"><div>${choices(s,'source','Temporary source rule',[['198.51.100.24','Block 198.51.100.24'],['10.24.8.25','Block 10.24.8.25']])}${choices(s,'port','Close one listener',[['23','Close TCP 23 · Telnet'],['443','Close TCP 443 · HTTPS'],['53','Close UDP 53 · DNS']])}${choices({...s,keepHttps:String(s.keepHttps)},'keepHttps','Class portal switch',[['true','HTTPS enabled'],['false','HTTPS disabled']])}</div>${panel('Saved rule preview',status(denied,'Suspicious traffic contained','Suspicious source still allowed')+path('198.51.100.24',!denied,denied?'Source denied':'Source passes',denied)+path('Teacher → HTTPS',portal,portal?'Portal available':'Portal blocked')+status(s.port==='23','Telnet listener closed','Telnet listener open')+'<p class="sa-note">Local model only. A source address does not identify a person.</p>')}</div>`;
}
function records(s){
  const scoped=s.scope===true,r=s.response&&typeof s.response==='object'?s.response:null;
  const record=(id,label)=>button('record',id,label,s.requested===id,!scoped);
  const response=r&&['101','102'].includes(r.id)&&[200,403].includes(r.status)?`<div class="sa-response ${(r.id==='101'&&r.status===200)||(r.id==='102'&&r.status===403)?'sa-positive':'sa-warning'}"><b>Record ${esc(r.id)} → HTTP ${esc(r.status)}</b><p>${esc(r.body)}</p></div>`:'<p class="sa-note">Choose a record to see the response.</p>';
  return intro('Fix the record gate','Request the other practice record under the original policy. Then patch the rule and compare both records.')+`<label class="sa-scope"><input type="checkbox" data-la-scope${scoped?' checked':''}><span>I will use only fictional records 101 and 102 in this browser simulation.</span></label><div class="sa-grid">${panel('Signed in as learner-101',`<div class="sa-records">${record('101','Request own record · 101')}${record('102','Request other record · 102')}</div>${response}${status(s.observed===true,'Original defect observed','Original defect not observed')}`)}<div>${choices(s,'patch','Access gate',[['none','Original: any signed-in user'],['hidden','Hide other record links'],['owner','Check ownership on server']],!scoped)}<div class="sa-gate"><span>learner-101</span><i aria-hidden="true">→</i><b>${s.patch==='owner'?'Owner check':s.patch==='hidden'?'Hidden links only':'No owner check'}</b><i aria-hidden="true">→</i><span>101 / 102</span></div><p class="sa-note">A hidden link does not stop a direct request. Run the simulation test after inspecting the defect.</p></div></div>`;
}
function recovery(s){
  const steps=[['identity','Identity',[['chat','Trust urgent chat'],['approved','Approved help-desk check']],'approved'],['factor','Lost authenticator',[['keep','Keep factor active'],['revoke','Revoke lost factor']],'revoke'],['reset','Recovery',[['disable','Disable MFA'],['supervised','Supervised single-use reset']],'supervised'],['audit','Record',[['none','Skip record'],['record','Record approved action']],'record']];
  const ready=steps.filter(([field,,,value])=>s[field]===value).length;
  return intro('Rebuild the recovery path','Choose each step. Keep MFA required while recovering the fictional account.')+`<div class="sa-progress" aria-label="${ready} of 4 recovery safeguards selected"><span style="width:${ready*25}%"></span></div><p class="sa-note">${ready}/4 safeguards selected · preview, not a completed test</p><div class="sa-stations">${steps.map(([field,label,options,value],i)=>`<section class="sa-station">${status(s[field]===value,`${i+1} · ${label} ready`,`${i+1} · ${label} needs review`)}${choices(s,field,label,options)}</section>`).join('')}</div><p class="sa-note">No passwords, recovery codes, or real accounts are entered.</p>`;
}
function incident(s){
  const isolated=s.containment==='isolate',clean=s.recovery==='clean',ready=isolated&&s.evidence==='preserve'&&clean;
  return intro('Contain the endpoint','Disconnect only the affected workstation. Preserve evidence and choose a clean recovery route.')+`<div class="sa-endpoints">${panel('Classroom endpoints','<strong>✓ No supplied alert</strong><span class="sa-note">Keep other endpoints available.</span>')}${panel('LAB-ENDPOINT-07',status(isolated,'Isolated from network','Still connected')+choices(s,'containment','Affected endpoint',[['isolate','Disconnect endpoint'],['connected','Reconnect endpoint']]))}${panel('Verified offline backup R-08',`<div data-la-flow class="sa-route ${ready?'sa-route-open':'sa-route-stop'}"><span>R-08</span><span class="sa-wire" aria-hidden="true"><i class="la-signal"></i></span><strong>${ready?'Clean staging ready':clean?'Containment / evidence needed':'Unsafe: affected endpoint'}</strong></div>`)}</div><div class="sa-stations">${choices(s,'evidence','Incident evidence',[['preserve','Preserve evidence'],['wipe','Wipe endpoint']])}${choices(s,'notify','Mock response team',[['team','Notify mock team'],['silent','Handle alone']])}${choices(s,'recovery','Recovery destination',[['clean','Separate clean environment'],['infected','Affected endpoint']])}</div><p class="sa-note">These local choices do not disconnect devices, send messages, erase files, or mount backups.</p>`;
}
function packages(s){
  const selected=['A','B','C'].includes(s.package)?s.package:'B';
  const signature=s.signature==='verify'?(selected==='A'?'Training Publisher valid':selected==='B'?'Unsigned mirror copy':'Review blocked; publisher not established'):'Signature not inspected';
  const digest=s.digest==='verify'?(selected==='A'?'LAB-DIGEST-42 · matches':selected==='B'?'No trusted digest for this mirror':'LAB-MISMATCH · does not match'):'Digest not inspected';
  const ready=selected==='A'&&s.signature==='verify'&&s.digest==='verify'&&s.deployment==='pilot';
  return intro('Inspect before the pilot','Select a package. Open both inspection stations, then choose the pilot scope.')+`<div class="sa-manifest"><b>Trusted publisher manifest</b><span>CLASSROOM-TOOL-4.2 · Training Publisher valid · LAB-DIGEST-42</span></div>${choices(s,'package','Choose a package',[['A','A · Approved catalog'],['B','B · Unsigned mirror'],['C','C · Claimed version 4.2']])}<div class="sa-stations">${panel('1 · Signature station',choices(s,'signature','Inspect publisher',[['verify','Inspect signature'],['skip','Skip signature']])+`<p class="sa-proof">${signature}</p>`)}${panel('2 · Integrity station',choices(s,'digest','Inspect integrity',[['verify','Compare trusted digest'],['skip','Trust filename']])+`<p class="sa-proof">${digest}</p>`)}${panel('3 · Pilot station',choices(s,'deployment','Deployment scope',[['pilot','Limited standard-user pilot'],['all-admin','All devices · administrator']])+status(ready,'Selected plan ready to test','Selected plan needs review'))}</div><p class="sa-note">Inspection reads fixed practice records. No download, installation, or cryptographic tool runs.</p>`;
}
export function renderSecurityActivity(id,state={}){
  const key=code(id),render={SEC401:inbox,SEC402:gateway,SEC403:records,SEC404:recovery,SEC405:incident,SEC406:packages}[key];
  if(!render)return '';
  const saved=state&&typeof state==='object'&&!Array.isArray(state)?state:{};
  return `<div class="security-activity sa-${key.toLowerCase()}" data-security-activity="${key}">${render(saved)}</div>`;
}
