"""NON-RELEASE browser diagnostics when only the vendored compatibility build exists.

No build-identity rewrite, opaque origin, or production runtime substitution. The
report always returns BLOCKED/2 for release regardless of individual diagnostics.
"""
import importlib,sys
from v23_browser_common import *

SUITES={
 'runtime':('v23_runtime','scenario'),
 'compare':('v23_qualification','compare'),
 'layout':('v23_qualification','layout'),
 'safe-close':('v23_qualification','safe_close'),
 'compaction':('v23_compaction_runtime','scenario'),
}

def main():
    if len(sys.argv)!=2 or sys.argv[1] not in SUITES:raise SystemExit('Select '+', '.join(SUITES))
    suite=sys.argv[1];module,fn=SUITES[suite]
    body=getattr(importlib.import_module(module),fn)
    out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/offline-diagnostic/'+suite));out.mkdir(parents=True,exist_ok=True)
    rows=[];build=json.loads(Path('dist-offline/build-identity.json').read_text())
    assert build['buildKind']=='compatibility'
    source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    def passed(name,**detail):rows.append({'name':name,'status':'PASS','qualification':'compatibility diagnostic only',**detail})
    try:
        base=start_server(dist='dist-offline')
        with sync_playwright() as pw:
            browser=launch(pw)
            try:
                context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
                page=context.new_page();page.set_default_timeout(15000)
                page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
                body(browser,context,page,base,out,passed)
            finally:browser.close()
    except Exception as exc:
        blocked=any(text in str(exc) for text in ['ERR_BLOCKED_BY_ADMINISTRATOR',"Executable doesn't exist",'Local test server did not start'])
        rows.append({'name':'Diagnostic execution','status':'BLOCKED' if blocked else 'FAIL','error':str(exc),'traceback':traceback.format_exc()})
    rows.append({'name':'Integrated production candidate qualification','status':'BLOCKED','reason':'This is the unchanged vendored compatibility runtime, not React-PDF/Vite. Results do not satisfy any mandatory integrated release gate.'})
    return write_result(out,rows,'NON-RELEASE '+suite,build,source)

if __name__=='__main__':raise SystemExit(main())
