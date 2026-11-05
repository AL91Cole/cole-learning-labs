// On-page Display menu: text size, line spacing, stronger contrast and reduced
// motion. Choices are plain presentation settings, not learner work. They are
// kept on this device only (no account, no server) and can be reset at any time.
export const DISPLAY_STORAGE_KEY='cole-learning-labs:display:v1';
export const DISPLAY_OPTIONS=Object.freeze({
  textSize:Object.freeze(['default','larger','largest']),
  spacing:Object.freeze(['default','relaxed']),
  contrast:Object.freeze(['default','high']),
  motion:Object.freeze(['auto','reduce'])
});
export const DISPLAY_DEFAULTS=Object.freeze({textSize:'default',spacing:'default',contrast:'default',motion:'auto'});
const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

/** Accept only known option names and values; anything else falls back to the default. */
export function normalizeDisplayPreferences(value){
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const result={};
  for(const [name,options]of Object.entries(DISPLAY_OPTIONS))result[name]=options.includes(source[name])?source[name]:DISPLAY_DEFAULTS[name];
  return result;
}
export function readDisplayPreferences(storage){
  try{return normalizeDisplayPreferences(JSON.parse(storage?.getItem(DISPLAY_STORAGE_KEY)||'null'));}
  catch{return {...DISPLAY_DEFAULTS};}
}
export function writeDisplayPreferences(storage,preferences){
  const clean=normalizeDisplayPreferences(preferences),unchanged=Object.keys(clean).every(name=>clean[name]===DISPLAY_DEFAULTS[name]);
  try{if(unchanged)storage?.removeItem(DISPLAY_STORAGE_KEY);else storage?.setItem(DISPLAY_STORAGE_KEY,JSON.stringify(clean));return true;}
  catch{return false;}
}
/** Presentation flows through data attributes on the root element; the stylesheet does the rest. */
export function applyDisplayPreferences(root,preferences){
  const clean=normalizeDisplayPreferences(preferences);
  for(const [name,value]of Object.entries(clean)){
    const attribute='data-'+name.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase());
    if(value===DISPLAY_DEFAULTS[name])root.removeAttribute(attribute);else root.setAttribute(attribute,value);
  }
  return clean;
}
const choice=(name,value,label,current)=>'<label class="display-choice"><input type="radio" name="display-'+name+'" value="'+value+'"'+(current===value?' checked':'')+'> <span>'+esc(label)+'</span></label>';
export function displayMenuHTML(preferences,{saved=true}={}){
  const p=normalizeDisplayPreferences(preferences);
  return '<div class="access-panel-head"><h2 id="display-panel-title">Display</h2><button type="button" class="access-close" data-display-close aria-label="Close display menu">×</button></div>'+
    '<fieldset class="display-group"><legend>Text size</legend>'+choice('textSize','default','Standard',p.textSize)+choice('textSize','larger','Larger',p.textSize)+choice('textSize','largest','Largest',p.textSize)+'</fieldset>'+
    '<fieldset class="display-group"><legend>Spacing</legend>'+choice('spacing','default','Standard',p.spacing)+choice('spacing','relaxed','More space between lines and words',p.spacing)+'</fieldset>'+
    '<fieldset class="display-group"><legend>Contrast</legend>'+choice('contrast','default','Standard colors',p.contrast)+choice('contrast','high','Stronger contrast',p.contrast)+'</fieldset>'+
    '<fieldset class="display-group"><legend>Motion</legend>'+choice('motion','auto','Follow my device setting',p.motion)+choice('motion','reduce','Reduce animation',p.motion)+'</fieldset>'+
    '<div class="access-panel-foot"><button type="button" class="button button-small button-outline" data-display-reset>Reset to standard</button><p class="access-note">'+(saved?'Saved on this device only.':'Used on this page only and not saved.')+' Nothing is sent anywhere.</p></div>';
}
/** Render the Display button and panel into a host element. Returns a disposer. */
export function mountDisplayMenu(host,{storage=null,root=document.documentElement}={}){
  if(!host)return ()=>{};
  let preferences=applyDisplayPreferences(root,readDisplayPreferences(storage));
  host.innerHTML='<button type="button" class="access-button" id="display-toggle" aria-expanded="false" aria-controls="display-panel"><span class="access-icon" aria-hidden="true">Aa</span><span class="access-label">Display</span></button><div id="display-panel" class="access-panel" role="group" aria-labelledby="display-panel-title" hidden></div>';
  const toggle=host.querySelector('#display-toggle'),panel=host.querySelector('#display-panel');
  const render=()=>{panel.innerHTML=displayMenuHTML(preferences,{saved:!!storage});};
  const setOpen=(open,{restoreFocus=false}={})=>{
    if(open)render();
    panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
    if(open)panel.querySelector('input:checked,input')?.focus({preventScroll:true});
    else if(restoreFocus)toggle.focus({preventScroll:true});
  };
  const onToggle=()=>setOpen(panel.hidden);
  const onChange=event=>{
    const input=event.target;if(!(input instanceof HTMLInputElement)||input.type!=='radio')return;
    const name=input.name.replace(/^display-/,'');if(!Object.hasOwn(DISPLAY_OPTIONS,name))return;
    preferences=applyDisplayPreferences(root,{...preferences,[name]:input.value});
    writeDisplayPreferences(storage,preferences);
  };
  const onClick=event=>{
    if(event.target.closest?.('[data-display-reset]')){preferences=applyDisplayPreferences(root,DISPLAY_DEFAULTS);writeDisplayPreferences(storage,preferences);render();panel.querySelector('input')?.focus({preventScroll:true});}
    else if(event.target.closest?.('[data-display-close]'))setOpen(false,{restoreFocus:true});
  };
  const onKeydown=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();setOpen(false,{restoreFocus:true});}};
  const onDocumentClick=event=>{if(!panel.hidden&&!host.contains(event.target))setOpen(false);};
  toggle.addEventListener('click',onToggle);panel.addEventListener('change',onChange);panel.addEventListener('click',onClick);
  host.addEventListener('keydown',onKeydown);document.addEventListener('click',onDocumentClick);
  return ()=>{toggle.removeEventListener('click',onToggle);panel.removeEventListener('change',onChange);panel.removeEventListener('click',onClick);host.removeEventListener('keydown',onKeydown);document.removeEventListener('click',onDocumentClick);host.innerHTML='';};
}
