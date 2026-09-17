from browser_support import state_action
from browser_support import bookmark_position,open_saved_manager,inspect_pdf_term,show_reader_controls
"""Actual React-PDF canvases and interactions on about:blank; in-memory store.
Does not claim real-origin IndexedDB, deployment or persisted restore coverage.
"""
import json,os,time,traceback,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,close_panels,open_more
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.3/engine'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server(dom_only=True,dist='.build/engine-dom');results=[]
with sync_playwright() as pw:
 browser=launch(pw);p=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True);p.set_default_timeout(10000)
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.expose_function('atlasTestSHA256',lambda a:list(hashlib.sha256(bytes(a)).digest()))
 css=[str(x.relative_to(ROOT/'.build/engine-dom')) for x in (ROOT/'.build/engine-dom/assets').glob('*.css')]
 script=next((ROOT/'.build/engine-dom/assets').glob('harness-*.js')).name
 p.set_content('<!doctype html><html><head><base href="'+base+'">'+''.join('<link rel="stylesheet" href="'+x+'">' for x in css)+'</head><body><div id="root"></div></body></html>')
 p.add_script_tag(url=base+'app/vendor/jszip.js');p.add_script_tag(url=base+'app/vendor/prism.js')
 p.evaluate('''async({base,script})=>{
  if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(_,data)=>new Uint8Array(await window.atlasTestSHA256(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer}});
  history.replaceState=()=>{};
  const {mount}=await import(base+'assets/'+script);mount(await(await fetch(base+'content.json')).json());
 }''',{'base':base,'script':script})
 def button(name):return p.get_by_role('button',name=name,exact=True)
 def session():return p.evaluate('testSlots.activeSession(testStore.state.personal)')
 def field():return p.locator('.active-pane input[aria-label="Physical PDF page number"]')
 def number():return int(field().input_value())
 def canvas():return p.locator('.active-pane .pdf-canvas-scroll')
 def wait():
  p.locator('.active-pane .integrated-pdf[data-pdf-state="ready"] [data-page-rendered="true"] canvas').first.wait_for();p.wait_for_timeout(220);assert p.locator('.pdf-fallback').count()==0
 def reset():
  close_panels(p);p.set_viewport_size({'width':1440,'height':900});p.evaluate('testReset()');wait()
 def show():show_reader_controls(p)
 def goto(n):
  show();field().fill(str(n));field().press('Enter');wait();assert number()==n
 def wheel(delta):
  box=canvas().bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.wheel(0,delta)
 def to_bottom():
  for _ in range(45):
   if canvas().evaluate('(e)=>e.scrollTop+e.clientHeight>=e.scrollHeight-2'):return
   wheel(180);p.wait_for_timeout(80)
  raise AssertionError('Could not naturally scroll to bottom')
 def check(name,fn):
  try:
   detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:
   results.append({'name':name,'status':'FAIL','error':str(e)});print('FAIL',name,str(e),flush=True);traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
 def load():
  wait();assert p.locator('.pdf-controls:visible').count()==0;assert p.locator('.pdf-companion').count()==0;assert p.locator('.active-pane canvas').count()==1
  return {'engine':p.locator('.integrated-pdf').get_attribute('data-pdf-engine-version'),'defaultControlsHidden':True,'bottomCompanionPanels':0}
 check('Actual PDF.js canvas loads with hidden controls and no bottom companion module',load)
 def slow():
  reset();goto(1);to_bottom();assert number()==1;p.wait_for_timeout(600)
  for _ in range(3):wheel(30);p.wait_for_timeout(350)
  wait();assert number()==2;assert p.locator('.active-pane [data-physical-page="2"]').is_visible();p.wait_for_timeout(600);wheel(-120);p.wait_for_timeout(300)
  # V2: first reverse intent consumes any remaining top padding natively.
  if number()==2:wheel(-120);p.wait_for_timeout(300)
  wait();assert number()==1
  return {'forward':2,'back':1,'gesture':'3 x 30 pixels at 350ms intervals; no synthetic scrollTop'}
 check('Natural single-page scroll reaches edge; slow wheel ticks advance and reverse correctly',slow)
 def burst():
  reset();goto(1);to_bottom();p.wait_for_timeout(600)
  # Pointer geometry is stable here. Repeated bounding-box/move RPCs can split
  # the intended burst into separate gestures on a busy browser.
  box=canvas().bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
  canvas().evaluate('e=>{window.componentWheelTimes=[];e.addEventListener("wheel",()=>componentWheelTimes.push(performance.now()),{passive:true});}')
  for _ in range(70):p.mouse.wheel(0,15);p.wait_for_timeout(20)
  wait();times=p.evaluate('componentWheelTimes');gaps=[b-a for a,b in zip(times,times[1:])]
  (OUT/'momentum-timing.json').write_text(json.dumps({'times':times,'gaps':gaps,'physicalPage':number()},indent=2))
  assert len(times)==70 and max(gaps)<=220,{'error':'Browser did not deliver one continuous wheel gesture','maxGap':max(gaps) if gaps else None}
  assert number()==2
 check('One continuous momentum burst does not skip multiple physical pages',burst)
 def spread():
  reset();button('Quick PDF Spread').click();wait();assert p.locator('.active-pane [data-physical-page]').count()==2;assert session()['panes'][0]['views'][0]['history'][0]['pdfMode']=='spread';button('Quick PDF Spread').click();wait();assert p.locator('.active-pane [data-physical-page]').count()==1
 check('Quick PDF Spread controls one document, separately from Compare',spread)
 def tree_links():
  reset();row=p.locator('[data-node-id="node.page.atlas.pdf"]');row.locator('.tree-expander').click();button('Expand PDF category Reading a PDF').click();p.locator('.pdf-study-page .tree-target').filter(has_text='Links, page state and notes').click();wait();assert number()==4
  p.locator('.pdf-study-page .tree-target').filter(has_text='Selectable text and language pairs').click();wait();assert number()==2;assert p.locator('.active-pane .react-pdf__Page__textContent').inner_text().find('QA-ANCHOR-BRAVO')>=0
  inspect_pdf_term(p,'Displayed snippet');assert p.locator('dialog[open]').is_visible();p.keyboard.press('Escape');p.locator('.tree-scroll').evaluate('(e)=>e.scrollTop=0');p.screenshot(path=str(OUT/'integrated-tree-reader.png'))
 check('Sidebar page headings and on-demand definitions navigate actual physical PDF pages',tree_links)
 def state_restore():
  reset();goto(2);wheel(260);p.wait_for_timeout(300)
  state_action(p,'Save current workspace state');p.wait_for_timeout(240);saved=p.evaluate('testStore.state.personal.savedStates.entries[0].session');before=canvas().evaluate('(e)=>e.scrollTop');assert before>50
  goto(4);state_action(p,'Restore last workspace save');wait();assert number()==2;assert session()==saved;after=canvas().evaluate('(e)=>e.scrollTop');assert abs(before-after)<=3,(before,after)
  return {'savedPage':2,'restoredPage':number(),'scrollBefore':before,'scrollAfter':after,'exactSession':True}
 check('Workspace state save/restore retains actual PDF intra-page scroll and all session fields',state_restore)
 def comparesave():
  reset();goto(2);a=session()['panes'][0];button('Compare in two panes').click();p.locator('[data-node-id="node.page.atlas.rotated"] .tree-target').click();wait();goto(4)
  state_action(p,'Save all workspace states');p.wait_for_timeout(200);expected=session();button('Swap panes').click();button('Collapse pane A').click();p.wait_for_timeout(200);state_action(p,'Restore last all-workspaces save');wait();assert session()==expected;assert session()['panes'][0]==a;assert p.locator('.integrated-pdf').count()==2
 check('All-state restore preserves two independent PDFs, pane order and collapse state',comparesave)
 def extract():
  reset();open_more(p).get_by_role('button',name='Manage PDF details',exact=True).click();button('Prepare AI companion').click();button('Extract locally').click();button('Download AI input part 1').wait_for();assert 'Nothing has been uploaded' in p.locator('dialog').inner_text();p.keyboard.press('Escape')
 check('Local text preparation remains available on demand, without a reader module',extract)
 def edit():
  reset();open_more(p).get_by_role('button',name='Manage PDF details',exact=True).click();field=p.get_by_role('textbox',name='Concept label',exact=True);field.fill('Physical page - reviewed');button('Save companion locally').click();p.locator('dialog').wait_for(state='detached');assert p.evaluate('Object.values(testStore.state.overlays.companions)[0].terms[0].label')=='Physical page - reviewed';assert number()==1
  p.locator('[data-node-id="node.page.atlas.pdf"] .tree-expander').click();inspect_pdf_term(p,'Physical page - reviewed');button('Promote to global glossary').click();p.locator('dialog').wait_for(state='detached');assert p.evaluate('testStore.state.overlays.glossary.length')==1;assert number()==1;inspect_pdf_term(p,'Physical page - reviewed');assert button('In global glossary').is_disabled();p.keyboard.press('Escape')
 check('On-demand metadata editing and promotion preserve PDF content and physical position',edit)
 def continuous():
  reset();show();p.get_by_role('combobox',name='PDF presentation',exact=True).select_option('continuous');wait();wheel(1600);p.wait_for_timeout(600);assert number()>=2
 check('Continuous mode keeps native scrolling rather than discrete page turns',continuous)
 check('No uncaught PDF or UI errors',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':'Actual React-PDF/PDF.js using shipped synthetic PDF fixtures and browser interactions, about:blank with in-memory store; no normal-origin or IndexedDB claim','checks':results,'errors':errors,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results)}
 (OUT/'results.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(1 if report['failed'] else 0)
