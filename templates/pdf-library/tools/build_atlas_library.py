#!/usr/bin/env python3
"""Build a private AtlasNote import ZIP from the PDF source-repository template.

Uses only Python stdlib. It maps richer source metadata to the existing AtlasNote
content-pack schema without requiring a new runtime database.
"""
from __future__ import annotations
import argparse, hashlib, json, re, shutil, tempfile, zipfile
from pathlib import Path
from validate_library import validate, safe_file

ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$')
MAX = 20 * 1024 * 1024


def load(p): return json.loads(p.read_text(encoding='utf-8'))
def dump(p,obj): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def slug(s):
    x=re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
    return x[:80] or 'item'

def folder_id(project_id, parts):
    raw='|'.join([project_id,*parts]).encode()
    return 'folder.'+hashlib.sha256(raw).hexdigest()[:20]

def node_id(doc_id): return 'node.'+hashlib.sha256(doc_id.encode()).hexdigest()[:20]
def page_id(doc_id): return 'page.'+hashlib.sha256(doc_id.encode()).hexdigest()[:24]

def ensure_folder(nodes, project_id, parts):
    cur=nodes
    path=[]
    for title in parts:
        path.append(title)
        fid=folder_id(project_id,path)
        found=next((n for n in cur if n.get('id')==fid),None)
        if not found:
            found={'id':fid,'title':title,'children':[]};cur.append(found)
        cur=found['children']
    return cur

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path('.'));ap.add_argument('--out',type=Path,default=Path('out/atlas-pdf-library.zip'));args=ap.parse_args()
    root=args.root.resolve();validation=validate(root);lib=load(safe_file(root,'library/library.json'))
    projects={p['id']:{**p,'nodes':[]} for p in lib['projects']}
    pages=[];documents=[];assets=[];seen_hash={};seen_id=set()
    pack_id=lib['id'];version=lib['version']
    with tempfile.TemporaryDirectory() as td:
        pack=Path(td)/'packs'/pack_id;(pack/'pages').mkdir(parents=True)
        for rel in lib['documents']:
            d=load(safe_file(root/'library',rel))
            if not ID.match(d['id']) or d['id'] in seen_id: raise SystemExit('Invalid/duplicate document id: '+d['id'])
            seen_id.add(d['id'])
            f=safe_file(root,d['file']['path'])
            if not f.exists(): raise SystemExit('Missing PDF: '+str(f))
            data=f.read_bytes()
            if not data.startswith(b'%PDF-'): raise SystemExit('Not PDF bytes: '+str(f))
            if len(data)>MAX: raise SystemExit('PDF exceeds AtlasNote 20 MiB limit: '+str(f))
            actual=hashlib.sha256(data).hexdigest()
            if actual!=d['file']['sha256'] or len(data)!=d['file']['bytes']: raise SystemExit('PDF hash/size mismatch: '+d['id'])
            if actual in seen_hash: raise SystemExit(f'Duplicate PDF bytes: {d["id"]} == {seen_hash[actual]}')
            seen_hash[actual]=d['id']
            pid=d['primaryPlacement']['projectId']
            if pid not in projects: raise SystemExit('Unknown project: '+pid)
            p_id=page_id(d['id'])
            leaf=ensure_folder(projects[pid]['nodes'],pid,d['primaryPlacement']['folderPath'])
            leaf.append({'id':node_id(d['id']),'title':d['title'],'pageId':p_id})
            tags=[f'doctype:{d["documentType"]}',f'level:{d["level"]}',f'source:{d["source"]["platform"]}']
            tags += ['domain:'+x for x in d.get('domains',[])] + ['tech:'+x for x in d.get('technologies',[])] + d.get('extraTags',[])
            sources=[]
            if d['source'].get('url'):
                sources.append({'title':d['title'],'url':d['source']['url'],'publisher':d['source'].get('publisher') or d['source'].get('author') or d['source']['platform']})
            page={'id':p_id,'title':d['title'],'summary':d.get('summary','PDF reference document.'),'blocks':[],'related':[],'terms':[],'sources':sources,'tags':sorted(set(tags)),'provenance':'atlasnote-pdf-library'}
            pages.append(page);dump(pack/'pages'/f'{p_id}.json',page)
            asset_path='assets/pdf/'+d['id']+'/'+actual+'.pdf'
            target=pack/asset_path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,target)
            assets.append({'path':asset_path,'mediaType':'application/pdf','sha256':actual,'provenance':{'kind':'pdf-library','sourcePlatform':d['source']['platform']}})
            rights={'status':d['rights']['status'],'attribution':d['rights']['attribution']}
            if d['rights'].get('sourceUrl'): rights['sourceUrl']=d['rights']['sourceUrl']
            elif d['source'].get('url'): rights['sourceUrl']=d['source']['url']
            documents.append({'id':d['id'],'pageId':p_id,'title':d['title'],'source':{'kind':'pack-file','path':asset_path},'sha256':actual,'bytes':len(data),'pageCount':d['file']['pageCount'],'visibility':'private','rights':rights,'language':d['language'],'defaultView':'continuous'})
        manifest={'format':'atlas-content-pack','schemaVersion':1,'payloadSchema':'atlas.bundle@2','id':pack_id,'version':version,'title':lib['title'],'visibility':'private','files':{'projects':'projects.json','pages':'pages','glossary':'glossary.json'},'requires':[],'assets':assets,'provenance':{'kind':'private-pdf-library'}}
        dump(pack/'atlas-pack.json',manifest);dump(pack/'projects.json',list(projects.values()));dump(pack/'glossary.json',[]);dump(pack/'atlas-documents.json',{'format':'atlas-document-index','schemaVersion':1,'packId':pack_id,'version':version,'documents':documents})
        dump(Path(td)/'workspace.json',{'format':'atlas-workspace','schemaVersion':1,'title':lib['title'],'packsDirectory':'packs','disabledPackIds':[],'groups':[]})
        out=(root/args.out).resolve();out.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
            for p in sorted(Path(td).rglob('*')):
                if p.is_file():
                    info=zipfile.ZipInfo(p.relative_to(td).as_posix(),date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,p.read_bytes())
        print(json.dumps({'output':str(out),'projects':len(projects),'documents':len(documents),'assets':len(assets),'bytes':out.stat().st_size,'warnings':validation['warnings'],'visibility':'private'},indent=2))
if __name__=='__main__': main()
