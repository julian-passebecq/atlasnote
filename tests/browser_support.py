"""Shared launch utilities. Does not alter browser policy or relax production security.
DOM-only tests intentionally mount into about:blank and suppress storage writes.
Normal-origin suites use the unmodified production entry and real IndexedDB.
"""
import atexit
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

def start_server(dom_only=False, dist=None):
    explicit = os.environ.get('ATLAS_BASE_URL')
    if explicit:
        return explicit.rstrip('/') + '/'
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    env = {**os.environ, 'PORT': str(port), 'ATLAS_DOM_TESTS': '1' if dom_only else '0', 'ATLAS_DIST': dist or ('dist-offline' if dom_only else os.environ.get('ATLAS_DIST','dist'))}
    process = subprocess.Popen(['node', 'tools/serve.mjs'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    atexit.register(process.terminate)
    base = f'http://127.0.0.1:{port}/'
    for _ in range(50):
        try:
            urllib.request.urlopen(base, timeout=1).close()
            return base
        except OSError:
            time.sleep(.1)
    process.terminate()
    raise RuntimeError('Local test server did not start')

def launch(playwright):
    executable = os.environ.get('CHROMIUM_PATH')
    if not executable and Path('/usr/bin/chromium').exists():
        executable = '/usr/bin/chromium'
    return playwright.chromium.launch(executable_path=executable, headless=True, args=['--no-sandbox'])

def synthetic_data():
    script = """
    import fs from 'node:fs/promises';import {loadSchemas,readWorkspace} from './src/core/packs.mjs';import {unzipBounded} from './src/storage/archives.mjs';
    const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
    console.log(JSON.stringify(await Promise.all(['1.0.0','1.1.0'].map(async v=>readWorkspace((await unzipBounded(new Uint8Array(await fs.readFile('tests/fixtures/atlas-audit-stress-library-'+v+'.zip')))).files,schemas)))));
    """
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], cwd=ROOT, text=True))

def mount_dom(page, base, controls_visible=True):
    page.set_content(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="{base}"><link rel="stylesheet" href="styles/app.css"></head><body><div id="root"></div></body></html>')
    page.add_script_tag(url=base+'app/vendor/jszip.js')
    page.add_script_tag(url=base+'app/vendor/prism.js')
    page.evaluate('''async({base,synthetic,controlsVisible})=>{
      if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
      history.replaceState=()=>{};
      const [{default:React,ReactDOM},{store},{App},core]=await Promise.all([import(base+'app/vendor/react.mjs'),import(base+'app/storage/database.js'),import(base+'app/app/App.js'),import(base+'app/core/workspace.js')]);
      // Only the write queue is suppressed. This harness does NOT test persistence.
      store.enqueue=async()=>{};window.testStore=store;window.testCore=core;
      const built=await(await fetch(base+'content.json')).json();window.testBuilt=built;
      window.testReset=(id='page.atlas.welcome',mode='continuous',useSynthetic=false)=>{
        const ws=core.blankWorkspace();if(controlsVisible)ws.personal.session.panes[0].readerChromeCollapsed=false;if(useSynthetic)ws.imports=structuredClone(synthetic[0].packs);
        const c=core.compose(built,ws);ws.personal.session.expanded=c.projects.flatMap(p=>{const ids=[p.id];const walk=ns=>ns.forEach(n=>{if(n.children){ids.push(n.id);walk(n.children);}});walk(p.nodes);return ids;});
        if(id){delete ws.personal.session.surface;const v=core.newView(id);v.history[0].presentation=mode;ws.personal.session.panes[0].views=[v];ws.personal.session.panes[0].active=v.id;ws.personal.session.screen='reader';}store.setLoaded(ws);
      };
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App,{built}));
    }''', {'base': base, 'synthetic': synthetic_data(), 'controlsVisible': controls_visible})
    page.wait_for_timeout(200)


# AtlasNote 1.2: controls intentionally moved into the shared reader rail.
# These helpers use visible controls. They do not alter production storage/state.
def close_panels(page):
    for _ in range(3):
        if page.locator('dialog[open],.floating-panel,[role="menu"]').count():
            page.keyboard.press('Escape')
        else:
            break

def open_more(page):
    if not page.locator('.popover-more').count():
        page.get_by_role('button',name='More / Settings',exact=True).click()
    return page.locator('.popover-more')

def more_action(page,name):
    open_more(page).get_by_role('button',name=name,exact=True).click()

def open_settings(page):
    more_action(page,'Workspace settings')

def open_context(page,tab=None):
    if not page.locator('.document-context').count():
        page.get_by_role('button',name='Open context panel',exact=True).click()
    panel=page.locator('.document-context')
    target={'Context':'Outline / Glossary','Outline':'Outline / Glossary'}.get(tab,tab or 'Outline / Glossary')
    panel.get_by_role('tab',name=target,exact=True).click()
    return panel


def open_saved_manager(page, all_workspaces=False):
    if not page.locator('.workspace-states-panel').count():
        close_panels(page)
        page.get_by_role('button',name='Workspace States',exact=True).click()
    if all_workspaces:
        page.get_by_role('tab',name='All workspaces saves',exact=True).click()
    return page.locator('.state-saves-manager')


def state_action(page,name):
    open_saved_manager(page)
    page.get_by_role('button',name=name,exact=True).click()
    close_panels(page)


def bookmark_position(page):
    page.get_by_role('button',name='Open bookmarks',exact=True).click()
    page.get_by_role('button',name='Bookmark current position',exact=True).click()
    close_panels(page)


def inspect_pdf_term(page,label):
    close_panels(page)
    open_more(page).get_by_role('button',name='Manage PDF details',exact=True).click()
    page.get_by_role('combobox',name='Edit concept',exact=True).select_option(label=label)
    page.get_by_role('button',name='Open saved definition',exact=True).click()
    return page.locator('dialog[open]')


def open_reading(page,pane=None):
    if pane is not None:
        if page.locator('.popover-reading').count():page.keyboard.press('Escape')
        pane.locator('.document-tab.selected').click() if pane.locator('.document-tab.selected').count() else pane.locator('.empty-pane').click()
    if not page.locator('.popover-reading').count():
        show_reader_controls(page,pane)
        (pane or page.locator('.active-pane')).get_by_role('button',name='Reading mode',exact=True).click()
    return page.locator('.popover-reading')

def reader_action(page,name,pane=None):
    open_reading(page,pane).get_by_role('button',name=name,exact=True).click()
    if page.locator('.popover-reading').count():page.keyboard.press('Escape')

def set_learning_flag(page,flag):
    open_more(page).get_by_role('combobox',name='Learning flag',exact=True).select_option(flag)
    page.keyboard.press('Escape')


def show_reader_controls(page, pane=None):
    """Each pane owns its toggle in 1.2.5; no active-pane/global proxy."""
    area=pane or page.locator('.active-pane')
    button=area.get_by_role('button',name='Show reader controls',exact=True)
    if button.count():button.click()
    return area


def open_article_advanced(page):
    """V2 content-first Article editor keeps secondary metadata in its disclosure."""
    disclosure=page.locator('details.article-advanced')
    if disclosure.count() and disclosure.get_attribute('open') is None:
        disclosure.locator('summary').click()
    return disclosure


def choose_library_resource(page, resource_id):
    """Exercise the compact keyboard fallback; never inject selected source state."""
    disclosure=page.locator('details.resource-browser')
    if disclosure.count() and disclosure.get_attribute('open') is None:
        disclosure.locator('summary').click()
    page.get_by_label('Selected library resource',exact=True).select_option(resource_id)
