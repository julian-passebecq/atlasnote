# Small single-repository architecture

`src/core` owns strict @1/@2 schema loading, deterministic block migration, relationship validation, version selection, import planning, stable-ID structural edits and repository-shaped exports. No framework types are required by the validation/pack algorithms.

`src/storage` owns four IndexedDB stores: immutable imported pack revisions, local overlays, personal state and attachment bytes. Built-in packs stay outside IndexedDB. Composition selects current pack versions and then applies retained overlays; an old merged catalogue never hides a newer shipped source. Notes and ratings never live in canonical pages. Imports commit pack/assets/overlays together; backup restore commits all four stores together. These are actual IndexedDB implementations, but real-origin transaction/failure tests were blocked.

`src/reader` creates semantic content units and safe React-rendered Markdown. Book measures actual DOM units in a hidden, inert tree of identical width, then fragments paragraphs with DOM Ranges, code by lines, lists by items and tables by rows with repeated headers. Oversized indivisible blocks get an explicit full-view fallback. DOM clones retain block IDs and fragment offsets while SVG definition IDs are rewritten. Generated sheet numbers are presentation state, never source identities. Viewport/translation/font/disclosure/diagram readiness triggers reflow. Focus widths above the breakpoint use consecutive sheet pairs in one vertical scroller.

`src/app` and `src/components` implement the local workspace shell, independent view histories, at most two Compare panes, a compact project tree, reusable bilingual/question/code blocks, contextual glossary and explicit export/restore previews.

`src/pdf/PdfReader.tsx` is the honest prebuilt browser-viewer fallback. `src/online/PdfEngine.tsx` is a separate unverified React-PDF adapter. `tools/build-vite.mjs` pairs its worker with the wrapper's actual PDF.js package. The default compiler never pretends that this optional adapter ran.

## Data boundaries

The public compiler accepts only explicitly reviewed public pack IDs and matching semantic review hashes. Neither the full original handoff nor private normalized content is present in the repository. The canonical private library is a separate local-import ZIP. Local notes/PDFs/flags and backups never flow into the static content compiler automatically.

Imports reject unknown record fields, unsupported payload versions, unsafe paths, prototypes, excessive ZIP expansion, symlinks, active assets, missing dependencies, duplicate ownership and unresolved edges. Notebook files are quarantined rather than executed or guessed. Remote image and PDF sources require user consent. Raw HTML is displayed as text; this is a safe Markdown subset, not full CommonMark conformance.

## Known boundaries

No simultaneous-writer coordination across multiple browser tabs. No automatic migration of older unknown IndexedDB layouts. No service worker/cache-first PWA, encryption, cloud synchronization, server, authentication or code execution. Keep backups and use the internal views of one browser tab. A complete transitive license audit and optional PDF dependency audit remain release gates.
