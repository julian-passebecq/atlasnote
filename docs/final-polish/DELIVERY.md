# AtlasNote V2.1 final polish delivery

## Source and scope

Repository: julian-passebecq/atlasnote. Required starting branch: v2.1stabmanualupload. Exact starting commit: 1151849a87c9c330c09c28319b367ba00e1101d2 (codexlightpass). Clean checkout verified before changes. Working branch: codex/atlasnote-v2.1-final-polish. No merge or production deployment.

This pass follows CODEX_LIGHT_MASTER_PROMPT.md and the supplied invariants. Root historical reports describe earlier work and are not reused as current verification evidence.

## Implemented behavior

- Article/taxonomy: composition projects existing legacy overrides into effective Article/QCM metadata, including explicit unclassification. Manager classification and visual/JSON source edits update source and the existing override in one overlay transaction. Exports, editing, Content Hub and reference taxonomy use that effective value. JSON edits refresh the manager picker. Stale source fingerprints include classification. Manual Notebook shortcut titles, placement and typed targets remain user-owned; reclassifying a source does not relocate pins or duplicate content.
- QCM: visual set title, prompts, single/multiple mode, 2–6 option rows, correct answers, per-option/global explanations, follow-up, classification, and add/remove question controls. Native required-field and answer-mode validation precedes existing canonical validation. JSON import/edit/export remains available. Existing source-edit guards protect exact links and retained question/option identities. Readers display A/B/C option labels instead of generated stable IDs.
- Capture: resolved title, taxonomy and exact destination replace target JSON. The off state explicitly says context is not attached. Returning from an Article draft respects current context/classification choices, so switching context off clears the earlier hidden target while preserving the body.
- References: resource type appears in the group heading, with compact title/destination/taxonomy/provenance rows and visible action controls. Search includes taxonomy. Untitled section labels use bounded readable text while preserving exact stable targets. Navigation handlers, focus semantics, virtual Lens rows and Explorer system tabs are unchanged.
- Affordances: visible tree drag grips, grab/grabbing cursors, Notebook destination hover/focus feedback, a 12px divider hit area, and a tooltip documenting existing arrow/Home controls. Pane ownership and resize handlers remain intact.
- Naming: browser titles and the More menu say AtlasNote V2.1. Package name/version remain knowledge-atlas 2.0.0.
- Opportunistic fix: at 390px, inherited Capture CSS stretched checkboxes to full width and overlapped Important/Remove. Narrow text fields now stack and checkboxes retain their intrinsic width. A production UI regression asserts non-overlap.

## Persistence and migration

No database/version/object-store change: knowledge-atlas remains IndexedDB version 2. No backup envelope/schema change, new persistence authority, backlink mirror, one-way migration, network service or dependency change. Existing Article/QCM metadata and optional taxonomy overrides are synchronized on explicit writes. Old contradictory data is reconciled in the derived catalogue using the established override precedence, without mutating stored/imported data merely on read. Old backups remain accepted. Personal semantic state, captures and QCM history remain outside workspace checkpoint rollback.

## Test integrity and retries

The existing classification UI assertion was intentionally changed from “embedded QCM taxonomy stays old” to equality with the effective override; that old assertion encoded the defect. All pin/source-identity assertions remain. The JSON-only rejection test now explicitly opens the JSON control. No PDF timing thresholds, assertions or suites were removed or weakened. The unchanged Content Hub runtime backup equality assertion exposed an undefined optional resourceLinks property created by the shared source-write helper. The helper now omits absent resourceLinks on write; a strict canonical-vs-JSON equality regression protects this repair.

Preparation: the default Node 21.7.1 is below requirements. Initial npm.cmd invocation still selected it despite PATH and omitted the Windows Rolldown native binding. A clean npm ci invoked through bundled Node 24.19.0 succeeded (zero reported vulnerabilities), and the normal production build succeeded. Python 3.13.1, committed requirements and Playwright Chromium were available. No offline-bootstrap fallback was used.

New runtime test development failures are retained: initial stale production build after the failed install; absent initial IndexedDB records; ambiguous dialog/background classification selector; and Playwright’s undefined-to-null transport differing from JSON backup serialization. The final test retains direct IndexedDB reads and exact equality assertions; the optional-field mismatch is repaired in production writes, rather than normalized away in the test. Manual review caught and corrected the new explanation-grid layout, protected by a width assertion.

## Manual browser inspection

Manually operated the built production app in the in-app browser at 1440×900 and 390×844, using only local synthetic demo content. Inspected QCM fields, Article/reference context, Capture, Explorer, tree grips and pane controls. Confirmed the corrected desktop explanation columns, readable wrapped labels on narrow screens, separate Important/Remove controls, visible exact PDF/QCM destinations, and keyboard divider movement to 48% then Home to 50% with separate pane content. Narrow Explorer retains independent scrolling and reachable controls. Browser viewport override was reset and the inspection tab closed afterward.

The runtime suite retains desktop/narrow screenshots and programmatically verifies explanation width, dialog overflow, Capture non-overlap, checkbox width, exact targets and restored navigation. This manual inspection is distinct from the compatibility DOM harness.

## Verification

Final aggregate release gate: **45/45 commands passed**. Full unit suite: **712/712, zero failures/skips**. New production suite: **9/9**. Existing Content Hub runtime: **12/12**, including exact backup and fresh-profile restore. See TESTS.md for every command, exit status, duration and log; FILES.md lists every changed file. Raw logs/screenshots are under docs/evidence/final-polish (ignored delivery evidence, not runtime/private user data). Only synthetic fixtures were used.

The first aggregate diagnostic completed 43/45 gates. Its unchanged Content Hub runtime backup assertion failed on the manufactured undefined resourceLinks property. Its new Capture round-trip assertion reproduced the hidden-context defect against that earlier compiled build. Both were fixed without weakening their assertions. Rebuilt targeted verification then passed 712/712 unit tests and 12/12 existing Content Hub runtime checks. The new production suite needed one setup correction: wait for the initial PDF canvas before entering page 3, then explicitly wait for page 3's canvas before Capture. The final targeted workflow passed 9/9 checks, including real IndexedDB reload and fresh-browser restore.

## Remaining concrete issue

Inherited release-review/license blocker: `audit:local` passes pinned vendor bytes and installed-version checks but its `fullDependencyLicenseAudit` reports BLOCKED because the inherited precompiled Mermaid bundle has no complete original transitive lock/SBOM. This pass does not reconstruct that bundle. The normal registry `npm audit` was actually executed and reports zero vulnerabilities; the inventory tool's generic offline-vulnerability wording does not describe that separately completed gate. No new product defect is known in the bounded pass. No future feature work is bundled into this delivery.

## Final source identity and delivery

One implementation/delivery commit is created on `codex/atlasnote-v2.1-final-polish` after the final gate. Its exact SHA, push result, clean-tree status and commit inventory are recorded in the external `delivery-manifest.json` and final response, avoiding a self-referential commit hash inside this tracked report. No main merge or production deployment is performed. The final evidence ZIP includes this report, the inventory, all final logs/screenshots, targeted verification and earlier failures. GitHub holds the complete source branch.
