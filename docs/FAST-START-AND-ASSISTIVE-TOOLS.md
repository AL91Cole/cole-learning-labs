# Fast start, Display menu, read-aloud and offline shell

Release `20261106-fast-start`. This records what changed, what was verified in a headless Chromium run against the compiled artifact, and what remains.

## Route-split delivery

The main application is still compiled by the reviewed tier compiler, but with esbuild code splitting switched on for the public `src/app.js` entry only (`bundleTier({split:true})`). Member delivery, the owner preview and the two local tools (`secure-reports.js`, `receipt-verifier.js`) keep producing one self-contained module as before.

- `src/app.js` now imports learning routes on demand through ten reviewed aggregator modules (`src/lazy-*.js`). Each group lists exactly which exports a route needs: investigations, capstone and practice; beginner courses; arcade; coding language paths; Inbox Defender; studios; sandbox; teaching resources; student guide; privacy page.
- Until a group loads, its exports are safe placeholders (no-ops or `false`), so page-leave cleanup and unload warnings behave before any workbench has been downloaded.
- `renderRoute` asks `ensureRouteModules(route)` first. If something is missing, the current page stays in place, a thin progress bar and `aria-busy` show the wait, and the route renders when the download finishes if the address has not changed. A failed download shows a reload page instead of a half-rendered activity.
- Route chunks are written to `src/chunks/<name>-<hash>.js`, served with a one-year immutable cache, and every import in every output must resolve to another output of the same compilation. The preview server serves only the chunk names the build reported.
- Small helpers were split out so the start-up module does not drag a whole engine along: `learning-routes.js` (route parser), `home-entries.js` (home-page cards), `sandbox-starters.js` and `coding-studio-model.js` (state helpers). Public compilation stubs the two content-bearing helpers exactly like their parent modules.

Measured on the compiled open release, uncompressed:

| Delivery | Before splitting | After route groups | After engine decoupling |
| --- | ---: | ---: | ---: |
| Start-up script bytes | 1,224 KB | 936 KB | 303 KB (104 KB gzipped) |
| Whole application | 1,224 KB | 1,232 KB across 28 files | 1,244 KB across 30 files |

### Engine decoupling

The second step removed the remaining static chains from the start-up module to the lab engines:

- `coding-scenarios.js`, `network-scenarios.js` and `expanded-scenarios.js` hold the fictional case data that the lab library needs. `coding-lab.js`, `network-labs.js` and `expanded-labs.js` import and re-export them, so every existing import still works, but the interpreter, practice tools and renderers no longer travel with the catalog. Public compilation filters the coding cases in the data module exactly as it filtered them before and stubs the two member-only data modules.
- `record-engines.js` is a small registry. `records.js` registers `normalizeLabRecord` when it loads with the investigation group; `local-work.js` reaches the normalizer through the registry. Saved work is only read or written from investigation and capstone pages, which always load that group first. If the registry is empty, the storage manager reports saving as unavailable instead of storing unvalidated data.
- `classroom-session.js` holds the saved-work scope lookup that the start-up bundle needs; the classroom client itself, with its source gate, downloads with the investigation group.
- `foundation-catalog.js` lists the beginner courses for the home page and library; `foundation-model.js` merges those entries into the full models and downloads with the beginner-course group.

The static import graph from `src/app.js` now holds 35 small modules: catalogs, case data, route parsing, storage scope, telemetry and the two assistive tools.

## Display menu

`src/display-menu.js` renders a Display button and panel at the bottom-left of every page, including lab views that hide the header. On viewports up to 1500 px wide or 860 px tall the Listen and Display buttons show their icons only, with the words kept in each button's accessible name, so they cover less of the page; see [TECH-TEAM-EXPERIENCE.md](TECH-TEAM-EXPERIENCE.md) for the measurements. Choices: text size (standard, larger, largest), spacing (standard, more space), contrast (standard, stronger), motion (follow device, reduce animation). Each choice becomes a `data-*` attribute on the root element; `src/accessibility.css` carries the rules. Values are validated against a fixed list, stored under one device-only key, and removed again when everything is standard. Storage failures are reported, never thrown.

## Read-aloud

`src/read-aloud.js` renders a Listen button and panel. It uses the Web Speech API only with voices whose `localService` flag is true and whose language is English; the default device voice, then a US English voice, is preferred. If the browser offers only online voices, or none, the panel says so and the controls stay off. No online voice is ever selected, so spoken text is not sent anywhere. Reading walks visible headings, paragraphs, list items, labels and table cells in document order, splits long text into short sentences so speech does not stop early, highlights the current block, and offers pause, resume, stop and a slower speed. A tap mode reads a single paragraph on click without activating links or buttons. Reading stops on route change and page hide.

## Installable app and offline cache

`manifest.webmanifest` and four PNG icons rendered from the existing favicon let Chromebooks, phones and desktops pin the site. `sw.js` is a template; the build fills in the exact public file list (home page, entry script and styles with their release queries, every route chunk, manifest and icons) and a cache version derived from that list. The worker never touches `/api/`, downloads, member pages or anything cross-origin. Navigations are network first with the cached home page as the offline fallback; other pages show a short offline notice. A new version waits for open tabs to close, so a page keeps the chunks it started with. Registration happens only for the public root application, never for the owner preview or private member paths.

## Verification

Headless Chromium against the compiled artifact served by `scripts/serve.mjs`:

- Home page loads 15 script files; opening the arcade fetches one additional chunk; a hardware investigation fetches its route group and the shared engine chunks on first open.
- The service worker registers and activates; with the network switched off, the home page reloads and the arcade opens from cache.
- Display choices change the root font size and contrast attribute, survive a reload, close on Escape with focus returned to the button, and reset to nothing stored.
- Read-aloud with a stubbed local voice read a lab page in 54 short utterances and reported completion; with no local voice it shows the explanatory notice.
- No console errors during the run.

Not yet done: hands-on screen-reader checks of the new panels and real-device voice checks on managed Chromebooks, Windows and iPad.
