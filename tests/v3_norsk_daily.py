"""V3 Norsk Daily end-to-end on the integrated build: SYNTHETIC feed -> Agent Review
preview/stage -> explicit human accept (QA acting as the human reviewer) ->
Norsk Daily queue -> progress persists across reload. Real IndexedDB; no network
source, no real headlines."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT,SNAPSHOT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/norsk-daily'));OUT.mkdir(parents=True,exist_ok=True)
FIXTURE=ROOT/'examples/norsk-daily/synthetic-2026-09-24.json'
results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900});p=ctx.new_page();p.set_default_timeout(20000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 p.wait_for_function('async()=>('+AGENT+').getStorageDiagnostics().ready!==false')
 def btn(name,scope=None):return (scope or p).get_by_role('button',name=name,exact=True)
 def shot(n):p.screenshot(path=str(OUT/(n+'.png')))
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def empty_state():
  btn('Norsk Daily').click();expect(p.get_by_role('heading',name='No Norsk Daily batch yet')).to_be_visible();shot('empty');return {}
 check('Norsk Daily opens from the sidebar and explains the reviewed import path when empty',empty_state)
 def import_accept():
  btn('Open review to import a feed').click()
  p.get_by_label('Import Norsk Daily feed JSON',exact=True).set_input_files(str(FIXTURE))
  expect(p.get_by_text('Norsk Daily feed converted to a proposal',exact=False)).to_be_visible()
  before=p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')
  btn('Preview ChangeSet').click();btn('Stage for review').click()
  p.wait_for_function('async()=>!('+AGENT+').getStorageDiagnostics().saving')
  # Staging records the review audit (epoch may advance) but creates no content revision.
  assert p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')==before,'staging must not create content revisions'
  btn('Accept selected operations').click()
  p.wait_for_function('async(r)=>{const d=('+AGENT+').getStorageDiagnostics();return d.revisions>r&&!d.saving;}',arg=before)
  btn('Close dialog').last.click();return {'revisionsBefore':before,'revisionsAfter':p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')}
 check('Synthetic feed becomes content only after preview, stage and explicit accept',import_accept)
 def queue():
  if not p.locator('.norsk-daily-queue').count():btn('Norsk Daily').click()
  items=p.locator('.norsk-daily-item');expect(items.first).to_be_visible();n=items.count();assert n>=2
  expect(p.locator('.norsk-daily-synthetic')).to_be_visible()
  expect(p.locator('.norsk-daily-en')).to_have_count(0);p.get_by_label('Show English',exact=True).check();expect(p.locator('.norsk-daily-en')).to_have_count(n)
  first=items.first;pid=first.get_attribute('data-page-id')
  first.get_by_role('button',name='Known',exact=True).click()
  expect(p.locator('.norsk-daily-item[data-page-id="'+pid+'"]')).to_have_class(__import__('re').compile('status-known'))
  expect(btn('Known (1)')).to_be_visible();shot('queue');return {'items':n,'known':pid}
 check('Daily queue shows labelled synthetic items, English reveal and New/Learning/Known progress',queue)
 def persists():
  p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}')
  p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app')
  if not p.locator('.norsk-daily-queue').count():btn('Norsk Daily').click()
  expect(btn('Known (1)')).to_be_visible()
  btn('Practice '+str(p.locator('.norsk-daily-toolbar .primary').inner_text().split()[1])+' questions').click()
  expect(p.locator('.active-pane h1')).to_contain_text('Norsk Daily')
  shot('practice');return {}
 check('Progress persists across reload; the day QCM opens as a native quiz',persists)
 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-norsk-daily','scope':'Playwright Chromium, integrated build, SYNTHETIC fixture only','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
