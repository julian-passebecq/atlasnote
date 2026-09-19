"""Integrated browser gates. Unproven provider cases remain release blockers."""
import sys
import zipfile
from v23_browser_common import *
from v23_finish_helpers import compact_saved, compare_targets, visible_historical_pdf, archived_compare, ATTACHED

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
        page.evaluate('async(x)=>{await ('+AGENT+').compareRevisions(x.key,x.old);}',{'key':key,'old':old})
        assert compare_targets(page,old)['compareMode']=='changes'
        page.locator('[data-agent-action="compare-mode"][data-compare-mode="side-by-side"]').click()
        assert compare_targets(page,old)['compareMode']=='side-by-side'
        passed('Historical A / current B ordering and Changes/Side-by-side: '+key)
    page.screenshot(path=str(out/'version-compare.png'),full_page=True)
    archived_compare(page,out,passed)

def save_recovery(page,out,name):
    close_panels(page);open_settings(page)
    with page.expect_download() as pending:page.locator('[data-durability-action="complete-recovery"]').click()
    target=out/(name+'.atlas-recovery.zip');pending.value.save_as(str(target))
    choose(page,'Verify backup file',target)
    page.get_by_text('Saved file verified without restoring or changing IndexedDB. This proves these file bytes, not permanent external retention.',exact=True).wait_for()
    flush(page)
    return target,persisted(page)

def restore_recovery(page,target,saved):
    open_settings(page);choose(page,'Restore workspace backup',target)
    page.get_by_role('heading',name='Restore preview',exact=True).wait_for()
    page.get_by_label('I understand that this replaces the current local workspace.',exact=True).check()
    page.get_by_role('button',name='Restore verified backup',exact=True).click()
    page.get_by_text('Workspace restored from verified bytes.',exact=True).wait_for()
    page.wait_for_function('async()=>{const s=('+AGENT+').getStorageDiagnostics();return !s.saving&&!s.storageError;}')
    restored=persisted(page)
    for key in ['imports','overlays','assets','history','personal']:
        assert restored[key]==saved[key],'Exact restored store: '+key
    return restored

def fresh_context(browser,base):
    c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    p=c.new_page();p.set_default_timeout(20000);p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
    return c,p

def recovery(browser,context,page,base,out,passed):
    seed_demo(page);target,saved=save_recovery(page,out,'live-demo')
    fresh,p=fresh_context(browser,base)
    try:
        assert not any('demo.v23' in h['resourceKey'] for h in persisted(p)['history']['heads'])
        restore_recovery(p,target,saved)
        p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        assert persisted(p)['history']==saved['history']
        open_settings(p);p.locator('[data-durability-action="integrity"]').click()
        p.get_by_text('Read-only integrity check passed. Nothing was repaired or changed.',exact=True).wait_for()
        p.screenshot(path=str(out/'fresh-live-recovery.png'),full_page=True)
        passed('Fresh-profile live complete recovery restores all five state classes and passes integrity after reload')
    finally:fresh.close()
    archive,removal=compact_saved(page,out,'externalized-history',1)
    removed_pdf=[key for key in removal['assetKeys'] if key.endswith('.pdf')];assert removed_pdf,removal
    assert not set(removed_pdf)&{a['key'] for a in persisted(page)['assets']}
    bundle,saved=save_recovery(page,out,'archived-demo')
    fresh,p=fresh_context(browser,base)
    try:
        restored=restore_recovery(p,bundle,saved)
        assert restored['history']['archives']==saved['history']['archives']
        pdf_key='pdf:demo.v23.document'
        versions=p.evaluate('async(key)=>('+AGENT+').listResourceVersions(key)',pdf_key)
        assert versions['total']>=4
        oldest=versions['items'][-1]['revisionId']
        historical=p.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.old)',{'key':pdf_key,'old':oldest})
        assert historical['snapshot']['document']['assetKey'] in removed_pdf
        rendered=visible_historical_pdf(p,pdf_key,oldest,out,'recovered-physical-pdf')
        passed('Externalized complete recovery restores five-store state and genuinely renders historical private PDF',archiveId=removal['archiveId'],**rendered)
        p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
        before=p.evaluate(RAW)
        missing=p.evaluate('async(x)=>{try{('+AGENT+').getResource(x.key,x.old);return null;}catch(e){return String(e.message||e);}}',{'key':pdf_key,'old':oldest})
        assert missing and 'Attach the exact archive' in missing and 'Current content was not substituted' in missing
        assert p.evaluate(RAW)==before
        open_settings(p);choose(p,'Attach history archives',bundle);p.get_by_text(ATTACHED,exact=True).wait_for()
        again=visible_historical_pdf(p,pdf_key,oldest,out,'reattached-physical-pdf')
        assert again['sha256']==rendered['sha256'] and again['revisionId']==oldest
        tampered=out/'tampered-recovery.zip'
        with zipfile.ZipFile(bundle) as src,zipfile.ZipFile(tampered,'w',zipfile.ZIP_DEFLATED) as dst:
            changed=False
            for info in src.infolist():
                body=src.read(info.filename)
                if not changed and info.filename.startswith('archives/') and not info.is_dir():body+=b' ';changed=True
                dst.writestr(info.filename,body)
            assert changed
        close_panels(p);open_settings(p);flush(p);before=p.evaluate(RAW)
        choose(p,'Restore workspace backup',tampered);p.get_by_role('alert').wait_for()
        assert p.evaluate(RAW)==before
        passed('Reload drops payloads; exact recovery attachment restores rendered bytes; tampering cannot replace any store')
    finally:fresh.close()

def safe_close(browser,context,page,base,out,passed):
    seed_demo(page);flush(page)
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    before=page.evaluate(RAW);page.locator('[data-durability-action="lock"]').click()
    page.get_by_text('This is an ungated local HTTP development origin. Use Netlify HTTPS/Netlify Dev integration to test access control.',exact=True).wait_for()
    assert page.evaluate(RAW)==before
    passed('Healthy saved state visible; HTTP lock refuses and does not clear IndexedDB',scope='Not HTTPS logout, pending-write or emergency-export proof')

SUITES={
 'layout':(layout,('Integrated unlock-page layout/keyboard under a real Netlify HTTPS gate',)),
 'compare':(compare,()),
 'recovery':(recovery,()),
 'safe-close':(safe_close,('Real pending/failed-write unload dialogs','Failed transaction retry and emergency-export copy','Lock waits for pending writes and refuses failed persistence under HTTPS')),
}
if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in SUITES:raise SystemExit('Expected layout, compare, recovery or safe-close')
    body,remaining=SUITES[sys.argv[1]];raise SystemExit(run_suite(sys.argv[1],body,remaining))
