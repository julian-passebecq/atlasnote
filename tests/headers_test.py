"""Verify distribution header file and real local HTTP headers. Netlify live is separate."""
import json
import os
from pathlib import Path
import urllib.request
from browser_support import ROOT,start_server
expected={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}
base=start_server()
text=(ROOT/'dist/_headers').read_text();assert text.splitlines()[0]=='/*'
for key,value in expected.items():assert f'{key}: {value}' in text
checks=[]
for relative in ['','app/main.js','content.json']:
 with urllib.request.urlopen(base+relative) as response:
  for key,value in expected.items():assert response.headers[key]==value,(key,response.headers[key])
  checks.append({'path':relative or '/','status':'PASS','actualHeaders':{key:response.headers[key] for key in expected}})
report={'scope':'Actual localhost HTTP server and deployable dist/_headers; no live Netlify deployment was requested or changed.','status':'PASS','checks':checks,'liveNetlify':{'status':'BLOCKED','reason':'Remote deployed response verification was not run; this is local/package evidence only.'}}
out=ROOT/'docs/evidence/hardening/headers.json';out.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
