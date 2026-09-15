# Codex handoff - AtlasNote 1.2.4

## Mission

Validate and integrate this complete 1.2.4 source. Do not restart the app or create another feature pass. Correct actual regressions while preserving assertions and the user-approved interface. Do not merge or deploy until the entire release pipeline passes and the coordinating user authorizes promotion.

Repository: `julian-passebecq/atlasnote`
Reference main: `f82c336464e3faafa12e8ad888f9415c2e23f5e2`
Suggested work branch: `feature/atlasnote-1.2.4-reading-managers`
Existing site: `atlasnotej` / https://atlasnotej.netlify.app
Netlify site ID: `dee9eb09-5dbb-4a3a-ba33-97e26b872c51`
Do not create a new Netlify site. This pass has not changed the remote branch or deployed the app.

## Preserve work and integrate

1. Inspect git status and remote main. Preserve dirty work in a separate worktree or explicit safety copy; do not reset it. Do not apply a stale stash to this release.
2. Create a new work branch from the reference commit, or explicitly reconcile newer main commits if main moved.
3. Extract the full source ZIP outside the checkout. Copy its contents to the branch root, not a nested AtlasNote_1.2.4 directory. Preserve .git, local credentials and user/private libraries. Never commit dependency caches, generated bundles, private backups or raw PDF libraries.
4. Review the diff. The recovered baseline includes the two already published 1.2.3 test fixes in commit `43d08255...`; do not remove them. The included `handoff/changes.patch` is relative to the local recovery baseline, not a claim of byte-for-byte equality to every remote documentation file. Check it before applying; use the full source when reconciling docs.
5. Verify package and lock versions are 1.2.4. Use the existing pinned dependency versions.

## Install and run gates

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

The release runner executes all existing gates plus the new suites and retains every exit code. Start it with `npm run test:release`, not a direct Node invocation: it reuses npm's JavaScript entry point to avoid Windows `.cmd` launch problems. A BLOCKED is not a pass. The CI workflow also requires the new suites before allowing a production artifact.

New commands:

```sh
npm run test:reading:ui
npm run test:pdf:grid
npm run test:reading:runtime
```

`test:pdf:grid` and `test:pdf:component` require `npm run build:test-harness`. UI suites use `dist-offline` from `npm run build:offline`. Real-origin suites use `dist` from `npm run build`. Never substitute the component harness for real storage/reload evidence.

## Highest-priority external checks

Run `test:pdf`, `test:finish:integrated`, `test:runtime`, `test:workspaces:runtime`, `test:savedstates:runtime` and `test:reading:runtime` on real HTTP origin with actual IndexedDB. This chat environment blocked normal-origin navigation by administrator policy. Verify exact reload/fresh-context backup restoration including new reading lists, grid mode, old 1.2.3 checkpoints and all five sessions.

The new runtime test covers categorized bookmarks, safe URL queues, PDF page/category queues, cross-workspace PDF routing, grid-state persistence, actual backup download and fresh-context restore. Diagnose any failed assertion; do not suppress it.

Run clean `npm ci` and current `npm audit`. Local dependency-version and vendored-byte checks are not substitutes for registry security review. The inherited precompiled Mermaid bundle still has a documented SBOM/license-closure limitation; do not claim a complete transitive license audit.

## Design contracts

- Bookmarks and Read later are category-based shared lists, NOT per-workspace queues.
- Reading-state saves remain session checkpoints, not library/content rollback. Restore must retain newer bookmarks, Read later items, remarks/content and PDF bytes.
- Workspace routing adds a tab, uses an empty picker, or reports capacity; never replace existing work silently.
- A PDF category can refer to the same physical page several times under different short headings. Do not deduplicate distinct named page references.
- No PDF concept/subcategory/glossary branches. Definitions, edits and promotion still work through Manage PDF details.
- Four-page grid renders actual PDF.js pages and honors physical page/revision identities. Spread remains two-page mode and narrow Spread still degrades to one visible page while retaining preference.
- Default reader controls are hidden. Preserve explicit existing visibility choices.
- Subject tabs and action menus are keyboard-accessible. Pasted URLs are explicit HTTP(S) links, never fetched for previews.
- Do not change IndexedDB name/version, source ownership, private-public safeguards, or existing backup envelope merely to fix a test.

## Test corrections already made

Legacy UI tests now use the shared reader-controls button and Context managers. PDF tests verify flattened page rows and open saved definitions on demand rather than looking for a removed glossary branch. The Spark test retains a stable data-node-id scope. Bookmark navigation tests use the new manager instead of the retired main-screen entry point. These are intended product-contract updates, not removal of equality/backup/physical-page checks.

During validation, an additional document-bookmark collision was corrected: toggling a whole-document bookmark no longer deletes a distinct PDF-category bookmark for the same document. The reading-manager UI suite covers this case. Restored legacy bookmark screens also use typed targets when reopening new entries.

## Finish

Commit scoped corrections to the feature branch, push it, and report starting/final SHA, changed files, exact commands/results, unreproduced intermittent failures and anything still blocked. Do not mark transient failures resolved merely because a rerun passed. Do not merge main or deploy without authorization.
