# AtlasNote V2.2 — Final End-State Contract

## 1. Mission

V2.2 is the architecture foundation for safe long-term AI-assisted evolution of AtlasNote. It must extend the frozen V2.1.0 production application rather than restart or redesign it.

The end-state is:

`stable resource identity -> immutable version history -> semantic Compare -> current/historical targets -> resource adapters -> capability discovery -> structured query/navigation -> reviewed ChangeSet -> audit/provenance -> complete backup/restore`

After this foundation, adding ChatGPT/Codex/MCP/desktop/provider integrations should be an adapter/integration problem, not another AtlasNote data-model redesign.

## 2. Frozen product invariants

Preserve:

- exactly five subjects: `IT | Cloud | Job | KPI | Norsk`;
- exactly five content types: `Notebook | PDF | Cheatsheet | Article | QCM`;
- subject taxonomy orthogonal to content type;
- Notebook structure/manual pins user-owned;
- Concept Index separate from Notebook structure;
- `ResourceTarget` / `ReadingDestination` canonical navigation family;
- backlinks derived, not mirrored;
- five independent workspaces;
- Workspace States = layout/session checkpoints, not content history;
- Quick Capture, bookmarks, Read Later, QCM attempts/reflections, reading positions = personal state;
- PDF physical-page semantics and independent panes;
- Cheatsheet source = structured JSON rendered to native SVG, never giant arbitrary SVG history;
- local-first personal state;
- no GitHub-backed live user DB, no hidden cloud sync, no provider SDK/network AI request in V2.2.

## 3. Versioned resource model

One stable logical resource has immutable revisions and one current head. Historical revisions are read-only. Restoring an old revision appends a new revision; history is never rewritten.

Version these six logical scopes:

1. Notebook page content with stable page/block IDs.
2. Notebook project/tree structure including manual placed references.
3. Article canonical source/blocks/metadata/taxonomy.
4. Cheatsheet structured JSON with sheet/block/frame/style/diagram identity.
5. QCM canonical JSON preserving question/option IDs.
6. PDF logical document metadata + content-addressed asset/source identity; do not duplicate bytes per revision.

Do **not** make content revisions for reading position, bookmarks, Read Later, captures, QCM attempts/reflections, pane/tab/layout state, or Workspace States.

## 4. Persistence and migration

- IndexedDB name remains `knowledge-atlas`.
- Raw DB version: **2 -> 3**.
- Existing stores remain intact.
- Add a dedicated indexed history store with typed initialization/meta, head, revision and review data.
- No destructive rewrite during `onupgradeneeded`.
- Baseline initialization must be idempotent, resumable and preserve V2.1 bytes/state.
- Every versionable current resource gets an initial V2.2 baseline revision.
- Manual edits, imports, restores and accepted AI edits use the **same** revision/mutation service.
- Current projection + immutable revision + head + accepted review/audit must commit atomically.
- Stale/concurrent writes must reject rather than silently overwrite.
- No silent history pruning. Reaching bounded limits blocks writes and requires explicit management/export.

Revision identity/provenance must include stable revision/resource IDs, type, number, parent, timestamp, source, source detail, fingerprint/hash, canonical snapshot/asset reference, and restore/derived/change-set provenance where relevant.

## 5. Current and historical targets

Extend existing resource targets additively with optional `historyRevisionId`.

- no `historyRevisionId` -> floating current revision;
- explicit `historyRevisionId` -> exact immutable historical revision;
- PDF byte/file revision SHA is distinct from AtlasNote history revision ID;
- old links remain valid and current-floating;
- explicitly copied/pinned historical links preserve history identity;
- missing section/question/sheet in an old revision must fail visibly/boundedly, not silently redirect;
- historical views are read-only.

## 6. Version History UX

Keep the UI discreet.

### Right rail

A small accessible `Version History` control for the active versionable reader.

### Tree context menu — mandatory

For versionable resources:

- `Version history...`
- `Compare with previous version`
- `Open previous version in other pane`

Do not crowd non-versionable items.

### History panel

Show current and older revisions with number/date/source/summary/provenance. Support:

- Open here;
- Open in new tab;
- Open in other pane;
- Open in workspace 1–5;
- Compare with current;
- Export revision/history;
- Copy pinned revision link;
- Restore as new version;
- surface related AI draft/review information.

## 7. Compare

Reuse the existing independent A/B reader panes. For two revisions of the same logical resource expose:

`Changes | Side by side | A only | B only`

Explicit version comparison defaults to `Changes`.

Semantic diff must use stable structured identities, not raw JSON by default:

- Notebook: block/text changes;
- tree: add/remove/rename/move/reorder;
- Article: metadata/block/text/taxonomy;
- Cheatsheet: sheet/block/diagram/style semantic changes + visual side-by-side;
- QCM: question/option/answer/explanation semantic changes preserving IDs;
- PDF: source/hash/page count/metadata/outline plus A/B reader; no pixel/OCR diff requirement.

Raw before/after JSON may exist as an advanced detail, not the primary UX.

## 8. Universal Agent Interface

V2.2 must expose one provider-neutral internal interface so future AIs can inspect, navigate and propose changes without subsystem-specific hidden APIs.

### Query/discovery

Bounded structured calls equivalent to:

- `getAgentCapabilities()`
- `getAgentContext(scope)`
- `listResources(filter)`
- `getResource(resourceKey, revision?)`
- `listResourceVersions(resourceKey)`
- `resolveTarget(target)`
- `getWorkspaceSummary(workspaceId?)`
- `getReferenceSummary(target)`
- `getStorageDiagnostics()`

Use stable IDs and canonical structured content. Do not use DOM snapshots as the data API.

### Navigation

Use existing `ResourceTarget`/`ReadingDestination` semantics for:

- current or pinned historical target;
- here/new tab/other pane/workspace 1–5;
- Compare enter/leave and A/B selection;
- Changes vs side-by-side;
- Version History;
- Reference Explorer;
- Dashboard / Quick Capture / Workspace States.

### Capability registry

One machine-readable registry declares action kind, classification, supported resources, base/fingerprint requirements, payload schema, limits, review requirement, resulting state class and atomicity.

### Resource adapter registry

Adapters for Notebook page, Notebook tree/project, Article, Cheatsheet, QCM and PDF own logical identity, snapshot, validation, hash, current/historical target, semantic diff, summary and bounded agent context.

## 9. Agent ChangeSet safety model

No unrestricted IndexedDB writes, arbitrary object paths, eval/JS patches or generic global setter.

Each operation has stable ID, kind, exact resource/target, expected base revision/fingerprint where required, bounded canonical payload and optional rationale.

Reject unknown fields/kinds, malformed content, stale bases, unsupported resource types, unsafe URLs/HTML/scripts, prototype-bearing objects, oversized batches and permission-boundary violations.

Workflow:

- **Preview** = pure/read-only.
- **Stage** = store review metadata only.
- **Accept** = revalidate live bases and atomically apply selected operations through authoritative services/revision engine.
- **Reject** = audit outcome only.
- No partial accepted batch if one selected operation becomes stale/invalid.

Reviewed authored-content actions include create/update/restore content, tree edits, taxonomy, typed references and semantic concept/reference proposals under existing rules.

Reviewed personal-state actions may include bookmarks, Read Later and captures. Navigation can use direct safe services; proposed persistent personal/layout mutations still require explicit review.

Never allow the content agent to auto-restore a full backup, clear/reset DB, erase history, rewrite QCM attempts/reflections as source, publish private PDFs, change deployment, fetch arbitrary remote files, bypass review or self-approve.

## 10. Browser/Codex operability

The internal service contract is authoritative, but real-browser automation must also be stable:

- meaningful accessible roles/names;
- stable node/pane/workspace/resource/revision/operation identity;
- history rows expose revision IDs;
- review operations expose operation IDs;
- tree nodes expose stable node IDs;
- A/B panes and workspace 1–5 explicit;
- add useful stable `data-*` markers such as resource ID/type/revision/action where they materially improve QA/agent observability;
- do not use localized visible text or array index as the sole critical identity;
- do not mirror the private DB into hidden DOM.

## 11. PDFAtlas contract

AtlasNote and `julian-passebecq/pdfatlas` remain separate.

Production must use a full immutable PDFAtlas commit SHA, never mutable `/main/`.

Keep separate identities:

- stable logical AtlasNote document ID;
- AtlasNote history revision ID;
- PDFAtlas source repository + commit SHA + relative path;
- PDF byte SHA-256;
- byte length/page count;
- reviewed metadata revision;
- rights/attribution status.

Same evolving PDF -> same logical doc ID + new AtlasNote revision with new immutable source/hash. Different document -> new stable ID.

AtlasNote stores reviewed metadata/enrichment and generates metadata-only packs; public PDF bytes remain external. Critical source manifest fields must be checked for drift against the pinned source commit. AI may inspect/propose metadata/history but may not push PDFAtlas bytes, infer rights, change production pin without review, publish private bytes or fetch arbitrary URLs into the trusted library.

Current rights remain `reference-only`; redistribution rights are not established by V2.2.

## 12. Backup and recovery

Full backups must accept legacy schemas 2/3 and emit schema 4 once V2.2 history exists.

Schema 4 must preserve:

- current canonical content/overlays;
- all immutable revisions/heads;
- review audit/provenance;
- local/private historical PDF assets required by old revisions;
- asset bindings;
- current personal state;
- semantic/reference state;
- sessions/workspace checkpoints.

Legacy V2.1 restore creates one baseline revision per composed resource; it must not fabricate earlier history.

Before replacement restore, validate archive/path/binary hashes, history integrity, parent/head relationships, current projection coherence, PDF provenance and required historical local assets. Full restore remains an explicit Settings/user action and is **not** an agent capability.

External public historical PDFs remain immutable URL/hash references; missing old external bytes fail explicitly rather than silently using current bytes.

## 13. Deliberately out of scope / deferred

Not required for V2.2 acceptance:

- provider SDK or cloud AI backend;
- MCP/desktop bridge implementation;
- historical full-text search;
- PDF OCR/pixel diff;
- destructive history pruning/reset UX;
- arbitrary remote PDF intake by agents;
- deployment automation from the content-agent layer.

These can be added later without changing the core model.
