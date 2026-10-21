# Accessibility review

Reviewed October 21, 2026, including the `2.27.1` / `20261021-accessibility27` follow-up and new student HTML companions. The improvement target is WCAG 2.2 Level AA. This records source checks, regression tests, and sampled browser evidence, not an ADA legal determination, accessibility certification, or completed WCAG conformance audit. The original PDF limitations and pending assistive-technology acceptance below remain open.

## Current follow-up verification

The complete Windows suite ran **1,027 tests: 1,025 passed, zero failed, and two platform-specific file-link checks skipped**. Syntax/curriculum checks passed for 52 application/server modules; the isolated build contains 69 reviewed public files. All public HTML entry styles/scripts and the complete source import graph use one release key. These results verify the tested behavior and publishing boundaries, not every WCAG criterion.

- Software, expanded, and coding workbenches retain the corresponding keyboard control, opened disclosures, and editor selection/scroll when markup updates. Restoration does not steal a later move outside the bench or focus content in closed disclosures. Scrollable consoles and reference examples are named keyboard stops; selected inbox messages expose their state.
- Code errors are linked to the editor and extra-input field. Invalid writing is identified with persistent text, `aria-invalid`, and descriptions; Finish leads to the actual missing note/reflection rather than always choosing Notes. Output headings follow the page's heading levels.
- Report encryption and Save/share restore an available action after temporary disabling without stealing deliberate focus or restoring after close. Invalid public keys identify their field. Teacher refresh status is persistent and polite; repeated submitted-version buttons name their lab.
- Actual Chrome testing of CODE-504 confirmed an invalid program produces a field-linked error and keeps focus on Run all fixtures. A solid-background home-page contrast sample found no below-threshold text among the sampled elements; gradients/images, all states, and all criteria were not covered.

The HTML workbook/quiz parity, browser checks, original PDF limitations, and pending human acceptance activities are recorded below. Browser viewport overrides and zoom shortcuts did not change the actual current browser size, so no new narrow-screen or zoom result is claimed for this follow-up.

## Scope and fixes

The standalone pass covered `classroom.html`, `teacher/index.html`, `secure-reports.html`, `school-it.html`, `404.html`, and their portal/report handlers. Static review confirmed English page language, descriptive page titles, main landmarks, skip links, native form labels, and row/column headers on the review tables. The encrypted-report main target now accepts skip-link focus. All five pages load the shared accessibility stylesheet last; the 404 uses absolute asset paths so nested missing URLs retain styling.

- Classroom rerenders retain the corresponding keyboard control instead of dropping focus to the page. Opening learner work and a submitted version focuses the relevant heading; closing review returns to that learner's button. Repeated review buttons include the learner alias in their accessible name, and class/version buttons expose their selected state.
- The native deletion dialog has an accessible name and description, identifies incorrect confirmation text, and returns focus to its opener or an available heading. Grade/feedback validation identifies the field and links it to a persistent error announcement. Errors no longer disappear after eight seconds. Review navigation no longer forces smooth animation.
- Local encrypted-report processing restores focus after temporary disabling, leads to the available download or decrypted-report heading, and identifies passphrase mismatch and invalid file inputs in text. Completion does not steal focus from navigation or the clear-page control. Clearing during unfinished processing prevents stale results and stale focus restoration. Decrypted report content remains text, and its scrollable reader is a named keyboard-focusable region.
- Shared CSS improves focus outlines, input boundaries, target sizes, reflow, reduced-motion and forced-colors support. Browser contrast review identified and corrected the pale Practice-mode label, workbench log timestamps, classroom secondary/footer text, rubric text, and encrypted-report step numbers. These sampled corrections do not establish contrast compliance for every state or image.

## Conversation and learning materials: follow-up review

Source review of `interview.js`, `requester-persona.js`, `interview.css`, teaching/standards renderers, and beginner activity renderers found no additional material interview defect requiring a code change. Case and persona replies are text data; their facts are not conveyed only by a picture, color, sound, or pointer gesture.

The conversation has a heading and a named, keyboard-focusable scrolling log. It identifies speakers and reply sources in text. The log's live setting is off; a separate atomic polite status announces the source warning and new reply together. The composer has a native label, linked help, a length bound, and Send message button. The single AI on/off button exposes its pressed state; Reply privacy is a normal link. The composer stays outside the scrolling history. Real screen-reader speech and scrolling behavior remain to be tested.

Teaching choices and standards filters use native labeled selects. Standards results have an announced count, table caption, column/row headers, and named keyboard-focusable table region. Learning supports use native disclosures, written examples, vocabulary definitions, and text instructions. The prepared teacher prompt is named and focusable, with a manual-copy fallback. Plain-text report export is an alternative to the visual report; it does not replace checking the interactive dialog's reading order.

The follow-up passed **153 focused tests with zero failures or skips**: 82 across interview, requester persona, teaching, standards, and curriculum downloads; 71 across beginner models/scenes/routing, application accessibility, standalone accessibility, and shared styles. These test response boundaries, help availability, labels, announcements, tab/panel behavior, focus, persistent errors, cancellation, and safe report text. They do not simulate assistive-technology speech or establish full WCAG conformance. Other agents' subsequent changes and the final release need their own verification.

## Student PDFs: known limitations

Both approved PDFs were inspected without changing their bytes; hashes still match `tests/curriculum-downloads.test.js`. Every page yielded text. All 14 pages were rendered and inspected at overview scale for missing content, overlap, or obvious clipping. This is a limited metadata/content/render review, not a PDF/UA or screen-reader audit.

| Download | Observed structure | Remaining concern |
| --- | --- | --- |
| [Student workbook](../assets/cole-learning-labs-student-workbook.pdf), 6 pages | Descriptive title; text on every page; no image-only pages; no interactive form fields | No document language, marked-content metadata, or structure tree. Visual headings, table relationships, and answer spaces are not structurally exposed. |
| [Unmarked practice quizzes](../assets/cole-learning-labs-pop-quizzes.pdf), 8 pages | Descriptive title; `en-US` language; marked content and structure tree; text on every page; no interactive form fields | Custom Title and Standard tags both map to ordinary paragraphs. Heading, question, list, answer-choice navigation, and meaningful reading order have not been established. |

Neither PDF is an accessible fillable worksheet. Their bytes and pinned hashes remain unchanged. The [HTML student workbook](../student-workbook.html) now presents all six sections, 20 open-response prompts, ten guided-note blanks, and the eight-stage reference table with native labels and semantic headings/table headers. A clearly identified current-interface note explains the workbook's earlier conversation control names. The [HTML practice quizzes](../practice-quizzes.html) preserve all eight forms, 40 question groups, and 160 answer choices in their original order. Each question is a native fieldset/legend with four labeled radio choices. No answer key, completed response, or scoring is included.

These alternatives have no form submission, JavaScript, application saving, or upload code. Entries are temporary; browser features/extensions may handle fields under their own settings. Pages provide section links, keyboard instructions, print styles, and original-PDF links. Long textarea responses need a print-preview check and may require field expansion or copying to an approved document. Five new focused tests verify native labels and unique IDs, absent submission paths, workbook prompts/table relationships, independent radio groups, and exact quiz text/order against baselines extracted from the approved PDF and checked against its rendered forms. Together with the three existing curriculum/PDF-hash checks, **8/8 passed**. An independent source review also matched all 40 quiz questions, 160 choices, and 31 workbook response prompts/status fields to the approved extracted text; it found no material security issue.

Actual Chrome checks at **1536 × 735** verified the workbook's skip link focuses main, native text entry works, and Tab advances to the next labeled field. In the quiz, Space selects the first radio choice and Arrow Down moves selection within the group. Neither page had page-level horizontal overflow at that actual width. The requested narrow viewport and zoom shortcuts did not change the actual browser, so they supply no new narrow/200% evidence. Print, actual assistive technology, and narrow-layout acceptance remain pending. Both clean and `.html` routes now deny script, connection, form, and frame capabilities and use private/no-store responses; this strengthens the static-page boundary without establishing accessibility conformance.

HTML alternatives do not remediate or certify the original PDFs. Recheck any revised PDF visually and with assistive technology before replacing its pinned asset. The public downloads are not certified accessible.

## Earlier browser and release evidence

Release `20261021-accessibility26`, version `2.26.1`: the full local suite ran 954 tests, with 952 passed, zero failed, and two Windows-only file-link checks skipped. Syntax checking passed for 51 application/server modules; the public build contains 66 reviewed files. Five shared-style checks measure normal-text contrast at 4.5:1, control/focus contrast at 3:1, and stylesheet coverage across every public entry. The contrast sampling excludes image/gradient backgrounds and is not an automated whole-site WCAG audit.

The application pass also corrected the mobile menu's state/name and Escape behavior, focus retention during catalog filtering and clearing, reset-confirmation focus, named report dialogs with heading/opener focus, and one atomic requester announcement containing the source warning and answer. The workbench Power control names its current state and action; opening a pictured lesson keeps focus on an available native control. Beginner instructions can be reached with Tab while inactive panels stay hidden.

All 33 focused checks passed across `standalone-accessibility.test.js`, `portal-rendering.test.js`, and `report-crypto.test.js`; the three changed JavaScript modules also passed syntax checks. Tests exercise the real production handlers behind a small DOM boundary: focus restoration, repeated learner controls, error persistence, invalid confirmation, cancellation, safe report text, and delayed completion. These tests do not simulate screen-reader speech, native dialog focus trapping, a full accessibility tree, or layout.

Chrome checks at a **320 CSS-pixel viewport width** found no page-level horizontal overflow on the home page, all five pathway workbenches, classroom entry, teacher entry, school review, and encrypted-report page. This is viewport evidence, not a physical Chromebook or assistive-device test. The broader review also retains the recorded fitted/expanded PC checks in [Chromebook review](CHROMEBOOK-REQUESTER-REVIEW.md).

Actual Chrome keyboard checks verified the first-Tab skip link reaches main content; the mobile menu opens with Enter and closes with Escape while returning focus to its toggle; pathway selection with Space retains focus; and the lab report opens at its heading, keeps Tab inside the dialog, and returns to its opener with Escape. The classroom demo opens at its heading; the three Review work buttons identify Learner-A/B/C and opening work focuses its heading. These sampled workflows are browser evidence, not a screen-reader or whole-site keyboard certification.

## Assistive-technology acceptance still required

The following are completion criteria, not claims of testing already performed. Record the actual browser, operating system, assistive-technology version, tested release, workflow/result, and evidence when each review occurs. A sampled automated browser check does not complete a human acceptance row. Reviewer/date/evidence fields are intentionally unfilled. Any barrier found needs a tracked fix and retest.

| Acceptance activity | Required scope | Status | Reviewer | Date | Evidence |
| --- | --- | --- | --- | --- | --- |
| ChromeVox on a supported managed Chromebook | Navigation, every pathway, conversation log/live replies, code editor/results, diagrams' text alternatives, reports, and HTML worksheet/quiz fields | Pending | — | — | — |
| NVDA with Windows Chrome | Names/roles/states, headings and reading order, forms/errors, dynamic results, log announcements/scrolling, dialogs and reports | Pending | — | — | — |
| NVDA with Windows Edge | Repeat representative complete workflows and platform-specific control/dialog behavior | Pending | — | — | — |
| Human keyboard-only review | All beginner/investigation workflows, menus, filters, tabs, dialogs, code modes, worksheet fields, quiz groups, focus visibility/obstruction, and exit from every scroll region | Pending | — | — | — |
| Zoom, reflow, and text spacing | Actual 200% browser zoom; reflow at 400% or equivalent 320 CSS-pixel width; WCAG text-spacing overrides; no lost controls, clipped instructions, or obscured focus | Pending | — | — | — |
| Forced colors and device operation | Windows forced-colors, reduced motion, touch targets, large-text layouts, portrait orientation, and actual school devices/network | Pending | — | — | — |
| Qualified independent accessibility review | Complete applicable WCAG 2.2 A/AA assessment across pages/states, equivalent curriculum access, issue log, and retest record | Pending | — | — | — |

The project is not finished with accessibility acceptance until these reviews and necessary fixes are recorded. Browser automation and sampled contrast checks cannot establish that every WCAG 2.2 AA criterion or applicable legal requirement is met.

Use the [W3C WCAG 2.2 reference](https://www.w3.org/WAI/WCAG22/quickref/) to review the complete applicable criteria, including text alternatives, relationships and sequence, reflow, keyboard access, focus, labels/errors, name/role/value, and status messages. Additional guidance: [W3C focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), and [error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html). Report a barrier through the site's Connect page with the page, control, browser, assistive technology, and format or support needed, using fictional examples and no student records or credentials.
