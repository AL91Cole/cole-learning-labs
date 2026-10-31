# Deploying Cole Learning Labs with Cloudflare Pages

Reviewed 2026-10-31. GitHub is the source repository; the existing `cole-learning-labs` Cloudflare Pages project serves the public site. The canonical address is [www.colelearninglabs.com](https://www.colelearninglabs.com). The established production branch is `main`, framework **None**, repository root, and public output `dist`.

The owner approved optional fictional cloud AI using the existing plan, strict feature limits, and possible usage charges. No new paid plan, add-on, or credits are authorized. The reviewed source uses a private AI backend reached through an exact same-origin gateway. It starts AI off on every fresh page, without an automatic availability request. See [private requester deployment](PRIVATE-REQUESTER-DEPLOYMENT.md) for bindings, deployment order, costs, verification, and rollback.

Classroom records and improvement collection remain disabled pending legal, insurance, school, and provider review. Enabling fictional replies does not enable collection or establish NYS Education Law 2-d, COPPA, or other legal compliance. The live site must be checked separately from the source; old public Worker bundle IDs, earlier preview results, and historical default-on behavior are not current acceptance evidence.

## Public site and local work

The site is static HTML, CSS, and browser ES modules. Independent labs begin in page memory. Explicit optional device saving is unencrypted browser storage; it does not require a server database. Casual/generated requester chat stays outside saved lab records and reports.

The fictional classroom demo and optional local encrypted-report tool need no application database or live AI API. The report tool processes selected files and keys in the browser for a manual school-approved submission workflow. It is not Google Classroom OAuth or roster/grade synchronization. Use fictional practice keys; do not provision real school identity or encryption services as part of a site update.

The optional remote terminal is a separate Docker service, not a Pages Function or static asset. Its [setup guide](../terminal-sandbox/README.md) and [architecture audit](PR22-ARCHITECTURE-AUDIT.md) describe additional trusted ingress and host requirements. Publishing the static site does not authorize deploying that service.

## Build and publish

Run the repository validation and build:

```text
npm run check
npm test
npm run build
```

Keep the existing Pages build command `npm run check && npm test && npm run build`, the supported Node runtime selected by `.node-version`, and build output `dist`. Check the actual project settings before migrating any configuration into Wrangler. The root Pages configuration becomes the source of truth for supported settings; compare it with the existing configuration before deployment. Production and preview bindings must be reviewed separately.

The explicit public manifest in `scripts/build.mjs` controls the artifact. It rejects unapproved public files, symbolic links, and broadened API invocation routing. Never publish the checkout root or change output to `.`. Documentation, tests, scripts, Worker source, schemas, migrations, operator tools, and credentials must remain outside the static artifact. Cloudflare compiles `functions/` separately; do not copy it into `dist`.

The production Pages configuration provides only the requester service binding and reviewed requester flags. It gives the gateway no AI or database binding. Top-level/local and preview configuration keep requester flags off and no service binding. No classroom or improvement storage/identity capability belongs in these environments. Follow the [private deployment guide](PRIVATE-REQUESTER-DEPLOYMENT.md) before a new deployment.

A commit or completed local build is not a production release. Review the resulting Pages deployment and actual served assets. A failing build should leave the prior successful deployment live; check the deployment log before claiming an update was published.

## API routing and collection gates

The reviewed public artifact contains exactly:

```json
{"version":1,"include":["/api/requester"],"exclude":[]}
```

Only the fixed requester endpoint can invoke Pages Functions. Other API paths use the static routing/404 behavior. Classroom and improvement implementations also retain closed source release gates; changing a runtime flag cannot approve them.

Keep the retention Worker without collection bindings or active cron triggers while collection is disabled. Do not add analytics, topic/request logs, learner identifiers, prompt storage, aggregate collection, accounts, or school data as a side effect of deployment. The local improvement-summary preview sends no summary.

Before any future collection release, satisfy [the privacy release requirements](PRIVACY-RELEASE-GATE.md), [improvement privacy requirements](LAB-IMPROVEMENTS-PRIVACY.md), and [operator setup](../improvements/README.md). A learner checkbox or a hosting setting is not sufficient legal or school authority.

## Optional requester behavior

Fresh pages start **AI replies off**. The explicit choice beside the Cloudflare processing disclosure lives only in page memory. No requester GET or POST occurs before opt-in. A question is matched locally to a fixed authored scenario/topic pair; raw typed words, notes, transcripts, grades, workbench state, case evidence, and learner records are not forwarded.

The browser calls only `/api/requester`. The public gateway validates that minimal contract and constructs a new request through `REQUESTER_SERVICE`; it does not forward browser headers or connection context. The backend has production and Version/preview URLs disabled, no route or custom domain, and only the existing AI and budget capabilities.

The public gateway still receives internet traffic. Origin checks do not authenticate scripted callers. The shared persistent budget must admit every inference, and all failures fall back to authored replies. The budget limits this feature; it does not impose a provider/account spending ceiling. Hosting, AI, D1, abuse traffic, and other account activity may incur usage charges. See [requester documentation](../worker-requester/README.md).

Generated conversation is ungraded and cannot establish evidence, repair equipment, complete a case, or change progress. The authored case and simulation observations remain the source of truth. This architecture does not promise impenetrability, anonymity, legal compliance, or immunity from liability.

## Domains, HTTPS, headers, and caching

Preserve the established Pages custom-domain associations for `www.colelearninglabs.com` and the apex. Preserve the canonical HTTPS redirect, mail and verification records, nameserver delegation, DNSSEC, and existing strict TLS settings. Domain migration is not required for this requester change. Earlier DNS, certificate-expiry, and browser observations are historical and must not be represented as fresh verification.

After publishing, confirm HTTPS without bypassing a certificate warning, correct apex-to-`www` routing, and preservation of a test path/query/lab fragment. Keep the existing Google Workspace mail records. Investigate a specific reported DNS/certificate issue before replacing working records, weakening TLS, or purchasing a product.

Review actual response headers on the served release. The main site's connection policy is `connect-src 'self'`; the browser needs no public Worker origin. Report pages retain their stricter no-connection policy. API handlers set their own private/no-store and security headers because static `_headers` does not configure Functions responses.

Preserve `nosniff`, no-referrer, restricted permissions, HSTS, script restrictions, and frame/object restrictions. HTML `Cache-Control: no-transform` and disabled Web Analytics are intended to prevent automatic beacon injection; check actual public HTML and browser requests as well as settings. These do not remove Cloudflare's ordinary hosting/security metadata.

Keep module cache behavior and consistent release identifiers aligned across entry points, imports, and styles. The existing policy uses revalidation, with Cloudflare Browser Cache TTL respecting origin headers. Verify an ordinary returning-browser reload, module MIME types, and the served cache headers. Refreshing code does not require deleting saved lab work.

## Release acceptance and rollback

Verify the built artifact first with fake AI/service bindings and local test databases. Then inspect production and preview settings, backend routing, and the actual deployment. Keep any separately recorded live inference check minimal and fictional; it can consume paid usage.

For the website, check homepage and assets, representative labs across pathways, hash navigation, keyboard use, status announcements, report controls, saved-work behavior, and static missing-page responses. An absent static file must return a real 404, or an intentional edge 403 for a blocked private path; a homepage 200 is a regression. Confirm private source paths are not published.

Confirm a fresh page makes no requester request before opt-in, AI off remains effective, and failures restore authored replies without replaying a question. Check that classroom/improvement paths do not invoke Functions and that no collection network request appears. Do not claim independent accessibility, real Chromebook, school acceptance, or legal review unless those reviews were actually performed.

Git integration can deploy a merge to `main`; preview and production releases differ. Record the Worker version and Pages deployment separately. Use the [private guide's pause and rollback procedure](PRIVATE-REQUESTER-DEPLOYMENT.md#pause-and-rollback) to keep public backend URLs off, preserve the budget ledger, and prevent restoring default-on or collection behavior. Preserve learner exports before any deliberate site-data clearing; local storage is scoped to the website origin.

Official references: [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), [response headers](https://developers.cloudflare.com/pages/configuration/headers/), [Functions routing](https://developers.cloudflare.com/pages/functions/routing/), and [Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
