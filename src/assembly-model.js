/** Deterministic training mechanics. No rendering, device access, storage, or network. */
export const ASSEMBLY_FASTENERS = Object.freeze({
  panel: Object.freeze({ label: 'Side panel', count: 2, stateKey: 'panelScrews', partKey: 'panelInstalled' }),
  psu: Object.freeze({ label: 'Power supply', count: 4, stateKey: 'psuScrews', partKey: 'psuInstalled' }),
  board: Object.freeze({ label: 'Motherboard', count: 4, stateKey: 'boardScrews', partKey: 'boardInstalled' }),
  cooler: Object.freeze({ label: 'CPU cooler', count: 4, stateKey: 'coolerScrews', partKey: 'coolerInstalled' }),
  gpu: Object.freeze({ label: 'Graphics bracket', count: 2, stateKey: 'gpuScrews', partKey: 'gpuInstalled' }),
  ssd: Object.freeze({ label: 'Original SSD', count: 2, stateKey: 'ssdScrews', partKey: 'originalDriveInstalled' })
});

const CROSS_ORDER = Object.freeze([0, 3, 1, 2]);
const PARTS = Object.freeze({ board: 'boardInstalled', cpu: 'cpuInstalled', cooler: 'coolerInstalled', ram: 'ramSeated', gpu: 'gpuInstalled', ssd: 'originalDriveInstalled' });
const LEADS = Object.freeze({ atx: ['atxConnected', '24-pin motherboard power', 'boardInstalled'], eps: ['cpuPowerConnected', '8-pin CPU power', 'boardInstalled'], 'gpu-power': ['gpuPowerConnected', 'GPU power', 'gpuInstalled'], 'sata-data': ['sataDataConnected', 'SATA data', 'originalDriveInstalled'], 'sata-power': ['sataPowerConnected', 'SATA power', 'originalDriveInstalled'], 'front-panel': ['frontPanelConnected', 'case power-switch lead', 'boardInstalled'], 'cpu-fan': ['cpuFanConnected', 'CPU fan lead', 'coolerInstalled'] });
const PSU_LEADS = Object.freeze(['atx', 'eps', 'gpu-power', 'sata-power']);
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const own = (value, key) => plain(value) && Object.hasOwn(value, key) && Object.getOwnPropertyDescriptor(value, key)?.value;
const all = values => values.every(Boolean);
const none = values => values.every(value => !value);
const fitted = (hardware, assembly, group) => ['panel', 'psu'].includes(group) ? assembly[ASSEMBLY_FASTENERS[group].partKey] : !!hardware[ASSEMBLY_FASTENERS[group].partKey];
const cloneHardware = hardware => {
  const copy = {};
  if (plain(hardware)) for (const key of Object.keys(hardware)) {
    const descriptor = Object.getOwnPropertyDescriptor(hardware, key);
    if (descriptor && Object.hasOwn(descriptor, 'value') && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') copy[key] = Array.isArray(descriptor.value) ? [...descriptor.value] : descriptor.value;
  }
  return copy;
};

/** Existing assembled investigations migrate with their original safe fittings. */
export function initialAssemblyState(hardware = {}) {
  const board = !!own(hardware, 'boardInstalled');
  const cooler = !!own(hardware, 'coolerInstalled');
  return {
    version: 1, panelInstalled: board, psuInstalled: board,
    panelScrews: Array(2).fill(board), psuScrews: Array(4).fill(board), boardScrews: Array(4).fill(board),
    coolerScrews: Array(4).fill(cooler), gpuScrews: Array(2).fill(!!own(hardware, 'gpuInstalled')),
    ssdScrews: Array(2).fill(!!own(hardware, 'originalDriveInstalled')),
    retentionOpen: !own(hardware, 'cpuInstalled'), ramClipsOpen: !own(hardware, 'ramSeated'),
    pcieLatchOpen: !own(hardware, 'gpuInstalled'), paste: cooler ? 'pea' : 'clean', cpuFanConnected: cooler
  };
}

/** Saves are data, not instructions: keep only booleans, fixed enums, and bounded arrays. */
export function normalizeAssemblyState(saved, hardware = {}) {
  if (saved === undefined || saved === null) return initialAssemblyState(hardware);
  const state = { version: 1, panelInstalled: false, psuInstalled: false, panelScrews: [false, false], psuScrews: Array(4).fill(false), boardScrews: Array(4).fill(false), coolerScrews: Array(4).fill(false), gpuScrews: [false, false], ssdScrews: [false, false], retentionOpen: true, ramClipsOpen: true, pcieLatchOpen: true, paste: 'clean', cpuFanConnected: false };
  // Only an absent old record receives migration defaults. A malformed supplied
  // detailed record starts conservatively, with no verified fasteners or paste.
  if (!plain(saved) || own(saved, 'version') !== 1) return state;
  for (const key of ['panelInstalled', 'psuInstalled', 'retentionOpen', 'ramClipsOpen', 'pcieLatchOpen', 'cpuFanConnected']) if (typeof own(saved, key) === 'boolean') state[key] = own(saved, key);
  const paste = own(saved, 'paste');
  if (['clean', 'pea', 'excess', 'dry'].includes(paste)) state.paste = paste;
  for (const [group, spec] of Object.entries(ASSEMBLY_FASTENERS)) {
    const values = own(saved, spec.stateKey);
    if (Array.isArray(values) && values.length === spec.count) state[spec.stateKey] = Array.from({ length: spec.count }, (_, index) => Object.getOwnPropertyDescriptor(values, String(index))?.value === true);
    if (!fitted(hardware, state, group)) state[spec.stateKey].fill(false);
  }
  if (!own(hardware, 'coolerInstalled')) state.cpuFanConnected = false;
  if (!own(hardware, 'cpuInstalled')) state.paste = 'clean';
  return state;
}

const ACTIONS = [];
const add = (id, label, group) => ACTIONS.push(Object.freeze({ id, label, group }));
for (const [group, spec] of Object.entries(ASSEMBLY_FASTENERS)) for (let index = 0; index < spec.count; index++) {
  add(`asm-tighten-${group}-${index}`, `Tighten ${spec.label.toLowerCase()} screw ${index + 1}`, 'Screws');
  add(`asm-loosen-${group}-${index}`, `Remove ${spec.label.toLowerCase()} screw ${index + 1}`, 'Screws');
}
for (const [part, label] of Object.entries({ panel: 'side panel', psu: 'power supply', board: 'motherboard', cpu: 'processor', cooler: 'CPU cooler', ram: 'DDR4 memory', gpu: 'graphics card', ssd: 'original SATA SSD' })) {
  add(`asm-fit-${part}`, `Fit ${label}`, 'Parts'); add(`asm-remove-${part}`, `Remove ${label}`, 'Parts');
}
for (const [key, label] of Object.entries({ retention: 'CPU retention arm', 'ram-clips': 'memory clips', 'pcie-latch': 'PCIe latch' })) {
  add(`asm-open-${key}`, `Open ${label}`, 'Clips'); add(`asm-close-${key}`, `Close ${label}`, 'Clips');
}
add('asm-clean-paste', 'Clean the old thermal paste', 'Thermal paste');
add('asm-apply-paste', 'Apply a pea-sized dot of thermal paste', 'Thermal paste');
add('asm-excess-paste', 'Try too much thermal paste', 'Thermal paste');
for (const lead of Object.keys(LEADS)) {
  add(`asm-connect-${lead}`, `Connect ${LEADS[lead][1]}`, 'Cables'); add(`asm-disconnect-${lead}`, `Disconnect ${LEADS[lead][1]}`, 'Cables');
}
add('asm-connect-display', 'Connect the monitor HDMI lead', 'Cables');
add('asm-disconnect-display', 'Disconnect the monitor HDMI lead', 'Cables');
const ACTION_IDS = new Set(ACTIONS.map(action => action.id));

function transition(h, a, action) {
  const reject = message => ({ message, kind: 'warning', changed: false });
  const accept = message => ({ message, kind: 'success', changed: true });
  if (!ACTION_IDS.has(action)) return reject('Choose a labeled assembly control.');
  if (action === 'asm-connect-display' || action === 'asm-disconnect-display') {
    const connect = action === 'asm-connect-display';
    if (!!h.signalConnected === connect) return reject(connect ? 'The monitor lead is already connected.' : 'The monitor lead is already disconnected.');
    h.signalConnected = connect;
    return accept(connect ? 'HDMI lead connected. Check the chosen monitor source and PC output.' : 'HDMI lead disconnected. Classroom files stay on the original SSD.');
  }
  if (h.pcOn || h.acConnected) return reject('First power off the PC and disconnect its AC cord.');
  const panelAction = /^(?:asm-(?:fit|remove)-panel|asm-(?:tighten|loosen)-panel-[01])$/.test(action);
  if (!panelAction && a.panelInstalled) return reject('Remove both side-panel screws, then lift off the side panel.');
  const screw = /^asm-(tighten|loosen)-(panel|psu|board|cooler|gpu|ssd)-(\d)$/.exec(action);
  if (screw) {
    const [, operation, group, number] = screw;
    const index = Number(number), spec = ASSEMBLY_FASTENERS[group], tighten = operation === 'tighten';
    if (!fitted(h, a, group)) return reject(`Fit the ${spec.label.toLowerCase()} before working on its screws.`);
    if (a[spec.stateKey][index] === tighten) return reject(`Screw ${index + 1} is already ${tighten ? 'secured' : 'removed'}.`);
    if (group === 'cooler') {
      const order = tighten ? CROSS_ORDER : [...CROSS_ORDER].reverse();
      const next = order.find(position => a.coolerScrews[position] !== tighten);
      if (index !== next) return reject(`Use a cross pattern: ${tighten ? 'tighten' : 'remove'} cooler screw ${next + 1} next.`);
    }
    if (group === 'board' && !tighten && (h.coolerInstalled || h.cpuInstalled || h.ramSeated || h.gpuInstalled)) return reject('Remove the cooler, CPU, memory, and graphics card before removing motherboard screws.');
    if (group === 'gpu' && !tighten && h.gpuPowerConnected) return reject('Disconnect GPU power before removing the graphics bracket screws.');
    if (group === 'ssd' && !tighten && (h.sataDataConnected || h.sataPowerConnected)) return reject('Disconnect both SATA data and SATA power before removing SSD screws.');
    if (group === 'psu' && !tighten && PSU_LEADS.some(id => h[LEADS[id][0]])) return reject('Disconnect the ATX, CPU, GPU, and SATA power leads before removing power-supply screws.');
    a[spec.stateKey][index] = tighten;
    return accept(`${spec.label} screw ${index + 1} ${tighten ? 'secured' : 'removed into the screw tray'}.${group === 'cooler' ? ' Work across opposite corners.' : ''}`);
  }
  const lead = /^asm-(connect|disconnect)-(.+)$/.exec(action);
  if (lead && Object.hasOwn(LEADS, lead[2])) {
    const [, operation, id] = lead, [key, label, requires] = LEADS[id], connect = operation === 'connect';
    const target = id === 'cpu-fan' ? a : h;
    if (!!target[key] === connect) return reject(`The ${label} is already ${connect ? 'connected' : 'disconnected'}.`);
    if (connect && (!h[requires] || !h.boardInstalled)) return reject(`Fit the required component before connecting ${label}.`);
    if (connect && PSU_LEADS.includes(id) && (!a.psuInstalled || !all(a.psuScrews))) return reject('Fit the power supply and secure its four screws before connecting power leads.');
    if (connect && !all(a.boardScrews)) return reject('Secure all four motherboard screws before connecting internal leads.');
    if (connect && id === 'cpu-fan' && !all(a.coolerScrews)) return reject('Secure all four cooler screws before connecting its fan lead.');
    target[key] = connect;
    return accept(`${label[0].toUpperCase() + label.slice(1)} ${connect ? 'connected to its matching header' : 'disconnected and moved clear'}.`);
  }
  if (action === 'asm-fit-panel') {
    if (a.panelInstalled) return reject('The side panel is already in place.');
    a.panelInstalled = true; return accept('Side panel aligned with the case. Secure both panel screws.');
  }
  if (action === 'asm-remove-panel') {
    if (!a.panelInstalled) return reject('The side panel is already off.');
    if (!none(a.panelScrews)) return reject('Remove both side-panel screws before lifting off the panel.');
    a.panelInstalled = false; return accept('Side panel removed. Internal parts are accessible while power stays disconnected.');
  }
  if (action === 'asm-fit-psu' || action === 'asm-remove-psu') {
    const fit = action === 'asm-fit-psu';
    if (a.psuInstalled === fit) return reject(`The power supply is already ${fit ? 'fitted' : 'in the parts tray'}.`);
    if (!fit && PSU_LEADS.some(id => h[LEADS[id][0]])) return reject('Disconnect the ATX, CPU, GPU, and SATA power leads before lifting the power supply.');
    if (!fit && !none(a.psuScrews)) return reject('Remove all four power-supply screws before sliding it out of the case.');
    a.psuInstalled = fit;
    return accept(fit ? 'Power supply aligned in its case bay. Secure its four mounting screws before connecting power leads.' : 'Power supply slid safely into the parts tray. Its housing stays sealed.');
  }
  if (['asm-open-retention', 'asm-close-retention'].includes(action)) {
    const open = action === 'asm-open-retention';
    if (!h.boardInstalled) return reject('Fit and secure the motherboard first.');
    if (h.coolerInstalled) return reject('Remove the CPU cooler before moving the socket retention arm.');
    if (a.retentionOpen === open) return reject(`The CPU retention arm is already ${open ? 'open' : 'closed'}.`);
    a.retentionOpen = open; return accept(open ? 'CPU retention arm open. Align the processor triangle with the socket marker.' : 'CPU retention arm secured. The processor is held in its socket.');
  }
  if (['asm-open-ram-clips', 'asm-close-ram-clips'].includes(action)) {
    const open = action === 'asm-open-ram-clips';
    if (!h.boardInstalled) return reject('Fit and secure the motherboard first.');
    if (a.ramClipsOpen === open) return reject(`The memory clips are already ${open ? 'open' : 'closed'}.`);
    if (!open && !h.ramSeated) return reject('Align and seat the DDR4 memory before closing its clips.');
    a.ramClipsOpen = open; return accept(open ? 'Memory clips opened. Lift the module evenly by its edges.' : 'Both memory clips closed around the seated DDR4 module.');
  }
  if (['asm-open-pcie-latch', 'asm-close-pcie-latch'].includes(action)) {
    const open = action === 'asm-open-pcie-latch';
    if (!h.boardInstalled) return reject('Fit and secure the motherboard first.');
    if (a.pcieLatchOpen === open) return reject(`The PCIe latch is already ${open ? 'open' : 'closed'}.`);
    if (!open && !h.gpuInstalled) return reject('Seat the graphics card before closing the PCIe latch.');
    a.pcieLatchOpen = open; return accept(open ? 'PCIe retention latch released. Support the graphics card before lifting.' : 'PCIe latch closed around the seated graphics card.');
  }
  if (['asm-clean-paste', 'asm-apply-paste', 'asm-excess-paste'].includes(action)) {
    if (!h.cpuInstalled) return reject('Fit the processor before working on its thermal surface.');
    if (h.coolerInstalled) return reject('Remove the CPU cooler to reach the thermal paste.');
    if (action === 'asm-clean-paste') {
      if (a.paste === 'clean') return reject('The processor surface is already clean.');
      a.paste = 'clean'; return accept('Old paste cleaned from the processor and cooler. Apply a fresh pea-sized dot.');
    }
    if (a.paste !== 'clean') return reject('Clean the existing paste before applying a fresh amount.');
    a.paste = action === 'asm-apply-paste' ? 'pea' : 'excess';
    return accept(a.paste === 'pea' ? 'A pea-sized dot is on the processor. Lower the cooler straight onto it.' : 'Too much paste is on the processor. Clean it off and try one pea-sized dot.');
  }
  const partAction = /^asm-(fit|remove)-(board|cpu|cooler|ram|gpu|ssd)$/.exec(action);
  if (!partAction) return reject('Choose a labeled assembly control.');
  const [, operation, part] = partAction, fit = operation === 'fit', key = PARTS[part];
  if (!!h[key] === fit) return reject(`This component is already ${fit ? 'fitted' : 'in the parts tray'}.`);
  if (fit && part !== 'board' && (!h.boardInstalled || !all(a.boardScrews))) return reject('Fit the motherboard and secure its four standoff screws first.');
  if (part === 'board' && !fit) {
    if (h.pcVideoConnected !== false && h.videoPort === 'board') return reject('Disconnect the HDMI cable at the PC before lifting the motherboard.');
    if (Object.values(PARTS).some(partKey => partKey !== key && h[partKey])) return reject('Remove the cooler, CPU, memory, graphics card, and SSD before lifting the motherboard.');
    if (Object.values(LEADS).some(([leadKey]) => h[leadKey] || a[leadKey])) return reject('Disconnect every internal lead before lifting the motherboard.');
    if (!none(a.boardScrews)) return reject('Remove all four motherboard screws before lifting the board.');
  }
  if (part === 'cpu') {
    if (h.coolerInstalled) return reject('Remove the CPU cooler before handling the processor.');
    if (!a.retentionOpen) return reject('Open the CPU socket retention arm first.');
    if (!fit && a.paste !== 'clean') return reject('Clean the old thermal paste before lifting the processor by its edges.');
  }
  if (part === 'cooler') {
    if (fit && (!h.cpuInstalled || a.retentionOpen)) return reject('Seat the processor and close its retention arm before fitting the cooler.');
    if (fit && a.paste === 'clean') return reject('Apply a pea-sized dot of thermal paste before lowering the cooler.');
    if (!fit && a.cpuFanConnected) return reject('Disconnect the CPU_FAN lead before lifting the cooler.');
    if (!fit && !none(a.coolerScrews)) return reject('Remove all four cooler screws in the cross pattern before lifting.');
  }
  if (part === 'ram' && !a.ramClipsOpen) return reject('Open both memory retention clips first.');
  if (part === 'gpu') {
    if (!a.pcieLatchOpen) return reject('Open the PCIe retention latch first.');
    if (!fit && h.gpuPowerConnected) return reject('Disconnect the graphics card power lead first.');
    if (!fit && h.pcVideoConnected !== false && h.videoPort === 'gpu') return reject('Disconnect the HDMI cable at the PC before lifting the graphics card.');
    if (!fit && !none(a.gpuScrews)) return reject('Remove both graphics bracket screws before lifting the card.');
  }
  if (part === 'ssd' && !fit) {
    if (h.sataDataConnected || h.sataPowerConnected) return reject('Disconnect SATA data and SATA power before removing the original SSD.');
    if (!none(a.ssdScrews)) return reject('Remove both SSD mounting screws before sliding out the drive.');
  }
  h[key] = fit;
  if (part === 'board' && fit) { a.retentionOpen = true; a.ramClipsOpen = true; a.pcieLatchOpen = true; }
  if (part === 'cooler') { a.cpuFanConnected = false; if (!fit) a.paste = 'dry'; }
  if (part === 'cpu' && !fit) a.paste = 'clean';
  if (part === 'ssd' && fit) h.selectedDrive = 'sata';
  const name = { board: 'Motherboard', cpu: 'Processor', cooler: 'CPU cooler', ram: 'DDR4 memory', gpu: 'Graphics card', ssd: 'Original SATA SSD' }[part];
  return accept(`${name} ${fit ? 'aligned and fitted' : 'lifted safely into the parts tray'}.${part === 'cooler' && !fit ? ' The disturbed paste must be cleaned and replaced before refitting.' : part === 'ssd' ? ' The classroom OS and files are preserved.' : fit && ['board', 'cooler', 'gpu', 'ssd'].includes(part) ? ' Secure its mounting screws next.' : ''}`);
}

/** All mutations happen on copies. Invalid gestures do not alter the machine or its record. */
export function applyAssemblyAction(hardware, assembly, action) {
  const h = cloneHardware(hardware), a = normalizeAssemblyState(assembly, h);
  const before = cloneHardware(h), beforeAssembly = normalizeAssemblyState(a, h);
  const outcome = transition(h, a, typeof action === 'string' ? action : '');
  if (!outcome.changed) return { hardware: before, assembly: beforeAssembly, message: outcome.message, kind: outcome.kind };
  if (!['asm-connect-display', 'asm-disconnect-display'].includes(action)) h.booted = false;
  h.documentOpened = false;
  if (Array.isArray(h.actions)) h.actions = [...h.actions, action].slice(-250);
  return { hardware: h, assembly: a, message: outcome.message, kind: outcome.kind };
}

/** Called before startup and delivery checks; detailed mechanics cannot be bypassed visually. */
export function assemblyFailure(hardware, assembly) {
  const h = cloneHardware(hardware), a = normalizeAssemblyState(assembly, h);
  if (!h.boardInstalled) return 'Fit the motherboard before startup.';
  if (!all(a.boardScrews)) return 'Secure all four motherboard standoff screws before startup.';
  if (!a.psuInstalled || !all(a.psuScrews)) return 'Fit the power supply and secure its four mounting screws before startup.';
  if (!h.cpuInstalled || a.retentionOpen) return 'Seat the processor and close its retention arm before startup.';
  if (!h.coolerInstalled) return 'Fit the CPU cooler before startup.';
  if (a.paste !== 'pea') return a.paste === 'excess' ? 'Too much thermal paste. Remove the cooler, clean both surfaces, and apply one pea-sized dot.' : a.paste === 'dry' ? 'The thermal paste was disturbed. Remove the cooler, clean both surfaces, and apply fresh paste.' : 'Apply a pea-sized dot of thermal paste before fitting the cooler.';
  if (!all(a.coolerScrews)) return 'Secure all four cooler screws using the cross pattern before startup.';
  if (!a.cpuFanConnected) return 'Connect the CPU fan lead to CPU_FAN before startup.';
  if (!h.ramSeated || a.ramClipsOpen) return 'Seat the DDR4 memory and close both retention clips before startup.';
  if (!h.gpuInstalled || a.pcieLatchOpen || !all(a.gpuScrews)) return 'Seat the graphics card, close the PCIe latch, and secure both bracket screws.';
  if (!h.originalDriveInstalled || !all(a.ssdScrews)) return 'Fit the original SATA SSD and secure both mounting screws.';
  if (!a.panelInstalled || !all(a.panelScrews)) return 'Refit the side panel and secure both panel screws before the startup test.';
  return '';
}

/** DOM and 3D views share these exact allowed actions and plain-language reasons. */
export function assemblyActions(hardware, assembly) {
  const h = cloneHardware(hardware), a = normalizeAssemblyState(assembly, h);
  return ACTIONS.map(action => {
    const outcome = transition(cloneHardware(h), normalizeAssemblyState(a, h), action.id);
    return { ...action, disabled: !outcome.changed, reason: outcome.changed ? '' : outcome.message };
  });
}
