"""Additional completion acceptance on the integrated app and disposable origins.

All decisions below are explicit synthetic QA decisions. No user profile is used.
Authored writes use normal intake or the public preview/stage/review UI. IndexedDB
is read only except the explicitly identified legacy migration fixture setup.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import traceback
import zipfile
import pymupdf
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, open_settings, close_panels, show_reader_controls, choose_library_resource

OUT = Path(os.environ.get('ATLAS_EVIDENCE', ROOT / 'docs/evidence/v22/completion-runtime'))
OUT.mkdir(parents=True, exist_ok=True)
# The npm runner supplies fresh, per-run fixtures outside the tracked source tree.
# Direct/manual invocation retains the historical documentation path.
EXAMPLES = Path(os.environ.get('ATLAS_V22_EXAMPLES_DIR', ROOT / 'docs/examples/v22')).resolve()
PUBLIC = "(await import(new URL('app/agent/public.js',document.baseURI).href)).getAgentInterface()"
NOTE = 'notebook-page:page.atlas.welcome'
PDF = 'pdf:doc.qa.history'
MATRIX = [(1440, 900), (1100, 800), (800, 900), (390, 844)]
results, errors, network = [], [], []
active_case = 'setup'

def api(p, code, arg=None):
    return p.evaluate('async(arg)=>{const api=' + PUBLIC + ';' + code + '}', arg)

def ready(p):
    p.goto(base, wait_until='networkidle')
    expect(p.locator('.atlas-app')).to_be_visible()
    p.wait_for_function('async()=>(' + PUBLIC + ').getStorageDiagnostics().initialized')

def context():
    c = browser.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    p = c.new_page()
    p.set_default_timeout(12000)
    p.on('pageerror', lambda e: errors.append(str(e)))
    p.on('requestfailed', lambda r: network.append({'case': active_case, 'url': r.url, 'resourceType': r.resource_type, 'failure': r.failure, 'pageClosed': p.is_closed()}))
    ready(p)
    return c, p

def shot(p, name):
    p.screenshot(path=str(OUT / (name + '.png')), full_page=True)

def check(name, fn):
    global active_case
    active_case = name
    try:
        detail = fn()
        results.append({'name': name, 'status': 'PASS', 'detail': detail})
        print('PASS', name, flush=True)
    except Exception as e:
        results.append({'name': name, 'status': 'FAIL', 'error': str(e), 'traceback': traceback.format_exc()})
        print('FAIL', name, str(e), flush=True)
        traceback.print_exc()
    (OUT / 'results.json').write_text(json.dumps({'results': results, 'pageErrors': errors, 'requestFailures': network}, indent=2), encoding='utf-8')

def plan(p, key=NOTE, suffix='edit'):
    return api(p, """const r=api.getResource(arg.key);r.snapshot.page.summary+=' '+arg.suffix;
    return {schemaVersion:1,kind:'atlas-agent-changeset',id:'plan.qa.'+crypto.randomUUID(),createdAt:Date.now(),source:'Explicit synthetic QA decision',operations:[{id:'op.qa.one',kind:'resource.update',resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:r.snapshot}}]};""", {'key': key, 'suffix': suffix})

def review(p, proposal, accept=True):
    close_panels(p)
    api(p, "await api.openAgentSystemSurface('agent-review');")
    d = p.get_by_role('dialog', name='Agent Review')
    d.get_by_label('ChangeSet JSON', exact=True).fill(json.dumps(proposal))
    d.locator('[data-agent-action="changeset-preview"]').click()
    try: expect(d.locator('[data-agent-action="changeset-stage"]')).to_be_enabled()
    except Exception: raise AssertionError('Preview failed: '+d.inner_text())
    d.locator('[data-agent-action="changeset-stage"]').click()
    try: expect(d.locator('.agent-decision[data-review-status="staged"]')).to_be_visible()
    except Exception:
        shot(p,'failed-stage')
        raise AssertionError('Stage failed: '+d.inner_text())
    if accept:
        d.locator('[data-agent-action="changeset-accept"]').click()
        # A reviewed workspace switch legitimately closes the old workspace's
        # dialog. Inspect its persisted decision via the public audit facade.
        try:
            p.wait_for_function('async(id)=>('+PUBLIC+').getReviews().items.some(r=>r.id===id&&r.status==="accepted")',arg=proposal['id'])
        except Exception:
            shot(p,'failed-accept')
            raise AssertionError('Accept failed: '+p.locator('body').inner_text())
        if any(op['kind']=='workspace.navigate' for op in proposal['operations']): expect(d).to_have_count(0)
        else: expect(d.locator('.agent-decision[data-review-status="accepted"]')).to_be_visible()
        close_panels(p)
    return d

def read_db(p):
    return p.evaluate("""()=>new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onerror=()=>no(r.error);r.onsuccess=()=>{const db=r.result,names=[...db.objectStoreNames],tx=db.transaction(names,'readonly'),data={};for(const n of names){const q=tx.objectStore(n).getAll();q.onsuccess=()=>data[n]=n==='assets'?q.result.map(a=>({...a,bytes:Array.from(a.bytes)})):q.result;}tx.oncomplete=()=>{db.close();ok({version:db.version,names,data});};};})""")

def make_pdf_packs():
    hashes = []
    for version, count, marker in [('1.0.0', 2, 'OLD ALPHA'), ('2.0.0', 3, 'NEW BETA')]:
        doc = pymupdf.open()
        for n in range(count):
            page = doc.new_page()
            page.insert_text((72, 100), f'AtlasNote {marker} page {n+1}', fontsize=24)
        raw = doc.tobytes(); doc.close()
        sha = hashlib.sha256(raw).hexdigest(); hashes.append(sha)
        title = 'Historical PDF ' + marker
        asset = {'path':'assets/history.pdf','mediaType':'application/pdf','sha256':sha}
        manifest = {'format':'atlas-content-pack','schemaVersion':1,'payloadSchema':'atlas.bundle@2','id':'qa.history','version':version,'title':'Synthetic history QA','visibility':'private','files':{'projects':'projects.json','pages':'pages','glossary':'glossary.json'},'requires':[],'assets':[asset]}
        page = {'id':'page.qa.history','title':title,'summary':'Synthetic distinct-byte historical PDF.','blocks':[],'related':[],'terms':[],'sources':[],'tags':[]}
        document = {'id':'doc.qa.history','pageId':page['id'],'title':title,'source':{'kind':'pack-file','path':asset['path']},'sha256':sha,'bytes':len(raw),'pageCount':count,'visibility':'private','rights':{'status':'author-created','attribution':'Synthetic QA fixture generated for this test.'},'defaultView':'single'}
        files = {'workspace.json':{'format':'atlas-workspace','schemaVersion':1,'title':'QA fixture','packsDirectory':'packs','disabledPackIds':[],'groups':[]},
            'packs/qa.history/atlas-pack.json':manifest,
            'packs/qa.history/projects.json':[{'id':'project.qa.history','title':'QA History','icon':'book','description':'Synthetic QA','nodes':[{'id':'node.qa.history','title':title,'pageId':page['id']}]}],
            'packs/qa.history/pages/page.qa.history.json':page,'packs/qa.history/glossary.json':[],
            'packs/qa.history/atlas-documents.json':{'format':'atlas-document-index','schemaVersion':1,'version':version,'packId':'qa.history','documents':[document]}}
        with zipfile.ZipFile(OUT / ('pdf-'+version+'.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
            for name, value in files.items(): z.writestr(name,json.dumps(value))
            z.writestr('packs/qa.history/assets/history.pdf',raw)
    assert hashes[0] != hashes[1]
    return hashes

def import_pack(p, version):
    close_panels(p); open_settings(p)
    p.get_by_label('Import library ZIP', exact=True).set_input_files(str(OUT / ('pdf-'+version+'.zip')))
    p.get_by_role('button', name='Confirm library import', exact=True).click()
    expect(p.get_by_role('button', name='Confirm library import', exact=True)).to_have_count(0)
    close_panels(p)

def backup(p, name):
    close_panels(p); open_settings(p)
    with p.expect_download() as dl:
        p.get_by_role('button', name='Download workspace backup', exact=True).click()
    target=OUT / (name+'.atlas-backup.zip'); dl.value.save_as(target)
    close_panels(p)
    return target

def restore(p, path):
    close_panels(p); open_settings(p)
    p.get_by_label('Restore workspace backup',exact=True).set_input_files(str(path))
    p.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check()
    p.get_by_role('button',name='Restore verified backup',exact=True).click()
    expect(p.locator('dialog[open]')).to_have_count(0)

def review_safety():
    c,p=context()
    try:
        original=api(p,'return api.getResource(arg).head;',NOTE)
        proposal=plan(p)
        api(p,"await api.openAgentSystemSurface('agent-review');")
        d=p.get_by_role('dialog',name='Agent Review')
        field=d.get_by_label('Import ChangeSet JSON',exact=True)
        valid={'name':'same.json','mimeType':'application/json','buffer':json.dumps(proposal).encode()}
        field.set_input_files(valid)
        expect(d.locator('[data-agent-action="changeset-stage"]')).to_be_enabled()
        field.set_input_files({'name':'same.json','mimeType':'application/json','buffer':b'{invalid'})
        expect(d.get_by_role('alert')).to_be_visible()
        expect(d.locator('[data-agent-action="changeset-stage"]')).to_be_disabled()
        assert d.locator('[data-agent-action="changeset-accept"]').count()==0
        field.set_input_files({'name':'same.json','mimeType':'application/json','buffer':b' '*(1024*1024+1)})
        expect(d.get_by_role('alert')).to_contain_text('1 MiB')
        field.set_input_files(valid)
        expect(d.locator('[data-agent-action="changeset-stage"]')).to_be_enabled()
        other=api(p,"return api.listResources({type:'notebook-page',limit:100}).items.find(r=>r.resourceKey!==arg).resourceKey;",NOTE)
        proposal['operations']+=plan(p,other,'unselected')['operations']
        proposal['operations'][1]['id']='op.qa.two'
        d.get_by_label('ChangeSet JSON',exact=True).fill(json.dumps(proposal))
        d.locator('[data-agent-action="changeset-preview"]').click()
        d.locator('[data-agent-action="changeset-stage"]').click()
        expect(d.locator('.agent-decision[data-review-status="staged"]')).to_be_visible()
        assert api(p,'return api.getResource(arg).head;',NOTE)==original
        other_head=api(p,'return api.getResource(arg).head;',other)
        d.get_by_label('Select operation op.qa.two',exact=True).uncheck()
        expect(d.locator('[data-agent-action="changeset-accept"]')).to_be_disabled()
        d.locator('[data-agent-action="changeset-preview-selection"]').click()
        d.locator('[data-agent-action="changeset-accept"]').dblclick()
        expect(d.locator('.agent-decision[data-review-status="accepted"]')).to_be_visible()
        assert api(p,'return api.getResource(arg).head.number;',NOTE)==original['number']+1
        assert api(p,'return api.getResource(arg).head;',other)==other_head
        shot(p,'review-accepted-subset'); ready(p)
        assert api(p,'return api.getReviews().items.find(r=>r.id===arg).selectedOperationIds;',proposal['id'])==['op.qa.one']
        return {'invalidReplacement':True,'sameFilenameReimport':True,'oneMiBLimit':True,'subsetAtomicAfterReload':True,'doubleClickSingleRevision':True}
    finally:c.close()

def history_and_concurrency():
    c,p=context()
    try:
        v1=api(p,'return api.getResource(arg).head.revisionId;',NOTE)
        review(p,plan(p,suffix='second')); review(p,plan(p,suffix='third'))
        v=api(p,'return api.listResourceVersions(arg).items;',NOTE)
        api(p,"await api.compareRevisions(arg.key,arg.old);await api.setAgentCompareState({enabled:true,pane:'B'});",{'key':NOTE,'old':v1})
        before=api(p,'return api.getStorageDiagnostics().revisions;')
        for _ in range(7):api(p,'await api.compareRevisions(arg.key,arg.a,arg.b);',{'key':NOTE,'a':v1,'b':v[1]['revisionId']})
        summary=api(p,'return api.getWorkspaceSummary(1).slots[0];')
        assert all(len(x['tabs'])==1 for x in summary['panes'])
        assert summary['panes'][0]['tabs'][0]['target']['historyRevisionId']==v1
        assert summary['panes'][1]['tabs'][0]['target']['historyRevisionId']==v[1]['revisionId']
        assert api(p,'return api.getStorageDiagnostics().revisions;')==before
        for mode in ['a','b','side-by-side','changes']:
            api(p,'await api.setAgentCompareState({enabled:true,mode:arg});',mode)
            expect(p.get_by_role('button',name={'a':'A only','b':'B only','side-by-side':'Side by side','changes':'Changes'}[mode],exact=True)).to_have_attribute('aria-pressed','true')
        ready(p)
        api(p,"await api.openAgentSystemSurface('history',api.getResource(arg).target);",NOTE)
        row=p.locator('.revision-row[data-revision-id="'+v1+'"]')
        row.locator('[data-agent-action="revision-restore"]').click()
        q=c.new_page(); ready(q)
        proposal=plan(q,suffix='concurrent'); review(q,proposal)
        row.locator('[data-agent-action="revision-restore-confirm"]').click()
        expect(p.locator('.history-error')).to_be_visible()
        ready(p)
        assert api(p,'return api.getResource(arg).head.number;',NOTE)==4
        assert 'concurrent' in api(p,'return api.getResource(arg).snapshot.page.summary;',NOTE)
        # Actual two-tab stale base: both prepare the same authored head.
        stale=plan(p,suffix='stale'); ready(q); fresh=plan(q,suffix='winner')
        review(q,fresh)
        api(p,"await api.openAgentSystemSurface('agent-review');")
        d=p.get_by_role('dialog',name='Agent Review')
        d.get_by_label('ChangeSet JSON',exact=True).fill(json.dumps(stale))
        d.locator('[data-agent-action="changeset-preview"]').click()
        if d.locator('[data-agent-action="changeset-stage"]').is_enabled():
            d.locator('[data-agent-action="changeset-stage"]').click()
        expect(d.get_by_role('alert')).to_be_visible()
        ready(p)
        assert 'winner' in api(p,'return api.getResource(arg).snapshot.page.summary;',NOTE)
        assert api(p,'return api.getResource(arg).head.number;',NOTE)==5
        shot(p,'concurrent-writer-retained')
        return {'sevenComparisonsNoTabGrowth':True,'orderedFromB':True,'restoreRejectsUnreviewedHead':True,'twoRealTabsStaleWriterRejected':True}
    finally:c.close()

def distinct_pdf():
    c,p=context()
    try:
        hashes=make_pdf_packs(); import_pack(p,'1.0.0')
        old=api(p,'return api.getResource(arg);',PDF)
        import_pack(p,'2.0.0')
        new=api(p,'return api.getResource(arg);',PDF)
        assert old['snapshot']['document']['sha256']==hashes[0]
        assert new['snapshot']['document']['sha256']==hashes[1]
        assert new['head']['number']==2
        # Propose the already-reviewed old byte revision, then restore the new
        # head through another reviewed proposal: no raw asset setter involved.
        prop=plan(p)
        prop['operations']=[{'id':'op.qa.pdf','kind':'pdf.revision.propose','resourceKey':PDF,'baseRevisionId':new['head']['revisionId'],'payload':{'resourceType':'pdf','snapshot':old['snapshot']}}]
        review(p,prop)
        prop['id']+='new'; prop['operations'][0]['baseRevisionId']=api(p,'return api.getResource(arg).head.revisionId;',PDF)
        prop['operations'][0]['payload']['snapshot']=new['snapshot']; review(p,prop)
        api(p,"await api.compareRevisions(arg.key,arg.rev);await api.setAgentCompareState({enabled:true,mode:'side-by-side'});",{'key':PDF,'rev':old['head']['revisionId']})
        def verify(p):
            for slot,marker,count in [('a','OLD ALPHA',2),('b','NEW BETA',3)]:
                pane=p.locator('.document-pane[data-pane-slot="'+slot+'"]')
                expect(pane.locator('.react-pdf__Page canvas').first).to_be_visible()
                expect(pane.locator('.react-pdf__Page__textContent').first).to_contain_text(marker)
                assert pane.locator('.pdf-fallback').count()==0
                show_reader_controls(p,pane)
                field=pane.get_by_label('Physical PDF page number',exact=True)
                field.fill(str(count));field.press('Enter')
                expect(pane.locator('.react-pdf__Page__textContent').first).to_contain_text('page '+str(count))
            assets=read_db(p)['data']['assets']
            actual={hashlib.sha256(bytes(a['bytes'])).hexdigest() for a in assets}
            assert set(hashes)<=actual
        verify(p); shot(p,'distinct-pdf-before-reload'); ready(p); verify(p)
        path=backup(p,'distinct-pdf-full')
        f,r=context()
        try:
            restore(r,path);ready(r);verify(r);shot(r,'distinct-pdf-restored')
            # Fault injection only in this disposable restored profile: simulate
            # loss of the older asset, retaining all current bytes and history.
            await_key=old['snapshot']['document']['assetKey']
            r.evaluate("""key=>new Promise((ok,no)=>{const req=indexedDB.open('knowledge-atlas');req.onsuccess=()=>{const db=req.result,tx=db.transaction('assets','readwrite');tx.objectStore('assets').delete(key);tx.oncomplete=()=>{db.close();ok();};tx.onabort=()=>no(tx.error);};})""",await_key)
            ready(r)
            old_pane=r.locator('.document-pane[data-pane-slot="a"]')
            expect(old_pane).to_have_attribute('data-history-revision-id',old['head']['revisionId'])
            expect(old_pane.get_by_role('alert')).to_contain_text('PDF bytes are unavailable')
            assert old_pane.locator('canvas,iframe').count()==0
            expect(r.locator('.document-pane[data-pane-slot="b"] .react-pdf__Page__textContent').first).to_contain_text('NEW BETA')
            shot(r,'missing-historical-pdf-no-substitution')
        finally:f.close()
        return {'sha256':hashes,'pageCounts':[2,3],'engine':'React-PDF canvases and text layers','reload':True,'freshContextFullBackupRestore':True,'missingHistoricalAssetNoSubstitution':True}
    finally:c.close()

def legacy_restores():
    details=[]
    for version in [2,3]:
        c,p=context()
        try:
            path=EXAMPLES / ('synthetic-v21-schema-'+str(version)+'.atlas-backup.zip')
            restore(p,path);ready(p)
            diag=api(p,'return api.getStorageDiagnostics();')
            assert diag['initialized'] and diag['resources']==diag['revisions']
            assert api(p,"return api.getResource('article:page.v22.article').head.number;")==1
            details.append({'schema':version,'resources':diag['resources']})
        finally:c.close()
    return details

def capabilities_and_menus():
    c,p=context()
    try:
        detail=api(p,"""const m=api.getAgentCapabilities();if(m.actions.length!==25)throw Error('action count');
        const keys=api.listResources({includeStructures:true,limit:100}).items.map(r=>r.resourceKey);
        for(const n of [0,1,20]){const c=api.getAgentContext({resourceKeys:keys.slice(0,n)});if(c.resources.length!==n||c.personal)throw Error('context scope');}
        return {actions:m.actions.length,resources:keys.length};""")
        api(p,"await api.navigateAgentTarget(api.getResource(arg).target,'here');",NOTE)
        # The welcome note is nested in a collapsed Notebook on a fresh profile.
        row=p.locator('.tree-row[data-resource-key="'+NOTE+'"]')
        for b in p.locator('.tree-expander[aria-expanded="false"]').all():
            if b.is_visible():b.click()
        expect(row.first).to_be_visible()
        trigger=row.first.get_by_role('button',name='Actions for ',exact=False)
        for method in ['button','right-click','Shift+F10','ContextMenu']:
            if method=='button':trigger.click()
            elif method=='right-click':row.first.click(button='right')
            else:trigger.focus();p.keyboard.press(method)
            menu=p.get_by_role('menu')
            expect(menu.locator('[data-agent-action="version-history"]')).to_be_enabled()
            expect(menu.locator('[data-agent-action="compare-previous-version"]')).to_be_disabled()
            expect(menu.locator('[data-agent-action="open-previous-version"]')).to_be_disabled()
            for key in ['End','Home','ArrowDown','ArrowUp']:
                p.keyboard.press(key)
                assert p.evaluate("document.activeElement.matches('[role=menuitem]:not(:disabled):not([aria-disabled=true])')")
            p.keyboard.press('Escape');expect(menu).to_have_count(0)
            assert p.evaluate('document.activeElement.isConnected && document.activeElement!==document.body')
        trigger.click();p.get_by_role('menu').locator('[data-agent-action="version-history"]').click()
        expect(p.get_by_role('dialog',name='Version History')).to_be_visible()
        assert p.evaluate('document.activeElement.isConnected')
        shot(p,'keyboard-history-menu')
        return detail
    finally:c.close()

def rich_migration():
    make_pdf_packs()
    script="""
    import fs from 'node:fs/promises';
    import {built,authoredFixtures,assetResolver} from './tests/v22/fixtures.mjs';
    import {readWorkspace,loadSchemas} from './src/core/packs.mjs';
    import {unzipBounded,makeBackup} from './src/storage/archives.mjs';
    import {migratePersonal} from './dist-offline/app/core/workspace-slots.js';
    import {compose} from './dist-offline/app/core/workspace.js';
    import {linkReference} from './dist-offline/app/references/knowledge.js';
    const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
    const pack=await readWorkspace((await unzipBounded(new Uint8Array(await fs.readFile(process.argv[1])))).files,schemas);
    const ws=authoredFixtures();ws.imports=pack.packs;ws.assets=pack.assets;
    const catalogue=compose(built,ws);
    const note=structuredClone(catalogue.pages.find(p=>p.id==='page.atlas.welcome'));note.summary+=' Legacy user note';ws.overlays.pages[note.id]={page:note};
    const sheet=structuredClone(catalogue.pages.find(p=>p.cheatsheet));sheet.title+=' Legacy user sheet';ws.overlays.pages[sheet.id]={page:sheet};
    ws.overlays.projects.push({id:'project.qa.legacy',title:'Legacy Notebook',icon:'book',description:'Non-empty migration',nodes:[{id:'node.qa.legacy',title:note.title,pageId:note.id}]});
    ws.overlays.references=[{id:'reference.qa.legacy',title:'Legacy Article reference',target:{kind:'article',articleId:'page.v22.article',pageId:'page.v22.article'},taxonomy:{subject:'it'},createdAt:1}];
    ws.personal.bookmarks.push({id:'bookmark.qa.legacy',pageId:note.id,title:'Legacy bookmark',createdAt:1});
    ws.personal.notes[note.id]={pageId:note.id,text:'Legacy personal reflection',updatedAt:1};
    linkReference(ws.personal,compose(built,ws),ws,{kind:'page',pageId:note.id},{kind:'article',articleId:'page.v22.article',pageId:'page.v22.article'},'related','Legacy semantic link','',1);
    for(const version of [2,3]){const legacy=structuredClone(ws);legacy.personal=version===3?migratePersonal(legacy.personal):legacy.personal;const b=await makeBackup(legacy,built,assetResolver);await fs.writeFile(process.argv[1]+'.schema-'+version+'.atlas-backup.zip',b.bytes);}
    console.log(JSON.stringify({...ws,assets:ws.assets.map(a=>({...a,bytes:Array.from(a.bytes)}))}));
    """
    fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',script,str(OUT/'pdf-1.0.0.zip')],cwd=ROOT,text=True,encoding='utf-8'))
    c=browser.new_context(viewport={'width':1440,'height':900})
    p=c.new_page()
    try:
        seed_url=base+'__qa_legacy_seed__'
        c.route(seed_url,lambda r:r.fulfill(status=200,content_type='text/html',body='<title>Disposable legacy fixture</title>'))
        p.goto(seed_url)
        p.evaluate("""ws=>new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas',2);r.onupgradeneeded=()=>{for(const n of ['imports','overlays','personal','assets'])r.result.createObjectStore(n);};r.onerror=()=>no(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['imports','overlays','personal','assets'],'readwrite');for(const pack of ws.imports)tx.objectStore('imports').put(pack,pack.manifest.id);for(const a of ws.assets)tx.objectStore('assets').put({...a,bytes:new Uint8Array(a.bytes)},a.key);tx.objectStore('personal').put(ws.personal,'active');tx.objectStore('overlays').put(ws.overlays,'active');tx.oncomplete=()=>{db.close();ok();};tx.onabort=()=>no(tx.error);};})""",fixture)
        before=read_db(p); assert before['version']==2
        c.unroute(seed_url);ready(p);after=read_db(p)
        assert after['version']==3 and len(after['names'])==5
        for store in ['imports','overlays','assets']:assert before['data'][store]==after['data'][store],store
        for key in ['bookmarks','notes','knowledge']:assert before['data']['personal'][0][key]==after['data']['personal'][0][key],key
        revisions=[r for r in after['data']['history'] if r['kind']=='revision']
        heads=[r for r in after['data']['history'] if r['kind']=='head']
        assert len(heads)==len(revisions) and all(r['number']==1 for r in revisions)
        ready(p);assert read_db(p)['data']['history']==after['data']['history']
        details={'resources':len(heads),'legacyAssetHashes':[hashlib.sha256(bytes(a['bytes'])).hexdigest() for a in before['data']['assets']],'retained':['user note','Article','QCM','structured Cheatsheet','Notebook placement','manual reference','semantic edge','bookmark','personal reflection','PDF bytes']}
        for version in [2,3]:
            fresh,r=context()
            try:
                restore(r,Path(str(OUT/'pdf-1.0.0.zip')+'.schema-'+str(version)+'.atlas-backup.zip'));ready(r)
                actual=read_db(r)
                # Full backups also materialize bundled packs/assets so that
                # restoration is independent of future application content.
                for item in before['data']['imports']:assert item in actual['data']['imports'],(version,'imports')
                for item in before['data']['assets']:
                    restored_asset=next(a for a in actual['data']['assets'] if a['key']==item['key'])
                    for key in ['key','sha256','mediaType','bytes']:assert restored_asset[key]==item[key],(version,'assets',key)
                assert actual['data']['overlays']==before['data']['overlays']
                for key in ['bookmarks','notes','knowledge']:assert actual['data']['personal'][0][key]==before['data']['personal'][0][key],(version,key)
                assert api(r,'return api.getStorageDiagnostics().resources;')==len(heads)
            finally:fresh.close()
        details['richLegacyFreshRestores']=[2,3]
        (OUT/'rich-migration.json').write_text(json.dumps(details,indent=2),encoding='utf-8')
        return details
    finally:c.close()

def responsive_matrix():
    c,p=context()
    try:
        fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {authoredFixtures} from './tests/v22/fixtures.mjs';console.log(JSON.stringify(Object.values(authoredFixtures().overlays.pages).map(x=>x.page)));"],cwd=ROOT,text=True,encoding='utf-8'))
        proposal=plan(p);proposal['operations']=[]
        for pg in fixtures:
            kind='article' if 'article' in pg else 'qcm'
            proposal['operations'].append({'id':'op.qa.'+kind,'kind':'resource.create','resourceKey':kind+':'+pg['id'],'baseRevisionId':None,'payload':{'resourceType':kind,'snapshot':{'page':pg,'taxonomy':{'subject':'it'}}}})
        review(p,proposal)
        keys=[NOTE,'pdf:doc.atlas.pdf','cheatsheet:page.cheatsheet.azure-data-factory','article:page.v22.article','qcm:page.v22.qcm']
        count=0
        for theme in ['fluent','neutral','academic','lavender','slate']:
            p.set_viewport_size({'width':1440,'height':900});open_settings(p)
            p.get_by_role('dialog',name='Workspace settings').get_by_label('Theme',exact=True).select_option(theme);close_panels(p)
            for width,height in MATRIX:
                p.set_viewport_size({'width':width,'height':height})
                for key in keys:
                    api(p,"await api.navigateAgentTarget(api.getResource(arg).target,'here');",key)
                    expect(p.locator('.document-pane')).to_be_visible()
                    if key.startswith('pdf:'):expect(p.locator('.react-pdf__Page canvas').first).to_be_visible()
                    dimensions=p.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                    assert dimensions['scroll']<=dimensions['width']+1,{'theme':theme,'key':key,'viewport':width,**dimensions}
                    shot(p,'matrix-'+theme+'-'+str(width)+'-'+key.split(':')[0]);count+=1
                api(p,"await api.openAgentSystemSurface('history',api.getResource(arg).target);",NOTE)
                d=p.get_by_role('dialog',name='Version History');expect(d).to_be_visible()
                box=d.bounding_box();assert box['x']>=-1 and box['x']+box['width']<=width+1
                shot(p,'matrix-'+theme+'-'+str(width)+'-history');close_panels(p)
                api(p,"await api.openAgentSystemSurface('agent-review');")
                d=p.get_by_role('dialog',name='Agent Review');expect(d).to_be_visible()
                box=d.bounding_box();assert box['x']>=-1 and box['x']+box['width']<=width+1
                shot(p,'matrix-'+theme+'-'+str(width)+'-review');close_panels(p)
        return {'readerCombinations':count,'dialogCombinations':40,'themes':5,'viewports':MATRIX}
    finally:c.close()

def pinned_links_and_restore():
    c,p=context()
    try:
        old=api(p,'return api.getResource(arg);',NOTE)
        review(p,plan(p,suffix='new title version'))
        api(p,"await api.openAgentSystemSurface('history',api.getResource(arg).target);",NOTE)
        row=p.locator('.revision-row[data-revision-id="'+old['head']['revisionId']+'"]')
        # Explicit clipboard failure injection tests the documented fallback,
        # without changing browser policy or origin security.
        p.evaluate("()=>{window.qaClipboard=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async()=>{throw new DOMException('Synthetic unavailable clipboard','NotAllowedError');};}")
        row.locator('[data-agent-action="revision-copy-link"]').click()
        link=p.get_by_label('Pinned revision link',exact=True).input_value()
        assert old['head']['revisionId'] in link
        p.evaluate('()=>{navigator.clipboard.writeText=window.qaClipboard;}')
        c.grant_permissions(['clipboard-read','clipboard-write'])
        row.locator('[data-agent-action="revision-copy-link"]').click()
        assert p.evaluate('navigator.clipboard.readText()')==link
        q=c.new_page();q.goto(link,wait_until='networkidle')
        expect(q.locator('.document-pane')).to_have_attribute('data-history-revision-id',old['head']['revisionId'])
        q.reload(wait_until='networkidle')
        expect(q.locator('.document-pane')).to_have_attribute('data-history-revision-id',old['head']['revisionId'])
        q.close();ready(p)
        before=api(p,'return api.getResource(arg).head.number;',NOTE)
        api(p,"await api.openAgentSystemSurface('history',api.getResource(arg).target);",NOTE)
        row=p.locator('.revision-row[data-revision-id="'+old['head']['revisionId']+'"]')
        row.locator('[data-agent-action="revision-restore"]').click()
        row.locator('[data-agent-action="revision-restore-confirm"]').dblclick()
        expect(row.locator('[data-agent-action="revision-restore-confirm"]')).to_have_count(0)
        assert api(p,'return api.getResource(arg).head.number;',NOTE)==before+1
        assert api(p,'return api.getResource(arg).snapshot;',NOTE)==old['snapshot']
        latest=api(p,'return api.listResourceVersions(arg).items[0];',NOTE)
        assert latest['restoredFromRevisionId']==old['head']['revisionId']
        close_panels(p)
        state=api(p,'return api.getWorkspaceSummary();')
        invalid=api(p,"""const r=api.getResource(arg.key,arg.rev);let failures=[];
        for(const t of [{...r.target,anchor:{blockId:'missing.section'}},{...r.target,historyRevisionId:'revision.missing'}]){try{await api.navigateAgentTarget(t);throw Error('unexpected success');}catch(e){failures.push(e.message);}}
        return failures;""",{'key':NOTE,'rev':old['head']['revisionId']})
        assert len(invalid)==2 and all(x!='unexpected success' for x in invalid)
        assert api(p,'return api.getWorkspaceSummary();')==state
        return {'clipboardAvailableAndUnavailable':True,'newTabAndReload':True,'restoreAppendsOnce':True,'provenance':True,'missingPinsAndSectionsRejectWithoutNavigation':True}
    finally:c.close()

def quota_failure_atomicity():
    c,p=context()
    try:
        d=review(p,plan(p,suffix='must not partially persist'),accept=False)
        before=read_db(p)
        # Throw after earlier stores have queued writes: the real IndexedDB
        # transaction must abort every store. This is injected quota failure,
        # not a claim that the user's disk was filled to its physical quota.
        p.evaluate("""()=>{const original=IDBObjectStore.prototype.put;window.qaRestorePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(...args){if(this.name==='history')throw new DOMException('Synthetic QA quota exhaustion','QuotaExceededError');return original.apply(this,args);};}""")
        d.locator('[data-agent-action="changeset-accept"]').click()
        expect(d.get_by_role('alert')).to_contain_text('quota')
        after=read_db(p)
        assert after==before
        p.evaluate('window.qaRestorePut()')
        close_panels(p)
        path=backup(p,'quota-recovery')
        ready(p)
        assert read_db(p)['data']['history']==before['data']['history']
        f,r=context()
        try:restore(r,path);ready(r);assert read_db(r)['data']['history']==before['data']['history']
        finally:f.close()
        return {'injectedQuotaFailure':True,'allFiveStoresUnchanged':True,'recoveryExportRestores':True}
    finally:c.close()

def all_action_kinds():
    c,p=context()
    kinds=set()
    try:
        restore(p,EXAMPLES/'synthetic-v21-schema-3.atlas-backup.zip');ready(p)
        for path in sorted(EXAMPLES.glob('changeset-*.json')):
            proposal=json.loads(path.read_text(encoding='utf-8'))
            personal=read_db(p)['data']['personal'][0]
            proposal=api(p,"""const plan=arg.plan;plan.id='qa.browser.'+plan.id;plan.createdAt=Date.now();
            for(const op of plan.operations){
             if(op.baseRevisionId!==null&&op.resourceKey)op.baseRevisionId=api.getResource(op.resourceKey).head.revisionId;
             if(op.baseFingerprint)op.baseFingerprint=api.getStateFingerprint(op.kind.startsWith('reference.')||op.kind.startsWith('concept.')?'semantic-reference':op.kind.startsWith('workspace.')?'workspace':'personal');
             if(op.kind==='resource.restoreAsNewRevision')op.payload.revisionId=api.listResourceVersions(op.resourceKey).items.at(-1).revisionId;
             if(op.kind==='reference.add'){op.payload.sourceRevision=api.resolveTarget(op.payload.source).revision;op.payload.targetRevision=api.resolveTarget(op.payload.target).revision;}
             if(op.kind==='reference.remove')op.payload.id=arg.personal.knowledge.edges.at(-1).id;
             if(op.kind==='concept.assignment.propose'){op.payload.batch.semanticRevision=arg.personal.knowledge.revision;for(const s of op.payload.batch.suggestions)s.targetRevision=api.resolveTarget(s.target).revision;}
             if(op.kind==='bookmark.remove')op.payload.id=arg.personal.bookmarks.at(-1).id;
             if(op.kind==='readLater.remove')op.payload.id=arg.personal.readLater.at(-1).id;
             if(op.kind==='capture.update')op.payload.id=arg.personal.dashboardItems.at(-1).id;
            }return plan;""",{'plan':proposal,'personal':personal})
            review(p,proposal)
            kinds.update(op['kind'] for op in proposal['operations'])
            print('PASS browser action plan',path.name,flush=True)
        expected=read_db(p)['data']['history'];ready(p)
        assert read_db(p)['data']['history']==expected
        assert len(kinds)==25
        assert len([r for r in expected if r['kind']=='review' and r['status']=='accepted'])==23
        return {'kinds':sorted(kinds),'reviewedPlans':23,'acceptedAuditRetainedAfterReload':True}
    finally:c.close()

def corrupt_backups():
    c,p=context()
    try:
        review(p,plan(p));path=backup(p,'valid-for-corruption')
        with zipfile.ZipFile(path) as z: original={n:z.read(n) for n in z.namelist()}
        candidates=[n for n in original if n.endswith('.json')]
        selected=[next(n for n in candidates if n.endswith('history/index.json')),next(n for n in candidates if 'history/' in n and not n.endswith('index.json'))]
        before=read_db(p)
        for i,name in enumerate(selected):
            bad=OUT/('corrupt-'+str(i)+'.zip')
            with zipfile.ZipFile(bad,'w',zipfile.ZIP_DEFLATED) as z:
                for n,b in original.items():z.writestr(n,b+b' ' if n==name else b)
            open_settings(p);p.get_by_label('Restore workspace backup',exact=True).set_input_files(str(bad))
            expect(p.get_by_role('dialog',name='Workspace settings').locator('.error-message')).to_be_visible()
            assert p.get_by_role('button',name='Restore verified backup',exact=True).count()==0
            assert read_db(p)==before
            close_panels(p)
        return {'corruptIndexAndHistoryShardRejected':True,'allStoresUnchanged':True}
    finally:c.close()

def history_pagination_and_structure():
    c,p=context()
    try:
        # Explicit synthetic QA decisions through the same public service, using
        # real durable transactions; 26 versions force actual history pagination.
        api(p,"""for(let n=1;n<=26;n++){const r=api.getResource(arg),s=r.snapshot;s.page.summary='QA pagination '+n;
        const plan={schemaVersion:1,kind:'atlas-agent-changeset',id:'qa.page.'+n,source:'Explicit synthetic pagination QA decision',createdAt:Date.now(),operations:[{id:'op.page',kind:'resource.update',resourceKey:arg,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:s}}]};api.preview(plan);await api.stage(plan);await api.accept(plan.id);}""",NOTE)
        versions=api(p,'return api.listResourceVersions(arg,0,100).items;',NOTE)
        api(p,"await api.openAgentSystemSurface('history',api.getResource(arg).target);",NOTE)
        d=p.get_by_role('dialog',name='Version History')
        newest=d.locator('.revision-row').first
        newest.locator('[data-agent-action="compare-select-b"]').click()
        d.locator('[data-agent-action="history-older"]').click()
        expect(d.locator('.revision-row')).to_have_count(2)
        d.locator('.revision-row').last.locator('[data-agent-action="compare-select-a"]').click()
        d.locator('[data-agent-action="compare-selected-versions"]').click()
        expect(d).to_have_count(0)
        panes=api(p,'return api.getWorkspaceSummary(1).slots[0].panes;')
        assert panes[0]['tabs'][0]['target']['historyRevisionId']==versions[-1]['revisionId']
        assert panes[1]['tabs'][0]['target']['historyRevisionId']==versions[0]['revisionId']
        tree=api(p,"return api.getResource('notebook-tree:project.atlas.guide');")
        proposal=plan(p);proposal['operations']=[{'id':'op.tree','kind':'notebook.tree.renameNode','resourceKey':tree['resourceKey'],'baseRevisionId':tree['head']['revisionId'],'payload':{'operation':{'kind':'rename','nodeId':tree['snapshot']['project']['nodes'][0]['id'],'title':'QA renamed folder'}}}]
        review(p,proposal)
        note_head=api(p,'return api.getResource(arg).head;',NOTE)
        api(p,"await api.navigateAgentTarget(api.getResource(arg.key,arg.rev).target,'here');",{'key':tree['resourceKey'],'rev':tree['head']['revisionId']})
        expect(p.locator('.active-pane')).to_contain_text(tree['snapshot']['project']['nodes'][0]['title'])
        shot(p,'historical-notebook-structure')
        api(p,"await api.openAgentSystemSurface('history',api.getResource(arg).target);",tree['resourceKey'])
        row=p.locator('.revision-row[data-revision-id="'+tree['head']['revisionId']+'"]')
        row.locator('[data-agent-action="revision-restore"]').click();row.locator('[data-agent-action="revision-restore-confirm"]').click()
        expect(row.locator('[data-agent-action="revision-restore-confirm"]')).to_have_count(0)
        assert api(p,'return api.getResource(arg).head;',NOTE)==note_head
        return {'versions':27,'crossPaginationPairSelection':True,'historicalStructureReadable':True,'structureRestoreDoesNotRewindChild':True}
    finally:c.close()

def all_resource_menus():
    c,p=context()
    try:
        restore(p,EXAMPLES/'synthetic-v21-schema-3.atlas-backup.zip');ready(p)
        keys=[NOTE,'pdf:doc.atlas.pdf','cheatsheet:page.cheatsheet.azure-data-factory','article:page.v22.article','qcm:page.v22.qcm','notebook-tree:project.atlas.guide']
        checks=[]
        for key in keys:
            api(p,"await api.navigateAgentTarget(api.getResource(arg).target,'here');",key)
            if key.startswith('notebook-tree:'): p.get_by_role('button',name='Notebook content',exact=True).click()
            for _ in range(5):
                collapsed=p.locator('.project-tree .tree-expander[aria-expanded="false"]')
                if not collapsed.count():collapsed=p.locator('.tree-expander[aria-expanded="false"]')
                for b in collapsed.all():
                    if b.is_visible():b.click()
            row=p.locator('.tree-row[data-resource-key="'+key+'"]')
            expect(row.first).to_be_visible()
            trigger=row.first.locator('button[aria-haspopup="menu"]')
            for method in ['button','right-click','Shift+F10','ContextMenu']:
                if method=='button':trigger.click()
                elif method=='right-click':row.first.click(button='right')
                else:trigger.focus();p.keyboard.press(method)
                menu=p.get_by_role('menu')
                expect(menu.locator('[data-agent-action="version-history"]')).to_be_enabled()
                expect(menu.locator('[data-agent-action="compare-previous-version"]')).to_be_disabled()
                expect(menu.locator('[data-agent-action="open-previous-version"]')).to_be_disabled()
                for k in ['End','Home','ArrowDown','ArrowUp']:p.keyboard.press(k)
                assert p.evaluate("document.activeElement.matches('[role=menuitem]:not(:disabled)')")
                p.keyboard.press('Tab');expect(menu).to_have_count(0)
                checks.append({'resource':key,'method':method})
        return checks
    finally:c.close()

def deleted_source_pinned_startup():
    c,p=context()
    try:
        restore(p,EXAMPLES/'synthetic-v21-schema-3.atlas-backup.zip');ready(p)
        key='article:page.v22.article'
        old=api(p,'return api.getResource(arg);',key)
        review(p,plan(p,key,'later source'))
        api(p,"await api.navigateAgentTarget(api.getResource(arg).target,'here');",key)
        p.get_by_role('button',name='Article content',exact=True).click()
        choose_library_resource(p,'page.v22.article')
        p.once('dialog',lambda dialog:dialog.accept())
        p.get_by_role('button',name='Remove local source',exact=True).click()
        p.wait_for_function('async()=>!('+PUBLIC+').listResources({type:"article",limit:100}).items.some(r=>r.resourceKey==="article:page.v22.article")')
        link=base+'#/page/page.v22.article?revision='+old['head']['revisionId']
        q=c.new_page();q.goto(link,wait_until='networkidle')
        expect(q.locator('.document-pane')).to_have_attribute('data-history-revision-id',old['head']['revisionId'])
        expect(q.locator('.document-pane')).to_contain_text('Original explanation.')
        q.reload(wait_until='networkidle')
        expect(q.locator('.document-pane')).to_contain_text('Original explanation.')
        shot(q,'removed-source-pinned-startup')
        q.close()
        return {'currentSourceRemovedViaUI':True,'historicalStartupAndReloadRetainOriginal':True}
    finally:c.close()

def exact_historical_targets():
    c,p=context()
    try:
        restore(p,EXAMPLES/'synthetic-v21-schema-3.atlas-backup.zip');ready(p)
        failures=api(p,"""const keys=['notebook-page:page.atlas.welcome','article:page.v22.article','qcm:page.v22.qcm','cheatsheet:page.cheatsheet.azure-data-factory','pdf:doc.atlas.pdf'];
        const before=JSON.stringify(api.getWorkspaceSummary()),count=api.getStorageDiagnostics().revisions,failures=[];
        for(const key of keys){const r=api.getResource(key),t=api.getResource(key,r.head.revisionId).target;
         if(t.kind==='qcm')t.questionId='question.missing';else if(t.kind==='pdf-page')t.pdfPage=99999;else t.anchor={blockId:'block.missing'};
         let refused=false;try{await api.navigateAgentTarget(t);}catch(e){refused=true;failures.push({key,message:e.message});}if(!refused)throw Error('Missing historical anchor was accepted: '+key);
         if(JSON.stringify(api.getWorkspaceSummary())!==before)throw Error('Rejected target mutated layout');
        }if(api.getStorageDiagnostics().revisions!==count)throw Error('Read created a revision');return failures;""")
        proposal=api(p,"""const operations=['article','qcm'].map(type=>{const r=api.getResource(type+':page.v22.'+type),s=r.snapshot;s.page.id='page.qa.wrapper.'+type;if(type==='article')s.page.article.id='article.qa.independent';else s.page.qcm.id='qcm.qa.independent';return {id:'op.wrapper.'+type,kind:'resource.create',resourceKey:type+':'+s.page.id,baseRevisionId:null,payload:{resourceType:type,snapshot:s}};});return {schemaVersion:1,kind:'atlas-agent-changeset',id:'qa.wrapper.create',createdAt:Date.now(),source:'Explicit synthetic wrapper identity QA',operations};""")
        state_before=read_db(p)
        reason=api(p,"try{api.preview(arg);return null;}catch(e){return e.message;}",proposal)
        assert reason and 'wrapper identity' in reason
        assert read_db(p)==state_before
        for kind,identity in [('article','articleId'),('qcm','setId')]:
            key=kind+':page.v22.'+kind
            resource=api(p,'return api.getResource(arg);',key)
            target={'kind':kind,identity:'page.v22.'+kind,'historyRevisionId':resource['head']['revisionId']}
            api(p,'await api.navigateAgentTarget(arg);',target)
            expect(p.locator('.document-pane')).to_have_attribute('data-resource-key',key)
            state=api(p,'return api.getWorkspaceSummary();')
            rejected=api(p,"try{await api.navigateAgentTarget({...arg,pageId:'page.atlas.welcome'});return false;}catch{return true;}",target)
            assert rejected and api(p,'return api.getWorkspaceSummary();')==state
        return {'missingHistoricalTargets':failures,'omittedWrapperResolved':True,'wrongExplicitWrapperRejected':True,'differentWrapperDocumentIds':'Rejected atomically by established canonical schema; this handoff request remains a documented contract exception.'}
    finally:c.close()

base=start_server(dist='dist')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    print('Chromium',browser.version,flush=True)
    for name,fn in [('capabilities-context-keyboard-menus',capabilities_and_menus),('review-invalid-import-subset-double-click',review_safety),('history-compare-real-tab-concurrency',history_and_concurrency),('distinct-byte-pdf-reload-backup',distinct_pdf),('legacy-schema-2-3-fresh-profile-restores',legacy_restores),('rich-nonempty-v2-migration',rich_migration),('five-theme-responsive-matrix',responsive_matrix),('pinned-links-and-restore',pinned_links_and_restore),('quota-failure-atomicity',quota_failure_atomicity),('all-25-action-kinds-through-review',all_action_kinds),('corrupt-backups-rejected-atomically',corrupt_backups),('history-pagination-and-structure',history_pagination_and_structure),('all-resource-keyboard-menus',all_resource_menus),('deleted-source-pinned-startup',deleted_source_pinned_startup),('exact-historical-targets-and-wrappers',exact_historical_targets)]:
        if not os.environ.get('ATLAS_COMPLETION_CASE') or os.environ['ATLAS_COMPLETION_CASE'] in name: check(name,fn)
    browser.close()
(OUT / 'results.json').write_text(json.dumps({'status':'PASS' if all(r['status']=='PASS' for r in results) and not errors else 'FAIL','distribution':'dist','normalOriginRequired':True,'browser':'Chromium '+browser.version,'results':results,'pageErrors':errors,'requestFailures':network},indent=2),encoding='utf-8')
sys.exit(0 if all(r['status']=='PASS' for r in results) and not errors else 1)
