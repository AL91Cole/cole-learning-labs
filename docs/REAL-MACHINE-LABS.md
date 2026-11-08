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
   tunnel; `terminal-sandbox/cloudflare/` has starting configurations), so the
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
active weeks is $8 to $10 a week. The controller as written needs Docker daemon
access; if Docker's sandbox product does not give you a host, the next step is a
small adapter in the controller that starts one sandbox per learner through
Docker's API instead of `docker run`.

## Before charging (remaining work)

- Author real-machine lab definitions and seed files for the other guided
  labs you want to sell (each is a `SELF_PACED_LABS` entry plus seed files in
  `Dockerfile.sandbox` and a milestone test).
- Decide how paid access is granted (the prepared membership service), and
  gate `environment: 'remote-terminal'` or the service's `ALLOWED_ORIGINS`
  accordingly.
- Pilot one class on the Docker credit: confirm 30 sandboxes can start at the
  top of a period, measure cold-start time, and watch the output and
  inactivity limits.
- Finish the repository split described in
  [Repository split](REPOSITORY-SPLIT.md): this repository stays public (site,
  simulated labs, the generic terminal controller with sample labs); paid lab
  content, seed files, deployment configuration and keys live in the private
  repository and load through `LAB_CONTENT_MODULE`.
