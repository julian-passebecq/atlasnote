"""Shared final-finish browser operations. Public Agent + native file chooser only.

Fixture setup may use direct IndexedDB; production has no test-only write API.
"""
import json
from v23_browser_common import *

COMPACT_SUCCESS='Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.'
# Hash inside the browser so the 64 MiB capacity fixture is not sent over CDP.
DIGEST="""async()=>{
 const db=await new Promise((ok,no)=>{const r=indexedDB.open('knowledge-atlas');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 const names=Array.from(db.objectStoreNames).sort();
 const tx=db.transaction(names,'readonly');
 const done=new Promise((ok,no)=>{tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});
 const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 const rows=await Promise.all(names.map(async n=>{const st=tx.objectStore(n);const [keys,values]=await Promise.all([req(st.getAllKeys()),req(st.getAll())]);return [n,keys,values];}));
 await done;db.close();
 const stable=v=>{if(v instanceof Uint8Array)return {binary:[...v]};if(v instanceof ArrayBuffer)return {binary:[...new Uint8Array(v)]};if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;};
 const hash=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(stable(v)))))].map(n=>n.toString(16).padStart(2,'0')).join('');
 return Object.fromEntries(await Promise.all(rows.map(async([n,k,v])=>[n,{records:k.length,hash:await hash([k,v])}])));
}"""

def digest(page):
    return page.evaluate(DIGEST)

def open_archive(page):
    close_panels(page);open_settings(page)
    section=page.locator('section[aria-label="History archival and attachments"]')
    if not section.locator('[data-durability-action="prepare-archive"]').is_visible():
        section.get_by_text('Prepare a verified history archive',exact=True).click()
    return section

def prepare_archive(page,out,name,retain=1):
    section=open_archive(page)
    page.get_by_label('Live versions to retain',exact=True).fill(str(retain))
    section.locator('[data-durability-action="prepare-archive"]').click()
    section.locator('[data-archive-id]').wait_for(timeout=180000)
    field=section.get_by_label('Re-select saved archive',exact=True)
    assert field.is_disabled(), 'Download must precede re-selection'
    with page.expect_download(timeout=180000) as pending:
        section.locator('[data-durability-action="download-archive"]').click()
    file=out/(name+'.atlas-history.zip');pending.value.save_as(str(file))
    choose(page,'Re-select saved archive',file)
    preview=section.locator('[data-durability-preview]');preview.wait_for(timeout=180000)
    details=json.loads(preview.locator('pre').text_content())
    button=section.locator('[data-durability-action="compact-archive"]')
    assert button.is_disabled(), 'Native selection without confirmation is insufficient'
    page.get_by_label('Confirm saved archive retention',exact=True).check()
    assert button.is_enabled()
    return section,details,file

def compact(page,section):
    section.locator('[data-durability-action="compact-archive"]').click()
    page.get_by_text(COMPACT_SUCCESS,exact=True).wait_for(timeout=180000)
    flush(page)

def attach(page,file):
    close_panels(page);open_settings(page)
    choose(page,'Attach history archives',file)
    page.get_by_text('Exact verified archives attached for this session. They remain external files; no history or proposal was changed.',exact=True).wait_for(timeout=180000)
    close_panels(page)

def integrity(page):
    close_panels(page);open_settings(page)
    page.locator('[data-durability-action="integrity"]').click()
    page.get_by_text('Read-only integrity check passed. Nothing was repaired or changed.',exact=True).wait_for(timeout=180000)
    close_panels(page)

def plan_update(page,key,suffix=' / final-finish QA'):
    return page.evaluate('''async({key,suffix})=>{
      const a='''+AGENT+''';const r=a.getResource(key);
      const snapshot=structuredClone(r.snapshot);snapshot.page.title+=suffix;
      return {schemaVersion:1,kind:'atlas-agent-changeset',id:'qa.finish.'+crypto.randomUUID(),createdAt:Date.now(),source:'Explicit local QA user',summary:'Capacity/recovery reviewed edit',operations:[{id:'qa.edit',kind:'resource.update',resourceKey:key,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot}}]};
    }''',{'key':key,'suffix':suffix})

def reviewed_edit(page,key):
    plan=plan_update(page,key)
    page.evaluate('async(plan)=>{const a='+AGENT+';await a.stage(plan);await a.accept(plan.id);}',plan)
    flush(page)
    return plan

def current_slot(page):
    summary=page.evaluate('async()=>('+AGENT+').getWorkspaceSummary()')
    return next(s for s in summary['slots'] if s['id']==summary['activeWorkspace'])

def assert_compare(page,key,old,new=None):
    slot=current_slot(page);assert slot['compare']
    a,b=slot['panes']
    ta=next(t['target'] for t in a['tabs'] if t['id']==a['activeTab'])
    tb=next(t['target'] for t in b['tabs'] if t['id']==b['activeTab'])
    assert ta['historyRevisionId']==old,(key,ta)
    assert tb.get('historyRevisionId')==new,(key,tb)

def history_panel(page,key):
    close_panels(page)
    page.evaluate('async(key)=>{const a='+AGENT+';await a.openAgentSystemSurface("history",a.getResource(key).target);}',key)
    dialog=page.get_by_role('dialog',name='Version History',exact=True)
    dialog.wait_for()
    return dialog

def history_row(page,dialog,revision_id):
    row=dialog.locator('.revision-row[data-revision-id="'+revision_id+'"]')
    if row.count():return row
    # Selections survive page changes. Start at the newest page and use the real
    # pagination controls, including the 2,000-version capacity scenario.
    def step(button):
        first=dialog.locator('.revision-row').first.get_attribute('data-revision-id')
        button.click()
        page.wait_for_function('(old)=>document.querySelector(".history-panel .revision-row")?.getAttribute("data-revision-id")!==old',arg=first)
    newer=dialog.locator('[data-agent-action="history-newer"]')
    for _ in range(1000):
        if newer.is_disabled():break
        step(newer)
    for _ in range(1000):
        if row.count():return row
        older=dialog.locator('[data-agent-action="history-older"]')
        if older.is_disabled():break
        step(older)
    raise AssertionError('Revision is not present in History UI pagination: '+revision_id)

def compare_via_history_ui(page,key,old,new=None):
    dialog=history_panel(page,key)
    history_row(page,dialog,old).locator('[data-agent-action="compare-select-a"]').click()
    if new:
        history_row(page,dialog,new).locator('[data-agent-action="compare-select-b"]').click()
    else:
        dialog.locator('[data-agent-action="compare-current"]').click()
    dialog.locator('[data-agent-action="compare-selected-versions"]').click()
    dialog.wait_for(state='hidden')
    assert_compare(page,key,old,new)

def restore_via_history_ui(page,key,old):
    dialog=history_panel(page,key);flush(page)
    before=persisted(page)
    old_resource=page.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.rev)',{'key':key,'rev':old})
    head=next(h for h in before['history']['heads'] if h['resourceKey']==key)
    row=history_row(page,dialog,old)
    row.locator('[data-agent-action="revision-restore"]').click()
    # Opening confirmation must not mutate content/history or private bytes.
    assert persisted(page)['history']==before['history']
    row.locator('[data-agent-action="revision-restore-confirm"]').click()
    page.wait_for_function('async(x)=>('+AGENT+').getResource(x.key).head.number===x.number',arg={'key':key,'number':head['number']+1})
    flush(page);after=persisted(page)
    new_head=next(h for h in after['history']['heads'] if h['resourceKey']==key)
    revision=next(r for r in after['history']['revisions'] if r['revisionId']==new_head['revisionId'])
    assert revision['restoredFromRevisionId']==old and revision['parentRevisionId']==head['revisionId']
    assert revision['snapshot']==old_resource['snapshot']
    assert revision['contentHash']==old_resource['revision']['contentHash']
    assert new_head['revisionId'] not in {r['revisionId'] for r in before['history']['revisions']}
    remaining={r['revisionId']:r for r in after['history']['revisions']}
    assert all(remaining[r['revisionId']]==r for r in before['history']['revisions'])
    assert after['history'].get('archives',[])==before['history'].get('archives',[])
    assert after['history']['reviews']==before['history']['reviews']
    assert after['personal']==before['personal']
    close_panels(page)
    return revision

def render_historical_pdf(page,key,old,out,name):
    """Reveal actual PDF panes. Require distinct old/current text and painted pixels.

    This is deliberately specific to the shipped two-byte-version synthetic demo.
    Attached-but-hidden canvases, placeholders and metadata-only identity do not pass.
    """
    close_panels(page)
    page.evaluate('async(x)=>('+AGENT+').compareRevisions(x.key,x.rev)',{'key':key,'rev':old})
    assert_compare(page,key,old)
    pair=page.evaluate('async(x)=>{const a='+AGENT+';return [a.getResource(x.key,x.rev),a.getResource(x.key)];}',{'key':key,'rev':old})
    assert pair[0]['snapshot']['document']['sha256']!=pair[1]['snapshot']['document']['sha256']
    page.locator('[data-agent-action="compare-mode"][data-compare-mode="side-by-side"]').click()
    results=[]
    for i,variant in enumerate([1,2]):
        pane=page.locator('.document-pane').nth(i)
        engine=pane.locator('.integrated-pdf[data-pdf-state="ready"][data-worker-status="compatible"]')
        canvas=engine.locator('[data-page-rendered="true"] canvas').first
        canvas.wait_for(state='visible',timeout=30000)
        canvas.scroll_into_view_if_needed()
        pixel=canvas.evaluate("""async(c)=>{
          const box=c.getBoundingClientRect(),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let ink=0,opaque=0;for(let i=0;i<data.length;i+=4){if(data[i+3]){opaque++;if(data[i]<240||data[i+1]<240||data[i+2]<240)ink++;}}
          const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');
          return {width:c.width,height:c.height,visibleWidth:box.width,visibleHeight:box.height,ink,opaque,pixelHash:sha};
        }""")
        assert min(pixel['width'],pixel['height'],pixel['visibleWidth'],pixel['visibleHeight'])>32,pixel
        assert pixel['opaque']>100 and pixel['ink']>20,pixel
        layer=engine.locator('.react-pdf__Page__textContent').first
        layer.get_by_text('AtlasNote V2.3 synthetic PDF byte revision '+str(variant),exact=False).wait_for(timeout=30000)
        text=layer.inner_text()
        assert 'byte revision '+str(variant) in text,text
        pane.screenshot(path=str(out/(name+'-'+str(variant)+'.png')))
        results.append({'render':pixel,'visiblePdfText':text[:1000],'assetKey':pair[i]['snapshot']['document']['assetKey'],'assetHash':pair[i]['snapshot']['document']['sha256'],'pdfjsVersion':engine.get_attribute('data-pdf-engine-version')})
    assert results[0]['render']['pixelHash']!=results[1]['render']['pixelHash']
    return {'historical':results[0],'current':results[1]}
