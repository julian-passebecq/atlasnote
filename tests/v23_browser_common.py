"""Real-origin V23 QA helpers. No opaque-origin substitute and no mutable app hook."""
import json
import os
import subprocess
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import start_server, launch, open_settings, close_panels

AGENT = "(await import(new URL('app/agent/public.js', document.baseURI).href)).getAgentInterface()"
SNAPSHOT = "await import(new URL('app/storage/workspace-snapshot.js', document.baseURI).href)"
STORES = ['assets', 'history', 'imports', 'overlays', 'personal']
# Request values first in ONE read-only transaction. Normalize raw bytes only afterwards.
RAW = """async()=>{
 const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 const names=Array.from(db.objectStoreNames).sort();
 if(JSON.stringify(names)!==JSON.stringify(['assets','history','imports','overlays','personal']))throw Error('Not exactly five stores');
 const tx=db.transaction(names,'readonly'),values={};
 const done=new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error||Error('Read aborted'));tx.onerror=()=>no(tx.error);});
 await Promise.all(names.map(async name=>{const st=tx.objectStore(name);const request=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});const [keys,rows]=await Promise.all([request(st.getAllKeys()),request(st.getAll())]);values[name]=keys.map((key,i)=>({key,value:rows[i]}));}));
 await done;db.close();
 async function normalize(v){if(v instanceof Blob)v=await v.arrayBuffer();if(v instanceof ArrayBuffer)return {binary:[...new Uint8Array(v)]};if(ArrayBuffer.isView(v))return {binary:[...new Uint8Array(v.buffer,v.byteOffset,v.byteLength)]};if(Array.isArray(v))return Promise.all(v.map(normalize));if(v&&typeof v==='object'){const out={};for(const k of Object.keys(v).sort())out[k]=await normalize(v[k]);return out;}return v;}
 return normalize(values);
}"""

def flush(page):
    page.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}')
    state=page.evaluate('async()=>('+AGENT+').getStorageDiagnostics()')
    assert state['saving']==0 and not state['storageError'], state
    return state

def persisted(page):
    return page.evaluate('async()=>{const m='+SNAPSHOT+';return m.readPersistedWorkspace();}')

def seed_demo(page):
    open_settings(page)
    page.get_by_text('Optional V2.3 durability demo data',exact=True).click()
    button=page.locator('[data-durability-action="load-demo"]')
    button.click()
    # Version 8 exists before the final personal-state write is necessarily done.
    # Wait for the UI operation itself to finish, then require quiescent persistence.
    page.get_by_text('Optional V2.3 corpus loaded. Repeated loading retains the same content; no user content is replaced.',exact=True).wait_for()
    page.wait_for_function('async()=>{const a='+AGENT+';return !a.getStorageDiagnostics().saving&&a.listResourceVersions("notebook-page:demo.v23.notebook").total===8;}')
    button.wait_for(state='visible')
    assert button.is_enabled()
    flush(page)

def choose(page, label, filename):
    # Native FileChooser receives a file saved by the browser. No dispatchEvent or
    # byte-only receipt forging. The app retains its isTrusted checks unchanged.
    field=page.get_by_label(label,exact=True)
    with page.expect_file_chooser() as pending:
        field.locator('..').click()
    pending.value.set_files(str(filename))

def write_result(out, rows, suite, build, source):
    status='FAIL' if any(r['status']=='FAIL' for r in rows) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in rows) else 'PASS'
    report={'suite':suite,'status':status,'sourceCommit':source,'buildIdentity':build,'scope':'Unmodified normal-origin app and actual browser IndexedDB; no opaque-origin emulation','results':rows}
    (out/'results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    return 1 if status=='FAIL' else 2 if status=='BLOCKED' else 0

def run_suite(suite, body, remaining=()):
    out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/'+suite));out.mkdir(parents=True,exist_ok=True)
    rows=[];build=None;source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    def passed(name,**detail):
        rows.append({'name':name,'status':'PASS',**detail})
        print(json.dumps(rows[-1]),flush=True)
    try:
        build_path=Path(os.environ.get('ATLAS_DIST','dist'))/'build-identity.json'
        if not build_path.is_file():
            rows.append({'name':'Integrated build prerequisite','status':'BLOCKED','reason':'The exact integrated dist/build-identity.json is absent. No browser case was executed and no compatibility artifact was substituted.'})
            return write_result(out,rows,suite,build,source)
        build=json.loads(build_path.read_text())
        assert build['buildKind']=='integrated','This suite refuses a compatibility-only build'
        if build['sourceCommit']!=source or build['sourceDirty']:
            rows.append({'name':'Exact candidate build identity','status':'BLOCKED','reason':'Runtime artifact is inherited or dirty; exercised results cannot certify this source candidate.'})
        check=subprocess.run(['node','tools/check-v23-build.mjs'],capture_output=True,text=True,env={**os.environ,'ATLAS_EVIDENCE':str(out/'build-check')})
        if check.returncode:
            rows.append({'name':'Exact integrated fingerprint prerequisite','status':'BLOCKED','reason':'Current source/build fingerprint check failed; no browser result may certify a different artifact.'})
            return write_result(out,rows,suite,build,source)
        base=start_server(dist=os.environ.get('ATLAS_DIST','dist'))
        with sync_playwright() as pw:
            browser=launch(pw)
            try:
                context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
                page=context.new_page();page.set_default_timeout(12000)
                page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app')
                flush(page)
                body(browser,context,page,base,out,passed)
            finally:
                browser.close()
    except Exception as exc:
        blocked=any(s in str(exc) for s in ['ERR_BLOCKED_BY_ADMINISTRATOR','Executable doesn\'t exist','Local test server did not start'])
        rows.append({'name':'Normal-origin prerequisite or assertion','status':'BLOCKED' if blocked else 'FAIL','error':str(exc),'traceback':traceback.format_exc()})
    for name in remaining:
        rows.append({'name':name,'status':'BLOCKED','reason':'Required qualification is not established by this smoke suite. See QA matrix; do not treat a pure/model test as browser proof.'})
    return write_result(out,rows,suite,build,source)
