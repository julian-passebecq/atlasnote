"""One-time, hash-verified transfer from the retained AtlasNote 1.2.1 workspace."""
from pathlib import Path
import base64, hashlib, json, lzma, subprocess
root=Path.cwd().resolve()
parts=sorted((root/'.atlasnote-integration').glob('part-*.b64'))
assert len(parts)==8, 'Missing transfer chunk'
packed=base64.b64decode(''.join(p.read_text() for p in parts),validate=True)
assert hashlib.sha256(packed).hexdigest()=='32008b2bfd7ed8301f0c2365975c209d299ad45d8848d44c064fb58c4d3a5a30','Transfer SHA-256 mismatch'
records=json.loads(lzma.decompress(packed))
assert len(records)==67
writes=[]
for r in records:
    dest=(root/r['path']).resolve()
    assert dest.is_relative_to(root) and '.git' not in dest.relative_to(root).parts
    old=dest.read_bytes() if dest.exists() else b''
    assert (hashlib.sha256(old).hexdigest() if old else None)==r['before'], 'Baseline differs: '+r['path']
    lines=old.decode().splitlines(keepends=True)
    for i,j,text in reversed(r['edits']): lines[i:j]=[text]
    new=''.join(lines).encode()
    assert hashlib.sha256(new).hexdigest()==r['after'], 'Result differs: '+r['path']
    writes.append((dest,new))
for dest,new in writes:
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(new)
# The coordinating connector, not GITHUB_TOKEN, will commit the two workflows.
paths=[r['path'] for r in records if not r['path'].startswith('.github/workflows/')]
(root/'.atlasnote-integration/source-paths.json').write_text(json.dumps(paths))
print('Verified and materialized all 67 exact workspace files; no private PDF bytes included.')
