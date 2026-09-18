# Final test evidence

Final aggregate: **45/45 commands PASS**, normal Node 24.19.0 install; **712/712 unit tests, 0 failed, 0 skipped**. New production workflow: **9/9**. Existing Content Hub runtime: **12/12**, including exact backup and fresh-profile restore.

The aggregate was invoked as `npm run test:release` through npm’s JavaScript entry point using bundled Node 24.19.0. Python prerequisites and Playwright Chromium installation completed separately. No compatibility-bootstrap fallback was used. The DOM build is labelled compatibility; durable and PDF runtime evidence uses the integrated production build.

The runner HEAD field records the starting commit because delivery was committed after verification. `tested-source.json` hashes all 335 source/test/tool/config files before the run; those hashes were verified unchanged after the run. The delivery manifest binds them to the resulting commit. Documentation was finalized afterward.

**Separate inherited limitation:** the successful local inventory command reports the precompiled Mermaid transitive SBOM/license closure as BLOCKED. Its byte/version checks pass. The separate normal `npm audit` returned zero vulnerabilities. This is not a claim that the missing original Mermaid license closure was completed.

| Command | Result | Seconds | Log |
| --- | --- | ---: | --- |
| `npm ci` | PASS | 4.6 | [log](../evidence/final-polish/release-final/clean-install.log) |
| `npm run check:integrated-deps` | PASS | 0.6 | [log](../evidence/final-polish/release-final/integrated-deps.log) |
| `npm audit` | PASS | 1.2 | [log](../evidence/final-polish/release-final/npm-audit.log) |
| `npm run typecheck` | PASS | 16.3 | [log](../evidence/final-polish/release-final/core-typecheck.log) |
| `npm test` | PASS | 40.1 | [log](../evidence/final-polish/release-final/unit.log) |
| `npm run check:release:offline` | PASS | 6.3 | [log](../evidence/final-polish/release-final/offline-release.log) |
| `npm run test:online:syntax` | PASS | 0.9 | [log](../evidence/final-polish/release-final/online-syntax.log) |
| `npm run audit:local` | PASS | 1.3 | [log](../evidence/final-polish/release-final/local-inventory.log) |
| `npm run test:dom` | PASS | 26.5 | [log](../evidence/final-polish/release-final/dom.log) |
| `npm run test:hardening:ui` | PASS | 50.9 | [log](../evidence/final-polish/release-final/hardening.log) |
| `npm run test:reader:ui` | PASS | 49.0 | [log](../evidence/final-polish/release-final/reader.log) |
| `npm run test:compact:ui` | PASS | 21.2 | [log](../evidence/final-polish/release-final/compact.log) |
| `npm run test:finish:ui` | PASS | 20.2 | [log](../evidence/final-polish/release-final/finish-ui.log) |
| `npm run test:backup:diagnostic` | PASS | 7.5 | [log](../evidence/final-polish/release-final/backup-diagnostic.log) |
| `npm run test:pdf:authoring` | PASS | 10.1 | [log](../evidence/final-polish/release-final/pdf-authoring.log) |
| `npm run test:workspaces:ui` | PASS | 13.9 | [log](../evidence/final-polish/release-final/workspaces-ui.log) |
| `npm run test:simplified:ui` | PASS | 17.4 | [log](../evidence/final-polish/release-final/simplified-ui.log) |
| `npm run test:reading:ui` | PASS | 17.7 | [log](../evidence/final-polish/release-final/reading-ui.log) |
| `npm run test:interviews` | PASS | 0.5 | [log](../evidence/final-polish/release-final/interview-content.log) |
| `npm run test:polish:ui` | PASS | 16.0 | [log](../evidence/final-polish/release-final/polish-ui.log) |
| `npm run typecheck:online` | PASS | 10.3 | [log](../evidence/final-polish/release-final/integrated-typecheck.log) |
| `npm run build` | PASS | 7.8 | [log](../evidence/final-polish/release-final/integrated-build.log) |
| `npm run check:release` | PASS | 2.8 | [log](../evidence/final-polish/release-final/public-release.log) |
| `npm run build:test-harness` | PASS | 2.3 | [log](../evidence/final-polish/release-final/component-harness.log) |
| `npm run test:pdf:component` | PASS | 26.7 | [log](../evidence/final-polish/release-final/pdf-component.log) |
| `npm run test:pdf:grid` | PASS | 26.4 | [log](../evidence/final-polish/release-final/pdf-grid.log) |
| `npm run test:pdf:wheel` | PASS | 84.6 | [log](../evidence/final-polish/release-final/pdf-wheel.log) |
| `npm run test:pdf` | PASS | 16.6 | [log](../evidence/final-polish/release-final/pdf-runtime.log) |
| `npm run test:finish:integrated` | PASS | 10.8 | [log](../evidence/final-polish/release-final/finish-integrated.log) |
| `npm run test:runtime` | PASS | 20.4 | [log](../evidence/final-polish/release-final/runtime.log) |
| `npm run test:workspaces:runtime` | PASS | 58.3 | [log](../evidence/final-polish/release-final/workspaces-runtime.log) |
| `npm run test:savedstates:runtime` | PASS | 22.1 | [log](../evidence/final-polish/release-final/saved-states-runtime.log) |
| `npm run test:reading:runtime` | PASS | 14.5 | [log](../evidence/final-polish/release-final/reading-runtime.log) |
| `npm run test:headers` | PASS | 1.3 | [log](../evidence/final-polish/release-final/headers.log) |
| `npm run test:cheatsheets` | PASS | 0.6 | [log](../evidence/final-polish/release-final/cheatsheets-content.log) |
| `npm run test:cheatsheets:ui` | PASS | 47.4 | [log](../evidence/final-polish/release-final/cheatsheets-ui.log) |
| `npm run test:cheatsheets:runtime` | PASS | 25.9 | [log](../evidence/final-polish/release-final/cheatsheets-runtime.log) |
| `npm run test:stabilization:ui` | PASS | 32.8 | [log](../evidence/final-polish/release-final/stabilization-ui.log) |
| `npm run test:stabilization:runtime` | PASS | 10.5 | [log](../evidence/final-polish/release-final/stabilization-runtime.log) |
| `npm run test:content-hub:ui` | PASS | 43.3 | [log](../evidence/final-polish/release-final/content-hub-ui.log) |
| `npm run test:content-hub:runtime` | PASS | 20.5 | [log](../evidence/final-polish/release-final/content-hub-runtime.log) |
| `npm run test:references` | PASS | 1.1 | [log](../evidence/final-polish/release-final/references-unit.log) |
| `npm run test:references:ui` | PASS | 25.5 | [log](../evidence/final-polish/release-final/references-ui.log) |
| `npm run test:references:runtime` | PASS | 24.6 | [log](../evidence/final-polish/release-final/references-runtime.log) |
| `npm run test:final-polish:runtime` | PASS | 18.8 | [log](../evidence/final-polish/release-final/final-polish-runtime.log) |

## Preparation and targeted results

- [Python requirements](../evidence/final-polish/python-requirements.log) and [Playwright install](../evidence/final-polish/playwright-install.log).
- [Final targeted unit run](../evidence/final-polish/targeted-final-unit.log): 712/712.
- [Existing Content Hub runtime](../evidence/final-polish/targeted-hub-runtime.log): 12/12 after production backup repair.
- [New workflow](../evidence/final-polish/targeted-runtime2.log): 9/9, including exact PDF target and full fresh-profile restore.
- [First diagnostic run](../evidence/final-polish/release/results.json): 43/45; actual failures retained.
- Earlier development attempts and setup failures are retained under `docs/evidence/final-polish/development/`; see DELIVERY.md for causes and fixes.

## New coverage

Seven unit cases cover source/taxonomy/backup coherence for Article and QCM, legacy override precedence and stale source rejection, readable exact context, derived reference taxonomy/destinations, section labels, and Capture-to-Article opt-out. The first two cases also enforce no manufactured undefined optional fields. The existing classification contract assertion was updated coherently, with all original pin/reference integrity checks retained.

The new nine-phase real-origin suite covers visual single/multiple authoring, invalid states, correct-answer/option editing, explanations, stable IDs and attempts, JSON export compatibility, Article reclassification through manager/visual/JSON paths, picker refresh, context on/off and draft return, narrow controls, PDF page-3 navigation, keyboard resize/pane equality, real reload, complete backup, fresh browser restore and restored navigation. Existing suites retain drag/drop/non-drag fallbacks, all supported resource targets, focus/keyboard and independent-pane checks.

Screenshots are in `release-final/final-polish-runtime/` and the existing per-gate evidence directories. Manual desktop/narrow inspection is described separately in DELIVERY.md.
