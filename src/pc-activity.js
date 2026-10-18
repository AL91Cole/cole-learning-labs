import { initialAssemblyState, normalizeAssemblyState, assemblyFailure, ASSEMBLY_FASTENERS } from './assembly-model.js?release=20261018-monitor22';

/** Read-only teaching indicators. They never start a device or change saved work. */
const plain = value => {
  try { return !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
  catch { return false; }
};
const own = (value, key) => {
  if (!plain(value)) return undefined;
  try { return Object.getOwnPropertyDescriptor(value, key)?.value; }
  catch { return undefined; }
};
const flag = (value, key) => own(value, key) === true;
const FLAGS = ['pcOn','acConnected','boardInstalled','cpuInstalled','coolerInstalled','ramSeated','gpuInstalled','atxConnected','cpuPowerConnected','gpuPowerConnected','frontPanelConnected','originalDriveInstalled','sataDataConnected','sataPowerConnected','pcVideoConnected','signalConnected','booted','documentOpened'];

function assemblySnapshot(value, hardware) {
  const safe = {};
  for (const key of ['version','panelInstalled','psuInstalled','retentionOpen','ramClipsOpen','pcieLatchOpen','paste','cpuFanConnected']) {
    const entry = own(value, key);
    if (['boolean','string','number'].includes(typeof entry)) safe[key] = entry;
  }
  for (const {stateKey,count} of Object.values(ASSEMBLY_FASTENERS)) {
    const values = own(value, stateKey);
    try {
      if (Array.isArray(values) && Object.getOwnPropertyDescriptor(values, 'length')?.value === count) {
        safe[stateKey] = Array.from({length:count}, (_, index) => Object.getOwnPropertyDescriptor(values, String(index))?.value === true);
      }
    } catch { /* An unreadable field supplies no verified fittings. */ }
  }
  return normalizeAssemblyState(safe, hardware);
}

function startupProblem(h, a, modeKnown, detailed) {
  if (!modeKnown) return 'The workbench state is incomplete. Reopen the investigation before testing startup.';
  if (detailed) { const reason = assemblyFailure(h, a); if (reason) return reason; }
  if (!h.boardInstalled) return 'Fit the motherboard before startup.';
  if (!h.atxConnected || !h.cpuPowerConnected) return 'The motherboard needs both 24-pin ATX power and 8-pin CPU power.';
  if (!h.frontPanelConnected) return 'Connect the case power-switch lead to the front-panel header.';
  if (!h.cpuInstalled || !h.coolerInstalled) return 'Fit the processor and its cooler before startup.';
  if (!h.ramSeated) return 'Seat the DDR4 memory before startup.';
  if (!h.gpuInstalled || !h.gpuPowerConnected) return 'Fit the graphics card and connect its power lead.';
  if (!h.originalDriveInstalled) return 'Fit the original SATA SSD; preserve its classroom OS and files.';
  if (!h.sataDataConnected || !h.sataPowerConnected) return 'The original SSD needs separate SATA data and power connections.';
  return '';
}

/**
 * Derive plausible activity from explicit own data, independently of animation.
 * Current callers supply the normalized hardware model. An incomplete or edited
 * snapshot receives no inferred powered components or successful boot.
 */
export function pcActivity(hardware) {
  const h = Object.fromEntries(FLAGS.map(key => [key, flag(hardware, key)]));
  h.videoPort = own(hardware, 'videoPort');
  h.monitorInput = own(hardware, 'monitorInput');
  const assemblyMode = own(hardware, 'assemblyEnabled');
  const modeKnown = assemblyMode === true || assemblyMode === false;
  const detailed = assemblyMode === true;
  const a = detailed ? assemblySnapshot(own(hardware, 'assembly'), h) : modeKnown ? initialAssemblyState(h) : normalizeAssemblyState({}, h);
  const psuInstalled = modeKnown && a.psuInstalled;
  const acAvailable = psuInstalled && h.acConnected;
  // A power-on request alone is not a valid main-power path. RAM, storage,
  // CPU EPS power and successful POST are separate from the PSU start signal.
  const powered = acAvailable && h.pcOn && h.boardInstalled && h.atxConnected && h.frontPanelConnected;
  const standby = acAvailable && !powered;
  const boardPowered = powered && h.boardInstalled;
  const cpuPowered = boardPowered && h.cpuInstalled && h.cpuPowerConnected;
  const ramPowered = boardPowered && h.ramSeated;
  const gpuPowered = powered && h.gpuInstalled && h.gpuPowerConnected;
  const ssdPowered = powered && h.originalDriveInstalled && h.sataPowerConnected;
  const cpuFan = powered && h.cpuInstalled && h.coolerInstalled && a.cpuFanConnected;
  const psuFan = powered && psuInstalled;
  const gpuFan = gpuPowered;
  let reason = startupProblem(h, a, modeKnown, detailed);
  if (h.pcOn && !powered) reason = !psuInstalled ? 'Fit the power supply before requesting main power.' : !h.acConnected ? 'AC is disconnected. The virtual PC has no main power.' : !h.boardInstalled ? 'Fit the motherboard before requesting main power.' : !h.atxConnected ? 'Connect 24-pin ATX power before requesting main power.' : 'Connect the case power-switch lead before requesting main power.';
  const booted = powered && !reason && h.booted;
  const startupState = !h.pcOn ? 'off' : !powered || reason ? 'blocked' : booted ? 'booted' : 'pending';
  // Power and a connected cable are not enough for firmware video. In this
  // authored machine, processor and memory initialization precede video output.
  // A RAM fault can therefore leave spinning fans with no firmware picture.
  const processorReady=cpuPowered&&(!detailed||!a.retentionOpen);
  const memoryReady=ramPowered&&(!detailed||!a.ramClipsOpen);
  const videoInitialized=processorReady&&memoryReady&&gpuPowered;
  const linkReady=h.pcVideoConnected&&h.signalConnected&&h.videoPort==='gpu'&&h.monitorInput==='hdmi';
  const signal=powered&&videoInitialized&&linkReady;
  const desktop=signal&&booted;
  const documentOpened=desktop&&h.documentOpened;
  const detectedStorage=powered&&h.originalDriveInstalled&&h.sataPowerConnected&&h.sataDataConnected;
  const source=h.monitorInput==='hdmi'?'HDMI':h.monitorInput==='displayport'?'DISPLAYPORT':'UNSET';
  const phase=!powered?'power':!processorReady?'processor-init':!memoryReady?'memory-init':!gpuPowered?'graphics-init':!detectedStorage?'boot-device':reason?'workbench-check':booted?'desktop':'boot-manager';
  const display={state:'off',label:'MONITOR STANDBY',detail:'',signal,desktop,documentOpened};
  let stage='monitor',code='MONITOR_STANDBY',brand='CLASSROOM DISPLAY';
  let lines=['Selected input has no active video.','Monitor power is available separately.','The PC is not supplying a picture.'];
  if(powered&&!signal){
    display.state='no-signal';display.label=source==='DISPLAYPORT'?'NO SIGNAL · DISPLAYPORT':'NO SIGNAL';
    code=videoInitialized?'INPUT_NO_SIGNAL':'PRE_VIDEO_POST';
    // Monitor messages cannot diagnose the unseen cable end, socket or RAM.
    // Those remain evidence to investigate in the ticket and workbench.
    lines=['No active video on the selected input.','The display remains in standby.'];
  }else if(signal&&!booted){
    display.state='post-stopped';
    if(!detectedStorage){
      stage='firmware';code='BOOT_DEVICE_UNAVAILABLE';brand='CLASSROOM UEFI';display.label='NO BOOT DEVICE';
      lines=['Firmware reached storage selection.','SATA devices detected: 0','No startable boot entry was found.','The operating system has not loaded.'];
    }else if(reason){
      stage='interlock';code='WORKBENCH_INTERLOCK';brand='TEACHING WORKBENCH';display.label='STARTUP CHECK PAUSED';
      lines=['A teaching safety check paused startup.','The operating system has not loaded.','Read the workbench test result.'];
    }else{
      stage='boot-manager';code='BOOT_MANAGER_READY';brand='CLASSROOM UEFI';display.label='STARTUP READY';
      lines=['SATA device: detected','Boot manager: ready for startup test','Desktop: not yet confirmed'];
    }
  }else if(desktop){
    display.state=documentOpened?'document':'desktop';display.label=documentOpened?'LESSON FILE OPEN':'CLASSROOM DESKTOP';
    stage=display.state;code=documentOpened?'LESSON_OPEN':'DESKTOP_READY';brand='CLASSROOM OS';
    lines=documentOpened?['Original lesson file: open','UEFI and boot manager: completed','Original classroom storage: in use']:['UEFI and boot manager: completed','Original classroom OS: loaded','Original lesson file: not yet opened'];
  }
  display.screen={stage,code,brand,source,lines};
  display.detail=lines.join(' ');
  display.readout=`${display.label}. Selected input: ${source}. ${display.detail}`;
  const power = {state:powered?'running':standby?'standby':'off',label:powered?'Main power active':standby?'AC connected · standby only':psuInstalled?'AC disconnected':'Power supply not fitted'};
  const startup = {state:startupState,label:startupState==='booted'?'Original OS loaded':startupState==='pending'?'Powered · test startup':startupState==='blocked'?'Startup blocked':'Startup not requested',reason,phase,videoInitialized,bootManager:booted?'completed':videoInitialized&&detectedStorage&&!reason?'ready':'not-reached'};
  const status = documentOpened ? {tone:'success',label:'Original lesson file open',detail:'Explain and verify the original task in Check & explain.'}
    : booted ? {tone:desktop?'running':'warning',label:desktop?'Original OS loaded · desktop visible':'Original OS loaded · display needs attention',detail:display.detail}
    : powered ? {tone:'warning',label:reason?'Powered · startup blocked':'Powered · startup not yet confirmed',detail:reason||'Run Test PC. Fans moving and power being available do not prove a successful startup.'}
    : h.pcOn ? {tone:'warning',label:'Power requested · main power unavailable',detail:reason}
    : standby ? {tone:'standby',label:'AC standby · PC off',detail:'Standby availability does not spin the fans. Start the PC only after finishing and securing internal work.'}
    : {tone:'off',label:'PC off · no main power',detail:psuInstalled?'AC is disconnected. Fans are stopped.':'The power supply is not fitted. Fans are stopped.'};
  const connected = h.originalDriveInstalled && h.sataDataConnected && h.sataPowerConnected && h.boardInstalled;
  const storage = {state:!h.originalDriveInstalled?'absent':ssdPowered&&connected?'ready':ssdPowered?'powered':'off',powered:ssdPowered,connected,rotating:false,label:!h.originalDriveInstalled?'Original SSD safely set aside':ssdPowered?'SSD powered · solid-state storage':'SSD fitted · not powered',detail:'The SATA SSD has no spinning disk or moving parts. It needs both data and power connections to serve the original OS and files.'};
  return {powered,standby,psuInstalled,cpuFan,psuFan,gpuFan,boardPowered,cpuPowered,ramPowered,gpuPowered,ssdPowered,booted,documentOpened,power,startup,display,status,storage,
    description:'Authored power-path indicators, not measurements of voltage, temperature or fan speed. Fan motion does not prove successful startup. The SSD has no moving parts.'};
}
