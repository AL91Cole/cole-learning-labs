# Operations review — November 1, 2026

This record preserves the original read-only review as a historical baseline, followed by a dated record of later, explicitly authorized operator changes. Sections through **Decisions still needed before provider work** describe that baseline: statements such as “no record changed” or “unverified” apply to that stage, not to the later applied follow-up. The follow-up distinguishes changes verified in provider settings from source changes still awaiting review and release. The agreed free/member tiers, disabled membership release, and classroom and improvement-collection locks remain intact. This document itself does not authorize further changes, a PR merge, a deployment, a purchase, or a new service.

## Baseline evidence and limits (historical)

The reviewed repository baseline is `5612e23ebdd5ea27fca88812e71f5defa716c895`. GitHub `main` was `527622a556e671c3b369812b720d9b15c9dc4503` (PR #34). [PR #35](https://github.com/AL91Cole/cole-learning-labs/pull/35) remained open and unmerged. Later audit work is isolated on `codex/audit-security-usability`; a proposed source change does not establish production behavior.

| Checked on November 1 | Finding | Practical meaning |
| --- | --- | --- |
| Dedicated `work/teacher-memberships` checkout, before audit edits | Clean at `5612e23`; three commits ahead of `main`, with `main` already an ancestor | Audit S1's stale-terminal-checkout description does not describe this checkout. |
| Repository README | Documents optional private, topic-only AI and the shared D1 admission ledger | Its local AI activity models remain distinct from optional cloud conversation. A phrase about a local model is not evidence that all cloud AI is absent. |
| Public DNS lookup | SPF authorizes Google Workspace; the `_dmarc.colelearninglabs.com` lookup returned no DMARC TXT record | Review domain authentication. SPF alone does not establish DKIM signing or DMARC alignment. |
| Production `cole-learning-labs.pages.dev` probe | HTTP 200, without a canonical redirect or `X-Robots-Tag` | The production alias still provides a second public delivery hostname. |
| Tested PR #35 preview probe | HTTP 200 with `X-Robots-Tag: noindex` | This preview is publicly accessible but asks search engines not to index it. That header is not access control. |
| Public HTTPS header probes | `www` sent HSTS `max-age=15552000`; the apex redirect did not send HSTS | These are the measured baseline responses, not a claim that a proposed header update is already live. |

The older `C:\Projects\Cole-Learning-Labs` checkout could not be inspected through the available filesystem access. Its changes must not be stashed, discarded, rebased, or deleted based on this record. Thirty-five remote branches were listed; their number alone does not establish a vulnerability or authorize pruning.

Dashboard claims in the pasted audit are **unverified unless explicitly recorded as checked here**. In particular, this review did not independently establish Cloudflare's current plan, existing rate-rule contents, preview count/access setting, TLS dashboard settings, bot controls, notification subscriptions, or all current Worker bindings/routes. Historical deployment notes are evidence of their stated date, not proof of current settings. See [the private requester deployment record](PRIVATE-REQUESTER-DEPLOYMENT.md).

## GitHub protections checked

The active [Protect main releases ruleset](https://github.com/AL91Cole/cole-learning-labs/rules/25273977) applies to the default branch. It blocks deletion and force-pushes, requires linear history, pull requests, resolved review threads, and an up-to-date branch. No bypass actors were listed. Its required status checks are:

- `CodeQL (actions)`
- `CodeQL (javascript-typescript)`
- `Syntax, privacy, and simulation tests`
- `Isolated terminal and real Docker PTY tests`

The ruleset's code-scanning condition is `medium_or_higher` for security alerts and `errors` for other alerts. Separately, the repository's Code Security check-run UI showed **High or higher / Only errors**. These are distinct settings; do not report them as one identical threshold. The ruleset requires **zero approving reviews**, so a required PR does not itself enforce an independent reviewer.

The latest ten returned Security checks runs completed successfully. Main's required checks and PR #35's checks were successful, including PR #35's new `Disabled adult membership security and billing tests` job. That new job is not listed among the existing ruleset's required checks. If membership proceeds, review whether to require it before a future membership release. [Main run](https://github.com/AL91Cole/cole-learning-labs/actions/runs/41250839769), [PR #35 run](https://github.com/AL91Cole/cole-learning-labs/actions/runs/41260462601).

The signed-in settings UI was inspected without changing it:

- Private vulnerability reporting, Secret Protection, and push protection were enabled.
- Default Actions token access was **Read repository contents and packages**. Actions could not create and approve pull requests.
- Requiring full action commit SHAs was enabled. Only this repository owner's actions and GitHub-owned actions were selected; verified Marketplace actions were not selected. Outside contributors required workflow approval.
- The checked workflow already pins action revisions by full SHA and uses `persist-credentials: false`. Its general permission is `contents: read`; the CodeQL job separately receives the permissions needed to upload results.

Account two-factor authentication, passkeys/security keys, recovery arrangements, and device/session security remain unverified. Enabled scanning and passing checks do not establish that the system is free of vulnerabilities. Follow [SECURITY.md](../SECURITY.md) for private reporting; keep confidential evidence out of public issues, this document, and PR descriptions.

## S6: AI admission already has a shared backstop

The private Worker's in-memory limiter permits 12 attempts per minute, 500 per day, and two in-flight calls **per isolate**. Restarts and other isolates have their own counters. Availability GETs do not run inference and do not use that limiter. [Worker source](https://github.com/AL91Cole/cole-learning-labs/blob/5612e23ebdd5ea27fca88812e71f5defa716c895/worker-requester/worker.js#L26-L41).

Each inference also requires an atomic D1 reservation, shared across isolates. One statement reserves 25 units in both today's and tomorrow's UTC buckets, with 6,000 units permitted in either bucket. Initially empty buckets admit up to 240 starts; sustained daily use is approximately 120 starts per day because of carryover. Failed, canceled, timed-out, or rejected replies do not refund reservations. Preserve this ledger across deployments. [Budget implementation](https://github.com/AL91Cole/cole-learning-labs/blob/5612e23ebdd5ea27fca88812e71f5defa716c895/worker-requester/budget.js#L1-L35).

These are feature admission limits, not measured provider neurons or an account-wide spending ceiling. An attacker can still consume shared availability. Incoming hosting requests, storage operations, and unrelated account use remain outside an inference-start count. No live AI load test was performed for this review.

### Manual proposal: a school-aware, included edge rule

Before replacing any existing rule, inspect and record its actual expression, action, purpose, and included-plan eligibility. The pasted audit's rule name is insufficient evidence that the rule is unused.

If an included rule is available, prepare an exact-path match:

```text
http.request.uri.path eq "/api/requester"
```

Cloudflare's documented Free configuration supports IP counting, a 10-second period, and 10-second mitigation. Its rate-rule expression fields do not include Method, so this path rule would count both opt-in GET checks and POST replies. IP-with-NAT-support is a different feature and can introduce visitor cookies. Do not add that feature, identifiers, or new authentication as part of this change. [Current rate-rule availability](https://developers.cloudflare.com/waf/rate-limiting-rules/), [counting parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/).

Do **not** adopt the pasted audit's 10 requests/10 seconds threshold. A school may share one public IP. Size any coarse flood threshold above the largest expected shared-IP burst: approximately two initial requests per simultaneous AI user, plus headroom for other classes, tabs, and retries. Select a number only after a synthetic school-burst review; do not collect learner identities to tune it. Leave normal static pages outside this rule. Keep the existing D1 caps and immediate local-answer fallback.

Edge rate counters have propagation delay and per-data-center scope; they cannot replace the atomic ledger. Current application limits are also deliberately conservative and need capacity review before a whole-class cloud-AI rollout. No rule, threshold, plan, or budget was changed.

## Manual domain-mail review

1. Inventory each legitimate sending service and every domain/subdomain used in its visible From address. Include Workspace and any approved forms, support, or billing mail; do not assume a future payment provider sends as this domain.
2. Check Workspace's actual DKIM selector and signing status. Inspect synthetic messages received outside the domain for SPF, DKIM, and DMARC alignment. A DNS key by itself does not prove active signing. Confirm third-party senders separately. [Google's DKIM instructions](https://knowledge.workspace.google.com/admin/security/set-up-dkim).
3. Choose an existing, monitored report alias without adding a paid mailbox or report service. Restrict access and decide retention. The report address becomes public in DNS; aggregate reports can include operational addresses, source IPs, domains, and authentication results. Keep reports out of the repository. Do not enable forensic `ruf` reports or publish a personal address by default.
4. Prepare a single `_dmarc` TXT record using `p=none` and the approved `rua` address. This monitors; it does **not** request quarantine or rejection. Verify publication and review legitimate delivery before considering `p=quarantine`, then `p=reject`. Include subdomain senders in that decision. [Google's DMARC setup](https://knowledge.workspace.google.com/admin/security/set-up-dmarc).

No report address has been selected here, and no DNS record or signing setting has been changed. A concrete change record must contain the actual approved address, sender-test results, exact TXT value, and rollback value before implementation. DMARC enforcement reduces unauthorized use of a domain at participating receivers; it does not prevent every impersonation method or establish legal compliance.

## Manual production-alias and preview review

Cloudflare documents account-level Bulk Redirects for a Pages production hostname. Prepare a redirect from **only** `cole-learning-labs.pages.dev` to `https://www.colelearninglabs.com/`; verify the canonical domain is already attached and the account has included rule/list capacity. [Pages redirect instructions](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/).

For the proposed list entry, use 301, subpath matching, path-suffix preservation, and query preservation. Keep **Include subdomains off**: branch/hash preview hosts must not be swept into this production-only redirect. The general Cloudflare example includes subdomains; this narrower scope is deliberate. Check HTTP and HTTPS behavior explicitly rather than assuming one source entry covers both schemes.

Before saving anything, review the exact source/target and the list's other entries. Test the eventual redirect with `/`, a known asset, a nested path, and a harmless query; confirm no loop and the expected canonical destination. Separately confirm the PR preview still loads its own build with `noindex`. No redirect has been installed.

`noindex` is a crawler instruction, not a confidentiality boundary. Cloudflare documents it as a default preview header. [Preview behavior](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

Do not bulk-delete historical previews. First inventory deployment IDs, branches, commits, active review links, rollback needs, and any historical exposure requiring private investigation. Agree a retention window and a specific deletion list; retain current production and needed review/rollback deployments. Preview-access restrictions need their own reviewed scope, account eligibility, and reviewer-access test. This document does not authorize an Access registration, payment method, upgrade, or cleanup operation.

## Headers and optional alerts

Recheck production headers after any approved release. Extending HSTS on the reviewed host does not by itself cover the apex or every subdomain. Inventory and test subdomains before considering `includeSubDomains`; it was not approved or enabled here. Do not treat preload as a routine follow-up: the preload-list operator currently recommends HSTS but advises against preloading as a general recommendation, and removal can take months. No preload submission was made. [HSTS deployment and preload guidance](https://hstspreload.org/). Avoid applying the main application's inline-style allowance to stricter local-report or membership-account pages. Preserve their separate policies.

Possible notification candidates are production Pages deployment failure, the basic HTTP DDoS alert, and Universal SSL lifecycle notices. Cloudflare currently lists these types as included across plans, but actual account eligibility, delivery destination, and any charge must be confirmed in the wizard before saving. Use an existing approved email recipient; do not enable paid monitoring, advanced DDoS alerts, SMS, webhooks, or another subscription as a side effect. Notifications cover their documented events, not every outage. [Available notification types](https://developers.cloudflare.com/notifications/notification-available/).

## Decisions still needed before provider work

| Proposed operation | Concrete information required |
| --- | --- |
| DMARC monitoring | Actual existing report alias, mailbox access/retention, authenticated sender inventory, synthetic alignment results, exact TXT value. |
| Later DMARC enforcement | Report-review period, legitimate sender fixes, subdomain impact, chosen policy, rollback plan. |
| Optional edge rate rule | Exported current rule, confirmed included entitlement, largest school-IP burst estimate, tested threshold, exact expression/action. |
| Production Pages alias redirect | Exact production-host entries for relevant schemes, included Bulk Redirect capacity, subdomains off, canonical and preview tests. |
| Historical preview retention | Approved deployment-ID inventory, retention/deletion list, preserved review and rollback builds. |
| Optional notifications | Account eligibility, explicit no-additional-charge confirmation, exact basic alert types, existing approved recipient. |

The free/member content decision remains intact. Membership pricing and release remain disabled; purchasing cannot authorize student accounts or classroom collection. Broader K–12 content planning is separate from these operator actions.

## Applied follow-up — November 1, 2026

The operator subsequently completed and checked the changes below with the user's authorization. This updates the corresponding baseline findings; it does not imply that every dashboard claim in the pasted audit was verified. Actual owner identity, the DMARC report address, account/team identifiers, login redirect details, PINs and credentials are deliberately omitted from this public record.

### Provider changes and related checks

| Area | Applied change and observed result | Scope and remaining limits |
| --- | --- | --- |
| Domain mail | A DMARC TXT record with `p=none` and `rua` to an approved, existing business alias was published. | This is monitoring, not quarantine or rejection. The actual recipient and aggregate reports stay out of the repository. Sender alignment and delivery still need review before any stronger policy. |
| Google DKIM | An existing Google DKIM public key was observed in DNS; no signing/key change was made. | The key was already present before the DMARC edit. Active signing and successful SPF/DKIM/DMARC alignment were **not** verified. A DNS key alone does not complete that verification. |
| Production Pages alias | Both HTTP and HTTPS requests to `cole-learning-labs.pages.dev` returned 301 redirects to `https://www.colelearninglabs.com`, with path and query preservation checked. | Include subdomains is off. Branch and hash previews remain outside this production-only redirect. |
| Credential protection | The original leaked-credential expression was preserved unchanged in an immediate custom Block rule before the rate-limit slot was reassigned. | Retain this protection when reviewing or rolling back the rate-rule change. No credential material or detection payload is recorded here. |
| AI edge flood rule | With explicit user approval, the existing Free edge rate-limit slot was changed to the exact `/api/requester` path: 1,500 requests per 10 seconds per IP, Block for 10 seconds. Its active state was checked. | Chosen with shared school IP bursts in mind; it is not a verified whole-class capacity target. It counts availability checks as well as replies. Static pages are outside the path rule. The stricter application/D1 budgets were unchanged. |
| Preview access | Access covers `*.cole-learning-labs.pages.dev` on all paths. Its Allow policy uses only the exact, privately approved owner email, one-time-PIN login and a six-hour session. No Bypass policy was configured. | Ten anonymous checks across a branch alias and a hash alias, including direct HTML/script/style/download paths, returned the expected Access 302 login redirects. Owner login to the canary preview was verified in Chrome. Production hostnames are outside this preview scope. |
| Preview build guards | Only two encrypted preview settings were saved: `CLL_OWNER_ACCESS_ISSUER` and `CLL_OWNER_ACCESS_CANARY_HOST`. | Values are not committed. No Functions routing or service binding was changed by this operation. The settings alone do not publish or activate the full owner artifact. |
| Deployment notification | The production Pages deployment-failure alert was saved and read back as enabled. | Uses the approved existing business recipient and the included alert type. It does not detect every site failure. |
| DDoS notification | The account's Basic HTTP DDoS attack alert was saved and read back as enabled with the approved existing business recipient. | No advanced DDoS configuration or paid notification option was selected. |

The zone and Access entitlement were checked as Free. No new plan or paid add-on was added. This records the choices made; it is not a guarantee against usage charges or an account-wide spending ceiling.

Latest read-only production checks returned 200 for `www`, 301 from the apex to `www`, and the expected nested-path 301 from the production Pages alias over both HTTP and HTTPS. The requester availability GET returned 200; disabled improvement/classroom API probes returned 404. A DNS-over-HTTPS lookup confirmed the published DMARC monitoring policy, `p=none`. These status checks do not establish every request variant or complete email authentication.

Before any full owner upload, the Access application inventory showed only the wildcard preview application, with no more-specific override application. The Pages custom-domain list contained only the apex and `www`, both active with SSL, and no preview custom domain. This inventory was checked while the full static owner branch remained unpublished.

The certificate/access notification wizard did **not** offer a Universal SSL alert. It offered other categories, including advanced certificate, mTLS, service-token and SSL-for-SaaS alerts. Those alternatives were left unchanged; no SSL lifecycle notification is claimed as enabled.

### Source work and activation status

- The one-year, host-only HSTS policy, public COOP/CORP headers and `security.txt` remain source changes in unmerged [PR #36](https://github.com/AL91Cole/cole-learning-labs/pull/36). They have not been published by this follow-up. No `includeSubDomains`, preload request or preload submission was added. The baseline apex-header limitation remains a separate deployment concern.
- The current review branch contains 15 authored, local K–6 activities, grouped into K–1, 2–3 and 4–6. They add no learner account, free-text input, saving, reporting, cloud-AI request or collection path. The public structured collection has 30 activities; the full structured collection has 62. Existing grades 7–12 case grades and the 10-free/32-member investigation split remain intact.
- The prepared membership service, independent owner entitlement and live billing remain disabled. The separate static owner-preview builder is reviewable, but its full private branch has **not** been published. [Owner access boundaries](OWNER-LAB-ACCESS.md), [static preview safeguards](OWNER-STATIC-PREVIEW.md).
- No student-data collection, connected classroom or billing activation was performed, and no PR was merged. The existing private requester and its shared D1 admission ledger remain separate from these operations.

The primary root test run completed with **1,638 total: 1,633 passed, zero failed and five Windows link-test skips**. A subsequent free-tier wording update passed 18 targeted UI, policy, gateway and storage checks. Syntax checks covered 84 application/server modules; the ordinary public build produced 43 approved assets. Review-build browser checks covered K–1 retry, completion, reset and a fresh remount; a grades 2–3 counter returning 5; and a grades 4–6 least-access choice. These checks concern the review build, not publication of the new activities. They do not replace Linux link tests, production checks, school review or an independent security review.

### Operational limits and rollback

DMARC monitoring does not stop all spoofing, a DNS DKIM key does not prove signing, an IP rule can affect unrelated people behind a shared address, and an Access login redirect does not establish who a later policy will permit. No live AI load test or school-capacity acceptance test was performed. Existing shared budgets reduce inference starts but do not cap all hosting, storage, authentication or unrelated account usage. None of these changes establishes legal compliance or a security warranty.

Before any full static owner upload, recheck the Access Allow policy and all preview-host coverage, including more-specific applications and alternate domains. After upload, check the newly assigned hash as well as the branch alias and direct files. A prior hash canary and a build-time guard cannot prevent a later account-setting change. Keep actual policy exports and rollback values in approved private operator records.

If a rollback is needed, scope it to the changed setting:

- For mail, retain the exact prior/current DMARC state privately and restore only the approved prior state if monitoring must be rolled back. No DKIM signing/key change was made and no DKIM rollback is required. Do not substitute enforcement for the current monitoring policy without a separate delivery review.
- For redirects, disable or restore only the reviewed production-alias entries/rule if the destination or scope is wrong. Preserve the canonical site's DNS and the independent preview Access protection; retest both schemes, paths and queries.
- For rate limiting, restore the recorded prior rate configuration if required while preserving the custom leaked-credential Block protection until its replacement is verified. Do not reset, remove or weaken the D1 budget ledger as a workaround.
- For Access, do not broaden the Allow policy, add Bypass/Everyone, or remove protection while any full preview deployment remains reachable. First replace/remove the relevant full deployments under a reviewed deployment-ID plan and verify the bytes are no longer served. Keep a failed or unavailable guard closed.
- For notifications, change only the two new basic alerts if needed. Preserve existing budget or unrelated alerts, and do not substitute a paid or advanced certificate alert for the unavailable Universal SSL option.

No rollback was executed as part of this record.
