# PDF Atlas contract for V2.2 and future AI/versioning

## Current production relationship

AtlasNote and `julian-passebecq/pdfatlas` are intentionally separate repositories.

- `pdfatlas` is the public source repository for the reviewed PDF bytes.
- AtlasNote bundles descriptive metadata/tree only; it does not bundle those public PDF binaries into the app build.
- AtlasNote production is pinned to exact PDF Atlas commit `fa5e83f7825cdc837078f87c5e130cb012332195` through `config/pdfatlas.json`.
- Current PDF Atlas `main` is that same commit, so there is no present drift.
- Runtime fetches are restricted to the exact `raw.githubusercontent.com/julian-passebecq/pdfatlas/<main-or-sha>/library/...pdf` path family, use no credentials/referrer, reject redirects, enforce size, verify `%PDF-`, and verify SHA-256 against the reviewed manifest.

This architecture is technically correct and must not be replaced by copying public PDFs into the AtlasNote source/build.

## Important current divergence

AtlasNote currently contains a richer reviewed snapshot in:

`config/pdfatlas.library.json`

than the lighter `library.json` in the PDF Atlas repository.

The AtlasNote snapshot includes fields such as reviewed summary, revision, inspection/source detail and descriptive title metadata that are not all present in the repository manifest.

This is not a current runtime defect because AtlasNote deliberately performs offline generation from its local reviewed snapshot, while the PDF Atlas repository supplies immutable bytes. For long-term AI maintenance, however, two semantically different manifests are undesirable.

## V2.2 requirement: make provenance explicit

Each logical PDF revision must retain all of:

- stable AtlasNote logical document ID;
- source repository (`julian-passebecq/pdfatlas` when applicable);
- source commit SHA;
- relative path;
- PDF SHA-256;
- byte length;
- page count;
- reviewed metadata revision/version;
- rights/attribution state;
- current/historical AtlasNote history revision ID.

Do not overload one identifier with another. In particular:

- Git commit SHA identifies the immutable source-repository snapshot;
- PDF SHA identifies the actual PDF bytes;
- AtlasNote history revision ID identifies the logical resource revision in the app;
- stable document ID identifies the logical document across revisions.

## V2.2 PDF version semantics

When a later PDF Atlas update changes one logical PDF:

1. keep the same stable `doc.pdfatlas.*` logical ID if it is genuinely the same evolving document;
2. update the reviewed source commit pin;
3. record the new byte SHA/page count/metadata;
4. create a new AtlasNote PDF logical-resource revision;
5. preserve the old revision as read-only with the old commit-pinned URL and old SHA;
6. allow current vs historical A/B comparison using the existing PDF reader;
7. never mutate the old revision to point at new bytes.

If a PDF is actually a different document, create a new stable document ID instead of pretending it is a new revision.

## Commit pinning

The current sync validator permits both `main` and a 40-character commit SHA. Preserve `main` only as an explicit staging/development option.

For production/release output, add a release gate that fails if the `pdfatlas.public` source base URL is mutable (`/main/`). Production metadata must use a full commit SHA.

Do not hand-edit every generated document URL. Keep one authoritative pin and regenerate the metadata-only pack.

## Manifest source of truth

Choose one documented workflow and eliminate ambiguous manual drift.

Recommended model:

1. PDF Atlas repository owns the byte library and a canonical machine-readable manifest with stable IDs/basic byte metadata/rights.
2. AtlasNote stores a reviewed **vendored snapshot** of that manifest plus AtlasNote-only inspection/enrichment where required.
3. The vendored snapshot records the exact source commit SHA.
4. An explicit maintainer command updates/reviews the snapshot; runtime never fetches repository metadata to mutate local state automatically.
5. Generated `content/packs/pdfatlas.public` files remain generated artifacts from that reviewed snapshot.

It is acceptable to retain AtlasNote-only enrichment in a separate reviewed file if that avoids publishing unnecessary inspection detail, but the merge key must be stable document ID and the workflow must detect source-manifest drift.

Add a check that compares the PDF Atlas source manifest at the configured source commit against the vendored byte-critical fields (ID/path/hash/bytes/page count/rights/version where authoritative) and fails on unexplained mismatch.

## AI operations for PDF Atlas

The runtime/content agent must not gain arbitrary GitHub publication rights.

AI may:

- inspect PDF metadata/history;
- propose AtlasNote metadata/taxonomy changes;
- propose a new logical PDF revision when a reviewed replacement file/source revision is already available;
- compare old/new metadata, outline/text when available;
- open current/historical commit-pinned PDF revisions.

AI must not automatically:

- push bytes to `pdfatlas`;
- change the production commit pin without review;
- publish private PDF bytes;
- infer redistribution rights;
- replace one logical PDF with unrelated bytes;
- fetch arbitrary URLs into the trusted PDF library.

A future repository-maintenance agent can be added outside the AtlasNote content-agent boundary, with separate GitHub permissions and review.

## Rights/compliance note

The current reviewed manifests mark both public PDFs as `reference-only` and explicitly state that redistribution licences were not established from the supplied documents.

AtlasNote's app-side behavior is conservative because it references commit-pinned external bytes rather than bundling them. However, the separate public `pdfatlas` repository itself hosts those bytes. Treat that as a distinct publication/compliance question. V2.2 must preserve the rights warning and must not silently upgrade the rights state.

If public redistribution is not desired/cleared, the long-term safe alternatives are licensed/author-created replacements or a private/local PDF-library workflow rather than weakening AtlasNote's fetch policy.

## Acceptance checks

- AtlasNote configured commit pin is a full SHA in production.
- Current PDF Atlas source commit/manifest matches reviewed critical metadata.
- Old PDF revision retains old commit URL + hash after a new revision is created.
- Current target resolves newest AtlasNote PDF revision; pinned history target resolves old revision.
- A/B current vs historical PDF opens independently and preserves physical page semantics.
- public external revision does not become a bundled binary merely because it has history.
- private/local historical PDF bytes are included in full backup when needed for restoration.
- public external historical revision can be restored from its immutable source reference if still available; failures are explicit, never silently redirected to current bytes.
