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

## Classic equipment diagrams — October 17, 2026

The `20261017-classic20` local browser preview restored the PR #6 equipment artwork without a canvas or graphics engine. INC-101 was repaired through the native cable controls and opened the original lesson file. HW-100 completed all nine component inspections, three role questions and nine guarded mini-job actions. INC-106 completed a full detailed build through the current native controls: PSU, motherboard, processor, fresh paste, cooler fasteners/fan, memory clips, graphics latch/bracket, original SSD, internal leads, case screws, display and startup. The original lesson file opened, and the report retained the mechanical state and action log. A wrong cooler-screw order was refused with the correct next position.

At a 768 × 1024 browser viewport the workbench had no horizontal page overflow, no canvas and no visible HTML workbench buttons shorter than 44 pixels. These are responsive browser observations, not tests on a physical tablet, Chromebook or Microsoft Edge. Existing report download and security/privacy regressions remain required. The automated runtime-graph and packaging checks reject retired engine/scene imports and graphics-vendor assets.

## Historical 3D assembly checks — before the classic visual release

The entries below describe superseded 3D versions, not the current 2D interface. Keep them only as historical evidence; camera, GPU and 3D gesture results do not validate this release.

The connected in-app browser rendered the actual WebGL2 scene. A complete INC-106 build was performed through visible controls: PSU, board, CPU, paste, cooler cross-pattern fasteners/fan, memory clips, GPU latch/bracket, original SSD and leads, panel and startup. It opened the original lesson file. A deliberately wrong cooler-screw order was rejected. The report preview contained all 18 screw positions, paste condition, fan lead and retention state.

A fresh INC-101 session verified the simplified controls and initial keyboard focus, blocked a case-screw removal while powered, then safely opened the panel and removed the cooler. Refitting with disturbed paste produced the expected startup warning; cleaning and applying fresh paste changed the modeled thermal state. Responsive views at 1366 × 768 and 768 × 1024 had no horizontal overflow and all visible equipment buttons were at least 44 pixels high. The normal narrow in-app view also rendered the scene with vertical page scrolling available. This is browser/viewport evidence, not a physical tablet or Chromebook test. Chrome extension control was unavailable during this check; no new physical Edge test is claimed.

Before classroom acceptance, test the detailed mode on managed Chromebooks, Edge, Android and iPad: rotate/scroll without accidental actions; choose parts and fasteners by keyboard/touch; pause/resume; switch investigation sections; trigger the graphics-disabled fallback; download and open the report; and complete a build without device overheating or excessive battery use. Confirm the school's filtering policy permits the site's own script files; no external graphics CDN is required.

## Drag-and-drop and tool checks — October 17, 2026

In the tools13 local in-app browser preview, visible 3D screwdriver taps removed both panel screws. A pointer drag from the fitted panel to the parts tray removed the panel only on release. After the cooler was removed through the guarded controls, tapping the exposed CPU with Clean surfaces and then Thermal paste changed the real model from used paste to clean surfaces to a fresh pea-sized dot. The component feedback and action log reflected each accepted operation.

At 768 × 1024 and 390 × 844 viewport sizes, the page had no horizontal overflow and the five tool buttons were 48 CSS pixels high. Automated tests additionally cover incorrect sockets, unsafe model proposals, screw-head visibility, all eight loose-component selection targets, interruption cleanup and the ordinary-button alternatives. This is browser and synthetic input evidence; new physical Chromebook, tablet and Edge tool testing remains outstanding.

## 3D cable checks — October 17, 2026

The cables14 in-app browser preview connected the PC HDMI end from the motherboard output to the graphics-card output by dragging. A separate INC-108 session dragged the loose monitor end into the monitor HDMI input and connected the AC plug to the PSU inlet. After powering off, disconnecting AC and removing the panel, dragging SATA data to Cable rest disconnected it; dragging the parked end back to its labeled SSD data socket reconnected it. Feedback and the action log reflected the accepted model operations.

The native cable picker retained keyboard focus after ArrowDown changed the selected cable. At 1366 × 768, 768 × 1024 and 390 × 844, the controls fit without horizontal page overflow; tool and connection buttons were at least 48 CSS pixels high and native cable/socket selects were 44 pixels high. The narrow connection buttons can wrap onto two lines. The final tablet toolbar uses three columns. Actual managed Chromebooks, physical touch devices, Edge and school filtering still need acceptance checks; these observations do not establish performance or touch precision on every device.

## Ticket-first repair flow — October 17, 2026

In the repair15 in-app browser preview, the catalog displayed direct ticket cards without a 3D room. INC-101 opened with the request and a question form; optional help, evidence, repair idea and conversation history were closed. A student-written follow-up received the expected fictional reply. Open workbench loaded the detailed PC automatically, with power/test controls, six tools and the equipment in the main view.

At 768 × 1024, dragging the PC HDMI plug from the motherboard output to the labeled graphics-card output changed the actual simulation state. Reconnecting AC, testing the PC and opening the lesson passed the original-task check. The 768 × 1024 and 390 × 844 layouts had no horizontal page overflow. NET-201 had no canvas on its request tab and mounted its pathway scene only after entering the workbench. These are connected-browser and viewport checks; physical school devices and managed Edge remain acceptance checks.

## Realistic equipment and direct zoom — October 17, 2026

The realism16 connected-browser preview rendered the revised PC with neutral lighting, component markings and detailed connectors. Zoom in, Zoom out, Fit PC and Focus part were available directly below the picture. Selecting memory and choosing Focus part moved the camera onto it and brought the full equipment picture below the sticky tabs; the clicked button retained keyboard focus. Repeated view changes left the action count unchanged. Fit PC showed the tower inside the picture at 768 × 1024 and 390 × 844, with no horizontal page overflow and all four camera buttons 48 CSS pixels high.

A visible 3D screwdriver tap removed a side-panel screw. After safe shutdown, unplugging and panel removal, an HDMI plug drag connected the graphics-card output. In the final connector revision, dragging the SATA data plug to Cable rest disconnected it; Focus part, Fit PC and Zoom out made close inspection and wider routing views available, and dragging the parked plug back to the SSD data socket reconnected it. The real feedback and action log reflected accepted changes. No browser warnings or errors were observed in this preview. Automated tests additionally check bounded camera distances, case framing, preset recovery after close-ups, cancellation, resource disposal and a visible-geometry budget.

These checks use a connected desktop browser and responsive viewports. They do not establish physical touch precision, battery life or performance on managed Chromebooks, Edge, Android tablets or iPads. Include the new camera buttons and close-up connector workflow in those school-device acceptance checks.

## Beginner labs — October 17, 2026

The foundations17 local in-app browser preview completed all five beginner activities through their visible Explore, Practice and Check controls. Hardware used the existing real assembly state: a pointer drag fitted the loose DDR4 module into its slot, then the ordinary controls closed clips, refitted the panel, secured both screws, connected HDMI and AC, booted and opened the original lesson file. Its report identified HW-100 and the completed hardware state; the download filename was `cole-learning-labs-HW-100.txt`.

The networking mini-job connected a fictional workstation, assigned settings and reached the practice page. AI and security completed their authored evidence/review and scope/MFA/least-privilege flows. The coding starter produced failing outputs 3, 5 and 8; changing `+` to `*` passed quantities 0, 2 and 5 with outputs 0, 6 and 15. Editing after a pass reopened completion and cleared stale results. Navigating through the catalog and other beginner labs preserved the page-memory code draft.

An actual 1,660-byte `cole-learning-labs-CODE-500.txt` download matched the report preview after UTF-8/CRLF normalization, including its current source and all three fixture results. Export required the existing approval checkbox. No browser warnings or errors were observed.

At 768 × 1024 and 390 × 844, the beginner hardware and coding layouts had no horizontal page overflow. The four hardware camera buttons and visible coding controls were at least 48 CSS pixels high. The catalog exposed all five beginner links and the 29 investigation links without a canvas. These are connected desktop-browser and responsive-viewport observations; physical managed Chromebooks, tablets, Edge and assistive-technology acceptance checks remain necessary.

## Babylon engine migration — October 17, 2026

The babylon18 local in-app browser preview rendered the actual Babylon.js 9.31.0 hardware engine and all four non-hardware pathway stations. In the beginner hardware lab, a pointer drag fitted the loose DDR4 module into its motherboard slot; the guided clips, case, screws, cables, startup and original lesson-file steps then completed correctly. In INC-101, visible 3D screwdriver clicks removed both side-panel screws after shutdown and AC disconnection. Dragging the PC HDMI end from the motherboard output to the labeled graphics-card socket changed the real model and action log.

NET-201's monitor displayed the current network settings upright after the canvas texture orientation correction. Saving the correct fictional configuration and running Test connection updated the ordinary checks and 3D status together. AI-301, SEC-401 and CODE-501 each mounted one Babylon station canvas and their Monitor camera preset worked. No browser warnings or errors were observed during these checks.

At 768 × 1024 and 390 × 844, the beginner hardware view fit without horizontal overflow. Its four camera buttons remained 48 CSS pixels high; the narrow view's actual framebuffer was 348 × 405 pixels. Camera Fit/Zoom, route changes, native action controls and the current learning records remained usable. Automated tests additionally cover actual Babylon geometry/picking through a NullEngine GPU boundary, bounded shadows, asynchronous shader readiness at mount and context restoration, touch cancellation, explicit pause and disposal. These are connected desktop-browser and viewport observations, not physical Chromebook, tablet, Edge or battery-life measurements.

## Browser guidance

- [ChromeOS: find and open files](https://support.google.com/chromebook/answer/1700055?hl=en).
- [Apple: find downloaded files on iPhone or iPad](https://support.apple.com/en-us/102440).
- [Microsoft Edge: native file sharing](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/share).
- [Microsoft Edge: managed download restrictions](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/downloadrestrictions).
- [W3C: alternatives to dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
