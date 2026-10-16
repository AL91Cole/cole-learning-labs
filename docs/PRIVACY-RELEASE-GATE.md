# Student and educator privacy release requirements

Owner: Alan Cole. Reviewed for source changes on October 16, 2026. **Status: not approved for real classroom-record processing.** This document records release requirements and open work; it is not a legal opinion, certification, signed school agreement, or completed security program.

## Standing product rule

Student and educator information may be processed only for documented, necessary educational and security purposes. No sale, rental, advertising use, behavioral profiling, AI-model training, or unrelated secondary use is permitted. Apply data minimization to metadata and aliases as well as obvious identifiers. School approval, notices, valid authority, and enforceable provider restrictions must precede collection, not follow enrollment.

Public independent practice keeps lab records in the browser and exports only when the learner chooses. The fictional demo is memory-only. Never place real school records, credentials, or confidential incidents in public GitHub source, static assets, demonstrations, previews, or public issue reports. Browser-local records still need shared-device protections and school review; local storage is not an anonymity or confidentiality guarantee.

## Enforced production boundary

The actual Cloudflare `onRequest` entry point has a hardcoded closed release gate. It returns `503 classroom_privacy_review_required` before accessing request context, service configuration, D1, or identity-key retrieval. Environment variables cannot approve the release. Existing authentication, ownership, version, and submission integration tests explicitly call the separate prepared handler; passing those tests does not activate production or establish legal compliance.

Changing this gate requires a reviewed source release after the evidence below is complete. Do not treat a teacher email, class code, user checkbox, hosting flag, or this document as legal authorization. Retain the gate during previews. Any change to data fields, purpose, providers, jurisdictions, retention, identity, surveillance, or live AI must reopen the review before use.

## Required evidence before a classroom release

| Area | Evidence and unresolved work |
| --- | --- |
| Scope and accountable operator | Identify the operator/legal entity, privacy and incident contacts, intended schools/countries/ages, authorized school signatories, and applicable rules. Do not publish a private contact detail without authorization. No authorized privacy contact or completed legal review has been recorded for this release. |
| Data inventory and purpose | Document each field and metadata flow, recipients, educational necessity, access, storage/backup location, retention, transfer arrangements, and deletion. Treat aliases plus assignments, notes, grades, and teacher identity as potentially identifying. Do not collect teacher/principal evaluation records. |
| COPPA | Assess the intended under-13 audience and actual collection, including service-provider identifiers. Complete required notices, an appropriate consent/authorization mechanism and records, rights processes, written security/retention programs, and necessary provider assurances. Do not assume browser-local work or school use creates a blanket exemption. |
| New York §2-d / Part 121 | Where covered school data is involved, obtain the agency's required written agreement, signed Parents' Bill of Rights, accepted security/privacy plan, and contract-specific supplemental disclosures. Establish approved subcontractors, limited purposes/access, safeguards, encryption in transit/at rest, staff training, record rights, and disposition. A free service or click-wrap does not avoid the review. |
| FERPA and other US requirements | Establish the lawful basis for school disclosure and any school-official direct-control/redisclosure conditions; support the agency's rights processes. Review PPRA, disability confidentiality, state/local privacy and breach rules, and contractual restrictions where relevant to the intended features and records. Do not conduct sensitive surveys or import special-education, health, discipline, or evaluation records into these labs. |
| International use | Assess applicable regimes before approving classroom processing in a jurisdiction, including GDPR/UK requirements where relevant. Resolve legal basis, child-specific requirements, transparency, rights, controller/processor roles, contracts and transfers. Public availability is not worldwide processing approval. No blanket global assessment is complete. |
| Security operations | Establish an accountable security lead, documented risk assessment/program, operator MFA/least privilege, provider due diligence, incident handling, staff training, patching, and periodic review. Verify actual deployment, access isolation, exports, and failure behavior with fictional accounts. Tests and HTTPS are evidence of controls, not certification. |
| Retention and deletion | Replace experimental defaults with necessary purpose/contract-specific deadlines. Implement and verify scheduled purging, early termination/return, rights requests, backup/recovery expiry, and deletion evidence. A 90-day logical expiry plus later-request cleanup does not establish timely destruction. Do not enable the proposed database before these gaps are resolved. |
| Rights and complaints | Publish usable, authorized privacy/incident contacts and required operator details; provide verified school/parent/eligible-student and educator request procedures for access, correction, deletion, and complaints. Avoid collecting sensitive evidence through public messages. |
| Approval record and change control | Record the actual review findings, scope, agreements, accepted residual risks, approvers, dates, and review triggers. Resolve blocking findings. Only then consider a code release, appropriate configuration, and production acceptance tests. Never mark a review complete merely because settings are present. |

## Current New York reference points

Education Law §2-d addresses covered student records and confidential teacher/principal APPR information; this site's broader privacy commitments also cover ordinary educator account information. School-specific disclosures and agreements must describe the actual service. NYSED does not certify this vendor or software. See [the statute](https://www.nysenate.gov/legislation/laws/EDN/2-D), [NYSED vendor/DPO FAQs](https://www.nysed.gov/data-privacy-security/frequently-asked-questions-dpos), and [Parents' Bill of Rights guidance](https://www.nysed.gov/sites/default/files/programs/data-privacy-security/final-pbor-guidance-for-schools-on-2.24.25.pdf).

The NIST reference in Part 121 changed to **CSF 2.0** effective February 25, 2026, with agency policy alignment due September 1, 2026. Do not use old FAQ language about CSF 1.1 as the current requirement. This project has not completed a CSF 2.0 assessment. Sources: [official adoption notice](https://dos.ny.gov/system/files/documents/2026/02/022526.pdf), [adopted proposal text](https://dos.ny.gov/system/files/documents/2025/10/102225.pdf).

A vendor's incident runbook must notify the educational agency expediently, without unreasonable delay, and within seven calendar days of discovery under Part 121.10, or sooner if another applicable obligation requires it. The outer limit is not permission to wait. Preserve evidence, contain access, cooperate with the agency, and support required notices. The agency's reporting and affected-person duties are separate. Source: [NYSED Part 121, §121.10](https://www.counsel.nysed.gov/sites/counsel/files/rulesandregs/part-121-terms.pdf). Unauthorized accessibility can require incident treatment even without proven theft; see [NYSED incident guidance](https://www.nysed.gov/data-privacy-security/educational-agencies-report-data-incident).

## Federal primary references

- [Current COPPA Rule, 16 CFR Part 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312): use the current rule, including notices, consent, rights, security and retention requirements. Older FAQs or proposals are not a substitute for the operative rule.
- [FTC COPPA guidance, including schools](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions): school authorization is limited to the educational context and does not eliminate operator responsibilities.
- [FERPA](https://studentprivacy.ed.gov/ferpa) and [school-official outsourcing conditions](https://studentprivacy.ed.gov/faq/can-schools-disclose-education-records-community-based-organizations-performing-outsourced): establish applicable school control and permitted use/disclosure before receiving records.
- [PPRA overview](https://studentprivacy.ed.gov/faq/what-protection-pupil-rights-amendment-ppra): review before adding surveys or collecting sensitive categories.

## Honest public assurances

Explain what is collected, why, who can receive it, and how long it is kept. The site uses Cloudflare for delivery/security and ordinary request metadata is processed there. Cloudflare and school-managed systems are not invisible to privacy review. Verify provider terms and retention rather than promising they collect nothing. No online operator can truthfully promise that compromise is impossible or that every law everywhere is satisfied forever. If an obligation cannot be demonstrated, keep the affected data feature unavailable and resolve it before release.
