// Read-aloud for instructions, clues and page text. It uses only voices built
// into the device (SpeechSynthesisVoice.localService === true), so no text is
// sent to a server. When the browser offers only online voices, or none at
// all, the control explains that instead of silently switching providers.
const BLOCK_SELECTOR='h1,h2,h3,h4,h5,h6,p,li,dt,dd,summary,label,legend,blockquote,figcaption,caption,th,td';
const SKIP_SELECTOR='a,button,input,select,textarea,summary,[contenteditable],dialog';
const SENTENCE_LIMIT=180;
export const READ_ALOUD_RATES=Object.freeze([{id:'slow',label:'Slower',rate:0.8},{id:'normal',label:'Normal',rate:1}]);

/** Only device voices count. Online voices would send the text away. */
export function localVoices(voices,language='en'){
  return (voices||[]).filter(voice=>voice&&voice.localService===true&&typeof voice.lang==='string'&&voice.lang.toLowerCase().startsWith(language.toLowerCase()));
}
export function preferredVoice(voices,language='en'){
  const local=localVoices(voices,language);
  return local.find(voice=>voice.default)||local.find(voice=>/en[-_]us/iu.test(voice.lang))||local[0]||null;
}
/** Split one block into short utterances; long utterances can stop early in some browsers. */
export function sentenceChunks(text,limit=SENTENCE_LIMIT){
  const clean=String(text||'').replace(/\s+/gu,' ').trim();
  if(!clean)return [];
  const sentences=clean.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/gu)||[clean];
  const chunks=[];
  for(const sentence of sentences.map(item=>item.trim()).filter(Boolean)){
    if(sentence.length<=limit){chunks.push(sentence);continue;}
    let current='';
    for(const word of sentence.split(' ')){
      if((current+' '+word).trim().length>limit&&current){chunks.push(current.trim());current='';}
      current+=' '+word;
    }
    if(current.trim())chunks.push(current.trim());
  }
  return chunks;
}
function visible(element){
  if(!element||element.closest('[aria-hidden="true"],[hidden],.sr-only'))return false;
  if(typeof element.getClientRects==='function'&&element.getClientRects().length===0)return false;
  return true;
}
/** Readable blocks in document order, skipping containers that hold other blocks. */
export function readableBlocks(root){
  if(!root)return [];
  const blocks=[];
  for(const element of root.querySelectorAll(BLOCK_SELECTOR)){
    if(!visible(element))continue;
    if(element.querySelector(BLOCK_SELECTOR))continue;
    const text=(element.innerText??element.textContent??'').replace(/\s+/gu,' ').trim();
    if(text.length<2)continue;
    blocks.push({element,text});
  }
  return blocks;
}
export function readAloudHTML({available,rate='normal',tapMode=false}){
  const rates=READ_ALOUD_RATES.map(item=>'<option value="'+item.id+'"'+(item.id===rate?' selected':'')+'>'+item.label+'</option>').join('');
  const unavailable='<p class="access-note" id="read-aloud-status" role="status">Read-aloud needs a voice built into this device, and this browser did not offer one. Online voices are never used, so this control stays off.</p>';
  return '<div class="access-panel-head"><h2 id="read-aloud-title">Listen</h2><button type="button" class="access-close" data-read-close aria-label="Close listen panel">×</button></div>'+
    (available
      ?'<div class="read-aloud-controls"><button type="button" class="button button-small" data-read="page">Read this page</button><button type="button" class="button button-small button-outline" data-read="pause" disabled>Pause</button><button type="button" class="button button-small button-outline" data-read="stop" disabled>Stop</button></div>'+
       '<label class="read-aloud-rate">Speed <select data-read-rate>'+rates+'</select></label>'+
       '<label class="display-choice"><input type="checkbox" data-read-tap'+(tapMode?' checked':'')+'> <span>Tap a paragraph to hear only that part</span></label>'+
       '<p class="access-note" id="read-aloud-status" role="status" aria-live="polite"></p>'+
       '<p class="access-note">Uses the voice built into this device. Nothing you read is sent anywhere.</p>'
      :unavailable);
}
/** Mount the Listen button and panel. `content()` returns the region to read (normally the main element). */
export function mountReadAloud(host,{content=()=>document.getElementById('main'),synth=globalThis.speechSynthesis,UtteranceClass=globalThis.SpeechSynthesisUtterance,reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.documentElement.getAttribute('data-motion')==='reduce'}={}){
  if(!host)return ()=>{};
  const supported=!!synth&&typeof UtteranceClass==='function';
  let voice=null,rate='normal',tapMode=false,queue=[],index=0,current=null,speaking=false,paused=false,disposed=false;
  host.innerHTML='<button type="button" class="access-button" id="read-aloud-toggle" aria-expanded="false" aria-controls="read-aloud-panel"><span class="access-icon" aria-hidden="true">🔊</span><span class="access-label">Listen</span></button><div id="read-aloud-panel" class="access-panel" role="group" aria-labelledby="read-aloud-title" hidden></div>';
  const toggle=host.querySelector('#read-aloud-toggle'),panel=host.querySelector('#read-aloud-panel');
  const refreshVoice=()=>{voice=supported?preferredVoice(synth.getVoices?.()||[]):null;return !!voice;};
  const status=message=>{const node=panel.querySelector('#read-aloud-status');if(node)node.textContent=message;};
  const clearHighlight=()=>{current?.element?.classList.remove('read-aloud-current');current=null;};
  const setButtons=()=>{
    const pause=panel.querySelector('[data-read="pause"]'),stop=panel.querySelector('[data-read="stop"]');
    if(pause){pause.disabled=!speaking;pause.textContent=paused?'Resume':'Pause';}
    if(stop)stop.disabled=!speaking;
  };
  const stop=({announce=true}={})=>{
    queue=[];index=0;speaking=false;paused=false;clearHighlight();
    try{synth?.cancel();}catch{/* Speech may already be stopped. */}
    setButtons();if(announce)status('Stopped.');
  };
  const speakNext=()=>{
    if(disposed||!speaking)return;
    if(index>=queue.length){speaking=false;paused=false;clearHighlight();setButtons();status('Finished reading.');return;}
    const item=queue[index++];
    if(item.element!==current?.element){clearHighlight();current=item;item.element.classList.add('read-aloud-current');try{item.element.scrollIntoView({block:'center',behavior:reducedMotion()?'instant':'smooth'});}catch{/* Scrolling is optional. */}}
    const utterance=new UtteranceClass(item.chunk);
    utterance.voice=voice;utterance.lang=voice?.lang||'en-US';utterance.rate=READ_ALOUD_RATES.find(entry=>entry.id===rate)?.rate||1;
    utterance.onend=()=>speakNext();
    utterance.onerror=event=>{if(event?.error==='interrupted'||event?.error==='canceled')return;speaking=false;clearHighlight();setButtons();status('Reading stopped unexpectedly. Try again.');};
    synth.speak(utterance);
  };
  const speakBlocks=blocks=>{
    if(!refreshVoice()){status('No built-in voice is available on this device.');return;}
    stop({announce:false});
    queue=blocks.flatMap(block=>sentenceChunks(block.text).map(chunk=>({element:block.element,chunk})));
    if(!queue.length){status('There is no readable text here.');return;}
    speaking=true;paused=false;setButtons();status('Reading…');speakNext();
  };
  const readPage=()=>speakBlocks(readableBlocks(content()));
  const togglePause=()=>{
    if(!speaking)return;
    if(paused){paused=false;synth.resume();status('Reading…');}
    else{paused=true;synth.pause();status('Paused.');}
    setButtons();
  };
  const render=()=>{panel.innerHTML=readAloudHTML({available:refreshVoice(),rate,tapMode});setButtons();};
  const setOpen=(open,{restoreFocus=false}={})=>{
    if(open)render();
    panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
    if(open)panel.querySelector('button:not([disabled]):not(.access-close),input,select')?.focus({preventScroll:true});
    else if(restoreFocus)toggle.focus({preventScroll:true});
  };
  const onToggle=()=>setOpen(panel.hidden);
  const onPanelClick=event=>{
    const action=event.target.closest?.('[data-read]')?.dataset.read;
    if(action==='page')readPage();else if(action==='pause')togglePause();else if(action==='stop')stop();
    else if(event.target.closest?.('[data-read-close]'))setOpen(false,{restoreFocus:true});
  };
  const onPanelChange=event=>{
    if(event.target.matches?.('[data-read-rate]')){rate=READ_ALOUD_RATES.some(entry=>entry.id===event.target.value)?event.target.value:'normal';}
    else if(event.target.matches?.('[data-read-tap]')){tapMode=event.target.checked===true;host.classList.toggle('read-aloud-tap',tapMode);status(tapMode?'Tap any paragraph on the page to hear it.':'');}
  };
  const onContentClick=event=>{
    if(!tapMode||event.target.closest?.(SKIP_SELECTOR))return;
    const block=event.target.closest?.(BLOCK_SELECTOR);
    const region=content();if(!block||!region?.contains(block)||!visible(block))return;
    const text=(block.innerText??block.textContent??'').replace(/\s+/gu,' ').trim();
    if(text.length<2)return;
    speakBlocks([{element:block,text}]);
  };
  const onKeydown=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();setOpen(false,{restoreFocus:true});}};
  const onDocumentClick=event=>{if(!panel.hidden&&!host.contains(event.target))setOpen(false);};
  const onLeave=()=>stop({announce:false});
  const onVoices=()=>{if(!panel.hidden)render();};
  toggle.addEventListener('click',onToggle);panel.addEventListener('click',onPanelClick);panel.addEventListener('change',onPanelChange);
  host.addEventListener('keydown',onKeydown);document.addEventListener('click',onDocumentClick);document.addEventListener('click',onContentClick);
  window.addEventListener('hashchange',onLeave);window.addEventListener('pagehide',onLeave);
  synth?.addEventListener?.('voiceschanged',onVoices);
  return ()=>{disposed=true;stop({announce:false});toggle.removeEventListener('click',onToggle);panel.removeEventListener('click',onPanelClick);panel.removeEventListener('change',onPanelChange);host.removeEventListener('keydown',onKeydown);document.removeEventListener('click',onDocumentClick);document.removeEventListener('click',onContentClick);window.removeEventListener('hashchange',onLeave);window.removeEventListener('pagehide',onLeave);synth?.removeEventListener?.('voiceschanged',onVoices);host.innerHTML='';};
}
