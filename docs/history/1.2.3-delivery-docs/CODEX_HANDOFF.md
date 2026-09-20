# Codex handoff - validate and integrate AtlasNote 1.2.3

## Goal

Use this complete implementation. Do not rebuild the app or redo the simplified UI. Finish independent normal-origin release acceptance and integrate the delivered source safely. The new saved-state feature is separate from reading-position bookmarks and intentionally does not roll back notes/PDF contents.

## Exact baseline

Repository: `julian-passebecq/atlasnote`.
Upstream baseline: `main` at `476f327ae77eb9103f2e5d079b87b6a541ddc782`.
Baseline tree: `2d07e499cab9236f5a098e2d08513f98f3e1b4f3`.
Proposed working branch: `feature/atlasnote-1.2.3-saved-states` (not created remotely by this delivery).

1. Inspect the local working directory and preserve all uncommitted/untracked work. Never delete the .git directory or apply an older stash on top of this source. Prefer a separate clean worktree.
2. Fetch origin and inspect its current main. If it has moved, compare rather than resetting it. Do not force-push.
3. From the verified baseline create the new work branch. `handoff/changes.patch` is the complete source/documentation delta, including deletions and new files. Run `git apply --check <absolute-path-to-patch>` before `git apply <absolute-path-to-patch>` in that worktree. Alternatively use the complete ZIP source in a clean worktree and compare its changed-file manifest; do not overlay blindly onto unrelated work.
4. Verify delivered source hashes in `handoff/source-files.sha256` or compare source files. Build/test dependencies and generated output are intentionally not in the archive. The lockfile already includes the integrated PDF dependencies; **do not run enable:online** or independently upgrade PDF.js.

## Acceptance commands

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

The runner includes npm ci, audit, both typechecks, all core/compatibility suites, the production build, component PDF tests, existing normal-origin PDF/runtime/finish/workspace tests, the new saved-state normal-origin suite and headers. It writes command results and logs to `docs/evidence/1.2.3/release-gates`. A failed or blocked command must not be marked green.

The isolated component harness needs the production build's prepared assets: `npm run build && npm run build:test-harness && npm run test:pdf:component`. Never deploy the harness or dist-offline. `.github/workflows/ci.yml` already contains the new required checks.

## Focus independent verification here

- Use the actual hosted entry on HTTP, not the about:blank/in-memory test helper. Confirm saves survive reload in IndexedDB.
- Save a workspace at a real PDF intra-page position, change its tabs/layout/position, restore, and compare all session fields. Verify another workspace is unchanged.
- Save all five while workspace 4 is active; alter several workspaces and activate another; restore exactly, including active slot and A/B state.
- Verify the automatic undo point, rename/progress note, scope lists and 30-event history. Save-limit errors must not remove older manual saves.
- Download a full workspace backup containing the state saves, progress notes, undo and history. Restore in a fresh browser context, reload, compare personal state exactly and then use a restored checkpoint. New notes/PDFs and ordinary reading bookmarks must not disappear during a state-only restore.
- Confirm Single wheel page turning at both edges with slow ticks, no repeated skips on momentum, and native Continuous scroll. Validate glossary/page hyperlinks against physical pages without any bottom Companion module.
- Verify all five themes, desktop/narrow rail geometry, hidden controls defaults, restoring explicit visible controls, Focus and independent Compare.

If a legacy test fails, diagnose it against the new UI contract. Do not weaken state equality/security/integrity assertions. The local final status explicitly separates in-memory/component successes from administrator-blocked normal-origin checks. Normal-origin test selectors were updated in this pass but cannot be execution-certified here; fix a concrete harness mismatch or real regression in your connected environment and record the reason.

## Publishing

Commit implementation and necessary verified fixes on the new work branch and return exact commit/test results. **Do not automatically merge to main or deploy solely because the archive was delivered.** Promotion needs green normal-origin acceptance and the user's go-ahead. Existing Netlify project: `atlasnotej`, site ID `dee9eb09-5dbb-4a3a-ba33-97e26b872c51`; do not create another site. Publish only integrated `dist/`, never private libraries, backups, harness assets or the source ZIP itself.
