import {CODING_LANGUAGES,executeCoding,codingLanguageReference} from './coding-lab.js?release=20261024-network-studio';
import {captureWorkspaceView} from './workspace-accessibility.js?release=20261024-network-studio';
import {createTextReport,createReportURLs} from './report-downloads.js?release=20261024-network-studio';

const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const drafts=new Map();
export const SANDBOX_STARTERS=Object.freeze([
  {id:'blank',title:'Blank program',grade:'Any level',input:10,description:'Write your own program. Choose what it prints and try different numbers.',challenge:'Start with one print statement. Add a calculation, a decision, or a counting loop.',javascript:'',python:''},
  {id:'pixel-pet',title:'Pixel Pet playground',grade:'Grades 7–8',input:2,description:'Create a message for an imaginary pixel pet. The input is a made-up snack-token count.',challenge:'Change the energy per token, add a message, or use a decision when the input is zero.',javascript:'let energy = input * 4;\nconsole.log("Pet energy: " + energy);\nif (input === 0) {\n  console.log("Try a snack token!");\n}',python:'energy = input * 4\nprint("Pet energy:", energy)\nif input == 0:\n    print("Try a snack token!")'},
  {id:'arcade',title:'Arcade message maker',grade:'Grades 9–10',input:75,description:'Invent a pretend arcade message. Use the input as a fictional score.',challenge:'Choose your own thresholds and messages. Try numbers just below, at, and above each threshold.',javascript:'if (input < 50) {\n  console.log("Keep practicing");\n} else if (input < 100) {\n  console.log("New high score");\n} else {\n  console.log("Amazing run");\n}',python:'if input < 50:\n    print("Keep practicing")\nelif input < 100:\n    print("New high score")\nelse:\n    print("Amazing run")'},
  {id:'rover',title:'Rover route builder',grade:'Grades 11–12',input:4,description:'Plan an imaginary rover route. Use a whole-number input from 0 through 10 for the example.',challenge:'Change the energy rule, print a message for each leg, or compare two route totals.',javascript:'let energy = 0;\nfor (let leg = 1; leg <= input; leg++) {\n  energy = energy + leg;\n}\nconsole.log("Route energy: " + energy);',python:'energy = 0\nfor leg in range(1, input + 1):\n    energy = energy + leg\nprint("Route energy:", energy)'}
].map(Object.freeze));

const getStarter=id=>SANDBOX_STARTERS.find(starter=>starter.id===id)||SANDBOX_STARTERS[0];
function stateFor(starter){
  if(!drafts.has(starter.id))drafts.set(starter.id,{language:'javascript',code:{javascript:starter.javascript,python:starter.python},input:String(starter.input),result:null,ranSource:'',ranLanguage:'',ranInput:'',touched:false});
  return drafts.get(starter.id);
}

export const hasCodingSandboxWork=()=>[...drafts.values()].some(state=>state.touched);
export function clearCodingSandboxWork(){drafts.clear();}

/** The only user-controlled runtime value is one bounded primitive input.
 * Source always goes through executeCoding's custom parser and operation budget. */
export function runCodingSandbox(source,input,language='javascript'){
  if(typeof input!=='string'||input.length>32||!input.trim()||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(input.trim()))return {ok:false,output:[],error:{field:'input',line:1,message:'Enter a number from −1,000,000 through 1,000,000.'},steps:0};
  const value=Number(input);
  if(!Number.isFinite(value)||Math.abs(value)>1000000)return {ok:false,output:[],error:{field:'input',line:1,message:'Enter a number from −1,000,000 through 1,000,000.'},steps:0};
  return executeCoding(source,{input:value},language);
}

function statusFor(state){
  if(!state.result)return 'Choose an example or write your own code, then select Run program.';
  if(state.ranSource!==state.code[state.language]||state.ranLanguage!==state.language||state.ranInput!==state.input)return 'Your code or input changed. Run program again to update the output.';
  return state.result.ok?'Run complete · '+state.result.steps+' interpreter steps.':'Run stopped. Read the message beside your code or input.';
}

export function renderCodingSandbox({starterId='blank'}={}){
  const starter=getStarter(starterId),state=stateFor(starter),language=CODING_LANGUAGES.find(item=>item.id===state.language);
  return '<section class="coding-sandbox" aria-labelledby="sandbox-title"><div class="sandbox-heading"><p class="eyebrow">MAKE · RUN · EXPERIMENT</p><h1 id="sandbox-title">Coding sandbox</h1><p>Write a program, choose an input, and see what happens. Make your own project here. There is no ticket to close or required answer.</p><p><a href="#labs">Back to virtual labs</a> · <a href="#guide">How to use the labs</a></p></div>'+ 
    '<nav class="sandbox-starters" aria-label="Coding sandbox starting points">'+SANDBOX_STARTERS.map(item=>'<a href="#sandbox/'+item.id+'"'+(item.id===starter.id?' aria-current="page"':'')+'><strong>'+esc(item.title)+'</strong><span>'+esc(item.grade)+'</span></a>').join('')+'</nav>'+
    '<section class="code-lab" aria-label="Free coding workspace"><header class="code-lab-bar"><strong>'+esc(starter.title)+'</strong><span>ON-DEVICE PRACTICE</span></header><div class="code-lab-content"><div class="sandbox-idea"><h2>Make it your own</h2><p>'+esc(starter.description)+'</p><p>'+esc(starter.challenge)+'</p></div><p class="code-scope">Choose a <b>JavaScript subset or Python subset</b>. Both use the same small local interpreter. You can write your own supported program; functions, packages, full language runtimes, files, network access and browser APIs are unavailable. Use fictional practice text.</p>'+ 
    '<div class="code-workspace"><form class="code-editor-panel" data-sandbox-form><label for="sandbox-language"><b>Practice language</b></label><select id="sandbox-language" data-sandbox-language aria-describedby="sandbox-language-help">'+CODING_LANGUAGES.map(item=>'<option value="'+item.id+'"'+(item.id===state.language?' selected':'')+'>'+esc(item.label)+'</option>').join('')+'</select><p id="sandbox-language-help">Each language keeps its own draft in this page. Switching does not translate your program.</p><label for="sandbox-editor"><b>Your code</b><small>Write up to 4,000 characters. Read the supplied number using <code>input</code>.</small></label><textarea id="sandbox-editor" data-sandbox-editor rows="14" maxlength="4000" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="sandbox-memory-help sandbox-language-help sandbox-code-error">'+esc(state.code[state.language])+'</textarea><p id="sandbox-memory-help">Drafts stay in this page while you move around the site. Closing or reloading the page clears them. Copy or download code you want to keep before leaving. Clear private work also clears these drafts.</p><p id="sandbox-code-error" data-sandbox-code-error class="code-error" role="status" aria-atomic="true"></p><div class="code-actions"><button type="submit" data-sandbox-run>Run program</button><button type="button" data-sandbox-restore>Restore example</button><button type="button" data-sandbox-blank>Start blank</button><button type="button" data-sandbox-copy>Copy code</button><button type="button" data-sandbox-download>Download code (.txt)</button></div><p data-sandbox-transfer-status role="status" aria-live="polite"></p></form>'+ 
    '<section class="code-console-panel"><label for="sandbox-input"><b>Input number</b></label><input id="sandbox-input" class="sandbox-input" data-sandbox-input type="number" min="-1000000" max="1000000" step="any" value="'+esc(state.input)+'" aria-describedby="sandbox-input-help sandbox-input-error"><p id="sandbox-input-help">Your code can read <code>input</code>. Store calculations in your own variables. Try a different number and run again.</p><p id="sandbox-input-error" data-sandbox-input-error class="code-error" role="status" aria-atomic="true"></p><h2 class="sandbox-output-heading">Output</h2><pre class="code-console" data-sandbox-output tabindex="0" role="region" aria-label="Sandbox program output"></pre><p data-sandbox-status role="status" aria-live="polite"></p><p class="sandbox-no-grade">Experiment freely within the supported language. These runs do not pass investigation tests, create a grade, or upload your code.</p></section></div>'+ 
    '<details class="code-reference"><summary>'+esc(language.label)+' reference & examples</summary><div>'+codingLanguageReference(state.language)+'</div></details></div></section></section>';
}

function bindCodingSandbox(root,starterId,session){
  const starter=getStarter(starterId),state=stateFor(starter),controller=new AbortController(),urls=createReportURLs();
  session.dispose=()=>{controller.abort();urls.clear();};
  const find=selector=>root.querySelector(selector);
  const editor=find('[data-sandbox-editor]'),input=find('[data-sandbox-input]');
  if(!editor||!input)return;
  const listen=(node,event,handler)=>node.addEventListener(event,handler,{signal:controller.signal});
  const readDraft=()=>{state.code[state.language]=editor.value;state.input=input.value;};
  const updateOutput=()=>{
    const current=state.ranSource===state.code[state.language]&&state.ranLanguage===state.language&&state.ranInput===state.input;
    const result=current?state.result:null,error=result?.error;
    find('[data-sandbox-output]').textContent=state.result?(state.result.output.join('\n')||(state.result.ok?'(No output. Add a print statement to display a result.)':'(No output before the run stopped.)')):'Run program to see your output here.';
    find('[data-sandbox-status]').textContent=statusFor(state);
    find('[data-sandbox-code-error]').textContent=error&&error.field!=='input'?'Line '+error.line+': '+error.message:'';
    find('[data-sandbox-input-error]').textContent=error?.field==='input'?error.message:'';
    if(error&&error.field!=='input')editor.setAttribute('aria-invalid','true');else editor.removeAttribute('aria-invalid');
    if(error?.field==='input')input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');
  };
  const changed=()=>{readDraft();state.touched=true;updateOutput();};
  listen(editor,'input',changed);listen(input,'input',changed);
  listen(find('[data-sandbox-form]'),'submit',event=>{
    event.preventDefault();readDraft();state.touched=true;
    state.result=runCodingSandbox(editor.value,input.value,state.language);state.ranSource=editor.value;state.ranLanguage=state.language;state.ranInput=input.value;updateOutput();
  });
  listen(find('[data-sandbox-language]'),'change',event=>{
    if(!CODING_LANGUAGES.some(language=>language.id===event.target.value))return;
    readDraft();state.language=event.target.value;
    const restoreView=captureWorkspaceView(root,'coding-sandbox/'+starter.id);
    controller.abort();urls.clear();root.innerHTML=renderCodingSandbox({starterId:starter.id});
    bindCodingSandbox(root,starter.id,session);restoreView();
  });
  listen(find('[data-sandbox-restore]'),'click',()=>{editor.value=starter[state.language];state.code[state.language]=editor.value;state.touched=true;state.result=null;updateOutput();editor.focus({preventScroll:true});});
  listen(find('[data-sandbox-blank]'),'click',()=>{editor.value='';state.code[state.language]='';state.touched=true;state.result=null;updateOutput();editor.focus({preventScroll:true});});
  listen(find('[data-sandbox-copy]'),'click',async()=>{
    const status=find('[data-sandbox-transfer-status]');readDraft();
    try{await globalThis.navigator.clipboard.writeText(editor.value);if(!controller.signal.aborted)status.textContent='Code copied.';}
    catch{if(!controller.signal.aborted){status.textContent='Copy is unavailable. Select the code and use your device’s Copy command.';editor.focus({preventScroll:true});editor.select();}}
  });
  listen(find('[data-sandbox-download]'),'click',()=>{
    const status=find('[data-sandbox-transfer-status]');readDraft();let url;
    try{
      const artifact=createTextReport(editor.value);url=urls.create(artifact.blob);
      const link=root.ownerDocument.createElement('a');link.href=url;link.download='cole-learning-labs-sandbox-'+state.language+'.txt';link.hidden=true;root.append(link);
      try{urls.requested(url);link.click();}finally{link.remove();}
      status.textContent='Download requested. Check your device’s downloads for the text file.';
    }catch{status.textContent='Download is unavailable. Use Copy code or your device’s Copy command.';}
    finally{if(url)urls.release(url);}
  });
  updateOutput();
}

export function mountCodingSandbox(root,{starterId='blank'}={}){
  const session={dispose:()=>{}};
  bindCodingSandbox(root,starterId,session);
  return ()=>{session.dispose();session.dispose=()=>{};};
}
