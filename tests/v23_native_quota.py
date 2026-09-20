"""Fresh Linux tmpfs/native Chromium capacity proof (optional sudo for mount only).
The preserved proof requires native FILE_ERROR_NO_SPACE after optimistic preflight,
exact equality of all five stores and equality again after reload. Never injects quota.
A denied mount or missing integrated build is BLOCKED, never PASS.
"""
import os,sys,json,subprocess,threading,http.server,functools,traceback,hashlib,tempfile,shutil,errno
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
OUT=Path(sys.argv[1] if len(sys.argv)>1 else os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/native-capacity')).resolve();OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(ROOT/'tests'))
from v23_browser_common import RAW
from v23_finish_support import DIGEST
MOUNT=Path(tempfile.mkdtemp(prefix='atlasnote-quota-'))
identity=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {sourceIdentity,sourceHash} from './tools/check-v23-build.mjs';console.log(JSON.stringify({...sourceIdentity(),sourceHash:sourceHash()}))"],text=True))
report={'status':'BLOCKED',**identity,'mechanism':'256 MiB disposable tmpfs browser profile; real filesystem exhaustion; no browser API patch or quota override','steps':[]}
executable=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
def record(name,**kw):
 report['steps'].append({'name':name,**kw});(OUT/'probe.json').write_text(json.dumps(report,indent=2));print(name,flush=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=None;mounted=False
prefix=['sudo','-n'] if getattr(os,'geteuid',lambda:0)()!=0 and os.environ.get('ATLAS_V23_QUOTA_SUDO')=='1' else []
def proof(base):
 with sync_playwright() as pw:
  context=pw.chromium.launch_persistent_context(str(MOUNT/'profile'),headless=True,executable_path=executable,args=['--no-sandbox'],viewport={'width':1440,'height':900})
  try:
   page=context.pages[0];page.set_default_timeout(30000);page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app')
   page.evaluate("async()=>{const m=await import('/app/storage/workspace-snapshot.js');await m.captureWorkspaceSnapshot();}")
   record('exact-build',origin=base,build=page.evaluate("async()=>await(await fetch('/build-identity.json')).json()"),browser=context.browser.version if context.browser else 'persistent Chromium')
   page.get_by_role('button',name='More / Settings',exact=True).click();page.get_by_role('button',name='Workspace settings',exact=True).click()
   page.get_by_label('Import library ZIP',exact=True).set_input_files(str(ROOT/'tests/fixtures/atlas-audit-stress-library-1.0.0.zip'))
   page.get_by_role('button',name='Confirm library import',exact=True).wait_for()
   before=page.evaluate(RAW);record('before-five-stores',digest=page.evaluate(DIGEST))
   page.evaluate('window.__nativeEvents=[]')
   bundle=next((ROOT/'dist/assets').glob('database-*.js'));code=bundle.read_text()
   cdp=context.new_cdp_session(page);cdp.send('Debugger.enable')
   def logpoint(marker,expression):
    offset=code.index(marker);prefix=code[:offset]
    return cdp.send('Debugger.setBreakpointByUrl',{'url':base+'assets/'+bundle.name,'lineNumber':prefix.count('\n'),'columnNumber':len(prefix.rsplit('\n',1)[-1]),'condition':expression})
   record('passive-debugger-observers',preflight=logpoint('return{status:n.status===`available`?', '(window.__nativeEvents.push({type:"preflight-permitted",estimate:n,required:r}),false)'),transaction=logpoint('try{let[l,u]=await Promise.all', '(window.__nativeEvents.push({type:"native-transaction-created",stores:[...s.objectStoreNames]}),s.addEventListener("abort",e=>window.__nativeEvents.push({type:"abort",trusted:e.isTrusted,error:s.error?.name,message:s.error?.message})),s.addEventListener("complete",e=>window.__nativeEvents.push({type:"complete",trusted:e.isTrusted})),false)'))
   record('native-estimate-before-pressure',estimate=page.evaluate('async()=>await navigator.storage.estimate()'))
   filler=MOUNT/'capacity-filler';fd=os.open(filler,os.O_CREAT|os.O_WRONLY,0o600)
   try:
    block=b'Q'*1048576
    while True:
     try:os.write(fd,block)
     except OSError as e:
      assert e.errno==errno.ENOSPC,'Only real ENOSPC proves capacity exhaustion'
      record('filesystem-capacity-reached',errno=e.errno,free=os.statvfs(MOUNT).f_bavail*os.statvfs(MOUNT).f_frsize);break
   finally:os.close(fd)
   record('native-estimate-after-pressure',estimate=page.evaluate('async()=>await navigator.storage.estimate()'))
   record('unmodified-preflight-observation',result=page.evaluate("async(url)=>{const m=await import(url);try{return await m.D(1048576)}catch(e){return {error:e.message}}}",base+'assets/'+bundle.name))
   page.get_by_role('button',name='Confirm library import',exact=True).click()
   page.wait_for_timeout(3000)
   record('native-write-outcome',events=page.evaluate('window.__nativeEvents'),diagnostics=page.evaluate("async()=>(await import('/app/agent/public.js')).getAgentInterface().getStorageDiagnostics()"),alerts=page.locator('[role=alert]').all_text_contents())
   page.screenshot(path=str(OUT/'failed-persistence.png'),full_page=True)
   filler.unlink();record('capacity-released',free=os.statvfs(MOUNT).f_bavail*os.statvfs(MOUNT).f_frsize)
   try:
    after=page.evaluate('async()=>await Promise.race([('+RAW+')(),new Promise((_,reject)=>setTimeout(()=>reject(Error("Read reopen timed out after native connection close")),8000))])')
    record('after-five-stores',exactEqual=before==after,digest=page.evaluate(DIGEST))
   except Exception as e:
    record('read-after-abort-unavailable',reason=str(e))
    context.close()
    context=pw.chromium.launch_persistent_context(str(MOUNT/'profile'),headless=True,executable_path=executable,args=['--no-sandbox'],viewport={'width':1440,'height':900})
    page=context.pages[0];page.goto(base+'LICENSE.txt')
    after=page.evaluate(RAW);record('reopened-five-stores-before-app',exactEqual=before==after,digest=page.evaluate(DIGEST))
    page.goto(base,wait_until='networkidle');page.wait_for_selector('.atlas-app')
   page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app')
   reopened=page.evaluate(RAW);record('reload-five-stores',exactEqual=before==reopened,digest=page.evaluate(DIGEST))
   outcome=next(x for x in report['steps'] if x['name']=='native-write-outcome')
   events=outcome['events']
   assert any(x['type']=='preflight-permitted' for x in events)
   assert any(x['type']=='native-transaction-created' and sorted(x['stores'])==['assets','history','imports','overlays','personal'] for x in events)
   assert any(x['type']=='abort' and x.get('trusted') and 'FILE_ERROR_NO_SPACE' in x.get('message','') for x in events)
   assert not any(x['type']=='complete' for x in events)
   assert before==after==reopened
   assert outcome['diagnostics']['storageError'] and outcome['diagnostics']['saving']==0
   assert any('Keep this tab open' in x and 'retry' in x for x in outcome['alerts'])
   build=next(x['build'] for x in report['steps'] if x['name']=='exact-build')
   assert build['sourceCommit']==report['sourceCommit'] and build['sourceHash']==report['sourceHash'] and not build['sourceDirty'] and build['buildKind']=='integrated'
   report['status']='PASS';record('native-capacity-proof-verified')
  finally:context.close()
try:
 if not sys.platform.startswith('linux'):
  record('prerequisite-blocked',reason='This proof needs a Linux tmpfs environment. Use the retained WSL wrapper or Linux CI.')
 else:
  result=subprocess.run(prefix+['mount','-t','tmpfs','-o','size=256m,mode=1777','atlasnote-quota',str(MOUNT)],capture_output=True,text=True,timeout=15)
  if result.returncode:
   record('prerequisite-blocked',reason='Disposable tmpfs mount permission is unavailable; no native write proof was executed.',exitCode=result.returncode,mountError=result.stderr.strip())
  else:
   mounted=True
   assert os.path.ismount(MOUNT),'Native proof must not fill the host filesystem'
   stat=os.statvfs(MOUNT);assert stat.f_blocks*stat.f_frsize<=256*1024*1024,'Disposable capacity bound exceeded'
   checked=subprocess.run(['node','tools/check-v23-build.mjs'],capture_output=True,text=True,env={**os.environ,'ATLAS_EVIDENCE':str(OUT/'build-check')})
   if checked.returncode:
    record('prerequisite-blocked',reason='A clean exact integrated build is required; no compatibility output was substituted.')
   else:
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    proof('http://127.0.0.1:'+str(server.server_port)+'/')
except Exception:
 report['status']='FAIL';record('attempt-error',traceback=traceback.format_exc())
finally:
 if server:server.shutdown();server.server_close()
 unmount_exit=None
 if mounted:
  unmount=subprocess.run(prefix+['umount',str(MOUNT)],capture_output=True,text=True,timeout=15);unmount_exit=unmount.returncode
 still_mounted=os.path.ismount(MOUNT)
 if still_mounted or (unmount_exit not in (None,0)):
  report['status']='FAIL'
 else:shutil.rmtree(MOUNT,ignore_errors=True)
 record('cleanup',mountCreated=mounted,unmountExit=unmount_exit,mounted=still_mounted,temporaryDirectoryRemoved=not MOUNT.exists())
raise SystemExit(0 if report['status']=='PASS' else 2 if report['status']=='BLOCKED' else 1)
