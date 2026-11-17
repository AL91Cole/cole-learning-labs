// Reviewed public lesson plans and student prompts. No teacher answer guidance or student records.
export const COURSE = {
  "title": "Technology, AI & Cybersecurity Foundations",
  "brand": "Cole Learning Labs",
  "subtitle": "Nine-week introductory course · teacher review edition",
  "grades": "7–8",
  "duration": "Nine weeks · 45 lessons · 40 minutes per lesson",
  "version": "1.0 · November 17, 2026",
  "overview": "Students become a fictional school’s tech team. They explain computer systems, troubleshoot with evidence, model networks, choose safeguards, evaluate AI outputs and build a small program. The final School Tech Help Kit combines these skills. This authored first edition is ready for teacher review and piloting; it has not been field-tested with a class.",
  "outcomes": [
    "Explain how hardware and software support a task, then investigate a fault by predicting, changing one thing, testing and documenting the result.",
    "Model connected devices, names and addresses; design and test rules for delivering a message.",
    "Choose evidence-based responses to fictional digital threats and explain privacy, access and recovery tradeoffs.",
    "Evaluate a supplied AI claim and comparable cases, minimize data, and identify where human review is needed.",
    "Read, modify and test a small program with variables, decisions and repetition, including boundary inputs.",
    "Build an accessible tech-help artifact and defend a revision using observed evidence."
  ],
  "materials": [
    "One managed browser device per learner or pair, with access to www.colelearninglabs.com; a projector supports the alternative whole-class workflow.",
    "The student workbook, paper and pencils or school-managed Google Docs; no Cole Learning Labs account is needed.",
    "Paper cards or slips and scissors for the week 4 message-delivery protocol labs; tape and a marker are optional.",
    "Teacher guide and keys in a staff-restricted school folder; student workbook in a separate student-accessible location.",
    "Google Classroom or the district's approved assignment system for distribution, collection, feedback and grades."
  ],
  "preparation": [
    "Read the course setup and the first lesson. Preview the linked lab on a managed student device on the student network. Confirm keyboard access, display size, link filtering and whether the school permits this public simulation.",
    "Download the student workbook or project brief below. In school Drive, upload the .docx, open it in Google Docs and save a native Docs copy if needed. Check formatting and code indentation after conversion. Copy the relevant day into a school-owned document and attach it to Classroom with Make a copy for each student. Keep confidential teacher answer guidance in staff-restricted school storage.",
    "Create nine Classroom topics (one per week). Share the relevant public lesson page and attach a school-owned copy of its handout. Choose due dates and points in Classroom; this site does not import student names, IDs or grades.",
    "For shared devices use the supplied student/shared-device lab URLs. They disable device work-saving in the current source design; they do not identify a school device, erase earlier saved data, block the plain site address or control Downloads/clipboard history.",
    "Model how to preserve work in the school document before closing a lab. Use fictional details in lab notes. If a report is downloaded, follow the district's endpoint and retention practices; a downloaded copy is separate from the Classroom submission.",
    "Prepare an equivalent printed, dictated or teacher-projected route. Read each lab's supplied fallback data before class. No learner is required to create an AI account, provide a real password, or change a real computer/network setting."
  ],
  "privacy": [
    "Course pages have no response forms, trackers, embedded services or application storage. Write responses in the school’s managed documents and assignment system. Ordinary website requests still reach the hosting provider.",
    "Linked public labs run separately. Their current source uses local simulations with transient page work and optional device saving outside shared-device mode. The course does not request a roster, Google OAuth token, school identity, automatic submission or grade sync.",
    "Share to Classroom opens Google’s posting interface with only the generic public lesson URL. It does not attach a student document, post automatically, select a class for you or confirm submission. Attach the school-owned handout separately.",
    "A no-account lab still involves hosting and security processing, including request metadata such as IP address, path and browser information. This course is not a no-PII, FERPA, COPPA, New York Education Law §2-d or accessibility certification. The district decides the applicable approval and agreement requirements.",
    "Do not publish teacher keys or student work to a public GitHub repository, public Drive link, website or support message. Do not paste real student information into lab free text. School-approved response accommodations and non-digital alternatives receive the same learning criteria.",
    "The public course does not distribute answer keys. Keep teacher answer guidance and student work in school-approved restricted storage. Source checks and a public release do not establish district approval or successful classroom use."
  ],
  "pacing": [
    "Every plan totals 40 minutes: 5 launch, 8 model, 17 investigation, 6 discussion and 4 exit. Times are estimates, not student countdowns. Read ahead for cards, starter code and source evidence.",
    "For 45–50-minute periods add a second test, partner explanation or a retrieval review. For shorter periods split the investigation across two meetings. The course has 45 instructional meetings; local holidays, exams and interruptions may extend it beyond nine calendar weeks.",
    "Start with two minutes of retrieval when useful: ask a learner to explain yesterday's evidence. Revisit labs with a different question rather than counting repeated completion as new mastery.",
    "Pair roles rotate: operator uses the controls while evidence lead predicts and records; both explain. Every learner submits an individual explanation or equivalent oral/dictated response."
  ],
  "assessment": [
    "Use the daily two-criterion check and exit guidance for formative feedback. Score each daily criterion 0 (not yet evidenced), 1 (partial or prompted) or 2 (accurate and supported), for an optional four-point daily check. A correct final screen alone is insufficient; a documented unresolved investigation can show strong reasoning.",
    "Review exit tickets before the next lesson. If the main concept is missing, replay the supplied model or fallback with a new example. Offer revision after feedback; do not grade speed, device access, disability, spelling unrelated to the objective or willingness to use a particular response mode.",
    "Days 10, 20, 30 and 40 provide transfer checkpoints; day 45 is the final demonstration. Compare these artifacts with early work rather than relying on lab pass messages.",
    "The final project uses six criteria scored 1–4 (24 possible points); absent evidence may be recorded 0. Keep grade decisions and accommodations in the school's approved system. No course page computes or syncs student grades."
  ],
  "units": [
    {
      "title": "Computer basics and troubleshooting",
      "days": "1–10",
      "weeks": "1–2"
    },
    {
      "title": "Networks and information travel",
      "days": "11–20",
      "weeks": "3–4"
    },
    {
      "title": "Cybersecurity and privacy",
      "days": "21–30",
      "weeks": "5–6"
    },
    {
      "title": "Responsible AI and introductory coding",
      "days": "31–40",
      "weeks": "7–8"
    },
    {
      "title": "School Tech Help Kit final project",
      "days": "41–45",
      "weeks": "9"
    }
  ],
  "capstone": {
    "title": "School Tech Help Kit",
    "brief": "A fictional school needs a kit that helps a new tech team prepare a room and explain its decisions. Work alone or with a partner, using only invented information. Choose a small problem: count supplies, estimate readiness checks, or give a message based on a fictional quantity. Your kit must combine a small tested program, a computer/network diagram, a troubleshooting procedure and a privacy/security/AI/accessibility explanation. You do not need to complete the site's separate advanced Classroom Opening Day capstone.",
    "deliverables": [
      "One short program using a changing input and either a decision or a loop; an extension may combine both. Include readable output labels. Use the course's local Python subset or an equivalent paper algorithm with traced outputs if device access requires it.",
      "A labeled diagram showing the learner device, network connection and service or destination. Mark where work is stored and which school system receives the submission; distinguish the public simulation from the real school record system.",
      "A four-to-six-step troubleshooting procedure with a symptom, prediction, one controlled change, test and handoff. Demonstrate it on a fictional fault, not school equipment.",
      "A test table with at least three inputs (including a boundary or zero), predicted outputs, observed outputs and one revision or justified confirmation.",
      "A one-page rationale naming a safeguard, minimum necessary data, an accessible alternative, one checked AI-related claim and a human review decision.",
      "A two-minute demonstration and individual reflection: explain one change, its evidence and a remaining limitation."
    ],
    "milestones": [
      "Day 41: problem, audience, success criteria and plan",
      "Day 42: prototype code and labeled system diagram",
      "Day 43: tests and troubleshooting evidence",
      "Day 44: accessible peer review and revision",
      "Day 45: demonstration, submission and individual reflection"
    ]
  },
  "rubric": [
    {
      "criterion": "Troubleshooting reasoning",
      "levels": [
        "Names a symptom but offers an unsupported fix.",
        "Names a plausible cause and test with gaps in the evidence trail.",
        "Connects symptom, prediction, one change, test and original-task verification.",
        "Meets level 3 and explains a competing cause or an honest unresolved next step."
      ]
    },
    {
      "criterion": "Computer and network explanation",
      "levels": [
        "Lists components without explaining their roles.",
        "Shows some correct roles or connections but leaves a key flow unclear.",
        "Labels a usable device-to-service path and explains data/storage and a failure point.",
        "Meets level 3 and explains a limit of the diagram or separates name/address/connectivity tests."
      ]
    },
    {
      "criterion": "Security and privacy choices",
      "levels": [
        "Names a safeguard without explaining its purpose.",
        "Connects one safeguard to a threat but overlooks data or permission needs.",
        "Justifies a safeguard, least necessary access/data and a safe report/recovery route.",
        "Meets level 3 and weighs a practical tradeoff and remaining risk."
      ]
    },
    {
      "criterion": "Program and testing",
      "levels": [
        "Shows code/steps without a traceable input-to-output test.",
        "Uses a changing input with partial logic or incomplete tests.",
        "Uses a variable plus a decision or loop, with labeled output and three explained tests including a boundary/zero.",
        "Meets level 3 and justifies a revision using a failing test or an independently checked edge case."
      ]
    },
    {
      "criterion": "Accessibility and communication",
      "levels": [
        "The kit is difficult to follow and has no equivalent response route.",
        "Uses some labels and steps but a reader still needs avoidable help.",
        "Uses readable labels, ordered steps, meaningful text equivalents and an equivalent oral/paper/control route.",
        "Meets level 3 and improves a specific access barrier identified during peer review."
      ]
    },
    {
      "criterion": "Evidence and responsible AI",
      "levels": [
        "Repeats a claim without showing a source or limit.",
        "Cites some evidence but leaves a claim, fairness issue or review decision unexplained.",
        "Checks an AI-related claim against supplied evidence, identifies a fairness/privacy limitation and assigns a human decision.",
        "Meets level 3 and explains why evidence supports only a bounded conclusion, with a useful alternative or next check."
      ]
    }
  ],
  "extension": "To expand into a semester, retain these foundations and add longer projects, new troubleshooting cases, accessible web design, deeper programming, data investigation and additional standards explicitly selected by the school. Do not label this introductory course as covering every grades 7–8 NYSED standard.",
  "sources": [
    {
      "title": "NYSED grades 7–8 Computer Science and Digital Fluency standards",
      "url": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-7-8.pdf"
    },
    {
      "title": "Google: Add a Classroom Share Button (plain share URL option)",
      "url": "https://developers.google.com/workspace/classroom/guides/sharebutton"
    },
    {
      "title": "Cole Learning Labs public site",
      "url": "https://www.colelearninglabs.com/"
    },
    {
      "title": "Cole Learning Labs source repository",
      "url": "https://github.com/AL91Cole/cole-learning-labs"
    }
  ],
  "crosswalk": {
    "checkedDate": "2026-11-17",
    "title": "Selected NYSED grades 7–8 CS & Digital Fluency connections",
    "verificationNote": "Exact codes and meanings were checked against indexed excerpts of official NYSED documents on November 17, 2026; direct PDF retrieval failed. The final lesson manuscripts were then mapped by the course author. These are selected direct or supporting connections; scope notes distinguish preparatory work. This is not NYSED endorsement, complete grade-band coverage or evidence of individual mastery.",
    "sources": [
      {
        "url": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "title": "NYSED grades 7–8 standards, December 2020",
        "retrieval": "Official indexed excerpts of Impacts of Computing and Computational Thinking pages; direct fetch unavailable."
      },
      {
        "url": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "title": "NYSED grades 7–8 standards at a glance",
        "retrieval": "Official indexed excerpt of Networks and Systems Design, Cybersecurity, Digital Literacy table; direct fetch unavailable."
      },
      {
        "url": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-k-12.pdf",
        "title": "NYSED K–12 standards progression",
        "retrieval": "Official indexed excerpts corroborated AI bias, accessibility, changing variables and combined control structures."
      },
      {
        "url": "https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency-guidance-resources",
        "title": "NYSED guidance and resources",
        "retrieval": "Official indexed page identifies standards-at-a-glance resources and states curriculum decisions are local."
      }
    ],
    "entries": [
      {
        "code": "7-8.NSD.1",
        "paraphrase": "Design a usable, accessible and desirable interface.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "An accessibility inspection alone is supporting practice; require a learner-designed interface or prototype for direct design evidence.",
        "suggestedDays": [
          9,
          42,
          44
        ],
        "finalDays": [
          9
        ]
      },
      {
        "code": "7-8.NSD.2",
        "paraphrase": "Design a project combining hardware and software.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Naming parts is foundational support. A final design must explain how specified hardware and software work together; paper design can support the design process without claiming physical construction.",
        "suggestedDays": [
          2,
          3,
          41,
          42
        ],
        "finalDays": [
          2,
          3,
          7,
          42
        ]
      },
      {
        "code": "7-8.NSD.3",
        "paraphrase": "Troubleshoot computing devices systematically.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Collect a symptom, evidence-based hypothesis, bounded change, test and original-task verification. Virtual cases practice the method without proving ability on physical hardware.",
        "suggestedDays": [
          4,
          5,
          6,
          7,
          8,
          10,
          13,
          14,
          15,
          18,
          20,
          43
        ],
        "finalDays": [
          1,
          4,
          5,
          6,
          8,
          10,
          13,
          14,
          15,
          18,
          20,
          43
        ]
      },
      {
        "code": "7-8.NSD.4",
        "paraphrase": "Design a multipoint data-transmission protocol.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Watching packet animation or building connectivity alone is preparatory. Require learner-designed rules, at least three stations, a trial, and refinement.",
        "suggestedDays": [
          11,
          12,
          16,
          17,
          20
        ],
        "finalDays": [
          11,
          12,
          16,
          17
        ]
      },
      {
        "code": "7-8.NSD.5",
        "paraphrase": "Explain remote data storage and network access.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Ask where the file resides, how a requesting device reaches it, and what enables permitted access; a generic internet drawing is insufficient.",
        "suggestedDays": [
          15,
          19,
          20,
          29,
          42
        ],
        "finalDays": [
          15,
          19,
          42
        ]
      },
      {
        "code": "7-8.CY.1",
        "paraphrase": "Identify personal information and resources requiring protection.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Use fictional data; students do not inventory or disclose their own secrets or school records.",
        "suggestedDays": [
          21,
          24,
          25,
          26,
          30,
          35,
          41
        ],
        "finalDays": [
          21,
          25,
          26
        ]
      },
      {
        "code": "7-8.CY.2",
        "paraphrase": "Choose physical, digital and behavioral safeguards for situations.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "A phishing choice practices behavioral safeguards; include physical and digital examples across the unit.",
        "suggestedDays": [
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          44
        ],
        "finalDays": [
          19,
          21,
          22,
          23,
          24,
          25,
          28,
          30
        ]
      },
      {
        "code": "7-8.CY.3",
        "paraphrase": "Explain tradeoffs from particular safeguards.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Require both a protection benefit and a practical cost or limitation for the same safeguard.",
        "suggestedDays": [
          24,
          27,
          30,
          35,
          44
        ],
        "finalDays": [
          27,
          30,
          35
        ]
      },
      {
        "code": "7-8.CY.5",
        "paraphrase": "Plan actions surrounding unexpected security problems.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Separate preparation from response and recovery. Learners report and act only within the fictional authorized scenario.",
        "suggestedDays": [
          23,
          24,
          28,
          29,
          30,
          43
        ],
        "finalDays": [
          23,
          24,
          28,
          29,
          30
        ]
      },
      {
        "code": "7-8.IC.1",
        "paraphrase": "Compare individual and societal technology tradeoffs.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Identify who benefits and who bears a cost; a feature list alone does not evaluate impacts.",
        "suggestedDays": [
          27,
          31,
          35,
          45
        ],
        "finalDays": [
          31,
          35
        ]
      },
      {
        "code": "7-8.IC.4",
        "paraphrase": "Discuss collection and use of public and private data.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Include purpose, minimum information and effects on people. Public availability does not automatically justify every use.",
        "suggestedDays": [
          26,
          31,
          34,
          35,
          41,
          44
        ],
        "finalDays": [
          26,
          32,
          35,
          44
        ]
      },
      {
        "code": "7-8.IC.5",
        "paraphrase": "Analyze system-bias sources and effects on people.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Connect a plausible data/design source to unequal outcomes and human consequences. One differing output alone does not establish population-wide bias.",
        "suggestedDays": [
          31,
          34,
          35,
          44
        ],
        "finalDays": [
          33,
          34
        ]
      },
      {
        "code": "7-8.IC.6",
        "paraphrase": "Assess accessibility against particular user needs.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Record a user need, an observed barrier, a test and a justified improvement; do not simulate disabilities or claim a conformance audit.",
        "suggestedDays": [
          9,
          41,
          42,
          44
        ],
        "finalDays": [
          9,
          44
        ]
      },
      {
        "code": "7-8.CT.6",
        "paraphrase": "Design, compare and refine task algorithms.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Written steps, pseudocode or flowcharts can show algorithms. A storyboard of outputs alone does not specify an algorithm.",
        "suggestedDays": [
          8,
          16,
          17,
          36,
          38,
          39,
          40,
          41,
          43
        ],
        "finalDays": [
          8,
          16,
          17,
          36,
          38,
          41
        ]
      },
      {
        "code": "7-8.CT.7",
        "paraphrase": "Program a variable that tracks changing information.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "A running total or current count provides direct practice. Merely replacing one hardcoded constant is preliminary.",
        "suggestedDays": [
          37,
          39,
          40,
          42,
          43
        ],
        "finalDays": [
          37,
          39,
          40,
          42
        ]
      },
      {
        "code": "7-8.CT.8",
        "paraphrase": "Combine control structures in a purposeful program.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Official clarification expects structures such as a conditional and a loop to work together. Separate one-condition or one-loop tasks are preparatory.",
        "suggestedDays": [
          38,
          39,
          40,
          42,
          43
        ],
        "finalDays": [
          38,
          39,
          40
        ]
      },
      {
        "code": "7-8.CT.9",
        "paraphrase": "Predict conditional and repeated code behavior to debug.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Keep prediction, actual trace/output, discrepancy and revised test evidence. An observed successful run alone is weak debugging evidence.",
        "suggestedDays": [
          36,
          38,
          39,
          40,
          43
        ],
        "finalDays": [
          38,
          39,
          40,
          43
        ]
      },
      {
        "code": "7-8.CT.10",
        "paraphrase": "Document iterative artifact design using user feedback.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/curriculum-instruction/computer-science-digital-fluency-standards-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Keep earlier version, specific user feedback, a revision and its test. Peer praise without a resulting design decision is not sufficient.",
        "suggestedDays": [
          9,
          20,
          40,
          41,
          42,
          43,
          44,
          45
        ],
        "finalDays": [
          9,
          20,
          40,
          41,
          44,
          45
        ]
      },
      {
        "code": "7-8.DL.5",
        "paraphrase": "Transfer technology knowledge to explore unfamiliar tools.",
        "sourceUrl": "https://www.nysed.gov/sites/default/files/programs/standards-instruction/computer-science-digital-fluency-standards-at-a-glance-mockup-7-8.pdf",
        "evidenceType": "official-indexed-excerpt",
        "scopeNote": "Ask learners to name what prior idea transferred and what changed; merely opening another activity does not show transfer.",
        "suggestedDays": [
          10,
          20,
          30,
          36,
          45
        ],
        "finalDays": [
          10,
          45
        ]
      }
    ],
    "coverageGaps": [
      "This nine-week introductory course is not the whole grade-band curriculum.",
      "Do not claim coverage of 7-8.IC.2 (laws/regulations) or 7-8.IC.7 (career exploration) without explicit additional instruction.",
      "Do not claim coverage of 7-8.CT.1–5 (alternative models, digital-data collection/visualization, functions and parameter abstraction) from simple simulations or arithmetic alone.",
      "Do not claim coverage of 7-8.CY.4 (limitations of cryptography) from password/MFA instruction alone.",
      "Do not claim coverage of 7-8.DL.1 (keyboarding technique) or 7-8.DL.3 (search-tool comparison) merely because learners type or check a source."
    ]
  }
};

export const LESSONS = [
  {
    "day": 1,
    "title": "Start with clues, finish with evidence",
    "objective": "Record a clue, a prediction, a changed condition, and a test result from a fictional troubleshooting activity.",
    "materials": [
      "Managed browser or teacher-projected Student Guide",
      "Paper or a school-managed document; four-column evidence table"
    ],
    "prep": [
      "Open #guide and Restart tour. Locate Ask: What happened? and both inspection buttons. Prepare fallback slips and the Classroom assignment."
    ],
    "vocabulary": [
      {
        "term": "clue",
        "definition": "An observation that helps investigate a problem."
      },
      {
        "term": "prediction",
        "definition": "What you expect a test to show before you run it."
      },
      {
        "term": "verification",
        "definition": "Checking that the original requested task works."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Present a fictional laptop whose class site stopped opening after a move. Learners draw known facts and mark unknowns. Establish the agreement: investigate supplied virtual equipment, use fictional details, and submit through the school system."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain that a symptom names the problem, while a possible cause explains it. “The page will not open” is a symptom; “the cable is loose” is an idea until inspected. Model a prediction with a pretend lamp: if its unplugged cord is the only problem, connecting it should let it light. A successful change supplies evidence; checking the requested reading task finishes verification."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs follow the lab steps as operator and recorder; swap at Make a change. Pause before Send test packet to write predictions. Learners may stop with an accurate partial record; speed and completion banners are not assessed."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare “the cable is connected” with “the requested class site opened.” Invite a prediction that could have failed. Explain that downloading or copying creates a copy, not a Classroom submission."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Read exitTicket aloud. Collect a sentence naming the requested task and a relevant check; accept a spoken response."
      }
    ],
    "lab": {
      "title": "A five-step investigation tour",
      "route": "#guide",
      "steps": [
        "Ask: What happened?; inspect browser and cable. Record two observations.",
        "Choose a symptom and possible cause, then Save first idea. Explain its clue.",
        "At Make a change, Connect cable. Write a prediction before selecting the matching prediction on Test & record.",
        "Send test packet; record the actual result and Save attempt. If it failed, change the condition and predict again.",
        "Check the original task, then finish the tour. Explain how this answers the request."
      ],
      "output": "Submit your four-column evidence record and handout answers through the school Classroom assignment.",
      "fallback": "Supply facts: laptop moved; browser says No connection; cable unplugged. A partner reveals results only after a prediction: Connect cable → class site opens/reply returns; no connection → page fails. Then reveal that today’s requested page opens. Swap roles and explain the evidence."
    },
    "handout": {
      "context": "A fictional learner needs today’s class page. After a laptop move the browser says No connection, and inspection finds an unplugged cable. Change only that connection, test, and verify the requested page. Use no real identifiers.",
      "questions": [
        "Write one observation and one possible cause. Label each.",
        "What did you predict, and what did the test actually show?",
        "Why does checking the class page tell you more than seeing a connected cable?"
      ],
      "checklist": [
        "I separated a clue from an idea.",
        "I recorded prediction and actual result separately.",
        "I identified where to submit my work in Classroom."
      ]
    },
    "discussion": [
      "Can a reasonable prediction turn out wrong and still help an investigation?",
      "What could go wrong if we changed two conditions before testing?"
    ],
    "exitTicket": "A fictional learner needs an audio lesson. A speaker’s power light is now on. What original task should you check before saying the problem is solved?",
    "assessment": {
      "criteria": [
        {
          "label": "Investigation record",
          "lookFor": "A traceable relationship between an observation, a prediction, and an actual result."
        },
        {
          "label": "Verification",
          "lookFor": "A check that refers to the requester’s task, beyond a device indicator."
        }
      ],
      "success": "A learner distinguishes observation from explanation and names a check of the actual requested activity, even if the tour remains unfinished."
    },
    "support": [
      "Provide a four-column table headed Clue, Prediction, Change, Result and allow drawings plus labels.",
      "Read the case aloud and accept oral or district-approved dictated explanations; partners rotate control and recording."
    ],
    "challenge": [
      "Predict what the model would show if the cable were disconnected again, and explain what that repeat test would and would not establish."
    ],
    "standards": [
      "7-8.NSD.3"
    ],
    "standardEvidence": "Supporting practice toward systematic troubleshooting: learners distinguish a prediction from an observation; the full repair method is assessed later."
  },
  {
    "day": 2,
    "title": "Follow a task through computer parts",
    "objective": "Explain how processing, working memory, storage, and a display contribute to one computing task.",
    "materials": [
      "Hardware foundations simulation or projected component descriptions",
      "Paper or school-managed document; four connected boxes"
    ],
    "prep": [
      "Open #learn/hardware. Locate CPU, RAM, SSD, Graphics card, and Monitor item buttons. Stay in Explore; prepare the supplied fact cards."
    ],
    "vocabulary": [
      {
        "term": "input",
        "definition": "Data or a signal supplied to a computer."
      },
      {
        "term": "processing",
        "definition": "Carrying out instructions to work with data."
      },
      {
        "term": "output",
        "definition": "A result a computer produces."
      },
      {
        "term": "storage",
        "definition": "A way to keep saved data for later use."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask what happens between typing 4 + 3 and seeing 7. Gather ideas without requiring technical names. A computing task uses cooperating parts."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Trace the task: keypresses supply input; a program gives instructions; the CPU calculates; RAM holds current work; graphics hardware and monitor produce visible output. Saving records a copy on storage. The monitor does not keep the saved file. Label arrows with actions, avoiding the impression that all tasks follow one rigid four-box route."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs inspect the component buttons and map a task. The reader summarizes each role while the mapper explains an arrow. Swap after RAM. Distinguish a function, such as output, from a component, such as a monitor; no disassembly is needed."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare calculating with opening a saved picture. Address claims that the CPU stores all files or the monitor calculates visible answers. Accept simplified maps with accurate relationships."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect exitTicket. Look for functions tied to the given action, rather than a memorized parts list."
      }
    ],
    "lab": {
      "title": "Map the journey of a saved picture",
      "route": "#learn/hardware",
      "steps": [
        "Inspect SSD, RAM, and CPU in Explore. Write each job in everyday language.",
        "Inspect Graphics card and Monitor; distinguish their roles from saved-file storage.",
        "Map opening a saved picture; label arrows with actions.",
        "Add saving an edited picture in another color. Explain persistence without power.",
        "Exchange maps, challenge one unclear arrow, and revise."
      ],
      "output": "Submit an annotated task map, one revision, and the handout answers through Classroom.",
      "fallback": "Use cards: CPU carries out instructions; RAM holds current work and clears without power; SSD keeps saved files without power; graphics card sends picture signals; monitor displays them. Pairs connect cards for opening a drawing and saving edits. One explains arrows; the other challenges an unclear connection."
    },
    "handout": {
      "context": "A fictional learner opens a saved drawing, changes a color, and saves. SSD keeps saved files; RAM holds current work; CPU carries out instructions; graphics card sends picture information; monitor shows it. Key or pointer actions provide input.",
      "questions": [
        "Choose three components and explain their different jobs in the drawing task.",
        "Why is a visible drawing not enough evidence that the edited version has been saved?",
        "A printer replaces the monitor as the final output. Which parts of your explanation can stay the same, and what changes?"
      ],
      "checklist": [
        "Each arrow in my map has a meaning.",
        "I separated working data from saved data.",
        "I recorded one useful revision after partner feedback."
      ]
    },
    "discussion": [
      "Can two different devices perform the same broad function, such as output?",
      "Why might replacing a screen leave a saved file unchanged?"
    ],
    "exitTicket": "A calculator program receives 8 and 2, adds them, and displays 10. Identify one input, one processing action, and one output.",
    "assessment": {
      "criteria": [
        {
          "label": "Component roles",
          "lookFor": "Different, accurate descriptions of the CPU, RAM, storage, and visual output."
        },
        {
          "label": "System explanation",
          "lookFor": "Arrows and reasoning that connect components to the stated task."
        }
      ],
      "success": "The map distinguishes current work from saved work and accurately connects at least three component roles."
    },
    "support": [
      "Offer labeled component cards and let learners place arrows before writing sentences.",
      "Use large-print fact cards; accept a spoken map explanation or district-approved dictation with a partner pointing."
    ],
    "challenge": [
      "Add a sound output or network input to the map and explain which existing relationships remain useful."
    ],
    "standards": [
      "7-8.NSD.2"
    ],
    "standardEvidence": "Supporting practice toward a hardware/software design: the task trace names component roles. Identifying parts alone does not meet the project-design standard."
  },
  {
    "day": 3,
    "title": "A working computer needs hardware and software",
    "objective": "Use separate startup and file-opening checks to explain why hardware readiness alone does not establish task success.",
    "materials": [
      "Hardware foundations simulation or projected sequence",
      "Paper or school-managed document; two-check evidence record"
    ],
    "prep": [
      "Preview fresh #learn/hardware. Practice requires all nine items and three questions. Verify mini-job buttons through Open the lesson file; prepare fallback state cards."
    ],
    "vocabulary": [
      {
        "term": "hardware",
        "definition": "The physical parts of a computing system."
      },
      {
        "term": "software",
        "definition": "Programs and instructions a computer uses."
      },
      {
        "term": "operating system",
        "definition": "Core software that manages resources and supports applications."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Compare “the machine has power” and “the learner can open the required lesson.” Invite a counterexample: a powered computer can still be starting or unable to find a file."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain that hardware provides capabilities while software supplies instructions. A processor and display do not themselves know which document to open. The operating system manages resources; applications use them for tasks. Here startup loads the original operating system, while opening the lesson is a separate check. A startup pass is limited evidence, not proof of every application or file."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs follow the mini-job with labeled buttons. Pause at Start the PC: record what startup proves before choosing Open the lesson file. Operator reads; recorder keeps the results separate. Swap halfway; use fallback if exploration takes too long."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Build a table: result, supported claim, untested claim. A loaded operating system supports startup; an opened lesson supports that file’s availability. Avoid “every application works.”"
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect exitTicket. Look for a limited conclusion and a next check directed at the request."
      }
    ],
    "lab": {
      "title": "Start the system, then deliver the lesson",
      "route": "#learn/hardware",
      "steps": [
        "Explore nine items and answer three Practice questions; revise using feedback.",
        "Follow mini-job buttons: fit memory, close clips, refit panel, secure both screws.",
        "Follow displayed picture-cable and power instructions. Predict what successful startup establishes.",
        "Start the PC; record the result and what remains untested.",
        "Open the lesson file; record its result and explain hardware/software cooperation."
      ],
      "output": "Submit two separate test observations and the handout answers in the school Classroom assignment.",
      "fallback": "Order cards: A memory not fitted; B memory fitted/clips closed and case secured; C picture cable and power connected; D original operating system loaded; E original lesson opens. Predict before revealing D, then explain E’s additional evidence. Reject decoy: “All software everywhere must now work.”"
    },
    "handout": {
      "context": "The fictional PC must open Lesson_Practice_File.docx. It completes hardware checks, loads its original operating system, then tests the lesson file. These separate observations establish different claims.",
      "questions": [
        "Name one hardware part and one software example involved in this activity. Explain their different roles.",
        "What does the successful startup establish? What important request does it leave untested?",
        "A different computer starts successfully, but its required document will not open. Explain why “startup passed” does not settle that problem."
      ],
      "checklist": [
        "I recorded the startup and file-opening results separately.",
        "I linked each result to a specific claim.",
        "I used fictional task details only."
      ]
    },
    "discussion": [
      "Why is the operating system different from a particular lesson document?",
      "How could a visible success indicator lead someone to make too broad a claim?"
    ],
    "exitTicket": "A fictional computer loads its operating system. The teacher requested a slideshow. What can you conclude now, and what should you check next?",
    "assessment": {
      "criteria": [
        {
          "label": "Hardware/software distinction",
          "lookFor": "A correct physical component example and a correct software example with different roles."
        },
        {
          "label": "Limits of evidence",
          "lookFor": "Separate conclusions about startup and the requested file."
        }
      ],
      "success": "The learner explains that startup is a useful but limited check and names a direct test of the original request."
    },
    "support": [
      "Provide the state cards even when using devices so learners can track the sequence visually.",
      "Read job prompts aloud; allow an oral two-result explanation or district-approved dictation in place of a paragraph."
    ],
    "challenge": [
      "Create another example in which a system starts but a specific application task still fails; name evidence needed to investigate it."
    ],
    "standards": [
      "7-8.NSD.2"
    ],
    "standardEvidence": "Supporting practice toward a hardware/software design: explain the combined roles for a task; complete project-design evidence appears in the final kit."
  },
  {
    "day": 4,
    "title": "An observation is not a diagnosis",
    "objective": "Distinguish symptoms, observations, and hypotheses, then choose an inspection that can separate two possible causes.",
    "materials": [
      "INC-101 virtual hardware workbench or supplied evidence cards",
      "Paper or school-managed document with three labeled columns"
    ],
    "prep": [
      "Open INC-101. Locate Display, Rear connections, Power, and Monitor signal. Inspect only; do not demonstrate repair. Supply handout history without live AI."
    ],
    "vocabulary": [
      {
        "term": "symptom",
        "definition": "The problem a user experiences."
      },
      {
        "term": "observation",
        "definition": "A specific thing found by looking, asking, or testing."
      },
      {
        "term": "hypothesis",
        "definition": "A possible explanation that evidence can support or challenge."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read “The monitor says No signal; the tower lights up.” Is “the monitor is broken” a reported fact or possible explanation? Identify its extra assumption."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model with a fictional printer: blank output is a symptom; an empty ink indicator is an observation; an empty cartridge causing blank output is a hypothesis. A hypothesis may fit evidence without being established. Checking the document preview before replacing anything can separate competing explanations. Use “I observed…” and “I think…because…” to preserve that distinction."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs collect observations without changes. One reads inspection results; the other separates facts from interpretations. Swap after two inspections. Propose two explanations and a further inspection that could distinguish them. An unfinished repair can still produce a complete reasoning record."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare “the tower has power” with “the system works.” What does each clue rule out? Practice precise claims using suggests, supports, and not yet checked."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect exitTicket: a correctly labeled observation and hypothesis, with an explanation of the distinction."
      }
    ],
    "lab": {
      "title": "Inspect before choosing a fix",
      "route": "#lab/INC-101",
      "steps": [
        "Read the request: restore the picture and original lesson. Write the symptom without a diagnosis.",
        "Inspect Display, Rear connections, and Power. Record three observations without changes.",
        "Read Monitor signal; mark any inference in your notes.",
        "Propose two explanations and an inspection that distinguishes them.",
        "Exchange records; underline observations, circle hypotheses, and revise an ambiguous sentence."
      ],
      "output": "Submit the symptom/observation/hypothesis table and a justified next inspection through Classroom.",
      "fallback": "Reveal cards progressively: monitor powered/No signal; source HDMI; tower lights/fans on; cable in upper motherboard output; this model uses a dedicated graphics card; desk moved. Sort observations separately from hypotheses. Before each reveal, ask which competing explanations it could distinguish."
    },
    "handout": {
      "context": "The requester reports No signal although the tower lights up. The monitor has power. A desk move included reconnecting the display cable. Inspect output, source, and power before choosing a diagnosis.",
      "questions": [
        "Write the symptom, one direct observation, and one hypothesis. Label all three.",
        "Give two possible explanations for No signal. What additional observation could help distinguish them?",
        "Why does seeing a tower power light not prove the original lesson can be viewed?"
      ],
      "checklist": [
        "My observations describe what the model actually showed.",
        "My hypothesis is labeled as an explanation to test.",
        "My next inspection has a stated purpose."
      ]
    },
    "discussion": [
      "Can the same observation fit more than one hypothesis? Give an example.",
      "When should a new observation make you revise your first idea?"
    ],
    "exitTicket": "A fictional laptop shows 10% battery and then switches off. Label “the screen showed 10%” and “low charge caused the shutdown” as observation or hypothesis, and explain the difference.",
    "assessment": {
      "criteria": [
        {
          "label": "Evidence language",
          "lookFor": "Symptoms and observations remain distinct from possible explanations."
        },
        {
          "label": "Diagnostic purpose",
          "lookFor": "An inspection is selected because its possible results separate competing ideas."
        }
      ],
      "success": "The learner labels a direct observation and hypothesis correctly and explains the purpose of one next inspection."
    },
    "support": [
      "Provide three headings and the frames “The user reports…”, “I observed…”, and “This may mean…”.",
      "Offer printed readouts in large type; accept a spoken classification and explanation or district-approved dictation."
    ],
    "challenge": [
      "Describe an observation that would weaken your preferred hypothesis and explain how you would respond."
    ],
    "standards": [
      "7-8.NSD.3"
    ],
    "standardEvidence": "Separating observation, hypothesis and a proposed test supports a systematic troubleshooting method; students preserve uncertainty rather than guessing a repair."
  },
  {
    "day": 5,
    "title": "Restore a picture and check the original task",
    "objective": "Use a specific clue to justify one display-path change and verify both the picture and the requested lesson file.",
    "materials": [
      "INC-101 simulation or supplied before/after cards",
      "Paper or school-managed document; clue/change/result/verification record"
    ],
    "prep": [
      "Preview fresh INC-101: Rear connections, cable pickup, labeled sockets, Monitor signal, and lesson-file check. Supply move history without live AI; start from unchanged state."
    ],
    "vocabulary": [
      {
        "term": "signal path",
        "definition": "The connected route carrying information from a source to a destination."
      },
      {
        "term": "controlled change",
        "definition": "One deliberate change made so its effect can be investigated."
      },
      {
        "term": "original task",
        "definition": "The activity the requester needed before the problem occurred."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Return to No signal after a desk move. Ask what evidence pairs need before a change. Keep the goal visible: restore the picture and open the original lesson."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw active output → cable → matching monitor input → screen. A powered screen is only one link. Similar sockets may belong to different hardware, so configuration matters. Model a prediction without revealing the repair: “If this output is the problem, changing only that connection should alter the monitor result.” Opening the requested document tests more than a visible desktop."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Operator identifies a clue and proposed change; evidence lead writes the prediction first. Swap for verification. If a change fails, record it honestly and choose a next inspection. A reasoned unsuccessful attempt remains useful evidence."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare button-only reports with explanations linking clue, configuration, and result. Discuss preserving the existing system and lesson rather than replacing equipment without evidence."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use exitTicket to assess new evidence collection, not repetition of the earlier repair."
      }
    ],
    "lab": {
      "title": "The Blank Monitor investigation",
      "route": "#lab/INC-101",
      "steps": [
        "Inspect Display, Rear connections, and Power; record source, cable ends, and active output.",
        "Choose one clue-based change; record an If/then prediction.",
        "For a cable change use Pick up display cable and a labeled socket; dragging is optional.",
        "Read Monitor signal afterward; record actual result separately.",
        "Use Open lesson file or Check lesson file; record the result and any next inspection."
      ],
      "output": "Submit a clue/change/result/verification record and your handout answers through the school Classroom assignment.",
      "fallback": "Before: tower/OS running; monitor HDMI; both ends fitted; PC cable in upper motherboard output; dedicated graphics card supplies picture. Pairs choose one change, predicting first. Reveal: active graphics output → desktop; source away from HDMI → no picture; replacement storage → display fault remains. On request reveal original lesson opens."
    },
    "handout": {
      "context": "The monitor worked before a fictional desk move and cable reconnection. Now the tower lights up but Lesson_Practice_File.docx is not visible. Inspect this configuration rather than assuming all computers use the same output.",
      "questions": [
        "Which specific clue supported your proposed change, and what did you predict?",
        "What did you change and what did the monitor actually show afterward?",
        "What extra evidence came from opening the original lesson file?",
        "Another room has No signal after a presentation. What should you inspect before repeating your repair?"
      ],
      "checklist": [
        "I changed one condition and recorded its effect.",
        "I distinguished the monitor result from the lesson-file result.",
        "My explanation names evidence rather than only a button."
      ]
    },
    "discussion": [
      "Why might a repair that worked here fail on another computer with No signal?",
      "What makes “the original lesson opened” a stronger task claim than “a light is on”?"
    ],
    "exitTicket": "A different computer shows No signal after someone used its monitor Source button. What evidence would you collect before moving its cable?",
    "assessment": {
      "criteria": [
        {
          "label": "Justified change",
          "lookFor": "A proposed action linked to a configuration clue and a written prediction."
        },
        {
          "label": "Task verification",
          "lookFor": "Separate observations of the display and the requested original file."
        }
      ],
      "success": "The learner explains a clue-based change and a direct check of the original task, or accurately explains a failed attempt and next check."
    },
    "support": [
      "Provide a simple signal-path drawing and let students point to each inspected connection.",
      "Use the ordinary labeled buttons; permit an oral explanation or district-approved dictation and avoid requiring dragging."
    ],
    "challenge": [
      "Predict a counter-test that would challenge your explanation without altering the original storage; explain why it is informative."
    ],
    "standards": [
      "7-8.NSD.3"
    ],
    "standardEvidence": "The investigation connects a symptom and clue to one controlled change, a modeled test and verification of the original task. This is virtual practice rather than demonstrated physical repair."
  },
  {
    "day": 6,
    "title": "Find where the power path stops",
    "objective": "Use before-and-after evidence to explain why one restored connection can leave another fault unresolved.",
    "materials": [
      "INC-102 virtual hardware workbench or power-path evidence cards",
      "Paper or school-managed document; two-attempt table"
    ],
    "prep": [
      "Preview INC-102 power/startup readouts and power buttons. Test only the external connection; plan subsequent internal work without requiring assembly. Print the two-fault scenario."
    ],
    "vocabulary": [
      {
        "term": "power path",
        "definition": "The connections through which a device receives electrical power."
      },
      {
        "term": "fault",
        "definition": "A condition that prevents a system from meeting a requirement."
      },
      {
        "term": "partial repair",
        "definition": "A change that addresses part of a problem while other faults remain."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read the no-lights/no-fans report. The monitor has separate power. Does that prove tower power? Sketch the two paths."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw outlet → AC cord → power supply → motherboard. A chain can contain multiple breaks: connecting the outer cord may be necessary but insufficient when an internal lead is loose. A failed retest can narrow the investigation. Internal virtual work requires power off and AC disconnected. Learners leave real equipment and sealed power supplies alone."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs predict Connect AC’s effect, make that one change, then run Power on / test. Record the remaining warning exactly. Swap roles and plan the next inspection rather than completing internal assembly. Ask what improved and what remains unresolved."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Distinguish a necessary condition from sufficient evidence. External AC is needed but does not establish every downstream connection. Explain what the retest newly revealed."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect a specific downstream inspection with safe conditions, not repeated button pressing or replacement."
      }
    ],
    "lab": {
      "title": "One change, then a fresh power test",
      "route": "#lab/INC-102",
      "steps": [
        "Inspect Power and Power path; record external cord and motherboard connection states.",
        "Predict what Connect AC might fix and what remains uncertain.",
        "Connect AC, then Power on / test. Record the remaining Startup / POST warning.",
        "Compare before/after; name a downstream inspection without replacing parts.",
        "Power off, then Unplug AC before a planned internal inspection. Write eventual original-task checks; stop before assembly."
      ],
      "output": "Submit a before/after table, safe next-step plan, and handout answers through Classroom; unfinished repair is expected in this scoped activity.",
      "fallback": "Diagram: working outlet; AC cord disconnected; PSU switch on; motherboard 24-pin loose; no tower lights/fans. After connecting outer cord, reveal: AC connected; startup still reports missing motherboard power. Mark changed/unchanged conditions and plan safe inspection. Complete verification would require startup, picture, and lesson; do not invent success."
    },
    "handout": {
      "context": "A fictional PC has no lights or fans after a cart move. Its monitor has separate power. Inspection finds disconnected external AC and loose motherboard power. Test one external change and plan follow-up.",
      "questions": [
        "Why does monitor power not establish that the tower’s power path is complete?",
        "After connecting the external cord, startup still fails. What did the change establish, and what remains to investigate?",
        "Name the safe virtual preparation before an internal inspection and the final task checks needed after a complete repair."
      ],
      "checklist": [
        "My table shows both changed and unchanged conditions.",
        "I did not call a partial repair a complete solution.",
        "My next-step plan includes safety and the original task."
      ]
    },
    "discussion": [
      "How can a failure after a change still provide useful evidence?",
      "Why is repeating the power button less informative than reading the new warning?"
    ],
    "exitTicket": "A fictional PC’s external cord is connected, but its startup readout reports missing motherboard power. What should be inspected next, and under what virtual power conditions?",
    "assessment": {
      "criteria": [
        {
          "label": "Multiple-fault reasoning",
          "lookFor": "A distinction between restoring one connection and establishing a complete working path."
        },
        {
          "label": "Safe follow-up",
          "lookFor": "A named next inspection with power off and AC disconnected before internal work."
        }
      ],
      "success": "The learner explains why the first change was incomplete and proposes a specific safe next inspection."
    },
    "support": [
      "Use two colors to mark the external and internal parts of the supplied diagram.",
      "Give the remaining warning as a printed card; accept a spoken before/after comparison or district-approved dictated response."
    ],
    "challenge": [
      "Invent a different two-break chain, such as a signal path, and explain how testing after one repair would expose the remaining uncertainty."
    ],
    "standards": [
      "7-8.NSD.3"
    ],
    "standardEvidence": "A power-path trace and explained partial repair support systematic troubleshooting. Naming the unresolved fault and safe next step is evidence even without completing the case."
  },
  {
    "day": 7,
    "title": "Current work and saved work are different",
    "objective": "Use a supplied save history to distinguish data in working memory from a saved version on storage.",
    "materials": [
      "Hardware foundations Explore or printed RAM/SSD/CPU cards",
      "Paper or school-managed document; timeline with four events"
    ],
    "prep": [
      "Locate RAM, SSD, and CPU in hardware Explore. Prepare the save timeline. Do not test power loss or close real student work."
    ],
    "vocabulary": [
      {
        "term": "RAM",
        "definition": "Working memory that holds current programs and data while powered."
      },
      {
        "term": "saved version",
        "definition": "A recorded copy of work kept on storage."
      },
      {
        "term": "volatile",
        "definition": "Dependent on power to retain its contents, as ordinary RAM is."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Show a fictional drawing: saved blue circle, later unsaved green triangle. Ask what reopens after power loss. Treat autosave as an extra fact to check."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain RAM as working space and storage as a place saved versions persist without power. A desk/folder analogy helps, but computers copy and transform data rather than literally moving paper. Visible edits do not necessarily update saved copies. Apps may autosave or synchronize; follow evidence about that behavior. This case explicitly has autosave off and no recovery copy."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs inspect component roles and create current-work versus saved-work timelines. One narrates the screen; the other tracks the last confirmed save. Swap for the scenario with a later save. Require reasons, not guessed versions."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare “last confirmed save contains…” with guessing from the screen. How would verified autosave change the conclusion? RAM and storage differ even when both use gigabytes."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Check whether learners follow the supplied save history rather than treating the latest screen as saved."
      }
    ],
    "lab": {
      "title": "Investigate two versions of a drawing",
      "route": "#learn/hardware",
      "steps": [
        "Inspect RAM, SSD, and CPU; identify current-work and saved-file roles.",
        "Make Screen/current work and Last confirmed save timeline rows.",
        "Predict reopening after event four; cite the last save.",
        "Insert Save after the triangle; predict again and explain the change.",
        "Answer a partner’s autosave challenge by naming the extra evidence needed."
      ],
      "output": "Submit both annotated timelines and the handout answers through Classroom; use only the fictional drawing data.",
      "fallback": "Arrange the handout events as cards beside RAM/SSD role cards. Mark each version Current work or Last confirmed save, then predict reopening. In round two insert a successful Save after the triangle and repeat. Facts stay visible; no real work is closed or lost."
    },
    "handout": {
      "context": "Autosave OFF. 1: blue circle saved. 2: green triangle added, visible. 3: no Save occurs. 4: power fails, with no recovery copy. Reopening loads the last save. Round two adds successful Save after event 2.",
      "questions": [
        "Which version reopens in round one, and which event supports your answer?",
        "Which version reopens in round two? Explain how the added save changes the evidence.",
        "Why is “I could see the triangle” not sufficient evidence that it was saved?",
        "If autosave were on, what confirmation would help you reach a justified conclusion?"
      ],
      "checklist": [
        "My timeline distinguishes current work and saved work.",
        "I used the case’s explicit autosave setting.",
        "I identified evidence needed when the setting changes."
      ]
    },
    "discussion": [
      "What useful habit follows from knowing the difference between visible and saved work?",
      "Why should we avoid promises that every application can recover unsaved data?"
    ],
    "exitTicket": "Autosave is off. A fictional note says “Bring paper” when saved, then changes to “Bring pencils” without another save. After power loss, this app loads the last saved version. What text returns, and why?",
    "assessment": {
      "criteria": [
        {
          "label": "Memory/storage distinction",
          "lookFor": "A separation between work in use and the last confirmed stored version."
        },
        {
          "label": "Evidence and conditions",
          "lookFor": "Predictions that follow the stated save and recovery behavior."
        }
      ],
      "success": "The learner predicts both rounds accurately with reference to the successful save event and does not assume unspecified autosave."
    },
    "support": [
      "Use blue-circle and green-triangle cutouts instead of requiring detailed drawings.",
      "Read each event aloud and allow a spoken timeline explanation or district-approved dictation; keep facts visible."
    ],
    "challenge": [
      "Add a failed synchronization message after a local save and explain which local and remote copies would need separate verification."
    ],
    "standards": [
      "7-8.NSD.2"
    ],
    "standardEvidence": "Supporting knowledge for designing with hardware and software: distinguish current memory from persistent storage. This day alone does not demonstrate a complete hardware/software project."
  },
  {
    "day": 8,
    "title": "Write instructions someone else can follow",
    "objective": "Revise a troubleshooting checklist after a peer follows it literally and identifies an ambiguous or missing step.",
    "materials": [
      "Student Guide tour or supplied cable-model cards",
      "Paper or school-managed document; numbered checklist draft"
    ],
    "prep": [
      "Open #guide and Restart tour. Verify tutorial controls. Pairs independently draft before exchanging procedures. Prepare supplied model rules; no real network changes."
    ],
    "vocabulary": [
      {
        "term": "algorithm",
        "definition": "An ordered set of steps for carrying out a task."
      },
      {
        "term": "condition",
        "definition": "A fact or test result used to decide which step comes next."
      },
      {
        "term": "ambiguity",
        "definition": "Wording that can reasonably be understood in more than one way."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Write “Fix the internet.” Ask what an unfamiliar reader would do first. Replace it with a named inspection. Useful instructions specify an action, result to notice, and next step."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model “If the library book is on the return shelf, put it on the cart; otherwise check the desk.” Identify condition and branches. “Check it” is ambiguous with several objects. Troubleshooting instructions collect clues, predict before testing, and verify the request. Include a stopping point when evidence differs from the model rather than inventing a repair."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Learners draft independently, exchange checklists, and follow only stated instructions while authors observe silently. Pause at ambiguity and record wording plus interpretation. Swap roles, revise, and retest. Reading aloud is a valid procedure test."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare immediate “connect cable” with inspect-first instructions. How does each handle an already-connected cable? A failed test identifies something to improve in the procedure."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect an individual revision with an observable condition and clear action; length alone is not improvement."
      }
    ],
    "lab": {
      "title": "Peer-test a troubleshooting algorithm",
      "route": "#guide",
      "steps": [
        "Write five to eight numbered steps including inspection, if/otherwise, prediction, test, and verification.",
        "Exchange checklists. Restart tour; follow the author’s words literally.",
        "Record ambiguous wording, missing steps, or unexpected conditions without silently fixing them.",
        "Swap roles, using visible inspection, cable, and test controls as instructed.",
        "Revise and retest one step; explain the observed problem it addresses."
      ],
      "output": "Submit the original checklist, one peer-test observation, the revised checklist, and handout answers through Classroom.",
      "fallback": "Partner model: laptop moved; browser No connection; cable unplugged. Allowed actions: inspect, connect, predict, test, verify. Connected test → page opens; unplugged test → No connection. Follow instructions literally; reveal requested facts only. Repeat from an already-connected state, then revise using both test observations."
    },
    "handout": {
      "context": "An unfamiliar reader needs your instructions. The fictional class page fails after a laptop move. Inspection reveals whether the cable is connected. In this model a working connection opens the page. Specify inspection, conditional action, and verification.",
      "questions": [
        "Write an if/otherwise step that responds to the cable inspection.",
        "Quote one ambiguous or missing instruction found during peer testing and explain the effect.",
        "Show your revised wording and explain how it handles the problem."
      ],
      "checklist": [
        "My procedure has an observable condition.",
        "I kept evidence of the peer test.",
        "I retested the revised step and included the requested page check."
      ]
    },
    "discussion": [
      "When might a checklist need a “stop and ask for help” branch?",
      "Why is having a partner follow instructions more informative than rereading them yourself?"
    ],
    "exitTicket": "Revise “Check it and fix it” into a clear instruction for this fictional condition: the laptop cable may be connected or unplugged.",
    "assessment": {
      "criteria": [
        {
          "label": "Actionable procedure",
          "lookFor": "Ordered, specific actions and a condition that determines a next step."
        },
        {
          "label": "Revision from testing",
          "lookFor": "A change linked to what a peer actually misunderstood or could not do."
        }
      ],
      "success": "The learner writes a clear conditional step and justifies a revision using peer-test evidence."
    },
    "support": [
      "Offer movable cards for inspect, predict, change, test, and verify; students add the missing decision language.",
      "Let partners dictate the checklist through school-approved tools or read it aloud while the tester points to each instruction."
    ],
    "challenge": [
      "Add a branch for “cable connected but page still fails” that preserves uncertainty and chooses a useful next inspection."
    ],
    "standards": [
      "7-8.NSD.3",
      "7-8.CT.6"
    ],
    "standardEvidence": "A learner-authored checklist is an algorithm for a task; a partner follows it and identifies gaps. The revised steps support algorithm comparison and systematic troubleshooting."
  },
  {
    "day": 9,
    "title": "Make a help screen easier to use",
    "objective": "Revise a help-interface prototype using evidence from a keyboard or literal-reading usability test.",
    "materials": [
      "Hardware foundations Explore or printed interface cards",
      "Paper, thick pen, and school-managed document if available"
    ],
    "prep": [
      "Verify hardware Explore item buttons with Tab and Enter/Space, and locate written descriptions. Prepare cards A/B below. A classroom check cannot certify full accessibility."
    ],
    "vocabulary": [
      {
        "term": "user interface",
        "definition": "Controls and information through which a person uses a system."
      },
      {
        "term": "usability",
        "definition": "How effectively people can complete a task with an interface."
      },
      {
        "term": "accessibility",
        "definition": "Design that supports people with differing abilities and access needs."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Present “Click the green thing.” Discuss barriers for color distinction, keyboard operation, or choosing among green objects. Do not ask classmates to disclose or imitate disabilities."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "An interface should name actions and provide information beyond color or gesture. Compare “green thing” with Memory (RAM) and its written role. Keyboard operation, readable text, clear sequence, and feedback support differing needs. One successful keyboard check is evidence about that task, not full accessibility. Record the tested task, observed difficulty, and remaining questions."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs try item selection with labeled buttons, then sketch a help panel. Tester and observer swap after the first prototype. Record behavior, not assumptions about users. Tab moves focus; Enter or Space activates a button. Use printed cards if needed."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare decorative changes with changes addressing observed barriers. Each group names one tested feature and one unknown. Discuss equivalent actions instead of required dragging."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Check that exit responses name the part and an alternative interaction without depending only on color."
      }
    ],
    "lab": {
      "title": "Test and redesign a component-help panel",
      "route": "#learn/hardware",
      "steps": [
        "Select Memory (RAM) with its ordinary button; read the description and record feedback.",
        "Try Tab, then Enter/Space on an item button. Leave browser/accessibility settings unchanged.",
        "Sketch a panel with named action, ordered instruction, and text feedback beyond color.",
        "Have a partner follow it literally by pointing or speaking. Record one observed action or difficulty.",
        "Revise using that evidence and name an unanswered access question."
      ],
      "output": "Submit the first and revised help panels, one test observation, and the handout answers through Classroom.",
      "fallback": "Card A: “Click the green thing,” with two GREEN circles. Card B: “Choose Memory (RAM), then read Its job,” with Memory/Storage buttons and written feedback. Test both; record ambiguity. Design a labeled card and test an alternative where the partner speaks selections instead of pointing."
    },
    "handout": {
      "context": "Design a help screen for selecting RAM and learning its job. Users may rely on keyboard controls, written descriptions, or enlarged print. Test an interaction method without requesting disability disclosures.",
      "questions": [
        "What specific barrier does “Click the green thing” create?",
        "Which feature of your revision addresses that barrier, and how does it help the user complete the task?",
        "What happened during the peer test, and what did you change afterward?",
        "Name one accessibility question your classroom test cannot settle."
      ],
      "checklist": [
        "My action is named without relying only on color.",
        "I included readable instructions and feedback.",
        "I distinguished tested evidence from questions still open."
      ]
    },
    "discussion": [
      "Can a feature improve usability for many people while also addressing an access need?",
      "Why should a designer ask about actual user needs rather than infer them from appearance?"
    ],
    "exitTicket": "Rewrite “Drag the red part there” for a fictional RAM activity so the instruction names the part and offers an alternative to dragging.",
    "assessment": {
      "criteria": [
        {
          "label": "Purposeful design",
          "lookFor": "A concrete interface feature that addresses a named barrier."
        },
        {
          "label": "Test-based revision",
          "lookFor": "A documented observation linked to a change and a limited conclusion."
        }
      ],
      "success": "The learner proposes an equivalent labeled action, uses peer-test evidence to revise, and names a question the test did not answer."
    },
    "support": [
      "Supply a large-print panel outline with places for label, instruction, action, and feedback.",
      "Accept an oral prototype walkthrough or district-approved dictation; students may test by speaking selections instead of using a pointer."
    ],
    "challenge": [
      "Specify how focus or feedback should behave after an action, then explain what another user test would need to observe."
    ],
    "standards": [
      "7-8.NSD.1",
      "7-8.IC.6",
      "7-8.CT.10"
    ],
    "standardEvidence": "A learner-designed help-screen prototype responds to a particular access need, is tried by a peer and revised from feedback. This practices interface design, accessibility assessment and iterative documentation, without a conformance claim."
  },
  {
    "day": 10,
    "title": "Use the method on a different blank screen",
    "objective": "Transfer a troubleshooting method to a new case by selecting a change from current clues rather than repeating a previous repair.",
    "materials": [
      "Fresh INC-107 challenge simulation or sealed evidence cards",
      "Paper or school-managed document; independent reasoning slip"
    ],
    "prep": [
      "Keep INC-107 unseen until today. Verify challenge route, display/rear/monitor inspections, source controls, and lesson check. Prepare face-down fallback evidence; do not demonstrate the repair."
    ],
    "vocabulary": [
      {
        "term": "transfer",
        "definition": "Using a learned method in a different situation."
      },
      {
        "term": "competing explanation",
        "definition": "Another possible cause that should be compared with the evidence."
      },
      {
        "term": "source setting",
        "definition": "The monitor input selected to receive a picture signal."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Present the unseen request without hints: No signal after a presentation; tower running; restore the lesson. Students write their first inspection. Remind them only: clue, one change, verify."
      },
      {
        "minutes": 8,
        "label": "Model the method only",
        "teacher": "Model a different problem: a calculator result differs from a handwritten answer. Inspect entered numbers, correct only a supported error, recalculate, and check the requested quantity. Transfer reuses reasoning; a familiar button need not solve a shared symptom."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Students independently select clues and predictions before paired operation. Operator explains before acting; swap for verification. Offer navigation help without the repair. A justified next test can show more reasoning than a copied success."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare this case with The Blank Monitor: Same symptom / Different evidence. Which clues changed the explanation? Why does final file verification matter?"
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect individual exit responses. Judge transfer using reasoning records, not the completion indicator."
      }
    ],
    "lab": {
      "title": "No Picture After a Presentation: transfer task",
      "route": "#lab/INC-107?mode=challenge",
      "steps": [
        "Read the request; write an inspection before touching change controls.",
        "Inspect Display, Rear connections, and Monitor signal. Collect two clues comparing output/cable and source explanations.",
        "Choose one supported change; predict first, then use labeled controls without unrelated edits.",
        "Record monitor result; use Open lesson file or Check lesson file for original-task verification.",
        "Compare with the earlier repair and name evidence that would challenge your explanation."
      ],
      "output": "Submit your individual clue/prediction record, actual results, comparison with the earlier case, and handout answers through Classroom.",
      "fallback": "Reveal only requested inspections: source DisplayPort; HDMI fitted both ends to active graphics output, no DisplayPort cable; tower/OS running; picture worked before Source changed. After a prediction, reveal action results: select HDMI → desktop; move to motherboard → No signal. Reveal lesson opens only after the working path is restored and requested verification."
    },
    "handout": {
      "context": "Unseen case: picture worked before a presentation; now No signal. Tower runs and nobody opened the computer. Restore the existing lesson without replacement. Collect current clues before choosing a change.",
      "questions": [
        "Which observations helped compare two possible causes?",
        "What change did you choose, predict, and observe?",
        "How did you verify the original task?",
        "What method transferred, and which earlier assumption needed reconsideration?"
      ],
      "checklist": [
        "I selected evidence before a repair.",
        "I kept prediction and result distinct.",
        "My comparison explains why the same symptom can need a different change."
      ]
    },
    "discussion": [
      "What evidence should persuade us to abandon a familiar repair?",
      "What would you tell a technician who wants to replace the monitor immediately?"
    ],
    "exitTicket": "Two fictional monitors both show No signal. In case A the cable uses an inactive PC output; in case B both HDMI ends are correct but the monitor listens to DisplayPort. Explain why the same symptom does not justify the same repair.",
    "assessment": {
      "criteria": [
        {
          "label": "Transfer of reasoning",
          "lookFor": "Current observations determine the chosen change rather than memory of a previous repair."
        },
        {
          "label": "Evidence and verification",
          "lookFor": "A prediction, actual result, original-task check, and comparison of competing explanations."
        }
      ],
      "success": "The learner links new clues to a different explanation and checks the lesson, or explains remaining uncertainty and a justified next test."
    },
    "support": [
      "Offer the three-step method card and an unmarked signal-path diagram.",
      "Read diagnostic cards aloud; accept independent oral or school-approved dictated reasoning before paired operation."
    ],
    "challenge": [
      "Design a third fictional No signal case that changes one different condition, and supply the evidence another learner would need to distinguish it."
    ],
    "standards": [
      "7-8.NSD.3",
      "7-8.DL.5"
    ],
    "standardEvidence": "The unfamiliar display case requires transfer of the systematic method and an explanation of what prior knowledge worked and what changed."
  },
  {
    "day": 11,
    "title": "Follow a message through a network",
    "objective": "Label a local network path and explain the different jobs of a computer, switch, router, DHCP and DNS.",
    "materials": [
      "Managed browser or teacher-projected network foundations lab",
      "Paper or school-managed document; five small cards per pair"
    ],
    "prep": [
      "Open the network foundations lab and read the seven Explore items. Its Practice tab unlocks after the exploration checks. Prepare cards marked PC, switch, router, settings and name lookup; no physical networking equipment is required."
    ],
    "vocabulary": [
      {
        "term": "network",
        "definition": "Connected devices that exchange data or share resources."
      },
      {
        "term": "switch",
        "definition": "A device that connects devices on the same local network."
      },
      {
        "term": "router",
        "definition": "A device that sends data between networks."
      },
      {
        "term": "DNS",
        "definition": "A service that looks up a network address from a name."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask: a student opens a fictional school page; which parts must cooperate besides the screen? Collect three predictions without judging them yet. Explain that the internet connects many networks; a local network can also share a printer without being the entire internet."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw PC → switch → router → another network. Trace the direction of one request and a reply. Explain that a switch connects local devices and a router connects networks. DHCP supplies settings; DNS looks up a name. Use a library analogy carefully: a directory helps find an address but does not carry the visitor there. A cable, a network address and a name lookup answer different questions."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners alternate reader and operator. Follow the lab steps; pause after each practice action to record what changed. In projected use, a student chooses the next control and another describes the result. Ask each pair to add a note to its diagram explaining one service rather than merely copying device names."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare diagrams. Ask why the printer might still work when an outside website is unavailable. Revisit opening predictions and correct the idea that Wi-Fi, the internet and a browser are interchangeable names for the same thing."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit response independently. Look for separate local-connection and name-lookup ideas, rather than requiring technical command vocabulary."
      }
    ],
    "lab": {
      "title": "Connect, get settings, find the page",
      "route": "#learn/network",
      "steps": [
        "Explore each pictured item and complete the displayed checks; use buttons or the picture.",
        "Before Practice, predict what will happen if the page is tried without a cable.",
        "In Practice & test, compare Try the page first with Connect the Ethernet cable. Record the feedback.",
        "Choose Get automatic settings; record the IP-address change. Then choose Open the practice page and compare the name-lookup and page-test facts.",
        "Draw a labeled path and explain what the successful page test demonstrates in this fixed model."
      ],
      "output": "A labeled path and a three-row before/after table for cable, settings and page opening.",
      "fallback": "Place PC, switch, router and page cards in a row. Give the PC three status slips: cable missing; address not assigned; name not looked up. A partner permits delivery only after cable connected, settings supplied and name found. Run once with each missing slip, then all ready. Record each refusal and its reason; explain that these are classroom rules modeling separate dependencies."
    },
    "handout": {
      "context": "Use only the fictional practice network. Record observations in your school document or on paper. The beginner lab has three actions: connect its Ethernet cable, get automatic settings and open its practice page. An outside page may need more services than this simplified model includes.",
      "questions": [
        "Draw a path containing a computer, switch and router. Label the job of each.",
        "What changed after Get automatic settings? How is that different from looking up a page name?",
        "Give one observation from the lab that supports the claim that a connected cable alone is insufficient.",
        "A local printer works but an outside website does not. Why is “every network connection is broken” too strong a conclusion?"
      ],
      "checklist": [
        "I labeled jobs as well as device names.",
        "I recorded an actual result and limited my claim to what it shows."
      ]
    },
    "discussion": [
      "Which shared resource could be useful on a network with no internet connection?",
      "What extra evidence would you want before saying that a real website was available?"
    ],
    "exitTicket": "A fictional PC has a connected cable and an assigned address, but the page name cannot be found. Name the next service you would investigate and explain its job.",
    "assessment": {
      "criteria": [
        {
          "label": "System explanation",
          "lookFor": "Different jobs for local connection, between-network delivery and name lookup."
        },
        {
          "label": "Evidence",
          "lookFor": "One observed dependency, with a cautious claim rather than a universal explanation."
        }
      ],
      "success": "A usable diagram plus an evidence-based distinction between network settings and name lookup; unfinished practice can still provide valid evidence."
    },
    "support": [
      "Provide the five labeled cards and let students arrange and explain them aloud.",
      "Read interface feedback aloud; accept a dictated explanation or an annotated drawing instead of paragraphs."
    ],
    "challenge": [
      "Add a local printer to the drawing and mark which parts an outside-page request might need that a local print request might not."
    ],
    "standards": [
      "7-8.NSD.4"
    ],
    "standardEvidence": "Preparatory network knowledge for protocol design; a traced path alone is not a learner-designed transmission protocol."
  },
  {
    "day": 12,
    "title": "Build a small connected network",
    "objective": "Build and test a network model in which two endpoint devices communicate through a forwarding device.",
    "materials": [
      "Network Studio on a managed device or projection",
      "Paper or school document for diagram and result table"
    ],
    "prep": [
      "Try Clear & start empty and add PC, Switch and Server. Verify port-button operation with a keyboard. The model checks cables, power and forwarding; it does not configure IP addresses or contact devices."
    ],
    "vocabulary": [
      {
        "term": "endpoint",
        "definition": "A device that sends or receives a message for a task."
      },
      {
        "term": "port",
        "definition": "A connection point on a device."
      },
      {
        "term": "forward",
        "definition": "Pass data onward toward another device."
      },
      {
        "term": "topology",
        "definition": "The arrangement of devices and their connections."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Present the task: a fictional PC must request a document from a server through a switch. Ask students to sketch the smallest useful arrangement before opening the model. Distinguish “near each other on the page” from “connected by a cable”."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Show Add a device and the numbered ports. Connect two free ports by selecting one then the other. Explain that the switch can forward between ports; a server is the destination for this task. Demonstrate Source and Destination selectors and read the numbered Packet route. A moving dot illustrates a modeled request and reply; it is not a real packet capture."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs build the three-device topology and record the first test, including any failed attempt. Switch operator and recorder after the first cable. Require a clear diagram with cable endpoints. If a pair finishes quickly, have another pair explain its route without touching the controls."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare two layouts that connect the same devices differently on screen. Ask whether moving a device changes delivery when its connections remain the same. Explain that the useful evidence is the modeled path and result, not how tidy or realistic the drawing appears."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Students answer the exit without their partner. Check for a forwarding device between endpoints and distinguish cable connections from visual placement."
      }
    ],
    "lab": {
      "title": "PC to switch to server",
      "route": "#studio/network",
      "steps": [
        "Choose Clear & start empty. Add one PC, one Switch and one Server.",
        "Select a free PC port and a free switch port to connect them; then connect another free switch port to the server port. Port buttons work without dragging.",
        "Set Source to the PC and Destination to the server. Predict the route before choosing Send packet.",
        "Read Live connection check and copy the numbered Packet route. If delivery fails, compare every cable and power state with your diagram.",
        "Move one device using its Move buttons while keeping its cables. Send again and compare the result."
      ],
      "output": "A three-device labeled diagram, a predicted route and two recorded test results.",
      "fallback": "Draw a PC, switch and server on separate cards, each with numbered ports. Use pencil lines or string to connect PC port 1–switch port 1 and switch port 2–server port 1. One learner walks a paper message along the lines; the switch forwards it and the server returns a reply. Move the cards without breaking lines and repeat. Record what changed and what stayed the same."
    },
    "handout": {
      "context": "Your fictional classroom needs one PC to reach a document server through a switch. Use exactly these three devices for the core task. Network Studio is a simplified cabled-path teaching model; it does not prove anything about a real school network.",
      "questions": [
        "Draw your intended connections and predict the complete PC-to-server route.",
        "Record the first Send packet result. Which visible connection or status supports your explanation?",
        "Move one device without changing its cables. What happens to delivery, and why?",
        "What does a successful Studio test show, and what real-network question does it leave unanswered?"
      ],
      "checklist": [
        "I named both ends of each cable.",
        "I recorded the prediction before the test.",
        "I explained a limit of the model."
      ]
    },
    "discussion": [
      "Why are endpoint and forwarding roles useful even when devices have several ports?",
      "How could a diagram communicate a connection without relying on color?"
    ],
    "exitTicket": "A PC and a server are drawn side by side but have no cable path. Why is their closeness insufficient? Name one arrangement that would provide a modeled path.",
    "assessment": {
      "criteria": [
        {
          "label": "Topology",
          "lookFor": "A connected PC–switch–server path with meaningful device roles."
        },
        {
          "label": "Testing",
          "lookFor": "Prediction and actual result, plus one specific model limitation."
        }
      ],
      "success": "The model or paper simulation has a traceable path, and the explanation separates connections from appearance; a documented failed build is useful formative evidence."
    },
    "support": [
      "Give a three-box diagram with empty cable endpoints and let students fill the labels.",
      "Use port buttons and Move controls rather than dragging; accept an oral route trace recorded by a partner."
    ],
    "challenge": [
      "Add a printer on a spare switch port, change only Destination, and compare which path sections the two tests share."
    ],
    "standards": [
      "7-8.NSD.4"
    ],
    "standardEvidence": "Preparatory connectivity model for protocol design. Direct protocol-design practice is in days 16–17; the Studio does not model learner-authored packet reassembly rules."
  },
  {
    "day": 13,
    "title": "Break one link and explain the evidence",
    "objective": "Use controlled before-and-after tests to locate a modeled connectivity failure and verify recovery.",
    "materials": [
      "Network Studio or projected model",
      "Three-column test log: change, prediction, observation"
    ],
    "prep": [
      "Load classroom network and test PC 1 to Server 4, then PC 1 to Printer 5. The starter has PC–switch–router–server and switch–printer paths. Rehearse unplugging a used port and reconnecting free ports."
    ],
    "vocabulary": [
      {
        "term": "baseline",
        "definition": "A recorded starting condition used for comparison."
      },
      {
        "term": "controlled test",
        "definition": "A test that changes one relevant factor while others stay the same."
      },
      {
        "term": "failure point",
        "definition": "A place where the required path or operation stops."
      },
      {
        "term": "retest",
        "definition": "Repeat a relevant test after a change."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask whether a printer still working proves that a server can be reached. Show the two tasks on a board. Have students predict a failure that could stop one task while leaving the other working."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Define a baseline by recording a successful server test. Explain one-change testing: if several cables and power states change together, a different result does not identify which change mattered. Trace the shared path to the switch and the separate printer and router branches. Compare a narrow claim, “this modeled route fails,” with “the internet is down.”"
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners follow the deliberate break-and-repair steps. The recorder predicts both destinations before the operator unplugs anything. Change roles for the power experiment. Circulate and ask which comparison rules out a competing explanation; do not reward random changes that happen to restore green checks."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Have groups report a failed prediction as useful evidence. Ask what a successful local printer test rules out and what it leaves open. Clarify that the Studio route checker is a model; real networks may have additional paths and services."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit and look for evidence tied to the common versus separate branches of the supplied topology."
      }
    ],
    "lab": {
      "title": "One change, two destinations",
      "route": "#studio/network",
      "steps": [
        "Choose Load classroom network. Set Source to PC 1 and Destination to Server 4; send and record a baseline. Then test Printer 5.",
        "Predict the two results if the switch–router cable is removed. Select one of that cable’s used port buttons to unplug it.",
        "Test both destinations again and record their numbered routes or failure messages.",
        "Reconnect the same free switch and router ports. Retest the original server task to confirm recovery.",
        "Select the switch and toggle its Power control off; predict then test both destinations. Restore power and verify recovery before finishing."
      ],
      "output": "A baseline, two controlled failure comparisons and recovery evidence for the original task.",
      "fallback": "Draw PC–switch–router–server, with a printer branch from the switch. All devices begin powered. Trace paper requests to server and printer. Erase only switch–router, predict and trace both tasks, then restore it. Next mark only the switch off; trace both again. Write a test table showing why the two breaks produce different patterns."
    },
    "handout": {
      "context": "Starting topology: PC → switch → router → server, and switch → printer. Both tasks work initially. For each experiment, change only the named connection or power state. Record results outside the site in your school document or paper log.",
      "questions": [
        "What are the two baseline results, and why record them before breaking anything?",
        "After removing switch–router, compare the server and printer results. Explain the difference with the paths.",
        "How did switching the switch off differ from removing only switch–router?",
        "Which retest confirms that your final repair restored the original task? What does that test not prove?"
      ],
      "checklist": [
        "Each experiment changed one named factor.",
        "I kept failed observations in my log.",
        "I recorded recovery rather than assuming it."
      ]
    },
    "discussion": [
      "How could two simultaneous changes produce a misleading explanation?",
      "Why might an honest unfinished handoff be more useful than an unsupported “fixed” claim?"
    ],
    "exitTicket": "In PC–switch–router–server with a printer on the switch, printing succeeds but the server cannot be reached. Give one plausible failure location and one next test; explain why the working printer is relevant.",
    "assessment": {
      "criteria": [
        {
          "label": "Controlled comparison",
          "lookFor": "Before/after evidence with one named changed factor."
        },
        {
          "label": "Reasoning",
          "lookFor": "Different paths used to explain different task outcomes and a relevant recovery test."
        }
      ],
      "success": "At least one failure prediction is compared with an actual result and one recovery is verified; an incorrect prediction earns credit when revised using evidence."
    },
    "support": [
      "Provide the starter topology and let students trace paths with a finger or ruler.",
      "Offer a prefilled baseline row and accept dictated predictions; use labeled port buttons without animation."
    ],
    "challenge": [
      "Design a different single failure, predict both destinations, and ask another pair to infer its location from your result table."
    ],
    "standards": [
      "7-8.NSD.3"
    ],
    "standardEvidence": "A controlled troubleshooting log and revised explanation practice systematic diagnosis and network-path reasoning."
  },
  {
    "day": 14,
    "title": "Addresses and automatic settings",
    "objective": "Distinguish a device address, gateway and DNS setting, and use a supplied configuration sheet to test a fictional workstation.",
    "materials": [
      "Teacher-scaffolded NET-201 direct practice",
      "Configuration sheet copied from the handout; paper or school document"
    ],
    "prep": [
      "Open NET-201 practice. This is a narrowed use of a lab labeled grades 9–10: supply every numeric setting, require no subnet calculations and stop after comparison and connection checks. Confirm Save network settings, ipconfig, ping and Test connection controls."
    ],
    "vocabulary": [
      {
        "term": "IP address",
        "definition": "A numeric network address used for delivery."
      },
      {
        "term": "default gateway",
        "definition": "The router a device uses to reach destinations outside its local network."
      },
      {
        "term": "DHCP",
        "definition": "A service that can supply network settings automatically."
      },
      {
        "term": "configuration",
        "definition": "The settings used by a device or program."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask how delivery could fail if a letter had the wrong address even when the road was open. Explain that the analogy has limits: network addresses follow technical rules, and this lesson supplies approved values rather than asking students to invent settings."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Display the fictional configuration sheet. Identify the workstation address, mask, gateway and DNS fields. State that the mask describes the local-network boundary; no arithmetic is needed today. Contrast a computer receiving these settings through DHCP with manually copying a reviewed sheet. A cable being up does not establish correct settings, and an assigned address does not itself prove service delivery."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs compare saved values with the sheet before changing anything. One reads digits in groups and the other checks them. Follow the lab steps, preserving the before values. Ask students to explain the purpose of a field rather than memorize all four numbers. Provide the fallback table if the advanced workspace feels overwhelming."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare a successful gateway inspection with the full Test connection result. Explain that a tool answers a particular question: reaching a gateway does not show that every page name resolves. Reconnect the lesson to Day11 automatic settings."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit. Look for correct service roles, not numeric recall or advanced network terminology."
      }
    ],
    "lab": {
      "title": "Compare settings with an approved sheet",
      "route": "#practice/NET-201",
      "steps": [
        "Read the displayed configuration sheet and inspect ipconfig. Record one saved value that differs.",
        "Predict which check might improve when the workstation address matches the sheet.",
        "Copy the supplied workstation address, mask, gateway and DNS into their labeled fields; choose Save network settings. Do not alter your actual device settings.",
        "Use ipconfig again and the displayed ping 10.24.8.1 tool. Record what each tool reports about the saved model.",
        "Choose Test connection and read each check. Explain why saving settings and passing a test are separate actions."
      ],
      "output": "A before/approved/after settings table and two distinct claims supported by diagnostic output.",
      "fallback": "Use this table: saved address 192.168.1.25; approved 10.24.8.25. Saved and approved mask 255.255.255.0 and gateway 10.24.8.1. Saved DNS 192.168.1.53; approved 10.24.8.53. Reveal fictional results: initial gateway fails; after matching address+mask gateway answers; after matching DNS the portal name resolves. Partners act as reader and verifier and explain each result. No real device is changed."
    },
    "handout": {
      "context": "Fictional LAB-PC-12 approved settings: address 10.24.8.25; mask 255.255.255.0; default gateway 10.24.8.1; DNS 10.24.8.53. Portal name: learn.school.test. All numbers and tools belong to the local simulator. Copy supplied settings; do not calculate subnets or open your school device settings.",
      "questions": [
        "Compare one initial saved value with the approved sheet and record the difference.",
        "Explain the workstation-address and gateway fields in everyday language.",
        "Record what ipconfig and the gateway ping each show after saving. Why are these different observations?",
        "How could DHCP help configure many devices, and why would a teacher still verify the resulting task?"
      ],
      "checklist": [
        "I used the supplied fictional values only.",
        "I distinguished saved settings from test results.",
        "I explained one setting without memorizing its digits."
      ]
    },
    "discussion": [
      "Why should a technician use an approved source instead of guessing addresses?",
      "Which part of this work could be automated, and which conclusion still needs testing?"
    ],
    "exitTicket": "A fictional PC receives an IP address automatically. Does that alone prove that a named learning page will open? Explain one additional check and what it would show.",
    "assessment": {
      "criteria": [
        {
          "label": "Settings roles",
          "lookFor": "A clear distinction between device address, gateway and name lookup."
        },
        {
          "label": "Verification",
          "lookFor": "A comparison with the supplied sheet and a claim tied to diagnostic output."
        }
      ],
      "success": "One documented settings discrepancy plus a meaningful explanation of two different checks; exact number memorization is unnecessary."
    },
    "support": [
      "Color is optional: use field names and a side-by-side table with digits spaced for reading.",
      "Let students dictate explanations and have a partner enter supplied values; use the paper results instead of navigating the full workspace."
    ],
    "challenge": [
      "Propose a two-step check that distinguishes a wrong gateway from a name-lookup problem without claiming the checks prove a real website works."
    ],
    "standards": [
      "7-8.NSD.3"
    ],
    "standardEvidence": "Comparing approved settings and interpreting separate diagnostic checks practices network configuration and systematic troubleshooting concepts."
  },
  {
    "day": 15,
    "title": "A name is different from a path",
    "objective": "Use two diagnostic results to distinguish a local connectivity observation from a DNS name-lookup observation.",
    "materials": [
      "Scaffolded NET-201 practice or supplied paper diagnostics",
      "Two-column evidence/claim log"
    ],
    "prep": [
      "Use only the address and DNS comparison portion of NET-201, not the full older-grade investigation. Prepare the approved settings from the handout. Verify that the modeled gateway can answer while the wrong DNS setting leaves nslookup without an answer."
    ],
    "vocabulary": [
      {
        "term": "name resolution",
        "definition": "Finding a network address associated with a name."
      },
      {
        "term": "diagnostic",
        "definition": "A check used to gather evidence about a problem."
      },
      {
        "term": "supported claim",
        "definition": "A statement justified by the available evidence."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Write two statements: “I can reach the town hall” and “I can find the address for the library.” Ask whether one proves the other. Connect this to reaching a numeric gateway and looking up a named learning portal."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Show the simulated ping and nslookup buttons. Explain that ping in this lab checks reachability to one gateway address; nslookup asks the selected DNS service for a name. Read a fictional pair of results: gateway replies, portal lookup has no answer. This does not establish that the whole network is down. A DNS answer also does not prove the web service has opened."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs run the supplied comparison, changing only the DNS value after a baseline. The recorder must write a cautious claim after each check. When groups reach the expected results, ask what alternative failures remain possible on a real network. Do not ask students to use system commands or investigate actual school domains."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Sort claims into supported and too broad: gateway reachable; portal name resolved; entire internet working; actual page opened. Require a reason for each sort. Explain that good diagnosis builds several small justified claims."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Students interpret the new pair of diagnostics in the exit. Look for separation of a DNS answer from service availability."
      }
    ],
    "lab": {
      "title": "Compare gateway and name lookup",
      "route": "#practice/NET-201",
      "steps": [
        "Set the supplied address 10.24.8.25, mask 255.255.255.0 and gateway 10.24.8.1. Keep the initial wrong DNS 192.168.1.53; choose Save network settings.",
        "Predict the two observations, then use ping 10.24.8.1 and nslookup learn.school.test. Record their exact meanings in your own words.",
        "Change only Preferred DNS server to the supplied 10.24.8.53 and save.",
        "Run both tools again. Compare what changed and what stayed the same.",
        "Choose Test connection, read its checks and identify one real-world question the fixed model does not answer."
      ],
      "output": "A two-condition diagnostic table and a revised explanation limited to the evidence.",
      "fallback": "Give pairs these condition cards. A: address and gateway match the approved sheet; DNS is wrong; gateway replies; portal lookup gives no answer. B: same address and gateway, approved DNS; gateway replies; lookup returns learn.school.test→10.24.8.80. Sort four claims: gateway reachable, name found, every website safe, page definitely opened. Explain which claims each card supports."
    },
    "handout": {
      "context": "Use approved address 10.24.8.25, mask 255.255.255.0 and gateway 10.24.8.1. Compare wrong DNS 192.168.1.53 with approved DNS 10.24.8.53. The fictional portal is learn.school.test; these tools inspect saved local simulation choices and send no real network traffic.",
      "questions": [
        "Predict the gateway and name-lookup results with the wrong DNS setting.",
        "Record both results before and after changing only DNS. Which observation changed?",
        "Explain why a successful gateway ping is insufficient evidence that name lookup works.",
        "If a lookup returns a portal address, what additional evidence would you need to say the actual web service opened?"
      ],
      "checklist": [
        "Only DNS changed between my two conditions.",
        "My explanation names which tool supports each claim.",
        "I stated one remaining uncertainty."
      ]
    },
    "discussion": [
      "Why is “no answer” more careful than saying the website does not exist?",
      "How can a technician communicate uncertainty without being unhelpful?"
    ],
    "exitTicket": "A gateway responds, and a DNS lookup returns an address for a fictional portal. A student concludes, “The portal opened and its content is accurate.” Which parts of that conclusion are still untested?",
    "assessment": {
      "criteria": [
        {
          "label": "Diagnostic distinction",
          "lookFor": "Separate meanings for gateway reachability and name resolution."
        },
        {
          "label": "Claim limits",
          "lookFor": "A remaining service or content question identified after a successful lookup."
        }
      ],
      "success": "Both diagnostic results are interpreted separately, and the student avoids inferring actual page delivery or accuracy from lookup alone."
    },
    "support": [
      "Provide check-result cards so learners can compare meanings without copying technical output.",
      "Read names and numeric addresses aloud; accept a spoken evidence/claim explanation or a two-color-free labeled diagram."
    ],
    "challenge": [
      "Write a short handoff for another technician listing what is known, what is unknown and the next narrowly targeted check."
    ],
    "standards": [
      "7-8.NSD.3",
      "7-8.NSD.5"
    ],
    "standardEvidence": "Interpreting paired diagnostics and limiting conclusions practices systematic troubleshooting and the distinction between names, addresses and services."
  },
  {
    "day": 16,
    "title": "Invent rules for delivering a message",
    "objective": "Design and test a classroom protocol that identifies a destination and puts a split message back in order.",
    "materials": [
      "Eight paper slips per group and pencils; envelopes optional",
      "Three desk stations labeled Sender, Relay and Receiver; Network Studio optional"
    ],
    "prep": [
      "Prepare message cards from the handout, including a different destination’s card. Keep one card aside for the missing-card round. This tabletop activity supplies packet splitting, sequencing and learner-designed rules; Network Studio does not model those behaviors."
    ],
    "vocabulary": [
      {
        "term": "protocol",
        "definition": "Agreed rules for communicating."
      },
      {
        "term": "packet",
        "definition": "A unit of data sent through a network with delivery information."
      },
      {
        "term": "sequence number",
        "definition": "A label showing a piece’s intended place in a message."
      },
      {
        "term": "acknowledgement",
        "definition": "A reply indicating that specified information arrived."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Send three unnumbered slips reading “BLUE”, “OPEN”, “BOX” to a volunteer in mixed order. Ask why arriving pieces may still fail to communicate the intended sentence. Distinguish data content from the delivery labels around it."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain that communicating parties need compatible rules. Demonstrate an envelope with sender and destination but leave ordering rules for students to design. Real protocols vary; today’s desk relay is a simplified model, not a complete internet protocol. Explain that a relay passes a labeled piece onward while the receiver assembles the message."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Groups of three or four assign sender, relay, receiver and observer roles. Give groups the supplied message and ask them to write rules before sending. The observer mixes cards and inserts a different destination’s card. On the second round, hold one legitimate card back. Let students discover the need for total-count or completion information; do not provide a finished protocol."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare the group rules. Ask which labels helped with destination, ordering and recognizing incompleteness. Explain that an acknowledgement must identify what arrived; “got it” can be ambiguous when several messages are in transit."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit and the first protocol version. Evaluate whether another group could follow the rules rather than rewarding a particular label format."
      }
    ],
    "lab": {
      "title": "Tabletop packet post: protocol version1",
      "route": "#studio/network",
      "steps": [
        "Use the handout message and stations; write your sender/receiver rules before moving slips. Network Studio is an optional comparison of paths only.",
        "Split the intended message into three content cards. Add the delivery labels your group thinks a receiver needs.",
        "Give all slips to the relay, who mixes them and inserts the different-destination card. The receiver follows only the written rules.",
        "Compare the received sentence with the intended message. Record one success and one ambiguity.",
        "Repeat with one intended card withheld. Write a question or rule change that would help the receiver recognize incomplete delivery."
      ],
      "output": "Protocol version1, labeled message cards or a written copy, and observations from mixed and missing-card rounds.",
      "fallback": "The tabletop lab is already the no-device option. For individual work, make three envelopes labeled sender, relay, receiver; shuffle the slips yourself and work through the written rules. Use an adult or partner to withhold one card without revealing which. If cards are inaccessible, dictate labels and order to a recorder."
    },
    "handout": {
      "context": "Intended message M1 from station A to station C: “OPEN / BLUE / BOX”. Distractor message M2 goes from A to station D and contains “CLOSE”. The relay must mix the delivery order. Round2 withholds one M1 card. Your group decides delivery labels, order rules and how the receiver knows a message is complete. Do not use names or private messages.",
      "questions": [
        "Write rules that a new sender, relay and receiver could follow, including how to identify a destination.",
        "Show the labels and content on your three M1 cards. Explain how the receiver orders them.",
        "Record the mixed-order round result and explain one rule that helped.",
        "In the withheld-card round, how could the receiver tell that delivery was incomplete? Identify a rule to revise tomorrow."
      ],
      "checklist": [
        "My protocol is written before the test.",
        "My evidence includes a mixed-order and a missing-card round.",
        "I identified a specific ambiguity to improve."
      ]
    },
    "discussion": [
      "Can cards arrive correctly but communicate an incorrect sentence?",
      "Why must both sides agree on the meaning of a label?"
    ],
    "exitTicket": "A receiver gets pieces labeled M7:1 and M7:3. What additional protocol information would help it recognize and request missing information?",
    "assessment": {
      "criteria": [
        {
          "label": "Communication rules",
          "lookFor": "Usable destination and ordering rules that another learner can follow."
        },
        {
          "label": "Evaluation",
          "lookFor": "A test observation identifying incomplete delivery or ambiguity and a specific revision idea."
        }
      ],
      "success": "The protocol delivers an ordered message in one test and identifies one limitation in a second; discovering a failure is meaningful evidence."
    },
    "support": [
      "Provide blank card boxes labeled destination, message and position while letting students decide values and completion rules.",
      "Use large-print slips, tactile order positions or dictated cards; let the observer role participate without moving between desks."
    ],
    "challenge": [
      "Add two simultaneous messages to the same destination and explain what extra label prevents their pieces being mixed together."
    ],
    "standards": [
      "7-8.NSD.4",
      "7-8.CT.6"
    ],
    "standardEvidence": "Learners design, test and critique their own communication protocol, producing destination, ordering and incomplete-delivery evidence."
  },
  {
    "day": 17,
    "title": "Improve a protocol when delivery goes wrong",
    "objective": "Revise and compare communication protocols using missing, duplicate and out-of-order message tests.",
    "materials": [
      "Day16 rules or the starter rules supplied in today’s handout",
      "Paper packet slips, test log and three station labels; optional Network Studio"
    ],
    "prep": [
      "Make all packets and test conditions from the handout. A group absent yesterday can use the starter rules. Do not make the task a race; compare reliability and clarity using the same three tests."
    ],
    "vocabulary": [
      {
        "term": "retransmit",
        "definition": "Send specified information again."
      },
      {
        "term": "duplicate",
        "definition": "An additional copy of the same piece."
      },
      {
        "term": "reliability",
        "definition": "How consistently a process meets its intended task under stated conditions."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read a vague reply: “Some of it arrived; please send it again.” Ask what the sender needs to know to respond usefully. Students identify message identity, missing position and destination as candidate information."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Show packets M9:1/3, M9:2/3 and M9:3/3. Explain the slash as a convention this group must define, not a universal network format. Model a reply that identifies a received or missing position. Discuss duplicates: retrying can restore missing information but may also deliver an extra copy, so the receiver needs a rule. Avoid claiming that these rules guarantee delivery."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs or small groups revise yesterday’s protocol, then exchange it with another group. The testing group follows only the written rules under the three supplied conditions. Require the same conditions for both protocols so the comparison is meaningful. The authors observe silently first, then revise confusing language."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare how many tests produced the intended message and how much extra communication was needed. Ask whether a more detailed protocol can improve reliability while increasing work. Explain that real networking also balances constraints; our evidence covers only the classroom tests."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit plus revised rules. Look for an identifiable request and a duplicate-handling rule with a clear reason."
      }
    ],
    "lab": {
      "title": "Tabletop packet post: protocol version2",
      "route": "#studio/network",
      "steps": [
        "Use the supplied starter or Day16 rules. Add a method for recognizing completeness, requesting missing pieces and handling duplicates.",
        "Exchange only the written rules with another group. Give the same message cards and three test conditions to both groups.",
        "Run out-of-order delivery, missing-card delivery with a later retry, and duplicate delivery. Record the receiver’s final sentence and any ambiguous step.",
        "Compare the protocols using completion, order and duplicate-handling evidence, not speed.",
        "Revise one rule and rerun the condition that exposed its weakness. If using Network Studio afterward, state that its moving dot does not test your protocol."
      ],
      "output": "Two protocol versions, a three-condition test table and one evidence-based comparison of another group’s rules.",
      "fallback": "All materials are paper. For a small class, the teacher plays relay using the exact supplied conditions while learners act as receiver and rule reviewer. For one learner, read each condition as a script and annotate the next action; an oral explanation and recorder provide an equivalent response route."
    },
    "handout": {
      "context": "Message M9 from A to C has cards 1/3 “CHECK”,2/3 “THE”,3/3 “CABLE”. Starter rules: deliver only cards addressed to C; group by message; sort by position; assemble when all positions 1 through total are present. Add your own missing-piece reply, retry and duplicate rules. Test A delivers3,1,2; test B delivers1,3 then allows the sender one reply/request exchange; test C delivers2,1,2,3. No real network is used.",
      "questions": [
        "Write your revised rules so another group can follow them without verbal help.",
        "Record final message and incomplete/duplicate handling for each of the three tests.",
        "Compare another group’s protocol with yours using the same conditions. Which specific evidence supports your comparison?",
        "Identify one rule you changed after peer testing and explain what improved or remains uncertain."
      ],
      "checklist": [
        "My comparison used the same tests.",
        "I documented both a reply/retry rule and a duplicate rule.",
        "My revision names the evidence that prompted it."
      ]
    },
    "discussion": [
      "When might repeated acknowledgements add unnecessary work?",
      "What failure have our three tests still not investigated?"
    ],
    "exitTicket": "For message M9, a receiver has pieces1/3 and3/3. Write a useful reply requesting what is missing, then describe how it should handle a repeated copy of piece 1/3.",
    "assessment": {
      "criteria": [
        {
          "label": "Protocol refinement",
          "lookFor": "Explicit completeness, targeted request and duplicate-handling rules."
        },
        {
          "label": "Comparison",
          "lookFor": "A fair comparison using identical tests and a revision tied to observed ambiguity."
        }
      ],
      "success": "The revised protocol handles the three stated conditions or clearly documents an unresolved failure and a reasonable next revision."
    },
    "support": [
      "Provide a test table with condition names and blank result cells; read the starter protocol together.",
      "Use tokens, dictated labels or a stationary observer role instead of small-print cards and physical movement."
    ],
    "challenge": [
      "Add a lost acknowledgement test. Explain how repeated retries could occur and propose a bounded stopping or handoff rule."
    ],
    "standards": [
      "7-8.NSD.4",
      "7-8.CT.6"
    ],
    "standardEvidence": "A tested, revised and compared learner-authored protocol provides direct evidence for communication-rule design and evaluation concepts."
  },
  {
    "day": 18,
    "title": "Wi-Fi coverage needs evidence",
    "objective": "Use a fictional signal and channel survey to justify an access-point plan and distinguish coverage from interference.",
    "materials": [
      "NET-204 wireless practice or projected model",
      "Supplied room readings and channel survey; paper or school document"
    ],
    "prep": [
      "Read NET-204 room map and survey. Verify the placement field, saved settings and tools survey channels, measure desk and show radio. Use the approved 5 GHz/channel 40/20 MHz radio settings as supplied; focus on comparing evidence rather than radio configuration mastery."
    ],
    "vocabulary": [
      {
        "term": "access point",
        "definition": "A device that provides a wireless connection to a network."
      },
      {
        "term": "coverage",
        "definition": "Whether a usable radio signal reaches the needed location."
      },
      {
        "term": "interference",
        "definition": "Other radio activity that can make communication more difficult."
      },
      {
        "term": "channel",
        "definition": "A selected part of a radio band used for communication."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "A fictional tablet works at a doorway but loses its connection at a reading desk. Ask students to propose two explanations. Explain that location-dependent failure gives a clue, not a complete diagnosis."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Read the three supplied desk measurements: cupboard −79dBm, hallway −74dBm, ceiling-center −58dBm. The target is at least −67dBm; on this scale−58 is greater than−67. Use a number line to avoid treating a larger absolute negative value as stronger. Explain separately that a suitable signal can coexist with neighboring channel overlap. No one will move school equipment or run a scan."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs predict placement results, inspect the fixed survey and compare saved settings. One learner changes a fictional mounting choice while the other records both coverage and survey evidence. After testing, ask why the desk signal alone is insufficient for the entire plan. Keep the expected radio values visible as support."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare a plan justified by “strongest signal” with one justified by the desk requirement, supported clients and survey. Explain that these fixed readings do not predict every real classroom, device or future radio condition."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Students interpret the new hypothetical reading in the exit. Look for separating signal success from interference evidence."
      }
    ],
    "lab": {
      "title": "Reading desk wireless survey",
      "route": "#practice/NET-204",
      "steps": [
        "Inspect the room map and client specification. Predict which placement meets the desk target.",
        "Use measure desk and survey channels to record the initial coverage and channel observations.",
        "Compare cupboard, far hallway and ceiling-center placement in the model, saving each setting before inspecting its reading. Keep supplied 5 GHz, channel 40 and20 MHz choices.",
        "Choose the workspace test after the final choice and read every check rather than relying on a preview.",
        "Write a recommendation using one coverage observation and one separate channel/client observation."
      ],
      "output": "A three-placement reading table and a short recommendation with coverage, survey and model-limit evidence.",
      "fallback": "Use the handout’s three placement readings. Place an AP card at each location on a drawn room and mark pass/fail against−67dBm. Add survey cards: neighbors occupy5 GHz36 and 44;40 is clear at 20 MHz;80 MHz overlaps them; tablets support 5 GHz. Compare a strong-signal plan using 80 MHz with a strong-signal plan using 20 MHz. Record which separate requirement each meets."
    },
    "handout": {
      "context": "Fictional reading desk target: signal at least −67dBm. Readings: metal cupboard −79dBm; far hallway −74dBm; ceiling-center −58dBm. Tablets support 5 GHz. Survey: channels 36 and 44 occupied;40 clear at 20 MHz;80 MHz overlaps neighbors. These are supplied fixed observations, not results from your school.",
      "questions": [
        "Which placement readings meet the target? Show the comparison on a number line or explain it.",
        "Record the actual modeled or supplied result for your proposed placement.",
        "Why must you inspect the channel survey even when the signal target is met?",
        "Write a recommendation and one limitation that would require a real technician’s later review."
      ],
      "checklist": [
        "I used one coverage and one interference/client observation.",
        "I interpreted the negative readings correctly.",
        "I made no changes to real equipment."
      ]
    },
    "discussion": [
      "How does the doorway-versus-desk pattern help choose a useful test?",
      "Why could a future real survey differ from this fixed teaching dataset?"
    ],
    "exitTicket": "A fictional desk reading is −60dBm against a target of at least −67dBm, but the selected wide channel overlaps neighbors. Has the whole plan passed? Explain the two separate observations.",
    "assessment": {
      "criteria": [
        {
          "label": "Data interpretation",
          "lookFor": "Correct comparison of negative signal readings against a stated target."
        },
        {
          "label": "Recommendation",
          "lookFor": "Coverage and interference treated as separate requirements, with a model limitation."
        }
      ],
      "success": "A recommendation cites two distinct observations and avoids claiming that signal strength alone establishes a complete wireless plan."
    },
    "support": [
      "Supply a number line marked−80,−70,−67 and−58, and let learners place reading cards.",
      "Read units and labels aloud; accept a dictated recommendation or labeled room diagram instead of a paragraph."
    ],
    "challenge": [
      "Propose where and when a technician should take additional readings before adopting a real-room plan, without asking learners to scan or change the school network."
    ],
    "standards": [
      "7-8.NSD.3"
    ],
    "standardEvidence": "Comparing modeled network-quality observations and defending a bounded recommendation practices network troubleshooting and evidence evaluation."
  },
  {
    "day": 19,
    "title": "Find a remote file without opening everything",
    "objective": "Explain that reaching a shared file and having permission to read it are separate requirements, and test both an allowed and a denied action.",
    "materials": [
      "Scaffolded NET-202 practice",
      "Three cards: identity, network path, permission; school document or paper"
    ],
    "prep": [
      "Use a narrow NET-202 task: its fictional teacher is already verified, Project Materials and Read are initially selected. Rehearse changing only Connected network from School-Guest to Staff-Lab, saving and testing read/write. No real account, network settings or credentials are used."
    ],
    "vocabulary": [
      {
        "term": "shared file",
        "definition": "A file made available to authorized users through a network service."
      },
      {
        "term": "authentication",
        "definition": "Checking evidence about an identity."
      },
      {
        "term": "authorization",
        "definition": "Determining which actions an identity is permitted to perform."
      },
      {
        "term": "least privilege",
        "definition": "Allowing only the access needed for the task."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Give the scenario: a verified teacher can browse the web but cannot open a shared handout. Ask whether allowing every folder and editing everything is a sensible first fix. Collect reasons before showing the policy."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain three separate questions: who is asking, is there an approved path to the resource, and what may that identity do? A library card does not grant access to every staff room or permission to rewrite books. In this simulation the identity is already verified; guest isolation blocks the internal share. The task requires reading one folder, so changing the path should not silently expand permissions."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs record the initial network, folder and permission. Read the policy, change only the network and test. Require both read and write observations: a useful security test includes a permitted action and an action that should stay denied. Students state where the file resides in their diagram, rather than drawing it as a file on every PC."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare “I opened the handout” with “the access plan meets the request.” The first is insufficient if unrelated folders or editing were also exposed. Explain that a permission denial can be a successful security result."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit. Look for an allowed/denied test pair and a reason tied to the read-only task."
      }
    ],
    "lab": {
      "title": "Read the handout, preserve the boundary",
      "route": "#practice/NET-202",
      "steps": [
        "Read the access request and policy. Record initial Connected network, Folder to share and What the teacher can do.",
        "Use read handout to inspect the initial failure. Predict whether changing only the network can meet the request.",
        "Select Staff-Lab while retaining Project Materials and Read; choose Save access settings.",
        "Run read handout and write handout. Record which action is allowed and which is denied.",
        "Choose Test teacher access. Draw the workstation, approved network path and remote folder, and explain why broader access is unnecessary."
      ],
      "output": "A labeled remote-file diagram and an allowed/denied test pair with a least-privilege explanation.",
      "fallback": "Give three fictional access rows: A verified teacher / School-Guest/Project Materials/Read: read unavailable; B verified teacher / Staff-Lab/Project Materials/Read: read allowed, write denied; C verified teacher / Staff-Lab/All folders/Full control: read and write allowed, unrelated folders exposed. Partners select a row that meets the read-only request and explain why a successful read alone does not choose between B and C."
    },
    "handout": {
      "context": "A fictional verified teacher needs only to read Project Materials. School-Guest cannot reach internal file shares; Staff-Lab is approved. The simulation requires no password or actual sign-in. Read, Modify and Full control are different permission choices; the teacher’s task does not require editing.",
      "questions": [
        "Record the initial failure and distinguish it from evidence that the teacher’s identity is wrong.",
        "Which single change did you make, and which access settings did you preserve?",
        "Record one allowed and one denied action after the change. Explain why the denial is desirable.",
        "Draw where the shared file resides and explain why opening it does not require exposing every folder."
      ],
      "checklist": [
        "I preserved the requested folder and read-only scope.",
        "I tested an action that should remain denied.",
        "My diagram separates the workstation from the shared file location."
      ]
    },
    "discussion": [
      "When is “access denied” evidence that a design is working?",
      "Why does a verified identity still need a task-specific permission decision?"
    ],
    "exitTicket": "A teacher needs to read one shared handout. Which two tests best check the intended boundary after a repair, and what results should they produce?",
    "assessment": {
      "criteria": [
        {
          "label": "Separate requirements",
          "lookFor": "Identity, network reachability and permission described as different questions."
        },
        {
          "label": "Boundary test",
          "lookFor": "Read allowed and unnecessary write denied, with folder scope preserved."
        }
      ],
      "success": "The student explains both task success and an intentionally preserved restriction; broader permissions are not accepted as an equivalent repair."
    },
    "support": [
      "Use the three question cards and have learners place each observation under the right question.",
      "Provide read/write result slips and accept a dictated or drawn explanation; all interface changes can be selected without dragging."
    ],
    "challenge": [
      "Write a new read-only request for a different fictional resource and list one allowed and two denied actions that would check its boundary."
    ],
    "standards": [
      "7-8.NSD.5",
      "7-8.CY.2"
    ],
    "standardEvidence": "The remote-file diagram and allowed/denied tests practice distributed-data access and task-specific security reasoning."
  },
  {
    "day": 20,
    "title": "Design, test and hand off a classroom network",
    "objective": "Create a small network model and defend its design using a working test, an intentional failure and verified recovery.",
    "materials": [
      "Network Studio or supplied paper device cards",
      "School-managed presentation/document or paper design sheet; unit rubric"
    ],
    "prep": [
      "Make the task constraints visible: one PC, one server and one printer must communicate through forwarding devices; no more than six devices. Require no IP configuration. Prepare peer-review roles and the handout’s paper topology for device-free work."
    ],
    "vocabulary": [
      {
        "term": "design constraint",
        "definition": "A requirement or limit that shapes a solution."
      },
      {
        "term": "acceptance test",
        "definition": "A test chosen to check whether a stated requirement is met."
      },
      {
        "term": "handoff",
        "definition": "A record another person can use to understand completed work and next steps."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read the fictional client request: a classroom PC must reach a lesson server and a printer; another technician must understand the design. Ask students to turn the request into two observable tests before building."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model an acceptance table without giving a finished topology: requirement, predicted path, observed result. Explain that an intentional failure should test an explanation. Randomly removing several parts is difficult to interpret. A handoff names what worked, what failed, what was restored and what remains unknown; screenshots alone do not communicate that reasoning."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Students build or draw within the constraints. Partners may collaborate but each learner explains one prediction and one result. At the midpoint, peer reviewers trace the diagram and ask one clarifying question. Do not require optional extra devices or visual polish; preserve time for an intentional break and recovery test."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Invite two contrasting valid designs. Compare evidence and limits rather than choosing the prettiest diagram. Ask which features are represented by this cabled-path model and which would require other information, such as addressing, DNS, permissions or wireless measurements."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the handoff and individual exit. Use the stated criteria for formative unit assessment and return one concrete next step before the cybersecurity unit."
      }
    ],
    "lab": {
      "title": "Fictional classroom connection challenge",
      "route": "#studio/network",
      "steps": [
        "Choose Clear & start empty. Sketch a plan using one PC, one server, one printer and at least one forwarding device, with no more than six devices total.",
        "Build with Add a device and port buttons. Select the PC as Source and test each required Destination. Record both results and routes.",
        "Predict which task will fail after one deliberate cable or power change. Make only that change and test the relevant destinations.",
        "Restore the changed part and retest the original requirements.",
        "Ask a peer to trace the labeled diagram, then revise your handoff to answer their question. Submit the evidence through the school’s Classroom assignment."
      ],
      "output": "A labeled design, two baseline acceptance tests, one predicted failure comparison, verified recovery and a short technical handoff.",
      "fallback": "Draw PC–switch–server and switch–printer, with numbered ports and power labels; students may propose another path. Use paper requests and replies to run both acceptance tests. Remove one chosen line or mark one forwarding device off, predict and trace both tasks, then restore and retest. A peer follows the diagram without oral help and records any ambiguity."
    },
    "handout": {
      "context": "Client request: connect one fictional classroom PC to a lesson server and printer through forwarding devices, using at most six devices. Provide a labeled diagram and test evidence another technician can follow. The core model checks cables, power and forwarding only; it does not prove a real network is installed, secure or internet-connected.",
      "questions": [
        "Draw your design and explain how it satisfies each client requirement.",
        "Give predicted and observed routes/results for PC-to-server and PC-to-printer.",
        "Describe one deliberate failure, your prediction, the actual observations and the verified recovery.",
        "Write a four-sentence handoff: completed task, strongest evidence, one model limitation and one next question or check. Include one improvement prompted by peer review."
      ],
      "checklist": [
        "Both required destinations have test evidence.",
        "The failure log shows one changed factor and recovery.",
        "My handoff includes a limit and a peer-review revision."
      ]
    },
    "discussion": [
      "Can two different layouts both satisfy the same requirements? What evidence decides?",
      "Which real-world review should happen before anyone installs or changes school network equipment?"
    ],
    "exitTicket": "Your model reaches both destinations after repair. Name one conclusion supported by that evidence and one important real-network conclusion it does not support.",
    "assessment": {
      "criteria": [
        {
          "label": "Design and test evidence",
          "lookFor": "A legible topology meeting stated requirements, two acceptance results, a controlled failure and a recovery test."
        },
        {
          "label": "Explanation and handoff",
          "lookFor": "Reasoning connects paths to results, includes a model limit and responds to peer feedback."
        }
      ],
      "success": "The submission makes all required tests interpretable and explains at least one limit. A partly working design can demonstrate strong reasoning when its unresolved failure and next test are documented."
    },
    "support": [
      "Provide the three endpoints already drawn and a blank switch; let students supply and explain connections.",
      "Accept a narrated diagram or dictated handoff, and give a result-table template with clearly named destinations."
    ],
    "challenge": [
      "Add a second valid path in the model, predict what one failed connection will change and compare that prediction with the live route; explain that this is not a full redundancy simulation."
    ],
    "standards": [
      "7-8.NSD.3",
      "7-8.CT.10"
    ],
    "standardEvidence": "A designed and tested topology with controlled failures and a bounded handoff brings together network-component, communication and troubleshooting practices."
  },
  {
    "day": 21,
    "title": "Permission comes before testing",
    "objective": "Identify the permitted system and actions in a practice scenario and explain how two safeguards reduce risk.",
    "materials": [
      "Managed browser or teacher-projected security foundations simulation",
      "Paper or school-managed document for the supplied scope cards"
    ],
    "prep": [
      "Open #learn/security; inspect six items and three practice jobs. Prepare handout scope cards. Only the fictional account is authorized; no passwords are needed."
    ],
    "vocabulary": [
      {
        "term": "scope",
        "definition": "The systems and actions a person has permission to test."
      },
      {
        "term": "safeguard",
        "definition": "A measure that reduces a particular risk."
      },
      {
        "term": "least privilege",
        "definition": "Providing only the access needed for an authorized task."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read the handout permission. Ask whether it permits trying a real teacher password. Underline the named system and circle allowed actions. A reachable page is not permission."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Compare a visitor badge with a master key: identity does not authorize every room. A second factor adds another type of sign-in proof; a limited role restricts actions afterward. Neither prevents every risk."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners alternate navigator and scope reader. Complete the lab and cards A–C, citing the permission statement for each decision. Return proposals for real testing to the fictional task. Preserve useful unfinished reasoning."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare technical possibility with permission. Ask which safeguard strengthens sign-in and which limits actions. Seeking clarification is productive when scope is unclear."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit ticket. Look for a specific boundary and clarification before acting."
      }
    ],
    "lab": {
      "title": "Build a practice security boundary",
      "route": "#learn/security",
      "steps": [
        "Explore Allowed testing, Account identity, Two-factor sign-in, Account permissions, Phishing warning and Stop and report; note one job for each.",
        "Choose Next: Practice & test when available. Answer the concept checks using the item descriptions.",
        "Use Confirm the practice rules, Add the practice second factor and Limit the account access. Record the account preview before and after.",
        "Explain which action changes proof at sign-in and which changes allowed access; complete the handout without entering real information."
      ],
      "output": "Submit the scope-card decisions and two before/after explanations via Classroom. A simulation completion badge is not the assessed work.",
      "fallback": "Draw an account: permission unchecked; password only; administrator. Partners apply cards “confirm fictional scope,” “add practice authenticator,” “switch to learner,” then explain the changed states and evaluate scope cards A–C."
    },
    "handout": {
      "context": "Permission: explore only the made-up training account and change its practice safeguards. A: inspect the practice role. B: try signing in as a teacher on the real portal. C: explore a new practice screen that names no permitted actions. Use the stated permission, not a guess about likely harm.",
      "questions": [
        "For A, B and C, decide proceed or pause and explain the permission evidence.",
        "What changed when the practice authenticator was added? What different change limited account access?",
        "Write a specific clarification question for card C."
      ],
      "checklist": [
        "Include all three decisions with reasons.",
        "Distinguish sign-in proof from account permissions.",
        "Use fictional details only."
      ]
    },
    "discussion": [
      "Can an action be technically possible but outside permission? Give a fictional example.",
      "Why should the permission statement name actions as well as a system?"
    ],
    "exitTicket": "You may read a fictional account’s settings. You discover a reset control. What should you do before using it, and why?",
    "assessment": {
      "criteria": [
        {
          "label": "Boundary",
          "lookFor": "Identifies the named practice system and distinguishes permitted reading from additional actions."
        },
        {
          "label": "Safeguards",
          "lookFor": "Explains separate effects on sign-in proof and allowed actions."
        }
      ],
      "success": "Explains at least two scope decisions and both safeguard effects; an unresolved question with a sensible pause shows appropriate judgment."
    },
    "support": [
      "Read cards aloud and highlight system/action words using different marks.",
      "Accept spoken or dictated decisions; a partner may operate the controls while both explain."
    ],
    "challenge": [
      "Rewrite a vague “test security” instruction into a clear fictional scope statement with two allowed actions and one limit."
    ],
    "standards": [
      "7-8.CY.1",
      "7-8.CY.2"
    ],
    "standardEvidence": "Fictional scope decisions identify resources worth protecting and connect physical, digital and behavioral safeguards with their purposes."
  },
  {
    "day": 22,
    "title": "A suspicious message needs evidence",
    "objective": "Support a suspicious-message decision with sender, destination and message-language evidence.",
    "materials": [
      "Managed browser or projected SEC-401 practice activity",
      "School-managed document or paper evidence table"
    ],
    "prep": [
      "Open #practice/SEC-401; inspect text-only Urgent message, Routine comparison and warning-sign controls. Prepare handout texts as backup. Do not use actual inboxes."
    ],
    "vocabulary": [
      {
        "term": "phishing",
        "definition": "A deceptive message intended to make someone reveal information or take an unsafe action."
      },
      {
        "term": "destination",
        "definition": "The location a link would open."
      },
      {
        "term": "evidence",
        "definition": "Specific information that supports or changes a conclusion."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read “Your account closes in ten minutes; verify your password now.” Ask what the reader should do and feel. Urgency is a clue, not proof by itself."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Compare trusted helpdesk@school.test and portal.school.test with verify@school-account-check.test and school-account-check.test/verify. Read whole host names: familiar words do not establish ownership. Display names, logos and polished wording can be copied; combine independent clues."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners use the lab, alternating quoted detail and explanation. Swap for the routine comparison. Complete the handout before choosing a verdict. Choose helper permission using its separate checklist-reading task."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Distinguish observation from inference: “sender differs” is observed; “a particular person sent it” is unsupported. Discuss why perfect spelling cannot establish trust."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for a mismatch and independent verification without replying or opening links."
      }
    ],
    "lab": {
      "title": "Inspect a text-only training inbox",
      "route": "#practice/SEC-401",
      "steps": [
        "Open Urgent message. Predict whether its claimed identity matches the trusted sender before marking anything.",
        "Select the sender, urgency and text-only destination warning signs. Record each exact detail and why it matters.",
        "Open Routine comparison and note a difference. Return to the urgent message and choose the verdict supported by your evidence.",
        "For the supplied helper task, select the access needed to read the checklist, then use Test this setup. Record one check and explain its limits."
      ],
      "output": "Submit an evidence table with three quoted clues, a reasoned verdict and the transfer answer via Classroom.",
      "fallback": "Print the handout urgent card and routine card: helpdesk@school.test directs readers to the teacher’s known bookmark, portal.school.test/checklist. Mark clues and compare with trusted details; no links open."
    },
    "handout": {
      "context": "Trusted training details: helpdesk@school.test and portal.school.test. The urgent card uses verify@school-account-check.test, threatens deletion in ten minutes and requests a password at school-account-check.test/verify. The routine card directs readers to the teacher’s known class-portal bookmark. All addresses are fictional text.",
      "questions": [
        "List three urgent-card details and explain what each suggests.",
        "What action would you take on the urgent message? Support it with at least two details.",
        "A new message has perfect spelling and the school logo. Is that enough to trust a password request? Explain what else you would check."
      ],
      "checklist": [
        "Separate quoted details from your conclusions.",
        "Explain two independent clues.",
        "Include a safe next step without opening the example destination."
      ]
    },
    "discussion": [
      "Why does time pressure make careful checking harder?",
      "What evidence would change your initial judgment about a message?"
    ],
    "exitTicket": "Trusted address: portal.school.test. A message sends you to portal-school.test and asks for a password immediately. Name one warning sign and one safe next step.",
    "assessment": {
      "criteria": [
        {
          "label": "Evidence",
          "lookFor": "Quotes accurate sender, destination or wording details and relates them to the claim."
        },
        {
          "label": "Decision",
          "lookFor": "Supports a cautious action without claiming the clues identify an attacker."
        }
      ],
      "success": "Uses two specific clues to support a decision and gives a safe next step; a defensible uncertain verdict with verification is acceptable."
    },
    "support": [
      "Provide columns labeled “I see” and “This suggests” and read host names in chunks.",
      "Allow oral evidence explanations or a teacher-operated projection; no mouse-only action is required."
    ],
    "challenge": [
      "Write a brief example that uses no spelling errors yet still has two inspectable warning signs."
    ],
    "standards": [
      "7-8.CY.2"
    ],
    "standardEvidence": "A message clue and justified protective response practice choosing a behavioral safeguard; appearance or a single indicator is not proof of safety."
  },
  {
    "day": 23,
    "title": "Verify independently and report clearly",
    "objective": "Produce a concise suspicious-message report and an independent verification plan without using the message’s contact details.",
    "materials": [
      "SEC-401 text-only comparison or printed cards",
      "Paper or school-managed document for a fictional report"
    ],
    "prep": [
      "Open #practice/SEC-401. Supply the handout trusted directory and teacher-reporting route. Today assesses response/reporting rather than clue identification; no message is sent."
    ],
    "vocabulary": [
      {
        "term": "independent verification",
        "definition": "Checking a claim using a trusted route obtained separately from the suspicious message."
      },
      {
        "term": "report",
        "definition": "A factual notice to the person or team responsible for handling a concern."
      },
      {
        "term": "claim",
        "definition": "A statement that needs supporting evidence."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask whether calling the message’s supplied number proves it is genuine. A false message can supply a false checking route. Use a separately known contact."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model: “Training inbox: verify@school-account-check.test threatens deletion in ten minutes and requests a password at school-account-check.test/verify. I did not open it. Please advise.” Separate facts from assumptions; omit secrets. Real reporting follows school policy."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners alternate report writer and reviewer. Use lab evidence to draft observations, actual actions and requested help. Choose an independent contact from the directory. Add a response to the accidental-click scenario without performing it."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare the factual draft with “Hacker confirmed—panic.” Accurate uncertainty is useful. Prompt honest reporting after a mistake helps authorized adults respond; students do not investigate real accounts."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for a separately known route and actual actions reported without secrets."
      }
    ],
    "lab": {
      "title": "Turn inbox evidence into a safe response",
      "route": "#practice/SEC-401",
      "steps": [
        "Inspect Urgent message and Routine comparison. Record the suspicious sender and destination as text; do not navigate to either.",
        "Choose Report phishing and the access needed for the helper’s checklist; use Test this setup to inspect the simulation feedback.",
        "Draft a four-sentence report: observed message, two details, actual action taken, requested assistance. Label it “fictional practice—do not send.”",
        "Compare verification routes: message reply, its supplied contact, teacher’s established route. Explain which is independent and why."
      ],
      "output": "Submit the fictional report draft and verification plan via Classroom; the activity does not send a report.",
      "fallback": "Read the handout urgent message. Sort route cards: “reply to sender,” “call its number,” “tell teacher using usual route.” Justify independence, then draft a factual report from the supplied facts."
    },
    "handout": {
      "context": "Fictional message: verify@school-account-check.test threatens closure in ten minutes and requests a password at school-account-check.test/verify. Trusted directory: helpdesk@school.test; known bookmark: portal.school.test; classroom reporting route: tell the teacher. Scenario B: a fictional learner opened the message link but entered nothing.",
      "questions": [
        "Write a four-sentence report for the unopened message. Include observations and what you actually did.",
        "Choose an independent way to verify the account-closure claim and explain why replying to the message is weaker.",
        "What should the learner in scenario B tell the teacher? Give the useful facts without guessing what the link did."
      ],
      "checklist": [
        "Label the report as unsent fictional practice.",
        "Include no password, recovery code or real identity.",
        "Distinguish an independent contact from one supplied by the message."
      ]
    },
    "discussion": [
      "How can a clear report help when the writer is not certain a message is harmful?",
      "Why is an honest report after a mistake more useful than inventing a harmless outcome?"
    ],
    "exitTicket": "A fictional learner typed a password into a suspicious page. The page offers a “security help” link. Name the next reporting route and two facts to tell the responsible adult. Do not write any password.",
    "assessment": {
      "criteria": [
        {
          "label": "Verification",
          "lookFor": "Uses a trusted contact obtained separately from the suspicious content."
        },
        {
          "label": "Communication",
          "lookFor": "Reports observed facts and actual actions without secrets or unsupported certainty."
        }
      ],
      "success": "Provides a useful factual report and independent verification route; a report requesting help may state uncertainty."
    },
    "support": [
      "Offer sentence starters: “The message claims…,” “I observed…,” “I did…,” “Please help…”",
      "Accept an oral role-play recorded only in the school-approved assignment format or dictated text."
    ],
    "challenge": [
      "Revise a sensational report into a calm evidence-based one while retaining every useful fact."
    ],
    "standards": [
      "7-8.CY.2",
      "7-8.CY.5"
    ],
    "standardEvidence": "A separate trusted verification route and factual report practice protective actions around an unexpected security concern."
  },
  {
    "day": 24,
    "title": "Recover an account without sharing secrets",
    "objective": "Explain a four-safeguard fictional MFA recovery plan and why recovery should preserve account protection.",
    "materials": [
      "SEC-404 local practice activity or projected version",
      "Paper or school-managed recovery-path handout"
    ],
    "prep": [
      "Open #practice/SEC-404; inspect four decision stations. Prepare paired paper choices. This models authorized recovery, not student account resets; never collect passwords or codes."
    ],
    "vocabulary": [
      {
        "term": "multi-factor authentication (MFA)",
        "definition": "Sign-in using different types of proof, such as a password and an approved authenticator."
      },
      {
        "term": "revoke",
        "definition": "Remove a previously allowed access method or permission."
      },
      {
        "term": "recovery",
        "definition": "An approved process for regaining access after a sign-in method is lost."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read “I lost my authenticator. Turn MFA off and send the reset secret.” Separate the problem from proposed actions. A genuine difficulty does not justify every solution."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain password plus authenticator as different proof types; two passwords are the same type. Model approved identity checking, revocation, supervised single-use recovery and an action record. Urgency proves no identity; an action record must omit the secret."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners read the fictional policy and build the lab path, explaining each choice. Distinguish four ready stations from a completed test. Record a changed choice, fresh result and the transfer answers."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Ask what remains risky if the lost factor stays active. Compare limited recovery with permanent MFA removal. In real problems, students seek approved adult support."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for retained MFA, approved identity checking and no secret request."
      }
    ],
    "lab": {
      "title": "Inspect four recovery safeguards",
      "route": "#practice/SEC-404",
      "steps": [
        "Read the case and supplied recovery policy. Predict which choice reduces the risk of trusting an impersonator.",
        "At Identity, Lost authenticator, Recovery and Record, choose a policy-supported option and write its purpose.",
        "Use Test this setup. Record one actual check and explain why selecting a station alone was only a preview.",
        "Change one choice to a clearly labeled fictional alternative, observe the preview, then restore your plan and run a fresh test. No account is reset."
      ],
      "output": "Submit a four-step plan with the purpose of each safeguard and one test observation via Classroom.",
      "fallback": "Use paired cards: urgent chat/approved identity check; lost factor active/revoked; MFA disabled/supervised single-use reset; no record/action record. Select a path; explain the risk left by each missing safeguard."
    },
    "handout": {
      "context": "A fictional staff member lost an authenticator. Policy requires an approved identity check, revocation of the lost factor, supervised single-use recovery while MFA remains required and an action record. No real account, password or code is used. The chat requests immediate permanent removal of MFA.",
      "questions": [
        "Explain why the chat request alone is insufficient evidence of identity.",
        "Give the four-safeguard plan and state the risk each step addresses.",
        "Two passwords replace the authenticator. Does that provide two different factors? Explain.",
        "A classmate suggests recording the recovery secret as evidence. What should the action record document instead?"
      ],
      "checklist": [
        "Explain each safeguard rather than list button names only.",
        "Record the actual test or paper-model outcome.",
        "Include no real secrets or personal information."
      ]
    },
    "discussion": [
      "Why does safe recovery need a plan before an authenticator is lost?",
      "How can a recovery record be useful without storing a password or code?"
    ],
    "exitTicket": "A fictional requester says urgency justifies permanently disabling MFA. State a safer recovery direction and one identity safeguard.",
    "assessment": {
      "criteria": [
        {
          "label": "Protection",
          "lookFor": "Preserves multiple-factor sign-in while describing a limited approved recovery route."
        },
        {
          "label": "Reasoning",
          "lookFor": "Links identity checking, revocation and recording to separate risks."
        }
      ],
      "success": "Explains three safeguards including approved identity checking and retained MFA, and distinguishes a secret from an action record."
    },
    "support": [
      "Provide a four-box path with icons and plain-language risk prompts.",
      "Read policy aloud; accept dictated or spoken explanations while a partner selects controls."
    ],
    "challenge": [
      "Explain why a successful sign-in after recovery would not prove the old factor had been revoked."
    ],
    "standards": [
      "7-8.CY.2",
      "7-8.CY.5"
    ],
    "standardEvidence": "The approved recovery route protects account resources and rehearses reporting, identity verification and recovery without real credentials."
  },
  {
    "day": 25,
    "title": "Who you are and what you may do",
    "objective": "Distinguish authentication from authorization and justify minimum permissions for a fictional classroom role.",
    "materials": [
      "Security foundations practice board or teacher projection",
      "Supplied classroom-role matrix in paper or school-managed document"
    ],
    "prep": [
      "Open #learn/security; inspect identity and permission items. Prepare role/action cards from the handout. Keep all settings fictional; never inspect classmates’ accounts."
    ],
    "vocabulary": [
      {
        "term": "authentication",
        "definition": "Checking evidence that an account user is who they claim to be."
      },
      {
        "term": "authorization",
        "definition": "Deciding which actions an authenticated account is allowed to perform."
      },
      {
        "term": "role",
        "definition": "A named set of permissions for a type of task."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask whether a library card permits changing every library record. Connect identity proof with sign-in and permission with specific actions. Recognizing a person grants no unlimited access."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw two gates: identity check, then action permission. A reader may sign in correctly yet be denied editing. That denial can show correct behavior. Minimum permissions enable the assigned task; denying everything also prevents legitimate work."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Compare practice sign-in proof and role through the lab. Partners alternate task designer and reviewer for the matrix. Justify every allowed action from an assigned task. Evaluate both excessive and insufficient permissions."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Challenge “signed in means allowed.” Explain that hiding a button alone is not enforcement: the system responsible for the resource must check permission. Do not demonstrate bypasses or real URLs."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for separate labels and access justified by the task."
      }
    ],
    "lab": {
      "title": "Compare proof and permissions",
      "route": "#learn/security",
      "steps": [
        "Explore Account identity, Two-factor sign-in and Account permissions; state the question each answers. Explore the other items if needed to unlock practice.",
        "Move into Practice & test and inspect the practice account board before changing it. Record its sign-in proof and access role separately.",
        "Use the practice jobs to strengthen sign-in and limit access. Compare which board fact each changes.",
        "Complete the role matrix, then test two paper requests per role: one the task needs and one it does not. Record allow/deny decisions and reasons."
      ],
      "output": "Submit the role matrix, two-gate explanation and excessive/insufficient permission comparison via Classroom.",
      "fallback": "Account card: password plus authenticator, reader role. Test paper requests open/edit/manage using role definitions. Change only the role to editor and compare; identity proof stays unchanged."
    },
    "handout": {
      "context": "Fictional roles: Reader needs to open the checklist. Checklist editor needs to open and update that checklist. Platform administrator needs account-management access for an assigned administrative task. Actions: open checklist; edit checklist; manage accounts. Today’s student helper is asked only to read troubleshooting steps. No real settings are changed.",
      "questions": [
        "Create a reader/editor allow-deny matrix for the three actions. For the administrator, name the supported permission and one permission not specified by its task.",
        "Which role meets the student helper’s task with the fewest permissions? Why are administrator and no access unsuitable?",
        "A reader signs in with a password and approved authenticator but cannot edit. Identify what succeeded and what was denied.",
        "Write a new fictional task that would justify checklist-edit permission, but not account management."
      ],
      "checklist": [
        "Tie every allowed action to a stated task.",
        "Distinguish identity checking from action permission.",
        "Include a working legitimate request and a denied unrelated request."
      ]
    },
    "discussion": [
      "Why can a denied action be a successful security result?",
      "When should a role’s permissions be reviewed after someone changes tasks?"
    ],
    "exitTicket": "A helper proves account identity with MFA and only needs to read a checklist. Name the sign-in process and justify the access level for the task.",
    "assessment": {
      "criteria": [
        {
          "label": "Distinction",
          "lookFor": "Separates proof of identity from a decision about a requested action."
        },
        {
          "label": "Permission design",
          "lookFor": "Enables required work while limiting unrelated actions."
        }
      ],
      "success": "Correctly explains the two processes and gives a task-based permission choice with one allowed and one denied action."
    },
    "support": [
      "Use two labeled gate boxes and move paper requests through them.",
      "Provide read/edit/manage icons; allow oral matrix explanations or partner transcription."
    ],
    "challenge": [
      "Explain why a former editor’s permissions should change when the assigned editing task ends."
    ],
    "standards": [
      "7-8.CY.1",
      "7-8.CY.2"
    ],
    "standardEvidence": "Allowed and denied actions distinguish identity from permission and support safeguarding protected resources with least necessary access."
  },
  {
    "day": 26,
    "title": "Use the minimum data the task needs",
    "objective": "Redesign a fictional reading activity to remove unnecessary personal information and explain its data route and participation choice.",
    "materials": [
      "AI-304 local data-flow simulation or projection",
      "Paper or school-managed data inventory"
    ],
    "prep": [
      "Open #practice/AI-304; inspect four cards and the no-transmission notice. Supply the invented paragraph. No external AI service or real student work is needed."
    ],
    "vocabulary": [
      {
        "term": "personal information",
        "definition": "Information that identifies or can reasonably be connected to a person."
      },
      {
        "term": "data minimization",
        "definition": "Using only the information necessary for a stated task."
      },
      {
        "term": "processing route",
        "definition": "Where information goes and how it is handled for an activity."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read “Summarize invented text; first provide your name, ID and diagnosis.” Ask what summarizing needs. Discuss only this supplied plan, never learners’ personal details."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw input → processing → result. The task needs text, not identity. Removing a name may leave an identifying ID. Local processing reduces outside transfers but does not justify unnecessary private input. A checkbox cannot replace school review or an equivalent alternative."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners map and review the starting plan, then change one card at a time. Record each improvement and remaining concern. Use the invented paragraph for both the local-preview plan and a teacher-written summary activity."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare incomplete fixes: removing identifiers while retaining private records, or moving private input locally. Ask why the alternative should assess the same objective without a penalty."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for unnecessary data removal and school-managed submission."
      }
    ],
    "lab": {
      "title": "Map what travels through an activity",
      "route": "#practice/AI-304",
      "steps": [
        "Read the case. Predict necessary data; record the starting input and route.",
        "Choose Invented paragraph for input and No identifiers for learner identifiers. Inspect the changed data-flow display.",
        "Choose Local scripted preview for processing and Equivalent non-AI option for participation. Explain each choice separately.",
        "Use Test this setup. Record a check and limitation: this local model does not approve real services or audit school privacy practices."
      ],
      "output": "Submit a before/after data map and handout reasoning via Classroom. Keep names, IDs and actual reading records out of the lab.",
      "fallback": "Draw four columns: private records; name + ID; external service; required AI. Replace with invented paragraph; no identifiers; local preview; equivalent non-AI option. Explain remaining concerns after each replacement, then summarize the paragraph manually."
    },
    "handout": {
      "context": "Summarize this invented paragraph: “A class planted beans near a sunny window. They measured growth twice each week. Plants nearest the light grew taller during two weeks.” The proposed activity requests private reading records, name and student ID, uses an unapproved external service and requires AI. A teacher-written activity can summarize the same text.",
      "questions": [
        "Which supplied information is necessary for the summary task, and which requested information should be removed? Explain.",
        "Draw the redesigned input → processing → result path and label the participation option.",
        "Why is removing the name alone insufficient if the plan still includes a student ID and private reading records?",
        "Describe an equivalent non-AI activity that practices the same summarizing objective."
      ],
      "checklist": [
        "Identify unnecessary data explicitly.",
        "Explain route and participation separately.",
        "Use only the invented paragraph and fictional details."
      ]
    },
    "discussion": [
      "Does “on this device” mean every kind of input is appropriate? Why?",
      "What makes an alternative activity equivalent rather than a punishment?"
    ],
    "exitTicket": "To summarize an invented weather paragraph, a form requests student ID and a private counseling note. What should be removed, and where should assigned work be submitted in this course?",
    "assessment": {
      "criteria": [
        {
          "label": "Necessity",
          "lookFor": "Relates each input to the actual learning task rather than convenience."
        },
        {
          "label": "Data route",
          "lookFor": "Separates input, identifiers, processing and participation decisions."
        }
      ],
      "success": "Removes unnecessary private inputs, explains a local fictional route and gives an equivalent alternative aligned with summarizing."
    },
    "support": [
      "Use movable cards and read the paragraph aloud; accept a verbal data map.",
      "Offer “The task needs… because…” and “It does not need…”; permit school-approved dictation."
    ],
    "challenge": [
      "Explain how combinations of harmless-looking details can still identify someone even after a name is removed. Use an invented example."
    ],
    "standards": [
      "7-8.CY.1",
      "7-8.IC.4"
    ],
    "standardEvidence": "The redesigned fictional activity identifies unnecessary personal information and explains a purpose-limited data flow; it does not establish approval of a real service."
  },
  {
    "day": 27,
    "title": "Choose safeguards that let the task work",
    "objective": "Compare fictional security plans using protection, task access and recovery needs, then justify a balanced plan.",
    "materials": [
      "Security foundations board or teacher projection",
      "Paper or school-managed decision table with the supplied three plans"
    ],
    "prep": [
      "Open #learn/security; inspect proof/access previews. Prepare handout plans A–C. Compare fictional designs only; students change no real accounts, locks or device policies."
    ],
    "vocabulary": [
      {
        "term": "tradeoff",
        "definition": "A choice where improving one consideration can affect another."
      },
      {
        "term": "availability",
        "definition": "Being able to access a system or information when it is needed and permitted."
      },
      {
        "term": "recovery plan",
        "definition": "An approved way to restore access or useful work after a problem."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read “To protect the checklist, nobody may open it.” Ask whether the goal is met. Protection must allow authorized work; convenience and restriction alone each miss part of the goal."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Ask: excessive access? legitimate task possible? lost-factor recovery? Model: a shared administrator account opens easily but grants unrelated powers and obscures individual actions. An approved recovery route can reduce disruption while retaining MFA. No safeguard guarantees safety."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners compare the practice board, then evaluate A–C. Alternate protection reviewer and task-access reviewer; swap for recovery. Cite plan facts, propose a limited improvement and identify who authorizes it."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare approved recovery with borrowing another account. Discuss how accessible help instructions can improve availability without increasing powers or removing MFA."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for limited authorized reading access with sign-in safeguards retained."
      }
    ],
    "lab": {
      "title": "Compare security design consequences",
      "route": "#learn/security",
      "steps": [
        "Explore the six security items and proceed to Practice & test when available. Identify sign-in proof, access role and allowed task in the practice account preview.",
        "Use the second-factor and limited-access practice jobs. Record which risk each addresses and whether the fictional lesson task remains the intended activity.",
        "Build a decision table for plans A–C with columns protection, legitimate access and recovery. Quote one plan fact in each row.",
        "Recommend a plan or clearly specified revision. Check it against both a normal reading request and a lost-factor scenario. These are paper scenarios, not real sign-ins."
      ],
      "output": "Submit the three-plan comparison and a recommendation with two evidence-based reasons via Classroom.",
      "fallback": "Compare two account cards: password-only administrator; password plus authenticator with reader access. Use full handout plans A–C to evaluate both ordinary reading and lost-factor recovery; no sign-in occurs."
    },
    "handout": {
      "context": "Goal: each authorized learner can read a checklist. Plan A: everyone shares one administrator account; no recovery process is written. Plan B: individual reader accounts use MFA, with an approved supervised recovery route and accessible help instructions. Plan C: individual accounts use MFA but nobody has permission to open the checklist and no recovery route is provided. These are simplified fictional designs.",
      "questions": [
        "Compare A, B and C for excessive permissions, legitimate task access and recovery. Cite a fact for each plan.",
        "Recommend a plan or specific revision, explaining two reasons and one limitation.",
        "A reader cannot complete the assigned task because permission was omitted. What should an authorized adult review without granting administrator access?",
        "Why is borrowing a teacher account an unsuitable recovery shortcut?"
      ],
      "checklist": [
        "Discuss both protection and task access.",
        "Include the lost-factor scenario.",
        "State the authorized support role and one remaining limitation."
      ]
    },
    "discussion": [
      "When can a permission problem resemble a technical failure?",
      "How can clear, accessible recovery instructions reduce unsafe shortcuts?"
    ],
    "exitTicket": "A reader account has MFA but is accidentally denied checklist access. What limited change should authorized staff consider, and what safeguard should remain?",
    "assessment": {
      "criteria": [
        {
          "label": "Comparison",
          "lookFor": "Uses stated facts to evaluate protection, authorized access and recovery."
        },
        {
          "label": "Justification",
          "lookFor": "Proposes a limited change that enables the task without unnecessary powers."
        }
      ],
      "success": "Compares all three plans and supports a workable recommendation with two reasons and an acknowledged limit."
    },
    "support": [
      "Supply a three-column comparison grid and read each plan twice.",
      "Allow a spoken recommendation or partner scribing; use read/edit/manage icons when text is a barrier."
    ],
    "challenge": [
      "Design temporary-editor permissions; explain their change when the task ends."
    ],
    "standards": [
      "7-8.CY.3"
    ],
    "standardEvidence": "Comparing two plans requires a protection benefit and a practical cost for the same safeguard, with a task-appropriate choice."
  },
  {
    "day": 28,
    "title": "Respond to an incident within your role",
    "objective": "Sequence a fictional incident response that preserves evidence, involves the responsible team and separates recovery from the affected system.",
    "materials": [
      "Teacher-guided SEC-405 practice display or supplied paper model",
      "Paper or school-managed incident sequence"
    ],
    "prep": [
      "Open #practice/SEC-405. This grades 9–10 lab is restricted here to four teacher-guided decision stations. Preview text outcomes; never disconnect, wipe or repair real equipment."
    ],
    "vocabulary": [
      {
        "term": "incident",
        "definition": "An event that may threaten a system’s protection or normal operation."
      },
      {
        "term": "containment",
        "definition": "A response intended to limit an incident’s spread or impact."
      },
      {
        "term": "evidence preservation",
        "definition": "Keeping relevant records and the affected material for authorized review."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read “One fictional workstation reports unexpected encryption. Erase it?” Collect predictions. Erasing can destroy evidence. Students report real concerns to authorized adults rather than attempt technical fixes."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw affected endpoint, others and clean recovery space. Supplied policy requires authorized isolation, evidence preservation and notification. Verified R-08 goes to separate clean recovery after containment. No supplied alert on others does not prove safety; this model does not replace real policy."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Guide the four stations. Partners alternate sequence planner and evidence checker. Test whether clean recovery alone is ready. Draw dependency arrows rather than claiming all incidents follow one universal order. Complete role distinctions."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Discuss why backups stay away from affected endpoints and why notification is part of response. No malware or ransom interaction is needed."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for student reporting and separate recovery in the model."
      }
    ],
    "lab": {
      "title": "Scaffolded incident-response decision model",
      "route": "#practice/SEC-405",
      "steps": [
        "Read the supplied alert and runbook. Identify the only endpoint named as affected and predict whether clean recovery alone is sufficient.",
        "In the teacher-guided model, inspect Separate clean environment while prerequisites are missing; record the preview message, if shown.",
        "Choose Disconnect endpoint, Preserve evidence, Notify mock team and Separate clean environment. These local choices send no message and change no real device.",
        "Use Test this setup and compare the current result with the prediction. Draw an arrow from containment/evidence preservation to clean recovery; state what the model cannot establish."
      ],
      "output": "Submit the response sequence, one observed model result and student-role reporting statement via Classroom.",
      "fallback": "Place paper endpoint, other-endpoint and backup cards. Apply authorized isolation, preserve evidence, notify team and clean recovery. Teacher reveals: recovery needs containment/evidence; wiping loses evidence; attaching R-08 to the affected endpoint is unsafe here."
    },
    "handout": {
      "context": "Fictional alert: LAB-ENDPOINT-07 reports unexpected encryption. Others show no supplied alert. Runbook: authorized responders isolate the affected endpoint, preserve supplied evidence, notify the designated team and use verified offline backup R-08 only in a separate clean environment after containment. Student role: stop interacting and tell the responsible adult; do not change actual equipment.",
      "questions": [
        "Sequence the modeled response and explain what recovery depends on.",
        "Why should the affected endpoint not be wiped immediately?",
        "Where should R-08 be used, and what makes attaching it to the affected endpoint a poor choice?",
        "What should a student do on a real unexpected-encryption alert, and which modeled actions belong to authorized responders?"
      ],
      "checklist": [
        "Name the affected fictional endpoint precisely.",
        "Include evidence preservation and notification.",
        "Separate student reporting from authorized technical actions."
      ]
    },
    "discussion": [
      "Why does “no supplied alert” differ from “proved safe”?",
      "What useful facts can a student report without investigating the incident?"
    ],
    "exitTicket": "A fictional endpoint shows an encryption alert and a backup is available. State the student’s immediate role and the safe recovery location in the supplied model.",
    "assessment": {
      "criteria": [
        {
          "label": "Sequence",
          "lookFor": "Relates containment and evidence preservation to readiness for separate recovery."
        },
        {
          "label": "Scope",
          "lookFor": "Distinguishes student reporting from authorized response actions."
        }
      ],
      "success": "Explains the recovery dependency, preserves evidence and identifies a limited student role; model uncertainty is stated accurately."
    },
    "support": [
      "Provide four labeled action cards and a three-part diagram; read the runbook aloud.",
      "Accept an oral sequence with arrows drawn by a partner; use projection instead of independent navigation."
    ],
    "challenge": [
      "Identify two questions the authorized response team would still need to answer before normal use resumes."
    ],
    "standards": [
      "7-8.CY.2",
      "7-8.CY.5"
    ],
    "standardEvidence": "The fictional response plan orders reporting, authorized containment, evidence preservation and clean recovery, with role limits."
  },
  {
    "day": 29,
    "title": "A backup must contain the useful work",
    "objective": "Select a fictional backup using content evidence and describe a separate restore-and-verification plan.",
    "materials": [
      "Teacher-guided NET-206 practice or supplied snapshot cards",
      "Paper or school-managed backup comparison table"
    ],
    "prep": [
      "Open #practice/NET-206. Scaffold this grades 11–12 lab using only snapshot/destination/verification choices and the three inspection tools. No real files, commands or devices are used."
    ],
    "vocabulary": [
      {
        "term": "backup",
        "definition": "A separate copy kept so useful information can be recovered."
      },
      {
        "term": "restore",
        "definition": "Recover information from a saved copy."
      },
      {
        "term": "manifest",
        "definition": "A supplied reference listing the contents and identifying details expected in a copy."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read B-16 Plan only; B-17 Plan and Test results; newest B-18 empty. Ask which contents to inspect and predict what “copy completed” establishes. Recency does not guarantee usefulness."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "A copy can complete while copying the wrong file. Compare title, sections and supplied label after recovery. Preserve the damaged current copy and restore separately under this policy. LAB-VERIFIED-17 is a practice reference, not a real cryptographic guarantee."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Guide scoped controls. Partners alternate catalog reader and verifier. Require content evidence, separate destination and verification. Record unsuccessful choices honestly before revising. Compare the handout manifest even when the model passes."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare “file opens,” “copy completed” and “required contents match.” Ask why to retain the damaged copy and practice recovery before loss; use no personal backup examples."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for useful contents, separate restoration and verification."
      }
    ],
    "lab": {
      "title": "Scaffolded backup-content comparison",
      "route": "#practice/NET-206",
      "steps": [
        "Read the catalog and manifest clues. Use list snapshots to inspect the fixed practice catalog; predict which snapshot contains the requested work.",
        "Choose the snapshot supported by the catalog. Select Separate recovery folder, Preserve damaged copy and Compare content + manifest in the scoped practice controls.",
        "Use Run workspace test, then inspect restored and compare manifest to read the supplied content evidence. Record the actual title, sections and label shown.",
        "Compare those facts with the expected manifest and explain what a passing modeled check does not prove about real backups."
      ],
      "output": "Submit the three-snapshot comparison, separate restore plan and content verification via Classroom; do not upload actual device files.",
      "fallback": "Use B-16 “Network project: Plan,” B-17 “Network project: Plan; Test results; LAB-VERIFIED-17,” B-18 “empty.” Copy a chosen card to paper Recovery/Project and compare title, sections and label with the handout manifest; retain the damaged card."
    },
    "handout": {
      "context": "Requested file: project-notes.txt with title Network project, sections Plan and Test results, practice label LAB-VERIFIED-17. Catalog: B-16 incomplete Plan only; B-17 verified original with both sections; B-18 newest but empty. Recovery policy: keep the damaged current file and restore to a separate Recovery/Project folder. A copy-completed message gives no content comparison.",
      "questions": [
        "Choose a snapshot using two content facts, not its date.",
        "Explain the destination and current-file choices required by the supplied policy.",
        "List three details to compare after restoration. Why is a successful copy message insufficient?",
        "A recovered file opens but lacks Test results. What conclusion is supported, and what should be checked next?"
      ],
      "checklist": [
        "Cite catalog and manifest evidence.",
        "Preserve the current file in your plan.",
        "Distinguish copying from verifying useful contents."
      ]
    },
    "discussion": [
      "How can a backup exist yet fail the user’s recovery goal?",
      "Why should an organization practice restoration before a real loss?"
    ],
    "exitTicket": "Snapshot X is newest but empty; Y has the required Plan and Results. Choose one and give a restore destination and verification step for this fictional policy.",
    "assessment": {
      "criteria": [
        {
          "label": "Selection",
          "lookFor": "Chooses based on required contents and supplied reference evidence."
        },
        {
          "label": "Verification",
          "lookFor": "Checks restored content separately from copy completion while preserving the current file."
        }
      ],
      "success": "Supports a snapshot choice with contents, describes separate recovery and names at least two details to verify."
    },
    "support": [
      "Provide a title/sections/label checklist and read the catalog aloud.",
      "Use paper copies with large section headings; accept spoken comparisons and partner transcription."
    ],
    "challenge": [
      "Explain what else an authorized team would need to establish beyond a matching practice label before trusting a real recovered file."
    ],
    "standards": [
      "7-8.CY.5"
    ],
    "standardEvidence": "Backup content checks and a non-destructive restore support preparation for and recovery from unexpected security problems; no real files are changed."
  },
  {
    "day": 30,
    "title": "Make and defend a security decision",
    "objective": "Use a repeatable evidence-and-scope process to justify protective decisions across four fictional classroom situations.",
    "materials": [
      "SEC-401 practice activity or printed comparison",
      "Four supplied decision cards and school-managed response sheet"
    ],
    "prep": [
      "Open #practice/SEC-401 for brief reference. Prepare four handout cases and private feedback guidance. This reasoning checkpoint has no competition or real investigation."
    ],
    "vocabulary": [
      {
        "term": "justification",
        "definition": "A reasoned explanation connecting evidence to a decision."
      },
      {
        "term": "uncertainty",
        "definition": "What the available information does not establish."
      },
      {
        "term": "escalation",
        "definition": "Passing a concern to someone with the needed responsibility, authority or expertise."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Display Task/scope → evidence → limited action → check/report. Ask which step prevents acting outside one’s role. Reward defensible reasoning, including uncertainty and appropriate escalation."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model: a helper assigned reading requests administrator access. Choose reader access, check the instructions open and record the result. Explain both the enabled task and avoided powers. State unknowns instead of inventing evidence."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs retrieve one exact SEC-401 clue. Each learner answers two cards independently and reviews a partner’s two. Require a fact, authorized action and check/report route. Revise one answer after feedback; no full investigation report is needed."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare decisions needing clarification with choices already supported by policy. Invite a revision and the evidence that changed it. Assess reasoning, not confidence or a passing screen alone."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit. Look for two limited protective decisions and an independent route."
      }
    ],
    "lab": {
      "title": "Evidence-to-decision clinic",
      "route": "#practice/SEC-401",
      "steps": [
        "Inspect the urgent and routine examples. Retrieve one sender or destination detail and explain which trusted comparison makes it relevant.",
        "Use the supplied helper task to choose limited access; use Test this setup and note what that check actually tests.",
        "For each handout card, record the task/scope, one decisive fact, the limited action and a check or reporting route.",
        "Exchange answers with a partner. Mark one unsupported assumption, ask a question and revise one explanation. Submit the reasoning, not a claim of perfect safety."
      ],
      "output": "Submit four decision records and one clearly marked revision via Classroom. All cases remain fictional; no external report or account action is performed.",
      "fallback": "Print handout cards A–D. Compare A’s supplied sender with its trusted sender, then read each card aloud. Complete the same decision records and peer revision on paper."
    },
    "handout": {
      "context": "Fictional cards: A—verify@school-account-check.test requests a password; trusted sender helpdesk@school.test. B—a checklist reader requests administrator access; only reading is assigned. C—summarizing invented text proposes private records and IDs. D—encryption alert names LAB-ENDPOINT-07; students report to a teacher. Authorized runbook: isolate, preserve evidence, notify team, recover separately. Submit work via school Classroom.",
      "questions": [
        "For A and B, state a decisive fact, a limited next action and how to check or report it.",
        "For C, redesign the input and state where the course’s assignment should be submitted.",
        "For D, distinguish student reporting from two runbook actions; name one uncertainty.",
        "Revise one answer after review; explain which evidence or boundary improved it."
      ],
      "checklist": [
        "Address all four cards using facts provided.",
        "Include one check/report route and one uncertainty.",
        "Mark a revision with its reason; do not include real credentials or records."
      ]
    },
    "discussion": [
      "When is “I need permission or more evidence” a strong security answer?",
      "Which decision habit transfers across messages, account access, privacy and recovery?"
    ],
    "exitTicket": "A message asks a reader to become administrator and upload a class list to “verify access.” Reading is the only assigned task. Give two protective decisions and an independent reporting route.",
    "assessment": {
      "criteria": [
        {
          "label": "Transfer",
          "lookFor": "Applies scope, evidence and limited action across different situations."
        },
        {
          "label": "Revision",
          "lookFor": "Uses peer feedback to correct an unsupported assumption or incomplete justification."
        }
      ],
      "success": "Justifies decisions for three cards, identifies a check/report route and improves one response; assess specific understanding in incomplete work."
    },
    "support": [
      "Provide task/fact/action/check boxes; read cards individually.",
      "Accept oral or dictated answers; partners navigate while each explains two cards."
    ],
    "challenge": [
      "Create a fifth fictional card with enough evidence to decide, one genuine uncertainty and a private teacher key."
    ],
    "standards": [
      "7-8.CY.2",
      "7-8.CY.3",
      "7-8.CY.5"
    ],
    "standardEvidence": "Cross-scenario decisions justify safeguards, explain a tradeoff and choose a bounded report/recovery action with remaining uncertainty."
  },
  {
    "day": 31,
    "title": "What an AI response can and cannot tell us",
    "objective": "Trace an AI-assisted task from input to output, then correct a claim using a supplied source and human review.",
    "materials": [
      "AI foundations lab on a managed device or projector",
      "Handout or school-managed document; two colored pencils optional"
    ],
    "prep": [
      "Open #learn/ai and locate Explore, Practice and Check. Explore every learning item before advancing; prepare the source and reply printed in the handout. This lesson uses a fixed authored model, not a live AI conversation."
    ],
    "vocabulary": [
      {
        "term": "AI model",
        "definition": "A system that uses learned patterns to produce a prediction or response; its output can be mistaken."
      },
      {
        "term": "Evidence",
        "definition": "Information used to check a claim."
      },
      {
        "term": "Human review",
        "definition": "A person checks accuracy, fairness and suitability before using an output."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Display two statements: “The reply sounds confident” and “The reply matches the source.” Ask which gives useful evidence. Invite a reason without asking learners to disclose their own AI use. Explain that today everyone examines the same fictional response."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw input → model → output → review. An input tells the system what to work on; a model produces an output from learned patterns, not a guaranteed lookup of truth. Use a fictional request for computer-care advice. Compare “Restart every 30 minutes” with the supplied source “Save work. Restart only when instructed.” Read each word: the reply adds a schedule the source does not provide. A clear request and polished wording cannot establish accuracy. A person must check what the response supports before sharing it."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners alternate navigator and evidence recorder. Follow the lab steps, pausing before each practice choice to predict its effect. Record the original claim and the source-based revision separately. If the Explore stage takes longer, complete the three practice actions together on the projector and let partners independently explain the revision."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare two revisions: one that adds a new schedule and one that stays within the source. Ask which words have evidence. Discuss why this small authored simulation illustrates a review process but does not show the full training or behavior of a real AI system."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit response and look for a comparison with the source plus a person responsible for the final decision. Offer spoken or dictated responses."
      }
    ],
    "lab": {
      "title": "Trace, check and review an AI reply",
      "route": "#learn/ai",
      "steps": [
        "Explore the Prompt, AI model, AI output, Evidence, Bias and Human review items; record one job for each stage.",
        "Select Next: Practice & test and answer the practice questions using the source, not the confidence of the reply.",
        "Choose Use the practice prompt. Read the original reply before selecting Correct the reply.",
        "Select Complete human review. Write what changed, what source supported it and why review remains a person’s job."
      ],
      "output": "A labeled four-stage diagram and the original/revised claim with source evidence.",
      "fallback": "Draw four boxes labeled input, model, output and human review. Give partners the request “Give computer-care advice,” output “Restart every 30 minutes,” and source “Save work. Restart only when instructed.” One partner moves a paper token through the boxes; the other marks where the unsupported schedule must be caught, then they swap roles."
    },
    "handout": {
      "context": "This is a fictional review. Request: Give computer-care advice. Proposed AI reply: Restart every 30 minutes. Source card: Save work. Restart only when instructed. Answer in your school document or on paper; do not enter personal information.",
      "questions": [
        "Label the input, model, output and human-review stages. What does each contribute?",
        "Which part of the proposed reply cannot be supported by the source? Cite the source words that matter.",
        "Write a revision that stays within the source and identify who decides whether it is suitable to use.",
        "What can this fixed simulation help us practice, and what cannot it establish about a real AI system?"
      ],
      "checklist": [
        "I kept the proposed reply separate from the source.",
        "I explained my correction and the role of a human reviewer."
      ]
    },
    "discussion": [
      "Could a correct-looking answer still need review? Explain one reason.",
      "What additional evidence would you need before giving advice about a different device?"
    ],
    "exitTicket": "A reply says “Delete the old file every Friday.” Its source says only “Keep a backup before changing a file.” What should a reviewer do before using the reply?",
    "assessment": {
      "criteria": [
        {
          "label": "Process",
          "lookFor": "Identifies distinct input, output, evidence and review roles."
        },
        {
          "label": "Evidence",
          "lookFor": "Compares the exact source with an added claim and gives a bounded correction."
        }
      ],
      "success": "A source-based correction and a clear human-review decision demonstrate the objective; clicking every button alone does not."
    },
    "support": [
      "Provide the four-stage diagram with arrows already drawn; allow labels to be placed or spoken.",
      "Read source and reply aloud, and let a partner record a dictated explanation."
    ],
    "challenge": [
      "Write a second fictional response that sounds confident but adds an unsupported detail; have a partner identify the evidence gap."
    ],
    "standards": [
      "7-8.IC.1"
    ],
    "standardEvidence": "Supporting practice toward evaluating technology effects: source-checking and human review establish prerequisites; this short activity does not analyze all individual or societal AI tradeoffs."
  },
  {
    "day": 32,
    "title": "Give clear directions without sharing private details",
    "objective": "Revise a fictional AI prompt to include a defined task, audience, practice question and verification step while excluding unnecessary personal data.",
    "materials": [
      "AI-301 practice board or projector",
      "Two prompt cards from the handout; school-managed document or paper"
    ],
    "prep": [
      "Open #practice/AI-301. Locate the prompt tiles, editable prompt, Save prompt and Test this setup controls. Test with invented text only. Explain that its visible fixed rules check prompt ingredients locally and do not generate an AI answer."
    ],
    "vocabulary": [
      {
        "term": "Prompt",
        "definition": "Directions and context provided to an AI system."
      },
      {
        "term": "Constraint",
        "definition": "A limit or requirement a response should follow."
      },
      {
        "term": "Verification",
        "definition": "Checking a result against suitable evidence."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read prompt A: “Explain it to them.” Ask partners to name information the author omitted. Record task, audience and scope. Avoid implying that adding more information always helps; extra private detail can be unnecessary."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model a request for a short explanation of networks for a fictional learner. The subject names the task; “short” limits length; a practice question checks understanding; checking class notes helps review the result. Compare this with a prompt containing the placeholders [student name], [student email] and [diagnosis]. These are demonstration placeholders, not information to fill in. Replace them with an invented learner and remove irrelevant identity or health details. Emphasize that good prompting improves directions but cannot guarantee a true, fair or accessible answer."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs compare the two supplied prompts before opening the board. One partner predicts which ingredients the checker will find; the other edits invented text. Use the tiles or type an original version, save it and check it. Record the checker’s feedback, revise one ingredient and run a fresh check. Swap roles for the second attempt."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Ask groups to read only their fictional prompt and describe one revision. Distinguish “passes the local ingredient check” from “would produce a correct explanation.” Discuss why a privacy-replacement button cannot find every kind of private information."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit prompt. Look for a specific task and evidence check, without requiring the exact words used by the board."
      }
    ],
    "lab": {
      "title": "Build and check a practice prompt",
      "route": "#practice/AI-301",
      "steps": [
        "Read the privacy note and learning goal. Predict what is missing from “Explain networks.”",
        "Use the prompt tiles or editor to request a short network explanation for a fictional learner, one practice question and a check against class notes.",
        "Select Save prompt, then Test this setup. Record one item of feedback.",
        "Change one part of your prompt and save and check again. Explain the change; do not request or paste real AI output."
      ],
      "output": "Two prompt versions, checker feedback and a sentence explaining the revision and remaining uncertainty.",
      "fallback": "Write the four ingredient labels fictional learner, short network explanation, practice question and class-note check on paper. A partner checks prompt A “Explain it to them” and prompt B from the handout against these labels. Revise A, then have a second pair check it. The paper check does not generate or verify an AI answer."
    },
    "handout": {
      "context": "Prompt A: Explain it to them. Prompt B: For a fictional learner, give a short explanation of computer networks. Include one practice question. Check the explanation against class notes. Demonstration-only private placeholders such as [student email] are not blanks to fill in.",
      "questions": [
        "What information is missing from prompt A? Name at least two specific ingredients.",
        "Write your own revised prompt using invented context and no identifiers. Explain one wording choice.",
        "Record the first check and one revised check. What changed, and what stayed uncertain?",
        "Why would passing this ingredient check still leave a teacher or learner with work to do?"
      ],
      "checklist": [
        "I saved before checking each version.",
        "My prompt contains no real names, identifiers, passwords or records.",
        "I separated the fixed checker’s feedback from a claim of factual accuracy."
      ]
    },
    "discussion": [
      "When might a shorter prompt be better than a longer one?",
      "What would an accessible practice question need besides clear wording?"
    ],
    "exitTicket": "Revise “Use my class list and explain networks” into a short fictional prompt with a clear learning task and an evidence check.",
    "assessment": {
      "criteria": [
        {
          "label": "Directions",
          "lookFor": "Specifies an understandable task and appropriate output constraints."
        },
        {
          "label": "Privacy and limits",
          "lookFor": "Uses invented context, excludes unnecessary identifiers and recognizes checker limitations."
        }
      ],
      "success": "A usable fictional prompt and an explained revision meet the goal even if a local checker prefers different wording."
    },
    "support": [
      "Offer the four ingredient labels as a checklist and allow sentence stems.",
      "Allow the learner to dictate the prompt while a partner types; assess the reasoning rather than typing speed."
    ],
    "challenge": [
      "Create two clear prompts with different audiences and explain how the wording changes while the evidence-check requirement remains."
    ],
    "standards": [
      "7-8.IC.4"
    ],
    "standardEvidence": "Fictional prompt design removes identifiers and discusses why task-relevant information matters. The local checker is evidence of included ingredients, not AI accuracy."
  },
  {
    "day": 33,
    "title": "Check the claim against the source",
    "objective": "Classify three supplied AI claims by comparing each with a source and explain the difference between unsupported and proven false.",
    "materials": [
      "AI-302 practice board or projected screenshot-free read-aloud",
      "Source and claim cards printed in handout; paper or school document"
    ],
    "prep": [
      "Open #practice/AI-302. This lesson uses only the source/claim portion of a case labeled for older students; do not require the complete investigation. Locate the Supported, Unsupported and Unsupported / biased finding buttons and Test this setup."
    ],
    "vocabulary": [
      {
        "term": "Claim",
        "definition": "A statement that can be examined using evidence."
      },
      {
        "term": "Supported",
        "definition": "Backed by the evidence available for the question."
      },
      {
        "term": "Unsupported",
        "definition": "Not established by the evidence being used; this alone does not prove the opposite."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Say “The guide tells us to check the cable” and “The guide gives every school’s password policy.” Ask which statement could be checked from a two-sentence source. Explain that today the evidence is deliberately limited."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Read the source aloud: “Check the display cable first. Record the test result.” Underline the action and the recording requirement. A matching claim is supported. A claim about a password schedule introduces information absent from this source, so mark it unsupported here; do not teach a universal password-expiration rule. A claim about effort based on a name both lacks evidence and makes an unfair personal inference. Explain that “not in this source” differs from “proved false everywhere.” Additional suitable evidence would be needed for a broader conclusion."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners use the claim table before selecting findings on the board. One reads each claim verbatim; the other cites exact source words or identifies what is missing. Apply the finding buttons, run the workspace test and record the feedback. The ticket-category portion is tomorrow’s focus; if the complete test mentions unfinished ticket choices, record that limitation rather than rushing through extra material."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Invite groups to defend different wordings for their reasoning. Require a source reference, not “the computer marked it right.” Ask what kind of source would be relevant to a genuine password-policy question. Keep the discussion general; no learner should disclose a real password or account detail."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the new source in the exit prompt to check transfer. Accept an oral answer with a clearly identified evidence gap."
      }
    ],
    "lab": {
      "title": "Source-and-claim review desk",
      "route": "#practice/AI-302",
      "steps": [
        "Read Source v4.2 on the board and copy its two actions into your notes.",
        "Before clicking, classify each of the three claims in your handout and justify it using this source.",
        "Use each claim’s finding button rather than dragging if preferred. Select Test this setup and read feedback relevant to claims.",
        "Revise one explanation if needed. State that this scoped activity does not complete the entire older-student case."
      ],
      "output": "A three-row claim/finding/evidence table and one explanation of an evidence limitation.",
      "fallback": "Cut or copy the source and three claim cards from the handout. Sort under Supported, Unsupported and Unsupported / biased. Another pair acts as reviewers and must point to the source or name missing evidence before accepting a finding. Move a card only after explaining the revision."
    },
    "handout": {
      "context": "Source v4.2: Check the display cable first. Record the test result. Claims: (1) Check the display cable first. (2) Reset passwords every 90 days. (3) Their name shows they did not try. Treat these three claims as the proposed report. Review these claims only against the supplied source; the second claim is not a statement of this course’s password advice.",
      "questions": [
        "For each claim, record a finding and the exact supporting words or missing evidence.",
        "Why does “unsupported by this source” not automatically mean “proved false in every situation”?",
        "Rewrite the proposed report so it contains only source-supported actions, and identify an action the report omitted.",
        "What should a reviewer do if a needed policy claim cannot be checked from the available source?"
      ],
      "checklist": [
        "My findings include evidence rather than only labels.",
        "I did not turn a missing fact into a universal claim."
      ]
    },
    "discussion": [
      "Can one supported sentence make an entire report trustworthy? Why?",
      "How can a reviewer communicate uncertainty without hiding useful evidence?"
    ],
    "exitTicket": "Source: “Save a separate copy before editing.” A reply adds “Use the red folder.” What finding fits the added instruction, and what evidence would you seek?",
    "assessment": {
      "criteria": [
        {
          "label": "Claim review",
          "lookFor": "Checks each claim separately against the supplied source."
        },
        {
          "label": "Bounded conclusion",
          "lookFor": "Distinguishes lack of support from a claim disproved in every context."
        }
      ],
      "success": "Accurate source comparisons for the claims and one clearly stated limitation demonstrate understanding; completing the wider case is unnecessary."
    },
    "support": [
      "Provide a table with columns claim, source words and finding; read the cards aloud.",
      "Offer “The source says…; it does not say…” and allow spoken evidence citations."
    ],
    "challenge": [
      "Write a mixed claim containing one supported action and one unsupported detail; have a partner separate its parts."
    ],
    "standards": [
      "7-8.IC.5"
    ],
    "standardEvidence": "Supporting practice toward bias analysis: reject a name-based effort inference and separate unsupported claims from evidence. Direct comparison and sources/effects of unequal treatment follow in day 34."
  },
  {
    "day": 34,
    "title": "Equivalent evidence deserves a consistent decision",
    "objective": "Compare equivalent fictional tickets, identify an irrelevant personal cue and propose an evidence-based review rule with a stated limitation.",
    "materials": [
      "AI-302 practice board or projector",
      "Two fictional tickets and comparison table in handout"
    ],
    "prep": [
      "Open #practice/AI-302 and locate the Alex and Jordan ticket-category controls below the claims. Keep the scope to this matched pair; do not imply that two examples audit all forms of bias. Have paper copies ready to remove navigation barriers."
    ],
    "vocabulary": [
      {
        "term": "Bias",
        "definition": "A pattern that can treat people or groups unfairly, including through irrelevant assumptions."
      },
      {
        "term": "Equivalent cases",
        "definition": "Cases that share the evidence relevant to a decision."
      },
      {
        "term": "Decision rule",
        "definition": "A stated way to choose a result from relevant evidence."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read two tickets with identical symptoms and ask for a category before revealing the fictional names. Then reveal Alex and Jordan. Ask whether this new information changes the technical evidence, without inviting assumptions about a person’s identity."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Build a two-column comparison: monitor has power; HDMI cable disconnected. Both columns match. The names differ but do not explain a disconnected cable. A consistent technical rule should use the symptom and connection evidence. Clarify that fairness is not simply forcing all outcomes to match: different relevant needs may justify different support. Today’s controlled pair keeps relevant facts the same so an irrelevant cue can be isolated. A matched pair can reveal a problem worth investigating, but cannot establish that every future decision will be fair. Bias can enter through unrepresentative examples, labels or a rule that treats an irrelevant personal cue as meaningful. The effect can be unequal support for people with the same technical need. This controlled pair examines one possible cue, not every source of bias."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners first underline shared technical evidence and circle the changed cue. Use the ticket controls to compare two deliberately different category choices, then revise them using an explicit rule. Record what changed in the board preview and run a fresh workspace test. If other claim checks remain unfinished, distinguish that feedback from the scoped ticket task. Swap the rule writer and reviewer roles."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Share rules without naming real classmates or discussing their records. Ask whether two matching but technically wrong categories would be adequate. Require both consistency and support from the cable evidence. Explain that human review should consider who may be left out and what evidence is missing."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the exit rule and limitation. Look for attention to relevant facts rather than identical outcomes in every conceivable case."
      }
    ],
    "lab": {
      "title": "Matched-ticket fairness review",
      "route": "#practice/AI-302",
      "steps": [
        "Read the Alex and Jordan tickets: both monitors have power and a disconnected HDMI cable. List the same and different information.",
        "Predict whether the relevant category should change when only the fictional name changes.",
        "Compare the ticket category controls. Choose categories justified by the same technical evidence and observe the matching-category preview.",
        "Test this setup after your revision. Record the rule you used and one reason this tiny comparison cannot prove overall fairness."
      ],
      "output": "A same/different table, a relevant-evidence decision rule and a bounded fairness conclusion.",
      "fallback": "Give one partner card A and another card B: both say “Monitor has power; HDMI cable disconnected”; A is labeled Alex and B Jordan. Each independently chooses a technical category and explains it. Exchange cards with the names covered and compare decisions. Discuss any change, then write a shared evidence-based rule."
    },
    "handout": {
      "context": "Fictional ticket A: Alex — monitor has power; HDMI cable disconnected. Fictional ticket B: Jordan — monitor has power; HDMI cable disconnected. Only the name differs. No personal history, effort or ability is supplied. Use the technical evidence to review the classification.",
      "questions": [
        "List two shared facts and the one changed cue. Which information is relevant to the technical category?",
        "Write a consistent decision rule for this pair and justify it with the shared evidence.",
        "If both tickets receive the same unsupported category, has the review succeeded? Explain.",
        "What can this pair reveal? Name one possible source of system bias, one effect on people, and additional review needed before a broader fairness claim."
      ],
      "checklist": [
        "I based my rule on relevant evidence.",
        "I checked both technical accuracy and consistency.",
        "My conclusion includes a limitation."
      ]
    },
    "discussion": [
      "When could different outcomes be appropriate because relevant needs differ?",
      "What should a person do after discovering a potentially unfair pattern?"
    ],
    "exitTicket": "Two fictional requests both say “keyboard unplugged.” Only their names differ. State a fair technical review rule and one limit of this two-case test.",
    "assessment": {
      "criteria": [
        {
          "label": "Comparison",
          "lookFor": "Separates matched technical evidence from an irrelevant changed cue."
        },
        {
          "label": "Fairness reasoning",
          "lookFor": "Requires both evidence-based accuracy and consistent treatment, with a limited conclusion."
        }
      ],
      "success": "An explicit evidence-based rule and a realistic limitation meet the objective; simply matching two buttons does not."
    },
    "support": [
      "Use a side-by-side table and cover the fictional names during the first comparison.",
      "Allow a dictated rule or color/shape marking of shared facts; never require color alone."
    ],
    "challenge": [
      "Create a third fictional ticket with one relevant technical difference and explain whether a different category is justified."
    ],
    "standards": [
      "7-8.IC.5"
    ],
    "standardEvidence": "The matched pair isolates an irrelevant cue, connects a possible design/data source to unequal support and requires a bounded conclusion plus further review."
  },
  {
    "day": 35,
    "title": "Choose an AI workflow that fits the learning task",
    "objective": "Design a fictional learning workflow using only necessary information, an equivalent non-AI option and a clear human-review responsibility.",
    "materials": [
      "AI-304 practice board or projector",
      "Fictional paragraph and workflow table from handout; paper or school document"
    ],
    "prep": [
      "Open #practice/AI-304. Locate Input, Identifiers, Route and Participation cards plus Test this setup. Explain that choosing an external route illustrates a proposal; the board does not send text to that service. No external service use is required or authorized by this lesson."
    ],
    "vocabulary": [
      {
        "term": "Data minimization",
        "definition": "Using only the information necessary for the stated purpose."
      },
      {
        "term": "Non-AI alternative",
        "definition": "Another way to reach the same learning goal without AI."
      },
      {
        "term": "Data flow",
        "definition": "The path information takes between people, devices or services."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "State the goal: summarize an invented paragraph. Display possible inputs “invented paragraph” and “private reading records.” Ask which task each would serve and whether the learning goal requires a real learner’s identity."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Draw input → processing → reviewer → school submission. Use the handout paragraph; its content is enough to practice summarizing. Names, emails, student IDs, diagnoses and private records do not improve this task. A local scripted preview is the activity’s supplied practice route; it is not a general guarantee about every app or device. Model an equivalent alternative: read the same paragraph and use the teacher’s summary checklist. A choice is meaningful only if the alternative reaches the goal without a penalty. School review and applicable permissions are separate from a checkbox or a learner’s willingness."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners inspect each card, predict what would travel and change one choice at a time. Record the before/after route and test the plan. Then design their own workflow on paper using the supplied paragraph; identify the person checking the summary, the alternative and where the finished assignment is submitted. No real student text is entered into an outside service."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare plans that minimize data but omit an alternative, or offer a choice while retaining unnecessary identifiers. Ask why each part matters. Discuss how saying “no student accounts” leaves ordinary hosting requests and school-managed submissions to be considered separately."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect a short decision, not a signed consent statement. Look for purpose, minimum information and an equivalent path."
      }
    ],
    "lab": {
      "title": "Trace what information travels",
      "route": "#practice/AI-304",
      "steps": [
        "Read the actual task and participation notes. List what information summarizing an invented paragraph requires.",
        "Inspect the four cards and sketch the initial proposed data route.",
        "Change Input to invented text, omit learner identifiers, use the local scripted preview and offer the equivalent non-AI option. Explain each choice before testing.",
        "Select Test this setup and record the evidence. Add a human reviewer and school-managed submission destination to your own paper workflow."
      ],
      "output": "A labeled data-flow diagram and four justified choices, including the equivalent non-AI task.",
      "fallback": "Make four paper cards labeled Input, Identifiers, Route and Participation. Use choices invented paragraph/private records, none/name+ID, local preview/external service and equivalent alternative/required. A partner traces each proposed route with a finger and explains which choices fit the stated summary task. Revise the cards and draw the final workflow."
    },
    "handout": {
      "context": "Fictional paragraph: The school garden team used a rain barrel to water six planters. On dry days, partners checked the soil before adding water. They recorded which planters needed attention. Learning goal: write a two-sentence summary containing the main idea and one supporting detail. Alternative: summarize the paragraph yourself using that same checklist.",
      "questions": [
        "Which information is necessary for this task, and which learner information should be excluded? Explain why.",
        "Draw the proposed input, processing, review and submission path. Label what travels at each step.",
        "Describe an equivalent non-AI activity and how a learner can choose it without losing the learning opportunity.",
        "What school or human review still matters even if the board’s local test passes?"
      ],
      "checklist": [
        "My example uses invented content and no identifiers.",
        "My plan includes a reviewer and an equivalent alternative.",
        "My diagram distinguishes the lab from school submission."
      ]
    },
    "discussion": [
      "Could a non-AI tool sometimes be the better choice for this goal? Why?",
      "What questions should a teacher ask before replacing the supplied local preview with another service?"
    ],
    "exitTicket": "A plan summarizes invented text but also collects a learner’s name and makes AI use compulsory. Name two changes that better fit the learning task.",
    "assessment": {
      "criteria": [
        {
          "label": "Purpose and information",
          "lookFor": "Connects each included input to the stated learning purpose."
        },
        {
          "label": "Participation and review",
          "lookFor": "Provides an equivalent alternative and identifies human/school review responsibilities."
        }
      ],
      "success": "A workable, minimum-information route with a meaningful alternative and reviewer meets the goal; a checkbox alone does not."
    },
    "support": [
      "Supply the four-card route labels and allow a partner to read each choice.",
      "Accept an oral walkthrough or tactile paper-card arrangement instead of a drawn diagram."
    ],
    "challenge": [
      "Compare the proposed AI-assisted workflow with a non-AI workflow using the same summary goal; explain a benefit, cost and uncertainty for each."
    ],
    "standards": [
      "7-8.IC.1",
      "7-8.IC.4",
      "7-8.CY.3"
    ],
    "standardEvidence": "A purpose-limited data plan and equivalent non-AI option support evaluation of privacy choices and practical participation tradeoffs; full societal-impact analysis remains beyond this short activity."
  },
  {
    "day": 36,
    "title": "Read, predict, change and test a program",
    "objective": "Trace a short calculation program, repair an operator and test the same program against multiple supplied inputs.",
    "materials": [
      "Coding foundations lab on a managed device or projector",
      "Handout trace table; paper or school-managed document"
    ],
    "prep": [
      "Open #learn/coding and locate Explore, the practice editor, Add (+), Multiply (*) and Run all practice inputs. The foundation starter uses JavaScript-style let and print notation in a bounded local teaching interpreter; tomorrow introduces Python explicitly. Prepare quantities 0, 2 and 5 with targets 0, 6 and 15."
    ],
    "vocabulary": [
      {
        "term": "Algorithm",
        "definition": "An ordered set of steps for solving a problem."
      },
      {
        "term": "Operator",
        "definition": "A symbol that chooses a calculation or comparison."
      },
      {
        "term": "Debugging",
        "definition": "Finding a mistake, changing the program and testing the changed version."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask learners to give steps for finding the cost of two fictional kits costing three credits each. Separate the rule from its answer: one answer may be six, but a useful algorithm must also handle a different quantity."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Write the foundation starter: let price = 3; print(quantity + price);. Read it as “store a price of three; add quantity and price; show the result.” For quantity two, trace the addition without fixing it yet, then compare with the requested two groups of three. The program can run successfully while solving the wrong problem. Explain that quantity is supplied by each test; replacing it with one fixed answer would hide rather than repair the rule. After changing the operator, every test must be rerun because old evidence describes old code."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Learners explore all six coding items, then answer the practice questions and open the editor. Partners alternate code reader and test recorder. Predict the original outputs, change only the operator and select Run all practice inputs. Record target and actual output for each quantity. If time is short, model Explore on the projector and let pairs perform the trace and repair on paper."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare why the zero test is useful: addition can produce a nonzero charge for zero kits. Discuss why a green result on one quantity cannot establish that a changing-input program is generally correct. Ask what a run failure and a wrong-but-running calculation each tell us."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect a prediction for a new input and the proposed checking step. Assess explanation and trace evidence, not speed or first-attempt success."
      }
    ],
    "lab": {
      "title": "Repair the calculation rule",
      "route": "#learn/coding",
      "steps": [
        "Explore Input, Variable, Operator, Output, Prepared test and Debugging, then advance through the practice questions.",
        "Before editing, trace the starter for quantities 0, 2 and 5 and record predicted outputs.",
        "Open the practice code and change the calculation to match three credits per kit, keeping quantity as the changing input.",
        "Select Run all practice inputs. Record all targets and actual outputs, and explain why each changed-code version needs fresh tests."
      ],
      "output": "A before/after trace table for three inputs and a one-sentence description of the repaired rule.",
      "fallback": "Use the handout program and cards quantity=0, quantity=2 and quantity=5. One partner acts as the interpreter, reading each line exactly; the other records the output. Compare with the required three-credits-per-kit totals, replace the operator on a paper program card and trace every input again."
    },
    "handout": {
      "context": "Each fictional kit costs 3 credits. The changing input is quantity. Starter: let price = 3; print(quantity + price);. Tests: quantity 0 should cost 0; quantity 2 should cost 6; quantity 5 should cost 15. This notation belongs to the supplied teaching interpreter; it is not Python.",
      "questions": [
        "Trace the original program for quantities 0, 2 and 5. Record each output and whether it matches the target.",
        "Describe the intended algorithm in words, then identify the operator change that implements it.",
        "Record the changed program’s outputs for all three tests. What makes the zero test useful?",
        "Why is replacing the program with print(6) an inadequate repair even if one test passes?"
      ],
      "checklist": [
        "My table includes predictions and observed or traced results.",
        "I kept the changing quantity input.",
        "I reran every supplied test after changing the rule."
      ]
    },
    "discussion": [
      "What is the difference between code that runs and code that meets the task?",
      "How can an incorrect prediction help a programmer learn?"
    ],
    "exitTicket": "Four kits cost 3 credits each. Predict the intended output, explain the rule, and say what you should do after any further code edit.",
    "assessment": {
      "criteria": [
        {
          "label": "Tracing",
          "lookFor": "Follows the supplied calculation accurately for different inputs."
        },
        {
          "label": "Testing",
          "lookFor": "Repairs the rule rather than hardcoding an example and checks changed code with all fixtures."
        }
      ],
      "success": "A correct changing-input rule plus multiple fresh tests demonstrates the objective; an explained unfinished attempt still earns reasoning feedback."
    },
    "support": [
      "Provide a trace table with quantity, operator, price and output columns.",
      "Use counters in groups of three or allow spoken tracing while a partner records; keyboard alternatives are sufficient."
    ],
    "challenge": [
      "Propose a fourth input and explain what additional evidence it gives beyond the original three tests."
    ],
    "standards": [
      "7-8.CT.6"
    ],
    "standardEvidence": "Tracing and revising the arithmetic algorithm is introductory practice toward designing, comparing and refining task algorithms. Conditional/repetition debugging follows in days 38–40."
  },
  {
    "day": 37,
    "title": "Variables let one rule handle many orders",
    "objective": "Use a changing input and a named variable in a short Python calculation, predicting and checking normal and zero inputs.",
    "materials": [
      "Blank coding sandbox on a managed device or projector",
      "Handout with exact Python starter and test table"
    ],
    "prep": [
      "Open #sandbox/blank. Locate Language, Your code, Input number, Run program and Keep your code. Choose Python. These are a documented local subset, not a full Python runtime; no packages, files or network calls are used. Prepare to paste the handout code with its line breaks."
    ],
    "vocabulary": [
      {
        "term": "Variable",
        "definition": "A name that refers to a value used by a program."
      },
      {
        "term": "Assignment",
        "definition": "Setting a variable to a value, written with = in this Python example."
      },
      {
        "term": "Input",
        "definition": "A value supplied to the program; the sandbox supplies it as input."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Display orders for 0, 2 and 5 kits, each at three fictional credits. Ask what changes and what remains constant. Explain that programming names let us express the relationship without writing a different program for every order."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Show the three-line Python starter from the handout. Read price = 3 as storing a value, total = input + price as computing from the supplied input, and print(total) as displaying the value. Assignment is not the same statement as mathematical equality for all time: a later assignment can update a variable. Explain that the sandbox’s input name is a supplied number, not Python’s usual input() function. Predict the starter’s output before fixing it. Keep the lesson focused on the numeric relationship rather than formatting or money handling."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners select Python, enter the starter and type Input number values 0, 2 and 5, selecting Run program each time. Record actual output beside predictions and targets. Revise the calculation to implement the required rule, then repeat all tests. Change the price variable to four for a clearly labeled extension only after recording the three-credit results. Copy or download code before closing the page."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare a variable-based program with three separate fixed answers. Ask why multiplication continues to work when quantity changes. Invite learners to explain the difference between input, price and total using values from one run. Restore price to three before collecting the core task."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit prompt to test whether learners can transfer the rule to a changed input and price without editing the input inside the code."
      }
    ],
    "lab": {
      "title": "Build a changing-input supply calculator",
      "route": "#sandbox/blank",
      "steps": [
        "Choose Python and enter exactly: price = 3; total = input + price; print(total), with each statement on a separate line.",
        "Predict outputs for Input number 0, 2 and 5, then select Run program separately for each. Compare with the required kit totals.",
        "Change the total calculation so the same program multiplies the changing input by the price. Test 0, 2 and 5 again.",
        "Copy or download the code through Keep your code and put its text plus the test table in the school assignment; sandbox runs do not submit or grade work."
      ],
      "output": "Python code and a test table identifying input, expected output, actual output and the revision made.",
      "fallback": "Write price=3, total=input+price and print(total) on separate paper strips. Set an input card to 0, 2 or 5 and move value counters through the strips. Record outputs, change the operator, then trace each input again. Preserve each version in the table just as you would after a computer run."
    },
    "handout": {
      "context": "Task: compute the cost of any supplied whole-number quantity of kits at 3 fictional credits each. Python starter:\nprice = 3\ntotal = input + price\nprint(total)\nThe sandbox supplies input. Do not call input() or replace input with a fixed order. Required tests: 0→0, 2→6, 5→15.",
      "questions": [
        "Identify the changing input, the price variable and the output variable. Explain each using one run.",
        "Predict the starter’s outputs for 0, 2 and 5 before running it. How do they compare with the targets?",
        "Write the repaired program and record all three expected and actual results.",
        "If price becomes 4 and input is 3, what should the rule print? Explain without hardcoding that result."
      ],
      "checklist": [
        "My selected language is Python.",
        "My code keeps the supplied input and uses a variable.",
        "My submitted table matches the final code version."
      ]
    },
    "discussion": [
      "Why can a meaningful variable name make code easier to review?",
      "When might a calculation run without an error message but still be wrong?"
    ],
    "exitTicket": "For price = 4, total = input * price and input 6, what prints, and which value should be changed to test a different order?",
    "assessment": {
      "criteria": [
        {
          "label": "Variables",
          "lookFor": "Distinguishes input, stored price and calculated total."
        },
        {
          "label": "General rule",
          "lookFor": "Uses multiplication with the changing input and checks multiple cases."
        }
      ],
      "success": "The same program handles zero and two positive quantities, and the learner explains its variables; test evidence matters more than output decoration."
    },
    "support": [
      "Provide a copyable starter and highlight only the line to revise; allow a partner to type.",
      "Accept paper tracing or dictation of the calculation and test results; do not penalize access needs or spelling outside the code."
    ],
    "challenge": [
      "Add a named fixed setup cost and explain how it changes the zero-quantity result and the task requirements."
    ],
    "standards": [
      "7-8.CT.7"
    ],
    "standardEvidence": "Introductory variable practice with changing inputs; direct changing-state evidence is strengthened by the running total in day 39."
  },
  {
    "day": 38,
    "title": "A decision changes at its boundary",
    "objective": "Implement a two-way Python decision and test immediately below, at and above its threshold.",
    "materials": [
      "Blank coding sandbox or projector",
      "Python starter, fictional rule and three-row boundary table from handout"
    ],
    "prep": [
      "Open #sandbox/blank and choose Python. Check that the code editor preserves four-space indentation. Use text output so labels remain readable; no real equipment or rewards are controlled. Have the paper trace alternative ready."
    ],
    "vocabulary": [
      {
        "term": "Conditional",
        "definition": "A decision that runs different instructions depending on a condition."
      },
      {
        "term": "Threshold",
        "definition": "A boundary value where a decision can change."
      },
      {
        "term": "Boundary test",
        "definition": "A test at or near the value where behavior changes."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "State a fictional rule: a model room display says Warm at temperatures 20 or higher and Cool below 20. Ask learners to place number cards 19, 20 and 21 in the two groups. Keep this a coding rule, not advice about heating a real building."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Read the Python if/else starter. The symbol > means strictly greater; >= includes equality. Predict the path for exactly 20 before any run. Indentation marks which print belongs to each branch. A colon starts the branch block; else handles the other case. Model tracing a different threshold, 10, so learners still have to solve the assessment boundary themselves. Explain that testing only faraway values can miss the one input where an inclusive/exclusive mistake appears."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs enter the supplied starter in Python and record predictions for 19, 20 and 21. Run each input and compare with the stated rule. Change only the comparison needed, then rerun all three inputs. One partner traces the branch aloud while the other checks that the code and test row describe the same version; swap after the edit."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare two repairs, one changing the operator and one changing the input. Ask which repairs the general decision rather than avoiding the failing case. Discuss why “the program printed a word” does not establish that it followed the rule. Read indentation errors as useful clues, with no penalty for needing help."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect a new threshold prediction and an explanation of equality. Accept a number-line annotation or spoken answer."
      }
    ],
    "lab": {
      "title": "Test the exact threshold",
      "route": "#sandbox/blank",
      "steps": [
        "Choose Python and copy the handout program with its indentation and colons.",
        "Before running, predict the starter’s output at Input number 19, 20 and 21. Run each input separately.",
        "Compare actual output with the rule “Warm at 20 or higher.” Change the comparison to include the required boundary.",
        "Run all three tests again. Copy the final code and table into the school assignment; explain the single-value boundary error you investigated."
      ],
      "output": "Final two-branch program, three boundary tests and an explanation of why the at-threshold test mattered.",
      "fallback": "Draw a decision diamond labeled input > 20. Trace paper tokens 19, 20 and 21 to Warm or Cool, recording the paths. Compare with the stated inclusive rule, relabel the comparison and move all three tokens again. Another pair checks whether the decision includes equality."
    },
    "handout": {
      "context": "Fictional display rule: print Warm when the supplied temperature is 20 or higher; print Cool below 20. Python starter:\nif input > 20:\n    print(\"Warm\")\nelse:\n    print(\"Cool\")\nTests are 19, 20 and 21. Preserve indentation. This display is not connected to real equipment.",
      "questions": [
        "Predict and record the starter’s output for 19, 20 and 21. Which test distinguishes > from >=?",
        "Write the repaired program and record expected and actual output for all three tests.",
        "Explain why testing only 5 and 35 could miss this mistake.",
        "For a new rule “Alert at 8 or higher,” name three useful nearby tests and state the expected output category for each."
      ],
      "checklist": [
        "I tested below, at and above the boundary.",
        "My table refers to the final comparison.",
        "I explained equality rather than only copying the passing code."
      ]
    },
    "discussion": [
      "How can a clearly written rule prevent a disagreement about a boundary?",
      "Where could an off-by-one decision matter in a harmless classroom program?"
    ],
    "exitTicket": "A rule says print Ready at 10 or higher. A program tests input > 10. What happens at 10, and what comparison would match the rule?",
    "assessment": {
      "criteria": [
        {
          "label": "Condition",
          "lookFor": "Connects the comparison operator with the inclusive written rule."
        },
        {
          "label": "Boundary evidence",
          "lookFor": "Tests and explains values below, at and above the threshold."
        }
      ],
      "success": "The program meets the two-way rule for three boundary tests and the learner explains the equality case; memorizing a symbol without an explanation is incomplete."
    },
    "support": [
      "Provide a number line with the threshold marked and a copyable indented code block.",
      "Use paper branch tracing, a read-aloud or dictated explanation; allow syntax help without removing the reasoning task."
    ],
    "challenge": [
      "Design a three-way fictional display with two thresholds and list all boundary tests before writing code."
    ],
    "standards": [
      "7-8.CT.6",
      "7-8.CT.8",
      "7-8.CT.9"
    ],
    "standardEvidence": "Decision tracing and boundary debugging support algorithm and control-structure work. CT.8 requires combined control structures; a conditional by itself is preparatory."
  },
  {
    "day": 39,
    "title": "Trace a loop and its running total",
    "objective": "Trace a short Python loop, explaining the counter, running total and the different output of an empty trip.",
    "materials": [
      "Rover sandbox or projector",
      "Trace table and Python code in handout; counters or small paper squares optional"
    ],
    "prep": [
      "Open #sandbox/rover and select Python. The supplied starter is labeled for older students; this lesson narrows it to inputs 0–4 and teacher-guided tracing, with no requirement for a complete advanced investigation. Use Printed output to inspect individual values."
    ],
    "vocabulary": [
      {
        "term": "Loop",
        "definition": "Instructions that repeat while a stated sequence or condition allows."
      },
      {
        "term": "Counter",
        "definition": "A value that tracks the current repeat or position."
      },
      {
        "term": "Accumulator",
        "definition": "A variable that keeps a running total as the program repeats."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Place three paper route cards labeled leg 1, leg 2 and leg 3. Each leg costs its number in imaginary energy units. Ask partners to add the costs, keeping the leg number separate from the total. This is a number model, not a real rover controller."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Read energy = 0, then for leg in range(1, input + 1). In this Python subset, range stops before its second argument; adding one lets the loop include the requested last leg. For an input of two, legs are one and two. After energy = energy + leg, the old total is replaced by old total plus current cost. Trace one row at a time. The starter prints inside the loop, so it shows a running total after each leg. For zero legs the loop body never runs, so that starter prints no lines."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Pairs trace inputs one and three before running the starter. One acts as counter reader and the other updates the accumulator column. Check each Printed output line against the trace. Try input zero and discuss the absence of output. Then move print(energy) outside the loop by removing its indentation; predict and rerun zero, one and three. Copy the final program before closing."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare the inside-print and outside-print versions. Both can be useful, but they answer different display requirements. Ask why a final-total program should still show zero for an empty trip. Distinguish zero output from no output."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use a short new trace in the exit prompt. Encourage counters, paper rows or oral narration instead of mental calculation."
      }
    ],
    "lab": {
      "title": "From running totals to one final total",
      "route": "#sandbox/rover",
      "steps": [
        "Choose Python in the Rover energy route starter. Read the code and predict Printed output for Input number 1 and 3.",
        "Run each input and compare every output line with your trace table.",
        "Set Input number to 0 and run. Explain why the starter produces no printed lines.",
        "Move print(energy) outside the loop by removing its indentation. Predict and run 0, 1 and 3 again; record the final totals and copy the changed code."
      ],
      "output": "A three-leg trace table, before/after output placement comparison and saved final-total code.",
      "fallback": "Use paper columns leg, old energy and new energy with route cards one, two and three. Start energy at zero; move one card at a time and add that card’s value. Place a PRINT token first inside the repeated steps and then after them. Repeat with no leg cards and compare the number of output lines."
    },
    "handout": {
      "context": "A fictional trip costs 1 energy unit for leg 1, 2 for leg 2, and so on. Python starter:\nenergy = 0\nfor leg in range(1, input + 1):\n    energy = energy + leg\n    print(energy)\nUse whole-number inputs 0–4 only. Moving print(energy) outside the loop means giving it no leading spaces.",
      "questions": [
        "For input 3, trace each leg with old energy, added cost and new energy. List the starter’s printed lines.",
        "What prints for input 0 in the starter, and why? Distinguish no output from printing zero.",
        "Move the print after the loop. Record expected and actual results for inputs 0, 1 and 3.",
        "Why do leg and energy need different meanings even when their values sometimes match?"
      ],
      "checklist": [
        "My trace updates the total one repeat at a time.",
        "I tested the empty trip.",
        "I identified whether print is inside or outside the loop."
      ]
    },
    "discussion": [
      "When would a running display be more helpful than a single final total?",
      "How could leaving out the last leg affect a trip calculation?"
    ],
    "exitTicket": "Start energy at 0. Add legs 1, 2, 3 and 4 once each, then print after the loop. What final value prints, and how many output lines should appear?",
    "assessment": {
      "criteria": [
        {
          "label": "Loop trace",
          "lookFor": "Distinguishes the changing leg number from the accumulated total."
        },
        {
          "label": "Output and empty case",
          "lookFor": "Explains print placement and checks the zero-repeat case."
        }
      ],
      "success": "A correct short trace and an explanation of empty-trip behavior show the objective; using paper rather than the editor is equally valid evidence."
    },
    "support": [
      "Provide the loop header and table rows; use physical counters for old total plus current leg.",
      "Trace together once, then accept a spoken second trace or partner typing while retaining individual reasoning."
    ],
    "challenge": [
      "Predict input 4 before running and compare your final total with a repeated-addition calculation; do not use a formula you cannot explain."
    ],
    "standards": [
      "7-8.CT.7",
      "7-8.CT.8",
      "7-8.CT.9"
    ],
    "standardEvidence": "A running total demonstrates changing state and a loop trace. CT.8 remains preparatory unless the learner also combines a conditional with repetition."
  },
  {
    "day": 40,
    "title": "Build, test and explain a small program",
    "objective": "Develop a small changing-input program against a written requirement, document boundary tests and explain a revision or verified prediction.",
    "materials": [
      "Blank coding sandbox or projector",
      "Mini-project brief and test-table template in handout; school-managed document"
    ],
    "prep": [
      "Open #sandbox/blank, select Python and locate Keep your code. Prepare the provided guided option for learners who need it. This is a short formative build before the final project; a small working requirement is preferable to untestable complexity. All practice text and quantities are fictional."
    ],
    "vocabulary": [
      {
        "term": "Requirement",
        "definition": "A specific behavior a program is expected to provide."
      },
      {
        "term": "Expected result",
        "definition": "The output predicted from the requirement before running."
      },
      {
        "term": "Regression check",
        "definition": "Rerunning earlier tests after a change to see whether required behavior still works."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Present a mini-project: each activity kit costs two credits; at five or more kits print Group order, otherwise print Small order. Ask what evidence would show the program follows both the calculation and decision requirements. Learners may choose this brief or a teacher-approved equivalent."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model planning before typing: identify the changing input, define each output, select tests and compute expected results independently. Use a separate example with pencils at one credit and a threshold of three to demonstrate planning without solving the handout. Explain that a test table should preserve mismatches honestly. A program that prints the correct result only for one fixed input does not satisfy a changing-input requirement. Keep the design within variables, arithmetic and a two-way conditional; a loop is optional, not another required hurdle."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Partners propose a program and test plan, then receive a quick teacher check of scope. One builds while the other calculates expected outputs from the requirement; switch roles for testing. Run the boundary trio and zero, compare results, revise one issue or check a challenging prediction, then rerun all earlier tests. Use Copy code or Download code (.txt) and place evidence in the school assignment before leaving the page."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Invite short demonstrations with requirement → test → evidence → revision. A failed prediction is useful if its cause is explained. Ask what the tests establish and which inputs or needs remain outside scope. Have learners check that labels can be read as text without depending on bar color."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect an individual exit reflection about a useful test and a next step. Use the mini-project to plan support for the final week rather than awarding credit merely for a polished screen."
      }
    ],
    "lab": {
      "title": "Mini-project: fictional activity-kit orders",
      "route": "#sandbox/blank",
      "steps": [
        "Write your requirement and expected results for input 0, 4, 5 and 6 before coding. Use the handout’s guided brief or a teacher-approved equivalent.",
        "Choose Python and build a short program using the supplied input, at least one named calculation and a two-way decision.",
        "Run every planned input and record actual output beside expected output. Debug a mismatch or verify an initially uncertain prediction, then rerun the full test set.",
        "Use Keep your code to copy or download it. Submit code, tests and explanation in the school assignment; the sandbox does not turn in work."
      ],
      "output": "A written requirement, final code, four test rows and a brief explanation of a revision or checked prediction plus one limitation.",
      "fallback": "Write each program instruction on paper and use input cards 0, 4, 5 and 6. A partner interprets the instructions literally while another records output; the author cannot silently add missing steps. Compare with the independent expected table, revise the instructions and rerun every card."
    },
    "handout": {
      "context": "Guided brief: input is a whole-number quantity of fictional activity kits from 0 through 10. Each costs 2 credits. Print the numeric total on one line. On the next line print Group order at 5 or more kits; otherwise print Small order. Python planning hints: total = input * 2; print(total); use an if/else with indented print statements. You may choose an equivalent brief only after teacher review.",
      "questions": [
        "Write the requirement in your own words and calculate expected outputs for inputs 0, 4, 5 and 6 before running.",
        "Provide your final code and actual results for each test. Which tests examine the decision boundary?",
        "Explain one mismatch you repaired or one uncertain prediction you checked. What evidence changed your thinking?",
        "Name one limitation or untested need and one realistic next improvement."
      ],
      "checklist": [
        "The program uses a changing input rather than fixed answers.",
        "My expected results were calculated from the brief.",
        "I reran all tests after changes and saved code before leaving."
      ]
    },
    "discussion": [
      "How does writing the requirement first help a reviewer judge a program?",
      "What makes a modest, well-tested program useful even if it has few features?"
    ],
    "exitTicket": "Name the most useful test from your mini-project, explain what it checked, and identify one thing your current evidence does not yet establish.",
    "assessment": {
      "criteria": [
        {
          "label": "Design and code",
          "lookFor": "A short program addresses a clear changing-input requirement using a named calculation and decision."
        },
        {
          "label": "Testing and explanation",
          "lookFor": "Expected and actual results cover zero and a boundary; revision or verified prediction is explained honestly."
        }
      ],
      "success": "A coherent requirement, executable or carefully traced program and four evidence-based tests meet the core goal. An unfinished build can demonstrate partial mastery through accurate diagnosis and a clear next step."
    },
    "support": [
      "Offer the guided brief, an indented if/else frame and pre-labeled test rows.",
      "Accept paper code tracing, dictated explanation or a partner acting as typist; keep the learner responsible for predictions and decisions."
    ],
    "challenge": [
      "Add a clearly stated fixed setup cost or a second threshold, then revise the expected-results table before extending the code."
    ],
    "standards": [
      "7-8.CT.7",
      "7-8.CT.8",
      "7-8.CT.9",
      "7-8.CT.10"
    ],
    "standardEvidence": "The program/revision provides variable, debugging and iteration evidence. CT.8 is preparatory for the required single decision/loop; the optional combined-structure extension gives stronger evidence."
  },
  {
    "day": 41,
    "title": "Plan a School Tech Help Kit",
    "objective": "Define an achievable tech-help problem, measurable success criteria and a plan linking course skills.",
    "materials": [
      "Project brief and final rubric on the course project page",
      "School-managed document or paper planning sheet",
      "Browser for the blank coding sandbox, if available"
    ],
    "prep": [
      "Read the final project brief and six-criterion rubric. Prepare the supplied fictional supply-count example. Arrange individual or pair work and a place in Classroom for milestone drafts. No actual classroom inventory or student data is required."
    ],
    "vocabulary": [
      {
        "term": "constraint",
        "definition": "A limit the solution must respect."
      },
      {
        "term": "success criterion",
        "definition": "An observable condition used to judge whether a solution serves its purpose."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Present the request: “A fictional room has six tables. A helper needs to know how many marker packs to prepare if each table gets two.” Ask what input changes and what a helper needs to see. Read the project deliverables aloud; this is a five-day kit, not a real service deployment."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain that a topic (“computers”) is too broad to test. Model a problem statement: “Help a new tech team calculate marker packs from a table count.” A measurable criterion might require correct results for 0, 1 and 6 tables and a clear output label. Model a constraint: use invented quantities, a variable and a decision or loop; never ask for names. A calculation alone needs a small decision/loop added for the final brief."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Students follow the planning lab. The operator explores the blank sandbox interface; the evidence lead records the audience, changing input, proposed rule and three tests. Swap roles after the first test idea. Confer with each team: check that its program can be expressed with the course subset and that the diagram, troubleshooting note and rationale remain manageable."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Invite two contrasting plans. Ask peers to identify a testable criterion and one unnecessary feature. Explain that simulated tests can support a fictional kit; they do not establish that a real school system is safe or approved. Each team narrows one feature if its scope is too large."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect an individual project promise using the exit prompt. Check that each learner can name a changing input and test rather than only a decorative product. Give a short adjustment before the next build lesson."
      }
    ],
    "lab": {
      "title": "Project planning studio",
      "route": "#sandbox/blank",
      "steps": [
        "Read the final brief and choose one fictional problem: supplies, readiness checks or a quantity-based help message.",
        "Identify an audience, one numeric input and an output the helper can understand. Sketch the rule in ordinary language before coding.",
        "Open Blank project. Locate Language, Your code, Input number and Run program; do not enter identity information. Write or sketch a tiny feasibility test.",
        "Record three success criteria and three proposed tests, including zero or a boundary. Assign the five deliverables to days 41–45.",
        "Ask another pair which criterion they could verify; revise one vague phrase."
      ],
      "output": "A project plan with problem, audience, input/output rule, constraints, three success criteria and proposed tests.",
      "fallback": "Use this supplied plan on paper: marker packs = 2 × tables; tables are 0, 1, 6. Add a decision: if tables equals 0, show “No tables planned”; otherwise show the count. Sketch the device-to-school-document path and write three success criteria. Students may substitute another invented quantity rule."
    },
    "handout": {
      "context": "You are helping a fictional school. Plan a School Tech Help Kit with a small program, a system diagram, a troubleshooting procedure, a test table and a privacy/security/accessibility/AI rationale. Keep real names, credentials, records and network details out of the project. A starter problem is two marker packs per table, with a message for zero tables.",
      "questions": [
        "Who will use your kit, what task will it help them do, and what numeric input changes?",
        "Write your proposed rule and three measurable success criteria. Which decision or loop will your program include?",
        "List three test inputs and predicted results. Include zero or a value at a decision boundary.",
        "Plan your five deliverables across the remaining days. Name one privacy constraint and one access alternative."
      ],
      "checklist": [
        "The problem is small enough to finish in five meetings.",
        "A peer can tell how each success criterion will be checked.",
        "The plan uses fictional data and an equivalent accessible response route."
      ]
    },
    "discussion": [
      "Which criterion would catch a wrong result that still looks attractive?",
      "What can your simulation show, and what real-world question remains outside it?"
    ],
    "exitTicket": "For your own kit, name one changing input, one expected output for a specific value, and one constraint you will respect.",
    "assessment": {
      "criteria": [
        {
          "label": "Testable scope",
          "lookFor": "A bounded audience/task with a numeric input and checkable output."
        },
        {
          "label": "Connected plan",
          "lookFor": "Milestones cover all required artifacts and a meaningful constraint."
        }
      ],
      "success": "A feasible plan and at least one independently understandable test; narrow the scope with feedback if necessary."
    },
    "support": [
      "Offer the supplied marker-pack problem and a sentence frame: “For input __, my helper should show __ because __.”",
      "Accept a spoken plan, a labeled sketch or teacher scribing; pair operation does not replace individual explanation."
    ],
    "challenge": [
      "Add a second boundary case or explain an unsupported input such as a negative table count without expanding the product."
    ],
    "standards": [
      "7-8.CT.6",
      "7-8.CT.10"
    ],
    "standardEvidence": "The project plan and testable criteria connect problem decomposition, algorithms and responsible design; exact standards codes are crosswalked separately."
  },
  {
    "day": 42,
    "title": "Build the prototype and explain the system",
    "objective": "Create a small input-driven prototype and a diagram that distinguishes computation, network travel and record storage.",
    "materials": [
      "Day 41 project plan",
      "Blank coding sandbox or paper trace sheet",
      "School-managed document for code and diagram"
    ],
    "prep": [
      "Open #sandbox/blank and preview the supplied Python program. Check the Language selector and code indentation. Provide the final deliverable checklist and a diagram example: learner device → network connection → school document service. Keep this record flow separate from the public lab."
    ],
    "vocabulary": [
      {
        "term": "prototype",
        "definition": "A small working version used to learn and test an idea."
      },
      {
        "term": "data flow",
        "definition": "Where information moves and is used or stored."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask learners to retrieve the Day 41 input and output. A prototype can be plain as long as a helper can understand it. Identify the two products today: running code and a labeled system diagram."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Select Python and model a new example: packs = input * 2; print(\"Marker packs\"); print(packs); then a decision that prints “No tables planned” when input == 0. Explain assignment, multiplication and exact equality; indent the decision body. Trace input 3 to six packs. Draw two separate flows: public lab delivery to the device, and the learner manually writing code/evidence into a school document. The lab does not automatically upload the work to Classroom."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Teams build using the lab steps. Ask the evidence lead to predict before the operator runs. Swap roles after one run. Stop a team that adds names, login or network calls: those features are outside this subset and course scope. Confer on the diagram: label where code executes in the model and where the submitted record belongs."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Compare diagrams with different layouts. Ask what each arrow means; a line without a label is ambiguous. Review the difference between an output label and the value itself. A functional prototype may still need better error handling, evidence and accessibility; record one next improvement."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect a code/trace excerpt and individual exit explanation. If the prototype does not yet run, accept an accurate trace and a named next debugging step so the learner can continue productively."
      }
    ],
    "lab": {
      "title": "Prototype and data-flow studio",
      "route": "#sandbox/blank",
      "steps": [
        "Open Blank project, select Python and enter your planned program. For a starter, use the code in the handout context with four spaces inside the if body.",
        "Set Input number to a chosen test value, predict the printed lines and select Run program. Compare the actual output before editing.",
        "Run a second distinct input. Record the code and both outputs in your school document; the sandbox draft can be lost on reload/close.",
        "Draw the learner device, a network connection and the destination school service. Label public lab delivery separately from manual school-document submission.",
        "Mark one improvement to the program and one point in the diagram where a connection or permission problem could block a task."
      ],
      "output": "Prototype source/algorithm, two input-output observations and a labeled diagram with distinct lab and submission flows.",
      "fallback": "Trace the supplied Python on paper for input 0 and 3. Use boxes for Device, Network and School document service and arrows labeled “load public lab” and “manually submit evidence.” Annotate which step a connection failure would stop. A paper trace is equivalent evidence when the live tool is unavailable."
    },
    "handout": {
      "context": "Python starter (each statement on its own line):\npacks = input * 2\nprint(\"Marker packs\")\nprint(packs)\nif input == 0:\n    print(\"No tables planned\")\nThe sandbox provides the number in input; do not type input() or connect to a real service. It is a local teaching subset, not a complete Python runtime.",
      "questions": [
        "Paste or transcribe your program. Underline its changing variable and circle the decision or loop.",
        "For two inputs, record prediction and observed output or paper trace. Which line explains the numeric result?",
        "Draw the device, network connection and school document destination. Label how public lab delivery differs from submitting work to Classroom.",
        "What is one limitation of your prototype, and what will you test next?"
      ],
      "checklist": [
        "The program or trace responds to a changing input.",
        "Outputs are labeled for the intended reader.",
        "The diagram does not claim that the public lab stores the Classroom submission."
      ]
    },
    "discussion": [
      "Where does the computation happen in this teaching model?",
      "Which part of a diagram would distinguish a working device from a reachable school service?"
    ],
    "exitTicket": "In the supplied starter, what numeric result is printed for input 4? Explain one step the learner must still take to submit evidence to Classroom.",
    "assessment": {
      "criteria": [
        {
          "label": "Prototype logic",
          "lookFor": "A traceable input, variable and decision/loop that support the stated task."
        },
        {
          "label": "System explanation",
          "lookFor": "Labeled components and separate delivery/submission flows."
        }
      ],
      "success": "One coherent prototype or trace and an accurate record-flow explanation, even if a remaining bug is documented."
    },
    "support": [
      "Provide the starter and allow a partner to type dictated code; read each printed line aloud.",
      "Use large labeled boxes or a verbal sequence instead of fine visual drawing."
    ],
    "challenge": [
      "State how the program should treat a negative or fractional input and add a bounded local check if the current subset supports your rule."
    ],
    "standards": [
      "7-8.NSD.2",
      "7-8.NSD.5",
      "7-8.CT.7"
    ],
    "standardEvidence": "The prototype and diagram connect specified hardware, software, input and remote record destination. A changing input alone is preliminary CT.7 evidence; a tracked state or running total strengthens it."
  },
  {
    "day": 43,
    "title": "Test, debug and document a troubleshooting method",
    "objective": "Use normal and boundary tests to improve a program and document a controlled troubleshooting procedure.",
    "materials": [
      "Day 42 prototype and diagram",
      "Blank sandbox or paper test table",
      "Fictional fault evidence in the student handout"
    ],
    "prep": [
      "Review the students’ prototypes for feasible tests. Prepare the supplied incorrect program and arithmetic expectations, without projecting the teacher key. Have an accessible test table with columns Input, Prediction, Observation, Explanation and Revision."
    ],
    "vocabulary": [
      {
        "term": "boundary test",
        "definition": "A test at or beside a point where behavior changes."
      },
      {
        "term": "controlled change",
        "definition": "One deliberate adjustment made so its effect can be interpreted."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Ask whether one successful input proves a program is correct. Show the rule “three cards per group” and the candidate cards = input + 3. Learners predict values for groups 1 and 4 without running. The different predictions create a reason to test."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Explain a test table by tracing the candidate for input 1 and comparing it with the intended rule. Keep the prediction, observation and expected requirement in different columns. Model one controlled edit and a rerun of the old test plus a new test; do not erase the original failure. Connect this method to a computer symptom: observation first, hypothesis next, one change, test original task, hand off what remains unknown."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Teams test their own prototype with at least three inputs, including zero or a boundary. The evidence lead challenges a prediction and the operator makes one justified revision. Both preserve a failed test or document a separately checked confirmation if no failure appears. Then write a four-to-six-step troubleshooting procedure for the supplied monitor fault or their own fictional program fault."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Ask a team to share a failure and a useful next action. Explain that a pass message does not validate unsupported inputs or a real school environment. Have a partner follow the written procedure literally and identify a missing observation or verification step."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Use the exit ticket to check whether a test actually distinguishes the wrong rule from the correct one. Review the submitted tables for observed outputs rather than only statements that testing happened."
      }
    ],
    "lab": {
      "title": "Evidence-driven testing workshop",
      "route": "#sandbox/blank",
      "steps": [
        "Reopen Blank project and restore your code from the school document. Confirm the Language matches the saved source.",
        "Choose three inputs: an ordinary value, zero or a decision boundary, and one new value. Predict exact output before Run program.",
        "Record observed output or a line-by-line paper trace. Compare it with your stated requirement, not merely with what you hoped would happen.",
        "Make one justified change if needed, rerun the failing test and a previous passing test, and preserve both versions or their changed line.",
        "Write and exchange a troubleshooting procedure with symptom, predicted cause, single change, test of the original task and honest next-step handoff."
      ],
      "output": "Three-row test table, evidence of a revision or independently checked confirmation, and a usable troubleshooting procedure.",
      "fallback": "Test this candidate against “three cards per group”: cards = input + 3; print(cards). Trace inputs 0, 1 and 4, compare with the requirement, change one operation and retrace. For the procedure use a fictional monitor that has a power light, a “No signal” message and a cable visibly loose at the computer; never act on real equipment."
    },
    "handout": {
      "context": "Fictional program requirement: prepare three cards per group. Candidate: cards = input + 3; print(cards). Inputs for a paper test are 0, 1 and 4. Fictional hardware evidence: monitor power light on; screen says “No signal”; display cable is visibly loose at the computer. Use these examples only if you need a project-testing alternative.",
      "questions": [
        "Record three tests for your program or the supplied candidate: input, required/predicted output, observed output/trace and conclusion.",
        "Describe one controlled revision or one independent check that increases confidence. Which previous test did you rerun?",
        "Write four to six troubleshooting steps for a fictional fault, including how you would verify the original task.",
        "Name one thing your tests do not establish and an appropriate next step."
      ],
      "checklist": [
        "Predictions and observations are separate.",
        "At least one test is at zero or a behavior boundary.",
        "The procedure includes a final verification and an honest handoff."
      ]
    },
    "discussion": [
      "What could changing two unrelated things at once hide?",
      "When can an unresolved result still show strong troubleshooting reasoning?"
    ],
    "exitTicket": "For the rule “three cards per group,” the candidate uses input + 3. Choose an input that exposes the error and give both the candidate result and the required result.",
    "assessment": {
      "criteria": [
        {
          "label": "Testing evidence",
          "lookFor": "Specific predicted/observed values including a discriminating boundary or zero."
        },
        {
          "label": "Troubleshooting method",
          "lookFor": "An ordered symptom-to-test trail and verification of the original task."
        }
      ],
      "success": "Three interpretable tests and a controlled next action; reward accurate documented reasoning even when a bug remains."
    },
    "support": [
      "Give a partially filled test-table header and let learners dictate observations before interpreting them.",
      "Use the supplied simple candidate and projected runs; assess the same reasoning without requiring independent typing."
    ],
    "challenge": [
      "Find an input where an incorrect program happens to agree with a requirement; explain why a passing case can mislead."
    ],
    "standards": [
      "7-8.NSD.3",
      "7-8.CT.9"
    ],
    "standardEvidence": "A controlled test and revision support troubleshooting and debugging. Projects with a decision or loop provide control-flow prediction evidence; the supplied arithmetic-only fallback is preparatory CT.9 practice."
  },
  {
    "day": 44,
    "title": "Review access, safeguards and an AI claim",
    "objective": "Use peer evidence to improve accessibility and justify a privacy, security and responsible-AI decision.",
    "materials": [
      "Draft School Tech Help Kit",
      "Final rubric and peer-review prompts",
      "Supplied fictional AI recommendation and source card"
    ],
    "prep": [
      "Pair teams for review without exchanging passwords, private records or account access. Provide both text and spoken review routes. Keep the supplied source card visible and remind learners that an AI-like claim here is authored practice, not a live model response."
    ],
    "vocabulary": [
      {
        "term": "accessibility",
        "definition": "Designing so people with different abilities and access needs can use an activity."
      },
      {
        "term": "evidence-based review",
        "definition": "Feedback that names a specific observation and an actionable change."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read the authored recommendation: “To count supplies accurately, collect each student’s name and personal email; a green lock also proves every message is safe.” Ask which parts relate to a supply count. Do not ask students to provide any actual identifiers."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Read the source card: the supply task needs only a quantity; a secure connection protects information in transit but does not establish a sender’s honesty. Explain task relevance and claim checking. Model useful access feedback: “The instruction says click the red circle, but no text names it; add a named button/text step.” Contrast evidence with a preference such as “make it cooler.” A privacy checkbox is not a substitute for school review."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Teams use the review lab. The reviewer follows one task using text/keyboard or a read-aloud alternative and records a specific barrier. The authors compare the supplied AI-related claim with the source and decide what a person must review. Teams revise one access issue and one reasoning/safeguard issue; preserve the before-and-after note."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Ask what evidence changed a design decision. Clarify that accessible alternatives should target the same learning objective and need not be identical actions. Discuss fairness: equivalent requests deserve the same relevant criteria; a tiny class sample cannot prove a system has no bias."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the two-sentence exit response individually. Check that the learner rejects an unsupported claim with source reasoning and names a concrete human action, rather than merely saying AI is bad."
      }
    ],
    "lab": {
      "title": "Peer-review and revision studio",
      "route": "#sandbox/blank",
      "steps": [
        "Open your saved code in Blank project or present the paper algorithm. Give the reviewer one task and the expected result without supplying a private answer sheet.",
        "Reviewer uses available text/keyboard controls or a read-aloud route and notes one barrier or confusing instruction. Do not take over the other learner’s account.",
        "Use the supplied recommendation and source card to mark each claim as supported, contradicted or not established. Identify the human decision.",
        "Check the kit’s minimum data, permission/safeguard choice, reporting route and accessible alternative against its actual task.",
        "Make one accessibility change and one evidence/safeguard clarification. Record the reviewer observation, revision and retest."
      ],
      "output": "Peer feedback, two documented revisions and the kit’s bounded AI/privacy/security/accessibility rationale.",
      "fallback": "Review this paper instruction: “Click the red thing to fix it.” Rewrite it with a named action and a non-color cue. Then assess the supplied AI recommendation against the source card, remove unnecessary data and write an approved report route. Exchange spoken or written feedback using the same rubric criteria."
    },
    "handout": {
      "context": "Authored AI-like recommendation: “To count supplies accurately, collect each student’s name and personal email. A green lock proves every message is safe.” Source card: A supply count needs only an invented quantity. A secure connection protects data in transit; it does not establish that a message sender is honest. Use these supplied statements, not an external AI tool or a real student record.",
      "questions": [
        "Record a specific peer observation about a barrier or confusing instruction. What equivalent route will you offer?",
        "Assess both parts of the recommendation using the source card. Which information is unnecessary? What does the security indicator fail to prove?",
        "Name one safeguard, its purpose, a tradeoff and the person who should review an uncertain decision.",
        "Document two revisions: one for access and one for evidence/privacy/security. What did the retest show?"
      ],
      "checklist": [
        "Feedback identifies an observation and actionable revision.",
        "The rationale uses minimum task-relevant data.",
        "The kit offers text/keyboard/oral/paper routes as appropriate and checks claims against evidence."
      ]
    },
    "discussion": [
      "How can the same objective be demonstrated through different response modes?",
      "What would you need to know before trusting a claim about fairness in a real AI system?"
    ],
    "exitTicket": "Using the supplied source card, correct one unsupported part of the recommendation and name one human review action before the kit is used.",
    "assessment": {
      "criteria": [
        {
          "label": "Responsible decision",
          "lookFor": "A claim checked against evidence and a justified data/safeguard choice."
        },
        {
          "label": "Accessible revision",
          "lookFor": "A concrete barrier, equivalent route, changed artifact and retest."
        }
      ],
      "success": "At least one evidence-based correction and one access improvement, with a bounded human decision."
    },
    "support": [
      "Provide sentence frames “I observed __; a reader may need __; we changed __.” Accept oral peer feedback recorded by a scribe.",
      "Read the recommendation and source aloud and assess one claim at a time; avoid relying on color to classify claims."
    ],
    "challenge": [
      "Identify a limitation of the supplied source itself and propose a second authoritative check without browsing student information."
    ],
    "standards": [
      "7-8.IC.4",
      "7-8.IC.6",
      "7-8.CT.10"
    ],
    "standardEvidence": "Peer observations, a changed artifact and a retest support accessibility assessment and documented iteration. The fictional source review supports responsible data-use discussion; it is not a system-wide fairness audit."
  },
  {
    "day": 45,
    "title": "Demonstrate, submit and reflect",
    "objective": "Demonstrate a tested tech-help solution, justify a revision and reflect on an evidence limit.",
    "materials": [
      "Final kit and test evidence",
      "Teacher rubric and individual reflection",
      "School Classroom assignment; projected/offline demonstration alternative"
    ],
    "prep": [
      "Plan two-minute demonstrations using gallery stations or parallel pairs so all students can participate in 17 minutes. Review submissions with the six-criterion rubric after class. Provide an equivalent oral, recorded-with-school-approval, written or teacher-conferenced demonstration. Confirm that the assignment collects into the school environment only."
    ],
    "vocabulary": [
      {
        "term": "demonstration",
        "definition": "Showing a task working while explaining the evidence."
      },
      {
        "term": "limitation",
        "definition": "A boundary on what a result establishes or where a solution works."
      }
    ],
    "sequence": [
      {
        "minutes": 5,
        "label": "Launch",
        "teacher": "Read the goal: show what your kit does, how you checked it and what you would improve next. Explain the station order and remind learners that every individual explains one part. No speed award or public ranking is used."
      },
      {
        "minutes": 8,
        "label": "Model",
        "teacher": "Model a two-minute demonstration with the marker-pack example: state task/input, predict a result, run or trace it, show one earlier test/revision, identify the data-flow destination and name a remaining limit. Show how to attach the school-owned document in Classroom and select Turn in. A lab completion screen and Share to Classroom are not submissions."
      },
      {
        "minutes": 17,
        "label": "Investigate",
        "teacher": "Use gallery pairs: half the teams demonstrate while reviewers ask for an unseen test; switch halfway. Where possible confer with students who need a quieter response route. Learners check their final kit against the brief, submit through the school assignment and verify its displayed submission state. If Classroom is unavailable, retain work in the approved school location and arrange later submission; do not upload it to Cole Learning Labs."
      },
      {
        "minutes": 6,
        "label": "Discuss",
        "teacher": "Invite examples of an evidence-based revision, a useful failure and an access improvement. Ask what students can now explain that they could not in week 1. Separate a bounded simulation result from claims about all devices, all threats or all AI systems."
      },
      {
        "minutes": 4,
        "label": "Exit",
        "teacher": "Collect the individual reflection even when the kit is paired. Use it to distinguish each learner’s understanding and select feedback. Score with the rubric and return one specific next step through the school system."
      }
    ],
    "lab": {
      "title": "Tech-team demonstration gallery",
      "route": "#sandbox/blank",
      "steps": [
        "Restore the final source in Blank project, or prepare the paper algorithm and trace. State the task and predict output before the demonstration.",
        "Run one known test and one reviewer-chosen input within the stated range. Explain any mismatch honestly.",
        "Show the diagram, controlled troubleshooting procedure and a revision. Justify one safeguard, access alternative and AI/human review decision.",
        "Check all kit deliverables and attach the school-managed files to the Classroom assignment. Select Turn in and check the displayed assignment state; ask the teacher if it is unclear.",
        "Write your own reflection: one piece of evidence, one contribution, one limitation and one next step."
      ],
      "output": "The complete School Tech Help Kit plus individual reflection, submitted through the school’s Classroom assignment.",
      "fallback": "Demonstrate using the printed algorithm, three traced inputs, labeled diagram and revision notes. A partner or teacher reads the requested test aloud. Retain papers using the school’s approved process; the teacher records assessment in the school system. Device/network outage does not lower the reasoning criteria."
    },
    "handout": {
      "context": "Your final kit includes code/algorithm, device/network/record-flow diagram, troubleshooting procedure, three-input test table, and privacy/security/AI/accessibility rationale. Your explanation matters more than a polished screen. Use the six-criterion final rubric. If you work with a partner, submit the shared kit as your teacher directs and give an individual reflection.",
      "questions": [
        "State your task, changing input and supported input range. Demonstrate one known and one new in-range test; record the observed results.",
        "Show one revision or independently checked confirmation. Which observation supports your decision?",
        "Explain one safeguard, one access alternative and one human AI-related review decision in your kit.",
        "Reflect individually: What did you contribute, what does your evidence establish, what remains uncertain, and what would you change next?"
      ],
      "checklist": [
        "All five written kit components and demonstration evidence are present.",
        "The individual reflection explains evidence and a limit.",
        "The assignment is turned in through the school process; lab completion alone does not submit it."
      ]
    },
    "discussion": [
      "Which failure helped you improve your final explanation?",
      "Where else could you use predict → change → test → explain?"
    ],
    "exitTicket": "Individually: name a course skill you used, cite one specific observation supporting your final kit, and explain one limit or next check.",
    "assessment": {
      "criteria": [
        {
          "label": "Demonstration evidence",
          "lookFor": "A reproducible input/output explanation and a justified revision or check."
        },
        {
          "label": "Individual reflection",
          "lookFor": "Specific personal reasoning with a realistic limit and next step."
        }
      ],
      "success": "Use the final six-criterion rubric for the kit and the individual response for each learner; distinguish missing evidence from work presented through an approved alternative."
    },
    "support": [
      "Offer a quiet teacher conference, dictated reflection or written/diagram demonstration with the same evidence criteria.",
      "Give a final checklist and partner rehearsal; allow additional time according to the school’s accommodation plan."
    ],
    "challenge": [
      "Propose one semester-course extension and specify the new evidence and testing it would require."
    ],
    "standards": [
      "7-8.CT.10",
      "7-8.DL.5"
    ],
    "standardEvidence": "The final kit combines selected course concepts; the individual explanation supports an author-created crosswalk, not a claim of full standards mastery."
  }
];
