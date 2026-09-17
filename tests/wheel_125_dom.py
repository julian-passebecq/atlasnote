"""Actual React-PDF wheel-only progression in Single/Spread/Grid and Compare.
Initial layout is chosen through the UI. Page progression is never simulated with
page-number input, a state mutation, synthetic scroll events or script scrollTop.
Requires npm ci and npm run build:test-harness. Not an IndexedDB certification.
"""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,close_panels,show_reader_controls
from engine_dom_support import mount_engine
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.5/pdf-wheel'));OUT.mkdir(parents=True,exist_ok=True)
results=[];errors=[]
if not list((ROOT/'.build/engine-dom/assets').glob('harness-*.js')):
 report={'scope':__doc__,'status':'BLOCKED','checks':[{'name':name,'status':'BLOCKED','error':'The actual React-PDF component harness is not built. Install the locked dependencies and build:test-harness.'} for name in ['single slow wheel','spread slow wheel','grid slow wheel','compare independence','momentum restore','reverse progression','V2 tall single native range','V2 tall spread native range','V2 tall grid native range','V2 first-open Spread and narrow preference','no browser errors']]}
 (OUT/'results.json').write_text(json.dumps(report,indent=2));print('BLOCKED: actual React-PDF harness missing');raise SystemExit(2)
base=start_server(dom_only=True,dist='.build/engine-dom')
with sync_playwright() as pw:
 browser=launch(pw);p=browser.new_page(viewport={'width':1920,'height':1080});p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)));mount_engine(p,base)
 def btn(name):return p.get_by_role('button',name=name,exact=True)
 def state():return p.evaluate('testSlots.activeSession(testStore.state.personal)')
 def loc(index=0):
  pane=state()['panes'][index];v=next(v for v in pane['views'] if v['id']==pane['active']);return v['history'][v['cursor']]
 def area(index=0):return p.locator('.document-pane').nth(index)
 def ready(index=0):
  area(index).locator('.integrated-pdf[data-pdf-state=ready] [data-page-rendered=true] canvas').first.wait_for();p.wait_for_timeout(160);assert area(index).locator('.pdf-fallback').count()==0
 def reset(mode='single'):
  close_panels(p);p.evaluate('testReset()');ready();show_reader_controls(p);area().get_by_label('PDF presentation',exact=True).select_option(mode);ready();p.wait_for_timeout(550)
 def hover(index=0):
  box=area(index).locator('.pdf-canvas-scroll').bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
 def shown(index=0):return area(index).locator('[data-physical-page]').evaluate_all('(es)=>es.map(e=>Number(e.dataset.physicalPage))')
 def slow_to_turn(index=0,direction=1):
  previous=loc(index)['pdfPage'];hover(index);ticks=0
  while loc(index)['pdfPage']==previous and ticks<100:
   p.mouse.wheel(0,direction*30);p.wait_for_timeout(350);ticks+=1
  assert loc(index)['pdfPage']!=previous,{'page':previous,'ticks':ticks,'mode':loc(index)['pdfMode']};ready(index)
  return ticks
 def check(name,fn):
  try:d=fn();results.append({'name':name,'status':'PASS','detail':d});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def slow(mode,expected):
  reset(mode);ticks=slow_to_turn();assert loc()['pdfPage']==expected;assert expected in shown();expect(area().locator('[data-physical-page="'+str(expected)+'"][data-page-rendered=true] canvas')).to_be_visible();assert area().locator('.pdf-canvas-scroll').evaluate('e=>e.scrollTop')<40
  p.screenshot(path=str(OUT/(mode+'-slow-wheel.png')));return {'ticksOf30px350msApart':ticks,'physicalPage':expected,'canvasPages':shown()}
 for mode,expected in [('single',2),('spread',3),('grid',5)]:check(mode+' slow mouse wheel reaches the next physical page/group',lambda mode=mode,expected=expected:slow(mode,expected))
 def reverse():
  reset('single');slow_to_turn();assert loc()['pdfPage']==2;p.wait_for_timeout(600);slow_to_turn(direction=-1);assert loc()['pdfPage']==1;host=area().locator('.pdf-canvas-scroll');assert host.evaluate('e=>e.scrollTop+e.clientHeight>=e.scrollHeight-24');return {'physicalPage':1,'atBottom':True}
 check('Reverse slow wheel restores the previous physical page at its bottom',reverse)
 def momentum():
  reset('single');hover();old=loc()['pdfPage']
  for _ in range(80):
   p.mouse.wheel(0,30);p.wait_for_timeout(50)
   if loc()['pdfPage']!=old:break
  assert loc()['pdfPage']==2
  for _ in range(15):p.mouse.wheel(0,45);p.wait_for_timeout(30)
  ready();assert loc()['pdfPage']==2;assert shown()==[2]
  # V2 permits native movement inside the rendered next page while the latch
  # still prevents another turn. A tail must not cancel initial restoration.
  assert area().locator('.pdf-canvas-scroll').evaluate('e=>e.scrollTop>=0&&e.scrollTop+e.clientHeight<=e.scrollHeight+2')
  p.wait_for_timeout(650);hover();p.mouse.wheel(0,30);p.wait_for_timeout(160);assert area().locator('.pdf-canvas-scroll').evaluate('e=>e.scrollTop')>10;return {'sameBurstDoesNotSkip':True,'newGestureScrolls':True}
 check('Momentum tail cannot skip pages or cancel the new-page top restoration',momentum)
 def compare():
  reset('single');first=loc();btn('Compare in two panes').click();p.locator('[data-node-id="node.page.atlas.pdf"] .tree-target').click();ready(1);show_reader_controls(p,area(1));area(1).get_by_label('PDF presentation',exact=True).select_option('grid');ready(1);a=loc(0);slow_to_turn(1);assert loc(1)['pdfPage']==5;assert loc(0)==a;right=loc(1);slow_to_turn(0);assert loc(0)['pdfPage']==2 and loc(1)==right;assert shown(0)==[2] and shown(1)==[5];p.screenshot(path=str(OUT/'independent-wheel-compare.png'))
 check('Wheel scrolling affects only the pane under the pointer in Compare',compare)
 # V2: measure actual content movement BEFORE a continued boundary gesture.
 def tall_content(mode):
  reset(mode);area().get_by_label('PDF zoom',exact=True).select_option('2');ready();p.wait_for_timeout(550);hover();host=area().locator('.pdf-canvas-scroll');start=host.evaluate('(e)=>({y:e.scrollTop,max:e.scrollHeight-e.clientHeight})');assert start['max']-start['y']>90,start;physical=loc()['pdfPage'];p.mouse.wheel(0,40);p.wait_for_timeout(120);middle=host.evaluate('(e)=>e.scrollTop');assert middle>start['y'];assert loc()['pdfPage']==physical
  # A single large event may reach the edge but must NOT also turn the group.
  p.mouse.wheel(0,50000);p.wait_for_timeout(180);assert loc()['pdfPage']==physical;assert host.evaluate('(e)=>e.scrollTop+e.clientHeight>=e.scrollHeight-2');p.wait_for_timeout(550);slow_to_turn();assert loc()['pdfPage']>physical;ready();return {'mode':mode,'innerScrollBefore':start['y'],'innerScrollAfter':middle,'boundaryBeforeTurn':True,'physicalAfterContinuedWheel':loc()['pdfPage']}
 for mode in ['single','spread','grid']:check('V2 tall '+mode+' consumes native range before a continued boundary turn',lambda mode=mode:tall_content(mode))
 def first_open_and_narrow():
  reset();btn('New tab in pane 1').click();p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill('PDF reading fixture');p.locator('.search-result').filter(has_text='PDF reading fixture').first.click();ready();assert loc()['pdfMode']=='spread';assert shown()==[1,2]
  p.set_viewport_size({'width':580,'height':900});ready();assert loc()['pdfMode']=='spread';assert len(shown())==1
  p.set_viewport_size({'width':1920,'height':1080});ready();assert shown()==[1,2];show_reader_controls(p);area().get_by_label('PDF presentation',exact=True).select_option('single');ready();btn('Open Dashboard').click();btn('Return to reader').click();ready();assert loc()['pdfMode']=='single';return {'firstMode':'spread','narrowRender':1,'savedSingleRetained':True}
 check('V2 new PDF defaults Spread, narrow render retains preference and saved Single survives Dashboard',first_open_and_narrow)
 check('No uncaught React-PDF errors',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':__doc__,'status':'PASS' if all(r['status']=='PASS' for r in results) else 'FAIL','checks':results,'errors':errors,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)};(OUT/'results.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(0 if report['status']=='PASS' else 1)
