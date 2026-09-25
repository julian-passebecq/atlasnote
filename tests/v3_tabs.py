"""V3 cross-tab invalidation on the integrated build: two tabs, one profile, real
IndexedDB and BroadcastChannel. Personal changes from another tab are adopted live
through the 3-way merge without moving the displayed workspace; a content/history
commit elsewhere raises a reload notice instead of silently diverging."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/tabs'));OUT.mkdir(parents=True,exist_ok=True)
READY='async()=>{const d=('+AGENT+').getStorageDiagnostics();return d.ready!==false&&d.initialized&&!d.saving;}'
def navigate(page,key):page.evaluate('async(k)=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource(k).target,"here")}',key)
results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900});errors=[]
 A=ctx.new_page();A.on('pageerror',lambda e:errors.append('A:'+str(e)));A.goto(base,wait_until='networkidle');A.wait_for_function(READY)
 B=ctx.new_page();B.on('pageerror',lambda e:errors.append('B:'+str(e)));B.goto(base,wait_until='networkidle');B.wait_for_function(READY)
 def btn(p,name):return p.get_by_role('button',name=name,exact=True)
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();A.screenshot(path=str(OUT/('failure-A-'+str(len(results))+'.png')));B.screenshot(path=str(OUT/('failure-B-'+str(len(results))+'.png')))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def displayed_workspace_kept():
  A.bring_to_front();navigate(A,'notebook-page:page.atlas.welcome');expect(A.locator('.active-pane h1').first).to_be_visible();title=A.locator('.active-pane h1').first.inner_text()
  A.wait_for_function(READY)
  B.bring_to_front();navigate(B,'pdf:doc.atlas.pdf');B.wait_for_function(READY);B.wait_for_timeout(800)
  A.bring_to_front();A.wait_for_timeout(300)
  assert A.locator('.active-pane h1').first.inner_text()==title,'the other tab moved this tab’s reader'
  return {'keptTitle':title}
 check('Another tab’s navigation never moves the reader this tab is displaying',displayed_workspace_kept)
 def live_personal():
  B.bring_to_front();btn(B,'Open bookmarks').click();btn(B,'Bookmark current position').click();B.wait_for_function(READY);B.wait_for_timeout(800)
  A.bring_to_front();btn(A,'Open bookmarks').click();expect(A.locator('.reading-item')).to_have_count(1)
  return {'bookmarkVisibleInOtherTabWithoutReload':True}
 check('A bookmark saved in one tab appears live in the other (merged, not overwritten)',live_personal)
 def content_notice():
  B.bring_to_front()
  B.evaluate('''async()=>{const api='''+AGENT+''';const r=api.getResource('notebook-page:page.atlas.welcome');const s=structuredClone(r.snapshot);s.page.blocks.push({id:s.page.id+'.tabs',type:'markdown',text:'Changed in another tab.'});
   const plan={schemaVersion:1,kind:'atlas-agent-changeset',id:'plan.v3.tabs.'+Date.now(),source:'Synthetic QA; explicit human decision',createdAt:Date.now(),operations:[{id:'operation.tabs.1',kind:'resource.update',resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:s}}]};
   await api.stage(plan);await api.accept(plan.id);}''')
  A.bring_to_front();expect(A.locator('.tab-sync-banner')).to_contain_text('Another tab changed your library')
  expect(A.locator('.tab-sync-banner').get_by_role('button',name='Reload',exact=True)).to_be_visible()
  A.screenshot(path=str(OUT/'reload-notice.png'));return {}
 check('A content commit in another tab raises a reload notice',content_notice)
 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-tabs','scope':'Playwright Chromium, integrated build, two tabs of one profile','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
