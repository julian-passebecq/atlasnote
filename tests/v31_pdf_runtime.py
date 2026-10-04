"""V3.1 integrated PDF geometry/input regressions. Original mixed-size fixture.
Real PDF.js, normal origin, animation-frame samples and synthetic wheel input.
Not a physical-mouse/trackpad or Cloudflare qualification.
"""
import json, os, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, launch, show_reader_controls
from v23_browser_common import AGENT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v31/pdf'));OUT.mkdir(parents=True,exist_ok=True)

def mixed_pdf(count=64):
 objs=['<< /Type /Catalog /Pages 2 0 R >>',None,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];kids=[]
 for n in range(1,count+1):
  w,h=[(612,792),(792,612),(612,1500),(900,900)][(n-1)%4]
  rotation=90 if n%8==0 else 0
  text='BT /F1 24 Tf 36 %d Td (V31 original mixed geometry page %d) Tj ET'%(h-72,n)
  # Enough independent vector operations to exercise asynchronous painting.
  drawing='\n'.join('%d %d 2 2 re f'%((i*17)%(w-40)+20,(i*29)%(h-140)+20) for i in range(300))
  stream=text+'\n'+drawing;objs.append('<< /Length %d >>\nstream\n%s\nendstream'%(len(stream),stream))
  objs.append('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] /Rotate %d /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>'%(w,h,rotation,len(objs)));kids.append(len(objs))
 objs[1]='<< /Type /Pages /Kids [%s] /Count %d >>'%(' '.join('%d 0 R'%k for k in kids),count)
 out=bytearray(b'%PDF-1.4\n');offsets=[]
 for i,obj in enumerate(objs,1):offsets.append(len(out));out+=('%d 0 obj\n%s\nendobj\n'%(i,obj)).encode('ascii')
 at=len(out);out+=('xref\n0 %d\n0000000000 65535 f \n'%(len(objs)+1)).encode()
 for offset in offsets:out+=('%010d 00000 n \n'%offset).encode()
 out+=('trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n'%(len(objs)+1,at)).encode()
 return bytes(out)

SAMPLE="""()=>{window.v31frames=[];const started=performance.now();const sample=()=>{const e=document.querySelector('.active-pane .pdf-canvas-scroll');if(e){const n=e.querySelector('[data-physical-page="3"]');window.v31frames.push({t:performance.now()-started,scroll:e.scrollTop,top:n?n.getBoundingClientRect().top-e.getBoundingClientRect().top:null,painted:n?.dataset.pageRendered==='true',geometry:n?.dataset.geometryReady});}if(performance.now()-started<1100)requestAnimationFrame(sample);};requestAnimationFrame(sample);}"""
results=[];base=start_server();fixture=mixed_pdf()
with sync_playwright() as pw:
 browser=launch(pw);context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);p=context.new_page();p.set_default_timeout(20000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.route('**/content-assets/atlas.reader-guide@1.0.1/assets/atlas-reader-fixture.pdf',lambda route:route.fulfill(status=200,body=fixture,content_type='application/pdf'))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 pane=p.locator('.active-pane');scroller=pane.locator('.pdf-canvas-scroll')
 def case(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:
   results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc()
   try:p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
   except Exception:pass
  finally:(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results,'errors':errors},indent=2))
 def flag():
  version=json.loads((ROOT/'package.json').read_text())['version'];expect(p).to_have_title('AtlasNote '+version)
  b=p.get_by_role('button',name='Norsk Daily',exact=True);expect(b).to_be_visible();assert b.inner_text()==''
  assert b.locator('svg').count()==1;box=b.bounding_box();assert box['width']<=32 and box['height']>=26,box
  b.click();expect(p.get_by_role('heading',name='Norsk Daily',exact=True)).to_be_visible()
  p.get_by_role('button',name='Close Norsk Daily',exact=True).click();p.screenshot(path=str(OUT/'compact-norwegian-flag.png'))
  return {'version':version,'button':box,'accessibleName':'Norsk Daily'}
 case('Generated build identity and compact accessible Norwegian vector flag',flag)
 def open_fixture():
  p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
  pane.locator('[data-page-rendered="true"] canvas').first.wait_for();show_reader_controls(p)
  pane.get_by_label('PDF presentation',exact=True).select_option('single')
  return {'physicalPages':64}
 case('Open mixed portrait, landscape, tall and rotated PDF through the integrated engine',open_fixture)
 def go(n):
  field=pane.get_by_label('Physical PDF page number',exact=True) if pane.get_by_label('Physical PDF page number',exact=True).is_visible() else pane.get_by_label('Physical PDF page number (compact)',exact=True)
  field.fill(str(n));field.press('Enter');pane.locator('[data-physical-page="%d"][data-page-rendered="true"]'%n).wait_for();p.wait_for_timeout(100)
 def previous_tall():
  samples=[]
  for zoom in ['0.75','1','1.5']:
   show_reader_controls(p);pane.get_by_label('PDF zoom',exact=True).select_option(zoom);go(4)
   pane.get_by_role('button',name='Hide reader controls',exact=True).click()
   # Let the chrome layout restore settle before establishing the physical edge.
   scroller.hover();p.wait_for_timeout(650);scroller.evaluate('e=>{e.scrollTop=0}')
   assert scroller.evaluate('e=>e.scrollTop')<=2,'previous-page input must start at the physical top edge'
   p.evaluate(SAMPLE);p.mouse.wheel(0,-120)
   pane.locator('[data-physical-page="3"][data-page-rendered="true"]').wait_for();p.wait_for_timeout(1150)
   frames=p.evaluate('v31frames');painted=[f['top'] for f in frames if f['painted']]
   assert len(painted)>2,'no painted frame samples'
   drift=max(painted)-min(painted);gap=scroller.evaluate('e=>e.scrollHeight-e.clientHeight-e.scrollTop')
   assert drift<=1.5,{'zoom':zoom,'paintedDrift':drift};assert gap<=2,{'zoom':zoom,'bottomGap':gap}
   samples.append({'zoom':zoom,'paintedDrift':drift,'bottomGap':gap});(OUT/('previous-tall-'+zoom+'.json')).write_text(json.dumps(frames))
  p.screenshot(path=str(OUT/'previous-tall-bottom.png'));return samples
 case('Hidden-chrome previous-page turns settle before canvas paint at three zoom levels',previous_tall)
 def native_intent():
  show_reader_controls(p);pane.get_by_label('PDF zoom',exact=True).select_option('1');go(3)
  scroller.hover();p.mouse.wheel(0,180);p.wait_for_timeout(120)
  before=scroller.evaluate('e=>e.scrollTop');assert before>20
  p.wait_for_timeout(700);after=scroller.evaluate('e=>e.scrollTop');assert abs(after-before)<=2,(before,after)
  # Reverse user input must remain natural within a tall page.
  p.mouse.wheel(0,-60);p.wait_for_timeout(250);back=scroller.evaluate('e=>e.scrollTop');assert back<after
  return {'afterInput':before,'settled':after,'afterReverse':back}
 case('Native intra-page movement is never pulled back by a late canvas completion',native_intent)
 def continuous_mixed():
  show_reader_controls(p);pane.get_by_label('PDF presentation',exact=True).select_option('continuous');go(20)
  pane.get_by_role('button',name='Hide reader controls',exact=True).click();p.wait_for_timeout(350);scroller.hover()
  current=lambda:int(pane.get_by_label('Physical PDF page number (compact)',exact=True).input_value())
  seen=[current()]
  for _ in range(45):p.mouse.wheel(0,280);p.wait_for_timeout(55);seen.append(current())
  p.wait_for_timeout(350);seen.append(current())
  assert all(b>=a for a,b in zip(seen,seen[1:])),seen
  assert seen[-1]>seen[0]+3,seen
  wrappers=pane.locator('[data-physical-page]').count();assert wrappers<=25,wrappers
  p.screenshot(path=str(OUT/'continuous-mixed-window.png'))
  return {'pages':seen,'mountedPages':wrappers}
 case('Mixed-size Continuous traversal is monotonic across bounded window shifts',continuous_mixed)
 def trace():
  show_reader_controls(p);pane.get_by_role('button',name='Document info',exact=True).click()
  with p.expect_download() as d:p.get_by_role('button',name='Download navigation trace',exact=True).click()
  target=OUT/'navigation-trace.json';d.value.save_as(str(target));data=json.loads(target.read_text())
  assert data['schema']=='atlas-pdf-navigation-trace/2';assert data['buildIdentity']['appVersion']==json.loads((ROOT/'package.json').read_text())['version']
  rows=[r for r in data['rows'] if r['type']=='restore'];assert rows and all('applied' in r and 'before' in r and 'after' in r for r in rows)
  assert not any('url' in r or 'title' in r or 'text' in r for r in data['rows'])
  assert not errors,errors
  return {'buildIdentity':data['buildIdentity'],'restoreRows':len(rows),'uncaughtErrors':len(errors)}
 case('Downloadable trace reports actual displacement and exact build without PDF text or URLs',trace)
 browser.close()
print(json.dumps({'pass':sum(r['status']=='PASS' for r in results),'fail':sum(r['status']=='FAIL' for r in results)}))
raise SystemExit(1 if any(r['status']!='PASS' for r in results) else 0)
