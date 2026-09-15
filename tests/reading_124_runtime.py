from persistence_assertions import assert_workspace_after_open
from browser_support import state_action,open_context
"""1.2.4 normal-origin gate: real production UI, IndexedDB and fresh backup restore.
Never loads the about:blank harness or replaces storage/network implementations.
"""
import json,os,traceback,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,close_panels,open_settings,show_reader_controls
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.4/reading-runtime'));OUT.mkdir(parents=True,exist_ok=True)
CASES=['normal_origin','bookmark_category','queue_url','pdf_category_page_queue','grid_and_workspace_routing','checkpoint_shared_lists','reload_exact','fresh_backup_restore','restored_links','no_errors']
results=[];errors=[];phase='normal_origin';page=None

def durable(p):
 value=p.evaluate('''async()=>{const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI));const a=await m.captureWorkspaceSnapshot(),b=await m.readPersistedWorkspace();return {canonical:a.personal,personal:b.personal,overlays:b.overlays};}''')
 assert value['canonical']==value['personal'],'Canonical reading state differs from IndexedDB';return {'personal':value['personal'],'overlays':value['overlays']}
def record(detail=None):results.append({'id':phase,'status':'PASS','detail':detail});print('PASS',phase,flush=True)
def search(p,title):
 close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(250)
def session(v,n=None):
 n=n or v.get('activeWorkspaceSlot',1);return v['session'] if n==1 else v['workspaceSlots'][str(n)]
def settle(p):p.wait_for_timeout(250);return durable(p)
try:
 base=start_server()
 with sync_playwright() as pw:
  browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');page.get_by_role('button',name='Workspace 1',exact=True).wait_for();assert durable(page)['personal']['schemaVersion']==3;record({'origin':base,'storage':'IndexedDB'})
  phase='bookmark_category';search(page,'Read in Norwegian, keep English nearby');page.get_by_role('button',name='Open bookmarks',exact=True).click();page.get_by_role('button',name='Bookmark current position',exact=True).click();expect(page.locator('.reading-item')).to_have_count(1);page.get_by_role('button',name='Edit',exact=True).click();page.get_by_label('Reading item title',exact=True).fill('Language review');page.get_by_label('Reading item note',exact=True).fill('Finish the example');page.get_by_label('Reading item category',exact=True).select_option('norsk');page.get_by_role('button',name='Save reading details',exact=True).click();v=settle(page);assert v['personal']['bookmarks'][0]['category']=='norsk';record()
  phase='queue_url';close_panels(page);page.get_by_role('button',name='Open read later',exact=True).click();page.locator('.category-tabs').get_by_role('tab',name='Cloud',exact=True).click();requests=[];page.on('request',lambda r:requests.append(r.url));page.get_by_label('Web address to read later',exact=True).fill('https://example.org/reading');page.get_by_role('button',name='Add web address to Read later',exact=True).click();expect(page.locator('.reading-item')).to_have_count(1);v=settle(page);assert v['personal']['readLater'][0]['category']=='cloud';assert not any('example.org' in u for u in requests);record()
  phase='pdf_category_page_queue';search(page,'PDF reading fixture');page.locator('.active-pane .integrated-pdf[data-pdf-state=ready] canvas').first.wait_for();page.locator('[data-node-id="node.page.atlas.pdf"] .tree-expander').click();page.get_by_role('button',name='Expand PDF category Reading a PDF',exact=True).click();page.locator('.pdf-study-page[data-pdf-page="3"] .study-actions').first.click();page.get_by_role('menuitem',name='Add to Read later',exact=True).click();settle(page);page.get_by_role('button',name='Actions for PDF category Reading a PDF',exact=True).click();page.get_by_role('menuitem',name='Add to Read later',exact=True).click();v=settle(page);assert {e['target']['kind'] for e in v['personal']['readLater']}=={'url','pdf-page','pdf-category'};record()
  phase='grid_and_workspace_routing';page.get_by_role('button',name='Quick four-page PDF grid',exact=True).click();expect(page.locator('.active-pane .pdf-grid canvas')).to_have_count(4);v=settle(page);first=session(v['personal']);assert first['panes'][0]['views'][0]['history'][-1]['pdfMode']=='grid';page.locator('.pdf-study-page[data-pdf-page="4"] .study-actions').first.click();page.get_by_role('menuitem',name='Open in workspace...',exact=True).click();page.get_by_role('menuitem',name='Open in Workspace 2',exact=True).click();page.locator('.active-pane .integrated-pdf[data-pdf-state=ready] canvas').first.wait_for();v=settle(page);assert session(v['personal'],1)==first;assert session(v['personal'],2)['panes'][0]['views'][0]['history'][0]['pdfPage']==4;record()
  phase='checkpoint_shared_lists'
  state_action(page,'Save current workspace state');settle(page)
  state_action(page,'Save all workspace states');checkpoint=settle(page)['personal']
  page.get_by_role('button',name='Open bookmarks',exact=True).click();page.get_by_role('button',name='Bookmark current position',exact=True).click();close_panels(page)
  page.get_by_role('button',name='Open read later',exact=True).click();page.get_by_label('Web address to read later',exact=True).fill('http://example.org/after-checkpoint');page.get_by_role('button',name='Add web address to Read later',exact=True).click();newer=settle(page)['personal'];close_panels(page)
  assert len(newer['bookmarks'])==len(checkpoint['bookmarks'])+1
  assert len(newer['readLater'])==len(checkpoint['readLater'])+1
  shared={key:newer[key] for key in ['bookmarks','readLater']}
  search(page,'Read in Norwegian, keep English nearby')
  assert session(settle(page)['personal'],2)!=session(checkpoint,2)
  state_action(page,'Restore last workspace save');restored=settle(page)['personal']
  assert session(restored,2)==session(checkpoint,2)
  assert {key:restored[key] for key in shared}==shared
  page.get_by_role('button',name='Workspace 3',exact=True).click();search(page,'Read in Norwegian, keep English nearby')
  state_action(page,'Restore last all-workspaces save');restored=settle(page)['personal']
  assert restored['activeWorkspaceSlot']==checkpoint['activeWorkspaceSlot']
  assert restored['session']==checkpoint['session'] and restored['workspaceSlots']==checkpoint['workspaceSlots']
  assert {key:restored[key] for key in shared}==shared
  page.locator('.active-pane .integrated-pdf[data-pdf-state=ready] canvas').first.wait_for();record({'workspaceAndAllRestore':'exact sessions; newer shared lists retained'})
  phase='reload_exact';before=durable(page);page.reload(wait_until='networkidle');page.locator('.active-pane .integrated-pdf[data-pdf-state=ready] canvas').first.wait_for();assert_workspace_after_open(durable(page),before);record()
  phase='fresh_backup_restore';close_panels(page);open_settings(page);before=durable(page)
  with page.expect_download() as transfer:page.get_by_role('button',name='Download workspace backup',exact=True).click()
  archive=OUT/'reading-managers.atlas-backup.zip';transfer.value.save_as(str(archive))
  with zipfile.ZipFile(archive) as z:payload=json.loads(z.read('backup.json'))['workspace'];assert payload['personal']==before['personal'];assert payload['overlays']==before['overlays']
  ctx.close();ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');assert not durable(page)['personal'].get('readLater');open_settings(page);page.get_by_label('Restore workspace backup',exact=True).set_input_files(str(archive));page.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();page.get_by_role('button',name='Restore verified backup',exact=True).click();page.locator('dialog').wait_for(state='detached');page.locator('.active-pane .integrated-pdf[data-pdf-state=ready] canvas').first.wait_for();assert_workspace_after_open(durable(page),before);page.reload(wait_until='networkidle');page.locator('.active-pane .integrated-pdf[data-pdf-state=ready] canvas').first.wait_for();assert_workspace_after_open(durable(page),before);record({'readingListsAndSessions':'exact','freshContext':True})
  phase='restored_links';page.get_by_role('button',name='Open read later',exact=True).click();page.locator('.reading-item').filter(has_text='Landscape table').locator('.reading-open').click();page.locator('.active-pane [data-physical-page="3"] canvas').wait_for();v=settle(page);s=session(v['personal']);pane=next(x for x in s['panes'] if x['id']==s['activePane']);view=next(x for x in pane['views'] if x['id']==pane['active']);assert view['history'][view['cursor']]['pdfPage']==3;record()
  phase='no_errors';assert not errors,errors;record();browser.close()
except Exception as e:
 status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) or "Executable doesn't exist" in str(e) else 'FAIL';results.append({'id':phase,'status':status,'error':str(e)});traceback.print_exc()
 done={r['id'] for r in results};results.extend({'id':c,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'} for c in CASES if c not in done)
report={'scope':'Production app on normal HTTP origin, real IndexedDB and downloaded ZIP/fresh restore','checks':results,'errors':errors};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));raise SystemExit(1 if any(r['status']=='FAIL' for r in results) else 2 if any(r['status']=='BLOCKED' for r in results) else 0)
