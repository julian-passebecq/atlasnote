from browser_support import state_action,open_context
from browser_support import bookmark_position,open_saved_manager,inspect_pdf_term,show_reader_controls
"""Real browser UI with in-memory state on about:blank. NOT IndexedDB evidence."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,mount_dom,close_panels,open_context,open_settings
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.3/ui'));OUT.mkdir(parents=True,exist_ok=True)
results=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
 browser=launch(pw);p=browser.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(6000)
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base,controls_visible=False)
 def state():return p.evaluate('structuredClone(testStore.state.personal)')
 def session():return p.evaluate('testStore.state.personal.activeWorkspaceSlot===1?testStore.state.personal.session:testStore.state.personal.workspaceSlots[testStore.state.personal.activeWorkspaceSlot]')
 def reset(pdf=False):
  close_panels(p);p.set_viewport_size({'width':1440,'height':900});p.evaluate('(pdf)=>{testReset(pdf?"page.atlas.pdf":"page.atlas.layouts");if(pdf)testStore.personal(p=>{p.session.libraryMode="pdfs"});}',pdf);p.wait_for_timeout(200)
 def button(label):return p.get_by_role('button',name=label,exact=True)
 def search(title):
  close_panels(p);p.keyboard.press('Control+k');p.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(200)
 def check(name,fn):
  try:
   detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:
   results.append({'name':name,'status':'FAIL','error':str(e)});print('FAIL',name,str(e),flush=True);traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
 def chrome():
  reset();assert p.locator('.topbar').count()==0;assert button('Hide global topbar').count()==0;assert p.locator('.sidebar-heading').inner_text().strip()==''
  nav=p.locator('.sidebar-navigation button').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))');assert nav==['Collapse notebook sidebar','Global search','Back in active tab','Forward in active tab','Quick Capture','Open Dashboard','Compare in two panes'],nav
  names=p.locator('.reader-rail>button').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))');assert names[:5]==['Enter focus mode','Open context panel','Open bookmarks','Open read later','Export to AI'],names
  classes=p.locator('.pane-tabbar').evaluate('(e)=>[...e.children].slice(0,4).map(x=>x.className)');assert len(classes)==4 and 'pane-new-tab' in classes[0] and classes[1]=='tab-list' and classes[2]=='pane-header-actions' and 'pane-chrome-toggle' in classes[3],classes
  assert p.locator('.pane-tabbar .pane-header-actions').get_by_role('button',name='Quick Book mode',exact=True).is_visible();assert p.locator('.pane-tabbar .pane-header-actions').get_by_role('button',name='Reading mode',exact=True).is_visible()
  assert p.locator('.workspace-dock').get_by_role('button',name='Workspace States',exact=True).is_visible()
  assert p.locator('.reader-chrome-hidden').count()==1;assert not p.locator('.pane-breadcrumb').is_visible()
  button('Show reader controls').click();assert p.locator('.pane-breadcrumb').is_visible();assert session()['panes'][0]['readerChromeCollapsed']==False
  button('Hide reader controls').click();assert session()['panes'][0]['readerChromeCollapsed']==True
  open_saved_manager(p);assert p.locator('.state-quick-actions button').count()==4;close_panels(p)
  p.screenshot(path=str(OUT/'compact-note-reader.png'));return {'navigation':nav,'rightRailStart':names[:4],'paneControlOrder':classes}
 check('No global topbar; exact navigation/rail order; persistent header shortcuts beside toolbar toggle',chrome)
 def side():
  reset();button('Collapse notebook sidebar').click();assert p.locator('.library-sidebar').count()==0;assert p.locator('.navigation-dock').is_visible();button('Global search').click();assert p.locator('dialog[open]').count()==1;p.keyboard.press('Escape');button('Open notebook sidebar').click();assert p.locator('.library-sidebar').is_visible()
 check('Search and history controls remain reachable with the sidebar collapsed',side)
 def compare():
  reset();before=session()['panes'][0];button('Compare in two panes').click();assert session()['panes'][0]==before;assert session()['panes'][1]['views']==[]
  for index,pane in enumerate(p.locator('.document-pane').all()):
   names=pane.locator('.pane-tabbar').evaluate('(e)=>[...e.children].map(x=>x.className)');assert 'pane-identity' in names[0] and 'pane-new-tab' in names[1] and names[2]=='tab-list',names
   # V2 keeps contextual shortcuts in this header even when details are hidden.
   # The second pane is genuinely empty and must not pretend to own book modes.
   if index==0:assert names[3]=='pane-header-actions' and 'pane-chrome-toggle' in names[4] and len(names)==6,names
   else:assert 'pane-chrome-toggle' in names[3] and len(names)==5,names
  button('Swap panes').click();assert session()['panes'][1]==before
 check('Compare and swap in the compact navigation, preserving independent panes',compare)
 def tree():
  reset(True);row=p.locator('[data-node-id="node.page.atlas.pdf"]');row.locator('.tree-target').click();assert p.locator('.pdf-study-tree').count()==0
  row.locator('.tree-expander').click();root=p.locator('.pdf-study-tree');assert root.is_visible();assert button('Expand PDF category Reading a PDF').is_visible();assert button('Expand PDF category Layouts and navigation').count()==0;assert p.locator('.pdf-companion').count()==0
  button('Expand PDF category Reading a PDF').click();assert button('Expand PDF category Layouts and navigation').count()==0;assert root.locator('.pdf-study-page').count()>0;assert root.locator('.pdf-study-term').count()==0
  button('Go to PDF page 4 in Reader fixture: five physical pages').click() if button('Go to PDF page 4 in Reader fixture: five physical pages').count() else root.locator('.pdf-study-page .tree-target').filter(has_text='Links, page state and notes').click()
  assert session()['panes'][0]['views'][0]['history'][0]['pdfPage']==4
  inspect_pdf_term(p,'Physical page');assert p.locator('dialog[open]').is_visible();assert 'PDF' in p.locator('dialog').inner_text();p.keyboard.press('Escape')
  p.screenshot(path=str(OUT/'sidebar-pdf-study-tree.png'));return {'readerCompanionPanels':0,'physicalPageState':4,'categoriesCollapsedByDefault':True}
 check('PDF title opens without expanding; flat category/page links and on-demand definitions',tree)
 def workspace_save():
  reset();expected=session();state_action(p,'Save current workspace state');p.wait_for_timeout(250);assert len(state()['savedStates']['entries'])==1
  search('Read in Norwegian, keep English nearby');assert session()!=expected
  state_action(p,'Restore last workspace save');p.wait_for_timeout(400);assert session()==expected
  assert len(state()['savedStates']['entries'])==1;assert '1' in state()['savedStates']['safety']
  open_saved_manager(p);button('Undo last restore').click();p.wait_for_timeout(300);assert session()!=expected
  state_action(p,'Restore last workspace save');p.wait_for_timeout(250);assert session()==expected
 check('One-click workspace save, last restore and automatic undo point work through real buttons',workspace_save)
 def manager():
  reset();state_action(p,'Save current workspace state');p.wait_for_timeout(150);open_saved_manager(p);button('Rename / note').click();p.get_by_role('textbox',name='Save title',exact=True).fill('Spark - after chapter 2');p.get_by_role('textbox',name='Progress / next step',exact=True).fill('Next: deployment modes.\nKeep going tomorrow.');button('Save details').click();p.wait_for_timeout(200)
  assert state()['savedStates']['entries'][0]['title']=='Spark - after chapter 2';assert 'Keep going tomorrow.' in state()['savedStates']['entries'][0]['note'];assert len(state()['savedStates']['history'])==2
  p.screenshot(path=str(OUT/'saved-state-manager.png'));button('Delete').click();button('Cancel').click();assert len(state()['savedStates']['entries'])==1;button('Delete').click();button('Confirm delete').click();p.wait_for_timeout(200);assert len(state()['savedStates']['entries'])==0
 check('Small manager supports scope tabs, rename, progress note, history and confirmed deletion',manager)
 def allsave():
  reset();state_action(p,'Save all workspace states');p.wait_for_timeout(150);expected=state()['savedStates']['entries'][0]
  button('Workspace 2').click();p.wait_for_timeout(150);search('Read in Norwegian, keep English nearby');other=session();state_action(p,'Save current workspace state');p.wait_for_timeout(150)
  state_action(p,'Restore last all-workspaces save');p.wait_for_timeout(350);out=state();assert out['activeWorkspaceSlot']==expected['activeWorkspaceSlot'];assert out['session']==expected['session'];assert out['workspaceSlots']==expected['workspaceSlots'];assert len(out['savedStates']['entries'])==2
  open_saved_manager(p);p.get_by_role('tab',name='All workspaces saves',exact=True).click();button('Undo last restore').click();p.wait_for_timeout(300);assert state()['activeWorkspaceSlot']==2;assert session()==other
 check('All-workspace last restore and undo restore the active slot without removing manual saves',allsave)
 def isolated():
  reset();state_action(p,'Save current workspace state');p.wait_for_timeout(150);one=session();button('Workspace 2').click();p.wait_for_timeout(150);search('Read in Norwegian, keep English nearby');two=session();open_saved_manager(p);p.get_by_role('tab',name='Workspace 1 saves',exact=True).click();button('Restore').click();p.wait_for_timeout(250);assert state()['activeWorkspaceSlot']==1;assert session()==one;assert state()['workspaceSlots']['2']==two
 check('Restoring Workspace 1 from the manager preserves Workspace 2 exactly',isolated)
 def responsive():
  reset();rows=[]
  for w,h in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(300);assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   for name in ['Enter focus mode','Compare in two panes','Open context panel','Workspace States']:
    rect=button(name).bounding_box();assert rect and rect['x']>=0 and rect['x']+rect['width']<=w+1 and rect['y']>=0 and rect['y']+rect['height']<=h,(w,name,rect)
   rows.append({'width':w,'height':h,'rail':p.locator('.reader-rail').bounding_box()});p.screenshot(path=str(OUT/('responsive-'+str(w)+'.png')))
  return rows
 check('New buttons and save manager entry stay on-screen at desktop and phone widths',responsive)
 check('No uncaught JavaScript errors',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':'Actual browser DOM and production actions with in-memory state on about:blank. Not persistence or integrated PDF certification.','checks':results,'errors':errors,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results)}
 (OUT/'results.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(1 if report['failed'] else 0)
