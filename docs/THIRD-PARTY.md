# Third-party software

Babylon.js **9.31.0**, licensed under Apache-2.0, supplies the site's 3D engine. The selected ESM bundle is self-hosted as `src/babylon.js`; the former Three.js engine is removed. Equipment artwork, procedural textures, lab rules and student controls remain authored in this repository.

- Upstream: [Babylon.js](https://github.com/BabylonJS/Babylon.js), npm `@babylonjs/core@9.31.0`.
- License: `assets/babylon-LICENSE.txt`; upstream notices: `assets/babylon-NOTICE.txt`.
- Selected exports: `scripts/babylon-entry.mjs`.
- Reproducible bundle script: `scripts/vendor-babylon.mjs`.
- Exact versions, registry package integrity values, source-patch hash and bundle SHA-256: `docs/BABYLON-SUPPLY-CHAIN.json`.

The build uses esbuild 0.28.2 to bundle selected engine features and their shader modules into one file. It contains no runtime module imports, `eval`, or `new Function`. No graphics CDN, external model, environment map, uploaded model, telemetry or live provider is used by these scenes. The ordinary site build and CI do not install packages; they validate and publish the reviewed artifact. esbuild and its platform binary are build tools and are not served to students.

src/babylon.js SHA-256: 2e374d361c0ff8eb7e70a228a7bb6692e75bba292ff3992e2c62ac479435af0d

One documented vendor patch replaces `RandomGUID` in the exact upstream `Misc/guid.js` source with `crypto.getRandomValues`, without a weak fallback. `GUID.RandomId` references that patched function. These are graphics identifiers, not student identities or authentication credentials. Other engine math may still use non-security random sampling.

A second hash-checked patch fixes upstream `Misc/webRequest.js` URL classification. It parses absolute URLs and permits the CDN-specific request-modification exception only for exact HTTPS hostnames, without credentials or a non-default port. Lookalike hosts, trusted text in paths/queries, relative references and malformed input cannot skip request policies. This corrects the two CodeQL findings in the original bundled utility; the lab scenes still use local procedural assets and do not contact either CDN. Tests exercise the actual bundled classification and request-modification methods without making a network request.

## Rebuild the selected engine

In a clean ignored `.graphics-vendor` folder, install `@babylonjs/core@9.31.0` and `esbuild@0.28.2` with `--save-exact --ignore-scripts --no-audit --no-fund`. Verify package integrity against the supply-chain manifest. Then run `node scripts/vendor-babylon.mjs` from the repository root. The script checks both versions and both patched upstream source hashes, applies the reviewed patches during bundling, and regenerates the bundle, license, notices and manifest. It does not change root `package.json` dependencies.

Review changes to the entry, upstream code, shaders, license, hash and package integrity before publishing any rebuilt bundle. Repeat the engine, interaction, disposal, fallback, release and CSP tests and actual browser rendering. A recorded hash identifies reviewed bytes; it is not a security certification.
