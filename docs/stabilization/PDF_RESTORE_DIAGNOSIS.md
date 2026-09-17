# PDF Compare / all-workspace restore diagnosis

## Reproduction

The audited baseline's grid suite passed 11 of 12 checks. The failing check expected one Grid and one Spread in independent Compare panes and exact restoration after saving all workspaces. The earlier diagnostic artifact retained expected/actual session state rather than only an empty AssertionError.

## Root cause

V2 already initializes a newly opened PDF without a saved preference in **Spread**. In `tests/grid_124_dom.py::compare`, the setup opened the second PDF and then blindly clicked **Quick PDF Spread**. That action is a reversible toggle; with Spread already active it correctly switched back to **Single**. The subsequent assertion expected a Spread that the setup had just disabled.

The divergence happened before save/restore. There was no evidence justifying a serialization or PDF engine rewrite.

## Correction

Select `spread` through the visible **PDF presentation** control and verify the setup explicitly. Keep the two independent reader states. Save all workspaces, swap panes, restore, and compare the complete session with the exact saved expectation.

The original meaningful checks remain: one Grid, one Spread, unchanged source pane, and exact all-workspace reader session equality. Diagnostics now name the stage, retain before/expected/actual sessions, and write `compare-state.json` on the real PDF component run.

## Evidence

- Original reproduced failure: `baseline/grid.log` in the evidence archive.
- Final actual PDF grid suite: `final-pdf/test-pdf-grid/` - **12/12 passing**.
- Final actual PDF component suite: `final-pdf/test-pdf-component/` - **11/11 passing**.
- Final wheel suite: `final-pdf/test-pdf-wheel/` - **11/11 passing**.

These suites mount the compiled React-PDF/PDF.js implementation, real worker/text layers and canvases in the component harness. They do not use a raster or native iframe substitute. They are nevertheless **in-memory component tests**, not proof of real-origin IndexedDB or fresh-profile backup restoration. The normal-origin suites were attempted separately and blocked before navigation by browser policy.

`src/online/PdfEngine.tsx` is unchanged relative to the audited source. No renderer workaround, weakened equality, skipped test or arbitrary timeout increase was used to make this check pass.
