# Inherited completion fixture isolation

## Defect and scope

On Cloudflare candidate `f9b426938e6c531754374dfb73bf71f6a4c40172`, the
V2.3 release and all 13 hosted-provider cases passed. Inherited command 52's
browser assertions passed, but its setup regenerated 25 tracked example JSON
files with fresh timestamps/revision IDs. The inherited source-drift guard
correctly failed the command; commands 53 and 54 were not executed.

This repair changes test-fixture placement, not AtlasNote application behavior.
`npm run test:completion:runtime` now calls `tools/run-completion-runtime.mjs`.
It runs the same generator into a unique OS temporary directory, then invokes
the same integrated Python browser suite with `ATLAS_V22_EXAMPLES_DIR` pointing
to that directory. Every fixture-consuming case reads that location. The runner
removes only its own temporary directory on normal completion or reported failure.
Generator/browser failures, signals, timeouts and missing executables remain
non-green. Abrupt host termination can still leave an OS temporary directory;
never use broad wildcard deletion as cleanup.

All browser acceptance assertions and the 54-command inherited list are retained.
The full V2.3 prerequisite, clean-source requirements and source-drift guard remain
unchanged. No generated source is restored or ignored to manufacture a PASS.
A new commit requires new build and live-preview evidence; the old green report
is historical evidence only.

## Commands

- `npm run generate:v22:examples` remains an explicit documentation-authoring
  operation and intentionally writes `docs/examples/v22`. Do not run it during
  qualification of a frozen source candidate.
- `node tools/generate-v22-examples.mjs --output-dir DIRECTORY` generates the
  same synthetic examples/archives into an explicitly selected directory.
- `npm run test:completion:runtime` owns fresh temporary fixtures and runs the
  original integrated browser suite. It needs the existing `dist-offline`
  fixture modules and real integrated `dist`; it never relabels one as the other.
- `node --test tests/completion-fixture-isolation.test.mjs` tests orchestration,
  failure propagation, concurrent isolation and real archive generation. It is
  not a substitute for the integrated browser suite or the inherited workflow.

`ATLAS_PYTHON` may name a Python executable path. Shell command strings are not
supported. The caller's normal PATH is otherwise used, as with the earlier
`python tests/completion_v22_runtime.py` invocation. Hosted credentials are not
passed into either local synthetic-data generation or the local browser suite.

## Finish order

First run the three former tail commands as focused diagnostics on the fixed
source: completion runtime, PDF lifecycle, then headers. Keep their logs separate
from inherited evidence. This catches an inexpensive remaining tail failure
before another full capacity run; it does not certify a release or bypass the
inherited prerequisite.

Freeze the final source, build it cleanly, and qualify a fresh protected Cloudflare
version preview. Run the full V2.3 contract and only after it is fully green run
`npm run test:inherited:after-v23` for all 54 commands. Do not reuse old results or
run only the final three commands and call that full inherited success. No
AtlasNote production deployment is authorized.

## Clean CI checkout prerequisite

Both jobs in `v23-qualification.yml` now build the compatibility fixtures before
the integrated build. V2.3 unit modules import `dist-offline`; a fresh checkout
previously reached those imports with only `dist` present. This is environment
preparation, not an alternate release target. Runtime and hosted checks still
require the exact integrated `dist`, and all mandatory gates are unchanged.
