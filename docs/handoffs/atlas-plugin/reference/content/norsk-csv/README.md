# Norsk CSV study sheets

Ten owner-authorized lexical selections from the supplied study workbooks:
1,449 entries, A2 daily life/work/technology, B1 work/economy, B2
transport/energy, nature/climate, politics/society, essay connectors,
verb forms and noun forms. The source index records exact workbook and worksheet
names. These are source study notes, not independently verified dictionary entries.
The six B1/B2 thematic and writing selections also retain 808 original Norsk explanations
and their paired English translations, requested by the owner on 2026-10-06.
Textbook passages and exam examples are excluded from this public selection.
The original ZIPs and complete translations are not published.

## In AtlasNote

Choose **Norsk → Notebook → Norsk vocabulary and grammar**. The tree is arranged
by level, theme and grammar/writing. Norsk tables with source relation fields start
with Norsk, English, Synonyms and Antonyms; other tables start with three columns.
**Columns** shows/hides translations, inflections and other fields. **NO / EN**
aligns the first two columns; **Lines** puts the Norwegian entry in bold above
its translation. These are personal reading preferences, independent in panes
A/B; source data and printable tables stay complete.

**Words** keeps Norsk, English and available source synonyms/antonyms while hiding
Forms and Type in one click, retaining the current layout, sort and grouping.
Norsk reading labels show en/ei/et or å when an explicit source form provides it;
missing grammar is never guessed. Source CSVs, stored table cells and exports stay
unchanged. The app reads converted tables from its local workspace, not a live Git CSV.

**Explain** selects a two-column reading view: word, translation, Norsk explanation,
English explanation, then **Syn / Ant**. Norsk relation text is bold; parenthesized
translations stay plain. **Words** returns to the shorter vocabulary view.
**Columns** can hide either explanation independently. Source cells, headings and print
remain complete and unchanged. The reviewed 1.2.0 source pack supplies explanations;
the existing history engine appends source revisions on update. Local authored edits
retain their ownership; display preferences alone cannot add missing content.

**2 columns / 3 columns** displays several entries across the reading pane.
**CSV rows** uses one compact line per source row. Long cells are visually shortened;
hover to read their full text, or switch to **Table / Explain** for wrapped reading.
**Search** searches all source columns or one chosen column: enter text and press
**Apply** or Enter. Search is temporary, local to this reader pane and this 40-row page;
it resets on reload or reopening the note. It does not write content or history.
**Views & sort → Group** provides collapsible source categories, word classes and
alphabet headings. **Theme → word class** uses the existing Category and Type fields;
**Theme → subcategory** appears only when a CSV has an explicit Subcategory field.
Fold choices are personal pane/view preferences; **Expand all** restores visible groups.
Print always includes all original rows/columns, independent of search and collapsed groups.
**Views & sort** provides one-click Reading, Alphabet, Categories,
Synonyms / opposites and Grammar presets where those fields exist. You can also
sort the current page by Norsk A–Z/Z–A or English A–Z, or group by letter,
theme (the A2 source categories) or word class. Norwegian Æ/Ø/Å are supported.
Missing synonyms/antonyms remain empty; these views do not generate translations.
All sorting/grouping is limited to the current 40-row source page.

For a personal file: **Workspace settings → Choose CSV → Confirm library import**.
CSV imports stay private in this browser's IndexedDB and its canonical history.
The original file is not retained as an attachment; all parsed cells are retained
in native Notebook table blocks and included in workspace backups. Nothing is
uploaded to GitHub. Use a UTF-8 CSV with column headings, comma/semicolon/tab
delimiter, correctly quoted multiline cells and consistent column counts.
For bilingual study put Norsk first and English second. Limits: 2 MB, 5,000 rows,
32 columns. Pages contain at most 40 source rows; the existing Book renderer
further paginates them into screen-sized sheets.

## Updating repository sources

Edit the ten CSVs, advance the version in `index.json`, then run:

```powershell
node tools/generate-norsk-csv.mjs
node tools/generate-norsk-csv.mjs --check
```

Review the output and its semantic SHA before updating `content/publication-review.json`.
This generator never grants publication approval or changes the review hash.

For a different organized selection, provide an index with `id`, `version`,
`title` and `sheets` (`id`, `title`, `folder`, `file`), then:

```powershell
node tools/csv-to-atlas.mjs path/to/index.json private-workspace
npm run pack:local -- private-workspace norsk.private.zip
```

The reusable converter defaults to private. Git stores reviewed public sources;
the app bundles their converted tables. Local imports remain device-local.
There is no Git polling or cloud synchronization.
CSV tables offer **Colors** independently of their reading layout: Black (default), Ocean, Forest and Warm paper. Choices belong to the current page/view and survive reload; A and B can use different palettes. **Dictionary** aligns the selected source columns in compact rows; **Tiles** presents bordered cards that adapt to narrow panes. Existing two/three-column, bilingual and stacked layouts remain available. Print uses the complete source table.

### Compact Norsk default (2026-10-08)
New Norsk views start in **List**; existing explicit layout choices are retained.
**List**, **NO / EN** and **Lines** stay on the toolbar; additional layouts are in
**More layouts**. Search and organization controls wrap together as pane width permits.
Category headers are neutral, with compact nested word-class labels and no row underlines.
Norsk has a dedicated **Show Norsk controls / Hide Norsk controls** button that
toggles the table toolbar independently of the PDF/general reader controls. Entirely empty secondary columns are hidden by default unless explicitly
selected, and empty secondary cells do not occupy space in stacked/card views.
This consolidates the reading controls, not the authored CSVs or their 40-row pages.
Missing lexical relations are not generated or presented as verified dictionary content.
