# Prepared owner access without a subscription

The owner can be granted access to the full private lab collection without creating a payment customer, subscription, checkout, or billing-portal session. This is a prepared server entitlement, not a live activation. All committed membership source/client gates, runtime settings, routes and pricing remain closed. No account, Google application, database, service, deployment or paid feature was created for this change.

“Unlimited” means access to the full lab content without a subscription. Existing request admission, concurrency limits, session expiry, safety rules, cloud-AI budgets and privacy restrictions still apply. It does not mean unlimited requests, inference, hosting usage or a guarantee of no usage charges.

## Identity and authorization

Two private server values are required together:

| Setting | Required value |
| --- | --- |
| `MEMBERSHIP_OWNER_EMAIL` | One exact verified Google email, also present in the existing private `MEMBERSHIP_ALLOWED_EMAILS` adult allowlist. |
| `MEMBERSHIP_OWNER_GOOGLE_SUBJECT` | The exact immutable subject of that same verified Google identity. |

No real owner email or subject belongs in source, public configuration, frontend flags, local storage, URLs, logs, screenshots, PR text or examples. There is no domain wildcard, client role, owner password, special browser token, or public account-upgrade endpoint.

The existing Google authorization-code flow verifies provider identity and creates a signed, host-only session. `getAdultSession` checks that session against server storage and the current adult allowlist. `getOwnerLabAccess` then reads the linked Google account, verified user and current session together from `MEMBERSHIP_DB`. It requires exactly one linked Google identity, matching private email and subject, an unexpired stored session, and the existing eight-hour absolute session age. Provider access/refresh tokens are neither selected for this check nor needed for it.

This database check runs again for every private document, script, stylesheet, image and download. The result is not cached. The public asset binding cannot provide private lab content. Normal anonymous admission and concurrency backstops still run before protected delivery.

Both owner settings absent means the original subscriber path continues. A partially configured or malformed owner binding fails closed. A session matching the configured owner email but lacking the correct linked subject fails closed before billing; it cannot silently fall through to payment processing. Removing the owner from the adult allowlist, revoking the session, or changing/removing its linked account blocks the next protected request.

## Billing and browser behavior

The session endpoint distinguishes lab access from subscription status:

- `labAccess: "owner"`: the private owner identity matched; paid membership remains inactive, with no plan or renewal date. Stripe is not consulted.
- `labAccess: "subscriber"`: the normal current paid-membership check passed.
- `labAccess: "none"`: no content entitlement was established.

The response includes no email, Google subject or session ID. Its access label is for display; the browser cannot turn that label into a server grant. Every private resource validates the authenticated identity and entitlement independently.

The portal uses the same **Sign in** and **Open labs** labels for all approved adults. For a verified owner response, it confirms that lab access is active without a purchase, disables payment choices, and hides checkout/billing buttons. Opening labs rechecks the server session/status first. Owner requests to checkout or the billing portal are rejected before any payment-provider call. The exception does not create, manage or cancel a subscription. Normal subscribers retain their existing fresh payment verification and billing/cancellation behavior.

Owner access grants lab content only. It grants no classroom enrollment, learner records, reporting collection, billing administration, account-management permissions, or additional cloud-AI capability. Students must not use the owner's signed-in browser or share its session.

## Information needed for a future reviewed rollout

1. Confirm the existing-plan hosting and authentication arrangement, its actual usage limits, and the separate release requirements. This code change does not approve provisioning or activation.
2. Establish the approved adult Google account and verify its actual OAuth subject through the maintained provider flow and server-side account record during a separately approved synthetic/test rollout. Do not infer a subject from an email, trust a browser form/role, or substitute a different Google identifier without verification. Keep identity evidence private. Do not open the release gates merely to discover an identifier.
3. Prepare the exact private email/subject binding, the adult allowlist entry, and a rollback/revocation procedure. Set both owner values together only as part of an approved configuration change. Do not copy them into committed Wrangler `vars`.
4. Test owner delivery with payment credentials and billing tables absent. Verify mismatched identities, missing/expired/revoked sessions, unknown resources, source/runtime closures, and concurrent requests. Confirm normal subscriber verification still applies to nonowners.
5. Review the actual deployable bundle, provider identity configuration and disabled collection gates before a separate release decision. No live Google login, provider resource or real owner configuration was exercised by the offline tests.

The test suite uses synthetic identities, the maintained auth library, real signed session cookies and an in-memory SQLite binding. It demonstrates owner access without billing, denial of forged or mismatched identities, immediate account/session revocation, bounded delivery and continued fresh checks for normal subscribers. It does not establish live provider readiness, legal approval, anonymity, or immunity from compromise.
