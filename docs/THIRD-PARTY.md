# Third-party software and service boundaries

The browser simulations use HTML, CSS and authored JavaScript. They require no graphics CDN, remote font or model download. The build installs locked development tools (`acorn` and `esbuild`); these tools do not run as browser services.

Real-machine labs are a separate remote feature. The terminal service serves locked `@xterm/xterm`, `@xterm/addon-fit` and `@novnc/novnc` packages through the same-origin gateway. Its Node backend uses `ws` and `node-pty`. These packages and the learner image need ongoing vulnerability and license review; their presence does not grant permission to receive school records. Versions and integrity values are in `terminal-sandbox/package-lock.json`.

Cloudflare delivers the site and relays terminal connections. Deployment documentation uses a DigitalOcean controller and Docker Cloud Sandboxes for learner compute; the local Docker backend is another supported configuration. Verify actual provider roles, contracts, subprocessors, locations, operational logs and deletion separately. Remote machine input/files are processed outside the browser. See [real-machine design](REAL-MACHINE-LABS.md) and [student-data boundaries](STUDENT-DATA-DESIGN.md).

The separate requester Worker can invoke Cloudflare Workers AI using only fixed authored lab/topic IDs. General free-text cloud chat remains source-locked. The disabled adult membership prototype has its own dependency manifest and release requirements.

The earlier Babylon.js renderer is absent from the current public manifest. Historical engine releases remain in Git history with their licensing documentation. Removing that renderer did not remove the later real-machine dependencies or provider processing.
