# AtlasNote - Knowledge Atlas reader

A local-first notebook reader with folders, linked pages, glossary context, Book pagination and independent Compare panes. This repository continues the existing Knowledge Atlas application; the on-screen identity and database are retained.

**Release 1.0.1: reader hardening, with explicit outstanding runtime gates.**

## Run the source

Use Node.js 22.12 or later from the repository root:

```sh
npm ci
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. The static output is `dist/`. No account, backend or API key is needed for the reader. Do not open `index.html` as a file.

For the prebuilt ZIP, extract it and run `node serve.mjs`, or use `Start_Atlas.cmd` on Windows with Node.js or Python installed. Keep the server terminal open.

## Reader workflows

**Compare** opens a second independent pane. Clicking Compare again keeps the **active pane**, including all its tabs, history, layout, English visibility and anchors. The per-pane close buttons still work. Focus sits immediately before Compare and restores the previous sidebar state on exit. Escape exits Focus.

Right-click a page, use its More menu, or press Shift+F10 to open it, create a fresh internal tab, send it to the other Compare pane, bookmark, rename, move or archive it. Ctrl/Cmd-click and middle-click open new internal tabs. Each pane supports five tabs. Search results also have a dedicated new-tab button.

Book paginates one note into real DOM-measured sheets. A wide single pane displays consecutive pairs, 1-2 then 3-4. This is separate from Compare. Home has a long-note Book example. Font and viewport changes restore the source anchor; oversized unsplittable blocks link to their complete Continuous source.

## Import your library and preserve local work

The public app includes only the reviewed generic starter: **8 pages, 2 notebooks, 1 glossary term**. It does not embed the private corpus. In Workspace settings, choose **Import library ZIP**, inspect the preview and confirm. The existing separate private library ZIP remains compatible.

Remarks, learning flags, bookmarks, local additions and view state are separate from imported source packs. Stable IDs retain relationships across source moves. Equal-version changed bytes, older versions, missing IDs and local-edit conflicts are blocked instead of silently overwriting data.

Use **Download workspace backup** before switching machines, browsers or origins. A backup contains the complete selected content snapshots, attachments and personal state; an ordinary content export is not a backup. Restore asks for explicit replacement consent. Required missing or corrupt attachment bytes prevent an incomplete backup from being offered.

Local storage remains the existing `knowledge-atlas` IndexedDB database, schema version 2. This update does not reset it. `localhost`, `127.0.0.1` and a hosted site are different origins; use a backup to transfer between them. There is no cloud sync.

## PDF builds: do not confuse them

The supplied **deployable ZIP uses the honest browser-PDF fallback**. It preserves original PDF bytes and exposes browser preview, original open and download links. It does not claim integrated physical-page controls or PDF text search.

The existing advanced implementation remains in `src/online/PdfEngine.tsx`. Its compatible-worker path, PDF.js rendering, physical spreads, cover-alone mode, outline, search, rotation and password handling have not been replaced. This pass adds cover-aware spread stepping, a worker-error retry fix, source checks and runtime tests.

On a network-enabled development machine, the optional path is:

```sh
npm run enable:online
npm run typecheck:online
npm run build:vite
npm run test:pdf
```

Installation writes exact resolved versions into `package.json` and `package-lock.json`; review and commit both only after the gate passes. Worker/resources come from the PDF.js version resolved by React-PDF. Do not independently force a newer PDF.js version. The optional path is **not certified by the delivered fallback build**.

## Verification and release status

Read [the release report](docs/RELEASE_REPORT.md), [all 139 acceptance rows](docs/RELEASE_ACCEPTANCE_MATRIX.md) and [test commands and evidence scope](docs/TESTING.md).

The hardening run passed 106 core tests and 53 Chromium UI/layout checks. Normal-origin IndexedDB/download/fresh-context tests were attempted but blocked by administrative browser policy. React-PDF installation, installed-dependency typechecking, Vite bundling and PDF runtime were blocked by unavailable npm downloads. These are not substituted with simulated passes.

Every vendored file remains pinned and its bytes are verified. The inherited precompiled Mermaid closure still needs a complete original transitive dependency/license inventory; registry vulnerability checks could not run. See `THIRD_PARTY_NOTICES.md`. The local byte audit does not certify that missing work.

## Static hosting

For a source build, use `npm ci && npm run build` and publish `dist`. For a prebuilt deployment, publish the extracted build **contents**, with `index.html` at the root. `public/_headers` is copied into `dist/_headers` for Netlify, including direct static uploads. Actual local HTTP responses and packaged headers were tested; no live Netlify deployment was changed or certified.

`.github/workflows/ci.yml` runs core, DOM and real-origin persistence gates. `.github/workflows/pdf-runtime.yml` is a separate manual network-enabled PDF gate. They are included for reproducibility; no remote workflow was triggered during this delivery.

Original code is MIT-licensed. Private library material and third-party dependencies retain their own rights and notices. No quiz engine, notebook execution environment or graph mode was added.
