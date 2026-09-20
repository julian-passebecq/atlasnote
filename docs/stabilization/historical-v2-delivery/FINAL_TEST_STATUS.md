# AtlasNote V2 - final test status

**Implemented; NOT CLEARED for integrated production release.** No GitHub push, merge, deployment, or personal cloud-state write occurred. Tests and evidence distinguish pure/unit, compatibility browser, and native integrated paths.

## Source and execution identity

- Bundled 1.2.7 source archive SHA-256: `4b5659990b128b307aac23016d9836d1c7208891a6674a5def1813af2daeeb71`.
- Baseline source tree: `4217bc24a2719f5849fdbd894bd464b329dd6ae7`, matching user-uploaded commit `0c4455f8ca25eb16c882287a4dc61ddfc32f5b89`.
- Local baseline commit: `206c0e88d478171edefe9600907dd7866146d6f0`. It is a synthetic tracking snapshot, not the upstream commit.
- Local branch: `feature/atlasnote-v2-reference-knowledge-system`.
- Final implementation commit/tree/source ZIP hashes are in the external delivery manifest. They are not embedded into their own commit.
- Final executable/test inputs: `final-confirmation/verified-inputs.json` in the evidence ZIP. The only input changed after the final browser run started was isolation of `tests/references-v2.test.mjs`; no application input changed. The complete unit suite was rerun after that fix.
- Full-release attempt was made before final regression corrections; its original result is retained. A failed or blocked native gate is not cleared by a compatibility rerun.

## Final verified results

| Check | Result | Evidence |
| --- | --- | --- |
| Complete unit suite | **660/660 PASS**, no skips; 63 new V2 cases | `final-confirmation/unit.log` |
| Dedicated V2 reference unit suite | **63/63 PASS**, included above, not additional | `final-confirmation/references-unit.log` |
| Core TypeScript | PASS | `final-confirmation/core-typecheck.log` |
| Offline compatibility build / release-integrity gate | PASS | `final-verification/offline-release.log` |
| Online syntax-only check | PASS; not integrated type-check | `final-verification/online-syntax.log` |
| Interview and cheatsheet content consistency | PASS | `final-verification/interviews.log`, `cheatsheets.log` |
| Synthetic PDF authoring/processing | **12/12 PASS** | `final-verification/pdf-authoring.log` |
| Exact backup payload/download/decoder diagnostic | PASS; not durable restore certification | `final-verification/backup-diagnostic.log` |
| Patch whitespace | PASS | `final-confirmation/patch-whitespace.log` |
| Existing locked dependency entries | 85 unchanged; no new npm dependency | `protected-source-integrity.json` |
| Protected source/content bytes | 215 baseline files unchanged | `protected-source-integrity.json` |
| Local dependency/license inventory | **FAIL / incomplete** | `final-verification/local-inventory.log` |
| Native reference runtime | **0/12; BLOCKED before application load** | `final-verification/normal-origin-diagnostic.log` |

### Browser/component breakdown: 208/208 PASS

| Suite | Passed / total | Evidence |
| --- | --- | --- |
| DOM/layout | 14/14 | `final-verification/dom/dom-tests.json` |
| Hardening | 39/39 | `final-verification/hardening-ui/results.json` |
| Reader | 18/18 | `final-verification/reader-ui/reader-11-dom.json` |
| Compact navigation | 11/11 | `final-verification/compact-ui/results.json` |
| Reader finish | 14/14 | `final-verification/finish-ui/results.json` |
| Workspaces | 9/9 | `final-verification/workspaces-ui/results.json` |
| Simplified UI | 10/10 | `final-verification/simplified-ui/results.json` |
| Reading managers | 11/11 | `final-verification/reading-ui/results.json` |
| Reader polish | 11/11 | `final-verification/polish-ui/results.json` |
| Native cheatsheets | 26/26 | `final-verification/cheatsheets-ui/results.json` |
| Dashboard / Article / QCM | 30/30 | `final-verification/content-hub-ui/results.json` |
| V2 references | 15/15 | `final-verification/references-ui/results.json` |

These tests execute the compiled application and real Chromium DOM events, layout, pointer/keyboard interactions and actual local downloads. They use the established **about:blank/in-memory compatibility harness**. Some inherited tests stub unavailable browser services (for example Fullscreen). They do not certify integrated React-PDF canvas/workers, native clipboard, IndexedDB durability, normal-origin security, reload, or fresh-profile restore.

The new reference UI checks exercise concepts and exact targets, manual links, incoming capture backlinks, optional virtual Lens and double-click actions, closable Explorer, type filters, Article/QCM/Cheatsheet cross-navigation, independent pane headers, reviewed JSON import, actual JSON/Markdown exports and backup-payload checks. The original deleted-sheet bookmark assertion passes unchanged after the global-fallback regression was fixed.

## Inherited integrated PDF blocker: corrected prerequisites, native gate still open

The 1.2.7 test harness reset left `session.surface = 'dashboard'` while installing a PDF reader. The App therefore showed Dashboard rather than the intended reader. V2 removes that override and expands the current projected PDF tree. Existing canvas, physical page, text selection and navigation assertions are retained.

This source-level defect was identified and corrected. The failing native component test **could not be reproduced to completion and cleared here**, because its integrated dependencies were unavailable. Do not describe Phase 0 as remotely green or native-PDF verified. See `docs/v2/TEST_CHANGES.md` and the retained full-release component logs.

## PDF UX implementation and verification limit

Newly opened PDFs use Spread; existing reader locations retain saved mode, zoom, rotation and cover settings. Header Book/Spread, supported Grid and Mode shortcuts remain available when detailed controls are collapsed. The wheel change permits legitimate inner-page movement once restore is complete while retaining the page-turn latch/idle guards. True top/bottom boundaries are required for a physical turn; reaching an edge with a large event does not immediately skip the page.

Pure state/guard tests and compatibility header tests pass. Actual slow wheel, momentum, tall-page Single/Spread/Grid, independent PDF Compare, narrow Spread fallback and exact restored PDF canvas tests remain native release requirements. Their test cases are included, not replaced by page-number-only assertions.

## Complete 42-command release attempt - original results

**3 PASS, 30 FAIL, 9 BLOCKED.** The runner attempted all 39 inherited commands plus three V2 reference gates rather than stopping at the first failure. It used a 90-second per-gate timeout and zero package-fetch retries for this diagnostic attempt.

`npm ci` failed with `Exit handler never called!`; `npm audit` reported `getaddrinfo EAI_AGAIN registry.npmjs.org`. The integrated prerequisites were then unavailable. The statuses below are the runner's actual recorded statuses/exit codes; they are not changed to PASS by later offline checks. Commands that return exit code 2 are classified BLOCKED by the existing runner; retain their logs when diagnosing the native environment.

| # | Command | Recorded status | Exit | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `npm ci` | **FAIL** | `1` | `full-release/clean-install.log` |
| 2 | `npm run check:integrated-deps` | **FAIL** | `1` | `full-release/integrated-deps.log` |
| 3 | `npm audit` | **FAIL** | `1` | `full-release/npm-audit.log` |
| 4 | `npm run typecheck` | **BLOCKED** | `2` | `full-release/core-typecheck.log` |
| 5 | `npm test` | **FAIL** | `1` | `full-release/unit.log` |
| 6 | `npm run check:release:offline` | **FAIL** | `1` | `full-release/offline-release.log` |
| 7 | `npm run test:online:syntax` | **FAIL** | `1` | `full-release/online-syntax.log` |
| 8 | `npm run audit:local` | **FAIL** | `1` | `full-release/local-inventory.log` |
| 9 | `npm run test:dom` | **FAIL** | `1` | `full-release/dom.log` |
| 10 | `npm run test:hardening:ui` | **FAIL** | `1` | `full-release/hardening.log` |
| 11 | `npm run test:reader:ui` | **FAIL** | `1` | `full-release/reader.log` |
| 12 | `npm run test:compact:ui` | **FAIL** | `1` | `full-release/compact.log` |
| 13 | `npm run test:finish:ui` | **FAIL** | `1` | `full-release/finish-ui.log` |
| 14 | `npm run test:backup:diagnostic` | **FAIL** | `1` | `full-release/backup-diagnostic.log` |
| 15 | `npm run test:pdf:authoring` | **PASS** | `0` | `full-release/pdf-authoring.log` |
| 16 | `npm run test:workspaces:ui` | **FAIL** | `1` | `full-release/workspaces-ui.log` |
| 17 | `npm run test:simplified:ui` | **FAIL** | `1` | `full-release/simplified-ui.log` |
| 18 | `npm run test:reading:ui` | **FAIL** | `1` | `full-release/reading-ui.log` |
| 19 | `npm run test:interviews` | **PASS** | `0` | `full-release/interview-content.log` |
| 20 | `npm run test:polish:ui` | **FAIL** | `1` | `full-release/polish-ui.log` |
| 21 | `npm run typecheck:online` | **BLOCKED** | `2` | `full-release/integrated-typecheck.log` |
| 22 | `npm run build` | **FAIL** | `1` | `full-release/integrated-build.log` |
| 23 | `npm run check:release` | **FAIL** | `1` | `full-release/public-release.log` |
| 24 | `npm run build:test-harness` | **FAIL** | `1` | `full-release/component-harness.log` |
| 25 | `npm run test:pdf:component` | **FAIL** | `1` | `full-release/pdf-component.log` |
| 26 | `npm run test:pdf:grid` | **FAIL** | `1` | `full-release/pdf-grid.log` |
| 27 | `npm run test:pdf:wheel` | **BLOCKED** | `2` | `full-release/pdf-wheel.log` |
| 28 | `npm run test:pdf` | **BLOCKED** | `2` | `full-release/pdf-runtime.log` |
| 29 | `npm run test:finish:integrated` | **BLOCKED** | `2` | `full-release/finish-integrated.log` |
| 30 | `npm run test:runtime` | **BLOCKED** | `2` | `full-release/runtime.log` |
| 31 | `npm run test:workspaces:runtime` | **FAIL** | `1` | `full-release/workspaces-runtime.log` |
| 32 | `npm run test:savedstates:runtime` | **FAIL** | `1` | `full-release/saved-states-runtime.log` |
| 33 | `npm run test:reading:runtime` | **FAIL** | `1` | `full-release/reading-runtime.log` |
| 34 | `npm run test:headers` | **FAIL** | `1` | `full-release/headers.log` |
| 35 | `npm run test:cheatsheets` | **PASS** | `0` | `full-release/cheatsheets-content.log` |
| 36 | `npm run test:cheatsheets:ui` | **FAIL** | `1` | `full-release/cheatsheets-ui.log` |
| 37 | `npm run test:cheatsheets:runtime` | **BLOCKED** | `2` | `full-release/cheatsheets-runtime.log` |
| 38 | `npm run test:content-hub:ui` | **FAIL** | `1` | `full-release/content-hub-ui.log` |
| 39 | `npm run test:content-hub:runtime` | **BLOCKED** | `2` | `full-release/content-hub-runtime.log` |
| 40 | `npm run test:references` | **FAIL** | `1` | `full-release/references-unit.log` |
| 41 | `npm run test:references:ui` | **FAIL** | `1` | `full-release/references-ui.log` |
| 42 | `npm run test:references:runtime` | **BLOCKED** | `2` | `full-release/references-runtime.log` |

## Final feasible rerun - original command results

After restoring the repository's offline toolchain, the following commands were executed. The initial unit failure below was a new test fixture sharing mutable catalogue data, fixed by cloning the fixture for each case; assertions were retained. Its failed log is preserved. The subsequent full **660/660** run and dedicated **63/63** run in `final-confirmation/` are the final unit results.

| Command | Recorded status | Evidence |
| --- | --- | --- |
| `python -c import shutil; shutil.rmtree('node_modules',ignore_errors=True)` | PASS | `final-verification/offline-reset.log` |
| `npm run bootstrap:offline` | PASS | `final-verification/offline-bootstrap.log` |
| `npm run typecheck` | PASS | `final-verification/core-typecheck.log` |
| `npm test` | FAIL | `final-verification/unit.log` |
| `npm run check:release:offline` | PASS | `final-verification/offline-release.log` |
| `npm run test:online:syntax` | PASS | `final-verification/online-syntax.log` |
| `npm run test:interviews` | PASS | `final-verification/interviews.log` |
| `npm run test:cheatsheets` | PASS | `final-verification/cheatsheets.log` |
| `npm run test:dom` | PASS | `final-verification/dom.log` |
| `npm run test:hardening:ui` | PASS | `final-verification/hardening-ui.log` |
| `npm run test:reader:ui` | PASS | `final-verification/reader-ui.log` |
| `npm run test:compact:ui` | PASS | `final-verification/compact-ui.log` |
| `npm run test:finish:ui` | PASS | `final-verification/finish-ui.log` |
| `npm run test:workspaces:ui` | PASS | `final-verification/workspaces-ui.log` |
| `npm run test:simplified:ui` | PASS | `final-verification/simplified-ui.log` |
| `npm run test:reading:ui` | PASS | `final-verification/reading-ui.log` |
| `npm run test:polish:ui` | PASS | `final-verification/polish-ui.log` |
| `npm run test:cheatsheets:ui` | PASS | `final-verification/cheatsheets-ui.log` |
| `npm run test:content-hub:ui` | PASS | `final-verification/content-hub-ui.log` |
| `npm run test:references:ui` | PASS | `final-verification/references-ui.log` |
| `npm run test:backup:diagnostic` | PASS | `final-verification/backup-diagnostic.log` |
| `npm run test:pdf:authoring` | PASS | `final-verification/pdf-authoring.log` |
| `npm run audit:local` | FAIL | `final-verification/local-inventory.log` |
| `npm run test:references:runtime` | BLOCKED | `final-verification/normal-origin-diagnostic.log` |

Final confirmation reran core TypeScript, all units, dedicated reference units and `git diff --check`; all four commands passed. `FINAL_VERIFICATION_SUMMARY.json` joins the evidence without rewriting previous failures.

### Native origin and audit remain blocked

A separate normal-origin reference suite attempted the real application entry using `ATLAS_DIST=dist-offline` only as a persistence diagnostic. Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` at `Page.goto(http://127.0.0.1:...)` before the application could load. All 12 cases remain BLOCKED; there is no fake-storage fallback in that runtime suite. Production mode additionally requires actual PDF canvas/wheel checks.

The local inventory confirms 113 vendor files' pinned byte integrity but reports installed dependency versions do not match the lock. Complete vulnerability/license certification is not supplied. The inherited precompiled Mermaid closure still lacks a complete original dependency lock/SBOM. These audit limitations are not fixed by this semantic-reference pass.

## Intermediate failures retained and corrected

`regression-pass/` retains the first comprehensive run. Its header/Context tests needed explicit new shortcut-group/References-tab expectations; no old tab or core assertion was removed. More importantly, it caught a real regression: semantic parent fallback had been applied globally to saved bookmarks. The application now opts into that behavior only from the new reference views/action menus. The old unavailable bookmark behavior and unchanged cheatsheet assertion pass in the final run.

`focused/` retains earlier reference component failures and corrected results. `docs/v2/TEST_CHANGES.md` explains every changed inherited assertion and the fixture isolation correction. Final native evidence cannot be inferred from these component successes.

## Next release gates

On a normal developer/CI environment: use the exact delivered source on a test branch, `npm ci`, install the checked-in Python test requirements and Chromium, then run `npm run test:release`. Require integrated dependencies, audit, core/online type-check, production build, PDF component/grid/wheel/runtime, header checks, existing and new normal-origin persistence/reload/fresh-context restores to pass. Inspect actual PDF scrolling manually at normal and tall zoom sizes as well. Do not merge/deploy on the basis of the compatibility counts alone.
