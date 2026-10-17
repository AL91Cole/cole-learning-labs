# Third-party software

Three.js 0.186.0 (MIT), pinned to the official r186 release, is served from this site only. Original procedural equipment artwork and application rules are authored in this repository.

Source: https://github.com/mrdoob/three.js/tree/r186/build
License: assets/three-LICENSE.txt

The official three.module.js and three.core.js are vendored without a package installation step. The module imports were changed only to use the local core file with this site's release query. No CDN, external model, texture, uploaded model, loader, telemetry or network-backed 3D feature is used.

src/three.module.js SHA-256: bdcea0921c776da7b85af245c99af5af46143ae741e0ee2f80d24154ad711fe5
src/three.core.js SHA-256: 9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6

When updating Three, review the official release and migration notes, license, local imports and source hashes; repeat geometry/lifecycle/fallback tests, CSP checks and actual browser rendering. These hashes identify reviewed files; they are not a security certification.
