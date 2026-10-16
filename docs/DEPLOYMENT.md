# Deploying Cole Learning Labs

This site is static HTML, CSS, and browser ES modules. It needs no build service, database, API key, or server application. The repository publishes through GitHub Pages. These notes describe its configuration and the checks to use for future deployments.

- Public repository: [AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs)
- Publishing source: `main`, `/(root)`
- Custom hostname: `www.colelearninglabs.com`
- Domain registrar: Squarespace

The custom domain is configured in GitHub Pages and the DNS records below have been saved. GitHub reports a successful DNS check and is issuing the custom-domain certificate; its **Enforce HTTPS** checkbox is still disabled. Squarespace's previous apex forwarding rule was removed, and all mail records were preserved.

The user approved the Cloudflare switch, and Squarespace confirmed the saved nameservers `elias.ns.cloudflare.com` and `venus.ns.cloudflare.com`. Cloudflare Free is waiting for registrar propagation and is not yet marked active. All ten imported records remain DNS-only. The Cloudflare SSL/TLS mode is saved as **Full (strict)**, but no website proxy, WAF, or caching protection is enabled.

The old DNSSEC delegation was removed before the nameserver change. Squarespace's custom DNSSEC page shows **No DS Records**. Cloudflare DNSSEC has not yet been restored; do that after activation using Cloudflare's newly supplied DS information.

Keep the existing Google Site available while the new domain connection is verified.

## 1. Publish the static files

Put `index.html`, the styles, `src/`, and the other public assets in the repository root. Include an empty `.nojekyll` file to serve this buildless site without Jekyll processing. Keep asset paths relative so the same files work under the default project-site path and at the custom-domain root.

In the repository's **Settings → Pages**, select **Deploy from a branch**, choose the existing `main` branch and `/(root)`, and save. Inspect the Pages deployment run and wait for success. Open the address GitHub displays, then test navigation, one assignment from each pathway, report export, and a page refresh. Hash routes such as `#lab/INC-101` do not require a server rewrite rule.

[GitHub: Configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 2. Verify ownership at the account level

In the GitHub account's **Settings → Pages**, add `colelearninglabs.com` as a verified domain. Follow GitHub's TXT instructions exactly. The host will follow the `_github-pages-challenge-USERNAME` pattern; use the actual name and token GitHub provides, not an example value.

Add the TXT record at the authoritative DNS provider, confirm it is visible, and complete GitHub's verification. Keep it afterward. Verification of the apex domain also covers its immediate subdomains, including `www`.

This setting is in the account profile settings, not the repository settings. Do not remove existing mail or unrelated verification records to add it.

[GitHub: Verify a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)

## 3. Set the repository's custom domain before changing DNS

In **repository Settings → Pages → Custom domain**, enter `www.colelearninglabs.com` and save. GitHub recommends making this association before pointing DNS at Pages. For branch deployment, GitHub adds a `CNAME` file; retain that commit in later updates.

The final DNS configuration is:

| Type | Host | Destination |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `al91cole.github.io` |

For `www`, use the owner hostname only: no protocol, slash, or repository name. Do not leave a competing record for the same `www` host. This replaces the former Google Sites destination, `ghs.googlehosted.com`; registration remains with Squarespace.

The Squarespace apex forwarding rule and its managed hosting records were removed. The four GitHub Pages A records now provide the apex destination. With both hostnames correctly configured and `www.colelearninglabs.com` selected in Pages, GitHub handles the redirect from the apex to `www`. Verify that behavior after DNS and the certificate become ready; do not restore the old forwarding records alongside this configuration.

[GitHub: Manage a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## 4. Check DNS and HTTPS

From PowerShell, inspect the public answers:

```powershell
Resolve-DnsName -Name www.colelearninglabs.com -Type CNAME
Resolve-DnsName -Name colelearninglabs.com -Type A
```

The `www` answer should point to `al91cole.github.io`, and the apex answer should contain the four GitHub addresses above without the old Squarespace hosting addresses. Check the DNS result in Pages settings too. If a network policy blocks command-line DNS, use the provider's records and an independent permitted lookup rather than treating the tool failure as a domain failure.

GitHub provisions a certificate after its DNS check succeeds. Once available, enable **Enforce HTTPS** in Pages settings. GitHub documents up to 24 hours for DNS propagation and for that enforcement option to appear. A public repository or successful build alone does not prove the custom domain is ready.

All page assets should be relative URLs or HTTPS URLs. HTTP images, scripts, or styles can cause mixed-content problems.

[GitHub: Secure Pages with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

If HTTPS remains unavailable after DNS is correct, inspect the Pages certificate status. GitHub documents certificate availability taking up to an hour after custom-domain configuration. Check conflicting DNS and any CAA policy; a restrictive CAA setup must permit `letsencrypt.org`. Follow GitHub's documented reprovisioning steps only after checking the configuration, rather than repeatedly changing working records.

[GitHub: Troubleshoot custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)

## 5. Validate the migration

Check these separately in a browser without editor privileges:

- The custom HTTPS hostname displays the new site with no certificate warning.
- An HTTP request upgrades to HTTPS after enforcement is enabled.
- Both apex HTTP and apex HTTPS requests reach the intended `www` address.
- All routes, styles, module files, and images load at the custom-domain root.
- A direct hash link and a refreshed assignment remain usable.
- All 15 assignments open; representative actions, reset, local resume, and text report export work.
- Professional external links lead to the intended public destinations.

Record the actual repository URL, deployment result, domain test, and any remaining issue before calling the migration complete.

## 6. Cloudflare cutover in progress

### Current status

| Item | Status |
| --- | --- |
| Cloudflare plan | Free; waiting for registrar propagation, not yet marked active |
| Imported DNS | All ten existing records copied and DNS-only |
| Previous Squarespace nameservers | `nse1.squarespacedns.com`, `nse2.squarespacedns.com`, `nse3.squarespacedns.com`, `nse4.squarespacedns.com` |
| Saved registrar nameservers | `elias.ns.cloudflare.com`, `venus.ns.cloudflare.com`; Squarespace confirmed “Nameservers updated” |
| Current DNSSEC | Old delegation removed; Squarespace shows “No DS Records”; restoration pending |
| GitHub origin HTTPS | DNS check successful; certificate being issued |
| GitHub HTTPS enforcement | Checkbox disabled while certificate is pending |
| Cloudflare SSL/TLS mode | Full (strict) saved and confirmed |
| Cloudflare HTTPS settings | Always Use HTTPS on; minimum TLS 1.2; TLS 1.3 on; apply to proxied traffic |
| Cloudflare edge certificate | Active status not yet confirmed |
| Cloudflare web proxy and protections | Not enabled |

Approval, record import, removal of the old DNSSEC delegation, the registrar nameserver change, and the Full (strict) setting are complete. Nameserver propagation and Cloudflare activation are still pending. Saved settings alone do not confirm that every resolver has adopted the new delegation or that web protection is running.

### Remaining activation steps

1. Wait for Cloudflare to show the zone as active. Check public delegation for the two saved Cloudflare nameservers; do not repeatedly replace correctly saved nameservers during propagation.
2. Recheck the GitHub web records and Google Workspace mail and verification records through the active DNS provider. Test the website and mail delivery. DNS edits made only at Squarespace will no longer apply once Cloudflare is authoritative.
3. After activation, enable DNSSEC in Cloudflare and add its newly supplied DS information at Squarespace. Verify the new chain before recording DNSSEC as active. Do not restore the old provider's DS values.
4. Finish GitHub's custom-domain certificate issuance, test origin HTTPS, and enable GitHub's **Enforce HTTPS** when its control becomes available.
5. Confirm Cloudflare's edge certificate is active too. Keep the web records DNS-only until both certificates are ready and proxy compatibility has been checked.

[Cloudflare: Full DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) · [Squarespace: Nameserver changes](https://support.squarespace.com/hc/en-us/articles/4404183898125-Review-change-or-reset-your-domain-s-nameservers)

### Treat web proxying as a separate step

DNS-only records send website traffic directly to GitHub Pages. Cloudflare's WAF, caching, and protection for proxied web traffic do not apply to those requests. Mail and third-party verification records remain DNS-only.

After zone activation, Cloudflare can provision Universal SSL even while web records are DNS-only. Keep them unproxied until the edge certificate is active; Cloudflare documents a 15-minute to 24-hour provisioning window.

**Full (strict)** is already saved. Before enabling any proxy record, confirm GitHub's valid, matching origin certificate and Cloudflare's active edge certificate. The saved mode applies to proxied connections; it does not route DNS-only traffic through Cloudflare. The edge certificate covers the visitor-to-Cloudflare connection and does not replace the required origin certificate. An invalid origin certificate can produce error 526.

[Cloudflare: Proxy status](https://developers.cloudflare.com/dns/proxy-status/) · [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/) · [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

Successful edge HTTPS alone does not establish that GitHub's origin certificate will continue renewing. Monitor origin renewal and Pages validation if the proxy is enabled. Keep DNS-only as a fallback if the hosted platform's validation or certificate process conflicts with proxying; no guarantee of unattended GitHub certificate renewal behind the proxy is implied.

[Cloudflare: Hosted-platform and verification caveats](https://developers.cloudflare.com/dns/proxy-status/use-cases/)

### Keep classroom access usable

Begin without blanket challenge rules or aggressive per-IP rate limits. A school can have many learners behind one public IP. Test from a managed Chromebook on the actual school network; extensions, filtering, and proxies can affect challenges, and challenge pages cannot operate in cross-origin iframes.

The site's `#lab/...` routes are browser fragments and cannot be matched as separate WAF request paths. Review the actual requests before adding rules. Recheck the assignment layout, local progress, and report export after any security change.

[Cloudflare: Rate-limit parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/) · [Supported browsers](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/) · [Challenge limitations](https://developers.cloudflare.com/cloudflare-challenges/concepts/how-challenges-work/)

## Maintenance and rollback

Keep the root `CNAME` file exactly named, with a single domain and no scheme. Saving only a local file is not a substitute for configuring Pages settings. Preserve `.nojekyll`, relative asset paths, verification TXT, and unrelated mail records.

If a migration problem requires rollback, review both the `www` destination and the apex configuration as one plan. Confirm that the original Google Sites domain mapping is still present before restoring its recorded destination. Do not combine GitHub's apex A records with a restored Squarespace forwarding preset. DNS changes take time to become visible. Do not delete either site's content as part of routine cutover.

Student progress is origin-specific. Local preview, the default GitHub address, the old Google Sites address, and the custom domain do not share browser storage. Ask learners to export a report before changing the classroom entry address; no automatic migration or report import is implied.

The repository and published static files are public. Keep credentials, private student records, and confidential school material out of commits and site assets. Classroom reports are exported by learners and are not uploaded by this application.
