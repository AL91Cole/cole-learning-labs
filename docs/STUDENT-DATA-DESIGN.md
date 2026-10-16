# Student data, aliases, and school-controlled submissions

Owner: Alan Cole. Design reviewed October 16, 2026. **Connected classroom processing is not approved and remains disabled. The local encrypted-report tool is included for fictional-data evaluation; school acceptance and independent review remain open.** This is a technical design and operating boundary, not a compliance certification, signed school agreement, or independent cryptographic assessment.

## The identity boundary

Keep student names, email addresses, school student IDs, Google user IDs, rosters, and the identity-to-alias mapping in the school's approved systems. Cole Learning Labs does not need those fields to provide public simulations. Use a randomly assigned neutral alias such as `Learner-AB12-CD34`; do not derive an alias from a name, initials, email, date of birth, or school ID.

An alias is a pseudonym, not encryption or proof of anonymity. Lab responses, grades, timestamps, context, and a code linked to a school roster can still be protected student information. Free text can contain identifiers even when an application has no name field. Minimize that text, instruct users to omit personal details, and do not represent pattern checks as a complete PII detector. Treat identifiable or linkable work as protected records throughout its lifecycle.

The current production classroom API returns `503 classroom_privacy_review_required` before reading request context, configuration, D1, or identity-key services. No student database, Google Classroom OAuth connection, roster sync, grade passback, or approved teacher workspace is provisioned. Preserve that boundary until the evidence in [the privacy release gate](PRIVACY-RELEASE-GATE.md) is complete.

## Data inventory and recipients

| Flow | Necessary information | Storage and recipients | Boundary |
| --- | --- | --- | --- |
| Public page delivery | Requested public URL and ordinary network/security metadata, including information handled by the delivery provider | Cloudflare and the user's network or managed school device can process connection metadata under their respective controls | No student identity in URLs, public assets, GitHub issues, analytics, or support screenshots; hosting is not a claim of zero metadata processing |
| Independent practice | Fictional simulation state and the learner's current responses | Browser memory by default; explicit optional device saving uses that browser's local storage | No account or server submission; shared devices still need an approved local-data policy, clear-work controls, and device security |
| Learner-selected ordinary export | The report content the learner chooses to export | Local clipboard or downloaded file; subsequent recipients are selected by the user | Ordinary exports are plaintext and may be visible to anyone with device/file access; omit personal details |
| Local encrypted-report tool, evaluation release | Report content and neutral alias inside an encrypted payload; a format/version, encryption parameters, and recipient-key reference outside it | Browser memory and learner-selected local `.cllreport` download; no application upload endpoint | No names, email, school IDs, aliases, or report text in the outer envelope or generated filename; network/file metadata is not concealed |
| Manual Google Classroom submission | The encrypted file, with the student's existing district Classroom identity and assignment relationship handled by Google | The district's Google Classroom/Drive environment and its authorized recipients | This site does not receive a roster, Google credentials, tokens, grades, or submission IDs; Google/district administrators may retain authorized access to identity and metadata |
| Prepared connected backend, disabled | Teacher account email, class ownership/code, neutral alias, opaque application membership/session IDs, work, grades, feedback, and timestamps | No production storage is provisioned; the prepared design uses D1 only after a future approved release | Opaque application IDs are not school student IDs, but remain protected linkable records; no activation based on configuration alone |

Do not send real student records to GitHub, Squarespace, demonstrations, previews, public issue trackers, screenshots, analytics, or a live AI provider. Squarespace is the domain registrar, GitHub holds public source, and Cloudflare delivers the site; those roles are different from permission to receive school records.

## A Google Classroom workflow without roster access

1. A teacher shares a **public lab URL** in the school's Classroom assignment. A normal link to `https://classroom.google.com/share?url={encoded-public-lab-url}` may help create that post. It sends the selected public URL to Google when the user opens the link; it does not import a roster or connect this application to the Classroom API. Never put a class code, alias, grade, student ID, key, report text, or other confidential value in the shared URL.
2. Students complete the simulation without signing into Google through Cole Learning Labs. Independent practice begins in memory. Device saving and ordinary exports require an explicit learner action.
3. Where the school approves the local encrypted-report process, the teacher creates a reporting key using the tool's visible user interface, keeps the private `.cllkey` file and passphrase private, and distributes only the public `.cllpub` file through an approved school channel. Students verify that they received the teacher's intended public key. The school must define key distribution, fingerprint verification, backup, recovery, authorized recipients, and retention before real use.
4. A student uses a neutral alias and the approved public key to encrypt the report locally, then attaches the resulting `.cllreport` file directly to the district's Classroom assignment. The site does not upload that file or receive the student's Google identity.
5. An authorized teacher downloads the encrypted submission and opens it locally with the matching private key and passphrase. The student's identity is viewed in Classroom; any mapping belongs in a district-approved system. Review and grade in Classroom. This workflow does not automatically submit work, sync a roster, or return grades through an API.

Google supports the [ordinary Classroom share link](https://developers.google.com/workspace/classroom/guides/sharebutton). Its [integration-path guide](https://developers.google.com/workspace/classroom/guides/integration-paths/integration-paths) distinguishes sharing content from API and add-on integrations. Do not describe a share link as OAuth integration or roster synchronization.

## Local encryption design and its limits

The pending local report format uses a fresh AES-256-GCM key and random IV for each report. That report key is wrapped using the recipient's RSA-OAEP key with SHA-256 and a 3072-bit modulus. The alias and all report content are inside the encrypted payload. The private key is exported only as a passphrase-encrypted `.cllkey` file using PBKDF2-HMAC-SHA-256 with 600,000 iterations, a fresh salt, and AES-GCM. Public keys use `.cllpub`. No production keys are pre-created, embedded in source, or provisioned by the operator.

With a correctly generated and verified public key, the encrypted file is intended to be readable by holders of the corresponding private key and passphrase. A strong, unique passphrase and district-approved backup are necessary. A stolen unlocked device, malicious extension, compromised browser, incorrect public key, exposed passphrase, or maliciously changed application can expose work. The application cannot recover a forgotten passphrase or lost private key, and deleting a local file does not guarantee deletion of its backups or copies.

Private keys and passphrases must never be uploaded to a class assignment, repository, website setting, support report, or third-party chat. Distribute only the public key. The school must decide whether additional authorized teachers or recovery custodians can hold a key; holding a key grants the ability to decrypt matching reports. Replacing a public key does not revoke access to old files or copies already decrypted.

This design is **not** a guarantee that only one human teacher can ever see information. Google and district-authorized personnel can have permitted access to Classroom identity and metadata. Decrypted reports are readable on the teacher's endpoint. GitHub/deployment administrators and the hosting provider participate in delivering the JavaScript; changing that code could change future browser behavior. The design therefore depends on trustworthy endpoints, reviewed deployments, school-approved key custody, and continuing operational controls. It has not received an independent cryptographic audit or an end-to-end security certification.

The local tool is optional. A school may require its existing approved submission and encryption process instead. Do not enable central collection to make a manual workflow more convenient.

## Access model

| Actor | Intended access |
| --- | --- |
| Public visitor | Public lessons and fictional simulations; no student submissions, roster, identity map, or private reporting key |
| Learner | Their current local work and files; no peer work or roster access |
| Authorized teacher | The school's permitted Classroom identity/submissions and reports encrypted to a key they are authorized to hold; class-scoped records only in any future approved backend |
| Other educators, support, or site maintainers | No routine access to student identities, reporting private keys, or plaintext reports; no public reporting URLs or administrator identity-reveal feature |
| School administrators, guardians, eligible students, and legal recipients | Rights and authorized access depend on school policy, applicable law, contracts, and the school system's permissions; do not promise to override those obligations |

Hiding a field in a page is not authorization. Any future backend must check authenticated role, class ownership, and student session membership on every relevant server request. Encryption in transit or at rest with provider-held keys does not itself prevent an authorized service operator from decrypting data.

## Direct integration requires a separate release

Removing an email scope is not enough to avoid student records: Google's `StudentSubmission` resource includes a stable student `userId`, submission/course IDs, work, grades, and history actor IDs. Roster resources contain user profiles. An API integration must document those flows and receive school and applicable Google approval before activation. See [the submission schema](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions), [the student resource](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.students), and [Google's Classroom scope guidance](https://developers.google.com/workspace/classroom/guides/auth).

Use the smallest scopes necessary for an approved feature, request them in context, and avoid domain-wide delegation by default. Public applications requesting covered Google scopes need the applicable OAuth verification and school administrator access approval. Credentials and tokens must never enter static assets, browser local storage, logs, or the repository. Any approved server token store needs protected secrets, encryption, validated OAuth state, revocation/deletion handling, and independent access checks. Follow [Google's OAuth security guidance](https://developers.google.com/identity/protocols/oauth2/resources/best-practices) and [education app access-control guidance](https://developers.google.com/workspace/classroom/best-practices/access-control-enhancements).

No first teacher email or district authorization is assumed. Before a direct integration, identify the accountable operator and participating district, approved teachers and administrators, authorized privacy/incident contacts, agreements, retention/deletion process, permitted scopes/features, and verified OAuth project. Keep the production lock in place while those requirements are unresolved.

## Operator and domain security

Protect GitHub, Cloudflare, Squarespace, and recovery email accounts with strong phishing-resistant authentication where available, separate authorized accounts, least privilege, and protected recovery methods. Review repository rules, automation permissions, app installations, domain lock, DNSSEC, TLS, deployment access, and provider changes. Record who is responsible for access removal and incident response. These are operator controls; they do not authorize student-data processing or give the operator permission to collect a student's email.

Do not create new credentials, assert account MFA is verified, publish a privacy contact, accept school terms, or activate a data service merely because this document recommends it. Changes require evidence and the appropriate accountable person's action.

## Legal and operating references

Apply the actual laws and contracts for the intended schools, ages, jurisdictions, and data flows; public availability does not establish global compliance. Keep the detailed acceptance evidence in [PRIVACY-RELEASE-GATE.md](PRIVACY-RELEASE-GATE.md).

- [U.S. Department of Education: education-record PII](https://studentprivacy.ed.gov/content/personally-identifiable-information-education-records) includes direct and indirect identifiers. [Its de-identification guidance](https://studentprivacy.ed.gov/faq/what-constitutes-de-identified-records-and-information) requires removing information that permits identification alone or in combination; an alias is not an automatic exemption.
- [Current COPPA security requirements, 16 CFR 312.8](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.8) include a written security program, risk assessment, testing, review, and provider assurances. [Retention/deletion requirements, 16 CFR 312.10](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.10) require purpose-limited retention and a published policy. These are operating obligations, not settings that encryption satisfies by itself.
- [FTC school guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) limits school authorization to the educational context and does not eliminate the operator's obligations.
- [NYSED vendor/DPO guidance](https://www.nysed.gov/data-privacy-security/frequently-asked-questions-dpos) addresses written agreements and encryption in transit and at rest under Education Law §2-d/Part 121. Review the current requirements, not an outdated CSF 1.1 checklist. No NYSED vendor certification is claimed.
