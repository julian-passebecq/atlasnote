"""V2.2 normal-origin QA. No policy override, DOM mount or in-memory write shim.

Agent flow imports ONLY the public provider-neutral module. Direct IndexedDB
writes below are restricted to explicitly labeled legacy/migration fixture seed
steps, never to agent acceptance. Database observations and backup UI are separate
read/test boundaries. Production requires ATLAS_V22_DIST=dist (the default).
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import traceback
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, launch, close_panels, more_action, open_settings

OUT = Path(os.environ.get('ATLAS_EVIDENCE', ROOT / 'docs/evidence/v22/runtime'))
OUT.mkdir(parents=True, exist_ok=True)
DIST = os.environ.get('ATLAS_V22_DIST', 'dist')
MATRIX = [(1440, 900), (1100, 800), (800, 900), (390, 844)]
results, errors, requests, screens = [], [], [], []
phase = 'build and normal-origin preflight'
page = None
PUBLIC = "(await import(new URL('app/agent/public.js',document.baseURI).href)).getAgentInterface()"
READ_DB = """()=>new Promise((resolve,reject)=>{const r=indexedDB.open('knowledge-atlas');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,names=Array.from(d.objectStoreNames),tx=d.transaction(names,'readonly'),data={};for(const name of names){const req=tx.objectStore(name).getAll();req.onsuccess=()=>data[name]=req.result;}tx.oncomplete=()=>{const version=d.version;d.close();resolve({version,names,data});};tx.onabort=()=>reject(tx.error);};})"""
SEED = """async ({workspace,history})=>{
 await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('knowledge-atlas');r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Fixture reset blocked'));});
 await new Promise((resolve,reject)=>{const r=indexedDB.open('knowledge-atlas',history?3:2);r.onupgradeneeded=()=>{for(const n of ['imports','overlays','personal','assets'])r.result.createObjectStore(n);if(history){const h=r.result.createObjectStore('history');h.createIndex('kind','kind');h.createIndex('resourceKey','resourceKey');}};r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(Array.from(db.objectStoreNames),'readwrite');for(const p of workspace.imports)tx.objectStore('imports').put(p,p.manifest.id);for(const a of workspace.assets)tx.objectStore('assets').put({...a,bytes:new Uint8Array(a.bytes)},a.key);tx.objectStore('personal').put(workspace.personal,'active');tx.objectStore('overlays').put(workspace.overlays,'active');if(history){const h=tx.objectStore('history');h.put(history.meta,'meta');for(const x of history.revisions)h.put(x,'revision:'+x.revisionId);for(const x of history.heads)h.put(x,'head:'+x.resourceKey);}tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};});
}"""

def record(name):
    results.append({'name': name, 'status': 'PASS'})
    print('PASS', name, flush=True)

def agent(p, body, arg=None):
    return p.evaluate('async(arg)=>{const api=' + PUBLIC + ';' + body + '}', arg)

def ready(p, base):
    p.goto(base, wait_until='networkidle')
    expect(p.locator('.atlas-app')).to_be_visible(timeout=30000)
    # The module is a stable build entry; no window/private store bridge is used.
    # V3 staged boot renders the shell first; history reconciliation completes right
    # after. Wait for it explicitly instead of assuming it precedes the first render.
    p.wait_for_function("async()=>{const d=(await import(new URL('app/agent/public.js',document.baseURI).href)).getAgentInterface().getStorageDiagnostics();return d.initialized&&d.ready!==false;}", timeout=30000, polling=100)
    assert agent(p, 'return api.getStorageDiagnostics().initialized;')

def read(p):
    return p.evaluate(READ_DB)

def screenshot(p, name):
    target = OUT / (name + '.png')
    p.screenshot(path=str(target), full_page=True)
    screens.append(target.name)

def seed_context(browser, base, fixture, partial=None):
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    p = context.new_page()
    p.on('pageerror', lambda e: errors.append(str(e)))
    p.on('requestfailed', lambda r: requests.append({'url': r.url, 'failure': r.failure}))
    fixture_url = base + '__v22_migration_fixture__'
    context.route(fixture_url, lambda route: route.fulfill(status=200, content_type='text/html', body='<!doctype html><title>V2.1 migration fixture seed</title>'))
    p.goto(fixture_url)
    p.evaluate(SEED, {'workspace': fixture, 'history': partial})
    context.unroute(fixture_url)
    return context, p

try:
    if not (ROOT / DIST / 'index.html').is_file():
        raise RuntimeError('BLOCKED: integrated distribution is not built; run npm ci and npm run build first.')
    fixture_code = """
    import {built,authoredFixtures} from './tests/v22/fixtures.mjs';
    import {captureResources} from './dist-offline/app/history/adapters.js';
    import {advanceHistory} from './dist-offline/app/history/engine.js';
    import {compose} from './dist-offline/app/core/workspace.js';
    import {emptyHistory} from './dist-offline/app/history/model.js';
    const ws=authoredFixtures();ws.personal.bookmarks.push({id:'bookmark.v21.fixture',pageId:'page.atlas.welcome',title:'Retain existing bookmark',createdAt:1});
    const partial=await advanceHistory(emptyHistory(),captureResources(compose(built,ws),ws).slice(0,17),{source:'migration',summary:'Interrupted migration fixture'},false);
    console.log(JSON.stringify({workspace:ws,partial}));
    """
    fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', fixture_code], cwd=ROOT, text=True, encoding='utf-8'))
    base = start_server(dist=DIST)
    with sync_playwright() as pw:
        browser = launch(pw)
        phase = 'actual V2.1 IndexedDB v2 migration to v3 on normal origin'
        context, page = seed_context(browser, base, fixture['workspace'])
        ready(page, base)
        before = read(page)
        assert before['version'] == 3 and set(before['names']) == {'imports', 'overlays', 'personal', 'assets', 'history'}
        assert before['data']['overlays'][0] == fixture['workspace']['overlays']
        assert before['data']['personal'][0]['bookmarks'] == fixture['workspace']['personal']['bookmarks']
        assert before['data']['imports'] == fixture['workspace']['imports']
        assert before['data']['assets'] == fixture['workspace']['assets']
        h1 = [r for r in before['data']['history'] if r['kind'] == 'revision']
        heads = [r for r in before['data']['history'] if r['kind'] == 'head']
        assert len(h1) == len(heads) and all(r['number'] == 1 for r in h1)
        count = agent(page, 'return api.listResources({includeStructures:true,limit:100}).total;')
        assert len(heads) == count
        record(phase)
        phase = 'baseline idempotence and interrupted initialization recovery'
        ready(page, base)
        assert [r for r in read(page)['data']['history'] if r['kind'] == 'revision'] == h1
        c2, p2 = seed_context(browser, base, fixture['workspace'], fixture['partial'])
        ready(p2, base)
        resumed = [r for r in read(p2)['data']['history'] if r['kind'] == 'revision']
        assert len(resumed) == count and all(r['number'] == 1 for r in resumed)
        assert set(r['revisionId'] for r in fixture['partial']['revisions']).issubset(set(r['revisionId'] for r in resumed))
        c2.close()
        record(phase)

        phase = 'synthetic agent discovers and revises all six canonical resource adapters'
        result = agent(page, """
        const manifest=api.getAgentCapabilities();if(manifest.actions.length<20)throw Error('Missing capabilities');
        // Per-type discovery: independent of total library size (V3 seed pack added 66 resources).
        const chosen=['notebook-page','article','cheatsheet','qcm','pdf','notebook-tree'].map(type=>api.listResources({type,includeStructures:true,limit:100}).items.find(r=>!r.resourceId.includes('manual')));
        const base=chosen.map(r=>api.getResource(r.resourceKey));
        const ops=base.map((r,i)=>{const s=structuredClone(r.snapshot);if(r.resourceType==='notebook-tree')s.project.title+=' V22 review';else if(r.resourceType==='qcm')s.page.qcm.questions[0].prompt+=' Explain.';else if(r.resourceType==='cheatsheet')s.page.cheatsheet.pages[0].blocks[0].text+=' Reviewed';else if(r.resourceType==='pdf'){s.page.title+=' Reviewed';s.document.title=s.page.title;}else s.page.blocks.push({id:s.page.id+'.browser',type:'markdown',text:'Normal-origin accepted explanation.'});return {id:'operation.browser.'+i,kind:'resource.update',resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:s}};});
        const plan={schemaVersion:1,kind:'atlas-agent-changeset',id:'plan.browser.all',source:'Synthetic agent; explicit QA human decision',createdAt:Date.now(),operations:ops};
        const before=api.getStorageDiagnostics();api.preview(plan);if(api.getStorageDiagnostics().epoch!==before.epoch)throw Error('Preview persisted');
        await api.stage(plan);for(const r of base)if(api.getResource(r.resourceKey).head.revisionId!==r.head.revisionId)throw Error('Stage changed current content');
        // Represents the human review step, not agent self-approval.
        await api.accept(plan.id);
        for(const r of base)if(api.getResource(r.resourceKey).head.number!==2)throw Error('Missing accepted revision');
        return {base,planId:plan.id,keys:chosen.map(r=>r.resourceKey)};
        """)
        saved = read(page)
        ready(page, base)
        assert agent(page, 'return arg.every(key=>api.getResource(key).head.number===2);', result['keys'])
        assert next(r for r in saved['data']['history'] if r.get('id') == result['planId'])['status'] == 'accepted'
        record(phase)

        phase = 'manual Notebook save uses the same immutable revision engine'
        note = next(r for r in result['base'] if r['resourceType'] == 'notebook-page')
        agent(page, "await api.navigateAgentTarget(api.getResource(arg).target,'here');", note['resourceKey'])
        more_action(page, 'Edit current page')
        page.get_by_label('Append a new text block (optional)', exact=True).fill('Manual edit after accepted agent proposal.')
        page.get_by_role('button', name='Save page locally', exact=True).click()
        expect(page.locator('dialog[open]')).to_have_count(0)
        assert agent(page, 'return api.getResource(arg).head.number;', note['resourceKey']) == 3
        record(phase)

        phase = 'version Compare, exact pinned panes, stable History controls and keyboard matrix'
        agent(page, 'await api.compareRevisions(arg.resourceKey,arg.head.revisionId);', note)
        expect(page.get_by_role('group', name='Compare mode')).to_be_visible()
        expect(page.get_by_role('button', name='Changes', exact=True)).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('.document-pane[data-history-revision-id="' + note['head']['revisionId'] + '"]')).to_have_count(1)
        for width, height in MATRIX:
            page.set_viewport_size({'width': width, 'height': height})
            screenshot(page, f'changes-{width}')
            page.get_by_role('button', name='Side by side', exact=True).click()
            screenshot(page, f'side-by-side-{width}')
            agent(page, "await api.openAgentSystemSurface('history',arg);", note['target'])
            expect(page.get_by_role('dialog')).to_be_visible()
            expect(page.get_by_role('dialog', name='Version History').locator('.revision-row[data-revision-id]')).to_have_count(3)
            page.keyboard.press('Tab'); page.keyboard.press('Shift+Tab')
            screenshot(page, f'history-{width}')
            page.keyboard.press('Escape')
            expect(page.locator('dialog[open]')).to_have_count(0)
            page.get_by_role('button', name='Changes', exact=True).click()
        page.set_viewport_size({'width': 1440, 'height': 900})
        record(phase)

        phase = 'Agent Review visible preview/stage/accept and stale whole-batch rejection'
        plan = agent(page, """const r=api.getResource(arg);r.snapshot.page.blocks.push({id:r.resourceId+'.reviewui',type:'markdown',text:'Visible review operation.'});return {schemaVersion:1,kind:'atlas-agent-changeset',id:'plan.browser.ui',source:'UI fixture',createdAt:Date.now(),operations:[{id:'operation.ui',kind:'resource.update',resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:r.snapshot}}]};""", note['resourceKey'])
        agent(page, "await api.openAgentSystemSurface('agent-review');")
        page.get_by_label('ChangeSet JSON', exact=True).fill(json.dumps(plan))
        page.get_by_role('button', name='Preview ChangeSet', exact=True).click()
        expect(page.locator('[data-operation-id="operation.ui"]')).to_be_visible()
        for width, height in MATRIX:
            page.set_viewport_size({'width': width, 'height': height})
            screenshot(page, f'agent-review-{width}')
        page.set_viewport_size({'width': 1440, 'height': 900})
        page.get_by_role('button', name='Stage for review', exact=True).click()
        page.get_by_role('button', name='Accept selected operations', exact=True).click()
        expect(page.locator('.agent-decision[data-review-status="accepted"]')).to_be_visible()
        close_panels(page)
        agent(page, """const r=api.getResource(arg),s=structuredClone(r.snapshot);s.page.blocks.push({id:r.resourceId+'.stale',type:'markdown',text:'Do not accept stale.'});const base={schemaVersion:1,kind:'atlas-agent-changeset',source:'Stale fixture',createdAt:Date.now(),operations:[{id:'operation.stale',kind:'resource.update',resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:s}}]};await api.stage({...base,id:'plan.stale'});await api.stage({...base,id:'plan.fresh'});await api.accept('plan.fresh');const h=api.getResource(arg).head.revisionId;let refused=false;try{await api.accept('plan.stale');}catch(e){refused=e.name==='StaleChangeSetError';}if(!refused||api.getResource(arg).head.revisionId!==h)throw Error('Stale batch was not atomic');if(api.getReviews().items.find(r=>r.id==='plan.stale').status!=='stale')throw Error('Missing stale audit');""", note['resourceKey'])
        record(phase)

        phase = 'PDF physical-page current/history Compare and workspace navigation preserve provenance'
        pdf = next(r for r in result['base'] if r['resourceType'] == 'pdf')
        agent(page, "await api.compareRevisions(arg.resourceKey,arg.head.revisionId);await api.setAgentCompareState({enabled:true,mode:'side-by-side'});", pdf)
        screenshot(page, 'pdf-current-history')
        agent(page, "for(let n=1;n<=5;n++)await api.navigateAgentTarget({...api.getResource(arg.resourceKey,arg.head.revisionId).target,pdfPage:1},n);", pdf)
        ready(page, base)
        assert agent(page, 'return api.getWorkspaceSummary().slots.every(s=>s.initialized);')
        record(phase)

        phase = 'full backup UI download and fresh-context exact history restore'
        close_panels(page); open_settings(page)
        expect(page.locator('[data-history-diagnostics]')).to_be_visible()
        screenshot(page, 'settings-history-backup')
        with page.expect_download() as download:
            page.get_by_role('button', name='Download workspace backup', exact=True).click()
        backup = OUT / 'synthetic-browser-workspace.atlas-backup.zip'
        download.value.save_as(backup)
        expected = [r for r in read(page)['data']['history']]
        fresh = browser.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        restored = fresh.new_page(); ready(restored, base); open_settings(restored)
        restored.get_by_label('Restore workspace backup', exact=True).set_input_files(str(backup))
        restored.get_by_role('checkbox', name='I understand that this replaces the current local workspace.', exact=True).check()
        restored.get_by_role('button', name='Restore verified backup', exact=True).click()
        expect(restored.locator('dialog[open]')).to_have_count(0)
        assert read(restored)['data']['history'] == expected
        ready(restored, base)
        assert read(restored)['data']['history'] == expected
        fresh.close()
        record(phase)
        assert not errors, errors
        context.close(); browser.close()
    verdict = 'PASS' if DIST == 'dist' else 'COMPATIBILITY_ONLY'
    exit_code = 0 if DIST == 'dist' else 2
except Exception as exc:
    message = str(exc)
    blocked = ('ERR_BLOCKED_BY_ADMINISTRATOR' in message or message.startswith('BLOCKED:') or 'Executable doesn\'t exist' in message)
    verdict = 'BLOCKED' if blocked else 'FAIL'
    results.append({'name': phase, 'status': verdict, 'error': message, 'traceback': traceback.format_exc()})
    print(verdict, phase, message, flush=True)
    exit_code = 2 if blocked else 1
finally:
    report = {'status': verdict, 'distribution': DIST, 'normalOriginRequired': True, 'matrix': MATRIX,
              'securityPolicyUnmodified': True, 'agentEntry': 'app/agent/public.js', 'results': results,
              'pageErrors': errors, 'requestFailures': requests, 'screenshots': screens,
              'note': 'Missing/blocked scenarios are not passed. Compatibility-only results cannot certify integrated production.'}
    (OUT / 'results.json').write_text(json.dumps(report, indent=2))
sys.exit(exit_code)
