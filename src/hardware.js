import { initialAssemblyState, normalizeAssemblyState, applyAssemblyAction, assemblyFailure, assemblyActions } from './assembly-model.js?release=20261017-cables14';
import { mountAssemblyWorkbench } from './assembly-workbench.js?release=20261017-cables14';
import { mountWorkbenchInteractions } from './workbench-interactions.js?release=20261017-cables14';
/** Browser-only hardware simulations. All actions modify this model, never the host computer. */
const CASES = {
  'INC-101': { title: 'The blank monitor', fault: 'The PC runs, but the monitor reports no signal.', select: 'rear' },
  'INC-102': { title: 'The desktop that will not start', fault: 'The power button does not start the classroom computer.', select: 'power' },
  'INC-103': { title: 'The interrupted startup', fault: 'The computer powers up but cannot complete its memory check.', select: 'ram' },
  'INC-104': { title: 'The missing desktop', fault: 'The firmware cannot find the classroom operating system.', select: 'storage' },
  'INC-105': { title: 'The wrong replacement drive', fault: 'A replacement drive does not match this computer’s storage interface.', select: 'storage' },
  'INC-106': { title: 'Build the classroom workstation', fault: 'Assemble a compatible workstation, then deliver the original classroom task.', select: 'board' },
  'INC-107': { title: 'The monitor on the wrong source', fault: 'The monitor reports no signal even though the PC and video cable are ready.', select: 'monitor' },
  'INC-108': { title: 'The disconnected display', fault: 'The PC runs, but the display signal path is incomplete.', select: 'monitor' }
};

const PARTS = [
  ['board', 'Motherboard', 'Micro-ATX · DDR4 · SATA 6 Gb/s', 'install-board'],
  ['cpu', 'Processor', 'LGA socket · align the gold triangle', 'install-cpu'],
  ['cooler', 'CPU cooler', 'Thermal interface + CPU_FAN lead', 'install-cooler'],
  ['ram', 'DDR4 memory', '8 GB · 288-pin DIMM · keyed notch', 'install-ram'],
  ['gpu', 'Graphics card', 'PCIe x16 · display output', 'install-gpu'],
  ['storage', 'Original SATA SSD', '2.5-inch · classroom OS and files', 'install-drive'],
  ['atx', '24-pin board power', 'PSU → motherboard ATX_PWR', 'connect-atx'],
  ['eps', '8-pin CPU power', 'PSU → CPU_PWR (EPS)', 'connect-cpu-power'],
  ['gpu-power', 'GPU power', 'PSU → 6-pin graphics card', 'connect-gpu-power'],
  ['sata', 'SATA data cable', 'SSD → motherboard SATA_1', 'connect-sata'],
  ['sata-power', 'SATA power lead', 'PSU → SSD · wider connector', 'connect-sata-power'],
  ['front', 'Front panel lead', 'Case power switch → F_PANEL', 'connect-front-panel']
];

const clampCase = id => typeof id === 'string' && Object.hasOwn(CASES, id) ? id : 'INC-101';
const safetyReady = s => !s.pcOn && !s.acConnected;
const hardwareReady = s => (!s.assemblyEnabled || !assemblyFailure(s,s.assembly)) && s.boardInstalled && s.cpuInstalled && s.coolerInstalled && s.ramSeated && s.gpuInstalled && s.atxConnected && s.cpuPowerConnected && s.gpuPowerConnected && s.frontPanelConnected && s.originalDriveInstalled && s.sataDataConnected && s.sataPowerConnected;
const displayPathReady = s => s.gpuInstalled && s.gpuPowerConnected && s.videoPort === 'gpu' && s.pcVideoConnected && s.signalConnected && s.monitorInput === 'hdmi';
const displayReady = s => (!s.assemblyEnabled || !assemblyFailure(s,s.assembly)) && s.pcOn && s.booted && displayPathReady(s);
const result = (state, message, kind = 'info') => ({ state, message, kind });
// A held cable and selected diagnostic tool belong to the picture, not student work.
const benchInteractions = new WeakMap();
const benchDisposers = new WeakMap();
const assemblyBenches = new WeakMap();
export function setHardwareVisible(root,visible) { assemblyBenches.get(root)?.setVisible(visible); }

/** Call before route replacement or hiding the workbench to release active gestures. */
export function disposeHardware(root) {
  benchDisposers.get(root)?.();
  benchDisposers.delete(root);
  assemblyBenches.get(root)?.dispose();
  assemblyBenches.delete(root);
}

export function cancelHardwareInteraction(root) {
  benchDisposers.get(root)?.cancel?.();
  assemblyBenches.get(root)?.cancel?.();
  // Preserve the older click-to-connect controls, including their cancel affordance.
  root?.querySelector?.('[data-hw-cable="cancel"]')?.click?.();
}

export function initialHardwareState(caseId = 'INC-101') {
  const id = clampCase(caseId);
  const build = id === 'INC-106';
  return {
    caseId: id, pcOn: !build && id !== 'INC-102', acConnected: !build && id !== 'INC-102',
    boardInstalled: !build, cpuInstalled: !build, coolerInstalled: !build,
    ramSeated: !build && id !== 'INC-103', gpuInstalled: !build,
    atxConnected: !build, cpuPowerConnected: !build, gpuPowerConnected: !build,
    frontPanelConnected: !build,
    originalDriveInstalled: !build && id !== 'INC-105',
    sataDataConnected: !build && !['INC-104', 'INC-105'].includes(id), sataPowerConnected: !build && id !== 'INC-105',
    videoPort: id === 'INC-101' || build ? 'board' : 'gpu',
    monitorInput: id === 'INC-107' ? 'displayport' : 'hdmi',
    pcVideoConnected: true, signalConnected: id !== 'INC-108',
    selectedDrive: id === 'INC-105' ? 'nvme' : 'sata',
    booted: ['INC-101','INC-107','INC-108'].includes(id), documentOpened: false,
    assemblyEnabled: false, assembly: null,
    view: 'bench', selectedPart: CASES[id].select,
    evidence: [], actions: [], bootCount: 0
  };
}

/** Treat browser saves as untrusted data; retain only the documented model shape. */
export function normalizeHardwareState(caseId, savedState) {
  const state = initialHardwareState(caseId);
  if (!savedState || typeof savedState !== 'object' || Array.isArray(savedState) || ![Object.prototype, null].includes(Object.getPrototypeOf(savedState))) return state;
  for (const key of Object.keys(state)) {
    if (typeof state[key] === 'boolean' && Object.hasOwn(savedState, key) && typeof savedState[key] === 'boolean') state[key] = savedState[key];
  }
  for (const [key, allowed] of Object.entries({ videoPort:['board','gpu'], monitorInput:['hdmi','displayport'], selectedDrive:['sata','nvme'], view:['bench','internals','rear','display'], selectedPart:Object.keys(INSPECTIONS) })) {
    if (Object.hasOwn(savedState, key) && allowed.includes(savedState[key])) state[key] = savedState[key];
  }
  if (Object.hasOwn(savedState, 'bootCount') && Number.isSafeInteger(savedState.bootCount) && savedState.bootCount >= 0) state.bootCount = Math.min(savedState.bootCount, 1000000);
  if (Object.hasOwn(savedState, 'evidence') && Array.isArray(savedState.evidence)) state.evidence = [...new Set(savedState.evidence.filter(part => typeof part === 'string' && Object.hasOwn(INSPECTIONS, part)))].slice(0, Object.keys(INSPECTIONS).length);
  const actions = new Set(['enable-assembly','power-off','unplug','plug-in','boot','video-gpu','video-board','disconnect-video','input-hdmi','input-displayport','connect-signal','disconnect-signal','open-document','close-document','seat-ram','unseat-ram','disconnect-sata','install-original','choose-nvme',...PARTS.map(part => part[3]),...Object.keys(INSPECTIONS).map(part => `inspect-${part}`)]);
  if (Object.hasOwn(savedState, 'actions') && Array.isArray(savedState.actions)) state.actions = savedState.actions.filter(action => typeof action === 'string' && actions.has(action)).slice(-250);
  if(state.assemblyEnabled) {
    state.assembly=normalizeAssemblyState(savedState.assembly ?? {},state);
    if(assemblyFailure(state,state.assembly)) { state.booted=false; state.documentOpened=false; }
    const allowed=new Set(assemblyActions(state,state.assembly).map(item=>item.id));
    if(Array.isArray(savedState.actions)) state.actions=savedState.actions.filter(action=>typeof action==='string'&&(actions.has(action)||allowed.has(action))).slice(-250);
  }
  // An old or edited browser save cannot display a delivered file through a broken signal path.
  if (!displayReady(state) || !hardwareReady(state)) state.documentOpened = false;
  return state;
}

function failureReason(s) {
  if(s.assemblyEnabled) { const reason=assemblyFailure(s,s.assembly); if(reason)return reason; }
  if (!s.boardInstalled) return 'No motherboard is installed. Fit the board to the case standoffs first.';
  if (!s.atxConnected || !s.cpuPowerConnected) return 'No POST: the motherboard needs both 24-pin ATX power and 8-pin CPU power.';
  if (!s.frontPanelConnected) return 'The case power switch is not connected to the F_PANEL header.';
  if (!s.cpuInstalled || !s.coolerInstalled) return 'CPU check failed. Install the processor and its cooler before starting.';
  if (!s.ramSeated) return 'POST stopped: memory not detected. Check the DDR4 DIMM seating and retention clips.';
  if (!s.gpuInstalled || !s.gpuPowerConnected) return 'Graphics check failed. Check the PCIe card and its dedicated power lead.';
  if (!s.originalDriveInstalled) return 'No bootable classroom drive. This board uses SATA storage; the loose M.2 NVMe drive is incompatible.';
  if (!s.sataDataConnected || !s.sataPowerConnected) return 'No boot device detected. The SATA SSD requires separate data and power connections.';
  return '';
}

const INSPECTIONS = {
  monitor: s => displayReady(s) ? 'The monitor displays the classroom desktop. Open Lesson_Practice_File.docx to confirm the customer’s original task.' : !s.pcOn ? 'Monitor power is available, but the PC is off. A working display also needs a running PC and the correct video output.' : !s.pcVideoConnected ? 'The PC end of the HDMI cable is disconnected. Both the PC output and monitor input need their own cable connection.' : !s.signalConnected ? 'The monitor has power, but its HDMI signal socket is empty. The display cable is attached at the PC and loose at the monitor end. No signal reaches either monitor input.' : s.monitorInput !== 'hdmi' ? 'The monitor reads “NO SIGNAL · DisplayPort.” Its source selector is set to DisplayPort, but the fitted cable enters HDMI. Source selection and cable routing are different checks.' : s.videoPort !== 'gpu' ? 'The monitor reads “NO SIGNAL.” Its cable is in the upper motherboard video port. This workstation sends video through its dedicated graphics card.' : !s.booted ? `The monitor has a video connection. Startup status: ${failureReason(s)}` : 'The monitor is ready.',
  rear: s => `PC cable end: ${!s.pcVideoConnected ? 'disconnected' : s.videoPort === 'gpu' ? 'dedicated graphics card (active output)' : 'upper motherboard port (inactive on this workstation)'}. Monitor HDMI end: ${s.signalConnected ? 'fully fitted' : 'disconnected'}. The GPU outputs sit lower on the rear expansion slots.`,
  power: s => `AC cord: ${s.acConnected ? 'connected' : 'disconnected'}. PC: ${s.pcOn ? 'running / attempting startup' : 'off'}. Internal work requires both PC OFF and AC DISCONNECTED.`,
  board: () => 'Micro-ATX board: LGA CPU socket, DDR4 DIMM slots, PCIe x16 graphics slot, and SATA 6 Gb/s ports. This teaching workstation has no M.2 NVMe storage slot. Fit the board on standoffs; avoid loose screws beneath it.',
  cpu: s => s.cpuInstalled ? 'The processor is seated in the LGA socket. The cooler must be fitted before power-on.' : 'The LGA socket is empty. Align the processor’s triangle with the socket marker, then secure its retention mechanism.',
  cooler: s => s.coolerInstalled ? 'CPU cooler secured; CPU_FAN lead connected. The fan spins only when the computer is powered.' : 'The CPU cooler is not installed. It provides the thermal interface, heatsink, and fan required before startup.',
  ram: s => s.ramSeated ? '8 GB DDR4 DIMM detected visually. Both retention clips are closed and the module is fully seated in the keyed A2 slot.' : 'The DDR4 DIMM is raised at one edge; its retention clip is open. Power off and disconnect AC before reseating.',
  gpu: s => s.gpuInstalled ? `The graphics card occupies PCIe x16. Its dedicated power lead is ${s.gpuPowerConnected ? 'connected' : 'missing'}. Use this card’s rear video outputs.` : 'The PCIe x16 slot is empty. Seat the graphics card, secure the bracket, and connect its dedicated PSU lead.',
  storage: s => `${s.originalDriveInstalled ? 'Original 256 GB SATA SSD is installed; its classroom OS and files are retained.' : 'Original SATA SSD is safely set aside. Do not erase it or install a new OS.'} SATA data: ${s.sataDataConnected ? 'connected' : 'missing'}. SATA power: ${s.sataPowerConnected ? 'connected' : 'missing'}. A 2.5-inch SATA drive and an M.2 NVMe module use different connectors.`,
  sata: s => `The narrow SATA data cable links motherboard SATA_1 to the SSD. It is ${s.sataDataConnected ? 'connected at both ends' : 'disconnected'}. The wider SATA power lead comes from the PSU, not the motherboard.`,
  atx: s => `24-pin ATX motherboard power is ${s.atxConnected ? 'connected' : 'not connected'}. The separate 8-pin EPS connector powers the CPU.`,
  eps: s => `8-pin EPS CPU power is ${s.cpuPowerConnected ? 'connected' : 'not connected'}. This is not interchangeable with a graphics-card power plug.`,
  'gpu-power': s => `6-pin GPU power is ${s.gpuPowerConnected ? 'connected' : 'not connected'}. Match the keyed plug to the graphics card.`,
  'sata-power': s => `The PSU’s wide SATA power plug is ${s.sataPowerConnected ? 'connected to the SSD' : 'not connected'}. The SSD also needs its separate SATA data cable.`,
  front: s => `The case power-switch lead is ${s.frontPanelConnected ? 'connected to F_PANEL' : 'not connected'}. The case button cannot start this model until that lead is fitted.`
};

export function applyHardwareAction(caseId, state, action) {
  const id = clampCase(caseId);
  const s = normalizeHardwareState(id, state);
  if (typeof action !== 'string') return result(s, 'Select a documented workbench action.', 'warning');
  const record = (message, kind = 'info') => { s.actions.push(action); return result(s, message, kind); };
  if (action === 'enable-assembly') {
    if(s.assemblyEnabled)return result(s,'Detailed assembly is already active.');
    s.assemblyEnabled=true; s.assembly=initialAssemblyState(s);
    return record('Detailed assembly enabled. Every screw, retention clip, cable and thermal interface now participates in the startup checks. Work only on this virtual equipment.');
  }
  const detailedAliases={ 'install-board':'asm-fit-board','install-cpu':'asm-fit-cpu','install-cooler':'asm-fit-cooler','install-ram':'asm-fit-ram','seat-ram':'asm-fit-ram','unseat-ram':'asm-remove-ram','install-gpu':'asm-fit-gpu','install-drive':'asm-fit-ssd','install-original':'asm-fit-ssd','connect-atx':'asm-connect-atx','connect-cpu-power':'asm-connect-eps','connect-gpu-power':'asm-connect-gpu-power','connect-sata':'asm-connect-sata-data','disconnect-sata':'asm-disconnect-sata-data','connect-sata-power':'asm-connect-sata-power','connect-front-panel':'asm-connect-front-panel' };
  if(s.assemblyEnabled && (action.startsWith('asm-')||Object.hasOwn(detailedAliases,action))) {
    const change=applyAssemblyAction(s,s.assembly,detailedAliases[action]||action);
    const next={...s,...change.hardware,assemblyEnabled:true,assembly:change.assembly};
    if(change.kind!=='warning')next.actions=[...s.actions,action].slice(-250);
    return result(next,change.message,change.kind);
  }
  if (action.startsWith('asm-')) return result(s,'Enable detailed assembly before using these tools.','warning');
  if (action.startsWith('view-')) {
    const view = action.slice(5);
    if (['bench', 'internals', 'rear', 'display'].includes(view)) s.view = view;
    return result(s, `Viewing ${view === 'rear' ? 'rear connections' : view === 'display' ? 'the monitor' : view === 'internals' ? 'a close-up of the PC components' : 'the workbench'}.`);
  }
  if (action.startsWith('inspect-')) {
    const part = action.slice(8);
    if (!Object.hasOwn(INSPECTIONS, part)) return result(s, 'Choose a labeled part to inspect.');
    s.selectedPart = part;
    if (!s.evidence.includes(part)) s.evidence.push(part);
    return record(INSPECTIONS[part](s));
  }
  if (action === 'power-off') {
    s.pcOn = false; s.booted = false; s.documentOpened = false;
    return record(s.acConnected ? 'PC shut down. Disconnect the AC cord before opening or changing internal components.' : 'PC is off and AC is disconnected. The workbench is safe for internal changes.', 'success');
  }
  if (action === 'unplug') {
    if (s.pcOn) return result(s, 'Shut down the PC before disconnecting its AC cord.', 'warning');
    s.acConnected = false;
    return record('AC cord disconnected. Internal components can now be changed on this virtual workbench.', 'success');
  }
  if (action === 'plug-in') {
    if(s.assemblyEnabled&&!s.assembly.psuInstalled)return result(s,'Fit the power supply before connecting its AC inlet.','warning');
    s.acConnected = true;
    return record('AC cord connected. Finish internal work before reconnecting power. You can now test startup.');
  }
  if (action === 'boot') {
    if (!s.acConnected) return result(s, 'No AC power. Connect the virtual AC cord, then try the power button.', 'warning');
    s.pcOn = true; s.documentOpened = false; s.bootCount += 1;
    const reason = failureReason(s);
    s.booted = !reason;
    if (reason) return record(reason, 'warning');
    return record(displayPathReady(s) ? 'POST passed. The original classroom OS has loaded. Open the lesson document to verify delivery.' : 'POST passed and the original OS loaded, but the monitor still has no signal. Inspect its source, both cable ends, and the PC video output.', displayPathReady(s) ? 'success' : 'warning');
  }
  if (action === 'video-gpu' || action === 'video-board') {
    const port = action === 'video-gpu' ? 'gpu' : 'board';
    if (port === 'gpu' && !s.gpuInstalled) return result(s, 'Install the graphics card before attaching the monitor to its output.', 'warning');
    if (port === 'board' && !s.boardInstalled) return result(s, 'Install the motherboard before attaching the monitor to its output.', 'warning');
    s.videoPort = port; s.pcVideoConnected = true; s.documentOpened = false;
    return record(s.videoPort === 'gpu' ? 'Monitor cable connected to the dedicated graphics card. Check the display and the original lesson task.' : 'Monitor cable connected to the motherboard. This workstation’s upper video output is inactive.', s.videoPort === 'gpu' ? 'success' : 'warning');
  }
  if (action === 'disconnect-video') {
    s.pcVideoConnected = false; s.documentOpened = false;
    return record('HDMI cable disconnected at the PC. Its monitor end and the running operating system are unchanged. Reconnect the PC end before checking the display.');
  }
  // These external low-voltage display controls do not open the case or alter internal parts.
  if (action === 'input-hdmi' || action === 'input-displayport') {
    s.monitorInput = action === 'input-hdmi' ? 'hdmi' : 'displayport'; s.documentOpened = false;
    return record(s.monitorInput === 'hdmi' ? (displayReady(s) ? 'Monitor source changed to HDMI. The desktop appears without restarting the PC. Open the lesson file to test the original task.' : 'Monitor source changed to HDMI. The picture is still absent; source selection alone does not prove the cable path and startup are working.') : 'Monitor source changed to DisplayPort. The fitted teaching cable uses HDMI, so this source receives no picture. The original OS and files are unchanged.', displayReady(s) ? 'success' : 'warning');
  }
  if (action === 'connect-signal' || action === 'disconnect-signal') {
    s.signalConnected = action === 'connect-signal'; s.documentOpened = false;
    return record(s.signalConnected ? (displayReady(s) ? 'HDMI connector fitted at the monitor. The desktop appears; the PC did not need an internal repair. Test the original lesson file next.' : 'HDMI connector fitted at the monitor. Check the chosen input, PC output, and startup before claiming a repair.') : 'HDMI connector removed from the monitor. The picture disappears while the PC keeps its current startup state; classroom files remain on the original drive.', displayReady(s) ? 'success' : 'warning');
  }
  if (action === 'open-document') {
    if (!displayReady(s) || !hardwareReady(s)) return result(s, 'The original lesson file can be opened only after the PC starts from its original drive and the monitor displays the desktop.', 'warning');
    s.documentOpened = true; s.selectedPart = 'monitor';
    return record('Lesson_Practice_File.docx opened successfully from the original classroom drive. The device is fixed and the customer’s task is delivered.', 'success');
  }
  if (action === 'close-document') { s.documentOpened = false; return record('Lesson document closed.'); }
  const internal = ['seat-ram', 'unseat-ram', 'connect-sata', 'disconnect-sata', 'install-original', 'choose-nvme', ...PARTS.map(p => p[3])];
  if (!internal.includes(action)) return result(s, 'Select a workbench control or inspect a labeled component.');
  if (!safetyReady(s)) return result(s, 'Stop: power off the PC AND unplug its AC cord before changing internal components.', 'warning');
  s.booted = false; s.documentOpened = false;
  if (action === 'choose-nvme') { s.selectedDrive = 'nvme'; return record('Compatibility check failed: this motherboard has SATA ports and no M.2 NVMe slot. Keep the original SATA OS drive; do not force the module into a connector.', 'warning'); }
  if (action === 'install-original' || action === 'install-drive') {
    if (!s.boardInstalled) return result(s, 'Install the motherboard before fitting and connecting the classroom drive.', 'warning');
    s.originalDriveInstalled = true; s.selectedDrive = 'sata';
    return record('Original 2.5-inch SATA SSD secured in its drive bay. Classroom OS and files are preserved; connect both SATA data and power.', 'success');
  }
  if (action === 'install-board') { s.boardInstalled = true; return record('Motherboard aligned with the rear I/O opening and secured to the correct case standoffs.', 'success'); }
  if (!s.boardInstalled) return result(s, 'Install the motherboard before adding components or attaching its cables.', 'warning');
  if (action === 'install-cpu') { s.cpuInstalled = true; return record('Processor aligned with its socket triangle and retained in the LGA socket.', 'success'); }
  if (action === 'install-cooler') {
    if (!s.cpuInstalled) return result(s, 'Install the processor before fitting its cooler.', 'warning');
    s.coolerInstalled = true; return record('CPU cooler secured with its thermal interface and CPU_FAN lead connected.', 'success');
  }
  if (action === 'seat-ram' || action === 'install-ram') { s.ramSeated = true; return record('DDR4 module aligned with the keyed notch and pressed evenly until both retention clips closed.', 'success'); }
  if (action === 'unseat-ram') { s.ramSeated = false; return record('DDR4 memory released. Reseat it before the next startup test.'); }
  if (action === 'install-gpu') { s.gpuInstalled = true; return record('Graphics card seated in PCIe x16 and secured to its rear expansion bracket.', 'success'); }
  if (action === 'connect-atx') { s.atxConnected = true; return record('24-pin ATX power connector latched onto the motherboard.', 'success'); }
  if (action === 'connect-cpu-power') { s.cpuPowerConnected = true; return record('8-pin EPS CPU power connector attached to CPU_PWR.', 'success'); }
  if (action === 'connect-gpu-power') {
    if (!s.gpuInstalled) return result(s, 'Fit the graphics card before connecting its power lead.', 'warning');
    s.gpuPowerConnected = true; return record('6-pin GPU power connector attached to the graphics card.', 'success');
  }
  if (action === 'connect-sata' || action === 'connect-sata-power') {
    if (!s.originalDriveInstalled) return result(s, 'Fit the original SATA SSD before connecting its cables.', 'warning');
    if (action === 'connect-sata') s.sataDataConnected = true; else s.sataPowerConnected = true;
    return record(action === 'connect-sata' ? 'Narrow SATA data cable connected from motherboard SATA_1 to the SSD.' : 'Wide SATA power lead connected from the PSU to the SSD.', 'success');
  }
  if (action === 'disconnect-sata') { s.sataDataConnected = false; return record('SATA data cable disconnected. The original drive and its files remain intact.'); }
  if (action === 'connect-front-panel') { s.frontPanelConnected = true; return record('Case power-switch lead connected to the F_PANEL header.', 'success'); }
  return result(s, `Ready to continue ${CASES[id].title.toLowerCase()}.`);
}

export function verifyHardware(caseId, state) {
  state = normalizeHardwareState(caseId, state);
  if (!hardwareReady(state) || !displayReady(state)) return { ok: false, message: !state.acConnected ? 'AC is disconnected. Reconnect power and test startup.' : !state.pcOn ? 'The PC is off. Start it and verify the desktop.' : failureReason(state) || (!state.pcVideoConnected ? 'The PC end of the HDMI cable is disconnected. Fit it to the graphics-card output, then check the display.' : !state.signalConnected ? 'The monitor HDMI end is disconnected. Complete the signal path and check the display.' : state.monitorInput !== 'hdmi' ? 'The monitor is listening to DisplayPort, but the cable uses HDMI. Compare the source selector with the fitted cable.' : 'The PC is running, but the display connection still needs attention.') };
  if (!state.documentOpened) return { ok: false, message: 'Fixed, but not yet delivered: the desktop is restored. Open Lesson_Practice_File.docx to confirm the original classroom task.' };
  return { ok: true, message: 'Fixed and delivered: the PC starts, the monitor works, and the original lesson document opens with the classroom files preserved.' };
}

/** Readouts describe the modeled equipment; they never run on the learner's device. */
export function getHardwareReadouts(caseId, state) {
  const s = normalizeHardwareState(caseId, state);
  const startupProblem = failureReason(s);
  const startupStopped = !s.boardInstalled ? 'No motherboard installed' : !s.atxConnected || !s.cpuPowerConnected ? 'Motherboard power missing' : !s.frontPanelConnected ? 'Power-switch lead missing' : !s.cpuInstalled || !s.coolerInstalled ? 'Stopped at CPU check' : !s.ramSeated ? 'Stopped at memory check' : !s.gpuInstalled || !s.gpuPowerConnected ? 'Stopped at graphics check' : !s.originalDriveInstalled || !s.sataDataConnected || !s.sataPowerConnected ? 'No boot device' : 'Startup incomplete';
  const videoConnected = displayPathReady(s);
  const driveConnected = s.originalDriveInstalled && s.sataDataConnected && s.sataPowerConnected;
  return {
    power: { label:'Power path', value:!s.acConnected ? 'AC disconnected' : s.pcOn ? 'PC powered on' : 'AC present · PC off', tone:safetyReady(s) ? 'safe' : 'notice', action:'inspect-power', detail:`AC cord: ${s.acConnected ? 'connected' : 'disconnected'}. Case power: ${s.pcOn ? 'on' : 'off'}. Motherboard 24-pin: ${s.atxConnected ? 'connected' : 'missing'}. CPU 8-pin: ${s.cpuPowerConnected ? 'connected' : 'missing'}. Internal work is ${safetyReady(s) ? 'safe in this virtual model' : 'locked until the PC is off and AC is disconnected'}.` },
    startup: { label:'Startup / POST', value:!s.pcOn ? 'PC off · not running' : s.booted ? 'Original OS loaded' : startupStopped, tone:s.booted ? 'safe' : 'notice', action:'inspect-board', detail:!s.pcOn ? `The computer is off. Startup tests run when you choose Power on / test. Tests attempted: ${s.bootCount}.` : s.booted ? `The modeled startup checks passed and the original classroom OS loaded. Tests attempted: ${s.bootCount}. A loaded OS alone does not prove that the monitor or lesson file works.` : `${startupProblem || 'The machine has not completed a startup test. Use Power on / test after making your change.'} Tests attempted: ${s.bootCount}.` },
    storage: { label:'Drive connections', value:!s.originalDriveInstalled ? 'Original SSD not fitted' : driveConnected ? 'SATA data + power fitted' : !s.sataDataConnected ? 'SATA data disconnected' : 'SATA power disconnected', tone:driveConnected ? 'safe' : 'notice', action:'inspect-storage', detail:`Original classroom SSD: ${s.originalDriveInstalled ? 'in its 2.5-inch bay' : 'safely set aside'}. Narrow SATA data: ${s.sataDataConnected ? 'connected' : 'disconnected'}. Wide SATA power: ${s.sataPowerConnected ? 'connected' : 'disconnected'}. ${s.booted ? 'The original classroom OS has loaded.' : 'These connection checks do not prove that the OS starts; run the startup test.'}` },
    display: { label:'Monitor signal', value:!s.pcOn ? 'PC off · no signal' : !s.pcVideoConnected ? 'PC cable disconnected' : !s.signalConnected ? 'Monitor cable disconnected' : s.monitorInput !== 'hdmi' ? 'Wrong source · DisplayPort' : !videoConnected ? 'No video signal' : displayReady(s) ? s.documentOpened ? 'Original lesson file open' : 'Classroom desktop visible' : 'Connected · startup stopped', tone:displayReady(s) ? 'safe' : 'notice', action:'inspect-monitor', detail:`PC cable end: ${!s.pcVideoConnected ? 'disconnected' : s.videoPort === 'gpu' ? 'lower graphics-card output' : 'upper motherboard video output'}. Monitor HDMI end: ${s.signalConnected ? 'fitted' : 'disconnected'}. Monitor source: ${s.monitorInput === 'hdmi' ? 'HDMI' : 'DisplayPort'}. ${!s.pcOn ? 'The PC must be running to send a picture.' : !videoConnected ? INSPECTIONS.monitor(s) : !s.booted ? `The cable reaches the graphics card, but startup has not completed. ${startupProblem}` : s.documentOpened ? 'Lesson_Practice_File.docx is open from the original classroom drive.' : 'The desktop is visible. Open the original lesson document to check the customer task.'}` }
  };
}

function renderDiagnostics(s, readouts, selected) {
  const item = readouts[selected];
  return `<section class="hw-diagnostics" aria-label="Virtual diagnostic tools"><div class="hw-diagnostics-heading"><div><span class="hw-eyebrow">BENCH INSTRUMENTS</span><h3>Check what the equipment is doing.</h3></div><span class="hw-instrument-tag">MODEL READOUTS</span></div><p class="hw-tool-help">Choose a check. Read the result, make one change, then run the startup test. These tools inspect; they do not repair.</p><div class="hw-readout-grid">${Object.entries(readouts).map(([key,tool])=>`<button type="button" data-hw-diagnostic="${key}" aria-pressed="${selected===key}" class="hw-readout hw-readout-${tool.tone}"><span>${tool.label}</span><strong>${tool.value}</strong><small>${selected===key?'Result selected':'Inspect this result'} <span aria-hidden="true">↗</span></small></button>`).join('')}</div><div class="hw-diagnostic-result" role="status" aria-live="polite"><strong>${item.label}</strong><p>${item.detail}</p></div><p class="hw-tool-note">Simulated status only · no real-device scan, remote connection, or voltage measurements.</p></section>`;
}

function renderCableControls(s, held) {
  return `<section class="hw-cable-station" aria-label="Hands-on display cable"><div class="hw-cable-heading"><div><span class="hw-eyebrow">DISPLAY CONNECTION</span><h3>Follow the cable. Choose the socket.</h3></div><span class="hw-cable-route">Cable in: ${!s.pcVideoConnected?'PC end disconnected':s.videoPort==='gpu'?'lower graphics card':'upper motherboard'}</span></div><p>1. Pick up the virtual display cable. 2. Tap or click a socket below or in the rear picture. Keyboard: Tab, then Enter or Space. No dragging is needed.</p><div class="hw-cable-pickup"><button type="button" class="hw-action" data-hw-cable="${held?'cancel':'pickup'}" aria-pressed="${held}"><span class="hw-cable-plug" aria-hidden="true"></span>${held?'Put the cable down':'Pick up display cable'}</button><span role="status">${held?'Cable held · choose a video socket. The equipment has not changed yet.':'Choose a socket without holding the cable to inspect it first.'}</span></div><div class="hw-socket-grid">${[['board','Upper motherboard video','Upper rear I/O panel'],['gpu','Lower graphics-card video',s.gpuInstalled?'Lower expansion slot':'Graphics card not installed']].map(([port,label,detail])=>`<button type="button" class="hw-socket ${held?'hw-socket-target':''} ${s.pcVideoConnected&&s.videoPort===port?'hw-socket-connected':''}" data-hw-connector="${port}" aria-label="${held?'Connect display cable to':'Inspect'} ${label.toLowerCase()}"><span class="hw-port-face" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span><strong>${label}</strong><small>${detail} · ${s.pcVideoConnected&&s.videoPort===port?'cable connected':'socket empty'}</small></span><em>${held?'Connect here':'Inspect socket'}</em></button>`).join('')}</div>${btn('disconnect-video','Disconnect PC HDMI',`aria-pressed="${!s.pcVideoConnected}"`)}</section>`;
}

function renderMonitorControls(s) {
  return `<section class="hw-monitor-controls" aria-label="Monitor source and HDMI cable"><div class="hw-cable-heading"><div><span class="hw-eyebrow">MONITOR END</span><h3>Check the source and the second cable end.</h3></div><span class="hw-monitor-indicator ${displayPathReady(s)?'hw-monitor-linked':''}">${s.signalConnected?'HDMI fitted':'HDMI socket empty'} · source ${s.monitorInput==='hdmi'?'HDMI':'DisplayPort'}</span></div><p>The teaching cable carries HDMI. Selecting an input changes what the monitor listens to; connecting a cable completes the physical path. These external controls can be used while the virtual PC runs.</p><div class="hw-source-select" role="group" aria-label="Monitor input source">${btn('input-hdmi','HDMI input',`aria-pressed="${s.monitorInput==='hdmi'}"`)}${btn('input-displayport','DisplayPort input',`aria-pressed="${s.monitorInput==='displayport'}"`)}</div><div class="hw-monitor-cable" role="group" aria-label="Monitor end of the HDMI cable">${btn('connect-signal',s.signalConnected?'✓ HDMI fitted at monitor':'Fit HDMI at monitor',`aria-pressed="${s.signalConnected}"`)}${btn('disconnect-signal','Unplug monitor HDMI',`aria-pressed="${!s.signalConnected}"`)}</div></section>`;
}

function signalCableSvg(s) {
  const start = s.signalConnected ? 'M390 349' : 'M425 370';
  const path = s.pcVideoConnected ? `${start}C452 365 423 ${s.videoPort==='gpu'?'336':'221'} 500 ${s.videoPort==='gpu'?'321':'221'}H${s.videoPort==='gpu'?'542':'541'}` : `${start}C445 365 421 407 473 420`;
  return `<path d="${path}" fill="none" stroke="#f7bb57" stroke-width="9"/><path d="${path}" fill="none" stroke="#8f5f24" stroke-width="3"/>${!s.signalConnected?'<rect x="414" y="364" width="20" height="12" rx="2" fill="#4d5e70" stroke="#f7bb57"/><text x="290" y="404" fill="#efbf6c" font-size="10">MONITOR END UNPLUGGED</text>':''}${!s.pcVideoConnected?'<rect x="465" y="414" width="20" height="12" rx="2" fill="#4d5e70" stroke="#f7bb57"/><text x="290" y="439" fill="#efbf6c" font-size="10">PC END UNPLUGGED</text>':''}`;
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

function screw(x, y) { return `<g class="hw-screw"><circle cx="${x}" cy="${y}" r="4.2" fill="#485568" stroke="#8290a1"/><path d="M${x-2} ${y}h4M${x} ${y-2}v4" stroke="#13202b" stroke-width="1.4"/></g>`; }
const PART_SOCKET = {board:'board-mount',cpu:'cpu-socket',cooler:'cooler-mount',ram:'dimm-a2',gpu:'pcie-x16',storage:'sata-bay',sata:'sata-data',atx:'atx-24',eps:'eps-8',front:'front-panel'};
function interactive(part, label, body, selected) { return `<g class="hw-hit ${selected === part ? 'hw-hit-selected' : ''}" role="button" tabindex="0" aria-label="Inspect ${label}" data-hw-action="inspect-${part}" ${PART_SOCKET[part]?`data-hw-socket="${PART_SOCKET[part]}"`:''}><title>${label}: activate to inspect, or place a held compatible part</title>${body}</g>`; }
function videoSocket(part, label, body, selected) {
  const port = part === 'gpu' ? 'gpu' : 'board';
  return `<g class="hw-hit hw-picture-socket ${selected===part?'hw-hit-selected':''}" role="button" tabindex="0" aria-label="${label}: inspect socket or connect the held display cable" data-hw-connector="${port}" data-hw-socket="video-${port}"><title>${label}: pick up the virtual cable, then select this socket to connect</title>${body}</g>`;
}
function rearGraphicsPanel(s) {
  if (!s.gpuInstalled) return '<rect x="24" y="268" width="222" height="58" rx="3" fill="url(#hw-vents)" stroke="#607489" stroke-width="2"/><text x="42" y="292" fill="#b0c0cd" font-size="10">EMPTY EXPANSION SLOT</text><text x="42" y="311" fill="#89a0b0" font-size="9">Fit a graphics card to add video ports</text>';
  return '<rect x="24" y="268" width="222" height="58" rx="3" fill="#182b34" stroke="#44d9bd" stroke-width="2"/><rect x="37" y="279" width="61" height="22" rx="2" fill="#0a1723" stroke="#8bd8cd"/><path d="M43 285h49l-5 10H48z" fill="#516877"/><rect x="116" y="279" width="42" height="22" fill="#11202b" stroke="#7a929c"/><text x="39" y="318" fill="#74e5cf" font-size="9">DEDICATED GPU · VIDEO OUTPUTS</text>';
}
function monitor(s, x=30, y=91, width=330, height=227) {
  const isReady = displayReady(s);
  const noSignal = !displayPathReady(s);
  const memoryStopped = s.boardInstalled && s.atxConnected && s.cpuPowerConnected && s.cpuInstalled && s.coolerInstalled && !s.ramSeated;
  const missingBootDrive = s.ramSeated && (!s.originalDriveInstalled || !s.sataDataConnected || !s.sataPowerConnected);
  const fault = noSignal ? {label:'NO SIGNAL',hint:`Source: ${s.monitorInput === 'hdmi' ? 'HDMI' : 'DisplayPort'} · Check both ends / source / PC output`} : memoryStopped ? {label:'MEMORY NOT DETECTED',hint:'POST stopped · check DIMM seating'} : missingBootDrive ? {label:'NO BOOT DEVICE',hint:'Check storage and boot connections'} : {label:'STARTUP INCOMPLETE',hint:'Read the startup / POST instrument below'};
  const inner = s.documentOpened ? `<rect x="${x+16}" y="${y+16}" width="${width-32}" height="${height-51}" rx="2" fill="#e7edf2"/><rect x="${x+16}" y="${y+16}" width="${width-32}" height="22" fill="#15547d"/><text x="${x+27}" y="${y+30}" fill="white" font-size="9">Lesson_Practice_File.docx</text><rect x="${x+64}" y="${y+52}" width="${width-128}" height="${height-106}" fill="#fff"/><text x="${x+78}" y="${y+72}" font-size="10" fill="#1b2b3d" font-weight="700">Classroom technology practice</text><path d="M${x+79} ${y+87}h${width-158}m-${width-158} 13h${width-168}m-${width-168} 13h${width-174}m-${width-174} 13h${width-158}" stroke="#aebdcb" stroke-width="2"/><rect x="${x+25}" y="${y+height-55}" width="${width-50}" height="13" rx="3" fill="#d6ede8"/><text x="${x+width/2}" y="${y+height-46}" text-anchor="middle" font-size="8" fill="#10624e">Original file opened · customer task delivered</text>` : isReady ? `<rect x="${x+15}" y="${y+15}" width="${width-30}" height="${height-48}" fill="url(#hw-screen)"/><path d="M${x+165} ${y+27}l75 30-30 100-65-40z" fill="#21cbb5" opacity=".1"/><g role="button" tabindex="0" aria-label="Open Lesson Practice File document" data-hw-action="open-document" class="hw-document-launch"><rect x="${x+35}" y="${y+39}" width="112" height="69" rx="6" fill="#183b53" stroke="#5fdfd0"/><path d="M${x+48} ${y+51}h19l7 7v24h-26z" fill="#dcebf1"/><path d="M${x+67} ${y+51}v8h7" fill="none" stroke="#20628c"/><text x="${x+60}" y="${y+75}" text-anchor="middle" fill="#13517c" font-size="13" font-weight="800">W</text><text x="${x+84}" y="${y+63}" fill="#fff" font-size="9">Open lesson</text><text x="${x+84}" y="${y+77}" fill="#a4d4dd" font-size="8">.docx · original file</text><text x="${x+91}" y="${y+98}" text-anchor="middle" fill="#6ee4ce" font-size="8">CLICK TO VERIFY DELIVERY</text></g><rect x="${x+15}" y="${y+height-51}" width="${width-30}" height="18" fill="#0a1929"/><rect x="${x+26}" y="${y+height-45}" width="8" height="8" fill="#57d5d0"/><text x="${x+48}" y="${y+height-38}" fill="#afc6d4" font-size="8">Classroom Desktop</text>` : `<rect x="${x+15}" y="${y+15}" width="${width-30}" height="${height-48}" fill="#040b12"/>${s.pcOn ? `<text x="${x+width/2}" y="${y+height/2-8}" text-anchor="middle" fill="${noSignal ? '#e7eef3' : '#f4bd6b'}" font-size="14" font-weight="700">${fault.label}</text><text x="${x+width/2}" y="${y+height/2+15}" text-anchor="middle" fill="#738ba0" font-size="9">${fault.hint}</text>` : `<circle cx="${x+width/2}" cy="${y+height/2-8}" r="13" fill="none" stroke="#33495e" stroke-width="2"/><path d="M${x+width/2} ${y+height/2-27}v19" stroke="#33495e" stroke-width="3"/><text x="${x+width/2}" y="${y+height/2+27}" text-anchor="middle" fill="#688095" font-size="9">PC POWER OFF</text>`}`;
  return `<g filter="url(#hw-shadow)"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="url(#hw-bezel)" stroke="#5e6e80" stroke-width="2"/>${inner}<circle cx="${x+width-22}" cy="${y+height-14}" r="3" fill="${s.pcOn ? '#42d8af' : '#b58b4b'}"/><text x="${x+width/2}" y="${y+height-13}" text-anchor="middle" fill="#8295aa" font-size="7" letter-spacing="2">CLASSROOM DISPLAY · ${s.monitorInput==='hdmi'?'HDMI':'DISPLAYPORT'}</text><path d="M${x+width/2-17} ${y+height}v29h34v-29M${x+width/2-72} ${y+height+41}h144l-20-12h-104z" fill="#303d4c" stroke="#617086"/></g><g role="button" tabindex="0" class="hw-hit hw-monitor-port" data-hw-socket="monitor-hdmi" data-hw-action="inspect-monitor" aria-label="Inspect the monitor HDMI input"><rect x="${x+width-108}" y="${y+height+8}" width="102" height="31" rx="4" fill="#1c303e" stroke="${s.signalConnected?'#aebda5':'#a9afbb'}"/><path d="M${x+width-99} ${y+height+16}h24l-4 9h-16z" fill="#0b1722" stroke="#9cabb6"/><text x="${x+width-48}" y="${y+height+27}" text-anchor="middle" fill="#b6cad1" font-size="8">HDMI IN</text></g>`;
}

function rearSvg(s) {
  return `<svg class="hw-svg" viewBox="0 0 900 580" role="group" aria-label="Rear connection view with inactive motherboard video, active graphics output, and mains power">${svgDefs()}<rect width="900" height="580" fill="#0a1420"/><rect width="900" height="580" fill="url(#hw-grid)"/>${monitor(s,30,112,365,250)}
  <g transform="translate(505 31)"><rect width="270" height="512" rx="9" fill="url(#hw-chassis)" stroke="#627183" stroke-width="3"/>${screw(14,15)}${screw(256,15)}${screw(14,496)}${screw(256,496)}<rect x="24" y="27" width="120" height="185" rx="4" fill="#64707d" stroke="#a4aebb"/><g fill="#111d2a" stroke="#b0b9c4"><rect x="38" y="43" width="29" height="17" rx="2"/><rect x="75" y="43" width="29" height="17" rx="2"/><rect x="38" y="79" width="29" height="17" rx="2"/><rect x="75" y="79" width="29" height="17" rx="2"/><rect x="38" y="115" width="36" height="25" rx="2"/></g><circle cx="96" cy="166" r="7" fill="#77a585"/><circle cx="117" cy="166" r="7" fill="#bd7e8d"/>${videoSocket('rear','motherboard video output',`<rect x="36" y="178" width="73" height="22" rx="3" fill="#101a28" stroke="${s.pcVideoConnected&&s.videoPort==='board'?'#f5b85b':'#99a8b8'}" stroke-width="2"/><path d="M43 184h58l-6 11H49z" fill="#444e5e"/><text x="36" y="232" fill="#e4bc76" font-size="10">MOTHERBOARD VIDEO</text><text x="36" y="247" fill="#9aaabc" font-size="9">Inactive on this workstation</text>`,s.selectedPart)}<rect x="163" y="30" width="82" height="180" rx="5" fill="url(#hw-vents)" stroke="#455265"/><g stroke="#687487" fill="url(#hw-vents)"><rect x="24" y="268" width="222" height="26" rx="2"/><rect x="24" y="300" width="222" height="26" rx="2"/><rect x="24" y="332" width="222" height="26" rx="2"/></g>${videoSocket('gpu','dedicated graphics-card outputs',rearGraphicsPanel(s),s.selectedPart)}${interactive('power','AC mains inlet',`<rect x="24" y="388" width="222" height="95" rx="4" fill="#151c28" stroke="#6b7888"/><circle cx="183" cy="434" r="35" fill="url(#hw-vents)" stroke="#59697a"/><rect x="38" y="413" width="54" height="35" rx="2" fill="#050b13" stroke="${s.acConnected?'#8cdec9':'#9cabbb'}" stroke-width="2"/><path d="M50 422v14m16-14v14m14-14v14" stroke="#7d8c9b" stroke-width="3"/><rect x="105" y="414" width="22" height="27" rx="2" fill="#080e17" stroke="#6e7e90"/><text x="116" y="432" text-anchor="middle" fill="#aec2d1" font-size="11">I</text><text x="39" y="468" fill="#8ca4b6" font-size="9">PSU · AC INLET · VIRTUAL ONLY</text>`,s.selectedPart)}</g>
  ${signalCableSvg(s)}${s.acConnected?'<path d="M544 463C464 463 485 551 390 551H330" fill="none" stroke="#080c14" stroke-width="14"/><path d="M544 463C464 463 485 551 390 551H330" fill="none" stroke="#647183" stroke-width="2"/>':''}<text x="30" y="46" fill="#e5edf3" font-size="19" font-weight="700">Follow the cable to its source.</text><text x="30" y="68" fill="#8fa4b6" font-size="12">The upper I/O panel and expansion-slot outputs serve different components.</text></svg>`;
}

function benchSvg(s, closeup = false) {
  const selected = s.selectedPart;
  const pcb = s.boardInstalled;
  return `<svg class="hw-svg ${closeup ? 'hw-svg-closeup' : ''}" viewBox="${closeup ? '392 43 478 550' : '0 0 900 620'}" role="group" aria-label="${closeup ? 'Enlarged PC internals: ' : 'Virtual classroom PC workbench with monitor, '}motherboard, processor, DDR4 RAM, graphics card, power supply, and original SATA SSD">${svgDefs()}<rect width="900" height="620" fill="#0a1420"/><rect width="900" height="620" fill="url(#hw-grid)"/><text class="hw-bench-annotation" x="30" y="33" fill="#bdcddd" font-size="11" letter-spacing="2">CLASSROOM WORKSTATION / SIDE PANEL REMOVED</text>${closeup ? '' : monitor(s,25,70,340,232)}
  <g transform="translate(402 53)"><path d="M0 18L18 0h440v515l-18 18H0z" fill="#111b28" stroke="#667486" stroke-width="2"/><path d="M0 18h440V533M440 18l18-18" fill="none" stroke="#9ba7b6" stroke-opacity=".5"/><rect x="12" y="31" width="416" height="489" rx="3" fill="url(#hw-chassis)" stroke="#526172"/>${screw(21,42)}${screw(419,42)}${screw(21,510)}${screw(419,510)}<rect x="28" y="54" width="270" height="354" rx="7" fill="${pcb?'url(#hw-board)':'#172431'}" stroke="${pcb?'#397d6b':'#4a5a6d'}" stroke-width="2" ${!pcb?'stroke-dasharray="7 5"':''}/>
  ${pcb?`<g fill="none" stroke="#326554" stroke-width="1" opacity=".7"><path d="M59 82h99v54h65v135h48M45 208h72v67h97v100h65M57 217h46v74h83v110M188 78v53h58v221M38 332h61v51h97M47 90v66h25v49M133 71v32h51M158 303v37h-37v41M175 276h26v76h28"/><path d="M40 102h18v41h38M113 187v48h64v38M240 189h30v66M200 379h57"/></g><g fill="#c1ced1" stroke="#3a4b48">${[43,279].map(x=>[66,391].map(y=>screw(x,y)).join('')).join('')}</g><rect x="37" y="84" width="25" height="100" rx="2" fill="url(#hw-metal)"/><path d="M43 91v86m5-86v86m5-86v86" stroke="#17252c"/><rect x="78" y="67" width="89" height="20" rx="2" fill="#293740" stroke="#6e8290"/><path d="M84 72h77m-77 5h77m-77 5h77" stroke="#0c1b26"/><g fill="#9daaa6" stroke="#1e3c36"><circle cx="72" cy="92" r="5"/><circle cx="86" cy="92" r="5"/><circle cx="100" cy="92" r="5"/><circle cx="72" cy="107" r="5"/></g>`:`<text x="163" y="224" text-anchor="middle" fill="#53687a" font-size="13">MOTHERBOARD STANDOFFS</text><text x="163" y="245" text-anchor="middle" fill="#53687a" font-size="10">Install board before components</text>${[49,276].map(x=>[78,263,387].map(y=>`<circle cx="${x}" cy="${y}" r="5" fill="#9b865a"/>`).join('')).join('')}`}
  ${interactive('board','motherboard specifications',`<rect x="30" y="55" width="268" height="353" rx="6" fill="transparent"/><text x="39" y="401" fill="${pcb?'#67bca3':'#64788c'}" font-size="9">01 / MICRO-ATX · DDR4 · SATA</text>`,selected)}
  ${pcb?interactive('cpu','LGA processor and CPU socket',`<rect x="82" y="113" width="102" height="100" rx="5" fill="#202c32" stroke="#758e91" stroke-width="2"/><rect x="94" y="125" width="78" height="76" fill="${s.cpuInstalled?'url(#hw-metal)':'#18272a'}" stroke="#4c6267"/>${s.cpuInstalled?'<text x="133" y="165" text-anchor="middle" fill="#12242e" font-size="9" font-weight="700">PROCESSOR</text>':'<path d="M100 132l66 61m-66 0l66-61" stroke="#3b5156"/>'}<path d="M90 210h89v-89" fill="none" stroke="#b5bbbd" stroke-width="2"/><path d="M97 128l7 0-7 7z" fill="#d7ae54"/>`,selected):''}
  ${pcb&&s.coolerInstalled?interactive('cooler','processor cooler and fan',`<rect x="78" y="108" width="111" height="111" rx="8" fill="url(#hw-metal)" stroke="#8e9ca7"/><path d="M85 113v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101m7-101v101" stroke="#354653" stroke-width="2"/><circle cx="133" cy="163" r="47" fill="#172631" stroke="#627e8c" stroke-width="2"/><g class="${s.pcOn?'hw-fan-running':''}" style="transform-origin:133px 163px">${[0,60,120,180,240,300].map(a=>`<path d="M133 163C101 151 99 126 115 123C137 121 137 141 133 163Z" transform="rotate(${a} 133 163)" fill="#44657a" stroke="#6c8e9e"/>`).join('')}</g><circle cx="133" cy="163" r="12" fill="#afc2cb" stroke="#233d4c"/>${screw(86,116)}${screw(181,116)}${screw(86,211)}${screw(181,211)}<text x="133" y="234" text-anchor="middle" fill="#86abae" font-size="8">CPU COOLER / CPU_FAN</text>`,selected):''}
  ${pcb?interactive('ram','DDR4 DIMM slot and memory',`<g transform="translate(215 90)"><rect class="hw-socket-hitbox" x="-7" y="-10" width="64" height="205" rx="4" fill="transparent" pointer-events="all"/><rect width="19" height="169" rx="2" fill="#111e24" stroke="#597b6d"/><rect x="28" width="19" height="169" rx="2" fill="#111e24" stroke="#597b6d"/><path d="M8 7v152m28-152v152" stroke="#8a9d82" stroke-width="2"/>${s.ramSeated?'<rect x="27" y="3" width="21" height="162" rx="1" fill="#1f785c" stroke="#6cca9a"/><path d="M32 16v136m11-136v136" stroke="#d1b550"/><rect x="33" y="22" width="10" height="27" fill="#112d2c"/><rect x="33" y="57" width="10" height="27" fill="#112d2c"/><rect x="33" y="92" width="10" height="27" fill="#112d2c"/><rect x="33" y="127" width="10" height="24" fill="#112d2c"/><path d="M24 4h27v8H24zM24 156h27v8H24z" fill="#98b3a9"/>':s.caseId==='INC-103'?'<g transform="rotate(-7 37 83)"><rect x="27" y="-6" width="21" height="162" fill="#26775b" stroke="#c9a95e"/><rect x="33" y="18" width="9" height="105" fill="#122d2b"/></g><path d="M23 -2l-9-7m37 171l10 5" stroke="#efbd6c" stroke-width="3"/>':''}<text x="24" y="185" text-anchor="middle" fill="${s.ramSeated?'#84d4b0':'#bcb281'}" font-size="8">DDR4 · A2</text></g>`,selected):''}
  ${pcb?interactive('gpu','PCIe graphics card',`<rect x="52" y="276" width="215" height="17" fill="#152528" stroke="#607a70"/><path d="M59 283h198" stroke="#d0b46a" stroke-width="3"/>${s.gpuInstalled?`<rect x="48" y="263" width="229" height="77" rx="5" fill="#182d36" stroke="#729a9a" stroke-width="2"/><rect x="53" y="268" width="218" height="66" rx="4" fill="#243d48"/><circle cx="89" cy="301" r="25" fill="#112833" stroke="#738f99"/><path d="M89 278v46m-23-23h46m-39-16l33 32m0-32l-33 32" stroke="#4e7889" stroke-width="3"/><circle cx="89" cy="301" r="6" fill="#94b4bd"/><text x="133" y="295" fill="#8ad6c9" font-size="10" font-weight="700">PCIe GRAPHICS</text><text x="133" y="311" fill="#8caab4" font-size="8">Dedicated display output</text><rect x="251" y="270" width="15" height="15" fill="#080f15" stroke="${s.gpuPowerConnected?'#c8af6a':'#8fa0a5'}"/><path d="M48 263H33v80h15" fill="none" stroke="#98a8b2" stroke-width="4"/>`:'<text x="158" y="312" text-anchor="middle" fill="#678d86" font-size="9">PCIe x16 · GRAPHICS SLOT</text>'}`,selected):''}
  ${pcb?interactive('sata','motherboard SATA data ports',`<rect x="237" y="354" width="47" height="27" rx="2" fill="#332d19" stroke="#9f9154"/><rect x="242" y="359" width="15" height="16" fill="#121c21"/><rect x="264" y="359" width="15" height="16" fill="#121c21"/><text x="261" y="394" text-anchor="middle" fill="#b3a476" font-size="7">SATA_1 / 2</text>`,selected):''}
  ${interactive('power','power supply',`<rect x="309" y="55" width="105" height="149" rx="4" fill="#151e2b" stroke="#7b8794" stroke-width="2"/><text x="362" y="75" text-anchor="middle" fill="#b4c3cf" font-size="9" font-weight="700">POWER SUPPLY</text><circle cx="362" cy="122" r="33" fill="url(#hw-vents)" stroke="#627387"/><circle cx="362" cy="122" r="10" fill="#263342"/><path d="M338 99l48 46m-48 0l48-46m-24-9v66m-33-33h66" stroke="#465a6b" stroke-width="2"/><text x="362" y="177" text-anchor="middle" fill="#7e93a6" font-size="8">ATX · 400 W</text><text x="362" y="191" text-anchor="middle" fill="${s.acConnected?'#edbd71':'#6fddbb'}" font-size="8">${s.acConnected?'AC CONNECTED':'AC DISCONNECTED'}</text>`,selected)}
  ${interactive('storage','original 2.5-inch SATA SSD',`<rect x="308" y="316" width="107" height="132" rx="6" fill="#18232f" stroke="#7d8c9e" stroke-width="2"/>${s.originalDriveInstalled?`<rect x="317" y="325" width="89" height="111" rx="4" fill="url(#hw-metal)"/><rect x="325" y="336" width="73" height="64" rx="2" fill="#142430"/><text x="361" y="354" text-anchor="middle" fill="#d3e3ea" font-size="10" font-weight="700">256 GB SSD</text><text x="361" y="372" text-anchor="middle" fill="#8eb3bd" font-size="8">ORIGINAL DRIVE</text><text x="361" y="388" text-anchor="middle" fill="#7f9baf" font-size="7">OS + CLASSROOM FILES</text><rect x="327" y="421" width="18" height="10" fill="#171e1f" stroke="#e2bb56"/><rect x="350" y="421" width="34" height="10" fill="#171e1f" stroke="#e2bb56"/>`:'<rect x="317" y="325" width="89" height="111" rx="4" fill="none" stroke="#40556b" stroke-dasharray="5 5"/><text x="361" y="375" text-anchor="middle" fill="#74889e" font-size="10">EMPTY BAY</text>'}<text x="360" y="465" text-anchor="middle" fill="#8aa2b5" font-size="8">2.5-INCH SATA DRIVE BAY</text>`,selected)}
  ${pcb?`${interactive('atx','24-pin motherboard power',`<rect x="282" y="125" width="13" height="64" rx="2" fill="#161c1f" stroke="${s.atxConnected?'#c6aa62':'#5a6e76'}"/><path d="M286 131v52m4-52v52" stroke="#9a9c86" stroke-dasharray="2 2"/>`,selected)}${interactive('eps','8-pin CPU power',`<rect x="65" y="60" width="35" height="12" fill="#14201f" stroke="${s.cpuPowerConnected?'#d4ba71':'#6a807d'}"/>`,selected)}${interactive('front','front panel header',`<rect x="173" y="380" width="35" height="12" fill="#14201f" stroke="${s.frontPanelConnected?'#a3cbd2':'#6a807d'}"/><text x="189" y="374" text-anchor="middle" fill="#83a199" font-size="6">F_PANEL</text>`,selected)}`:''}
  ${s.atxConnected&&pcb?'<path d="M315 156C301 153 309 150 296 151" fill="none" stroke="#b58b46" stroke-width="9"/><path d="M315 156C301 153 309 150 296 151" fill="none" stroke="#e3c56f" stroke-width="2"/>':''}${s.cpuPowerConnected&&pcb?'<path d="M315 108C300 38 158 38 83 59" fill="none" stroke="#1b1820" stroke-width="9"/><path d="M315 108C300 38 158 38 83 59" fill="none" stroke="#b39755" stroke-width="2"/>':''}${s.gpuPowerConnected&&s.gpuInstalled?'<path d="M315 183C299 215 302 247 264 275" fill="none" stroke="#22232a" stroke-width="8"/><path d="M315 183C299 215 302 247 264 275" fill="none" stroke="#c6a04a" stroke-width="2"/>':''}${s.sataDataConnected&&s.originalDriveInstalled&&pcb?'<path d="M250 368C285 368 279 429 330 429" fill="none" stroke="#e5a343" stroke-width="7"/><path d="M250 368C285 368 279 429 330 429" fill="none" stroke="#ffd27a" stroke-width="1.5"/>':''}${s.sataPowerConnected&&s.originalDriveInstalled?'<path d="M378 203V295Q378 307 394 307H418V425H378" fill="none" stroke="#0b1018" stroke-width="10"/><path d="M378 203V295Q378 307 394 307H418V425H378" fill="none" stroke="#5b7081" stroke-width="2"/>':''}${s.frontPanelConnected&&pcb?'<path d="M190 386V480H290" fill="none" stroke="#57909a" stroke-width="3"/>':''}
  <rect x="29" y="484" width="257" height="18" fill="url(#hw-vents)"/><text x="31" y="478" fill="#6c8196" font-size="8">CASE VENTILATION / KEEP CLEAR</text></g>
  <g class="hw-bench-annotation" transform="translate(28 392)"><rect width="335" height="155" rx="8" fill="#121f2d" stroke="#30475b"/><text x="17" y="25" fill="#a4b9cb" font-size="10" font-weight="700">COMPATIBILITY LABEL</text><text x="17" y="49" fill="#6f8ca1" font-size="10">MEMORY</text><text x="122" y="49" fill="#d4e3ec" font-size="11">DDR4 · 288-pin DIMM</text><text x="17" y="73" fill="#6f8ca1" font-size="10">STORAGE</text><text x="122" y="73" fill="#d4e3ec" font-size="11">2.5-inch SATA · 6 Gb/s</text><text x="17" y="97" fill="#6f8ca1" font-size="10">GRAPHICS</text><text x="122" y="97" fill="#d4e3ec" font-size="11">PCIe x16 · dedicated output</text><path d="M17 111h299" stroke="#2d4355"/><text x="17" y="134" fill="#6fdac4" font-size="9">Your real device is never accessed or changed.</text></g><text class="hw-bench-annotation" x="30" y="590" fill="#6d8ba2" font-size="10">SCHEMATIC WORKBENCH · ILLUSTRATIVE SCALE · CLICK A COMPONENT TO INSPECT</text></svg>`;
}

function displaySvg(s) { return `<svg class="hw-svg hw-svg-display" viewBox="0 0 900 620" role="group" aria-label="Classroom monitor and original lesson document">${svgDefs()}<rect width="900" height="620" fill="#0a1420"/><rect width="900" height="620" fill="url(#hw-grid)"/><text x="80" y="44" fill="#90acbd" font-size="12" letter-spacing="2">CUSTOMER TASK / RESTORE THE DISPLAY AND OPEN THE LESSON FILE</text>${monitor(s,80,80,740,455)}</svg>`; }

const installedFor = (s, part) => ({ board:s.boardInstalled,cpu:s.cpuInstalled,cooler:s.coolerInstalled,ram:s.ramSeated,gpu:s.gpuInstalled,storage:s.originalDriveInstalled,atx:s.atxConnected,eps:s.cpuPowerConnected,'gpu-power':s.gpuPowerConnected,sata:s.sataDataConnected,'sata-power':s.sataPowerConnected,front:s.frontPanelConnected })[part];
function btn(action,label, extra='') { return `<button type="button" class="hw-action" data-hw-action="${action}" ${extra}>${label}</button>`; }

const SOCKET_LABELS = [
  ['board-mount','Case standoffs','board'],['cpu-socket','LGA CPU socket','cpu'],
  ['cooler-mount','Cooler mount + CPU_FAN','cooler'],['dimm-a2','DDR4 DIMM A2','ram'],
  ['pcie-x16','PCIe x16 slot','gpu'],['sata-bay','2.5-inch SATA bay','storage'],
  ['atx-24','24-pin ATX_PWR','atx'],['eps-8','8-pin CPU_PWR / EPS','eps'],
  ['gpu-6','6-pin GPU power','gpu-power'],['sata-data','SATA_1 data','sata'],
  ['sata-power','Wide SATA power','sata-power'],['front-panel','F_PANEL switch','front'],
  ['video-board','Motherboard HDMI output','rear'],['video-gpu','Graphics-card HDMI output','gpu'],
  ['monitor-hdmi','Monitor HDMI input','monitor']
];

function partPicture(part) {
  const bodies = {
    board:'<path d="M9 7h43v34H9z" fill="#1c6655" stroke="#76b69d"/><rect x="17" y="13" width="15" height="14" fill="#9caeb2"/><path d="M39 12v23m5-23v23M14 34h20" stroke="#dfc67d" stroke-width="3"/>',
    cpu:'<rect x="18" y="9" width="27" height="27" rx="2" fill="#9eabb5" stroke="#d6e2e6"/><rect x="23" y="14" width="17" height="17" fill="#6c808d"/><path d="M18 36l6 0-6-6z" fill="#f6ce77"/>',
    cooler:'<rect x="14" y="6" width="34" height="36" rx="4" fill="#879aa6"/><circle cx="31" cy="24" r="15" fill="#132b3c" stroke="#c3d6df"/><path d="M31 11v26M18 24h26m-22-9l18 18m0-18l-18 18" stroke="#6898ad" stroke-width="4"/><circle cx="31" cy="24" r="4" fill="#c4dade"/>',
    ram:'<path d="M6 15h50v19H6z" fill="#257458" stroke="#98c1a7"/><path d="M10 34h17m6 0h19" stroke="#e3c97b" stroke-width="4"/><g fill="#122c2b"><path d="M10 19h8v10h-8zM22 19h8v10h-8zM34 19h8v10h-8zM46 19h6v10h-6z"/></g>',
    gpu:'<path d="M7 14h49v22H7z" fill="#375363" stroke="#99b8bd"/><circle cx="23" cy="25" r="9" fill="#162f3e" stroke="#92b6c8"/><path d="M23 17v16m-8-8h16M8 37h32" stroke="#c6b570" stroke-width="3"/><path d="M6 11v31" stroke="#b9c6ce" stroke-width="3"/>',
    storage:'<rect x="14" y="5" width="34" height="39" rx="4" fill="#8497a5" stroke="#c4d1d8"/><path d="M19 12h24v22H19z" fill="#213747"/><text x="31" y="26" text-anchor="middle" fill="#c5e5e3" font-size="8">SSD</text><path d="M19 41h8m4 0h11" stroke="#f0d17f" stroke-width="3"/>',
    nvme:'<rect x="8" y="17" width="46" height="14" rx="2" fill="#28735c" stroke="#a3c4ae"/><path d="M10 20h8v8h-8m13-8h13v8H23" fill="#172e30"/><path d="M50 19v10" stroke="#e6c984" stroke-width="4"/>',
    'hdmi-pc':'<path d="M0 28h22m18 0h22" stroke="#c4a26a" stroke-width="5"/><path d="M20 17h22v20H20z" fill="#718491" stroke="#d1e0e5"/><path d="M23 17v-6h16v6" fill="#acbbc2"/>',
    'hdmi-monitor':'<path d="M0 28h22m18 0h22" stroke="#c4a26a" stroke-width="5"/><path d="M20 17h22v20H20z" fill="#718491" stroke="#d1e0e5"/><path d="M23 17v-6h16v6" fill="#acbbc2"/>'
  };
  const cable = `<path d="M5 38C3 12 36 42 35 14" fill="none" stroke="${part==='sata'?'#da8b56':part==='front'?'#81a9b4':'#b5a160'}" stroke-width="5"/><rect x="27" y="5" width="23" height="16" rx="2" fill="#283947" stroke="#a8bbc6"/><path d="M32 9v8m5-8v8m5-8v8m4-8v8" stroke="#d9c58d" stroke-width="2"/>`;
  return `<svg viewBox="0 0 62 48" aria-hidden="true" focusable="false">${bodies[part]||cable}</svg>`;
}

function renderManipulationTray(s) {
  const available = PARTS.filter(([part]) => !installedFor(s,part)).length;
  const fittedCards = [];
  const cards = PARTS.map(([part,name,detail]) => {
    const fitted = installedFor(s,part);
    const card = `<button type="button" class="hw-pick-part ${fitted?'hw-pick-fitted':''}" data-hw-pick="${part}" data-hw-pick-label="${name}" aria-pressed="false" aria-label="${fitted?`${name}: fitted`:`Pick up ${name}. ${detail}`}" ${fitted?'disabled':''}>${partPicture(part)}<span><strong>${name}</strong><small>${fitted?'✓ Fitted':detail}</small></span>${fitted?'<em>In PC</em>':'<span class="hw-part-drag-handle" data-hw-drag-handle aria-hidden="true"><b>⠿</b><small>Drag</small></span>'}</button>`;
    if (fitted) { fittedCards.push(card); return ''; }
    return card;
  }).filter(Boolean);
  cards.push(...[['hdmi-pc','HDMI · PC end',!s.pcVideoConnected?'Loose at PC':s.videoPort==='gpu'?'At graphics card':'At motherboard'],['hdmi-monitor','HDMI · monitor end',s.signalConnected?'Fitted at monitor':'Loose at monitor'],['nvme','Spare M.2 NVMe','Compare its connector']].map(([part,name,detail]) => `<button type="button" class="hw-pick-part" data-hw-pick="${part}" data-hw-pick-label="${name}" aria-pressed="false" aria-label="Pick up ${name}. ${detail}">${partPicture(part)}<span><strong>${name}</strong><small>${detail}</small></span><span class="hw-part-drag-handle" data-hw-drag-handle aria-hidden="true"><b>⠿</b><small>Drag</small></span></button>`));
  return `<section class="hw-handling" aria-label="Hands-on parts and cables"><div class="hw-handling-heading"><div><span class="hw-eyebrow">HANDS-ON WORKBENCH</span><h3>Pick a part. Find its connection.</h3></div><span class="hw-stock-count">${available} loose / ${PARTS.length} assembly items</span></div><p class="hw-handling-help">Mouse: drag a part. Touch or pen: drag its grip marked Drag; swipe the rest of a card to scroll the tray. You can also tap a part, then tap its labeled socket. Nothing changes until you choose a compatible destination; internal work still needs power off and AC unplugged.</p><div class="hw-pick-grid">${cards.join('')}</div>${fittedCards.length?`<details class="hw-fitted-inventory"><summary>${fittedCards.length} fitted items · view current inventory</summary><div class="hw-pick-grid">${fittedCards.join('')}</div></details>`:''}<div class="hw-held-readout"><p role="status" aria-live="polite" aria-atomic="true" data-hw-manipulation-status>Parts in the tray reflect the current PC. Pick up a loose part or either end of the HDMI cable.</p><button class="hw-action" type="button" data-hw-cancel-pick hidden>Cancel / put down</button></div></section>`;
}

function renderSocketList() {
  return `<details class="hw-target-list" data-hw-target-list><summary>Large socket controls · tap or use keyboard</summary><p>These controls represent the same labeled sockets in the picture. Picking a part highlights its compatible connector shapes, not the cause of the fault.</p><div class="hw-target-grid">${SOCKET_LABELS.map(([socket,label,inspect])=>`<button type="button" data-hw-socket="${socket}" data-hw-action="inspect-${inspect}"><span aria-hidden="true">${socket.includes('video')||socket==='monitor-hdmi'?'▱':'▥'}</span>${label}</button>`).join('')}</div></details>`;
}

function extraBenchSockets(s) {
  return `<g class="hw-physical-connectors"><g transform="translate(402 53)">${s.boardInstalled?`${!s.coolerInstalled?`<g role="button" tabindex="0" class="hw-hit" data-hw-socket="cooler-mount" data-hw-action="inspect-cooler" aria-label="Inspect CPU cooler mounting posts and CPU FAN"><rect x="75" y="222" width="118" height="27" rx="4" fill="#182d31" stroke="#698b87"/><text x="134" y="239" text-anchor="middle" fill="#b0cbc5" font-size="9">COOLER / CPU_FAN</text></g>`:''}<g role="button" tabindex="0" class="hw-hit" data-hw-socket="gpu-6" data-hw-action="inspect-gpu-power" aria-label="Inspect 6-pin GPU power connector"><rect x="247" y="261" width="45" height="33" rx="4" fill="#182b32" stroke="#8b957a"/><path d="M253 267h10v9h-10m15-9h10v9h-10" fill="#0b1722" stroke="#b5b396"/><text x="269" y="288" text-anchor="middle" fill="#c7c9ad" font-size="7">GPU 6-PIN</text></g>`:''}<g role="button" tabindex="0" class="hw-hit" data-hw-socket="sata-power" data-hw-action="inspect-sata-power" aria-label="Inspect wide SATA power connector on drive"><rect x="347" y="419" width="54" height="29" rx="3" fill="#182b32" stroke="#9a956f"/><path d="M353 426h40v8h-40z" fill="#101c24" stroke="#cfb875"/><text x="374" y="444" text-anchor="middle" fill="#d2c49c" font-size="6">SATA POWER</text></g></g></g>`;
}

function addBenchDetail(svg, s, view) {
  if (view === 'display') return svg;
  if (view === 'rear') return svg;
  const floor = '<path d="M18 557L390 536l493 41-39 29H45z" fill="#040a12" opacity=".5"/><path d="M407 585h29m378 0h31" stroke="#596b78" stroke-width="8"/>';
  const depth = `<path d="M860 53l25 20v514l-25-1z" fill="url(#hw-chassis)" stroke="#627387"/><path d="M867 143l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10m-12 8l12 10" stroke="#0a1420" stroke-width="5"/><g class="hw-hit" role="button" tabindex="0" data-hw-action="boot" aria-label="Press the virtual case power button"><path d="M867 97l12 6v23l-12-6z" fill="#182b37" stroke="#a4b6bf"/><circle cx="873" cy="111" r="3" fill="${s.pcOn?'#6de1ba':'#546c7f'}"/></g>`;
  const rearInset = view === 'internals' ? '' : `<g class="hw-rear-inset"><text x="29" y="353" fill="#9ab4c7" font-size="8" letter-spacing="1">REAR HDMI OUTPUTS · DIFFERENT CONNECTION POINTS</text>${videoSocket('rear','motherboard HDMI output',`<rect x="28" y="361" width="159" height="30" rx="4" fill="#172734" stroke="#64768a"/><path d="M37 370h25l-4 11H41z" fill="#0c1722" stroke="#a4b3bc"/><text x="72" y="380" fill="#bbcad3" font-size="9">MOTHERBOARD</text>`,s.selectedPart)}${videoSocket('gpu','graphics-card HDMI output',`<rect x="194" y="361" width="169" height="30" rx="4" fill="#172734" stroke="#64768a"/><path d="M204 370h25l-4 11h-17z" fill="#0c1722" stroke="#a4b3bc"/><text x="238" y="380" fill="#bbcad3" font-size="9">GRAPHICS CARD</text>`,s.selectedPart)}${s.pcVideoConnected?`<path d="M${s.videoPort==='gpu'?'216':'49'} 384v12" stroke="#d6af64" stroke-width="6"/>`:''}<text x="359" y="414" text-anchor="end" fill="#b7a37a" font-size="8">${!s.pcVideoConnected?'PC cable end is disconnected':`Cable currently at ${s.videoPort==='gpu'?'graphics card':'motherboard'}`}</text></g>`;
  return svg.replace('fill="url(#hw-grid)"/>',`fill="url(#hw-grid)"/>${floor}`).replace('</svg>',`${depth}${extraBenchSockets(s)}${rearInset}</svg>`);
}

function renderHardwareHelp(build) {
  return '<section class="hw-help" aria-label="How to use this workbench"><h4>How to use this workbench <span>Keep these 3 steps in view</span></h4><ol><li><strong>1 · Inspect.</strong> Click or tap a labeled part, or choose it in the component menu. Read what you find. Inspecting only looks; it does not repair anything.</li><li><strong>2 · Change.</strong> Use <em>Make a change</em>' + (build ? ' or an <em>Install</em> button. Dragging is optional.' : ' below the inspection. No dragging is needed.') + ' For internal parts: <em>Power off</em>, then <em>Unplug AC</em> first. Monitor source and external display-cable controls do not open the PC.</li><li><strong>3 · Test.</strong> After internal work, choose <em>Connect AC</em>, then <em>Power on / test</em>. Check the monitor and open the lesson file. Then use <em>Check &amp; explain</em> on this page.</li></ol><p>Everything is virtual; leave your real device alone. Drag a tray part onto a matching labeled socket, or tap the part and then the socket. Keyboard: Tab, then Enter or Space; Escape puts a held part down. Arrow keys switch picture views.</p></section>';
}

// These checkpoints describe the present equipment state, rather than awarding points for clicks.
function hardwareMission(id, s) {
  const fitted = PARTS.filter(part => installedFor(s, part[0])).length;
  const repaired = hardwareReady(s) && displayPathReady(s) && (id !== 'INC-102' || s.acConnected);
  const desktop = repaired && displayReady(s);
  const delivered = desktop && s.documentOpened;
  const stage = !repaired ? 'repair' : !desktop ? 'startup' : !delivered ? 'delivery' : 'confirmed';
  const titles = {
    'INC-101': 'Bring the lesson back into view.',
    'INC-102': 'Find the break in the power path.',
    'INC-103': 'Get past the memory check.',
    'INC-104': 'Find the original classroom desktop.',
    'INC-105': 'Choose the connection that fits.',
    'INC-106': 'Build a workstation ready for class.',
    'INC-107': 'Match the monitor source to the cable.',
    'INC-108': 'Complete the display signal path.'
  };
  let feedback, action, label;
  if (stage === 'confirmed') {
    feedback = 'The original lesson file is open. Use this result in your ticket report: explain the cause, your change, and what proved it worked.';
    action = 'inspect-monitor'; label = 'Review the restored display';
  } else if (stage === 'delivery') {
    feedback = 'The classroom desktop is back. Now prove that the customer can complete the original lesson task.';
    action = 'open-document'; label = 'Open the original lesson file';
  } else if (stage === 'startup') {
    feedback = !s.acConnected ? 'The components and video route are ready. Reconnect AC, start the PC, and watch what the startup test reveals.' : 'The component connections are ready. Run a startup test and confirm that the original classroom desktop appears.';
    action = !s.acConnected ? 'inspect-power' : 'boot'; label = !s.acConnected ? 'Check the power state' : 'Run a startup test';
  } else {
    feedback = id === 'INC-106' ? `${fitted} of ${PARTS.length} compatible parts and cables fitted. Build from the motherboard outward, then check the monitor connection.` : ['INC-101','INC-107','INC-108'].includes(id) ? 'The tower is running, but the lesson is out of view. Compare the source selector, both cable ends, and the PC output before replacing a component.' : id === 'INC-102' ? 'A working power button needs an unbroken power path. Inspect that path before replacing parts.' : safetyReady(s) ? 'The virtual bench is safe. Compare what you found with the component requirements, then make one change you can explain.' : s.pcOn ? 'Inspect the evidence first. Shut down and disconnect AC before changing anything inside the virtual PC.' : 'The PC is off, but AC is still connected. Internal changes stay locked until both safety conditions are met.';
    action = `inspect-${CASES[id].select}`; label = ['INC-107','INC-108'].includes(id) ? 'Inspect the monitor and its input' : id === 'INC-101' ? 'Inspect the video route' : id === 'INC-102' ? 'Inspect the power path' : id === 'INC-103' ? 'Inspect the memory' : id === 'INC-106' ? 'Read the board specifications' : 'Inspect the storage';
  }
  return { title: titles[id], stage, repaired, desktop, delivered, feedback, action, label, fitted, completed: [repaired, desktop, delivered].filter(Boolean).length };
}

function hardwareCoach(id, s, mission) {
  const safeNext = (action, label) => s.pcOn ? ['power-off', 'Power off the virtual PC', 'Start with a controlled shutdown. Then disconnect AC before making an internal change.'] : s.acConnected ? ['unplug', 'Disconnect the virtual AC cord', 'The PC is off; disconnect its AC cord next. Only then is the internal workbench safe.'] : [action, label, 'Both safety conditions are met. Make this one change, then test the result.'];
  let hints, next;
  if (mission.stage === 'confirmed') {
    hints = ['Look back at the original symptom. What evidence now shows a different result?', 'A useful handover names the cause, the repair, and the customer task you tested.', 'Keep the lesson result in your report and complete your reflection before delivering the ticket.'];
    next = ['inspect-monitor', 'Review delivery evidence'];
  } else if (mission.stage === 'delivery') {
    hints = ['A successful boot shows that the system starts. What was the person actually trying to do?', 'The requested proof is a working display and the existing lesson document, not a replacement operating system.', 'Open Lesson_Practice_File.docx from the original classroom drive.'];
    next = ['open-document', 'Open the original lesson file'];
  } else if (mission.stage === 'startup') {
    hints = ['A component can look connected without proving that the whole system works. Which test would show the result?', 'Reconnect AC after internal work, start the computer, and distinguish a passed POST check from a loaded desktop.', !s.acConnected ? 'The virtual AC cord is still disconnected. Reconnect it, then use Power on / test.' : 'Use Power on / test. Check the monitor before claiming that the customer’s task is restored.'];
    next = !s.acConnected ? ['plug-in', 'Connect virtual AC'] : ['boot', 'Run the startup test'];
  } else if (id === 'INC-101') {
    hints = ['A powered monitor can still have no picture. Trace where its video signal comes from.', 'This workstation has a dedicated graphics card. Compare its lower expansion-slot outputs with the upper motherboard I/O.', 'Move the virtual monitor cable to the graphics card output, then inspect the display.'];
    next = ['video-gpu', 'Connect monitor to graphics card'];
  } else if (id === 'INC-107') {
    hints = ['A running PC and a fitted cable do not guarantee that the monitor is listening to that cable.', 'Read the source shown on the monitor and compare it with the HDMI cable connector.', 'Select HDMI on the monitor. Keep the current PC cable in its active graphics-card output, then test the lesson file.'];
    next = ['input-hdmi', 'Select the HDMI source'];
  } else if (id === 'INC-108') {
    hints = ['A signal path has two ends. Inspect the monitor end as well as the back of the PC.', 'The cable is on the graphics-card output, but its monitor-end HDMI plug is loose. Changing the source alone cannot close that gap.', 'Fit the virtual HDMI plug at the monitor, check for the desktop, then open the original lesson file.'];
    next = ['connect-signal', 'Fit HDMI at the monitor'];
  } else if (id === 'INC-102') {
    hints = ['Trace power from the outside toward the motherboard. Start with the simplest missing link.', 'Inspect the rear AC inlet. A disconnected mains cord can explain an otherwise healthy computer that never starts.', 'Connect the virtual AC cord, then use Power on / test.'];
    next = ['plug-in', 'Connect virtual AC'];
  } else if (id === 'INC-103') {
    hints = ['The computer reaches a memory check and stops. Look closely at the DIMM and its retention clips.', 'A DDR4 module must match the keyed notch and sit evenly. Both clips should close after seating.', 'Power off, disconnect AC, then reseat the DDR4 memory. Reconnect power and test startup.'];
    next = safeNext('seat-ram', 'Reseat the DDR4 memory');
  } else if (id === 'INC-104') {
    hints = ['“No boot device” does not prove that the files were erased. Check how the existing drive communicates.', 'A SATA SSD needs two connections: a narrow data cable to the motherboard and a wider power lead from the PSU.', 'Power off and disconnect AC. Reconnect the SATA data cable between the original SSD and motherboard SATA_1.'];
    next = safeNext('connect-sata', 'Connect the SATA data cable');
  } else if (id === 'INC-105') {
    hints = ['Capacity alone does not make drives interchangeable. Compare the board’s supported interface with the spare drive.', 'The board has SATA ports and no M.2 NVMe slot. Preserve the original drive containing the classroom OS and files.', 'Safely reinstall the original 2.5-inch SATA SSD, attach both data and power, then test the original OS.'];
    next = safeNext(!s.originalDriveInstalled ? 'install-original' : !s.sataDataConnected ? 'connect-sata' : 'connect-sata-power', !s.originalDriveInstalled ? 'Fit the original SATA SSD' : !s.sataDataConnected ? 'Connect SATA data' : 'Connect SATA power');
  } else {
    const missing = PARTS.find(part => !installedFor(s, part[0]));
    hints = ['Start with the board and its supported connectors. Build the system in a sequence you can explain.', 'Fit the processor before its cooler. The motherboard and CPU use separate power plugs; the SATA drive needs separate data and power.', missing ? `Your next unfitted part is ${missing[1]}. ${missing[2]}. Use its Install button or drag it onto the bench.` : 'All listed parts and cables are fitted. Connect the monitor to the dedicated graphics output before the startup test.'];
    next = missing ? safeNext(missing[3], `Fit ${missing[1]}`) : ['video-gpu', 'Connect the monitor to the GPU'];
  }
  if (next[2]) hints[2] += ` ${next[2]}`;
  return `<details class="hw-coach" data-hw-coach-stage="${mission.stage}" data-hw-coach-level="1"><summary><span aria-hidden="true">?</span> Need a nudge? Open the coach</summary><div class="hw-coach-body"><p><strong>Look closer.</strong> ${hints[0]}</p><details data-hw-coach-level="2"><summary>Show a more specific hint</summary><div><p><strong>Connect the evidence.</strong> ${hints[1]}</p><details data-hw-coach-level="3"><summary>Show the next move</summary><div><p>${hints[2]}</p>${btn(next[0], next[1])}</div></details></div></details></div></details>`;
}

function renderHardwareMission(id, s, mission) {
  const checkpoints = [[mission.repaired, id === 'INC-106' ? 'Assemble & connect' : 'Resolve the hardware fault'], [mission.desktop, 'Reach the classroom desktop'], [mission.delivered, 'Open the original lesson file']];
  const current = checkpoints.findIndex(([complete]) => !complete);
  return `<section class="hw-mission" aria-label="Bench mission and checkpoints"><div class="hw-mission-heading"><div><span class="hw-eyebrow">YOUR BENCH MISSION</span><h3>${mission.title}</h3></div><span class="hw-mission-count"><strong>${mission.completed}</strong> / 3 checkpoints</span></div><progress value="${mission.completed}" max="3" aria-label="Current bench checkpoints completed">${mission.completed} of 3</progress><ol class="hw-checkpoints">${checkpoints.map(([complete, label], index) => `<li class="${complete ? 'hw-checkpoint-done' : index === current ? 'hw-checkpoint-current' : ''}" ${!complete && index === current ? 'aria-current="step"' : ''}><span aria-hidden="true">${complete ? '✓' : index + 1}</span><div><strong>${label}</strong><small>${complete ? 'Confirmed in the current state' : index === current ? 'Current objective' : 'Next checkpoint'}</small></div></li>`).join('')}</ol><div class="hw-mission-next"><p>${mission.feedback}</p>${btn(mission.action,mission.label)}</div>${renderHardwareHelp(id === 'INC-106')}${hardwareCoach(id, s, mission)}</section>`;
}

export function renderHardware(root, caseId, state, onAction) {
  state = normalizeHardwareState(caseId, state);
  if (state.assemblyEnabled && root?.ownerDocument?.createElement) {
    const mounted = assemblyBenches.get(root);
    if (mounted && mounted.caseId === state.caseId) { mounted.update(state); return; }
    disposeHardware(root);
    const controller = mountAssemblyWorkbench(root, { state, onAction });
    controller.caseId = state.caseId;
    assemblyBenches.set(root, controller);
    return;
  }
  disposeHardware(root);
  let interaction = benchInteractions.get(root);
  if (!interaction || interaction.caseId !== state.caseId) {
    interaction = { caseId:state.caseId, cableHeld:false, tool:'power' };
    benchInteractions.set(root, interaction);
  }
  const activeControl = root.ownerDocument?.activeElement;
  const restoreAction = root.contains(activeControl) ? activeControl.dataset?.hwAction : null;
  const restoreConnector = root.contains(activeControl) ? activeControl.dataset?.hwConnector : null;
  const restoreDiagnostic = root.contains(activeControl) ? activeControl.dataset?.hwDiagnostic : null;
  const restorePick = root.contains(activeControl) ? activeControl.dataset?.hwPick : null;
  const restoreSocket = root.contains(activeControl) ? activeControl.dataset?.hwSocket : null;
  const restoreSocketButton = !!activeControl?.matches?.('button');
  const restoreComponentSelect = root.contains(activeControl) && activeControl.matches?.('[data-hw-inspect]');
  const socketListOpen = root.querySelector('.hw-target-list')?.open;
  const inventoryOpen = root.querySelector('.hw-fitted-inventory')?.open;
  const displayControlsOpen = root.querySelector('.hw-display-controls')?.open;
  const previousCoachStage = root.querySelector('.hw-coach')?.dataset.hwCoachStage;
  const openCoachLevels = [...root.querySelectorAll('.hw-coach[open], .hw-coach details[open]')].map(details => details.dataset.hwCoachLevel);
  const id = clampCase(caseId), s = state, selection = INSPECTIONS[s.selectedPart] ? s.selectedPart : 'board';
  const safe = safetyReady(s), ready = displayReady(s);
  const fix = hardwareReady(s) && ready;
  const partName = { monitor:'Classroom display',rear:'Rear video connections',power:'Power & safe handling',board:'Motherboard & compatibility',cpu:'Processor socket',cooler:'Processor cooling',ram:'DDR4 memory',gpu:'Dedicated graphics',storage:'Original storage drive',sata:'SATA data connection',atx:'24-pin ATX power',eps:'8-pin CPU power','gpu-power':'Graphics card power','sata-power':'SATA drive power',front:'Front panel header' }[selection];
  let repairs = '';
  if (['INC-101','INC-106','INC-107','INC-108'].includes(id)) repairs += btn('video-gpu', s.pcVideoConnected && s.videoPort === 'gpu' ? '✓ Monitor → graphics card' : 'Connect monitor to graphics card') + btn('video-board','Connect monitor to motherboard');
  if (id === 'INC-103') repairs += btn('seat-ram',s.ramSeated ? '✓ DDR4 memory seated' : 'Reseat DDR4 memory') + btn('unseat-ram','Release memory clips');
  if (id === 'INC-104') repairs += btn('connect-sata',s.sataDataConnected?'✓ SATA data connected':'Connect SATA data cable') + btn('disconnect-sata','Disconnect SATA data');
  if (id === 'INC-105') repairs += btn('choose-nvme','Check spare M.2 NVMe module') + btn('install-original',s.originalDriveInstalled?'✓ Original SATA drive fitted':'Reinstall original SATA OS drive') + btn('connect-sata','Connect SATA data') + btn('connect-sata-power','Connect SATA power');
  if (id === 'INC-102') repairs += `<p class="hw-inline-note">Follow the power chain: outlet → AC cord → PSU → motherboard. Inspect the mains inlet in the rear view.</p>`;
  const completeParts = PARTS.filter(p=>installedFor(s,p[0])).length;
  const mission = hardwareMission(id, s);
  const readouts = getHardwareReadouts(id, s);
  const activeView = interaction.cableHeld ? 'rear' : s.view;
  root.innerHTML = `<section class="hw-workbench" aria-label="Interactive hardware workbench"><div class="hw-assembly-launch"><div><strong>Go inside the workstation</strong><p>Build and take apart a 3D PC, including screws, clips and thermal paste. Detailed checks stay active once you begin.</p></div>${btn('enable-assembly','Open detailed 3D assembly')}</div>
    <div class="hw-status-bar"><span class="hw-status ${s.pcOn?'hw-status-on':''}"><i></i>PC ${s.pcOn?'ON':'OFF'}</span><span class="hw-status ${s.acConnected?'hw-status-live':'hw-status-safe'}"><i></i>AC ${s.acConnected?'CONNECTED':'DISCONNECTED'}</span><span class="hw-work-safety ${safe?'hw-work-safe':''}">${safe?'✓ Safe to change virtual components':'Power off + unplug before internal work'}</span></div>
    <div class="hw-power-controls" role="group" aria-label="Virtual PC power controls"><span class="hw-controls-label">Virtual power controls</span>${btn('power-off','① Power off')}${btn('unplug','② Unplug AC')}${btn('plug-in','③ Connect AC')}${btn('boot','④ Power on / test')}</div>
    <div class="hw-view-tabs" role="tablist" aria-label="Workbench view">${[['bench','Whole workbench'],['internals','Inside the PC'],['rear','Rear connections'],['display','Monitor']].map(([v,l])=>`<button type="button" role="tab" tabindex="${activeView===v?'0':'-1'}" aria-selected="${activeView===v}" data-hw-action="view-${v}">${l}</button>`).join('')}<span class="hw-bench-tag">VIRTUAL BENCH</span></div>
    <div class="hw-physical-workspace">${renderManipulationTray(s)}<div class="hw-equipment-pane">
    <p class="hw-canvas-help"><strong>Equipment view.</strong> Drag a tray part to its matching connector, or tap a part and then a socket. Click or tap equipment without holding a part to inspect it.</p>
    <div class="hw-canvas hw-equipment-stage ${interaction.cableHeld?'hw-canvas-cable-held':''}">${addBenchDetail(activeView==='rear'?rearSvg(s):activeView==='display'?displaySvg(s):benchSvg(s,activeView==='internals'),s,activeView)}<span class="hw-stage-caption">SIMULATED EQUIPMENT · CONNECTORS ARE SIMPLIFIED</span></div></div></div>
    <div class="hw-quick-source" role="group" aria-label="Monitor source selector"><span>Monitor source: <strong>${s.monitorInput==='hdmi'?'HDMI':'DisplayPort'}</strong></span>${btn('input-hdmi','Select HDMI',`aria-pressed="${s.monitorInput==='hdmi'}"`)}${btn('input-displayport','Select DisplayPort',`aria-pressed="${s.monitorInput==='displayport'}"`)}</div>
    ${renderSocketList()}
    <details class="hw-display-controls"><summary>Display cable & monitor controls · connect, disconnect, inspect</summary>${renderCableControls(s,interaction.cableHeld)}${renderMonitorControls(s)}</details>
    ${renderHardwareMission(id,s,mission)}
    ${renderDiagnostics(s,readouts,interaction.tool)}
    <div class="hw-delivery ${s.documentOpened?'hw-delivery-done':''}"><div><strong>${s.documentOpened?'Lesson file opened':fix?'Desktop restored · check the original task':'Check the customer’s original task'}</strong><span>${s.documentOpened?'Now finish your explanation and lab report. The original classroom OS and files are preserved.':ready?'Restore this workstation and open Lesson_Practice_File.docx.':'After the PC starts and shows the desktop, open Lesson_Practice_File.docx. The button will explain what is still missing.'}</span></div>${btn('open-document',s.documentOpened?'✓ Lesson file opened':ready?'Open lesson file':'Check lesson file')}</div>
    <div class="hw-inspect-controls" role="group" aria-label="Inspect a component without changing it"><span class="hw-controls-label">Look at a component</span>${[['monitor','Display'],['rear','Rear connections'],['power','Power'],['board','Board details'],['ram','Memory (RAM)'],['sata','Drive cables'],['storage','Original drive']].map(([p,l])=>`<button type="button" class="${selection===p?'hw-inspect-active':''}" aria-pressed="${selection===p}" data-hw-action="inspect-${p}">${l}</button>`).join('')}</div>
    <label class="hw-component-select"><span>Or choose any component</span><select data-hw-inspect>${[['monitor','Classroom display'],['rear','Rear video connections'],['power','Power supply & AC'],['board','Motherboard specifications'],['cpu','Processor socket'],['cooler','CPU cooler'],['ram','DDR4 memory'],['gpu','Graphics card'],['storage','Original SATA SSD'],['sata','SATA data cable'],['atx','24-pin motherboard power'],['eps','8-pin CPU power'],['gpu-power','Graphics card power'],['sata-power','SATA drive power'],['front','Front panel lead']].map(([p,label])=>`<option value="${p}" ${selection===p?'selected':''}>${label}</option>`).join('')}</select></label>
    <aside class="hw-inspector" aria-label="Selected component and available changes"><div class="hw-inspector-heading"><span class="hw-eyebrow">SELECTED COMPONENT</span><span class="hw-evidence-count">${s.evidence.length} inspected</span></div><h3>${partName}</h3><p>${INSPECTIONS[selection](s)}</p><div class="hw-change-heading"><strong>Make a change</strong><span>These controls change the virtual PC. Inspecting alone does not.</span></div><div class="hw-repair-actions">${repairs || '<p class="hw-inline-note">Use the Install buttons in the parts tray below, or the virtual power controls above.</p>'}</div></aside>
    ${id==='INC-106'?`<details class="hw-quick-install"><summary>Optional quick Install buttons</summary><section class="hw-parts-tray" aria-label="Compatible parts and cables"><div class="hw-tray-heading"><div><span class="hw-eyebrow">PARTS & CABLES</span><h3>Build with purpose.</h3></div><span>${completeParts} / ${PARTS.length} fitted</span></div><div class="hw-parts-grid">${PARTS.map(([part,name,detail,action])=>`<div class="hw-part ${installedFor(s,part)?'hw-part-installed':''}" ><div class="hw-part-icon" aria-hidden="true">${part==='ram'?'▥':part==='storage'?'▰':part==='cooler'?'◉':part==='board'?'▦':part==='gpu'?'▤':part==='cpu'?'▣':'⌁'}</div><div><strong>${name}</strong><span>${detail}</span></div><button type="button" data-hw-action="${action}" aria-label="${installedFor(s,part)?`${name} fitted`:`Install ${name}`}" ${installedFor(s,part)?'disabled':''}>${installedFor(s,part)?'✓ Fitted':'Install'}</button></div>`).join('')}</div></section></details>`:''}
    <p class="hw-model-note">A deterministic teaching model. Components and connectors are simplified for learning; no commands run on your real computer.</p>
  </section>`;
  // Delegation is assigned once per render; replacing the root never stacks listeners.
  const useConnector = target => {
    const port = target.dataset.hwConnector;
    if (!['board','gpu'].includes(port)) return;
    const held = interaction.cableHeld;
    interaction.cableHeld = false;
    onAction(held ? `video-${port}` : port === 'gpu' ? 'inspect-gpu' : 'inspect-rear');
  };
  root.onclick = event => {
    const cable = event.target.closest('[data-hw-cable]');
    if (cable && root.contains(cable) && !cable.disabled) {
      event.stopPropagation();
      interaction.cableHeld = cable.dataset.hwCable === 'pickup';
      renderHardware(root,id,s,onAction);
      root.querySelector('[data-hw-cable]')?.focus({preventScroll:true});
      return;
    }
    const connector = event.target.closest('[data-hw-connector]');
    if (connector && root.contains(connector) && !connector.disabled) { event.stopPropagation(); useConnector(connector); return; }
    const tool = event.target.closest('[data-hw-diagnostic]');
    if (tool && root.contains(tool) && Object.hasOwn(readouts,tool.dataset.hwDiagnostic)) {
      event.stopPropagation(); interaction.tool = tool.dataset.hwDiagnostic;
      onAction(readouts[interaction.tool].action); return;
    }
    const target = event.target.closest('[data-hw-action]');
    if (target && root.contains(target) && !target.disabled) {
      event.stopPropagation();
      if (target.dataset.hwAction.startsWith('view-')) interaction.cableHeld = false;
      onAction(target.dataset.hwAction);
    }
  };
  root.onkeydown = event => {
    const tab = event.target.closest('.hw-view-tabs [role="tab"]');
    if (tab && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const tabs = [...root.querySelectorAll('.hw-view-tabs [role="tab"]')];
      const current = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      const action = tabs[next].dataset.hwAction;
      interaction.cableHeld = false;
      onAction(action);
      [...root.querySelectorAll('.hw-view-tabs [role="tab"]')].find(control => control.dataset.hwAction === action)?.focus({preventScroll:true});
      return;
    }
    const connector = event.target.closest('g[data-hw-connector]');
    if (connector && ['Enter',' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); useConnector(connector); return; }
    const target = event.target.closest('g[data-hw-action]');
    if (target && ['Enter',' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); onAction(target.dataset.hwAction); }
  };
  root.onchange = event => { if (event.target.matches('[data-hw-inspect]')) { event.stopPropagation(); onAction(`inspect-${event.target.value}`); } };
  root.ondragstart = event => { event.preventDefault(); };
  root.ondragover = null; root.ondrop = null;
  benchDisposers.set(root,mountWorkbenchInteractions(root,{onAction}));
  if (socketListOpen && root.querySelector('.hw-target-list')) root.querySelector('.hw-target-list').open = true;
  if (inventoryOpen && root.querySelector('.hw-fitted-inventory')) root.querySelector('.hw-fitted-inventory').open = true;
  if (displayControlsOpen && root.querySelector('.hw-display-controls')) root.querySelector('.hw-display-controls').open = true;
  if (previousCoachStage === mission.stage) {
    for (const details of root.querySelectorAll('.hw-coach, .hw-coach details')) {
      if (openCoachLevels.includes(details.dataset.hwCoachLevel)) details.open = true;
    }
  }
  if (restoreSocket) {
    const same = [...root.querySelectorAll('[data-hw-socket]')].find(control=>control.dataset.hwSocket===restoreSocket && !!control.matches?.('button')===restoreSocketButton);
    same?.focus({preventScroll:true});
  }
  else if (restorePick) {
    const sources = [...root.querySelectorAll('[data-hw-pick]')];
    const same = sources.find(control=>control.dataset.hwPick===restorePick && !control.disabled);
    (same || sources.find(control=>!control.disabled))?.focus({preventScroll:true});
  }
  else if (restoreConnector) [...root.querySelectorAll('[data-hw-connector]')].find(control=>control.dataset.hwConnector===restoreConnector)?.focus({preventScroll:true});
  else if (restoreDiagnostic) [...root.querySelectorAll('[data-hw-diagnostic]')].find(control=>control.dataset.hwDiagnostic===restoreDiagnostic)?.focus({preventScroll:true});
  else if (restoreComponentSelect) root.querySelector('[data-hw-inspect]')?.focus({preventScroll:true});
  else if (restoreAction) {
    const controls = [...root.querySelectorAll('[data-hw-action]')];
    const sameControl = controls.find(control => control.dataset.hwAction === restoreAction);
    const focusTarget = !sameControl?.disabled ? sameControl : root.querySelector('.hw-parts-grid button:not(:disabled)') || controls.find(control => control.dataset.hwAction === 'boot');
    focusTarget?.focus({preventScroll:true});
  }
}
