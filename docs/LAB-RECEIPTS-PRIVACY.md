# Completion receipts and lab telemetry: review boundaries

Prepared November 4, 2026. This document describes the proposed receipt and timer
workflow; it is not a record of legal approval or a live activation. Keep the
receipt and telemetry services disabled until their actual configuration,
processing and required reviews are complete. Existing reach-counter approval
does not authorize collection of new score or duration fields.

## Data and trust boundaries

The local active timer estimates visible, recently engaged lab time. Interaction
updates a local last-activity time; raw keystrokes, pointer paths and other-tab
contents are not collected. It pauses when hidden or idle for 60 seconds. A
browser estimate is editable and is not attendance or proof of learning.

A signed receipt contains an authored activity identifier, browser-reported
score, active seconds, UTC date, random salt and server signature. The server
must validate the complete shape and ranges. Use a fixed catalog mapping rather
than truncating arbitrary lab names into potentially colliding identifiers.
Keep `RECEIPT_SECRET` only in Cloudflare's server-side secret store, never source,
static configuration, examples, build output or browser storage. Never print it.

A signature proves that the fields were issued under the key and have not been
changed after signing. It cannot establish that the browser submitted truthful
work, score or duration. The issuance endpoint is not a trusted grader. Stronger
assessment evidence requires an authorized server evaluation or teacher review
of work. Do not call these receipts “tamper-proof grades.” Copied receipts remain
valid. Duplicate flags cover only the current pasted batch and establish no
identity, cheating finding or cross-class reuse history.

Batch verification sends codes to the website, so accept codes without student
names, emails, assignment labels or rosters. Performance fields and rare
combinations can identify a learner in context. Keep identity mappings in the
school's approved system. Reject oversized batches and unsupported input before
expensive cryptographic work; render returned strings as text.

## Telemetry and provider review

Telemetry is a separate optional purpose from generating a receipt. A learner
must not have to contribute analytics to obtain a local report or complete a lab.
Do not collect detailed student work, free text, answers, code, screenshots,
action sequences, persistent browser/session identifiers, school/class labels,
or raw connection data as “anonymous telemetry.” Review collection of any
performance, exact-duration or day-level fields before activation. Prefer
predefined activity/event fields and broad aggregate buckets where useful.

UTC date bucketing does not make correlation impossible. Cloudflare receives
ordinary requests even when the application never reads IP or user-agent
headers. Its [privacy policy](https://www.cloudflare.com/privacypolicy/) describes
end-user and network processing. The optional security check also processes IP,
TLS fingerprint, user-agent and site origin; see the
[Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).
Review provider logging, dashboard access, observability, retention, recovery,
exports, service terms and any model processing against the actual deployment.
Do not claim zero-PII transport or that headers are never received.

Before enabling collection, settle the necessary purpose and retention period,
scheduled cleanup even when collection stops, provider recovery expiry,
small-cell disclosure controls, permitted recipients, incident response and
rights handling. Use a separate least-privilege database; do not reuse classroom
records or create a public analytics endpoint. A migration or cron definition is
not evidence that retention runs. Record fictional-data deletion verification,
approvers, deployment revision and remaining limitations.

## District and legal assessment

Follow [the existing privacy release requirements](PRIVACY-RELEASE-GATE.md).
The full public explanation is [Data Privacy & District Review](../compliance.html).
No no-login design or signing algorithm determines legal applicability.

- NYSED's [DPO/vendor guidance](https://www.nysed.gov/data-privacy-security/frequently-asked-questions-dpos)
  assigns the no-covered-PII assessment to the district. Establish any necessary
  agreement and protections before receiving covered records; do not publish an
  unconditional “DPA not triggered” statement.
- The U.S. Department of Education's
  [online services guidance](https://studentprivacy.ed.gov/sites/default/files/training/supporting_materials/Protecting_Student_Privacy_While_Using_Online_Educational_Services_0.pdf)
  addresses indirect identifiers and conditions for permitted school disclosures.
  A code linked to a student in an LMS must be handled accordingly.
- The FTC's [COPPA guidance](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business)
  includes persistent identifiers in personal information. Assess current notice,
  authority, security and deletion obligations, including providers; do not assume
  all analytics qualify as internal operations.
- Review the [New York Attorney General's child-data guidance](https://ag.ny.gov/child-data-protection-act-guidance)
  alongside applicable school-data protections. “Product improvement” is not an
  unrestricted processing purpose.

## Release evidence

Use fictional data to check valid, altered, malformed, copied and duplicate
receipts; bounded requests; unavailable keys and databases; retry failures; idle,
hidden and resumed timers; safe rendering; and public artifact boundaries.
Confirm a disabled service accepts no collection and leaves reports and labs
usable. Record which checks ran and their practical limits. School acceptance,
managed-device behavior, provider retention and legal review require their own
evidence. A passing test suite does not complete those reviews.
