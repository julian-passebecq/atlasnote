"""Local integrated PDF dark pages: real canvas/IndexedDB, disposable profile.
Not live Cloudflare proof. Uses the verified external Spark source PDF.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_support import ROOT, start_server, launch
from v23_browser_common import AGENT, SNAPSHOT

OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/pdf-dark'))
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    b=launch(pw)
    p=b.new_page(viewport={'width':1536,'height':900})
    errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(start_server()+'#/page/page.pdfatlas.spark-concepts',wait_until='networkidle')
    pane=p.locator('.active-pane')
    expect(pane.locator('.react-pdf__Page canvas').first).to_be_visible(timeout=45000)
    original=p.evaluate('async()=>('+AGENT+').getResource("pdf:doc.pdfatlas.spark-concepts").snapshot')
    def flush():
        p.evaluate('async()=>{const m='+SNAPSHOT+';await m.captureWorkspaceSnapshot();}')
    def history():
        return p.evaluate('async()=>{const m='+SNAPSHOT+';return (await m.readPersistedWorkspace()).history.revisions;}')
    flush()
    before=history()
    toggle=pane.get_by_role('button',name='Dark PDF pages',exact=True)
    expect(toggle).to_be_enabled()
    toggle.click()
    expect(pane.locator('.integrated-pdf')).to_have_attribute('data-pdf-appearance','dark')
    canvas=pane.locator('.react-pdf__Page canvas').first
    assert 'invert(1)' in canvas.evaluate('e=>getComputedStyle(e).filter')
    p.locator('.textLayer span').first.wait_for(state='attached')
    assert pane.locator('.textLayer span').first.evaluate('e=>getComputedStyle(e).color')=='rgba(0, 0, 0, 0)'
    selected=pane.locator('.textLayer').first.evaluate('e=>{const r=document.createRange();r.selectNodeContents(e);const s=window.getSelection();s.removeAllRanges();s.addRange(r);const t=s.toString();s.removeAllRanges();return t;}')
    assert 'Apache Spark' in selected
    p.screenshot(path=str(OUT/'spark-dark.png'))
    p.emulate_media(media='print')
    assert canvas.evaluate('e=>getComputedStyle(e).filter')=='none'
    p.emulate_media(media='screen')
    flush()
    p.reload(wait_until='networkidle')
    expect(p.locator('.active-pane .integrated-pdf')).to_have_attribute('data-pdf-appearance','dark')
    p.get_by_role('button',name='Compare in two panes',exact=True).click()
    expect(p.locator('.document-pane')).to_have_count(2)
    p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.pdfatlas.spark-concepts").target,"here");}')
    panes=p.locator('.document-pane')
    expect(panes.nth(1).locator('.integrated-pdf')).to_have_attribute('data-pdf-appearance','original')
    expect(panes.nth(0).locator('.integrated-pdf')).to_have_attribute('data-pdf-appearance','dark')
    panes.nth(1).get_by_role('button',name='Dark PDF pages',exact=True).click()
    expect(panes.nth(1).locator('.integrated-pdf')).to_have_attribute('data-pdf-appearance','dark')
    panes.nth(0).get_by_role('button',name='Dark PDF pages',exact=True).click()
    expect(panes.nth(0).locator('.integrated-pdf')).to_have_attribute('data-pdf-appearance','original')
    expect(panes.nth(1).locator('.integrated-pdf')).to_have_attribute('data-pdf-appearance','dark')
    flush()
    assert history()==before
    assert p.evaluate('async()=>('+AGENT+').getResource("pdf:doc.pdfatlas.spark-concepts").snapshot')==original
    assert not errors,errors
    b.close()
(OUT/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'cases':['dark canvas and invisible selectable text','original-color print','reload persistence','independent A/B appearance','unchanged authored PDF/history'],'errors':errors},indent=2),encoding='utf-8')
print('PASS dark PDF pages, selection, print, reload, independent A/B and unchanged source/history')
