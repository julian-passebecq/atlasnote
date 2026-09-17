from browser_support import open_article_advanced,choose_library_resource
"""1.2.7 real Chromium component/UI checks on the compiled compatibility build.
Uses about:blank and the existing in-memory store harness; DOES NOT certify
IndexedDB, reload/fresh-profile restore, integrated PDF, or production origin.
All new content creation and learning operations use the visible application UI.
"""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom,close_panels,open_more,open_context,show_reader_controls,state_action
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.7/content-hub-ui'));OUT.mkdir(parents=True,exist_ok=True)
ARTICLE=json.loads((ROOT/'examples/content-hub/article-sample.json').read_text());QCM=json.loads((ROOT/'examples/content-hub/qcm-sample.json').read_text())
results=[];errors=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
 browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base)
 def button(name,area=None):return (area or p).get_by_role('button',name=name,exact=True)
 def click(name,area=None):button(name,area).click();p.wait_for_timeout(100)
 def state():return p.evaluate('JSON.parse(JSON.stringify(testStore.state))')
 def session():
  s=state()['personal'];return s['session'] if s.get('activeWorkspaceSlot',1)==1 else s['workspaceSlots'][str(s['activeWorkspaceSlot'])]
 def location():
  s=session();a=next(a for a in s['panes'] if a['id']==s['activePane']);v=next(v for v in a['views'] if v['id']==a['active']);return v['history'][v['cursor']]
 def reset(id=None):close_panels(p);p.set_viewport_size({'width':1440,'height':1000});p.evaluate('(id)=>testReset(id)',id);p.wait_for_timeout(150)
 def shot(name):p.screenshot(path=str(OUT/(name+'.png')),full_page=False)
 def check(name,fn):
  close_panels(p)
  try:r=fn();results.append({'name':name,'status':'PASS','detail':r});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def import_source(kind,doc):
  close_panels(p);click(kind+' content');button('Add article' if kind=='Article' else 'New/import QCM').last.click();p.get_by_label('Content JSON file',exact=True).set_input_files({'name':'fixture.json','mimeType':'application/json','buffer':json.dumps(doc).encode()});click('Import local content');expect(p.locator('dialog[open]')).to_have_count(0);p.wait_for_timeout(150)
 def search(title):
  close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(200)
 def capture(mode,texts,subject=None,attach=False,due=None):
  click('Quick Capture',p.locator('.sidebar-navigation'));click(mode,p.locator('dialog'))
  for i,text in enumerate(texts):
   if i>=3:click('Add row')
   p.get_by_label('Capture text '+str(i+1),exact=True).fill(text)
  if subject:p.get_by_label('Classification subject',exact=True).select_option(subject)
  if attach:p.get_by_role('checkbox',name='Attach current reading context',exact=True).check()
  if due:p.get_by_label('Task due 1',exact=True).fill(due)
  click('Save captures');expect(p.locator('dialog[open]')).to_have_count(0)
 def dashboard():
  close_panels(p)
  if not p.locator('.dashboard-page').count():click('Open Dashboard')
  expect(p.locator('.dashboard-page')).to_be_visible()
 def basic():
  reset();expect(p.locator('.dashboard-mini-table')).to_have_count(5);expect(p.locator('[data-empty-slot=true]')).to_have_count(15);assert p.locator('.dashboard-mini-table table').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')==['Inbox','To-do','Quick notes','Bookmarks','Read later'];assert p.locator('.content-type-selector button').count()==5;assert p.locator('.subject-selector button').all_text_contents()==['IT','Cloud','Job','KPI','Norsk'];assert p.locator('.sidebar-navigation button').count()==7;assert p.locator('.project-tree .workspace-slots').count()==0;expect(p.locator('.workspace-dock .workspace-slots button')).to_have_count(5);shot('dashboard-empty');return {'tables':5,'emptySlots':15,'subjects':5,'types':5,'workspaceCap':5}
 check('Five compact Dashboard tables and separate content/subject/workspace axes',basic)
 def article():
  import_source('Article',ARTICLE);expect(p.locator('.active-pane')).to_contain_text(ARTICLE['text']);stored=state()['overlays']['pages'][ARTICLE['id']]['page'];assert stored['article']['sourceType']=='transcript';assert stored['article']['taxonomy']==ARTICLE['taxonomy'];assert not p.locator('iframe').count();assert not any(r for r in errors);shot('article-reader')
 check('Import supplied Article fixture as native text without remote iframe',article)
 def link_article():
  click('Article content');button('Add article').last.click();p.get_by_label('Title',exact=True).fill('Link-only local article');p.get_by_label('Source URL',exact=True).fill('https://example.invalid/link-only');click('Import local content');expect(p.locator('dialog[open]')).to_have_count(0);pg=next(v['page'] for v in state()['overlays']['pages'].values() if v['page']['title']=='Link-only local article');assert pg['article']['url']=='https://example.invalid/link-only';assert not p.locator('iframe').count()
 check('Link-only Article creation retains external reference without fetching',link_article)
 def bad_import():
  click('Article content');button('Add article').last.click();open_article_advanced(p);p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).check();before=state()['overlays'];bad={**ARTICLE,'id':'unsafe-source','blocks':[{'id':'bad','type':'html','html':'<iframe src="https://example.invalid/"></iframe>'}]};bad.pop('text',None)
  for raw in ['{not-json',json.dumps(bad)]:
   p.get_by_label('Article JSON',exact=True).fill(raw);click('Import local content');expect(p.locator('dialog [role=alert]')).to_be_visible();assert state()['overlays']==before
  close_panels(p);return {'malformedAndUnsafeAtomic':True}
 check('Malformed and executable Article import rejected before mutation',bad_import)
 def qcm_import():
  import_source('QCM',QCM);expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q1');expect(p.locator('.qcm-options input[type=radio]')).to_have_count(4);shot('qcm-unanswered')
 check('Import supplied QCM fixture and show single-answer question',qcm_import)
 def answer_single():
  p.locator('.qcm-options input[value=c]').check();click('Check answer');expect(p.locator('.qcm-explanation')).to_contain_text('Correct / attempt 1');assert p.locator('.qcm-options small').count()==4;p.get_by_label('Question reflection',exact=True).fill('Recognize the Spark action, not transformations.');a=state()['personal']['qcmAttempts'][-1];assert a['correct'] and a['reflection'].startswith('Recognize');assert a['answeredAt']>0;shot('qcm-feedback')
 check('Single answer scoring, all option explanations, timestamp and reflection',answer_single)
 def multi():
  click('Next question');expect(p.locator('.qcm-options input[type=checkbox]')).to_have_count(4)
  for id in ['a','b','d']:p.locator('.qcm-options input[value='+id+']').check()
  click('Check answer');a=state()['personal']['qcmAttempts'][-1];assert a['correct'] and a['questionId']=='q2' and set(a['selectedOptionIds'])=={'a','b','d'}
  click('Try again');p.locator('.qcm-options input[value=a]').check();click('Check answer');a=state()['personal']['qcmAttempts'][-1];assert not a['correct'] and a['attemptNumber']==2
 check('Multi-select exact-set scoring and monotonic attempt history',multi)
 def reveal():
  click('Try again');click('Reveal answer');a=state()['personal']['qcmAttempts'][-1];assert a['revealed'] and not a['correct'] and a['attemptNumber']==3;expect(p.locator('.qcm-explanation')).to_contain_text('not counted correct')
 check('Reveal is stored separately and never counted as correct',reveal)
 def qcm_context():
  panel=open_context(p,'Outline');panel.locator('.outline-link').first.click();expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q1');panel=open_context(p,'Search');panel.get_by_label('Search this document',exact=True).fill('shuffle');panel.locator('.document-search-hit').first.click();expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q2');close_panels(p)
 check('QCM Context outline/search navigate stable question IDs',qcm_context)
 def capture_context():
  capture('Task',['Review shuffles tomorrow','Compare broadcast join'],subject='it',attach=True,due='2026-10-01');items=state()['personal']['dashboardItems'];assert len(items)==2;assert all(i['contextTarget']['questionId']=='q2' for i in items);assert items[0]['dueAt']>0;assert items[0]['taxonomy']['subject']=='it'
  capture('Note',['A global unclassified note']);i=next(i for i in state()['personal']['dashboardItems'] if i['text']=='A global unclassified note');assert 'contextTarget' not in i and 'taxonomy' not in i
 check('Batch task capture with date/exact QCM context, default global note capture',capture_context)
 def batch_limit():
  click('Quick Capture',p.locator('.sidebar-navigation'));click('Note',p.locator('dialog'))
  for i in range(5):
   if i>=3:click('Add row')
   p.get_by_label('Capture text '+str(i+1),exact=True).fill('Batch note '+str(i+1))
  expect(button('Add row')).to_be_disabled();p.get_by_label('Classification subject',exact=True).select_option('cloud');p.get_by_label('Important row 1',exact=True).check();click('Save captures');assert len(state()['personal']['dashboardItems'])==8;assert next(i for i in state()['personal']['dashboardItems'] if i['text']=='Batch note 1')['important']
 check('Five-row capture limit and importance retained',batch_limit)
 def board():
  before=session()['panes'];dashboard();assert session()['panes']==before
  click('Cloud',p.locator('.dashboard-scope'));cell=p.get_by_role('region',name='Quick notes table',exact=True);expect(cell.locator('.dashboard-card')).to_have_count(3);click('Show more (5)',cell);expect(cell.locator('.dashboard-card')).to_have_count(5)
  click('All subjects',p.locator('.dashboard-scope'));expect(p.get_by_role('table',name='Inbox',exact=True)).to_contain_text(ARTICLE['title']);expect(p.get_by_role('table',name='Quick notes',exact=True)).to_contain_text('A global unclassified note');shot('dashboard-filled')
  click('Complete Review shuffles tomorrow');assert next(i for i in state()['personal']['dashboardItems'] if i['text']=='Review shuffles tomorrow')['status']=='done';p.get_by_role('checkbox',name='Include completed',exact=True).check();click('Reopen Review shuffles tomorrow');assert next(i for i in state()['personal']['dashboardItems'] if i['text']=='Review shuffles tomorrow')['status']=='open';click('Source for Review shuffles tomorrow');expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q2')
 check('Derived Dashboard, bounded Show more, task toggle and exact source return',board)
 def qcm_exports():
  for label,kind in [('Export QCM set','set'),('Export attempts','attempts')]:
   with p.expect_download() as d:click(label)
   path=OUT/(kind+'.json');d.value.save_as(str(path));v=json.loads(path.read_text());assert v['id']==QCM['id'] if kind=='set' else len(v)==4
  p.locator('.qcm-export summary').click();p.get_by_label('AI export first question',exact=True).fill('2');p.get_by_label('AI export last question',exact=True).fill('2')
  with p.expect_download() as d:click('Export AI JSON')
  path=OUT/'bounded-review.json';d.value.save_as(str(path));v=json.loads(path.read_text());assert len(v['questions'])==1 and v['questions'][0]['id']=='q2';assert len(v['questions'][0]['attempts'])==3;assert v['questions'][0]['options'][1]['explanation']
  with p.expect_download() as d:click('Export AI Markdown')
  path=OUT/'bounded-review.md';d.value.save_as(str(path));assert 'Attempt history' in path.read_text()
 check('Actual downloads: QCM source, attempts, bounded AI JSON and Markdown',qcm_exports)
 def shared_not_rewind():
  close_panels(p);state_action(p,'Save current workspace state');before=state()['personal']['qcmAttempts'];click('Try again');p.locator('.qcm-options input[value=c]').check();click('Check answer');capture('Note',['After checkpoint capture']);attempts=state()['personal']['qcmAttempts'];captures=state()['personal']['dashboardItems'];assert len(attempts)==len(before)+1;state_action(p,'Restore last workspace save');assert state()['personal']['qcmAttempts']==attempts;assert state()['personal']['dashboardItems']==captures
  click('Workspace 2');expect(p.locator('.dashboard-page')).to_be_visible();search(QCM['title']);assert state()['personal']['qcmAttempts']==attempts;expect(p.locator('.qcm-reader')).to_contain_text('answered');click('Workspace 1')
 check('Checkpoint restore and workspace switching never rewind shared captures/attempts',shared_not_rewind)
 def classification_and_reference():
  click('QCM content');choose_library_resource(p,QCM['id']);manager=p.locator('.library-management');manager.get_by_label('Classification subject',exact=True).select_option('it');options=manager.get_by_label('Classification folder',exact=True).locator('option').evaluate_all('(es)=>es.filter(e=>e.value).map(e=>({id:e.value,text:e.textContent}))');assert options;folder=options[0]['id'];manager.get_by_label('Classification folder',exact=True).select_option(folder);click('Save classification');source=state()['overlays']['pages'][QCM['id']]['page'];assert source['qcm']['taxonomy']==QCM['taxonomy'];p.get_by_label('Reference destination subject',exact=True).select_option('it');p.get_by_label('Reference destination folder',exact=True).select_option(folder);click('Add reference to Notebook');refs=state()['overlays']['references'];assert refs[-1]['target']['kind']=='qcm' and refs[-1]['taxonomy']['folderId']==folder;assert state()['overlays']['pages'][QCM['id']]['page']==source;shot('qcm-library-management');click('Notebook content');p.locator('.tree-target').filter(has_text=QCM['title']).first.click();expect(p.locator('.qcm-reader')).to_be_visible();return {'folderId':folder}
 check('Shared folder classification plus keyboard-accessible Notebook reference insertion',classification_and_reference)
 def edit_reference():
  click('Notebook content');click('Edit reference '+QCM['title']);p.get_by_label('Reference title',exact=True).fill('Spark QCM reference renamed');click('Save reference');assert state()['overlays']['references'][-1]['title']=='Spark QCM reference renamed';assert state()['overlays']['pages'][QCM['id']]['page']['title']==QCM['title'];click('Edit reference Spark QCM reference renamed');click('Remove reference only');assert not state()['overlays']['references'];assert QCM['id'] in state()['overlays']['pages']
 check('Rename/remove reference changes no underlying QCM source',edit_reference)
 def drag_reference():
  click('QCM content');choose_library_resource(p,QCM['id']);source=p.locator('.managed-resource');target=p.locator('.notebook-target-folder').first;transfer=p.evaluate_handle('new DataTransfer()');source.dispatch_event('dragstart',{'dataTransfer':transfer});target.dispatch_event('dragover',{'dataTransfer':transfer});target.dispatch_event('drop',{'dataTransfer':transfer});p.wait_for_timeout(200);assert len(state()['overlays']['references'])==1;assert state()['overlays']['references'][0]['target']['setId']==QCM['id']
 check('Actual drag events add a typed Notebook reference via shared destination tree',drag_reference)
 def modes():
  before=session();click('Article content');after=session();assert after.get('categoryFilter')==before.get('categoryFilter');assert after.get('libraryFolder')==before.get('libraryFolder');assert after['panes']==before['panes'];click('PDF content');assert session().get('categoryFilter')==before.get('categoryFilter');assert session()['panes']==before['panes'];assert len(state()['personal'].get('qcmAttempts',[]))==5;click('Notebook content')
 check('Content-mode switches preserve subject/folder and independent reader state',modes)
 def related():
  search(ARTICLE['title']);panel=open_context(p,'Related');panel.get_by_text('Link an exact resource position',exact=True).click();panel.get_by_label('Typed resource destination',exact=True).select_option('page:'+QCM['id']);panel.get_by_label('Typed target question',exact=True).select_option('q2');panel.get_by_label('Related typed link label',exact=True).fill('Review exact shuffle question');click('Add typed relationship',panel);assert state()['overlays']['pages'][ARTICLE['id']]['page']['resourceLinks'][-1]['target']['questionId']=='q2';click('Review exact shuffle question',panel);expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q2')
 check('Create and follow typed Related link to an exact QCM question',related)
 def chrome_compare():
  search('SQL for Analytics');show_reader_controls(p);click('Compare in two panes');expect(p.locator('.document-pane')).to_have_count(2);search(QCM['title']);panes=p.locator('.document-pane');expect(panes.locator('.pane-identity')).to_have_count(2);before=session()['panes'][0];show_reader_controls(p,panes.nth(1));assert session()['panes'][0]==before;click('Hide reader controls',panes.nth(1));assert session()['panes'][0]==before;shot('cheatsheet-qcm-compare');click('Open Dashboard');saved=session()['panes'];click('Return to reader');assert session()['panes']==saved
 check('Cheatsheet/QCM Compare and independent chrome survive Dashboard round-trip',chrome_compare)
 def popup():
  search(ARTICLE['title']);area=p.locator('.active-pane');show_reader_controls(p,area);trigger=button('Reading mode',area);trigger.click();expect(p.locator('.popover-reading')).to_have_count(1);trigger.click();expect(p.locator('.popover-reading')).to_have_count(0);trigger.click();p.keyboard.press('Escape');expect(trigger).to_be_focused();trigger.click();click('Theme');expect(p.locator('.popover-reading')).to_have_count(0);expect(p.locator('.popover-theme')).to_have_count(1);p.locator('.active-pane h1').click();expect(p.locator('.reader-popover')).to_have_count(0)
 check('Reading popover reclick, Escape focus-return, another popover and outside dismissal',popup)
 def quick_transcript():
  click('Quick Capture',p.locator('.sidebar-navigation'));click('Transcript',p.locator('dialog'));expect(p.get_by_label('Pasted article or transcript',exact=True)).to_be_visible();p.get_by_label('Title',exact=True).fill('Capture transcript form');p.get_by_label('Pasted article or transcript',exact=True).fill('Locally pasted transcript.');click('Import local content');expect(p.locator('.active-pane')).to_contain_text('Locally pasted transcript.');assert next(v['page'] for v in state()['overlays']['pages'].values() if v['page']['title']=='Capture transcript form')['article']['sourceType']=='transcript'
 check('Capture Transcript opens the proper long-form native Article editor',quick_transcript)
 def responsive():
  dashboard();p.set_viewport_size({'width':390,'height':600});p.wait_for_timeout(250);expect(button('Choose workspace')).to_be_visible();click('Choose workspace');click('Workspace 3',p.locator('.popover-workspaces'));expect(p.locator('.dashboard-page')).to_be_visible();p.wait_for_timeout(100);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1');shot('dashboard-390x600');click('Norsk',p.locator('.dashboard-scope'));expect(p.locator('.dashboard-mini-table')).to_have_count(5);assert all(p.locator('.dashboard-mini-table tbody').nth(i).locator('tr').count()>=3 for i in range(5));shot('dashboard-subject-390');p.set_viewport_size({'width':1440,'height':1000});p.wait_for_timeout(150);click('Workspace 1')
 check('390px short-screen Dashboard and compact workspace chooser remain usable',responsive)
 def boundary():
  personal=state()['personal'];assert len(personal['qcmAttempts'])==5;assert len(personal['dashboardItems'])==9;assert not errors,errors;assert not p.locator('iframe').count();return {'attempts':5,'captures':9,'consoleErrors':errors,'persistence':'not certified by this harness'}
 check('Final data integrity and no browser exceptions',boundary)

 def article_lifecycle():
  reset();import_source('Article',ARTICLE);click('Article content');choose_library_resource(p,ARTICLE['id']);click('Edit / details');p.get_by_label('Title',exact=True).fill('Edited native transcript');p.get_by_label('Pasted article or transcript',exact=True).fill('Edited safe local body.');open_article_advanced(p);p.get_by_label('Article status',exact=True).select_option('reading');click('Save content');expect(p.locator('.active-pane')).to_contain_text('Edited safe local body.');pg=state()['overlays']['pages'][ARTICLE['id']]['page'];assert pg['article']['status']=='reading';assert pg['article']['updatedAt']>=pg['article']['addedAt'];click('Article content');choose_library_resource(p,ARTICLE['id']);p.get_by_label('Managed article status',exact=True).select_option('finished');p.wait_for_timeout(100)
  with p.expect_download() as dl:click('Export source')
  path=OUT/'edited-article.json';dl.value.save_as(str(path));export=json.loads(path.read_text());assert export['id']==ARTICLE['id'] and export['status']=='finished';assert export['blocks'][0]['text']=='Edited safe local body.'
  click('Archive resource');assert ARTICLE['id'] in state()['overlays']['archived'];expect(button('Restore resource')).to_be_visible();p.get_by_role('checkbox',name='Include archived',exact=True).check();click('Restore resource');assert ARTICLE['id'] not in state()['overlays']['archived'];assert state()['overlays']['pages'][ARTICLE['id']]['page']['article']['status']=='finished';shot('article-manager-edited')
 check('Article edit, reading status, source export and archive/restore preserve identity',article_lifecycle)
 def qcm_rejection():
  reset();import_source('QCM',QCM);click('QCM content');button('New/import QCM').last.click();before=state();bad=json.loads(json.dumps(QCM));bad['id']='unsafe-qcm';bad['questions'][0]['html']='<script>window.UNSAFE_QCM=1</script>'
  for raw in [json.dumps(QCM),json.dumps(bad),'{malformed']:
   p.get_by_label('QCM JSON',exact=True).fill(raw);click('Import local content');expect(p.locator('dialog [role=alert]')).to_be_visible();after=state();assert after['overlays']==before['overlays'];assert after['personal']==before['personal'];assert p.evaluate('window.UNSAFE_QCM===undefined')
  close_panels(p)
 check('Duplicate, executable and malformed QCM imports fail atomically',qcm_rejection)
 def presets():
  reset();docs=[]
  for preset in ['summary','architecture','bilingual','vocabulary']:
   open_more(p).get_by_role('button',name='Import cheatsheet JSON',exact=True).click();p.get_by_label('Cheatsheet preset',exact=True).select_option(preset);click('Use preset template');doc=json.loads(p.get_by_label('Structured cheatsheet JSON',exact=True).input_value());docs.append(doc);click('Validate source');expect(p.locator('dialog [role=status]')).to_contain_text('Valid source');click('Import local cheatsheet');expect(p.locator('.active-pane .sheet-svg>svg')).to_have_count(1);expect(p.locator('.active-pane .sheet-svg>svg text').first).to_be_visible();assert p.locator('.active-pane .sheet-svg>svg image').count()==0;shot('preset-'+preset)
  stored=[v['page']['cheatsheet'] for v in state()['overlays']['pages'].values() if v['page'].get('cheatsheet')];assert len(stored)==4;assert stored==docs;return {'presets':4,'liveSVG':True}
 check('All four authoring presets validate, import and render live SVG with unchanged grammar',presets)
 def inline_links():
  reset();import_source('Article',ARTICLE);import_source('QCM',QCM);info=p.evaluate('''()=>{const c=testBuilt.packs.flatMap(p=>p.pages);return {note:c.find(p=>p.id==='page.atlas.layouts'),sheet:c.find(p=>p.cheatsheet),pdf:testBuilt.packs.flatMap(p=>p.documents||[])[0]}}''');assert info['note'];pdf=info['pdf'];sheet=info['sheet'];note=info['note'];search(note['title']);open_more(p).get_by_role('button',name='Edit current page',exact=True).click();p.get_by_text('Insert a typed resource link',exact=True).click()
  entries=[('Inline exact PDF',pdf['pageId'],2,None),('Inline exact sheet',sheet['id'],2,sheet['cheatsheet']['pages'][1]['blocks'][0]['id']),('Inline article',ARTICLE['id'],None,None),('Inline exact question',QCM['id'],None,'q2')]
  for label,pid,num,anchor in entries:
   p.get_by_label('Typed resource destination',exact=True).select_option('page:'+pid)
   if num:p.get_by_label('Typed target physical page',exact=True).fill(str(num))
   if anchor:p.get_by_label('Typed target question' if pid==QCM['id'] else 'Typed target block ID',exact=True).select_option(anchor) if pid==QCM['id'] else p.get_by_label('Typed target block ID',exact=True).fill(anchor)
   p.get_by_label('Resource link label',exact=True).fill(label);click('Append resource link')
  click('Save page locally');expect(p.locator('dialog[open]')).to_have_count(0);blocks=[b for b in state()['overlays']['pages'][note['id']]['page']['blocks'] if b['type']=='resource-link'];assert len(blocks)==4;assert blocks[0]['target']['pdfPage']==2;assert blocks[1]['target']['anchor']['blockId']==entries[1][3];assert blocks[3]['target']['questionId']=='q2';shot('notebook-inline-typed-links')
  for label,pid,num,anchor in entries:
   search(note['title']);p.locator('.active-pane .resource-linked-card button.linked-card').filter(has_text=label).click();p.wait_for_timeout(200);loc=location();assert loc['pageId']==pid
   if pid==pdf['pageId']:assert loc['pdfPage']==2
   if pid==sheet['id']:expect(p.locator('.active-pane .sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','2');assert loc['anchor']['blockId']==anchor
   if pid==QCM['id']:expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q2')
  return {'typedInlineLinks':4,'pdfEngine':'routing only in compatibility harness'}
 check('Notebook editor creates and follows exact PDF, cheatsheet, Article and QCM inline links',inline_links)
 def qcm_scroll():
  reset();doc=json.loads(json.dumps(QCM));doc['id']='scroll-qcm';doc['title']='QCM long-scroll fixture';doc['questions'][0]['prompt']='Long question. '+('Read the pipeline contract carefully before selecting an option. '*60);import_source('QCM',doc);reader=p.locator('.qcm-reader');reader.hover();p.mouse.wheel(0,680);p.wait_for_timeout(350);before=reader.evaluate('(e)=>e.scrollTop');assert before>100;assert abs(location()['scroll']-before)<2;dashboard();click('Return to reader');expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q1');assert abs(reader.evaluate('(e)=>e.scrollTop')-before)<2;click('Workspace 2');click('Workspace 1');assert abs(reader.evaluate('(e)=>e.scrollTop')-before)<2;p.get_by_label('Current QCM question',exact=True).select_option('q2');p.wait_for_timeout(350);assert location()['anchor']['questionId']=='q2';assert reader.evaluate('(e)=>e.scrollTop')==0;assert location()['scroll']==0;return {'actualWheelScroll':before,'workspaceAndDashboardPreserved':True}
 check('Actual QCM wheel scroll survives Dashboard and workspace switches without stale question overwrite',qcm_scroll)
 def capture_batch():
  reset();click('Quick Capture',p.locator('.sidebar-navigation'));click('Link',p.locator('dialog'));p.get_by_label('Capture text 1',exact=True).fill('Official reference');p.get_by_label('Capture URL 1',exact=True).fill('https://example.invalid/reference');click('Add row');p.get_by_label('Capture text 2',exact=True).fill('https://example.invalid/second');click('Add row');shot('quick-capture-links');click('Save captures');items=state()['personal']['dashboardItems'];assert len(items)==2;assert {x['url'] for x in items}=={'https://example.invalid/reference','https://example.invalid/second'};assert all('contextTarget' not in i for i in items);assert not errors,errors;return {'blankRowsIgnored':True,'implicitContext':False}
 check('Link capture retains safe URLs, ignores blanks and never inherits context silently',capture_batch)
 browser.close()
report={'scope':__doc__,'status':'PASS' if not errors and all(r['status']=='PASS' for r in results) else 'FAIL','checks':results,'errors':errors};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in results),'total':len(results)}));raise SystemExit(0 if report['status']=='PASS' else 1)
