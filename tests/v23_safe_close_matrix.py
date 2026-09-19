"""Native pending/aborted writes, beforeunload, recovery-copy and retry proof."""
from v23_browser_common import *
from browser_support import more_action

def unload_is_guarded(page):
    page.evaluate('window.__unloadSentinel="still-open"')
    with page.expect_event('dialog',timeout=8000) as pending:
        page.evaluate('setTimeout(()=>location.reload(),0)')
    dialog=pending.value
    assert dialog.type=='beforeunload',dialog.type
    dialog.dismiss()
    assert page.evaluate('window.__unloadSentinel')=='still-open'

def pending_write(page,passed):
    close_panels(page);open_settings(page);flush(page)
    current=page.get_by_label('Theme',exact=True).input_value()
    theme=next(x for x in page.get_by_label('Theme',exact=True).locator('option').evaluate_all('(xs)=>xs.map(x=>x.value)') if x!=current)
    page.evaluate("""()=>{window.__holdWrite=true;const original=IDBDatabase.prototype.transaction;window.__undoHold=()=>{IDBDatabase.prototype.transaction=original;};IDBDatabase.prototype.transaction=function(names,mode,...args){const tx=original.call(this,names,mode,...args);const list=typeof names==='string'?[names]:Array.from(names);if(mode==='readwrite'&&list.length===1&&list[0]==='personal'&&window.__holdWrite){window.__heldTransaction=true;const keep=()=>{if(window.__holdWrite){const r=tx.objectStore('personal').get('active');r.onsuccess=keep;}};keep();}return tx;};}""")
    try:
        page.get_by_label('Theme',exact=True).select_option(theme)
        page.wait_for_function('async()=>window.__heldTransaction&&('+AGENT+').getStorageDiagnostics().saving>0')
        assert page.locator('[data-save-safety]').inner_text().startswith('Pending writes /')
        unload_is_guarded(page)
    finally:page.evaluate('window.__holdWrite=false;window.__undoHold()')
    flush(page)
    assert persisted(page)['personal']['session']['theme']==theme
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    passed('Actual pending IndexedDB write blocks safe-close, native beforeunload cancellation retains page, release commits and clears warning')

def failed_write_copy_retry(browser,page,base,out,passed):
    key='notebook-page:demo.v23.notebook';marker='V23 unsaved emergency-copy proof'
    close_panels(page)
    page.evaluate('async(key)=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource(key).target,"here");}',key)
    flush(page);before=page.evaluate(RAW)
    prior=page.evaluate('async(key)=>('+AGENT+').getResource(key)',key)
    more_action(page,'Edit current page')
    page.get_by_label('Append a new text block (optional)',exact=True).fill(marker)
    page.evaluate("""()=>{const original=IDBObjectStore.prototype.put;window.__undoWriteFault=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(value,key){const request=original.call(this,value,key);if(this.name==='history'&&key==='meta'&&!window.__abortedWrite){window.__abortedWrite=true;this.transaction.abort();}return request;};}""")
    page.get_by_role('button',name='Save page locally',exact=True).click()
    page.wait_for_function('async()=>window.__abortedWrite&&!!('+AGENT+').getStorageDiagnostics().storageError')
    page.evaluate('window.__undoWriteFault()')
    assert page.evaluate(RAW)==before
    unload_is_guarded(page)
    close_panels(page);open_settings(page)
    assert page.locator('[data-save-safety]').inner_text().startswith('UNSAVED /')
    with page.expect_download() as pending:page.get_by_role('button',name='Download workspace backup',exact=True).click()
    backup=out/'emergency-copy.atlas-backup.zip';pending.value.save_as(str(backup))
    page.get_by_text('Browser saving failed; this backup captures current in-memory work.',exact=False).wait_for()
    choose(page,'Verify backup file',backup)
    page.get_by_text('Saved file verified without restoring or changing IndexedDB. This proves these file bytes, not permanent external retention.',exact=True).wait_for()
    assert page.evaluate(RAW)==before,'Emergency preparation/verification must not repair or overwrite live storage'
    c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);p=c.new_page();p.set_default_timeout(20000)
    try:
        p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p);open_settings(p)
        choose(p,'Restore workspace backup',backup);p.get_by_role('heading',name='Restore preview',exact=True).wait_for()
        p.get_by_label('I understand that this replaces the current local workspace.',exact=True).check()
        p.get_by_role('button',name='Restore verified backup',exact=True).click()
        p.get_by_text('Workspace restored from verified bytes.',exact=True).wait_for();flush(p)
        copied=p.evaluate('async(key)=>('+AGENT+').getResource(key)',key)
        assert marker in str(copied['snapshot']) and copied['head']['number']==prior['head']['number']+1
        p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        assert p.evaluate('async(key)=>('+AGENT+').getResource(key)',key)['snapshot']==copied['snapshot']
    finally:c.close()
    page.get_by_role('button',name='Retry saving',exact=True).click();flush(page)
    current=page.evaluate('async(key)=>('+AGENT+').getResource(key)',key)
    assert current['snapshot']==copied['snapshot'] and current['head']['number']==prior['head']['number']+1
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    assert page.evaluate('async(key)=>('+AGENT+').getResource(key)',key)['snapshot']==copied['snapshot']
    passed('Aborted native authored write retains unsaved warning and native unload guard; emergency copy restores unsaved content in another profile without changing source stores; explicit retry commits once')

def safe_close_matrix(browser,context,page,base,out,passed):
    pending_write(page,passed)
    failed_write_copy_retry(browser,page,base,out,passed)
