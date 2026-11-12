# Security and student privacy review — November 11, 2026

This review covers the public site source, terminal controller and Docker Cloud adapter, private deployment templates, requester Worker, and disabled adult membership service. Seven other repositories received a bounded inventory and selected-source review. That inventory is not a complete audit of every repository or deployed release. Tests use fictional data. No production settings, school agreements, credentials or feature approvals were changed.

## Changes in this pull request

- Explain real-machine processing before Start and in the privacy/district pages. Browser simulation work and remote Linux input/files have different data flows. Replace immediate-erasure promises with deletion-request behavior and failure limits.
- Enforce teacher pause in the desktop relay, limit streamed file reads before buffering their complete body, and log bounded error codes without raw provider messages.
- Retain failed machine cleanup for retry, block new allocations while cleanup is unresolved, and report unavailable health until it recovers. This reduces orphan risk; it does not prove destruction of provider logs or recovery copies.
- Recheck membership session expiry after entitlement and private resource loading; cancel responses that cannot be delivered to a valid, active request.
- Apply the public-lab boundary inside the private requester Worker as well as the public gateway, before access to AI and budget bindings.

Classroom records, general free-text cloud chat, improvement summaries and adult memberships retain their existing source release gates. Optional counts, telemetry and completion codes retain their committed off settings. A learner toggle, alias, no-login interface or successful test is not legal approval.

## Evidence and limits

| Surface | What was reviewed | What remains unverified |
| --- | --- | --- |
| GitHub main rules | Active ruleset requires PRs, resolved threads, CodeQL, syntax/privacy tests and terminal tests; prohibits deletion and non-fast-forward changes | Approving-review count is zero; the membership test job is not a required status. Account MFA, secret scanning and legacy settings were not verified |
| Website | Current main source, build routes/headers, pre-start notice, local tests | Live requests were blocked by this review environment's outbound policy; deployed headers, cache behavior and current content were not verified |
| Cloudflare | Repository Pages/gateway/Worker configuration | API access was denied by the token's location restriction; zone, TLS, WAF, Access, cache, logging and tunnel settings need an authorized-location check |
| DigitalOcean | Read-only droplet metadata and repository deployment intent | Firewall and several service reads lacked permission; host hardening, ingress including IPv6, workloads and restore procedures were not verified |
| Docker | Controller/adapter lifecycle, limits, network-policy requests and fake-provider tests | Account dashboard, deployed image, actual egress, host/runtime state, current credential scope and provider deletion/retention were not verified |
| Legal/operations | Current official references and documented release boundaries | Signed agreements, consent/authorization, accepted provider terms, staff processes, actual retention and rights/incident execution were not established |

A denied read is not evidence that a protection is absent. Preserve source-IP restrictions and least-privilege tokens; perform remaining checks from an authorized context. Keep account details, raw logs, credentials and private repository findings out of this public report.

## Operator checks before school use or a broader release

1. Verify the deployed commit, canonical and alternate hosts, TLS, private/no-store responses, and absence of sensitive request-body/query logging. Confirm that both the controller origin and same-origin gateway enforce the intended access model; an Origin check is not authentication for nonbrowser callers.
2. Verify firewall/host ingress for IPv4 and IPv6, SSH restrictions, no public Docker/controller ports, account MFA, least privilege, patches, and recovery. Confirm which infrastructure is still needed before retiring anything.
3. Replace the unmaintained desktop base image with a maintained, tested image and a reviewed digest. Scan the actual image; deny-all network configuration does not establish that an obsolete image is safe. Verify each learner's isolation, nonadministrator role, quotas, timeout, failed-delete retry, and orphan reconciliation after controller restart. Provider orphan reconciliation across restarts remains open.
4. Review Cloudflare, DigitalOcean and Docker processor terms, subprocessors, locations, necessary security logs, recovery copies and retention. Establish a tested deletion/return and rights process. Browser clearing and a successful container-delete response do not erase every provider copy.
5. Establish the actual ages/jurisdictions, data inventory, operator and privacy/incident contacts, school authority and required agreements before real records are processed. Arbitrary terminal input can contain personal data despite reminders. Keep sample files fictional and actual school records out of these practice machines until that review is complete.
6. Keep optional telemetry off until its authority, provider processing and deletion evidence are approved. The prepared telemetry receiver is configuration-gated; changing hosting flags can activate it. Record approval evidence rather than treating a flag as proof. Separate required service processing from optional analytics or secondary use.
7. Verify exposed-credential revocation, account access and all required CI checks. Add the membership job to required checks and establish an independent-review workflow where an authorized reviewer is available. Re-run acceptance tests after deployment with fictional data. No merge or deployment is part of this PR.

## Current legal reference points

- **New York Education Law §2-d / Part 121:** covered school data can require the agency agreement, signed Parents' Bill of Rights, security/privacy plan and contract supplement, with purpose/access limits, encryption, training and incident duties. The contractor's incident notice is expedient and without unreasonable delay, with a seven-calendar-day outside limit under Part 121.10; a contract can be shorter. NIST CSF 2.0 replaced the older reference in 2026. [Statute](https://www.nysenate.gov/legislation/laws/EDN/2-D), [NYSED guidance](https://www.nysed.gov/data-privacy-security/frequently-asked-questions-dpos), [2026 adopted regulations](https://www.counsel.nysed.gov/rules/2026-02).
- **FERPA:** the school must establish consent or an applicable disclosure exception. Outsourced school-official processing requires school direct control and use/redisclosure limits. Aliases and indirect identifiers can remain protected. [Department of Education](https://studentprivacy.ed.gov/ferpa).
- **COPPA:** the amended rule's general compliance deadline was April 22, 2026. Review notices, valid parental consent or applicable school authorization/exception, written security and retention programs, deletion, and provider assurances. A child pressing Start is not parental consent. [Final rule](https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm), [FTC school guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).
- **New York Child Data Protection Act:** personal data can be linkable to a device; transmission is processing. Necessary processing for a requested service and optional secondary use require different analysis. Where informed consent is needed for ages 13–17, a per-visit checkbox alone does not meet all requirements. Covered processor use needs binding written terms. [Permitted processing](https://www.nysenate.gov/legislation/laws/GBS/899-FF), [processor obligations](https://www.nysenate.gov/legislation/laws/GBS/899-GG), [AG guidance](https://ag.ny.gov/child-data-protection-act-guidance).
- **Other obligations:** assess NY SHIELD safeguards/breach duties, PPRA before sensitive surveys, IDEA confidentiality before disability records, and other applicable state/local laws and contracts for the actual use. This review does not establish all-US or worldwide compliance. [NY safeguards](https://www.nysenate.gov/legislation/laws/GBS/899-BB), [PPRA](https://studentprivacy.ed.gov/faq/what-protection-pupil-rights-amendment-ppra).

These are technical changes and review requirements, not a compliance certification or a legal opinion. The existing [privacy release requirements](PRIVACY-RELEASE-GATE.md) continue to apply.
