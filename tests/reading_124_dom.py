from browser_support import state_action,open_context
"""1.2.4 real compiled UI interactions; intentionally in-memory, NOT IndexedDB."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom,close_panels,open_saved_manager
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.4/reading-ui'));OUT.mkdir(parents=True,exist_ok=True)
results=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(7000);errors=[];requests=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url));mount_dom(p,base,controls_visible=False)
 def btn(name):return p.get_by_role('button',name=name,exact=True)
 def data():return p.evaluate('structuredClone(testStore.state.personal)')
 def session(n=None):
  v=data();n=n or v.get('activeWorkspaceSlot',1);return v['session'] if n==1 else v['workspaceSlots'][str(n)]
 def reset(pdf=False):
  close_panels(p);p.set_viewport_size({'width':1440,'height':900});p.evaluate('(pdf)=>{testReset(pdf?"page.atlas.pdf":"page.atlas.language");if(pdf)testStore.personal(p=>{p.session.libraryMode="pdfs"});}',pdf);p.wait_for_timeout(150)
 def settle():p.wait_for_timeout(160)
 def shot(n):p.screenshot(path=str(OUT/(n+'.png')))
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def category(name):p.locator('.category-tabs').get_by_role('tab',name=name,exact=True).click()
 def tree():
  p.locator('[data-node-id="node.page.atlas.pdf"] .tree-expander').click();btn('Expand PDF category Reading a PDF').click();return p.locator('.pdf-study-tree')
 def row(n):return p.locator(f'.pdf-study-page[data-pdf-page="{n}"]').first
 def action(n,name):row(n).locator('.study-actions').click();p.get_by_role('menuitem',name=name,exact=True).click();settle()
 def nav():
  reset();names=p.locator('.sidebar-navigation button').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')
  assert names==['Collapse notebook sidebar','Global search','Back in active tab','Forward in active tab','Quick Capture','Open Dashboard','Compare in two panes'],names
  assert p.locator('.reader-chrome-hidden').count()==1 and p.locator('.pane-chrome-toggle').count()==1
  labels=p.locator('.reader-rail > button').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')
  assert labels==['Enter focus mode','Open context panel','Open bookmarks','Open read later','Export to AI','Theme','More / Settings'],labels
  btn('Show reader controls').click();assert session()['panes'][0]['readerChromeCollapsed']==False
  btn('Hide reader controls').click();assert session()['panes'][0]['readerChromeCollapsed']==True
  btn('Collapse notebook sidebar').click();assert btn('Global search').is_visible() and btn('Show reader controls').is_visible();btn('Open notebook sidebar').click();shot('paired-navigation');return {'navigation':names,'rail':labels}
 check('Shared top-left controls and paired rail order; new readers hidden by default',nav)
 def bookmark():
  reset();btn('Open bookmarks').click();assert p.locator('.category-tabs [role=tab]').all_text_contents()==['All','IT','Cloud','Job','KPI','Norsk']
  btn('Bookmark current position').click();expect(p.locator('.reading-item')).to_have_count(1);btn('Edit').click();p.get_by_label('Reading item title',exact=True).fill('Norwegian review');p.get_by_label('Reading item note',exact=True).fill('Resume the language example');p.get_by_label('Reading item category',exact=True).select_option('norsk');btn('Save reading details').click();settle()
  category('Cloud');expect(p.locator('.reading-item')).to_have_count(0);category('Norsk');expect(p.locator('.reading-item')).to_have_count(1);assert data()['bookmarks'][0]['category']=='norsk';shot('bookmarks')
  close_panels(p);btn('Workspace 3').click();btn('Open bookmarks').click();category('Norsk');expect(p.locator('.reading-item')).to_have_count(1);assert data()['bookmarks'][0]['title']=='Norwegian review'
 check('Bookmarks edit title, note and subject; lists are shared rather than workspace-scoped',bookmark)
 def urls():
  reset();btn('Open read later').click();category('Cloud');field=p.get_by_label('Web address to read later',exact=True)
  field.fill('javascript:alert(1)');btn('Add web address to Read later').click();expect(p.locator('.reading-manager [role=alert]')).to_be_visible();assert not data().get('readLater')
  field.fill('https://example.org/learn?source=atlas');btn('Add web address to Read later').click();expect(p.locator('.reading-item')).to_have_count(1);assert data()['readLater'][0]['category']=='cloud';assert not any('example.org' in x for x in requests)
  anchor=p.locator('.reading-item-heading a');assert anchor.get_attribute('rel')=='noopener noreferrer' and anchor.get_attribute('referrerpolicy')=='no-referrer';btn('Mark read').click();settle();p.get_by_label('Unread only',exact=True).check();expect(p.locator('.reading-item')).to_have_count(0);p.get_by_label('Unread only',exact=True).uncheck();btn('Mark unread').click();settle();shot('read-later-links')
  btn('Remove').click();btn('Cancel').click();assert len(data()['readLater'])==1;btn('Remove').click();btn('Confirm remove').click();expect(p.locator('.reading-item')).to_have_count(0)
 check('Safe pasted URLs, no automatic fetch, read status, subject filtering and confirmed removal',urls)
 def flat():
  reset(True);tr=tree();assert tr.locator('.pdf-study-category').count()==1;assert tr.locator('.pdf-study-term').count()==0;assert btn('Expand PDF glossary').count()==0
  assert tr.locator('.pdf-study-page').count()>=5;assert tr.locator('[data-pdf-page="2"]').count()>=2
  assert tr.locator('.pdf-study-page .tree-target span').evaluate_all('(es)=>es.every(e=>e.textContent.length<=53)')
  assert btn('Expand PDF category Layouts and navigation').count()==0;row(4).locator('.study-page-link').click();settle();v=session()['panes'][0]['views'][0];assert v['history'][v['cursor']]['pdfPage']==4;shot('flat-pdf-tree')
 check('PDF tree is only category and short page headings, with repeated page references',flat)
 def targets():
  reset(True);tree();source=session()['panes'][0]['views'][0];action(2,'Open in new tab');assert len(session()['panes'][0]['views'])==2 and session()['panes'][0]['views'][0]==source
  dest=session()['panes'][0]['views'][-1];assert dest['history'][0]['pdfPage']==2
  action(3,'Open in other pane');assert len(session()['panes'])==2;assert session()['panes'][1]['views'][0]['history'][0]['pdfPage']==3
  before=session();row(5).locator('.study-actions').click();p.get_by_role('menuitem',name='Open in workspace...',exact=True).click();p.get_by_role('menuitem',name='Open in Workspace 4',exact=True).click();settle();assert data()['activeWorkspaceSlot']==4 and session(1)==before;assert session(4)['panes'][0]['views'][0]['history'][0]['pdfPage']==5
 check('Physical PDF page actions preserve source and open a tab, second pane or numbered workspace',targets)
 def queue_targets():
  reset(True);tree();action(2,'Add to Read later');action(2,'Bookmark');btn('Actions for PDF category Reading a PDF').click();p.get_by_role('menuitem',name='Add to Read later',exact=True).click();settle();assert {e['target']['kind'] for e in data()['readLater']}=={'pdf-page','pdf-category'}
  close_panels(p);p.locator('[data-node-id="node.page.atlas.pdf"] .tree-target').click(button='right');p.get_by_role('menuitem',name='Add to Read later',exact=True).click();settle();assert any(e['target']['kind']=='page' for e in data()['readLater']);btn('Open read later').click();shot('pdf-reading-queue')
  close_panels(p);btn('Actions for PDF category Reading a PDF').click();p.get_by_role('menuitem',name='Bookmark',exact=True).click();settle();assert len(data()['bookmarks'])==2
  p.locator('[data-node-id="node.page.atlas.pdf"] .tree-target').click(button='right');p.get_by_role('menuitem',name='Bookmark',exact=True).click();settle();assert len(data()['bookmarks'])==3
  p.locator('[data-node-id="node.page.atlas.pdf"] .tree-target').click(button='right');p.get_by_role('menuitem',name='Bookmark',exact=True).click();settle();assert len(data()['bookmarks'])==2;assert any(e.get('target',{}).get('kind')=='pdf-category' for e in data()['bookmarks'])
 check('Queue can distinguish whole PDFs, physical pages and PDF categories; bookmarks separate',queue_targets)
 def cap():
  reset(True);tree()
  for n in range(4):action(2,'Open in new tab')
  before=session();action(3,'Open in new tab');assert session()==before;expect(p.locator('.toast.error')).to_be_visible()
 check('Full pane refuses a sixth tab without losing or replacing existing work',cap)
 def state_managers():
  reset();state_action(p,'Save current workspace state');settle();saved=session();btn('Open read later').click();btn('Read current item later').click();settle();queue=data()['readLater'];close_panels(p)
  btn('Workspace 2').click();state_action(p,'Save all workspace states');settle();open_saved_manager(p);assert p.locator('.save-scope-tabs [role=tab]').all_text_contents()==['1','2','3','4','5','All'];p.get_by_role('tab',name='Workspace 1 saves',exact=True).click();btn('Rename / note').click();p.get_by_label('Save title',exact=True).fill('Start of language review');btn('Save details').click();settle();btn('Restore').click();settle();assert session(1)==saved and data()['readLater']==queue
  open_saved_manager(p,True);assert p.get_by_role('tab',name='All workspaces saves',exact=True).get_attribute('aria-selected')=='true';assert len(data()['savedStates']['entries'])==2;shot('workspace-states-panel');open_context(p,'Remarks');assert p.locator('.remarks-input').count()==1
 check('Separate Workspace States and document Context; checkpoint restore retains newer queue',state_managers)
 def keyboard():
  reset(True);tree();r=row(2);r.locator('.tree-target').click(button='right');expect(p.get_by_role('menu')).to_be_visible();p.keyboard.press('End');assert p.evaluate('document.activeElement.textContent').strip()=='Bookmark';p.keyboard.press('Escape');assert not p.get_by_role('menu').count()
  btn('Open read later').click();category('All');p.locator('.category-tabs').get_by_role('tab',name='All',exact=True).focus();p.keyboard.press('ArrowRight');assert p.locator('.category-tabs [aria-selected=true]').inner_text()=='IT';p.keyboard.press('End');assert p.locator('.category-tabs [aria-selected=true]').inner_text()=='Norsk'
 check('Page context menu and subject tabs are keyboard-operable',keyboard)
 def responsive():
  reset();rows=[]
  for w,h in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   close_panels(p);p.set_viewport_size({'width':w,'height':h});btn('Open read later').click();settle();assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   box=p.locator('.manager-drawer').bounding_box();assert box and box['x']>=0 and box['x']+box['width']<=w+1 and box['y']>=0 and box['y']+box['height']<=h+1,(w,box)
   for n in ['Open read later','Workspace States','More / Settings']:
    rect=btn(n).bounding_box();assert rect['x']>=0 and rect['y']>=0 and rect['y']+rect['height']<=h+1,(w,n,rect)
   rows.append({'width':w,'drawer':box});shot('manager-'+str(w))
  return rows
 check('Manager and paired actions fit desktop and phone without viewport overflow',responsive)
 check('No unhandled UI errors',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':'Compiled application in Chromium with in-memory store; not IndexedDB or deployment certification','checks':results,'errors':errors,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results)};(OUT/'results.json').write_text(json.dumps(report,indent=2));b.close()
raise SystemExit(1 if report['failed'] else 0)
