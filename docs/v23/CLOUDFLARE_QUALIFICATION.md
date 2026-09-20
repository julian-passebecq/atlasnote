# Qualify a protected disposable Cloudflare Worker version preview

No AtlasNote production deployment, custom domain or production alias is authorized by
this migration. AtlasNote remains React + Vite and builds to `dist/`.

## 0. Codex / Cloudflare preflight

In Codex Desktop install the official **Cloudflare** plugin from **Plugins** (or `/plugins`
in the Codex CLI/TUI). The plugin supplies Cloudflare skills and registers Cloudflare MCP
servers. Cloudflare's current guidance uses MCP/API tools for account/platform operations
and Wrangler for local development, uploads and deployments. First use opens an OAuth
flow; do not paste account/API/service-token secrets into chat.

Run the included `CODEX_CLOUDFLARE_PREFLIGHT_MINI_PROMPT.txt` before the AtlasNote
migration/qualification prompt. It is intentionally bounded to a disposable QA Worker.

## 1. Important first-upload rule

`wrangler versions upload` cannot create a Worker for the first time. Cloudflare requires
C3 or `wrangler deploy` for the initial Worker creation. Therefore:

1. Create a disposable Worker named `atlasnote-v23-qa` from a temporary harmless
   placeholder directory, **not from AtlasNote source**.
2. The bootstrap may use the default workers.dev deployment only; attach no custom domain
   and treat it as disposable QA infrastructure, not AtlasNote production.
3. Enable preview URLs.
4. Enable Cloudflare Access for **Previews only** on this Worker before uploading AtlasNote.
5. Configure a human allow policy appropriate to the owner account and a dedicated
   **Service Auth** policy using a new service token for automated qualification.
6. Keep all one-time credentials in secure environment/CI secret storage; never source.

Do not turn off Access to make tests pass.

## 2. Build the exact AtlasNote candidate

From a clean Git checkout:

```sh
npm ci
npm run typecheck:online
npm run build
npm run test:v23:provider:unit
```

`dist/build-identity.json` must identify this exact clean source. Do not reuse a build from
another commit or compatibility output.

## 3. Upload a preview-only Worker version

Authenticate Wrangler through the reviewed Cloudflare account, confirm the account and
Worker name, then upload **without deploying the version**:

```sh
npx wrangler@4 versions upload --preview-alias atlasnote-v23
```

Use the immutable **versioned preview URL** returned for that version as
`ATLAS_V23_PREVIEW_URL`; the human-readable alias is convenient for browsing but is not
the acceptance identity. Record the exact Worker version UUID as `ATLAS_CF_VERSION_ID`.
Do not run `wrangler versions deploy` and do not run `wrangler deploy` from the AtlasNote
checkout during qualification.

## 4. Environment-only qualification inputs

Provide through secure local/CI environment management only:

- `ATLAS_V23_PROVIDER=cloudflare`
- `ATLAS_V23_PREVIEW_URL`: exact immutable HTTPS version preview under `*.workers.dev`
- `ATLAS_CF_WORKER_NAME=atlasnote-v23-qa`
- `ATLAS_CF_VERSION_ID`: exact fresh Worker version UUID
- `CLOUDFLARE_ACCOUNT_ID`: account identifier
- `CLOUDFLARE_API_TOKEN`: read-capable Worker metadata token; never client code
- `CF_ACCESS_CLIENT_ID`: dedicated Access service-token Client ID
- `CF_ACCESS_CLIENT_SECRET`: dedicated Access service-token Client Secret
- `ATLAS_V23_NATIVE_QUOTA=1` and, on a disposable Linux runner where needed,
  `ATLAS_V23_QUOTA_SUDO=1`

The source scanner and live exact-value scanner must remain clean. No credential value is
retained in results, logs, screenshots, HAR or browser storage state.

## 5. Run the release contract

```sh
npm run test:v23:release
npm run test:inherited:after-v23
```

The inherited command refuses to start unless every required V2.3 gate passed freshly
for the exact same clean source. `npm run test:v23:core:portable` is useful diagnostics
but is explicitly not a full release.

The live provider gate verifies the version exists, has a preview, is fresh, belongs to
the intended Worker and is **not** in the current active deployment. It then proves the
13 provider cases and five-store browser auth transition.

## 6. Cleanup

After qualification, revoke/delete the dedicated Access service token and delete the
disposable QA Worker if it is no longer needed. Record resource IDs and successful
cleanup without retaining secret values. Do not touch unrelated Workers, zones, DNS or
production applications.

## Official Cloudflare references reviewed for this migration

- Codex integration: https://developers.cloudflare.com/agent-setup/codex/
- React + Vite on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- SPA Static Assets routing: https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- Static asset headers: https://developers.cloudflare.com/workers/static-assets/headers/
- Worker preview URLs: https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/
- Versions/deployments: https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/
- Worker Access protection: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Access service tokens: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- Worker Versions API: https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/
