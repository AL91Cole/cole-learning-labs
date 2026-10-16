# Security policy

Cole Learning Labs supports the current `main` branch and the current production deployment. Older commits and preview deployments are not supported releases. Security fixes should be applied to `main` and verified in production.

## Report a vulnerability privately

Open the repository's [Security advisories](https://github.com/AL91Cole/cole-learning-labs/security/advisories) and choose **Report a vulnerability**. This private channel depends on GitHub private vulnerability reporting being enabled. If that option is unavailable, do not put exploit details or private information in a public issue while a private channel is being established. No security contact email is currently published.

Include the affected page or source file, a concise description, impact, and the smallest reproducible example using fictional accounts and synthetic data. Include the commit or deployment you tested and any relevant browser behavior. Redact credentials, tokens, cookies, personal information, and school records from screenshots, logs, and attachments. Never submit actual student work as evidence.

Do not open a public issue or pull request that exposes an unpatched vulnerability, a working attack against production, or confidential evidence. Keep findings private while the maintainer investigates and coordinates a fix. Acknowledgment, remediation timing, and disclosure will depend on the finding; this project does not promise a response deadline or operate a bug bounty.

## Testing boundaries

Inspect public source and reproduce suspected issues in a local copy with fictional data. Written authorization is required before probing production accounts, infrastructure, or other people's systems. Do not attempt to access another person's records, bypass access controls on the live service, scan school networks, disrupt availability, or upload malicious material. This policy does not grant permission for those activities.

The production classroom API is deliberately locked pending privacy release review. Do not change or bypass that gate to test with real students, teachers, or records. See [Privacy release requirements](docs/PRIVACY-RELEASE-GATE.md).

## Security expectations

Automated checks, code scanning, HTTPS, and provider protections reduce specific risks; they do not prove that a system is free of vulnerabilities or legally approved for every school. Report suspected weaknesses even when automated checks pass. The maintainer owns investigation, containment, fixes, deployment verification, and any applicable notifications.
