from browser_support import close_panels,more_action,open_more,open_settings,open_context,reader_action,open_reading,set_learning_flag
"""AtlasNote 1.1 real browser DOM/layout tests; NOT normal-origin persistence.
The existing policy-respecting about:blank harness is used. A clearly labeled
in-memory import adapter exercises the actual intake/export UI without claiming
an IndexedDB transaction/reload. That separate gate remains in test:runtime.
"""
from pathlib import Path
import hashlib
import json
import os
import traceback
import zipfile
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,mount_dom
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/release-1.1/reader-ui'));OUT.mkdir(parents=True,exist_ok=True)
results=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
    browser=launch(pw);context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=context.new_page();page.set_default_timeout(5000)
    page.expose_function('atlasTestSHA256',lambda data:list(hashlib.sha256(bytes(data)).digest()))
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)));mount_dom(page,base)
    page.evaluate('''async(base)=>{
      // about:blank lacks secure-context WebCrypto. Test-only digest bridge uses
      // real Python SHA-256; it does NOT certify the browser WebCrypto gate.
      if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(algorithm,data)=>{if(algorithm!=='SHA-256')throw Error('Only SHA-256 is implemented in the DOM harness');return new Uint8Array(await window.atlasTestSHA256(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer;}}});
      const lib=await import(base+'app/core/pdf-library.js');
      const {store}=await import(base+'app/storage/database.js');
      const core=window.testCore;
      window.testPdfBytes=new Uint8Array(await (await fetch(base+testBuilt.assets[0].path)).arrayBuffer());
      window.testSeedMixed=async()=>{
        const ws=core.blankWorkspace(),note=core.makeMarkdownPage('Middle modeling note','A synthetic note about grain and joins.');
        note.tags=['lang:en','domain:data-engineering','tech:sql'];
        ws.overlays.pages[note.id]={page:note};
        ws.overlays.projects=[{id:'project.qa.library',title:'Private study library',icon:'book',description:'Synthetic UI fixtures only',nodes:[{id:'folder.qa.mixed',title:'Mixed references',children:[{id:'node.qa.note',pageId:note.id,title:note.title},{id:'folder.qa.nested',title:'Nested folder',children:[]}]}]},{id:'project.qa.destination',title:'Destination notebook',icon:'book',description:'Synthetic move target',nodes:[]}];
        for(const [index,title,lang,domain,tech] of [[1,'Alpha architecture PDF','fr','cloud-architecture','spark'],[2,'Zebra pipeline PDF','en','data-engineering','databricks']]){
          const bytes=new Uint8Array([...testPdfBytes,...new TextEncoder().encode('\\n% synthetic mixed library '+index+'\\n')]);
          const meta={...lib.emptyPdfMetadata(),title,summary:'Synthetic PDF reference '+index,language:lang,domains:domain,technologies:tech,source:'linkedin',documentType:'cheatsheet',pageCount:'5'};
          const r=await lib.prepareLocalPdf(core.compose(testBuilt,ws),ws,bytes,meta,'project.qa.library','folder.qa.mixed');
          ws.overlays=r.overlays;ws.assets.push(r.asset);ws.personal.ratings[r.page.id]='green';
        }
        const v=core.newView('folder.qa.mixed');v.history[0].collectionId='folder.qa.mixed';ws.personal.session.panes[0].views=[v];ws.personal.session.panes[0].active=v.id;ws.personal.session.screen='reader';ws.personal.session.expanded=['project.qa.library','folder.qa.mixed','folder.qa.nested','project.qa.destination'];ws.personal.session.showFlags=true;
        store.setLoaded(ws);
      };
      // Explicit in-memory adapter. Production transaction code is not replaced.
      store.importPacks=async(imports,assets,overlays)=>{
        window.testLastImport=structuredClone({imports,assets,overlays});
        const state=structuredClone(store.state),ps=new Map(state.imports.map(p=>[p.manifest.id,p])),as=new Map(state.assets.map(a=>[a.key,a]));
        imports.forEach(p=>ps.set(p.manifest.id,p));assets.forEach(a=>as.set(a.key,a));state.imports=[...ps.values()];state.assets=[...as.values()];state.overlays=overlays;store.setLoaded(state);
      };
    }''',base)
    def state():return page.evaluate('testStore.state.personal.session')
    def active():return page.evaluate('(()=>{const s=testStore.state.personal.session,p=s.panes.find(p=>p.id===s.activePane);return testCore.current(p.views.find(v=>v.id===p.active));})()')
    def tree(title):return page.locator('.tree-target').filter(has_text=title).last
    def reset(id='page.atlas.layouts',mode='continuous',mixed=False):
        close_panels(page)
        page.set_viewport_size({'width':1440,'height':900})
        if mixed:page.evaluate('testSeedMixed()')
        else:page.evaluate('(x)=>testReset(...x)',[id,mode])
        page.wait_for_timeout(500)
        if page.get_by_role('button',name='Dismiss message',exact=True).count():page.get_by_role('button',name='Dismiss message',exact=True).click()
    def check(name,accepts,fn):
        try:
            detail=fn();results.append({'name':name,'accepts':accepts,'status':'PASS','scope':'Real DOM + in-memory state only','detail':detail});print('PASS',name,flush=True)
        except Exception as exc:
            results.append({'name':name,'accepts':accepts,'status':'FAIL','error':str(exc)});print('FAIL',name,str(exc),flush=True);traceback.print_exc()
            try:page.screenshot(path=str(OUT/('FAIL-'+str(len(results))+'.png')))
            except Exception:pass
    def focus_geometry(mode):
        reset(mode=mode)
        host=page.locator('.note-scroller');host.evaluate('(e)=>{e.scrollTop=modeScroll=e.scrollHeight*.45}')
        page.wait_for_timeout(400);before=active()['anchor'];preferences=[state()['leftOpen'],state()['rightOpen']]
        page.get_by_role('button',name='Enter focus mode',exact=True).click();page.wait_for_timeout(900)
        assert active()['anchor']==before,(before,active()['anchor'])
        box=host.bounding_box();assert box['y']==0 and abs(box['height']-900)<=1,box
        for selector in ['.topbar','.utility-rail','.library-sidebar','.context-panel','.context-rail','.statusbar','.pane-tabbar','.pane-breadcrumb','.reader-toolbar','.book-status']:
            assert page.locator(selector+':visible').count()==0,selector
        assert page.get_by_role('button',name='Exit focus',exact=True).is_visible()
        assert page.evaluate('document.fullscreenElement') is None
        if mode=='book':assert len(page.locator('.book-grid').evaluate('(e)=>getComputedStyle(e).gridTemplateColumns').split())==2
        page.screenshot(path=str(OUT/('focus-'+mode+'.png')))
        page.keyboard.press('Escape');page.wait_for_timeout(800)
        assert not state()['focus'];assert active()['anchor']==before,(before,active()['anchor'])
        assert [state()['leftOpen'],state()['rightOpen']]==preferences
        page.get_by_role('button',name='Enter focus mode',exact=True).click();page.wait_for_timeout(450);page.get_by_role('button',name='Exit focus',exact=True).click();page.wait_for_timeout(450)
        assert active()['anchor']==before
        return {'readingBounds':box,'anchorBeforeAfter':before,'browserFullscreen':False}
    for mode in ['continuous','book','parallel']:check('True Focus full-viewport geometry and exact semantic anchor: '+mode,list(range(11,27)),lambda m=mode:focus_geometry(m))
    def compare():
        reset('page.atlas.language','parallel');before=state()['panes'][0]
        page.get_by_role('button',name='Compare in two panes').click();page.wait_for_timeout(350)
        s=state();assert s['panes'][0]==before;assert s['panes'][1]['views']==[];assert s['activePane']==s['panes'][1]['id']
        assert page.locator('.active-pane .empty-pane').is_visible()
        tree('One note, several ways').click();page.wait_for_timeout(350)
        assert state()['panes'][0]==before;assert active()['pageId']=='page.atlas.layouts'
        separator=page.get_by_role('separator',name='Resize comparison panes');box=separator.bounding_box();page.mouse.move(box['x']+3,box['y']+80);page.mouse.down();page.mouse.move(box['x']+95,box['y']+80,steps=8);page.mouse.up();page.wait_for_timeout(350);ratio=state()['ratio'];assert ratio>55
        separator.focus();page.keyboard.press('ArrowLeft');page.wait_for_timeout(200);ratio=state()['ratio']
        right=state()['panes'][1];page.get_by_role('button',name='Compare in two panes').click();page.wait_for_timeout(400)
        assert state()['panes']==[right];assert state()['ratio']==ratio
        page.get_by_role('button',name='Compare in two panes').click();page.wait_for_timeout(350);assert state()['ratio']==ratio
        return {'ratioAfterReopen':ratio,'leftUnchanged':True,'newPaneEmpty':True}
    check('Compare picker, active target, exact survivor and pointer/keyboard ratio persistence',list(range(29,37)),compare)
    def compare_focus():
        reset('page.atlas.language','parallel');page.get_by_role('button',name='Compare in two panes').click();tree('One note, several ways').click();page.wait_for_timeout(400)
        page.get_by_role('button',name='Enter focus mode').click();page.wait_for_timeout(600)
        for p in page.locator('.document-pane').all():assert p.is_visible() and p.bounding_box()['y']==0
        assert page.get_by_role('separator').is_visible();assert page.locator('.pane-tabbar:visible,.reader-toolbar:visible,.topbar:visible').count()==0
        page.screenshot(path=str(OUT/'focus-compare.png'))
        before=state()['panes'];page.set_viewport_size({'width':600,'height':844});page.wait_for_timeout(500)
        assert page.locator('.document-pane:visible').count()==2;assert state()['panes']==before
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.keyboard.press('Escape');page.wait_for_timeout(250);assert page.locator('.document-pane:visible').count()==1
    check('Focus Compare contains both panes and divider, including narrow viewport',[27,37,39,40,42,43,48],compare_focus)
    def picker():
        reset('page.atlas.layouts','book');reader_action(page,'Hide English');page.get_by_role('button',name='New tab in pane 1').click()
        assert active() is None;assert page.locator('.empty-pane').is_visible()
        page.get_by_role('button',name='Find a page').click();page.get_by_role('textbox',name='Search all pages and glossary').fill('Norwegian');page.locator('.search-result').first.click();page.wait_for_timeout(300)
        assert len(state()['panes'][0]['views'])==2;assert state()['panes'][0]['views'][1]['english'];assert active()['presentation']=='continuous'
        tree('A quiet place').click();page.get_by_role('button',name='Back in active tab',exact=True).click();assert active()['pageId']=='page.atlas.language'
    check('Fresh internal tab picker has independent modes and Back/Forward history',[37,38,40,42],picker)
    def collection():
        reset(mixed=True);assert page.locator('.collection-card').count()==4
        assert page.locator('[data-item-type=pdf]').count()==2 and page.locator('[data-item-type=note]').count()==1
        assert page.locator('.collection-card-meta').filter(has_text='FR / 5 pages').count()==1
        assert page.locator('.collection-flag').count()==3
        assert page.locator('.collection-open').all_text_contents()==['Middle modeling note','Nested folder','Alpha architecture PDF','Zebra pipeline PDF']
        page.get_by_role('button',name='PDFs',exact=True).click();assert page.locator('.collection-card').count()==2
        page.get_by_label('Collection language').select_option('fr');assert page.locator('.collection-card').count()==1
        page.get_by_role('button',name='Reset filters').click();page.get_by_label('Collection domain').select_option('data-engineering');assert page.locator('.collection-card').count()==2
        page.get_by_label('Collection technology').select_option('databricks');assert page.locator('.collection-card').count()==1
        page.get_by_role('button',name='Reset filters').click();page.get_by_label('Search this collection').fill('architecture');assert page.locator('.collection-card').count()==1
        page.get_by_role('button',name='Reset filters').click();page.get_by_role('button',name='Notes',exact=True).click();assert page.locator('.collection-card').count()==1
        page.get_by_role('button',name='Reset filters').click();page.get_by_label('Collection sort').select_option('title');assert page.locator('.collection-open').first.inner_text()=='Alpha architecture PDF'
        page.screenshot(path=str(OUT/'collection-fluent.png'));return {'directItems':4,'notes':1,'pdfs':2,'folders':1}
    check('Mixed collection metadata, flags, all facets, direct children and sorting',list(range(70,84)),collection)
    for modifier in ['Control','Meta','middle']:
        def tabs(modifier=modifier):
            reset(mixed=True);target=page.locator('.collection-view').get_by_role('button',name='Alpha architecture PDF',exact=True)
            if modifier=='middle':target.click(button='middle')
            else:target.click(modifiers=[modifier])
            page.wait_for_timeout(250);assert len(state()['panes'][0]['views'])==2;assert page.locator('.pdf-reader').is_visible();assert page.locator('.document-tab').count()==2
        check('Collection opens independent internal tab with '+modifier,[85 if modifier!='middle' else 86],tabs)
    def collection_context():
        reset(mixed=True);target=page.locator('.collection-view').get_by_role('button',name='Alpha architecture PDF',exact=True);target.focus();page.keyboard.press('Shift+F10')
        labels=page.get_by_role('menuitem').all_text_contents();assert set(['Open','Open in new tab','Bookmark','Rename','Move','Archive']).issubset(set(labels)),labels
        page.keyboard.press('Escape');assert page.evaluate('document.activeElement.textContent')=='Alpha architecture PDF'
        page.get_by_role('button',name='Collection actions for Alpha architecture PDF',exact=True).click();page.get_by_role('menuitem',name='Bookmark',exact=True).click();assert page.evaluate('testStore.state.personal.bookmarks.length')==1
        page.get_by_role('button',name='Compare in two panes').click();page.locator('.document-pane').first.locator('.collection-view').click(position={'x':10,'y':10});page.get_by_role('button',name='Collection actions for Alpha architecture PDF',exact=True).click();page.get_by_role('menuitem',name='Open in other pane').click();page.wait_for_timeout(250)
        assert page.locator('.document-pane').first.locator('.collection-view').count()==1;assert page.locator('.document-pane').last.locator('.pdf-reader').count()==1
        return labels
    check('Collection keyboard/context menu, bookmark and open-in-other-pane',[84,87,88],collection_context)
    def move_archive():
        reset(mixed=True);before=page.evaluate('testStore.state.overlays.documents.map(d=>({id:d.id,pageId:d.pageId,sha:d.sha256}))')
        page.get_by_role('button',name='Collection actions for Alpha architecture PDF',exact=True).click();page.get_by_role('menuitem',name='Move',exact=True).click();page.get_by_role('dialog').get_by_label('Destination notebook',exact=True).select_option('project.qa.destination');page.get_by_role('button',name='Move here').click();page.wait_for_timeout(200)
        assert page.locator('.collection-card').count()==3;assert page.evaluate('testStore.state.overlays.documents.map(d=>({id:d.id,pageId:d.pageId,sha:d.sha256}))')==before
        page.get_by_role('button',name='Collection actions for Zebra pipeline PDF',exact=True).click();page.get_by_role('menuitem',name='Archive',exact=True).click();page.get_by_role('button',name='Archive item').click();assert page.locator('.collection-card').count()==2
        assert page.evaluate('testStore.state.assets.length')==2
    check('Collection PDF move/archive changes only placement/visibility, not byte identity',[87,88,100],move_archive)
    def themes():
        reset(mixed=True);colors=[]
        for theme,label in [('fluent','Fluent Blue'),('neutral','Neutral/Sage'),('academic','Academic Paper'),('lavender','Soft Lavender'),('slate','Dark Slate')]:
            more_action(page,'Workspace settings');page.get_by_role('combobox',name='Theme',exact=True).select_option(theme);page.get_by_role('button',name='Close dialog').click();page.wait_for_timeout(300)
            assert state()['theme']==theme
            color=page.locator('.collection-view').evaluate('(e)=>{const s=getComputedStyle(e);return [s.backgroundColor,s.color,s.getPropertyValue("--nav"),s.getPropertyValue("--reader-canvas"),s.getPropertyValue("--code-bg"),s.getPropertyValue("--table-head")]}');colors.append(color)
            page.screenshot(path=str(OUT/('theme-'+theme+'.png')))
        assert len({tuple(c) for c in colors})==5
        assert len({c[0] for c in colors})==5
        return {'computedThemeSurfaces':colors,'reload':'Not covered by DOM harness'}
    check('Five themes visibly differ across semantic surfaces without layout changes',[62,63,64,65,66,68],themes)
    def token_contrast():
        reset(mixed=True);ratios=[]
        for theme in ['fluent','neutral','academic','lavender','slate']:
            page.evaluate('(t)=>testStore.personal(p=>p.session.theme=t)',theme);page.wait_for_timeout(100)
            r=page.locator('.collection-view').evaluate('''e=>{const s=getComputedStyle(e);const lum=h=>{let x=h.trim().slice(1);return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)};const ratio=(a,b)=>{const x=lum(s.getPropertyValue(a)),y=lum(s.getPropertyValue(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};return {text:ratio('--text','--surface'),muted:ratio('--muted','--surface'),canvas:ratio('--muted','--subtle'),accent:ratio('--accent','--surface')};}''')
            assert min(r.values())>=4.5,(theme,r);ratios.append({'theme':theme,**r})
        page.locator('.collection-view').get_by_role('button',name='Alpha architecture PDF',exact=True).focus();page.keyboard.press('Tab');page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.classList.contains("collection-open") && getComputedStyle(document.activeElement).outlineStyle!=="none"')
        return ratios
    check('Normal and muted theme text tokens meet 4.5:1 and keyboard focus is visible',[69],token_contrast)
    def pdf_focus_combinations():
        reset(mixed=True);page.locator('.collection-view').get_by_role('button',name='Alpha architecture PDF',exact=True).click();page.get_by_role('button',name='Compare in two panes').click();tree('Zebra pipeline PDF').click();page.wait_for_timeout(250)
        assert page.locator('.pdf-reader').count()==2
        assert page.get_by_text('Browser preview only in this offline build',exact=True).count()==2
        for pane in page.locator('.document-pane').all():pane.get_by_role('button',name='Show browser PDF preview',exact=True).click()
        page.get_by_role('button',name='Enter focus mode').click();page.wait_for_timeout(350)
        for frame in page.locator('.pdf-fallback').all():
            box=frame.bounding_box();assert box['y']==0 and abs(box['height']-900)<=1,box
        assert page.locator('.pdf-intro:visible').count()==0;page.screenshot(path=str(OUT/'focus-pdf-pdf-fallback.png'))
        page.keyboard.press('Escape');tree('Middle modeling note').click();assert page.locator('.pdf-reader').count()==1 and page.locator('.reader-body').count()==1
        return {'PDFFrameBounds':'full viewport','engine':'Explicit native-browser fallback; physical-page engine NOT certified'}
    check('PDF/PDF then PDF/note Compare and maximum Focus preview frame',[28,41,44,45,46,150],pdf_focus_combinations)
    def intake():
        reset(mixed=True);page.get_by_role('button',name='Import PDF privately').click()
        source=(ROOT/'content/packs/atlas.reader-guide/assets/atlas-reader-fixture.pdf').read_bytes()+b'\n% Actual file-picker synthetic intake\n'
        page.get_by_label('Import local PDF').set_input_files({'name':'study-import.pdf','mimeType':'application/pdf','buffer':source})
        page.get_by_label('Document title',exact=True).fill('Locally imported architecture sheet')
        assert page.get_by_label('Notebook',exact=True).input_value()=='project.qa.library'
        assert page.get_by_label('Inside folder',exact=True).input_value()=='folder.qa.mixed'
        page.get_by_label('Inside folder',exact=True).select_option('folder.qa.nested');page.get_by_label('New folder inside this location (optional)').fill('Intake batch')
        page.get_by_label('Primary language',exact=True).select_option('nb');page.get_by_role('dialog').get_by_label('Document type',exact=True).select_option('cheatsheet');page.get_by_label('Domains (comma separated)').fill('cloud-architecture, data-engineering');page.get_by_label('Technologies (comma separated)').fill('Fabric, Spark');page.get_by_label('Source channel').select_option('linkedin');page.get_by_label('Known page count (optional)').fill('5')
        assert page.get_by_label('Rights status').input_value()=='reference-only'
        page.screenshot(path=str(OUT/'local-pdf-intake.png'))
        page.get_by_role('button',name='Import PDF locally').click();page.wait_for_timeout(400)
        doc=page.evaluate('testStore.state.overlays.documents.at(-1)');assert doc['title']=='Locally imported architecture sheet';assert doc['language']=='nb';assert doc['rights']['status']=='reference-only';assert doc['visibility']=='private';assert doc['sha256']==hashlib.sha256(source).hexdigest()
        assert page.evaluate('Array.from(testLastImport.assets[0].bytes)')==list(source)
        assert 'Intake batch' in page.locator('.pane-breadcrumb').inner_text()
        more_action(page,'Edit current page');page.get_by_label('Page title').fill('Renamed local PDF');page.get_by_label('Primary PDF language').fill('fr');page.get_by_label('Tags and facets (comma separated)').fill('doctype:guide, domain:data-engineering, tech:dbt, source:linkedin');page.get_by_role('button',name='Save page locally').click();page.wait_for_timeout(250)
        assert page.locator('.pdf-intro h1').inner_text()=='Renamed local PDF'
        after=page.evaluate('testStore.state.overlays.documents.at(-1)');assert after['id']==doc['id'] and after['sha256']==doc['sha256'] and after['language']=='fr'
        count=page.evaluate('testStore.state.overlays.documents.length');more_action(page,'Workspace settings');page.get_by_label('Import local PDF').set_input_files({'name':'different-name.pdf','mimeType':'application/pdf','buffer':source});page.get_by_role('button',name='Open existing PDF').click();assert page.evaluate('testStore.state.overlays.documents.length')==count
        return {'sha256':doc['sha256'],'bytes':len(source),'originalAndRenameIdsSame':True,'storageScope':'Only actual intake output into in-memory adapter; real IDB gate separate'}
    check('File picker, nested target/new folder, metadata, conservative rights, exact payload, edit and SHA dedupe',[90,91,92,93,94,95,96,97,98,99,101],intake)
    def export_ui():
        reset(mixed=True);more_action(page,'Workspace settings')
        with page.expect_download() as event:page.get_by_role('button',name='Download private PDF library ZIP').click()
        download=event.value;path=OUT/'ui-private-pdf-library.zip';download.save_as(path)
        with zipfile.ZipFile(path) as z:
            names=z.namelist();assert len([n for n in names if n.endswith('.pdf')])==2
            index=json.loads(z.read(next(n for n in names if n.endswith('atlas-documents.json'))));assert all(d['visibility']=='private' for d in index['documents']);assert len(index['documents'])==2
            assert not any('personal' in n or 'backup' in n for n in names)
        return {'downloadBytes':path.stat().st_size,'privateDocuments':2,'publicFixturesExcluded':True}
    check('Private PDF-library UI performs a real local ZIP download without user-state export',[107,114,116],export_ui)
    check('No unhandled JavaScript exceptions in new Reader/PDF UI',[],lambda:(_ for _ in ()).throw(AssertionError(errors)) if errors else None)
    report={'scope':'ACTUAL Chromium DOM/layout, pointer/keyboard and file/download UI. about:blank harness; enqueue and import commit use in-memory adapters; unavailable secure-context SHA-256 uses a test-only Python digest bridge. NOT IndexedDB/reload/normal-origin or integrated PDF certification.','checks':results,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)}
    (OUT/'reader-11-dom.json').write_text(json.dumps(report,indent=2));browser.close()
raise SystemExit(1 if report['failed'] else 0)
