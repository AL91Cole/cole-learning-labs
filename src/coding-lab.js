import {captureWorkspaceView} from './workspace-accessibility.js?release=20261021-table27';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const key = id => typeof id === 'string' ? id.replaceAll('-', '').toUpperCase() : '';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const LIMITS = Object.freeze({source:4000,tokens:1000,steps:1000,output:20,text:300,repeat:50,depth:24});
const forbidden = new Set(['__proto__','prototype','constructor','eval','Function','document','window','globalThis','fetch','import','require','process','localStorage','sessionStorage','location','XMLHttpRequest','WebSocket','Worker','navigator','indexedDB','this','new','while','function','class','async','await','pyassign','rangeLoop']);
export const CODING_LANGUAGES=Object.freeze([{id:'javascript',label:'JavaScript subset'},{id:'python',label:'Python subset'}].map(Object.freeze));
const languageId=value=>value==='python'?'python':'javascript';
const reserved=new Set(['let','if','else','elif','repeat','print','console','true','false','True','False','for','in','range','and','or','not','str']);
const clue = (id,label,text) => ({id,label,text});
const question = (label,answer) => ({label,answer});

export const CODING_SCENARIOS = [
  {
    id:'CODE-501',title:'The Supply Calculator',track:'coding',grade:'7–8',minutes:20,
    summary:'Repair a variable expression and test it with different input quantities.',requester:'Virtual lab coordinator · Supply desk',
    goal:'Print the total cost: the supplied quantity multiplied by 3 credits per kit.',
    brief:'The supply desk calculator adds the kit price to the quantity. Change the program so every supplied quantity produces the correct total. Choose a bounded JavaScript or Python subset in the local editor; neither is a full language runtime.',
    clues:[clue('input','Read the input contract','quantity is supplied by the test fixture. It can change between runs; do not replace it with a fixed number.'),clue('price','Read the price label','Each kit costs 3 credits. Print a number only: quantity multiplied by the price.'),clue('fixtures','Inspect the fixture sheet','The tests supply quantities 2, 5, and 0. A zero quantity must produce zero cost.')],
    questions:[question('What does quantity represent?','quantity is the number of kits requested. The simulator supplies a different value for each fixture.'),question('How should the answer look?','Print one numeric total, with no currency label. For two kits at 3 credits each, print 6.')],
    interviewFacts:[{keywords:['price','cost','credit','kit'],answer:'Each kit costs 3 credits. The output must be the supplied quantity multiplied by 3.'},{keywords:['input','quantity','fixture'],answer:'The simulator supplies quantity. Test quantities are 2, 5, and 0; the same program must handle all three.'}]
  },
  {
    id:'CODE-502',title:'The Classroom Thermostat',track:'coding',grade:'9–10',minutes:25,
    summary:'Use comparisons and decisions to choose a classroom climate message.',requester:'Virtual facilities technician · Room monitor',
    goal:'Print Heating below 20, Comfortable from 20 through 25, and Cooling above 25.',
    brief:'A simulated thermostat reports the wrong mode around its boundaries. Read the supplied temperature and repair the if/else decisions. Nothing here controls a real thermostat.',
    clues:[clue('contract','Read the control specification','The input temperature is a number. Below 20 print Heating. From 20 through 25 inclusive print Comfortable. Above 25 print Cooling.'),clue('boundary','Inspect the boundary tests','The tests include 18, 20, 25, and 30. The values 20 and 25 belong to Comfortable.'),clue('output','Read the display format','Print exactly one word per input: Heating, Comfortable, or Cooling. Letter case matters.')],
    questions:[question('Are the boundaries included?','Yes. Both 20 and 25 belong to Comfortable. Only values below 20 need Heating, and only values above 25 need Cooling.'),question('Is this connected to equipment?','No. The temperatures and display are fictional test fixtures inside this coding simulation.')],
    interviewFacts:[{keywords:['temperature','threshold','boundary','comfortable'],answer:'Below 20 means Heating. Both 20 and 25 are Comfortable. Above 25 means Cooling.'},{keywords:['fixture','test','input'],answer:'Tests supply temperatures 18, 20, 25, and 30. Print exactly one correctly capitalized mode word for each input.'}]
  },
  {
    id:'CODE-503',title:'The Workstation Readiness Loop',track:'coding',grade:'11–12',minutes:30,
    summary:'Repair an off-by-one error using a bounded loop and changing fixture inputs.',requester:'Virtual deployment lead · Training room',
    goal:'Print Ready 1 through Ready N, one line per station, using the supplied stations count.',
    brief:'The readiness checklist starts counting at zero. Repair its counter so every supplied room size produces exactly one numbered line per station. JavaScript for loops and Python for-in-range loops are both bounded in this practice editor.',
    clues:[clue('input','Read the deployment sheet','stations is supplied by the test fixture. Test room sizes are 1, 3, and 5.'),clue('sequence','Inspect the required checklist','A room with three stations needs Ready 1, Ready 2, and Ready 3 on separate lines. Do not print Ready 0 or an extra line.'),clue('loop','Read the loop card','Both loop forms need a start, a stopping boundary, and a step. Print exactly stations lines. The editor reference covers JavaScript for, Python range, and legacy repeat.')],
    questions:[question('What should the first line be?','The first line is Ready 1. A three-station room ends at Ready 3, with three lines total.'),question('How does repeat work?','repeat(count) executes the braced block count times. Counts must be whole numbers from 0 through 50. The simulator also limits total execution steps.')],
    interviewFacts:[{keywords:['station','room','fixture','input'],answer:'The supplied stations count changes between 1, 3, and 5. Print exactly that many readiness lines.'},{keywords:['loop','repeat','counter','start'],answer:'The first station is 1. repeat(stations) repeats the block once per station; advance the counter by one each time.'}]
  },
  {
    id:'CODE-504',title:'Pixel Pet Snack Time',track:'coding',grade:'7–8',minutes:20,
    summary:'Help a pretend pixel pet count snack-token energy with a changing input.',requester:'Noel · Pixel-pet caretaker',
    goal:'Print Energy followed by a space and snacks multiplied by 4. Zero snacks means Energy 0.',
    brief:'Our fictional pixel pet receives snack tokens, not real food. Each token adds 4 energy points. Its little program adds 4 just once instead of counting all the tokens. Repair the expression and keep the Energy label.',
    clues:[clue('input','Read the snack tray','snacks is a read-only fixture input. The tray tries 0, 2, and 5 fictional snack tokens.'),clue('energy','Read the pet card','Each snack token adds exactly 4 energy points. No tokens add no energy.'),clue('format','Read the display card','Print one line: Energy, one space, then the total. For two tokens, the display must say Energy 8.')],
    questions:[question('Is this advice about feeding a pet?','No. This is an imaginary pixel pet and made-up snack tokens. It is a coding exercise, not real animal-care advice.'),question('How much energy does a token add?','Each fictional snack token adds 4 energy points. Keep the input variable so the same program works with every tray.')],
    interviewFacts:[{keywords:['snack','token','input','tray'],answer:'The fixture supplies snacks: 0, 2, and 5. Each fictional token adds 4 energy points.'},{keywords:['energy','display','label','output'],answer:'Print Energy, one space, then the total. Two snack tokens produce Energy 8; zero produces Energy 0.'}]
  },
  {
    id:'CODE-505',title:'Arcade Prize Patrol',track:'coding',grade:'9–10',minutes:25,
    summary:'Use fair threshold checks to choose a pretend arcade reward at the exact boundaries.',requester:'Kit · Arcade prize-desk volunteer',
    goal:'Print Try again below 50 points, Sticker from 50 through 99, and Badge for 100 or more.',
    brief:'The pretend arcade desk mixes up prizes at 50 and 100 points. Repair the conditions so every score receives the right message. The points and prizes are fictional; no account, purchase or real reward is involved.',
    clues:[clue('threshold','Read the prize board','Below 50 points: Try again. From 50 through 99: Sticker. At 100 points or more: Badge.'),clue('fixtures','Read the score cards','The checks use points 0, 49, 50, 99, 100, and 140. Both thresholds must be tested.'),clue('format','Read the message card','Print exactly one message per score: Try again, Sticker, or Badge. Keep the capitalization and the space in Try again.')],
    questions:[question('What happens at exactly 50 or 100?','Exactly 50 earns Sticker. Exactly 100 earns Badge. A score of 49 still prints Try again.'),question('Can I change the score to win?','No. points is supplied and read-only. Repair the decisions so the same code handles all the score cards fairly.')],
    interviewFacts:[{keywords:['prize','threshold','boundary','sticker','badge'],answer:'Below 50 prints Try again; 50 through 99 prints Sticker; 100 or more prints Badge.'},{keywords:['point','score','input','fixture'],answer:'The fixture supplies points 0, 49, 50, 99, 100, and 140. Keep points read-only and test the same program on every card.'}]
  },
  {
    id:'CODE-506',title:'Rover Energy Planner',track:'coding',grade:'11–12',minutes:30,
    summary:'Plan a fictional rover trip by accumulating each numbered leg’s energy cost.',requester:'Sol · Rover mission planner',
    goal:'Print one numeric total equal to 1 + 2 + ... + steps. With zero steps, print 0.',
    brief:'A made-up rover trip has steps numbered from 1 through steps. Leg 1 costs 1 energy unit, leg 2 costs 2, and so on. The planner starts at zero and misses the last leg. Fix the loop bounds and accumulate the costs. Nothing controls a real rover.',
    clues:[clue('input','Read the mission cards','steps is supplied and read-only. Test trip lengths are 0, 1, 4, and 6.'),clue('sum','Read the route costs','Start energy at 0. Add each leg’s number once, from 1 through steps. Four legs cost 1 + 2 + 3 + 4 = 10.'),clue('boundary','Inspect an empty trip','A zero-step trip runs no legs and prints 0. Print one numeric total after the loop, not one line per leg.')],
    questions:[question('What are the first and last legs?','The first leg is 1 and the last leg is steps. For four legs, add 1, 2, 3, and 4.'),question('When should the program print?','Print the accumulated energy once after the loop. For a zero-step trip, the untouched total is 0.')],
    interviewFacts:[{keywords:['leg','step','input','fixture','trip'],answer:'The fixture supplies steps 0, 1, 4, and 6. Number the legs 1 through steps; an empty trip has no legs.'},{keywords:['energy','sum','total','accumulat'],answer:'Start the energy total at 0, add each leg number once, then print one numeric total. Four legs cost 10.'}]
  }
];

const definitions = {
  CODE501:{input:'quantity',values:[2,5,0],starter:'let total = quantity + 3;\nprint(total);',expected:value=>[String(value*3)]},
  CODE502:{input:'temperature',values:[18,20,25,30],starter:'if (temperature > 20) {\n  print("Heating");\n} else {\n  print("Cooling");\n}',expected:value=>[value<20?'Heating':value<=25?'Comfortable':'Cooling']},
  CODE503:{input:'stations',values:[1,3,5],starter:'for (let station = 0; station < stations; station++) {\n  console.log("Ready " + station);\n}',expected:value=>Array.from({length:value},(_,index)=>'Ready '+(index+1))},
  CODE504:{input:'snacks',values:[0,2,5],starter:'let energy = snacks + 4;\nconsole.log("Energy " + energy);',expected:value=>['Energy '+value*4]},
  CODE505:{input:'points',values:[0,49,50,99,100,140],starter:'if (points > 100) {\n  console.log("Badge");\n} else if (points > 50) {\n  console.log("Sticker");\n} else {\n  console.log("Try again");\n}',expected:value=>[value<50?'Try again':value<100?'Sticker':'Badge']},
  CODE506:{input:'steps',values:[0,1,4,6],starter:'let energy = 0;\nfor (let leg = 0; leg < steps; leg++) {\n  energy = energy + leg;\n}\nconsole.log(energy);',expected:value=>[String(value*(value+1)/2)]}
};
const pythonStarters={
  CODE501:'total = quantity + 3\nprint(total)',
  CODE502:'if temperature > 20:\n    print("Heating")\nelse:\n    print("Cooling")',
  CODE503:'for station in range(stations):\n    print("Ready", station)',
  CODE504:'energy = snacks + 4\nprint("Energy", energy)',
  CODE505:'if points > 100:\n    print("Badge")\nelif points > 50:\n    print("Sticker")\nelse:\n    print("Try again")',
  CODE506:'energy = 0\nfor leg in range(steps):\n    energy = energy + leg\nprint(energy)'
};
const starterFor=(id,language)=>language==='python'?pythonStarters[key(id)]||'':definitions[key(id)]?.starter||'';

export const supportsCodingLab = id => Object.hasOwn(definitions,key(id));
export const codingFixtureCount = id => definitions[key(id)]?.values.length||0;
class CodeError extends Error { constructor(message,line=1) { super(message);this.line=line; } }
const fail = (message,line) => { throw new CodeError(message,line); };

function tokenize(source,python=false) {
  if (typeof source !== 'string' || source.length > LIMITS.source) fail('Keep the program at or below 4,000 characters.');
  const tokens=[];let index=0,line=1;
  const add=(type,value,startLine=line)=>{tokens.push({type,value,line:startLine});if(tokens.length>LIMITS.tokens) fail('This program has too many tokens. Shorten it before running.',line);};
  while(index<source.length) {
    const char=source[index];
    if (/\s/.test(char)) { if(char==='\n') line++;index++;continue; }
    if(!python&&char==='/'&&source[index+1]==='/'||python&&char==='#') { while(index<source.length && source[index]!=='\n') index++;continue; }
    if(char==='"' || char==="'") {
      const quote=char,startLine=line;let value='',closed=false;index++;
      while(index<source.length) {
        const current=source[index++];
        if(current===quote) {closed=true;break;}
        if(current==='\n' || current==='\r') fail('Close the string on the same line; use \\n for a newline.',startLine);
        if(current==='\\') {
          const escaped=source[index++],allowed={'n':'\n','t':'\t','\\':'\\','"':'"',"'":"'"};
          if(!Object.hasOwn(allowed,escaped)) fail('Supported string escapes are \\n, \\t, quote, and backslash.',startLine);
          value+=allowed[escaped];
        } else value+=current;
        if(value.length>LIMITS.text) fail('Keep each string at or below 300 characters.',startLine);
      }
      if(!closed) fail('This string needs a closing quote.',startLine);
      add('literal',value,startLine);continue;
    }
    const number=source.slice(index).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
    if(number) { const value=Number(number[0]);if(!Number.isFinite(value) || value>1000000) fail('Numbers must be finite and no larger than 1,000,000.',line);add('literal',value);index+=number[0].length;continue; }
    const identifier=source.slice(index).match(/^[A-Za-z_][A-Za-z_0-9]*/);
    if(identifier) {const value=identifier[0];if(value.length>40) fail('Use variable names of 40 characters or fewer.',line);if(forbidden.has(value)) fail('“'+value+'” is outside this practice language. Browser, network, device, and arbitrary JavaScript capabilities are unavailable.',line);add('identifier',value);index+=value.length;continue;}
    const operator=source.slice(index).match(/^(?:===|!==|==|!=|<=|>=|\+\+|--|\/\/|&&|\|\||[+\-*/%!=<>(){};.,:])/);
    if(operator) {if(python&&['===','!==','&&','||','!','++','--','{','}'].includes(operator[0]))fail('Use Python operators and indentation; this JavaScript symbol is unavailable in Python mode.',line);add('operator',operator[0]);index+=operator[0].length;continue;}
    fail('Unsupported character “'+char+'”. Use the practice-language reference below the editor.',line);
  }
  add('end','');return tokens;
}

/** Python indentation becomes only our own parser tokens, never executable JS.
 * Quoted values are already isolated by the lexer before comments or keywords
 * are interpreted, so a string cannot supply statements or capabilities. */
function pythonTokens(source) {
  const raw=tokenize(source,true),lines=new Map(),sourceLines=source.split('\n');
  for(const token of raw){if(token.type==='end')continue;if(!lines.has(token.line))lines.set(token.line,[]);lines.get(token.line).push(token);}
  const output=[],indents=[0];let pending=false;
  const emit=(value,line,type='operator')=>output.push({value,line,type});
  const translated=token=>token.type==='identifier'&&['and','or','not'].includes(token.value)?{...token,type:'operator',value:{and:'&&',or:'||',not:'not'}[token.value]}:token;
  const append=tokens=>{for(const token of tokens)output.push(translated(token));};
  const identifier=token=>token?.type==='identifier'&&!reserved.has(token.value);
  for(const [line,tokens] of lines){
    const rawLine=sourceLines[line-1];if(/^\s*\t/u.test(rawLine))fail('Use spaces, not tabs, for Python indentation.',line);
    const indent=/^ */u.exec(rawLine)[0].length;
    if(pending){if(indent<=indents.at(-1))fail('Indent the statements after the colon.',line);indents.push(indent);if(indents.length>LIMITS.depth)fail('The program is nested too deeply.',line);pending=false;}
    else if(indent>indents.at(-1))fail('Unexpected indentation. Indent only after a block ending with a colon.',line);
    while(indent<indents.at(-1)){indents.pop();emit('}',line);}
    if(indent!==indents.at(-1))fail('Match the indentation of an earlier block.',line);
    const first=tokens[0],header=first.type==='identifier'&&['if','elif','else','for'].includes(first.value);
    if(header){
      if(tokens.at(-1)?.value!==':'||tokens.at(-1).type!=='operator')fail('End this Python block header with a colon.',line);
      if(first.value==='if'||first.value==='elif'){
        if(first.value==='elif')emit('else',line,'identifier');emit('if',line,'identifier');emit('(',line);append(tokens.slice(1,-1));emit(')',line);
      }else if(first.value==='else'){
        if(tokens.length!==2)fail('Use else: on its own line.',line);emit('else',line,'identifier');
      }else{
        if(!identifier(tokens[1])||tokens[2]?.type!=='identifier'||tokens[2]?.value!=='in'||tokens[3]?.type!=='identifier'||tokens[3]?.value!=='range'||tokens[4]?.type!=='operator'||tokens[4]?.value!=='('||tokens.at(-2)?.type!=='operator'||tokens.at(-2)?.value!==')')fail('Use for name in range(stop): or range(start, stop, step).',line);
        const args=[[]];let depth=0;
        for(const token of tokens.slice(5,-2)){
          if(token.type==='operator'&&token.value==='(')depth++;
          if(token.type==='operator'&&token.value===')')depth--;
          if(token.type==='operator'&&token.value===','&&depth===0)args.push([]);else args.at(-1).push(token);
        }
        if(depth!==0||args.length>3||args.some(arg=>!arg.length))fail('range needs one, two, or three numeric arguments.',line);
        emit('rangeLoop',line,'identifier');emit('(',line);output.push(tokens[1]);emit(';',line);
        if(args.length===1)emit(0,line,'literal');else append(args[0]);emit(';',line);append(args.length===1?args[0]:args[1]);emit(';',line);
        if(args.length<3)emit(1,line,'literal');else append(args[2]);emit(')',line);
      }
      emit('{',line);pending=true;
    }else{
      if(identifier(first)&&tokens[1]?.type==='operator'&&tokens[1].value==='=')emit('pyassign',line,'identifier');
      append(tokens);emit(';',line);
    }
    if(output.length>LIMITS.tokens*2)fail('This program has too many tokens. Shorten it before running.',line);
  }
  if(pending)fail('Indent at least one statement after the colon.',raw.at(-1).line);
  while(indents.length>1){indents.pop();emit('}',raw.at(-1).line);}
  emit('',raw.at(-1).line,'end');return output;
}

function parse(source,language='javascript') {
  const python=language==='python',tokens=python?pythonTokens(source):tokenize(source);let position=0,depth=0;
  const peek=()=>tokens[position];
  const take=value=>{if(peek().type!=='literal' && peek().value===value){position++;return true;}return false;};
  const expect=value=>{if(!take(value)) fail('Expected “'+value+'” here.',peek().line);};
  const nest=fn=>{depth++;if(depth>LIMITS.depth) fail('The program is nested too deeply. Simplify its expressions or blocks.',peek().line);const value=fn();depth--;return value;};
  const precedence={'||':1,'&&':2,'==':3,'!=':3,'===':3,'!==':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6,'/':6,'//':6,'%':6};
  function primary() {return nest(()=>{
    const token=peek();
    if(take('(')){const result=expression();expect(')');return result;}
    if(python&&take('not'))return {type:'unary',op:'!',value:expression(3),line:token.line};
    if(take('-') || take('!')) return {type:'unary',op:tokens[position-1].value,value:primary(),line:token.line};
    if(token.type==='literal'){position++;return {type:'literal',value:token.value,line:token.line};}
    if(token.type==='identifier') {
      position++;
      if(python&&token.value==='str'){expect('(');const value=expression();expect(')');return {type:'string',value,line:token.line};}
      if((python?['True','False']:['true','false']).includes(token.value))return {type:'literal',value:token.value===(python?'True':'true'),line:token.line};
      if(reserved.has(token.value))fail('This keyword cannot be used as a variable or function here.',token.line);
      return {type:'variable',name:token.value,line:token.line};
    }
    fail('Expected a number, quoted string, variable, or parenthesized expression.',token.line);
  });}
  function expression(minimum=1) {return nest(()=>{let left=primary();while(peek().type==='operator' && Object.hasOwn(precedence,peek().value) && precedence[peek().value]>=minimum){const op=peek();position++;left={type:'binary',op:op.value,left,right:expression(precedence[op.value]+1),line:op.line};}return left;});}
  function block() {expect('{');const body=statements('}');expect('}');return body;}
  function statement() {return nest(()=>{
    const token=peek();
    if(take(';')) return {type:'empty',line:token.line};
    if(take(python?'pyassign':'let')) {const name=peek();if(name.type!=='identifier'||reserved.has(name.value))fail('Choose a variable name after '+(python?'the assignment':'let')+'.',name.line);position++;expect('=');const value=expression();expect(';');return {type:python?'pyassign':'let',name:name.value,value,line:token.line};}
    if(take('if')) {expect('(');const condition=expression();expect(')');const body=block(),otherwise=take('else')?(peek().value==='if'?[statement()]:block()):[];return {type:'if',condition,body,otherwise,line:token.line};}
    if(!python&&take('repeat')) {expect('(');const count=expression();expect(')');return {type:'repeat',count,body:block(),line:token.line};}
    if(!python&&take('for')) {
      expect('(');expect('let');const name=peek();if(name.type!=='identifier'||reserved.has(name.value))fail('Choose a loop counter after let.',name.line);position++;expect('=');const start=expression();expect(';');const condition=expression();expect(';');
      const updateName=peek();if(updateName.type!=='identifier'||updateName.value!==name.value)fail('Update the same loop counter in the for header.',updateName.line);position++;
      let update;if(take('++')||take('--'))update={type:'binary',op:tokens[position-1].value==='++'?'+':'-',left:{type:'variable',name:name.value,line:token.line},right:{type:'literal',value:1,line:token.line},line:token.line};
      else{expect('=');update=expression();}expect(')');return {type:'for',name:name.value,start,condition,update,body:block(),line:token.line};
    }
    if(python&&take('rangeLoop')) {expect('(');const name=peek();position++;expect(';');const start=expression();expect(';');const stop=expression();expect(';');const step=expression();expect(')');return {type:'range',name:name.value,start,stop,step,body:block(),line:token.line};}
    if(take('print') || !python&&take('console')) {const name=tokens[position-1].value;if(name==='console'){expect('.');expect('log');}expect('(');const values=[expression()];while(python&&take(',')){if(values.length>=8)fail('Use at most eight values in one print.',token.line);values.push(expression());}expect(')');expect(';');return {type:'print',values,line:token.line};}
    if(token.type==='identifier'&&!reserved.has(token.value)) {position++;expect('=');const value=expression();expect(';');return {type:'assign',name:token.value,value,line:token.line};}
    fail(python?'Use assignment, print, if/elif/else, or for-in-range with indented blocks.':'Use let, assignment, print, if/else, bounded for, or legacy repeat. Every simple statement needs a semicolon.',token.line);
  });}
  function statements(until='') {const body=[];while(peek().type!=='end' && peek().value!==until) body.push(statement());return body;}
  const program=statements();if(peek().type!=='end') fail('Unexpected text after the program.',peek().line);return program;
}

/** A custom interpreter only: source is never passed to a JavaScript execution API. */
export function executeCoding(source,inputs={},language='javascript') {
  const output=[];let steps=0;
  try {
    if(!CODING_LANGUAGES.some(item=>item.id===language))fail('Choose the JavaScript subset or Python subset.');
    const python=language==='python',program=parse(source,language),variables=new Map(),inputNames=new Set();
    if(!record(inputs)) fail('This fixture has invalid inputs.');
    for(const [name,value] of Object.entries(inputs)) {if(!/^[A-Za-z_][A-Za-z_0-9]{0,39}$/.test(name) || forbidden.has(name)||reserved.has(name) || !['string','number','boolean'].includes(typeof value) || typeof value==='number' && (!Number.isFinite(value) || Math.abs(value)>1000000) || typeof value==='string' && value.length>LIMITS.text) fail('This fixture has invalid inputs.');variables.set(name,value);inputNames.add(name);}
    const tick=line=>{steps++;if(steps>LIMITS.steps) fail('Execution stopped at the 1,000-step limit. Reduce the repeat count or simplify nested loops.',line);};
    const bounded=(value,line)=>{if(typeof value==='number' && (!Number.isFinite(value) || Math.abs(value)>1000000)) fail('The calculation must stay finite and within ±1,000,000.',line);if(typeof value==='string' && value.length>LIMITS.text) fail('Text grew beyond 300 characters. Shorten the output.',line);return value;};
    const text=value=>python&&typeof value==='boolean'?(value?'True':'False'):String(value);
    function store(name,value,line,{declare=false,implicit=false}={}){
      if(inputNames.has(name))fail('“'+name+'” is a read-only fixture input. Store your result in another variable.',line);
      if(declare&&variables.has(name))fail('“'+name+'” is already declared. Assign a new value without let.',line);
      if(!declare&&!implicit&&!variables.has(name))fail('Declare “'+name+'” with let before assigning it.',line);
      if(variables.size>=60&&!variables.has(name))fail('Use no more than 60 variables.',line);
      variables.set(name,bounded(value,line));
    }
    function evaluate(node) {
      tick(node.line);
      if(node.type==='literal') return node.value;
      if(node.type==='string')return bounded(text(evaluate(node.value)),node.line);
      if(node.type==='variable') {if(!variables.has(node.name)) fail('Unknown variable “'+node.name+'”. Declare it with let, or use the supplied fixture input.',node.line);return variables.get(node.name);}
      if(node.type==='unary') {const value=evaluate(node.value);if(node.op==='!') return !value;if(typeof value!=='number') fail('Unary minus needs a number.',node.line);return bounded(-value,node.line);}
      const left=evaluate(node.left);
      if(node.op==='&&') return left?evaluate(node.right):left;
      if(node.op==='||') return left?left:evaluate(node.right);
      const right=evaluate(node.right);
      if(['==','==='].includes(node.op)) return left===right;
      if(['!=','!=='].includes(node.op)) return left!==right;
      if(node.op==='+' && (typeof left==='string' || typeof right==='string')) {
        if(python&&(typeof left!=='string'||typeof right!=='string'))fail('Python text + needs two strings. Use str(number) or print("Label", number).',node.line);
        return bounded(text(left)+text(right),node.line);
      }
      if(typeof left!=='number' || typeof right!=='number') fail('This operator needs two numbers. Comparisons and arithmetic do not convert text to numbers.',node.line);
      if((node.op==='/' || node.op==='//'||node.op==='%') && right===0) fail('Cannot divide by zero.',node.line);
      const operations={'+':()=>left+right,'-':()=>left-right,'*':()=>left*right,'/':()=>left/right,'//':()=>Math.floor(left/right),'%':()=>python?((left%right)+right)%right:left%right,'<':()=>left<right,'>':()=>left>right,'<=':()=>left<=right,'>=':()=>left>=right};
      return bounded(operations[node.op](),node.line);
    }
    function run(body) {for(const node of body) {
      tick(node.line);
      if(node.type==='empty') continue;
      if(node.type==='let'||node.type==='assign'||node.type==='pyassign')store(node.name,evaluate(node.value),node.line,{declare:node.type==='let',implicit:node.type==='pyassign'});
      else if(node.type==='print') {if(output.length>=LIMITS.output) fail('Output stopped at 20 lines. Check your loop count.',node.line);const value=bounded(node.values.map(value=>text(evaluate(value))).join(' '),node.line);if(value.includes('\n')) fail('Use a separate print statement for each output line.',node.line);output.push(value);}
      else if(node.type==='if') run(evaluate(node.condition)?node.body:node.otherwise);
      else if(node.type==='repeat') {const count=evaluate(node.count);if(!Number.isSafeInteger(count) || count<0 || count>LIMITS.repeat) fail('repeat needs a whole-number count from 0 through 50.',node.line);for(let index=0;index<count;index++) {tick(node.line);run(node.body);}}
      else if(node.type==='for'){
        const existed=variables.has(node.name),previous=variables.get(node.name),start=evaluate(node.start);let count=0;
        store(node.name,start,node.line,{implicit:true});
        try{while(evaluate(node.condition)){
          tick(node.line);if(++count>LIMITS.repeat)fail('A for loop may run at most 50 times. Check its stop condition and step.',node.line);
          run(node.body);store(node.name,evaluate(node.update),node.line);
        }}finally{if(existed)variables.set(node.name,previous);else variables.delete(node.name);}
      }else if(node.type==='range'){
        if(inputNames.has(node.name))fail('“'+node.name+'” is a read-only fixture input. Choose another loop variable.',node.line);
        const start=evaluate(node.start),stop=evaluate(node.stop),step=evaluate(node.step);
        if(![start,stop,step].every(Number.isSafeInteger)||step===0)fail('range needs whole numbers and a nonzero step.',node.line);
        const count=Math.max(0,Math.ceil((stop-start)/step));
        if(count>LIMITS.repeat)fail('A range loop may run at most 50 times. Shorten its range.',node.line);
        for(let index=0;index<count;index++){tick(node.line);store(node.name,start+index*step,node.line,{implicit:true});run(node.body);}
      }
    }}
    run(program);return {ok:true,output,error:null,steps};
  } catch(error) {return {ok:false,output,error:{line:error instanceof CodeError?error.line:1,message:error instanceof CodeError?error.message:'The program could not run. Simplify it and try again.'},steps};}
}

function fixtureRuns(id,code,language='javascript') {
  const definition=definitions[key(id)];if(!definition) return [];
  return definition.values.map(value=>{const expected=definition.expected(value),run=executeCoding(code,{[definition.input]:value},language);return {input:definition.input,value,expected,...run,passed:run.ok && run.output.length===expected.length && run.output.every((line,index)=>line===expected[index])};});
}
function matrix(id,code,language='javascript') {return fixtureRuns(id,code,language).map(run=>({label:run.input+' = '+run.value+': '+(run.error?'line '+run.error.line+' — '+run.error.message:run.passed?'output matches the request':'output does not match the request'),ok:run.passed}));}

export function initialCodingState(id) {
  return {tested:false,results:[],workspaceEdits:0,checkRuns:0,language:'javascript',languageAtRun:'',code:starterFor(id,'javascript'),sourceAtRun:'',fixtureIndex:0,output:[],errors:[]};
}
export function normalizeCodingState(id,saved) {
  const state=initialCodingState(id);if(!record(saved)) return state;
  state.language=languageId(saved.language);
  if(typeof saved.code==='string') state.code=saved.code.slice(0,LIMITS.source);
  for(const name of ['workspaceEdits','checkRuns']) if(Number.isSafeInteger(saved[name]) && saved[name]>=0) state[name]=Math.min(saved[name],1000000);
  if(Number.isSafeInteger(saved.fixtureIndex) && saved.fixtureIndex>=0 && saved.fixtureIndex<(definitions[key(id)]?.values.length || 0)) state.fixtureIndex=saved.fixtureIndex;
  if(typeof saved.sourceAtRun==='string') state.sourceAtRun=saved.sourceAtRun.slice(0,LIMITS.source);
  state.languageAtRun=saved.languageAtRun===undefined&&saved.language===undefined&&saved.tested===true?'javascript':CODING_LANGUAGES.some(item=>item.id===saved.languageAtRun)?saved.languageAtRun:'';
  state.tested=saved.tested===true&&state.sourceAtRun===state.code&&state.languageAtRun===state.language;
  if(state.tested) {
    const runs=fixtureRuns(id,state.code,state.language),selected=runs[state.fixtureIndex];
    state.results=matrix(id,state.code,state.language);state.output=selected?.output || [];state.errors=selected?.error?[selected.error]:[];
  }
  return state;
}
export function applyCodingAction(id,previous,action,value) {
  const state=normalizeCodingState(id,previous),definition=definitions[key(id)];
  if(!definition) return {state,message:'This coding case is unavailable.',kind:'warning'};
  if(action==='inspect-command') return {state,message:codingDiagnostic(id,state,record(value)?value.command:value),kind:'info'};
  const invalidate=()=>{state.tested=false;state.sourceAtRun='';state.languageAtRun='';state.results=[];state.output=[];state.errors=[];};
  const save=code=>{if(typeof code!=='string' || code.length>LIMITS.source) return false;if(code!==state.code){state.code=code;state.workspaceEdits++;invalidate();}return true;};
  if(action==='set-language'){
    if(!record(value)||!CODING_LANGUAGES.some(item=>item.id===value.language)||!save(value.code))return {state,message:'Choose a supported language and keep code within 4,000 characters.',kind:'warning'};
    if(state.language!==value.language){state.language=value.language;state.workspaceEdits++;invalidate();}
    return {state,message:(state.language==='python'?'Python':'JavaScript')+' subset selected. Your draft is kept, not translated. Reset starter loads an example for this syntax.',kind:'info'};
  }
  if(action==='save-code') {if(!record(value) || !save(value.code)) return {state,message:'Keep the program at or below 4,000 characters.',kind:'warning'};return {state,message:'Program saved in the current lab session. Run all fixtures to test this version.',kind:'info'};}
  if(action==='reset-code') {save(starterFor(id,state.language));return {state,message:'Starter program restored for the selected language. Your previous passing result no longer counts for this source.',kind:'info'};}
  if(action==='inspect-fixture') {const index=record(value)?value.index:value;if(Number.isSafeInteger(index) && index>=0 && index<definition.values.length) state.fixtureIndex=index;return {state:normalizeCodingState(id,state),message:'Viewing fixture '+definition.input+' = '+definition.values[state.fixtureIndex]+'. No code or device settings changed.',kind:'info'};}
  if(action==='run-check') {
    if(value!==undefined && (!record(value) || !save(value.code))) return {state,message:'Keep the program at or below 4,000 characters.',kind:'warning'};
    state.checkRuns++;state.tested=true;state.sourceAtRun=state.code;state.languageAtRun=state.language;
    const next=normalizeCodingState(id,state),passed=next.results.filter(result=>result.ok).length;
    return {state:next,message:passed+' of '+next.results.length+' coding fixtures passed. '+(passed===next.results.length?'Check the original task and explain your evidence.':'Read the actual and expected output, then revise and rerun.'),kind:passed===next.results.length?'success':'warning'};
  }
  return {state,message:'Use Save code, Run all fixtures, or Reset starter in this practice editor.',kind:'info'};
}
export function verifyCoding(id,saved) {
  const state=normalizeCodingState(id,saved),results=matrix(id,state.code,state.language);
  const ok=state.tested&&state.languageAtRun===state.language&&state.sourceAtRun===state.code&&results.length>0&&results.every(result=>result.ok);
  return {ok,message:ok?'The current program passed every input fixture. Explain why the code handles the changing inputs.':state.tested?'One or more fixture results differ from the request. Inspect the output and run a revised program.':'Run all fixtures for the current saved program before checking the original task.'};
}
export function getCodingMission(id,saved) {
  const state=normalizeCodingState(id,saved),results=matrix(id,state.code,state.language),passed=state.tested?results.filter(result=>result.ok).length:0,complete=state.tested && passed===results.length && results.length>0;
  return {stage:complete?'Verified':state.tested?'Troubleshoot':state.workspaceEdits?'Ready to test':'Investigate',tested:state.tested,passed,total:results.length,complete,currentCheck:results.findIndex(result=>!result.ok),attempts:state.checkRuns,next:complete?'Choose Check & explain. Verify the original task and explain how the fixtures support your reasoning.':state.tested?'Compare actual and expected output. Change one part of your program, then run all fixtures again.':'Read the input contract, edit the starter program, and run all fixtures.',hints:['Use the supplied input variable rather than a fixed answer.','Every fixture runs the same program with a different input. Passing one fixture is not enough.','The language reference below the editor explains the supported statements and limits.']};
}

/** Fixed read-only diagnostics, never a shell or a second code-execution entry point. */
export function codingDiagnostic(id,saved,command) {
  const definition=definitions[key(id)];if(!definition) return 'This coding case is unavailable.';
  const input=typeof command==='string'?command.trim().toLowerCase():'';
  if(input==='help') return 'Practice diagnostics: help, status, fixtures. Edit code in the editor and choose Run all fixtures to execute the documented practice language. This is not a system shell.';
  if(input==='fixtures') return 'Read-only input '+definition.input+': '+definition.values.join(', ')+'. Every fixture runs the same saved program. Expected output appears beside the editor.';
  if(input==='status') {const mission=getCodingMission(id,saved);return mission.stage+' · '+mission.passed+'/'+mission.total+' fixtures passing · '+mission.attempts+' test runs. '+mission.next;}
  return 'Unknown practice diagnostic. Type help, status, or fixtures. Device, network, file, and browser commands are unavailable.';
}

const codingGuide='<section class="ws-start code-start" aria-label="How to use this coding lab"><h3>Use the code editor <span>Read → edit → run</span></h3><div class="ws-start-content"><ol><li><b>Read the input and edit.</b><span>A fixture is a practice test case. Choose a syntax, read its input and change Your code.</span></li><li><b>Run your code.</b><span>Choose “Run all fixtures” to save and test every input. “Save code” keeps a draft without testing.</span></li><li><b>Compare.</b><span>Read actual and expected output. Try a playful extra input, then fix one issue and rerun the official fixtures.</span></li></ol><p>Save and run do not submit work to a teacher. Next, open 3. Check &amp; explain. Use fictional practice text only.</p></div></section>';
const playBounds=definition=>({minimum:definition.input==='temperature'?-50:0,maximum:['stations','steps'].includes(definition.input)?20:definition.input==='points'?200:100});
function storyCard(id){
  const cards={
    CODE504:{title:'A tiny pet. A changing snack tray.',caption:'Count made-up snack tokens and give your pixel friend a clear energy readout.',art:'<path d="M37 20V8h18v12h50V8h18v56H37z" fill="#77dcca"/><rect x="47" y="29" width="13" height="13" fill="#0b202e"/><rect x="99" y="29" width="13" height="13" fill="#0b202e"/><path d="M68 51h23v7H68z" fill="#0b202e"/><rect x="14" y="54" width="12" height="12" fill="#f3ce85"/><rect x="135" y="54" width="12" height="12" fill="#f3ce85"/>'},
    CODE505:{title:'Fair prizes at every boundary.',caption:'Your code is the pretend prize desk. Test one point below, at, and above each threshold.',art:'<rect x="34" y="7" width="92" height="64" rx="8" fill="#264c62" stroke="#8be8d7" stroke-width="3"/><rect x="46" y="17" width="68" height="29" fill="#0b202e"/><path d="M80 20l5 8 10 2-7 7 1 6-9-4-9 4 1-6-7-7 10-2z" fill="#f3ce85"/><path d="M49 59h19m-9-9v18" stroke="#8be8d7" stroke-width="4"/><circle cx="103" cy="59" r="6" fill="#e5afda"/>'},
    CODE506:{title:'Plan the journey, one leg at a time.',caption:'Build an energy total for a fictional rover, including the empty trip. No real rover is connected.',art:'<path d="M20 65h120" stroke="#607f94" stroke-width="3"/><path d="M40 43h66v18H40z" fill="#77dcca"/><circle cx="51" cy="63" r="10" fill="#344f6c" stroke="#c4e9ef" stroke-width="3"/><circle cx="97" cy="63" r="10" fill="#344f6c" stroke="#c4e9ef" stroke-width="3"/><path d="M81 43V23l17-9m-17 9-17-7" stroke="#c4e9ef" stroke-width="4"/><circle cx="100" cy="12" r="5" fill="#f3ce85"/><path d="M124 9v12m-6-6h12M22 22v10m-5-5h10" stroke="#e5afda" stroke-width="2"/>'}
  };
  const card=cards[key(id)];return card?'<figure class="code-story-card"><svg viewBox="0 0 160 80" aria-hidden="true" focusable="false">'+card.art+'</svg><figcaption><strong>'+esc(card.title)+'</strong><p>'+esc(card.caption)+'</p></figcaption></figure>':'';
}

function languageReference(language) {
  const python=language==='python';
  const sample=python?'score = 4\nscore = score + 1\nprint("Score", score)\nif score > 3:\n    print("Above three")\nelif score == 3:\n    print("Exactly three")\nelse:\n    print("Below three")\nfor number in range(1, 4):\n    print("Practice", number)':
    'let score = 4;\nscore = score + 1;\nconsole.log("Score " + score);\nif (score > 3) {\n  console.log("Above three");\n} else {\n  console.log("Three or less");\n}\nfor (let number = 1; number <= 3; number++) {\n  console.log("Practice " + number);\n}';
  return '<p>'+ (python?'Use spaces for indentation and a colon after if, elif, else, and for headers. Assignment creates a variable. range(stop), range(start, stop), and range(start, stop, step) exclude the stop value. Use print("Label", number) or str(number) to combine text and numbers.':'Use semicolons after simple statements and braces around blocks. for requires a let counter, a condition, and an update of that same counter (counter++, counter--, or counter = expression). Its counter is local to that loop. console.log(value) and the print(value) helper both show output.')+'</p><pre tabindex="0" role="region" aria-label="Language reference example"><code>'+esc(sample)+'</code></pre><p>'+ (python?'Supported: numbers, strings, True/False, assignment, print (up to eight values), str, arithmetic + - * / // %, comparisons, and/or/not, # comments, decisions and bounded for-in-range. Chained comparisons, collections, functions, imports, input(), files and arbitrary calls are unavailable.':'Supported: numbers, strings, booleans, let, assignment, parentheses, + - * / %, comparisons, && || !, // comments, if/else-if/else, and bounded for. Legacy repeat(count) is a teaching extension, not JavaScript syntax. Other variables share program scope; do not redeclare them inside repeating blocks. Arrays, objects, functions, imports and while are unavailable.')+'</p><p>Both modes are small custom interpreters, not full JavaScript or Python runtimes. Strict primitive types keep arithmetic predictable; some full-language features and coercions are intentionally absent. Limits: 4,000 source characters, 1,000 source tokens, 1,000 execution steps, 20 output lines, 300 characters per output/string, 60 variables and at most 50 iterations per loop. Nested loops can hit the step limit sooner. Fixture inputs are read-only.</p>';
}

/** Browser-facing output is escaped or written as text. No host execution API. */
export function renderCoding(root,scenario,saved,onAction) {
  const restoreView=captureWorkspaceView(root,scenario.id);
  const state=normalizeCodingState(scenario.id,saved),definition=definitions[key(scenario.id)];
  if(!definition){root.textContent='This coding case is unavailable.';return;}
  const language=CODING_LANGUAGES.find(item=>item.id===state.language),mission=getCodingMission(scenario.id,state);
  const runs=state.tested?fixtureRuns(scenario.id,state.code,state.language):[],selected=runs[state.fixtureIndex],expected=definition.expected(definition.values[state.fixtureIndex]);
  const {minimum,maximum}=playBounds(definition);
  root.innerHTML='<section class="code-lab" aria-label="Coding simulation"><header class="code-lab-bar"><span aria-hidden="true">● ● ●</span><strong>CODE STUDIO / '+esc(scenario.id)+'</strong><span>ON-DEVICE PRACTICE</span></header><div class="code-lab-content">'+
    '<details class="workspace-help"><summary>Editor help</summary>'+codingGuide+'</details><section class="code-mission" aria-label="Current mission progress"><span class="code-eyebrow">YOUR NEXT STEP · '+esc(mission.stage)+'</span><p>'+esc(mission.next)+'</p><progress value="'+mission.passed+'" max="'+(mission.total||1)+'" aria-label="Coding fixtures passing">'+mission.passed+' of '+mission.total+'</progress><p>'+(state.tested?mission.passed+' / '+mission.total+' fixtures passing':'No test yet')+' · '+mission.attempts+' test runs</p></section>'+
    '<p class="code-scope"><b>Choose your coding style:</b> bounded JavaScript and Python subsets run in our own interpreter on this device. No full runtime, installation, network, packages, real files or browser APIs. Use fictional practice text only.</p>'+storyCard(scenario.id)+
    '<div class="code-workspace"><form data-code-form class="code-editor-panel"><label for="coding-language"><b>Practice language</b></label><select id="coding-language" data-code-language aria-describedby="code-language-help">'+CODING_LANGUAGES.map(item=>'<option value="'+item.id+'"'+(item.id===state.language?' selected':'')+'>'+item.label+'</option>').join('')+'</select><p id="code-language-help">Switching keeps your draft and clears old test results. It does not translate code. Reset starter replaces the draft with a '+esc(language.label)+' example.</p>'+
    '<label for="coding-editor"><b>Your code</b><small>Fixture input: <code>'+esc(definition.input)+'</code> · 4,000 characters maximum</small></label><textarea id="coding-editor" name="code" rows="14" maxlength="4000" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="code-save-help code-language-help code-program-error">'+esc(state.code)+'</textarea><p id="code-save-help">Run all fixtures and Run hypothesis test both save and test the editor’s current text. Changing lab sections keeps your editor in place.</p><div class="code-actions"><button type="submit">Save code</button><button type="button" data-code-run>Run all fixtures</button><button type="button" data-code-reset>Reset starter</button></div><p data-code-status role="status"></p></form>'+
    '<section class="code-console-panel"><label for="code-fixture"><b>Inspect a test fixture</b></label><select id="code-fixture" data-code-fixture>'+definition.values.map((value,index)=>'<option value="'+index+'"'+(index===state.fixtureIndex?' selected':'')+'>'+esc(definition.input)+' = '+value+'</option>').join('')+'</select><h3>Expected output</h3><pre class="code-console code-expected" tabindex="0" role="region" aria-label="Expected program output">'+esc(expected.join('\n'))+'</pre><h3>Actual output</h3><pre class="code-console" data-code-output tabindex="0" role="region" aria-label="Program output"></pre><p id="code-program-error" data-code-error role="status" aria-atomic="true" class="code-error"></p><ul class="code-fixture-results">'+(state.tested?state.results.map(result=>'<li class="'+(result.ok?'code-pass':'code-fail')+'"><span>'+(result.ok?'PASS':'CHECK')+'</span> '+esc(result.label)+'</li>').join(''):'<li>Run the program to see results for every fixture.</li>')+'</ul>'+
    '<details class="code-play"><summary>Play with another input</summary><p id="code-play-help">Try the current draft with a made-up number. This extra run stays in this panel and cannot pass the investigation’s official fixtures.</p><label for="code-play-input">Your '+esc(definition.input)+'</label><input id="code-play-input" data-code-play-input type="number" min="'+minimum+'" max="'+maximum+'" step="1" value="'+definition.values[state.fixtureIndex]+'" aria-describedby="code-play-help code-play-result"><button type="button" data-code-play>Try my input</button><pre id="code-play-result" class="code-console" data-code-play-output tabindex="0" role="status" aria-live="polite" aria-label="Extra practice output">Your extra output will appear here.</pre></details></section></div>'+
    '<details class="code-reference"><summary>'+esc(language.label)+' reference & examples</summary><div>'+languageReference(state.language)+'</div></details></div></section>';
  root.querySelector('[data-code-output]').textContent=state.tested?(selected?.output.join('\n')||'(No output)'):'Run all fixtures to see this program’s output.';
  root.querySelector('[data-code-error]').textContent=selected?.error?'Line '+selected.error.line+': '+selected.error.message:'';
  const editor=root.querySelector('[name="code"]'),draft=()=>({code:editor.value});
  if(selected?.error)editor.setAttribute?.('aria-invalid','true');
  root.querySelector('[data-code-form]').addEventListener('submit',event=>{event.preventDefault();onAction('save-code',draft());});
  root.querySelector('[data-code-run]').addEventListener('click',()=>onAction('run-check',draft()));
  root.querySelector('[data-code-reset]').addEventListener('click',()=>onAction('reset-code'));
  root.querySelector('[data-code-language]').addEventListener('change',event=>onAction('set-language',{language:event.target.value,code:editor.value}));
  root.querySelector('[data-code-fixture]').addEventListener('change',event=>{const index=Number(event.target.value),current=draft();if(current.code!==state.code)onAction('save-code',current);onAction('inspect-fixture',{index});});
  root.querySelector('[data-code-play]').addEventListener('click',()=>{
    const field=root.querySelector('[data-code-play-input]'),value=Number(field.value),output=root.querySelector('[data-code-play-output]');
    if(!field.value.trim()||!Number.isSafeInteger(value)||value<minimum||value>maximum){field.setAttribute?.('aria-invalid','true');output.textContent='Choose a whole number from '+minimum+' through '+maximum+'.';return;}
    field.removeAttribute?.('aria-invalid');
    const result=executeCoding(editor.value,{[definition.input]:value},state.language);
    output.textContent=result.ok?(result.output.join('\n')||'(No output)'):'Line '+result.error.line+': '+result.error.message;
  });
  editor.addEventListener('input',()=>{
    const changed=editor.value!==state.code;
    if(changed||!selected?.error)editor.removeAttribute?.('aria-invalid');else editor.setAttribute?.('aria-invalid','true');
    root.querySelector('[data-code-status]').textContent=changed?'Unsaved edits. Save code or run all fixtures to test this version.':'Editor matches the saved program.';
  });
  restoreView();
}
