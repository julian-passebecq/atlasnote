> Current V2.1 stabilization + polish pass: [delivery report](docs/final-polish/DELIVERY.md), [file inventory](docs/final-polish/FILES.md), and [test results](docs/final-polish/TESTS.md). The material below is retained historical evidence from the earlier V2 pass.

# AtlasNote V2 stabilization - start here

This is the completed bounded improvement implementation, not another handoff-only package. Package version remains **2.0.0**. Production release is **not cleared**: normal-origin browser/storage tests, clean installation and the full security/license review remain open.

Required audited starting SHA: `fc41a5a5ac843f228175194b6a679867843530d8`.
Inspected remote head on resumption: `f366f015bb6ace49d3c367b3d76ff278779a53ba` on `v2manualupload` (PR #13). Its two commits only add four diagnostic files. Those files are preserved exactly; the implementation continues the required audited application source.

## Read in order

1. `FINAL_TEST_STATUS.md` - actual results and verification limits.
2. `REQUIREMENTS_COVERAGE.md` - every section of the improvement handoff.
3. `docs/stabilization/PDF_RESTORE_DIAGNOSIS.md` - the original PDF restore blocker and the meaningful test correction.
4. `docs/stabilization/USER_GUIDE.md` - changed controls and optional demo.
5. `V2_REFERENCE_MODEL.md` - unchanged architecture plus source-edit safety boundaries.
6. `WORKSPACE_READY_FOR_GITHUB.md` - source provenance and safe manual integration.

The external delivery manifest identifies the exact final local commit, tree, ZIP hash and source inventory. Local Git history was reconstructed from source snapshots; it is not an upstream clone and its local commits are not on GitHub.

## Run locally

```sh
npm ci
npm run build
npm run preview
```

Node >=22.12 is required by the existing project. Install the committed Python test requirements and Playwright Chromium for browser tests. On a normal development environment run `npm run test:release`; it retains every gate and adds the two focused stabilization suites. It is not a passing skip mechanism.

Do not merge, deploy, restart the app, remove failing gates, or put private content/backups into GitHub. No remote write was made during this retry.
