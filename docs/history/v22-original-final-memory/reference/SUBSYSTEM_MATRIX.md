# V2.2 subsystem matrix

| Subsystem | Versioned? | AI reviewed actions | Default diff / compare | Important boundary |
|---|---:|---|---|---|
| Notebook page | Yes | edit blocks/title/links | block + text semantic diff | preserve stable page/block IDs |
| Notebook tree/project | Yes | create/rename/move/reorder folder/page/reference | tree structural diff | manual pins remain references, not duplicated content |
| Article | Yes | body/blocks/metadata/taxonomy | metadata + block/text diff | canonical JSON and visual editor must remain synchronized |
| Cheatsheet | Yes | structured JSON update | sheet/block/diagram/style semantic diff + visual side-by-side | never version rendered SVG as source |
| QCM source | Yes | prompt/options/correct answers/explanations/taxonomy | question/option semantic diff | question/option IDs stable; attempts/reflections not source |
| PDF logical doc | Yes | metadata/version proposal; byte replacement only with explicit file | hash/page-count/metadata/outline/text-on-demand + A/B reader | content-addressed bytes; no pixel-diff requirement |
| Concept Index | Existing semantic revision/audit | assignment/reference proposal; controlled concept actions only if existing rules permit | existing reference review | no competing semantic store |
| Resource references/backlinks | Current target model | typed link proposal | current/reference UI | backlinks remain derived |
| Dashboard capture | No content revision | create/edit proposal with user accept | n/a | personal shared state |
| Bookmark / Read Later | No content revision | add/remove proposal with user accept | n/a | personal state |
| QCM attempts/reflections | No | read for context only; do not rewrite as authored content | n/a | learning history |
| Workspace pane/tab/layout | No content revision | navigation/layout/Compare proposal | existing pane UI | Workspace States own checkpoints |
| Workspace States | Existing checkpoint model | save/apply only through explicit reviewed user action if exposed | n/a | must never rewind content history |
| Full backup/restore | Backup only | AI may explain/export context; may not auto-restore | n/a | explicit user confirmation only |
| PDF private assets | Referenced by history | no automatic publication/fetch | A/B reader | backup must retain old-revision assets |

## UI placement

### Right rail

One small accessible Version History icon per active versionable reader. Avoid a large new toolbar.

### Tree context

At minimum:

- Version history...
- Compare with previous
- Open previous in other pane

### Version panel actions

- Open
- Open in new tab
- Open in other pane
- Open in workspace 1-5
- Compare with current
- Export revision
- Copy revision link
- Restore as new version

### Compare

Reuse current A/B panes. For two revisions of the same resource:

- Changes (default)
- Side by side
- A only
- B only

## Version source labels

Use a bounded enum plus optional detail:

- Manual edit
- AI update
- Import
- Restore
- Migration
- Release/system update

The UI may show a short change summary. Do not require an AI model name as identity; if supplied, treat it as optional provenance text.

## History management

No silent pruning. Settings should expose history storage usage and explicit export/manage controls if limits are approached.

## Universal agent-operability cross-cutting requirements

These apply to every row above:

- every versionable resource must have a stable logical resource key and registered adapter;
- every supported read must be available through bounded structured query/context services;
- every navigable resource/history target must resolve through `ResourceTarget`/`ReadingDestination` plus additive historical revision identity;
- every supported AI write must be represented in the capability manifest and typed `AgentChangeSet` union;
- versioned writes use the common revision service;
- non-versioned personal/workspace writes remain in their existing ownership class but use reviewed orchestration where agent mutation is supported;
- no subsystem may require direct IndexedDB writes from agent code;
- browser surfaces must expose stable accessible identities for real-browser QA;
- unsupported actions must be explicit in capability discovery rather than silently ignored.

See `06_AGENT_OPERABILITY/UNIVERSAL_AGENT_INTERFACE.md` for the authoritative end-state contract.
