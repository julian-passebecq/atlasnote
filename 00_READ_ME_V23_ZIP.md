# Upload the repository, not the report folders

The delivery ZIP contains a complete repository in `SOURCE/`, plus reports, evidence
and the baseline diff outside it. It is not a patches-only handoff.

Use the existing `julian-passebecq/atlasnote` repository. Do not create a replacement
repository and do not substitute code from `main` or any historical branch.

1. Extract the final ZIP into a new directory and retain it as the audited copy.
2. In your own local checkout of the existing repository, select an owner-managed
   non-production branch, such as `migration/vercel-provider-neutral-v23`. Preserve
   the checkout's `.git` directory. Back up uncommitted work before replacing files.
3. Replace the repository's tracked working files with **the contents inside
   `SOURCE/`**, including `.github/`, `.gitattributes`, `.gitignore` and
   `.vercelignore`. Do not create an extra `SOURCE/` level in the repository.
   The supplied source is complete; remove files shown as deleted in the diff.
   In particular, the Netlify tests moved from `tests/access-v23.test.mjs` into
   `tests/legacy/` and must not remain duplicated at their old location.
4. Do not upload `00_RESULT/`, `PATCH/`, `EVIDENCE/`, `.git`, `node_modules`, built
   `dist` folders, `.vercel`, environment files, browser profiles or private backups.
   Review Git status and the supplied change inventory, then commit/push yourself.
   Folder upload in GitHub's web UI may omit dotfiles or fail to apply deletions;
   a local checkout with GitHub Desktop is less error-prone for this complete tree.
5. Install/build from the resulting clean checkout. The new owner commit changes
   build identity, so create and qualify a new protected disposable Vercel preview.
   Do not promote it to production while any mandatory gate is BLOCKED or FAIL.

The ZIP intentionally excludes `.git`. Exact original ancestry could not be
reconstructed from the incremental bundle; the local snapshot ancestry is documented
honestly in the external result. No replacement Git bundle is claimed to be original.
