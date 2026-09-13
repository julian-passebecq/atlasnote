/** Primary hosted PDF adapter. Worker, CMaps, WASM and standard fonts are copied
 * from React-PDF's resolved PDF.js package; the version gate is never bypassed.
 * The separate compatibility build uses the native renderer, not this adapter. */
import React,{useState,useEffect,useMemo,useRef} from 'react';
import {Document,Page,Outline,pdfjs} from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type {DocumentEntry,Location} from '../core/model';
import {clampPage,spreadPages,combinedRotation,stepPhysicalPage} from '../pdf/physical-pages.mjs';
import {pdfAnchor} from '../core/personal-state';
import {DocumentInfo} from '../pdf/DocumentInfo';
import {Icon,IconButton} from '../components/Icon';
import './pdf.css';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf-assets/pdf.worker.min.mjs',document.baseURI).href;
const options={isEvalSupported:false,standardFontDataUrl:new URL('pdf-assets/standard_fonts/',document.baseURI).href,cMapUrl:new URL('pdf-assets/cmaps/',document.baseURI).href,cMapPacked:true,wasmUrl:new URL('pdf-assets/wasm/',document.baseURI).href};
type PDF=Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
type Props={document:DocumentEntry;location:Location;onLocation:(l:Location)=>void;url?:string;requestExternal:()=>void;onFallback?:(reason?:string)=>void};
function PhysicalPage({pdf,n,width,rotation,root,virtual,onVisible}:{pdf:PDF;n:number;width:number;rotation:number;root:HTMLDivElement|null;virtual:boolean;onVisible:(n:number)=>void}){
 const ref=useRef<HTMLDivElement>(null),[near,setNear]=useState(!virtual),[size,setSize]=useState({ratio:1.414,intrinsic:0});
 useEffect(()=>{if(!virtual){setNear(true);return;}const observer=new IntersectionObserver(entries=>{setNear(entries[0].isIntersecting);},{root,rootMargin:'900px 0px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[virtual,root]);
 useEffect(()=>{let alive=true;if(near)pdf.getPage(n).then(p=>{if(!alive)return;const v=p.getViewport({scale:1,rotation:combinedRotation(p.rotate,rotation)});setSize({ratio:v.height/v.width,intrinsic:p.rotate});}).catch(()=>{});return()=>{alive=false;};},[near,pdf,n,rotation]);
 useEffect(()=>{if(!virtual)return;const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)onVisible(n);},{root,rootMargin:'-10% 0px -75% 0px',threshold:0});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[root,virtual,n,onVisible]);
 const dpr=Math.max(0.5,Math.min(window.devicePixelRatio||1,2,Math.sqrt(5000000/(width*width*size.ratio))));
 return <section ref={ref} className="physical-page" data-physical-page={n} style={{width,minHeight:Math.ceil(width*size.ratio)+28}} aria-label={'Physical PDF page '+n}>
  <div className="physical-label">Page {n}</div>{near?<Page pageNumber={n} width={width} rotate={combinedRotation(size.intrinsic,rotation)} devicePixelRatio={dpr} renderAnnotationLayer renderTextLayer error={<p role="alert">This physical page could not be rendered. The original PDF remains available.</p>} loading={<p>Rendering page {n}...</p>}/>:<div className="pdf-placeholder" style={{height:width*size.ratio}}>Page {n}</div>}
 </section>;
}
export function PdfEngine({document:doc,location:loc,onLocation,url,requestExternal,onFallback}:Props){
 const [pdf,setPDF]=useState<PDF|null>(null),[error,setError]=useState(''),[workerOK,setWorkerOK]=useState(false),[workerError,setWorkerError]=useState(''),[loading,setLoading]=useState('Opening PDF...'),[retry,setRetry]=useState(0),[outline,setOutline]=useState(false),[searchOpen,setSearchOpen]=useState(false),[info,setInfo]=useState(false),[query,setQuery]=useState(''),[hits,setHits]=useState<{page:number;excerpt:string}[]>([]),[findStatus,setFindStatus]=useState(''),[password,setPassword]=useState(''),[passwordReason,setPasswordReason]=useState(''),[width,setWidth]=useState(700),[pageInput,setPageInput]=useState(String(loc.pdfPage));
 const passwordCallback=useRef<((value:string)=>void)|null>(null),host=useRef<HTMLDivElement>(null),job=useRef(0),locationRef=useRef(loc),onLocationRef=useRef(onLocation);locationRef.current=loc;onLocationRef.current=onLocation;
 const source=useMemo(()=>url?{url}:null,[url]);
 const capturing=useRef(false),scrolling=useRef(false),restoreFrame=useRef(0),scrollFrame=useRef(0),settleTimer=useRef<ReturnType<typeof setTimeout>>();
 useEffect(()=>{let alive=true;setWorkerOK(false);setWorkerError('');fetch(new URL('pdf-assets/engine.json',document.baseURI),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('PDF worker metadata missing');return r.json();}).then(meta=>{if(meta.pdfjs!==pdfjs.version)throw Error('PDF worker version does not match React-PDF: '+meta.pdfjs+' vs '+pdfjs.version);if(alive)setWorkerOK(true);}).catch(e=>{if(alive)setWorkerError(e.message);});return()=>{alive=false;};},[retry]);
 useEffect(()=>{setPDF(null);setError('');setHits([]);setFindStatus('');setPassword('');setPasswordReason('');passwordCallback.current=null;job.current++;return()=>{job.current++;passwordCallback.current=null;};},[doc.id,doc.sha256,url,retry]);
 useEffect(()=>{setPageInput(String(loc.pdfPage));},[loc.pdfPage]);
 useEffect(()=>{const el=host.current;if(!el)return;const ro=new ResizeObserver(()=>setWidth(el.clientWidth));ro.observe(el);return()=>ro.disconnect();},[url]);
 const setPage=(n:number)=>{scrolling.current=false;const page=clampPage(n,pdf?.numPages??n);onLocationRef.current({...locationRef.current,pdfPage:page,anchor:pdfAnchor(page,doc.sha256)});if(locationRef.current.pdfMode==='continuous')requestAnimationFrame(()=>host.current?.querySelector<HTMLElement>('[data-physical-page="'+page+'"]')?.scrollIntoView({block:'start',behavior:'auto'}));};
 const seen=useMemo(()=>{let last=0;return (n:number)=>{if(last===n)return;last=n;const l=locationRef.current;if(scrolling.current&&l.pdfMode==='continuous'&&l.pdfPage!==n)onLocationRef.current({...l,pdfPage:n,anchor:pdfAnchor(n,doc.sha256)});};},[doc.id,doc.sha256]);
 // Only user scrolling owns physical-page updates. Loading, resize, reflow and
 // backup cannot silently replace the saved page with an observer's first page.
 useEffect(()=>{scrolling.current=false;if(pdf&&loc.pdfMode==='continuous')restoreFrame.current=requestAnimationFrame(()=>host.current?.querySelector<HTMLElement>('[data-physical-page="'+clampPage(locationRef.current.pdfPage,pdf.numPages)+'"]')?.scrollIntoView({block:'start',behavior:'auto'}));return()=>cancelAnimationFrame(restoreFrame.current);},[loc.pdfMode,loc.zoom,loc.rotation,loc.cover,width,pdf]);
 function captureScroll(){
  const el=host.current,l=locationRef.current;if(capturing.current||!el||!scrolling.current||l.pdfMode!=='continuous')return;
  const line=el.getBoundingClientRect().top+Math.min(80,el.clientHeight*.12);
  const nodes=Array.from(el.querySelectorAll<HTMLElement>('[data-physical-page]'));
  const node=nodes.find(n=>n.getBoundingClientRect().bottom>line)??nodes[nodes.length-1];
  const n=Number(node?.dataset.physicalPage);if(n&&n!==l.pdfPage){capturing.current=true;try{onLocationRef.current({...l,pdfPage:n,anchor:pdfAnchor(n,doc.sha256)});}finally{capturing.current=false;}}
 }
 useEffect(()=>{const capture=()=>captureScroll();document.addEventListener('atlas:before-reader-change',capture);return()=>{document.removeEventListener('atlas:before-reader-change',capture);cancelAnimationFrame(scrollFrame.current);clearTimeout(settleTimer.current);};},[doc.id,doc.sha256]);
 useEffect(()=>{
  function keys(e:KeyboardEvent){
   const root=host.current?.closest('.document-pane');
   if(!root?.classList.contains('active-pane')||!root.closest('.focus-mode')||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
   const target=e.target as HTMLElement;if(target?.closest('input,textarea,select,button,a,[contenteditable="true"],[role="textbox"]'))return;
   if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const l=locationRef.current;setPage(stepPhysicalPage(l.pdfPage,pdf?.numPages??1,e.key==='ArrowRight'?1:-1,l.pdfMode==='spread'&&width>=650,l.cover));}
  }
  const close=()=>{setOutline(false);setSearchOpen(false);setInfo(false);};
  document.addEventListener('keydown',keys);document.addEventListener('atlas:focus-enter',close);
  return()=>{document.removeEventListener('keydown',keys);document.removeEventListener('atlas:focus-enter',close);};
 },[pdf,width,doc.id]);
 const count=pdf?.numPages??0,page=clampPage(loc.pdfPage,count||1),paired=loc.pdfMode==='spread'&&width>=650,pages=loc.pdfMode==='continuous'?Array.from({length:count},(_,i)=>i+1):paired?spreadPages(page,count,loc.cover):[page];
 const pageWidth=Math.max(64,Math.floor((width-32-(paired?16:0))/(paired?2:1)*loc.zoom));
 async function find(){const text=query.trim().toLocaleLowerCase();const currentJob=++job.current;setHits([]);if(!pdf||!text){setFindStatus('Enter text present in the PDF.');return;}setFindStatus('Searching selectable PDF text...');const found:{page:number;excerpt:string}[]=[];let characters=0;const limit=Math.min(pdf.numPages,1000);
  try{for(let n=1;n<=limit;n++){if(currentJob!==job.current)return;const p=await pdf.getPage(n),content=await p.getTextContent();const value=content.items.map(item=>'str'in item?item.str:'').join(' ');characters+=value.length;const at=value.toLocaleLowerCase().indexOf(text);if(at>=0)found.push({page:n,excerpt:value.slice(Math.max(0,at-45),at+text.length+100)});if(n%10===0){setFindStatus('Searched '+n+' / '+limit+' pages');setHits([...found]);await new Promise(r=>setTimeout(r,0));}}if(currentJob!==job.current)return;setHits(found);setFindStatus((characters?found.length+' matching pages.':'No selectable text found. This may be an image-only PDF; OCR is not included.')+(limit<pdf.numPages?' Search bounded to the first 1,000 physical pages.':''));}catch(e){if(currentJob===job.current)setFindStatus('Text search failed: '+(e as Error).message);}
 }
 if(!url)return <div className="pdf-engine-empty"><h1>{doc.title}</h1>{doc.source.url?<><p>Allow the external PDF host before any document request.</p><code>{doc.source.url}</code><button onClick={requestExternal}>Allow external PDF reference</button></>:<p role="alert">PDF bytes are unavailable. Import the original PDF through Workspace settings.</p>}</div>;
 return <div className="integrated-pdf" data-pdf-state={error||workerError?'error':pdf?'ready':'loading'} data-pdf-engine-version={pdfjs.version} data-worker-status={workerOK?'compatible':workerError?'error':'checking'}>
  <div className="pdf-controls" aria-label="Physical PDF controls">
   <IconButton name="left" label="Previous PDF page" disabled={!pdf||page<=1} onClick={()=>setPage(stepPhysicalPage(page,count,-1,paired,loc.cover))}/>
   <form onSubmit={e=>{e.preventDefault();setPage(Number(pageInput));}}><input aria-label="Physical PDF page number" type="number" min="1" max={count||1} value={pageInput} onChange={e=>setPageInput(e.target.value)}/><span aria-label="Physical page count"> / {count||'...'}</span></form>
   <IconButton name="right" label="Next" disabled={!pdf||(paired?pages[pages.length-1]:page)>=count} onClick={()=>setPage(stepPhysicalPage(page,count,1,paired,loc.cover))}/>
   <select aria-label="PDF presentation" value={loc.pdfMode} onChange={e=>onLocation({...loc,pdfMode:e.target.value as Location['pdfMode']})}><option value="single">Single</option><option value="continuous">Continuous</option><option value="spread">Spread</option></select>
   <select aria-label="PDF zoom" value={loc.zoom} onChange={e=>onLocation({...loc,zoom:Number(e.target.value)})}>{[0.5,0.75,1,1.25,1.5,2].map(z=><option key={z} value={z}>{z===1?'Fit width':Math.round(z*100)+'%'}</option>)}</select>
   <IconButton name="rotate" label="Rotate 90 degrees" onClick={()=>onLocation({...loc,rotation:(loc.rotation+90)%360})}/>
   <IconButton name="search" label="Search PDF" active={searchOpen} onClick={()=>{setSearchOpen(!searchOpen);setOutline(false);setInfo(false);}}/>
   <IconButton name="list" label="Outline" active={outline} onClick={()=>{setOutline(!outline);setSearchOpen(false);setInfo(false);}}/>
   {loc.pdfMode==='spread'&&<label className="pdf-cover-toggle" title="Show the cover alone"><input type="checkbox" checked={loc.cover} onChange={e=>onLocation({...loc,cover:e.target.checked})}/> Cover alone</label>}
   <a className="icon-button" aria-label="Download original" title="Download original" href={url} download={doc.title+'.pdf'}><Icon name="download"/></a>
   <IconButton name="more" label="Document info" active={info} onClick={()=>{setInfo(!info);setSearchOpen(false);setOutline(false);}}/>
  </div>
  {info&&<aside className="pdf-info-overlay"><IconButton name="close" label="Close document info" onClick={()=>setInfo(false)}/><DocumentInfo document={doc} url={url}/></aside>}
  {searchOpen&&<aside className="pdf-search-overlay" aria-label="PDF text search">
   <IconButton name="close" label="Close PDF search" onClick={()=>setSearchOpen(false)}/>
   <form className="pdf-find" onSubmit={e=>{e.preventDefault();void find();}}><input aria-label="Find text in PDF" value={query} onChange={e=>{job.current++;setHits([]);setFindStatus('');setQuery(e.target.value);}} placeholder="Find selectable text..."/><button disabled={!pdf}>Find</button><span role="status">{findStatus}</span></form>
   {hits.length>0&&<div className="pdf-search-results">{hits.map(h=><button key={h.page} onClick={()=>setPage(h.page)}><strong>Page {h.page}</strong> {h.excerpt}</button>)}</div>}
  </aside>}
  {loc.pdfMode==='spread'&&!paired&&<span className="pdf-narrow-indicator" title="Narrow canvas: displaying one physical page. Spread preference is retained.">Single page at this width</span>}
  {passwordCallback.current&&<form className="pdf-password" onSubmit={e=>{e.preventDefault();const callback=passwordCallback.current;passwordCallback.current=null;callback?.(password);setPassword('');setPasswordReason('');}}><p>{passwordReason} Passwords are used in memory only and are never backed up.</p><label>PDF password<input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/></label><button>Unlock PDF</button><button type="button" onClick={()=>{passwordCallback.current=null;setPassword('');setPasswordReason('');setError('Password entry cancelled. The original bytes remain intact.');}}>Cancel</button></form>}
  {(error||workerError)&&<div className="pdf-engine-error" role="alert"><strong>PDF could not be opened</strong><p>{workerError||error}</p><button onClick={()=>{setError('');setRetry(x=>x+1);}}>Retry PDF</button>{onFallback&&<button onClick={()=>onFallback(workerError||error)}>Use browser PDF fallback</button>}<a href={url} target="_blank" rel="noopener noreferrer">Open original</a></div>}
  <div className="pdf-canvas-scroll" ref={host} tabIndex={0} aria-label="PDF document canvas"
   onWheel={()=>{scrolling.current=true;}} onTouchStart={()=>{scrolling.current=true;}} onPointerDown={()=>{scrolling.current=true;}}
   onKeyDown={e=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key))scrolling.current=true;}}
   onScroll={()=>{cancelAnimationFrame(scrollFrame.current);scrollFrame.current=requestAnimationFrame(captureScroll);clearTimeout(settleTimer.current);settleTimer.current=setTimeout(()=>{captureScroll();scrolling.current=false;},180);}}>
   {workerOK&&!error&&!workerError?<Document key={doc.id+':'+doc.sha256+':'+retry} file={source} options={options} externalLinkTarget="_blank" externalLinkRel="noopener noreferrer" onLoadSuccess={async p=>{setPDF(p);setLoading('');const n=clampPage(locationRef.current.pdfPage,p.numPages);const l=locationRef.current;if(l.pdfPage!==n||l.anchor?.pdfPage!==n||l.anchor?.pdfRevision!==doc.sha256)onLocationRef.current({...l,pdfPage:n,anchor:pdfAnchor(n,doc.sha256)});requestAnimationFrame(()=>{if(locationRef.current.pdfMode==='continuous')host.current?.querySelector<HTMLElement>('[data-physical-page="'+n+'"]')?.scrollIntoView({block:'start'});});}} onLoadError={e=>setError(e.message)} onSourceError={e=>setError(e.message)} onLoadProgress={({loaded,total})=>setLoading(total?'Loading '+Math.round(loaded/total*100)+'%':'Loading PDF bytes...')} onPassword={(callback,reason)=>{passwordCallback.current=callback;setPasswordReason(reason===2?'Incorrect password. Try again.':'This PDF is password protected.');}} onItemClick={({pageNumber})=>{if(pageNumber)setPage(pageNumber);}} loading={<p role="status">{loading}</p>}>
    {outline&&<aside className="pdf-outline"><IconButton name="close" label="Close PDF outline" onClick={()=>setOutline(false)}/><h3>Document outline</h3><Outline onItemClick={({pageNumber})=>{if(pageNumber)setPage(pageNumber);}} noData={<p>This PDF has no outline.</p>}/></aside>}
    <div className={'pdf-physical-pages '+(paired?'pdf-spread':'')}>{pdf&&pages.map(n=><PhysicalPage key={n} pdf={pdf} n={n} width={pageWidth} rotation={loc.rotation} root={host.current} virtual={loc.pdfMode==='continuous'} onVisible={seen}/>)}</div>
   </Document>:!error&&!workerError&&<p>Checking compatible local PDF worker...</p>}
  </div>

 </div>;
}
