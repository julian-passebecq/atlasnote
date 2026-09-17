import type {Catalogue,Workspace,Page,Overlays} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import {validateReadingTarget} from '../storage/reading-validation.mjs';
import {inspectObject,stable,walkBlocks} from '../core/validation.mjs';
import {articleExport,articlePage,qcmPage,putContent,currentResourceTarget} from '../content-hub/content.js';
import {parseContentJSON,validateArticleSource,validateQcm} from '../content-hub/validation.mjs';
import {parseCheatsheetSource} from '../cheatsheets/content.mjs';
import {companionKey,validateCompanion} from '../companion/validation.mjs';
import {resolveStudy} from '../companion/tree.js';
import {resolveTarget,requireExact} from '../references/targets.js';
import {targetForPage,bookmarkTarget} from '../core/reading-lists.js';

export const SOURCE_JSON_LIMIT=4*1024*1024;
const kinds=new Set(['page','article','qcm','pdf-page','pdf-category','cheatsheet-page','collection','dashboard-item','url']);
/** Traverse bounded canonical data, never strings or executable markup. Includes saved snapshots. */
export function existingReadingTargets(c:Catalogue,ws:Workspace):ReadingTarget[]{
 const targets:ReadingTarget[]=[],seen=new Set<object>();let count=0;
 const visit=(v:any)=>{if(!v||typeof v!=='object'||seen.has(v))return;if(++count>250000)throw Error('Too many references to check safely. Export a backup and reduce the edit scope.');seen.add(v);
  if(kinds.has(v.kind)){try{validateReadingTarget(v);targets.push(v);}catch{/* Ordinary page metadata is not a reading target. */}}
  if(typeof v.pageId==='string'&&typeof v.presentation==='string') {const t=currentResourceTarget(c,v)??targetForPage(c,v.pageId,v.anchor);targets.push(t);}
  if(Array.isArray(v)){v.forEach(visit);}else Object.values(v).forEach(visit);
 };
 visit(ws.personal);visit(ws.overlays.references);visit(c.pages);
 for(const b of ws.personal.bookmarks)targets.push(bookmarkTarget(b));
 return targets;
}
/** Do not turn a currently exact bookmark, section link or saved position into a parent fallback. */
export function protectExactReferences(c:Catalogue,ws:Workspace,next:Catalogue,nextWs:Workspace=ws){
 for(const t of existingReadingTargets(c,ws)){
  const before=resolveTarget(c,ws,t);if(!before.available||!before.exact)continue;
  const after=resolveTarget(next,nextWs,t);
  if(t.kind==='pdf-category'){
   const categoryExists=(catalogue:Catalogue,state:Workspace)=>{const doc=catalogue.documents.find(d=>d.id===t.documentId);const cats=doc?resolveStudy(doc,state).companion?.categories??[]:[];const has=(items:any[]):boolean=>items.some(x=>x.id===t.pdfCategoryId||has(x.children??[]));return has(cats);};
   if(categoryExists(c,ws)&&!categoryExists(next,nextWs))throw Error('This edit would break an exact reference to PDF category '+t.pdfCategoryId+'. Preserve its stable category ID.');
  }
  if(!after.available||!after.exact)throw Error('This edit would break an exact reference: '+before.title+' / '+before.detail+'. Keep its stable page, block or question ID.');
 }
}
function validateNewTargets(page:Page,c:Catalogue,ws:Workspace){
 const check=(v:any)=>{if(!v||typeof v!=='object')return;if(Object.hasOwn(v,'target')){validateReadingTarget(v.target);requireExact(c,ws,v.target);}if(v.contextTarget){validateReadingTarget(v.contextTarget);requireExact(c,ws,v.contextTarget);}if(Array.isArray(v))v.forEach(check);else for(const [k,x] of Object.entries(v))if(k!=='target'&&k!=='contextTarget')check(x);};
 check(page);
 walkBlocks(page.blocks,b=>{if(b.type==='link')requireExact(c,ws,{kind:'page',pageId:b.pageId,...(b.blockId?{anchor:{blockId:b.blockId}}:{})});});
}
export function resourceSource(c:Catalogue,ws:Workspace,page:Page):unknown {
 if(page.cheatsheet)return structuredClone(page.cheatsheet);
 if(page.article)return articleExport(page);
 if(page.qcm)return structuredClone(page.qcm);
 const doc=c.documents.find(d=>d.pageId===page.id);if(!doc)throw Error('No editable resource selected.');
 return {schemaVersion:1,kind:'atlas-pdf-metadata',document:{...structuredClone(doc),title:page.title},companion:structuredClone(resolveStudy(doc,ws).companion??null)};
}
export function sourceIdentity(c:Catalogue,ws:Workspace,page:Page):string{return stable(resourceSource(c,ws,page));}
/** Returns an entirely prepared overlay. The caller publishes it in one existing store transaction. */
export function prepareSourceReplacement(c:Catalogue,ws:Workspace,pageId:string,raw:string,expected?:string):Overlays{
 if(new TextEncoder().encode(raw).length>SOURCE_JSON_LIMIT)throw Error('Source JSON exceeds 4 MiB.');
 const old=c.pages.find(p=>p.id===pageId);if(!old)throw Error('The selected resource is no longer available.');
 if(expected!==undefined&&sourceIdentity(c,ws,old)!==expected)throw Error('This source changed while you were editing. Reload its JSON before applying.');
 const value:any=parseContentJSON(raw),o=structuredClone(ws.overlays);let page:Page;
 if(old.cheatsheet){const sheet=parseCheatsheetSource(raw);if(sheet.id!==old.cheatsheet.id)throw Error('The stable cheatsheet ID cannot change.');page={...structuredClone(old),title:sheet.title,summary:sheet.subtitle??old.summary,cheatsheet:sheet};}
 else if(old.article){validateArticleSource(value);if(value.id!==old.id)throw Error('The stable Article ID cannot change.');
  // Text editing of the common single-Markdown body retains its existing block identity.
  if(value.text!==undefined&&old.blocks.length===1&&old.blocks[0].type==='markdown'){value.blocks=[{...old.blocks[0],text:value.text}];delete value.text;}
  page=articlePage(value);
 }
 else if(old.qcm){validateQcm(value);if(value.id!==old.qcm.id)throw Error('The stable QCM ID cannot change.');page=qcmPage(value);
  for(const attempt of ws.personal.qcmAttempts??[]){if(attempt.setId!==old.qcm.id)continue;const q=value.questions.find(q=>q.id===attempt.questionId);if(!q)throw Error('A question with retained attempt history cannot be removed.');const original=old.qcm.questions.find(x=>x.id===q.id);if(original?.options.some(op=>!q.options.some(x=>x.id===op.id)))throw Error('Option IDs with retained attempt history cannot be removed.');}
 }
 else {
  const doc=c.documents.find(d=>d.pageId===pageId);if(!doc)throw Error('No editable PDF metadata.');
  inspectObject(value);
  if(value.schemaVersion!==1||value.kind!=='atlas-pdf-metadata'||Object.keys(value).some(k=>!['schemaVersion','kind','document','companion'].includes(k)))throw Error('Expected atlas-pdf-metadata schema version 1.');
  const d=value.document;if(!d||typeof d.title!=='string'||!d.title.trim()||d.title.length>200)throw Error('PDF title must contain 1-200 characters.');
  const local=o.documents.find(d=>d.id===doc.id),allowed=local?['title','language','defaultView']:['title'];
  const strip=(x:any)=>Object.fromEntries(Object.entries(x).filter(([k])=>!allowed.includes(k)));
  if(stable(strip(d))!==stable(strip(doc)))throw Error('PDF binary identity, source, revision, page count and rights are read-only. Only title and local viewing metadata may change.');
  if(d.language!==undefined&&!/^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*|unknown|multi)$/.test(d.language))throw Error('Invalid PDF language code.');
  if(d.defaultView!==undefined&&!['single','continuous','spread'].includes(d.defaultView))throw Error('Invalid default PDF presentation.');
  const prior=resolveStudy(doc,ws).companion;
  if(value.companion!==null){validateCompanion(value.companion,doc);if(prior&&value.companion.id!==prior.id)throw Error('Keep the companion stable ID.');o.companions??={};o.companions[companionKey(doc)]=structuredClone(value.companion);}
  else if(prior)throw Error('Companion removal is not a JSON edit. Preserve the current companion to protect page/category references.');
  if(local){local.title=d.title;for(const key of ['language','defaultView']){if(d[key]!==undefined)local[key]=d[key];else delete local[key];}}
  page={...structuredClone(old),title:d.title};
 }
 // Preserve existing wrapper metadata and relationships exactly, not a second representation.
 if(old.article||old.qcm)putContent(o,page,c,true);else o.pages[pageId]={...o.pages[pageId],page};
 page=o.pages[pageId].page;
 const next={...c,pages:c.pages.map(p=>p.id===pageId?page:p),documents:c.documents.map(d=>d.pageId===pageId?{...d,title:page.title}:d)};
 const nextWs={...ws,overlays:o};
 validateNewTargets(page,next,nextWs);protectExactReferences(c,ws,next,nextWs);
 return o;
}
