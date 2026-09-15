# AtlasNote 1.2.5 - reader polish and native interview references

This is the complete modified source, not instructions instead of an implementation. Start with this file, FINAL_TEST_STATUS.md and CODEX_HANDOFF.md. They supersede older delivery prompts; original 1.2.4 delivery documents are preserved under docs/history/1.2.4-delivery-docs.

## Baseline and delivery

Upstream starting main: `b5e63f71185bcf525e985dfad1260d38ed3c4918` (released 1.2.4).
Verified tree: `72a8ea2ca18944a3c897d86f39579c7a347e3c37`.
Target/local branch: `feature/atlasnote-1.2.5-reader-interview-polish`.
GitHub has not been written to. Nothing has been merged or deployed.

The complete source ZIP has no .git or dependency/generated build caches. The optional patch applies to the exact starting tree above. Do not delete .git or replace unrelated local/private files when integrating. The local delivery commit is distinct from an upstream GitHub commit; see the external delivery report for final SHA.

## What changed

Each pane now has **+ / A-B / its own toolbar toggle**, with independent saved visibility and no star. The compact top-left strip is app, search, back, forward, sidebar, Context, Focus, Compare, Swap. Notes/PDF switching is in the library filter row.

The PDF tree is a non-destructive domain/subject/PDF/category/page projection, without the generic PDF Atlas wrapper or notebook group levels. Existing physical-page action menus remain. Slow-wheel and momentum restoration logic was corrected without changing the previous gesture thresholds; real-engine verification is a separate release gate.

Context now describes the active document through Outline/Glossary, scoped Search, Remarks, explicit Related links and lightweight History. Workspace States has its own right-rail button and retains the existing 1-5/All manager and quick save/restore actions. Bookmarks and Read Later remain separate.

The new code-icon **Interview Preparation** notebook in the Job group contains 15 native references: SQL 5, Theory 4, Hybrid 3, Coding 3. All canonical SQL Q1-Q5 prompts are retained. Three coding variants teach the same dictionary pattern. Personal reflections use Context > Remarks. No code runner, scoring, game or cheatsheet work is included.

## Local build and acceptance

Use Node >=22.12 with the committed lockfile:

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

The runner tries every gate and records its actual exit code. A failure or BLOCKED is not a pass. The integrated app is built by `npm run build` into `dist`; preview with `npm run preview`. Never deploy `dist-offline` or `.build/engine-dom`.

`npm run bootstrap:offline` plus `npm run build:offline` remains the existing compatibility-only path when a matching TypeScript is already installed. It cannot install or certify React-PDF/Vite. The chat environment could not install those dependencies and blocked normal-origin browser navigation; do not promote this source on the strength of offline UI/unit results alone.

Implementation details: docs/1.2.5/IMPLEMENTATION.md. Authoring model: docs/1.2.5/INTERVIEW_CONTENT.md. Exact test results: FINAL_TEST_STATUS.md and the accompanying evidence archive.
