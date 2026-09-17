# Intentional test updates and regression fixes

## Assertions updated for approved UX

- Grid Compare setup now explicitly selects Spread rather than toggling an already-Spread PDF to Single. Full session equality is retained.
- Dashboard assertions expect five mini-tables and at least fifteen empty UI slots, not the superseded 25-cell matrix. They check that empty slots do not create canonical records.
- Ribbon/right-rail assertions reflect their required ownership and ordering. Existing Focus, Escape, history, Compare and reading-action checks are retained.
- Resource tests use the visible compact Choose resource fallback or real typed drag source, not the removed large default dropdown/automatic first selection.
- Article tests expand Advanced before accessing secondary fields. This does not bypass validation or change canonical content expectations.
- The collapsed-pane test now expects the requested 44px desktop strip (bounded 40-48px), tests its full-height hit area, and retains pane/tab/history equality. The old <=30px assertion contradicted this pass.
- Archive tests verify the canonical archive and explicit Restore action while an already-selected source may remain visible in the manager.

## Focused new coverage

`stabilization-v2.test.mjs`: 45 new unit cases, included in the 705-test full suite. Coverage includes typed-drag security, canonical source validation/staleness, exact-anchor preservation, metadata isolation, QCM attempt identity, draft row limits, deterministic demo and guarded cleanup, and backup payload preservation.

`stabilization_v2_dom.py`: 31 visible-UI checks spanning Dashboard, plus actions, capture transitions, all four drag/JSON workflows, keyboard equivalents, pane strips, five themes, all new Dark Slate surfaces, four viewport sizes and safe cleanup. It uses the existing in-memory compatibility harness and reports that limit.

`stabilization_v2_runtime.py`: production-entry/real-IndexedDB test path for theme reload, demo persistence, capture cancellation, JSON edit reload and cleanup. This path exits with BLOCKED when the browser refuses initial navigation; it does not substitute an in-memory pass.

## Defects found while developing this pass

- A PDF metadata export shared its companion object with source state. It now deep-clones the export; mutation-isolation coverage was added.
- Exact PDF-category links normalize to their physical page in semantic matching. Source preflight therefore separately protects an existing category ID rather than altering the frozen resolver model.
- Demo cleanup initially needed additional protection for user-bookmarked Dashboard items and their contexts, modified records, retained attempts and saved views. Targeted regression cases now cover those paths.
- Public PDF title edits live in a page overlay. JSON export now reads the effective page title, preserving the edit after catalogue recomposition and avoiding a false stale-source conflict.
- Mobile Manage resource now closes the sidebar so the selected workspace is visible; the keyboard fallback remains available.
- Missing Dashboard item IDs no longer falsely mark multiple reading-list rows as selected.

Intermediate failures are retained in the evidence archive. The final result index points to the successful reruns and does not relabel earlier failed logs as passing.
