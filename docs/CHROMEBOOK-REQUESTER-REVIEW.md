# Chromebook lab and requester review

Source release `20261020-chromebook24`, version `2.24.0`, October 20, 2026.

The three investigation pages retain unfinished work while students move between them. Short laptop windows use a compact heading and a bounded schematic; controls sit beside the picture when space permits. The workbench has one Power symbol button: press it to shut down, or press it when off to start the PC and check startup. Power does not fix a fault or award completion. Safe internal work still requires disconnecting the virtual AC cord. Text readouts and keyboard/touch component controls remain available.

Grades 7–8 use supported plain English, including “My first idea” with an explanation of hypothesis. Grades 9–10 introduce technical terms with explanations. Grades 11–12 use more precise evidence, hypothesis, and verification language. The task and its checks remain the same.

All 29 investigations have authored fictional requester cards. Each card has a role, conversational style, interests, preferences, and case focus. Shared language patterns cover everyday chat, 36 technology definitions, bounded arithmetic, and honest unknown replies. This is a finite conversation library, not an encyclopedia or an unrestricted AI model. Canonical case facts and supported current observations take priority. Unrelated conversation cannot supply missing investigation evidence.

Fast replies work without an AI service or model download. Extra conversation stays in an eight-pair page-memory history and is excluded from saved records, exported reports, and inquiry credit. Accepted canonical case questions continue through the existing record and privacy controls. Private-looking or unsupported instruction requests are rejected before optional AI routing; these checks cannot identify every possible personal detail.

## Prepared Cloudflare option

`functions/api/requester.js` prepares one bounded Workers AI call using a fixed model, trusted source case/persona context, and grade-aware instructions. The browser sends only a known lab ID and a question after availability, separate consent, and mode selection. It sends no browser credentials, saved history, student notes, or equipment state. AI output is ungraded text and cannot change the simulation. No OpenAI key, third-party browser script, local AI model, app installation, or paid-plan change is included.

The source privacy lock remains false. Adding an AI binding or environment flag cannot activate production inference. Privacy/provider review, actual account configuration, and a verified usage budget must be completed before a separately reviewed release opens it. The independent classroom-data source lock is unchanged.

On HTTP 429 (an allowance, capacity, or configured request limit), the browser automatically switches AI mode off and retains the immediate fast-character reply. Subsequent questions stay offline until the user chooses AI again. Network and provider failures also retain the fast reply. New questions, revoked consent, and route cleanup suppress stale AI responses.

The Workers Paid base subscription is not an AI spending ceiling. Paid usage above the shared daily allowance can incur charges; anonymous per-isolate backstops are not a global budget. No live inference or billing changes were performed during this code review. Actual account configuration and a verified usage budget remain activation prerequisites. See [deployment](DEPLOYMENT.md) for the release requirements and current provider documentation.

## Verification

Automated tests exercise authored facts and requester chat across all investigations, privacy rejection, evidence boundaries, power startup/off behavior, retained drafts, server input bounds and source locks, mocked AI errors, automatic offline switching, and cancellation. Provider tests use stubs and do not prove real model quality or live account configuration.

Chrome browser checks used fictional data at 1366×768, 1280×720, and 960×600, including Larger text. The tested pages had no horizontal document overflow. These are browser viewport checks, not testing on a physical 4 GB Chromebook. Normal vertical page scrolling remains available; the entire lab is not squeezed into one screen.
