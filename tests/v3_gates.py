"""V3 acceptance gates MEM-01, DATA-03 and UI-01 on the integrated build
(Playwright Chromium, real IndexedDB). Not physical-device evidence."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/gates'));OUT.mkdir(parents=True,exist_ok=True)
COUNT_URLS="""(()=>{const live=new Set(),c=URL.createObjectURL.bind(URL),r=URL.revokeObjectURL.bind(URL);URL.createObjectURL=o=>{const u=c(o);live.add(u);return u;};URL.revokeObjectURL=u=>{live.delete(u);return r(u);};window.__liveObjectUrls=()=>live.size;})()"""
DIAG='async()=>('+AGENT+').getStorageDiagnostics()'
READY='async()=>{const d=('+AGENT+').getStorageDiagnostics();return d.ready!==false&&d.initialized&&!d.saving;}'
RAW="""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 const v=await new Promise(ok=>{const r=db.transaction('personal').objectStore('personal').get('active');r.onsuccess=()=>ok(r.result);});db.close();return v;}"""
results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);errors=[]
 def check(name,fn,page=None):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc()
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))

 def mem01():
  ctx=b.new_context(viewport={'width':1440,'height':900});ctx.add_init_script(COUNT_URLS);p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto(base,wait_until='networkidle');p.wait_for_function(READY)
  p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
  p.locator('.active-pane [data-page-rendered="true"] canvas').first.wait_for()
  def sample():return {'listeners':p.evaluate(DIAG)['archiveListeners'],'urls':p.evaluate('window.__liveObjectUrls()')}
  base_line=sample();slots=p.locator('.workspace-slots')
  for i in range(50):
   slots.get_by_role('button',name='Workspace '+str(2 if i%2==0 else 1),exact=True).click();p.wait_for_timeout(40)
  p.wait_for_function(READY);p.wait_for_timeout(500);after=sample();ctx.close()
  assert after['listeners']<=base_line['listeners'],('archive listeners grew',base_line,after)
  assert after['urls']<=base_line['urls']+1,('object URLs grew',base_line,after)
  return {'switches':50,'before':base_line,'after':after}
 check('MEM-01: 50 workspace switches leave no orphan archive listeners or object URLs',mem01)

 def data03():
  ctx=b.new_context();p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto(base,wait_until='networkidle');p.wait_for_function(READY)
  p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("notebook-page:page.atlas.welcome").target,"here")}')
  p.evaluate('async()=>{const m=await import(new URL("app/storage/workspace-snapshot.js",document.baseURI).href);await m.captureWorkspaceSnapshot();}')
  assert p.evaluate(RAW),'a personal record must exist before the corruption step'
  # Simulate a record this build cannot read (e.g. written by a future version).
  p.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
   await new Promise((ok,no)=>{const tx=db.transaction('personal','readwrite'),st=tx.objectStore('personal');const g=st.get('active');g.onsuccess=()=>{const v=g.result;if(!v)return;v.schemaVersion=99;v.futureMarker='keep-me';st.put(v,'active');};tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});db.close();}""")
  before=json.dumps(p.evaluate(RAW),sort_keys=True)
  p.reload(wait_until='networkidle');expect(p.locator('.storage-banner')).to_be_visible()
  assert p.evaluate(DIAG)['writesBlocked'] is True
  # Ordinary interactions that normally persist personal state.
  p.get_by_role('button',name='Theme',exact=True).click();p.locator('.theme-option').nth(1).click();p.wait_for_timeout(700)
  after=json.dumps(p.evaluate(RAW),sort_keys=True);ctx.close()
  assert after==before,'the unreadable stored record was overwritten'
  return {'storedRecordUnchanged':True}
 check('DATA-03: an unreadable stored record is never overwritten by the blank fallback state',data03)

 def ui01():
  ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto(base,wait_until='networkidle');p.wait_for_function(READY)
  setup=p.get_by_role('button',name='Workspace 1 setup',exact=True).first
  if not setup.is_visible():p.get_by_role('button',name='Open sidebar',exact=True).first.click() if p.get_by_role('button',name='Open sidebar',exact=True).count() else None
  p.get_by_role('button',name='Workspace 1 setup',exact=True).locator('visible=true').first.click()
  panel=p.locator('.experience-panel');expect(panel).to_be_visible();box=panel.bounding_box()
  assert box['x']>=0 and box['x']+box['width']<=391,('panel overflows 390px',box)
  p.keyboard.press('Escape');expect(panel).to_have_count(0)
  width=p.evaluate('document.scrollingElement.scrollWidth');ctx.close()
  assert width<=391,('horizontal page scroll at 390px',width)
  return {'panel':box,'scrollWidth':width}
 check('UI-01: Experience panel fits 390px, closes with Escape, no horizontal page scroll',ui01)
 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-gates','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
