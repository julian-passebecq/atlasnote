"""Display consolidation in a disposable normal-origin profile; no owner-library proof."""
import json,os,io,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,open_settings,more_action,show_reader_controls
from v23_browser_common import AGENT,SNAPSHOT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/display-controls'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server();results=[]
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1536,'height':864},accept_downloads=True);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 p.wait_for_function('async()=>{const d=('+AGENT+').getStorageDiagnostics();return d.ready===true&&d.initialized&&d.saving===0;}',timeout=60000)
 def btn(name,scope=None):return (scope or p).get_by_role('button',name=name,exact=True)
 def flush():p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}')
 def snapshot():flush();return p.evaluate('async()=>{const m='+SNAPSHOT+';return m.readPersistedWorkspace();}')
 def go(id):
  p.goto(base+'#/page/'+id);p.wait_for_selector('.active-pane .reader-body,.active-pane .cheatsheet-reader');pane=p.locator('.active-pane')
  if pane.locator('.book-grid').count():btn('Quick Book mode',pane).click()
  return pane
 pane=go('page.atlas.layouts');history=snapshot()['history'];source=p.evaluate('async()=>('+AGENT+').getResource("notebook-page:page.atlas.layouts").snapshot')
 btn('Display',pane).click();controls=pane.get_by_role('group',name='Visible reading content',exact=True)
 for label,kind in [('Code','code'),('Tables','table'),('Images & diagrams','figure'),('Study questions','question')]:
  assert pane.locator('.unit-'+kind).count()>0,kind;controls.get_by_role('checkbox',name=label,exact=True).uncheck();expect(pane.locator('.unit-'+kind)).to_have_count(0)
 controls.get_by_role('checkbox',name='Summary & tags',exact=True).uncheck();expect(pane.locator('h1')).to_have_text('One note, several ways to read');p.screenshot(path=str(OUT/'note-display.png'))
 flush();p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .reader-display-controls');pane=p.locator('.active-pane');expect(pane.locator('.unit-code')).to_have_count(0);assert snapshot()['history']==history
 assert p.evaluate('async()=>('+AGENT+').getResource("notebook-page:page.atlas.layouts").snapshot')==source
 btn('Show all content',pane).click();assert pane.locator('.unit-code').count()>0
 btn('Collapse all sections',pane).click();expect(pane.locator('.section-toggle[aria-expanded="false"]').first).to_be_visible();btn('Expand all sections',pane).click();expect(pane.locator('.section-toggle[aria-expanded="false"]')).to_have_count(0)
 btn('Display',pane).click();btn('Quick Book mode',pane).click();btn('Display',pane).click();pane.get_by_role('checkbox',name='Code',exact=True).uncheck();expect(pane.locator('.book-grid .unit-code')).to_have_count(0);assert not pane.locator('.book-fallback').count()
 results.append({'name':'Notes hide content groups, persist on reload and reflow Book without changing source/history','status':'PASS'})
 pane=go('page.v3seed.window-functions');btn('Display',pane).click();pane.get_by_role('checkbox',name='Sources',exact=True).uncheck();expect(pane.locator('.page-sources')).to_have_count(0)
 table=pane.locator('.csv-interactive').first;headings=table.locator('thead th').all_text_contents();btn('Columns',table).click();btn(headings[1],table.get_by_role('group',name='Visible table columns',exact=True)).click();expect(table.locator('td[data-column="1"]')).to_have_count(0)
 btn('Compare in two panes').click();expect(p.locator('.document-pane')).to_have_count(2);p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("notebook-page:page.v3seed.window-functions").target,"here");}')
 panes=p.locator('.document-pane');left=panes.nth(0);right=panes.nth(1);expect(right.locator('.page-sources')).to_be_visible();expect(left.locator('.page-sources')).to_have_count(0)
 btn('Display',right).click();right.get_by_role('checkbox',name='Code',exact=True).uncheck();expect(right.locator('.unit-code')).to_have_count(0);assert left.locator('.unit-code').count()>0
 results.append({'name':'General technical tables have column masks; notes retain independent A/B display and source controls','status':'PASS'})
 # Import a private synthetic Markdown note through the existing preview/confirm UI.
 note={'id':'page.display.markdown','title':'Display Markdown fixture','summary':'Synthetic only','tags':['subject:it','lang:en'],'sources':[],'terms':[],'related':[],'blocks':[{'id':'display.md','type':'markdown','text':'| Name | Kind | Detail |\n|---|---|---|\n| Amount | column | currency |\n| Total | measure | sum |'}]}
 manifest={'format':'atlas-content-pack','schemaVersion':1,'payloadSchema':'atlas.bundle@2','id':'display.synthetic','version':'1.0.0','title':'Display synthetic','visibility':'private','files':{'projects':'projects.json','pages':'pages','glossary':'glossary.json'},'requires':[],'assets':[]}
 project={'id':'project.display.synthetic','title':'Display fixture','icon':'book','description':'Synthetic test','nodes':[{'id':'node.display.markdown','pageId':note['id'],'title':note['title']}]}
 files={'workspace.json':{'format':'atlas-workspace','schemaVersion':1,'title':'Display fixture','packsDirectory':'packs','disabledPackIds':[],'groups':[]},'packs/display/atlas-pack.json':manifest,'packs/display/projects.json':[project],'packs/display/glossary.json':[],'packs/display/pages/note.json':note}
 archive=io.BytesIO()
 with zipfile.ZipFile(archive,'w') as z:
  for name,data in files.items():z.writestr(name,json.dumps(data))
 (OUT/'fixture.zip').write_bytes(archive.getvalue())
 open_settings(p);p.get_by_label('Import library ZIP',exact=True).set_input_files({'name':'display-synthetic.zip','mimeType':'application/zip','buffer':archive.getvalue()});(OUT/'import-ui.txt').write_text(p.locator('body').inner_text(),encoding='utf-8');expect(btn('Confirm library import')).to_be_enabled();btn('Confirm library import').click();expect(p.get_by_role('status').filter(has_text='Library imported.')).to_be_visible();btn('Close dialog').click()
 pane=go(note['id']);table=pane.locator('.csv-interactive');btn('Columns',table).click();btn('Detail',table.get_by_role('group',name='Visible table columns',exact=True)).click();expect(table.locator('td[data-column="2"]')).to_have_count(0)
 results.append({'name':'Markdown table controls resolve their own source table without rewriting Markdown','status':'PASS'})
 imported_history=snapshot()['history']
 pane=go('page.cheatsheet.azure-data-factory');btn('Display',pane).click();code=pane.locator('[data-block-kind="code"]');assert code.count()>0
 original_frames=code.evaluate_all('es=>es.map(e=>e.getAttribute("data-frame"))');original=p.evaluate('async()=>('+AGENT+').getResource("cheatsheet:page.cheatsheet.azure-data-factory").snapshot')
 pane.get_by_role('checkbox',name='Code',exact=True).uncheck();assert code.evaluate_all('es=>es.every(e=>getComputedStyle(e).visibility==="hidden")');assert code.evaluate_all('es=>es.map(e=>e.getAttribute("data-frame"))')==original_frames
 p.screenshot(path=str(OUT/'cheatsheet-display.png'));flush();p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .reader-hide-code');pane=p.locator('.active-pane')
 assert p.evaluate('async()=>('+AGENT+').getResource("cheatsheet:page.cheatsheet.azure-data-factory").snapshot')==original
 show_reader_controls(p,pane)
 with p.expect_download() as download:btn('Export cheatsheet JSON',pane).click()
 exported=json.loads(Path(download.value.path()).read_text(encoding='utf-8-sig'));assert exported==original['page']['cheatsheet']
 btn('Show all content',pane).click();assert pane.locator('[data-block-kind="code"]').evaluate_all('es=>es.every(e=>getComputedStyle(e).visibility==="visible")')
 results.append({'name':'Cheatsheet masks retain fixed geometry, source and complete JSON export and survive reload','status':'PASS'})
 assert snapshot()['history']==imported_history,'Display must not create authored revisions'
 pane=go(note['id']);btn('Display',pane).click();pane.get_by_role('checkbox',name='Tables',exact=True).uncheck();expect(pane.locator('.unit-table')).to_have_count(0)
 p.evaluate('()=>{window.print=()=>{const root=document.querySelector(".print-projection");window.displayPrintTrace={headers:[...root.querySelectorAll("th")].map(e=>e.textContent),rows:root.querySelectorAll("tbody tr").length,controls:root.querySelectorAll(".reader-display-controls,.table-column-tools").length};};}')
 more_action(p,'Print or Save as PDF');p.get_by_role('checkbox',name='I reviewed the private content and explicitly approve including it in this printout.',exact=True).check();btn('Open browser print dialog').click();p.wait_for_function('()=>!!window.displayPrintTrace')
 assert p.evaluate('()=>window.displayPrintTrace')=={'headers':['Name','Kind','Detail'],'rows':2,'controls':0}
 results.append({'name':'Complete print projection ignores reading masks; all display changes retain immutable authored history (not native printer proof)','status':'PASS'})
 assert not errors,errors;b.close()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2),encoding='utf-8');print(json.dumps(results,indent=2))
