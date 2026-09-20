# Upload the repository source, not the handoff report folders

This Cloudflare migration delivery contains a complete repository source tree plus
reports, evidence and a baseline diff outside it. It is not a patches-only handoff.

Use the existing `julian-passebecq/atlasnote` repository. The verified input tree was
branch `final/atlasnote-2.3-vercel-migration`, commit
`2128a455199abc2a9a71bf8156508c0bbc69af95`, tree
`832c1f199ac6b8d335f31ced3e2f723831c3e89e`.

Recommended owner branch for this candidate:

`migration/atlasnote-2.3-cloudflare`

When using the external handoff ZIP, copy the **contents inside `06_SOURCE/`** into the
repository root while preserving the checkout's `.git` directory. Include dotfiles and
apply deletions: root `vercel.json` and `.vercelignore` are intentionally retired, with
review copies preserved under `docs/history/vercel-provider-20260920/`. The active host
configuration is root `wrangler.jsonc`.

Do not upload handoff report/evidence folders, `.git`, `node_modules`, generated `dist*`,
`.wrangler`, `.dev.vars*`, environment files, browser profiles or private backups.

After the owner commits the source, the build identity changes. Run the Cloudflare
preflight and create a fresh protected Worker **version preview** for that exact owner
commit. Do not attach a production custom domain or promote the AtlasNote version while
any mandatory V2.3 gate is BLOCKED or FAIL.
