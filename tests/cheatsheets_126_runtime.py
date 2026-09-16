"""1.2.6 normal-origin native cheatsheet release gate.
Actual application entry, durable IndexedDB, reload and fresh-context backup
restore. No in-memory mounting, intercepted network, fake storage or policy bypass.
ATLAS_DIST=dist-offline may diagnose native persistence only; it cannot clear the
integrated PDF Compare gate or certify the production bundle.
"""
import json,os,traceback,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,close_panels,open_more,open_context,open_settings,state_action,show_reader_controls,bookmark_position
from persistence_assertions import assert_personal_after_open
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.6/cheatsheets-runtime'));OUT.mkdir(parents=True,exist_ok=True)
CASES=['normal_origin','builtin_reload','private_source_persist','bookmarks_and_remarks','bookmark_anchor_restore','layouts_and_independent_panes','unsafe_source_rejection','all_workspace_saved_states','exact_backup_download','fresh_context_restore','actual_pdf_compare','no_errors']
results=[];errors=[];phase=CASES[0];page=None;compat=os.environ.get('ATLAS_DIST')=='dist-offline'
def record(detail=None):results.append({'id':phase,'status':'PASS','detail':detail});print('PASS',phase,flush=True)
def durable(p):
 p.wait_for_timeout(250);value=p.evaluate('''async()=>{const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI));const c=await m.captureWorkspaceSnapshot(),d=await m.readPersistedWorkspace();return {canonical:c.personal,durable:d.personal,canonicalOverlays:c.overlays,overlays:d.overlays};}''');assert value['canonical']==value['durable'],'Memory and durable IndexedDB personal state differ';assert value['canonicalOverlays']==value['overlays'],'Memory and durable IndexedDB overlays differ';return {'personal':value['durable'],'overlays':value['overlays']}
def search(p,title):
 close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(200)
def go(p,n):
 show_reader_controls(p);field=p.locator('.active-pane').get_by_label('Physical cheatsheet page number',exact=True);field.fill(str(n));field.press('Enter');p.wait_for_timeout(180)
def action(p,n,label):
 close_panels(p);p.locator('.active-pane').get_by_role('button',name=f'Actions for cheatsheet page {n}',exact=True).click();p.get_by_role('menuitem',name=label,exact=True).click();p.wait_for_timeout(150)
try:
 dist=ROOT/os.environ.get('ATLAS_DIST','dist')
 if not os.environ.get('ATLAS_BASE_URL') and not (dist/'index.html').exists():raise FileNotFoundError('Required application build is absent: '+str(dist/'index.html'))
 base=start_server()
 with sync_playwright() as pw:
  browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');page.get_by_role('button',name='Workspace 1',exact=True).wait_for();durable(page);record({'origin':base,'build':'compatibility' if compat else 'integrated'})
  phase='builtin_reload';search(page,'SQL for Analytics');go(page,2);expect(page.locator('.active-pane .sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','2');page.get_by_role('button',name='Two pages',exact=True).click();expected=durable(page);page.reload(wait_until='networkidle');expect(page.locator('.sheet-svg>svg')).to_have_count(2);assert_personal_after_open(durable(page)['personal'],expected['personal']);record()
  phase='private_source_persist';close_panels(page);open_more(page).get_by_role('button',name='Import cheatsheet JSON',exact=True).click();doc=json.loads((ROOT/'content/cheatsheets/sql-analytics.json').read_text());doc['id']='runtime-private-sheet';doc['title']='Private native runtime QA';doc['pages'][1]['blocks'][0]['text']='Private runtime source title';page.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(doc));page.get_by_role('button',name='Import local cheatsheet',exact=True).click();expect(page.locator('dialog[open]')).to_have_count(0);go(page,2);expect(page.locator('.active-pane .sheet-svg>svg')).to_contain_text('Private runtime source title');expected=durable(page);source_id=next(id for id,value in expected['overlays']['pages'].items() if value['page'].get('cheatsheet',{}).get('id')==doc['id']);assert expected['overlays']['pages'][source_id]['page']['cheatsheet']==doc;page.reload(wait_until='networkidle');after=durable(page);assert after['overlays']==expected['overlays'];assert_personal_after_open(after['personal'],expected['personal']);record({'sourceId':source_id})
  phase='bookmarks_and_remarks';open_context(page,'Remarks');page.get_by_label('Personal remarks',exact=True).fill('Native durable page two\nKeep exact source and reflection.');close_panels(page);action(page,2,'Bookmark');action(page,2,'Add to Read later');expected=durable(page);page.reload(wait_until='networkidle');assert_personal_after_open(durable(page)['personal'],expected['personal']);assert expected['personal']['bookmarks'][-1]['target']['kind']=='cheatsheet-page';record()
  # Exercise both shared page bookmarks and the separate current-position block anchor.
  phase='bookmark_anchor_restore'
  go(page,1);page.get_by_role('button',name='Open bookmarks',exact=True).click();page.locator('.reading-item').get_by_role('button').first.click();close_panels(page)
  expect(page.locator('.active-pane .sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','2')
  panel=open_context(page);section=doc['pages'][1]['outline'][0];panel.get_by_role('button',name=section['label'],exact=True).click();close_panels(page);bookmark_position(page)
  bookmarked=durable(page)['personal']['bookmarks'][-1];assert bookmarked['anchor']['sheetId']==doc['pages'][1]['id'];assert bookmarked['anchor']['blockId']==section['blockId']
  go(page,1);page.reload(wait_until='networkidle');page.get_by_role('button',name='Open bookmarks',exact=True).click();page.locator('.reading-item').filter(has_text=doc['title']).last.get_by_role('button').first.click();close_panels(page)
  expect(page.locator('.active-pane .sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','2')
  restored_session=durable(page)['personal']['session'];active=next(p for p in restored_session['panes'] if p['id']==restored_session['activePane']);view=next(v for v in active['views'] if v['id']==active['active']);assert view['history'][view['cursor']]['anchor']==bookmarked['anchor'];record()
  # Import through the real UI: four distinct pages must form a 2x2, then survive reload in independent panes.
  phase='layouts_and_independent_panes'
  four={'schemaVersion':'1.1','id':'runtime-four-pages','title':'Runtime four physical pages','pageSize':{'width':1200,'height':1600},'pages':[{'id':f'four.p{i}','title':f'Physical page {i}','blocks':[{'id':f'four.b{i}','type':'text','text':f'Distinct physical page {i}','role':'title'}],'frames':{f'four.b{i}':{'x':100,'y':150,'width':1000,'height':200}},'outline':[{'id':f'four.a{i}','label':f'Page {i}','blockId':f'four.b{i}'}]} for i in range(1,5)]}
  open_more(page).get_by_role('button',name='Import cheatsheet JSON',exact=True).click();page.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(four));page.get_by_role('button',name='Import local cheatsheet',exact=True).click();expect(page.locator('dialog[open]')).to_have_count(0);show_reader_controls(page)
  svg=page.locator('.active-pane .sheet-svg>svg');expect(svg).to_have_count(1)
  page.get_by_role('button',name='Two pages',exact=True).click();expect(svg).to_have_count(2);assert svg.evaluate_all('(es)=>es.map(e=>e.dataset.cheatsheetPage)')==['1','2']
  page.get_by_role('button',name='Four pages',exact=True).click();expect(svg).to_have_count(4)
  boxes=page.locator('.active-pane .sheet-figure').evaluate_all('(es)=>es.map(e=>{const b=e.getBoundingClientRect();return {page:e.dataset.physicalSheet,x:b.x,y:b.y,w:b.width,h:b.height};})')
  assert [b['page'] for b in boxes]==['1','2','3','4'];assert abs(boxes[0]['y']-boxes[1]['y'])<1 and abs(boxes[2]['y']-boxes[3]['y'])<1;assert boxes[2]['y']>boxes[0]['y']+boxes[0]['h'];assert boxes[1]['x']>boxes[0]['x']+boxes[0]['w']
  page.get_by_role('button',name='Single page',exact=True).click();go(page,3);action(page,3,'Open in other pane');show_reader_controls(page)
  panes=page.locator('.document-pane');expect(panes).to_have_count(2);a,b=panes.nth(0),panes.nth(1);before_a=durable(page)['personal']['session']['panes'][0]
  b.get_by_role('button',name='Two pages',exact=True).click();go(page,1);b.get_by_label('Cheatsheet zoom',exact=True).select_option('2');assert durable(page)['personal']['session']['panes'][0]==before_a
  expect(a.locator('.sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','3');expect(b.locator('.sheet-svg>svg')).to_have_count(2)
  expected=durable(page);page.reload(wait_until='networkidle');assert_personal_after_open(durable(page)['personal'],expected['personal']);expect(a.locator('.sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','3');expect(b.locator('.sheet-svg>svg')).to_have_count(2);record()
  # Rejected sources must leave both personal state and durable overlays exactly unchanged.
  phase='unsafe_source_rejection'
  before=durable(page);open_more(page).get_by_role('button',name='Import cheatsheet JSON',exact=True).click()
  bad=json.loads(json.dumps(four));bad['pages'][0]['blocks'][0]['svg']='<script>window.UNSAFE_NATIVE=1</script>'
  for source in ['{malformed',json.dumps(bad)]:
   page.get_by_label('Structured cheatsheet JSON',exact=True).fill(source);page.get_by_role('button',name='Import local cheatsheet',exact=True).click();expect(page.locator('dialog [role=alert]')).to_be_visible();assert durable(page)==before;assert page.evaluate('window.UNSAFE_NATIVE===undefined')
  close_panels(page);record()
  phase='all_workspace_saved_states'
  for n in range(2,6):
   close_panels(page);page.get_by_role('button',name=f'Workspace {n}',exact=True).click();search(page,'Private native runtime QA');go(page,n%2+1)
  state_action(page,'Save all workspace states');expected=durable(page);page.reload(wait_until='networkidle');assert_personal_after_open(durable(page)['personal'],expected['personal']);go(page,1);state_action(page,'Restore last all-workspaces save');restored=durable(page);assert restored['personal']['session']==expected['personal']['session'];assert restored['personal']['workspaceSlots']==expected['personal']['workspaceSlots'];record()
  phase='exact_backup_download';open_settings(page);before=durable(page)
  with page.expect_download() as dl:page.get_by_role('button',name='Download workspace backup',exact=True).click()
  backup=OUT/'native-fresh-context.atlas-backup.zip';dl.value.save_as(str(backup))
  with zipfile.ZipFile(backup) as z:payload=json.loads(z.read('backup.json'))['workspace']
  assert payload['personal']==before['personal'];assert payload['overlays']==before['overlays'];record()
  phase='fresh_context_restore';ctx.close();ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base,wait_until='networkidle');assert not durable(page)['overlays']['pages'];open_settings(page)
  page.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup));page.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();page.get_by_role('button',name='Restore verified backup',exact=True).click();expect(page.locator('dialog[open]')).to_have_count(0)
  after=durable(page);assert after['overlays']==payload['overlays'];assert_personal_after_open(after['personal'],payload['personal'])
  page.reload(wait_until='networkidle');after=durable(page);assert_personal_after_open(after['personal'],payload['personal'])
  # The overlay envelope owns pages; source IDs are keys inside that map.
  assert after['overlays']==payload['overlays']
  assert after['overlays']['pages'][source_id]['page']['cheatsheet']==doc
  page.screenshot(path=str(OUT/'native-fresh-restore.png'));record()
  phase='actual_pdf_compare'
  if compat:results.append({'id':phase,'status':'BLOCKED','error':'Compatibility build has no integrated PDF engine; cannot certify native/PDF Compare.'})
  else:
   search(page,'SQL for Analytics');go(page,2);action(page,2,'Open in other pane');search(page,'PDF reading fixture');show_reader_controls(page);expect(page.locator('.active-pane [data-page-rendered=true] canvas').first).to_be_visible(timeout=20000);expect(page.locator('.document-pane').nth(0).locator('.sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','2');page.locator('.active-pane').get_by_label('Physical PDF page number',exact=True).fill('2');page.locator('.active-pane').get_by_label('Physical PDF page number',exact=True).press('Enter');expect(page.locator('.active-pane [data-physical-page="2"][data-page-rendered=true] canvas')).to_be_visible();page.screenshot(path=str(OUT/'native-pdf-compare.png'));record()
  phase='no_errors';assert not errors,errors;record();browser.close()
except Exception as e:
 text=str(e);blocked=isinstance(e,FileNotFoundError) or 'ERR_BLOCKED_BY_ADMINISTRATOR' in text or "Executable doesn't exist" in text
 results.append({'id':phase,'status':'BLOCKED' if blocked else 'FAIL','error':text});traceback.print_exc();covered={r['id'] for r in results};results.extend({'id':name,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'} for name in CASES if name not in covered)
report={'scope':__doc__,'build':'compatibility' if compat else 'integrated','checks':results,'errors':errors,'status':'FAIL' if errors or any(r['status']=='FAIL' for r in results) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in results) else 'PASS'};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in results),'total':len(CASES)}));raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
