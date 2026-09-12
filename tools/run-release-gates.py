#!/usr/bin/env python3
"""Execute release gates with original logs and explicit blocked status.
Never uploads or deploys. No web calls; npm-ci is explicitly offline. Run from root.
Exit 0: every executable gate passed and none blocked; 1: failure; 2: blocked only.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import json
import os
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--out', type=Path, default=ROOT/'docs/evidence/release-1.1')
a = p.parse_args(); OUT = a.out.resolve(); OUT.mkdir(parents=True, exist_ok=True)
(OUT/'logs').mkdir(exist_ok=True)
npm = 'npm.cmd' if os.name == 'nt' else 'npm'
GATES = [
 ('offline-install', [npm,'ci','--offline','--ignore-scripts','--no-audit','--no-fund']),
 ('offline-bootstrap', [npm,'run','bootstrap:offline']),
 ('build', [npm,'run','build']), ('validate', [npm,'run','validate']),
 ('typecheck', [npm,'run','typecheck']), ('unit', [npm,'test']),
 ('public-release', [npm,'run','check:release']),
 ('baseline-dom', [npm,'run','test:dom']), ('hardening-ui', [npm,'run','test:hardening:ui']),
 ('reader-ui', [npm,'run','test:reader:ui']), ('pdf-authoring', [npm,'run','test:pdf:authoring']),
 ('library-validate', [npm,'run','pdf:library:validate']), ('library-build', [npm,'run','pdf:library:build']),
 ('headers', [npm,'run','test:headers']), ('browser', [npm,'run','test:browser']),
 ('runtime', [npm,'run','test:runtime']), ('pdf-runtime', [npm,'run','test:pdf']),
 ('online-syntax', [npm,'run','test:online:syntax']),
 ('dependency-audit', [npm,'run','audit:local']),
 ('online-typecheck', [npm,'run','typecheck:online']),
 ('online-build', [npm,'run','build:vite']),
 # Restore the deliverable offline distribution if an optional build was possible.
 ('final-offline-build', [npm,'run','build']),
]
records = []
for name,command in GATES:
    start = time.monotonic(); dest = OUT/'logs'/f'{name}.log'
    env = {**os.environ, 'ATLAS_EVIDENCE':str(OUT/name)}
    print('RUN',name,flush=True)
    with dest.open('w') as f:
        f.write('COMMAND: '+' '.join(command)+'\n'); f.flush()
        try:
            result = subprocess.run(command,cwd=ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=240)
            code = result.returncode
        except subprocess.TimeoutExpired:
            code = 124; f.write('\nGate exceeded 240 seconds; not a pass.\n')
        except OSError as exc:
            code = 125; f.write('\n'+repr(exc)+'\n')
    text = dest.read_text(errors='replace'); status = 'PASS' if code == 0 else 'FAIL'; reason = ''
    if code and name == 'offline-install' and any(s in text for s in ['ENOTCACHED','cache mode is','ECONN','ENET','EAI_AGAIN']):
        status='BLOCKED';reason='Incomplete offline npm cache. Bundled runtime/installed compiler restoration is a separate gate.'
    elif code == 2 and name in ['browser','runtime','pdf-runtime']:
        status='BLOCKED';reason='The suite reports an unavailable normal-origin browser or optional integrated PDF prerequisite. See original log/results.'
    elif code and name == 'online-typecheck' and ('Cannot find module' in text or 'Cannot find type definition' in text):
        status='BLOCKED';reason='Optional installed React-PDF/Vite/types packages unavailable. Syntax-only results are separate.'
    elif code and name == 'online-build' and 'Optional dependencies are unavailable' in text:
        status='BLOCKED';reason='Optional engine dependency installation unavailable; no integrated engine is bundled.'
    elif code and name == 'dependency-audit':
        try:
            report=json.loads((ROOT/'docs/evidence/hardening/dependency-inventory.json').read_text())
            if report['vendorByteIntegrity']=='PASS' and not report['installedVersionsMatch']:
                status='BLOCKED';reason='Vendor bytes pass; bundled offline entry points are not a complete installed transitive dependency inventory.'
        except (OSError,ValueError,KeyError): pass
    if name in ['headers','dependency-audit','online-syntax']:
        target={'headers':'headers.json','dependency-audit':'dependency-inventory.json','online-syntax':'pdf-static/syntax.json'}[name]
        src=ROOT/'docs/evidence/hardening'/target
        if src.exists():
            (OUT/name).mkdir(exist_ok=True);shutil.copyfile(src,OUT/name/Path(target).name)
    row={'gate':name,'status':status,'exitCode':code,'seconds':round(time.monotonic()-start,2),'command':command,'log':dest.relative_to(OUT).as_posix(),'reason':reason}
    records.append(row);print(status,name,code,flush=True)
    data={'release':'1.1.0','timestamp':datetime.now(timezone.utc).isoformat(),'scope':'Local offline gates; no remote registry audit, push, CI or deployment. Each browser result states DOM or real-origin scope.','gates':records}
    (OUT/'gates.json').write_text(json.dumps(data,indent=2)+'\n')
raise SystemExit(1 if any(r['status']=='FAIL' for r in records) else 2 if any(r['status']=='BLOCKED' for r in records) else 0)
