import { initialHardwareState, normalizeHardwareState, applyHardwareAction, verifyHardware } from './hardware.js?release=20261018-xray22';
import { executeCoding } from './coding-lab.js?release=20261018-xray22';

const item = (id,label,looks,role) => ({id,label,looks,role});
const check = (id,prompt,options,answer,explanation) => ({id,prompt,options:options.map(([id,label])=>({id,label})),answer,explanation});
const job = (id,prompt,label,action=id) => ({id,prompt,label,action});
const deepFreeze = value => {if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};

/** Public learning explanations, separate from the ticket catalogue and private teacher resources. */
export const FOUNDATION_LABS = deepFreeze([
  {id:'hardware',code:'HW-100',slug:'hardware',track:'hardware',title:'Meet the computer',grade:'7–12',minutes:15,nextLab:'INC-101',
    summary:'Identify the parts, learn their jobs, and safely refit virtual memory.',
    goal:'Identify the equipment, refit the DDR4 memory, and open the original lesson file.',
    items:[
      item('board','Motherboard','A large circuit board with sockets, slots, and labeled connectors.','Connects the computer’s components so they can communicate.'),
      item('cpu','Processor (CPU)','A small square package seated in the motherboard socket beneath the cooler.','Carries out program instructions. Hold it by its edges and match the socket marker.'),
      item('cooler','CPU cooler','A heatsink and fan mounted over the processor.','Moves heat away from the CPU. Its mounting, fresh thermal paste, and fan lead matter.'),
      item('ram','Memory (RAM)','A long, narrow DDR4 module with a keyed notch and retention clips.','Holds the programs and data currently in use. This working memory loses its contents when power is removed.'),
      item('gpu','Graphics card','A card in the long PCIe slot, with its display ports at the back.','Produces the display signal on this teaching workstation. Its lower rear output connects to the monitor.'),
      item('ssd','Original SATA SSD','A small rectangular drive with separate narrow data and wide power sockets.','Keeps the operating system and files when power is off. Preserve this original drive and its classroom files.'),
      item('psu','Power supply (PSU)','A sealed metal unit with an AC inlet and power leads.','Supplies the computer’s components with power. Disconnect virtual AC before internal work; leave its housing sealed.'),
      item('panel','Side panel','The removable cover held by two case screws.','Covers the internal components. Remove its screws before lifting it; refit and secure it before the startup test.'),
      item('monitor','Monitor','The display on the bench, with its own HDMI input.','Shows the computer’s output. A picture needs both cable ends connected and the correct input source.')
    ],
    checks:[
      check('working-memory','Which part holds the programs and data being used right now?',[['ram','RAM'],['ssd','SSD'],['psu','Power supply']],'ram','RAM is temporary working memory. The SSD keeps saved files when the PC is off.'),
      check('saved-files','Which part must you preserve to keep the original classroom OS and files?',[['cooler','CPU cooler'],['ssd','Original SATA SSD'],['monitor','Monitor']],'ssd','The original SSD stores the operating system and saved files. Replacing the display or RAM does not replace that storage.'),
      check('safe-work','Before changing an internal component, what must happen?',[['screen','Turn off the monitor only'],['safe','Power off the PC and disconnect its AC cord'],['input','Change the monitor input']],'safe','Internal work requires both PC off and AC disconnected. All equipment in this lab is virtual.')
    ],
    jobs:[
      job('asm-fit-ram','The virtual PC is off, AC is disconnected, and the memory clips are open. Fit the DDR4 module in its matching slot.','Fit the DDR4 memory'),
      job('asm-close-ram-clips','Close both clips around the fully seated module.','Close the memory clips'),
      job('asm-fit-panel','Place the side panel back on the case.','Refit the side panel'),
      job('asm-tighten-panel-0','Secure side-panel screw 1.','Secure panel screw 1'),
      job('asm-tighten-panel-1','Secure side-panel screw 2.','Secure panel screw 2'),
      job('video-gpu','Connect the PC end of HDMI to the graphics-card output. The monitor end is already fitted.','Connect HDMI to the graphics card'),
      job('plug-in','Reconnect virtual AC after closing the case.','Connect virtual AC'),
      job('boot','Start the workstation and read its startup result.','Power on and test'),
      job('open-document','Open the original lesson file to prove the requested task works.','Open the original lesson file')
    ]},
  {id:'network',code:'NET-200',slug:'network',track:'network',title:'Follow a network connection',grade:'7–12',minutes:12,nextLab:'NET-201',
    summary:'Recognize network equipment and trace a fictional classroom connection.',
    goal:'Connect a fictional workstation, obtain its settings, and reach the practice page.',
    items:[
      item('device','Workstation','The computer icon at the start of the connection.','Runs applications and sends or receives data through its network adapter.'),
      item('cable','Ethernet cable','A cable with a clipped plug at each end.','Carries a wired network connection between the workstation and a switch.'),
      item('switch','Network switch','A box with several numbered Ethernet ports.','Connects devices within the same local network.'),
      item('router','Router','The device between the local network and another network.','Forwards traffic between networks; the workstation uses its default gateway to reach other networks.'),
      item('dhcp','DHCP service','The settings card marked automatic address.','Can provide an IP address and other network settings automatically.'),
      item('dns','DNS service','The name lookup card beside the practice-page icon.','Translates a service name into an address. A working cable alone does not prove name lookup works.'),
      item('os','Operating system','The workstation’s network settings and application window.','Lets applications use network settings and reports whether the requested service can be reached.')
    ],
    checks:[
      check('local-network','Which device connects several classroom devices on the same local network?',[['switch','Switch'],['dns','DNS service'],['screen','Monitor']],'switch','A switch connects local devices. A router connects networks; DNS translates names.'),
      check('automatic-address','Which service can give the workstation its IP settings automatically?',[['dhcp','DHCP'],['dns','DNS'],['gpu','Graphics card']],'dhcp','DHCP supplies automatic network settings. DNS performs name lookup.'),
      check('name-lookup','The cable works, but a service name will not resolve. Which service should you investigate?',[['cooler','CPU cooler'],['dns','DNS'],['panel','Side panel']],'dns','DNS translates a name into an address. Test the actual requested page after checking the settings.')
    ],
    jobs:[job('connect-wired','Connect the fictional workstation to the local switch.','Connect the Ethernet cable'),job('request-dhcp','Request the practice network’s automatic IP, gateway, and DNS settings.','Get automatic network settings'),job('test-service','Resolve the fictional service name and open its practice page through the operating system.','Check DNS and open the practice page')]},
  {id:'ai',code:'AI-300',slug:'ai',track:'ai',title:'Understand an AI response',grade:'7–12',minutes:12,nextLab:'AI-301',
    summary:'Learn the parts of an AI interaction and check a fictional response.',
    goal:'Use a fictional prompt, check its response against evidence, and keep a human in charge.',
    items:[
      item('prompt','Prompt','The request entered before a response is generated.','Gives the model a task and context. Use fictional examples here and keep private school information out.'),
      item('model','AI model','The processing stage between the prompt and response.','Generates responses from learned patterns. It can produce mistakes and does not replace evidence.'),
      item('output','AI output','The draft response shown after the prompt.','Is a suggestion to evaluate, not proof that a statement is correct.'),
      item('evidence','Evidence','A separate fictional source card beside the response.','Provides information you can compare with the generated claim.'),
      item('bias','Bias','The fairness reminder attached to the review checklist.','Can lead to uneven or unfair results. Check whose experience is represented or missing.'),
      item('review','Human review','The final approval step after checking evidence and fairness.','Keeps a person responsible for deciding whether the output is accurate and appropriate.')
    ],
    checks:[
      check('prompt-privacy','Which prompt is suitable for this public practice lab?',[['fictional','Use a made-up classroom with no real personal details'],['names','Paste a real class roster'],['password','Include a student password']],'fictional','Use fictional details. The practice task does not need names, emails, IDs, passwords, or private records.'),
      check('check-claim','An AI response sounds certain. What should you do before relying on it?',[['confidence','Trust its confident wording'],['evidence','Compare the claim with a reliable source'],['repeat','Copy it unchanged']],'evidence','Confident wording is not evidence. Compare the claim with the source and correct errors.'),
      check('human-responsibility','Who decides whether the checked response is appropriate to use?',[['human','A responsible human reviewer'],['model','The model alone'],['format','The page formatting']],'human','A person reviews accuracy, fairness, and suitability before using a response.')
    ],
    jobs:[job('choose-fictional','Choose the prepared prompt about a made-up classroom. No free-form personal details are needed.','Use the fictional practice prompt'),job('check-evidence','The draft says every practice PC must restart every 30 minutes. The fictional source says restart only when instructed, after saving work. Compare them.','Correct the claim using the evidence'),job('request-human-review','Review the corrected claim for accuracy and fairness, then mark it ready for a human decision.','Complete human review')]},
  {id:'security',code:'SEC-400',slug:'security',track:'security',title:'Practice safe security habits',grade:'7–12',minutes:12,nextLab:'SEC-401',
    summary:'Learn permission, identity protection, and access limits in a fictional system.',
    goal:'Stay inside the authorized practice scope and protect a fictional training account.',
    items:[
      item('scope','Authorized scope','The permission card beside the training-system icon.','Defines which fictional systems and actions are allowed. Ask the teacher when permission is unclear.'),
      item('identity','Account identity','The fictional account badge on the sign-in screen.','Identifies which account is asking for access. Do not enter real credentials in practice activities.'),
      item('mfa','Multifactor authentication','A password check followed by a separate verification factor.','Adds a different kind of proof to sign-in. Two passwords are not two different factors.'),
      item('permission','Account permissions','The role selector showing which actions an account may perform.','Should provide only the access needed for the task: least privilege.'),
      item('phishing','Phishing warning','The suspicious message card asking for credentials.','Signals a possible attempt to trick someone into sharing information or taking an unsafe action.'),
      item('report','Report and stop','The teacher-report button beside the warning.','Lets you stop and report something suspicious through an approved process instead of testing a real target.')
    ],
    checks:[
      check('permission-first','Before testing any system, what must you have?',[['scope','Clear permission and an authorized scope'],['guess','A guess that nobody will mind'],['url','A public web address']],'scope','A public address is not permission. Stay within the authorized fictional training system.'),
      check('two-factors','Which example uses two different authentication factors?',[['passwords','Two different passwords'],['mfa','A password and a separate approved authenticator'],['username','A username and a password']],'mfa','A password is something you know. An approved authenticator can provide a separate factor.'),
      check('access-limit','Which access should an ordinary practice learner receive?',[['admin','Administrator access everywhere'],['minimum','Only the access needed for the assigned task'],['shared','A shared teacher account']],'minimum','Least privilege limits access to the task. Teacher credentials should not be shared with learners.')
    ],
    jobs:[job('confirm-scope','Read and accept the prepared scope: this fictional training account only.','Confirm the authorized practice scope'),job('enable-mfa','Add the simulated second factor to the fictional account. No real password or authenticator is requested.','Enable simulated MFA'),job('least-privilege','Change the fictional learner role from administrator to the limited student role.','Apply least privilege')]},
  {id:'coding',code:'CODE-500',slug:'coding',track:'coding',title:'Read, change, and test code',grade:'7–12',minutes:15,nextLab:'CODE-501',
    summary:'Recognize inputs, variables, operators, and outputs in a small practice program.',
    goal:'Change addition to multiplication and pass quantities 0, 2, and 5 with the same program.',
    items:[
      item('input','Input','The supplied quantity shown beside each test.','Changes between fixtures. Use that input rather than replacing it with a fixed answer.'),
      item('variable','Variable','A named value such as price in the starter program.','Stores a value so the program can use it in an expression.'),
      item('operator','Operator','The + or * symbol between quantity and price.','Chooses the operation. Addition combines amounts; multiplication finds quantity times the unit price.'),
      item('output','Output','The number produced by print(...).','Shows the result of the program. Compare the actual number with the requested result.'),
      item('fixture','Test fixture','A prepared input and its expected result.','Checks the same program with a particular value. Passing one input is not enough.'),
      item('debug','Debugging','The edit, run, and compare loop around the editor.','Uses test evidence to find and repair a mistake, then reruns the current code.')
    ],
    checks:[
      check('changing-input','Which value changes between the prepared tests?',[['quantity','quantity'],['price','The price of 3'],['print','The print keyword']],'quantity','The fixtures supply quantities 0, 2, and 5. Each item still costs 3 credits.'),
      check('multiply','Which operator finds quantity times price?',[['plus','+'],['times','*'],['minus','-']],'times','The * operator multiplies. Two items at 3 credits each cost 6, not 5.'),
      check('fresh-test','You edit a program after it passes. What must happen next?',[['rerun','Run all fixtures again for the edited code'],['old','Keep the old passing result'],['guess','Assume the edit works']],'rerun','A passing result belongs to the exact code that was tested. Edited code needs fresh tests.')
    ],
    jobs:[job('fixture-0','For quantity 0, the current program must print 0.','Test quantity 0','run-code'),job('fixture-2','For quantity 2, the current program must print 6.','Test quantity 2','run-code'),job('fixture-5','For quantity 5, the current program must print 15.','Test quantity 5','run-code')]}
]);

const STARTER = 'let price = 3;\nprint(quantity + price);';
const QUANTITIES = Object.freeze([0,2,5]);
const plain = value => !!value && typeof value==='object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const own = (value,key) => plain(value) ? Object.getOwnPropertyDescriptor(value,key)?.value : undefined;
const elements = (value,max=100) => Array.isArray(value) ? Array.from({length:Math.min(value.length,max)},(_,index)=>Object.getOwnPropertyDescriptor(value,String(index))?.value) : [];
const copy = value => Array.isArray(value) ? value.map(copy) : value&&typeof value==='object' ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,copy(item)])) : value;
const count = value => Number.isSafeInteger(value)&&value>=0 ? Math.min(value,1000000) : 0;
const inspectIds = lab => new Set(lab.items.map(item=>item.id));
let hardwareFixture;

export function getFoundation(id) {
  return typeof id==='string' ? FOUNDATION_LABS.find(lab=>lab.id===id||lab.code===id)||null : null;
}

function preparedHardware() {
  if(!hardwareFixture) {
    let state=initialHardwareState('INC-101');
    for(const action of ['power-off','unplug','enable-assembly','asm-loosen-panel-0','asm-loosen-panel-1','asm-remove-panel','asm-open-ram-clips','asm-remove-ram']) {
      const result=applyHardwareAction('INC-101',state,action);
      if(result.kind==='warning')throw new Error('The authored foundation workbench could not be prepared.');
      state=result.state;
    }
    hardwareFixture=state;
  }
  return copy(hardwareFixture);
}

function simulationFor(lab) {
  if(lab.id==='network')return {wired:false,ipAssigned:false,dnsReady:false,serviceReachable:false};
  if(lab.id==='ai')return {fictionalPrompt:false,evidenceChecked:false,humanReviewed:false};
  if(lab.id==='security')return {scopeConfirmed:false,mfaEnabled:false,leastPrivilege:false,role:'administrator'};
  return {};
}

function fresh(lab) {
  return {version:1,labId:lab.id,explored:[],answers:{},practice:[],hardware:lab.id==='hardware'?preparedHardware():null,simulation:simulationFor(lab),code:lab.id==='coding'?STARTER:'',sourceAtRun:'',results:[],runCount:0,attempts:0};
}

export function createFoundationRecord(id) {
  const lab=getFoundation(id);return lab?fresh(lab):null;
}

const readyForPractice = (lab,state) => state.explored.length===lab.items.length&&lab.checks.every(check=>state.answers[check.id]===check.answer);
function advanceSimulation(lab,state,index) {
  if(lab.id==='network') {
    if(index===0)state.simulation.wired=true;
    if(index===1)state.simulation.ipAssigned=true;
    if(index===2){state.simulation.dnsReady=true;state.simulation.serviceReachable=true;}
  } else if(lab.id==='ai')state.simulation[['fictionalPrompt','evidenceChecked','humanReviewed'][index]]=true;
  else if(lab.id==='security'){
    state.simulation[['scopeConfirmed','mfaEnabled','leastPrivilege'][index]]=true;
    if(index===2)state.simulation.role='learner';
  }
}

function runFixtures(source) {
  return QUANTITIES.map(quantity=>{
    const run=executeCoding(source,{quantity}),expected=String(quantity*3);
    return {quantity,expected,output:run.output.slice(0,20),passed:run.ok&&run.output.length===1&&run.output[0]===expected,error:run.error?{line:run.error.line,message:run.error.message}:null};
  });
}

/** Rebuild only the documented state from authored progress; raw equipment and results are never trusted. */
function normalize(lab,previous) {
  const state=fresh(lab);
  if(!plain(previous)||own(previous,'version')!==1||own(previous,'labId')!==lab.id)return state;
  const ids=inspectIds(lab);
  state.explored=[...new Set(elements(own(previous,'explored')).filter(id=>typeof id==='string'&&ids.has(id)))];
  const answers=own(previous,'answers');
  for(const check of lab.checks){const answer=own(answers,check.id);if(check.options.some(option=>option.id===answer))state.answers[check.id]=answer;}
  state.attempts=count(own(previous,'attempts'));state.runCount=count(own(previous,'runCount'));
  if(lab.id==='coding') {
    const code=own(previous,'code');if(typeof code==='string')state.code=code.slice(0,4000);
    const sourceAtRun=own(previous,'sourceAtRun');
    if(state.runCount>0&&typeof sourceAtRun==='string'&&sourceAtRun===state.code){
      state.sourceAtRun=state.code;state.results=runFixtures(state.code);state.practice=state.results.filter(result=>result.passed).map(result=>`fixture-${result.quantity}`);
    }
    return state;
  }
  const progress=elements(own(previous,'practice'),lab.jobs.length);
  for(let index=0;index<lab.jobs.length;index++) {
    const job=lab.jobs[index];if(progress[index]!==job.id)break;
    if(lab.id==='hardware') {
      const result=applyHardwareAction('INC-101',state.hardware,job.action);if(result.kind==='warning')break;state.hardware=result.state;
    } else advanceSimulation(lab,state,index);
    state.practice.push(job.id);
  }
  return state;
}

/** Page-memory learning actions. No storage, network, account, or browser execution APIs. */
export function applyFoundationAction(id,previous,action) {
  const lab=getFoundation(id);
  if(!lab)return {state:null,message:'Choose a foundation lab.',kind:'warning'};
  const state=normalize(lab,previous),type=own(action,'type');
  const result=(message,kind='info')=>({state,message,kind});
  if(!['inspect','answer','practice','code','run-code'].includes(type))return result('Choose a labeled component, question, or practice control.','warning');
  state.attempts=Math.min(state.attempts+1,1000000);
  if(type==='inspect') {
    const id=own(action,'item'),found=lab.items.find(item=>item.id===id);
    if(!found)return result('Choose a labeled item in this foundation lab.','warning');
    if(!state.explored.includes(id))state.explored.push(id);
    return result(`${found.label}: ${found.role}`,'success');
  }
  if(type==='answer') {
    const question=lab.checks.find(check=>check.id===own(action,'check')),value=own(action,'value');
    if(!question||!question.options.some(option=>option.id===value))return result('Choose one of this question’s listed answers.','warning');
    state.answers[question.id]=value;
    return result(question.explanation,value===question.answer?'success':'warning');
  }
  if(type==='code') {
    if(lab.id!=='coding')return result('The code editor belongs to the coding foundation.','warning');
    const source=own(action,'source');
    if(typeof source!=='string'||source.length>4000)return result('Keep the practice program at or below 4,000 characters.','warning');
    if(source!==state.code){state.code=source;state.sourceAtRun='';state.results=[];state.practice=[];}
    return result('Code draft updated. Run all three fixtures to test this version.');
  }
  if(!readyForPractice(lab,state))return result(state.explored.length<lab.items.length?'Explore each labeled item before starting the guided practice.':'Answer all three role checks correctly before starting the guided practice.','warning');
  if(type==='run-code'||lab.id==='coding'&&type==='practice'&&own(action,'action')==='run-code') {
    if(lab.id!=='coding')return result('Run code is available in the coding foundation.','warning');
    state.runCount=Math.min(state.runCount+1,1000000);state.sourceAtRun=state.code;state.results=runFixtures(state.code);state.practice=state.results.filter(result=>result.passed).map(result=>`fixture-${result.quantity}`);
    const passed=state.practice.length;
    return result(`${passed} of 3 fixtures passed for this code. ${passed===3?'The same program handles all three quantities.':'Compare actual and expected output, edit one thing, then run again.'}`,passed===3?'success':'warning');
  }
  if(type!=='practice')return result('Choose the current guided practice action.','warning');
  if(!lab.jobs.some(job=>job.action===own(action,'action')))return result('Choose a labeled guided practice action.','warning');
  const next=lab.jobs[state.practice.length];
  if(!next)return result('Guided practice is complete. Review your results or continue to the first ticket.');
  if(own(action,'action')!==next.action)return result(`Next: ${next.prompt}`,'warning');
  if(lab.id==='hardware') {
    const change=applyHardwareAction('INC-101',state.hardware,next.action);
    if(change.kind==='warning')return result(change.message,'warning');
    state.hardware=change.state;state.practice.push(next.id);return result(change.message,'success');
  }
  if(lab.id==='coding')return result('Edit the current program and choose Run all fixtures.','warning');
  advanceSimulation(lab,state,state.practice.length);state.practice.push(next.id);
  return result(lab.id==='network'&&state.practice.length===3?'DNS resolved the fictional practice name and the operating system opened the practice page.':lab.id==='ai'&&state.practice.length===2?'The claim was corrected using the fictional source. A human still needs to review it.':lab.id==='security'&&state.practice.length===3?'The fictional account now has the limited learner role.':`${next.label}: complete.`,'success');
}

function summarize(lab,state) {
  const explored=state.explored.length,checked=lab.checks.filter(check=>state.answers[check.id]===check.answer).length,practice=state.practice.length;
  const done=explored===lab.items.length&&checked===lab.checks.length&&practice===lab.jobs.length;
  return {explored,exploreTotal:lab.items.length,checked,checkTotal:lab.checks.length,practice,practiceTotal:lab.jobs.length,complete:done&&(lab.id!=='hardware'||verifyHardware('INC-101',state.hardware).ok),hasWork:state.attempts>0||explored>0||Object.keys(state.answers).length>0||practice>0||lab.id==='coding'&&state.code!==STARTER||state.runCount>0};
}

export function foundationSummary(id,record) {
  const lab=getFoundation(id);
  return lab?summarize(lab,normalize(lab,record)):{explored:0,exploreTotal:0,checked:0,checkTotal:0,practice:0,practiceTotal:0,complete:false,hasWork:false};
}

export function foundationReport(id,record) {
  const lab=getFoundation(id);if(!lab)return 'Foundation lab unavailable.';
  const state=normalize(lab,record),summary=summarize(lab,state);
  const lines=['COLE LEARNING LABS — FOUNDATION PRACTICE',`${lab.code} · ${lab.title}`,`Grades ${lab.grade} · ${lab.minutes} minutes`,`Status: ${summary.complete?'COMPLETE':'IN PROGRESS'}`,'','LEARNING GOAL',lab.goal,'','ITEMS I EXPLORED',...lab.items.filter(item=>state.explored.includes(item.id)).map(item=>`${item.label}: ${item.role}`)];
  if(!state.explored.length)lines.push('No items explored yet.');
  lines.push('','ROLE CHECKS');
  for(const check of lab.checks){const answer=check.options.find(option=>option.id===state.answers[check.id]);lines.push(check.prompt,answer?`My answer: ${answer.label} — ${answer.id===check.answer?'correct':'review this concept'}`:'Not answered.');}
  lines.push('','GUIDED PRACTICE',...lab.jobs.map(job=>`${state.practice.includes(job.id)?'[Done]':'[To do]'} ${job.label}`));
  if(lab.id==='hardware'){const h=normalizeHardwareState('INC-101',state.hardware);lines.push('',`Memory seated: ${h.ramSeated?'yes':'no'}`,`Memory clips: ${h.assembly.ramClipsOpen?'open':'closed'}`,`Side-panel screws: ${h.assembly.panelScrews.filter(Boolean).length}/2`,`Original OS loaded: ${h.booted?'yes':'no'}`,`Original lesson file opened: ${h.documentOpened?'yes':'no'}`);}
  if(lab.id==='network')lines.push('',`Wired connection: ${state.simulation.wired?'connected':'disconnected'}`,`Practice IP settings: ${state.simulation.ipAssigned?'192.0.2.20 · gateway 192.0.2.1 · DNS 192.0.2.53':'not assigned'}`,`DNS lookup: ${state.simulation.dnsReady?'resolved':'not tested'}`,`Practice page: ${state.simulation.serviceReachable?'opened':'not opened'}`);
  if(lab.id==='coding'){lines.push('','CURRENT PRACTICE CODE',state.code,'','CURRENT FIXTURE RESULTS');if(!state.results.length)lines.push('Run all fixtures for the current code.');for(const run of state.results)lines.push(`quantity ${run.quantity} — expected ${run.expected}; actual ${run.output.join(' / ')||'(no output)'}; ${run.passed?'PASS':run.error?`line ${run.error.line}: ${run.error.message}`:'CHECK'}`);}
  lines.push('',`Progress: ${summary.explored}/${summary.exploreTotal} explored · ${summary.checked}/${summary.checkTotal} role checks · ${summary.practice}/${summary.practiceTotal} practice steps`,`Next ticket: ${lab.nextLab}`,'','This fictional learning activity runs in the current page. Review the report before choosing an approved export or submission destination.');
  return lines.join('\n');
}
