import {walkBlocks} from '../core/validation.mjs';
import React,{useState,useEffect} from '../vendor/react.mjs';
import type {Catalogue,Workspace} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import {currentResourceTarget} from './content.js';
import {newLocation} from '../core/workspace.js';
import {sharedFolders} from './taxonomy.js';
import {normaliseReadingUrl,validateReadingTarget} from '../storage/reading-validation.mjs';
/** Builds the SAME typed payload consumed by reading actions; never encodes an ad-hoc URI. */
export function ResourcePicker({catalogue:c,workspace,onChange}:{catalogue:Catalogue;workspace:Workspace;onChange:(target:ReadingTarget|undefined,label:string)=>void}){
 const [source,setSource]=useState(''),[part,setPart]=useState('1'),[anchor,setAnchor]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState('');
 const page=c.pages.find(p=>'page:'+p.id===source),doc=c.documents.find(d=>d.pageId===page?.id),folders=sharedFolders(c,workspace.overlays);
 const sections:{id:string;label:string}[]=[];if(page?.cheatsheet){for(const item of page.cheatsheet.pages[Number(part)-1]?.outline??[])sections.push({id:item.blockId,label:item.label});}else if(page&&!doc&&!page.qcm)walkBlocks(page.blocks,b=>{if(b.type==='section')sections.push({id:b.id,label:b.title});});
 useEffect(()=>{try{let target:ReadingTarget|undefined,label='';
  if(page){target=currentResourceTarget(c,newLocation(page.id));label=page.title;
   if(doc){const n=Number(part);if(!Number.isInteger(n)||n<1||doc.pageCount&&n>doc.pageCount)throw Error('Choose an existing physical PDF page.');target={kind:'pdf-page',pageId:page.id,documentId:doc.id,pdfPage:n,...(doc.sha256?{revision:doc.sha256}:{})};}
   else if(page.cheatsheet){const n=Number(part),sheet=page.cheatsheet.pages[n-1];if(!sheet)throw Error('Choose an existing physical cheatsheet page.');target={kind:'cheatsheet-page',pageId:page.id,documentId:page.cheatsheet.id,sheetPage:n,anchor:{sheetId:sheet.id,sheetPage:n,...(anchor?{blockId:anchor}:{})}};}
   else if(page.qcm)target={kind:'qcm',setId:page.qcm.id,pageId:page.id,questionId:anchor||page.qcm.questions[0].id};
   else if(anchor&&target&&(target.kind==='page'||target.kind==='article'))target={...target,anchor:{blockId:anchor}};
  }else if(source.startsWith('capture:')){const id=source.slice(8);target={kind:'dashboard-item',itemId:id};label=workspace.personal.dashboardItems?.find(x=>x.id===id)?.text??id;}
  else if(source.startsWith('folder:')){const id=source.slice(7);target={kind:'collection',collectionId:id};label=folders.find(x=>x.id===id)?.title??id;}
  else if(source==='url'&&url.trim()){target={kind:'url',url:normaliseReadingUrl(url.trim())};label=url.trim();}
  if(target)validateReadingTarget(target);setError('');onChange(target,label);
 }catch(e){setError((e as Error).message);onChange(undefined,'');}},[source,part,anchor,url,c,workspace.overlays]);
 return <div className="resource-target-picker"><label>Link destination<select aria-label="Typed resource destination" value={source} onChange={e=>{setSource(e.target.value);setPart('1');setAnchor('');}}><option value="">Choose a resource</option><option value="url">External link (opens separately)</option><optgroup label="Documents">{c.pages.map(p=><option value={'page:'+p.id} key={p.id}>{c.documents.some(d=>d.pageId===p.id)?'PDF':p.kind??'Notebook'} / {p.title}</option>)}</optgroup><optgroup label="Notebook folders">{folders.map(f=><option value={'folder:'+f.id} key={f.id}>{f.path.join(' / ')}</option>)}</optgroup><optgroup label="Dashboard items">{workspace.personal.dashboardItems?.filter(i=>i.status!=='archived').map(i=><option value={'capture:'+i.id} key={i.id}>{i.text.slice(0,100)}</option>)}</optgroup></select></label>
 {source==='url'&&<label>URL<input aria-label="Typed external URL" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></label>}
 {(doc||page?.cheatsheet)&&<label>Physical page<input aria-label="Typed target physical page" type="number" min="1" max={doc?.pageCount??page?.cheatsheet?.pages.length} value={part} onChange={e=>{setPart(e.target.value);setAnchor('');}}/></label>}
 {sections.length>0&&<label>Section / heading<select aria-label="Typed target section" value={sections.some(s=>s.id===anchor)?anchor:''} onChange={e=>setAnchor(e.target.value)}><option value="">Whole page</option>{sections.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
 {page?.qcm?<label>Question<select aria-label="Typed target question" value={anchor||page.qcm.questions[0].id} onChange={e=>setAnchor(e.target.value)}>{page.qcm.questions.map((q,i)=><option key={q.id} value={q.id}>{i+1}. {q.prompt.slice(0,100)}</option>)}</select></label>:page&&!doc&&<label>Stable block ID (optional)<input aria-label="Typed target block ID" value={anchor} onChange={e=>setAnchor(e.target.value)} placeholder="Leave empty for the page"/></label>}
 {error&&<p role="alert" className="error-message">{error}</p>}</div>;
}
export function ResourceLink({target,label,onOpen}:{target:ReadingTarget;label:string;onOpen:(target:ReadingTarget)=>void}){
 return target.kind==='url'?<a href={target.url} target="_blank" rel="noopener noreferrer">{label}</a>:<button onClick={()=>onOpen(target)}>{label}</button>;
}
