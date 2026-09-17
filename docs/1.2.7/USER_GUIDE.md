# Testing the new 1.2.7 features

## Import the supplied samples

In **Article**, select **Add article** and import `examples/content-hub/article-sample.json`. Read the native Norsk transcript. **Edit / details** changes metadata or the local text; **Export source** downloads canonical JSON. **Archive resource** is reversible with **Include archived** and **Restore resource**. Link-only Articles require a safe original URL and do not fetch the website.

In **QCM**, select **New/import QCM** and import `examples/content-hub/qcm-sample.json`. Q1 is single-answer; Q2 is multiple-answer. Check or reveal the answer to see all option explanations. Try again retains the attempt history. Type a reflection, switch workspaces and revisit the same question. **Export QCM set**, **Export attempts** and **Export bounded review to AI** are local downloads. The bounded export supports JSON and Markdown.

## File resources without copying them

Each specialized manager has resource controls on the left and **Add to Notebook** on the right. Select a shared subject/folder for classification. Choose a Notebook destination and **Add reference to Notebook**, or drag the resource onto a destination folder. The reference has a type icon and its own edit button. Rename/move/remove does not delete the source. Removing a local source is a different, confirmed action and leaves dependent references unavailable.

The source's older taxonomy is retained. Missing folder matches show Unfiled. Pick the appropriate shared folder explicitly rather than recreating source data. Content selection does not switch the subject or replace reading panes.

## Dashboard and Quick Capture

Use **Dashboard** at bottom right. Its subject columns and Inbox/To-do/Quick notes/Bookmarks/Read later rows derive from shared data. Click a subject, then a folder for a scoped view. **Show more** expands a card. Use **Return to reader** to restore the previous panes and positions.

Use **Quick Capture** next to Dashboard. Link, Task and Note support one to five rows in one save. An empty row is ignored. Tasks may have a due date and important flag. Set classification only as needed; **Attach current reading context** is off by default and retains an exact PDF page, cheatsheet anchor, QCM question or native page when enabled. Article/Transcript opens a larger native editor.

Existing bookmarks and Read Later entries appear by subject without being copied. Unclassified captures have their own Dashboard section. Done tasks can be shown and reopened. Click a capture title to edit it; an archived target reached through an existing reference offers restoration.

## Exact typed links

Open a native Notebook page, then **More / Settings > Edit current page > Insert a typed resource link**. Pick an existing resource. PDF links expose physical page; cheatsheets expose physical page plus optional stable block ID; QCM exposes the exact question. Append the link and save the page. Its actions use the shared open/new-tab/other-pane/workspace/bookmark/read-later router. **Context > Related** offers the same exact-target builder.

## New cheatsheet templates

Open **New/import cheatsheet** (or **More / Settings > Import cheatsheet JSON**). Choose Summary, Architecture, Bilingual concept or Vocabulary, then **Use preset template**, **Validate source**, and **Import local cheatsheet**. These are editable starters on the unchanged native SVG grammar. Replacing already typed unsaved source requires confirmation. Existing cheatsheet rendering and source exports remain separate from these starters.

## Workspace controls

Five slots remain available at bottom right; short screens use **Choose workspace**. The safe new-workspace action selects an unused slot only. If all five are in use, it does not erase one. **Save current workspace** and **Workspace States** keep their original purpose. Reading-state restoration cannot erase newer captures, Articles, references or QCM attempts. Full backup restoration is a separate confirmed operation.

## Limits and excluded scope

There is no scraping/browser iframe, remote AI call, timer, leaderboard, code runner, recommendation engine or cloud synchronization. New content imports are private local copies. The examples are supplied fixtures, not an independently verified educational course. Export a full backup before uploading a new app version or testing on a different origin.
