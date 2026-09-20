# Changed-file inventory

All changes are additions/modifications; no application files deleted. No dependency or lockfile changes.

| Path | Purpose |
| --- | --- |
| `.github/workflows/ci.yml` | Run the new production regression suite in CI. |
| `docs/final-polish/DEFECT_MAP.md` | Delivery documentation and evidence interpretation. |
| `docs/final-polish/DELIVERY.md` | Delivery documentation and evidence interpretation. |
| `index.html` | V2.1 browser title. |
| `package.json` | Expose new production regression command. |
| `src/app/App.tsx` | Resize keyboard tooltip and capture Article draft opt-out handling. |
| `src/components/ReaderRail.tsx` | V2.1 display label. |
| `src/components/Tree.tsx` | Visible resource drag grip. |
| `src/content-hub/Editors.tsx` | Visual QCM path, canonical JSON toggle, readable context preview. |
| `src/content-hub/LibraryManager.tsx` | Atomic classification synchronization and picker refresh. |
| `src/content-hub/QcmFields.tsx` | Visual question/answer/explanation controls and mode validation. |
| `src/content-hub/QcmReader.tsx` | Readable alphabetic option labels, stable stored IDs retained. |
| `src/content-hub/content.ts` | Synchronize existing classification fields on explicit source writes. |
| `src/content-hub/context-label.ts` | Derived taxonomy/title/exact-target presentation. |
| `src/core/workspace.ts` | Read-time projection of legacy taxonomy overrides. |
| `src/references/ReferenceUI.tsx` | Compact grouped rows, taxonomy display and search. |
| `src/references/knowledge.ts` | Derived row taxonomy metadata. |
| `src/references/targets.ts` | Human-readable untitled-section excerpts. |
| `src/stabilization/capture-draft.ts` | Clear prior attached context/classification when resuming from current Capture choices. |
| `src/styles/references.css` | Reference density, typography and focus treatment. |
| `src/styles/stabilization.css` | QCM responsive layout, Capture labels/checkbox fix and interaction affordances. |
| `tests/content_hub_127_dom.py` | Update intentional classification contract; explicitly choose JSON for rejection tests. |
| `tests/final_polish_runtime.py` | Production-origin visual authoring, validation, exact targets, pane resize, reload and fresh restore. |
| `tests/stabilization-v2.test.mjs` | Taxonomy/backup, legacy/stale, context, row labels and draft opt-out regressions. |
| `tools/build.mjs` | V2.1 compatibility browser title. |
| `tools/run-release.mjs` | Include new production regression in aggregate gate. |
| `FINAL_TEST_STATUS.md` | Historical-report pointer to current V2.1 evidence. |
| `START_HERE.md` | Historical-report pointer to current V2.1 evidence. |
| `docs/final-polish/FILES.md` | Delivery documentation, complete inventory, or final test evidence index. |
| `docs/final-polish/TESTS.md` | Delivery documentation, complete inventory, or final test evidence index. |
