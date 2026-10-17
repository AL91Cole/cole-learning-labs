# Device checks for equipment and report exports

Use fictional information for these checks. A desktop viewport does not reproduce a Chromebook, iPad, Android tablet, assistive technology, or a managed school browser. Browser capabilities and school policy can differ even when a browser engine is shared.

## Report behavior

1. Open a lab, ask a fictional question, and record a hypothesis, test notes, an experiment and a reflection. Include multiline text and a non-ASCII sample such as café, Δ or 🧪.
2. Open **My report**. No plaintext export should be enabled until the learner reviews the report and checks the export approval.
3. Choose **Download .txt report**. The filename contains only the fictional case ID, for example `cole-learning-labs-INC-101.txt`. The bytes are UTF-8 and use consistent CRLF line endings. The interface reports a download request, not proof of saving.
4. Check Downloads or Files and open the actual file. Compare its questions/replies, hypothesis, notes, experiment, action log and reflection with the preview. Keep the page open until the saved copy is confirmed.
5. When **Save or share .txt** is offered, it must be initiated by its own approved user click. The device chooses the available destinations. A selected app or cloud folder can receive the report; the site does not silently upload it. Cancelling must not claim the file was saved or submitted.
6. If the clipboard is restricted, **Select report text** offers manual selection and instructions. If school policy blocks downloads, sharing or copying, ask the teacher or school IT for the approved process. Do not bypass that policy.
7. Uncheck export approval and confirm that download, sharing, copying and the selection helper are disabled. Close/reopen the report and confirm approval resets. Changing a teacher key requires fresh key verification.

Unused object URLs are revoked immediately. A URL already requested for download is retained for a short handoff interval before revocation so closing the dialog does not race the browser's save operation. URLs are not written to local storage or sent to a service.

## Equipment behavior

- Mouse or trackpad: drag a tray part to its matching labeled connector. Releasing outside a connector cancels the move. An incompatible connector reports a reason and leaves equipment unchanged.
- Touch: drag from a part's grip. Swipe on the rest of a card to scroll the bounded inventory. A tap selects a part; scrolling the page and tapping a socket is an equivalent alternative.
- Keyboard: use Tab to reach a part, Enter or Space to select it, then the large socket controls to fit it. Escape cancels. Focus and the expanded large controls should remain usable after the equipment updates.
- Interruptions: pointer cancellation, a second pointer, a window losing focus, a section change, report opening and route replacement must leave no active ghost or pending drop. Returning to the bench must preserve actual equipment state and notes.
- Safety: internal work still requires the virtual PC to be off and AC disconnected. Fit order, board/storage compatibility and the original-task test are enforced by the existing simulation model. Merely moving or inspecting a part cannot deliver the ticket or earn a grade.

## Verification scope

On October 17, 2026, a real report downloaded in connected desktop Chrome was compared with the report shown on screen. The improved case-named file was 3,676 bytes, matched the normalized UTF-8/CRLF preview exactly, and preserved a typed question/reply, multiline notes, a saved before/after experiment, reflection and Unicode. The earlier unmodified download was also verified. Tests cover unsupported File/share APIs, exact native-share MIME, blocked Blob or clipboard operations, cancellation, consent and asynchronous cleanup.

Physical Microsoft Edge, Chromebook, Android and iPad sessions were not connected for this verification. Treat those as required school-device acceptance checks before classroom use. Responsive layout and synthetic pointer-type tests are useful evidence but do not replace those checks. No independent accessibility or universal-device certification is claimed.

## Detailed 3D assembly verification — October 17, 2026

The connected in-app browser rendered the actual WebGL2 scene. A complete INC-106 build was performed through visible controls: PSU, board, CPU, paste, cooler cross-pattern fasteners/fan, memory clips, GPU latch/bracket, original SSD and leads, panel and startup. It opened the original lesson file. A deliberately wrong cooler-screw order was rejected. The report preview contained all 18 screw positions, paste condition, fan lead and retention state.

A fresh INC-101 session verified the simplified controls and initial keyboard focus, blocked a case-screw removal while powered, then safely opened the panel and removed the cooler. Refitting with disturbed paste produced the expected startup warning; cleaning and applying fresh paste changed the modeled thermal state. Responsive views at 1366 × 768 and 768 × 1024 had no horizontal overflow and all visible equipment buttons were at least 44 pixels high. The normal narrow in-app view also rendered the scene with vertical page scrolling available. This is browser/viewport evidence, not a physical tablet or Chromebook test. Chrome extension control was unavailable during this check; no new physical Edge test is claimed.

Before classroom acceptance, test the detailed mode on managed Chromebooks, Edge, Android and iPad: rotate/scroll without accidental actions; choose parts and fasteners by keyboard/touch; pause/resume; switch investigation sections; trigger the graphics-disabled fallback; download and open the report; and complete a build without device overheating or excessive battery use. Confirm the school's filtering policy permits the site's own script files; no external graphics CDN is required.

## Drag-and-drop and tool checks — October 17, 2026

In the tools13 local in-app browser preview, visible 3D screwdriver taps removed both panel screws. A pointer drag from the fitted panel to the parts tray removed the panel only on release. After the cooler was removed through the guarded controls, tapping the exposed CPU with Clean surfaces and then Thermal paste changed the real model from used paste to clean surfaces to a fresh pea-sized dot. The component feedback and action log reflected each accepted operation.

At 768 × 1024 and 390 × 844 viewport sizes, the page had no horizontal overflow and the five tool buttons were 48 CSS pixels high. Automated tests additionally cover incorrect sockets, unsafe model proposals, screw-head visibility, all eight loose-component selection targets, interruption cleanup and the ordinary-button alternatives. This is browser and synthetic input evidence; new physical Chromebook, tablet and Edge tool testing remains outstanding.

## 3D cable checks — October 17, 2026

The cables14 in-app browser preview connected the PC HDMI end from the motherboard output to the graphics-card output by dragging. A separate INC-108 session dragged the loose monitor end into the monitor HDMI input and connected the AC plug to the PSU inlet. After powering off, disconnecting AC and removing the panel, dragging SATA data to Cable rest disconnected it; dragging the parked end back to its labeled SSD data socket reconnected it. Feedback and the action log reflected the accepted model operations.

The native cable picker retained keyboard focus after ArrowDown changed the selected cable. At 1366 × 768, 768 × 1024 and 390 × 844, the controls fit without horizontal page overflow; tool and connection buttons were at least 48 CSS pixels high and native cable/socket selects were 44 pixels high. The narrow connection buttons can wrap onto two lines. The final tablet toolbar uses three columns. Actual managed Chromebooks, physical touch devices, Edge and school filtering still need acceptance checks; these observations do not establish performance or touch precision on every device.

## Browser guidance

- [ChromeOS: find and open files](https://support.google.com/chromebook/answer/1700055?hl=en).
- [Apple: find downloaded files on iPhone or iPad](https://support.apple.com/en-us/102440).
- [Microsoft Edge: native file sharing](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/share).
- [Microsoft Edge: managed download restrictions](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/downloadrestrictions).
- [W3C: alternatives to dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
