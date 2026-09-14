"""1.2.1 actual components in the permitted DOM harness.
Fullscreen APIs are explicitly simulated; no normal-origin/IndexedDB/React-PDF
certification is inferred from these checks or from native fallback screenshots.
"""
import os,json,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,mount_dom,open_context,open_more
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.1/finish-ui'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server(dom_only=True);results=[]
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(6000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base)
 def check(name,fn):
  try:
   value=fn();results.append({'name':name,'status':'PASS','detail':value});print('PASS',name,flush=True)
  except Exception as e:
   results.append({'name':name,'status':'FAIL','error':str(e)});print('FAIL',name,str(e),flush=True);traceback.print_exc()
   try:p.screenshot(path=str(OUT/f'FAIL-{len(results)}.png'))
   except Exception:pass
 def reset(id='page.atlas.layouts'):
  p.keyboard.press('Escape');p.evaluate('''id=>{window.atlasPdfLoader=undefined;testReset(id);}''',id);p.set_viewport_size({'width':1440,'height':900});p.wait_for_timeout(350)
 def shot(name):p.screenshot(path=str(OUT/(name+'.png')))
 def nodes():return p.locator('.tree-scroll [data-node-id]').evaluate_all('(es)=>es.map(e=>e.dataset.nodeId)')
 def toggle():p.locator('.topbar .mode-switch').click() if p.locator('.topbar .mode-switch').count() else p.get_by_role('button',name='Switch to PDF library' if p.get_by_role('button',name='Switch to PDF library',exact=True).count() else 'Switch to notes',exact=True).click()
 def strict_modes():
  reset();before=nodes();assert 'node.pdfatlas.spark-concepts' not in before;assert 'node.page.atlas.pdf' not in before;assert p.locator('.tree-project').filter(has_text='PDF Atlas').count()==0
  assert '11 notebooks' in p.locator('.statusbar').inner_text();assert 'notes' in p.locator('.statusbar').inner_text();heading=p.locator('.sidebar-heading').inner_text();toggle();p.get_by_role('button',name='Switch to notes',exact=True).wait_for();assert p.locator('.sidebar-heading').inner_text().strip()=='';pdf=nodes();assert 'PDFs' in p.locator('.statusbar').inner_text();assert 'node.page.atlas.layouts' not in pdf;assert 'node.pdfatlas.spark-concepts' in pdf;assert 'node.pdfatlas.pyspark-pandas' in pdf
  toggle();assert nodes()==before;assert p.locator('.sidebar-heading').inner_text()==heading
  return {'noteNodeIds':before,'pdfNodeIds':pdf,'exactReturn':True}
 check('Strict two-way discovery and exact returned Notes projection/count',strict_modes)
 def keyboard_toggle():
  reset();before=nodes();button=p.get_by_role('button',name='Switch to PDF library',exact=True);button.focus();p.keyboard.press('Enter');p.get_by_role('button',name='Switch to notes',exact=True).wait_for();p.keyboard.press('Space');assert nodes()==before
  p.get_by_role('button',name='Switch to PDF library',exact=True).dblclick();assert nodes()==before;assert p.evaluate('testStore.state.personal.session.libraryMode')=='notes'
 check('Keyboard activation and rapid double click deterministically return Notes',keyboard_toggle)
 def open_pdf_preserved():
  reset('page.atlas.pdf');p.locator('.pdf-fallback').wait_for();p.evaluate('''()=>{testStore.personal(s=>{const v=s.session.panes[0].views[0],l=testCore.current(v);l.pdfPage=3;l.zoom=1.5;l.rotation=90;l.cover=true;l.pdfMode='spread';s.notes['page.atlas.pdf']={pageId:'page.atlas.pdf',text:'EXACT_PDF_REMARK',updatedAt:1};});}''')
  before=p.evaluate('structuredClone(testStore.state)');toggle();toggle();after=p.evaluate('structuredClone(testStore.state)')
  assert before['personal']['session']['panes']==after['personal']['session']['panes'];assert before['personal']['notes']==after['personal']['notes'];assert before['personal']['bookmarks']==after['personal']['bookmarks'];assert before['overlays']==after['overlays'];assert before['assets']==after['assets'];assert p.locator('.pdf-fallback').count()==1
  return {'panesExact':True,'remarksExact':True,'openPDFRemains':True}
 check('Open PDF state, history, remarks, bytes and placements survive discovery switches',open_pdf_preserved)
 def search_filter():
  reset();p.get_by_role('button',name='Filter tree',exact=True).click();p.get_by_role('textbox',name='Filter notebook tree').fill('PDF');assert 'node.page.atlas.pdf' not in nodes();assert 'node.pdfatlas.spark-concepts' not in nodes();toggle();p.get_by_role('textbox',name='Filter notebook tree').fill('language');assert 'node.page.atlas.language' not in nodes();p.get_by_role('textbox',name='Filter notebook tree').fill('');toggle()
  p.get_by_role('button',name='Global search',exact=True).click();p.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill('PDF reading fixture');assert p.locator('.search-result').filter(has_text='PDF reading fixture').count()>0;p.keyboard.press('Escape')
 check('Tree filter cannot resurrect hidden types; global search remains cross-content',search_filter)
 def archived():
  reset();p.evaluate("testStore.overlays(o=>o.archived.push('node.atlas.documents','node.page.atlas.language','project.pdfatlas'))");assert 'node.page.atlas.language' not in nodes();toggle();assert 'node.atlas.documents' not in nodes();assert 'node.pdfatlas.spark-concepts' not in nodes();toggle();assert 'node.page.atlas.language' not in nodes()
 check('Archived branches and leaves remain absent in both discovery modes',archived)
 def geometry():
  rows=[]
  for w,h in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   reset();p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(200);shot('notes-'+str(w));toggle()
   if w<900 and p.get_by_role('button',name='Open notebook sidebar',exact=True).count():p.get_by_role('button',name='Open notebook sidebar',exact=True).click()
   shot('pdf-library-'+str(w))
   p.evaluate("testReset('page.atlas.pdf')");p.wait_for_timeout(250)
   if p.locator('.library-sidebar').is_visible() and w<900:p.get_by_role('button',name='Collapse notebook sidebar',exact=True).click()
   frame=p.locator('.pdf-fallback');frame.wait_for();assert p.locator('.pdf-companion').count()==0;p.wait_for_timeout(100);pane=p.locator('.document-pane').bounding_box();box=frame.bounding_box();strip=p.locator('.pdf-fallback-strip').bounding_box()
   assert strip['height']<=36,strip;assert box['height']/pane['height']>=.75,(pane,box)
   assert p.locator('.pdf-intro').count()==0;assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   rows.append({'width':w,'height':h,'pane':pane,'fallbackFrame':box,'compactStrip':strip,'documentFraction':box['height']/pane['height'],'renderer':'native fallback, NOT integrated PDF evidence'});shot('fallback-normal-'+str(w))
  return rows
 check('Actual fallback geometry with sidebar study navigation at all four viewports: no intro, compact strip, canvas >=75%',geometry)
 def metadata():
  reset('page.atlas.pdf');p.get_by_role('button',name='Document info',exact=True).click();info=p.locator('.pdf-info-overlay');assert info.is_visible();assert 'SHA-256' in info.inner_text();assert 'Rights' in info.inner_text();assert 'Original bytes' in info.inner_text();assert info.get_by_role('link',name='Download original',exact=True).count()==1
  p.get_by_role('button',name='Close document info',exact=True).click();assert p.locator('.pdf-info-overlay').count()==0;open_context(p);assert p.locator('.context-panel .pdf-document-info').count()==1;shot('document-info-context')
 check('Rights, exact hash, size, provenance and original actions remain in on-demand info',metadata)
 def install_fullscreen():
  reset();p.evaluate('''()=>{
   const root=document.querySelector('.atlas-app');window.fs121={mode:'grant',owner:null,requests:[],exits:0,inClick:false};
   document.addEventListener('click',()=>{fs121.inClick=true;queueMicrotask(()=>{fs121.inClick=false;});},true);
   Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>fs121.owner});
   Object.defineProperty(root,'requestFullscreen',{configurable:true,value:()=>{fs121.requests.push({stack:new Error().stack,active:navigator.userActivation?.isActive});if(fs121.mode==='reject')return Promise.reject(Error('Simulated fullscreen policy rejection'));fs121.owner=root;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();}});
   Object.defineProperty(document,'exitFullscreen',{configurable:true,value:()=>{fs121.exits++;fs121.owner=null;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();}});
  }''')
 def granted():
  install_fullscreen();before=p.evaluate('structuredClone(testStore.state.personal.session)');open_context(p,'Remarks');p.get_by_role('button',name='Enter focus mode',exact=True).click();assert p.locator('.focus-mode').count()==1;assert p.locator('.context-drawer').count()==0
  fs=p.evaluate('({requests:fs121.requests,owned:fs121.owner===document.querySelector(".atlas-app")})');assert fs['owned'];assert 'toggleFocus' in fs['requests'][0]['stack'];assert fs['requests'][0]['active'];shot('simulated-fullscreen-focus')
  p.evaluate("fs121.owner=null;document.dispatchEvent(new Event('fullscreenchange'))");p.wait_for_timeout(100);after=p.evaluate('testStore.state.personal.session');assert not after['focus'];assert [before['leftOpen'],before['rightOpen']]==[after['leftOpen'],after['rightOpen']]
  return {'scope':'Simulated Fullscreen API grant/event; actual click activation and app DOM/state','request':fs['requests'][0]}
 check('Focus click calls Fullscreen API in activation; fullscreenchange exits and restores panels',granted)
 def rejected():
  reset('page.atlas.pdf');p.evaluate("fs121.mode='reject'");p.get_by_role('button',name='Enter focus mode',exact=True).click();p.wait_for_timeout(100);assert p.locator('.focus-mode').count()==1;assert p.locator('.reader-rail:visible').count()==0;assert p.locator('.pdf-fallback').is_visible();shot('fallback-focus-policy-rejected');p.keyboard.press('Escape');assert p.locator('.focus-mode').count()==0
  return {'scope':'Simulated rejected Fullscreen API; CSS Focus and Escape remain functional'}
 check('Fullscreen rejection degrades to usable PDF CSS Focus without error loop',rejected)
 def programmatic():
  reset();p.evaluate("fs121.mode='grant'");before=p.evaluate('fs121.exits');p.get_by_role('button',name='Enter focus mode',exact=True).click();p.evaluate('testStore.personal(s=>{s.session.focus=false;})');p.wait_for_timeout(100);assert p.evaluate('fs121.exits')==before+1;assert p.evaluate('fs121.owner') is None
  before=p.evaluate('fs121.requests.length');p.evaluate('testStore.personal(s=>{s.session.focus=true;})');p.wait_for_timeout(100);assert p.evaluate('fs121.requests.length')==before;p.keyboard.press('Escape')
 check('Programmatic exit releases only owned fullscreen; restored Focus never auto-requests it',programmatic)
 def engine_failure():
  for mode in ['rejected','thrown','bad-export']:
   reset();p.evaluate('''mode=>{window.atlasPdfLoader=()=>{if(mode==='thrown')throw Error('Intentional engine fixture failure');if(mode==='bad-export')return Promise.resolve({});return Promise.reject(Error('Intentional engine fixture failure'));};testReset('page.atlas.pdf');}''',mode)
   p.locator('.pdf-fallback').wait_for();assert p.locator('.pdf-intro').count()==0;p.get_by_role('button',name='Document info',exact=True).click();assert 'engine unavailable' in p.locator('.pdf-info-overlay').inner_text();p.get_by_role('button',name='Close document info',exact=True).click();p.get_by_role('button',name='Retry integrated PDF',exact=True).click();p.locator('.pdf-fallback').wait_for()
  return {'scope':'Intentional adapter load failures, not a mock successful PDF engine','paths':['Promise rejection','synchronous throw','missing export'],'nativeFallback':True,'retryControl':True}
 check('Engine chunk failures are contained; compact fallback and retry remain available',engine_failure)
 def theme_compare():
  reset('page.atlas.pdf');toggle();p.get_by_role('button',name='Compare in two panes',exact=True).click();p.locator('[data-node-id="node.page.atlas.rotated"] .tree-target').click();assert p.locator('.pdf-fallback').count()==2;shot('fallback-pdf-pdf-compare');toggle();p.locator('[data-node-id="node.page.atlas.language"] .tree-target').click();assert p.locator('.pdf-fallback').count()==1;assert p.locator('.reader-body').count()==1;shot('fallback-note-pdf-compare');p.get_by_role('button',name='Theme',exact=True).click();p.get_by_role('button',name='Dark Slate',exact=True).click();shot('dark-slate-fallback-compare')
 check('Native fallback retains independent PDF/PDF and PDF/note Compare plus Dark Slate',theme_compare)
 def home_counts():
  reset();open_more(p).get_by_role('button',name='Home',exact=True).click();assert p.locator('.project-card').filter(has_text='PDF Atlas').count()==0;p.get_by_role('checkbox',name='Manage all notebooks',exact=True).check();assert p.locator('.project-card').filter(has_text='PDF Atlas').count()==1;p.get_by_role('checkbox',name='Manage all notebooks',exact=True).uncheck();toggle();assert p.locator('.project-card').filter(has_text='PDF Atlas').count()==1;assert p.locator('.project-card').filter(has_text='Example project').count()==0
 check('Home discovery counts match mode, with an explicit separate all-notebook management option',home_counts)
 check('No uncaught JavaScript errors in finish-pass scenarios',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':'Actual offline-compatibility DOM; in-memory storage; simulated Fullscreen API; no integrated renderer or normal-origin certification','checks':results,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results),'errors':errors}
 (OUT/'results.json').write_text(json.dumps(report,indent=2));b.close()
raise SystemExit(1 if report['failed'] else 0)
