# Optional lab-improvement summaries: prepared, not activated

The public production entry point and scheduled-retention entry point are source-locked. They do not collect summaries, read bindings or touch a database until a separately reviewed source release changes those gates. A learner's opt-in, an environment flag, repository merge or database binding is not school authority, parental consent or a compliance determination. The classroom-records gate is independent and remains closed.

## What the prepared service accepts

One explicitly reviewed, self-reported summary for an authored activity: schema version, fixed activity code, outcome choice, coarse attempts choice and issue choice. “Other” is a fixed code, not a text box. The service rejects extra fields rather than removing them. It does not accept lab records, answers, notes, questions, source code, outputs, screenshots, URLs, school/class labels, learner/session IDs, client times or browser fingerprints. It does not read saved work. The browser does not transmit a history or queue an unload beacon.

Only HTTPS POSTs from the same canonical website, with its exact Origin and `Sec-Fetch-Site: same-origin`, may reach the prepared handler. Requests with credentials, query parameters, non-JSON encoding or more than 512 streamed bytes are refused. Origin checks protect browser cross-site requests; they do not authenticate a native client or prevent fabricated summaries.

The server assigns its reviewed release and UTC calendar month. One atomic SQL statement admits the entire operation only when the shared daily limit of 500 and minute limit of 30 both permit it. It increments four independent marginal counters (reports, outcome, attempts, issue) and the two global quota counters. There are no event or summary rows and no joint attempt/outcome/issue vectors. Quota times describe only the site's overall admission budget, not an individual's timestamp. No addresses, cookies, identifiers or headers are used as quota keys. This is not a provider-wide spending cap; provider ingress controls and billing monitoring still need review.

No identifier means no reliable distinct-person count or cross-page duplicate detection. Repeated or fabricated summaries can affect results, even with quotas. These are unverified voluntary submissions, not proof of attendance, learning, authorship, grades, representative usage or unique learners. No learner reward depends on sharing.

## Storage, reporting and deletion

Provision a **separate** D1 database named by the `LAB_IMPROVEMENTS` binding only after the release review. Apply `0001_improvements.sql`; never use the classroom database or expose D1 credentials in the frontend. `IMPROVEMENTS_ENABLED` must also equal `true`, but cannot bypass the source gate. No read/report HTTP endpoint is implemented.

The prepared code keeps the current UTC calendar month plus the preceding two months. Per-write cleanup removes older monthly counters. The default `wrangler.retention.jsonc` has no Cron Triggers, public routes, preview URLs or database binding, so it does not authorize scheduled work or provision services. Only after the privacy and cost review, configure a separate daily Cron Trigger to run the reviewed `retention-worker.js` so cleanup continues when no summaries arrive. Its source gate must be reviewed with the collector. Keep only today/yesterday's global daily quotas and the last two minutes of minute quotas. Verify the actual scheduled job and deletion behavior before activation; this prepared config is not evidence that a deployed cron exists.

Logical deletion does not guarantee immediate physical destruction. D1 recovery copies, exported files, operator backups and provider security records have separate retention and access rules. At review time D1 Time Travel is 7 days on Free and 30 days on Paid; review the actual service and any copies before making deletion promises. Without identifiers, a particular person's contribution cannot be located or removed from counters. Withdrawing a choice stops future submission and can cancel work that has not been received; it cannot recall an already accepted aggregate contribution.

After retention is approved, switching `IMPROVEMENTS_ENABLED` off stops new collection but **does not stop scheduled cleanup**. Keep the separate retention job and its database binding available until existing counters and relevant recovery/export copies have reached their reviewed deletion deadlines.

The operator can run `node improvements/report.mjs <operator-owned-local.sqlite>` against a reviewed, local SQLite snapshot. It reads that file read-only, accepts no URL or custom query, and prints a fixed JSON report. Only closed months in the retained window appear. Activity/month groups under 20 summaries are omitted; positive metric cells under 20 are suppressed and other values rounded down to tens. These are **submission thresholds**, not a verified count of 20 distinct people and not k-anonymity or differential privacy. Reports are owner-only and should not be publicly published or repeatedly sliced into small cohorts. Keep exports under the same access and deletion policy; the CLI cannot erase other copies.

The report has an explicit reviewed release registry, independent of the collector's current release. When adding a new release, retain still-in-window historical identifiers in that registry and review any activity-code changes. Unexpected release identifiers fail with a generic error rather than appearing as report labels.

## Required activation evidence

Complete the [privacy release requirements](../docs/PRIVACY-RELEASE-GATE.md) for this new purpose, including NYS Education Law §2-d/Part 121 and COPPA as applicable. Record who may authorize this processing, the covered audience, necessary notices/consent or school authority, any school/provider agreements, security review, operator contacts, access controls, provider records, purpose-limited retention and actual deletion/incident operations. User choice is an additional product control, not a substitute for those requirements. Keep collection unavailable when the necessary authority or review is unresolved.

Use the exact public disclosure for the reviewed design. App storage intentionally contains no individual identifiers, but Cloudflare still receives ordinary connection information. Do not claim network requests are anonymous or that nobody can identify an individual in context. Disable Workers observability and invocation logs for this feature; do not add console logging, request/body dumps, tracing that captures payloads, or analytics/session replay. Verify provider log handling independently: source settings alone cannot establish provider-wide retention.

Tests use only fictional summaries and local SQLite. No database or collector was provisioned or deployed by these files.

Primary operational references: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [D1 Time Travel and limits](https://developers.cloudflare.com/d1/platform/limits/), and [Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
