import React,{ReactDOM,useEffect,useLayoutEffect,useMemo,useRef,useState} from '../vendor/react.mjs';
import type {Catalogue,Workspace} from '../core/model.js';
import {visibleLibraryNode} from '../core/library-projection.js';
import {FLAG_LABELS} from '../core/model.js';
import {collectionItems,collectionTarget,filterCollection} from '../core/collections.js';
import type {CollectionItem,CollectionFilter} from '../core/collections.js';
import {Icon,IconButton} from './Icon.js';

const initial:CollectionFilter={type:'all',language:'',domain:'',technology:'',text:'',sort:'tree'};
export function CollectionView({id,catalogue,workspace,onOpen,onOther,onManage,onBookmark,onCreate,onImport}: {id:string;catalogue:Catalogue;workspace:Workspace;onOpen:any;onOther?:any;onManage:any;onBookmark:any;onCreate:any;onImport:any}){
 const target=collectionTarget(catalogue,id);
 const [filter,setFilter]=useState(initial),[menu,setMenu]=useState<{item:CollectionItem;x:number;y:number;returnFocus:HTMLElement}|null>(null);
 const menuRef=useRef<HTMLDivElement|null>(null);
 const pdfMode=workspace.personal.session.libraryMode==='pdfs';
 const items=useMemo(()=>{const all=collectionItems(catalogue,workspace.overlays,id),pdfs=new Set(catalogue.documents.map(d=>d.pageId)),archived=new Set(workspace.overlays.archived);return pdfMode?all.filter(i=>visibleLibraryNode(i.node,pdfs,archived,'pdfs')):all;},[catalogue,workspace.overlays,id,pdfMode]);
 const shown=filterCollection(items,pdfMode?{...filter,type:'all'}:filter);
 const options=(key:'language'|'domains'|'technologies')=>[...new Set(items.flatMap(i=>key==='language'?[i.language]:i[key]))].sort();
 const change=(key:keyof CollectionFilter,value:string)=>setFilter(f=>({...f,[key]:value}));
 function dismiss(restore=false){const origin=menu?.returnFocus;setMenu(null);if(restore)origin?.focus();}
 function show(e:any,item:CollectionItem){e.preventDefault();e.stopPropagation();const el=e.currentTarget as HTMLElement,r=el.getBoundingClientRect();setMenu({item,x:e.clientX||r.left,y:e.clientY||r.bottom,returnFocus:(e.target instanceof Element?(e.target as Element).closest<HTMLButtonElement>('button'):null)??(el.matches('button')?el:el.querySelector<HTMLButtonElement>('.collection-open'))??el});}
 function choose(fn:()=>void){dismiss();fn();}
 function open(item:CollectionItem,newTab=false){onOpen(item.page?.id??item.node.id,undefined,newTab);}
 useLayoutEffect(()=>{if(!menu||!menuRef.current)return;const r=menuRef.current.getBoundingClientRect();menuRef.current.style.left=Math.max(8,Math.min(menu.x,innerWidth-r.width-8))+'px';menuRef.current.style.top=Math.max(8,Math.min(menu.y,innerHeight-r.height-8))+'px';menuRef.current.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();},[menu]);
 useEffect(()=>{if(!menu)return;const outside=(e:PointerEvent)=>{if(!menuRef.current?.contains(e.target as Node))dismiss();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[menu]);
 function menuKey(e:any){const buttons=[...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')??[])],at=buttons.indexOf(document.activeElement as HTMLButtonElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss(true);}else if(e.key==='Tab')dismiss();else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}}
 if(!target)return <div className="empty-pane"><h2>Folder unavailable</h2><p>This reading thread is retained. Restore its library or use Back.</p></div>;
 return <main className="collection-view" aria-label={'Collection: '+target.title}>
  <header className="collection-heading"><div><div className="eyebrow">FOLDER COLLECTION</div><h1>{target.title}</h1><p>{target.path.join(' / ')} <span aria-hidden="true"> / </span> {items.length} direct items</p></div><span className="project-icon large"><Icon name={target.folder?'folder':target.project.icon} size={25}/></span></header>
  <div className="collection-actions"><button onClick={()=>onCreate('page',target.project,target.folder)}><Icon name="plus"/>New note</button><button onClick={()=>onCreate('folder',target.project,target.folder)}><Icon name="folder"/>New folder</button><button onClick={()=>onImport(target.project.id,target.folder?.id)}><Icon name="pdf"/>Import PDF privately</button></div>
  <section className="collection-filters" aria-label="Filter collection">
   <div className="collection-type-filter" aria-label="Document type">{(pdfMode?[['all','PDF Library']]:[['all','All'],['note','Notes'],['pdf','PDFs']]).map(([value,label])=><button key={value} aria-pressed={filter.type===value} className={filter.type===value?'selected':''} onClick={()=>change('type',value)}>{label}</button>)}</div>
   <label className="collection-text-filter"><Icon name="search" size={16}/><input aria-label="Search this collection" value={filter.text} placeholder="Filter title, summary or tags" onChange={e=>change('text',e.target.value)}/></label>
   <label>Language<select aria-label="Collection language" value={filter.language} onChange={e=>change('language',e.target.value)}><option value="">All languages</option>{options('language').map(v=><option key={v} value={v}>{v==='unknown'?'Unknown':v.toUpperCase()}</option>)}</select></label>
   <label>Domain<select aria-label="Collection domain" value={filter.domain} onChange={e=>change('domain',e.target.value)}><option value="">All domains</option>{options('domains').map(v=><option key={v}>{v}</option>)}</select></label>
   <label>Technology<select aria-label="Collection technology" value={filter.technology} onChange={e=>change('technology',e.target.value)}><option value="">All technologies</option>{options('technologies').map(v=><option key={v}>{v}</option>)}</select></label>
   <label>Sort<select aria-label="Collection sort" value={filter.sort} onChange={e=>change('sort',e.target.value)}><option value="tree">Tree order</option><option value="title">Title A-Z</option></select></label>
  </section>
  <div className="collection-results-label" role="status">{shown.length} of {items.length} items <button className="text-button" onClick={()=>setFilter({...initial})}>Reset filters</button></div>
  <div className="collection-grid">{shown.map(item=>{const title=item.page?.title??item.node.title;return <article className="collection-card" key={item.node.id} data-item-type={item.type} data-node-id={item.node.id} onContextMenu={e=>show(e,item)} onKeyDown={e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')show(e,item);}}>
   <div className="collection-card-top"><span className={'collection-type-icon type-'+item.type}><Icon name={item.type==='note'?'page':item.type} size={21}/></span><span className="badge">{item.type==='pdf'?'PDF':item.type==='note'?'Note':'Folder'}</span><IconButton name="more" label={'Collection actions for '+title} aria-haspopup="menu" onClick={e=>show(e,item)}/></div>
   <button className="collection-open" title={title} onClick={e=>open(item,e.ctrlKey||e.metaKey)} onAuxClick={e=>{if(e.button===1){e.preventDefault();open(item,true);}}}>{title}</button>
   <p className="collection-summary">{item.summary||'No summary yet.'}</p>
   <div className="collection-facets">{(item.page?.tags??[]).filter(t=>/^(doctype|domain|tech|level|source):/.test(t)).map(tag=><span className="facet-chip" key={tag} title={tag}>{tag}</span>)}</div>
   <footer className="collection-card-meta"><span>{item.language==='unknown'?'Language unknown':item.language.toUpperCase()}{item.document?.pageCount?' / '+item.document.pageCount+' pages':''}</span>{item.page&&workspace.personal.session.showFlags&&<span className="collection-flag"><span className={'flag-dot '+(workspace.personal.ratings[item.page.id]??'gray')}/>{FLAG_LABELS[workspace.personal.ratings[item.page.id]??'gray']}</span>}</footer>
  </article>;})}</div>
  {!shown.length&&<div className="empty-state"><Icon name="folder" size={34}/><h2>{items.length?'No matching items':'A place for notes and PDFs'}</h2><p>{items.length?'Change a filter to see more of this folder.':'Add a note, create a subfolder or import a private PDF. The tree stays the source of truth.'}</p></div>}
  {menu&&(ReactDOM as any).createPortal(<div ref={menuRef} className="tree-context-menu collection-context-menu" role="menu" aria-label={'Collection actions for '+(menu.item.page?.title??menu.item.node.title)} style={{left:menu.x,top:menu.y}} onKeyDown={menuKey}>
   <div className="tree-menu-title">{menu.item.page?.title??menu.item.node.title}</div>
   <button role="menuitem" onClick={()=>choose(()=>open(menu.item))}><Icon name="page"/>Open</button>
   <button role="menuitem" onClick={()=>choose(()=>open(menu.item,true))}><Icon name="plus"/>Open in new tab</button>
   {onOther&&<button role="menuitem" onClick={()=>choose(()=>onOther(menu.item.page?.id??menu.item.node.id))}><Icon name="split"/>Open in other pane</button>}
   {menu.item.page&&<button role="menuitem" onClick={()=>choose(()=>onBookmark(menu.item.page!.id))}><Icon name="bookmark"/>Bookmark</button>}
   <div role="separator"/>
   {['rename','move','archive'].map(intent=><button key={intent} role="menuitem" onClick={()=>choose(()=>onManage({project:menu.item.project,node:menu.item.node,intent}))}><Icon name={intent==='rename'?'edit':intent==='move'?'folder':'archive'}/>{intent[0].toUpperCase()+intent.slice(1)}</button>)}
  </div>,document.body)}
 </main>;
}
