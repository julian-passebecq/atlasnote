"""AtlasNote layout-only evidence. Managed provider login UI is explicitly out of app scope."""
import os,json,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import launch,start_server,mount_dom,open_settings
OUT=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/layout'));OUT.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as pw:
 browser=launch(pw)
 try:
  base=start_server(dom_only=True)
  for width,height in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height});page.set_default_timeout(5000);mount_dom(page,base);page.evaluate('window.testReset()')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   open_settings(page)
   assert page.locator('section[aria-label="History archival and attachments"]').count()==1
   section=page.locator('section[aria-label="History archival and attachments"]')
   section.get_by_text('Prepare a verified history archive',exact=True).click()
   field=page.get_by_label('Live versions to retain',exact=True);field.scroll_into_view_if_needed();field.focus()
   assert field.evaluate('(e)=>e===document.activeElement')
   page.keyboard.press('Tab');assert page.evaluate('document.activeElement!==document.body')
   assert section.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
   page.screenshot(path=str(OUT/f'controls-{width}x{height}.png'),full_page=True)
   results.append({'name':f'AtlasNote durability controls layout {width}x{height}','status':'PASS','scope':'Original opaque-origin application harness; provider login is external and intentionally untested here'});page.close()
 except Exception as exc:
  results.append({'name':'Application DOM harness','status':'BLOCKED' if 'blocked' in str(exc).lower() or 'Error' in str(exc) else 'FAIL','error':str(exc),'traceback':traceback.format_exc()})
 browser.close()
(OUT/'results.json').write_text(json.dumps({'scope':'AtlasNote layout only; never provider-login, atomicity or normal-origin storage proof','results':results},indent=2));print(json.dumps(results,indent=2));raise SystemExit(0 if all(r['status']=='PASS' for r in results) else 2)
