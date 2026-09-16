# AtlasNote 1.2.7 workspace ready for manual integration

## Identity

- Repository: `julian-passebecq/atlasnote`
- Starting SHA: `f9345c11d98f13d33032666d5148a55a27805742`
- Starting tree: `201e3b9c5034b5e275850337aa7dfb437aa599bb`
- Local branch: `feature/atlasnote-1.2.7-content-dashboard-qcm`
- Complete editable source directory in this chat: `/mnt/data/atlasnote-1.2.7`
- Source artifact: `AtlasNote_1.2.7_Content_Dashboard_QCM_Source.zip`
- Final local SHA, final tree and SHA-256 checksums: external `AtlasNote_1.2.7_Manifest.json` (also use `git rev-parse HEAD` in the live source tree).

**This is the completed implementation, not a handoff-only package. It is not release-cleared.** No remote writes occurred. The requested branch exists locally only. No production distribution is represented as verified.

## Manual upload

Start from the corrected 1.2.6 commit above, not an old 1.2.7 branch and not an assumed current main. Save/commit unrelated local work and export your current application's full backup first. Create/select the requested feature branch in your own clone. Extract the source ZIP and copy the **contents of its single root directory** into the repository root. Preserve the clone's `.git` directory; do not add an extra nested project directory. Review the diff against the baseline before committing/pushing it yourself.

The ZIP contains all tracked application sources, public assets, existing vendor assets, lockfile, tests and current documentation. It excludes `.git`, installed dependencies, generated distributions, private browser data, screenshots and test-run scratch files. Evidence is delivered separately. No font files or new private reference library are included.

## Integration checks

Read `START_HERE.md`, `REQUIREMENTS_COVERAGE.md`, `FINAL_TEST_STATUS.md` and `docs/1.2.7/TEST_CHANGES.md`. Prepare Python test/PDF requirements and Playwright Chromium as in `.github/workflows/ci.yml`, then run the existing default release suite on a normal supported developer/CI environment. Do not reuse compatibility output as `dist`, weaken missing-origin tests, or reconstruct this implementation from an older prompt.

Local final results: 597 unit; 193 component/browser; 12 synthetic PDF authoring checks passed. All 39 full release commands were attempted separately: 3 PASS, 28 FAIL, 8 BLOCKED. True-origin 1.2.7 runtime: 0/12, BLOCKED by browser policy. Dependency/license review and integrated release checks remain outstanding.

## Test the new UX

Content types are top-left; subjects are independent below them. Dashboard, Quick Capture and five workspace controls are bottom-right. Samples are in `examples/content-hub`; import the Article and QCM JSON through their real editors. `docs/1.2.7/USER_GUIDE.md` gives the UI sequence for exact typed links, references, all four presets and capture.

## State boundary

This implementation extends the existing local stores; it does not introduce a new database or destructive migration. Workspace reading-state restoration must never rewind newer shared content/captures/QCM attempts. Full backup restoration remains a separate confirmed replace operation. Do not test a different origin assuming it shares the production origin's IndexedDB.

Pushed: NO
Merged: NO
Deployed: NO
