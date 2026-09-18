import React,{useEffect,useMemo,useRef,useState} from '../vendor/react.mjs';
import type {Page,View,Location,Anchor} from '../core/model.js';
import type {CheatsheetDocument} from './model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import {IconButton} from '../components/Icon.js';
import {selectedSvgText} from './clipboard.js';
import {validateCheatsheet} from './validation.mjs';
import {renderCheatsheetPage} from './renderer.mjs';
import {sheetGroup,sheetPosition,sheetPagePatch,downloadCheatsheet} from './content.mjs';

const MODES=[['single','Single page'],['spread','Two pages'],['grid','Four pages']] as const;
type Props={page:Page;view:View;location:Location;paneId:string;slotId:number;onLocation:(patch:Partial<Location>)=>void;onActions:(target:ReadingTarget,title:string,event:any)=>void};
/** A content renderer inside the existing pane, not a parallel reader shell. */
export function CheatsheetReader(props:Props){
 try{validateCheatsheet(props.page.cheatsheet);}catch(e){return <div className="sheet-error" role="alert">Invalid cheatsheet source: {(e as Error).message}. The saved source has not been changed.</div>;}
 return <ValidatedCheatsheetReader {...props}/>;
}
function ValidatedCheatsheetReader({page,view,location,paneId,slotId,onLocation,onActions}:Props){
 const doc=page.cheatsheet as CheatsheetDocument;
 const group=sheetGroup(doc,location),position=sheetPosition(doc,location),mode=location.sheetMode??'single';
 const zoom=location.sheetZoom??1,fit=location.sheetFit??'page';
 const viewport=useRef<HTMLDivElement|null>(null),callback=useRef(onLocation),live=useRef(location),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 callback.current=onLocation;live.current=location;
 const [size,setSize]=useState({width:720,height:800}),[draft,setDraft]=useState(String(group.page)),[message,setMessage]=useState('');
 const columns=mode==='single'?1:2,rows=Math.max(1,Math.ceil(group.pages.length/columns));
 const widthScale=Math.max(.05,(size.width-28-(columns-1)*14)/columns/1200);
 const heightScale=Math.max(.05,(size.height-28-(rows-1)*14-rows*26)/rows/1600);
 const scale=Math.max(.05,(fit==='page'?Math.min(widthScale,heightScale):widthScale)*zoom);
 const scope='pane-'+slotId+'-'+paneId+'-'+view.id;
 const rendered=useMemo(()=>{
  try{return {pages:group.pages.map(number=>({number,...renderCheatsheetPage(doc,number,{scope,activeBlock:location.anchor?.blockId})})),error:''};}
  catch(e){return {pages:[],error:(e as Error).message};}
 },[doc,group.start,group.available,mode,location.anchor?.blockId,scope]);
 useEffect(()=>{setDraft(String(group.page));setMessage('');},[group.page]);
 useEffect(()=>{
  const el=viewport.current;if(!el)return;
  const observer=new ResizeObserver(()=>setSize({width:el.clientWidth,height:el.clientHeight}));observer.observe(el);
  setSize({width:el.clientWidth,height:el.clientHeight});return()=>observer.disconnect();
 },[]);
 // Complete a valid physical anchor on first open (including global-search links).
 // Do not silently retarget a saved page that disappeared after a source edit.
 useEffect(()=>{
  if(group.available&&(location.sheetPage!==group.page||location.anchor?.sheetPage!==group.page||location.anchor?.sheetId!==doc.pages[group.page-1]?.id))
   callback.current({sheetPage:group.page,anchor:{...location.anchor,sheetPage:group.page,sheetId:doc.pages[group.page-1].id}});
 },[doc.id,group.page,group.available,location.sheetPage,location.anchor?.sheetPage,location.anchor?.sheetId]);
 useEffect(()=>{
  const el=viewport.current;if(!el)return;
  const raf=requestAnimationFrame(()=>{el.scrollTop=live.current.scroll??0;});
  return()=>cancelAnimationFrame(raf);
 },[doc.id,view.id,group.start,mode,zoom,fit]);
 useEffect(()=>{
  const save=()=>{const el=viewport.current;if(el&&Math.abs(el.scrollTop-(live.current.scroll??0))>1)callback.current({scroll:el.scrollTop});};
  document.addEventListener('atlas:before-reader-change',save);
  return()=>{document.removeEventListener('atlas:before-reader-change',save);if(timer.current)clearTimeout(timer.current);};
 },[view.id,doc.id]);
 function saveScroll(){if(timer.current)clearTimeout(timer.current);const identity=live.current.anchor?.sheetId;timer.current=setTimeout(()=>{if(viewport.current&&identity===live.current.anchor?.sheetId)callback.current({scroll:viewport.current.scrollTop});},180);}
 function go(n:number){if(timer.current)clearTimeout(timer.current);if(!Number.isInteger(n)||n<1||n>doc.pages.length){setMessage('Choose a physical page from 1 to '+doc.pages.length+'.');setDraft(String(group.page));return;}onLocation(sheetPagePatch(n,undefined,doc.pages[n-1].id));}
 function actions(n:number,e:any,anchor?:Anchor){
  const target:ReadingTarget={...(location.historyRevisionId?{historyRevisionId:location.historyRevisionId}:{}),kind:'cheatsheet-page',pageId:page.id,documentId:doc.id,sheetPage:n,anchor:{...anchor,sheetPage:n,sheetId:doc.pages[n-1].id}};
  onActions(target,(doc.title+' - p.'+n).slice(0,120),e);
 }
 return <div className="cheatsheet-reader" data-native-cheatsheet={doc.id} data-sheet-mode={mode}>
  <div className="reader-toolbar sheet-toolbar" aria-label="Cheatsheet reader controls">
   <div className="sheet-modes" role="group" aria-label="Cheatsheet layout">{MODES.map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>onLocation({sheetMode:value,scroll:0})}>{label}</button>)}</div>
   <form className="sheet-navigation" onSubmit={e=>{e.preventDefault();go(Number(draft));}}>
    <IconButton type="button" name="left" label="Previous cheatsheet page group" disabled={!group.available||group.start===1} onClick={()=>go(Math.max(1,group.start-group.size))}/>
    <input type="number" min={1} max={doc.pages.length} step={1} aria-label="Physical cheatsheet page number" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={()=>{if(draft!==String(group.page))go(Number(draft));}}/>
    <span aria-label="Physical cheatsheet page count">/ {doc.pages.length}</span>
    <IconButton type="button" name="right" label="Next cheatsheet page group" disabled={!group.available||group.start+group.size>doc.pages.length} onClick={()=>go(group.start+group.size)}/>
   </form>
   <label className="sheet-fit">Fit<select aria-label="Cheatsheet fit" value={fit} onChange={e=>onLocation({sheetFit:e.target.value as 'page'|'width',sheetZoom:1,scroll:0})}><option value="page">Page</option><option value="width">Width</option></select></label>
   <label className="sheet-zoom">Zoom<select aria-label="Cheatsheet zoom" value={zoom} onChange={e=>onLocation({sheetZoom:Number(e.target.value)})}>{[.5,.75,1,1.25,1.5,2,3,4].map(n=><option key={n} value={n}>{Math.round(n*100)}%</option>)}</select></label>
   <IconButton name="download" label="Export cheatsheet JSON" title="Download canonical structured source, not a screenshot" onClick={()=>downloadCheatsheet(doc)}/>
  </div>
  {(message||rendered.error)&&<p className="sheet-error" role="alert">{message||rendered.error}</p>}
  {!group.available&&<div className="sheet-error" role="alert">Saved physical page {group.page} is no longer present in this source. Its saved location was retained. <button onClick={()=>go(1)}>Open physical page 1</button></div>}
  {position.anchorMissing&&<p className="sheet-error" role="status">The saved concept anchor is no longer present. The physical page has been retained.</p>}
  <div className="sheet-viewport" ref={viewport} tabIndex={0} aria-label="Cheatsheet pages" onScroll={saveScroll} onCopy={e=>{const text=viewport.current?selectedSvgText(viewport.current,window.getSelection()):undefined;if(text!==undefined&&e.clipboardData){e.clipboardData.setData('text/plain',text);e.preventDefault();}}} onKeyDown={e=>{
   if(e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement).closest('button,input,select,textarea'))return;
   if(e.key==='PageDown'&&group.start+group.size<=doc.pages.length){e.preventDefault();go(group.start+group.size);}
   if(e.key==='PageUp'&&group.start>1){e.preventDefault();go(Math.max(1,group.start-group.size));}
  }}>
   <div className="sheet-page-grid" style={{gridTemplateColumns:`repeat(${columns}, ${1200*scale}px)`}}>
    {rendered.pages.map(({number,svg,diagnostics})=><figure key={doc.pages[number-1].id} className={'sheet-figure '+(number===group.page?'is-current':'')} data-physical-sheet={number} style={{width:1200*scale}} tabIndex={0} aria-label={'Cheatsheet physical page '+number} onFocus={()=>{if(number!==group.page)onLocation(sheetPagePatch(number,undefined,doc.pages[number-1].id));}} onContextMenu={e=>{
     const block=(e.target as Element).closest('[data-block-id]')?.getAttribute('data-block-id');actions(number,e,block?{blockId:block}:undefined);
    }}>
     <figcaption><button className="sheet-page-select" aria-label={'Select cheatsheet page '+number} aria-pressed={number===group.page} onClick={()=>go(number)}>p.{number}</button><IconButton name="more" label={'Actions for cheatsheet page '+number} onClick={e=>actions(number,e)}/></figcaption>
     <div className="sheet-svg" dangerouslySetInnerHTML={{__html:svg}}/>
     {!!diagnostics.length&&<p className="sheet-error" role="status">{diagnostics.length} fixed-frame overflow warning(s). Review the source layout before publication.</p>}
    </figure>)}
   </div>
  </div>
  <span className="sheet-sr-only" role="status" aria-live="polite">{group.available?'Showing physical pages '+group.pages.join(', ')+' of '+doc.pages.length+'. PageDown and PageUp move between page groups.':''}</span>
 </div>;
}
