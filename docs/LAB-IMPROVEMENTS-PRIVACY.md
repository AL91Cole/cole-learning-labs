# Optional aggregate lab-improvement summaries

Owner: Alan Cole. Source review date: October 31, 2026. **Live collection is not approved or enabled.** This records the prepared feature, safeguards and release requirements; it is not a legal opinion or compliance certification.

## Purpose and user choice

The purpose is to find confusing instructions, difficult controls and unreliable checks across authored lab activities. A learner can review fixed choices about whether they finished, needed help, how many attempts they made in broad buckets, and a predefined problem category. These are **self-reported submissions**, not verified results, grades, attendance or unique people.

The feature does not observe or upload work. It does not inspect saved/resumed records, questions, notes, answers, hypotheses, reflections, source code, outputs or action logs. No continuous telemetry, replay, device fingerprint, identifier, background beacon, retry queue or automatic submission is added. Declining, ignoring or closing the feature does not change lab access, evidence, progress, grades or export options.

Reviewing a summary is local. In a separately approved release, sending would require a review of its exact fixed fields and a separate affirmative choice. Changing a choice invalidates the review and consent. Leaving the activity, clearing local work, resetting the lab or leaving the document cancels pending requests and clears the choice. Information already received and merged into totals cannot be recalled by canceling a request.

## Data flow

| Field | Source and allowed content | Retained by the application |
| --- | --- | --- |
| `version` | Fixed schema version `1` | Used for validation only |
| `activity` | Authored activity code from the fixed catalogue | Aggregate counter key; never a raw URL or query |
| `outcome` | Finished, needed help, did not finish, or exploring | Independent outcome count |
| `attempts` | One, two or three, four or more, or not applicable | Independent attempt-bucket count |
| `issue` | None, instructions, controls, test result, display or other | Independent problem-category count; no explanation field |
| Release and reporting month | Fixed deployment release and server-assigned month | Aggregate keys; never client time |
| Abuse-control counters | Global minute/day submission totals | Short-lived aggregate budget counters; no IP or person key |

Only the exact schema is accepted. Extra fields are rejected rather than silently stripped. The receiver bounds the JSON stream, validates the activity and enum values, requires the fixed HTTPS origin, and rejects credentials. Client requests omit cookies and referrers. The receiver neither logs requests nor stores a submitted summary/event row. One atomic database statement admits an anonymous global budget and adds independent marginal counts; the outcome, attempts and issue are not stored as a joined behavioral profile.

The feature uses a separate `LAB_IMPROVEMENTS` database binding. It has no classroom database, roster, identity service, Google Classroom, AI model or advertising integration. Static public builds exclude operator tools, database exports and the receiver's configuration materials.

## Anonymity and integrity limits

Application storage contains aggregate counts without an individual history or identifier. **That does not establish anonymous network transport.** Cloudflare delivers the site and would receive the sharing request and ordinary connection/security information, which can include an IP address. School-managed devices, extensions and networks can separately observe activity. Review the actual provider terms, logs, retention, access and downstream processing before enabling collection.

No public read endpoint or live dashboard is provided. The operator's local reporting tool uses completed reporting periods and suppresses/rounds small counts. Thresholds count submissions, not distinct individuals; they are not proof of k-anonymity. Repeated submissions and fabricated reports remain possible. Origin checks and global quotas reduce specific abuse, but do not authenticate a learner or make the counts suitable for grades or high-stakes decisions.

Once a submission has been merged into totals, the application cannot find or delete one person's contribution because no link is retained. Explain this before submission. Provider-held information and legally required access, deletion, complaints and incident processes remain separate responsibilities. Do not use the aggregate design as an excuse to ignore those obligations.

## Retention and access

Retain only the current reporting month and the preceding two calendar months. Delete older aggregate periods and expired global quota rows on collection and with the prepared daily cleanup job. There are no individual-event records to retain. Before activation, provision the scheduler, verify it actually runs, and test the removal of expired rows. Failures in the collection path must not cause a background upload queue or change lab behavior.

Database recovery copies and downloaded operator exports need their own deletion controls. D1 recovery windows depend on plan; verify the actual account configuration rather than promising immediate physical erasure. Limit database/Cloudflare/operator access, protect the accounts, and delete exports on the approved purpose-specific schedule. Never commit a database or export to this public repository.

## Required release evidence

Keep both the client sharing default and the production receiver's source gate closed until all applicable evidence is documented. An environment flag, learner checkbox, teacher email or this document cannot supply legal authority.

1. Record the operator/contact, audience, ages/jurisdictions, purpose, complete data inventory including provider metadata, recipients and necessary processing. Do not collect an age or identity just to operate these counters.
2. Obtain the district's determination of whether covered PII is received. Where NYS Education Law §2-d and 8 NYCRR Part 121 apply, complete the required agreement, security/privacy plan, Parents' Bill of Rights and supplemental disclosures, provider restrictions and safeguards. NYSED does not certify vendors as compliant.
3. Determine the COPPA authority or applicable exception using the amended rule. School authority is limited to the educational context for the school's benefit and does not automatically authorize a separate product-improvement use. A child's Share choice is not verified parental or school authorization. Give the authorized school/parent the required notices and rights process.
4. Where COPPA applies, complete the appropriate written information-security program, accountable coordinator, risk assessment/evaluation, safeguard testing and provider assurances. Publish the required purpose, business need and deletion timeframe. Keep retention limited to the actual need.
5. Review New York's Child Data Protection Act and other applicable protections, including teens. Do not assume research/development qualifies as an internal-business-operations exception. If personal-data consent is the relied-on basis, implement the required consent/revocation, signal and processor controls; the per-summary product choice alone is insufficient. Address FERPA/PPRA and other obligations with the district where applicable.
6. Verify provider configuration, logging, contracts, jurisdiction, storage/recovery periods, access, incident response, retention cleanup and owner-report handling. Test failure modes with fictional data, then obtain the required independent privacy/security and school review. Record who approved what, when and for which deployment.
7. Complete the operator’s insurance and legal risk review, including applicable coverage, contractual duties and incident response responsibilities. Do not enable collection until the owner confirms these requirements are handled. This is an additional owner release condition, not a declaration that insurance establishes legal compliance.
8. Approve a source release for this diagnostics flow separately from the classroom-records gate. Update public notices to match the reviewed live behavior before enabling it. A schema, purpose, provider, audience or retention change reopens the review.

## Official references

- [NYSED DPO FAQs](https://www.nysed.gov/data-privacy-security/frequently-asked-questions-dpos) and [enforcement guidance](https://www.nysed.gov/memo/data-privacy-security/nysed-enforcement-state-student-privacy-law).
- [Current COPPA definitions](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.2), [information-security requirements](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.8) and [retention requirements](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.10).
- [FTC final amendments](https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-312-coppa-final-rule-amendments) and [school guidance in Section N](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), read with the amended rule.
- [NYAG child-data guidance](https://ag.ny.gov/child-data-protection-act-guidance).
- [Cloudflare D1 limits/recovery windows](https://developers.cloudflare.com/d1/platform/limits/) and [Workers logging](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).
