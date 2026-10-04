import {registerPdfTextSearch,searchPdfText} from '../pdf/text-search';
import {registerStudyPreparer} from '../pdf/study-bridge';
/** Primary hosted PDF adapter. Worker, CMaps, WASM and standard fonts are copied
 * from React-PDF's resolved PDF.js package; the version gate is never bypassed.
 * The separate compatibility build uses the native renderer, not this adapter. */
import React,{useState,useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {Document,Page,Outline,pdfjs} from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type {DocumentEntry,Location,WorkspaceNumber} from '../core/model';
import {clampPage,spreadPages,gridPages,gridPageWidth,combinedRotation,stepPhysicalPage} from '../pdf/physical-pages.mjs';
import {pdfAnchor} from '../core/personal-state';
import {DocumentInfo} from '../pdf/DocumentInfo';
import {Icon,IconButton} from '../components/Icon';
import {prepareCompanionParts} from '../companion/authoring.mjs';
import {createWheelPager,consumeWheelRestore,wheelBoundaries} from '../pdf/wheel-navigation.mjs';
import {parsePageInput,pageRangeLabel,printedLabelFor} from '../pdf/page-input.mjs';
import {navigationTrace} from '../pdf/navigation-trace.mjs';
import {publishPosition,clearPosition,publishVerifiedCount} from '../pdf/reader-state';
import {continuousWindow,spacerHeight,pageAtOffset,windowRadius} from '../pdf/continuous-window.mjs';
import {createNavigationController,geometryCompensation,physicalPageHeight} from '../pdf/navigation-controller.mjs';
import {getBuildIdentity} from '../durability/provenance.js';
import './pdf.css';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf-assets/pdf.worker.min.mjs',document.baseURI).href;
const options={isEvalSupported:false,standardFontDataUrl:new URL('pdf-assets/standard_fonts/',document.baseURI).href,cMapUrl:new URL('pdf-assets/cmaps/',document.baseURI).href,cMapPacked:true,wasmUrl:new URL('pdf-assets/wasm/',document.baseURI).href};
type PDF=Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
type Props={paneId?:string;slotId?:WorkspaceNumber;document:DocumentEntry;location:Location;onLocation:(l:Location,meta?:{checkpoint?:boolean})=>void;url?:string;requestExternal:()=>void;onFallback?:(reason?:string)=>void};
type PageMetric={ratio:number;intrinsic:number};
/** Geometry is resolved before mounting Page. Canvas painting cannot resize its
 * wrapper, so the first frame of a previous page is already at its destination. */
function PhysicalPage({n,width,rotation,root,virtual,metric,labels,geometryKey,failed,onVisible,onFailure}:{n:number;width:number;rotation:number;root:HTMLDivElement|null;virtual:boolean;metric?:PageMetric;labels:boolean;geometryKey:string;failed:boolean;onVisible:(n:number)=>void;onFailure:(n:number)=>void}){
 const ref=useRef<HTMLDivElement>(null),[near,setNear]=useState(!virtual);
 useEffect(()=>{if(!virtual){setNear(true);return;}const observer=new IntersectionObserver(entries=>setNear(entries[0].isIntersecting),{root,rootMargin:'900px 0px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[virtual,root]);
 useEffect(()=>{if(!virtual)return;const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)onVisible(n);},{root,rootMargin:'-10% 0px -75% 0px',threshold:0});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[root,virtual,n,onVisible]);
 const ratio=metric?.ratio??1.414,h=physicalPageHeight(width,ratio,labels);
 const dpr=Math.max(0.5,Math.min(window.devicePixelRatio||1,2,Math.sqrt(5000000/(width*width*ratio))));
 return <section ref={ref} className="physical-page" data-physical-page={n} data-geometry-key={geometryKey} data-geometry-ready={!!metric} style={{width,height:h,minHeight:h,['--pdf-page-height' as string]:Math.ceil(width*ratio)+'px'}} aria-label={'Physical PDF page '+n}>
  <div className="physical-label">Page {n}</div>{failed?<p role="alert">This physical page could not be loaded. Use the page controls to continue, or retry the PDF.</p>:near&&metric?<Page key={geometryKey} pageNumber={n} width={width} rotate={combinedRotation(metric.intrinsic,rotation)} devicePixelRatio={dpr} renderAnnotationLayer renderTextLayer onRenderSuccess={()=>{const el=ref.current;if(el?.dataset.geometryKey===geometryKey)el.setAttribute('data-page-rendered','true');}} onLoadError={()=>onFailure(n)} onRenderError={()=>onFailure(n)} error={<p role="alert">This physical page could not be rendered. The original PDF remains available.</p>} loading={<p>Rendering page {n}...</p>}/>:<div className="pdf-placeholder" style={{height:Math.ceil(width*ratio)}}>Page {n}</div>}
 </section>;
}
export function PdfEngine({paneId,slotId,document:doc,location:loc,onLocation,url,requestExternal,onFallback}:Props){
 const [pdf,setPDF]=useState<PDF|null>(null),[error,setError]=useState(''),[workerOK,setWorkerOK]=useState(false),[workerError,setWorkerError]=useState(''),[loading,setLoading]=useState('Opening PDF...'),[retry,setRetry]=useState(0),[outline,setOutline]=useState(false),[searchOpen,setSearchOpen]=useState(false),[info,setInfo]=useState(false),[query,setQuery]=useState(''),[hits,setHits]=useState<{page:number;excerpt:string}[]>([]),[findStatus,setFindStatus]=useState(''),[password,setPassword]=useState(''),[passwordReason,setPasswordReason]=useState(''),[width,setWidth]=useState(700),[height,setHeight]=useState(600),[pageInput,setPageInput]=useState(String(loc.pdfPage)),[pageMessage,setPageMessage]=useState(''),[pageLabels,setPageLabels]=useState<string[]|null>(null),[gridRatios,setGridRatios]=useState<Record<number,number>>({});
 const passwordCallback=useRef<((value:string)=>void)|null>(null),host=useRef<HTMLDivElement>(null),job=useRef(0),locationRef=useRef(loc),onLocationRef=useRef(onLocation);locationRef.current=loc;onLocationRef.current=onLocation;
 useEffect(()=>{if(!pdf||!paneId)return;return registerStudyPreparer(slotId??1,paneId,doc.id,(first,last,onProgress,signal)=>prepareCompanionParts(pdf,doc,{startPage:first,endPage:last,onProgress,signal}));},[pdf,doc.id,doc.sha256,paneId,slotId]);
 useEffect(()=>{if(!pdf||!paneId)return;return registerPdfTextSearch(slotId??1,paneId,doc.id,(query,signal)=>searchPdfText(pdf,query,signal));},[pdf,doc.id,doc.sha256,paneId,slotId]);
 const [sourceBytes,setSourceBytes]=useState<{url:string;bytes:Uint8Array}|null>(null);
 // Own the cancellable network phase before starting PDF.js. Destroying its
 // worker while a network-backed document is starting can leave an unhandled
 // worker rejection. Only consented/verified URLs reach this adapter.
 useEffect(()=>{
  const controller=new AbortController();let alive=true;setSourceBytes(null);
  if(url)fetch(url,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw Error('Unable to load PDF bytes: HTTP '+response.status);
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(alive)setSourceBytes({url,bytes});
  }).catch(e=>{if(alive&&e.name!=='AbortError')setError(e.message||'Unable to load PDF bytes.');});
  return()=>{alive=false;controller.abort();};
 },[url,retry]);
 // V3: hand the fetched bytes to PDF.js without a retained main-thread copy. PDF.js
 // transfers the buffer to its worker, which releases it here. Every Document
 // remount (document, bytes or Retry) follows a fresh fetch above, so no retry copy
 // is needed; the original bytes stay owned by their source (IndexedDB/blob/host).
 const source=useMemo(()=>sourceBytes&&sourceBytes.url===url?{data:sourceBytes.bytes}:null,[sourceBytes,url]);
 const capturing=useRef(false),scrolling=useRef(false),restoreFrame=useRef(0),scrollFrame=useRef(0),settleTimer=useRef<ReturnType<typeof setTimeout>>();
 useEffect(()=>{let alive=true;setWorkerOK(false);setWorkerError('');fetch(new URL('pdf-assets/engine.json',document.baseURI),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('PDF worker metadata missing');return r.json();}).then(meta=>{if(meta.pdfjs!==pdfjs.version)throw Error('PDF worker version does not match React-PDF: '+meta.pdfjs+' vs '+pdfjs.version);if(alive)setWorkerOK(true);}).catch(e=>{if(alive)setWorkerError(e.message);});return()=>{alive=false;};},[retry]);
 useEffect(()=>{setPDF(null);setError('');setHits([]);setFindStatus('');setPassword('');setPasswordReason('');passwordCallback.current=null;job.current++;return()=>{job.current++;passwordCallback.current=null;};},[doc.id,doc.sha256,url,retry]);
 // Companion and outline jumps must update the editable page control before
 // paint, alongside the physical page and companion selection.
 useLayoutEffect(()=>{setPageInput(String(loc.pdfPage));setPageMessage('');},[loc.pdfPage]);
 // Resize restoration uses a physical page plus a fractional intra-page anchor.
 // Persisting only a page number loses the user's place in a tall, zoomed page.
 const controller=useRef(createNavigationController()),restoreTimeout=useRef<ReturnType<typeof setTimeout>>();
 const pendingRestore=useRef(true),lastCapture=useRef(''),restoring=useRef(false),wheelPager=useRef(createWheelPager()),wheelTurnPending=useRef(false);
 // V3 navigation owner: every restore request carries a generation and reason.
 // `settledTop` is the viewport position we last committed (capture) or wrote
 // (restore). A late canvas render may re-anchor only while the viewport is
 // still exactly there; once the reader moved without a newer navigation
 // command, the viewport wins and the stale anchor is never revived.
 const generation=useRef(0),restoreReason=useRef('open'),settledTop=useRef<number|null>(null);
 // V3 Continuous window: measured wrapper heights (reset when geometry changes) and the real row gap.
 const heights=useRef(new Map<number,number>()),gapRef=useRef(16),layoutRef=useRef(''),estimateRef=useRef(900),countRef=useRef(0);
 const geometryKeyRef=useRef('');
 const metricJobs=useMemo(()=>new Map<number,Promise<{width:number;height:number;intrinsic:number}>>(),[pdf]);
 const [metrics,setMetrics]=useState<{pdf:PDF|null;values:Map<number,{width:number;height:number;intrinsic:number}>;failed:Set<number>}>({pdf:null,values:new Map(),failed:new Set()});
 const metricValues=metrics.pdf===pdf?metrics.values:new Map<number,{width:number;height:number;intrinsic:number}>();
 const geometryAnchor=useRef<{n:number;top:number;scroll:number;key:string}|null>(null);
 useEffect(()=>{void getBuildIdentity().then(identity=>navigationTrace.setBuildIdentity(identity)).catch(()=>{});},[]);
 function userTakesControl(reason='user'){
  if(pendingRestore.current)trace('restore-cancel',{reason});
  controller.current.cancel(reason);pendingRestore.current=false;wheelTurnPending.current=false;
  clearTimeout(restoreTimeout.current);scrolling.current=true;
 }
 function pageFailed(n:number){
  if(controller.current.current()?.targetPage===n)userTakesControl('page-error');
  trace('page-error',{n});
 }
 useEffect(()=>()=>{controller.current.cancel('unmount');clearTimeout(restoreTimeout.current);},[doc.id,doc.sha256,url]);
 const trace=(type:string,fields:Record<string,unknown>={})=>navigationTrace.record(type,{pane:paneId,slot:slotId,doc:doc.id,gen:generation.current,mode:locationRef.current.pdfMode,page:locationRef.current.pdfPage,...fields});
 const positionKey=(l:Location)=>JSON.stringify([l.pdfPage,l.anchor?.pdfOffset??0,l.anchor?.pdfRevision]);
 function restorePosition(trigger='frame',token=controller.current.current()){
  const el=host.current,l=locationRef.current;if(!el||!pdf||!token||scrolling.current)return;
  if(!controller.current.canApply(token,{documentKey:doc.id+':'+doc.sha256,targetPage:clampPage(l.pdfPage,pdf.numPages),geometryKey:geometryKeyRef.current})){trace('restore-skip',{reason:'obsolete-intent',result:trigger});return;}
  const target=l.pdfMode==='grid'?el.querySelector<HTMLElement>('.pdf-physical-pages'):el.querySelector<HTMLElement>('[data-physical-page="'+token.targetPage+'"]');if(!target)return;
  const group=l.pdfMode==='spread'||l.pdfMode==='grid';
  if(group?!!el.querySelector('[data-geometry-ready="false"]'):target.dataset.geometryReady!=='true')return;
  restoring.current=true;
  const before=el.scrollTop,offset=token.offset;
  const requested=offset===1&&l.pdfMode!=='continuous'?el.scrollHeight-el.clientHeight-before:target.getBoundingClientRect().top-el.getBoundingClientRect().top+offset*target.getBoundingClientRect().height;
  el.scrollTop+=requested;settledTop.current=el.scrollTop;
  trace('restore',{reason:token.reason,result:trigger,delta:requested,applied:el.scrollTop-before,before,after:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,offset});
  controller.current.finish(token);pendingRestore.current=false;wheelTurnPending.current=false;clearTimeout(restoreTimeout.current);
  cancelAnimationFrame(restoreFrame.current);restoreFrame.current=requestAnimationFrame(()=>{restoring.current=false;});
 }
 function queueRestore(reason='layout',destination=locationRef.current){
  scrolling.current=false;pendingRestore.current=true;restoreReason.current=reason;
  const token=controller.current.begin({documentKey:doc.id+':'+doc.sha256,targetPage:Math.max(1,destination.pdfPage),geometryKey:geometryKeyRef.current,offset:destination.anchor?.pdfOffset??0,reason});
  generation.current=token.id;trace('queue-restore',{reason});
  clearTimeout(restoreTimeout.current);restoreTimeout.current=setTimeout(()=>{if(controller.current.current()===token)userTakesControl('geometry-timeout');},1200);
  cancelAnimationFrame(restoreFrame.current);restoreFrame.current=requestAnimationFrame(()=>restorePosition('frame',token));
 }
 useEffect(()=>{const el=host.current;if(!el)return;const ro=new ResizeObserver(()=>{setWidth(el.clientWidth);setHeight(el.clientHeight);});ro.observe(el);return()=>ro.disconnect();},[url,pdf]);
 const setPage=(n:number,bottom=false,reason='command')=>{
  if(!pdf||!Number.isFinite(n))return;
  const next=clampPage(Math.round(n),pdf.numPages);lastCapture.current='';
  const destination={...locationRef.current,pdfPage:next,anchor:{...pdfAnchor(next,doc.sha256),...(bottom?{pdfOffset:1}:{})}};
  if(!reason.startsWith('wheel-'))wheelPager.current.reset();
  queueRestore(reason,destination);trace('navigate',{reason,to:next,from:locationRef.current.pdfPage});
  onLocationRef.current(destination);
 };
 // React-PDF's annotation viewer retains its first onItemClick callback. That
 // mount precedes PDF load, so delegate to the current physical-page handler.
 // LinkService already resolves named/explicit destinations to 1-based pages.
 const setPageRef=useRef(setPage);setPageRef.current=setPage;
 const onPdfItemClick=({pageNumber}:{pageNumber:number})=>setPageRef.current(pageNumber);
 function captureScroll(){
  const el=host.current,l=locationRef.current;if(capturing.current||!el||!scrolling.current||restoring.current)return;
  const nodes=Array.from(el.querySelectorAll<HTMLElement>('[data-physical-page]'));
  const line=el.getBoundingClientRect().top+2;
  let n:number,offset:number;
  // V3: the viewport can sit inside a window spacer after a fast scrollbar drag;
  // map it to the physical page there from measured heights instead of the edge node.
  const topSpacer=l.pdfMode==='continuous'?el.querySelector<HTMLElement>('[data-window-spacer="top"]'):null,bottomSpacer=l.pdfMode==='continuous'?el.querySelector<HTMLElement>('[data-window-spacer="bottom"]'):null;
  const firstNode=nodes[0],lastNode=nodes.at(-1);
  if(topSpacer&&firstNode&&firstNode.getBoundingClientRect().top>line){const at=pageAtOffset(line-topSpacer.getBoundingClientRect().top,1,Number(firstNode.dataset.physicalPage)-1,heights.current,estimateRef.current,gapRef.current);n=at.page;offset=Math.round(at.fraction*1000000)/1000000;}
  else if(bottomSpacer&&lastNode&&lastNode.getBoundingClientRect().bottom<=line){const at=pageAtOffset(line-bottomSpacer.getBoundingClientRect().top,Number(lastNode.dataset.physicalPage)+1,countRef.current,heights.current,estimateRef.current,gapRef.current);n=at.page;offset=Math.round(at.fraction*1000000)/1000000;}
  else{
  const node=l.pdfMode==='grid'?el.querySelector<HTMLElement>('.pdf-physical-pages'):l.pdfMode==='continuous'?(nodes.find(n=>n.getBoundingClientRect().bottom>line)??nodes.at(-1)):(nodes.find(n=>Number(n.dataset.physicalPage)===l.pdfPage)??nodes[0]);
  if(!node)return;n=l.pdfMode==='grid'?l.pdfPage:Number(node.dataset.physicalPage);const rect=node.getBoundingClientRect();
  if(!rect.height)return;
  offset=Math.round(Math.max(-10,Math.min(10,(el.getBoundingClientRect().top-rect.top)/rect.height))*1000000)/1000000;
  }
  if(n!==l.pdfPage||Math.abs((l.anchor?.pdfOffset??0)-offset)>0.00001){
   const next={...l,pdfPage:n,anchor:{...pdfAnchor(n,doc.sha256),pdfOffset:offset}};
   capturing.current=true;lastCapture.current=positionKey(next);try{onLocationRef.current(next,{checkpoint:true});}finally{capturing.current=false;}
   if(n!==l.pdfPage)trace('capture',{to:n,offset});
  }
  settledTop.current=el.scrollTop;
 }
 const seen=useMemo(()=>captureScroll,[doc.id,doc.sha256]);
 useLayoutEffect(()=>{if(positionKey(loc)!==lastCapture.current){const token=controller.current.current();if(!token||token.targetPage!==loc.pdfPage||token.offset!==(loc.anchor?.pdfOffset??0))queueRestore('location');restorePosition('location');}},[loc.pdfPage,loc.anchor?.pdfOffset]);
 useEffect(()=>{const capture=()=>captureScroll();document.addEventListener('atlas:before-reader-change',capture);return()=>{document.removeEventListener('atlas:before-reader-change',capture);cancelAnimationFrame(scrollFrame.current);clearTimeout(settleTimer.current);};},[doc.id,doc.sha256]);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  const wheel=(e:WheelEvent)=>{
   const target=e.target as HTMLElement;
   const blocked=e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||!!target.closest('input,textarea,select,button,a,[contenteditable="true"],.pdf-outline,.pdf-info-overlay,.pdf-search-overlay,[role="dialog"]');
   if(blocked)return;
   // Scroll the full current surface first. Only a subsequent edge gesture
   // can turn the physical group, even for a large trackpad delta.
   const bounds=wheelBoundaries(el.scrollTop,el.clientHeight,el.scrollHeight);
   const l=locationRef.current,token=controller.current.current();
   const residual=token&&(token.reason==='wheel-next'&&e.deltaY>0||token.reason==='wheel-previous'&&e.deltaY<0);
   if(consumeWheelRestore({mode:l.pdfMode,pendingTurn:wheelTurnPending.current,pendingRestore:pendingRestore.current})&&residual&&controller.current.age()<350){
    trace('wheel-wait',{dy:e.deltaY,pending:true});e.preventDefault();return;
   }
   if(pendingRestore.current)userTakesControl('wheel');
   const turn=wheelPager.current({deltaY:e.deltaY,deltaX:e.deltaX,deltaMode:e.deltaMode,now:performance.now(),mode:l.pdfMode,top:bounds.top,bottom:bounds.bottom,blocked});
   trace('wheel',{dy:e.deltaY,dx:e.deltaX,dm:e.deltaMode,top:bounds.top,bottom:bounds.bottom,turn,latched:wheelPager.current.isLatched(),pending:pendingRestore.current});
   if(turn&&pdf){const paired=l.pdfMode==='grid'?4:l.pdfMode==='spread'&&el.clientWidth>=650;const next=stepPhysicalPage(l.pdfPage,pdf.numPages,turn,paired,l.cover);if(next!==l.pdfPage){e.preventDefault();wheelTurnPending.current=true;setPage(next,turn<0,turn>0?'wheel-next':'wheel-previous');return;}}
   userTakesControl('wheel');
  };
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[pdf,url]);
 useEffect(()=>{
  const close=(event:Event)=>{if((event as CustomEvent).detail?.paneId===paneId){setOutline(false);setSearchOpen(false);setInfo(false);}};
  document.addEventListener('atlas:reader-chrome',close);return()=>document.removeEventListener('atlas:reader-chrome',close);
 },[paneId]);
 useEffect(()=>{
  function keys(e:KeyboardEvent){
   const root=host.current?.closest('.document-pane');
   if(!root?.classList.contains('active-pane')||(!root.closest('.focus-mode')&&document.activeElement!==host.current)||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
   const target=e.target as HTMLElement;if(target?.closest('input,textarea,select,button,a,[contenteditable="true"],[role="textbox"]'))return;
   if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const l=locationRef.current;setPage(stepPhysicalPage(l.pdfPage,pdf?.numPages??1,e.key==='ArrowRight'?1:-1,l.pdfMode==='grid'?4:l.pdfMode==='spread'&&width>=650,l.cover),false,'keyboard');}
  }
  const close=()=>{setOutline(false);setSearchOpen(false);setInfo(false);};
  document.addEventListener('keydown',keys);document.addEventListener('atlas:focus-enter',close);
  return()=>{document.removeEventListener('keydown',keys);document.removeEventListener('atlas:focus-enter',close);};
 },[pdf,width,doc.id]);
 const count=pdf?.numPages??0,page=clampPage(loc.pdfPage,count||1),grid=loc.pdfMode==='grid',paired=loc.pdfMode==='spread'&&width>=650,pages=loc.pdfMode==='continuous'?Array.from({length:count},(_,i)=>i+1):grid?gridPages(page,count,loc.cover):paired?spreadPages(page,count,loc.cover):[page];
 const shownKey=pages.join(',');
 useEffect(()=>{let alive=true;if(grid&&pdf){Promise.all(pages.map(async n=>{const p=await pdf.getPage(n),v=p.getViewport({scale:1,rotation:combinedRotation(p.rotate,loc.rotation)});return [n,v.height/v.width] as const;})).then(pairs=>{if(alive)setGridRatios(Object.fromEntries(pairs));}).catch(()=>{});}return()=>{alive=false;};},[pdf,grid,shownKey,loc.rotation]);
 const labels=!host.current?.closest('.reader-chrome-hidden'),pageWidth=grid?gridPageWidth(width,height,pages.map(n=>gridRatios[n]??1.414),labels)*loc.zoom:Math.max(64,Math.floor((width-32-(paired?16:0))/(paired?2:1)*loc.zoom));
 const groupSize=grid?4:paired;
 // PDF-03: printed page labels from the file itself (display only; must match the physical count).
 useEffect(()=>{let alive=true;setPageLabels(null);if(pdf)pdf.getPageLabels().then(l=>{if(alive)setPageLabels(Array.isArray(l)&&l.length===pdf.numPages?l:null);}).catch(()=>{});return()=>{alive=false;};},[pdf]);
 const printed=printedLabelFor(pageLabels,page);
 const layoutKey=[doc.id,doc.sha256,pageWidth,loc.rotation,labels].join('|');geometryKeyRef.current=layoutKey;
 useLayoutEffect(()=>{queueRestore('layout');restorePosition('layout');return()=>cancelAnimationFrame(restoreFrame.current);},[loc.pdfMode,loc.zoom,loc.rotation,loc.cover,width,height,pdf,layoutKey]);
 const metricFor=(n:number):PageMetric|undefined=>{const v=metricValues.get(n);if(!v)return undefined;const ratio=(loc.rotation%180===0?v.height/v.width:v.width/v.height);return {ratio,intrinsic:v.intrinsic};};
 if(layoutRef.current!==layoutKey){layoutRef.current=layoutKey;heights.current=new Map();}
 for(const [n] of metricValues)heights.current.set(n,physicalPageHeight(pageWidth,metricFor(n)!.ratio,labels));
 const estimate=physicalPageHeight(pageWidth,1.414,labels);estimateRef.current=estimate;countRef.current=count;
 const win=loc.pdfMode==='continuous'?continuousWindow(page,count,windowRadius(height,estimate)):{first:1,last:0,windowed:false};
 const rendered=win.windowed?Array.from({length:win.last-win.first+1},(_,i)=>win.first+i):pages,renderedKey=rendered.join(',');
 useLayoutEffect(()=>{const c=host.current?.querySelector<HTMLElement>('.pdf-physical-pages');if(c){const g=parseFloat(getComputedStyle(c).rowGap);if(Number.isFinite(g))gapRef.current=g;}});
 useEffect(()=>{
  if(!pdf)return;let alive=true;
  const wanted=rendered.filter(n=>!metricValues.has(n)&&!(metrics.pdf===pdf&&metrics.failed.has(n)));if(!wanted.length)return;
  const jobs=wanted.map(n=>{let promise=metricJobs.get(n);if(!promise){promise=pdf.getPage(n).then(p=>{const v=p.getViewport({scale:1,rotation:p.rotate});if(!(v.width>0&&v.height>0))throw Error('Invalid PDF page geometry');return {width:v.width,height:v.height,intrinsic:p.rotate};});metricJobs.set(n,promise);}return promise;});
  const deliver=(n:number,value?:{width:number;height:number;intrinsic:number})=>{
   if(!alive)return;
   const el=host.current;
   if(el&&locationRef.current.pdfMode==='continuous'&&!pendingRestore.current){const top=el.getBoundingClientRect().top;const node=Array.from(el.querySelectorAll<HTMLElement>('[data-physical-page]')).find(n=>n.getBoundingClientRect().bottom>top);
    if(node)geometryAnchor.current={n:Number(node.dataset.physicalPage),top:node.getBoundingClientRect().top,scroll:el.scrollTop,key:geometryKeyRef.current};}
   setMetrics(previous=>{const values=new Map(previous.pdf===pdf?previous.values:[]),failed=new Set(previous.pdf===pdf?previous.failed:[]);
    if(value)values.set(n,value);else failed.add(n);return {pdf,values,failed};});
   if(!value)pageFailed(n);
  };
  jobs.forEach((promise,i)=>{promise.then(value=>deliver(wanted[i],value),()=>deliver(wanted[i]));});
  return()=>{alive=false;};
 },[pdf,renderedKey]);
 useLayoutEffect(()=>{
  const a=geometryAnchor.current,el=host.current;geometryAnchor.current=null;
  if(a&&el&&a.key===geometryKeyRef.current&&!pendingRestore.current){const node=el.querySelector<HTMLElement>('[data-physical-page="'+a.n+'"]');if(node){
   const delta=geometryCompensation(a.top,node.getBoundingClientRect().top,a.scroll,el.scrollTop),before=el.scrollTop;
   el.scrollTop+=delta;settledTop.current=el.scrollTop;
   if(Math.abs(delta)>0.5)trace('geometry-compensation',{n:a.n,delta,applied:el.scrollTop-before,before,after:el.scrollTop});
  }}
  restorePosition('geometry');
 },[metrics,layoutKey,renderedKey]);
 // Runtime-only position for the study tree (current row, A/B markers, count).
 useEffect(()=>{if(!pdf||!paneId)return;publishPosition({slot:slotId??1,paneId,documentId:doc.id,sha256:doc.sha256,page,visible:loc.pdfMode==='continuous'?[page]:pages,numPages:count});},[pdf,paneId,slotId,doc.id,doc.sha256,page,shownKey,count]);
 useEffect(()=>()=>{if(paneId)clearPosition(slotId??1,paneId,doc.id);},[paneId,slotId,doc.id]);
 function commitPageInput(){const parsed=parsePageInput(pageInput,count) as {ok:true;page:number}|{ok:false;message:string};if(!parsed.ok){setPageMessage(parsed.message);return;}setPageMessage('');setPage(parsed.page,false,'page-input');}
 // Escape first cancels a pending page draft or message; with nothing to cancel it propagates (e.g. to exit Focus mode).
 function pageInputKeys(e:React.KeyboardEvent<HTMLInputElement>){if(e.key==='Escape'&&(pageInput!==String(page)||pageMessage)){e.preventDefault();e.stopPropagation();setPageInput(String(page));setPageMessage('');}}
 function downloadTrace(){const blob=new Blob([JSON.stringify(navigationTrace.snapshot(),null,2)+'\n'],{type:'application/json'}),href=URL.createObjectURL(blob),a=window.document.createElement('a');a.href=href;a.download='atlas-pdf-navigation-trace.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
 function changeMode(mode:Location['pdfMode']){wheelPager.current.reset();userTakesControl('mode');onLocation({...loc,pdfMode:mode,...(mode==='grid'?{zoom:1}:{})});}

 async function find(){const text=query.trim().toLocaleLowerCase();const currentJob=++job.current;setHits([]);if(!pdf||!text){setFindStatus('Enter text present in the PDF.');return;}setFindStatus('Searching selectable PDF text...');const found:{page:number;excerpt:string}[]=[];let characters=0;const limit=Math.min(pdf.numPages,1000);
  try{for(let n=1;n<=limit;n++){if(currentJob!==job.current)return;const p=await pdf.getPage(n),content=await p.getTextContent();const value=content.items.map(item=>'str'in item?item.str:'').join(' ');characters+=value.length;const at=value.toLocaleLowerCase().indexOf(text);if(at>=0)found.push({page:n,excerpt:value.slice(Math.max(0,at-45),at+text.length+100)});if(n%10===0){setFindStatus('Searched '+n+' / '+limit+' pages');setHits([...found]);await new Promise(r=>setTimeout(r,0));}}if(currentJob!==job.current)return;setHits(found);setFindStatus((characters?found.length+' matching pages.':'No selectable text found. This may be an image-only PDF; OCR is not included.')+(limit<pdf.numPages?' Search bounded to the first 1,000 physical pages.':''));}catch(e){if(currentJob===job.current)setFindStatus('Text search failed: '+(e as Error).message);}
 }
 if(!url)return <div className="pdf-engine-empty"><h1>{doc.title}</h1>{doc.source.url?<><p>Allow the external PDF host before any document request.</p><code>{doc.source.url}</code><button onClick={requestExternal}>Allow external PDF reference</button></>:<p role="alert">PDF bytes are unavailable. Import the original PDF through Workspace settings.</p>}</div>;
 return <div className="integrated-pdf" data-pdf-state={error||workerError?'error':pdf?'ready':'loading'} data-pdf-engine-version={pdfjs.version} data-worker-status={workerOK?'compatible':workerError?'error':'checking'}>
  <div className="pdf-controls" aria-label="Physical PDF controls">
   <IconButton name="left" label="Previous PDF page" disabled={!pdf||(grid||paired?pages[0]:page)<=1} onClick={()=>setPage(stepPhysicalPage(page,count,-1,groupSize,loc.cover),false,'toolbar-previous')}/>
   <form onSubmit={e=>{e.preventDefault();commitPageInput();}}><input aria-label="Physical PDF page number" aria-invalid={!!pageMessage} type="number" min="1" max={count||1} value={pageInput} onChange={e=>{setPageInput(e.target.value);setPageMessage('');}} onKeyDown={pageInputKeys}/><span aria-label="Physical page count"> / {count||'...'}</span>{printed&&<span className="pdf-printed-label" title="Printed page label from the PDF. Page numbers you type are physical pages.">printed {printed}</span>}{pages.length>1&&loc.pdfMode!=='continuous'&&<span className="pdf-page-range" aria-label="Displayed physical pages">({pageRangeLabel(pages,count).split(' / ')[0]})</span>}</form>
   {pageMessage&&<span className="pdf-page-message" role="alert">{pageMessage}</span>}
   <IconButton name="right" label="Next" disabled={!pdf||((grid||paired)?pages[pages.length-1]:page)>=count} onClick={()=>setPage(stepPhysicalPage(page,count,1,groupSize,loc.cover),false,'toolbar-next')}/>
   <select aria-label="PDF presentation" value={loc.pdfMode} onChange={e=>changeMode(e.target.value as Location['pdfMode'])}><option value="single">Single</option><option value="continuous">Continuous</option><option value="spread">Spread</option><option value="grid">Four pages</option></select>
   <select aria-label="PDF zoom" value={loc.zoom} onChange={e=>onLocation({...loc,zoom:Number(e.target.value)})}>{[0.5,0.75,1,1.25,1.5,2].map(z=><option key={z} value={z}>{z===1?(grid?'Fit grid':'Fit width'):Math.round(z*100)+'%'}</option>)}</select>
   <IconButton name="rotate" label="Rotate 90 degrees" onClick={()=>onLocation({...loc,rotation:(loc.rotation+90)%360})}/>
   <IconButton name="search" label="Search PDF" active={searchOpen} onClick={()=>{setSearchOpen(!searchOpen);setOutline(false);setInfo(false);}}/>
   <IconButton name="list" label="Outline" active={outline} onClick={()=>{setOutline(!outline);setSearchOpen(false);setInfo(false);}}/>
   {(loc.pdfMode==='spread'||grid)&&<label className="pdf-cover-toggle" title="Show the cover alone"><input type="checkbox" checked={loc.cover} onChange={e=>onLocation({...loc,cover:e.target.checked})}/> Cover alone</label>}
   <a className="icon-button" aria-label="Download original" title="Download original" href={url} download={doc.title+'.pdf'}><Icon name="download"/></a>
   <IconButton name="more" label="Document info" active={info} onClick={()=>{setInfo(!info);setSearchOpen(false);setOutline(false);}}/>
  </div>
  {info&&<aside className="pdf-info-overlay"><IconButton name="close" label="Close document info" onClick={()=>setInfo(false)}/><DocumentInfo document={doc} url={url}/><p className="pdf-trace-note"><button type="button" className="text-button" onClick={downloadTrace}>Download navigation trace</button> Page numbers, timings and scroll deltas only. No PDF text, titles or URLs.</p></aside>}
  {searchOpen&&<aside className="pdf-search-overlay" aria-label="PDF text search">
   <IconButton name="close" label="Close PDF search" onClick={()=>setSearchOpen(false)}/>
   <form className="pdf-find" onSubmit={e=>{e.preventDefault();void find();}}><input aria-label="Find text in PDF" value={query} onChange={e=>{job.current++;setHits([]);setFindStatus('');setQuery(e.target.value);}} placeholder="Find selectable text..."/><button disabled={!pdf}>Find</button><span role="status">{findStatus}</span></form>
   {hits.length>0&&<div className="pdf-search-results">{hits.map(h=><button key={h.page} onClick={()=>setPage(h.page)}><strong>Page {h.page}</strong> {h.excerpt}</button>)}</div>}
  </aside>}
  {loc.pdfMode==='spread'&&!paired&&<span className="pdf-narrow-indicator" title="Narrow canvas: displaying one physical page. Spread preference is retained.">Single page at this width</span>}
  {passwordCallback.current&&<form className="pdf-password" onSubmit={e=>{e.preventDefault();const callback=passwordCallback.current;passwordCallback.current=null;callback?.(password);setPassword('');setPasswordReason('');}}><p>{passwordReason} Passwords are used in memory only and are never backed up.</p><label>PDF password<input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/></label><button>Unlock PDF</button><button type="button" onClick={()=>{passwordCallback.current=null;setPassword('');setPasswordReason('');setError('Password entry cancelled. The original bytes remain intact.');}}>Cancel</button></form>}
  {(error||workerError)&&<div className="pdf-engine-error" role="alert"><strong>PDF could not be opened</strong><p>{workerError||error}</p><button onClick={()=>{setError('');setRetry(x=>x+1);}}>Retry PDF</button>{onFallback&&<button onClick={()=>onFallback(workerError||error)}>Use browser PDF fallback</button>}<a href={url} target="_blank" rel="noopener noreferrer">Open original</a></div>}
  {pdf&&<form className="pdf-page-compact" aria-label="Physical PDF page" onSubmit={e=>{e.preventDefault();commitPageInput();}}>
   <IconButton type="button" name="left" label="Previous PDF page (compact)" disabled={(grid||paired?pages[0]:page)<=1} onClick={()=>setPage(stepPhysicalPage(page,count,-1,groupSize,loc.cover),false,'compact-previous')}/>
   <label><span>Page</span><input aria-label="Physical PDF page number (compact)" aria-invalid={!!pageMessage} inputMode="numeric" value={pageInput} onChange={e=>{setPageInput(e.target.value);setPageMessage('');}} onKeyDown={pageInputKeys}/></label><span className="pdf-page-compact-count" aria-label="Physical page count (compact)">/ {count}</span>{printed&&<span className="pdf-printed-label" aria-label={'Printed page label '+printed}>({printed})</span>}{pages.length>1&&loc.pdfMode!=='continuous'&&<span className="pdf-page-range" aria-label="Displayed physical pages (compact)">({pageRangeLabel(pages,count).split(' / ')[0]})</span>}
   <IconButton type="button" name="right" label="Next PDF page (compact)" disabled={((grid||paired)?pages[pages.length-1]:page)>=count} onClick={()=>setPage(stepPhysicalPage(page,count,1,groupSize,loc.cover),false,'compact-next')}/>
   {pageMessage&&<span className="pdf-page-message" role="alert">{pageMessage}</span>}
  </form>}
  <div className="pdf-canvas-scroll" ref={host} tabIndex={0} aria-label="PDF document canvas"
   onTouchStart={()=>userTakesControl('touch')} onPointerDown={()=>userTakesControl('pointer')}
   onKeyDown={e=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key))userTakesControl('keyboard');}}
   onScroll={()=>{cancelAnimationFrame(scrollFrame.current);scrollFrame.current=requestAnimationFrame(captureScroll);clearTimeout(settleTimer.current);settleTimer.current=setTimeout(()=>{captureScroll();scrolling.current=false;},180);}}>
   {workerOK&&source&&!error&&!workerError?<Document key={doc.id+':'+doc.sha256+':'+retry} file={source} options={options} externalLinkTarget="_blank" externalLinkRel="noopener noreferrer" onLoadSuccess={async p=>{setPDF(p);setLoading('');publishVerifiedCount(doc.id,doc.sha256,p.numPages);trace('open',{count:p.numPages});const n=clampPage(locationRef.current.pdfPage,p.numPages);const l=locationRef.current;if(l.pdfPage!==n||l.anchor?.pdfPage!==n||l.anchor?.pdfRevision!==doc.sha256)onLocationRef.current({...l,pdfPage:n,anchor:pdfAnchor(n,doc.sha256)});queueRestore('open');}} onLoadError={e=>{userTakesControl('document-error');setError(e.message);}} onSourceError={e=>{userTakesControl('document-error');setError(e.message);}} onLoadProgress={({loaded,total})=>setLoading(total?'Loading '+Math.round(loaded/total*100)+'%':'Loading PDF bytes...')} onPassword={(callback,reason)=>{passwordCallback.current=callback;setPasswordReason(reason===2?'Incorrect password. Try again.':'This PDF is password protected.');}} onItemClick={onPdfItemClick} loading={<p role="status">{loading}</p>}>
    {pdf&&<aside className="pdf-outline" hidden={!outline}><IconButton name="close" label="Close PDF outline" onClick={()=>setOutline(false)}/><h3>Document outline</h3><Outline onItemClick={onPdfItemClick}/></aside>}
    <div className={'pdf-physical-pages '+(grid?'pdf-grid '+(pages.length===1?'grid-single':''):paired?'pdf-spread':'')} data-grid={grid?'four-pages':undefined} onPointerDown={e=>{if(!grid||(e.target as HTMLElement).closest('a'))return;const n=Number((e.target as HTMLElement).closest<HTMLElement>('[data-physical-page]')?.dataset.physicalPage);if(n&&n!==loc.pdfPage)setPage(n);}}>{pdf&&win.windowed&&win.first>1&&<div className="pdf-window-spacer" data-window-spacer="top" aria-hidden="true" style={{height:spacerHeight(1,win.first-1,heights.current,estimate,gapRef.current)}}/>}{pdf&&rendered.map(n=><PhysicalPage key={n+':'+layoutKey} n={n} width={pageWidth} rotation={loc.rotation} root={host.current} virtual={loc.pdfMode==='continuous'} labels={labels} metric={metricFor(n)} geometryKey={layoutKey} failed={metrics.pdf===pdf&&metrics.failed.has(n)} onVisible={seen} onFailure={pageFailed}/>)}{pdf&&win.windowed&&win.last<count&&<div className="pdf-window-spacer" data-window-spacer="bottom" aria-hidden="true" style={{height:spacerHeight(win.last+1,count,heights.current,estimate,gapRef.current)}}/>}</div>
   </Document>:!error&&!workerError&&<p>{workerOK?'Loading PDF bytes...':'Checking compatible local PDF worker...'}</p>}
  </div>
 </div>;
}
