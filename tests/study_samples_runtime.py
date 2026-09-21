"""Normal-origin audit, synthetic profiles only; no application state injection."""
import sys,json,traceback,os,subprocess
from pathlib import Path
from browser_support import start_server,launch,show_reader_controls,bookmark_position,close_panels
from v23_browser_common import AGENT,flush,persisted
from playwright.sync_api import sync_playwright,expect
out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/study-samples-runtime'));out.mkdir(parents=True,exist_ok=True)
check=subprocess.run(['node','tools/check-v23-build.mjs'],capture_output=True,text=True,
    env={**os.environ,'ATLAS_EVIDENCE':str(out/'build-check')})
if check.returncode:
    print(check.stdout);raise SystemExit(2)
identity=json.loads(check.stdout)
rows=[];errors=[]
def record(name,**detail):
    rows.append(dict(name=name,status='PASS',**detail));print(name,flush=True)
def search(p,title):
    p.get_by_role('button',name='Global search',exact=True).click()
    p.get_by_label('Search all pages and glossary',exact=True).fill(title)
    p.locator('.search-result').filter(has=p.get_by_text(title,exact=True)).click()
def navigate(p,key,where='here'):
    p.evaluate('async([key,where])=>{const a='+AGENT+';return a.navigateAgentTarget(a.getResource(key).target,where)}',[key,where])
def waitpdf(p):
    p.locator('.active-pane [data-page-rendered="true"] canvas').first.wait_for()
    p.wait_for_timeout(350)
def geom(p):
    return p.locator('.active-pane .pdf-canvas-scroll').evaluate('''e=>{const r=e.getBoundingClientRect(),c=e.closest('.integrated-pdf').querySelector('.pdf-controls').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,toolbarY:c.y,bodyY:scrollY,scrollTop:e.scrollTop,pages:[...e.querySelectorAll('[data-physical-page]')].map(n=>({page:n.dataset.physicalPage,y:n.getBoundingClientRect().y-r.y}))}}''')
try:
 with sync_playwright() as pw:
    b=launch(pw);c=b.new_context(viewport={'width':1440,'height':900});p=c.new_page();p.set_default_timeout(15000)
    p.on('pageerror',lambda e:errors.append(str(e)))
    base=start_server();p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
    sample=json.loads(Path('dist/content.json').read_text(encoding='utf-8'))
    pack=next(x for x in sample['packs'] if x['manifest']['id']=='study.samples')
    # Open actual project/folder UI before reading every page via global search.
    p.get_by_role('button',name='Expand Python',exact=True).click()
    p.get_by_role('button',name='Expand Mock playground',exact=True).click()
    p.get_by_role('button',name='Functions and exceptions',exact=True).click()
    expect(p.locator('.active-pane h1')).to_have_text('Functions and exceptions')
    record('Python sidebar expands project and playground to reachable page')
    for page in [x for x in pack['pages'] if x['id'].startswith('page.mock.')]:
        search(p,page['title']);expect(p.locator('.active-pane h1')).to_have_text(page['title'])
        body=p.locator('.active-pane').inner_text()
        assert page['summary'] in body
        blocks=[]
        def walk(bs):
            for block in bs:
                blocks.append(block)
                if block['type']=='section':walk(block['children'])
        walk(page['blocks'])
        for block in blocks:
            if block['type']=='code':
                code=p.locator('.active-pane [data-block-id="'+block['id']+'"] .code-line').all_text_contents()
                assert code==[line or ' ' for line in block['code'].split('\n')],(block['id'],code)
            if block['type']=='bilingual':assert block['no'] in body and block['en'] in body
            if block['type']=='markdown':assert block['text'] in body
        flush(p)
        assert any(h['resourceKey']=='notebook-page:'+page['id'] for h in persisted(p)['history']['heads'])
        record('Search, render and history baseline: '+page['id'])
    p.get_by_role('button',name='Back in active tab',exact=True).click()
    expect(p.locator('.active-pane h1')).to_have_text('Joins and grain')
    p.get_by_role('button',name='Forward in active tab',exact=True).click()
    expect(p.locator('.active-pane h1')).to_have_text('Window functions')
    bookmark_position(p)
    p.get_by_role('button',name='Functions and exceptions',exact=True).click(button='right')
    p.get_by_role('menuitem',name='Add to Read later',exact=True).click();flush(p)
    before=persisted(p)['personal'];p.reload(wait_until='networkidle');flush(p)
    expect(p.locator('.active-pane h1')).to_have_text('Window functions')
    assert persisted(p)['personal']['bookmarks']==before['bookmarks']
    assert persisted(p)['personal']['readLater']==before['readLater']
    record('Back/forward, bookmark, Read later and active page survive reload')
    p.get_by_role('button',name='Compare in two panes',exact=True).click()
    navigate(p,'notebook-page:page.mock.norsk.work')
    assert p.locator('.document-pane').count()==2
    assert sorted(p.locator('.document-pane h1').all_text_contents())==['Norsk på jobb','Window functions']
    flush(p);p.reload(wait_until='networkidle');flush(p)
    assert sorted(p.locator('.document-pane h1').all_text_contents())==['Norsk på jobb','Window functions']
    record('Independent split panes with SQL and Norwegian content')
    p.screenshot(path=str(out/'samples-split.png'))
    # Return to a single pane using the supported UI.
    p.get_by_role('button',name='Compare in two panes',exact=True).click()
    p.goto(base+'#/page/page.mock.python.functions',wait_until='networkidle')
    expect(p.locator('.active-pane h1')).to_have_text('Functions and exceptions')
    p.goto(base+'#/page/page.mock.does-not-exist',wait_until='networkidle')
    expect(p.locator('.active-pane .missing-page')).to_be_visible()
    p.get_by_role('button',name='Back in active tab',exact=True).click()
    expect(p.locator('.active-pane h1')).to_have_text('Functions and exceptions')
    record('Direct sample link and missing-reference recovery')
    navigate(p,'pdf:doc.atlas.pdf');waitpdf(p);show_reader_controls(p)
    measurements=[]
    for focus in [False,True]:
        if focus:
            p.get_by_role('button',name='Enter focus mode',exact=True).click();waitpdf(p)
            assert p.evaluate('!!document.fullscreenElement')
        for mode in ['single','continuous','spread','grid']:
            p.get_by_label('PDF presentation',exact=True).select_option(mode)
            for zoom in ['0.75','1','1.5']:
                p.get_by_label('PDF zoom',exact=True).select_option(zoom)
                f=p.get_by_label('Physical PDF page number',exact=True);f.fill('1');f.press('Enter');waitpdf(p)
                initial=geom(p)
                for action in ['Next','Next','Previous PDF page']:
                    button=p.locator('.active-pane').get_by_role('button',name=action,exact=True)
                    if button.is_disabled():continue
                    button.click();waitpdf(p);g=geom(p)
                    for key in ['x','y','w','h','toolbarY','bodyY']:
                        assert abs(g[key]-initial[key])<=1, (focus,mode,zoom,action,key,initial,g)
                    measurements.append(dict(fullscreen=focus,mode=mode,zoom=zoom,action=action,geometry=g))
        p.screenshot(path=str(out/('pdf-fullscreen.png' if focus else 'pdf-normal.png')))
    record('PDF normal/fullscreen single/continuous/spread/grid at 75/100/150 percent: stable viewport and toolbar',transitions=len(measurements))
    (out/'pdf-measurements.json').write_text(json.dumps(measurements,indent=2))
    assert not errors,errors
    record('No uncaught browser exceptions')
    c.close();b.close()
except Exception as e:
    rows.append(dict(name='Audit assertion',status='FAIL',error=str(e),traceback=traceback.format_exc()))
finally:
    (out/'results.json').write_text(json.dumps(dict(status='FAIL' if any(r['status']=='FAIL' for r in rows) else 'PASS',sourceCommit=identity['sourceCommit'],buildIdentity=identity['buildIdentity'],results=rows,errors=errors),indent=2))
    print(json.dumps(rows[-1],indent=2))
sys.exit(1 if any(r['status']=='FAIL' for r in rows) else 0)
