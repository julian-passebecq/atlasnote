"""Real normal-origin IndexedDB compaction qualification.
The production Settings control remains disabled; this test removes only the DOM
disabled property after completing the real trusted download/re-selection ceremony.
No production storage hook or opaque-origin substitute is used.
"""
import json
import os
import subprocess
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import start_server, launch, open_settings, close_panels
from v23_browser_common import RAW, AGENT, flush, persisted, seed_demo, choose

FAULTS=[
 'stale-source-epoch','stale-history-hash','stale-preview-hash',
 'second-tab-history-write','concurrent-personal-write','concurrent-imports-write','concurrent-assets-write',
 'abort-during-descriptor-write','descriptor-put-failure','revision-delete-failure',
 'closed-review-delete-failure','asset-delete-failure','transaction-quota-failure'
]

def prepare(page,out,name):
    open_settings(page)
    section=page.locator('section[aria-label="History archival and attachments"]')
    section.get_by_text('Prepare a verified history archive',exact=True).click()
    page.get_by_label('Live versions to retain',exact=True).fill('2')
    page.locator('[data-durability-action="prepare-archive"]').click()
    page.locator('[data-archive-id]').wait_for()
    with page.expect_download() as pending:
        page.locator('[data-durability-action="download-archive"]').click()
    path=out/(name+'.atlas-history.zip');pending.value.save_as(str(path))
    choose(page,'Re-select saved archive',path)
    page.locator('[data-durability-preview]').wait_for()
    page.get_by_label('Confirm saved archive retention',exact=True).check()
    preview=json.loads(page.locator('[data-durability-preview] pre').inner_text())
    assert preview['revisionIds'],'fixture must archive revisions'
    # Release guard remains shipping-disabled. Qualification bypasses only the DOM
    # disabled property after the exact trusted receipt has already been created.
    page.locator('[data-archive-commit]').evaluate('(e)=>e.disabled=false')
    return path,preview

def raw(page): return page.evaluate(RAW)

def click_commit(page,success=False):
    page.locator('[data-archive-commit]').click()
    if success:
        page.get_by_text('Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.',exact=True).wait_for()
    else:
        page.locator('[role="alert"]').wait_for()

def mutate(page,case):
    if case=='stale-source-epoch':
        return page.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});const tx=db.transaction(['history'],'readwrite'),s=tx.objectStore('history'),m=await new Promise((ok,no)=>{const r=s.get('meta');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});m.epoch++;s.put(m,'meta');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error)});db.close()}""")
    if case=='stale-history-hash':
        return page.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});const tx=db.transaction(['history'],'readwrite'),s=tx.objectStore('history'),m=await new Promise((ok,no)=>{const r=s.get('meta');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});m.baselineRelease=m.baselineRelease+'-probe';s.put(m,'meta');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error)});db.close()}""")
    if case=='stale-preview-hash':
        return page.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});const tx=db.transaction(['assets'],'readwrite'),s=tx.objectStore('assets');s.put({key:'preview-probe.txt',sha256:'0'.repeat(64),mediaType:'text/plain',bytes:new Uint8Array([1])},'preview-probe.txt');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error)});db.close()}""")
    store={'second-tab-history-write':'history','concurrent-personal-write':'personal','concurrent-imports-write':'imports','concurrent-assets-write':'assets'}.get(case)
    if store:
        return page.evaluate("""async({store,caseName})=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});const tx=db.transaction([store],'readwrite'),s=tx.objectStore(store);if(store==='assets')s.put({key:'concurrent-probe.txt',sha256:'1'.repeat(64),mediaType:'text/plain',bytes:new Uint8Array([2])},'concurrent-probe.txt');else s.put({kind:'qualification-probe',caseName},'qualification-probe');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error)});db.close()}""",{'store':store,'caseName':case})
    scripts={
      'abort-during-descriptor-write':"""()=>{const orig=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(v,k){const r=orig.call(this,v,k);if(String(k).startsWith('archive:'))this.transaction.abort();return r;}}""",
      'descriptor-put-failure':"""()=>{const orig=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(v,k){const r=orig.call(this,v,k);if(String(k).startsWith('archive:'))orig.call(this,v,k);return r;}}""",
      'revision-delete-failure':"""()=>{const orig=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(k){if(String(k).startsWith('revision:'))throw new DOMException('Injected revision delete failure','InvalidStateError');return orig.call(this,k);}}""",
      'closed-review-delete-failure':"""()=>{const orig=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(k){if(String(k).startsWith('review:'))throw new DOMException('Injected review delete failure','InvalidStateError');return orig.call(this,k);}}""",
      'asset-delete-failure':"""()=>{const orig=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(k){if(!String(k).startsWith('revision:')&&!String(k).startsWith('review:'))throw new DOMException('Injected asset delete failure','InvalidStateError');return orig.call(this,k);}}""",
      'transaction-quota-failure':"""()=>{const orig=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(k){if(String(k).startsWith('revision:'))throw new DOMException('Injected quota failure','QuotaExceededError');return orig.call(this,k);}}"""
    }
    page.evaluate(scripts[case])

def run():
    out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/compaction'));out.mkdir(parents=True,exist_ok=True)
    rows=[];source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    build=json.loads((Path(os.environ.get('ATLAS_DIST','dist'))/'build-identity.json').read_text())
    try:
        assert build['buildKind']=='integrated' and build['sourceCommit']==source and not build['sourceDirty']
        base=start_server(dist=os.environ.get('ATLAS_DIST','dist'))
        with sync_playwright() as pw:
            browser=launch(pw)
            try:
                # Positive all-or-nothing commit, reopen, heads/projected current content unchanged.
                context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
                page=context.new_page();page.set_default_timeout(20000);page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page);seed_demo(page)
                before=persisted(page);heads_before=before['history']['heads'];_,preview=prepare(page,out,'success')
                click_commit(page,True);after=persisted(page)
                assert after['history']['heads']==heads_before
                assert len(after['history']['revisions'])==len(before['history']['revisions'])-len(preview['revisionIds'])
                assert any(a['archiveId']==preview['archiveId'] for a in after['history'].get('archives',[]))
                for rid in preview['revisionIds']:assert all(r['revisionId']!=rid for r in after['history']['revisions'])
                for aid in preview['assetKeys']:assert all(a['key']!=aid for a in after['assets'])
                page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
                reopened=persisted(page);assert reopened['history']==after['history'] and reopened['assets']==after['assets']
                rows.append({'name':'atomic-success-reopen','status':'PASS','removedRevisions':len(preview['revisionIds']),'removedReviews':len(preview['reviewIds']),'removedAssets':len(preview['assetKeys'])})
                context.close()

                for case in FAULTS:
                    context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
                    page=context.new_page();page.set_default_timeout(20000);page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page);seed_demo(page)
                    _,preview=prepare(page,out,case)
                    if case in ['closed-review-delete-failure'] and not preview['reviewIds']:
                        raise AssertionError('fixture has no closed review deletion to fault')
                    if case in ['asset-delete-failure'] and not preview['assetKeys']:
                        raise AssertionError('fixture has no asset deletion to fault')
                    mutate(page,case)
                    exact_before=raw(page)
                    click_commit(page,False)
                    exact_after=raw(page)
                    assert exact_after==exact_before,case+' changed durable state after failed transaction'
                    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app')
                    assert raw(page)==exact_before,case+' changed durable state after reopen'
                    rows.append({'name':case,'status':'PASS','scope':'real IndexedDB + reopened raw five-store equality'})
                    context.close()
            finally: browser.close()
    except Exception as exc:
        rows.append({'name':'qualification','status':'FAIL','error':str(exc),'traceback':traceback.format_exc()})
    status='PASS' if len(rows)==1+len(FAULTS) and all(r['status']=='PASS' for r in rows) else 'FAIL'
    report={'suite':'v23-compaction','status':status,'sourceCommit':source,'buildIdentity':build,'results':rows}
    (out/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
    return 0 if status=='PASS' else 1

if __name__=='__main__': raise SystemExit(run())
