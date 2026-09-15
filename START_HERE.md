# AtlasNote 1.2.6 - native cheatsheets implementation

This is the complete implementation source, not an implementation prompt or a deployed release. Continue it; do not re-create this pass.

| Identity | Value |
|---|---|
| Branch | `feature/atlasnote-1.2.6-native-cheatsheets` |
| Exact released starting commit | `d1ecfd70c2f9d72c374a1c1c897d10a05d718dc5` |
| Verified starting tree | `54c81ded491a3b75ec2c0a4650ab585245a7fff6` |
| Current implementation commit | See the external delivery manifest or `git rev-parse HEAD` in the preserved implementation workspace. A source ZIP itself has no Git history. |
| Upstream writes / merge / deployment | None |
| Acceptance | Not release-cleared; read `FINAL_TEST_STATUS.md` |

The exact 1.2.5 release includes its final continuous-PDF-wheel fix. Both that PDF engine file and all 15 interview source pages are preserved. This source was not started from the older 1.2.5 pre-release ZIP without that fix.

## What is implemented

Four native two-page cheatsheets appear under **Study references / Cheatsheets**. JSON is canonical; a bounded deterministic renderer emits SVG with selectable text. Single, two-page, true four-page 2x2, Compare, per-pane controls, physical-page navigation, bookmarks, Read Later, outline/search, remarks, Related, saved locations, private JSON editing and exact backup payload handling use the existing AtlasNote systems.

Use **More / Settings > Import cheatsheet JSON** to import a private canonical source. With a cheatsheet active, **Edit cheatsheet source** edits its local overlay. The download control exports canonical JSON, not a screenshot. The 1200 x 1600 page does not reflow on mobile: use fit/zoom to read it.

## Read next

1. `FINAL_TEST_STATUS.md` - executed checks and the remaining integrated release blockers.
2. `CODEX_HANDOFF.md` - exact integration and verification commands; no redesign required.
3. `docs/1.2.6/ARCHITECTURE.md`, `AUTHORING.md`, and `FIXTURE_PROVENANCE.md` - schema, renderer, state, and source limitations.
4. `CHANGED_FILES.md` - implementation inventory.

The handoff supplied seven PNGs and no original canonical JSON, renderer, or formal schema. The four fixtures are explicit structured reconstructions, not a claim to recover the absent originals. ADF page 1 was reconstructed from TEST_PACK only and is labeled in its source and visible page caption. The original block/text counts are not claimed as this implementation's counts.

## Build boundary

Use the committed lockfile and `npm ci` for the integrated React-PDF/Vite build. Run `npm run test:release` after installing the existing Python test requirements and Chromium. Do not deploy `dist-offline`: it is an intentionally separate compatibility build and has no integrated PDF renderer. No new package dependency was introduced by this pass.

Do not merge or deploy until the outstanding gates pass and the user authorizes promotion. Keep the existing IndexedDB name/version, stable content IDs and exact backup format. Never solve an upgrade issue by resetting the user's library.
