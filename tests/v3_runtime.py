"""V3 normal-origin browser checks on the integrated (React-PDF/PDF.js) build.

Real IndexedDB, real PDF.js rendering, two tabs of one browser profile.
This is Playwright/Chromium evidence only: it does NOT prove physical mouse or
trackpad behaviour, and it does not replace a real affected-device trace.
"""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT,SNAPSHOT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/runtime'));OUT.mkdir(parents=True,exist_ok=True)
PERSISTED='async()=>{const m='+SNAPSHOT+';return (await m.readPersistedWorkspace()).personal;}'
results=[];base=start_server()
def slot_session(personal,n=None):
 n=n or personal.get('activeWorkspaceSlot',1);return personal['session'] if n==1 else personal['workspaceSlots'][str(n)]
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900});p=ctx.new_page();p.set_default_timeout(15000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 def btn(name,scope=None):return (scope or p).get_by_role('button',name=name,exact=True)
 def shot(n):p.screenshot(path=str(OUT/(n+'.png')))
 def persisted(page=None):
  v=(page or p).evaluate(PERSISTED);return v[0]['value'] if isinstance(v,list) else v
 def open_pdf():
  p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
  p.locator('.active-pane [data-page-rendered="true"] canvas').first.wait_for()
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))

 def compact_control():
  open_pdf();pane=p.locator('.active-pane')
  hide=btn('Hide reader controls',pane)
  if hide.count():hide.click()
  compact=pane.locator('.pdf-page-compact');expect(compact).to_be_visible()
  field=compact.get_by_label('Physical PDF page number (compact)',exact=True)
  start=field.input_value()
  for bad,msg in [('','Enter a physical page'),('abc','Enter a physical page'),('999','outside this PDF')]:
   field.fill(bad);field.press('Enter');expect(compact.get_by_role('alert')).to_contain_text(msg)
   p.wait_for_timeout(200);assert pane.locator('.pdf-canvas-scroll [data-physical-page="'+start+'"]').count()==1,'invalid input navigated'
  field.fill('3');field.press('Enter');pane.locator('[data-physical-page="3"][data-page-rendered="true"]').wait_for()
  expect(compact.get_by_role('alert')).to_have_count(0)
  field.fill('4');field.press('Escape');assert field.input_value()=='3','Escape restores committed page'
  shot('compact-page-control');return {'from':start,'to':3}
 check('Compact physical-page control stays reachable with collapsed chrome; invalid input never navigates',compact_control)

 def tree_current_row():
  btn('PDF content').click()
  p.locator('[data-node-id="node.page.atlas.pdf"] .tree-expander').first.click()
  btn('Expand PDF category Reading a PDF').click()
  # Choosing the PDF type opens the library manager surface; the tree only marks
  # a current page while a reader actually shows this PDF.
  if btn('Return to reader').count():btn('Return to reader').click()
  p.locator('.active-pane [data-page-rendered="true"] canvas').first.wait_for()
  current=p.locator('.pdf-study-page[aria-current="page"]')
  expect(current.first).to_have_attribute('data-pdf-page','3')
  compact=p.locator('.active-pane .pdf-page-compact');f=compact.get_by_label('Physical PDF page number (compact)',exact=True)
  f.fill('2');f.press('Enter');expect(current.first).to_have_attribute('data-pdf-page','2')
  shot('tree-current-row');return {'currentRows':current.count()}
 check('Study tree highlights the reader page (aria-current) and follows navigation',tree_current_row)

 def checkpoint():
  pane=p.locator('.active-pane');pane.get_by_label('PDF presentation',exact=True).select_option('continuous') if pane.get_by_label('PDF presentation',exact=True).is_visible() else None
  p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
  canvas=pane.locator('.pdf-canvas-scroll');canvas.hover()
  before=json.dumps(slot_session(persisted())['panes'])
  for _ in range(12):p.mouse.wheel(0,90);p.wait_for_timeout(30)
  p.wait_for_timeout(1500)  # coalesced checkpoint interval is 500 ms; no explicit flush here
  after=json.dumps(slot_session(persisted())['panes'])
  assert before!=after,'scroll position was not checkpointed without an explicit flush'
  return {'persistedWithoutFlush':True}
 check('Scroll checkpoints persist within the bounded interval without an explicit flush',checkpoint)

 def experience():
  gear=p.locator('.library-sidebar').get_by_role('button',name='Workspace 1 setup',exact=True);gear.click()
  panel=p.get_by_role('dialog',name='Workspace 1 — All content');expect(panel).to_be_visible()
  panel.get_by_label('Experience preset',exact=True).select_option('norsk-daily')
  expect(panel.get_by_role('button',name='Apply to Workspace 1',exact=True)).to_be_enabled()
  shot('experience-panel');panel.get_by_role('button',name='Apply to Workspace 1',exact=True).click()
  expect(panel).to_have_count(0)
  p.wait_for_function('async()=>{const a='+AGENT+';return !a.getStorageDiagnostics().saving;}')
  s=slot_session(persisted(),1);assert s['experience']['presetId']=='norsk-daily',s.get('experience')
  assert 'Cheatsheet content' not in [x.get_attribute('aria-label') for x in p.locator('.content-type-selector button').all()],'disabled type still offered'
  expect(p.locator('.active-pane .document-tab.selected .tab-outside')).to_be_visible()
  expect(p.get_by_role('button',name='Add to Experience',exact=True)).to_be_visible()
  # The rail shortcut opens the SAME panel, now labelled with the applied profile.
  p.locator('.reader-rail').get_by_role('button',name='Workspace 1 setup',exact=True).click()
  expect(p.get_by_role('dialog',name='Workspace 1 — Norsk Daily')).to_be_visible();p.keyboard.press('Escape')
  # Search defaults to This Experience.
  p.keyboard.press('Control+k');expect(p.get_by_role('button',name='This Experience (Norsk Daily)',exact=True)).to_have_attribute('aria-pressed','true');p.keyboard.press('Escape')
  # Another workspace is unaffected; reload keeps the profile.
  p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app')
  s=slot_session(persisted(),1);assert s['experience']['presetId']=='norsk-daily'
  shot('experience-applied');return {'preset':'norsk-daily'}
 check('Experience panel: one editor from two entry points, Apply persists per slot, outside tab kept, search scoped',experience)

 def cross_tab():
  q=ctx.new_page();q.goto(base,wait_until='networkidle');q.wait_for_selector('.atlas-app')
  # Tab B commits an independent personal change (a page rating) to the shared
  # durable record, exactly as another tab's completed write would leave it.
  q.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
   const tx=db.transaction('personal','readwrite'),st=tx.objectStore('personal');const cur=await new Promise(ok=>{const r=st.get('active');r.onsuccess=()=>ok(r.result);});
   cur.ratings={...cur.ratings,'page.atlas.welcome':'green'};st.put(cur,'active');await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});db.close();}""")
  q.close()
  # Tab A (stale in-memory state, never reloaded) then writes a reading checkpoint and flushes.
  p.locator('.active-pane .pdf-canvas-scroll').hover()
  for _ in range(8):p.mouse.wheel(0,120);p.wait_for_timeout(30)
  p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}')
  final=persisted()
  assert final['ratings'].get('page.atlas.welcome')=='green','stale tab overwrote the other tab’s change'
  assert slot_session(final,1)['experience']['presetId']=='norsk-daily'
  return {'otherTabRatingKept':True}
 check('Cross-tab: a stale tab’s checkpoint no longer overwrites another tab’s personal change',cross_tab)

 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-runtime','scope':'Playwright Chromium, normal origin, real IndexedDB + PDF.js; not physical device input','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
