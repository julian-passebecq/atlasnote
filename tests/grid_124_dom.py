from browser_support import state_action,open_context
"""Real React-PDF/PDF.js four-page geometry and routing. In-memory store only."""
import os,json,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,close_panels,show_reader_controls
from engine_dom_support import mount_engine
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.4/pdf-grid'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server(dom_only=True,dist='.build/engine-dom');results=[]
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(10000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));mount_engine(p,base)
 def btn(s):return p.get_by_role('button',name=s,exact=True)
 def session():return p.evaluate('testSlots.activeSession(testStore.state.personal)')
 def loc():
  s=session();pane=next(x for x in s['panes'] if x['id']==s['activePane']);v=next(v for v in pane['views'] if v['id']==pane['active']);return v['history'][v['cursor']]
 def ready():
  p.locator('.active-pane .integrated-pdf[data-pdf-state=ready] [data-page-rendered=true] canvas').first.wait_for();p.wait_for_timeout(200);assert p.locator('.pdf-fallback').count()==0
 def pages():return p.locator('.active-pane [data-physical-page]').evaluate_all('(es)=>es.map(e=>Number(e.dataset.physicalPage))')
 def reset(id='page.atlas.pdf'):
  close_panels(p);p.set_viewport_size({'width':1440,'height':900});p.evaluate('(id)=>testReset(id)',id);ready()
 def grid():btn('Quick four-page PDF grid').click();ready();expect(p.locator('.active-pane .pdf-grid')).to_be_visible()
 def rendered(ns):
  expect(p.locator('.active-pane .physical-page')).to_have_count(len(ns));expect(p.locator('.active-pane .physical-page[data-page-rendered=true] canvas')).to_have_count(len(ns));p.wait_for_timeout(160);assert pages()==ns,pages()
 def goto(n):
  show_reader_controls(p);field=p.locator('.active-pane [aria-label="Physical PDF page number"]');field.fill(str(n));field.press('Enter');ready()
 def check(name,fn):
  try:d=fn();results.append({'name':name,'status':'PASS','detail':d});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def dimensions():
  return p.locator('.active-pane .physical-page').evaluate_all('(es)=>es.map(e=>{const r=e.getBoundingClientRect(),c=e.querySelector("canvas");return {page:Number(e.dataset.physicalPage),x:r.x,y:r.y,width:r.width,height:r.height,pixelWidth:c.width,pixelHeight:c.height};})')
 def first():
  ready();assert not p.locator('.pdf-controls').is_visible();grid();rendered([1,2,3,4]);d=dimensions();assert abs(d[0]['y']-d[1]['y'])<=1;assert d[2]['y']>d[0]['y']+d[0]['height'];assert d[3]['x']>d[2]['x'];assert abs(d[2]['width']-d[0]['width'])<=1;assert d[2]['height']<d[0]['height'];assert all(x['pixelWidth']>100 for x in d)
  assert 'QA-ANCHOR-BRAVO' in p.locator('.active-pane [data-physical-page="2"] .react-pdf__Page__textContent').inner_text();p.screenshot(path=str(OUT/'four-page-grid.png'));return d
 check('Four real canvas pages form a 2x2 grid with selectable text and un-stretched mixed orientations',first)
 def last():
  reset();grid();rendered([1,2,3,4]);show_reader_controls(p);p.locator('.active-pane').get_by_role('button',name='Next',exact=True).click();ready();rendered([5]);assert loc()['pdfPage']==5;assert p.locator('.active-pane').get_by_role('button',name='Next',exact=True).is_disabled();btn('Previous PDF page').click();ready();rendered([1,2,3,4]);assert loc()['pdfPage']==1
 check('Group navigation 1-4 then final real page5; no invented trailing pages',last)
 def select_page():
  reset();grid();rendered([1,2,3,4]);p.locator('.active-pane [data-physical-page="3"]').click(position={'x':5,'y':5});ready();assert loc()['pdfPage']==3;rendered([1,2,3,4]);goto(4);rendered([1,2,3,4]);assert loc()['pdfPage']==4
 check('Clicking a grid page and physical page input preserve exact selected-page identity',select_page)
 def fit():
  reset();grid();rows=[]
  for w,h in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});ready();rendered([1,2,3,4]);host=p.locator('.active-pane .pdf-canvas-scroll').bounding_box();d=dimensions();bottom=max(x['y']+x['height'] for x in d);assert bottom<=host['y']+host['height']+3,(w,bottom,host);assert max(x['x']+x['width'] for x in d)<=host['x']+host['width']+2;assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1;rows.append({'viewport':[w,h],'pages':d});p.screenshot(path=str(OUT/('grid-'+str(w)+'.png')))
  return rows
 check('Fit grid keeps two columns and two rows visible at desktop and phone sizes',fit)
 def rotation():
  reset('page.atlas.rotated');grid();show_reader_controls(p);rendered([1,2,3,4]);before=dimensions();btn('Rotate 90 degrees').click();ready();rendered([1,2,3,4]);after=dimensions();assert loc()['rotation']==90;assert any(abs(a['height']/a['width']-z['height']/z['width'])>.1 for a,z in zip(before,after));return {'before':before,'after':after}
 check('Intrinsic rotation and additional90-degree viewer rotation use actual page dimensions',rotation)
 def reversible():
  reset();show_reader_controls(p);p.get_by_label('PDF zoom',exact=True).select_option('0.75');p.get_by_label('PDF presentation',exact=True).select_option('spread');ready();grid();rendered([1,2,3,4]);btn('Quick four-page PDF grid').click();ready();assert loc()['pdfMode']=='spread' and loc()['zoom']==.75;assert pages()==[1,2]
  grid();btn('Quick PDF Spread').click();ready();assert loc()['pdfMode']=='spread' and pages()==[1,2];assert loc()['zoom']==.75
 check('Quick grid and two-page Spread remain distinct; leaving grid restores prior layout and zoom',reversible)
 def cover_keyboard():
  reset();grid();show_reader_controls(p);p.get_by_label('Cover alone',exact=True).check();ready();rendered([1]);host=p.locator('.active-pane .pdf-canvas-scroll');host.focus();p.keyboard.press('ArrowRight');ready();rendered([2,3,4,5]);host.focus();p.keyboard.press('ArrowLeft');ready();rendered([1])
 check('Cover alone and keyboard arrows navigate cover then pages2-5 without skipped groups',cover_keyboard)
 def wheel():
  reset();grid();rendered([1,2,3,4]);r=p.locator('.active-pane .pdf-canvas-scroll').bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);p.mouse.wheel(0,120);ready();rendered([5]);p.wait_for_timeout(600);p.mouse.wheel(0,-120);ready();rendered([1,2,3,4])
 check('Deliberate wheel gestures navigate groups forward and backward in grid mode',wheel)
 def compare():
  diagnostic = {'stage': 'start'}
  def assert_equal(stage, expected, actual):
   diagnostic.update(stage=stage, expected=expected, actual=actual)
   (OUT/'compare-state.json').write_text(json.dumps(diagnostic, indent=2))
   assert actual == expected, stage + ': ' + json.dumps({'expected': expected, 'actual': actual}, sort_keys=True)
  reset();p.set_viewport_size({'width':1920,'height':1080});ready();grid();rendered([1,2,3,4])
  a=session()['panes'][0]
  btn('Compare in two panes').click()
  p.locator('[data-node-id="node.page.atlas.rotated"] .tree-target').click();ready()
  # V2 new PDFs already default to Spread. A toggle would switch back to Single.
  # Select the required mode explicitly, without changing the equality contract.
  show_reader_controls(p)
  p.locator('.active-pane').get_by_label('PDF presentation',exact=True).select_option('spread');ready()
  before=session();diagnostic['before']=before
  assert_equal('source pane unchanged', a, before['panes'][0])
  assert_equal('one Grid and one Spread', [1,1], [p.locator('.pdf-grid').count(),p.locator('.pdf-spread').count()])
  state_action(p,'Save all workspace states');p.wait_for_timeout(200);expected=session()
  diagnostic['savedExpected']=expected
  btn('Swap panes').click()
  state_action(p,'Restore last all-workspaces save');ready()
  assert_equal('all-workspace restore exact session', expected, session())
  p.screenshot(path=str(OUT/'grid-and-spread-compare.png'))
  return diagnostic
 check('Grid and Spread coexist in independent Compare panes and survive all-workspace restore',compare)
 def bookmark_grid():
  reset();grid();goto(3);btn('Open bookmarks').click();btn('Bookmark current position').click();p.wait_for_timeout(200);entry=p.evaluate('testStore.state.personal.bookmarks[0]');assert entry['target']['pdfPage']==3;close_panels(p);goto(5);btn('Open bookmarks').click();p.locator('.reading-open').first.click();ready();assert loc()['pdfPage']==3
 check('Bookmark made in grid restores the selected physical page, not only the group start',bookmark_grid)
 def from_scrolled():
  reset();goto(2);host=p.locator('.active-pane .pdf-canvas-scroll');r=host.bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);p.mouse.wheel(0,300);p.wait_for_timeout(300);assert host.evaluate('e=>e.scrollTop')>50
  grid();rendered([1,2,3,4]);h=host.bounding_box();d=dimensions();assert min(x['y'] for x in d)>=h['y']-2,(h,d)
 check('Entering fit grid from a scrolled single page keeps the first row visible',from_scrolled)
 check('No uncaught PDF/reader errors',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':'Actual React-PDF/PDF.js canvas and text layers in Chromium, about:blank in-memory workspace; NOT IndexedDB or production validation','checks':results,'errors':errors,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results)};(OUT/'results.json').write_text(json.dumps(report,indent=2));b.close()
raise SystemExit(1 if report['failed'] else 0)
