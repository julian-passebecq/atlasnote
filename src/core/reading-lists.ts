import type {Catalogue,Workspace,Personal,Bookmark,Anchor,CategoryId} from './model.js';
import type {ReadingTarget,ReadingItem} from './reading-types.js';
import {stable} from './validation.mjs';
import {locations,uid,findNode} from './workspace.js';
import {BUILTIN_CATEGORIES} from './workspace-slots.js';
import {validateReadingTarget,validateReadingLists,normaliseReadingUrl,READING_LIMITS} from '../storage/reading-validation.mjs';
export {normaliseReadingUrl,READING_LIMITS};
export function inferReadingCategory(c:Catalogue,ws:Workspace,target:ReadingTarget):CategoryId|null{
 if(target.kind==='url')return 'personal';
 const id=target.kind==='collection'?target.collectionId:target.pageId;
 const project=c.projects.find(p=>p.id===id)?.id??locations(c).get(id)?.project.id??findNode(c.projects,id)?.project.id;
 return project?(Object.hasOwn(ws.overlays.categories??{},project)?ws.overlays.categories![project]:BUILTIN_CATEGORIES[project]??'personal'):'personal';
}
export function targetForPage(c:Catalogue,id:string,anchor?:Anchor):ReadingTarget{
 if(c.projects.some(p=>p.id===id)||!c.pages.some(p=>p.id===id))return {kind:'collection',collectionId:id};
 const sheet=c.pages.find(p=>p.id===id)?.cheatsheet;if(sheet&&anchor?.sheetPage)return {kind:'cheatsheet-page',pageId:id,documentId:sheet.id,sheetPage:anchor.sheetPage,anchor:structuredClone(anchor)};
 const doc=c.documents.find(d=>d.pageId===id);
 if(doc&&anchor?.pdfPage)return {kind:'pdf-page',pageId:id,documentId:doc.id,pdfPage:anchor.pdfPage,...(doc.sha256?{revision:doc.sha256}:{}),anchor:structuredClone(anchor)};
 return {kind:'page',pageId:id,...(anchor?{anchor:structuredClone(anchor)}:{})};
}
export function bookmarkTarget(b:Bookmark):ReadingTarget{return b.target??{kind:'page',pageId:b.pageId,...(b.anchor?{anchor:b.anchor}:{})};}
const signature=(t:ReadingTarget)=>stable(t);
function details(title:string,note:string){if(!title.trim()||title.length>120||note.length>1000)throw Error('Use a title of 1-120 characters and a note of at most 1,000 characters.');}
export function addReadLater(p:Personal,target:ReadingTarget,title:string,category:CategoryId|null):ReadingItem{
 validateReadingTarget(target);details(title,'');
 // Equality is source identity; differently named headings on the same PDF page
 // remain intentional independent queue entries.
 const old=p.readLater?.find(e=>signature(e.target)===signature(target)&&e.title===title);
 if(old)return old;
 if((p.readLater?.length??0)>=READING_LIMITS.items)throw Error('Read later is full. Remove an item before adding another.');
 const item:ReadingItem={id:uid('later'),target:structuredClone(target),title:title.trim(),note:'',category,createdAt:Date.now(),read:false};
 const entries=[item,...(p.readLater??[])];validateReadingLists(entries);p.readLater=entries;return item;
}
export function addReadingBookmark(p:Personal,target:ReadingTarget,title:string,category:CategoryId|null):Bookmark{
 validateReadingTarget(target);details(title,'');if(target.kind==='url')throw Error('Use Read later for web addresses.');
 const existing=p.bookmarks.find(b=>JSON.stringify(bookmarkTarget(b))===JSON.stringify(target)&&b.title===title);if(existing)return existing;
 const b:Bookmark={id:uid('bookmark'),pageId:target.kind==='collection'?target.collectionId:target.pageId,title:title.trim(),category,note:'',createdAt:Date.now(),target:structuredClone(target),...('anchor'in target&&target.anchor?{anchor:structuredClone(target.anchor)}:target.kind==='pdf-page'?{anchor:{pdfPage:target.pdfPage,...(target.revision?{pdfRevision:target.revision}:{})}}:{})};
 p.bookmarks.push(b);return b;
}
export function editReadingItem(p:Personal,kind:'bookmark'|'later',id:string,title:string,note:string,category:CategoryId|null,read=false){
 details(title,note);if(category!==null&&!['informatics','cloud','norsk','job','personal'].includes(category))throw Error('Unknown reading category.');
 const item=kind==='bookmark'?p.bookmarks.find(e=>e.id===id):p.readLater?.find(e=>e.id===id);if(!item)throw Error('This entry no longer exists.');
 Object.assign(item,{title:title.trim(),note,category});if(kind==='later')(item as ReadingItem).read=read;
}
