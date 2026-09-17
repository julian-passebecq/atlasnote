#!/usr/bin/env python3
"""Summarize actual 1.1 gate evidence; never infer unexecuted acceptance.
The detailed 160-row release matrix is reviewed with test/visual evidence separately.
The historical 1.0.1 generator is release-report-baseline.py.
"""
from pathlib import Path
import argparse,json
from collections import Counter
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('evidence',type=Path,nargs='?',default=Path('docs/evidence/release-1.1'))
a=p.parse_args();data=json.loads((a.evidence/'gates.json').read_text())
counts=Counter(r['status'] for r in data['gates'])
print('# Actual release gate summary\n')
print(' | '.join(f'{name}: {counts[name]}' for name in ['PASS','FAIL','BLOCKED']))
print('\n| Gate | Status | Exit | Evidence |\n|---|---|---:|---|')
for r in data['gates']:print(f"| {r['gate']} | {r['status']} | {r['exitCode']} | {r['log']} |")
print('\nA DOM harness is not IndexedDB/normal-origin certification. Syntax emit is not installed PDF engine certification.')
