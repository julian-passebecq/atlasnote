# AtlasNote V2: using exact references

## Keep your Notebook arrangement

Continue creating/moving folders, writing logical Notebook pages, and pinning selected PDF, Cheatsheet, Article or QCM resources into Notebook. The Concept Index does not take over those folders. You can use all existing 1.2.7 features without assigning any concepts.

A Notebook page with ten screenfuls of Spark notes can have several heading/block targets. Do not create ten artificial Notebook subpages just to link sections. PDF pages use physical page numbers; Notebook sections use stable block identities.

## First useful connection

1. Open a Notebook page or a PDF/cheatsheet/QCM location. Open the right-side **Context** panel and choose **References**. The current-scope card shows the exact target being inspected.
2. Choose **Link concept / Add reference**, then **Create a concept**. For example, manually create `Spark shuffle` under IT, optionally under your own Spark concept. IDs are assigned once and retained after rename/reparent. No sample concept assignments are silently created for you.
3. Return to **Exact links**, select the concept, and choose **Link concept to this target**. Expand **Choose a different source / exact section** when you need a heading rather than the current reader anchor.
4. In the same editor, select a target resource. Use the PDF physical-page field, cheatsheet page and section controls, QCM question, or Notebook/Article section selector as appropriate. Choose **Add exact reference**.
5. Context now distinguishes **References from here**, **Referenced by / Backlinks**, and **Related by concept**. Assign the same concept to another resource to create a discoverable shared-concept relation without a manually duplicated reverse link.

The target picker also retains an advanced stable block-ID field for already-known anchors. A link-only article or external URL has no invented internal section.

## Follow a reference without losing your reader

Click a result to open it here. Double-click, Ctrl/Command-click or middle-click opens a new tab. Its action menu offers a new tab, a new tab in the other pane, or Workspace 1-5. Bookmarks and Read Later are still separate actions and lists.

Existing saved bookmarks and Read Later entries retain their strict unavailable-target behavior when a saved physical page/question is deleted. The new reference views instead offer a labeled parent fallback.

A result may show **Content changed since linking** or a missing-anchor warning. Follow the stated parent fallback, review the new source, then update the assignment/reference; AtlasNote does not pretend that an old deleted section still exists.

## Optional Notebook Reference Lens

Select Notebook and turn on **Show references in tree**. Expand **References** below a page, folder or pinned item to see virtual grouped linked resources. Whole-page expansion includes references on that logical page's sections. Exact page/section reference views remain narrower.

Turn the preference off to return to the untouched Notebook structure. Virtual rows are not filed items. Continue dragging/pinning your most important resources into real folders independently.

## Reference Explorer

From Context or a virtual expansion, choose **Open Reference Explorer**. This opens a closable system tab in the same pane. Browse the five-domain Concept Index; select a concept; filter results by content type, direction or title; inspect **Unlinked / Needs review**. Close Explorer to return to the originating reader without replacing its history or position.

There is at most one Explorer per pane and the existing five-tab limit still applies. An Explorer is not an empty slot: opening a reference in a new tab keeps Explorer available.

## Manually maintain and review links

Use **Manage concepts & review** / **Review & AI handoff**. Create or edit concept labels, aliases, related concepts and primary parent without changing IDs. Referenced concepts cannot be removed directly; deprecate them, optionally with a replacement, or explicitly unlink first.

The review queue identifies unlinked/changed exact targets. **Mark this target reviewed** records its current revision. There is no automatic content scanning in the background.

For external AI assistance: select up to 50 targets, download the JSON/Markdown review file, and pass it to the AI yourself. Ask it to return `atlas-reference-suggestions` JSON using existing concept IDs and the exact copied target/revision values. Back in the app, import, **Preview suggestions**, **Stage validated suggestions**, then **Accept selected** or **Reject selected**. Import or preview alone cannot create semantic links. A stale batch is rejected rather than partly applied. Export a fresh package after changing the relevant content or Concept Index.

The app does not call an AI service, extract full PDFs for this workflow, or upload your library. PDF excerpts, when present, are authored page metadata explicitly labeled as metadata.

## Reader controls and PDFs

The quick Book/Spread, supported Four-page and Reading mode controls are now at the right edge of each pane's tab header, beside **Show/Hide reader controls**. Hiding the detailed toolbar does not hide those shortcuts. Each Compare pane remains independent. Reclick Mode or press Escape to close its menu.

A newly opened PDF now requests Spread. A narrow pane can display one physical page while retaining Spread, so widening restores two pages. Existing saved Single/Continuous/Spread/Grid choices are retained. Natural wheel movement uses the current page/spread's available scroll range first; only continued intent at a true boundary can turn the page/group. This behavior has focused logic tests and an integrated real-wheel test extension; release verification of the actual PDF engine remains subject to FINAL_TEST_STATUS.md.

## Backup versus workspace state

Use the existing full workspace backup for the complete personal knowledge state and local sources. A saved workspace state is only a reader/session checkpoint: restoring it must not remove concepts or links added later. Export a full backup before testing a new app build or clearing completed review history.

The attached source is an unreleased implementation. Component-harness checks are not a substitute for a production build, actual IndexedDB persistence or real PDF-canvas tests.
