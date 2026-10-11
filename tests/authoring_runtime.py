"""All three authoring files through the real application UI on a normal local origin.
Disposable Chromium contexts, integrated bundle, real IndexedDB and UI backup restore.
Synthetic fixtures. A dirty build is diagnostic evidence, never clean release proof.
"""
import json, os, traceback, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, launch, open_more, open_settings, close_panels, open_article_advanced
from v23_browser_common import AGENT, SNAPSHOT

OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/authoring-runtime'));OUT.mkdir(parents=True,exist_ok=True)
FIX=ROOT/'examples/authoring';results=[];errors=[];phase='integrated normal origin';page=None
build=json.loads((ROOT/'dist/build-identity.json').read_text()) if (ROOT/'dist/build-identity.json').exists() else {}
def record(name):
 results.append({'name':name,'status':'PASS'});print('PASS',name,flush=True)
def button(name,scope=None):return (scope or page).get_by_role('button',name=name,exact=True)
def snapshot():
 return page.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();return await m.readPersistedWorkspace();}')
def search(title):
 close_panels(page);page.keyboard.press('Control+k');page.get_by_label('Search all pages and glossary',exact=True).fill(title);page.locator('.search-result').filter(has_text=title).first.click()
try:
 assert os.environ.get('ATLAS_DIST','dist')!='dist-offline','This test requires the integrated app'
 assert build.get('buildKind')=='integrated','Missing integrated build identity'
 base=start_server()
 with sync_playwright() as pw:
  browser=launch(pw);ctx=browser.new_context(viewport={'width':1500,'height':1000},accept_downloads=True);page=ctx.new_page();page.set_default_timeout(15000)
  page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app')
  page.wait_for_function('async()=>{const d=('+AGENT+').getStorageDiagnostics();return d.ready&&d.initialized&&d.saving===0;}')
  initial=snapshot();record(phase)
  phase='cheatsheet invalid input recovery, UI file import and exact durable source'
  open_more(page).get_by_role('button',name='Import cheatsheet JSON',exact=True).click()
  page.get_by_label('Structured cheatsheet JSON',exact=True).fill('{"schemaVersion":');button('Import local cheatsheet').click();expect(page.get_by_role('alert')).to_be_visible()
  assert snapshot()['history']==initial['history']
  page.get_by_label('Cheatsheet JSON file',exact=True).set_input_files(str(FIX/'sql-study.cheatsheet.json'));button('Validate source').click()
  expect(page.get_by_role('status').filter(has_text='Valid source: 3 physical pages')).to_be_visible();button('Import local cheatsheet').click();expect(page.locator('dialog[open]')).to_have_count(0)
  sheet=json.loads((FIX/'sql-study.cheatsheet.json').read_text());ws=snapshot();sheet_id=next(k for k,v in ws['overlays']['pages'].items() if v['page'].get('cheatsheet',{}).get('id')==sheet['id'])
  assert ws['overlays']['pages'][sheet_id]['page']['cheatsheet']==sheet
  expect(page.locator('.active-pane .sheet-svg>svg').first).to_contain_text('GROUP BY');record(phase)
  phase='cheatsheet source edit and reload preserve IDs, exact content and native SVG'
  open_more(page).get_by_role('button',name='Edit current page',exact=True).click();sheet['pages'][0]['blocks'][1]['text']='Filtering and grouping\nEdited locally: WHERE before grouping; HAVING after aggregation.'
  page.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(sheet));button('Save cheatsheet source').click();expect(page.locator('dialog[open]')).to_have_count(0)
  page.reload(wait_until='networkidle');expect(page.locator('.active-pane .sheet-svg>svg').first).to_contain_text('Edited locally')
  assert snapshot()['overlays']['pages'][sheet_id]['page']['cheatsheet']==sheet;page.screenshot(path=str(OUT/'cheatsheet-reloaded.png'));record(phase)
  phase='Article malformed JSON recovery and native safe structured body import'
  close_panels(page);button('Article content').click();button('Add article').last.click();open_article_advanced(page)
  page.get_by_label('Content JSON file',exact=True).set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{"id":'})
  before=snapshot();button('Import local content').click();expect(page.get_by_role('alert')).to_be_visible();assert snapshot()['history']==before['history']
  page.get_by_label('Content JSON file',exact=True).set_input_files(str(FIX/'article-blocks.import.json'));button('Import local content').click();expect(page.locator('dialog[open]')).to_have_count(0)
  article=json.loads((FIX/'article-blocks.import.json').read_text(encoding='utf-8'));ws=snapshot();ap=ws['overlays']['pages'][article['id']]['page'];assert ap['id']==ap['article']['id']==article['id'];assert ap['blocks']==article['blocks']
  expect(page.locator('.active-pane')).to_contain_text('Aggregate at the intended grain');page.reload(wait_until='networkidle');expect(page.locator('.active-pane')).to_contain_text('COUNT(*)');assert snapshot()['overlays']['pages'][article['id']]['page']['blocks']==article['blocks']
  page.screenshot(path=str(OUT/'article-reloaded.png'));record(phase)
  phase='Article text source compatibility and collision rejection preserve prior content'
  close_panels(page);button('Article content').click();button('Add article').last.click();open_article_advanced(page)
  text={'id':'authoring-text-article','title':'Synthetic plain text Article','text':'å gå / go, walk\nPlain-text source preserved.'}
  page.get_by_label('Content JSON file',exact=True).set_input_files({'name':'text.json','mimeType':'application/json','buffer':json.dumps(text).encode()});button('Import local content').click();expect(page.locator('dialog[open]')).to_have_count(0)
  expect(page.locator('.active-pane')).to_contain_text(text['text']);text_before=snapshot()
  button('Article content').click();button('Add article').last.click();open_article_advanced(page);page.get_by_label('Content JSON file',exact=True).set_input_files({'name':'collision.json','mimeType':'application/json','buffer':json.dumps({**text,'text':'Must not overwrite'}).encode()});button('Import local content').click();expect(page.get_by_role('alert')).to_be_visible();assert snapshot()['overlays']==text_before['overlays'];close_panels(page);record(phase)
  phase='Norsk CSV invalid recovery, preview boundary and exact source/provenance import'
  open_settings(page);before=snapshot();page.get_by_label('Import CSV table',exact=True).set_input_files({'name':'broken.csv','mimeType':'text/csv','buffer':b'Norsk,English\nonly-one-column\n'});expect(page.locator('dialog .error-message')).to_be_visible();assert snapshot()['history']==before['history']
  page.get_by_label('Import CSV table',exact=True).set_input_files(str(FIX/'norsk-source.import.csv'));expect(button('Confirm library import')).to_be_enabled();assert snapshot()['history']==before['history'];button('Confirm library import').click();expect(page.get_by_role('status').filter(has_text='Library imported.')).to_be_visible();button('Close dialog').click()
  ws=snapshot();pack=next(p for p in ws['imports'] if p['manifest']['id'].startswith('csv.local.'));np=pack['pages'][0];assert np['blocks'][0]['rows'][0]==['å gå','go, walk','VERB','A2','Travel','Synthetic QA','',''];assert all(r[6:]==['',''] for r in np['blocks'][0]['rows']);assert np['sources'][0]['title']=='norsk-source.import.csv'
  record(phase)
  phase='Norsk reading layout, controls and reload keep complete source and blank relations'
  page.goto(base+'#/page/'+np['id'],wait_until='networkidle');pane=page.locator('.active-pane');pane.locator('.table-column-tools').wait_for(state='attached')
  if pane.locator('.book-grid').count():button('Quick Book mode',pane).click()
  for t in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():t.click()
  button('NO / EN',pane).click();expect(pane.locator('.csv-layout-pairs')).to_be_visible();button('Lines',pane).click();expect(pane.locator('.csv-layout-lines')).to_be_visible();saved=snapshot();page.reload(wait_until='networkidle');expect(page.locator('.active-pane .csv-layout-lines')).to_be_visible();assert next(p for pack in snapshot()['imports'] for p in pack['pages'] if p['id']==np['id'])==np
  assert snapshot()['history']==saved['history'];page.screenshot(path=str(OUT/'norsk-reloaded.png'));record(phase)
  phase='UI backup contains all authored sources; fresh isolated profile verified restore'
  open_settings(page);saved=snapshot()
  with page.expect_download() as download:button('Download workspace backup').click()
  backup=OUT/'synthetic-authoring.atlas-backup.zip';download.value.save_as(str(backup))
  with zipfile.ZipFile(backup) as z:
   envelope=json.loads(z.read('backup.json'));payload=envelope['workspace']
   index=json.loads(z.read('history/index.json'))
   assert index['heads']==saved['history']['heads']
   assert [r for n in index['revisionShards'] for r in json.loads(z.read(n))]==saved['history']['revisions']
  assert payload['overlays']==saved['overlays']
  # A complete backup materializes the built-in packs too. Compare each local
  # authored pack by identity rather than expecting the source-only local list.
  exported={p['manifest']['id']:p for p in payload['imports']}
  for local in saved['imports']:assert exported[local['manifest']['id']]==local
  ctx.close()
  ctx=browser.new_context(viewport={'width':1500,'height':1000},accept_downloads=True);page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app');assert not snapshot()['overlays']['pages']
  open_settings(page);page.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup));page.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();button('Restore verified backup').click();expect(page.locator('dialog[open]')).to_have_count(0)
  page.reload(wait_until='networkidle');restored=snapshot();assert restored['overlays']==payload['overlays']
  assert restored['imports']==envelope['retainedImportedRevisions']
  assert restored['history']==saved['history']
  search(article['title']);expect(page.locator('.active-pane')).to_contain_text('COUNT(*)');search(sheet['title']);expect(page.locator('.active-pane .sheet-svg>svg').first).to_contain_text('Edited locally');page.screenshot(path=str(OUT/'restored-authoring.png'));record(phase)
  phase='no uncaught browser errors';assert not errors,errors;record(phase);browser.close()
except Exception as exc:
 if page:
  try:page.screenshot(path=str(OUT/'failure.png'))
  except Exception:pass
 results.append({'name':phase,'status':'FAIL','error':str(exc)});traceback.print_exc()
report={'scope':__doc__,'build':build,'releaseQualification':False if build.get('sourceDirty',True) else 'Requires same-source final qualification record','checks':results,'browserErrors':errors,'status':'PASS' if results and all(r['status']=='PASS' for r in results) else 'FAIL'}
(OUT/'results.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in results),'checks':len(results)}));raise SystemExit(0 if report['status']=='PASS' else 1)
