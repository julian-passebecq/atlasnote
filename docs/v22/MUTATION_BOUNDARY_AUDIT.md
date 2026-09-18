# V2.2 mutation boundary audit

## Authored source paths

| Existing caller | Mutation boundary | History projection |
| --- | --- | --- |
| `components/EditDialogs.tsx`, `app/App.tsx` Notebook save | `store.overlays` | Canonical page blocks/source and project prefs. |
| `components/Tree.tsx`, Notebook structural dialogs | `store.overlays` | Per-project tree snapshots and placed manual-reference tree. |
| `content-hub/Editors.tsx`, `LibraryManager.tsx`, `DocumentContext.tsx` | `store.overlays` | Article/QCM canonical source and taxonomy; PDF/page metadata. |
| `cheatsheets/CheatsheetSourceDialog.tsx` | `store.overlays` | Structured JSON, never generated SVG. |
| `companion/CompanionPanel.tsx`, `companion/promote.ts` | `store.overlays` | PDF companion metadata/categories linked to logical PDF revision. Global glossary/semantic concepts retain their existing scope. |
| `components/PdfIntake.tsx`, Settings import | `store.importPacks` | New/replaced source and content-addressed asset identities. |
| Agent acceptance | `store.reviewedMutation` | Detached candidate, same revision engine, one atomic projection/history/audit transaction. |
| Historical restore action | `store.reviewedMutation` | Forced appended revision with old-source provenance. |
| Settings full backup restore | `restoreWorkspace` | Explicit validated replacement, complete heads/history/current projection committed together. Not agent-accessible. |
| Application baseline/source initialization | `initializeHistory` | Batched immutable initial/system revisions, resumable by captured content hashes. |

`writeOverlays`, `writeShared` and legacy low-level `commitImport` also delegate to version preparation; they no longer write content alone. `addAsset` verifies SHA and refuses existing content-key replacement; adding an unreferenced attachment is not itself a content revision. Source edits then bind it through the versioned boundary.

## Non-versioned ownership

`store.personal` remains the path for bookmarks, Read Later, captures, attempts/reflections, ratings, navigation, workspace slots/checkpoints and semantic knowledge state. The latter retains its own exact-target revision/review protocol rather than being mirrored into a second store. These changes do not fabricate authored resource versions. Agent personal/layout actions use the same validated candidate orchestrator for review and atomic audit, without classifying them as content revisions.

## Proof boundary

The original caller files and all mutation sites were inspected; new tests cover revision adapters, shared orchestration and source/head invariants. The old tests were preserved unchanged. Direct user-click saves across every editor, real IndexedDB aborted transactions and persistence after reload still require the blocked browser gates. This audit is source/fixture evidence, not a declaration of end-to-end runtime success.
