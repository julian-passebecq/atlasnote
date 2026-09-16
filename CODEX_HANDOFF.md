# V2 integration and release verification

The implementation is complete in this source tree. See START_HERE.md for source identity and WORKSPACE_READY_FOR_GITHUB.md for safe manual integration. No repository or production change has been made by this delivery.

## First task

On the V2 test branch based on manually uploaded 1.2.7 `0c4455f8ca25eb16c882287a4dc61ddfc32f5b89`, install the exact lockfile and run the complete matrix:

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

Do not use the compatibility build to claim the integrated gates passed. Confirm the real component-harness reset renders the PDF reader rather than the Dashboard and that projected PDF tree entries are discoverable. Retain original canvas/text/physical-page checks and the V2 true-boundary wheel checks. See docs/v2/TEST_CHANGES.md.

## Required focus

Run actual PDF component/grid/wheel and runtime suites, native cheatsheet/PDF Compare, existing content-hub runtime, and `test:references:runtime`. Verify IndexedDB reload and exact full backup restoration in a fresh browser context. Verify Workspace 1-5 snapshots restore readers without rolling back concepts/edges/reviews or newer Dashboard/QCM state. Verify a Notebook exact-section reference to PDF p.N opens that physical page, and the native first-open Spread and narrow-pane preference behavior are correct.

Read the local evidence before making changes. Fix genuine failures minimally and record the failing assertion plus final rerun. Do not lower timeouts/assertions or remove cases merely to get a green result. No merge or production deployment without explicit authorization.

## Scope exclusions

No new learning game, graph canvas, cloud storage, scraper, backend, AI endpoint or ontology-owned Notebook tree. No real customer/private PDF content belongs in source control. Existing Article/QCM test examples are synthetic and remain local imports.
