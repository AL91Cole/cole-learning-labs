# Optional API protection

The public labs remain open. Turnstile is not an admission, progress, grading,
or completion requirement. Only POST `/api/requester` and POST `/api/reach`
require a fresh token. Availability GETs remain cheap and do not generate AI
or store activity. Classroom and improvement collection remain source-locked.

## Configuration before merging

Use the Cloudflare account's **Cole Learning Labs APIs** widget in **Invisible**
mode, restricted to `colelearninglabs.com` (which covers `www`). Leave
pre-clearance off. This release includes the required Turnstile Privacy
Addendum link in the website privacy notice.

Set the public `TURNSTILE_SITE_KEY` in production Wrangler variables. Set
`TURNSTILE_SECRET_KEY` as an encrypted **production Pages secret** in the
Cloudflare dashboard, never in this repository, a PR, a terminal argument,
local storage, or a screenshot. A missing/invalid configuration fails closed:
AI falls back to authored replies; counts are omitted. These new settings do
not change the old production code before this PR is approved and merged.

Previews keep AI, counters, classroom collection, and improvements disabled.
Their existing owner Access protection remains in place. Previewing the labs
checks their normal open flow and fallback; it does not send production counts
or run production AI. Provider validation and browser failure paths are covered
by the automated tests. Production does not accept Cloudflare dummy keys.

## Data and failure behavior

- The SDK loads only for an eligible optional request, after AI opt-in or an
  enabled counter's first meaningful interaction. Loading a lab alone does not
  load Turnstile. GPC/DNT and preview exclusions still stop activity counts.
- A new widget obtains a new token per POST; tokens have no application cache,
  retry, storage, log, or persistent identifier. All checks are bounded and
  canceled on disposal, opt-out, and stopping counts. Built-in replies and
  learning actions do not wait for verification.
- `X-CLL-Turnstile` carries the token separately from the unchanged, bounded
  topic/count payload. The server verifies it at the fixed Cloudflare Siteverify
  endpoint and requires success, the exact request hostname, the correct action
  (`requester` or `reach`), and a challenge age within five minutes. Cloudflare
  enforces single use, including `timeout-or-duplicate` rejection. No local
  token database is needed. No IP, cookie, activity code, question, or work is
  added to Siteverify. Tokens are not forwarded to the private AI Worker or D1.
- CSP permits only the official challenge script and frame origins in addition
  to existing local sources. Report/worksheet isolation remains stricter.
- Failed, expired, replayed, unavailable or blocked checks stop the protected
  request. Student activity continues. There is no interactive fallback.

Turnstile complements the existing US-only rule, Bot Fight Mode, managed WAF,
DDoS protection, shared AI budget and counter admission limits. It does not
guarantee a human visitor or create unique-person/attendance statistics.
Keep the existing retention activation gates closed until their separate
deployment checklist is complete. This PR does not activate collection.

## Review and rollout

Review the PR preview before merging. Check a game, coding quest, and an
investigation with built-in conversation; no challenge should gate learning.
Inspect `#privacy` and `school-it.html` for the provider notice and filtering
instructions. Run `npm run check`, `npm run build`, and `npm test`.

After approval and merge, verify an opted-in eligible requester topic on the
canonical production hostname, check Turnstile action/siteverification results,
and confirm that blocking `challenges.cloudflare.com` leaves the built-in
conversation and labs working. Do not activate counters merely to test this.
Missing-proof tests must continue to reject before AI/D1 access. Never paste a
real token or secret into a public issue or test log. Roll back through the
normal reviewed release process if the real managed school network reveals
an integration problem.

References: [server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[widget settings](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/),
[CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/),
and [privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/).
