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
 def btn(name,scope=None):return (scope or p).get_by_role('button',name=name,exact=True)
 def snapshot():return p.evaluate('async()=>{const m='+SNAPSHOT+';return await m.readPersistedWorkspace();}')
 text=io.StringIO();writer=csv.writer(text);writer.writerow(['Norsk','English','Forms','Type','Synonyms','Antonyms','Category'])
 words=['åpen','øvelse','ærlig','bil','arbeid','bolig']
 for i in range(36):writer.writerow([words[i%6]+str(i),f'English {35-i:02}',f'form {i}','NOUN' if i%2 else 'ADJ',f'synonym {i}' if i%3 else '',f'opposite {i}' if i%4 else '',['Home','Work','Travel'][i%3]])
 open_settings(p);p.get_by_label('Import CSV table',exact=True).set_input_files({'name':'synthetic-presets.csv','mimeType':'text/csv','buffer':text.getvalue().encode()});expect(btn('Confirm library import')).to_be_enabled();btn('Confirm library import').click();expect(p.get_by_role('status').filter(has_text='Library imported.')).to_be_visible();btn('Close dialog').click()
 ws=snapshot();page=next(x for pack in ws['imports'] for x in pack['pages'] if 'synthetic-presets' in x['title']);page_id=page['id'];history=ws['history']
 p.goto(base+'#/page/'+page_id);p.wait_for_selector('.active-pane .table-column-tools');pane=p.locator('.active-pane')
 if pane.locator('.book-grid').count():btn('Quick Book mode',pane).click()
 def preset(name):btn('Views & sort',pane).click();btn(name,pane.get_by_role('group',name='Ready-made table views',exact=True)).click()
 preset('Reading');expect(pane.locator('.csv-layout-cards2')).to_be_visible();expect(pane.locator('td[data-column="2"]')).to_have_count(0)
 rows=pane.locator('tbody tr[data-source-row]');expect(rows).to_have_count(36)
 rects=rows.evaluate_all('es=>es.slice(0,3).map(e=>e.getBoundingClientRect().toJSON())');assert rects[1]['x']>rects[0]['x'] and abs(rects[1]['y']-rects[0]['y'])<1,rects
 btn('3 columns',pane).click();rects=rows.evaluate_all('es=>es.slice(0,3).map(e=>e.getBoundingClientRect().toJSON())');assert rects[2]['x']>rects[1]['x']>rects[0]['x'],rects
 p.screenshot(path=str(OUT/'three-columns.png'));results.append({'name':'Reading preset and two/three columns use width without losing entries','status':'PASS'})
 preset('Categories');expect(pane.locator('.csv-group-row')).to_have_count(3);assert pane.locator('.csv-group-row').all_text_contents()==['Home','Travel','Work'];expect(rows).to_have_count(36)
 p.screenshot(path=str(OUT/'categories.png'))
 preset('Alphabet');assert pane.locator('.csv-group-row').all_text_contents()==['A','B','Æ','Ø','Å'];expect(rows).to_have_count(36)
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
 pane=p.locator('.active-pane');btn('Colors',pane).click()
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
 pane=p.locator('.active-pane');btn('Quick Book mode',pane).click();book=pane.locator('.book-grid');expect(book.locator('.book-sheet').first).to_be_visible();expect(book.locator('tr[data-source-row]')).to_have_count(36);assert not book.locator('.book-fallback').count()
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
 b.close()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2),encoding='utf-8');print(json.dumps(results,indent=2))
