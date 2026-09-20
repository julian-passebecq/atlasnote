"""Normal-origin qualification entrypoints, separate from old DOM-only diagnostics."""
import sys,zipfile
from v23_browser_common import *
from v23_finish_support import (prepare_archive,compact,attach,integrity,reviewed_edit,
    compare_via_history_ui,restore_via_history_ui,render_historical_pdf)

VIEWPORTS=[(1366,768),(1440,900),(1920,1080),(390,844)]

def layout(browser,context,page,base,out,passed):
    for width,height in VIEWPORTS:
        page.set_viewport_size({'width':width,'height':height});close_panels(page);open_settings(page)
        section=page.locator('section[aria-label="History archival and attachments"]')
        section.get_by_text('Prepare a verified history archive',exact=True).click()
        field=page.get_by_label('Live versions to retain',exact=True);field.scroll_into_view_if_needed();field.focus()
        assert field.evaluate('(e)=>e===document.activeElement')
        page.keyboard.press('Tab');assert page.evaluate('document.activeElement!==document.body')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert section.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        page.screenshot(path=str(out/f'controls-{width}x{height}.png'),full_page=True)
        passed(f'Integrated durability controls and keyboard {width}x{height}')
        close_panels(page)

def compare(browser,context,page,base,out,passed):
    seed_demo(page);close_panels(page)
    keys=[h['resourceKey'] for h in persisted(page)['history']['heads'] if ':demo.v23' in h['resourceKey'] and h['number']>1 and not h['resourceKey'].startswith('notebook-tree:')]
    assert len(keys)>=5
    for key in keys:
        versions=page.evaluate('async(key)=>('+AGENT+').listResourceVersions(key)',key)['items'];old=versions[-1]['revisionId']
        await_compare='async({key,old})=>{const a='+AGENT+';await a.compareRevisions(key,old);return a.getWorkspaceSummary();}'
        summary=page.evaluate(await_compare,{'key':key,'old':old})
        active=next(s for s in summary['slots'] if s['id']==summary['activeWorkspace'])
        assert active['compare'] and active['compareMode']=='changes'
        a,b=active['panes']
        ta=next(t['target'] for t in a['tabs'] if t['id']==a['activeTab'])
        tb=next(t['target'] for t in b['tabs'] if t['id']==b['activeTab'])
        assert ta['historyRevisionId']==old and not tb.get('historyRevisionId')
        page.locator('[data-agent-action="compare-mode"][data-compare-mode="side-by-side"]').click()
        summary=page.evaluate('async()=>('+AGENT+').getWorkspaceSummary()')
        assert next(s for s in summary['slots'] if s['id']==summary['activeWorkspace'])['compareMode']=='side-by-side'
        passed('Historical A / current B ordering and Changes/Side-by-side: '+key)
    page.screenshot(path=str(out/'version-compare.png'),full_page=True)

    section,removal,archive_file=prepare_archive(page,out,'compare-history',1)
    compact(page,section)
    compacted=persisted(page)
    for key in keys:
        versions=page.evaluate('async(key)=>('+AGENT+').listResourceVersions(key)',key)['items']
        old,other=versions[-1]['revisionId'],versions[-2]['revisionId']
        assert old in removal['revisionIds'] and other in removal['revisionIds']
        historical=page.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.rev)',{'key':key,'rev':old})
        compare_via_history_ui(page,key,old)
        compare_via_history_ui(page,key,old,other)
        passed('Version History UI: archived/current and archived/archived exact ordered identities',resourceKey=key)
        page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
        before=page.evaluate(RAW)
        missing=page.evaluate('async(x)=>{try{('+AGENT+').getResource(x.key,x.rev);return null;}catch(e){return e.message;}}',{'key':key,'rev':old})
        assert missing and 'Attach the exact archive' in missing and 'Current content was not substituted' in missing,missing
        assert page.evaluate(RAW)==before
        attach(page,archive_file)
        exact=page.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.rev)',{'key':key,'rev':old})
        assert exact['snapshot']==historical['snapshot']
        if key.startswith('pdf:'):
            detail=render_historical_pdf(page,key,old,out,'compare-archived-pdf')
            passed('Archived private PDF paints its original bytes, distinct from current',**detail)
        revision=restore_via_history_ui(page,key,old)
        passed('Version History UI restore-as-new preserves immutable versions and personal state',resourceKey=key,newRevisionId=revision['revisionId'],restoredFromRevisionId=old)
    integrity(page)

    # A second actual archive must extend, not rewrite, the first archive prefix.
    key='notebook-page:demo.v23.notebook'
    reviewed_edit(page,key)
    section,next_removal,next_file=prepare_archive(page,out,'compare-history-second',1)
    compact(page,section)
    second=persisted(page)
    first_descriptor=next(a for a in compacted['history']['archives'] if a['archiveId']==removal['archiveId'])
    assert first_descriptor in second['history']['archives']
    assert next_removal['archiveId']!=removal['archiveId']
    assert not set(next_removal['revisionIds'])&set(removal['revisionIds'])
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    attach(page,next_file)
    old=next(r['revisionId'] for r in first_descriptor['ranges'][0]['revisions'])
    # Only attaching archive two must not make archive one's payload available.
    owner=first_descriptor['ranges'][0]['resourceKey']
    missing=page.evaluate('async(x)=>{try{('+AGENT+').getResource(x.key,x.rev);return null;}catch(e){return e.message;}}',{'key':owner,'rev':old})
    assert missing and 'Attach the exact archive' in missing
    attach(page,archive_file)
    restored=page.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.rev)',{'key':owner,'rev':old})
    assert restored['revision']['revisionId']==old
    integrity(page)
    passed('Repeated native archive ceremony preserves prefix identities across reload and independent exact attachments',firstArchive=removal['archiveId'],secondArchive=next_removal['archiveId'])

def recovery(browser,context,page,base,out,passed):
    seed_demo(page);flush(page);saved=persisted(page)
    with page.expect_download() as pending:page.locator('[data-durability-action="complete-recovery"]').click()
    target=out/'saved-demo.atlas-recovery.zip';pending.value.save_as(str(target))
    choose(page,'Verify backup file',target)
    page.get_by_text('Saved file verified without restoring or changing IndexedDB. This proves these file bytes, not permanent external retention.',exact=True).wait_for()
    # Bundle creation flushes any pending production reader position before freezing
    # the backup. Compare restoration to the durable state at that exact boundary.
    flush(page);saved=persisted(page)
    fresh=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    try:
        p=fresh.new_page();p.set_default_timeout(12000);p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        assert not any('demo.v23' in h['resourceKey'] for h in persisted(p)['history']['heads'])
        open_settings(p);choose(p,'Restore workspace backup',target)
        p.get_by_role('heading',name='Restore preview',exact=True).wait_for()
        p.get_by_label('I understand that this replaces the current local workspace.',exact=True).check()
        p.get_by_role('button',name='Restore verified backup',exact=True).click()
        p.wait_for_timeout(400)
        dialog=p.get_by_role('dialog',name='Workspace settings',exact=True)
        if dialog.is_visible():
            alert=dialog.get_by_role('alert')
            detail=alert.text_content() if alert.count() else 'Restore remained open without an error message'
            raise AssertionError('restore-rejected: '+detail)
        p.wait_for_function('async()=>{const a='+AGENT+';const s=a.getStorageDiagnostics();return !s.saving&&!s.storageError;}')
        immediate=p.evaluate(RAW)
        immediate_overlays=next(row['value'] for row in immediate['overlays'] if row['key']=='active')
        immediate_keys=sorted(immediate_overlays.keys())
        expected_keys=sorted(saved['overlays'].keys())
        if immediate_keys!=expected_keys:
            raise AssertionError('restore-commit-overlays: '+json.dumps({'expectedKeys':expected_keys,'immediateKeys':immediate_keys}))
        flush(p)
        after_flush=p.evaluate(RAW)
        after_flush_overlays=next(row['value'] for row in after_flush['overlays'] if row['key']=='active')
        if sorted(after_flush_overlays.keys())!=expected_keys:
            raise AssertionError('post-flush-overlays: '+json.dumps({'expectedKeys':expected_keys,'afterFlushKeys':sorted(after_flush_overlays.keys())}))
        restored=persisted(p)
        def first_diff(a,b,path='$'):
            if type(a)!=type(b): return {'path':path,'savedType':type(a).__name__,'restoredType':type(b).__name__,'saved':a,'restored':b}
            if isinstance(a,dict):
                if set(a)!=set(b): return {'path':path,'savedKeys':sorted(a),'restoredKeys':sorted(b)}
                for key in sorted(a):
                    d=first_diff(a[key],b[key],path+'.'+key)
                    if d:return d
                return None
            if isinstance(a,list):
                if len(a)!=len(b):return {'path':path,'savedLength':len(a),'restoredLength':len(b)}
                for i,(x,y) in enumerate(zip(a,b)):
                    d=first_diff(x,y,path+'['+str(i)+']')
                    if d:return d
                return None
            return None if a==b else {'path':path,'saved':a,'restored':b}
        for key in ['imports','overlays','assets','history']:
            if restored[key]!=saved[key]:
                raise AssertionError(key+': '+json.dumps(first_diff(saved[key],restored[key]),default=str,sort_keys=True))
        p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        assert persisted(p)['history']==saved['history']
        open_settings(p);p.locator('[data-durability-action="integrity"]').click()
        p.get_by_text('Read-only integrity check passed. Nothing was repaired or changed.',exact=True).wait_for()
        passed('Downloaded opt-in demo recovery verified, restored in fresh profile and persisted after reload',scope='Live history only; no archived descriptor/asset reachability proof')
        p.screenshot(path=str(out/'fresh-recovery.png'),full_page=True)
    finally:fresh.close()

    # Now exercise complete recovery after real capacity recovery has externalized
    # old versions and their exclusively historical private PDF bytes.
    open_settings(page) if not page.get_by_role('dialog',name='Workspace settings',exact=True).is_visible() else None
    section=page.locator('section[aria-label="History archival and attachments"]')
    summary=section.get_by_text('Prepare a verified history archive',exact=True)
    if not section.locator('[data-durability-action="prepare-archive"]').is_visible():summary.click()
    page.get_by_label('Live versions to retain',exact=True).fill('1')
    section.locator('[data-durability-action="prepare-archive"]').click()
    section.locator('[data-archive-id]').wait_for()
    with page.expect_download() as pending:section.locator('[data-durability-action="download-archive"]').click()
    archive_file=out/'recovery-history.atlas-history.zip';pending.value.save_as(str(archive_file))
    choose(page,'Re-select saved archive',archive_file)
    preview=section.locator('[data-durability-preview]');preview.wait_for()
    removal=json.loads(preview.locator('pre').text_content())
    removed_pdf=[key for key in removal['assetKeys'] if key.endswith('.pdf')]
    assert removed_pdf,removal
    page.get_by_label('Confirm saved archive retention',exact=True).check()
    section.locator('[data-durability-action="compact-archive"]').click()
    page.get_by_text('Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.',exact=True).wait_for()
    compacted=persisted(page)
    assert all(key not in {a['key'] for a in compacted['assets']} for key in removed_pdf)
    descriptor=next(a for a in compacted['history']['archives'] if a['archiveId']==removal['archiveId'])

    with page.expect_download() as pending:page.locator('[data-durability-action="complete-recovery"]').click()
    archived_bundle=out/'archived-demo.atlas-recovery.zip';pending.value.save_as(str(archived_bundle))
    choose(page,'Verify backup file',archived_bundle)
    page.get_by_text('Saved file verified without restoring or changing IndexedDB. This proves these file bytes, not permanent external retention.',exact=True).wait_for()
    flush(page);compacted_saved=persisted(page)

    archived_context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    try:
        p=archived_context.new_page();p.set_default_timeout(15000);p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        open_settings(p);choose(p,'Restore workspace backup',archived_bundle)
        p.get_by_role('heading',name='Restore preview',exact=True).wait_for()
        p.get_by_label('I understand that this replaces the current local workspace.',exact=True).check()
        p.get_by_role('button',name='Restore verified backup',exact=True).click()
        p.wait_for_timeout(500)
        dialog=p.get_by_role('dialog',name='Workspace settings',exact=True)
        if dialog.is_visible():
            alert=dialog.get_by_role('alert');raise AssertionError('archived-restore-rejected: '+(alert.text_content() if alert.count() else 'unknown'))
        p.wait_for_function('async()=>{const a='+AGENT+';const s=a.getStorageDiagnostics();return !s.saving&&!s.storageError;}')
        restored=persisted(p)
        for key in ['imports','overlays','assets','history']:
            assert restored[key]==compacted_saved[key],key
        diag=p.evaluate('async()=>('+AGENT+').getStorageDiagnostics()')
        assert diag['archiveCount']>=1 and diag['archivedRevisions']>=descriptor['counts']['revisions']

        pdf_key=next(h['resourceKey'] for h in restored['history']['heads'] if h['resourceKey'].startswith('pdf:demo.v23'))
        versions=p.evaluate('async(key)=>('+AGENT+').listResourceVersions(key)',pdf_key)
        assert versions['total']>=4,versions
        oldest=versions['items'][-1]['revisionId']
        historical=p.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.rev)',{'key':pdf_key,'rev':oldest})
        assert historical['snapshot']['document']['assetKey'] in removed_pdf,historical
        rendering=render_historical_pdf(p,pdf_key,oldest,out,'recovered-archived-pdf')
        passed('Fresh-profile complete recovery restores external archive and renders historical private PDF',archiveId=descriptor['archiveId'],archivedRevisions=descriptor['counts']['revisions'],historicalPdfAsset=historical['snapshot']['document']['assetKey'],**rendering)
        p.screenshot(path=str(out/'archived-pdf-recovery.png'),full_page=True)

        # Reload deliberately drops session-only archive payloads. Identities remain,
        # but current content must never substitute for the missing historical bytes.
        p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        missing=p.evaluate('async(x)=>{try{const a='+AGENT+';a.getResource(x.key,x.rev);return null;}catch(e){return String(e.message||e);}}',{'key':pdf_key,'rev':oldest})
        assert missing and 'Attach the exact archive' in missing and 'Current content was not substituted' in missing,missing

        open_settings(p);choose(p,'Attach history archives',archived_bundle)
        p.get_by_text('Exact verified archives attached for this session. They remain external files; no history or proposal was changed.',exact=True).wait_for()
        exact=p.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.rev)',{'key':pdf_key,'rev':oldest})
        assert exact['revision']['revisionId']==oldest
        assert exact['snapshot']==historical['snapshot']
        rendering=render_historical_pdf(p,pdf_key,oldest,out,'reattached-archived-pdf')
        passed('Reloaded exact archive reattachment again renders historical private PDF bytes',**rendering)

        tampered=out/'tampered-recovery.zip'
        with zipfile.ZipFile(archived_bundle,'r') as src,zipfile.ZipFile(tampered,'w',zipfile.ZIP_DEFLATED) as dst:
            changed=False
            for info in src.infolist():
                body=src.read(info.filename)
                if not changed and info.filename.startswith('archives/') and not info.is_dir():
                    body=body+b' '
                    changed=True
                dst.writestr(info.filename,body)
            assert changed
        close_panels(p);open_settings(p);before_tamper=p.evaluate(RAW);choose(p,'Restore workspace backup',tampered)
        p.get_by_role('alert').wait_for()
        assert p.evaluate(RAW)==before_tamper
        passed('Reload requires exact archive reattachment; tampered recovery is rejected before replacement',archiveId=descriptor['archiveId'])
    finally:archived_context.close()

def safe_close(browser,context,page,base,out,passed):
    seed_demo(page);flush(page)
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    before=page.evaluate(RAW)
    page.locator('[data-durability-action="lock"]').click()
    page.get_by_text('This is an ungated local HTTP development origin. Use Netlify HTTPS/Netlify Dev integration to test access control.',exact=True).wait_for()
    assert page.evaluate(RAW)==before
    passed('Healthy saved state visible; HTTP lock refuses and does not clear IndexedDB',scope='Not HTTPS logout, pending-write or emergency-export proof')

    def dismiss_real_unload():
        with page.expect_event('dialog',timeout=10000) as pending:
            page.close(run_before_unload=True)
        dialog=pending.value
        assert dialog.type=='beforeunload',dialog.type
        dialog.dismiss()
        assert not page.is_closed()

    # Keep a real personal readwrite transaction alive with queued IDB requests.
    # The UI write queues behind it; no production store/saving flag is modified.
    page.evaluate("""async()=>{
      const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
      window.__qaHoldPersonal=true;
      const tx=db.transaction('personal','readwrite'),st=tx.objectStore('personal');
      tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
      const keep=()=>{const r=st.get('active');r.onsuccess=()=>{if(window.__qaHoldPersonal)keep();};};keep();
    }""")
    field=page.get_by_label('Theme',exact=True)
    old_theme=field.input_value()
    themes=field.locator('option').evaluate_all('(es)=>es.map(e=>e.value)')
    new_theme=next(t for t in themes if t!=old_theme)
    field.select_option(new_theme)
    page.wait_for_function('async()=>('+AGENT+').getStorageDiagnostics().saving>0')
    assert page.locator('[data-save-safety]').inner_text().startswith('Pending writes /')
    dismiss_real_unload()
    page.evaluate('window.__qaHoldPersonal=false')
    flush(page)
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    assert field.input_value()==new_theme
    passed('A real queued IndexedDB write triggers the native beforeunload dialog and saves after release')

    # Fail a native transaction after its put request is queued. Reads remain real.
    before=page.evaluate(RAW)
    page.evaluate("""()=>{
      window.__qaOriginalPersonalPut=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(value,key){
        const r=window.__qaOriginalPersonalPut.call(this,value,key);
        if(this.name==='personal'){const tx=this.transaction;queueMicrotask(()=>{try{tx.abort();}catch{}});}
        return r;
      };
    }""")
    field.select_option(old_theme)
    page.wait_for_function('async()=>{const s=('+AGENT+').getStorageDiagnostics();return !!s.storageError&&!s.saving;}')
    assert page.locator('[data-save-safety]').inner_text().startswith('UNSAVED /')
    assert page.evaluate(RAW)==before
    with page.expect_download() as pending:
        page.get_by_role('button',name='Download raw recovery JSON',exact=True).click()
    emergency=out/'unsaved-emergency.json';pending.value.save_as(str(emergency))
    exported=json.loads(emergency.read_text())
    assert exported['format']=='atlasnote-emergency-recovery'
    assert exported['persistence']['status']=='unsaved' and exported['persistence']['storageError']
    saved_personal=next(r['value'] for r in before['personal'] if r['key']=='active')
    assert exported['persisted']['personal']==[saved_personal]
    assert exported['inMemory']['personal']!=saved_personal
    assert 'not a verified workspace backup' in exported['warning']
    assert page.evaluate(RAW)==before
    dismiss_real_unload()
    page.evaluate('IDBObjectStore.prototype.put=window.__qaOriginalPersonalPut;delete window.__qaOriginalPersonalPut')
    page.get_by_role('button',name='Retry saving',exact=True).click()
    page.wait_for_function('async()=>{const s=('+AGENT+').getStorageDiagnostics();return !s.storageError&&!s.saving;}')
    flush(page)
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    assert page.get_by_label('Theme',exact=True).input_value()==old_theme
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    open_settings(page)
    assert page.get_by_label('Theme',exact=True).input_value()==old_theme
    passed('Aborted IndexedDB transaction: exact rollback, visible failure, native unload warning, unsaved emergency copy and real retry survive reload')


SUITES={
 'layout':(layout,('Integrated unlock-page layout/keyboard under a real Netlify HTTPS gate',)),
 'compare':(compare,()),
 'recovery':(recovery,()),
 'safe-close':(safe_close,('Lock waits for pending writes and refuses failed persistence under real Netlify HTTPS; logout clears only cookie, not IndexedDB',)),
}
if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in SUITES:raise SystemExit('Expected layout, compare, recovery or safe-close')
    body,remaining=SUITES[sys.argv[1]];raise SystemExit(run_suite(sys.argv[1],body,remaining))
