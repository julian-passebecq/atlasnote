# Content pre-review: `atlas.v3-seed` (pack 0.2.0)

> **Pre-review by an AI assistant (Claude Code) on 2026-09-25. This is not an approval.**
> The publication-review entry for `atlas.v3-seed` in `content/publication-review.json` still reads
> "OWNER REVIEW REQUIRED before publication", and it stays that way. This document only narrows the
> owner's review to a list of concrete issues. No file under `content/`, `src/`, `tests/` or `tools/`
> was modified. No code was executed and no URL was fetched: every judgement below comes from reading
> the text, and each one gives a confidence level.

Scope reviewed: `atlas-pack.json`, `projects.json`, `glossary.json` (41 terms) and all 70 files in
`pages/`: 64 Notebook pages and 6 native QCM sets with 45 questions in total. All 45 QCM answer keys were
checked, along with every Norwegian sentence, every code block, every glossary definition, every
source URL and every `related` link. The 10 cross-pack links go to `study.samples`, and each one was
resolved against that pack.

Severity scale: **High** = factually wrong or a quiz with a wrong or ambiguous answer key;
**Medium** = misleading, incomplete in a way that teaches something false, or unidiomatic;
**Low** = minor precision, consistency or coverage point.

## Summary

| # | File | Issue type | Severity | Description |
|---|------|-----------|----------|-------------|
| H-1 | `pages/page.v3seed.qcm.norsk-grammar.json` (q2) | QCM answer key | **High** | "Which definite forms of ei/en bok" makes option d `bøkene` (definite plural) a defensible correct answer. The key marks only a and b. |
| M-1 | `pages/page.v3seed.inner-left-and-anti-joins.json` | Technical (SQL comment) | Medium | The explanation of why a WHERE filter removes customers is wrong for customers who have only pre-2026 orders. |
| M-2 | `pages/page.v3seed.missing-data-and-nullable-dtypes.json` | Technical (pandas code) | Medium | `to_numeric(..., errors="coerce").astype("Int64")` raises on fractional input. The page presents it as safe ingestion code, although the linked quiz itself warns about this. |
| M-3 | `pages/page.v3seed.subordinate-clauses-and-ikke.json` + `glossary.json` (`term.v3seed.connector`) | Norwegian idiom | Medium | "testen ikke passerer / passerte" is an anglicism. Suggested: "går gjennom". |
| M-4 | `pages/page.v3seed.qcm.pyspark-execution-performance.json` (q6) | QCM ambiguity | Medium | The stem never says the skewed stage is a join, but correct option b assumes a join. AQE skew-join handling does not apply to an aggregation stage. |
| M-5 | `pages/page.v3seed.nrk-daily-feed-workflow-for-atlasnote.json` | Consistency / naming | Medium | The title names a real publisher (NRK) for a publisher-neutral "Norsk Daily" feature, the page names one vendor (ChatGPT), and it leaves out that an import is a reviewed Agent ChangeSet. The page is also tagged `lang:nb` but contains no Norwegian. |
| L-1 | `pages/page.v3seed.qcm.grain-joins-windows.json` (q2) | QCM precision | Low | The answer ignores the extra NULL group when `orders.customer_id` is nullable. The key is still the best option. |
| L-2 | `pages/page.v3seed.v2-word-order-in-main-clauses.json` | Norwegian semantics | Low | "I dag lærer jeg norsk på kvelden" is grammatical but semantically odd (habitual "på kvelden" combined with "i dag"). |
| L-3 | `pages/page.v3seed.managed-identity-and-key-vault.json` | Technical precision / consistency | Low | "associated with a resource" fits system-assigned identities only. The glossary entry is more accurate. |
| L-4 | `glossary.json` (`term.v3seed.spark-partition`) | Technical precision | Low | The example `df.rdd.getNumPartitions()` does not work on Spark Connect or Databricks serverless/standard access mode. |
| L-5 | `pages/page.v3seed.cache-and-persistence.json` | Technical precision | Low | "Caching is lazy" holds for the DataFrame API. SQL `CACHE TABLE` is eager, and cache APIs are restricted on Databricks serverless. |
| L-6 | `glossary.json` (`term.v3seed.definite-form`) | Norwegian precision | Low | "-ene in the plural" leaves out neuter plural `-a` (barna, husa). |
| L-7 | `pages/page.v3seed.sql-grain-before-joins.json` | Technical precision | Low | In the CTE, `order_count` silently counts only orders that have at least one line, because of the INNER JOIN. |
| L-8 | `pages/page.v3seed.exceptions-and-defensive-parsing.json` | Technical precision | Low | `float(raw)` accepts "nan"/"inf". "control-flow exceptions" is imprecise. The `raw: str` annotation does not match the `TypeError` catch. |
| L-9 | `pages/page.v3seed.qcm.python-data-engineering.json` (q8) | Explanation wording | Low | "to_numeric ... yields float64" may not hold for pandas 3 default string input. The answer key is unaffected. Low confidence. |
| L-10 | `pages/page.v3seed.workplace-vocabulary-for-data-projects.json` | Consistency | Low | The nouns are listed without gender or article, although the nouns page tells learners to learn gender with each noun. |
| L-11 | Several pages (see X-1) | Sources | Low | 21 of the 59 source references point to documentation root or home pages rather than the topic. No URL looks invented. |
| L-12 | `glossary.json` (32 terms) | Consistency | Low | Term `pageIds` never list the QCM pages that reference the term. This may be intentional. |

**Totals: 1 High, 5 Medium, 12 Low.**

---

## Detailed findings

### H-1 `pages/page.v3seed.qcm.norsk-grammar.json`, question `question.v3seed.nog.q2`

- Current prompt: "Which definite forms of ei/en bok are accepted in Bokmål? Select all that apply."
  Options: a) boka ✔, b) boken ✔, c) boket, d) bøkene.
- Problem: `bøkene` is the definite **plural** of *bok* and is standard Bokmål. Because the prompt says
  "definite forms", not "definite singular forms", a learner who selects d is correct yet gets marked wrong.
- Proposed correction: change the prompt to "Which definite **singular** forms of ei/en bok are
  accepted in Bokmål?". Alternatively, replace option d with a form that is actually wrong, such as `bokan` or `boki`.
- Confidence: **high**.

### M-1 `pages/page.v3seed.inner-left-and-anti-joins.json`, code block "LEFT JOIN: right-side filters belong in ON"

- Current comment: "-- The same predicate in WHERE removes customers without a 2026 order, / -- because
  o.order_date IS NULL for them: the query now behaves like an INNER JOIN."
- Problem: the conclusion is right, but the stated reason covers only customers with no orders at all.
  A customer with only 2025 orders still matches in the plain `ON o.customer_id = c.customer_id` join,
  so `o.order_date` is a real 2025 date, not NULL, and the row is removed because the date fails the
  predicate. Learners may come away thinking every removed row had a NULL.
- Proposed correction: "-- The same predicate in WHERE removes customers without a 2026 order: customers
  with no orders have a NULL o.order_date, and customers with only older orders fail the date test.
  The query now behaves like an INNER JOIN."
- Confidence: **high**.

### M-2 `pages/page.v3seed.missing-data-and-nullable-dtypes.json`, code block "Example"

- Current: `df["qty"] = pd.to_numeric(df["qty"], errors="coerce").astype("Int64")`
- Problem: when any value has a fractional part (for example "2.5"), `astype("Int64")` raises
  `TypeError` ("cannot safely cast non-equivalent float64 to int64"). The page bullet directly above
  says "Convert ... numerics with explicit error handling during ingestion", so the example looks like
  safe ingestion code, but it can crash on one bad value. The linked quiz explanation (`py.q8`) already
  warns about this, so the page and the quiz are also out of step.
- Proposed correction: add a comment and a guard, for example:
  ```python
  qty = pd.to_numeric(df["qty"], errors="coerce")
  bad = qty.notna() & (qty % 1 != 0)          # fractional quantities -> quarantine, not a crash
  df["qty"] = qty.mask(bad).astype("Int64")
  ```
  At minimum, add the sentence "Fails if any value has a fractional part."
- Confidence: **high** on the pandas behaviour.

### M-3 `pages/page.v3seed.subordinate-clauses-and-ikke.json` (bilingual block) and `glossary.json` `term.v3seed.connector` (example)

- Current (page): "Hvis testen ikke passerer, stopper vi utrullingen." / "If the test does not pass, we stop the rollout."
- Current (glossary): "Derfor stoppet vi kjøringen. / ... fordi testen ikke passerte."
- Problem: *passere* means "go past" or "pass through". Using it for a test that passes is an English
  calque. Developers do say it in speech, but it is not what a B2 learner should copy into a formal answer.
  Word order and the V2 hint are correct.
- Proposed correction: "Hvis testen ikke går gjennom, stopper vi utrullingen." and "... fordi testen
  ikke gikk gjennom." An alternative that flips the meaning: "Hvis testen feiler, stopper vi utrullingen."
  That version loses the *ikke* placement the example exists to teach, so prefer "går gjennom". The hint
  would then read "ikke before går in the hvis-clause".
- Confidence: **medium**. The owner or a native speaker should confirm the preferred IT register.

### M-4 `pages/page.v3seed.qcm.pyspark-execution-performance.json`, question `question.v3seed.spark.q6`

- Current stem: "In a 200-task stage, one task runs for 40 minutes ... Which first steps are
  reasonable?" Correct options: a) count rows per join/group key; b) "Check whether AQE skew-join handling
  is enabled and applies to this join."
- Problem: the stem does not say whether the stage is a join or an aggregation, and option a hedges with
  "join/group". AQE skew handling (`spark.sql.adaptive.skewJoin.*`) splits skewed partitions of
  sort-merge joins (and of shuffled hash joins in newer versions). It does not rebalance a skewed
  `groupBy` aggregation. A learner who pictures an aggregation stage could reasonably leave b unselected.
- Proposed correction: make the stem explicit, for example "In the 200-task stage of a sort-merge join
  between events and customers, one task ...".
- Confidence: **medium-high**.

### M-5 `pages/page.v3seed.nrk-daily-feed-workflow-for-atlasnote.json`

- Current title: "NRK Daily feed workflow for AtlasNote". Current bullet: "ChatGPT can return structured
  translation, vocabulary and grammar hints matching the feed schema."
- Problems:
  1. The implemented feature is called **Norsk Daily** (`src/norsk-daily/`) and is publisher-neutral:
     `source.publisher` is a field, and permission status is recorded per batch. A title that names NRK
     can read as an NRK-branded or NRK-endorsed feed, which the rest of the page does not claim.
  2. The page names one vendor. `examples/norsk-daily/README.md` says "ChatGPT (or write the JSON by
     hand)" and "AtlasNote makes no provider call", but that nuance is missing here.
  3. "The Norsk experience can import ..." leaves out that an import is a reviewed Agent ChangeSet
     (preview -> stage -> explicit accept, per `src/norsk-daily/import.ts`). The page also says nothing
     about a review step.
  4. The page is tagged `lang:nb` but has no Norwegian text. Other Norsk pages mix English prose with
     Norwegian examples, which is fine; this page has none.
- Proposed correction: retitle it "Norsk Daily feed workflow". Replace the ChatGPT bullet with "An external
  assistant of your choice (or hand-written JSON) can return ... matching the feed schema; AtlasNote makes
  no provider call." Add "Imports arrive as a proposal that you preview, stage and accept in Agent Review."
  Consider `lang:en`.
- Confidence: **medium**. Points 1 and 2 are editorial and policy judgements for the owner. Point 3 is
  based on reading the source.

### L-1 `pages/page.v3seed.qcm.grain-joins-windows.json`, question `question.v3seed.de.q2`

- Current: the key is b) "One row per customer that has at least one order."
- Nuance: if `orders.customer_id` can be NULL, the result also contains one NULL group. Option b is still
  the best answer.
- Proposed: add to the explanation "(plus one NULL group if orders.customer_id can be NULL)".
- Confidence: **high**.

### L-2 `pages/page.v3seed.v2-word-order-in-main-clauses.json`, question block

- Current: "Rewrite with "I dag" first: Jeg lærer norsk på kvelden." -> "I dag lærer jeg norsk på kvelden."
- Problem: the result is grammatical, but "i dag ... på kvelden" is odd. *På kvelden* suggests a habit,
  "in the evenings". For a single evening, "i kveld" is idiomatic.
- Proposed: "Rewrite with "Hver dag" first: Jeg lærer norsk på kvelden." -> "Hver dag lærer jeg norsk
  på kvelden." Or use the source sentence "Jeg lærer norsk i dag." -> "I dag lærer jeg norsk."
- Confidence: **medium**.

### L-3 `pages/page.v3seed.managed-identity-and-key-vault.json`

- Current: "A managed identity is an Azure-managed service principal associated with a resource."
- Nuance: this describes a system-assigned identity. A user-assigned identity is a standalone resource
  that can be attached to several resources. The glossary term `managed-identity` states this correctly,
  so the page and the glossary disagree slightly.
- Proposed: "A managed identity is a Microsoft Entra identity (a service principal managed by Azure)
  that a resource uses to get tokens; it is either system-assigned (tied to one resource) or
  user-assigned (a standalone resource)."
- Confidence: **high**.

### L-4 `glossary.json`, `term.v3seed.spark-partition` (example)

- Current example: `df.rdd.getNumPartitions()`
- Problem: the RDD API is not available under Spark Connect, which includes Databricks serverless and
  standard (formerly shared) access mode. The example fails there, and the pack targets Databricks.
- Proposed: keep the example with the note "(classic compute; RDD API unavailable on Spark Connect /
  serverless)", or point readers to the Spark UI task count instead.
- Confidence: **medium-high** that the RDD API is unavailable on Spark Connect. Check the exact current
  Databricks access-mode names.

### L-5 `pages/page.v3seed.cache-and-persistence.json`

- Current: "Caching is lazy; it materializes only when an action executes."
- Nuance: this is right for `DataFrame.cache()` and `persist()`, and the code and quiz q7 are consistent
  with it. SQL `CACHE TABLE` is eager unless `LAZY` is given. On Databricks serverless compute, the
  DataFrame cache APIs and SQL cache commands are, as far as I know, not supported.
- Proposed: "With the DataFrame API, caching is lazy ... (SQL CACHE TABLE is eager unless LAZY; check
  whether your compute type supports caching at all, e.g. Databricks serverless)."
- Confidence: **high** for CACHE TABLE; **medium** for the serverless restriction.

### L-6 `glossary.json`, `term.v3seed.definite-form`

- Current: "... -et (neuter; only -t after a final -e) in the singular, and -ene in the plural."
- Nuance: many neuter nouns take `-a` in the definite plural, which is mandatory in *barna* and
  optional in *husa/husene*.
- Proposed: "... and usually -ene in the plural (neuter nouns may take -a: barna, husa/husene)."
- Confidence: **high**.

### L-7 `pages/page.v3seed.sql-grain-before-joins.json`, code block "Aggregate to the target grain, then join"

- Current: the `order_totals` CTE computes `COUNT(DISTINCT o.order_id)` over `orders o JOIN order_lines l`.
- Nuance: because of the INNER JOIN, orders without lines are not counted in `order_count`. That is fine
  if every order has lines, which is the same assumption quiz q1 makes, but the page never states it.
  On a page about which rows a join keeps, it is worth one comment.
- Proposed: add the comment "-- assumes every order has at least one line; otherwise count orders
  separately."
- Confidence: **high**.

### L-8 `pages/page.v3seed.exceptions-and-defensive-parsing.json`

- Current bullet: "Avoid bare except because it also catches control-flow exceptions and hides defects."
  - Precision: a bare `except:` catches `BaseException`, including `KeyboardInterrupt`, `SystemExit` and
    `GeneratorExit`. "Control-flow exceptions" is vague, because `StopIteration` is caught by
    `except Exception` as well.
  - Proposed: "... because it also catches KeyboardInterrupt and SystemExit and hides defects."
- Current code: `def parse_amount(raw: str) -> float | None: ... float(raw) ... except (TypeError, ValueError)`
  - `float()` accepts "nan", "inf" and "1_000", so non-finite amounts get through as valid. The page
    deliberately separates parsing from validation, which is why this is Low. `TypeError` can only occur
    when `raw` is not a str, which contradicts the annotation. For money, `decimal.Decimal` is usually
    more appropriate than `float`. The `float | None` syntax needs Python 3.10 or later.
  - Proposed: annotate `raw: object`, or `str | None`, and add "# validation step should reject NaN/inf".
- Confidence: **high** on the Python behaviour. The severity is a judgement call.

### L-9 `pages/page.v3seed.qcm.python-data-engineering.json`, question `question.v3seed.py.q8` (explanation only)

- Current explanation: "to_numeric with errors="coerce" yields float64 with NaN; ..."
- Nuance: in pandas 3.x, `pd.Series(["3", "x", None])` is inferred as the new default string dtype. I am
  not certain that `to_numeric` then returns plain `float64` rather than a nullable dtype. The final
  result after `.astype("Int64")`, which is `3, <NA>, <NA>` with dtype Int64, is the same either way, so
  the answer key is correct.
- Proposed: soften to "to_numeric with errors="coerce" turns invalid values into missing values; ..."
  Or have the owner run the two lines once on the target pandas version.
- Confidence: **low**, and the finding concerns wording only.

### L-10 `pages/page.v3seed.workplace-vocabulary-for-data-projects.json`

- Current: "datakilde = data source", "tilgang = access", "frist = deadline", "avhengighet = dependency",
  "utrulling = deployment/rollout", "forbedring = improvement".
- Consistency: the nouns page says "Learn a noun together with gender and its definite form", but this
  list gives no articles. The translations themselves are all correct.
- Proposed: "en datakilde", "en tilgang", "en frist", "en avhengighet", "ei/en utrulling",
  "ei/en forbedring".
- Confidence: **high** on the genders listed (masculine for the first four; the -ing nouns take ei/en in Bokmål).

### L-11 Source links (cross-cutting)

See section X-1 for the full list. No URL looks invented, and every deep link follows a documentation URL
structure I recognise. However, 21 of the 59 source references point to a root or home page that does not
back up the specific claim. The weakest cases:

- `page.v3seed.qualify-and-deduplication`: its only source is `https://docs.databricks.com/`. A page
  about QUALIFY would be better served by the Databricks SQL reference page for the QUALIFY clause.
  (I did not guess that URL; the owner should look it up.)
- `page.v3seed.unity-catalog-mental-model`, `page.v3seed.lakeflow-jobs-and-task-dependencies`,
  `page.v3seed.bronze-silver-and-gold-contracts`, `page.v3seed.databricks-performance-checklist` and
  `page.v3seed.delta-lake-table-fundamentals`: all use the `https://docs.databricks.com/` root.
- `page.v3seed.adf-parameters-variables-and-expressions`,
  `page.v3seed.adf-reliability-retries-idempotency-and-monitoring` and
  `page.v3seed.azure-data-factory-pipeline-mental-model`: all use the ADF documentation root.
- The Norwegian grammar pages (`adjective-agreement`, `past-tense-preterite-versus-perfect`,
  `nouns-indefinite-and-definite-forms`) cite the dictionary home page `ordbokene.no`. It is a real
  site, but it is a dictionary, not a grammar reference.
- Several pages have no sources: `cloud-cost-reading-checklist`, all 8 `subject:job` pages,
  `explaining-a-data-pipeline-in-norwegian`, `subordinate-clauses-and-ikke`,
  `v2-word-order-in-main-clauses`, `nrk-daily-feed-workflow-for-atlasnote`, `reading-queue-triage`,
  `weekly-learning-review` and all 6 QCM pages. That is acceptable for opinion or checklist pages, and
  is noted only for coverage.

Confidence: **high** that none of the URLs are invented.

### L-12 `glossary.json`, term `pageIds` (cross-cutting)

- Every term that a QCM page references in its `terms` array (32 terms) omits that QCM page from its
  `pageIds`. For example, `term.v3seed.grain` lists 7 Notebook pages but not
  `page.v3seed.qcm.grain-joins-windows`. No term lists a page that does not reference it.
- This looks systematic, and may be a deliberate rule that glossary back-references cover Notebook pages
  only. If it is not deliberate, add the QCM page IDs. Otherwise, document the rule.
- Confidence: **high** on the mismatch. Whether it is intended is unknown.

---

## X-1 All source URLs (36 unique, 59 references)

Verdicts: **deep link OK** means a known documentation URL pattern that I am confident exists.
**Root/generic** means it exists but is not specific to the topic. No URL is flagged as likely invented.

| URL | Used by (count) | Verdict |
|-----|-----------------|---------|
| https://spark.apache.org/docs/latest/sql-performance-tuning.html | 7 | deep link OK (covers AQE, join hints, coalesce hints) |
| https://spark.apache.org/docs/latest/rdd-programming-guide.html | 2 | deep link OK |
| https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-persistence | 1 | deep link OK (anchor exists) |
| https://spark.apache.org/docs/latest/sql-programming-guide.html | 1 | deep link OK |
| https://spark.apache.org/docs/latest/web-ui.html | 2 | deep link OK |
| https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-window.html | 1 | deep link OK |
| https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html | 1 | deep link OK |
| https://docs.databricks.com/ | 6 | root/generic |
| https://delta.io/ | 2 | root/generic (project home) |
| https://mlflow.org/ | 1 | root/generic (project home) |
| https://learn.microsoft.com/en-us/azure/data-factory/ | 3 | root/generic (documentation hub) |
| https://learn.microsoft.com/en-us/fabric/ | 1 | root/generic (documentation hub) |
| https://learn.microsoft.com/en-us/fabric/onelake/onelake-overview | 1 | deep link OK |
| https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction | 1 | deep link OK |
| https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview | 1 | deep link OK |
| https://learn.microsoft.com/en-us/azure/key-vault/general/overview | 1 | deep link OK |
| https://docs.python.org/3/library/dataclasses.html | 1 | deep link OK |
| https://docs.python.org/3/tutorial/errors.html | 1 | deep link OK |
| https://docs.python.org/3/tutorial/controlflow.html | 1 | deep link OK |
| https://docs.python.org/3/howto/functional.html | 1 | deep link OK |
| https://docs.python.org/3/library/json.html | 1 | deep link OK |
| https://docs.python.org/3/library/csv.html | 1 | deep link OK |
| https://docs.python.org/3/tutorial/datastructures.html | 1 | deep link OK |
| https://pandas.pydata.org/docs/user_guide/groupby.html | 1 | deep link OK |
| https://pandas.pydata.org/docs/user_guide/missing_data.html | 1 | deep link OK |
| https://pandas.pydata.org/docs/user_guide/enhancingperf.html | 1 | deep link OK |
| https://pandas.pydata.org/docs/user_guide/scale.html | 1 | deep link OK |
| https://pandas.pydata.org/docs/user_guide/indexing.html | 1 | deep link OK |
| https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html | 1 | deep link OK |
| https://www.postgresql.org/docs/current/tutorial-agg.html | 2 | deep link OK |
| https://www.postgresql.org/docs/current/functions-comparison.html | 1 | deep link OK |
| https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS | 1 | deep link OK (anchor exists) |
| https://www.postgresql.org/docs/current/using-explain.html | 1 | deep link OK |
| https://www.postgresql.org/docs/current/tutorial-window.html | 1 | deep link OK |
| https://ordbokene.no/ | 5 | root/generic (dictionary; fine for vocabulary pages, weak for grammar pages) |
| https://www.sprakradet.no/ | 3 | root/generic |

---

## Checked and found no issues

**QCM answer keys:** 44 of the 45 questions have a correct and unambiguous key. The only wrong or
ambiguous key is nog.q2 (H-1). M-4 (spark.q6) is an ambiguity in the stem, and the key is defensible.
L-1 and L-9 are refinements to explanations only.
- `qcm.cloud-data-platforms`: q1 to q8 are correct. The Delta q6 (a, b) and idempotency q3 (a, b) keys
  and the managed-identity q4 key were checked specifically.
- `qcm.grain-joins-windows`: q1 and q3 to q8 are correct. q8's implicit RANGE frame is correct for both
  PostgreSQL and Spark SQL.
- `qcm.norsk-grammar`: q1 and q3 to q8 are correct.
- `qcm.norsk-word-order`: q1 to q5 are correct.
- `qcm.pyspark-execution-performance`: q1 to q5, q7 and q8 are correct.
- `qcm.python-data-engineering`: q1 to q7 are correct, and the q8 key is correct.

**Norwegian sentences checked and correct:** every sentence in `explaining-a-data-pipeline-in-norwegian`,
`past-tense-preterite-versus-perfect`, `adjective-agreement` (list, table and -ig rule),
`nouns-indefinite-and-definite-forms`, `b2-connectors-for-structured-answers` and
`modal-verbs-in-work-conversations`. In `v2-word-order-in-main-clauses`, the table, the bilingual block and
"I dag jobber jeg hjemme" are correct. In `subordinate-clauses-and-ikke`, the list, the table and the
question are correct. The Norwegian glossary terms other than L-6 and the connector example in M-3 are also
correct. All Norwegian text is in Bokmål: the pack has no Nynorsk sentences to review.

**Notebook pages with no findings (54 of 64):**
adaptive-query-execution, adf-parameters-variables-and-expressions\*, adf-reliability-retries-idempotency-and-monitoring\*,
adjective-agreement\*, adls-gen2-organization-and-access, aggregations-having-and-conditional-metrics,
azure-data-factory-pipeline-mental-model\*, b2-connectors-for-structured-answers, bronze-silver-and-gold-contracts\*,
cloud-cost-reading-checklist, data-engineer-interview-project-walkthrough, data-quality-interview-framework,
databricks-performance-checklist\*, dataclasses-and-typed-records, dataframe-versus-rdd-versus-pandas,
delta-lake-table-fundamentals\*, explain-plans-and-troubleshooting, explaining-a-data-pipeline-in-norwegian,
fabric-data-factory-orchestration, fabric-onelake-and-lakehouse-mental-model, functions-arguments-and-return-values,
groupby-and-aggregation, how-to-study-a-daily-news-headline, iterators-and-generators,
join-strategies-and-broadcast-joins, json-csv-and-file-boundaries, lakeflow-jobs-and-task-dependencies\*,
merge-validation-and-cardinality (the validate table and the worked example check out), mlflow-run-tracking-for-data-experiments,
modal-verbs-in-work-conversations, narrow-versus-wide-transformations, nouns-indefinite-and-definite-forms\*,
null-semantics, pandas-performance-boundaries, pandas-selection-filtering-and-assign, partitions-and-repartitioning,
past-tense-preterite-versus-perfect\*, pyspark-interview-checklist, python-data-structures-for-data-engineering,
qualify-and-deduplication\*, questions-to-ask-a-data-engineering-team, reading-queue-triage,
rows-versus-range-window-frames (the ROWS/RANGE table values 10/15/35 vs 15/15/35 check out), skew-and-hot-keys,
small-files-and-output-layout, spark-execution-model-dag-jobs-stages-and-tasks, sql-interview-checklist,
sql-performance-reading-checklist, star-answers-without-losing-technical-depth, system-design-batch-analytics-pipeline,
troubleshooting-a-slow-pipeline, unity-catalog-mental-model\*, weekly-learning-review, window-functions.

\* Content is fine; the page appears only in the cross-cutting source note L-11 (generic source link).

**QCM pages with no findings (2 of 6):** `qcm.norsk-word-order`, `qcm.cloud-data-platforms`.

**Pack structure:**
- `atlas-pack.json`: the declared counts (64 Notebook pages, 6 QCM, 41 terms) match the files, and the
  provenance correctly says the code was not executed and owner review is required.
- `projects.json`: 5 projects place all 70 pages exactly once. Every node title matches its page title,
  every QCM `taxonomy.folderId` points to the folder that contains it, and no page is orphaned.
- Links: every `related` entry, every QCM "Review" link and every `link`/`resource-link` block resolves.
  The 10 `page.samples.*` targets all exist in `study.samples` 1.1.0, and their topics match the pages
  that link to them (for example `page.samples.sql.select` "Select and filter" from the aggregations page).
- No related link points to a page on an unrelated topic.
- No contradictions were found between pages on NOT IN and NULL, the implicit RANGE frame, cache laziness,
  fan-out, idempotency or broadcast joins. The only divergences are M-2 (page vs quiz on the fractional cast)
  and L-3 (page vs glossary on managed identity).


## Applied on this branch (2026-09-25)

These are high-confidence corrections from the findings above. They were applied as exact edits, and the pack's review hash was updated. **This is still not an approval: owner review is required.**

- **H-1:** the quiz question now asks for "definite **singular** forms of ei/en bok". `bøkene` remains a wrong option.
- **M-1:** the SQL comment now explains both cases: customers with no orders (NULL `order_date`) and customers with only older orders (they fail the date test).
- **M-2:** the pandas example uses a guarded conversion. Fractional quantities are masked (quarantined) instead of crashing `astype("Int64")`.
- **M-4:** the PySpark question now states that the skewed stage is a sort-merge join between events and customers.
- **M-5:** the page is retitled "Norsk Daily feed workflow" and its tree title updated.
  - The provider is neutral ("an external assistant of your choice, or hand-written JSON; AtlasNote makes no provider call").
  - A bullet now states that imports are reviewed proposals (preview, stage, explicit accept).
  - The tag is `lang:en`.

**Not applied, left to the owner:**
- M-3, the Norwegian idiom `passerer`. A native speaker should confirm the replacement.
- All Low findings.
