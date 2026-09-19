# AtlasNote V2.3 final-finish candidate - BLOCKED

Use `final/atlasnote-2.3-pro-finish` in `julian-passebecq/atlasnote`.
It starts exactly from consolidated commit
`84b8ba2addbfe3cb2527dc4a57039416ceabbb52`, not main or an older upload branch.
The exact delivered head SHA/tree are recorded in the external `CANDIDATE.json`.

Read `V23_DURABILITY_ACCESS_RELEASE_REPORT.md`,
`docs/v23/FINAL_FINISH_REPORT.md`, `docs/v23/QA_MATRIX.md` and
`docs/v23/FINALIZATION.md` before continuing.

The native atomic compactor and consolidated recovery implementation are PRESENT and
unchanged. Positive commit/reload, all 13 required fault cases, all four committed
capacity recoveries, archived comparison/restore and historical private-PDF recovery
have real normal-origin browser evidence. Do not redesign or replace the writer.

Release remains BLOCKED until configured HTTPS/provider/session/cleanup qualification
and every required gate pass on the same exact SHA. No exit 2 is success. Three Edge
Functions or a built preview are not release approval. No production key/deploy is
part of this pass. Do not merge main or tag.

The source ZIP is the full candidate tree for inspection. Prefer fetching the exact
GitHub branch/commit for implementation so ancestry and build provenance are retained.
A manual re-upload changes the commit SHA and requires a new build/qualification.
Node >=22.12: `npm ci`, `npm run typecheck:online`, `npm run build`.
The offline build is compatibility-only. Never publish a static ZIP without the Netlify
Edge Functions. The final package distinguishes full CI artifacts from any downloadable
reference-build exclusions; use the source build to reproduce complete runtime assets.

The five Subjects/content types/workspaces, A/B readers, canonical Article/QCM identity,
immutable history, reviewed Agent and PDFAtlas contracts remain intact.
