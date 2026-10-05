"""Integrated CSV import and bilingual table reading with real IndexedDB.
Disposable local profile; synthetic sentences only. No live-library proof.
"""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,open_settings,more_action
from v23_browser_common import AGENT,SNAPSHOT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/csv-tables'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server();results=[]
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1536,'height':864},accept_downloads=True);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 def btn(name,scope=None):return (scope or p).get_by_role('button',name=name,exact=True)
 def snapshot():return p.evaluate('async()=>{const m='+SNAPSHOT+';return await m.readPersistedWorkspace();}')
 before=snapshot();open_settings(p)
 csv='Norsk,English,Forms,Example\n'+''.join('"Jeg leser ord '+str(i)+'","I read word '+str(i)+'",leser,"Synthetic example '+str(i)+'"\n' for i in range(65))
 p.get_by_label('Import CSV table',exact=True).set_input_files({'name':'synthetic-words.csv','mimeType':'text/csv','buffer':csv.encode('utf-8')})
 expect(btn('Confirm library import')).to_be_enabled()
 assert snapshot()['history']==before['history'],'CSV preview must not write authored history'
 btn('Confirm library import').click();expect(p.get_by_role('status').filter(has_text='Library imported.')).to_be_visible()
 btn('Close dialog').click()
 after=snapshot();pack=next(x for x in after['imports'] if x['manifest']['id'].startswith('csv.local.'))
 pages=pack['pages'];assert len(pages)==2;assert sum(len(x['blocks'][0]['rows']) for x in pages)==65
 assert after['overlays']['categories'][pack['projects'][0]['id']]=='norsk'
 assert len(after['history']['revisions'])>len(before['history']['revisions'])
 results.append({'name':'CSV preview is read-only; confirmation commits all 65 rows and history atomically','status':'PASS'})
 page_id=pages[0]['id'];p.goto(base+'#/page/'+page_id);p.wait_for_selector('.active-pane .table-column-tools')
 pane=p.locator('.active-pane');book=pane.locator('.book-grid')
 if book.count():btn('Quick Book mode',pane).click()
 expect(pane.locator('.continuous-content tbody tr')).to_have_count(40)
 assert pane.locator('.continuous-content').evaluate('e=>e.getBoundingClientRect().width>e.parentElement.getBoundingClientRect().width-8')
 assert len(set(pane.locator('tbody tr').evaluate_all('es=>es.map(e=>getComputedStyle(e).backgroundColor)')))==1
 source=p.evaluate('async(id)=>{const a='+AGENT+';return a.getResource("notebook-page:"+id).snapshot.page;}',page_id)
 btn('Columns',pane).click();btn('English',pane).click();expect(pane.locator('thead')).not_to_contain_text('English')
 btn('Example',pane).click();expect(pane.locator('thead')).to_contain_text('Example')
 btn('English',pane).click();btn('Forms',pane).click();btn('Example',pane).click();btn('Columns',pane).click()
 btn('NO / EN',pane).click();expect(pane.locator('.csv-layout-pairs')).to_be_visible()
 row=pane.locator('tbody tr').first
 cells=row.locator('td').evaluate_all('es=>es.map(e=>({rect:e.getBoundingClientRect().toJSON(),weight:getComputedStyle(e).fontWeight}))')
 assert len(cells)==2 and cells[1]['rect']['x']>cells[0]['rect']['x'] and cells[0]['weight']=='700',cells
 p.screenshot(path=str(OUT/'pairs.png'))
 btn('Lines',pane).click();expect(pane.locator('.csv-layout-lines')).to_be_visible()
 cells=row.locator('td').evaluate_all('es=>es.map(e=>({rect:e.getBoundingClientRect().toJSON(),weight:getComputedStyle(e).fontWeight}))')
 assert cells[1]['rect']['y']>=cells[0]['rect']['bottom'] and cells[0]['weight']=='700',cells
 p.screenshot(path=str(OUT/'lines.png'))
 results.append({'name':'Column recall, bold Norwegian/English alignment and stacked Lines preserve source','status':'PASS'})
 p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}')
 p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .csv-layout-lines')
 assert p.locator('.active-pane tbody tr').count()==40
 btn('Compare in two panes').click();expect(p.locator('.document-pane')).to_have_count(2)
 panes=p.locator('.document-pane');right=panes.nth(1);left=panes.nth(0)
 p.evaluate('async(id)=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("notebook-page:"+id).target,"here");}',page_id)
 btn('Table',right).first.click();expect(right.locator('.csv-layout-table')).to_be_visible();expect(left.locator('.csv-layout-lines')).to_be_visible()
 results.append({'name':'Reading layout persists through reload; pane B preferences remain independent of A','status':'PASS'})
 # Book pagination clones the delegated controls; columns/layout must still work.
 if not right.locator('.book-grid').count():btn('Quick Book mode',right).click()
 expect(right.locator('.book-grid .book-sheet').first).to_be_visible()
 btn('NO / EN',right.locator('.book-grid')).first.click();expect(right.locator('.book-grid .csv-layout-pairs').first).to_be_visible()
 btn('Columns',right.locator('.book-grid')).first.click();btn('English',right.locator('.book-grid')).first.click()
 expect(right.locator('.book-grid td[data-column="1"]')).to_have_count(0)
 assert not right.locator('.book-fallback').count()
 results.append({'name':'Book sheets retain functional cloned column/layout controls without fallback or lost rows','status':'PASS'})
 assert p.evaluate('async(id)=>{const a='+AGENT+';return a.getResource("notebook-page:"+id).snapshot.page;}',page_id)==source
 # Observe the actual app's print projection at its native print call. The browser
 # dialog is stubbed only in this disposable test; this is not printer/PDF proof.
 p.evaluate('''()=>{window.print=()=>{const container=document.querySelector('.print-projection');window.csvPrintTrace={headings:[...container.querySelectorAll('th')].map(e=>e.textContent),rows:container.querySelectorAll('tbody tr').length,controls:container.querySelectorAll('.table-column-tools').length};};}''')
 more_action(p,'Print or Save as PDF')
 p.get_by_role('checkbox',name='I reviewed the private content and explicitly approve including it in this printout.',exact=True).check()
 btn('Open browser print dialog').click();p.wait_for_function('()=>!!window.csvPrintTrace');projection=p.evaluate('()=>window.csvPrintTrace')
 assert projection=={'headings':['Norsk','English','Forms','Example'],'rows':40,'controls':0},projection
 results.append({'name':'Print component retains all source columns and rows, independent of recall masks (not native printer proof)','status':'PASS'})
 assert not errors,errors
 b.close()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2),encoding='utf-8');print(json.dumps(results,indent=2))
