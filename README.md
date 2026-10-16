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
| `docs/DEPLOYMENT.md` | GitHub Pages publishing, DNS migration, and HTTPS verification |

Keep asset references compatible with a project-site subdirectory as well as a custom-domain root. Keep internal page navigation in the existing hash-route format.

## Deployment status

The public repository is [AL91Cole/cole-learning-labs](https://github.com/AL91Cole/cole-learning-labs). GitHub Pages publishes from `main`, `/(root)`, with `www.colelearninglabs.com` configured as the custom domain.

The final DNS configuration points `www` and the apex domain to GitHub Pages. DNS and HTTPS verification are still in progress; HTTPS enforcement has not yet been confirmed. Squarespace remains the registrar, mail records were preserved, and Cloudflare is not enabled.

Follow [Deployment guidance](docs/DEPLOYMENT.md) for the exact records and remaining checks before announcing the custom address as ready for classroom use.

## Before a release

Check the portfolio links, all 15 assignment entry points, grade filtering, evidence and report controls, local resume and reset behavior, and browser back/forward navigation. Complete a representative repair and one assignment from each other pathway. Confirm that keyboard navigation, visible focus, text zoom, and the layout remain usable on a typical Chromebook screen.

The labs support guided practice and teacher judgment. A completion indicator is not proof of mastery, professional certification, or replacement for required hands-on instruction.
