# Private fictional requester Worker

Reviewed 2026-10-31. The owner approved optional cloud AI on the existing plan with strict feature limits and possible usage charges. No new paid plan, add-on, prepaid credits, or separate provider is authorized. Classroom records and improvement collection remain disabled pending legal, insurance, school, and provider review.

The current source prepares the private backend and same-origin gateway described below. A source commit does not prove that the backend, Pages bindings, or website have been deployed. Record actual deployment results in [the deployment guide](../docs/PRIVATE-REQUESTER-DEPLOYMENT.md).

## Request path and browser choice

```text
Browser → https://www.colelearninglabs.com/api/requester
        → Pages REQUESTER_SERVICE binding
        → private cole-learning-labs-requester Worker
        → existing AI and REQUESTER_BUDGET bindings
```

The browser endpoint is fixed to `/api/requester`. Fresh pages start **AI replies off**. No availability request or inference is sent until the learner explicitly enables AI beside the Cloudflare processing disclosure. The choice lives only in page memory. Turning AI off or a failed/quota response returns to authored replies; turning it on does not replay an earlier question. Normal lab navigation can retain the choice within the current page; a fresh page resets it.

The Worker has no public `workers.dev` endpoint, Version/preview URL, custom domain, or route. The Pages gateway is a public website endpoint. Same-origin browser checks reduce unintended browser use; they do not authenticate callers or make the whole service private. A scripted client can imitate browser headers. Do not describe this as impenetrable or guaranteed anonymous.

The fixed internal URL in `contract.js` is a service-binding destination label, not public DNS, a password, or an authentication control. The service binding is the capability that reaches the backend.

## Minimal data contract

The browser may submit exactly `{"scenarioId":"INC-101","topic":"breakfast"}` using one of the source-controlled fictional scenario/topic combinations. Typed questions are matched locally to authored topic IDs. Unmatched questions stay offline. Raw questions, notes, transcripts, learner work, grades, equipment state, clues, repairs, model names, and token overrides are rejected or never sent.

The gateway accepts only the exact reviewed HTTPS origins and path. It rejects credential headers, queries, unexpected methods, malformed/oversized bodies, and cross-site browser requests. It creates a new internal request containing only the allowed payload; it does not forward browser cookies, authorization, IP headers, referrers, user-agent headers, or Cloudflare request context.

The backend accepts only that internal URL and minimal headers. Its one fixed model receives authored fictional persona fields and a fixed topic instruction. Replies are bounded, checked plain text without tools, links, HTML, grading, or changes to lab progress. The gateway validates the downstream response shape and size. Request deadlines fail back to built-in replies.

Cloudflare still handles ordinary hosting/security connection metadata. No claim of total anonymity, zero provider retention, legal compliance, or immunity from liability follows from the application contract. The learner switch is a product choice, not school or parental legal authorization.

## Private configuration

`wrangler.jsonc` explicitly sets `workers_dev: false`, `preview_urls: false`, and `routes: []`; Workers observability is disabled. Verify these settings after every deploy and rollback. Disabling only `workers_dev` does not disable existing Version URLs. Do not add a direct browser fallback, wildcard origin, Access purchase, public route, or custom domain.

The reviewed source activation gates and browser feature flag are enabled for this topic-only service. Both the gateway and backend also require runtime `REQUESTER_ENABLED=true` and `REQUESTER_BILLING_REVIEWED=true`. Missing bindings/settings fail closed. To pause immediately, disable the runtime flags on both services; keep the backend unrouted.

Pages production needs only the `REQUESTER_SERVICE` binding and the two runtime flags. Bind existing `AI` and `REQUESTER_BUDGET` only to the private backend. Preview environments must remain disabled and unbound unless separately reviewed. Never bind classroom or improvement storage to the gateway.

## Shared budget and remaining cost exposure

Before inference, the persistent D1 ledger atomically reserves 25 units in both today's and tomorrow's UTC buckets, with a cap of 6,000 per bucket. Missing, broken, exhausted, stale, or conflicting reservations fail closed. Reservations are never refunded after failures, cancellation, timeout, or rejected output. Preserve the existing ledger; do not reset it during deployment. A separate in-memory limiter is only a per-isolate backstop.

These are feature admission limits, not measured provider neurons or an account spending ceiling. Timeout or browser cancellation does not prove that provider work stopped. Workers AI, incoming Pages requests, CPU, D1 operations, abuse traffic, and unrelated account usage can incur charges. Even rejected gateway requests can consume hosting usage.

On Workers Standard, service-binding subrequests have no additional request fee, but the initial request and combined CPU remain metered; legacy usage models differ. Paid Workers AI can charge beyond the daily included allocation. Review actual account usage and billing. This implementation makes no guaranteed zero-overage or fixed-total promise.

## Collection stays closed

Only `/api/requester` is included in Pages Functions routing. Classroom and improvement API paths do not invoke Functions; their own source release gates also stay closed. The retention Worker has no scheduled triggers or data bindings in the reviewed configuration. These protections must survive requester deployment and rollback.

Optional aggregate diagnostics require their own reviewed release. Do not enable collection, create learner identifiers, record topic events, retain prompts/replies, add analytics, or provision school records as a side effect of enabling fictional replies. See [privacy release requirements](../docs/PRIVACY-RELEASE-GATE.md) and [improvement privacy](../docs/LAB-IMPROVEMENTS-PRIVACY.md).

## Verification and operation

Run repository checks with fake AI/service bindings and local test databases. Review the built public artifact, exact routing, private backend configuration, and production/preview bindings before publishing. A real availability GET invokes hosting; an inference POST can use AI and D1. Record live checks separately and keep them minimal.

See [private deployment and rollback](../docs/PRIVATE-REQUESTER-DEPLOYMENT.md). Historical active public bundles and earlier default-on frontend observations do not establish the current architecture or deployment status.

Official references: [service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/), [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/), [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/), [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/#service-bindings), and [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
