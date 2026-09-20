# V2.2 completion and QA update

The coding candidate has now been tested and repaired. See
[V22_QA_REPORT.md](V22_QA_REPORT.md) for current results and the user-approved
single-ID Article/QCM scope decision. The original implementation report below
is historical: its deferred-execution statements no longer describe this QA run.

---

# V2.2 completion coding pass report

Date: 2026-09-18. Source baseline recorded by the complete handoff:
`60db2cb7504503ac416ddad940441e24f82266b1`.

**Delivery classification: source implementation candidate; all execution and
release acceptance deferred to Codex Light at the user's request.**

## Implemented in this pass

### History access across the existing application

Notebook/project/folder menus now render the three requested actions: Version
history, Compare with previous version, and Open previous version in the other
pane. PDF, Article, QCM, Cheatsheet and reference reading menus reuse the same
component. Canonical source IDs are used instead of grouping/placement IDs.
Folders resolve to the owning Notebook structure; reference menus resolve to the
referenced resource, including an explicit historical pin.

A shared history index resolves the selected revision and its immutable parent.
First versions and unavailable/wrong-resource pins disable impossible actions
with an explanation. Keyboard menus skip disabled entries with Arrow keys,
Home/End, close on Escape, and restore the trigger before opening a dialog.
The rail's History control uses an actual initialized head, not just a page name.

### Version selection, comparison and navigation

Version History now supports selecting arbitrary A/B revisions across pagination,
with Current as the default B. The existing Changes / Side by side / A only /
B only views remain. Comparison shows explicit before/after version labels and
uses A for the first requested revision, regardless of the previously active pane.
Repeated comparisons reuse active A/B tabs rather than consuming the five-tab
limit. Their Back histories and other tabs remain in the session.

Historical tabs use historical titles and a version label. Pinned startup links
resolve against their historical catalogue, including resources no longer in the
current catalogue, instead of deriving a current target first. The navigation
service resolves optional Article/QCM wrapper page IDs from canonical document
IDs and rejects invalid destination values. Missing pinned sections/questions/
sheet blocks/PDF pages cannot fall through to a parent or current resource.
Current semantic-reference views retain their existing, explicitly labeled
parent fallback.

Mounted-UI lifecycle hooks around direct agent navigation capture reader positions
before navigation and synchronize the visible route afterward. These internal
hooks add neither a hidden write API nor a provider bridge.

Restore-as-new confirmation retains the head that was actually reviewed. If the
head changes, confirmation is blocked instead of silently rebasing the restore.
Synchronous in-flight guards prevent repeated decision clicks. Clipboard failures
show a copyable pinned URL. History/version exports clearly disclose that local
PDF bytes require a full backup rather than a JSON-only history export.

### Readable structure history and semantic changes

Historical Notebook structure now has a bounded, read-only placement list with
folder indentation, stable IDs, archived metadata and explicit links to current
or pinned target content. It does not pretend that a structure revision also
rewinds every child page. Manual reference placements have a usable current view
and can be compared through the same current/historical facade.

Changes show readable scalar/label summaries and word additions/removals first;
raw structured values are optional details. Long display fragments are explicitly
marked as abbreviated; full source remains exportable. Lists are paginated or
bounded to avoid rendering entire histories at once.

### Reviewed ChangeSet safety and usability

The review dialog clears an earlier preview before importing or validating new
JSON. Invalid replacement input cannot leave a prior plan stageable. Changing
selected operations requires a matching re-preview before acceptance. Stage
retains the complete proposal; acceptance applies only the reviewed selection.
The file input supports re-importing the same file and has a one-MiB intake bound.

Accepted/rejected audit records are inspected as historical decisions rather than
revalidated against today's heads. Revision audit links and individual review
exports remain available. Operation controls no longer nest a Compare button
inside a checkbox label. Busy/decision states are explicit and operation/review
identities are stable. The context exporter includes a bounded resource picker
(maximum 20) with personal excerpts opt-in only.

The existing service keeps atomic application, stale checks and audit ownership.
Envelope validation now rejects null source snapshots, malformed restore or
cross-project base IDs, invalid capture statuses and incomplete structural
operations earlier. New/retargeted manual placements and new authored resource
links must resolve exactly; untouched pre-existing unresolved links are retained.

### Discoverable agent interface

Capability exports now include concrete payload envelopes, target variants,
destination values, structural operation shapes, direct Compare discovery,
review/module entrypoints, exact system-surface names and browser semantics.
The old placeholder documentation-fragment schema references are removed.

The export explicitly separates envelope schemas from canonical content and
cross-resource checks performed by the real validators/live preview. It does not
claim that JSON Schema alone can validate PDF rights, asset availability or stale
heads. Capability results are detached clones, so editing an exported manifest
cannot change the operation registry's validation arrays.

The 25 existing operation kinds are retained. Native tree operations take folders
or page placements. Typed manual-reference placements use the existing canonical
`resource.update` adapter on `notebook-tree:atlas.manual-references`; no parallel
reference storage or incompatible tree grammar was added.

### Portability and future regression execution

`.gitattributes` defaults text to LF, while explicitly exempting reviewed vendor
metadata and binary assets. The PDF Atlas source manifest and expected hash were
not rewritten. Node-to-Python JSON fixture protocols now request UTF-8 in three
existing browser-support/runtime files, independent of the Windows locale.

Three existing runtime selectors were scoped to their intended pane/revision-row/
active-review surface because the same stable IDs now also appear on tabs, tree
rows and audit controls. The original assertions were not removed. A new
`tests/completion-v22.test.mjs` contains 15 regression specifications and is picked
up by the existing `npm test` wildcard; `npm run test:completion` is a convenient
targeted entrypoint. **None of these tests was run in this pass.**

## Retained without architectural replacement

IndexedDB v3, history baseline migration, revision adapters, schema-2/3/4 full
backup handling, immutable asset storage, semantic references, personal/QCM-state
separation, the five workspaces, React-PDF engine and structured cheatsheet SVG
renderer continue from the supplied implementation. This pass does not rewrite
the storage engine or replace previously delivered features.

PDF Atlas keeps the supplied immutable commit
`fa5e83f7825cdc837078f87c5e130cb012332195`, reviewed source/enrichment distinction,
and reference-only rights. No new PDF source was fetched, bundled or published.
No provider SDK, MCP bridge, API key, network control server, history pruning,
global historical search or PDF OCR/pixel-diff engine was added.

## What is not claimed complete

Compilation, unit results, browser/keyboard/responsive behavior, Windows checkout
behavior and final integrated build correctness are not verified for this source.
Neither are the full non-empty v2-to-v3 migration, different-byte historical PDF
rendering, or fresh-profile schema-2/3/4 restoration acceptance cases. The code
exists; execution is explicitly the next Codex Light phase.

No new integrated or compatibility build was produced. There is no new Git
commit, remote update, main merge or production deployment. Source identity is
recorded by file hashes, not by borrowing the input commit as a final SHA.
