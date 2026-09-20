import os,sys,json,traceback
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'new-supplemental-evidence'
OUTPUT.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'source/tests'))
from browser_support import start_server
from playwright.sync_api import sync_playwright,expect
audit_dist=Path(os.environ.get('ATLAS_AUDIT_DIST',str(ROOT/'build/AUDITED_CANDIDATE_60db2cb_NOT_FINAL'))).resolve()
os.environ['ATLAS_DIST']=str(audit_dist)
base=start_server(dist=str(audit_dist))
PUBLIC="(await import(new URL('app/agent/public.js',document.baseURI).href)).getAgentInterface()"
results=[];errors=[]
def api(p,body,arg=None):return p.evaluate('async(arg)=>{const api='+PUBLIC+';'+body+'}',arg)
def ready(p):
 p.goto(base,wait_until='networkidle');expect(p.locator('.atlas-app')).to_be_visible();assert api(p,'return api.getStorageDiagnostics().initialized;')
def make(p,key,pid):
 return api(p,"const r=api.getResource(arg.key);r.snapshot.page.blocks.push({id:arg.id+'.block',type:'markdown',text:arg.id});return {schemaVersion:1,kind:'atlas-agent-changeset',id:arg.id,createdAt:Date.now(),source:'Independent synthetic QA human decision',operations:[{id:arg.id+'.op',kind:'resource.update',resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:r.snapshot}}]};",{'key':key,'id':pid})
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True)
  context=browser.new_context(viewport={'width':1440,'height':900})
  a=context.new_page();a.on('pageerror',lambda e:errors.append(str(e)));ready(a)
  key=api(a,"return api.listResources({includeStructures:true,limit:100}).items.find(r=>r.resourceType==='notebook-page').resourceKey;")
  pa=make(a,key,'audit.race.a');pb=make(a,key,'audit.race.b')
  api(a,'await api.stage(arg);',pa);api(a,'await api.stage(arg);',pb)
  b=context.new_page();b.on('pageerror',lambda e:errors.append(str(e)));ready(b)
  epochA=api(a,'return api.getStorageDiagnostics().epoch;');epochB=api(b,'return api.getStorageDiagnostics().epoch;');assert epochA==epochB
  for p,id in [(a,pa['id']),(b,pb['id'])]:
   api(p,"window.auditAccept=api.accept(arg).then(()=>({ok:true}),e=>({ok:false,message:e.message}));return true;",id)
  race=[a.evaluate('()=>window.auditAccept'),b.evaluate('()=>window.auditAccept')]
  assert sum(r['ok'] for r in race)==1,race
  ready(a)
  persisted=api(a,'return {resource:api.getResource(arg),reviews:api.getReviews().items};',key)
  assert persisted['resource']['head']['number']==2
  assert sum(r['status']=='accepted' for r in persisted['reviews'])==1
  blocks=persisted['resource']['snapshot']['page']['blocks'];assert sum(x.get('id') in ['audit.race.a.block','audit.race.b.block'] for x in blocks)==1
  results.append({'name':'Two tabs accepting competing revisions from the same epoch','status':'PASS','outcomes':race,'persistedHead':2})
  b.close()
  pdf=api(a,"return api.getResource('pdf:doc.atlas.pdf');")
  plan=api(a,"const r=api.getResource('pdf:doc.atlas.pdf');r.snapshot.page.title+=' audit revision';r.snapshot.document.title=r.snapshot.page.title;return {schemaVersion:1,kind:'atlas-agent-changeset',id:'audit.pdf',createdAt:Date.now(),source:'Independent synthetic QA human decision',operations:[{id:'audit.pdf.op',kind:'pdf.metadata.update',resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:'pdf',snapshot:r.snapshot}}]};")
  api(a,'await api.stage(arg);await api.accept(arg.id);',plan)
  api(a,"await api.compareRevisions(arg.resourceKey,arg.head.revisionId);await api.setAgentCompareState({enabled:true,mode:'side-by-side'});",pdf)
  expect(a.locator('.integrated-pdf')).to_have_count(2,timeout=30000)
  for i in range(2):
   panel=a.locator('.integrated-pdf').nth(i);expect(panel.locator('.react-pdf__Page canvas').first).to_be_visible(timeout=30000)
   assert panel.get_attribute('data-worker-status')=='compatible'
  a.screenshot(path=str(OUTPUT/'supplemental-pdf-rendered.png'),full_page=True)
  canvases=a.locator('.integrated-pdf').evaluate_all('(xs)=>xs.map(x=>Array.from(x.querySelectorAll("canvas")).map(c=>({width:c.width,height:c.height})))')
  assert all(any(c['width']>0 and c['height']>0 for c in pane) for pane in canvases)
  results.append({'name':'Unlocked current/historical PDF renders real canvases in both panes','status':'PASS','canvases':canvases,'historicalRevision':pdf['head']['revisionId'],'note':'Metadata revision over the same PDF bytes; does not establish replacement-byte history or independent page positions.'})
  api(a,"await api.navigateAgentTarget({...api.getResource('pdf:doc.atlas.pdf').target,pdfPage:2},'here');")
  expect(a.locator('.integrated-pdf').nth(1).locator('[data-physical-page="2"] canvas')).to_be_visible(timeout=30000)
  expect(a.locator('.integrated-pdf').nth(0).locator('[data-physical-page="1"] canvas')).to_be_visible(timeout=30000)
  ready(a)
  expect(a.locator('.integrated-pdf').nth(1).locator('[data-physical-page="2"] canvas')).to_be_visible(timeout=30000)
  expect(a.locator('.integrated-pdf').nth(0).locator('[data-physical-page="1"] canvas')).to_be_visible(timeout=30000)
  a.screenshot(path=str(OUTPUT/'supplemental-pdf-independent-reload.png'),full_page=True)
  results.append({'name':'Historical PDF page 1 and current PDF page 2 remain independent after reload','status':'PASS','workspaceSummary':api(a,'return api.getWorkspaceSummary();')})
  context.close();browser.close()
except Exception as e:
 results.append({'name':'Supplemental check','status':'FAIL','error':str(e),'traceback':traceback.format_exc()})
finally:
 report={'buildPath':str(audit_dist),'includedArtifactRun':35384025755,'includedArtifactCommit':'60db2cb7504503ac416ddad940441e24f82266b1','results':results,'pageErrors':errors}
 (OUTPUT/'supplemental-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
