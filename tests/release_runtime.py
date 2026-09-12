"""Release gate: real-origin app, actual IndexedDB, browser ZIP download and fresh-context restore.
No route interception, storage mocks, database seeding or browser-policy changes.
Exit 2 is BLOCKED, never success. Use the offline production build, not the DOM harness.
"""
from pathlib import Path
import hashlib
import json
import os
import traceback
import zipfile
from playwright.sync_api import sync_playwright
from browser_support import ROOT, start_server, launch, synthetic_data

OUT = ROOT / os.environ.get('ATLAS_EVIDENCE', 'docs/evidence/hardening/runtime')
OUT.mkdir(parents=True, exist_ok=True)
CASES = [
 ('real_origin', 'Unmodified production entry on a normal HTTP origin'),
 ('import_v1', 'Synthetic v1 imported through the library preview and commit controls'),
 ('personal_state', 'Personal remarks, flags, position bookmark and local root page created'),
 ('local_pdf', 'PDF imported into the chosen folder with byte-identical local data'),
 ('reload', 'Newly created hierarchy, tabs, personal state and local bytes survive reload'),
 ('import_v2', 'Synthetic v1.1 update and source move preserve local/personal state'),
 ('idempotent', 'Repeated v1.1 import does not duplicate pages or change personal state'),
 ('backup_download', 'Actual browser workspace-backup download produces a readable ZIP'),
 ('fresh_context', 'New browser context starts with an empty IndexedDB workspace'),
 ('restore', 'Backup is restored through preview, consent and restore controls'),
 ('restored_exact', 'Exact remarks, bookmarks, flags, overlays, imports and PDF bytes restored'),
 ('restored_reload', 'Restored workspace survives a second reload'),
 ('no_errors', 'No uncaught errors during the normal-origin end-to-end flow'),
]
results = []
phase = 'real_origin'
base = start_server()
errors = []
fixtures = synthetic_data()
long_title = next(p['title'] for p in fixtures[0]['packs'][0]['pages'] if p['id']=='audit.page.long')
page = None


def record(case_id, detail=None):
    name = dict(CASES)[case_id]
    results.append({'id': case_id, 'name': name, 'status': 'PASS', 'detail': detail})
    print('PASS', case_id, flush=True)


def snapshot(target):
    # Reads the actual production store and actual IndexedDB. It does not inject state.
    target.wait_for_timeout(400)
    return target.evaluate('''async()=>{
      const m=await import(new URL('app/storage/database.js',document.baseURI).href);
      await m.store.flush();if(m.store.error)throw Error(m.store.error);
      const ws=await m.loadWorkspace();
      return {...ws,assets:await Promise.all(ws.assets.map(async a=>({
        key:a.key,sha256:a.sha256,mediaType:a.mediaType,bytes:Array.from(a.bytes),actualSha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a.bytes)),b=>b.toString(16).padStart(2,'0')).join('')
      })))};
    }''')


def open_settings(target):
    target.get_by_role('button', name='Workspace settings', exact=True).click()


def import_version(target, version):
    open_settings(target)
    target.get_by_label('Import library ZIP', exact=True).set_input_files(str(ROOT/'tests/fixtures'/f'atlas-audit-stress-library-{version}.zip'))
    target.get_by_role('button', name='Confirm library import', exact=True).click()
    target.get_by_role('button', name='Confirm library import', exact=True).wait_for(state='detached')
    target.get_by_role('button', name='Close dialog', exact=True).click()


def search_open(target, title, new_tab=False):
    target.get_by_role('button', name='Global search', exact=True).click()
    target.get_by_role('textbox', name='Search all pages and glossary', exact=True).fill(title)
    if new_tab:
        target.get_by_role('button', name='Open '+title+' in new tab', exact=True).click()
    else:
        target.locator('.search-result').filter(has_text=title).first.click()


def same_saved_state(actual, expected, session=True):
    for key in ['notes', 'ratings', 'bookmarks']:
        assert actual['personal'][key] == expected['personal'][key], key
    if session:
        assert actual['personal']['session'] == expected['personal']['session'], 'session'
    assert actual['overlays'] == expected['overlays'], 'overlays'
    assert sorted(actual['imports'], key=lambda p:p['manifest']['id']) == sorted(expected['imports'], key=lambda p:p['manifest']['id']), 'imports'
    assert sorted(actual['assets'], key=lambda a:a['key']) == sorted(expected['assets'], key=lambda a:a['key']), 'asset bytes'


try:
    with sync_playwright() as pw:
        browser=launch(pw)
        context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
        page=context.new_page();page.set_default_timeout(15000)
        page.on('pageerror', lambda e:errors.append(str(e)))
        page.goto(base,wait_until='networkidle')
        page.get_by_role('button',name='Workspace settings',exact=True).wait_for()
        first=snapshot(page)
        assert first['imports']==[] and first['assets']==[] and first['personal']['notes']=={}
        record(phase, {'origin':base,'storage':'actual IndexedDB; no mocks'})

        phase='import_v1';import_version(page,'1.0.0');v1=snapshot(page)
        assert any(p['manifest']['version']=='1.0.0' and p['manifest']['id']=='atlas.audit.stress' for p in v1['imports'])
        record(phase)

        phase='personal_state';search_open(page,long_title)
        page.get_by_role('button',name='Remarks',exact=True).click()
        page.get_by_role('textbox',name='Personal remarks',exact=True).fill('RUNTIME_REMARK_A_exact\nSecond line retained.')
        page.get_by_role('combobox',name='Learning flag',exact=True).select_option('green')
        page.locator('.active-pane .note-scroller').evaluate('(e)=>{e.scrollTop=800;e.dispatchEvent(new Event("scroll"));}')
        page.wait_for_timeout(450)
        page.get_by_role('button',name='Bookmark reading position',exact=True).click()
        page.locator('.active-pane').get_by_role('button',name='Book',exact=True).click()
        page.wait_for_timeout(500)
        # Root page creation uses the same normal modal as a reader would use.
        page.locator('.tree-target').filter(has_text='Reader guide').last.click(button='right')
        page.get_by_role('menuitem',name='Add page',exact=True).click()
        page.get_by_label('Title',exact=True).fill('Runtime retained root page')
        page.get_by_label('Page content (Markdown)').fill('PERSONAL_LOCAL_PAGE_BYTES\n\nThis is synthetic release-test content.')
        page.get_by_role('button',name='Create page',exact=True).click()
        created=snapshot(page)
        local_id=next(k for k,v in created['overlays']['pages'].items() if v['page']['title']=='Runtime retained root page')
        assert created['personal']['notes']['audit.page.long']['text'].startswith('RUNTIME_REMARK_A_exact')
        assert created['personal']['ratings']['audit.page.long']=='green'
        assert created['personal']['bookmarks'][0]['anchor']['blockId']
        record(phase,{'localPageId':local_id,'bookmark':created['personal']['bookmarks'][0]})

        phase='local_pdf';open_settings(page)
        original=(ROOT/'templates/pdf-library/assets/pdf/pdf.example.fabric/fabric-cheatsheet.pdf').read_bytes()
        digest=hashlib.sha256(original).hexdigest()
        page.get_by_label('Import local PDF',exact=True).set_input_files({'name':'retained-runtime.pdf','mimeType':'application/pdf','buffer':original})
        page.get_by_label('Document title',exact=True).fill('Runtime retained PDF')
        page.get_by_role('combobox',name='Notebook',exact=True).select_option('project.atlas.guide')
        page.get_by_role('combobox',name='Inside folder',exact=True).select_option('node.atlas.documents')
        page.get_by_role('button',name='Import PDF locally',exact=True).click()
        page.get_by_role('button',name='Compare in two panes',exact=True).click()
        pre=snapshot(page)
        pdf=next(d for d in pre['overlays']['documents'] if d['title']=='Runtime retained PDF')
        asset=next(a for a in pre['assets'] if a['key']==pdf['assetKey'])
        assert bytes(asset['bytes'])==original and asset['actualSha256']==digest
        op=next(o for o in pre['overlays']['operations'] if o.get('node',{}).get('pageId')==pdf['pageId'])
        assert op['parentId']=='node.atlas.documents' and op['projectId']=='project.atlas.guide'
        assert len(pre['personal']['session']['panes'])==2
        record(phase,{'bytes':len(original),'sha256':digest,'folder':op['parentId']})

        phase='reload';page.reload(wait_until='networkidle');post=snapshot(page);same_saved_state(post,pre)
        page.screenshot(path=str(OUT/'01-reloaded-workspace.png'));record(phase)

        phase='import_v2';prior=snapshot(page);import_version(page,'1.1.0');updated=snapshot(page)
        for key in ['notes','ratings','bookmarks','session']:
            assert updated['personal'][key]==prior['personal'][key],key
        assert updated['overlays']==prior['overlays'] and updated['assets']==prior['assets']
        changed=next(p for p in updated['imports'] if p['manifest']['id']=='atlas.audit.stress')
        assert changed['manifest']['version']=='1.1.0'
        assert changed['hash']==fixtures[1]['packs'][0]['hash']
        assert next(p for p in changed['pages'] if p['id']=='audit.page.long')['summary']==next(p for p in fixtures[1]['packs'][0]['pages'] if p['id']=='audit.page.long')['summary']
        record(phase,{'sourceHash':changed['hash'],'preservedPersonal':True,'preservedLocal':True})

        phase='idempotent';import_version(page,'1.1.0');again=snapshot(page);same_saved_state(again,updated);record(phase)

        phase='backup_download';open_settings(page)
        before_backup=snapshot(page)
        with page.expect_download(timeout=15000) as transfer:
            page.get_by_role('button',name='Download workspace backup',exact=True).click()
        download=transfer.value
        backup_path=OUT/'synthetic-runtime.atlas-backup.zip'
        download.save_as(str(backup_path))
        assert download.failure() is None
        with zipfile.ZipFile(backup_path) as archive:
            assert archive.testzip() is None
            members=archive.namelist();assert 'backup.json' in members
            package=json.loads(archive.read('backup.json'))
            assert package['workspace']['personal']==before_backup['personal']
            expected_backup=package['workspace']
            expected_backup['assets']=[{'key':a['key'],'sha256':a['sha256'],'mediaType':a['mediaType'],
                'bytes':list(archive.read(a['path'])),'actualSha256':hashlib.sha256(archive.read(a['path'])).hexdigest()}
                for a in package['assetIndex']]
            # Built-in content and attachments are intentionally snapshotted too.
            for imported in before_backup['imports']:
                assert imported in expected_backup['imports']
        record(phase,{'bytes':backup_path.stat().st_size,'sha256':hashlib.sha256(backup_path.read_bytes()).hexdigest(),'files':len(members),'downloadedByBrowser':True})
        context.close()

        phase='fresh_context';fresh=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
        restored_page=fresh.new_page();restored_page.set_default_timeout(15000);restored_page.on('pageerror',lambda e:errors.append(str(e)))
        restored_page.goto(base,wait_until='networkidle');empty=snapshot(restored_page)
        assert empty['imports']==[] and empty['assets']==[] and empty['personal']['notes']=={}
        record(phase,{'differentBrowserContext':True,'emptyPersonalAndImports':True})

        phase='restore';open_settings(restored_page)
        restored_page.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup_path))
        restored_page.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check()
        restored_page.get_by_role('button',name='Restore verified backup',exact=True).click()
        restored_page.get_by_role('dialog').wait_for(state='detached');record(phase)
        phase='restored_exact';restored=snapshot(restored_page);same_saved_state(restored,expected_backup)
        record(phase,{'personalExact':True,'sessionExact':True,'overlaysExact':True,'importsExact':True,'localPDFBytesExact':True,'sha256':digest})
        phase='restored_reload';restored_page.reload(wait_until='networkidle');same_saved_state(snapshot(restored_page),expected_backup)
        restored_page.screenshot(path=str(OUT/'02-restored-reloaded.png'));record(phase)
        phase='no_errors';assert errors==[],errors;record(phase)
        browser.close()
except Exception as exc:
    text=str(exc)
    status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in text or 'Download is blocked' in text or 'Executable doesn\'t exist' in text else 'FAIL'
    results.append({'id':phase,'name':dict(CASES)[phase],'status':status,'error':text})
    print(status,phase,text,flush=True)
    traceback.print_exc()
    covered={r['id'] for r in results}
    for ident,name in CASES:
        if ident not in covered:
            results.append({'id':ident,'name':name,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete. No simulated pass is substituted.'})
report={'scope':'Actual normal-origin production app / real IndexedDB / actual browser ZIP download / independent fresh browser context',
        'status':'FAIL' if any(r['status']=='FAIL' for r in results) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in results) else 'PASS',
        'checks':results,'errors':errors}
(OUT/'results.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:sum(r['status']==k for r in results) for k in ['PASS','FAIL','BLOCKED']}))
raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
