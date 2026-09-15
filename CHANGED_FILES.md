# AtlasNote 1.2.6 changed files

Base: `d1ecfd70c2f9d72c374a1c1c897d10a05d718dc5` (released 1.2.5).
Branch: `feature/atlasnote-1.2.6-native-cheatsheets`.
No upstream write, merge or deployment.

## Functional inventory

Canonical fixtures and generated pack: `content/cheatsheets`, `content/packs/atlas.cheatsheet-samples`, workspace grouping and publication review. Four required documents, eight pages, 150 blocks including two nested graph blocks. No dependency additions.

Native implementation: `src/cheatsheets` model, registry, strict validator, deterministic text layout, bounded SVG renderer, native reader, source dialog, copy selection and integration helpers; scoped `cheatsheets.css`; native JSON Schema and embedded page/bundle definitions.

Existing integration: App/rail/tree/reading manager/Document Context/export; additive core model/search/targets/locations/workspace categories; additive personal/reading/state validation. Existing database/archive implementation and actual online PDF engine are unchanged. All 15 interview sources remain unchanged; native related links produce backlinks through existing mechanics.

Tests: 94 new unit cases, 26 native browser cases, nine actual-origin runtime cases; two obsolete core fixture assumptions and two exact browser project-count expectations updated without weakening behavioral assertions. Three added release gates, all previous 34 retained. CI gets the same three native checks.

Documentation/version: current 1.2.6 source handoff, architecture, authoring example, source provenance, original reference text, exact test status and unchanged historical release documentation. Root lockfile change is version metadata only, not a package resolution change.

## Exact path inventory

`A` means added; `M` means modified. Generated test evidence is excluded from source Git and delivered separately. The source ZIP contains the complete tracked application, not just these paths.

| Status | Path |
|---|---|
| M | `.github/workflows/ci.yml` |
| M | `AGENTS.md` |
| M | `CHANGELOG.md` |
| M | `CODEX_HANDOFF.md` |
| M | `FINAL_TEST_STATUS.md` |
| M | `README.md` |
| M | `START_HERE.md` |
| M | `WORKSPACE_READY_FOR_GITHUB.md` |
| A | `content/cheatsheets/azure-data-factory.json` |
| A | `content/cheatsheets/pandas-essentials.json` |
| A | `content/cheatsheets/pyspark-execution.json` |
| A | `content/cheatsheets/sql-analytics.json` |
| A | `content/packs/atlas.cheatsheet-samples/atlas-pack.json` |
| A | `content/packs/atlas.cheatsheet-samples/glossary.json` |
| A | `content/packs/atlas.cheatsheet-samples/pages/page.cheatsheet.azure-data-factory.json` |
| A | `content/packs/atlas.cheatsheet-samples/pages/page.cheatsheet.pandas-essentials.json` |
| A | `content/packs/atlas.cheatsheet-samples/pages/page.cheatsheet.pyspark-execution.json` |
| A | `content/packs/atlas.cheatsheet-samples/pages/page.cheatsheet.sql-analytics.json` |
| A | `content/packs/atlas.cheatsheet-samples/projects.json` |
| M | `content/publication-review.json` |
| M | `content/workspace.json` |
| A | `docs/1.2.6/ARCHITECTURE.md` |
| A | `docs/1.2.6/AUTHORING.md` |
| A | `docs/1.2.6/FIXTURE_PROVENANCE.md` |
| A | `docs/1.2.6/TEST_RESULTS.md` |
| A | `docs/1.2.6/minimal.cheatsheet.json` |
| A | `docs/1.2.6/reference/BASELINE_STATUS.md` |
| A | `docs/1.2.6/reference/CHEATSHEET_PRODUCT_DIRECTION.md` |
| A | `docs/1.2.6/reference/NEXT_PRO_PROMPT.md` |
| A | `docs/1.2.6/reference/TEST_PACK.md` |
| M | `index.html` |
| M | `package-lock.json` |
| M | `package.json` |
| M | `src/app/App.tsx` |
| A | `src/cheatsheets/CheatsheetReader.tsx` |
| A | `src/cheatsheets/CheatsheetSourceDialog.tsx` |
| A | `src/cheatsheets/assets.mjs` |
| A | `src/cheatsheets/clipboard.ts` |
| A | `src/cheatsheets/content.mjs` |
| A | `src/cheatsheets/font-metrics.mjs` |
| A | `src/cheatsheets/model.ts` |
| A | `src/cheatsheets/renderer.mjs` |
| A | `src/cheatsheets/text-layout.mjs` |
| A | `src/cheatsheets/validation.mjs` |
| M | `src/components/DocumentContext.tsx` |
| M | `src/components/ExportDialog.tsx` |
| M | `src/components/ReaderRail.tsx` |
| M | `src/components/ReadingManager.tsx` |
| M | `src/components/Tree.tsx` |
| M | `src/content/schemas/bundle-v2.schema.json` |
| A | `src/content/schemas/cheatsheet-v1.schema.json` |
| M | `src/content/schemas/page-v2.schema.json` |
| M | `src/core/document-context.ts` |
| M | `src/core/model.ts` |
| M | `src/core/reading-lists.ts` |
| M | `src/core/reading-navigation.ts` |
| M | `src/core/reading-types.ts` |
| M | `src/core/validation.mjs` |
| M | `src/core/workspace-slots.ts` |
| M | `src/core/workspace.ts` |
| M | `src/storage/personal-validation.mjs` |
| M | `src/storage/reading-validation.mjs` |
| M | `src/storage/state-validation.mjs` |
| M | `src/styles/app.css` |
| A | `src/styles/cheatsheets.css` |
| A | `tests/cheatsheets-126.test.mjs` |
| A | `tests/cheatsheets_126_dom.py` |
| A | `tests/cheatsheets_126_runtime.py` |
| M | `tests/core.test.mjs` |
| M | `tests/finish_121_dom.py` |
| M | `tests/workspace_122_dom.py` |
| M | `tools/build.mjs` |
| A | `tools/generate-cheatsheets.mjs` |
| M | `tools/run-release.mjs` |
| M | `CHANGED_FILES.md` |
