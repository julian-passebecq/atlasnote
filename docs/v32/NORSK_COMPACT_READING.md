# Compact bilingual headline reading

Newspaper is the default multi-story NO/EN reading surface, with English initially
visible and its recall toggle retained. Every row keeps the source title and generated
translation aligned. The layout uses the full available main-pane width. It does not
create another pane, duplicate a resource, truncate source wording or rewrite content.

Date, view tabs and import share a compact header. Search, progress and supplied
section/topic filters share a wrapping toolbar. Vocabulary, paraphrases and optional
French are available in per-row disclosure panels. Focus remains available for one
story; its large open-study-page button is removed. Clicking a newspaper title still
opens the canonical Article. The explanatory bottom text is collapsed under About.

Row progress and Focus actions use 20px controls with accessible labels and hover
titles in an 84px action column. The reader rail is 30px wide, retaining its existing
commands and workspace slots. This releases more width for both languages.
Rows have one uniform sheet background and horizontal separators, with no alternating
blue fill. The Midnight sheet is black; the independent sheet theme remains available.

Norsk search prepares normalized headline, translation, grammar and vocabulary text
once per accepted batch. English toggles and search keystrokes reuse that read model;
changing the catalogue or progress builds a new batch. Per-story vocabulary is also
memoized for rendering. Nothing is persisted and no storage contract changes.

A local synthetic measurement of 200 stories and 40 queries returned identical
results: 35.14ms rebuilding text for each query versus 1.03ms using the prepared index,
excluding index preparation and browser rendering. These numbers measure this search
operation only, not overall application performance. A unit test verifies no repeated
block traversal and correct refresh after a translation changes.

## Verification (local integrated build)

The existing Norsk workflow passed all eight scenarios: reviewed synthetic import,
source labelling, English hide/reveal, progress, topic filtering, search, Focus,
vocabulary concepts through review, reload and native QCM navigation.

The first run exposed a test race: history writes finished before the UI acceptance
handler released its busy guard, so Close was ignored. The test now waits for the
accepted status and verifies that the review dialog closes. Its failed evidence was
retained privately alongside the passing rerun; no assertions were removed.

Five additional browser scenarios passed against ten owner-supplied titles in a
disposable local normal-origin profile. Private input and screenshots remain outside
Git. Full-width layouts have no horizontal overflow:

| Viewport | Completely visible title/translation pairs |
| --- | --- |
| 1536 × 864 | 10 |
| 1920 × 1080 | 10 |
| 1280 × 800 | 8 |

The 390 × 844 mobile layout stacks each pair without horizontal overflow. Actual
visible count varies with headline length, viewport and zoom, not physical screen size.

Vite build, online TypeScript and 14 targeted unit checks passed. This source change
is local and is not production deployment evidence.

Commands: `npm run build`, `npm run typecheck:online`,
`node --test tests/v32-web-study.test.mjs tests/norsk-daily-repair.test.mjs`,
`python tests/v3_norsk_daily.py`, `python tests/norsk_compact_runtime.py`.
