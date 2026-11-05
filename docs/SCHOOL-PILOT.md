# No-account school pilot

Prepared November 5, 2026 from the repository's code and configuration.

**This pilot has not been run with a school.** This document defines what a pilot would be and which limits are real. It is not an approval, a certification or a legal determination, and it does not replace a district's own review. A district decides whether a use needs an agreement or other safeguards.

The short public version is the [district review in brief](../district-review.html). The detailed public pages are [School IT review](../school-it.html) and [Data privacy & district review](../compliance.html).

## Definition

A class uses the public labs on school devices with nothing added to the site's data flows.

| Part | Pilot setting |
| --- | --- |
| Launch link | `https://www.colelearninglabs.com/?mode=student&cart=true` (student mode plus shared-device mode, described in [Classroom link modes](CLASSROOM-LINK-MODES.md)) |
| Requester replies | Authored, built-in replies only. Online replies are not offered in the current public build. |
| Student collection | Off. Connected classrooms, improvement summaries, lab telemetry, aggregate activity counts and signed completion codes are all off. |
| Accounts | None. No learner or teacher account, roster, class code, school sign-in or grade sync. |
| Submissions | The learner opens **My report**, reviews it, downloads the `.txt` file and uploads it through the district's approved LMS. The site is not part of that upload. |
| Content | Fictional computers, networks, accounts and messages. Learners keep real names, IDs, passwords and private details out of notes. |

The pilot adds no launch parameter of its own. The link is the existing combined classroom link, so `tests/session-modes.test.js` already covers its restrictions.

## Controls

"Enforced" means the build or the code does it and a learner or a hosting setting cannot undo it from the page. "Not enforced" means the pilot relies on the teacher, the district or the device.

### Enforced by the build or code

| Control | Where it is enforced |
| --- | --- |
| Online requester replies are not offered. The control reads "AI replies unavailable" and the page sends no reply or availability request to `/api/requester`. | `PUBLIC_LAB_ACCESS = 'open'` in `scripts/public-release.mjs` makes `scripts/build.mjs` pass `localOnly` to `bundleTier`. `localRequesterContext` in `scripts/tier-bundles.mjs` then compiles `REQUESTER_CLOUD_ENABLED` (`src/requester-config.js`) to `false`. `mountRequesterChat` in `src/requester-chat.js` returns before any request when that value is not `true`. Covered by `tests/tier-bundles.test.js`. |
| A typed question is never sent as free text. | `REQUESTER_OPEN_QUESTION_REVIEW_APPROVED = false` in `src/requester-config.js`. The reviewed request body is `{scenarioId, topic}` only. |
| Connected classroom collection is locked. | `CLASSROOM_PRIVACY_REVIEW_APPROVED = false` in `functions/api/[[path]].js` returns 503 before configuration is read. `_routes.json` lists only `/api/requester`, `/api/reach`, `/api/telemetry` and `/api/verify`, and `scripts/build.mjs` refuses any other list, so classroom paths are not routed to the service. `CLASSROOM_ENABLED` is `"false"` in `wrangler.jsonc`. |
| Improvement summaries are locked on both sides. | `IMPROVEMENT_SHARING_ENABLED = false` in `src/improvement-config.js`; `IMPROVEMENT_PRIVACY_REVIEW_APPROVED = false` in `functions/api/improvements.js`; `/api/improvements` is not in `_routes.json`. |
| Shared-device mode gives the page no browser storage for work, saved classroom selection or display choices. | `let deviceStorage;if(!SESSION.cart){…}` and the `storageKey` line in `src/app.js`; `mountWorkControls({…shared})` in `src/work-controls.js` replaces the saving panel. The mode comes from `sessionModes` in `src/session-modes.js`. |
| Shared-device mode clears the page after 40 minutes without activity, with a warning two minutes before. | `CART_IDLE_MS` and `CART_WARNING_MS` in `src/session-modes.js`; `clearSharedSession` in `src/app.js`. |
| Student mode hides the portfolio, contact, teacher, sign-in and access pages and turns off links to other websites. | `STUDENT_HIDDEN_PAGES`, `studentHidesPage` and `studentLinkAction` in `src/session-modes.js`; the route guard in `renderRoute` in `src/app.js`. |
| The page can connect only to its own website. | `connect-src 'self'` and `form-action 'self'` in the Content Security Policy in `_headers`. |
| A plain-text report cannot be downloaded, copied or shared until the learner confirms a review. | The `#plain-report-confirm` checkbox in the report dialog in `src/app.js`. The file name carries only the fictional lab ID (`reportFilename` in `src/report-downloads.js`). |
| There are no rosters, school sign-in or grade sync to turn on. | No such code exists. The only school-system link is the optional Google Classroom share link in `src/work-controls.js`, which the shared-device panel leaves out and student mode would turn off. |

### Off by configuration, not by a code lock

These are off because hosting settings are false and no database or key is connected. They are not locked in source the way classrooms and improvement summaries are. Turning any of them on is a release decision that needs its own review.

| Service | Current state | Controlling flag or setting |
| --- | --- | --- |
| Aggregate activity counts | Off | `REACH_ENABLED` and `REACH_RETENTION_VERIFIED` are `"false"` in every `wrangler.jsonc` environment; no `LAB_REACH` database binding. The source flag `REACH_PRIVACY_REVIEW_APPROVED` in `functions/api/reach.js` is already `true`, so configuration is the only thing keeping it off. |
| Optional lab telemetry | Off | `TELEMETRY_ENABLED`, `TELEMETRY_PRIVACY_REVIEWED` and `TELEMETRY_RETENTION_VERIFIED` are `"false"`; no `LAB_TELEMETRY` binding. When on it also needs the learner's choice in the lab. |
| Signed completion codes | Off | `RECEIPTS_ENABLED` is `"false"`. Issuing also needs the `RECEIPT_SECRET` Pages secret and Turnstile keys. The learner-side card stays hidden while codes cannot be issued (`mountLabReceiptUI` in `src/lab-telemetry.js`). |
| Teacher Code Verifier | Page published; checking off | Same condition as completion codes, in `functions/api/verify.js`. The page asks `/api/verify` whether checking is available when it opens and says so before asking for codes (`checkVerifierAvailability` in `src/receipt-verifier.js`). |
| Online requester gateway (server side) | Present in production | `REQUESTER_ENABLED` and `REQUESTER_BILLING_REVIEWED` are `"true"` in the production environment only. The published page does not call it, as described above. Do not describe the gateway as disabled. |
| Cloudflare Turnstile | Site key configured in production; not loaded | `src/turnstile-client.js` loads `challenges.cloudflare.com` only just before a protected request, and no such request is reachable while the services above are off. |

`tests/pages-binding-config.test.js` pins the classroom, improvement, requester, receipt and telemetry flags in `wrangler.jsonc`. `tests/reach-service.test.js` checks that the reach receiver refuses while either reach flag is false, but no test pins the two reach flags in `wrangler.jsonc`. Dashboard-only settings and secrets are outside the repository and were not checked for this document.

### Not enforced

| Limit | What it means for a pilot |
| --- | --- |
| The link modes are a convenience. | A learner who opens the plain address `https://www.colelearninglabs.com/` gets the standard page, which still offers optional device saving after an explicit choice. Nothing detects a shared device. |
| Earlier saved work stays. | Shared-device mode does not read or delete work saved before in that browser profile. It stays until someone uses the clear-local-work control on the standard page or the profile is wiped. |
| Downloads and the clipboard persist. | A downloaded `.txt` report and copied text remain on the device after the page clears. Removing them is a device-policy matter. |
| Filtering and device policy are the district's. | The site is not a content filter. Separation between classes needs managed settings such as ChromeOS ephemeral mode or managed guest sessions. |
| Cloudflare delivery metadata. | Every request reaches Cloudflare with an IP address, the requested path, browser information and security and traffic metadata. No-account use does not change that. The US-only access rule is described in [US access and reach](US-ACCESS-AND-REACH.md). |
| Availability requests still go out in every link mode. | On the main site the page makes one bodiless `GET /api/reach` per page load (skipped under Global Privacy Control, Do Not Track or an automated browser) and one bodiless `GET /api/telemetry` each time a lab, course or game page opens. They carry no learner work, cookie or referrer. `mountReachMetrics` and `mountActivityTelemetry` in `src/app.js` are not conditional on the link mode. |
| The link-mode query is part of the requested address. | `?mode=student&cart=true` is sent with the page request. Lab addresses after `#`, such as `#lab/INC-101`, are not. Requests for the script files an activity needs are ordinary requests. |
| The offline cache is still installed. | The home page registers `sw.js` in every link mode. It caches public site files only, never `/api/` responses or learner work. |
| What a learner types. | Nothing stops a learner from typing personal information into notes, and the report contains what was typed. The review step before download is a prompt, not a filter. |
| The LMS upload. | Once a report is uploaded, the district's system and its rules apply. The site cannot see or recall it. |

## Transmitted and retained, by feature

"Retained" means kept by the application. Cloudflare's own logs and recovery copies are separate and need their own review.

| Feature | State in the pilot | Transmitted | Retained by the application |
| --- | --- | --- | --- |
| Lab work in the page | On | Nothing. Work stays in page memory. | Nothing on the server. In shared-device mode nothing in browser storage either. |
| Report download | On, by learner choice | Nothing to the site. The file goes where the learner puts it. | Nothing. |
| Availability requests | On | `GET /api/reach` and `GET /api/telemetry` with no body, cookie or referrer. | Nothing. |
| Online requester replies | Not offered | Nothing. Reviewed design if a later release offers them: `{scenarioId, topic}` and a security-check token. | Reviewed design: daily usage-budget totals only. |
| Aggregate activity counts | Off | Nothing. If enabled: `{version, activity, metric}` and a security-check token. | If enabled: monthly totals for the current and two previous months, plus day and minute admission counters. No event rows. See [reach/README.md](../reach/README.md). |
| Optional lab telemetry | Off | Nothing. If enabled and chosen by the learner: lab code, event type, active seconds, step reached, completion percentage on completion, and a token. | If enabled: daily counts in broad duration, score and step bands for the current day and the 29 before it. No retention schedule has been approved. See [telemetry/README.md](../telemetry/README.md). |
| Signed completion codes | Off | Nothing. If enabled and requested: lab code, completion event, browser-reported score and active seconds, and a token. | Nothing. The code goes back to the browser. See [LAB-RECEIPTS-PRIVACY.md](LAB-RECEIPTS-PRIVACY.md). |
| Teacher Code Verifier | Checking off | One bodiless `GET /api/verify` when the page opens. If enabled: the pasted codes and a token. | Nothing. |
| Connected classrooms | Locked | Nothing. | Nothing. |
| Improvement summaries | Locked | Nothing. The form is a local preview. | Nothing. See [LAB-IMPROVEMENTS-PRIVACY.md](LAB-IMPROVEMENTS-PRIVACY.md). |

## What needs a separate district review first

Each of these is outside the pilot. Before any is switched on for a school, the district reviews it and any applicable agreements are in place, following [PRIVACY-RELEASE-GATE.md](PRIVACY-RELEASE-GATE.md).

- Connected classrooms, or any other feature that receives work, aliases, class codes or teacher accounts.
- Online requester replies, including any change of `PUBLIC_LAB_ACCESS` that brings the learner choice back.
- Aggregate activity counts, optional lab telemetry or signed completion codes and the verifier.
- Improvement summaries.
- Any roster import, school sign-in, grade sync or LMS integration. None exists today.
- The optional encrypted-report workflow with real school records, which needs a key-custody decision. See [STUDENT-DATA-DESIGN.md](STUDENT-DATA-DESIGN.md).
- Use of real student records in any free-text field.

## Managed Chromebook checklist

Use a test account in the student organizational unit, on the student network, with fictional information.

1. Allow `https://www.colelearninglabs.com` in the filter and confirm `colelearninglabs.com` redirects to it. No other hostname is needed for the pilot.
2. Open the launch link. Confirm the strip above the page names student mode and shared-device mode.
3. Confirm the portfolio, contact, teacher and sign-in pages are not in the navigation, and that a link to another website no longer opens.
4. Open one investigation, for example Blank Monitor (`#lab/INC-101`). Work through it with the keyboard only, then with touch or the trackpad.
5. In the lab, confirm the panel reads "Shared-device session · nothing is saved on this device" and offers no Save or Resume control.
6. Ask the requester a question. Confirm the control reads "AI replies unavailable" and a built-in reply appears.
7. Raise text size with the Display menu and with browser zoom. Confirm nothing is cut off.
8. Open **My report**, review it, confirm the review checkbox and choose **Download .txt report**. Open the file from Files.
9. Upload that fictional report to a test assignment in the district's LMS.
10. Choose **Clear this page now** in the strip and confirm the work is gone.
11. Leave the page untouched. Confirm the warning at 38 minutes and the clear at 40 minutes.
12. Repeat with the lid closed past 40 minutes and confirm the page clears when the device wakes.
13. Turn on ChromeVox and repeat steps 4 to 8.
14. Open the Listen panel and confirm whether a device voice is offered. The panel says so when none is. The Listen and Display buttons sit in the bottom-left corner and show as icons only (a speaker and "Aa") on smaller screens.
15. Open the plain address and decide whether the optional device-saving choice is acceptable there, or whether ephemeral mode or managed guest sessions are needed.
16. Sign out and back in. Check what remains in Downloads and on the clipboard under the device policy.

### Checks that still need a real school Chromebook

None of these has been run on a managed school Chromebook for this project. Automated tests and desktop-browser checks do not stand in for them.

- **ChromeVox:** navigation, the strip, the lab controls, the requester log and the report dialog.
- **Device read-aloud voices:** whether the managed device offers a local English voice to the Listen panel. Online voices are never selected.
- **Managed download policy:** whether the `.txt` download is allowed, where it lands and whether it survives sign-out.
- **Lid-close behaviour:** whether a page asleep past the limit clears on wake under the district's sleep and sign-out settings.
- **District filter and student network:** the real filter category and the student organizational unit's policy.
- **Touch and trackpad** on the actual device model.

Record results in [DEVICE-CHECKS.md](DEVICE-CHECKS.md).

## What this document does not say

- It does not say the site meets any law, standard or district requirement.
- It does not say a pilot has taken place. It has not.
- It does not say nothing is transmitted. The host receives ordinary request metadata, and the page makes the availability requests listed above.
- It does not describe dashboard settings, provider logs or secrets, which are outside the repository.
