# Deploying Cole Learning Labs with Cloudflare Pages

PR #22's optional remote terminal is a separate Docker service, not a Pages Function or static asset. Its [setup guide](../terminal-sandbox/README.md) and [architecture audit](PR22-ARCHITECTURE-AUDIT.md) describe the trusted HTTPS ingress and host work still required. The PR preview can demonstrate new monitor clues without deploying that backend or changing the production domain.

Cole Learning Labs uses static HTML, CSS, and browser ES modules served by Cloudflare Pages. GitHub remains the source repository. Independent labs begin in page memory; explicit optional device saving is unencrypted and does not need a database. The fictional classroom demo and optional local encrypted-report tool also need no application database or live AI API. The report tool processes selected files and keys in the browser for a manual school-approved submission workflow; it is not Google Classroom OAuth integration.

Historical source checkpoint: release `20261018-context21` (version `2.19.0`) contained 29 investigations: eight hardware, six network/OS, six AI, six cybersecurity and three coding labs. Its expanded models and bounded coding interpreter were local browser modules, its interview used authored facts and recent question context, and its optional live AI interface was disabled without a provider integration. That checkpoint does not describe the prepared requester changes below or establish a current deployment result.

The current release keeps fast offline requester replies as the default. Authored case facts and simulation observations remain the source of case evidence; bounded fictional character chat, definitions, and simple calculations provide additional conversation without earning progress. Casual and generated chat stay in page memory, outside saved lab records and reports. No native browser AI or model download is required.

The reviewed `worker-requester/worker.js` bundle is deployed on the existing Paid account, reviewed bundle deployment `acfd4943`. `src/requester-config.js` targets `https://cole-learning-labs-requester.alan91cole.workers.dev/api/requester`. AI and D1 bindings and the anonymous counter schema are configured; dashboard runtime settings `REQUESTER_ENABLED=true` and `REQUESTER_BILLING_REVIEWED=true` are visible. The same atomic SQL has been checked in Cloudflare D1 with a 25-unit reservation in each of two UTC-day rows. The v2.26.0 frontend in PR #26 still awaits preview verification and merge, and no successful live inference reply has yet been verified. Source defaults remain false for fresh deployments. The legacy `functions/api/requester.js` source privacy lock and separate classroom gate remain false.

The browser sends exactly `{scenarioId, topic}` for 161 fixed authored choices. Typed words, notes, history, learner records, and equipment state never become provider input. The main site's CSP permits only its own origin and the exact requester Worker origin for connections; report pages retain `connect-src 'none'` and the teacher route remains self-only. See the guarded-service section below for deployment and acceptance requirements.

The shared D1 ledger reserves 25 units in BOTH today's and tomorrow's UTC buckets before each inference, capped at 6,000 per bucket, with no refunds. Missing, broken, exhausted, or stale reservations fail closed to offline replies. This is a feature-level engineering cutoff, not a provider-metered balance or an account spending ceiling. Workers Paid can bill usage beyond its included 10,000 daily neurons; other account AI usage, hosting, requests, D1 and other charges are outside this feature's ledger. No claim of an absolute $5 total or guaranteed zero overage is made. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) must be reviewed alongside actual account usage.

A prepared Pages Functions classroom implementation is included, but its actual production `onRequest` entry is hardcoded closed. It returns HTTP 503 `classroom_privacy_review_required` before configuration, D1, or identity-key retrieval. No approved teacher email, D1 database, Access application, student Google sign-in, or roster/grade integration is provisioned. Environment settings cannot unlock the gate; see [Privacy release requirements](PRIVACY-RELEASE-GATE.md) and [Student-data design](STUDENT-DATA-DESIGN.md).

## Verified deployment status

| Item | Confirmed status |
| --- | --- |
| Source repository | [AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs) |
| Hosting | Native Cloudflare Pages |
| Pages project | `cole-learning-labs` |
| Git integration | Authorized for selected repositories; existing connection preserved |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run check && npm test && npm run build`; saved in Pages and verified in the security preview build log |
| Build output directory | `dist`; saved in Pages; preview published only the reviewed public artifact |
| Root directory | Repository root |
| Classroom production entry | Hardcoded privacy gate closed; 503 before settings, D1, or identity lookup; environment/email changes cannot unlock it |
| Classroom provisioning | No first approved teacher email, D1 database, or Access application provisioned |
| Initial deployment | Succeeded |
| Pages address | [cole-learning-labs.pages.dev](https://cole-learning-labs.pages.dev) |
| Canonical hostname | [www.colelearninglabs.com](https://www.colelearninglabs.com); Pages Active, SSL enabled, strict HTTPS request returned 200 |
| Apex routing | 301 to `www`; HTTP/HTTPS, path, query, and the tested lab fragment verified |
| Apex Pages association | Active; SSL enabled |
| Browser confirmation | Fresh Chrome loads the homepage without a security warning; redirected hardware lab and Report dialog load |
| Web DNS | Proxied CNAMEs for `@` and `www` to `cole-learning-labs.pages.dev` |
| DNS record count | Seven total; MX, SPF, DKIM, verification, and `_domainconnect` preserved |
| Registrar | Squarespace |
| Authoritative DNS | Cloudflare active; `elias.ns.cloudflare.com`, `venus.ns.cloudflare.com` |
| DNSSEC | Active; Cloudflare success status and matching public DS verified |
| DS metadata | Key tag 2371; algorithm 13; digest type 2; digest matches Cloudflare's supplied value |
| Edge certificate | Universal SSL Active for apex and wildcard; expires 2027-01-14 |
| Zone TLS settings | Full (strict), Always Use HTTPS, minimum TLS 1.2, TLS 1.3 enabled |
| Mail | Existing Google Workspace records preserved |
| Response headers | Expanded school-release policies below; verify on each new HTTPS deployment |
| DDoS status | Network and SSL/TLS protections reported Active; HTTP DDoS always enabled; no overrides |
| Custom security rules | No custom WAF rules or rate-limit rules configured |
| Managed-rules view | No managed rules created in the observed dashboard; no custom managed-WAF setup claimed |
| Legacy GitHub Pages | Custom domain removed; publishing branch None; explicitly disabled; source repository preserved |

Independent HTTPS testing passed certificate validation and returned HTTP 200 through Cloudflare. Both Pages custom domains are Active with SSL enabled. Fresh Chrome loads the professional homepage without a security warning. The browser also preserves the test query and lab fragment when redirecting from the apex, and the hardware lab and Report dialog load at `www`.

The two web DNS records are proxied CNAMEs to `cole-learning-labs.pages.dev`. The zone has seven records in total; the existing mail and verification records remain intact. Cloudflare's DDoS status is confirmed from its dashboard. This is not a claim of configured custom WAF or rate-limit rules: both have zero rules in use, and the managed-rules view shows none created.

## 1. Build and verify the native deployment

The historical repository security preview `bb8d0564` completed on October 16, 2026 using Node 24.13.1, all 125 tests passing with no skips, and its then-current 22-file public manifest. HTTPS checks verified headers, the privacy-gated API, browser assets, and exclusion of source-only files. That historical result does not verify later source changes; run the current checks and verify the actual deployment before marking a new release complete. That historical preview predates the top-level `404.html` and returned homepage HTML for absent paths. Current releases must return 404 for missing static paths, or 403 for non-public paths blocked by the custom edge rule. A 200 homepage response is now a missing-page regression, even when it does not expose the requested source file. Verify an ordinary nonexistent path, a blocked development path, and a valid `/#lab/INC-101` URL separately.

In **Workers & Pages → Pages**, use the existing `cole-learning-labs` project. Keep framework preset **None**, production branch **main**, and root directory at the repository root. Use Node **24**, build command **`npm run check && npm test && npm run build`**, and build output directory **`dist`**. The committed `.node-version` selects the supported runtime.

The build copies only the explicit public-file manifest in `scripts/build.mjs`. It rejects unreviewed files in public source directories, symlinks, invalid source types, and broadened Functions routing. It excludes repository documentation, tests, scripts, migrations, credentials, and Functions source from the static output. Never change output back to `.`. New public files require an intentional manifest review and successful tests. Cloudflare compiles `functions/` from the repository root separately; do not move it into `dist`.

Run the same three commands locally and on pull requests. See [Repository security](REPOSITORY-SECURITY.md) and [Cloudflare Functions placement](https://developers.cloudflare.com/pages/functions/get-started/). The currently deployed site remains live if a new build fails; a source commit alone is not proof that a release is live.

After a successful deployment, open its generated `pages.dev` address. Check the homepage, ES module and stylesheet requests, hash navigation, and one assignment from each pathway before changing custom-domain routing. Review the deployment log when a future update fails rather than treating a source commit as a successful publish.

[Cloudflare: Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) · [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)

## 2. Associate the custom hostnames in Pages

From the Pages project, open **Custom domains → Set up a domain**. Associate `www.colelearninglabs.com` and `colelearninglabs.com` with this project. The apex domain is already in an active Cloudflare zone in the same account, meeting the apex-domain DNS requirement.

Review the DNS changes Cloudflare presents. Native Pages destinations replace the former GitHub web destinations: the `www` CNAME to `al91cole.github.io` and the four apex A records from the earlier host. Use the Pages target shown by Cloudflare for this project. Keep mail, verification TXT, nameserver delegation, and the verified DS record intact.

Do not manually point a hostname to a `pages.dev` address before associating it in the Pages project. Cloudflare documents error 522 when the domain is pointed at Pages without that association. Use the project's workflow and wait for each custom domain to show an active state.

[Cloudflare: Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## 3. Verify HTTPS and the canonical address

Test both `https://www.colelearninglabs.com` and `https://colelearninglabs.com` without proceeding through a certificate warning. Confirm the served certificate covers the requested hostname, the page is the new native deployment, and the browser loads scripts and styles normally.

An active Single Redirect keeps `www` as the canonical hostname with status 301, preserving the path and query string. Strict HTTPS testing confirmed that `https://colelearninglabs.com/src/styles.css?source=classroom` redirects to `https://www.colelearninglabs.com/src/styles.css?source=classroom`. Starting with HTTP follows a 301 to HTTPS apex, then a 301 to HTTPS `www`, then returns HTTP 200 with `text/css`; the query is preserved.

Chrome also confirmed that `https://colelearninglabs.com/?source=classroom#lab/INC-101` lands on the corresponding HTTPS `www` address with both query and fragment intact. The hardware workspace and Report dialog load. This uses Cloudflare's redirect, not GitHub Pages' automatic apex redirect. Recheck these entry points after future changes.

[Cloudflare: Root-to-www redirect](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-root-to-www/)

The web destinations route to native Cloudflare Pages. GitHub Pages is no longer the origin serving these requests and its publishing is disabled. Its stalled certificate request is a historical migration issue. Keep the existing strict TLS configuration.

If troubleshooting browser state after future changes, preserve saved student work. Export any needed reports before clearing site data; a cache refresh and deletion of local storage are different actions.

If Pages custom-domain activation stalls, inspect the project's status, DNS association, and any CAA restrictions. Access policies or Workers that intercept certificate-validation requests can also block activation. Resolve the specific reported problem rather than repeatedly replacing working records.

[Cloudflare: Pages known issues](https://developers.cloudflare.com/pages/platform/known-issues/)

## 4. Check response headers and classroom behavior

The root `_headers` file declares the following controls for static responses:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), display-capture=(), usb=(), serial=(), hid=(), payment=()
Strict-Transport-Security: max-age=15552000
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'; upgrade-insecure-requests
```

Scripts remain limited to the site's own origin. The main site's connection policy additionally permits only `https://cole-learning-labs-requester.alan91cole.workers.dev` for the optional requester; it is a reviewed exception to self-only connections, not a wildcard or arbitrary endpoint. Report pages retain no connections, and the teacher route retains self-only connections and private/no-store caching. Existing illustrated components use inline style attributes, so the style policy permits those; the script policy does not permit inline scripts or evaluation. API responses set their own security/no-store headers because Pages `_headers` does not configure Worker or Functions responses. HSTS omits subdomains and preload.

HTML responses at `/`, `/classroom`, `/school-it`, and `/teacher/*` include `Cache-Control: no-transform` to prevent Cloudflare's automatic performance-beacon injection. The Pages project's Web Analytics is disabled. A public-domain browser check exposed a proxy-injected beacon despite that project setting; the public HTML response must therefore be checked as well as the dashboard. This does not disable Cloudflare's normal hosting/security request metadata. [Cloudflare automatic setup and no-transform](https://developers.cloudflare.com/web-analytics/get-started/).

Check the actual HTTPS preview and production response headers, module MIME types, navigation, and console before treating a release as verified. A security header is one control, not a school approval, filter override, or security certification. [Cloudflare headers documentation](https://developers.cloudflare.com/pages/configuration/headers/).

### Release cache behavior

The entry URL `src/app.js?release=20261020-requester26`, every internal source-module import, and every HTML script/stylesheet link use the same release query. This prevents returning browsers from combining a new entry with older modules or styles that were cached under the previous four-hour policy. Updating only the entry query is insufficient when dependencies add exports. `_headers` declares `/src/*` with `Cache-Control: public, max-age=0, must-revalidate`, allowing modules to be stored but requiring revalidation before reuse. Check the response after future deployments.

In the Cloudflare zone, **Caching → Configuration → Browser Cache TTL** is set to **Respect Existing Headers**. This preserves the application's cache policy; the default four-hour browser setting can override a shorter origin policy. The live HTTPS application response was verified with `max-age=0, must-revalidate` after saving this setting. Refreshing code does not require deleting saved lab progress. See [Cloudflare's browser cache guidance](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/).

For future entry updates, change the release identifier and check an ordinary browser reload alongside the module response headers. A new policy does not retroactively expire an older cached response until that resource is fetched again. These changes do not delete `localStorage` or student reports; preserve saved work while checking release freshness.

Check all 29 assignment entry points, five beginner labs and five pathway filters, then complete representative actions. Each investigation must show exactly one of **Request & clues**, **Workbench & test**, and **Check & Explain** at a time at every viewport width. Check pointer, touch and keyboard navigation, current-step labels, browser Back/Forward, scrolling and narrow layouts. Navigation must preserve the same mounted controls and workbench: leave an unapplied software field, code edit and typed question in place, change pages and confirm they remain. Notes, clues, and equipment state must also survive. Hidden workbenches must pause their activity. Beginner equipment must remain visible on Explore, Practice and Check. Instructions beside the active controls must explain how to start, make a change, test, and finish without a separate guide. Check short, explained wording in grades 7–8, transitional vocabulary in grades 9–10, and technical evidence prompts in grades 11–12. Teacher rubrics and answer keys must remain absent from public lab assets and the fictional demo.

Exercise fast offline replies with a supported question, paraphrase, contextual follow-up, fictional small talk, definition, simple calculation, unknown detail, oversized input, and HTML-shaped fictional text. Canonical case answers must remain authored and consistent with current observations. General conversation must not invent new case evidence. All replies must stay bounded and render as text; fast mode must make no inference or question-upload request. Confirm canonical case questions/replies can appear in the bounded log and report under existing saving controls, while casual/generated chat cannot enter saved work, reports, clue credit, or completion. A changed equipment state must not be contradicted by copying an old answer. Clear or reset work, switch cases, and navigate away during a pending reply; late replies must not appear in another case or restore cleared work.

### Guarded topic-only requester Worker: deployed and runtime-enabled; frontend verification pending

The standalone Worker uses the existing Paid account and exact POST `{scenarioId, topic}`. There are 161 source-controlled topics: 13 original character topics, 36 definitions, and 112 additional authored library cards. It rebuilds prompts from the fictional profile and fixed topic instruction. Raw typed words, notes, conversation history, records, current equipment, case briefs, clues, repairs, goals, and rubrics are absent. Arithmetic, canonical case/current-state questions, and unmatched wording stay local. Generated replies remain ungraded text outside saved work, reports, evidence, and equipment actions.

One fixed `@cf/meta/llama-3.1-8b-instruct-fp8-fast` call has a 140-output-token limit. The complete prompt is rejected above 2,500 UTF-8 bytes; all 4,669 lab/topic combinations have passed that guard. Model/pricing/token assumptions require ongoing review. Returned text is bounded to 600 characters and screened for obvious private details, HTML, code blocks, and links. There are no retries, Gateway credits, alternate models, arbitrary browser endpoints, or user-selected inference parameters.

**Shared admission ledger.** `worker-requester/budget-schema.sql` creates an aggregate UTC-date/reservation table, not a classroom database. `budget.js` makes one atomic all-or-none D1 write against the shared primary: reserve 25 in today's bucket AND 25 in tomorrow's bucket, only if both remain at or below 6,000. The single-statement capacity decision prevents a rejected call from gradually consuming just one bucket. Both returned rows, their totals, and consecutive dates are validated; the day is checked again immediately before AI starts. Unknown commits, failures, cancellations, and timeouts are never refunded or retried. Missing/broken D1, full buckets, malformed results, or a stale day prevent inference and retain the offline reply.

An empty two-day window permits at most 240 starts; sustained use is ordinarily about 120 per day because yesterday's reservations also occupy today. Daily availability depends on earlier reservations: do not advertise an unconditional 240 daily reset. Reserving tomorrow conservatively covers an inference crossing one UTC rollover, not every possible provider attribution or delayed execution. The 25-unit amount is an engineering margin based on the fixed prompt/output/model assumptions; it is not a provider-certified billing bound. The 4,000-unit gap from the included 10,000-neuron allowance is headroom, not a guarantee about unrelated account usage. Preserve the ledger across deploys; disable inference before restoring, deleting, resetting, or replacing it.

**Configuration and status.** The D1 database and schema exist; a real Cloudflare SQL check recorded a 25-unit reservation in both UTC-day rows without calling AI. The reviewed guarded bundle is deployed as reviewed bundle deployment `acfd4943`, with `AI`/`REQUESTER_BUDGET` bindings and both runtime enablement flags set to literal `true`. This used the existing account without new OAuth access, a new API key, or another account. Fresh-deployment `wrangler.jsonc` defaults stay `REQUESTER_ENABLED=false` and `REQUESTER_BILLING_REVIEWED=false`; source defaults do not describe the current dashboard runtime settings. Keep new deployments disabled until separately reviewed. The flags are operator assertions, not subscription detection or a spending cap. PR #26's frontend changes still await preview verification and merge; live inference acceptance remains pending. `src/requester-config.js` contains the exact `/api/requester` Worker URL, and only that origin is added to main-page `connect-src`; reports remain connection-free and the teacher route self-only. The legacy Pages requester and classroom source locks remain false. See [Worker operations](../worker-requester/README.md).

**Limits and verification.** Per-isolate controls still limit bursts and unfinished calls, but D1 provides this feature's shared admission cutoff. The ledger stores only UTC dates and aggregate reservations: no questions, topics, names, IDs, IPs, history, records, or credentials. Normal provider operational metadata still exists. A deadline may stop waiting while inference continues; its concurrency slot stays occupied until settlement, and its reservation remains spent. Every budget/provider/network failure retains offline conversation, with HTTP 429 switching optional AI off. Tests use fake AI bindings; a successful live model reply has not yet been verified. Current full verification is 931 tests, 929 passed, zero failed, two Windows file-link skips; syntax covers 51 modules and the public build contains 65 reviewed files. Deployed version/settings checks do not replace the pending frontend, model-reply, or end-to-end fallback checks. Recheck current [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [data handling](https://developers.cloudflare.com/workers-ai/platform/data-usage/) before stronger claims.

### Visual and device acceptance

The refresh uses a 17px default type size, colorful pathway cards, a warm public catalog, and dark high-contrast workspaces. The larger complete PC picture and **Expand picture** / **Fit picture** controls change only the view; Escape restores the fitted picture. Verify both views with normal and larger text, browser zoom, keyboard focus, and short windows. Keep equivalent controls reachable through normal page scrolling. Do not claim that a 10–11-inch screen guarantees a particular usable viewport or that the entire investigation fits on screen at once.

Check the hardware cable interaction using both steps: pick up the virtual cable, then choose a labeled port. Verify keyboard/touch alternatives, cancellation, and power, display, startup, and drive readouts before and after a real modeled change. Readouts must reflect equipment state without repairing anything or awarding completion. Internal repairs must still obey the virtual power-off and unplug requirements. No real-device scan, voltage measurement, or network probe should occur.

All PC investigations must retain Full PC X-ray throughout the task. A tool, cable selection, saved view, legacy view action or complete-controls toggle must not replace it with a cropped monitor, rear or inside view. The monitor remains visible in the full picture, with its readable startup transcript available below the equipment. See [actual Microsoft Edge acceptance](PR22-EDGE-TESTING.md) for the tested desktop browser workflows.

For software tools, exercise quick buttons and typed allowlisted commands, changed saved settings, unknown commands, chained commands, and real targets outside the simulation. Output must stay bounded and safe text. Inspecting must preserve unapplied form entries, leave settings and test/completion state unchanged, and avoid all shell, network, database, and uploaded-code execution. Confirm a successful partial observation does not pass the complete task: for example, local gateway/DNS replies do not validate an incorrect default-gateway field, reading a handout does not excuse excessive editing rights, and an available portal does not prove containment.

For coding, verify all three programs against changing fixtures, syntax errors, boundary inputs, immutable fixture variables and bounded loops. The teaching-language interpreter must reject browser/global object access, property traversal, imports, arbitrary JavaScript and network or shell capabilities. Keep source/token/nesting/step/loop/output limits intact; do not substitute `eval`, `Function`, a remote execution service or a general language runtime. Changing saved code must invalidate its earlier technical result. Check that an unapplied edit survives section focus changes and read-only inspections, and that reports show saved source plus recorded output rather than presenting an unsaved draft as tested work.

Write a hypothesis, make a change, and run its test. Software cases must run the current workspace checks; hardware cases must verify current startup and original-task evidence after using the bench controls. The button must not judge the hypothesis wording, silently repair the setup, or award a grade. Changing the setup requires another test. In Check & explain, verify the original task and inspect the report's questions, actions, evidence, and learner explanation. Keep the production classroom service locked throughout this static-site release.

Verify that a fresh page begins in memory and neither reads saved work nor automatically enables persistence. Check explicit unencrypted device save, explicit resume, pausing future saving, one-ticket reset, and clearing local work, including other open tabs. Clearing must not be described as deleting downloads, clipboard contents, backups, or school assignment files. Confirm ordinary copy and `.txt` reports, keyboard navigation, and browser back/forward behavior. Recheck the responsive layout at 1366 × 768, 1024 × 768, and 768 × 1024; those sizes previously passed without page-level horizontal overflow. Test a real managed Chromebook before classroom use.

For `secure-reports.html`, verify the deployed page, script/style MIME types, restrictive response policies, and no unexpected third-party requests. With fictional reports and disposable test keys, check successful encryption/decryption, wrong recipients/passphrases, altered metadata/ciphertext, malformed/oversized files, unsupported secure contexts, and clear-page behavior. Confirm that neither report content nor aliases appear in the outer envelope or generated filenames, and that the page does not upload work/keys or intentionally write them into browser storage. Browser files and decrypted text must be handled safely as text, not inserted as executable HTML. Do not generate, provision, commit, or publish real school reporting keys as part of deployment.

The tool does not verify teacher employment or student authorship. The school must approve trusted public-key distribution, fingerprint checks, key/passphrase custody, recovery, authorized key holders, endpoints, and retention before real records are used. Google/district identity metadata remains in Classroom, and delivered JavaScript and the user's endpoint remain part of the trust boundary. This is not an independently audited or certified encryption service. Ordinary public-lab sharing must contain only a public lab URL, never aliases, class codes, grades, reports, keys, or school identifiers.

Cloudflare reports network and SSL/TLS DDoS protections Active, with HTTP DDoS always enabled and no custom overrides. No custom WAF or rate-limit rules are configured. Keep any future rules proportionate: many learners can share one school IP, and managed browser extensions, filtering, or proxies can affect challenges. Challenge pages cannot operate inside cross-origin iframes. The site's `#lab/...` routes are browser fragments and cannot be targeted as separate WAF request paths.

[Cloudflare: Rate-limit parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/) · [Supported browsers](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/) · [Challenge limitations](https://developers.cloudflare.com/cloudflare-challenges/concepts/how-challenges-work/)

## 5. Maintain the Git integration

Production changes on `main` trigger the connected Pages deployment. Review its result before treating a source change as live. Keep the GitHub App limited to the intended repositories and preserve other projects using the shared Cloudflare Workers & Pages installation. Do not uninstall the shared app merely to change this project's settings.

The public labs use static asset serving. The optional classroom API invokes Pages Functions only for `/api/*`, as declared by `_routes.json`; its usage and any future database usage have separate limits. Do not enable connected classrooms or create a paid service as part of a routine static-site publish. Check current platform limits before planning enrollment.

[Cloudflare: GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/) · [Static request pricing](https://developers.cloudflare.com/pages/functions/pricing/) · [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

Use the Pages deployment history for a controlled rollback after native hosting is verified. Preserve mail and DNSSEC during any rollback. Moving a custom-domain DNS record away from Pages can deactivate that association; account for reactivation checks if moving it back.

## Saved work and public files

Independent progress starts in page memory. Optional saved work belongs to a browser profile and origin: scheme, hostname, and port. It is unencrypted, requires an explicit save choice, and is read only after an explicit resume action. The `pages.dev`, apex, HTTPS `www`, and old Google Sites or GitHub addresses have separate storage scopes. Changing only the hosting provider while retaining the same HTTPS `www` origin does not itself change that scope. Saved work still depends on browser retention and the application's storage key.

Export needed reports before changing the classroom entry address or clearing site data; no automatic cross-origin transfer or report import is implied. Use a cache-only refresh when appropriate instead of deleting local storage that may contain student work.

Deployed static files are public. GitHub reported the source repository as public on October 20, 2026; verify its current visibility before each release, and never treat repository visibility as protection for browser-delivered assets. Keep credentials, student records, reports, school identity maps, private reporting keys/passphrases, and confidential material out of commits, assets, screenshots, issues, and previews. The ignore rules exclude `.cllkey`, `.cllpub`, and `.cllreport` files as an accident-prevention measure; ignore rules cannot erase Git history or make a committed file private. A public reporting key is distributable through an approved school channel, but no school key files are needed in this repository.

Independent practice and the local report tool do not upload lab work. Students manually attach a chosen report directly in the school's approved assignment system. Encrypted attachments still carry connection/file metadata, and Google/district permissions still govern Classroom identity and records. Only a future reviewed source release, approved configuration, and explicit enrollment could permit central classroom drafts, submissions, and manual grades. Production processing remains blocked. The prepared D1 design does not provide teacher-held encryption of stored work.

## Optional classroom deployment boundary

`functions/api/[[path]].js` is compiled by Pages from the repository-root `functions/` directory, separately from the reviewed static `dist` artifact. The application has no runtime package dependencies; the configured check/test/build command still runs before publishing. `_routes.json` routes only `/api/*` into Functions. The actual production `onRequest` must return HTTP 503 with `enabled:false` and `error: classroom_privacy_review_required` regardless of environment settings. Verify this against the HTTPS preview and production release. It must not reach request-context settings, D1, or identity-key retrieval. A successful static deployment does not activate the prepared handler.

Keep the hardcoded gate closed in production and previews, and keep preview environments isolated from any future school database or teacher identity configuration. Teacher emails, `CLASSROOM_ENABLED=true`, D1 bindings, Access audiences, class codes, and user checkboxes do not constitute approval and cannot unlock this release.

Before considering any change, complete the evidence and blocking work in [Privacy release requirements](PRIVACY-RELEASE-GATE.md): applicable COPPA, New York §2-d/Part 121, FERPA and other jurisdiction review; required school agreements; necessary purposes and fields; provider restrictions; rights and incident processes; and verified security and retention operations. Record the review scope and findings. No completed legal certification or global approval exists. Only a reviewed source-code release may change the production boundary after that evidence is complete.

[Classroom setup](CLASSROOM-SETUP.md) documents the separate prepared handler, technical configuration, and fictional integration tests. Those tests deliberately bypass the production entry for development coverage; they do not grant approval or enable enrollment. Continue testing the production gate separately, including hostile or apparently complete configuration that must still be rejected. No client-only PIN or role grants teacher access.

The prepared API’s 90-day expiry is an experimental development default, not an approved necessary retention period. Later authorized-request cleanup, throttled per binding/isolate, is not scheduled erasure. Purpose/contract-specific retention, verified scheduled purging, early return/deletion, rights requests, backup/recovery expiry, and destruction evidence remain blocking gaps. Provider backups have separate recovery periods. Do not provision a database for real records or change the production gate until those operational requirements and the legal/district evidence have been reviewed.

Use Node.js 24 for supported local checks and builds; the SQL tests use `node:sqlite`. The local preview intentionally returns unavailable for classroom API calls. Chrome viewport testing does not establish actual Edge or school-network compatibility. [PR #22's later Edge acceptance](PR22-EDGE-TESTING.md) records its own tested workflows, while this visual refresh needs current device checks. Test the release on the school's actual supported devices and network before classroom use.

## Migration history: GitHub Pages

The earlier host published `main` from the repository root. Its `www` record pointed to `al91cole.github.io`, and the apex used GitHub's four published A addresses. DNS and DNSSEC were independently verified, but GitHub's custom-domain certificate remained requested and the browser presented a certificate mismatch.

After verifying the public CNAME, one documented remove-and-re-add of `www.colelearninglabs.com` was performed in GitHub Pages to restart issuance. Do not repeat that retry as part of the native Pages deployment. The user approved native Cloudflare Pages hosting to serve the existing files without depending on the stalled GitHub origin certificate.

Legacy GitHub Pages was retired after the native deployment and custom entry points were verified. Its custom domain was removed, its publishing branch was saved as None, and GitHub explicitly confirmed that Pages is disabled. The source repository was preserved. GitHub's legacy `CNAME` file was deleted; it is not part of the current file inventory. A retained `.nojekyll` file is a harmless legacy artifact and does not configure Cloudflare Pages. Pages project settings and custom-domain associations now control the live hosting.
