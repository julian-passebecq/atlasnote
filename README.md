# AtlasNote 1.2.6

Local-first notebook, PDF, interview-reference and native cheatsheet reading. This implementation continues released 1.2.5, commit `d1ecfd70c2f9d72c374a1c1c897d10a05d718dc5`. Read [START_HERE.md](START_HERE.md) and [FINAL_TEST_STATUS.md](FINAL_TEST_STATUS.md) before integrating. It has not been merged or deployed, and integrated release acceptance is not certified here.

Five independent workspaces preserve tabs, reading positions, Compare, Focus, notebook Book, PDF Spread and four-page Grid. Each pane controls its own toolbar. Bookmarks, Read Later and Workspace States remain separate existing systems. Document Context provides outline/search, private remarks, explicit Related links and bounded local visit history.

## Native cheatsheets

**Study references / Cheatsheets** contains SQL for Analytics, PySpark Execution Model, Azure Data Factory and pandas Essentials: four canonical JSON documents, eight physical pages. Their 1200 x 1600 pages render as scoped, safe SVG with live text, code, tables and structured graph/sequence diagrams. No reference PNG is used to render a page. Geometry is fixed; the viewport scales it uniformly. Single, two-page and four-page modes are independent of Compare and independent per pane.

Private JSON import/edit/export uses the existing local overlay and backup mechanisms. Context navigation and physical-page reading actions retain stable page/anchor IDs. Related backlinks connect the unchanged interview references and cheatsheets. No runner, scoring, analytics service, new grammar family or new PDF engine is included.

See [architecture](docs/1.2.6/ARCHITECTURE.md), [authoring](docs/1.2.6/AUTHORING.md), and [fixture provenance](docs/1.2.6/FIXTURE_PROVENANCE.md). The supplied handoff lacked original JSON and ADF page 1's preview. These are disclosed reconstructions, not independent verification of every educational claim in the references.

## Build and test

Node >=22.12.0; use the exact lockfile. Python is used by the existing tests and optional PDF authoring tools.

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

Preview the integrated build with `npm run build && npm run preview`. Never deploy `dist-offline` or the opt-in `.build/engine-dom` component harness. The release runner preserves all 34 previous gates and adds three native gates, writes each result/log under `docs/evidence/1.2.6/release-gates`, and exits nonzero if any gate fails or is blocked.

Regenerate the native content pack with `node tools/generate-cheatsheets.mjs`; check committed fixture/schema/render/hash consistency with `npm run test:cheatsheets`. All diagrams are authored data; no runtime force layout or remote font download is used.

## Privacy and compatibility

No IndexedDB version/name or backup envelope changed. Native fields are additive; old pages, bookmarks, imports and reading state retain their old interpretation. New native state requires 1.2.6-aware readers: backwards compatibility means old data opens safely in 1.2.6, not that 1.2.5 understands the new type.

Remarks, related links and private sources stay in the local workspace and its explicit backups. This delivery contains no private 137-page library, credentials, user workspace or font files. The inherited precompiled Mermaid bundle still has its previously documented transitive SBOM/license-closure limitation; this pass neither replaces it nor claims a new complete dependency audit.
