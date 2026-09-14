import type {DocumentEntry,Workspace} from '../core/model.js';
import type {PdfTerm} from './model.js';
import {resolveStudy} from './tree.js';
import {companionKey,validateCompanion} from './validation.mjs';
import {sha256} from '../core/validation.mjs';
/** Retains the existing source/revision-backed global-glossary workflow. */
export async function promoteStudyTerm(doc:DocumentEntry,term:PdfTerm,store:{state:Workspace;overlays:(fn:(o:Workspace['overlays'])=>void)=>Promise<void>}){
 const key=companionKey(doc),id='term.pdf.'+await sha256(new TextEncoder().encode(key+'\0'+term.id));
 await store.overlays(o=>{const {companion}=resolveStudy(doc,{...store.state,overlays:o});if(!companion)throw Error('No matching study index for this PDF revision.');
  const t=companion.terms.find(t=>t.id===term.id);if(!t)throw Error('This term is no longer in the study index.');
  const valid=validateCompanion({...companion,terms:companion.terms.map(t=>t.id===term.id?{...t,globalTermId:id}:t)},doc);
  o.companions??={};o.companions[key]=valid;o.glossary??=[];
  if(!o.glossary.some(t=>t.id===id))o.glossary.push({id,label:t.label,definition:t.definition,...(t.translation?{translation:t.translation}:{}),example:[t.example,`PDF: ${doc.title}. Physical pages: ${t.pageRefs.join(', ')}.`].filter(Boolean).join('\n'),pageIds:[doc.pageId],tags:['pdf-companion','document:'+doc.id],pdfRefs:[{pageId:doc.pageId,documentId:doc.id,...(doc.sha256?{revision:doc.sha256}:{}),pages:[...t.pageRefs]}]});
 });
}
