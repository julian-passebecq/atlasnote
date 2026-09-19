"""Real UI paths shared by V23 finalization tests; no production hooks."""
import hashlib
import json
from v23_browser_common import AGENT, RAW, choose, flush, persisted
from browser_support import close_panels, open_settings

SUCCESS='Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.'
ATTACHED='Exact verified archives attached for this session. They remain external files; no history or proposal was changed.'

def compact_saved(page,out,name,retain=1):
    close_panels(page);open_settings(page)
    section=page.locator('section[aria-label="History archival and attachments"]')
    section.get_by_text('Prepare a verified history archive',exact=True).click()
    page.get_by_label('Live versions to retain',exact=True).fill(str(retain))
    section.locator('[data-durability-action="prepare-archive"]').click()
    section.locator('[data-archive-id]').wait_for()
    assert section.get_by_label('Re-select saved archive',exact=True).is_disabled()
    with page.expect_download() as pending:
        section.locator('[data-durability-action="download-archive"]').click()
    target=out/(name+'.atlas-history.zip');pending.value.save_as(str(target))
    choose(page,'Re-select saved archive',target)
    preview=section.locator('[data-durability-preview]');preview.wait_for()
    removal=json.loads(preview.locator('pre').text_content())
    button=section.locator('[data-durability-action="compact-archive"]')
    assert button.is_disabled()
    before=persisted(page)
    page.get_by_label('Confirm saved archive retention',exact=True).check()
    assert button.is_enabled();button.click();page.get_by_text(SUCCESS,exact=True).wait_for()
    after=persisted(page)
    assert before['history']['heads']==after['history']['heads']
    assert before['imports']==after['imports'] and before['overlays']==after['overlays']
    assert before['personal']==after['personal']
    assert [r for r in before['history']['reviews'] if r['status']=='staged']==[r for r in after['history']['reviews'] if r['status']=='staged']
    assert {r['revisionId'] for r in before['history']['revisions']}-{r['revisionId'] for r in after['history']['revisions']}==set(removal['revisionIds'])
    assert {a['key'] for a in before['assets']}-{a['key'] for a in after['assets']}==set(removal['assetKeys'])
    close_panels(page)
    return target,removal

def compare_targets(page,old,new=None):
    summary=page.evaluate('async()=>('+AGENT+').getWorkspaceSummary()')
    slot=next(s for s in summary['slots'] if s['id']==summary['activeWorkspace'])
    assert slot['compare']
    targets=[next(t['target'] for t in p['tabs'] if t['id']==p['activeTab']) for p in slot['panes']]
    assert targets[0]['historyRevisionId']==old,targets
    assert targets[1].get('historyRevisionId')==new,targets
    return slot

def visible_historical_pdf(page,key,revision,out,name):
    """Reveal the physical reader, not a hidden semantic-diff thumbnail."""
    close_panels(page)
    page.evaluate('async(x)=>{await ('+AGENT+').compareRevisions(x.key,x.revision);}',{'key':key,'revision':revision})
    compare_targets(page,revision)
    page.locator('[data-agent-action="compare-mode"][data-compare-mode="side-by-side"]').click()
    assert compare_targets(page,revision)['compareMode']=='side-by-side'
    pane=page.locator('.document-pane').nth(0)
    controls=pane.get_by_role('button',name='Show reader controls',exact=True)
    if controls.count():controls.click()
    physical=pane.locator('.pdf-physical-pages [data-physical-page="1"][data-page-rendered="true"] canvas').first
    physical.wait_for(state='visible',timeout=30000)
    physical.scroll_into_view_if_needed()
    size=physical.bounding_box();assert size and size['width']>=100 and size['height']>=100,size
    pixels=physical.evaluate('''c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0,paper=0;for(let i=0;i<data.length;i+=4){if(data[i+3]&&Math.min(data[i],data[i+1],data[i+2])<200)ink++;if(data[i+3]&&Math.min(data[i],data[i+1],data[i+2])>240)paper++;}return {ink,paper,width:c.width,height:c.height};}''')
    assert pixels['ink']>10 and pixels['paper']>100,pixels
    historical=page.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.revision)',{'key':key,'revision':revision})
    with page.expect_download() as pending:pane.get_by_role('link',name='Download original',exact=True).click()
    original=out/(name+'.pdf');pending.value.save_as(str(original));data=original.read_bytes()
    assert hashlib.sha256(data).hexdigest()==historical['snapshot']['document']['sha256']
    assert len(data)==historical['snapshot']['document']['bytes']
    page.screenshot(path=str(out/(name+'.png')),full_page=True)
    return {'revisionId':revision,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'canvas':pixels}

def history_ui(page,key):
    close_panels(page)
    page.evaluate('async(key)=>{const a='+AGENT+';await a.openAgentSystemSurface("history",a.getResource(key).target);}',key)
    panel=page.get_by_role('dialog',name='Version History',exact=True);panel.wait_for()
    return panel

def archived_compare(page,out,passed):
    keys=['notebook-page:demo.v23.notebook','pdf:demo.v23.document']
    selections={}
    for key in keys:
        versions=page.evaluate('async(key)=>('+AGENT+').listResourceVersions(key)',key)['items']
        selections[key]=[versions[-1]['revisionId'],versions[-2]['revisionId']]
    archive,removed=compact_saved(page,out,'compare-archived',1)
    for key,(old,other) in selections.items():
        assert old in removed['revisionIds'] and other in removed['revisionIds']
        panel=history_ui(page,key)
        panel.locator('.revision-row[data-revision-id="'+old+'"] [data-agent-action="compare-select-a"]').click()
        panel.locator('[data-agent-action="compare-selected-versions"]').click()
        compare_targets(page,old)
        panel=history_ui(page,key)
        panel.locator('.revision-row[data-revision-id="'+old+'"] [data-agent-action="compare-select-a"]').click()
        panel.locator('.revision-row[data-revision-id="'+other+'"] [data-agent-action="compare-select-b"]').click()
        panel.locator('[data-agent-action="compare-selected-versions"]').click()
        compare_targets(page,old,other)
        if key.startswith('pdf:'):visible_historical_pdf(page,key,old,out,'compare-archived-original')
        historical=page.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.old)',{'key':key,'old':old})
        panel=history_ui(page,key);flush(page);before=persisted(page)
        row=panel.locator('.revision-row[data-revision-id="'+old+'"]')
        row.locator('[data-agent-action="revision-restore"]').click()
        assert persisted(page)['history']==before['history'],'Opening confirmation must not write history'
        row.locator('[data-agent-action="revision-restore-confirm"]').click()
        page.get_by_text('Historical content restored as a new version.',exact=True).wait_for()
        flush(page);after=persisted(page)
        new_head=next(h for h in after['history']['heads'] if h['resourceKey']==key)
        prior_head=next(h for h in before['history']['heads'] if h['resourceKey']==key)
        assert new_head['number']==prior_head['number']+1
        new_revision=next(r for r in after['history']['revisions'] if r['revisionId']==new_head['revisionId'])
        assert new_revision['restoredFromRevisionId']==old and new_revision['snapshot']==historical['snapshot']
        assert all(r in after['history']['revisions'] for r in before['history']['revisions'])
        assert after['history']['archives']==before['history']['archives']
        assert [h for h in after['history']['heads'] if h['resourceKey']!=key]==[h for h in before['history']['heads'] if h['resourceKey']!=key]
        passed('Archived/current, archived/archived UI comparison and confirmed restore-as-new: '+key)
    close_panels(page);page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    key=keys[0];old=selections[key][0]
    panel=history_ui(page,key);flush(page);before=page.evaluate(RAW)
    panel.locator('.revision-row[data-revision-id="'+old+'"] [data-agent-action="revision-compare"]').click()
    error=panel.get_by_role('alert');error.wait_for()
    assert 'Attach the exact archive' in error.inner_text() and 'Current content was not substituted' in error.inner_text()
    assert page.evaluate(RAW)==before
    choose(page,'Attach history archives',archive);page.get_by_text(ATTACHED,exact=True).wait_for()
    panel.locator('.revision-row[data-revision-id="'+old+'"] [data-agent-action="revision-compare"]').click();compare_targets(page,old)
    passed('Version History rejects a missing archive before any five-store change and exact reattachment restores comparison')
    second,second_removed=compact_saved(page,out,'compare-second-lineage',1)
    assert second_removed['revisionIds'] and second_removed['archiveId']!=removed['archiveId']
    page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    close_panels(page);open_settings(page)
    for filename in [archive,second]:
        choose(page,'Attach history archives',filename);page.get_by_text(ATTACHED,exact=True).wait_for()
    close_panels(page)
    for key,ids in selections.items():
        for old in ids:
            value=page.evaluate('async(x)=>('+AGENT+').getResource(x.key,x.old)',{'key':key,'old':old})
            assert value['revision']['revisionId']==old
    passed('Repeated archive lineage survives reload and independent exact attachment of both external files')
