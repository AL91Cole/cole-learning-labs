# Open-ended requester chat: release review required

Owner: Alan Cole. October 31, 2026.

The intended experience is a short, friendly, age-appropriate answer to a general question, followed by a gentle return to the current lab. It must never award evidence or grades, modify work, browse, run tools, retrieve classroom records, or claim to be a real person.

The working release keeps typed questions on the device. It offers authored local general answers and playful fictional replies, honest fallbacks for unsupported questions, and the private topic-only cloud requester. This finite set cannot answer every arbitrary question. A separately prepared open-question backend and browser approval constant remain source-locked and are absent from live routing/configuration. Neither an environment flag nor a learner toggle approves that mode.

## Why raw questions stay locked

An open-ended question can contain names, contact details, school information, health details, credentials or indirectly identifying context. Filters cannot guarantee removal. A model must receive the question to interpret arbitrary wording; processing it transiently can still collect personal information. Not storing a transcript does not establish that no collection occurred or that the request was anonymous.

COPPA defines collection to include gathering personal information by any means, including collection through service providers. Where it applies, appropriate notice and verifiable consent or an applicable exception must precede covered collection. A student's toggle is a product choice, not that authority. School authorization is limited to the appropriate school-benefiting educational context and does not approve unrestricted public visitors. Applicability depends on the operator and service facts; this document does not make a legal determination. See [current definitions](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.2), [consent requirements](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.5), and [FTC school guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions#N).

NYS Education Law §2-d and Part 121 require an applicable-school-data assessment, necessary agreements and safeguards when covered school-record PII is involved. A generic question is not automatically a school record, and calling a question anonymous does not resolve this assessment. See [NYSED DPO guidance](https://www.nysed.gov/data-privacy-security/frequently-asked-questions-dpos). [Cloudflare's inference data guidance](https://developers.cloudflare.com/workers-ai/platform/data-usage/) reduces some retention exposure without establishing consent or eliminating provider metadata processing.

## Evidence required before activation

1. Document the audience, ages, jurisdictions, operator and school roles, educational purpose, recipients, provider metadata and complete data flow. Keep open-chat approval separate from diagnostics and classroom-record approval.
2. Have school/DPO/counsel determine applicable COPPA, FERPA, NYS §2-d/Part 121 and other protections, the correct authority and any notices, consent, school/provider agreements and rights process. Do not gather ages or identities as an unreviewed workaround.
3. Complete the owner's insurance and legal risk review, provider restrictions, incident responsibilities, accountable security program, retention/deletion, recovery copies and school approval requirements.
4. Independently evaluate the selected model for child safety, harmful requests, prompt injection, privacy disclosure, age-appropriate answers, uncertainty and serious distress. Automated input/output patterns and synthetic tests do not establish model safety. Serious distress needs calm support and human help rather than a playful task nudge.
5. Review one bounded question only, no transcript/history, attachments, URLs, tools or retrieval; minimal fictional context, a fixed model/token limit, existing persistent global budget, short validated plain-text output, no payload logging and no automatic retries. Recheck provider costs and abuse exposure; the public gateway is not authenticated by Origin headers.
6. Approve a separate source change and exact deployment. Add matching notices and a fresh explicit choice, test the actual platform headers and data flow, and verify fail-closed behavior before enabling real use. Keep diagnostics, classrooms and retention off unless separately approved.

The prepared handler is for review and fake-binding tests. Do not bind, route, import into the live Worker, or activate it merely because tests pass. The user has authorized possible existing-plan usage charges for cloud AI; that does not establish authority for processing students' arbitrary personal information. No compliance certification, impenetrability, anonymity or personal-liability immunity is claimed.
