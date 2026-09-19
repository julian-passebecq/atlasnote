"""QA-only normal-origin proof for the guarded five-store compaction writer."""
import json
from pathlib import Path
from v23_browser_common import *

def prepare(page,out,name):
    close_panels(page)
    open_settings(page)
    section=page.locator('section[aria-label="History archival and attachments"]')
    section.get_by_text('Prepare a verified history archive',exact=True).click()
    page.get_by_label('Live versions to retain',exact=True).fill('2')
    section.locator('[data-durability-action="prepare-archive"]').click()
    section.locator('[data-archive-id]').wait_for()
    with page.expect_download() as pending:
        section.locator('[data-durability-action="download-archive"]').click()
    target=out/name
    pending.value.save_as(str(target))
    choose(page,'Re-select saved archive',target)
    page.wait_for_function("""()=>!!document.querySelector('[data-durability-preview]')||!!document.querySelector('section[aria-label="History archival and attachments"] [role="alert"]')""")
    alert=section.get_by_role('alert')
    if alert.count() and alert.is_visible():
        raise AssertionError('Saved-file selection rejected: '+alert.inner_text())
    section.locator('[data-durability-preview]').wait_for()
    pre=section.locator('[data-durability-preview] pre')
    pre.wait_for()
    page.wait_for_function("""()=>{const p=document.querySelector('[data-durability-preview] pre');return !!p&&p.textContent.trim().startsWith('{')}""")
    preview=json.loads(pre.inner_text())
    page.get_by_label('Confirm saved archive retention',exact=True).check()
    button=section.locator('[data-durability-action="compact-archive"]')
    assert button.is_enabled()
    return section,button,preview,target

def history_keys(raw):
    return {row['key'] for row in raw['history']}

def seed_fresh(browser,base):
    ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    page=ctx.new_page();page.set_default_timeout(15000)
    page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page);seed_demo(page);flush(page)
    return ctx,page

def scenario(browser,context,page,base,out,passed):
    # Happy path: exact descriptor + deletes + meta update commit together.
    seed_demo(page);flush(page)
    before=persisted(page);before_heads={h['resourceKey']:h['revisionId'] for h in before['history']['heads']}
    section,button,preview,target=prepare(page,out,'qa-success.atlas-history.zip')
    raw_before=page.evaluate(RAW)
    button.click()
    page.get_by_text('Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.',exact=True).wait_for()
    raw_after=page.evaluate(RAW);keys=history_keys(raw_after)
    assert raw_after!=raw_before
    assert 'archive:'+preview['archiveId'] in keys
    for rid in preview['revisionIds']:assert 'revision:'+rid not in keys
    for rid in preview['reviewIds']:assert 'review:'+rid not in keys
    asset_keys={row['key'] for row in raw_after['assets']}
    for key in preview['assetKeys']:assert key not in asset_keys
    after=persisted(page);assert {h['resourceKey']:h['revisionId'] for h in after['history']['heads']}==before_heads
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    assert {h['resourceKey']:h['revisionId'] for h in persisted(page)['history']['heads']}==before_heads
    passed('Atomic compaction success survives reopen with exact heads and deletion set',removedRevisions=len(preview['revisionIds']),removedReviews=len(preview['reviewIds']),removedAssets=len(preview['assetKeys']))

    # Stale/concurrent personal write after saved-file selection: transaction must not mutate anything else.
    ctx,p=seed_fresh(browser,base)
    try:
        section,button,preview,_=prepare(p,out,'qa-stale-personal.atlas-history.zip')
        p.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});const tx=db.transaction('personal','readwrite'),s=tx.objectStore('personal');const get=s.get('active');await new Promise((ok,no)=>{get.onsuccess=ok;get.onerror=()=>no(get.error)});const v=get.result;v.theme=v.theme==='slate'?'fluent':'slate';s.put(v,'active');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);tx.onerror=()=>no(tx.error)});db.close();}""")
        expected=p.evaluate(RAW)
        button.click();section.get_by_role('alert').wait_for()
        assert 'changed after archive verification' in section.get_by_role('alert').inner_text()
        assert p.evaluate(RAW)==expected
        passed('Concurrent personal-store change is detected before destructive writes; exact post-concurrent state retained')
    finally:ctx.close()

    # Inject a synchronous deletion failure after descriptor/add and at least one delete were queued.
    ctx,p=seed_fresh(browser,base)
    try:
        section,button,preview,_=prepare(p,out,'qa-delete-abort.atlas-history.zip')
        expected=p.evaluate(RAW)
        p.evaluate("""()=>{window.__atlasDeleteOriginal=IDBObjectStore.prototype.delete;window.__atlasDeleteCalls=0;IDBObjectStore.prototype.delete=function(key){window.__atlasDeleteCalls++;if(window.__atlasDeleteCalls===2)throw new DOMException('QA injected delete failure','AbortError');return window.__atlasDeleteOriginal.call(this,key);};}""")
        button.click();section.get_by_role('alert').wait_for()
        p.evaluate("""()=>{if(window.__atlasDeleteOriginal)IDBObjectStore.prototype.delete=window.__atlasDeleteOriginal;}""")
        assert p.evaluate(RAW)==expected
        assert p.evaluate('window.__atlasDeleteCalls')>=2
        passed('Injected deletion failure aborts descriptor/deletion transaction with byte-equivalent five-store state',deleteCalls=p.evaluate('window.__atlasDeleteCalls'))
    finally:ctx.close()

if __name__=='__main__':
    raise SystemExit(run_suite('compaction-qa',scenario))
