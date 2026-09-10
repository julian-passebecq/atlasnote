# Knowledge Atlas

A local-first, OneNote-like knowledge reader built from the Knowledge Atlas V2 Fresh Start MegaPack. This repository is the first application release, not another content-only checkpoint.

![Reader interface](docs/evidence/06-compare-desktop.png)

**Release status: usable offline note reader; advanced PDF/Vite build and full persistence integration certification remain incomplete.** Read [RELEASE_REPORT.md](docs/RELEASE_REPORT.md) before treating this as a fully accepted release. The production ZIP contains only reviewed public examples and help pages. Import the separate private library to study the full corpus.

## Start the supplied prebuilt application

Extract `knowledge-atlas-v1-built.zip` into its own folder. On Windows, double-click `Start_Atlas.cmd` with Node.js or Python installed. Alternatively run one of these commands inside that extracted folder:

```sh
node serve.mjs
# or
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173`. Do not open `index.html` as a `file://` URL. The build is also a normal static site: deploy the extracted build folder, whose root contains `index.html`. No account, API key or backend is required.

## Run the source

Use Node.js 22.12 or later and npm. From the source repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. `npm run build` creates `dist/`; `npm run preview` serves the existing build. The locked offline build uses real vendored React/Mermaid and installed TypeScript, Prism and JSZip. It is an explicit TypeScript-to-ESM fallback, **not a claim that Vite ran here**.

## Load the complete private library once

1. Keep `knowledge-atlas-local-library-private.zip` outside the source repository and outside the folder served as the website. Do not extract it into `public/` or `dist/`.
2. Open **Workspace settings -> Import library -> Choose library ZIP**. Select that separate private ZIP.
3. Review the import preview: **137 pages, 685 glossary terms, five projects in six packs**. Confirm the import. The original public starter/help notebooks remain separate; totals in the app therefore include those as well.
4. The complete library is designed to persist in that browser profile on that same site address. Use **Download workspace backup** regularly. That backup includes your additions, personal remarks, flags, bookmarks, reading views and local PDF bytes. A content-only export does not replace it.

Use one active browser tab for editing this workspace; use Atlas's internal tabs and Compare panes for parallel reading. Simultaneous writing from multiple browser tabs is not coordinated in this release. Clearing site data removes locally stored work. There is no cloud sync. A ZIP backup is not encrypted.

## Reading and editing

Continuous is a normal note scroller. Book measures the real rendered note and generates numbered viewport-sized sheets; Focus mode or collapsed sidebars give enough room for consecutive pairs. Compare is two independent, resizable document panes, with up to five internal tabs per pane. Parallel presents NO/EN content pairs; English visibility belongs to each view. The same document can be compared against itself.

The notebook tree supports project/folder/page creation, movement, renaming and archives. The page editor changes Markdown text without replacing structured code, tables, questions or bilingual blocks. An advanced JSON editor validates the complete page before saving. Stable page/block IDs and links are preserved. Local edits are overlays, not direct writes to GitHub.

Use the context panel for glossary definitions, linked pages, section navigation and remarks. Learning flags are independent from source content and are not erased by hiding them. Export to AI produces a local preview/copy/download; it does not call an AI service. Answers and remarks are excluded unless explicitly enabled; private content requires acknowledgement. Printing uses an explicit selection and the browser's print dialog.

## PDF status and optional Vite build

**The prebuilt offline ZIP has browser PDF preview/open/download and private PDF attachment storage. It does not have Atlas-controlled PDF pagination, selectable-text search or physical-page spreads.** It says so in its interface. Do not confuse note Book sheets with physical PDF pages.

The separate `src/online/PdfEngine.tsx` adapter implements a React-PDF path for physical single/continuous/spread layouts, a matching local worker, page input, zoom/rotation, outline, text search, password prompts held in memory, page/revision anchors and visibility-based page rendering. This adapter was syntax-checked only; its packages, type compatibility, Vite build and real PDF behavior were **BLOCKED and are not certified**.

On a network-enabled computer, the exact next attempt is:

```sh
npm run enable:online
npm run build:vite
npm run preview
```

`enable:online` intentionally changes `package.json` and `package-lock.json` to the actually installed exact versions. Review and commit both after testing. Do not independently force-install the newest `pdfjs-dist`. The worker is copied from the wrapper's resolved dependency. Run the PDF matrix in `docs/TESTING.md` before publishing that optional build. The default build remains the tested offline note reader.

## Tests and tools

```sh
npm run validate
npm run typecheck
npm test
npm run check:release
```

`npm test` first builds the application, then runs its Node tests. For browser tests install Python Playwright and Chromium; see `docs/TESTING.md`. The included evidence distinguishes actual DOM checks, actual pure-core round trips and blocked real-origin persistence checks.

`node tools/package-library.mjs INPUT_WORKSPACE OUTPUT.private.zip` validates and packages a canonical private library. `tools/migrate-workspace.mjs` explicitly migrates @1 blocks to @2 IDs without overwriting its input. `tools/audit-private-library.mjs` compares original/migrated private workspaces without embedding them into this repository.

## Manual GitHub upload / static hosting

Extract the **source ZIP**, and copy its contents into the root of `julian-passebecq/deepnote_jul` using GitHub Desktop or your normal Git workflow. Include `package.json`, `package-lock.json`, `src`, `content`, `tools`, `tests`, `public`, `docs` and the dotfiles. Do not upload the ZIP file itself as a substitute for source, `node_modules`, a private library, workspace backups or private source material.

For a conventional static builder, use build command `npm ci && npm run build` and output directory `dist`. `netlify.toml` includes those settings. A manual GitHub Pages workflow is included but has not been run remotely. This delivery does not change any existing repository or live site.

## Scope and licenses

No quiz/grading engine, execution kernel, Monaco IDE, graph mode, AI chat, sign-in, Drive OAuth, browser GitHub publishing or cloud sync is included. Interview questions with optional answers are ordinary content blocks.

See `LICENSE` and `THIRD_PARTY_NOTICES.md`. Original application code is MIT; that does not relicense private educational material or third-party assets. The transitive license/SBOM audit of the emergency vendored Mermaid closure remains an explicit release limitation.
