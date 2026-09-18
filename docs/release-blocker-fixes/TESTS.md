# Release-blocker verification

## Environment and evidence

Normal Node **24.19.0**, installed Python **3.13.1**, production Vite/React-PDF build and real Chromium. `npm run test:release` invokes all original 45 commands plus the new blocker regression as gate 46. No `bootstrap:offline`, test skip, timeout increase, assertion weakening or compatibility substitution for durable/PDF testing.

Evidence root: `docs/evidence/release-blockers/` (ignored, local only). `environment.json` records runtime provenance; `tested-files.json` records SHA-256 values for the changed implementation/test/config files. The release runner records the starting HEAD because the repair is committed only after verification.

## Targeted execution

| Check | Result | Evidence |
| --- | --- | --- |
| QA-01 real-origin regression | PASS | `qa01-targeted-2.log` |
| Three QCM unit cases | 3/3 PASS, no failures/skips | `qa03-unit.log` |
| QA-01 + QA-03 integrated flows | PASS | `qa03-runtime.log` |
| Three fixes and actual backup/fresh-context restoration | 5/5 phases PASS | `qa02-runtime.log`, `runtime/results.json` |
| Single/Continuous/Spread/grid embedded link | Two clicks per mode PASS | `runtime/qa02-*.png` |
| Final unchanged Content Hub suite after alert correction | 30/30 PASS | `final-targeted-hub.log` |
| Final dedicated blocker suite after alert correction | 5/5 phases PASS | `final-targeted-blockers.log`, `final-targeted-blockers/results.json` |

The final release regression additionally restores a canonically edited Cloud classification, after separately checking explicit unclassification, and compares its Article metadata and effective taxonomy. Notebook references and QCM attempts/reflections are retained exactly.

## Built-in browser and full CDP

Origin: `http://127.0.0.1:4173/`, existing production-file server. All three original defects were reproduced through the UI before their respective changes. Each corrected reproduction was repeated twice. A combined UI pass was performed after all three production fixes were present.

| Defect | Baseline | Corrected evidence |
| --- | --- | --- |
| QA-01 | Cloud picker / IT canonical draft | `qa01-after-1.png`, `qa01-after-2.png`, `qa01-reloaded.txt`, `combined-qa01.png` |
| QA-03 | Two answers -> one silently changes to Single | `qa03-after-1.*`, `qa03-after-2.*`, `combined-qa03.png`; Multiple, checkboxes and validation retained |
| QA-02 | Embedded link remains on page 1; Outline reaches page 2 | `qa02-after-1.*`, `qa02-after-2.*`, `combined-qa02.*`; actual page 2 canvas and text |

`qa01-before.*`, `qa03-before.*`, `qa02-before.*` preserve baseline observations. PDF Outline after repair is recorded in `qa02-outline-after.txt`; additional layout screenshots are retained. Screenshots were visually inspected alongside DOM/CDP assertions.

Final malformed-JSON/recovery retest: `qa01-single-alert-final.png` and `qa01-final-recovery.png`; CDP verified exactly one alert and a disabled picker before recovery. `browser-console-final.json` remains empty. Manual browser work was finished and the temporary tab closed before the complete final rerun.

Console: `browser-console.json` contains no captured warning/error messages. Per-defect `qa01-events.json`, `qa03-events.json`, `qa02-events.json` contain no captured failed requests or runtime exceptions and report no truncation. The final `final-reload-events.json` sample has **16 HTTP 200 responses**, **0 failed requests**, **0 exceptions**, no truncation; real PDF bytes and engine metadata are included. This is a bounded sample, not an assertion of exhaustive session-long network capture.

## Failures, retries and unchanged limits

- Expected pre-fix UI failures are retained as reproduction evidence.
- First complete release attempt: `test:pdf:component` failed its unchanged continuous-gesture delivery assertion: 70 events, maximum interval 321.1 ms versus the 220 ms bound, ending at physical page 3. The other ten component checks passed. This is retained as a failed gate, not silently waived; subsequent complete-run outcomes are reported below.
- That attempt also found two simultaneous Article alert regions for malformed JSON: the new picker explanation and the existing save error. The implementation now renders the picker explanation as supporting text, preserving the existing single save-error alert. The original Content Hub test is unchanged. The new regression explicitly checks that the explanation remains visible and the picker remains disabled.
- Setup correction: the first npm JavaScript path did not exist; corrected to installed npm under `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`, still executed with Node 24.19.0.
- Setup correction: initial targeted Python invocation used the bundled Python without Playwright and failed before test execution (`qa01-targeted.log`). Retried with the installed Python 3.13/Playwright environment; passed. No production assertions changed to recover.
- Browser helper retries: a read-only locator evaluation timed out (read through supported CDP instead); the chooser's summary required its text/AX locator rather than a button-role locator; one link attempt preceded PDF load and was repeated after the actual rendered page-1 state was observed. No PDF timing thresholds were raised.
- Existing Browser Use limits remain uncertified: native drag/drop, true hardware momentum, true fresh-profile restore. Automated Chromium fresh-context restore is independently tested and is not labelled as Browser Use certification.
- `audit:local` retains its inherited Mermaid full dependency/license closure warning. `npm audit` is the separate current vulnerability check. No claim of repairing historical SBOM provenance is made.

## Complete release gate

Final result: **46/46 gates PASS; 715/715 unit tests, 0 failed, 0 skipped.** The dedicated runtime suite passes all five phases, with no page errors or failed requests. One complete rerun was performed after the 44/46 diagnostic attempt. No gates were retried selectively inside either runner. Final PDF component gesture evidence: 70 events, maximum gap 69.3 ms (unchanged 220 ms limit), ending on physical page 2. All ten changed implementation/test/config file hashes were verified unchanged after the final run; documentation was finalized afterward. First-attempt evidence remains in `release/` and `full-release.log`; final evidence is in `release-final/` and `full-release-final.log`.

| Command | Result | Seconds | Local evidence |
| --- | --- | ---: | --- |
| `npm ci` | PASS | 2.8 | [log](../evidence/release-blockers/release-final/clean-install.log) |
| `npm run check:integrated-deps` | PASS | 0.6 | [log](../evidence/release-blockers/release-final/integrated-deps.log) |
| `npm audit` | PASS | 1.3 | [log](../evidence/release-blockers/release-final/npm-audit.log) |
| `npm run typecheck` | PASS | 8.2 | [log](../evidence/release-blockers/release-final/core-typecheck.log) |
| `npm test` | PASS | 30.1 | [log](../evidence/release-blockers/release-final/unit.log) |
| `npm run check:release:offline` | PASS | 7.0 | [log](../evidence/release-blockers/release-final/offline-release.log) |
| `npm run test:online:syntax` | PASS | 0.8 | [log](../evidence/release-blockers/release-final/online-syntax.log) |
| `npm run audit:local` | PASS | 0.8 | [log](../evidence/release-blockers/release-final/local-inventory.log) |
| `npm run test:dom` | PASS | 25.0 | [log](../evidence/release-blockers/release-final/dom.log) |
| `npm run test:hardening:ui` | PASS | 46.1 | [log](../evidence/release-blockers/release-final/hardening.log) |
| `npm run test:reader:ui` | PASS | 47.6 | [log](../evidence/release-blockers/release-final/reader.log) |
| `npm run test:compact:ui` | PASS | 21.6 | [log](../evidence/release-blockers/release-final/compact.log) |
| `npm run test:finish:ui` | PASS | 17.8 | [log](../evidence/release-blockers/release-final/finish-ui.log) |
| `npm run test:backup:diagnostic` | PASS | 6.8 | [log](../evidence/release-blockers/release-final/backup-diagnostic.log) |
| `npm run test:pdf:authoring` | PASS | 9.2 | [log](../evidence/release-blockers/release-final/pdf-authoring.log) |
| `npm run test:workspaces:ui` | PASS | 12.0 | [log](../evidence/release-blockers/release-final/workspaces-ui.log) |
| `npm run test:simplified:ui` | PASS | 15.6 | [log](../evidence/release-blockers/release-final/simplified-ui.log) |
| `npm run test:reading:ui` | PASS | 14.6 | [log](../evidence/release-blockers/release-final/reading-ui.log) |
| `npm run test:interviews` | PASS | 0.5 | [log](../evidence/release-blockers/release-final/interview-content.log) |
| `npm run test:polish:ui` | PASS | 14.1 | [log](../evidence/release-blockers/release-final/polish-ui.log) |
| `npm run typecheck:online` | PASS | 5.7 | [log](../evidence/release-blockers/release-final/integrated-typecheck.log) |
| `npm run build` | PASS | 5.5 | [log](../evidence/release-blockers/release-final/integrated-build.log) |
| `npm run check:release` | PASS | 2.5 | [log](../evidence/release-blockers/release-final/public-release.log) |
| `npm run build:test-harness` | PASS | 1.3 | [log](../evidence/release-blockers/release-final/component-harness.log) |
| `npm run test:pdf:component` | PASS | 24.3 | [log](../evidence/release-blockers/release-final/pdf-component.log) |
| `npm run test:pdf:grid` | PASS | 22.5 | [log](../evidence/release-blockers/release-final/pdf-grid.log) |
| `npm run test:pdf:wheel` | PASS | 77.7 | [log](../evidence/release-blockers/release-final/pdf-wheel.log) |
| `npm run test:pdf` | PASS | 13.8 | [log](../evidence/release-blockers/release-final/pdf-runtime.log) |
| `npm run test:finish:integrated` | PASS | 10.2 | [log](../evidence/release-blockers/release-final/finish-integrated.log) |
| `npm run test:runtime` | PASS | 16.6 | [log](../evidence/release-blockers/release-final/runtime.log) |
| `npm run test:workspaces:runtime` | PASS | 50.3 | [log](../evidence/release-blockers/release-final/workspaces-runtime.log) |
| `npm run test:savedstates:runtime` | PASS | 19.9 | [log](../evidence/release-blockers/release-final/saved-states-runtime.log) |
| `npm run test:reading:runtime` | PASS | 15.6 | [log](../evidence/release-blockers/release-final/reading-runtime.log) |
| `npm run test:headers` | PASS | 1.2 | [log](../evidence/release-blockers/release-final/headers.log) |
| `npm run test:cheatsheets` | PASS | 0.6 | [log](../evidence/release-blockers/release-final/cheatsheets-content.log) |
| `npm run test:cheatsheets:ui` | PASS | 38.2 | [log](../evidence/release-blockers/release-final/cheatsheets-ui.log) |
| `npm run test:cheatsheets:runtime` | PASS | 23.6 | [log](../evidence/release-blockers/release-final/cheatsheets-runtime.log) |
| `npm run test:stabilization:ui` | PASS | 24.6 | [log](../evidence/release-blockers/release-final/stabilization-ui.log) |
| `npm run test:stabilization:runtime` | PASS | 10.8 | [log](../evidence/release-blockers/release-final/stabilization-runtime.log) |
| `npm run test:content-hub:ui` | PASS | 42.7 | [log](../evidence/release-blockers/release-final/content-hub-ui.log) |
| `npm run test:content-hub:runtime` | PASS | 15.1 | [log](../evidence/release-blockers/release-final/content-hub-runtime.log) |
| `npm run test:references` | PASS | 1.0 | [log](../evidence/release-blockers/release-final/references-unit.log) |
| `npm run test:references:ui` | PASS | 21.3 | [log](../evidence/release-blockers/release-final/references-ui.log) |
| `npm run test:references:runtime` | PASS | 29.4 | [log](../evidence/release-blockers/release-final/references-runtime.log) |
| `npm run test:final-polish:runtime` | PASS | 18.0 | [log](../evidence/release-blockers/release-final/final-polish-runtime.log) |
| `npm run test:release-blockers:runtime` | PASS | 23.8 | [log](../evidence/release-blockers/release-final/release-blockers-runtime.log) |
