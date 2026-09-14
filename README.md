# AtlasNote 1.2.3

Local-first notes and PDF reading, continuing the verified 1.2.2 application. Start with **[START_HERE.md](START_HERE.md)**. This delivered source has not been merged or deployed.

## Reader and navigation

Five independent study workspaces retain their tabs, panes, history, positions, category filters and layout. The left library header contains Notes/PDF, sidebar toggle, Back, Forward and Search. There is no separate global topbar or redundant library-heading text. Search and history remain clickable in a narrow dock when the notebook sidebar is collapsed. Ctrl/Cmd+K still opens global search.

Each reader starts with A/B, the small new-tab **+**, Show/Hide reader controls, then document tabs. Controls default to hidden; an explicitly saved visible preference is respected. Quick Book/PDF Spread is a document layout control. Compare and Focus are separate right-rail actions. The right rail begins Focus, Compare, separator, Swap, Context, separator, reading bookmark and Theme. Compare preserves independent panes rather than cloning the current document.

PDF study metadata is in the notebook tree below each PDF. Opening its title does not expand it. Its disclosure opens top-level categories and Glossary, while nested categories/pages remain collapsed until chosen. Physical-page links navigate the active reading pane; definitions and metadata editing are on demand. The former bottom PDF Companion panel no longer occupies reader space. Existing companion data, revision checks, JSON import/export, glossary promotion and local extraction are retained.

Single-page wheel navigation scrolls the current physical page normally and turns at an edge. Slow mouse ticks accumulate, canvas padding is not treated as unread content, and sustained momentum does not skip multiple pages. Continuous mode retains native scrolling. Five themes, note Book pagination, native PDF fallback, Focus and private local intake remain supported.

## Saved reading states

Five additional bottom-right buttons save/restore the current workspace, save/restore all five workspaces, and open a compact manager. Saves are immutable reading-session checkpoints with a date, editable title and optional progress/next-step note. The manager has scopes 1-5 and All, explicit deletion, an undo point before each restore, and the last 30 save/restore/rename/delete actions.

A workspace save targets its original slot. Other slots are unchanged. An all-workspaces save also restores the active slot and preserves uninitialized-slot absence. Tabs, histories, note/PDF positions, layout, filters, theme and disclosure state are included. **Notes, library content, PDF files, imports, shared glossary, flags and reading-position bookmarks are not rolled back.** Use Settings > Download workspace backup for a portable full-library backup; that backup includes the new saved states and undo/history records too.

There are 20 manual saves per scope (up to 120), one current undo point per scope, 30 recent activity events, and a 6 MiB saved-state budget. A limit produces an error rather than silently deleting manual saves. These saves are local to this browser profile and origin; they are not cloud sync or a replacement for an exported backup.

## Build and test

Node >=22.12.0; Python requirements are needed only for tests/optional PDF authoring.

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

The release runner retains logs and exits nonzero for failure or blocking. It includes clean install and npm audit, all existing compatibility and normal-origin tests, the new UI and saved-state runtime suites, and an isolated actual PDF-component harness. `.github/workflows/ci.yml` runs the same release-critical gates. No workflow writes source or deploys this delivery automatically.

For a local preview: `npm run build && npm run preview`. The build outputs `dist/`; `netlify.toml` remains configured for the existing integrated app. The test harness is built only by explicit `npm run build:test-harness` into `.build/engine-dom`, never `dist`. It is not a production entry point.

See [FINAL_TEST_STATUS.md](FINAL_TEST_STATUS.md) for the evidence scope. Normal-origin browser-policy failures in this environment must not be described as passing persistence tests.

## Provenance and privacy

Based on remote `main` commit `476f327ae77eb9103f2e5d079b87b6a541ddc782`, tree `2d07e499cab9236f5a098e2d08513f98f3e1b4f3`. The baseline reconstructed from the downloaded verified GitHub source plus the two merged stylesheet changes was checked against that exact tree before editing. This pass does not include the private 137-page reference library, personal workspace backups or credentials. Public PDF links remain pinned to their existing reviewed references. Historical documents under `docs/history/` describe older releases, not current acceptance results.
