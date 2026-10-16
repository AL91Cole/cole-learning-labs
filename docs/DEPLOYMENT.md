# Deploying Cole Learning Labs with Cloudflare Pages

Cole Learning Labs uses static HTML, CSS, and browser ES modules served by Cloudflare Pages. GitHub remains the source repository. Independent labs and the fictional classroom demo need no database or live AI API. An optional Pages Functions classroom API is included but rejects requests until its teacher identity, database, and enablement settings are explicitly configured. No real teacher workspace, D1 database, or Access application is provisioned for this release. See [Classroom setup](CLASSROOM-SETUP.md) before activation.

## Verified deployment status

| Item | Confirmed status |
| --- | --- |
| Source repository | [AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs) |
| Hosting | Native Cloudflare Pages |
| Pages project | `cole-learning-labs` |
| Git integration | Authorized for selected repositories; existing connection preserved |
| Production branch | `main` |
| Framework preset | None |
| Build command | `exit 0` |
| Build output directory | `.` |
| Root directory | Repository root |
| Classroom environment | Unconfigured; real enrollment and server storage disabled |
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

In **Workers & Pages → Pages**, use the existing `cole-learning-labs` project. Its GitHub connection reads `main` with the configuration above. Do not select `npm run build`: the package has no production build script and the files already occupy the repository root.

Cloudflare's framework-free guidance allows an empty command; the Static HTML guide recommends `exit 0` as an explicit no-op. Output `.` selects the directory containing `index.html`, `src/`, and `assets/`.

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

Scripts and connections are limited to the site's own origin. Existing illustrated components use inline style attributes, so the style policy permits those; the script policy does not permit inline scripts or evaluation. The teacher route adds `frame-ancestors 'none'` and private/no-store caching. Public lab pages retain the option to be embedded by a school LMS. API responses set their own security and no-store headers because Pages `_headers` does not configure Functions responses. HSTS omits subdomains and preload.

HTML responses at `/`, `/classroom`, `/school-it`, and `/teacher/*` include `Cache-Control: no-transform` to prevent Cloudflare's automatic performance-beacon injection. The Pages project's Web Analytics is disabled. A public-domain browser check exposed a proxy-injected beacon despite that project setting; the public HTML response must therefore be checked as well as the dashboard. This does not disable Cloudflare's normal hosting/security request metadata. [Cloudflare automatic setup and no-transform](https://developers.cloudflare.com/web-analytics/get-started/).

Check the actual HTTPS preview and production response headers, module MIME types, navigation, and console before treating a release as verified. A security header is one control, not a school approval, filter override, or security certification. [Cloudflare headers documentation](https://developers.cloudflare.com/pages/configuration/headers/).

### Release cache behavior

The entry URL `src/app.js?release=20261016-schools2`, every internal source-module import, and every HTML script/stylesheet link use the same release query. This prevents returning browsers from combining a new entry with older modules or styles that were cached under the previous four-hour policy. Updating only the entry query is insufficient when dependencies add exports. `_headers` declares `/src/*` with `Cache-Control: public, max-age=0, must-revalidate`, allowing modules to be stored but requiring revalidation before reuse. Check the response after future deployments.

In the Cloudflare zone, **Caching → Configuration → Browser Cache TTL** is set to **Respect Existing Headers**. This preserves the application's cache policy; the default four-hour browser setting can override a shorter origin policy. The live HTTPS application response was verified with `max-age=0, must-revalidate` after saving this setting. Refreshing code does not require deleting saved lab progress. See [Cloudflare's browser cache guidance](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/).

For future entry updates, change the release identifier and check an ordinary browser reload alongside the module response headers. A new policy does not retroactively expire an older cached response until that resource is fetched again. These changes do not delete `localStorage` or student reports; preserve saved work while checking release freshness.

Check all 15 assignment entry points and complete representative actions. Confirm local resume, reset, copy and `.txt` reports, keyboard navigation, and browser back/forward behavior. Recheck the responsive layout at 1366 × 768, 1024 × 768, and 768 × 1024; those sizes previously passed without page-level horizontal overflow. Test a real managed Chromebook before classroom use.

Cloudflare reports network and SSL/TLS DDoS protections Active, with HTTP DDoS always enabled and no custom overrides. No custom WAF or rate-limit rules are configured. Keep any future rules proportionate: many learners can share one school IP, and managed browser extensions, filtering, or proxies can affect challenges. Challenge pages cannot operate inside cross-origin iframes. The site's `#lab/...` routes are browser fragments and cannot be targeted as separate WAF request paths.

[Cloudflare: Rate-limit parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/) · [Supported browsers](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/) · [Challenge limitations](https://developers.cloudflare.com/cloudflare-challenges/concepts/how-challenges-work/)

## 5. Maintain the Git integration

Production changes on `main` trigger the connected Pages deployment. Review its result before treating a source change as live. Keep the GitHub App limited to the intended repositories and preserve other projects using the shared Cloudflare Workers & Pages installation. Do not uninstall the shared app merely to change this project's settings.

The public labs use static asset serving. The optional classroom API invokes Pages Functions only for `/api/*`, as declared by `_routes.json`; its usage and any future database usage have separate limits. Do not enable connected classrooms or create a paid service as part of a routine static-site publish. Check current platform limits before planning enrollment.

[Cloudflare: GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/) · [Static request pricing](https://developers.cloudflare.com/pages/functions/pricing/) · [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

Use the Pages deployment history for a controlled rollback after native hosting is verified. Preserve mail and DNSSEC during any rollback. Moving a custom-domain DNS record away from Pages can deactivate that association; account for reactivation checks if moving it back.

## Saved work and public files

Progress belongs to a browser profile and origin: scheme, hostname, and port. The `pages.dev`, apex, HTTPS `www`, and old Google Sites or GitHub addresses have separate storage scopes. Changing only the hosting provider while retaining the same HTTPS `www` origin does not itself change that scope. Saved work still depends on browser retention and the application's storage key.

Export needed reports before changing the classroom entry address or clearing site data; no automatic cross-origin transfer or report import is implied. Use a cache-only refresh when appropriate instead of deleting local storage that may contain student work.

All deployed static files and the source repository are public. Keep credentials, private student records, and confidential school material out of commits and site assets. Independent practice does not upload lab reports. If a connected classroom is separately configured and explicitly joined, it can store assigned drafts, submitted snapshots, and manual grades in private D1 records. Those records do not belong in the repository or static assets.

## Optional classroom deployment boundary

`functions/api/[[path]].js` is compiled by Pages during deployment; there is no dependency installation or application build command. `_routes.json` routes only `/api/*` into Functions. With missing configuration, the API must return HTTP 503 with `enabled:false`, not a pretend successful save. Verify this against a real HTTPS preview after adding Functions.

Keep preview environments unconfigured and isolated from any future production database and teacher identity settings. A fictional demo is enough for public review. Before activation, follow [Classroom setup](CLASSROOM-SETUP.md), apply the migration, configure a narrowly scoped teacher Access application and explicit owner allowlist, and test fictional accounts across separate browser profiles. No client-only PIN or role setting grants teacher access.

The prepared API denies access to expired classes after 90 days. Physical cleanup runs on later authorized teacher requests, throttled to one attempt per minute per database binding and worker isolate; it is not scheduled erasure. Provider backups have separate recovery periods. District requirements for retention, agreements, identity recovery, operational monitoring, and managed-device acceptance need review before collecting real records.

Use Node.js 22.13.0 or newer for local checks; the SQL tests use `node:sqlite` and this release was checked with Node 24. The local preview intentionally returns unavailable for classroom API calls. Chrome viewport testing does not establish actual Edge or school-network compatibility. No connected Edge browser or real managed Chromebook was available for this verification.

## Migration history: GitHub Pages

The earlier host published `main` from the repository root. Its `www` record pointed to `al91cole.github.io`, and the apex used GitHub's four published A addresses. DNS and DNSSEC were independently verified, but GitHub's custom-domain certificate remained requested and the browser presented a certificate mismatch.

After verifying the public CNAME, one documented remove-and-re-add of `www.colelearninglabs.com` was performed in GitHub Pages to restart issuance. Do not repeat that retry as part of the native Pages deployment. The user approved native Cloudflare Pages hosting to serve the existing files without depending on the stalled GitHub origin certificate.

Legacy GitHub Pages was retired after the native deployment and custom entry points were verified. Its custom domain was removed, its publishing branch was saved as None, and GitHub explicitly confirmed that Pages is disabled. The source repository was preserved. GitHub's legacy `CNAME` file was deleted; it is not part of the current file inventory. A retained `.nojekyll` file is a harmless legacy artifact and does not configure Cloudflare Pages. Pages project settings and custom-domain associations now control the live hosting.
