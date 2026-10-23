# Simulation update review — v2.28.0

Base: `e50cb15e28326ecc0353e27b9aaa509cf4808663`. Public asset identity: `20261022-controls`. This record describes the prepared source and local checks; it does not establish production publication.

## Result

- The fitted case cover is opaque, with a small centered logo icon, metal seams, and ventilation. Status and instructions stay outside the panel. Internal artwork, component targets, sockets, and selected internal cable markers are absent until the cover is removed. The same covered-state rule applies to the separate beginner hardware picture.
- One visible Side panel control walks through each screw, cover removal, refitting, and securing. Existing PC-off, AC-disconnected, mount, clip, fastener, and cable guards still decide whether a change is allowed.
- One compact Input button sits on the monitor bezel. Input cycles HDMI and DisplayPort. Its visual face is small; the transparent native hit target remains at least 44px. Expanded diagrams keep the controls anchored to the same picture. The monitor follows the simulated signal without a separate power control.
- Cable controls name the cable end, matching socket, Connect, and Disconnect. Socket selection and dragging use the same fixed mappings. External video ends remain independent; internal changes require safe case access.
- `#sandbox` opens a free coding space with blank, Pixel Pet, arcade, and rover starters. It has no ticket, required answer, fixture grade, or classroom upload. Existing structured coding investigations remain available.
- Both sandbox languages reuse the custom local interpreter. Source is parsed as the supported language, never evaluated as native JavaScript/Python. One finite bounded numeric input is supplied read-only. Existing source, token, depth, loop, execution, text, numeric, and output limits remain. Imports, functions, packages, objects, files, system commands, browser globals, and network capabilities remain unavailable.
- Sandbox language drafts survive ordinary site navigation in page memory. Closing/reloading or clearing private work removes them. Copy and download export only the current source as text. Optional investigation device saving does not persist sandbox code.
- `#guide` now provides nine tutorial sections covering activity choices, beginner labs, required clues and first ideas, case access, cables, testing, free code, reports, and help. Existing workbook and quiz alternatives remain available below the guide. Investigation page gates remain in order.
- Canonical metadata, sitemap/robots, relative homepage aliases, utility-page indexing rules, and clickjacking headers are recorded in [Search indexing](SEARCH-INDEXING.md).

## Verification

- `npm run check` passed syntax and tracked curriculum-path checks.
- `npm run build` prepared 74 explicitly reviewed public files. Private source, teacher materials, test fixtures, and the terminal service remain outside the public artifact.
- Full Windows suite: **1,120 tests; 1,118 passed; 0 failed; 2 skipped**. The skips require Windows file-symlink privileges. Linux CI must retain `CLL_REQUIRE_LINK_TESTS=1` to require those link-boundary checks.
- Targeted tests cover covered/open/refitted panels, guarded changes, monitor input and focus, independent video ends, connector selection, saved-state/schema compatibility, free-code attacks and limits, escaped output, drafts, exports, repeated language switches, routing, privacy clearing, tutorial navigation, canonical consistency, and security headers.
- Actual Chrome local preview checked: intake gates; two screw removals before lifting the cover; internal cable connection; refitted cover rejecting internal disconnect; successful PC startup after repair; monitor input; corrected compact bezel layout; custom JavaScript and Python output; rejected Python import; draft retention through ordinary navigation; tutorial section focus.
- The live homepage and production Pages hostname lacked canonical links during browser inspection. The apex HTTP URL redirected to HTTPS `www`. Those observations establish the pre-change condition, not Google's chosen duplicate or acceptance of this release.

The full suite needed an unsandboxed run because the execution sandbox denied its loopback HTTP test connections. The successful run above includes those preview-server tests. No new third-party runtime dependency was added to the public app.

## Publication and remaining acceptance

Merge and production deployment require maintainer approval. After publication, verify deployed assets/headers/canonicals and follow [Search indexing](SEARCH-INDEXING.md) for exact-host duplicate consolidation and Search Console recrawl. Google processing can lag the release. This change does not alter domain settings or submit indexing requests.

Physical school devices/networks, narrow-screen computed layout, screen-reader acceptance, and independent security review remain separate checks. This is a bounded teaching interpreter and a source review, not a guarantee that all malicious inputs or security issues are impossible. The connected-classroom production privacy gate remains closed. The optional private Linux terminal and requester provider configuration were not redeployed or re-audited in this change.
