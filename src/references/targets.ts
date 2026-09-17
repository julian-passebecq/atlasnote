import {resolveStudy} from '../companion/tree.js';
/** Pure resolver for the existing ResourceTarget family. No DOM IDs or ad-hoc URL scheme. */
import type {Catalogue,Workspace,Block} from '../core/model.js';
import type {ResourceTarget} from '../core/reading-types.js';
import {validateReadingTarget} from '../storage/reading-validation.mjs';
import {walkBlocks,stable} from '../core/validation.mjs';
import {blocksText,findNode,isArchived} from '../core/workspace.js';
import {visitCheatsheetBlocks} from '../cheatsheets/validation.mjs';
import {blockText as sheetBlockText} from '../cheatsheets/text-layout.mjs';
import {targetForPage} from '../core/reading-lists.js';
export type ResourceGroup='Notebook'|'PDF'|'Cheatsheet'|'Interview'|'QCM'|'Article'|'Task'|'Folder'|'Link';
export type ResolvedTarget={target:ResourceTarget;openTarget?:ResourceTarget;key:string;title:string;detail:string;group:ResourceGroup;available:boolean;exact:boolean;warning?:string;revision:string;excerpt:string};
/** Deterministic change detection only; not a cryptographic authenticity claim. */
export function fingerprint(value:unknown):string {
 const input=new TextEncoder().encode(stable(value));let hash=0xcbf29ce484222325n;
 for(const byte of input)hash=BigInt.asUintN(64,(hash^BigInt(byte))*0x100000001b3n);
 return hash.toString(16).padStart(16,'0');
}
export function canonicalTarget(c:Catalogue,t:ResourceTarget):ResourceTarget {
 const v=structuredClone(t);
 if((v.kind==='page'||v.kind==='article')&&v.anchor?.blockId===(v.kind==='page'?v.pageId:v.pageId??v.articleId))delete v.anchor; // Reader's page-title anchor denotes the whole resource.
 if(v.kind==='pdf-category')return {kind:'pdf-page',pageId:v.pageId,documentId:v.documentId,pdfPage:v.pdfPage,...(v.revision?{revision:v.revision}:{})};
 if(v.kind==='page'){
  const p=c.pages.find(p=>p.id===v.pageId),doc=c.documents.find(d=>d.pageId===v.pageId);
  if(doc&&v.anchor?.pdfPage)return {kind:'pdf-page',pageId:v.pageId,documentId:doc.id,pdfPage:v.anchor.pdfPage,...(v.anchor.pdfRevision?{revision:v.anchor.pdfRevision}:{})};
  if(p?.article)return {kind:'article',articleId:p.article.id,pageId:p.id,...(v.anchor?{anchor:v.anchor}:{})};
  if(p?.qcm)return {kind:'qcm',setId:p.qcm.id,pageId:p.id,...(v.anchor?.questionId?{questionId:v.anchor.questionId}:{})};
  if(p?.cheatsheet&&(v.anchor?.sheetPage||v.anchor?.sheetId))return {kind:'cheatsheet-page',pageId:p.id,documentId:p.cheatsheet.id,sheetPage:v.anchor.sheetPage??1,anchor:v.anchor};
 }
 return v;
}
export function targetKey(c:Catalogue,target:ResourceTarget):string {
 const t=canonicalTarget(c,target);
 switch(t.kind){
 case 'page':return stable(['page',t.pageId,t.anchor?.blockId??'']);
 case 'article':return stable(['article',t.articleId,t.anchor?.blockId??'']);
 case 'qcm':return stable(['qcm',t.setId,t.questionId??'']);
 case 'pdf-page':case 'pdf-category':return stable(['pdf',t.documentId,t.revision??c.documents.find(d=>d.id===t.documentId)?.sha256??'',t.pdfPage]);
 case 'cheatsheet-page':{const d=c.pages.find(p=>p.id===t.pageId)?.cheatsheet;return stable(['sheet',t.documentId,t.anchor?.sheetId??d?.pages[t.sheetPage-1]?.id??t.sheetPage,t.anchor?.blockId??'']);}
 case 'collection':return stable(['folder',t.collectionId]);
 case 'dashboard-item':return stable(['capture',t.itemId]);
 case 'url':return stable(['url',new URL(t.url).href]);
 }
}
export function documentTarget(c:Catalogue,input:ResourceTarget):ResourceTarget {
 const t=canonicalTarget(c,input);
 if(t.kind==='pdf-page'||t.kind==='pdf-category'||t.kind==='cheatsheet-page'||t.kind==='page')return {kind:'page',pageId:t.pageId};
 if(t.kind==='article')return {kind:'article',articleId:t.articleId,...(t.pageId?{pageId:t.pageId}:{})};
 if(t.kind==='qcm')return {kind:'qcm',setId:t.setId,...(t.pageId?{pageId:t.pageId}:{})};
 return t;
}
export function targetScopeKeys(c:Catalogue,input:ResourceTarget):string[]{
 const t=canonicalTarget(c,input),keys=[targetKey(c,t)];
 if((t.kind==='page'||t.kind==='article')&&t.anchor?.blockId){const page=c.pages.find(p=>p.id===(t.kind==='page'?t.pageId:t.pageId??t.articleId));if(page)walkBlocks(page.blocks,(b:Block,parents:string[])=>{if(b.id===t.anchor!.blockId)for(const id of parents)keys.push(targetKey(c,{...t,anchor:{blockId:id}}));});}
 if(t.kind==='cheatsheet-page'&&t.anchor?.blockId){const {blockId,...a}=t.anchor;keys.push(targetKey(c,{...t,anchor:a}));}
 keys.push(targetKey(c,documentTarget(c,t)));return [...new Set(keys)];
}
export function resolveTarget(c:Catalogue,ws:Workspace,input:ResourceTarget):ResolvedTarget {
 validateReadingTarget(input);const t=canonicalTarget(c,input),key=targetKey(c,t);
 const base:ResolvedTarget={target:input,key,title:'Unavailable resource',detail:'',group:'Notebook',available:false,exact:false,revision:fingerprint(t),excerpt:''};
 if(t.kind==='url')return {...base,title:new URL(t.url).hostname,detail:t.url,group:'Link',available:true,exact:true,openTarget:t,excerpt:t.url};
 if(t.kind==='dashboard-item'){
  const item=ws.personal.dashboardItems?.find(i=>i.id===t.itemId);return {...base,group:'Task',...(item?{title:item.text.slice(0,160),detail:item.kind,available:item.status!=='archived',exact:true,openTarget:t,revision:fingerprint(item),excerpt:item.text.slice(0,1200)}:{warning:'The Dashboard item was removed. The reference is retained.'})};
 }
 if(t.kind==='collection'){
  const found=findNode(c.projects,t.collectionId),project=c.projects.find(p=>p.id===t.collectionId),title=found?.node.title??project?.title;
  const archived=ws.overlays.archived.includes(t.collectionId)||!!found&&found.ancestors.some(id=>ws.overlays.archived.includes(id));
  return {...base,group:'Folder',...(title?{title,detail:'Broad folder association',available:!archived,exact:true,openTarget:t,revision:fingerprint({id:t.collectionId,title}),excerpt:title}:{warning:'The folder is missing. Notebook structure was not changed.'})};
 }
 const id=t.kind==='article'?t.pageId??t.articleId:t.kind==='qcm'?t.pageId??t.setId:t.pageId;
 const page=c.pages.find(p=>p.id===id),doc=c.documents.find(d=>d.pageId===id);
 if(!page)return {...base,title:id,warning:'Source is unavailable. Import or restore it; this reference is retained.'};
 const group:ResourceGroup=doc?'PDF':page.cheatsheet?'Cheatsheet':page.qcm?'QCM':page.article?'Article':page.tags.includes('interview')?'Interview':'Notebook';
 const out:ResolvedTarget={...base,title:page.title,group,available:!isArchived(page.id,c,ws.overlays),exact:true,openTarget:t,revision:fingerprint(doc?{id:doc.id,sha256:doc.sha256??'',source:doc.source,pageCount:doc.pageCount??null}:page),excerpt:page.summary.slice(0,1200)};
 if(!out.available){out.warning='Source is archived. Restore it from library management.';return out;}
 const lost=(warning:string,detail:string)=>({...out,exact:false,warning,detail,openTarget:documentTarget(c,t)});
 if(t.kind==='article'&&page.article?.id!==t.articleId||t.kind==='qcm'&&page.qcm?.id!==t.setId)return {...out,available:false,exact:false,warning:'Source identity does not match; the saved target is retained.'};
 if(t.kind==='pdf-page'||t.kind==='pdf-category'){
  if(!doc||doc.id!==t.documentId)return {...out,available:false,exact:false,warning:'PDF identity does not match.'};
  if(t.revision&&t.revision!==doc.sha256)return {...out,available:false,exact:false,detail:'p.'+t.pdfPage,warning:'PDF revision changed. Review the page before relinking.'};
  if(doc.pageCount&&t.pdfPage>doc.pageCount)return lost('The physical page no longer exists. Opening the document instead.','Missing p.'+t.pdfPage);
  const metadata=resolveStudy(doc,ws).companion?.pages[String(t.pdfPage)];
  const hint=metadata?[metadata.title,metadata.summary].filter(Boolean).join(' / '):'';
  return {...out,detail:'Physical p.'+t.pdfPage+(metadata?.title?' / '+metadata.title:''),revision:fingerprint({document:out.revision,page:t.pdfPage,metadata:metadata??null}),excerpt:(hint?'Authored page metadata (not extracted PDF text): '+hint:out.excerpt||'No text excerpt available. Review the physical PDF page locally.').slice(0,1200)};
 }
 if(t.kind==='cheatsheet-page'){
  const sheet=page.cheatsheet;if(!sheet||sheet.id!==t.documentId)return {...out,available:false,exact:false,warning:'Cheatsheet identity does not match.'};
  const physical=t.anchor?.sheetId?sheet.pages.findIndex(p=>p.id===t.anchor!.sheetId):t.sheetPage-1,s=sheet.pages[physical];
  if(!s)return lost('This cheatsheet page was removed. Opening the document instead.','Missing sheet');
  const blockId=t.anchor?.blockId;let block:any;visitCheatsheetBlocks(s.blocks,b=>{if(b.id===blockId)block=b;});
  if(blockId&&!block)return {...out,exact:false,detail:'p.'+(physical+1),warning:'The block was removed. Opening its physical sheet instead.',openTarget:{...t,sheetPage:physical+1,anchor:{sheetId:s.id,sheetPage:physical+1}}};
  return {...out,detail:'p.'+(physical+1)+(block?' / '+sheetBlockText(block).split('\n')[0].slice(0,100):''),openTarget:{...t,sheetPage:physical+1,anchor:{...t.anchor,sheetId:s.id,sheetPage:physical+1}},revision:fingerprint({document:sheet.id,sheet:s.id,content:block??s}),excerpt:(block?sheetBlockText(block):s.title??'').slice(0,1200)};
 }
 if(t.kind==='qcm'&&t.questionId){
  const index=page.qcm!.questions.findIndex(q=>q.id===t.questionId),question=page.qcm!.questions[index];
  if(!question)return lost('The question was removed. Opening its set instead.','Missing question');
  return {...out,detail:'Q'+(index+1)+' / '+question.prompt.slice(0,120),revision:fingerprint(question),excerpt:question.prompt.slice(0,1200)};
 }
 if((t.kind==='page'||t.kind==='article')&&t.anchor?.blockId){
  let block:Block|undefined;walkBlocks(page.blocks,(b:Block)=>{if(b.id===t.anchor!.blockId)block=b;});
  if(!block)return lost('The section/block was removed. Opening the parent resource instead.','Missing block '+t.anchor.blockId);
  return {...out,detail:'Section / '+(('title'in block&&block.title)||blocksText([block]).replace(/\s+/g,' ').trim().slice(0,90)||'Untitled section'),revision:fingerprint(block),excerpt:blocksText([block]).slice(0,1200)};
 }
 return out;
}
export function requireExact(c:Catalogue,ws:Workspace,target:ResourceTarget):ResolvedTarget {const r=resolveTarget(c,ws,target);if(!r.available||!r.exact)throw Error(r.warning??'Choose an available, exact target.');return r;}
/** Stable target browser. Limits prevent importing a large library from creating a huge DOM. */
export function resourceTargets(c:Catalogue,ws:Workspace,limit=5000):ResourceTarget[]{
 const targets:ResourceTarget[]=[];const add=(t:ResourceTarget)=>{if(targets.length<limit)targets.push(t);};
 for(const page of c.pages){if(targets.length>=limit)break;if(isArchived(page.id,c,ws.overlays))continue;
  add(targetForPage(c,page.id));const doc=c.documents.find(d=>d.pageId===page.id);
  if(doc){for(let n=1;n<=Math.min(doc.pageCount??1,1000)&&targets.length<limit;n++)add({kind:'pdf-page',pageId:page.id,documentId:doc.id,pdfPage:n,...(doc.sha256?{revision:doc.sha256}:{})});}
  else if(page.cheatsheet){page.cheatsheet.pages.forEach((s,i)=>{add({kind:'cheatsheet-page',pageId:page.id,documentId:page.cheatsheet!.id,sheetPage:i+1,anchor:{sheetId:s.id,sheetPage:i+1}});for(const a of s.outline??[])add({kind:'cheatsheet-page',pageId:page.id,documentId:page.cheatsheet!.id,sheetPage:i+1,anchor:{sheetId:s.id,sheetPage:i+1,blockId:a.blockId}});});}
  else if(page.qcm){for(const q of page.qcm.questions)add({kind:'qcm',pageId:page.id,setId:page.qcm.id,questionId:q.id});}
  else walkBlocks(page.blocks,(b:Block)=>{if(b.type==='section'||b.type==='question')add(targetForPage(c,page.id,{blockId:b.id}));});
 }
 for(const item of ws.personal.dashboardItems??[])if(item.status!=='archived')add({kind:'dashboard-item',itemId:item.id});
 const seen=new Set<string>();return targets.filter(t=>{const k=targetKey(c,t);if(seen.has(k))return false;seen.add(k);return true;});
}
