# Third-party software

Babylon.js **9.31.0**, licensed under Apache-2.0, supplies the site's 3D engine. The selected ESM bundle is self-hosted as `src/babylon.js`; the former Three.js engine is removed. Equipment artwork, procedural textures, lab rules and student controls remain authored in this repository.

- Upstream: [Babylon.js](https://github.com/BabylonJS/Babylon.js), npm `@babylonjs/core@9.31.0`.
- License: `assets/babylon-LICENSE.txt`; upstream notices: `assets/babylon-NOTICE.txt`.
- Selected exports: `scripts/babylon-entry.mjs`.
- Reproducible bundle script: `scripts/vendor-babylon.mjs`.
- Exact versions, registry package integrity values, source-patch hash and bundle SHA-256: `docs/BABYLON-SUPPLY-CHAIN.json`.

The build uses esbuild 0.28.2 to bundle selected engine features and their shader modules into one file. It contains no runtime module imports, `eval`, or `new Function`. No graphics CDN, external model, environment map, uploaded model, telemetry or live provider is used by these scenes. The ordinary site build and CI do not install packages; they validate and publish the reviewed artifact. esbuild and its platform binary are build tools and are not served to students.

src/babylon.js SHA-256: 65d089e8a98bf33f669e47e00c77b8e8694813fa92866cf0b1cc32c368c44e9c

One documented vendor patch replaces `RandomGUID` in the exact upstream `Misc/guid.js` source with `crypto.getRandomValues`, without a weak fallback. `GUID.RandomId` references that patched function. These are graphics identifiers, not student identities or authentication credentials. Other engine math may still use non-security random sampling.

## Rebuild the selected engine

In a clean ignored `.graphics-vendor` folder, install `@babylonjs/core@9.31.0` and `esbuild@0.28.2` with `--save-exact --ignore-scripts --no-audit --no-fund`. Verify package integrity against the supply-chain manifest. Then run `node scripts/vendor-babylon.mjs` from the repository root. The script checks both versions and the upstream GUID source hash, applies the reviewed patch during bundling, and regenerates the bundle, license, notices and manifest. It does not change root `package.json` dependencies.

Review changes to the entry, upstream code, shaders, license, hash and package integrity before publishing any rebuilt bundle. Repeat the engine, interaction, disposal, fallback, release and CSP tests and actual browser rendering. A recorded hash identifies reviewed bytes; it is not a security certification.
