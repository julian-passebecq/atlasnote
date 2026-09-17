"""Exact backup serializer diagnostic on the DOM harness, not an IndexedDB gate."""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import ROOT,start_server,launch,mount_dom,open_context
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/1.2.1/backup-diagnostic'));OUT.mkdir(parents=True,exist_ok=True)
base=start_server(dom_only=True)
def diff(a,b,path='personal'):
 out=[]
 if type(a)!=type(b):return [{'path':path,'before':a,'after':b}]
 if isinstance(a,dict):
  for k in sorted(set(a)|set(b)):
   if k not in a or k not in b:out.append({'path':path+'.'+k,'before':a.get(k,'<ABSENT>'),'after':b.get(k,'<ABSENT>')})
   else:out+=diff(a[k],b[k],path+'.'+k)
 elif isinstance(a,list):
  if len(a)!=len(b):out.append({'path':path+'.length','before':len(a),'after':len(b)})
  for i in range(min(len(a),len(b))):out+=diff(a[i],b[i],path+f'[{i}]')
 elif a!=b:out.append({'path':path,'before':a,'after':b})
 return out
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':900})
 p.expose_function('atlasTestSHA256',lambda a:list(hashlib.sha256(bytes(a)).digest()))
 print("diagnostic: mounting",flush=True);mount_dom(p,base);print("diagnostic: mounted",flush=True)
 p.evaluate('''()=>{if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(_,data)=>new Uint8Array(await window.atlasTestSHA256(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer}});testReset('page.atlas.layouts');}''')
 print('diagnostic: opening remarks',flush=True);open_context(p,'Remarks');print('diagnostic: opened',flush=True)
 p.get_by_role('textbox',name='Personal remarks',exact=True).fill('BACKUP_DIAGNOSTIC_exact\nSecond line retained.')
 p.wait_for_timeout(400)
 raw=p.evaluate('structuredClone(testStore.state.personal)')
 undefined=p.evaluate('''()=>{const paths=[];function walk(v,path){if(v&&typeof v==='object')for(const k of Object.keys(v)){if(v[k]===undefined)paths.push(path+'.'+k);else walk(v[k],path+'.'+k);}}walk(testStore.state.personal,'personal');return paths;}''')
 print('diagnostic: snapshot and ZIP',flush=True)
 result=p.evaluate('''async()=>{const [{makeBackup,unzipBounded},{assetResolver}]=await Promise.all([import(new URL('app/storage/archives.mjs',document.baseURI).href),import(new URL('app/app/assets.js',document.baseURI).href)]);const assets=assetResolver(testBuilt,()=>testCore.compose(testBuilt,testStore.state));await testStore.flush();const result=await makeBackup(testStore.state,testBuilt,assets.asset);const {files}=await unzipBounded(result.bytes);return JSON.parse(new TextDecoder().decode(files.get('backup.json'))).workspace.personal;}''')
 changes=diff(raw,result)
 (OUT/'before-personal.json').write_text(json.dumps(raw,indent=2));(OUT/'package-personal.json').write_text(json.dumps(result,indent=2));(OUT/'structural-diff.json').write_text(json.dumps(changes,indent=2));(OUT/'undefined-paths.json').write_text(json.dumps(undefined,indent=2))
 report={'scope':'Real DOM remark handler + production makeBackup and ZIP parser; storage writes suppressed, not real-origin/IndexedDB/download evidence','exactPersonalEquality':raw==result,'undefinedPaths':undefined,'diff':changes}
 (OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));b.close()
 if os.environ.get('ATLAS_ASSERT_BACKUP','1')=='1':assert raw==result,changes
