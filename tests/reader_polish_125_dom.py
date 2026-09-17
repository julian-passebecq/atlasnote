"""1.2.5 compiled UI regression checks, actual Chromium events on about:blank.
The harness uses an in-memory store and test-only real SHA-256 bridge: this is NOT IndexedDB or PDF-engine evidence.
"""
import json,os,traceback,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import open_more,ROOT,start_server,launch,mount_dom,close_panels,open_context,open_saved_manager,state_action
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.5/polish-ui'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server(dom_only=True);results=[]
with sync_playwright() as pw:
 browser=launch(pw);p=browser.new_page(viewport={'width':1600,'height':1000});p.set_default_timeout(7000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base,controls_visible=False)
 # Same test-only real SHA-256 bridge as the pre-existing about:blank suites.
 p.expose_function('atlasTestSHA256',lambda data:list(hashlib.sha256(bytes(data)).digest()))
 p.evaluate('''()=>{if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(algorithm,data)=>{if(algorithm!=='SHA-256')throw Error('Only SHA-256 is implemented in this test');return new Uint8Array(await window.atlasTestSHA256(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer;}}});}''')
 def button(name):return p.get_by_role('button',name=name,exact=True)
 def session():return p.evaluate('testStore.state.personal.activeWorkspaceSlot===1?testStore.state.personal.session:testStore.state.personal.workspaceSlots[testStore.state.personal.activeWorkspaceSlot]')
 def reset(id='page.interview.sql-q1'):
  close_panels(p);p.set_viewport_size({'width':1600,'height':1000});p.evaluate('(id)=>testReset(id)',id);p.wait_for_timeout(150)
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def select(id):
  close_panels(p);p.locator('[data-node-id="node.interview.'+id+'"] .tree-target').click();p.wait_for_timeout(180)
 def panes():return p.locator('.document-pane')
 def independent():
  reset();button('Compare in two panes').click();select('sql-q2');expect(panes()).to_have_count(2)
  a,b=panes().all();a.get_by_role('button',name='Show reader controls',exact=True).click();assert session()['panes'][0]['readerChromeCollapsed']==False and session()['panes'][1].get('readerChromeCollapsed',True)==True
  b.get_by_role('button',name='Show reader controls',exact=True).click();a.get_by_role('button',name='Hide reader controls',exact=True).click()
  assert session()['panes'][0]['readerChromeCollapsed']==True and session()['panes'][1]['readerChromeCollapsed']==False
  for pane in [a,b]:
   classes=pane.locator('.pane-tabbar').evaluate('(e)=>[...e.children].slice(0,5).map(x=>x.className)');assert 'pane-identity' in classes[0] and 'pane-new-tab' in classes[1] and classes[2]=='tab-list' and classes[3]=='pane-header-actions' and 'pane-chrome-toggle' in classes[4],classes
   assert pane.locator('.pane-tabbar .pane-header-actions').get_by_role('button',name='Reading mode',exact=True).is_visible()
   assert '*' not in pane.locator('.pane-identity').inner_text()
  b.locator('.document-tab.selected').click();assert session()['activePane']==session()['panes'][1]['id'];expected=session();state_action(p,'Save current workspace state');button('Workspace 4').click();button('Workspace 1').click();assert session()==expected
  b=panes().nth(1);b.get_by_role('button',name='Hide reader controls',exact=True).click();state_action(p,'Restore last workspace save');assert session()==expected
  p.screenshot(path=str(OUT/'independent-pane-controls.png'))
 check('Per-pane A-B / + / tabs / persistent shortcuts / toolbar toggle; no star; independent selection, workspace switch and restore',independent)
 def navigation():
  reset();select('sql-q2');button('Back in active tab').click();assert session()['panes'][0]['views'][0]['history'][session()['panes'][0]['views'][0]['cursor']]['pageId']=='page.interview.sql-q1'
  button('Forward in active tab').click();assert session()['panes'][0]['views'][0]['history'][session()['panes'][0]['views'][0]['cursor']]['pageId']=='page.interview.sql-q2'
  button('Collapse notebook sidebar').click();assert button('Global search').is_visible();button('Open notebook sidebar').click();button('Open context panel').click();expect(p.locator('.document-context')).to_be_visible();button('Close context').click();expect(p.locator('.document-context')).to_have_count(0)
  button('Enter focus mode').click();assert session()['focus'];button('Exit focus').click();assert not session()['focus'];open_more(p).get_by_role('button',name='Home',exact=True).click();assert session()['screen']=='home'
 check('Compact home/search/history/sidebar/context/focus controls still navigate',navigation)
 def hierarchy():
  reset();project=p.locator('[data-project-id="project.interview-preparation"]')
  ids=p.locator('[data-node-id^="node.interview."]').evaluate_all('(es)=>es.map(e=>e.dataset.nodeId)');assert 'node.interview.sql.aggregation.filter-aggregate' in ids or any(x.count('.')>=4 for x in ids)
  for id in ['sql-q1','sql-q2','sql-q3','sql-q4','sql-q5','theory-layout','theory-batch','theory-medallion','theory-behavioral','hybrid-lazy','hybrid-retry','hybrid-fanout','coding-group','coding-errors','coding-latest']:
   select(id);assert session()['panes'][0]['views'][0]['history'][session()['panes'][0]['views'][0]['cursor']]['pageId']=='page.interview.'+id
  assert p.locator('.document-pane pre code').count()>=1;select('sql-q1');p.screenshot(path=str(OUT/'sql-question.png'));return {'nativeQuestionPagesOpened':15}
 check('Deep interview hierarchy opens all fifteen SQL/Theory/Hybrid/Coding native references',hierarchy)
 def context():
  reset('page.atlas.layouts');select('sql-q1');panel=open_context(p);assert panel.get_by_role('tab').all_text_contents()==['Outline / Glossary','Search','Remarks','Related','References','History'];assert not panel.locator('.state-saves-manager').count();panel.get_by_role('button',name='Example',exact=True).click();p.wait_for_timeout(200)
  open_context(p,'Search');p.get_by_label('Search this document',exact=True).fill('GROUP BY');expect(p.locator('.document-search-hit').first).to_be_visible();assert 'GROUP BY' in p.locator('.document-context').inner_text();p.get_by_label('Search this document',exact=True).fill('QA-ANCHOR-BRAVO');expect(p.locator('.document-search-hit')).to_have_count(0)
  open_context(p,'Remarks');p.get_by_label('Personal remarks',exact=True).fill('My initial reflection.');button('Insert reflection prompts').click();text=p.get_by_label('Personal remarks',exact=True).input_value();assert text.startswith('My initial reflection.');assert 'What pattern did I recognize?' in text
  open_context(p,'History');assert 'First opened on this device' in p.locator('.document-context').inner_text();assert p.evaluate('testStore.state.personal.documentVisits.some(v=>v.pageId==="page.interview.sql-q1")');assert 'Q1' in p.locator('.document-context').inner_text();p.screenshot(path=str(OUT/'document-history.png'))
 check('Context targets the active document: outline, scoped search, personal reflection and bounded history',context)
 def related():
  reset();open_context(p,'Related');p.get_by_label('Related document',exact=True).select_option('page.atlas.pdf');button('Link document').click();expect(p.locator('.related-document-row').filter(has_text='PDF reading fixture')).to_be_visible()
  overlay=p.evaluate('testStore.state.overlays.pages["page.interview.sql-q1"]');assert 'page.atlas.pdf' in overlay['page']['related'];assert len(overlay['baseHash'])==64
  p.locator('.related-document-row').filter(has_text='PDF reading fixture').locator('.context-link').click();p.wait_for_timeout(200);assert session()['panes'][0]['views'][0]['history'][-1]['pageId']=='page.atlas.pdf'
  panel=open_context(p,'Related');assert 'Linked from' in panel.inner_text();assert 'Q1' in panel.inner_text();p.screenshot(path=str(OUT/'related-notebook-pdf.png'))
 check('Explicit related notebook/PDF links use existing overlays and expose backlinks',related)
 def pdf_outline():
  reset('page.atlas.pdf');panel=open_context(p);button('Expand PDF category Reading a PDF').click();rows=panel.locator('.pdf-study-page');assert rows.count()>=5;assert rows.locator('.pdf-study-term').count()==0
  rows.filter(has=p.locator('[data-pdf-page="4"]')).count() # page targets are asserted directly below
  panel.locator('.pdf-study-page[data-pdf-page="4"] .tree-target').first.click();assert session()['panes'][0]['views'][0]['history'][0]['pdfPage']==4
  open_context(p,'Search');p.get_by_label('Search this document',exact=True).fill('language');assert p.locator('.document-search-hit').count()>=1;button('Search selectable PDF text').click();expect(p.locator('.document-context [role=status]')).to_contain_text('integrated reader')
 check('PDF Context reuses category/physical-page navigation; fallback text search is honest',pdf_outline)
 def pdf_taxonomy():
  reset('page.atlas.pdf');button('PDF content').click();tree=p.locator('.pdf-library-sidebar .tree-scroll');assert 'PDF Atlas' not in tree.inner_text();assert not tree.locator('[data-node-id="node.cheatsheet.sql-analytics"]').count();button('Filter tree').click();p.get_by_label('Filter notebook tree',exact=True).fill('Data Engineering');expect(tree.locator('[data-node-id="node.pdfatlas.spark-concepts"]')).to_be_visible();expect(tree.locator('[data-node-id="node.pdfatlas.pyspark-pandas"]')).to_be_visible();assert p.evaluate('testBuilt.packs.flatMap(p=>p.projects).find(p=>p.id==="project.pdfatlas").title')=='PDF Atlas';p.screenshot(path=str(OUT/'flattened-public-pdf-taxonomy.png'))
 check('Actual public PDF taxonomy is flat, searchable by domain, and keeps original metadata',pdf_taxonomy)

 def states():
  reset();open_context(p);assert p.locator('.state-quick-actions').count()==0;open_saved_manager(p);expect(p.locator('.document-context')).to_have_count(0);assert p.locator('.state-quick-actions button').count()==4;assert p.locator('.save-scope-tabs [role=tab]').all_text_contents()==['1','2','3','4','5','All'];p.get_by_role('tab',name='All workspaces saves',exact=True).click();button('Save state').click();p.wait_for_timeout(180);assert p.evaluate('testStore.state.personal.savedStates.entries[0].scope')=='all';p.screenshot(path=str(OUT/'workspace-states.png'))
 check('Workspace States is separate from Context and retains all five scopes plus all-workspace saves',states)
 def safe_code():
  reset();p.evaluate('''()=>testStore.overlays(o=>{const page=structuredClone(testBuilt.packs.flatMap(p=>p.pages).find(p=>p.id==='page.interview.sql-q1'));page.blocks.push({type:'code',id:'page.interview.escape-code',language:'python',code:'<img src=x onerror="window.INTERVIEW_UNSAFE=1">\\n<script>window.INTERVIEW_UNSAFE=1</script>'});o.pages[page.id]={baseHash:'a'.repeat(64),page};})''');p.wait_for_timeout(220)
  code=p.locator('.document-pane pre code').filter(has_text='INTERVIEW_UNSAFE');expect(code).to_have_count(1);assert not code.locator('img,script').count();assert p.evaluate('window.INTERVIEW_UNSAFE===undefined');expect(code).to_contain_text('<script>')
 check('Interview code renders as inert text, not HTML or executable markup',safe_code)
 def responsive():
  reset();rows=[]
  for w,h in [(1440,900),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});open_context(p,'Remarks');p.wait_for_timeout(150);assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   box=p.locator('.document-context').bounding_box();assert box['x']>=0 and box['x']+box['width']<=w+1;assert p.get_by_label('Personal remarks',exact=True).is_visible();p.screenshot(path=str(OUT/('context-'+str(w)+'.png')));close_panels(p);rows.append([w,h])
  return rows
 check('Document Context and interview references remain readable at desktop and phone widths',responsive)
 check('No uncaught UI errors',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':__doc__,'checks':results,'errors':errors,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results)};(OUT/'results.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(1 if report['failed'] else 0)
