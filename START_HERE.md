# AtlasNote V3 - release candidate

Start with [docs/v3/V3_RELEASE_CANDIDATE.md](docs/v3/V3_RELEASE_CANDIDATE.md): what V3 adds, a ten-minute manual check and the owner's release checklist. The engineering record, the measurements and the acceptance-case register are in [docs/v3/V3_IMPLEMENTATION_STATUS.md](docs/v3/V3_IMPLEMENTATION_STATUS.md). The architecture decision is [docs/v3/CONSOLIDATED_ARCHITECTURE_DECISION.md](docs/v3/CONSOLIDATED_ARCHITECTURE_DECISION.md).

V3 extends the V2.3 candidate described below:
- The durability and provider/access contracts are unchanged.
- The database stays at `knowledge-atlas` v3 with the same five stores.
- The app version string is still 2.3.0 until the owner's release decision.
- Nothing has been merged into `main` or deployed.

---

# AtlasNote V2.3 - provider-neutral access / Cloudflare candidate

## Current finishing repair

The published Cloudflare candidate `f9b426938e6c531754374dfb73bf71f6a4c40172`
passed V2.3 and hosted-provider qualification, but inherited command 52 changed
tracked example files. This source isolates runtime-generated examples in a
temporary directory and supplies the missing compatibility fixture build in
V2.3 CI. See [INHERITED_FIXTURE_ISOLATION.md](docs/v23/INHERITED_FIXTURE_ISOLATION.md).
No application source, storage contract, provider gate or source-drift rule changed.
Those prior green results are not certification of this new candidate.


This full source tree is the Cloudflare migration candidate, not an approved production
release. It starts from the verified GitHub source tree on branch
`final/atlasnote-2.3-vercel-migration`, commit
`2128a455199abc2a9a71bf8156508c0bbc69af95`, tree
`832c1f199ac6b8d335f31ced3e2f723831c3e89e`. The inherited V2.3 release-contract baseline
remains `2ece94b4e07e3179e8aee5dad4b32970c5be2242`, tree
`1a57e4db16efaf1ee4ac25f52da0462e388c93e9`. App version remains 2.3.0 and IndexedDB
version remains 3.

Read `docs/v23/PROVIDER_NEUTRAL_ACCESS.md`, `docs/v23/CLOUDFLARE_QUALIFICATION.md`,
`docs/v23/NATIVE_CAPACITY.md` and `docs/v23/QA_MATRIX.md`. Historical reports are not
fresh release evidence.

The atomic compactor is present and preserved. All 13 fault cases, archive/recovery
semantics, five-store persistence, immutable history, Compare, PDFAtlas and the Agent
Interface retain their existing contracts.

## Build and verify

Work in a real Git checkout. Keep Node >=22.12 and the supplied dependency lockfile.
`npm ci && npm run build` is the integrated hosted build, producing `dist/`. Never
publish `dist-offline`. Portable/compatibility results do not prove the integrated PDF
renderer, native quota behavior or managed hosted access.

Cloudflare is the active provider adapter. `wrangler.jsonc` configures only Workers
Static Assets, SPA fallback and preview URL capability. It does **not** enable Cloudflare
Access. Managed Access must be configured on the disposable QA Worker and independently
proved with anonymous and service-token requests.

Do not deploy AtlasNote to a production/custom domain. For a brand-new Cloudflare Worker,
complete the harmless bootstrap described in `CLOUDFLARE_QUALIFICATION.md`, protect
**Previews only** with Access, then upload the exact AtlasNote candidate with
`wrangler versions upload` and qualify its immutable version preview URL. The candidate
version must not appear in the active Worker deployment.

Only a completely green `npm run test:v23:release` permits
`npm run test:inherited:after-v23` on the exact same clean source. Missing capability,
stale evidence and unexecuted gates remain BLOCKED.
