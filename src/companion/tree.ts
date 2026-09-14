import type {DocumentEntry,Workspace} from '../core/model.js';
import type {PdfCompanion,PdfCategory} from './model.js';
import {builtinCompanion,builtinRevisionMismatch} from './sample.js';
import {companionKey} from './validation.mjs';
export function resolveStudy(doc:DocumentEntry,ws:Workspace):{companion?:PdfCompanion;stale:boolean}{
 const candidate=ws.overlays.companions?.[companionKey(doc)]??builtinCompanion(doc);
 const valid=candidate&&candidate.documentId===doc.id&&candidate.documentSha256===doc.sha256&&(!doc.pageCount||candidate.pageCount===doc.pageCount);
 return {companion:valid?candidate:undefined,stale:!!candidate&&!valid||builtinRevisionMismatch(doc)||Object.values(ws.overlays.companions??{}).some(c=>c.documentId===doc.id&&c.documentSha256!==doc.sha256)};
}
/** JSON tuple is unambiguous even for IDs containing punctuation. Kept separate
 * from canonical notebook IDs so projected children never change library data. */
export const studyTreeKey=(doc:DocumentEntry,kind:string,id='')=>JSON.stringify([doc.id,doc.sha256??'',kind,id]);
export function directCategoryPages(c:PdfCategory,companion:PdfCompanion):number[]{
 const numbers=new Set(c.pageRefs??[]);
 for(const [first,last] of c.pageRanges??[])for(let n=first;n<=last&&n<=companion.pageCount;n++)numbers.add(n);
 for(const p of Object.values(companion.pages))if(p.categoryIds?.includes(c.id))numbers.add(p.page);
 return [...numbers].filter(n=>n>=1&&n<=companion.pageCount).sort((a,b)=>a-b);
}
