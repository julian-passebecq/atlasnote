"""Supplemental compatibility-browser diagnostic. NOT integrated or provider qualification.
Uses existing compatibility React and actual normal-origin IndexedDB with synthetic demo.
Does not run from the mandatory release harness or substitute for any blocked gate.
"""
import os,json,threading,http.server,functools,traceback,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import launch
from v23_browser_common import flush
from v23_qualification import layout,safe_close
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
OUT=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/access-compatibility-diagnostic'));OUT.mkdir(parents=True,exist_ok=True)
rows=[];server=None;build={};browserCreated=False;browserClosed=False;serverClosed=False
def passed(name,**detail):rows.append({'name':name,'status':'PASS','scope':'compatibility diagnostic only',**detail})
class Spa(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        from urllib.parse import urlsplit
        target=Path(self.translate_path(urlsplit(self.path).path))
        if not target.exists() and not target.suffix:self.path='/index.html'
        super().do_GET()
try:
    build=json.loads((ROOT/'dist-offline/build-identity.json').read_text());assert build['buildKind']=='compatibility'
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Spa,directory=str(ROOT/'dist-offline')))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base='http://127.0.0.1:'+str(server.server_port)+'/'
    with sync_playwright() as pw:
        browser=launch(pw);browserCreated=True
        try:
            context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
            page=context.new_page();page.set_default_timeout(15000)
            page.goto(base+'workspace/5/history/old',wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
            assert page.evaluate('document.baseURI')==base
            assert page.evaluate("async()=>await(await fetch(new URL('content.json',document.baseURI))).json()")
            assert page.locator('form[action="/__atlasnote_lock"]').count()==0
            passed('Deep-link document base loads actual compatibility app and content without Netlify logout form')
            page.screenshot(path=str(OUT/'deep-link-compatibility.png'),full_page=True)
            layout(browser,context,page,base,OUT,passed)
            safe_close(browser,context,page,base,OUT,passed)
            context.close()
        finally:
            browser.close();browserClosed=True
except Exception as exc:
    unavailable=any(x in str(exc) for x in ('ERR_BLOCKED_BY_ADMINISTRATOR',"Executable doesn't exist",'Local test server did not start'))
    rows.append({'name':'Compatibility diagnostic prerequisite' if unavailable else 'Compatibility diagnostic assertion','status':'BLOCKED' if unavailable else 'FAIL','error':str(exc),'traceback':traceback.format_exc()})
finally:
    if server:server.shutdown();server.server_close();serverClosed=True
report={'scope':'SUPPLEMENTAL COMPATIBILITY DIAGNOSTIC - NOT INTEGRATED, PDF, NATIVE CAPACITY OR VERCEL QUALIFICATION','buildIdentity':build,'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'status':'FAIL' if any(r['status']=='FAIL' for r in rows) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in rows) else 'PASS','results':rows,'cleanup':{'localServerCreated':server is not None,'localServerClosed':serverClosed,'ephemeralBrowserCreated':browserCreated,'ephemeralBrowserClosed':browserClosed}}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));raise SystemExit(1 if report['status']=='FAIL' else 2 if report['status']=='BLOCKED' else 0)
