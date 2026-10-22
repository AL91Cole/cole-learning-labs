import { initialHardwareState, normalizeHardwareState, applyHardwareAction, verifyHardware } from './hardware.js?release=20261022-learning';
import { executeCoding } from './coding-lab.js?release=20261022-learning';

const item = (id,label,looks,role) => ({id,label,looks,role});
const check = (id,prompt,options,answer,explanation) => ({id,prompt,options:options.map(([id,label])=>({id,label})),answer,explanation});
const job = (id,prompt,label,action=id) => ({id,prompt,label,action});
const deepFreeze = value => {if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};

/** Public learning explanations, separate from the ticket catalogue and private teacher resources. */
export const FOUNDATION_LABS = deepFreeze([
  {id:'hardware',code:'HW-100',slug:'hardware',track:'hardware',title:'Meet the computer',grade:'7–12',minutes:15,nextLab:'INC-101',
    summary:'Meet the parts, learn their jobs and fit virtual memory safely.',
    goal:'Fit the memory, start the virtual PC and open the lesson file.',
    items:[
      item('board','Motherboard','The large board with sockets and slots.','Connects the parts so they can work together.'),
      item('cpu','Processor (CPU)','The small square part under the cooler.','Carries out the program’s instructions.'),
      item('cooler','Processor cooler','A fan and metal fins above the processor.','Moves heat away from the processor. It needs secure screws and a connected fan cable.'),
      item('ram','Memory (RAM)','The long, thin stick beside the processor. Its slot has clips.','Holds programs and data while they are in use. It clears when power is off. DDR4 is its memory type.'),
      item('gpu','Graphics card','A card with picture-cable sockets at the back of the PC.','Sends the picture to the monitor. Use this card’s lower socket in this lab.'),
      item('ssd','Original storage drive (SSD)','A small drive with a narrow data socket and a wider power socket.','Keeps the system and saved files when power is off. Keep this original classroom drive.'),
      item('psu','Power supply (PSU)','The sealed metal box where the power cord connects.','Sends power to the parts. Unplug the virtual PC before working inside. Keep this box sealed.'),
      item('panel','Side panel','The case cover held by two screws.','Covers the parts inside. Remove both screws to open it. Refit the cover and screws before starting the PC.'),
      item('monitor','Monitor','The screen beside the PC.','Shows the picture. Both ends of the picture cable must be connected, with the matching input selected.')
    ],
    checks:[
      check('working-memory','Which part holds programs and data while they are in use?',[['ram','Memory (RAM)'],['ssd','Storage drive (SSD)'],['psu','Power supply']],'ram','RAM holds current work. The storage drive keeps saved files when the PC is off.'),
      check('saved-files','Which part keeps the original system and saved files?',[['cooler','Processor cooler'],['ssd','Original storage drive'],['monitor','Monitor']],'ssd','The original storage drive holds the classroom system and files. Keep it safe.'),
      check('safe-work','Before changing a part inside the PC, what must you do?',[['screen','Turn off only the monitor'],['safe','Turn off the PC and unplug its power cord'],['input','Change the monitor input']],'safe','Turn off the PC and unplug it before working inside. Use only the virtual equipment.')
    ],
    jobs:[
      job('asm-fit-ram','The virtual PC is off and unplugged. Fit the memory stick in its matching slot.','Fit the memory'),
      job('asm-close-ram-clips','Close both clips to hold the memory in place.','Close the memory clips'),
      job('asm-fit-panel','Put the side cover back on the case.','Refit the side panel'),
      job('asm-tighten-panel-0','Tighten side-panel screw 1.','Tighten panel screw 1'),
      job('asm-tighten-panel-1','Tighten side-panel screw 2.','Tighten panel screw 2'),
      job('video-gpu','Connect the picture cable to the graphics card. Its monitor end is already connected.','Connect the picture cable'),
      job('plug-in','The case is closed. Reconnect the virtual power cord.','Plug in the virtual PC'),
      job('boot','Start the PC and read the result.','Start the PC'),
      job('open-document','Open Lesson_Practice_File.docx to check that the original file is available.','Open the lesson file')
    ]},
  {id:'network',code:'NET-200',slug:'network',track:'network',title:'Follow a network connection',grade:'7–12',minutes:12,nextLab:'NET-201',
    summary:'Meet the network devices and follow a classroom connection.',
    goal:'Connect the practice PC, get its network settings and open the practice page.',
    items:[
      item('device','Computer','The PC at the start of the connection.','Runs apps and sends or receives data through its network connection.'),
      item('cable','Ethernet cable','A cable with a clipped plug at each end.','Connects the PC to the network switch.'),
      item('switch','Network switch','A box with several numbered cable sockets.','Connects devices on the same local network.'),
      item('router','Router','The device that links this network to other networks.','Sends data between networks. The PC uses a router called its default gateway to reach another network.'),
      item('dhcp','Automatic settings (DHCP)','The card marked automatic address.','Gives the PC its network address, called an IP address, and other settings.'),
      item('dns','Name lookup (DNS)','The name lookup card beside the practice page.','Finds a network address from a name. A connected cable does not prove name lookup works.'),
      item('os','Operating system','The PC’s settings and app window.','The main software that runs apps and uses the network settings.')
    ],
    checks:[
      check('local-network','Which device connects PCs on the same local network?',[['switch','Switch'],['dns','Name lookup (DNS)'],['screen','Monitor']],'switch','A switch connects local devices. A router connects different networks.'),
      check('automatic-address','Which service gives the PC its network settings automatically?',[['dhcp','DHCP'],['dns','DNS'],['gpu','Graphics card']],'dhcp','DHCP gives the PC its automatic network settings. DNS looks up names.'),
      check('name-lookup','The cable works, but a site name cannot be found. What should you check?',[['cooler','Processor cooler'],['dns','Name lookup (DNS)'],['panel','Side panel']],'dns','DNS finds an address from a name. After checking it, try opening the practice page.')
    ],
    jobs:[job('connect-wired','Connect the practice PC to the switch.','Connect the Ethernet cable'),job('request-dhcp','Use DHCP to get the practice PC’s network settings.','Get automatic settings'),job('test-service','Use DNS to find the practice page, then open it.','Open the practice page')]},
  {id:'ai',code:'AI-300',slug:'ai',track:'ai',title:'Understand an AI response',grade:'7–12',minutes:12,nextLab:'AI-301',
    summary:'Learn how an AI reply is made and check a practice answer.',
    goal:'Use a made-up prompt, check the reply and ask a person to review it.',
    items:[
      item('prompt','Prompt','The request sent before an AI reply.','Tells the AI what to do. Use made-up examples and leave out private information.'),
      item('model','AI model','The stage between the request and the reply.','Makes replies from learned patterns. It can make mistakes, so check its claims.'),
      item('output','AI output','The reply shown after the prompt.','An answer to check. A confident reply can still be wrong.'),
      item('evidence','Evidence','The source card beside the reply.','Gives facts you can compare with the AI’s claim.'),
      item('bias','Bias','The fairness reminder in the checklist.','An unfair pattern in a result. Check who may be treated differently or left out.'),
      item('review','Human review','The final step after checking the reply.','A person decides whether the reply is accurate, fair and suitable to use.')
    ],
    checks:[
      check('prompt-privacy','Which prompt is safe for this practice lab?',[['fictional','Use a made-up classroom without personal details'],['names','Paste a real class list'],['password','Include a student password']],'fictional','Use made-up details. Leave out real names, passwords and private records.'),
      check('check-claim','An AI reply sounds certain. What should you do first?',[['confidence','Trust its confident wording'],['evidence','Compare it with a reliable source'],['repeat','Copy it unchanged']],'evidence','Sounding certain does not make a claim true. Check the source and correct any errors.'),
      check('human-responsibility','Who decides whether the checked reply is ready to use?',[['human','A human reviewer'],['model','The AI alone'],['format','The page design']],'human','A person checks whether the reply is accurate, fair and suitable.')
    ],
    jobs:[job('choose-fictional','Use the prepared prompt about a made-up classroom.','Use the practice prompt'),job('check-evidence','The AI says to restart every 30 minutes. The source says to save work and restart only when instructed. Correct the reply.','Correct the reply'),job('request-human-review','Check the corrected reply for accuracy and fairness. Keep a person in charge of using it.','Complete human review')]},
  {id:'security',code:'SEC-400',slug:'security',track:'security',title:'Practice safe security habits',grade:'7–12',minutes:12,nextLab:'SEC-401',
    summary:'Learn where testing is allowed and how to protect a practice account.',
    goal:'Follow the practice rules, add a second sign-in factor and limit account access.',
    items:[
      item('scope','Allowed testing (scope)','The permission card beside the practice system.','Lists which systems and actions you may test. Ask your teacher if permission is unclear.'),
      item('identity','Account identity','The account badge on the sign-in screen.','Shows which account wants access. Never enter a real password in this lab.'),
      item('mfa','Two-factor sign-in (MFA)','A password check followed by another type of proof.','Uses different types of proof, such as a password and an authenticator. Two passwords do not count.'),
      item('permission','Account permissions','The list of actions an account may use.','Give only the access needed for the task. This is called least privilege.'),
      item('phishing','Phishing warning','The suspicious message asking for a password.','Warns that someone may be trying to trick you into sharing private information.'),
      item('report','Stop and report','The report button beside the warning.','Stop and tell your teacher about a suspicious message. Use the approved reporting route.')
    ],
    checks:[
      check('permission-first','What do you need before testing a system?',[['scope','Clear permission and a list of allowed actions'],['guess','A guess that nobody will mind'],['url','A public web address']],'scope','A public web address is not permission. Test only the practice system and actions allowed here.'),
      check('two-factors','Which sign-in uses two different types of proof?',[['passwords','Two different passwords'],['mfa','A password and an approved authenticator'],['username','A username and a password']],'mfa','A password is something you know. An authenticator can give a second, different type of proof.'),
      check('access-limit','How much access should a practice learner have?',[['admin','Administrator access everywhere'],['minimum','Only the access needed for the task'],['shared','A shared teacher account']],'minimum','Least privilege means giving only the access needed. Do not share a teacher account.')
    ],
    jobs:[job('confirm-scope','Read the permission card. Only this made-up training account is allowed.','Confirm the practice rules'),job('enable-mfa','Add a second sign-in factor to the practice account. No real password or device is needed.','Add the practice second factor'),job('least-privilege','Change the practice account from administrator to the limited learner role.','Limit the account access')]},
  {id:'coding',code:'CODE-500',slug:'coding',track:'coding',title:'Read, change, and test code',grade:'7–12',minutes:15,nextLab:'CODE-501',
    summary:'Read a short program, fix its calculation and check the results.',
    goal:'Use multiplication to get the right total for quantities 0, 2 and 5.',
    items:[
      item('input','Input','The quantity shown beside each test.','The value given to the program. It changes between tests, so do not use one fixed answer.'),
      item('variable','Variable','A name such as price in the code.','Stores a value for the program to use.'),
      item('operator','Operator','A symbol such as + or * between two values.','Chooses the calculation. The + adds; the * multiplies.'),
      item('output','Output','The number shown by print(...).','The result of running the program. Compare it with the expected answer.'),
      item('fixture','Prepared test (fixture)','An input paired with the answer it should produce.','Checks the program with one input. Use every test to check more than one example.'),
      item('debug','Debugging','The edit, run and compare steps beside the code.','Find a mistake, change the code and run the tests again.')
    ],
    checks:[
      check('changing-input','Which value changes between the tests?',[['quantity','quantity'],['price','The price of 3'],['print','The print keyword']],'quantity','The tests use quantities 0, 2 and 5. Each item always costs 3 credits.'),
      check('multiply','Which symbol means quantity times price?',[['plus','+'],['times','*'],['minus','-']],'times','The * multiplies. Two items at 3 credits each cost 6, not 5.'),
      check('fresh-test','You change code after it passes. What should you do next?',[['rerun','Run every test again for the changed code'],['old','Keep the old passing result'],['guess','Assume the change works']],'rerun','The old result belongs to the old code. Run every test again after a change.')
    ],
    jobs:[job('fixture-0','With quantity 0, the answer must be 0.','Check quantity 0','run-code'),job('fixture-2','With quantity 2, the answer must be 6.','Check quantity 2','run-code'),job('fixture-5','With quantity 5, the answer must be 15.','Check quantity 5','run-code')]}
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
  return {version:1,labId:lab.id,explored:[],answers:{},practice:[],hardware:lab.id==='hardware'?preparedHardware():null,simulation:simulationFor(lab),code:lab.id==='coding'?STARTER:'',sourceAtRun:'',results:[],runCount:0,attempts:0,notes:'',reflection:'',explanationSaved:false};
}

export function createFoundationRecord(id) {
  const lab=getFoundation(id);return lab?fresh(lab):null;
}

const readyForPractice = (lab,state) => state.explored.length===lab.items.length&&lab.checks.every(check=>state.answers[check.id]===check.answer);
const hasExplanation = state => state.notes.trim().length>=12&&state.reflection.trim().length>=12;
function restoreExplanation(lab,state,previous) {
  state.explanationSaved=own(previous,'explanationSaved')===true&&hasExplanation(state)&&summarize(lab,state).practiceComplete;
  return state;
}
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
  for(const field of ['notes','reflection']){const value=own(previous,field);if(typeof value==='string')state[field]=value.slice(0,2000);}
  state.attempts=count(own(previous,'attempts'));state.runCount=count(own(previous,'runCount'));
  if(lab.id==='coding') {
    const code=own(previous,'code');if(typeof code==='string')state.code=code.slice(0,4000);
    const sourceAtRun=own(previous,'sourceAtRun');
    if(state.runCount>0&&typeof sourceAtRun==='string'&&sourceAtRun===state.code){
      state.sourceAtRun=state.code;state.results=runFixtures(state.code);state.practice=state.results.filter(result=>result.passed).map(result=>`fixture-${result.quantity}`);
    }
    return restoreExplanation(lab,state,previous);
  }
  const progress=elements(own(previous,'practice'),lab.jobs.length);
  for(let index=0;index<lab.jobs.length;index++) {
    const job=lab.jobs[index];if(progress[index]!==job.id)break;
    if(lab.id==='hardware') {
      const result=applyHardwareAction('INC-101',state.hardware,job.action);if(result.kind==='warning')break;state.hardware=result.state;
    } else advanceSimulation(lab,state,index);
    state.practice.push(job.id);
  }
  return restoreExplanation(lab,state,previous);
}

/** Page-memory learning actions. No storage, network, account, or browser execution APIs. */
export function applyFoundationAction(id,previous,action) {
  const lab=getFoundation(id);
  if(!lab)return {state:null,message:'Choose a beginner lab.',kind:'warning'};
  const state=normalize(lab,previous),type=own(action,'type');
  const result=(message,kind='info')=>({state,message,kind});
  if(!['inspect','answer','practice','code','run-code','explain','save-explanation'].includes(type))return result('Choose a labelled item, question or practice step.','warning');
  state.attempts=Math.min(state.attempts+1,1000000);
  if(type==='inspect') {
    const id=own(action,'item'),found=lab.items.find(item=>item.id===id);
    if(!found)return result('Choose a labelled item in this lab.','warning');
    if(!state.explored.includes(id))state.explored.push(id);
    return result(`${found.label}: ${found.role}`,'success');
  }
  if(type==='answer') {
    const question=lab.checks.find(check=>check.id===own(action,'check')),value=own(action,'value');
    if(!question||!question.options.some(option=>option.id===value))return result('Choose one of this question’s listed answers.','warning');
    if(state.answers[question.id]!==value)state.explanationSaved=false;
    state.answers[question.id]=value;
    return result(question.explanation,value===question.answer?'success':'warning');
  }
  if(type==='explain') {
    const patch={};
    for(const field of ['notes','reflection']){const value=own(action,field);if(value===undefined)continue;if(typeof value!=='string')return result('Write your answers as text.','warning');patch[field]=value.slice(0,2000);}
    for(const [field,value] of Object.entries(patch)){if(state[field]!==value)state.explanationSaved=false;state[field]=value;}
    return result('Your writing is ready to save when both answers are complete.');
  }
  if(type==='save-explanation') {
    if(!summarize(lab,state).practiceComplete)return result('Finish and test the practice job before saving your explanation.','warning');
    if(state.notes.trim().length<12)return result('Describe what you did and what happened in a full sentence.','warning');
    if(state.reflection.trim().length<12)return result('Explain what you learned in a full sentence.','warning');
    state.explanationSaved=true;
    return result('Your explanation is saved. Review your report.','success');
  }
  if(type==='code') {
    if(lab.id!=='coding')return result('The code editor belongs to the coding foundation.','warning');
    const source=own(action,'source');
    if(typeof source!=='string'||source.length>4000)return result('Keep the practice program at or below 4,000 characters.','warning');
    if(source!==state.code){state.code=source;state.sourceAtRun='';state.results=[];state.practice=[];state.explanationSaved=false;}
    return result('Code updated. Run all three tests to check this version.');
  }
  if(!readyForPractice(lab,state))return result(state.explored.length<lab.items.length?'Explore each item before starting the practice job.':'Answer all three questions correctly before starting the practice job.','warning');
  if(type==='run-code'||lab.id==='coding'&&type==='practice'&&own(action,'action')==='run-code') {
    if(lab.id!=='coding')return result('Run code is available in the coding foundation.','warning');
    state.runCount=Math.min(state.runCount+1,1000000);state.sourceAtRun=state.code;state.results=runFixtures(state.code);state.practice=state.results.filter(result=>result.passed).map(result=>`fixture-${result.quantity}`);
    const passed=state.practice.length;
    return result(`${passed} of 3 tests passed for this code. ${passed===3?'The same program handles all three quantities.':'Compare the result with the expected answer. Change one thing, then run again.'}`,passed===3?'success':'warning');
  }
  if(type!=='practice')return result('Choose the current practice step.','warning');
  if(!lab.jobs.some(job=>job.action===own(action,'action')))return result('Choose a labelled practice step.','warning');
  const next=lab.jobs[state.practice.length];
  if(!next)return result('Practice is complete. Explain what happened next.');
  if(own(action,'action')!==next.action)return result(`Next: ${next.prompt}`,'warning');
  if(lab.id==='hardware') {
    const change=applyHardwareAction('INC-101',state.hardware,next.action);
    if(change.kind==='warning')return result(change.message,'warning');
    state.hardware=change.state;state.practice.push(next.id);state.explanationSaved=false;return result(change.message,'success');
  }
  if(lab.id==='coding')return result('Edit the program, then run all tests.','warning');
  advanceSimulation(lab,state,state.practice.length);state.practice.push(next.id);state.explanationSaved=false;
  return result(lab.id==='network'&&state.practice.length===3?'The practice name was found and the page opened.':lab.id==='ai'&&state.practice.length===2?'The reply now matches the practice source. A person still needs to review it.':lab.id==='security'&&state.practice.length===3?'The practice account now has only learner access.':`${next.label}: complete.`,'success');
}

function summarize(lab,state) {
  const explored=state.explored.length,checked=lab.checks.filter(check=>state.answers[check.id]===check.answer).length,practice=state.practice.length;
  const done=explored===lab.items.length&&checked===lab.checks.length&&practice===lab.jobs.length;
  const practiceComplete=done&&(lab.id!=='hardware'||verifyHardware('INC-101',state.hardware).ok);
  return {explored,exploreTotal:lab.items.length,checked,checkTotal:lab.checks.length,practice,practiceTotal:lab.jobs.length,practiceComplete,complete:practiceComplete&&hasExplanation(state)&&state.explanationSaved,hasWork:state.attempts>0||explored>0||Object.keys(state.answers).length>0||practice>0||lab.id==='coding'&&state.code!==STARTER||state.runCount>0||state.notes.length>0||state.reflection.length>0};
}

export function foundationSummary(id,record) {
  const lab=getFoundation(id);
  return lab?summarize(lab,normalize(lab,record)):{explored:0,exploreTotal:0,checked:0,checkTotal:0,practice:0,practiceTotal:0,practiceComplete:false,complete:false,hasWork:false};
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
  lines.push('','MY EXPLANATION','What did you do, and what happened?',state.notes||'Not answered.','What did you learn?',state.reflection||'Not answered.','Explanation saved: '+(state.explanationSaved?'yes':'no'));
  lines.push('',`Progress: ${summary.explored}/${summary.exploreTotal} explored · ${summary.checked}/${summary.checkTotal} role checks · ${summary.practice}/${summary.practiceTotal} practice steps`,`Next ticket: ${lab.nextLab}`,'','This fictional learning activity runs in the current page. Review the report before choosing an approved export or submission destination.');
  return lines.join('\n');
}
