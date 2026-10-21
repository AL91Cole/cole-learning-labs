import {normalizeLabRecord} from './records.js?release=20261021-chat27c';

export const WORK_PREFIX = 'cole-learning-labs:v2';
export const CLEAR_WORK_KEY = 'cole-learning-labs:clear-local-work';
const ACTIVE_KEY = 'cole-learning-labs:classroom:v1';

// Initial simulation state exists as soon as a lab opens. Warn for learner work,
// including clue/question-only investigations, rather than that default state.
export function hasPrivateWork(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  if (record.verified === true || record.closed === true) return true;
  if (['plan', 'notes', 'reflection'].some(field => typeof record[field] === 'string' && record[field].trim().length > 0)) return true;
  if (Array.isArray(record.evidence) && record.evidence.some(value => typeof value === 'string' && value.trim().length > 0)) return true;
  if (Array.isArray(record.questions) && record.questions.some(value => Number.isInteger(value) && value >= 0)) return true;
  return Array.isArray(record.events) && record.events.some(event => typeof event?.message === 'string' && event.message.trim().length > 0);
}

export function normalizeWorkCollection(scenarios, value) {
  const labs = value?.version === 2 && value.labs && typeof value.labs === 'object' && !Array.isArray(value.labs) ? value.labs : {};
  const clean = {};
  for (const scenario of scenarios) {
    if (Object.hasOwn(labs, scenario.id)) clean[scenario.id] = normalizeLabRecord(scenario, labs[scenario.id]);
  }
  return {version:2, labs:clean};
}

// No work is read or persisted until the learner explicitly resumes or enables it.
export function createWorkStorage({storage, key, scenarios}) {
  if (key !== WORK_PREFIX && !/^cole-learning-labs:v2:classroom:[a-f0-9-]{36}:[a-f0-9-]{36}$/i.test(key)) throw new Error('Invalid work storage scope.');
  let persistent = false;
  let available = true;
  const read = () => {
    try { return storage?.getItem(key) || null; }
    catch { available = false; return null; }
  };
  function write(value) {
    try {
      if (!storage) throw new Error('Storage unavailable.');
      storage.setItem(key, JSON.stringify(normalizeWorkCollection(scenarios, value)));
      available = true; return true;
    } catch { available = false; persistent = false; return false; }
  }
  return {
    get persistent() { return persistent; },
    get available() { return available; },
    hasSaved() { return !!read(); },
    save(value) { return persistent ? write(value) : true; },
    enable(value) { persistent = write(value); return persistent; },
    pause() { persistent = false; },
    resume() {
      const source = read();
      if (!source) return null;
      try {
        const value = normalizeWorkCollection(scenarios, JSON.parse(source));
        persistent = write(value); return value;
      } catch { available = false; return null; }
    },
    clearAll() {
      persistent = false;
      if (!storage) { available = false; return false; }
      try {
        const keys = [];
        for (let i=0; i<storage.length; i++) {
          const name = storage.key(i);
          if (name === WORK_PREFIX || name?.startsWith(WORK_PREFIX+':') || name === ACTIVE_KEY) keys.push(name);
        }
        for (const name of keys) storage.removeItem(name);
        // A content-free signal tells other open tabs to stop saving old work.
        storage.setItem(CLEAR_WORK_KEY, String(Date.now()));
        available = true; return true;
      } catch { available = false; return false; }
    }
  };
}
