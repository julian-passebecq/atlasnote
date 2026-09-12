import type {DocumentEntry} from '../core/model.js';
export function isPdfatlasUrl(raw:unknown):boolean {
 if(typeof raw!=='string')return false;
 try{
  const u=new URL(raw);
  return u.protocol==='https:'&&u.hostname==='raw.githubusercontent.com'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&
   // Reject encoding, traversal and parser-normalized spelling, not only hostname.
   raw===u.href&&/^\/julian-passebecq\/pdfatlas\/(?:main|[a-f0-9]{40})\/library\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*\.pdf$/.test(u.pathname);
 }catch{return false;}
}
export function isTrustedPdfatlasDocument(doc:DocumentEntry):boolean {
 return doc.packId==='pdfatlas.public'&&doc.visibility==='public'&&doc.source.kind==='https'&&isPdfatlasUrl(doc.source.url)&&!!doc.sha256&&/^[a-f0-9]{64}$/.test(doc.sha256);
}
/** Fail closed on redirects, authentication or revision mismatch. Returned bytes
 * are transient; opening a public reference never writes it into local backups. */
export async function fetchTrustedPdf(doc:DocumentEntry,signal:AbortSignal):Promise<Uint8Array>{
 if(!isTrustedPdfatlasDocument(doc))throw Error('This document is not a configured public PDF library entry.');
 const r=await fetch(doc.source.url!,{signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
 if(!r.ok)throw Error('PDF host returned HTTP '+r.status+'. The organized library may not have been uploaded yet.');
 if(r.redirected)throw Error('Redirected public PDF references are not permitted.');
 const limit=100*1024*1024,declared=Number(r.headers.get('content-length'));
 if(declared>limit)throw Error('Public PDF exceeds the 100 MB loading limit.');
 const reader=r.body?.getReader();if(!reader)throw Error('This browser cannot stream the public PDF.');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('Public PDF exceeds the 100 MB loading limit.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
 if(doc.bytes!==undefined&&size!==doc.bytes)throw Error('Public PDF byte count differs from the reviewed manifest.');
 if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('The external host did not return a PDF.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==doc.sha256)throw Error('Public PDF revision differs from the reviewed SHA-256. Ask the library maintainer to update its manifest.');
 return bytes;
}
