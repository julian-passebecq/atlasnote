"""1.2.3 real-origin saved-state release gate.
Actual production UI, IndexedDB, reload, full backup and fresh browser context.
No injected store, network interception, fake database or browser-policy bypass.
"""
import json,os,traceback,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,open_settings,open_context,close_panels
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.3/saved-states-runtime'));OUT.mkdir(parents=True,exist_ok=True)
CASES=['normal_origin','workspace_durable_save','workspace_restore_undo_isolation','all_workspaces_restore','manager_progress_history','backup_fresh_context','restored_checkpoint_usable','no_errors']
results=[];errors=[];phase='normal_origin';page=None

def record(detail=None):
 results.append({'id':phase,'status':'PASS','detail':detail});print('PASS',phase,flush=True)
def durable(p):
 p.wait_for_timeout(250)
 value=p.evaluate('''async()=>{const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI));const c=await m.captureWorkspaceSnapshot();const d=await m.readPersistedWorkspace();return {canonical:c.personal,durable:d.personal,overlays:d.overlays};}''')
 assert value['canonical']==value['durable'],'Canonical personal state differs from committed IndexedDB state'
 return {'personal':value['durable'],'overlays':value['overlays']}
def session(p,n=None):
 n=n or p['activeWorkspaceSlot'];return p['session'] if n==1 else p['workspaceSlots'][str(n)]
def search(p,title):
 close_panels(p);p.keyboard.press('Control+k');p.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(300)
def workspace(p,n):
 close_panels(p)
 if not p.locator('.library-sidebar:visible').count():p.get_by_role('button',name='Open notebook sidebar',exact=True).click()
 p.get_by_role('button',name='Workspace '+str(n),exact=True).click();p.wait_for_timeout(250)
def action(p,label,message):
 dismiss=p.get_by_role('button',name='Dismiss message',exact=True)
 if dismiss.count():dismiss.click()
 p.get_by_role('button',name=label,exact=True).click();p.locator('.toast').filter(has_text=message).wait_for();assert not p.locator('.toast.error').count()
def read_last(p,scope):
 return next(e for e in p['savedStates']['entries'] if (e['scope']=='all' if scope=='all' else e['scope']=='workspace' and e['slot']==scope))
try:
 base=start_server()
 with sync_playwright() as pw:
  browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base,wait_until='networkidle');page.get_by_role('button',name='Workspace 1',exact=True).wait_for();initial=durable(page);assert initial['personal']['schemaVersion']==3;record({'origin':base,'storage':'actual IndexedDB'})
  phase='workspace_durable_save';search(page,'One note, several ways to read');page.locator('.note-scroller').evaluate('e=>{e.scrollTop=350;e.dispatchEvent(new Event("scroll"))}');page.wait_for_timeout(400)
  action(page,'Save current workspace state','Workspace 1 saved.');saved=durable(page)['personal'];one=read_last(saved,1);assert one['session']==session(saved,1)
  page.reload(wait_until='networkidle');reloaded=durable(page)['personal'];assert reloaded==saved;assert page.locator('.note-scroller').evaluate('e=>e.scrollTop')>250;record()
  phase='workspace_restore_undo_isolation';open_context(page,'Remarks');page.locator('.remarks-input').fill('Synthetic progress written AFTER the checkpoint. Must survive restore.');page.wait_for_timeout(400);close_panels(page)
  workspace(page,2);search(page,'Read in Norwegian, keep English nearby');two=session(durable(page)['personal'],2)
  workspace(page,1);search(page,'PDF reading fixture');changed=durable(page);action(page,'Restore last workspace save','Saved state restored.');restored=durable(page)
  assert session(restored['personal'],1)==one['session'];assert session(restored['personal'],2)==two;assert restored['personal']['notes']==changed['personal']['notes'];assert restored['overlays']==changed['overlays']
  page.get_by_role('button',name='Manage saved states',exact=True).click();action(page,'Undo last restore','Saved state restored.');assert session(durable(page)['personal'],1)==session(changed['personal'],1);record()
  phase='all_workspaces_restore'
  for n in [3,4,5]:workspace(page,n);search(page,'Explain what you are learning')
  workspace(page,4);action(page,'Save all workspace states','All workspaces saved.');all_save=read_last(durable(page)['personal'],'all')
  workspace(page,2);search(page,'One note, several ways to read');workspace(page,5);action(page,'Restore last all-workspaces save','Saved state restored.');all_restored=durable(page)['personal']
  assert all_restored['activeWorkspaceSlot']==all_save['activeWorkspaceSlot']==4;assert all_restored['session']==all_save['session'];assert all_restored['workspaceSlots']==all_save['workspaceSlots'];assert len(all_restored['savedStates']['entries'])==2;record()
  phase='manager_progress_history';page.get_by_role('button',name='Manage saved states',exact=True).click();page.get_by_role('tab',name='All workspaces saves',exact=True).click();page.get_by_role('button',name='Rename / note',exact=True).click();page.get_by_role('textbox',name='Save title',exact=True).fill('Week 1 - all workspaces');page.get_by_role('textbox',name='Progress / next step',exact=True).fill('Continue at the saved reading position tomorrow.');action(page,'Save details','Save details updated.');close_panels(page)
  prior=durable(page)['personal'];assert read_last(prior,'all')['title']=='Week 1 - all workspaces';assert 'tomorrow' in read_last(prior,'all')['note'];assert prior['savedStates']['history'][0]['action']=='rename'
  page.reload(wait_until='networkidle');assert durable(page)['personal']==prior;record()
  phase='backup_fresh_context';open_settings(page);before=durable(page)
  with page.expect_download() as download:page.get_by_role('button',name='Download workspace backup',exact=True).click()
  backup=OUT/'saved-state-roundtrip.atlas-backup.zip';download.value.save_as(str(backup))
  with zipfile.ZipFile(backup) as z:
   payload=json.loads(z.read('backup.json'));assert payload['workspace']['personal']==before['personal'];assert payload['workspace']['overlays']==before['overlays']
  expected=payload['workspace'];ctx.close();ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');assert not durable(page)['personal'].get('savedStates')
  open_settings(page);page.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup));page.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();page.get_by_role('button',name='Restore verified backup',exact=True).click();page.locator('dialog').wait_for(state='detached')
  new=durable(page);assert new['personal']==expected['personal'];assert new['overlays']==expected['overlays'];page.reload(wait_until='networkidle');assert durable(page)['personal']==expected['personal'];record({'savesAndUndoAndHistoryExact':True,'freshContext':True})
  phase='restored_checkpoint_usable';workspace(page,1);action(page,'Restore last workspace save','Saved state restored.');out=durable(page)['personal'];assert session(out,1)==one['session'];assert out['notes']==expected['personal']['notes'];page.screenshot(path=str(OUT/'checkpoint-restored-after-backup.png'));record()
  phase='no_errors';assert errors==[],errors;record();browser.close()
except Exception as e:
 status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) or "Executable doesn't exist" in str(e) else 'FAIL';results.append({'id':phase,'status':status,'error':str(e)});traceback.print_exc()
 covered={r['id'] for r in results};results.extend({'id':name,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'} for name in CASES if name not in covered)
report={'scope':__doc__,'status':'FAIL' if errors or any(r['status']=='FAIL' for r in results) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in results) else 'PASS','checks':results,'errors':errors}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in results),'total':len(CASES)}));raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
