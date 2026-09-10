# AtlasNote 1.1 PDF collection requirements

This draft mirrors the Pro handoff addendum. It is intentionally scoped to the existing Page + DocumentEntry model.

## Goal

AtlasNote should support mixed note/PDF collections under the same recursive project/folder tree. PDFs should be first-class leaves that can be opened in tabs, Compare and Focus, bookmarked, remarked on, moved between folders and preserved by backup/restore.

## Two ingestion paths

1. Local/private PDF (default): import through the app, choose notebook/folder, store bytes in IndexedDB, keep out of GitHub/Netlify.
2. Repository-managed PDF: for intentionally redistributable/public material only. Store as a pack asset, list it in atlas-pack.json, index it in atlas-documents.json with source.kind=pack-file, associate it with a stable pageId, and place that pageId in projects.json.

The public repository must not become a storage location for private or unlicensed PDFs.

## Collection UX

Selecting a folder may open a lightweight derived collection view listing its direct child notes/PDFs with type icon, title, optional summary/attribution, page count and language. The tree remains the single source of truth. Support normal open, internal new tab, other Compare pane, bookmark, move and archive.

## Repository authoring helper

Add tools/add-pdf-to-pack.mjs with dry-run support. It should validate PDF bytes, compute SHA-256/size, copy into the pack, create/update the page stub and tree leaf, update atlas-documents.json and manifest assets, bump the pack patch version, and reject collisions. No GitHub auth is added.

## Acceptance

- mixed notes and PDFs in nested folders;
- local PDF import into chosen folder;
- local bytes survive reload and backup/restore;
- repo pack-file PDF hash validation;
- note + PDF and PDF + PDF Compare;
- PDF Focus uses maximum canvas;
- moving a PDF does not change its stable page/document identity;
- existing PDF fallback/integrated-engine honesty rules remain intact.

## Existing architecture confirmation

The current source already has the primitives needed for this feature. `DocumentEntry` supports `pack-file`, `library-file`, HTTPS, external-link and local sources. The pack loader maps `pack-file` documents to verified pack assets and checks PDF byte/hash consistency. The reader resolves a PDF by matching its `pageId`, so a PDF can use the same recursive tree placement as a normal Atlas page. This pass should therefore extend workflow/UX rather than introduce a parallel document database.
