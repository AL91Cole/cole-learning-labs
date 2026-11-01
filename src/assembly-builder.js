import {pcActivity} from './pc-activity.js?release=20261025-learning-plans';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Current equipment observations only: never saved milestones or automatic actions.
export function assemblyBuildProgress(state,activity=pcActivity(state)) {
  if(state.caseId!=='INC-106')return null;
  const a=state.assembly,secured=values=>values.every(value=>value===true);
  const parts=[
    {id:'psu',fitted:a.psuInstalled,ready:a.psuInstalled&&secured(a.psuScrews),detail:'Case bay · four screws'},
    {id:'board',fitted:state.boardInstalled,ready:state.boardInstalled&&secured(a.boardScrews),detail:'Standoffs · four screws'},
    {id:'cpu',fitted:state.cpuInstalled,ready:state.cpuInstalled&&!a.retentionOpen,detail:'Socket · retention arm'},
    {id:'cooler',fitted:state.coolerInstalled,ready:state.coolerInstalled&&a.paste==='pea'&&secured(a.coolerScrews),detail:'Fresh paste · cross-pattern screws'},
    {id:'ram',fitted:state.ramSeated,ready:state.ramSeated&&!a.ramClipsOpen,detail:'DDR4 slot · both clips'},
    {id:'gpu',fitted:state.gpuInstalled,ready:state.gpuInstalled&&!a.pcieLatchOpen&&secured(a.gpuScrews),detail:'PCIe slot · latch and screws'},
    {id:'ssd',fitted:state.originalDriveInstalled,ready:state.originalDriveInstalled&&secured(a.ssdScrews),detail:'Original files · two screws'}
  ];
  const connections=[state.atxConnected,state.cpuPowerConnected,state.gpuPowerConnected,state.sataDataConnected,
    state.sataPowerConnected,state.frontPanelConnected,a.cpuFanConnected,
    state.pcVideoConnected&&state.signalConnected&&state.videoPort==='gpu'&&state.monitorInput==='hdmi'];
  const buildReady=parts.every(part=>part.ready),connected=connections.filter(value=>value===true).length;
  const connectReady=connected===connections.length,closed=a.panelInstalled&&secured(a.panelScrews);
  const stage=!buildReady?'build':!connectReady?'connect':'test';
  return {parts,secured:parts.filter(part=>part.ready).length,buildReady,connected,totalConnections:connections.length,connectReady,closed,stage,
    complete:activity.documentOpened,
    next:activity.documentOpened?'Original lesson file verified. Explain what your tests showed.':!buildReady?
      'Fit the parts, then secure their screws, clips, retention and thermal interface.':!connectReady?
      'Match each power, data and fan lead. Check both HDMI ends, the graphics output and monitor source.':!closed?
      'Refit the side panel and secure both screws before connecting AC and testing.':
      'Connect AC, test startup, then open the original lesson file on the monitor.'};
}

/** The public tier replaces this module with inert exports before bundling. */
export function assemblyBuilderView(state,{groups,selected}) {
  if(state.caseId!=='INC-106')return null;
  const readout=`<aside class="asm-build-test" aria-label="Live PC test results"><div class="asm-build-heading"><span>03 / TEST READOUT</span><h4>Does it work?</h4><p>These results follow the current model. A spinning fan does not prove startup.</p></div><dl class="asm-build-results"><div><dt>Power path</dt><dd data-asm-result-power></dd></div><div><dt>Startup</dt><dd data-asm-result-startup></dd></div><div><dt>Original file check</dt><dd data-asm-result-file></dd></div></dl><p class="asm-build-case" data-asm-build-case></p><button type="button" data-asm-build-open-file="open">Open original lesson file</button></aside>`;
  return {label:'PC building studio',placement:'<span class="asm-placement" data-asm-placement></span>',close:'</div></div>',
    open:`<div class="asm-build-guide"><span class="asm-build-eyebrow">BUILD STUDIO / FIT · CONNECT · TEST</span><ol aria-label="Current PC build stages">${[['build','Build'],['connect','Connect'],['test','Power & test']].map(([id,label],index)=>`<li data-asm-build-stage="${id}"><span class="asm-stage-number" aria-hidden="true">${index+1}</span><div><strong>${label}</strong><span data-asm-stage-${id}></span></div></li>`).join('')}</ol><p data-asm-build-next role="status"></p></div><div class="asm-build-workspace"><aside class="asm-build-tray" aria-label="PC parts tray"><div class="asm-build-heading"><span>01 / PARTS TRAY</span><h4>Make it fit.</h4><p>Choose a part, then use its controls or the Move tool. Dragging is optional.</p></div><div class="asm-build-parts">${groups.filter(([id])=>!['paste','cables','display'].includes(id)).map(([id,label])=>`<button type="button" data-asm-part="${escape(id)}" aria-pressed="${id===selected}"><strong>${escape(label)}</strong><span data-asm-tray-state="${escape(id)}"></span></button>`).join('')}</div><p class="asm-tray-note">Original SSD, original files. This is an authored virtual PC.</p></aside>${readout}<div class="asm-build-center">`};
}

/** Refresh fixed text fields; the existing workbench alone dispatches actions. */
export function renderAssemblyBuilder(root,state,{activity,selected}) {
  const progress=assemblyBuildProgress(state,activity);if(!progress)return;
  const $=selector=>root.querySelector(selector),set=(selector,text)=>{const element=$(selector);if(element)element.textContent=text;};
  set('[data-asm-stage-build]',`${progress.secured} / ${progress.parts.length} parts secured`);
  set('[data-asm-stage-connect]',`${progress.connected} / ${progress.totalConnections} paths ready`);
  set('[data-asm-stage-test]',progress.complete?'Original file verified':activity.booted?'OS loaded · check file':'Startup and file check');
  for(const id of ['build','connect','test']){
    const step=$(`[data-asm-build-stage="${id}"]`);if(!step)continue;
    const complete=id==='build'?progress.buildReady:id==='connect'?progress.buildReady&&progress.connectReady:progress.complete;
    step.setAttribute('data-state',complete?'complete':progress.stage===id?'current':'waiting');
    if(!progress.complete&&progress.stage===id)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');
  }
  set('[data-asm-build-next]',progress.next);
  for(const part of progress.parts)set(`[data-asm-tray-state="${part.id}"]`,part.ready?'Fitted & secured':part.fitted?'Fitted · secure it':'In the parts tray');
  set('[data-asm-tray-state="panel"]',progress.closed?'Fitted & secured':state.assembly.panelInstalled?'Fitted · secure it':'Set aside');
  const part=progress.parts.find(item=>item.id===selected);
  set('[data-asm-placement]',part?`${part.ready?'Fitted & secured':part.fitted?'Fitted · check its fittings':'In the parts tray'} · ${part.detail}`:
    selected==='panel'?(progress.closed?'Side panel fitted & secured':'Side panel still needs fitting or securing'):'Selected controls · inspect the current state below');
  set('[data-asm-result-power]',activity.power.label);
  set('[data-asm-result-startup]',activity.startup.label+(activity.startup.reason?'. '+activity.startup.reason:''));
  set('[data-asm-result-file]',activity.documentOpened?'Verified · original lesson file opened':activity.display.desktop?
    'Desktop visible · original file not checked yet':'Not checked · reach the classroom desktop first');
  set('[data-asm-build-case]',progress.closed?'Case secured for a startup test.':'Before startup: refit the side panel and secure both screws.');
  const open=$('[data-asm-build-open-file="open"]');if(open)open.disabled=!activity.display.desktop||activity.documentOpened;
}
