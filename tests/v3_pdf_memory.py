"""V3 PDF byte-ownership diagnostic (measurement). Opens a generated ~48 MB PDF
(3 visible pages plus an unreferenced padding stream) through the integrated
reader and reads ArrayBuffer backing-store bytes held by the page via the Chrome
DevTools Protocol. Usage: python tests/v3_pdf_memory.py [label]"""
import json,os,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT
label=sys.argv[1] if len(sys.argv)>1 else 'run'
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/pdf-memory'));OUT.mkdir(parents=True,exist_ok=True)
PAD=48*1024*1024
def padded_pdf():
 objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R] /Count 3 >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
 for i in range(1,4):
  s='BT /F1 40 Tf 72 700 Td (Memory page %d) Tj ET'%i
  objs.append('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>'%(len(objs)+2))
  objs.append('<< /Length %d >>\nstream\n%s\nendstream'%(len(s),s))
 out=bytearray(b'%PDF-1.4\n');offsets=[]
 for i,o in enumerate(objs,1):offsets.append(len(out));out+=('%d 0 obj\n%s\nendobj\n'%(i,o)).encode()
 offsets.append(len(out));out+=('%d 0 obj\n<< /Length %d >>\nstream\n'%(len(objs)+1,PAD)).encode()+bytes(PAD)+b'\nendstream\nendobj\n'
 n=len(offsets);xref=len(out);out+=('xref\n0 %d\n0000000000 65535 f \n'%(n+1)).encode()
 for off in offsets:out+=('%010d 00000 n \n'%off).encode()
 out+=('trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n'%(n+1,xref)).encode();return bytes(out)
pdf=padded_pdf();base=start_server()
with sync_playwright() as pw:
 b=launch(pw);ctx=b.new_context(viewport={'width':1440,'height':900});p=ctx.new_page()
 p.route('**/content-assets/atlas.reader-guide@1.0.1/assets/atlas-reader-fixture.pdf',lambda r:r.fulfill(status=200,body=pdf,headers={'content-type':'application/pdf','cache-control':'no-store'}))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 cdp=ctx.new_cdp_session(p)
 def usage():
  cdp.send('HeapProfiler.collectGarbage');u=cdp.send('Runtime.getHeapUsage')
  return {k:round(v/1048576,1) for k,v in u.items() if isinstance(v,(int,float))}
 before=usage()
 p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
 p.locator('.active-pane [data-page-rendered="true"] canvas').first.wait_for(timeout=60000);p.wait_for_timeout(1500)
 opened=usage();b.close()
result={'label':label,'pdfMB':round(len(pdf)/1048576,1),'beforeMB':before,'openedMB':opened,'scope':'Chrome DevTools Runtime.getHeapUsage after forced GC; page (main thread) only, not the PDF.js worker'}
(OUT/(label+'.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result))
