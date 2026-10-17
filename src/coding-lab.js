const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const key = id => typeof id === 'string' ? id.replaceAll('-', '').toUpperCase() : '';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const LIMITS = Object.freeze({source:4000,tokens:1000,steps:1000,output:20,text:300,repeat:50,depth:24});
const forbidden = new Set(['__proto__','prototype','constructor','eval','Function','document','window','globalThis','fetch','import','require','process','localStorage','sessionStorage','location','XMLHttpRequest','WebSocket','Worker','navigator','indexedDB','this','new','while','for','function','class','async','await']);
const clue = (id,label,text) => ({id,label,text});
const question = (label,answer) => ({label,answer});

export const CODING_SCENARIOS = [
  {
    id:'CODE-501',title:'The Supply Calculator',track:'coding',grade:'7–8',minutes:20,
    summary:'Repair a variable expression and test it with different input quantities.',requester:'Virtual lab coordinator · Supply desk',
    goal:'Print the total cost: the supplied quantity multiplied by 3 credits per kit.',
    brief:'The supply desk calculator adds the kit price to the quantity. Change the program so every supplied quantity produces the correct total. This editor uses a small practice language, not full JavaScript.',
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
    brief:'The readiness checklist starts counting at zero. Repair its counter so every supplied room size produces exactly one numbered line per station. repeat(count) is a bounded classroom-language loop, not JavaScript syntax.',
    clues:[clue('input','Read the deployment sheet','stations is supplied by the test fixture. Test room sizes are 1, 3, and 5.'),clue('sequence','Inspect the required checklist','A room with three stations needs Ready 1, Ready 2, and Ready 3 on separate lines. Do not print Ready 0 or an extra line.'),clue('loop','Read the loop card','repeat(stations) runs its block once per station. Start a counter at 1 and advance it once per iteration.')],
    questions:[question('What should the first line be?','The first line is Ready 1. A three-station room ends at Ready 3, with three lines total.'),question('How does repeat work?','repeat(count) executes the braced block count times. Counts must be whole numbers from 0 through 50. The simulator also limits total execution steps.')],
    interviewFacts:[{keywords:['station','room','fixture','input'],answer:'The supplied stations count changes between 1, 3, and 5. Print exactly that many readiness lines.'},{keywords:['loop','repeat','counter','start'],answer:'The first station is 1. repeat(stations) repeats the block once per station; advance the counter by one each time.'}]
  }
];

const definitions = {
  CODE501:{input:'quantity',values:[2,5,0],starter:'let total = quantity + 3;\nprint(total);',expected:value=>[String(value*3)]},
  CODE502:{input:'temperature',values:[18,20,25,30],starter:'if (temperature > 20) {\n  print("Heating");\n} else {\n  print("Cooling");\n}',expected:value=>[value<20?'Heating':value<=25?'Comfortable':'Cooling']},
  CODE503:{input:'stations',values:[1,3,5],starter:'let station = 0;\nrepeat (stations) {\n  print("Ready " + station);\n  station = station + 1;\n}',expected:value=>Array.from({length:value},(_,index)=>'Ready '+(index+1))}
};

export const supportsCodingLab = id => Object.hasOwn(definitions,key(id));
class CodeError extends Error { constructor(message,line=1) { super(message);this.line=line; } }
const fail = (message,line) => { throw new CodeError(message,line); };

function tokenize(source) {
  if (typeof source !== 'string' || source.length > LIMITS.source) fail('Keep the program at or below 4,000 characters.');
  const tokens=[];let index=0,line=1;
  const add=(type,value,startLine=line)=>{tokens.push({type,value,line:startLine});if(tokens.length>LIMITS.tokens) fail('This program has too many tokens. Shorten it before running.',line);};
  while(index<source.length) {
    const char=source[index];
    if (/\s/.test(char)) { if(char==='\n') line++;index++;continue; }
    if(char==='/' && source[index+1]==='/') { while(index<source.length && source[index]!=='\n') index++;continue; }
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
    const operator=source.slice(index).match(/^(?:===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%!=<>(){};.,])/);
    if(operator) {add('operator',operator[0]);index+=operator[0].length;continue;}
    fail('Unsupported character “'+char+'”. Use the practice-language reference below the editor.',line);
  }
  add('end','');return tokens;
}

function parse(source) {
  const tokens=tokenize(source);let position=0,depth=0;
  const peek=()=>tokens[position];
  const take=value=>{if(peek().type!=='literal' && peek().value===value){position++;return true;}return false;};
  const expect=value=>{if(!take(value)) fail('Expected “'+value+'” here.',peek().line);};
  const nest=fn=>{depth++;if(depth>LIMITS.depth) fail('The program is nested too deeply. Simplify its expressions or blocks.',peek().line);const value=fn();depth--;return value;};
  const precedence={'||':1,'&&':2,'==':3,'!=':3,'===':3,'!==':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
  function primary() {return nest(()=>{
    const token=peek();
    if(take('(')){const result=expression();expect(')');return result;}
    if(take('-') || take('!')) return {type:'unary',op:tokens[position-1].value,value:primary(),line:token.line};
    if(token.type==='literal'){position++;return {type:'literal',value:token.value,line:token.line};}
    if(token.type==='identifier') {position++;if(token.value==='true' || token.value==='false') return {type:'literal',value:token.value==='true',line:token.line};return {type:'variable',name:token.value,line:token.line};}
    fail('Expected a number, quoted string, variable, or parenthesized expression.',token.line);
  });}
  function expression(minimum=1) {return nest(()=>{let left=primary();while(peek().type==='operator' && Object.hasOwn(precedence,peek().value) && precedence[peek().value]>=minimum){const op=peek();position++;left={type:'binary',op:op.value,left,right:expression(precedence[op.value]+1),line:op.line};}return left;});}
  function block() {expect('{');const body=statements('}');expect('}');return body;}
  function statement() {return nest(()=>{
    const token=peek();
    if(take(';')) return {type:'empty',line:token.line};
    if(take('let')) {const name=peek();if(name.type!=='identifier' || ['let','if','else','repeat','print','console','true','false'].includes(name.value)) fail('Choose a variable name after let.',name.line);position++;expect('=');const value=expression();expect(';');return {type:'let',name:name.value,value,line:token.line};}
    if(take('if')) {expect('(');const condition=expression();expect(')');const body=block(),otherwise=take('else')?block():[];return {type:'if',condition,body,otherwise,line:token.line};}
    if(take('repeat')) {expect('(');const count=expression();expect(')');return {type:'repeat',count,body:block(),line:token.line};}
    if(take('print') || take('console')) {const name=tokens[position-1].value;if(name==='console'){expect('.');expect('log');}expect('(');const value=expression();expect(')');expect(';');return {type:'print',value,line:token.line};}
    if(token.type==='identifier') {position++;expect('=');const value=expression();expect(';');return {type:'assign',name:token.value,value,line:token.line};}
    fail('Use let, assignment, print, if/else, or repeat. Every simple statement needs a semicolon.',token.line);
  });}
  function statements(until='') {const body=[];while(peek().type!=='end' && peek().value!==until) body.push(statement());return body;}
  const program=statements();if(peek().type!=='end') fail('Unexpected text after the program.',peek().line);return program;
}

/** A custom interpreter only: source is never passed to a JavaScript execution API. */
export function executeCoding(source,inputs={}) {
  const output=[];let steps=0;
  try {
    const program=parse(source),variables=new Map(),inputNames=new Set();
    if(!record(inputs)) fail('This fixture has invalid inputs.');
    for(const [name,value] of Object.entries(inputs)) {if(!/^[A-Za-z_][A-Za-z_0-9]{0,39}$/.test(name) || forbidden.has(name) || !['string','number','boolean'].includes(typeof value) || typeof value==='number' && (!Number.isFinite(value) || Math.abs(value)>1000000) || typeof value==='string' && value.length>LIMITS.text) fail('This fixture has invalid inputs.');variables.set(name,value);inputNames.add(name);}
    const tick=line=>{steps++;if(steps>LIMITS.steps) fail('Execution stopped at the 1,000-step limit. Reduce the repeat count or simplify nested loops.',line);};
    const bounded=(value,line)=>{if(typeof value==='number' && (!Number.isFinite(value) || Math.abs(value)>1000000)) fail('The calculation must stay finite and within ±1,000,000.',line);if(typeof value==='string' && value.length>LIMITS.text) fail('Text grew beyond 300 characters. Shorten the output.',line);return value;};
    function evaluate(node) {
      tick(node.line);
      if(node.type==='literal') return node.value;
      if(node.type==='variable') {if(!variables.has(node.name)) fail('Unknown variable “'+node.name+'”. Declare it with let, or use the supplied fixture input.',node.line);return variables.get(node.name);}
      if(node.type==='unary') {const value=evaluate(node.value);if(node.op==='!') return !value;if(typeof value!=='number') fail('Unary minus needs a number.',node.line);return bounded(-value,node.line);}
      const left=evaluate(node.left);
      if(node.op==='&&') return left?evaluate(node.right):left;
      if(node.op==='||') return left?left:evaluate(node.right);
      const right=evaluate(node.right);
      if(['==','==='].includes(node.op)) return left===right;
      if(['!=','!=='].includes(node.op)) return left!==right;
      if(node.op==='+' && (typeof left==='string' || typeof right==='string')) return bounded(String(left)+String(right),node.line);
      if(typeof left!=='number' || typeof right!=='number') fail('This operator needs two numbers. Comparisons and arithmetic do not convert text to numbers.',node.line);
      if((node.op==='/' || node.op==='%') && right===0) fail('Cannot divide by zero.',node.line);
      const operations={'+':()=>left+right,'-':()=>left-right,'*':()=>left*right,'/':()=>left/right,'%':()=>left%right,'<':()=>left<right,'>':()=>left>right,'<=':()=>left<=right,'>=':()=>left>=right};
      return bounded(operations[node.op](),node.line);
    }
    function run(body) {for(const node of body) {
      tick(node.line);
      if(node.type==='empty') continue;
      if(node.type==='let' || node.type==='assign') {
        if(inputNames.has(node.name)) fail('“'+node.name+'” is a read-only fixture input. Store your result in another variable.',node.line);
        if(node.type==='let' && variables.has(node.name)) fail('“'+node.name+'” is already declared. Assign a new value without let.',node.line);
        if(node.type==='assign' && !variables.has(node.name)) fail('Declare “'+node.name+'” with let before assigning it.',node.line);
        if(variables.size>=60 && !variables.has(node.name)) fail('Use no more than 60 variables.',node.line);
        variables.set(node.name,evaluate(node.value));
      } else if(node.type==='print') {if(output.length>=LIMITS.output) fail('Output stopped at 20 lines. Check your loop count.',node.line);const value=String(evaluate(node.value));if(value.includes('\n')) fail('Use a separate print statement for each output line.',node.line);output.push(value);}
      else if(node.type==='if') run(evaluate(node.condition)?node.body:node.otherwise);
      else if(node.type==='repeat') {const count=evaluate(node.count);if(!Number.isSafeInteger(count) || count<0 || count>LIMITS.repeat) fail('repeat needs a whole-number count from 0 through 50.',node.line);for(let index=0;index<count;index++) {tick(node.line);run(node.body);}}
    }}
    run(program);return {ok:true,output,error:null,steps};
  } catch(error) {return {ok:false,output,error:{line:error instanceof CodeError?error.line:1,message:error instanceof CodeError?error.message:'The program could not run. Simplify it and try again.'},steps};}
}

function fixtureRuns(id,code) {
  const definition=definitions[key(id)];if(!definition) return [];
  return definition.values.map(value=>{const expected=definition.expected(value),run=executeCoding(code,{[definition.input]:value});return {input:definition.input,value,expected,...run,passed:run.ok && run.output.length===expected.length && run.output.every((line,index)=>line===expected[index])};});
}
function matrix(id,code) {return fixtureRuns(id,code).map(run=>({label:run.input+' = '+run.value+': '+(run.error?'line '+run.error.line+' — '+run.error.message:run.passed?'output matches the request':'output does not match the request'),ok:run.passed}));}

export function initialCodingState(id) {
  return {tested:false,results:[],workspaceEdits:0,checkRuns:0,code:definitions[key(id)]?.starter || '',sourceAtRun:'',fixtureIndex:0,output:[],errors:[]};
}
export function normalizeCodingState(id,saved) {
  const state=initialCodingState(id);if(!record(saved)) return state;
  if(typeof saved.code==='string') state.code=saved.code.slice(0,LIMITS.source);
  for(const name of ['workspaceEdits','checkRuns']) if(Number.isSafeInteger(saved[name]) && saved[name]>=0) state[name]=Math.min(saved[name],1000000);
  if(Number.isSafeInteger(saved.fixtureIndex) && saved.fixtureIndex>=0 && saved.fixtureIndex<(definitions[key(id)]?.values.length || 0)) state.fixtureIndex=saved.fixtureIndex;
  if(typeof saved.sourceAtRun==='string') state.sourceAtRun=saved.sourceAtRun.slice(0,LIMITS.source);
  state.tested=saved.tested===true && state.sourceAtRun===state.code;
  if(state.tested) {
    const runs=fixtureRuns(id,state.code),selected=runs[state.fixtureIndex];
    state.results=matrix(id,state.code);state.output=selected?.output || [];state.errors=selected?.error?[selected.error]:[];
  }
  return state;
}
export function applyCodingAction(id,previous,action,value) {
  const state=normalizeCodingState(id,previous),definition=definitions[key(id)];
  if(!definition) return {state,message:'This coding case is unavailable.',kind:'warning'};
  if(action==='inspect-command') return {state,message:codingDiagnostic(id,state,record(value)?value.command:value),kind:'info'};
  const save=code=>{if(typeof code!=='string' || code.length>LIMITS.source) return false;if(code!==state.code){state.code=code;state.workspaceEdits++;state.tested=false;state.sourceAtRun='';state.results=[];state.output=[];state.errors=[];}return true;};
  if(action==='save-code') {if(!record(value) || !save(value.code)) return {state,message:'Keep the program at or below 4,000 characters.',kind:'warning'};return {state,message:'Program saved in the current lab session. Run all fixtures to test this version.',kind:'info'};}
  if(action==='reset-code') {save(definition.starter);return {state,message:'Starter program restored. Your previous passing result no longer counts for this source.',kind:'info'};}
  if(action==='inspect-fixture') {const index=record(value)?value.index:value;if(Number.isSafeInteger(index) && index>=0 && index<definition.values.length) state.fixtureIndex=index;return {state:normalizeCodingState(id,state),message:'Viewing fixture '+definition.input+' = '+definition.values[state.fixtureIndex]+'. No code or device settings changed.',kind:'info'};}
  if(action==='run-check') {
    if(value!==undefined && (!record(value) || !save(value.code))) return {state,message:'Keep the program at or below 4,000 characters.',kind:'warning'};
    state.checkRuns++;state.tested=true;state.sourceAtRun=state.code;
    const next=normalizeCodingState(id,state),passed=next.results.filter(result=>result.ok).length;
    return {state:next,message:passed+' of '+next.results.length+' coding fixtures passed. '+(passed===next.results.length?'Check the original task and explain your evidence.':'Read the actual and expected output, then revise and rerun.'),kind:passed===next.results.length?'success':'warning'};
  }
  return {state,message:'Use Save code, Run all fixtures, or Reset starter in this practice editor.',kind:'info'};
}
export function verifyCoding(id,saved) {
  const state=normalizeCodingState(id,saved),results=matrix(id,state.code);
  const ok=state.tested && state.sourceAtRun===state.code && results.length>0 && results.every(result=>result.ok);
  return {ok,message:ok?'The current program passed every input fixture. Explain why the code handles the changing inputs.':state.tested?'One or more fixture results differ from the request. Inspect the output and run a revised program.':'Run all fixtures for the current saved program before checking the original task.'};
}
export function getCodingMission(id,saved) {
  const state=normalizeCodingState(id,saved),results=matrix(id,state.code),passed=state.tested?results.filter(result=>result.ok).length:0,complete=state.tested && passed===results.length && results.length>0;
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

const codingGuide='<section class="ws-start code-start" aria-label="How to use this coding lab"><h3>Use the code editor <span>Read → edit → run</span></h3><div class="ws-start-content"><ol><li><b>Read the input and edit.</b><span>A fixture is a practice test case. Read its input and change Your code.</span></li><li><b>Run your code.</b><span>Choose “Run all fixtures” to save and test every input. “Save code” keeps a draft without testing.</span></li><li><b>Compare.</b><span>Read the actual and expected output. Fix one issue and run again.</span></li></ol><p>Save and run do not submit work to a teacher. Next, open 3. Check &amp; explain. Use fictional practice text only.</p></div></section>';

/** All browser-facing output is escaped or written as text. The editor cannot execute DOM or JavaScript APIs. */
export function renderCoding(root,scenario,saved,onAction) {
  const state=normalizeCodingState(scenario.id,saved),definition=definitions[key(scenario.id)];if(!definition){root.textContent='This coding case is unavailable.';return;}
  const mission=getCodingMission(scenario.id,state),runs=state.tested?fixtureRuns(scenario.id,state.code):[],selected=runs[state.fixtureIndex],expected=definition.expected(definition.values[state.fixtureIndex]);
  root.innerHTML=`<section class="code-lab" aria-label="Coding simulation"><header class="code-lab-bar"><span aria-hidden="true">● ● ●</span><strong>CODE STUDIO / ${esc(scenario.id)}</strong><span>ON-DEVICE PRACTICE</span></header><div class="code-lab-content">${codingGuide}<section class="code-mission" aria-label="Current mission progress"><span class="code-eyebrow">YOUR NEXT STEP · ${esc(mission.stage)}</span><p>${esc(mission.next)}</p><progress value="${mission.passed}" max="${mission.total || 1}" aria-label="Coding fixtures passing">${mission.passed} of ${mission.total}</progress><p>${state.tested?mission.passed+' / '+mission.total+' fixtures passing':'No test yet'} · ${mission.attempts} test runs</p></section><p class="code-scope"><b>Safe practice language:</b> a small JavaScript-like subset interpreted on this device. This is not a full JavaScript runtime. No network requests, real files, browser APIs, packages, or external code are available. Use fictional practice text only.</p><div class="code-workspace"><form data-code-form class="code-editor-panel"><label for="coding-editor"><b>Your code</b><small>Fixture input: <code>${esc(definition.input)}</code> · 4,000 characters maximum</small></label><textarea id="coding-editor" name="code" rows="14" maxlength="4000" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="code-save-help">${esc(state.code)}</textarea><p id="code-save-help">Run all fixtures and Run hypothesis test both save and test the editor’s current text. Switching lab tabs keeps your editor in place.</p><div class="code-actions"><button type="submit">Save code</button><button type="button" data-code-run>Run all fixtures</button><button type="button" data-code-reset>Reset starter</button></div><p data-code-status role="status"></p></form><section class="code-console-panel"><label for="code-fixture"><b>Inspect a test fixture</b></label><select id="code-fixture" data-code-fixture>${definition.values.map((value,index)=>`<option value="${index}"${index===state.fixtureIndex?' selected':''}>${esc(definition.input)} = ${value}</option>`).join('')}</select><h4>Expected output</h4><pre class="code-console code-expected">${esc(expected.join('\n'))}</pre><h4>Actual output</h4><pre class="code-console" data-code-output tabindex="0" role="region" aria-label="Program output"></pre><p data-code-error role="status" class="code-error"></p><ul class="code-fixture-results">${state.tested?state.results.map(result=>`<li class="${result.ok?'code-pass':'code-fail'}"><span>${result.ok?'PASS':'CHECK'}</span> ${esc(result.label)}</li>`).join(''):'<li>Run the program to see results for every fixture.</li>'}</ul></section></div><details class="code-reference"><summary>Language reference & examples</summary><div><p>Use semicolons after simple statements. Braces surround if/else and repeat blocks. Fixture inputs are read-only. Equality is strict; strings are not converted to numbers for arithmetic.</p><pre><code>let score = 4;\nscore = score + 1;\nprint("Score " + score);\nconsole.log(score);\nif (score &gt; 3) {\n  print("Above three");\n} else {\n  print("Three or less");\n}\nrepeat (2) {\n  print("Practice");\n}</code></pre><p>Supported: numbers, quoted strings, booleans, variables, parentheses, <code>+ - * / %</code>, <code>&lt; &lt;= &gt; &gt;= == != === !==</code>, <code>&& || !</code>, and <code>// comments</code>. <code>repeat(count)</code> is a teaching extension, not JavaScript syntax. Variables share a program scope; do not redeclare a counter inside a repeating block.</p><p>Limits: 4,000 source characters, 1,000 tokens, 1,000 execution steps, 20 output lines, 300 characters per string, 60 variables, and repeat counts from 0 through 50. Nested programs may reach the step limit sooner. Functions, arrays, objects, imports, and while/for loops are outside this subset.</p></div></details></div></section>`;
  root.querySelector('[data-code-output]').textContent=state.tested?(selected?.output.join('\n') || '(No output)'):'Run all fixtures to see this program’s output.';
  root.querySelector('[data-code-error]').textContent=selected?.error?'Line '+selected.error.line+': '+selected.error.message:'';
  const editor=root.querySelector('[name="code"]');
  const draft=()=>({code:editor.value});
  root.querySelector('[data-code-form]').addEventListener('submit',event=>{event.preventDefault();onAction('save-code',draft());});
  root.querySelector('[data-code-run]').addEventListener('click',()=>onAction('run-check',draft()));
  root.querySelector('[data-code-reset]').addEventListener('click',()=>onAction('reset-code'));
  root.querySelector('[data-code-fixture]').addEventListener('change',event=>{const index=Number(event.target.value),current=draft();if(current.code!==state.code) onAction('save-code',current);onAction('inspect-fixture',{index});});
  editor.addEventListener('input',()=>{root.querySelector('[data-code-status]').textContent=editor.value===state.code?'Editor matches the saved program.':'Unsaved edits. Save code or run all fixtures to test this version.';});
}
