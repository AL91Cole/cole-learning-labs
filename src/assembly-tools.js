import { ASSEMBLY_FASTENERS, normalizeAssemblyState } from './assembly-model.js?release=20261017-babylon18';

/** Fixed tool choices shared by the accessible controls and the 3D workbench. */
export const ASSEMBLY_TOOLS = Object.freeze([
  Object.freeze({ id: 'inspect', label: 'Inspect', description: 'Select equipment to read its state and available actions.' }),
  Object.freeze({ id: 'move', label: 'Move parts', description: 'Move a loose part onto its matching mount, or a fitted part into the tray.' }),
  Object.freeze({ id: 'cables', label: 'Connect cables', description: 'Move a cable end to its labeled socket, or park it to disconnect.' }),
  Object.freeze({ id: 'screwdriver', label: 'Screwdriver', description: 'Choose a screw head to tighten it or remove it into the tray.' }),
  Object.freeze({ id: 'paste', label: 'Thermal paste', description: 'Apply one pea-sized dot to the exposed processor.' }),
  Object.freeze({ id: 'clean', label: 'Clean surfaces', description: 'Clean the processor and cooler thermal surfaces with the cooler removed.' })
]);

const PARTS = Object.freeze({
  panel: Object.freeze({ label: 'side panel', key: 'panelInstalled', assembly: true }),
  psu: Object.freeze({ label: 'power supply', key: 'psuInstalled', assembly: true }),
  board: Object.freeze({ label: 'motherboard', key: 'boardInstalled' }),
  cpu: Object.freeze({ label: 'processor', key: 'cpuInstalled' }),
  cooler: Object.freeze({ label: 'CPU cooler', key: 'coolerInstalled' }),
  ram: Object.freeze({ label: 'DDR4 memory', key: 'ramSeated' }),
  gpu: Object.freeze({ label: 'graphics card', key: 'gpuInstalled' }),
  ssd: Object.freeze({ label: 'original SATA SSD', key: 'originalDriveInstalled' })
});
const OTHER_TARGETS = Object.freeze({
  atx: '24-pin motherboard power', eps: '8-pin CPU power', 'gpu-power': 'GPU power',
  'sata-data': 'SATA data', 'sata-power': 'SATA power', 'front-panel': 'case power-switch lead',
  'cpu-fan': 'CPU fan lead', display: 'monitor HDMI lead', monitor: 'monitor',
  retention: 'CPU retention arm', 'ram-clips': 'memory clips', 'pcie-latch': 'PCIe latch'
});
const validId = (record, id) => typeof id === 'string' && Object.hasOwn(record, id);
const reject = message => ({ action: null, message });
const propose = (action, message) => ({ action, message });
const ownBoolean = (object, key) => {
  if (!object || typeof object !== 'object' || Array.isArray(object) || ![Object.prototype, null].includes(Object.getPrototypeOf(object))) return false;
  return Object.getOwnPropertyDescriptor(object, key)?.value === true;
};
const fastenerFor = target => {
  if (typeof target !== 'string') return null;
  const match = /^(panel|psu|board|cooler|gpu|ssd)-(0|[1-9][0-9]*)$/.exec(target);
  if (!match) return null;
  const spec = ASSEMBLY_FASTENERS[match[1]], index = Number(match[2]);
  return Number.isSafeInteger(index) && index < spec.count ? { group: match[1], index, spec } : null;
};

/** An explicit, strict read for view adapters; unknown IDs never become properties. */
export function assembledPartFitted(part, hardware, assembly) {
  if (!validId(PARTS, part)) return false;
  const spec = PARTS[part];
  return ownBoolean(spec.assembly ? assembly : hardware, spec.key);
}

/** Map a gesture to an authored attempt; the mechanical model checks acceptance. */
export function assemblyToolAction(hardware, assembly, tool, target, operation = 'fit') {
  if (!ASSEMBLY_TOOLS.some(item => item.id === tool)) return reject('Choose a tool from the workbench toolbar.');
  if (tool === 'cables') return reject('Choose a cable and its matching socket using Connect cables.');
  const part = validId(PARTS, target) ? PARTS[target] : null;
  const screw = fastenerFor(target);
  if (tool === 'inspect') {
    const label = part?.label || (screw ? `${screw.spec.label.toLowerCase()} screw ${screw.index + 1}` : validId(OTHER_TARGETS, target) ? OTHER_TARGETS[target] : '');
    return reject(label ? `Inspect the ${label}. Choose a tool or one of its labeled controls to make a change.` : 'Select a labeled component or screw to inspect it.');
  }
  if (tool === 'move') {
    if (!part) return reject('Move parts works with components. Use Screwdriver for screws and the labeled cable controls for leads.');
    if (!['fit', 'remove'].includes(operation)) return reject('Choose a matching component mount to fit a part, or the parts tray to remove it.');
    const fitted = assembledPartFitted(target, hardware, assembly);
    if (operation === 'fit' && fitted) return reject('This component is already fitted. Move it to the parts tray to attempt removal.');
    if (operation === 'remove' && !fitted) return reject('This component is already in the parts tray. Move it onto its matching mount to attempt fitting.');
    return propose(`asm-${operation}-${target}`, `Try to ${operation === 'fit' ? 'fit' : 'remove'} the ${part.label}. Safety, clips, screws, and cable checks still apply.`);
  }
  if (tool === 'screwdriver') {
    if (!screw) return reject('Choose a screw head. Move parts handles components; cable controls handle leads.');
    const normalized = normalizeAssemblyState(assembly, hardware);
    const tighten = normalized[screw.spec.stateKey][screw.index] !== true;
    return propose(`asm-${tighten ? 'tighten' : 'loosen'}-${screw.group}-${screw.index}`, `Try to ${tighten ? 'tighten' : 'remove'} ${screw.spec.label.toLowerCase()} screw ${screw.index + 1}. The model checks the safe sequence.`);
  }
  if (target !== 'cpu') return reject(tool === 'paste' ? 'Apply thermal paste to the exposed processor surface. Select the processor with its cooler removed.' : 'Select the processor with its cooler removed to clean the thermal surfaces.');
  return tool === 'paste'
    ? propose('asm-apply-paste', 'Try to apply one pea-sized dot of thermal paste to the processor. The surface must be clean and the cooler removed.')
    : propose('asm-clean-paste', 'Try to clean the processor and cooler thermal surfaces. Remove the cooler before cleaning.');
}

/** A release commits only to the matching mount or the authored parts tray. */
export function assemblyDropAction(hardware, assembly, part, destination) {
  if (!validId(PARTS, part)) return reject('Pick up a labeled component. Screws and cables use their own controls.');
  if (destination === 'tray') return assemblyToolAction(hardware, assembly, 'move', part, 'remove');
  if (destination === part) return assemblyToolAction(hardware, assembly, 'move', part, 'fit');
  return reject('That mount does not match this part. Use its matching outline, or return a fitted part to the parts tray.');
}
