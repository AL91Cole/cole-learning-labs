# PR #22: Microsoft Edge acceptance

Tested on October 18, 2026 in the installed Windows Microsoft Edge **155.0.4283.62**, using the actual Edge desktop application. The local simulation preview served release `20261018-xray22` (2.22.0); the existing private Linux backend served `http://127.0.0.1:8080`. The PR remains unmerged and production is unchanged.

## Results

| Check | Result |
| --- | --- |
| Representative split labs | Passed INC-101, NET-201, AI-301, SEC-401 and CODE-501 at desktop window size; coding and hardware also remained side by side in a restored tablet-width window |
| Persistent full PC picture | Passed: selecting cable tools and dragging HDMI retained the same Full PC X-ray with monitor and components |
| Actual cable repair | Passed: dragging the PC HDMI plug onto the GPU output restored the desktop; clicking the original lesson opened the document |
| Navigation and retained work | Passed: Check & explain kept the request visible; returning through other pathways retained the hardware repair and fictional explanation |
| Native report download | Passed: Edge saved an actual 1,778-byte `.txt` report. File validation confirmed the fictional explanation, Unicode em dash, original lesson task and CRLF line endings |
| Actual Linux input | Passed: physical-style key events entered `id`, and the server returned learner UID/GID 1000 |
| Split resizing | Passed: pointer drag and a keyboard arrow resized the terminal divider and reflowed output while keeping the request available |
| Teacher authentication | Passed: existing protected local key authenticated; the password field cleared on submission. No key was printed or saved in source/URLs |
| Create/join class | Passed: teacher created a disposable class; copying/pasting its code through native Edge controls joined the student under a generated alias |
| Pause/resume | Passed: pause displayed the student banner and disabled shortcut controls; a key press did not enter the terminal. Resume restored input |
| Scoped teacher command | Passed: `echo EDGE_TEACHER_OK` reached the joined student's real terminal and produced output |
| Preview consent | Passed: no preview initially; explicit student opt-in produced a terminal-only image in the teacher window; revocation removed it |
| End class | Passed: closing the disposable teacher window ended the student session with `teacher_disconnected` |

Teacher and student ran in separate, partially visible Edge windows for preview testing. Switching away from a student tab can intentionally revoke sharing; that must not be mistaken for an Edge rendering failure. No real student information was used. The test key and class code are excluded from committed evidence and screenshots delivered as project artifacts.

Desktop and restored-window screenshots were reviewed directly. This was an actual Edge functional test, not an emulated Chromium user agent. Managed Chromebook hardware, physical tablet browsers, school filtering programs and school network WebSocket policies still require acceptance on those devices/networks. This local HTTP/WS review does not establish the configuration of a future hosted HTTPS/WSS backend.

## Automated fixed-view checks

All eight hardware investigations render the full X-ray, including old saved `view` values. Tool/cable selection, complete-controls toggles, legacy view actions and cable pickup cannot crop or switch the equipment scene. Monitor clues, guarded repair actions, independent HDMI ends, socket coordinates, touch/keyboard alternatives and drag cancellation remain covered by tests. The five beginner labs already use a single persistent equipment picture.

The release's public suite passed 821 tests locally with two Windows symlink-capability skips (823 total). Syntax checks and the 57-file public build passed. Final Linux CI counts are recorded in the PR description.
