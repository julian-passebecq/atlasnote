"""Integrated archive authorization on the non-production compaction candidate."""
from v23_browser_common import *
from v23_runtime_matrix import finish_runtime

def scenario(browser,context,page,base,out,passed):
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
    button=section.locator('[data-durability-action="compact-archive"]')
    assert button.is_disabled()
    confirmation=page.get_by_label('Confirm saved archive retention',exact=True)
    confirmation.check();assert button.is_enabled()
    confirmation.uncheck();assert button.is_disabled()
    confirmation.check();assert button.is_enabled()
    assert page.evaluate(RAW)==before
    trusted=page.evaluate('window.__qaTrustedSelections');assert len(trusted)==3 and all(trusted)
    passed('Native saved-file re-selection and explicit confirmation jointly authorize the qualified writer; neither writes by itself',trustedEvents=trusted)
    page.screenshot(path=str(out/'archive-ceremony.png'),full_page=True)
    finish_runtime(browser,context,page,base,out,passed)

if __name__=='__main__':
    raise SystemExit(run_suite('runtime',scenario))
