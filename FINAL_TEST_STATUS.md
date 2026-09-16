# AtlasNote 1.2.7 - final test status

**IMPLEMENTED / LOCAL CHECKS COMPLETE / INTEGRATED RELEASE NOT CLEARED**

- Corrected starting source: `f9345c11d98f13d33032666d5148a55a27805742`.
- Local branch: `feature/atlasnote-1.2.7-content-dashboard-qcm`.
- No GitHub push, PR, merge, Netlify operation or production change was performed for this pass.
- The exact final commit/tree and artifact checksums are in the external delivery manifest. Tests ran on the uncommitted implementation, which is tied to that commit by retained input hashes and packaging verification.

## Final feasible verification

The checks below were run sequentially on the final application/test sources, not copied from 1.2.6 results. The offline compatibility toolchain was used where the real integrated dependency installation could not be obtained. Out of 21 local commands, **20 passed and one local inventory audit failed**. A syntax-only online check is not the integrated online TypeScript check.

| Check | Result |
|---|---|
| Unit tests | **597/597 PASS**, including **70 new** cases |
| Existing browser/DOM suites before native cheatsheets | **137/137 PASS** |
| Native cheatsheet component/browser suite | **26/26 PASS** |
| New 1.2.7 component/browser suite | **30/30 PASS** |
| Total component/browser cases | **193/193 PASS** |
| Synthetic PDF authoring/processing checks | **12/12 PASS** |
| Core TypeScript / compatibility build | PASS |
| Offline release integrity / generated content validation | PASS |
| Online syntax-only parsing | PASS; NOT full online type-check |
| Interview content / native cheatsheet generator consistency | PASS; original sources preserved |
| Exact personal-payload backup diagnostic | PASS; zero structural difference / undefined paths |
| Local dependency/license inventory | **FAIL**, installed dependency versions unavailable/mismatched; see below |
| Normal-origin new 1.2.7 runtime suite | **BLOCKED, 0/12**, browser policy refusal |

### Final browser suite breakdown

| Suite | Passed / total | Evidence JSON |
|---|---:|---|
| DOM | 14/14 | `final-feasible/test-dom/dom-tests.json` |
| Hardening | 39/39 | `final-feasible/test-hardening-ui/results.json` |
| Reader | 18/18 | `final-feasible/test-reader-ui/reader-11-dom.json` |
| Compact | 11/11 | `final-feasible/test-compact-ui/results.json` |
| Finish | 14/14 | `final-feasible/test-finish-ui/results.json` |
| Workspaces | 9/9 | `final-feasible/test-workspaces-ui/results.json` |
| Simplified | 10/10 | `final-feasible/test-simplified-ui/results.json` |
| Reading managers | 11/11 | `final-feasible/test-reading-ui/results.json` |
| Reader polish / interviews | 11/11 | `final-feasible/test-polish-ui/results.json` |
| Native cheatsheets | 26/26 | `final-feasible/test-cheatsheets-ui/results.json` |
| New content hub | 30/30 | `final-feasible/test-content-hub-ui/results.json` |

The new suite exercises real controls on the compiled application: both Article forms and full edit/export/archive lifecycle; single/multi QCM checks, reveal, all-option explanations, attempts, reflection and local exports; Dashboard derivation/scopes/Show more; five-row capture and opt-in exact context; shared classification, drag plus keyboard reference creation and independent removal; typed Related and four native Notebook links; all four cheatsheet preset imports; actual QCM wheel scroll and stale-question protection; Compare; popup reclick/outside/Escape/focus; short-screen workspace chooser; unsafe imports with unchanged state.

### What these passes do not prove

Compatibility browser tests mount the compiled app on `about:blank` using the existing in-memory storage adapters. They prove DOM/rendering, production reducers/routing, pointer/keyboard behavior and appropriate downloaded payloads. The older PDF file-import component tests use a disclosed digest bridge where the opaque origin lacks secure-context hashing. They **do not prove durable IndexedDB, true-origin reload/fresh-profile restore, production PDF canvas/worker behavior or hosted security headers**. The exact backup diagnostic suppresses storage writes and is not a substitute for a successful full restore. Real-origin tests remain separate.

## Complete release suite: actual attempt

`npm run test:release` ran **all 39 gates** against an isolated fresh copy of the final implementation, without substituting offline output for the production distribution. The result was **3 PASS, 28 FAIL, 8 BLOCKED**. Exit code: **1**. The run was not aborted at the first failure.

The diagnostic explicitly used `ATLAS_GATE_TIMEOUT_MS=45000`, fetch retries 0 and network timeout 8000 ms to bound unavailable-network work. The clean install was terminated and took about 60 seconds including shutdown; it did not complete. The ordinary release runner still defaults to the original 600000 ms per-gate limit. These are failed/timed-out executions, not passing skips. Commands, actual exits and raw stderr remain in `final-full-release/`.

| Gate | Command | Actual status / exit |
|---|---|---|
| clean-install | `npm ci` | FAIL / SIGTERM |
| integrated-deps | `npm run check:integrated-deps` | FAIL / 1 |
| npm-audit | `npm audit` | FAIL / 1 |
| core-typecheck | `npm run typecheck` | BLOCKED / 2 |
| unit | `npm test` | FAIL / 1 |
| offline-release | `npm run check:release:offline` | FAIL / 1 |
| online-syntax | `npm run test:online:syntax` | FAIL / 1 |
| local-inventory | `npm run audit:local` | FAIL / 1 |
| dom | `npm run test:dom` | FAIL / 1 |
| hardening | `npm run test:hardening:ui` | FAIL / 1 |
| reader | `npm run test:reader:ui` | FAIL / 1 |
| compact | `npm run test:compact:ui` | FAIL / 1 |
| finish-ui | `npm run test:finish:ui` | FAIL / 1 |
| backup-diagnostic | `npm run test:backup:diagnostic` | FAIL / 1 |
| pdf-authoring | `npm run test:pdf:authoring` | PASS / 0 |
| workspaces-ui | `npm run test:workspaces:ui` | FAIL / 1 |
| simplified-ui | `npm run test:simplified:ui` | FAIL / 1 |
| reading-ui | `npm run test:reading:ui` | FAIL / 1 |
| interview-content | `npm run test:interviews` | PASS / 0 |
| polish-ui | `npm run test:polish:ui` | FAIL / 1 |
| integrated-typecheck | `npm run typecheck:online` | BLOCKED / 2 |
| integrated-build | `npm run build` | FAIL / 1 |
| public-release | `npm run check:release` | FAIL / 1 |
| component-harness | `npm run build:test-harness` | FAIL / 1 |
| pdf-component | `npm run test:pdf:component` | FAIL / 1 |
| pdf-grid | `npm run test:pdf:grid` | FAIL / 1 |
| pdf-wheel | `npm run test:pdf:wheel` | BLOCKED / 2 |
| pdf-runtime | `npm run test:pdf` | BLOCKED / 2 |
| finish-integrated | `npm run test:finish:integrated` | BLOCKED / 2 |
| runtime | `npm run test:runtime` | BLOCKED / 2 |
| workspaces-runtime | `npm run test:workspaces:runtime` | FAIL / 1 |
| saved-states-runtime | `npm run test:savedstates:runtime` | FAIL / 1 |
| reading-runtime | `npm run test:reading:runtime` | FAIL / 1 |
| headers | `npm run test:headers` | FAIL / 1 |
| cheatsheets-content | `npm run test:cheatsheets` | PASS / 0 |
| cheatsheets-ui | `npm run test:cheatsheets:ui` | FAIL / 1 |
| cheatsheets-runtime | `npm run test:cheatsheets:runtime` | BLOCKED / 2 |
| content-hub-ui | `npm run test:content-hub:ui` | FAIL / 1 |
| content-hub-runtime | `npm run test:content-hub:runtime` | BLOCKED / 2 |

The three passing gates in that clean-copy run were synthetic PDF authoring and the interview/cheatsheet content generators. The failing clean install left React/React-PDF/build dependencies and build artifacts unavailable. The registry audit explicitly reports `getaddrinfo EAI_AGAIN registry.npmjs.org`. Dependent TypeScript/build/server/runtime errors therefore do **not** constitute successful tests of the app, nor are they silently waived. The runner labels exit code 2 as BLOCKED; raw diagnostics are retained to distinguish missing prerequisites from actual assertion failures.

### Dependency/license audit

The separate feasible `audit:local` check verified **113 vendor files with byte integrity PASS**, but reported `installedVersionsMatch: false`. It also reports the inherited precompiled Mermaid closure lacks a complete original dependency lock/SBOM and that current registry vulnerability review was not executed. This audit remains **uncleared**. No new npm dependency was introduced; all lockfile dependency entries are byte/structure-equivalent to the baseline apart from root application version fields.

### Actual normal-origin attempt

`ATLAS_DIST=dist-offline npm run test:content-hub:runtime` was also invoked against a real local application origin. Chromium refused navigation with `ERR_BLOCKED_BY_ADMINISTRATOR` before any durable interaction. All 12 phases are recorded as BLOCKED. No policy bypass, fake IndexedDB, intercepted replacement site or in-memory pass was used to clear it. Even a successful compatibility-origin run would not certify integrated PDF Compare.

## Regression integrity and adaptations

- The corrected baseline Git tree is `201e3b9c5034b5e275850337aa7dfb437aa599bb`. **82 protected source/content files** match it byte-for-byte, including the integrated PDF engine, original native SVG renderer, eight cheatsheet pages, 15 interview sources and corrected 1.2.6 runtime test.
- The database remains `knowledge-atlas`, version 2, and the archive envelope is unchanged. Optional fields extend the existing validators. Full backup comparison and checkpoint boundaries have unit and component proof; durable origin proof remains blocked.
- Fixtures in `examples/content-hub` match the v2 handoff exactly. Their teaching content was not independently researched or expanded.
- Prior commands and substantive assertions remain. UI tests were adapted for the five types/shared taxonomy and relocated controls. `docs/1.2.7/TEST_CHANGES.md` records every changed regression file.
- The original cheatsheet bounding tolerance changed from 2 to 2.1 logical SVG units after the new reader scale exposed a -2.0279-unit ink bearing on an unchanged title. All semantic, overlap, frame and scale assertions remain. The exact baseline with its original tests also passed 26/26 separately; both comparison and initial failures are retained.
- Final test inputs are fingerprinted in `final-feasible/input-source-hashes.json`; no executable application/test source changed after those checks. Final documentation and the supplied preset-reference Markdown were packaged afterward.

## Outstanding release blockers

1. Complete exact lockfile dependency installation and current registry audit; resolve/record the inherited full license/SBOM boundary.
2. Pass integrated `typecheck:online`, production `build`, release integrity and actual PDF component/grid/wheel/runtime/Compare gates.
3. Pass actual normal-origin reload and fresh-profile backup restoration for old and new content, reading positions and all five workspaces, plus hosted-header tests.

No verified production build ZIP is supplied. Upload source to the feature branch and run the retained CI/default release suite before promoting the app. The full release run is NOT green.
