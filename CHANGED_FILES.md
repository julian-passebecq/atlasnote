# AtlasNote 1.2.3 - changed source files

Baseline: upstream main `476f327ae77eb9103f2e5d079b87b6a541ddc782`, exact tree `2d07e499cab9236f5a098e2d08513f98f3e1b4f3`.

The complete delta (new files and deletion included) is packaged as `handoff/changes.patch`. `src/styles/compact-topbar.css` is deleted, not just unused. Generated evidence, build outputs and package-only manifests are excluded from the patch.

- `.github/workflows/ci.yml`
- `.gitignore`
- `AGENTS.md`
- `CHANGELOG.md`
- `CODEX_HANDOFF.md`
- `FINAL_TEST_STATUS.md`
- `README.md`
- `START_HERE.md`
- `WORKSPACE_READY_FOR_GITHUB.md`
- `docs/RELEASE_1.2.3.md`
- `docs/history/1.2.2-delivery-docs/CHANGED_FILES.md`
- `docs/history/1.2.2-delivery-docs/FINAL_TEST_STATUS.md`
- `docs/history/1.2.2-delivery-docs/README.md`
- `docs/history/1.2.2-delivery-docs/WORKSPACE_READY_FOR_GITHUB.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `src/app/App.tsx`
- `src/companion/CompanionPanel.tsx`
- `src/companion/PdfStudyTree.tsx`
- `src/companion/promote.ts`
- `src/companion/tree.ts`
- `src/components/Icon.tsx`
- `src/components/ReaderRail.tsx`
- `src/components/SavedStatesDialog.tsx`
- `src/components/Tree.tsx`
- `src/core/model.ts`
- `src/core/personal-state.ts`
- `src/core/saved-states-types.ts`
- `src/core/saved-states.ts`
- `src/online/PdfEngine.tsx`
- `src/pdf/PdfReader.tsx`
- `src/pdf/study-bridge.ts`
- `src/pdf/wheel-navigation.mjs`
- `src/storage/database.ts`
- `src/storage/personal-validation.mjs`
- `src/storage/saved-states-validation.mjs`
- `src/styles/app.css`
- `src/styles/compact-topbar.css` (deleted)
- `src/styles/simplified-shell.css`
- `tests/browser_support.py`
- `tests/compact_12_dom.py`
- `tests/engine_123_dom.py`
- `tests/finish_121_dom.py`
- `tests/finish_121_integrated.py`
- `tests/fixtures/engine-dom-entry.tsx`
- `tests/hardening_dom.py`
- `tests/pdf_authoring_test.py`
- `tests/pdf_runtime.py`
- `tests/reader_11_dom.py`
- `tests/saved-states-123.test.mjs`
- `tests/saved_states_runtime.py`
- `tests/simplified_123_dom.py`
- `tests/workspace_122_dom.py`
- `tests/workspace_122_runtime.py`
- `tools/build-test-harness.mjs`
- `tools/build.mjs`
- `tools/run-release.mjs`

See docs/RELEASE_1.2.3.md for the request-to-implementation map and test changes.
