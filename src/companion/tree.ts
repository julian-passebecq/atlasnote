import {historicalRevision} from '../durability/registry.js';
import type {DocumentEntry,Workspace} from '../core/model.js';
import type {PdfCompanion,PdfCategory} from './model.js';
import {builtinCompanion,builtinRevisionMismatch} from './sample.js';
import {companionKey} from './validation.mjs';
export function resolveStudy(doc:DocumentEntry,ws:Workspace):{companion?:PdfCompanion;stale:boolean}{
 if(ws.viewHistoryRevisionId){const candidate=historicalRevision(ws.history,ws.viewHistoryRevisionId),revision=candidate?.snapshot.document?.id===doc.id?candidate:undefined;return {companion:revision?.snapshot.companion??undefined,stale:false};}
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
export function categoryPageRows(category:PdfCategory,companion:PdfCompanion):StudyRow[]{
 const rows:StudyRow[]=[],seen=new Set<string>();
 const add=(page:number,title:string)=>{const key=JSON.stringify([page,title]);if(!seen.has(key)){seen.add(key);rows.push({id:key,page,title});}};
 for(const n of directCategoryPages(category,companion))add(n,companion.pages[String(n)]?.title??'Page '+n);
 const walk=(children:PdfCategory[])=>{for(const child of children){for(const n of directCategoryPages(child,companion))add(n,child.title);walk(child.children??[]);}};walk(category.children??[]);
 return rows.sort((a,b)=>a.page-b.page);
}
export function shortPageTitle(title:string,max=52):string{const clean=title.replace(/\s+/g,' ').trim();return clean.length>max?clean.slice(0,max-1).trimEnd()+'\u2026':clean;}

export type StudyRow={id:string;page:number;title:string;generic?:boolean};
/** Without categories, reviewed Companion page titles are still used; only an
 * untitled page falls back to a single generic "Page N" row (no "p.N" repeat). */
export function fallbackPageRows(count:number,companion?:PdfCompanion):StudyRow[]{
 return Array.from({length:Math.max(0,Math.min(count||0,10000))},(_,i)=>{const page=i+1,title=companion?.pages[String(page)]?.title?.trim();return title?{id:String(page),page,title}:{id:String(page),page,title:'Page '+page,generic:true};});
}
/** Batched rows plus a small window around the reader's page, so page 190 is
 * revealed without expanding every preceding batch. -1 marks an elided gap. */
export function visibleRowIndexes(rows:{page:number}[],limit:number,current?:number,radius=4):number[]{
 const shown=new Set<number>();for(let i=0;i<Math.min(limit,rows.length);i++)shown.add(i);
 if(current!==undefined){const hits=rows.map((r,i)=>r.page===current?i:-1).filter(i=>i>=limit);for(const hit of hits)for(let i=Math.max(0,hit-radius);i<=Math.min(rows.length-1,hit+radius);i++)shown.add(i);}
 const sorted=[...shown].sort((a,b)=>a-b),out:number[]=[];let gap=0;
 sorted.forEach((i,k)=>{if(k&&i!==sorted[k-1]+1)out.push(-(++gap));out.push(i);});
 return out;
}
