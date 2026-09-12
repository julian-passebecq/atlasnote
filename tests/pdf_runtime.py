from browser_support import close_panels,more_action,open_more,open_settings,open_context,reader_action,open_reading,set_learning_flag
"""Integrated React-PDF acceptance on the optional real Vite build.
No imitation renderer. Missing dependencies or blocked origin -> exit 2 / BLOCKED.
Positive cases use the actual worker, PDF bytes, canvases and text layer.
"""
import hashlib
import json
import os
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT, start_server, launch

OUT=ROOT/os.environ.get('ATLAS_EVIDENCE','docs/evidence/hardening/pdf-runtime')
OUT.mkdir(parents=True,exist_ok=True)
CASES=[('engine','Actual integrated engine and matching local worker'),('single','Single physical page'),
 ('continuous','Continuous physical pages'),('spread','Consecutive physical two-page spreads'),
 ('cover','Cover-alone 1 / 2-3 / 4-5'),('page','Physical page input'),('zoom','Zoom changes actual canvas size'),
 ('rotation','Viewer rotation including intrinsic-rotation fixture'),('outline','Actual document outline'),
 ('text','Selectable searchable PDF text'),('image_only','Image-only PDF reports no selectable text, no OCR'),
 ('password','Wrong password then correct unlock'),('password_storage','Entered passwords absent from saved records'),
 ('note_compare','Note + integrated PDF Compare'),('pdf_compare','Integrated PDF + PDF Compare'),
 ('original','Original byte-identical PDF browser download'),('worker_mismatch','Wrong worker metadata refuses render and supports retry')]
results=[];phase='engine';errors=[]
metadata=ROOT/'dist/pdf-assets/engine.json'
if not metadata.exists():
    report={'scope':'Integrated React-PDF + actual PDF.js worker on normal origin','status':'BLOCKED',
      'checks':[{'id':key,'name':name,'status':'BLOCKED','error':'Optional React-PDF/Vite dependencies are unavailable; no integrated build/worker metadata. See online-install.log and online-build.log.'} for key,name in CASES]}
    (OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));raise SystemExit(2)
base=start_server();meta=json.loads(metadata.read_text())
def record(key,detail=None):
    results.append({'id':key,'name':dict(CASES)[key],'status':'PASS','detail':detail});print('PASS',key,flush=True)
def search(target,title):
    target.get_by_role('button',name='Global search',exact=True).click()
    target.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill(title)
    target.locator('.search-result').filter(has_text=title).first.click()
def input_page(target,number):
    field=target.get_by_role('spinbutton',name='Physical PDF page number',exact=True)
    field.fill(str(number));field.press('Enter');target.wait_for_timeout(400)
def visible_pages(target):
    return target.locator('.physical-page').evaluate_all('(es)=>es.map(e=>Number(e.dataset.physicalPage))')
def saved_records(target):
    return target.evaluate('''async()=>{const req=indexedDB.open('knowledge-atlas',2);const db=await new Promise((ok,no)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error);});const tx=db.transaction(['personal','overlays'],'readonly');const out=await Promise.all(['personal','overlays'].map(n=>new Promise((ok,no)=>{const r=tx.objectStore(n).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);})));db.close();return out;}''')
try:
    with sync_playwright() as pw:
        browser=launch(pw);context=browser.new_context(viewport={'width':1920,'height':1080},accept_downloads=True)
        page=context.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)))
        worker=[];page.on('response',lambda r:worker.append({'url':r.url,'status':r.status}) if r.url.endswith('/pdf.worker.min.mjs') else None)
        page.goto(base,wait_until='networkidle');search(page,'PDF reading fixture')
        page.get_by_role('button',name='Enter focus mode',exact=True).click()
        page.locator('.react-pdf__Page canvas').first.wait_for();page.wait_for_timeout(700)
        assert page.locator('.integrated-pdf').get_attribute('data-worker-status')=='compatible'
        assert page.locator('.integrated-pdf').get_attribute('data-pdf-engine-version')==meta['pdfjs']
        assert any(r['status']==200 for r in worker),worker
        record(phase,{'metadata':meta,'actualWorkerResponses':worker})
        phase='single';page.get_by_role('combobox',name='PDF presentation').select_option('single');assert visible_pages(page)==[1];record(phase)
        phase='continuous';page.get_by_role('combobox',name='PDF presentation').select_option('continuous');page.wait_for_timeout(400);assert visible_pages(page)==[1,2,3,4,5];record(phase)
        phase='spread';page.get_by_role('combobox',name='PDF presentation').select_option('spread');input_page(page,1)
        assert visible_pages(page)==[1,2];page.get_by_role('button',name='Next',exact=True).click();page.wait_for_timeout(200);assert visible_pages(page)==[3,4];record(phase)
        phase='cover';input_page(page,1);page.get_by_role('checkbox',name='Cover alone').check();assert visible_pages(page)==[1]
        page.get_by_role('button',name='Next',exact=True).click();page.wait_for_timeout(200);assert visible_pages(page)==[2,3]
        page.get_by_role('button',name='Next',exact=True).click();page.wait_for_timeout(200);assert visible_pages(page)==[4,5];record(phase)
        phase='page';page.get_by_role('combobox',name='PDF presentation').select_option('single');input_page(page,3);assert visible_pages(page)==[3];record(phase)
        phase='zoom';canvas=page.locator('.react-pdf__Page canvas').first;before=canvas.bounding_box()['width'];page.get_by_role('combobox',name='PDF zoom').select_option('1.5');page.wait_for_timeout(500);assert canvas.bounding_box()['width']>before*1.4;record(phase)
        phase='rotation';search(page,'Rotated PDF fixture');page.locator('.react-pdf__Page canvas').first.wait_for();page.wait_for_timeout(500)
        canvas=page.locator('.react-pdf__Page canvas').first;before=canvas.bounding_box();page.get_by_role('button',name='Rotate 90 degrees',exact=True).click();page.wait_for_timeout(500);after=canvas.bounding_box();assert abs(before['height']/before['width']-after['height']/after['width'])>.1;record(phase)
        phase='outline';search(page,'PDF reading fixture');page.locator('.react-pdf__Page canvas').first.wait_for();page.get_by_role('button',name='Outline',exact=True).click();assert page.locator('.pdf-outline .react-pdf__Outline a').count()>0;record(phase)
        phase='text';input_page(page,1);page.get_by_role('textbox',name='Find text in PDF',exact=True).fill('Atlas');page.get_by_role('button',name='Find',exact=True).click();page.locator('.pdf-search-results button').first.wait_for()
        text=page.locator('.react-pdf__Page__textContent').first
        assert len(text.inner_text().strip())>30
        selection=text.evaluate('(el)=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);return s.toString();}')
        assert len(selection)>30;record(phase,{'selectedCharacters':len(selection)})
        phase='image_only';more_action(page,'Workspace settings')
        page.get_by_label('Import local PDF',exact=True).set_input_files(str(ROOT/'tests/fixtures/atlas-image-only.pdf'))
        page.get_by_label('Document title',exact=True).fill('Image only runtime fixture');page.get_by_role('button',name='Import PDF locally',exact=True).click();page.locator('.react-pdf__Page canvas').first.wait_for()
        page.get_by_role('textbox',name='Find text in PDF').fill('scan');page.get_by_role('button',name='Find',exact=True).click();page.get_by_text('No selectable text found.',exact=False).wait_for();record(phase)
        phase='password';search(page,'Password-protected PDF fixture');field=page.get_by_label('PDF password',exact=True);field.fill('WRONG_PASSWORD_RUNTIME');page.get_by_role('button',name='Unlock PDF',exact=True).click();page.get_by_text('Incorrect password. Try again.',exact=False).wait_for()
        field.fill('atlas-demo');page.get_by_role('button',name='Unlock PDF',exact=True).click();page.locator('.react-pdf__Page canvas').first.wait_for();record(phase)
        phase='password_storage';page.wait_for_timeout(500);records=json.dumps(saved_records(page));assert 'WRONG_PASSWORD_RUNTIME' not in records and 'atlas-demo' not in records;record(phase)
        phase='pdf_compare';search(page,'PDF reading fixture');page.locator('.react-pdf__Page canvas').first.wait_for();page.get_by_role('button',name='Compare in two panes',exact=True).click();search(page,'PDF reading fixture');page.locator('.integrated-pdf').nth(1).wait_for();assert page.locator('.integrated-pdf').count()==2
        second=page.locator('.document-pane').last;second.get_by_role('spinbutton',name='Physical PDF page number').fill('3');second.get_by_role('spinbutton',name='Physical PDF page number').press('Enter');page.wait_for_timeout(350)
        assert page.locator('.document-pane').first.get_by_role('spinbutton',name='Physical PDF page number').input_value()=='1';record(phase)
        phase='note_compare';search(page,'One note, several ways to read');assert page.locator('.integrated-pdf').count()==1 and page.locator('.reader-body').count()==1;record(phase)
        page.screenshot(path=str(OUT/'01-integrated-note-pdf-compare.png'))
        phase='original';pdfpane=page.locator('.integrated-pdf').first
        with page.expect_download() as transfer: pdfpane.get_by_role('link',name='Download original',exact=True).click()
        path=OUT/'downloaded-original.pdf';transfer.value.save_as(str(path))
        original=(ROOT/'content/packs/atlas.reader-guide/assets/atlas-reader-fixture.pdf').read_bytes();assert path.read_bytes()==original;record(phase,{'sha256':hashlib.sha256(original).hexdigest()})
        phase='worker_mismatch';page.route('**/pdf-assets/engine.json',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({**meta,'pdfjs':'0.0.0'})))
        page.reload(wait_until='networkidle');page.get_by_text('PDF worker version does not match React-PDF:',exact=False).first.wait_for()
        assert page.locator('.integrated-pdf canvas').count()==0
        page.unroute('**/pdf-assets/engine.json');page.get_by_role('button',name='Retry PDF',exact=True).first.click();page.locator('.integrated-pdf canvas').first.wait_for();record(phase)
        assert errors==[],errors
        browser.close()
except Exception as exc:
    status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc) or 'Executable doesn\'t exist' in str(exc) else 'FAIL'
    results.append({'id':phase,'name':dict(CASES)[phase],'status':status,'error':str(exc)});traceback.print_exc()
    covered={r['id'] for r in results}
    for key,name in CASES:
        if key not in covered:results.append({'id':key,'name':name,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'})
report={'scope':'Actual normal-origin integrated React-PDF + PDF.js worker; no fake renderer','metadata':meta,'errors':errors,
        'status':'FAIL' if any(r['status']=='FAIL' for r in results) or errors else 'BLOCKED' if any(r['status']=='BLOCKED' for r in results) else 'PASS','checks':results}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
