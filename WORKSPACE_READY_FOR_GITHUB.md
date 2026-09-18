> Historical baseline document. This coding-pass source is NOT release-certified. Read `START_HERE.md` and `CODEX_LIGHT_QA_HANDOFF.md` for the current status.

# Workspace ready for manual GitHub integration

## Identity and baseline

| Identity | Value |
| --- | --- |
| Repository | julian-passebecq/atlasnote |
| Allowed branch | `v2manualupload` |
| Pull request | #13 - do not merge in this pass |
| Required audited starting SHA | `fc41a5a5ac843f228175194b6a679867843530d8` |
| Audited source tree | `4f08e832311c211cb4bf8140cd2a7d73bc8e7808` |
| Inspected remote head during retry | `f366f015bb6ace49d3c367b3d76ff278779a53ba` |
| Inspected remote source tree | `48087f68fc9841b606656c296b4e9dfbbe028cf6` |
| Version | 2.0.0 |
| Final local commit/tree | See the external delivery manifest; not pushed |

The uploaded V2 source was reconstructed to the exact audited tree, including the two already-audited TypeScript select casts. The branch had advanced by two diagnostic-only commits. The delta was inspected and reported before implementation, and all four files were retained exactly. No application change from a different architecture was silently substituted.

Local Git history is a **reconstructed source-snapshot history**, not the upstream repository's ancestry. Do not force-push the local history over GitHub. Use the complete source ZIP as a working-tree replacement in your existing clone.

## Safe manual upload

1. In the existing clone, commit or otherwise preserve your own uncommitted work. Export a full application backup before testing any new build.
2. Fetch the remote, switch to `v2manualupload`, and inspect any commits newer than `f366f015bb6ace49d3c367b3d76ff278779a53ba`. Do not overwrite newer unrelated work blindly.
3. Extract the ZIP. Copy the **contents inside its single root folder** to your repository root. Preserve `.git`, private untracked files and local credentials. Do not put the outer folder or the ZIP itself into the repository root.
4. Review `git status` and `git diff`. Use `CHANGED_FILES.md` and the manifest to distinguish intended source changes from generated files. Do not stage `node_modules`, `dist`, `.build`, downloaded evidence, or personal backups.
5. Run the remaining release checks in the normal developer environment, then commit the source changes on `v2manualupload`. Do not merge PR #13 or deploy production as part of this handoff.

No source file deletion is required by the implementation. Historical root reports were preserved under `docs/stabilization/historical-v2-delivery/` and superseded by the current reports.

## Ready versus release-cleared

The complete source is ready for integration and further preview review. Passing PDF component/Compare/restore tests do not prove durable IndexedDB or full fresh-profile restoration. See `FINAL_TEST_STATUS.md` for the exact blocked gates. Do not label the release stable until they and the dependency review pass.

Pushed in this retry: **NO**. Merged: **NO**. Production deployed: **NO**.
