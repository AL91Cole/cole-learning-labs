# Visitor experience and delivery review — November 2, 2026

The catalog now puts investigation filters and tickets before the full course,
game and sandbox sections. Category shortcuts retain the same route and move
keyboard focus when jumping within the catalog. The header has four destinations
(Virtual labs, K–6 activities, For teachers, About Mx. Cole) and a Browse all labs
button; personal projects are reached from About Mx. Cole. Account and
access-status entries live in the footer.

Unknown activities have a separate recovery page in both open and restricted
builds. The access-status title agrees with the open-access heading. Public
sign-in leads to the labs, with the existing protected account destination in a
closed, explicitly labeled disclosure. No identity provider or factor changes
are part of this update.

Lab chat keeps one short fictional-information reminder visible. Its closed
Privacy & AI reply details disclosure retains the processing explanation and
the existing opt-in controls. Elementary feedback announces successful choices.
All five pipe games label each tile with its four-column coordinates, current
connections, required gateway and restricted-zone information where applicable.
Rotating a tile updates its accessible name. The SVG leaves room for the label.

Public contact is support@colelearninglabs.com. Project rows have one destination
each, and the About page has project/contact actions. The school review describes
100 activities, including Inbox Defender, and links to the teacher resources.

## Build and indexing

Each published HTML page references one minified CSS bundle. The bundle resolver
can load only the regular stylesheet files already approved and read by the
build. It rejects remote, missing and unreviewed imports before replacing output.
The nested static 404 retains origin-relative assets. Source CSS files stay
separate for editing; raw module delivery remains excluded.

Headers use 336 × 140 WebP assets: the light logo is 13,576 bytes, compared with
544,211 bytes for the original PNG. Original PNGs stay in source and are excluded
from the public artifact. A 1200 × 630 social card and image metadata support
shared links. The sitemap includes the public workbook, quizzes, local report
utility and AI notice. Restricted builds omit the unavailable companions from
their sitemap.

## Verification

The expanded activity guidance, replay and next-challenge work is documented in
[Learning experience verification](LEARNING-EXPERIENCE.md), including the current
full-suite result and additional browser checks.

- Full application suite: 1,769 passed, two Windows link-related skips, no failures.
- Final delivery, CSS, indexing, route, catalog and arcade checks: 42 passed,
  one Windows link-related skip, no failures.
- Rover-map, arcade-model/controller and recovery regressions: 39 passed. All
  coding-game rooms retain five-column cargo/wall coordinates; pipe locations
  use four columns without changing the unary rover map callback.
- Syntax check: 99 application/server modules. Production build: 28 reviewed files.
- Desktop Chrome and a 390 × 844 browser viewport: catalog layout, five-link
  navigation, course jump focus, readable metadata, no horizontal overflow, and
  footer/inline link targets of at least 44px.
- Browser checks: offline requester reply with the privacy disclosure closed;
  one Request & clues heading; successful elementary choice and progress;
  updated pipe directions; clean unknown activity recovery; one link per project;
  and the public contact email.

These browser checks do not establish school-device acceptance or a complete
screen-reader conformance audit. Classroom collection, improvement collection,
membership/billing activation and the protected owner build remain separate.
