"""V3 PERF-07 long Notebook folder batching (compiled UI in the in-memory DOM
harness; NOT IndexedDB). A local project with one 200-page folder."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/v3/tree-batch'));OUT.mkdir(parents=True,exist_ok=True)
SEED="""(active)=>{const ws=testCore.blankWorkspace(),n=200,pages={},children=[];
 for(let i=1;i<=n;i++){const id='page.v3big.'+i;pages[id]={page:{id,title:'Long folder page '+i,summary:'',blocks:[{id:id+'.b',type:'markdown',text:'Synthetic row '+i}],related:[],terms:[],sources:[],tags:[]}};children.push({id:'node.v3big.'+i,title:'Long folder page '+i,pageId:id});}
 ws.overlays.pages=pages;ws.overlays.projects=[{id:'project.v3big',title:'V3 long folder',icon:'folder',nodes:[{id:'node.v3big.folder',title:'Two hundred pages',children}]}];
 ws.personal.session.expanded=['project.v3big','node.v3big.folder'];
 const v=testCore.newView(active);ws.personal.session.panes[0].views=[v];ws.personal.session.panes[0].active=v.id;ws.personal.session.screen='reader';delete ws.personal.session.surface;
 testStore.setLoaded(ws);}"""
results=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(10000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base,controls_visible=False)
 folder=lambda:p.locator('[data-node-id="node.v3big.folder"]').locator('xpath=..').locator('.tree-children').first
 def rows():return folder().locator(':scope > .tree-node').count()
 def check(name,fn):
  try:detail=fn();results.append({'name':name,'status':'PASS','detail':detail});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();p.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
 def reveal():
  p.evaluate(SEED,'page.v3big.150');p.wait_for_timeout(300)
  assert rows()==81,rows();expect(p.locator('[data-node-id="node.v3big.150"]')).to_be_visible()
  expect(p.locator('[data-node-id="node.v3big.150"]')).to_have_class(__import__('re').compile('active'))
  return {'rows':81}
 check('The open page beyond the batch is revealed without expanding every batch',reveal)
 def batched():
  p.evaluate(SEED,'page.v3big.1');p.wait_for_timeout(300)
  assert rows()==80,rows();more=p.get_by_role('button',name='Show next 80 (120 more)',exact=True);expect(more).to_be_visible()
  more.click();p.wait_for_timeout(150);assert rows()==160,rows()
  expect(p.get_by_role('button',name='Show next 40 (40 more)',exact=True)).to_be_visible()
  return {'initialRows':80,'afterOneBatch':160,'total':200}
 check('A 200-page folder renders 80 rows, then grows by explicit batches',batched)
 def filtered():
  p.evaluate(SEED,'page.v3big.1');p.wait_for_timeout(300)
  p.get_by_role('button',name='Filter tree',exact=True).click();p.get_by_label('Filter notebook tree',exact=True).fill('Long folder page 19')
  p.wait_for_timeout(300);n=rows();assert n==11,n  # 19 and 190..199: every match, no batching
  return {'matches':n}
 check('Text filtering shows every match (never hidden by batching)',filtered)
 def no_errors():assert not errors,errors
 check('No uncaught page errors',no_errors)
 b.close()
(OUT/'results.json').write_text(json.dumps({'suite':'v3-tree-batch','scope':'in-memory DOM harness; not IndexedDB','results':results},indent=2))
failed=[r for r in results if r['status']!='PASS'];print(json.dumps({'pass':len(results)-len(failed),'fail':len(failed)}))
raise SystemExit(1 if failed else 0)
