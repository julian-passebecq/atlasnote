"""1.2 actual UI/geometry suite on the permitted opaque-origin DOM harness.
No IndexedDB/reload or integrated-renderer claim. External transport is synthetic
and mocked (zero remote access); SHA-256 uses a test-only Python bridge if needed.
"""
from pathlib import Path
import os,json,hashlib,traceback
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,mount_dom,close_panels,reader_action,open_reading,open_context,open_more,more_action
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2/compact-ui'));OUT.mkdir(parents=True,exist_ok=True)
results=[];base=start_server(dom_only=True)
THEMES=['Fluent Blue','Neutral/Sage','Academic Paper','Soft Lavender','Dark Slate']
with sync_playwright() as pw:
 browser=launch(pw);page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True);page.set_default_timeout(5000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.expose_function('atlasTestSHA256',lambda a:list(hashlib.sha256(bytes(a)).digest()))
 mount_dom(page,base)
 def state():return page.evaluate('testStore.state.personal.session')
 def reset(id='page.atlas.layouts'):
  close_panels(page);page.set_viewport_size({'width':1440,'height':900});page.evaluate('(id)=>testReset(id)',id);page.wait_for_timeout(300)
 def shot(name):page.screenshot(path=str(OUT/(name+'.png')))
 def check(name,fn):
  try:
   detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:
   results.append({'name':name,'status':'FAIL','error':str(e)});print('FAIL',name,str(e),flush=True);traceback.print_exc();shot('FAIL-'+str(len(results)))
 def theme(label):
  page.get_by_role('button',name='Theme',exact=True).click();page.locator('.popover-theme').get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(200)
 def geometry():
  rows=[]
  for w,h in [(1366,768),(1440,900),(1920,1080),(390,844)]:
   reset();page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(400)
   box=page.locator('.topbar').bounding_box();search=page.get_by_role('button',name='Global search',exact=True).bounding_box();rail=page.locator('.reader-rail').bounding_box()
   assert box['height']<=50 and rail['width']==44,(box,rail)
   assert search['width']>w*(.55 if w<500 else .8),search
   assert page.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   assert 'Knowledge Atlas' not in page.locator('.topbar').inner_text() and 'LOCAL' not in page.locator('.topbar').inner_text()
   for label in ['Export to AI','Compare in two panes']:
    b=page.get_by_role('button',name=label,exact=True);assert b.inner_text().strip()=='';assert b.get_attribute('title')==label
   rows.append({'width':w,'height':h,'topbar':box,'search':search,'rail':rail});shot('compact-'+str(w))
  return rows
 check('Compact geometry and icon-only controls at all four required viewports',geometry)
 def overlay():
  reset();page.locator('.note-scroller').evaluate('(e)=>{e.scrollTop=450;e.dispatchEvent(new Event("scroll"))}');page.wait_for_timeout(400)
  before=state();box=page.locator('.document-pane').bounding_box();open_context(page,'Outline');assert page.locator('.document-pane').bounding_box()==box;assert state()==before
  drawer=page.locator('.context-drawer').bounding_box();assert drawer['x']>box['x'] and drawer['x']<box['x']+box['width'];shot('context-overlay');page.keyboard.press('Escape');assert state()==before;assert page.locator('.context-drawer').count()==0
  assert page.get_by_role('button',name='Open context panel',exact=True).evaluate('(e)=>document.activeElement===e')
  return {'reader':box,'drawer':drawer,'exactSessionUnchanged':True,'escapeFocusReturn':True}
 check('Context overlays, preserves exact session/geometry and restores trigger focus',overlay)
 def panels():
  reset();open_context(page);page.get_by_role('button',name='Theme',exact=True).click();assert page.locator('.context-drawer').count()==0;assert page.locator('.floating-panel').count()==1;page.get_by_role('button',name='More / Settings',exact=True).click();assert page.locator('.popover-theme').count()==0;assert page.locator('.floating-panel').count()==1
  page.locator('.pane-breadcrumb').click();assert page.locator('.floating-panel').count()==0
 check('Drawer and rail popovers are mutually exclusive and outside-dismissable',panels)
 def compare():
  reset('page.atlas.language');left=state()['panes'][0];page.get_by_role('button',name='Compare in two panes',exact=True).click();assert state()['panes'][0]==left;assert state()['panes'][1]['views']==[]
  page.locator('[data-node-id="node.page.atlas.language"] .tree-target').click();page.wait_for_timeout(250)
  row=page.locator('[data-node-id="node.page.atlas.language"]');assert row.get_attribute('data-pane-owners')=='a b';assert row.locator('.tree-pane-marker').all_text_contents()==['A','B']
  colors=page.locator('.document-tab.selected').evaluate_all('(es)=>es.map(e=>getComputedStyle(e).borderBottomColor)');assert len(set(colors))==2,colors
  assert page.locator('.pane-identity.is-active').count()==1
  left_before=state()['panes'][0];reader_action(page,'Book');reader_action(page,'Hide English');assert state()['panes'][0]==left_before
  assert state()['panes'][1]['views'][0]['english']==False
  assert state()['panes'][1]['views'][0]['history'][0]['presentation']=='book'
  page.wait_for_function("document.querySelectorAll('.document-pane[data-pane-slot=\"b\"] .book-grid .english').length===0");assert page.locator('.document-pane').first.locator('.english').count()>0
  shot('compare-dual-identity');page.get_by_role('button',name='Swap panes',exact=True).click();assert state()['panes'][1]==left_before
  reader_action(page,'Parallel',page.locator('.document-pane').last);assert state()['panes'][1]['views'][0]['history'][0]['presentation']=='parallel'
  return {'tabBorderColors':colors,'dualMarker':'A / B','independentEnglishLayout':True}
 check('Compare has distinct tab identities, same-page dual tree markers and active-only reading actions',compare)
 def theme_coverage():
  reset('page.atlas.language');page.get_by_role('button',name='Compare in two panes',exact=True).click();page.locator('[data-node-id="node.page.atlas.layouts"] .tree-target').click();rows=[]
  for label in THEMES:
   theme(label);open_context(page,'Remarks')
   vals=page.locator('.atlas-app').evaluate('''e=>{const s=getComputedStyle(e);return ['--surface','--text','--pane-a','--pane-b','--nav','--reader-canvas'].map(n=>s.getPropertyValue(n).trim())}''')
   assert vals[2]!=vals[3];assert page.locator('.context-drawer').is_visible();assert page.locator('.pane-identity.is-active').count()==1
   shot('theme-'+state()['theme']);rows.append({'theme':state()['theme'],'tokens':vals})
   page.keyboard.press('Escape')
  assert len({tuple(r['tokens']) for r in rows})==5
  page.get_by_role('button',name='Theme',exact=True).click();assert page.locator('.theme-option').all_text_contents()==THEMES;page.keyboard.press('Escape')
  return rows
 check('Exactly five visually distinct themes cover Compare, tree, tabs and Context',theme_coverage)
 def filtered():
  reset('page.atlas.welcome');before=page.evaluate('JSON.stringify(testStore.state.overlays)');page.get_by_role('button',name='Switch to PDF library',exact=True).click()
  assert page.locator('[data-node-id="node.page.atlas.language"]').count()==0
  assert page.locator('[data-node-id="node.page.atlas.pdf"]').count()==1
  assert page.locator('[data-node-id="node.pdfatlas.apache-spark"]').count()==1
  assert page.locator('[data-node-id="node.pdfatlas.spark-concepts"]').count()==1
  assert page.evaluate('JSON.stringify(testStore.state.overlays)')==before
  page.locator('[data-node-id="node.pdfatlas.apache-spark"] .tree-target').click();assert page.locator('.collection-view').is_visible();assert page.locator('.collection-card').count()==2
  shot('pdf-library-tree');page.get_by_role('button',name='Switch to notes',exact=True).click();assert page.locator('[data-node-id="node.page.atlas.language"]').count()==1
  assert page.evaluate('JSON.stringify(testStore.state.overlays)')==before
  return {'canonicalOverlayUnchanged':True,'externalPDFLeaves':2}
 check('PDF mode is a recursive projection of the same canonical tree and collections',filtered)
 def pdf_fallback():
  reset('page.atlas.pdf');assert page.get_by_text('Browser preview only in this offline build',exact=True).is_visible()
  panel=open_reading(page)
  for label in ['Single','Continuous','Spread']:assert panel.get_by_role('button',name=label,exact=True).is_disabled()
  assert panel.get_by_role('button',name='Book',exact=True).count()==0;page.keyboard.press('Escape')
  page.get_by_role('button',name='Show browser PDF preview',exact=True).click();assert page.locator('.pdf-fallback').is_visible();shot('pdf-opened-native-fallback')
  page.get_by_role('button',name='Enter focus mode',exact=True).click();assert page.locator('.reader-rail:visible').count()==0;assert page.locator('.pdf-fallback').is_visible();page.keyboard.press('Escape')
  page.get_by_role('button',name='Compare in two panes',exact=True).click();page.locator('[data-node-id="node.page.atlas.rotated"] .tree-target').click();assert page.locator('.pdf-reader').count()==2
  shot('pdf-pdf-compare-fallback');return {'engine':'honest browser fallback, no PDF.js certification','pdfPanes':2}
 check('Contextual PDF modes are honest when engine unavailable; PDF Focus and PDF/PDF shell work',pdf_fallback)
 def flags_bookmark():
  reset();before=state();open_more(page).get_by_role('combobox',name='Learning flag').select_option('green');open_more(page).get_by_role('checkbox',name='Show learning flags').check();page.keyboard.press('Escape')
  assert page.evaluate('testStore.state.personal.ratings["page.atlas.layouts"]')=='green'
  open_more(page).get_by_role('checkbox',name='Show learning flags').uncheck();page.keyboard.press('Escape');assert page.evaluate('testStore.state.personal.ratings["page.atlas.layouts"]')=='green'
  page.get_by_role('button',name='Compare in two panes',exact=True).click();page.locator('[data-node-id="node.page.atlas.language"] .tree-target').click();page.get_by_role('button',name='Bookmark reading position',exact=True).click();assert page.evaluate('testStore.state.personal.bookmarks.at(-1).pageId')=='page.atlas.language'
 check('Hidden learning flags retain values; shared Bookmark targets active Compare page',flags_bookmark)
 def external():
  reset();page.evaluate('''async fixture=>{
   if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(_,data)=>new Uint8Array(await window.atlasTestSHA256(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer}});
   const bytes=new Uint8Array(fixture),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   window.externalRequests=[];const original=window.fetch;window.restoreExternalFetch=()=>{window.fetch=original;};
   window.fetch=(input,options)=>{const url=String(input);if(url.includes('raw.githubusercontent.com/')||url.includes('example.invalid/')){externalRequests.push({url,credentials:options?.credentials,redirect:options?.redirect});return Promise.resolve(new Response(bytes,{status:200,headers:{'Content-Type':'application/pdf'}}));}return original(input,options);};
   window.testExternal=(trusted=true,badHash=false)=>{const ws=testCore.blankWorkspace(),p=testCore.makeMarkdownPage('Synthetic external transport test','Author-created fixture, NOT the real remote PDF host.');ws.overlays.pages[p.id]={page:p};ws.overlays.documents=[{id:'doc.test.external',pageId:p.id,title:p.title,source:{kind:'https',url:trusted?'https://raw.githubusercontent.com/julian-passebecq/pdfatlas/main/library/test/fixture.pdf':'https://example.invalid/reference.pdf'},packId:trusted?'pdfatlas.public':'test.external',sha256:badHash?'0'.repeat(64):hash,bytes:bytes.length,pageCount:5,visibility:'public',rights:{status:'author-created',attribution:'Synthetic test fixture'}}];const v=testCore.newView(p.id);ws.personal.session.panes[0].views=[v];ws.personal.session.panes[0].active=v.id;ws.personal.session.screen='reader';testStore.setLoaded(ws);};
  }''',list((ROOT/'content/packs/atlas.reader-guide/assets/atlas-reader-fixture.pdf').read_bytes()))
  try:
   page.evaluate('testExternal(false)');page.get_by_role('button',name='Allow external PDF reference',exact=True).wait_for();assert page.evaluate('externalRequests.length')==0
   page.evaluate('testExternal(true)');page.get_by_text('Verified public reference / SHA-256 checked / not stored offline',exact=True).wait_for();assert page.locator('.pdf-fallback').get_attribute('src').startswith('blob:');assert page.get_by_role('button',name='Allow external PDF reference',exact=True).count()==0
   assert page.evaluate('testStore.state.assets.length')==0
   requests=page.evaluate('externalRequests');assert requests[0]['credentials']=='omit' and requests[0]['redirect']=='error'
   page.evaluate('testExternal(true,true)');page.get_by_text('Public PDF could not be opened',exact=True).wait_for();assert page.locator('.pdf-fallback').count()==0;assert 'SHA-256' in page.locator('.pdf-external-status').inner_text()
   return {'scope':'synthetic mocked transport, actual SHA-256 and UI; zero remote network','requests':requests,'hashMismatchRejected':True,'backupAssets':0}
  finally:page.evaluate('restoreExternalFetch()')
 check('One-click trusted external opening verifies bytes; arbitrary URL consent and hash mismatch fail closed',external)
 def narrow():
  reset();theme('Dark Slate');page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250);open_context(page,'Remarks');box=page.locator('.context-drawer').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390
  assert page.evaluate('document.documentElement.scrollWidth-innerWidth')<=1;shot('mobile-slate-context');page.keyboard.press('Escape');open_more(page);assert page.locator('.popover-more').bounding_box()['y']>=0;shot('mobile-slate-more')
  more_action(page,'Workspace settings');shot('slate-settings');assert page.get_by_role('combobox',name='Theme',exact=True).input_value()=='slate';page.keyboard.press('Escape')
 check('Dark narrow drawer, More and settings stay on-screen without overflow',narrow)
 check('No uncaught JavaScript errors in compact pass',lambda:None if not errors else (_ for _ in ()).throw(AssertionError(errors)))
 report={'scope':'Actual DOM and in-memory state on about:blank. Not real-origin IndexedDB/reload or integrated PDF certification. External test uses synthetic mocked transport.','checks':results,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results),'errors':errors}
 (OUT/'results.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(1 if report['failed'] else 0)
