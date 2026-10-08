"""CSV reading projections in a disposable normal-origin IndexedDB profile."""
import json, os, csv, io
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, launch, open_settings
from v23_browser_common import AGENT, SNAPSHOT

OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/csv-presets'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server();results=[]
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1536,'height':864});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');p.wait_for_function('async()=>{const d=('+AGENT+').getStorageDiagnostics();return d.ready===true&&d.initialized===true&&d.saving===0;}',timeout=60000)
 p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}')
 def btn(name,scope=None):
  target=scope or p
  if name=='CSV rows':name='List'
  if name in ['Columns','Words','Explain','List','NO / EN','Lines','Views & sort','Colors','Search','Table','Dictionary','Tiles','2 columns','3 columns']:
   for toggle in target.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
  if name in ['Table','Dictionary','Tiles','2 columns','3 columns']:
   expect(target.locator('.csv-more button[aria-expanded="false"]').first).to_be_visible()
   target.get_by_role('button',name='More layouts',exact=True).first.click()
   expect(target.get_by_role('group',name='Additional table layouts',exact=True).first).to_be_visible()
  return target.get_by_role('button',name=name,exact=True)
 def snapshot():return p.evaluate('async()=>{const m='+SNAPSHOT+';return await m.readPersistedWorkspace();}')
 text=io.StringIO();writer=csv.writer(text);writer.writerow(['Norsk','English','Forms','Type','Synonyms','Antonyms','Category','Subcategory'])
 words=['åpen','øvelse','ærlig','bil','arbeid','bolig']
 for i in range(36):writer.writerow([words[i%6]+str(i),f'English {35-i:02}',f'form {i}','NOUN' if i%2 else 'ADJ',f'synonym {i}' if i%3 else '',f'opposite {i}' if i%4 else '',['Home','Work','Travel'][i%3],['Core','Extra'][i%2]])
 open_settings(p);p.get_by_label('Import CSV table',exact=True).set_input_files({'name':'synthetic-presets.csv','mimeType':'text/csv','buffer':text.getvalue().encode()});expect(btn('Confirm library import')).to_be_enabled();btn('Confirm library import').click();expect(p.get_by_role('status').filter(has_text='Library imported.')).to_be_visible();btn('Close dialog').click()
 ws=snapshot();page=next(x for pack in ws['imports'] for x in pack['pages'] if 'synthetic-presets' in x['title']);page_id=page['id'];history=ws['history']
 p.goto(base+'#/page/'+page_id);p.wait_for_selector('.active-pane .table-column-tools',state='attached');pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 if pane.locator('.book-grid').count():btn('Quick Book mode',pane).click()
 def preset(name):btn('Views & sort',pane).click();btn(name,pane.get_by_role('group',name='Ready-made table views',exact=True)).click()
 preset('Reading');expect(pane.locator('.csv-layout-cards2')).to_be_visible();expect(pane.locator('td[data-column="2"]')).to_have_count(0)
 rows=pane.locator('tbody tr[data-source-row]');expect(rows).to_have_count(36)
 rects=rows.evaluate_all('es=>es.slice(0,3).map(e=>e.getBoundingClientRect().toJSON())');assert rects[1]['x']>rects[0]['x'] and abs(rects[1]['y']-rects[0]['y'])<1,rects
 btn('3 columns',pane).click();rects=rows.evaluate_all('es=>es.slice(0,3).map(e=>e.getBoundingClientRect().toJSON())');assert rects[2]['x']>rects[1]['x']>rects[0]['x'],rects
 p.screenshot(path=str(OUT/'three-columns.png'));results.append({'name':'Reading preset and two/three columns use width without losing entries','status':'PASS'})
 preset('Categories');expect(pane.locator('.csv-group-row')).to_have_count(3);assert pane.locator('.csv-group-row button').evaluate_all('es=>es.map(e=>JSON.parse(e.dataset.snippet)[1])')==['Home','Travel','Work'];expect(rows).to_have_count(36)
 p.screenshot(path=str(OUT/'categories.png'))
 preset('Alphabet');assert pane.locator('.csv-group-row button').evaluate_all('es=>es.map(e=>JSON.parse(e.dataset.snippet)[1])')==['A','B','Æ','Ø','Å'];expect(rows).to_have_count(36)
 btn('Views & sort',pane).click();btn('None',pane.get_by_role('group',name='Group this page',exact=True)).click();btn('English A–Z',pane).click();assert rows.first.locator('td[data-column="1"]').inner_text()=='English 00'
 btn('Norsk Z–A',pane).click();assert rows.first.locator('td[data-column="0"]').inner_text().startswith('åpen');btn('Views & sort',pane).click()
 results.append({'name':'Category sub-tables, Norwegian Æ/Ø/Å headings and English/reverse sorting retain all rows','status':'PASS'})
 preset('Synonyms / opposites');expect(pane.locator('td[data-column="4"]')).to_have_count(36);expect(pane.locator('td[data-column="5"]')).to_have_count(36);expect(pane.locator('td[data-column="2"]')).to_have_count(0)
 assert pane.locator('td[data-column="4"]').first.inner_text()==''
 p.screenshot(path=str(OUT/'relations.png'));preset('Grammar');expect(pane.locator('thead')).to_contain_text('Forms');expect(pane.locator('td[data-column="4"]')).to_have_count(0)
 preset('Categories');p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}');p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .csv-layout-cards2');expect(p.locator('.active-pane .csv-group-row')).to_have_count(3)
 assert snapshot()['history']==history,'Reading projections must not write authored history'
 assert next(x for pack in snapshot()['imports'] for x in pack['pages'] if x['id']==page_id)==page
 results.append({'name':'Synonyms/opposites and grammar presets keep empty cells; reload preserves preferences and complete source/history','status':'PASS'})
 # Local palettes and distinct layouts preserve all cells and survive reload.
 pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 btn('Colors',pane).click()
 palette_group=pane.get_by_role('group',name='Table color palette',exact=True)
 colors=[]
 for label,value in [('Black','black'),('Ocean','ocean'),('Forest','forest'),('Warm paper','paper')]:
  btn(label,palette_group).click();wrap=pane.locator('.csv-interactive');expect(wrap).to_have_attribute('data-csv-palette',value)
  colors.append(wrap.evaluate('e=>getComputedStyle(e).backgroundColor'))
 assert len(set(colors))==4,colors
 btn('Forest',palette_group).click();btn('Colors',pane).click()
 for layout in ['Dictionary','Tiles']:
  btn(layout,pane).click();expect(rows).to_have_count(36)
  assert pane.locator('.csv-interactive').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
  p.screenshot(path=str(OUT/(layout.lower()+'.png')))
 assert len(set(rows.evaluate_all('es=>es.map(e=>getComputedStyle(e).backgroundColor)')))==1,'Tiles must have uniform backgrounds'
 p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}');p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .csv-layout-tiles[data-csv-palette="forest"]')
 assert snapshot()['history']==history
 assert next(x for pack in snapshot()['imports'] for x in pack['pages'] if x['id']==page_id)==page
 results.append({'name':'Four distinct palettes and Dictionary/Tiles preserve source/history and persist through reload','status':'PASS'})
 # Delegated cloned controls and semantic table-row pagination remain operational.
 pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 btn('Quick Book mode',pane).click();book=pane.locator('.book-grid');expect(book.locator('.book-sheet').first).to_be_visible();expect(book.locator('tr[data-source-row]')).to_have_count(36);assert not book.locator('.book-fallback').count()
 for layout in ['Dictionary','Tiles']:
  btn(layout,book).first.click();expect(book.locator('tr[data-source-row]')).to_have_count(36)
  assert book.locator('tr[data-source-row]').evaluate_all('es=>new Set(es.map(e=>e.dataset.sourceRow)).size')==36
  assert not book.locator('.book-fallback').count()
  assert book.locator('.sheet-body').evaluate_all('es=>es.every(e=>e.scrollHeight<=e.clientHeight+2)')
 btn('3 columns',book).first.click();expect(book.locator('.csv-layout-cards3').first).to_be_visible();expect(book.locator('tr[data-source-row]')).to_have_count(36)
 assert book.locator('tr[data-source-row]').evaluate_all('es=>new Set(es.map(e=>e.dataset.sourceRow)).size')==36
 assert book.locator('.sheet-body').evaluate_all('es=>es.every(e=>e.scrollHeight<=e.clientHeight+2)')
 results.append({'name':'Book grouping and three-column cloned controls retain 36 unique rows without fallback/overflow','status':'PASS'})
 btn('Quick Book mode',pane).click();p.set_viewport_size({'width':700,'height':900});p.screenshot(path=str(OUT/'narrow.png'))
 assert pane.locator('.csv-layout-cards3').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 assert not errors,errors
 results.append({'name':'Narrow reading pane adapts columns without horizontal overflow or runtime errors','status':'PASS'})
 # Real source entries: grammar prefixes stay visible when grammar columns are hidden.
 p.set_viewport_size({'width':1536,'height':864});p.goto(base+'#/page/page.atlas.norsk-csv.b2-energy.1');p.wait_for_selector('.active-pane .table-column-tools',state='attached');pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 if pane.locator('.book-grid').count():btn('Quick Book mode',pane).click()
 real_source=p.evaluate('async()=>('+AGENT+').getResource("notebook-page:page.atlas.norsk-csv.b2-energy.1").snapshot.page')
 expect(pane.locator('tr[data-source-row="0"] td[data-column="0"]')).to_have_text('en bevegelse')
 expect(pane.locator('tr[data-source-row="14"] td[data-column="0"]')).to_have_text('å evakuere')
 expect(pane.locator('td[data-column="2"]')).to_have_count(0);expect(pane.locator('td[data-column="4"]')).to_have_count(40);expect(pane.locator('td[data-column="5"]')).to_have_count(40)
 btn('3 columns',pane).click();btn('Words',pane).click();expect(pane.locator('.csv-layout-cards3')).to_be_visible()
 for column in ['2','3']:expect(pane.locator('td[data-column="'+column+'"]')).to_have_count(0)
 for column in ['4','5']:expect(pane.locator('td[data-column="'+column+'"]')).to_have_count(40)
 expect(pane.locator('tr[data-source-row="0"] td[data-column="4"]')).to_contain_text('rørelse')
 p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}');p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .csv-layout-cards3');pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 expect(pane.locator('tr[data-source-row="14"] td[data-column="0"]')).to_have_text('å evakuere');expect(pane.locator('td[data-column="2"]')).to_have_count(0)
 assert p.evaluate('async()=>('+AGENT+').getResource("notebook-page:page.atlas.norsk-csv.b2-energy.1").snapshot.page')==real_source
 assert snapshot()['history']==history
 p.screenshot(path=str(OUT/'words-source-prefixes.png'));results.append({'name':'Real CSV articles/infinitive and one-click Words survive reload without source/history changes','status':'PASS'})
 # Source explanations in two-column cards; hide each independently and preserve raw text.
 btn('Explain',pane).click();expect(pane.locator('.csv-layout-cards2')).to_be_visible()
 first=pane.locator('tr[data-source-row="0"]')
 expect(first.locator('td[data-column="6"]')).to_have_text('Rørelse, aktivitet.')
 expect(first.locator('td[data-column="7"]')).to_have_text('Movement or activity.')
 assert first.locator('td').evaluate_all('es=>es.map(e=>e.dataset.column)')==['0','1','6','7','4','5']
 expect(first.locator('td[data-column="4"] strong').first).to_have_text('rørelse')
 assert first.locator('td[data-column="4"]').get_attribute('data-label')=='Syn'
 assert first.locator('td[data-column="5"]').get_attribute('data-label')=='Ant'
 btn('Columns',pane).click();btn('English explanation',pane.get_by_role('group',name='Visible table columns',exact=True)).click();expect(pane.locator('td[data-column="7"]')).to_have_count(0)
 btn('English explanation',pane.get_by_role('group',name='Visible table columns',exact=True)).click();btn('Columns',pane).click()
 p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}');p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .csv-layout-cards2');pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 expect(pane.locator('td[data-column="6"]')).to_have_count(40);expect(pane.locator('td[data-column="7"]')).to_have_count(40)
 assert p.evaluate('async()=>('+AGENT+').getResource("notebook-page:page.atlas.norsk-csv.b2-energy.1").snapshot.page')==real_source
 assert snapshot()['history']==history
 p.screenshot(path=str(OUT/'source-explanations.png'))
 btn('Quick Book mode',pane).click();book=pane.locator('.book-grid');expect(book.locator('tr[data-source-row]')).to_have_count(40)
 assert book.locator('tr[data-source-row]').evaluate_all('es=>new Set(es.map(e=>e.dataset.sourceRow)).size')==40
 assert not book.locator('.book-fallback').count()
 assert book.locator('.sheet-body').evaluate_all('es=>es.every(e=>e.scrollHeight<=e.clientHeight+2)')
 btn('Quick Book mode',pane).click();p.set_viewport_size({'width':700,'height':900})
 assert pane.locator('.csv-layout-cards2').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 assert not errors,errors
 results.append({'name':'Original Norsk/English explanations, short Syn/Ant and Norsk emphasis survive reload and Book pagination without source/history writes','status':'PASS'})
 # CSV rows, per-column search and nested folds use only reader preferences.
 p.set_viewport_size({'width':1536,'height':864});p.goto(base+'#/page/'+page_id,wait_until='networkidle');pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 btn('CSV rows',pane).click();btn('Views & sort',pane).click();btn('None',pane.get_by_role('group',name='Group this page',exact=True)).click();btn('Views & sort',pane).click()
 expect(pane.locator('tr[data-source-row]')).to_have_count(36)
 assert pane.locator('tr[data-source-row]').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height<40)')
 btn('Search',pane).click();pane.get_by_role('combobox',name='Search column').select_option('1');pane.get_by_role('searchbox',name='Search table text').fill('English 00');btn('Apply',pane).click()
 expect(pane.locator('tr[data-source-row]')).to_have_count(1);expect(pane.locator('tr[data-source-row]')).to_have_attribute('data-source-row','35')
 btn('Search',pane).click();expect(pane.get_by_text('Search active · 1 / 36',exact=True)).to_be_visible();btn('Clear',pane).click();expect(pane.locator('tr[data-source-row]')).to_have_count(36)
 btn('Views & sort',pane).click();btn('Theme → subcategory',pane).click();expect(pane.locator('.csv-group-row')).to_have_count(9)
 parent=pane.locator('.csv-group-depth-0 button').first;parent.click();expect(pane.locator('tr[data-source-row]')).to_have_count(24);expect(pane.locator('.csv-group-row')).to_have_count(7)
 btn('Collapse all',pane).click();expect(pane.locator('tr[data-source-row]')).to_have_count(0);expect(pane.locator('.csv-group-row')).to_have_count(3)
 btn('Expand all',pane).click();expect(pane.locator('tr[data-source-row]')).to_have_count(36)
 pane.locator('.csv-group-depth-1 button').first.click();expect(pane.locator('tr[data-source-row]')).to_have_count(30);btn('Views & sort',pane).click()
 p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}');p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .csv-layout-rows');pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 expect(pane.locator('tr[data-source-row]')).to_have_count(30)
 btn('Views & sort',pane).click();btn('Expand all',pane).click();btn('Views & sort',pane).click();btn('Quick Book mode',pane).click();book=pane.locator('.book-grid');expect(book.locator('tr[data-source-row]')).to_have_count(36)
 btn('Search',book).first.click();book.get_by_role('combobox',name='Search column').first.select_option('2');book.get_by_role('searchbox',name='Search table text').first.fill('form 11');btn('Apply',book).first.click()
 expect(book.locator('tr[data-source-row]')).to_have_count(1);expect(book.locator('tr[data-source-row]')).to_have_attribute('data-source-row','11')
 assert not book.locator('.book-fallback').count();assert book.locator('.sheet-body').evaluate_all('es=>es.every(e=>e.scrollHeight<=e.clientHeight+2)')
 btn('Clear',book).first.click();expect(book.locator('tr[data-source-row]')).to_have_count(36);btn('Quick Book mode',pane).click()
 if not pane.get_by_role('searchbox',name='Search table text').count():btn('Search',pane).click()
 pane.get_by_role('searchbox',name='Search table text').fill('not-in-source');btn('Apply',pane).click();expect(pane.get_by_text('No matching rows. Clear search to show all source rows.',exact=True)).to_be_visible()
 p.reload(wait_until='networkidle');p.wait_for_selector('.active-pane .csv-layout-rows');pane=p.locator('.active-pane');
 for toggle in pane.get_by_role('button',name='Show Norsk controls',exact=True).all():toggle.click()
 expect(pane.locator('tr[data-source-row]')).to_have_count(36)
 pane.get_by_role('combobox',name='Search column').select_option('1');pane.get_by_role('searchbox',name='Search table text').fill('English 00');btn('Apply',pane).click();expect(pane.locator('tr[data-source-row]')).to_have_count(1)
 btn('Compare in two panes').click();panes=p.locator('.document-pane');expect(panes).to_have_count(2);left=panes.nth(0);right=panes.nth(1)
 p.evaluate('async(id)=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("notebook-page:"+id).target,"here");}',page_id)
 if right.locator('.book-grid').count():btn('Quick Book mode',right).click()
 expect(right.locator('tr[data-source-row]')).to_have_count(36);expect(left.locator('tr[data-source-row]')).to_have_count(1)
 btn('Views & sort',right).click();btn('Theme',right.get_by_role('group',name='Group this page',exact=True)).click();right.locator('.csv-group-depth-0 button').first.click();expect(right.locator('tr[data-source-row]')).to_have_count(24);expect(left.locator('tr[data-source-row]')).to_have_count(1)
 p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}');p.reload(wait_until='networkidle');p.wait_for_selector('.document-pane .table-column-tools',state='attached');panes=p.locator('.document-pane');expect(panes.nth(0).locator('tr[data-source-row]')).to_have_count(36);expect(panes.nth(1).locator('tr[data-source-row]')).to_have_count(24)
 assert snapshot()['history']==history
 assert next(x for pack in snapshot()['imports'] for x in pack['pages'] if x['id']==page_id)==page
 assert not errors,errors
 p.screenshot(path=str(OUT/'csv-explorer.png'));results.append({'name':'Compact CSV rows, source-column search including Book clones, nested folds/reload and no-result recovery preserve source/history','status':'PASS'})
 b.close()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2),encoding='utf-8');print(json.dumps(results,indent=2))
