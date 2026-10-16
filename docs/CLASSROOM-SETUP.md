# Optional classroom service

The repository includes a classroom API and a teacher/student portal. This is prepared functionality, **not an activated student-record service**. No D1 database, Access application, or first approved teacher email was provisioned for this release. Alan Cole's CTE teaching remains a future goal.

The independent public labs remain browser-local. Students must explicitly join a configured classroom before the classroom workflow sends assignment work to its server. A fictional portal demo is separate from real class data. Do not enter real student records into a demonstration.

## Default-off configuration

Every API route returns HTTP 503 with `enabled: false` until **all** settings below are present and valid. The configuration check happens before database access. A database binding alone does not enable the service.

| Production setting | Required value |
| --- | --- |
| `CLASSROOM_ENABLED` | Exactly `true`; leave unset or use `false` to keep the service off |
| `CLASSROOM_DB` | A D1 binding with the supplied migration applied |
| `CF_ACCESS_TEAM_DOMAIN` | The exact team hostname, such as `your-team.cloudflareaccess.com`; no scheme or path |
| `CF_ACCESS_AUD` | The Access application's audience tag |
| `TEACHER_EMAILS` | A comma-separated, explicit list of approved teacher email addresses; no automatic first-user enrollment |

Keep production bindings and configuration out of preview deployments. Use a separate test database, Access application/audience, and approved test identities if a preview needs live API testing. Never bind a public preview to production student records by convenience.

## School review before activation

Have the school or district approve the service, hosting/subprocessors, teacher identities, and student-data process before collecting classroom records. Document educational purpose, data fields, permitted uses, parent/student review and correction, export, deletion/retention, incident contacts, and any applicable district/state requirements. Grades and student-linked submissions may be education records. Hosting, HTTPS, a pseudonym, or an Access login does not by itself establish legal compliance.

Under-13 participation needs a COPPA review where applicable. School authorization is limited to the educational context and does not transfer the operator's responsibilities to an individual teacher. Keep advertisements, commercial student profiling, and live AI-model processing out of this classroom workflow. See [U.S. Department of Education educational-service guidance](https://studentprivacy.ed.gov/resources/protecting-student-privacy-while-using-online-educational-services-requirements-and-best), [FERPA school-official requirements](https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa), and [FTC's schools guidance, section N](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

## Activation sequence for the approved operator

1. Choose the approved teacher email addresses and record who administers access. No email is preselected in the repository. Enable MFA on operator accounts and use the district-approved identity provider/access policy.
2. Create an approved D1 database. Apply `migrations/0001_classrooms.sql` once through D1's migration workflow or its SQL console. Keep foreign-key enforcement enabled; cascades remove a deleted class's dependent records. Bind it to the production Pages project as `CLASSROOM_DB`. The migration contains structure only, with no teacher or student seed records.
3. Create a Cloudflare Access self-hosted application covering the canonical site's `/teacher` and `/teacher/*` paths **and** `/api/teacher/*`. Use one application/audience for these teacher entry points. Configure its allow policy for the approved identities; do not add a public bypass or a service-token-only teacher policy. Keep public labs, `/classroom.html`, `/api/session`, and `/api/student/*` outside the teacher-only gate so students can join without a teacher account.
4. Set `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and the exact `TEACHER_EMAILS` allowlist. Keep `CLASSROOM_ENABLED` unset or `false` while checking setup. Access policy and the API's independent email allowlist must both permit the teacher.
5. Review the tests below with fictional work. After approval, set `CLASSROOM_ENABLED=true` and redeploy for Pages bindings/configuration to take effect. Confirm the configured hostname uses HTTPS; there is no insecure-cookie fallback for local HTTP.
6. Complete teacher/student isolation and school-device acceptance checks before sharing class codes. Monitor Functions/D1 usage and failure rates. Plan operator support and maintenance; do not promise an unlimited or cost-free classroom backend.

Pages uses `functions/api/[[path]].js` for same-origin API routes and `_routes.json` to invoke Functions only for `/api/*`. Static assets and independent labs do not invoke the classroom Function. Review [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases), [Functions routing](https://developers.cloudflare.com/pages/functions/routing/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Access application setup](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/), and [JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) for the current platform controls.

Teacher signing keys come only from `https://<configured-team>/cdn-cgi/access/certs`. The API verifies the RS256 signature, issuer, audience, expiration, issuance/not-before times, and an exact approved email. It does not trust an email header or a role set by the browser. Signed Access assertions and signed `CF_Authorization` cookies are supported; the UI stores neither teacher secrets nor a password list.

After removing an address from `TEACHER_EMAILS`, redeploy the changed configuration and revoke its Access session as appropriate. Classes remain owned by their original teacher email; changing an email does not transfer ownership automatically. If a browser has an active student session, leave that student session before using the teacher portal in that profile.

## Student identity and retention

- A class code admits a **new** classroom membership. A teacher-assigned alias is a display label, not proof of identity; aliases may repeat. The server distinguishes learners with opaque random identifiers. Teachers should distribute aliases and supervise joining. This system does not verify school enrollment or a learner's real-world identity.
- Joining issues a 256-bit random, host-only `HttpOnly; Secure; SameSite=Strict` session cookie. Only its SHA-256 hash is stored in D1. JavaScript cannot read the token. Possession of that browser session is the student's access credential; a class code, alias, URL, or student ID alone cannot open another learner's work.
- One browser profile has one active classroom session. Joining a different class requires leaving the current session. Logging out revokes that session. **There is no alias-based account recovery or automatic device transfer.** A lost or logged-out session requires a new membership; it cannot recover old work. Export required reports first. Teachers can still review previously submitted work while the class remains available.
- Each class expires 90 days after creation. Student sessions expire with the class; the deadline is absolute and does not extend on activity. The API denies expired access immediately. Cleanup runs after a later authorized teacher session or teacher API request, throttled to one attempt per minute per database binding in each worker isolate, with concurrent requests sharing a cleanup promise. Anonymous, invalid-authentication, student, and disabled-service requests do not trigger expiry deletion. Deleting a class immediately cascades through its students, sessions, assignments, drafts, and submissions in the application database. Provider backups and recovery windows are separate; this code does not promise a precise physical-erasure deadline. A district requiring scheduled purging must arrange and verify maintenance beyond request-triggered cleanup.
- Locking a class blocks new joins, draft changes, and submissions. Existing session holders can review/export work and read teacher feedback; the teacher can still review or grade. Deletion is permanent in the application's normal workflow. Export any records the school must retain first.

## Stored data and boundaries

D1 stores teacher email/class ownership, class name/code, alias/membership identifiers, hashed student session tokens, assignments, draft work, immutable submitted work, teacher-entered grades and feedback, and timestamps. Work may contain simulation state, evidence, notes, reflection, and action logs. Avoid real names, email addresses, school IDs, passwords, health/disability information, and confidential school material in aliases and free text. A pseudonym can still be identifying to a school; treat classroom records accordingly.

The application does not execute uploaded code or student commands, call a live AI model, or offer file attachments/public student galleries. Work is a bounded JSON object, not a trusted executable. Student-supplied completion/verification is self-reported practice evidence; it is **not an anti-cheat certification**. Teachers manually review and grade a submitted version. Saving a later draft cannot alter that submitted snapshot or its teacher grade.

Cloudflare also handles ordinary request, network, and security metadata. A short-lived join throttle stores a hash derived from the connecting IP/time bucket, not the raw IP; these throttle rows expire after one hour and are removed during later authorized teacher cleanup. This does not prevent Cloudflare or school-managed filtering systems from processing their own network metadata. The API does not add analytics or cross-origin submission endpoints. Do not describe the site as collecting no information or being completely secure.

API responses are private/no-store and do not grant CORS access. All mutations require an exact same-origin `Origin` header, JSON, and compatible fetch-site context. Student work reads, saves, submissions, and active-session logout also assert the expected student identity, so an old tab cannot silently operate on a newly changed cookie session. This assertion is checked against the authenticated session; it is not an authentication credential. The server enforces class ownership and session membership on reads and writes; neither hiding controls nor knowing an object ID grants permission. Class deletion, expiry, SQL parameters, body limits, and optimistic version checks remain enforced regardless of UI controls.

| Server limit | Value |
| --- | --- |
| Active classes per approved teacher | 10 |
| Memberships per class, including lost sessions | 100 |
| Assigned lab choices | The 15 supported lab IDs; one assignment per lab per class |
| Class name / alias / assignment title | 100 / 40 / 120 characters |
| Work per saved draft or submitted snapshot | 64 KiB of JSON; bounded nesting, lists, strings, and keys |
| Individual work string / teacher feedback | 16,000 / 4,000 characters |
| Submitted snapshots per learner/assignment | 5, with repeat submission of the same draft idempotent |
| Join throttle | 600 attempts per connecting-IP hash per ten-minute bucket; shared school IPs can share the limit |
| Class/session lifetime | 90 days from class creation |

## JSON API contract

All paths below begin with `/api`. Use same-origin requests with cookies. Send JSON on every mutation, including `{}` for logout/deletion. A rejected request returns `{ "error": "code", "message": "Readable explanation" }`; disabled/unavailable service responses also include `enabled: false`. Missing configuration returns 503, missing authentication 401, disallowed teacher/CSRF 403, non-owned records 404, and stale/locked/limited changes 409. Request/work size limits return 413; join throttling returns 429.

| Method and path | Request / result |
| --- | --- |
| `GET /session` | `{enabled:true,role:'guest'}`; teacher adds `teacher:{email}`; student adds `student:{id,alias,classId}`, `classroom:{id,name,locked,expiresAt}`, and `assignments` |
| `POST /student/join` | `{code,alias}` → student session result and secure cookie |
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

An assignment is `{id,labId,title,createdAt}`. A draft is `{version,work,updatedAt}`, starting as `{version:0,work:null,updatedAt:null}`. A submission is `{id,assignmentId,studentId,draftVersion,revision,work,createdAt,status,grade,feedback,gradedAt}`. All timestamps are ISO strings; absent grading dates are null. A submission's work/draft version is immutable; its grading metadata uses an independent `revision`. `expectedStudentId` and `X-Classroom-Student` must equal the opaque student ID returned by the validated session. A missing/mismatched assertion returns 409 `student_session_changed`, before work is read or changed; a guest logout with no active student can still clear an old cookie. On a session mismatch, preserve local work and reopen the classroom. On a draft/revision conflict, reload and review the current version instead of silently overwriting another view.

## Verification and stopping collection

`node --test tests/classroom-api.test.js` uses signed RS256 test tokens and a D1-shaped adapter over real in-memory SQLite. Use Node 24 (or another release with `node:sqlite`) for these SQL tests; older Node releases report the SQL-dependent tests as skipped. The public site's ordinary static preview server does not emulate Pages Functions, D1, or Access.

Before production classroom use, test with fictional aliases in two separate browser profiles: approved/unapproved teachers, two teachers with different classes, two learners in the same class, a different class, lost/logout sessions, stale draft and grade versions, lock/delete/expiry behavior, report export, and server failure. Confirm that the actual Access gate is applied, signatures are verified, production configuration is isolated from previews, and module/API responses have the expected headers. Test supported desktop Edge and managed Chromebook Chrome on the school network, including clipboard/download policies and any Cloudflare challenges. Do not claim this local test suite certifies deployment security or district approval.

To stop new collection, set `CLASSROOM_ENABLED=false` and redeploy. This disables the API; it **does not erase existing D1 records or provider backups**. Perform the approved export/deletion and provider retention process separately. Keep real student records out of Git commits, static assets, demo seeds, screenshots, and application logs.
