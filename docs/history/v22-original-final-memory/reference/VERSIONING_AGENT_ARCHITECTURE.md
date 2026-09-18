# V2.2 architecture decision record

## 1. Why V2.2 exists

AtlasNote V2.1 is a stable local-first reader/knowledge workspace. The next major requirement is safe evolution: AI and humans will repeatedly improve Notebook pages, Cheatsheets, Articles, QCMs and PDFs. The application therefore needs immutable content history before broad AI mutation is allowed.

The central rule is:

> All versionable content changes, whether manual or AI-produced, pass through one revision-aware mutation boundary.

This prevents the future AI layer from becoming a second uncontrolled editor.

## 2. Current source remains the fast read projection

To minimize risk, V2.2 may retain the current `imports` / `overlays` / catalogue composition as the normal current-resource projection. The history store is authoritative for immutable past revisions and current-head identity. A version-aware commit updates current projection and history atomically.

Historical reads resolve snapshots from history and are always read-only.

## 3. Suggested IndexedDB v3 shape

Keep:

- `imports`
- `overlays`
- `personal`
- `assets`

Add one object store:

- `history`

Suggested record union:

```ts
type HistoryRecord = HistoryMeta | RevisionHead | ResourceRevision;
```

Suggested keys:

- `meta:history`
- `head:<resourceKey>`
- `rev:<revisionId>`

Suggested indexes:

- `kind`
- `resourceKey`
- `createdAt`
- optionally `status`

Equivalent designs are acceptable if they preserve atomicity, queryability and backward-safe migration.

## 4. Resource keys

Use typed stable logical keys to avoid ID collisions across resource classes, for example:

- `notebook-page:<pageId>`
- `notebook-tree:<projectId>`
- `article:<articleId>`
- `cheatsheet:<documentId>`
- `qcm:<setId>`
- `pdf:<documentId>`

Do not use titles or display paths as identity.

## 5. Revision record

Conceptual shape:

```ts
interface ResourceRevision {
  id: string;                    // rev:<revisionId>
  kind: 'revision';
  schemaVersion: 1;
  revisionId: string;
  resourceKey: string;
  resourceType: 'notebook-page'|'notebook-tree'|'article'|'cheatsheet'|'qcm'|'pdf';
  revisionNumber: number;
  parentRevisionId?: string;
  derivedFromRevisionId?: string;
  createdAt: number;
  source: 'manual'|'ai'|'import'|'restore'|'migration'|'release'|'system';
  sourceDetail?: string;
  summary?: string;
  status: 'committed'|'draft'|'rejected'|'accepted';
  contentHash: string;
  payload: unknown;              // strict structured snapshot, or PDF metadata/asset reference
}
```

Do not persist executable content. Reuse current validators and strict schemas.

## 6. Head record

```ts
interface RevisionHead {
  id: string;              // head:<resourceKey>
  kind: 'head';
  resourceKey: string;
  revisionId: string;
  revisionNumber: number;
  contentHash: string;
  updatedAt: number;
}
```

Current source projection and head hash must agree after every successful version-aware transaction.

## 7. First-run baseline

The first V2.2 initialization should snapshot the effective current state as revision 1 for every versionable logical resource. It must be resumable/idempotent. PDFs snapshot metadata + existing hash/asset identity only.

Built-in source provenance may include release ID / baseline commit metadata but must not require live GitHub access.

## 8. Linear current history, explicit derivation

Keep one linear current lineage per logical resource for V2.2. AI drafts can branch from a base revision but cannot become current if the head changed meanwhile.

Restoring old revision 4 while current is revision 8 creates revision 9:

- parent = revision 8;
- derived/restored-from = revision 4;
- revision 9 becomes current.

Never move the head backward and erase revision 5-8 provenance.

## 9. Historical targets

Extend the existing `ResourceTarget` family additively with a history pin such as `historyRevisionId`. Floating targets omit it and resolve current. Pinned targets resolve the immutable revision.

PDF file hash/revision semantics remain distinct from history revision identity.

## 10. Diff model

Create a pure typed diff layer independent of React.

Suggested common concepts:

```ts
type DiffKind = 'add'|'remove'|'modify'|'move'|'rename'|'reorder';
interface DiffEntry {
  kind: DiffKind;
  entityType: string;
  entityId?: string;
  path?: string[];
  before?: unknown;
  after?: unknown;
  fields?: FieldDiff[];
}
```

Adapters produce this model for Notebook, Article, Cheatsheet, QCM and PDF. UI renders it as readable semantic changes, with raw JSON only as Advanced.

## 11. AI control plane

Create a provider-neutral internal module, e.g. `src/agent/`, with pure/service boundaries:

- `capabilities` - supported action/schema manifest;
- `context` - bounded export with exact targets/revision IDs/fingerprints;
- `model` - typed `AgentChangeSet` / operation union;
- `validation` - strict schema and safe limits;
- `preview` - no mutation;
- `staging` - bounded review/draft metadata only;
- `apply` - atomic reviewed mutation through existing/revision services;
- `audit` - review outcomes and provenance.

Do not expose a raw unrestricted global write API or network listener.

## 12. AI action categories

Content actions become revisions. Workspace/personal actions remain their existing state classes.

### Versioned content

- resource create/update;
- Notebook page/tree edits;
- Article metadata/body/taxonomy;
- Cheatsheet structured source;
- QCM canonical source;
- PDF metadata/version reference;
- typed resource-link edits.

### Reviewed but not versioned content history

- workspace open/layout/Compare proposals;
- bookmark / Read Later proposal;
- capture proposal;
- semantic concept/reference proposal through existing reviewed model.

### Explicitly excluded from AI auto-mutation

- full backup restore;
- clear/reset database;
- delete history;
- modify QCM attempts/reflections as source content;
- publish private PDFs/backups;
- arbitrary remote scraping/fetching;
- self-accepting proposals.

## 13. Backup

Full backup must contain history records and any PDF asset bytes reachable only from historical revisions. Old backups remain importable. Restore must validate history/head/current-source coherence before mutation.

## 14. Workspace States

Workspace States are already bounded version-like session checkpoints. They remain separate. The AI layer can propose workspace navigation/layout actions but cannot use Workspace State restore as a content rollback mechanism.

## 15. GitHub boundary

GitHub remains app-source distribution/history. AtlasNote resource history is user/application data and must not depend on GitHub. Do not reconstruct personal resource history from Git commits. The V2.2 first-run baseline is revision 1 for the current logical resource state.
