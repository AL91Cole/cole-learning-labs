# Curriculum publishing policy

Current release: learning content is intentionally open without an account through the reviewed build setting. The original restricted delivery policy below is retained for preview mode. See [Open learning release](OPEN-LEARNING-RELEASE.md) for the one-setting restoration procedure, published scope and unchanged account/data boundaries.

Review imported curriculum outside the public source checkout before copying any approved asset into the project. Keep confidential teacher material in the school's approved private document or assignment system with access restricted to authorized educators. Do not place originals, archives, private keys, completed student work, or confidential assessment material in this public repository, its issues, pull requests, or previews.

The catalogue contains **29 investigations**: 8 Hardware & ServiceDesk, 6 Network & Operating Systems, 6 AI Literacy & Audit, 6 Ethical Hacking & Penetration Testing, and 3 Coding Sandbox. Eight support requests are detailed and five are incomplete. The incomplete requests are INC-101, INC-103, INC-108, NET-201 and NET-205.

## Networking pathway — November 19, 2026

`lessons/networking-fair.html` (pacing, pair roles, debrief questions, look-fors) and the generated `networking-handout.html` (word guide, record sheet, evidence cards; open release only) are public teaching pages. They contain no point scale, pass mark or mission outcome stated as an answer. The same holds for the fifteen generated pages of the **Networking: Run the School Tech Fair** course under `courses/networking-tech-fair/` (overview, thirteen lessons, workbook), which have no data file. Its fifteen PDFs (`student-workbook.pdf`, `lesson-plans.pdf`, `lesson-01.pdf` to `lesson-13.pdf`) are printed from those pages and hash-pinned like the cybersecurity course’s, under a separate `networkingSource` digest. `assets/networking-evidence-cards.pdf` holds the mission readings as printable cards; it is published only in the open release, with the student handout. Adding the Networking pathway link to the shared course header moved the source digest for the cybersecurity course PDFs; they were regenerated with `node scripts/generate-course-downloads.mjs` and compared with the previous files (same page counts, text and sizes). The pathway’s scoring sheet is kept outside this repository. See [Networking pathway](NETWORKING-PATHWAY.md).

## Approved public companions

Only these revised curriculum PDFs are approved for the current public build:

| Public asset | Length | Approved content |
| --- | ---: | --- |
| [Student workbook](../assets/cole-learning-labs-student-workbook.pdf) | 6 pages | Solution-free prompts for reading a request, asking questions, forming a hypothesis, recording an experiment, and explaining evidence |
| [Practice quizzes](../assets/cole-learning-labs-pop-quizzes.pdf) | 8 pages | Unmarked student questions with no answer key or completed responses |

These downloads supplement the on-page lab sections and HTML instructions. They do not collect responses, upload work, connect to an LMS, or create accounts. Learners submit any completed copy only through their teacher's approved process.

The PDFs contain selectable text. The workbook is untagged and has no document language; the quiz's custom heading/paragraph roles map to paragraphs, so semantic question/choice navigation and reading order remain unverified. Selectable text or the presence of tags must not be described as full accessibility.

The public build also includes [student-workbook.html](../student-workbook.html) and [practice-quizzes.html](../practice-quizzes.html): structured HTML alternatives preserving all six workbook sections and eight quiz forms, without solutions or answer keys. Native labeled fields, fieldsets, headings, a reference table, keyboard instructions, and print styles support browser use. These static pages have no scripts, submission, or application saving; entries are temporary and browser/extension handling is separate. Long responses need a print-preview check or copying into an approved document. Focused tests verify prompt/choice parity, radio grouping, labels, and absent submission paths; they do not replace assistive-technology acceptance. Keep the original PDFs and their pinned hashes unchanged unless the document-review process is repeated. Neither format is certified accessible; see [Accessibility review](ACCESSIBILITY-REVIEW.md).

The historical DOCX companions remain outside the public release because their final rendering review is incomplete.

## Classroom course — November 18, 2026

The first complete course, the 45-lesson **Technology, AI & Cybersecurity Foundations**, was published on November 17, 2026 and removed the next day at the owner's request. **Intro to Cybersecurity and Responsible AI** replaces it. The Foundations lesson pages, its public source data and its four reviewed student downloads (`assets/courses/foundations/…`) are no longer in this repository or the hosted artifact, and their header rules are gone. `/courses/foundations` redirects to the new course. The Foundations Word and PDF files are not replaced by new Word files.

The new course is seventeen generated static lesson pages, a workbook and a project page, authored in `courses/cybersecurity-responsible-ai/security.json` and `responsible-ai.json`. Those data files are build input only and are not hosted. Public pages contain teaching instructions, evidence cards and descriptions of what good work looks like. They contain no answer keys. The browser labs and the real-machine cyber field labs necessarily carry their own checks; treat those as activity logic, not as teacher guidance. Do not add a teacher answer package or its archives to this repository.

### Printable PDFs and Classroom sharing

The owner asked that teachers be able to download and print everything and connect lessons to Google Classroom. Twenty-one PDFs are published under `assets/courses/cybersecurity-responsible-ai/`: `student-workbook.pdf`, `lesson-plans.pdf`, `printable-labs.pdf`, `final-project.pdf` and `lesson-01.pdf` to `lesson-17.pdf`. They are printed from the same generated pages and paper labs the site publishes, by `node scripts/generate-course-downloads.mjs`, so they contain nothing the public pages do not. The script inlines the print styles, points links at the public site, and writes tagged PDFs with an outline and numbered footers. Each file's SHA-256 and a digest of the source pages are recorded in `scripts/course-downloads.json`. The curriculum-download checks fail if a file differs from its recorded hash, if the source digest has moved, or if a PDF contains a local address or path. Regenerate, review and commit the PDFs whenever a lesson, a printable lab or the course print styles change. Tagged output has not been checked with a screen reader.

Each **Share to Google Classroom** link is `https://classroom.google.com/share?url=` followed by one public page address on this site. Google handles sign-in and class selection. The site does not receive school credentials, a roster, submissions or grades, and no API, script or stored token is involved. Teachers who want a file in Classroom attach a downloaded PDF themselves.
