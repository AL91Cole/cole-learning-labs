# Completion receipts and optional aggregate counters

This release prepares the endpoints. It does not provision a database, configure
secrets, approve district use, or turn collection on. All deployment flags stay
false until the owner reviews the actual deployment and publishes an approved
configuration. Public activities and local reports work without either service.

## What a receipt means

`CLL1-NET201-95-0720-261104-0123456789ABCDEF-<32 uppercase hex characters>`

The seven fields are the versioned prefix, known lab identifier, browser-reported
percentage, browser-reported active seconds, server UTC date, random 64-bit salt,
and a 128-bit truncated HMAC-SHA256 signature. The version and all other fields
are signed. The proposed eight-hex-character signature is deliberately unsupported
because it provides only 32 bits of authentication. Codes are case insensitive
when pasted, and malformed or noncanonical fields are rejected.

Signing confirms that the service issued those fields. The browser controls its
score, progress and timer. A caller who manipulates the browser can request a
receipt for fabricated work. Bot protection is not an assessment engine. Use lab
work, explanations and teacher review for assessment. Duplicate checks compare
only the codes in the current submitted batch; no identity is bound to a code and
there is no site-wide submission history.

## Server configuration

Use a cryptographically random secret of at least 32 bytes, stored only as the
Cloudflare Pages environment secret `RECEIPT_SECRET`. Never put its value in
Wrangler variables, client code, repository files, logs, screenshots or a PR.
The parser accepts 32–256 UTF-8 bytes. Set it separately for any intended preview
environment; production credentials must not be copied into a public preview.

Receipts require `RECEIPTS_ENABLED="true"`, that secret, and reviewed Turnstile
site/secret keys for the exact hostname. Issuance and verification respectively
require Turnstile actions `receipt` and `verify`. Before activation, configure and
test Cloudflare edge rate limits for `/api/telemetry` and `/api/verify`, including
request-body and daily usage limits appropriate for the account. Bot verification
reduces abuse but does not replace rate limits or a budget review. A verification
request accepts at most 200 codes and 28,000 body bytes; telemetry accepts 512.
Body reads have a two-second deadline. Requests require HTTPS, an allowed host,
same-origin JSON, and no cookies. No CORS access is offered.

Changing `RECEIPT_SECRET` invalidates existing receipts. This version has no key
identifier or previous-key ring. Plan a rotation window and tell teachers which
receipt dates they can verify before rotating. Never retain a compromised key
merely to preserve old codes.

## Optional D1 aggregates

Receipt-only requests do not need D1 and do not write counters. A write additionally
requires `collectTelemetry: true`, `TELEMETRY_ENABLED="true"`,
`TELEMETRY_PRIVACY_REVIEWED="true"`, `TELEMETRY_RETENTION_VERIFIED="true"`, and a
`LAB_TELEMETRY` D1 binding. `DNT: 1` or `Sec-GPC: 1` suppresses these writes while
still allowing an explicitly requested receipt. No configuration flag establishes
legal compliance; the owner must complete the applicable review.

The database stores counters grouped by UTC calendar day, known lab, event type,
duration band, score band and broad step band. It stores neither individual event
rows nor receipts, salts, raw scores, exact durations, free text, connection
headers, identities or persistent browser identifiers. Duration bands are under
1 minute, 1–5, 5–15, 15–30, 30–60 and 60+ minutes. Score bands are none, 0–49,
50–69, 70–89, 90–99 and 100. Step bands are 1, 2–3 and 4+. This cannot provide
an exact average duration or per-student history. Do not describe the timer as
independently verified engagement or inactivity as proof of abandonment.

`0001_telemetry.sql` defines the schema. It must be applied to the reviewed
database before binding it. Each admitted event atomically checks a shared cap of
5,000 events per UTC day; failed admission cannot partially increment a counter.
The cap bounds accepted writes, not incoming requests or provider traffic costs.
The counter cannot deduplicate retries because it stores no attempt identifier.

Cleanup retains the current UTC day and preceding 29 days. The request path runs
cleanup before writes. Deploy `wrangler.retention.jsonc` as a separate Worker only
after adding the same approved D1 binding, then verify a successful scheduled
cleanup and test expired-date deletion before setting the retention flag. Its
scheduled handler throws on cleanup failure so existing operational monitoring
can detect failures; establish an alert and deletion procedure before activation.
Keep the worker scheduled when new collection is disabled. Account for provider
backup/restore retention separately. No database identifier is preconfigured here.

No public analytics-read API is provided. If the owner exports statistics, combine
small groups and suppress totals below 10 before sharing. Avoid classroom labels
and identity joins. Broad duration/date groups still require contextual privacy
review; they are not a guarantee of irreversible anonymity. Cloudflare receives
network metadata to serve requests and Turnstile processes challenge data under
its own terms. Verify those services' current settings, logs and retention before
making any public statement about collected data.
