# Local PR #22 test service

This starts the separate terminal backend on **this computer only**. It does not change the public website, DNS, Cloudflare configuration, Google accounts or the pull request's merge status. Use fictional data. The Linux shell runs inside Docker; the controller runs in Node on the test computer.

## Prepare once

Use Node 24 or later and a running Docker Desktop engine in Linux-container mode (or a Linux Docker engine). From the repository root:

```sh
npm ci --prefix terminal-sandbox
docker build -f terminal-sandbox/Dockerfile.sandbox -t cole-learning-labs/sandbox:alpine terminal-sandbox
```

The helper checks the dependencies, native PTY, Linux engine and existing image. It does not install packages, pull images, expose ports to the LAN, or start a tunnel.

## Start, check and stop

```sh
node terminal-sandbox/scripts/review-service.mjs start
node terminal-sandbox/scripts/review-service.mjs status
node terminal-sandbox/scripts/review-service.mjs stop
```

Open **http://127.0.0.1:8080** on this computer. Loopback HTTP is an explicit local testing exception; it is not the public deployment's HTTPS configuration. Other computers, Chromebooks and tablets cannot connect to this loopback address.

The helper prints the path to `.review/teacher-access.txt`, not its secret. Open that private local file, select Teacher sign-in in the browser, and enter its key. Create a class. In a separate browser window, select Join a class and enter its class code. Test pause/resume, milestone updates, teacher commands and optional terminal previews. Previews start off; the student must opt in. They depict lab terminal text, not the whole device.

Ordinary start/stop cycles reuse the locally generated teacher key. A fresh process receives a new instance identity and control token. The service supports at most **4 active learners, 12 connections, 2 classes, and 4 learners per class** for this desktop review. Each learner retains the backend's Docker CPU, memory, PID, filesystem and network restrictions. Work is ephemeral; stopping removes active learner containers and discards their work.

The controller runs detached and hidden. Private state, the credential, and operational logs stay in `terminal-sandbox/.review/`. The helper protects that directory with current-user and SYSTEM-only Windows permissions, or owner-only Unix permissions. Git and Docker must continue excluding this directory. Do not copy its contents into a public repository or support message.

`start` reuses a confirmed running instance. It refuses an occupied port or an unconfirmed live PID and does not kill unrelated processes. `stop` authenticates the local controller over a private IPC channel and requests graceful shutdown. If the recorded controller is absent, it removes only containers whose labels match this exact review instance, verifies those labels before removal, and retains ownership state if Docker is unavailable. It never runs Docker prune or a broad container-name cleanup.

If startup fails, the helper prints a bounded explanation and the private log location. Start Docker before retrying. If an earlier controller crashed, run `stop` to finish ownership-scoped cleanup before restarting. If a live recorded PID cannot be authenticated, investigate manually; the helper intentionally refuses to terminate it.

This is a local functional review, not a production school deployment or verified school identity system. Teacher login uses a private local test key. Google OAuth remains disabled. A separately approved host, HTTPS ingress, operational controls and privacy review are required before remote use.
