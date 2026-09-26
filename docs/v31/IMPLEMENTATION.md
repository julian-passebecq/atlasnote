# AtlasNote 3.1.0-rc.1 implementation

Base application: `8a676cb09189552625296282c052ab021a737a6b`.
This is a stabilization candidate, not a production promotion. Database version,
five stores, immutable history and compaction rollback contracts are unchanged.

## Changes

- Small Norwegian SVG flag replaces only the sidebar action text. Accessible
  name and the actual Norsk Daily screen remain unchanged.
- Product identity comes from package.json through build-identity.json. Browser
  title, More/Settings and navigation trace use that same identity. The inherited
  exact-build gate checks the current package version rather than hardcoded 2.3.0.
- PDF page dimensions are resolved before mounting the canvas. Wrappers have a
  fixed height; render completions never restore the scroll position. Each
  restoration owns a document/page/geometry token and is cancelled by newer
  input, errors or a bounded timeout. Initial residual wheel consumption is
  limited to 350 ms of geometry preparation, not rasterization.
- Fast momentum retains the one-turn burst guard. Repeated substantial opposite
  input can reverse after the cooldown. Three stable, separated detents (80-220
  ms, at least 60 normalized pixels, similar magnitude) can start a new edge
  intention. This is a gesture heuristic, not hardware identification. Physical
  mouse/trackpad validation remains required.
- Continuous mode keeps a stable estimate for each unknown page, rather than
  moving the whole unmeasured prefix with an average. Newly resolved geometry
  compensates the visible anchor without undoing intervening native scrolling.
- Navigation trace v2 records requested versus applied displacement, viewport
  dimensions and an allowlisted build identity. No PDF text, titles, URLs or
  authentication data are exported. Document IDs remain pseudonymized.
- Abandoned cache loads cannot allocate orphan Blob URLs after an asynchronous
  digest completes. Shared in-use URLs remain leased.
- A confirmed backup replacement compares raw records, so an unreadable old
  schema does not prevent restoration. The replacement is still atomic and
  rejects concurrent changes. Successful recovery rearms readiness immediately.
- Staged hydration detects an intervening history epoch and reloads a consistent
  projection. A checkpoint conflict preserves this tab's visible session while
  retaining the durable merge decision and unrelated peer changes.
- Experience success is shown only after persistence succeeds. The editor stays
  open on failure. Norsk Daily uses the active Experience projection too.

## Verification and limits

The provider-independent workflow runs unit tests, both TypeScript checks, the
integrated build, V3 browser suites and new V3.1 PDF/storage scenarios. Results
must be associated with the exact tested commit, not this prose.

The development environment's Chromium refuses localhost with
`ERR_BLOCKED_BY_ADMINISTRATOR`; its policies were not changed. Normal-origin
browser evidence therefore comes from GitHub's isolated Chromium runner.

A successful synthetic run is not physical device or Cloudflare Access proof.
REL-02, the dedicated preview token/policy and the old QA Wrangler target are
not changed here. No production deployment or Netlify activation is included.
Owner content review for atlas.v3-seed remains pending. This candidate does not
add split-catalogue loading, a new database or automatic content publication.
