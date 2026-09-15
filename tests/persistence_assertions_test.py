import unittest
from copy import deepcopy
from persistence_assertions import assert_personal_after_open, assert_workspace_after_open

class ReopenAssertions(unittest.TestCase):
    def setUp(self):
        self.before = {'notes': {'page.a': 'keep'}, 'savedStates': {'entries': []}, 'activeWorkspaceSlot': 1, 'session': {'screen': 'reader', 'activePane': 'a', 'panes': [{'id': 'a', 'active': 'v', 'views': [{'id': 'v', 'cursor': 0, 'history': [{'pageId': 'page.a'}]}]}]}, 'documentVisits': [{'pageId': 'page.b', 'firstOpenedAt': 1, 'lastOpenedAt': 10}, {'pageId': 'page.a', 'firstOpenedAt': 2, 'lastOpenedAt': 9}]}
        self.after = deepcopy(self.before)
        self.after['documentVisits'] = [{'pageId': 'page.a', 'firstOpenedAt': 2, 'lastOpenedAt': 20}, self.before['documentVisits'][0]]
    def test_exact_and_only_active_visit(self):
        assert_personal_after_open(self.before, self.before)
        assert_personal_after_open(self.after, self.before)
    def test_notes_session_checkpoint_still_exact(self):
        for key in ['notes', 'session', 'savedStates']:
            wrong = deepcopy(self.after); wrong[key] = {}
            with self.assertRaises(AssertionError): assert_personal_after_open(wrong, self.before)
    def test_first_date_and_monotonic_last(self):
        for key, value in [('firstOpenedAt', 3), ('lastOpenedAt', 8), ('lastOpenedAt', float('nan'))]:
            wrong = deepcopy(self.after); wrong['documentVisits'][0][key] = value
            with self.assertRaises(AssertionError): assert_personal_after_open(wrong, self.before)
    def test_other_visit_never_ignored(self):
        for tail in [[], [{'pageId': 'page.b', 'firstOpenedAt': 1, 'lastOpenedAt': 21}], [{'pageId': 'page.c', 'firstOpenedAt': 1, 'lastOpenedAt': 10}]]:
            wrong = deepcopy(self.after); wrong['documentVisits'] = [wrong['documentVisits'][0]] + tail
            with self.assertRaises(AssertionError): assert_personal_after_open(wrong, self.before)
    def test_home_does_not_receive_visits(self):
        before = deepcopy(self.before); before['session']['screen'] = 'home'
        after = deepcopy(self.after); after['session']['screen'] = 'home'
        with self.assertRaises(AssertionError): assert_personal_after_open(after, before)
    def test_new_visit_on_legacy_data(self):
        before = deepcopy(self.before); del before['documentVisits']
        after = deepcopy(before); after['documentVisits'] = [{'pageId': 'page.a', 'firstOpenedAt': 20, 'lastOpenedAt': 20}]
        assert_personal_after_open(after, before)
    def test_overlays_never_ignored(self):
        assert_workspace_after_open({'personal': self.after, 'overlays': {}}, {'personal': self.before, 'overlays': {}})
        with self.assertRaises(AssertionError): assert_workspace_after_open({'personal': self.after, 'overlays': {'lost': True}}, {'personal': self.before, 'overlays': {}})

if __name__ == '__main__': unittest.main()
