# Optional remote terminal service

This is an **unmerged, disabled-by-default Docker service scaffold**, with a separate opt-in private review profile for this computer. It is separate from the browser-only labs hosted on Cloudflare Pages. A Pages preview demonstrates the PC monitor changes; it does not run this Docker service. No production DNS, hosting, classroom gate, teacher account or Google integration is changed by this pull request.

For the local backend, use the [local setup](LOCAL-TESTING.md) and [student/teacher test walkthrough](TEST-PLAN.md). Run `npm --prefix terminal-sandbox run review:start` after the prerequisites below. The helper leaves a private, loopback-only backend running and prints its URL plus a protected teacher-key file path. Use `review:status` and `review:stop` through the same npm command. The default server and production compose file remain disabled.

The terminal has a resizable guide/workspace split, Instructions and Your checks tabs, a persistent Request & clues brief, and server-derived next-step guidance. At 720 CSS pixels and above the guide and terminal stay side by side. Narrower screens stack both without hiding either; resizing refits xterm without replacing the session. The interface uses Cole Learning Labs branding and original instructions, with no CompTIA content or affiliation.

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

## Learner machine backends

`SANDBOX_BACKEND` chooses where learner machines run; everything above it (the WebSocket protocol, labs, checks, teacher view) is the same.

| Backend | Setting | Needs | Isolation |
|---|---|---|---|
| Host containers (default) | `SANDBOX_BACKEND=docker` | Docker daemon on the controller host, node-pty | `docker run` with no network, dropped capabilities, read-only root (see below) |
| Docker Cloud Sandboxes | `SANDBOX_BACKEND=cloud` | HTTPS to `hub.docker.com`, `connect.docker.com` and `*.sandboxes-cloud.docker.com`; `DOCKER_ID`, `DOCKER_PAT`; optional `SANDBOX_IMAGE_REF`, `SANDBOX_SIZE`, `SANDBOX_SEED_DIRS` | One Docker-hosted micro-VM per learner, seeded by the controller, all egress denied, deleted when the session ends |

The cloud backend (`cloud-sandboxes.js`) exchanges the personal access token for a short-lived access token, creates a sandbox from `SANDBOX_IMAGE_REF` (default `docker.io/library/python:3.13-alpine`, a public image: nothing has to be pushed to a registry) at the chosen size with `networkPolicies: [{mode: "denyAll", denyNetworks: ["**"]}]`, and waits for it to run. It then requests a five-minute endpoint credential with only `sandboxesExec` and `sandboxesFilesRead`, runs a root setup process that creates the `learner` user (uid 1000) and writes the seed tree from `SANDBOX_SEED_DIRS` (default `sandbox-seed/`, the same files `Dockerfile.sandbox` bakes in) under `/home/learner/lab`, and only then starts `/bin/sh -i` as the learner with a PTY, relayed over the endpoint's `interact` WebSocket. Lab checks read files through the endpoint's file API, limited to the paths the lab definitions name and 16 KiB each. `destroy` deletes the sandbox with the version it last observed (`If-Match`) and makes at most three attempts for version conflicts, throttling or transport failures. Failed deletion remains retryable; the controller retains a cleanup handle even after a failed start, refuses new machines while cleanup is pending, retries during its regular reaper cycle, and returns HTTP 503 with `cleanup_blocked` from `/api/health`. Only confirmed deletion releases that allocation. An HTTP 202 delete response schedules removal; the controller keeps polling for HTTP 404 before releasing it. Slow cleanup requests do not delay revocation and buffer erasure for other expired sessions. File response streams are canceled as soon as they exceed the size cap, including responses without an accurate Content-Length. Credential-bearing service and endpoint URLs must use HTTPS without URL credentials, query strings or fragments. Neither token is logged or sent to a browser.

Verified live on 2026-11-09 with the default image: learner shell as uid 1000 with a real PTY about 8.5 seconds after the create call, Python 3.13 available, seed files owned by the learner, `./check` results readable by the controller and the CODE-501 milestones verified, `/root` not writable, and no HTTP, DNS or direct-IP egress. A bare `{mode: "denyAll"}` is composed with Docker's account-level "allow `**`" layer and blocks nothing; the explicit `denyNetworks: ["**"]` is what isolates the machine. Docker's default quota is 10 concurrent sandboxes per account; ask for an increase before a class larger than that. The live smoke test `tests/cloud-live.test.js` runs when `RUN_CLOUD_TESTS=1` and the cloud settings are present.

### Desktop view and the lab catalog

With the cloud backend the default view is a **graphical Linux desktop** (`SANDBOX_VIEW=desktop`; `terminal` keeps the shell-only view). The machine starts from a public LXDE desktop image (`DESKTOP_IMAGE_REF`, Ubuntu 20.04 with a file manager, a text editor and a terminal) at `DESKTOP_SIZE` (small: 2 CPU, 4 GiB) with every network denied. The controller waits for the image's `learner` account, removes its administrator rights, writes the lab's files into `~/lab`, opens the lab folder and a terminal on the desktop, and publishes the machine's screen bridge. The machine's screen address never reaches the browser: `session:ready` carries a session-scoped ticket and the session's screen password, the browser opens `wss://<site>/terminal/desktop` with the ticket in the WebSocket subprotocol, and the controller relays frames between that socket and the machine. The desktop is created at the size of the learner's lab area (reported in `session:start`, clamped to 800x480 through 1600x1000), so text is full size on an 11-inch Chromebook as well as on a large monitor. The browser's screen client is noVNC (MPL-2.0), served from `/vendor/novnc/` as same-origin modules.

Lab checks work the same in both views. On a desktop the learner types in the machine's own terminal, so `history_regex` checks read a short file of recent commands that the machine's shell keeps (`~/.lab-history`); file checks read the lab files as before.

The catalog has the four hand-written labs plus a real-machine version of every other networking, security and coding lab, generated from the site's lab models by `scripts/generate-labs.mjs` into `generated-labs.js` (run the script after changing a lab on the site; a test fails when the file is stale). A generated lab carries its own files, which replace the shared seed tree for that session on both backends. Five beginner Linux labs (`linux-labs.js`, ids `LNX-101` to `LNX-105`) teach the desktop and the command line; they ship a small progress checker (`.lab-check.sh`) that the seed script runs every two seconds so steps done in the file manager count too.

### The learner desktop image (`desktop/`)

`desktop/Dockerfile` builds the desktop learners see: **Ubuntu 24.04 LTS with XFCE** (the desktop of Xubuntu and Linux Mint XFCE), pinned by digest. It replaces the unmaintained Ubuntu 20.04 LXDE image and keeps its start contract (`/startup.sh` reading `USER`, `PASSWORD`, `VNC_PASSWORD` and `RESOLUTION`, the screen WebSocket on port 6081), so the controller only needs `DESKTOP_IMAGE_REF` pointed at it.

- **An ordinary Linux computer.** Menu in the bottom-left corner, taskbar, two workspaces, Thunar file manager, Xfce Terminal, Mousepad, task manager, screenshots, calculator, image viewer and archive manager. The command line has what a fresh install has: manual pages (`man`, restored from the minimised base), tab completion, `less`, `nano`, `vim`, `git`, `tree`, `htop`, `ping`, `dig`, `ip`, `ssh`, `python3` with `pip` and `venv`, `gcc`, `make`, `sqlite3`, `jq` and `curl`. `help-lab` in a terminal prints a few tips. Ctrl+Alt+T, Super (the menu), Super+E, Alt+F2, Ctrl+Shift+Esc and Print work as on Xubuntu.
- **Never an administrator.** The learner (uid 1000) belongs to no administrator group; `sudo` asks for a password nobody has and then reports the learner is not in the sudoers file, as on a school computer. The screen server and the whole desktop run as the learner; only the start script runs as root.
- **The screen follows the browser.** TigerVNC accepts desktop-size requests, so the desktop resizes with the learner's window instead of being scaled (down to 800x480; smaller areas keep that size and are scaled). The clipboard is shared both ways, and the clock follows the learner's time zone (`TZ`, sent by the browser and checked against a strict pattern and the zone database).
- **Checks.** `sh desktop/smoke-test.sh [image]` starts the image the way the host backend does (no network, capabilities dropped, no-new-privileges) and checks the account, the screen relay, the tools, manual pages, `TZ` and the absence of network. `.github/workflows/desktop-image.yml` builds and smoke-tests it on every change and publishes it from `main`: to Docker Hub as `docker.io/<account>/cole-learning-labs-desktop:noble-<commit>` when the repository has a `DOCKERHUB_TOKEN` secret (Docker Cloud Sandboxes start images from Docker Hub only: `docker.io` and `dhi.io`), and as `ghcr.io/<owner>/cole-learning-labs-desktop:noble-<commit>`. It builds without attestations so the only manifest pushed carries the `org.opencontainers.image.source` label that connects the package to this repository; if the registry still answers `denied`, the run summary says how to connect the package.

Build it locally with `docker build -t cole-learning-labs/desktop:noble terminal-sandbox/desktop` (behind an HTTPS-only proxy, the Dockerfile's header shows the extra build arguments; nothing from them stays in the image).

**Desktops on the host-container backend.** `SANDBOX_BACKEND=docker` with `SANDBOX_VIEW=desktop` starts desktops from `DESKTOP_IMAGE` (default `cole-learning-labs/desktop:noble`) on the controller's own Docker host. This is how the whole desktop experience can be tested on one computer. A desktop container has no network at all; the controller reaches the screen through `docker exec -i <machine> cll-vnc-relay` (raw VNC over standard input and output, run as `nobody`), so nothing listens on a port. It starts as root with only `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETUID`, `SETGID`, `KILL` and `AUDIT_WRITE` (for creating the account and starting the desktop as the learner) and `no-new-privileges`, 2 GiB memory, 1.5 CPU, 512 processes and the usual lifetime limit.

**Text terminal.** On a desktop machine (either backend) the browser can also open a text terminal: `terminal:open` starts a login shell as the learner in `~/lab` on the same machine, relayed like the shell-only view (`terminal:opened`, `terminal:output`, `terminal:closed`). It uses xterm.js with screen-reader support, for learners who cannot use the graphical screen. Commands typed there count for the lab checks.

### Operating a deployed controller

When a machine cannot start, the learner sees only "sandbox unavailable"; the controller logs the lab and a fixed failure code without provider message text, for example `Machine start failed for CODE-501: cloud_auth_failed` (read it with `docker logs` on the controller container). `server-tools/set-docker-token.sh` replaces the Docker access token on the host: the token is entered hidden, checked with Docker before anything changes, and refused with the reason if Docker does not accept it. `set-docker-token.sh --check` tests the token that is saved now without changing it.

A `sandbox_cleanup_failed` event requires operator attention. Keep the controller running while fixing API access so its retained cleanup handles can retry. Check the Docker account for machines labeled `io.colelearninglabs.terminal=1`, verify ownership and age, and delete confirmed orphaned lab machines after a controller crash or restart. The retry queue is in memory, so a process or host failure still requires this reconciliation; do not treat a browser disconnect as proof of provider deletion. Confirm account-level retention, snapshots and backup behavior with Docker before using real student data. Alert on failed controller health checks and fixed cleanup events without collecting terminal contents.

## Student and teacher flow

Students explicitly start an anonymous self-paced container, or join a teacher-generated classroom code. The server assigns a random alias and an ephemeral socket session; no student name, email, ID or Google login is requested. The class code grants only student membership. It never grants teacher privileges.

A teacher explicitly selects the teacher view and authenticates with the provisioned key over the first WebSocket message. The server creates an unpredictable class code and restricts subscription/control to that teacher connection's own classrooms. Students cannot issue teacher messages; a second teacher cannot inspect another connection's class even if it knows the class code. This initial shared-key setup is for an operator-controlled pilot, not multi-school identity management. Tokens/keys stay out of URL query strings and persistent browser storage. Reconnecting creates a fresh session; there is no durable resume or gradebook.

The teacher sees aliases, milestone status and optional **terminal-only** JPEG previews. Students must explicitly enable previews after joining a class; they start off, can be revoked, and are cleared on leave/disconnect/expiry. A preview is a canvas drawing of lab terminal text, not the student's device screen, other tabs, webcam or microphone. It uses a maximum 640×360 image at JPEG encoder quality `0.1`, at most once per five seconds. This quality setting is **not a promise of a 90% bandwidth reduction**. There is no continuous video or screen-capture permission. Avoid real personal information in terminal text: an alias does not remove information a student types. The learner preview toggle does not establish COPPA parental consent or school authorization. Those approvals and applicable school agreements must be verified separately before processing student information. Teacher pause is enforced on the server for both terminal and desktop input. Pausing closes the desktop stream and refuses reconnects; after the teacher resumes, the desktop client must reconnect using its existing session ticket. Closing the stream avoids dropping opaque RFB protocol frames during negotiation or updates.

Milestones inspect bounded files and observed input on the server. These are guided practice checks, not tamper-proof assessment or proof of independent authorship. Google Workspace OAuth is a future adapter only: it fails closed until verified identity, teacher provisioning, district policy, and privacy requirements are separately implemented. An email prefix, unverified JWT or client-selected role can never establish teacher access.

## Isolation, limits and lifecycle

Every learner uses the prepared image as UID/GID 1000, with 512 MiB memory and swap ceiling, 0.5 CPU, a PID limit, dropped capabilities, no-new-privileges, read-only root, bounded tmpfs workspace, and no container network. No public Internet scans or real school network changes occur; configuration files are instructional fixtures.

The service bounds active/pending sessions, connections, messages, input, output and snapshots. The initial host budget is 24 active learners, 48 connections, and 120 upgrades per minute per direct peer. Behind one reverse proxy, that upgrade allowance is shared by the class; it is not per-student protection. Tune the explicit ingress budget for a reviewed host capacity, and add a trusted visitor-identity limiter at the ingress before a public-scale rollout. Arbitrary forwarded client headers are never used as identity. Heartbeats and automatic screenshots do not count as learner activity. Containers are removed on socket close, failed startup, shell exit, teacher class teardown, server shutdown, five-minute learner inactivity, or the absolute session lifetime. Work is ephemeral and is not a persistent student submission service.

Containers share a kernel. These flags do not make an untrusted multi-tenant public shell universally safe. Before broader use, verify host isolation, patching, capacity, incident handling, orphan cleanup after host failure, backups/deletion policy and school-approved data processing. The existing public site's student-data release gate stays closed.

## Cloudflare routing

The public site reaches the controller same-origin through its Pages Function gateway (`functions/terminal/[[path]].js`), which relays `/terminal/ws`, `/terminal/api/health`, `/terminal/api/labs` and `/terminal/vendor/*` to `TERMINAL_ORIGIN` and refuses everything else. Publish the controller behind that origin with a Cloudflare Tunnel whose connector runs beside the controller (the private repository's `deploy/docker-compose.cloud.yml` and `deploy/VPS-SETUP.md`); the connector's address is the controller's `TRUSTED_PROXY_ADDRESSES` entry and it forwards `X-Forwarded-Proto: https`. The site enables the real machines only when `/terminal/api/health` answers `status: "enabled"`.


Two templates are supplied: `cloudflare/nginx-cloudflare-ws.conf` for a TLS origin behind the Cloudflare proxy, and `cloudflare/cloudflared-config.yml` for an optional outbound connector. Select and test one trusted ingress route; do not expose the controller directly. Production must require an exact HTTPS Origin and trust forwarding headers only from the configured local proxy. Cloudflare headers by themselves are not authentication.

Use an origin certificate, Cloudflare **Full (strict)**, an exact hostname, WebSocket upgrades and suitable idle timeouts. Do not add the terminal backend to the existing Pages `_routes.json`, relax its CSP, change `www`, or expose Docker port 2375. A separately reviewed terminal hostname/host deployment is still required. The supplied templates do not provision it.

Student browsers connect only over 443. In contrast, an optional `cloudflared` connector on the **server host** requires outbound TCP/UDP 7844; it is not an outbound-443-only tunnel. If the host cannot allow that, use a properly restricted HTTPS reverse-proxy origin instead. Schools may still require an allowlist and WebSocket approval; HTTPS does not override district filters.

Cloudflare's WAF checks the initial WebSocket upgrade, not subsequent frames; application authorization, limits and heartbeat handling remain necessary. Connections may close during network or edge restarts; reconnect is explicit and does not promise that ephemeral work survives.

The terminal service permits runtime CSS style elements because xterm creates them for its cell geometry and theme. Scripts remain same-origin only, with no inline script or eval allowance. The main website's CSP is unchanged.

Primary references: [Cloudflare WebSockets](https://developers.cloudflare.com/network/websockets/), [Tunnel firewall requirements](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/), [Docker security](https://docs.docker.com/engine/security/), [xterm.js security](https://xtermjs.org/docs/guides/security/).
