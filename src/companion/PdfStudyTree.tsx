import React,{useState} from '../vendor/react.mjs';
import type {DocumentEntry,Workspace} from '../core/model.js';
import type {PdfCategory,PdfTerm} from './model.js';
import {activeSession} from '../core/workspace-slots.js';
import {resolveStudy,studyTreeKey,directCategoryPages} from './tree.js';
import {categoryFirstPage} from './validation.mjs';
import {Icon,IconButton} from '../components/Icon.js';
type Props={doc:DocumentEntry;workspace:Workspace;depth:number;onToggle:(key:string)=>void;onNavigate:(pageId:string,n:number,newTab?:boolean)=>void;onTerm:(doc:DocumentEntry,term:PdfTerm)=>void;onManage:(doc:DocumentEntry)=>void};
export function PdfStudyTree({doc,workspace,depth,onToggle,onNavigate,onTerm,onManage}:Props){
 const {companion,stale}=resolveStudy(doc,workspace),expanded=new Set(activeSession(workspace.personal).pdfTreeExpanded??[]);
 const [limits,setLimits]=useState<Record<string,number>>({});
 const key=(kind:string,id='')=>studyTreeKey(doc,kind,id);
 const isOpen=(kind:string,id='')=>expanded.has(key(kind,id));
 const jump=(n:number,e:any)=>{if(Number.isFinite(n))onNavigate(doc.pageId,n,e.ctrlKey||e.metaKey);};
 function pages(numbers:number[],level:number,parent:string){const limit=limits[parent]??80;return <>{numbers.slice(0,limit).map(n=><div key={n} className="tree-row pdf-study-page" style={{paddingLeft:10+level*14}}><span className="tree-indent"/><button className="tree-target" aria-label={'Go to PDF page '+n+' in '+doc.title} onClick={e=>jump(n,e)}><Icon name="page" size={14}/><span>{companion?.pages[String(n)]?.title??'Page '+n}</span><small>p.{n}</small></button></div>)}{numbers.length>limit&&<button className="text-button study-load-more" onClick={()=>setLimits({...limits,[parent]:limit+80})}>Show next pages ({numbers.length-limit} remaining)</button>}</>;}
 function term(t:PdfTerm,level:number){return <div className="tree-row pdf-study-term" key={t.id} style={{paddingLeft:10+level*14}}><span className="tree-indent"/><button className="tree-target" title={t.definition} aria-label={'Definition of '+t.label} onClick={()=>onTerm(doc,t)}><Icon name="link" size={13}/><span>{t.label}</span></button>{t.pageRefs.length>0&&<button className="study-page-link" aria-label={t.label+' on PDF page '+t.pageRefs[0]} onClick={e=>jump(t.pageRefs[0],e)}>p.{t.pageRefs[0]}</button>}</div>;}
 function categories(list:PdfCategory[],level:number):any{return list.map(c=>{const open=isOpen('category',c.id),n=categoryFirstPage(c);return <div className="pdf-study-category" key={c.id}>
  <div className="tree-row" style={{paddingLeft:10+level*14}}><button className="tree-expander" aria-label={(open?'Collapse PDF category ':'Expand PDF category ')+c.title} aria-expanded={open} onClick={()=>onToggle(key('category',c.id))}><Icon name={open?'down':'chevron'} size={12}/></button><button className="tree-target" onClick={()=>onToggle(key('category',c.id))} aria-expanded={open}><Icon name="folder" size={14}/><span>{c.title}</span></button>{Number.isFinite(n)&&<button className="study-page-link" aria-label={'Open '+c.title+' at PDF page '+n} onClick={e=>jump(n,e)}>p.{n}</button>}</div>
  {open&&<div className="tree-children">{categories(c.children??[],level+1)}{companion&&pages(directCategoryPages(c,companion),level+1,c.id)}{companion?.terms.filter(t=>t.categoryIds?.includes(c.id)).map(t=>term(t,level+1))}</div>}
 </div>;});}
 const glossaryOpen=isOpen('glossary'),pageListOpen=isOpen('pages');
 return <div className="pdf-study-tree" aria-label={'Study index for '+doc.title}>
  {companion?categories(companion.categories,depth):<>
   <div className="tree-row" style={{paddingLeft:10+depth*14}}><button className="tree-expander" aria-label={(pageListOpen?'Collapse':'Expand')+' PDF pages'} aria-expanded={pageListOpen} onClick={()=>onToggle(key('pages'))}><Icon name={pageListOpen?'down':'chevron'} size={12}/></button><button className="tree-target" onClick={()=>onToggle(key('pages'))}><Icon name="folder" size={14}/><span>Pages</span></button></div>
   {pageListOpen&&(doc.pageCount?pages(Array.from({length:Math.min(doc.pageCount,10000)},(_,i)=>i+1),depth+1,'pages'):<p className="study-tree-note">Page count is not available yet.</p>)}
  </>}
  {companion&&<><div className="tree-row" style={{paddingLeft:10+depth*14}}><button className="tree-expander" aria-label={(glossaryOpen?'Collapse':'Expand')+' PDF glossary'} aria-expanded={glossaryOpen} onClick={()=>onToggle(key('glossary'))}><Icon name={glossaryOpen?'down':'chevron'} size={12}/></button><button className="tree-target" onClick={()=>onToggle(key('glossary'))} aria-expanded={glossaryOpen}><Icon name="book" size={14}/><span>Glossary</span><small>{companion.terms.length}</small></button></div>{glossaryOpen&&<div className="tree-children">{companion.terms.slice(0,limits.glossary??80).map(t=>term(t,depth+1))}{companion.terms.length>(limits.glossary??80)&&<button className="text-button study-load-more" onClick={()=>setLimits({...limits,glossary:(limits.glossary??80)+80})}>Show more terms</button>}</div>}</>}
  {stale&&<p className="study-tree-note" role="status">A study index for another file revision was retained, but its links are not reused.</p>}
  <button className="text-button study-manage" onClick={()=>onManage(doc)}><Icon name="edit" size={13}/>Manage PDF details</button>
 </div>;
}
