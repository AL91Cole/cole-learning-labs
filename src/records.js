import { normalizeHardwareState, verifyHardware } from './hardware.js?release=20261107-tech-team';
import { normalizeWorkspaceState, verifyWorkspace } from './workspaces.js?release=20261107-tech-team';
import { inquiryProgress } from './interview.js?release=20261107-tech-team';
import { retainExperimentEvents, readExperiments, observationSnapshot, sameSetup } from './experiments.js?release=20261107-tech-team';
import { registerRecordNormalizer } from './record-engines.js?release=20261107-tech-team';
import { labFormat } from './lab-format.js?release=20261107-tech-team';

// A saved explanation and a fresh working setup are both needed for page 3.
// This guides the lesson; imported learner work is not an assessment credential.
export function workbenchProgress(scenario, record, result) {
  const {attempts,draft}=readExperiments(record),latest=attempts.at(-1);
  const actual=scenario.track==='hardware'?verifyHardware(scenario.id,record.state):verifyWorkspace(scenario.id,record.state);
  const passed=record.verified===true&&actual.ok&&result?.ok!==false;
  const answered=!!latest&&['predict','evidence','changed','observed','explain'].every(field=>typeof latest[field]==='string'&&latest[field].trim().length>=(['predict','evidence'].includes(field)?12:1));
  const current=!!latest&&sameSetup(latest.after,observationSnapshot(scenario,record.state));
  const unfinished=Object.values(draft).some(value=>typeof value==='string'?value.trim().length>0:value!==undefined&&value!==null);
  const ready=passed&&answered&&latest.check?.ok===true&&current&&!unfinished;
  const message=ready?'Step 2 complete. Continue to Check & explain.':actual.needsDocument?'Click the lesson file on the monitor. Then test and save your attempt.':unfinished?'Complete your notebook answers, test your idea, and select Save this attempt.':!passed?'Test your idea. The task must work before you can continue.':!answered?'Complete and save the notebook: idea, evidence, change, result, and what you learned.':!current?'The setup changed. Run a new test and save your attempt.':'Save a test that shows the task works before continuing.';
  // What is left on this step, in the order a learner does it. Derived from the notebook; nothing new is stored.
  const idea=draft.predict.trim().length>=12&&draft.evidence.trim().length>=12,recorded=!!draft.after&&!!draft.check;
  const explained=['changed','observed','explain'].every(field=>draft[field].trim().length>0);
  const savedPass=!!latest&&latest.check?.ok===true&&answered;
  const confirm=savedPass&&current&&!unfinished;
  const remaining=ready?[]:confirm?[{label:'Select Test my idea to confirm the task still works',done:false}]:[
    {label:'Write your test idea and the evidence for it',done:idea},
    {label:'Start the test so your starting setup is recorded',done:!!draft.before},
    ...(actual.needsDocument?[{label:'Click the lesson file on the monitor',done:false}]:[]),
    {label:'Make one change, then select Test my idea',done:recorded},
    {label:'Write what you changed, what happened and what you learned',done:recorded&&explained},
    {label:'Select Save this attempt',done:false}
  ];
  const note=ready||confirm||unfinished||!latest?'':savedPass?'The setup changed after your saved test, so this step needs one fresh test.':latest.check?.ok===true?'Your saved test is missing some notebook answers. Record one fresh test with all five.':'Your last saved test did not make the task work. Use that result as evidence for your next idea.';
  return {ready,passed,answered,current,unfinished,message,remaining,note};
}

// Local storage and uploaded drafts are data, never trusted HTML or object shapes.
export function normalizeLabRecord(scenario, value) {
  const r = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const text = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const record = {
    state: scenario.track === 'hardware' ? normalizeHardwareState(scenario.id, r.state) : normalizeWorkspaceState(scenario.id, r.state),
    evidence: Array.isArray(r.evidence) ? [...new Set(r.evidence.filter(id => scenario.clues.some(c => c.id === id)))] : [],
    questions: Array.isArray(r.questions) ? [...new Set(r.questions.filter(i => Number.isInteger(i) && i >= 0 && i < scenario.questions.length))] : [],
    events: Array.isArray(r.events) ? retainExperimentEvents(scenario,r.events.slice(-2000).filter(e => e && typeof e === 'object' && typeof e.message === 'string').map(e => ({ time: text(e.time, 40), message: text(e.message, 600), kind: ['info', 'warning', 'success'].includes(e.kind) ? e.kind : 'info' }))) : [],
    symptoms: text(r.symptoms, 2000), notes: text(r.notes, 4000), plan: text(r.plan, 2000), reflection: text(r.reflection, 2000),
    ideaSaved: r.ideaSaved === true, verified: r.verified === true, closed: r.closed === true,
    // Lab guide steps the learner marked as read. Ids only; the guide decides what they mean.
    manual: Array.isArray(r.manual) ? [...new Set(r.manual.filter(id => typeof id === 'string' && /^[a-z-]{1,40}$/.test(id)))].slice(0, 40) : []
  };
  // Older drafts keep their writing, but require the learner to review and save
  // both first-idea answers before continuing through the revised first page.
  // Guided labs (non-hardware) have no first-idea form or requester interview, so those
  // ticket-flow completion rules do not reopen them.
  const ticket = !labFormat(scenario).guide;
  record.ideaSaved = record.ideaSaved && record.symptoms.trim().length >= 12 && record.plan.trim().length >= 12;
  if (ticket && !record.ideaSaved) record.closed = false;
  // Technical completion follows the current equipment, not a stale saved flag.
  // Written work remains available for correction and the next startup test.
  if (scenario.track === 'hardware' && !verifyHardware(scenario.id, record.state).ok) {
    record.verified = false; record.closed = false;
  }
  // A saved completion flag cannot outlive a coding source/language change.
  // Recompute the current fixture result; keep the learner's written work.
  if (scenario.track === 'coding' && !verifyWorkspace(scenario.id, record.state).ok) {
    record.verified = false; record.closed = false;
  }
  // Earlier v2 records can predate the requester-clarification step. Keep their
  // technical result and written work, but reopen an incomplete investigation.
  if (ticket && record.closed && !inquiryProgress(scenario, record.events).complete) record.closed = false;
  // A guided lab is finished only once both Section 3 analysis answers are written.
  if (!ticket && record.closed && !(record.notes.trim().length >= 15 && record.reflection.trim().length >= 15)) record.closed = false;
  return record;
}
// The storage manager in the start-up bundle reaches this normalizer only after
// the investigation engines have loaded alongside it.
registerRecordNormalizer(normalizeLabRecord);
