# Component art: realistic pictures beside the simplified lab drawings

This is the "cheaper path" to a more realistic look: keep the reviewed 2D simulation model and add photorealistic pictures of each component where a learner is studying that part. Nothing about the equipment logic, hit targets, keyboard controls or saved records changes. A picture is extra context with its own alternative text; every lab works exactly as before when no picture exists.

## Where pictures appear

- **Beginner course "Meet the computer"**: the Explore caption shows the picture of the selected item under its "Look for" and "Its job" text.
- **Hardware investigations**: the Part controls drawer shows the picture of the selected component group (monitor for the display group).

Markup comes from `src/part-art.js`: `partArtHTML(id)` returns an empty string until the manifest names a reviewed file, and it refuses any path that is not a flat `assets/part-<id>.webp` or `.png`.

## Generating candidates with Gemini

`scripts/generate-component-art.mjs` calls the Gemini image API (`gemini-2.5-flash-image` by default) with one shared style prompt and eleven reviewed subjects: side panel, power supply, motherboard, processor, thermal paste, cooler, DDR4 memory, graphics card, SATA SSD, power and data leads, monitor. The prompt asks for a generic, unbranded studio product photograph with no text, logos, brand names, people or hands.

1. Add `GEMINI_API_KEY` as an environment secret for the cloud environment, or export it in a local shell. A new cloud session reads it; the key is sent only in a request header and is never printed.
2. Run `node scripts/generate-component-art.mjs --dry-run` to see the prompts and the estimated cost (about $0.04 per picture at current pricing; check the live rate before a large run).
3. Run `node scripts/generate-component-art.mjs` (optionally `--only ram,cpu --variants 3`). Candidates land in `art-staging/`, which git ignores, with `index.html` as a contact sheet.
4. Open the contact sheet and check every candidate: no text or logos, no recognisable brand product, correct part details (notch position, socket count, plug shape), nothing a student could misread.
5. Publish the accepted variants: `node scripts/generate-component-art.mjs --finalize ram=2,cpu=1`. This resizes to 512 px WebP with the pre-installed Chromium (plain PNG copy when Playwright is absent), writes `assets/part-<id>.webp`, and rewrites the managed block in `src/part-art.js`. The build publishes exactly the files in that manifest.
6. Run `npm test` and `npm run build`, open the beginner hardware course and an investigation, then commit the pictures and the manifest together.

## Pictures published so far

All eleven subjects are published. They were generated on 2026-11-05 with Visualizee on its Pro plan (GPT Image 2.6 Flare, watermark-free, commercial license), reviewed in-session for text, logos and part accuracy, and published with `--finalize`. A first pass from the Z-Image Turbo model on a Hugging Face Space was published earlier the same day and then replaced: the Visualizee set is cleaner (no faux markings on boards and bezels), more accurate (processor beside its socket, both SSD sockets, a real 24-pin plug) and carries a clear commercial license. Candidates from any generator can be dropped into `art-staging/` as `<id>-<n>.png`, `.webp` or `.jpg`; `--finalize` reads whichever exists.

Notes from those runs, for the next person who regenerates a picture:

- The Hugging Face Space's safety filter returned a placeholder for prompts that named a "processor", "CPU", "chip" or a "syringe" of paste; Visualizee accepted the same wording.
- Describe each plug's shape and wire colours for the leads picture, and ask for a plain bezel with no markings for the monitor; without that, generators invent HDMI-style plugs and faux brand marks.
- OpenArt's free plan watermarks output and its CDN is unreachable from the cloud sandbox even on a paid plan, so it did not contribute a published picture. The Gemini script remains a repeatable path once a key is configured.

Three scene assets were also generated with Visualizee and staged for the owner, but are not published because no lab has a display point for them yet: a look-alike school-portal sign-in page with a wrong address bar for the phishing lessons, a flat motherboard schematic with no text for labelled diagrams, and a 16:9 server-closet backdrop for the networking labs.

## Review rules

- Alternative text is written by a person in `PART_ART_ALT`, never generated, and describes what the picture shows.
- Generated pictures carry Google's SynthID watermark; that is expected and invisible. Do not strip metadata in ways that misrepresent the picture's origin.
- A picture that shows a brand, logo, readable text or a real product likeness is rejected, whatever the prompt asked for.
- Pictures are illustrations of generic parts. They are not the simulated equipment, do not change any state, and must not be described as the exact hardware in a ticket.

## Why not a 3D engine

An earlier Babylon-based assembly scene was removed, and `tests/classic-graphics.test.js` now blocks 3D engines from the public build. Reintroducing one is a deliberate decision with real costs: hundreds of kilobytes of engine, modelled and textured parts, and new keyboard and screen-reader work. The picture approach gives most of the visual payoff for a few dollars of generation and an hour of review, with no bandwidth or accessibility cost.
