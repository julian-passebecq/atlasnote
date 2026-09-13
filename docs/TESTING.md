# AtlasNote 1.2.1 verification

Consult `../FINAL_TEST_STATUS.md` for this execution, not an assumed green release.

## Reproducible primary installation

`npm ci` must use a committed, complete integrated lock. `npm run check:integrated-deps` checks exact installed/manifest/lock versions and the React-PDF/PDF.js pair. The explicit `enable:online` development command authors a missing lock once; it is deliberately absent from CI/deploy. Record `npm audit`; a registry failure is not zero vulnerabilities.

```sh
npm ci
npm run check:integrated-deps
npm audit
npm run typecheck
npm test
npm run check:release:offline
npm run test:online:syntax
npm run audit:local
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:dom
npm run test:hardening:ui
npm run test:reader:ui
npm run test:compact:ui
npm run test:finish:ui
npm run test:backup:diagnostic
npm run test:pdf:authoring
npm run typecheck:online
npm run build
npm run check:release
npm run test:pdf
npm run test:finish:integrated
npm run test:runtime
npm run test:headers
```

`npm test` builds only `dist-offline/`. The final integrated build is `dist/` and must remain the exact distribution tested/deployed. Both contain only reviewed public content and synthetic examples. Missing worker/CMaps/WASM/fonts or a mismatched inventory rejects the integrated release check.

## Scope boundaries

- Core unit tests exercise production pure/state/serializer logic; they do not prove IndexedDB.
- DOM suites use the real compiled components in an `about:blank` harness and suppress write queues. They measure actual browser geometry/actions, not normal-origin durable storage. Some private-import checks use an explicitly documented digest bridge.
- The reader suite reports actual Fullscreen API ownership where granted. The dedicated finish DOM tests deliberately simulate grant/rejection/exit paths; their screenshots must not be described as proof browser chrome was removed.
- `test:pdf` has 17 actual React-PDF/worker acceptance cases. `test:finish:integrated` adds real canvas/geometry/fullscreen/fallback/build-asset cases. Both refuse to substitute a successful fake engine or native iframe.
- `test:runtime` is the real entry, real origin, real IndexedDB, actual backup download and independent fresh restore/reload. It invokes the production snapshot flush, compares exact canonical/persisted personal state, records a structural backup diff, and retains strict downloaded/restored equality. Exit 2 is BLOCKED, not success.
- `test:pdf:authoring` checks actual synthetic PDF bytes, page/text hashes and rendered before/after pixels, not viewer runtime.
- `test:headers` uses a local HTTP server; it cannot certify remote hosting responses.
- `audit:local` checks installed-version inventory and inherited vendor integrity, not live vulnerability advisories or a complete Mermaid SBOM.

`ATLAS_EVIDENCE=/absolute/path` selects browser evidence output. `ATLAS_DIST=dist-offline` may explicitly test compatibility HTTP behavior; this is not hosted production evidence. The DOM harness always chooses `dist-offline`.

## Current environment boundaries

Registry and Debian-host DNS fail. Existing Python packages satisfy the pinned requirements, and system Chromium is available, but installing the Playwright-managed browser/dependencies did not complete. Normal HTTP page navigation is blocked by administrator policy. Do not change policy, seed/mock IndexedDB, weaken equality, serve a different renderer as proof, or mark missing prerequisites green.

Requested screenshot sizes are 390x844, 1366x768, 1440x900 and 1920x1080. Filename/report scopes distinguish Notes/PDF discovery, native fallback shell, actual note Focus and future integrated-only screenshots.
