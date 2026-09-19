"""Capacity recovery through saved-file UI and the unchanged native compactor."""
from v23_browser_common import *
from v23_finish_helpers import SUCCESS, ATTACHED

KEY='notebook-page:demo.v23.notebook'
# Fixture generation writes only the native history store. It is not the writer
# under test: reload then all archive/deletion/edit steps use production paths.
SEED="""async kind=>{
 const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI)),ws=await m.readPersistedWorkspace();
 const key='notebook-page:demo.v23.notebook',byId=new Map(ws.history.revisions.map(r=>[r.revisionId,r]));
 const heads=[...ws.history.heads].sort((a,b)=>JSON.stringify(byId.get(a.revisionId).snapshot).length-JSON.stringify(byId.get(b.revisionId).snapshot).length||a.resourceKey.localeCompare(b.resourceKey)),counts=heads.map(h=>h.resourceKey===key?2:1),target=heads.findIndex(h=>h.resourceKey===key);
 if(target<0)throw Error('Missing capacity target');
 if(kind==='per-resource')counts[target]=2000;
 if(kind==='total'){let left=25000-counts.reduce((n,x)=>n+x,0);for(let i=0;i<counts.length&&left;i++){if(i===target)continue;const n=Math.min(2000-counts[i],left);counts[i]+=n;left-=n;}if(left)throw Error('Not enough independent resource fixtures');}
 const h={schemaVersion:1,meta:{...ws.history.meta,epoch:ws.history.meta.epoch+100},heads:[],revisions:[],reviews:[]};
 for(let i=0;i<heads.length;i++){
  const source=byId.get(heads[i].revisionId);for(let n=1;n<=counts[i];n++){
   const revisionId='qa.capacity.'+kind+'.'+i+'.'+n;
   const r={kind:'revision',schemaVersion:1,revisionId,resourceKey:source.resourceKey,resourceId:source.resourceId,resourceType:source.resourceType,number:n,parentRevisionId:n===1?null:'qa.capacity.'+kind+'.'+i+'.'+(n-1),createdAt:1,source:'manual',summary:'Capacity fixture version '+n,status:'committed',contentHash:source.contentHash,snapshot:source.snapshot};
   h.revisions.push(r);if(n===counts[i])h.heads.push({kind:'head',schemaVersion:1,resourceKey:r.resourceKey,revisionId,number:n,contentHash:r.contentHash});
  }
 }
 const targetHead=h.heads[target],snapshot=structuredClone(byId.get(heads[target].revisionId).snapshot);
 snapshot.page.blocks.push({id:'qa.capacity.pending.block',type:'markdown',text:'Authored edit after verified capacity recovery'});
 const plan={schemaVersion:1,kind:'atlas-agent-changeset',id:'qa.capacity.pending',source:'Explicit QA human review',createdAt:1,operations:[{id:'qa.capacity.update',kind:'resource.update',resourceKey:key,baseRevisionId:targetHead.revisionId,payload:{resourceType:'notebook-page',snapshot}}]};
 h.reviews.push({kind:'review',schemaVersion:1,id:plan.id,status:'staged',createdAt:1,plan});
 const closed=kind==='reviews'?499:kind==='bytes'?80:1;
 for(let i=0;i<closed;i++){const id='qa.capacity.closed.'+i;h.reviews.push({kind:'review',schemaVersion:1,id,status:'rejected',createdAt:1,decidedAt:2,reason:'',plan:{schemaVersion:1,kind:'atlas-agent-changeset',id,createdAt:1,source:'Synthetic closed-review fixture',operations:[]}});}
 const length=()=>new TextEncoder().encode(JSON.stringify(h)).length;
 if(kind==='bytes'){
  let seed=73429;const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let block='';
  for(let i=0;i<32768;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;block+=chars[(seed>>>0)%chars.length];}
  let left=64*1024*1024-length();for(const row of h.reviews.slice(1)){const n=Math.min(left,1024*1024);row.reason=block.repeat(Math.ceil(n/block.length)).slice(0,n);left-=n;if(!left)break;}
  if(left||length()!==64*1024*1024)throw Error('Byte boundary fixture construction failed');
 }
 const r=indexedDB.open('knowledge-atlas');const db=await new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 const tx=db.transaction('history','readwrite'),store=tx.objectStore('history');const done=new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});
 store.clear();store.put(h.meta,'meta');for(const r of h.revisions)store.put(r,'revision:'+r.revisionId);for(const h1 of h.heads)store.put(h1,'head:'+h1.resourceKey);for(const r of h.reviews)store.put(r,'review:'+r.id);await done;db.close();
 return {kind,liveRevisions:h.revisions.length,reviews:h.reviews.length,structuredBytes:length(),targetNumber:targetHead.number,targetId:targetHead.revisionId,oldRevisionId:'qa.capacity.'+kind+'.'+target+'.1'};
}"""

SUMMARY="""async()=>{const m=await import(new URL('app/storage/workspace-snapshot.js',document.baseURI));const s=await m.readPersistedWorkspace();const sha=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(x=>x.toString(16).padStart(2,'0')).join('');return {heads:s.history.heads,reviews:s.history.reviews.length,pending:s.history.reviews.filter(r=>r.status==='staged'),count:s.history.revisions.length,bytes:new TextEncoder().encode(JSON.stringify(s.history)).length,assets:await sha(s.assets),imports:await sha(s.imports),overlays:await sha(s.overlays),personal:await sha(s.personal)};}"""
HASHES='async()=>{const state=await ('+RAW+')();const out={};for(const [key,value] of Object.entries(state)){const b=new TextEncoder().encode(JSON.stringify(value));out[key]=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",b))).map(x=>x.toString(16).padStart(2,"0")).join("");}return out;}'

def scenario(browser,context,page,base,out,passed):
    for kind in ['per-resource','total','reviews','bytes']:
        c=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True);p=c.new_page();p.set_default_timeout(60000)
        try:
            p.goto(base,wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p);seed_demo(p);flush(p)
            fixture=p.evaluate(SEED,kind)
            p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
            initial=p.evaluate(SUMMARY)
            if kind=='per-resource':assert fixture['targetNumber']==2000
            if kind=='total':assert initial['count']==25000 and fixture['targetNumber']<2000
            if kind=='reviews':assert initial['reviews']==500
            if kind=='bytes':assert initial['bytes']==64*1024*1024
            before=p.evaluate(HASHES)
            rejection=p.evaluate('async(kind)=>{const a='+AGENT+';try{if(kind==="reviews"){const plan=structuredClone(a.getReviews(0,100).items.find(r=>r.id==="qa.capacity.pending").plan);plan.id="qa.capacity.overflow";await a.stage(plan);}else await a.accept("qa.capacity.pending");return null;}catch(e){return String(e.message||e);}}',kind)
            assert rejection and ('full' in rejection.lower() or '64 MiB' in rejection or 'byte limit' in rejection),rejection
            assert p.evaluate(HASHES)==before
            # Discard only transient error reporting, not persisted data, before
            # asking the human-visible archival ceremony to free capacity.
            p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
            open_settings(p)
            section=p.locator('section[aria-label="History archival and attachments"]')
            section.get_by_text('Prepare a verified history archive',exact=True).click()
            p.get_by_label('Live versions to retain',exact=True).fill('1')
            section.locator('[data-durability-action="prepare-archive"]').click();section.locator('[data-archive-id]').wait_for(timeout=120000)
            with p.expect_download(timeout=120000) as pending:section.locator('[data-durability-action="download-archive"]').click()
            archive=out/('capacity-'+kind+'.atlas-history.zip');pending.value.save_as(str(archive))
            choose(p,'Re-select saved archive',archive)
            preview=section.locator('[data-durability-preview]');preview.wait_for(timeout=120000)
            removal=json.loads(preview.locator('pre').text_content())
            before_commit=p.evaluate(SUMMARY)
            p.get_by_label('Confirm saved archive retention',exact=True).check();section.locator('[data-durability-action="compact-archive"]').click()
            p.get_by_text(SUCCESS,exact=True).wait_for(timeout=120000)
            after=p.evaluate(SUMMARY)
            for invariant in ['heads','pending','assets','imports','overlays','personal']:assert after[invariant]==before_commit[invariant],(kind,invariant)
            assert before_commit['count']-after['count']==len(removal['revisionIds'])
            assert before_commit['reviews']-after['reviews']==len(removal['reviewIds'])
            assert after['bytes']<before_commit['bytes']
            p.reload(wait_until='networkidle');p.wait_for_selector('.atlas-app');flush(p)
            reopened=p.evaluate(SUMMARY)
            for invariant in ['heads','pending','assets','imports','overlays','count','reviews','bytes']:assert reopened[invariant]==after[invariant],(kind,invariant)
            # The existing staged proposal is preserved and still targets the
            # identical current head. Acceptance is the explicit QA human step.
            p.evaluate('async()=>{await ('+AGENT+').accept("qa.capacity.pending");}')
            p.evaluate('''async()=>{const a='''+AGENT+''';const r=a.getResource("notebook-page:demo.v23.notebook"),snapshot=structuredClone(r.snapshot);snapshot.page.blocks.push({id:"qa.capacity.fresh.block",type:"markdown",text:"A fresh authored edit also succeeds"});const plan={schemaVersion:1,kind:"atlas-agent-changeset",id:"qa.capacity.fresh",source:"Explicit QA human decision",createdAt:Date.now(),operations:[{id:"qa.capacity.fresh.op",kind:"resource.update",resourceKey:r.resourceKey,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot}}]};await a.stage(plan);await a.accept(plan.id);}''')
            flush(p);now=p.evaluate('async()=>('+AGENT+').getResource("'+KEY+'")')
            assert now['head']['number']==fixture['targetNumber']+2
            open_settings(p);choose(p,'Attach history archives',archive);p.get_by_text(ATTACHED,exact=True).wait_for()
            historical=p.evaluate('async(id)=>('+AGENT+').getResource("'+KEY+'",id)',fixture['oldRevisionId'])
            assert historical['revision']['number']==1
            section=p.locator('section[aria-label="Storage and recovery health"]')
            section.locator('[data-durability-action="integrity"]').click()
            p.get_by_text('Read-only integrity check passed. Nothing was repaired or changed.',exact=True).wait_for(timeout=120000)
            p.screenshot(path=str(out/('capacity-'+kind+'.png')),full_page=True)
            passed('Real committed capacity recovery: '+kind,fixture=fixture,afterCompaction={'liveRevisions':after['count'],'reviews':after['reviews'],'structuredBytes':after['bytes']},newHeadNumber=now['head']['number'],archiveBytes=archive.stat().st_size,allFiveStoreRollbackHashes=before)
        finally:c.close()

if __name__=='__main__':raise SystemExit(run_suite('capacity-browser',scenario))
