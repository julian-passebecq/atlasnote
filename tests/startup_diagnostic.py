"""DOM-only startup diagnostic; NOT IndexedDB/reload release evidence."""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch
out=Path(os.environ.get('ATLAS_DIAGNOSTIC_OUT','docs/evidence/1.2/startup-dom'));out.mkdir(parents=True,exist_ok=True)
base=start_server(dom_only=True)
with sync_playwright() as pw:
 b=launch(pw)
 for run in (1,2):
  p=b.new_page(viewport={'width':1440,'height':900})
  p.set_content(f'<html><head><base href="{base}"><link rel="stylesheet" href="styles/app.css"></head><body><div id="root"></div></body></html>')
  p.evaluate("location.hash='#/page/page.atlas.pdf'")
  p.add_script_tag(url=base+'app/vendor/jszip.js');p.add_script_tag(url=base+'app/vendor/prism.js')
  p.evaluate('''async base=>{
   history.replaceState=()=>{};
   if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
   const [{default:React,ReactDOM},{store},{App},core]=await Promise.all([import(base+'app/vendor/react.mjs'),import(base+'app/storage/database.js'),import(base+'app/app/App.js'),import(base+'app/core/workspace.js')]);
   store.enqueue=async()=>{};window.testStore=store;
   const built=await(await fetch(base+'content.json')).json(),ws=core.blankWorkspace(),v=core.newView('page.atlas.pdf');
   ws.personal.session.panes[0].views=[v];ws.personal.session.panes[0].active=v.id;ws.personal.session.screen='reader';ws.personal.session.expanded=['project.atlas.guide','node.atlas.documents'];
   core.toggleCompare(ws.personal.session);store.setLoaded(ws);window.before=structuredClone(ws.personal.session);
   ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App,{built}));
  }''',base)
  p.wait_for_timeout(750)
  data=p.evaluate('({before:window.before,after:window.testStore.state.personal.session})')
  for name,s in data.items():(out/f'run{run}-{name}.json').write_text(json.dumps(s,indent=2))
  diffs=[]
  def walk(a,b,path):
   if type(a)!=type(b):diffs.append({'path':path,'before':a,'after':b})
   elif isinstance(a,dict):
    for k in sorted(set(a)|set(b)):walk(a.get(k),b.get(k),path+'.'+k)
   elif isinstance(a,list):
    if len(a)!=len(b):diffs.append({'path':path+'.length','before':len(a),'after':len(b)})
    for i in range(min(len(a),len(b))):walk(a[i],b[i],path+f'[{i}]')
   elif a!=b:diffs.append({'path':path,'before':a,'after':b})
  walk(data['before'],data['after'],'session');(out/f'run{run}-diff.json').write_text(json.dumps(diffs,indent=2));print('DOM diagnostic',run,json.dumps(diffs));
  if os.environ.get('ATLAS_ASSERT_STARTUP','1')=='1': assert diffs==[],diffs
  p.close()
 b.close()
