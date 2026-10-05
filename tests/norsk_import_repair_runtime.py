"""Synthetic repair -> reviewed import, real IndexedDB and reload on a local normal origin.
No publisher article, owner profile, remote fetch, or production deployment is involved.
"""
import json,os,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/norsk-import-repair'));OUT.mkdir(parents=True,exist_ok=True)
feed=json.loads((ROOT/'examples/norsk-daily/synthetic-2026-09-24.json').read_text(encoding='utf-8'))
feed['items'][0]['headline']['text']='Kommunen sier "hei" i dag'
raw=json.dumps(feed,ensure_ascii=False).replace('\\"','"')+'\nDo you like this personality?'
results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1500,'height':1000});errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 p.wait_for_function('async()=>('+AGENT+').getStorageDiagnostics().ready!==false')
 def btn(name):return p.get_by_role('button',name=name,exact=True)
 btn('Norsk Daily').click();btn('Open review to import a feed').click()
 p.get_by_text('Paste Norsk Daily feed JSON',exact=True).click();paste=p.get_by_label('Paste Norsk Daily feed JSON',exact=True)
 before=p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')
 paste.fill(raw);btn('Convert pasted feed to proposal').click()
 expect(p.get_by_role('region',name='Norsk Daily format corrections')).to_be_visible()
 expect(btn('Stage for review')).to_be_disabled()
 assert p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')==before
 p.screenshot(path=str(OUT/'correction-preview.png'))
 results.append({'name':'Bounded repairs are visible and create no proposal or authored revision until confirmed','status':'PASS'})
 btn('Use corrections and preview').click();expect(btn('Stage for review')).to_be_enabled()
 paste.fill('{"schema":}');expect(btn('Stage for review')).to_be_disabled();btn('Convert pasted feed to proposal').click()
 expect(p.get_by_role('alert')).to_be_visible();expect(btn('Stage for review')).to_be_disabled()
 results.append({'name':'Editing or invalid input clears the prior proposal and cannot stage stale content','status':'PASS'})
 # File and paste use the same repair pipeline.
 with tempfile.TemporaryDirectory() as tmp:
  path=Path(tmp)/'synthetic-chat.json';path.write_text(raw,encoding='utf-8')
  p.get_by_label('Import Norsk Daily feed JSON',exact=True).set_input_files(str(path))
  expect(p.get_by_role('region',name='Norsk Daily format corrections')).to_be_visible()
  btn('Use corrections and preview').click();expect(btn('Stage for review')).to_be_enabled()
 btn('Stage for review').click();expect(btn('Accept selected operations')).to_be_enabled()
 assert p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')==before
 btn('Accept selected operations').click();expect(p.get_by_role('status').filter(has_text='Accepted')).to_be_visible()
 btn('Close dialog').click();p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');btn('Norsk Daily').click()
 expect(p.get_by_text('Kommunen sier "hei" i dag',exact=True)).to_be_visible()
 p.screenshot(path=str(OUT/'accepted-after-reload.png'))
 results.append({'name':'File repair, explicit stage/accept and exact Norwegian source survive real IndexedDB reload','status':'PASS'})
 after=p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')
 btn('Add feed').click();p.get_by_label('Import Norsk Daily feed JSON',exact=True).set_input_files(str(ROOT/'examples/norsk-daily/synthetic-2026-09-24.json'))
 # Same identity/revision with a different headline is rejected, never overwritten.
 expect(p.get_by_role('alert')).to_be_visible();expect(btn('Stage for review')).to_be_disabled()
 assert p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().revisions')==after
 results.append({'name':'Conflicting same-revision source remains blocked after repair support','status':'PASS'})
 assert not errors,errors;b.close()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
