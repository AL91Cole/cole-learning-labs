# Real-machine labs: server setup

One small always-on server runs the terminal controller; every learner machine
runs in Docker's cloud. The public site reaches the controller through its own
gateway (`functions/terminal/[[path]].js` in the public repository), so the
browser only ever talks to `https://your-site.example/terminal/*` and the
site's security policy does not change.

```text
Browser ── wss://your-site.example/terminal/ws ──► Cloudflare Pages gateway
   └─► https://terminal.your-site.example (Cloudflare Tunnel)
          └─► cloudflared container ──► controller container (:8080, private network)
                                              └─► Docker Cloud Sandboxes API: one micro machine per learner
```

Everything below is a one-time setup of about an hour. Costs: the server
($4 to $6 a month), plus Docker compute only while machines run (micro size,
about $0.07 an hour per learner; the $250 credit covers years at the planned
schedule).

## 1. Docker account

1. At hub.docker.com, Account settings, Personal access tokens: create a token
   with **Allow Cloud Sandboxes access**, read/write. Copy it once into a
   password manager. Revoke the token that was pasted into chat earlier.
2. In the Docker Agentic Platform console, request a quota increase from 10 to
   at least 35 concurrent sandboxes (class size plus spares) before the first
   class. Until then, at most 10 learners can hold a machine at once.

## 2. Server

Any Linux VPS with 1 vCPU, 1 GB RAM and Ubuntu 24.04 works (Hetzner CX22,
DigitalOcean Basic, Vultr; all under $6 a month). Nothing is exposed on it
except SSH; the tunnel makes outbound connections only.

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER" && newgrp docker
```

Clone both repositories side by side (this one is private: use a deploy key or
a fine-grained GitHub token with read access to it):

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/<account>/cole-learning-labs.git
git clone https://github.com/<account>/<private-repository>.git
```

## 3. Cloudflare Tunnel

1. In the Cloudflare dashboard, Zero Trust, Networks, Tunnels: **Create a
   tunnel**, type Cloudflared, name `cole-learning-labs-terminal`.
2. On the connector step, pick Docker and copy only the token (the long value
   after `--token`). Do not run the command shown; the compose file runs the
   connector.
3. Public hostname: subdomain `terminal`, domain `your-site.example`, type
   HTTP, URL `orchestrator:8080`. Save. Cloudflare creates the DNS record.
4. Under the hostname's additional settings, leave WebSockets on (the default).

## 4. Settings and start

```bash
cd ~/apps/<private-repository>
cp deploy/.env.production.example deploy/.env.production
chmod 600 deploy/.env.production
nano deploy/.env.production      # DOCKER_PAT, TUNNEL_TOKEN, TEACHER_ACCESS_KEY (openssl rand -hex 32)
docker compose --env-file deploy/.env.production -f deploy/docker-compose.cloud.yml up -d --build
docker compose -f deploy/docker-compose.cloud.yml logs -f --tail=50
```

The controller log must say `Terminal service listening; explicitly enabled;
backend docker-cloud-sandbox` and `Loaded N lab definition(s) from
LAB_CONTENT_MODULE`. The connector log must show the tunnel registered.

## 5. Check

- `https://terminal.your-site.example/api/health` must return
  `{"status":"enabled","runtime":"docker-cloud-sandbox",...}`.
- `https://your-site.example/terminal/api/health` must return the same
  through the gateway. The gateway's `TERMINAL_ORIGIN` is set in the public
  repository's `wrangler.jsonc` for production, so no dashboard step is needed;
  a Pages deploy after that change must have happened.
- Open a hosted lab on the site (NET-201, SEC-402 or CODE-501): the lab guide
  shows **Real Linux machine** instead of the simulated desktop, Start machine
  gives a prompt within about ten seconds, and `wget http://example.com` fails
  (no network inside the machine).
- Optional, from your own computer in the public repository checkout:
  `RUN_CLOUD_TESTS=1 SANDBOX_BACKEND=cloud DOCKER_ID= DOCKER_PAT=… npm test --prefix terminal-sandbox`.

If the site keeps showing the simulated desktop, the health check failed:
check step 5's two URLs, then the controller log. The site falls back on its
own, so a stopped server never breaks a lab, it only removes the real machine.

## Day to day

- Update: `cd ~/apps/cole-learning-labs && git pull`, then in this repository
  `git pull` and rerun the `docker compose … up -d --build` line.
- Stop everything: `docker compose -f deploy/docker-compose.cloud.yml down`.
  Running learner machines are deleted by the controller on shutdown; check
  the Docker console once afterwards for leftovers.
- Rotate the Docker token or teacher key: edit `deploy/.env.production` and
  rerun the `up -d` line.
- Cost check: the Docker console shows sandbox hours; the controller deletes
  each machine when the learner stops, after 5 minutes idle, or after one hour.
