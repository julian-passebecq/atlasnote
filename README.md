# AtlasNote 1.2.7

A local-first knowledge reader with notebooks, PDFs, structured SVG cheatsheets, native Articles and QCM reference/practice sets. The existing five reading workspaces, Compare, Book/Spread/Grid, bookmarks, Read Later, saved workspace states and portable backups remain in place.

**Implementation source, not a production-release claim.** Read [START_HERE.md](START_HERE.md), [FINAL_TEST_STATUS.md](FINAL_TEST_STATUS.md) and [REQUIREMENTS_COVERAGE.md](REQUIREMENTS_COVERAGE.md).

## Local development

Node 22.12 or newer is required. Use the committed dependency lockfile; this pass introduces no dependency.

```sh
npm ci
npm run typecheck
npm run typecheck:online
npm run build
npm run preview
```

`npm run preview` serves the integrated `dist` directory on the address printed by the server. A separately named compatibility build is available via `npm run bootstrap:offline && npm run build:offline`; it is not an integrated PDF release.

## Testing

```sh
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

The release runner executes all 39 gates, including the new content-hub UI and normal-origin suites. It records a log and exit code for every command. Failure or BLOCKED means the release is not cleared. GitHub CI retains all prior gates and adds both new suites.

## New in this pass

- Independent content types and shared subject/folder taxonomy; explicit Notebook references rather than source copies.
- Specialized library management, safe native Article/transcript import/edit/export, and local single/multiple-answer QCM with explanations, reflections and attempt history.
- Global and scoped Dashboard, fast five-row Link/Task/Note capture and optional exact reading context.
- Typed links shared by Notebook, Related, Dashboard, QCM, bookmarks and reading actions.
- Summary, Architecture, Bilingual concept and Vocabulary authoring presets on the existing SVG grammar.

Use `examples/content-hub/article-sample.json` and `qcm-sample.json` through their visible import dialogs. These are the supplied synthetic test fixtures, not remotely fetched articles or a generated course. Existing eight cheatsheet pages and fifteen interview sources are unchanged.

Private imports and learning records stay in this browser. Export a full backup before changing versions or moving to another origin. A saved **reading state** restores session/layout, not newer shared content or attempts. A **full backup restore** is explicitly destructive and restores the whole selected payload after confirmation.

Source license and notices remain in `LICENSE`, `THIRD_PARTY_NOTICES.md` and `docs/licenses/`.
