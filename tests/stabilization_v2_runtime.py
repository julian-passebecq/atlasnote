"""Normal-origin V2 stabilization: real production entry, IndexedDB and reload.
No test store, state injection, route interception or storage suppression.
Run against local dist by default, or ATLAS_BASE_URL for an explicitly chosen preview.
"""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,close_panels,choose_library_resource
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v2-stabilization/runtime'));OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('ATLAS_BASE_URL') or start_server()
THEMES={'fluent':'Fluent Blue','neutral':'Neutral/Sage','academic':'Academic Paper','lavender':'Soft Lavender','slate':'Dark Slate'}
READ="""()=>new Promise((resolve,reject)=>{const q=indexedDB.open('knowledge-atlas');q.onupgradeneeded=()=>{q.transaction.abort();reject(Error('Application database absent'));};q.onerror=()=>reject(q.error);q.onsuccess=()=>{const d=q.result,t=d.transaction(['personal','overlays'],'readonly'),a=t.objectStore('personal').get('active'),b=t.objectStore('overlays').get('active');t.oncomplete=()=>{d.close();resolve({personal:a.result,overlays:b.result});};t.onerror=()=>{d.close();reject(t.error);};};})"""
checks=[];errors=[];colors={}
with sync_playwright() as pw:
 browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
 def button(s,area=None):return (area if area is not None else page).get_by_role('button',name=s,exact=True)
 def state():return page.evaluate(READ)
 def session():
  v=state()['personal'];return v['session'] if v.get('activeWorkspaceSlot',1)==1 else v['workspaceSlots'][str(v['activeWorkspaceSlot'])]
 def check(name,fn):
  try:detail=fn();checks.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:checks.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();page.screenshot(path=str(OUT/('failure-'+str(len(checks))+'.png')))
  (OUT/'partial-results.json').write_text(json.dumps(checks,indent=2))
 try:
  page.goto(BASE.rstrip('/')+'/#/page/page.atlas.welcome',wait_until='networkidle');expect(page.locator('.active-pane')).to_be_visible();state()
 except Exception as e:
  blocked='ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) or 'ERR_PROXY_CONNECTION_FAILED' in str(e)
  report={'base':BASE,'scope':'Unmodified production entry and actual IndexedDB','status':'BLOCKED' if blocked else 'FAIL','passed':0,'error':str(e),'pending':['five theme changes and reload','demo persistence','capture draft return and cancel','JSON edit reload','Dashboard reader restoration','safe demo cleanup after reload']};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));browser.close();raise SystemExit(2 if blocked else 1)
 for theme,label in THEMES.items():
  def change(theme=theme,label=label):
   close_panels(page);before=session();button('Theme').click();button(label).click();expect(page.locator('html')).to_have_attribute('data-theme',theme)
   page.wait_for_function("async theme=>{const v=await ("+READ+")();const s=(v.personal.activeWorkspaceSlot??1)===1?v.personal.session:v.personal.workspaceSlots[v.personal.activeWorkspaceSlot];return s.theme===theme;}",arg=theme)
   after=session();before['theme']=theme;assert before==after,{'before':before,'after':after};colors[theme]=page.locator('.reader-rail').evaluate('(e)=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color})');page.reload(wait_until='networkidle');expect(page.locator('html')).to_have_attribute('data-theme',theme);assert session()==after;return colors[theme]
  check('Theme '+theme+' preserves reading state and survives actual reload',change)
 def demo():
  button('Open Dashboard').click();expect(page.locator('.dashboard-mini-table table')).to_have_count(5);page.locator('.demo-controls>summary').click();button('Load demo data').click();expect(page.locator('.dashboard-data-row')).not_to_have_count(0)
  page.wait_for_function("async()=>{const v=await ("+READ+")();return !!v.overlays?.pages?.['demo.v2.article.sql'];}");before=state();page.reload(wait_until='networkidle');expect(page.locator('.dashboard-mini-table table')).to_have_count(5);after=state();assert before['overlays']==after['overlays'];assert before['personal']['dashboardItems']==after['personal']['dashboardItems'];assert before['personal']['knowledge']==after['personal']['knowledge']
 check('Demo sources, captures and concepts persist together on real IndexedDB',demo)
 def draft():
  before=state();button('Quick Capture',page.locator('.sidebar-navigation')).click();expect(page.locator('.capture-row')).to_have_count(3);button('Task',page.locator('dialog')).click();page.get_by_label('Capture text 1').fill('Unsaved draft');page.get_by_label('Task due 1').fill('2026-10-01');button('Article',page.locator('dialog')).click();button('Back to Quick Capture').click();expect(page.get_by_label('Capture text 1')).to_have_value('Unsaved draft');expect(page.get_by_label('Task due 1')).to_have_value('2026-10-01');button('Cancel',page.locator('dialog')).click();assert state()==before
 check('Uncommitted capture draft returns intact; Cancel performs no persistent write',draft)
 def json_edit():
  button('Article content').click();choose_library_resource(page,'demo.v2.article.sql');button('JSON').click();value=json.loads(page.get_by_label('Resource source JSON').input_value());value['title']='Retained article after reload';page.get_by_label('Resource source JSON').fill(json.dumps(value));button('Apply validated JSON').click();page.wait_for_function("async()=>{const v=await ("+READ+")();return v.overlays?.pages?.['demo.v2.article.sql']?.page?.title==='Retained article after reload';}");before=state();page.reload(wait_until='networkidle');after=state();assert before['overlays']==after['overlays'];assert after['overlays']['pages']['demo.v2.article.sql']['page']['title']==value['title']
 check('Validated canonical Article JSON edit survives normal-origin reload',json_edit)
 def cleanup():
  button('Open Dashboard').click();expect(page.locator('.demo-controls')).to_be_visible();page.locator('.demo-controls>summary').click();page.once('dialog',lambda d:d.accept());button('Reset/remove demo data').click();page.wait_for_function("async()=>{const v=await ("+READ+")();return !v.overlays?.pages?.['demo.v2.article.pipeline'];}");page.reload(wait_until='networkidle');assert state()['overlays']['pages']['demo.v2.article.sql']['page']['title']=='Retained article after reload'
 check('Demo cleanup after reload retains the user-edited Article',cleanup)
 check('Five visually distinct themes and no browser exceptions',lambda:None if len({json.dumps(v,sort_keys=True) for v in colors.values()})==5 and not errors else (_ for _ in ()).throw(AssertionError({'colors':colors,'errors':errors})))
 report={'base':BASE,'scope':'Unmodified production entry, actual IndexedDB, real reload','checks':checks,'passed':sum(x['status']=='PASS' for x in checks),'failed':sum(x['status']=='FAIL' for x in checks),'errors':errors};(OUT/'results.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(1 if report['failed'] else 0)
