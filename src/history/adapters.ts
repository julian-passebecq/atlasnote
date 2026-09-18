import {resolveStudy} from '../companion/tree.js';
import {companionKey} from '../companion/validation.mjs';
import type {Catalogue,Workspace,Overlays,Project,Page,DocumentEntry} from '../core/model.js';
import type {ResourceTarget} from '../core/reading-types.js';
import type {CapturedResource,ResourceType,ResourceSnapshot,ResourceRevision,PdfProvenance} from './model.js';
import {validateResourceSnapshot} from './validation.mjs';
import {semanticDiff} from './diff.js';
import {sha256,stable} from '../core/validation.mjs';
import {compose,findNode} from '../core/workspace.js';
import {classifyResource} from '../content-hub/content.js';
import {isPdfatlasUrl} from '../pdf/external-policy.js';
export const REFERENCES_PROJECT='atlas.manual-references';
export const canonical=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const pageType=(p:Page):ResourceType=>p.article?'article':p.qcm?'qcm':p.cheatsheet?'cheatsheet':'notebook-page';
export function pdfProvenance(d:DocumentEntry,metadataRevision='1'):PdfProvenance {
 const match=d.source.url?.match(/^https:\/\/raw\.githubusercontent\.com\/julian-passebecq\/pdfatlas\/([a-f0-9]{40})\/(library\/[^?#]+)$/);
 if(d.packId==='pdfatlas.public'&&(!match||!isPdfatlasUrl(d.source.url)))throw Error('PDF Atlas history requires a reviewed immutable commit URL.');
 return canonical({logicalDocumentId:d.id,...(match?{repository:'julian-passebecq/pdfatlas',commit:match[1],relativePath:match[2]}:{}),sha256:d.sha256,bytes:d.bytes,pageCount:d.pageCount,metadataRevision,rights:d.rights});
}
export interface ResourceAdapter {
 type:ResourceType;validate:(s:ResourceSnapshot)=>ResourceSnapshot;fingerprint:(s:ResourceSnapshot)=>Promise<string>;
 diff:(a:ResourceSnapshot,b:ResourceSnapshot)=>ReturnType<typeof semanticDiff>;
 target:(s:ResourceSnapshot,revisionId?:string)=>ResourceTarget;
 project:(o:Overlays,c:Catalogue,s:ResourceSnapshot)=>void;
 summarize:(s:ResourceSnapshot)=>string;
}
function treeProject(o:Overlays,c:Catalogue,s:ResourceSnapshot){
 if(s.project!.id===REFERENCES_PROJECT){o.references=structuredClone(s.references??[]);return;}
 // Materialize the currently composed user tree before replacing one project.
 // Subsequent structural operations still run through applyOperation. No source pack is mutated.
 o.treeSnapshots=Object.fromEntries(c.projects.map(p=>{const {id,title,icon,description,nodes}=p;return [id,structuredClone({id,title,icon,description,nodes})];}));
 o.treeSnapshots[s.project!.id]=structuredClone(s.project!);o.operations=[];
 if(!c.projects.some(p=>p.id===s.project!.id))o.projects.push(structuredClone(s.project!));
 o.projectPrefs[s.project!.id]=structuredClone(s.preferences??{});
 o.categories??={};if(s.category!==undefined)o.categories[s.project!.id]=s.category as any;else delete o.categories[s.project!.id];
 const ids=new Set<string>([s.project!.id]);const collect=(ns:any[])=>ns.forEach(n=>{ids.add(n.id);if(n.pageId)ids.add(n.pageId);if(n.children)collect(n.children);});collect(c.projects.find(p=>p.id===s.project!.id)?.nodes??[]);collect(s.project!.nodes);
 o.archived=[...o.archived.filter(id=>!ids.has(id)),...(s.archived??[])];
}
function pageProject(o:Overlays,c:Catalogue,s:ResourceSnapshot){
 const p=structuredClone(s.page!);o.pages[p.id]={...o.pages[p.id],page:p};o.taxonomy??={};
 if(s.taxonomy!==undefined)o.taxonomy[p.id]=structuredClone(s.taxonomy);else delete o.taxonomy[p.id];
 if(s.assetRefs){o.assetBindings??={};o.assetBindings[p.id]=structuredClone(s.assetRefs);}else if(o.assetBindings)delete o.assetBindings[p.id];
 if(s.document){if(Object.hasOwn(s,'companion')){o.companions??={};if(s.companion)o.companions[companionKey(s.document)]=structuredClone(s.companion);else delete o.companions[companionKey(s.document)];}o.documents=[...o.documents.filter(d=>d.id!==s.document!.id&&d.pageId!==p.id),structuredClone(s.document)];}
}
function adapter(type:ResourceType):ResourceAdapter {return {
 type,validate:s=>validateResourceSnapshot(type,s),fingerprint:s=>sha256(stable(s)),diff:(a,b)=>semanticDiff(type,a,b),
 summarize:s=>s.project?.title??s.page?.title??s.document?.title??'',
 target:(s,revisionId)=>{const history=revisionId?{historyRevisionId:revisionId}:{};if(s.project)return {kind:'collection',collectionId:s.project.id,...history};const p=s.page!;if(s.document)return {kind:'pdf-page',pageId:p.id,documentId:s.document.id,pdfPage:1,...(revisionId&&s.document.sha256?{revision:s.document.sha256}:{}),...history};if(p.article)return {kind:'article',articleId:p.article.id,pageId:p.id,...history};if(p.qcm)return {kind:'qcm',setId:p.qcm.id,pageId:p.id,...history};if(p.cheatsheet)return {kind:'cheatsheet-page',documentId:p.cheatsheet.id,pageId:p.id,sheetPage:1,...history};return {kind:'page',pageId:p.id,...history};},
 project:type==='notebook-tree'?treeProject:pageProject
 };}
export const resourceAdapters:Readonly<Record<ResourceType,ResourceAdapter>>=Object.freeze(Object.fromEntries((['notebook-page','notebook-tree','article','cheatsheet','qcm','pdf'] as ResourceType[]).map(t=>[t,adapter(t)])) as Record<ResourceType,ResourceAdapter>);
function pageAssetRefs(c:Catalogue,ws:Workspace,p:Page){
 const refs:NonNullable<ResourceSnapshot['assetRefs']>={},owner=c.owners[p.id],pack=c.packs.find(p=>p.manifest.id===owner),prefix=pack?pack.manifest.id+'@'+pack.manifest.version+'/':undefined;
 const walk=(bs:any[])=>bs.forEach(b=>{if(b.src&&!/^https?:/.test(b.src)){const pinned=ws.overlays.assetBindings?.[p.id]?.[b.src],meta=pack?.manifest.assets?.find((a:any)=>a.path===b.src);if(pinned)refs[b.src]=pinned;else if(meta&&prefix)refs[b.src]={key:prefix+b.src,sha256:meta.sha256,mediaType:meta.mediaType};}if(b.children)walk(b.children);});walk(p.blocks);return Object.keys(refs).length?refs:undefined;
}
function metadataVersion(value:unknown){let n=0xcbf29ce484222325n;for(const code of new TextEncoder().encode(stable(canonical(value))))n=BigInt.asUintN(64,(n^BigInt(code))*0x100000001b3n);return 'metadata.'+n.toString(16).padStart(16,'0');}
export function historicalWorkspace(ws:Workspace,revisionId?:string):Workspace{return revisionId?{...ws,viewHistoryRevisionId:revisionId}:ws;}
export function captureResources(c:Catalogue,ws:Workspace):CapturedResource[]{
 const out:CapturedResource[]=[];const make=(resourceType:ResourceType,resourceId:string,snapshot:ResourceSnapshot)=>out.push({resourceType,resourceId,resourceKey:resourceType+':'+resourceId,snapshot:canonical(snapshot)});
 for(const p of c.pages){const d=c.documents.find(d=>d.pageId===p.id),taxonomy=Object.hasOwn(ws.overlays.taxonomy??{},p.id)?ws.overlays.taxonomy![p.id]:(p.article?.taxonomy??p.qcm?.taxonomy);
  const assetRefs=pageAssetRefs(c,ws,p),companion=d?resolveStudy(d,ws).companion??null:undefined;
  make(d?'pdf':pageType(p),d?.id??p.id,{page:p,...(assetRefs?{assetRefs}:{}),...(taxonomy!==undefined?{taxonomy}:{}),...(d?{document:d,companion,pdfProvenance:pdfProvenance(d,metadataVersion({page:p,taxonomy,companion,title:d.title,language:d.language,rights:d.rights}))}:{})});}
 for(const p of c.projects){const {id,title,icon,description,nodes}=p;const ids=new Set([p.id]);const walk=(ns:any[])=>ns.forEach(n=>{ids.add(n.id);if(n.pageId)ids.add(n.pageId);if(n.children)walk(n.children);});walk(nodes);
  make('notebook-tree',p.id,{project:{id,title,icon,description,nodes},preferences:ws.overlays.projectPrefs[p.id]??{},...(Object.hasOwn(ws.overlays.categories??{},p.id)?{category:ws.overlays.categories![p.id]}:{}),archived:ws.overlays.archived.filter(id=>ids.has(id))});}
 make('notebook-tree',REFERENCES_PROJECT,{project:{id:REFERENCES_PROJECT,title:'Manual reference placements',icon:'link',description:'User-owned references; targets are not copied.',nodes:[]},references:ws.overlays.references??[]});return out;
}
export function resourceKeyForTarget(c:Catalogue,t:ResourceTarget):string|undefined {
 if(t.kind==='url'||t.kind==='dashboard-item')return;
 if(t.kind==='collection'){const p=c.projects.find(p=>p.id===t.collectionId)??findNode(c.projects,t.collectionId)?.project;return p?'notebook-tree:'+p.id:t.collectionId===REFERENCES_PROJECT?'notebook-tree:'+REFERENCES_PROJECT:undefined;}
 const id=t.kind==='article'?t.pageId??t.articleId:t.kind==='qcm'?t.pageId??t.setId:t.pageId;
 const d=c.documents.find(d=>d.pageId===id),p=c.pages.find(p=>p.id===id);return d?'pdf:'+d.id:p?pageType(p)+':'+p.id:undefined;
}
/** Return a pane-local projection only. Historical data never replaces shared current content. */
export function historicalCatalogue(c:Catalogue,ws:Workspace,revisionId?:string):{catalogue:Catalogue;revision?:ResourceRevision;warning?:string}{
 if(!revisionId)return {catalogue:c};const revision=ws.history?.revisions.find(r=>r.revisionId===revisionId);
 if(!revision)return {catalogue:c,warning:'This historical revision is missing. Import its full backup; current content was not substituted.'};
 const s=revision.snapshot;
 return {revision,catalogue:{...c,pages:s.page?[...c.pages.filter(p=>p.id!==s.page!.id),s.page]:c.pages,documents:s.document?[...c.documents.filter(d=>d.id!==s.document!.id&&d.pageId!==s.document!.pageId),s.document]:c.documents,projects:s.project?[...c.projects.filter(p=>p.id!==s.project!.id),s.project]:c.projects}};
}
export function assertHistoryTarget(c:Catalogue,ws:Workspace,t:ResourceTarget){
 if(!('historyRevisionId' in t)||!t.historyRevisionId)return c;
 const h=historicalCatalogue(c,ws,t.historyRevisionId);if(h.warning||!h.revision)throw Error(h.warning);
 const key=resourceKeyForTarget(h.catalogue,t);if(key!==h.revision.resourceKey)throw Error('Historical revision belongs to another resource.');return h.catalogue;
}
