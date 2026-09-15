# AtlasNote implementation guardrails

Read START_HERE.md, CODEX_HANDOFF.md and FINAL_TEST_STATUS.md first. They supersede older archived implementation prompts.

Continue this source; do not restart, redesign, replace the PDF engine, or reimplement completed UI changes. Keep source IDs, imported content ownership, IndexedDB name/version and the existing backup format. State saves are reading-session checkpoints, not content/library rollback. Bookmarks and Read later are shared subject-category lists, not workspace-scoped lists. Four-page Grid is separate from two-page Spread. Preserve newer notes/PDFs and separate reading-position bookmarks.

Never weaken meaningful state equality, private-data, asset-integrity or PDF assertions to obtain green CI. Update only a demonstrably obsolete UI selector/setup for the documented new interface and retain its behavioral assertion. Treat a blocked normal-origin test or unavailable registry audit as unverified, not passed.

Use the committed package lock and pinned React-PDF/PDF.js pairing. Do not ship `.build/engine-dom`, `dist-offline`, node_modules, source archives, private libraries or workspace backups. Test artifacts belong outside tracked source and must clearly state their environment.

Preserve dirty local work; create a clean work branch. Do not force-push, reset main, merge or deploy without the release gates and user authorization.
