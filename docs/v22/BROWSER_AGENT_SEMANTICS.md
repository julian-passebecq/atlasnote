# V2.2 browser/agent semantics - completion contract

The canonical data interface is `app/agent/public.js`:
`getAgentInterface()`, `getAgentCapabilities()`, `validateChangeSet()`.
There is no remote server, provider integration or implicit authorization.
A future external adapter receives context and proposes ChangeSets; human review
owns accept/reject. Do not expose those decision methods as model tools.

## Identity selectors

| Attribute | Meaning |
| --- | --- |
| `data-resource-key` | Canonical versioned resource identity, e.g. `article:page.example` |
| `data-resource-id` | Stable resource ID (PDF document ID; otherwise source page/project ID) |
| `data-resource-type` | One of notebook-page/notebook-tree/article/cheatsheet/qcm/pdf |
| `data-revision-id` | Specific revision shown or reviewed by that control |
| `data-current-revision-id` | Resource head at the rendered state |
| `data-history-revision-id` | Explicit historical pin; a document pane uses `current` when unpinned |
| `data-node-id`, `data-project-id` | Navigation placement/container identity, not copied source |
| `data-pane-id`, `data-pane-slot` | Existing pane identity; slot values `a`/`b` follow visible order |
| `data-workspace-id`, `data-tab-id` | Destination/session control identity |
| `data-operation-id`, `data-review-id` | Review/audit identity |

These markers can occur on several representations of the SAME resource. Scope
to a named dialog, `.document-pane`, tree row or review record. Do not count all
`[data-revision-id]` elements globally, parse visible headings as IDs, or infer
permission from element position. Controls retain accessible roles and names.

## Key action values

History menus: `version-history`, `compare-previous-version`,
`open-previous-version`. First-version previous actions are disabled with a reason.
History panel: `revision-open`, `revision-compare`, `compare-select-a`,
`compare-select-b`, `compare-current`, `compare-selected-versions`, `compare-mode`,
`revision-copy-link`, `revision-export`, `history-export`, `revision-restore`,
`revision-restore-confirm`, `revision-restore-cancel`, `history-newer`,
`history-older`.
Navigation: `resource-open`, `collection-open`, `workspace-navigate`, `tab-select`,
`tab-close`, `structure-target-open`, `revision-open-current`.
Review/context: `agent-review`, `capabilities-export`, `context-export`,
`context-select-resource`, `context-remove-resource`, `context-include-personal`,
`changeset-import`, `changeset-preview`, `changeset-select-operation`,
`changeset-preview-selection`, `changeset-stage`, `changeset-accept`,
`changeset-reject`, `changeset-inspect`, `changeset-export-audit`.

Disabled controls are not permission to bypass UI validation. Keyboard menus use
Up/Down/Home/End, skip disabled items, and restore focus on Escape/action dismissal.

## API details that must remain explicit

`navigateAgentTarget(target, destination)` uses `here`, `tab`, `pane`, or numeric
workspace 1-5. Optional Article/QCM wrapper page IDs are resolved from canonical
IDs; a wrong explicit wrapper is rejected. The `historyRevisionId` is NOT a PDF
SHA-256, Git SHA or physical page number.

V2.2 has one canonical Article/QCM identity, confirmed by the user during QA:
`resourceId === page.id === page.article.id` (or `page.qcm.id`). The existing
typed fields `articleId` and `setId` carry that same ID, not separate aliases.
Use it consistently for history, deep links, ChangeSets, query/navigation, backups
and restore. Rename, move and restore-as-new-version preserve it. Historical
links add a logical revision ID to this resource identity. Conflicting wrapper
and document IDs are invalid authored content and must be rejected. The earlier
handoff wording about independent IDs is outside the agreed V2.2 scope; it does
not authorize an identity migration.

`compareRevisions(resourceKey, aRevisionId, bRevisionId?)` orders visible A/B
independently of focus. B omitted means current; two explicit pins means old/old.
It reuses active compare tabs. `setAgentCompareState` retains Changes/Side by side/
A/B-only modes. `openAgentSystemSurface` accepts exactly `history`, `agent-review`,
`references`, `dashboard`, `capture`, `states`.

Capability payload schemas describe envelope/target shapes and actual fields.
Canonical nested source and cross-resource rules still use the named runtime
validators and live preview. Metadata exports are detached copies, never a mutable
registry handle. Native Notebook nodes remain `{id,title,pageId}` or
`{id,title,children}`. To update typed manual-reference placements, read and review
`notebook-tree:atlas.manual-references` through the same resource adapter.

Historical structure is not a frozen copy of all descendant documents. Floating
child targets still follow current content; only explicit child pins are fixed.
Historical missing anchors/assets are unavailable rather than silently substituted.
Full backup, not a JSON-only history export, carries historical local bytes.
