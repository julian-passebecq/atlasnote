# AtlasNote V2 stabilization - actual test evidence

Final local commit: `454202e3ba2642e9afd86e43db21b368c8a84e62`. Tree: `f2c1205a8101ecd2c7830d3ebf10104ad32a3431`. Neither was pushed.

## Final results to read first

- `final-result-index.json`: command-by-command actual pass/fail/blocked index and source identity.
- `unit-final2.log`: full 705/705 unit run, including the last metadata-title guard.
- `sealed-final/summary.json`: final core/integrated typecheck, production build, release integrity, component-harness build and focused UI rerun.
- `sealed-final/ui/results.json`: 31/31 focused visible-UI checks and screenshots, no browser exceptions. In-memory harness, not durable IndexedDB.
- `compat-final/summary.json`: 206/206 checks across 12 existing DOM suites.
- `final-pdf/summary.json`: 34/34 actual React-PDF/PDF.js component checks (11 component,12 grid,11 wheel). Real canvases/worker/text layer, in-memory mounted application.
- `final-pdf/test-pdf-grid/compare-state.json`: stage-labelled independent Grid/Spread state before/after all-workspace restoration.
- `final-gates/summary.json`: other required commands, including 12 PDF authoring checks, backup diagnostic, library/headers and blocked runtime attempts.
- `stabilization-runtime/` and `theme-hosted-attempt/`: actual production-origin attempts, blocked before navigation by ERR_BLOCKED_BY_ADMINISTRATOR.
- `dependencies/`: real clean-install timeout and audit DNS failure. No vulnerability or fresh-install clearance claimed.
- `protected-source-integrity.json`: 114 protected files unchanged from the audited source.
- `source-integrity.json` and `source-inventory.json`: independently extracted ZIP bytes, Git blobs/modes and reconstructed source tree.

## Earlier evidence retained, not final passing outcomes

`baseline/` shows the inherited 11/12 PDF grid result; `pdf-fix/` shows the correction. `compat/`, older unit logs, `stabilization-ui1/`, `stabilization-ui2/`, and `sealed-screenshot-attempt/` retain development failures. The screenshot-only failure attempted to dismiss a toast behind a modal; its helper was corrected without weakening an application assertion. `stabilization-ui-final/` is an earlier passing31check run, superseded for the last source change by `sealed-final/ui/`.

All scores are test results, not a production-release certification. Clean install, real-origin/IndexedDB/reload/fresh-profile tests, current vulnerability review and complete inherited Mermaid license closure remain unresolved. The source includes reproducible commands and the runtime tests to run in a normal environment.

No recovered node_modules, runtime tarball, private library, font binaries or credentials are included here. Only test logs/results and synthetic/public test captures are packaged.
