"""Real-origin proof for the proposed five-store compaction transaction.

Fault injection is test-side monkeypatching or direct competing IndexedDB writes.
Production code contains no fault/backdoor flag.
"""
import json
from v23_browser_common import *

SUCCESS='Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.'

def prepare(page,out,name,retain=1):
    seed_demo(page)
    section=page.locator('section[aria-label="History archival and attachments"]')
    section.get_by_text('Prepare a verified history archive',exact=True).click()
    page.get_by_label('Live versions to retain',exact=True).fill(str(retain))
    section.locator('[data-durability-action="prepare-archive"]').click()
    section.locator('[data-archive-id]').wait_for()
    with page.expect_download() as pending:
        section.locator('[data-durability-action="download-archive"]').click()
    target=out/(name+'.atlas-history.zip');pending.value.save_as(str(target))
    choose(page,'Re-select saved archive',target)
    preview=section.locator('[data-durability-preview]');preview.wait_for()
    details=json.loads(preview.locator('pre').inner_text())
    page.get_by_label('Confirm saved archive retention',exact=True).check()
    assert section.locator('[data-durability-action="compact-archive"]').is_enabled()
    return section,details,target

def fresh(browser,base):
    context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    page=context.new_page();page.set_default_timeout(12000)
    page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    return context,page

def assert_rejected_exact(page,section,expected,name,passed):
    section.locator('[data-durability-action="compact-archive"]').click()
    section.get_by_role('alert').wait_for()
    actual=page.evaluate(RAW)
    assert actual==expected,name
    passed(name,scope='Fresh direct IndexedDB read after rejected real transaction; all five stores byte-normalized')

def scenario(browser,context,page,base,out,passed):
    # Positive all-or-nothing commit.
    section,preview,_=prepare(page,out,'success',3)
    before=persisted(page);before_heads={h['resourceKey']:(h['revisionId'],h['number'],h['contentHash']) for h in before['history']['heads']}
    section.locator('[data-durability-action="compact-archive"]').click()
    page.get_by_text(SUCCESS,exact=True).wait_for()
    after=persisted(page);after_heads={h['resourceKey']:(h['revisionId'],h['number'],h['contentHash']) for h in after['history']['heads']}
    assert before_heads==after_heads
    assert any(a['archiveId']==preview['archiveId'] and a['rootHash']==preview['rootHash'] for a in after['history'].get('archives',[]))
    assert not set(preview['revisionIds']) & {r['revisionId'] for r in after['history']['revisions']}
    assert not set(preview['reviewIds']) & {r['id'] for r in after['history']['reviews']}
    assert not set(preview['assetKeys']) & {a['key'] for a in after['assets']}
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    reopened=page.evaluate(RAW)
    assert any(row['key']=='archive:'+preview['archiveId'] for row in reopened['history'])
    passed('Atomic compaction success survives reload with identical heads and exact deletion set',removedRevisions=len(preview['revisionIds']),removedReviews=len(preview['reviewIds']),removedAssets=len(preview['assetKeys']))

    # Planner stale source epoch: mutate only the detached live model. It must reject
    # before any IndexedDB write and consume the one-use receipt.
    c,p=fresh(browser,base)
    try:
        sec,_,_=prepare(p,out,'stale-source-epoch',1);expected=p.evaluate(RAW)
        p.evaluate("""async()=>{const m=await import(new URL('app/storage/database.js',document.baseURI).href);m.store.state.history.meta.epoch++;}""")
        assert_rejected_exact(p,sec,expected,'stale-source-epoch',passed)
    finally:c.close()

    # Same epoch, different history hash.
    c,p=fresh(browser,base)
    try:
        sec,_,_=prepare(p,out,'stale-history-hash',1);expected=p.evaluate(RAW)
        p.evaluate("""async()=>{const m=await import(new URL('app/storage/database.js',document.baseURI).href);const r=m.store.state.history.reviews[0];r.reason=(r.reason||'')+' qa-hash';}""")
        assert_rejected_exact(p,sec,expected,'stale-history-hash',passed)
    finally:c.close()

    # Personal state can change asset reachability without changing history. Use the
    # real personal writer to protect an otherwise removable asset; previewHash must
    # change and the stale receipt must be rejected before compaction.
    c,p=fresh(browser,base)
    try:
        sec,pr,_=prepare(p,out,'stale-preview-hash',1);assert pr['assetKeys'],pr
        asset=pr['assetKeys'][0]
        p.evaluate("""async(asset)=>{const m=await import(new URL('app/storage/database.js',document.baseURI).href);m.store.personal(x=>{x.notes['qa.preview.note']={text:asset,pageId:'demo.v23.notebook',updatedAt:Date.now()};});await m.store.flush();}""",asset)
        expected=p.evaluate(RAW)
        assert_rejected_exact(p,sec,expected,'stale-preview-hash',passed)
    finally:c.close()

    # Direct competing history write from a second page/connection.
    c,p=fresh(browser,base)
    try:
        sec,_,_=prepare(p,out,'second-tab-history-write',1)
        other=c.new_page();other.goto(base,wait_until='networkidle')
        other.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});const tx=db.transaction('history','readwrite'),st=tx.objectStore('history'),req=st.get('meta');await new Promise((ok,no)=>{req.onsuccess=ok;req.onerror=()=>no(req.error);});const meta=req.result;meta.epoch++;st.put(meta,'meta');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});db.close();}""")
        expected=p.evaluate(RAW)
        assert_rejected_exact(p,sec,expected,'second-tab-history-write',passed)
    finally:c.close()

    # Personal write that leaves history untouched.
    c,p=fresh(browser,base)
    try:
        sec,_,_=prepare(p,out,'concurrent-personal-write',1)
        p.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});const tx=db.transaction('personal','readwrite'),st=tx.objectStore('personal'),req=st.get('active');await new Promise((ok,no)=>{req.onsuccess=ok;req.onerror=()=>no(req.error);});const x=req.result;x.session.showFlags=!x.session.showFlags;st.put(x,'active');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});db.close();}""")
        expected=p.evaluate(RAW)
        assert_rejected_exact(p,sec,expected,'concurrent-personal-write',passed)
    finally:c.close()

    # Imports are part of the transaction even when a concurrent writer does not
    # advance history. Use a disposable mutation and compare raw DB without reload.
    c,p=fresh(browser,base)
    try:
        sec,_,_=prepare(p,out,'concurrent-imports-write',1)
        p.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});const tx=db.transaction('imports','readwrite'),st=tx.objectStore('imports'),req=st.openCursor();await new Promise((ok,no)=>{req.onsuccess=ok;req.onerror=()=>no(req.error);});const cur=req.result;if(!cur)throw Error('No import fixture');const x=structuredClone(cur.value);x.hash=String(x.hash)+'-qa';st.put(x,cur.primaryKey);await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});db.close();}""")
        expected=p.evaluate(RAW)
        assert_rejected_exact(p,sec,expected,'concurrent-imports-write',passed)
    finally:c.close()

    # Assets are independently writable and do not advance the history epoch.
    c,p=fresh(browser,base)
    try:
        sec,_,_=prepare(p,out,'concurrent-assets-write',1)
        p.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});const bytes=new TextEncoder().encode('concurrent asset');const digest=await crypto.subtle.digest('SHA-256',bytes);const sha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({key:'concurrent-proof.txt',sha256:sha,mediaType:'text/plain',bytes},'concurrent-proof.txt');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});db.close();}""")
        expected=p.evaluate(RAW)
        assert_rejected_exact(p,sec,expected,'concurrent-assets-write',passed)
    finally:c.close()

    # Abort after descriptor write has been enqueued.
    c,p=fresh(browser,base)
    try:
        sec,_,_=prepare(p,out,'abort-during-descriptor-write',1);expected=p.evaluate(RAW)
        p.evaluate("""()=>{const original=IDBObjectStore.prototype.add;let fired=false;IDBObjectStore.prototype.add=function(value,key){const req=original.call(this,value,key);if(!fired&&this.name==='history'&&String(key).startsWith('archive:')){fired=true;queueMicrotask(()=>{try{this.transaction.abort();}catch{}});}return req;};}""")
        assert_rejected_exact(p,sec,expected,'abort-during-descriptor-write',passed)
    finally:c.close()

    injections=[
      ('descriptor-put-failure',"""()=>{const original=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(value,key){if(this.name==='history'&&String(key).startsWith('archive:'))throw new DOMException('Injected descriptor failure','ConstraintError');return original.call(this,value,key);};}"""),
      ('revision-delete-failure',"""()=>{const original=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(key){if(this.name==='history'&&String(key).startsWith('revision:'))throw new DOMException('Injected revision delete failure','UnknownError');return original.call(this,key);};}"""),
      ('closed-review-delete-failure',"""()=>{const original=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(key){if(this.name==='history'&&String(key).startsWith('review:'))throw new DOMException('Injected review delete failure','UnknownError');return original.call(this,key);};}"""),
      ('asset-delete-failure',"""()=>{const original=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(key){if(this.name==='assets')throw new DOMException('Injected asset delete failure','UnknownError');return original.call(this,key);};}"""),
      ('transaction-quota-failure',"""()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(this.name==='history'&&key==='meta')throw new DOMException('Injected quota failure','QuotaExceededError');return original.call(this,value,key);};}"""),
    ]
    for name,script in injections:
        c,p=fresh(browser,base)
        try:
            sec,pr,_=prepare(p,out,name,1)
            if name=='closed-review-delete-failure':assert pr['reviewIds'],pr
            if name=='asset-delete-failure':assert pr['assetKeys'],pr
            expected=p.evaluate(RAW);p.evaluate(script)
            assert_rejected_exact(p,sec,expected,name,passed)
        finally:c.close()

if __name__=='__main__':
    raise SystemExit(run_suite('compaction-runtime',scenario))
