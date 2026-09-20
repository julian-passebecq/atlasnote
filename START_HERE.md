# AtlasNote V2.3 - provider-neutral access / Cloudflare candidate

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
