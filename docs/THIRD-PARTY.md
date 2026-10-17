# Third-party software

Three.js 0.186.0 (MIT), pinned to the official r186 release, is served from this site only. Original procedural equipment artwork and application rules are authored in this repository.

Source: https://github.com/mrdoob/three.js/tree/r186/build
License: assets/three-LICENSE.txt

The official three.module.js and three.core.js are vendored without a package installation step. The module imports use the local core file with this site's release query. One documented vendor patch replaces the graphics UUID generator's Math.random calls with crypto.getRandomValues (CSPRNG), with no weak fallback. Graphics UUIDs do not represent student identities or authentication credentials. No CDN, external model, texture, uploaded model, loader, telemetry or network-backed 3D feature is used.

src/three.module.js SHA-256: 2981b7ac961637ebf0206d5d5e5f716f9b5784006d869ed6013fc06154dbdc26
src/three.core.js SHA-256: a03b4c2f03bcc450f73932ebeaaa9a3f58f71425bded9f600bbcc3f43f77de42

When updating Three, review the official release and migration notes, license, local imports and source hashes; repeat geometry/lifecycle/fallback tests, CSP checks and actual browser rendering. These hashes identify reviewed files; they are not a security certification.
