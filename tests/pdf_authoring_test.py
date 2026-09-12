"""Actual offline authoring/ZIP validation tests. All PDFs are synthetic fixtures.
Run: python tests/pdf_authoring_test.py. No private reference corpus is used.
"""
from __future__ import annotations
import importlib.util
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import tempfile
import traceback
import pymupdf as fitz
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/release-1.1/pdf-authoring'))
OUT.mkdir(parents=True,exist_ok=True)
RESULTS=[]
PROCESSOR=ROOT/'tools/prepare-pdf.py'
TEMPLATE=ROOT/'templates/pdf-library'
spec=importlib.util.spec_from_file_location('library_validator',TEMPLATE/'tools/validate_library.py');validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)

def check(name,accepts,fn):
    try:
        detail=fn();RESULTS.append({'name':name,'accepts':accepts,'status':'PASS','detail':detail});print('PASS',name,flush=True)
    except Exception as exc:
        RESULTS.append({'name':name,'accepts':accepts,'status':'FAIL','error':str(exc)});print('FAIL',name,str(exc),flush=True);traceback.print_exc()

def run(src,dst,label,profile='lossless',extra=None,expected=0,qa=False):
    command=['python',str(PROCESSOR),str(src),str(dst),'--profile',profile,'--report',str(OUT/(label+'.json'))]
    if qa: command+=['--qa-dir',str(OUT/(label+'-qa'))]
    result=subprocess.run(command+(extra or []),capture_output=True,text=True,timeout=100)
    if result.stdout: report=json.loads(result.stdout)
    else: raise AssertionError(result.stderr)
    assert result.returncode==expected, (result.returncode,report.get('error'),result.stderr)
    return report

with tempfile.TemporaryDirectory(prefix='atlas-authoring-tests-') as work:
    WORK=Path(work)
    source=TEMPLATE/'assets/pdf/pdf.example.fabric/fabric-cheatsheet.pdf'
    def lossless():
        report=run(source,WORK/'lossless.pdf','lossless',qa=True)
        assert report['before']['pageTextSha256']==report['after']['pageTextSha256']
        assert report['before']['pageCount']==report['after']['pageCount']==5
        assert report['after']['bytes']<=report['before']['bytes']
        assert all(p['maxChannelDifference']==0 for p in report['visualQA']['pages'])
        for field in ['timestamp','profile','processor','ratio','savedBytes']:assert field in report
        assert report['rights'].startswith('unchanged')
        return {'beforeBytes':report['before']['bytes'],'afterBytes':report['after']['bytes'],'renderDiff':'all 5 pages zero pixel difference','textIdentical':True}
    check('Lossless structural cleanup: actual text/page hashes and all-page render comparison',[118,119,122,123,125,129],lossless)
    def image_fixture():
        # High-resolution embedded image plus vector small-label/table content.
        image=Image.frombytes('RGB',(2100,1700),random.Random(11).randbytes(2100*1700*3))
        draw=ImageDraw.Draw(image);draw.rectangle((140,140,1950,1550),fill='white');draw.line((250,1280,1750,350),fill='black',width=12)
        for y in range(350,1300,180):draw.line((250,y,1800,y),fill=(140,140,140),width=2)
        image.save(WORK/'dense.png')
        doc=fitz.open();p=doc.new_page();p.insert_text((44,38),'SYNTHETIC ONLY - Image-heavy study sheet',fontsize=16)
        p.insert_image(fitz.Rect(44,100,550,550),filename=str(WORK/'dense.png'))
        for i in range(12):p.insert_text((44,580+i*15),f'Small vector label {i+1:02d}: input -> transform -> output; 123.45',fontsize=8)
        doc.save(WORK/'dense.pdf');doc.close()
    image_fixture()
    def lossy(profile):
        r=run(WORK/'dense.pdf',WORK/(profile+'.pdf'),profile,profile=profile,qa=True)
        assert r['before']['pageTextSha256']==r['after']['pageTextSha256'];assert r['after']['pageCount']==1
        assert r['losslessCandidate'];assert r['lossyCandidate'];assert r['after']['bytes']<r['before']['bytes']
        assert r['visualQA']['humanReviewRequired'] and not r['visualQA']['humanApproved']
        with fitz.open(WORK/(profile+'.pdf')) as d:assert d[0].get_images() and 'Small vector label 12' in d[0].get_text()
        return {'inputBytes':r['before']['bytes'],'outputBytes':r['after']['bytes'],'ratio':r['ratio'],'visualQA':r['visualQA']['pages']}
    for profile in ['study','compact']:check('Image-only rewrite '+profile+' after structural cleanup; vector text retained',[120,121,122,123,125,126],lambda p=profile:lossy(p))
    def lossy_requires_qa():
        r=run(source,WORK/'no-qa.pdf','lossy-missing-qa',profile='compact',expected=1);assert 'require --qa-dir' in r['error'];assert not (WORK/'no-qa.pdf').exists()
    check('Explicit lossy profile without QA destination is rejected',[121,126],lossy_requires_qa)
    def image_only():
        doc=fitz.open();p=doc.new_page();p.insert_image(p.rect,filename=str(WORK/'dense.png'));doc.save(WORK/'scan.pdf');doc.close()
        r=run(WORK/'scan.pdf',WORK/'scan-out.pdf','image-only','study',qa=True)
        assert not r['before']['hasSelectableText'] and not r['after']['hasSelectableText'];assert r['after']['pageCount']==1
    check('Image-only PDF remains image-only: no invented OCR/text layer',[120,122,123],image_only)
    def kept_original():
        r=run(WORK/'lossless.pdf',WORK/'second.pdf','lossless-second')
        assert r['keptOriginalBecauseCandidateWasNotSmaller'];assert (WORK/'second.pdf').read_bytes()==(WORK/'lossless.pdf').read_bytes()
    check('A non-smaller candidate returns the original exact bytes',[124],kept_original)
    def duplicate():
        (WORK/'index.json').write_text(json.dumps({validator.sha(source):'pdf.canonical.existing'}))
        r=run(source,WORK/'duplicate.pdf','duplicate',extra=['--hash-index',str(WORK/'index.json')],expected=4)
        assert r['duplicateOf']=='pdf.canonical.existing' and not (WORK/'duplicate.pdf').exists()
    check('SHA duplicate check creates no competing binary',[113],duplicate)
    def unsafe():
        (WORK/'not.pdf').write_bytes(b'<html>not PDF</html>')
        assert 'signature' in run(WORK/'not.pdf',WORK/'bad-out.pdf','non-pdf',expected=1)['error']
        d=fitz.open();d.new_page().insert_text((30,30),'Synthetic encrypted file');d.save(WORK/'encrypted.pdf',encryption=fitz.PDF_ENCRYPT_AES_256,user_pw='synthetic-only-password',owner_pw='synthetic-only-owner');d.close()
        r=run(WORK/'encrypted.pdf',WORK/'encrypted-out.pdf','encrypted',expected=1);assert 'Encrypted' in r['error'];assert 'synthetic-only-password' not in json.dumps(r)
        d=fitz.open();d.new_page();xref=d.get_new_xref();d.update_object(xref,'<< /S /JavaScript /JS (app.alert\\(1\\)) >>');d.xref_set_key(d.pdf_catalog(),'OpenAction',f'{xref} 0 R');d.save(WORK/'active.pdf');d.close()
        assert 'Active content' in run(WORK/'active.pdf',WORK/'active-out.pdf','active-content',expected=1)['error']
    check('Reject non-PDF, encrypted and active-action inputs; no password persisted',[106,117],unsafe)
    def capped():
        r=run(source,WORK/'cap.pdf','invalid-cap',extra=['--max-mb','21'],expected=1);assert '<= 20 MiB' in r['error']
    check('Processor cannot raise the application hard cap',[128],capped)
    def size_gate():
        # Two genuine PDF image streams with high-entropy pixels, not padding outside a PDF.
        rng=random.Random(321)
        d=fitz.open()
        for i in range(2):
            image=Image.frombytes('RGB',(2200,2100),rng.randbytes(2200*2100*3));image.save(WORK/f'noise-{i}.png',compress_level=0)
            page=d.new_page();page.insert_image(page.rect,filename=str(WORK/f'noise-{i}.png'))
            if i==0:d.save(WORK/'large12.pdf')
        d.save(WORK/'large20.pdf');d.close()
        r=run(WORK/'large12.pdf',WORK/'large12-out.pdf','over-target')
        assert not r['targetMet'] and r['hardLimitMet'];assert any('12 MiB' in w for w in r['warnings'])
        r2=run(WORK/'large20.pdf',WORK/'large20-out.pdf','over-hard-limit',expected=3)
        assert not r2['hardLimitMet'] and not (WORK/'large20-out.pdf').exists()
        return {'warnedBytes':r['after']['bytes'],'rejectedBytes':r2['after']['bytes']}
    check('Actual large-image PDFs exercise 12 MiB warning and 20 MiB rejection',[127,128],size_gate)
    def template_failures():
        target=WORK/'repo';shutil.copytree(TEMPLATE,target,ignore=shutil.ignore_patterns('out','__pycache__'))
        libpath=target/'library/library.json';original=json.loads(libpath.read_text());sidecar=target/'library'/original['documents'][0];original_doc=json.loads(sidecar.read_text());cases=[]
        for name,patch in [('traversal',{'file':{**original_doc['file'],'path':'../escape.pdf'}}),('false-rights',{'rights':{'status':'public','attribution':'No evidence'}}),('tampered-hash',{'file':{**original_doc['file'],'sha256':'0'*64}}),('unknown-language',{'language':''})]:
            sidecar.write_text(json.dumps({**original_doc,**patch}))
            try:validator.validate(target);raise AssertionError('Accepted '+name)
            except ValueError as e:cases.append({'case':name,'rejected':str(e)})
        sidecar.write_text(json.dumps(original_doc))
        second=target/'library'/original['documents'][1];second_data=json.loads(second.read_text());second.write_text(json.dumps({**second_data,'file':original_doc['file']}))
        try:validator.validate(target);raise AssertionError('Accepted duplicate')
        except ValueError as e:assert 'Duplicate PDF' in str(e)
        second.write_text(json.dumps(second_data))
        (target/original_doc['file']['path']).write_bytes(b'%PDF-'+b'0'*(20*1024*1024))
        try:validator.validate(target);raise AssertionError('Accepted oversize')
        except ValueError as e:assert '20 MiB' in str(e)
        return cases
    check('Repository validation rejects traversal, invalid rights/language, tampering, duplicate bytes and >20 MiB',[110,111,112,113,128],template_failures)
    def deterministic():
        target=WORK/'deterministic';shutil.copytree(TEMPLATE,target,ignore=shutil.ignore_patterns('out','__pycache__'))
        command=['python',str(target/'tools/build_atlas_library.py'),'--root',str(target)]
        subprocess.run(command,check=True,capture_output=True);a=validator.sha(target/'out/atlas-pdf-library.zip')
        subprocess.run(command,check=True,capture_output=True);b=validator.sha(target/'out/atlas-pdf-library.zip');assert a==b
        ignore=(target/'.gitignore').read_text();assert 'incoming/' in ignore and 'out/' in ignore
        return {'sha256':a,'rebuildIdentical':True}
    check('Private repository pack is reproducible and generated/raw material is gitignored',[107,115,130],deterministic)

report={'scope':'Real offline PyMuPDF/Pillow processing and source-repository builder. Synthetic PDFs only. Automated QA does not itself confer human approval.','checks':RESULTS,'passed':sum(r['status']=='PASS' for r in RESULTS),'failed':sum(r['status']=='FAIL' for r in RESULTS)}
(OUT/'pdf-authoring-tests.json').write_text(json.dumps(report,indent=2))
raise SystemExit(1 if report['failed'] else 0)
