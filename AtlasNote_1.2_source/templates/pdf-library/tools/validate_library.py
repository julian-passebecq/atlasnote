#!/usr/bin/env python3
"""Validate the private source repository using stdlib only. No network or publish.
The browser's readWorkspace remains the final schema and import-conflict gate.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.parse import urlsplit
MAX = 20 * 1024 * 1024
ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$')
VERSION = re.compile(r'^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$')
FACET = re.compile(r'^[a-z0-9][a-z0-9-]{0,79}$')
KNOWN_RIGHTS = {'author-created', 'permission', 'reference-only', 'unreviewed'}
KNOWN_DOCTYPES = {'cheatsheet','guide','reference','slides','article','whitepaper','certification','diagram','other'}
KNOWN_LEVELS = {'overview','fundamentals','intermediate','advanced','reference'}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def safe_file(root: Path, rel: str) -> Path:
    require(isinstance(rel, str) and 0 < len(rel) <= 500, 'Invalid relative file path')
    parts = rel.split('/')
    require(not PurePosixPath(rel).is_absolute() and '\\' not in rel and ':' not in rel and not any(p in {'', '.', '..'} for p in parts), 'Unsafe relative path: '+rel)
    f = root.joinpath(*parts)
    require(f.resolve().is_relative_to(root.resolve()), 'Path escapes repository')
    for p in [f, *f.parents]:
        if p == root: break
        require(not p.is_symlink(), 'Symlinks are not accepted in source assets')
    require(f.is_file(), 'Missing file: '+rel)
    return f


def load(path):
    require(path.stat().st_size <= 1048576, 'Metadata JSON exceeds 1 MiB')
    return json.loads(path.read_text(encoding='utf-8'))


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1048576), b''): h.update(chunk)
    return h.hexdigest()


def valid_url(url):
    p = urlsplit(url)
    return p.scheme == 'https' and bool(p.hostname) and not p.username and not p.password and len(url) <= 2048


def validate(root: Path) -> dict:
    root = root.resolve()
    lib = load(safe_file(root, 'library/library.json'))
    require(lib.get('schemaVersion') == 1 and lib.get('visibility') == 'private', 'Library must be schema 1 and explicitly private')
    require(ID.fullmatch(lib.get('id', '')) and VERSION.fullmatch(lib.get('version', '')), 'Invalid pack ID or semantic version')
    require(isinstance(lib.get('title'), str) and 0 < len(lib['title']) <= 240, 'Invalid library title')
    projects = lib.get('projects', []); require(isinstance(projects,list) and 0 < len(projects) <= 200, 'Expected 1..200 projects')
    project_ids = set()
    for p in projects:
        require(ID.fullmatch(p.get('id','')) and p['id'] not in project_ids, 'Invalid/duplicate project ID')
        require(isinstance(p.get('title'),str) and 0 < len(p['title']) <= 200, 'Invalid project title')
        project_ids.add(p['id'])
    refs = lib.get('documents',[])
    require(isinstance(refs,list) and len(refs) <= 5000 and len(set(refs)) == len(refs), 'Invalid/duplicate document sidecar references')
    seen_ids, seen_hashes, rows, warnings = set(), {}, [], []
    for rel in refs:
        d = load(safe_file(root/'library', rel))
        did = d.get('id','')
        require(d.get('schemaVersion') == 1 and ID.fullmatch(did) and did not in seen_ids, 'Invalid/duplicate document ID: '+did)
        seen_ids.add(did)
        require(isinstance(d.get('title'),str) and 0 < len(d['title']) <= 240, 'Invalid title: '+did)
        require(re.fullmatch(r'[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*|unknown|multi', d.get('language','')), 'Invalid language: '+did)
        require(d.get('documentType') in KNOWN_DOCTYPES and d.get('level') in KNOWN_LEVELS, 'Unknown document type or level: '+did)
        for field in ['domains','technologies']:
            require(isinstance(d.get(field, []), list) and len(d.get(field, [])) <= 40 and all(isinstance(x,str) and FACET.fullmatch(x) for x in d.get(field, [])), 'Invalid facet '+field+': '+did)
        require(all(isinstance(x,str) and 0 < len(x) <= 120 for x in d.get('extraTags',[])), 'Invalid extra tags')
        rights = d.get('rights',{}); source = d.get('source',{})
        require(rights.get('status') in KNOWN_RIGHTS, 'Unknown rights status: '+did)
        require(isinstance(rights.get('attribution'),str) and 0 < len(rights['attribution']) <= 4000, 'Attribution is required: '+did)
        require(FACET.fullmatch(source.get('platform','')), 'Invalid source platform: '+did)
        for url in [source.get('url'),rights.get('sourceUrl')]:
            if url: require(valid_url(url), 'Source URL must use HTTPS without credentials')
        place = d.get('primaryPlacement',{}); pid = place.get('projectId')
        require(pid in project_ids, 'Unknown project: '+did)
        folders = place.get('folderPath')
        require(isinstance(folders,list) and len(folders) <= 16 and all(isinstance(x,str) and 0 < len(x.strip()) <= 200 for x in folders), 'Invalid folder path: '+did)
        file = d.get('file',{}); f = safe_file(root, file.get('path'))
        size = f.stat().st_size
        require(size <= MAX, 'PDF exceeds AtlasNote 20 MiB limit: '+did)
        with f.open('rb') as fh: require(fh.read(8).startswith(b'%PDF-'), 'Not PDF bytes: '+did)
        digest = sha(f)
        require(digest == file.get('sha256') and type(file.get('bytes')) is int and size == file['bytes'], 'PDF hash/size mismatch: '+did)
        require(type(file.get('pageCount')) is int and 0 < file['pageCount'] <= 100000, 'Known physical page count required: '+did)
        require(digest not in seen_hashes, 'Duplicate PDF bytes: '+did+' == '+str(seen_hashes.get(digest)))
        seen_hashes[digest] = did
        if source['platform'] == 'linkedin' and rights['status'] in {'permission','author-created'}:
            warnings.append('Review explicit redistribution-rights evidence for '+did+'; this tool does not infer permission')
        if size > 12*1024*1024: warnings.append('Prepared PDF exceeds 12 MiB target: '+did)
        rows.append({'id':did,'bytes':size,'sha256':digest,'project':pid,'language':d['language']})
    return {'ok':True,'documents':len(rows),'visibility':'private','rows':rows,'warnings':warnings}


def main():
    try:
        print(json.dumps(validate(Path(sys.argv[1] if len(sys.argv)>1 else '.')),indent=2)); return 0
    except Exception as exc:
        print(json.dumps({'ok':False,'error':str(exc)},indent=2)); return 1
if __name__=='__main__': raise SystemExit(main())
