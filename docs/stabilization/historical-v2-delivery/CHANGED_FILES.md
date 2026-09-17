# AtlasNote V2 changed files

Starting source: bundled completed 1.2.7, matching upstream commit `0c4455f8ca25eb16c882287a4dc61ddfc32f5b89`, tree `4217bc24a2719f5849fdbd894bd464b329dd6ae7`.

**500 final source files; 51 changed or added paths (34 modified, 17 added); no deletions.** This list includes application implementation, tests, CI/build wiring and updated delivery documentation. No generated dependencies, builds, test evidence, personal state, font files, or temporary upload payload is part of the source ZIP.

## Main ownership

- `src/references/`: canonical concepts, assignments/edges, target resolution and change tokens, computed backlinks, reviewed suggestions, virtual Lens/Context/Explorer UI and system-tab state.
- `src/app/App.tsx`, core/workspace/navigation and components: optional integration into the existing library/readers/panes without replacing Notebook ownership.
- `src/online/PdfEngine.tsx` and `src/pdf/wheel-navigation.mjs`: bounded native wheel/restore guard changes. Native verification is NOT cleared here.
- Storage validation is additive. Existing database/backup engine and the accepted ResourceTarget union remain unchanged.
- Tests/CI retain existing gates and add three V2 reference commands. Test changes, prerequisite corrections and the real bookmark regression fix are explained in `docs/v2/TEST_CHANGES.md`.
- `FINAL_TEST_STATUS.md`, `REQUIREMENTS_COVERAGE.md`, `V2_REFERENCE_MODEL.md` and the workspace handoff distinguish implementation from release clearance.

## Exact paths

| Change | Path |
| --- | --- |
| Modified | `.github/workflows/ci.yml` |
| Modified | `AGENTS.md` |
| Modified | `CHANGED_FILES.md` |
| Modified | `CHANGELOG.md` |
| Modified | `CODEX_HANDOFF.md` |
| Modified | `FINAL_TEST_STATUS.md` |
| Modified | `README.md` |
| Modified | `REQUIREMENTS_COVERAGE.md` |
| Modified | `START_HERE.md` |
| Added | `V2_REFERENCE_MODEL.md` |
| Modified | `WORKSPACE_READY_FOR_GITHUB.md` |
| Added | `docs/v2/TEST_CHANGES.md` |
| Added | `docs/v2/USER_GUIDE.md` |
| Added | `examples/references/AI_REFERENCE_REVIEW_PROMPT.md` |
| Added | `examples/references/README.md` |
| Modified | `index.html` |
| Modified | `package-lock.json` |
| Modified | `package.json` |
| Modified | `src/app/App.tsx` |
| Modified | `src/components/DocumentContext.tsx` |
| Modified | `src/components/ReadingActions.tsx` |
| Modified | `src/components/Tree.tsx` |
| Modified | `src/content-hub/ResourcePicker.tsx` |
| Modified | `src/content-hub/surfaces.ts` |
| Modified | `src/core/model.ts` |
| Modified | `src/core/reading-navigation.ts` |
| Modified | `src/core/workspace.ts` |
| Modified | `src/online/PdfEngine.tsx` |
| Modified | `src/pdf/wheel-navigation.mjs` |
| Added | `src/references/KnowledgeEditor.tsx` |
| Added | `src/references/ReferenceUI.tsx` |
| Added | `src/references/explorer.ts` |
| Added | `src/references/knowledge.ts` |
| Added | `src/references/model.ts` |
| Added | `src/references/review.ts` |
| Added | `src/references/targets.ts` |
| Added | `src/references/validation.mjs` |
| Modified | `src/storage/personal-validation.mjs` |
| Modified | `src/styles/app.css` |
| Added | `src/styles/references.css` |
| Modified | `tests/engine_123_dom.py` |
| Modified | `tests/finish_121_dom.py` |
| Modified | `tests/fixtures/engine-dom-entry.tsx` |
| Modified | `tests/reader_polish_125_dom.py` |
| Added | `tests/references-v2.test.mjs` |
| Added | `tests/references_v2_dom.py` |
| Added | `tests/references_v2_runtime.py` |
| Modified | `tests/simplified_123_dom.py` |
| Modified | `tests/wheel_125_dom.py` |
| Modified | `tools/build.mjs` |
| Modified | `tools/run-release.mjs` |
