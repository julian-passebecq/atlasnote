# AtlasNote V2.3 - provider-neutral Cloudflare migration candidate

**Source migration implemented; production release still requires fresh protected-preview qualification.**
Start with [START_HERE.md](START_HERE.md). Cloudflare Workers + Static Assets is the
active hosting adapter and Cloudflare Access is the managed access boundary. Netlify
and Vercel are historical/optional and no longer define the mandatory V2.3 release gate.

AtlasNote remains React + Vite. `npm ci && npm run build` produces the integrated `dist/`.
The active host configuration is `wrangler.jsonc`, with SPA fallback handled by Workers
Static Assets and security/cache headers authored in `public/_headers`. No Cloudflare
login/session code is implemented inside AtlasNote.

Read [the Cloudflare qualification procedure](docs/v23/CLOUDFLARE_QUALIFICATION.md) before
creating any remote resource. A host change creates a new browser origin, so existing
IndexedDB data does not move automatically. Create and verify a complete recovery bundle
before migrating real browser-local data.

Do not use `wrangler deploy` with AtlasNote source as a release shortcut. Cloudflare
requires a first deployment to create a brand-new Worker; the documented preflight uses
a harmless disposable bootstrap Worker first, protects its preview URLs with Access, and
only then uploads the exact AtlasNote candidate as an undeployed Worker version for QA.

## Historical V2.2 product notes (not V2.3 certification)

AtlasNote keeps the Notebook, PDF, structured-SVG Cheatsheet, Article and QCM readers
inside five independent workspaces. V2.2 added immutable logical-resource versions,
historical A/B Compare, restore-as-new, reviewed provider-neutral ChangeSets and
full-history backups. Historical reports remain under `docs/history/` and are not current
Cloudflare qualification evidence.
