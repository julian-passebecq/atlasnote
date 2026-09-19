"""Normal-origin V23 safety smoke; never substitutes opaque-origin IDB emulation.
Full destructive I/O qualification remains blocked while production has no compactor.
"""
import json, os, traceback, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import start_server, launch, open_settings
OUT=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/runtime'));OUT.mkdir(parents=True,exist_ok=True)
results=[]
base=start_server(dist=os.environ.get('ATLAS_DIST','dist'))
try:
 with sync_playwright() as pw:
  browser=launch(pw);page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True);page.set_default_timeout(10000)
  page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app')
  state=page.evaluate("async()=>{const {store}=await import('/app/storage/database.js');await store.flush();return {error:store.error,heads:store.state.history.heads,stores:Array.from((await new Promise((ok,fail)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);})).objectStoreNames)};}")
  assert not state['error'];assert set(state['stores'])=={'imports','overlays','personal','assets','history'}
  assert not any('demo.v23' in h['resourceKey'] for h in state['heads'])
  results.append({'name':'Fresh normal-origin exact five stores and no automatic corpus','status':'PASS'})
  open_settings(page);page.get_by_text('Optional V2.3 durability demo data',exact=True).click();page.locator('[data-durability-action="load-demo"]').click()
  page.wait_for_function("async()=>{const {store}=await import('/app/storage/database.js');return !store.saving&&store.state.history.heads.some(h=>h.resourceKey==='notebook-page:demo.v23.notebook'&&h.number===8);}")
  page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app')
  counts=page.evaluate("async()=>{const {store}=await import('/app/storage/database.js');await store.flush();return store.state.history.heads.filter(h=>h.resourceKey.includes(':demo.v23')).map(h=>[h.resourceKey,h.number]);}")
  assert dict(counts)['notebook-page:demo.v23.notebook']==8
  results.append({'name':'Optional corpus persisted across actual reload','status':'PASS','counts':counts})
  page.screenshot(path=str(OUT/'normal-origin.png'),full_page=True);browser.close()
except Exception as exc:
 results.append({'name':'Normal-origin prerequisite','status':'BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc) else 'FAIL','error':str(exc),'traceback':traceback.format_exc()})
for name in ['Real V22 upgrade/reload/old-tab/interrupted migration','IDB import abort after optimistic quota estimate','Trusted chooser saved-file receipt and concurrent writer','Atomic compaction I matrix and capacity recovery O','Fresh-profile complete recovery with historical PDF','Pending-write close/retry/emergency export','Provider Edge route/cache/rate-limit/HTTPS cookie enforcement']:
 results.append({'name':name,'status':'BLOCKED','reason':'Not certified by this safety smoke. Destructive compaction is absent; full normal-origin/provider QA is required. See docs/v23/QA_MATRIX.md.'})
report={'scope':'Unmodified normal-origin production entry and real IndexedDB only','base':base,'buildDirectory':os.environ.get('ATLAS_DIST','dist'),'results':results}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));raise SystemExit(2 if any(r['status']=='BLOCKED' for r in results) else 1 if any(r['status']=='FAIL' for r in results) else 0)
