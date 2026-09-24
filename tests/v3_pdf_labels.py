"""V3 PDF-03 printed page labels on the integrated build (real PDF.js). A generated
6-page PDF whose /PageLabels number pages 1-3 as i-iii and 4-6 as 1-3."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/pdf-labels'));OUT.mkdir(parents=True,exist_ok=True)
def labelled_pdf(n=6):
 objs=['<< /Type /Catalog /Pages 2 0 R /PageLabels << /Nums [0 << /S /r >> 3 << /S /D >>] >> >>',None,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];kids=[]
 for i in range(1,n+1):
  st='BT /F1 36 Tf 72 700 Td (Physical page %d) Tj ET'%i
  objs.append('<< /Length %d >>\nstream\n%s\nendstream'%(len(st),st));objs.append('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>'%len(objs));kids.append(len(objs))
 objs[1]='<< /Type /Pages /Kids [%s] /Count %d >>'%(' '.join('%d 0 R'%k for k in kids),n)
 out=bytearray(b'%PDF-1.4\n');offs=[]
 for i,o in enumerate(objs,1):offs.append(len(out));out+=('%d 0 obj\n%s\nendobj\n'%(i,o)).encode()
 x=len(out);out+=('xref\n0 %d\n0000000000 65535 f \n'%(len(objs)+1)).encode()
 for o in offs:out+=('%010d 00000 n \n'%o).encode()
 out+=('trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n'%(len(objs)+1,x)).encode();return bytes(out)
pdf=labelled_pdf();results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(15000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.route('**/content-assets/atlas.reader-guide@1.0.1/assets/atlas-reader-fixture.pdf',lambda r:r.fulfill(status=200,body=pdf,headers={'content-type':'application/pdf','cache-control':'no-store'}))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
 def labels():
  p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
  pane=p.locator('.active-pane');pane.locator('[data-page-rendered="true"] canvas').first.wait_for()
  hide=pane.get_by_role('button',name='Hide reader controls',exact=True)
  if hide.count():hide.click()
  compact=pane.locator('.pdf-page-compact');f=compact.get_by_label('Physical PDF page number (compact)',exact=True)
  f.fill('2');f.press('Enter');pane.locator('[data-physical-page="2"][data-page-rendered="true"]').wait_for()
  expect(compact.locator('.pdf-printed-label')).to_have_text('(ii)')
  f.fill('5');f.press('Enter');pane.locator('[data-physical-page="5"][data-page-rendered="true"]').wait_for()
  expect(compact.locator('.pdf-printed-label')).to_have_text('(2)')
  f.fill('2');f.press('Enter');pane.locator('[data-physical-page="2"][data-page-rendered="true"]').wait_for()
  assert f.input_value()=='2';expect(compact.locator('.pdf-printed-label')).to_have_text('(ii)')
  p.screenshot(path=str(OUT/'printed-labels.png'));return {'physical2':'ii','physical5':'2'}
 check('Printed labels are shown beside, never instead of, the physical page number',labels)
 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-pdf-labels','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
