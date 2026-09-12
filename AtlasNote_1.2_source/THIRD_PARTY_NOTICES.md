# Third-party and content scope

The root MIT license covers original Atlas application code, original documentation and original teaching SVGs. It does not relicense the private knowledge corpus, third-party images, PDF source documents or third-party dependencies. Schema provenance is retained in `src/content/schemas/BASELINE_LICENSE.txt`.

## Offline distribution

| Component | Source / status | License / attribution |
|---|---|---|
| React and ReactDOM 18.2.0, Scheduler | Production modules extracted from the installed JupyterLab distribution; no substituted React implementation | MIT; Facebook, Inc. and affiliates. Full license and original notices under `src/vendor/react/`. |
| JSZip 3.10.1 | Pinned npm package, unmodified distribution | MIT or GPLv3 dual license. This project elects MIT. Distribution license at `src/vendor/JSZIP-LICENSE.md`. |
| Prism 1.30.0 and selected languages | Pinned npm distribution | MIT; full license at `src/vendor/PRISM-LICENSE`. |
| Mermaid and bundled diagram dependencies | JavaScript modules from installed Gradio 6.5.1. The exact upstream Mermaid release number was not independently recovered; the actual distributed bytes are SHA-256 pinned. Real Mermaid render was browser-DOM tested. | Mermaid: MIT, Knut Sveidqvist and contributors. Bundled dependencies retain their respective upstream licenses. |
| Svelte runtime closure | Unmodified runtime modules required by the existing Mermaid distribution; Svelte 5.48.0 is declared by its version module | MIT; Svelte contributors. No Svelte compiler or application UI is used. |
| Gradio distribution provenance | Source of the existing compiled Mermaid dependency closure, not the Atlas application framework | Apache-2.0; license under `docs/licenses/`. |

Mermaid's compiled dependency closure includes upstream projects such as D3, Dagre/Graphlib, Cytoscape, DOMPurify and KaTeX. Their upstream copyright notices and licenses continue to apply; they are not covered by Atlas's original-code MIT grant. D3 uses ISC, DOMPurify offers Apache-2.0/MPL-2.0, and the other named projects use their own upstream permissive grants. Existing inline notices were retained. **A complete transitive license/SBOM audit of the precompiled dependency closure was not completed in this restricted environment.** Before publishing a broadly redistributed release, replace the vendored Mermaid closure with a normal locked npm Mermaid installation and generate its complete third-party notices, or finish that audit. This is a licensing provenance limitation, not a claim that those libraries are proprietary.

The two local module shims in the Mermaid directory supply Vite preload and CommonJS default-export interop only. They do not implement or fake a diagram engine. No CDN is required by the offline app runtime. `docs/vendor-sha256.json` pins every vendored file. No system/runtime font files are redistributed.

## Optional online build

`npm run enable:online` installs React 18.3.1, ReactDOM 18.3.1, the current compatible React-PDF 10.x wrapper and Vite, writing exact resolved versions to the lockfile. The online Vite alias uses a single installed React instance. `tools/build-vite.mjs` copies the worker, CMaps and WASM from the PDF.js version resolved by React-PDF, not a separately forced latest PDF.js. These dependencies were unavailable in this environment and are not falsely listed as installed or runtime-tested.

Reference documentation consulted:

- https://vite.dev/guide/
- https://github.com/wojtekmaj/react-pdf/tree/10.x
- https://github.com/mermaid-js/mermaid
- https://github.com/sveltejs/svelte

## Publication/content review

Only `example.notes` and `atlas.reader-guide` are in the public source and build. The former is the supplied neutral public example. The latter consists of newly authored generic help pages and supplied author-created synthetic PDF fixtures. The publication review pins semantic hashes and rejects private, unreviewed, unlisted or changed content. The private library remains a separate archive; its source terms, links and provenance are not changed or granted a blanket public redistribution license.

## 1.1 authoring-only additions

The Python preparation/test utilities optionally load separately installed PyMuPDF
(tested 1.26.7) and Pillow (tested 12.3.0). These packages, their binaries and font
files are not bundled in the source or static build. They retain their own licenses;
review those licenses for your intended reuse or distribution. This does not change
the original application's license or confer any rights to imported PDFs.

All inherited vendored runtime bytes and their integrity pins remain unchanged.
The online React adapter now exposes the existing DOM portal/flushSync APIs together
with the client root APIs; the advanced PdfEngine.tsx itself remains unchanged.
