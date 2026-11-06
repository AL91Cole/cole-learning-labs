# Browser-local game missions

Inbox Defender is a free mission for grades K–12 at `#play/inbox-defender`. Home and the lab catalogue link to it. It supplements the existing phishing investigation without changing that investigation's evidence, checks, reports or completion state.

The learner inspects sender, destination and context, chooses a response and checks it. Five authored messages cover a password demand, an expected checklist, an uncertain shared-folder invitation, an unsolicited sign-in approval and a recovery-code prize lure. Relevant evidence and the supported response are both required before advancing. A wrong choice gives feedback and permits a retry. There is no countdown, penalty, ranking or grade. The final review states the limits of the activity and links to SEC-401.

Picture patrol offers five separate, simpler fictional prompts for K–6, with adult support especially in K–1. Learners choose between pausing for trusted adult help and using a planned class bookmark with their teacher. It requires opening the context clue, uses no typed answers and ends with a link to the K–6 activities. The evidence challenge remains aimed at grades 7–12. Selecting a style starts a fresh shift; no age or grade is recorded or inferred from a URL.

An original SVG scene shows a message, shield and class portal. A supported decision moves the message to the shield or through the known route. Unchecked and incorrect choices never show a successful journey. Motion runs once per updated outcome; reduced-motion preferences use the static result. The scene has an accessible text description, and the result is also stated beside the controls. No image service, graphics engine, external asset or canvas interaction is required.

## Boundaries

- Messages are fixed, inert text. The `.invalid` addresses are fictional; there are no live message links, QR codes, uploads, credential fields or real reporting actions.
- The controller accepts only fixed inspection, response, check, advance and restart actions. It cannot invoke the workspace reducer, grant evidence, save reports or unlock content.
- State exists only in the mounted controller. Navigation, page exit and disposal release it and remove listeners. No storage, collection, network, timers, AI or runtime dependencies are added.
- Only `#play/inbox-defender` is recognized. One optional flag, `?style=picture`, opens the picture style first so a lesson page can link straight to it; the learner can still switch style on the page. No other flag is read. URL flags, paths and completion claims cannot select a round, a decision or a finished shift, or confer membership, and no age or grade is recorded from a link.
- After each supported decision the game shows the clue or clues that supported it and one rule for that response: stop and report, verify another way, or continue through a known bookmark. A retry hint names what the message needs and which clue to look at again. Public builds contain the reviewed game within the compiled application; the raw module is not a public endpoint.
- Existing classroom, improvement collection, member-content and owner-preview boundaries remain in force. Hosting and authentication configuration do not change.

## Delivery checks

Run the application syntax check, full suite and public build. Test every round with a correct response, an unsupported response, missing evidence, repeat clicks and replay. Check keyboard focus, status announcements, narrow layout and navigation away/back. The game uses native buttons, a labeled queue and a persistent live announcement region. It has no motion or time limit. Browser checks do not replace an accessibility review or testing on actual school devices.

The complete source-graph budget increases from 1.43 to 1.45 MB for this authored module. The compiled public application keeps its separate sub-1-MB limit. No engine or dependency is added.
