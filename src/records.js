import { normalizeHardwareState } from './hardware.js';
import { normalizeWorkspaceState } from './workspaces.js';

// Local storage and uploaded drafts are data, never trusted HTML or object shapes.
export function normalizeLabRecord(scenario, value) {
  const r = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const text = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  return {
    state: scenario.track === 'hardware' ? normalizeHardwareState(scenario.id, r.state) : normalizeWorkspaceState(scenario.id, r.state),
    evidence: Array.isArray(r.evidence) ? [...new Set(r.evidence.filter(id => scenario.clues.some(c => c.id === id)))] : [],
    questions: Array.isArray(r.questions) ? [...new Set(r.questions.filter(i => Number.isInteger(i) && i >= 0 && i < scenario.questions.length))] : [],
    events: Array.isArray(r.events) ? r.events.filter(e => e && typeof e === 'object' && typeof e.message === 'string').slice(-100).map(e => ({ time: text(e.time, 40), message: text(e.message, 600), kind: ['info', 'warning', 'success'].includes(e.kind) ? e.kind : 'info' })) : [],
    notes: text(r.notes, 4000), plan: text(r.plan, 2000), reflection: text(r.reflection, 2000),
    verified: r.verified === true, closed: r.closed === true
  };
}
