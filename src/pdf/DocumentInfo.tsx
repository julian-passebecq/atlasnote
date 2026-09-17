import React from '../vendor/react.mjs';
import type {DocumentEntry} from '../core/model.js';
/** The full provenance lives in an on-demand panel, not above the PDF canvas. */
export function DocumentInfo({document:doc,url,provenance}:{document:DocumentEntry;url?:string;provenance?:string}){
 const original=url??doc.source.url;
 return <section className="pdf-document-info" aria-label="PDF document information">
  <h3>{doc.title}</h3>
  <p>{doc.rights.attribution}</p>
  <dl>
   <dt>Storage</dt><dd>{doc.assetKey?'Local or bundled bytes; included in a complete workspace backup.':'External reference; backup contains metadata only. Import privately to keep an offline copy.'}</dd>
   <dt>Visibility</dt><dd>{doc.visibility}</dd>
   <dt>Document ID</dt><dd><code>{doc.id}</code></dd>
   <dt>Rights</dt><dd>{doc.rights.status}</dd>
   <dt>Expected SHA-256</dt><dd><code>{doc.sha256??'Unverified external reference'}</code></dd>
   <dt>Original bytes</dt><dd>{doc.bytes?.toLocaleString()??'Not locally inspected'}</dd>
   <dt>Physical pages</dt><dd>{doc.pageCount??'Reported by the PDF engine when opened'}</dd>
   {doc.language&&<><dt>Language</dt><dd>{doc.language}</dd></>}
   {(doc.source.url||doc.source.path)&&<><dt>Source</dt><dd><code>{doc.source.url??doc.source.path}</code></dd></>}
   {doc.rights.sourceUrl&&doc.rights.sourceUrl!==doc.source.url&&<><dt>Attribution source</dt><dd><code>{doc.rights.sourceUrl}</code></dd></>}
   {provenance&&<><dt>Provenance</dt><dd>{provenance}</dd></>}
  </dl>
  {original&&<div className="pdf-document-links"><a href={original} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open original PDF</a><a href={original} download={doc.title+'.pdf'} referrerPolicy="no-referrer">Download original</a></div>}
 </section>;
}
