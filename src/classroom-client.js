/* Optional sharing only after an explicit classroom join. No live AI or device surveillance. */
import { SCENARIOS } from './scenarios.js?release=20261018-monitor22';
import { inquiryProtectedEvents } from './interview.js?release=20261018-monitor22';
import {retainExperimentEvents,experimentEventText} from './experiments.js?release=20261018-monitor22';
export const CLASSROOM_ACTIVE_KEY = 'cole-learning-labs:classroom:v1';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function classroomSelection() {
  try {
    const value = JSON.parse(localStorage.getItem(CLASSROOM_ACTIVE_KEY) || 'null');
    return value && typeof value.studentId === 'string' && typeof value.classId === 'string' && uuid.test(value.studentId) && uuid.test(value.classId) ? value : null;
  } catch { return null; }
}

export function classroomStorageKey() {
  const selected = classroomSelection();
  return selected ? `cole-learning-labs:v2:classroom:${selected.classId}:${selected.studentId}` : 'cole-learning-labs:v2';
}

export function progressSnapshot(record, scenarioId) {
  const value = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
  const scenario = SCENARIOS.find(entry => entry.id === scenarioId);
  const work = JSON.parse(JSON.stringify({
    state: value.state && typeof value.state === 'object' && !Array.isArray(value.state) ? value.state : {},
    evidence: Array.isArray(value.evidence) ? value.evidence : [], questions: Array.isArray(value.questions) ? value.questions : [],
    plan: typeof value.plan === 'string' ? value.plan : '', notes: typeof value.notes === 'string' ? value.notes : '', reflection: typeof value.reflection === 'string' ? value.reflection : '',
    events: retainExperimentEvents(scenario,value.events), verified: value.verified === true, closed: value.closed === true
  }));
  const protectedEvents = new Set([...inquiryProtectedEvents(scenario,work.events),...work.events.filter(event=>experimentEventText(event)!==null||/^Capstone handoff \/ (?:works|evidence|connection|uncertain): /.test(event.message))]);
  while (new TextEncoder().encode(JSON.stringify(work)).byteLength > 60000 && work.events.length) {
    const removable = work.events.findIndex(event => !protectedEvents.has(event));
    if (removable < 0) break;
    work.events.splice(removable,1);
  }
  if (new TextEncoder().encode(JSON.stringify(work)).byteLength > 61440) throw new Error('This draft is too large to share. Export the full report and shorten the notes before syncing.');
  return work;
}

function node(tag, text, className = '') {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function attachClassroomLab({ scenarioId, record, onRestore, storageKey = classroomStorageKey() }) {
  const selected = classroomSelection();
  if (!selected) return { schedule() {}, dispose() {} };
  const host = document.querySelector('#classroom-status');
  if (!host) return { schedule() {}, dispose() {} };
  if (storageKey !== classroomStorageKey()) {
    host.className = 'classroom-connection';
    host.replaceChildren(node('strong', 'Classroom session changed'), node('p', 'Sharing is paused. Export this work before reloading to open the current learner’s separate saved work.'));
    return { schedule() {}, dispose() {} };
  }
  let disposed = false, ready = false, busy = false, queued = false, classLocked = false, version = 0, timer, assignment, sessionChanged = false;
  let lastSaved = '', lastSubmission = null;
  const pending = new Set();
  host.className = 'classroom-connection';
  const heading = node('strong', 'Checking classroom connection…');
  const description = node('p', 'Work remains on this device until the classroom session is validated.');
  const status = node('p', '', 'classroom-sync-status');
  status.setAttribute('role', 'status');
  const feedback = node('p', '', 'classroom-feedback');
  const controls = node('div', '', 'classroom-actions');
  const save = node('button', 'Save classroom draft', 'lab-tool');
  const submit = node('button', 'Submit for teacher review', 'lab-tool');
  const confirmSubmit = node('button', 'Submit this in-progress work', 'lab-tool');
  const resume = node('button', 'Resume classroom draft', 'lab-tool');
  const useLocal = node('button', 'Use this browser’s work', 'lab-tool');
  const room = node('a', 'View classroom', 'lab-tool'); room.href = 'classroom.html';
  const stop = node('button', 'Stop sharing', 'lab-tool');
  [save, submit, confirmSubmit, resume, useLocal, stop].forEach(button => { button.type = 'button'; });
  [save, submit, confirmSubmit, resume, useLocal].forEach(button => { button.hidden = true; });
  controls.append(save, submit, confirmSubmit, resume, useLocal, room, stop);
  host.replaceChildren(heading, description, status, feedback, controls);

  function say(message) { if (!disposed) status.textContent = message; }
  function selectionMatches() {
    const current = classroomSelection();
    return current?.studentId === selected.studentId && current?.classId === selected.classId;
  }
  function checkSelection() {
    if (sessionChanged || !selectionMatches()) {
      sessionChanged = true; ready = false; queued = false; clearTimeout(timer);
      pending.forEach(controller => controller.abort());
      heading.textContent = 'Classroom session changed'; feedback.textContent = '';
      say('Sharing is paused because another tab changed the classroom session. Export this work, then reopen the classroom to continue with the intended learner.');
      updateButtons(); return false;
    }
    return true;
  }
  function storageChanged(event) { if (event.key === CLASSROOM_ACTIVE_KEY || event.key === null) checkSelection(); }
  window.addEventListener('storage', storageChanged);
  function updateButtons() {
    save.disabled = busy || !ready;
    submit.disabled = busy || !ready;
    confirmSubmit.disabled = busy || !ready;
  }
  function showSubmission(value) {
    lastSubmission = value;
    if (!value) { feedback.textContent = ''; return; }
    const parts = [`Latest submission: ${value.status}.`];
    if (typeof value.grade === 'number') parts.push(`Teacher grade: ${value.grade}/100.`);
    if (value.feedback) parts.push(`Teacher feedback: ${value.feedback}`);
    feedback.textContent = parts.join(' ');
  }
  async function api(path, options = {}) {
    const controller = new AbortController(); pending.add(controller);
    try {
      const response = await fetch(`/api${path}`, {
        credentials: 'same-origin', cache: 'no-store', redirect: 'error', ...options,
        headers: { 'Content-Type': 'application/json', 'X-Classroom-Student': selected.studentId, ...options.headers }, signal: controller.signal
      });
      let data;
      try { data = await response.json(); } catch { throw new Error('The classroom service did not return a valid response. Export your report to keep a copy.'); }
      if (!response.ok) {
        const error = new Error(response.status === 503 ? 'Connected classrooms are unavailable during privacy and school approval review. No draft was uploaded; independent labs and report exports remain available.' : response.status === 401 ? 'Your classroom session has ended. Export your report before returning to the classroom page.' : response.status === 409 ? `${data.message || 'The draft changed or your teacher paused classroom changes.'} Your local work is still here; refresh the classroom before trying again.` : data.message || data.error || 'Classroom request failed. Your local work is still available.');
        error.status = response.status; throw error;
      }
      return data;
    } finally { pending.delete(controller); }
  }
  function schedule() {
    if (disposed || !checkSelection() || !ready) return;
    queued = true; clearTimeout(timer);
    say('Changes are saved on this device. Classroom draft will sync shortly.');
    timer = setTimeout(() => sync().catch(reportError), 3000);
  }
  function reportError(error) {
    if (disposed || error.name === 'AbortError') return;
    if (error.status === 409 || error.status === 401 || error.status === 503) ready = false;
    say(error.message); updateButtons();
  }
  async function sync() {
    clearTimeout(timer);
    if (disposed || !checkSelection() || !ready) return false;
    if (busy) { queued = true; return false; }
    const work = progressSnapshot(record,scenarioId), serialized = JSON.stringify(work);
    if (serialized === lastSaved) { queued = false; return true; }
    busy = true; queued = false; updateButtons(); say('Saving classroom draft…');
    try {
      const result = await api(`/student/work/${encodeURIComponent(assignment.id)}`, { method: 'PUT', body: JSON.stringify({ expectedStudentId: selected.studentId, expectedVersion: version, work }) });
      if (disposed || !checkSelection()) return false;
      version = result.draft.version; lastSaved = serialized;
      say(`Classroom draft saved at ${new Date().toLocaleTimeString()}. Your teacher can review this in-lab work.`);
      return true;
    } finally {
      busy = false; updateButtons();
      if (queued && ready && !disposed) timer = setTimeout(() => sync().catch(reportError), 3000);
    }
  }
  async function sendSubmission() {
    if (disposed || !checkSelection() || busy || !ready) return;
    confirmSubmit.hidden = true;
    try {
      const saved = await sync();
      if (!saved || disposed || !checkSelection()) return;
      busy = true; updateButtons();
      const result = await api('/student/submit', { method: 'POST', body: JSON.stringify({ expectedStudentId: selected.studentId, assignmentId: assignment.id, expectedVersion: version }) });
      if (!disposed && checkSelection()) { showSubmission(result.submission); say('Submitted a fixed snapshot for your teacher. Later edits remain a draft until you submit again.'); }
    } catch (error) { reportError(error); }
    finally { busy = false; updateButtons(); }
  }
  save.addEventListener('click', () => sync().catch(reportError));
  submit.addEventListener('click', () => {
    if (!record.closed) { confirmSubmit.hidden = false; say('This ticket has not been delivered yet. You may still submit your current work for feedback.'); }
    else sendSubmission();
  });
  confirmSubmit.addEventListener('click', sendSubmission);
  stop.addEventListener('click', async () => {
    if (!checkSelection()) return;
    ready = false; clearTimeout(timer); pending.forEach(controller => controller.abort());
    try { localStorage.removeItem(CLASSROOM_ACTIVE_KEY); } catch { /* Browser storage may be disabled. */ }
    try { await api('/student/logout', { method: 'POST', body: '{}' }); } catch { /* Disable local sharing even while offline. */ }
    if (disposed) return;
    heading.textContent = 'Sharing stopped on this browser';
    description.textContent = 'No further drafts will sync here. Earlier drafts and submissions may remain available to your teacher. Local lab work has not been deleted.';
    controls.replaceChildren(room); feedback.textContent = ''; say('Export your report before switching browser profiles or clearing site data.');
  });
  async function initialise() {
    try {
      const session = await api('/session');
      if (disposed || !checkSelection()) return;
      if (session.role !== 'student' || session.student.id !== selected.studentId || session.student.classId !== selected.classId) {
        say('This browser does not have the matching classroom session. Export your work, then open Classrooms to sign in again.'); return;
      }
      heading.textContent = `Connected classroom · ${session.classroom.name}`;
      classLocked = session.classroom.locked === true;
      description.textContent = `Working as ${session.student.alias}. Only assigned in-lab drafts, actions, and submissions are shared with this teacher. No camera, screen recording, or browsing surveillance is used.`;
      assignment = session.assignments.find(item => item.labId === scenarioId);
      if (!assignment) { say('This investigation is not assigned in your classroom. It stays on this browser; no lab draft will upload.'); return; }
      const current = await api(`/student/work/${encodeURIComponent(assignment.id)}`);
      if (disposed || !checkSelection()) return;
      version = current.draft.version;
      const submissions = current.submissions || [];
      showSubmission(submissions[0] || null);
      const local = JSON.stringify(progressSnapshot(record,scenarioId));
      if (current.draft.work && JSON.stringify(progressSnapshot(current.draft.work,scenarioId)) !== local) {
        say('A classroom draft is available. Choose which work to continue before syncing. Your browser work is unchanged.');
        resume.hidden = false; useLocal.hidden = false;
        resume.addEventListener('click', () => { if (checkSelection()) onRestore(current.draft.work); }, { once: true });
        useLocal.addEventListener('click', () => {
          if (!checkSelection()) return;
          resume.hidden = true; useLocal.hidden = true; ready = !classLocked; save.hidden = classLocked; submit.hidden = classLocked; updateButtons();
          say(classLocked ? 'Your teacher has locked this class. You can work locally and export a report; uploads and submissions are paused.' : 'This browser’s work will replace the classroom draft when you save. Earlier submitted snapshots stay unchanged.');
        }, { once: true });
      } else {
        lastSaved = current.draft.work ? local : '';
        ready = !classLocked; save.hidden = classLocked; submit.hidden = classLocked; updateButtons();
        say(classLocked ? 'Your teacher has locked this class. You can review work and export a report; uploads and submissions are paused.' : 'Classroom sharing is active for this assignment. Changes sync after a short pause; use Submit for a teacher-reviewed snapshot.');
      }
    } catch (error) { reportError(error); }
  }
  initialise();
  return { schedule, dispose() { disposed = true; ready = false; clearTimeout(timer); window.removeEventListener('storage', storageChanged); pending.forEach(controller => controller.abort()); pending.clear(); } };
}
