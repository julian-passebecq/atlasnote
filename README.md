# AtlasNote 1.1 - Knowledge Atlas reader

A local-first knowledge and PDF reader. This release continues the hardened 1.0.1 source; the on-screen Knowledge Atlas identity, stable content IDs, measured paginator, import ownership rules and `knowledge-atlas` IndexedDB schema 2 are retained.

## Start

Use Node.js 22.12 or later:

```sh
npm ci
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. Do not double-click `index.html`. No account, backend or API key is needed.

On a disconnected computer with **TypeScript 5.8.3 already installed globally**, the checked-in JSZip and Prism bundles support a second route:

```sh
npm run bootstrap:offline
npm run build
npm run typecheck
npm test
npm run preview
```

This restores local Node entry points from existing vendor bundles; it does **not** reproduce a complete `npm ci` transitive installation. It does not download anything or install the optional PDF engine. For the prebuilt ZIP, extract and run `node serve.mjs` (or `Start_Atlas.cmd` on Windows); no source dependencies are needed.

## Reader

**Focus** removes all persistent chrome, including top bar, rails, sidebars, tabs, breadcrumbs, layout controls and status bar. Content fills the app viewport. Use the floating **Exit focus** button or Escape. No browser Fullscreen API is invoked. Sidebar preferences and semantic reading anchors are restored on exit.

**Compare** creates an **empty, active second pane**. Choose a note, PDF or folder through the tree/search, or use its picker. It never clones the first pane automatically. Toggle Compare off to keep the active non-empty pane, including its tabs and history; an empty active pane falls back to the non-empty peer. Your split ratio is retained for next time. Each pane owns independent tabs, history, English visibility, note/PDF presentation and reading state.

**Book** is one note paginated into measured, block-aware virtual sheets: 1-2, then 3-4 while scrolling vertically. It is not Compare, PDF pagination or CSS columns. Virtual numbers never replace source Page/Block IDs. Unsplittable content retains a link to the complete Continuous source.

Choose **Microsoft Fluent**, **Light Minimal** or **Medium / Paper** in Workspace settings. The original persisted keys are unchanged. Right-click, Shift+F10, Ctrl/Cmd-click and middle-click remain available. New internal tabs start at a picker instead of borrowing another tab's state.

## Mixed folders and local PDFs

Click a notebook/folder **label** to read its derived direct-child collection; click its chevron to expand the tree. Collections show notes, PDFs and subfolders, summary, language, known physical page count and enabled learning flags. Filter by type, language, domain, technology or text; sort by tree order or title. Menus support open/new tab/other pane, bookmark, rename, move and archive.

Use **Import PDF privately** in a collection, or **Add a local PDF** in Workspace settings. Select the exact file, choose any nested folder (or create a folder), and enter metadata. Unknown provenance/page counts remain blank. SHA-256 duplicates reuse the existing document. PDF bytes are unchanged; uncertain rights remain reference-only or unreviewed and private. Files above 12 MiB warn; files above 20 MiB are rejected.

The page editor exposes local PDF title, primary language and comma-separated tags without requiring JSON. Namespaced tags are facets, for example `domain:data-engineering`, `tech:dbt`, `doctype:guide`, `source:linkedin`. A document has one canonical tree placement even with many facets. For source-owned imported metadata, update its authoring pack with the same IDs and a higher version rather than creating a conflicting local DocumentEntry.

See [PDF preparation](docs/PDF_PREPARATION.md) and [private PDF-library workflow](docs/PDF_LIBRARY_WORKFLOW.md). The runnable repository template is in `templates/pdf-library/`.

## Private content, updates and backups

Public default content remains **8 pages, 2 notebooks, 1 glossary term**. The supplied 137-page private reference corpus is not in this source or the public build. Its content was not imported during implementation; generated synthetic fixtures test equivalent scale.

Import standard Atlas private library ZIPs through Workspace settings. Personal remarks, flags, bookmarks and local additions remain separate from imported packs. Equal-version changed bytes, downgrades, missing IDs and unresolved local conflicts stay blocked. A PDF library ZIP is a **content pack**, not a complete workspace backup.

Use **Download workspace backup** before changing browser, machine or origin. Complete backups include exact required attachment bytes and personal state; missing/corrupt required bytes prevent an incomplete backup. Restore requires explicit replacement consent. Localhost, 127.0.0.1 and hosted URLs are distinct storage origins. There is no cloud sync.

## PDF engine boundary

The delivered static build uses the clearly labelled **browser preview fallback**: original open/download and a native preview frame. Physical-page search, outline, integrated spreads, zoom, rotation and password workflows are **not certified in this fallback**.

The advanced implementation in `src/online/PdfEngine.tsx` is preserved byte-for-byte. The optional build requires exactly **React-PDF 10.5.0 / PDF.js 5.4.296**, with matching worker, CMaps, WASM and standard-font assets. Missing or mismatched resources stop the build rather than producing an incomplete engine. The one-React-instance adapter includes portals and flushSync.

On a separate network-enabled development machine, `npm run enable:online` resolves the optional Vite/types packages and writes exact resolved versions into the lockfile. Review those versions and the resulting lockfile, then run `npm run typecheck:online`, `npm run build:vite` and `npm run test:pdf`. The delivered fallback lockfile does not pretend to contain that unexecuted optional installation. Do not independently force a newer PDF.js version.

## Verification and integration

[Release report](docs/RELEASE_REPORT.md) and [all 160 acceptance rows](docs/RELEASE_ACCEPTANCE_MATRIX.md) distinguish PASS, FAIL and BLOCKED. [Testing](docs/TESTING.md) explains each evidence scope. Run `python tools/run-release-gates.py --out docs/evidence/release-1.1` for the gate set; a blocked gate returns a non-zero overall result, not a green release.

Real Chromium DOM/layout tests run in a labelled about:blank harness when normal-origin navigation is prohibited. They are not IndexedDB, reload or secure-context certification. The new file-intake harness uses a clearly marked in-memory commit adapter and SHA-256 bridge; production storage/cryptography code is not replaced. Normal-origin persistence and optional integrated PDF tests remain separate gates.

Publish only `dist/` or the extracted build contents, with `index.html` at root. Do not publish source templates, private ZIPs, backups, intake files or evidence. The packaged `_headers` are tested locally; no push, remote CI, preview or deployment was performed. The coordinator's integration target is `improvement/atlasnote-1.1-reader-pdf-library`.

Original application code is MIT; third-party dependencies and private documents retain their own licenses. No quiz, execution sandbox, graph, OCR, cloud authentication or AI chat was added.
