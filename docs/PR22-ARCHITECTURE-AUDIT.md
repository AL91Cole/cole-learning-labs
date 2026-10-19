# PR #22 architecture audit and correction

Reviewed original head `e667cf3c3781a9ba30792ad5cbdde54a91729e55` against the Chromebook remote-terminal specification. Base public-site release: PR #21, `e061bda8931deb969b5851c4572a9a6bdf64c729`.

**Conclusion:** the original PR supplied useful initial files, but its green tests did not establish the promised Docker architecture or safe teacher access. It was not a deployed backend. Corrections remain in this unmerged pull request for review and testing; the live website is unchanged.

| Requirement | Original PR #22 finding | Correction in this PR |
| --- | --- | --- |
| Actual backend Linux execution | Docker and native PTY were optional; an automatic POSIX simulator could satisfy tests. A fallback bare Alpine image lacked the prepared fixtures. | Fail closed unless the prepared Docker image and real native PTY are available. No local/host shell fallback. |
| One standards-compliant WSS connection | Handwritten frame parsing; terminal used WS, but teacher control/status used separate HTTP endpoints. | Maintained `ws` server; one native browser WebSocket multiplexes terminal, milestones, class controls and snapshots. |
| Teacher-only control and work visibility | Client could request `role: teacher`; classroom snapshots and command controls had no authorization. | Operator-provisioned teacher key, server-confirmed role, unpredictable student join code, exact owner check on each class action, deny students/other teachers. |
| Credentials and identity | Session credential in the URL; email prefix used to infer teacher role. | Credentials only in the initial socket message; no persistent browser storage. Future Google hook stays unavailable. |
| HTTPS/Origin checks | Optional HTTPS gate and missing-Origin bypass; forwarding metadata could be mistaken for proof of Cloudflare. | Explicit enablement, exact Origin, trusted ingress constraints, bounded auth window and no URL credentials. Actual TLS remains an ingress deployment step. |
| Lightweight teacher view | Terminal-text JPEG canvas existed, but auto-started and public snapshots were exposed. | Explicit revocable student opt-in, terminal-only previews, class-scoped teacher subscription, five-second minimum cadence, in-memory deletion. |
| Locally served xterm | CDN assets could fail in filtered schools. Manifest had unlocked version ranges and unused dependencies. | Exact xterm/fit/ws/PTY dependencies, committed lockfile and reviewed local vendor routes. |
| Container limits and cleanup | Several isolation flags existed, but passing fallback tests did not prove Docker behavior; races/capacity needed coverage. | Dedicated unprivileged resource-limited containers, bounded sessions/I/O, disconnect/idle/absolute expiry cleanup and genuine Docker integration tests. |
| Cloudflare routing | Template incorrectly called cloudflared outbound-443-only; no backend host was provisioned. | Correct browser-443 versus connector-7844 distinction, trusted proxy templates and explicit deployment prerequisites. |
| Existing site and private materials | Terminal scaffold was excluded from the strict public manifest. | Preserve that boundary, the closed classroom-data gate, existing export/privacy behavior, simplified controls and PR #6-style graphics. |

## Additional monitor feature

The classic hardware workbench shows authored, state-derived monitor clues for power/no signal, pre-video startup faults, firmware storage errors, boot readiness, desktop and the requested file. Symptoms reflect the actual modeled equipment and wiring. A RAM fault need not produce firmware video even when fans run. An SSD data/power problem can produce a no-boot-device screen. The model does not invent an OS corruption cause or a bootloader error absent from the equipment state, and it does not reveal the repair in the monitor message.

These are fictional educational startup screens, not a remote Windows/Linux VM. The optional Linux terminal service and browser hardware simulation are distinct experiences. No heavy 3D engine returns.

## Verification and testing

The separate terminal CI job installs the lockfile, audits runtime dependencies, builds the learner image and enables real Docker integration tests. Root public-site checks remain dependency-free and verify that service/config/credentials are excluded from the public artifact. Test fixtures use fictional data only.

Validation results and preview instructions are recorded in the pull-request description after the checks run. Do not infer a deployed terminal service from a successful Cloudflare Pages preview: Pages serves the static monitor update, not a Docker daemon or PTY host.

Local review on October 18, 2026 passed 784 public-site tests with two Windows symlink-capability skips, and all 35 isolated-terminal tests with real Docker enabled (zero skips/failures). The two real runtime tests checked an actual PTY/container and an authenticated WebSocket session through milestone completion and container deletion. The learner image and Linux controller image built successfully; the controller loaded its native PTY module. npm reported zero known vulnerabilities for the locked runtime dependencies at review time. The Windows PTY console-cleanup helper emitted an AttachConsole warning despite passing runtime assertions; the separate Linux CI job is the deployment-target check.

Browser review completed the real NET-201 terminal lab (4/4 checks), teacher creation/student joining, default-off snapshots, explicit consent and revocation, and teacher pause/resume using fictional data. The terminal viewport at 768×1024 had no horizontal overflow or visible buttons/selectors/disclosures shorter than 44px. Its instructions scroll separately so the terminal remains reachable. Hardware review checked the actual INC-104 no-boot-device screen and accessible transcript. No physical Chromebook/tablet or Microsoft Edge was connected for this review.

## Private local review follow-up

The opt-in `review:start` helper now runs the backend on this computer at `http://127.0.0.1:8080`, with four learner sessions, twelve connections, two classes and four learners per class. It generates a reusable teacher key under the private, Git/Docker-excluded `.review/` directory. Start/status/stop use authenticated local IPC and exact-instance Docker labels; they do not kill unrelated PIDs or prune other containers. Windows permissions preserve existing current-user ownership and replace only access rules, so inherited project Modify access does not require a take-ownership privilege. The default public/deployment server configuration remains disabled.

The terminal workbench has a bounded keyboard/pointer-resizable split, guide tabs and server-derived objectives. The current follow-up keeps both panes visible side by side at 720 CSS pixels and above, and stacks both on smaller screens. Section jumps and resizing refit xterm while preserving the session. Local verification passed all 55 terminal/helper/UI tests with real Docker, including thirteen private-helper tests. Browser verification completed a self-paced lab, private teacher sign-in, class joining, pause/resume, a teacher command, preview consent/revocation, and divider/tablet interactions. No hosted backend or production domain was configured. See the [local test walkthrough](../terminal-sandbox/TEST-PLAN.md).

## Shared split across all virtual labs

The `20261018-split22` source release keeps Request & clues beside Workbench & test across all 29 investigations and all five beginner labs. Desktop and tablet panes scroll independently; narrow screens stack both rather than hiding a section. Numbered investigation buttons focus sections, and Check & explain opens within the workstation pane. Beginner equipment remains visible during Explore, Practice and Check. Hardware retains the classic SVG components and guarded part/cable dragging. Initial assembly setup preserves the actual ticket fault and does not award completion.

Browser acceptance checked all 29 investigation routes at 1366×768, 768×1024 and 390×844, plus all five beginner labs in each of their three learning steps at tablet width. No page overflow or missing request/workstation pane was found. Actual HDMI dragging restored the display and the original lesson opened; the task check confirmed delivery. Unfinished coding and question drafts survived section navigation. Immediate section scrolling prevents competing animations after rapid navigation, and a missing required repair idea scrolls into view.

The terminal has a persistent server-authored Request & clues brief outside the Instructions/Your checks tabs. Browser testing verified real typed Linux output, simultaneous panes at tablet width, stacked access on a phone-sized viewport, class joining, teacher pause/resume and commands, and preview opt-in/revocation. The final terminal suite passed 55/55 with real Docker enabled. The public suite passed 817 tests locally with two Windows symlink-capability skips; the updated navigation and coding regressions also passed. Linux CI results are recorded in the PR. These are browser viewport checks, not tests on a physical managed Chromebook, tablet, Edge installation or school filtering network.

## Still required before an actual school service

The following deployment prerequisites still apply to an internet-accessible school service:

- Provision and administer a dedicated Docker host, trusted HTTPS ingress, terminal hostname, resource budget, secret delivery and maintenance/incident process. This PR does not purchase infrastructure or change DNS.
- Test the actual managed Chromebooks, tablets, Microsoft Edge and school filtering/WebSocket policy. Responsive browser checks do not certify those devices or networks.
- Replace the pilot shared teacher key with reviewed per-teacher identity/authorization before multi-school operation. Google Classroom, durable submissions and grading are not implemented by this terminal scaffold.
- Complete school privacy/security review, retention/deletion and operator-access documentation before real learner records. Server memory, host administrators and infrastructure providers can access unencrypted application data; aliases and TLS do not make it invisible to them. No universal legal-compliance, zero-risk or filter-approval claim is made.

See [service setup](../terminal-sandbox/README.md), [existing privacy release gate](PRIVACY-RELEASE-GATE.md), [Cloudflare WebSockets](https://developers.cloudflare.com/network/websockets/), [Tunnel firewall ports](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/), [Docker daemon security](https://docs.docker.com/engine/security/), and [xterm.js security](https://xtermjs.org/docs/guides/security/).
