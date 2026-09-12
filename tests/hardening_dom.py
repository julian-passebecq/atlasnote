from browser_support import close_panels,more_action,open_more,open_settings,open_context,reader_action,open_reading,set_learning_flag
"""Real Chromium UI, DOM measurement and interaction tests.
Explicit about:blank harness: no claim of IndexedDB, reload, PDF.js or restore certification.
"""
from pathlib import Path
import json
import os
import traceback
from playwright.sync_api import sync_playwright
from browser_support import ROOT, start_server, launch, mount_dom
OUT = ROOT / os.environ.get('ATLAS_EVIDENCE', 'docs/evidence/hardening/ui')
OUT.mkdir(parents=True, exist_ok=True)
results = []
base = start_server(dom_only=True)
with sync_playwright() as pw:
    browser = launch(pw)
    context = browser.new_context(viewport={'width':1440,'height':900}, accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(3500)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    mount_dom(page, base)
    def state(expr='personal.session'):
        return page.evaluate('window.testStore.state.'+expr)
    def reset(id='page.atlas.welcome', mode='continuous', synthetic=False):
        close_panels(page)
        if page.get_by_role('menu').count(): page.keyboard.press('Escape')
        page.set_viewport_size({'width':1440,'height':900})
        page.evaluate('(x)=>testReset(...x)', [id,mode,synthetic])
        page.wait_for_timeout(250)
        if page.get_by_role('button',name='Dismiss message',exact=True).count():page.get_by_role('button',name='Dismiss message',exact=True).click()
    def tree(title):
        return page.locator('.tree-target').filter(has_text=title).last
    def menu(title, action, keyboard=False):
        target=tree(title)
        if keyboard: target.focus();page.keyboard.press('Shift+F10')
        else: target.click(button='right')
        page.get_by_role('menuitem',name=action,exact=True).click()
        page.wait_for_timeout(120)
    def check(name, accepts, fn):
        try:
            detail=fn()
            results.append({'name':name,'accepts':accepts,'status':'PASS','detail':detail,'scope':'DOM / in-memory UI'})
            print('PASS',name,flush=True)
        except Exception as e:
            results.append({'name':name,'accepts':accepts,'status':'FAIL','error':str(e),'scope':'DOM / in-memory UI'})
            print('FAIL',name,str(e),flush=True)
            traceback.print_exc()
            try: page.screenshot(path=str(OUT/('FAIL-'+str(len(results))+'.png')))
            except Exception: pass
    def compare_toggle():
        reset('page.atlas.language','parallel')
        page.get_by_role('button',name='Compare in two panes',exact=True).click()
        assert page.locator('.document-pane').count()==2
        right=page.locator('.document-pane').nth(1)
        assert right.locator('.empty-pane').count()==1
        tree('Read in Norwegian').click();page.wait_for_timeout(300)
        reader_action(page,'Hide English',right)
        reader_action(page,'Book',right)
        page.wait_for_timeout(350)
        before=state()['panes'][1]
        page.get_by_role('button',name='Compare in two panes',exact=True).click()
        page.wait_for_timeout(400)
        assert page.locator('.document-pane').count()==1
        after=state()
        assert after['panes'][0]==before, (before,after['panes'][0])
        assert after['activePane']==before['id']
        return {'survivor':before['id'],'tabs':len(before['views'])}
    check('Compare toggles closed and preserves active right pane exactly',['D01','D02','D03','D04','D07','D14'],compare_toggle)
    def keep_left():
        reset();page.get_by_role('button',name='Compare in two panes').click()
        reader_action(page,'Parallel',page.locator('.document-pane').first)
        before=state()['panes'][0]
        page.get_by_role('button',name='Compare in two panes').click();page.wait_for_timeout(200)
        assert state()['panes'][0]==before
    check('Compare preserves active left pane too',['D03','D14'],keep_left)
    def compare_empty_close():
        reset();page.get_by_role('button',name='Compare in two panes').click()
        pane=page.locator('.document-pane').last
        assert pane.locator('.empty-pane').count()==1
        assert page.get_by_role('button',name='Compare in two panes').is_enabled()
        page.get_by_role('button',name='Compare in two panes').click()
        assert len(state()['panes'])==1
    check('Compare remains closable with an empty active pane',['D02','D03'],compare_empty_close)
    def pane_x():
        reset();page.get_by_role('button',name='Compare in two panes').click()
        page.get_by_role('button',name='Close pane 2',exact=True).click()
        assert len(state()['panes'])==1
    check('Per-pane close still works',['D02'],pane_x)
    def top_order():
        reset()
        labels=page.locator('.reader-rail > button').evaluate_all('(xs)=>xs.map(x=>x.getAttribute("aria-label")||x.textContent.trim())')
        assert labels==['Collapse notebook sidebar','Enter focus mode','Reading mode','Open context panel','Compare in two panes','Bookmark reading position','Theme','More / Settings'],labels
        return labels
    check('Compact rail follows the 1.2 product control order',['E01'],top_order)
    for left in [False,True]:
        for right in [False,True]:
            def focus(left=left,right=right):
                reset('page.atlas.layouts','book')
                page.evaluate('(x)=>testStore.personal(p=>{p.session.leftOpen=x[0];p.session.rightOpen=x[1]})',[left,right])
                page.get_by_role('button',name='Enter focus mode').click()
                assert page.locator('.library-sidebar').count()==0 and page.locator('.context-panel').count()==0
                assert not page.locator('.utility-rail').is_visible()
                assert not page.locator('.context-rail').is_visible()
                assert page.locator('.book-scroller').is_visible()
                if not left and not right:
                    page.keyboard.press('Control+k')
                    assert page.get_by_role('dialog').is_visible()
                    for _ in range(8):page.keyboard.press('Tab')
                    assert page.evaluate('!!document.activeElement.closest("dialog")')
                    page.get_by_role('button',name='Close dialog',exact=True).click()
                    assert state()['focus']
                page.get_by_role('button',name='Exit focus').click()
                assert state()['leftOpen']==left and state()['rightOpen']==right
                assert bool(page.locator('.library-sidebar').count())==left
                assert page.locator('.context-panel').count()==0 # 1.2 Context is transient/on-demand; legacy preference remains preserved.
            check(f'Focus restores exact panels: left={left}, right={right}',['E02','E03','E04','E06'],focus)
    def focus_escape():
        reset();page.get_by_role('button',name='Compare in two panes').click();page.get_by_role('button',name='Enter focus mode').click();page.keyboard.press('Escape')
        assert not state()['focus'];assert len(state()['panes'])==2
    check('Escape exits Focus while Compare remains usable',['E05','E07'],focus_escape)
    def context_menu_new():
        reset('page.atlas.layouts','book')
        menu('Read in Norwegian','Open in new tab')
        s=state();assert len(s['panes'][0]['views'])==2
        v=s['panes'][0]['views'][1];assert v['history'][0]['presentation']=='continuous';assert v['english'];assert len(v['history'])==1
        tree('A quiet place').click(button='right')
        assert page.get_by_role('menuitem',name='Open in other pane',exact=True).count()==0
        page.screenshot(path=str(OUT/'01-tree-context-menu.png'))
        page.keyboard.press('Escape')
    check('Right-click opens a fresh internal tab without changing source view',['B05','B02'],context_menu_new)
    def keyboard_menu():
        reset();target=tree('One note, several ways');target.focus();page.keyboard.press('Shift+F10')
        assert page.get_by_role('menu').is_visible()
        assert page.evaluate('document.activeElement.textContent')=='Open'
        page.keyboard.press('ArrowDown');assert page.evaluate('document.activeElement.textContent')=='Open in new tab'
        page.keyboard.press('End');assert page.evaluate('document.activeElement.textContent')=='Archive'
        page.keyboard.press('Escape');assert page.get_by_role('menu').count()==0
        assert target.evaluate('(el)=>el===document.activeElement')
    check('Tree menu keyboard navigation and focus return',['B05','L10'],keyboard_menu)
    def other_pane():
        reset();page.get_by_role('button',name='Compare in two panes').click()
        before=state()['panes'][1]
        menu('Read in Norwegian','Open in other pane')
        after=state();assert after['panes'][1]==before
        assert after['panes'][0]['views'][0]['history'][-1]['pageId']=='page.atlas.language'
        assert len(after['panes'])==2
    check('Other-pane action targets the non-active pane only',['D05','D14'],other_pane)
    def doc_bookmark():
        reset();menu('One note, several ways','Bookmark')
        b=state('personal.bookmarks');assert len(b)==1 and b[0]['pageId']=='page.atlas.layouts' and not b[0].get('anchor')
        menu('One note, several ways','Bookmark');assert state('personal.bookmarks')==[]
    check('Tree document bookmark toggle does not copy another page position',['H03'],doc_bookmark)
    for action,code in [('Control','B03'),('Meta','B03'),('middle','B04')]:
        def modifier(action=action):
            reset();target=tree('Read in Norwegian')
            if action=='middle':target.click(button='middle')
            else:target.click(modifiers=[action])
            assert len(state()['panes'][0]['views'])==2
        check('Tree new tab via '+action,[code],modifier)
    def five_tabs():
        reset()
        for _ in range(4):tree('Read in Norwegian').click(modifiers=['Control'])
        assert len(state()['panes'][0]['views'])==5
        tree('One note, several ways').click(modifiers=['Control'])
        assert len(state()['panes'][0]['views'])==5
        assert page.get_by_role('status').filter(has_text='five tabs').count()==1
        page.locator('.document-tab.selected .tab-close').click()
        s=state();assert len(s['panes'][0]['views'])==4;assert s['panes'][0]['active']==s['panes'][0]['views'][-1]['id']
    check('Five-tab cap is visible; closing active tab chooses its neighbor',['B01','B06'],five_tabs)
    def picker():
        reset('page.atlas.layouts','book')
        reader_action(page,'Hide English')
        page.get_by_role('button',name='New tab in pane 1',exact=True).click()
        assert page.locator('.empty-pane').is_visible()
        page.get_by_role('button',name='Find a page',exact=True).click()
        page.get_by_role('textbox',name='Search all pages and glossary').fill('Norwegian')
        page.locator('.search-result').first.click()
        views=state()['panes'][0]['views'];assert len(views)==2;assert views[1]['english'];assert views[1]['history'][0]['presentation']=='continuous'
    check('New-tab picker does not inherit another view settings',['B02','B08','B09'],picker)
    def search_new_tab():
        reset();page.keyboard.press('Control+k');page.get_by_role('textbox',name='Search all pages and glossary').fill('Norwegian')
        page.get_by_role('button',name='Open Read in Norwegian, keep English nearby in new tab',exact=True).click()
        assert len(state()['panes'][0]['views'])==2
    check('Search exposes an explicit open-in-new-tab action',['G11'],search_new_tab)
    def tabs_state():
        reset('page.atlas.layouts','book');reader_action(page,'Hide English')
        page.locator('.book-scroller').evaluate('(e)=>e.scrollTop=e.scrollHeight*.5');page.wait_for_timeout(400)
        initial=state()['panes'][0]['views'][0]
        tree('Read in Norwegian').click(modifiers=['Control']);reader_action(page,'Parallel')
        tree('A quiet place').click();page.get_by_role('button',name='Back in active tab',exact=True).click()
        assert state()['panes'][0]['views'][1]['history'][state()['panes'][0]['views'][1]['cursor']]['pageId']=='page.atlas.language'
        page.get_by_role('button',name='Forward in active tab',exact=True).click()
        page.get_by_role('tab').first.click();page.wait_for_timeout(700)
        after=state()['panes'][0]['views'][0]
        assert after==initial,(initial,after)
        assert open_reading(page).get_by_role('button',name='Show English').is_visible();page.keyboard.press('Escape');assert page.locator('.book-scroller').is_visible()
    check('Tab modes, English, anchor and history restore independently',['B07','B08','B09','B10'],tabs_state)
    def divider():
        reset();page.get_by_role('button',name='Compare in two panes').click()
        divider=page.get_by_role('separator',name='Resize comparison panes');box=divider.bounding_box();page.mouse.move(box['x']+4,box['y']+70);page.mouse.down();page.mouse.move(box['x']+95,box['y']+70,steps=7);page.mouse.up()
        assert state()['ratio']>55
        divider.focus();page.keyboard.press('Home');assert state()['ratio']==50
        page.keyboard.press('ArrowLeft');assert state()['ratio']==48
        before=state()['panes'];page.get_by_role('button',name='Swap panes',exact=True).click()
        assert [p['id'] for p in state()['panes']]==[p['id'] for p in reversed(before)]
    check('Pointer divider, keyboard divider and swap',['D08','D09','D10'],divider)
    def mobile():
        reset('page.atlas.language','parallel');page.get_by_role('button',name='Compare in two panes').click()
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
        for name in ['Pane 1','Pane 2']:
            page.get_by_role('button',name=name,exact=True).click();assert page.locator('.document-pane:visible').count()==1
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.get_by_role('button',name='Compare in two panes').click();assert len(state()['panes'])==1
        page.screenshot(path=str(OUT/'02-mobile-surviving-pane.png'))
    check('Mobile pane switcher and toggle preserve a visible survivor',['D13','D03'],mobile)
    def long_book():
        reset(None);page.get_by_role('button',name='Try Book mode with a long note',exact=True).click();page.get_by_role('button',name='Enter focus mode').click();page.wait_for_timeout(700)
        assert page.locator('[data-sheet]').count()>5
        sheets=page.locator('[data-sheet]').evaluate_all('(es)=>es.slice(0,4).map(e=>({n:e.dataset.sheet,top:e.getBoundingClientRect().top}))')
        assert sheets[0]['top']==sheets[1]['top'] and sheets[2]['top']==sheets[3]['top'] and sheets[2]['top']>sheets[0]['top']
        assert page.locator('.book-status').inner_text().find('Same note')>=0
        assert page.locator('.document-pane').count()==1
        assert page.locator('.book-scroller').count()==1
        assert page.locator('.book-grid, .sheet-body, .reader-body').evaluate_all('(es)=>es.every(e=>!["scroll","auto"].includes(getComputedStyle(e).overflowY))')
        page.screenshot(path=str(OUT/'03-long-note-book-guide.png'))
    check('Long-note guide opens Book: paired 1-2 then 3-4, not Compare',['C01','C02','C03','C04'],long_book)
    def short_book():
        reset('audit.page.short','book',True);page.wait_for_timeout(500);assert page.locator('[data-sheet]').count()==1;assert page.locator('.book-error').count()==0
    check('Short note is one real Book sheet',['C05'],short_book)
    def remarks():
        reset('audit.page.long',synthetic=True);open_context(page,'Remarks');page.get_by_role('textbox',name='Personal remarks').fill('Remark A exact')
        tree('Parallel language stress note').click();open_context(page,'Remarks');page.get_by_role('textbox',name='Personal remarks').fill('Remark B exact')
        notes=state('personal.notes');assert notes['audit.page.long']['text']=='Remark A exact';assert notes['audit.page.parallel']['text']=='Remark B exact'
    check('Rapid A/B remarks retain their stable page keys',['F07','F08'],remarks)
    def context_glossary():
        reset('audit.page.long',synthetic=True)
        open_context(page,'Context')
        assert page.locator('.term-card').count()==2
        page.get_by_role('textbox',name='Search glossary').fill('GlossaryDefinitionOnlyToken_7319');assert page.locator('.term-card').count()==1
        page.get_by_role('button',name='Clear glossary search').click()
        assert page.locator('.context-panel').get_by_text('RELATED PAGES',exact=True).is_visible()
        assert page.locator('.context-panel').get_by_text('LINKED FROM',exact=True).is_visible()
    check('Contextual glossary, global glossary, related pages and backlinks',['F01','F02','F03','F04'],context_glossary)
    def flags():
        reset()
        for flag in ['red','orange','green','gray']:
            set_learning_flag(page,flag);assert state('personal.ratings')['page.atlas.welcome']==flag
        open_more(page).get_by_role('checkbox',name='Show learning flags').uncheck();assert not state()['showFlags'];assert page.locator('.tree-rating').count()==0
        assert state('personal.ratings')['page.atlas.welcome']=='gray'
        open_more(page).get_by_role('checkbox',name='Show learning flags').check();page.keyboard.press('Escape')
    check('All learning flags and global hide/show preserve values',['H01','H02'],flags)
    def notebook_crud():
        reset(None)
        page.get_by_role('main').get_by_role('button',name='New notebook',exact=True).click();page.get_by_label('Title',exact=True).fill('Local test notebook');page.get_by_role('button',name='Create notebook',exact=True).click()
        menu('Local test notebook','Rename');page.get_by_label('Title',exact=True).fill('Renamed local notebook');page.get_by_role('button',name='Save details',exact=True).click()
        assert tree('Renamed local notebook').count()==1
        menu('Renamed local notebook','Archive');page.get_by_role('button',name='Archive notebook',exact=True).click();assert tree('Renamed local notebook').count()==0
        page.locator('.archive-list > summary').click();page.locator('.archive-row').filter(has_text='Renamed local notebook').get_by_role('button',name='Restore',exact=True).click()
        assert tree('Renamed local notebook').count()==1
    check('Notebook create, rename, archive and restore through real controls',['A01','A02','A03'],notebook_crud)
    def folder_crud():
        reset()
        menu('Reader guide','Add folder');page.get_by_label('Title',exact=True).fill('First local folder');page.get_by_role('button',name='Create folder',exact=True).click()
        previous='First local folder'
        for depth in range(2,7):
            menu(previous,'Add folder');name=f'Local depth {depth}';page.get_by_label('Title',exact=True).fill(name);page.get_by_role('button',name='Create folder',exact=True).click();previous=name
        menu(previous,'Add page');page.get_by_label('Title',exact=True).fill('Deep local page');page.get_by_label('Page content (Markdown)').fill('DEEP_RETAINED_CONTENT');page.get_by_role('button',name='Create page',exact=True).click()
        assert page.locator('h1').inner_text()=='Deep local page'
        menu('Deep local page','Rename');page.get_by_label('Title',exact=True).fill('Renamed deep page');page.get_by_role('button',name='Save details',exact=True).click()
        menu('Renamed deep page','Move');page.get_by_label('Destination notebook').select_option(label='Example project');page.get_by_role('button',name='Move here',exact=True).click()
        menu('First local folder','Archive');page.get_by_role('button',name='Archive item',exact=True).click();assert tree('First local folder').count()==0
        more_action(page,'Home');page.locator('.archive-list > summary').click();page.locator('.archive-row').filter(has_text='First local folder').get_by_role('button',name='Restore',exact=True).click()
        assert tree('First local folder').count()==1
    check('Six-level folders, deep page, rename, move and folder archive/restore',['A04','A05','A07','A08','A09','A10','A11'],folder_crud)
    def groups():
        reset(None);page.get_by_role('button',name='Manage groups',exact=True).click();page.get_by_role('textbox',name='New group name').fill('My release group');page.get_by_role('button',name='Add',exact=True).click();page.get_by_role('button',name='Save groups',exact=True).click()
        assert any(g['title']=='My release group' for g in state('overlays.groups'))
    check('Manage project groups via Home',['A12'],groups)
    def note_pdf():
        reset();page.get_by_role('button',name='Compare in two panes').click();tree('PDF reading fixture').click()
        assert page.locator('.pdf-reader').count()==1;assert page.locator('.reader-body').count()==1
        assert page.get_by_text('Browser preview only in this offline build',exact=True).is_visible()
        assert page.get_by_role('link',name='Open original PDF',exact=True).is_visible();assert page.get_by_role('link',name='Download original',exact=True).is_visible()
        page.screenshot(path=str(OUT/'04-note-pdf-fallback.png'))
    check('Note plus PDF Compare retains explicitly labelled fallback',[],note_pdf)
    def root_page_crud():
        reset()
        menu('Reader guide','Add page');page.get_by_label('Title',exact=True).fill('Root acceptance page');page.get_by_label('Page content (Markdown)').fill('ROOT_PAGE_RETAINED');page.get_by_role('button',name='Create page',exact=True).click()
        menu('Root acceptance page','Move');page.get_by_label('Destination notebook').select_option(label='Reader guide');page.get_by_role('combobox',name='Destination folder',exact=True).select_option('node.atlas.documents');page.get_by_role('button',name='Move here',exact=True).click()
        assert page.locator('.pane-breadcrumb').inner_text().find('PDF documents')>=0
        menu('Root acceptance page','Archive');page.get_by_role('button',name='Archive item',exact=True).click();assert tree('Root acceptance page').count()==0
        more_action(page,'Home');page.locator('.archive-list > summary').click();page.locator('.archive-row').filter(has_text='Root acceptance page').get_by_role('button',name='Restore',exact=True).click()
        assert tree('Root acceptance page').count()==1
    check('Root page creation, same-notebook move, page archive and restore',['A06','A09','A11'],root_page_crud)
    def outline_jump():
        reset('page.atlas.layouts')
        button=page.locator('.continuous-content button.section-toggle').nth(2)
        block=button.get_attribute('data-block');title=button.inner_text();button.click()
        assert page.locator('.continuous-content button[data-block="'+block+'"]').get_attribute('aria-expanded')=='false'
        open_context(page,'Outline')
        page.locator('.outline-link').filter(has_text=title).click();page.wait_for_timeout(300)
        assert page.locator('.continuous-content button[data-block="'+block+'"]').get_attribute('aria-expanded')=='true'
        assert state()['panes'][0]['views'][0]['history'][0]['anchor']['blockId']==block
        assert page.locator('.continuous-content button[data-block="'+block+'"]').is_visible()
    check('Outline jump opens a folded section at its stable block anchor',['F05','F06'],outline_jump)
    def break_and_oversize():
        reset()
        page.evaluate('''()=>{const p=testCore.makeMarkdownPage('Pagination boundaries','BEFORE_BREAK');p.blocks=[{id:'boundary.before',type:'markdown',text:'BEFORE_BREAK'},{id:'boundary.break',type:'page_break'},{id:'boundary.after',type:'markdown',text:'AFTER_BREAK'},{id:'boundary.big',type:'callout',title:'Large unsplittable callout',text:'OVERSIZED_FULL_SOURCE '.repeat(500)}];testStore.overlays(o=>{o.pages[p.id]={page:p};});testStore.personal(pers=>{const v=testCore.newView(p.id);v.history[0].presentation='book';pers.session.panes[0].views=[v];pers.session.panes[0].active=v.id;});}''')
        page.wait_for_timeout(600)
        sheets=page.locator('.book-grid').evaluate('''(e)=>['boundary.before','boundary.after'].map(id=>Number(e.querySelector('[data-block-id="'+id+'"]').closest('[data-sheet]').dataset.sheet))''')
        assert sheets[1]>sheets[0],sheets
        fallback=page.locator('.book-grid button[data-action="continuous-block"]').last
        assert fallback.is_visible();fallback.click();page.wait_for_timeout(300)
        assert page.locator('.continuous-content').is_visible()
        text=page.locator('.continuous-content [data-block-id="boundary.big"]').inner_text()
        assert text.count('OVERSIZED_FULL_SOURCE')==500
    check('Explicit page break advances sheet; oversized callout has full-source fallback',['C14','C15'],break_and_oversize)
    def pdf_revision_remark():
        reset('page.atlas.pdf')
        page.evaluate('''()=>testStore.personal(p=>{p.notes['page.atlas.pdf::document@'+'0'.repeat(64)]={pageId:'page.atlas.pdf',text:'OLD_REVISION_ONLY',revision:'0'.repeat(64),updatedAt:1};})''')
        open_context(page,'Remarks')
        assert page.get_by_role('textbox',name='Personal remarks').input_value()==''
        page.locator('.revision-warning > summary').click();assert page.get_by_text('OLD_REVISION_ONLY',exact=True).is_visible()
        page.get_by_role('textbox',name='Personal remarks').fill('CURRENT_REVISION_ONLY')
        notes=state('personal.notes');assert len(notes)==2
        assert notes['page.atlas.pdf::document@'+'0'*64]['text']=='OLD_REVISION_ONLY'
        assert sum(n['text']=='CURRENT_REVISION_ONLY' for n in notes.values())==1
    check('PDF revision remarks remain separate and require explicit copy',['F09'],pdf_revision_remark)
    def pane_isolation():
        reset('page.atlas.layouts')
        page.get_by_role('button',name='Compare in two panes').click()
        tree('One note, several ways to read').click()
        left=page.locator('.document-pane').first;right=page.locator('.document-pane').last
        reader_action(page,'Book',left);page.wait_for_timeout(450)
        assert left.locator('.reader-body.book').count()==1 and right.locator('.reader-body.continuous').count()==1
        before=state()['panes'][0]
        right.locator('.note-scroller').click();right.locator('.note-scroller').evaluate('(e)=>{e.scrollTop=1300;e.dispatchEvent(new Event("scroll"));}')
        page.wait_for_timeout(400);assert state()['panes'][0]==before
        tree('Read in Norwegian').click(modifiers=['Control']);assert len(state()['panes'][1]['views'])==2 and len(state()['panes'][0]['views'])==1
        tree('A quiet place').click();page.get_by_role('button',name='Back in active tab',exact=True).last.click()
        assert state()['panes'][1]['views'][1]['history'][0]['pageId']=='page.atlas.language'
        assert state()['panes'][1]['views'][1]['cursor']==0 and state()['panes'][0]==before
        page.get_by_role('button',name='Forward in active tab',exact=True).last.click();assert state()['panes'][1]['views'][1]['cursor']==1
        reader_action(page,'Parallel',left);reader_action(page,'Book',right);page.wait_for_timeout(300)
        assert left.locator('.reader-body.parallel').count()==1 and right.locator('.reader-body.book').count()==1
    check('Mixed layouts, reading positions, tabs and history remain per-pane',['D04','D06','D07','D11','D12','D14'],pane_isolation)
    def bookmark_update():
        reset('audit.page.long',synthetic=True)
        page.locator('.note-scroller').evaluate('(e)=>{e.scrollTop=700;e.dispatchEvent(new Event("scroll"));}');page.wait_for_timeout(350)
        page.get_by_role('button',name='Bookmark reading position',exact=True).click()
        bookmark=state('personal.bookmarks')[0];assert bookmark['anchor']['blockId']
        from browser_support import synthetic_data
        page.evaluate('(packs)=>{testStore.setLoaded({...testStore.state,imports:packs});}',synthetic_data()[1]['packs'])
        more_action(page,'Bookmarks');page.locator('.bookmark-card > button').first.click();page.wait_for_timeout(350)
        view=state()['panes'][0]['views'][0];assert view['history'][view['cursor']]['pageId']=='audit.page.long'
        assert state('personal.bookmarks')[0]==bookmark
    check('Position bookmark resolves stable page ID after source relocation',['H04','H06'],bookmark_update)
    def no_errors():
        assert not errors,errors
    check('No uncaught JavaScript errors in hardening interactions',['L11'],no_errors)
    report={'scope':'Actual Chromium UI/DOM on about:blank; storage writes suppressed. NOT persistence / reload / integrated PDF certification.','checks':results,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results)}
    (OUT/'results.json').write_text(json.dumps(report,indent=2))
    browser.close()
print(json.dumps({'passed':report['passed'],'failed':report['failed']}))
raise SystemExit(1 if report['failed'] else 0)
