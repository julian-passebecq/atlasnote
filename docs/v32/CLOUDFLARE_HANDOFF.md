# Cloudflare handoff for V3.2

This document separates repository facts from live-account facts.

## What the repository proves

The repo contains:

- `wrangler.jsonc` for Workers Static Assets + SPA fallback;
- `public/_headers` with the reviewed private/no-store and security policy;
- `tools/check-access-build.mjs`;
- provider-neutral Cloudflare contract tests and credential scanning;
- protected-preview qualification tooling.

These checks can validate source/configuration without Cloudflare credentials.

## What requires authenticated Cloudflare access

Before a production deployment, read-only verification should establish:

1. the current `atlasnote` production Worker deployment/version;
2. its exact build identity if available from the served app;
3. production routes/hostname;
4. Cloudflare Access application and policy coverage;
5. anonymous denial on root and static/deep-link resources;
6. authorized app/header observations;
7. the rollback version.

Do not paste Cloudflare API tokens or Access secrets into chat or source files.

## Historical reference only

Repository documentation records a production deploy of source `bcd1e0f`, Worker
version `6f1e75f7`, with rollback to the preceding deployment. That observation is not
fresh enough to authorize a V3.2 deploy.

## Important Wrangler warning

The checked-in `wrangler.jsonc` still names `atlasnote-v23-qa`, not the documented
production Worker `atlasnote`.

Therefore:

- do not run plain `wrangler deploy`;
- do not rename the Worker config speculatively;
- do not create a public preview;
- first inspect the authenticated account and intended target;
- use a protected preview/version qualification before any separately authorized
  production promotion.

V3.2 source work does not modify Access, routes, tokens, production versions or Netlify.
