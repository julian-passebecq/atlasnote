# V2.2 acceptance and release gates

## Baseline gate

Before editing, prove the supplied source is the V2.1.0 production baseline at commit `b50c27a987fa65eee1c51d36225908621e322da7` or, if Git metadata is unavailable, prove package `2.1.0` and the expected release-blocker/final-polish files are present.

## Migration gates

1. Existing V2.1 IndexedDB v2 profile -> open V2.2 -> DB v3 without loss.
2. Existing imports, overlays, personal state and assets remain byte/semantic equivalent.
3. Baseline history initialization completes and creates exactly one baseline revision per versionable logical resource.
4. Interrupt initialization mid-way; reload; initialization resumes/idempotently completes without duplicates.
5. Old V2.1 backup schema 2/3 -> restore into V2.2 -> valid current content + initialized baseline history.

## Revision core gates

For Notebook page/tree, Article, Cheatsheet, QCM and PDF:

- manual mutation creates a new immutable revision;
- current head advances exactly once;
- old revision remains readable after reload;
- ordinary target resolves current;
- pinned target resolves historical;
- historical view cannot be edited in place;
- restore old version creates a new revision rather than moving/deleting history;
- unchanged no-op edit does not create meaningless duplicate revision unless explicitly designed/documented;
- content hash/head/current-source coherence is validated.

## Semantic diff gates

- Notebook block edit/add/remove.
- Notebook rename/move/reorder.
- Article metadata/taxonomy/text change.
- Cheatsheet sheet/block/diagram change without diffing generated SVG source.
- QCM question/option/correct-answer/explanation change preserving IDs.
- PDF file/hash/page count/metadata/outline change; optional text diff when selectable text is available.

## Compare gates

- current vs previous defaults to Changes;
- Side by side uses existing A/B readers;
- A/B locations remain independent;
- current and historical revision can coexist in two panes;
- collapse/restore/Dashboard/workspace switching does not rewrite revision identity;
- PDF physical-page behavior and existing wheel/Continuous/Spread/grid gates remain green.

## AI control-plane gates

- capability manifest export is valid and bounded;
- context export includes exact target + current revision/fingerprint;
- malformed/oversized/prototype-bearing/unknown operations rejected;
- preview performs no durable mutation;
- stage does not change current content;
- accepted valid content proposal creates a revision through the same service as manual editing;
- stale base revision blocks acceptance;
- multi-op selected batch is atomic;
- rejected/stale proposal cannot partially mutate current state;
- AI cannot call backup restore/reset/history erase/QCM-attempt rewrite;
- semantic reference proposal keeps current exact-target/staleness rules.

## Backup gates

- V2.2 full backup includes current state + complete history;
- old historical PDF asset still restores even if not current;
- fresh browser context restore reproduces heads/revisions/current content exactly;
- corrupt history hash, missing historical PDF asset, duplicate revision ID, invalid parent/head relation all fail closed before mutation;
- workspace checkpoint restore after newer content revisions does not rewind the resource head/history.

## Regression gates

Keep all V2.1 meaningful gates, including:

- Article canonical JSON/classification regression;
- QCM Multiple-answer regression;
- real embedded PDF page-2 annotation regression;
- PDF component/grid/wheel/full runtime;
- workspace/saved-state/runtime;
- references/final-polish/runtime;
- backup diagnostic;
- security headers;
- npm audit and local inventory checks.

Do not weaken timeouts/assertions to obtain a pass.

## Browser matrix

At minimum inspect:

- 1440x900
- 1100x800
- 800x900
- 390x844

Surfaces:

- Version history panel
- Tree context menu
- Changes compare
- Side-by-side Compare
- AI change review
- Article/QCM editor after versioning
- PDF current/history compare
- Settings backup/history controls

Keyboard sample:

- Tab / Shift+Tab
- Escape
- version history action menus
- Compare mode switch
- open revision in other pane/workspace

Console/network/storage: retain evidence of warnings/errors/failed requests/IndexedDB errors.

## Delivery verdict

A final report may say `READY FOR COORDINATOR INTEGRATION` only if migration, revision core, backup/history restore and the complete old+new release gate are green. Browser limitations must be stated rather than converted into passes.

## Universal agent navigation/discovery gates

Using only the new agent-facing internal contract (not direct component imports or IndexedDB writes), prove a synthetic agent can:

- enumerate capabilities and their limits;
- list/filter resources by content type/subject/taxonomy;
- resolve current exact target and current revision;
- list/open historical revisions;
- navigate here/new tab/other pane/workspace 1-5;
- enter revision Compare and switch Changes/side-by-side;
- open Version History and Reference Explorer through existing system navigation;
- retrieve bounded canonical content/context for Notebook, Article, Cheatsheet, QCM and PDF;
- preview/stage/accept one supported operation in every authored-content subsystem;
- perform supported Notebook tree mutation through the same ChangeSet orchestrator;
- perform one reviewed personal-state action such as bookmark/capture without turning it into content history;
- reject unsupported or forbidden operations with a specific error.

No agent test may pass by importing the database module and mutating stores directly.

## Stable Browser Use semantics gates

Real-browser QA must verify stable roles/accessible names or explicit data identity for:

- resource/tree nodes;
- pane A/B;
- workspace 1-5;
- Version History action and revision rows;
- historical/current revision identity;
- Agent Review operations and accept/reject controls;
- Compare mode selector.

The entire private database must not be mirrored into hidden DOM for automation.

## PDF Atlas V2.2 gates

- configured production PDF Atlas base URL is a full 40-character commit SHA, not `/main/`;
- source manifest critical byte fields are checked against the reviewed vendored snapshot at the configured commit;
- stable logical PDF ID, source commit, PDF SHA and AtlasNote history revision are distinct and preserved;
- creating a new PDF revision leaves the old commit-pinned URL/hash readable as historical state;
- current vs historical PDF A/B comparison works without bundling the external PDF bytes into the app;
- strict external fetch policy remains credential-free, redirect-rejecting, bounded and SHA-verified;
- rights status/attribution remains explicit and is never upgraded by AI inference.
