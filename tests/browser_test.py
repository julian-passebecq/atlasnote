"""Normal-origin production smoke and real IndexedDB reload test.
Starts the built app server unless ATLAS_BASE_URL is supplied. Policy-blocked navigation exits 2 (BLOCKED), not PASS.
"""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
from browser_support import start_server
out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence'));out.mkdir(parents=True,exist_ok=True)
url=start_server()
result={'scope':'Normal-origin production entry with real IndexedDB','status':'NOT_RUN'}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox']);page=b.new_page()
  page.goto(url,wait_until='networkidle');page.get_by_role('button',name='Global search',exact=True).click();page.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill('A quiet place');page.locator('.search-result').first.click();page.get_by_role('button',name='Remarks',exact=True).click();page.get_by_role('textbox',name='Personal remarks').fill('ATLAS_REAL_IDB_RELOAD_TEST');page.get_by_text('Saved locally',exact=False).wait_for();page.reload(wait_until='networkidle');page.get_by_role('button',name='Remarks',exact=True).click();assert page.get_by_role('textbox',name='Personal remarks').input_value()=='ATLAS_REAL_IDB_RELOAD_TEST';b.close();result['status']='PASS'
except Exception as e:
 result.update(status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) else 'FAIL',error=str(e))
(out/'browser-integration.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
raise SystemExit(0 if result['status']=='PASS' else 2 if result['status']=='BLOCKED' else 1)
