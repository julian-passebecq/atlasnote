from browser_support import open_article_advanced,choose_library_resource
"""V2 Chromium component checks. Compiled application, visible UI operations.
Uses the established about:blank/in-memory compatibility harness. Does NOT prove
IndexedDB, reload, PDF.js canvas/worker, or integrated production readiness.
"""
import json,os,traceback,hashlib,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom,close_panels,open_context,open_settings,state_action
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v2/references-ui'));OUT.mkdir(parents=True,exist_ok=True)
results=[];errors=[];base=start_server(dom_only=True)
ARTICLE=json.loads((ROOT/'examples/content-hub/article-sample.json').read_text());ARTICLE.pop('text');ARTICLE['title']='Reference workflow transcript (synthetic)';ARTICLE['blocks']=[{'id':'v2.article.section','type':'section','title':'Reference target','children':[{'id':'v2.article.text','type':'markdown','text':'Synthetic browser navigation fixture, not an educational concept claim.'}]}];QCM=json.loads((ROOT/'examples/content-hub/qcm-sample.json').read_text())
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1600,'height':1050},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(6500);p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base)
 def state():return p.evaluate('JSON.parse(JSON.stringify(testStore.state))')
 def session():
  s=state()['personal'];return s['session'] if s.get('activeWorkspaceSlot',1)==1 else s['workspaceSlots'][str(s['activeWorkspaceSlot'])]
 def view():
  s=session();a=next(a for a in s['panes'] if a['id']==s['activePane']);return next(v for v in a['views'] if v['id']==a['active'])
 def loc():v=view();return v['history'][v['cursor']]
 def click(name,area=None): (area if area is not None else p).get_by_role('button',name=name,exact=True).click();p.wait_for_timeout(100)
 def shot(name):p.screenshot(path=str(OUT/(name+'.png')))
 def check(name,fn):
  try:r=fn();results.append({'name':name,'status':'PASS','detail':r});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)));close_panels(p)
  (OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def search(title):
  close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(220)
 def manage():
  close_panels(p);panel=open_context(p,'References');click('Link concept / Add reference',panel);expect(p.locator('dialog[open]')).to_be_visible()
 def source(pageid,physical=None,block=None,question=None):
  details=p.locator('dialog details').filter(has=p.get_by_text('Choose a different source / exact section',exact=True));details.locator('summary').click() if details.get_attribute('open') is None else None
  picker=details.locator('.resource-target-picker');choose(picker,pageid,physical,block,question)
 def choose(picker,pageid,physical=None,block=None,question=None):
  picker.get_by_label('Typed resource destination',exact=True).select_option('page:'+pageid)
  if physical:picker.get_by_label('Typed target physical page',exact=True).fill(str(physical))
  if block:picker.get_by_label('Typed target block ID',exact=True).fill(block)
  if question:picker.get_by_label('Typed target question',exact=True).select_option(question)
  p.wait_for_timeout(130)
 def import_source(kind,doc):
  close_panels(p);click(kind+' content');p.get_by_role('button',name='Add article' if kind=='Article' else 'New/import QCM',exact=True).last.click();p.get_by_label('Content JSON file',exact=True).set_input_files({'name':'fixture.json','mimeType':'application/json','buffer':json.dumps(doc).encode()});click('Import local content');expect(p.locator('dialog[open]')).to_have_count(0)
 def setup():
  import_source('Article',ARTICLE);import_source('QCM',QCM);search('Transform then inspect');assert p.locator('.pane-identity').count()==0
 check('Existing native Article/QCM import and Notebook reader remain usable',setup)
 def headers():
  pane=p.locator('.active-pane');expect(pane.locator('.pane-tabbar').get_by_role('button',name='Quick Book mode',exact=True)).to_be_visible();expect(pane.locator('.pane-tabbar').get_by_role('button',name='Reading mode',exact=True)).to_be_visible()
  if pane.get_by_role('button',name='Hide reader controls',exact=True).count():click('Hide reader controls',pane)
  expect(pane.get_by_role('button',name='Quick Book mode',exact=True)).to_be_visible();click('Reading mode',pane);expect(p.locator('.popover-reading')).to_be_visible();click('Reading mode',pane);expect(p.locator('.popover-reading')).to_have_count(0)
  click('Reading mode',pane);p.keyboard.press('Escape');expect(pane.get_by_role('button',name='Reading mode',exact=True)).to_be_focused();assert p.locator('.popover-reading').count()==0
  click('Reading mode',pane);pane.click(position={'x':180,'y':240});expect(p.locator('.popover-reading')).to_have_count(0);shot('persistent-pane-header')
 check('Header shortcuts survive hidden controls; dropdown reclick, outside, Escape and focus work',headers)
 concept_id=None;tree_before=None
 def concept():
  global concept_id,tree_before
  manage();tree_before=state()['overlays'];click('Concept Index');p.get_by_label('Concept label',exact=True).fill('Spark shuffle');p.get_by_label('Concept aliases',exact=True).fill('shuffle\nexchange');click('Save concept');k=state()['personal']['knowledge'];concept_id=next(c['id'] for c in k['concepts'] if c['label']=='Spark shuffle');assert len(k['assignments'])==0;assert state()['overlays']==tree_before
  click('Exact links');source('page.samples.pyspark.transform',block='block.samples.pyspark.transform');p.get_by_label('Concept to link',exact=True).select_option(concept_id);click('Link concept to this target');assert state()['personal']['knowledge']['assignments'][0]['target']['anchor']['blockId']=='block.samples.pyspark.transform'
 check('Create stable concept and assign exact Notebook section without structural writes',concept)
 def exact_links():
  destination=p.locator('dialog .resource-target-picker').last;choose(destination,'page.pdfatlas.spark-concepts',physical=3);click('Add exact reference');k=state()['personal']['knowledge'];assert len(k['edges'])==1 and k['edges'][0]['target']['pdfPage']==3
  source('page.pdfatlas.spark-concepts',physical=3);click('Link concept to this target')
  source('page.cheatsheet.pyspark-execution',physical=2,block='pyspark-execution.p2.s1');click('Link concept to this target')
  source(QCM['id'],question=QCM['questions'][0]['id']);click('Link concept to this target')
  source(ARTICLE['id'],block=ARTICLE['blocks'][0]['id']);click('Link concept to this target')
  source('page.interview.hybrid-lazy',block='page.interview.hybrid-lazy.followup');click('Link concept to this target');assert len(state()['personal']['knowledge']['assignments'])==6
  close_panels(p);panel=open_context(p,'References');expect(panel.locator('.concept-chips')).to_contain_text('Spark shuffle');assert panel.locator('.reference-result[data-reference-group="PDF"]').count()>=1;shot('notebook-context-references')
 check('UI links exact PDF page, sheet block, QCM question, Article section and interview section',exact_links)
 def rename():
  manage();click('Concept Index');p.get_by_label('Edit concept',exact=True).select_option(concept_id);p.get_by_label('Concept label',exact=True).fill('Shuffle & Exchange');click('Save concept');assert all(a['conceptId']==concept_id for a in state()['personal']['knowledge']['assignments']);assert state()['overlays']==tree_before;close_panels(p)
 check('Concept rename preserves all six assignments and Notebook freedom',rename)
 def explorer():
  panel=open_context(p,'References');before=view().copy();click('Open Reference Explorer',panel);expect(p.locator('.reference-explorer')).to_be_visible();assert view()['referenceExplorer']['returnViewId']==before['id'];click('Shuffle & Exchange',p.locator('.concept-index'));p.get_by_label('Reference type filter',exact=True).select_option('Cheatsheet');expect(p.locator('.reference-explorer-main .reference-result')).to_have_count(1);shot('explorer-filtered')
  p.get_by_label('Reference type filter',exact=True).select_option('All');p.get_by_label('Reference direction filter',exact=True).select_option('outgoing');expect(p.locator('.reference-explorer-main .reference-result[data-reference-group="PDF"]')).to_have_count(1)
  p.locator('.concept-index').get_by_role('button').filter(has_text='Unlinked / Needs review').click()
  expect(p.get_by_label('Filter review queue',exact=True)).to_be_visible();click('Close Reference Explorer');assert view()==before
 check('Closable Explorer filters and unlinked queue preserve originating tab state',explorer)
 def lens():
  p.get_by_role('checkbox',name='Show references in tree',exact=True).check();assert state()['personal']['referenceLens'];assert state()['overlays']==tree_before
  click('References for Transform then inspect');lens=p.get_by_role('button',name='References for Transform then inspect',exact=True).locator('..');expect(lens.locator('.reference-result')).not_to_have_count(0);count=len(session()['panes'][0]['views']);lens.locator('[data-reference-group="Cheatsheet"] .reference-open').dblclick();p.wait_for_timeout(450);assert len(session()['panes'][0]['views'])==count+1;assert loc()['pageId']=='page.cheatsheet.pyspark-execution';assert loc()['anchor']['blockId']=='pyspark-execution.p2.s1';expect(p.locator('.active-pane .sheet-svg>svg')).to_have_attribute('data-cheatsheet-page','2');shot('sheet-exact-block')
 check('Virtual Notebook lens double-click opens exact sheet block in a new tab',lens)
 def panes():
  panel=open_context(p,'References');row=panel.locator('.reference-result[data-reference-group="QCM"]').first;row.locator('.icon-button').click();p.get_by_role('menuitem',name='Open in new tab in other pane',exact=True).click();p.wait_for_timeout(250);assert len(session()['panes'])==2;assert loc()['anchor']['questionId']==QCM['questions'][0]['id'];assert p.locator('.active-pane .pane-header-actions').count()==0;expect(p.locator('.document-pane').first.locator('.sheet-svg>svg')).to_be_visible();shot('sheet-question-compare')
  panel=open_context(p,'References');row=panel.locator('.reference-result[data-reference-group="Article"]').first;row.locator('.icon-button').click();p.get_by_role('menuitem',name='Open in workspace...',exact=True).click();p.get_by_role('menuitem',name='Open in Workspace 5',exact=True).click();p.wait_for_timeout(200);assert state()['personal']['activeWorkspaceSlot']==5;assert loc()['anchor']['blockId']==ARTICLE['blocks'][0]['id']
 check('Reference menu opens exact QCM in other pane and Article section in Workspace 5',panes)
 def capture():
  click('Quick Capture',p.locator('.sidebar-navigation'));click('Task',p.locator('dialog'));p.get_by_label('Capture text 1',exact=True).fill('Review the source section');p.get_by_role('checkbox',name='Attach current reading context',exact=True).check();click('Save captures');expect(p.locator('dialog[open]')).to_have_count(0);panel=open_context(p,'References');expect(panel.locator('.reference-result[data-reference-group="Task"]')).to_have_count(1);assert 'Opt-in capture context' in panel.inner_text();shot('article-capture-backlinks')
 check('Opt-in exact-context capture appears as derived incoming backlink',capture)
 exported=None
 def export():
  global exported
  manage();source(ARTICLE['id'],block=ARTICLE['blocks'][0]['id']);click('Review & AI handoff')
  with p.expect_download() as dl:click('Export reference review JSON')
  path=OUT/'review.json';dl.value.save_as(str(path));exported=json.loads(path.read_text());assert exported['semanticRevision']==state()['personal']['knowledge']['revision'];assert len(exported['resources'])==1;assert exported['resources'][0]['target']['anchor']['blockId']==ARTICLE['blocks'][0]['id']
  with p.expect_download() as dl:click('Export reference review Markdown')
  dl.value.save_as(str(OUT/'review.md'));assert 'Semantic revision' in (OUT/'review.md').read_text()
 check('Actual bounded local JSON and Markdown downloads include exact target and semantic revision',export)
 def suggestions():
  resource=exported['resources'][0];rev=exported['semanticRevision'];batch={'schemaVersion':1,'kind':'atlas-reference-suggestions','semanticRevision':rev,'suggestions':[{'id':'ui.proposal.'+str(i),'type':'assignment','conceptId':'concept.job' if i else 'concept.it','target':resource['target'],'targetRevision':resource['sourceRevision'],'reason':'Synthetic suggestion for explicit review'} for i in range(2)]}
  before=state()['personal']['knowledge'];p.get_by_label('Reference suggestion JSON',exact=True).fill('{malformed');click('Preview suggestions');expect(p.locator('dialog [role=alert]')).to_be_visible();assert state()['personal']['knowledge']==before
  p.get_by_label('Reference suggestion JSON',exact=True).fill(json.dumps(batch));click('Preview suggestions');assert state()['personal']['knowledge']==before;expect(p.get_by_label('Validated reference suggestions',exact=True)).to_be_visible();click('Stage validated suggestions');assert len(state()['personal']['knowledge']['assignments'])==len(before['assignments'])
  row=p.locator('[data-suggestion-id="ui.proposal.0"]');row.get_by_role('checkbox').check();click('Accept selected');click('Reject',p.locator('[data-suggestion-id="ui.proposal.1"]'));k=state()['personal']['knowledge'];assert [x['status'] for x in k['proposals']]==['accepted','rejected'];assert len(k['assignments'])==len(before['assignments'])+1;shot('review-decisions')
  p.get_by_label('Reference suggestion JSON',exact=True).fill(json.dumps(batch));click('Preview suggestions');expect(p.locator('dialog [role=alert]')).to_contain_text('Stale semantic');assert state()['personal']['knowledge']==k;close_panels(p)
 check('Malformed/stale suggestion rejection, pure preview, staging, selected accept/reject and history',suggestions)
 def backup():
  p.expose_function('atlasV2SHA',lambda a:list(hashlib.sha256(bytes(a)).digest()))
  p.evaluate("""()=>{if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(_,data)=>new Uint8Array(await window.atlasV2SHA(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer}})}""")
  close_panels(p);open_settings(p);before=state()
  # Opaque-origin real SHA-256 bridging and verified ZIP preparation can exceed
  # the short UI-action timeout. Payload equality below remains exact.
  with p.expect_download(timeout=30000) as dl:click('Download workspace backup')
  path=OUT/'references-component-backup.atlas-backup.zip';dl.value.save_as(str(path))
  with zipfile.ZipFile(path) as z:payload=json.loads(z.read('backup.json'))['workspace']
  assert payload['personal']['knowledge']==before['personal']['knowledge'];assert payload['personal']['referenceLens'] is True;assert payload['overlays']==before['overlays'];close_panels(p)
 check('Downloaded backup contains exact semantic state, shared lens and unchanged overlays (not durable restore)',backup)
 def short_screen():
  open_context(p,'References');p.set_viewport_size({'width':390,'height':740});shot('references-mobile');assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1');p.set_viewport_size({'width':1600,'height':1050});close_panels(p);p.get_by_role('button',name='Workspace 1',exact=True).click();p.wait_for_timeout(150);assert len(session()['panes'])==2
 check('390px Context view and workspace return keep layout and Compare state',short_screen)
 def independent_headers():
  close_panels(p);p.evaluate("testReset('page.cheatsheet.pyspark-execution')");p.wait_for_timeout(180);click('Compare in two panes');search('SQL for Analytics');expect(p.locator('.document-pane')).to_have_count(2)
  a,bpane=p.locator('.document-pane').nth(0),p.locator('.document-pane').nth(1);click('Reading mode',a);expect(p.locator('.popover-reading')).to_be_visible();expect(a.get_by_role('button',name='Reading mode',exact=True)).to_have_attribute('aria-expanded','true');expect(bpane.get_by_role('button',name='Reading mode',exact=True)).to_have_attribute('aria-expanded','false');p.keyboard.press('Escape');expect(a.get_by_role('button',name='Reading mode',exact=True)).to_be_focused()
  before=session()['panes'][1];click('Hide reader controls' if a.get_by_role('button',name='Hide reader controls',exact=True).count() else 'Show reader controls',a);assert session()['panes'][1]==before;expect(a.locator('.pane-tabbar .pane-header-actions')).to_be_visible();click('Collapse pane A');expect(p.get_by_role('button',name='Restore pane A',exact=True)).to_be_visible();click('Restore pane A');expect(p.locator('.document-pane')).to_have_count(2);shot('independent-header-controls')
 check('Inactive pane mode activation, per-pane ARIA/chrome and A/B collapse/restore',independent_headers)
 check('No uncaught browser exceptions',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':__doc__,'status':'PASS' if all(r['status']=='PASS' for r in results) and not errors else 'FAIL','checks':results,'errors':errors,'passed':sum(r['status']=='PASS' for r in results),'total':len(results)};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:report[k] for k in ['status','passed','total']}));b.close()
raise SystemExit(0 if report['status']=='PASS' else 1)
