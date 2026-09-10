# AtlasNote 1.1 - reader UX + PDF library master spec

This branch is the **integration target** for the next Pro implementation pass. It starts from production `main` at `cd540091ae0735887737579e1c24d63c2ba99ddd` (AtlasNote 1.0.1 hardened).

The Pro model may have no GitHub/Netlify/npm access. It should implement locally from the supplied hardened source ZIP and return a complete source ZIP. The coordinating ChatGPT session will apply the result to this branch, run CI, create a deploy preview, and only then merge.

## Product boundary

AtlasNote remains a local-first linked knowledge/document reader. This pass does **not** add quiz/QCM, code execution, graph view, cloud auth/sync, collaborative editing, OCR, PDF editing, or browser-to-GitHub credentials.

## Reader UX

### Focus
Focus is true reading focus: content uses the full app viewport (`100dvh`) from top to bottom. Hide top app bar, project sidebar, utility rails, right context panel/rail, bottom status, tab strip, breadcrumbs, and reader toolbars. Retain only a small Exit Focus overlay and Escape support. Preserve semantic reading position when entering/exiting or repaginating.

Focus + Compare = two content panes + divider + tiny Exit Focus control.

### Compare
Compare is two independent document workspaces. Opening Compare creates an empty content-picker pane rather than cloning the current page. Clicking Compare again closes it and keeps the active non-empty pane. Preserve the last user-resized ratio for the next Compare session.

Each pane owns its own tabs, history, reading position, Book/Continuous/Parallel state, PDF mode, and English visibility.

### Book
Book is not Compare. Book paginates one Atlas note into consecutive virtual sheets using the existing measured/block-aware paginator. Keep semantic source IDs; generated sheet numbers are presentation state only.

### Themes
Keep three light themes and make them genuinely distinct via semantic design tokens:
- `fluent`: Microsoft Fluent
- `neutral`: Light Minimal
- `academic`: Medium / Paper

No dark mode in this pass.

## PDF as a first-class library item

PDFs and Atlas notes are equal tree leaves. A notebook/project may contain nested folders mixing both.

Example:

```text
Microsoft Fabric
  Architecture
    OneLake                         [note]
    Architecture cheatsheet.pdf    [PDF]
  Certification
    DP-600
      Study notes                   [note]
      DP-600 guide.pdf              [PDF]
```

A PDF keeps one stable `pageId`/`documentId`. Moving it changes only tree placement, never identity, remarks, bookmarks, or reading state.

### Local/private PDFs
Default for personal study material and PDFs whose redistribution rights are unclear:
- choose PDF;
- choose notebook/project and nested folder;
- optionally create a folder during import;
- preserve exact PDF bytes in IndexedDB;
- include exact bytes in complete backup/restore;
- keep them out of the public GitHub/Netlify application.

### Repository-managed PDFs
Only for intentionally redistributable/public documents. Use the existing pack-file contract: asset + SHA-256 + page stub + tree leaf + `atlas-documents.json` entry. Current public release rules remain authoritative.

## PDF metadata taxonomy

Do **not** create a project/folder level for every classification. Tree placement is the primary human organization; metadata is a separate faceted layer.

For AtlasNote 1.1 avoid a disruptive schema redesign. Use existing fields plus namespaced Page tags:

- `DocumentEntry.language`: primary language, ISO-style code such as `en`, `no`, `fr`.
- tree placement: one canonical project/folder path.
- wrapper Page `tags`:
  - `doctype:cheatsheet|guide|reference|slides|article|whitepaper|certification|diagram|other`
  - `domain:cloud-architecture|data-engineering|data-modeling|bi|sql|python|language|interview|...`
  - `tech:microsoft-fabric|azure|databricks|spark|dbt|airflow|power-bi|...`
  - `level:overview|fundamentals|intermediate|advanced|reference`
  - `source:linkedin|vendor|web|personal|other`
- Page summary: one-line description.
- Page.sources / Document rights: provenance, author/publisher/source URL when known.

One PDF may have many domain/technology tags but only one canonical tree placement. Do not duplicate the same page in multiple projects; surface cross-cutting relevance through search/filter/related pages.

For LinkedIn cheatsheets, default to `rights.status = reference-only` or `unreviewed` unless redistribution permission is established. Do not infer a permissive license from the fact that a PDF was publicly downloadable.

## Folder collection view

Selecting a folder should open a lightweight derived collection view built from the existing tree, not a second database. Show direct child notes/PDFs with icon, title, summary, page count if known, language, and learning flag.

Filters should remain small but useful:
- All / Notes / PDFs
- Language
- Domain
- Technology
- text filter

Default sort remains tree order; optional title sort is sufficient.

Support normal open, Ctrl/Cmd-click or middle-click to internal tab, context menu, Open in other pane, move, bookmark, archive.

## PDF intake / compression architecture

PDF processing is a **pre-publish authoring step**, not a browser requirement.

Never rasterize entire pages just to reduce size; that would destroy selectable text/vector content. Use a staged pipeline:

1. Validate `%PDF-` signature and safety limits.
2. Record page count, byte size, SHA-256 and text-layer presence.
3. Deduplicate by content hash.
4. Run lossless structural cleanup first.
5. If still large and image-heavy, optionally recompress/downsample embedded images while preserving text/vector objects.
6. Verify page count and, when text exists, normalized extracted text before/after.
7. Render sample/all pages for visual QA when lossy processing was used.
8. If optimized output is larger, retain the original.
9. Record processing provenance and compression ratio.

Profiles:
- `lossless` (default): object cleanup/dedup/stream compression only.
- `study`: for image-heavy screen-reading PDFs; image DPI threshold about 220, target about 160 DPI, JPEG quality about 82.
- `compact`: explicit opt-in only; roughly 180 -> 130 DPI and quality about 75.

Do not make Ghostscript `/screen` or `/ebook` the silent default; those presets alter more than image resolution. Prefer a PyMuPDF `rewrite_images()`-style implementation for controlled image recompression and preserve vector/text content.

AtlasNote currently enforces a 20 MiB per-asset safety limit. Keep it for this pass. Operational target: <= 12 MiB per prepared PDF; warn above 12 MiB; reject pack import above 20 MiB. If a document cannot reasonably fit, keep it local/reference-only rather than silently raising the safety ceiling.

## Separate PDF repository contract

A separate PDF repository is useful to keep binary churn out of the application repository. **Do not use Git branches as PDF categories.** Branches are change/version workflow, not taxonomy.

Recommended repository name: `atlasnote-pdf-library`.
Recommended default visibility for LinkedIn/personal study material: **private**.

Suggested layout:

```text
README.md
library/
  library.json
  collections.json
  documents/
    <document-id>.json
assets/
  pdf/
    <document-id>/
      <slug>.pdf
incoming/                 # gitignored; raw files before processing
tools/
  prepare_pdf.py
  build_atlas_library.mjs
  validate_library.mjs
out/                      # gitignored generated Atlas import ZIPs
```

Binary asset paths are identity-oriented, not taxonomy-oriented, so reclassification does not move binary history. Human organization lives in metadata/tree placement.

Use one `main` branch. For batches, temporary branches such as `ingest/2026-09-linkedin-cheatsheets` are fine and merge to main after validation. Do not create `azure`, `databricks`, `norsk`, etc. branches.

Because the AtlasNote app is public and has no GitHub authentication, a **private PDF repo must not be fetched directly by the browser**. Instead `build_atlas_library.mjs` produces a standard Atlas private library ZIP that the user imports locally. Public/redistributable PDF packs may alternatively be published as ordinary pack-file content.

## PDF repo metadata record

The richer PDF source repository may use a sidecar record like:

```json
{
  "schemaVersion": 1,
  "id": "pdf.fabric.onelake.cheatsheet",
  "title": "OneLake cheatsheet",
  "language": "en",
  "documentType": "cheatsheet",
  "primaryPlacement": {
    "projectId": "project.fabric",
    "folderPath": ["Architecture", "Cheatsheets"]
  },
  "domains": ["cloud-architecture", "data-engineering"],
  "technologies": ["microsoft-fabric", "onelake"],
  "topics": ["lakehouse", "storage"],
  "level": "reference",
  "source": {
    "platform": "linkedin",
    "url": "https://...",
    "author": "..."
  },
  "rights": {
    "status": "reference-only",
    "attribution": "Found via LinkedIn; redistribution permission not established."
  },
  "file": {
    "path": "assets/pdf/pdf.fabric.onelake.cheatsheet/onelake-cheatsheet.pdf",
    "sha256": "...",
    "bytes": 1234567,
    "pageCount": 8
  },
  "processing": {
    "profile": "study",
    "originalBytes": 4200000,
    "optimizedBytes": 1234567,
    "processor": "pymupdf",
    "processedAt": "2026-09-10T00:00:00Z"
  }
}
```

The PDF-repo pack builder maps this to the existing AtlasNote schema: language -> `DocumentEntry.language`; placement -> projects tree; facets -> namespaced Page tags; provenance/rights -> Page.sources + DocumentEntry.rights.

## PDF engine

Preserve the existing advanced React-PDF implementation. When dependencies are available, pin and verify React-PDF 10.5.0 with its matching `pdfjs-dist` 5.4.296. Worker, CMaps, WASM, and standard-font assets must come from the same PDF.js version. The browser preview remains an honest fallback, not the definition of completed integrated PDF support.

## Acceptance priorities

Before importing the real corpus, prove:
- Focus truly fills the viewport and restores position;
- Compare opens empty, toggles off, preserves ratio and independent tabs/state;
- Book remains same-note measured pagination;
- all three themes are visibly distinct and persisted;
- local PDF import into nested folder + reload + complete backup/restore;
- mixed folder collection view and facet filters;
- note+PDF and PDF+PDF Compare;
- repository/private-library PDF pack import with hash validation;
- prepare/compression helper preserves page count and text layer and records provenance;
- same PDF cannot be duplicated by hash without explicit override;
- rights/provenance are never silently upgraded;
- no private PDF/corpus appears in public `dist`.
