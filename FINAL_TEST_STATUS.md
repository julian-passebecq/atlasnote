# AtlasNote 1.2.5 - actual final verification status

**Implementation candidate, not approved for merge or deployment.** GitHub was read only. All current available compatibility checks are green. The complete integrated release suite is not green and has not been certified.

## Verified final source

| Check | Result | Scope |
|---|---:|---|
| Node unit tests | **433/433 PASS** | All 393 existing tests plus 40 new top-level tests. One new test runs seven positive/negative persistence-assertion cases in Python. |
| Chromium DOM/UI checks | **137/137 PASS** | Real compiled components, DOM, CSS, layouts, events and in-memory state. Not IndexedDB or a real PDF.js engine. |
| PDF authoring/processing | **12/12 PASS** | Real local PyMuPDF/Pillow processing of synthetic fixtures; not viewer wheel certification. |
| Backup diagnostic | PASS | Captured personal state equals generated backup personal state exactly; structural diff empty. |
| Core TypeScript | PASS | `npm run typecheck`. |
| Offline build/release verification | PASS | Compatibility-only output; not a production deployable build. |
| Online adapter syntax | PASS | Transpilation/syntax only, not integrated type checking. |
| Interview generation consistency | PASS | All 15 native generated pages agree with the semantic authoring source. |
| Vendored bytes | 113/113 unchanged | Local inventory still exits nonzero because integrated lockfile packages are missing. |
| Integrated build, wheel and real-origin persistence | **NOT CERTIFIED** | See blockers below. |

### UI suite breakdown

| Suite | Passed |
|---|---:|
| `dom` | 14 |
| `hardening` | 39 |
| `reader` | 18 |
| `compact` | 11 |
| `finish-ui` | 14 |
| `workspaces-ui` | 9 |
| `simplified-ui` | 10 |
| `reading-ui` | 11 |
| `polish-ui` | 11 |

The final hardening rerun (`hardening-final/results.json`) supersedes the earlier failed contextual-glossary assertion. It now verifies that an unrelated glossary entry is excluded from document Search but remains discoverable in Global search. Source behavior was not weakened to recreate the old global Context search. Prior failures and their logs are retained.

## Full release attempt and recovery, without concealing failures

`npm run test:release` actually attempted all **34** commands. Its raw result was **2 PASS, 26 FAIL, 6 BLOCKED**. The initial `npm ci` failed with a network/DNS error and removed the temporary offline dependencies. Dependent gates then failed, including missing build/server prerequisites. A failed install also left empty type-package directories; those generated directories were removed outside the source tree before restoring the existing offline toolchain. No manifest, lock dependency version, security gate or renderer was replaced to make installation appear successful.

The unchanged vendored bootstrap then restored only JSZip, Prism and the matching installed TypeScript compiler. The final source was rebuilt and the available commands rerun. The final compatibility command set contains **17 PASS / 3 BLOCKED** (including bootstrap, which is not itself one of the 34 release gates). The table keeps the raw full-run result separate from the latest independent verification. The full run preceded the final UI corrections; the final compatibility reruns cover those corrections. This is not a claim that a fresh end-to-end 34-gate release passed.

| Command | Raw full-run status (exit) | Latest independent verification | Evidence |
|---|---|---|---|
| `npm ci` | FAIL (1) | NOT CERTIFIED | `full-release/clean-install.log` |
| `npm run check:integrated-deps` | FAIL (1) | NOT CERTIFIED | `full-release/integrated-deps.log` |
| `npm audit` | FAIL (1) | NOT CERTIFIED | `full-release/npm-audit.log` |
| `npm run typecheck` | BLOCKED (2) | PASS | `core-typecheck.log` |
| `npm test` | FAIL (1) | PASS | `unit.log` |
| `npm run check:release:offline` | FAIL (1) | PASS | `offline-release.log` |
| `npm run test:online:syntax` | FAIL (1) | PASS | `online-syntax.log` |
| `npm run audit:local` | FAIL (1) | BLOCKED | `local-inventory.log` |
| `npm run test:dom` | FAIL (1) | PASS | `dom.log` |
| `npm run test:hardening:ui` | FAIL (1) | PASS | `../hardening-final.log` |
| `npm run test:reader:ui` | FAIL (1) | PASS | `reader.log` |
| `npm run test:compact:ui` | FAIL (1) | PASS | `compact.log` |
| `npm run test:finish:ui` | FAIL (1) | PASS | `finish-ui.log` |
| `npm run test:backup:diagnostic` | FAIL (1) | PASS | `backup-diagnostic.log` |
| `npm run test:pdf:authoring` | PASS (0) | PASS | `pdf-authoring.log` |
| `npm run test:workspaces:ui` | FAIL (1) | PASS | `workspaces-ui.log` |
| `npm run test:simplified:ui` | FAIL (1) | PASS | `simplified-ui.log` |
| `npm run test:reading:ui` | FAIL (1) | PASS | `reading-ui.log` |
| `npm run test:interviews` | PASS (0) | PASS | `interview-content.log` |
| `npm run test:polish:ui` | FAIL (1) | PASS | `polish-ui.log` |
| `npm run typecheck:online` | BLOCKED (2) | BLOCKED | `integrated-typecheck.log` |
| `npm run build` | FAIL (1) | NOT CERTIFIED | `full-release/integrated-build.log` |
| `npm run check:release` | FAIL (1) | NOT CERTIFIED | `full-release/public-release.log` |
| `npm run build:test-harness` | FAIL (1) | NOT CERTIFIED | `full-release/component-harness.log` |
| `npm run test:pdf:component` | FAIL (1) | NOT CERTIFIED | `full-release/pdf-component.log` |
| `npm run test:pdf:grid` | FAIL (1) | NOT CERTIFIED | `full-release/pdf-grid.log` |
| `npm run test:pdf:wheel` | BLOCKED (2) | BLOCKED | `pdf-wheel.log` |
| `npm run test:pdf` | BLOCKED (2) | NOT CERTIFIED | `full-release/pdf-runtime.log` |
| `npm run test:finish:integrated` | BLOCKED (2) | NOT CERTIFIED | `full-release/finish-integrated.log` |
| `npm run test:runtime` | BLOCKED (2) | NOT CERTIFIED | `full-release/runtime.log` |
| `npm run test:workspaces:runtime` | FAIL (1) | NOT CERTIFIED | `full-release/workspaces-runtime.log` |
| `npm run test:savedstates:runtime` | FAIL (1) | NOT CERTIFIED | `full-release/saved-states-runtime.log` |
| `npm run test:reading:runtime` | FAIL (1) | NOT CERTIFIED | `full-release/reading-runtime.log` |
| `npm run test:headers` | FAIL (1) | NOT CERTIFIED | `full-release/headers.log` |

## Blockers and boundaries

The network-disabled implementation container cannot install the committed React, React-PDF, PDF.js/Vite dependency closure. Therefore integrated TypeScript, production build, actual PDF.js component/grid/wheel tests and full dependency audit remain blocked or uncertified. The real wheel suite is implemented and explicitly exits BLOCKED when its actual harness is unavailable; no fake renderer, injected page-number transition or mock wheel success is accepted.

An additional normal-origin run against the existing offline distribution reached the browser and received `ERR_BLOCKED_BY_ADMINISTRATOR`. Its eight saved-state checks are BLOCKED, not PASS. No navigation policy bypass was used. Real IndexedDB reload and fresh-profile backup restoration must run on the normal local/CI production origin. In-memory and archive-function coverage do not replace them.

The inherited precompiled Mermaid dependency closure still lacks a complete original SBOM/license audit. Existing notices, pins and bytes remain unchanged.

Document history is deliberately limited to 50 local document records. Source added/modified dates are not invented. Search is active-document scoped; optional selectable PDF text search requires the already-open integrated reader and checks at most 1,000 physical pages. There is no OCR, code execution, scoring, recommendation engine or cheatsheet work.

## External acceptance command

Read CODEX_HANDOFF.md. On the named branch from the actual upstream starting SHA, install the locked dependencies and browser/Python prerequisites, then run **`npm run test:release`**. Retain and inspect all real-engine and real-origin evidence. Do not deploy `dist-offline`, the test harness or any private library. Do not merge or deploy this candidate based only on this compatibility report.
