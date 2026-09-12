import {zipFiles} from '../storage/archives.mjs';
import {ID,assertSafeAsset,sha256} from './validation.mjs';

/** Explicit, local download. Never fetches a repository or uploads private bytes.
 * This is a PDF metadata/binary library, not a complete content/workspace backup.
 */
export async function exportPrivatePdfLibrary(catalogue,resolveAsset,{id='atlas.private-pdf-library',version='1.0.0',title='Private PDF library'}={}){
 if(!ID.test(id)||!/^\d+\.\d+\.\d+$/.test(version))throw Error('Supply a stable pack ID and a semantic version such as 1.0.0.');
 const selected=catalogue.documents.filter(d=>d.visibility!=='public');
 if(!selected.length)throw Error('No private PDF documents to export. Public bundled examples are deliberately excluded.');
 const files=new Map(),json=(path,value)=>files.set(path,JSON.stringify(value,null,2)+'\n'),base='packs/'+id+'/',assets=[],documents=[],pages=[],seen=new Map();
 const pageIds=new Set(selected.map(d=>d.pageId));
 const prune=nodes=>nodes.flatMap(n=>n.pageId?(pageIds.has(n.pageId)?[structuredClone(n)]:[]):(()=>{const children=prune(n.children??[]);return children.length?[{...structuredClone(n),children}]:[];})());
 let projects=catalogue.projects.map(p=>({id:p.id,title:p.title,icon:p.icon,description:p.description,nodes:prune(p.nodes)})).filter(p=>p.nodes.length);
 // A local PDF may sit under a built-in public notebook. Its context IDs are
 // already owned in every fresh app. Isolate ONLY those exported context IDs;
 // the live tree and all private Page/Document/leaf identities stay untouched.
 const publicProjects=new Set(),publicNodes=new Set();
 const collect=nodes=>nodes.forEach(n=>{publicNodes.add(n.id);if(n.children)collect(n.children);});
 for(const p of catalogue.packs.filter(p=>p.manifest.visibility==='public'))for(const project of p.projects){publicProjects.add(project.id);collect(project.nodes);}
 const placementMap=[];
 async function exportId(original,kind){const mapped='pdfctx.'+(await sha256(id+'|'+kind+'|'+original)).slice(0,28);placementMap.push({kind,originalId:original,exportId:mapped});return mapped;}
 async function remapNodes(nodes){for(const n of nodes){if(publicNodes.has(n.id))n.id=await exportId(n.id,'folder');if(n.children)await remapNodes(n.children);}}
 for(const p of projects){if(publicProjects.has(p.id))p.id=await exportId(p.id,'project');await remapNodes(p.nodes);}
 for(const original of selected){
  const page=catalogue.pages.find(p=>p.id===original.pageId);if(!page)throw Error('Missing PDF wrapper '+original.pageId);
  const {assetKey,packId,...d}=structuredClone(original);d.visibility='private';d.title=page.title;
  if(original.assetKey){
   const a=await resolveAsset(original.assetKey);if(!a)throw Error('Missing private PDF bytes: '+original.id);
   assertSafeAsset('document.pdf',a.bytes,'application/pdf');const hash=await sha256(a.bytes);
   if(hash!==original.sha256||hash!==a.sha256||a.bytes.length!==original.bytes)throw Error('PDF checksum/size mismatch: '+original.id);
   if(seen.has(hash)&&seen.get(hash)!==original.id)throw Error('Duplicate PDF SHA-256: reuse '+seen.get(hash)+' instead of '+original.id);
   seen.set(hash,original.id);const path='assets/pdf/'+original.id+'/'+hash+'.pdf';
   d.source={kind:'pack-file',path};assets.push({path,mediaType:'application/pdf',sha256:hash});files.set(base+path,a.bytes);
  }else if(!['https','external-link'].includes(d.source.kind))throw Error('Private PDF has no locally available bytes: '+d.id);
  documents.push(d);
  // Deliberately metadata-only wrappers: linked note teaching/personal additions
  // remain in full content export and backup, not a PDF-only authoring library.
  pages.push({id:page.id,title:page.title,summary:page.summary,blocks:[],related:[],terms:[],sources:structuredClone(page.sources),tags:[...page.tags],...(page.provenance?{provenance:page.provenance}:{})});
 }
 const manifest={format:'atlas-content-pack',schemaVersion:1,payloadSchema:'atlas.bundle@2',id,version,title,visibility:'private',files:{projects:'projects.json',pages:'pages',glossary:'glossary.json'},requires:[],assets,provenance:{kind:'private-pdf-library-export'}};
 json(base+'atlas-pack.json',manifest);json(base+'projects.json',projects);json(base+'glossary.json',[]);
 for(const p of pages)json(base+'pages/'+p.id+'.json',p);
 json(base+'atlas-documents.json',{format:'atlas-document-index',schemaVersion:1,packId:id,version,documents});
 json('atlas-placement-map.json',{format:'atlas-pdf-export-placement-map',schemaVersion:1,entries:placementMap});
 json('workspace.json',{format:'atlas-workspace',schemaVersion:1,title,packsDirectory:'packs',disabledPackIds:[],groups:[]});
 files.set('README.md','# Private PDF library\n\nImport this ZIP locally; do not publish it. Exact PDF bytes, stable Page/Document/private-tree IDs, metadata and rights are retained. Public built-in PDFs, note bodies, related-note references, glossary, personal remarks, ratings, bookmarks and session data are excluded. Use a complete workspace backup for a full restore.\n\nPublic built-in notebook/folder context IDs are mapped deterministically into the export namespace to avoid duplicate owners in a fresh default app; atlas-placement-map.json records the original context. The live workspace is never changed.\n\nThis standalone snapshot is intended for a fresh workspace or explicit source-ownership review. Existing local/pack IDs must not be duplicated into a second owner. Re-importing an identical library into its destination is idempotent. Advance the pack version for an edited revision.\n');
 return {bytes:await zipFiles(files,'private-pdf-library'),documentCount:documents.length,assetCount:assets.length};
}
