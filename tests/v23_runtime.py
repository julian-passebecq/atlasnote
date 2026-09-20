"""Integrated archive authorization, migration and read-only integrity proof."""
from v23_browser_common import *
from v23_runtime_matrix import storage_matrix, migration_matrix, corruption_matrix

def native_quota():
    """Execute a fresh native proof, directly on Linux or through the retained WSL path."""
    distro=os.environ.get('ATLAS_V23_QUOTA_WSL')
    native=os.environ.get('ATLAS_V23_NATIVE_QUOTA')=='1'
    if not distro and not native:
        return {'status':'BLOCKED','reason':'Native capacity requires ATLAS_V23_NATIVE_QUOTA=1 on Linux, or the explicit WSL runner. Portable proof is not native proof.'}
    out=Path(os.environ.get('ATLAS_EVIDENCE','docs/evidence/v23/runtime')).resolve()/'native-quota'
    out.mkdir(parents=True,exist_ok=True)
    if distro:
        if os.name!='nt':raise RuntimeError('ATLAS_V23_QUOTA_WSL requires the Windows WSL runner')
        runner=os.environ.get('ATLAS_V23_QUOTA_PYTHON')
        if not runner:raise RuntimeError('Set ATLAS_V23_QUOTA_PYTHON to the Linux Playwright Python executable')
        def linux(p):
            p=Path(p).resolve();return '/mnt/'+p.drive[0].lower()+p.as_posix()[2:]
        command=['wsl','-d',distro,'-u','root','--',runner,linux(Path(__file__).with_name('v23_native_quota.py')),linux(out)]
    else:
        import sys
        if not sys.platform.startswith('linux'):return {'status':'BLOCKED','reason':'Native tmpfs proof needs Linux.'}
        command=[sys.executable,str(Path(__file__).with_name('v23_native_quota.py')),str(out)]
    child=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',timeout=180)
    (out/'command.log').write_text(child.stdout,encoding='utf-8')
    report_file=out/'probe.json'
    if not report_file.exists():return {'status':'FAIL','reason':'Native proof produced no fresh report.'}
    result=json.loads(report_file.read_text())
    assert result['sourceCommit']==subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    if child.returncode==0:assert result['status']=='PASS'
    elif child.returncode==2:assert result['status']=='BLOCKED'
    else:result['status']='FAIL'
    return result

def scenario(browser,context,page,base,out,passed):
    if '--portable' not in __import__('sys').argv:
        proof=native_quota()
        passed('Actual quota failure after optimistic preflight in a real transaction',status=proof['status'],mechanism=proof.get('mechanism'),reason=proof.get('reason'),evidence='native-quota/probe.json')
    storage_matrix(browser,base,passed)
    migration_matrix(browser,base,passed)
    corruption_matrix(browser,base,passed)
    raw=page.evaluate(RAW);assert sorted(raw)==STORES
    state=persisted(page)
    assert not any('demo.v23' in h['resourceKey'] for h in state['history']['heads'])
    passed('Fresh normal-origin exactly five stores; no automatic demo corpus')
    seed_demo(page);page.reload(wait_until='networkidle');page.wait_for_selector('.atlas-app');flush(page)
    heads={h['resourceKey']:h['number'] for h in persisted(page)['history']['heads'] if ':demo.v23' in h['resourceKey']}
    assert heads['notebook-page:demo.v23.notebook']==8
    passed('Opt-in demo persists across actual reload',heads=heads)
    open_settings(page)
    section=page.locator('section[aria-label="History archival and attachments"]')
    section.get_by_text('Prepare a verified history archive',exact=True).click()
    page.evaluate("window.__qaTrustedSelections=[];document.addEventListener('change',e=>{if(e.target.getAttribute('aria-label')==='Re-select saved archive')window.__qaTrustedSelections.push(e.isTrusted);},true)")
    def prepare(retain,name):
        page.get_by_label('Live versions to retain',exact=True).fill(str(retain))
        section.locator('[data-durability-action="prepare-archive"]').click()
        section.locator('[data-archive-id]').wait_for()
        assert section.get_by_label('Re-select saved archive',exact=True).is_disabled()
        with page.expect_download() as pending:section.locator('[data-durability-action="download-archive"]').click()
        target=out/name;pending.value.save_as(str(target))
        return target
    older=prepare(2,'saved-retain-2.atlas-history.zip')
    correct=prepare(3,'saved-retain-3.atlas-history.zip')
    flush(page);before=page.evaluate(RAW)
    choose(page,'Re-select saved archive',older)
    section.get_by_role('alert').wait_for();assert section.locator('[data-durability-preview]').count()==0
    assert page.evaluate(RAW)==before
    passed('Different actually saved archive rejected with all five stores unchanged')
    altered=out/'altered-saved-file.zip';b=bytearray(correct.read_bytes());b[-1]^=1;altered.write_bytes(b)
    choose(page,'Re-select saved archive',altered)
    section.get_by_role('alert').wait_for();assert section.locator('[data-durability-preview]').count()==0
    assert page.evaluate(RAW)==before
    passed('One-byte alteration rejected with all five stores and asset bytes unchanged')
    choose(page,'Re-select saved archive',correct)
    section.locator('[data-durability-preview]').wait_for()
    confirm=page.get_by_label('Confirm saved archive retention',exact=True)
    commit=section.locator('[data-durability-action="compact-archive"]')
    assert commit.is_disabled(), 'Saved bytes alone must not authorize deletion'
    confirm.check();assert commit.is_enabled()
    confirm.uncheck();assert commit.is_disabled()
    confirm.check();assert commit.is_enabled()
    assert page.evaluate(RAW)==before
    trusted=page.evaluate('window.__qaTrustedSelections');assert len(trusted)==3 and all(trusted)
    passed('Only native exact saved-file re-selection AND explicit confirmation authorize the qualification writer',trustedEvents=trusted)
    page.screenshot(path=str(out/'archive-ceremony.png'),full_page=True)

if __name__=='__main__':
    import sys
    # Portable scope is deliberately distinct and cannot satisfy the full release gate.
    raise SystemExit(run_suite('runtime-portable' if '--portable' in sys.argv else 'runtime',scenario))
