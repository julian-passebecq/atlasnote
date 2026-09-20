"""Disposable native IndexedDB fixtures and storage API UI qualification.

API capability variants override only navigator.storage, never the database writer.
Corruption writes are test fixture setup; the integrity action is the real UI.
"""
import ast
import json
import subprocess
from pathlib import Path
from playwright.sync_api import expect
from v23_browser_common import RAW, STORES, flush, open_settings, seed_demo



def storage_matrix(browser, base, passed):
    cases = [
        ('available', 'granted', "{estimate:async()=>({usage:1024,quota:1073741824}),persisted:async()=>false,persist:async()=>true}"),
        ('available', 'denied', "{estimate:async()=>({usage:1024,quota:1073741824}),persisted:async()=>false,persist:async()=>false}"),
        ('unsupported', 'unsupported', '{}'),
        ('available', 'failed', "{estimate:async()=>({usage:0,quota:1073741824}),persisted:async()=>false,persist:async()=>{throw Error('persist fixture')}}"),
        ('failed', 'failed', "{estimate:async()=>{throw Error('estimate fixture')},persisted:async()=>{throw Error('persisted fixture')},persist:async()=>{throw Error('persist fixture')}}"),
        ('unavailable', 'already-persistent', "{estimate:async()=>({}),persisted:async()=>true,persist:async()=>{throw Error('must not request again')}}"),
    ]
    for estimate, persistence, value in cases:
        context = browser.new_context()
        try:
            context.add_init_script("Object.defineProperty(navigator,'storage',{configurable:true,value:"+value+"});")
            page = context.new_page()
            page.goto(base, wait_until='networkidle')
            page.wait_for_selector('.atlas-app')
            flush(page)
            open_settings(page)
            section = page.locator('section[aria-label="Storage and recovery health"]')
            if estimate == 'available':
                expect(section).to_contain_text('estimated origin quota')
            else:
                expect(section).to_contain_text('Quota estimate: '+estimate+'.')
            before = page.evaluate(RAW)
            section.get_by_role('button', name='Request persistent storage', exact=True).click()
            expect(section).to_contain_text('Persistence request: '+persistence+'.')
            section.get_by_role('button', name='Refresh storage health', exact=True).click()
            expect(section.get_by_role('button', name='Refresh storage health', exact=True)).to_be_enabled()
            assert page.evaluate(RAW) == before
            passed('Storage API UI variant with zero database writes', estimate=estimate, persistence=persistence,
                   scope='Browser capability responses controlled; real mounted UI and native five-store observation')
        finally:
            context.close()


def legacy_seed():
    # Reuse the inherited native migration seed without executing its top-level suite.
    module = ast.parse(Path('tests/v22_runtime.py').read_text(encoding='utf-8'))
    return next(ast.literal_eval(node.value) for node in module.body
                if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'SEED' for t in node.targets))


def migration_matrix(browser, base, passed):
    script = """
    import {authoredFixtures} from './tests/v22/fixtures.mjs';
    const ws=authoredFixtures();ws.personal.bookmarks.push({id:'bookmark.v23.migration',pageId:'page.atlas.welcome',title:'Retained legacy bookmark',createdAt:1});
    console.log(JSON.stringify(ws));
    """
    fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], text=True, encoding='utf-8'))
    for mode in ('populated', 'interrupted', 'old-tab'):
        context = browser.new_context()
        try:
            page = context.new_page()
            url = base+'__v23_legacy_fixture__'
            context.route(url, lambda route: route.fulfill(status=200, content_type='text/html', body='<!doctype html><title>Disposable legacy fixture</title>'))
            page.goto(url)
            page.evaluate(legacy_seed(), {'workspace': fixture, 'history': None})
            if mode == 'interrupted':
                result = page.evaluate("""()=>new Promise((ok,no)=>{
                  const r=indexedDB.open('knowledge-atlas',3);
                  r.onupgradeneeded=()=>{r.result.createObjectStore('history');r.transaction.abort();};
                  r.onerror=e=>{e.preventDefault();ok(r.error.name);};r.onsuccess=()=>{r.result.close();no(Error('Upgrade should abort'));};
                })""")
                assert result == 'AbortError'
            if mode == 'old-tab':
                page.evaluate("""()=>new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas',2);r.onerror=()=>no(r.error);r.onsuccess=()=>{window.legacy=r.result;window.changed=false;legacy.onversionchange=()=>{window.changed=true;};ok();};})""")
                newer = context.new_page()
                newer.goto(base, wait_until='networkidle')
                expect(newer.get_by_text('Database upgrade is blocked by another Atlas tab.', exact=False).first).to_be_visible()
                assert page.evaluate('window.changed')
                page.evaluate('window.legacy.close()')
                # A v4 probe must finish while the failed app tab is STILL OPEN.
                # A leaked late-success v3 connection would block this request.
                result = page.evaluate("""()=>new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas',4);r.onblocked=()=>no(Error('Late-success connection leaked'));r.onerror=()=>no(r.error);r.onsuccess=()=>{const d=r.result;const names=[...d.objectStoreNames];d.close();ok(names);};})""")
                assert sorted(result) == STORES
                passed('Old tab blocks upgrade; late successful rejected open closes its orphan connection')
                continue
            page.goto(base, wait_until='networkidle')
            page.wait_for_selector('.atlas-app')
            flush(page)
            before = page.evaluate(RAW)
            assert sorted(before) == STORES
            assert [r['value'] for r in before['imports']] == fixture['imports']
            assert before['overlays'][0]['value'] == fixture['overlays']
            assert before['personal'][0]['value']['bookmarks'] == fixture['personal']['bookmarks']
            rows = [r['value'] for r in before['history']]
            revisions = [r for r in rows if r['kind'] == 'revision']
            heads = [r for r in rows if r['kind'] == 'head']
            assert revisions and len(revisions) == len(heads)
            assert all(r['number'] == 1 for r in revisions)
            page.reload(wait_until='networkidle')
            page.wait_for_selector('.atlas-app')
            flush(page)
            after = page.evaluate(RAW)
            assert after['history'] == before['history']
            assert after['assets'] == before['assets']
            passed('Populated native v2 migration and idempotent reload', mode=mode, revisions=len(revisions))
        finally:
            context.close()


def corruption_matrix(browser, base, passed):
    for defect in ('stored-key', 'head', 'projection', 'asset'):
        context = browser.new_context()
        try:
            page = context.new_page()
            page.goto(base, wait_until='networkidle')
            page.wait_for_selector('.atlas-app')
            seed_demo(page)
            flush(page)
            section = page.locator('section[aria-label="Storage and recovery health"]')
            section.locator('[data-durability-action="integrity"]').click()
            expect(section).to_contain_text('Read-only integrity check passed.', timeout=30000)
            page.evaluate("""async defect=>{
              const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
              const tx=db.transaction(['history','overlays','assets'],'readwrite');
              const done=new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});
              if(defect==='stored-key')tx.objectStore('history').put({kind:'head',resourceKey:'invalid'},'wrong-key');
              if(defect==='head'){const s=tx.objectStore('history'),r=s.getAll();r.onsuccess=()=>{const h=r.result.find(x=>x.kind==='head');h.revisionId='missing-revision';s.put(h,'head:'+h.resourceKey);};}
              if(defect==='projection'){const s=tx.objectStore('overlays'),r=s.get('active');r.onsuccess=()=>{const v=r.result;const p=Object.values(v.pages).map(x=>x.page).find(p=>p.id==='demo.v23.notebook');if(!p){tx.abort();return;}p.title+=' persisted corruption';s.put(v,'active');};}
              if(defect==='asset'){const s=tx.objectStore('assets'),r=s.getAll();r.onsuccess=()=>{const a=r.result[0];a.bytes=new Uint8Array([0,1,2]);s.put(a,a.key);};}
              await done;db.close();
            }""", defect)
            before = page.evaluate(RAW)
            section.locator('[data-durability-action="integrity"]').click()
            expect(section.get_by_role('alert')).to_be_visible(timeout=30000)
            error = section.get_by_role('alert').inner_text()
            assert error
            assert page.evaluate(RAW) == before
            passed('Persisted corruption rejected without five-store mutation', defect=defect, error=error)
        finally:
            context.close()
