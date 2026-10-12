"""QCM removal/scoring/history on the exact integrated build and real IndexedDB.

All writes use visible UI in disposable Chromium profiles. Attempted questions
and exact references retain the existing removal guards; no attempt is rewritten.
This targeted regression is not the full inherited release qualification.
"""
import json
from playwright.sync_api import expect
from browser_support import close_panels, choose_library_resource, open_settings, bookmark_position
from v23_browser_common import AGENT, run_suite, persisted, flush


def body(browser, context, page, base, out, passed):
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    source = {
        'schemaVersion': 1, 'id': 'qcm.mission.lifecycle',
        'title': 'Original QCM removal regression',
        'questions': [
            {'id': 'q' + str(n), 'prompt': 'Original question ' + str(n),
             'options': [{'id': 'a', 'text': 'Correct original option'},
                         {'id': 'b', 'text': 'Incorrect original option'}],
             'correctOptionIds': ['a'], 'explanation': 'Synthetic acceptance fixture.'}
            for n in range(1, 4)
        ]
    }
    key = 'qcm:' + source['id']

    def click(name):
        page.get_by_role('button', name=name, exact=True).last.click()

    def saved():
        flush(page)
        return persisted(page)

    def resource(revision=None):
        return page.evaluate('async([key,revision])=>(' + AGENT + ').getResource(key,revision??undefined)', [key, revision])

    def edit():
        close_panels(page)
        click('QCM content')
        choose_library_resource(page, source['id'])
        click('Edit / details')

    click('QCM content')
    click('New/import QCM')
    page.get_by_label('Content JSON file', exact=True).set_input_files({
        'name': 'qcm-original.json', 'mimeType': 'application/json',
        'buffer': json.dumps(source).encode()
    })
    click('Import local content')
    expect(page.locator('.qcm-reader')).to_be_visible()
    original = resource()
    assert original['snapshot']['page']['qcm'] == source
    original_revision = original['head']['revisionId']
    page.locator('.qcm-options input[value=a]').check()
    click('Check answer')
    page.get_by_label('Question reflection', exact=True).fill('Retain the original attempt and reflection.')
    attempt_state = saved()['personal']
    assert len(attempt_state['qcmAttempts']) == 1
    assert attempt_state['qcmAttempts'][0]['correct']
    assert attempt_state['qcmAttempts'][0]['attemptNumber'] == 1
    assert resource()['head']['revisionId'] == original_revision
    passed('UI import and scoring preserve authored history', attempts=1, questions=3)

    edit()
    click('Remove question 3')
    click('Save content')
    expect(page.locator('dialog[open]')).to_have_count(0)
    current = resource()
    assert [q['id'] for q in current['snapshot']['page']['qcm']['questions']] == ['q1', 'q2']
    assert current['head']['revisionId'] != original_revision
    assert resource(original_revision)['snapshot']['page']['qcm'] == source
    state = saved()
    assert state['personal']['qcmAttempts'] == attempt_state['qcmAttempts']
    assert state['personal']['qcmResponses'] == attempt_state['qcmResponses']
    passed('Unused question removal appends a revision and preserves attempts and original source', questions=2)

    edit()
    click('Remove question 1')
    before = saved()
    click('Save content')
    expect(page.locator('dialog[open] [role=alert]')).to_contain_text('attempt history cannot be removed')
    after = saved()
    for field in ['overlays', 'history']:
        assert after[field] == before[field], field
    for field in ['qcmAttempts', 'qcmResponses']:
        assert after['personal'][field] == before['personal'][field], field
    expect(page.get_by_role('button', name='Remove question 1', exact=True)).to_be_disabled()
    page.screenshot(path=str(out / 'attempted-question-removal-blocked.png'))
    click('Cancel')
    click('Read resource')
    passed('Attempted question removal fails atomically; final-question control remains disabled')

    page.get_by_label('Current QCM question', exact=True).select_option('q2')
    bookmark_position(page)
    bookmarked = saved()['personal']['bookmarks']
    assert any(b.get('target', {}).get('questionId') == 'q2' for b in bookmarked)
    edit()
    click('Remove question 2')
    before = saved()
    click('Save content')
    expect(page.locator('dialog[open] [role=alert]')).to_contain_text('exact reference')
    after = saved()
    assert after['overlays'] == before['overlays']
    assert after['history'] == before['history']
    assert after['personal']['bookmarks'] == bookmarked
    click('Cancel')
    click('Read resource')
    passed('An exact question bookmark blocks removal without changing source or history')

    page.reload(wait_until='networkidle')
    expect(page.locator('.qcm-reader')).to_be_visible()
    reopened = saved()
    assert reopened['overlays'] == state['overlays']
    assert reopened['personal']['qcmAttempts'] == attempt_state['qcmAttempts']
    assert reopened['personal']['qcmResponses'] == attempt_state['qcmResponses']
    assert reopened['personal']['bookmarks'] == bookmarked
    assert resource(original_revision)['snapshot']['page']['qcm'] == source
    passed('Removed question and retained attempt persist after reload')

    open_settings(page)
    with page.expect_download() as download:
        click('Download workspace backup')
    backup = out / 'qcm-lifecycle.atlas-backup.zip'
    download.value.save_as(str(backup))
    expected = saved()
    restored_context = browser.new_context(viewport={'width':1440, 'height':900}, accept_downloads=True)
    restored = restored_context.new_page()
    restored.on('pageerror', lambda error: errors.append(str(error)))
    restored.goto(base, wait_until='networkidle')
    open_settings(restored)
    restored.get_by_label('Restore workspace backup', exact=True).set_input_files(str(backup))
    restored.get_by_role('checkbox', name='I understand that this replaces the current local workspace.', exact=True).check()
    restored.get_by_role('button', name='Restore verified backup', exact=True).click()
    expect(restored.locator('dialog[open]')).to_have_count(0)
    restored.reload(wait_until='networkidle')
    flush(restored)
    actual = persisted(restored)
    assert actual['overlays'] == expected['overlays']
    for field in ['qcmAttempts', 'qcmResponses', 'bookmarks']:
        assert actual['personal'][field] == expected['personal'][field], field
    historical = restored.evaluate('async([key,id])=>(' + AGENT + ').getResource(key,id)', [key, original_revision])
    assert historical['snapshot']['page']['qcm'] == source
    restored.screenshot(path=str(out / 'restored-qcm.png'))
    restored_context.close()
    assert not errors, errors
    passed('Fresh-profile verified backup restore retains original revision, current set, attempts and reflections', uncaughtErrors=0)


if __name__ == '__main__':
    raise SystemExit(run_suite('qcm-lifecycle', body))
