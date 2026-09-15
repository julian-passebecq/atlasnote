# AtlasNote implementation guardrails

Read START_HERE.md, CODEX_HANDOFF.md and FINAL_TEST_STATUS.md first. They supersede archived implementation prompts.

Continue this source; do not restart, redesign, replace the PDF engine, or reimplement completed UI changes. Keep source IDs, imported content ownership, IndexedDB name/version and the existing backup format. State saves are reading-session checkpoints, not content/library rollback. Bookmarks and Read Later are shared subject-category lists, not workspace-scoped lists. Four-page Grid is separate from two-page Spread. Preserve newer notes/PDFs and separate reading-position bookmarks.

Never weaken meaningful state equality, private-data, asset-integrity, SVG-safety or PDF assertions to obtain green CI. Update only a demonstrably obsolete selector/fixture setup and retain its behavioral assertion. A blocked normal-origin test or unavailable registry audit is unverified, not passed. The about:blank compatibility tests intentionally suppress writes; they cannot certify IndexedDB or integrated React-PDF.

Use the committed package lock and pinned React-PDF/PDF.js pairing. Do not publish `.build/engine-dom`, `dist-offline`, node_modules, source archives, private libraries, font files or workspace backups in the hosted app. Evidence belongs outside tracked source and must state its environment. Preserve dirty local work; do not force-push, reset main, merge or deploy without authorization and the release gates.

## Current 1.2.6 boundary

Native cheatsheets are now explicitly in scope. The older 1.2.5 prohibition on new cheatsheet types is superseded by this implementation. Canonical sources are in `content/cheatsheets`; JSON validation, fixed-page SVG rendering and content integration are in `src/cheatsheets`. Read `docs/1.2.6/ARCHITECTURE.md`, `AUTHORING.md` and `FIXTURE_PROVENANCE.md` before changes. Do not replace structured sources with raster pages, arbitrary SVG, remote assets or many new diagram types. Re-run the generator and review its semantic publication hash after source changes.

The 15 interview pages remain ordinary notebook references. Keep the canonical SQL sequence and related-link integration; no scoring, code execution or LeetCode UI. The PDF wheel gate must use actual wheel events and rendered physical canvases, not page-input-only substitutes. Preserve per-pane controls, separate document Context/Workspace States and the non-destructive PDF tree.

The remaining job is integration verification, not another redesign. Do not treat recovery-mode green checks as a production release certificate.
