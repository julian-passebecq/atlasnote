"""Integrated normal-origin appearance checks with real IndexedDB and disposable profiles."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
from v23_browser_common import AGENT,SNAPSHOT
OUT=ROOT/'docs/evidence/appearance';OUT.mkdir(parents=True,exist_ok=True)
results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1600,'height':1000},accept_downloads=True);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 expect(p.locator('html')).to_have_attribute('data-theme','black');expect(p.locator('html')).to_have_attribute('data-sheet-theme','black')
 p.get_by_role('button',name='Global search',exact=True).click();p.get_by_label('Search all pages and glossary',exact=True).fill('Azure Data Factory');p.locator('.search-result').filter(has_text='Cheatsheets / Azure Data Factory').click()
 p.get_by_role('button',name='Quick cheatsheet Spread',exact=True).click();expect(p.locator('.sheet-svg>svg')).to_have_count(2)
 original=p.evaluate('async()=>('+AGENT+').getResource("cheatsheet:page.cheatsheet.azure-data-factory").snapshot.page')
 text=p.locator('.sheet-svg').all_text_contents();frames=p.locator('.sheet-svg [data-frame]').evaluate_all('es=>es.map(e=>e.getAttribute("data-frame"))')
 assert p.locator('.sheet-svg>svg>rect').first.get_attribute('fill')=='#141517'
 p.screenshot(path=str(OUT/'midnight-spread.png'));results.append({'name':'New profile defaults to black interface and black structured sheets in spread view','status':'PASS'})
 p.get_by_role('button',name='Theme',exact=True).click();p.get_by_label('Interface theme',exact=True).select_option('fluent');expect(p.locator('html')).to_have_attribute('data-sheet-theme','black');assert p.locator('.sheet-svg>svg>rect').first.get_attribute('fill')=='#141517'
 p.get_by_label('Sheet theme',exact=True).select_option('paper');expect(p.locator('html')).to_have_attribute('data-theme','fluent');assert p.locator('.sheet-svg>svg>rect').first.get_attribute('fill')=='#fbfcfd'
 results.append({'name':'Interface and sheet controls change independently','status':'PASS'})
 p.get_by_role('button',name=re.compile(r'^Midnight')).click();expect(p.locator('html')).to_have_attribute('data-theme','black');expect(p.locator('html')).to_have_attribute('data-sheet-theme','black')
 assert p.locator('.sheet-svg').all_text_contents()==text;assert p.locator('.sheet-svg [data-frame]').evaluate_all('es=>es.map(e=>e.getAttribute("data-frame"))')==frames
 assert p.evaluate('async()=>('+AGENT+').getResource("cheatsheet:page.cheatsheet.azure-data-factory").snapshot.page')==original
 p.screenshot(path=str(OUT/'midnight-controls.png'));results.append({'name':'Complete preset applies both palettes without changing source, text or physical frames','status':'PASS'})
 p.get_by_label('Sheet theme',exact=True).select_option('warm');p.get_by_role('button',name='Close theme',exact=True).click()
 p.wait_for_function('async()=>{const m='+SNAPSHOT+';const w=await m.readPersistedWorkspace();return w.personal.session.theme==="black"&&w.personal.session.sheetTheme==="warm";}')
 p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');expect(p.locator('html')).to_have_attribute('data-theme','black');expect(p.locator('html')).to_have_attribute('data-sheet-theme','warm');assert p.locator('.sheet-svg>svg>rect').first.get_attribute('fill')=='#f8f3e8'
 results.append({'name':'Independent custom pairing persists through real IndexedDB and reload','status':'PASS'})
 p.get_by_role('button',name='Theme',exact=True).click();p.get_by_role('button',name=re.compile(r'^Midnight')).click();p.get_by_role('button',name='Close theme',exact=True).click()
 assert not errors,errors;results.append({'name':'No uncaught page errors','status':'PASS'});b.close()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2));print(json.dumps(results,indent=2))
