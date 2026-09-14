# AtlasNote 1.2.1 - Final executed test status

**Overall: NOT production-ready.** Independent source changes and compatibility regressions pass. The integrated dependency lock/build and normal-origin browser gate have not completed. No successful integrated renderer, production dist or deployment is claimed.

Evidence root below: `docs/evidence/1.2.1/` (also `/mnt/data/atlasnote-1.2.1-evidence/` in this runtime). Results are intentionally not combined into an inflated single count.

## Executed functional/regression results

| Category | Exact command | Result | Evidence |
|---|---|---|---|
| Core typecheck | `npm run typecheck` | PASS, exit 0 | `final-static/typecheck.log` |
| Core unit | `npm test` | **208 PASS, 0 FAIL, 0 skipped**; baseline 176 -> 32 additional cases | `final-static/core.log` |
| Public compatibility validation | `npm run check:release:offline` | PASS; 10 public pages, 3 stored projects, 1 glossary term; strict discovery counts are mode-specific | `final-static/release-offline.log` |
| DOM | `npm run test:dom` | **14 PASS, 0 FAIL** | `final-dom/dom-tests.json` |
| Hardening | `npm run test:hardening:ui` | **39 PASS, 0 FAIL** | `final-hardening/results.json` |
| Reader | `npm run test:reader:ui` | **18 PASS, 0 FAIL** | `final-reader/reader-11-dom.json` |
| Compact | `npm run test:compact:ui` | **11 PASS, 0 FAIL** | `final-compact/results.json` |
| New 1.2.1 finish UI | `npm run test:finish:ui` | **14 PASS, 0 FAIL** | `final-finish-ui/results.json` |
| PDF authoring | `npm run test:pdf:authoring` | **12 PASS, 0 FAIL**; real PDF byte/text/page/render comparisons | `pdf-authoring/pdf-authoring-tests.json` |
| Backup equality diagnostic | `npm run test:backup:diagnostic` | PASS; exact personal equality, no undefined paths, empty structural diff | `final-backup/results.json` |
| Online syntax only | `npm run test:online:syntax` | PASS for 3 source modules; NOT real React-PDF typecheck or runtime | `final-static/online-syntax.log` |
| Clean compatibility build | Clean temporary source copy, `node tools/bootstrap-offline.mjs`, `npm run build:offline`, `npm run check:release:offline` | PASS; **176/176 generated files byte-identical** to live compatibility build | `clean-offline/results.json`, `sha256.json` |
| Local headers | `ATLAS_DIST=dist-offline npm run test:headers` | PASS for 3 actual HTTP paths; NOT hosted integrated/remote headers | `headers-compatibility/headers.json` |
| PDF metadata pin/bytes | `npm run pdfatlas:sync` plus local archive SHA/byte/page inspection | PASS, exact reviewed commit and both original PDFs unchanged | `public-pdf-originals.json` |

DOM tests mount actual compiled components into the permitted about:blank harness and suppress IndexedDB writes. They are not durable-storage evidence. Private-import DOM paths retain their explicit test-only digest adapters. The core serializer tests operate on real ZIP bytes but do not prove browser IndexedDB.

## Failed commands and blocked release gates

| Category | Command / attempted gate | Actual result | Evidence |
|---|---|---|---|
| Integrated installation | `npm run enable:online` | **FAILED, exit 1**: registry DNS `EAI_AGAIN`; no integrated dependencies installed/locked | `dependencies/run.log`, `npm-enable-debug.log` |
| Clean npm install | `npm ci --fetch-retries=0 --fetch-timeout=5000` | **FAILED, exit 1** after failed registry fetches; npm also reports `Exit handler never called!` | `dependencies/run.log`, `npm-ci-debug.log` |
| Live vulnerability audit | `npm audit --json --fetch-retries=0 --fetch-timeout=5000` | **FAILED, exit 1**: audit endpoint DNS; vulnerabilities UNKNOWN, not zero | `dependencies/run.log`, `npm-audit-debug.log` |
| Local dependency inventory | `npm run audit:local` | **FAIL, exit 1**: 12/15 lockfile packages not separately installed. **113/113 vendor hashes PASS.** Bootstrap is not a complete npm installation | `final-static/audit-local.log`, `dependency-inventory.json` |
| Integrated typecheck | `npm run typecheck:online` | **FAILED, exit 2 / validation BLOCKED**: React, React-PDF, ReactDOM and types unavailable; no full integrated typing certification | `final-static/typecheck-online.log` |
| Hosted build | `npm run build`; also `npm run build:vite` | **FAILED, exit 1 / build BLOCKED** by exact dependency gate; no fallback silently emitted | `final-static/build-integrated.log`, `static-final/build-vite.log` |
| Hosted release validation | `npm run check:release` | **FAILED, exit 1**: no integrated `dist/`; resource inventory cannot be verified without the real build | `final-static/release-integrated.log` |
| Existing integrated PDF | `npm run test:pdf` | **0 PASS, 0 executed FAIL, 17 BLOCKED**, exit 2; no worker metadata/build | `integrated-pdf/results.json` |
| New integrated finish | `npm run test:finish:integrated` | **0 PASS, 0 executed FAIL, 14 BLOCKED**, exit 2 | `integrated-finish/results.json` |
| Real-origin production runtime | `npm run test:runtime` | **0 PASS, 13 BLOCKED**, exit 2; integrated distribution prerequisite absent | `runtime-production/results.json` |
| Real-origin compatibility diagnostic | `ATLAS_DIST=dist-offline npm run test:runtime` | **0 PASS, 13 BLOCKED**, exit 2; `ERR_BLOCKED_BY_ADMINISTRATOR` before app load | `runtime-compatibility/results.json` |
| Playwright-managed install | `python -m playwright install --with-deps chromium` | Did not finish; Debian DNS failed, explicitly bounded outer timeout exit 124 | `python-dependencies/run.log` |

The two real-origin runs are the same 13-phase gate under different explicit prerequisites, not 26 independent tests. A BLOCKED result does not satisfy the requested release gate. The full backup download/fresh context/restore/second reload remains unverified here.

Pinned Python prerequisites are present: `python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt` returned 0, with Playwright 1.57.0, PyMuPDF 1.26.7 and Pillow 12.3.0 already satisfied. Browser tests used installed system Chromium, not a successfully installed Playwright-managed browser. Node is 22.16.0; compatibility compilation used TypeScript 5.8.3 via the explicit vendored bootstrap.

The inherited precompiled Mermaid dependency/license closure remains unverified; the local audit describes that limit. No vulnerability or complete-SBOM certification is inferred from byte integrity.

## Backup diagnosis and test integrity

Before changing production logic, the diagnostic recorded exact personal objects and a structural diff. The 1.2 note remark writer created own `anchor: undefined` and `revision: undefined` fields; JSON omitted them. The baseline records are in `baseline/backup-diagnostic/`.

The source fix is at writer/ownership boundaries, not a normalization in the equality assertion. Known absent optional keys alone are repaired. Backup freezes the input before asynchronous reads and shares an explicit production reader flush/snapshot point with the real-origin test. Meaningful state, timestamps, anchors and histories are not deleted. A failed save does not prevent a disclosed emergency in-memory backup.

The final DOM diagnostic uses the actual remark handler and actual production backup/ZIP parser and now gives exact equality. It cannot establish that every possible CI mismatch is fixed until the complete production-origin test executes. That test retains exact post-flush canonical vs persisted equality, downloaded personal equality, fresh restored state and second-reload equality; failures write before/after/diff evidence.

## Visual and fullscreen evidence

Actual tree/note/native-shell screenshots cover **390x844, 1366x768, 1440x900, 1920x1080** in `final-finish-ui/`; theme/Compare/context captures are in the compact and reader folders.

The fallback strip is at most 36px and its frame uses at least 75% of the pane in the four measured viewports. The native PDF content does not paint in this harness: captures show the grey/error placeholder. This is **frame geometry evidence, not readable artwork or integrated PDF evidence**.

Reader tests observed actual owned browser fullscreen (`browserFullscreen: true`) for note modes. Dedicated finish tests explicitly simulate API grant/rejection/change and prove application behavior; their Focus screenshots do not certify visible browser-chrome removal. Integrated fullscreen/spread/canvas screenshots could not be obtained without the real engine.

The obsolete mixed-tree assertion and old no-fullscreen assertion were updated to the new requested contracts. Empty-folder CRUD tests now use the explicit management/collection UI. No backup equality or meaningful saved-state fields were relaxed.

## Distribution state

- Live modified source remains `/mnt/data/atlasnote-1.2.1-workspace/`.
- `dist-offline/` is a verified compatibility output, not the hosted candidate.
- The stale earlier native `dist/` was removed; no deployable integrated `dist/` is present.
- `package-lock.json` contains only the application version change, not a resolved React-PDF closure.
- No GitHub, Netlify, deployment or public PDF modification was performed.
