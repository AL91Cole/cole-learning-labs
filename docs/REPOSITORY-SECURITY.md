# Repository security and release operations

Owner: Alan Cole / `AL91Cole`. This document describes source controls and the settings to verify for each release. It is not an independent penetration test, security certification, legal approval, or a guarantee against compromise. Review [the disclosure policy](../SECURITY.md) and [the classroom privacy release requirements](PRIVACY-RELEASE-GATE.md).

## Controls defined in source

- The security workflow runs syntax and privacy/simulation tests, builds the publish artifact, and runs CodeQL for JavaScript and GitHub Actions. It uses GitHub-hosted runners, explicit timeouts, read-only default token permissions, and immutable commit pins for official actions. Only the CodeQL job receives the security-event write permission needed to upload results. Do not substitute untrusted `pull_request_target` execution or expose secrets to contribution builds.
- Dependabot configuration checks GitHub Actions weekly. The application currently has no third-party runtime packages. Reassess dependency and license risks before adding one; automation cannot establish that a package is trustworthy.
- The build constructs a permitted public-file artifact in `dist`. Source documents, tests, development scripts, and migrations are not website assets. Cloudflare compiles the separate repository-root `functions` directory; it must not be copied into static assets. Confirm the actual Pages output directory and deployed responses, because a source build does not change hosting settings by itself.
- Response policies restrict resource origins, framing, device permissions, and caching. Production classroom requests remain blocked before configuration, database, or identity-key access. Passing tests does not approve opening that gate.
- `CODEOWNERS` identifies `AL91Cole` as the responsible maintainer. With one maintainer, ownership requests and pull requests do not constitute independent review. Seek a separate qualified reviewer for sensitive changes.

The stable CI check names are **Syntax, privacy, and simulation tests**, **CodeQL (javascript-typescript)**, and **CodeQL (actions)**. Require successful results for the proposed commit, not an earlier run or an unrelated branch. Scheduled scanning supplements pull-request checks; it does not replace them.

## To verify in GitHub settings

The table below is an operator checklist, not evidence that these settings are enabled. Record actual settings and check results when configuring or reviewing the repository.

| Setting | Intended protection and verification |
| --- | --- |
| Private vulnerability reporting | Enable the private report channel and confirm the Security tab exposes it. A `SECURITY.md` file alone does not enable reporting. |
| Secret scanning and push protection | Enable available repository protections and review findings privately. Recognized-pattern scanning can miss secrets; never deliberately commit a credential to test production. |
| Dependabot alerts and security updates | Enable available alerts and update proposals. Review update diffs, check results, and release notes before merging. |
| Code scanning | Confirm both advanced CodeQL analyses complete on `main` and report findings. Avoid a duplicate default workflow when the checked-in workflow is active. |
| Actions permissions | Restrict allowed actions to the required trusted publishers; require immutable action pins where available. Keep default workflow permissions read-only and workflow permission to approve pull requests disabled. Review contributions from outside collaborators before permitting their workflows to run. |
| Main branch rules | Require a pull request and the named checks, require the branch to be current, and block force pushes and deletion. Select GitHub Actions as the check source when supported. Do not claim independent approval when there is no second reviewer; do not impose an approval or signing requirement that cannot be satisfied. Review bypass access explicitly. |
| Deployment integration | Keep the Cloudflare GitHub app restricted to the intended repository. Verify the production branch is `main`, the checked build command runs, and only `dist` is published as static content. Review preview access and retain the classroom gate in previews. |
| Maintainer access | Use a passkey or strong MFA, protect recovery methods, remove unused collaborators/apps/keys, and review active sessions. Account controls require separate verification and are not established by repository files. |

GitHub documents [repository security settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository), [secure Actions use](https://docs.github.com/en/actions/reference/security/secure-use), and [ruleset options](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets). Recheck supported controls when GitHub changes its interface or plan features.

## Configuration checkpoint — October 16, 2026

GitHub settings showed private vulnerability reporting, dependency graph, Dependabot vulnerability and malware alerts, and Dependabot security update proposals enabled. Secret scanning and push protection were already enabled. Actions were restricted to this owner's repositories and GitHub-authored actions, with full-length SHA pins required. Default workflow permissions were read-only, Actions pull-request creation/approval permission was off, and every external contributor's fork workflow required approval.

The active **Protect main releases** ruleset targets the default branch `main`, with no bypass actors. It requires a pull request, resolved conversations, linear history, current branches, and the three named checks from **GitHub Actions**. Force pushes and branch deletion are blocked. Required approvals are zero because the current maintainer cannot independently approve their own change; this does not establish independent review. Both CodeQL jobs and all 125 tests passed on the security pull request. Recheck results after any new commit.

Cloudflare's build command and `dist` output were saved and verified in a successful security preview. That preview passed all 125 tests, retained the closed production API entry, and excluded development file contents. Source-only URLs may return the homepage through Cloudflare's fallback. The custom-domain production deployment must be verified after merging; preview success alone is insufficient.

## Release procedure

1. Keep credentials and real school records out of source, branches, issues, previews, build logs, and test fixtures. Use synthetic examples. Check the proposed diff for unintended files and permission changes.
2. Submit a focused pull request. Run `npm run check`, `npm test`, and `npm run build` with the supported Node version. Review all required check results and code-scanning findings. A failed, skipped, missing, or stale check needs explanation and resolution before release.
3. Review changes to workflows, hosting headers, authentication, classroom ownership, exports, and the production privacy gate with particular care. Changing collection or processing requires reopening the documented privacy review; routine deployment approval is insufficient.
4. Merge the reviewed commit and confirm Cloudflare deploys that revision successfully. Verify the canonical HTTPS site, response policies, representative labs, and the production API's closed-gate response. Check that development/source-only files are not served as static content. Use fictional data for verification.
5. Record the deployed commit, results, limitations, and any follow-up owner. Revert a defective release to a known reviewed version, then verify its actual responses. Do not disable TLS validation, DNSSEC, or the privacy gate to make a deployment pass.

## Incident handling

1. **Contain and preserve.** Stop the affected feature or deployment when needed, preserve relevant commit/deployment and access evidence with restricted access, and avoid copying private data into public collaboration tools. Do not erase evidence during cleanup.
2. **Revoke and investigate.** Revoke exposed credentials at their issuing service, end affected sessions, review app/collaborator access and logs, and determine which data and users may be affected. Removing a secret from the latest commit does not revoke it or remove earlier copies.
3. **Coordinate notices.** The accountable operator must assess applicable school contracts and legal reporting duties promptly, with the school's authorized contacts and qualified advice where needed. Follow the existing privacy release requirements and incident guidance; do not wait for proven theft before assessing unauthorized access.
4. **Repair and verify.** Fix the cause, add a meaningful regression check where appropriate, review the change, redeploy, and verify containment and authorization boundaries. Document recovery and corrective actions privately where they contain sensitive information.

The focused source review supporting this hardening is a limited review of the present code and selected local patterns. It is not a full Git-history secret audit, infrastructure audit, adversarial penetration test, or completed school security program. Broader independent testing and ongoing operations remain necessary before stronger assurances can be made.
