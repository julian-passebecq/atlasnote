# AtlasNote 1.2.6 - final test status

**Implementation delivered; NOT cleared for production release.** No merge or deployment was performed.

Exact starting commit: `d1ecfd70c2f9d72c374a1c1c897d10a05d718dc5`. Final local implementation identity is recorded in the external manifest. The complete 37-gate release runner was executed, not skipped. Its actual result was **3 PASS, 27 FAIL, 7 BLOCKED**. Later offline recovery checks do not retroactively change those results.

## Environment and chronology

Node 22.16.0, npm 10.9.2, TypeScript 5.8.3, Python Playwright and Chromium 144.0.7559.96 on Linux. The clean install ended with npm's `Exit handler never called` failure; registry access/audit also reported `EAI_AGAIN registry.npmjs.org`. Required locked React/Vite/React-PDF packages were not available. That failed installation left an incomplete node_modules tree and removed the existing compatibility build during the next pretest build, causing downstream build/server failures. Logs retain their actual exits, rather than changing every dependent failure into a passing or skipped test.

After the full runner finished, the existing `bootstrap:offline` tool restored the checked-in JSZip/Prism and local compiler fallback. Empty type-package directories left by the failed install were removed; no source/typecheck was weakened. The compatibility build was regenerated and the feasible old/new checks re-executed. This mode uses the repository's existing compatibility React bundle, not the production pinned React/PDF stack.

A separate final normal-origin attempt used the actual compatibility app entry, without an in-memory mount or fake storage. Chromium rejected localhost with **ERR_BLOCKED_BY_ADMINISTRATOR**. Its nine cases are **0 passed / 9 blocked**. The integrated form also reports a missing production build. No browser policy was bypassed.

## Latest passing evidence

| Check | Result |
|---|---|
| Unit tests | **527 / 527**, including 94 added native tests; zero skipped |
| Existing browser compatibility checks | **137 / 137** |
| New native cheatsheet browser checks | **26 / 26** |
| Combined browser compatibility checks | **163 / 163** |
| Existing PDF authoring/processing | **12 / 12** |
| Canonical source/generated pack/render/hash consistency | Four documents, eight pages; passed |
| Native rendering | Zero overflow diagnostics; 479/479 semantic text fields live; no raster/drawing fallback |
| Core TypeScript, online syntax-only check | Passed |
| Compatibility build / compatibility release integrity | Passed |
| Exact backup-payload diagnostic | Passed; no undefined fields, no payload differences |
| Audited vendor byte integrity | Passed, but installed dependency versions/full audit remain incomplete |
| Normal-origin reload and fresh-profile restore | **Blocked; not certified** |
| Integrated production/PDF checks | **Not cleared** |

Browser suite details:

| Suite | Passed / total |
|---|---:|
| dom | 14 / 14 |
| hardening | 39 / 39 |
| reader | 18 / 18 |
| compact | 11 / 11 |
| finish | 14 / 14 |
| workspaces | 9 / 9 |
| simplified | 10 / 10 |
| reading | 11 / 11 |
| polish | 11 / 11 |
| native-ui | 26 / 26 |

The native suite uses real DOM events and rendered SVG: all eight pages, physical input/Enter and keyboard controls, two-page view, four distinct physical pages in a true 2x2, independent native panes/controls, real interview-notebook Compare, PDF fallback routing only, page actions across tabs/panes/workspaces, bookmarks/Read Later, Context/Related, source import/edit/export, scroll restoration, invalid input, stable reordered/deleted targets and saved states. Its exact backup tests use a real downloaded ZIP and production decoder. They also verify a restore preview and that an IndexedDB-denied restore leaves the current state unchanged. This is **not** successful durable restore evidence.

Text copying is a synthetic DOM Selection/CopyEvent assertion, not OS clipboard certification. All eight rendered pages, mobile layout, four-page grid and interview Compare were visually inspected. Geometry checks allow 2 logical pixels for glyph ink bearings, not arbitrary overflow. SVG is fixed at 1200 x 1600 and remains internally identical across viewport widths.

## Existing tests changed, without reducing their assertions

`tests/core.test.mjs`: the original fixture inventory check still asserts the historical ten notebook sample pages/three projects, separately verifies four native documents, and updates the total to 39 pages/14 projects. The invalid-block-ID test now selects its named notebook fixture rather than the alphabetically first pack, which is now a native page with no notebook blocks.

`tests/finish_121_dom.py` and `tests/workspace_122_dom.py`: the new native project makes the exact non-PDF project count 13, not 12. Both tests retain their equality/projection/state assertions; the native project is explicitly asserted in Notes and absent from the PDF projection. Their first failed recovery results are retained beside the successful final reruns (14/14 and 9/9).

No old PDF canvas, wheel, exact backup, private-data or normal-origin assertion was disabled or replaced with a weaker proxy. The two actual UI defects found during native testing (implicit Enter blocked by a form button and SVG copy flattening newlines) were fixed in implementation. Earlier failures and reruns are retained in the external evidence archive.

## Complete release attempt: raw outcomes

The runner treats exit code 2 as BLOCKED; the table below preserves that classification, including dependency-blocked compiler commands. Use each log to distinguish environment prerequisites from assertion failures.

| Gate | Command | Raw outcome |
|---|---|---|
| clean-install | `npm ci` | FAIL |
| integrated-deps | `npm run check:integrated-deps` | FAIL |
| npm-audit | `npm audit` | FAIL |
| core-typecheck | `npm run typecheck` | BLOCKED |
| unit | `npm test` | FAIL |
| offline-release | `npm run check:release:offline` | FAIL |
| online-syntax | `npm run test:online:syntax` | FAIL |
| local-inventory | `npm run audit:local` | FAIL |
| dom | `npm run test:dom` | FAIL |
| hardening | `npm run test:hardening:ui` | FAIL |
| reader | `npm run test:reader:ui` | FAIL |
| compact | `npm run test:compact:ui` | FAIL |
| finish-ui | `npm run test:finish:ui` | FAIL |
| backup-diagnostic | `npm run test:backup:diagnostic` | FAIL |
| pdf-authoring | `npm run test:pdf:authoring` | PASS |
| workspaces-ui | `npm run test:workspaces:ui` | FAIL |
| simplified-ui | `npm run test:simplified:ui` | FAIL |
| reading-ui | `npm run test:reading:ui` | FAIL |
| interview-content | `npm run test:interviews` | PASS |
| polish-ui | `npm run test:polish:ui` | FAIL |
| integrated-typecheck | `npm run typecheck:online` | BLOCKED |
| integrated-build | `npm run build` | FAIL |
| public-release | `npm run check:release` | FAIL |
| component-harness | `npm run build:test-harness` | FAIL |
| pdf-component | `npm run test:pdf:component` | FAIL |
| pdf-grid | `npm run test:pdf:grid` | FAIL |
| pdf-wheel | `npm run test:pdf:wheel` | BLOCKED |
| pdf-runtime | `npm run test:pdf` | BLOCKED |
| finish-integrated | `npm run test:finish:integrated` | BLOCKED |
| runtime | `npm run test:runtime` | BLOCKED |
| workspaces-runtime | `npm run test:workspaces:runtime` | FAIL |
| saved-states-runtime | `npm run test:savedstates:runtime` | FAIL |
| reading-runtime | `npm run test:reading:runtime` | FAIL |
| headers | `npm run test:headers` | FAIL |
| cheatsheets-content | `npm run test:cheatsheets` | PASS |
| cheatsheets-ui | `npm run test:cheatsheets:ui` | FAIL |
| cheatsheets-runtime | `npm run test:cheatsheets:runtime` | BLOCKED |

The external evidence ZIP contains `full-release-gates/results.json` and each raw log; `FINAL_VERIFICATION_SUMMARY.json` points to final reruns without deleting failed attempts. `final-normal-origin/results.json` records the final nine blocked real-origin cases. The local dependency inventory still fails installed-version matching and reports its inherited incomplete Mermaid license/SBOM closure.

## Required before promotion

Run the unchanged locked installation and all 37 release gates on a normal developer/CI environment. Specifically prove integrated `typecheck:online`, production `build` and `check:release`, actual PDF component/grid/wheel behavior, native-plus-real-PDF Compare, normal-origin reload/private-source persistence, exact backup restore into a fresh browser profile, existing saved-state/runtime suites, headers and the dependency/license audit. Preserve the starting PDF wheel fix and old persisted data; do not reset storage or replace failures with mocked success.

See `CODEX_HANDOFF.md` for the exact branch/integration commands and `docs/1.2.6/FIXTURE_PROVENANCE.md` for source gaps and different block/text-count denominators. This is a source implementation candidate, not a deployed or certified release.
