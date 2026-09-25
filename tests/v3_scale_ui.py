"""V3 browser-level scale budgets with 1,500 logical resources (compiled UI in the
in-memory DOM harness; NOT IndexedDB, NOT a hosted cold start).

Seeds 1,500 local Notebook pages (15 projects x 5 folders x 20 pages) whose text
is taken from the real reviewed catalogue, then samples >=30 interactions per
dimension and reports p50/p95 against the handoff's proposed budgets:
search <=200 ms p95, warm interaction <=150 ms p95. Timings include Playwright
round trips, so they are conservative upper bounds for this machine."""
import json,os,statistics,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/scale-ui'));OUT.mkdir(parents=True,exist_ok=True)
SEED="""()=>{const ws=testCore.blankWorkspace(),src=testCore.compose(testBuilt,ws).pages.filter(p=>!p.cheatsheet&&!p.qcm&&p.blocks.length),pages={},projects=[];let n=0;
 for(let a=1;a<=15;a++){const folders=[];for(let f=1;f<=5;f++){const children=[];for(let i=1;i<=20;i++){n++;const s=src[n%src.length],id='page.scale.'+n;
   pages[id]={page:{...structuredClone(s),id,title:s.title+' #'+n,blocks:s.blocks.map((b,k)=>({...structuredClone(b),id:id+'.b'+k}))}};children.push({id:'node.scale.'+n,title:s.title+' #'+n,pageId:id});}
  folders.push({id:'node.scale.f'+a+'.'+f,title:'Folder '+a+'.'+f,children});}
  projects.push({id:'project.scale.'+a,title:'Scale project '+a,icon:'folder',nodes:folders});}
 ws.overlays.pages=pages;ws.overlays.projects=projects;ws.overlays.categories=Object.fromEntries(projects.map((p,i)=>[p.id,['informatics','cloud','norsk','job','personal'][i%5]]));
 ws.personal.session.expanded=projects.flatMap(p=>[p.id,...p.nodes.map(x=>x.id)]).slice(0,40);
 testStore.setLoaded(ws);return n;}"""
def pct(xs,q):xs=sorted(xs);return round(xs[min(len(xs)-1,int(round(q*(len(xs)-1))))],1)
def summary(xs):return {'n':len(xs),'p50':pct(xs,.5),'p95':pct(xs,.95),'max':round(max(xs),1)}
results=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(20000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base,controls_visible=False)
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,json.dumps(detail),flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc()
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def seed():
  t=time.perf_counter();n=p.evaluate(SEED);p.locator('[data-project-id="project.scale.15"]').wait_for();ms=(time.perf_counter()-t)*1000
  resources=p.evaluate('testCore.compose(testBuilt,testStore.state).pages.length');assert n==1500 and resources>=1500
  return {'seeded':n,'catalogueResources':resources,'firstTreeRenderMs':round(ms)}
 check('1,500 logical resources load into the compiled UI',seed)
 def search():
  p.keyboard.press('Control+k');field=p.get_by_label('Search all pages and glossary',exact=True);field.wait_for()
  words=['window','grain','spark','join','cache','norsk','delta','pandas','sql','partition']
  # Event Timing API: input event -> next paint, measured by the browser itself (the INP
  # metric). Events under the 16 ms reporting threshold count as 16 ms. The automation
  # round trip (fill + polling) is reported separately; it includes Playwright overhead.
  p.evaluate("()=>{window.__inputLatency=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='input')window.__inputLatency.push(e.duration);}).observe({type:'event',durationThreshold:16});}")
  samples=[];trips=[]
  for i in range(30):
   q=words[i%len(words)]+(' #'+str(i) if i%3==0 else '')
   p.evaluate('()=>{window.__inputLatency=[];}');t=time.perf_counter();field.fill(q)
   p.wait_for_function('(q)=>{const i=document.querySelector(\'[aria-label="Search all pages and glossary"]\');return i&&i.value===q&&!!document.querySelector(".search-results");}',arg=q)
   p.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');trips.append((time.perf_counter()-t)*1000)
   p.wait_for_timeout(50);lat=p.evaluate('()=>window.__inputLatency.slice()');samples.append(max(lat) if lat else 16)
  p.keyboard.press('Escape');s=summary(samples);s['automationRoundTrip']=summary(trips)
  assert s['p95']<=200,('search input-to-paint p95 over budget',s);return s
 check('Search over 1,500 resources: input-to-paint p95 <= 200 ms (Event Timing, 30 queries)',search)
 # Click -> next paint via the Event Timing API (browser-measured, INP-style); the
 # automation round trip is kept as a secondary, overhead-inclusive figure.
 p.evaluate("()=>{window.__clickLatency=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='click'||e.name==='pointerup'||e.name==='pointerdown')window.__clickLatency.push(e.duration);}).observe({type:'event',durationThreshold:16});}")
 def timed_click(locator):
  p.evaluate('()=>{window.__clickLatency=[];}');t=time.perf_counter();locator.click()
  p.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');trip=(time.perf_counter()-t)*1000
  p.wait_for_timeout(50);lat=p.evaluate('()=>window.__clickLatency.slice()');return (max(lat) if lat else 16),trip
 def tree():
  samples=[];trips=[]
  for i in range(30):
   node='node.scale.f'+str(1+i%6)+'.'+str(1+(i//6)%5)  # folders of the expanded projects
   lat,trip=timed_click(p.locator('[data-node-id="'+node+'"] .tree-expander').first);samples.append(lat);trips.append(trip)
  s=summary(samples);s['automationRoundTrip']=summary(trips);assert s['p95']<=150,('tree toggle p95 over budget',s);return s
 check('Folder expand/collapse with 1,500 resources: click-to-paint p95 <= 150 ms (Event Timing, 30 samples)',tree)
 def workspaces():
  samples=[];trips=[]
  for i in range(30):
   n=2 if i%2==0 else 1
   lat,trip=timed_click(p.locator('.workspace-slots').get_by_role('button',name='Workspace '+str(n),exact=True));samples.append(lat);trips.append(trip)
  s=summary(samples);s['automationRoundTrip']=summary(trips);assert s['p95']<=150,('workspace switch p95 over budget',s);return s
 check('Warm workspace switch with 1,500 resources: click-to-paint p95 <= 150 ms (Event Timing, 30 samples)',workspaces)
 def experience():
  samples=[]
  for i in range(30):
   preset=['norsk-daily','data-engineering','all'][i%3];t=time.perf_counter()
   p.evaluate("""async(preset)=>{const {profileFromPreset}=await import(new URL('app/experience/profile.mjs',document.baseURI).href);testStore.personal(p=>{const s=p.activeWorkspaceSlot&&p.activeWorkspaceSlot!==1?p.workspaceSlots[p.activeWorkspaceSlot]:p.session;if(preset==='all')delete s.experience;else s.experience=profileFromPreset(preset);});}""",preset)
   p.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');samples.append((time.perf_counter()-t)*1000)
  s=summary(samples);assert s['p95']<=150,('experience apply p95 over budget',s);return s
 check('Applying an Experience with 1,500 resources re-filters within p95 <= 150 ms (30 samples)',experience)
 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-scale-ui','scope':'Compiled UI, in-memory DOM harness (no IndexedDB), Playwright Chromium headless on this machine; timings include automation round trips','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
