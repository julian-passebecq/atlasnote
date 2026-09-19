"""Native IndexedDB migration/integrity tests and injected advisory API matrix."""
import json
import subprocess
from v23_browser_common import *
from v23_finish_helpers import compact_saved, ATTACHED

SEED="""async({workspace,history,version})=>{
 const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 const r=indexedDB.open('knowledge-atlas',version);
 r.onupgradeneeded=()=>{for(const n of ['imports','overlays','personal','assets'])r.result.createObjectStore(n);if(version===3){const h=r.result.createObjectStore('history');h.createIndex('kind','kind');h.createIndex('resourceKey','resourceKey');}};
 const db=await req(r),tx=db.transaction(Array.from(db.objectStoreNames),'readwrite');
 const done=new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});
 for(const p of workspace.imports)tx.objectStore('imports').put(p,p.manifest.id);
 for(const a of workspace.assets)tx.objectStore('assets').put({...a,bytes:new Uint8Array(a.bytes)},a.key);
 tx.objectStore('personal').put(workspace.personal,'active');tx.objectStore('overlays').put(workspace.overlays,'active');
 if(history){const h=tx.objectStore('history');h.put(history.meta,'meta');for(const x of history.revisions)h.put(x,'revision:'+x.revisionId);for(const x of history.heads)h.put(x,'head:'+x.resourceKey);for(const x of history.reviews)h.put(x,'review:'+x.id);}
 await done;db.close();
}"""

def fixture_context(browser,base,fixture,history=None,version=2):
    c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    p=c.new_page();p.set_default_timeout(20000)
    url=base+'__v23_fixture_seed__'
    c.route(url,lambda r:r.fulfill(status=200,content_type='text/html',body='<!doctype html><title>Disposable migration fixture</title>'))
    p.goto(url);p.evaluate(SEED,{'workspace':fixture,'history':history,'version':version})
    return c,p

def ready(p,base):
    p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)

def migrate(browser,base,passed):
    script="""import {built,authoredFixtures} from './tests/v22/fixtures.mjs';
import {captureResources} from './dist-offline/app/history/adapters.js';
import {advanceHistory} from './dist-offline/app/history/engine.js';
import {compose} from './dist-offline/app/core/workspace.js';
import {emptyHistory} from './dist-offline/app/history/model.js';
const ws=authoredFixtures();ws.personal.bookmarks.push({id:'bookmark.v23.migration',pageId:'page.atlas.welcome',title:'Retain prior workspace',createdAt:1});
const resources=captureResources(compose(built,ws),ws);
const partial=await advanceHistory(emptyHistory(),resources.slice(0,17),{source:'migration'},false);
const complete=await advanceHistory(emptyHistory(),resources,{source:'migration'},true);
console.log(JSON.stringify({ws,partial,complete}));"""
    f=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],text=True))
    for case in ['populated-v22-v3','legacy-v2','interrupted-baseline','aborted-upgrade','old-tab-blocked']:
        h=f['complete'] if case=='populated-v22-v3' else f['partial'] if case=='interrupted-baseline' else None
        c,p=fixture_context(browser,base,f['ws'],h,3 if h else 2)
        try:
            if case=='aborted-upgrade':
                evidence=p.evaluate("""async()=>{const r=indexedDB.open('knowledge-atlas',3);let aborted=false;r.onupgradeneeded=()=>{r.result.createObjectStore('history');r.transaction.abort();};await new Promise(ok=>{r.onerror=()=>{aborted=true;ok();};r.onsuccess=()=>{r.result.close();ok();};});const q=indexedDB.open('knowledge-atlas');const db=await new Promise((ok,no)=>{q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});const state={aborted,version:db.version,stores:Array.from(db.objectStoreNames)};db.close();return state;}""")
                assert evidence['aborted'] and evidence['version']==2 and len(evidence['stores'])==4,evidence
            if case=='old-tab-blocked':
                p.evaluate("""async()=>{const r=indexedDB.open('knowledge-atlas',2);window.__oldConnection=await new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}""")
                app=c.new_page();app.goto(base,wait_until='networkidle')
                app.get_by_text('Database upgrade is blocked by another Atlas tab. Close the other tab, then reload.',exact=False).first.wait_for()
                p.evaluate('window.__oldConnection.close()');p.close();p=app
            ready(p,base);s=persisted(p)
            assert sorted(p.evaluate(RAW))==STORES
            for key in ['imports','overlays','assets']:assert s[key]==f['ws'][key],(case,key)
            assert s['personal']['bookmarks']==f['ws']['personal']['bookmarks']
            if case=='populated-v22-v3':assert s['history']==f['complete']
            if h:assert {r['revisionId'] for r in h['revisions']}<={r['revisionId'] for r in s['history']['revisions']}
            initial=s['history'];ready(p,base);assert persisted(p)['history']==initial
            passed('Native migration/reload: '+case,stores=STORES,historyRows=len(initial['revisions']))
        finally:c.close()

def advisory(page,passed):
    close_panels(page);open_settings(page);flush(page);before=page.evaluate(RAW)
    for case,estimate,persistence,request in [
        ('granted','available','best-effort','granted'),('denied','available','best-effort','denied'),
        ('persistent','available','persistent','already-persistent'),('unsupported','unsupported','unsupported','unsupported'),
        ('throw','failed','failed','failed'),('invalid','unavailable','best-effort','denied')]:
        page.evaluate("""name=>{window.__originalStorage??=navigator.storage;const fail=async()=>{throw Error('Injected advisory failure');};let persistent=name==='persistent';const storage=name==='unsupported'?{}:{estimate:name==='throw'?fail:async()=>name==='invalid'?{usage:-1,quota:0}:{usage:1024,quota:1073741824},persisted:name==='throw'?fail:async()=>persistent,persist:name==='throw'?fail:async()=>{if(name==='granted'){persistent=true;return true;}return false;}};Object.defineProperty(navigator,'storage',{configurable:true,value:storage});}""",case)
        page.get_by_role('button',name='Refresh storage health',exact=True).click()
        section=page.locator('section[aria-label="Storage and recovery health"]')
        if estimate=='available':section.get_by_text('1.00 KiB used /',exact=False).wait_for()
        else:section.get_by_text('Quota estimate: '+estimate+'. Unknown quota does not imply free space.',exact=True).wait_for()
        section.get_by_text('Persistence: '+persistence+'. Persistence reduces automatic eviction risk; it is not a backup or protection against clearing site data.',exact=True).wait_for()
        page.get_by_role('button',name='Request persistent storage',exact=True).click()
        page.get_by_text('Persistence request: '+request+'. Keep independently verified backups.',exact=True).wait_for()
        assert page.evaluate(RAW)==before
        passed('Storage advisory API / actual settings UI: '+case,scope='Injected navigator.storage responses; real IDB unchanged, not a claim of physical disk quota or eviction')
    page.evaluate("Object.defineProperty(navigator,'storage',{configurable:true,value:window.__originalStorage})")

def corrupt(browser,base,out,passed):
    for name,mutation in [
        ('unknown-history-key',"h.put({kind:'meta',schemaVersion:1},'unexpected')"),
        ('bad-revision-hash',"const r=(await req(h.getAll())).find(x=>x.kind==='revision');r.contentHash='0'.repeat(64);h.put(r,'revision:'+r.revisionId)"),
        ('missing-head',"const r=(await req(h.getAll())).find(x=>x.kind==='head');h.delete('head:'+r.resourceKey)"),
        ('tampered-private-asset',"const a=(await req(tx.objectStore('assets').getAll()))[0];a.bytes[0]^=1;tx.objectStore('assets').put(a,a.key)")]:
        c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);p=c.new_page();p.set_default_timeout(20000)
        try:
            ready(p,base);seed_demo(p);flush(p)
            p.evaluate("async()=>{const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});const db=await req(indexedDB.open('knowledge-atlas'));const tx=db.transaction(['history','assets'],'readwrite'),h=tx.objectStore('history');const done=new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});"+mutation+";await done;db.close();}")
            before=p.evaluate(RAW)
            section=p.locator('section[aria-label="Storage and recovery health"]')
            section.locator('[data-durability-action="integrity"]').click();section.get_by_role('alert').wait_for()
            assert p.evaluate(RAW)==before
            passed('Read-only integrity rejection preserves every corrupt byte: '+name)
        finally:c.close()

def optimistic_quota(browser,base,page,out,passed):
    close_panels(page);open_settings(page)
    with page.expect_download() as pending:page.get_by_role('button',name='Download workspace backup',exact=True).click()
    backup=out/'quota-source.atlas-backup.zip';pending.value.save_as(str(backup))
    c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);p=c.new_page();p.set_default_timeout(20000)
    try:
        ready(p,base);open_settings(p);choose(p,'Restore workspace backup',backup)
        p.get_by_role('heading',name='Restore preview',exact=True).wait_for()
        p.get_by_label('I understand that this replaces the current local workspace.',exact=True).check()
        p.evaluate("""()=>{window.__estimates=0;Object.defineProperty(navigator.storage,'estimate',{configurable:true,value:async()=>{window.__estimates++;return {usage:0,quota:1099511627776};}});const original=IDBObjectStore.prototype.put;window.__restorePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(value,key){if(this.name==='history'&&key==='meta'){window.__quotaHit=true;throw new DOMException('Injected late transaction quota failure','QuotaExceededError');}return original.call(this,value,key);};}""")
        before=p.evaluate(RAW)
        p.get_by_role('button',name='Restore verified backup',exact=True).click();p.get_by_role('alert').wait_for()
        assert p.evaluate('window.__quotaHit===true&&window.__estimates>0')
        assert p.evaluate(RAW)==before
        p.evaluate('window.__restorePut()')
        p.get_by_role('button',name='Restore verified backup',exact=True).click()
        p.get_by_text('Workspace restored from verified bytes.',exact=True).wait_for();flush(p)
        assert any('demo.v23' in h['resourceKey'] for h in persisted(p)['history']['heads'])
        passed('Optimistic storage preflight followed by injected late QuotaExceededError rolls back native five-store restore; explicit retry succeeds')
    finally:c.close()

def repeated_lineage(page,out,passed):
    files=[]
    for retain in [3,1]:
        filename,removal=compact_saved(page,out,'lineage-retain-'+str(retain),retain);files.append(filename)
        assert removal['revisionIds']
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    ids=page.evaluate('async()=>('+AGENT+').listResourceVersions("notebook-page:demo.v23.notebook")')['items']
    assert len(ids)==8 and len({r['revisionId'] for r in ids})==8
    open_settings(page)
    for filename in files:choose(page,'Attach history archives',filename);page.get_by_text(ATTACHED,exact=True).wait_for()
    for row in ids:
        assert page.evaluate('async(id)=>('+AGENT+').getResource("notebook-page:demo.v23.notebook",id)',row['revisionId'])['revision']['revisionId']==row['revisionId']
    passed('Two committed archive generations preserve contiguous version identity after reload and exact file attachment')

def finish_runtime(browser,context,page,base,out,passed):
    migrate(browser,base,passed)
    advisory(page,passed)
    corrupt(browser,base,out,passed)
    optimistic_quota(browser,base,page,out,passed)
    repeated_lineage(page,out,passed)
