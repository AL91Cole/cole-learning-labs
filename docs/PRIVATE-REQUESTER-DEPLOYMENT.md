# Private requester deployment and verification

Owner: Alan Cole. Reviewed 2026-10-31.

The owner approved cloud AI on the existing plan with strict feature limits and possible usage charges. This authorization covers the fictional topic-only requester. It does not authorize a new paid plan, add-on, credits, classroom collection, improvement collection, student accounts, or school records.

## Source and live status

The reviewed source enables the fixed same-origin gateway and private backend, with AI off on every fresh page until the learner chooses it. Deployment of the Worker, production Pages binding, and new website artifact must each be verified independently. Existing public bundle IDs and earlier frontend releases are historical evidence.

During this migration, the live Worker production URL and Version/preview URLs were disabled, no custom domain or route was present, and both runtime activation flags were first set false. Its AI and budget bindings were temporarily unlinked without deleting or resetting the database. The owner then explicitly approved restoring the existing AI capability and budget database, connecting the restricted website gateway and enabling predefined-topic replies, accepting possible existing-plan usage charges. The existing bindings were restored to the private Worker.

The initial dashboard editor loading issue was resolved. Reviewed private code was first deployed as version `37b25c4f`; subsequent configuration deployments retain that module. The editor reported no problems. An independent copy of its complete contents matched the locally tested 225,423-byte minified module after Windows line-ending normalization, SHA-256 `057bf58713aefc8567dd5ff063289a2eb8582e2b850b2fdb50fe16bd39ff6cdb`. A rebuild after the final learner-copy changes produced the same module. The alternative repository connector proposed broad account permissions and was not connected; no new deployment token was created.

These are migration observations, not a guarantee of later live state. See the [PR #33 deployment receipt](https://github.com/AL91Cole/cole-learning-labs/pull/33) for final Worker/Pages activation and platform-verification results. Inspect the actual current settings before any future activation or rollback.

Record the final Worker version, Pages deployment, binding/settings inspection, public-route inspection, and browser opt-in result after completion. Keep credentials, raw request metadata, and learner content out of deployment evidence.

## Architecture and scope

```text
Browser (fresh page: AI off)
  → exact same-origin /api/requester gateway
  → REQUESTER_SERVICE binding
  → unrouted cole-learning-labs-requester Worker
  → existing AI binding + existing shared budget D1
```

Only the backend is private. The public gateway remains reachable by non-browser callers. Origin and Fetch Metadata checks are browser safeguards, not caller authentication. Global inference admission and the limited topic contract remain necessary even when browser requests look valid.

The gateway forwards a newly constructed request with only a fictional scenario ID and authored topic code. It does not forward browser identities, connection headers, questions, notes, reports, progress, or conversation history. The provider receives authored fictional prompts. Cloudflare still receives the website connection and ordinary service metadata.

The application makes no guarantee of impenetrability, anonymity, statutory compliance, or personal liability protection. School use and future collection need appropriate legal, insurance, school, and provider review. AI output remains ungraded extra conversation; authored lab evidence controls the simulation.

Open-ended learner text is a separate [locked review design](OPEN-CHAT-REVIEW.md), not part of this live gateway or Worker. The browser's open-question approval constant is false and has no request path. The prepared `worker-requester/open-chat.js` default entry rejects before reading requests or bindings and is not imported by the production Worker. Do not add its URL or runtime flag to the live configuration. Warnings and the educational-use notice do not approve that processing.

## Prepare and review locally

1. Run `npm run check`, `npm test`, and `npm run build`. Tests use fake AI/service bindings and local database checks.
2. Review `dist/_routes.json`. It must be exactly:
   ```json
   {"version":1,"include":["/api/requester"],"exclude":[]}
   ```
   No classroom, improvement, wildcard, or other API invocation route is approved.
3. Review the public manifest and `dist`. Never publish the repository root, Worker source, operator tools, schemas, tests, credentials, or documentation as static files.
4. Review the backend bundle and configuration together. Preserve the fixed model, small input/output contract, no tools/retries, budget reservation, response validation, deadlines, and generic failure behavior.
5. Confirm classroom and improvement release gates remain closed. Their databases, identity providers, analytics, and collection schedules must remain unprovisioned or detached.

A successful local test does not verify Cloudflare routing, real account usage, school approval, or a production release. Do not use an AI-capable local development mode as if it were free; provider inference can still be remote.

## Deploy the backend privately

Use the existing `cole-learning-labs-requester` Worker. Deploy the reviewed bundled module using the repository configuration. The bundle must include its local module dependencies; uploading an unbundled entry file alone is insufficient.

Keep all three routing controls explicit:

```json
{
  "workers_dev": false,
  "preview_urls": false,
  "routes": []
}
```

Then inspect **Settings → Domains & Routes**. Confirm the production URL, Version/preview URLs, aliases, custom domains, and routes provide no public entry. A disabled production URL alone is insufficient. Keep Workers observability disabled; do not enable payload logging or live tailing as routine verification.

Bind the existing `AI` capability and existing `REQUESTER_BUDGET` database only to this backend. Preserve the database and its ledger rows. Restoring an existing binding is not permission to create another database or reset admission history.

Set backend `REQUESTER_ENABLED=true` and `REQUESTER_BILLING_REVIEWED=true` only for this reviewed deployment. Missing configuration, unavailable storage, exhausted budget, and failures must return a fallback without inference. Keep the backend private throughout deployment; do not temporarily re-enable its public URL to test it.

## Configure and publish Pages

Use the existing `cole-learning-labs` Pages project and production branch `main`, with repository root, framework **None**, and output `dist`. Keep the established validation/build command `npm run check && npm test && npm run build`.

The root `wrangler.jsonc` owns Pages runtime configuration. It preserves the inspected production compatibility date `2026-10-16`, empty compatibility flags, and `NODE_VERSION=24.22.0`. Production had no bindings before this migration. Preview was separately inspected: the same compatibility date and empty flags, with no variables or bindings. The source adds an explicit matching Node version pin to preview. Cloudflare recommends downloading the existing project configuration before adopting a configuration file; compare it rather than overwriting existing settings blindly.

Deploy the reviewed production environment in this configuration, not an unreviewed dashboard-only binding change. Top-level/local and explicit `env.preview` settings disable the requester and contain no service binding. Explicit `env.production` supplies the production binding and flags. Bindings and variables are not inherited between Wrangler environments, so preserve their full reviewed values when editing.

Production Pages needs:

| Setting | Value |
| --- | --- |
| Service binding | `REQUESTER_SERVICE` → existing `cole-learning-labs-requester` production service |
| `REQUESTER_ENABLED` | `true` |
| `REQUESTER_BILLING_REVIEWED` | `true` |
| AI binding | None |
| D1 binding | None for the requester gateway |
| Classroom/improvement bindings | None |
| Preview environments | No requester service binding; both flags false |

Bindings/settings must be included in a new Pages deployment before assuming they are live. Once supported settings are managed by Wrangler, that file is their source of truth; editing only the dashboard is not a durable configuration change. Preview and production configuration are separate. The gateway accepts only the exact approved apex and `www` HTTPS origins; a preview hostname is not an approved requester origin.

Publish only the reviewed website build. The main site's connection policy must remain `connect-src 'self'`; no public Worker origin is needed. Reports retain their stricter no-connection policy. API responses provide their own private/no-store and security headers.

## Verify the release

Inspect settings and generated artifacts before sending live requests. Static site checks need no AI call. After publishing, verify the homepage, scripts/styles, module freshness, valid lab navigation, static 404s for missing files, and absence of private source artifacts.

In a fresh page, confirm AI starts off and the network remains free of requester availability or inference requests until explicit opt-in. Confirm opting out does not send/replay a question; authored replies, reports, and lab progress still work.

If a minimal live requester check is used, distinguish the availability GET from an inference POST in the record. A GET must perform no model call or budget write, but can count as hosting usage. A POST can consume AI and D1 usage and must pass the persistent budget first. Do not put learner content into a check. Never treat a timeout as proof that Cloudflare stopped an invocation.

Verify collection paths such as `/api/classroom` and `/api/improvements` use static 404 handling without invoking Functions; the source gates must also remain closed. Verify the retention configuration has no active cron or data bindings. Do not enable collection to test this requester release.

## Costs and operational limits

The preserved shared D1 reservation is a feature cutoff, not a provider-metered balance or account spending ceiling. The owner accepted possible usage charges on the existing plan. No fixed bill or zero overage is promised. See [the requester budget and cost explanation](../worker-requester/README.md#shared-budget-and-remaining-cost-exposure).

Monitor aggregate provider usage and billing without enabling learner diagnostics or recording request payloads. Unexpected usage, abuse, provider changes, or privacy concerns are reasons to pause the gateway and backend. Increasing feature limits, adding paid security products, buying credits, or changing a plan requires separate owner authorization.

## Pause and rollback

Set both runtime flags false on Pages production and the backend, and deploy the updated configuration as required. Keep all backend public entry points disabled. If the requester needs to stay fully closed at the Pages routing layer, use an empty effective API invocation set, for example:

```json
{"version":1,"include":["/api","/api/*"],"exclude":["/api","/api/*"]}
```

Cloudflare gives exclusions priority. With the current custom 404 artifact, excluded missing API paths use static 404 handling rather than the gateway's JSON response. Publish the routing change before claiming that requests no longer invoke Functions.

Roll back only to a reviewed private backend and opt-in frontend. Do not restore an earlier public endpoint, default-on behavior, broad API routing, logging, or collection gates. Preserve the shared budget database and ledger across pauses and rollbacks. Removing a binding does not delete its database.

Official references: [Pages service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings), [Functions invocation routes](https://developers.cloudflare.com/pages/functions/routing/#functions-invocation-routes), [Worker routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/), and [Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/). Collection requirements: [privacy release gate](PRIVACY-RELEASE-GATE.md) and [improvement privacy](LAB-IMPROVEMENTS-PRIVACY.md).
