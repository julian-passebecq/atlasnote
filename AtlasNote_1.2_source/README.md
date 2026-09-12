# AtlasNote 1.2 - Compact Library / PDF Integration

A compact local-first knowledge and PDF reader. This is the implemented 1.2 source, not a patch or an implementation prompt. It continues the supplied `release/atlasnote-1.1-v5-final` snapshot (`c44b052e19c2012f62fe0f5a9a1b9960286fbfce`) without replacing the storage model, content IDs, measured note paginator or existing optional PDF engine.

**Release status: implementation candidate; external validation gates remain BLOCKED.** The delivered build uses the clearly labelled browser/native PDF fallback. Normal-origin IndexedDB/reload certification, optional React-PDF installation/runtime and final public-PDF hosting/pinning require the coordinator's unrestricted environment. See `docs/RELEASE_REPORT.md` and `docs/release-1.2/ACCEPTANCE_MATRIX.json` for the exact evidence, not historical 1.1 reports.

## Try the prebuilt application

Extract `AtlasNote_1.2_build.zip` into its own folder. With Node.js 22.12 or later:

```sh
node serve.mjs
```

Open `http://127.0.0.1:4173`. Windows users can also use `Start_Atlas.cmd`. Do not double-click `index.html`; a stable HTTP origin is needed for browser storage. No account, API key or backend is required. Back up an existing workspace before changing its origin or replacing a build.

## Build or test the source

Extract `AtlasNote_1.2_source.zip` into a separate folder. The archive contains the full project root.

```sh
npm ci
npm run typecheck
npm test
npm run preview
```

`npm test` builds the app first. The normal installation requires package-registry access. On a disconnected machine with **TypeScript 5.8.3 already installed globally**, the supplied offline route restores the checked-in JSZip and Prism bundles:

```sh
npm run bootstrap:offline
npm run build
npm run typecheck
npm test
```

The offline bootstrap is not equivalent to a successful full `npm ci`, and does not install React-PDF. Browser tests require Python dependencies in `requirements-test.txt` and Chromium; PDF-authoring tests use `requirements-pdf-authoring.txt`. See `docs/TESTING.md` for all commands and their scopes.

## Compact reader controls

The top-left icon switches **Notes / PDF Library**. Notes retains the original mixed workspace; PDF Library is a recursive filter of the same canonical notebook/folder tree, not another app. It hides note leaves and empty branches without changing their IDs or deleting anything. Folder labels open the existing collection view; chevrons expand the tree.

The top ribbon contains Back/Forward, global search and an accessible icon-only AI export. The right rail contains the notebook toggle, Focus, Reading mode, Context, Compare, contextual Swap, Bookmark, Theme and More / Settings. **Home, Bookmarks, Edit, Print and learning-flag visibility are in More / Settings.** Existing saved ratings are retained when hidden.

Context is an on-demand, non-modal overlay with the original Context / Outline / Remarks tabs. It does not shrink the reading canvas or alter its history, anchor, active pane or split ratio. Escape dismisses it and returns focus to its trigger. Context and rail popovers do not overlap each other.

Reading mode acts on the active view only. Notes support Continuous / Book / Parallel and independent English visibility. PDF Single / Continuous / Spread controls remain unavailable in the fallback build rather than pretending to control a native browser frame.

Focus retains the full-viewport reader behavior and uses the floating Exit focus button or Escape. Compare creates an empty second reading thread; it does not clone the first pane. Each pane keeps independent tabs, history, reading positions, language visibility and presentation state. Pane A is blue and Pane B lavender, including selected tabs and simultaneous tree markers. A dual A/B marker identifies a page open in both panes. An active label, solid border and asterisk provide non-color identity.

Exactly five themes are available: **Fluent Blue, Neutral/Sage, Academic Paper, Soft Lavender, Dark Slate**. The original three persisted IDs remain valid. The new theme and library-mode values validate in actual workspace backups; live browser reload remains a separate gate.

## PDF Atlas references and local copies

Two inspected external references are bundled as metadata only, under **PDF Atlas / Data Engineering / Apache Spark**. No copies of their PDF binaries are present in the source or application build. `pdfatlas_organized.zip` contains the two original, byte-identical PDFs, the manifest and an update README. Their source attribution is preserved; no redistribution licence is invented.

The build currently targets the organized paths on a **staging `main` URL**. It does not assert those paths have been uploaded. The coordinator must review publication rights, upload the organized library, then edit only the base URL in `config/pdfatlas.json` to the final exact commit SHA and run:

```sh
npm run pdfatlas:sync
npm run build
npm test
```

`config/pdfatlas.library.json` is the reviewed metadata input. The generator validates stable document/category IDs, safe paths, hashes, byte/page counts and language. It regenerates only `content/packs/pdfatlas.public` and that pack's explicit publication-review entry. It performs no network requests and copies no PDFs into the app.

Only exact configured public-repository HTTPS paths, approved pack identity and known SHA-256 qualify for one-click opening. Fetches omit credentials/referrers, reject redirects, are size-bounded and verify byte count and SHA-256 before making a temporary PDF URL. Arbitrary external PDF references still require explicit consent. A failed host request or revision mismatch displays an actionable error instead of a fake preview.

A remote reference is metadata, not an offline copy. **Import PDF privately** or Settings' local PDF intake can create a separate private copy with real bytes, even when a matching remote metadata reference already exists. Actual local/bundled SHA duplicates still reuse the existing document. Local files above 12 MiB warn and above 20 MiB are rejected. Original bytes are retained. Use workspace backups for personal state and private bytes; external references alone back up metadata only.

## Existing optional integrated engine

`src/online/PdfEngine.tsx` is retained unchanged. Its preferred pairing remains **React-PDF 10.5.0 / PDF.js 5.4.296** with matching worker/CMap/WASM/font resources. Engine chrome now uses the shared theme tokens; original document artwork is not recolored. No third viewer or fake PDF.js implementation was added.

On a network-enabled development machine:

```sh
npm run enable:online
npm run typecheck:online
npm run build:vite
npm run test:pdf
npm run test:runtime
```

Review and retain the newly resolved optional lockfile before integration. Do not independently force a newer PDF.js version. The fallback source lockfile does not claim to contain an unperformed optional install. The integrated renderer, search, physical-page controls, password and worker-mismatch acceptance rows remain BLOCKED in this delivery.

## Data safety and integration

The bundled catalog has 10 pages, 3 notebooks and 1 term: the original 8 guide/example pages plus 2 external PDF metadata pages. No private reference corpus is included. Imported packs, personal remarks, bookmarks, local additions, stable IDs and conflict rules remain separate and unchanged in architecture. Publication of reference-only metadata requires explicit review and an exact semantic hash; reference-only PDF binaries are still denied from the public app build.

Use **Download workspace backup** before changing origin, browser or machine. A PDF-library ZIP is a content pack, not a workspace backup. There is no telemetry, sign-in, cloud synchronization, AI chat, quiz mode, code execution or second PDF dashboard.

Only publish the extracted build, never source, tests, evidence, private exports or backups. No push, branch, tag, PR, remote CI or deployment was performed for this pass. Coordinator instructions are in `docs/release-1.2/COORDINATOR.md`. Historical 1.1 material is retained under `docs/history/1.1` and is not the current release verdict.
