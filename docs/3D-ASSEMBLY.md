# Detailed 3D assembly

In a hardware investigation, open **Workbench & test → Open detailed 3D assembly**. Detailed mechanics stay active for that investigation until Start over. Choose **Load 3D view** when graphics are useful; all mechanical controls also work without WebGL. Existing investigations and earlier drafts retain their original fault when adopting detailed mechanics.

## Equipment and controls

The authored workstation contains removable side panel, PSU, motherboard, processor, cooler, memory, graphics card and original SATA SSD. Eighteen individually modeled screws cover panel (2), PSU (4), board (4), cooler (4), GPU bracket (2) and SSD (2). The case frame and cosmetic ventilation remain fixed. Parts and removed screws move to the virtual tray. Clips, CPU retention, connected leads and exposed thermal paste reflect model state.

Tap equipment or choose it from the component controls. Use the large native buttons to fit, remove, fasten, release, connect and prepare paste. Tab/Enter/Space operate these same controls. Horizontal canvas gestures rotate the camera; vertical touch gestures permit page scrolling. Whole-PC, top, side and zoom buttons provide an alternative to camera dragging. Parts snap to authored locations through their controls; free-form 3D part dragging and physical collision are not implemented. The illustrated bench retains its drag-to-socket workflow.

Power off and disconnect virtual AC before internal changes. Remove panel screws and panel to reach the internals. Disconnect leads, release clips and remove fasteners before lifting components. The PSU requires all power leads disconnected. The cooler fasteners follow 1, 4, 2, 3 across opposite corners; lifting the cooler disturbs its paste seal. Clean both surfaces and apply one fresh pea-sized dot before refitting. Excess or disturbed paste prevents a successful startup. Manufacturer instructions differ; no measured thermal or torque physics is claimed.

Mechanical checks participate in startup, original-file delivery and saved-work normalization. A legacy install action cannot bypass these checks after detailed mode begins. Actual mechanical edits invalidate previous startup/delivery; external HDMI actions preserve a healthy loaded OS and require a fresh delivery check. Reports include current screw counts, paste condition, fan lead and retention state, plus action history. This remains an editable teaching model, not tamper-proof grading.

## School-device constraints

Three.js is pinned and self-hosted; see [Third-party software](THIRD-PARTY.md). The 3D dependency loads on explicit request. Graphics require WebGL2. No textures, external assets, physics dependency, continuous render loop, shadows or post-processing are used. Draws are requested only when needed, at pixel ratio no greater than 1.5 and approximately 900,000 framebuffer pixels. Hidden sections pause graphics; route changes release renderer resources. Context loss preserves equipment state and leaves all DOM controls available. Pause 3D is reversible.

These limits support modest devices but do not establish performance on every Chromebook or tablet. Accept the release on actual managed school hardware, with its browser settings and filtering policy. No new network permissions, device access, telemetry, student service or live AI service is enabled. The production classroom privacy gate remains closed.

## Verification

Automated tests cover complete build, full teardown/rebuild, screw order, power and cable interlocks, paste rework, malformed saves, old-action guards, report-compatible state and strict draft schemas. Renderer tests use actual Three scene geometry with a mock GPU adapter to check resource disposal, pause/context/resize behavior and fallback. They do not measure physical-device GPU performance. Browser findings and remaining device checks are recorded in [Device checks](DEVICE-CHECKS.md).
