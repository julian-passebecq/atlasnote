"""V3 long-PDF Continuous windowing on the integrated build (real PDF.js).

The reader fixture request is intercepted and answered with a generated,
text-only 400-page PDF (original synthetic content, no third-party bytes).
Playwright wheel injection only; not physical mouse/trackpad evidence.
"""
import json,os,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/pdf-window'));OUT.mkdir(parents=True,exist_ok=True)
PAGES=400
def synthetic_pdf(n):
 objs=['<< /Type /Catalog /Pages 2 0 R >>',None,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
 kids=[]
 for i in range(1,n+1):
  stream=('BT /F1 40 Tf 72 700 Td (Synthetic page %d) Tj ET BT /F1 12 Tf 72 660 Td (V3 continuous window fixture, page %d of %d) Tj ET'%(i,i,n)).encode()
  objs.append('<< /Length %d >>\nstream\n'%len(stream)+stream.decode()+'\nendstream')
  objs.append('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>'%(len(objs)))
  kids.append(len(objs))
 objs[1]='<< /Type /Pages /Kids [%s] /Count %d >>'%(' '.join('%d 0 R'%k for k in kids),n)
 out=bytearray(b'%PDF-1.4\n');offsets=[]
 for i,o in enumerate(objs,1):offsets.append(len(out));out+=('%d 0 obj\n%s\nendobj\n'%(i,o)).encode('latin-1')
 xref=len(out);out+=('xref\n0 %d\n0000000000 65535 f \n'%(len(objs)+1)).encode()
 for off in offsets:out+=('%010d 00000 n \n'%off).encode()
 out+=('trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n'%(len(objs)+1,xref)).encode();return bytes(out)
pdf=synthetic_pdf(PAGES);results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900});p=ctx.new_page();p.set_default_timeout(20000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.route('**/content-assets/atlas.reader-guide@1.0.1/assets/atlas-reader-fixture.pdf',lambda r:r.fulfill(status=200,body=pdf,headers={'content-type':'application/pdf','cache-control':'no-store'}))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 pane=p.locator('.active-pane');scroller=pane.locator('.pdf-canvas-scroll')
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def current():return int(pane.locator('.pdf-page-compact input').input_value())
 def open_long():
  p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
  pane.locator('[data-page-rendered="true"] canvas').first.wait_for()
  show=pane.get_by_role('button',name='Show reader controls',exact=True)
  if show.count():show.click()
  pane.get_by_label('PDF presentation',exact=True).select_option('continuous')
  hide=pane.get_by_role('button',name='Hide reader controls',exact=True)
  if hide.count():hide.click()
  expect(pane.locator('.pdf-page-compact-count')).to_have_text('/ '+str(PAGES))
  wrappers=pane.locator('[data-physical-page]').count()
  assert wrappers<=60,'rendered %d wrappers for %d pages'%(wrappers,PAGES)
  expect(pane.locator('[data-window-spacer="bottom"]')).to_have_count(1)
  return {'pages':PAGES,'renderedWrappers':wrappers}
 check('400-page Continuous PDF renders a bounded wrapper window with a measured spacer',open_long)
 def jump():
  f=pane.get_by_label('Physical PDF page number (compact)',exact=True);t0=time.perf_counter();f.fill('250');f.press('Enter')
  pane.locator('[data-physical-page="250"][data-page-rendered="true"]').wait_for();ms=round((time.perf_counter()-t0)*1000)
  top=scroller.evaluate('(el)=>el.querySelector(\'[data-physical-page="250"]\').getBoundingClientRect().top-el.getBoundingClientRect().top')
  assert abs(top)<60,'page 250 not at the viewport top: %s'%top
  assert pane.locator('[data-physical-page]').count()<=60
  return {'jumpMs':ms,'topOffsetPx':round(top)}
 check('Direct jump to page 250 renders and anchors it without mounting 250 wrappers',jump)
 def monotonic():
  scroller.hover();seen=[current()]
  for _ in range(40):p.mouse.wheel(0,400);p.wait_for_timeout(60);seen.append(current())
  p.wait_for_timeout(400);seen.append(current())
  back=[(a,b2) for a,b2 in zip(seen,seen[1:]) if b2<a]
  assert not back,'backward page transitions during forward wheel: %s'%back
  assert seen[-1]>seen[0],'did not advance: %s'%seen
  assert pane.locator('[data-physical-page]').count()<=60
  return {'from':seen[0],'to':seen[-1]}
 check('Forward wheel scrolling across window shifts is monotonic (no backward jump)',monotonic)
 def drag():
  scroller.dispatch_event('pointerdown')
  scroller.evaluate('(el)=>{el.scrollTop=el.scrollHeight*0.3;}');p.wait_for_timeout(700)
  scroller.evaluate('(el)=>el.dispatchEvent(new Event("scroll"))');p.wait_for_timeout(700)
  n=current();assert 0.2*PAGES<=n<=0.4*PAGES,'scrollbar position 30%% mapped to page %d'%n
  pane.locator('[data-physical-page="%d"]'%n).wait_for()
  return {'mappedPage':n}
 check('A scrollbar jump into a spacer maps to the physical page from measured geometry',drag)
 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-pdf-window','scope':'Playwright Chromium, integrated build, generated 400-page PDF via request interception','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
