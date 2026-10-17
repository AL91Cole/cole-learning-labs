/** Beginner equipment views. The model owns every answer and practice result. */
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tracks=new Set(['hardware','network','ai','security','coding']);
const trackFor=lab=>tracks.has(lab?.track)?lab.track:tracks.has(lab?.slug)?lab.slug:'hardware';
const itemsFor=lab=>Array.isArray(lab?.items)?lab.items:[];
const svg=(body)=>`<svg viewBox="0 0 160 110" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const screen='<rect x="24" y="15" width="112" height="70" rx="6"/><path d="M65 85v12h30V85M48 99h64"/>';
const person='<circle cx="80" cy="33" r="15"/><path d="M49 88v-9a31 31 0 0 1 62 0v9"/>';
const shield='<path d="M80 10l45 16v29c0 22-23 38-45 47-22-9-45-25-45-47V26z"/>';
const check='<path d="M59 57l15 15 30-34"/>';
function illustration(track,id){
  const drawings={
    hardware:{board:'<path d="M27 12h104v87H27z"/><rect x="51" y="30" width="40" height="35" rx="2"/><path d="M101 26v55m10-55v55M42 80h48M36 20h10m70 68h8M35 36h8v25h-8z"/><circle cx="36" cy="90" r="2"/><circle cx="122" cy="21" r="2"/>',cpu:'<rect x="44" y="18" width="72" height="74" rx="3"/><rect x="54" y="28" width="52" height="54" rx="3"/><path d="M44 18l11 11M36 27h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8m72-56h8m-8 14h8m-8 14h8m-8 14h8m-8 14h8M55 10v8m16-8v8m16-8v8m16-8v8M55 92v8m16-8v8m16-8v8m16-8v8"/>',cooler:'<path d="M40 24h80v63H40zM44 24l10-12h52l10 12M45 33h70M45 42h70M45 51h70M45 60h70M45 69h70M45 78h70"/><circle cx="80" cy="54" r="27"/><circle cx="80" cy="54" r="6"/><path d="M80 48q-22-20-20-3m26 9q27-2 16-16M80 60q8 26 18 13m-24-19q-23 16-6 22M59 88v10m42-10v10"/>',ram:'<path d="M16 31h128v45H16zM24 76v10h48V76m12 0v10h52V76"/><path d="M26 42h21v22H26zm29 0h21v22H55zm29 0h21v22H84zm29 0h21v22h-21zM28 78v6m8-6v6m8-6v6m8-6v6m8-6v6m28-6v6m8-6v6m8-6v6m8-6v6m8-6v6m8-6v6"/>',gpu:'<path d="M19 27h119v53H19zM12 18v72m0-60h7M34 80v10h67V80m37-47h10v37h-10"/><circle cx="59" cy="53" r="20"/><circle cx="59" cy="53" r="5"/><path d="M59 33v15m20 5H64M59 73V58m-20-5h15M90 40h34M90 51h34M90 62h34"/>',ssd:'<rect x="32" y="15" width="96" height="80" rx="4"/><rect x="45" y="29" width="70" height="42" rx="2"/><path d="M46 86h21v9M79 86h35v9M39 22h2m78 0h2M39 79h2m78 0h2"/><text x="57" y="55" fill="currentColor" stroke="none" font-size="20">SSD</text>',psu:'<path d="M30 22h100v71H30zM30 22l15-12h100v71l-15 12M130 22l15-12"/><circle cx="68" cy="57" r="25"/><circle cx="68" cy="57" r="17"/><path d="M43 57h50M68 32v50M51 39l35 36M51 75l35-36M107 41h12v20h-12zM104 78h17M37 93q-6 17-20 9"/>',panel:'<path d="M29 10h102v91H29zM36 18h88v74H36zM43 30h74M43 40h74M43 50h74"/><circle cx="35" cy="15" r="2"/><circle cx="125" cy="96" r="2"/>',monitor:screen+'<path d="M38 34h84M38 44h50M38 54h65M118 75h5"/>'},
    network:{device:'<rect x="30" y="15" width="100" height="65" rx="5"/><path d="M30 80L15 95h130l-15-15M65 89h30"/><path d="M52 37q28-24 56 0M64 49q16-13 32 0M79 61h2"/>',cable:'<path d="M30 47C10 93 150 100 130 47"/><rect x="19" y="15" width="24" height="35" rx="3"/><rect x="117" y="15" width="24" height="35" rx="3"/><path d="M25 22v15m6-15v15m6-15v15m86-15v15m6-15v15m6-15v15M24 50v8m112-8v8"/>',switch:'<rect x="14" y="30" width="132" height="54" rx="5"/><path d="M26 48h16v18H26zm28 0h16v18H54zm28 0h16v18H82zm28 0h16v18h-16zM27 77h4m8 0h4"/>',router:'<rect x="22" y="55" width="116" height="35" rx="7"/><path d="M40 55V23m80 32V23M52 37q28-22 56 0M63 45q17-12 34 0M40 73h3m10 0h3m53 0h12"/>',dhcp:'<rect x="44" y="10" width="72" height="91" rx="7"/><path d="M52 34h56M52 59h56M62 24h4m-4 25h4m-4 25h4M29 46H11m18 0l-8-8m8 8l-8 8M131 73h18m-18 0l8-8m-8 8l8 8"/>',dns:'<rect x="36" y="10" width="88" height="91" rx="6"/><path d="M47 30h66M47 53h66M47 76h66M53 20h3m-3 23h3m-3 23h3M8 37h17m-8-8l8 8-8 8"/><text x="60" y="96" fill="currentColor" stroke="none" font-size="13">DNS</text>',os:screen+'<rect x="36" y="29" width="88" height="43" rx="2"/><path d="M36 39h88M43 34h2m5 0h2M47 49h25m-25 9h56"/>'},
    ai:{prompt:'<path d="M20 15h120v66H59l-24 18V81H20z"/><path d="M35 32h88M35 46h70M35 60h80"/>',model:'<rect x="38" y="15" width="84" height="80" rx="7"/><circle cx="60" cy="35" r="6"/><circle cx="100" cy="35" r="6"/><circle cx="80" cy="57" r="6"/><circle cx="57" cy="78" r="6"/><circle cx="103" cy="78" r="6"/><path d="M64 39l12 14m9-1l11-13M76 62L62 73m23-11l13 11"/>',output:'<rect x="28" y="12" width="104" height="86" rx="6"/><path d="M44 32h72M44 47h60M44 62h68M44 77h43"/>',evidence:'<path d="M44 15h72l18 18v64H44zM116 15v20h18M43 25H26v67M58 49h58M58 62h36"/>'+check,bias:'<path d="M80 15v78M55 95h50M35 34h90M44 34L23 68h42L44 34m72 0L95 68h42l-21-34"/><circle cx="80" cy="19" r="5"/>',review:person+'<path d="M113 38l10 10 19-23"/>'},
    security:{scope:'<rect x="30" y="12" width="100" height="88" rx="7" stroke-dasharray="7 5"/><path d="M52 35h56M52 51h39M52 72l12 12 30-30"/>',identity:'<rect x="22" y="18" width="116" height="78" rx="6"/><circle cx="55" cy="46" r="12"/><path d="M36 77a19 19 0 0 1 38 0M90 39h32M90 54h26M90 69h20"/>',mfa:'<rect x="32" y="8" width="59" height="96" rx="8"/><path d="M48 19h27M55 94h13"/><rect x="77" y="45" width="52" height="42" rx="5"/><path d="M88 45V34a15 15 0 0 1 30 0v11M103 62v10"/>',permission:shield+'<circle cx="72" cy="47" r="11"/><path d="M81 55l20 20m-8-7l7-7m0 14l7-7"/>',phishing:'<rect x="16" y="25" width="128" height="68" rx="6"/><path d="M19 30l61 43 61-43M79 12l21 37H58zM79 24v11m0 7h1"/>',report:'<path d="M42 27h79v71H42zM55 46h50M55 61h50M55 76h28M37 53a22 22 0 0 1-3-44 26 26 0 0 1 43 0 22 22 0 0 1 25 8"/><path d="M96 9v15h15"/>'},
    coding:{input:'<rect x="13" y="27" width="134" height="60" rx="6"/><path d="M27 43h8m9 0h8m9 0h8m9 0h8m9 0h8m9 0h8M27 58h8m9 0h8m9 0h8m9 0h8m9 0h8m9 0h8M45 73h70"/>',variable:'<rect x="29" y="18" width="102" height="77" rx="7"/><text x="49" y="67" fill="currentColor" stroke="none" font-size="31">x = 2</text>',operator:'<path d="M18 31h34v48H18zM108 31h34v48h-34zM52 55h56m-12-12l12 12-12 12M65 16h30v20H65z"/><text x="25" y="63" fill="currentColor" stroke="none" font-size="24">+</text>',output:screen+'<path d="M39 36l10 9-10 9M59 56h36"/>',fixture:'<path d="M49 12v46L28 87q-4 9 7 12h46q11-3 7-12L67 58V12M44 12h28M43 72h29M104 28h35M104 45h35M104 62h35M108 79l9 9 21-23"/>',debug:'<circle cx="67" cy="46" r="29"/><path d="M88 68l36 32M51 40l-8 8 8 8m31-16l8 8-8 8M69 34l-7 28"/>'}
  };
  return svg(drawings[track]?.[id]||screen);
}
function readout(lab,record){
  const s=record?.simulation||{};
  const lines={network:[[s.wired,'Ethernet connected'],[s.ipAssigned,'IP address assigned'],[s.dnsReady,'Name lookup ready'],[s.serviceReachable,'Service reachable']],ai:[[s.fictionalPrompt,'Fictional input chosen'],[s.evidenceChecked,'Evidence checked'],[s.humanReviewed,'Human review complete']],security:[[s.scopeConfirmed,'Permission and scope confirmed'],[s.mfaEnabled,'MFA enabled'],[s.leastPrivilege,'Minimum access selected']]};
  if(trackFor(lab)==='coding'){
    const results=Array.isArray(record?.results)?record.results:[],last=results.at(-1);
    return last?`<p class="foundation-visual-readout">Program output: <code>${escape((Array.isArray(last.output)?last.output.join(' · '):'').slice(0,300)||'No output yet')}</code></p>`:'';
  }
  return `<div class="foundation-visual-readout">${(lines[trackFor(lab)]||[]).map(([done,label])=>`<span data-foundation-state="${done?'done':'waiting'}">${done?'✓':'○'} ${label}</span>`).join('')}</div>`;
}
function portrait(lab,id){const item=itemsFor(lab).find(item=>item.id===id)||itemsFor(lab)[0];return item?`${illustration('hardware',item.id)}<div><strong>${escape(item.label)}</strong><p>${escape(item.looks)}</p></div>`:'';}
export function renderFoundationVisual(lab,record){
  if(trackFor(lab)==='hardware')return `<div class="foundation-hardware-scene" data-foundation-hardware-scene><p class="foundation-scene-placeholder" data-foundation-scene-placeholder>Preparing the real 3D workstation. The labeled part buttons also work without graphics.</p></div><div class="foundation-part-portrait" data-foundation-part-portrait>${portrait(lab,'')}</div>`;
  return `<div class="foundation-equipment-map" role="group" aria-label="${escape(lab?.title||'Equipment explorer')}"><div class="foundation-equipment-grid">${itemsFor(lab).map(item=>`<button type="button" class="foundation-equipment-card" data-foundation-item="${escape(item.id)}" aria-pressed="false">${illustration(trackFor(lab),item.id)}<strong>${escape(item.label)}</strong><span>${escape(item.looks)}</span></button>`).join('')}</div>${readout(lab,record)}</div>`;
}

/** One stable host: the UI owns tabs; this adapter owns only its disposable view. */
export function mountFoundationScene(host,{lab,record,onInspect=()=>{},onAction=()=>{},onStatus=()=>{}}={}){
  if(!host?.ownerDocument)return null;
  const doc=host.ownerDocument;
  let current=record,scene=null,module=null,disposed=false,loading=false,visible=!host.closest?.('[hidden]'),mode='explore',selected='',failed=false,paused=false,toolState='';
  const hardware=trackFor(lab)==='hardware';
  const findPart=id=>{
    const aliases={storage:'ssd',power:'psu',display:'monitor',atx:'board',eps:'board','gpu-power':'gpu','sata-data':'ssd','sata-power':'ssd','cpu-fan':'cooler','front-panel':'panel','hdmi-pc':'monitor','hdmi-monitor':'monitor',ac:'psu'};
    const raw=typeof id==='string'?id.replace(/^cable-/,''):'';
    const part=aliases[raw]||(/^(panel|psu|board|cooler|gpu|ssd)-\d$/.exec(raw)?.[1])||raw;
    return itemsFor(lab).some(item=>item.id===part)?part:'';
  };
  function status(kind,message){if(!disposed)onStatus({kind,message});}
  function placeholder(message){const node=host.querySelector?.('[data-foundation-scene-placeholder]');if(node){node.textContent=message;node.hidden=false;}}
  function applyTool(){
    if(!scene)return;
    const done=Array.isArray(current?.practice)?current.practice:[];
    const jobs=Array.isArray(lab?.jobs)?lab.jobs:[];
    const action=jobs.find(job=>!done.includes(job.id))?.action||jobs.find(job=>!done.includes(job.id))?.id||'';
    const ready=mode==='practice'&&itemsFor(lab).every(item=>current?.explored?.includes(item.id))&&(lab.checks||[]).every(check=>current?.answers?.[check.id]===check.answer);
    const tool=!ready?'inspect':/^asm-(tighten|loosen)-/.test(action)?'screwdriver':/^asm-(fit|remove)-/.test(action)?'move':/^(video-|plug-in|unplug|(?:asm-)?(?:connect|disconnect)-)/.test(action)?'cables':/apply-paste/.test(action)?'paste':/clean-paste/.test(action)?'clean':'inspect';
    const cable=tool==='cables'?(action==='plug-in'||action==='unplug'?'ac':action.startsWith('video-')?'hdmi-pc':action.replace(/^asm-(?:connect|disconnect)-/,'')):'';
    if(toolState===`${tool}:${cable}`)return;toolState=`${tool}:${cable}`;
    scene.setTool?.(tool);if(cable)scene.setCable?.(cable);
  }
  function inspect(id){const part=findPart(id);if(!part||disposed)return;focus(part);onInspect(part);}
  function actionResult(result){return result?.state?.hardware?{...result,state:result.state.hardware}:result;}
  function action(action){if(disposed||!visible||doc.hidden||paused||mode!=='practice')return {kind:'warning',message:'Switch to the visible Practice workstation before making a repair.'};const result=onAction(action);return result?.then?result.then(actionResult):actionResult(result);}
  async function load(){
    if(!hardware||disposed||!visible||doc.hidden||paused||loading||scene||failed)return;
    loading=true;status('loading','Preparing the 3D workstation…');
    try{
      module ||= await import('./assembly-scene.js?release=20261017-foundations17');
      if(disposed||!visible||doc.hidden||paused)return;
      scene=module.mountAssemblyScene(host.querySelector('[data-foundation-hardware-scene]'),{hardware:current?.hardware,assembly:current?.hardware?.assembly,onSelect:inspect,onAction:action,onInteraction:info=>status('info',info.message),onStatus:message=>{if(message.kind==='unavailable')failed=true;status(message.kind,message.message);}});
      if(!scene){failed=true;placeholder('3D is unavailable here. Use the labeled part buttons and guided practice controls.');status('unavailable','Every lesson and practice action remains available without 3D.');return;}
      const node=host.querySelector('[data-foundation-scene-placeholder]');if(node)node.hidden=true;
      scene.fit?.();applyTool();if(selected)scene.select?.(selected==='monitor'?'display':selected);
    }catch{failed=true;placeholder('The 3D view could not load. Use the labeled parts and guided practice controls.');status('unavailable','3D could not load. All learning activities remain available.');}
    finally{loading=false;}
  }
  function focus(id){if(disposed||!itemsFor(lab).some(item=>item.id===id))return;selected=id;scene?.select?.(id==='monitor'?'display':id);host.querySelectorAll?.('[data-foundation-item]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.foundationItem===id)));if(hardware){const node=host.querySelector?.('[data-foundation-part-portrait]');if(node)node.innerHTML=portrait(lab,id);}}
  function update(next){
    if(disposed)return;current=next;
    if(hardware){scene?.cancelInteraction?.();scene?.update(current?.hardware,current?.hardware?.assembly);applyTool();}
    else{const active=doc.activeElement?.closest?.('[data-foundation-item]'),restore=active&&host.contains?.(active)?active.dataset.foundationItem:'';host.innerHTML=renderFoundationVisual(lab,current);if(selected)focus(selected);if(restore)[...host.querySelectorAll('[data-foundation-item]')].find(node=>node.dataset.foundationItem===restore)?.focus({preventScroll:true});}
  }
  function cancelInteraction(){scene?.cancelInteraction?.();}
  function setVisible(value){if(disposed)return;visible=!!value;if(!visible||doc.hidden||paused){cancelInteraction();scene?.pause?.();}else if(scene)scene.resume?.();else void load();}
  function visibility(){setVisible(visible);}
  function camera(command){if(disposed)return;cancelInteraction();if(command==='pause'){paused=true;scene?.pause?.();return;}if(command==='resume'){paused=false;failed=false;if(visible&&!doc.hidden){if(scene)scene.resume?.();else void load();}return;}if(!visible||doc.hidden||paused)return;if(command==='in'||command==='out')scene?.zoom?.(command);else if(command==='fit')scene?.fit?.();else if(command==='focus')scene?.focusSelected?.();}
  function click(event){const node=event.target.closest?.('[data-foundation-item]');if(!node||!host.contains(node))return;const id=node.dataset.foundationItem;if(itemsFor(lab).some(item=>item.id===id)){focus(id);inspect(id);}}
  host.addEventListener('click',click);doc.addEventListener?.('visibilitychange',visibility);
  if(hardware)void load();else status('ready','Choose a picture or a labeled item to inspect it.');
  return{update,focus,camera,cancelInteraction,setVisible,setMode(value){mode=value==='practice'?'practice':'explore';cancelInteraction();applyTool();},dispose(){if(disposed)return;disposed=true;cancelInteraction();scene?.dispose?.();scene=null;host.removeEventListener('click',click);doc.removeEventListener?.('visibilitychange',visibility);}};
}
