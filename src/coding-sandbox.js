import {CODING_LANGUAGES,executeCoding,codingLanguageReference} from './coding-lab.js?release=20261025-learning-plans';
import {captureWorkspaceView} from './workspace-accessibility.js?release=20261025-learning-plans';
import {createTextReport,createReportURLs} from './report-downloads.js?release=20261025-learning-plans';
import {CODING_VISUAL_MODES,normalizeCodingVisualMode,codingVisualHTML} from './coding-visuals.js?release=20261025-learning-plans';

const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const drafts=new Map();
export const SANDBOX_STARTERS=Object.freeze([
  {id:'blank',title:'Blank project',grade:'Any level',input:10,mode:'text',description:'Build your own idea. Start with a print statement.',challenge:'Try a message, calculation, decision, or counting loop.',javascript:'',python:''},
  {id:'pixel-pet',title:'Pixel Pet energy',grade:'Grades 7–8',input:2,mode:'bars',description:'Give a pretend pet some energy. Change the snack count and run it.',challenge:'Change the energy rule or add a message.',javascript:'let energy = input * 4;\nconsole.log(energy);\nif (input === 0) {\n  console.log("Try a snack token!");\n}',python:'energy = input * 4\nprint(energy)\nif input == 0:\n    print("Try a snack token!")'},
  {id:'arcade',title:'Arcade scoreboard',grade:'Grades 9–10',input:75,mode:'bars',description:'Use a fictional score to make a scoreboard.',challenge:'Change the thresholds. Test each side of a boundary.',javascript:'console.log(input);\nif (input < 50) {\n  console.log("Keep practicing");\n} else if (input < 100) {\n  console.log("New high score");\n} else {\n  console.log("Amazing run");\n}',python:'print(input)\nif input < 50:\n    print("Keep practicing")\nelif input < 100:\n    print("New high score")\nelse:\n    print("Amazing run")'},
  {id:'rover',title:'Rover energy route',grade:'Grades 11–12',input:4,mode:'bars',description:'Print the energy used at each step of a pretend rover trip.',challenge:'Change the rule or compare two routes. Start with 0–10 steps.',javascript:'let energy = 0;\nfor (let leg = 1; leg <= input; leg++) {\n  energy = energy + leg;\n  console.log(energy);\n}',python:'energy = 0\nfor leg in range(1, input + 1):\n    energy = energy + leg\n    print(energy)'},
  {id:'tiles',title:'Pixel tile maker',grade:'Any level',input:5,mode:'tiles',description:'Print rows of digits to draw a picture. 0 is empty; 9 is filled.',challenge:'Change the rows or use an input from 0–9 for shaded pixels.',javascript:'console.log("0 9 0 9 0");\nconsole.log("9 " + input + " 9 " + input + " 9");\nconsole.log("9 9 9 9 9");\nconsole.log("0 9 9 9 0");\nconsole.log("0 0 9 0 0");',python:'print("0 9 0 9 0")\nprint("9", input, "9", input, "9")\nprint("9 9 9 9 9")\nprint("0 9 9 9 0")\nprint("0 0 9 0 0")'}
].map(Object.freeze));
const getStarter=id=>SANDBOX_STARTERS.find(starter=>starter.id===id)||SANDBOX_STARTERS[0];
function stateFor(starter){
  if(!drafts.has(starter.id))drafts.set(starter.id,{language:'javascript',code:{javascript:starter.javascript,python:starter.python},input:String(starter.input),mode:starter.mode,result:null,ranSource:'',ranLanguage:'',ranInput:'',touched:false});
  return drafts.get(starter.id);
}
export const hasCodingSandboxWork=()=>[...drafts.values()].some(state=>state.touched);
export function clearCodingSandboxWork(){drafts.clear();}

/** Source only enters the bounded teaching interpreter, with one primitive input. */
export function runCodingSandbox(source,input,language='javascript'){
  if(typeof input!=='string'||input.length>32||!input.trim()||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(input.trim()))return {ok:false,output:[],error:{field:'input',line:1,message:'Enter a number from −1,000,000 through 1,000,000.'},steps:0};
  const value=Number(input);
  if(!Number.isFinite(value)||Math.abs(value)>1000000)return {ok:false,output:[],error:{field:'input',line:1,message:'Enter a number from −1,000,000 through 1,000,000.'},steps:0};
  return executeCoding(source,{input:value},language);
}
const currentRun=state=>state.result&&state.ranSource===state.code[state.language]&&state.ranLanguage===state.language&&state.ranInput===state.input;
function statusFor(state){
  if(!state.result)return 'Run program to see what you made.';
  if(!currentRun(state))return 'Your code or input changed. Run program again to update the output.';
  return state.result.ok?'Run complete · '+state.result.steps+' interpreter steps.':'Run stopped. Read the message beside your code or input.';
}
export function codingSandboxSnippet(kind,language,source=''){
  if(typeof source!=='string'||source.length>4000||!['javascript','python'].includes(language))return '';
  const python=language==='python';
  if(kind==='print')return python?'print(input)':'console.log(input);';
  if(kind==='decision')return python?'if input >= 50:\n    print("Level up!")':'if (input >= 50) {\n  console.log("Level up!");\n}';
  if(kind==='loop'){
    let name='projectStep',number=1;while(source.includes(name))name='projectStep'+number++;
    return python?'for '+name+' in range(1, 4):\n    print('+name+')':'for (let '+name+' = 1; '+name+' <= 3; '+name+'++) {\n  console.log('+name+');\n}';
  }
  return '';
}

export function renderCodingSandbox({starterId='blank'}={}){
  const starter=getStarter(starterId),quickMax=starter.id==='tiles'?9:100,state=stateFor(starter);
  return '<section class="coding-sandbox" aria-labelledby="sandbox-title"><div class="sandbox-heading"><p class="eyebrow">MAKE · RUN · EXPERIMENT</p><h1 id="sandbox-title">Coding sandbox</h1><p>Make a project. Change a number. Run it and see your result.</p><p><a href="#labs/coding">Coding labs</a> · <a href="#studio/coding">Project studio</a></p></div>'+
    '<nav class="sandbox-starters" aria-label="Project starting points">'+SANDBOX_STARTERS.map(item=>'<a href="#sandbox/'+item.id+'"'+(item.id===starter.id?' aria-current="page"':'')+'><strong>'+esc(item.title)+'</strong><span>'+esc(item.grade)+'</span></a>').join('')+'</nav>'+
    '<section class="code-lab" aria-label="Free coding workspace"><header class="code-lab-bar"><strong>'+esc(starter.title)+'</strong><span>ON-DEVICE PRACTICE</span></header><div class="code-lab-content"><div class="sandbox-idea"><h2>Try an idea</h2><p>'+esc(starter.description)+'</p><p>'+esc(starter.challenge)+'</p></div><p class="code-scope">Small local interpreter · 4,000 code characters · 20 output lines. Use fictional practice text.</p>'+
    '<div class="code-workspace"><form class="code-editor-panel" data-sandbox-form><label for="sandbox-language"><b>Language</b></label><select id="sandbox-language" data-sandbox-language aria-describedby="sandbox-language-help">'+CODING_LANGUAGES.map(item=>'<option value="'+item.id+'"'+(item.id===state.language?' selected':'')+'>'+esc(item.label)+'</option>').join('')+'</select><label for="sandbox-editor"><b>Your code</b><small>Read the number using <code>input</code>.</small></label><textarea id="sandbox-editor" data-sandbox-editor rows="14" maxlength="4000" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="sandbox-code-error">'+esc(state.code[state.language])+'</textarea><div class="sandbox-code-chips" role="group" aria-label="Add a code idea"><span>Add code:</span><button type="button" data-sandbox-insert="print">Print a number</button><button type="button" data-sandbox-insert="decision">Make a decision</button><button type="button" data-sandbox-insert="loop">Count to 3</button></div><p id="sandbox-code-error" data-sandbox-code-error class="code-error" role="status" aria-atomic="true"></p><div class="code-actions"><button type="submit" data-sandbox-run>Run program</button><button type="button" data-sandbox-restore>Restore example</button><button type="button" data-sandbox-blank>Start blank</button></div><details class="sandbox-save"><summary>Keep your code</summary><p>Copy or download before closing or reloading this page.</p><div class="code-actions"><button type="button" data-sandbox-copy>Copy code</button><button type="button" data-sandbox-download>Download code (.txt)</button></div><p data-sandbox-transfer-status role="status" aria-live="polite"></p></details></form>'+
    '<section class="code-console-panel"><label for="sandbox-input"><b>Input number</b></label><div class="sandbox-input-controls"><input id="sandbox-input" class="sandbox-input" data-sandbox-input type="number" min="-1000000" max="1000000" step="any" value="'+esc(state.input)+'" aria-describedby="sandbox-input-help sandbox-input-error"><input type="range" data-sandbox-range min="0" max="'+quickMax+'" step="1" value="'+Math.max(0,Math.min(quickMax,Number(state.input)||0))+'" aria-label="Quick input from 0 through '+quickMax+'"></div><p id="sandbox-input-help">Slide from 0–'+quickMax+', or type another number. Select Run program.</p><p id="sandbox-input-error" data-sandbox-input-error class="code-error" role="status" aria-atomic="true"></p><label for="sandbox-visual"><b>Show my result as</b></label><select id="sandbox-visual" data-sandbox-visual>'+CODING_VISUAL_MODES.map(item=>'<option value="'+item.id+'"'+(item.id===state.mode?' selected':'')+'>'+esc(item.label)+'</option>').join('')+'</select><div class="sandbox-preview" data-sandbox-preview role="region" aria-label="Project visual result" tabindex="0"></div><details class="sandbox-raw"><summary>Printed output</summary><pre class="code-console" data-sandbox-output tabindex="0" role="region" aria-label="Sandbox program output"></pre></details><p data-sandbox-status role="status" aria-live="polite"></p><p class="sandbox-no-grade">Build freely. These runs do not earn a grade or pass lab tests.</p></section></div>'+
    '<details class="code-reference"><summary>Help & limits</summary><div><p id="sandbox-language-help">Each language keeps its own draft in this page. Switching does not translate your program.</p><p id="sandbox-memory-help">Drafts stay in this page while you move around the site. Closing or reloading the page clears them. Copy or download code you want to keep. Clear private work also clears these drafts. Code is not uploaded by this workspace.</p><p>Both modes use a small local interpreter. Full language runtimes, functions, packages, files, network access, and browser APIs are unavailable.</p>'+codingLanguageReference(state.language)+'</div></details></div></section></section>';
}

function bindCodingSandbox(root,starterId,session){
  const starter=getStarter(starterId),quickMax=starter.id==='tiles'?9:100,state=stateFor(starter),controller=new AbortController(),urls=createReportURLs();
  session.dispose=()=>{controller.abort();urls.clear();};
  const find=selector=>root.querySelector(selector);
  const editor=find('[data-sandbox-editor]'),input=find('[data-sandbox-input]'),range=find('[data-sandbox-range]');
  if(!editor||!input)return;
  const listen=(node,event,handler)=>node?.addEventListener(event,handler,{signal:controller.signal});
  const readDraft=()=>{state.code[state.language]=editor.value;state.input=input.value;};
  const updateOutput=()=>{
    const result=currentRun(state)?state.result:null,error=result?.error,preview=find('[data-sandbox-preview]');
    find('[data-sandbox-output]').textContent=result?(result.output.join('\n')||(result.ok?'(No output. Add a print statement.)':'(No output before the run stopped.)')):'Run program to see your current output.';
    if(result)preview.innerHTML=codingVisualHTML(result,state.mode);else{preview.innerHTML='';preview.textContent=state.result?'Run program again to update your result.':'Your creation will appear here. Select Run program.';}
    find('[data-sandbox-status]').textContent=statusFor(state);
    find('[data-sandbox-code-error]').textContent=error&&error.field!=='input'?'Line '+error.line+': '+error.message:'';
    find('[data-sandbox-input-error]').textContent=error?.field==='input'?error.message:'';
    if(error&&error.field!=='input')editor.setAttribute('aria-invalid','true');else editor.removeAttribute('aria-invalid');
    if(error?.field==='input')input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');
    range.value=String(Math.max(0,Math.min(quickMax,Number(input.value)||0)));
  };
  const changed=()=>{readDraft();state.touched=true;updateOutput();};
  listen(editor,'input',changed);listen(input,'input',changed);
  listen(range,'input',()=>{input.value=range.value;changed();});
  listen(find('[data-sandbox-visual]'),'change',event=>{state.mode=normalizeCodingVisualMode(event.target.value);event.target.value=state.mode;updateOutput();});
  for(const kind of ['print','decision','loop'])listen(find('[data-sandbox-insert="'+kind+'"]'),'click',()=>{
    const snippet=codingSandboxSnippet(kind,state.language,editor.value),next=editor.value+(editor.value&&!editor.value.endsWith('\n')?'\n':'')+snippet;
    if(next.length>4000){find('[data-sandbox-status]').textContent='That idea would exceed 4,000 characters. Shorten your code first.';return;}
    editor.value=next;changed();editor.focus({preventScroll:true});
  });
  listen(find('[data-sandbox-form]'),'submit',event=>{
    event.preventDefault();readDraft();state.touched=true;
    state.result=runCodingSandbox(editor.value,input.value,state.language);state.ranSource=editor.value;state.ranLanguage=state.language;state.ranInput=input.value;updateOutput();
  });  listen(find('[data-sandbox-language]'),'change',event=>{
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
