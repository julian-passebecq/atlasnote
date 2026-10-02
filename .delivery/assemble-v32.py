"""One-use, hash-verified source delivery. No deployment or private workspace I/O.
Only the owner-authorized continuation branch may be advanced, without force.
All 34 final file bytes are checked before any tracked source is changed.
The temporary delivery workflow is replaced separately by read-only qualification.
"""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import urllib.request

REPO = 'julian-passebecq/atlasnote'
BRANCH = 'feat/atlasnote-web-continuation'
BASE = '1ebdfb045b756b5435516915879b93b836a68b6e'
OUT = Path('/tmp/atlasnote-v32-delivery')
OUT.mkdir(parents=True, exist_ok=True)
PAYLOADS = [
    ('0', '292a10585b234ece4d1fd01047e37d23c4f7eb48', '292a10585b234ece4d1fd01047e37d23c4f7eb48', True),
    ('1', '8657b7f8ea31e8b1f2e219fa0e4dfb93c5ca742b', '8657b7f8ea31e8b1f2e219fa0e4dfb93c5ca742b', False),
    ('2', 'e4c0155d78a090dbbae26129038d2f3409b25524', 'e4c0155d78a090dbbae26129038d2f3409b25524', True),
    ('3', '1d4ec9a15751c9f2c1ff15874c44afe056466d4c', '12c5e41a530ab6c5a9298905d2a5715a9bcfc38ca', True),
]
# Corrections are bounded splices in the transport, never unverified source edits.
# The resulting compressed bytes must match the independently recorded hash.
FIXES = {'3': [[136,142,''],[2033,2034,'1'],[6764,6764,'c'],[8557,8557,'3'],[9109,9110,''],[11188,11188,'=']]}
ROOTS = {'src', 'tests', 'tools', 'docs', '.github'}
WORKFLOWS = {'.github/workflows/' + n for n in ('ci.yml', 'content-navigation.yml', 'v31-regressions.yml', 'web-v32.yml')}
SELF = '.delivery/assemble-v32.py'
FINAL_WORKFLOW = '.github/workflows/web-v32.yml'

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

def blob_hash(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def fetch_blob(sha):
    assert len(sha) == 40 and all(c in '0123456789abcdef' for c in sha)
    cache = OUT / (sha + '.blob')
    if cache.exists():
        return cache.read_bytes()
    request = urllib.request.Request('https://api.github.com/repos/' + REPO + '/git/blobs/' + sha,
        headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'User-Agent': 'atlasnote-source-delivery'})
    with urllib.request.urlopen(request, timeout=30) as response:
        item = json.load(response)
    assert item.get('encoding') == 'base64' and item.get('size', 0) < 2_000_000
    raw = base64.b64decode(item['content'])
    assert blob_hash(raw) == sha, 'Transport blob hash mismatch'
    cache.write_bytes(raw)
    return raw

def allowed(path):
    p = PurePosixPath(path)
    if p.is_absolute() or '..' in p.parts or str(p) != path:
        return False
    if path.startswith('.github/'):
        return path in WORKFLOWS
    if path in {'START_HERE.md', 'package.json', 'package-lock.json'}:
        return True
    return bool(p.parts and p.parts[0] in ROOTS and path.endswith(('.ts', '.tsx', '.css', '.md', '.py', '.mjs')))

def main():
    assert os.environ.get('GITHUB_REPOSITORY') == REPO
    assert os.environ.get('GITHUB_REF') == 'refs/heads/' + BRANCH
    parent = git('rev-parse', 'HEAD')
    assert parent == os.environ['GITHUB_SHA']
    assert not git('status', '--porcelain', '--untracked-files=all'), 'Dirty initial checkout'
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, parent], check=True)
    records, errors = [], []
    for number, transport, expected, compressed in PAYLOADS:
        try:
            raw = fetch_blob(transport)
            encoded = base64.b64encode(raw).decode('ascii')
            for start, end, value in reversed(FIXES.get(number, [])):
                encoded = encoded[:start] + value + encoded[end:]
            raw = base64.b64decode(encoded, validate=True)
            assert blob_hash(raw) == expected, 'Payload hash mismatch: ' + number
            plain = gzip.decompress(raw) if compressed else raw
            assert len(plain) < 200_000
            payload = json.loads(plain)
            assert payload['format'] == 'atlasnote-source-transfer-v1' and payload['base'] == BASE
            records.extend(payload['files'])
        except Exception as exc:
            errors.append('Payload ' + number + ': ' + str(exc))
    desired = {}
    for record in records:
        path = record.get('path', '')
        try:
            assert allowed(path) and path not in desired, 'Unexpected/duplicate source path'
            current = Path(path)
            if current.exists() and blob_hash(current.read_bytes()) == record['sha']:
                value = current.read_bytes()
            elif 'blob' in record:
                value = fetch_blob(record['blob'])
            elif 'text' in record:
                value = record['text'].encode('utf-8')
            else:
                value = Path(path).read_bytes()
                assert blob_hash(value) == record['base'], 'Patch base changed: ' + path
                text = value.decode('utf-8')
                last = len(text)
                for start, end, replacement in reversed(record['splices']):
                    assert 0 <= start <= end <= last, 'Invalid patch coordinates'
                    text = text[:start] + replacement + text[end:]
                    last = start
                value = text.encode('utf-8')
            assert blob_hash(value) == record['sha'], 'Final source hash mismatch: ' + path
            desired[path] = value
            if path.startswith('.github/') and path != FINAL_WORKFLOW:
                assert Path(path).read_bytes() == value, 'Owner workflow preparation required: ' + path
        except Exception as exc:
            errors.append(path + ': ' + str(exc))
    assert len(desired) == 34 and not errors, json.dumps({'files': len(desired), 'errors': errors})
    manifest = {path: blob_hash(value) for path, value in desired.items()}
    (OUT / 'desired-files.json').write_text(json.dumps(manifest, indent=2))
    # Standard Actions tokens do not author or change workflows in this transfer.
    changed = []
    for path, value in desired.items():
        if path.startswith('.github/'):
            continue
        file = Path(path)
        if not file.exists() or file.read_bytes() != value:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(value)
            changed.append(path)
    subprocess.run(['git', 'add', '--', *changed], check=True)
    subprocess.run(['git', 'rm', '--', SELF], check=True)
    staged = set(git('diff', '--cached', '--name-only').splitlines())
    assert staged <= set(changed) | {SELF} and SELF in staged
    subprocess.run(['git', 'diff', '--cached', '--check'], check=True)
    subprocess.run(['git', '-c', 'user.name=AtlasNote Web source delivery', '-c', 'user.email=atlasnote-source-work@users.noreply.github.com',
        'commit', '-m', 'feat(web): deliver verified V3.2 Norsk, discovery, code notes and regressions [skip ci]'], check=True)
    commit = git('rev-parse', 'HEAD')
    subprocess.run(['git', 'archive', '--format=zip', '--output=' + str(OUT / 'atlasnote-v32-source.zip'), 'HEAD'], check=True)
    report = {'base': BASE, 'parent': parent, 'sourceCommit': commit, 'files': manifest,
              'workflowPending': FINAL_WORKFLOW, 'pushed': False}
    (OUT / 'delivery.json').write_text(json.dumps(report, indent=2))
    subprocess.run(['git', 'push', 'origin', 'HEAD:refs/heads/' + BRANCH], check=True)
    report['pushed'] = True
    (OUT / 'delivery.json').write_text(json.dumps(report, indent=2))
    print('Verified source pushed:', commit)

try:
    main()
except Exception as exc:
    (OUT / 'error.txt').write_text(str(exc), encoding='utf-8')
    raise
