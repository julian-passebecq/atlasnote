import type {Catalogue,Overlays,TreeNode,Project,Workspace} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import type {TaxonomyRef,TaxonomyFolder,SubjectKey,LibraryMode} from './model.js';
import {SUBJECTS,SUBJECT_COMPAT,subjectFromCategory} from './model.js';
import {BUILTIN_CATEGORIES} from '../core/workspace-slots.js';
import {locations,isArchived} from '../core/workspace.js';
import {libraryModeForPage} from './content.js';
export const targetId=(t:ReadingTarget):string=>t.kind==='url'?t.url:t.kind==='collection'?t.collectionId:t.kind==='article'?t.pageId??t.articleId:t.kind==='qcm'?t.pageId??t.setId:t.kind==='dashboard-item'?t.itemId:t.pageId;
export function projectSubject(projectId:string,o:Overlays):SubjectKey|undefined {return subjectFromCategory(Object.hasOwn(o.categories??{},projectId)?o.categories![projectId]:BUILTIN_CATEGORIES[projectId]);}
/** One stable folder catalogue, seeded from the Notebook source tree. A type projection never owns folders. */
export function sharedFolders(c:Catalogue,o:Overlays):TaxonomyFolder[]{
 const result:TaxonomyFolder[]=[];
 const native=(ns:TreeNode[]):boolean=>ns.some(n=>n.pageId?libraryModeForPage(c,n.pageId)==='notes':native(n.children??[]));
 for(const p of c.projects){
  // Preserve empty locally authored folders; legacy specialized-only projects fall back to Unfiled.
  if(!native(p.nodes)&&!o.projects.some(x=>x.id===p.id&&!x.id.startsWith('project.cheatsheets'))||o.archived.includes(p.id)||o.projectPrefs[p.id]?.hidden)continue;
  const subject=projectSubject(p.id,o);if(!subject)continue;
  result.push({id:p.id,projectId:p.id,title:p.title,path:[p.title],subject});
  const walk=(nodes:TreeNode[],parentId:string,path:string[])=>{for(const n of nodes)if(n.children&&!o.archived.includes(n.id)){
   const here=[...path,n.title];result.push({id:n.id,projectId:p.id,parentId,title:n.title,path:here,subject});walk(n.children,n.id,here);
  }};walk(p.nodes,p.id,[p.title]);
 }return result;
}
export function resourceTaxonomy(c:Catalogue,o:Overlays,id:string):TaxonomyRef|undefined {
 if(Object.hasOwn(o.taxonomy??{},id))return o.taxonomy![id]??undefined;
 const p=c.pages.find(p=>p.id===id),explicit=p?.article?.taxonomy??p?.qcm?.taxonomy;if(explicit)return explicit;
 const l=locations(c).get(id);if(!l)return;const subject=projectSubject(l.project.id,o);if(!subject)return;
 const folders=sharedFolders(c,o),folderId=[...l.ancestors].reverse().find(a=>folders.some(f=>f.id===a&&f.subject===subject));
 return {subject,...(folderId?{folderId}:{}),path:l.path.slice(0,-1)};
}
/** Invalid IDs/path hints remain stored. Only the display falls back, never the canonical metadata. */
export function resolveTaxonomy(t:TaxonomyRef|undefined,folders:TaxonomyFolder[]):TaxonomyRef|undefined {
 if(!t)return;const folder=t.folderId?folders.find(f=>f.id===t.folderId&&f.subject===t.subject):undefined;
 return folder?{subject:folder.subject,folderId:folder.id,path:folder.path}:{subject:t.subject,...(t.path?{path:t.path}:{})};
}
export function taxonomyLabel(t:TaxonomyRef|undefined,input:TaxonomyFolder[]|Catalogue,o?:Overlays):string {const folders=Array.isArray(input)?input:sharedFolders(input,o!);const r=resolveTaxonomy(t,folders);return r?(SUBJECTS.find(s=>s.id===r.subject)!.label+' / '+(r.folderId?r.path!.join(' / '):'Unfiled')):'Unclassified';}
export function scopeMatches(t:TaxonomyRef|undefined,subject?:SubjectKey,folderId?:string,folders:TaxonomyFolder[]=[]){
 if(subject&&t?.subject!==subject)return false;if(folderId){const f=folders.find(f=>f.id===t?.folderId),scope=folders.find(f=>f.id===folderId);if(!f||!scope)return false;if(f.subject!==scope.subject)return false;let cursor:TaxonomyFolder|undefined=f;const seen=new Set<string>();while(cursor&&!seen.has(cursor.id)){if(cursor.id===scope.id)return true;seen.add(cursor.id);cursor=folders.find(x=>x.id===cursor!.parentId);}return false;}return true;
}
/** Build display nodes only: references never copy pages, PDF bytes or cheatsheet sources. */
export function projectLibrary(c:Catalogue,o:Overlays,mode:LibraryMode,subject?:SubjectKey):Project[]{
 const folders=sharedFolders(c,o),nodes=new Map<string,TreeNode>(),projects=new Map<string,Project>();
 const ensureUnfiled=(key:SubjectKey|undefined)=>{const id='project.unfiled.'+(key??'unclassified');if(!projects.has(id))projects.set(id,{id,title:key?SUBJECTS.find(s=>s.id===key)!.label+' / Unfiled':'Unclassified',icon:'folder',description:'Original placement metadata is retained.',nodes:[]});return projects.get(id)!.nodes;};
 for(const f of folders){if(subject&&f.subject!==subject)continue;if(f.id===f.projectId){const original=c.projects.find(p=>p.id===f.id)!;projects.set(f.id,{...original,nodes:[]});}else {const node:TreeNode={id:f.id,title:f.title,children:[]};nodes.set(f.id,node);const parent=nodes.get(f.parentId!);(parent?.children??projects.get(f.projectId)?.nodes)?.push(node);}}
 function append(node:TreeNode,t?:TaxonomyRef){if(subject&&t?.subject!==subject)return;const place=resolveTaxonomy(t,folders);const destination=place?.folderId?(nodes.get(place.folderId)?.children??projects.get(place.folderId)?.nodes):undefined;(destination??ensureUnfiled(t?.subject)).push(node);}
 const locs=locations(c),unclassifiedNative=new Set<string>();
 if(mode==='notes'&&!subject){const native=(ns:TreeNode[]):TreeNode[]=>ns.flatMap(n=>{if(n.pageId)return libraryModeForPage(c,n.pageId)==='notes'&&!Object.hasOwn(o.taxonomy??{},n.pageId)&&!isArchived(n.pageId,c,o)?[structuredClone(n)]:[];return n.children&&!o.archived.includes(n.id)?[{...n,children:native(n.children)}]:[];});for(const p of c.projects)if(!projectSubject(p.id,o)&&!o.archived.includes(p.id)&&!o.projectPrefs[p.id]?.hidden){const tree=native(p.nodes);if(tree.length||o.projects.some(x=>x.id===p.id)){projects.set(p.id,{...p,nodes:tree});unclassifiedNative.add(p.id);}}}
 for(const p of c.pages){if(libraryModeForPage(c,p.id)!==mode||isArchived(p.id,c,o)||o.projectPrefs[locs.get(p.id)?.project.id??'']?.hidden)continue;const l=locs.get(p.id);if(l&&unclassifiedNative.has(l.project.id)&&!Object.hasOwn(o.taxonomy??{},p.id))continue;append({id:l?.nodeId??'node.'+p.id.slice(0,110),title:p.title,pageId:p.id},resourceTaxonomy(c,o,p.id));}
 if(mode==='notes')for(const r of o.references??[])append({id:r.id,title:r.title,target:r.target},r.taxonomy);
 // Empty native folders remain discoverable in Notebook; specialized projections show only matching branches.
 const siblingOrder=new Map<string,Map<string,number>>();
 const remember=(id:string,ns:TreeNode[])=>{siblingOrder.set(id,new Map(ns.map((n,i)=>[n.id,i])));for(const n of ns)if(n.children)remember(n.id,n.children);};
 for(const p of c.projects)remember(p.id,p.nodes);
 const prune=(ns:TreeNode[],parent:string):TreeNode[]=>{const order=siblingOrder.get(parent),kept=ns.flatMap(n=>{if(!n.children)return [n];const children=prune(n.children,n.id);return children.length||mode==='notes'?[{...n,children}]:[];});return mode==='notes'&&order?kept.sort((a,b)=>(order.get(a.id)??Number.MAX_SAFE_INTEGER)-(order.get(b.id)??Number.MAX_SAFE_INTEGER)):kept;};
 return [...projects.values()].map(p=>({...p,nodes:prune(p.nodes,p.id)})).filter(p=>p.nodes.length||mode==='notes');
}
export function targetTaxonomy(c:Catalogue,ws:Workspace,t:ReadingTarget):TaxonomyRef|undefined {
 if(t.kind==='url')return;if(t.kind==='collection'){const f=sharedFolders(c,ws.overlays).find(f=>f.id===t.collectionId);if(f)return {subject:f.subject,folderId:f.id,path:[...f.path]};}if(t.kind==='dashboard-item')return ws.personal.dashboardItems?.find(x=>x.id===t.itemId)?.taxonomy;return resourceTaxonomy(c,ws.overlays,targetId(t));
}
