# Fixture provenance and reconstruction limits

## What the user supplied

`AtlasNote_1.2.6_Pro_Handoff(1).zip` contains the start instructions, product direction, TEST_PACK, full implementation prompt, release-status note, and **seven** PNG previews. It contains **no canonical document JSON, no original formal grammar/schema, no reference-renderer.py, and no SVG originals**. SQL, PySpark and pandas each have both page previews. Azure Data Factory has **page 2 only**; page 1's preview is absent.

The implementation prompt expressly permits compatible structured fixtures from TEST_PACK and previews when original JSON is unavailable. That fallback was used. There is no OCR/generated-image dependency at runtime, and no source preview is embedded in any native document. The original text reference files are preserved in `docs/1.2.6/reference` for future review.

## Source-derived structure

| Document | Physical pages | Sections retained | Structured blocks |
|---|---:|---|---:|
| SQL for Analytics | 2 | Query order; WHERE/HAVING; grain; joins; windows; ranking; LAG/LEAD; CTEs | 41 |
| PySpark Execution Model | 2 | DataFrame/RDD; laziness; transformations/actions; job/stage/task; shuffle; partitions; cache/persist; tuning | 37 |
| Azure Data Factory | 2 | Object model; linked service/dataset; pipeline/activity; triggers; copy; parameterization; monitoring; traps | 35 |
| pandas Essentials | 2 | Loading; selection/filtering; groupby; merge; missing values; pivot; apply/vectorized; performance | 37 |
| Total | 8 | 32 sections | 150 |

The total includes two nested graph blocks inside the Spark dependency box. There are 148 top-level blocks. Inventory: **68 text, 32 list, 16 table, 14 code, 12 box, 8 diagram**. There are **zero drawing, image or icon fallbacks** in the four bundled documents. The registry/drawing kinds are implemented and covered by separate unit fixtures, not required to disguise missing semantic content.

All eight diagrams preserve their graph/sequence intent: SQL query-order chain; Spark plan chain, job/stage/task and the two narrow/wide graphs; ADF object chain and copy steps; pandas split/apply/combine. Graph nodes use baked frames; arrows meet the true node extents. The two nested Spark diagrams remain separate graph blocks inside one note box.

## Explicit reconstruction decisions

ADF page 1 is a new structured reconstruction from TEST_PACK's outline and diagram/table specifications, not an exact transcription of an unseen preview. Its document provenance and visible page caption say so. The parameterized dataset snippet is explicitly labeled an illustrative excerpt, not a complete deployable dataset definition.

SQL's TEST_PACK specifies five join rows, while its supplied preview shows four. The structured fixture adds the RIGHT counterpart to satisfy that explicit table requirement. No other new subject/category was introduced. List items are grouped in one block per section, so reconstructing the block inventory does not reproduce the absent original author's grouping decisions.

The revised visual brief overrides the reference slogan footers and compact layout. Those slogans were deliberately omitted; blocks were redistributed over the page, typography/line spacing were refined, table height used for breathing room, and colors made restrained. Fixed geometry is new authoring, not recovery of absent exact coordinates.

The original documentation reports 153 blocks, but its listed type inventory sums to 168 (75+43+16+14+12+8). It also reports 564/564 text fragments without supplying the original source or renderer needed to recompute that denominator. These inconsistent/unavailable metrics were not silently adopted as implementation evidence.

## Actual measured rendering evidence

The 1.2.6 Chromium checks inspect the eight rendered application pages and recover **479/479 nonempty canonical semantic text fields** as live SVG text, with permitted normalization of tabs to four spaces and omission of U+200B. The actual pages contain **589 SVG text elements and 805 innermost text-run fragments**. These are different, explicitly defined measurements; none is advertised as reproducing the absent 564-fragment originals.

The generator reports zero overflow diagnostics on all eight pages. Browser checks verify 1200 x 1600 viewBoxes, unique DOM IDs, no forbidden elements or raster pages, and actual text bounds inside allocated frames (2 logical-pixel tolerance for glyph ink bearings). All eight pages were also visually inspected in the app; responsive, four-page-grid and interview-Compare screenshots are in the external evidence package. This is not a cross-platform font-reproducibility certificate.

## Educational accuracy boundary

The user requested that this pass preserve TEST_PACK terminology and preview content rather than replace it with generic subject knowledge. Accordingly, the fixture narratives, examples, rules of thumb and version/dialect assertions are source-derived. They have **not** been independently verified against current vendor documentation, executed against databases, benchmarked, or certified as deployment guidance. For example, source-specific performance ratios, Spark defaults, SQL dialect generalizations and ADF service limitations remain reference material requiring a separate content review before treating them as universal claims.

Do not silently correct educational content during a renderer-only change. Any later correction should identify the original statement, its source, the verified replacement and the affected canonical fixture, then regenerate and review the publication hash.

## Ownership and delivery

Only text references, application-owned code, reconstructed canonical data and generic Atlas assets are in the implementation. No private library, downloaded vendor logos, font files, credentials or user workspace is included. Synthetic backup fixtures in the evidence package are test-only. The optional fifth cheatsheet was not added; the required four-document scope was prioritized.
