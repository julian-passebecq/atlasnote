# Provider-neutral deployment access contract

## Ownership

AtlasNote owns local authored content, immutable history, five IndexedDB stores,
backup/recovery and pending-write safety. A hosting provider owns remote application
access. Authentication is not encryption or deletion of browser-local data, and losing
remote access cannot retract code or data already loaded into an authorized browser
profile.

Moving to a new hostname creates a different browser origin. Existing IndexedDB data
does **not** transfer automatically. Before changing hosts, create a verified complete
recovery bundle and preserve required external archive files; restore deliberately on
the new origin and verify it before deleting old-origin data.

Cloudflare Access is the active managed access adapter. No custom Cloudflare session,
password, cookie or login function is implemented inside AtlasNote. The previous Vercel
configuration/procedure is preserved under `docs/history/vercel-provider-20260920/` and
Netlify remains optional legacy support. Neither can satisfy the active Cloudflare gate.

## Observable behavior

An anonymous visitor must not receive application entry HTML, representative static
assets or deep-link content. Authorized access must serve the exact current integrated
build identity. Warming the same URLs with authorization must not leak content through a
shared cache to a later anonymous request. Invalid authorization must fail closed.

The automated Access mechanism uses the documented request headers
`CF-Access-Client-Id` and `CF-Access-Client-Secret`, injected only for the exact approved
preview origin. They are never Vite variables, source constants, query strings,
screenshots, retained traces or browser storage-state files. Redirect following is
disabled on intercepted authorized requests so credentials cannot follow a redirect to
an identity-provider origin. `CLOUDFLARE_API_TOKEN` is used only for read-only Worker
version/deployment metadata checks.

Qualification verifies that clearing provider cookies/removing service-token headers and
restoring access leave all five stores byte-for-byte unchanged in an ephemeral synthetic
profile. No Access cookie/JWT, service-token value or raw store contents are retained.

## App controls and routing

The old Netlify POST logout form remains removed. **Check saved state before leaving**
dispatches the existing reader-save event, awaits the existing store flush, refuses
pending/failed writes and never claims to sign out. Provider sign-in/sign-out happens
outside AtlasNote.

Vite `base` and the HTML `<base>` remain `/`. `wrangler.jsonc` points Workers Static
Assets at `./dist` and explicitly uses `single-page-application` fallback. `public/_headers`
is copied into the hosted distribution and applies the four security headers plus
`private, no-store`, `CDN-Cache-Control: no-store` and
`Cloudflare-CDN-Cache-Control: no-store`. Live qualification still proves actual hosted
headers and post-authorization cache isolation; config text is not accepted as runtime
proof.

## Preview-only release boundary

Cloudflare separates Worker versions from active deployments. The AtlasNote QA candidate
must be an undeployed Worker version reachable through a versioned `*.workers.dev`
preview URL. The live metadata gate reads the exact version and current active deployment
through Cloudflare's API and rejects a candidate version that is actively serving the
Worker's deployed traffic.

Cloudflare requires `wrangler deploy` when a Worker is created for the first time. The
safe preflight therefore creates a **disposable QA Worker with harmless bootstrap content**,
then enables Access for **Previews only**. Only after that does the AtlasNote checkout run
`wrangler versions upload`. This first bootstrap is infrastructure setup, not an AtlasNote
release or production-domain deployment.

## Optional legacy material

Netlify legacy checks remain under their explicitly named scripts. Vercel migration
material is historical under `docs/history/vercel-provider-20260920/`. Neither provider's
private implementation details are part of the active Cloudflare contract.
