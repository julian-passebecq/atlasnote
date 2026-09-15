# AtlasNote 1.2.6 - integration and release verification

## Exact destination

Repository: `julian-passebecq/atlasnote`.
Released starting commit: `d1ecfd70c2f9d72c374a1c1c897d10a05d718dc5`.
Branch: `feature/atlasnote-1.2.6-native-cheatsheets`.
Final local implementation SHA: see the external delivery manifest. It is not an upstream commit unless separately pushed after delivery.

This is completed source implementation. Do not restart the application, re-code the four fixtures, change the grammar direction, remove native features, merge main or deploy Netlify. Read FINAL_TEST_STATUS.md before interpreting green compatibility tests.

## Integrate the source safely

Use either the complete source ZIP or the binary patch, never both. Preserve the target repository's `.git` directory and unrelated local work. Do not extract a nested ZIP root into the repository as a subfolder. The source root is the folder containing package.json, src, content and tests.

On a clean local repository at the specified baseline, the patch route is:

```sh
git fetch origin
git switch -c feature/atlasnote-1.2.6-native-cheatsheets d1ecfd70c2f9d72c374a1c1c897d10a05d718dc5
git apply --check /path/to/AtlasNote_1.2.6_changes.patch
git apply /path/to/AtlasNote_1.2.6_changes.patch
git status --short
```

If that branch already exists, inspect it first; do not force-reset it. If main has moved, keep the supplied exact baseline until reviewing the intervening changes rather than blindly replacing newer files. A source ZIP creates a new local integration commit, which need not have the same SHA as the implementation workspace commit.

## Required full verification on a normal developer machine

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

The runner attempts all 37 gates and preserves logs even after a failure. Do not skip failed gates, force npm installs around the lockfile, relax exact backup equality, mock IndexedDB in the runtime gate, or replace actual PDF canvas/wheel assertions with page-number updates.

The old 34 gates remain. New commands are `test:cheatsheets`, `test:cheatsheets:ui`, and `test:cheatsheets:runtime`. The last uses the real app entry, reload and an empty browser context for backup restore. `ATLAS_DIST=dist-offline` is only a diagnostic: it cannot clear the real PDF Compare case or production bundle.

## Priority acceptance checks

First obtain the pinned integrated dependencies and a successful `typecheck:online` / `build` / `check:release`. Then run the real PDF component/grid/wheel and existing runtime suites plus the native runtime suite. Verify a native cheatsheet beside a genuinely rendered PDF canvas, not the compatibility fallback. Verify existing 1.2.5 state reload, local native JSON edits, stable physical anchors/remarks through a page reorder, full saved-workspace state, and exact backup restoration into a fresh browser profile.

The compatibility tests already exercise 1200 x 1600 SVG geometry, live text, the full eight-page content, a synthetic four-page 2x2, independent panes and controls, actual interview Compare, reading actions, Context/search/Related, source validation/edit/export, saved state and backup decoding. Do not call this durable browser persistence evidence.

Inspect the four required documents at fit-page/fit-width/zoom and 390/1024/1440 widths. Fixed pages intentionally do not become responsive articles. Source-dialog editing should retain the current stable page rather than reopen page 1. In normal use, test real OS text selection/copy in addition to the existing synthetic copy-event checks.

## Content and security review

Read docs/1.2.6/FIXTURE_PROVENANCE.md. The original JSON was not supplied and ADF page 1's preview was absent. Count differences are documented; do not fabricate a claim that the missing 153-block/564-fragment originals were reproduced. Technical claims are inherited from user references, not independently vendor-verified. The pack has no raster or drawing fallback. Native code is a string, not executable content.

Keep the unchanged PDF engine and 15 interview reference files. Existing IndexedDB/database version and backup envelope are unchanged. Never erase personal data as a migration shortcut. Do not publish source archives, compatibility builds, test backups, font files or private libraries.

## Report back

Return the actual branch/commit, all 37 gate outcomes and logs, the new nine-case normal-origin result, and any fixes as explicit diffs. Separate application defects from unavailable environment prerequisites. Only after successful gates and explicit user authorization should production promotion be considered.
