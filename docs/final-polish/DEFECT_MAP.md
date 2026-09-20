# V2.1 bounded defect map

Baseline: `1151849a87c9c330c09c28319b367ba00e1101d2`, branch `v2.1stabmanualupload`.

1. Classification overrides took precedence in projections but not embedded Article/QCM source export or editors. Read composition must project legacy overrides; writes must synchronize existing metadata and override atomically. Manual Notebook placement remains independent.
2. QCM creation exposed JSON only. Add visual question/option authoring against the same QcmDocument, with no schema change. Retain stable IDs, source guards and attempt protection.
3. Capture rendered JSON targets. Derive labels through existing target/taxonomy resolution; keep exact target storage and opt-in semantics.
4. Reference rows repeated type metadata and omitted taxonomy. Group type once; show title, exact destination, taxonomy and provenance. Untitled sections must not display their internal ID.
5. Existing drag and keyboard resize functions need visible grips, focus/hover states and a larger divider hit area. Keep handlers and independent panes.
6. Browser title and More menu showed V2/2.0.0. Update presentation to V2.1 only; package remains knowledge-atlas 2.0.0.

Manual desktop review found an explanation-grid placement error in the new form; corrected before final verification and protected by a width assertion. No new subsystems or opportunistic features.

Opportunistic local fix: manual 390px Quick Capture inspection reproduced overlapping Important/Remove controls. The inherited narrow rule stretched checkboxes to 100% width. Scope the narrow checkbox width and stack text fields; add non-overlap and checkbox-width assertions to the production runtime test.
