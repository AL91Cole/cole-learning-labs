import { assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS } from './assembly-model.js?release=20261020-labpages23';
import { ASSEMBLY_TOOLS, assemblyToolAction } from './assembly-tools.js?release=20261020-labpages23';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from './assembly-cables.js?release=20261020-labpages23';
import { workbenchGuidance } from './workbench-guidance.js?release=20261020-labpages23';
import { pcActivity } from './pc-activity.js?release=20261020-labpages23';

const GROUPS = [['panel','Case & screws'],['psu','Power supply'],['board','Motherboard'],['cpu','CPU & retention'],['paste','Thermal paste'],['cooler','Cooler & fan'],['ram','Memory & clips'],['gpu','Graphics & latch'],['ssd','Original SSD'],['cables','Power & data leads'],['display','Monitor']];
const NAMES = Object.fromEntries(GROUPS);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(id,label)=>`<button type="button" data-assembly-action="${escape(id)}">${escape(label)}</button>`;
const groupFor = id => {
  if(/paste/.test(id))return 'paste';
  if(/retention/.test(id))return 'cpu';
  if(/ram/.test(id))return 'ram';
  if(/pcie/.test(id))return 'gpu';
  if(/cpu-fan/.test(id))return 'cooler';
  if(/display/.test(id))return 'display';
  if(/^asm-(?:atx|eps|gpu-power|sata-data|sata-power|front-panel)$/.test(id))return 'cables';
  if(/(?:connect|disconnect)-/.test(id))return 'cables';
  return GROUPS.find(([key])=>id.includes(`-${key}`))?.[0]||'board';
};

/** Native SVG restores the PR #6 schematic; the existing model still owns every repair. */
export function mountAssemblyWorkbench(root,{state,onAction}) {
  let current=state,guidance=workbenchGuidance(state),activity=pcActivity(state),allTools=false,disposed=false,visible=!root.closest?.('[hidden]'),drag=null,suppressClick=false;
  let selected=guidance.initialPart,activeTool='inspect',selectedScrew=(guidance.screws[0]||'panel')+'-0',selectedCable=guidance.initialCable;
  let selectedSocket=ASSEMBLY_CABLES.find(cable=>cable.id===selectedCable).sockets[0].id;
  const doc=root.ownerDocument;
  root.onclick=null;root.onkeydown=null;root.onchange=null;
  root.innerHTML=`<section class="asm-bench asm-repair" aria-label="Schematic repair workbench">
    <header class="asm-ticket-guide"><h3 data-asm-ticket-title></h3><p data-asm-instruction></p></header>
    <div class="asm-power" role="group" aria-label="Virtual PC power controls"><div class="asm-machine-status"><strong data-asm-power></strong><span data-asm-next></span></div>${button('power-off','Power off')}${button('unplug','Unplug AC')}${button('plug-in','Connect AC')}${button('boot','Test PC')}${button('open-document','Open lesson')}</div>
    <div class="asm-top-controls"><section class="asm-toolbox" aria-label="Workbench tools"><div class="asm-tool-buttons" role="group" aria-label="Choose a workbench tool">${ASSEMBLY_TOOLS.map(tool=>`<button type="button" data-asm-tool="${tool.id}" aria-pressed="${tool.id==='inspect'}">${escape(tool.label)}</button>`).join('')}</div></section>
    <div class="asm-picture-tabs" aria-label="Equipment picture"><strong>Full PC X-ray</strong></div></div>
    <div class="asm-layout"><div class="asm-visual"><div class="asm-schematic" data-asm-scene aria-label="Labeled virtual PC schematic"></div></div></div>
    <p class="asm-activity" role="status"><strong data-asm-activity-label></strong><span data-asm-activity-detail></span></p>
    <details class="asm-monitor-readout"><summary>Read monitor text & startup clues</summary><p data-asm-monitor-readout role="status" aria-live="polite"></p><p class="asm-monitor-note">Messages belong to this authored workstation. Other PCs can use different startup indicators.</p></details>
    <p class="asm-feedback" data-asm-feedback role="status" aria-live="polite">Tap a labeled part to inspect it. Choose a tool to make a change, then test the PC.</p>
    <div class="asm-current"><h4 data-asm-part-title></h4><p data-asm-part-state></p><button type="button" data-asm-reveal="part">Make a change</button></div>
    <details class="asm-all-tools" data-asm-all-tools><summary>All workbench tools (optional)</summary><label><input type="checkbox" data-asm-all> Show complete controls</label><p>Use the complete set for a different repair or a saved workstation that needs extra work. Your equipment is unchanged until you perform an action.</p></details>
    <div class="asm-drawers"><details class="asm-drawer asm-tool-drawer" data-asm-tool-drawer hidden><summary data-asm-tool-summary>Tool controls</summary><p data-asm-tool-help></p><div class="asm-tool-controls" data-asm-tool-controls></div></details>
    <details class="asm-drawer" data-asm-component-drawer><summary>Part controls · keyboard & touch</summary><aside class="asm-controls" aria-label="Component controls"><label>Choose a component<select aria-label="Choose a component" data-asm-select>${GROUPS.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><div class="asm-part-tabs" role="group" aria-label="Equipment sections">${GROUPS.map(([key,label])=>`<button type="button" data-asm-part="${key}">${label}</button>`).join('')}</div><div class="asm-actions" data-asm-actions></div></aside></details>
    <details class="asm-drawer asm-readouts"><summary>What is running?</summary><p data-asm-component-status></p><p data-asm-fan-status></p><p data-asm-diagnostic-detail></p></details>
    <details class="asm-help" data-asm-build-help><summary>How to build or take apart this virtual PC</summary><ol><li>Power off and disconnect virtual AC. Remove the case screws and side panel for internal work.</li><li>Select a component in the picture or the list. Fit or remove it using the large controls. Keep loose screws in the virtual tray.</li><li>Fit parts on their mounts, secure their fasteners, close clips, and connect the correct leads. Tighten the cooler diagonally: 1, 4, 2, 3.</li><li>Use Clean surfaces and Apply pea-sized paste with the cooler removed. Lifting a cooler breaks its paste seal; clean and reapply before refitting.</li><li>Reattach the side panel and its screws, connect AC, then test startup. Finish by opening the original lesson file.</li></ol><p>For teardown, disconnect the leads and release fasteners and clips before removing a part. Removal never erases the original SSD. Use the same controls with a mouse, touch, Tab, Enter or Space.</p><p>This is one authored training workstation. Fan motion and power readouts follow this virtual PC state. Spinning fans do not prove that startup passed. SSDs and RAM have no moving parts. This model does not measure temperature, screw tension or paste spread; manufacturer procedures vary.</p></details>
    <details class="asm-drawer asm-delivery"><summary>Original task & monitor controls</summary><strong data-asm-delivery></strong>${button('video-gpu','Monitor → graphics card')}${button('input-hdmi','Monitor source: HDMI')}</details></div>
  </section>`;
  const $=selector=>root.querySelector(selector);
  const sceneHost=$('[data-asm-scene]');
  const toolHelp={inspect:'Tap a labeled part to inspect it. The full PC X-ray keeps the monitor, components and connections together.',move:'Choose a part, then use Fit or Return. Optional: drag a part label onto its matching mount or the parts tray.',screwdriver:'Tap a numbered screw to turn it, or choose one below and use the large Turn button. Power and assembly checks still apply.',paste:'Tap the exposed CPU to apply one pea-sized dot of paste, or use Apply below. Remove the cooler first.',clean:'Tap the exposed CPU to clean its contact surfaces, or use Clean below. Remove the cooler first.',cables:'Choose a cable and a connection point below, then press Connect. Optional: drag a labeled plug to its matching socket. Power off and disconnect AC before internal work.'};
  const toolHint={inspect:toolHelp.inspect,move:toolHelp.move,cables:toolHelp.cables,screwdriver:toolHelp.screwdriver,paste:toolHelp.paste,clean:toolHelp.clean};
  function feedback(message){const element=$('[data-asm-feedback]');if(typeof message==='string'&&element.textContent!==message)element.textContent=message;}
  function dispatch(action){cancel();if(disposed||!visible||doc.hidden||typeof action!=='string'||action.startsWith('asm-')&&!relevantAction(action))return;const response=onAction(action);if(!disposed&&response)feedback(response.message);return response;}
  function allowed(kind,id){return allTools||guidance[kind].includes(id);}
  function relevantAction(id){
    if(allTools)return true;
    const screw=/^asm-(?:tighten|loosen)-(panel|psu|board|cooler|gpu|ssd)-[0-3]$/.exec(id);
    if(screw)return allowed('tools','screwdriver')&&allowed('screws',screw[1]);
    const part=/^asm-(?:fit|remove)-(panel|psu|board|cpu|cooler|ram|gpu|ssd)$/.exec(id);
    if(part)return allowed('tools','move')&&allowed('groups',part[1]);
    const clip=/^asm-(?:open|close)-(retention|ram-clips|pcie-latch)$/.exec(id);
    if(clip)return allowed('tools','move')&&allowed('groups',{retention:'cpu','ram-clips':'ram','pcie-latch':'gpu'}[clip[1]]);
    if(id==='asm-clean-paste')return allowed('tools','clean')&&allowed('groups','paste');
    if(id==='asm-apply-paste'||id==='asm-excess-paste')return allowed('tools','paste')&&allowed('groups','paste');
    const cable=/^asm-(?:connect|disconnect)-(.+)$/.exec(id);
    if(cable)return allowed('tools','cables')&&allowed('cables',cable[1]==='display'?'hdmi-monitor':cable[1]);
    return false;
  }
  function allowedPicture(id){
    if(id==='open-document')return true;
    if(id.startsWith('cable-'))return allowed('cables',id.slice(6));
    if(id.startsWith('port-'))return allowed('tools','cables')&&ASSEMBLY_CABLES.filter(item=>allowed('cables',item.id)).some(item=>item.sockets.some(socket=>'port-'+socket.id===id));
    const fastener=/^(panel|psu|board|cooler|gpu|ssd)-[0-3]$/.exec(id);
    return fastener?allowed('screws',fastener[1]):allowed('groups',id);
  }
  function syncContext(){
    $('[data-asm-ticket-title]').textContent=guidance.title;
    $('[data-asm-instruction]').textContent=guidance.instruction;
    root.querySelectorAll('[data-asm-tool]').forEach(element=>{element.hidden=!allowed('tools',element.dataset.asmTool);});
    root.querySelectorAll('[data-asm-part]').forEach(element=>{element.hidden=!allowed('groups',element.dataset.asmPart);});
    $('[data-asm-build-help]').hidden=!allTools&&!guidance.groups.includes('panel');
    const picker=$('[data-asm-select]');picker.innerHTML=GROUPS.filter(([key])=>allowed('groups',key)).map(([key,label])=>`<option value="${key}">${escape(label)}</option>`).join('');picker.value=selected;
  }
  function syncActivity(){sceneHost.setAttribute('data-asm-active',String(visible&&!doc.hidden&&!disposed));}
  function renderActivity(){
    $('[data-asm-activity-label]').textContent=activity.status.label;
    $('[data-asm-activity-detail]').textContent=activity.booted?'Inspect the monitor and check the original task against your results.':activity.powered?'Power is active. Inspect the evidence, then test your explanation.':activity.standby?'The PC is off and fans are stopped. Finish internal work before startup.':'Fans are stopped. Inspect the power state before testing.';
    $('[data-asm-diagnostic-detail]').textContent=activity.startup.reason||activity.display.detail||activity.status.detail;
    $('[data-asm-component-status]').textContent=[['Motherboard',activity.boardPowered],['CPU',activity.cpuPowered],['Memory',activity.ramPowered],['Graphics',activity.gpuPowered],['SSD',activity.ssdPowered]].map(([label,powered])=>`${label}: ${powered?'powered':'not powered'}`).join(' · ');
    $('[data-asm-fan-status]').textContent=[['CPU cooler',activity.cpuFan],['Power supply',activity.psuFan],['Graphics card',activity.gpuFan]].map(([label,running])=>`${label} fan: ${running?'running':'stopped'}`).join(' · ');
    const monitorText=$('[data-asm-monitor-readout]');if(monitorText.textContent!==activity.display.readout)monitorText.textContent=activity.display.readout;
    syncActivity();
  }
  function renderTools(){
    root.querySelectorAll('[data-asm-tool]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.asmTool===activeTool)));
    $('[data-asm-tool-help]').textContent=activeTool==='cables'?cableHelp():toolHelp[activeTool];
    $('[data-asm-tool-summary]').textContent={cables:'Cable controls',screwdriver:'Screw controls',move:'Move part controls',paste:'Thermal paste controls',clean:'Cleaning controls',inspect:'Tool controls'}[activeTool];
    $('[data-asm-tool-drawer]').hidden=activeTool==='inspect';
    const target=$('[data-asm-tool-controls]');
    target.setAttribute('data-cable-mode',String(activeTool==='cables'));
    if(activeTool==='screwdriver')target.innerHTML=`<label>Choose a screw<select aria-label="Choose a screw" data-asm-fastener>${Object.entries(ASSEMBLY_FASTENERS).filter(([group])=>allowed('screws',group)).flatMap(([group,spec])=>Array.from({length:spec.count},(_,i)=>`<option value="${group}-${i}" ${selectedScrew===`${group}-${i}`?'selected':''}>${escape(spec.label)} screw ${i+1}</option>`)).join('')}</select></label><button type="button" data-asm-use-tool="turn">Turn selected screw</button>`;
    else if(activeTool==='cables'){
      const cable=ASSEMBLY_CABLES.find(item=>item.id===selectedCable);
      target.innerHTML=`<label>Choose a cable<select aria-label="Choose a cable" data-asm-cable>${ASSEMBLY_CABLES.filter(item=>allowed('cables',item.id)).map(item=>`<option value="${item.id}" ${item.id===selectedCable?'selected':''}>${escape(item.label)}</option>`).join('')}</select></label><label>Choose a connection point<select aria-label="Choose a connection point" data-asm-cable-target>${cable.sockets.map(socket=>`<option value="${socket.id}" ${socket.id===selectedSocket?'selected':''}>${escape(socket.label)}</option>`).join('')}</select></label><button type="button" data-asm-cable-action="connect">Connect selected cable</button><button type="button" data-asm-cable-action="disconnect">Disconnect selected cable</button><p class="asm-cable-state" data-asm-cable-state role="status"></p>`;
      renderCableStatus();
    }
    else if(activeTool==='paste'||activeTool==='clean')target.innerHTML=`<button type="button" data-asm-use-tool="apply">${activeTool==='paste'?'Apply pea-sized paste to CPU':'Clean CPU and cooler surfaces'}</button>`;
    else if(activeTool==='move')target.innerHTML='<span>Choose a part in the component list or picture.</span><button type="button" data-asm-use-tool="fit">Fit selected part</button><button type="button" data-asm-use-tool="remove">Return selected part to tray</button>';
    else target.innerHTML='';
  }
  function renderCableStatus(){
    const field=$('[data-asm-cable-state]');if(!field||activeTool!=='cables')return;
    const cable=ASSEMBLY_CABLES.find(item=>item.id===selectedCable),socket=cableConnection(current,current.assembly,selectedCable);
    field.textContent=`${cable.label}: ${socket?`connected at ${cable.sockets.find(item=>item.id===socket)?.label||'its socket'}`:'disconnected · end parked'}.${cable.internal?' Internal work requires PC off, AC disconnected, and the side panel removed.':selectedCable==='ac'?' Power off before disconnecting AC.':' External HDMI · check both cable ends and the monitor source before testing.'}`;
  }
  function cableHelp(){const cable=ASSEMBLY_CABLES.find(item=>item.id===selectedCable);return 'Choose a cable and matching socket, then press Connect. You can also drag the labeled plug to its socket or cable rest.'+(cable.internal?' Power off, disconnect AC and remove the side panel before internal cable work.':cable.id==='ac'?' Power off the virtual PC before unplugging AC.':' Check both HDMI ends and the monitor source.');}
  function chooseCable(id){const cable=ASSEMBLY_CABLES.find(item=>item.id===id);if(!cable||!allowed('cables',id))return;const restoreFocus=doc.activeElement===$('[data-asm-cable]');cancel();selectedCable=id;selectedSocket=cable.sockets[0].id;renderTools();if(restoreFocus)$('[data-asm-cable]')?.focus({preventScroll:true});}
  function chooseTool(id){if(!ASSEMBLY_TOOLS.some(tool=>tool.id===id)||!allowed('tools',id))return;cancel();activeTool=id;if(id==='paste'||id==='clean')select('paste',false);renderTools();renderPicture();if(id!=='inspect')$('[data-asm-tool-drawer]').open=true;feedback(id==='cables'?cableHelp():toolHint[id]);}
  function select(id,reveal=true) {
    if(typeof id!=='string'||!allowedPicture(id))return;
    if(id.startsWith('cable-')){chooseCable(id.slice(6));return;}
    if(id.startsWith('tool-')){chooseTool(id.slice(5));return;}
    const fastener=/^(panel|psu|board|cooler|gpu|ssd)-(\d)$/.exec(id);
    if(fastener&&Number(fastener[2])<ASSEMBLY_FASTENERS[fastener[1]].count){selectedScrew=id;if(activeTool==='screwdriver')renderTools();}
    if(!Object.hasOwn(NAMES,id)&&!fastener)return;
    const key=Object.hasOwn(NAMES,id)?id:groupFor(`asm-${id}`);
    selected=key;
    $('[data-asm-select]').value=key;

    renderControls();renderPicture();
    if(reveal){$('[data-asm-component-drawer]').open=true;feedback(`${NAMES[key]} selected. Part controls below show its available actions.`);}
  }
  function renderControls(focusAction) {
    const active=focusAction||(root.contains(doc.activeElement)?doc.activeElement?.dataset?.assemblyAction:null);
    const a=current.assembly;
    $('[data-asm-part-title]').textContent=NAMES[selected];
    const partStates={panel:`Side panel ${a.panelInstalled?'fitted':'set aside'}. ${a.panelScrews.filter(Boolean).length}/2 screws secured.`,board:`Motherboard ${current.boardInstalled?'on its standoffs':'in the tray'}. ${a.boardScrews.filter(Boolean).length}/4 screws secured.`,cpu:`CPU ${current.cpuInstalled?'seated':'in the tray'}. Retention ${a.retentionOpen?'open':'closed'}.`,paste:`Thermal interface: ${a.paste==='pea'?'fresh pea-sized paste':a.paste==='clean'?'clean surfaces':a.paste==='excess'?'too much paste':'used paste — clean and reapply'}.`,cooler:`Cooler ${current.coolerInstalled?'fitted':'in the tray'}. ${a.coolerScrews.filter(Boolean).length}/4 screws secured. Fan lead ${a.cpuFanConnected?'connected':'disconnected'}.`,ram:`Memory ${current.ramSeated?'seated':'in the tray / not fully seated'}. Clips ${a.ramClipsOpen?'open':'closed'}.`,gpu:`Graphics card ${current.gpuInstalled?'fitted':'in the tray'}. ${a.gpuScrews.filter(Boolean).length}/2 bracket screws. Latch ${a.pcieLatchOpen?'open':'closed'}.`,ssd:`Original SSD ${current.originalDriveInstalled?'in its bay':'safely in the tray'}. ${a.ssdScrews.filter(Boolean).length}/2 screws. OS and files preserved.`,cables:`ATX ${current.atxConnected?'✓':'○'} · CPU ${current.cpuPowerConnected?'✓':'○'} · GPU ${current.gpuPowerConnected?'✓':'○'} · SATA data ${current.sataDataConnected?'✓':'○'} · SATA power ${current.sataPowerConnected?'✓':'○'} · Front panel ${current.frontPanelConnected?'✓':'○'}`,display:`HDMI PC end ${current.pcVideoConnected!==false?'connected':'disconnected'}; monitor end ${current.signalConnected?'connected':'disconnected'}. PC output: ${current.videoPort}. Monitor source: ${current.monitorInput}.`};
    partStates.psu=`Power supply ${a.psuInstalled?'fitted':'in the tray'}. ${a.psuScrews.filter(Boolean).length}/4 mounting screws. Disconnect all PSU power leads before removal.`;
    $('[data-asm-part-state]').textContent=partStates[selected];
    const currentOperation = id => {
      const screw=/^asm-(tighten|loosen)-(panel|psu|board|cooler|gpu|ssd)-(\d)$/.exec(id);
      if(screw)return (screw[1]==='loosen')===a[screw[2]+'Screws'][Number(screw[3])];
      const part=/^asm-(fit|remove)-(panel|psu|board|cpu|cooler|ram|gpu|ssd)$/.exec(id);
      if(part){const fitted={panel:a.panelInstalled,psu:a.psuInstalled,board:current.boardInstalled,cpu:current.cpuInstalled,cooler:current.coolerInstalled,ram:current.ramSeated,gpu:current.gpuInstalled,ssd:current.originalDriveInstalled}[part[2]];return (part[1]==='remove')===fitted;}
      const clip=/^asm-(open|close)-(retention|ram-clips|pcie-latch)$/.exec(id);
      if(clip)return (clip[1]==='close')===a[{retention:'retentionOpen','ram-clips':'ramClipsOpen','pcie-latch':'pcieLatchOpen'}[clip[2]]];
      const cable=/^asm-(connect|disconnect)-(.+)$/.exec(id);
      if(cable){const fitted=cable[2]==='cpu-fan'?a.cpuFanConnected:current[{'atx':'atxConnected','eps':'cpuPowerConnected','gpu-power':'gpuPowerConnected','sata-data':'sataDataConnected','sata-power':'sataPowerConnected','front-panel':'frontPanelConnected','display':'signalConnected'}[cable[2]]];return (cable[1]==='disconnect')===fitted;}
      return true;
    };
    const actions=assemblyActions(current,a).filter(item=>groupFor(item.id)===selected&&currentOperation(item.id)&&relevantAction(item.id));
    $('[data-asm-actions]').innerHTML=actions.map(item=>`<button type="button" data-assembly-action="${escape(item.id)}" class="${item.disabled?'asm-action-wait':'asm-action-ready'}" title="${escape(item.reason||'Ready to do')}">${escape(item.label)}</button>`).join('');
    root.querySelectorAll('[data-asm-part]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.asmPart===selected)));
    const focusable=el=>!!el&&!el.hidden&&!el.disabled&&!el.closest?.('[hidden]')&&!el.closest?.('details:not([open])');
    const controls=[...root.querySelectorAll('[data-assembly-action]')].filter(focusable);
    if(active){
      const powerOrder=['power-off','unplug','plug-in','boot','open-document'];
      const target=controls.find(el=>el.dataset.assemblyAction===active);
      if(powerOrder.includes(active)){
        // A completed power step can hide its own button. Continue within the
        // visible power strip rather than focusing a closed component drawer.
        const next=controls.find(el=>powerOrder.indexOf(el.dataset.assemblyAction)>powerOrder.indexOf(active));
        (target||next||controls.find(el=>el.dataset.assemblyAction==='boot'))?.focus({preventScroll:true});
      }else{
        const nextPart=$('[data-asm-actions] button');
        (target||(focusable(nextPart)?nextPart:null)||(focusable($('[data-asm-select]'))?$('[data-asm-select]'):null))?.focus({preventScroll:true});
      }
    }
  }
  function update(next) {
    // Capture before changing hidden: browsers may immediately blur a focused
    // button when a completed power step removes it from the layout.
    const focusAction=root.contains(doc.activeElement)?doc.activeElement?.dataset?.assemblyAction:null;
    current=next;guidance=workbenchGuidance(current);activity=pcActivity(current);syncContext();renderActivity();
    $('[data-asm-power]').textContent=activity.power.label;
    const reason=assemblyFailure(current,current.assembly);
    $('[data-asm-next]').textContent=current.pcOn?'Power off before internal work.':current.acConnected?'Unplug AC before internal work.':'Safe for internal work.';
    root.querySelectorAll('[data-assembly-action]').forEach(el=>{if(el.dataset.assemblyAction==='power-off')el.hidden=!current.pcOn;if(el.dataset.assemblyAction==='unplug')el.hidden=!current.acConnected;if(el.dataset.assemblyAction==='plug-in')el.hidden=current.acConnected;});
    $('[data-asm-delivery]').textContent=activity.documentOpened?'Original lesson file opened. Explain your investigation in Check & explain.':activity.booted?'Original OS loaded. Check the monitor, then choose Open lesson.':reason?'Test PC checks your repair, including fasteners, cooling and cables.':'Assembly checks ready. Connect AC, then choose Test PC.';
    renderControls(focusAction);renderCableStatus();renderPicture();
  }
  function click(event) {
    if(disposed||!visible||doc.hidden)return;
    const picture=event.target.closest?.('[data-asm-picture]');
    if(picture&&root.contains(picture)){if(suppressClick){suppressClick=false;return;}activatePicture(picture.dataset.asmPicture);return;}
    const target=event.target.closest('button');if(!target||!root.contains(target))return;
    if(target.dataset.asmReveal){$('[data-asm-component-drawer]').open=true;$('[data-asm-select]').focus({preventScroll:true});return;}
    if(target.dataset.assemblyAction){dispatch(target.dataset.assemblyAction);return;}
    if(target.dataset.asmTool){chooseTool(target.dataset.asmTool);return;}
    if(target.dataset.asmCableAction){if(!['connect','disconnect'].includes(target.dataset.asmCableAction))return;const mapped=assemblyCableAction(current,current.assembly,selectedCable,target.dataset.asmCableAction==='disconnect'?'cable-rest':selectedSocket);if(mapped.action)dispatch(mapped.action);else feedback(mapped.message);return;}
    if(target.dataset.asmUseTool){
      const id=activeTool==='screwdriver'?selectedScrew:activeTool==='paste'||activeTool==='clean'?'cpu':selected;
      const mapped=assemblyToolAction(current,current.assembly,activeTool,id,target.dataset.asmUseTool==='remove'?'remove':'fit');
      if(mapped.action)dispatch(mapped.action);else feedback(mapped.message);return;
    }
    if(target.dataset.asmPart){select(target.dataset.asmPart);return;}
  }
  function change(event){if(disposed||!visible)return;if(event.target.matches('[data-asm-all]')){cancel();allTools=event.target.checked===true;if(!allowed('groups',selected))selected=guidance.initialPart;if(!allowed('tools',activeTool))activeTool='inspect';if(!allowed('cables',selectedCable)){selectedCable=guidance.initialCable;selectedSocket=ASSEMBLY_CABLES.find(item=>item.id===selectedCable).sockets[0].id;}if(!allowed('screws',selectedScrew.split('-')[0]))selectedScrew=(guidance.screws[0]||'panel')+'-0';syncContext();renderTools();renderControls();renderPicture();return;}if(event.target.matches('[data-asm-select]')){if(Object.hasOwn(NAMES,event.target.value)&&allowed('groups',event.target.value))select(event.target.value);}else if(event.target.matches('[data-asm-fastener]')){if(/^(panel|psu|board|cooler|gpu|ssd)-[0-3]$/.test(event.target.value)&&allowed('screws',event.target.value.split('-')[0])&&Number(event.target.value.split('-').at(-1))<ASSEMBLY_FASTENERS[event.target.value.split('-')[0]].count){selectedScrew=event.target.value;renderPicture();}}else if(event.target.matches('[data-asm-cable]')){chooseCable(event.target.value);renderPicture();}else if(event.target.matches('[data-asm-cable-target]')){if(ASSEMBLY_CABLES.find(item=>item.id===selectedCable).sockets.some(socket=>socket.id===event.target.value)){cancel();selectedSocket=event.target.value;renderPicture();}}}
  function renderPicture(){
    const focused=doc.activeElement?.dataset?.asmPicture;
    const s={...current,selectedPart:({psu:'power',ssd:'storage',cables:'sata'})[selected]||selected};
    let markup=benchSvg(s);
    const a=current.assembly;
    const point=(id,x,y,label,body='',extra='')=>!allowedPicture(id)?`<g>${body}</g>`:`<g role="button" tabindex="0" class="asm-svg-target ${selected===id?'asm-svg-selected':''}" aria-label="${escape(label)}" data-asm-picture="${escape(id)}" data-asm-drop="${escape(id)}" ${extra}><title>${escape(label)}</title><rect x="${x-15}" y="${y-15}" width="30" height="30" rx="4" fill="transparent"/>${body||`<circle cx="${x}" cy="${y}" r="8" fill="#203248" stroke="#68dbc4"/><path d="M${x-4} ${y}h8M${x} ${y-4}v8" stroke="#c1d5de"/>`}</g>`;
    const videoY=s.videoPort==='gpu'?351:221;
    const monitorEnd=s.signalConnected?'M340 328':'M314 355';
    const pcCableMounted=s.pcVideoConnected&&(s.videoPort==='gpu'?s.gpuInstalled:s.boardInstalled);
    const pcEnd=pcCableMounted?`L450 ${videoY}`:'L390 365';
    let overlay=`<g class="asm-full-cable-path" data-video-pc-connected="${s.pcVideoConnected}" data-video-monitor-connected="${s.signalConnected}"><path d="${monitorEnd} C383 335 386 ${videoY} 415 ${videoY} ${pcEnd}" fill="none" stroke="#d3ac60" stroke-width="7"/><path d="${monitorEnd} C383 335 386 ${videoY} 415 ${videoY} ${pcEnd}" fill="none" stroke="#5b482b" stroke-width="2"/>${!s.signalConnected?'<text x="35" y="368" fill="#e5b768" font-size="11">Monitor HDMI end disconnected</text>':''}${!s.pcVideoConnected?'<text x="35" y="385" fill="#e5b768" font-size="11">PC HDMI end disconnected</text>':''}</g>`;
    if(s.acConnected&&a.psuInstalled)overlay+='<path class="asm-full-ac-path" d="M764 240V279Q764 298 791 298H849V603H785" fill="none" stroke="#89969f" stroke-width="7"/>';
    {
      const screwPositions={panel:[[422,95],[821,563]],psu:[[718,113],[808,113],[718,247],[808,247]],board:[[445,119],[681,119],[445,444],[681,444]],cooler:[[488,169],[583,169],[488,264],[583,264]],gpu:[[435,321],[435,389]],ssd:[[723,378],[801,489]]};
      if(activeTool==='screwdriver')for(const[group,points]of Object.entries(screwPositions).filter(([group])=>allowed('screws',group)))points.forEach(([x,y],i)=>{const secured=a[group+'Screws'][i];overlay+=point(group+'-'+i,x,y,`${NAMES[group]} screw ${i+1}: ${secured?'secured; loosen':'loose; tighten'}`,`<circle cx="${x}" cy="${y}" r="11" fill="${secured?'#136259':'#253248'}" stroke="#85e9d1" stroke-width="2"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#fff" font-size="11">${i+1}</text>`);});
      if(a.paste!=='clean'&&current.cpuInstalled&&!current.coolerInstalled)overlay+=`<circle cx="535" cy="216" r="${a.paste==='excess'?20:a.paste==='pea'?8:15}" fill="${a.paste==='dry'?'#8c9296':'#c9d3d8'}" pointer-events="none"/>`;
      overlay+=point('panel',617,72,'Case side panel: '+(a.panelInstalled?'fitted':'set aside'),`<rect x="489" y="57" width="260" height="25" rx="4" fill="#122632" stroke="#496779"/><text x="619" y="74" text-anchor="middle" fill="#b7d7e3" font-size="11">SIDE PANEL ${a.panelInstalled?'FITTED · X-RAY VIEW':'SET ASIDE'}</text>`);
      {
        const loose=[['panel',!a.panelInstalled],['psu',!a.psuInstalled],['board',!current.boardInstalled],['cpu',!current.cpuInstalled],['cooler',!current.coolerInstalled],['ram',!current.ramSeated],['gpu',!current.gpuInstalled],['ssd',!current.originalDriveInstalled]].filter(([id,missing])=>missing&&allowed('groups',id));
        overlay+=`<g data-asm-drop="tray" class="asm-svg-tray"><rect x="27" y="390" width="340" height="165" rx="8" fill="#121f2d" stroke="#5b8a95" stroke-dasharray="6 4"/><text x="44" y="414" fill="#9de5d5" font-size="12">PARTS TRAY · DROP A REMOVED PART HERE</text>${loose.map(([id],i)=>point(id,61+(i%3)*108,450+Math.floor(i/3)*35,NAMES[id]+': in parts tray',`<rect x="${38+(i%3)*108}" y="${434+Math.floor(i/3)*35}" width="99" height="28" rx="3" fill="#203248" stroke="#3d7d7b"/><text x="${87+(i%3)*108}" y="${452+Math.floor(i/3)*35}" text-anchor="middle" fill="#cbe5eb" font-size="10">${escape({panel:'Side panel',psu:'PSU',board:'Motherboard',cpu:'CPU',cooler:'Cooler',ram:'RAM',gpu:'Graphics',ssd:'SSD'}[id])}</text>`).replace(`data-asm-drop="${id}"`,'data-asm-drop="tray"')).join('')}</g>`;
      }
    }
    if(activeTool==='cables'){
      const cable=ASSEMBLY_CABLES.find(item=>item.id===selectedCable),sockets=cable.sockets;
      overlay+=`<g class="asm-svg-cable-key"><rect x="30" y="470" width="337" height="90" rx="6" fill="#102d32" stroke="#49bfa9"/>${point('cable-'+selectedCable,70,501,cable.label+': movable plug',`<rect x="45" y="485" width="50" height="28" rx="4" fill="#1b4e50" stroke="#76edcf"/><text x="105" y="501" fill="#e0f7f2" font-size="12">${escape(cable.label)}</text><text x="48" y="540" fill="#9ac5ca" font-size="11">Drag plug to socket · or use Cable controls</text>`)}<g data-asm-drop="tray"><rect x="30" y="563" width="337" height="34" rx="4" fill="#283046" stroke="#9f9da6"/><text x="198" y="585" text-anchor="middle" fill="#d6dce5" font-size="12">CABLE REST · DROP TO DISCONNECT</text></g></g>`;
      const coords={ 'ac-inlet':[764,240],'hdmi-gpu':[450,351],'hdmi-board':[449,221],'monitor-hdmi':[340,328],'atx-header':[691,204],'eps-header':[484,117],'gpu-power-header':[660,328],'ssd-data':[739,480],'ssd-power':[771,480],'front-panel-header':[591,439],'cpu-fan-header':[610,181]};
      for(const socket of sockets){if(socket.id==='ac-inlet'&&!a.psuInstalled)continue;const [x,y]=coords[socket.id]||[790,480];overlay+=point('port-'+socket.id,x,y,socket.label,`<rect x="${x-12}" y="${y-12}" width="24" height="24" rx="3" fill="#103d3a" stroke="#8dffe3" stroke-width="2"/><text x="${x}" y="${y-20}" text-anchor="middle" fill="#a9f8e6" font-size="11">${escape(socket.label)}</text>`);}
    }
    markup=markup.replace('</svg>',overlay+'</svg>');sceneHost.innerHTML=markup;sceneHost.style&&(sceneHost.style.touchAction=['move','cables'].includes(activeTool)?'none':'pan-y');
    syncActivity();
    if(focused)root.querySelector(`[data-asm-picture="${focused}"]`)?.focus({preventScroll:true});
  }

function svgDefs() {
  return `<defs>
    <linearGradient id="hw-chassis" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#424d5b"/><stop offset=".3" stop-color="#202b38"/><stop offset="1" stop-color="#121b27"/></linearGradient>
    <linearGradient id="hw-bezel" x2="0" y2="1"><stop stop-color="#35404f"/><stop offset="1" stop-color="#111a28"/></linearGradient>
    <linearGradient id="hw-screen" x2="1" y2="1"><stop stop-color="#0c4965"/><stop offset=".6" stop-color="#102d52"/><stop offset="1" stop-color="#111b31"/></linearGradient>
    <linearGradient id="hw-board" x2="1" y2="1"><stop stop-color="#143e38"/><stop offset="1" stop-color="#092b29"/></linearGradient>
    <linearGradient id="hw-metal" x2="1" y2="1"><stop stop-color="#8a95a4"/><stop offset=".5" stop-color="#3e4d5e"/><stop offset="1" stop-color="#718096"/></linearGradient>
    <pattern id="hw-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#173042" stroke-width=".6"/></pattern>
    <pattern id="hw-vents" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.1" fill="#090f18"/></pattern>
    <filter id="hw-shadow"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity=".35"/></filter>
    <filter id="hw-glow"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>`;
}

function fanRotor(kind,x,y,radius,running){
  return `<g class="asm-fan asm-fan-${kind}" data-running="${running}" aria-hidden="true" style="transform-origin:${x}px ${y}px">${[0,90,180,270].map(angle=>`<path d="M${x} ${y}C${x-radius*.9} ${y-radius*.2} ${x-radius*.8} ${y-radius*.85} ${x-radius*.12} ${y-radius*.85}C${x+radius*.22} ${y-radius*.55} ${x+radius*.2} ${y-radius*.18} ${x} ${y}Z" transform="rotate(${angle} ${x} ${y})" fill="#486b7b" stroke="#6e8d9b" stroke-width="1"/>`).join('')}</g>`;
}
function screw(x, y) { return `<g class="hw-screw"><circle cx="${x}" cy="${y}" r="4.2" fill="#485568" stroke="#8290a1"/><path d="M${x-2} ${y}h4M${x} ${y-2}v4" stroke="#13202b" stroke-width="1.4"/></g>`; }
function interactive(part, label, body, selected) {
  const id=({power:'psu',storage:'ssd',sata:'cables',atx:'cable-atx',eps:'cable-eps',front:'cable-front-panel'})[part]||part;
  if(part==='power'&&!current.assembly.psuInstalled){
    label='empty power-supply bay';
    body='<rect x="309" y="55" width="105" height="149" rx="4" fill="#101b27" stroke="#607489" stroke-width="2" stroke-dasharray="7 5"/><text x="362" y="119" text-anchor="middle" fill="#9bb4c5" font-size="11">EMPTY PSU BAY</text><text x="362" y="140" text-anchor="middle" fill="#708b9e" font-size="8">Power supply in tray</text>';
  }
  if(!allowedPicture(id))return `<g>${body}</g>`;
  return `<g class="hw-hit ${selected === part ? 'hw-hit-selected' : ''}" role="button" tabindex="0" aria-label="Inspect ${label}" data-asm-picture="${id}" data-asm-drop="${id}"><title>${label}: activate to inspect</title>${body}</g>`; }
function monitorMessage(display,x,y,width,height){
  const screen=display.screen,firmware=['firmware','boot-manager','interlock'].includes(screen.stage);
  const titleSize=Math.min(20,Math.max(13,width*.043)),lineSize=Math.min(14,Math.max(9,width*.028));
  const lineX=firmware?x+width*.1:x+width/2,anchor=firmware?'start':'middle',gap=Math.min(23,height*.073);
  return `<g class="asm-monitor-message" data-monitor-stage="${escape(screen.stage)}"><rect x="${x+15}" y="${y+15}" width="${width-30}" height="${height-48}" fill="${firmware?'#101921':'#040b12'}"/><text x="${x+width/2}" y="${y+height*.16}" text-anchor="middle" fill="#779aa9" font-size="${Math.min(14,lineSize)}" letter-spacing="1">${escape(screen.brand)}</text><text x="${x+width/2}" y="${y+height*.32}" text-anchor="middle" fill="${firmware?'#e9c17a':'#d5e5ed'}" font-size="${titleSize}" font-weight="700">${escape(display.label)}</text>${screen.lines.map((line,index)=>`<text x="${lineX}" y="${y+height*.47+index*gap}" text-anchor="${anchor}" fill="#9bb4c4" font-size="${lineSize}">${escape(line)}</text>`).join('')}<text x="${x+width/2}" y="${y+height*.81}" text-anchor="middle" fill="#6c8c9f" font-size="${Math.min(12,lineSize)}">SELECTED INPUT · ${escape(screen.source)}</text></g>`;
}
function monitor(s, x=30, y=91, width=330, height=227) {
  const screen=activity.display;
  const isReady=screen.desktop;
  const inner = isReady&&screen.documentOpened ? `<rect x="${x+16}" y="${y+16}" width="${width-32}" height="${height-51}" rx="2" fill="#e7edf2"/><rect x="${x+16}" y="${y+16}" width="${width-32}" height="22" fill="#15547d"/><text x="${x+27}" y="${y+30}" fill="white" font-size="9">Lesson_Practice_File.docx</text><rect x="${x+64}" y="${y+52}" width="${width-128}" height="${height-106}" fill="#fff"/><text x="${x+78}" y="${y+72}" font-size="10" fill="#1b2b3d" font-weight="700">Classroom technology practice</text><path d="M${x+79} ${y+87}h${width-158}m-${width-158} 13h${width-168}m-${width-168} 13h${width-174}m-${width-174} 13h${width-158}" stroke="#aebdcb" stroke-width="2"/><rect x="${x+25}" y="${y+height-55}" width="${width-50}" height="13" rx="3" fill="#d6ede8"/><text x="${x+width/2}" y="${y+height-46}" text-anchor="middle" font-size="8" fill="#10624e">Original file opened · customer task delivered</text>` : isReady ? `<rect x="${x+15}" y="${y+15}" width="${width-30}" height="${height-48}" fill="url(#hw-screen)"/><path d="M${x+165} ${y+27}l75 30-30 100-65-40z" fill="#21cbb5" opacity=".1"/><g role="button" tabindex="0" aria-label="Open Lesson Practice File document" data-asm-picture="open-document" class="hw-document-launch"><rect x="${x+35}" y="${y+39}" width="112" height="69" rx="6" fill="#183b53" stroke="#5fdfd0"/><path d="M${x+48} ${y+51}h19l7 7v24h-26z" fill="#dcebf1"/><path d="M${x+67} ${y+51}v8h7" fill="none" stroke="#20628c"/><text x="${x+60}" y="${y+75}" text-anchor="middle" fill="#13517c" font-size="13" font-weight="800">W</text><text x="${x+84}" y="${y+63}" fill="#fff" font-size="9">Open lesson</text><text x="${x+84}" y="${y+77}" fill="#a4d4dd" font-size="8">.docx · original file</text><text x="${x+91}" y="${y+98}" text-anchor="middle" fill="#6ee4ce" font-size="8">CLICK TO VERIFY DELIVERY</text></g><rect x="${x+15}" y="${y+height-51}" width="${width-30}" height="18" fill="#0a1929"/><rect x="${x+26}" y="${y+height-45}" width="8" height="8" fill="#57d5d0"/><text x="${x+48}" y="${y+height-38}" fill="#afc6d4" font-size="8">Classroom Desktop</text>` : monitorMessage(screen,x,y,width,height);
  return `<g filter="url(#hw-shadow)" data-asm-monitor-screen="${escape(screen.screen.code)}" role="group" aria-label="${escape(screen.readout)}"><title>${escape(screen.readout)}</title><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="url(#hw-bezel)" stroke="#5e6e80" stroke-width="2"/>${inner}<circle cx="${x+width-22}" cy="${y+height-14}" r="3" fill="${screen.signal?'#42d8af':'#b58b4b'}"/><text x="${x+width/2}" y="${y+height-13}" text-anchor="middle" fill="#8295aa" font-size="7" letter-spacing="2">CLASSROOM DISPLAY · HDMI</text><path d="M${x+width/2-17} ${y+height}v29h34v-29M${x+width/2-72} ${y+height+41}h144l-20-12h-104z" fill="#303d4c" stroke="#617086"/></g>`;
}

function benchSvg(s) {
  const selected = s.selectedPart;
  const pcb = s.boardInstalled;
  return `<svg class="hw-svg" viewBox="0 0 900 620" data-asm-view="full-xray" role="group" aria-label="Full PC X-ray workbench with monitor, motherboard, processor, DDR4 RAM, graphics card, power supply, and original SATA SSD">${svgDefs()}<rect width="900" height="620" fill="#0a1420"/><rect width="900" height="620" fill="url(#hw-grid)"/><text class="hw-bench-annotation" x="30" y="33" fill="#bdcddd" font-size="11" letter-spacing="2">CLASSROOM WORKSTATION / X-RAY SCHEMATIC</text>${monitor(s,25,70,340,232)}
  <g transform="translate(402 53)"><path d="M0 18L18 0h440v515l-18 18H0z" fill="#111b28" stroke="#667486" stroke-width="2"/><path d="M0 18h440V533M440 18l18-18" fill="none" stroke="#9ba7b6" stroke-opacity=".5"/><rect x="12" y="31" width="416" height="489" rx="3" fill="url(#hw-chassis)" stroke="#526172"/>${screw(21,42)}${screw(419,42)}${screw(21,510)}${screw(419,510)}<rect x="28" y="54" width="270" height="354" rx="7" fill="${pcb?'url(#hw-board)':'#172431'}" stroke="${pcb?'#397d6b':'#4a5a6d'}" stroke-width="2" ${!pcb?'stroke-dasharray="7 5"':''}/>
  ${pcb?`<g fill="none" stroke="#326554" stroke-width="1" opacity=".7"><path d="M59 82h99v54h65v135h48M45 208h72v67h97v100h65M57 217h46v74h83v110M188 78v53h58v221M38 332h61v51h97M47 90v66h25v49M133 71v32h51M158 303v37h-37v41M175 276h26v76h28"/><path d="M40 102h18v41h38M113 187v48h64v38M240 189h30v66M200 379h57"/></g><g fill="#c1ced1" stroke="#3a4b48">${[43,279].map(x=>[66,391].map(y=>screw(x,y)).join('')).join('')}</g><rect x="37" y="84" width="25" height="100" rx="2" fill="url(#hw-metal)"/><path d="M43 91v86m5-86v86m5-86v86" stroke="#17252c"/><rect x="78" y="67" width="89" height="20" rx="2" fill="#293740" stroke="#6e8290"/><path d="M84 72h77m-77 5h77m-77 5h77" stroke="#0c1b26"/><g fill="#9daaa6" stroke="#1e3c36"><circle cx="72" cy="92" r="5"/><circle cx="86" cy="92" r="5"/><circle cx="100" cy="92" r="5"/><circle cx="72" cy="107" r="5"/></g>`:`<text x="163" y="224" text-anchor="middle" fill="#53687a" font-size="13">MOTHERBOARD STANDOFFS</text><text x="163" y="245" text-anchor="middle" fill="#53687a" font-size="10">Install board before components</text>${[49,276].map(x=>[78,263,387].map(y=>`<circle cx="${x}" cy="${y}" r="5" fill="#9b865a"/>`).join('')).join('')}`}
  ${interactive('board','motherboard specifications',`<rect x="30" y="55" width="268" height="353" rx="6" fill="transparent"/><text x="39" y="401" fill="${pcb?'#67bca3':'#64788c'}" font-size="9">01 / MICRO-ATX · DDR4 · SATA</text>`,selected)}
  ${pcb?interactive('cpu','LGA processor and CPU socket',`<rect x="82" y="113" width="102" height="100" rx="5" fill="#202c32" stroke="#758e91" stroke-width="2"/><rect x="94" y="125" width="78" height="76" fill="${s.cpuInstalled?'url(#hw-metal)':'#18272a'}" stroke="#4c6267"/>${s.cpuInstalled?'<text x="133" y="165" text-anchor="middle" fill="#12242e" font-size="9" font-weight="700">PROCESSOR</text>':'<path d="M100 132l66 61m-66 0l66-61" stroke="#3b5156"/>'}<path d="M90 210h89v-89" fill="none" stroke="#b5bbbd" stroke-width="2"/><path d="M97 128l7 0-7 7z" fill="#d7ae54"/>`,selected):''}
  ${pcb&&s.coolerInstalled?interactive('cooler','processor cooler and fan',`<rect x="78" y="108" width="111" height="111" rx="8" fill="url(#hw-metal)" stroke="#8e9ca7"/><path d="M85 113v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101" stroke="#354653" stroke-width="2"/><circle cx="133" cy="163" r="47" fill="#172631" stroke="#627e8c" stroke-width="2"/><g class="hw-fan asm-fan asm-fan-cpu" data-running="${activity.cpuFan}" style="transform-origin:133px 163px">${[0,60,120,180,240,300].map(a=>`<path d="M133 163C101 151 99 126 115 123C137 121 137 141 133 163Z" transform="rotate(${a} 133 163)" fill="#44657a" stroke="#6c8e9e"/>`).join('')}</g><circle cx="133" cy="163" r="12" fill="#afc2cb" stroke="#233d4c"/>${screw(86,116)}${screw(181,116)}${screw(86,211)}${screw(181,211)}<text x="133" y="234" text-anchor="middle" fill="#86abae" font-size="8">CPU COOLER / CPU_FAN</text>`,selected):''}
  ${pcb?interactive('ram','DDR4 DIMM slot and memory',`<g transform="translate(215 90)"><rect width="19" height="169" rx="2" fill="#111e24" stroke="#597b6d"/><rect x="28" width="19" height="169" rx="2" fill="#111e24" stroke="#597b6d"/><path d="M8 7v152m28-152v152" stroke="#8a9d82" stroke-width="2"/>${s.ramSeated?'<rect x="27" y="3" width="21" height="162" rx="1" fill="#1f785c" stroke="#6cca9a"/><path d="M32 16v136m11-136v136" stroke="#d1b550"/><rect x="33" y="22" width="10" height="27" fill="#112d2c"/><rect x="33" y="57" width="10" height="27" fill="#112d2c"/><rect x="33" y="92" width="10" height="27" fill="#112d2c"/><rect x="33" y="127" width="10" height="24" fill="#112d2c"/><path d="M24 4h27v8H24zM24 156h27v8H24z" fill="#98b3a9"/>':s.caseId==='INC-103'?'<g transform="rotate(-7 37 83)"><rect x="27" y="-6" width="21" height="162" fill="#26775b" stroke="#c9a95e"/><rect x="33" y="18" width="9" height="105" fill="#122d2b"/></g><path d="M23 -2l-9-7m37 171l10 5" stroke="#efbd6c" stroke-width="3"/>':''}<text x="24" y="185" text-anchor="middle" fill="${s.ramSeated?'#84d4b0':'#bcb281'}" font-size="8">DDR4 · A2</text></g>`,selected):''}
  ${pcb?interactive('gpu','PCIe graphics card',`<rect x="52" y="276" width="215" height="17" fill="#152528" stroke="#607a70"/><path d="M59 283h198" stroke="#d0b46a" stroke-width="3"/>${s.gpuInstalled?`<rect x="48" y="263" width="229" height="77" rx="5" fill="#182d36" stroke="#729a9a" stroke-width="2"/><rect x="53" y="268" width="218" height="66" rx="4" fill="#243d48"/><circle cx="89" cy="301" r="25" fill="#112833" stroke="#738f99"/>${fanRotor('gpu',89,301,21,activity.gpuFan)}<circle cx="89" cy="301" r="6" fill="#94b4bd"/><text x="133" y="295" fill="#8ad6c9" font-size="10" font-weight="700">PCIe GRAPHICS</text><text x="133" y="311" fill="#8caab4" font-size="8">Dedicated display output</text><rect x="251" y="270" width="15" height="15" fill="#080f15" stroke="${s.gpuPowerConnected?'#c8af6a':'#8fa0a5'}"/><path d="M48 263H33v80h15" fill="none" stroke="#98a8b2" stroke-width="4"/>`:'<text x="158" y="312" text-anchor="middle" fill="#678d86" font-size="9">PCIe x16 · GRAPHICS SLOT</text>'}`,selected):''}
  ${pcb?interactive('sata','motherboard SATA data ports',`<rect x="237" y="354" width="47" height="27" rx="2" fill="#332d19" stroke="#9f9154"/><rect x="242" y="359" width="15" height="16" fill="#121c21"/><rect x="264" y="359" width="15" height="16" fill="#121c21"/><text x="261" y="394" text-anchor="middle" fill="#b3a476" font-size="7">SATA_1 / 2</text>`,selected):''}
  ${interactive('power','power supply',`<rect x="309" y="55" width="105" height="149" rx="4" fill="#151e2b" stroke="#7b8794" stroke-width="2"/><text x="362" y="75" text-anchor="middle" fill="#b4c3cf" font-size="9" font-weight="700">POWER SUPPLY</text><circle cx="362" cy="122" r="33" fill="url(#hw-vents)" stroke="#627387"/><circle cx="362" cy="122" r="10" fill="#263342"/>${fanRotor('psu',362,122,25,activity.psuFan)}<path class="asm-fixed-grille" d="M338 99l48 46m-48 0l48-46m-24-9v66m-33-33h66" stroke="#465a6b" stroke-width="2"/><text x="362" y="177" text-anchor="middle" fill="#7e93a6" font-size="8">ATX · 400 W</text><text x="362" y="191" text-anchor="middle" fill="${s.acConnected?'#edbd71':'#6fddbb'}" font-size="8">${s.acConnected?'AC CONNECTED':'AC DISCONNECTED'}</text>`,selected)}
  ${interactive('storage','original 2.5-inch SATA SSD',`<rect x="308" y="316" width="107" height="132" rx="6" fill="#18232f" stroke="#7d8c9e" stroke-width="2"/>${s.originalDriveInstalled?`<rect x="317" y="325" width="89" height="111" rx="4" fill="url(#hw-metal)"/><rect x="325" y="336" width="73" height="64" rx="2" fill="#142430"/><text x="361" y="354" text-anchor="middle" fill="#d3e3ea" font-size="10" font-weight="700">256 GB SSD</text><text x="361" y="372" text-anchor="middle" fill="#8eb3bd" font-size="8">ORIGINAL DRIVE</text><text x="361" y="388" text-anchor="middle" fill="#7f9baf" font-size="7">OS + CLASSROOM FILES</text><rect x="327" y="421" width="18" height="10" fill="#171e1f" stroke="#e2bb56"/><rect x="350" y="421" width="34" height="10" fill="#171e1f" stroke="#e2bb56"/>`:'<rect x="317" y="325" width="89" height="111" rx="4" fill="none" stroke="#40556b" stroke-dasharray="5 5"/><text x="361" y="375" text-anchor="middle" fill="#74889e" font-size="10">EMPTY BAY</text>'}<text x="360" y="465" text-anchor="middle" fill="#8aa2b5" font-size="8">2.5-INCH SATA DRIVE BAY</text>`,selected)}
  ${pcb?`${interactive('atx','24-pin motherboard power',`<rect x="282" y="125" width="13" height="64" rx="2" fill="#161c1f" stroke="${s.atxConnected?'#c6aa62':'#5a6e76'}"/><path d="M286 131v52m4-52v52" stroke="#9a9c86" stroke-dasharray="2 2"/>`,selected)}${interactive('eps','8-pin CPU power',`<rect x="65" y="60" width="35" height="12" fill="#14201f" stroke="${s.cpuPowerConnected?'#d4ba71':'#6a807d'}"/>`,selected)}${interactive('front','front panel header',`<rect x="173" y="380" width="35" height="12" fill="#14201f" stroke="${s.frontPanelConnected?'#a3cbd2':'#6a807d'}"/><text x="189" y="374" text-anchor="middle" fill="#83a199" font-size="6">F_PANEL</text>`,selected)}`:''}
  ${s.atxConnected&&pcb?'<path d="M315 156C301 153 309 150 296 151" fill="none" stroke="#b58b46" stroke-width="9"/><path d="M315 156C301 153 309 150 296 151" fill="none" stroke="#e3c56f" stroke-width="2"/>':''}${s.cpuPowerConnected&&pcb?'<path d="M315 108C300 38 158 38 83 59" fill="none" stroke="#1b1820" stroke-width="9"/><path d="M315 108C300 38 158 38 83 59" fill="none" stroke="#b39755" stroke-width="2"/>':''}${s.gpuPowerConnected&&s.gpuInstalled?'<path d="M315 183C299 215 302 247 264 275" fill="none" stroke="#22232a" stroke-width="8"/><path d="M315 183C299 215 302 247 264 275" fill="none" stroke="#c6a04a" stroke-width="2"/>':''}${s.sataDataConnected&&s.originalDriveInstalled&&pcb?'<path d="M250 368C285 368 279 429 330 429" fill="none" stroke="#e5a343" stroke-width="7"/><path d="M250 368C285 368 279 429 330 429" fill="none" stroke="#ffd27a" stroke-width="1.5"/>':''}${s.sataPowerConnected&&s.originalDriveInstalled?'<path d="M378 203V295Q378 307 394 307H418V425H378" fill="none" stroke="#0b1018" stroke-width="10"/><path d="M378 203V295Q378 307 394 307H418V425H378" fill="none" stroke="#5b7081" stroke-width="2"/>':''}${s.frontPanelConnected&&pcb?'<path d="M190 386V480H290" fill="none" stroke="#57909a" stroke-width="3"/>':''}
  <rect x="29" y="484" width="257" height="18" fill="url(#hw-vents)"/><text x="31" y="478" fill="#6c8196" font-size="8">CASE VENTILATION / KEEP CLEAR</text></g>
  <g class="hw-bench-annotation" transform="translate(28 392)"><rect width="335" height="155" rx="8" fill="#121f2d" stroke="#30475b"/><text x="17" y="25" fill="#a4b9cb" font-size="10" font-weight="700">COMPATIBILITY LABEL</text><text x="17" y="49" fill="#6f8ca1" font-size="10">MEMORY</text><text x="122" y="49" fill="#d4e3ec" font-size="11">DDR4 · 288-pin DIMM</text><text x="17" y="73" fill="#6f8ca1" font-size="10">STORAGE</text><text x="122" y="73" fill="#d4e3ec" font-size="11">2.5-inch SATA · 6 Gb/s</text><text x="17" y="97" fill="#6f8ca1" font-size="10">GRAPHICS</text><text x="122" y="97" fill="#d4e3ec" font-size="11">PCIe x16 · dedicated output</text><path d="M17 111h299" stroke="#2d4355"/><text x="17" y="134" fill="#6fdac4" font-size="9">Your real device is never accessed or changed.</text></g><text class="hw-bench-annotation" x="30" y="590" fill="#6d8ba2" font-size="10">SCHEMATIC WORKBENCH · ILLUSTRATIVE SCALE · TAP A LABELED COMPONENT</text></svg>`;
}

  function activatePicture(id){
    if(typeof id!=='string'||!allowedPicture(id))return;
    cancel();
    if(id==='open-document'){dispatch(id);return;}
    if(id.startsWith('port-')){if(activeTool==='cables'){const mapped=assemblyCableAction(current,current.assembly,selectedCable,id.slice(5));if(mapped.action)dispatch(mapped.action);else feedback(mapped.message);}return;}
    if(id.startsWith('cable-')){if(!ASSEMBLY_CABLES.some(cable=>cable.id===id.slice(6)))return;chooseTool('cables');chooseCable(id.slice(6));renderPicture();return;}
    select(id);
    if(['screwdriver','paste','clean'].includes(activeTool)){
      const mapped=assemblyToolAction(current,current.assembly,activeTool,id);
      if(mapped.action)dispatch(mapped.action);else feedback(mapped.message);
    }
  }
  function key(event){if(event.key==='Escape'){cancel();return;}if(['Enter',' '].includes(event.key)){const target=event.target.closest?.('[data-asm-picture]');if(target&&root.contains(target)){event.preventDefault();activatePicture(target.dataset.asmPicture);}}}
  function cancel(){if(drag){const previous=drag;drag=null;if(root.hasPointerCapture?.(previous.pointerId))root.releasePointerCapture(previous.pointerId);}sceneHost.removeAttribute?.('data-dragging');}
  function down(event){suppressClick=false;if(drag&&drag.pointerId!==event.pointerId){cancel();return;}if(disposed||!visible||doc.hidden||event.button>0||!['move','cables'].includes(activeTool))return;const target=event.target.closest?.('[data-asm-picture]');if(!target||!root.contains(target))return;const id=target.dataset.asmPicture;if(!allowedPicture(id))return;if(activeTool==='move'&&!['panel','psu','board','cpu','cooler','ram','gpu','ssd'].includes(id))return;if(activeTool==='cables'&&!ASSEMBLY_CABLES.some(item=>'cable-'+item.id===id))return;cancel();drag={id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false};}
  function move(event){if(!drag||drag.pointerId!==event.pointerId)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8&&!drag.moved)return;drag.moved=true;root.setPointerCapture?.(event.pointerId);sceneHost.setAttribute('data-dragging',activeTool);event.preventDefault?.();}
  function up(event){if(!drag||drag.pointerId!==event.pointerId)return;const previous=drag,moved=drag.moved;const target=doc.elementFromPoint?.(event.clientX,event.clientY)||event.target;const destination=root.contains(target)?target?.closest?.('[data-asm-drop]')?.dataset?.asmDrop||target?.closest?.('[data-asm-picture]')?.dataset?.asmPicture:undefined;cancel();if(!moved)return;suppressClick=true;let mapped;
    if(previous.id.startsWith('cable-'))mapped=assemblyCableAction(current,current.assembly,previous.id.slice(6),destination?.startsWith('port-')?destination.slice(5):destination==='tray'?'cable-rest':'');
    else if(destination===previous.id||destination==='tray')mapped=assemblyToolAction(current,current.assembly,'move',previous.id,destination==='tray'?'remove':'fit');
    if(mapped?.action)dispatch(mapped.action);else feedback(mapped?.message||'Move canceled. Release on the matching mount, labeled socket, or parts tray. Your equipment is unchanged.');
  }
  function visibility(){if(doc.hidden)cancel();syncActivity();}
  function outsideUp(event){if(drag&&!root.contains(event.target))cancel();}
  root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('keydown',key);root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel);root.addEventListener('lostpointercapture',cancel);doc.addEventListener?.('visibilitychange',visibility);doc.addEventListener?.('pointerup',outsideUp);doc.defaultView?.addEventListener?.('blur',cancel);
  update(state);renderTools();
  return{update(next){if(!disposed){cancel();update(next);}},cancel,setVisible(value){visible=!!value;if(!visible)cancel();syncActivity();},dispose(){if(disposed)return;disposed=true;cancel();syncActivity();for(const[name,handler]of [['click',click],['change',change],['keydown',key],['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel]])root.removeEventListener(name,handler);doc.removeEventListener?.('visibilitychange',visibility);doc.removeEventListener?.('pointerup',outsideUp);doc.defaultView?.removeEventListener?.('blur',cancel);}};
}
