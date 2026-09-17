import type {Page,Personal,Overlays,Catalogue,Workspace,Location} from '../core/model.js';
import type {ArticleSource,QcmDocument,QcmAttempt,TaxonomyRef,DashboardItem,NotebookReference,LibraryMode} from './model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import {uid} from '../core/workspace.js';
import {validateArticleSource,validateQcm,validateHubPage,validateHubPersonal,validateHubOverlays,validateTaxonomy,HUB_LIMITS} from './validation.mjs';
import {normaliseReadingUrl,validateReadingTarget} from '../storage/reading-validation.mjs';
import {targetForPage} from '../core/reading-lists.js';
export function libraryModeForPage(c:Catalogue,id:string):LibraryMode {
 const p=c.pages.find(p=>p.id===id);return c.documents.some(d=>d.pageId===id)?'pdfs':p?.kind==='cheatsheet'?'cheatsheets':p?.kind==='article'?'articles':p?.kind==='qcm'?'qcm':'notes';
}
const wrapper=(id:string,title:string):Page=>({id,title,summary:'',blocks:[],related:[],terms:[],sources:[],tags:[]});
export function articlePage(source:ArticleSource,now=Date.now()):Page {
 validateArticleSource(source,now);const {text,blocks,...metadata}=structuredClone(source);
 const article={...metadata,addedAt:metadata.addedAt??now};
 return {...wrapper(source.id,source.title),kind:'article',article,blocks:blocks??(text?[{id:uid('block.article'),type:'markdown',text}]:[])};
}
export function qcmPage(source:QcmDocument):Page {validateQcm(source);return {...wrapper(source.id,source.title),kind:'qcm',qcm:structuredClone(source),summary:source.questions.length+' questions. Practice and review, without a timer.'};}
export function articleExport(page:Page):ArticleSource {
 if(!page.article)throw Error('This is not an article.');return {...structuredClone(page.article),blocks:structuredClone(page.blocks)};
}
export function putContent(o:Overlays,page:Page,c:Catalogue,editing=false){
 if(c.pages.some(p=>p.id===page.id)&&!editing)throw Error('This source ID already exists. Edit the existing resource or give the imported source a new ID.');
 const old=c.pages.find(p=>p.id===page.id);if(editing&&(!old||old.kind!==page.kind))throw Error('Cannot replace a different resource kind.');
 if(editing&&old)page={...old,...page,related:old.related,resourceLinks:old.resourceLinks,terms:old.terms,sources:old.sources,tags:old.tags};
 validateHubPage(page);o.pages[page.id]={...o.pages[page.id],page:structuredClone(page)};
}
export function currentResourceTarget(c:Catalogue,loc?:Location):ReadingTarget|undefined {
 if(!loc)return;const p=c.pages.find(x=>x.id===loc.pageId);if(!p)return loc.collectionId?{kind:'collection',collectionId:loc.collectionId}:undefined;
 if(p.qcm)return {kind:'qcm',setId:p.qcm.id,pageId:p.id,...(loc.anchor?.questionId?{questionId:loc.anchor.questionId}:{questionId:p.qcm.questions[0].id})};
 if(p.article)return {kind:'article',articleId:p.article.id,pageId:p.id,...(loc.anchor?{anchor:structuredClone(loc.anchor)}:{})};
 if(p.cheatsheet)return {kind:'cheatsheet-page',pageId:p.id,documentId:p.cheatsheet.id,sheetPage:loc.sheetPage??loc.anchor?.sheetPage??1,...(loc.anchor?{anchor:structuredClone(loc.anchor)}:{})};
 const doc=c.documents.find(d=>d.pageId===p.id);return doc?targetForPage(c,p.id,{...loc.anchor,pdfPage:loc.pdfPage,...(doc.sha256?{pdfRevision:doc.sha256}:{})}):targetForPage(c,p.id,loc.anchor);
}
export type CaptureRow={text:string;url?:string;due?:string;important?:boolean};
export function captureRows(p:Personal,kind:'link'|'task'|'note',rows:CaptureRow[],taxonomy?:TaxonomyRef,context?:ReadingTarget,now=Date.now()):DashboardItem[]{
 if(rows.length>5)throw Error('Save up to five rows at once.');if(taxonomy)validateTaxonomy(taxonomy);if(context)validateReadingTarget(context);
 const items:DashboardItem[]=rows.filter(r=>r.text.trim()||r.url?.trim()).map(row=>{
  const url=kind==='link'?normaliseReadingUrl(row.url?.trim()||row.text.trim()):undefined;
  let dueAt:number|undefined;if(kind==='task'&&row.due){if(!/^\d{4}-\d{2}-\d{2}$/.test(row.due))throw Error('Choose a valid task date.');dueAt=Date.parse(row.due+'T12:00:00Z');if(!Number.isFinite(dueAt)||new Date(dueAt).toISOString().slice(0,10)!==row.due)throw Error('Choose a valid task date.');}
  return {id:uid('capture'),kind,text:row.text.trim()||url!,status:kind==='task'?'open':'inbox',createdAt:now,...(url?{url}:{}),...(dueAt!==undefined?{dueAt}:{}),...(row.important?{important:true}:{}),...(taxonomy?{taxonomy:structuredClone(taxonomy)}:{}),...(context?{contextTarget:structuredClone(context)}:{})};
 });
 if(!items.length)throw Error('Enter at least one item.');const next={...p,dashboardItems:[...items,...(p.dashboardItems??[])]};validateHubPersonal(next);p.dashboardItems=next.dashboardItems;return items;
}
export function updateCapture(p:Personal,id:string,patch:Partial<Pick<DashboardItem,'text'|'status'|'taxonomy'|'important'|'dueAt'>>,now=Date.now()){
 const next=structuredClone(p);const item=next.dashboardItems?.find(x=>x.id===id);if(!item)throw Error('Capture is unavailable.');Object.assign(item,patch,{updatedAt:now});validateHubPersonal(next);p.dashboardItems=next.dashboardItems;
}
export function addNotebookReference(o:Overlays,target:ReadingTarget,title:string,taxonomy:TaxonomyRef,now=Date.now()):NotebookReference {
 validateReadingTarget(target);validateTaxonomy(taxonomy);
 const existing=o.references?.find(r=>JSON.stringify(r.target)===JSON.stringify(target)&&r.taxonomy.subject===taxonomy.subject&&r.taxonomy.folderId===taxonomy.folderId);if(existing)return existing;
 const r={id:uid('reference'),title,target:structuredClone(target),taxonomy:structuredClone(taxonomy),createdAt:now};const next={...o,references:[...(o.references??[]),r]};validateHubOverlays(next);o.references=next.references;return r;
}
export function updateReference(o:Overlays,id:string,title:string,taxonomy:TaxonomyRef){const next=structuredClone(o),r=next.references?.find(r=>r.id===id);if(!r)throw Error('Reference is unavailable.');r.title=title;r.taxonomy=structuredClone(taxonomy);validateHubOverlays(next);o.references=next.references;}
export function removeReference(o:Overlays,id:string){o.references=o.references?.filter(r=>r.id!==id);}
export function answerQuestion(p:Personal,doc:QcmDocument,questionId:string,selected:string[],reflection='',revealed=false,now=Date.now()):QcmAttempt {
 validateQcm(doc);const q=doc.questions.find(q=>q.id===questionId);if(!q)throw Error('Question unavailable.');validateSelection(q,selected);if(!revealed&&!selected.length)throw Error('Select an answer before checking.');
 const history=p.qcmAttempts?.filter(a=>a.setId===doc.id&&a.questionId===questionId)??[];
 const a:QcmAttempt={id:uid('attempt'),setId:doc.id,questionId,selectedOptionIds:[...selected],correct:!revealed&&selected.length===q.correctOptionIds.length&&q.correctOptionIds.every(id=>selected.includes(id)),answeredAt:now,attemptNumber:Math.max(0,...history.map(a=>a.attemptNumber))+1,reflection,...(revealed?{revealed:true}:{})};
 const next={...p,qcmAttempts:[...(p.qcmAttempts??[]),a]};validateHubPersonal(next);p.qcmAttempts=next.qcmAttempts;return a;
}
function validateSelection(q:QcmDocument['questions'][number],selected:string[]){if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.some(id=>!q.options.some(o=>o.id===id))||q.correctOptionIds.length===1&&selected.length>1)throw Error('Choose valid options for this question.');}
export function saveResponse(p:Personal,doc:QcmDocument,questionId:string,selected:string[],reflection:string,now=Date.now()){
 const q=doc.questions.find(q=>q.id===questionId);if(!q)throw Error('Question unavailable.');validateSelection(q,selected);
 const response={setId:doc.id,questionId,selectedOptionIds:[...selected],reflection,updatedAt:now};const next={...p,qcmResponses:[...(p.qcmResponses??[]).filter(r=>r.setId!==doc.id||r.questionId!==questionId),response]};validateHubPersonal(next);p.qcmResponses=next.qcmResponses;
}
export function reflectAttempt(p:Personal,attemptId:string,reflection:string){const next=structuredClone(p),a=next.qcmAttempts?.find(a=>a.id===attemptId);if(!a)throw Error('Attempt unavailable.');a.reflection=reflection;validateHubPersonal(next);p.qcmAttempts=next.qcmAttempts;}
export function qcmProgress(p:Personal,doc:QcmDocument){const latest=doc.questions.map(q=>(p.qcmAttempts??[]).filter(a=>a.setId===doc.id&&a.questionId===q.id).sort((a,b)=>b.attemptNumber-a.attemptNumber)[0]).filter(Boolean);return {total:doc.questions.length,answered:latest.length,correct:latest.filter(a=>a.correct).length,review:latest.filter(a=>!a.correct).length};}
/** A bounded user-initiated export, not an AI call. Includes every option's explanation. */
export function qcmAiExport(p:Personal,doc:QcmDocument,from=1,to=Math.min(doc.questions.length,50)){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>doc.questions.length||to-from>=100)throw Error('Choose 1-100 questions within the set.');
 return {schemaVersion:1,kind:'atlas-qcm-review',setId:doc.id,title:doc.title,...(doc.taxonomy?{taxonomy:doc.taxonomy}:{}),range:{from,to},questions:doc.questions.slice(from-1,to).map(q=>{
  const attempts=(p.qcmAttempts??[]).filter(a=>a.setId===doc.id&&a.questionId===q.id).sort((a,b)=>a.attemptNumber-b.attemptNumber),last=attempts.at(-1),draft=p.qcmResponses?.find(r=>r.setId===doc.id&&r.questionId===q.id);
  return {...q,selectedOptionIds:last?.selectedOptionIds??draft?.selectedOptionIds??[],result:last?last.revealed?'revealed':last.correct?'correct':'incorrect':'unanswered',reflection:last?.reflection??draft?.reflection??'',attempts:structuredClone(attempts)};
 })};
}
export function downloadJSON(value:unknown,name:string){const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}

/** Remove only a privately created Article/QCM source. Dependent targets and personal history remain explicit unresolved references. */
export function removeLocalContent(o:Overlays,c:Catalogue,pageId:string){
 const page=o.pages[pageId]?.page;if(!page||!['article','qcm'].includes(page.kind??''))throw Error('Only a local Article or QCM source can be removed.');
 if(c.packs.some(pack=>pack.pages.some(p=>p.id===pageId)))throw Error('This belongs to an imported/bundled pack. Archive it instead of deleting its source.');
 delete o.pages[pageId];if(o.taxonomy)delete o.taxonomy[pageId];
}
export function addRelatedTarget(o:Overlays,c:Catalogue,pageId:string,label:string,target:ReadingTarget,removeIndex?:number){
 const source=o.pages[pageId]?.page??c.pages.find(p=>p.id===pageId);if(!source)throw Error('Source is unavailable.');const page=structuredClone(source);page.resourceLinks??=[];
 if(removeIndex!==undefined)page.resourceLinks.splice(removeIndex,1);else {validateReadingTarget(target);page.resourceLinks.push({label,target:structuredClone(target)});}
 validateHubPage(page);o.pages[pageId]={...o.pages[pageId],page};
}
