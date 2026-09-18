# AtlasNote 1.2.4 - final validation status

**Complete source checkpoint; not pushed, merged or deployed.**

Current consolidated command results: 24 PASS, 8 BLOCKED, 0 FAIL.
Core tests: **393 passed**. Counts below belong to this source and execution, not to historical 1.2.4 reports.

## Commands actually executed

| Command | Result | Exit code |
|---|---|---|
| `npm run check:integrated-deps` | PASS | 0 |
| `npm run typecheck` | PASS | 0 |
| `npm run typecheck:online` | PASS | 0 |
| `npm run build:offline` | PASS | 0 |
| `node --test tests/*.test.mjs` | PASS | 0 |
| `npm run check:release:offline` | PASS | 0 |
| `npm run test:online:syntax` | PASS | 0 |
| `npm run audit:local` | PASS | 0 |
| `npm run test:dom` | PASS | 0 |
| `npm run test:hardening:ui` | PASS | 0 |
| `npm run test:reader:ui` | PASS | 0 |
| `npm run test:compact:ui` | PASS | 0 |
| `npm run test:finish:ui` | PASS | 0 |
| `npm run test:workspaces:ui` | PASS | 0 |
| `npm run test:simplified:ui` | PASS | 0 |
| `npm run test:reading:ui` | PASS | 0 |
| `npm run test:backup:diagnostic` | PASS | 0 |
| `npm run test:pdf:authoring` | PASS | 0 |
| `npm run build` | PASS | 0 |
| `npm run check:release` | PASS | 0 |
| `npm run build:test-harness` | PASS | 0 |
| `npm run test:pdf:component` | PASS | 0 |
| `npm run test:pdf:grid` | PASS | 0 |
| `npm run test:pdf` | BLOCKED | 2 |
| `npm run test:finish:integrated` | BLOCKED | 2 |
| `npm run test:runtime` | BLOCKED | 2 |
| `npm run test:workspaces:runtime` | BLOCKED | 2 |
| `npm run test:savedstates:runtime` | BLOCKED | 2 |
| `npm run test:reading:runtime` | BLOCKED | 2 |
| `npm run test:headers` | PASS | 0 |
| `npm audit` | BLOCKED | 1 |
| `npm ci (isolated same manifests)` | BLOCKED | 1 |

## Browser evidence boundaries

The compiled compatibility UI tests use an about:blank harness with the persistent write queue suppressed. The PDF component and four-page suites use actual React-PDF/PDF.js, original synthetic PDF fixtures, real canvases and text layers in Chromium, but the workspace is still in memory. They do not prove IndexedDB persistence.

The six normal-origin suites (`test:pdf`, `test:finish:integrated`, `test:runtime`, `test:workspaces:runtime`, `test:savedstates:runtime`, `test:reading:runtime`) are reported separately. An administrator browser-policy block is not an application pass. Do not bypass that policy or replace these gates with the component tests. Run them on an unrestricted local/Codex or CI environment before release.

The registry audit and clean install results are also separate from the version/integrity checks against the supplied dependency archive. The clean-install command was attempted in a fresh isolated folder containing the same manifests, so the verified working dependency cache was not destroyed. Consult the logs for the actual DNS/network failure when BLOCKED.

The inherited precompiled Mermaid bundle still has an incomplete original transitive SBOM/license closure. `audit:local` passing means only its stated local version/byte inventory checks passed, not full dependency licensing or vulnerability certification.

## Corrections and reruns

This runtime did not retain the previously claimed unzipped 1.2.4 source. The full 1.2.3 archive and the published runtime-test fixes were used to reconstruct the requested implementation. Prior 1.2.4 screenshots/reports were archived separately and are not claimed as current evidence.

Legacy tests were adapted for the documented control relocation and flattened PDF tree. Real semantic state equality, physical-page identity, byte integrity and backup checks remain. The test clicking a raw canvas was corrected to click the page containing its text layer; the test asserting actual two-page Spread now uses a viewport above the existing 650px per-pane threshold. Narrow Spread still retains its existing single-page degradation.

An additional real bookmark-type collision was corrected: toggling a whole-document bookmark cannot delete a category bookmark on the same PDF. A new UI assertion reproduces the old collision and passes only with the corrected application. The final closeout rebuilt the source and repeated all compatibility/UI and PDF component gates after that change.

Historic wheel-gesture/undo-equality failures reported during the older 1.2.3 local pass were not diagnosed by this pass. A successful current component run is not proof those historical intermittent failures can never recur. Preserve any future first-failure logs instead of retrying until green.

## Evidence files

`docs/evidence/1.2.4/FINAL_RESULTS.json` is the consolidated result. `delivery/` contains the latest log and available structured report per command. `environment.json` and `source-fingerprint.json` identify the execution setup. Selected current screenshots are included. The accompanying evidence ZIP contains additional current test screenshots; generated workspace backups and raw PDF exports are excluded.

## Release runner portability

The release runner now starts npm through its JavaScript entry point rather than spawning npm.cmd directly. Its orchestration was checked with a synthetic CLI fixture in a path containing spaces: all 31 commands were attempted, child exit 2 remained BLOCKED, and the overall exit was nonzero. This is a runner contract check, not native Windows or application-gate evidence. See runner-contract.json.

## Promotion gate

No GitHub Actions run on this 1.2.4 source and no Netlify deployment were started by this pass. Use CODEX_HANDOFF.md to install, run the complete pipeline, and push a bounded feature branch. Merge and deploy only after those gates pass and promotion is authorized.
