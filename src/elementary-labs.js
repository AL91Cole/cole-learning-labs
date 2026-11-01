import {renderBlockWorkshop,mountBlockWorkshop} from './block-workshop.js?release=20261025-learning-plans';

// Authored, fictional activities. Each mount owns its choices; nothing is saved
// or sent. These local practice checks are not grades or identity verification.
const esc=value=>String(value??'').replace(/[&<>"']/gu,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const pick=(id,label,icon)=>({id,label,...(icon?{icon}:{})});
const task=(prompt,choices,answer,explanation)=>({prompt,choices,answer,explanation});
const forecast=(prompt,choices,model,code,explanation)=>({prompt,choices,model,code,explanation});
const bands=['K–1','2–3','4–6'];
const topics={hardware:'Computer parts',network:'Networks',ai:'AI and checking',security:'Staying safe',coding:'Coding'};
const workshopLabIds=new Set(['EX-CODE-1','EX-CODE-2','EX-CODE-3']);

export const ELEMENTARY_LABS=freeze([
  {id:'EX-HW-1',title:'Meet the computer parts',track:'hardware',band:'K–1',grade:'K–1',minutes:5,kind:'match',diagram:'parts',summary:'Match three pictured parts to their jobs.',goal:'Choose a part, check its job and try again if needed.',tasks:[
    task('Which part shows pictures?',[pick('screen','Screen','screen'),pick('keys','Keyboard','keys'),pick('mouse','Mouse','mouse')],'screen','The screen shows pictures and words.'),
    task('Which part helps you type letters?',[pick('screen','Screen','screen'),pick('keys','Keyboard','keys'),pick('mouse','Mouse','mouse')],'keys','The keyboard has keys for typing.'),
    task('Which part helps you point and click?',[pick('screen','Screen','screen'),pick('keys','Keyboard','keys'),pick('mouse','Mouse','mouse')],'mouse','A mouse moves the pointer. A touchscreen or other access tool can help too.')
  ]},
  {id:'EX-NET-1',title:'Help a pretend message travel',track:'network',band:'K–1',grade:'K–1',minutes:5,kind:'order',diagram:'network',summary:'Join two picture paths, then send a pretend hello.',goal:'Choose the three steps in order. Only the picture changes.',tasks:[
    task('First, join the computer to the switch.',[pick('left','Join computer → switch'),pick('right','Join switch → tablet'),pick('send','Send a pretend hello')],'left','The first path is joined. A switch helps devices connect.'),
    task('Next, join the switch to the tablet.',[pick('left','Join computer → switch'),pick('right','Join switch → tablet'),pick('send','Send a pretend hello')],'right','Now both picture paths are joined.'),
    task('Both paths are ready. What comes next?',[pick('left','Join computer → switch'),pick('right','Join switch → tablet'),pick('send','Send a pretend hello')],'send','The pretend hello reached the tablet. No real message was sent.')
  ]},
  {id:'EX-AI-1',title:'Check the robot’s guess',track:'ai',band:'K–1',grade:'K–1',minutes:5,kind:'match',diagram:'ai',summary:'Use a picture to check a made-up computer answer.',goal:'A computer can make a wrong guess. Look for something you can check.',tasks:[
    task('The pretend robot calls this an orange square. What should we do?',[pick('look','Look at the picture'),pick('believe','Always believe the robot'),pick('hide','Hide the picture')],'look','Look at the picture instead of trusting a guess.'),
    task('What does the picture show?',[pick('blue','A blue circle'),pick('orange','An orange square'),pick('green','A green triangle')],'blue','The picture and its label show a blue circle.'),
    task('What can you do when an answer is confusing?',[pick('help','Ask a trusted adult to help check'),pick('guess','Pretend every answer is right'),pick('private','Give it private information')],'help','People can help check an answer. Keep private information out.')
  ]},
  {id:'EX-SEC-1',title:'Keep private things private',track:'security',band:'K–1',grade:'K–1',minutes:5,kind:'match',diagram:'message',summary:'Choose safe replies to three pretend requests.',goal:'Pause and ask a trusted adult when a message wants private information.',tasks:[
    task('A pretend game asks for your real name. What is a safe next step?',[pick('adult','Pause and ask a trusted adult'),pick('name','Give your real name'),pick('friend','Give a friend’s name')],'adult','Pause and ask a trusted adult. A game does not need a friend’s information either.'),
    task('A stranger asks for a password. What should you do?',[pick('keep','Do not share it; ask a trusted adult'),pick('send','Send the password'),pick('post','Put it in a public message')],'keep','Keep passwords private and get help through a trusted route.'),
    task('Which label uses made-up information?',[pick('robot','Robot Comet'),pick('address','Your home address'),pick('birthday','Your full birthday')],'robot','Robot Comet is a made-up label. Do not use private details as a nickname.')
  ]},
  {id:'EX-CODE-1',title:'Move the picture robot',track:'coding',band:'K–1',grade:'K–1',minutes:5,kind:'predict',diagram:'grid',summary:'Predict where short arrow instructions will stop.',goal:'Choose a space, run the picture model and compare.',tasks:[
    forecast('Start on space 1. Move right once. Where will the robot stop?',[pick('two','Space 2'),pick('three','Space 3'),pick('one','Space 1')],{type:'moves',start:1,moves:[1]},'START 1\nRIGHT','One move takes the robot from 1 to 2.'),
    forecast('Start on space 1. Move right twice. Where will it stop?',[pick('two','Space 2'),pick('three','Space 3'),pick('four','Space 4')],{type:'moves',start:1,moves:[1,1]},'START 1\nRIGHT\nRIGHT','Two right moves take the robot to space 3.'),
    forecast('Start on space 3. Move left once. Where will it stop?',[pick('two','Space 2'),pick('three','Space 3'),pick('four','Space 4')],{type:'moves',start:3,moves:[-1]},'START 3\nLEFT','A left move takes the robot from 3 to 2.')
  ]},
  {id:'EX-HW-2',title:'Plan a safe virtual repair',track:'hardware',band:'2–3',grade:'2–3',minutes:7,kind:'order',diagram:'parts',summary:'Put a pretend computer’s safety steps in order.',goal:'Use the picture only. Ask a trusted adult about real equipment.',tasks:[
    task('Before a pretend repair, what comes first?',[pick('off','Turn the virtual computer off'),pick('unplug','Disconnect its virtual power lead'),pick('adult','Ask an adult to handle a real repair')],'off','The virtual computer is off. This activity does not control a real computer.'),
    task('The picture computer is off. What is the next safety step?',[pick('off','Turn the virtual computer off'),pick('unplug','Disconnect its virtual power lead'),pick('adult','Ask an adult to handle a real repair')],'unplug','Its virtual power lead is disconnected. Do not open or work inside real equipment here.'),
    task('What should you do about a real repair?',[pick('off','Turn the virtual computer off'),pick('unplug','Disconnect its virtual power lead'),pick('adult','Ask an adult to handle a real repair')],'adult','A trusted adult should arrange an approved repair. Finishing a picture activity is not permission to open a real device.')
  ]},
  {id:'EX-NET-2',title:'Choose a packet’s destination',track:'network',band:'2–3',grade:'2–3',minutes:7,kind:'predict',diagram:'network',summary:'Follow a pretend destination label through a network.',goal:'Predict the result, then run a local picture test. No real network is contacted.',tasks:[
    forecast('The packet is labeled Library. Both paths work. Where will it go?',[pick('library','Library'),pick('art','Art room'),pick('none','No delivery')],{type:'route',destination:'Library',open:['Library','Art room']},'TO: Library\nOPEN: Library, Art room','The destination label selects the Library path.'),
    forecast('The next packet is labeled Art room. Both paths work. Where will it go?',[pick('library','Library'),pick('art','Art room'),pick('none','No delivery')],{type:'route',destination:'Art room',open:['Library','Art room']},'TO: Art room\nOPEN: Library, Art room','A new destination selects the Art room path.'),
    forecast('The Art room path is closed. What happens to a packet for Art room?',[pick('library','Library'),pick('art','Art room'),pick('none','No delivery')],{type:'route',destination:'Art room',open:['Library']},'TO: Art room\nOPEN: Library','It cannot reach its destination. A label alone cannot fix a closed path.')
  ]},
  {id:'EX-AI-2',title:'Find evidence for an answer',track:'ai',band:'2–3',grade:'2–3',minutes:7,kind:'match',diagram:'evidence',summary:'Check a made-up AI claim against a small fact card.',goal:'Use evidence, keep uncertainty and ask for help when a source is missing.',tasks:[
    task('A pretend AI says all birds fly. The fact card says penguins do not fly. Which answer fits?',[pick('some','Some birds do not fly'),pick('all','All birds fly'),pick('none','No birds fly')],'some','One counterexample shows that “all” is too strong. It does not show that no birds fly.'),
    task('The AI names a book that is not on our fact card. What should we do?',[pick('check','Ask an adult to help find and check it'),pick('invent','Make up a page number'),pick('trust','Treat the title as proof')],'check','A confident title is not evidence. Check that the source exists and supports the claim.'),
    task('Which information belongs in this practice?',[pick('fiction','Made-up animal examples'),pick('record','A private school record'),pick('secret','Someone’s password')],'fiction','Use fictional examples. Evidence checking does not require private information.')
  ]},
  {id:'EX-SEC-2',title:'Pause, check, get help',track:'security',band:'2–3',grade:'2–3',minutes:7,kind:'order',diagram:'message',summary:'Handle a pretend prize message without opening its link.',goal:'Choose safe steps in order. The message is an inert picture.',tasks:[
    task('A surprise message says “Click now to win!” What comes first?',[pick('pause','Pause; do not open its link'),pick('check','Check with a trusted adult in person'),pick('report','Use the adult’s approved reporting steps')],'pause','Pausing gives you time to think. Nothing in this activity opens a message link.'),
    task('You paused. How should you check the message?',[pick('pause','Pause; do not open its link'),pick('check','Check with a trusted adult in person'),pick('report','Use the adult’s approved reporting steps')],'check','Use a route you already trust, rather than a reply address supplied by the message.'),
    task('An adult says the message should be reported. What next?',[pick('pause','Pause; do not open its link'),pick('check','Check with a trusted adult in person'),pick('report','Use the adult’s approved reporting steps')],'report','Follow the school’s or family’s approved steps. Do not forward the message to friends.')
  ]},
  {id:'EX-CODE-2',title:'Predict a small counter',track:'coding',band:'2–3',grade:'2–3',minutes:7,kind:'predict',diagram:'counter',summary:'Follow additions and short repeats, then run the model.',goal:'Predict a number and compare it with a bounded local counter.',tasks:[
    forecast('Start at 2. Add 1 three times. What number will appear?',[pick('five','5'),pick('three','3'),pick('six','6')],{type:'counter',start:2,program:[{op:'repeat',times:3,body:[{op:'add',value:1}]}]},'counter = 2\nREPEAT 3 TIMES:\n  ADD 1','Three additions give 3, then 4, then 5.'),
    forecast('Start at 2. Add 2 twice. What number will appear?',[pick('four','4'),pick('six','6'),pick('three','3')],{type:'counter',start:2,program:[{op:'repeat',times:2,body:[{op:'add',value:2}]}]},'counter = 2\nREPEAT 2 TIMES:\n  ADD 2','The counter changes from 2 to 4 to 6.'),
    forecast('Start at 4. Add 2, then take away 3. What number will appear?',[pick('seven','7'),pick('five','5'),pick('three','3')],{type:'counter',start:4,program:[{op:'add',value:2},{op:'add',value:-3}]},'counter = 4\nADD 2\nTAKE AWAY 3','Order matters: 4 becomes 6, then 3.')
  ]},
  {id:'EX-HW-3',title:'Trace a screen signal',track:'hardware',band:'4–6',grade:'4–6',minutes:8,kind:'predict',diagram:'display',summary:'Compare power, a cable and the selected screen input.',goal:'Use the modeled setup to predict a display test. Change no real equipment.',tasks:[
    forecast('Power is on and the HDMI cable is connected, but the screen is set to USB-C. What will its test show?',[pick('picture','Picture visible'),pick('blank','No picture')],{type:'display',power:true,cable:true,input:'USB-C'},'POWER: on\nCABLE: HDMI, connected\nSCREEN INPUT: USB-C','The selected input does not match the connected HDMI cable.'),
    forecast('Only the selected screen input changed to HDMI. What will the next test show?',[pick('picture','Picture visible'),pick('blank','No picture')],{type:'display',power:true,cable:true,input:'HDMI'},'POWER: on\nCABLE: HDMI, connected\nSCREEN INPUT: HDMI','Power, the cable and the selected input now agree.'),
    forecast('The input is still HDMI, but the virtual computer is off. What will the test show?',[pick('picture','Picture visible'),pick('blank','No picture')],{type:'display',power:false,cable:true,input:'HDMI'},'POWER: off\nCABLE: HDMI, connected\nSCREEN INPUT: HDMI','A matching cable and input do not create a signal when the virtual computer is off.')
  ]},
  {id:'EX-NET-3',title:'Find the missing network step',track:'network',band:'4–6',grade:'4–6',minutes:8,kind:'predict',diagram:'network',summary:'Distinguish an address problem from a name-lookup problem.',goal:'Read three fictional setups, predict each result and run the local model.',tasks:[
    forecast('The cable works, but the device has no address. What will the delivery check show?',[pick('address','Address missing'),pick('name','Name lookup missing'),pick('delivered','Delivered')],{type:'network',cable:true,address:false,name:true},'CABLE: ready\nDEVICE ADDRESS: missing\nNAME LOOKUP: ready','The device needs an address before this modeled delivery can work.'),
    forecast('The cable and address work. The destination uses a name, but name lookup is missing. What will the check show?',[pick('address','Address missing'),pick('name','Name lookup missing'),pick('delivered','Delivered')],{type:'network',cable:true,address:true,name:false},'CABLE: ready\nDEVICE ADDRESS: ready\nNAME LOOKUP: missing','This test uses a name, so it also needs name lookup.'),
    forecast('All three modeled steps are ready. What will the check show?',[pick('address','Address missing'),pick('name','Name lookup missing'),pick('delivered','Delivered')],{type:'network',cable:true,address:true,name:true},'CABLE: ready\nDEVICE ADDRESS: ready\nNAME LOOKUP: ready','The fictional delivery works. This is a simplified model, not a real network test.')
  ]},
  {id:'EX-AI-3',title:'Question a tiny survey',track:'ai',band:'4–6',grade:'4–6',minutes:8,kind:'match',diagram:'survey',summary:'Check whether a small sample supports a broad AI claim.',goal:'Notice who is missing, separate evidence from guesses and protect privacy.',tasks:[
    task('Four robot-club members chose building robots. A pretend AI says every pupil prefers robots. What is the problem?',[pick('sample','One club does not represent everyone'),pick('certain','Four answers prove every pupil agrees'),pick('wrong','Every club member must be wrong')],'sample','A small group selected for a shared interest cannot establish everyone’s preference.'),
    task('What would make a future school-approved survey more useful?',[pick('wider','Ask a wider range of groups using an approved process'),pick('repeat','Ask the same four people again'),pick('invent','Invent answers for missing people')],'wider','A wider range can reveal different views. An approved process must still limit and protect any data.'),
    task('Which conclusion fits the fact card right now?',[pick('limited','These four club members chose robots; other views are unknown'),pick('all','Every pupil chose robots'),pick('collect','We need to collect everyone’s private records here')],'limited','Keep the conclusion as narrow as the evidence. This activity collects no survey answers from real people.')
  ]},
  {id:'EX-SEC-3',title:'Choose the least access',track:'security',band:'4–6',grade:'4–6',minutes:8,kind:'match',diagram:'permissions',summary:'Choose safer permissions and handle a suspicious sign-in request.',goal:'Give only needed access and verify unexpected requests through a known route.',tasks:[
    task('A fictional drawing tool needs a blank canvas. Which permission choice fits?',[pick('canvas','Canvas only; no contacts or location'),pick('all','All contacts, camera and location'),pick('password','A school password typed into the drawing')],'canvas','Use the least access needed. This picture activity requests no device permissions.'),
    task('A surprise message asks you to approve a sign-in you did not start. What should you do?',[pick('deny','Do not approve; tell a trusted adult through a known route'),pick('approve','Approve so the message disappears'),pick('share','Share the approval code with the sender')],'deny','An unexpected approval request is a reason to pause and get help, not to share a code.'),
    task('A download page claims it is safe. What gives useful evidence?',[pick('approved','An adult checks the school-approved source and process'),pick('badge','A safety badge drawn by the page itself'),pick('rush','A countdown demanding an immediate click')],'approved','A page’s own badge or urgency is not independent proof. No download is needed for this activity.')
  ]},
  {id:'EX-CODE-3',title:'Trace repeats and decisions',track:'coding',band:'4–6',grade:'4–6',minutes:8,kind:'predict',diagram:'counter',summary:'Predict a short counter program with a repeat and a decision.',goal:'Read the fixed instructions, run the bounded model and compare evidence.',tasks:[
    forecast('Start at 4. Add 2 three times. What is the final counter?',[pick('ten','10'),pick('six','6'),pick('twelve','12')],{type:'counter',start:4,program:[{op:'repeat',times:3,body:[{op:'add',value:2}]}]},'counter = 4\nREPEAT 3 TIMES:\n  ADD 2','The counter changes to 6, then 8, then 10.'),
    forecast('Start at 3. If the counter is at least 5, add 10; otherwise add 1. What is the result?',[pick('four','4'),pick('thirteen','13'),pick('three','3')],{type:'counter',start:3,program:[{op:'ifAtLeast',value:5,yes:[{op:'add',value:10}],no:[{op:'add',value:1}]}]},'counter = 3\nIF counter >= 5: ADD 10\nOTHERWISE: ADD 1','Three is below five, so only the otherwise branch adds one.'),
    forecast('Start at 1. Add 2 twice, then test whether the result is at least 5. Which final counter appears?',[pick('six','6'),pick('fifteen','15'),pick('five','5')],{type:'counter',start:1,program:[{op:'repeat',times:2,body:[{op:'add',value:2}]},{op:'ifAtLeast',value:5,yes:[{op:'add',value:10}],no:[{op:'add',value:1}]}]},'counter = 1\nREPEAT 2 TIMES: ADD 2\nIF counter >= 5: ADD 10\nOTHERWISE: ADD 1','The repeat reaches five. “At least five” includes five, so the first branch adds ten.')
  ]}
]);

const byId=new Map(ELEMENTARY_LABS.map(lab=>[lab.id,lab]));
const knownLab=id=>typeof id==='string'?byId.get(id):undefined;
const bandCode=band=>band==='K–1'?'k1':band==='2–3'?'2-3':'4-6';
const gradeLabel=band=>band==='K–1'?'Kindergarten–grade 1':`Grades ${band}`;
const svg=(label,body)=>`<svg viewBox="0 0 640 200" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</svg>`;
function partIcon(name){
  const shape=name==='keys'?'<rect x="12" y="35" width="96" height="45" rx="6"/><path d="M24 47h72M24 59h72M35 71h50"/>':name==='mouse'?'<rect x="37" y="12" width="46" height="76" rx="23"/><path d="M60 12v28M38 40h44"/>':'<rect x="12" y="12" width="96" height="62" rx="5"/><path d="M60 74v15M39 89h42"/>';
  return `<svg viewBox="0 0 120 100" aria-hidden="true" focusable="false">${shape}</svg>`;
}
function resultFor(model){
  if(!model||typeof model!=='object')return '';
  if(model.type==='moves')return `Space ${model.moves.reduce((place,move)=>Math.max(1,Math.min(5,place+move)),model.start)}`;
  if(model.type==='route')return model.open.includes(model.destination)?model.destination:'No delivery';
  if(model.type==='display')return model.power&&model.cable&&model.input==='HDMI'?'Picture visible':'No picture';
  if(model.type==='network')return !model.cable?'Cable missing':!model.address?'Address missing':!model.name?'Name lookup missing':'Delivered';
  if(model.type==='counter'){
    let value=model.start,budget=0;
    function run(commands,depth=0){
      if(depth>3||!Array.isArray(commands)||commands.length>12)throw Error('Invalid authored model');
      for(const command of commands){
        if(++budget>64)throw Error('Authored model limit');
        if(command.op==='add'&&Number.isSafeInteger(command.value))value+=command.value;
        else if(command.op==='repeat'&&Number.isSafeInteger(command.times)&&command.times>=0&&command.times<=8){for(let index=0;index<command.times;index++)run(command.body,depth+1);}
        else if(command.op==='ifAtLeast'&&Number.isSafeInteger(command.value))run(value>=command.value?command.yes:command.no,depth+1);
        else throw Error('Unknown authored instruction');
        if(!Number.isSafeInteger(value)||Math.abs(value)>1000)throw Error('Authored counter limit');
      }
    }
    run(model.program);return String(value);
  }
  return '';
}
function illustration(lab,round,state){
  const done=state.index+(state.checked?1:0),model=round.model;
  if(lab.diagram==='parts')return svg('A screen, keyboard and mouse. These are pictures, not real equipment.','<rect x="45" y="25" width="190" height="105" rx="10"/><path d="M140 130v25M95 155h90"/><rect x="295" y="68" width="180" height="65" rx="8"/><path d="M315 88h140M315 108h140"/><rect x="540" y="52" width="55" height="90" rx="27"/><path d="M568 52v35"/><text x="140" y="185">Screen</text><text x="385" y="170">Keyboard</text><text x="567" y="170">Mouse</text>');
  if(lab.diagram==='network'){
    const left=lab.kind==='order'?done>=1:model?.type==='network'?model.cable:true;
    const right=lab.kind==='order'?done>=2:model?.type==='route'?model.open.includes(model.destination):true;
    const destination=model?.type==='route'?model.destination:'Tablet / server';
    return svg('Fictional network: computer, switch and '+destination+'. '+(left&&right?'Picture paths connected.':'A picture path is not ready.'),`<path class="elementary-path${left?' is-ready':''}" d="M150 85H275"/><path class="elementary-path${right?' is-ready':''}" d="M365 85H490"/><rect x="30" y="35" width="120" height="90" rx="8"/><rect x="275" y="60" width="90" height="50" rx="8"/><rect x="490" y="35" width="120" height="90" rx="8"/><text x="90" y="165">Computer</text><text x="320" y="165">Switch</text><text x="550" y="165">${esc(destination)}</text>${lab.kind==='order'&&done===3?'<text class="elementary-result" x="320" y="30">Pretend hello delivered</text>':''}`);
  }
  if(lab.diagram==='ai')return svg('Fact picture: a blue circle. The pretend robot guessed orange square.','<circle class="elementary-blue" cx="160" cy="85" r="55"/><text x="160" y="170">Blue circle</text><rect x="300" y="35" width="290" height="110" rx="14"/><text x="445" y="75">Pretend robot guessed:</text><text x="445" y="108">“Orange square”</text><text x="445" y="177">Check the picture</text>');
  if(lab.diagram==='evidence')return svg('Fact card: some birds fly. Penguins are birds and do not fly.','<rect x="50" y="25" width="540" height="150" rx="12"/><text x="320" y="68">FACT CARD</text><text x="320" y="108">Penguins are birds.</text><text x="320" y="143">Penguins do not fly.</text>');
  if(lab.diagram==='survey')return svg('Fictional fact card: four robot-club members chose robots; other groups were not asked.','<rect x="35" y="20" width="570" height="160" rx="12"/><text x="320" y="57">Robot club: 4 chose robots</text><path d="M120 85h400M120 108h400"/><text x="320" y="145">Other groups: not asked</text>');
  if(lab.diagram==='message')return svg('A pretend message asks you to click for a prize. Pause and get help. No link can be opened.','<rect x="55" y="20" width="530" height="160" rx="12"/><text x="320" y="58">PRETEND MESSAGE</text><text x="320" y="101">“Click now to win!”</text><text x="320" y="146">Pause · Check · Get help</text>');
  if(lab.diagram==='permissions')return svg('Fictional permission choices: a canvas is needed; contacts, camera and location are not.','<rect x="50" y="25" width="230" height="145" rx="12"/><text x="165" y="75">Drawing canvas</text><path d="M85 145l40-35 35 20 60-45"/><text x="450" y="62">Not needed:</text><text x="450" y="102">Contacts · Camera</text><text x="450" y="142">Location</text>');
  if(lab.diagram==='display')return svg('Virtual display test. '+(state.tested?state.result:'Test not run.')+`. Power ${model.power?'on':'off'}, HDMI cable connected, input ${model.input}.`,`<rect x="35" y="50" width="90" height="110" rx="8"/><path d="M125 110H285"/><rect x="285" y="25" width="310" height="135" rx="10"/><text x="440" y="76">${state.tested?esc(state.result):'Predict, then test'}</text><text x="440" y="115">Input: ${esc(model.input)}</text><text x="80" y="190">${model.power?'Power on':'Power off'}</text>`);
  if(lab.diagram==='grid'){
    const position=state.tested?Number(state.result.replace('Space ','')):model.start;
    return svg('Robot on space '+position+' of five.',Array.from({length:5},(_,index)=>`<rect x="${35+index*115}" y="45" width="105" height="100" rx="8"/><text x="${87+index*115}" y="173">${index+1}</text>${position===index+1?`<rect class="elementary-robot" x="${60+index*115}" y="65" width="55" height="55" rx="8"/><path d="M${72+index*115} 84h5m20 0h5M${76+index*115} 104h25"/>`:''}`).join(''));
  }
  return svg('A fictional counter. '+(state.tested?'Result '+state.result:'Starting number '+model.start)+'.',`<rect x="110" y="25" width="420" height="150" rx="14"/><text x="320" y="70">${state.tested?'Model result':'Starting counter'}</text><text class="elementary-counter-number" x="320" y="135">${esc(state.tested?state.result:model.start)}</text>`);
}
const blankState=()=>({index:0,choice:'',checked:false,complete:false,tested:false,result:''});
function bodyFor(lab,state){
  const round=lab.tasks[state.index];
  const options=round.choices.map(option=>`<button type="button" class="elementary-choice" data-elementary-action="choose" data-elementary-choice="${esc(option.id)}" aria-pressed="${state.choice===option.id}"${state.checked?' disabled':''}>${option.icon?partIcon(option.icon):''}<span>${esc(option.label)}</span></button>`).join('');
  return `<div class="elementary-progress"><span>${state.index+(state.checked?1:0)} of ${lab.tasks.length} ${lab.kind==='order'?'steps':'challenges'} finished</span><progress max="${lab.tasks.length}" value="${state.index+(state.checked?1:0)}" aria-label="Practice progress"></progress></div><figure class="elementary-picture">${illustration(lab,round,state)}<figcaption>Fictional picture model · ${esc(topics[lab.track])}</figcaption></figure>${state.complete?'<section class="elementary-finished"><h2 data-elementary-finished tabindex="-1">Practice finished.</h2><p>You tried each challenge and checked the result. This is practice, not a grade.</p><p>Try again or choose another activity below.</p></section>':`<h2 data-elementary-prompt tabindex="-1">${esc(round.prompt)}</h2>${round.code?`<pre class="elementary-code"><code>${esc(round.code)}</code></pre>`:''}<div class="elementary-choices" role="group" aria-label="Choose an answer">${options}</div><div class="elementary-actions"><button type="button" class="button" data-elementary-action="check"${state.checked?' disabled':''}>${lab.kind==='predict'?'Run the model':'Check choice'}</button>${state.checked?'<button type="button" class="button button-outline" data-elementary-action="next">Next challenge →</button>':''}</div>`}${state.tested?`<p class="elementary-observation">Model showed: <output data-elementary-output>${esc(state.result)}</output></p>`:''}`;
}

export function renderElementaryCatalogue({band}={}){
  const selected=bands.includes(band)?band:null;
  return `<section class="wrap page-intro elementary-catalogue"><p class="eyebrow">Explore and try · Free activities</p><h1>Small steps.<br><em>Try a technology idea.</em></h1><p>Fifteen short, fictional activities for kindergarten through grade 6. These are suggested starting points; an adult can help with reading and choosing a suitable activity.</p><p>Choose, check and try again. These activities have no chat box, learner account, upload, score or device saving.</p>${selected?'<p><a href="#explore">← All age bands</a></p>':''}${bands.filter(value=>!selected||value===selected).map(value=>`<section class="elementary-band" aria-labelledby="elementary-band-${bandCode(value)}"><h2 id="elementary-band-${bandCode(value)}">${gradeLabel(value)}</h2><div class="elementary-catalogue-grid">${ELEMENTARY_LABS.filter(lab=>lab.band===value).map(lab=>`<a class="basics-card elementary-card" href="#explore/${lab.id}"><span class="eyebrow">${esc(topics[lab.track])}</span><h3>${esc(lab.title)}</h3><p>${esc(lab.summary)}</p><span>${lab.minutes} min · Try this activity →</span></a>`).join('')}</div></section>`).join('')}<p><a href="#labs">Grades 7–12 and other labs →</a></p></section>`;
}

function optionalWorkshop(lab){
  if(!workshopLabIds.has(lab.id))return '';
  return `<section class="elementary-workshop" aria-label="Optional block workshop"><p class="panel-help">Optional: build your own program with blocks. This workspace has its own controls; its program does not change the three prediction challenges above.</p><div data-elementary-workshop>${renderBlockWorkshop({band:lab.band})}</div></section>`;
}

export function renderElementaryLab(id){
  const lab=knownLab(id);
  if(!lab)return '<section class="wrap page-intro"><h1>Choose an available activity.</h1><a href="#explore">All kindergarten–grade 6 activities →</a></section>';
  const workshopJump=workshopLabIds.has(lab.id)?'<p><button type="button" class="button button-outline" data-elementary-action="workshop">Open block workshop</button></p>':'';
  return `<section class="wrap elementary-lab" data-elementary-lab="${lab.id}" data-elementary-complete="false" aria-labelledby="elementary-title"><header><a href="#explore?band=${bandCode(lab.band)}">← ${gradeLabel(lab.band)} activities</a><p class="eyebrow">${esc(gradeLabel(lab.band))} · ${esc(topics[lab.track])} · About ${lab.minutes} minutes</p><h1 id="elementary-title">${esc(lab.title)}</h1><p>${esc(lab.goal)}</p>${workshopJump}</header><div data-elementary-body>${bodyFor(lab,blankState())}</div><p class="elementary-feedback" data-elementary-feedback role="status" aria-live="polite" aria-atomic="true">Choose an answer, then check it.</p><div class="elementary-actions"><button type="button" class="button button-outline" data-elementary-action="reset">Start this activity again</button><a href="#explore">Choose another activity →</a></div><p class="elementary-privacy">Use made-up information. Your choices stay in this activity’s page memory and disappear when you leave it. No real computer, network, AI service or account is controlled by these picture models.</p>${optionalWorkshop(lab)}</section>`;
}

export function mountElementaryLab(root,{id}={}){
  const lab=knownLab(id);
  if(!lab)return {dispose(){}};
  const shell=root?.querySelector?.('[data-elementary-lab]');
  if(!shell||shell.dataset.elementaryLab!==id)return {dispose(){}};
  const body=shell.querySelector('[data-elementary-body]'),feedback=shell.querySelector('[data-elementary-feedback]');
  if(!body||!feedback)return {dispose(){}};
  const workshopRoot=workshopLabIds.has(lab.id)?shell.querySelector('[data-elementary-workshop]'):null;
  const workshop=workshopRoot?mountBlockWorkshop(workshopRoot,{band:lab.band}):null;
  const workshopHeading=workshopRoot?.querySelector?.('h3');
  if(workshopHeading)workshopHeading.tabIndex=-1;
  let state=blankState(),disposed=false;
  function paint(message,{tone='info',focus}={}){
    if(disposed)return;
    body.innerHTML=bodyFor(lab,state);shell.dataset.elementaryComplete=String(state.complete);
    feedback.textContent=message;feedback.dataset.tone=tone;
    if(focus==='choice')body.querySelectorAll('[data-elementary-choice]')[0]?.focus();
    else if(focus)body.querySelector(focus)?.focus();
  }
  function click(event){
    if(disposed)return;
    const button=event.target?.closest?.('button[data-elementary-action]');
    if(!button||!shell.contains(button)||button.disabled||workshopRoot?.contains(button))return;
    const action=button.dataset.elementaryAction,round=lab.tasks[state.index];
    if(action==='workshop'){workshopHeading?.focus({preventScroll:true});workshopHeading?.scrollIntoView({block:'start'});return;}
    if(action==='reset'){state=blankState();paint('A fresh practice is ready. Choose an answer, then check it.',{focus:'[data-elementary-prompt]'});return;}
    if(state.complete)return;
    if(action==='choose'){
      if(state.checked||!round.choices.some(option=>option.id===button.dataset.elementaryChoice))return;
      state.choice=button.dataset.elementaryChoice;state.tested=false;state.result='';
      const selected=state.choice;paint('Choice selected. Check it when you are ready.');
      [...body.querySelectorAll('[data-elementary-choice]')].find(option=>option.dataset.elementaryChoice===selected)?.focus();return;
    }
    if(action==='next'){
      if(!state.checked||state.index>=lab.tasks.length-1)return;
      state={...blankState(),index:state.index+1};paint('Try the next challenge.',{focus:'[data-elementary-prompt]'});return;
    }
    if(action!=='check'||state.checked)return;
    const selected=round.choices.find(option=>option.id===state.choice);
    if(!selected){paint('Choose one of the answers first.',{focus:'choice'});return;}
    let correct;
    if(lab.kind==='predict'){
      state.result=resultFor(round.model);state.tested=true;correct=selected.label===state.result;
    }else correct=selected.id===round.answer;
    if(!correct){paint(lab.kind==='predict'?`The model showed ${state.result}. Compare it with your prediction, then choose and test again.`:'That step does not fit yet. Look at the picture and the question, then try a different choice.',{tone:'retry',focus:'[data-elementary-action="check"]'});return;}
    state.checked=true;state.complete=state.index===lab.tasks.length-1;
    paint(round.explanation+(state.complete?' Practice finished; this is not a grade.':''),{tone:'success',focus:state.complete?'[data-elementary-finished]':'[data-elementary-action="next"]'});
  }
  shell.addEventListener('click',click);
  paint('Choose an answer, then check it.');
  return {dispose(){if(disposed)return;disposed=true;shell.removeEventListener('click',click);state=null;workshop?.dispose();}};
}
