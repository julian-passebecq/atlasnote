import React,{useState,useEffect,useRef,useSyncExternalStore} from '../vendor/react.mjs';
import type {DocumentEntry,Workspace} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import {activeSession} from '../core/workspace-slots.js';
import {resolveStudy,studyTreeKey,categoryPageRows,shortPageTitle,fallbackPageRows,visibleRowIndexes} from './tree.js';
import {subscribeReaderState,readerStateVersion,positionsForDocument,verifiedPageCount} from '../pdf/reader-state.js';
import {Icon,IconButton} from '../components/Icon.js';
type Props={doc:DocumentEntry;workspace:Workspace;depth:number;onToggle:(key:string)=>void;onNavigate:(pageId:string,n:number,newTab?:boolean)=>void;onTerm?:any;onManage:(doc:DocumentEntry)=>void;onActions?:(target:ReadingTarget,title:string,event:any)=>void};
export function PdfStudyTree({doc,workspace,depth,onToggle,onNavigate,onManage,onActions}:Props){
 const {companion,stale}=resolveStudy(doc,workspace),expanded=new Set(activeSession(workspace.personal).pdfTreeExpanded??[]),[limits,setLimits]=useState<Record<string,number>>({});
 // V3: runtime reader position (not persisted). The primary page is the one the
 // active pane requested; other displayed pages get a secondary marker.
 useSyncExternalStore(subscribeReaderState,readerStateVersion);
 const slot=workspace.personal.activeWorkspaceSlot??1,session=activeSession(workspace.personal);
 const readers=positionsForDocument(slot,doc.id,doc.sha256),driver=readers.find(r=>r.paneId===session.activePane)??readers[0];
 const current=driver?.page,visiblePages=new Set(readers.flatMap(r=>r.visible));
 const paneLabel=(page:number)=>session.panes.length>1?readers.filter(r=>r.visible.includes(page)).map(r=>session.panes.findIndex(p=>p.id===r.paneId)===0?'A':'B').sort().join(''):'';
 const verified=verifiedPageCount(doc.id,doc.sha256),count=verified??doc.pageCount??0;
 const root=useRef<HTMLDivElement|null>(null),userActive=useRef(0);
 useEffect(()=>{const el=root.current;if(!el||current===undefined||Date.now()-userActive.current<1500)return;el.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView?.({block:'nearest'});},[current]);
 const key=(id:string)=>studyTreeKey(doc,'category',id),revision=doc.sha256?{revision:doc.sha256}:{};
 const jump=(n:number,e:any)=>{e.preventDefault();onNavigate(doc.pageId,n,e.ctrlKey||e.metaKey||e.button===1);};
 const groups=companion?.categories.length?companion.categories.map(c=>({id:c.id,title:c.title,rows:categoryPageRows(c,companion)})):[{id:'pages',title:'Pages',rows:fallbackPageRows(companion?.pageCount??count,companion)}];
 return <div className="pdf-study-tree" ref={root} aria-label={'Study index for '+doc.title} onWheel={()=>{userActive.current=Date.now();}} onPointerDown={()=>{userActive.current=Date.now();}} onKeyDown={()=>{userActive.current=Date.now();}}>
 {verified!==undefined&&doc.pageCount!==undefined&&verified!==doc.pageCount&&<p className="study-tree-note" role="status">The library lists {doc.pageCount} pages; the opened file has {verified}. Metadata was not changed. Use Manage PDF details to review it.</p>}
 {groups.map(c=>{const open=expanded.has(key(c.id)),first=c.rows[0]?.page??1;const categoryTarget:ReadingTarget={kind:'pdf-category',pageId:doc.pageId,documentId:doc.id,...revision,pdfCategoryId:c.id,pdfPage:first};return <div className="pdf-study-category" key={c.id} data-pdf-category={c.id}>
  <div className="tree-row" style={{paddingLeft:4+depth*8}} onContextMenu={e=>onActions?.(categoryTarget,c.title,e)}>
   <button className="tree-expander" aria-label={(open?'Collapse PDF category ':'Expand PDF category ')+c.title} aria-expanded={open} onClick={()=>onToggle(key(c.id))}><Icon name={open?'down':'chevron'} size={12}/></button>
   <button className="tree-target" title={c.title} onClick={()=>onToggle(key(c.id))} aria-expanded={open}><Icon name="folder" size={14}/><span>{shortPageTitle(c.title)}</span></button>
   {onActions&&<IconButton name="more" className="study-actions" label={'Actions for PDF category '+c.title} onClick={(e:any)=>onActions(categoryTarget,c.title,e)}/>}
  </div>
  {open&&<div className="tree-children">{visibleRowIndexes(c.rows,limits[c.id]??80,current).map(i=>{if(i<0)return <p key={'gap'+i} className="study-tree-gap" aria-hidden="true">⋯</p>;const row=c.rows[i],here=row.page===current,shown=!here&&visiblePages.has(row.page),panes=paneLabel(row.page);const target:ReadingTarget={kind:'pdf-page',pageId:doc.pageId,documentId:doc.id,...revision,pdfPage:row.page};return <div key={row.id} data-pdf-page={row.page} aria-current={here?'page':undefined} className={'tree-row pdf-study-page'+(here?' pdf-current':shown?' pdf-visible':'')} style={{paddingLeft:4+(depth+1)*8}} onContextMenu={e=>onActions?.(target,row.title,e)}>
    {onActions?<IconButton name="more" className="study-actions" label={'Actions for '+row.title+' on PDF page '+row.page} onClick={(e:any)=>onActions(target,row.title,e)}/>:<span className="tree-indent"/>}
    <button className="tree-target" title={row.title} aria-label={'Go to PDF page '+row.page+' in '+doc.title} onClick={e=>jump(row.page,e)} onMouseDown={e=>{if(e.button===1)e.preventDefault();}} onAuxClick={e=>{if(e.button===1)jump(row.page,e);}}><Icon name="page" size={14}/><span>{shortPageTitle(row.title)}</span>{panes&&<small className="pdf-pane-marker" aria-label={'Shown in pane '+panes.split('').join(' and ')}>{panes}</small>}</button>
    {!row.generic&&<button className="study-page-link" title={row.title} aria-label={'Open '+row.title+' at PDF page '+row.page} onClick={e=>jump(row.page,e)} onMouseDown={e=>{if(e.button===1)e.preventDefault();}} onAuxClick={e=>{if(e.button===1)jump(row.page,e);}}>p.{row.page}</button>}
   </div>;})}{c.rows.length>(limits[c.id]??80)&&<button className="text-button study-load-more" onClick={()=>setLimits({...limits,[c.id]:(limits[c.id]??80)+80})}>Show next pages</button>}{!c.rows.length&&<p className="study-tree-note">No physical pages mapped yet.</p>}</div>}
 </div>;})}
 {stale&&<p className="study-tree-note" role="status">A study index for another file revision was retained; its links are not reused.</p>}
 <button className="text-button study-manage" onClick={()=>onManage(doc)}><Icon name="edit" size={13}/>Manage PDF details</button>
 </div>;
}
