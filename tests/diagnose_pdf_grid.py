"""Run the unchanged grid gate and expose the state at any failed assertion.
This diagnostic never changes assertions, application state, or storage behavior.
"""
import json
import runpy
import sys
from pathlib import Path

TARGET = Path(__file__).with_name('grid_124_dom.py')

def trace(frame, event, arg):
    if event == 'exception' and Path(frame.f_code.co_filename) == TARGET:
        error_type, error, _ = arg
        if issubclass(error_type, AssertionError):
            report = {'function': frame.f_code.co_name, 'line': frame.f_lineno,
                      'error': repr(error), 'locals': {}}
            for name in ('a', 'before', 'expected', 'restored'):
                if name in frame.f_locals:
                    report['locals'][name] = frame.f_locals[name]
            try:
                report['actualSession'] = frame.f_globals['session']()
                page = frame.f_globals['p']
                report['gridCount'] = page.locator('.pdf-grid').count()
                report['spreadCount'] = page.locator('.pdf-spread').count()
            except Exception as diagnostic_error:
                report['diagnosticError'] = repr(diagnostic_error)
            print('PDF_ASSERTION_DIAGNOSTIC ' + json.dumps(report, ensure_ascii=True), flush=True)
    return trace

sys.settrace(trace)
try:
    runpy.run_path(str(TARGET), run_name='__main__')
finally:
    sys.settrace(None)
