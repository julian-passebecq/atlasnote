import React,{useRef,useEffect,useLayoutEffect} from '../vendor/react.mjs';
import {IconButton} from './Icon.js';
/** Non-modal overlay: never participates in reader flex sizing or anchor capture. */
export function FloatingPanel({title,className='',onClose,children}:any){
 const ref=useRef<HTMLDivElement|null>(null),origin=useRef<HTMLElement|null>(document.activeElement as HTMLElement);
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useLayoutEffect(()=>{ref.current?.querySelector<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]')?.focus();},[]);
 useEffect(()=>{
  function close(restore:boolean){closeRef.current();if(restore&&origin.current?.isConnected)origin.current.focus();}
  function key(e:KeyboardEvent){if(e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();close(true);}}
  function outside(e:PointerEvent){const t=e.target as Element;if(!ref.current?.contains(t)&&!t.closest('.reader-rail')&&!t.closest('dialog'))close(false);}
  document.addEventListener('keydown',key,true);document.addEventListener('pointerdown',outside);
  return()=>{document.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',outside);if((ref.current?.contains(document.activeElement)||document.activeElement===document.body)&&origin.current?.isConnected)origin.current.focus();};
 },[]);
 return <div ref={ref} className={'floating-panel '+className} role="dialog" aria-modal="false" aria-label={title}>
  <div className="floating-panel-heading"><strong>{title}</strong><IconButton name="close" label={'Close '+title.toLowerCase()} onClick={()=>{onClose();origin.current?.focus();}}/></div>{children}
 </div>;
}
