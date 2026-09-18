# V2.2 Candidate — Implemented Status, Gaps and Corrections

## Implemented in the delivered source candidate

The local `AtlasNote_V2.2.0_source.zip` contains package `2.2.0` and implements the major V2.2 architecture:

- IndexedDB `knowledge-atlas` v2 -> v3 history migration with resumable baseline initialization.
- One revision engine and history model.
- Six revision adapters: Notebook page, Notebook tree/project, Article, Cheatsheet, QCM, PDF logical document.
- Optional `historyRevisionId` on current navigation target family.
- Read-only historical readers.
- Version History right-rail control and history panel.
- Open historical revision here/new tab/other pane/workspace 1–5 from the History panel.
- Semantic revision Compare with `Changes | Side by side | A only | B only`.
- Restore old snapshot as a new current revision.
- Shared manual/import/AI revision boundary.
- Provider-neutral Agent Interface and machine-readable capability registry.
- 25 supported operation kinds and reviewed preview/stage/accept/reject workflow.
- Stale base/fingerprint checks, selected-operation acceptance and audit records.
- Query, context, navigation, Compare and system-surface services.
- Schema-4 full backup/history plus schema-2/3 compatibility and historical local asset retention.
- PDFAtlas full-SHA production pin validation, vendored source-manifest provenance and byte-critical drift gate.
- History storage diagnostics/limits in Settings; no automatic pruning.
- 797/797 final unit tests passed after the candidate corrections; 82 tests were new V2.2 coverage.

## Confirmed implementation miss: tree context history actions

**Must fix before acceptance.**

`src/app/App.tsx` passes these props into `ProjectTree`:

- `onHistory`
- `onComparePrevious`
- `onOpenPrevious`

But `src/components/Tree.tsx` currently destructures them and never uses them in the rendered context menu. Therefore the required right-click actions are absent despite being in the original V2.2 spec and despite a broad delivery-report claim.

Required fix:

- add `Version history...` for versionable page/project resources;
- add `Compare with previous version` only when a previous revision exists / otherwise disabled or clearly unavailable;
- add `Open previous version in other pane` when a previous revision exists;
- preserve keyboard context-menu behavior (`ContextMenu`, `Shift+F10`), focus return and normal resource/reference actions;
- do not show these on non-versionable tree items;
- add DOM/browser tests that prove both mouse right-click and keyboard action access.

## Browser/Codex semantic hardening is only partial

Stable IDs already exist for several critical surfaces:

- tree node IDs;
- pane IDs/slots and history revision ID on panes;
- revision rows (`data-revision-id`);
- review/operation IDs;
- current resource key on panes/history panel.

However, the source currently has no `data-agent-action` and no `data-resource-type` markers, and only sparse `data-resource-id` markers. The contract made examples of these rather than requiring every control to carry them, so this is not necessarily a data-model defect. For the intended future browser/Codex reliability, the final integration pass should add a small, deliberate stable-marker vocabulary on critical controls and test it. Do not over-instrument or mirror private data.

Recommended critical markers:

- resource rows/tree targets: stable resource key/type when known;
- Version History button/action;
- history Open/Compare/Restore/Copy actions;
- Agent Review preview/stage/accept/reject;
- navigation destination/Compare controls;
- pane A/B identity and active workspace.

Accessible labels remain mandatory and are more important than CSS selectors.

## Release verification is incomplete — this is the main blocker

The implementation environment could not install the locked integrated dependency graph because registry DNS returned `EAI_AGAIN`. Chromium policy also blocked normal loopback navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`.

Therefore these are **unverified**, not passed:

- clean `npm ci` using locked production dependencies;
- integrated React/React-PDF/Vite typecheck/build;
- full original + V2.2 50-gate release run;
- real IndexedDB v2 -> v3 migration and interrupted/resumed migration in Chromium;
- reload/close/open durability;
- two-tab/concurrent race behavior in real IndexedDB;
- native old/current PDF A/B comparison and previous PDF regressions;
- full backup restore into a fresh normal-origin browser profile;
- read-only historical editor controls in real UI;
- tree context actions and keyboard operation;
- stable browser/Codex markers;
- responsive/focus/keyboard QA at required viewports.

The attempted 50-gate run was 4 PASS / 36 FAIL / 10 BLOCKED because the clean dependency installation failed first. Supplemental compatibility checks and 797 passing unit tests do not replace those gates.

## No final Git integration yet

The V2.2 candidate was built from an uploaded source ZIP with no `.git` metadata. It has no final Git commit SHA and has not been pushed, merged or deployed. Production `main` should remain V2.1.0 until final QA passes.

## PDFAtlas status

The repository/current relationship is still correct:

- PDFAtlas current/main: `fa5e83f7825cdc837078f87c5e130cb012332195`.
- AtlasNote production config pins that exact full SHA.
- PDFAtlas public `library.json` is intentionally lighter than AtlasNote reviewed enrichment.
- V2.2 formalizes the two-layer workflow with a vendored canonical source manifest, AtlasNote enrichment and a provenance/drift validator.

This is acceptable as an end-state if the maintenance workflow remains documented and gated. A future cleanup may move more canonical metadata into PDFAtlas, but runtime should not fetch mutable manifest data to change local state automatically.

## Deferred by design, not forgotten

These are intentional future features, not V2.2 defects:

- actual OpenAI/Anthropic/ChatGPT provider integration;
- MCP/desktop bridge/remote authorization layer;
- historical global search;
- OCR/pixel PDF diff;
- history pruning/garbage-collection UI;
- repository-maintenance agent for PDFAtlas publication.

The V2.2 internal interface is meant to make those future integrations thin adapters.
