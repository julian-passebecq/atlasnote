# AtlasNote V2 — Pro Improvement / Stabilization Pass

## Read this first

This is a **bounded stabilization and UX improvement pass**, not a redesign.

Repository:
- `https://github.com/julian-passebecq/atlasnote`

Work only from:
- branch: `v2manualupload`
- required starting SHA: `fc41a5a5ac843f228175194b6a679867843530d8`
- PR associated with this branch: `#13`
- latest audited workflow run: `35152636306`

Before changing anything, confirm that `v2manualupload` is still at the required SHA. If the branch has moved, report the new SHA and inspect the delta before coding.

Do **not** merge to `main`.
Do **not** deploy production.
Do **not** redesign the V2 knowledge/reference architecture.
Do **not** restart the app from scratch.

The objective is to turn the current V2 preview into a stable, coherent release candidate while preserving the working PDF, cheatsheet, reference, workspace, and local-first systems.

---

# 1. Current release blocker: diagnose first

The current CI artifact shows the React-PDF four-page grid suite at **11/12 passing**.

The failing check is:

`Grid and Spread coexist in independent Compare panes and survive all-workspace restore`

The rest of the grid behavior already passed, including:
- four real PDF canvases in a 2x2 grid
- selectable text layers
- mixed-orientation layout
- page group navigation
- exact physical-page identity
- responsive fit
- rotation
- Spread/Grid reversibility
- cover handling
- wheel navigation
- bookmarks
- entering grid from a scrolled page

Therefore:

**Do not rewrite the PDF engine or grid implementation.**

First reproduce the one failing Compare/save/restore case and determine whether the fault is:
- pane state serialization,
- all-workspace snapshot serialization,
- restore ordering,
- PDF presentation state restoration,
- active pane/view identity,
- transient renderer state incorrectly included in equality,
- or the test itself asserting unstable/transient state.

Improve the test diagnostics while fixing it. A failed assertion must identify the stage and show a useful before/expected/restored diff instead of an empty error string.

Preserve the meaning of the test. Do not weaken the release gate.

---

# 2. Freeze the V2 architecture

The following are **not redesign targets**:

- canonical Notebook/source/reference separation
- typed reading targets
- explicit Notebook references
- backlinks / reference lens
- bookmarks
- Read Later
- source taxonomy
- PDF engine
- PDF metadata / companion data
- native cheatsheet JSON -> SVG rendering
- existing workspace slots
- saved workspace states
- local-first storage
- backup/restore model
- QCM attempt model
- concept/reference indexing

Only change one of these if a concrete failing test proves a defect.

---

# 3. Dashboard redesign

The current subject-by-category matrix is too sparse and visually wasteful.

Replace it with **five independent compact mini-tables**:

1. Inbox
2. To-do
3. Quick notes
4. Bookmarks
5. Read later

Each mini-table must:

- show at least **3 visible rows**, even when there are fewer than 3 real items;
- use empty UI slots for unused rows — do NOT create fake persistent records;
- preserve the existing subject filter: All / IT / Cloud / Job / KPI / Norsk;
- preserve folder scoping where applicable;
- preserve Include completed;
- stay a **derived projection** of canonical records;
- show useful compact columns appropriate to the row type;
- provide a `+` affordance at the end of each visible row / table to add the corresponding type;
- keep actions compact;
- be usable at desktop and narrow widths.

Suggested semantics:

- Inbox `+` -> Quick Capture in inbox/link mode or Article import when explicitly chosen.
- To-do `+` -> Quick Capture task.
- Quick notes `+` -> Quick Capture note.
- Bookmarks `+` -> choose/save a valid reading target; do not manufacture a shadow bookmark.
- Read later `+` -> choose/save a valid reading target.

A row must open the underlying canonical item/target.

Do not reintroduce a second Dashboard database.

### Dashboard icon toggle

The Dashboard button must behave as a real toggle:

- first click: open Dashboard
- second click while Dashboard is already active: return to the previous reader surface
- preserve pane tabs, active pane, active document, scroll/reading position, compare state, and workspace state

---

# 4. Top-left ribbon ownership

Freeze the top-left navigation order as:

`[Sidebar] [Search] [Back] [Forward] | [+ Quick Capture] [Dashboard] [Compare]`

Requirements:

- Quick Capture `+` sits immediately next to Dashboard.
- Dashboard sits immediately left of Compare.
- Compare remains selected/active while two panes exist.
- Remove Focus from the top-left ribbon.
- Do not duplicate Dashboard or Quick Capture on the right rail.
- Back/Forward must keep their current active-tab history semantics.
- Sidebar collapse remains obvious and accessible.

---

# 5. Right reader rail ownership

The right rail should become:

1. Focus
2. Context
3. Swap panes — only when Compare is active
4. separator
5. Bookmarks
6. Read later
7. separator
8. Export
9. Theme
10. Settings
11. spacer
12. New/unused workspace `+`
13. Workspace 1
14. Workspace 2
15. Workspace 3
16. Workspace 4
17. Workspace 5
18. Save current workspace
19. Workspace States

Requirements:

- Focus moves here and sits **above Context**.
- Dashboard and Quick Capture leave this rail.
- `+ New workspace` moves **above Workspace 1**.
- Swap is hidden when only one pane exists.
- Focus must preserve the current actual fullscreen/focus behavior and Escape exit.
- Right-rail buttons must not silently reset the active pane.

---

# 6. Pane A/B collapse UX

The current A/B collapse is technically functional but visually awkward.

Use a consistent directional grammar:

Expanded A collapse:
`A ‹`

Collapsed A restore:
`A ›`

Expanded B collapse:
`› B`

Collapsed B restore:
`‹ B`

Requirements:

- the arrow indicates the direction of movement;
- the whole collapsed strip is clickable;
- collapsed strip is wide enough for the letter + arrow without cramped rendering;
- active pane indication remains visually stronger;
- no meaningless A badge in single-pane mode;
- collapsing/restoring never closes tabs or mutates document history;
- responsive/mobile pane switching remains intact.

---

# 7. Resource libraries: drag/drop becomes primary

Affected source types:

- PDF
- Cheatsheet
- Article
- QCM

The current central manager relies too much on a `Selected resource` dropdown.

## New primary flow

The actual left resource tree must be a real drag source.

Create one shared, validated typed drag payload for resources.

Dragging a resource from the left tree must support:

### A. Drop into central visual workspace
This selects/loads that resource into the resource-management workspace.

The empty state should say clearly:

`Drop a resource from the tree`

Keep a compact keyboard-accessible `Choose resource` / Browse fallback. Drag/drop cannot be the only path.

### B. Drop directly onto a Notebook folder
Create an explicit Notebook reference to the original resource.

Never move or duplicate the original source.

### C. Optional upper-right interaction drop target
If retained, this may expose existing actions such as:
- Open
- Open in other pane
- Reading actions

Do not invent a parallel content model.

### Security / validation

- cap drag payload size
- validate the reading/resource target before mutation
- reject malformed JSON/payloads
- do not trust arbitrary HTML/data
- preserve reference integrity

---

# 8. Resource manager layout

Reorganize the manager so the drag path is intuitive.

Preferred desktop structure:

- existing resource tree remains on far left
- **Add to Notebook** panel is on the left side of the management surface
- central/right area is the resource workspace

The Notebook target panel must remain explicit that it creates a reference to the original.

Do not require users to choose the same source again in a large select list after they already selected or dragged it from the tree.

---

# 9. Visual / JSON resource modes

For PDF metadata, Cheatsheets, Articles, and QCMs provide a coherent:

`Visual | JSON`

mode switch in the management workspace.

JSON mode should support the canonical safe representation for that type.

Required actions where appropriate:

- Copy JSON
- Export JSON
- Import / Replace JSON
- Apply validated JSON

Rules:

- malformed JSON -> no mutation
- schema validation failure -> no mutation
- invalid reading targets -> no mutation
- preserve stable IDs unless the import workflow explicitly creates a new resource
- do not silently break references
- do not expose unsafe remote HTML fetching

PDF JSON mode is metadata/companion metadata only; do not serialize the binary PDF into the editor.

---

# 10. Quick Capture

Quick Capture currently starts with one row.

Change it to:

- exactly **3 visible rows initially**
- maximum 5 rows
- never allow visible draft rows below 3
- empty rows are still ignored on save
- preserve one-save multi-row workflow

Keep:
- Link
- Task
- Note
- Article
- Transcript

---

# 11. Quick Capture -> Article / Transcript back navigation

Current bug: choosing Article/Transcript replaces the Quick Capture modal and destroys its local draft state.

Fix this.

Required behavior:

1. User opens Quick Capture.
2. User enters data / classification / context choices.
3. User selects Article or Transcript.
4. Article editor opens.
5. Article editor has `Back to Quick Capture`.
6. Clicking Back restores:
   - all Quick Capture rows
   - selected capture mode
   - taxonomy
   - attach-current-context choice
   - any other unsaved Quick Capture draft values
7. Saving Article finishes the flow normally.
8. Cancel semantics must be explicit and must not accidentally persist a partial capture.

This should be implemented as explicit parent workflow state, not browser-history hacks.

---

# 12. Article editor simplification

The Article modal currently puts too much metadata before the body.

Make the default editing flow content-first.

Visible by default near the top:

- Title
- Source URL
- Classification
- Article/transcript body

Move secondary metadata into an `Advanced / JSON` disclosure area:

- Publisher
- Source type
- Article status
- Important
- canonical JSON editor/import
- personal metadata that is not needed for the primary writing flow

Keep existing validation and structured-block preservation.

Editing an existing article must still allow Export source.

---

# 13. Theme regression: reproduce live, do not rewrite themes

The DOM test harness currently verifies five distinct themes and the source updates `document.documentElement.dataset.theme`.

So this is not a license to replace the theme engine.

Reproduce the reported live/preview problem and test theme switching on:

- Reader
- Dashboard
- PDF library manager
- Cheatsheet library manager
- Article library manager
- QCM library manager
- Quick Capture modal
- Article modal
- Context panel
- Saved states
- narrow/mobile viewport
- reload on the real hosted origin

Acceptance:

- all five themes visibly differ
- theme persists after reload
- no surface remains accidentally light-only in Dark Slate
- switching theme does not mutate reading/workspace state

---

# 14. Demo / fake test data

The V2 preview is too empty for practical manual QA.

Add an **explicit, deterministic, optional Demo/Test dataset**.

It must not silently contaminate real user data.

Provide:
- Load demo data
- Reset/remove demo data

Include enough realistic records to exercise all major paths:

- Inbox items across multiple subjects
- To-do items including due dates and Important
- Quick notes
- Bookmarks
- Read Later
- at least 3 Articles
- at least 3 QCM resources
- at least 3 Cheatsheets or existing sample cheatsheets wired into demo taxonomy
- several PDF/resource references where fixtures already exist
- Notebook references
- overlapping references so `Show references in tree` can be tested
- at least one archived item
- at least one completed item

### Fake QCM quality

Provide realistic data-engineering QCMs, not placeholder lorem ipsum.

At minimum include questions covering several of:
- SQL joins / windows
- PySpark shuffle / partitions
- Azure Data Factory
- Microsoft Fabric
- dbt fundamentals
- data modeling

Each QCM should have:
- question
- options
- correct answer
- explanation
- optional source/reference target when the schema supports it

Do not change the QCM schema only to create demo content.

---

# 15. Preserve useful V2 behaviors

Do not remove:

- `Show references in tree`
- explicit source vs Notebook reference distinction
- reading actions
- source actions
- per-pane independent reading state
- cheatsheet single/spread/grid
- PDF single/continuous/spread/grid
- PDF companion/study tree
- bookmark restoration
- Read Later
- active-pane tree markers
- saved states
- import/export/backup
- keyboard access
- responsive behavior

---

# 16. Version cleanup

`package.json` is already V2 / `2.0.0`.

Audit user-visible text for stale `1.2.x` branding, especially settings/about text.

Use consistent V2 branding.

Do not change package version away from 2.0.0 unless there is a specific release reason.

---

# 17. Required tests

Run the existing release gates and add focused regression coverage for the new behavior.

At minimum run:

```bash
npm run test
npm run test:dom
npm run test:hardening:ui
npm run test:reader:ui
npm run test:compact:ui
npm run test:finish:ui
npm run test:finish:integrated
npm run test:workspaces:ui
npm run test:workspaces:runtime
npm run test:simplified:ui
npm run test:savedstates:runtime
npm run test:reading:ui
npm run test:reading:runtime
npm run test:pdf:component
npm run test:pdf:grid
npm run test:pdf:wheel
npm run test:cheatsheets
npm run test:cheatsheets:ui
npm run test:cheatsheets:runtime
npm run test:content-hub:ui
npm run test:content-hub:runtime
npm run test:references
npm run test:references:ui
npm run test:references:runtime
npm run test:interviews
npm run test:headers
npm run typecheck
npm run typecheck:online
npm run build
npm run check:release
```

Also run any relevant PDF authoring/library validation gates used by CI.

## Add focused regression tests for:

- Dashboard second-click closes/toggles back to reader.
- Dashboard five independent mini-tables.
- Each mini-table renders at least 3 visible rows/slots.
- Empty UI slots do not create persistence records.
- Dashboard `+` actions route to the correct canonical workflow.
- Quick Capture initially renders 3 rows.
- Quick Capture cannot visually drop below 3 rows.
- Quick Capture Article -> Back restores the unsaved draft exactly.
- Top-left icon order.
- Focus exists on right rail and no longer on top-left.
- Dashboard/Quick Capture no longer duplicated on right rail.
- New workspace `+` appears before workspace 1.
- A/B directional collapse/restore icons.
- Tree resource drag payload for PDF/Cheatsheet/Article/QCM.
- Drop into resource workspace selects the resource.
- Drop onto Notebook folder creates a reference, not a moved source.
- malformed drag payload is rejected.
- JSON apply rejects malformed/invalid source data before mutation.
- Visual/JSON mode preserves current selected resource.
- live-origin theme persistence after reload if feasible in the existing real-origin harness.
- demo data load/reset is deterministic and non-destructive to unrelated user data.
- PDF Compare grid/spread survives all-workspace save/restore with useful failure diagnostics.

---

# 18. Accessibility and responsive requirements

Do not make drag/drop mouse-only.

All new actions require keyboard-accessible equivalents.

Maintain:
- meaningful aria-labels
- focus return after modal/popover close
- Escape behavior
- visible focus state
- no horizontal document overflow at supported mobile widths
- context drawer overlay behavior
- keyboard Compare/pane behavior

Test at least:
- 390x844
- 1366x768
- 1440x900
- 1920x1080

---

# 19. Scope discipline

Do not spend this pass on speculative features.

Do not:
- add cloud sync
- add authentication
- change persistence technology
- rewrite React-PDF
- replace the taxonomy system
- replace the Notebook/reference model
- rewrite native cheatsheets
- add an AI backend
- add server infrastructure
- merge to main
- deploy production

Prefer small coherent refactors over parallel implementations.

Delete obsolete UI only when its replacement is implemented and tested.

---

# 20. Git / delivery rules

Work only on:

`v2manualupload`

Start from:

`fc41a5a5ac843f228175194b6a679867843530d8`

Push commits only to that branch.

Do not merge PR #13.
Do not deploy Netlify production.

If the branch moved before you begin, stop and report the new head + diff instead of silently coding against a different base.

Keep commits reasonably bounded by concern.

---

# 21. Final report required

Return exactly enough evidence to let the coordinating model decide whether V2 can move to final release review.

Use this structure:

```text
AtlasNote V2 stabilization pass

Starting SHA:
Final SHA:

Root causes fixed:
1.
2.
3.

UX changes:
- Dashboard:
- Resource drag/drop:
- Visual/JSON manager:
- Quick Capture:
- Article flow:
- Ribbon/right rail:
- A/B collapse:
- Themes:
- Demo/QCM data:
- Version cleanup:

PDF Compare restore root cause:
Fix:
Diagnostic test improvement:

Files changed:

New/updated tests:

Release gates:
test =
test:dom =
test:hardening:ui =
test:reader:ui =
test:compact:ui =
test:finish:ui =
test:finish:integrated =
test:workspaces:ui =
test:workspaces:runtime =
test:simplified:ui =
test:savedstates:runtime =
test:reading:ui =
test:reading:runtime =
test:pdf:component =
test:pdf:grid =
test:pdf:wheel =
test:cheatsheets =
test:cheatsheets:ui =
test:cheatsheets:runtime =
test:content-hub:ui =
test:content-hub:runtime =
test:references =
test:references:ui =
test:references:runtime =
test:interviews =
test:headers =
typecheck =
typecheck:online =
build =
check:release =

Manual browser checks:
390x844 =
1366x768 =
1440x900 =
1920x1080 =

Theme live-origin/reload check =

Pushed to v2manualupload: YES/NO
Merged: NO
Production deployed: NO

Remaining blockers:
```

Do not call the release stable if a required gate is red.
