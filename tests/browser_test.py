"""Normal-origin production smoke and real IndexedDB reload test.
Run the built app server first. Policy-blocked navigation exits 2 (BLOCKED), not PASS.
"""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence'));out.mkdir(parents=True,exist_ok=True)
url=os.environ.get('ATLAS_BASE_URL','http://127.0.0.1:4173/')
result={'scope':'Normal-origin production entry with real IndexedDB','status':'NOT_RUN'}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox']);page=b.new_page()
  page.goto(url,wait_until='networkidle');page.get_by_role('main').get_by_role('button',name='Reader guide',exact=True).click();page.get_by_role('button',name='Remarks',exact=True).click();page.get_by_role('textbox',name='Personal remarks').fill('ATLAS_REAL_IDB_RELOAD_TEST');page.get_by_text('Saved locally',exact=False).wait_for();page.reload(wait_until='networkidle');page.get_by_role('button',name='Remarks',exact=True).click();assert page.get_by_role('textbox',name='Personal remarks').input_value()=='ATLAS_REAL_IDB_RELOAD_TEST';b.close();result['status']='PASS'
except Exception as e:
 result.update(status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) else 'FAIL',error=str(e))
(out/'browser-integration.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
raise SystemExit(0 if result['status']=='PASS' else 2 if result['status']=='BLOCKED' else 1)
