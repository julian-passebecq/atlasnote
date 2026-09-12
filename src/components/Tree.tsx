import React,{useState,useEffect,useLayoutEffect,useRef} from '../vendor/react.mjs';
import type {Catalogue,TreeNode,Project,Workspace} from '../core/model.js';
import {Icon,IconButton} from './Icon.js';
import {visibleLibraryNode} from '../core/library-projection.js';
import {normalize} from '../core/workspace.js';

type MenuState={project:Project;node?:TreeNode;x:number;y:number;returnFocus:HTMLElement};
/** All tree actions also have an ordinary, keyboard-focusable Actions button. */
export function ProjectTree({catalogue:c,workspace:ws,activePage,panePages=[],activePaneIndex=0,onCollection,onOpen,onOther,onBookmark,onToggle,onItem,onCreate}:any){
 const [filter,setFilter]=useState(''),[menu,setMenu]=useState<MenuState|null>(null);
 const menuRef=useRef<HTMLDivElement|null>(null);
 const expanded=new Set(ws.personal.session.expanded),archived=new Set<string>(ws.overlays.archived),query=normalize(filter);
 const mode=ws.personal.session.libraryMode??'notes',pdfPages=new Set<string>(c.documents.map((d:any)=>d.pageId));
 const visible=(n:TreeNode)=>visibleLibraryNode(n,pdfPages,archived,mode);
 const matches=(n:TreeNode):boolean=>!query||normalize(n.title).includes(query)||!!n.children?.some(matches);
 const hidden=(p:Project)=>ws.overlays.projectPrefs[p.id]?.hidden||archived.has(p.id);
 function dismiss(restoreFocus=true){const target=menu?.returnFocus;setMenu(null);if(restoreFocus&&target?.isConnected)target.focus();}
 function showMenu(e:any,project:Project,node?:TreeNode){
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
 function nodes(ns:TreeNode[],p:Project,depth:number):any{
  return ns.filter(n=>visible(n)&&matches(n)).map(n=>{
   const owners=[0,1].filter(i=>n.pageId&&panePages[i]===n.pageId);const open=expanded.has(n.id)||!!query,page=c.pages.find((p:any)=>p.id===n.pageId);
   return <div className="tree-node" key={n.id}>
    <div className={'tree-row '+(n.pageId===activePage?'active ':'')+owners.map(i=>'pane-owner-'+(i===0?'a':'b')).join(' ')} data-node-id={n.id} data-pane-owners={owners.map(i=>i===0?'a':'b').join(' ')} style={{paddingLeft:(10+depth*14)+'px'}} onContextMenu={e=>showMenu(e,p,n)} onKeyDown={e=>keyboardMenu(e,p,n)}>
     <>{n.children&&<button className="tree-expander" aria-label={(open?'Collapse ':'Expand ')+n.title} aria-expanded={open} onClick={()=>onToggle(n.id)}><Icon name={open?'down':'chevron'} size={12}/></button>}<button className="tree-target" title={n.title} aria-expanded={n.children?open:undefined} aria-current={n.pageId===activePage?'page':undefined}
      onClick={e=>n.pageId?onOpen(n.pageId,undefined,e.ctrlKey||e.metaKey):(onCollection(n.id,undefined,e.ctrlKey||e.metaKey),!open&&onToggle(n.id))}
      onAuxClick={e=>{if(e.button===1){e.preventDefault();onOpen(n.pageId??n.id,undefined,true);}}}>
      {!n.children&&<span className="tree-indent"/>}
      <Icon name={n.children?'folder':c.documents.some((d:any)=>d.pageId===n.pageId)?'pdf':'page'} size={15}/><span>{page?.title??n.title}</span>
     </button></>
     {owners.length>0&&<span className="tree-pane-markers" aria-label={owners.length===2?'Open in panes A and B':'Open in pane '+(owners[0]===0?'A':'B')}>{owners.map(i=><span key={i} className={'tree-pane-marker marker-'+(i===0?'a':'b')+(i===activePaneIndex?' is-active':'')}>{i===0?'A':'B'}</span>)}</span>}
     {n.pageId&&ws.personal.session.showFlags&&ws.personal.ratings[n.pageId]&&<span className={'flag-dot '+ws.personal.ratings[n.pageId]} title={ws.personal.ratings[n.pageId]}/>}
     <IconButton name="more" label={'Actions for '+n.title} className="tree-more" aria-haspopup="menu" onClick={e=>showMenu(e,p,n)}/>
    </div>
    {n.children&&open&&<div className="tree-children">{n.children.length?nodes(n.children,p,depth+1):<button className="empty-folder" style={{marginLeft:(30+depth*14)+'px'}} onClick={()=>onCreate('page',p,n)}>Add a page</button>}</div>}
   </div>;
  });
 }
 function project(p:Project){
  if(hidden(p)||mode==='pdfs'&&!p.nodes.some(visible))return null;const open=expanded.has(p.id)||!!query;
  if(query&&!normalize(p.title).includes(query)&&!p.nodes.some(matches))return null;
  return <div className="tree-project" key={p.id}>
   <div className="tree-row project-row" onContextMenu={e=>showMenu(e,p)} onKeyDown={e=>keyboardMenu(e,p)}>
    <button className="tree-expander" aria-label={(open?'Collapse ':'Expand ')+p.title} aria-expanded={open} onClick={()=>onToggle(p.id)}><Icon name={open?'down':'chevron'} size={12}/></button><button className="tree-target" onClick={e=>{onCollection(p.id,undefined,e.ctrlKey||e.metaKey);if(!open)onToggle(p.id);}} title={p.title}><span className="project-icon"><Icon name={p.icon} size={17}/></span><strong>{p.title}</strong></button>
    <IconButton name="more" label={'Actions for notebook '+p.title} className="tree-more" aria-haspopup="menu" onClick={e=>showMenu(e,p)}/>
    <IconButton name="plus" label={'Add to '+p.title} className="tree-more" onClick={()=>onCreate('page',p)}/>
   </div>{open&&nodes(p.nodes,p,0)}
  </div>;
 }
 const grouped=new Set(c.groups.flatMap((g:any)=>g.projectIds));
 const menuPage=menu?.node?.pageId;
 const firstPage=(ns:TreeNode[]):string|undefined=>{for(const n of ns){if(!visible(n))continue;if(n.pageId&&!archived.has(n.pageId))return n.pageId;const id=n.children&&firstPage(n.children);if(id)return id;}};
 const overview=menu&&!menuPage?firstPage(menu.node?.children??menu.project.nodes):undefined;
 const manage=(intent:string)=>{if(menu)action(()=>onItem({project:menu.project,node:menu.node,intent}));};
 return <aside className="library-sidebar" aria-label="Notebook library">
  <div className="sidebar-heading"><strong>{mode==='pdfs'?'PDF Library':'My notebooks'}</strong><span className="secondary">{c.projects.filter((p:any)=>!hidden(p)&&(mode!=='pdfs'||p.nodes.some(visible))).length}</span></div>
  <div className="tree-filter"><Icon name="search" size={15}/><input aria-label="Filter notebook tree" placeholder="Filter notebooks" value={filter} onChange={e=>setFilter(e.target.value)}/>{filter&&<IconButton name="close" label="Clear tree filter" onClick={()=>setFilter('')}/>}</div>
  <nav className="tree-scroll" aria-label="Projects and pages">
   {c.groups.filter((g:any)=>g.projectIds.some((id:string)=>c.projects.some((p:Project)=>p.id===id&&!hidden(p)&&(mode!=='pdfs'||p.nodes.some(visible))))).map((g:any)=><section className="tree-group" key={g.id}><h3>{g.title}</h3>{g.projectIds.map((id:string)=>c.projects.find((p:any)=>p.id===id)).filter(Boolean).map(project)}</section>)}
   {c.projects.filter((p:any)=>!grouped.has(p.id)).length>0&&<section className="tree-group"><h3>NOTEBOOKS</h3>{c.projects.filter((p:any)=>!grouped.has(p.id)).map(project)}</section>}
  </nav>
  <button className="sidebar-add" onClick={()=>onCreate('project')}><Icon name="plus" size={16}/> New notebook</button><div className="local-status"><span className="status-dot"/> Stored on this device</div>
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
   <div role="separator"/>
   <button role="menuitem" onClick={()=>manage('rename')}><Icon name="edit"/>Rename</button>
   <button role="menuitem" onClick={()=>manage('move')}><Icon name="folder"/>{menu.node?'Move':'Move / group notebook'}</button>
   <button role="menuitem" onClick={()=>manage('archive')}><Icon name="archive"/>Archive</button>
  </div>}
 </aside>;
}
