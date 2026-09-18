# AtlasNote V2.2 Pro Master Prompt - Version History + Agent Control Plane

## Mission

Continue the supplied **production AtlasNote V2.1.0 source**. Do not restart or redesign the application. Implement the complete V2.2 foundation for:

1. **resource version history** across every editable knowledge subsystem;
2. **version-aware reader/Compare UX**;
3. **safe AI/agent change proposals** that can target the whole application through one reviewed, typed mutation contract;
4. **durable backup/migration support** for the new history model;
5. the tests and evidence required to prove the feature is safe.

This is an implementation pass, not an architecture-only exercise. **Do not stop at a plan or checkpoint.** Complete the bounded implementation, tests, browser evidence and delivery artifacts.

## Authoritative baseline

Use the separately supplied source ZIP as the only application baseline.

Expected source commit:

`b50c27a987fa65eee1c51d36225908621e322da7`

Expected product/package release:

`AtlasNote V2.1.0` / package version `2.1.0`

The V2.1 production release was merged to `main`, deployed to Netlify, passed the full production CI suite, and passed a final real-browser production QA after the Netlify-injected badge was disabled. The three previous browser blockers were already repaired:

- canonical Article taxonomy <-> JSON synchronization;
- Multiple-answer QCM mode preservation;
- embedded PDF internal-destination navigation.

Do not reopen those fixes unless a V2.2 regression proves a concrete defect.

## Instruction priority

When old repository documents conflict with this handoff, use this order:

1. this V2.2 handoff;
2. exact supplied V2.1.0 source at `b50c27a...`;
3. current V2.1 release/final-polish/release-blocker documentation in the source;
4. older 1.x / early V2 documents only as historical evidence.

Some root historical documents still contain old phrases such as "unreleased" or package `2.0.0`. Do not treat those stale historical statements as the V2.2 baseline truth.

## Product invariants that remain frozen

Preserve unless this handoff explicitly changes them:

- exactly five subjects: `IT | Cloud | Job | KPI | Norsk`;
- exactly five content types: `Notebook | PDF | Cheatsheet | Article | QCM`;
- subject taxonomy remains orthogonal to content type;
- Notebook structural folders/pages and manual pins remain user-owned;
- the Concept Index stays separate from Notebook structure;
- `ResourceTarget` / `ReadingDestination` remain the canonical navigation family;
- no persisted backlink mirror; backlinks remain derived;
- five independent workspaces remain the workspace model;
- Workspace States remain session/layout checkpoints, not content history;
- Quick Capture, bookmarks, Read Later, QCM attempts/reflections and reading positions remain personal state;
- PDF reader pane independence, Continuous mode, wheel behavior and physical-page semantics must not regress;
- Cheatsheets remain structured JSON rendered to native SVG; never version giant arbitrary rendered SVG strings;
- personal state remains local-first;
- no GitHub-backed live user database;
- no hidden cloud synchronization;
- no automatic AI network request or provider SDK in this pass.

## Headline V2.2 architecture

Version the **logical resource**, not the workspace and not arbitrary rendered output.

A logical resource has one stable identity and immutable revisions:

```
resource
├── v1
├── v2
├── v3
└── v4 <- current
```

Existing ordinary links continue to point to the stable resource and therefore resolve to the current revision. Only an explicitly pinned historical link resolves to a specific revision.

A historical revision is read-only. Restoring an older revision must **create a new current revision**; never rewrite or erase the intervening history.

The new revision engine must be the common mutation boundary for manual edits and future AI edits. Do not build separate manual-history and AI-history systems.

## Required persistence change

V2.2 is allowed and expected to perform a real database migration:

- IndexedDB database remains named `knowledge-atlas`;
- bump raw IndexedDB version from **2 -> 3**;
- keep existing stores intact;
- add one dedicated history store, preferably a single indexed object store such as `history` containing typed `meta`, `head`, and immutable `revision` records;
- do not destructively rewrite existing content during `onupgradeneeded`;
- migration must be idempotent and recoverable if initialization is interrupted;
- V2.1 data must remain readable and must not be reset.

The implementation may choose an equivalent one-store design if it preserves the same semantics and atomicity. Do not scatter revision state through unrelated personal-state maps.

## Canonical revision semantics

At minimum define a strict, validated immutable revision record with:

- revision schema version;
- stable `revisionId`;
- stable logical `resourceId` / resource key;
- resource type;
- monotonically increasing display revision number;
- parent/base revision ID;
- created timestamp;
- source/provenance: manual, AI, import, restore, migration, release/system;
- optional summary / source detail;
- committed/draft/rejected/accepted status where applicable;
- stable content hash/fingerprint;
- canonical structured snapshot or safe asset reference;
- optional `restoredFromRevisionId` / `derivedFromRevisionId` when applicable.

Keep the current production content stores as the current-source projection if that minimizes risk, but make every versionable mutation update current content + history atomically through one versioning service. The history head and current projected content must never silently diverge.

## Versionable resource scopes

Implement versioning for all of these:

1. **Notebook page content** - stable page/block IDs.
2. **Notebook structure** - project tree structure and placed manual references, using a logical project/tree resource identity.
3. **Article** - canonical Article source/blocks/metadata/taxonomy.
4. **Cheatsheet** - canonical structured cheatsheet JSON, sheet/block/frame/style semantics.
5. **QCM** - canonical QCM JSON preserving question/option IDs.
6. **PDF logical document** - document metadata plus content-addressed asset/hash reference; do not duplicate PDF bytes per revision.

Do not version as content history:

- reading position;
- bookmarks / Read Later;
- captures;
- QCM attempts or reflections;
- pane/tab state;
- workspace layout;
- Workspace States.

Those retain their existing ownership and persistence boundaries.

## Initial-history migration

On first V2.2 use, initialize a baseline revision for every versionable logical resource in the composed current library, including bundled/imported/local resources, so future application/AI updates can be compared against the V2.2 starting point.

Requirements:

- initialization is idempotent;
- an interrupted initialization can resume safely;
- PDFs store only metadata + existing content-addressed asset identity, not duplicate bytes;
- no revision is fabricated for personal attempts/captures/reading state;
- record the V2.1.0 production/source provenance where useful;
- no runtime dependency on GitHub is introduced.

## Current vs historical targets

Preserve the existing `ResourceTarget` family. Extend it additively for explicitly pinned history, rather than inventing a parallel target type or private URI scheme.

Ordinary target:

`resource target -> current revision`

Pinned historical target:

`resource target + historyRevisionId -> exact immutable revision`

Use a clear optional field such as `historyRevisionId` on versionable target variants (or an equivalent additive field proven compatible with the existing union). Do not overload the PDF file-revision/hash field with content-history semantics.

Rules:

- old targets without the field remain valid and floating;
- copy/open historical revision can create a pinned target;
- bookmarks created while explicitly viewing history should preserve the historical revision only when the user chooses/pins that historical target;
- fallback from missing internal section/question/sheet in an old revision is visible and bounded, not silently redirected;
- exact PDF physical-page semantics remain intact.

## Version UI

Keep the UI discreet. Do not add a giant new global toolbar.

### Right rail

Add a small history/version icon to the pane-owned right rail, with an accessible tooltip/label such as `Version history`.

### Tree context menu

Add version-aware actions to versionable resources, including at minimum:

- Version history...
- Compare with previous version
- Open previous version in other pane

Do not crowd non-versionable folders/actions.

### Version history panel

Provide a compact panel/drawer showing:

- Current revision clearly;
- revision number/date/source/summary;
- AI drafts/proposals when present;
- actions: Open, Open in other pane/new tab/workspace, Compare with current, Export revision, Copy revision link, Restore as new version;
- no destructive "replace history" action.

`Restore as new version` must create the next revision and record provenance from the older source revision.

Search should use current revisions by default, with an explicit `Include historical versions` option if historical search is implemented in this pass.

## Compare integration

Reuse AtlasNote's existing A/B pane architecture. Do not create a second comparison application.

When A and B are two revisions of the same logical resource, expose a compact comparison mode selector such as:

`Changes | Side by side | A only | B only`

Default to `Changes` for an explicit version comparison. Side by side must fall back to the normal independent pane readers.

Historical revisions must be independently openable in either pane and must not mutate current content.

## Semantic diff engine

Do not default to raw JSON diffs. Raw JSON may exist under Advanced.

Create a typed semantic diff model shared by the compare UI. It should represent additions/removals/modifications/moves/renames and field changes.

Required adapters:

### Notebook page

- stable block/heading identity;
- added/removed/modified blocks;
- useful text-level highlighting inside changed blocks.

### Notebook structure

- added/removed nodes;
- rename;
- move/reparent;
- reorder where meaningful;
- placed manual-reference changes without duplicating the target resource.

### Article

- metadata/taxonomy changes;
- block changes;
- Markdown/text diff for changed textual blocks.

### Cheatsheet

- sheet/page additions/removals/moves;
- block changes by stable ID;
- diagram/content/frame/style changes at semantic field level;
- side-by-side rendered preview remains available;
- never diff giant generated SVG strings as the canonical comparison.

### QCM

- questions by stable ID;
- prompt changes;
- option add/remove/modify/reorder by stable option ID;
- correct-answer changes;
- explanation/follow-up/taxonomy changes.

### PDF

V2.2 does **not** need a full pixel-diff engine.

Implement useful comparison from:

- file SHA / byte identity;
- page count;
- metadata;
- outline/table-of-contents changes where available;
- optional selectable-text page diff on demand using the existing PDF.js engine;
- no OCR requirement;
- no automatic remote fetch;
- normal A/B reader remains the main visual comparison.

## AI / agent control plane

The second headline feature is a safe common interface so future AI can interact with all AtlasNote subsystems without bypassing product rules.

Do **not** add an OpenAI/Anthropic/provider SDK, server, FastAPI backend, WebSocket service, secret storage or automatic cloud call.

Instead add a provider-agnostic local `AgentChangeSet` / mutation-plan system.

### Core contract

An imported or future programmatic AI plan must contain:

- schema version;
- change-set ID;
- creation timestamp/source label;
- exact base revision IDs / state fingerprints;
- bounded typed operations;
- optional rationale/summary;
- no executable code or arbitrary HTML.

Create a capability manifest so an external AI can know exactly what actions and schemas AtlasNote supports.

### Required operation families

Support reviewed operations across the existing subsystems, reusing existing validators/services:

- create/update resource as a new revision;
- create AI draft revision;
- taxonomy/classification assignment;
- Notebook create/rename/move/reorder folder/page/reference operations through existing structural rules;
- add/update/remove typed resource links where safe;
- Concept/Reference proposal actions through the existing semantic review boundary rather than bypassing it;
- workspace navigation/layout proposals using the existing `ReadingDestination`, Compare and workspace APIs;
- bookmark/Read Later/capture proposal operations only as reviewed personal-state operations;
- PDF metadata/version proposal; replacing PDF bytes requires explicit user-supplied file bytes and normal PDF validation.

For V2.2, AI must **not** be allowed to silently:

- erase history;
- restore/replace a full backup;
- clear IndexedDB;
- edit QCM attempts/reflections as if they were authored content;
- delete large collections without explicit per-operation confirmation;
- publish private PDFs or backups;
- fetch arbitrary remote pages;
- auto-accept its own proposal.

### Review flow

Use a clear reviewed workflow:

`Export context/capabilities -> AI produces change set -> Import -> Validate -> Preview -> Stage -> User Accept/Reject -> Atomic Apply`

Preview is pure. Stage may create bounded draft/review metadata but must not change current content. Accepting selected content edits creates committed revisions through the same revision service used by manual editing.

If the current resource head/state changed after the AI plan was produced, mark the operation stale and block acceptance. Do not auto-merge stale AI edits.

For a multi-operation accepted batch, use atomic application where the affected existing stores permit it. If one selected operation is invalid/stale, do not partially apply selected mutations while pretending the batch succeeded.

### Future direct-agent readiness

The codebase should expose clean internal pure/service APIs for capability discovery, context export, preview and apply so a later trusted desktop/browser connector can call the same logic. Do not expose an unrestricted global write object or unauthenticated network endpoint in V2.2.

## Existing semantic AI review

The current local semantic-reference AI workflow already has revision/staleness/preview/accept concepts. Preserve it. Integrate or adapt it into the new review/control surface where useful, but do not weaken its atomicity or exact-target validation and do not create a second competing concept/reference store.

## Mutation audit requirement

Audit every current production mutation entry point for versionable content. Manual editors, drag/drop/tree operations, imports/source replacements and accepted AI changes must not bypass the versioning service.

A direct low-level store write is still allowed for non-versioned personal/session state, but content mutations must go through the new version-aware boundary.

Add tests that would fail if a major versionable edit path changes current content without creating the corresponding immutable revision.

## Backup / export / restore

History is user data and must be portable.

Implement a new backward-compatible full-backup revision:

- old V2.1 backups remain accepted;
- V2.2 backups include history metadata/heads/revisions;
- include PDF assets that are referenced only by historical PDF revisions so historical documents remain restorable;
- verify hashes and relationships before applying restore;
- restore current content + exact history consistently;
- no history loss merely because a revision is not current;
- old backup restore into V2.2 creates/initializes a valid current baseline history without fabricating past revisions.

It is acceptable to bump the full workspace backup schema to a new supported value (for example 4) while preserving readers for prior schema 2/3. Do not couple history semantics to QCM/personal schema versions unnecessarily.

Add a per-resource history export if practical, but full-backup correctness is mandatory.

## History retention / boundedness

No silent pruning.

Choose and document explicit safe limits for:

- revisions per resource;
- total revisions;
- structured history byte budget;
- AI draft count;
- operations per change set;
- imported change-set byte size.

When a limit is reached, block the new write with a clear export/manage-history path. Do not silently delete older user history.

PDF bytes remain content-addressed and must not be duplicated solely because a revision was created.

## Workspace boundary

Do not confuse Workspace States with content versioning.

Workspace States continue to capture reading sessions/layout. They may be exposed to the agent control plane for reviewed navigation/layout proposals, but they are not revision history and restoring a workspace checkpoint must never rewind:

- resource revisions/current content;
- Concept/Reference semantic state;
- captures;
- QCM attempts/reflections;
- newer AI review decisions.

## Minor V2.1 cleanup allowed

One documented V2.1 production-QA minor item may be corrected if trivial and covered by tests:

- stale Reader Guide text describing the old offline/non-React-PDF build.

Do not add CSS/workarounds for the previously removed Netlify injected badge. The badge was disabled at the Netlify project level and the final production retest passed.

A recurring Electron/ChatGPT preload MutationObserver exception was traced to the host preload environment; do not modify AtlasNote for it without new app-specific evidence.

## Tests and release gates

Preserve all current V2.1 tests and meaningful assertions.

Add focused unit, DOM/component, real-origin runtime and backup/migration tests for V2.2. At minimum prove:

- DB v2 -> v3 migration without data loss;
- idempotent interrupted baseline-history initialization;
- every resource type creates immutable revisions;
- current floating target vs pinned historical target behavior;
- restore-old-as-new revision semantics;
- Article/QCM/Cheatsheet/Notebook semantic diffs;
- PDF version metadata + A/B old/current reading;
- historical revision read-only behavior;
- AI change-set schema/security/stale checks;
- pure preview;
- atomic accepted batch;
- rejected/stale AI plan does not mutate current state;
- manual edit and AI accepted edit use the same revision engine;
- full backup with history + old PDF bytes -> fresh context -> exact restore;
- old V2.1 backup -> V2.2 compatibility;
- Workspace State restore cannot rewind content history;
- no regression of QA-01, QA-02, QA-03;
- all existing PDF component/grid/wheel/full runtime tests remain meaningful.

Run the complete existing release gate plus new V2.2 gates in a normal environment. Use Node >=22.12; use Node 24.19.0 if available, matching the final V2.1 verification environment.

Do not raise timing limits, weaken assertions, skip failing suites, or substitute a compatibility harness for durable IndexedDB/PDF evidence.

## Real-browser acceptance

If built-in browser/CDP control is available, run real browser QA against localhost after implementation. If unavailable, use the production-origin Playwright/runtime harnesses and state the limitation explicitly.

Browser QA should cover:

- version icon/panel;
- tree context-menu version actions;
- old/current open in independent panes;
- Changes/Side-by-side comparison;
- restore-as-new;
- Article/QCM/Cheatsheet/Notebook diffs;
- PDF old/current A/B;
- AI change-set import/preview/accept/reject/stale state;
- history persistence across reload/workspace switches;
- backup/fresh-context restore;
- responsive widths around 1440, 1100, 800 and 390;
- keyboard/focus/Escape;
- console/network/storage errors.

## Git / deployment behavior

This implementation handoff does not authorize production deployment.

If working in a Git repository:

- create/use a dedicated V2.2 feature branch;
- do not commit to `main` directly;
- do not merge;
- do not deploy production;
- do not overwrite or publish private PDF/user backup data.

The coordinating model/user will handle final repository integration after reviewing the returned artifacts.

## Required delivery

Return all of the following, not merely a narrative:

1. complete modified source ZIP;
2. deployable build ZIP;
3. `V22_DELIVERY_REPORT.md`;
4. `V22_ARCHITECTURE.md` with final implemented persistence/data contracts;
5. `V22_MIGRATION_AND_BACKUP.md`;
6. `V22_AI_CHANGESET_SPEC.md` with JSON examples;
7. `V22_TEST_EVIDENCE.md` with actual command results and browser/runtime evidence;
8. changed-file inventory;
9. screenshots/evidence bundle where practical;
10. exact final Git SHA/tree if Git was used.

Final report must state clearly:

- exact starting baseline;
- final source identity;
- DB migration result;
- backup compatibility result;
- versioned resource coverage;
- AI action coverage and deliberate exclusions;
- unit/runtime/browser totals;
- retries/failures retained as evidence;
- remaining blockers/limits;
- whether the result is ready for coordinator integration.

Do not stop at a plan. Implement the whole bounded V2.2 revision/agent-control foundation and return the finished artifacts.

## End-state AI operability requirement

Before implementation, also read and treat as authoritative:

- `06_AGENT_OPERABILITY/UNIVERSAL_AGENT_INTERFACE.md`
- `07_PDFATLAS/PDFATLAS_CONTRACT.md`
- `08_ARCHIVE/END_STATE_ARCHIVE_AND_RECOVERY.md`

The pass is not complete if it only adds version history and an `AgentChangeSet` type. It must make AtlasNote **agent-operable end to end** through a stable provider-neutral query/navigation/capability/review/apply contract so future AI integrations can discover resources, navigate exact targets/panes/workspaces, inspect versions, preview semantic changes and apply reviewed edits without inventing one-off subsystem writes or depending on fragile DOM scraping.

The browser UI must also retain stable accessible semantics/data IDs needed for Codex/Browser Use QA, but DOM automation is not the application data API.

## PDF Atlas requirement

Audit the existing `julian-passebecq/pdfatlas` integration rather than redesigning it. Preserve its commit-pinned, metadata-only AtlasNote integration and strict SHA-verified external fetch policy. Add version-aware provenance and drift/release checks described in `07_PDFATLAS/PDFATLAS_CONTRACT.md`. Production must never silently use mutable `/main/` URLs. Do not copy the public PDF binaries into the AtlasNote application build merely to implement history.

## Completion criterion

The intended result is the end of the major **application-foundation** work: after this pass, new AI/provider integrations should be adapters over the same stable AtlasNote capability/query/navigation/ChangeSet/revision services rather than requiring another data-model redesign. If any content subsystem still requires a hidden special-case mutation path outside that architecture, the pass is incomplete.
