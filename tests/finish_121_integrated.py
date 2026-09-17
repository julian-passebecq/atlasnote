"""1.2.1 hosted acceptance: actual PDF.js canvases, no iframe substitutions.
An unavailable integrated distribution or browser policy block is exit 2.
"""
import os,json,traceback,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,show_reader_controls
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.1/finish-integrated'));OUT.mkdir(parents=True,exist_ok=True)
CASES=[('projection','Strict two-way tree discovery'),('pinned','Exact pinned public references'),('assets','Verified worker, CMaps, WASM and standard fonts'),('normal','Actual integrated canvas, no native toolbar or intro'),('geometry','Four viewport document-space measurements'),('info','On-demand provenance and original actions'),('focus','Focus requests the actual browser Fullscreen API when available'),('arrows','Focus arrows navigate physical pages outside inputs'),('exit','Fullscreen/CSS Focus exit restores the shell'),('spread','Physical-page spread screenshot'),('compare','PDF/note independent Compare screenshot'),('slate','Dark Slate integrated PDF screenshot'),('fallback','Intentional worker failure exposes usable compact native fallback'),('errors','No uncaught errors')]
results=[];phase='projection';errors=[];meta=ROOT/'dist/pdf-assets/engine.json'
def record(key,detail=None):results.append({'id':key,'name':dict(CASES)[key],'status':'PASS','detail':detail});print('PASS',key,flush=True)
def finish(status):
 report={'scope':'Actual hosted integrated PDF build on normal origin, no fake PDF renderer','status':status,'checks':results,'errors':errors};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));raise SystemExit(0 if status=='PASS' else 2 if status=='BLOCKED' else 1)
if not meta.exists():
 results=[{'id':key,'name':name,'status':'BLOCKED','error':'Integrated dist/pdf-assets/engine.json is unavailable. Real dependency installation/build is required; fallback output is not accepted.'} for key,name in CASES];finish('BLOCKED')
try:
 base=start_server()
 with sync_playwright() as pw:
  b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900},accept_downloads=True);p.set_default_timeout(20000);p.on('pageerror',lambda e:errors.append(str(e)))
  p.add_init_script('''window.fs121Actual=[];const original=Element.prototype.requestFullscreen;if(original)Element.prototype.requestFullscreen=function(...args){fs121Actual.push({activation:navigator.userActivation?.isActive});return original.apply(this,args);};''')
  p.goto(base,wait_until='networkidle')
  def search(title):
   p.get_by_role('button',name='Global search',exact=True).click();p.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click()
  def shot(name):p.screenshot(path=str(OUT/(name+'.png')))
  assert p.locator('.tree-project').filter(has_text='PDF Atlas').count()==0;shot('notes-mode')
  p.get_by_role('button',name='PDF content',exact=True).click();assert p.locator('.sidebar-heading').inner_text().strip()=='';assert p.get_by_role('button',name='Notebook content',exact=True).is_visible();assert p.locator('.tree-project').filter(has_text='Example project').count()==0;shot('pdf-library-mode');p.get_by_role('button',name='Notebook content',exact=True).click();record(phase)
  phase='pinned';content=json.loads((ROOT/'dist/content.json').read_text());docs=[d for pack in content['packs'] if pack['manifest']['id']=='pdfatlas.public' for d in pack['documents']];assert len(docs)==2;assert all('/fa5e83f7825cdc837078f87c5e130cb012332195/library/' in d['source']['url'] for d in docs);record(phase)
  phase='assets';inventory=json.loads((ROOT/'dist/pdf-assets/integrity.json').read_text());assert inventory['pdfjs']=='5.4.296';assert inventory['reactPdf']=='10.5.0'
  for relative,expected in inventory['files'].items():assert hashlib.sha256((ROOT/'dist/pdf-assets'/relative).read_bytes()).hexdigest()==expected
  for prefix in ['pdf.worker.min.mjs','cmaps/','wasm/','standard_fonts/']:assert any(n.startswith(prefix) for n in inventory['files'])
  record(phase,{'verifiedAssets':len(inventory['files'])})
  phase='normal';search('PDF reading fixture');p.locator('.integrated-pdf[data-pdf-state="ready"] canvas').first.wait_for();assert p.locator('.pdf-intro,.pdf-fallback').count()==0;assert p.locator('.integrated-pdf').get_attribute('data-worker-status')=='compatible';record(phase)
  phase='geometry';assert p.locator('.pdf-companion').count()==0;assert p.locator('.pdf-controls:visible').count()==0;show_reader_controls(p);measurements=[]
  for w,h in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(500);pane=p.locator('.document-pane').bounding_box();canvas=p.locator('.pdf-canvas-scroll').bounding_box();controls=p.locator('.pdf-controls').bounding_box();assert canvas['height']/pane['height']>=.70,(pane,canvas);assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1;assert p.locator('.pdf-canvas-scroll').evaluate('e=>e.scrollWidth-e.clientWidth')<=1
   measurements.append({'width':w,'height':h,'pane':pane,'canvas':canvas,'controls':controls,'canvasFraction':canvas['height']/pane['height']});shot('integrated-normal-'+str(w))
  record(phase,measurements);p.set_viewport_size({'width':1440,'height':900})
  phase='info';p.get_by_role('button',name='Document info',exact=True).click();assert 'SHA-256' in p.locator('.pdf-info-overlay').inner_text();assert p.locator('.pdf-info-overlay').get_by_role('link',name='Open original PDF',exact=True).count()==1;p.get_by_role('button',name='Close document info',exact=True).click();record(phase)
  phase='focus';p.get_by_role('button',name='Enter focus mode',exact=True).click();p.wait_for_timeout(500);assert p.locator('.focus-mode').count()==1;assert p.locator('.sidebar-navigation:visible,.navigation-dock:visible,.pane-tabbar:visible,.reader-rail:visible,.context-drawer:visible').count()==0;assert p.locator('.pdf-controls').is_visible();assert p.locator('.pdf-fallback').count()==0
  calls=p.evaluate('fs121Actual');available=p.evaluate('!!Element.prototype.requestFullscreen');assert not available or len(calls)==1 and calls[0]['activation'];granted=p.evaluate('!!document.fullscreenElement');shot('integrated-focus');record(phase,{'nativeApiAvailable':available,'requests':calls,'actualFullscreenGranted':granted,'browserChromeRemovalNotVisuallyCertified':True})
  phase='arrows'
  # New PDFs default to Spread, whose ArrowRight correctly advances to page 3.
  # This check exercises single-page navigation and input-key isolation.
  p.get_by_role('combobox',name='PDF presentation').select_option('single')
  field=p.get_by_role('spinbutton',name='Physical PDF page number');field.fill('1');field.press('Enter');expect(field).to_have_value('1')
  p.locator('.pdf-canvas-scroll').focus();p.keyboard.press('ArrowRight');expect(field).to_have_value('2')
  field.focus();p.keyboard.press('ArrowLeft');expect(field).to_have_value('2');record(phase)
  phase='exit';p.keyboard.press('Escape');p.wait_for_timeout(400);assert p.locator('.focus-mode').count()==0;assert not p.evaluate('!!document.fullscreenElement');assert p.locator('.topbar').count()==0;assert p.locator('.sidebar-navigation').is_visible();record(phase)
  phase='spread';p.set_viewport_size({'width':1920,'height':1080});p.get_by_role('combobox',name='PDF presentation').select_option('spread');p.wait_for_timeout(500);assert p.locator('.physical-page').count()==2;shot('integrated-spread');record(phase)
  phase='compare';p.get_by_role('button',name='Compare in two panes',exact=True).click();search('One note, several ways to read');assert p.locator('.integrated-pdf').count()==1;assert p.locator('.reader-body').count()==1;shot('integrated-note-pdf-compare');record(phase)
  phase='slate';p.get_by_role('button',name='Theme',exact=True).click();p.get_by_role('button',name='Dark Slate',exact=True).click();p.wait_for_timeout(200);shot('integrated-dark-slate');record(phase)
  phase='fallback';p.route('**/pdf-assets/engine.json',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'reactPdf':'10.5.0','pdfjs':'0.0.0'})));p.reload(wait_until='networkidle');p.get_by_role('button',name='Use browser PDF fallback',exact=True).click();p.locator('.pdf-fallback').wait_for();assert p.locator('.pdf-intro').count()==0;assert p.locator('.pdf-fallback-strip').bounding_box()['height']<=36;shot('intentional-worker-failure-fallback');record(phase,{'failureInjected':'worker metadata mismatch','normalPathPreviouslyRenderedActualCanvas':True})
  phase='errors';assert errors==[],errors;record(phase);b.close()
except Exception as e:
 status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) or "Executable doesn't exist" in str(e) else 'FAIL';results.append({'id':phase,'name':dict(CASES)[phase],'status':status,'error':str(e)});traceback.print_exc();covered={r['id'] for r in results}
 results.extend({'id':key,'name':name,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'} for key,name in CASES if key not in covered)
finish('FAIL' if errors or any(x['status']=='FAIL' for x in results) else 'BLOCKED' if any(x['status']=='BLOCKED' for x in results) else 'PASS')
