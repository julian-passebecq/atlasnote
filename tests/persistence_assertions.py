"""Exact persistence comparison, allowing only the active-document visit on reopen.

A real app mount legitimately updates lastOpenedAt in 1.2.5. No other personal
field, old visit, overlay, checkpoint, note, reading list or session is ignored.
Backup payload and canonical-vs-IndexedDB assertions must still use exact ==.
"""
import math


def active_document(personal):
    slot = personal.get('activeWorkspaceSlot', 1)
    session = personal.get('session', {}) if slot == 1 else personal.get('workspaceSlots', {}).get(str(slot), {})
    if session.get('screen') != 'reader':
        return None
    pane = next((p for p in session.get('panes', []) if p['id'] == session.get('activePane')), None)
    if not pane:
        return None
    view = next((v for v in pane.get('views', []) if v['id'] == pane.get('active')), None)
    return view['history'][view['cursor']]['pageId'] if view and view.get('history') else None


def assert_personal_after_open(actual, expected):
    if actual == expected:
        return
    assert {k: v for k, v in actual.items() if k != 'documentVisits'} == {k: v for k, v in expected.items() if k != 'documentVisits'}, 'Personal fields other than the reopen visit changed'
    page_id = active_document(expected)
    assert page_id, 'No active reader document may receive a reopen visit'
    visits = actual.get('documentVisits', [])
    assert visits and visits[0]['pageId'] == page_id, 'Only the active document may move to the first visit'
    current = visits[0]
    assert set(current) == {'pageId', 'firstOpenedAt', 'lastOpenedAt'}, 'Unexpected visit fields'
    for key in ['firstOpenedAt', 'lastOpenedAt']:
        assert type(current[key]) in (int, float) and math.isfinite(current[key]) and current[key] >= 0, 'Invalid visit timestamp'
    old = next((v for v in expected.get('documentVisits', []) if v['pageId'] == page_id), None)
    if old:
        assert current['firstOpenedAt'] == old['firstOpenedAt'], 'First-opened history was changed'
        assert current['lastOpenedAt'] >= old['lastOpenedAt'], 'Last-opened history moved backwards'
    else:
        assert current['firstOpenedAt'] == current['lastOpenedAt'], 'New visit dates differ'
    assert current['lastOpenedAt'] >= current['firstOpenedAt'], 'Invalid visit chronology'
    expected_tail = [v for v in expected.get('documentVisits', []) if v['pageId'] != page_id][:49]
    assert visits[1:] == expected_tail, 'An unrelated visit was changed, added, reordered or lost'


def assert_workspace_after_open(actual, expected):
    assert {k: v for k, v in actual.items() if k != 'personal'} == {k: v for k, v in expected.items() if k != 'personal'}, 'Non-personal workspace fields changed'
    assert_personal_after_open(actual['personal'], expected['personal'])
