/** Fixed teaching connectors. View gestures propose actions; the model checks safety. */
const cable = (id, label, internal, sockets) => Object.freeze({ id, label, internal, sockets: Object.freeze(sockets.map(([id, label]) => Object.freeze({ id, label }))) });
export const ASSEMBLY_CABLES = Object.freeze([
  cable('ac', 'AC power cord', false, [['ac-inlet', 'Power supply AC inlet']]),
  cable('hdmi-pc', 'HDMI cable — PC end', false, [['hdmi-gpu', 'Graphics-card HDMI output'], ['hdmi-board', 'Motherboard HDMI output']]),
  cable('hdmi-monitor', 'HDMI cable — monitor end', false, [['monitor-hdmi', 'Monitor HDMI input']]),
  cable('atx', '24-pin motherboard power', true, [['atx-header', '24-pin ATX motherboard header']]),
  cable('eps', '8-pin CPU power', true, [['eps-header', '8-pin EPS CPU power header']]),
  cable('gpu-power', 'Graphics-card power', true, [['gpu-power-header', 'Graphics-card power header']]),
  cable('sata-data', 'SATA data cable', true, [['ssd-data', 'Original SSD SATA data socket']]),
  cable('sata-power', 'SATA power lead', true, [['ssd-power', 'Original SSD SATA power socket']]),
  cable('front-panel', 'Case power-switch lead', true, [['front-panel-header', 'Motherboard F_PANEL header']]),
  cable('cpu-fan', 'CPU fan lead', true, [['cpu-fan-header', 'Motherboard CPU_FAN header']])
]);

const BY_ID = Object.freeze(Object.fromEntries(ASSEMBLY_CABLES.map(item => [item.id, item])));
const FIELDS = Object.freeze({ ac: 'acConnected', 'hdmi-monitor': 'signalConnected', atx: 'atxConnected', eps: 'cpuPowerConnected', 'gpu-power': 'gpuPowerConnected', 'sata-data': 'sataDataConnected', 'sata-power': 'sataPowerConnected', 'front-panel': 'frontPanelConnected', 'cpu-fan': 'cpuFanConnected' });
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const data = (value, key) => plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const known = id => typeof id === 'string' && Object.hasOwn(BY_ID, id);
const reject = message => ({ action: null, message });

/** Report only a documented socket or a loose end. Older PC-end records migrate connected. */
export function cableConnection(hardware, assembly, id) {
  if (!known(id)) return null;
  if (id === 'hdmi-pc') {
    const oldRecord = plain(hardware) && !Object.hasOwn(hardware, 'pcVideoConnected');
    if (!oldRecord && data(hardware, 'pcVideoConnected') !== true) return null;
    return data(hardware, 'videoPort') === 'gpu' ? 'hdmi-gpu' : data(hardware, 'videoPort') === 'board' ? 'hdmi-board' : null;
  }
  const state = id === 'cpu-fan' ? assembly : hardware;
  return data(state, FIELDS[id]) === true ? BY_ID[id].sockets[0].id : null;
}

/** No mutation, free-form commands, or approval: the existing action boundary decides the result. */
export function assemblyCableAction(hardware, assembly, id, destination) {
  if (!known(id)) return reject('Choose one of the labeled cable ends.');
  const spec = BY_ID[id], current = cableConnection(hardware, assembly, id);
  if (destination === 'cable-rest') {
    if (!current) return reject('This cable end is already disconnected. Choose its matching socket to reconnect it.');
    const action = id === 'ac' ? 'unplug' : id === 'hdmi-pc' ? 'disconnect-video' : id === 'hdmi-monitor' ? 'disconnect-signal' : `asm-disconnect-${id}`;
    return { action, message: `Try to disconnect ${spec.label.toLowerCase()}. The equipment model checks the safe sequence.` };
  }
  if (typeof destination !== 'string' || !spec.sockets.some(socket => socket.id === destination)) return reject('That socket does not match this cable end. Use its labeled matching socket, or the cable rest to disconnect it.');
  if (current === destination) return reject('This cable end is already in that socket. Move it to the cable rest to disconnect it.');
  const action = id === 'ac' ? 'plug-in' : id === 'hdmi-pc' ? destination === 'hdmi-gpu' ? 'video-gpu' : 'video-board' : id === 'hdmi-monitor' ? 'connect-signal' : `asm-connect-${id}`;
  return { action, message: `Try to connect ${spec.label.toLowerCase()} to ${spec.sockets.find(socket => socket.id === destination).label.toLowerCase()}. Safety and component checks still apply.` };
}
