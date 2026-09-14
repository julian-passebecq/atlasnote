"""1.2.2 shell/companion interaction regression in the inherited opaque-origin
DOM harness. Real components only; no claim of PDF rendering or persistence.
Those contracts are covered separately by workspace_122_runtime.py in CI.
"""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,mount_dom,reader_action,open_context,open_more
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.2/dom'));OUT.mkdir(parents=True,exist_ok=True)
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
   p.get_by_role('button',name=f'Workspace {n}',exact=True).click();p.get_by_role('button',name='Informatics filter',exact=True).click()
  for n in [3,4,5]:
   p.get_by_role('button',name=f'Workspace {n}',exact=True).click();assert s().get('categoryFilter') is None;p.get_by_role('button',name='Norsk filter',exact=True).click()
  personal=snap()['personal'];assert [personal['session']['categoryFilter'],personal['workspaceSlots']['2']['categoryFilter']]==['informatics']*2
  assert [personal['workspaceSlots'][str(i)]['categoryFilter'] for i in [3,4,5]]==['norsk']*3
  p.get_by_role('button',name='Workspace 1',exact=True).click();p.get_by_role('button',name='Informatics filter',exact=True).click();assert s()['categoryFilter'] is None
  assert p.get_by_role('button',name='Workspace 1',exact=True).get_attribute('aria-pressed')=='true';shot('independent-numbers-all-categories')
 check('Five workspace numbers are independent from optional category filters; duplicates allowed',slots)
 def domain_groups():
  reset();before=s()['panes'];overlays=snap()['overlays'];p.get_by_role('button',name='Norsk filter',exact=True).click();assert p.locator('.tree-project').count()==1
  button=p.get_by_role('button',name='Collapse group Norsk',exact=True);button.click();assert p.locator('.tree-project').count()==0;p.get_by_role('button',name='Expand group Norsk',exact=True).click();assert p.locator('.tree-project').count()==1
  assert s()['panes']==before and snap()['overlays']==overlays;p.get_by_role('button',name='Norsk filter',exact=True).click();assert p.locator('.tree-project').count()==11
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
  assert p.locator('.document-pane').count()==1;edge=p.locator('.collapsed-pane').bounding_box();assert edge['width']<=30
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
  reset('page.atlas.pdf');p.get_by_role('button',name='Switch to PDF library',exact=True).click();before=s()['panes'][0]['views']
  p.locator('[data-node-id="node.page.atlas.pdf"] .tree-expander').click();p.get_by_role('button',name='Expand PDF glossary',exact=True).click();p.get_by_role('button',name='Definition of Selectable text',exact=True).click();assert 'Text stored in a PDF' in p.locator('dialog').inner_text();p.keyboard.press('Escape')
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
   for name in ['New tab in pane 1','Quick Book mode','Reading mode','Compare in two panes','Enter focus mode','Hide reader controls','Manage saved states']:
    box=p.get_by_role('button',name=name,exact=True).bounding_box();assert box and box['x']>=0 and box['x']+box['width']<=w,(w,name,box)
   rail=p.locator('.reader-rail');assert rail.evaluate('e=>e.scrollHeight<=e.clientHeight+1')
   rows.append({'width':w,'height':h,'globalTopbarRows':p.locator('.topbar').count(),'reader':p.locator('.document-pane').bounding_box()});shot('shell-'+str(w))
  p.set_viewport_size({'width':1440,'height':900});return rows
 check('Compact headers and relocated controls remain reachable in four viewports',geometry)
 check('No uncaught JavaScript errors in 1.2.2 interactions',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 b.close()
report={'scope':'Actual compiled compatibility DOM, storage queue suppressed; not integrated/persistence certification','checks':results,'errors':errors,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report['passed'],'failed':report['failed']}));raise SystemExit(1 if report['failed'] else 0)
