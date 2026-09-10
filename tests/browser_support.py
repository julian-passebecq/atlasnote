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

def start_server(dom_only=False):
    explicit = os.environ.get('ATLAS_BASE_URL')
    if explicit:
        return explicit.rstrip('/') + '/'
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    env = {**os.environ, 'PORT': str(port), 'ATLAS_DOM_TESTS': '1' if dom_only else '0'}
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

def mount_dom(page, base):
    page.set_content(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="{base}"><link rel="stylesheet" href="styles/app.css"></head><body><div id="root"></div></body></html>')
    page.add_script_tag(url=base+'app/vendor/jszip.js')
    page.add_script_tag(url=base+'app/vendor/prism.js')
    page.evaluate('''async({base,synthetic})=>{
      if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
      history.replaceState=()=>{};
      const [{default:React,ReactDOM},{store},{App},core]=await Promise.all([import(base+'app/vendor/react.mjs'),import(base+'app/storage/database.js'),import(base+'app/app/App.js'),import(base+'app/core/workspace.js')]);
      // Only the write queue is suppressed. This harness does NOT test persistence.
      store.enqueue=async()=>{};window.testStore=store;window.testCore=core;
      const built=await(await fetch(base+'content.json')).json();window.testBuilt=built;
      window.testReset=(id='page.atlas.welcome',mode='continuous',useSynthetic=false)=>{
        const ws=core.blankWorkspace();if(useSynthetic)ws.imports=structuredClone(synthetic[0].packs);
        const c=core.compose(built,ws);ws.personal.session.expanded=c.projects.flatMap(p=>{const ids=[p.id];const walk=ns=>ns.forEach(n=>{if(n.children){ids.push(n.id);walk(n.children);}});walk(p.nodes);return ids;});
        if(id){const v=core.newView(id);v.history[0].presentation=mode;ws.personal.session.panes[0].views=[v];ws.personal.session.panes[0].active=v.id;ws.personal.session.screen='reader';}store.setLoaded(ws);
      };
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App,{built}));
    }''', {'base': base, 'synthetic': synthetic_data()})
    page.wait_for_timeout(200)
