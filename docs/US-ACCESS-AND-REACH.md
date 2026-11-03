# Temporary US access and reach measurement

## Live edge policy — November 2, 2026

Cloudflare custom rule **Temporary US-only website access** is active with Block:

```
(http.host in {"colelearninglabs.com" "www.colelearninglabs.com"} and ip.src.country ne "US")
```

The existing configuration-probe, leaked-credential and requester rate-limit
rules remain active. There is no verified-bot exemption from the country block.
Cloudflare validated the expression before deployment; the saved rule was
verified as active. A US browser could still open the website. The production
`cole-learning-labs.pages.dev` address redirected to canonical `www`; the direct
production deployment address required Cloudflare Access. Preview/owner Access
was not weakened. An independent non-US network probe was not available in this
session, so this is not a claim of testing every country or VPN.

This checks the country associated with the connection's IP address, not a
person's citizenship or physical location. VPNs, proxies and geolocation errors
can affect it. To restore wider public access, disable **only** this named rule.
The restriction is a reversible hosting configuration, not JavaScript hiding.

## Reading reach honestly

Existing Cloudflare HTTP traffic includes bots, assets, redirects and blocked
requests. Its pageview/visit estimates can still include automation. Use the
Visitors report, exclude verified automated categories, and restrict paths to
the deliberately published HTML pages. Read both filters together (AND), not
as alternatives. Keep bot traffic in the security report for incident review.
Country statistics before this rule remain historical and may be sampled;
blocking a country now does not remove old entries from reports.

Server logs do not receive hash fragments such as `#lab/INC-101` and cannot
observe a local game's completion. They cannot supply historical per-lab use.
Cloudflare Web Analytics currently offers no custom event API. The separate
real-user monitoring site was configured for the apex host and reported zero
recent beacons at this checkpoint; no new RUM script or CSP exception was added.
Do not describe that zero as proof that no one visited.

The prepared [activity counter](../reach/README.md) supplies separate monthly
start/completion signals after review and activation. It does not identify
people, upload work or establish bot-free counts. Existing traffic reports
remain useful for broad geographic estimates; the new application counters do
not join geography with individual activities.

Sources: [country allowlisting](https://developers.cloudflare.com/waf/custom-rules/use-cases/allow-traffic-from-specific-countries/),
[zone metric definitions](https://developers.cloudflare.com/analytics/account-and-zone-analytics/zone-analytics/),
[bot score availability](https://developers.cloudflare.com/bots/concepts/bot-score/),
[Web Analytics custom-event limitation](https://developers.cloudflare.com/web-analytics/faq/).
