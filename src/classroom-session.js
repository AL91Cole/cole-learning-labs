// Which saved-work scope this browser uses. Reading the selection needs no lab
// engine, so the start-up bundle imports this instead of the classroom client.
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

