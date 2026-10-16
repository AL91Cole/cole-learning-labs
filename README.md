# Cole Learning Labs

A professional portfolio and browser-based technology learning platform created by Alan “Al” Cole / Mx. Cole.

The site combines a clean, light professional portfolio with dark teal and navy learning workspaces and a 3D-inspired virtual computer bench. Its 15 assignments support technology practice for grades 7–12 across hardware support, networking, AI literacy, and ethical cybersecurity.

Mx. Cole is developing this project toward a future goal of teaching Computer Technology through CTE. The project does not represent completed CTE certification.

## What is included

| Pathway | Assignments | Practice focus |
| --- | ---: | --- |
| Hardware & ServiceDesk | 6 | Inspecting a virtual PC, diagnosing faults, changing components, checking a repair, and documenting a handoff |
| Network & Operating Systems | 3 | Examining connections, configuration, permissions, and evidence |
| AI Literacy & Audit | 3 | Checking AI claims, evaluating sources, identifying limitations, and explaining responsible decisions |
| Ethical Hacking & Penetration Testing | 3 | Working within an assigned fictional scope, interpreting security evidence, recommending fixes, and reporting findings |

Grade bands are 7–8, 9–10, and 11–12. They provide starting points for teacher selection and support, rather than a guarantee of an individual student's readiness.

The AI activities use authored scenarios. The site makes no live AI API calls. Cybersecurity actions take place inside fictional simulations; the site is not a tool for testing external systems.

## Chromebook and tablet layout

The responsive lab layout includes a PC close-up view, a labeled component selector, section shortcuts, larger controls, and 16px form text. Key controls use minimum heights of 44px or 46px to support touch and pointer use.

Local viewport checks at 1366 × 768, 1024 × 768, and 768 × 1024 found no page-level horizontal overflow. Preview an assignment on the actual managed classroom device too: school policies can affect storage, downloads, and clipboard access.

The published update includes these responsive improvements. The 48 state-flow regression tests passed.

## Pages and routes

The site uses hash navigation so it can run on a static host without server-side routing.

| Route | Destination |
| --- | --- |
| `#home` | Professional introduction and entry points |
| `#projects` | Selected work and project links |
| `#about` | Background, education, and professional direction |
| `#labs` | Assignment collection |
| `#lab/INC-101` | Example individual assignment route |
| `#educators` | Classroom guidance and assessment |
| `#guide` | Instructions for using the site |
| `#connect` | Professional connection links |
| `#privacy` | Privacy and accessibility information |

## Student progress and reports

Progress is stored in `localStorage` for the current browser profile and website origin. There are no student accounts, server-side student records, cloud synchronization, or teacher monitoring dashboards.

- Use the same browser profile and website address to resume work.
- Private browsing, browser cleanup, blocked storage, or a different device can prevent progress from being retained.
- Changing from a local preview or GitHub address to the custom domain does not move existing progress automatically.
- Storage is scoped by scheme, hostname, and port. The `pages.dev`, apex, and `www` addresses have separate storage; changing the hosting provider while keeping the same HTTPS `www` origin does not itself change that scope.
- Export a `.txt` report or use the copy control before submitting work through a teacher's chosen process. Reports are not sent to a teacher automatically.
- On shared devices, export the needed work and reset the session before the next learner uses that profile.

Use fictional information in activities. Do not put real passwords, student records, or confidential incident details into notes or reports. See [Teaching guidance](docs/TEACHING.md) for classroom practice.

## Run locally

There is no dependency installation or production build step. With Node.js 20 or newer installed, start the included local server:

```sh
npm run dev
```

Open the local address printed by the server. Serve the repository directory over HTTP so ES module imports work correctly; opening `index.html` directly with a `file:` URL is not the supported preview method.

For example, with Python 3 installed:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`, then use the site's navigation. Stop the local server when finished.

## Source layout

| File | Responsibility |
| --- | --- |
| `index.html` | Static entry point |
| `src/styles.css` | Shared portfolio and site styling |
| `src/app.js` | Application shell, routes, and shared behavior |
| `src/scenarios.js` | Assignment content |
| `src/hardware.js`, `src/hardware.css` | Virtual hardware bench |
| `src/workspaces.js`, `src/workspaces.css` | Other simulation workspaces |
| `scripts/serve.mjs` | Local development server |
| `docs/TEACHING.md` | Teacher preparation, classroom use, and assessment |
| `_headers` | Response-header policy for Cloudflare Pages |
| `docs/DEPLOYMENT.md` | Cloudflare Pages publishing, domain association, and HTTPS verification |

Keep asset references compatible with a project-site subdirectory as well as a custom-domain root. Keep internal page navigation in the existing hash-route format.

## Deployment status

The public repository is [AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs). Native **Cloudflare Pages** hosts the site through the `cole-learning-labs` project connected to `main`. GitHub remains the source repository.

The Pages project uses framework preset **None**, build command `exit 0`, output directory `.`, and no environment variables. Its initial deployment succeeded at [cole-learning-labs.pages.dev](https://cole-learning-labs.pages.dev). [www.colelearninglabs.com](https://www.colelearninglabs.com) is Active with SSL enabled in Pages; an independent request passed TLS validation and returned HTTP 200 through Cloudflare.

Both the apex and `www` Pages domains are Active with SSL enabled. Fresh Chrome loads the professional homepage without a security warning. The apex redirects to `www` with status 301, preserving paths, query strings, and the tested lab fragment. The hardware lab and Report dialog load at the canonical address.

Squarespace remains the registrar. Cloudflare's DNS zone, DNSSEC, and edge certificate are active on `elias.ns.cloudflare.com` and `venus.ns.cloudflare.com`; mail records were preserved. The move followed a stalled GitHub Pages certificate request. The native Pages connection does not depend on that old origin certificate. All three response policies from `_headers` were verified on the HTTPS `www` response: MIME-sniffing protection, a strict-origin referrer policy, and disabled camera, microphone, and geolocation permissions.

Both web records are proxied CNAMEs to `cole-learning-labs.pages.dev`. Cloudflare reports its network and SSL/TLS DDoS protections active and HTTP DDoS protection enabled, with no custom overrides. No custom WAF or rate-limit rules are configured. Legacy GitHub Pages publishing is disabled; the GitHub repository remains the source.

Follow [Deployment guidance](docs/DEPLOYMENT.md) for the verified configuration and future releases.

The release entry is versioned as `src/app.js?release=20261016-cloudflare` to request fresh application code without deleting saved work. `_headers` declares `/src/*` with `Cache-Control: public, max-age=0, must-revalidate`; check the response after future deployments.

## Before a release

Check the portfolio links, all 15 assignment entry points, grade filtering, evidence and report controls, local resume and reset behavior, and browser back/forward navigation. Complete a representative repair and one assignment from each other pathway. Confirm that keyboard navigation, visible focus, text zoom, and the layout remain usable on a typical Chromebook screen.

The labs support guided practice and teacher judgment. A completion indicator is not proof of mastery, professional certification, or replacement for required hands-on instruction.
