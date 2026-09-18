# V2.2 actual test evidence

**Verdict: NOT READY FOR COORDINATOR INTEGRATION.** This report distinguishes final unit/compatibility evidence from the failed complete release attempt and blocked durable-browser evidence. There is no production deployment or remote-host verification.

## Environment

Node 22.16.0; TypeScript 5.8.3 available through the supplied offline bootstrap; Linux; Python 3.13; system Chromium with Playwright. The runtime's managed browser policy blocks the actual loopback test URL. No policy bypass or opaque-origin persistence substitute was used. Registry DNS resolution failed (`EAI_AGAIN`), preventing a clean React/React-DOM/React-PDF/Vite installation. Exact original dependency pins were preserved.

The full runner retained its default ten-minute gate timeout. Registry retries were disabled and the fetch timeout bounded for the network diagnostic; test assertions and gate timing were not relaxed. `tools/run-release.mjs` classifies exit code 2 as BLOCKED, including typecheck exit 2; the raw logs, not the category label alone, establish the cause.

## Final source unit evidence

`npm test` completed with exit 0 after rebuilding the compatibility output: **797 tests, 797 pass, 0 fail, 0 skipped**. Log: `docs/evidence/v22/compatibility-rechecks/unit.log`; exit: `unit.exit`. The new suites contain 82 tests; inherited tests contain 715. Core typecheck also passes. Baseline test preservation is recorded in `docs/evidence/v22/baseline-preservation.json`.

New coverage includes all six versionable resource types, stable/pinned navigation, missing/wrong revision refusal, semantic diffs, restore-as-new, no-op behavior, personal/checkpoint separation, PDF source identity, history corruption/asset failures, legacy/current backup serialization, emergency snapshot coherence, strict operation validation, pure preview/stage, selected acceptance, stale bases/fingerprints, forbidden operations, query bounds and all registry families.

Agent acceptance tests use the explicitly documented `MemoryBackend` in `tests/v22/fixtures.mjs`. Synthetic failure injection proves no partial **unit-backend** candidate commit. It does not prove a real IndexedDB transaction, disk persistence or multi-tab scheduling; these are mandatory external browser gates.

## Complete 50-gate attempt

Result: **4 PASS, 36 FAIL, 10 BLOCKED; overall failure**. The clean installation failed, and the complete runner nonetheless attempted and retained all 50 commands. Later final-source fixes and supplemental checks do not overwrite this attempted run.

Machine report: `docs/evidence/v22/release-gates/results.json`. Log paths below are relative to that directory.

| Gate | Actual command | Result | Exit | Log |
| --- | --- | --- | ---: | --- |
| `clean-install` | `npm ci` | FAIL | 1 | `clean-install.log` |
| `integrated-deps` | `npm run check:integrated-deps` | FAIL | 1 | `integrated-deps.log` |
| `npm-audit` | `npm audit` | FAIL | 1 | `npm-audit.log` |
| `core-typecheck` | `npm run typecheck` | BLOCKED | 2 | `core-typecheck.log` |
| `unit` | `npm test` | FAIL | 1 | `unit.log` |
| `offline-release` | `npm run check:release:offline` | FAIL | 1 | `offline-release.log` |
| `online-syntax` | `npm run test:online:syntax` | FAIL | 1 | `online-syntax.log` |
| `local-inventory` | `npm run audit:local` | FAIL | 1 | `local-inventory.log` |
| `dom` | `npm run test:dom` | FAIL | 1 | `dom.log` |
| `hardening` | `npm run test:hardening:ui` | FAIL | 1 | `hardening.log` |
| `reader` | `npm run test:reader:ui` | FAIL | 1 | `reader.log` |
| `compact` | `npm run test:compact:ui` | FAIL | 1 | `compact.log` |
| `finish-ui` | `npm run test:finish:ui` | FAIL | 1 | `finish-ui.log` |
| `backup-diagnostic` | `npm run test:backup:diagnostic` | FAIL | 1 | `backup-diagnostic.log` |
| `pdf-authoring` | `npm run test:pdf:authoring` | PASS | 0 | `pdf-authoring.log` |
| `workspaces-ui` | `npm run test:workspaces:ui` | FAIL | 1 | `workspaces-ui.log` |
| `simplified-ui` | `npm run test:simplified:ui` | FAIL | 1 | `simplified-ui.log` |
| `reading-ui` | `npm run test:reading:ui` | FAIL | 1 | `reading-ui.log` |
| `interview-content` | `npm run test:interviews` | PASS | 0 | `interview-content.log` |
| `polish-ui` | `npm run test:polish:ui` | FAIL | 1 | `polish-ui.log` |
| `integrated-typecheck` | `npm run typecheck:online` | BLOCKED | 2 | `integrated-typecheck.log` |
| `integrated-build` | `npm run build` | FAIL | 1 | `integrated-build.log` |
| `public-release` | `npm run check:release` | FAIL | 1 | `public-release.log` |
| `component-harness` | `npm run build:test-harness` | FAIL | 1 | `component-harness.log` |
| `pdf-component` | `npm run test:pdf:component` | FAIL | 1 | `pdf-component.log` |
| `pdf-grid` | `npm run test:pdf:grid` | FAIL | 1 | `pdf-grid.log` |
| `pdf-wheel` | `npm run test:pdf:wheel` | BLOCKED | 2 | `pdf-wheel.log` |
| `pdf-runtime` | `npm run test:pdf` | BLOCKED | 2 | `pdf-runtime.log` |
| `finish-integrated` | `npm run test:finish:integrated` | BLOCKED | 2 | `finish-integrated.log` |
| `runtime` | `npm run test:runtime` | BLOCKED | 2 | `runtime.log` |
| `workspaces-runtime` | `npm run test:workspaces:runtime` | FAIL | 1 | `workspaces-runtime.log` |
| `saved-states-runtime` | `npm run test:savedstates:runtime` | FAIL | 1 | `saved-states-runtime.log` |
| `reading-runtime` | `npm run test:reading:runtime` | FAIL | 1 | `reading-runtime.log` |
| `headers` | `npm run test:headers` | FAIL | 1 | `headers.log` |
| `cheatsheets-content` | `npm run test:cheatsheets` | PASS | 0 | `cheatsheets-content.log` |
| `cheatsheets-ui` | `npm run test:cheatsheets:ui` | FAIL | 1 | `cheatsheets-ui.log` |
| `cheatsheets-runtime` | `npm run test:cheatsheets:runtime` | BLOCKED | 2 | `cheatsheets-runtime.log` |
| `stabilization-ui` | `npm run test:stabilization:ui` | FAIL | 1 | `stabilization-ui.log` |
| `stabilization-runtime` | `npm run test:stabilization:runtime` | FAIL | 1 | `stabilization-runtime.log` |
| `content-hub-ui` | `npm run test:content-hub:ui` | FAIL | 1 | `content-hub-ui.log` |
| `content-hub-runtime` | `npm run test:content-hub:runtime` | BLOCKED | 2 | `content-hub-runtime.log` |
| `references-unit` | `npm run test:references` | FAIL | 1 | `references-unit.log` |
| `references-ui` | `npm run test:references:ui` | FAIL | 1 | `references-ui.log` |
| `references-runtime` | `npm run test:references:runtime` | BLOCKED | 2 | `references-runtime.log` |
| `final-polish-runtime` | `npm run test:final-polish:runtime` | FAIL | 1 | `final-polish-runtime.log` |
| `release-blockers-runtime` | `npm run test:release-blockers:runtime` | FAIL | 1 | `release-blockers-runtime.log` |
| `history-unit` | `npm run test:history` | FAIL | 1 | `history-unit.log` |
| `agent-unit` | `npm run test:agent` | FAIL | 1 | `agent-unit.log` |
| `pdfatlas-provenance` | `npm run check:pdfatlas` | PASS | 0 | `pdfatlas-provenance.log` |
| `v22-runtime` | `npm run test:v22:runtime` | BLOCKED | 2 | `v22-runtime.log` |

## Supplemental final-source checks

These use the explicitly selected compatibility output where needed. They are **not** a replacement for the release runner. Machine report: `docs/evidence/v22/compatibility-rechecks/results.json`. Logs use each gate ID plus `.log`.

| Check | Actual command | Result | Exit |
| --- | --- | --- | ---: |
| `typecheck` | `npm run typecheck` | PASS | 0 |
| `offline-release` | `npm run check:release:offline` | PASS | 0 |
| `online-syntax` | `npm run test:online:syntax` | PASS | 0 |
| `local-inventory` | `npm run audit:local` | FAIL | 1 |
| `content` | `npm run validate` | PASS | 0 |
| `interviews` | `npm run test:interviews` | PASS | 0 |
| `cheatsheets` | `npm run test:cheatsheets` | PASS | 0 |
| `pdfatlas` | `npm run check:pdfatlas` | PASS | 0 |
| `examples` | `node tools/generate-v22-examples.mjs` | PASS | 0 |
| `runtime-syntax` | `python -m py_compile tests/v22_runtime.py` | PASS | 0 |
| `headers-offline` | `python tests/headers_test.py` | PASS | 0 |
| `runtime-compatibility` | `python tests/v22_runtime.py` | BLOCKED | 2 |
| `integrated-typecheck` | `npm run typecheck:online` | FAIL | 2 |
| `integrated-build` | `npm run build` | FAIL | 1 |

The supplemental local inventory failure reports missing/inconsistent installed packages; all 113 vendor byte hashes pass. The offline header test made real HTTP requests and checked the packaged headers, but did not inspect deployed Netlify responses. Isolated syntax emit does not verify imported modules or runtime behavior. Integrated build failed before output because `react` was missing; no production `dist/` was produced.

The examples generator passed **25 operation kinds, 23 accepted synthetic plans, 4 backup fixtures**. Generated ChangeSet bases belong to a synthetic unit workspace, not a user's database: refresh IDs/revisions/fingerprints against exported live context before constructing a real proposal.

## Browser/runtime and viewport evidence

The latest normal-origin compatibility attempt returned exit 2 at initial navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Raw report: `docs/evidence/v22/compatibility-rechecks/runtime-compatibility/results.json`. The default production runtime attempt separately reports missing integrated build. No V2.2 screenshot was captured; empty console/request arrays are not clean-runtime proof.

The following remain **unverified**, not passed: real v2-to-v3 upgrade with existing bytes preserved; interrupted/resumed migration; reload/close/open durability; two-tab races; native PDF old/current A/B and legacy wheel/grid/embedded-link regression; fresh-context complete backup restore; actual read-only controls; stable-role browser interactions; responsive/focus inspection at 1440x900, 1100x800, 800x900 and 390x844.

`tests/v22_runtime.py` contains normal-origin migration/reload/review/restore flows and screenshot hooks. It must be executed against the integrated build in a normal browser environment. The handoff's broader manual surface/keyboard matrix remains necessary, including tree context menus and all content editors; having the script present does not establish complete matrix coverage.

## Reproduction

From the source root in an environment with registry and browser access:

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install chromium
npm run typecheck:online
npm run build
npm run test:release
```

The inherited browser helper can also use an installed supported Chromium, according to its existing configuration. Do not carry `ATLAS_DIST=dist-offline` or `ATLAS_V22_DIST=dist-offline` into production acceptance. The coordinator should record the resulting Git SHA, clean build identity, actual screenshots, console/network/storage logs and fresh-context restore evidence.

For explicitly limited offline investigation:

```sh
npm run bootstrap:offline
npm run typecheck
npm test
node tools/generate-v22-examples.mjs
node tools/run-v22-compatibility-checks.mjs
```

The final command intentionally returns nonzero if any attempted supplemental check fails or is blocked. It does not relabel missing integrated capabilities as passes.
