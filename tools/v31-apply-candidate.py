"""Apply explicit source text edits after checking every before/after hash.
One-use installer for owner-requested V3.1 code; no network or data migration.
"""
from pathlib import Path
import hashlib,json
root=Path.cwd().resolve()
parts=sorted((root/'docs/v31').glob('candidate-edits-*.json'))
assert len(parts)==4,'Expected four source edit manifests'
rows=[]
for part in parts:
    manifest=json.loads(part.read_text())
    assert manifest['schema']==1
    rows.extend(manifest['files'])
assert len({row['path'] for row in rows})==len(rows),'Duplicate target path'
prepared=[]
for row in rows:
    name=row['path'];p=root/name
    assert not Path(name).is_absolute() and '..' not in Path(name).parts
    assert name.startswith(('src/','tests/','tools/','docs/v31/')) or name in ('package.json','package-lock.json','index.html','.github/workflows/v31-regressions.yml')
    assert not p.is_symlink()
    old=p.read_bytes() if p.exists() else b''
    before=hashlib.sha256(old).hexdigest() if p.exists() else None
    assert before==row['before'],f'Unexpected base file: {name}'
    text=old.decode('utf-8');previous=len(text)+1
    for start,delete,insert in reversed(row['edits']):
        assert 0<=start<=len(text) and 0<=delete and start+delete<previous
        previous=start+1;text=text[:start]+insert+text[start+delete:]
    data=text.encode('utf-8');assert hashlib.sha256(data).hexdigest()==row['after'],f'Wrong result: {name}'
    prepared.append((p,data))
for p,data in prepared:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
print(f'Applied {len(prepared)} exact source files; all hashes match.')
