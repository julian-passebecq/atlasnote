# Provider-neutral deployment access contract

## Ownership

AtlasNote owns local authored content, immutable history, five IndexedDB stores,
backup/recovery and pending-write safety. A hosting provider owns remote application
access. Authentication is not encryption or deletion of browser-local data, and losing
remote access cannot retract code or data already loaded into an unlocked profile.
Moving to a new hostname creates a different browser origin: existing IndexedDB data
does **not** transfer automatically. Before changing hosts, create a verified complete
recovery bundle and preserve required external archive files; restore deliberately on
the new origin. Do not erase the old origin until the restored data has been verified.

Vercel Authentication / Deployment Protection is the active managed adapter. No custom
session/cookie/password function was added. No IP/MAC identity mechanism was added.
`netlify/`, `netlify.toml` and `public/_headers` remain byte-preserved optional legacy
support. They neither configure Vercel nor define the active release gate.

## Observable behavior

An anonymous visitor must not receive application entry HTML, representative static
assets or deep-link content. Authorized access must serve the exact current integrated
build identity. Warming the same URLs with authorization must not leak content through
a shared cache to an anonymous request. Invalid authorization must be denied. No test
invents undocumented Vercel handler/cookie internals. Missing protection is a failure,
not a reason to weaken the app contract.

The bypass mechanism is an environment-only, exact-origin request header. It is never
part of a Vite variable, source constant, query string, screenshot, retained network
trace or storage-state file. Browser probe requests disable redirect following before
fulfilling the intercepted response, so the injected header cannot follow a redirect
to another origin. Provider API credentials are used only by the metadata probe.

Tests verify that clearing provider cookies/removing authorization and restoring access
leave all five stores byte-for-byte unchanged in an ephemeral synthetic-data profile.
No provider token/cookie value or raw store contents are retained as evidence.

## App controls and routing

The former Netlify POST logout form is replaced by **Check saved state before leaving**.
It dispatches the existing reader-save event, awaits the existing store flush, refuses
pending/failed writes and never claims to sign out. Native beforeunload protection,
failed-write emergency export, retry and reload behavior remain required. Provider
sign-in/sign-out happens outside AtlasNote; there is no client cookie manipulation.

Vite `base` and the HTML `<base>` are `/`. This deployment is root-hosted. The HTML base
keeps existing content, schema, PDF worker/font and vendor URLs valid on history/workspace
deep links without changing those subsystems. A provider SPA fallback resolves routes
to `index.html` while serving existing files normally. Local `npm run preview` is a
static diagnostic server, not an emulation of Vercel access protection or SPA routing.

Four security headers and private/no-store response and CDN policies are configured in
`vercel.json`. `public/_headers` alone never establishes Vercel headers or authentication.
Managed protection must be enabled on the actual preview; a config file cannot prove it.

## Optional legacy checks

`npm run check:access:netlify` and `npm run test:access:netlify` retain the old handler,
verifier, cookie, CSRF and declaration assertions separately. The optional historical
probe requires `ATLAS_V23_NETLIFY_PREVIEW_URL` explicitly and cannot satisfy the active
Vercel gate. The old 20-case vendor-internal matrix is not silently counted as current
provider-neutral evidence.
