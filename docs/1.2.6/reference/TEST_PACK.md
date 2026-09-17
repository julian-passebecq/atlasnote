# AtlasNote cheatsheet test pack

Four documents, two pages each, authored in **cheatsheet grammar 1.1** and rendered
with `reference-renderer.py`. No new document model, no new block kinds.

| # | Document | id | Pages | Blocks |
|---|---|---|---|---|
| 1 | SQL for Analytics | `sql-analytics` | 2 | 42 |
| 2 | PySpark Execution Model | `pyspark-execution` | 2 | 36 |
| 3 | Azure Data Factory | `azure-data-factory` | 2 | 37 |
| 4 | pandas Essentials | `pandas-essentials` | 2 | 38 |

Artifacts per document: `<id>.json`, `<id>-page-1.svg`, `<id>-page-2.svg`,
plus a PNG preview of each page.

**Verification:** all four schema-valid; no block out of page bounds; no top-level
frame overlap above 10 %; zero forbidden SVG elements; **564/564 text fragments
round-trip into the rendered SVG as live `<text>`**.

**Block inventory across the pack** — this is the coverage the pack was built to prove:

```
text 75 · list 43 · table 16 · code 14 · box 12 · diagram 8   (153 blocks)
```

Diagram types used: `graph` (tree, manual), `sequence` (steps preset).
`drawing` blocks: **0** — nothing needed the fallback.

---

## 1. SQL for Analytics — `sql-analytics`

| field | value |
|---|---|
| title | SQL for Analytics |
| subtitle | Query logic, grouping, joins and window functions |
| audience | Analysts and analytics engineers preparing for data interviews |
| difficulty | intermediate |
| goal | Get the stage, the grain and the window frame right on the first try |

### Page 1 — “SQL — Query Logic, Grouping & Joins”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 1 | Logical Query Order | intro + 3 bullets on alias/aggregate visibility | **diagram** `query-order` + **table** WHERE/HAVING/Cost |
| 2 | WHERE vs HAVING | 3 definition items (WHERE, HAVING, QUALIFY) | **code** 5-line grouped query · **callout** Common trap |
| 3 | GROUP BY Grain | grain definition + COUNT variants | **code** grain comparison · **callout** fan-out trap |
| 4 | JOIN Types | fan-out, aggregate-then-join, anti-join | **table** 5 join types × row count · **callout** LEFT JOIN trap |

**Diagram spec — `query-order`**
`type: graph · layout: tree · directed · nodeShape: roundedRect`
Nodes (chain): `FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`
Caption: “Execution order”. Anchors: `query-order/node/n3/right` etc.

### Page 2 — “SQL — Window Functions & CTEs”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 5 | Window Function Anatomy | PARTITION BY / ORDER BY / frame as definitions | **code** OVER(...) skeleton · **callout** *Important* (RANGE vs ROWS) |
| 6 | Ranking Family | dedupe with ROW_NUMBER, add a tiebreaker | **table** four functions against values 10, 10, 9 |
| 7 | LAG / LEAD | `LAG(v,1,0)` signature, independent ORDER BY | **code** delta query · **table** worked d/v/prev/delta |
| 8 | CTEs | materialization, recursive dialect split | **code** latest-row-per-key · **callout** window-in-WHERE trap |

Closing summary line: *“Know the grain, know the stage, know the frame.”*

---

## 2. PySpark Execution Model — `pyspark-execution`

| field | value |
|---|---|
| title | PySpark Execution Model |
| subtitle | Laziness, the DAG, the shuffle and what to tune |
| audience | Data engineers running Spark on Databricks, EMR or Synapse |
| difficulty | intermediate |
| goal | Read a Spark UI, name the shuffle boundary, and know which knob to turn |

### Page 1 — “PySpark — Execution Model”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 1 | DataFrame vs RDD | when each wins, UDFs break Catalyst | **table** API / Optimizer / Memory / Schema |
| 2 | Lazy Evaluation | plan stages, `explain(True)`, analysis-time errors | **diagram** `plan-chain` |
| 3 | Transformations vs Actions | narrow vs wide definitions | **table** lazy vs runs · **callout** collect()/cache() trap |
| 4 | Job / Stage / Task | three definitions | **diagram** `job-stage-task` |

**Diagram spec — `plan-chain`**
`type: graph · layout: manual · directed · roundedRect`
Nodes at y=26: `Unresolved (x56) → Analyzed (x170) → Optimized (x284) → Physical (x398)`
Caption: “Catalyst: what explain(True) shows”.

**Diagram spec — `job-stage-task`**
`type: graph · layout: manual · directed`
Nodes: `Job (write)` (210,20); `Stage 0` (110,92); `Stage 1` (330,92); tasks `T0 T1 T2` under Stage 0, `T0 T1` under Stage 1.
Edges: Job→Stage 0, Job→Stage 1, **Stage 0→Stage 1 dashed, label “shuffle”**, stage→task edges.
Caption: “One task per partition, per stage”.

### Page 2 — “PySpark — Shuffle, Partitions & Caching”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 5 | Shuffle | what triggers it, the 200 default, broadcast | **box** *Narrow vs wide dependency* holding two manual graphs · **code** three conf lines |
| 6 | Partitions | sizing rule, repartition vs coalesce, write partitioning | **table** repartition vs coalesce on 4 axes |
| 7 | cache / persist | lazy, default level, unpersist | **table** storage levels · **callout** caching trap |
| 8 | Tuning Checklist | 4 checklist bullets | — |

**Diagram spec — narrow vs wide**
Two `graph · layout: manual · directed` blocks side by side inside one `box` (variant `note`).
Both have `P0 P1 P2` on top and `Q0 Q1 Q2` below.
*Narrow*: 3 edges, strictly 1:1. *Wide*: 6 crossing edges, every P feeding two Qs.

Closing summary: *“Every performance question in Spark is a question about the shuffle.”*

---

## 3. Azure Data Factory — `azure-data-factory`

| field | value |
|---|---|
| title | Azure Data Factory |
| subtitle | Object model, copy activity, parameters and monitoring |
| audience | Data engineers building ingestion pipelines on Azure |
| difficulty | intro |
| goal | Name every ADF object, parameterize a pipeline, and debug a failed run |

### Page 1 — “Azure Data Factory — Building Blocks”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 1 | Object Model | 6-term glossary (linked service → integration runtime) | **diagram** `object-chain` + **table** object → what it answers |
| 2 | Linked Service & Dataset | one per system, Key Vault, parameterize | **code** parameterized dataset JSON |
| 3 | Pipeline & Activities | dependency conditions, AND not OR, ForEach limits | **table** four activity categories |
| 4 | Triggers | only tumbling window backfills | **table** trigger × fires on × backfill |

**Diagram spec — `object-chain`**
`type: graph · layout: tree · directed · roundedRect`
Chain: `Linked service → Dataset → Activity → Pipeline → Trigger`
Caption: “each one wraps the last”.

### Page 2 — “Azure Data Factory — Copy, Parameters & Monitoring”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 5 | Copy Activity | DIU, parallel copies, staged copy, fault tolerance | **diagram** `copy-flow` · **table** knob → raises → watch |
| 6 | Parameterization | parameters vs variables, pass down not global | **table** 4 scopes + expression · **code** 3 expressions · **callout** `@` escaping trap |
| 7 | Monitoring | 45-day retention, annotations, alerts | **callout** *Important* (rerun id, diagnostics ordering) |
| 8 | Traps Worth Memorising | Lookup limits, nested ForEach, debug IR, delete warnings | — |

**Diagram spec — `copy-flow`**
`type: sequence · preset: steps · link: arrow`
Cells: `Source DS → Copy → Sink DS`. Caption: “Copy activity”.

Closing summary: *“Parameterize early: one pipeline for many sources beats many pipelines.”*

---

## 4. pandas Essentials — `pandas-essentials`

| field | value |
|---|---|
| title | pandas Essentials |
| subtitle | Loading, filtering, grouping, merging and going fast |
| audience | Analysts and data scientists moving from spreadsheets or SQL |
| difficulty | intro |
| goal | Reshape and join data correctly, and stop reaching for apply() |

### Page 1 — “pandas — Load, Filter, Group”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 1 | Loading Data | usecols / dtype / parse_dates / chunksize | **code** a full `read_csv` call + `info(memory_usage)` |
| 2 | Selecting & Filtering | loc/iloc end semantics, mask parenthesising, query | **table** 4 accessors · **callout** chained-assignment trap |
| 3 | groupby | agg / transform / filter / apply by output shape | **diagram** `split-apply-combine` · **code** named agg + transform |
| 4 | merge | validate=, indicator=, join vs concat | **code** validated left merge · **callout** fan-out + float upcast trap |

**Diagram spec — `split-apply-combine`**
`type: sequence · preset: steps · link: arrow`
Cells: `Split → Apply → Combine`. Caption: “What groupby actually does”.

### Page 2 — “pandas — Missing Data, Reshape & Speed”

| § | Section | Text column | Figure column |
|---|---|---|---|
| 5 | Missing Values | isna not ==, nullable dtypes, dropna(subset) | **table** nan / NA / NaT / None · **code** 5 idioms |
| 6 | pivot_table vs pivot | pivot raises on dupes, pivot_table aggregates, melt | **code** pivot_table + melt |
| 7 | apply vs Vectorized | np.where / np.select / .map / .str | **table** relative cost · **code** slow vs fast |
| 8 | Performance Checklist | category dtype, no loop-grow, to_numpy, copy-on-write | — |

Closing summary: *“If you are writing a lambda over rows, there is a vectorized way.”*

---

## Grammar changes this pack forced

**One, additive and render-neutral.** `schemaVersion` now accepts `"1.1"`, which adds
two optional metadata fields you asked for and the 1.0 schema had nowhere to put:

```json
"meta": { "audience": "…", "goal": "…" }
```

Neither is ever rendered. Every 1.0 document remains valid. This is exactly the
“minor bump” case in the extension rules.

**No new block kinds, no new diagram types, no `drawing` blocks.** SQL logic chains,
Spark DAGs, ADF object nesting and a cloud pipeline all fell out of `graph` and
`sequence` presets that already existed.

### Renderer bugs the pack exposed (not grammar gaps)

1. **Whitespace was being dropped.** Measured advances include spaces, but SVG
   collapses leading whitespace inside a `<tspan>`. Every `<text>` now carries
   `xml:space="preserve"`. Symptom before the fix: `Parallel copies— concurrent`.
2. **Edges stopped at the circle radius on label-sized nodes.** Rect/pill nodes size
   to their label, so arrowheads vanished under the node fill. Edge endpoints now
   use the node's real extent along the edge direction.
3. **Figures needed their own flow.** Anchoring each figure to its section's `y`
   let tall figures run into the next section. The authoring pass now flows the
   figure column and aligns to a section only when there is room — the same
   bake-fixed-frames-at-authoring-time pattern as before.
4. **The `data | pointer` cell split belonged to the preset, not to `link:"arrow"`.**
   `preset: "steps"` now gives plain arrow-linked boxes; only `linked_list` draws
   the pointer compartment.
5. **Vertical sequences had no arrows** between cells. They do now.

### Worth knowing for your converter

`U+200B` earns its place in the break-opportunity set. ADF expressions like
`@pipeline().globalParameters.env` have no whitespace and overflow a narrow table
column; a ZWSP after `()` gives the wrapper a legal break and the string still
copies back out intact.
