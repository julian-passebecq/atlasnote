import React,{useRef,useState,useEffect,useLayoutEffect} from '../vendor/react.mjs';
import type {ReadingTarget,ReadingDestination} from '../core/reading-types.js';
import {Icon} from './Icon.js';
export type ReadingActionMenu={target:ReadingTarget;title:string;x:number;y:number;origin:HTMLElement};
export function ReadingActions({menu,onClose,onOpen,onLater,onBookmark}: {menu:ReadingActionMenu;onClose:()=>void;onOpen:(where:ReadingDestination)=>void;onLater:()=>void;onBookmark:()=>void}){
 const ref=useRef<HTMLDivElement|null>(null),[choosing,setChoosing]=useState(false);
 function close(){onClose();if(menu.origin.isConnected)menu.origin.focus();}
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const r=el.getBoundingClientRect();el.style.left=Math.max(8,Math.min(menu.x,innerWidth-r.width-8))+'px';el.style.top=Math.max(8,Math.min(menu.y,innerHeight-r.height-8))+'px';el.querySelector<HTMLElement>('[role="menuitem"]')?.focus();},[choosing]);
 useEffect(()=>{function outside(e:PointerEvent){if(!ref.current?.contains(e.target as Node))onClose();}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 function key(e:any){const choices=Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')??[]),at=choices.indexOf(document.activeElement as HTMLElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab')onClose();else if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();choices[e.key==='Home'?0:e.key==='End'?choices.length-1:(at+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length]?.focus();}}
 return <div ref={ref} className="reading-action-menu" role="menu" aria-label={'Reading actions for '+menu.title} onKeyDown={key}>
 <strong>{menu.title}</strong>{choosing?<><small>Add a tab without replacing existing work.</small>{([1,2,3,4,5] as const).map(n=><button role="menuitem" key={n} onClick={()=>onOpen(n)}>Open in Workspace {n}</button>)}<button role="menuitem" onClick={()=>setChoosing(false)}>Back</button></>:<>
 <button role="menuitem" onClick={()=>onOpen('here')}><Icon name="page"/>Open here</button><button role="menuitem" onClick={()=>onOpen('tab')}><Icon name="plus"/>Open in new tab</button><button role="menuitem" onClick={()=>onOpen('pane')}><Icon name="compare"/>Open in other pane</button><button role="menuitem" onClick={()=>setChoosing(true)}><Icon name="panel"/>Open in workspace...</button><hr/><button role="menuitem" onClick={onLater}><Icon name="clock"/>Add to Read later</button><button role="menuitem" onClick={onBookmark}><Icon name="bookmark"/>Bookmark</button></>}
 </div>;
}
