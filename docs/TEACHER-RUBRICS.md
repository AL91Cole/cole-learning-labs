# Private teacher assessment materials

The public website no longer includes the previous per-lab rubric arrays or a student rubric viewer. The public teacher dashboard demonstration also contains no assessment rubric. A route, tab, or label saying “teacher” does not provide authentication.

The earlier criteria were already published in browser assets and the public GitHub repository. This release retires them from the current website; it cannot make previously published information secret or remove copies held by others. They must not be reused as confidential answer keys.

## Public look-fors are not answer keys

The featured lesson pages (`/lessons/blank-monitor`, `/lessons/inbox-defender`, `/lessons/packet-post` and the pilot pack) each show a short table of reasoning look-fors at three levels. They describe how well a student noticed a clue, chose one change and checked the result. They do not state a lab's cause or fix, and they are not a grading scheme. Anything that reveals a solution, and any school's own scoring, still belongs in the private places below.

## Keep new grading criteria private

- Create any new teacher-only rubric in the school's approved learning management or document system.
- Grant access to the assigned teacher and the school's authorized staff according to school policy. Do not use a public link or student-shared folder.
- Keep confidential criteria out of this public repository, including commits, issues, pull requests, browser code, HTML, JSON, and downloadable assets. Build exclusions protect deployment output, not a public GitHub repository.
- The public labs may show learning goals, fictional customer responses, clues, and technical feedback. Their simulation logic and published tests are inspectable. Use a private rubric to assess the student's evidence, explanation, and work rather than relying on the secrecy of the simulation mechanics.
- If future rubric delivery is implemented, it must use private storage, authenticated teacher access, and server-side authorization for each request. A browser PIN, CSS hiding, or a “teacher mode” switch is insufficient.

The classroom API's existing privacy release gate remains closed. This update does not activate teacher authentication or a private rubric service.

## Release checks

`tests/rubric-boundary.test.js` checks the public scenario data, absence of the student viewer, the teacher demo rendering boundary, and exclusion of a private material fixture from the public build. These checks help prevent accidental republication; they do not replace the school's access review.
