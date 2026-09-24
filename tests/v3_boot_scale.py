"""V3 boot-cost diagnostic (measurement, not a pass/fail release gate).

Seeds the real `knowledge-atlas` IndexedDB of a disposable Chromium profile with
N large local assets (valid key/bytes/mediaType/SHA-256 records), reloads, and
measures time to the first rendered shell, time until storage is idle, and JS
heap. Usage: python tests/v3_boot_scale.py [assetCount] [megabytesEach] [label]
Numbers are machine-specific; compare runs on the same machine only.
"""
import json,os,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT
count=int(sys.argv[1]) if len(sys.argv)>1 else 12
mb=int(sys.argv[2]) if len(sys.argv)>2 else 16
label=sys.argv[3] if len(sys.argv)>3 else 'run'
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/boot-scale'));OUT.mkdir(parents=True,exist_ok=True)
SEED="""async([count,mb])=>{
 const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 for(let i=0;i<count;i++){const bytes=new Uint8Array(mb*1024*1024);for(let j=0;j<bytes.length;j+=4096)bytes[j]=(i*31+j)&255;
  const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  await new Promise((ok,no)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({key:'local/v3-scale-'+i,bytes,mediaType:'application/pdf',sha256:sha},'local/v3-scale-'+i);tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});}
 db.close();return count;}"""
def measure(p,base):
 t0=time.perf_counter();p.goto(base,wait_until='commit')
 p.wait_for_selector('.atlas-app',state='attached',timeout=180000);shell=time.perf_counter()-t0
 p.wait_for_function('async()=>{const a='+AGENT+';const d=a.getStorageDiagnostics();return !d.saving&&(d.ready??true);}',timeout=300000,polling=100);idle=time.perf_counter()-t0
 heap=p.evaluate('performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null')
 marks=p.evaluate("Object.fromEntries(performance.getEntriesByType('mark').filter(m=>m.name.startsWith('atlas:boot:')).map(m=>[m.name.slice(11),Math.round(m.startTime)]))")
 return {'shellMs':round(shell*1000),'idleMs':round(idle*1000),'usedJsHeapMB':heap,'bootMarksMs':marks}
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900});p=ctx.new_page();base=start_server()
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 empty=[measure(p,base) for _ in range(2)]
 p.evaluate(SEED,[count,mb])
 seeded=[measure(p,base) for _ in range(3)]
 b.close()
result={'label':label,'assets':count,'megabytesEach':mb,'emptyProfile':empty,'seededProfile':seeded,'scope':'Playwright Chromium headless, same machine; assets-only scale (history revisions not seeded)'}
(OUT/(label+'.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result))
