# Standards connections for teacher planning

Sources checked October 25, 2026. These are concept-level connections to observable tasks, authored by Mx. Cole. They do not establish full coverage of a concept, individual standard, or grade band. Teachers select the expectation and assess the learner’s work.

## Which New York and national frameworks?

[CSTA New York’s learning-standards guide](https://newyork.csteachers.org/about/learning-standards) directs educators to the **NYSED Computer Science and Digital Fluency Learning Standards**. The educator table uses that state framework alongside the separate **2026 national CSTA PK–12 Computer Science Standards**. It does not label a separate set of state standards as “NY CSTA.”

The [NYSED standards page](https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency) and CSTA New York’s guide identify five state concepts: Impacts of Computing; Computational Thinking; Networks and Systems Design; Cybersecurity; Digital Literacy. The [NYSED FAQ](https://www.nysed.gov/standards-instruction/computer-science-digital-literacy-faq) confirms grade bands K–1, 2–3, 4–6, 7–8 and 9–12. For these secondary labs, the applicable bands are 7–8 and 9–12. [NYSED guidance](https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency-guidance-resources) explains that curriculum decisions are local.

The [2026 national CSTA standards](https://csteachers.org/pk12standards/) identify five foundational concepts: Algorithms & Design; Programming; Data & Analysis; Systems & Security; Computing & Society. AI is integrated across concepts. The [official standards browser](https://csteachers.org/pk12standards/view/) identifies the foundational secondary bands as middle school (6–8) and high school (9–12). High-school specialty standards are separate; this table does not claim specialty coverage.

The [revision explanation](https://csteachers.org/pk12standards/about/) describes the distinction from the 2017 concepts. We use the published 2026 concepts without attaching 2017 standard codes. A district using the earlier edition should choose its own edition-specific crosswalk. Using the national framework does not mean New York has replaced its state framework or that a district has adopted the national revision.

Citation: Computer Science Teachers Association. (2026). *2026 CSTA PK–12 computer science standards*. https://doi.org/10.1145/3820482. See official materials for performance expectations, boundaries, and licensing; no individual standard wording or codes are reproduced here.

## Why each pathway connects

Concept labels describe selected tasks across a pathway, not every activity in every lab.

| Pathway | NYSED concepts | National CSTA 2026 concepts | Observable basis and evidence |
| --- | --- | --- | --- |
| Hardware & ServiceDesk | Networks and Systems Design; Computational Thinking | Systems & Security | INC-101 traces a display path. INC-105 compares storage compatibility. INC-106 connects components and retests the original task. Learners explain a part’s role and a controlled repair; following repair steps alone is not counted as algorithm design. |
| Networking & operating systems | Networks and Systems Design; Cybersecurity; Computational Thinking | Systems & Security; Data & Analysis | NET-208 connects a switch and routed path; NET-210 separates guest access and protects against loops. NET-215 compares link and network headers. NET-213/216 interpret measured call data or error rates. Learners show path changes, explain access rules, or calculate and interpret a rate. |
| AI literacy & audit | Impacts of Computing; Computational Thinking; Cybersecurity; Digital Literacy | Algorithms & Design; Programming; Data & Analysis; Systems & Security; Computing & Society | AI-302 compares unsupported claims and equivalent classification cases. AI-303 reads an ownership-check code preview and tests access. AI-304/305 protect private data and keep source instructions inside a trust boundary. AI-306 compares threshold outcomes by group and explains the small sample. A cited correction, code explanation, privacy choice, or uncertainty analysis supplies evidence. Using chat alone does not. |
| Ethical cybersecurity | Cybersecurity; Networks and Systems Design; Computational Thinking | Systems & Security; Programming; Computing & Society | SEC-401 examines a deceptive message and least privilege. SEC-403 compares ownership-check code previews with allowed/denied fictional requests. SEC-405 contains an incident while preserving evidence. Learners explain the threat, authorized scope, control, and consequences of their choices. |
| Coding sandbox | Computational Thinking | Algorithms & Design; Programming | CODE-501/504 use input-based expressions; CODE-502/505 test decision boundaries; CODE-503/506 trace loop bounds and accumulation. Learners predict outputs, run changed inputs, explain failures, and revise. Open coding sandboxes extend this practice to original bounded programs with text, number-bar, or pixel-tile results. |

The table covers **42 fictional investigations** in five pathways: 8 hardware, 16 networking, 6 AI, 6 cybersecurity, and 6 coding. Each pathway offers lab starting groups 7–8, 9–10 and 11–12. These are suggested lesson entry points. Both high-school starting groups fall within the official 9–12 bands; they are not separate standards bands or proof of grade-level mastery.

Free-build studios are additional practice spaces, not extra investigations in that count. A custom coding project can support Computational Thinking, Algorithms & Design, and Programming when the student plans, writes, tests, and explains a program. A picture, completion indicator, or successful run alone does not establish those learning outcomes. Beginner activities and the capstone remain separate resources, with no additional assessed coverage claimed by this table.

## Use the evidence, not a completion badge

Choose a lab and an official expectation. Ask what the student should explain, build, test, or revise. Review the resulting work and add a transfer question or discussion when the expectation needs more than the simulation provides. The mapping is an instructional interpretation, not official NYSED/CSTA review or endorsement, a full curriculum crosswalk, or certification of mastery.

The educator table filters by pathway, state concept, national concept and lab starting grade. Filters intersect and grade selection refreshes the examples with actual labs in that group. Native labeled selects, an announced result count, table headers, a caption and a keyboard-focusable scroll region remain available. Filtering uses only authored curriculum metadata in the browser.

Review these connections whenever lab tasks or official frameworks change. `src/standards.js` holds the rendered mapping and source links; `tests/standards.test.js` checks the concept vocabulary, task examples, grade bands, filter behavior and cleanup.
