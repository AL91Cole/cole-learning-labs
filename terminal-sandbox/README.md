# Optional remote terminal service

This is an **unmerged, disabled-by-default Docker service scaffold**. It is separate from the browser-only labs hosted on Cloudflare Pages. A Pages preview demonstrates the PC monitor changes; it does not run this Docker service. No production DNS, hosting, classroom gate, teacher account or Google integration is changed by this pull request.

See [the PR #22 architecture audit](../docs/PR22-ARCHITECTURE-AUDIT.md) for the original shortcomings, verification evidence and remaining deployment work.

## Architecture

```text
School browser -- HTTPS/WSS :443 --> Cloudflare --> trusted reverse proxy
                                                    |
                                             private :8080 service
                                                    |
                                               Docker + node-pty
                                                    |
                                    one unprivileged container per learner
```

The browser renders local xterm.js assets, Markdown instructions, and a teacher view. Linux commands and file checks execute in backend containers. Terminal input/output, resizing, milestone requests, classroom creation/joining, pause/resume, teacher commands and optional snapshots share **one native WebSocket per client** at `/ws`. There are no browser connections to SSH, VNC, RDP or a Docker port. Public HTTPS uses port 443; the service's private HTTP port must never be publicly reachable.

The existing main site's authored hardware/AI/coding simulations remain local browser models. They are not Linux virtual machines, and this optional backend does not silently replace them.

## Setup for fictional-data testing

Use an administrator-controlled Linux Docker host or Docker Desktop with Linux containers, Node 24, and the native build prerequisites for node-pty (Linux: Python, make and a C++ compiler).

```sh
npm ci --prefix terminal-sandbox
docker build -f terminal-sandbox/Dockerfile.sandbox -t cole-learning-labs/sandbox:alpine terminal-sandbox
npm test --prefix terminal-sandbox
```

To include the **real** container/PTY integration tests, set `RUN_DOCKER_TESTS=1` when running the last command. The separate GitHub Actions terminal job enables these tests. They are not part of the dependency-free public-site build.

The service requires an explicit `SANDBOX_ENABLED=true`. To test teacher functions, an operator must also provision a random `TEACHER_ACCESS_KEY` of at least 32 characters through the environment; never commit it, put it in a URL, or share it with students. Copy `.env.example` to an ignored `.env` inside `terminal-sandbox`, configure it, then run `node --env-file=.env server.js` from that directory (Node does not automatically load the file). For local-only testing set `ALLOW_INSECURE_LOCALHOST=true` and `ALLOWED_ORIGINS=http://127.0.0.1:8080`. Local development binds to loopback; open `http://127.0.0.1:8080`. A disabled service can serve instructions but refuses WebSocket sessions. An unavailable Docker engine, missing prepared image or missing native PTY produces an unavailable session, **never a simulated shell or a host shell**.

For a containerized controller, build using `docker compose build`. Configure the required environment and Docker socket path before starting it. The operator-facing controller needs Docker daemon access; this is powerful host access. Use a dedicated lab host/VM with no school production workloads, preferably a correctly configured rootless engine with enforced cgroup limits. Student containers must never receive the Docker socket, host mounts, controller secrets or host environment. The controller's access is not a claim of VM-grade tenant isolation.

## Student and teacher flow

Students explicitly start an anonymous self-paced container, or join a teacher-generated classroom code. The server assigns a random alias and an ephemeral socket session; no student name, email, ID or Google login is requested. The class code grants only student membership. It never grants teacher privileges.

A teacher explicitly selects the teacher view and authenticates with the provisioned key over the first WebSocket message. The server creates an unpredictable class code and restricts subscription/control to that teacher connection's own classrooms. Students cannot issue teacher messages; a second teacher cannot inspect another connection's class even if it knows the class code. This initial shared-key setup is for an operator-controlled pilot, not multi-school identity management. Tokens/keys stay out of URL query strings and persistent browser storage. Reconnecting creates a fresh session; there is no durable resume or gradebook.

The teacher sees aliases, milestone status and optional **terminal-only** JPEG previews. Students must explicitly enable previews after joining a class; they start off, can be revoked, and are cleared on leave/disconnect/expiry. A preview is a canvas drawing of lab terminal text, not the student's device screen, other tabs, webcam or microphone. It uses a maximum 640×360 image at JPEG encoder quality `0.1`, at most once per five seconds. This quality setting is **not a promise of a 90% bandwidth reduction**. There is no continuous video or screen-capture permission. Avoid real personal information in terminal text: an alias does not remove information a student types.

Milestones inspect bounded files and observed input on the server. These are guided practice checks, not tamper-proof assessment or proof of independent authorship. Google Workspace OAuth is a future adapter only: it fails closed until verified identity, teacher provisioning, district policy, and privacy requirements are separately implemented. An email prefix, unverified JWT or client-selected role can never establish teacher access.

## Isolation, limits and lifecycle

Every learner uses the prepared image as UID/GID 1000, with 512 MiB memory and swap ceiling, 0.5 CPU, a PID limit, dropped capabilities, no-new-privileges, read-only root, bounded tmpfs workspace, and no container network. No public Internet scans or real school network changes occur; configuration files are instructional fixtures.

The service bounds active/pending sessions, connections, messages, input, output and snapshots. The initial host budget is 24 active learners, 48 connections, and 120 upgrades per minute per direct peer. Behind one reverse proxy, that upgrade allowance is shared by the class; it is not per-student protection. Tune the explicit ingress budget for a reviewed host capacity, and add a trusted visitor-identity limiter at the ingress before a public-scale rollout. Arbitrary forwarded client headers are never used as identity. Heartbeats and automatic screenshots do not count as learner activity. Containers are removed on socket close, failed startup, shell exit, teacher class teardown, server shutdown, five-minute learner inactivity, or the absolute session lifetime. Work is ephemeral and is not a persistent student submission service.

Containers share a kernel. These flags do not make an untrusted multi-tenant public shell universally safe. Before broader use, verify host isolation, patching, capacity, incident handling, orphan cleanup after host failure, backups/deletion policy and school-approved data processing. The existing public site's student-data release gate stays closed.

## Cloudflare routing

Two templates are supplied: `cloudflare/nginx-cloudflare-ws.conf` for a TLS origin behind the Cloudflare proxy, and `cloudflare/cloudflared-config.yml` for an optional outbound connector. Select and test one trusted ingress route; do not expose the controller directly. Production must require an exact HTTPS Origin and trust forwarding headers only from the configured local proxy. Cloudflare headers by themselves are not authentication.

Use an origin certificate, Cloudflare **Full (strict)**, an exact hostname, WebSocket upgrades and suitable idle timeouts. Do not add the terminal backend to the existing Pages `_routes.json`, relax its CSP, change `www`, or expose Docker port 2375. A separately reviewed terminal hostname/host deployment is still required. The supplied templates do not provision it.

Student browsers connect only over 443. In contrast, an optional `cloudflared` connector on the **server host** requires outbound TCP/UDP 7844; it is not an outbound-443-only tunnel. If the host cannot allow that, use a properly restricted HTTPS reverse-proxy origin instead. Schools may still require an allowlist and WebSocket approval; HTTPS does not override district filters.

Cloudflare's WAF checks the initial WebSocket upgrade, not subsequent frames; application authorization, limits and heartbeat handling remain necessary. Connections may close during network or edge restarts; reconnect is explicit and does not promise that ephemeral work survives.

The terminal service permits runtime CSS style elements because xterm creates them for its cell geometry and theme. Scripts remain same-origin only, with no inline script or eval allowance. The main website's CSP is unchanged.

Primary references: [Cloudflare WebSockets](https://developers.cloudflare.com/network/websockets/), [Tunnel firewall requirements](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/), [Docker security](https://docs.docker.com/engine/security/), [xterm.js security](https://xtermjs.org/docs/guides/security/).
