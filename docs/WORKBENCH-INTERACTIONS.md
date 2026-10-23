# Workbench interaction review — v2.28.1

The fitted panel's transparent selection rectangle previously intercepted the centers of the numbered screws. The rectangle now renders behind the screws. Decorative cable paths ignore pointer hits. The cover still hides internal parts and their diagram targets.

Selecting a part shows its current state and named actions beside the picture. The same fixed actions are available in Part controls. The equipment uses the full available workbench width, with a narrow 250px contextual assistant beside it on desktop and the assistant below it on narrow screens. The separate side-panel instruction banner is removed; instructions remain in the student guide and prerequisite messages. All parts & tools is available in the toolbar, so wider repairs do not require finding a setting inside More tools.

The diagram includes all ten cable choices, direct connection markers, a CPU_FAN lead and connection state, CPU retention, RAM clips, the PCIe latch, and an empty cooler mount for refitting. Component actions support click and keyboard activation, with dragging optional. The Monitor group in Part controls includes both HDMI ends, output and input selection, and opening the original lesson file. Actions retain the existing model's power, case access, fastener order, thermal paste and compatibility checks.

The monitor HDMI connector sits beneath the left side of the monitor, with an HDMI IN label and cable path below the bezel. Input remains on the right bezel. Their targets stay separate in the normal and expanded views; moving or reconnecting the cable does not change the selected input.

## Verification

- Controller regressions independently build, fully dismantle, and rebuild the PC through the visual interface and through native Part controls. Each path reaches startup and original lesson-file delivery, with the same equipment result as the model.
- Chrome checks on the local preview confirm the centers of both panel screw circles hit their own targets, rather than the panel. Both click and Enter turn the screws.
- A visual-only Chrome repair disconnects CPU_FAN, removes the cooler's four screws, removes the cooler, cleans and applies paste, selects the empty mount, refits and secures the cooler, reconnects CPU_FAN, closes the case, starts the PC and opens the original lesson file. The separate screw and Part controls drawers remain closed throughout.
- A separate native-controls pass removes and refits the panel and cooler, including fan lead, fasteners and paste preparation, without operating the diagram.
- Independent source review checks fixed action mappings, escaped labels, hidden internal targets and preserved power/AC/panel interlocks.
- `npm run check` passes, the build prepares 74 public files, and Windows runs 1,125 tests: 1,123 passed, two platform-specific symbolic-link tests skipped, no failures. Linux CI must run those link tests with `CLL_REQUIRE_LINK_TESTS=1`.
- At a 1,536px Chrome viewport, the equipment canvas measures about 1,018px beside the 250px assistant, with no page-level horizontal overflow. The panel instruction banner is absent. Larger equipment may require normal vertical scrolling; Expand picture remains available.
- The monitor connector follow-up passes all 56 workbench/cable tests. Chrome confirms the monitor-end target and Input button have disjoint bounds in both normal and expanded views, and hit testing reaches the HDMI target. Disconnecting keeps DisplayPort selected; switching Input while unplugged leaves the cable unplugged; reconnecting then restores the desktop without restarting the PC.

These checks use the authored virtual equipment. They do not establish physical hardware accuracy or completed Chromebook, touch-device, NVDA or ChromeVox acceptance. Those checks remain part of school-device review. This document does not establish production publication; verify the merged revision and deployment separately.
