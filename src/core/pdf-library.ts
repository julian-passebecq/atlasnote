import type {Catalogue,Workspace,Page,DocumentEntry,Asset} from './model.js';
import {uid,applyOperation} from './workspace.js';
import {assertSafeAsset,sha256,safeUrl} from './validation.mjs';

export const PDF_TARGET_BYTES=12*1024*1024;
export const PDF_MAX_BYTES=20*1024*1024;
export type PdfMetadata={title:string;summary:string;language:string;documentType:string;domains:string;technologies:string;level:string;source:string;sourceUrl:string;author:string;publisher:string;attribution:string;rights:'reference-only'|'unreviewed';pageCount:string};
export const emptyPdfMetadata=():PdfMetadata=>({title:'',summary:'',language:'',documentType:'reference',domains:'',technologies:'',level:'reference',source:'other',sourceUrl:'',author:'',publisher:'',attribution:'',rights:'reference-only',pageCount:''});
export const slugFacet=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function pdfFacetTags(meta:PdfMetadata,existing:string[]=[]){
 const tags=existing.filter(t=>! /^(doctype|domain|tech|level|source):/.test(t));
 const add=(prefix:string,value:string)=>{const v=slugFacet(value);if(v)tags.push(prefix+':'+v);};
 add('doctype',meta.documentType);add('level',meta.level);add('source',meta.source);
 meta.domains.split(',').forEach(v=>add('domain',v));meta.technologies.split(',').forEach(v=>add('tech',v));
 return [...new Set(tags)];
}
export function validatePdfMetadata(meta:PdfMetadata){
 if(!meta.title.trim()||meta.title.trim().length>240)throw Error('Give the PDF a title of 1 to 240 characters.');
 if(meta.sourceUrl&&!safeUrl(meta.sourceUrl))throw Error('Source URL must be an ordinary HTTP or HTTPS URL.');
 if(meta.language&&!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$|^multi$/.test(meta.language))throw Error('Use a language code such as en, no, fr or multi; leave unknown language blank.');
 if(meta.pageCount&&(!/^\d+$/.test(meta.pageCount)||Number(meta.pageCount)<1||Number(meta.pageCount)>100000))throw Error('Known page count must be a whole number from 1 to 100000.');
 if(!['reference-only','unreviewed'].includes(meta.rights))throw Error('This local intake never grants publication rights.');
}
/** Prepare one atomic addition; exact bytes are retained. Hash identity wins over filename. */
export async function prepareLocalPdf(c:Catalogue,ws:Workspace,bytes:Uint8Array,meta:PdfMetadata,projectId:string,parentId='',newFolder=''){
 assertSafeAsset('local.pdf',bytes,'application/pdf');validatePdfMetadata(meta);
 const hash=await sha256(bytes),duplicate=c.documents.find(d=>d.sha256===hash);
 if(duplicate)return {duplicate};
 const projects=structuredClone(c.projects),overlays=structuredClone(ws.overlays);
 if(!projects.some(p=>p.id===projectId))throw Error('Choose an existing notebook.');
 if(newFolder.trim()){
  if(newFolder.trim().length>200)throw Error('Folder title is too long.');
  const id=uid('folder.local'),op={kind:'add' as const,nodeId:id,projectId,parentId:parentId||undefined,node:{id,title:newFolder.trim(),children:[]}};
  applyOperation(projects,op);overlays.operations.push(op);parentId=id;
 }
 const sourceUrl=meta.sourceUrl.trim(),attribution=meta.attribution.trim()||[meta.author.trim(),meta.publisher.trim()].filter(Boolean).join(' / ')||'Local import; author and publication rights have not been supplied.';
 const sources=sourceUrl||meta.author.trim()||meta.publisher.trim()?[{title:meta.title.trim(),...(sourceUrl?{url:sourceUrl}:{}),...(meta.publisher.trim()?{publisher:meta.publisher.trim()}:{}),...(meta.author.trim()?{note:'Author: '+meta.author.trim()}: {})}]:[];
 const page:Page={id:uid('page.local'),title:meta.title.trim(),summary:meta.summary.trim(),blocks:[],related:[],terms:[],sources,tags:pdfFacetTags(meta),provenance:'Local private PDF intake'};
 const key='local.pdf/'+hash+'.pdf',asset:Asset={key,bytes,sha256:hash,mediaType:'application/pdf'};
 const document:DocumentEntry={id:uid('document.local'),pageId:page.id,title:page.title,source:{kind:'library-file',libraryId:'local.browser',path:'pdf/'+hash+'.pdf'},sha256:hash,bytes:bytes.length,visibility:'private',rights:{status:meta.rights,attribution,...(sourceUrl?{sourceUrl}:{})},assetKey:key,...(meta.language?{language:meta.language}:{}),...(meta.pageCount?{pageCount:Number(meta.pageCount)}:{}),defaultView:'single'};
 const nodeId=uid('node.local'),op={kind:'add' as const,nodeId,projectId,parentId:parentId||undefined,node:{id:nodeId,title:page.title,pageId:page.id}};
 applyOperation(projects,op);overlays.operations.push(op);overlays.pages[page.id]={page};overlays.documents.push(document);
 return {page,document,asset,overlays,parentId};
}
/** Cross-pack duplicate check supplements version/ID conflict checks, never replaces them. */
export function duplicatePdfImports(c:Catalogue,incoming:any[]){
 const seen=new Map(c.documents.filter(d=>d.sha256).map(d=>[d.sha256!,d]));const duplicates:string[]=[];
 for(const d of incoming.flatMap(p=>p.documents??[])){
  if(!d.sha256)continue;const old=seen.get(d.sha256);
  if(old&&(old.id!==d.id||old.pageId!==d.pageId))duplicates.push(`${d.title} has the same SHA-256 as ${old.title}. Reuse the existing document; no duplicate was added.`);
  else seen.set(d.sha256,d);
 }
 return duplicates;
}
