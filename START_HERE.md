# Web continuation — read this first

The owner has returned AtlasNote to a **Web-first** direction and abandoned Electron/DocPass
as the future of Atlas. For the current large improvement pass, start with:

**[docs/web-next/HANDOFF_20261002.md](docs/web-next/HANDOFF_20261002.md)**

Work on `feat/atlasnote-web-continuation`. No production deployment is authorized.

---

# AtlasNote 3.1.0-rc.1

This branch is the owner-requested V3.1 stabilization candidate. Start with
[docs/v31/START_HERE.md](docs/v31/START_HERE.md) and the
[verification report](docs/v31/VERIFICATION_20260926.md).

## Run the candidate locally

Use a real Git checkout; the build records and checks its exact source revision.
Node.js >=22.12 and Git are required. Keep the committed dependency lockfile.

```powershell
git clone --branch fix/atlasnote-v31-stabilization --single-branch https://github.com/julian-passebecq/atlasnote.git atlasnote-v31
Set-Location atlasnote-v31
npm ci
npm run dev
```

Open http://127.0.0.1:4173. Do not open index.html as a file. The normal build
produces the integrated React-PDF app in `dist/`; `dist-offline/` is a separate
compatibility/test build and must not be substituted for it.

Before testing with an existing profile, export a full backup from the current
app. Cloudflare, Netlify and localhost have independent browser-local data.
The source ZIP is not a backup of that data.

## What changed

- The sidebar Norsk Daily action is now a small Norwegian vector flag, retaining
  its keyboard access, accessible name and tooltip.
- PDF navigation resolves page geometry before painting. Late render completions
  do not restore the scroll position. Discrete wheel intentions remain bounded,
  and Continuous mode handles mixed page sizes without a moving global estimate.
- Cancelled PDF cache loads, recovery after failed boot, staged-load consistency,
  same-workspace cross-tab position conflicts and Experience persistence are repaired.
- Version labels and downloaded navigation traces use the generated build identity.
- A provider-free V3.1 CI workflow runs unit, TypeScript and browser regressions.

## Version and data contracts

Product version: **3.1.0-rc.1**, from package.json. Database: `knowledge-atlas`
**version 3**, still the same five stores. This is not a new database migration.
History, PDF Atlas provenance, accepted-review boundaries and the thirteen atomic
compaction rollback guarantees remain in place.

## Hosting and release boundary

No production deployment is part of this implementation. Cloudflare remains the
primary host; its current served build must be checked by an authenticated owner.
The preceding deployment handoff records `bcd1e0f` / Worker version `6f1e75f7`.
That historical observation is not a new live verification. Netlify builds remain
paused by the owner's decision; this work does not change them.

Do not deploy with the repository's `wrangler.jsonc` blindly: it still names the
former QA Worker. Follow [the Cloudflare handoff](docs/v31/CLOUDFLARE_FOLLOWUP.md).
REL-02 remains separate and unqualified here. No token, Access policy or provider
permission was changed. Synthetic Chromium tests do not certify a physical mouse,
trackpad or the authenticated production origin.

Owner content review for `atlas.v3-seed` remains pending. Split content loading,
on-demand hydration of all private assets and a real-source Norsk news feed are
not claimed by this candidate.

## Earlier architecture and evidence

The previous entrypoint is retained at
[docs/history/v30-entrypoints/START_HERE.md](docs/history/v30-entrypoints/START_HERE.md).
Its relative links and release statuses describe the historical checkout, not this
candidate. Read `V22_ARCHITECTURE.md`, `V22_MIGRATION_AND_BACKUP.md`,
`V22_AI_CHANGESET_SPEC.md`, `docs/v22/PDFATLAS_CONTRACT.md` and the V3 architecture
records before changing those contracts. Earlier PASS results are not fresh
qualification of a new source revision.
