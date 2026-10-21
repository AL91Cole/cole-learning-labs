# Guarded fictional requester Worker

This standalone service uses the existing Workers Paid account with an early shared feature cutoff and an always-available offline character. It does not create a Free account, change plans, buy credits, or guarantee an absolute $5 account total. The reviewed guarded bundle is deployed as reviewed bundle deployment `acfd4943` at `https://cole-learning-labs-requester.alan91cole.workers.dev/api/requester`, with AI/D1 bindings and the counter schema configured. Dashboard runtime `REQUESTER_ENABLED` and `REQUESTER_BILLING_REVIEWED` settings are both true. Fresh-deployment source defaults remain false. PR #26's v2.26.0 frontend still awaits preview verification and merge; a successful live model reply has not yet been verified. Deployment used the existing account without new OAuth access or an API key.

## Topic-only data flow

POST accepts exactly `{"scenarioId":"INC-101","topic":"breakfast"}`. The 161 source-controlled choices comprise 13 original character topics, 36 technology definitions, and 112 authored library cards. The Worker builds the prompt from a fictional profile and fixed topic instruction. Raw typed words, notes, history, learner records, equipment state, case briefs, clues, repairs, goals, rubrics, model choices, and token overrides are absent. Extra fields and unknown IDs are rejected rather than forwarded. Arithmetic, case/current-state answers, and unmatched questions stay offline.

All 4,669 lab/topic prompt combinations passed the 2,500-byte UTF-8 guard. One fixed `@cf/meta/llama-3.1-8b-instruct-fp8-fast` call uses at most 140 output tokens, without retries, Gateway credits, tools, or an alternate provider. Output is ungraded plain JSON text bounded to 600 characters; checks reject obvious private details, HTML, code blocks, and links. These controls do not guarantee accuracy or turn generated text into evidence, progress, a repair, a report, or a grade.

## Shared D1 reservation cutoff

`budget-schema.sql` contains one aggregate table: UTC day and reserved units. It stores no topics, questions, conversation, names, learner IDs, IPs, records, or credentials. `budget.js` executes one atomic all-or-none statement on the shared D1 primary before any inference:

- Reserve **25 units in today's UTC bucket AND 25 in tomorrow's bucket**.
- Admit only when both resulting totals remain at or below **6,000**.
- Validate both returned rows and recheck the reservation's current UTC day immediately before AI starts.
- Never retry or refund a reservation after failure, cancellation, timeout, or an uncertain commit.

The MATERIALIZED capacity decision checks both buckets before either write. Missing or broken D1, malformed results, full buckets, or a stale day prevent inference and retain the offline answer. An empty two-day window allows at most 240 starts; earlier reservations also occupy the next day, so sustained availability is ordinarily about 120 starts/day and depends on prior use. There is no unconditional 240-request daily reset.

The two-day reserve conservatively covers work crossing one UTC rollover. It does not guarantee every provider billing attribution or delayed execution. The 25-unit amount is an engineering margin for the fixed model and prompt/output limits, not measured usage or a provider-certified billing bound. The 4,000-unit gap below the included 10,000-neuron allowance is headroom, not a guarantee that other account activity stays within it. Other AI applications, Paid requests/infrastructure, D1 usage, and overages are outside this feature's ledger. An existing subscription's base fee is not an absolute account spending cap. Recheck [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) when assumptions or account usage change.

Preserve this ledger across deploys. Do not delete, reset, replace, or restore it while inference is enabled; disable the service first and review remaining reservations before resuming. A cancelled or timed-out attempt can still consume both a reservation and provider usage. Its in-flight slot stays occupied until the actual provider invocation settles.

## Configuration and activation

1. Use `wrangler.jsonc` for the selected existing account. Keep `AI` and D1 `REQUESTER_BUDGET` bound to the reviewed resources. Apply `budget-schema.sql` without resetting an existing live ledger. The database/schema and a real two-row reservation of 25 have been verified in Cloudflare without calling AI.
2. Fresh deployments must start with the source defaults `REQUESTER_ENABLED=false` and `REQUESTER_BILLING_REVIEWED=false` until separately reviewed. The current reviewed dashboard runtime has both flags set to literal `true`; do not confuse these runtime settings with the disabled source template. The flags are assertions, not automatic subscription detection or an account cap.
3. Use an exact comma-separated HTTPS `REQUESTER_ALLOWED_ORIGINS` list. No wildcard, suffix matching, localhost, HTTP, IP origin, path, port, or credentials are accepted. Malformed configuration closes the list. CORS is not authentication; non-browser callers can still consume this feature's limited capacity.
4. The browser targets `https://cole-learning-labs-requester.alan91cole.workers.dev/api/requester` directly with `credentials:'omit'`. Main-page CSP adds only that exact Worker origin; report pages keep connections disabled and the teacher route remains self-only. The legacy Pages requester source lock and separate classroom gate stay false.
5. The guarded Worker is deployed and runtime-enabled, but PR #26's frontend preview/merge and successful live-reply verification remain pending. Complete those acceptance checks before claiming the new website release works end to end. Availability GET and CORS preflight perform no inference. Browser opt-in remains required, and no AI call occurs on page load. Disable the runtime flags before any ledger restore/reset or an unreviewed change.

GET checks availability, OPTIONS handles approved CORS preflight, and POST requires JSON with no URL query and at most 600 UTF-8 bytes. Cookies and Authorization are refused; responses never allow credentials or return cookies. Exact allowed origins, `Cache-Control: private, no-store`, and `Vary: Origin` apply. Application content logging is absent and observability is disabled in the template; provider operational metadata still exists. See [Workers AI data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/).

Per-isolate backstops also limit unfinished calls and bursts, but they do not replace the shared ledger. Budget, rate, quota, capacity, timeout, and provider errors retain offline replies without retry; HTTP 429 switches optional AI off. The offline library's 112 cards, 29 profiles, and five styles compose 16,240 possibilities, with 15,680 measured distinct replies at most 300 characters without clipping. They are composed offline outputs, not individually authored or model-generated answers.

## Verification

Current full local verification: **931 tests, 929 passed, zero failed, two Windows file-link skips; 51 syntax-checked modules; 65 reviewed public build files.** Budget tests use actual SQLite, including concurrent admission attempts; provider tests use fake bindings. The historical filename `tests/requester-free-worker.test.js` remains, but now tests this guarded Paid-account design. Run it with `tests/requester-budget.test.js`, topic/client tests, and the full suite. The guarded deployed version, visible runtime flags, and bindings are verified separately; successful live replies, model quality, and provider billing outcomes are not established by these tests. A real binding, including some local development modes, consumes actual account allowance; do not use it accidentally during automated verification.
