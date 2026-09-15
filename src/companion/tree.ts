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

/** Flatten the old category hierarchy into exactly category -> physical-page rows.
 * A repeated physical page under a different heading is an intentional link. */
export function categoryPageRows(category:PdfCategory,companion:PdfCompanion):{id:string;page:number;title:string}[]{
 const rows:{id:string;page:number;title:string}[]=[],seen=new Set<string>();
 const add=(page:number,title:string)=>{const key=JSON.stringify([page,title]);if(!seen.has(key)){seen.add(key);rows.push({id:key,page,title});}};
 for(const n of directCategoryPages(category,companion))add(n,companion.pages[String(n)]?.title??'Page '+n);
 const walk=(children:PdfCategory[])=>{for(const child of children){for(const n of directCategoryPages(child,companion))add(n,child.title);walk(child.children??[]);}};walk(category.children??[]);
 return rows.sort((a,b)=>a.page-b.page);
}
export function shortPageTitle(title:string,max=52):string{const clean=title.replace(/\s+/g,' ').trim();return clean.length>max?clean.slice(0,max-1).trimEnd()+'\u2026':clean;}
