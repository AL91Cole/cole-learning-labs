# Open learning release and game arcade

The requested release opens all reviewed learning content without an account. It adds 25 game labs, five per pathway, and 12 beginner coding-language paths with eight lessons each. Counts are 42 investigations + 25 game labs + 12 language paths = 79 larger learning choices. Including 15 K–6 activities, five beginner courses and Inbox Defender gives 100 learning activities. Studios, sandboxes and the capstone are extra tools rather than padded activity counts.

## One release setting

`scripts/public-release.mjs` owns `PUBLIC_LAB_ACCESS = 'open'`. This is build configuration, not a browser permission or account role. The open build includes the full reviewed application with local-only requester replies and owner navigation forced off. It publishes the two reviewed student companion pages/PDFs. It excludes raw source modules, membership service code, classroom/demo entry pages, records, credentials and private teacher materials.

To restore the content restriction:

1. Change the single setting to `'preview'`.
2. Run `npm run check`, `npm test`, and `npm run build`.
3. Deploy the reviewed `dist` output through the existing Pages project.

The preview compiler removes the 32 originally restricted investigations, studios, sandboxes, capstone and teaching-resource payloads. It also removes 20 arcade-level definitions, retaining one starter game per pathway. The 12 introductory language paths, Inbox Defender, existing K–6 activities and five beginner courses stay public. Both modes have tests. The built entry URL includes the selected mode so an ordinary reload requests the newly selected bundle. No query parameter, client claim or environment variable can choose a release.

Restoring restrictions controls future delivery; it cannot recall already downloaded code, worksheets or copies. The GitHub source remains public. Content restrictions are not a confidentiality boundary for information already published.

## Boundaries that stay closed

Opening learning content does not change owner Access authorization, authentication factors, membership entitlement, prices, billing activation, classroom enrollment, student-record collection, improvement collection, APIs or terminal deployment. The existing optional services retain their independent source gates. The open build turns online requester replies off; it does not add a provider, key, paid plan or data flow.

Learning content stays fictional and browser-local. Game and language-path progress exists only in the mounted page, resets on navigation and does not grade work or mark investigations complete. Existing investigation saving and report choices remain explicit. The language-fragment inputs accept at most 160 characters per field, render as text and resolve only reviewed fragments. No typed code, SQL, shell commands, import, file access or network operation is executed.

## Game catalogue

| Pathway | Five new game labs | Interaction and goals |
| --- | --- | --- |
| Networking | Packet Post; Gateway Garden; VLAN Village; Resilient Ring; Hop Count Hike | Rotate a connected route; satisfy gateway, separation, failed-link and hop constraints. |
| Hardware | Budget Bot; Quiet Cube; Memory Match; Pixel Stage; Archive Rover | Fit parts to a case; balance budget, compatible memory, cooling, power, display and original-file requirements. Virtual power interlocks apply. |
| Cybersecurity | Permission Park; Firewall Fort; Factor Watch; Backup Bunker; Update Harbor | Configure gates and dispatch fictional couriers. Both useful availability and rejection of unsafe requests matter. |
| AI | Shape Sprouts; Evidence Orbit; Privacy Picnic; Prompt Reef; Fairness Fair | Move evidence cards into appropriate baskets. Keep relevant features, uncertainty, privacy and source trust visible. |
| Coding | Garden Rover; Loop Lagoon; Branch Bridge; Delivery Drone; Bug Trail | Assemble fixed move instructions; collect cargo, use repeats/conditions, fit budgets and debug a route. One program must pass both Branch Bridge rooms. |

The games are simplified teaching models. Networking paths are not packet captures or real VLAN configuration. Hardware units/costs are authored game values. Security couriers carry supplied fictional evidence. AI sorting does not establish real-world model fairness. Rover blocks do not execute a general programming language. Native controls, text maps, focus restoration and reduced motion support access without a drag-only or timed requirement.

## Learning coding languages

Twelve paths cover Python, JavaScript, Java, C++, C#, TypeScript, SQL, Go, Rust, Swift, Kotlin and Ruby. Each starts from no prior knowledge: one short explanation, one tiny example and one task, with feedback and retry. New terms are introduced as they appear. Longer explanations and fragment banks are optional. The first five lessons use code chips; later lessons require typed fragments. Programming paths cover output, values/types, arithmetic, boundary decisions, counted loops, reusable functions, collections and a supply-budget helper. SQL instead teaches result columns, filtering, ordering and aggregates, then a combined query.

Functions and final projects use multiple supplied inputs, including zero or equality boundaries. A correct-looking sample is insufficient when another fixture fails. These are guided language excerpts and bounded practice models, not twelve browser compilers or a complete degree/career curriculum. Surrounding program setup is identified as omitted; the next step is a complete program in an approved learning environment. Existing Python/JavaScript sandboxes provide the local next practice option.

## Verification

Run the whole application suite and the separate membership suite. Model tests exercise all 25 game solutions and failed starts, all 96 language lessons, wrong choices, typed markup, limits, interlocks, multiple fixtures and resets. Controller/router tests verify disposal and separation from accounts, records and collection. Delivery tests compile both modes, verify raw-module exclusions, keep owner capability off in the open artifact and exercise resource access/denial. Browser review should cover representative games from all five categories, typed language lessons, keyboard operation, desktop/narrow layouts and the final public deployment.
