"""1.2.7 normal-origin integrated persistence and cross-resource release gate.
Unmodified application entry, real IndexedDB, user-visible edits/imports/download,
reload and fresh-profile restore. No storage mocks or browser-policy bypass.
ATLAS_DIST=dist-offline is diagnostic only: integrated PDF remains blocked.
"""
import json,os,traceback,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,close_panels,open_more,open_context,open_settings,state_action,show_reader_controls
from persistence_assertions import assert_personal_after_open
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.7/content-hub-runtime'));OUT.mkdir(parents=True,exist_ok=True)
CASES=['normal_origin','native_article','qcm_answer_and_draft','capture_context','taxonomy_and_reference','reload_all_shared_data','checkpoint_boundary','exact_backup_download','fresh_profile_restore','restored_typed_navigation','actual_pdf_qcm_compare','no_browser_errors']
results=[];errors=[];phase=CASES[0];p=None;compat=os.environ.get('ATLAS_DIST')=='dist-offline'
def record(detail=None):results.append({'id':phase,'status':'PASS','detail':detail});print('PASS',phase,flush=True)
def durable(p):
 p.wait_for_timeout(200);v=p.evaluate('''async()=>{const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI)),c=await m.captureWorkspaceSnapshot(),d=await m.readPersistedWorkspace();return {canonical:c.personal,personal:d.personal,canonicalOverlays:c.overlays,overlays:d.overlays};}''');assert v['canonical']==v['personal'];assert v['canonicalOverlays']==v['overlays'];return {'personal':v['personal'],'overlays':v['overlays']}
def click(name,area=None):
 (area or p).get_by_role('button',name=name,exact=True).click();p.wait_for_timeout(100)
def search(title):
 close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(150)
def import_doc(kind,doc):
 close_panels(p);click(kind+' content');p.get_by_role('button',name='Add article' if kind=='Article' else 'New/import QCM',exact=True).last.click();p.get_by_label('Content JSON file',exact=True).set_input_files({'name':'source.json','mimeType':'application/json','buffer':json.dumps(doc).encode()});click('Import local content');expect(p.locator('dialog[open]')).to_have_count(0)
def capture(text,attach=False):
 close_panels(p);click('Quick Capture',p.locator('.workspace-dock'));click('Note',p.locator('dialog'));p.get_by_label('Capture text 1',exact=True).fill(text)
 if attach:p.get_by_role('checkbox',name='Attach current reading context',exact=True).check()
 click('Save captures');expect(p.locator('dialog[open]')).to_have_count(0)
try:
 dist=ROOT/os.environ.get('ATLAS_DIST','dist')
 if not os.environ.get('ATLAS_BASE_URL') and not (dist/'index.html').exists():raise FileNotFoundError('Required application build is absent: '+str(dist/'index.html'))
 base=start_server()
 with sync_playwright() as pw:
  browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto(base,wait_until='networkidle');expect(p.locator('.dashboard-page')).to_be_visible();durable(p);record({'origin':base,'build':'compatibility' if compat else 'integrated'})
  article=json.loads((ROOT/'examples/content-hub/article-sample.json').read_text());qcm=json.loads((ROOT/'examples/content-hub/qcm-sample.json').read_text())
  phase='native_article';import_doc('Article',article);expect(p.locator('.active-pane')).to_contain_text(article['text']);assert durable(p)['overlays']['pages'][article['id']]['page']['article']['taxonomy']==article['taxonomy'];record()
  phase='qcm_answer_and_draft';import_doc('QCM',qcm);p.locator('.qcm-options input[value=c]').check();click('Check answer');p.get_by_label('Question reflection',exact=True).fill('Persistent exact reflection.');click('Next question');p.locator('.qcm-options input[value=a]').check();v=durable(p);assert v['personal']['qcmAttempts'][0]['correct'];assert v['personal']['qcmResponses'][-1]['selectedOptionIds']==['a'];record()
  phase='capture_context';capture('Exact question context',True);capture('Global note without inherited context');v=durable(p);linked=next(i for i in v['personal']['dashboardItems'] if i['text']=='Exact question context');assert linked['contextTarget']['kind']=='qcm' and linked['contextTarget']['questionId']=='q2';global_note=next(i for i in v['personal']['dashboardItems'] if i['text']=='Global note without inherited context');assert 'contextTarget' not in global_note;record()
  phase='taxonomy_and_reference';click('QCM content');p.get_by_label('Classification subject',exact=True).select_option('it');folders=p.get_by_label('Classification folder',exact=True).locator('option').evaluate_all('(es)=>es.filter(e=>e.value).map(e=>e.value)');assert folders;folder=folders[0];p.get_by_label('Classification folder',exact=True).select_option(folder);click('Save classification');p.get_by_label('Reference destination subject',exact=True).select_option('it');p.get_by_label('Reference destination folder',exact=True).select_option(folder);click('Add reference to Notebook');v=durable(p);assert v['overlays']['references'][0]['target']['setId']==qcm['id'];assert v['overlays']['taxonomy'][qcm['id']]['folderId']==folder;record()
  phase='reload_all_shared_data';search(qcm['title']);p.get_by_label('Current QCM question',exact=True).select_option('q2');expected=durable(p);p.reload(wait_until='networkidle');after=durable(p);assert after['overlays']==expected['overlays'];assert_personal_after_open(after['personal'],expected['personal']);expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q2');expect(p.locator('.qcm-options input[value=a]')).to_be_checked();record()
  phase='checkpoint_boundary';state_action(p,'Save all workspace states');capture('Created after all-workspaces save');p.locator('.qcm-options input[value=b]').check();p.locator('.qcm-options input[value=d]').check();click('Check answer');latest=durable(p);state_action(p,'Restore last all-workspaces save');after=durable(p);assert after['overlays']==latest['overlays'];
  for key in ['dashboardItems','qcmAttempts','qcmResponses','bookmarks','readLater']:assert after['personal'].get(key)==latest['personal'].get(key),key
  record()
  phase='exact_backup_download';open_settings(p);expected=durable(p)
  with p.expect_download() as dl:click('Download workspace backup')
  backup=OUT/'content-hub-full.atlas-backup.zip';dl.value.save_as(str(backup))
  with zipfile.ZipFile(backup) as z:payload=json.loads(z.read('backup.json'))['workspace']
  assert payload['personal']==expected['personal'];assert payload['overlays']==expected['overlays'];record({'backupBytes':backup.stat().st_size})
  phase='fresh_profile_restore';ctx.close();ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto(base,wait_until='networkidle');assert not durable(p)['overlays']['pages'];open_settings(p);p.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup));p.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();click('Restore verified backup');expect(p.locator('dialog[open]')).to_have_count(0);after=durable(p);assert after['overlays']==payload['overlays'];assert_personal_after_open(after['personal'],payload['personal']);p.reload(wait_until='networkidle');after=durable(p);assert after['overlays']==payload['overlays'];assert_personal_after_open(after['personal'],payload['personal']);p.screenshot(path=str(OUT/'fresh-profile-restored.png'));record()
  phase='restored_typed_navigation';click('Open Dashboard');p.get_by_role('button',name='Source for Exact question context',exact=True).click();expect(p.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q2');click('Notebook content');p.locator('.tree-target').filter(has_text=qcm['title']).first.click();expect(p.locator('.qcm-reader')).to_be_visible();search(article['title']);expect(p.locator('.active-pane')).to_contain_text(article['text']);record()
  phase='actual_pdf_qcm_compare'
  if compat:results.append({'id':phase,'status':'BLOCKED','error':'Compatibility build cannot certify integrated PDF canvas/worker.'})
  else:
   search(qcm['title']);p.get_by_label('Current QCM question',exact=True).select_option('q2');click('Compare in two panes');search('PDF reading fixture');show_reader_controls(p);expect(p.locator('.active-pane [data-page-rendered=true] canvas').first).to_be_visible(timeout=20000);expect(p.locator('.document-pane').first.locator('.qcm-reader')).to_have_attribute('data-qcm-question','q2');p.screenshot(path=str(OUT/'qcm-pdf-compare.png'));record()
  phase='no_browser_errors';assert not errors,errors;record();browser.close()
except Exception as e:
 text=str(e);blocked=isinstance(e,FileNotFoundError) or 'ERR_BLOCKED_BY_ADMINISTRATOR' in text or "Executable doesn't exist" in text
 results.append({'id':phase,'status':'BLOCKED' if blocked else 'FAIL','error':text});traceback.print_exc();covered={r['id'] for r in results};results.extend({'id':n,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'} for n in CASES if n not in covered)
report={'scope':__doc__,'build':'compatibility' if compat else 'integrated','checks':results,'errors':errors,'status':'FAIL' if errors or any(r['status']=='FAIL' for r in results) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in results) else 'PASS'};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in results),'total':len(CASES)}));raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
