-- Optional classroom service. Apply only to a school-approved D1 database.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  teacher_email TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  join_code TEXT NOT NULL UNIQUE,
  join_code_hash TEXT NOT NULL UNIQUE,
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS classrooms_teacher ON classrooms(teacher_email);
CREATE INDEX IF NOT EXISTS classrooms_expiry ON classrooms(expires_at);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  alias TEXT NOT NULL CHECK (length(alias) BETWEEN 1 AND 40),
  joined_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS students_class ON students(class_id);

CREATE TABLE IF NOT EXISTS student_sessions (
  token_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON student_sessions(expires_at);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  lab_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  created_at INTEGER NOT NULL,
  UNIQUE(class_id, lab_id)
);
CREATE INDEX IF NOT EXISTS assignments_class ON assignments(class_id);

CREATE TABLE IF NOT EXISTS drafts (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  work_json TEXT NOT NULL CHECK (length(work_json) <= 65536),
  version INTEGER NOT NULL CHECK (version > 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(student_id, assignment_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  draft_version INTEGER NOT NULL CHECK (draft_version > 0),
  work_json TEXT NOT NULL CHECK (length(work_json) <= 65536),
  created_at INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  grade REAL CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100)),
  feedback TEXT NOT NULL DEFAULT '' CHECK (length(feedback) <= 4000),
  graded_at INTEGER,
  UNIQUE(student_id, assignment_id, draft_version)
);
CREATE INDEX IF NOT EXISTS submissions_assignment ON submissions(assignment_id, student_id, draft_version);

-- Request throttles retain a hash, never the raw connecting IP. Cleared after expiry.
CREATE TABLE IF NOT EXISTS join_limits (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS join_limits_expiry ON join_limits(expires_at);

-- Submitted work is a snapshot. Only grading metadata can change later.
CREATE TRIGGER IF NOT EXISTS immutable_submission_work
BEFORE UPDATE OF student_id, assignment_id, draft_version, work_json, created_at ON submissions
BEGIN
  SELECT RAISE(ABORT, 'submission_snapshot_immutable');
END;
