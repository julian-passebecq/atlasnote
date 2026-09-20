> Current V2.1 stabilization + polish pass: [delivery report](docs/final-polish/DELIVERY.md), [file inventory](docs/final-polish/FILES.md), and [test results](docs/final-polish/TESTS.md). The material below is retained historical evidence from the earlier V2 pass.

# AtlasNote V2 stabilization - final test status

**Implementation delivered; production release NOT CLEARED.** The final delivery manifest binds these results to the packaged application source. Reports under `docs/stabilization/historical-v2-delivery/` describe the earlier V2 pass and are not the current status.

## What actually passed

| Test layer | Final result | Verification boundary |
| --- | --- | --- |
| Full unit suite | **705/705**, including **45 new** | Real source functions/validators; 0 failed, 0 skipped |
| Existing DOM/browser suites | **206/206** across 12 commands | Compiled application, actual visible controls, in-memory test store |
| New stabilization UI suite | **31/31** | Same in-memory DOM boundary |
| DOM UI total | **237/237** | Not durable IndexedDB or hosted reload |
| Actual PDF component suites | **34/34** (11 component + 12 grid + 11 wheel) | Real React-PDF/PDF.js worker/canvas/text layers, in-memory component mount |
| PDF authoring/processing | **12/12** | Synthetic fixture PDFs and actual processors |
| Core and integrated TypeScript | **PASS** | Installed pinned TypeScript and actual React-PDF types |
| Integrated production build / release integrity | **PASS** | Actual Vite bundle, worker/support bytes, reviewed public-content/private exclusion checks |
| Compatibility build / release integrity | **PASS** | Labelled compatibility bundle |
| Exact backup diagnostic | **PASS** | Serialization/download/decoder/payload equality, not actual fresh-profile durable restoration |

The PDF Compare restore blocker is fixed: the test setup toggled the new default Spread into Single. Explicitly setting the required Spread precondition retains all original exact-state assertions. The PDF engine itself is unchanged.

Counts come from the retained final logs, not inherited delivery totals. The separate `test:references` command repeats a subset of the unit suite and is not counted twice. PDF authoring checks are separate from the browser/component counts.

## Required release gates

All required commands below were actually invoked. Paths are relative to the separately delivered test-evidence archive.

| Gate | Result | Scope / detail | Evidence |
| --- | --- | --- | --- |
| `test` | PASS | 705/705, including 45 new; no skips | `unit-final2.log` |
| `test:dom` | PASS | 12 checks; in-memory DOM | `compat-final/test-dom/run.log` |
| `test:hardening:ui` | PASS | 39 checks; in-memory DOM | `compat-final/test-hardening-ui/run.log` |
| `test:reader:ui` | PASS | 18 checks; in-memory DOM | `compat-final/test-reader-ui/run.log` |
| `test:compact:ui` | PASS | 11 checks; in-memory DOM | `compat-final/test-compact-ui/run.log` |
| `test:finish:ui` | PASS | 14 checks; in-memory DOM | `compat-final/test-finish-ui/run.log` |
| `test:finish:integrated` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-finish-integrated/run.log` |
| `test:workspaces:ui` | PASS | 9 checks; in-memory DOM | `compat-final/test-workspaces-ui/run.log` |
| `test:workspaces:runtime` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-workspaces-runtime/run.log` |
| `test:simplified:ui` | PASS | 10 checks; in-memory DOM | `compat-final/test-simplified-ui/run.log` |
| `test:savedstates:runtime` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-savedstates-runtime/run.log` |
| `test:reading:ui` | PASS | 11 checks; in-memory DOM | `compat-final/test-reading-ui/run.log` |
| `test:reading:runtime` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-reading-runtime/run.log` |
| `test:pdf:component` | PASS | 11 real PDF component checks; in-memory mount | `final-pdf/test-pdf-component/run.log` |
| `test:pdf:grid` | PASS | 12 real PDF component checks; in-memory mount | `final-pdf/test-pdf-grid/run.log` |
| `test:pdf:wheel` | PASS | 11 real PDF component checks; in-memory mount | `final-pdf/test-pdf-wheel/run.log` |
| `test:cheatsheets` | PASS |  | `final-gates/test-cheatsheets/run.log` |
| `test:cheatsheets:ui` | PASS | 26 checks; in-memory DOM | `compat-final/test-cheatsheets-ui/run.log` |
| `test:cheatsheets:runtime` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-cheatsheets-runtime/run.log` |
| `test:content-hub:ui` | PASS | 30 checks; in-memory DOM | `compat-final/test-content-hub-ui/run.log` |
| `test:content-hub:runtime` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-content-hub-runtime/run.log` |
| `test:references` | PASS | 63 reference unit tests; a subset of the 705 full unit tests, not additional | `final-gates/test-references/run.log` |
| `test:references:ui` | PASS | 15 checks; in-memory DOM | `compat-final/test-references-ui/run.log` |
| `test:references:runtime` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-references-runtime/run.log` |
| `test:interviews` | PASS |  | `final-gates/test-interviews/run.log` |
| `test:headers` | PASS | 3 local HTTP/static header checks; not deployed Netlify response certification | `final-gates/test-headers/run.log` |
| `typecheck` | PASS | Final application source | `sealed-final/typecheck.log` |
| `typecheck:online` | PASS | Final application source | `sealed-final/typecheck-online.log` |
| `build` | PASS | Final application source | `sealed-final/build.log` |
| `check:release` | PASS | Final application source | `sealed-final/check-release.log` |

## Additional relevant gates and preparation

| Gate | Result | Scope / detail | Evidence |
| --- | --- | --- | --- |
| `test:backup:diagnostic` | PASS | Exact payload/download/decoder comparison; not durable fresh-profile restore | `final-gates/test-backup-diagnostic/run.log` |
| `test:pdf:authoring` | PASS | 12/12 synthetic authoring/processing checks | `final-gates/test-pdf-authoring/run.log` |
| `pdf:library:validate` | PASS |  | `final-gates/pdf-library-validate/run.log` |
| `pdf:library:build` | PASS |  | `final-gates/pdf-library-build/run.log` |
| `test:runtime` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-runtime/run.log` |
| `test:pdf` | BLOCKED | ERR_BLOCKED_BY_ADMINISTRATOR before navigation; not an application pass | `final-gates/test-pdf/run.log` |
| `check:release:offline` | PASS |  | `final-gates/check-release-offline/run.log` |
| `check:integrated-deps` | PASS |  | `final-gates/check-integrated-deps/run.log` |
| `test:online:syntax` | PASS |  | `final-gates/test-online-syntax/run.log` |
| `audit:local` | PASS | Installed lockfile/version + vendor-byte inventory passes; complete Mermaid license/SBOM closure still BLOCKED | `final-gates/audit-local/run.log` |
| `test:polish:ui` | PASS | 11 checks; in-memory DOM | `compat-final/test-polish-ui/run.log` |
| `build:test-harness` | PASS | Final application source | `sealed-final/build-test-harness.log` |
| `test:stabilization:ui` | PASS | 31/31 focused in-memory UI checks on the final application source | `sealed-final/test-stabilization-ui.log` |
| `test:stabilization:runtime` | BLOCKED | Actual production origin refused before initial load; hosted attempt also blocked | `stabilization-runtime/results.json` |
| `clean-install` | BLOCKED | Isolated clean install timed out after 22 seconds; no success claimed | `dependencies/clean-install.json` |
| `npm-audit` | FAIL | EAI_AGAIN registry.npmjs.org; vulnerability result unavailable | `dependencies/audit.log` |

## Installation and environment provenance

The exact pinned installed runtime was recovered from the earlier diagnostic CI artifact rather than downloaded from an available package registry. Artifact 10473130862 came from GitHub Actions run 35160351452 at commit `02a41a69fc94de3a21aef3ce78e26621c5e17458`. Its downloaded ZIP SHA-256 was `bd08cad4a23fca3b567308f33dcf50247e4506267e74e8a978fdec5d7e145535`. The installed-version and vendor-integrity checks passed on the recovered runtime. This recovery enables real integrated build/component tests but does not establish a successful new clean installation.

A separate clean `npm ci` attempt in an isolated directory did not complete within its recorded 22-second bound. The registry audit returned EAI_AGAIN. Neither is represented as green. The recovered runtime and `node_modules` are not included in the source ZIP.

The monolithic release runner was not claimed as a successful end-to-end execution. Its constituent gates were run with retained results; clean installation was isolated so a network failure would not erase the recovered runtime. The runner remains intact and includes the new UI and runtime gates for normal-environment verification.

## Normal-origin limitation

Chromium rejects initial top-level navigation with **ERR_BLOCKED_BY_ADMINISTRATOR** on both the local production origin and an actual attempt at the existing hosted preview. The tests are blocked before the application runs. No policy bypass or substitute in-memory durability test is used.

The nine existing normal-origin/integrated runtime commands and the new stabilization runtime command therefore remain **BLOCKED**. They do not certify theme persistence on reload, durable demo/source edits, reload of all workspace state, or a complete backup restored into a fresh profile. The hosted theme issue was not independently reproduced or cleared in this environment.

Existing component and DOM tests prove behavior only within their stated harness. Passing production bundling is not a substitute for those blocked runtime gates.

## Viewports and visual inspection

Automated visible-UI checks pass at **390x844, 1366x768, 1440x900 and 1920x1080**. They inspect the actual Dashboard, manager, Capture, pane controls and document overflow. Screenshots in `sealed-final/ui/` and `final-pdf/` were also visually reviewed. This is not a claim of a separate manual live-site session.

Five theme surface/color pairs are distinct; theme switching changes only the theme field in the session comparison. Dark Slate is checked across Dashboard, four managers, JSON textareas, Capture, Article, Context and Workspace States. Live-origin/reload remains blocked separately.

## Evidence history

`baseline/` preserves the inherited PDF failure. Intermediate `unit-*.log`, `compat/`, `stabilization-ui1/`, `stabilization-ui2/` and `sealed-screenshot-attempt/` retain failures encountered during development. The last of these contains a screenshot helper attempting to click a toast behind an open native dialog; removing that screenshot-only click restores the test without changing application assertions. Final evidence is indexed in the archive README and final-result JSON.

Old broad V2 statements such as 660 unit tests or an uninstalled integrated toolchain do not describe this delivered pass. The current runtime/build outcomes above supersede them.

## Release decision

Pushed to v2manualupload: **NO**. Merged: **NO**. Production deployed: **NO**.

Remaining blockers: clean installation in a normal environment; all normal-origin runtime/IndexedDB/reload/fresh-profile checks; registry vulnerability audit; complete inherited precompiled Mermaid dependency/license closure. No required blocked or failed gate is waived.
