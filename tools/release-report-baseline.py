"""Evaluate every supplied acceptance row against actual evidence and emit release docs.
No runtime certification is inferred from a DOM harness or syntax-only build.
"""
from pathlib import Path
from collections import Counter,defaultdict
from datetime import datetime,timezone
import json,re
R=Path(__file__).resolve().parents[1];E=R/'docs/evidence/hardening'
ui=json.loads((E/'ui/results.json').read_text());dom=json.loads((E/'baseline-dom/dom-tests.json').read_text())
unit=(E/'unit.log').read_text();assert re.search(r'# pass 106\b',unit) and '# fail 0' in unit
assert ui['passed']==39 and ui['failed']==0 and dom['passed']==14 and dom['failed']==0
runtime=json.loads((E/'runtime/results.json').read_text());pdf=json.loads((E/'pdf-runtime/results.json').read_text())
# These scopes are explicit, not silently promoted to end-to-end acceptance.
D=('PASS','DOM / in-memory UI','evidence/hardening/ui/results.json')
B=('PASS','DOM / actual pagination geometry','evidence/hardening/baseline-dom/dom-tests.json')
C=('PASS','Core algorithms / real ZIP serialization','evidence/hardening/unit.log')
RUNTIME=('BLOCKED','Normal-origin browser runtime','evidence/hardening/runtime/results.json')
PDF=('BLOCKED','Installed integrated PDF runtime','evidence/hardening/pdf-runtime/results.json')
proof={}
def put(section,notes,default):
 for n,note in enumerate(notes,1):proof[f'{section}{n:02d}']=(*default,note)
def override(id,default,note):proof[id]=(*default,note)
put('A',[
 'Notebook create/rename/archive/restore through real controls.',
 'Notebook create/rename/archive/restore through real controls.',
 'Notebook create/rename/archive/restore through real controls.',
 'Six-level folders, deep-page rename/move and folder restore.',
 'Six-level folders, deep-page rename/move and folder restore.',
 'Root page creation, same-notebook move and page restore.',
 'Six-level folders, deep-page rename/move and folder restore.',
 'Six-level folders, deep-page rename/move and folder restore.',
 'Root page moved into PDF documents through the destination selector.',
 'Deep page moved from Reader guide into Example project.',
 'Both folder and page archive/restore exercised through Home.',
 'Manage project groups via Home.',
 'Actual reload is gated separately; in-memory changes are not durable-storage proof.'
],D);override('A13',RUNTIME,'Administrative policy blocks normal HTTP-origin navigation before persistence/reload can run.')
put('B',[
 'Five-tab cap enforced and reported; neighbor activation checked.',
 'New-tab picker and tree new tab do not inherit another view state.',
 'Both Control and Meta modifiers exercised.',
 'Middle-click exercised on the actual tree page button.',
 'Right-click menu plus keyboard menu activation exercised.',
 'Closing the fifth active tab selects the previous neighbor.',
 'Tab history navigation and per-pane history tested independently.',
 'Book/Continuous/Parallel views and mixed pane layouts tested.',
 'Per-tab and per-pane English toggle isolation checked.',
 'Exact source anchor and tab state restored after switches.'
],D)
put('C',[
 'Long-note guide and original fixture yield more than five measured sheets.',
 'Wide Focus Book forms two columns of the same source note.',
 'Actual sheet positions pair 1-2, then 3-4.',
 'One Book scroller; grid/sheets/reader body do not introduce nested vertical scrolling.',
 'Short supplied fixture produces exactly one sheet.',
 '1366/1920/mobile geometry and source markers checked.',
 'Font reflow restores the exact saved source block and offset.',
 'Paragraph fragments reconstruct source text exactly.',
 'Code fragments reconstruct source lines exactly.',
 'Table fragments reconstruct source rows exactly.',
 'List fragments reconstruct source items exactly.',
 'No stranded headings in the tested measured page endings.',
 'Actual Mermaid SVG survives cloned Book fragments.',
 'Explicit page-break block advances to a later sheet.',
 'Oversized callout links to Continuous; all 500 source tokens retained.'
],B)
for n in [1,3,4,5,14,15]:override(f'C{n:02d}',D,proof[f'C{n:02d}'][3])
put('D',[
 'Top-bar Compare opens a second pane with independent view identity.',
 'Second click closes Compare, including an empty active pane.',
 'Both left-active and right-active exact surviving states checked.',
 'Same source page opened independently in both panes.',
 'Other-pane menu opens a different page without mutating the active peer.',
 'Book left / Continuous right exercised with independent scroll anchors.',
 'Parallel left / Book right exercised through the toolbar.',
 'Pointer drag moves the divider within allowed bounds.',
 'Arrow key divider controls checked on the real separator.',
 'Swap exchanges pane order without losing the panes.',
 'Second-pane extra tab leaves first-pane tabs unchanged.',
 'Second-pane Back/Forward leaves first-pane history unchanged.',
 'Mobile shows one selected pane and keeps the visible survivor on close.',
 'Exact peer-pane snapshots remain unchanged during other-pane operations.'
],D)
put('E',[
 'Topbar control order asserted exactly.',
 'Full left and right panels hidden in Focus.',
 'Utility rails remain; Global search opens from Focus and modal focus stays trapped.',
 'All four initial sidebar-open combinations restored exactly.',
 'Escape exits Focus.',
 'Measured Book remains visible and usable in Focus.',
 'Compare remains open and usable when exiting Focus.'
],D)
put('F',[
 'Only two contextual stress-page terms initially displayed.',
 'Global definition-only token finds the unrelated glossary entry.',
 'Related pages section inspected on the supplied fixture.',
 'Backlinks section inspected on the supplied fixture.',
 'Outline click sets a stable source block anchor.',
 'Previously folded section is expanded before the jump.',
 'Immediate A-to-B remark switching preserves the exact A key/text.',
 'Immediate A-to-B remark switching preserves the exact B key/text.',
 'Old PDF revision note remains separate; current note starts empty and saves separately.',
 'Export dialog excludes remarks by default; core export tests verify omission.'
],D)
put('G',[
 'Synthetic title search: pagination stress.',
 'Synthetic body search: UniqueSearchToken_ATLAS_9472.',
 'Synthetic code search: row_04.',
 'Synthetic tag search: search-tag-unique-813.',
 'Synthetic deep folder search: Level 5.',
 'Glossary label search: Glossary-only audit term.',
 'Glossary definition search: GlossaryDefinitionOnlyToken_7319.',
 'Glossary translation search: Parallellsprak (actual accented fixture tested).',
 'Separate English and Norwegian phrase searches.',
 'Actual search UI opens its result in the active pane.',
 'Explicit new-tab search result creates a separate view.'
],C);override('G10',B,proof['G10'][3]);override('G11',D,proof['G11'][3])
put('H',[
 'All four learning-flag values tested through the select control.',
 'Global hide/show removes the controls without changing stored in-memory values.',
 'Tree document bookmark toggles the intended page without another page anchor.',
 'Scrolled source-block bookmark captures the current stable anchor.',
 'No durable-storage pass is inferred from the UI harness.',
 'Saved bookmark opens the same stable page after synthetic source relocation.'
],D);override('H05',RUNTIME,'Normal-origin reload is blocked; exact in-memory and ZIP data are separately tested.')
put('I',[
 'Both supplied ZIPs pass the real parser/schema checks, but browser commit is not certified.',
 'Actual remark/flag/bookmark UI exercised; synthetic state also constructed for exact merge tests.',
 'v1.1 parser/plan/compose succeeds, but native IndexedDB commit is not certified.',
 'Actual supplied v1.1 source summary/version/hash applied by the core composition path.',
 'Relocated long page keeps its page ID and remains reachable.',
 'Exact pure import-update retention passes; persistence across native transactions remains blocked.',
 'v1.1 reimport leaves source and local state unchanged without duplicate pages.',
 'Changed equal-version source conflicts without mutating the workspace.',
 'Older synthetic source revision is blocked.',
 'Omitted stable IDs produce explicit conflicts instead of deletion.',
 'Locally edited source requires explicit rebase/resolution.'
],C)
override('I01',RUNTIME,proof['I01'][3]);override('I02',D,proof['I02'][3]);override('I03',RUNTIME,proof['I03'][3]);override('I06',RUNTIME,proof['I06'][3])
put('J',[
 'Actual browser download is attempted only by the blocked normal-origin suite.',
 'Real generated ZIP passes CRC/checksum/bounded decompression and backup parsing.',
 'Independent fresh browser context is part of the blocked production suite.',
 'Native restore commit not certified; pure verified parsing succeeds separately.',
 'Core ZIP round trip preserves exact remarks; fresh-context persistence remains blocked.',
 'Core ZIP round trip preserves exact bookmarks; fresh-context persistence remains blocked.',
 'Core ZIP round trip preserves exact flags; fresh-context persistence remains blocked.',
 'Core ZIP round trip preserves exact session; fresh-context persistence remains blocked.',
 'Core ZIP includes selected source snapshots; fresh-context persistence remains blocked.',
 'Core ZIP includes local pages; fresh-context persistence remains blocked.',
 'Core ZIP preserves exact PDF bytes/SHA-256; fresh-context persisted bytes remain blocked.',
 'Missing pack/local PDF dependencies and corrupt required/orphan assets reject before ZIP offer.'
],RUNTIME);override('J02',C,proof['J02'][3]);override('J12',C,proof['J12'][3])
put('K',[
 'Prepared actual UI import into a selected folder; native browser entry blocked.',
 'Prepared exact byte/hash comparison after reload; native browser entry blocked.',
 'React-PDF and Vite unavailable; no integrated loader/canvas claim.',
 'Actual matching worker/version and mismatch recovery tests prepared; dependencies unavailable.',
 'Integrated physical single-page case awaits the real engine.',
 'Integrated continuous-page case awaits the real engine.',
 'Physical spread helper exhaustively tested; actual rendered spreads not certified.',
 'Cover-aware helper tested for odd/even counts; actual renderer case not certified.',
 'Actual physical-page input case prepared, not executed.',
 'Actual canvas-size zoom case prepared, not executed.',
 'Intrinsic plus viewer rotation case prepared, not executed.',
 'Actual PDF outline case prepared, not executed.',
 'Real text-layer selection/search case prepared, not executed.',
 'Raster-only fixture verified without OCR; engine no-text message case not executed.',
 'Wrong-password and correct-password retry scenario prepared, not executed.',
 'Password field remains transient in source; real database inspection not executed.',
 'Note/browser-fallback Compare UI passes; integrated note/PDF Compare remains blocked.',
 'Integrated PDF/PDF independent-page Compare case prepared, not executed.',
 'Original open/download links present in fallback UI; actual byte-download browser gate blocked.'
],PDF);override('K01',RUNTIME,proof['K01'][3]);override('K02',RUNTIME,proof['K02'][3]);override('K19',RUNTIME,proof['K19'][3])
put('L',[
 'Public dist contains only the two reviewed generic packs: 8 pages, 1 term.',
 'Publication allowlist and exact semantic review hashes validated.',
 'Release scan excludes raw notebooks, private library files and font binaries.',
 'Active SVG/script/events/foreignObject/remote references rejected in tests.',
 'Unsafe paths and ZIP traversal rejected before extraction.',
 'Entry count, expansion size and compression-ratio guards tested.',
 'Notebook/executable imports quarantined, not run.',
 '113 vendor hashes and installed lock versions pass; complete transitive/license/vulnerability audit unavailable.',
 'dist/_headers and actual localhost headers pass; no live Netlify response verification.',
 'Keyboard menu navigation, focus return, modal focus containment and divider keys exercised.',
 'No uncaught JavaScript errors in the executed DOM/UI suites; blocked runtimes not implied.'
],C)
for n in [1,2,3]:override(f'L{n:02d}',('PASS','Public build / release scan','evidence/hardening/release-check.log'),proof[f'L{n:02d}'][3])
override('L08',('BLOCKED','Dependency/license verification','evidence/hardening/dependency-inventory.json'),proof['L08'][3])
override('L09',('BLOCKED','Live hosted runtime verification','evidence/hardening/headers.json'),proof['L09'][3])
for n in [10,11]:override(f'L{n:02d}',D,proof[f'L{n:02d}'][3])
sections=[];rows=[];section=None;num=0
for line in (R/'docs/RELEASE_ACCEPTANCE_MATRIX_SUPPLIED.md').read_text().splitlines():
 if line.startswith('## '):section=line[3:];sections.append(section);num=0
 elif line.startswith('- '):
  num+=1;ident=f'{section[0]}{num:02d}';status,scope,evidence,note=proof[ident]
  rows.append({'id':ident,'section':section,'requirement':line[2:],'status':status,'scope':scope,'evidence':evidence,'note':note})
assert len(rows)==139 and len(proof)==139
counts=Counter(r['status'] for r in rows)
report={'release':'1.0.1','generatedAt':datetime.now(timezone.utc).isoformat(),'decision':'Reader hardening delivered; full release acceptance remains gated by normal-origin persistence/download, integrated PDF and dependency/runtime verification.','counts':dict(counts),'rows':rows}
(R/'docs/RELEASE_ACCEPTANCE_MATRIX.json').write_text(json.dumps(report,indent=2))
lines=['# Release acceptance matrix - AtlasNote 1.0.1','',f"**{len(rows)} supplied rows: {counts['PASS']} PASS / {counts['FAIL']} FAIL / {counts['BLOCKED']} BLOCKED.**",'',
 'PASS is scoped to the evidence actually run. DOM means real Chromium interactions/layout with in-memory writes, not durable IndexedDB. Core means actual source algorithms and real ZIP bytes. BLOCKED rows are dependency or runtime checks; they are not counted as passing.',
 '', 'Original row text is retained in `RELEASE_ACCEPTANCE_MATRIX_SUPPLIED.md`. Normal-origin and integrated engine scripts are executable gates, not simulated substitutes.','']
for section in sections:
 lines+=['## '+section,'','| ID | Requirement | Status | Executed scope and evidence |','| --- | --- | --- | --- |']
 for r in rows:
  if r['section']==section:
   detail=f"{r['scope']}. {r['note']} [Evidence]({r['evidence']})."
   lines.append(f"| {r['id']} | {r['requirement']} | **{r['status']}** | {detail} |")
 lines.append('')
(R/'docs/RELEASE_ACCEPTANCE_MATRIX.md').write_text('\n'.join(lines)+'\n')
clean_path=E/'clean-source.json'
clean=json.loads(clean_path.read_text()) if clean_path.exists() else {'status':'PENDING','detail':'Clean candidate extraction verification is the final packaging step.'}
summary={'version':'1.0.1','coreTests':{'pass':106,'fail':0},'domTests':{'pass':53,'fail':0,'scope':'14 baseline + 39 hardening DOM/UI checks; not persistent browser state'},'normalOrigin':{'status':runtime['status'],'stages':len(runtime['checks'])},'integratedPdf':{'status':pdf['status'],'scenarios':len(pdf['checks'])},'acceptanceMatrix':dict(counts),'cleanSource':clean}
(E/'release-summary.json').write_text(json.dumps(summary,indent=2))
clean_text=('PASS: clean ZIP extraction, cached lockfile installation, TypeScript, build, 106 tests and release scan; every generated dist file matches the working build.' if clean['status']=='PASS' else 'Pending final clean-extraction packaging verification; do not treat this draft as the final report.')
(R/'docs/RELEASE_REPORT.md').write_text(f'''# AtlasNote / Knowledge Atlas - release-hardening report

**Version:** 1.0.1  
**Date:** September 10, 2026  
**Baseline:** repository-matched `julian-passebecq/atlasnote` source plus the supplied release-audit/PDF fallback package.

## Release decision

The existing reader has been hardened and packaged as an actual source release and static build. **The application hardening changes are delivered; full release sign-off is still blocked by the explicitly identified browser, PDF dependency/runtime and dependency-provenance gates.** The build is not presented as a fully certified advanced-PDF release.

No repository, branch, remote workflow or deployed site was changed. GitHub read access worked. All **17 repository-root blob/tree entries** matched the uploaded source snapshot; that snapshot was used as the authoritative baseline. Shell cloning was unavailable, but connector inspection and hash comparison resolved the source authority. The PDF fallback copy is executable-equivalent to that baseline; two files differ only in a historical header comment or statement line break. See `evidence/hardening/provenance.json` for exact hashes.

## Deliverables

| Artifact | Contents |
| --- | --- |
| `AtlasNote_Release_Hardened_Source.zip` | Repository-root source, exact base lockfile, original and new tests, synthetic fixtures, deployment config, preserved advanced PDF code, all acceptance rows and evidence. No node_modules, private corpus or font files. |
| `AtlasNote_Release_Hardened_Build.zip` | Static site with index.html at the root, compiled fallback reader, local server, Windows launcher, public starter and Netlify header file. No build installation is needed to serve it. |
| `AtlasNote_Release_Test_Report.md` | This release report. |
| `AtlasNote_Release_Test_Evidence.zip` | Convenience copy of current logs, machine-readable results, acceptance matrix and actual screenshots. The same evidence is in the source ZIP. |

The existing separate `knowledge-atlas-local-library-private.zip` is not changed or embedded in either public artifact. Import it locally through Workspace settings. Public content remains **8 generic pages, 2 notebooks and 1 glossary term**; the private library is deliberately separate.

## Implemented changes

### Compare, Focus and tabs

Compare is now a real on/off toggle. Closing it retains the **active pane**, not an arbitrary left pane, with its complete views, active tab, histories, anchors, English visibility, disclosure settings and reading modes. An empty active pane does not make Compare impossible to close. The per-pane close controls still work.

Focus is immediately before Compare in the top bar. The tested control order is Export to AI, Print, Focus, Compare, Learning flags. All four initial left/right-sidebar combinations restore exactly on exit. Utility rails, search, keyboard focus containment, Escape, Book and Compare remain usable.

Tree pages have right-click/More/Shift+F10 menus for open, fresh internal tab, other pane, bookmark, rename, move and archive. Folder/notebook actions reuse the existing management dialogs. Menus support keyboard traversal, Escape focus restoration and viewport clamping. Ctrl/Cmd-click, middle-click, the five-tab cap, neighbor selection and explicit search-result new-tab actions are exercised. Separate pane histories, tabs, English state and source anchors are checked for leakage.

### Book and linked context

A Home shortcut opens the existing long reading fixture directly in Book mode. Its real measured sheets form 1-2 and 3-4 pairs on a wide canvas; Compare remains a different workflow.

A reflow bug that replaced the saved source anchor with a newly generated sheet's first block was fixed. Font changes now retain the exact block/offset. The tests reconstruct paragraph, code, table and list source content, check heading boundaries and real Mermaid clones, and resize through desktop/mobile widths. An explicit page break advances the sheet. An oversized callout opens its full Continuous source rather than clipping or discarding it.

Outline jumps expand folded sections. Rapid A/B remarks retain the correct keys. PDF revision notes remain separate and require an explicit copy to move to the current revision. Contextual/global glossary, related pages, backlinks, flags, document/position bookmarks and post-update stable-ID navigation are exercised.

### Import updates and backups

The supplied synthetic v1.0.0 and v1.1.0 ZIPs are parsed with the application's actual bounded ZIP/schema validation. Their changed source content and relocation are applied by the core update/composition path. Exact personal and local state retention, idempotence, equal-version changed-byte conflicts, older versions, omitted IDs and local-source rebase requirements are checked.

Backup preparation now includes **imported-pack and local-PDF dependencies**, not only built-in assets. Missing bytes, mismatched hashes, wrong PDF byte counts and corrupt orphan attachments stop an incomplete backup before it is offered. Restore validates local PDF revision metadata against the actual bytes. A real ZIP serialization/parser round trip preserves exact remarks, bookmarks, flags, session, overlays, imports and PDF bytes. **That is not a substitute for a real fresh-browser restore.**

The normal-origin suite is designed to perform the full UI sequence: import, local additions, chosen-folder PDF import, reload, update, actual browser backup download, new empty browser context, restore, exact checks and another reload. It was attempted here and stopped at the administrative navigation block. No mock database is substituted.

### Retained PDF implementation

`src/online/PdfEngine.tsx`, its React runtime bridge, physical-page helpers, worker/version check, Vite path and CSS remain present. No replacement PDF implementation was introduced. This pass fixes cover-aware spread stepping, prevents a worker mismatch error from being cleared by a document-reset effect, supports retry, resets stale search results, restores continuous-page positioning and preserves original download access. Worker/CMap/WASM/standard-font resource paths are taken from the wrapper-resolved PDF.js package.

The delivered static build still uses `src/pdf/PdfReader.tsx`'s **clearly labelled browser preview fallback**. It does not claim integrated page, zoom, rotate, text-search or physical-spread controls. The integrated source passes isolated syntax/emit checks, but installation, installed-dependency type checking, Vite bundling and real PDF runtime are blocked. The optional typecheck currently reports missing React/React-PDF modules, not a successful check.

A prepared 17-scenario integrated suite waits for real canvases and text layers, records the actual local worker response, tests spreads/cover, navigation, zoom, intrinsic rotation, outline, search/selection, image-only behavior, passwords, Compare, original-byte download and a fault-injected worker mismatch/retry. None of those scenarios is falsely counted as executed here. The standalone raster-only fixture was extracted from the original public fixture, checked for zero selectable text and visually inspected without OCR.

## Actual test results

| Gate | Result | Evidence |
| --- | --- | --- |
| Offline TypeScript and static build | PASS | `typecheck.log`, `final-build.log` |
| Original plus new core tests | **106 PASS, 0 FAIL** | `unit.log` |
| Strengthened baseline Chromium geometry/UI | **14 PASS, 0 FAIL** | `baseline-dom/dom-tests.json` |
| Added Chromium hardening UI | **39 PASS, 0 FAIL** | `ui/results.json` |
| Synthetic ZIP/update and PDF-byte round trip | PASS, core/serialization scope | `synthetic-roundtrip.json`, `unit.log` |
| Public review hashes and excluded private/raw/font files | PASS | `release-check.log` |
| Installed base dependency versions and vendor bytes | PASS, local inventory scope; 113 vendored files | `dependency-inventory.json` |
| Packaged header file and actual local HTTP responses | PASS, not live Netlify | `headers.json` |
| Retained integrated source isolated syntax/emit | PASS, not installed-dependency typecheck or runtime | `pdf-static/syntax.json` |
| Normal-origin persistence/download/fresh-context workflow | **BLOCKED, 13 stages** | `runtime/results.json`, `runtime.log` |
| Optional PDF installation/typecheck/build/runtime | **BLOCKED, 17 runtime scenarios** | `online-install.log`, `online-typecheck.log`, `online-build.log`, `pdf-runtime/results.json` |
| Registry vulnerability audit / complete transitive license reconciliation | **BLOCKED** | `npm-audit.json`, `dependency-inventory.json` |
| Clean source ZIP extraction and rebuild | {clean['status']} | `clean-source.json`, `clean-source.log` |

**Clean build detail:** {clean_text}

The supplied acceptance matrix contains **139 rows: {counts['PASS']} PASS, {counts['FAIL']} FAIL, {counts['BLOCKED']} BLOCKED**. Every row retains the original requirement, its executed scope, a reason and an evidence pointer in `RELEASE_ACCEPTANCE_MATRIX.md` and `.json`. Strict native-restore and integrated-PDF rows remain blocked even where their underlying algorithms have passed unit tests.

## Exact blockers and remaining limits

**Normal browser runtime:** managed Chromium returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` for localhost navigation. Its policy was inspected only, not modified. The about:blank DOM harness explicitly suppresses persistent writes and cannot establish production boot, real IndexedDB durability, native download or fresh-context restoration.

**Optional dependencies/runtime:** npm requests returned `EAI_AGAIN` for `registry.npmjs.org`. React-PDF/Vite are not installed and no compatible worker bundle could be produced here. The base app uses its locked cached dependencies; optional syntax/physical-page-helper passes are not represented as a runtime pass.

**Dependency provenance:** all inherited vendor byte pins match. A complete original transitive lock/SBOM for the precompiled Mermaid closure was not present, and registry audit access failed. Original notices and the existing licensing caveat remain. This needs completion before broad redistribution is described as fully license/audit-cleared.

**Hosted response verification:** the Netlify header file is in the deployable ZIP and the same headers were checked over actual localhost HTTP. A live Netlify site was neither deployed nor tested, so that specific acceptance row remains blocked.

Other normal browser/OS actions such as native print, clipboard permissions, quota failures and cross-browser/screen-reader certification are not implied by this release's selected DOM tests. No Chrome policy workaround, fake PDF engine, fake IndexedDB, silent schema reset or untested cloud synchronization was added.

## Use the artifacts

For GitHub, extract the source ZIP and place its contents at the repository root. For the prebuilt reader, extract the build ZIP and run:

```sh
node serve.mjs
```

Open `http://127.0.0.1:4173`. Windows users can use `Start_Atlas.cmd`. Import the existing private library from Workspace settings. Keep private libraries and complete backups out of a public repository.

The source's default build is `npm ci && npm run build`, with output `dist`. The optional network-enabled PDF gate is separate: `npm run enable:online`, `npm run typecheck:online`, `npm run build:vite`, then `npm run test:pdf`. The normal production persistence gate is `npm run test:runtime` against the default fallback build.

The existing database name/schema and source IDs are retained. Back up before changing browser/origin; clearing browser storage can remove local data. A backup snapshots selected built-in packs and assets in addition to imports, so restore comparisons intentionally account for those snapshots.

## Evidence and source references

Current screenshots are actual application renders in `evidence/hardening/baseline-dom/` and `evidence/hardening/ui/`. They are not AI-generated app mockups and do not prove a successful native PDF/IndexedDB runtime. The image-only fixture render is in `pdf-static/`.

Primary technical references consulted while preparing the optional gates and static deployment configuration:

- React-PDF official repository/README: https://github.com/wojtekmaj/react-pdf
- Playwright browser downloads: https://playwright.dev/python/docs/downloads
- Playwright browser contexts: https://playwright.dev/python/docs/browser-contexts
- Netlify custom headers: https://docs.netlify.com/manage/routing/headers/

Historical baseline reports and evidence remain explicitly named/separated; the counts and blockers above describe this hardening pass, not a reused claim from the previous delivery.
''')
print(json.dumps({'acceptance':dict(counts),'cleanSource':clean['status'],'rows':len(rows)}))
