# AtlasNote V2.3 durability/access candidate - BLOCKED

Baseline: `5202f8a2afa388192789349307c9436c3c4403e2`.
Local branch: `final/atlasnote-2.3-durability-access`.
Read `V23_DURABILITY_ACCESS_RELEASE_REPORT.md` and `docs/v23/QA_MATRIX.md` first.

This is the safety-bounded archive/read-only attachment fallback, not a completed release.
Destructive compaction is not in the production database implementation. No bypass
can enable it. Exact candidate commit and checksums are in the external delivery
manifest; a Git bundle/patch preserves the baseline-parent relationship.

Use the source in an actual Git checkout (or restore the included bundle) before
building, so provenance is exact. Integrated path: Node >=22.12, `npm ci`,
`npm run typecheck:online`, `npm run build`. Preserve failures from all gates.
Offline bootstrap/build is compatibility-only; do not publish dist-offline or a static
ZIP without the Netlify Edge Functions. No production deployment/secret was configured.

The five Subjects, five content types, five workspaces, A/B readers, canonical
Article/QCM identity and immutable PDFAtlas/history/Agent contracts are retained.
V22_QA_REPORT.md is historical evidence for the released baseline, NOT V2.3 certification.
