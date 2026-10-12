from browser_support import bookmark_position,open_saved_manager,inspect_pdf_term,show_reader_controls
"""1.2.2 shell/companion interaction regression in the inherited opaque-origin
DOM harness. Real components only; no claim of PDF rendering or persistence.
Those contracts are covered separately by workspace_122_runtime.py in CI.
"""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,mount_dom,reader_action,open_context,open_more
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.2/dom'));OUT.mkdir(parents=True,exist_ok=True)

def authored_notebook_projects():
 # Independent oracle: read authored JSON and document indexes directly. Do not
 # call projectLibrary/sharedFolders/categoryMatches or derive from rendered UI.
 workspace=json.loads((ROOT/'content/workspace.json').read_text(encoding='utf-8'))
 projects=[];pages={};pdf_ids=set();pack_ids=[]
 for directory in sorted((ROOT/'content'/workspace['packsDirectory']).iterdir()):
  manifest_file=directory/'atlas-pack.json'
  if not manifest_file.is_file():continue
  manifest=json.loads(manifest_file.read_text(encoding='utf-8'))
  if manifest['id'] in workspace['disabledPackIds']:continue
  pack_ids.append(manifest['id'])
  projects.extend(json.loads((directory/manifest['files']['projects']).read_text(encoding='utf-8')))
  for source in sorted((directory/manifest['files']['pages']).glob('*.json')):
   page=json.loads(source.read_text(encoding='utf-8'));assert page['id'] not in pages;pages[page['id']]=page
  document_file=directory/'atlas-documents.json'
  if document_file.is_file():pdf_ids.update(d['pageId'] for d in json.loads(document_file.read_text(encoding='utf-8'))['documents'])
 def native(nodes):
  for node in nodes:
   if 'pageId' in node:
    page=pages[node['pageId']]
    if page['id'] not in pdf_ids and page.get('kind') not in ['cheatsheet','article','qcm']:return True
   elif native(node.get('children',[])):return True
  return False
 notebook_ids=sorted(project['id'] for project in projects if native(project['nodes']))
 norsk_group=next(group for group in workspace['groups'] if group['id']=='group.samples.norsk')
 norsk_ids=sorted(set(norsk_group['projectIds']) & set(notebook_ids))
 # Known authored additions are explicit evidence; retaining both historical
 # projects ensures a new pack cannot silently replace the original baseline.
 assert set(norsk_ids)=={'project.samples.norsk','project.v3seed.norsk','project.atlas.norsk-csv'}
 return {'all':notebook_ids,'norsk':norsk_ids,'packs':sorted(pack_ids),'groups':workspace['groups']}

results=[];errors=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900},accept_downloads=True);p.set_default_timeout(6000);p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base)
 def snap():return p.evaluate('structuredClone(testStore.state)')
 def s():
  personal=snap()['personal'];n=personal.get('activeWorkspaceSlot',1)
  return personal['session'] if n==1 else personal['workspaceSlots'][str(n)]
 def reset(id='page.atlas.welcome',mode='continuous'):
  p.keyboard.press('Escape');p.evaluate('([id,mode])=>testReset(id,mode)',[id,mode]);p.wait_for_timeout(300)
 def shot(name):p.screenshot(path=str(OUT/(name+'.png')))
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failed-'+str(len(results)))
 def slots():
  reset();assert p.locator('.workspace-slots button').all_text_contents()==['1','2','3','4','5'];assert p.locator('.category-filters [aria-pressed=true]').count()==0
  first=snap()['personal']['session'];p.get_by_role('button',name='Workspace 2',exact=True).click();assert s()['panes'][0]['views']==[];assert snap()['personal']['session']==first
  for n in [1,2]:
   p.get_by_role('button',name=f'Workspace {n}',exact=True).click();p.get_by_role('button',name='IT filter',exact=True).click()
  for n in [3,4,5]:
   p.get_by_role('button',name=f'Workspace {n}',exact=True).click();assert s().get('categoryFilter') is None;p.get_by_role('button',name='Norsk filter',exact=True).click()
  personal=snap()['personal'];assert [personal['session']['categoryFilter'],personal['workspaceSlots']['2']['categoryFilter']]==['informatics']*2
  assert [personal['workspaceSlots'][str(i)]['categoryFilter'] for i in [3,4,5]]==['norsk']*3
  p.get_by_role('button',name='Workspace 1',exact=True).click();p.get_by_role('button',name='IT filter',exact=True).click();assert s()['categoryFilter'] is None
  assert p.get_by_role('button',name='Workspace 1',exact=True).get_attribute('aria-pressed')=='true';shot('independent-numbers-all-categories')
 check('Five workspace numbers are independent from optional category filters; duplicates allowed',slots)
 def domain_groups():
  reset();p.get_by_role('button',name='Compare in two panes',exact=True).click();p.locator('[data-node-id="node.page.atlas.language"] .tree-target').click();p.wait_for_timeout(300)
  p.evaluate('document.dispatchEvent(new Event("atlas:before-reader-change"))')
  expected=authored_notebook_projects();before=s();canonical=snap();built=p.evaluate('structuredClone(testBuilt)')
  assert len(before['panes'])==2 and before['panes'][0]['views'] and before['panes'][1]['views']
  assert sorted(pack['manifest']['id'] for pack in built['packs'])==expected['packs'];assert built['groups']==expected['groups']
  def shown():return sorted(p.locator('.tree-project').evaluate_all('es=>es.map(e=>e.dataset.projectId)'))
  def unchanged():
   current=s();assert current['panes']==before['panes'];assert current['ratio']==before['ratio'];assert current['activePane']==before['activePane']
   value=snap()
   for key in ['overlays','imports','assets','history']:assert value.get(key)==canonical.get(key),key
   assert p.evaluate('structuredClone(testBuilt)')==built
  assert shown()==expected['all'];unchanged()
  p.get_by_role('button',name='Norsk filter',exact=True).click();assert shown()==expected['norsk'];unchanged()
  p.get_by_role('button',name='Collapse group Norsk',exact=True).click();assert shown()==[];unchanged()
  p.get_by_role('button',name='Expand group Norsk',exact=True).click();assert shown()==expected['norsk'];unchanged()
  p.get_by_role('button',name='Norsk filter',exact=True).click();assert shown()==expected['all'];unchanged()
  assert p.locator('[data-node-id="node.cheatsheet.sql-analytics"]').count()==0
  shot('canonical-norsk-filter-collapse-reopen')
  return {'independentAuthoredNorskProjects':expected['norsk'],'independentAuthoredNotebookProjects':expected['all'],'panesPreserved':2,'checkedStages':['all','Norsk','collapsed','reopened','all restored'],'canonicalSourceOverlaysHistoryPreserved':True}
 check('Category/group filtering never changes canonical content or open tabs',domain_groups)
 def book():
  reset('page.atlas.language','parallel');before=s()['panes'][0]['views'][0]
  p.get_by_role('button',name='Quick Book mode',exact=True).click();p.locator('.book-grid .book-sheet').first.wait_for();assert s()['panes'][0]['views'][0]['history'][0]['presentation']=='book'
  p.get_by_role('button',name='Quick Book mode',exact=True).click();v=s()['panes'][0]['views'][0];assert v['history'][0]['presentation']=='parallel';assert v['id']==before['id'];assert len(v['history'])==len(before['history']);assert len(s()['panes'])==1
 check('Quick Book is reversible without closing a tab or creating a pane',book)
 def collapse():
  reset('page.atlas.language');p.get_by_role('button',name='Compare in two panes',exact=True).click();p.locator('[data-node-id="node.page.atlas.language"] .tree-target').click();p.wait_for_timeout(300)
  p.evaluate('document.dispatchEvent(new Event("atlas:before-reader-change"))');before=s();a=before['panes'][0];ratio=before['ratio']
  p.get_by_role('button',name='Collapse pane A',exact=True).click();assert s()['panes'][0]==a;assert s()['ratio']==ratio
  assert p.locator('.document-pane').count()==1;edge=p.locator('.collapsed-pane').bounding_box();assert 40<=edge['width']<=48,edge;hit=p.locator('.collapsed-pane button').bounding_box();assert hit['height']>=edge['height']-2,{'strip':edge,'hit':hit}
  p.get_by_role('button',name='Reveal pane A for Read in Norwegian, keep English nearby',exact=True).click();assert len(s()['panes'])==2;assert s()['panes'][0]==a;assert not s().get('collapsedPane');assert s()['ratio']==ratio
  p.get_by_role('button',name='Collapse pane B',exact=True).click();p.get_by_role('button',name='Restore pane B',exact=True).click();assert s()['ratio']==ratio
  ids=[x['id'] for x in s()['panes']];p.get_by_role('button',name='Swap panes',exact=True).click();assert [x['id'] for x in s()['panes']]==list(reversed(ids));shot('pane-collapse-restore-and-swap')
 check('A/B collapse is non-destructive and tree markers restore existing panes; swap works',collapse)
 def chrome():
  reset('page.atlas.pdf');p.locator('.pdf-fallback').wait_for();assert p.locator('.pdf-companion').count()==0;before=s()['panes'][0]['views'];old=p.locator('.pdf-fallback').bounding_box()['height']
  p.get_by_role('button',name='Hide reader controls',exact=True).click();assert not p.locator('.pane-breadcrumb').is_visible();assert not p.locator('.pdf-fallback-strip').is_visible();assert p.locator('.pdf-fallback').bounding_box()['height']>old+40
  assert p.locator('.topbar').count()==0;assert not p.evaluate('!!document.fullscreenElement');assert s()['panes'][0]['views']==before
  p.get_by_role('button',name='Show reader controls',exact=True).click();assert s()['panes'][0]['views']==before
  p.get_by_role('button',name='Collapse notebook sidebar',exact=True).click();assert p.locator('.library-sidebar').count()==0;p.get_by_role('button',name='Open notebook sidebar',exact=True).click();assert p.locator('.library-sidebar').count()==1
 check('Per-pane controls and sidebar hide independently; global topbar no longer exists',chrome)
 def companion_edit():
  reset('page.atlas.pdf');p.get_by_role('button',name='PDF content',exact=True).click();before=s()['panes'][0]['views']
  p.locator('[data-node-id="node.page.atlas.pdf"] .tree-expander').click();inspect_pdf_term(p,'Selectable text');assert 'Text stored in a PDF' in p.locator('dialog').inner_text();p.keyboard.press('Escape')
  open_more(p).get_by_role('button',name='Manage PDF details',exact=True).click();p.get_by_label('Edit concept',exact=True).select_option('text-layer');p.get_by_label('Concept translation',exact=True).fill('Valgbar tekst');p.get_by_label('Page occurrences (comma separated)',exact=True).fill('2, 5');p.get_by_label('Category title',exact=True).fill('Reading a PDF - reviewed example');p.get_by_role('button',name='Save companion locally',exact=True).click();p.locator('dialog').wait_for(state='detached')
  companions=snap()['overlays']['companions'];value=next(iter(companions.values()));assert next(t for t in value['terms'] if t['id']=='text-layer')['translation']=='Valgbar tekst';assert s()['panes'][0]['views']==before
  disclosures=s()['pdfTreeExpanded'];p.get_by_role('button',name='Workspace 2',exact=True).click();p.keyboard.press('Control+k');p.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill('PDF reading fixture');p.locator('.search-result').filter(has_text='PDF reading fixture').first.click();assert p.locator('.pdf-study-tree').count()==0
  p.get_by_role('button',name='Workspace 1',exact=True).click();assert s()['pdfTreeExpanded']==disclosures;assert p.locator('.pdf-study-tree').is_visible();assert p.locator('.pdf-companion').count()==0;shot('shared-companion-local-ui-preference')
 check('Study term/category edits are shared; tree disclosures stay in their original workspace',companion_edit)
 def invalid_companion():
  reset('page.atlas.pdf');open_more(p).get_by_role('button',name='Manage PDF details',exact=True).click();p.get_by_text('Paste or edit complete JSON',exact=True).click();before=snap()['overlays'];p.get_by_role('textbox',name='Companion JSON',exact=True).fill('{"schemaVersion":999,"script":"alert(1)"}');p.get_by_role('button',name='Validate preview',exact=True).click();assert p.locator('dialog [role=alert]').count()==1;assert snap()['overlays']==before;p.get_by_role('button',name='Close dialog',exact=True).click()
 check('Invalid companion input is rejected without a partial write',invalid_companion)
 def geometry():
  rows=[]
  for w,h in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   reset('page.atlas.welcome');p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(200);assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   for name in ['New tab in pane 1','Quick Book mode','Reading mode','Compare in two panes','Enter focus mode','Hide reader controls','Open context panel']:
    box=p.get_by_role('button',name=name,exact=True).bounding_box();assert box and box['x']>=0 and box['x']+box['width']<=w,(w,name,box)
   rail=p.locator('.reader-rail');assert rail.evaluate('e=>e.scrollHeight<=e.clientHeight+1')
   rows.append({'width':w,'height':h,'globalTopbarRows':p.locator('.topbar').count(),'reader':p.locator('.document-pane').bounding_box()});shot('shell-'+str(w))
  p.set_viewport_size({'width':1440,'height':900});return rows
 check('Compact headers and relocated controls remain reachable in four viewports',geometry)
 check('No uncaught JavaScript errors in 1.2.2 interactions',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 b.close()
report={'scope':'Actual compiled compatibility DOM, storage queue suppressed; not integrated/persistence certification','checks':results,'errors':errors,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report['passed'],'failed':report['failed']}));raise SystemExit(1 if report['failed'] else 0)
