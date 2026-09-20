## Completion addendum (2026-09-18)

The 25 kinds and atomic ownership model below are unchanged. Capability exports
now describe payload/target envelopes and real validation modules, including
`compareRevisions` and all actual system-surface values. Review UI clears stale
previews, requires re-preview of changed selections, and displays decided audits
without replay. The exported registry is a detached copy. New or retargeted
manual-reference/authored-link targets must resolve exactly, while unchanged
unresolved links are retained. Native tree node creation remains page/folder;
typed placements use `resource.update` on `notebook-tree:atlas.manual-references`.
See `V22_COMPLETION_REPORT.md` and `docs/v22/BROWSER_AGENT_SEMANTICS.md`.

# Universal Agent Interface and ChangeSet v1

## Entry and trust boundary

The stable same-origin internal module is `app/agent/public.js`, built from `src/agent/public.ts`. After AtlasNote startup, `getAgentInterface()` returns the configured facade. UI, a future authorized integration and synthetic test orchestration use the same services.

This is not a remote API, authentication system or raw database bridge. A future connector must keep model-produced proposals separate from explicit human acceptance. Do not expose `accept` as an autonomous model tool or a generic unauthenticated localhost endpoint. The current UI performs no provider request and contains no API key.

```js
const { getAgentInterface } = await import('./app/agent/public.js');
const atlas = getAgentInterface();
const capabilities = atlas.getAgentCapabilities();
const resource = atlas.listResources({ type: 'article', subject: 'it', limit: 20 });
const context = atlas.getAgentContext({
  resourceKeys: resource.items.slice(0, 3).map(item => item.resourceKey),
  includeHistory: true,
  includePersonal: false
});
```

`docs/examples/v22/capabilities.json` is the machine-readable manifest generated from the central operation registry. `INDEX.json` identifies sequential, validated synthetic examples for every supported operation kind. Their revision IDs/fingerprints belong to that fixture, not a user's live database; obtain fresh context before making a real proposal.

## Read and navigation surface

`getAgentCapabilities()` exposes interface/release identity, module entry, resource types, subject labels/codes, limits, permission tiers, query/navigation names and action schemas/classifications. Canonical subject codes are `it`, `cloud`, `job`, `kpi`, `norsk`; content types remain the five existing product types, while six revision adapters distinguish Notebook content from structure.

`listResources(filter)` supports resource type, subject, taxonomy folder, bounded title query, offset/limit and explicit structural inclusion. `getResource(key, historyRevisionId?)` returns cloned canonical source, exact target, current head, optional selected revision and read-only status. `listResourceVersions` returns bounded newest-first revision metadata, not unbounded snapshots. `resolveTarget` retains existing exact-target warnings and semantic fingerprints.

`getWorkspaceSummary(slot?)`, `getReferenceSummary(target?)`, `getStorageDiagnostics()` and `getStateFingerprint(class)` provide explicit structured reads. `getAgentContext` selects at most 20 resources, optional bounded history metadata and **explicit boolean** personal opt-in. It marks resource excerpts as untrusted data rather than instructions. It does not mirror the private database into hidden DOM.

`navigateAgentTarget(target,destination)` reuses `ResourceTarget` plus `here`, `tab`, `pane`, or numeric workspace 1-5. `setAgentCompareState` enters/leaves existing A/B Compare, selects A/B and chooses `changes`, `side-by-side`, `a` or `b`. `compareRevisions` opens exact historical/current views. `openAgentSystemSurface` routes History, Reference Explorer, Dashboard, Capture, Workspace States and Agent Review. These are navigation, not authored revisions.

## Envelope

```json
{
  "schemaVersion": 1,
  "kind": "atlas-agent-changeset",
  "id": "proposal.unique-stable-id",
  "createdAt": 0,
  "source": "User-selected agent or tool",
  "summary": "Explain the intended change",
  "operations": []
}
```

The illustration omits real operations; a valid ChangeSet requires 1-50. Stable IDs are bounded by the existing canonical ID pattern. Timestamps are finite nonnegative integer milliseconds in the JavaScript date range. Source is required, up to 200 characters; optional summary/rationale is up to 2,000. UTF-8 input is capped at 1 MiB. All JSON objects must be plain and contain only allowed keys. Unknown kinds/fields, prototypes/reserved keys, cycles, non-JSON values, unsafe URLs, active HTML/script payloads and malformed canonical data fail before staging.

Each operation has `id`, `kind`, `payload`, and optional `rationale`. Revision operations require exact `resourceKey` and `baseRevisionId`. Create requires explicit null `baseRevisionId` and a genuinely new logical identity. Personal/semantic/layout operations require their exact `baseFingerprint`. Mixed or duplicate operation IDs, unknown selected IDs and empty selections are rejected.

There is no unrestricted JSON Patch path, `eval`, arbitrary JavaScript operation, generic store write, automatic file fetch or provider-specific payload.

## Payload schemas by operation family

The normative TypeScript union is `src/agent/model.ts::OperationPayloads`. The runtime structural validator is `src/agent/validation.ts`; canonical snapshot validation is `src/history/validation.mjs` plus the existing Notebook/Article/Cheatsheet/QCM/PDF validators. Live exact bases, identity/ownership, assets, targets and permissions are checked again in the pure planner and at acceptance. Manifest field schema references below resolve to the matching field anchors.

| Kind | Payload | Resulting state |
| --- | --- | --- |
| `resource.create`, `resource.update` | `resourceType`, canonical `snapshot` | Revision |
| `resource.draft` | `resourceType`, canonical `snapshot` | Review metadata only |
| `resource.restoreAsNewRevision` | `revisionId` from the same resource | New revision, restore provenance |
| `taxonomy.assign` | Canonical `taxonomy` or null | Revision |
| `notebook.tree.createNode` | Existing structural `operation` with kind add | Tree revision |
| `notebook.tree.renameNode` | Structural operation kind rename | Tree revision |
| `notebook.tree.moveNode` | Structural operation kind move; destination head when cross-project | Source/destination tree revisions |
| `notebook.tree.reorderNode` | Structural operation kind order | Tree revision |
| `resource.link.add/update/remove` | Typed target/label; bounded index for update/remove | Authored revision |
| `reference.add/remove` | Exact endpoints + semantic revisions/kind, or existing edge ID | Existing semantic state |
| `concept.assignment.propose` | Existing canonical reference-suggestion batch | Existing semantic review queue |
| `bookmark.add/remove` | Exact target/title, or existing bookmark ID | Personal state |
| `readLater.add/remove` | Exact target/title, or existing reading-list ID | Personal state |
| `capture.create/update` | Canonical kind/text and allowed fields, or existing capture ID | Personal state |
| `workspace.navigate` | Target + existing destination | Workspace/navigation |
| `workspace.compare` | enabled; optional mode and pane | Workspace/navigation |
| `pdf.metadata.update` | PDF snapshot with unchanged byte/source identity | PDF revision |
| `pdf.revision.propose` | PDF snapshot using already reviewed same-document source | PDF revision |

Canonical snapshots contain `page` or `project`, optional explicit `taxonomy`, PDF `document`/`companion`/`pdfProvenance`, content-addressed `assetRefs`, or structural references/preferences/category/archived IDs as appropriate. They never contain rendered SVG output or duplicated PDF bytes. Resource/page/document IDs cannot be changed by an update. Article/QCM wrapper identity and taxonomy remain coherent; question/option IDs retain their authored identity.

A cross-Notebook move requires the source resource base and `destinationBaseRevisionId`. Semantic references additionally require exact `sourceRevision` and `targetRevision` from the resolver; a semantic-state fingerprint alone does not authorize a changed endpoint. PDFs retain same-document identity, source/byte metadata, visibility and rights. Replacement bytes must be manually reviewed first; the agent cannot infer that an unrelated imported document is a new version.

## Review lifecycle

1. `preview(input, selectedIds?)` validates and applies to a detached candidate, producing human-readable grouped semantic changes. It makes no durable write.
2. `stage(input)` rechecks the live full plan and saves its review record. Current content and heads do not change.
3. The user selects operations. `accept(id, selectedIds?)` recomputes live preconditions and the selected candidate, then commits all selected current/revision/personal/review effects atomically. Unselected operations are not silently applied. A restore cannot be mixed with another write to the same logical resource in one selection.
4. `reject(id)` records a rejected outcome without content writes. A stale acceptance records `stale` and a reason, without partial content changes; it can subsequently be rejected. Repeated acceptance is forbidden.

Draft operations are intentionally review-only, even when their review decision is accepted; publishing draft text requires a separate `resource.update` with a fresh base. Concept assignment proposals intentionally enter the existing semantic suggestion queue and need its existing explicit acceptance. These boundaries are visible rather than silently converting proposal metadata into authored content or accepted semantic links.

## Never permitted as automatic agent operations

Full backup restore, database reset/clear, history erasure, rewriting QCM attempts/reflections, publishing private bytes, changing GitHub/Netlify, arbitrary remote fetch and self-approval are not registered. Local user exports/restores stay existing explicit UI actions. Capabilities are declarative discovery, not a permission to bypass review.

## Stable browser semantics

History rows expose `data-revision-id`; reader panes expose stable pane/history/current IDs; operations expose `data-operation-id`; audit controls expose review ID/status. Existing tree IDs and workspace 1-5 labels are preserved. Important controls retain names such as Version history, Agent Review, Preview ChangeSet, Stage for review, Accept selected operations, Reject ChangeSet and Compare mode. No hidden private-data DOM is added.

## Limits and unresolved verification

Limits are exported from the same `HISTORY_LIMITS` object used by validation. There is no silent review/history pruning. Synthetic examples/unit tests cover the public orchestration, not browser durability. The normal-origin runtime suite uses the public module for agent actions, with direct database writes restricted to explicitly labeled pre-application migration fixture setup. Integrated module sharing, real transactions and responsive visual behavior remain blocked/unverified here; consult the release evidence before enabling a bridge or integrating this candidate.

## Manifest field anchors

The generated appendix names every action field and links it to its canonical type. Runtime validators and live preconditions are mandatory in addition to these descriptive schema references.

### resource.create

Canonical payload type: `resourceType:ResourceType;snapshot:ResourceSnapshot`.

<a id="resource.create.resourceType"></a>
`resourceType` is the field defined above; unknown extra payload fields are rejected.

<a id="resource.create.snapshot"></a>
`snapshot` is the field defined above; unknown extra payload fields are rejected.

### resource.update

Canonical payload type: `resourceType:ResourceType;snapshot:ResourceSnapshot`.

<a id="resource.update.resourceType"></a>
`resourceType` is the field defined above; unknown extra payload fields are rejected.

<a id="resource.update.snapshot"></a>
`snapshot` is the field defined above; unknown extra payload fields are rejected.

### resource.draft

Canonical payload type: `resourceType:ResourceType;snapshot:ResourceSnapshot`.

<a id="resource.draft.resourceType"></a>
`resourceType` is the field defined above; unknown extra payload fields are rejected.

<a id="resource.draft.snapshot"></a>
`snapshot` is the field defined above; unknown extra payload fields are rejected.

### resource.restoreAsNewRevision

Canonical payload type: `revisionId:string`.

<a id="resource.restoreAsNewRevision.revisionId"></a>
`revisionId` is the field defined above; unknown extra payload fields are rejected.

### taxonomy.assign

Canonical payload type: `taxonomy:TaxonomyRef|null`.

<a id="taxonomy.assign.taxonomy"></a>
`taxonomy` is the field defined above; unknown extra payload fields are rejected.

### notebook.tree.createNode

Canonical payload type: `operation:StructuralOperation`.

<a id="notebook.tree.createNode.operation"></a>
`operation` is the field defined above; unknown extra payload fields are rejected.

### notebook.tree.renameNode

Canonical payload type: `operation:StructuralOperation`.

<a id="notebook.tree.renameNode.operation"></a>
`operation` is the field defined above; unknown extra payload fields are rejected.

### notebook.tree.moveNode

Canonical payload type: `operation:StructuralOperation;destinationBaseRevisionId?:string`.

<a id="notebook.tree.moveNode.operation"></a>
`operation` is the field defined above; unknown extra payload fields are rejected.

<a id="notebook.tree.moveNode.destinationBaseRevisionId"></a>
`destinationBaseRevisionId` is the field defined above; unknown extra payload fields are rejected.

### notebook.tree.reorderNode

Canonical payload type: `operation:StructuralOperation`.

<a id="notebook.tree.reorderNode.operation"></a>
`operation` is the field defined above; unknown extra payload fields are rejected.

### resource.link.add

Canonical payload type: `label:string;target:ResourceTarget`.

<a id="resource.link.add.label"></a>
`label` is the field defined above; unknown extra payload fields are rejected.

<a id="resource.link.add.target"></a>
`target` is the field defined above; unknown extra payload fields are rejected.

### resource.link.update

Canonical payload type: `index:number;label:string;target:ResourceTarget`.

<a id="resource.link.update.index"></a>
`index` is the field defined above; unknown extra payload fields are rejected.

<a id="resource.link.update.label"></a>
`label` is the field defined above; unknown extra payload fields are rejected.

<a id="resource.link.update.target"></a>
`target` is the field defined above; unknown extra payload fields are rejected.

### resource.link.remove

Canonical payload type: `index:number`.

<a id="resource.link.remove.index"></a>
`index` is the field defined above; unknown extra payload fields are rejected.

### reference.add

Canonical payload type: `source:ResourceTarget;target:ResourceTarget;sourceRevision:string;targetRevision:string;kind:'link'|'context'|'related';label?:string;note?:string`.

<a id="reference.add.source"></a>
`source` is the field defined above; unknown extra payload fields are rejected.

<a id="reference.add.target"></a>
`target` is the field defined above; unknown extra payload fields are rejected.

<a id="reference.add.sourceRevision"></a>
`sourceRevision` is the field defined above; unknown extra payload fields are rejected.

<a id="reference.add.targetRevision"></a>
`targetRevision` is the field defined above; unknown extra payload fields are rejected.

<a id="reference.add.kind"></a>
`kind` is the field defined above; unknown extra payload fields are rejected.

<a id="reference.add.label"></a>
`label` is the field defined above; unknown extra payload fields are rejected.

<a id="reference.add.note"></a>
`note` is the field defined above; unknown extra payload fields are rejected.

### reference.remove

Canonical payload type: `id:string`.

<a id="reference.remove.id"></a>
`id` is the field defined above; unknown extra payload fields are rejected.

### concept.assignment.propose

Canonical payload type: `batch:unknown`.

<a id="concept.assignment.propose.batch"></a>
`batch` is the field defined above; unknown extra payload fields are rejected.

### bookmark.add

Canonical payload type: `target:ResourceTarget;title:string`.

<a id="bookmark.add.target"></a>
`target` is the field defined above; unknown extra payload fields are rejected.

<a id="bookmark.add.title"></a>
`title` is the field defined above; unknown extra payload fields are rejected.

### bookmark.remove

Canonical payload type: `id:string`.

<a id="bookmark.remove.id"></a>
`id` is the field defined above; unknown extra payload fields are rejected.

### readLater.add

Canonical payload type: `target:ResourceTarget;title:string`.

<a id="readLater.add.target"></a>
`target` is the field defined above; unknown extra payload fields are rejected.

<a id="readLater.add.title"></a>
`title` is the field defined above; unknown extra payload fields are rejected.

### readLater.remove

Canonical payload type: `id:string`.

<a id="readLater.remove.id"></a>
`id` is the field defined above; unknown extra payload fields are rejected.

### capture.create

Canonical payload type: `kind:'link'|'task'|'note';text:string;url?:string;taxonomy?:TaxonomyRef;target?:ResourceTarget`.

<a id="capture.create.kind"></a>
`kind` is the field defined above; unknown extra payload fields are rejected.

<a id="capture.create.text"></a>
`text` is the field defined above; unknown extra payload fields are rejected.

<a id="capture.create.url"></a>
`url` is the field defined above; unknown extra payload fields are rejected.

<a id="capture.create.taxonomy"></a>
`taxonomy` is the field defined above; unknown extra payload fields are rejected.

<a id="capture.create.target"></a>
`target` is the field defined above; unknown extra payload fields are rejected.

### capture.update

Canonical payload type: `id:string;text:string;status?:'inbox'|'open'|'done'|'archived';taxonomy?:TaxonomyRef`.

<a id="capture.update.id"></a>
`id` is the field defined above; unknown extra payload fields are rejected.

<a id="capture.update.text"></a>
`text` is the field defined above; unknown extra payload fields are rejected.

<a id="capture.update.status"></a>
`status` is the field defined above; unknown extra payload fields are rejected.

<a id="capture.update.taxonomy"></a>
`taxonomy` is the field defined above; unknown extra payload fields are rejected.

### workspace.navigate

Canonical payload type: `target:ResourceTarget;destination:ReadingDestination`.

<a id="workspace.navigate.target"></a>
`target` is the field defined above; unknown extra payload fields are rejected.

<a id="workspace.navigate.destination"></a>
`destination` is the field defined above; unknown extra payload fields are rejected.

### workspace.compare

Canonical payload type: `enabled:boolean;mode?:'changes'|'side-by-side'|'a'|'b';pane?:'A'|'B'`.

<a id="workspace.compare.enabled"></a>
`enabled` is the field defined above; unknown extra payload fields are rejected.

<a id="workspace.compare.mode"></a>
`mode` is the field defined above; unknown extra payload fields are rejected.

<a id="workspace.compare.pane"></a>
`pane` is the field defined above; unknown extra payload fields are rejected.

### pdf.metadata.update

Canonical payload type: `resourceType:'pdf';snapshot:ResourceSnapshot`.

<a id="pdf.metadata.update.resourceType"></a>
`resourceType` is the field defined above; unknown extra payload fields are rejected.

<a id="pdf.metadata.update.snapshot"></a>
`snapshot` is the field defined above; unknown extra payload fields are rejected.

### pdf.revision.propose

Canonical payload type: `resourceType:'pdf';snapshot:ResourceSnapshot`.

<a id="pdf.revision.propose.resourceType"></a>
`resourceType` is the field defined above; unknown extra payload fields are rejected.

<a id="pdf.revision.propose.snapshot"></a>
`snapshot` is the field defined above; unknown extra payload fields are rejected.
