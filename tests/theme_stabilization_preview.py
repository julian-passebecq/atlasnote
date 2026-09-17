"""Real-origin theme reproduction. No application state injection or storage suppression."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import launch,ROOT,start_server,close_panels
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v2-stabilization/theme-preview'));OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('ATLAS_BASE_URL') or start_server()
THEMES={'fluent':'Fluent Blue','neutral':'Neutral/Sage','academic':'Academic Paper','lavender':'Soft Lavender','slate':'Dark Slate'}
READ="""()=>new Promise((resolve,reject)=>{const r=indexedDB.open('knowledge-atlas');r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('Expected existing application database'));};r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('personal','readonly'),q=t.objectStore('personal').get('active');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);t.oncomplete=()=>db.close();};})"""
results=[];errors=[]
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900});p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.set_default_timeout(15000)
 def button(s):return p.get_by_role('button',name=s,exact=True)
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
  (OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def session():
  v=p.evaluate(READ);return v['session'] if v.get('activeWorkspaceSlot',1)==1 else v['workspaceSlots'][str(v['activeWorkspaceSlot'])]
 def css(selector):return p.locator(selector).first.evaluate('(e)=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})')
 def start():
  p.goto(BASE.rstrip('/')+'/#/page/page.atlas.welcome',wait_until='networkidle');expect(p.locator('.atlas-app')).to_be_visible();expect(p.locator('.active-pane')).to_be_visible();return {'origin':BASE,'injectedState':False}
 check('Live preview loads the production reader',start)
 colors={}
 for theme,label in THEMES.items():
  def change(theme=theme,label=label):
   close_panels(p);before=session();button('Theme').click();button(label).click();expect(p.locator('html')).to_have_attribute('data-theme',theme)
   p.wait_for_function("async theme=>{const r=indexedDB.open('knowledge-atlas');const d=await new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});const q=d.transaction('personal').objectStore('personal').get('active');const v=await new Promise(res=>q.onsuccess=()=>res(q.result));d.close();const s=(v.activeWorkspaceSlot??1)===1?v.session:v.workspaceSlots[v.activeWorkspaceSlot];return s.theme===theme;}",arg=theme)
   after=session();before['theme']=theme;assert before==after,{'before':before,'after':after};colors[theme]=css('.reader-rail')
   p.reload(wait_until='networkidle');expect(p.locator('html')).to_have_attribute('data-theme',theme);assert session()==after,'Reload changed the saved reading session';return colors[theme]
  check('Theme '+theme+' changes only theme, and survives real-origin reload',change)
 def unique():assert len({json.dumps(v,sort_keys=True) for v in colors.values()})==5,colors;return colors
 check('Five themes have distinct computed surface/color pairs',unique)
 def surfaces():
  # Leave Dark Slate selected and visit actual application surfaces.
  observed={}
  button('Open Dashboard').click();expect(p.locator('.dashboard-page')).to_be_visible();observed['dashboard']=css('.dashboard-page');p.screenshot(path=str(OUT/'slate-dashboard.png'))
  for label in ['PDF','Cheatsheet','Article','QCM']:
   button(label+' content').click();expect(p.locator('.library-management')).to_be_visible();observed[label]=css('.library-management')
  button('Quick Capture').first.click();expect(p.locator('dialog[open]')).to_be_visible();observed['capture']=css('dialog[open]');p.screenshot(path=str(OUT/'slate-capture.png'))
  p.locator('dialog').get_by_role('button',name='Article',exact=True).click();expect(p.locator('.hub-editor')).to_be_visible();observed['article-modal']=css('dialog[open]');close_panels(p)
  button('Workspace States').click();observed['saved-states']=css('.workspace-states-panel');close_panels(p)
  button('Open context panel').click();observed['context']=css('.context-drawer');close_panels(p)
  for name,style in observed.items():assert style['background'] not in ['rgb(255, 255, 255)','rgb(250, 250, 250)'],(name,style)
  p.set_viewport_size({'width':390,'height':844});button('Open Dashboard').click();expect(p.locator('.dashboard-page')).to_be_visible();assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1;p.screenshot(path=str(OUT/'slate-mobile.png'));return observed
 check('Dark Slate across Dashboard, four libraries, capture, article, Context, states and mobile',surfaces)
 check('No unhandled browser exceptions',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'base':BASE,'scope':'Unmodified production entry and real IndexedDB on hosted/HTTP origin','checks':results,'errors':errors,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)};(OUT/'results.json').write_text(json.dumps(report,indent=2));b.close()
raise SystemExit(1 if report['failed'] else 0)
