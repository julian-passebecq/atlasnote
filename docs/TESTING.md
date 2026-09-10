# Test commands and evidence boundaries

All commands run from the repository root. The current evidence is in `docs/evidence/hardening/`; root-level evidence files are historical, not a claim of a new runtime pass.

## Setup

```sh
npm ci
python -m pip install -r requirements-test.txt
python -m playwright install chromium
```

Use Node.js 22.12+ and Python 3.10+. `CHROMIUM_PATH` may point at an existing browser. The tests do not change managed browser policy. The UI/runtime test helpers start and stop their own local server unless `ATLAS_BASE_URL` is provided.

## Executable gates

| Command | Evidence / meaning |
| --- | --- |
| `npm run typecheck` | Offline application TypeScript, not optional installed PDF dependencies. |
| `npm test` | Rebuild plus all 106 Node tests. Original 66 tests retained; 40 added. |
| `npm run validate` | Public source schema/relationship validation. |
| `npm run check:release` | Exact reviewed pack hashes and private/raw/font-file exclusion in the offline dist. |
| `npm run audit:local` | Installed lockfile inventory and all 113 vendored file hashes; not full license/vulnerability certification. |
| `npm run test:headers` | Real localhost HTTP headers and deployed header-file contents; not a remote Netlify test. |
| `npm run test:dom` | 14 original strengthened Chromium DOM/layout checks. |
| `npm run test:hardening:ui` | 39 additional Chromium UI checks, including tree menus, hierarchy, tabs, Compare, Focus, anchors and revision remarks. |
| `npm run test:runtime` | 13 sequential normal-origin stages with actual IndexedDB, browser ZIP download, new browser context and restore. |
| `npm run test:online:syntax` | Isolated syntax/emit check for the retained online adapter, no dependency resolution. |
| `npm run enable:online` | Explicit optional dependency installation; updates exact resolved lockfile. |
| `npm run typecheck:online` | Installed React/React-PDF dependency type checking. |
| `npm run build:vite` | Actual optional PDF build and matching local worker/resources. |
| `npm run test:pdf` | 17 actual integrated PDF runtime scenarios, including real canvases/text, cover, passwords, Compare and a fault-injected worker mismatch. |

The normal-origin and integrated PDF scripts exit **2 for BLOCKED**, **1 for FAIL**, and **0 only for PASS**. The CI jobs do not mask exit 2 as a successful gate.

## What the DOM harness does and does not do

`tests/dom_test.py` and `tests/hardening_dom.py` mount the real React application, CSS, content and Mermaid renderer on `about:blank`, with a local static-asset CORS server. They explicitly suppress the database write queue and adapt unavailable address-bar/UUID APIs. Chromium still measures the actual rendered layout and processes real pointer/keyboard interactions.

That is useful evidence for source reconstruction, sheet geometry, keyboard menus and per-view behavior. It is **not** normal production boot, durable browser storage, native downloads or integrated PDF verification. No managed browser policy is removed or bypassed. The separate normal-origin suite uses the unmodified production entry and real IndexedDB.

## Actual backup test contract

`release_runtime.py` imports the two supplied synthetic packs through the UI, creates a personal root page, remarks, a flag, a block bookmark and a PDF in a selected folder, then checks reload. It applies v1.1 and checks personal/local retention and idempotence. It requests a real browser download, opens the saved ZIP, closes the original browser context, opens a new empty context, restores through the UI and checks exact saved data and another reload.

The backup intentionally includes snapshots of built-in packs and their dependencies too. Comparisons normalize attachment metadata to key, media type, SHA-256 and exact byte array; archive-internal `path` fields are not treated as user state. The exact backup payload is the expected fresh-context result. Core tests separately verify ZIP/parser round trips and refusal of absent or corrupt required/orphan attachments. Those core passes do not stand in for the blocked browser flow.

## Supplied fixtures

The v1.0.0 and v1.1.0 audit ZIPs under `tests/fixtures/` are the supplied synthetic stress libraries, not private corpus data. The image-only PDF is the last page extracted from the existing author-created public PDF fixture. Its zero selectable text characters and actual raster image were checked with PyMuPDF and visually inspected; no OCR was used.

## PDF gate precautions

Run the PDF gate only after the optional Vite build. It checks the version marker against the wrapper's actual `pdfjs.version`, records the successful local worker response and waits for real canvases/text. The worker-mismatch negative test intercepts only metadata to exercise recovery; positive rendering cases use the real worker and bytes.

The password fixture uses `atlas-demo`; the test enters a wrong password first and inspects saved records to ensure input passwords are absent. Fixture assertions remain unexecuted here because optional dependencies are unavailable. A successful syntax pass alone is never sufficient.

## Environment results in this package

- Offline build, TypeScript, 106 Node tests, 53 DOM/UI checks and local publication/headers/vendor integrity checks: PASS.
- Normal HTTP-origin Chromium navigation: `net::ERR_BLOCKED_BY_ADMINISTRATOR`; the 13 real persistence/download/restore stages are BLOCKED.
- npm registry requests: `EAI_AGAIN`; optional installation and registry audit are BLOCKED. Online typecheck reports missing React/React-PDF modules; Vite build reports unavailable optional dependencies. The 17 integrated PDF scenarios are BLOCKED.
- Full precompiled Mermaid transitive license/SBOM reconciliation and live Netlify response verification remain unapproved. They are not certified by byte pins or local headers.

The complete supplied release matrix is evaluated in `RELEASE_ACCEPTANCE_MATRIX.md`; its original text is preserved separately. Workflow files are prepared but were not run on GitHub.
