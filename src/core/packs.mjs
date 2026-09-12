import {validateSchema,validateRelations,migratePage,stable,sha256,safePath,assertSafeAsset,compareVersion,walkBlocks} from './validation.mjs';
export async function loadSchemas(read){const specs={v1:'bundle-v1',v2:'bundle-v2',manifest:'pack-v2-compatible',workspace:'workspace-v1',documents:'documents'};return Object.fromEntries(await Promise.all(Object.entries(specs).map(async([k,n])=>[k,JSON.parse(await read(n+'.schema.json'))])));}
export async function readWorkspace(files,schemas,{publicOnly=false,reviewed={},allowUnresolved=false}={}){
 const paths=[...files.keys()].sort();for(const p of paths)safePath(p);
 const roots=paths.filter(p=>/(^|\/)workspace\.json$/.test(p));if(roots.length!==1)throw Error('Expected exactly one workspace.json. This is not an Atlas pack workspace.');
 const wsPath=roots[0],prefix=wsPath.slice(0,-'workspace.json'.length),read=(p)=>{const f=files.get(prefix+p);if(!f)throw Error('Missing file: '+p);try{return JSON.parse(new TextDecoder().decode(f));}catch(e){throw Error('Invalid JSON '+p+': '+e.message);}};
 const workspace=read('workspace.json');validateSchema(workspace,schemas.workspace,'workspace');safePath(workspace.packsDirectory);
 const manifests=paths.filter(p=>p.startsWith(prefix+workspace.packsDirectory+'/')&&p.endsWith('/atlas-pack.json')).sort();if(!manifests.length)throw Error('No pack manifests found');
 const packs=[],assets=[],manifestIds=new Set(),migratedIds=new Map();
 for(const path of manifests){const relative=path.slice(prefix.length),dir=relative.slice(0,-'atlas-pack.json'.length),manifest=read(relative);validateSchema(manifest,schemas.manifest,'manifest');if(manifestIds.has(manifest.id))throw Error('Duplicate pack ID '+manifest.id);manifestIds.add(manifest.id);
 if(workspace.disabledPackIds.includes(manifest.id))continue;
 if(publicOnly&&(manifest.visibility!=='public'||!reviewed[manifest.id]))throw Error('Publication denied: '+manifest.id+' has no explicit public review entry.');
 for(const file of Object.values(manifest.files))safePath(file);
 const projects=read(dir+manifest.files.projects),glossary=read(dir+manifest.files.glossary);
 const pagePaths=paths.filter(p=>p.startsWith(prefix+dir+manifest.files.pages+'/')&&p.endsWith('.json')).sort();const pages=pagePaths.map(p=>read(p.slice(prefix.length)));
 const schema=manifest.payloadSchema==='atlas.bundle@1'?schemas.v1:schemas.v2;
 validateSchema({schemaVersion:manifest.payloadSchema==='atlas.bundle@1'?1:2,title:manifest.title,groups:[],projects,pages,glossary},schema,manifest.id);
 for(const page of pages)walkBlocks(page.blocks,b=>{if(b.type==='markdown_file'){safePath(b.path);if(!b.path.endsWith('.md'))throw Error('Markdown file must end in .md');const bytes=files.get(prefix+dir+b.path);if(!bytes||bytes.length>1000000)throw Error('Missing/oversized Markdown source '+b.path);b.type='markdown';b.text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);delete b.path;}});
 const migration=[];if(manifest.payloadSchema==='atlas.bundle@1'){
  for(let i=0;i<pages.length;i++){const m=await migratePage(pages[i]);pages[i]=m.page;migration.push(...m.assignments);}
  const old=manifest.version,parts=old.split('.').map(Number);manifest.version=`${parts[0]}.${parts[1]+1}.0`;manifest.payloadSchema='atlas.bundle@2';migratedIds.set(manifest.id,{old,version:manifest.version});
 }else if(files.has(prefix+dir+'block-migration.json'))migration.push(...(read(dir+'block-migration.json').assignments??[]));
 const assetKeys=[];
 for(const asset of manifest.assets){safePath(asset.path);const bytes=files.get(prefix+dir+asset.path);if(!bytes)throw Error('Missing asset '+asset.path);assertSafeAsset(asset.path,bytes,asset.mediaType);if(await sha256(bytes)!==asset.sha256)throw Error('Hash mismatch '+asset.path);const key=manifest.id+'@'+manifest.version+'/'+asset.path;assets.push({key,bytes,mediaType:asset.mediaType,sha256:asset.sha256});assetKeys.push(key);}
 let documents=[];if(files.has(prefix+dir+'atlas-documents.json')){const index=read(dir+'atlas-documents.json');validateSchema(index,schemas.documents,'documents');if(index.packId!==manifest.id)throw Error('Document index owner mismatch');documents=index.documents.map(d=>({...d,packId:manifest.id,assetKey:d.source.kind==='pack-file'?manifest.id+'@'+manifest.version+'/'+d.source.path:undefined}));
  for(const d of documents){if(publicOnly&&(d.visibility!=='public'||!['author-created','permission'].includes(d.rights.status)))throw Error('Unreviewed PDF in public build');if(d.source.kind==='pack-file'){safePath(d.source.path);const asset=assets.find(a=>a.key===d.assetKey);if(!asset||asset.sha256!==d.sha256||asset.bytes.length!==d.bytes)throw Error('PDF bytes/hash mismatch: '+d.id);}}
 }
 const pack={manifest,projects,pages,glossary,documents,migration,assetKeys,hash:''};packs.push(pack);
 }
 for(const pack of packs){pack.manifest.requires=pack.manifest.requires.map(d=>migratedIds.has(d.id)?{...d,version:migratedIds.get(d.id).version}:d);pack.hash=await sha256(stable({manifest:pack.manifest,projects:pack.projects,pages:pack.pages,glossary:pack.glossary,documents:pack.documents}));if(publicOnly&&reviewed[pack.manifest.id].sha256&&reviewed[pack.manifest.id].sha256!==pack.hash)throw Error('Review hash is stale: '+pack.manifest.id);}
 const validation=validateRelations(packs,{allowUnresolved});return {workspace,packs,assets,validation};
}
export function selectPacks(built,imported){const result=new Map(built.map(p=>[p.manifest.id,p])),warnings=[];
 for(const p of imported){const b=result.get(p.manifest.id);if(!b){result.set(p.manifest.id,p);continue;}const cmp=compareVersion(p.manifest.version,b.manifest.version);if(cmp>0)result.set(p.manifest.id,p);else if(cmp===0&&p.hash!==b.hash)warnings.push('Conflicting revision '+p.manifest.id+' '+p.manifest.version+': current build is shown; imported revision retained for recovery.');}
 return {packs:[...result.values()],warnings};
}
export function planImport(active,incoming,overlays){const conflicts=[],added=[],changed=[],unchanged=[],moves=[],retained=[];const map=new Map(active.map(p=>[p.manifest.id,p]));
 for(const p of incoming){const localIds=new Set([...Object.entries(overlays.pages).filter(([id,e])=>!e.baseHash&&!active.some(a=>a.pages.some(x=>x.id===id))).map(([id])=>id),...overlays.projects.map(x=>x.id)]);for(const entity of [...p.pages,...p.projects,...p.glossary])if(localIds.has(entity.id))conflicts.push('Incoming ID conflicts with a retained local addition: '+entity.id);const old=map.get(p.manifest.id);if(!old){added.push(p.manifest.id);map.set(p.manifest.id,p);continue;}if(old.hash===p.hash){unchanged.push(p.manifest.id);continue;}const cmp=compareVersion(p.manifest.version,old.manifest.version);if(cmp<=0){conflicts.push(`${p.manifest.id}: ${cmp===0?'same version, different bytes':'older revision'} (${p.manifest.version}). Export/review and bump the pack version; no last-write-wins.`);continue;}
 const incomingIds=new Set(p.pages.map(x=>x.id));const absent=old.pages.filter(x=>!incomingIds.has(x.id));if(absent.length){conflicts.push(`${p.manifest.id}: ${absent.length} missing page IDs are not deletion instructions.`);retained.push(...absent.map(x=>x.id));continue;}
 if(old.projects.some(x=>!p.projects.some(n=>n.id===x.id))){conflicts.push(p.manifest.id+': omitted project IDs require explicit migration');continue;}const oldTermIds=new Set(p.glossary.map(x=>x.id));if(old.glossary.some(x=>!oldTermIds.has(x.id))){conflicts.push(p.manifest.id+': omitted glossary IDs require explicit migration');continue;}
 const before=placements(old.projects),after=placements(p.projects);for(const [id,path]of Object.entries(after))if(before[id]&&before[id]!==path)moves.push({id,from:before[id],to:path});
 for(const id of Object.keys(overlays.pages)){if(old.pages.some(x=>x.id===id)&&p.pages.some(x=>x.id===id&&stable(x)!==stable(old.pages.find(q=>q.id===id))))conflicts.push('Local edit rebase required for '+id+'. Export local changes first; the update is not committed.');}
 changed.push(p.manifest.id);map.set(p.manifest.id,p);
 }
 try{validateRelations([...map.values()]);}catch(e){conflicts.push(e.message);}return {conflicts,added,changed,unchanged,moves,retained,candidate:[...map.values()],addedPages:incoming.flatMap(x=>x.pages).filter(p=>!active.some(a=>a.pages.some(x=>x.id===p.id))).map(p=>p.id),incomingPages:incoming.reduce((s,p)=>s+p.pages.length,0),incomingTerms:incoming.reduce((s,p)=>s+p.glossary.length,0)};
}
export function placements(projects){const result={};function walk(ns,path){for(const n of ns){if(n.pageId)result[n.pageId]=[...path,n.id].join('/');if(n.children)walk(n.children,[...path,n.id]);}}for(const p of projects)walk(p.nodes,[p.id]);return result;}
