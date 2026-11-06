# Classroom link modes

Two optional addresses a teacher can post for a class. They can be combined as `/?mode=student&cart=true`.

| Address | What changes |
| --- | --- |
| `https://www.colelearninglabs.com/?mode=student` | **Student mode.** The Projects, About, Contact, teacher-resource, sign-in and access-status pages are not shown. Links to other websites are turned off. The home page leaves out the portfolio and classroom sections. |
| `https://www.colelearninglabs.com/?cart=true` | **Shared-device mode.** The page is never given browser storage. After 40 minutes without activity it clears its work and returns to the home page. |

Both are implemented in [`src/session-modes.js`](../src/session-modes.js) and mounted once from `src/app.js`. A visible strip above the page names the active mode.

The combined link is the launch link of the [no-account school pilot](SCHOOL-PILOT.md). That document lists which pilot controls the build or code enforces and which it does not.

## Student mode

- The mode comes from `location.search`. Lab links are hash links, so the mode stays in the address while a learner moves between activities and when the page reloads.
- Hidden pages are `projects`, `about`, `connect`, `educators`, `signin` and `membership`. Opening one shows a short "outside student mode" page with links back to the activities.
- Every link is classified as it is added to the page. Inside a sentence, a link to another website, a hidden or teacher-facing page, an email or phone link, or a script or data address loses its destination and is announced as an unavailable link; its words stay readable. Navigation, footer and button links of those kinds are removed. A click guard covers a link activated before it is processed.
- Kept: every learning route, the student guide, the privacy page, the AI-use notice, the data-practices page linked beside optional sharing choices, the local encrypted-report tool, and a report the learner downloads.

## Shared-device mode

- `localStorage` is never read. Device saving and resuming are not offered, an earlier saved copy is not detected, a saved classroom selection is not read, and display choices are not kept. The lab's saving panel is replaced by a short panel with a clear control and the report tools.
- Inactivity is measured with the wall clock, so time with the lid closed counts. At 38 minutes a warning with a **Keep working** button appears; any pointer, key, touch, scroll or typing dismisses it. At 40 minutes the page clears.
- A page that was asleep past the limit clears on its next timer tick, when it becomes visible, or on the first input, whichever comes first, and that input is not counted as activity for the old session.
- Clearing uses the same reset as the clear-local-work control. It also stops read-aloud, closes an open report, returns display choices to standard and goes to the home page. **Clear this page now** in the strip does the same after one confirmation.
- A value other than `false`, `0`, `off` or `no` turns the mode on, so a mistyped link still protects.

## Boundaries

- The modes only restrict the page that was opened. They do not unlock an activity, confer membership, select a round, send a request or store anything. The module has no storage, network or dynamic-import calls.
- The page's ordinary availability requests still go out in either mode: one `GET /api/reach` per page load and one `GET /api/telemetry` when a lab, course or game page opens, neither carrying learner work. See [SCHOOL-PILOT.md](SCHOOL-PILOT.md).
- They are a classroom convenience, not a content filter or a device policy. A learner can open the plain address and get the standard page with optional device saving.
- Shared-device mode does not delete work saved earlier in that browser. It is not offered there, and stays until someone uses the clear-local-work control on the standard page.
- Downloaded reports, clipboard contents and submitted files are outside the page and are not cleared.
- Same-site pages that stay available in student mode, such as the AI-use notice, link back to the standard address.
- For enforced separation between classes, use managed-device settings such as ChromeOS ephemeral mode or managed guest sessions. District filtering remains the control for web access.
- Existing classroom, improvement, reach, requester, member-content and owner-preview boundaries are unchanged. Hosting, headers and redirects do not change.

## Delivery checks

Run `npm run check`, `npm test` and `npm run build`. `tests/session-modes.test.js` covers address parsing, link classification, the inactivity clock, the storage boundary in `src/app.js` and the School IT wording.

In a browser, open each address and the combination. Confirm the strip, the hidden navigation, an outside link that no longer opens, a hidden page reached by typing its address, the shared saving panel inside an investigation, **Clear this page now**, and keyboard focus through the strip. Check the inactivity warning and clear on a managed Chromebook, including closing the lid past the limit.
