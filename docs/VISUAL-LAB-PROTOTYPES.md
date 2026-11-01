# Visual building and block-programming prototypes

This review adds two small, original interaction prototypes: a parts/workspace/test layout for the existing PC assembly investigation and guided visual programming in the three free elementary coding activities. Interaction references are [Tinkercad Circuits](https://www.tinkercad.com/circuits) and [Tynker's guided coding activities](https://www.tynker.com/parents/curriculum/creating-with-code/). No third-party editor, assets, account system or service is embedded.

## Build a classroom workstation

The new layout applies only to the existing member/owner investigation `INC-106`. A parts tray, the existing interactive PC drawing and a live test panel sit beside one another on wider screens and stack on smaller screens. Existing tools, part placement, cable connections and keyboard/touch alternatives retain their model-controlled actions.

Build, Connect and Power & test observations derive from the current equipment state. Fitting a part is separate from securing its screws, clips, retention or thermal interface. A running fan does not establish successful startup. A visible desktop is separate from checking the original lesson file. Changing equipment can invalidate earlier observations; the guide does not save completed stages or automatically fix equipment.

The existing power and case-access interlocks remain authoritative. The display is an authored teaching model, not real equipment control or a general CAD/electronics simulator.

All new builder-only markup and progress/readout helpers live in `src/assembly-builder.js`. The public compiler substitutes exact inert exports for that module; public starter investigations keep their existing repair interface. The full builder remains on its protected case route. The delivery tests continue to check the absence of authored member payloads in the public artifact.

## Build a tiny program

The existing free activities `EX-CODE-1`, `EX-CODE-2` and `EX-CODE-3` gain an optional block workshop beneath their prediction challenges:

- K–1 moves a picture robot along five spaces with fixed direction and Show blocks.
- Grades 2–3 set a counter, add, repeat an addition and show the result.
- Grades 4–6 also test an if/otherwise decision against the current counter.

Learners can use a drag handle to insert or reorder blocks, or use Add, Move up, Move down and Remove. Run shows the computed result; Step exposes the trace one model operation at a time. Editing clears stale results. Clear and Restore example belong to the workshop; the original prediction challenge's Check, Next and Reset controls remain independent. Neither completing a program nor reaching a value awards a grade or completes the prediction task.

The workshop interprets only validated, known instruction objects. It does not execute JavaScript, generated source, arbitrary labels or uploaded content. Programs have at most 12 blocks and 80 model steps; numeric results stay between -100 and 100, with the younger robot constrained to its five spaces. Repeats and decisions are deliberately small authored teaching operations. The displayed instruction list is explanatory text, never executable code.

## Privacy, access and operation

The new workshop has no free-text input, account, storage, network call, external drag-data import or telemetry. Its draft exists only in the mounted activity's memory and is discarded on navigation/disposal. Drag cancellation, lost capture, blur and cleanup cannot commit a partial placement. Learners can use the fixed controls without dragging.

All 15 elementary activities remain free. The older five beginner courses, two free investigations per topic and free-case workbenches keep their access policy. Full studios, open coding sandboxes, other investigations and teaching resources remain restricted; the owner's separately protected full workspace remains a distinct delivery path.

No prices, live billing, classroom access, student-data collection, improvement sharing, cloud-AI contract, AI budgets or provider account settings are activated or widened by this source change. No dependency, plan or paid add-on is added. Ordinary builds continue to publish only the reviewed free artifact. Public release remains subject to review and merge; any full owner preview must retain the existing Access guards and must never be promoted to production.
