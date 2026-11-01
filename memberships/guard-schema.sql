-- Anonymous admission buckets for the adult portal only. No connection/user data.
CREATE TABLE IF NOT EXISTS membership_admission (
  bucket TEXT PRIMARY KEY NOT NULL,
  used INTEGER NOT NULL CHECK (typeof(used)='integer' AND used BETWEEN 1 AND 5000),
  expires_at INTEGER NOT NULL CHECK (typeof(expires_at)='integer' AND expires_at>0)
);
