-- Anonymous feature-level reservation totals only. No questions, conversations,
-- names, learner IDs, IPs, records or credentials belong in this database.
-- Keep this ledger across deploys. Disable inference before restoring/deleting it.
CREATE TABLE IF NOT EXISTS requester_ai_budget (
  day TEXT NOT NULL PRIMARY KEY
    CHECK (length(day) = 10 AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND date(day) IS NOT NULL AND date(day) = day),
  reserved_neurons INTEGER NOT NULL
    CHECK (typeof(reserved_neurons) = 'integer' AND reserved_neurons >= 0
      AND reserved_neurons <= 6000 AND reserved_neurons % 25 = 0)
);
