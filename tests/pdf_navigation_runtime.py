"""Real PDF.js page navigation: sample rendered page geometry on animation frames.

Synthetic five-page fixture, actual fullscreen and independent panes. This does
not claim visual equivalence for every external PDF or browser/GPU combination.
"""
import sys,json,os,subprocess
from pathlib import Path
from browser_support import start_server,launch,show_reader_controls
from v23_browser_common import AGENT
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/pdf-navigation-runtime'));out.mkdir(parents=True,exist_ok=True)
check=subprocess.run(['node','tools/check-v23-build.mjs'],capture_output=True,text=True,
    env={**os.environ,'ATLAS_EVIDENCE':str(out/'build-check')})
if check.returncode:
    print(check.stdout);raise SystemExit(2)
identity=json.loads(check.stdout)
frames=[]
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900});p.goto(start_server(),wait_until='networkidle')
 p.wait_for_selector('.atlas-app')
 p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
 p.locator('.active-pane [data-page-rendered="true"] canvas').first.wait_for();show_reader_controls(p)
 for focus in [False,True]:
  if focus:
   p.get_by_role('button',name='Enter focus mode',exact=True).click()
   assert p.evaluate('!!document.fullscreenElement')
  for zoom in ['0.75','1','1.5']:
   p.get_by_label('PDF presentation',exact=True).select_option('single')
   p.get_by_label('PDF zoom',exact=True).select_option(zoom)
   f=p.get_by_label('Physical PDF page number',exact=True);f.fill('1');f.press('Enter');p.wait_for_timeout(400)
   for action in ['Next','Next','Previous PDF page']:
    p.evaluate('''()=>{window.auditFrames=[];const start=performance.now();function sample(){const e=document.querySelector('.active-pane .pdf-canvas-scroll'),n=e.querySelector('[data-physical-page]'),c=n?.querySelector('canvas');window.auditFrames.push({t:performance.now()-start,page:n?.dataset.physicalPage,top:n?.getBoundingClientRect().top-e.getBoundingClientRect().top,canvas:!!c,rendered:n?.dataset.pageRendered==='true',scroll:e.scrollTop});if(performance.now()-start<650)requestAnimationFrame(sample)}requestAnimationFrame(sample)}''')
    p.locator('.active-pane').get_by_role('button',name=action,exact=True).click();p.wait_for_timeout(700)
    values=p.evaluate('auditFrames');target=f.input_value()
    stable=[v['top'] for v in values if v['page']==target and v['canvas'] and v['rendered']]
    frames.append(dict(fullscreen=focus,zoom=zoom,action=action,target=target,renderedTopRange=max(stable)-min(stable) if stable else None,frames=values))
 p.get_by_role('button',name='Exit focus',exact=True).click()
 p.get_by_role('button',name='Compare in two panes',exact=True).click()
 p.evaluate('async()=>{const a='+AGENT+';await a.navigateAgentTarget(a.getResource("pdf:doc.atlas.pdf").target,"here")}')
 p.locator('.active-pane [data-page-rendered="true"] canvas').first.wait_for();show_reader_controls(p)
 before=p.locator('.document-pane:not(.active-pane) .physical-page').first.get_attribute('data-physical-page')
 p.locator('.active-pane').get_by_role('button',name='Next',exact=True).click();p.wait_for_timeout(500)
 assert p.locator('.document-pane:not(.active-pane) .physical-page').first.get_attribute('data-physical-page')==before
 p.screenshot(path=str(out/'pdf-split.png'))
 b.close()
(out/'pdf-frames.json').write_text(json.dumps(frames,indent=2))
print(json.dumps([{k:v for k,v in x.items() if k!='frames'} for x in frames],indent=2))
assert all(x['renderedTopRange'] is not None and x['renderedTopRange']<=1 for x in frames)
(out/'results.json').write_text(json.dumps(dict(status='PASS',sourceCommit=identity['sourceCommit'],buildIdentity=identity['buildIdentity'],frameSampledTransitions=len(frames),independentSplitPanes=True),indent=2))
print('PASS 18 frame-sampled transitions plus independent PDF split panes')
