import React,{useEffect,useState,useRef} from '../vendor/react.mjs';
import {isTrustedPdfatlasDocument,fetchTrustedPdf} from './external-policy.js';
import type {DocumentEntry,Location} from '../core/model.js';
import {Icon,IconButton} from '../components/Icon.js';
import {DocumentInfo} from './DocumentInfo.js';
import {EngineBoundary} from './EngineBoundary.js';
/** Hosted entry installs the integrated adapter. Native rendering is only the
 * failure/compatibility path; neither path puts provenance above the document. */
export function PdfReader({document:doc,location,onLocation,resolve,fetchBytes,onRenderer}: {document:DocumentEntry;location:Location;onLocation:any;resolve:(key:string)=>string|undefined;fetchBytes:(key:string)=>Promise<Uint8Array>;onRenderer?:(renderer:'loading'|'integrated'|'native-fallback')=>void}){
 const [adapter,setAdapter]=useState<any>(null),[engineError,setEngineError]=useState(''),[engineAttempt,setEngineAttempt]=useState(0);
 const [engineLoading,setEngineLoading]=useState(!!window.atlasPdfLoader),[native,setNative]=useState(false),[info,setInfo]=useState(false);
 const [consent,setConsent]=useState(false),[url,setUrl]=useState<string|undefined>(undefined),[externalError,setExternalError]=useState(''),[retry,setRetry]=useState(0);
 const renderer=engineLoading?'loading':adapter&&!native?'integrated':'native-fallback';
 const rendererCallback=useRef(onRenderer);rendererCallback.current=onRenderer;
 useEffect(()=>{rendererCallback.current?.(renderer);},[renderer]);
 const trusted=isTrustedPdfatlasDocument(doc),external=doc.source.kind==='https'||doc.source.kind==='external-link';
 useEffect(()=>{
  let active=true;setAdapter(null);setEngineError('');setNative(false);setEngineLoading(!!window.atlasPdfLoader);
  if(window.atlasPdfLoader)Promise.resolve().then(()=>window.atlasPdfLoader!()).then(m=>{
   if(!m?.PdfEngine)throw Error('The integrated PDF module did not export its reader.');
   if(active){setAdapter(()=>m.PdfEngine);setEngineLoading(false);}
  }).catch(e=>{if(active){setEngineError('Integrated PDF engine unavailable: '+(e?.message??e));setEngineLoading(false);}});
  return()=>{active=false;};
 },[engineAttempt]);
 useEffect(()=>{
  const controller=new AbortController();let objectUrl:string|undefined;let active=true;
  setUrl(doc.assetKey?resolve(doc.assetKey):undefined);setConsent(false);setExternalError('');setInfo(false);
  if(trusted)fetchTrustedPdf(doc,controller.signal).then(bytes=>{
   if(!active)return;objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));setUrl(objectUrl);setConsent(true);
  }).catch(e=>{if(active&&e.name!=='AbortError')setExternalError(e.message||'The public PDF host is unavailable.');});
  return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[doc.id,doc.sha256,doc.source.url,doc.assetKey,retry]);
 const source=trusted?url:external?(consent?doc.source.url:undefined):url;
 const allow=()=>setConsent(true);
 function fallback(reason=engineError){return <div className="pdf-reader has-preview" data-pdf-renderer="native-fallback">
  <div className="pdf-fallback-strip" aria-label="Browser fallback controls">
   <span className="pdf-fallback-indicator" title={reason||'Compatibility renderer. Physical-page controls and selectable-text search require the integrated build.'}><Icon name="pdf" size={15}/>Browser PDF fallback</span>
   {window.atlasPdfLoader&&<IconButton name="swap" label="Retry integrated PDF" onClick={()=>setEngineAttempt(n=>n+1)}/>}
   <IconButton name="help" label="Document info" active={info} onClick={()=>setInfo(v=>!v)}/>
   {source&&<a className="icon-button" aria-label="Open original PDF" title="Open original PDF" href={source} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><Icon name="export" size={16}/></a>}
   {source&&<a className="icon-button" aria-label="Download original" title="Download original" href={source} download={doc.title+'.pdf'} referrerPolicy="no-referrer"><Icon name="download" size={16}/></a>}
  </div>
  {info&&<aside className="pdf-info-overlay" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setInfo(false);}}}>
   <IconButton name="close" label="Close document info" onClick={()=>setInfo(false)}/>
   {reason&&<p className="pdf-compact-error" role="alert">{reason}</p>}
   <DocumentInfo document={doc} url={source}/>
  </aside>}
  {source?<iframe className="pdf-fallback" src={source} title={'Browser PDF preview: '+doc.title} referrerPolicy="no-referrer"/>:
   external&&!trusted&&!consent?<div className="pdf-load-state"><p>Opening this PDF contacts its external host. No document request is made before you allow it.</p><code>{doc.source.url}</code><button onClick={allow}>Allow external PDF reference</button></div>:
   <div className="pdf-load-state" role="alert"><strong>PDF bytes are unavailable</strong><p>Import the original PDF through Workspace settings. Its metadata and reading state have been retained.</p></div>}
 </div>;}
 if(trusted&&!url)return <div className="pdf-reader"><div className="pdf-load-state pdf-external-status" role={externalError?'alert':'status'}>
  <strong>{externalError?'Public PDF could not be opened':'Opening verified public PDF...'}</strong><p>{externalError||'Checking the original byte count and SHA-256 before rendering.'}</p>
  {externalError&&<><code>{doc.source.url}</code><button onClick={()=>setRetry(n=>n+1)}>Retry public PDF</button></>}
 </div></div>;
 if(engineLoading)return <div className="pdf-reader"><div className="pdf-load-state" role="status">Opening integrated PDF reader...</div></div>;
 if(adapter&&!native){const Component=adapter;return <EngineBoundary key={engineAttempt+':'+doc.id} fallback={fallback} onError={(reason:string)=>{setEngineError(reason);setNative(true);}}>
  <Component document={doc} location={location} onLocation={onLocation} url={source} requestExternal={allow} onFallback={(reason?:string)=>{setEngineError(reason??'Integrated PDF rendering failed.');setNative(true);}}/>
 </EngineBoundary>;}
 return fallback();
}
