from browser_support import bookmark_position,open_saved_manager,inspect_pdf_term,show_reader_controls
"""1.2.3 release acceptance, retaining all 1.2.2 persistence contracts: real HTTP origin, integrated PDF.js canvases, actual
IndexedDB, downloads and a new browser context. No injected store, fake renderer,
request interception, seeded local database or policy bypass. DOM interaction
sets scroll positions only to reach exact edge cases, then sends real wheels.
"""
import json,os,traceback,zipfile,hashlib,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,open_settings,open_context,reader_action,close_panels,open_more,show_reader_controls
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.2/runtime'));OUT.mkdir(parents=True,exist_ok=True)
CASES=['normal_origin','independent_slots','duplicate_categories','workspace_position','quick_layouts','pdf_engine','wheel_single','wheel_middle','wheel_gesture','wheel_spread','continuous_position','companion_navigation','companion_edit','companion_import_validation','local_ai_input','companion_promotion','pane_collapse_markers','compact_controls','geometry_themes','all_slot_reload','backup_download','fresh_restore','restored_reload','legacy_v2_restore','public_spark_companion','no_errors']
results=[];phase='normal_origin';errors=[];page=None

def record(detail=None):
 results.append({'id':phase,'status':'PASS','detail':detail});print('PASS',phase,flush=True)
def slot(ws,n=None):
 p=ws['personal'];n=n or p.get('activeWorkspaceSlot',1)
 return p['session'] if n==1 else p['workspaceSlots'][str(n)]
def location(session,index=0):
 pane=session['panes'][index];v=next(v for v in pane['views'] if v['id']==pane['active']);return v['history'][v['cursor']]
def snapshot(p):
 p.wait_for_timeout(260)
 value=p.evaluate('''async()=>{
 const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI));
 const canonical=await m.captureWorkspaceSnapshot(),persisted=await m.readPersistedWorkspace();
 const assets=await Promise.all(persisted.assets.map(async a=>({key:a.key,sha256:a.sha256,mediaType:a.mediaType,length:a.bytes.length,actualSha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a.bytes)),x=>x.toString(16).padStart(2,'0')).join('')})));
 return {canonicalPersonal:canonical.personal,canonicalOverlays:canonical.overlays,persisted:{...persisted,assets}};
 }''')
 assert value['canonicalPersonal']==value['persisted']['personal'],'Canonical and durable personal state differ after flush'
 assert value['canonicalOverlays']==value['persisted']['overlays'],'Canonical and durable overlays differ after flush'
 return value['persisted']
def wait_pdf(p,pane=None):
 area=pane or p.locator('.active-pane');area.locator('.integrated-pdf[data-pdf-state="ready"] canvas').first.wait_for();p.wait_for_timeout(250)
 assert area.locator('.pdf-fallback').count()==0
 return area

def search(p,title,new=False):
 p.keyboard.press('Control+k');p.get_by_role('textbox',name='Search all pages and glossary',exact=True).fill(title)
 if new:p.get_by_role('button',name='Open '+title+' in new tab',exact=True).click()
 else:p.locator('.search-result').filter(has_text=title).first.click()
 p.wait_for_timeout(160)
def workspace(p,n):
 if not p.locator('.library-sidebar:visible').count():p.get_by_role('button',name='Open notebook sidebar',exact=True).click()
 p.get_by_role('button',name=f'Workspace {n}',exact=True).click();p.wait_for_timeout(260)
def goto(p,n,pane=None):
 area=pane or p.locator('.active-pane');show_reader_controls(p,area);field=area.get_by_role('spinbutton',name='Physical PDF page number');field.fill(str(n));field.press('Enter');p.wait_for_timeout(350)
 assert field.input_value()==str(n)
def canvas(p):return p.locator('.active-pane .pdf-canvas-scroll')
def wheel(p,y,edge=None):
 c=canvas(p)
 if edge:c.evaluate('(e,where)=>{e.scrollTop=where==="bottom"?e.scrollHeight:where==="middle"?(e.scrollHeight-e.clientHeight)/2:0}',edge)
 box=c.bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.wheel(0,y);p.wait_for_timeout(130)
def number(p):return int(p.locator('.active-pane').get_by_role('spinbutton',name='Physical PDF page number').input_value())
def shot(p,name):p.screenshot(path=str(OUT/(name+'.png')))
def equal_personal(a,b,name):
 if a['personal']!=b['personal']:
  (OUT/(name+'-before.json')).write_text(json.dumps(b['personal'],indent=2));(OUT/(name+'-after.json')).write_text(json.dumps(a['personal'],indent=2))
 assert a['personal']==b['personal'],name+' exact personal state'
try:
 base=start_server()
 with sync_playwright() as pw:
  browser=launch(pw);context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=context.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base,wait_until='networkidle');page.get_by_role('button',name='Workspace 1',exact=True).wait_for();first=snapshot(page);assert first['personal']['schemaVersion']==3;assert page.locator('.category-filters [aria-pressed=true]').count()==0;record({'origin':base,'indexedDB':'real'})
  phase='independent_slots';search(page,'One note, several ways to read');page.locator('.note-scroller').evaluate('e=>{e.scrollTop=420;e.dispatchEvent(new Event("scroll"))}');page.wait_for_timeout(400);one=snapshot(page)
  workspace(page,2);empty=snapshot(page);assert slot(empty)['panes'][0]['views']==[];assert slot(empty,1)==slot(one,1);assert slot(empty).get('categoryFilter') is None
  record()
  phase='duplicate_categories'
  for n in [1,2]:workspace(page,n);page.get_by_role('button',name='Informatics filter',exact=True).click()
  search(page,'Loops');search(page,'Lists and dictionaries',True)
  for n in [3,4,5]:workspace(page,n);page.get_by_role('button',name='Norsk filter',exact=True).click();search(page,'Explain what you are learning')
  ws=snapshot(page);assert [slot(ws,n)['categoryFilter'] for n in [1,2]]==['informatics']*2;assert [slot(ws,n)['categoryFilter'] for n in [3,4,5]]==['norsk']*3;record()
  phase='workspace_position';workspace(page,1);restored=snapshot(page);assert slot(restored,1)['panes']==slot(one,1)['panes'];assert page.locator('.note-scroller').evaluate('e=>e.scrollTop')>300;page.get_by_role('button',name='Informatics filter',exact=True).click();assert slot(snapshot(page),1)['categoryFilter'] is None
  record()
  phase='quick_layouts';before=snapshot(page);page.get_by_role('button',name='Quick Book mode',exact=True).click();page.locator('.book-grid .book-sheet').first.wait_for();page.get_by_role('button',name='Quick Book mode',exact=True).click();after=snapshot(page)
  bv=slot(before)['panes'][0]['views'][0];av=slot(after)['panes'][0]['views'][0];assert av['id']==bv['id'] and av['cursor']==bv['cursor'] and len(av['history'])==len(bv['history']);assert location(slot(after))['presentation']=='continuous';assert len(slot(after)['panes'])==1;record()
  phase='pdf_engine';workspace(page,2);page.get_by_role('button',name='Informatics filter',exact=True).click();search(page,'PDF reading fixture',True);wait_pdf(page);assert page.locator('.pdf-companion').count()==0;assert page.locator('.pdf-study-tree').count()==0;assert slot(snapshot(page))['libraryMode']=='pdfs';record()
  phase='wheel_single';assert page.locator('.pdf-companion').count()==0;goto(page,1);wheel(page,150,'bottom');assert number(page)==2;page.wait_for_timeout(600);wheel(page,-150,'top');assert number(page)==1;record()
  phase='wheel_middle';goto(page,1);page.wait_for_timeout(600);assert canvas(page).evaluate('e=>e.scrollHeight-e.clientHeight')>200;wheel(page,100,'middle');assert number(page)==1;record()
  phase='wheel_gesture';goto(page,1);page.wait_for_timeout(600)
  for _ in range(5):wheel(page,800,'bottom')
  assert number(page)==2,'One continuous gesture must not skip multiple pages';page.wait_for_timeout(600);wheel(page,150,'bottom');assert number(page)==3;record()
  phase='wheel_spread';page.set_viewport_size({'width':1920,'height':1080});page.wait_for_timeout(250);goto(page,1);page.get_by_role('button',name='Quick PDF Spread',exact=True).click();page.wait_for_timeout(300);assert page.locator('.active-pane .physical-page').count()==2;page.wait_for_timeout(600);wheel(page,160,'bottom');assert number(page)==3
  page.locator('.active-pane').get_by_role('checkbox',name='Cover alone').check();goto(page,1);page.wait_for_timeout(600);wheel(page,160,'bottom');assert number(page)==2;page.wait_for_timeout(600);wheel(page,160,'bottom');assert number(page)==4
  page.get_by_role('button',name='Quick PDF Spread',exact=True).click();assert page.get_by_role('combobox',name='PDF presentation').input_value()=='single';record()
  phase='continuous_position';page.get_by_role('combobox',name='PDF presentation').select_option('continuous');goto(page,4);wheel(page,150);before=snapshot(page);anchor=location(slot(before))['anchor'];assert anchor['pdfPage']==4;assert isinstance(anchor.get('pdfOffset'),(float,int));page.reload(wait_until='networkidle');wait_pdf(page);after=snapshot(page);equal_personal(after,before,'continuous-reload');physical=page.locator('.active-pane [data-physical-page="4"]').bounding_box();box=canvas(page).bounding_box();assert physical['y']<box['y']+box['height'] and physical['y']+physical['height']>box['y'];record({'anchor':anchor})
  phase='companion_navigation';page.get_by_role('combobox',name='PDF presentation').select_option('single');assert page.locator('.pdf-companion').count()==0
  tree=page.locator('[data-node-id="node.page.atlas.pdf"]').locator('..')
  tree.get_by_role('button',name='Expand PDF PDF reading fixture',exact=True).click();assert tree.locator('.pdf-study-page').count()==0
  tree.get_by_role('button',name='Expand PDF category Reading a PDF',exact=True).click();tree.locator('.pdf-study-page[data-pdf-page="2"] .tree-target').first.click();assert number(page)==2
  inspect_pdf_term(page,'Selectable text');page.get_by_role('button',name='Go to PDF page 5',exact=True).click();assert number(page)==5;record()
  phase='companion_edit';open_more(page).get_by_role('button',name='Manage PDF details',exact=True).click();page.get_by_label('Edit concept',exact=True).select_option('text-layer');page.get_by_label('Concept translation',exact=True).fill('Valgbar tekst');page.get_by_label('Page occurrences (comma separated)',exact=True).fill('2, 5');page.get_by_label('Category title',exact=True).fill('Verified reading category');page.get_by_role('button',name='Save companion locally',exact=True).click();page.locator('dialog').wait_for(state='detached');saved=snapshot(page);comp=next(iter(saved['overlays']['companions'].values()));assert next(t for t in comp['terms'] if t['id']=='text-layer')['translation']=='Valgbar tekst';record()
  phase='companion_import_validation';open_more(page).get_by_role('button',name='Manage PDF details',exact=True).click();bad={**comp,'documentSha256':'0'*64};page.get_by_label('Import companion JSON',exact=True).set_input_files({'name':'bad-companion.json','mimeType':'application/json','buffer':json.dumps(bad).encode()});page.locator('dialog [role=alert]').wait_for();assert snapshot(page)['overlays']['companions']==saved['overlays']['companions']
  valid={**comp,'title':'Imported and reviewed companion'};page.get_by_label('Import companion JSON',exact=True).set_input_files({'name':'valid-companion.json','mimeType':'application/json','buffer':json.dumps(valid).encode()});page.get_by_role('button',name='Save companion locally',exact=True).click();page.locator('dialog').wait_for(state='detached');assert next(iter(snapshot(page)['overlays']['companions'].values()))['title']==valid['title'];record()
  phase='local_ai_input';requests=[];page.on('request',lambda r:requests.append({'method':r.method,'url':r.url}));open_more(page).get_by_role('button',name='Manage PDF details',exact=True).click();page.get_by_role('button',name='Prepare AI companion',exact=True).click();page.get_by_role('button',name='Extract locally',exact=True).click();page.get_by_role('button',name='Download AI input part 1',exact=True).wait_for()
  with page.expect_download() as transfer:page.get_by_role('button',name='Download AI input part 1',exact=True).click()
  path=OUT/'ai-input.json';transfer.value.save_as(str(path));data=json.loads(path.read_text());assert data['document']['pageCount']==5;assert data['schema']['additionalProperties'] is False;assert [p['page'] for p in data['pages']]==[1,2,3,4,5];assert data['pages'][4]['hasSelectableText'] is False;assert any('QA-ANCHOR-BRAVO' in p['text'] for p in data['pages']);assert not [r for r in requests if r['method'] not in ['GET','HEAD']];page.get_by_role('button',name='Close dialog',exact=True).click();record({'parts':1,'physicalPages':5,'uploadRequests':0})
  phase='companion_promotion';inspect_pdf_term(page,'Selectable text');page.get_by_role('button',name='Promote to global glossary',exact=True).click();page.wait_for_timeout(250);promoted=snapshot(page)['overlays']['glossary'];assert len(promoted)==1;assert promoted[0]['pdfRefs'][0]['pages']==[2,5];page.locator('dialog').wait_for(state='detached');inspect_pdf_term(page,'Selectable text');assert page.get_by_role('button',name='In global glossary',exact=True).is_disabled();page.get_by_role('button',name='Close dialog',exact=True).click();record()
  phase='pane_collapse_markers';goto(page,2);page.get_by_role('button',name='Compare in two panes',exact=True).click();search(page,'PDF reading fixture');wait_pdf(page);goto(page,4);before=snapshot(page);a=slot(before)['panes'][0];ratio=slot(before)['ratio'];page.get_by_role('button',name='Collapse pane A',exact=True).click();assert slot(snapshot(page))['panes'][0]==a
  page.get_by_role('button',name='Reveal pane A for PDF reading fixture',exact=True).click();wait_pdf(page);restored=snapshot(page);assert slot(restored)['ratio']==ratio;assert slot(restored)['panes'][0]==a;assert len(slot(restored)['panes'][0]['views'])==len(a['views']);assert number(page)==2
  page.get_by_role('button',name='Collapse pane B',exact=True).click();page.get_by_role('button',name='Restore pane B',exact=True).click();wait_pdf(page);assert number(page)==4;record()
  phase='compact_controls';page.get_by_role('button',name='Compare in two panes',exact=True).click();wait_pdf(page);show_reader_controls(page);assert page.locator('.pdf-companion,.topbar').count()==0;saved_views=slot(snapshot(page))['panes'][0]['views'];height=canvas(page).bounding_box()['height'];page.get_by_role('button',name='Hide reader controls',exact=True).click();page.wait_for_timeout(300);assert canvas(page).bounding_box()['height']>height+30;assert not page.evaluate('!!document.fullscreenElement');assert slot(snapshot(page))['panes'][0]['views']==saved_views
  page.get_by_role('button',name='Show reader controls',exact=True).click();record()
  phase='geometry_themes';measurements=[]
  for w,h,target in [(1366,768,.80),(1440,900,.84),(1920,1080,.87),(390,844,0)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(450);pane=page.locator('.active-pane').bounding_box();c=canvas(page).bounding_box();assert c['height']/pane['height']>=target,(w,pane,c);assert page.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   for name in ['Quick PDF Spread','Hide reader controls','Open context panel']:
    rect=page.get_by_role('button',name=name,exact=True).bounding_box();assert rect and 0<=rect['x'] and rect['x']+rect['width']<=w
   measurements.append({'width':w,'height':h,'companion':'sidebar tree','globalTopbarRows':0,'canvasFraction':c['height']/pane['height'],'pane':pane,'canvas':c});shot(page,'integrated-'+str(w))
  page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(200)
  for label in ['Fluent Blue','Neutral/Sage','Academic Paper','Soft Lavender','Dark Slate']:
   page.get_by_role('button',name='Theme',exact=True).click();page.get_by_role('button',name=label,exact=True).click();shot(page,'theme-'+label.lower().replace('/','-').replace(' ','-'))
  assert page.locator('.pdf-companion').count()==0;shot(page,'sidebar-study-surface');record(measurements)
  phase='all_slot_reload';before=snapshot(page);page.reload(wait_until='networkidle');wait_pdf(page);after=snapshot(page);equal_personal(after,before,'five-slots-reload');assert len(after['personal']['workspaceSlots'])==4;record()
  phase='backup_download';open_settings(page);before=snapshot(page)
  with page.expect_download() as transfer:page.get_by_role('button',name='Download workspace backup',exact=True).click()
  backup=OUT/'five-workspaces.atlas-backup.zip';transfer.value.save_as(str(backup))
  with zipfile.ZipFile(backup) as z:
   data=json.loads(z.read('backup.json'));assert data['workspace']['personal']==before['personal'];assert data['workspace']['overlays']==before['overlays'];assert len(data['workspace']['personal']['workspaceSlots'])==4
   for a in data['assetIndex']:assert hashlib.sha256(z.read(a['path'])).hexdigest()==a['sha256']
  expected=data['workspace'];record({'bytes':backup.stat().st_size,'schemaVersion':data.get('schemaVersion'),'exactPersonal':True,'exactCompanions':True});context.close()
  phase='fresh_restore';context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=context.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');assert snapshot(page)['personal']['workspaceSlots']=={}
  open_settings(page);page.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup));page.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();page.get_by_role('button',name='Restore verified backup',exact=True).click();page.locator('dialog').wait_for(state='detached');wait_pdf(page);restored=snapshot(page);equal_personal(restored,expected,'restored-five-slots');assert restored['overlays']==expected['overlays'];record()
  phase='restored_reload';page.reload(wait_until='networkidle');wait_pdf(page);again=snapshot(page);equal_personal(again,expected,'restored-five-slots-reload');assert again['overlays']==expected['overlays'];assert all(a['actualSha256']==a['sha256'] for a in again['assets']);assert not page.evaluate('!!document.fullscreenElement');shot(page,'restored-five-workspaces');record()
  phase='legacy_v2_restore';context.close()
  legacy_path=OUT/'legacy-v2.atlas-backup.zip'
  legacy_js="""
  import fs from 'node:fs/promises';
  import {blankWorkspace,newView} from './dist-offline/app/core/workspace.js';
  import {makeBackup} from './src/storage/archives.mjs';
  const ws=blankWorkspace(),view=newView('page.atlas.language');
  ws.personal.session.panes[0].views=[view];ws.personal.session.panes[0].active=view.id;
  ws.personal.session.screen='home';ws.personal.session.theme='lavender';
  ws.personal.notes['page.atlas.language']={pageId:'page.atlas.language',text:'Synthetic legacy migration remark',updatedAt:1};
  ws.personal.ratings['page.atlas.language']='orange';
  const built=JSON.parse(await fs.readFile('dist/content.json','utf8'));
  const backup=await makeBackup(ws,built,async key=>{const m=built.assets.find(a=>a.key===key);if(!m)throw Error('Missing fixture asset '+key);return {key,bytes:new Uint8Array(await fs.readFile('dist/'+m.path)),mediaType:m.mediaType,sha256:m.sha256};});
  await fs.writeFile(process.argv[1],backup.bytes);
  console.log(JSON.stringify(ws.personal));
  """
  original=json.loads(subprocess.check_output(['node','--input-type=module','-e',legacy_js,str(legacy_path)],cwd=ROOT,text=True))
  context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=context.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');open_settings(page)
  page.get_by_label('Restore workspace backup',exact=True).set_input_files(str(legacy_path));page.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();page.get_by_role('button',name='Restore verified backup',exact=True).click();page.locator('dialog').wait_for(state='detached')
  migrated=snapshot(page)['personal'];assert migrated=={**original,'schemaVersion':3,'activeWorkspaceSlot':1,'workspaceSlots':{}}
  page.reload(wait_until='networkidle');assert snapshot(page)['personal']==migrated;record({'legacyEnvelope':2,'migratedPersonal':3,'exactSlot1':True,'actualFreshContextReload':True})
  phase='public_spark_companion';search(page,'Apache Spark: 30 concepts');wait_pdf(page);show_reader_controls(page);assert page.locator('.pdf-companion').count()==0
  assert page.locator('.active-pane').get_by_label('Physical page count',exact=True).inner_text().strip()=='/ 6'
  goto(page,6);tree=page.locator('[data-node-id="node.pdfatlas.spark-concepts"]').locator('..')
  tree.get_by_role('button',name='Expand PDF Apache Spark: 30 concepts',exact=True).click();assert tree.locator('.pdf-study-page').count()==0
  tree.get_by_role('button',name='Expand PDF category 1. From MapReduce to Spark',exact=True).click();assert tree.locator('.pdf-study-page').count()>0;assert tree.locator('.pdf-study-term').count()==0;shot(page,'actual-public-spark-study-tree')
  close_panels(page);open_more(page).get_by_role('button',name='Manage PDF details',exact=True).click();options=page.get_by_label('Edit concept',exact=True).locator('option').all_text_contents();assert len(options)==30 and any('memory' in x.lower() for x in options);page.get_by_role('button',name='Close dialog',exact=True).click();record({'physicalPages':6,'conceptsPreservedOnDemand':30,'source':'Pinned byte-verified public PDF, not a substituted renderer'})
  phase='no_errors';assert errors==[],errors;record();browser.close()
except Exception as exc:
 status='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc) or "Executable doesn't exist" in str(exc) else 'FAIL'
 results.append({'id':phase,'status':status,'error':str(exc)});print(status,phase,str(exc),flush=True);traceback.print_exc()
 if page:
  try:shot(page,'failure-'+phase)
  except Exception:pass
 covered={r['id'] for r in results};results.extend({'id':name,'status':'BLOCKED','error':'Prerequisite '+phase+' did not complete.'} for name in CASES if name not in covered)
report={'scope':'Actual normal-origin integrated PDF, local IndexedDB, UI-driven workspaces and backup/fresh-context restoration','status':'FAIL' if any(r['status']=='FAIL' for r in results) else 'BLOCKED' if any(r['status']=='BLOCKED' for r in results) else 'PASS','checks':results,'errors':errors}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in results),'total':len(CASES)}));raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
