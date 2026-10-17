# Classroom workflows and the optional connected service

The repository includes a classroom API and a teacher/student portal. This is prepared functionality, **not a production-approved or activated student-record service**. The deployed entry point has a hard release lock. No D1 database, Access application, or first approved teacher email was provisioned for this release. Alan Cole's CTE teaching remains a future goal.

The independent public labs begin in browser memory; optional device saving and ordinary local exports require an explicit learner action. Real classroom joining, server drafts, submissions, and grades are unavailable in this release. In a future approved release, students would explicitly join an enabled classroom before that workflow sends assignment work to its server. A fictional portal demo is separate from real class data. Do not enter real student records into a demonstration.

Release `20261016-pathways6` (version `2.6.0`) offers 27 independent labs across five pathways. Conversational interview replies use on-device authored case facts and recent question context. The optional live AI response mode is visible but disabled and unconnected; there is no provider request or API key. Future live processing needs a separately reviewed implementation, approved provider/data terms, authenticated teacher controls and applicable school/privacy approval. It cannot be enabled by a student mode choice, teacher email or environment flag, and it does not change this classroom service's hardcoded production lock.

## Use Google Classroom without importing a roster

Teachers can post the public lab link in their existing school Classroom assignment. A normal Google Classroom share link can help create that post; it shares only the public lab URL and does not connect this site to the Classroom API. Do not add aliases, class codes, keys, grades, reports, Google user IDs, or school student IDs to URLs. Students complete the local lab, then attach their chosen report directly to the district's assignment. Teachers use the student's identity and grading controls within Classroom. No Google roster, student email, OAuth token, or grade passback is received by this site through this workflow.

An optional browser-only tool at `/secure-reports.html` is **available for fictional-data evaluation**. It lets a teacher create a passphrase-protected private reporting key (`.cllkey`) and a public key (`.cllpub`), and let students encrypt report content and a neutral alias into a local `.cllreport` file before manual submission. Nothing is uploaded by the tool. Do not upload a private key or passphrase to Classroom, GitHub, a website setting, or a support request. Share only the public key through an approved school channel and verify its intended recipient.

Real use of encrypted reports needs school approval for this workflow, key custody, verification, backup/recovery, recipients, and retention. The school and Google still control Classroom identity and metadata; ciphertext does not hide those relationships from them. Decrypted reports are visible on the teacher's device. This tool is not an audited guarantee of teacher-exclusive access and does not activate the central service. See [the student-data design](STUDENT-DATA-DESIGN.md) for the data inventory, cryptographic design, limits, and operating requirements, and [Google's supported sharing flow](https://developers.google.com/workspace/classroom/guides/sharebutton).

## Production privacy release lock

Cloudflare invokes only `onRequest`. Its hardcoded `CLASSROOM_PRIVACY_REVIEW_APPROVED = false` release lock returns HTTP 503 with `enabled: false` and `error: classroom_privacy_review_required` **before reading configuration or contacting D1 or signing-key services**. Environment flags, request values, and runtime options cannot lift this lock, even if all future settings are present.

Enabling production classrooms requires a reviewed code-release change after applicable privacy/legal requirements, district agreements, and operational requirements have been satisfied and documented. The current code and tests do not establish compliance or approval. Do not bypass the production wrapper or map the prepared handler to another route.

The separately exported `handleClassroomRequest` lets integration tests exercise the prepared backend explicitly. It is not a Cloudflare route entry point. The future configuration check below remains a second fail-closed layer: missing or invalid settings return `classroom_unconfigured` without database access. Configuration alone never approves this production release.

| Future backend setting | Required value |
| --- | --- |
| `CLASSROOM_ENABLED` | Exactly `true`, only after a reviewed release removes the hard lock; otherwise leave unset or `false` |
| `CLASSROOM_DB` | A D1 binding with the supplied migration applied |
| `CF_ACCESS_TEAM_DOMAIN` | The exact team hostname, such as `your-team.cloudflareaccess.com`; no scheme or path |
| `CF_ACCESS_AUD` | The Access application's audience tag |
| `TEACHER_EMAILS` | A comma-separated, explicit list of approved teacher email addresses; no automatic first-user enrollment |

Keep production bindings and configuration out of preview deployments. Use isolated fictional-data testing for the prepared backend. Never bind a public preview to production student records by convenience or route around the release lock.

## School review before activation

Have the school or district approve the service, hosting/subprocessors, teacher identities, and student-data process before collecting classroom records. Document educational purpose, data fields, permitted uses, parent/student review and correction, export, deletion/retention, incident contacts, and any applicable district/state requirements. Grades and student-linked submissions may be education records. Hosting, HTTPS, a pseudonym, or an Access login does not by itself establish legal compliance.

Under-13 participation needs a COPPA review where applicable. School authorization is limited to the educational context and does not transfer the operator's responsibilities to an individual teacher. Keep advertisements, commercial student profiling, and live AI-model processing out of this classroom workflow. See [U.S. Department of Education educational-service guidance](https://studentprivacy.ed.gov/resources/protecting-student-privacy-while-using-online-educational-services-requirements-and-best), [FERPA school-official requirements](https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa), and [FTC's schools guidance, section N](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

## Requirements for a future reviewed release

The following is a future operational checklist, not authorization to activate this release. Satisfy and document the applicable legal/privacy review, district agreements, operator responsibilities, data handling, and deployment acceptance requirements before approving a code change to the release lock. Preserve an independent off switch afterward.

1. Choose the approved teacher email addresses and record who administers access. No email is preselected in the repository. Enable MFA on operator accounts and use the district-approved identity provider/access policy.
2. Create an approved D1 database. Apply `migrations/0001_classrooms.sql` once through D1's migration workflow or its SQL console. Keep foreign-key enforcement enabled; cascades remove a deleted class's dependent records. Bind it to the production Pages project as `CLASSROOM_DB`. The migration contains structure only, with no teacher or student seed records.
3. Create a Cloudflare Access self-hosted application covering the canonical site's `/teacher` and `/teacher/*` paths **and** `/api/teacher/*`. Use one application/audience for these teacher entry points. Configure its allow policy for the approved identities; do not add a public bypass or a service-token-only teacher policy. Keep public labs, `/classroom.html`, `/api/session`, and `/api/student/*` outside the teacher-only gate so students can join without a teacher account.
4. Set `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and the exact `TEACHER_EMAILS` allowlist. Keep `CLASSROOM_ENABLED` unset or `false` while checking setup. Access policy and the API's independent email allowlist must both permit the teacher.
5. Review the tests below with fictional work. A future code review must explicitly approve changing the release-lock constant; configuration changes alone do not enable production. Only after that approved release should `CLASSROOM_ENABLED=true` and the reviewed bindings/configuration take effect. Confirm the configured hostname uses HTTPS; there is no insecure-cookie fallback for local HTTP.
6. Complete teacher/student isolation and school-device acceptance checks before sharing class codes. Monitor Functions/D1 usage and failure rates. Plan operator support and maintenance; do not promise an unlimited or cost-free classroom backend.

Pages uses `functions/api/[[path]].js` for same-origin API routes and `_routes.json` to invoke Functions only for `/api/*`. Static assets and independent labs do not invoke the classroom Function. Review [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases), [Functions routing](https://developers.cloudflare.com/pages/functions/routing/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Access application setup](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/), and [JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) for the current platform controls.

Teacher signing keys come only from `https://<configured-team>/cdn-cgi/access/certs`. The API verifies the RS256 signature, issuer, audience, expiration, issuance/not-before times, and an exact approved email. It does not trust an email header or a role set by the browser. Signed Access assertions and signed `CF_Authorization` cookies are supported; the UI stores neither teacher secrets nor a password list.

After removing an address from `TEACHER_EMAILS`, redeploy the changed configuration and revoke its Access session as appropriate. Classes remain owned by their original teacher email; changing an email does not transfer ownership automatically. If a browser has an active student session, leave that student session before using the teacher portal in that profile.

## Prepared backend: student identity and retention

These behavior specifications describe the integration-tested backend. Production classroom endpoints remain locked off.

- A class code admits a **new** classroom membership. Joining accepts only `{code}`. The server generates a cryptographically random neutral alias in the form `Learner-XXXX-XXXX`, using a nonconfusable character alphabet, and returns it with the session. A client-supplied alias, name, email, school ID, or other unexpected join field is rejected before enrollment. The alias is a display label, not proof of identity or account recovery; the server distinguishes learners with separate opaque random identifiers. Teachers supervise joining and keep any identity mapping in the district's approved system. This system does not verify school enrollment or a learner's real-world identity.
- Joining issues a 256-bit random, host-only `HttpOnly; Secure; SameSite=Strict` session cookie. Only its SHA-256 hash is stored in D1. JavaScript cannot read the token. Possession of that browser session is the student's access credential; a class code, alias, URL, or student ID alone cannot open another learner's work.
- One browser profile has one active classroom session. Joining a different class requires leaving the current session. Logging out revokes that session. **There is no alias-based account recovery or automatic device transfer.** A lost or logged-out session requires a new membership; it cannot recover old work. Export required reports first. Teachers can still review previously submitted work while the class remains available.
- Each class expires 90 days after creation. Student sessions expire with the class; the deadline is absolute and does not extend on activity. The API denies expired access immediately. Cleanup runs after a later authorized teacher session or teacher API request, throttled to one attempt per minute per database binding in each worker isolate, with concurrent requests sharing a cleanup promise. Anonymous, invalid-authentication, student, and disabled-service requests do not trigger expiry deletion. Deleting a class immediately cascades through its students, sessions, assignments, drafts, and submissions in the application database. Provider backups and recovery windows are separate; this code does not promise a precise physical-erasure deadline. A district requiring scheduled purging must arrange and verify maintenance beyond request-triggered cleanup.
- Locking a class blocks new joins, draft changes, and submissions. Existing session holders can review/export work and read teacher feedback; the teacher can still review or grade. Deletion is permanent in the application's normal workflow. Export any records the school must retain first.

## Stored data and boundaries

D1 would store teacher email/class ownership, class name/code, server-generated alias/membership identifiers, hashed student session tokens, assignments, draft work, immutable submitted work, teacher-entered grades and feedback, and timestamps. No production database is provisioned. Work may contain simulation state, evidence, notes, reflection, and action logs. The prepared API rejects unexpected request fields and unknown/identity/credential fields in structured work. Its allowed work fields are limited to `state`, `evidence`, `questions`, `events`, `plan`, `notes`, `reflection`, `verified`, and `closed`, with per-lab state and bounded event fields. A schema check cannot reliably detect every personal detail in arbitrary free text: do not enter names, email addresses, school IDs, passwords, health/disability information, or confidential school material. A pseudonym plus work can still identify a student; treat those records accordingly.

This backend has not implemented teacher-held report encryption. Provider encryption and authenticated access must not be described as preventing all operator/provider access to plaintext. The optional local encrypted-file workflow is separate from D1 and does not change the production release lock. No Google API client, roster import, student Google login, or automatic grading connection is configured.

The application does not execute uploaded programs or operating-system commands, call a live AI model, or offer file attachments/public student galleries. The three coding labs interpret only a small documented teaching language with bounded source, nesting, loops, steps and output. It cannot access browser globals, files, networks or device controls and is not full JavaScript or Python. Saved code and recorded output can appear in reports; review them for private information just as you review notes. Work remains a bounded JSON object, not a trusted executable for the prepared server. Student-supplied completion/verification is self-reported practice evidence; it is **not an anti-cheat certification**. Teachers manually review and grade a submitted version. Saving a later draft cannot alter that submitted snapshot or its teacher grade.

Cloudflare also handles ordinary request, network, and security metadata. A short-lived join throttle stores a hash derived from the connecting IP/time bucket, not the raw IP; these throttle rows expire after one hour and are removed during later authorized teacher cleanup. This does not prevent Cloudflare or school-managed filtering systems from processing their own network metadata. The API does not add analytics or cross-origin submission endpoints. Do not describe the site as collecting no information or being completely secure.

API responses are private/no-store and do not grant CORS access. All mutations require an exact same-origin `Origin` header, JSON, and compatible fetch-site context. Student work reads, saves, submissions, and active-session logout also assert the expected student identity, so an old tab cannot silently operate on a newly changed cookie session. This assertion is checked against the authenticated session; it is not an authentication credential. The server enforces class ownership and session membership on reads and writes; neither hiding controls nor knowing an object ID grants permission. Class deletion, expiry, SQL parameters, body limits, and optimistic version checks remain enforced regardless of UI controls.

| Server limit | Value |
| --- | --- |
| Active classes per approved teacher | 10 |
| Memberships per class, including lost sessions | 100 |
| Assigned lab choices | The 27 supported lab IDs; one assignment per lab per class |
| Class name / generated alias / assignment title | 100 characters / server-generated `Learner-XXXX-XXXX` / 120 characters |
| Work per saved draft or submitted snapshot | 64 KiB of JSON; bounded nesting, lists, strings, and keys |
| Individual work string / teacher feedback | 16,000 / 4,000 characters |
| Submitted snapshots per learner/assignment | 5, with repeat submission of the same draft idempotent |
| Join throttle | 600 attempts per connecting-IP hash per ten-minute bucket; shared school IPs can share the limit |
| Class/session lifetime | 90 days from class creation |

## JSON API contract

All paths below begin with `/api`. This is the prepared handler's contract; the actual production entry point currently returns 503 `classroom_privacy_review_required` for all paths. For isolated backend tests or a future approved release, use same-origin requests with cookies. Send JSON on every mutation, including `{}` for logout/deletion. A rejected request returns `{ "error": "code", "message": "Readable explanation" }`; disabled/unavailable service responses also include `enabled: false`. Missing configuration returns 503, missing authentication 401, disallowed teacher/CSRF 403, non-owned records 404, and stale/locked/limited changes 409. Request/work size limits return 413; join throttling returns 429.

| Method and path | Request / result |
| --- | --- |
| `GET /session` | `{enabled:true,role:'guest'}`; teacher adds `teacher:{email}`; student adds `student:{id,alias,classId}`, `classroom:{id,name,locked,expiresAt}`, and `assignments` |
| `POST /student/join` | `{code}` only → server-generated neutral alias, student session result, and secure cookie; client identity/alias fields are rejected |
| `POST /student/logout` | `{}` plus `X-Classroom-Student` header for an active student → `{loggedOut:true}`; revoke cookie session |
| `GET /student/work/:assignmentId` | Requires `X-Classroom-Student` header → `{assignment,draft,submissions}` for the matching authenticated student only |
| `PUT /student/work/:assignmentId` | `{expectedStudentId,expectedVersion,work}` → `{draft}`; new work starts at expected version 0 |
| `POST /student/submit` | `{expectedStudentId,assignmentId,expectedVersion}` → `{submission}` snapshot of that saved draft |
| `GET /teacher/classes` | `{classes:[...]}` for the authenticated teacher |
| `POST /teacher/classes` | `{name}` → `{classroom}` with teacher-only join code |
| `GET /teacher/classes/:id` | `{classroom,students,assignments,progress}` summary, including self-reported indicators |
| `PATCH /teacher/classes/:id` | `{locked:boolean}` → `{classroom}` |
| `DELETE /teacher/classes/:id` | `{}` → `{deleted:true}`; cascade-delete application records |
| `GET /teacher/classes/:id/assignments` | `{assignments:[...]}` |
| `POST /teacher/classes/:id/assignments` | `{labId,title?}` → `{assignment}` |
| `GET /teacher/classes/:id/students/:studentId` | `{student,work:[{assignmentId,labId,draft,submissions}]}` |
| `PATCH /teacher/classes/:id/submissions/:id` | `{expectedRevision,grade,feedback,status}` → `{submission}`; status `graded` or `returned`, grade 0–100 (nullable when returned) |

An assignment is `{id,labId,title,createdAt}`. A draft is `{version,work,updatedAt}`, starting as `{version:0,work:null,updatedAt:null}`. A submission is `{id,assignmentId,studentId,draftVersion,revision,work,createdAt,status,grade,feedback,gradedAt}`. All timestamps are ISO strings; absent grading dates are null. A submission's work/draft version is immutable; its grading metadata uses an independent `revision`. `expectedStudentId` and `X-Classroom-Student` must equal the opaque application membership ID returned by the validated session, never a school ID or Google user ID. A missing/mismatched assertion returns 409 `student_session_changed`, before work is read or changed; a guest logout with no active student can still clear an old cookie. On a session mismatch, preserve local work and reopen the classroom. On a draft/revision conflict, reload and review the current version instead of silently overwriting another view. Unexpected or identifying structured fields return a generic 400 privacy rejection without echoing their values; this is schema minimization, not a general free-text PII detector.

## Verification and stopping collection

`node --test tests/classroom-api.test.js` first verifies that the actual `onRequest` entry stays locked despite complete configuration/forged approval flags and never inspects context or configuration. Separate tests call `handleClassroomRequest` explicitly with signed RS256 test tokens and a D1-shaped adapter over real in-memory SQLite. Use Node 24 (or another release with `node:sqlite`) for these SQL tests; older Node releases report the SQL-dependent tests as skipped. The public site's ordinary static preview server does not emulate Pages Functions, D1, or Access.

Before production classroom use, test with fictional aliases in two separate browser profiles: approved/unapproved teachers, two teachers with different classes, two learners in the same class, a different class, lost/logout sessions, stale draft and grade versions, lock/delete/expiry behavior, report export, and server failure. Confirm that the actual Access gate is applied, signatures are verified, production configuration is isolated from previews, and module/API responses have the expected headers. Test supported desktop Edge and managed Chromebook Chrome on the school network, including clipboard/download policies and any Cloudflare challenges. Do not claim this local test suite certifies deployment security or district approval.

The current release lock already prevents classroom collection. If a future approved release enables the service, `CLASSROOM_ENABLED=false` and a redeployment remain the operational off switch. Disabling an API **does not erase existing D1 records or provider backups**. Perform the approved export/deletion and provider retention process separately. Keep real student records out of Git commits, static assets, demo seeds, screenshots, and application logs.
