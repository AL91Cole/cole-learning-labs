# Deploying Cole Learning Labs

This site is static HTML, CSS, and browser ES modules. It needs no build service, database, API key, or server application. The repository publishes through GitHub Pages. These notes describe its configuration and the checks to use for future deployments.

- Public repository: [AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs)
- Publishing source: `main`, `/(root)`
- Custom hostname: `www.colelearninglabs.com`
- Domain registrar: Squarespace

The custom domain is configured in GitHub Pages and the DNS records below have been saved. DNS and HTTPS verification are still in progress; HTTPS enforcement has not yet been confirmed. Squarespace's previous apex forwarding rule was removed, all mail records were preserved, and Cloudflare is not enabled.

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

## Maintenance and rollback

Keep the root `CNAME` file exactly named, with a single domain and no scheme. Saving only a local file is not a substitute for configuring Pages settings. Preserve `.nojekyll`, relative asset paths, verification TXT, and unrelated mail records.

If a migration problem requires rollback, review both the `www` destination and the apex configuration as one plan. Confirm that the original Google Sites domain mapping is still present before restoring its recorded destination. Do not combine GitHub's apex A records with a restored Squarespace forwarding preset. DNS changes take time to become visible. Do not delete either site's content as part of routine cutover.

Student progress is origin-specific. Local preview, the default GitHub address, the old Google Sites address, and the custom domain do not share browser storage. Ask learners to export a report before changing the classroom entry address; no automatic migration or report import is implied.

The repository and published static files are public. Keep credentials, private student records, and confidential school material out of commits and site assets. Classroom reports are exported by learners and are not uploaded by this application.
