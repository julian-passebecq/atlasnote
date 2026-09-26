"""V3.1 storage recovery on a normal origin, real Chromium and real IndexedDB.

Uses the compiled compatibility entry because storage modules are shared with
production. This is NOT integrated PDF or Cloudflare Access evidence.
Only isolated Playwright profiles are modified, never an owner's browser data.
"""
import json, os, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, launch, open_settings
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v31/storage'));OUT.mkdir(parents=True,exist_ok=True)
DB="await import('/app/storage/database.js')"
READY="async()=>{const {store}="+DB+";return store.isReady&&!store.saving;}"
base=start_server(dist='dist-offline');results=[]
with sync_playwright() as pw:
 browser=launch(pw)
 def case(name,fn):
  context=browser.new_context(accept_downloads=True,viewport={'width':1440,'height':900});p=context.new_page();p.set_default_timeout(15000)
  try:
   p.goto(base,wait_until='networkidle');p.wait_for_function(READY);detail=fn(p,context)
   results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:
   results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc()
   try:p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
   except Exception:pass
  finally:
   context.close();(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2))
 def restore_after_corruption(p,context):
  p.evaluate('async()=>{const {store}='+DB+';await store.personal(p=>{p.ratings["page.atlas.welcome"]="green";});}')
  open_settings(p)
  with p.expect_download() as d:p.get_by_role('button',name='Download workspace backup',exact=True).click()
  backup=OUT/'verified.atlas-backup.zip';d.value.save_as(str(backup))
  # Future schema record is retained during failed startup.
  p.evaluate('''async()=>{const m=await import('/app/storage/database.js'),db=await m.openDatabase();
   await new Promise((ok,no)=>{const t=db.transaction('personal','readwrite'),s=t.objectStore('personal'),r=s.get('active');
    r.onsuccess=()=>s.put({...r.result,schemaVersion:99,futureMarker:'retain-until-confirmed'},'active');t.oncomplete=ok;t.onabort=()=>no(t.error);});}''')
  p.reload(wait_until='networkidle');assert p.evaluate('async()=>('+DB+').store.writesBlocked')
  open_settings(p)
  p.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup))
  p.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check()
  p.get_by_role('button',name='Restore verified backup',exact=True).click()
  expect(p.locator('dialog[open]')).to_have_count(0)
  # Deliberately no reload: readiness, authored writes and a second backup must recover now.
  info=p.evaluate('''async()=>{const {store,loadWorkspace}=await import('/app/storage/database.js');await store.whenReady();
   await store.personal(p=>{p.ratings['page.atlas.layouts']='orange';});await store.overlays(()=>{});
   const snapshot=await store.backupSnapshot();return {ready:store.isReady,hydrated:store.hydrated,blocked:store.writesBlocked,
    original:snapshot.personal.ratings['page.atlas.welcome'],next:(await loadWorkspace()).personal.ratings['page.atlas.layouts']};}''')
  assert info=={'ready':True,'hydrated':True,'blocked':False,'original':'green','next':'orange'},info
  open_settings(p)
  with p.expect_download() as d:p.get_by_role('button',name='Download workspace backup',exact=True).click()
  assert d.value.suggested_filename.endswith('.zip');p.screenshot(path=str(OUT/'restored-without-reload.png'))
  return info
 case('Verified UI restore from unreadable schema rearms writes and backup without reload',restore_after_corruption)
 def concurrent_replace(p,context):
  result=p.evaluate('''async()=>{const m=await import('/app/storage/database.js'),{assetResolver}=await import('/app/app/assets.js'),{compose}=await import('/app/core/workspace.js');
   const built=await(await fetch('/content.json')).json(),ws=await m.store.backupSnapshot(),assets=assetResolver(built,()=>compose(built,ws));let changed=false,message='';
   try{await m.restoreWorkspace(ws,async key=>{if(!changed){changed=true;const peer=await m.loadWorkspace();peer.personal.ratings['page.atlas.welcome']='orange';await m.writePersonal(peer.personal);}return assets.asset(key);});}
   catch(e){message=e.message;}finally{assets.dispose();}
   return {changed,message,kept:(await m.loadWorkspace()).personal.ratings['page.atlas.welcome']};}''')
  assert result['changed'] and 'changed while validating' in result['message'] and result['kept']=='orange',result
  return result
 case('Concurrent personal write during backup verification aborts replacement atomically',concurrent_replace)
 def staged_epoch(p,context):
  info=p.evaluate('''async()=>{const m=await import('/app/storage/database.js'),core=await import('/app/core/workspace.js'),built=await(await fetch('/content.json')).json();
   const delayed=new m.WorkspaceStore();delayed.configure(built);delayed.beginStagedBoot();delayed.setShell(await m.loadShell());
   const oldEpoch=delayed.state.history.meta.epoch,page=core.makeMarkdownPage('Concurrent V31 fixture','A phase-two consistency check.');
   await m.store.overlays(o=>{o.pages[page.id]={page};});await delayed.hydrate();delayed.markReady();
   return {oldEpoch,newEpoch:delayed.state.history.meta.epoch,overlay:!!delayed.state.overlays.pages[page.id],head:delayed.state.history.heads.some(h=>h.resourceKey==='notebook-page:'+page.id)};}''')
  assert info['newEpoch']>info['oldEpoch'] and info['overlay'] and info['head'],info
  return info
 case('Staged hydration reloads a consistent projection when a peer advances history',staged_epoch)
 def checkpoint_peer(p,context):
  p.evaluate('''async()=>{const {store}=await import('/app/storage/database.js'),{newView}=await import('/app/core/workspace.js');
   await store.personal(p=>{const v=newView('page.atlas.pdf',undefined,true);p.session.panes[0].views=[v];p.session.panes[0].active=v.id;delete p.session.surface;p.session.screen='reader';});}''')
  q=context.new_page();q.goto(base,wait_until='networkidle');q.wait_for_function(READY)
  # Real competing durable write, without the optional BroadcastChannel hint.
  q.evaluate('''async()=>{const m=await import('/app/storage/database.js'),p=(await m.loadWorkspace()).personal,v=p.session.panes[0].views[0];
   v.history[v.cursor].pdfPage=2;p.ratings['page.atlas.welcome']='green';await m.writePersonal(p);}''')
  result=p.evaluate('''async()=>{const m=await import('/app/storage/database.js');await m.store.checkpoint(p=>{const v=p.session.panes[0].views[0];v.history[v.cursor].pdfPage=5;});await m.store.flush();
   const durable=(await m.loadWorkspace()).personal,visible=m.store.state.personal;
   return {durable:durable.session.panes[0].views[0].history[0].pdfPage,visible:visible.session.panes[0].views[0].history[0].pdfPage,rating:visible.ratings['page.atlas.welcome']};}''')
  assert result=={'durable':2,'visible':5,'rating':'green'},result
  q.close();return result
 case('Same-slot checkpoint keeps the visible page while retaining the peer durable winner',checkpoint_peer)
 def invalid_restore(p,context):
  p.evaluate('async()=>{const {store}='+DB+';await store.personal(p=>{p.ratings["page.atlas.welcome"]="green";});}')
  before=p.evaluate('async()=>JSON.stringify(await ('+DB+').captureRawDatabaseState())')
  open_settings(p);p.get_by_label('Restore workspace backup',exact=True).set_input_files({'name':'invalid.zip','mimeType':'application/zip','buffer':b'not a backup'})
  expect(p.locator('dialog[open] [role="alert"]')).to_contain_text('ZIP')
  after=p.evaluate('async()=>JSON.stringify(await ('+DB+').captureRawDatabaseState())')
  assert before==after,'invalid bytes changed durable records'
  return {'unchanged':True}
 case('Invalid backup never changes any of the five stores',invalid_restore)
 browser.close()
print(json.dumps({'pass':sum(r['status']=='PASS' for r in results),'fail':sum(r['status']=='FAIL' for r in results)}))
raise SystemExit(1 if any(r['status']!='PASS' for r in results) else 0)
