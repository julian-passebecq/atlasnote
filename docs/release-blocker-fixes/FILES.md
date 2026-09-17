# File inventory

| File | Purpose |
| --- | --- |
| `src/content-hub/Editors.tsx` | Canonical Article picker synchronization; editor-owned QCM mode and invalid-draft guards. |
| `src/content-hub/TaxonomyPicker.tsx` | Optional disabled state for invalid canonical Article drafts. |
| `src/content-hub/QcmFields.tsx` | Controlled author-selected mode, independent of correct-answer count. |
| `src/content-hub/qcm-draft.ts` | Initialize transient mode from valid canonical source and validate Multiple drafts. |
| `src/online/PdfEngine.tsx` | Route retained annotation callback through the current physical-page handler. |
| `tests/release-blockers.test.mjs` | Three focused QCM draft/validation/round-trip cases. |
| `tests/release_blockers_runtime.py` | Integrated three-defect regression with actual PDF, IndexedDB, stable references/attempts and fresh-context backup restore. |
| `package.json` | Dedicated `test:release-blockers:runtime` command. |
| `tools/run-release.mjs` | Add that command as gate 46; retain all original 45 gates. |
| `.github/workflows/ci.yml` | Run the dedicated regression in production-release CI. |
| `docs/release-blocker-fixes/REPAIR_REPORT.md` | Root causes, repairs, verification and limits. |
| `docs/release-blocker-fixes/FILES.md` | This inventory. |
| `docs/release-blocker-fixes/TESTS.md` | Actual test outcomes and evidence paths. |

Large evidence remains local under ignored `docs/evidence/release-blockers/`. It is not pushed. No persistence schema, lockfile, fixture PDF, Notebook structure or personal library content is changed by this patch.
