"""V2 actual-origin reference persistence release gate.
Real application entry, real IndexedDB, visible UI, reload, fresh-profile backup
restore and actual PDF canvas/worker. Compatibility origin can diagnose storage
only; it CANNOT certify the final integrated PDF/reader gates.
"""
import json,os,traceback,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,close_panels,open_context,open_settings,state_action,show_reader_controls
from persistence_assertions import assert_personal_after_open
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v2/references-runtime'));OUT.mkdir(parents=True,exist_ok=True)
CASES=['normal_origin','exact_concept_assignment','explicit_pdf_reference','source_review_import','lens_reload','explorer_reload_and_close','checkpoint_preserves_new_knowledge','exact_backup_download','fresh_profile_restore','restored_reference_navigation','pdf_spread_and_natural_wheel','no_browser_errors']
checks=[];errors=[];phase=CASES[0];p=None;compat=os.environ.get('ATLAS_DIST')=='dist-offline'
def record(detail=None):checks.append({'id':phase,'status':'PASS','detail':detail});print('PASS',phase,flush=True)
def durable():
 p.wait_for_timeout(230);v=p.evaluate('''async()=>{const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI)),a=await m.captureWorkspaceSnapshot(),b=await m.readPersistedWorkspace();return {a:a.personal,b:b.personal,ao:a.overlays,bo:b.overlays};}''');assert v['a']==v['b'];assert v['ao']==v['bo'];return {'personal':v['b'],'overlays':v['bo']}
def click(label,area=None):(area if area is not None else p).get_by_role('button',name=label,exact=True).click();p.wait_for_timeout(140)
def search(title):
 close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(200)
def manage():
 panel=open_context(p,'References');click('Link concept / Add reference',panel);expect(p.locator('dialog[open]')).to_be_visible()
try:
 dist=ROOT/os.environ.get('ATLAS_DIST','dist')
 if not os.environ.get('ATLAS_BASE_URL') and not (dist/'index.html').exists():raise FileNotFoundError('Required application build is absent: '+str(dist/'index.html'))
 base=start_server()
 with sync_playwright() as pw:
  browser=launch(pw);ctx=browser.new_context(viewport={'width':1600,'height':1050},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto(base,wait_until='networkidle');durable();record({'origin':base,'build':'compatibility' if compat else 'integrated'})
  phase='exact_concept_assignment';search('Transform then inspect');manage();click('Concept Index');p.get_by_label('Concept label',exact=True).fill('Runtime exact references');click('Save concept');concept=next(c['id'] for c in durable()['personal']['knowledge']['concepts'] if c['label']=='Runtime exact references');click('Exact links')
  details=p.locator('dialog details').filter(has=p.get_by_text('Choose a different source / exact section',exact=True));details.locator('summary').click();picker=details.locator('.resource-target-picker');picker.get_by_label('Typed resource destination',exact=True).select_option('page:page.samples.pyspark.transform');picker.get_by_label('Typed target section',exact=True).select_option('block.samples.pyspark.transform');p.get_by_label('Concept to link',exact=True).select_option(concept);click('Link concept to this target');assert durable()['personal']['knowledge']['assignments'][0]['target']['anchor']['blockId']=='block.samples.pyspark.transform';record()
  phase='explicit_pdf_reference';destination=p.locator('dialog .resource-target-picker').last;destination.get_by_label('Typed resource destination',exact=True).select_option('page:page.pdfatlas.spark-concepts');destination.get_by_label('Typed target physical page',exact=True).fill('3');click('Add exact reference');assert durable()['personal']['knowledge']['edges'][0]['target']['pdfPage']==3;record()
  phase='source_review_import';click('Review & AI handoff')
  with p.expect_download() as dl:click('Export reference review JSON')
  path=OUT/'review-input.json';dl.value.save_as(str(path));review=json.loads(path.read_text());r=review['resources'][0];batch={'schemaVersion':1,'kind':'atlas-reference-suggestions','semanticRevision':review['semanticRevision'],'suggestions':[{'id':'runtime.v2.proposal','type':'assignment','conceptId':'concept.it','target':r['target'],'targetRevision':r['sourceRevision'],'reason':'Synthetic reviewed reference fixture'}]};before=durable()['personal']['knowledge'];p.get_by_label('Reference suggestion JSON',exact=True).fill(json.dumps(batch));click('Preview suggestions');assert durable()['personal']['knowledge']==before;click('Stage validated suggestions');click('Accept',p.locator('[data-suggestion-id="runtime.v2.proposal"]'));assert durable()['personal']['knowledge']['proposals'][0]['status']=='accepted';close_panels(p);record()
  phase='lens_reload';p.get_by_role('checkbox',name='Show references in tree',exact=True).check();expected=durable();p.reload(wait_until='networkidle');after=durable();assert after['personal']['knowledge']==expected['personal']['knowledge'];assert after['overlays']==expected['overlays'];assert after['personal']['referenceLens'] is True;record()
  phase='explorer_reload_and_close';panel=open_context(p,'References');before=durable()['personal'];click('Open Reference Explorer',panel);expect(p.locator('.reference-explorer')).to_be_visible();expected=durable();p.reload(wait_until='networkidle');expect(p.locator('.reference-explorer')).to_be_visible();assert_personal_after_open(durable()['personal'],expected['personal']);click('Close Reference Explorer');after=durable();assert after['personal']['session']['panes']==before['session']['panes'];record()
  phase='checkpoint_preserves_new_knowledge';state_action(p,'Save all workspace states');manage();click('Concept Index');p.get_by_label('Concept label',exact=True).fill('Concept after checkpoint');click('Save concept');close_panels(p);new=durable()['personal']['knowledge'];state_action(p,'Restore last all-workspaces save');assert durable()['personal']['knowledge']==new;record()
  phase='exact_backup_download';open_settings(p);before=durable()
  with p.expect_download() as dl:click('Download workspace backup')
  backup=OUT/'v2-full-workspace.atlas-backup.zip';dl.value.save_as(str(backup))
  with zipfile.ZipFile(backup) as z:payload=json.loads(z.read('backup.json'))['workspace']
  assert payload['personal']==before['personal'];assert payload['overlays']==before['overlays'];record()
  phase='fresh_profile_restore';ctx.close();ctx=browser.new_context(viewport={'width':1600,'height':1050},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto(base,wait_until='networkidle');assert 'knowledge' not in durable()['personal'];open_settings(p);p.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup));p.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();click('Restore verified backup');expect(p.locator('dialog[open]')).to_have_count(0);after=durable();assert_personal_after_open(after['personal'],payload['personal']);assert after['overlays']==payload['overlays'];p.reload(wait_until='networkidle');assert durable()['personal']['knowledge']==payload['personal']['knowledge'];p.screenshot(path=str(OUT/'fresh-profile-semantic-restore.png'));record()
  phase='restored_reference_navigation';panel=open_context(p,'References');panel.locator('.reference-result[data-reference-group="PDF"] .reference-open').first.click();p.wait_for_timeout(450);s=durable()['personal']['session'];pane=next(a for a in s['panes'] if a['id']==s['activePane']);v=next(v for v in pane['views'] if v['id']==pane['active']);location=v['history'][v['cursor']];assert location['pdfPage']==3;assert location['pdfMode']=='spread';record()
  phase='pdf_spread_and_natural_wheel'
  if compat:checks.append({'id':phase,'status':'BLOCKED','error':'Compatibility origin cannot certify integrated PDF canvas/worker or wheel.'})
  else:
   expect(p.locator('.active-pane [data-page-rendered=true] canvas').first).to_be_visible(timeout=25000);show_reader_controls(p);p.get_by_label('PDF zoom',exact=True).select_option('2');p.wait_for_timeout(500);scroll=p.locator('.active-pane .pdf-canvas-scroll');before=scroll.evaluate('(e)=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight})');assert before['max']>150;scroll.hover();p.mouse.wheel(0,100);p.wait_for_timeout(300);after=scroll.evaluate('(e)=>e.scrollTop');assert after>before['top'];s=durable()['personal']['session'];v=s['panes'][0]['views'][-1];assert v['history'][v['cursor']]['pdfPage']==3;p.screenshot(path=str(OUT/'actual-pdf-reference-wheel.png'));record({'before':before['top'],'after':after})
  phase='no_browser_errors';assert not errors,errors;record();browser.close()
except Exception as e:
 text=str(e);blocked=isinstance(e,FileNotFoundError) or 'ERR_BLOCKED_BY_ADMINISTRATOR' in text or "Executable doesn't exist" in text;checks.append({'id':phase,'status':'BLOCKED' if blocked else 'FAIL','error':text});traceback.print_exc();covered={r['id'] for r in checks};checks.extend({'id':n,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'} for n in CASES if n not in covered)
report={'scope':__doc__,'build':'compatibility' if compat else 'integrated','checks':checks,'errors':errors,'status':'FAIL' if errors or any(r['status']=='FAIL' for r in checks) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in checks) else 'PASS'};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in checks),'total':len(CASES)}));raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
