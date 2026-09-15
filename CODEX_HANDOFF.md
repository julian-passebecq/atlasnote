# Integration and release verification - AtlasNote 1.2.5

Do not implement this pass again. The source already contains the reader/Context/PDF navigation/interview changes. Review and verify it, fixing only actual regressions. Do not merge or deploy.

Repository: julian-passebecq/atlasnote.
Starting released main: b5e63f71185bcf525e985dfad1260d38ed3c4918.
Branch: feature/atlasnote-1.2.5-reader-interview-polish.
The uploaded source was verified against that exact Git tree. The delivery's local Git ancestry is synthetic because the source ZIP did not include history; do not push that synthetic history over the real repository.

## Apply without losing local work

In a clean checkout, fetch and inspect main. Preserve dirty work using a separate worktree or explicit safety copy. Start the named feature branch from the starting commit above. If main moved, stop and reconcile the newer changes explicitly; do not reset or overwrite them.

Extract the complete source outside the checkout, then copy its contents into the branch root, preserving .git, credentials and private/user files. Alternatively, check and apply the supplied tree patch with `git apply --check` and `git apply`. The patch and the complete source describe the same implementation; do not apply both. Never force-push the local delivery history.

Review `git diff`, then run:

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

Use npm run, not direct node tools/run-release.mjs: the runner reuses npm's JavaScript entry point for Windows compatibility. The runner and CI retain all 31 previous release gates and add interview-content consistency, reader-polish UI and real PDF-wheel tests (34 total).

## Most important external gates

Install the exact lockfile, audit current dependencies, run `typecheck:online`, build the integrated app and component harness, and run the real-engine PDF tests. `test:pdf:wheel` must demonstrate slow 30-pixel wheel ticks, rendered physical-page progression, one-turn momentum behavior, reverse scrolling and independent Compare panes. Neither page-number input changes nor a fake PDF renderer can replace that evidence.

Run all real-origin tests with actual IndexedDB and fresh-context backup restore. The implementation environment explicitly hit `ERR_BLOCKED_BY_ADMINISTRATOR`; no policy bypass was attempted. The optional history list records genuine document visits; validate the complete persisted state and any intentional last-open timestamps rather than blindly deleting fields from comparisons. Preserve current source/overlay/remark/reading-list and saved-session equality assertions.

Inspect Context on an actual notebook and PDF, add/remove a related link, write a reflection, reload, export a real backup and restore it into a fresh profile. Confirm source references are unchanged and personal edits persist. Test both panes with opposite toolbar visibility and all five workspaces.

## Contracts

No cheatsheets, new content types, code execution, game/scoring or analytics. Do not replace the PDF engine. No metadata-flattening migration: only the PDF navigation projection is flatter. Different headings can point to the same physical page. Bookmarks, Read Later and Workspace States remain distinct. Reading-state restore is not content rollback. The existing database name/version and backup envelope remain unchanged. Do not publish private PDF libraries, credentials, build caches or synthetic backup fixtures.

## Finish

After all gates pass, commit the integrated source on the named feature branch and report the real repository starting/final SHAs and evidence. Push only when authorized. Do not merge main, deploy or create another Netlify site in this pass. The final local delivery SHA in the external report is provenance, not a remotely published commit.
