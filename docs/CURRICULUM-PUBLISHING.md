# Curriculum publishing policy

Review imported curriculum outside the public source checkout before copying any approved asset into the project. Keep confidential teacher material in the school's approved private document or assignment system with access restricted to authorized educators. Do not place originals, archives, private keys, completed student work, or confidential assessment material in this public repository, its issues, pull requests, or previews.

The catalogue contains **29 investigations**: 8 Hardware & ServiceDesk, 6 Network & Operating Systems, 6 AI Literacy & Audit, 6 Ethical Hacking & Penetration Testing, and 3 Coding Sandbox. Eight support requests are detailed and five are incomplete. The incomplete requests are INC-101, INC-103, INC-108, NET-201 and NET-205.

## Approved public companions

Only these revised curriculum PDFs are approved for the current public build:

| Public asset | Length | Approved content |
| --- | ---: | --- |
| [Student workbook](../assets/cole-learning-labs-student-workbook.pdf) | 6 pages | Solution-free prompts for reading a request, asking questions, forming a hypothesis, recording an experiment, and explaining evidence |
| [Practice quizzes](../assets/cole-learning-labs-pop-quizzes.pdf) | 8 pages | Unmarked student questions with no answer key or completed responses |

These downloads supplement the on-page lab sections and HTML instructions. They do not collect responses, upload work, connect to an LMS, or create accounts. Learners submit any completed copy only through their teacher's approved process.

The PDFs contain selectable text. The workbook is untagged and has no document language; the quiz's custom heading/paragraph roles map to paragraphs, so semantic question/choice navigation and reading order remain unverified. Selectable text or the presence of tags must not be described as full accessibility.

The public build also includes [student-workbook.html](../student-workbook.html) and [practice-quizzes.html](../practice-quizzes.html): structured HTML alternatives preserving all six workbook sections and eight quiz forms, without solutions or answer keys. Native labeled fields, fieldsets, headings, a reference table, keyboard instructions, and print styles support browser use. These static pages have no scripts, submission, or application saving; entries are temporary and browser/extension handling is separate. Long responses need a print-preview check or copying into an approved document. Focused tests verify prompt/choice parity, radio grouping, labels, and absent submission paths; they do not replace assistive-technology acceptance. Keep the original PDFs and their pinned hashes unchanged unless the document-review process is repeated. Neither format is certified accessible; see [Accessibility review](ACCESSIBILITY-REVIEW.md).

DOCX editions are not approved for publication because their final rendering review is incomplete. Their absence does not prevent using the reviewed PDF companions or HTML instructions.

## Material held outside the checkout

| Original material | Decision |
| --- | --- |
| Original student workbook DOCX and PDF | Hold outside the checkout; publish only the reviewed revised PDF listed above |
| Pop-quiz answer keys, DOCX and PDF | Private teacher resources only |
| Completed INC-101 worked report | Private teacher exemplar only |
| Instructor guide and speaking script, DOCX and PDF | Private teacher resources; contain troubleshooting walkthroughs |
| Complete slide deck, Lesson 1 deck, and Lesson 2 deck | Private teacher resources; visible slides and speaker notes contain solution guidance |
| Original blank-quiz documents | Hold outside the checkout; publish only the reviewed unmarked PDF listed above |
| Optional input-event HTML | Retain as a separate offline teacher diagnostic; not approved for the website |
| ZIP archives and unreviewed imports | Keep outside the checkout pending content, metadata, and executable-content review |

Removing PowerPoint notes would still leave solution guidance in visible slides. A future student-facing deck needs its own review of slides, hidden slides, notes, comments, relationships, embedded files, media, and document properties. Do not publish the original teaching decks as public downloads.

The optional input-event HTML observes actual input on its own page. Its extracted script passed a syntax check, but its inline script conflicts with the website's current Content Security Policy. A future public edition would need reviewed code and policy integration, manifest approval, and browser testing. Keep the current original offline.

The public `teacher/index.html` includes a fictional demo and is not a private-material delivery service. A teacher label, hidden tab, unlisted URL, or browser PIN does not secure downloadable content. Keep private files entirely outside the checkout, even when an ignore pattern would exclude them.

## Repository, build, and preview safeguards

`.gitignore` reduces accidental additions. It does not remove files already tracked, prevent a forced addition, inspect document contents, or erase public history. If confidential information was previously published, treat it as exposed and follow the appropriate removal and incident process; this release does not claim to purge prior copies or repository history.

The checks work together:

1. `npm run check` checks module syntax and audits tracked repository paths for private curriculum and archive names. A source snapshot without a Git index is checked as a source tree. Tracked-path inspection includes files even if they match an ignore rule.
2. `npm test` exercises curriculum boundaries, public preview behavior, and the existing application and privacy protections.
3. `npm run build` publishes only the explicit reviewed `PUBLIC_FILES` manifest into `dist`. Private curriculum path checks also apply to manifest entries, and unapproved files in public source directories cause the build to refuse publication.
4. `npm run dev` serves the reviewed public allowlist rather than arbitrary files from the checkout. Linked or unapproved files must not become reachable through the local preview. If another server is used, serve `dist` rather than the checkout root.

Filename checks cannot recognize every confidential document or a solution hidden in a harmlessly named file. Review actual content and metadata before adding an asset. Do not weaken the manifest or preview allowlist to make an unreviewed import appear.

## Download responses and release review

Serve approved PDF companions with an appropriate PDF content type, a download filename, and MIME-sniffing protection. Apply public-download caching only to the reviewed public assets. Do not extend those cache rules to `/api/*`, teacher review, encrypted report tools, or any student record or submission response. API and private-work responses must retain their own no-store protections. The Pages Functions route remains limited to `/api/*`; public PDF downloads do not need classroom API execution.

Before release, inspect the diff and the exact build manifest, run the checks above, open both revised PDFs, and verify their deployed content type, download behavior, and cache headers. Confirm that answer keys, worked reports, guides, scripts, original decks, archives, and private key files are absent from the commit and `dist`. Confirm that direct requests for private paths fail in the local preview. Deployment checks must use fictional data and must not enable the closed production classroom service.

For teaching and report export, see [Teaching guidance](TEACHING.md). For confidential assessment storage, see [Teacher rubric storage](TEACHER-RUBRICS.md). The [Privacy release requirements](PRIVACY-RELEASE-GATE.md) remain independent of curriculum publishing.
