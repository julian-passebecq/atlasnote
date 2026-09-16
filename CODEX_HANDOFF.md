# Integrating the completed AtlasNote 1.2.7 source

## Exact starting point

Repository: `julian-passebecq/atlasnote`.
Baseline: `f9345c11d98f13d33032666d5148a55a27805742`, corrected 1.2.6 feature head, not old main.
Working branch: `feature/atlasnote-1.2.7-content-dashboard-qcm`.
No push, PR, merge or deployment was performed for this delivery.

The full source ZIP is the application, not a patch and not a handoff-only package. Preserve the local `.git` directory. Start from the exact baseline, extract the ZIP to a temporary folder, then copy its source contents into the repository root. Do not place the ZIP's enclosing folder inside the repository as another application. Do not restore a stale dist/node_modules from another pass.

```sh
git fetch origin
git switch -c feature/atlasnote-1.2.7-content-dashboard-qcm f9345c11d98f13d33032666d5148a55a27805742
# Copy the delivered source contents into this checkout, preserving .git.
git diff --check
git status --short
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install --with-deps chromium
npm run test:release
```

An existing branch needs inspection before checkout; never use a force reset to bypass local changes. Check FINAL_TEST_STATUS.md before making any release claim. The runner executes all 39 old/new gates and keeps failure logs. The default per-gate timeout is ten minutes; the shorter recorded offline diagnostic is not release approval. Normal-origin and integrated PDF tests are mandatory.

After successful integration, verify all 30 new browser checks plus the original suites, durable reload of Articles/QCM/captures, a full backup's exact downloaded payload, fresh browser-context restoration, independent QCM/PDF Compare and saved-state isolation. Check desktop and 390px screenshots. Do not change the dependency lockfile merely because an installation is unavailable.

Current app data remains private per browser origin. Do not delete or migrate by resetting IndexedDB. The eight cheatsheet sources, fifteen interview pages, PDF engine and corrected 1.2.6 runtime test are unchanged. No requirement to build a new service, render cheatsheets as screenshots, duplicate Bookmark/Read Later stores, or create workspace 6.

Only after user-authorized manual upload and a passing integrated suite should a separate preview/release decision be made. This document is not authorization to merge or deploy.
