"""1.2.6 compiled compatibility UI in Chromium on about:blank.
Real DOM events and SVG geometry; in-memory store. NOT an integrated React/PDF,
IndexedDB, native OS clipboard or fresh-profile persistence certification.
"""
import hashlib,json,os,traceback,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom,close_panels,open_context,open_more,open_settings,open_saved_manager,state_action,show_reader_controls
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.6/cheatsheets-ui'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server(dom_only=True);results=[];errors=[]
IDS=['sql-analytics','pyspark-execution','azure-data-factory','pandas-essentials']
DOCS={id:json.loads((ROOT/'content/cheatsheets'/f'{id}.json').read_text(encoding='utf-8')) for id in IDS}
four={'schemaVersion':'1.1','id':'test-four-pages','title':'Four-page UI fixture','pageSize':{'width':1200,'height':1600},'pages':[{'id':f'four.p{i}','title':f'Physical test page {i}','blocks':[{'id':f'four.b{i}','type':'text','text':f'Distinct physical page {i}','role':'title'}],'frames':{f'four.b{i}':{'x':100,'y':150,'width':1000,'height':200}},'outline':[{'id':f'four.a{i}','label':f'Page {i}','blockId':f'four.b{i}'}]} for i in range(1,5)]}
with sync_playwright() as pw:
 browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);p=ctx.new_page();p.set_default_timeout(6000);p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base)
 p.expose_function('atlasTestSHA256',lambda data:list(hashlib.sha256(bytes(data)).digest()))
 p.evaluate('''()=>{if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(algorithm,data)=>{if(algorithm!=='SHA-256')throw Error('Only SHA-256');return new Uint8Array(await window.atlasTestSHA256(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer;}}});}''')
 def btn(name,scope=None):return (scope or p).get_by_role('button',name=name,exact=True)
 def pane():return p.locator('.active-pane')
 def svg():return pane().locator('.sheet-svg>svg')
 def session():return p.evaluate('testStore.state.personal.activeWorkspaceSlot===1?testStore.state.personal.session:testStore.state.personal.workspaceSlots[testStore.state.personal.activeWorkspaceSlot]')
 def loc():return p.evaluate('''()=>{const s=testStore.state.personal.activeWorkspaceSlot===1?testStore.state.personal.session:testStore.state.personal.workspaceSlots[testStore.state.personal.activeWorkspaceSlot],a=s.panes.find(x=>x.id===s.activePane),v=a.views.find(x=>x.id===a.active);return v.history[v.cursor];}''')
 def reset(id='sql-analytics'):
  close_panels(p);p.set_viewport_size({'width':1440,'height':1000});p.evaluate('(id)=>testReset(id)',id if id.startswith('page.') else 'page.cheatsheet.'+id);p.wait_for_timeout(180)
 def go(n):
  field=pane().get_by_role('spinbutton',name='Physical cheatsheet page number');field.fill(str(n));field.press('Enter');p.wait_for_timeout(100)
 def action(n,label):
  close_panels(p);btn(f'Actions for cheatsheet page {n}',pane()).click();p.get_by_role('menuitem',name=label,exact=True).click();p.wait_for_timeout(180)
 def shot(name):p.screenshot(path=str(OUT/(name+'.png')))
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def import_doc(doc):
  close_panels(p);open_more(p).get_by_role('button',name='Import cheatsheet JSON',exact=True).click();p.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(doc));btn('Validate source').click();expect(p.locator('dialog [role=status]')).to_contain_text('Valid source');btn('Import local cheatsheet').click();expect(p.locator('dialog[open]')).to_have_count(0);expect(p.locator(f'[data-native-cheatsheet="{doc["id"]}"]')).to_be_visible();return loc()['pageId']
 def search(title):
  close_panels(p);p.keyboard.press('Control+k');p.get_by_label('Search all pages and glossary',exact=True).fill(title);p.locator('.search-result').filter(has_text=title).first.click();p.wait_for_timeout(180)
 def all_fixtures():
  rows=[]
  for id in IDS:
   reset(id)
   for number in [1,2]:
    go(number);expect(svg()).to_have_attribute('data-cheatsheet-page',str(number));expect(svg()).to_have_attribute('viewBox','0 0 1200 1600');assert not svg().locator('foreignObject,script,image,canvas').count();assert svg().locator('text').count()>10
    # Browser glyph metrics change fractionally under uniform page scaling.
    # Allow 2px ink bearing plus 0.1 logical px rounding; all collisions,
    # text equality, live SVG and renderer overflow checks remain enforced.
    audit=svg().evaluate('''el=>{const failures=[],ids=[...el.querySelectorAll('[id]')].map(x=>x.id);for(const t of el.querySelectorAll('[data-block-id] text')){const f=t.closest('[data-block-id]').dataset.frame.split(',').map(Number),b=t.getBBox();if(!t.textContent||!b.width||!b.height)continue;if(b.x<f[0]-2.1||b.y<f[1]-2.1||b.x+b.width>f[0]+f[2]+2.1||b.y+b.height>f[1]+f[3]+2.1)failures.push({block:t.closest('[data-block-id]').dataset.blockId,text:t.textContent,bounds:[b.x,b.y,b.width,b.height],frame:f});}return {failures,uniqueIds:new Set(ids).size===ids.length,textElements:el.querySelectorAll('text').length,liveFragments:el.querySelectorAll('text>tspan>tspan').length};}''')
    assert audit['uniqueIds'];assert not audit['failures'],audit['failures'];assert pane().locator('[data-overflow=true]').count()==0
    # Top-level fixed frames may not collide. Nested box children intentionally live inside their parent.
    frames=[DOCS[id]['pages'][number-1]['frames'][b['id']] for b in DOCS[id]['pages'][number-1]['blocks']]
    for i,a in enumerate(frames):
     for b in frames[i+1:]:assert min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x'])<=.01 or min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y'])<=.01,(a,b)
    rows.append({'document':id,'page':number,**audit});shot(id+'-'+str(number))
  (OUT/'geometry-and-text.json').write_text(json.dumps({'inkBearingToleranceLogicalPx':2.1,'emptyTextBoundingBoxesExcluded':True,'pages':rows},indent=2));return rows
 check('All eight actual native pages: live SVG, no frame collisions or text overflow, scoped IDs',all_fixtures)
 def text_integrity():
  totals=[]
  for id in IDS:
   reset(id)
   for number in [1,2]:
    go(number)
    result=pane().evaluate('''(el,{doc,number})=>{const fields=b=>{switch(b.type){case 'text':return [b.text];case 'list':return b.items;case 'code':return [b.title,b.code];case 'table':return [...b.columns,...b.rows.flat()];case 'box':return [b.title,b.text];case 'diagram':return [b.caption,...(b.family==='sequence'?b.items:[...b.nodes.map(n=>n.label),...b.edges.map(e=>e.label)])];default:return [];}};const plain=v=>(typeof v==='string'?v:v?.map(r=>r.text).join('')??'').replaceAll('\\u200b','').replaceAll('\\t','    ');let count=0;const failures=[];function walk(bs){for(const b of bs){const group=[...el.querySelectorAll('[data-block-id]')].find(g=>g.dataset.blockId===b.id),texts=[...group.querySelectorAll('text')].map(t=>t.textContent);for(const f of fields(b)){const expected=plain(f);if(!expected)continue;count++;if(!texts.includes(expected))failures.push({block:b.id,expected,texts});}if(b.children)walk(b.children);}}walk(doc.pages[number-1].blocks);return {count,failures};}''',{'doc':DOCS[id],'number':number})
    assert not result['failures'],result['failures'];totals.append({'document':id,'page':number,'fragments':result['count']})
  (OUT/'canonical-live-text-roundtrip.json').write_text(json.dumps(totals,indent=2));return {'matchedCanonicalTextFields':sum(r['fragments'] for r in totals),'pages':8}
 check('Every nonempty canonical text field is present as exact live SVG text, not a raster/path substitute',text_integrity)
 def modes():
  reset();btn('Next cheatsheet page group',pane()).click();expect(svg()).to_have_attribute('data-cheatsheet-page','2');btn('Previous cheatsheet page group',pane()).click();expect(svg()).to_have_attribute('data-cheatsheet-page','1');btn('Two pages',pane()).click();expect(svg()).to_have_count(2);assert svg().evaluate_all('(es)=>es.map(e=>e.dataset.cheatsheetPage)')==['1','2'];btn('Select cheatsheet page 2',pane()).click();assert loc()['sheetPage']==2
  btn('Four pages',pane()).click();assert svg().count()==2;assert loc()['sheetMode']=='grid';btn('Single page',pane()).click();expect(svg()).to_have_attribute('data-cheatsheet-page','2');p.locator('.sheet-viewport').focus();p.keyboard.press('PageUp');expect(svg()).to_have_attribute('data-cheatsheet-page','1');p.keyboard.press('PageDown');expect(svg()).to_have_attribute('data-cheatsheet-page','2')
 check('Physical page controls, two-page spread, terminal partial grid and keyboard navigation',modes)
 def four_grid():
  reset();import_doc(four);btn('Quick four-page cheatsheet grid',pane()).click();expect(svg()).to_have_count(4);boxes=pane().locator('.sheet-figure').evaluate_all('(es)=>es.map(e=>{const b=e.getBoundingClientRect();return {page:e.dataset.physicalSheet,x:b.x,y:b.y,w:b.width,h:b.height};})');assert [b['page'] for b in boxes]==['1','2','3','4'];assert abs(boxes[0]['y']-boxes[1]['y'])<1 and abs(boxes[2]['y']-boxes[3]['y'])<1;assert boxes[2]['y']>boxes[0]['y']+boxes[0]['h'];assert boxes[1]['x']>boxes[0]['x']+boxes[0]['w'];shot('four-distinct-pages-grid');btn('Select cheatsheet page 4',pane()).click();btn('Quick four-page cheatsheet grid',pane()).click();expect(svg()).to_have_attribute('data-cheatsheet-page','4');return boxes
 check('Four distinct physical pages, genuine 2x2 geometry and quick-grid return to selected page',four_grid)
 def independent():
  reset();go(2);action(2,'Open in other pane');show_reader_controls(p);expect(p.locator('.document-pane')).to_have_count(2);panes=p.locator('.document-pane');a,b=panes.nth(0),panes.nth(1);btn('Two pages',b).click();assert session()['panes'][0]['views'][0]['history'][0].get('sheetMode','single')=='single';assert b.locator('.sheet-svg>svg').count()==2;ids=p.locator('.sheet-svg [id]').evaluate_all('(es)=>es.map(x=>x.id)');assert len(ids)==len(set(ids));btn('Hide reader controls',a).click();assert not a.locator('.sheet-toolbar').is_visible();assert b.locator('.sheet-toolbar').is_visible();shot('independent-native-panes');assert loc()['sheetPage']==2
 check('Two native panes have independent modes, controls and collision-free SVG IDs',independent)
 def compare_note():
  reset();go(2);action(2,'Open in other pane');search('Q1 - WHERE / GROUP BY / HAVING');assert p.locator('.document-pane').nth(0).locator('.sheet-svg>svg').get_attribute('data-cheatsheet-page')=='2';assert pane().locator('.note-scroller').count()==1;assert pane().locator('pre code').count()>0;shot('interview-cheatsheet-compare')
 check('Compare keeps a native page beside the unchanged actual interview notebook reader',compare_note)
 def compare_pdf_fallback():
  reset();action(1,'Open in other pane');search('PDF reading fixture');assert p.locator('.document-pane').nth(0).locator('.sheet-svg>svg').count()==1;assert 'PDF' in pane().inner_text();assert loc()['pageId']=='page.atlas.pdf';return 'Compatibility PDF fallback only; actual PDF-engine Compare remains a runtime gate.'
 check('Native/PDF document routing is independent (compatibility fallback, not engine verification)',compare_pdf_fallback)
 for label in ['Open here','Open in new tab','Open in Workspace 4']:
  def destination(label=label):
   reset();go(2);before=session()
   if 'Workspace' in label:action(2,'Open in workspace...');p.get_by_role('menuitem',name=label,exact=True).click();show_reader_controls(p)
   else:action(2,label)
   expect(svg()).to_have_attribute('data-cheatsheet-page','2');assert loc()['anchor']['sheetId']==DOCS['sql-analytics']['pages'][1]['id']
   if label=='Open in new tab':assert len(session()['panes'][0]['views'])==2
   if 'Workspace' in label:assert p.evaluate('testStore.state.personal.activeWorkspaceSlot')==4;assert p.evaluate('testStore.state.personal.session')==before
  check('Actual reading action: '+label,destination)
 def bookmark_later():
  reset();go(2);action(2,'Bookmark');action(2,'Add to Read later');assert p.evaluate('testStore.state.personal.bookmarks[0].target.kind')=='cheatsheet-page';assert p.evaluate('testStore.state.personal.readLater[0].target.sheetPage')==2;go(1);btn('Open bookmarks').click();p.locator('.reading-item .reading-open').click() if p.locator('.reading-item .reading-open').count() else p.locator('.reading-item').get_by_role('button').first.click();close_panels(p);expect(svg()).to_have_attribute('data-cheatsheet-page','2');go(1);btn('Open read later').click();p.locator('.reading-item').get_by_role('button').first.click();close_panels(p);expect(svg()).to_have_attribute('data-cheatsheet-page','2')
 check('Bookmarks and Read Later restore the rendered physical page, not just the page-number field',bookmark_later)
 def outline_search():
  reset();panel=open_context(p);section=DOCS['sql-analytics']['pages'][1]['outline'][0]['label'];panel.get_by_role('button',name=section,exact=True).click();expect(svg()).to_have_attribute('data-cheatsheet-page','2');assert loc()['anchor']['blockId']==DOCS['sql-analytics']['pages'][1]['outline'][0]['blockId'];go(1);open_context(p,'Search');p.get_by_label('Search this document',exact=True).fill('DENSE_RANK');p.locator('.document-search-hit').first.click();expect(svg()).to_have_attribute('data-cheatsheet-page','2');shot('outline-search-anchor')
 check('Context outline and scoped text search resolve stable section/block anchors on physical page 2',outline_search)
 def global_search():
  reset('page.atlas.layouts');search('SQL for Analytics');assert loc()['pageId']=='page.cheatsheet.sql-analytics';expect(svg()).to_have_attribute('data-cheatsheet-page','1')
 check('Native content participates in global search without becoming a fake PDF',global_search)
 def remarks():
  reset();open_context(p,'Remarks');p.get_by_label('Personal remarks',exact=True).fill('Page one personal thought.');go(2);expect(p.get_by_label('Personal remarks',exact=True)).to_have_value('');p.get_by_label('Personal remarks',exact=True).fill('Page two personal thought.');go(1);expect(p.get_by_label('Personal remarks',exact=True)).to_have_value('Page one personal thought.');notes=p.evaluate('testStore.state.personal.notes');assert len(notes)==2;assert {n['anchor']['sheetPage'] for n in notes.values()}=={1,2};assert all(n['anchor'].get('sheetId') for n in notes.values())
 check('Remarks stay attached to stable physical page identities and do not overwrite the other page',remarks)
 def related():
  reset();panel=open_context(p,'Related');assert panel.locator('.related-document-row').count()==5;panel.locator('.related-document-row .context-link').first.click();assert loc()['pageId'].startswith('page.interview.sql-q');panel=open_context(p,'Related');assert 'Linked from' in panel.inner_text();panel.get_by_role('button',name='SQL for Analytics',exact=True).click();expect(svg()).to_have_attribute('data-cheatsheet-page','1')
 check('Existing Related links work from cheatsheet to interview and back through backlinks',related)
 def whitespace_copy():
  reset();result=pane().evaluate('''el=>{const t=el.querySelector('text[data-code-language]'),range=document.createRange();range.selectNodeContents(t);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);const transfer=new DataTransfer(),event=new ClipboardEvent('copy',{bubbles:true,cancelable:true,clipboardData:transfer});t.dispatchEvent(event);const full=transfer.getData('text/plain');const node=t.querySelector('tspan tspan').firstChild;range.setStart(node,7);range.setEnd(node,11);selection.removeAllRanges();selection.addRange(range);const partial=new DataTransfer();t.dispatchEvent(new ClipboardEvent('copy',{bubbles:true,cancelable:true,clipboardData:partial}));return {full,partial:partial.getData('text/plain'),source:t.textContent,selected:selection.toString(),prevented:event.defaultPrevented};}''');assert result['full']==result['source'];assert '\nFROM emp\n' in result['full'];assert result['partial']=='dept';assert result['prevented'];return {'fullBlockNewlinesRetained':True,'partialSelectionOnly':'dept','scope':'DOM selection + browser copy event payload; OS clipboard not read'}
 check('Copy preserves code newlines, inline whitespace and partial-selection boundaries',whitespace_copy)
 def size_invariance():
  reset();geometries=[]
  for width,height in [(1440,1000),(1024,800),(390,844)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(180);show_reader_controls(p);geo=svg().evaluate('(e)=>({html:e.innerHTML,box:e.getBoundingClientRect().toJSON()})');geometries.append(geo);assert abs(geo['box']['width']/geo['box']['height']-.75)<.001;assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1;shot('native-responsive-'+str(width))
  assert len({r['html'] for r in geometries})==1;return [{'width':r['box']['width'],'height':r['box']['height']} for r in geometries]
 check('Desktop/tablet/phone changes only uniform page scale: byte-identical internal SVG, no app overflow',size_invariance)
 def fit_scroll():
  reset();pane().get_by_label('Cheatsheet fit',exact=True).select_option('width');pane().get_by_label('Cheatsheet zoom',exact=True).select_option('2');area=pane().locator('.sheet-viewport');assert area.evaluate('e=>e.scrollHeight>e.clientHeight');area.hover();p.mouse.wheel(0,420);p.wait_for_timeout(350);assert loc()['scroll']>100;prior=loc()['scroll'];state_action(p,'Save current workspace state');btn('Workspace 3').click();btn('Workspace 1').click();expect(svg()).to_have_attribute('data-cheatsheet-page','1');assert abs(pane().locator('.sheet-viewport').evaluate('e=>e.scrollTop')-prior)<3;go(2);p.wait_for_timeout(250);assert loc()['scroll']<2;assert pane().locator('.sheet-viewport').evaluate('e=>e.scrollTop')<2
 check('Real wheel scroll, fit/zoom and workspace restoration; page change cancels stale scroll writes',fit_scroll)
 def all_workspaces():
  reset()
  for i in range(2,6):
   action(loc()['sheetPage'],'Open in workspace...');p.get_by_role('menuitem',name=f'Open in Workspace {i}',exact=True).click();show_reader_controls(p);go(i%2+1)
  saved=p.evaluate('structuredClone(testStore.state.personal)');state_action(p,'Save all workspace states');go(1 if loc()['sheetPage']==2 else 2);state_action(p,'Restore last all-workspaces save');now=p.evaluate('testStore.state.personal');assert now['session']==saved['session'];assert now['workspaceSlots']==saved['workspaceSlots'];assert now['activeWorkspaceSlot']==saved['activeWorkspaceSlot']
 check('All five workspace page/mode states survive existing save-all/restore-all manager',all_workspaces)
 def private_source():
  reset();id=import_doc(four);before=p.evaluate('(id)=>structuredClone(testStore.state.overlays.pages[id].page.cheatsheet)',id);assert before==four
  with p.expect_download() as download:btn('Export cheatsheet JSON',pane()).click()
  path=OUT/'exported-canonical-source.json';download.value.save_as(str(path));assert json.loads(path.read_text())==four
  open_more(p).get_by_role('button',name='Edit current page',exact=True).click();changed=json.loads(p.get_by_label('Structured cheatsheet JSON',exact=True).input_value());changed['pages'][1]['blocks'][0]['text']='Edited local native source';p.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(changed));btn('Save cheatsheet source').click();expect(p.locator('dialog[open]')).to_have_count(0);go(2);expect(svg()).to_contain_text('Edited local native source');assert p.evaluate('(id)=>testStore.state.overlays.pages[id].page.cheatsheet',id)==changed
  return {'localWrapperId':id,'sourceExportExact':True,'localEditRendered':True}
 check('Import, validate, export and edit actual canonical JSON through the existing local overlay store',private_source)
 def invalid_source():
  reset();before=p.evaluate('JSON.stringify(testStore.state.overlays)');open_more(p).get_by_role('button',name='Import cheatsheet JSON',exact=True).click();bad=json.loads(json.dumps(four));bad['pages'][0]['blocks'][0]['svg']='<script>bad</script>';p.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(bad));btn('Import local cheatsheet').click();expect(p.locator('dialog [role=alert]')).to_contain_text('unsupported');assert p.evaluate('JSON.stringify(testStore.state.overlays)')==before
 check('Malicious/unsupported source import is rejected atomically with an actionable validation error',invalid_source)
 def saved_anchor_edit():
  reset();id=import_doc(four);go(2);action(2,'Bookmark');open_more(p).get_by_role('button',name='Edit current page',exact=True).click();doc=json.loads(p.get_by_label('Structured cheatsheet JSON',exact=True).input_value());doc['pages'].reverse();p.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(doc));btn('Save cheatsheet source').click();expect(p.locator('dialog[open]')).to_have_count(0);btn('Open bookmarks').click();p.locator('.reading-item').get_by_role('button').first.click();close_panels(p);expect(svg()).to_have_attribute('data-cheatsheet-page','3');expect(svg()).to_contain_text('Distinct physical page 2')
 check('A bookmarked physical page survives canonical page reordering by stable page ID',saved_anchor_edit)
 def missing_saved_anchor():
  reset();id=import_doc(four);go(4);action(4,'Bookmark');open_more(p).get_by_role('button',name='Edit current page',exact=True).click();doc=json.loads(p.get_by_label('Structured cheatsheet JSON',exact=True).input_value());doc['pages'].pop();p.get_by_label('Structured cheatsheet JSON',exact=True).fill(json.dumps(doc));btn('Save cheatsheet source').click();expect(p.locator('dialog[open]')).to_have_count(0);btn('Open bookmarks').click();p.locator('.reading-item').get_by_role('button').first.click();expect(p.locator('.toast.error')).to_contain_text('unavailable');assert p.evaluate('testStore.state.personal.bookmarks.length')==1
 check('Deleted bookmarked physical page is retained as unavailable, never silently replaced',missing_saved_anchor)
 def safe_text():
  reset();doc=json.loads(json.dumps(four));doc['id']='escaped-test';doc['pages'][0]['blocks'][0]={'id':'four.b1','type':'code','language':'html','code':'<script>window.NATIVE_EXECUTED=1</script>\n<img src=x onerror="bad">'};import_doc(doc);assert svg().locator('script,img,foreignObject').count()==0;assert p.evaluate('window.NATIVE_EXECUTED===undefined');expect(svg()).to_contain_text('<script>')
 check('Markup-like code remains selectable inert text in the actual reader DOM',safe_text)
 def exact_backup():
  reset();id=import_doc(four);go(3);open_context(p,'Remarks');p.get_by_label('Personal remarks',exact=True).fill('Private native reflection\nKeep exactly.');close_panels(p);action(3,'Bookmark');action(3,'Add to Read later');state_action(p,'Save all workspace states');open_settings(p);before=p.evaluate('structuredClone(testStore.state)')
  # Verified backup preparation includes the real opaque-origin SHA-256 bridge;
  # allow it to finish while keeping the exact payload/decoder checks below.
  with p.expect_download(timeout=30000) as download:btn('Download workspace backup').click()
  backup=OUT/'native-workspace-roundtrip.atlas-backup.zip';download.value.save_as(str(backup))
  with zipfile.ZipFile(backup) as z:payload=json.loads(z.read('backup.json'))['workspace']
  assert payload['personal']==before['personal'];assert payload['overlays']==before['overlays']
  decoded=p.evaluate("""async bytes=>{const [{unzipBounded,readBackup},{schemas}]=await Promise.all([import(new URL('app/storage/archives.mjs',document.baseURI)),import(new URL('app/app/load.js',document.baseURI))]);const data=await readBackup((await unzipBounded(new Uint8Array(bytes))).files,await schemas());return {personal:data.workspace.personal,overlays:data.workspace.overlays};}""",list(backup.read_bytes()))
  assert decoded['personal']==payload['personal'];assert decoded['overlays']==payload['overlays']
  close_panels(p);reset();open_settings(p);unchanged=p.evaluate('({personal:testStore.state.personal,overlays:testStore.state.overlays})');p.get_by_label('Restore workspace backup',exact=True).set_input_files(str(backup));expect(p.locator('.import-preview')).to_contain_text('verified attachments',timeout=30000);p.get_by_role('checkbox',name='I understand that this replaces the current local workspace.',exact=True).check();btn('Restore verified backup').click();expect(p.locator('dialog .error-message')).to_contain_text('Indexed Database API is denied');assert p.evaluate('({personal:testStore.state.personal,overlays:testStore.state.overlays})')==unchanged
  shot('native-restore-preview-storage-denied');return {'exactArchivePayload':True,'productionDecoderExact':True,'restorePreviewValidated':True,'deniedStorageLeavesStateIntact':True,'successfulPersistentRestore':'separate normal-origin runtime gate'}
 check('Exact backup download/decoder and verified restore preview; denied opaque-origin storage never loses state',exact_backup)
 def clean_errors():assert not errors,errors
 check('No uncaught UI exceptions across the native workflows',clean_errors)
 report={'scope':__doc__,'checks':results,'errors':errors,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)};(OUT/'results.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(1 if report['failed'] else 0)
