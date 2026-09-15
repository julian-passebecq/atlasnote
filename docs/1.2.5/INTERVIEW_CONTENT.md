# Native interview reference content

## Scope and ownership

This is educational reference content, not a game, runner, scoring system, or a new content type. The prototype adds **15 ordinary notebook pages** in the `atlas.interview-samples` public pack: SQL 5, Theory 4, Hybrid 3, Coding 3. The existing small interview notebook remains untouched. The new notebook is **Interview Preparation**, under the existing Job group/category, with a code icon and SQL/Python/etc. folders.

The canonical editable authoring source is `content/interviews/questions.json`, schemaVersion 1. `src/interview/content.mjs` validates that source and converts it to the existing Page and Project formats. `tools/generate-interviews.mjs` writes the generated pack; `npm run test:interviews` checks it for drift. The generated content is what AtlasNote loads. There is no runtime execution of `questions.json` code examples.

## Question fields

Each question has a stable `id`, `style` (SQL/Theory/Hybrid/Coding), `title`, `prompt`, `category`, `subcategory`, optional `topic`, `explanation`, `reasoning` points, `followUps`, `intent`, and `trap`. Optional fields: `example` (`language`, `code`, title/explanation), `diagram` (an original Mermaid diagram in the existing supported renderer), `alternatives` (text with optional short code), `complexity`, `reflectionPrompt`, `pattern`, `series`, `related` question IDs, and primary `sources`.

The standard page sections are Question; Reasoning; Answer / mental model; Example; optional Architecture; Alternative / tradeoff; Complexity / tradeoff; Common mistake / trap; Follow-up; Interviewer intent; Reflection. No HTML template or arbitrary SVG is stored. Existing native image blocks remain available when editing ordinary pages.

The project builder creates category -> subcategory -> optional topic -> question. Adding Q6 or more Python questions changes data and generation, not components. Keep IDs stable after publication: local remarks, links, saved locations and page overlays refer to those IDs.

## Canonical SQL sequence

All five canonical main prompts and follow-ups from the supplied brief are retained verbatim in the authoring data. Their reasoning progression is also preserved separately in `SQL_PROGRESSION` and the generated pack's `sql-progression.json`:

1. Filter / aggregate: paid orders in 2026, per-customer output grain, HAVING threshold.
2. Joins + cardinality: retain customers without paid orders; predicate placement; dimension fan-out.
3. Windows + ties: second-highest distinct salary; ROW_NUMBER/RANK/DENSE_RANK; per-department ranking.
4. Compose logic with CTEs: aggregate then rank; WITH is not automatically faster.
5. Alternative techniques + deeper reasoning: previous observed balance with LAG and a deterministic self-join.
6. Future family: Compositional SQL.
7. Future family: Temporal / relational logic.
8. Future family: Optimization reasoning.

Steps 6-8 are documented expansion families, not additional visible samples. SQL examples explicitly use PostgreSQL-style dates/syntax and state their assumptions. They are not promises that identical syntax works in every engine. Official PostgreSQL sources are linked on the pages.

## Other samples

Theory covers physical layout (partitioning vs clustering/indexing), batch vs streaming, Bronze/Silver/Gold contracts, and a behavioral incident explanation. The medallion sample uses an original conceptual Mermaid diagram, not a vendor architecture screenshot.

Hybrid samples explain Spark lazy evaluation with a short PySpark chain, retries/idempotency with explicitly illustrative configuration, and join fan-out with SQL plus data-model reasoning. Python, Spark, and Microsoft sources are linked where relevant. Configuration examples are not advertised as directly deployable vendor configurations.

The three Coding samples intentionally share `pattern: dictionary-grouping`: group rows by customer, count errors by code, keep the latest record per entity. Each has different wording, reasoning, an implementation, an alternative, complexity/tradeoff, a trap, and a variant follow-up. These snippets are not executed by AtlasNote.

## Personal edits, reflection and backup

Context > Remarks holds personal reflection separately from the reference page. Insert reflection prompts **appends** to existing remarks; it never replaces them. Ordinary Page overlays support editing the generated references and adding explicit related PDF/notebook links. Those edits, links and remarks use the existing personal-content and verified-backup pipeline. Workspace-state restore intentionally does not roll them back.

To author new public samples: edit questions.json, run `node tools/generate-interviews.mjs`, review the resulting content, update only this pack's reviewed semantic SHA-256 in `content/publication-review.json`, then run `npm run test:interviews`, `npm run validate` and the full release suite. Do not mark an unreviewed pack as approved just to bypass the publication gate. Private UI edits do not require republishing the public pack.
