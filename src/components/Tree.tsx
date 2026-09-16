import {projectLibrary} from '../content-hub/taxonomy.js';
import {LIBRARY_TYPES,subjectFromCategory} from '../content-hub/model.js';
import {targetForPage} from '../core/reading-lists.js';
import {readingTargetId} from '../core/reading-types.js';
import {locations} from '../core/workspace.js';
import {pdfNavigationSections} from '../core/pdf-navigation.js';
import {PdfStudyTree} from '../companion/PdfStudyTree.js';
import {studyTreeKey} from '../companion/tree.js';
import {activeSession,WORKSPACE_NUMBERS,CATEGORIES,categoryMatches} from '../core/workspace-slots.js';
import React,{useState,useEffect,useLayoutEffect,useRef} from '../vendor/react.mjs';
import type {Catalogue,TreeNode,Project,Workspace} from '../core/model.js';
import {Icon,IconButton} from './Icon.js';
import {visibleLibraryNode} from '../core/library-projection.js';
import {normalize} from '../core/workspace.js';

type MenuState={project:Project;node?:TreeNode;x:number;y:number;returnFocus:HTMLElement};
/** All tree actions also have an ordinary, keyboard-focusable Actions button. */
export function ProjectTree({catalogue:source,workspace:ws,onTypeAdd,onResourceOpen,onReferenceEdit,onManageLibrary,activePage,panePages=[],activePaneIndex=0,navigation,onLibraryMode,onReadingActions,onReadLater,onPdfToggle,onPdfNavigate,onPdfTerm,onPdfManage,onWorkspace,onCategory,onSidebar,onPaneMarker,onGroupToggle,onCollection,onOpen,onOther,onBookmark,onToggle,onItem,onCreate}:any){
 const [filterOpen,setFilterOpen]=useState(false),[filter,setFilter]=useState(''),[menu,setMenu]=useState<MenuState|null>(null);
 const menuRef=useRef<HTMLDivElement|null>(null);
 const currentMode=activeSession(ws.personal).libraryMode??'notes';const c={...source,projects:projectLibrary(source,ws.overlays,currentMode,subjectFromCategory(activeSession(ws.personal).categoryFilter))};
 const expanded=new Set(activeSession(ws.personal).expanded),archived=new Set<string>(ws.overlays.archived),query=normalize(filter);
 const mode=activeSession(ws.personal).libraryMode??'notes',pdfPages=new Set<string>(c.documents.map((d:any)=>d.pageId));
 const visible=(n:TreeNode):boolean=>!archived.has(n.id)&&(!n.pageId||!archived.has(n.pageId));
 const matches=(n:TreeNode):boolean=>{const p=source.pages.find((p:any)=>p.id===(n.pageId??(n.target?readingTargetId(n.target):'')));const words=normalize([n.title,...(p?.tags??[])].join(' ').replace(/[-_]/g,' '));return visible(n)&&(!query||words.includes(query)||!!n.children?.some(matches));};
 const hidden=(p:Project)=>ws.overlays.projectPrefs[p.id]?.hidden||archived.has(p.id);
 function dismiss(restoreFocus=true){const target=menu?.returnFocus;setMenu(null);if(restoreFocus&&target?.isConnected)target.focus();}
 function showMenu(e:any,project:Project,node?:TreeNode){
  if(!node&&project.id.startsWith('project.unfiled.')){e.preventDefault();return;}
  if(node?.target){onReadingActions(node.target,node.title,e);return;}
  if(node?.pageId&&mode!=='notes'){onReadingActions(targetForPage(source,node.pageId),node.title,e);return;}
  if(node?.pageId){const original=locations(source).get(node.pageId);if(original){project=original.project;node={...node,id:original.nodeId};}}
  e.preventDefault();e.stopPropagation();
  const el=e.currentTarget as HTMLElement,r=el.getBoundingClientRect();
  setMenu({project,node,x:e.clientX||r.left,y:e.clientY||r.bottom,returnFocus:el.matches('button')?el:el.querySelector('button')??el});
 }
 function keyboardMenu(e:any,p:Project,n?:TreeNode){if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')showMenu(e,p,n);}
 useLayoutEffect(()=>{
  const el=menuRef.current;if(!menu||!el)return;
  const r=el.getBoundingClientRect();
  el.style.left=Math.max(8,Math.min(menu.x,window.innerWidth-r.width-8))+'px';
  el.style.top=Math.max(8,Math.min(menu.y,window.innerHeight-r.height-8))+'px';
  el.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
 },[menu]);
 useEffect(()=>{
  if(!menu)return;
  const outside=(e:PointerEvent)=>{if(!menuRef.current?.contains(e.target as Node))dismiss(false);};
  const resize=()=>dismiss(false);
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',resize);};
 },[menu]);
 function action(fn:()=>void){dismiss(false);fn();}
 function menuKey(e:any){
  const buttons=[...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')??[])];
  const i=buttons.indexOf(document.activeElement as HTMLButtonElement);
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();}
  else if(e.key==='Tab'){dismiss();}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();
  }
 }
 function nodes(ns:TreeNode[],p:Project,depth:number,matchedPath=false):any{
  return ns.filter(n=>visible(n)&&(matchedPath||matches(n))).map(n=>{
   const doc=c.documents.find((d:any)=>d.pageId===n.pageId),pdfKey=doc?studyTreeKey(doc,'document'):'',pdfOpen=doc&&(activeSession(ws.personal).pdfTreeExpanded??[]).includes(pdfKey);
   const owners=[0,1].filter(i=>(n.pageId??(n.target?readingTargetId(n.target):undefined))&&panePages[i]===(n.pageId??(n.target?readingTargetId(n.target):undefined)));const open=expanded.has(n.id)||!!query,page=c.pages.find((p:any)=>p.id===n.pageId);
   return <div className="tree-node" key={n.id}>
    <div className={'tree-row '+(n.pageId===activePage?'active ':'')+owners.map(i=>'pane-owner-'+(i===0?'a':'b')).join(' ')} data-node-id={n.id} data-pane-owners={owners.map(i=>i===0?'a':'b').join(' ')} style={{paddingLeft:(mode==='pdfs'?4+depth*8:10+depth*14)+'px'}} onContextMenu={e=>showMenu(e,p,n)} onKeyDown={e=>keyboardMenu(e,p,n)}>
     <>{doc?<button className="tree-expander" aria-label={(pdfOpen?'Collapse PDF ':'Expand PDF ')+n.title} aria-expanded={pdfOpen} onClick={()=>onPdfToggle(pdfKey)}><Icon name={pdfOpen?'down':'chevron'} size={12}/></button>:n.children&&<button className="tree-expander" aria-label={(open?'Collapse ':'Expand ')+n.title} aria-expanded={open} onClick={()=>onToggle(n.id)}><Icon name={open?'down':'chevron'} size={12}/></button>}<button className="tree-target" title={n.title} aria-expanded={n.children?open:undefined} aria-current={n.pageId===activePage?'page':undefined}
      onClick={e=>n.target?onResourceOpen(n.target,e.ctrlKey||e.metaKey?'tab':'here'):n.pageId?onOpen(n.pageId,undefined,e.ctrlKey||e.metaKey):(onCollection(n.id,undefined,e.ctrlKey||e.metaKey),!open&&onToggle(n.id))}
      onMouseDown={e=>{if(e.button===1)e.preventDefault();}}
      onAuxClick={e=>{if(e.button===1){e.preventDefault();if(n.target)onResourceOpen(n.target,'tab');else onOpen(n.pageId??n.id,undefined,true);}}}>
      {!n.children&&!doc&&<span className="tree-indent"/>}
      <Icon name={n.children?'folder':c.documents.some((d:any)=>d.pageId===n.pageId)?'pdf':n.target?(n.target.kind.startsWith('pdf-')?'pdf':n.target.kind==='cheatsheet-page'?'grid':n.target.kind==='qcm'?'help':n.target.kind==='article'?'page':'link'):page?.cheatsheet?'grid':page?.qcm?'help':'page'} size={15}/><span>{n.target?n.title:page?.title??n.title}</span>{n.target&&<small className="reference-kind">{n.target.kind==='page'?'Notebook':n.target.kind.startsWith('pdf-')?'PDF':n.target.kind==='cheatsheet-page'?'Cheatsheet':n.target.kind==='qcm'?'QCM':n.target.kind==='article'?'Article':'Reference'}</small>}
     </button></>
     {owners.length>0&&<span className="tree-pane-markers" aria-label={owners.length===2?'Open in panes A and B':'Open in pane '+(owners[0]===0?'A':'B')}>{owners.map(i=><button key={i} title={'Reveal pane '+(i===0?'A':'B')} aria-label={'Reveal pane '+(i===0?'A':'B')+' for '+n.title} onClick={()=>onPaneMarker(i)} className={'tree-pane-marker marker-'+(i===0?'a':'b')+(i===activePaneIndex?' is-active':'')}>{i===0?'A':'B'}</button>)}</span>}
     {n.pageId&&activeSession(ws.personal).showFlags&&ws.personal.ratings[n.pageId]&&<span className={'flag-dot '+ws.personal.ratings[n.pageId]} title={ws.personal.ratings[n.pageId]}/>}
     {n.target&&<IconButton name="edit" label={'Edit reference '+n.title} className="tree-more" onClick={()=>onReferenceEdit(ws.overlays.references.find(r=>r.id===n.id))}/>}
     <IconButton name="more" label={'Actions for '+n.title} className="tree-more" aria-haspopup="menu" onClick={e=>showMenu(e,p,n)}/>
    </div>
    {doc&&pdfOpen&&<PdfStudyTree onActions={onReadingActions} key={pdfKey} doc={doc} workspace={ws} depth={depth+1} onToggle={onPdfToggle} onNavigate={onPdfNavigate} onTerm={onPdfTerm} onManage={onPdfManage}/>}
    {n.children&&open&&<div className="tree-children">{n.children.length?nodes(n.children,p,depth+1):<button className="empty-folder" style={{marginLeft:(30+depth*14)+'px'}} onClick={()=>onCreate('page',p,n)}>Add a page</button>}</div>}
   </div>;
  });
 }
 function project(p:Project){
  if(hidden(p)||p.nodes.length>0&&!p.nodes.some(visible))return null;const open=expanded.has(p.id)||!!query;
  if(query&&!normalize(p.title).includes(query)&&!p.nodes.some(matches))return null;
  return <div className="tree-project" key={p.id} data-project-id={p.id}>
   <div className="tree-row project-row" onContextMenu={e=>showMenu(e,p)} onKeyDown={e=>keyboardMenu(e,p)}>
    <button className="tree-expander" aria-label={(open?'Collapse ':'Expand ')+p.title} aria-expanded={open} onClick={()=>onToggle(p.id)}><Icon name={open?'down':'chevron'} size={12}/></button><button className="tree-target" onClick={e=>{onCollection(p.id,undefined,e.ctrlKey||e.metaKey);if(!open)onToggle(p.id);}} title={p.title}><span className="project-icon"><Icon name={p.icon} size={17}/></span><strong>{p.title}</strong></button>
    {!p.id.startsWith('project.unfiled.')&&<IconButton name="more" label={'Actions for notebook '+p.title} className="tree-more" aria-haspopup="menu" onClick={e=>showMenu(e,p)}/>}
    {mode==='notes'&&!p.id.startsWith('project.unfiled.')&&<IconButton name="plus" label={'Add to '+p.title} className="tree-more" onClick={()=>onCreate('page',p)}/>}
   </div>{open&&nodes(p.nodes,p,0)}
  </div>;
 }
 const grouped=new Set(c.groups.flatMap((g:any)=>g.projectIds));
 const menuPage=menu?.node?.pageId;
 const firstPage=(ns:TreeNode[]):string|undefined=>{for(const n of ns){if(!visible(n))continue;if(n.pageId&&!archived.has(n.pageId))return n.pageId;const id=n.children&&firstPage(n.children);if(id)return id;}};
 const overview=menu&&!menuPage?firstPage(menu.node?.children??menu.project.nodes):undefined;
 const manage=(intent:string)=>{if(menu)action(()=>onItem({project:menu.project,node:menu.node,intent}));};
 return <aside className={"library-sidebar "+(mode==='pdfs'?'pdf-library-sidebar':'')} aria-label={LIBRARY_TYPES.find(t=>t.id===mode)!.label+' library'}>
  <div className="sidebar-heading">{navigation}</div>
  <div className="content-type-selector" role="group" aria-label="Content types">{LIBRARY_TYPES.map(t=><button key={t.id} aria-label={t.label+' content'} aria-pressed={mode===t.id} onClick={()=>onLibraryMode(t.id)} title={t.label}><Icon name={t.icon} size={16}/><span>{t.label}</span></button>)}</div>
  <div className="category-filters subject-selector" role="group" aria-label="Subject filters">{CATEGORIES.map(category=><button key={category.id} aria-label={category.label+' filter'} aria-pressed={activeSession(ws.personal).categoryFilter===category.id} onClick={()=>onCategory(category.id)}>{category.label}</button>)}</div>
  <div className="filter-status"><span>{CATEGORIES.find(c=>c.id===activeSession(ws.personal).categoryFilter)?.label??'All subjects'}</span>{mode!=='notes'&&<button className="text-button" onClick={onManageLibrary}>Manage library</button>}<IconButton name="search" label="Filter tree" active={filterOpen} onClick={()=>setFilterOpen(!filterOpen)}/></div>
  {filterOpen&&<div className="tree-filter"><Icon name="search" size={15}/><input aria-label="Filter notebook tree" placeholder="Filter notebooks" value={filter} onChange={e=>setFilter(e.target.value)}/>{filter&&<IconButton name="close" label="Clear tree filter" onClick={()=>setFilter('')}/>}</div>}
  <nav className="tree-scroll" aria-label="Projects and pages">
   {c.groups.filter((g:any)=>g.projectIds.some((id:string)=>c.projects.some((p:Project)=>p.id===id&&!hidden(p)&&(p.nodes.length===0||p.nodes.some(visible))))).map((g:any)=><section className="tree-group" key={g.id}><h3><button aria-expanded={!activeSession(ws.personal).collapsedGroups?.includes(g.id)} aria-label={(activeSession(ws.personal).collapsedGroups?.includes(g.id)?'Expand group ':'Collapse group ')+g.title} onClick={()=>onGroupToggle(g.id)}><Icon name={g.id.includes('cloud')?'cloud':g.id.includes('program')?'python':g.id.includes('norsk')?'language':'book'} size={21}/><span>{g.title}</span><Icon name={activeSession(ws.personal).collapsedGroups?.includes(g.id)?'chevron':'down'} size={12}/></button></h3>{!activeSession(ws.personal).collapsedGroups?.includes(g.id)&&g.projectIds.map((id:string)=>c.projects.find((p:any)=>p.id===id)).filter(Boolean).map(project)}</section>)}
   {c.projects.some((p:Project)=>!grouped.has(p.id)&&!hidden(p)&&(p.nodes.length===0||p.nodes.some(visible)))&&<section className="tree-group"><h3><button aria-expanded={!activeSession(ws.personal).collapsedGroups?.includes('group.ungrouped')} aria-label={(activeSession(ws.personal).collapsedGroups?.includes('group.ungrouped')?'Expand group ':'Collapse group ')+(mode==='notes'?'NOTEBOOKS':'RESOURCES')} onClick={()=>onGroupToggle('group.ungrouped')}><Icon name="folder" size={21}/><span>{mode==='notes'?'NOTEBOOKS':'RESOURCES'}</span><Icon name="down" size={12}/></button></h3>{!activeSession(ws.personal).collapsedGroups?.includes('group.ungrouped')&&c.projects.filter((p:any)=>!grouped.has(p.id)).map(project)}</section>}

  </nav>
  <div className="sidebar-footer-row"><button className="sidebar-add" onClick={()=>onTypeAdd(mode)}><Icon name="plus" size={16}/> {LIBRARY_TYPES.find(t=>t.id===mode)!.add}</button></div><div className="local-status"><span className="status-dot"/> Stored on this device</div>
  {menu&&<div ref={menuRef} className="tree-context-menu" role="menu" aria-label={'Actions for '+(menu.node?.title??menu.project.title)} style={{left:menu.x,top:menu.y}} onKeyDown={menuKey}>
   <div className="tree-menu-title">{menu.node?.title??menu.project.title}</div>
   {menuPage?<>
    <button role="menuitem" onClick={()=>action(()=>onOpen(menuPage))}><Icon name="page"/>Open</button>
    <button role="menuitem" onClick={()=>action(()=>onOpen(menuPage,undefined,true))}><Icon name="plus"/>Open in new tab</button>
    {onOther&&<button role="menuitem" onClick={()=>action(()=>onOther(menuPage))}><Icon name="split"/>Open in other pane</button>}
    <button role="menuitem" onClick={()=>action(()=>onBookmark(menuPage))}><Icon name="bookmark"/>Bookmark</button>
   </>:<>
    <button role="menuitem" onClick={()=>action(()=>onCollection(menu.node?.id??menu.project.id))}><Icon name="folder"/>Open collection</button>{overview&&<button role="menuitem" onClick={()=>action(()=>onOpen(overview))}><Icon name="book"/>Open overview</button>}
    <button role="menuitem" onClick={()=>action(()=>onCreate('page',menu.project,menu.node))}><Icon name="plus"/>Add page</button>
    <button role="menuitem" onClick={()=>action(()=>onCreate('folder',menu.project,menu.node))}><Icon name="folder"/>Add folder</button>
   </>}
   {onReadLater&&<button role="menuitem" onClick={()=>action(()=>onReadLater(menuPage??menu.node?.id??menu.project.id,menu.node?.title??menu.project.title))}><Icon name="clock"/>Add to Read later</button>}
   <div role="separator"/>
   <button role="menuitem" onClick={()=>manage('rename')}><Icon name="edit"/>Rename</button>
   <button role="menuitem" onClick={()=>manage('move')}><Icon name="folder"/>{menu.node?'Move':'Move / group notebook'}</button>
   <button role="menuitem" onClick={()=>manage('archive')}><Icon name="archive"/>Archive</button>
  </div>}
 </aside>;
}
