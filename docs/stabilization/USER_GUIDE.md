# Using the stabilized V2 interface

## Dashboard and capture

Use the Dashboard ribbon button to open Inbox, To-do, Quick notes, Bookmarks and Read later as five separate mini-tables. Click it again to return to the existing readers. Each table reserves at least three visible rows. Empty slots are not saved records. Subject and folder filters, completed-item visibility and Show more remain available.

The row/table plus action opens the corresponding capture type or a valid reading-target picker. Bookmarks and Read later stay in their existing canonical stores.

Quick Capture begins with three rows and can grow to five. All-empty rows are ignored on save. You may switch Link/Task/Note without throwing away hidden draft fields. Article and Transcript open a content-first editor. **Back to Quick Capture** restores the unsaved capture rows, mode, classification and opt-in reading context. The Article draft is also retained when returning to it. **Cancel** discards the workflow without saving a partial capture. Saving the Article completes that flow; it does not silently save unrelated capture rows.

## Resource management

Choose PDF, Cheatsheet, Article or QCM. The left tree remains the source library. Drag a resource into the central **Drop a resource from the tree** area, use the tree's **Manage resource** action, or expand **Choose resource** for the keyboard alternative.

The management surface places **Add to Notebook** on its left. Select a destination and add a reference to the original source. You may also drag a typed resource onto a Notebook folder. This does not move or duplicate the library source.

**Visual | JSON** retains the selected resource. Copy JSON and Export JSON use its safe source form. A file selected for Import / Replace JSON is staged; it is not applied until **Apply validated JSON** succeeds. Malformed input, unsafe fields, stale edits, invalid exact links, and changes that would break currently exact references are rejected before mutation. Preserve stable page, sheet, block, question and option identifiers. PDF JSON is document/companion metadata only. Binary identity, file revision, rights and page count are read-only.

Article title, URL, classification and body are visible first. Expand **Advanced / JSON** for publisher, type, reading state, importance, other secondary fields, and canonical JSON. Existing structured blocks are retained rather than flattened implicitly.

## Pane controls and navigation

The top ribbon is Sidebar / Search / Back / Forward / Quick Capture / Dashboard / Compare. Focus is at the top of the right rail, above Context. Swap appears only while Compare exists. The unused-workspace plus precedes Workspace 1. These controls do not add a sixth workspace or reset other panes.

Pane A collapses with `A <` and restores with `A >`; pane B collapses with `> B` and restores with `< B`. The entire widened collapsed strip is clickable. Mobile keeps the existing pane switcher. Book/Spread/Grid remain independent from Compare; PDF Spread shows two physical pages of one document, not two independent panes.

## Optional demo and safe cleanup

Open Dashboard's demo disclosure and choose **Load demo data**. The deterministic examples include five subject notebooks, three Articles, three QCM resources with seven explained data-engineering questions, existing cheatsheets in demo taxonomy, PDF references, captures, reading lists, completed/archive examples and overlapping concepts. No network request or personal content publication is needed.

Load is idempotent. The cleanup command removes only unchanged, identifiable demo-owned records. A demo source that you edited, bookmarked, opened in a retained workspace/saved state, referenced, or used for retained QCM attempts can be kept. Its dependent context is protected as needed. A message explains retained items. This conservative behavior is deliberate; cleanup is not a hard reset of all your data.

## Themes and backups

Five theme choices remain in Theme. Dark Slate uses the same tokens in the new tables, JSON areas and modals. The delivery tested visual differences and theme-only session changes in the DOM harness; actual-origin reload is still a required release check. Use the existing full backup before migrating real personal content. Workspace States stores reader arrangements, not a rewind of newer shared sources, concepts, captures or attempts.
