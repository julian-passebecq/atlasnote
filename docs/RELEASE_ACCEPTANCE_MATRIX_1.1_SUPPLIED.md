# AtlasNote 1.1 acceptance matrix

The implementing Pro model must mark every applicable row PASS / FAIL / BLOCKED and cite test/log/screenshot evidence. Do not convert BLOCKED to PASS based on code inspection alone.

## A. Baseline safety

1. Clean baseline dependency install/cache restore succeeds where environment allows.
2. `npm run validate` passes.
3. `npm run typecheck` passes.
4. `npm test` passes.
5. `npm run check:release` passes.
6. Existing browser/DOM/hardening tests remain green.
7. No private corpus/private PDF is added to public source or `dist`.
8. Existing stable Page/Block/Document IDs are preserved.
9. Existing import conflict semantics are preserved.
10. Existing complete-backup attachment validation is preserved.

## B. True Focus

11. Focus content begins at the top edge of the app viewport.
12. Focus content extends to the bottom edge of the app viewport (`100dvh`).
13. App top bar/search is removed from layout, not merely transparent.
14. Full left project sidebar is removed.
15. Left utility rail is removed.
16. Full right context sidebar is removed.
17. Collapsed right rail is removed.
18. Bottom status bar is removed.
19. Pane tab strip is removed.
20. Breadcrumb and per-pane reader toolbar are removed.
21. Small Exit Focus affordance remains reachable.
22. Escape exits Focus.
23. Focus entry preserves semantic source anchor.
24. Focus exit restores exact semantic source anchor.
25. Prior sidebar/open-state preferences restore after Focus exit.
26. Focus + Book uses available width for true two-sheet spread when possible.
27. Focus + Compare shows only two content panes, divider, and Exit Focus affordance.
28. Focus works for PDF content and gives the PDF maximum canvas.

## C. Compare / Split

29. Compare opens a second independent pane.
30. New Compare pane starts empty with content picker; it does not clone current page.
31. New pane becomes active so the next tree/search/collection selection opens there.
32. Compare button toggles split off.
33. Toggling off retains the active non-empty pane.
34. Last user-resized ratio is remembered when Compare is reopened.
35. Divider pointer drag works.
36. Divider keyboard resizing works.
37. Each pane retains independent tab sets.
38. Each tab retains independent Back/Forward history.
39. Each tab retains independent reading anchor.
40. Each pane/tab retains independent Continuous/Book/Parallel mode.
41. Each pane/tab retains independent PDF view state.
42. Each pane/tab retains independent English visibility.
43. Note + note works.
44. Note + PDF works.
45. PDF + note works.
46. PDF + PDF works.
47. Same document can intentionally be opened twice with independent reading positions.
48. Mobile/narrow layout does not discard hidden pane state.

## D. Book

49. Existing measured/block-aware paginator remains in use.
50. Book uses one note, not two independent documents.
51. Long fixture produces multiple virtual sheets.
52. Wide view displays consecutive paired sheets 1-2 then 3-4 on vertical scroll.
53. Virtual sheet numbers are not persisted as canonical document identity.
54. Paragraph reconstruction is lossless.
55. Code-line reconstruction is lossless.
56. Table-row reconstruction is lossless.
57. List-item reconstruction is lossless.
58. Headings are not stranded where avoidable.
59. Explicit page breaks are honored.
60. Oversized unsplittable blocks degrade safely/readably.
61. Resize/re-theme/refont repaginates and restores semantic source anchor.

## E. Themes

62. `fluent` is visibly Microsoft Fluent-like.
63. `neutral` is visibly minimal/light.
64. `academic` is visibly medium/paper-like.
65. Themes change semantic surfaces beyond only one accent color.
66. Navigation, tabs, cards, callouts, code, tables, Book canvas/sheets, collection view, and PDF chrome all respect tokens.
67. Theme persists after reload.
68. Theme change does not alter data/state identities.
69. Contrast and focus visibility remain accessible.

## F. Folder collection / metadata facets

70. Selecting a folder can show a derived collection view.
71. Tree remains the single source of hierarchy truth.
72. Mixed note/PDF direct children render with distinct type icon.
73. PDF page count appears when known.
74. Language appears when known.
75. Summary/attribution appears when available.
76. Learning flag appears when flag display is enabled.
77. All / Notes / PDFs filter works.
78. Language filter works.
79. Domain filter works from namespaced tags.
80. Technology filter works from namespaced tags.
81. Text filter works.
82. Default sort is tree order.
83. Optional title sort works.
84. Normal open works.
85. Ctrl/Cmd-click opens internal new tab.
86. Middle-click opens internal new tab.
87. Context menu exposes Open in new tab / other pane / move / bookmark / archive as applicable.
88. One document is not duplicated into multiple canonical tree placements.
89. Cross-domain relevance is discoverable via tags/search/related links.

## G. Local/private PDF intake

90. User can select a PDF from disk.
91. User can choose target notebook/project.
92. User can choose an existing nested folder.
93. User can create a target folder during intake.
94. User can set/edit title.
95. User can set primary language.
96. User can set document type/domain/technology/source facets without editing JSON.
97. Default uncertain rights are reference-only/unreviewed, not public/permission.
98. Exact original/imported PDF bytes are stored locally.
99. Imported PDF appears as a normal PDF tree leaf.
100. PDF can be moved to another folder without changing page/document identity.
101. PDF title/tag/path is searchable.
102. Reload preserves PDF metadata/tree placement/bytes.
103. Complete backup includes exact local PDF bytes.
104. Fresh-context restore recovers the same PDF bytes and hierarchy.
105. Remarks/bookmarks bind to document revision + physical page/anchor.
106. Passwords are never persisted in backup/local metadata.

## H. Private/repository PDF pack

107. Included sample PDF-library builder produces a valid Atlas workspace ZIP.
108. AtlasNote's actual `readWorkspace()` accepts the generated sample.
109. Pack-file PDF hash is validated.
110. Tampered PDF is rejected.
111. Missing PDF is rejected.
112. PDF >20 MiB is rejected by existing safety policy.
113. Duplicate byte-identical PDFs are detected by SHA-256 before pack creation.
114. Metadata maps correctly: language -> DocumentEntry; primary placement -> tree; facets -> namespaced Page tags; source/rights -> provenance.
115. Pack import is idempotent according to existing version/hash semantics.
116. Private PDF library stays out of public `dist`.

## I. PDF preparation / compression

117. Processor rejects non-PDF signature.
118. Processor records original SHA-256, bytes, page count, and selectable-text fingerprint when available.
119. Default profile performs structural/lossless cleanup first.
120. `study` profile changes embedded images only when useful; it does not rasterize whole pages.
121. `compact` profile requires explicit opt-in.
122. Page count is identical before/after processing.
123. Existing normalized selectable text is identical before/after processing.
124. If optimized result is larger, original is retained.
125. Processing report records profile, original/optimized bytes, hashes, ratio, processor, timestamp.
126. Lossy processing produces render/diff QA evidence.
127. Operational warning is emitted above 12 MiB.
128. Hard limit remains 20 MiB for pack assets.
129. Rights/provenance are never upgraded by the processor.
130. Raw incoming files and generated `out/` are gitignored in the PDF repo template.

## J. Integrated PDF reader

131. Existing advanced React-PDF implementation remains source-compatible.
132. If packages are available, integrated build type-checks and bundles.
133. React-PDF/PDF.js worker versions match.
134. Worker loads on local preview and static-host path.
135. CMaps come from matching PDF.js version.
136. WASM comes from matching PDF.js version.
137. Standard-font data comes from matching PDF.js version or unsupported cases are documented.
138. Single physical page mode works.
139. Continuous physical page mode works.
140. Two-page physical spread works.
141. Cover-alone works.
142. Physical page input/previous/next works.
143. Zoom works.
144. Rotation works, including intrinsically rotated fixture.
145. Outline works when PDF contains one.
146. Selectable-text search works.
147. Image-only PDF reports no selectable text; no fake OCR.
148. Password prompt/retry/cancel works and remains memory-only.
149. Corrupt bytes fail safely with original-recovery path.
150. Browser preview fallback remains clearly labelled if integrated engine cannot be certified.

## K. Repository / release process

151. AtlasNote source remains on `improvement/atlasnote-1.1-reader-pdf-library` until CI/preview approval.
152. No direct Pro push/merge/deploy is required.
153. Separate PDF repository uses one `main` branch; topic categories are not branches.
154. Temporary PDF ingest branches are batch/review branches only.
155. LinkedIn/reference PDFs with unclear rights are kept private/local.
156. Public app does not attempt authenticated fetches from private GitHub.
157. Source ZIP is complete, not patch-only.
158. Build ZIP is reproducible from delivered source when dependencies are available.
159. Release report distinguishes PASS / FAIL / BLOCKED.
160. Test evidence contains logs + screenshots/results for each major gate.
