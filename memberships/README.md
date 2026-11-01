# Adult educator memberships — disabled review prototype

This is a separate, **disabled prototype**, not an available subscription service. It prepares Google sign-in for individually approved adult purchasers and Stripe-hosted, automatically renewing subscriptions. No account, payment service, database, domain route or paid service has been enabled. Prices remain unset. The public build includes five beginner courses, practice workbenches for free cases and two investigations per topic; the remaining 32 investigations, studios, open coding sandboxes, capstone and teaching resources are reserved for members. See [the access policy](../docs/ACCESS-POLICY.md).

The intended portal origin is `https://members.colelearninglabs.com`. Purchaser authentication and billing must remain separate from the student lab site, its cookies, the AI budget database, classroom storage and diagnostics. A purchase does not authorize student accounts, student results collection or a school deployment. Student collection remains disabled.

## Release boundaries

Several independent controls currently prevent use:

| Boundary | Current setting and effect |
| --- | --- |
| Worker source | `MEMBERSHIP_SOURCE_RELEASE_APPROVED=false` in `worker.js`; the exported Worker rejects requests before accessing environment bindings or request contents. |
| Browser source | `MEMBERSHIP_CLIENT_RELEASE_APPROVED=false` in `public/membership.js`; the preview makes no sign-in, session or payment requests. |
| Runtime | `MEMBERSHIP_ENABLED="false"`, `MEMBERSHIP_PROCESSING_REVIEWED="false"`, and `MEMBERSHIP_DEPLOYMENT_MODE="test"` in the default, preview and production configuration. The prepared handler requires both flags to be exactly `"true"` and still accepts only test mode. |
| Billing mode | `LIVE_BILLING_REVIEW_APPROVED=false`; the implementation accepts only `sk_test_` credentials and test-mode objects. Changing an environment flag or inserting a live key cannot activate live billing. |
| Price approval | `catalog.js` has `DRAFT_CATALOG.reviewed=false` and an empty purchasable catalog. The monthly and annual preview amounts are `null`. The billing helper rejects checkout before reading payment credentials, accessing billing storage or constructing a Stripe client. An independently enabled test handler may first check authentication/admission storage. |
| Product delivery | `protected-assets.js` is empty in committed source. The local build embeds a reviewed member application and resource map into the server bundle only. The closed Worker entry prevents delivery. No support allowance has been approved. |
| Hosting | `wrangler.jsonc` has no routes, D1 binding or database IDs; `workers_dev` and preview URLs are off. No cron is configured. Metrics, application observability and source-map upload are off. |

Trusted dependency overrides in the exported handler and billing helpers exist for offline tests. They are not request fields, configuration shortcuts or production activation mechanisms. Client bodies cannot select a price, amount, customer, account, return URL, review gate or resource implementation.

`check.mjs` checks syntax and asserts the three source release gates remain closed. `build.mjs` writes a local disabled bundle, three allowlisted preview assets and a build receipt to `memberships/dist`; it does not deploy. The root lab build excludes this private membership directory, and the lab request routing is not expanded for it. The disabled Wrangler configuration selects `dist/worker.mjs` and `dist/public`, with a custom build from the membership directory. Any future approved Wrangler invocation must run from `memberships`; the raw `worker.js` entry has an empty private manifest and is not the deployable member artifact.

Do not activate this prototype by toggling flags alone. Price and product decisions, legal/privacy/insurance and school review as applicable, processing and retention notices, merchant settings, tax handling, independent security review, and an explicitly approved test rollout must come first. Live billing needs a separate reviewed implementation and owner approval; it is not supported by the current code.

## Local review

Use Node 24 or later and the isolated locked `memberships/package-lock.json`. The package pins Better Auth `1.7.14`, Stripe `23.1.0`, and the build tool `esbuild` `0.28.2`. The Stripe API version used by the installed SDK and this implementation is `2026-10-28.endive`.

From the repository root, these commands perform local checks only:

```sh
npm run check --prefix memberships
npm test --prefix memberships
npm run build --prefix memberships
node memberships/preview.mjs
```

The preview binds only to `127.0.0.1:4174`. It serves the three public preview files; API paths are unavailable. Stop it after review. Do not use a generic file server for the private membership directory or publish `node_modules`, tests, schemas or server source as static assets.

Tests use fictional identities, Stripe fixtures, the actual SDK with an offline HTTP transport, actual webhook signature verification and local SQLite with a D1-shaped adapter. Authentication tests exercise the installed Better Auth implementation against local storage. These checks do **not** verify live Google OAuth, a real Stripe account/Checkout/portal/email delivery, Cloudflare Workers/D1 behavior, DNS, school environments or a deployed subscription lifecycle. No live integration has been tested. Test success is not release approval.

## Reserved configuration contract

These names describe the reviewed implementation's requirements. They are not configured credentials and are not instructions to create or enable services. Secrets and the adult allowlist must never be committed, exposed to the public client, passed in URLs, or printed in logs.

| Name | Intended server-only value or binding |
| --- | --- |
| `MEMBERSHIP_DB` | A separately approved adult-membership D1 database, shared only by this module's auth, admission and billing tables. Never bind the AI budget or student database. |
| `MEMBERSHIP_PUBLIC_ASSETS` | The restricted public asset binding declared in `wrangler.jsonc`. |
| `MEMBERSHIP_ENABLED` | Closed runtime switch, currently `"false"`. |
| `MEMBERSHIP_PROCESSING_REVIEWED` | Independent closed processing-review switch, currently `"false"`. |
| `MEMBERSHIP_DEPLOYMENT_MODE` | Only `"test"` is accepted. |
| `MEMBERSHIP_ALLOWED_EMAILS` | Private, exact comma/newline-separated approved adult purchaser emails; at most 100. No domain or wildcard admission. Human approval must establish adult/school purchasing authority. An allowlist or checkbox is not proof of age. |
| `MEMBERSHIP_AUTH_SECRET` | Independent strong random authentication secret, 32 or more UTF-8 bytes and no more than 256 characters. |
| `MEMBERSHIP_GOOGLE_CLIENT_ID` | Approved Google web OAuth client ID for this fixed portal. |
| `MEMBERSHIP_GOOGLE_CLIENT_SECRET` | Its private OAuth secret. |
| `MEMBERSHIP_CSRF_SECRET` | A different strong random secret of at least 32 UTF-8 bytes. It must not equal `MEMBERSHIP_AUTH_SECRET`. Used for the session-bound `X-Membership-CSRF` header on checkout and portal requests. |
| `STRIPE_SECRET_KEY` | Test key only; live keys are refused. Use minimum appropriate provider permissions after verifying required operations in an approved test account. |
| `MEMBERSHIP_STRIPE_ACCOUNT_ID` | The approved account's exact `acct_` ID, checked against the server key's own account. |
| `MEMBERSHIP_STRIPE_PORTAL_CONFIGURATION_ID` | Approved test-mode `bpc_` configuration with the restricted cancellation behavior below. |
| `MEMBERSHIP_STRIPE_CANCELLATION_URL` | The exact enabled Stripe hosted portal login permalink matching that configuration; currently only `https://billing.stripe.com/p/login/test_...` is accepted. No actual permalink is configured. |
| `MEMBERSHIP_STRIPE_WEBHOOK_SECRET` | The approved endpoint's private `whsec_` signing secret. |

No environment price ID is accepted. A future reviewed source catalog must pin each approved Stripe price ID, exact USD amount and monthly/annual interval. The SDK retrieves the actual price and compares those values; a browser plan choice cannot set them. The current terms/consent version is the draft `2026-10-31-review` and must be reviewed alongside the final offer.

## Adult database and data minimization

Only after an approved deployment plan identifies a new, isolated adult database, its initialization would require all three reviewed schema files:

| File | Tables and purpose |
| --- | --- |
| `auth-schema.sql` | `membership_auth_user`, `membership_auth_session`, `membership_auth_account`, `membership_auth_verification`, `membership_auth_rate_limit`; generated from the pinned authentication library with additional storage constraints. |
| `guard-schema.sql` | `membership_admission`; anonymous global feature totals for admission limits. |
| `billing-schema.sql` | `membership_billing_accounts`, `membership_billing_consents`, `membership_billing_events`; purchaser ownership, durable idempotency/leases, renewal consent and minimal webhook receipts. |

No schema has been applied to a remote database. `auth-schema.mjs` generates/verifies the local auth schema using fictional configuration; it is not a remote migration tool. Future migrations need review, backups, access control and rollback planning. Never initialize these tables in an existing AI or classroom database.

The proposed adult account is **not anonymous**. It necessarily includes a verified purchaser email, opaque internal/Google account IDs, session credentials, provider customer/subscription IDs, consent facts and timestamps. Stripe would also process purchaser and card/payment details under its own service. Card numbers, payment tokens and passwords do not pass through the membership application.

Auth requests are reconstructed without forwarding connection headers. The app does not store IP addresses or user agents in sessions, real names or avatars, OAuth access/refresh/ID tokens, student identifiers, rosters, grades, submitted work, AI chat, learning activity or analytics. Auth schema constraints reinforce the null/static fields. OAuth state/verification records and session credentials remain sensitive even though provider tokens are removed. Hosting, identity and payment providers still process ordinary connection information; application minimization does not make those providers anonymous or eliminate their logs, subprocessors or retention obligations.

The application uses Google sign-in with verified email and an exact operator allowlist, no local passwords or account linking. Sessions are server-validated, expire after eight hours, do not refresh automatically and use Secure, HttpOnly, SameSite=Lax, host-only `__Host-` cookies. The current allowlist is rechecked on every adult session lookup. Keep the portal on its separate origin and do not add shared parent-domain cookies.

## Payment and access boundaries

Checkout requires both explicit adult confirmation and a deliberate renewal-consent choice for the current terms version. The server stores the approved price, interval, currency, consent version, timestamp and cancellation permalink before creating a session. Hosted Checkout displays the automatic-renewal amount/frequency and requires terms acceptance. Fixed return URLs grant no access.

The prepared flow uses Stripe-hosted subscription Checkout, quantity one and card payments. It enables no trials, promotion codes, upgrades, upsells or client-selected price changes. SDK requests have timeouts and automatic network retries are disabled. Durable customer/checkout idempotency keys, transactional updates, leases and revision checks limit parallel duplicate purchases. An uncertain network outcome is not permission to create another customer or charge. Preserve the ledger and investigate the same provider operation; attempts outside the bounded 23-hour idempotency-retry window require operator review. Do not clear pending keys or bypass locks to make checkout succeed.

**Tax is disabled only in this test prototype.** This is not a tax-exemption determination. The seller's location, customer locations, digital-product/SaaS classification, registration, collection, exemptions and invoicing requirements require qualified review before any paid launch. Current entitlement checks expect the exact approved price amount, so adding tax, discounts or prorations requires reviewed billing and access changes rather than a dashboard toggle. No paid tax feature has been enabled.

Each status/premium check retrieves current provider state, approved price, matching purchaser and stored consent, current paid period, paid invoice and actual successful card payment. Refunds/disputes and unpaid or ambiguous states fail closed. Cached database status, a successful return page, client flags and unsigned webhooks cannot unlock resources. The full learning library is packaged for separately approved adult access; its delivery is currently disabled.

Every `/learn/` page, script, style, image and download requires a current adult session and its own fresh provider entitlement verification. The member application is compiled separately with its complete catalogue. It is not stored in the public asset binding or the public site output. A bounded per-member queue serializes simultaneous checks without caching or sharing authorization decisions; typed lease conflicts receive at most two short retries. Private styles are consolidated to keep normal browser requests within the existing concurrency limit. Provider latency, distributed contention, startup time and actual plan limits still need approved integration testing. The build receipt records raw and gzip size; it does not certify deployment capacity or cost.

The public application never treats local storage, query flags, a client-supplied role, or a hash route as proof of payment. It includes only free case payloads and shared simulation primitives, plus safe titles/grades/durations for member teasers. Existing public repository history and previously downloaded or deployed content remain public. Restricting future hosted delivery does not make that earlier source confidential.

Paid access is for approved adult purchasers only. Classroom/student entitlements are not implemented. Purchasers must not share their billing sign-in with students; neither the protected app nor its purchase enables classroom collection. The isolated member origin has no AI proxy, so it uses authored local replies until a separate reviewed connection exists. The public AI gateway accepts only the approved free case IDs.

Webhooks use bounded raw bytes and Stripe's signature verifier with a five-minute tolerance. The implementation checks the expected API version, account scope and test mode, then admits only recognized events for known customers to the persistent webhook budget. It stores event ID, digest, type, purchaser reference and processing timestamps, not event payloads or headers. Duplicate events are idempotent; canonical provider reads and revision fencing prevent an older paid event from reviving access after a newer revocation. Quotas and shared anonymous admission controls reduce exposure but can still affect availability; they are not an absolute spending or attack-prevention guarantee.

## Cancellation, refunds and incidents

Before any Checkout is permitted, the approved Stripe portal configuration must be active, in test mode, show invoice history, permit cancellation **at the end of the paid period**, and have its hosted login page enabled. Subscription changes and pauses are disabled. Its exact hosted login URL must match `MEMBERSHIP_STRIPE_CANCELLATION_URL`. A valid paid subscription is not required to open billing management for an existing owned customer.

The hosted login permalink is an essential independent cancellation fallback when this application's login is unavailable, the purchaser is removed from the allowlist, or the portal is paused. The code validates it and places it in Checkout text and consent metadata. **Metadata is not an email or a tested notification system.** Before release, verify the actual purchaser acknowledgment/confirmation and applicable renewal reminders contain the functioning permalink, renewal price/frequency and reviewed cancellation/refund terms. Test access to that link without an application session and after allowlist removal. No real acknowledgment, receipt, reminder or cancellation email has been tested here. The current preview has no active fallback URL.

Ordinary cancellation retains access only through the verified paid period. Refunds, dispute events (including dispute closure) and customer deletion set a persistent `billing_hold=1` and revoke access. Later paid events do not clear that hold. The app exposes no public hold-reset endpoint. An authorized operator must investigate provider records, legitimate refund/dispute outcomes and the reviewed customer policy before any separately reviewed restoration; cancellation must remain possible throughout. Do not automatically clear holds after a renewal or reset the billing database.

Suspected compromise, accidental personal data, unknown payment outcomes or provider/account mismatches require the approved incident and support process. Keep billing/customer ownership and minimal audit evidence intact, restrict access, rotate/revoke affected credentials as appropriate, and assess notification duties with qualified advisers. Do not copy raw provider payloads, purchaser information or secrets into public issues or application logs. Deactivating the application does not cancel existing provider subscriptions; operators must ensure purchasers retain a working cancellation route and honor refund/cancellation obligations.

## Retention and ongoing operation

There is no scheduled cleanup, reconciliation service, email reminder service or automatic retention policy. `expires_at`/`expiresAt` fields and the webhook retention index do not delete records. Deployment with no maintenance plan would accumulate records.

Before any personal data processing, approve a documented retention/deletion schedule covering expired sessions and OAuth verification/state, inactive adult accounts, anonymous admission/rate-limit buckets, webhook receipts, backups, consent evidence, payment references and provider-side data. Retention must account for applicable billing, tax, consumer, incident and school requirements. Preserve idempotency, customer ownership, unresolved event receipts and refund/dispute holds for the required safety period; deletion must not permit duplicate billing or a stale-event access grant. No production purge procedure or self-service account-deletion flow exists in this prototype. Deleting an auth account alone does not cancel Stripe subscriptions or remove all billing/provider records.

Assign a responsible operator and a reviewed manual procedure before a test rollout. Responsibilities include provider reconciliation and failed webhooks, unknown payment outcomes, renewal/cancellation notices, refunds/disputes, retention requests and cleanup, backups/restores, adult allowlist approval, account MFA and access reviews, secret rotation, dependency advisories and pinned upgrades. Any cron or external monitoring/reminder integration is a separate design/cost/privacy decision; none is configured here. Disabled application logs also mean this prototype has no proven production alerting or support evidence pipeline.

No system is impenetrable, and notices do not guarantee protection from personal liability. This code does not establish compliance with NY Education Law 2-d/Part 121, COPPA, FERPA, privacy, accessibility, auto-renewal, consumer or tax laws. Adult billing minimization and disabled student collection reduce scope; they do not replace counsel, appropriate business structure and insurance, provider contracts, school authorization where needed, independent security testing or an operational incident plan. Those reviews and the owner's explicit approval remain prerequisites to any release.
