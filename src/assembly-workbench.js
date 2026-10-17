import { assemblyActions, assemblyFailure, ASSEMBLY_FASTENERS } from './assembly-model.js?release=20261017-cables14';
import { ASSEMBLY_TOOLS, assemblyToolAction } from './assembly-tools.js?release=20261017-cables14';
import { ASSEMBLY_CABLES, cableConnection, assemblyCableAction } from './assembly-cables.js?release=20261017-cables14';

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

/** DOM controls are the complete interface. WebGL is a disposable view of this model. */
export function mountAssemblyWorkbench(root,{state,onAction}) {
  let current=state,selected='panel',scene=null,disposed=false,visible=!root.closest?.('[hidden]'),loading=false,loadRequested=false,sceneFailed=false;
  let sceneModule=null;
  let activeTool='inspect',selectedScrew='panel-0',selectedCable='hdmi-pc',selectedSocket='hdmi-gpu';
  const doc=root.ownerDocument;
  root.onclick=null;root.onkeydown=null;root.onchange=null;
  root.innerHTML=`<section class="asm-bench" aria-label="Detailed assembly workbench">
    <div class="asm-heading"><div><span class="hw-eyebrow">DETAILED EQUIPMENT LAB</span><h3>Inside the workstation</h3></div><span class="asm-badge">3D · assembly & teardown</span></div>
    <div class="asm-power" role="group" aria-label="Virtual PC power controls">${button('power-off','1. Power off')}${button('unplug','2. Disconnect AC')}${button('plug-in','3. Connect AC')}${button('boot','4. Power on / test')}<strong data-asm-power></strong></div>
    <p class="asm-next" data-asm-next></p>
    <section class="asm-toolbox" aria-label="Workbench tools"><div class="asm-tool-buttons" role="group" aria-label="Choose a workbench tool">${ASSEMBLY_TOOLS.map(tool=>`<button type="button" data-asm-tool="${tool.id}" aria-pressed="${tool.id==='inspect'}">${escape(tool.label)}</button>`).join('')}</div><p data-asm-tool-help></p><div class="asm-tool-controls" data-asm-tool-controls></div></section>
    <div class="asm-layout"><div class="asm-visual"><div class="asm-scene" data-asm-scene role="img" aria-label="Rotatable 3D workstation. All equipment actions are also available in the component controls."><div class="asm-loading" data-asm-loading><strong>Your equipment is ready.</strong><span>Load the optional 3D view, or use the detailed controls below.</span></div></div>
      <div class="asm-camera" role="group" aria-label="3D camera controls"><button type="button" data-asm-camera="load">Load 3D view</button><button type="button" data-asm-camera="iso">Whole PC</button><button type="button" data-asm-camera="monitor">Monitor</button><button type="button" data-asm-camera="monitor-ports">Monitor ports</button><button type="button" data-asm-camera="top">Top</button><button type="button" data-asm-camera="side">Side</button><button type="button" data-asm-camera="rear-io">Rear I/O</button><button type="button" data-asm-camera="in">Zoom +</button><button type="button" data-asm-camera="out">Zoom −</button><button type="button" data-asm-camera="off">Pause 3D</button></div>
      <p class="asm-view-status" data-asm-view-status role="status">3D loads only when you choose it. Detailed controls work without graphics.</p>
      <p class="asm-tip">Inspect: drag sideways to rotate and swipe vertically to scroll. Move parts or Connect cables: drag equipment to its labeled matching destination. Scroll outside the picture in these modes. Tool buttons and component controls offer the same actions without dragging. Escape cancels a move.</p></div>
    <aside class="asm-controls" aria-label="Component controls"><label>Choose a component<select aria-label="Choose a component" data-asm-select>${GROUPS.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><div class="asm-part-tabs" role="group" aria-label="Equipment sections">${GROUPS.map(([key,label])=>`<button type="button" data-asm-part="${key}">${label}</button>`).join('')}</div><h4 data-asm-part-title></h4><p data-asm-part-state></p><div class="asm-actions" data-asm-actions></div><p class="asm-feedback" data-asm-feedback role="status" aria-live="polite">Choose a component, then one action. The model explains anything that needs to happen first.</p></aside></div>
    <details class="asm-help"><summary>How to build or take apart this virtual PC</summary><ol><li>Power off and disconnect virtual AC. Remove the case screws and side panel for internal work.</li><li>Select a component in the picture or the list. Fit or remove it using the large controls. Keep loose screws in the virtual tray.</li><li>Fit parts on their mounts, secure their fasteners, close clips, and connect the correct leads. Tighten the cooler diagonally: 1, 4, 2, 3.</li><li>Use Clean surfaces and Apply pea-sized paste with the cooler removed. Lifting a cooler breaks its paste seal; clean and reapply before refitting.</li><li>Reattach the side panel and its screws, connect AC, then test startup. Finish by opening the original lesson file.</li></ol><p>For teardown, disconnect the leads and release fasteners and clips before removing a part. Removal never erases the original SSD. Use the same controls with a mouse, touch, Tab, Enter or Space.</p><p>This is one authored training workstation. Screw tension, paste spread and temperatures are simplified teaching checks; manufacturer procedures vary.</p></details>
    <div class="asm-delivery"><strong data-asm-delivery></strong>${button('video-gpu','Monitor → graphics card')}${button('input-hdmi','Monitor source: HDMI')}${button('open-document','Open original lesson file')}</div>
  </section>`;
  const $=selector=>root.querySelector(selector);
  const sceneHost=$('[data-asm-scene]'),status=$('[data-asm-view-status]');
  const toolHelp={inspect:'Tap a part to inspect it. Drag sideways to rotate; swipe up or down to scroll.',move:'Drag a part to the highlighted socket or return area, then release. Use the camera buttons to adjust your view. Outside the picture, the page scrolls normally. You can also select a part and use Fit or Return below.',screwdriver:'Tap a screw to tighten or remove it. For small screws, choose one below and turn it with the large button. The assembly rules still check safety and cooler order.',paste:'Tap the exposed CPU to apply one pea-sized dot of paste. Remove the cooler first. The large Apply button does the same thing.',clean:'Tap the exposed CPU to clean the CPU and cooler contact surfaces. Remove the cooler first. The large Clean button does the same thing.'};
  function feedback(message){const element=$('[data-asm-feedback]');if(typeof message==='string'&&element.textContent!==message)element.textContent=message;}
  toolHelp.cables='Choose a cable below or tap its 3D end. Drag it onto a labeled matching socket, or park it to disconnect. You can also choose a socket and press Connect. Power off and disconnect AC before internal work.';
  function dispatch(action){scene?.cancelInteraction?.();const response=onAction(action);if(!disposed&&response)feedback(response.message);return response;}
  function renderTools(){
    root.querySelectorAll('[data-asm-tool]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.asmTool===activeTool)));
    $('[data-asm-tool-help]').textContent=toolHelp[activeTool];
    const target=$('[data-asm-tool-controls]');
    target.setAttribute('data-cable-mode',String(activeTool==='cables'));
    if(activeTool==='screwdriver')target.innerHTML=`<label>Choose a screw<select aria-label="Choose a screw" data-asm-fastener>${Object.entries(ASSEMBLY_FASTENERS).flatMap(([group,spec])=>Array.from({length:spec.count},(_,i)=>`<option value="${group}-${i}" ${selectedScrew===`${group}-${i}`?'selected':''}>${escape(spec.label)} screw ${i+1}</option>`)).join('')}</select></label><button type="button" data-asm-use-tool="turn">Turn selected screw</button>`;
    else if(activeTool==='cables'){
      const cable=ASSEMBLY_CABLES.find(item=>item.id===selectedCable);
      target.innerHTML=`<label>Choose a cable<select aria-label="Choose a cable" data-asm-cable>${ASSEMBLY_CABLES.map(item=>`<option value="${item.id}" ${item.id===selectedCable?'selected':''}>${escape(item.label)}</option>`).join('')}</select></label><label>Choose a connection point<select aria-label="Choose a connection point" data-asm-cable-target>${cable.sockets.map(socket=>`<option value="${socket.id}" ${socket.id===selectedSocket?'selected':''}>${escape(socket.label)}</option>`).join('')}</select></label><button type="button" data-asm-cable-action="connect">Connect selected cable</button><button type="button" data-asm-cable-action="disconnect">Disconnect selected cable</button><p class="asm-cable-state" data-asm-cable-state role="status"></p>`;
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
  function chooseCable(id){const cable=ASSEMBLY_CABLES.find(item=>item.id===id);if(!cable)return;const restoreFocus=doc.activeElement===$('[data-asm-cable]');scene?.cancelInteraction?.();selectedCable=id;selectedSocket=cable.sockets[0].id;scene?.setCable?.(id);renderTools();if(restoreFocus)$('[data-asm-cable]')?.focus({preventScroll:true});}
  function chooseTool(id){if(!ASSEMBLY_TOOLS.some(tool=>tool.id===id))return;scene?.cancelInteraction?.();activeTool=id;scene?.setTool?.(id);if(id==='cables')scene?.setCable?.(selectedCable);if(id==='paste'||id==='clean')select('paste');renderTools();feedback(toolHelp[id]);}
  function select(id) {
    if(typeof id!=='string')return;
    if(id.startsWith('cable-')){chooseCable(id.slice(6));return;}
    if(id.startsWith('tool-')){chooseTool(id.slice(5));return;}
    const fastener=/^(panel|psu|board|cooler|gpu|ssd)-(\d)$/.exec(id);
    if(fastener&&Number(fastener[2])<ASSEMBLY_FASTENERS[fastener[1]].count){selectedScrew=id;if(activeTool==='screwdriver')renderTools();}
    const key=NAMES[id]?id:groupFor(`asm-${id}`);
    selected=key;
    $('[data-asm-select]').value=key;
    renderControls(); scene?.select?.(id==='paste'?'cpu':id);
  }
  function renderControls() {
    const active=doc.activeElement?.dataset?.assemblyAction;
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
    const actions=assemblyActions(current,a).filter(item=>groupFor(item.id)===selected&&currentOperation(item.id));
    $('[data-asm-actions]').innerHTML=actions.map(item=>`<button type="button" data-assembly-action="${escape(item.id)}" class="${item.disabled?'asm-action-wait':'asm-action-ready'}" title="${escape(item.reason||'Ready to do')}">${escape(item.label)}</button>`).join('');
    root.querySelectorAll('[data-asm-part]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.asmPart===selected)));
    const controls=[...root.querySelectorAll('[data-assembly-action]')];
    if(active){const target=controls.find(el=>el.dataset.assemblyAction===active);(target||$('[data-asm-actions] button')||$('[data-asm-select]'))?.focus({preventScroll:true});}
  }
  function update(next) {
    current=next;
    $('[data-asm-power]').textContent=`PC ${current.pcOn?'ON':'OFF'} · AC ${current.acConnected?'connected':'disconnected'}`;
    const reason=assemblyFailure(current,current.assembly);
    $('[data-asm-next]').textContent=current.pcOn?'Inspect the virtual equipment. Power off and disconnect AC before opening the case.':current.acConnected?'Disconnect virtual AC before internal work.':reason?`Before startup: ${reason}`:'Assembly checks ready. Connect AC, start the PC and test the original task.';
    $('[data-asm-delivery]').textContent=current.documentOpened?'Original lesson file opened. Explain your investigation in Check & explain.':current.booted?'Original OS loaded. Check the monitor and open the lesson file.':'Startup tests use your actual assembly, fasteners, thermal interface and cable state.';
    renderControls(); renderCableStatus(); scene?.update(current,current.assembly);
  }
  async function loadScene() {
    loadRequested=true;
    if(disposed||!visible||loading||scene)return;
    loading=true; sceneFailed=false;status.textContent='Loading the local 3D equipment view…';
    try {
      sceneModule ||= await import('./assembly-scene.js?release=20261017-cables14');
      if(disposed||!visible||!loadRequested)return;
      scene=sceneModule.mountAssemblyScene(sceneHost,{hardware:current,assembly:current.assembly,onSelect:select,onAction:dispatch,onInteraction:info=>{if(!disposed)feedback(info.message);},onStatus:message=>{if(!disposed)status.textContent=message.message;}});
      if(!scene){sceneFailed=true;status.textContent='3D is unavailable on this device. Every assembly and teardown action remains available in the component controls.';}
      else { $('[data-asm-loading]')?.setAttribute('hidden','');scene.select?.(selected);scene.setTool?.(activeTool);if(activeTool==='cables')scene.setCable?.(selectedCable); }
    } catch { sceneFailed=true; status.textContent='The 3D view could not load. Continue with the complete component controls, or choose Load 3D view to retry.'; }
    finally {loading=false;}
  }
  function click(event) {
    const target=event.target.closest('button');if(!target||!root.contains(target))return;
    if(target.dataset.assemblyAction){dispatch(target.dataset.assemblyAction);return;}
    if(target.dataset.asmTool){chooseTool(target.dataset.asmTool);return;}
    if(target.dataset.asmCableAction){if(!['connect','disconnect'].includes(target.dataset.asmCableAction))return;const mapped=assemblyCableAction(current,current.assembly,selectedCable,target.dataset.asmCableAction==='disconnect'?'cable-rest':selectedSocket);if(mapped.action)dispatch(mapped.action);else feedback(mapped.message);return;}
    if(target.dataset.asmUseTool){
      const id=activeTool==='screwdriver'?selectedScrew:activeTool==='paste'||activeTool==='clean'?'cpu':selected;
      const mapped=assemblyToolAction(current,current.assembly,activeTool,id,target.dataset.asmUseTool==='remove'?'remove':'fit');
      if(mapped.action)dispatch(mapped.action);else feedback(mapped.message);return;
    }
    if(target.dataset.asmPart){select(target.dataset.asmPart);return;}
    const camera=target.dataset.asmCamera;
    if(camera==='load'){loadRequested=true;if(scene){scene.resume();status.textContent='3D view resumed.';}else void loadScene();}
    else if(camera==='off'){loadRequested=false;scene?.pause();status.textContent='3D paused. Component controls remain active.';}
    else if(camera==='in'||camera==='out')scene?.zoom(camera);
    else if(camera)scene?.setView(camera);
  }
  function change(event){if(event.target.matches('[data-asm-select]'))select(event.target.value);else if(event.target.matches('[data-asm-fastener]')){selectedScrew=event.target.value;scene?.select?.(selectedScrew);}else if(event.target.matches('[data-asm-cable]'))chooseCable(event.target.value);else if(event.target.matches('[data-asm-cable-target]')){if(ASSEMBLY_CABLES.find(item=>item.id===selectedCable).sockets.some(socket=>socket.id===event.target.value)){scene?.cancelInteraction?.();selectedSocket=event.target.value;}}}
  root.addEventListener('click',click);root.addEventListener('change',change);
  update(state);
  renderTools();
  if(visible)$('[data-asm-select]')?.focus({preventScroll:true});
  return {update,cancel(){scene?.cancelInteraction?.();},setVisible(value){visible=value;if(value){if(loadRequested&&!scene&&!loading&&!sceneFailed)void loadScene();else if(loadRequested)scene?.resume();}else{scene?.cancelInteraction?.();scene?.pause();}},dispose(){disposed=true;loadRequested=false;scene?.cancelInteraction?.();scene?.dispose();scene=null;root.removeEventListener('click',click);root.removeEventListener('change',change);}};
}
