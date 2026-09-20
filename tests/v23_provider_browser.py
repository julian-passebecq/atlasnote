"""Managed access transitions on a fresh preview. Credentials never leave its exact origin.
Only original synthetic demo data is created, in an ephemeral browser profile.
No provider cookies, login UI, storage snapshots, HAR or trace are retained.
"""
import os,json,hashlib,datetime,traceback
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from browser_support import launch,open_settings,close_panels
from v23_browser_common import RAW,flush,seed_demo

OUT=Path(os.environ['ATLAS_EVIDENCE']);OUT.mkdir(parents=True,exist_ok=True)
ORIGIN=os.environ['ATLAS_V23_PREVIEW_URL'].rstrip('/')
SECRET=os.environ['VERCEL_AUTOMATION_BYPASS_SECRET']
RUN=os.environ['ATLAS_V23_RUN_ID']
EXPECTED=json.loads(Path('dist/build-identity.json').read_text())
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
rows=[];browserCreated=False;browserClosed=False
def row(name,status,**detail):rows.append({'name':name,'status':status,**detail})
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def clean(text):
    for key in ('VERCEL_TOKEN','VERCEL_AUTOMATION_BYPASS_SECRET'):
        value=os.environ.get(key)
        if value:text=text.replace(value,'[REDACTED]')
    return text
try:
    parsed=urlsplit(ORIGIN)
    assert parsed.scheme=='https' and parsed.hostname.endswith('.vercel.app') and not parsed.query and not parsed.fragment and not parsed.username
    assert len(SECRET)>=16 and '\n' not in SECRET and '\r' not in SECRET
    with sync_playwright() as pw:
        browser=launch(pw);browserCreated=True
        try:
            context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=False,service_workers='block')
            authorized={'value':True};sent={'sameOrigin':0,'otherOrigin':0}
            def route_request(route):
                request=route.request;url=urlsplit(request.url)
                origin=url.scheme+'://'+url.netloc
                headers={k:v for k,v in request.headers.items() if k.lower()!='x-vercel-protection-bypass'}
                if origin==ORIGIN and authorized['value']:
                    headers['x-vercel-protection-bypass']=SECRET;sent['sameOrigin']+=1
                    # Fetch this request only. Never let a header override follow a
                    # redirect to an identity provider, CDN or toolbar origin.
                    response=route.fetch(headers=headers,max_redirects=0,timeout=20000)
                    route.fulfill(response=response)
                else:
                    if origin!=ORIGIN and any(k.lower()=='x-vercel-protection-bypass' for k in request.headers):
                        sent['otherOrigin']+=1
                    route.continue_(headers=headers)
            context.route('**/*',route_request)
            page=context.new_page();page.set_default_timeout(20000)
            page.goto(ORIGIN+'/',wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
            actual=page.evaluate("async()=>await(await fetch('/build-identity.json')).json()")
            assert actual==EXPECTED,'Wrong integrated source identity in actual browser'
            seed_demo(page);close_panels(page);flush(page)
            page.goto(ORIGIN+'/workspace/5/history/old',wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
            assert page.evaluate("async()=>await(await fetch('/build-identity.json')).json()") == EXPECTED
            open_settings(page)
            assert page.locator('[data-durability-action="safe-close"]').is_visible()
            assert page.locator('form[action="/__atlasnote_lock"]').count()==0
            page.screenshot(path=str(OUT/'authorized-atlasnote.png'),full_page=True)
            close_panels(page);flush(page)
            # Read all five real stores from an inert same-origin text document.
            # No running app remains to create navigation/personal writes during auth changes.
            inert=context.new_page();inert.goto(ORIGIN+'/LICENSE.txt',wait_until='load')
            page.close();before=inert.evaluate(RAW)
            assert sorted(before)==['assets','history','imports','overlays','personal']
            assert all(before[k] for k in ('history','overlays','personal'))
            authorized['value']=False;context.clear_cookies()
            denial=context.request.get(ORIGIN+'/',max_redirects=0,timeout=15000)
            assert denial.status in (401,403,302,303,307,308),'Auth loss did not deny access'
            assert 'id="root"' not in denial.text(),'Anonymous app content leaked'
            if denial.status in (302,303,307,308):
                dest=urlsplit(denial.headers.get('location',''))
                assert dest.scheme=='https' and (dest.hostname=='vercel.com' or (dest.hostname or '').endswith('.vercel.com'))
            after=inert.evaluate(RAW);assert after==before,'Auth loss mutated a local store'
            authorized['value']=True
            response=inert.goto(ORIGIN+'/LICENSE.txt',wait_until='load');assert response.status==200
            restored=inert.evaluate(RAW);assert restored==before,'Auth restoration mutated a local store'
            row('auth-state-idb','PASS',stores=sorted(before),beforeDigest=digest(before),anonymousDigest=digest(after),restoredDigest=digest(restored),scope='Five-store exact bytes/keys/values equal across cleared cookies, absent bypass, denial, and restored bypass in a disposable profile. No provider-cookie implementation assertions.')
            page=context.new_page();page.goto(ORIGIN+'/',wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
            assert page.evaluate("async()=>await(await fetch('/build-identity.json')).json()") == EXPECTED
            row('browser-sanity','PASS',deepLink='/workspace/5/history/old',sourceHash=EXPECTED['sourceHash'],browserVersion=browser.version,screenshot='authorized-atlasnote.png')
            assert sent['sameOrigin']>0 and sent['otherOrigin']==0
            row('automation-secret-scope','PASS',mechanism='Supported bypass request header scoped to exact origin; no query, storage-state, HAR or trace.',sameOriginAuthorizedRequests=sent['sameOrigin'],crossOriginCredentialRequests=sent['otherOrigin'])
            context.close()
        finally:
            browser.close();browserClosed=True
except Exception as exc:
    unavailable=any(x in str(exc) for x in ("Executable doesn't exist",'ERR_NAME_NOT_RESOLVED','ERR_BLOCKED_BY_ADMINISTRATOR','net::ERR_CONNECTION'))
    status='BLOCKED' if unavailable else 'FAIL'
    for name in ('auth-state-idb','browser-sanity','automation-secret-scope'):
        if not any(r['name']==name for r in rows):row(name,status,reason=clean(str(exc)))
status='FAIL' if any(r['status']=='FAIL' for r in rows) else 'BLOCKED' if any(r['status']!='PASS' for r in rows) else 'PASS'
report={'schemaVersion':1,'runId':RUN,'startedAt':started,'sourceHash':EXPECTED['sourceHash'],'sourceCommit':EXPECTED['sourceCommit'],'target':ORIGIN,'status':status,'results':rows,'cleanup':{'ephemeralBrowserCreated':browserCreated,'ephemeralBrowserClosed':browserClosed,'authStateSaved':False}}
(OUT/'browser-results.json').write_text(clean(json.dumps(report,indent=2)))
print(json.dumps({'status':status,'results':[{'name':r['name'],'status':r['status']} for r in rows]}))
raise SystemExit(0 if status=='PASS' else 2 if status=='BLOCKED' else 1)
