# Detailed 3D assembly

Source release: `20261017-babylon18`, version `2.17.0`.

Start with the investigation's ticket in **Request & clues**, then choose **Open workbench**. Entering that hardware section adopts detailed mechanics once and starts its 3D view. Existing investigations and earlier drafts retain their original fault and progress. Returning to the section keeps the same equipment, screws, paste and cable state. Detailed mechanics stay active until Start over; all mechanical controls also work without WebGL.

The repair view puts the power controls, tool choices, equipment and current feedback first. Tool controls, component controls, camera options and longer build instructions use named native disclosures. Select a tool or a component to reveal its relevant controls, or open a drawer directly. Extended help, worked examples, vocabulary, experiment notebook and activity history start closed. The final **Check & explain** section retains the original-task check and report handoff.

## Equipment and controls

The authored workstation contains removable side panel, PSU, motherboard, processor, cooler, memory, graphics card and original SATA SSD. Eighteen individually modeled screws cover panel (2), PSU (4), board (4), cooler (4), GPU bracket (2) and SSD (2). The case frame and cosmetic ventilation remain fixed. Parts and removed screws move to the virtual tray. Clips, CPU retention, connected leads and exposed thermal paste reflect model state.

The equipment uses original procedural artwork: charcoal case panels with beveled edges, distinct metal/plastic/rubber finishes, PCB traces and silkscreen markings, copper cooler details, modeled fastener heads, sleeved power bundles, and keyed connector housings. SATA data and power connections remain separate, with an L-key detail; the AC connector has its three pins in a triangular arrangement. These are simplified authored training models, with no commercial-game assets or downloaded texture maps.

Choose a tool in the toolbar. Tapping the 3D screwdriver, paste syringe or cleaning wipe also selects its mode. Tool selection changes the interaction mode without changing the equipment or recording a repair. Every operation also has a large native control usable with touch, a trackpad, or Tab/Enter/Space.

| Tool | In the 3D picture | Alternative without dragging or precise aiming |
| --- | --- | --- |
| Inspect | Tap equipment to select it; drag sideways to rotate the view | Choose a component from the list and use the camera preset buttons |
| Move parts | Drag a loose component onto its matching outlined mount, or a fitted component to the parts tray; release to attempt the change | Choose a component, then Fit selected part or Return selected part to tray |
| Connect cables | Drag a cable end onto its labeled socket or Cable rest; tapping an end and then a destination also requests the action | Choose a cable and connection point, then Connect selected cable or Disconnect selected cable |
| Screwdriver | Tap a visible screw head to tighten it or remove it, according to its current state | Choose a screw by its component and number, then Turn selected screw |
| Thermal paste | Tap the exposed processor to apply one pea-sized dot | Apply pea-sized paste to CPU |
| Clean surfaces | Tap the exposed processor to clean the CPU and cooler contact surfaces | Clean CPU and cooler surfaces |

The Move tool shows a temporary part and matching destination. Its authored mount assists alignment and snaps the preview into place; only release requests an equipment change. An incompatible destination or release elsewhere cancels the move. The mechanical model can still reject a correctly aimed drop because a screw, lead, clip, or earlier component needs attention. It explains that reason without completing the repair. Equipment does not use free placement, gravity or physical collision. The illustrated bench retains its separate drag-to-socket workflow.

The always-visible controls below the equipment provide **Zoom out**, **Fit PC**, **Zoom in** and **Focus part**. Select equipment in the picture or component picker, then choose Focus part for a close inspection. Fit PC restores a useful view of the tower. These controls adjust the virtual camera; browser page zoom and ordinary scrolling remain available. Monitor, top, side and rear-I/O presets remain in View options.

In Inspect mode, vertical touch gestures scroll the page. Move parts and Connect cables capture touch movement inside the 3D canvas; switch back to Inspect or scroll outside the picture to move the page. Screws can be small at the default view, so use the selector and Turn button when needed.

Escape cancels a move. Changing tools or camera views, opening My report, hiding the workbench section, navigating away, losing window focus or losing graphics context also discards unfinished movement. The equipment and action history change only when the model accepts an operation; rejected attempts can still appear as feedback in the lab's activity log. Tool and camera choices are temporary view state.

Power off and disconnect virtual AC before internal changes. Remove panel screws and panel to reach the internals. Disconnect leads, release clips and remove fasteners before lifting components. The PSU requires all power leads disconnected. The cooler fasteners follow 1, 4, 2, 3 across opposite corners; lifting the cooler disturbs its paste seal. Clean both surfaces and apply one fresh pea-sized dot before refitting. Excess or disturbed paste prevents a successful startup. Manufacturer instructions differ; no measured thermal or torque physics is claimed.

Mechanical checks participate in startup, original-file delivery and saved-work normalization. A legacy install action cannot bypass these checks after detailed mode begins. Actual mechanical edits invalidate previous startup/delivery; external HDMI actions preserve a healthy loaded OS and require a fresh delivery check. Reports include current screw counts, paste condition, fan lead and retention state, plus action history. This remains an editable teaching model, not tamper-proof grading.

## Connect and disconnect cables

Choose Connect cables, then select a cable in the list or tap its visible 3D end. Labeled connection points identify the authored destinations. Drag the end onto a matching point and release to request connection; drag it onto Cable rest to request disconnection. A tap on the chosen end followed by a destination is an alternative. The native selectors and Connect/Disconnect buttons work without WebGL and avoid precise aiming.

| Modeled cable end | Connection point |
| --- | --- |
| AC power cord | PSU AC inlet |
| HDMI — PC end | Graphics-card or motherboard HDMI output |
| HDMI — monitor end | Monitor HDMI input |
| 24-pin motherboard power | ATX motherboard header |
| 8-pin CPU power | EPS CPU power header |
| Graphics-card power | GPU power header |
| SATA data | Original SSD data socket |
| SATA power | Original SSD power socket |
| Case power-switch lead | Motherboard F_PANEL header |
| CPU fan lead | Motherboard CPU_FAN header |

The status beside the selectors identifies the connected socket or a disconnected, parked end. Selection alone makes no repair. Wrong sockets, canceled movements and invalid picker values cannot create arbitrary workbench commands. An accepted connector still might not solve the fault: this workstation's motherboard HDMI output is inactive, and its HDMI cable also needs a fitted monitor end and the correct input source.

The PC and monitor ends of HDMI are independent. Disconnecting either removes the picture while preserving a healthy running OS and the original SSD files. Reconnecting one end does not reconnect the other; check both before opening the lesson file again. Older supported drafts without the PC-end field retain their previously fitted PC connector. Current reports name both ends, and bounded experiment evidence records their distinct states.

Internal cable changes require PC off, AC disconnected and the case panel removed. Their mounted-component and power-supply checks still apply. Power off before disconnecting AC. Each internal lead is one modeled connection with an authored cable route; the simulation does not calculate wire tension, bend radius, voltage, current or electrical contact resistance. Escape, report opening, section changes and the other cancellation paths above discard an unfinished cable move.

## School-device constraints

Babylon.js 9.31.0 is pinned and self-hosted; see [Third-party software](THIRD-PARTY.md). Its WebGL renderer powers the hardware scene and pathway stations. The home page and lab catalog contain no 3D classroom hub, and the initial request does not load the graphics engine. Entering a hardware workbench starts its detailed view; the beginner hardware explorer also uses that scene. A non-hardware station preview loads only after entering that investigation's workbench. Leaving its section or route during a pending import prevents a late canvas mount. Camera options provide pause and resume; ordinary component controls remain available if graphics cannot load.

The scenes use native Babylon geometry, PBR material surfaces, neutral studio lighting and bounded shadow maps. Authored sRGB swatches are converted to linear material inputs. Monitor textures are drawn locally on canvas. No remote assets, physics dependency or continuous render loop is used. Rendering is requested only when needed, including after asynchronous shader preparation, with pixel ratio capped at 1.5 and approximately 900,000 framebuffer pixels per view. The detailed scene pauses when its section is hidden; pathway previews skip rendering while hidden. Route changes dispose scene resources. Context loss preserves equipment state and leaves ordinary controls available; redraw waits for Babylon's GPU restoration callback. Pause 3D is reversible and is not overridden by returning to a browser tab.

The PC uses one 512-pixel shadow map with no more than twelve large opaque equipment casters; small connector pins, screws, cables and drag ghosts do not cast shadows. Pathway scenes use one 512-pixel map. The selected engine bundle is approximately 2.30 MB before transport compression (approximately 543 KB with the local gzip measurement); it loads only when a graphics activity is opened. HTTP transfer compression can vary with the host and browser.

The earlier Three.js realism16 release measured 188 visible meshes and 11,468 visible triangles in its representative fitted INC-101 scene. That is historical evidence, not a Babylon performance result. Babylon renderer tests use actual engine geometry through a NullEngine GPU boundary, with bounded scene geometry and framebuffer checks. These are scene-budget measurements, not GPU draw-call measurements or a device frame-rate benchmark.

These limits support modest devices but do not establish performance on every Chromebook or tablet. Accept the release on actual managed school hardware, with its browser settings and filtering policy. No new network permissions, device access, telemetry, student service or live AI service is enabled. The production classroom privacy gate remains closed.

## Verification

Automated tests cover complete build, full teardown/rebuild, screw order, power and cable interlocks, paste rework, malformed saves, old-action guards, report-compatible state and strict draft schemas. Navigation checks cover ticket-first entry, original-fault preservation, one-time mechanical setup, draft retention, closed optional guidance and disposal of pending graphics loads. Tool and cable tests check fixed component/socket mappings, ordinary-button alternatives, text-only feedback, independent HDMI ends, bounded observation/report output and the shared model's safety rules. Renderer tests use actual Babylon scene geometry with a NullEngine GPU boundary to check projected pointer interactions, wrong drops, cancellation, resource disposal, pause/context/resize behavior and fallback. They do not measure a physical device's GPU performance or establish native touch behavior.

Source tests and local previews do not verify that this release has reached production. Testing on actual managed Chromebooks, tablets, Edge devices and school networks remains necessary. Record release-specific browser evidence and remaining checks in [Device checks](DEVICE-CHECKS.md) rather than treating earlier release findings as verification of new tools.
