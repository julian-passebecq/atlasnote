"""V2 stabilization UI regression and screenshots.
Compiled application on the inherited in-memory DOM harness. Not durable-storage
or hosted-origin certification. All mutations under test use actual visible UI.
"""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom,close_panels,open_context,open_article_advanced,choose_library_resource
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v2-stabilization/ui'));OUT.mkdir(parents=True,exist_ok=True)
results=[];errors=[];base=start_server(dom_only=True)
SOURCES={'PDF':'page.atlas.pdf','Cheatsheet':'page.cheatsheet.pyspark-execution','Article':'demo.v2.article.sql','QCM':'demo.v2.qcm.spark'}
MIME='application/x-atlas-resource'
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(6500);p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base)
 def state():return p.evaluate('JSON.parse(JSON.stringify(testStore.state))')
 def session():
  v=state()['personal'];return v['session'] if v.get('activeWorkspaceSlot',1)==1 else v['workspaceSlots'][str(v['activeWorkspaceSlot'])]
 def button(name,area=None):return (area if area is not None else p).get_by_role('button',name=name,exact=True)
 def click(name,area=None):
  if name.endswith(' content') and not button(name,area).count():button('Open notebook sidebar').click()
  button(name,area).click();p.wait_for_timeout(70)
 def shot(name):
  if not name.startswith('failure'):
   if 'dashboard' in name and p.locator('.dashboard-page').count():p.locator('.dashboard-page').evaluate('(e)=>e.scrollTop=0')
  p.screenshot(path=str(OUT/(name+'.png')))
 def check(name,fn):
  try:d=fn();results.append({'name':name,'status':'PASS','detail':d});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)));close_panels(p)
  (OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def reset():
  close_panels(p);p.set_viewport_size({'width':1440,'height':900});p.evaluate('testReset()');expect(p.locator('.active-pane')).to_be_visible()
 def dashboard():
  close_panels(p)
  if not p.locator('.dashboard-page').count():click('Open Dashboard',p.locator('.sidebar-navigation'))
  expect(p.locator('.dashboard-page')).to_be_visible()
 def demo():
  dashboard();d=p.locator('.demo-controls')
  if d.get_attribute('open') is None:d.locator('summary').click()
  click('Load demo data');expect(p.locator('.dashboard-data-row')).not_to_have_count(0)
 def capture():close_panels(p);click('Quick Capture',p.locator('.sidebar-navigation'));expect(p.locator('.capture-rows')).to_be_visible()
 def search(title):
  close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();expect(p.locator('.active-pane')).to_be_visible()
 def layout():
  reset();labels=p.locator('.sidebar-navigation>button').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))');assert len(labels)==7,labels;assert labels[1:]==['Global search','Back in active tab','Forward in active tab','Quick Capture','Open Dashboard','Compare in two panes'],labels
  rail=p.locator('.reader-rail');rs=rail.locator(':scope>button').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))');assert rs==['Enter focus mode','Open context panel','Open bookmarks','Open read later','Version History','Export to AI','Theme','More / Settings'],rs
  assert rail.get_by_role('button',name='Quick Capture',exact=True).count()==0;assert rail.get_by_role('button',name='Open Dashboard',exact=True).count()==0
  dock=rail.locator('.workspace-dock');assert dock.locator(':scope>button').first.get_attribute('aria-label')=='Open an empty workspace';assert p.locator('.pane-identity').count()==0;return {'ribbon':labels,'rail':rs}
 check('Exact ribbon/rail ownership, workspace plus ordering, single-pane identity',layout)
 def empty_tables():
  before=state();dashboard();expect(p.locator('.dashboard-mini-table table')).to_have_count(5);assert p.locator('[data-empty-slot=true]').count()==15;assert all(x==3 for x in p.locator('.dashboard-mini-table tbody').evaluate_all('(es)=>es.map(e=>e.rows.length)'));after=state();assert before['overlays']==after['overlays'];assert before['personal'].get('dashboardItems')==after['personal'].get('dashboardItems');assert before['personal']['bookmarks']==after['personal']['bookmarks'];shot('dashboard-empty')
 check('Five independent compact tables have three empty UI rows without fake records',empty_tables)
 def toggle():
  click('Open Dashboard',p.locator('.sidebar-navigation'));expect(p.locator('.active-pane')).to_be_visible();click('Compare in two panes');search('Transform then inspect');before=session();dashboard();click('Open Dashboard',p.locator('.sidebar-navigation'));expect(p.locator('.document-pane')).to_have_count(2);after=session();assert before['panes']==after['panes'];assert before['activePane']==after['activePane'];assert before['ratio']==after['ratio'];assert button('Compare in two panes').get_attribute('aria-pressed')=='true';shot('dashboard-return-compare')
 check('Dashboard second-click returns both readers with exact panes, tabs and histories',toggle)
 def plus_workflows():
  reset();dashboard()
  for row,mode in [('Inbox','Link'),('To-do','Task'),('Quick notes','Note')]:
   p.get_by_role('region',name=row+' table',exact=True).get_by_role('button',name='Add to '+row,exact=True).first.click()
   expect(p.locator('.capture-row')).to_have_count(3);assert button(mode,p.locator('dialog')).get_attribute('aria-pressed')=='true';click('Cancel',p.locator('dialog'))
  for row,kind in [('Bookmarks','bookmark'),('Read later','Read later item')]:
   before=state()['personal'];p.locator('.dashboard-mini-table').filter(has=p.get_by_role('heading',name=row,exact=False)).get_by_role('button',name='Add to '+row,exact=True).first.click();p.get_by_label('Typed resource destination',exact=True).select_option('page:page.atlas.welcome');p.get_by_label('Saved reading title').fill('User '+row);click('Save '+kind,p.locator('dialog'));after=state()['personal'];key='bookmarks' if row=='Bookmarks' else 'readLater';assert len(after.get(key,[]))==len(before.get(key,[]))+1;assert after.get('dashboardItems')==before.get('dashboardItems')
 check('All five Dashboard plus workflows use correct capture modes or canonical reading lists',plus_workflows)
 def capture_limits():
  capture();expect(p.locator('.capture-row')).to_have_count(3);assert all(b.is_disabled() for b in p.get_by_role('button',name='Remove capture row',exact=False).all());click('Add row');click('Add row');expect(p.locator('.capture-row')).to_have_count(5);expect(button('Add row')).to_be_disabled();click('Remove capture row 5');click('Remove capture row 4');expect(p.locator('.capture-row')).to_have_count(3);shot('capture-three');click('Note');p.get_by_label('Capture text 1').fill('User note retained independently of demo');before=len(state()['personal'].get('dashboardItems',[]));click('Save captures');assert len(state()['personal']['dashboardItems'])==before+1
 check('Capture three-row floor, five-row cap and blank-row omission',capture_limits)
 def back_flow():
  reset();capture();click('Link');p.get_by_label('Capture text 1').fill('Keep draft one');p.get_by_label('Capture URL 1').fill('https://example.com/keep');click('Task');p.get_by_label('Task due 1').fill('2026-10-01');p.get_by_label('Important row 1').check();p.get_by_label('Capture text 2').fill('Keep draft two');p.get_by_label('Classification subject',exact=True).select_option('cloud');p.get_by_label('Attach current reading context',exact=True).check();before=state();click('Article',p.locator('dialog'));expect(p.get_by_label('Title',exact=True)).to_be_visible();expect(p.get_by_label('Pasted article or transcript')).to_be_visible();expect(p.get_by_label('Publisher',exact=True)).not_to_be_visible();p.get_by_label('Title',exact=True).fill('Separate article draft');p.get_by_label('Pasted article or transcript').fill('Long-form draft body stays separate.');shot('article-content-first');click('Back to Quick Capture');expect(p.get_by_label('Capture text 1')).to_have_value('Keep draft one');expect(p.get_by_label('Capture text 2')).to_have_value('Keep draft two');expect(p.get_by_label('Task due 1')).to_have_value('2026-10-01');expect(p.get_by_label('Important row 1')).to_be_checked();expect(p.get_by_label('Classification subject',exact=True)).to_have_value('cloud');expect(p.get_by_label('Attach current reading context',exact=True)).to_be_checked();click('Link');expect(p.get_by_label('Capture URL 1')).to_have_value('https://example.com/keep');click('Transcript');expect(p.get_by_label('Pasted article or transcript')).to_have_value('Long-form draft body stays separate.');click('Back to Quick Capture');expect(p.get_by_label('Capture URL 1')).to_have_value('https://example.com/keep');click('Cancel',p.locator('dialog'));assert state()['overlays']==before['overlays'];assert state()['personal'].get('dashboardItems')==before['personal'].get('dashboardItems')
 check('Article/Transcript Back preserves all unsaved rows, hidden fields, mode, classification and context',back_flow)
 def demo_load():
  reset();demo();before=state();click('Load demo data');after=state();before.pop('generation',None);after.pop('generation',None);assert before==after,{'before':before,'after':after};pages=list(after['overlays']['pages'].values());assert sum('article'in x['page'] for x in pages)==3;assert sum('qcm'in x['page'] for x in pages)==3;items=after['personal']['dashboardItems'];assert any(x['status']=='archived' for x in items);assert any(x['status']=='done' for x in items);assert len(after['overlays']['references'])>=10;assert len(after['personal']['knowledge']['assignments'])>=5;shot('dashboard-demo');p.get_by_label('Include completed',exact=True).check();p.get_by_role('region',name='To-do table',exact=True).get_by_role('button',name='Show more',exact=False).click();assert p.locator('.dashboard-data-row.done').count()>=1
 check('Optional demo loads explained Articles/QCM, references, completed/archive data idempotently',demo_load)
 def source_row(label,id):
  click(label+' content');expect(p.locator('.library-management')).to_be_visible()
  title=p.evaluate('(id)=>testCore.compose(testBuilt,testStore.state).pages.find(x=>x.id===id).title',id)
  target=p.get_by_role('button',name='Manage resource '+title,exact=True)
  for _ in range(25):
   if target.count() and target.is_visible():break
   collapsed=p.locator('.library-sidebar .tree-expander[aria-expanded=false]').filter(has_not=p.locator('.never'))
   if not collapsed.count():break
   collapsed.first.click()
  expect(target).to_be_visible();return target.locator('..')
 for label,id in SOURCES.items():
  def source_drag(label=label,id=id):
   row=source_row(label,id);expect(p.get_by_text('Drop a resource from the tree',exact=True)).to_be_visible();dt=p.evaluate_handle('new DataTransfer()');row.dispatch_event('dragstart',{'dataTransfer':dt});raw=dt.evaluate('(d)=>d.getData("'+MIME+'")');value=json.loads(raw);assert value['schemaVersion']==1 and value['kind']=='atlas-resource';before=state();p.locator('.resource-management').dispatch_event('drop',{'dataTransfer':dt});expect(p.locator('.managed-resource')).to_have_attribute('data-resource-id',id);assert state()['overlays']==before['overlays'];assert state()['personal']['bookmarks']==before['personal']['bookmarks'];shot('manager-'+label.lower()+'-visual');assert p.locator('.notebook-targets').bounding_box()['x']<p.locator('.resource-management').bounding_box()['x'];dt.dispose();return value
  check(label+' actual left-tree typed drag selects the resource without a source mutation',source_drag)
  def json_modes(label=label,id=id):
   click('JSON');raw=p.get_by_label('Resource source JSON').input_value();doc=json.loads(raw);before=state()['overlays'];click('Visual');click('JSON');expect(p.get_by_label('Resource source JSON')).to_have_value(raw);expect(p.locator('.managed-resource')).to_have_attribute('data-resource-id',id);p.get_by_label('Resource source JSON').fill('{broken');click('Apply validated JSON');expect(p.locator('.resource-management [role=alert]')).to_be_visible();assert state()['overlays']==before
   p.get_by_label('Import / Replace resource JSON').set_input_files({'name':'resource.json','mimeType':'application/json','buffer':raw.encode()});assert state()['overlays']==before;expect(p.get_by_label('Resource source JSON')).to_have_value(raw)
   if label=='PDF':doc['document']['title']='Reviewed / PDF metadata';assert 'bytesBase64' not in doc
   else:doc['title']='Reviewed / '+doc['title']
   p.get_by_label('Resource source JSON').fill(json.dumps(doc));click('Apply validated JSON');assert state()['overlays']['pages'][id]['page']['title'].startswith('Reviewed /');expect(p.locator('.resource-management [role=alert]')).to_have_count(0)
   with p.expect_download() as download:click('Export JSON')
   path=OUT/('export-'+label.lower()+'.json');download.value.save_as(path);assert json.loads(path.read_text())==json.loads(p.get_by_label('Resource source JSON').input_value());shot('manager-'+label.lower()+'-json')
  check(label+' Visual/JSON preserves selection, rejects malformed edits, stages import and exports exact JSON',json_modes)
 def tree_reference():
  row=source_row('Article',SOURCES['Article']);before=state();dt=p.evaluate_handle('new DataTransfer()');row.dispatch_event('dragstart',{'dataTransfer':dt});button('Notebook content').dispatch_event('dragenter',{'dataTransfer':dt});expect(p.locator('aside.library-sidebar')).to_have_attribute('aria-label','Notebook library');folder=p.locator('[data-project-id="demo.v2.notebook.cloud"]>.project-row');folder.dispatch_event('drop',{'dataTransfer':dt});p.wait_for_timeout(200);after=state();assert len(after['overlays']['references'])==len(before['overlays']['references'])+1;assert before['overlays']['pages']==after['overlays']['pages'];assert before['overlays']['operations']==after['overlays']['operations'];dt.dispose()
  p.get_by_label('Show references in tree',exact=True).check();shot('notebook-reference-lens')
 check('Tree-to-Notebook folder drop creates one explicit reference and leaves source/tree operations intact',tree_reference)
 def rejected_drag():
  click('Article content');before=state();dt=p.evaluate_handle('(mime)=>{const d=new DataTransfer();d.setData(mime,JSON.stringify({schemaVersion:1,kind:"atlas-resource",title:"Bad",target:{kind:"page",pageId:"missing"},html:"<script>bad</script>"}));return d;}',MIME);p.locator('.resource-management').dispatch_event('drop',{'dataTransfer':dt});expect(p.locator('.resource-management [role=alert]')).to_be_visible();assert state()==before;dt.dispose()
 check('Malformed tree drag is rejected before any workspace or source mutation',rejected_drag)
 def keyboard_browse():
  click('QCM content');choose_library_resource(p,SOURCES['QCM']);expect(p.locator('.managed-resource')).to_have_attribute('data-resource-id',SOURCES['QCM']);click('Visual');p.get_by_label('Reference destination subject').select_option('job');p.get_by_label('Reference destination folder').select_option('demo.v2.notebook.job');before=state()['overlays']['pages'];button('Add reference to Notebook').focus();p.keyboard.press('Enter');p.wait_for_timeout(100);assert state()['overlays']['pages']==before;assert any(r['target'].get('pageId')==SOURCES['QCM'] and r['taxonomy']['subject']=='job' for r in state()['overlays']['references'])
 check('Keyboard Choose resource and Add to Notebook are complete drag/drop alternatives',keyboard_browse)
 def pane_arrows():
  reset();click('Compare in two panes');search('Transform then inspect');before=session()['panes'];a=button('Collapse pane A');bc=button('Collapse pane B');assert a.evaluate('(e)=>e.firstChild.textContent')=='A';assert bc.evaluate('(e)=>e.lastChild.textContent')=='B';assert 'm' in a.locator('path').get_attribute('d').lower();click('Collapse pane A');expect(button('Restore pane A')).to_be_visible();strip=p.locator('.collapsed-pane').bounding_box();hit=button('Restore pane A').bounding_box();assert strip['width']>=40 and hit['height']>=strip['height']-1;assert button('Restore pane A').evaluate('(e)=>e.firstChild.textContent')=='A';shot('collapsed-a');click('Restore pane A');click('Collapse pane B');assert button('Restore pane B').evaluate('(e)=>e.lastChild.textContent')=='B';shot('collapsed-b');click('Restore pane B');assert session()['panes']==before
 check('Directional A/B collapse and full-height widened strips preserve tabs and history exactly',pane_arrows)
 colors={}
 for theme,label in [('fluent','Fluent Blue'),('neutral','Neutral/Sage'),('academic','Academic Paper'),('lavender','Soft Lavender'),('slate','Dark Slate')]:
  def theme_switch(theme=theme,label=label):
   close_panels(p);before=session();click('Theme');click(label);expect(p.locator('html')).to_have_attribute('data-theme',theme);after=session();before['theme']=theme;assert after==before;colors[theme]=p.locator('.reader-rail').evaluate('(e)=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color})');return colors[theme]
  check('Theme '+theme+' changes only theme, preserving exact reading/workspace session',theme_switch)
 def dark_surfaces():
  assert len({json.dumps(x,sort_keys=True) for x in colors.values()})==5,colors;demo();observed={}
  def inspect(name,selector):
   style=p.locator(selector).first.evaluate('(e)=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})');assert style['background'] not in ['rgb(255, 255, 255)','rgb(250, 250, 250)'],(name,style);observed[name]=style
  inspect('Dashboard','.dashboard-page')
  for label,id in SOURCES.items():
   click(label+' content');choose_library_resource(p,id);inspect(label,'main.library-management');click('JSON');inspect(label+' JSON','textarea[aria-label="Resource source JSON"]')
  capture();inspect('Capture','dialog[open]');click('Article',p.locator('dialog'));inspect('Article','dialog[open]');shot('slate-article');close_panels(p);click('Workspace States');inspect('Saved states','.workspace-states-panel');close_panels(p);click('Open context panel');inspect('Context','.context-drawer');close_panels(p);return observed
 check('Five distinct themes and Dark Slate across managers, JSON, capture, Article, Context and states',dark_surfaces)
 for w,h in [(390,844),(1366,768),(1440,900),(1920,1080)]:
  def responsive(w=w,h=h):
   dashboard();p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(160);assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1;assert p.locator('.dashboard-mini-table table').count()==5;shot('slate-dashboard-'+str(w));click('Article content');button('Collapse notebook sidebar').click() if w<600 and button('Collapse notebook sidebar').count() else None;choose_library_resource(p,SOURCES['Article']);assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1;shot('slate-manager-'+str(w));capture();expect(p.get_by_label('Capture text 3')).to_be_visible();assert p.locator('dialog').bounding_box()['width']<=w;shot('slate-capture-'+str(w));close_panels(p);return {'viewport':[w,h],'overflow':p.evaluate('document.documentElement.scrollWidth-innerWidth')}
  check('Responsive Dashboard/manager/Capture at '+str(w)+'x'+str(h),responsive)
 def cleanup():
  reset();demo();click('Article content');choose_library_resource(p,SOURCES['Article']);click('JSON');doc=json.loads(p.get_by_label('Resource source JSON').input_value());doc['title']='My retained customized Article';p.get_by_label('Resource source JSON').fill(json.dumps(doc));click('Apply validated JSON');dashboard();p.locator('.dashboard-mini-table').filter(has=p.get_by_role('heading',name='Bookmarks',exact=False)).get_by_role('button',name='Add to Bookmarks',exact=True).first.click();p.get_by_label('Typed resource destination',exact=True).select_option('page:'+SOURCES['QCM']);p.get_by_label('Saved reading title').fill('My real QCM bookmark');click('Save bookmark');capture();click('Note');p.get_by_label('Capture text 1').fill('My unrelated capture');click('Save captures');dashboard();d=p.locator('.demo-controls');d.locator('summary').click() if d.get_attribute('open') is None else None;p.once('dialog',lambda d:d.accept());click('Reset/remove demo data');after=state();assert after['overlays']['pages'][SOURCES['Article']]['page']['title']=='My retained customized Article';assert SOURCES['QCM'] in after['overlays']['pages'];assert any(x['text']=='My unrelated capture' for x in after['personal']['dashboardItems']);assert any(x['title']=='My real QCM bookmark' for x in after['personal']['bookmarks']);assert 'demo.v2.article.pipeline' not in after['overlays']['pages'];shot('safe-demo-cleanup')
 check('Demo cleanup preserves customized sources, user bookmarks and unrelated captures',cleanup)
 check('No uncaught JavaScript exceptions in stabilization workflows',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':'Compiled application + in-memory DOM harness, not durable IndexedDB or hosted reload','checks':results,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results),'errors':errors};(OUT/'results.json').write_text(json.dumps(report,indent=2));b.close()
raise SystemExit(1 if report['failed'] else 0)
