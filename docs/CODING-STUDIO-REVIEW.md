# Chat and coding studio review - v2.27.0

This change adds three investigations to the existing coding pathway: CODE-504 Pixel Pet Snack Time (grades 7-8), CODE-505 Arcade Prize Patrol (grades 9-10), and CODE-506 Rover Energy Planner (grades 11-12). The catalog now contains 32 investigations, including six coding investigations, plus five separate starter modules.

## Practice and safety boundaries

Both syntax choices use a custom local teaching interpreter. It accepts reviewed JavaScript or Python subsets; it does not execute submitted text as native browser JavaScript, a Python runtime, shell commands, or uploaded programs. Imports, packages, browser/device APIs, network access, objects, functions, and unbounded loops are unavailable. Input names are read-only. Source, token, nesting, variable, numeric, execution-step, loop, string, and output limits remain enforced.

Switching syntax retains the draft without translating it and invalidates previous test results. Reset starter explicitly replaces the draft with an example for the selected syntax. A separate made-up input is for ungraded experimentation. It cannot pass official fixtures. Reports identify the practice language. Restored coding records revalidate current code and language before retaining verified/delivered flags, while keeping written work.

## Chat behavior

The latest eight question/reply pairs remain in an open messenger-style conversation above the composer. Extra chat is session-only and excluded from reports/evidence. Clues and evidence, the first-idea panel, and the hypothesis-test panel start open and remain closable. Honest direct identity answers and site simulation/privacy notices remain available without repetitive character labeling.

Cloud replies start on with a question-free availability GET. Only a newly submitted eligible question can send the reviewed lab-ID/topic pair for inference. Raw words, notes, drafts, history, and equipment state stay local. The on/off control works during availability checking. Off choices and automatic service/quota fallback persist during ordinary navigation in page memory. Manual availability checks do not turn cloud back on or replay questions.

The existing shared atomic D1 admission ledger, fixed model, short response, and no-retry policy remain. Its 25-unit two-day reservation and 6,000-unit bucket caps are conservative feature controls, not provider metering or an account-wide $5 billing guarantee.

## Verification recorded on 2026-10-21

- Full local suite: 1,002 tests; 1,000 passed; two platform-specific tests skipped on Windows; zero failures.
- Syntax/curriculum checks passed; isolated build produced 66 reviewed public files.
- Independent parser review and adversarial probes found no host-capability or loop-limit escape in the tested cases. This is not a formal security audit.
- All six investigations passed authored fixtures in both syntax modes in automated checks. All 5,152 trusted requester prompt pairs fit the prompt boundary.
- Actual Chrome checks: repaired Pixel Pet in Python (3/3), Arcade in JavaScript (6/6), and Rover in Python (4/4). Pixel Pet custom input 7 returned Energy 28 without changing fixture credit. Python import was rejected without executing it; the current result returned to 0/4.
- Python draft/results survived step navigation. The requester chat stayed open, produced a local reply, and displayed open clue/idea/test panels.
- Compact 960x540 and 320x640 browser viewports were checked. Normal vertical scrolling remains necessary; this is not physical Chromebook or assistive-technology certification.

Worker refresh and the final branch preview must also be verified before release. Current production publication requires merging the new pull request after review.
