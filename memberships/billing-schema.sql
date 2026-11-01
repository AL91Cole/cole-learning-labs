-- Dedicated ADULT membership database only. Never apply to the requester AI
-- budget, learner diagnostics or classroom databases. No card data, IP address,
-- user agent, learner identity/work, event payload or chat belongs in these tables.
CREATE TABLE IF NOT EXISTS membership_billing_accounts (
  member_id TEXT PRIMARY KEY NOT NULL CHECK(length(member_id) BETWEEN 1 AND 128),
  customer_key TEXT NOT NULL UNIQUE,
  customer_attempt_at INTEGER,
  customer_id TEXT UNIQUE,
  subscription_id TEXT UNIQUE,
  plan_id TEXT CHECK(plan_id IS NULL OR plan_id IN ('teacher-monthly','teacher-annual')),
  state TEXT NOT NULL DEFAULT 'inactive' CHECK(state IN ('inactive','active','blocked')),
  paid_until INTEGER NOT NULL DEFAULT 0 CHECK(paid_until >= 0),
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK(cancel_at_period_end IN (0,1)),
  billing_hold INTEGER NOT NULL DEFAULT 0 CHECK(billing_hold IN (0,1)),
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  checkout_key TEXT,
  checkout_attempt_at INTEGER,
  checkout_plan_id TEXT CHECK(checkout_plan_id IS NULL OR checkout_plan_id IN ('teacher-monthly','teacher-annual')),
  checkout_id TEXT UNIQUE,
  checkout_consent_version TEXT,
  checkout_consent_at INTEGER,
  lease_token TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0 CHECK(lease_until >= 0),
  created_at INTEGER NOT NULL CHECK(created_at > 0),
  verified_at INTEGER NOT NULL DEFAULT 0 CHECK(verified_at >= 0)
);

CREATE TABLE IF NOT EXISTS membership_billing_consents (
  checkout_key TEXT PRIMARY KEY NOT NULL,
  member_id TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  plan_id TEXT NOT NULL CHECK(plan_id IN ('teacher-monthly','teacher-annual')),
  amount INTEGER NOT NULL CHECK(amount BETWEEN 50 AND 100000),
  currency TEXT NOT NULL CHECK(currency = 'usd'),
  interval TEXT NOT NULL CHECK(interval IN ('month','year')),
  consented_at INTEGER NOT NULL CHECK(consented_at > 0),
  cancellation_url TEXT NOT NULL CHECK(length(cancellation_url) BETWEEN 20 AND 400),
  FOREIGN KEY(member_id) REFERENCES membership_billing_accounts(member_id)
);

CREATE TABLE IF NOT EXISTS membership_billing_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  digest TEXT NOT NULL CHECK(length(digest) = 64),
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(length(event_type) BETWEEN 1 AND 80),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processed')),
  received_at INTEGER NOT NULL CHECK(received_at > 0),
  processed_at INTEGER,
  FOREIGN KEY(member_id) REFERENCES membership_billing_accounts(member_id)
);
CREATE INDEX IF NOT EXISTS membership_billing_events_retention ON membership_billing_events(received_at);
