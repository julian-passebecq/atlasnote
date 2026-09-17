"""Release blocker regressions on the integrated origin with durable IndexedDB."""
import json, os, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, launch, close_panels, choose_library_resource, open_settings, show_reader_controls
from persistence_assertions import assert_personal_after_open

OUT = Path(os.environ.get('ATLAS_EVIDENCE', ROOT/'docs/evidence/release-blockers/runtime'))
OUT.mkdir(parents=True, exist_ok=True)
READ = """()=>new Promise((resolve,reject)=>{const r=indexedDB.open('knowledge-atlas');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,t=d.transaction(['personal','overlays'],'readonly'),p=t.objectStore('personal').get('active'),o=t.objectStore('overlays').get('active');t.oncomplete=()=>{d.close();resolve({personal:p.result,overlays:o.result});};};})"""
results=[]; errors=[]; failures=[]; phase='startup'
try:
 with sync_playwright() as pw:
  browser=launch(pw); ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
  p=ctx.new_page(); p.set_default_timeout(12000)
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.on('requestfailed',lambda r:failures.append({'url':r.url,'failure':r.failure}))
  def click(name): p.get_by_role('button',name=name,exact=True).last.click()
  def field(name,value): p.get_by_label(name,exact=True).fill(value)
  def state(): p.wait_for_timeout(300); return p.evaluate(READ)
  def record():
   results.append({'name':phase,'status':'PASS'}); print('PASS',phase,flush=True)
  def manager(kind,id):
   close_panels(p); click(kind+' content'); choose_library_resource(p,id)
  def search(title):
   close_panels(p); p.keyboard.press('Control+k'); field('Search all pages and glossary',title); p.locator('.search-result').filter(has_text=title).first.click()
  base=start_server(); p.goto(base,wait_until='networkidle'); expect(p.locator('.atlas-app')).to_be_visible(); record()
  phase='QA-01 visual and canonical taxonomy share the saved draft'
  click('Article content'); click('Add article'); field('Title','Release blocker article'); field('Pasted article or transcript','Stable regression body.')
  picker=p.get_by_label('Classification subject',exact=True).last
  picker.select_option('it'); p.get_by_text('Advanced / JSON',exact=True).click(); p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).check()
  picker.select_option('cloud'); raw=json.loads(p.get_by_label('Article JSON',exact=True).input_value()); assert raw['taxonomy']=={'subject':'cloud'}
  aid=raw['id']; raw['taxonomy']={'subject':'job'}; field('Article JSON',json.dumps(raw)); expect(picker).to_have_value('job')
  field('Article JSON','{'); expect(picker).to_be_disabled(); expect(p.get_by_text('Fix the Article JSON object and classification before using the visual classification picker.',exact=True)).to_be_visible()
  click('Import local content'); expect(p.locator('dialog [role=alert]')).to_have_count(1); expect(p.locator('dialog [role=alert]')).to_contain_text('Malformed JSON'); assert not (state().get('overlays') or {}).get('pages')
  field('Article JSON',json.dumps(raw)); expect(picker).to_be_enabled(); expect(picker).to_have_value('job')
  p.screenshot(path=str(OUT/'qa01-synchronized.png')); click('Import local content'); expect(p.locator('dialog[open]')).to_have_count(0)
  manager('Article',aid); expect(p.get_by_label('Classification subject',exact=True)).to_have_value('job')
  p.get_by_label('Reference destination subject',exact=True).select_option('it')
  folder=p.get_by_label('Reference destination folder',exact=True).locator('option').evaluate_all('(es)=>es.find(e=>e.value).value')
  p.get_by_label('Reference destination folder',exact=True).select_option(folder); click('Add reference to Notebook'); pin=state()['overlays']['references'][0]
  click('Edit / details'); p.get_by_text('Advanced / JSON',exact=True).click(); p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).check()
  picker.select_option('cloud'); assert json.loads(p.get_by_label('Article JSON',exact=True).input_value())['taxonomy']=={'subject':'cloud'}
  click('Save content'); expect(p.locator('dialog[open]')).to_have_count(0); p.reload(wait_until='networkidle')
  saved=state(); assert saved['overlays']['pages'][aid]['page']['article']['taxonomy']==saved['overlays']['taxonomy'][aid]=={'subject':'cloud'}; assert saved['overlays']['references'][0]==pin
  manager('Article',aid); expect(p.get_by_label('Classification subject',exact=True)).to_have_value('cloud'); click('Edit / details'); p.get_by_text('Advanced / JSON',exact=True).click(); p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).check()
  picker.select_option(''); assert 'taxonomy' not in json.loads(p.get_by_label('Article JSON',exact=True).input_value()); click('Save content'); expect(p.locator('dialog[open]')).to_have_count(0)
  p.reload(wait_until='networkidle'); saved=state(); assert 'taxonomy' not in saved['overlays']['pages'][aid]['page']['article']; assert saved['overlays']['taxonomy'][aid] is None; assert saved['overlays']['references'][0]==pin
  manager('Article',aid); expect(p.get_by_label('Classification subject',exact=True)).to_have_value(''); record()
  phase='QA-03 saved Multiple keeps author mode and validation through edits and JSON'
  click('QCM content'); click('New/import QCM'); field('Set title','Release blocker QCM')
  field('Question 1 prompt','Select both even values.'); field('Question 1 option 1','Two'); field('Question 1 option 2','Four')
  mode=p.get_by_label('Question 1 answer mode',exact=True); mode.select_option('multiple'); p.get_by_label('Question 1 option 2 correct',exact=True).check()
  click('Import local content'); expect(p.locator('.qcm-reader')).to_be_visible(); qcm=next(v['page']['qcm'] for v in state()['overlays']['pages'].values() if v['page'].get('qcm')); qid=qcm['id']
  p.locator('.qcm-options input').first.check(); p.locator('.qcm-options input').last.check(); click('Check answer'); field('Question reflection','Keep this attempt and reflection exactly.'); before=state()['personal']
  manager('QCM',qid); click('Edit / details'); expect(mode).to_have_value('multiple'); p.get_by_label('Question 1 option 2 correct',exact=True).uncheck()
  expect(mode).to_have_value('multiple'); expect(p.get_by_label('Question 1 option 2 correct',exact=True)).to_have_attribute('type','checkbox'); expect(p.get_by_role('alert')).to_contain_text('at least two')
  click('Save content'); expect(p.locator('dialog[open]')).to_have_count(1); assert state()['overlays']['pages'][qid]['page']['qcm']==qcm
  # An invalid visual draft cannot lose its author mode by entering canonical JSON.
  p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).click(); expect(p.get_by_role('checkbox',name='Edit canonical JSON',exact=True)).not_to_be_checked(); expect(mode).to_have_value('multiple')
  p.screenshot(path=str(OUT/'qa03-invalid-multiple.png')); mode.select_option('single'); expect(mode).to_have_value('single'); expect(p.get_by_label('Question 1 option 2 correct',exact=True)).to_have_attribute('type','radio')
  mode.select_option('multiple'); p.get_by_label('Question 1 option 2 correct',exact=True).check()
  p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).check(); assert json.loads(p.get_by_label('QCM JSON',exact=True).input_value())==qcm
  p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).uncheck(); expect(mode).to_have_value('multiple'); p.get_by_label('Question 1 option 2 correct',exact=True).uncheck(); expect(mode).to_have_value('multiple')
  p.get_by_label('Question 1 option 2 correct',exact=True).check(); click('Save content'); expect(p.locator('dialog[open]')).to_have_count(0); p.reload(wait_until='networkidle')
  after=state(); assert after['overlays']['pages'][qid]['page']['qcm']==qcm; assert after['personal']['qcmAttempts']==before['qcmAttempts']; assert after['personal']['qcmResponses']==before['qcmResponses']
  manager('QCM',qid); click('Edit / details'); expect(mode).to_have_value('multiple'); mode.select_option('single'); click('Save content'); expect(p.locator('dialog[open]')).to_have_count(0); p.reload(wait_until='networkidle')
  manager('QCM',qid); click('Edit / details'); expect(mode).to_have_value('single'); mode.select_option('multiple'); p.get_by_label('Question 1 option 2 correct',exact=True).check(); click('Save content'); expect(p.locator('dialog[open]')).to_have_count(0); record()
  phase='QA-02 embedded real PDF annotation updates physical state and rendered page in every layout'
  search('PDF reading fixture'); show_reader_controls(p)
  page_field=p.get_by_label('Physical PDF page number',exact=True)
  def pdf_location():
   pane=state()['personal']['session']['panes'][0]; view=next(v for v in pane['views'] if v['id']==pane['active']); return view['history'][view['cursor']]
  def goto(number):
   page_field.fill(str(number)); page_field.press('Enter'); expect(page_field).to_have_value(str(number))
  for presentation in ['single','continuous','spread','grid']:
   p.get_by_label('PDF presentation',exact=True).select_option(presentation)
   for repetition in range(2):
    goto(1); link=p.get_by_role('link',name='Jump to sample text on page 2',exact=True); expect(link).to_be_visible(timeout=20000)
    assert pdf_location()['pdfPage']==1; link.click(); expect(page_field).to_have_value('2')
    canvas=p.locator('.active-pane .physical-page[data-physical-page="2"][data-page-rendered="true"] canvas'); expect(canvas).to_be_visible(timeout=20000)
    assert canvas.evaluate('(e)=>e.width>0&&e.height>0'); expect(p.locator('.active-pane .physical-page[data-physical-page="2"] .textLayer')).to_contain_text('QA-ANCHOR-BRAVO')
    loc=pdf_location(); assert loc['pdfPage']==loc['anchor']['pdfPage']==2; assert loc['pdfMode']==presentation
    p.screenshot(path=str(OUT/f'qa02-{presentation}-{repetition+1}.png'))
  p.get_by_label('PDF presentation',exact=True).select_option('single'); goto(1); click('Outline'); p.get_by_role('link',name='Selectable text and language pairs',exact=True).click(); expect(page_field).to_have_value('2'); click('Close PDF outline')
  goto(4); external=p.locator('.active-pane .annotationLayer a[href^="https:"]').first; expect(external).to_be_visible(timeout=20000); expect(external).to_have_attribute('target','_blank'); assert 'noopener' in external.get_attribute('rel'); record()
  phase='Combined repairs survive full backup restore into a fresh browser context'
  manager('Article',aid); click('Edit / details'); p.get_by_text('Advanced / JSON',exact=True).click(); p.get_by_role('checkbox',name='Edit canonical JSON',exact=True).check()
  p.get_by_label('Classification subject',exact=True).last.select_option('cloud'); click('Save content'); expect(p.locator('dialog[open]')).to_have_count(0)
  expected=state(); open_settings(p)
  with p.expect_download() as dl: click('Download workspace backup')
  backup=OUT/'release-blockers.atlas-backup.zip'; dl.value.save_as(str(backup)); expected=state(); ctx.close()
  ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True); p=ctx.new_page(); p.set_default_timeout(12000); p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto(base,wait_until='networkidle'); open_settings(p); p.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup)); p.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check(); click('Restore verified backup'); expect(p.locator('dialog[open]')).to_have_count(0)
  p.reload(wait_until='networkidle'); actual=state(); assert actual['overlays']==expected['overlays']; assert_personal_after_open(actual['personal'],expected['personal'])
  manager('Article',aid); expect(p.get_by_label('Classification subject',exact=True)).to_have_value('cloud'); assert actual['overlays']['pages'][aid]['page']['article']['taxonomy']==actual['overlays']['taxonomy'][aid]=={'subject':'cloud'}; assert actual['overlays']['references'][0]==pin
  manager('QCM',qid); click('Edit / details'); expect(p.get_by_label('Question 1 answer mode',exact=True)).to_have_value('multiple'); click('Cancel')
  search('PDF reading fixture'); show_reader_controls(p); page_field=p.get_by_label('Physical PDF page number',exact=True); goto(1); p.get_by_role('link',name='Jump to sample text on page 2',exact=True).click(); expect(page_field).to_have_value('2'); expect(p.locator('.active-pane .physical-page[data-physical-page="2"] canvas')).to_be_visible(timeout=20000); record()
  assert not errors,errors
  browser.close()
except Exception as e:
 results.append({'name':phase,'status':'FAIL','error':str(e)}); traceback.print_exc()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'checks':results,'errors':errors,'failedRequests':failures},indent=2))
raise SystemExit(1 if errors or any(r['status']!='PASS' for r in results) else 0)
