# Setup and reproduction

Use Node >=22.12 (audit used 24.19.0), a functioning Python interpreter, and the committed dependencies. The laptop's default Node was 21.7.1 and therefore unsupported. Its PowerShell profile also attempted to load a broken Anaconda installation; use a clean shell / PowerShell -NoProfile if necessary. The working audit Python was Python 3.13.1, with Playwright 1.57.0, PyMuPDF 1.26.7 and Pillow 12.3.0.

From source/:

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install chromium
npm run typecheck:online
npm run build
npm run test:release
```

Set ATLAS_RELEASE_EVIDENCE to a fresh directory outside historical evidence if desired. The runner retains each gate's real exit/log and uses its default 600000 ms timeout. Do not carry ATLAS_DIST=dist-offline or ATLAS_V22_DIST=dist-offline into production acceptance. The runtime fixture also depends on dist-offline, created by npm test's pretest.

The source archive preserves exact committed LF bytes. That does not prove the pending .gitattributes fix works in a new normal Windows Git checkout. Test that separately after making the fix.

To reproduce the diagnosed Python issue before fixing it:

```sh
python tests/v22_runtime.py
python -X utf8 tests/v22_runtime.py
```

Use separate ATLAS_EVIDENCE directories. The first failed on this laptop's CP1252 default; the second passed. Do not present a UTF-8 workaround as a committed fix.

## Included evidence

- evidence/release-gates: ordinary CRLF checkout, 9/50 pass.
- evidence/release-gates-lf: exact-byte full run, 49/50 pass.
- evidence/v22-diagnostic-capture: visible underlying hash-mismatch warning.
- evidence/v22-utf8: unchanged final runtime test passing with explicit UTF-8 mode.
- evidence/github-evidence: successful Linux CI test artifacts for run 35384025755.
- evidence/audit: root logs, identity/hash comparisons, GitHub run/job metadata, original supplemental and diagnostic scripts, screenshots and supplemental results.

The original scripts and report links preserve the laptop's D:/PROJ/atlasnote-audit-20260918 paths as historical evidence. Adapt paths before rerunning them elsewhere. tools/supplemental_checks_portable.py provides a relocatable version of the supplemental browser checks, defaulting to the included audited CI build. Set ATLAS_AUDIT_DIST to another integrated build path to test it; update/report tested identity separately. It uses disposable synthetic browser contexts, not the real user profile.

Serve the included candidate build over localhost through source/tools/serve.mjs with ATLAS_DIST set to its absolute directory; do not open index.html with file://. Build is labelled NOT_FINAL because fixes remain pending.

The extracted source is not a Git repository. Use git/SOURCE_IDENTITY.json to correlate it with the existing repository. If Git metadata is needed, clone/fetch the real repository and select the audited commit after inspecting current state. No full Git history bundle is included.

## Integrity

SHA256SUMS.txt covers every payload file including MANIFEST.json. The checksum list itself is excluded to avoid circular hashing. MANIFEST.json describes payload inventory and exclusions. The outer ZIP has a separate .sha256 file beside it.
