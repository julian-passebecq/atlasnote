"""Normal-origin qualification entrypoints, separate from old DOM-only diagnostics."""
import sys
from v23_browser_common import *

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
        p.get_by_role('button',name='Restore verified backup',exact=True).click();p.wait_for_timeout(300);flush(p)
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

def safe_close(browser,context,page,base,out,passed):
    seed_demo(page);flush(page)
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    before=page.evaluate(RAW)
    page.locator('[data-durability-action="lock"]').click()
    page.get_by_text('This is an ungated local HTTP development origin. Use Netlify HTTPS/Netlify Dev integration to test access control.',exact=True).wait_for()
    assert page.evaluate(RAW)==before
    passed('Healthy saved state visible; HTTP lock refuses and does not clear IndexedDB',scope='Not HTTPS logout, pending-write or emergency-export proof')

SUITES={
 'layout':(layout,('Integrated unlock-page layout/keyboard under a real Netlify HTTPS gate',)),
 'compare':(compare,('Version History UI selection, archived A/current B, missing archive no substitution and restore-as-new',)),
 'recovery':(recovery,('Fresh-profile complete recovery with externalized archives and historical private-PDF bytes/rendering','Repeated lineage, exact reattachment after reload, missing/tampered dependencies rejected before replacement')),
 'safe-close':(safe_close,('Real pending/failed-write unload dialogs','Failed transaction retry and emergency-export copy','Lock waits for pending writes and refuses failed persistence under HTTPS')),
}
if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in SUITES:raise SystemExit('Expected layout, compare, recovery or safe-close')
    body,remaining=SUITES[sys.argv[1]];raise SystemExit(run_suite(sys.argv[1],body,remaining))
):
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
                    d=first_diff(x,y,f'{path}[{i}]')
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

def safe_close(browser,context,page,base,out,passed):
    seed_demo(page);flush(page)
    assert page.locator('[data-save-safety]').inner_text().startswith('Saved /')
    before=page.evaluate(RAW)
    page.locator('[data-durability-action="lock"]').click()
    page.get_by_text('This is an ungated local HTTP development origin. Use Netlify HTTPS/Netlify Dev integration to test access control.',exact=True).wait_for()
    assert page.evaluate(RAW)==before
    passed('Healthy saved state visible; HTTP lock refuses and does not clear IndexedDB',scope='Not HTTPS logout, pending-write or emergency-export proof')

SUITES={
 'layout':(layout,('Integrated unlock-page layout/keyboard under a real Netlify HTTPS gate',)),
 'compare':(compare,('Version History UI selection, archived A/current B, missing archive no substitution and restore-as-new',)),
 'recovery':(recovery,('Fresh-profile complete recovery with externalized archives and historical private-PDF bytes/rendering','Repeated lineage, exact reattachment after reload, missing/tampered dependencies rejected before replacement')),
 'safe-close':(safe_close,('Real pending/failed-write unload dialogs','Failed transaction retry and emergency-export copy','Lock waits for pending writes and refuses failed persistence under HTTPS')),
}
if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in SUITES:raise SystemExit('Expected layout, compare, recovery or safe-close')
    body,remaining=SUITES[sys.argv[1]];raise SystemExit(run_suite(sys.argv[1],body,remaining))
