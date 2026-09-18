# Universal Agent Interface — end-state operability contract

## Purpose

Version history alone does not make AtlasNote easy for AI to operate. V2.2 must also give any future AI integration one stable, discoverable, provider-neutral way to **inspect, navigate, propose and apply reviewed changes** without screen-scraping or inventing subsystem-specific shortcuts.

The end-state rule is:

> Every supported AI action is discoverable through one capability registry, resolved through one target/navigation service, and all writes pass through one reviewed ChangeSet executor.

Do not require the AI to reverse-engineer component internals, CSS selectors, private URLs, DOM order, or unrelated stores.

## Four layers

Implement these as explicit internal boundaries. File names may differ, but the contracts must remain clear.

### 1. Read/query layer

A provider-neutral query service must expose bounded structured reads for:

- application/release identity;
- current active workspace/pane/tab/reader location;
- resource catalogue by content type/subject/taxonomy;
- stable resource identity and exact `ResourceTarget`;
- current revision/head and available historical revisions;
- resource canonical structured content;
- Notebook tree/project structure;
- Concept Index/reference summaries;
- bookmarks/Read Later/captures when explicitly requested;
- workspace slots and current layout summary;
- backup/history storage diagnostics;
- capabilities supported for the selected resource/target.

The output must use stable IDs and existing target/revision models. It must not serialize arbitrary component state or DOM snapshots as the application API.

Recommended pure/service calls include equivalents of:

- `getAgentCapabilities()`
- `getAgentContext(scope)`
- `listResources(filter)`
- `getResource(resourceKey, revision?)`
- `listResourceVersions(resourceKey)`
- `resolveTarget(ResourceTarget)`
- `getWorkspaceSummary(workspaceId?)`
- `getReferenceSummary(target)`
- `getStorageDiagnostics()`

All reads must be bounded and validation-safe.

### 2. Navigation layer

Navigation is not a content mutation. The agent must be able to request existing AtlasNote navigation semantics rather than infer UI paths.

Use the existing `ResourceTarget` + `ReadingDestination` family. Support at minimum:

- open current resource here;
- open pinned historical revision here;
- new tab;
- other pane;
- workspace 1–5;
- enter/leave Compare;
- select A/B pane;
- switch `Changes` / side-by-side when comparing revisions;
- open Version History for current target;
- open Reference Explorer for an exact target/concept;
- open Dashboard/Quick Capture/Workspace States as existing system surfaces.

Recommended service equivalents:

- `navigateAgentTarget(target, destination)`
- `setAgentCompareState(...)`
- `openAgentSystemSurface(...)`

These calls must reuse existing app navigation/state services rather than dispatching fragile DOM clicks internally.

### 3. Change proposal layer

All future AI writes use a strict typed `AgentChangeSet`.

Do not expose unrestricted object-store writes, arbitrary patch paths, `eval`, raw JavaScript or a global generic `setState` API.

Every operation must declare:

- operation ID;
- kind;
- exact logical resource/target where relevant;
- expected/base revision or fingerprint;
- bounded payload using the canonical subsystem schema;
- optional rationale/summary;
- whether it is versioned content, reviewed personal state, or navigation only.

The validator must reject:

- unknown operation kinds/fields;
- stale base revisions;
- malformed canonical content;
- unsupported resource types;
- unsafe URLs/HTML/scripts;
- prototype-bearing objects;
- oversized batches;
- operations crossing explicit permission boundaries.

### 4. Review/apply layer

Preview, stage and accept must remain separate.

- Preview: pure/read-only.
- Stage: writes review metadata only; no current content change.
- Accept: atomically applies the selected operations through authoritative subsystem services and the shared revision engine.
- Reject: records review outcome without mutating authored content.

A batch must never be partially applied if an accepted operation becomes stale or invalid.

## Capability registry

Create one machine-readable capability manifest, not scattered implicit knowledge.

At minimum each action describes:

- stable action kind;
- read/navigation/write classification;
- supported resource/content types;
- whether a revision/base fingerprint is required;
- payload schema or schema reference;
- limits;
- review requirement;
- resulting state class (`revision`, `personal`, `workspace`, `navigation`, `semantic-reference`);
- whether the action can be atomic with other operations.

Example conceptual entries:

- `resource.create`
- `resource.update`
- `resource.restoreAsNewRevision`
- `notebook.tree.createNode`
- `notebook.tree.renameNode`
- `notebook.tree.moveNode`
- `notebook.tree.reorderNode`
- `reference.add`
- `reference.remove`
- `taxonomy.assign`
- `bookmark.add`
- `bookmark.remove`
- `readLater.add`
- `capture.create`
- `capture.update`
- `workspace.navigate`
- `workspace.compare`
- `concept.assignment.propose`

The implementation may use more precise names, but capability discovery must be first-class.

## Resource adapter registry

Do not embed all version/diff/edit knowledge in one giant switch statement.

Create a registry keyed by canonical resource type with adapters for:

- logical identity/key;
- capture canonical snapshot;
- validate snapshot;
- compute fingerprint/hash;
- create/update through existing canonical services;
- semantic diff;
- resolve current/historical target;
- summarize revision;
- export bounded agent context.

Required adapters:

- Notebook page
- Notebook tree/project
- Article
- Cheatsheet
- QCM
- PDF logical document

Concept/reference/workspace/personal actions remain separate state classes but should use the same ChangeSet orchestration layer where supported.

## Stable DOM semantics for Browser Use / Codex

The internal service contract is authoritative, but AtlasNote is also tested and operated through the real browser. Make UI automation reliable without exposing private implementation details.

For important system/resource controls:

- preserve meaningful accessible names and roles;
- add stable `data-*` semantics only where useful for testing/agent observability, e.g. `data-resource-id`, `data-resource-type`, `data-revision-id`, `data-agent-action`;
- never use array index or localized visible text as the sole identity for critical actions;
- Version History rows and review operations must expose stable revision/operation IDs;
- tree nodes continue to expose stable node IDs;
- pane A/B and workspace 1–5 remain explicit.

Do not create a hidden DOM containing the entire private database merely to help agents.

## Agent Review UI

Generalize the existing reviewed AI/reference workflow into a universal Agent Review surface.

It should support:

- export capability manifest/context for selected scope;
- import/paste validated ChangeSet JSON;
- human-readable preview grouped by resource and operation;
- semantic diff for versioned edits;
- stale/invalid reasons before staging;
- select individual operations;
- stage;
- accept/reject;
- audit/provenance;
- open affected resource/current/base revision in reader/Compare.

This is the user safety boundary for future AI integrations.

## Direct AI integration boundary

V2.2 must make the app **integration-ready**, but it does not need to ship an OpenAI/Anthropic/provider SDK or cloud backend.

Future integrations should be able to call the same query/navigation/ChangeSet services through a thin adapter (desktop bridge, MCP/plugin, browser integration, import/export, etc.) without changing AtlasNote's data model.

Do not bind core logic to one AI provider.

Do not add a raw unauthenticated localhost write server as a shortcut.

## Permission tiers

Keep an explicit policy table.

### Read/navigation — safe to execute without authored-content mutation

- list/query content;
- resolve exact target;
- navigate panes/tabs/workspaces;
- open Compare/Version History/Reference Explorer;
- produce bounded context exports.

### Reviewed authored-content writes

Require preview/stage/accept:

- create/update/restore Notebook/Article/Cheatsheet/QCM/PDF metadata;
- Notebook structural edits;
- taxonomy changes;
- typed resource links;
- semantic concept/reference changes according to current semantic rules.

### Reviewed personal-state writes

Require explicit action and preserve state ownership:

- bookmarks;
- Read Later;
- captures;
- optional workspace navigation/layout proposals.

### Never automatically permitted

- restore a full backup;
- clear/reset database;
- erase history;
- rewrite QCM attempts/reflections as authored source;
- publish/export private PDFs without explicit user action;
- alter Netlify/GitHub deployment from the content agent layer;
- bypass review or self-approve a ChangeSet.

## End-state acceptance

The architecture is not complete merely because `AgentChangeSet` types exist. The Pro pass must demonstrate that one synthetic agent can discover and successfully perform, through the same public internal contract:

1. find a Notebook page and open it in another pane;
2. list its versions and compare current vs previous;
3. propose a Notebook text edit and accept it as a new revision;
4. propose an Article taxonomy/body edit;
5. propose a structured Cheatsheet block edit;
6. propose a QCM question edit without changing stable IDs;
7. propose a Notebook tree move;
8. add an exact typed reference;
9. add a bookmark or capture through reviewed personal-state action;
10. navigate to a PDF physical page and compare two PDF revisions when available;
11. reject a stale ChangeSet after another edit advances the head;
12. export/restore a full backup and prove the accepted revision/audit history survives.

If any subsystem requires a one-off hidden write path that bypasses this contract, report the gap and fix it before declaring the V2.2 agent foundation complete.
