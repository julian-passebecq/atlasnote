from browser_support import close_panels,more_action,open_more,open_settings,open_context,reader_action,open_reading,set_learning_flag
"""Actual Chromium DOM/layout tests on an opaque-origin harness.

This deliberately does NOT certify IndexedDB, secure-context APIs, normal-origin
navigation or recovery. The production entry is tested separately by browser_test.py.
Only persistence writes, UUID availability and address-bar writes are adapted here.
All React components, Mermaid, CSS, content and DOM measurements are the real build.
"""
from pathlib import Path
import os, json, traceback
from playwright.sync_api import sync_playwright
from browser_support import start_server, launch
OUT=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/hardening/baseline-dom'));OUT.mkdir(parents=True,exist_ok=True)
BASE=start_server(dom_only=True)
results=[]
def check(name,fn):
    try:
        detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,detail or '',flush=True)
    except Exception as exc:
        results.append({'name':name,'status':'FAIL','error':str(exc)});print('FAIL',name,str(exc),flush=True);traceback.print_exc()
with sync_playwright() as p:
    browser=launch(p)
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);page.set_default_timeout(4000)
    errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
    page.set_content(f'<!doctype html><html lang="en"><head><base href="{BASE}"><link rel="stylesheet" href="styles/app.css"></head><body><div id="root"></div></body></html>')
    page.add_script_tag(url=BASE+'app/vendor/jszip.js');page.add_script_tag(url=BASE+'app/vendor/prism.js')
    page.evaluate('''async(base)=>{
      if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
      history.replaceState=()=>{};
      const [{default:React,ReactDOM},{store},{App},core]=await Promise.all([import(base+'app/vendor/react.mjs'),import(base+'app/storage/database.js'),import(base+'app/app/App.js'),import(base+'app/core/workspace.js')]);
      store.enqueue=async()=>{};window.testStore=store;window.testCore=core;
      const built=await(await fetch(base+'content.json')).json();window.testBuilt=built;
      window.testOpen=(id,mode='continuous')=>{store.personal(p=>{const pane=p.session.panes.find(x=>x.id===p.session.activePane);const v=core.newView(id);v.history[0].presentation=mode;pane.views=[v];pane.active=v.id;p.session.screen='reader';});};
      window.testReset=()=>store.setLoaded(core.blankWorkspace());
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App,{built}));
    }''',BASE)
    page.wait_for_timeout(800)
    def home():
        assert page.get_by_role('heading',name='Make room for a clear thought.').count()==1
        page.screenshot(path=str(OUT/'01-home-desktop.png'));return {'viewport':'1440x900'}
    check('desktop Home renders reviewed public starter',home)
    def follow():
        page.get_by_role('main').get_by_role('button',name='Reader guide',exact=True).click();page.wait_for_timeout(400)
        assert page.locator('h1').inner_text()=='A quiet place to connect your notes'
        page.screenshot(path=str(OUT/'02-continuous-desktop.png'))
        page.get_by_role('link',name='Explore the reading layouts').click();page.wait_for_timeout(900)
        assert page.locator('h1').inner_text()=='One note, several ways to read'
    check('normal UI navigation follows stable page hyperlink',follow)
    def book():
        reader_action(page,'Book');page.wait_for_timeout(2000)
        assert page.locator('[data-sheet]').count()>5
        overflows=page.locator('.sheet-body').evaluate_all('(els)=>els.map(e=>e.scrollHeight-e.clientHeight)')
        assert max(overflows)<=1,overflows
        text=page.locator('.book-grid').inner_text()
        for marker in ['END-LONG-PARAGRAPH','END-LONG-CODE','END-LONG-TABLE','END-BOOK-FIXTURE']:
            assert text.count(marker)==1,(marker,text.count(marker))
        assert page.locator('.book-measure .mermaid-figure svg').count()==1
        assert page.locator('.book-grid .mermaid-figure svg').count()==1
        assert page.locator('.book-grid .render-error').count()==0
        stranded=page.locator('.sheet-body').evaluate_all("es=>es.slice(0,-1).filter(e=>{const n=e.lastElementChild;return n?.dataset.kind==='heading'&&!n.querySelector('[aria-expanded=false]');}).length");assert stranded==0,stranded
        page.screenshot(path=str(OUT/'03-book-desktop.png'));return {'sheets':page.locator('[data-sheet]').count(),'maxVerticalOverflow':max(overflows),'mermaid':'real SVG','markers':'exactly once'}
    check('Book real-DOM pagination preserves markers and real Mermaid without overflow',book)
    def preservation():
        data=page.evaluate('''()=>{
          const source=[...document.querySelectorAll('.book-measure .content-unit')];
          const units=[...document.querySelectorAll('.book-grid .content-unit')];
          return source.filter(s=>['paragraph','code','list','table'].includes(s.dataset.kind)).map(s=>{
            const matches=units.filter(x=>x.dataset.unit===s.dataset.unit);
            const kind=s.dataset.kind, selector=kind==='code'?'.code-line':kind==='table'?'tbody > tr':kind==='list'?'li':null;
            const text=el=>selector?[...el.querySelectorAll(selector)].map(x=>x.textContent).join(''):el.textContent;
            return {kind,source:text(s),output:matches.map(text).join(''),fragments:matches.length};
          });
        }''')
        assert data
        for d in data:assert d['source']==d['output'],str(d)[:250]
        return {'semanticUnitsCompared':len(data),'fragmentedUnits':sum(d['fragments']>1 for d in data)}
    check('paragraph/code/table/list fragments reconstruct exact source text',preservation)
    def focus():
        page.get_by_role('button',name='Enter focus mode').click();page.wait_for_timeout(1000)
        columns=page.locator('.book-grid').evaluate('(e)=>getComputedStyle(e).gridTemplateColumns')
        assert len(columns.split())==2,columns
        assert not page.locator('.context-panel').count();assert not page.locator('.project-tree').count()
        page.screenshot(path=str(OUT/'04-book-paired-focus.png'));return {'gridColumns':columns}
    check('wide Focus mode creates consecutive same-note sheet pairs',focus)
    def reflow():
        page.locator('.book-scroller').evaluate('(e)=>e.scrollTop=e.scrollHeight*0.55');page.wait_for_timeout(500)
        before=page.evaluate('window.testCore.current(window.testStore.state.personal.session.panes[0].views[0]).anchor')
        assert before and before.get('blockId')
        page.evaluate('window.testStore.personal(p=>p.session.fontSize=20)');page.wait_for_timeout(1100)
        after=page.evaluate('window.testCore.current(window.testStore.state.personal.session.panes[0].views[0]).anchor')
        assert after==before,(before,after);visible=page.locator('.book-grid [data-block-id="'+before['blockId']+'"]').evaluate_all('(es)=>es.some(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>100;})');assert visible,(before,after)
        assert max(page.locator('.sheet-body').evaluate_all('(es)=>es.map(e=>e.scrollHeight-e.clientHeight)'))<=1
        page.evaluate('window.testStore.personal(p=>p.session.fontSize=16)');page.wait_for_timeout(800)
        return {'before':before,'after':after}
    check('font reflow restores source-block anchor rather than sheet number',reflow)
    def widths():
        detail=[]
        for width,height in [(1366,768),(1920,1080),(390,844)]:
            print('REFLOW',width,flush=True)
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(1100)
            over=page.locator('.sheet-body').evaluate_all('(es)=>es.map(e=>e.scrollHeight-e.clientHeight)');assert max(over)<=1,(width,over)
            viewport_over=page.evaluate('document.documentElement.scrollWidth-innerWidth');assert viewport_over<=1,(width,viewport_over)
            detail.append({'width':width,'height':height,'sheets':page.locator('[data-sheet]').count(),'overflow':max(over)})
            if width==390:page.screenshot(path=str(OUT/'05-book-mobile.png'))
        page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(700);return detail
    check('responsive Book at 1366, 1920 and mobile widths without viewport overflow',widths)
    def compare():
        page.evaluate("window.testReset();window.testOpen('page.atlas.language','parallel')");page.wait_for_timeout(500)
        page.get_by_role('button',name='Compare in two panes').click();page.wait_for_timeout(600)
        assert page.locator('.document-pane').count()==2
        right=page.locator('.document-pane').nth(1);left=page.locator('.document-pane').nth(0)
        assert right.locator('.empty-pane').count()==1
        page.evaluate("window.testOpen('page.atlas.language','parallel')");page.wait_for_timeout(450)
        assert left.locator('.english').count()>0 and right.locator('.english').count()>0
        reader_action(page,'Hide English',right);page.wait_for_timeout(400)
        assert right.locator('.english').count()==0 and left.locator('.english').count()>0
        page.get_by_role('separator',name='Resize comparison panes').focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(500)
        assert page.get_by_role('separator').get_attribute('aria-valuenow')=='52'
        page.screenshot(path=str(OUT/'06-compare-desktop.png'));return {'panes':2,'EnglishIndependent':True,'splitRatio':52}
    check('Compare same page in two independently configured panes',compare)
    def remarks():
        open_context(page,'Remarks');page.get_by_role('textbox',name='Personal remarks').fill('REMARK_A_KEEP')
        page.evaluate("window.testOpen('page.atlas.welcome')");page.wait_for_timeout(400)
        page.get_by_role('textbox',name='Personal remarks').fill('REMARK_B_KEEP');page.wait_for_timeout(200)
        notes=page.evaluate('window.testStore.state.personal.notes');assert notes['page.atlas.language']['text']=='REMARK_A_KEEP';assert notes['page.atlas.welcome']['text']=='REMARK_B_KEEP'
        return 'Verified in-memory closed-over page keys only; IndexedDB not certified.'
    check('rapid A-to-B remark editing targets the correct stable page keys',remarks)
    def search():
        page.keyboard.press('Control+k');page.get_by_role('textbox',name='Search all pages and glossary').fill('END-LONG-CODE');page.wait_for_timeout(350)
        assert page.locator('.search-result').count()==1
        page.locator('.search-result').click();page.wait_for_timeout(500)
        assert page.locator('.active-pane h1').inner_text()=='One note, several ways to read'
    check('global search matches code content and navigates within active pane',search)
    def reveal():
        pane=page.locator('.active-pane');assert pane.locator('.answer').count()==0
        pane.get_by_role('button',name='Reveal answer').click();page.wait_for_timeout(250);assert pane.locator('.answer').count()==1
        page.get_by_role('button',name='Export to AI').click();page.wait_for_timeout(200)
        text=page.get_by_role('textbox',name='Export text preview').input_value();assert '[Answer omitted]' in text
        assert not page.get_by_role('checkbox',name='Include personal remarks').is_checked()
        page.get_by_role('checkbox',name='Include personal remarks').check();assert page.get_by_role('button',name='Download text',exact=True).is_disabled()
        page.screenshot(path=str(OUT/'07-export-privacy-preview.png'));page.keyboard.press('Escape')
    check('answer disclosure and export privacy controls are independent',reveal)
    def mobile_compare():
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(600)
        assert page.locator('.document-pane').count()==2
        assert page.locator('.document-pane:visible').count()==1
        page.get_by_role('button',name='Pane 1',exact=True).click();page.wait_for_timeout(300)
        assert page.locator('.document-pane:visible').count()==1
        page.screenshot(path=str(OUT/'08-compare-mobile.png'))
        assert page.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
    check('mobile Compare keeps both views but shows one selectable pane',mobile_compare)
    check('no unhandled JavaScript errors',lambda:assert_empty(errors)) if False else None
    results.append({'name':'no unhandled JavaScript errors','status':'PASS' if not errors else 'FAIL','detail':errors})
    results.append({'name':'no failed same-origin assets','status':'PASS' if not failed else 'FAIL','detail':failed})
    report={'scope':'ACTUAL DOM/LAYOUT ONLY: about:blank in-memory harness; IndexedDB, secure APIs and normal-origin navigation are NOT covered.','checks':results,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)}
    (OUT/'dom-tests.json').write_text(json.dumps(report,indent=2));browser.close()
if report['failed']:raise SystemExit(1)
