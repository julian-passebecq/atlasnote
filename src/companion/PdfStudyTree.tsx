import React,{useState} from '../vendor/react.mjs';
import type {DocumentEntry,Workspace} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import {activeSession} from '../core/workspace-slots.js';
import {resolveStudy,studyTreeKey,categoryPageRows,shortPageTitle} from './tree.js';
import {Icon,IconButton} from '../components/Icon.js';
type Props={doc:DocumentEntry;workspace:Workspace;depth:number;onToggle:(key:string)=>void;onNavigate:(pageId:string,n:number,newTab?:boolean)=>void;onTerm?:any;onManage:(doc:DocumentEntry)=>void;onActions?:(target:ReadingTarget,title:string,event:any)=>void};
export function PdfStudyTree({doc,workspace,depth,onToggle,onNavigate,onManage,onActions}:Props){
 const {companion,stale}=resolveStudy(doc,workspace),expanded=new Set(activeSession(workspace.personal).pdfTreeExpanded??[]),[limits,setLimits]=useState<Record<string,number>>({});
 const key=(id:string)=>studyTreeKey(doc,'category',id),revision=doc.sha256?{revision:doc.sha256}:{};
 const jump=(n:number,e:any)=>{e.preventDefault();onNavigate(doc.pageId,n,e.ctrlKey||e.metaKey||e.button===1);};
 const groups=companion?.categories.length?companion.categories.map(c=>({id:c.id,title:c.title,rows:categoryPageRows(c,companion)})):[{id:'pages',title:'Pages',rows:Array.from({length:Math.min(doc.pageCount??0,10000)},(_,i)=>({id:String(i+1),page:i+1,title:'Page '+(i+1)}))}];
 return <div className="pdf-study-tree" aria-label={'Study index for '+doc.title}>
 {groups.map(c=>{const open=expanded.has(key(c.id)),first=c.rows[0]?.page??1;const categoryTarget:ReadingTarget={kind:'pdf-category',pageId:doc.pageId,documentId:doc.id,...revision,pdfCategoryId:c.id,pdfPage:first};return <div className="pdf-study-category" key={c.id} data-pdf-category={c.id}>
  <div className="tree-row" style={{paddingLeft:10+depth*14}} onContextMenu={e=>onActions?.(categoryTarget,c.title,e)}>
   <button className="tree-expander" aria-label={(open?'Collapse PDF category ':'Expand PDF category ')+c.title} aria-expanded={open} onClick={()=>onToggle(key(c.id))}><Icon name={open?'down':'chevron'} size={12}/></button>
   <button className="tree-target" title={c.title} onClick={()=>onToggle(key(c.id))} aria-expanded={open}><Icon name="folder" size={14}/><span>{shortPageTitle(c.title)}</span></button>
   {onActions&&<IconButton name="more" className="study-actions" label={'Actions for PDF category '+c.title} onClick={(e:any)=>onActions(categoryTarget,c.title,e)}/>}
  </div>
  {open&&<div className="tree-children">{c.rows.slice(0,limits[c.id]??80).map(row=>{const target:ReadingTarget={kind:'pdf-page',pageId:doc.pageId,documentId:doc.id,...revision,pdfPage:row.page};return <div key={row.id} data-pdf-page={row.page} className="tree-row pdf-study-page" style={{paddingLeft:10+(depth+1)*14}} onContextMenu={e=>onActions?.(target,row.title,e)}>
    {onActions?<IconButton name="more" className="study-actions" label={'Actions for '+row.title+' on PDF page '+row.page} onClick={(e:any)=>onActions(target,row.title,e)}/>:<span className="tree-indent"/>}
    <button className="tree-target" title={row.title} aria-label={'Go to PDF page '+row.page+' in '+doc.title} onClick={e=>jump(row.page,e)} onAuxClick={e=>{if(e.button===1)jump(row.page,e);}}><Icon name="page" size={14}/><span>{shortPageTitle(row.title)}</span></button>
    <button className="study-page-link" title={row.title} aria-label={'Open '+row.title+' at PDF page '+row.page} onClick={e=>jump(row.page,e)} onAuxClick={e=>{if(e.button===1)jump(row.page,e);}}>p.{row.page}</button>
   </div>;})}{c.rows.length>(limits[c.id]??80)&&<button className="text-button study-load-more" onClick={()=>setLimits({...limits,[c.id]:(limits[c.id]??80)+80})}>Show next pages</button>}{!c.rows.length&&<p className="study-tree-note">No physical pages mapped yet.</p>}</div>}
 </div>;})}
 {stale&&<p className="study-tree-note" role="status">A study index for another file revision was retained; its links are not reused.</p>}
 <button className="text-button study-manage" onClick={()=>onManage(doc)}><Icon name="edit" size={13}/>Manage PDF details</button>
 </div>;
}
