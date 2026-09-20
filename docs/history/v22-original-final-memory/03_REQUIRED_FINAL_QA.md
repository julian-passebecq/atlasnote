# Required Final Acceptance Work for AtlasNote V2.2

V2.2 must not replace V2.1.0 production until all items below are completed with actual evidence.

## A. Fix the confirmed right-click history omission

1. Add the three specified version actions to `ProjectTree` context menus for versionable page/project resources.
2. Verify keyboard context menu (`ContextMenu` and `Shift+F10`) exposes the same actions.
3. Verify `Open previous version in other pane` actually opens a pinned historical target and does not mutate current content.
4. Verify `Compare with previous` opens A/B for the same resource and defaults to semantic `Changes` mode.
5. Verify the actions are hidden/disabled appropriately when there is no previous revision or the item is non-versionable.

## B. Stable browser/agent observability

Keep accessible roles/names and add/test a minimal stable marker vocabulary on critical version/agent operations. At minimum prove stable identity for resource, resource type where known, pane A/B, workspace, revision, operation/review and critical agent/history actions.

## C. Clean integrated build

From the final branch/source in a normal network environment:

```sh
npm ci
python -m pip install -r requirements-test.txt -r requirements-pdf-authoring.txt
python -m playwright install chromium
npm run typecheck:online
npm run build
npm run test:release
```

Do not substitute `dist-offline` for production acceptance.

## D. Full release gates

All inherited V2.1 gates plus new V2.2 gates must pass. Preserve original test files/timeout semantics unless a genuine versioned test update is intentionally reviewed.

Mandatory V2.2-specific proof includes:

- history unit/gate;
- agent unit/gate;
- PDFAtlas provenance gate;
- V2.2 normal-origin runtime gate;
- backup migration/restore proof;
- no V2.1 reader/PDF/reference/content regression.

## E. Real-browser migration and durability

Use disposable profiles first.

Prove:

- V2.1 IndexedDB v2 opens as v3 without data reset;
- baseline revisions are created once and resume safely after interruption;
- reload/close/reopen keeps heads/history/current projection coherent;
- stale multi-tab edits fail safely;
- manual save and accepted ChangeSet create exactly one new revision where expected;
- restore-old-as-new appends and preserves intervening history;
- personal state remains separate.

## F. Browser version/Compare UX

Test Notebook page, Notebook tree/project, Article, Cheatsheet, QCM and PDF history.

For each applicable type:

- History rail control;
- tree right-click version actions;
- History panel destinations;
- pinned historical link;
- read-only historical controls;
- current vs old and old vs old A/B behavior;
- semantic Changes view;
- side-by-side/A-only/B-only;
- restore as new revision.

For QCM, verify attempts/reflections are not rewritten by source version navigation/restore.

For Cheatsheet, verify structured JSON changes and visual rendering remain valid.

For Notebook tree, verify structural historical view is read-only and move/rename/reorder diffs are meaningful.

## G. PDF-specific browser proof

- Production source URL is full commit SHA, never `/main/`.
- old revision retains old source commit/path/hash;
- current and historical PDF open independently in A/B;
- physical page semantics preserved;
- Continuous/single/spread/grid/wheel behavior does not regress;
- embedded PDF internal destinations still work;
- missing historical external source is explicit and never substituted with current bytes;
- local/private old assets survive full backup/restore.

## H. Full backup restore in a fresh context

Test schema 2, 3 and 4 inputs plus current export. Validate current projection == heads after restore. Verify immutable revisions, review records, semantic/reference state, workspaces/personal state and historical local assets survive.

## I. Agent end-state demonstration

Through the **same public internal interface**, demonstrate one synthetic/authorized agent can:

1. discover a Notebook page and navigate it to another pane;
2. list versions and compare current/previous;
3. propose + accept a Notebook edit as a new revision;
4. edit Article body/taxonomy;
5. edit a structured Cheatsheet block;
6. edit a QCM question while preserving stable IDs;
7. move a Notebook tree node;
8. add an exact typed reference;
9. add a reviewed bookmark or capture;
10. navigate to a PDF physical page and compare revisions;
11. reject a stale ChangeSet after head advancement;
12. export/restore a full backup and prove revision/review history survives.

No subsystem may require a hidden one-off write path.

## J. Responsive/accessibility/browser matrix

At minimum exercise 1440x900, 1100x800, 800x900 and 390x844 plus keyboard-only operation for the new history/review surfaces. Capture screenshots, console/network errors and storage evidence.

## K. Integration/release discipline

- Create a dedicated V2.2 branch from production baseline or integrate the delivered candidate carefully against `b50c27a...`.
- Record the final Git SHA.
- Keep `main`/production untouched until all acceptance gates pass.
- Produce final source ZIP, integrated build ZIP, release report and test/browser evidence.
- Only then merge/deploy through the normal release process.
