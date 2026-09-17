# AtlasNote 1.2.3 - start here

This is the **complete source**, not a redesign and not a patch-only handoff. It combines the simplified reader/sidebar pass with lightweight workspace-state saves. The live site and GitHub were not updated by this delivery.

## Use this folder

The repository root is the folder containing this file and `package.json`.

```sh
npm ci
npm run check:integrated-deps
npm run typecheck
npm run typecheck:online
npm test
npm run build
npm run check:release
npm run preview
```

Node **22.12 or newer** is required. Use the committed lockfile; do not run `enable:online` or regenerate the dependency versions. The integrated build is `dist/`. The separate compatibility build is `dist-offline/`; do not deploy it as the integrated app.

## Integrate without overwriting another version

Read `CODEX_HANDOFF.md`. The included `handoff/changes.patch` applies to the verified source tree of GitHub `main` commit **476f327ae77eb9103f2e5d079b87b6a541ddc782**. `handoff/source-files.sha256` verifies this delivered source. Preserve any local uncommitted changes first. Do not copy a `.git` directory, delete your repository, apply an old stash to this release, or reset `main`.

Suggested NEW working branch: `feature/atlasnote-1.2.3-saved-states`. That name is a suggestion, not a claim that a remote branch was created.

## Read these next

- `docs/RELEASE_1.2.3.md`: exact feature behavior, safety boundaries and limits.
- `FINAL_TEST_STATUS.md`: actual results and remaining environment-blocked gates.
- `docs/evidence/1.2.3/final/results.json`: command exit codes and log names.
- `docs/evidence/1.2.3/ui/saved-state-manager.png`: actual manager screenshot.
- `docs/evidence/1.2.3/engine/integrated-tree-reader.png`: actual PDF.js rendering and sidebar screenshot.

**Release gate:** run the normal-origin PDF, workspace, saved-state, fresh-backup-restore and reload tests in Codex/local Chromium or GitHub CI before merging or deploying. Their administrator-policy block here is not a passing test. No more UI reimplementation is requested.

## What the five new rail controls do

Save current workspace; restore its latest manual save; save all five workspaces; restore the latest all-workspaces save; open Saved states. Existing reading-position bookmarks remain separate. State saves restore the reading setup, not an old copy of the library. Notes, PDFs and later content edits are not rolled back. Each restore creates an undo point.
