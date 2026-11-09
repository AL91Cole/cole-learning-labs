# Real-machine labs (option 4)

The guided labs run on a simulated desktop by default and cost nothing to host.
When labs become paid, the same guide can put a **real Linux machine** beside
it: an isolated container per learner, served by the terminal service in
`terminal-sandbox/`, with the service verifying each lab check by reading the
learner's files. This document describes what exists, how to switch it on, what
it costs, and what is still to do before charging.

## What is built

- **Browser side (this repository, public).**
  `src/lab-remote.js` registers the `remote-terminal` environment provider.
  It renders a Start machine / Check my work / Stop bar, a terminal pane and
  the lab's checks; loads xterm.js from the service; and falls back to a plain
  text terminal if xterm cannot load. `src/lab-remote-client.js` speaks the
  service's WebSocket protocol (`auth` → `session:start` → `terminal:*`,
  `milestone:verify`, `milestone:status`). Only the lab id, keystrokes,
  terminal sizes and verify requests are sent. `src/lab-environment-config.js`
  chooses the environment and lists which labs the service hosts; labs that
  are not listed fall back to the simulated desktop.
- **Guide integration.** In a real-machine lab, Section 1's steps are the
  service's milestones, checked off when the service verifies them; the
  original-task check, the notebook and Finish lab use the service's verified
  result instead of the simulated workspace (`workbenchProgress` accepts a
  `remote` result). The Lab Log records when the machine starts, when a check
  is requested and when every check passes.
- **Service side (`terminal-sandbox/`, move to a private repository when labs
  are paid).** Labs hosted today: NET-201 (DNS repair), SEC-402 (log
  correlation and port containment) and CODE-501 (real Python: fix
  `program.py`, run `./check` until `ALL_FIXTURES_PASS`). The sandbox image now
  includes `python3`, `nano` and the seeded `~/lab/code` folder.

## Switching it on

1. Deploy the terminal service (see `terminal-sandbox/README.md`): build the
   sandbox image, run the controller with `SANDBOX_ENABLED=true`, and set
   `ALLOWED_ORIGINS` to the site origin (for example
   `https://colelearninglabs.com`).
2. Reach it **same-origin** so the site's Content-Security-Policy stays as it
   is: route `https://<site>/terminal/*` to the service (Cloudflare route or
   tunnel; the private repository's `deploy/` folder has the configurations and
   `terminal-sandbox/cloudflare/` has placeholder templates), so the
   WebSocket is `wss://<site>/terminal/ws` and xterm loads from
   `/terminal/vendor/xterm/`. A separate origin also works, but then that
   origin must be added to `script-src`, `style-src` and `connect-src` in
   `_headers`, and `tests/repository-security.test.js` updated to allow it.
3. In `src/lab-environment-config.js` set `environment: 'remote-terminal'`,
   `remote.base` to the path or origin, and `remote.labs` to the labs the
   service hosts. Redeploy the site.

## Cost at your schedule

At 20 to 30 students, two classes a day, four days a week, one week every two
months (about 160 to 240 student-hours per active week, six weeks a year):

| Compute | Per active week | Per year | $250 Docker credit lasts |
|---|---|---|---|
| Micro (about $0.07/h) | $11 to $17 | $67 to $101 | 2.5 to 3.7 years (credit expires May 2027) |
| Small (about $0.14/h) | $22 to $34 | $134 to $202 | 1.2 to 1.9 years |

Idle weeks cost nothing on per-second sandboxes. A 16 GB always-on VPS for 30
concurrent learners would be $30 to $50 a month; renting it hourly only for
active weeks is $8 to $10 a week.

## Docker Cloud Sandboxes backend

The controller has two learner-machine backends, chosen with
`SANDBOX_BACKEND`:

- `docker` (default): containers on the controller's own host through the
  Docker socket, as before.
- `cloud`: one **Docker Cloud Sandbox** per learner through Docker's Sandboxes
  API (`terminal-sandbox/cloud-sandboxes.js`). The controller needs no Docker
  daemon, only outbound HTTPS to `hub.docker.com` and `connect.docker.com`, so
  it can run on any small host or even a laptop during a pilot.

How a cloud session works: the personal access token (`DOCKER_ID`,
`DOCKER_PAT`, with "Allow Cloud Sandboxes access") is exchanged for a
short-lived access token and cached; the sandbox is created from
`SANDBOX_IMAGE_REF` (default: the public `python:3.13-alpine` image, so nothing
has to be pushed to a registry) at `SANDBOX_SIZE` (micro by default) with every
network denied and labels naming the lab and session; the controller waits for
`running`, requests a five-minute endpoint credential limited to running
processes and reading files, runs a root setup step that creates the `learner`
user and writes the lab seed files from `SANDBOX_SEED_DIRS` (the public sample
seed by default, plus the private repository's seed for paid labs), then starts
the learner's `/bin/sh -i` as uid 1000 with a PTY and relays keystrokes, output
and resizes over the endpoint's WebSocket. Lab checks read only the files the
lab definitions name, at most 16 KiB each. Ending the session deletes the
sandbox (`DELETE` with the observed version in `If-Match`, retried once if the
version moved), and a start that fails part-way deletes whatever it created.
Tokens are never logged or sent to the browser.

Verified live (2026-11-09): learner shell as uid 1000 with a real PTY about
8.5 seconds after the create call, Python available, seed files in place,
`./check` output read and the CODE-501 milestones verified by the controller,
`/root` not writable, and no HTTP, DNS or direct-IP egress from the machine. One
finding shaped the code: Docker composes an inline `denyAll` policy with the
account's default "allow everything" layer, so only an explicit
`denyNetworks: ["**"]` isolates the machine; the adapter always sends it.

Setting it up:

1. Create a Docker personal access token with "Allow Cloud Sandboxes access"
   and store it in the deployment's secret store, never in a file or URL.
2. Set `SANDBOX_BACKEND=cloud`, `DOCKER_ID` and `DOCKER_PAT`; the controller
   refuses to start with either missing. Optional: `SANDBOX_SIZE`,
   `SANDBOX_IMAGE_REF` (any public image with a POSIX shell, `adduser` or
   `useradd`, and the tools the labs need), `SANDBOX_SEED_DIRS`
   (colon-separated; add the private repository's seed for paid labs) and
   `SANDBOX_START_COMMAND` (JSON array) for an image that needs its entrypoint.
   The controller needs no Docker socket in this mode; the private repository's
   `deploy/docker-compose.cloud.override.yml` drops it.
3. Smoke-test once on your own computer:
   `RUN_CLOUD_TESTS=1 npm test --prefix terminal-sandbox` with the same
   settings in the environment starts one micro sandbox, checks the learner
   user, the PTY, a lab file and the absence of network, and deletes it (a cent
   or so of compute).
4. Ask Docker to raise the default quota of 10 concurrent sandboxes before a
   class of 20 to 30; measured cold start was about 8.5 seconds including
   seeding.
5. Host the controller where the site can reach it same-origin (see
   "Hosting the controller" below); the site switches to it on its own once
   the health check answers `enabled`.

## Hosting the controller (set up)

The site is wired for the real machines already:

- **Gateway.** `functions/terminal/[[path]].js` is a Cloudflare Pages Function
  that relays `https://<site>/terminal/*` (the WebSocket, the health and lab
  listings, the xterm assets) to the controller named by `TERMINAL_ORIGIN`,
  forwarding only the headers the controller needs and never cookies. The
  browser stays same-origin, so the Content-Security-Policy is unchanged.
  Production sets `TERMINAL_ORIGIN=https://terminal.colelearninglabs.com` in
  `wrangler.jsonc`; previews leave it unset and the gateway answers 503.
- **Automatic switch.** `src/lab-environment-config.js` names
  `remote-terminal`, but the provider only takes a lab when the service's
  health check has answered `status: "enabled"` (`probeRemoteService` in
  `src/lab-remote.js`, run once per page load). Until the controller is
  deployed, or whenever it is down, every lab keeps the simulated desktop. No
  site deploy is needed on the day the server goes live.
- **Server kit.** The private repository's `deploy/VPS-SETUP.md` walks through
  the one-time setup: a $4 to $6 a month VPS, `deploy/docker-compose.cloud.yml`
  (controller plus Cloudflare Tunnel connector on a private network, no Docker
  socket, nothing listening on the server) and `deploy/.env.production`. The
  tunnel publishes the controller as `terminal.colelearninglabs.com`; the
  connector is the controller's only peer and is the trusted proxy that
  forwards `https`. `terminal-sandbox/private-content.example/deploy/` holds
  the same kit with placeholders.

## Before charging (remaining work)

- Author real-machine lab definitions and seed files for the other guided
  labs you want to sell (each is a `SELF_PACED_LABS` entry plus seed files in
  `Dockerfile.sandbox` and a milestone test).
- Decide how paid access is granted (the prepared membership service), and
  gate `environment: 'remote-terminal'` or the service's `ALLOWED_ORIGINS`
  accordingly.
- Pilot one class on the Docker credit with `SANDBOX_BACKEND=cloud`: confirm
  the raised quota lets 30 sandboxes start at the top of a period, and watch
  the output and inactivity limits.
- Finish the repository split described in
  [Repository split](REPOSITORY-SPLIT.md): this repository stays public (site,
  simulated labs, the generic terminal controller with sample labs); paid lab
  content, seed files, deployment configuration and keys live in the private
  repository and load through `LAB_CONTENT_MODULE`.
