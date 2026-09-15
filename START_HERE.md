# AtlasNote 1.2.4 - complete implementation checkpoint

Read this file, CODEX_HANDOFF.md and FINAL_TEST_STATUS.md first. They supersede old delivery prompts and archived release reports.

## What this package is

The complete application source for the 1.2.4 reading-managers and four-page PDF pass. It is not a patch-only handoff and is not a certified production deployment. Source, lockfile, tests, release-gate changes and documentation are included. Generated application bundles and node_modules are intentionally excluded.

1.2.4 was not pushed, merged or deployed by this pass. The reference release is main at `f82c336464e3faafa12e8ad888f9415c2e23f5e2` (1.2.3). The prior chat's unzipped 1.2.4 source was not present in the active runtime: only screenshots and reports survived. This checkpoint reconstructs the requested 1.2.4 implementation on the complete supplied 1.2.3 archive plus the published runtime-test corrections. Old 1.2.4 screenshots are not used as current test evidence.

## Included behavior

- Top-left: PDF/Notes, Search, Back, Forward, notebook sidebar, active-pane reader controls. Reader controls start hidden; explicit saved visibility is retained.
- Right rail: paired Focus/Compare, Swap/Context, Bookmarks/Read later, workspace Save/Restore, all-workspaces Save/Restore, Theme/Export, then More.
- Separate Bookmarks and Read later panels, each with All / Informatics / Cloud / Norsk / Job / Personal tabs. Lists are shared across workspaces.
- Pasted HTTP(S) links, editable titles/notes/categories, read status and confirmed removal. Links are not fetched automatically.
- Context contains Workspace saves (1-5), All-workspace saves, Remarks and Page details. Restoring reading states does not roll back newer library content or reading lists.
- PDF -> top-level category -> short page-heading links. Subcategory headings become page rows; concept/glossary branches no longer clutter the tree. Metadata and definitions remain on demand.
- Page action menus open here, in a new tab, the other pane or a selected workspace, or save to Bookmarks/Read later. Full panes are not overwritten.
- Actual four-page PDF.js 2x2 grid with physical-page selection, fit, rotation, partial final groups, keyboard/wheel navigation and independent Compare. Existing two-page Spread remains separate.

## Start locally

Use Node 22 (>=22.12). Preserve the exact committed package-lock.json.

```sh
npm ci
npm run build
npm run preview
```

Do not open index.html directly. Use the local URL printed by the server. `npm run build` produces the hosted integrated React-PDF distribution in `dist/`; `dist-offline/` is compatibility-only and must not be deployed.

## Integration

Prefer Codex with a clean worktree on a new branch, `feature/atlasnote-1.2.4-reading-managers`, based on the main reference above. Follow CODEX_HANDOFF.md. Do not overwrite uncommitted work or delete .git. The package-only handoff directory includes a diff against the recovered local baseline and inventories; the complete source remains authoritative.

Run the normal-origin suites and clean registry checks in an unrestricted local/CI environment before merging or deployment. See FINAL_TEST_STATUS.md for what was actually run here.
