# AtlasNote 1.2.3 - completion and saved-state pass

## Delivery status

Complete source candidate, locally built and tested within the documented environment. **Not deployed; normal-origin release acceptance remains mandatory.** This is the first packaged delivery of the simplified-sidebar changes plus the saved-state feature. It supersedes the previous incomplete chat-workspace handoff. Consult the root FINAL_TEST_STATUS for measured final results rather than historical release reports.

## Implemented request map

| Request | Implementation |
|---|---|
| Remove redundant ribbon/heading | No global topbar DOM and no Show/Hide global-topbar button; no My notebooks/PDF Library text heading. |
| Compact left navigation | Notes/PDF, sidebar toggle, Back, Forward, icon Search. Collapsed library leaves an accessible navigation dock. |
| Small plus next to A/B | Pane identity, plus, controls toggle, then tabs. Present in each independent pane. |
| Controls hidden initially | Unset visibility means hidden. A prior explicit shown preference remains shown. |
| Unambiguous right toolbar | Focus, Compare, separator, Swap, Context, separator, other reading utilities. Spread is document-local, not Compare. |
| Simpler PDF companion | Reuses metadata in the ordinary PDF disclosure tree; no bottom reader module. Categories start collapsed. |
| PDF glossary hyperlinks | Terms have on-demand definitions and physical-page links; page links reuse matching tabs in the active pane when possible. |
| Single-page scroll turns pages | Edge detection includes canvas insets; separate slow-tick accumulation from continuous-gesture locking. |
| Workspace and all-app checkpoints | Five bottom-right buttons, one compact manager, dated saves, optional progress note and recent activity. |

## What a state save captures

The whole selected **reading session**: pane order/active pane/collapse state, split ratio, tabs and their histories, note/PDF locations and anchors, intra-page offset, zoom, rotation, presentation and previous quick-layout mode, English/disclosure state, selected category, tree expansions, theme, font size, sidebar state and screen. An all-workspaces save stores slot 1, the initialized slots 2-5, and which slot is active. Empty slots remain lazily initialized rather than being filled with invented session data.

This deliberately does NOT freeze the library, note contents, PDF bytes, shared metadata, ratings or ordinary reading bookmarks. Restore changes where/how you read; it does not erase newer work. When a document is unavailable, the existing missing-page workflow retains its ID/view instead of silently deleting the tab. Full workspace backup in Settings remains the portable copy of content and private PDF bytes.

On narrow screens some visibility is responsive to screen width, even when a desktop visibility flag was saved. Browser-native fullscreen requires a user activation; restoring a saved logical Focus state does not silently request fullscreen. Ephemeral modal/popup state and browser window size are not checkpoints.

## Save and restore safety

- New saves receive distinct IDs and frozen session copies. The latest buttons select manual saves, not undo records. Renaming does not change save chronology.
- Every restore first copies the current scope into its undo slot. Undo performs the same protected restore; using it again can return to the state it replaced.
- Single-scope restores target and select the original workspace, leaving the other four sessions unchanged. All-scope restores also reset the active slot to the saved one.
- Capture flushes reader positions and queued storage writes. The UI awaits the personal-state write before reporting success. Saved sessions and their automatic undo snapshot are committed together in the existing personal transaction. A storage error is shown explicitly; in-memory recovery remains available via the existing emergency/full-backup path.
- A restore revision invalidates callbacks from old readers and remounts their local renderer state. The URL is synchronized before remount so the pre-restore URL cannot replay over the restored session.
- Nested snapshots use the same session validator as live sessions. Unknown snapshot fields, malformed scopes/IDs/views, missing active slots, invalid page/zoom/rotation, recursive payloads, oversized records and unrepresentable dates are rejected. Full backup import validates saved states before writing.

## Bounded manager

20 manual saves per scope, six scopes (1-5/All), 120 total; one undo point per scope; a maximum of 30 activity records; title up to 120 characters; progress note up to 500; 6 MiB saved-state serialized budget. Existing global structural limits also apply. Reaching a save/budget limit does not prune manual entries: the user must explicitly delete an old save. Undo points and the recent activity ring are intentionally bounded, not an unlimited version-control system.

The manager contains no remote account, scheduler, automatic ETA estimator, cloud sync or new library database. Progress notes are manual reminders such as "Next: partitioning and deployment modes."

## Retained PDF workflows

The React-PDF/PDF.js engine, worker version/asset-integrity checks, selectable text, outline, zoom, rotations, Single/Continuous/Spread, private PDF bytes and hash verification remain in place. Metadata is projected by exact document revision; stale-revision metadata is retained but its page links are not attached to a different file. PDFs without a companion receive an honest Pages disclosure when a page count is known. The existing on-demand editor retains template download, JSON import/export, local-only text preparation and shared-glossary promotion. Promotion remains idempotent and shows when a term is already in the global glossary.

## Root causes corrected

The slow-wheel bug combined a short gesture-idle threshold with an accumulation reset, discarding small ticks before they could turn a page. A separate accumulation window retains recent slow edge motion while a sustained gesture stays locked after one turn. A second observed defect counted renderer canvas padding as unread content at the top/bottom, preventing reverse turns at a restored top position. Edge detection now accounts for those computed insets. Actual PDF component tests exercise natural mouse-wheel scrolling and reverse page turns, not only a pure helper.

The PDF-authoring regression test previously assumed the third-party optimizer stopped improving after a single pass. A legitimate one-byte size reduction violated that setup assumption. The test now constructs a non-smaller candidate through bounded repeated real optimization and keeps the strict original-byte-equality assertion. No compression algorithm or private input was changed.

## Test architecture and limitations

Core tests include checkpoint immutability, scope isolation, undo, every serialized session field, bounded history/limits, malformed backup rejection and a real ZIP serializer/parser round-trip. The new browser UI suite tests production actions with an explicitly in-memory store on about:blank. A separate opt-in harness renders the actual React-PDF/PDF.js engine and synthetic PDF canvases, also with an in-memory store. Neither harness certifies IndexedDB or hosted reload.

Normal-origin tests use the production entry, actual IndexedDB and browser downloads/new contexts; they contain no fake store, request interception for storage or browser-policy bypass. The five normal-origin scripts are retained/adapted and required in CI, including the new saved-state persistence/fresh-restore script. Their administrator-policy block here is reported as BLOCKED, never PASS. Clean install and current registry vulnerability audit are separate gates; read the current status file for their actual outcome.

Older tests were adapted only for controls moved/removed by the new UI contract and explicit control visibility in old fixtures. Meaningful independence, backup, file-integrity, page-state, layout and renderer assertions remain. The new suite independently verifies the hidden-by-default contract.

## Integration boundary

Baseline upstream commit: `476f327ae77eb9103f2e5d079b87b6a541ddc782`.
Baseline exact tree: `2d07e499cab9236f5a098e2d08513f98f3e1b4f3`.
No source restart, database-name change or private-library publication. No GitHub branch/PR, merge, or Netlify deployment was performed by this completion pass. Use the source ZIP and patch; preserve local changes and do not reapply older main stashes over it.
