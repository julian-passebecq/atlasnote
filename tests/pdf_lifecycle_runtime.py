"""Rapid real-origin navigation while encrypted PDF loads are in flight."""
import json,os,sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server
out=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v22/pdf-lifecycle'))
out.mkdir(parents=True,exist_ok=True)
base=start_server(dist='dist');errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    c=browser.new_context();p=c.new_page()
    p.on('pageerror',lambda e:errors.append({'message':str(e),'stack':e.stack}))
    p.goto(base,wait_until='networkidle');expect(p.locator('.atlas-app')).to_be_visible()
    public="(await import(new URL('app/agent/public.js',document.baseURI))).getAgentInterface()"
    p.wait_for_function('async()=>('+public+').getStorageDiagnostics().initialized')
    for n in range(80):
        p.evaluate('async(n)=>{const api='+public+';const id=n%2?"pdf:doc.atlas.pdf":"pdf:doc.atlas.password";await api.navigateAgentTarget(api.getResource(id).target,"here");}',n)
        p.wait_for_timeout([10,30,60,100,200][n%5])
    p.evaluate('async()=>{const api='+public+';await api.navigateAgentTarget(api.getResource("pdf:doc.atlas.pdf").target,"here");}')
    expect(p.locator('.active-pane .react-pdf__Page canvas').first).to_be_visible(timeout=20000)
    p.wait_for_timeout(500)
    p.screenshot(path=str(out/'final-pdf.png'))
    c.close();browser.close()
(out/'results.json').write_text(json.dumps({'status':'FAIL' if errors else 'PASS','navigationCount':80,'errors':errors},indent=2),encoding='utf-8')
print(json.dumps({'status':'FAIL' if errors else 'PASS','errors':errors},indent=2))
sys.exit(1 if errors else 0)

