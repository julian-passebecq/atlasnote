"""Real Chromium/IndexedDB capacity recovery at all four release boundaries.

Only disposable fixture setup writes IDB directly. The blocked edit, archival
ceremony, compaction, integrity, recovery edit and historical navigation all use
actual UI/public Agent paths. No opaque origin or compatibility fallback passes.
"""
import hashlib
import time
import zipfile
from v23_browser_common import *
from v23_finish_support import (digest,prepare_archive,compact,attach,integrity,
    plan_update,compare_via_history_ui,render_historical_pdf)
from v23_compaction_runtime import fresh

BOUNDARIES=[
    ('2000-revisions-per-resource','perResource',2000),
    ('25000-total-revisions','total',25000),
    ('500-review-rows','reviews',500),
    ('64-MiB-structured-history','bytes',64*1024*1024),
]
BUILDER=Path('tests/v23/capacity-fixtures.mjs').read_text().replace('export async function','async function',1)

SEED='''async(boundary)=>{
 const make=BUILD_FIXTURE;
 const snapshot=READ_SNAPSHOT;const value=await make(await snapshot.readPersistedWorkspace(),boundary),ws=value.workspace;
 const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 const names=['imports','overlays','personal','assets','history'];
 if([...db.objectStoreNames].sort().join('|')!==[...names].sort().join('|'))throw Error('Unexpected stores');
 const tx=db.transaction(names,'readwrite');
 const done=new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error||Error('Fixture transaction aborted'));tx.onerror=()=>no(tx.error);});
 for(const n of names)tx.objectStore(n).clear();
 for(const p of ws.imports)tx.objectStore('imports').put(p,p.manifest.id);
 tx.objectStore('overlays').put(ws.overlays,'active');tx.objectStore('personal').put(ws.personal,'active');
 for(const asset of ws.assets)tx.objectStore('assets').put(asset,asset.key);
 const h=tx.objectStore('history');h.put(ws.history.meta,'meta');
 for(const r of ws.history.revisions)h.put(r,'revision:'+r.revisionId);
 for(const r of ws.history.heads)h.put(r,'head:'+r.resourceKey);
 for(const r of ws.history.reviews)h.put(r,'review:'+r.id);
 await done;db.close();delete value.workspace;return value;
}'''.replace('BUILD_FIXTURE',BUILDER.rstrip().rstrip(';')).replace('READ_SNAPSHOT',SNAPSHOT)

# Compare exact current data and removal sets inside the browser, not via 64 MiB CDP payloads.
VERIFY='''async(preview)=>{
 const m=READ_SNAPSHOT,after=await m.readPersistedWorkspace(),before=window.__qaCapacityBefore;
 const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
 const equal=(a,b,label)=>{if(stable(a)!==stable(b))throw Error('Changed unexpectedly: '+label);};
 for(const name of ['imports','overlays','personal'])equal(before[name],after[name],name);
 equal(before.history.heads,after.history.heads,'heads');
 const revs=new Set(preview.revisionIds),reviews=new Set(preview.reviewIds),assets=new Set(preview.assetKeys);
 equal(before.history.revisions.filter(r=>!revs.has(r.revisionId)),after.history.revisions,'exact retained revisions');
 equal(before.history.reviews.filter(r=>!reviews.has(r.id)),after.history.reviews,'exact retained reviews');
 equal(before.assets.filter(a=>!assets.has(a.key)),after.assets,'exact retained private bytes');
 const prior=before.history.archives??[],current=after.history.archives??[];
 if(current.length!==prior.length+1)throw Error('Expected exactly one new descriptor');
 for(const a of prior)equal(a,current.find(b=>b.archiveId===a.archiveId),'old descriptor');
 if(!current.some(a=>a.archiveId===preview.archiveId&&a.rootHash===preview.rootHash))throw Error('Exact descriptor missing');
 const old=before.history.revisions.find(r=>revs.has(r.revisionId)&&r.resourceKey===window.__qaCapacityKey)
  ??before.history.revisions.find(r=>revs.has(r.revisionId)&&r.resourceKey==='notebook-page:demo.v23.notebook');
 if(!old)throw Error('An old browsable revision is required');
 const pdf=before.history.revisions.find(r=>revs.has(r.revisionId)&&r.resourceType==='pdf'&&r.resourceKey.startsWith('pdf:demo.v23')&&r.number===1);
 if(!pdf)throw Error('Historical private PDF coverage required');
 const retainedPending=before.history.reviews.filter(r=>r.status==='staged');
 for(const r of retainedPending)equal(r,after.history.reviews.find(x=>x.id===r.id),'pending review');
 const evidence={old:{key:old.resourceKey,revisionId:old.revisionId,contentHash:old.contentHash},pdf:{key:pdf.resourceKey,revisionId:pdf.revisionId,assetKey:pdf.snapshot.document.assetKey,sha256:pdf.snapshot.document.sha256},removedAssetHashes:before.assets.filter(a=>assets.has(a.key)).map(a=>({key:a.key,sha256:a.sha256})),pendingIds:retainedPending.map(r=>r.id),liveAfter:{revisions:after.history.revisions.length,reviews:after.history.reviews.length,bytes:new TextEncoder().encode(JSON.stringify(after.history)).length}};
 delete window.__qaCapacityBefore;return evidence;
}'''.replace('READ_SNAPSHOT',SNAPSHOT)

def scenario(browser,context,page,base,out,passed):
    for boundary,metric,limit in BOUNDARIES:
        started=time.monotonic();c,p=fresh(browser,base)
        try:
            p.set_default_timeout(180000);seed_demo(p);flush(p)
            fixture=p.evaluate(SEED,boundary)
            # Do not let the intentionally stale setup tab run a reader-save handler.
            p.close(run_before_unload=False)
            p=c.new_page();p.set_default_timeout(180000)
            p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
            actual=p.evaluate('async(key)=>{const m='+SNAPSHOT+';const h=(await m.readPersistedWorkspace()).history;return {perResource:h.revisions.filter(r=>r.resourceKey===key).length,total:h.revisions.length,reviews:h.reviews.length,bytes:new TextEncoder().encode(JSON.stringify(h)).length};}',fixture['resourceKey'])
            assert actual[metric]==limit,(boundary,actual)
            plan=plan_update(p,fixture['resourceKey'])
            if metric in ['perResource','total']:
                p.evaluate('async(plan)=>('+AGENT+').stage(plan)',plan)
            before=digest(p)
            operation='accept(plan.id)' if metric in ['perResource','total'] else 'stage(plan)'
            refusal=p.evaluate('async(plan)=>{try{await ('+AGENT+').'+operation+';return null;}catch(e){return String(e.message||e);}}',plan)
            assert refusal and any(text in refusal for text in ['history is full','64 MiB']),refusal
            assert digest(p)==before,'A rejected normal edit must leave all five stores exact'
            assert not p.evaluate('async()=>('+AGENT+').getStorageDiagnostics().storageError')
            section,preview,file=prepare_archive(p,out,boundary,1)
            p.evaluate('async(key)=>{const m='+SNAPSHOT+';window.__qaCapacityBefore=await m.readPersistedWorkspace();window.__qaCapacityKey=key;}',fixture['resourceKey'])
            compact(p,section)
            proof=p.evaluate(VERIFY,preview)
            assert fixture['pendingId'] in proof['pendingIds']
            # Independently hash private historical bytes from the actual saved ZIP.
            with zipfile.ZipFile(file) as archive:
                manifest=json.loads(archive.read('archive.json'))
                assets={a['key']:a for a in manifest['descriptor']['assets']}
                for old in proof['removedAssetHashes']:
                    assert old['key'] in assets,old
                    payload=archive.read(assets[old['key']]['path'])
                    assert hashlib.sha256(payload).hexdigest()==old['sha256']
            p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
            integrity(p)
            old=proof['old']
            missing=p.evaluate('async(x)=>{try{('+AGENT+').getResource(x.key,x.rev);return null;}catch(e){return e.message;}}',{'key':old['key'],'rev':old['revisionId']})
            assert missing and 'Attach the exact archive' in missing and 'Current content was not substituted' in missing
            if metric not in ['perResource','total']:
                p.evaluate('async(plan)=>('+AGENT+').stage(plan)',plan)
            p.evaluate('async(id)=>('+AGENT+').accept(id)',plan['id']);flush(p)
            head=p.evaluate('async(key)=>('+AGENT+').getResource(key).head',fixture['resourceKey'])
            assert head['revisionId']!=plan['operations'][0]['baseRevisionId']
            p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
            assert p.evaluate('async(key)=>('+AGENT+').getResource(key).head',fixture['resourceKey'])==head
            integrity(p);attach(p,file)
            recovered=p.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.rev)',{'key':old['key'],'rev':old['revisionId']})
            assert recovered['revision']['contentHash']==old['contentHash']
            compare_via_history_ui(p,old['key'],old['revisionId'])
            pdf=proof['pdf']
            render=render_historical_pdf(p,pdf['key'],pdf['revisionId'],out,boundary+'-pdf')
            assert render['historical']['assetHash']==pdf['sha256']
            still_pending=p.evaluate('async(id)=>{const m='+SNAPSHOT+';return (await m.readPersistedWorkspace()).history.reviews.find(r=>r.id===id)?.status;}',fixture['pendingId'])
            assert still_pending=='staged','A retained proposal must never be auto-accepted'
            passed(boundary,boundaryCounts=actual,removedRevisions=len(preview['revisionIds']),removedReviews=len(preview['reviewIds']),removedAssets=len(preview['assetKeys']),liveAfter=proof['liveAfter'],archiveId=preview['archiveId'],rootHash=preview['rootHash'],postRecoveryRevision=head['revisionId'],durationSeconds=round(time.monotonic()-started,3),historicalPdf=render['historical'])
        finally:c.close()

if __name__=='__main__':raise SystemExit(run_suite('capacity',scenario))
