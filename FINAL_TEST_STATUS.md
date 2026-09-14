# AtlasNote 1.2.3 - actual final validation

**Implementation and source packaging complete. Not deployed or production-certified.**

The final local command set has **21 PASS, 6 BLOCKED, 0 implementation/test failures**. Blocking results are not green release gates. A clean npm ci was not attempted in this network-restricted workspace; installed dependency closure was verified separately. See `docs/evidence/1.2.3/final/results.json` and its logs.

## Executed successes

- **339 core tests passed**, 0 failed, skipped or TODO. This includes immutable checkpoints, scope isolation, all five sessions, automatic undo, optional absence, safe limits, malformed data rejection, timestamp range checks and an exact full-backup ZIP serialize/parse round trip with saves/undo/history.
- **10 new UI groups passed** using the actual App/actions with an explicitly in-memory store on about:blank. Default hidden controls, exact rail order, category/glossary navigation, save/restore, manager details, undo and responsive geometry were exercised.
- **11 actual PDF-component groups passed** with real React-PDF/PDF.js canvases and shipped synthetic PDF bytes. Natural Single scrolling, slow forward/reverse turns, one-turn momentum, Spread versus Compare, physical-page links, saved intra-page positions, all-workspace pane restoration, local preparation, metadata edit/promotion and Continuous scroll were exercised. This is not a fake PDF renderer; it is also **not IndexedDB evidence**.
- Existing DOM, hardening, reader, compact, finish and workspace UI regressions passed after their interaction selectors/setup were adapted to the requested interface.
- Both TypeScript checks, offline/integrated build validation, pinned dependency/worker integrity, private-public exclusion, backup diagnostic, PDF-authoring tests and headers passed.

## Still blocked outside the implementation

Five normal-origin browser scripts stop at the first localhost navigation with **net::ERR_BLOCKED_BY_ADMINISTRATOR**: PDF runtime, integrated finish, release runtime, workspace runtime and saved-state runtime. No browser policy was bypassed. Their actual IndexedDB/reload/fresh-browser-context contracts are not claimed as passing. The scripts remain mandatory in CI; the new or changed normal-origin selectors need execution confirmation there.

The current **npm vulnerability audit** could not contact the registry: **EAI_AGAIN registry.npmjs.org**. This is no claim of zero vulnerabilities. Run clean `npm ci`, `npm audit` and all release gates with registry access before promotion.

## Exact command results

| Command | Result | Exit | Log under docs/evidence/1.2.3/final |
|---|---|---:|---|
| `npm run check:integrated-deps` | PASS | `0` | `dependency-closure.log` |
| `npm run typecheck` | PASS | `0` | `typecheck.log` |
| `npm run typecheck:online` | PASS | `0` | `typecheck-online.log` |
| `npm test` | PASS | `0` | `core.log` |
| `npm run check:release:offline` | PASS | `0` | `offline-release.log` |
| `npm run test:online:syntax` | PASS | `0` | `syntax.log` |
| `npm run audit:local` | PASS | `0` | `local-audit.log` |
| `npm run test:dom` | PASS | `0` | `dom.log` |
| `npm run test:hardening:ui` | PASS | `0` | `hardening.log` |
| `npm run test:reader:ui` | PASS | `0` | `reader.log` |
| `npm run test:compact:ui` | PASS | `0` | `compact.log` |
| `npm run test:finish:ui` | PASS | `0` | `finish-ui.log` |
| `npm run test:workspaces:ui` | PASS | `0` | `workspace-ui.log` |
| `npm run test:simplified:ui` | PASS | `0` | `new-ui.log` |
| `npm run test:backup:diagnostic` | PASS | `0` | `backup-diagnostic.log` |
| `npm run test:pdf:authoring` | PASS | `0` | `pdf-authoring.log` |
| `npm run build` | PASS | `0` | `build.log` |
| `npm run check:release` | PASS | `0` | `release.log` |
| `npm run build:test-harness` | PASS | `0` | `component-build.log` |
| `npm run test:pdf:component` | PASS | `0` | `pdf-component.log` |
| `npm run test:pdf` | BLOCKED | `2` | `pdf-runtime.log` |
| `npm run test:finish:integrated` | BLOCKED | `2` | `finish-integrated.log` |
| `npm run test:runtime` | BLOCKED | `2` | `runtime.log` |
| `npm run test:workspaces:runtime` | BLOCKED | `2` | `workspace-runtime.log` |
| `npm run test:savedstates:runtime` | BLOCKED | `2` | `saved-state-runtime.log` |
| `npm run test:headers` | PASS | `0` | `headers.log` |
| `npm audit --json --fetch-timeout=10000 --fetch-retries=0` | BLOCKED | `1` | `npm-audit.log` |

## Environment and evidence scope

Node v22.16.0, Python 3.13.5, system Chromium via Playwright. Dependencies were restored from the downloaded verified GitHub input artifact; `.bin` links lost by ZIP extraction were reconstructed from installed package manifests. No package versions or PDF/vendor byte baselines were rewritten.

A normal-origin test is not replaced by the about:blank harness. A full-backup serialization unit test is not described as persisted browser restoration. Historical earlier-release reports are retained only under clearly historical paths and are not this release's results. Generated private-style test backups are excluded from the delivery ZIP.

## Source provenance

Remote baseline commit: `476f327ae77eb9103f2e5d079b87b6a541ddc782`.
Exact baseline tree checked before editing: `2d07e499cab9236f5a098e2d08513f98f3e1b4f3`.
The delivered patch reproduces the complete source from that baseline; package verification and source checksums are in `handoff/`. No remote source write, merge or deployment was performed in this completion pass.
