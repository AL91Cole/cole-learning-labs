# Prepared static owner preview

This is an alternative to activating the prepared membership backend. It serves the full authored lab application through a separately protected Pages preview, using the existing business Google Workspace account through SAML and a separate hosted authenticator check in Cloudflare Access. It needs no Stripe customer, subscription, Google OAuth application, membership database, Worker activation, or new paid feature. The custom SAML trust is separate from the prepared membership OAuth service. The normal public build and production branch remain unchanged. This document and builder do not publish a deployment or configure Access.

## Preconditions before any full content is uploaded

The operator must verify the existing included Access entitlement and configure preview protection first. The application must cover the Pages project's preview hostnames and all paths, including both branch aliases and hash addresses. Use an exact approved owner-email Include together with a Require condition for the approved SAML login method. The application must accept that SAML provider only, with all-providers and WARP authentication disabled, and require its independent hosted authenticator check. Email one-time PIN is not an alternative login path for this application. Do not allow Everyone, a whole email domain, account-wide membership, or a Bypass policy. Confirm there is no more-specific application/path or alternate preview custom domain that exposes the same files. Keep production `www`, apex and the production Pages alias outside this owner-preview policy. [Pages preview protection](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

Test anonymous requests to the future owner branch and a known hash preview before uploading full bytes: root HTML, `/learn/`, the app script, stylesheet, and a direct download must all receive the expected Access login redirect. Verify the actual allow policy separately; an anonymous redirect does not establish which identities can sign in. Confirm the approved owner can authenticate, and that production still serves its existing public build.

Access handles the owner's authentication cookies, email identity and connection/security metadata. This is not anonymous browsing. Student accounts, classroom collection, improvement sharing and online AI remain unavailable in the owner artifact.

## Shared sign-in entry while memberships are disabled

The **Sign in** links in the site navigation, footer and membership notice all open the same internal `#signin` account page in the current tab. There is no separate owner navigation item or account page. The shared page states that only approved accounts may sign in, public registration is unavailable and subscriber sign-in is still being prepared. Its single **Verify your account** link uses the fixed existing destination `https://codex-private-owner-preview.cole-learning-labs.pages.dev/learn/` for currently authorized access. It never accepts a destination, identity, role or entitlement from query parameters or browser state.

The approved account authenticates on the hosted sign-in screens, including authenticator enrollment or verification when required. The public page collects no password, email, verification code, authenticator seed or token and makes no automatic request. A browser with a current valid session can open the labs without another prompt; that is session reuse, not authorization from clicking a link. Neither SAML ForceAuthn nor the public entry guarantees a fresh Google password prompt on every visit. The browser never grants content access itself. People outside the approved owner policy cannot use this entry to unlock paid content; the current Access policy is not expanded into subscriber authorization.

This entry needs no membership registration, subscription, payment or new paid authentication service. Keep the full artifact behind its existing owner policy and guard checks. The public navigation change reaches production only after the source PRs are reviewed and merged; the separately approved protected preview can be refreshed independently.

When the separately reviewed subscriber service launches, the same shared page can be connected to its common account flow. That prepared server already distinguishes owner entitlement from active subscriber entitlement after authentication, so owner access needs no separate public login button or payment. Connecting that service requires its own release review and is not part of this UI change.

## Current authentication cutover: owner entry verified

The saved outward SAML configuration sends only the business account's primary email, uses EMAIL NameID and signs the response. It does not change how Google mail or other Workspace services authenticate. The protected application's saved Allow policy combines the one approved email with the required SAML method and a 30-minute session. Its custom MFA setting requires independent time-based authenticator codes with a one-hour factor lifetime. Global MFA enforcement remains off and the option to skip this check based on an IdP MFA assertion is off; the lab application's own requirement is the relevant control. Do not treat an assertion about Google MFA as proof of this separate check.

A separate App Launcher enrollment policy admits the same exact approved email only through SAML, with a 30-minute session and no MFA override, so the account holder can enroll without a circular lab-access requirement. The account holder completed the hosted enrollment and final save; the screen reported setup complete. Authenticator secrets, QR codes, recovery material and valid codes remain with the account holder.

Fresh dashboard readback confirmed HTTPOnly and binding cookies enabled. Ten anonymous branch/hash direct-file guard checks passed after the authentication change. A fresh lab attempt stopped at the authenticator challenge and rejected one deliberately invalid synthetic code. The account holder then completed valid-code sign-in and confirmed that the labs opened; the authenticated browser showed the protected `/learn/#labs` full catalogue. A separate authenticated tab opened `#sandbox/blank` with the actual editor and Run program control, without a membership gate. This verifies the owner's entry through the new flow, not every account or future policy change. No new source deployment was made for these authentication changes.

The provider's revoke-existing-tokens action was issued and finished loading without a displayed error. Its audit confirmation remains pending; do not claim that all previous sessions have been proven invalidated. See [the operational record](OPERATIONS-AUDIT-2026-11-01.md).

## Builder boundaries

The shared branch retains the ordinary command:

```text
npm run build → node scripts/build.mjs
```

That build continues to publish the free allowlist. `scripts/build-owner-preview.mjs` is a separate CLI that refuses to run unless both conditions hold:

```text
CF_PAGES=1
CF_PAGES_BRANCH=codex/private-owner-preview
```

Only a future, separately reviewed private branch may replace its package build command with `node scripts/build-owner-preview.mjs`. Never merge that override into `main`. The CLI also rejects destination arguments; its output is the existing ignored `dist` directory. An accidental invocation on another branch exits before preparing private content.

Two operator-controlled preview environment values are required:

| Private setting | Purpose |
| --- | --- |
| `CLL_OWNER_ACCESS_ISSUER` | The independently verified, canonical HTTPS Cloudflare Access team origin. |
| `CLL_OWNER_ACCESS_CANARY_HOST` | A known eight-hex hash preview hostname under this Pages project, used to test wildcard protection independently of the branch alias. |

Do not commit actual values, owner identity, cookies, PINs, login redirect metadata or other credentials. The fixed owner branch alias is `codex-private-owner-preview.cole-learning-labs.pages.dev`. The builder's guard sends anonymous, bounded GETs with no cookies/authorization and does not follow redirects. Both hosts' HTML and direct asset paths must return **302** to the exact configured Access issuer and its host-specific `/cdn-cgi/access/login/<requested-host>` path. Public responses, unrelated redirects, malformed settings, timeouts and partial protection reject the build. Raw login URLs and response bodies are not logged.

The guard runs before preparing the artifact and again before replacing the upload directory. The current deployment passed live checks for this exact redirect format; repeat them for every new deployment and do not relax the guard to accept any redirect. Dependency injection exists only for offline tests and is unavailable through CLI arguments or browser input.

## Static output

The builder reuses canonical protected-asset preparation and compiles the main app with `member: true, localOnly: true, ownerPreview: true` only after the anonymous Access guard passes. The local-only option replaces only the compiled `REQUESTER_CLOUD_ENABLED` value; it does not change the existing public AI source setting or backend budgets. All replies in this artifact are authored local responses.

`src/owner-preview.js` defaults to `OWNER_PREVIEW=false`. The trusted compiler forces it false for both ordinary public and prepared membership artifacts; the true option is rejected unless the build contains the full member application, disables cloud replies and uses the main app entry. The guarded static owner builder alone opts in. This context permits moving between lab steps without completing navigation-only fields so the owner can inspect the activities. It does not authenticate anyone, grant private content, complete assessments, override simulated equipment safety or enable educator access. Access remains the authorization boundary. No URL, browser storage value, role or runtime environment flag can activate it in an existing artifact, and the raw module is excluded from public and private static delivery. Future educator preview access requires a separate review.

The output contains a small root page linking to `/learn/`, the reviewed full local application and its static resources, a fixed 404, and defensive metadata. It omits classroom/teacher portals, API files, payment handlers, membership Worker code and source maps. The generated policy includes `noindex`, private/no-store caching, strict script and framing policies, COOP/CORP, and `connect-src 'none'`. Production/member canonical metadata is removed from the private HTML copy.

Its `_routes.json` includes the schema-required include rule and excludes every route:

```json
{"version":1,"include":["/*"],"exclude":["/*"]}
```

Cloudflare documents that exclusions take priority and that at least one include rule is required. No Pages Function may be invoked by this artifact. Existing repository Functions and production service bindings are not edited or activated by this builder. Check the actual deployment's routing/bindings before use. [Functions routing](https://developers.cloudflare.com/pages/functions/routing/).

## Release and continued operation

Offline builder tests do not upload an artifact. The separately approved private deployment and its authentication checks are recorded above and in the operational record. After each future approved private-preview deployment, repeat the anonymous direct-file checks on the newly assigned hash and branch alias, test owner login and local lab operation, and verify production is unchanged. Do not promote the full preview to production or attach an unprotected custom domain.

Access is the authorization boundary for this static alternative. Do not remove or broaden its policy while full preview deployments remain reachable. To retire protection, first replace/remove the relevant full deployments through a reviewed deployment-ID plan and confirm private bytes are no longer served. A build-time guard cannot prevent a later account-setting change.

The existing Free entitlement can avoid a new plan or add-on, subject to actual account eligibility and included limits. “Full access” describes content, not uncapped hosting, build, authentication or other usage. No zero-charge guarantee, account-wide cost cap, legal-compliance determination, or security warranty is made. The prepared membership backend and its independent owner entitlement remain disabled.
