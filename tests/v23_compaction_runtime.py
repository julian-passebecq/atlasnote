"""Real-origin proof for the proposed five-store compaction transaction.

This suite intentionally runs only on the non-production qualification branch while
COMPACTION_BLOCKED is temporarily false. Fault injection is test-side monkeypatching
of browser IndexedDB primitives; production code contains no fault/backdoor flag.
"""
import json
from v23_browser_common import *

SUCCESS='Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.'

def prepare(page,out,name):
    seed_demo(page)
    section=page.locator('section[aria-label="History archival and attachments"]')
    section.get_by_text('Prepare a verified history archive',exact=True).click()
    page.get_by_label('Live versions to retain',exact=True).fill('3')
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

def reopen_raw(page,base):
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    return page.evaluate(RAW)

def scenario(browser,context,page,base,out,passed):
    # Positive all-or-nothing commit.
    section,preview,target=prepare(page,out,'success')
    before=persisted(page);before_heads={h['resourceKey']:(h['revisionId'],h['number'],h['contentHash']) for h in before['history']['heads']}
    section.locator('[data-durability-action="compact-archive"]').click()
    page.get_by_text(SUCCESS,exact=True).wait_for()
    after=persisted(page);after_heads={h['resourceKey']:(h['revisionId'],h['number'],h['contentHash']) for h in after['history']['heads']}
    assert before_heads==after_heads
    assert any(a['archiveId']==preview['archiveId'] and a['rootHash']==preview['rootHash'] for a in after['history'].get('archives',[]))
    assert not set(preview['revisionIds']) & {r['revisionId'] for r in after['history']['revisions']}
    assert not set(preview['reviewIds']) & {r['id'] for r in after['history']['reviews']}
    assert not set(preview['assetKeys']) & {a['key'] for a in after['assets']}
    reopened=reopen_raw(page,base)
    assert any(row['key']=='archive:'+preview['archiveId'] for row in reopened['history'])
    passed('Atomic compaction success survives reload with identical heads and exact deletion set',removedRevisions=len(preview['revisionIds']),removedReviews=len(preview['reviewIds']),removedAssets=len(preview['assetKeys']))

    # Abort after descriptor/deletions have begun: every store must reopen byte-equivalent.
    c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    try:
        p=c.new_page();p.set_default_timeout(12000);p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        section2,preview2,_=prepare(p,out,'abort')
        raw_before=p.evaluate(RAW)
        p.evaluate("""()=>{const original=IDBObjectStore.prototype.delete;let injected=false;
          IDBObjectStore.prototype.delete=function(key){const req=original.call(this,key);
            if(!injected&&this.name==='history'&&String(key).startsWith('revision:')){injected=true;queueMicrotask(()=>{try{this.transaction.abort();}catch{}});}
            return req;};}""")
        section2.locator('[data-durability-action="compact-archive"]').click()
        section2.get_by_role('alert').wait_for()
        raw_after=reopen_raw(p,base)
        assert raw_after==raw_before
        passed('Injected abort after descriptor/deletion enqueue reopens byte-equivalent across all five stores')
    finally:c.close()

    # A concurrent writer after trusted re-selection must make the receipt stale. The
    # external write is retained; compaction contributes zero additional mutation.
    c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    try:
        p=c.new_page();p.set_default_timeout(12000);p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        section3,preview3,_=prepare(p,out,'concurrent')
        other=c.new_page();other.set_default_timeout(12000);other.goto(base,wait_until='networkidle');other.wait_for_selector('.atlas-app')
        other.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
          const bytes=new TextEncoder().encode('concurrent asset');const digest=await crypto.subtle.digest('SHA-256',bytes);const sha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
          const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({key:'concurrent-proof.txt',sha256:sha,mediaType:'text/plain',bytes},'concurrent-proof.txt');
          await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});db.close();}""")
        expected=p.evaluate(RAW)
        section3.locator('[data-durability-action="compact-archive"]').click()
        section3.get_by_role('alert').wait_for()
        actual=reopen_raw(p,base)
        assert actual==expected
        assert any(row['key']=='concurrent-proof.txt' for row in actual['assets'])
        assert not any(row['key']=='archive:'+preview3['archiveId'] for row in actual['history'])
        passed('Second-tab asset write invalidates exact receipt; concurrent write survives and compaction adds nothing')
    finally:c.close()

if __name__=='__main__':
    raise SystemExit(run_suite('compaction-runtime',scenario,(
        'stale-source-epoch',
        'stale-history-hash',
        'stale-preview-hash',
        'second-tab-history-write',
        'concurrent-personal-write',
        'concurrent-imports-write',
        'descriptor-put-failure',
        'revision-delete-failure',
        'closed-review-delete-failure',
        'asset-delete-failure',
        'transaction-quota-failure',
    )))
