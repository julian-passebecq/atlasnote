"""Local integrated compact Norsk layout with real IndexedDB in a disposable profile.
Default source is synthetic; optional owner fixtures stay outside the repository.
"""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/norsk-compact'));OUT.mkdir(parents=True,exist_ok=True)
private=os.environ.get('ATLAS_NORSK_COMPACT_FILES')
if private:feeds=[json.loads(Path(f).read_text(encoding='utf-8')) for f in json.loads(private)]
else:
 feed=json.loads((ROOT/'examples/norsk-daily/synthetic-2026-09-24.json').read_text(encoding='utf-8'))
 source=feed['items'];feed['items']=[]
 for i in range(10):
  item=json.loads(json.dumps(source[i%len(source)]));item['itemId']='synthetic-compact-'+str(i);item['sourceId']='compact-'+str(i);item.pop('questions',None)
  item['headline']['text']+=' — test '+str(i+1);feed['items'].append(item)
 feeds=[feed]
results=[];base=start_server()
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1536,'height':864});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app')
 def btn(name):return p.get_by_role('button',name=name,exact=True)
 btn('Norsk Daily').click();btn('Open review to import a feed').click()
 p.get_by_text('Paste Norsk Daily feed JSON',exact=True).click()
 for feed in feeds:
  p.get_by_label('Paste Norsk Daily feed JSON',exact=True).fill(json.dumps(feed,ensure_ascii=False));btn('Convert pasted feed to proposal').click()
  expect(btn('Stage for review')).to_be_enabled();btn('Stage for review').click();expect(btn('Accept selected operations')).to_be_enabled()
  btn('Accept selected operations').click();expect(p.get_by_role('status').filter(has_text='Selected operations accepted')).to_be_visible()
 btn('Close dialog').click()
 expect(p.locator('.norsk-daily-item')).to_have_count(10);expect(p.locator('.norsk-daily-en')).to_have_count(10)
 for width,height in [(1536,864),(1920,1080),(1280,800)]:
  p.set_viewport_size({'width':width,'height':height})
  geometry=p.locator('.norsk-daily').evaluate('e=>{const r=e.getBoundingClientRect();const rows=[...e.querySelectorAll(".norsk-daily-item")].map(x=>x.getBoundingClientRect());return {width:r.width,available:e.parentElement.getBoundingClientRect().width,overflow:e.scrollWidth>e.clientWidth,visible:rows.filter(x=>x.bottom<=r.bottom&&x.top>=r.top).length,firstTop:rows[0].top-r.top};}')
  assert geometry['available']-geometry['width']<3,geometry
  assert not geometry['overflow'],geometry
  assert geometry['visible']>=6,geometry
  assert geometry['firstTop']<180,geometry
  rail=p.locator('.reader-rail').evaluate('e=>{const r=e.getBoundingClientRect();return {width:r.width,overflow:[...e.querySelectorAll("button")].some(b=>{const x=b.getBoundingClientRect();return x.width>0&&(x.left<r.left||x.right>r.right)})}}')
  assert rail['width']<=36 and not rail['overflow'],rail
  assert p.locator('.norsk-daily-actions').first.evaluate('e=>e.getBoundingClientRect().width')<=110
  expect(p.locator('.norsk-daily-item').first.get_by_role('button',name='Study side by side',exact=True)).to_be_visible()
  p.screenshot(path=str(OUT/f'headlines-{width}x{height}.png'))
  results.append({'name':f'Full-width aligned multi-headline reading at {width}x{height}','status':'PASS','geometry':geometry})
 assert p.get_by_role('button',name='Open full Atlas study page',exact=True).count()==0
 row=p.locator('.norsk-daily-item').first
 row.locator('summary').click();expect(row.locator('.norsk-daily-row-extra')).to_be_visible()
 row.locator('summary').click();expect(row.locator('.norsk-daily-row-extra')).not_to_be_visible()
 p.get_by_label('Show English',exact=True).uncheck();expect(p.locator('.norsk-daily-en')).to_have_count(0);p.get_by_label('Show English',exact=True).check()
 topics=p.locator('.norsk-daily-sections button');topics.nth(1).click();assert p.locator('.norsk-daily-item').count()<10;btn('All topics').click();expect(p.locator('.norsk-daily-item')).to_have_count(10)
 results.append({'name':'Details, English recall and topic filters remain usable without persistent content banners','status':'PASS'})
 p.set_viewport_size({'width':390,'height':844});assert not p.locator('.norsk-daily').evaluate('e=>e.scrollWidth>e.clientWidth')
 p.screenshot(path=str(OUT/'headlines-mobile.png'));results.append({'name':'Narrow screen stacks aligned pairs without horizontal overflow','status':'PASS'})
 assert not errors,errors;b.close()
(OUT/'results.json').write_text(json.dumps({'scope':__doc__,'source':'owner-supplied private' if private else 'synthetic','results':results},indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
